// DOMAIN CLASH — frame-exact offline video export → MP4 (H.264 + AAC) using only Chrome's WebCodecs and a
// hand-written muxer (tools/mp4mux.js). No npm packages, no ffmpeg. Node >= 22 (global WebSocket).
//
//   node tools/export.mjs --strict [--act I|II|III|IV|V|VI|test] [--scale 3|2] [--fps 30] [--out dist/…mp4]
//   --act <id>            export one act (from/to taken from HT.actSpans); default output dist/domain-clash_act-<id>.mp4
//   --scale <n>           nearest-neighbour scale of the 640x360 art: 3 = 1920x1080 (default), 2 = 1280x720 (share copy)
//
// Options:
//   --fps <n>             frame rate (default 30; 60 works too)
//   --out <file>          output path (default dist/domain-clash[_act-<id>][_720p].mp4)
//   --bitrate <Mbit/s>    H.264 VBR target (default fps·4/3: 40 at 30 fps, 70 at 60 fps; capped below 2^32/fps)
//   --hw <pref>           WebCodecs hardwareAcceleration: no-preference (default) | prefer-hardware | prefer-software
//   --codec <avc1.xxxxxx> force a codec string (default: High → Main → Baseline, level chosen from size/fps/bitrate)
//   --qp <n>              constant-quantizer mode instead of VBR (hardware encoders only; e.g. 18)
//   --keyint <s>          keyframe interval in seconds (default 2)
//   --input <i420|canvas> how frames reach the encoder (default i420: exact per-art-pixel BT.709 conversion done here;
//                         canvas: 4x drawImage into a 1920x1080 canvas → VideoFrame, Chrome converts RGB→YUV — the
//                         literal pipeline from the brief; measured 0.3–2.3 dB lower worst-case PSNR at equal size)
//   --audio-codec <c>     auto (AAC, fallback Opus) | aac | opus
//   --audio-bitrate <k>   kbit/s (default 192)
//   --audio-source <s>    auto (HT.audio.renderOffline, test tone if unavailable) | tone
//   --from <s> --to <s>   export only part of the timeline (for tests)
//   --strict              refuse to export if any scene is still a placeholder, a script threw while loading, or
//                         HT.audio.renderOffline is missing (use for the release export)
//   --no-verify           skip the end-to-end verification pass
//   --verify-only <file>  only verify an existing file (pass the same --fps/--from it was exported with)
//   --times a,b,c         verification seek times (default 20.5,75.25,140 + scene checkpoints)
//   --timeout <s>         overall watchdog (default 3600)
//   --page <path>         exporter page (default tools/export.html; for testing — disables the source snapshot)
//   --no-snapshot         render from the live src/ instead of a frozen copy (see snapshotSources)
//   --keep-snapshot       keep the frozen copy (path is printed)
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, openSync, writeSync, closeSync, readSync, fstatSync, renameSync, existsSync, mkdirSync, readFileSync, unlinkSync, cpSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

// ------------------------------------------------------------------ args
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i];
  if (!k.startsWith('--')) continue;
  const key = k.slice(2), nxt = process.argv[i + 1];
  if (nxt === undefined || nxt.startsWith('--')) args[key] = true; else { args[key] = nxt; i++; }
}
const FPS = Math.round(+(args.fps || 30));
const SCALE = Math.round(+(args.scale || 3));
const ACT = args.act || null;
const defOut = 'dist/domain-clash' + (ACT ? '_act-' + ACT : '') + (SCALE === 3 ? '' : '_' + (360 * SCALE) + 'p') + '.mp4';
const OUT = resolve(ROOT, args['verify-only'] && args['verify-only'] !== true ? args['verify-only'] : (args.out || defOut));
const TIMEOUT = +(args.timeout || 3600) * 1000;
let PAGE = resolve(ROOT, args.page || 'tools/export.html');
const SLICE = 8 << 20;
// Default VBR target: 4/3 Mbit per frame-second (30 fps → 40 Mbit/s, 60 fps → 70 Mbit/s after the cap below).
// Measured on the densest scene (voxel flyover): 30 fps @ 30 Mbit/s → 99.87 % of art pixels decode to the right
// palette colour, @ 40 → 100 %; VBR only spends it where needed (whole film averages far less).
// Cap: Chrome's Media Foundation H.264 path (NVIDIA MFT here) wraps bitrate × framerate in 32 bits — at
// bitrate[bit/s] × fps ≥ 2^32 the rate control collapses (measured: 30 fps 150 Mbit/s → 9 Mbit/s output,
// 24 fps 180 → 3.5, 60 fps 80 → 10; 140/175/70 fine), so targets are kept below 0.98 · 2^32 / fps.
const RC_LIMIT = Math.floor((0.98 * 2 ** 32) / FPS);
let BITRATE = args.bitrate ? Math.round(+args.bitrate * 1e6) : Math.min(Math.floor((FPS * 4) / 3 * (SCALE === 2 ? 0.55 : 1)) * 1e6, Math.floor(RC_LIMIT / 1e6) * 1e6);
if (BITRATE > RC_LIMIT) { console.log(`[export] WARNING: --bitrate ${BITRATE / 1e6} Mbit/s × ${FPS} fps would overflow the encoder's 32-bit rate control; clamped to ${Math.floor(RC_LIMIT / 1e6)} Mbit/s`); BITRATE = Math.floor(RC_LIMIT / 1e6) * 1e6; }
const exportOpts = {
  fps: FPS,
  bitrate: BITRATE,
  hw: args.hw || 'no-preference',
  codec: args.codec || null,
  gop: +(args.keyint || 2),
  audioCodec: args['audio-codec'] || 'auto',
  audioBitrate: Math.round(+(args['audio-bitrate'] || 192) * 1000),
  audioSource: args['audio-source'] || 'auto',
  from: args.from != null ? +args.from : 0,
  to: args.to != null ? +args.to : null,
  canvas: args.canvas || 'gpu',
  contentHint: args['content-hint'] || null,
  bitrateMode: args['bitrate-mode'] || 'variable',
  qp: args.qp != null ? +args.qp : null,
  input: args.input || 'i420',
  scale: SCALE,
};
if (!(FPS > 0 && FPS <= 240)) { console.error('bad --fps'); process.exit(2); }

const fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const MB = n => (n / 1e6).toFixed(1) + ' MB';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const say = (...a) => console.log('[export]', ...a);

