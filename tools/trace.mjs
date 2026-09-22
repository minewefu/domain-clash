// DOMAIN CLASH — capture a Chrome performance trace of real-time playback and summarise where rAF gaps come from.
//   node tools/trace.mjs [--from 0] [--secs 8] [--query "acts=test&silent=1"] [--headful] [--out shots/review/trace.json]
// Prints: the rAF gaps (> 50 ms), and for each gap the top main-thread / GPU / GC events overlapping it.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (!k.startsWith('--')) continue; const n = process.argv[i + 1]; if (n === undefined || n.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = n; i++; } }
const SECS = +(args.secs || 8), FROM = +(args.from || 0);
const profile = mkdtempSync(join(tmpdir(), 'dc-trace-'));
const chrome = spawn(CHROME, [
  args.headful ? '--new-window' : '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1280,900', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error('chrome exited ' + c))); });
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map(), lis = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method) lis.forEach(l => l(m)); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
await S('Runtime.enable'); await S('Page.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise(r => lis.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') r(); }));
await S('Page.navigate', { url: pathToFileURL(resolve(ROOT, 'index.html')).href + (args.query ? '?' + args.query : '') });
await loaded;
const ev = async expr => { const r = await S('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const t0 = Date.now();
while (!(await ev('window.__ready === true'))) { if (Date.now() - t0 > 120000) throw new Error('page never became ready'); await new Promise(r => setTimeout(r, 200)); }
// trace
const events = [];
const done = new Promise(r => lis.push(m => { if (m.method === 'Tracing.dataCollected') events.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') r(); }));
await send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8', 'v8.gc', 'disabled-by-default-v8.gc', 'gpu', 'cc', 'viz', 'blink', 'toplevel', 'renderer.scheduler'] } });
await ev(`(() => { const g = document.getElementById('gate'); if (g) g.hidden = true; HT.telemetry.gaps = []; HT.player.play(${FROM}); return true; })()`);
await new Promise(r => setTimeout(r, SECS * 1000));
const gapsPage = await ev('HT.telemetry.gaps.slice()');
await ev('(HT.player.pause(), true)');
await send('Tracing.end');
await done;
if (args.out) writeFileSync(resolve(ROOT, args.out), JSON.stringify({ traceEvents: events }));
// analysis: renderer main thread = thread with the most FireAnimationFrame events
const fafs = events.filter(e => e.name === 'FireAnimationFrame' && e.ph === 'X');
const byTid = {}; for (const e of fafs) byTid[e.pid + ':' + e.tid] = (byTid[e.pid + ':' + e.tid] || 0) + 1;
const mainKey = Object.entries(byTid).sort((a, b) => b[1] - a[1])[0]?.[0];
const [mpid, mtid] = mainKey ? mainKey.split(':').map(Number) : [0, 0];
const raf = fafs.filter(e => e.pid === mpid && e.tid === mtid).sort((a, b) => a.ts - b.ts);
const gaps = [];
for (let i = 1; i < raf.length; i++) { const g = (raf[i].ts - (raf[i - 1].ts + (raf[i - 1].dur || 0))) / 1000; if (g > 50) gaps.push({ from: raf[i - 1].ts + (raf[i - 1].dur || 0), to: raf[i].ts, ms: Math.round(g) }); }
const names = e => e.name + (e.args && e.args.data && e.args.data.type ? '(' + e.args.data.type + ')' : '');
const tidName = {}; for (const e of events) if (e.ph === 'M' && e.name === 'thread_name') tidName[e.pid + ':' + e.tid] = e.args.name;
console.log(`[trace] ${events.length} events; main thread ${mainKey} (${tidName[mainKey]}); rAF callbacks ${raf.length}; gaps > 50 ms (trace) ${gaps.length}; page-reported gaps ${gapsPage.length}`);
for (const g of gaps.slice(0, 12)) {
  const over = events.filter(e => e.ph === 'X' && e.dur && e.ts < g.to && e.ts + e.dur > g.from && e.dur > 2000);
  const agg = {};
  for (const e of over) { const k = (tidName[e.pid + ':' + e.tid] || (e.pid + ':' + e.tid)) + ' · ' + names(e); const ov = Math.min(e.ts + e.dur, g.to) - Math.max(e.ts, g.from); agg[k] = (agg[k] || 0) + ov / 1000; }
  const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${v.toFixed(0)}ms ${k}`);
  console.log(`  gap ${g.ms} ms: ${top.join(' | ')}`);
}
ws.close(); chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch (e) { /* locked */ }
