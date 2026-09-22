// Headless Chrome driver over the DevTools protocol (no npm deps; Node >= 22 has global WebSocket).
//
//   node tools/cdp.mjs --page "index.html?scene=street&t=5&scale=2" --shot shots/street.png
//   node tools/cdp.mjs --page "index.html?sheet=street" --shot shots/sheet.png      (auto-sizes)
//   node tools/cdp.mjs --page "tools/audio-lab.html" --eval "await runChecks()" --timeout 180000
//
// Options:
//   --page <path?query>   file under the project root (or --url <full url>)
//   --shot <png>          write a screenshot (viewport = --w x --h, or window.__shotSize if set)
//   --w/--h <px>          viewport size (default 960x540)
//   --wait <expr>         poll this JS expression until truthy before eval/shot (default: window.__ready !== false)
//   --eval <expr>         evaluate (async allowed) and print the JSON result
//   --out <file>          write the eval result (string → raw, else JSON) to a file instead of stdout
//   --timeout <ms>        overall timeout (default 60000)
//   --quiet               don't echo page console output
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const key = k.slice(2);
  const nxt = process.argv[i + 1];
  if (nxt === undefined || nxt.startsWith('--')) args[key] = true; else { args[key] = nxt; i++; }
}
const W = +(args.w || 960), H = +(args.h || 540);
const TIMEOUT = +(args.timeout || 60000);
let url = args.url;
if (!url && args.page) {
  const [p, q] = String(args.page).split('?');
  url = pathToFileURL(resolve(ROOT, p)).href + (q ? '?' + q : '');
}
if (!url) { console.error('need --page or --url'); process.exit(2); }

const profile = mkdtempSync(join(tmpdir(), 'ht-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  `--window-size=${W},${H}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let finished = false;
function cleanup(code) {
  if (finished) return; finished = true;
  try { chrome.kill(); } catch {}
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 300);
}
const killer = setTimeout(() => { console.error('[cdp] TIMEOUT after', TIMEOUT, 'ms'); cleanup(3); }, TIMEOUT);

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  chrome.stderr.on('data', d => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) res(m[1]);
  });
  chrome.on('exit', c => rej(new Error('chrome exited ' + c + '\n' + buf)));
});

const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nextId = 1;
const pending = new Map();
const listeners = [];
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
  } else if (msg.method) listeners.forEach(l => l(msg));
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const S = (m, p) => send(m, p, sessionId);

let errors = 0;
listeners.push(msg => {
  if (msg.sessionId !== sessionId) return;
  if (msg.method === 'Runtime.consoleAPICalled' && !args.quiet) {
    const txt = msg.params.args.map(a => a.value !== undefined ? (typeof a.value === 'string' ? a.value : JSON.stringify(a.value)) : (a.description || a.type)).join(' ');
    console.log(`[page:${msg.params.type}] ${txt}`);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors++;
    const d = msg.params.exceptionDetails;
    console.log(`[page:EXCEPTION] ${d.exception?.description || d.text} @ ${d.url || ''}:${d.lineNumber}:${d.columnNumber}`);
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    console.log(`[page:log-error] ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  }
});

await S('Runtime.enable'); await S('Page.enable'); await S('Log.enable');
await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const loaded = new Promise(res => listeners.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res(); }));
await S('Page.navigate', { url });
await loaded;

async function evaluate(expr) {
  const r = await S('Runtime.evaluate', { expression: `(async () => { return (${expr}); })()`, awaitPromise: true, returnByValue: true, timeout: TIMEOUT });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

try {
  const waitExpr = args.wait || '(window.__ready !== false)';
  const t0 = Date.now();
  while (!(await evaluate(waitExpr))) {
    if (Date.now() - t0 > TIMEOUT - 2000) throw new Error('wait condition never became true: ' + waitExpr);
    await new Promise(r => setTimeout(r, 100));
  }
  if (args.eval) {
    const v = await evaluate(args.eval);
    if (args.out) writeFileSync(resolve(args.out), typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    else console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  }
  if (args.shot) {
    const size = await evaluate('window.__shotSize || null');
    if (size) await S('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 150));
    const shot = await S('Page.captureScreenshot', { format: 'png', fromSurface: true });
    writeFileSync(resolve(args.shot), Buffer.from(shot.data, 'base64'));
    console.log('[cdp] wrote', args.shot, size ? `${size.w}x${size.h}` : `${W}x${H}`);
  }
  if (errors) console.log(`[cdp] ${errors} page exception(s)`);
  clearTimeout(killer);
  cleanup(errors ? 1 : 0);
} catch (e) {
  console.error('[cdp] ERROR', e.message);
  clearTimeout(killer);
  cleanup(1);
}