// ------------------------------------------------------------------ minimal CDP client (adapted from tools/cdp.mjs)
const LIVE = new Set();
process.on('exit', () => { for (const { proc, profile } of LIVE) { try { proc.kill(); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} } });
async function launchChrome({ w = 1280, h = 720, tag = 'ht-export-' } = {}) {
  const profile = mkdtempSync(join(tmpdir(), tag));
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    `--window-size=${w},${h}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const live = { proc, profile };
  LIVE.add(live);
  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('chrome did not start')), 30000);
    proc.stderr.on('data', d => { buf += d.toString(); const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(to); res(m[1]); } });
    proc.on('exit', c => rej(new Error('chrome exited ' + c + '\n' + buf)));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let nextId = 1;
  const pending = new Map(), listeners = [];
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result); }
    else if (msg.method) listeners.forEach(l => l(msg));
  };
  ws.onclose = () => { for (const { rej } of pending.values()) rej(new Error('CDP socket closed')); pending.clear(); };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  let closed = false;
  const close = async () => {
    if (closed) return; closed = true;
    try { await Promise.race([send('Browser.close'), sleep(2000)]); } catch {}
    try { proc.kill(); } catch {}
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
    LIVE.delete(live);
  };
  async function openPage(url, { quiet = false, onConsole } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => send(m, p, sessionId);
    const page = { exceptions: [], consoleErrors: [], media: [] };
    listeners.push(msg => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.consoleAPICalled') {
        const txt = msg.params.args.map(a => (a.value !== undefined ? (typeof a.value === 'string' ? a.value : JSON.stringify(a.value)) : a.description || a.type)).join(' ');
        if (onConsole) onConsole(msg.params.type, txt);
        else if (!quiet && !txt.startsWith('[htx]')) console.log(`  [page:${msg.params.type}] ${txt}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        const t = `${d.exception?.description || d.text} @ ${d.url || ''}:${d.lineNumber}:${d.columnNumber}`;
        page.exceptions.push(t); console.log('  [page:EXCEPTION] ' + t);
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') page.consoleErrors.push(`${msg.params.entry.text} ${msg.params.entry.url || ''}`);
      if (msg.method === 'Media.playerPropertiesChanged') for (const p of msg.params.properties) page.media.push([p.name, p.value]);
      if (msg.method === 'Media.playerMessagesLogged') for (const m of msg.params.messages) page.media.push(['msg:' + m.level, m.message]);
      if (msg.method === 'Media.playerErrorsRaised') for (const e of msg.params.errors) page.media.push(['error', JSON.stringify(e)]);
    });
    await S('Runtime.enable'); await S('Page.enable'); await S('Log.enable');
    try { await S('Media.enable'); } catch {}
    await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise(res => listeners.push(m => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') res(); }));
    await S('Page.navigate', { url });
    await loaded;
    page.evaluate = async (expr, timeout = TIMEOUT) => {
      const r = await S('Runtime.evaluate', { expression: `(async () => { return (${expr}); })()`, awaitPromise: true, returnByValue: true, timeout });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    page.waitFor = async (expr, ms = 120000) => {
      const t0 = Date.now();
      while (!(await page.evaluate(expr))) { if (Date.now() - t0 > ms) throw new Error('timed out waiting for ' + expr); await sleep(100); }
    };
    return page;
  }
  return { openPage, close };
}

// ------------------------------------------------------------------ source snapshot
// Other contributors edit src/ while exports run. The export renders from a frozen copy of src/ + the exporter page,
// and the verifier renders its reference frames from the SAME copy, so a mid-run edit can neither tear the render nor
// invalidate the comparison. The content hash identifies exactly which sources a given MP4 was made from.
function snapshotSources() {
  const dir = mkdtempSync(join(tmpdir(), 'ht-src-'));
  cpSync(resolve(ROOT, 'src'), join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'tools'));
  for (const f of ['export.html', 'export.js', 'mp4mux.js']) cpSync(resolve(ROOT, 'tools', f), join(dir, 'tools', f));
  const h = createHash('sha256'), files = [];
  const walk = d => { for (const n of readdirSync(d).sort()) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else { const b = readFileSync(p); h.update(relative(dir, p).replace(/\\/g, '/') + '\0'); h.update(b); files.push([relative(dir, p).replace(/\\/g, '/'), b.length]); } } };
  walk(join(dir, 'src')); walk(join(dir, 'tools'));
  return { dir, page: join(dir, 'tools', 'export.html'), hash: h.digest('hex').slice(0, 16), files };
}

