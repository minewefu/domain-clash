// DOMAIN CLASH — real-time browser playthrough (what a viewer's browser actually does):
//   node tools/playthrough.mjs [--from 0] [--to <end>] [--act I] [--headful] [--sample 5] [--query "acts=I&silent=1"]
// Opens index.html in Chrome, presses Play (real Web Audio clock, muted output), and lets the film run in real time
// while sampling every `--sample` seconds: film time, render ms stats, rAF gaps > 50 ms (with the film time they
// happened at), JS heap (performance.memory + CDP Runtime.getHeapUsage), scene streaming events (sync inits, idle-init
// slices, disposes). At the end it reports whether frame gaps cluster at lazy-init boundaries and whether the heap is
// flat (linear fit slope over the run, after a warm-up minute).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (!k.startsWith('--')) continue; const n = process.argv[i + 1]; if (n === undefined || n.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = n; i++; } }
const SAMPLE = +(args.sample || 5);
const profile = mkdtempSync(join(tmpdir(), 'dc-play-'));
const chrome = spawn(CHROME, [
  args.headful ? '--new-window' : '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--mute-audio', '--enable-precise-memory-info',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1280,900',
  ...(typeof args.flags === 'string' ? args.flags.split(',').map(f => '--' + f) : []), 'about:blank', // --flags disable-gpu,foo=bar (diagnostics)
], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error('chrome exited ' + c))); });
const ws = new WebSocket(wsUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 1; const pend = new Map(), lis = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method) lis.forEach(l => l(m)); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = id++; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
const errors = [];
lis.push(m => { if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
await S('Runtime.enable'); await S('Page.enable');
await S('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise(r => lis.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') r(); }));
await S('Page.navigate', { url: pathToFileURL(resolve(ROOT, 'index.html')).href + (args.query ? '?' + args.query : '') }); // --query "acts=I&silent=1"
await loaded;
const ev = async expr => { const r = await S('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
const t0 = Date.now();
while (!(await ev('window.__ready === true'))) { if (Date.now() - t0 > 120000) throw new Error('page never became ready'); await new Promise(r => setTimeout(r, 200)); }
const info = await ev('({ D: HT.duration, acts: HT.actSpans })');
const span = args.act ? info.acts.find(a => a.id === args.act) : null;
const from = span ? span.start : +(args.from || 0), to = span ? span.start + span.dur : Math.min(info.D, +(args.to || info.D));
console.log(`[play] film ${info.D} s; playing ${from}–${to} s in real time (${((to - from) / 60).toFixed(1)} min), sampling every ${SAMPLE} s`);
await ev(`(() => { document.getElementById('bigplay') && (document.getElementById('gate').hidden = true); HT.telemetry.frames = 0; HT.telemetry.renderMs = 0; HT.telemetry.maxRenderMs = 0; HT.telemetry.gaps = []; HT.telemetry.longFrames = 0; HT.stream.log.length = 0; HT.player.play(${from}); return true; })()`);
const samples = [];
const wallStart = Date.now();
for (;;) {
  await new Promise(r => setTimeout(r, SAMPLE * 1000));
  const s = await ev(`(() => { const T = HT.telemetry, m = performance.memory || {}; const o = { wall: 0, film: +HT.player.time.toFixed(2), playing: HT.player.playing, frames: T.frames, avgMs: T.frames ? +(T.renderMs / T.frames).toFixed(2) : 0, maxMs: +T.maxRenderMs.toFixed(1), longFrames: T.longFrames, heapMB: m.usedJSHeapSize ? +(m.usedJSHeapSize / 1048576).toFixed(1) : null, audio: HT.audio && HT.audio._dbg && HT.audio._dbg.ctxInfo ? HT.audio._dbg.ctxInfo() : null }; T.frames = 0; T.renderMs = 0; T.maxRenderMs = 0; return o; })()`);
  const hu = await S('Runtime.getHeapUsage').catch(() => null);
  s.wall = +((Date.now() - wallStart) / 1000).toFixed(1); s.cdpHeapMB = hu ? +(hu.usedSize / 1048576).toFixed(1) : null;
  samples.push(s);
  console.log(`[play] wall ${s.wall}s film ${s.film}s · ${s.frames} frames avg ${s.avgMs} ms max ${s.maxMs} ms · long frames ${s.longFrames} · heap ${s.heapMB} MB (cdp ${s.cdpHeapMB})`);
  if (!s.playing || s.film >= to - 0.2) break;
  if (s.wall > (to - from) * 1.6 + 120) { console.log('[play] watchdog: playback is running far slower than real time'); break; }
}
const tail = await ev(`({ gaps: HT.telemetry.gaps, stream: HT.stream.log, stats: HT.stream.stats, caches: (HT.caches || []).map(c => [c.name, c.size()]) })`);
await ev('HT.player.pause()');
// analysis: gaps near scene boundaries (lazy-init) vs elsewhere; heap slope after the first 60 s
const bounds = (await ev('HT.timeline.map(e => e.start)'));
const nearBoundary = g => bounds.some(b => Math.abs(g[0] - b) < 0.6);
const gapsB = tail.gaps.filter(nearBoundary), gapsO = tail.gaps.filter(g => !nearBoundary(g));
const hs = samples.filter(s => s.wall > 60 && s.heapMB != null);
let slope = null;
if (hs.length > 3) { const n = hs.length, mx = hs.reduce((a, s) => a + s.wall, 0) / n, my = hs.reduce((a, s) => a + s.heapMB, 0) / n; slope = hs.reduce((a, s) => a + (s.wall - mx) * (s.heapMB - my), 0) / hs.reduce((a, s) => a + (s.wall - mx) ** 2, 0); }
const report = { from, to, samples, gaps: tail.gaps, gapsNearSceneBoundaries: gapsB, gapsElsewhere: gapsO, stream: tail.stream, streamStats: tail.stats, caches: tail.caches, heapSlopeMBperMin: slope == null ? null : +(slope * 60).toFixed(3), errors };
mkdirSync(resolve(ROOT, 'shots/review'), { recursive: true });
writeFileSync(resolve(ROOT, 'shots/review/playthrough.json'), JSON.stringify(report, null, 2));
console.log(`[play] rAF gaps > 50 ms: ${tail.gaps.length} (${gapsB.length} within 0.6 s of a scene boundary, ${gapsO.length} elsewhere); worst ${tail.gaps.reduce((a, g) => Math.max(a, g[1]), 0)} ms`);
console.log(`[play] streaming: ${JSON.stringify(tail.stats)}; heap slope after 1 min: ${report.heapSlopeMBperMin} MB/min; caches ${JSON.stringify(tail.caches)}; page errors ${errors.length}`);
try { chrome.kill(); } catch {}
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(errors.length ? 1 : 0); }, 400);
