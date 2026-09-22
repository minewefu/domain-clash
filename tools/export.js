/* DOMAIN CLASH — offline video exporter, page side (tools/export.html). Driven by tools/export.mjs over CDP.
 *  (inherited from HELLO, TOMORROW; 640x360 art → ×3 = 1920x1080 or ×2 = 1280x720; chunked audio for long ranges)
 *
 *  video: HT.renderFrame(i / fps) → exact nearest-neighbour upscale (×S) → I420 VideoFrame
 *         → VideoEncoder (H.264, avcC) with a forced keyframe every `gop` seconds and encodeQueueSize back-pressure
 *  audio: HT.audio.renderOffline({ sampleRate }) (or a clearly-logged TEST TONE if that is missing/failing)
 *         → AudioEncoder (AAC-LC 'mp4a.40.2', fallback Opus); encoder delay measured by an impulse round trip
 *  mux:   MP4Muxer (tools/mp4mux.js); audio and video interleaved in ~1 s chunks; the mdat payload is queued here and
 *         pulled by node in base64 slices (HTX.poll) while encoding runs; the faststart header comes last (HTX.header).
 *  verify: HTX.verify() reopens the written file in a <video> element, seeks, compares decoded frames against
 *         HT.renderFrame, and decodes the audio track (decodeAudioData) against the reference PCM.
 */