// ------------------------------------------------------------------ keep tools/export.html in sync with index.html
function checkScriptLists() {
  const grab = (file, strip) => {
    const html = readFileSync(resolve(ROOT, file), 'utf8');
    return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1].replace(strip, '')).filter(s => s.startsWith('src/'));
  };
  const idx = grab('index.html', /^\.?\//).filter(s => s !== 'src/ui.js');
  const exp = grab('tools/export.html', /^\.\.\//);
  const missing = idx.filter(s => !exp.includes(s)), extra = exp.filter(s => !idx.includes(s));
  const order = missing.length || extra.length ? false : idx.every((s, i) => exp[i] === s);
  const absent = idx.filter(s => !existsSync(resolve(ROOT, s)));
  if (missing.length || extra.length || !order) say(`WARNING: ${relative(ROOT, PAGE)} script list differs from index.html (missing: ${missing.join(', ') || '-'}; extra: ${extra.join(', ') || '-'}${order ? '' : '; order differs'})`);
  if (absent.length) say(`note: not written yet (placeholder cards / no audio): ${absent.join(', ')}`);
  return { missing, extra, absent };
}

// ------------------------------------------------------------------ MP4 structural check (independent reader)
function inspectMp4(file) {
  const fd = openSync(file, 'r');
  const size = fstatSync(fd).size;
  const rd = (pos, n) => { const b = Buffer.alloc(n); const got = readSync(fd, b, 0, n, pos); if (got !== n) throw new Error(`short read at ${pos}`); return b; };
  const top = [];
  for (let pos = 0; pos < size;) {
    const h = rd(pos, Math.min(16, size - pos));
    let sz = h.readUInt32BE(0); const type = h.toString('latin1', 4, 8); let hdr = 8;
    if (sz === 1) { sz = Number(h.readBigUInt64BE(8)); hdr = 16; } else if (sz === 0) sz = size - pos;
    if (sz < hdr || pos + sz > size) throw new Error(`bad top-level box ${type} size ${sz} at ${pos}`);
    top.push({ type, pos, size: sz, hdr });
    pos += sz;
  }
  const order = top.map(b => b.type);
  const moovBox = top.find(b => b.type === 'moov'), mdat = top.find(b => b.type === 'mdat');
  if (!moovBox || !mdat) throw new Error('missing moov or mdat: ' + order.join(','));
  const moov = rd(moovBox.pos, moovBox.size);
  const kids = (buf, start, end) => { const out = []; for (let p = start; p + 8 <= end;) { let s = buf.readUInt32BE(p); const t = buf.toString('latin1', p + 4, p + 8); let h = 8; if (s === 1) { s = Number(buf.readBigUInt64BE(p + 8)); h = 16; } if (s < h || p + s > end) throw new Error('bad box ' + t + ' at ' + p); out.push({ t, p, s, b: p + h, e: p + s }); p += s; } return out; };
  const find = (buf, box, path) => { let cur = [box]; for (const t of path) { const k = cur.length ? kids(buf, cur[0].b, cur[0].e).filter(x => x.t === t) : []; if (!k.length) return null; cur = k; } return cur[0]; };
  const root = { b: 8, e: moov.length };
  const mvhd = find(moov, root, ['mvhd']);
  const movieTs = moov.readUInt32BE(mvhd.b + 12), movieDur = moov.readUInt32BE(mvhd.b + 16);
  const tracks = [];
  const mdatStart = mdat.pos + mdat.hdr, mdatEnd = mdat.pos + mdat.size;
  const meta = {};
  const udta = find(moov, root, ['udta']);
  if (udta) {
    const m = kids(moov, udta.b, udta.e).find(k => k.t === 'meta');
    const ilst = m && kids(moov, m.b + 4, m.e).find(k => k.t === 'ilst');
    if (ilst) for (const it of kids(moov, ilst.b, ilst.e)) { const d = kids(moov, it.b, it.e).find(k => k.t === 'data'); if (d) meta[it.t.replace('\u00a9', '')] = moov.toString('utf8', d.b + 8, d.e); }
  }
  for (const trak of kids(moov, root.b, root.e).filter(x => x.t === 'trak')) {
    const tkhd = find(moov, trak, ['tkhd']), mdhd = find(moov, trak, ['mdia', 'mdhd']), hdlr = find(moov, trak, ['mdia', 'hdlr']);
    const stbl = find(moov, trak, ['mdia', 'minf', 'stbl']);
    const get = t => find(moov, stbl, [t]);
    const tr = { id: moov.readUInt32BE(tkhd.b + 12), handler: moov.toString('latin1', hdlr.b + 8, hdlr.b + 12), timescale: moov.readUInt32BE(mdhd.b + 12), mediaDuration: moov.readUInt32BE(mdhd.b + 16), tkhdDuration: moov.readUInt32BE(tkhd.b + 20) };
    const elst = find(moov, trak, ['edts', 'elst']);
    if (elst) { const n = moov.readUInt32BE(elst.b + 4); tr.edits = []; for (let i = 0; i < n; i++) tr.edits.push({ segmentDuration: moov.readUInt32BE(elst.b + 8 + i * 12), mediaTime: moov.readInt32BE(elst.b + 12 + i * 12) }); }
    const stsd = get('stsd'), entry = kids(moov, stsd.b + 8, stsd.e)[0];
    tr.sampleEntry = entry.t;
    const entryKids = kids(moov, entry.b + (tr.handler === 'vide' ? 78 : 28), entry.e);
    tr.entryBoxes = entryKids.map(k => k.t);
    if (entry.t === 'avc1') {
      tr.width = moov.readUInt16BE(entry.b + 24); tr.height = moov.readUInt16BE(entry.b + 26);
      const avcC = entryKids.find(k => k.t === 'avcC');
      tr.avcC = parseAvcC(moov.subarray(avcC.b, avcC.e));
      const colr = entryKids.find(k => k.t === 'colr');
      if (colr) tr.colr = { type: moov.toString('latin1', colr.b, colr.b + 4), primaries: moov.readUInt16BE(colr.b + 4), transfer: moov.readUInt16BE(colr.b + 6), matrix: moov.readUInt16BE(colr.b + 8), fullRange: !!(moov[colr.b + 10] & 0x80) };
    }
    if (entry.t === 'mp4a') { tr.channels = moov.readUInt16BE(entry.b + 16); tr.sampleRate = moov.readUInt32BE(entry.b + 24) / 65536; const esds = entryKids.find(k => k.t === 'esds'); tr.esds = moov.subarray(esds.b + 4, esds.e).toString('hex'); }
    if (entry.t === 'Opus') { const d = entryKids.find(k => k.t === 'dOps'); tr.dOps = { channels: moov[d.b + 1], preSkip: moov.readUInt16BE(d.b + 2), inputRate: moov.readUInt32BE(d.b + 4) }; }
    // sample tables
    const stts = get('stts'), stsz = get('stsz'), stsc = get('stsc'), stco = get('stco') || get('co64'), stss = get('stss'), ctts = get('ctts');
    let n = moov.readUInt32BE(stts.b + 4), total = 0, sttsSamples = 0; const deltas = new Set();
    for (let i = 0; i < n; i++) { const c = moov.readUInt32BE(stts.b + 8 + i * 8), d = moov.readUInt32BE(stts.b + 12 + i * 8); total += c * d; sttsSamples += c; deltas.add(d); }
    tr.sttsDuration = total; tr.sampleDeltas = [...deltas];
    const constSize = moov.readUInt32BE(stsz.b + 4), count = moov.readUInt32BE(stsz.b + 8);
    const sizes = new Array(count); for (let i = 0; i < count; i++) sizes[i] = constSize || moov.readUInt32BE(stsz.b + 12 + i * 4);
    tr.samples = count; if (sttsSamples !== count) throw new Error(`track ${tr.id}: stts covers ${sttsSamples} samples, stsz has ${count}`);
    const is64 = stco.t === 'co64', nch = moov.readUInt32BE(stco.b + 4), offs = new Array(nch);
    for (let i = 0; i < nch; i++) offs[i] = is64 ? Number(moov.readBigUInt64BE(stco.b + 8 + i * 8)) : moov.readUInt32BE(stco.b + 8 + i * 4);
    const nsc = moov.readUInt32BE(stsc.b + 4), sc = []; for (let i = 0; i < nsc; i++) sc.push([moov.readUInt32BE(stsc.b + 8 + i * 12), moov.readUInt32BE(stsc.b + 12 + i * 12)]);
    const samplePos = new Array(count); let si = 0;
    for (let c = 0; c < nch; c++) {
      let per = 0; for (const [first, k] of sc) if (first - 1 <= c) per = k;
      let p = offs[c];
      for (let j = 0; j < per && si < count; j++, si++) { samplePos[si] = p; p += sizes[si]; }
    }
    if (si !== count) throw new Error(`track ${tr.id}: chunks cover ${si} of ${count} samples`);
    tr.chunks = nch; tr.bytes = sizes.reduce((a, b) => a + b, 0);
    tr.keyframes = stss ? moov.readUInt32BE(stss.b + 4) : count;
    if (stss) { tr.keyframeSamples = []; for (let i = 0; i < Math.min(tr.keyframes, 400); i++) tr.keyframeSamples.push(moov.readUInt32BE(stss.b + 8 + i * 4)); }
    tr.ctts = !!ctts;
    for (let i = 0; i < count; i++) if (samplePos[i] < mdatStart || samplePos[i] + sizes[i] > mdatEnd) throw new Error(`track ${tr.id} sample ${i} outside mdat`);
    tr._pos = samplePos; tr._sizes = sizes;
    tracks.push(tr);
  }
  // coverage: samples of all tracks tile the mdat payload exactly (no gaps, no overlaps)
  const spans = [];
  for (const t of tracks) for (let i = 0; i < t.samples; i++) spans.push([t._pos[i], t._sizes[i]]);
  spans.sort((a, b) => a[0] - b[0]);
  let cursor = mdatStart, gaps = 0, overlaps = 0;
  for (const [p, s] of spans) { if (p > cursor) gaps++; if (p < cursor) overlaps++; cursor = Math.max(cursor, p + s); }
  if (cursor !== mdatEnd) gaps++;
  // walk every video sample's AVCC NAL units (length prefixes must tile each sample exactly; keyframes must hold an IDR)
  const v = tracks.find(t => t.handler === 'vide');
  const nal = { samples: 0, badLengths: 0, keyWithoutIdr: 0, idr: 0, types: {}, qp: { I: [], P: [], B: [] }, slicesPerFrame: new Set() };
  if (v) {
    const L = (v.avcC && v.avcC.lengthSize) || 4;
    const keySet = v.keyframeSamples && v.keyframes <= 400 ? new Set(v.keyframeSamples) : null;
    let buf = Buffer.alloc(1 << 20);
    for (let i = 0; i < v.samples; i++) {
      const sz = v._sizes[i]; if (buf.length < sz) buf = Buffer.alloc(sz * 2);
      readSync(fd, buf, 0, sz, v._pos[i]);
      let p = 0, hasIdr = false, slices = 0;
      const canQp = v.avcC && v.avcC.sps && !v.avcC.sps.error && v.avcC.pps && !v.avcC.pps.error;
      while (p + L <= sz) {
        let len = 0; for (let k = 0; k < L; k++) len = len * 256 + buf[p + k];
        const t = buf[p + L] & 31; nal.types[t] = (nal.types[t] || 0) + 1; if (t === 5) hasIdr = true;
        if ((t === 1 || t === 5) && canQp && p + L + len <= sz) {
          slices++;
          if (slices === 1) try { const q = sliceQp(buf.subarray(p + L, p + L + Math.min(len, 64)), v.avcC.sps, v.avcC.pps); if (q.qp != null) nal.qp['PBI'[q.type] || 'P'].push(q.qp); } catch {}
        }
        p += L + len;
      }
      nal.slicesPerFrame.add(slices);
      if (p !== sz) nal.badLengths++;
      if (hasIdr) nal.idr++;
      if (keySet && keySet.has(i + 1) && !hasIdr) nal.keyWithoutIdr++;
      nal.samples++;
    }
  }
  closeSync(fd);
  for (const t of tracks) { delete t._pos; delete t._sizes; }
  const st = a => a.length ? { n: a.length, min: Math.min(...a), mean: Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10, max: Math.max(...a) } : null;
  nal.sliceQp = { I: st(nal.qp.I), P: st(nal.qp.P), B: st(nal.qp.B) }; delete nal.qp;
  nal.slicesPerFrame = [...nal.slicesPerFrame];
  return { size, meta, topLevel: order, faststart: order.indexOf('moov') < order.indexOf('mdat'), movieTimescale: movieTs, movieDuration: movieDur / movieTs, mdatPayload: mdatEnd - mdatStart, gaps, overlaps, tracks, nal };
}

// RBSP bit reader (emulation-prevention bytes removed)
function bitReader(nalu, start = 1, maxBytes = 1 << 30) {
  const bytes = [];
  for (let i = start; i < nalu.length && bytes.length < maxBytes; i++) { if (i >= 2 && nalu[i] === 3 && nalu[i - 1] === 0 && nalu[i - 2] === 0) continue; bytes.push(nalu[i]); }
  let bit = 0;
  const u = n => { let v = 0; for (let i = 0; i < n; i++) { v = v * 2 + ((bytes[bit >> 3] >> (7 - (bit & 7))) & 1); bit++; } return v; };
  const ue = () => { let z = 0; while (u(1) === 0 && z < 32) z++; return (2 ** z - 1) + u(z); };
  const se = () => { const k = ue(); return k & 1 ? (k + 1) / 2 : -k / 2; };
  return { u, ue, se };
}
function parsePps(nalu) {
  const { u, ue, se } = bitReader(nalu);
  const p = { id: ue(), sps: ue(), cabac: u(1), bottomFieldPicOrder: u(1) };
  if (ue() !== 0) throw new Error('slice groups unsupported');
  p.numRefL0 = ue() + 1; p.numRefL1 = ue() + 1; p.weightedPred = u(1); p.weightedBipred = u(2);
  p.initQp = 26 + se(); se(); p.chromaQpOffset = se(); p.deblockCtl = u(1); p.constrainedIntra = u(1); p.redundantPicCnt = u(1);
  return p;
}
// slice QP of one slice NAL (H.264 §7.3.3): walks the slice header up to slice_qp_delta
function sliceQp(nalu, sps, pps) {
  const { u, ue, se } = bitReader(nalu, 1, 64);
  const nalType = nalu[0] & 31, refIdc = (nalu[0] >> 5) & 3, idr = nalType === 5;
  ue(); const st = ue() % 5; ue();
  u(sps.log2_max_frame_num);
  if (!sps.frame_mbs_only && u(1)) u(1);
  if (idr) ue();
  if (sps.pic_order_cnt_type === 0) { u(sps.log2_max_poc_lsb); if (pps.bottomFieldPicOrder) se(); }
  if (sps.pic_order_cnt_type === 1 && !sps.delta_pic_order_always_zero) { se(); if (pps.bottomFieldPicOrder) se(); }
  if (pps.redundantPicCnt) ue();
  if (st === 1) u(1);
  if (st === 0 || st === 1 || st === 3) { if (u(1)) { ue(); if (st === 1) ue(); } }
  const rplm = () => { if (u(1)) for (let k = 0; k < 64; k++) { const idc = ue(); if (idc === 3) break; ue(); } };
  if (st !== 2 && st !== 4) { rplm(); if (st === 1) rplm(); }
  if ((pps.weightedPred && (st === 0 || st === 3)) || (pps.weightedBipred === 1 && st === 1)) return { type: st, qp: null, note: 'weighted prediction not parsed' };
  if (refIdc) { if (idr) { u(1); u(1); } else if (u(1)) for (let k = 0; k < 64; k++) { const op = ue(); if (op === 0) break; if (op === 1 || op === 3) ue(); if (op === 2) ue(); if (op === 3 || op === 6) ue(); if (op === 4) ue(); } }
  if (pps.cabac && st !== 2 && st !== 4) ue();
  return { type: st, qp: pps.initQp + se() };
}

function parseAvcC(b) {
  const out = { profile: b[1], compat: b[2], level: b[3], lengthSize: (b[4] & 3) + 1 };
  const nsps = b[5] & 31; let p = 6;
  const sps = [];
  for (let i = 0; i < nsps; i++) { const n = b.readUInt16BE(p); sps.push(b.subarray(p + 2, p + 2 + n)); p += 2 + n; }
  const npps = b[p]; p++;
  const pps = [];
  for (let i = 0; i < npps; i++) { const n = b.readUInt16BE(p); pps.push(b.subarray(p + 2, p + 2 + n)); p += 2 + n; }
  if (sps[0]) try { out.sps = parseSps(sps[0]); } catch (e) { out.sps = { error: e.message }; }
  if (pps[0]) try { out.pps = parsePps(pps[0]); } catch (e) { out.pps = { error: e.message }; }
  return out;
}
function parseSps(nalu) {
  const bytes = []; for (let i = 1; i < nalu.length; i++) { if (i >= 3 && nalu[i] === 3 && nalu[i - 1] === 0 && nalu[i - 2] === 0) continue; bytes.push(nalu[i]); }
  let bit = 0;
  const u = n => { let v = 0; for (let i = 0; i < n; i++) { v = v * 2 + ((bytes[bit >> 3] >> (7 - (bit & 7))) & 1); bit++; } return v; };
  const ue = () => { let z = 0; while (u(1) === 0 && z < 32) z++; return (2 ** z - 1) + u(z); };
  const se = () => { const k = ue(); return k & 1 ? (k + 1) / 2 : -k / 2; };
  const s = { profile_idc: u(8), constraints: u(8), level_idc: u(8) };
  ue();
  s.chroma_format_idc = 1;
  if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(s.profile_idc)) {
    s.chroma_format_idc = ue(); if (s.chroma_format_idc === 3) u(1);
    s.bit_depth_luma = ue() + 8; s.bit_depth_chroma = ue() + 8; u(1);
    if (u(1)) for (let i = 0; i < (s.chroma_format_idc !== 3 ? 8 : 12); i++) if (u(1)) { let last = 8, next = 8; for (let j = 0; j < (i < 6 ? 16 : 64); j++) { if (next !== 0) next = (last + se() + 256) % 256; last = next === 0 ? last : next; } }
  }
  s.log2_max_frame_num = ue() + 4;
  const poc = ue(); s.pic_order_cnt_type = poc;
  if (poc === 0) s.log2_max_poc_lsb = ue() + 4; else if (poc === 1) { s.delta_pic_order_always_zero = u(1); se(); se(); const n = ue(); for (let i = 0; i < n; i++) se(); }
  s.max_num_ref_frames = ue(); u(1);
  const wmb = ue() + 1, hmu = ue() + 1, fmo = u(1); if (!fmo) u(1);
  s.frame_mbs_only = fmo;
  u(1);
  let crop = [0, 0, 0, 0]; if (u(1)) crop = [ue(), ue(), ue(), ue()];
  s.width = wmb * 16 - 2 * (crop[0] + crop[1]); s.height = hmu * 16 * (2 - fmo) - 2 * (2 - fmo) * (crop[2] + crop[3]);
  s.vui = !!u(1);
  if (s.vui) {
    if (u(1)) { const idc = u(8); if (idc === 255) { u(16); u(16); } s.aspect_ratio_idc = idc; }
    if (u(1)) u(1);
    if (u(1)) { u(3); s.full_range = u(1); if (u(1)) { s.colour_primaries = u(8); s.transfer = u(8); s.matrix = u(8); } }
    if (u(1)) { ue(); ue(); }
    if (u(1)) { s.num_units_in_tick = u(32); s.time_scale = u(32); s.fixed_frame_rate = u(1); }
    const hrd = () => { const n = ue() + 1; u(4); u(4); for (let i = 0; i < n; i++) { ue(); ue(); u(1); } u(5); u(5); u(5); u(5); };
    const nh = u(1); if (nh) hrd(); const vh = u(1); if (vh) hrd(); if (nh || vh) u(1);
    u(1);
    if (u(1)) { u(1); ue(); ue(); ue(); ue(); s.max_num_reorder_frames = ue(); s.max_dec_frame_buffering = ue(); }
  }
  return s;
}

