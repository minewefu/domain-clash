// JS CPU profile of a page expression (V8 sampling profiler over CDP): self time per function, heaviest first.
//
//   node tools/jsprof.mjs --page "index.html?acts=II&lab=noop" --run "(() => { ... })()" [--pre "<setup expr>"]
//                         [--top 30] [--interval 100] [--timeout 300000]
//
// --pre runs first (unprofiled: warm-up, JIT, caches); --run is profiled. Output: total sampled ms, then
// "self ms  self %  total ms  function  file:line" rows. Line numbers are 1-based.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const args = {};
for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (!k.startsWith('--')) continue; const n = process.argv[i + 1]; if (n === undefined || n.startsWith('--')) args[k.slice(2)] = true; else { args[k.slice(2)] = n; i++; } }
const TIMEOUT = +(args.timeout || 300000), TOP = +(args.top || 30);
const [pp, qq] = String(args.page || 'index.html').split('?');
const url = pathToFileURL(resolve(ROOT, pp)).href + (qq ? '?' + qq : '');

const profile = mkdtempSync(join(tmpdir(), 'ht-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--mute-audio', '--allow-file-access-from-files', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=960,540', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let done = false;
const cleanup = code => { if (done) return; done = true; try { chrome.kill(); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 300); };
setTimeout(() => { console.error('[jsprof] TIMEOUT'); cleanup(3); }, TIMEOUT);
const wsUrl = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error('chrome exited ' + c))); });
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nid = 1; const pend = new Map(), lis = [];
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } else if (m.method) lis.forEach(l => l(m)); };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nid++; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);
lis.push(m => { if (m.sessionId === sessionId && m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; console.log('[page:EXCEPTION]', d.exception?.description || d.text); } });
await S('Runtime.enable'); await S('Page.enable');
const loaded = new Promise(res => lis.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res(); }));
await S('Page.navigate', { url }); await loaded;
const ev = async expr => { const r = await S('Runtime.evaluate', { expression: `(async () => { return (${expr}); })()`, awaitPromise: true, returnByValue: true, timeout: TIMEOUT }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
try {
  const t0 = Date.now(); while (!(await ev('(window.__ready !== false)'))) { if (Date.now() - t0 > TIMEOUT - 2000) throw new Error('page never ready'); await new Promise(r => setTimeout(r, 100)); }
  if (args.pre) await ev(args.pre);
  await S('Profiler.enable'); await S('Profiler.setSamplingInterval', { interval: +(args.interval || 100) });
  await S('Profiler.start');
  const w0 = Date.now(); const out = await ev(args.run || '0'); const wall = Date.now() - w0;
  const { profile: P } = await S('Profiler.stop');
  const byId = new Map(P.nodes.map(n => [n.id, n])), self = new Map();
  const dt = P.timeDeltas, total = (P.endTime - P.startTime) / 1000;
  const counts = new Map(); for (const s of P.samples) counts.set(s, (counts.get(s) || 0) + 1);
  const nS = P.samples.length, msPer = total / Math.max(1, nS);
  const keyOf = n => { const cf = n.callFrame; return `${cf.functionName || '(anon)'}  ${cf.url ? basename(cf.url.split('?')[0]) : ''}:${cf.lineNumber + 1}`; };
  for (const [id, c] of counts) { const k = keyOf(byId.get(id)); self.set(k, (self.get(k) || 0) + c); }
  // inclusive: walk parents
  const parent = new Map(); for (const n of P.nodes) for (const ch of n.children || []) parent.set(ch, n.id);
  const incl = new Map();
  for (const [id, c] of counts) { const seen = new Set(); let x = id; while (x !== undefined) { const k = keyOf(byId.get(x)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + c); } x = parent.get(x); } }
  console.log(`[jsprof] wall ${wall} ms, sampled ${total.toFixed(0)} ms, ${nS} samples; run result: ${JSON.stringify(out)}`);
  const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP);
  for (const [k, c] of rows) console.log(`${(c * msPer).toFixed(1).padStart(8)} ms ${(100 * c / nS).toFixed(1).padStart(5)} %  incl ${((incl.get(k) || 0) * msPer).toFixed(1).padStart(8)} ms  ${k}`);
  // --lines fnA,fnB: line-level self ticks (V8 positionTicks) inside those functions
  if (typeof args.lines === 'string') for (const fn of args.lines.split(',')) {
    const lt = new Map();
    for (const n of P.nodes) if (n.callFrame.functionName === fn && n.positionTicks) for (const p of n.positionTicks) lt.set(p.line, (lt.get(p.line) || 0) + p.ticks);
    const L = [...lt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
    console.log(`[jsprof] ${fn}: hottest lines`);
    for (const [line, c] of L) console.log(`${(c * msPer).toFixed(1).padStart(8)} ms  line ${line}`);
  }
  // --callers fnA,fnB: self ticks of those functions grouped by their calling function (file:line)
  if (typeof args.callers === 'string') for (const fn of args.callers.split(',')) {
    const byCaller = new Map();
    for (const [id, c] of counts) { const n = byId.get(id); if (n.callFrame.functionName !== fn) continue; const pa = byId.get(parent.get(id)); const k = pa ? keyOf(pa) : '(root)'; byCaller.set(k, (byCaller.get(k) || 0) + c); }
    console.log(`[jsprof] ${fn}: self time by caller`);
    for (const [k, c] of [...byCaller.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${(c * msPer).toFixed(1).padStart(8)} ms  ${k}`);
  }
  void dt;
  cleanup(0);
} catch (e) { console.error('[jsprof]', e.message); cleanup(1); }