(function () {
  'use strict';
  const HT = window.HT;
  const X = (window.HTX = { phase: 'boot', error: null, logs: [] });
  const logEl = () => document.getElementById('log');
  const log = (...a) => {
    const s = a.map(v => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
    X.logs.push(s);
    console.log('[htx] ' + s);
    const el = logEl(); if (el) el.textContent += '\n' + s;
  };
  X.log = log;
  const now = () => performance.now();
  // zero-delay macrotask yield (setTimeout(0) gets clamped to 4 ms when nested) so CDP polls get serviced
  const yieldTask = (() => {
    const ch = new MessageChannel(), q = [];
    ch.port1.onmessage = () => { const r = q.shift(); r && r(); };
    return () => new Promise(r => { q.push(r); ch.port2.postMessage(0); });
  })();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const once = (el, ev, ms = 30000) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout waiting for ' + ev)), ms);
    el.addEventListener(ev, e => { clearTimeout(t); res(e); }, { once: true });
  });
  const waitDequeue = (codec, ms = 5000) => new Promise(res => {
    const t = setTimeout(res, ms);
    codec.addEventListener('dequeue', () => { clearTimeout(t); res(); }, { once: true });
  });
  const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
  const toB64 = u8 => {
    if (u8.toBase64) return u8.toBase64();
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = s => {
    if (Uint8Array.fromBase64) return Uint8Array.fromBase64(s);
    const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u;
  };
  const f32ToB64 = f => toB64(new Uint8Array(f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength)));
  const b64ToF32 = s => { const u = fromB64(s); return new Float32Array(u.buffer, u.byteOffset, u.byteLength / 4); };

  async function waitReady(ms = 120000) {
    const t0 = now();
    while (!(window.__ready === true && HT && HT.timeline && HT.renderFrame)) {
      if (now() - t0 > ms) throw new Error('HT never booted (window.__ready stayed false)');
      await sleep(50);
    }
  }

  // ================================================================== output queue pulled by node
  const outQ = [];
  let outHead = 0, outQueued = 0, outTotal = 0, outPulled = 0;
  const push = u8 => { outQ.push(u8); outQueued += u8.length; outTotal += u8.length; };
  X.poll = (maxBytes = 8 << 20) => {
    const parts = [];
    let n = 0;
    while (outHead < outQ.length && n < maxBytes) {
      const b = outQ[outHead], take = Math.min(b.length, maxBytes - n);
      if (take === b.length) { parts.push(b); outQ[outHead++] = null; } else { parts.push(b.subarray(0, take)); outQ[outHead] = b.subarray(take); }
      n += take;
    }
    if (outHead > 4096) { outQ.splice(0, outHead); outHead = 0; }
    outQueued -= n; outPulled += n;
    let b64 = '';
    if (n) { const buf = new Uint8Array(n); let k = 0; for (const p of parts) { buf.set(p, k); k += p.length; } b64 = toB64(buf); }
    return Object.assign({ b64, n }, X.status(), { logs: X.logs.splice(0) });
  };
  X.status = () => {
    const p = X.progress || {};
    return { phase: X.phase, error: X.error, frame: p.frame || 0, frames: p.frames || 0, encoded: p.encoded || 0,
      elapsed: p.t0 ? (now() - p.t0) / 1000 : 0, outTotal, outPulled, outQueued };
  };
  X.header = () => {
    if (X.phase !== 'done' || !X.headerBytes) throw new Error('export not finished (phase ' + X.phase + ')');
    if (outQueued) throw new Error('payload not fully pulled yet (' + outQueued + ' bytes queued)');
    return { b64: toB64(X.headerBytes), n: X.headerBytes.length, payloadBytes: outTotal, result: X.result };
  };
  X.audioRef = () => X.aref || null;

  // ================================================================== audio source
  function testTone(sr, dur) {
    // Deterministic, verification-friendly: a different pitch and loudness every second (so RMS envelopes can be
    // matched and misalignment is obvious) plus 5 ms ticks every 0.25 s whose pitch differs per quarter (sharp,
    // non-periodic onsets so the lag search in the verifier has a unique answer).
    const n = Math.round(dur * sr), L = new Float32Array(n), R = new Float32Array(n);
    const frac = v => v - Math.floor(v), TICK = [3000, 1900, 2500, 1500];
    for (let k = 0; k * sr < n; k++) {
      const amp = 0.06 + 0.24 * frac(Math.sin(k * 12.9898 + 1.7) * 43758.5453);
      const f = 220 * Math.pow(2, (k % 12) / 12);
      const i0 = k * sr, i1 = Math.min(n, (k + 1) * sr);
      for (let i = i0; i < i1; i++) {
        const t = (i - i0) / sr, tt = i / sr;
        const env = Math.min(1, t / 0.01, (1 - t) / 0.01);
        let l = amp * env * Math.sin(2 * Math.PI * f * tt), r = amp * env * Math.sin(2 * Math.PI * f * 1.5 * tt);
        const qi = Math.floor(t * 4), tq = t - qi * 0.25;
        if (tq < 0.005) { const c = 0.45 * Math.sin(2 * Math.PI * TICK[qi & 3] * tq) * Math.sin(Math.PI * tq / 0.005); l += c; r += c * (qi & 1 ? 0.5 : 1); }
        L[i] = l; R[i] = r;
      }
    }
    return { L, R };
  }

  async function getAudio(sr, from, durSec, prefer) {
    const n = Math.round(durSec * sr), off = Math.round(from * sr);
    let buf = null, source = 'test-tone', note = '';
    const t0 = now();
    if (prefer !== 'tone' && HT.audio && typeof HT.audio.renderChunked === 'function') {
      try {
        const res = await HT.audio.renderChunked({ sampleRate: sr, from, to: from + durSec, chunk: 60, onProgress: p => { X.audioProgress = p; } });
        const L0 = res.L, R0 = res.R;
        // no copy when the render covers the span (the full 20-min film is 2 × 230 MB of float PCM — a copy doubled it)
        let L, R;
        if (L0.length >= n && R0.length >= n) { L = L0.length === n ? L0 : L0.subarray(0, n); R = R0.length === n ? R0 : R0.subarray(0, n); }
        else { L = new Float32Array(n); R = new Float32Array(n); L.set(L0.subarray(0, Math.min(n, L0.length))); R.set(R0.subarray(0, Math.min(n, R0.length))); }
        source = 'HT.audio.renderChunked';
        note = `${L0.length} samples @ ${res.sampleRate || sr} Hz rendered in ${((now() - t0) / 1000).toFixed(1)} s (chunked, ${from}–${(from + durSec).toFixed(2)} s)`;
        return finishAudio(L, R, sr, n, source, note, from);
      } catch (e) { log('AUDIO: HT.audio.renderChunked FAILED (' + ((e && e.message) || e) + ') → falling back to renderOffline'); }
    }
    if (prefer !== 'tone' && HT.audio && typeof HT.audio.renderOffline === 'function') {
      try {
        buf = await HT.audio.renderOffline({ sampleRate: sr });
        if (!buf || typeof buf.getChannelData !== 'function' || !(buf.length > 0)) throw new Error('renderOffline returned ' + Object.prototype.toString.call(buf));
        source = 'HT.audio.renderOffline';
        note = `${buf.numberOfChannels} ch × ${buf.length} samples @ ${buf.sampleRate} Hz = ${(buf.length / buf.sampleRate).toFixed(3)} s, rendered in ${((now() - t0) / 1000).toFixed(1)} s`;
        if (buf.sampleRate !== sr) {
          const oc = new OfflineAudioContext(Math.min(2, buf.numberOfChannels), Math.ceil(buf.duration * sr), sr);
          const s = oc.createBufferSource(); s.buffer = buf; s.connect(oc.destination); s.start();
          buf = await oc.startRendering();
          note += ` → resampled to ${sr} Hz`;
        }
      } catch (e) {
        log('AUDIO: HT.audio.renderOffline FAILED (' + ((e && e.message) || e) + ') → using the TEST TONE instead');
        buf = null;
      }
    } else if (prefer !== 'tone') log('AUDIO: HT.audio.renderOffline is not available (src/audio.js missing or incomplete) → using the TEST TONE');
    let L, R;
    if (buf) {
      const l = buf.getChannelData(0), r = buf.numberOfChannels > 1 ? buf.getChannelData(1) : l;
      if (buf.numberOfChannels > 2) note += ` (only channels 0/1 of ${buf.numberOfChannels} used)`;
      L = new Float32Array(n); R = new Float32Array(n);
      L.set(l.subarray(Math.min(off, l.length), Math.min(off + n, l.length)));
      R.set(r.subarray(Math.min(off, r.length), Math.min(off + n, r.length)));
      const expect = Math.round(HT.duration * sr);
      if (buf.length !== expect) note += ` (timeline is ${expect} samples: ${buf.length > expect ? 'tail trimmed' : 'end padded with silence'})`;
    } else {
      const tone = testTone(sr, HT.duration);
      L = tone.L.slice(off, off + n); R = tone.R.slice(off, off + n);
      if (L.length < n) { const l2 = new Float32Array(n), r2 = new Float32Array(n); l2.set(L); r2.set(R); L = l2; R = r2; }
      note = 'synthetic per-second tones + ticks (NOT the soundtrack)';
    }
    return finishAudio(L, R, sr, n, source, note, from);
  }
  function finishAudio(L, R, sr, n, source, note, from) {
    // sanitize + stats
    let bad = 0, clip = 0, peak = 0, ss = 0;
    for (const ch of [L, R]) for (let i = 0; i < n; i++) {
      let v = ch[i];
      if (!Number.isFinite(v)) { ch[i] = v = 0; bad++; }
      const a = Math.abs(v); if (a > peak) peak = a; if (a > 1) clip++; ss += v * v;
    }
    const rms = Math.sqrt(ss / Math.max(1, 2 * n));
    const stats = { peak: round(peak, 4), peakDb: round(20 * Math.log10(peak || 1e-9), 2), rmsDb: round(20 * Math.log10(rms || 1e-9), 2), nonFinite: bad, clippedSamples: clip };
    log(`AUDIO source: ${source} — ${note}; using ${n} samples (${(n / sr).toFixed(3)} s) from ${from}s; peak ${stats.peakDb} dBFS, RMS ${stats.rmsDb} dBFS` +
      (bad ? `, ${bad} non-finite samples zeroed` : '') + (clip ? `, WARNING ${clip} samples beyond ±1.0 (will clip)` : ''));
    return { L, R, sr, n, source, note, stats };
  }

  // reference data for the verifier: RMS envelope (20 ms windows, mono mix) + a few raw excerpts
  function makeAudioRef(pcm, from) {
    const { L, R, sr, n } = pcm, win = Math.round(sr * 0.02), nw = Math.floor(n / win);
    const env = new Float32Array(nw);
    for (let w = 0; w < nw; w++) { let s = 0; for (let i = w * win; i < (w + 1) * win; i++) { const m = (L[i] + R[i]) * 0.5; s += m * m; } env[w] = Math.sqrt(s / win); }
    const exLen = Math.round(sr * 0.5), excerpts = [];
    // choose the loudest 0.5 s region inside each quarter (fall back to the quarter centre)
    for (let q = 0; q < 4; q++) {
      const a = Math.floor((nw * q) / 4), b = Math.floor((nw * (q + 1)) / 4) - Math.ceil(exLen / win) - 1;
      let best = Math.floor((a + b) / 2), bestE = -1;
      for (let w = a; w <= b; w++) if (env[w] > bestE) { bestE = env[w]; best = w; }
      const start = Math.max(0, Math.min(n - exLen, best * win));
      if (start < 0 || n < exLen) continue;
      excerpts.push({ start, L: f32ToB64(L.slice(start, start + exLen)), R: f32ToB64(R.slice(start, start + exLen)) });
    }
    return { sr, n, from, win, env: f32ToB64(env), excerpts, source: pcm.source, stats: pcm.stats };
  }

  // ================================================================== audio encoding
  async function runAudioEncoder(cfg, L, R, n) {
    if (n < 8192) { const l = new Float32Array(8192), r = new Float32Array(8192); l.set(L.subarray(0, n)); r.set(R.subarray(0, n)); L = l; R = r; n = 8192; }
    const chunks = [];
    let desc = null, dcfg = null, err = null;
    const enc = new AudioEncoder({
      output: (c, meta) => {
        if (meta && meta.decoderConfig) {
          dcfg = { codec: meta.decoderConfig.codec, sampleRate: meta.decoderConfig.sampleRate, numberOfChannels: meta.decoderConfig.numberOfChannels };
          if (meta.decoderConfig.description) { const d = meta.decoderConfig.description; desc = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d.slice(0)); }
        }
        const data = new Uint8Array(c.byteLength); c.copyTo(data);
        chunks.push({ data, ts: c.timestamp, dur: c.duration });
      },
      error: e => { err = e; },
    });
    enc.configure(cfg);
    const sr = cfg.sampleRate, block = 4096;
    for (let i = 0; i < n; i += block) {
      if (err) throw err;
      const m = Math.min(block, n - i), data = new Float32Array(m * 2);
      data.set(L.subarray(i, i + m), 0); data.set(R.subarray(i, i + m), m);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round((i * 1e6) / sr), data });
      enc.encode(ad); ad.close();
      if (enc.encodeQueueSize > 32) await waitDequeue(enc);
    }
    await enc.flush();
    enc.close();
    if (err) throw err;
    return { chunks, desc, dcfg };
  }

  async function decodeAudioChunks(cfg, enc, withDescription = true) {
    const outL = [], outR = [];
    let err = null, firstTs = null;
    const dec = new AudioDecoder({
      output: ad => {
        if (firstTs === null) firstTs = ad.timestamp;
        const m = ad.numberOfFrames, l = new Float32Array(m), r = new Float32Array(m);
        ad.copyTo(l, { planeIndex: 0, format: 'f32-planar' });
        if (ad.numberOfChannels > 1) ad.copyTo(r, { planeIndex: 1, format: 'f32-planar' }); else r.set(l);
        outL.push(l); outR.push(r); ad.close();
      },
      error: e => { err = e; },
    });
    const dc = { codec: cfg.codec, sampleRate: cfg.sampleRate, numberOfChannels: 2 };
    if (enc.desc && withDescription) dc.description = enc.desc;
    dec.configure(dc);
    for (const c of enc.chunks) dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: c.ts, duration: c.dur || undefined, data: c.data }));
    await dec.flush(); dec.close();
    if (err) throw err;
    const n = outL.reduce((a, b) => a + b.length, 0), L = new Float32Array(n), R = new Float32Array(n);
    let k = 0; for (let i = 0; i < outL.length; i++) { L.set(outL[i], k); R.set(outR[i], k); k += outL[i].length; }
    return { L, R, n, firstTs };
  }

  // Encoder delay (AAC priming / Opus pre-skip as seen by a plain decoder): push a windowed 2 kHz burst at a known
  // sample through encode → decode and find it again by cross-correlation.
  async function measureCodecDelay(cfg) {
    const sr = cfg.sampleRate, n = Math.round(sr * 0.5), pos = 7000, bw = 480;
    const L = new Float32Array(n), R = new Float32Array(n);
    for (let i = 0; i < bw; i++) { const v = 0.5 * Math.sin(2 * Math.PI * 2000 * i / sr) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (bw - 1))); L[pos + i] = v; R[pos + i] = v; }
    const enc = await runAudioEncoder(cfg, L, R, n);
    // Raw delay as seen by a decoder that knows nothing about priming. For AAC the description (AudioSpecificConfig)
    // carries no delay info anyway; for Opus it is an OpusHead whose pre-skip Chrome's decoder would apply itself.
    const dec = await decodeAudioChunks(cfg, enc, cfg.codec !== 'opus');
    let best = -1, bestC = -Infinity, bestN = 0, e1 = 0;
    for (let i = 0; i < bw; i++) e1 += L[pos + i] * L[pos + i];
    for (let lag = 0; lag <= 4096; lag++) {
      let c = 0, e2 = 0;
      for (let i = 0; i < bw; i++) { const y = dec.L[pos + i + lag] || 0; c += L[pos + i] * y; e2 += y * y; }
      if (c > bestC) { bestC = c; best = lag; bestN = c / Math.sqrt(e1 * e2 + 1e-20); }
    }
    return { delay: best, ncorr: round(bestN, 3), decodedSamples: dec.n, firstChunkTs: enc.chunks[0] ? enc.chunks[0].ts : null,
      firstChunkDur: enc.chunks[0] ? enc.chunks[0].dur : null, firstDecodedTs: dec.firstTs, chunks: enc.chunks.length, desc: enc.desc ? Array.from(enc.desc) : null };
  }

  async function encodeAudio(pcm, opts) {
    const cands = opts.audioCodec === 'opus' ? ['opus'] : opts.audioCodec === 'aac' ? ['aac'] : ['aac', 'opus'];
    for (const kind of cands) {
      const cfg = kind === 'aac'
        ? { codec: 'mp4a.40.2', sampleRate: pcm.sr, numberOfChannels: 2, bitrate: opts.audioBitrate, aac: { format: 'aac' } }
        : { codec: 'opus', sampleRate: pcm.sr, numberOfChannels: 2, bitrate: opts.audioBitrate, opus: { format: 'opus' } };
      let sup;
      try { sup = await AudioEncoder.isConfigSupported(cfg); } catch (e) { sup = { supported: false, why: e.message }; }
      if (!sup.supported) { log(`audio encoder ${cfg.codec} not supported${sup.why ? ' (' + sup.why + ')' : ''}${cands.length > 1 ? ' → trying next' : ''}`); continue; }
      const t0 = now();
      const cal = await measureCodecDelay(cfg);
      const d = cal.desc;
      const headPreSkip = kind === 'opus' && d && d.length >= 19 && String.fromCharCode(...d.slice(0, 8)) === 'OpusHead' ? d[10] | (d[11] << 8) : null;
      // priming = what the MP4 edit list must skip (media_time) so playback starts at input sample 0:
      // Opus → the encoder's own pre-skip (OpusHead), AAC → the measured raw encoder delay.
      const priming = headPreSkip != null ? headPreSkip : cal.delay;
      log(`audio codec delay (impulse round trip through a priming-unaware decoder, ${cfg.codec}): ${cal.delay} samples ` +
        `(${(cal.delay / pcm.sr * 1000).toFixed(2)} ms, ncorr ${cal.ncorr}, decoder output ${cal.decodedSamples} samples for ${cal.chunks} frames)` +
        (headPreSkip != null ? `; OpusHead pre-skip ${headPreSkip}` : '') + ` → edit-list priming ${priming}; first chunk ts ${cal.firstChunkTs} µs dur ${cal.firstChunkDur} µs`);
      if (cal.ncorr < 0.5) log('WARNING: codec-delay calibration correlation is weak; priming value may be off');
      if (headPreSkip != null && Math.abs(headPreSkip - cal.delay) > 2) log(`WARNING: OpusHead pre-skip ${headPreSkip} != measured delay ${cal.delay}`);
      const t1 = now();
      const enc = await runAudioEncoder(cfg, pcm.L, pcm.R, pcm.n);
      const frame = kind === 'aac' ? 1024 : null;
      const durs = enc.chunks.map(c => frame || Math.round((c.dur * pcm.sr) / 1e6));
      const mediaSamples = durs.reduce((a, b) => a + b, 0);
      const bytes = enc.chunks.reduce((a, c) => a + c.data.length, 0);
      const opusPreSkip = headPreSkip;
      const info = { kind, codec: cfg.codec, reportedCodec: enc.dcfg && enc.dcfg.codec, sampleRate: pcm.sr, channels: 2, bitrate: opts.audioBitrate,
        frames: enc.chunks.length, mediaSamples, priming, opusPreSkip, bytes, kbps: round((bytes * 8) / (pcm.n / pcm.sr) / 1000, 1),
        description: enc.desc ? Array.from(enc.desc).map(b => b.toString(16).padStart(2, '0')).join('') : null,
        calibrationMs: Math.round(t1 - t0), encodeMs: Math.round(now() - t1), calibration: cal };
      if (priming + pcm.n > mediaSamples) log(`WARNING: encoder produced ${mediaSamples} samples < priming ${priming} + ${pcm.n}; tail will be short by ${priming + pcm.n - mediaSamples}`);
      log(`audio encoded: ${cfg.codec} ${enc.chunks.length} frames, ${mediaSamples} media samples, ${(bytes / 1e6).toFixed(2)} MB (${info.kbps} kbit/s), ` +
        `ASC/desc ${info.description}, in ${(info.encodeMs / 1000).toFixed(2)} s`);
      return { info, chunks: enc.chunks, durs, desc: enc.desc, priming };
    }
    throw new Error('no supported audio encoder (tried ' + cands.join(', ') + ')');
  }

  // ================================================================== video encoder selection
  // H.264 Table A-1: [level_idc, MaxMBPS, MaxFS, MaxBR(kbit/s, ×1.25 for High)]
  const LEVELS = [[40, 245760, 8192, 20000], [41, 245760, 8192, 50000], [42, 522240, 8704, 50000], [50, 589824, 22080, 135000], [51, 983040, 36864, 240000], [52, 2073600, 36864, 240000]];
  function levelFor(w, h, fps, bitrate, high) {
    const fs = Math.ceil(w / 16) * Math.ceil(h / 16), mbps = fs * fps;
    for (const [lv, maxMbps, maxFs, maxBr] of LEVELS) if (fs <= maxFs && mbps <= maxMbps && bitrate <= maxBr * 1000 * (high ? 1.25 : 1)) return lv;
    return 52;
  }
  async function pickVideoConfig(opts, OW, OH, fps) {
    const tried = [];
    const profiles = opts.codec ? [[opts.codec, 'custom']] : [['64', 'High'], ['4d', 'Main'], ['42', 'Constrained Baseline']];
    for (const [p, name] of profiles) {
      const codec = p.length > 2 ? p : `avc1.${p}${p === '42' ? 'e0' : '00'}${levelFor(OW, OH, fps, opts.qp != null ? 50e6 : opts.bitrate, p === '64').toString(16)}`;
      const cfg = { codec, width: OW, height: OH, displayWidth: OW, displayHeight: OH, bitrate: opts.bitrate, framerate: fps,
        hardwareAcceleration: opts.hw, latencyMode: 'quality', bitrateMode: opts.bitrateMode, avc: { format: 'avc' } };
      if (opts.qp != null) { cfg.bitrateMode = 'quantizer'; delete cfg.bitrate; }
      if (opts.contentHint) cfg.contentHint = opts.contentHint;
      let sup;
      try { sup = await VideoEncoder.isConfigSupported(cfg); } catch (e) { sup = { supported: false, why: e.message }; }
      tried.push(codec + (sup.supported ? ' ✓' : ' ✗'));
      if (sup.supported) return { cfg: sup.config || cfg, codec, profile: name, tried };
    }
    throw new Error('no supported H.264 encoder config (tried ' + tried.join(', ') + ')');
  }

  // ------------------------------------------------------------------ exact RGB → I420 (BT.709, limited range)
  // Each art pixel becomes one 4x4 luma block and one 2x2 block in each chroma plane, so chroma never mixes two art
  // pixels (4:2:0 sample grid == art-pixel grid). Per colour, the (Y,Cb,Cr) triple is chosen among the ±1 neighbours
  // of the analytic value to minimise the RGB error after the standard inverse transform (Rec. ITU-R BT.709-6 matrix,
  // 8-bit limited range per BT.709 / H.264 Annex E), so the decoder can land on the exact palette colour.
  const KR = 0.2126, KB = 0.0722, KG = 1 - KR - KB;
  const CS_709 = { primaries: 'bt709', transfer: 'iec61966-2-1', matrix: 'bt709', fullRange: false };
  const dec709 = (Y, U, V) => {
    const y = (Y - 16) / 219, u = (U - 128) / 224, v = (V - 128) / 224;
    const c = x => Math.max(0, Math.min(255, Math.round(x * 255)));
    return [c(y + 2 * (1 - KR) * v), c(y - ((2 * KB * (1 - KB)) / KG) * u - ((2 * KR * (1 - KR)) / KG) * v), c(y + 2 * (1 - KB) * u)];
  };
  const yuvCache = new Map();
  function yuvFor(r, g, b) {
    const key = (r << 16) | (g << 8) | b;
    let out = yuvCache.get(key);
    if (out !== undefined) return out;
    const R = r / 255, G = g / 255, B = b / 255, Y = KR * R + KG * G + KB * B;
    const y0 = 16 + 219 * Y, u0 = 128 + 224 * ((B - Y) / (2 * (1 - KB))), v0 = 128 + 224 * ((R - Y) / (2 * (1 - KR)));
    let best = 0, bestE = Infinity;
    for (let dy = -1; dy <= 1; dy++) for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) {
      const Yq = Math.max(16, Math.min(235, Math.round(y0) + dy)), Uq = Math.max(16, Math.min(240, Math.round(u0) + du)), Vq = Math.max(16, Math.min(240, Math.round(v0) + dv));
      const [rr, gg, bb] = dec709(Yq, Uq, Vq);
      const e = (rr - r) ** 2 + (gg - g) ** 2 + (bb - b) ** 2 + 1e-3 * ((Yq - y0) ** 2 + (Uq - u0) ** 2 + (Vq - v0) ** 2);
      if (e < bestE) { bestE = e; best = Yq | (Uq << 8) | (Vq << 16); }
    }
    yuvCache.set(key, best);
    return best;
  }
  function paletteRoundTrip() {
    let maxErr = 0, exact = 0;
    for (const hex of HT.PAL) {
      const [r, g, b] = HT.rgb(hex), q = yuvFor(r, g, b), [rr, gg, bb] = dec709(q & 255, (q >> 8) & 255, (q >> 16) & 255);
      const e = Math.max(Math.abs(rr - r), Math.abs(gg - g), Math.abs(bb - b));
      maxErr = Math.max(maxErr, e); if (!e) exact++;
    }
    return { exactColours: exact, of: HT.PAL.length, maxErr };
  }
  // odd scale (×3 → 1080p): luma exact (S×S block per art pixel); each 2x2 chroma sample averages the U/V of the art
  // pixels it covers (a box filter, like any 4:2:0 converter). At art-pixel centres (3x+1, 3y+1) the chroma sample
  // always lies inside one art pixel, so the verifier's centre sampling still sees pure palette colours.
  let oddUV = null;
  function toI420odd(src, W, H, S, buf) {
    const OW = W * S, OH = H * S, CW = OW >> 1, CH = OH >> 1, ySize = OW * OH, cSize = CW * CH;
    const Y8 = buf.subarray(0, ySize), U8 = buf.subarray(ySize, ySize + cSize), V8 = buf.subarray(ySize + cSize, ySize + 2 * cSize);
    if (!oddUV || oddUV.length !== W * H * 2) oddUV = new Uint8Array(W * H * 2);
    let misses = 0;
    for (let y = 0; y < H; y++) {
      const yRow = y * S * OW;
      for (let x = 0; x < W; x++) {
        const p = (y * W + x) << 2, r = src[p], g = src[p + 1], b = src[p + 2];
        const rgb = (r << 16) | (g << 8) | b, k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        let q;
        if (lastRGB[k] === rgb) q = lastYUV[k]; else { q = yuvFor(r, g, b); lastRGB[k] = rgb; lastYUV[k] = q; misses++; }
        Y8.fill(q & 255, yRow + x * S, yRow + x * S + S);
        oddUV[(y * W + x) * 2] = (q >> 8) & 255; oddUV[(y * W + x) * 2 + 1] = (q >> 16) & 255;
      }
      for (let k2 = 1; k2 < S; k2++) Y8.copyWithin(yRow + k2 * OW, yRow, yRow + OW);
    }
    for (let cy = 0; cy < CH; cy++) {
      const ay0 = ((cy * 2) / S) | 0, ay1 = ((cy * 2 + 1) / S) | 0;
      for (let cx = 0; cx < CW; cx++) {
        const ax0 = ((cx * 2) / S) | 0, ax1 = ((cx * 2 + 1) / S) | 0;
        const i00 = (ay0 * W + ax0) * 2, i01 = (ay0 * W + ax1) * 2, i10 = (ay1 * W + ax0) * 2, i11 = (ay1 * W + ax1) * 2;
        U8[cy * CW + cx] = (oddUV[i00] + oddUV[i01] + oddUV[i10] + oddUV[i11] + 2) >> 2;
        V8[cy * CW + cx] = (oddUV[i00 + 1] + oddUV[i01 + 1] + oddUV[i10 + 1] + oddUV[i11 + 1] + 2) >> 2;
      }
    }
    return misses;
  }
  // 640x360 RGBA → I420 at an even scale (S = 2: 1280x720; S = 4: 2560x1440) — one chroma sample per art pixel
  const lastRGB = new Int32Array(32768).fill(-1), lastYUV = new Int32Array(32768);
  function toI420(src, W, H, S, buf) {
    if (S % 2) return toI420odd(src, W, H, S, buf);
    const OW = W * S, OH = H * S, CW = OW >> 1, cs = S >> 1, ySize = OW * OH, cSize = CW * (OH >> 1);
    const Y8 = buf.subarray(0, ySize), U8 = buf.subarray(ySize, ySize + cSize), V8 = buf.subarray(ySize + cSize, ySize + 2 * cSize);
    const fast = S === 4;
    const Y32 = fast ? new Uint32Array(buf.buffer, buf.byteOffset, ySize >> 2) : null;
    const U16 = fast ? new Uint16Array(buf.buffer, buf.byteOffset + ySize, cSize >> 1) : null;
    const V16 = fast ? new Uint16Array(buf.buffer, buf.byteOffset + ySize + cSize, cSize >> 1) : null;
    let misses = 0;
    for (let y = 0; y < H; y++) {
      const yRow = y * S * OW, cRow = y * cs * CW;
      for (let x = 0; x < W; x++) {
        const p = (y * W + x) << 2, r = src[p], g = src[p + 1], b = src[p + 2];
        const rgb = (r << 16) | (g << 8) | b, k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        let q;
        if (lastRGB[k] === rgb) q = lastYUV[k]; else { q = yuvFor(r, g, b); lastRGB[k] = rgb; lastYUV[k] = q; misses++; }
        const Yv = q & 255, Uv = (q >> 8) & 255, Vv = (q >> 16) & 255;
        if (fast) { Y32[(yRow >> 2) + x] = Yv * 0x01010101; U16[(cRow >> 1) + x] = Uv * 0x0101; V16[(cRow >> 1) + x] = Vv * 0x0101; }
        else { Y8.fill(Yv, yRow + x * S, yRow + x * S + S); U8.fill(Uv, cRow + x * cs, cRow + x * cs + cs); V8.fill(Vv, cRow + x * cs, cRow + x * cs + cs); }
      }
      for (let k = 1; k < S; k++) Y8.copyWithin(yRow + k * OW, yRow, yRow + OW);
      for (let k = 1; k < cs; k++) { U8.copyWithin(cRow + k * CW, cRow, cRow + CW); V8.copyWithin(cRow + k * CW, cRow, cRow + CW); }
    }
    return misses;
  }

  // Hardware encoders may write a level_idc that does not cover the stream (NVENC via Media Foundation writes 4.0 for
  // 1080p60 and for >25 Mbit/s peaks). level_idc is a plain byte at a fixed position in each SPS (no emulation-
  // prevention hazard for values >= 0x0a) and in avcC; raise it (never lower it) to the smallest level whose MaxFS,
  // MaxMBPS and MaxBR (x1.25 for High, measured as the peak 1-second sliding-window bitrate) admit the stream.
  function fixLevel(mux, w, h, fps) {
    const d = mux.video.description;
    if (!d || d.length < 12 || d[0] !== 1) return null;
    const peak = mux._bitrates(mux.video).max, high = d[1] >= 100;
    const need = levelFor(w, h, fps, peak, high), have = d[3];
    if (have >= need) return { note: `level ok: avcC/SPS level ${have / 10} covers ${w}x${h}@${fps} with peak ${(peak / 1e6).toFixed(1)} Mbit/s`, have, need, peak };
    const out = new Uint8Array(d);
    out[3] = need;
    let p = 6, patched = 0;
    for (let i = 0, n = d[5] & 31; i < n; i++) { const len = (d[p] << 8) | d[p + 1]; if ((d[p + 2] & 31) === 7 && len > 3) { out[p + 2 + 3] = need; patched++; } p += 2 + len; }
    mux.video.description = out;
    return { note: `LEVEL FIX: encoder declared level ${have / 10} but ${w}x${h}@${fps} with a peak of ${(peak / 1e6).toFixed(1)} Mbit/s needs ${need / 10}; ` +
      `patched avcC + ${patched} SPS level_idc byte(s) ${have} → ${need}`, have, need, peak };
  }

  // I420 self-check: read the planes back out of the VideoFrame; every 4x4 luma / 2x2 chroma block must be uniform
  // and decode (ideal BT.709 inverse) to within ±2 of its source art pixel
  async function checkI420(vf, srcCanvas, S) {
    const W = srcCanvas.width, H = srcCanvas.height, src = srcCanvas.getContext('2d').getImageData(0, 0, W, H).data;
    if (vf.format !== 'I420') return { skipped: 'VideoFrame format ' + vf.format };
    const buf = new Uint8Array(vf.allocationSize()), lay = await vf.copyTo(buf);
    const [Yl, Ul, Vl] = lay, cs = S >> 1;
    let bad = 0, maxErr = 0;
    if (S % 2) { // odd scale: luma blocks uniform, centre chroma sample decodes (ideal inverse) to within ±2
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const Y0 = buf[Yl.offset + y * S * Yl.stride + x * S];
        let uniform = true;
        for (let j = 0; j < S && uniform; j++) for (let i = 0; i < S; i++) if (buf[Yl.offset + (y * S + j) * Yl.stride + x * S + i] !== Y0) { uniform = false; break; }
        const ccx = (x * S + 1) >> 1, ccy = (y * S + 1) >> 1;
        const [r, g, b] = dec709(buf[Yl.offset + (y * S + 1) * Yl.stride + x * S + 1], buf[Ul.offset + ccy * Ul.stride + ccx], buf[Vl.offset + ccy * Vl.stride + ccx]), p = (y * W + x) * 4;
        const e = Math.max(Math.abs(r - src[p]), Math.abs(g - src[p + 1]), Math.abs(b - src[p + 2]));
        if (e > maxErr) maxErr = e;
        if (!uniform || e > 2) bad++;
      }
      return { format: 'I420', scale: S, mismatches: bad, maxRoundTripErr: maxErr, note: 'odd scale: luma exact, chroma checked at art-pixel centres' };
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const Y0 = buf[Yl.offset + y * S * Yl.stride + x * S], U0 = buf[Ul.offset + y * cs * Ul.stride + x * cs], V0 = buf[Vl.offset + y * cs * Vl.stride + x * cs];
      let uniform = true;
      for (let j = 0; j < S && uniform; j++) for (let i = 0; i < S; i++) if (buf[Yl.offset + (y * S + j) * Yl.stride + x * S + i] !== Y0) { uniform = false; break; }
      for (let j = 0; j < cs && uniform; j++) for (let i = 0; i < cs; i++) if (buf[Ul.offset + (y * cs + j) * Ul.stride + x * cs + i] !== U0 || buf[Vl.offset + (y * cs + j) * Vl.stride + x * cs + i] !== V0) { uniform = false; break; }
      const [r, g, b] = dec709(Y0, U0, V0), p = (y * W + x) * 4;
      const e = Math.max(Math.abs(r - src[p]), Math.abs(g - src[p + 1]), Math.abs(b - src[p + 2]));
      if (e > maxErr) maxErr = e;
      if (!uniform || e > 2) bad++;
    }
    return { format: 'I420', mismatches: bad, maxRoundTripErr: maxErr };
  }

  // exactness self-check: every pixel of the VideoFrame handed to the encoder == its 480x270 source pixel
  async function checkUpscale(vf, srcCanvas, S) {
    const W = srcCanvas.width, H = srcCanvas.height;
    const src = srcCanvas.getContext('2d').getImageData(0, 0, W, H).data;
    const fmt = vf.format;
    if (!fmt || !/^(RGB|BGR)[AX]$/.test(fmt)) return { skipped: 'VideoFrame format ' + fmt };
    const buf = new Uint8Array(vf.allocationSize());
    const layout = await vf.copyTo(buf);
    const { offset, stride } = layout[0], bgr = fmt[0] === 'B';
    let bad = 0;
    for (let y = 0; y < H * S; y++) {
      const sy = ((y / S) | 0) * W, row = offset + y * stride;
      for (let x = 0; x < W * S; x++) {
        const p = row + x * 4, q = (sy + ((x / S) | 0)) * 4;
        if (buf[p + (bgr ? 2 : 0)] !== src[q] || buf[p + 1] !== src[q + 1] || buf[p + (bgr ? 0 : 2)] !== src[q + 2]) bad++;
      }
    }
    return { format: fmt, mismatches: bad };
  }

  // ================================================================== main export
  X.start = (o = {}) => {
    if (X.running) throw new Error('export already running');
    X.running = true;
    run(o).catch(e => { X.error = (e && e.stack) || String(e); X.phase = 'error'; log('ERROR ' + X.error); });
    return true;
  };

  async function run(o) {
    const opts = Object.assign({ fps: 30, scale: 4, bitrate: 30e6, bitrateMode: 'variable', gop: 2, hw: 'no-preference', codec: null, contentHint: null,
      audioCodec: 'auto', audioBitrate: 192000, sampleRate: 48000, audioSource: 'auto', from: 0, to: null, maxQueue: 6, canvas: 'gpu', input: 'i420',
      checkEvery: 20, maxBuffered: 256 << 20 }, o);
    X.phase = 'boot';
    await waitReady();
    const fps = Math.round(opts.fps), S = opts.scale, W = HT.W, H = HT.H, OW = W * S, OH = H * S;
    if (!(fps > 0 && fps <= 240)) throw new Error('bad fps ' + opts.fps);
    const D = HT.duration, from = Math.max(0, Math.min(D, +opts.from || 0)), to = opts.to == null ? D : Math.max(from, Math.min(D, +opts.to));
    const f0 = Math.round(from * fps), f1 = Math.round(to * fps), N = f1 - f0;
    if (N <= 0) throw new Error('nothing to export');
    const tl = HT.timeline.map(e => ({ id: e.id, start: e.start, dur: e.dur, placeholder: !!e.def.placeholder, transition: e.transitionIn && e.transitionIn.type }));
    const ph = tl.filter(e => e.placeholder).map(e => e.id);
    log(`timeline: ${tl.length} scenes, HT.duration = ${D} s; ${ph.length ? 'PLACEHOLDER scenes: ' + ph.join(', ') : 'all scenes present'}`);
    log(`export: frames ${f0}..${f1 - 1} (${N} frames, ${(N / fps).toFixed(3)} s) at ${fps} fps, ${OW}x${OH} (${S}x nearest), ` +
      (opts.qp != null ? `constant QP ${opts.qp}` : `${(opts.bitrate / 1e6).toFixed(1)} Mbit/s ${opts.bitrateMode}`));
    X.result = { opts, timeline: tl, placeholders: ph, duration: D, from, to, fps, frames: N, width: OW, height: OH };

    // ---------------------------------------------------------------- audio (first: fast, and fails early)
    X.phase = 'audio';
    const tA = now();
    const pcm = await getAudio(opts.sampleRate, from, N / fps, opts.audioSource);
    X.aref = makeAudioRef(pcm, from);
    const A = await encodeAudio(pcm, opts);
    X.result.audio = Object.assign({ source: pcm.source, sourceNote: pcm.note, sourceStats: pcm.stats, samples: pcm.n, totalMs: Math.round(now() - tA) }, A.info);

    // ---------------------------------------------------------------- video
    X.phase = 'video';
    const pick = await pickVideoConfig(opts, OW, OH, fps);
    log(`video encoder: ${pick.codec} (${pick.profile}), hardwareAcceleration=${opts.hw}; tried ${pick.tried.join(', ')}`);
    const vts = 90000 % fps === 0 ? 90000 : fps * 1000, tick = vts / fps;
    const gop = Math.max(1, Math.round(opts.gop * fps));
    const mux = new MP4Muxer({
      video: { width: OW, height: OH, timescale: vts },
      audio: { codec: A.info.kind, sampleRate: pcm.sr, channels: 2, priming: A.priming, durationSamples: pcm.n },
      onData: push, title: 'DOMAIN CLASH — an unofficial fan film', tool: 'DOMAIN CLASH exporter (WebCodecs + tools/mp4mux.js)',
      comment: `${fps} fps; source snapshot ${opts.sourceHash || 'n/a'}; frames ${f0}..${f1 - 1}`,
    });
    mux.audio.description = A.desc;

    // interleave: keep audio 0.5–1.5 s ahead of video in file order, written in 1 s blocks
    let aIdx = 0, aUntil = 0;
    const aStart = k => (k * 1024 - A.priming) / pcm.sr; // approx presentation time of audio frame k (AAC); fine for Opus too
    const audioUpTo = tv => {
      while (aIdx < A.chunks.length && tv + 0.5 >= aUntil) {
        aUntil += 1;
        while (aIdx < A.chunks.length && aStart(aIdx) < aUntil) { mux.addAudio(A.chunks[aIdx].data, { dur: A.durs[aIdx] }); aIdx++; }
      }
    };

    let encErr = null, encoded = 0, lastTs = -1, reordered = 0, decoderConfig = null;
    const keyIdx = [];
    const venc = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          if (meta && meta.decoderConfig && !decoderConfig) {
            const dc = meta.decoderConfig, d = dc.description;
            decoderConfig = { codec: dc.codec, codedWidth: dc.codedWidth, codedHeight: dc.codedHeight, colorSpace: dc.colorSpace ? (dc.colorSpace.toJSON ? dc.colorSpace.toJSON() : dc.colorSpace) : null,
              hardwareAcceleration: dc.hardwareAcceleration };
            mux.video.description = new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d.slice(0));
            decoderConfig.description = Array.from(mux.video.description).map(b => b.toString(16).padStart(2, '0')).join('');
            const ecs = decoderConfig.colorSpace;
            if (opts.input === 'canvas') { if (ecs) mux.video.cfg.colorSpace = ecs; }    // Chrome did RGB→YUV: trust its report
            else if (ecs && ['primaries', 'transfer', 'matrix', 'fullRange'].some(k => ecs[k] != null && ecs[k] !== CS_709[k]))
              log(`WARNING: encoder reports colour space ${JSON.stringify(ecs)} but frames were converted as ${JSON.stringify(CS_709)}; the colr box keeps the latter`);
            log('video decoderConfig: ' + JSON.stringify(decoderConfig));
          }
          if (chunk.timestamp < lastTs) reordered++;
          lastTs = Math.max(lastTs, chunk.timestamp);
          const fi = Math.round((chunk.timestamp * fps) / 1e6);
          const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data);
          if (chunk.type === 'key' && !X._spsChecked) { X._spsChecked = true; for (let p = 0; p + 4 < data.length;) { const len = ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3]) >>> 0; if ((data[p + 4] & 31) === 7) log('WARNING: encoder emits in-band SPS NAL units (level fix-up only patches avcC)'); p += 4 + len; } }
          audioUpTo(fi / fps);
          mux.addVideo(data, { pts: fi * tick, dur: tick, key: chunk.type === 'key' });
          if (chunk.type === 'key') keyIdx.push(fi);
          encoded++;
          X.progress.encoded = encoded;
        } catch (e) { encErr = e; }
      },
      error: e => { encErr = e; },
    });
    venc.configure(pick.cfg);

    const useI420 = opts.input !== 'canvas';
    let big = null, bctx = null, yuvBuf = null;
    if (useI420) {
      yuvBuf = new Uint8Array((OW * OH * 3) / 2);
      mux.video.cfg.colorSpace = CS_709;                    // authoritative: we did the conversion ourselves
      const rt = paletteRoundTrip();
      log(`input: I420 (BT.709 limited range, one ${S}x${S} luma block per art pixel; chroma ${S % 2 ? 'box-averaged 2x2 (odd scale)' : (S / 2) + 'x' + (S / 2) + ' block per art pixel'}); palette round trip under the ideal inverse: ${rt.exactColours}/${rt.of} colours exact, max error ${rt.maxErr}`);
      X.result.inputPath = { kind: 'i420', colorSpace: CS_709, paletteRoundTrip: rt };
    } else {
      big = document.createElement('canvas');
      big.width = OW; big.height = OH;
      bctx = big.getContext('2d', { alpha: false, willReadFrequently: opts.canvas === 'cpu' });
      bctx.imageSmoothingEnabled = false;
      log(`input: ${OW}x${OH} canvas (drawImage ${S}x nearest, smoothing off) → VideoFrame; RGB→YUV done by Chrome/encoder`);
      X.result.inputPath = { kind: 'canvas', canvas: opts.canvas };
    }
    let colourMisses = 0;
    const T = { render: 0, blit: 0, frame: 0, encode: 0, wait: 0, check: 0 };
    const checks = [];
    const checkAt = new Set([0, N - 1]);
    for (let k = 1; k < opts.checkEvery; k++) checkAt.add(Math.floor((k * N) / opts.checkEvery));
    X.progress = { t0: now(), frame: 0, frames: N, encoded: 0 };
    for (let k = 0; k < N; k++) {
      if (encErr) throw encErr;
      let t = now();
      const src = HT.renderFrame((f0 + k) / fps);
      let t2 = now(); T.render += t2 - t; t = t2;
      const ts = Math.round((k * 1e6) / fps), ts2 = Math.round(((k + 1) * 1e6) / fps);
      let vf;
      if (useI420) {
        const px = src.getContext('2d').getImageData(0, 0, W, H).data;
        colourMisses += toI420(px, W, H, S, yuvBuf);
        t2 = now(); T.blit += t2 - t; t = t2;
        vf = new VideoFrame(yuvBuf, { format: 'I420', codedWidth: OW, codedHeight: OH, timestamp: ts, duration: ts2 - ts, colorSpace: CS_709 });
      } else {
        bctx.drawImage(src, 0, 0, OW, OH);
        t2 = now(); T.blit += t2 - t; t = t2;
        vf = new VideoFrame(big, { timestamp: ts, duration: ts2 - ts });
      }
      t2 = now(); T.frame += t2 - t; t = t2;
      if (checkAt.has(k)) {
        const r = useI420 ? await checkI420(vf, src, S) : await checkUpscale(vf, src, S);
        checks.push(Object.assign({ frame: f0 + k }, r));
        if (r.mismatches) log(`SELF-CHECK FAILED: frame ${f0 + k}: ${r.mismatches} art pixels of the encoder input do not match HT.renderFrame (${JSON.stringify(r)})`);
        t2 = now(); T.check += t2 - t; t = t2;
      }
      venc.encode(vf, opts.qp != null ? { keyFrame: k % gop === 0, avc: { quantizer: opts.qp } } : { keyFrame: k % gop === 0 });
      vf.close();
      t2 = now(); T.encode += t2 - t; t = t2;
      while (venc.encodeQueueSize > opts.maxQueue) await waitDequeue(venc);
      while (outQueued > opts.maxBuffered) await sleep(20);     // node is not keeping up — don't balloon memory
      await yieldTask();
      T.wait += now() - t;
      X.progress.frame = k + 1;
    }
    await venc.flush();
    venc.close();
    if (encErr) throw encErr;
    audioUpTo(Infinity);
    const tEnc = (now() - X.progress.t0) / 1000;

    // ---------------------------------------------------------------- finalize + self-checks
    X.phase = 'finalize';
    const levelFix = fixLevel(mux, OW, OH, fps);
    if (levelFix) log(levelFix.note);
    const header = mux.finalize({ audioPriming: A.priming, audioSamples: pcm.n });
    const missingKeys = [];
    const keySet = new Set(keyIdx);
    for (let k = 0; k < N; k += gop) if (!keySet.has(k)) missingKeys.push(k);
    const problems = [];
    if (encoded !== N) problems.push(`encoder produced ${encoded} chunks for ${N} frames`);
    if (missingKeys.length) problems.push(`requested keyframes not honoured at ${missingKeys.slice(0, 10).join(',')}${missingKeys.length > 10 ? '…' : ''}`);
    if (checks.some(c => c.mismatches)) problems.push('upscale self-check failed');
    if (aIdx !== A.chunks.length) problems.push('not all audio chunks muxed');
    const res = X.result;
    Object.assign(res, {
      video: { codecRequested: pick.codec, profile: pick.profile, encoderConfig: pick.cfg, decoderConfig, levelFix, qp: opts.qp, gopFrames: gop, keyframes: keyIdx.length,
        extraKeyframes: keyIdx.length - Math.ceil(N / gop) + missingKeys.length, missingKeyframes: missingKeys.length, reorderedChunks: reordered, timescale: vts },
      selfChecks: { upscale: checks, problems, colourCacheMisses: colourMisses },
      timing: { encodeWallSec: round(tEnc, 2), fps: round(N / tEnc, 2), realtimeFactor: round(N / fps / tEnc, 2),
        msPerFrame: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, round(v / N, 3)])) },
      mux: mux.info,
    });
    X.headerBytes = header;
    log(`encoded ${N} frames in ${tEnc.toFixed(1)} s = ${(N / tEnc).toFixed(1)} fps (${(N / fps / tEnc).toFixed(2)}x realtime); ` +
      `ms/frame ${JSON.stringify(res.timing.msPerFrame)}`);
    log(`mux: ${JSON.stringify(mux.info)}`);
    if (problems.length) log('SELF-CHECK PROBLEMS: ' + problems.join('; ')); else log(`self-checks OK (upscale exact on ${checks.length} frames, ${keyIdx.length} keyframes incl. all ${Math.ceil(N / gop)} requested, ${encoded}/${N} frames)`);
    X.phase = 'done';
  }

  // ================================================================== verification (run in a fresh browser on the written file)
  const PAL_IDX = new Map();
  const palRGB = () => HT.PAL.map(h => HT.rgb(h));
  function nearestPal(r, g, b, pal) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }
    return bi;
  }
  function refFrame(tg) {
    const c = HT.renderFrame(tg);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height);
  }
  // decoded 1920x1080 RGBA vs reference 480x270: (a) nearest sampling at art-pixel centres, (b) full-res vs 4x ref
  function compareFrames(dec, ref, S, pal) {
    const W = ref.width, H = ref.height, OW = dec.width, d = dec.data, r = ref.data;
    const sum = [0, 0, 0], maxe = [0, 0, 0];
    let exact = 0, within2 = 0, within4 = 0, palOk = 0, se = 0;
    const palCache = new Map();
    const c = (S / 2) | 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = (y * W + x) * 4, p = ((y * S + c) * OW + (x * S + c)) * 4;
      let e0 = Math.abs(d[p] - r[q]), e1 = Math.abs(d[p + 1] - r[q + 1]), e2 = Math.abs(d[p + 2] - r[q + 2]);
      sum[0] += e0; sum[1] += e1; sum[2] += e2;
      if (e0 > maxe[0]) maxe[0] = e0; if (e1 > maxe[1]) maxe[1] = e1; if (e2 > maxe[2]) maxe[2] = e2;
      const m = Math.max(e0, e1, e2);
      if (m === 0) exact++; if (m <= 2) within2++; if (m <= 4) within4++;
      se += e0 * e0 + e1 * e1 + e2 * e2;
      const key = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
      let pi = palCache.get(key); if (pi === undefined) { pi = nearestPal(d[p], d[p + 1], d[p + 2], pal); palCache.set(key, pi); }
      const rk = (r[q] << 16) | (r[q + 1] << 8) | r[q + 2];
      let ri = PAL_IDX.get(rk); if (ri === undefined) { ri = nearestPal(r[q], r[q + 1], r[q + 2], pal); PAL_IDX.set(rk, ri); }
      if (pi === ri) palOk++;
    }
    const n = W * H;
    // full resolution (every decoded pixel vs its source art pixel) — includes chroma-subsampling edge effects
    let fse = 0; const fsum = [0, 0, 0]; let fexact = 0;
    for (let y = 0; y < dec.height; y++) {
      const ry = ((y / S) | 0) * W;
      for (let x = 0; x < OW; x++) {
        const p = (y * OW + x) * 4, q = (ry + ((x / S) | 0)) * 4;
        const e0 = Math.abs(d[p] - r[q]), e1 = Math.abs(d[p + 1] - r[q + 1]), e2 = Math.abs(d[p + 2] - r[q + 2]);
        fsum[0] += e0; fsum[1] += e1; fsum[2] += e2; fse += e0 * e0 + e1 * e1 + e2 * e2;
        if (e0 + e1 + e2 === 0) fexact++;
      }
    }
    const fn = OW * dec.height;
    const psnr = mse => Math.min(99, mse > 0 ? 10 * Math.log10((255 * 255) / mse) : 99);   // 99 = identical
    return {
      maeRGB: sum.map(v => round(v / n, 3)), maxErrRGB: maxe, exactPct: round((100 * exact) / n, 2), within2Pct: round((100 * within2) / n, 2),
      within4Pct: round((100 * within4) / n, 2), paletteMatchPct: round((100 * palOk) / n, 3), psnrDb: round(psnr(se / (3 * n)), 2),
      full: { maeRGB: fsum.map(v => round(v / fn, 3)), exactPct: round((100 * fexact) / fn, 2), psnrDb: round(psnr(fse / (3 * fn)), 2) },
    };
  }
  const maeOnly = (dec, ref, S) => {
    const W = ref.width, H = ref.height, OW = dec.width, d = dec.data, r = ref.data, c = (S / 2) | 0;
    let s = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = (y * W + x) * 4, p = ((y * S + c) * OW + (x * S + c)) * 4; s += Math.abs(d[p] - r[q]) + Math.abs(d[p + 1] - r[q + 1]) + Math.abs(d[p + 2] - r[q + 2]); }
    return round(s / (3 * W * H), 3);
  };

  // Read the decoded picture exactly as the decoder produced it (no GPU scaling / colour conversion by the
  // compositor): VideoFrame(video) → copyTo planes → ideal BT.709 limited-range inverse (what the file signals).
  async function decodedPlanesToRGBA(v, OW, OH) {
    const vf = new VideoFrame(v);
    try {
      const fmt = vf.format;
      if (!fmt) return { error: 'VideoFrame(video) has no CPU-readable format (GPU-only frame)' };
      const vr = vf.visibleRect, buf = new Uint8Array(vf.allocationSize({ rect: vr })), lay = await vf.copyTo(buf, { rect: vr });
      const w = vr.width, h = vr.height, out = new ImageData(w, h), d = out.data;
      const cs = vf.colorSpace ? (vf.colorSpace.toJSON ? vf.colorSpace.toJSON() : vf.colorSpace) : null;
      const lut = new Map();
      const Yl = lay[0];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const Y = buf[Yl.offset + y * Yl.stride + x];
        let U, V;
        if (fmt === 'NV12') { const o = lay[1].offset + (y >> 1) * lay[1].stride + (x >> 1) * 2; U = buf[o]; V = buf[o + 1]; }
        else if (fmt === 'I420') { U = buf[lay[1].offset + (y >> 1) * lay[1].stride + (x >> 1)]; V = buf[lay[2].offset + (y >> 1) * lay[2].stride + (x >> 1)]; }
        else return { error: 'unsupported decoded format ' + fmt };
        const key = Y | (U << 8) | (V << 16);
        let c = lut.get(key); if (!c) { c = dec709(Y, U, V); lut.set(key, c); }
        const p = (y * w + x) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
      return { img: out, format: fmt, colorSpace: cs, codedWidth: vf.codedWidth, codedHeight: vf.codedHeight, visible: [vr.x, vr.y, vr.width, vr.height], timestamp: vf.timestamp };
    } finally { vf.close(); }
  }

  // Seek, then wait for 'seeked' AND the presentation of the new frame: requestVideoFrameCallback reports that frame's
  // exact mediaTime (callbacks for frames far from T are stale and ignored). Falls back to currentTime if no frame
  // callback arrives within 1.5 s of 'seeked'.
  function seekTo(v, T) {
    return new Promise((res, rej) => {
      let frame = null, seeked = false, done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(hard); res({ currentTime: v.currentTime, meta: frame }); };
      const hard = setTimeout(() => { if (!done) { done = true; rej(new Error('seek to ' + T + ' timed out')); } }, 20000);
      const onFrame = (_, meta) => {
        if (done) return;
        if (Math.abs(meta.mediaTime - T) > 0.5) { v.requestVideoFrameCallback(onFrame); return; }
        frame = { mediaTime: meta.mediaTime, presentedFrames: meta.presentedFrames, width: meta.width, height: meta.height };
        if (seeked) finish();
      };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(onFrame);
      v.addEventListener('seeked', () => { seeked = true; if (frame || !v.requestVideoFrameCallback) finish(); else setTimeout(finish, 1500); }, { once: true });
      v.currentTime = T;
    });
  }

  function xhrBytes(url) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open('GET', url); x.responseType = 'arraybuffer';
      x.onload = () => (x.response && x.response.byteLength ? res(x.response) : rej(new Error('empty XHR response (status ' + x.status + ')')));
      x.onerror = () => rej(new Error('XHR failed for ' + url));
      x.send();
    });
  }

  async function verifyAudio(url, ref, expectDur) {
    const out = { refSource: ref.source };
    const t0 = now();
    const bytes = await xhrBytes(url);
    out.fileBytes = bytes.byteLength;
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: 1, sampleRate: ref.sr });
    const buf = await ctx.decodeAudioData(bytes);
    out.decodeMs = Math.round(now() - t0);
    out.decoded = { channels: buf.numberOfChannels, sampleRate: buf.sampleRate, length: buf.length, duration: round(buf.duration, 4) };
    out.expectedSamples = ref.n;
    out.lengthDiffSamples = buf.length - ref.n;
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    // lag search on each excerpt (mono mix), then SNR after alignment
    const lags = [];
    for (const ex of ref.excerpts) {
      const eL = b64ToF32(ex.L), eR = b64ToF32(ex.R), m = eL.length, s0 = ex.start;
      const refM = new Float32Array(m); for (let i = 0; i < m; i++) refM[i] = (eL[i] + eR[i]) * 0.5;
      let e1 = 0; for (let i = 0; i < m; i++) e1 += refM[i] * refM[i];
      let best = 0, bestC = -Infinity, bestN = 0;
      const step = 4, M = Math.min(m, 12000);
      const corr = lag => { let c = 0, e2 = 0; for (let i = 0; i < M; i += step) { const j = s0 + i + lag; const y = j >= 0 && j < L.length ? (L[j] + R[j]) * 0.5 : 0; c += refM[i] * y; e2 += y * y; } return [c, e2]; };
      for (let lag = -4096; lag <= 4096; lag++) { const [c] = corr(lag); if (c > bestC) { bestC = c; best = lag; } }
      // refine at full resolution around the coarse peak
      let fine = best; bestC = -Infinity;
      for (let lag = best - 8; lag <= best + 8; lag++) {
        let c = 0; for (let i = 0; i < m; i++) { const j = s0 + i + lag; const y = j >= 0 && j < L.length ? (L[j] + R[j]) * 0.5 : 0; c += refM[i] * y; }
        if (c > bestC) { bestC = c; fine = lag; }
      }
      let se = 0, e2 = 0, sig = 0, cc = 0;
      for (let i = 0; i < m; i++) {
        const j = s0 + i + fine, yl = j < L.length ? L[j] : 0, yr = j < R.length ? R[j] : 0;
        se += (yl - eL[i]) ** 2 + (yr - eR[i]) ** 2; sig += eL[i] ** 2 + eR[i] ** 2; e2 += yl * yl + yr * yr; cc += yl * eL[i] + yr * eR[i];
      }
      bestN = cc / Math.sqrt(sig * e2 + 1e-20);
      lags.push({ atSec: round(s0 / ref.sr + ref.from, 3), lagSamples: fine, ncorr: round(bestN, 4), snrDb: round(10 * Math.log10(sig / (se + 1e-20)), 2),
        refRmsDb: round(10 * Math.log10(sig / (2 * m) + 1e-20), 2), decRmsDb: round(10 * Math.log10(e2 / (2 * m) + 1e-20), 2) });
    }
    out.excerpts = lags;
    const lagsSorted = lags.map(l => l.lagSamples).sort((a, b) => a - b);
    const lag = lagsSorted.length ? lagsSorted[lagsSorted.length >> 1] : 0;
    out.lagSamples = lag; out.lagMs = round((lag / ref.sr) * 1000, 3);
    // RMS envelope comparison (20 ms windows) after lag compensation
    const env = b64ToF32(ref.env), win = ref.win;
    const dEnv = new Float32Array(env.length);
    for (let w = 0; w < env.length; w++) {
      let s = 0; for (let i = w * win; i < (w + 1) * win; i++) { const j = i + lag; const y = j >= 0 && j < L.length ? (L[j] + R[j]) * 0.5 : 0; s += y * y; }
      dEnv[w] = Math.sqrt(s / win);
    }
    let sr2 = 0, sd2 = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, k = 0, maxDb = 0, cnt = 0;
    for (let w = 0; w < env.length; w++) {
      sr2 += env[w] ** 2; sd2 += dEnv[w] ** 2;
      const a = env[w], b = dEnv[w]; sx += a; sy += b; sxx += a * a; syy += b * b; sxy += a * b; k++;
      if (a > 0.01) { const db = Math.abs(20 * Math.log10((b + 1e-9) / a)); if (db > maxDb) maxDb = db; cnt++; }
    }
    const pear = (k * sxy - sx * sy) / Math.sqrt((k * sxx - sx * sx) * (k * syy - sy * sy) + 1e-30);
    out.rms = { refDb: round(10 * Math.log10(sr2 / env.length + 1e-20), 2), decodedDb: round(10 * Math.log10(sd2 / env.length + 1e-20), 2),
      diffDb: round(10 * Math.log10((sd2 + 1e-20) / (sr2 + 1e-20)), 3), envelopeCorrelation: round(pear, 5), maxWindowDiffDb: round(maxDb, 2), windowsCompared: cnt };
    // per-second RMS table (dB) for the first few seconds, useful to eyeball
    const perSec = []; const wps = Math.round(1 / 0.02);
    for (let s = 0; s * wps < env.length && perSec.length < 400; s++) {
      let a = 0, b = 0, n = 0; for (let w = s * wps; w < Math.min(env.length, (s + 1) * wps); w++) { a += env[w] ** 2; b += dEnv[w] ** 2; n++; }
      perSec.push([round(10 * Math.log10(a / n + 1e-20), 1), round(10 * Math.log10(b / n + 1e-20), 1)]);
    }
    out.perSecondRmsDb = perSec;
    out.expectDuration = expectDur;
    return out;
  }

  // secondary, independent audio path: real-time playback through <video> → MediaElementSource → AnalyserNode
  async function verifyPlaybackAudio(v, ref, at, secs) {
    const ac = new AudioContext({ sampleRate: ref.sr });
    if (ac.state !== 'running') { try { await ac.resume(); } catch (e) {} }
    const src = ac.createMediaElementSource(v), an = ac.createAnalyser();
    an.fftSize = 2048; src.connect(an); an.connect(ac.destination);
    v.muted = false; v.volume = 1;
    await seekTo(v, at);
    const buf = new Float32Array(an.fftSize);
    let s = 0, n = 0; const t0 = now();
    await v.play();
    const tStart = v.currentTime;
    while (now() - t0 < secs * 1000) {
      await sleep(40);
      an.getFloatTimeDomainData(buf); for (let i = 0; i < buf.length; i++) { s += buf[i] * buf[i]; } n += buf.length;
    }
    const tEnd = v.currentTime;
    v.pause(); v.muted = true;
    const env = b64ToF32(ref.env), w0 = Math.max(0, Math.floor((tStart - ref.from) / 0.02)), w1 = Math.min(env.length, Math.ceil((tEnd - ref.from) / 0.02));
    let rs = 0; for (let w = w0; w < w1; w++) rs += env[w] ** 2;
    const refDb = 10 * Math.log10(rs / Math.max(1, w1 - w0) + 1e-20), playDb = 10 * Math.log10(s / Math.max(1, n) + 1e-20);
    await ac.close();
    return { contextState: 'ran', played: [round(tStart, 3), round(tEnd, 3)], playbackRmsDb: round(playDb, 2), refRmsDb: round(refDb, 2), diffDb: round(playDb - refDb, 2) };
  }

  X.verify = async (o) => {
    await waitReady();
    const S = o.scale || 4, W = HT.W, H = HT.H, OW = W * S, OH = H * S, fps = o.fps;
    const res = { url: o.url, checks: [] };
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true;
    v.style.cssText = 'position:fixed;left:0;top:0;width:640px;height:360px';
    document.body.appendChild(v);
    const t0 = now();
    v.src = o.url;
    await once(v, 'loadedmetadata', 60000);
    res.metadataMs = Math.round(now() - t0);
    res.duration = v.duration; res.videoWidth = v.videoWidth; res.videoHeight = v.videoHeight;
    const expectDur = o.expectDuration;
    res.expectDuration = expectDur;
    log(`verify: loadedmetadata in ${res.metadataMs} ms: duration ${v.duration}s, ${v.videoWidth}x${v.videoHeight}`);
    const cv = document.createElement('canvas'); cv.width = OW; cv.height = OH;
    const cg = cv.getContext('2d', { willReadFrequently: true });
    const pal = palRGB();
    const f0 = o.f0 || 0, from = f0 / fps;
    for (const T of o.times) {
      if (!(T >= 0 && T < v.duration)) { res.checks.push({ requested: T, skipped: 'outside duration' }); continue; }
      const ts = now();
      const s = await seekTo(v, T);
      const seekMs = Math.round(now() - ts);
      cg.drawImage(v, 0, 0, OW, OH);
      let dec;
      try { dec = cg.getImageData(0, 0, OW, OH); } catch (e) { throw new Error('canvas tainted by the file:// video (' + e.message + ')'); }
      // frame index within the file: the presented frame's own timestamp when known, else the frame covering T
      const fi = s.meta ? Math.round(s.meta.mediaTime * fps) : Math.floor(s.currentTime * fps + 1e-6);
      const expectFi = Math.floor(T * fps + 1e-6);
      const ref = refFrame((f0 + fi) / fps);
      // determinism probe: render a far-away frame, then this one again; scene code that is not a pure function of t
      // (stale pixels, accumulated state, Math.random) shows up here instead of being blamed on the codec
      refFrame(((f0 + fi) / fps + 37.3) % HT.duration);
      const ref2 = refFrame((f0 + fi) / fps);
      let refDiff = 0; for (let i = 0; i < ref.data.length; i += 4) if (ref.data[i] !== ref2.data[i] || ref.data[i + 1] !== ref2.data[i + 1] || ref.data[i + 2] !== ref2.data[i + 2]) refDiff++;
      const cmp = compareFrames(dec, ref, S, pal);
      // same comparison on the raw decoded planes (nearest chroma, standard inverse): isolates codec error from the
      // browser's video→canvas rendering path
      let planes = null;
      if (o.planes !== false) {
        try {
          const pr = await decodedPlanesToRGBA(v, OW, OH);
          if (pr.img) { const c2 = compareFrames(pr.img, ref, S, pal); planes = { format: pr.format, colorSpace: pr.colorSpace, coded: [pr.codedWidth, pr.codedHeight], visible: pr.visible, ts: pr.timestamp, maeRGB: c2.maeRGB, exactPct: c2.exactPct, within2Pct: c2.within2Pct, paletteMatchPct: c2.paletteMatchPct, psnrDb: c2.psnrDb, fullPsnrDb: c2.full.psnrDb }; }
          else planes = { error: pr.error };
        } catch (e) { planes = { error: String((e && e.message) || e) }; }
      }
      const nb = {};
      for (const dk of [-1, 1]) { const j = fi + dk; if (j >= 0 && j < Math.round(v.duration * fps)) nb[dk] = maeOnly(dec, refFrame((f0 + j) / fps), S); }
      const mae = round((cmp.maeRGB[0] + cmp.maeRGB[1] + cmp.maeRGB[2]) / 3, 3);
      const rec = { requested: T, currentTime: round(s.currentTime, 4), mediaTime: s.meta ? s.meta.mediaTime : null, frame: fi, expectedFrame: expectFi,
        frameMatchesRequest: fi === expectFi, seekMs, ...cmp, planes, refNondeterministicPx: refDiff, neighbourMae: { prev: nb[-1], this: mae, next: nb[1] } };
      if (refDiff) log(`WARNING t=${T}: HT.renderFrame(${((f0 + fi) / fps).toFixed(4)}) is NOT deterministic — ${refDiff} art pixels changed when re-rendered after another frame (scene code bug; comparison at this time is unreliable)`);
      // a neighbour may tie within encoder noise when its source frame is identical (held frames on 2s, static shots):
      // only a clearly better neighbour means the wrong frame was decoded
      const tol = Math.max(0.05, mae * 0.02);
      rec.bestIsThisFrame = !(nb[-1] < mae - tol) && !(nb[1] < mae - tol);
      res.checks.push(rec);
      log(`verify t=${T}: frame ${fi}${fi === expectFi ? '' : ' (expected ' + expectFi + ')'} seek ${seekMs} ms · canvas: MAE rgb ${cmp.maeRGB.join('/')} · exact ${cmp.exactPct}% · ±2 ${cmp.within2Pct}% · palette ${cmp.paletteMatchPct}% · PSNR ${cmp.psnrDb} dB (full-res ${cmp.full.psnrDb} dB)` +
        (planes && !planes.error ? ` | planes(${planes.format}): MAE ${planes.maeRGB.join('/')} · exact ${planes.exactPct}% · palette ${planes.paletteMatchPct}% · PSNR ${planes.psnrDb} dB (full ${planes.fullPsnrDb})` : planes ? ' | planes: ' + planes.error : ''));
    }
    // audio
    if (o.audio !== false) {
      let ref = o.audioRef;
      if (!ref) {
        log('verify: no audio reference passed in → re-rendering it here');
        const pcm = await getAudio(o.sampleRate || 48000, from, v.duration, o.audioSource || 'auto');
        ref = makeAudioRef(pcm, from);
      }
      try { res.audio = await verifyAudio(o.url, ref, expectDur); log('verify audio (decodeAudioData): ' + JSON.stringify(Object.assign({}, res.audio, { perSecondRmsDb: undefined }))); }
      catch (e) { res.audio = { error: String((e && e.message) || e) }; log('verify audio FAILED: ' + res.audio.error); }
      if (o.playback !== false) {
        try {
          const at = Math.min(v.duration - 3, Math.max(0, (o.times && o.times[0]) || 0));
          res.playbackAudio = await verifyPlaybackAudio(v, ref, at, 2.5);
          log('verify audio (real-time <video> playback → analyser): ' + JSON.stringify(res.playbackAudio));
        } catch (e) { res.playbackAudio = { error: String((e && e.message) || e) }; log('playback audio check unavailable: ' + res.playbackAudio.error); }
      }
    }
    return res;
  };

  X.phase = 'loaded';
})();