// ------------------------------------------------------------------ export
async function runExport() {
  if (!args.page) checkScriptLists();   // compares the real tools/export.html with index.html
  const outDir = dirname(OUT);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const partFile = OUT + '.mdat.part', tmpFile = OUT + '.tmp';
  const chrome = await launchChrome({ tag: 'ht-export-' });
  let fd = null;
  try {
    const page = await chrome.openPage(pathToFileURL(PAGE).href);
    await page.waitFor('window.__ready === true && !!window.HTX && !!window.MP4Muxer', 180000);
    const info = await page.evaluate('({ duration: HT.duration, scenes: HT.timeline.map(e => e.id + (e.def.placeholder ? "*" : "")), audio: !!(HT.audio && HT.audio.renderOffline), ua: navigator.userAgent, acts: HT.actSpans })');
    if (ACT) {
      const span = info.acts.find(a => a.id === ACT);
      if (!span) throw new Error('--act ' + ACT + ': no such act (have ' + info.acts.map(a => a.id).join(', ') + ')');
      exportOpts.from = span.start; exportOpts.to = span.start + span.dur;
      say(`act ${ACT} "${span.title}": ${span.start}–${span.start + span.dur} s`);
    }
    say(`page ready: HT.duration=${info.duration}s, scenes ${info.scenes.join(' ')} (* = placeholder), HT.audio.renderOffline ${info.audio ? 'present' : 'MISSING'}`);
    say(`${info.ua.match(/HeadlessChrome\/\S+/)?.[0] || info.ua}; options ${JSON.stringify(exportOpts)}`);
    const placeholders = info.scenes.filter(s => s.endsWith('*'));
    if (args.strict && (placeholders.length || page.exceptions.length || !info.audio))
      throw new Error(`--strict: not exporting — ${placeholders.length ? 'placeholder scenes: ' + placeholders.join(' ') + '; ' : ''}` +
        `${page.exceptions.length ? page.exceptions.length + ' script error(s) while loading; ' : ''}${info.audio ? '' : 'HT.audio.renderOffline missing'}`);
    fd = openSync(partFile, 'w');
    await page.evaluate(`HTX.start(${JSON.stringify(Object.assign({ sourceHash: SNAP ? SNAP.hash : null }, exportOpts))})`);
    const t0 = Date.now();
    let written = 0, lastPrint = 0, lastPhase = '', st = null;
    const tty = process.stdout.isTTY;
    for (;;) {
      st = await page.evaluate(`HTX.poll(${SLICE})`);
      if (st.n) {
        const b = Buffer.from(st.b64, 'base64');
        if (b.length !== st.n) throw new Error(`base64 slice decoded to ${b.length} bytes, expected ${st.n}`);
        writeSync(fd, b); written += b.length;
      }
      for (const l of st.logs) { if (tty) process.stdout.write('\r\x1b[K'); console.log('  ' + l); }
      if (st.phase === 'error') throw new Error('page export failed: ' + st.error);
      if (st.phase !== lastPhase) {
        if (tty) process.stdout.write('\r\x1b[K');
        say(`phase: ${st.phase}${st.phase === 'audio' ? ' (offline audio render + AAC encode)' : st.phase === 'video' ? ` (${st.frames} frames)` : ''} at ${((Date.now() - t0) / 1000).toFixed(1)} s`);
        lastPhase = st.phase;
      }
      const nowMs = Date.now();
      if (st.phase === 'video' && st.frames && nowMs - lastPrint > (tty ? 250 : 5000)) {
        lastPrint = nowMs;
        const fps = st.frame / Math.max(0.001, st.elapsed), eta = st.frame ? fmtT((st.frames - st.frame) / fps) : '…';
        const line = `frame ${st.frame}/${st.frames} (${((100 * st.frame) / st.frames).toFixed(1)}%) · ${fps.toFixed(1)} fps · ${(fps / FPS).toFixed(2)}x realtime · ETA ${eta} · ${MB(written)} written`;
        if (tty) process.stdout.write('\r\x1b[K[export] ' + line); else say(line);
      }
      if (st.phase === 'done' && st.outQueued === 0 && !st.n) break;
      if (!st.n) await sleep(st.phase === 'video' ? 60 : 150);
    }
    if (tty) process.stdout.write('\r\x1b[K');
    closeSync(fd); fd = null;
    const h = await page.evaluate('HTX.header()');
    const header = Buffer.from(h.b64, 'base64');
    if (h.payloadBytes !== written) throw new Error(`payload mismatch: page produced ${h.payloadBytes} bytes, node wrote ${written}`);
    // assemble [ftyp][moov][mdat hdr] + payload → tmp → rename
    const t1 = Date.now();
    const out = openSync(tmpFile, 'w');
    writeSync(out, header);
    const src = openSync(partFile, 'r'), blk = Buffer.alloc(16 << 20);
    for (let pos = 0; ;) { const n = readSync(src, blk, 0, blk.length, pos); if (!n) break; writeSync(out, blk, 0, n); pos += n; }
    closeSync(src); closeSync(out);
    unlinkSync(partFile);
    if (existsSync(OUT)) unlinkSync(OUT);
    renameSync(tmpFile, OUT);
    const res = h.result;
    res.wallSec = (Date.now() - t0) / 1000;
    res.assembleSec = (Date.now() - t1) / 1000;
    res.fileBytes = header.length + written;
    res.pageExceptions = page.exceptions;
    res.audioRef = await page.evaluate('HTX.audioRef()');
    res.mediaPanel = page.media.filter(([k]) => /encoder|Encoder|name|hardware|Hardware|codec/i.test(k)).slice(0, 40);
    say(`wrote ${relative(ROOT, OUT)} (${MB(res.fileBytes)}) in ${res.wallSec.toFixed(1)} s total (assembly ${res.assembleSec.toFixed(1)} s)`);
    return res;
  } catch (e) {
    for (const f of [partFile, tmpFile]) try { if (existsSync(f)) unlinkSync(f); } catch {}
    throw e;
  } finally {
    if (fd !== null) try { closeSync(fd); } catch {}
    await chrome.close();
  }
}

// ------------------------------------------------------------------ verification in a fresh browser
async function runVerify(exportResult) {
  const chrome = await launchChrome({ w: 1280, h: 720, tag: 'ht-verify-' });
  try {
    const page = await chrome.openPage(pathToFileURL(PAGE).href);
    await page.waitFor('window.__ready === true && !!window.HTX', 180000);
    const D = await page.evaluate('HT.duration');
    const acts = await page.evaluate('HT.actSpans');
    const span = ACT ? acts.find(a => a.id === ACT) : null;
    const from = exportResult ? exportResult.from : span ? span.start : args.from != null ? +args.from : 0;
    const to = exportResult ? exportResult.to : span ? span.start + span.dur : args.to != null ? +args.to : D;
    const len = to - from;
    let times = args.times ? String(args.times).split(',').map(Number) : [20.5, 75.25, 140.0];
    if (!args.times) {
      times = times.filter(t => t < len);
      if (times.length < 3) times = [0.3, 0.5, 0.77].map(f => Math.round(len * f * FPS) / FPS + 0.25 / FPS);
      // checkpoints inside every scene transition and at every scene's middle (the hardest frames for the encoder)
      const tl = await page.evaluate('HT.timeline.map(e => ({ start: e.start, dur: e.dur, tr: e.transitionIn ? e.transitionIn.dur : 0 }))');
      for (const e of tl) for (const t of [e.start + Math.min(0.4, e.tr / 2), e.start + e.dur / 2]) if (t - from > 0.1 && t - from < len - 0.1) times.push(Math.round((t - from) * 1000) / 1000);
    }
    const f0 = Math.round(from * FPS);
    const opts = { url: pathToFileURL(OUT).href, fps: FPS, scale: SCALE, times, f0, expectDuration: Math.round(len * FPS) / FPS,
      audioRef: exportResult ? exportResult.audioRef : null, audioSource: exportOpts.audioSource };
    const t0 = Date.now();
    const v = await page.evaluate(`HTX.verify(${JSON.stringify(opts)})`);
    v.wallSec = (Date.now() - t0) / 1000;
    v.mediaPanel = page.media.filter(([k]) => !/^msg:debug/.test(k)).slice(0, 60);
    v.pageExceptions = page.exceptions;
    return v;
  } finally { await chrome.close(); }
}

// ------------------------------------------------------------------ main
const watchdog = setTimeout(() => { console.error('[export] TIMEOUT'); process.exit(3); }, TIMEOUT);
let exitCode = 0;
let SNAP = null;
try {
  if (!args.page && !args['no-snapshot']) {
    SNAP = snapshotSources();
    PAGE = SNAP.page;
    say(`source snapshot ${SNAP.hash} (${SNAP.files.length} files) → ${SNAP.dir}`);
  }
  let ex = null;
  if (!args['verify-only']) ex = await runExport();
  const mp4 = inspectMp4(OUT);
  const vt = mp4.tracks.find(t => t.handler === 'vide'), at = mp4.tracks.find(t => t.handler === 'soun');
  const sps = vt && vt.avcC && vt.avcC.sps;
  say(`structure: ${mp4.topLevel.join(' ')} (${mp4.faststart ? 'faststart' : 'moov at end'}), ${MB(mp4.size)}, movie ${mp4.movieDuration.toFixed(3)} s; mdat tiling gaps=${mp4.gaps} overlaps=${mp4.overlaps}; metadata ${JSON.stringify(mp4.meta)}`);
  const fileHash = ((mp4.meta.cmt || '').match(/source snapshot ([0-9a-f]{16})/) || [])[1] || null;
  const sourcesMatch = !SNAP || !fileHash ? null : fileHash === SNAP.hash;
  if (args['verify-only']) {
    if (sourcesMatch === false) say(`NOTE: the file was made from source snapshot ${fileHash}, the current sources hash to ${SNAP.hash} — src/ changed since the export, so frame mismatches in edited scenes are expected (re-export to refresh the file)`);
    else if (sourcesMatch === true) say(`sources unchanged since the export (snapshot ${fileHash})`);
    else say('NOTE: cannot tell which sources the file was made from (no snapshot hash in its metadata); references are rendered from the current src/');
  }
  if (vt) say(`  video: ${vt.sampleEntry} ${vt.width}x${vt.height} [${vt.entryBoxes.join(',')}] ${vt.samples} samples, ${vt.keyframes} sync, ${vt.chunks} chunks, ts ${vt.timescale}, deltas ${vt.sampleDeltas.join('/')}, elst ${JSON.stringify(vt.edits)}, ctts ${vt.ctts}` +
    `; avcC profile ${vt.avcC.profile} level ${vt.avcC.level}; SPS ${JSON.stringify(sps)}` + (vt.colr ? `; colr ${JSON.stringify(vt.colr)}` : ''));
  if (at) say(`  audio: ${at.sampleEntry} ${at.channels || ''}ch ${at.sampleRate || ''}Hz [${at.entryBoxes.join(',')}] ${at.samples} samples, ${at.chunks} chunks, ts ${at.timescale}, elst ${JSON.stringify(at.edits)}` + (at.esds ? `, esds ${at.esds}` : '') + (at.dOps ? `, dOps ${JSON.stringify(at.dOps)}` : ''));
  say(`  NAL walk: ${mp4.nal.samples} video samples, bad length tiling ${mp4.nal.badLengths}, IDR samples ${mp4.nal.idr}, sync samples without IDR ${mp4.nal.keyWithoutIdr}, NAL types ${JSON.stringify(mp4.nal.types)}, slices/frame ${mp4.nal.slicesPerFrame.join('/')}, slice QP ${JSON.stringify(mp4.nal.sliceQp)}`);
  const structOk = mp4.faststart && !mp4.gaps && !mp4.overlaps && !mp4.nal.badLengths && !mp4.nal.keyWithoutIdr && vt && at;
  let verify = null;
  if (!args['no-verify']) {
    say('verifying in a fresh headless Chrome …');
    verify = await runVerify(ex);
  }
  // ---------------------------------------------------------------- summary
  const summary = { file: relative(ROOT, OUT), bytes: mp4.size, structureOk: !!structOk, sourceSnapshot: SNAP ? SNAP.hash : null };
  if (ex) {
    summary.export = { fps: ex.fps, frames: ex.frames, duration: ex.frames / ex.fps, placeholders: ex.placeholders, wallSec: round(ex.wallSec), timing: ex.timing,
      video: { input: ex.inputPath && ex.inputPath.kind, codecRequested: ex.video.codecRequested, profile: ex.video.profile, reportedCodec: ex.video.decoderConfig && ex.video.decoderConfig.codec,
        encoderColorSpace: ex.video.decoderConfig && ex.video.decoderConfig.colorSpace, colr: vt && vt.colr, spsLevel: sps && sps.level_idc / 10, levelNote: ex.video.levelFix && ex.video.levelFix.note, sliceQp: mp4.nal.sliceQp, qp: ex.video.qp,
        bitrateTarget: ex.opts.bitrate, bitrateActual: ex.mux.tracks[0].bitrate, keyframes: ex.video.keyframes, extraKeyframes: ex.video.extraKeyframes, reorderedChunks: ex.video.reorderedChunks, hw: ex.opts.hw },
      audio: { source: ex.audio.source, codec: ex.audio.codec, reportedCodec: ex.audio.reportedCodec, kbps: ex.audio.kbps, priming: ex.audio.priming, frames: ex.audio.frames, sourceStats: ex.audio.sourceStats },
      selfChecks: ex.selfChecks.problems.length ? ex.selfChecks.problems : 'ok', mediaPanel: ex.mediaPanel };
  }
  if (verify) {
    // checkpoints whose reference frame is not reproducible (scene code not a pure function of t) cannot judge the
    // encode; they are reported separately
    const all = verify.checks.filter(k => !k.skipped), nondet = all.filter(k => k.refNondeterministicPx > 0), c = all.filter(k => !(k.refNondeterministicPx > 0));
    const pl = c.filter(k => k.planes && !k.planes.error).map(k => k.planes);
    const mean = a => round(a.reduce((x, y) => x + y, 0) / a.length);
    const agg = c.length ? { checkpoints: c.length, worstPsnrDb: Math.min(...c.map(k => k.psnrDb)), meanPsnrDb: mean(c.map(k => k.psnrDb)), minPaletteMatchPct: Math.min(...c.map(k => k.paletteMatchPct)),
      minExactPct: Math.min(...c.map(k => k.exactPct)), meanExactPct: mean(c.map(k => k.exactPct)), minWithin2Pct: Math.min(...c.map(k => k.within2Pct)), maxMae: Math.max(...c.map(k => Math.max(...k.maeRGB))),
      meanMaeRGB: [0, 1, 2].map(i => round(c.reduce((a, k) => a + k.maeRGB[i], 0) / c.length, 3)), meanFullResPsnrDb: mean(c.map(k => k.full.psnrDb)),
      planes: pl.length ? { worstPsnrDb: Math.min(...pl.map(p => p.psnrDb)), meanPsnrDb: mean(pl.map(p => p.psnrDb)), minPaletteMatchPct: Math.min(...pl.map(p => p.paletteMatchPct)), meanExactPct: mean(pl.map(p => p.exactPct)), format: pl[0].format } : null,
      allFramesMatch: c.every(k => k.frameMatchesRequest && k.bestIsThisFrame), maxSeekMs: Math.max(...all.map(k => k.seekMs)) } : {};
    if (nondet.length) agg.nondeterministicReferenceAt = nondet.map(k => `${k.requested}s (${k.refNondeterministicPx} px)`);
    const decoders = [...new Set((verify.mediaPanel || []).filter(([k]) => /DecoderName$/.test(k)).map(([k, v]) => `${k.replace(/^k|Name$/g, '')}: ${v}`))];
    summary.verify = { duration: verify.duration, expectDuration: verify.expectDuration, size: `${verify.videoWidth}x${verify.videoHeight}`, decoders, ...agg,
      audio: verify.audio && !verify.audio.error ? { decodedDuration: verify.audio.decoded.duration, lengthDiffSamples: verify.audio.lengthDiffSamples, lagSamples: verify.audio.lagSamples, rms: verify.audio.rms,
        excerpts: verify.audio.excerpts.map(e => `${e.atSec}s lag ${e.lagSamples} snr ${e.snrDb}dB ncorr ${e.ncorr}`) } : verify.audio, playbackAudio: verify.playbackAudio };
    const durOk = Math.abs(verify.duration - verify.expectDuration) <= 1.5 / FPS + 0.03;
    const sizeOk = verify.videoWidth === 640 * SCALE && verify.videoHeight === 360 * SCALE;
    // frames: right frame at every seek; the FILE (B: raw decoded planes + exact BT.709 inverse) must decode >= 99 %
    // of art pixels nearest to their true palette colour at >= 38.5 dB PSNR (the densest dithered frames — snow over
    // a full city, mid-dissolve — measure ~99.4 % / 39.8 dB at the default 36 Mbit/s; typical frames 99.9–100 % / 42–49 dB). The browser view (A: <video> → canvas) is
    // gated only against gross errors (wrong matrix/range/frame): DOMAIN CLASH dithers every gradient with 1-art-px
    // ordered dither, and any browser's bilinear 4:2:0 chroma upsampling blends those neighbours' colours (measured
    // ~36–38 dB / 97–99.6 % at 1080p on the fight test), which is a property of 4:2:0 playback, not of the encode.
    // Without plane data the old strict rule applies to A.
    // (the A guard is PSNR only: 4:2:0 chroma upsampling of 1-px saturated dither — Act II's crimson Shrine, Act III's
    // ring of Blue orbs — drops the browser view's palette match to 65–82 % while the file itself decodes at 99.4–99.8 %;
    // a wrong matrix/range measures < 20 dB and a wrong frame fails the frame-identity check, so ≥ 27 dB suffices)
    const framesOk = c.length > 0 && agg.allFramesMatch && (agg.planes
      ? agg.planes.minPaletteMatchPct >= 99.0 && agg.planes.worstPsnrDb >= 38.5 && agg.worstPsnrDb >= 27
      : agg.minPaletteMatchPct >= 99.5 && agg.worstPsnrDb >= 40);
    const audioOk = verify.audio && !verify.audio.error && Math.abs(verify.audio.rms.diffDb) < 1.0 && verify.audio.rms.envelopeCorrelation > 0.98;
    // A/V offset of the decoded audio vs the reference, in samples. 10 ms tolerance: far inside the ITU-R BT.1359
    // detectability window (~+45 ms audio early / -125 ms late); AAC here measures 0. (Opus fallback: Chrome applies
    // both dOps/OpusHead pre-skip and the edit list, so it plays 312 samples = 6.5 ms early — spec-compliant file.)
    const audioSyncOk = verify.audio && !verify.audio.error && Math.abs(verify.audio.lagSamples) <= 480;
    summary.verdict = { durationOk: durOk, sizeOk, framesOk, audioOk, audioSyncOk, structureOk: !!structOk };
    if (sourcesMatch === false) summary.verdict.sourcesChangedSinceExport = `file ${fileHash} ≠ current ${SNAP.hash}`;
    if (nondet.length) summary.verdict.warning = `scene code is not deterministic at ${nondet.length} checkpoint(s) — those were excluded from framesOk (see nondeterministicReferenceAt)`;
    if (!(durOk && sizeOk && framesOk && audioOk && audioSyncOk && structOk)) exitCode = 1;
  } else if (!structOk) exitCode = 1;
  console.log('\n===== SUMMARY =====');
  console.log(JSON.stringify(summary, null, 2));
  if (verify) {
    console.log('\nper-checkpoint — A: <video> → canvas.drawImage (what the browser shows) · B: raw decoded planes + BT.709 inverse (the file itself)');
    console.log('  t → frame | A: MAE r/g/b · exact% · ±2% · palette% · PSNR dB (full-res) | B: MAE r/g/b · exact% · palette% · PSNR dB | neighbour MAE prev/this/next | seek ms | ref nondeterministic px');
    for (const k of verify.checks) {
      if (k.skipped) { console.log(`  t=${k.requested}: skipped (${k.skipped})`); continue; }
      const pl = k.planes && !k.planes.error ? `${k.planes.maeRGB.join('/')} · ${k.planes.exactPct} · ${k.planes.paletteMatchPct} · ${k.planes.psnrDb}` : k.planes ? k.planes.error : '-';
      console.log(`  t=${String(k.requested).padEnd(7)} → ${String(k.frame).padStart(5)}${k.frameMatchesRequest ? ' ' : '!'} | ${k.maeRGB.join('/')} · ${k.exactPct} · ${k.within2Pct} · ${k.paletteMatchPct} · ${k.psnrDb} (${k.full.psnrDb}) | ${pl} | ${k.neighbourMae.prev ?? '-'}/${k.neighbourMae.this}/${k.neighbourMae.next ?? '-'} | ${k.seekMs} | ${k.refNondeterministicPx}`);
    }
  }
  if (exitCode) console.log('\n[export] VERIFICATION FAILED — see verdict above');
  else if (!ex && verify) {
    const v = summary.verify;
    console.log(`\n[export] VERIFIED OK ${summary.file}: ${v.size}, ${v.duration} s · ${v.checkpoints} seeks, PSNR ≥ ${v.worstPsnrDb} dB, palette match ≥ ${v.minPaletteMatchPct} % · audio lag ${v.audio.lagSamples} samples, RMS Δ ${v.audio.rms.diffDb} dB`);
  } else if (ex && verify) {
    const v = summary.verify, e = summary.export;
    console.log(`\n[export] OK ${summary.file}: ${fmtT(e.duration)} ${ex.width}x${ex.height}@${ex.fps} · H.264 ${e.video.profile} L${e.video.spsLevel} ${(e.video.bitrateActual.avg / 1e6).toFixed(1)} Mbit/s avg · ` +
      `${e.audio.codec} ${e.audio.kbps} kbit/s (${e.audio.source}) · ${MB(summary.bytes)} · encoded in ${e.wallSec} s · verified: ${v.checkpoints} seeks, PSNR ≥ ${v.worstPsnrDb} dB, ` +
      `palette match ≥ ${v.minPaletteMatchPct} %, audio lag ${v.audio.lagSamples} samples, RMS Δ ${v.audio.rms.diffDb} dB` + (e.placeholders.length ? ` · NOTE ${e.placeholders.length} placeholder scene(s)` : ''));
  }
} catch (e) {
  console.error('[export] ERROR', e && e.stack ? e.stack : e);
  exitCode = 1;
}
clearTimeout(watchdog);
if (SNAP && !args['keep-snapshot']) try { rmSync(SNAP.dir, { recursive: true, force: true }); } catch {}
process.exit(exitCode);

function round(v, d = 2) { return Math.round(v * 10 ** d) / 10 ** d; }
