/* =====================================================================================================
   DOMAIN CLASH — audio engine core                                      (src/audio/engine.js, classic script)
   Web Audio API only: every note and every sound is synthesized (no samples, no voices). Contract: SPEC.md §11.

   Files (load order): engine.js (this: core + public API) → inst.js (instruments) → sfx.js (SFX catalog)
   → beds.js (ambience beds) → score.js (composer toolkit, themes, HT.music.cue) → score_*.js (music cues).
   They share internals through HT.AU (internal registry: def/INST, sfx/SFX_DEF, BED/bedAt, Comp, seq, MUSIC …);
   the public surface is HT.audio (playback/export) and HT.music (music cues).

   Architecture (inherited from HELLO, TOMORROW, extended)
   • Resources per sample rate: seeded noise buffers, a procedural stereo reverb impulse, PeriodicWaves,
     Karplus-Strong string buffers, pre-rendered bells/textures and the seamlessly looping ambience beds.
   • Session = one playback run on a realtime AudioContext or an OfflineAudioContext. It owns the buses and a flat,
     time-sorted event list built from HT.timeline: music notes (k:'n', from HT.music cues), SFX (k:'x', scene cues),
     ambience segments (k:'a') and bus automation (k:'g'). Events are pumped into the graph ahead of the audio clock
     ("A Tale of Two Clocks", C. Wilson, web.dev/articles/audio-scheduling); offline renders pump the same list in 1 s
     windows via OfflineAudioContext.suspend()/resume().
   • Mix: instrument strips (one set per music cue) → cue bus (dry + reverb/delay sends, per-cue level) → music bus
     → duck → gate → level; SFX bus (+ reverb) and ambience bus; → cut (whole-mix silence, worldCut) → master.
     Master, realtime: sub-sonic HPF → glue compressor → limiter (DynamicsCompressorNodes) → soft clip (ceiling
     0.8898 ≈ −1.01 dBFS) → volume. Master, offline (renderOffline / renderChunked): the same stages as deterministic JS
     (class Master) with an 8×-oversampled true-peak look-ahead limiter, ceiling 0.84 ≈ −1.5 dBTP — see the comment there
     for why (Chrome's compressor turns run-to-run float-summation noise into −76 dBFS differences).
   • Music exists only inside HT.music cues (score.js). Scenes covered by no cue are musically silent.
   • renderChunked(): long exports are rendered in chunks with an automatically sized pre-roll so every seam
     reproduces the continuous render (see the comment above needPre()).

   Notes for scene authors
   • Cue `t` is the sync point; SFX with pre-roll (charges, risers, reverse swells, big hits) land their hit on `t`.
     For the charge/riser family (`preDur` in SFX_DEF), `dur` sets the length of the build-up before `t`.
   • vol 0.5–1.0 sits right for foreground SFX, 0.2–0.5 for background details. Beds: vol 1 ≈ the RMS in BED
     (beds.js); 0.3–0.8 is the useful range.
   • Big SFX duck the music bus (SFX_DEF duck [dB, hold s | 'dur']); `worldCut` silences the whole mix after its tone.
   • Distance: any SFX cue may take `lp` (Hz, 24 dB/oct low-pass — a far, muffled source, e.g. lp: 900) and `wet`
     (reverb send × wet, e.g. 2 for a sound heard across the city). Default: unfiltered, catalog reverb send.
   ===================================================================================================== */
window.HT = window.HT || {};
(function () {
'use strict';
const HT = window.HT;
const AU = (HT.AU = HT.AU || {}); // internal registry (not a public contract)

// ------------------------------------------------------------------------------------------ constants
const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT;
const LOOKAHEAD = 0.2, TICK_MS = 25, STOP_FADE = 0.03;
// Each DynamicsCompressorNode delays its output by a 6 ms look-ahead (measured on the old engine: 576 samples @ 48 kHz
// for the two in the master). Renders schedule this much early and now() subtracts it, so sound stays on picture.
const MASTER_LAT = 0.012;
// Chunked rendering: after an event (and its reverb/delay tails) ends, how long until it cannot influence the output
// any more: reverb IR 2.6 s (FIR) · ping-pong delay feedback 0.36 per 0.75 s round trip → −100 dB after ~8.5 s.
const SEAM_TAIL = 9;
const PRE_MIN = 4; // s — minimum chunk pre-roll (set-target automation converges; event tails are handled by needPre)

// ------------------------------------------------------------------------------------------ utilities
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const dbg = d => Math.pow(10, d / 20);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function nm(s) { // 'F#5' -> 78, 'Bb3' -> 58 (C4 = 60)
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error('audio: bad note name ' + s);
  return 12 * (+m[3] + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
const warned = {};
function warnOnce(msg) { if (!warned[msg]) { warned[msg] = 1; console.warn('[HT.audio] ' + msg); } }

// ------------------------------------------------------------------ JS DSP (for pre-rendered buffers)
// RBJ "Audio EQ Cookbook" biquads (R. Bristow-Johnson). bp = constant 0 dB peak gain.
function BQ(type, f, q, sr) { this.type = type; this.sr = sr; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
BQ.prototype.set = function (f, q) {
  const w = 2 * Math.PI * clamp(f, 5, this.sr * 0.45) / this.sr, cw = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  const a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  if (this.type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; }
  else if (this.type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
};
BQ.prototype.run = function (x) {
  const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
  this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
  return y;
};
// Paul Kellet's refined pink-noise filter; brown = leaky integrated white.
function pinkGen(rng) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    const p = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    return p * 0.11;
  };
}
function brownGen(rng) { let l = 0; return () => { l = (l + 0.02 * (rng() * 2 - 1)) / 1.02; return l * 3.5; }; }
// Equal-power crossfade of the (L..L+X) overhang into the head -> seamless loop of length L.
function loopify(chs, L, X) {
  return chs.map(a => {
    const o = a.slice(0, L);
    for (let i = 0; i < X; i++) {
      const th = (i / X) * Math.PI / 2;
      o[i] = a[i] * Math.sin(th) + a[L + i] * Math.cos(th);
    }
    return o;
  });
}
function toBuffer(chs, sr) {
  const b = new AudioBuffer({ length: chs[0].length, numberOfChannels: chs.length, sampleRate: sr });
  chs.forEach((c, i) => b.copyToChannel(c, i));
  return b;
}
function removeDC(a) { let m = 0; for (let i = 0; i < a.length; i++) m += a[i]; m /= a.length || 1; for (let i = 0; i < a.length; i++) a[i] -= m; return a; }

// Karplus-Strong plucked string (Karplus & Strong 1983) with the Jaffe & Smith (1983) extensions: all-pass fine
// tuning, pitch-independent T60 and a pick-position comb on the excitation (o.pick = fraction of the string, e.g. 0.12
// = plucked near the bridge → nasal/bright). o.buzz: sawari (shamisen/biwa) — the string touches a unilateral obstacle
// near the nut on every swing. The loop stays linear; the contact is radiated as its own component: the part of the
// displacement that passes the obstacle (placed at o.buzzTh × the string's running amplitude, so the contact persists as
// the note decays), high-passed, × o.buzz. Its kinks regenerate high partials every period for as long as the string
// sounds (measured in tools/audio-lab.js: energy above 3 kHz mid-note 0.1 % → ~6 %), with no DC and no change of decay.
// (An in-loop fold / delay-modulation model was tried first: it pumped DC into the loop and lost high frequencies.)
// bright 0..1 = excitation low-pass. Returns a mono Float32Array.
function ksRender(sr, f, dur, t60, bright, seed, o) {
  o = o || {};
  const n = Math.max(64, Math.round(sr * dur));
  const out = new Float32Array(n), rng = mulberry32(seed);
  const P = sr / f, N = Math.max(2, Math.floor(P - 0.5)), frac = P - 0.5 - N;
  const C = (1 - frac) / (1 + frac);
  const g = Math.pow(0.001, 1 / (Math.max(0.05, t60) * f));
  let buf = new Float32Array(N);
  let lp = 0, mean = 0;
  for (let i = 0; i < N; i++) { lp += bright * ((rng() * 2 - 1) - lp); buf[i] = lp; }
  if (o.pick) { // comb: x[n] − x[n − βN] removes harmonics at multiples of 1/β
    const d = Math.max(1, Math.round(o.pick * N)), tmp = buf.slice();
    for (let i = 0; i < N; i++) buf[i] = tmp[i] - tmp[(i - d + N) % N];
  }
  for (let i = 0; i < N; i++) mean += buf[i];
  mean /= N; let pk = 1e-9;
  for (let i = 0; i < N; i++) { buf[i] -= mean; pk = Math.max(pk, Math.abs(buf[i])); }
  for (let i = 0; i < N; i++) buf[i] /= pk;
  const bz = o.buzz || 0, th = o.buzzTh == null ? 0.3 : o.buzzTh, dk = Math.exp(-1 / (2 * N)); // peak follower: ~2 periods
  const hA = bz ? new BQ('hp', 1400, 0.7, sr) : null, hB = bz ? new BQ('hp', 1400, 0.7, sr) : null;
  let idx = 0, prev = 0, ax = 0, ay = 0, env = 1;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const avg = g * 0.5 * (cur + prev); prev = cur;
    const ap = C * avg + ax - C * ay; ax = avg; ay = ap;
    buf[idx] = ap;
    let y = cur;
    if (bz) { const a = Math.abs(cur); env = a > env ? a : env * dk; y += bz * hB.run(hA.run(Math.max(0, cur - th * env))); }
    out[i] = y;
    idx++; if (idx === N) idx = 0;
  }
  const fi = Math.min(n, Math.round(sr * 0.0015)), fo = Math.min(n, Math.round(sr * 0.03));
  for (let i = 0; i < fi; i++) out[i] *= i / fi;
  for (let i = 0; i < fo; i++) out[n - 1 - i] *= i / fo;
  return removeDC(out);
}

// Procedural stereo reverb impulse (Moorer-style exponentially decaying noise, two decay bands for high-frequency
// damping, sparse early reflections, 14 ms pre-delay). RT60 ≈ 2.3 s (dark band) — a large, dark hall.
const IR_LEN = 2.6;
function makeIR(sr) {
  const len = Math.floor(sr * IR_LEN), pre = Math.floor(sr * 0.014), chs = [];
  for (let c = 0; c < 2; c++) {
    const rng = mulberry32(0x5eed + c * 7919), a = new Float32Array(len);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / sr, w = rng() * 2 - 1;
      lp += 0.15 * (w - lp);
      a[i] = w * 0.42 * Math.exp(-6.91 * t / 0.95) + lp * 1.75 * Math.exp(-6.91 * t / 2.3);
    }
    for (let k = 0; k < 9; k++) {
      const i = pre + Math.floor((0.004 + rng() * 0.085) * sr);
      a[i] += (rng() < 0.5 ? -1 : 1) * (0.55 - k * 0.045);
    }
    const fi = Math.floor(sr * 0.003), fo = Math.floor(sr * 0.3);
    for (let i = 0; i < fi; i++) a[pre + i] *= i / fi;
    for (let i = 0; i < fo; i++) a[len - 1 - i] *= i / fo;
    chs.push(a);
  }
  return chs;
}

// ---------------------------------------------------------------------- per-context resources
const BUF_CACHE = {}; // sampleRate -> { ir, noise…, ks: Map (LRU), beds: {}, misc: {} }  (AudioBuffers are context-free)
// Karplus-Strong string buffers: an LRU bounded by total samples per sample rate. Eviction only drops the cache's
// reference (a playing source keeps its buffer) and a re-render is bit-identical (seeded by its key), so the bound never
// changes the sound — it only costs a re-synthesis. 8 M samples = 32 MB of Float32 (≈ 167 s of mono string at 48 kHz);
// all of Act I needs 48 buffers ≈ 2.5 M samples / 9.5 MB (tools/audio-lab.js actChecks → ks), so an act never evicts.
const KS_CAP = 8e6;
function bufCache(sr) {
  let B = BUF_CACHE[sr];
  if (B) return B;
  B = BUF_CACHE[sr] = { ks: new Map(), ksSamples: 0, ksEvicted: 0, ksMade: 0, beds: {}, misc: {} };
  B.ir = toBuffer(makeIR(sr), sr);
  const len = sr * 4;
  const mk = gen => { const a = new Float32Array(len); for (let i = 0; i < len; i++) a[i] = gen(); return removeDC(a); };
  const r1 = mulberry32(101), r2 = mulberry32(202), r3 = mulberry32(303), r4 = mulberry32(404);
  B.white = toBuffer([mk(() => r1() * 2 - 1)], sr);
  B.pink = toBuffer([mk(pinkGen(r2))], sr);
  B.brown = toBuffer([mk(brownGen(r3))], sr);
  B.white2 = toBuffer([mk(() => r4() * 2 - 1), mk(() => r4() * 2 - 1)], sr); // decorrelated stereo
  return B;
}
function pulseWave(ctx, duty, nh) {
  const re = new Float32Array(nh + 1), im = new Float32Array(nh + 1);
  for (let n = 1; n <= nh; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(Math.PI * n * duty);
  return ctx.createPeriodicWave(re, im);
}
function additiveWave(ctx, amps) {
  const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1);
  amps.forEach((a, i) => { im[i + 1] = a; });
  return ctx.createPeriodicWave(re, im);
}
function driveCurve(k) { // tanh saturation, unity small-signal gain
  const N = 2049, c = new Float32Array(N), t = Math.tanh(k);
  for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / t; }
  return c;
}
function buildRes(ctx) {
  const B = bufCache(ctx.sampleRate);
  return {
    sr: ctx.sampleRate, B,
    w: {
      p12: pulseWave(ctx, 0.125, 48), p25: pulseWave(ctx, 0.25, 48), p50: pulseWave(ctx, 0.5, 48),
      soft: additiveWave(ctx, [1, 0.32, 0.12, 0.05, 0.02]),
      flute: additiveWave(ctx, [1, 0.2, 0.11, 0.045, 0.028, 0.012, 0.006]),
      reed: additiveWave(ctx, [1, 0.55, 0.62, 0.3, 0.33, 0.16, 0.12, 0.07, 0.05, 0.03]),
    },
    drive: driveCurve(2.2), drive2: driveCurve(4),
  };
}
function ksBuffer(R, midi, dur, t60, bright, o) {
  o = o || {};
  const key = midi.toFixed(2) + '|' + dur.toFixed(2) + '|' + t60.toFixed(2) + '|' + bright.toFixed(2) + '|' + (o.pick || 0) + '|' + (o.buzz || 0) + '|' + (o.buzzTh || 0) + '|' + (o.seed || 0);
  const B = R.B, K = B.ks;
  let b = K.get(key);
  if (b) { K.delete(key); K.set(key, b); return b; } // most recently used last
  b = toBuffer([ksRender(R.sr, mtof(midi), dur, t60, bright, hashStr(key), o)], R.sr);
  K.set(key, b); B.ksSamples += b.length; B.ksMade++;
  while (B.ksSamples > KS_CAP && K.size > 1) { const k0 = K.keys().next().value; B.ksSamples -= K.get(k0).length; K.delete(k0); B.ksEvicted++; }
  return b;
}
if (HT.caches) HT.caches.push({ name: 'audio.ks', size: () => Object.keys(BUF_CACHE).reduce((n, sr) => n + BUF_CACHE[sr].ks.size, 0) });

// ------------------------------------------------------------------------------------ timeline
// HT.timeline (src/main.js) entries {id, def, act, start, dur, cues, ambience, …} → normalized copies.
function getTimeline() {
  const src = Array.isArray(HT.timeline) ? HT.timeline : [];
  let acc = 0;
  return src.map(s => {
    const start = (typeof s.start === 'number' && isFinite(s.start)) ? s.start : acc;
    const dur = Math.max(0.5, +s.dur || 0);
    acc = start + dur;
    return { id: String(s.id), start, dur, cues: Array.isArray(s.cues) ? s.cues : [], ambience: Array.isArray(s.ambience) ? s.ambience : [] };
  });
}
const tlEnd = tl => tl.length ? Math.max(...tl.map(s => s.start + s.dur)) : 0;
function tlKey(tl) { return tl.map(s => s.id + ':' + s.start + ':' + s.dur + ':' + s.cues.length + ':' + s.ambience.length).join('|'); }

// ------------------------------------------------------------------------------------ automation
// pts = [[dt, value, mode], ...]  dt relative to t0; mode: 'l' linear (default) | 'e' exponential | 's' step.
// If the envelope began before `now` (a seek landed inside a long note) it is resumed: the value at `now` is computed;
// gain params fade in from 0 over STOP_FADE (click-free), other params jump there.
function envAt(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) {
    const p0 = pts[k - 1], p1 = pts[k];
    if (x < p1[0]) {
      if (p1[2] === 's') return p0[1];
      const u = (x - p0[0]) / Math.max(1e-9, p1[0] - p0[0]);
      if (p1[2] === 'e') { const a = Math.max(p0[1], 1e-5), b = Math.max(p1[1], 1e-5); return a * Math.pow(b / a, u); }
      return p0[1] + (p1[1] - p0[1]) * u;
    }
  }
  return pts[pts.length - 1][1];
}
function envSched(param, t0, pts, nowT, isGain) {
  let k;
  if (t0 + pts[0][0] >= nowT - 1e-6) { param.setValueAtTime(pts[0][1], Math.max(0, t0 + pts[0][0])); k = 1; }
  else {
    const x0 = nowT - t0, x1 = x0 + (isGain ? STOP_FADE : 0);
    if (isGain) { param.setValueAtTime(0, nowT); param.linearRampToValueAtTime(envAt(pts, x1), nowT + STOP_FADE); }
    else param.setValueAtTime(envAt(pts, x0), nowT);
    k = 0; while (k < pts.length && pts[k][0] <= x1 + 1e-6) k++;
  }
  for (; k < pts.length; k++) {
    const t = t0 + pts[k][0], v = pts[k][1], m = pts[k][2];
    if (m === 'e') param.exponentialRampToValueAtTime(Math.max(v, 1e-5), t);
    else if (m === 's') param.setValueAtTime(v, t);
    else param.linearRampToValueAtTime(v, t);
  }
  return param;
}
// Standard percussive / sustained amplitude envelopes (all start & end at exactly 0 → no clicks). ADSR always ends at
// dur + r: a note shorter than its attack releases from wherever the attack had got to (voice ends are computed from
// dur + r, so the envelope must never outlive them).
const ADSR = (a, d, s, dur, r, peak = 1) => {
  if (dur < a + 0.001) { const h = Math.max(0.002, dur); return [[0, 0], [h, peak * h / a], [h + r, 0]]; }
  const hold = dur;
  const pts = [[0, 0], [a, peak]];
  if (hold > a + d) { pts.push([a + d, peak * s]); pts.push([hold, peak * s]); }
  else pts.push([hold, peak * (1 - (1 - s) * (hold - a) / Math.max(1e-3, d))]);
  pts.push([hold + r, 0]);
  return pts;
};
const PERC = (a, t60, peak = 1) => [[0, 0], [a, peak], [a + t60, peak * 0.001, 'e'], [a + t60 + 0.01, 0]];

// ------------------------------------------------------------------------------------ voices
// A voice owns the nodes of one note/SFX; sources start at max(t, now) and stop at `end` (≥ its true audible end:
// finished voices are disconnected by Session.sweep()).
function Voice(S, t, end) {
  this.S = S; this.ctx = S.ctx; this.t = t; this.end = end; this.now = S.now;
  this.nodes = []; this.srcs = [];
  S.voices.push(this);
}
Voice.prototype = {
  n(x) { this.nodes.push(x); return x; },
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return this.n(g); },
  osc(type, f, det) {
    const o = this.ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = clamp(f, 1, 22000); if (det) o.detune.value = det;
    this.srcs.push(o); return this.n(o);
  },
  filt(type, f, q = 0.707, gdb) {
    const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = clamp(f, 5, 20000); b.Q.value = q;
    if (gdb !== undefined) b.gain.value = gdb; return this.n(b);
  },
  pan(p) { const s = this.ctx.createStereoPanner(); s.pan.value = clamp(p || 0, -1, 1); return this.n(s); },
  shaper(curve) { const w = this.ctx.createWaveShaper(); w.curve = curve; w.oversample = 'none'; return this.n(w); },
  buf(buffer, loop, rate) {
    const s = this.ctx.createBufferSource(); s.buffer = buffer; s.loop = !!loop;
    if (rate) s.playbackRate.value = rate; this.srcs.push(s); return this.n(s);
  },
  noise(kind, off) { const s = this.buf(this.S.R.B[kind || 'white'], true); s._off = off || 0; return s; },
  lfo(rate, depth, target, type) { // oscillator -> gain(depth) -> AudioParam
    const o = this.osc(type || 'sine', rate), g = this.gain(depth); o.connect(g); g.connect(target); return g;
  },
  env(param, pts, isGain = true, t0 = this.t) { return envSched(param, t0, pts, this.now, isGain); },
  at(src, t, e) { src._t = t; if (e !== undefined) src._e = e; return src; },
  go() {
    const sr = this.ctx.sampleRate;
    for (const s of this.srcs) {
      const t = s._t !== undefined ? s._t : this.t, e = s._e !== undefined ? s._e : this.end;
      if (e <= this.now + 0.002) { s._dead = true; continue; }
      let st;
      if (s instanceof AudioBufferSourceNode) {
        // A buffer resumed after a seek / at a chunk start restarts a whole number of samples after its nominal start,
        // so its sub-sample phase (and the buffer position at every output frame) equals an uninterrupted run.
        const d = s.buffer.duration, rate = s.playbackRate.value || 1;
        let off = s._off || 0;
        st = t;
        if (t < this.now) { const k = Math.ceil((this.now - t) * sr - 1e-6); st = t + k / sr; off += (k / sr) * rate; }
        if (s.loop) off = off % d; else if (off >= d) { s._dead = true; continue; }
        s.start(st, off);
      } else { st = Math.max(t, this.now); s.start(st); }
      s.stop(Math.max(st + 0.005, e));
    }
  },
  kill() { for (const x of this.nodes) { try { x.disconnect(); } catch (e) { /* already gone */ } } this.nodes = []; this.srcs = []; },
};

// ------------------------------------------------------------------------------------ master chain
function softClipCurve() { // identity below 0.84, tanh knee above, hard ceiling 0.8898 (≈ -1.01 dBFS)
  const N = 8193, c = new Float32Array(N), k = 0.84, h = 0.05;
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1)) * 2 - 1, ax = Math.abs(x);
    c[i] = Math.sign(x) * (ax <= k ? ax : k + h * Math.tanh((ax - k) / h));
  }
  return c;
}
// Global mix constants (calibrated with tools/audio-lab.html).
const MIX = { master: 1.0, glueTrim: 0.806, trim: 0.93, music: 0.85, sfx: 0.8, amb: 0.75, rev: 1.0 };
function makeEngine(ctx, o) {
  o = o || {};
  const R = buildRes(ctx);
  const inp = ctx.createGain(), vol = ctx.createGain();
  if (o.raw) { inp.connect(vol); vol.connect(ctx.destination); return { ctx, R, input: inp, vol }; }
  // DynamicsCompressorNode applies automatic makeup gain ((1/full-range gain)^0.6, Web Audio spec), so each
  // compressor is followed by a fixed trim that cancels it: unity gain for material below the knees.
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -14; glue.knee.value = 12; glue.ratio.value = 1.7; glue.attack.value = 0.02; glue.release.value = 0.25;
  const gtrim = ctx.createGain(); gtrim.gain.value = MIX.glueTrim;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const trim = ctx.createGain(); trim.gain.value = MIX.trim;
  const clip = ctx.createWaveShaper(); clip.curve = softClipCurve(); clip.oversample = 'none';
  inp.gain.value = MIX.master;
  const hpf = ctx.createBiquadFilter(); hpf.type = 'highpass'; hpf.frequency.value = 28; hpf.Q.value = 0.6; // subsonic cleanup
  inp.connect(hpf); hpf.connect(glue); glue.connect(gtrim); gtrim.connect(lim); lim.connect(trim); trim.connect(clip); clip.connect(vol); vol.connect(ctx.destination);
  return { ctx, R, input: inp, vol, glue, lim };
}

// Channel strips: [level, reverb send, delay send]. inst.js registers one per instrument group (AU.strips()).
const STRIP = {};

// ------------------------------------------------------------------------------------ offline master (JS)
// Offline renders (export) are mastered here instead of by the DynamicsCompressorNodes of the realtime chain: Chrome
// sums node inputs in an order that varies from run to run (float rounding ~1e-7), and its compressor's attack/release
// logic (max-attack memory, branch flips) amplifies that to ~1e-4 — two identical renders then differ at −76 dBFS.
// This master is a smooth, deterministic function of its input, so renders are reproducible to the summation noise
// (~−100 dBFS) and a chunked export glues seamlessly (one instance runs across all chunks). Same settings as the node
// chain: subsonic high-pass 28 Hz → glue compressor (−14 dBFS, 1.7:1, 12 dB soft knee, attack 20 ms / release 250 ms,
// stereo-linked peak detector, no makeup) → look-ahead limiter on an 8×-oversampled true-peak estimate (32-tap
// Hann-windowed sinc, phases k/8; ceiling 0.84 ≈ −1.5 dBTP, 5 ms look-ahead, 80 ms release) → the same soft-clip curve
// (never reached after the limiter). The detector was 4× / 16 taps until M2: on sharp transients stacked on a loud
// chord (a2_blossom's barrier crack over a string sforzando) it read ~0.4 dB under the peak between its phases, and the
// output measured −1.12 dBTP (8×) / −1.26 dBTP (4×, BS.1770); now the ceiling holds under both estimates.
// Latency (look-ahead + interpolator) is compensated by the callers, so output sample i is input sample i.
const TP_CEIL = 0.84, SOFT_K = 0.84, SOFT_H = 0.05;
function Master(sr) {
  this.sr = sr;
  this.hp = [new BQ('hp', 28, 0.6, sr), new BQ('hp', 28, 0.6, sr)];
  this.env = 0; this.aA = 1 - Math.exp(-1 / (0.02 * sr)); this.aR = 1 - Math.exp(-1 / (0.25 * sr));
  this.gg = 1; this.gg1 = 1; this.gk = 0; this.GD = 16; // glue gain: computed every GD samples, interpolated
  this.K = 16; this.LA = Math.round(0.005 * sr); this.lat = this.K + this.LA;
  let N = 1; while (N < this.lat + this.K + 4) N <<= 1;
  this.N = N; this.dl = [new Float32Array(N), new Float32Array(N)]; this.w = 0;
  const W = this.LA + 1; this.W = W;
  this.mq = new Float64Array(W * 2 + 4); this.mi = new Int32Array(W * 2 + 4); this.qh = 0; this.qt = 0; this.step = 0; // sliding-min deque
  this.box = new Float64Array(W); this.bsum = W; this.bi = 0; this.box.fill(1);
  this.gl = 1; this.aRel = 1 - Math.exp(-1 / (0.08 * sr));
  this.ker = [1, 2, 3, 4, 5, 6, 7].map(q => { const ph = q / 8, h = new Float64Array(2 * this.K); for (let k = -this.K + 1, j = 0; k <= this.K; k++, j++) { const x = ph - k, w = 0.5 + 0.5 * Math.cos(Math.PI * x / this.K); h[j] = x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w; } return h; });
  this.taps = new Float64Array(2 * this.K);
}
Master.prototype.glueGain = function () { // static curve (dB), soft knee
  const Ldb = 20 * Math.log10(this.env + 1e-12), T = -14, Wk = 12, R = 1.7;
  let g = 0;
  if (Ldb >= T + Wk / 2) g = (T + (Ldb - T) / R) - Ldb;
  else if (Ldb > T - Wk / 2) { const x = Ldb - T + Wk / 2; g = (1 / R - 1) * x * x / (2 * Wk); }
  return Math.pow(10, g / 20);
};
// process n samples in place: in → out (out lags in by this.lat samples)
Master.prototype.process = function (L, R, n) {
  const hp0 = this.hp[0], hp1 = this.hp[1], dl0 = this.dl[0], dl1 = this.dl[1], N = this.N, M = N - 1, K = this.K, LA = this.LA, W = this.W;
  const ker = this.ker, NP = ker.length, taps = this.taps, NT = 2 * K, thr = TP_CEIL * 0.5;
  for (let i = 0; i < n; i++) {
    let l = hp0.run(L[i]), r = hp1.run(R[i]);
    // glue compressor
    const lev = Math.max(Math.abs(l), Math.abs(r));
    this.env += (lev - this.env) * (lev > this.env ? this.aA : this.aR);
    if (this.gk === 0) { this.gg0 = this.gg1; this.gg1 = this.env > 0.0501 ? this.glueGain() : 1; } // below −26 dBFS the curve is flat
    const g = this.gg0 + (this.gg1 - this.gg0) * (this.gk / this.GD);
    if (++this.gk >= this.GD) this.gk = 0;
    l *= g; r *= g;
    // look-ahead true-peak limiter
    const w = this.w; dl0[w] = l; dl1[w] = r; this.w = (w + 1) & M;
    const p = (w - K) & M;                               // the sample whose true peak is known now (needs K future taps)
    let tp = Math.max(Math.abs(dl0[p]), Math.abs(dl1[p]));
    const pn = Math.max(Math.abs(dl0[(p + 1) & M]), Math.abs(dl1[(p + 1) & M]));
    if (tp > thr || pn > thr) {
      for (let c = 0; c < 2; c++) {
        const d = c ? dl1 : dl0;
        for (let k = -K + 1, j = 0; k <= K; k++, j++) taps[j] = d[(p + k) & M];
        for (let qq = 0; qq < NP; qq++) { const h = ker[qq]; let s = 0; for (let j = 0; j < NT; j++) s += taps[j] * h[j]; if (s > tp) tp = s; else if (-s > tp) tp = -s; }
      }
    }
    const req = tp > TP_CEIL ? TP_CEIL / tp : 1;
    // sliding minimum of req over the last W steps (monotonic deque)
    const st = this.step++, cap = this.mq.length;
    while (this.qt !== this.qh && this.mq[(this.qt - 1 + cap) % cap] >= req) this.qt = (this.qt - 1 + cap) % cap;
    this.mq[this.qt] = req; this.mi[this.qt] = st; this.qt = (this.qt + 1) % cap;
    while (this.mi[this.qh] <= st - W) this.qh = (this.qh + 1) % cap;
    const m = this.mq[this.qh];
    // box-average the minimum over W steps (smooth attack that still reaches the required gain in time), then release
    this.bsum += m - this.box[this.bi]; this.box[this.bi] = m; this.bi = (this.bi + 1) % W;
    const y = Math.min(1, this.bsum / W);
    this.gl = y < this.gl ? y : this.gl + (y - this.gl) * this.aRel;
    const q = (p - LA) & M;
    let ol = dl0[q] * this.gl, or = dl1[q] * this.gl;
    if (ol > SOFT_K || ol < -SOFT_K) ol = Math.sign(ol) * (SOFT_K + SOFT_H * Math.tanh((Math.abs(ol) - SOFT_K) / SOFT_H));
    if (or > SOFT_K || or < -SOFT_K) or = Math.sign(or) * (SOFT_K + SOFT_H * Math.tanh((Math.abs(or) - SOFT_K) / SOFT_H));
    L[i] = ol; R[i] = or;
  }
};

// ------------------------------------------------------------------------------------ instruments (registry)
// fn(S, e, a, dest): e = {t, i, m (midi), d (s), v (0..1.5), o (options), cue}, a = audio start (may be < S.now when
// resumed), dest = channel-strip input. Every amplitude path starts and ends at 0.
// spec: { strip, ring: seconds | (m, d, o) => seconds (audible tail beyond the written length d, conservative),
//         res: true | (o) => bool (voice made only of buffers + LTI filters → exactly resumable at a chunk seam) }
const INST = {};
function def(name, spec, fn) { INST[name] = { strip: spec.strip || name, ring: spec.ring == null ? 0.1 : spec.ring, res: spec.res || false, fn }; }
function ringOf(i, m, d, o) { const I = INST[i]; if (!I) return 0.1; return typeof I.ring === 'function' ? I.ring(m, d, o || {}) : I.ring; }
function resOf(i, o) { const I = INST[i]; if (!I) return false; return typeof I.res === 'function' ? !!I.res(o || {}) : !!I.res; }

// ------------------------------------------------------------------------------------ SFX (registry)
// SFX_DEF[name] = { fn(v, out, p, rng, h, len, pre), len (s at pitch 1), pre (pre-roll before the sync point),
//   preDur (cue `dur` sets the pre-roll), var (cue `dur` sets len), duck: [dB, hold s | 'dur'], rev (reverb send),
//   gain, tail, cut: {at: s | 'len', hold, fade} (whole-mix silence after the sound) }.
// h = hit time (= start + pre); p.pitch scales frequencies (and the nominal times of fixed-length sounds).
const SFX_DEF = {};
function sfx(name, len, opt, fn) {
  SFX_DEF[name] = Object.assign({ len, fn }, opt);
  const D = SFX_DEF[name];
  A.SFX[name] = { len: D.len, pre: D.pre || 0, preDur: !!D.preDur, var: !!D.var, duck: D.duck || null, play: p => A.playSfx(name, p) };
}
const sfxPre = (D, p) => (D.preDur && p.dur != null ? p.dur : (D.pre || 0) / p.pitch);
const sfxLen = (D, p) => (D.var && p.dur != null ? p.dur : D.len / p.pitch);
const sfxTail = D => (D.tail != null ? D.tail : 0.4);
function normP(c) {
  c = c || {};
  const p = { vol: c.vol == null ? 1 : clamp(+c.vol || 0, 0, 2), pan: clamp(+c.pan || 0, -1, 1), pitch: clamp(c.pitch == null ? 1 : (+c.pitch || 1), 0.25, 4) };
  p.panTo = c.panTo == null ? p.pan : clamp(+c.panTo || 0, -1, 1);
  if (c.dur != null && isFinite(+c.dur) && +c.dur > 0) p.dur = Math.max(0.05, +c.dur);
  if (c.seed != null) p.seed = +c.seed || 0;
  if (c.lp != null && isFinite(+c.lp) && +c.lp > 0) p.lp = clamp(+c.lp, 40, 20000); // distance: low-pass (Hz)
  if (c.wet != null && isFinite(+c.wet)) p.wet = clamp(+c.wet, 0, 4);                // reverb send multiplier
  return p;
}
// tg = global (film) time of the event: it seeds the variation, so every render of the film is identical.
function sfxAt(S, name, p, a, tg) {
  const D = SFX_DEF[name];
  if (!D) { warnOnce('unknown sfx "' + name + '"'); return 0; }
  p = normP(p);
  const pre = sfxPre(D, p), len = sfxLen(D, p), total = pre + len + sfxTail(D);
  const v = new Voice(S, a, a + total);
  const out = v.gain(p.vol * (D.gain || 1)), pn = v.pan(p.pan);
  let head = out;
  if (p.lp) { const f1 = v.filt('lowpass', p.lp, 0.5412), f2 = v.filt('lowpass', p.lp, 1.3066); out.connect(f1); f1.connect(f2); head = f2; } // 4th-order Butterworth
  head.connect(pn); pn.connect(S.sBus);
  if (D.rev || p.wet) { const sg = v.gain((D.rev || 0.2) * (p.wet == null ? 1 : p.wet)); pn.connect(sg); sg.connect(S.sRev); }
  if (p.panTo !== p.pan) v.env(pn.pan, [[0, p.pan], [pre + len, p.panTo]], false);
  const rng = mulberry32(hashStr(name) ^ (p.seed != null ? p.seed : Math.round((tg != null ? tg : a) * 997)));
  D.fn(v, out, p, rng, a + pre, len, pre);
  v.go();
  return total;
}

// ------------------------------------------------------------------------------------ session
// tl = timeline (or null for an SFX-only session), from = global start time, a0 = audio time of `from`.
function Session(eng, tl, from, a0, o) {
  o = o || {};
  const ctx = this.ctx = eng.ctx; this.R = eng.R; this.eng = eng; this.o = o;
  this.from = from; this.a0 = a0; this.now = Math.max(ctx.currentTime, a0 - 0.2);
  this.voices = []; this.strips = {}; this.cueB = {}; this.bus = [];
  this.stems = o.stems ? new Set(o.stems) : null;
  const G = this.G = v => { const g = ctx.createGain(); g.gain.value = v; this.bus.push(g); return g; };
  this.out = G(0); this.out.connect(eng.input);
  const tf = Math.max(ctx.currentTime, a0 - 0.05);
  this.out.gain.setValueAtTime(0, tf);
  this.out.gain.linearRampToValueAtTime(1, tf + STOP_FADE);
  this.cut = G(1); this.cut.connect(this.out);
  const verb = () => { const c = ctx.createConvolver(); c.buffer = this.R.B.ir; this.bus.push(c); return c; };
  // music: cue strips -> cue bus -> mPre (+ reverb & ping-pong delay returns) -> duck -> gate -> lvl -> mOut -> cut
  this.mPre = G(1); this.duck = G(1); this.gate = G(1); this.lvl = G(1); this.mOut = G(MIX.music);
  this.mPre.connect(this.duck); this.duck.connect(this.gate); this.gate.connect(this.lvl); this.lvl.connect(this.mOut); this.mOut.connect(this.cut);
  this.mRev = G(o.dry ? 0 : MIX.rev); const mc = verb(); this.mRev.connect(mc); mc.connect(this.mPre);
  this.mDly = G(o.dry ? 0 : 1);
  this.mDly.channelCount = 1; this.mDly.channelCountMode = 'explicit';
  const dL = ctx.createDelay(1.5), dR = ctx.createDelay(1.5), lp = ctx.createBiquadFilter(), fb = G(0.36), mg = ctx.createChannelMerger(2), dret = G(0.8);
  this.bus.push(dL, dR, lp, mg);
  dL.delayTime.value = dR.delayTime.value = 0.75 * BEAT; lp.type = 'lowpass'; lp.frequency.value = 2600;
  this.mDly.connect(dL); dL.connect(dR); dR.connect(lp); lp.connect(fb); fb.connect(dL);
  dL.connect(mg, 0, 0); dR.connect(mg, 0, 1); mg.connect(dret); dret.connect(this.mPre);
  // sfx: voices -> sBus -> cut, send -> sRev (same impulse, own convolver so music tails can be gated separately)
  this.sBus = G(MIX.sfx); this.sBus.connect(this.cut);
  this.sRev = G(o.dry ? 0 : MIX.rev); const sc = verb(); this.sRev.connect(sc); sc.connect(this.sBus);
  // ambience
  this.aBus = G(MIX.amb); this.aBus.connect(this.cut);
  this.params = { duck: this.duck.gain, gate: this.gate.gain, lvl: this.lvl.gain, out: this.out.gain, mus: this.mOut.gain, sfx: this.sBus.gain, amb: this.aBus.gain, cut: this.cut.gain };
  this.ev = []; this.i = 0;
  if (tl) {
    this.ev = o.ev || buildEvents(tl, o);
    let lo = 0, hi = this.ev.length; // first event at/after `from`
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.ev[m].t < from - 1e-6) lo = m + 1; else hi = m; }
    this.i = lo;
    // state before `from`: bus automation → its value at `from` (an active linear ramp continues), long notes / beds /
    // long SFX resumed (buffers phase-exact, see Voice.go)
    this.now = Math.max(a0, ctx.currentTime);
    const last = {};
    for (let k = 0; k < lo; k++) {
      const e = this.ev[k];
      if (e.k === 'g') last[e.p === 'cue' ? 'cue:' + e.cue : e.p] = e;
      else if (e.t + (e.len || 0) > from + 0.12 && (e.k === 'a' || e.k === 'x' || (e.k === 'n' && e.len >= 0.6))) this.fire(e);
    }
    for (const key in last) this.applyNow(last[key], from);
  }
}
Session.prototype = {
  aT(t) { return this.a0 + (t - this.from); },
  cueBus(id, v0) {
    let b = this.cueB[id];
    if (b) return b;
    const v = v0 == null ? 1 : v0;
    b = this.cueB[id] = { dry: this.G(v), rev: this.G(v), dly: this.G(v) };
    b.dry.connect(this.mPre); b.rev.connect(this.mRev); b.dly.connect(this.mDly);
    return b;
  },
  strip(name, cue) {
    const key = (cue || '_') + '|' + name;
    let s = this.strips[key];
    if (s) return s;
    const cfg = STRIP[name] || [0.3, 0.2, 0], b = this.cueBus(cue || '_');
    const inp = this.G(cfg[0]); inp.connect(b.dry);
    if (cfg[1] > 0) { const g = this.G(cfg[1]); inp.connect(g); g.connect(b.rev); }
    if (cfg[2] > 0) { const g = this.G(cfg[2]); inp.connect(g); g.connect(b.dly); }
    return (this.strips[key] = { in: inp });
  },
  paramsOf(e) {
    if (e.p === 'cue') { const b = this.cueBus(e.cue, e.lin !== undefined ? e.v0 : e.v); return [b.dry.gain, b.rev.gain, b.dly.gain]; }
    const p = this.params[e.p];
    return p ? [p] : null;
  },
  applyNow(e, from) { // the state of one automation event as seen at `from` (seek / chunk start)
    const P = this.paramsOf(e);
    if (!P) return;
    if (e.lin !== undefined && from < e.lin) {
      const u = clamp((from - e.t) / Math.max(1e-9, e.lin - e.t), 0, 1), cur = e.v0 + (e.v - e.v0) * u;
      for (const p of P) { p.setValueAtTime(cur, this.now); p.linearRampToValueAtTime(e.v, this.aT(e.lin)); }
    } else for (const p of P) p.setValueAtTime(e.v, this.now);
  },
  fire(e) {
    const a = this.aT(e.t);
    try {
      if (e.k === 'n') {
        const I = INST[e.i];
        if (!I) return warnOnce('unknown instrument ' + e.i);
        if (this.stems && !this.stems.has(I.strip)) return;
        I.fn(this, e, a, this.strip(I.strip, e.cue).in);
      } else if (e.k === 'x') { if (!this.stems) sfxAt(this, e.name, e.p, a, e.t); }
      else if (e.k === 'a') { if (!this.stems && AU.bedAt) AU.bedAt(this, e, a); }
      else if (e.k === 'g') {
        const P = this.paramsOf(e);
        if (!P) return;
        const t = Math.max(a, this.now);
        for (const p of P) {
          if (e.lin !== undefined) { p.setValueAtTime(e.v0, t); p.linearRampToValueAtTime(e.v, Math.max(t + 0.01, this.aT(e.lin))); }
          else p.setTargetAtTime(e.v, t, e.tau || 0.02);
        }
      }
    } catch (err) { warnOnce('event failed: ' + (e.i || e.name || e.p) + ' ' + err.message); }
  },
  pump(horizon) {
    const ev = this.ev;
    while (this.i < ev.length && this.aT(ev[this.i].t) < horizon) this.fire(ev[this.i++]);
  },
  sweep(nowT) {
    if (!this.voices.length) return;
    const keep = [];
    for (const v of this.voices) { if (v.end + 0.15 < nowT) v.kill(); else keep.push(v); }
    this.voices = keep;
  },
  stop() { // click-free: fade the whole session output, then stop & disconnect everything
    const ctx = this.ctx, t = ctx.currentTime, g = this.out.gain;
    try {
      if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
      g.linearRampToValueAtTime(0, t + STOP_FADE);
    } catch (e) { /* ignore */ }
    const st = t + STOP_FADE + 0.02;
    for (const v of this.voices) for (const s of v.srcs) { if (!s._dead) { try { s.stop(st); } catch (e) { /* not started */ } } }
    this.ev = []; this.i = 0;
    const voices = this.voices, bus = this.bus; this.voices = [];
    setTimeout(() => { voices.forEach(v => v.kill()); bus.forEach(b => { try { b.disconnect(); } catch (e) { /* */ } }); }, 200);
  },
};

// ------------------------------------------------------------------------------------ event list
function ambNames() { return AU.BED ? Object.keys(AU.BED) : []; }
function buildAmbience(tl, ev) { // per-bed piecewise-linear level tracks → audible segments
  const XF = 1.6, end = tlEnd(tl), tr = {}, cur = {}, AMB = ambNames();
  AMB.forEach(n => { tr[n] = []; cur[n] = 0; });
  const put = (n, t, v) => { const a = tr[n]; if (a.length && t < a[a.length - 1][0]) t = a[a.length - 1][0]; a.push([t, v]); };
  tl.forEach((sec, i) => {
    const tgt = {}; AMB.forEach(n => { tgt[n] = 0; });
    sec.ambience.forEach(a => { if (a && a.name in tgt) tgt[a.name] = clamp(a.vol == null ? 0.5 : +a.vol || 0, 0, 1.5); else if (a) warnOnce('unknown ambience "' + a.name + '"'); });
    const xa = i === 0 ? sec.start : sec.start - XF / 2, xb = i === 0 ? sec.start + 2.5 : sec.start + XF / 2;
    AMB.forEach(n => { if (tgt[n] !== cur[n]) { put(n, xa, cur[n]); put(n, xb, tgt[n]); cur[n] = tgt[n]; } });
    sec.cues.filter(c => c && c.amb && typeof c.t === 'number').sort((a, b) => a.t - b.t).forEach(c => {
      const n = c.amb; if (!(n in cur)) return warnOnce('unknown ambience "' + n + '"');
      const v = clamp(c.vol == null ? 0.5 : +c.vol || 0, 0, 1.5), f = Math.max(0.05, c.fade == null ? 1 : +c.fade), t = Math.max(sec.start + c.t, xb);
      put(n, t, cur[n]); put(n, t + f, v); cur[n] = v;
    });
  });
  AMB.forEach(n => { if (cur[n] > 0) { put(n, end - 3, cur[n]); put(n, end - 0.1, 0); } });
  AMB.forEach(n => {
    let seg = null, prev = null;
    const emit = s => { const t0 = s[0][0]; ev.push({ t: t0, k: 'a', name: n, len: s[s.length - 1][0] - t0, pts: s.map(([t, v]) => [t - t0, v]) }); };
    for (const p of tr[n]) {
      if (!seg) { if (p[1] > 0) seg = [[prev ? prev[0] : p[0], 0], p]; }
      else { seg.push(p); if (p[1] <= 0) { emit(seg); seg = null; } }
      prev = p;
    }
    if (seg) { seg.push([seg[seg.length - 1][0] + 0.1, 0]); emit(seg); }
  });
}
function buildEvents(tl, o) {
  o = o || {};
  const ev = [], ducks = [], cuts = [];
  if (o.music !== false && AU.composeScore) AU.composeScore(tl, ev, o);
  // The same sound requested twice at the same instant (e.g. a script cue + an FX library default) plays once, at the
  // louder volume: two identical seeded voices would just add +6 dB.
  const uniq = new Map();
  tl.forEach(sec => sec.cues.forEach(c => {
    if (!c || typeof c.t !== 'number' || !c.sfx) return;
    const key = c.sfx + '|' + Math.round((sec.start + c.t) * 1000), prev = uniq.get(key);
    if (!prev || (c.vol == null ? 1 : +c.vol) > (prev.c.vol == null ? 1 : +prev.c.vol)) uniq.set(key, { sec, c });
  }));
  [...uniq.values()].forEach(({ sec, c }) => {
    const D = SFX_DEF[c.sfx];
    if (!D) return warnOnce('unknown sfx "' + c.sfx + '" in ' + sec.id);
    const p = normP(c), t = sec.start + c.t, pre = sfxPre(D, p), len = sfxLen(D, p);
    if (o.sfx !== false) ev.push({ t: t - pre, k: 'x', name: c.sfx, p, len: pre + len + sfxTail(D), sec: sec.id });
    if (D.duck && p.vol > 0.15 && D.duck[0] > 0) ducks.push([t - 0.03, t + (D.duck[1] === 'dur' ? len : D.duck[1]), D.duck[0] * Math.min(1, p.vol)]);
    if (D.cut) cuts.push([t + (D.cut.at === 'len' ? len : D.cut.at), D.cut.hold, D.cut.fade || 0.8]);
  });
  if (o.amb !== false) buildAmbience(tl, ev);
  // Duck envelope = the deepest ACTIVE duck at each instant (a light duck overlapping a later heavy one keeps its own
  // depth until the heavy one starts, and the envelope steps back to what is still active when the heavy one ends).
  // A duck followed by another within 0.25 s is held until it (no release/attack pumping between rapid hits).
  ducks.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < ducks.length; i++) for (let j = i + 1; j < ducks.length; j++) {
    if (ducks[j][0] > ducks[i][1] + 0.25) break;
    if (ducks[j][0] > ducks[i][1]) ducks[i][1] = ducks[j][0];
  }
  if (!o.noDuck && ducks.length) {
    const times = [...new Set(ducks.flatMap(d => [d[0], d[1]]))].sort((a, b) => a - b);
    let cur = 0;
    for (const t of times) {
      let dep = 0;
      for (const d of ducks) if (d[0] <= t + 1e-9 && d[1] > t + 1e-9 && d[2] > dep) dep = d[2];
      if (Math.abs(dep - cur) > 0.05) { ev.push({ t, k: 'g', p: 'duck', v: dbg(-dep), tau: dep > cur ? 0.03 : 0.25 }); cur = dep; }
    }
  }
  if (!o.noCut) cuts.forEach(([t0, hold, fade]) => { ev.push({ t: t0, k: 'g', p: 'cut', v: 0, tau: 0.003 }); ev.push({ t: t0 + hold, k: 'g', p: 'cut', v0: 0, v: 1, lin: t0 + hold + fade }); });
  const end = tlEnd(tl);
  if (end > 3) ev.push({ t: end - 2.2, k: 'g', p: 'out', v0: 1, v: 0, lin: end - 0.05 });
  const KO = { g: 0, a: 1, n: 2, x: 3 };
  ev.sort((a, b) => a.t - b.t || KO[a.k] - KO[b.k]);
  return ev;
}
let _evCache = null; // realtime playback: the event list of an unchanged timeline is reused across play/seek
function cachedEvents(tl) {
  const key = tlKey(tl) + '#' + (AU.MUSIC ? AU.MUSIC.version : 0);
  if (_evCache && _evCache.key === key) return _evCache.ev;
  const ev = buildEvents(tl, {});
  _evCache = { key, ev };
  return ev;
}

// ------------------------------------------------------------------------------------ offline rendering
// Render the raw (pre-master) mix of global samples [F, F + N) in an OfflineAudioContext. Global time t is scheduled
// at context time (t − F/sr) + 0.25/sr: the quarter-sample offset keeps every event that lies on the sample grid (all
// beat-grid music) away from rounding boundaries, so a chunk and a continuous render place each source on the same
// frame. The master (JS, above) is applied by the callers.
function renderRaw(tl, ev, F, N, sr, o) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: N, sampleRate: sr });
  const eng = makeEngine(ctx, { raw: true });
  const from = F / sr, dur = N / sr;
  if (AU.prepBeds) AU.prepBeds(eng.R, tl, from, dur + 1);
  if (AU.prepEvents) AU.prepEvents(eng.R, ev, from - 60, from + dur + 1);
  const S = new Session(eng, tl, from, 0.25 / sr, Object.assign({}, o, { ev }));
  const WIN = 1;
  const pumpTo = at => { S.now = at; S.pump(at + WIN + 0.35); S.sweep(at); };
  if (typeof ctx.suspend !== 'function') { S.now = 0; S.pump(Infinity); return ctx.startRendering(); } // no suspend(): schedule all at once
  pumpTo(0);
  const chain = at => { const nx = at + WIN; if (nx < dur - 0.01) ctx.suspend(nx).then(() => { pumpTo(nx); chain(nx); ctx.resume(); }); };
  chain(0);
  return ctx.startRendering();
}
// Chunk seams. A chunk render starts at F < c0 (the seam) and everything already sounding at F is resumed there.
// Buffers (beds, Karplus-Strong strings, pre-rendered bells) resume sample-exactly (Voice.go); oscillator voices do
// not (their phase at F is unknown), and neither do the reverb/delay memories. So the pre-roll P is chosen per seam
// such that every oscillator-bearing event whose sound (+ SEAM_TAIL of reverb/delay decay) reaches the seam starts
// inside the chunk render, i.e. is rendered from its own start exactly as in the continuous render; P ≥ PRE_MIN lets
// automation (set-target ramps) converge. F is a multiple of the 128-frame render quantum so k-rate parameters see the
// same frame grid. The JS master runs once across all chunks (pre-rolled on the first), so it has no seams at all.
function needPre(ev, c0, minPre) {
  let P = minPre;
  for (const e of ev) {
    if (e.t >= c0) break;
    if (e.k === 'x' || (e.k === 'n' && !e.res)) { if (e.t + (e.len || 0) + SEAM_TAIL > c0) P = Math.max(P, c0 - e.t + 0.1); }
  }
  return P;
}

// ------------------------------------------------------------------------------------ public API
const A = HT.audio = HT.audio || {};
A.SFX = A.SFX || {};
let _ctx = null, _eng = null, _ses = null, _fx = null, _timer = 0, _from = 0, _a0 = 0, _paused = 0, _last = 0, _total = 0;
let _sAt = 0, _stalled = false, _sT = 0, _sW = 0; // wall-clock fallback while the AudioContext is not running
function applyVol(instant) {
  if (!_eng) return;
  const g = A.muted ? 0 : A.volume * A.volume, p = _eng.vol.gain;
  if (instant) p.value = g; else p.setTargetAtTime(g, _ctx.currentTime, 0.015);
}
function tick() {
  if (!_ses || !_ctx) return;
  if (_stalled && _ctx.state === 'running') { A.play(_last); return; } // audio came (back): re-sync to the picture
  const t = _ctx.currentTime;
  _ses.now = t + 0.005;
  _ses.pump(t + (typeof document !== 'undefined' && document.hidden ? 1.2 : LOOKAHEAD));
  _ses.sweep(t);
  if (A.playing && A.now() >= _total) { A.pause(); _paused = _total; }
}
Object.defineProperty(A, 'AMB', { get: ambNames, enumerable: true, configurable: true }); // bed names (beds.js)
Object.assign(A, {
  playing: false, volume: 1, muted: false, ctx: null, BPM,
  init() {
    if (!_ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { warnOnce('Web Audio API not available'); return null; }
      _ctx = A.ctx = new AC({ latencyHint: 'playback' });
      _eng = makeEngine(_ctx); applyVol(true);
      if (AU.warmIdle) AU.warmIdle(_eng.R, getTimeline(), () => cachedEvents(getTimeline()));
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  },
  play(fromTime) {
    if (!A.init()) return;
    const tl = getTimeline(); _total = tlEnd(tl);
    const from = clamp(fromTime == null ? _paused : (+fromTime || 0), 0, _total); // no argument = resume where paused/seeked
    if (_ses) { _ses.stop(); _ses = null; }
    const ev = cachedEvents(tl);
    if (AU.prepBeds) AU.prepBeds(_eng.R, tl, from, 6);
    if (AU.prepEvents) AU.prepEvents(_eng.R, ev, from - 60, from + 6);
    const a0 = _ctx.currentTime + 0.12;
    _ses = new Session(_eng, tl, from, a0, { ev });
    _from = from; _a0 = a0; _last = from; _paused = from; _sAt = 0; _stalled = false; A.playing = true;
    clearInterval(_timer); _timer = setInterval(tick, TICK_MS); tick();
  },
  pause() {
    if (!A.playing) return;
    _paused = A.now(); A.playing = false;
    clearInterval(_timer); _timer = 0;
    if (_ses) { _ses.stop(); _ses = null; }
  },
  seek(time) {
    _total = tlEnd(getTimeline());
    const t = clamp(+time || 0, 0, _total);
    if (A.playing) A.play(t); else { _paused = t; _last = t; }
  },
  setMuted(b) { A.muted = !!b; applyVol(); },
  setVolume(v) { A.volume = clamp(+v || 0, 0, 1); applyVol(); },
  now() { // global film time of what is audible right now (master clock for the visuals)
    if (!A.playing || !_ctx) return _paused;
    if (_ctx.state !== 'running') { // audio not running (blocked / suspended / device lost): after a 0.6 s grace
      const w = now();               // period keep the film moving on the wall clock; tick() re-syncs once it runs
      if (!_sAt) _sAt = w;
      if (!_stalled && w - _sAt > 600) { _stalled = true; _sT = _last; _sW = w; }
      if (_stalled) _last = Math.min(_total, _sT + (w - _sW) / 1000);
      return _last;
    }
    _sAt = 0;
    let ct = _ctx.currentTime;
    const ts = _ctx.getOutputTimestamp ? _ctx.getOutputTimestamp() : null;
    const lat = _ctx.outputLatency || _ctx.baseLatency || 0;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0) {
      const c = ts.contextTime + Math.max(0, now() - ts.performanceTime) / 1000;
      ct = Math.abs(c - ct) < 0.5 ? c : ct - lat;
    } else ct -= lat;
    let t = _from + (ct - _a0) - MASTER_LAT;
    if (t < _from) t = _from;
    if (t < _last) t = _last; // monotonic while playing
    _last = t;
    return Math.min(t, _total);
  },
  // → Promise<AudioBuffer> (stereo) of the mastered soundtrack, or of [from, to]. A render that starts at from > 0
  // resumes what is sounding at `from` (fine for previews); exact long exports: renderChunked. o.raw = no master;
  // o.music/sfx/amb = false drop a layer; o.stems = [strip names] (music strips only); o.dry = no reverb/delay sends.
  renderOffline(o) {
    o = o || {};
    const sr = o.sampleRate || 48000, tl = getTimeline(), total = tlEnd(tl);
    const from = clamp(+o.from || 0, 0, total), to = clamp(o.to == null ? total : +o.to, from + 0.05, total + 30);
    const F = Math.round(from * sr), N = Math.max(128, Math.round(to * sr) - F), ev = o.ev || buildEvents(tl, o);
    if (o.raw) return renderRaw(tl, ev, F, N, sr, o);
    const M = new Master(sr), lat = M.lat;
    return renderRaw(tl, ev, F, N + lat, sr, o).then(buf => {
      const l = buf.getChannelData(0), r = buf.getChannelData(1);
      M.process(l, r, N + lat);
      const out = new AudioBuffer({ length: N, numberOfChannels: 2, sampleRate: sr });
      out.copyToChannel(l.subarray(lat, lat + N), 0); out.copyToChannel(r.subarray(lat, lat + N), 1);
      return out;
    });
  },
  // Long exports: successive chunks of the raw mix, each with an automatically sized pre-roll (≥ `preroll` s, see
  // needPre), glued sample-exactly and mastered by one continuous JS master.
  // → Promise<{L, R, sampleRate, from, to, chunks: [{index, t0, t1, preroll, ms}], ms}>.
  // o.onProgress(info) after each chunk; o.onChunk({L, R, t0, t1, …}) receives each finished stretch of output (it lags
  // the chunk boundary by the master's 5 ms look-ahead; may return a Promise); o.keep = false skips the full arrays.
  async renderChunked(o) {
    o = o || {};
    const sr = o.sampleRate || 48000, tl = getTimeline(), total = tlEnd(tl);
    const from = clamp(+o.from || 0, 0, total), to = clamp(o.to == null ? total : +o.to, from + 0.05, total + 30);
    const chunk = Math.max(1, +o.chunk || 60), minPre = Math.max(0, o.preroll == null ? PRE_MIN : +o.preroll);
    const ev = o.ev || buildEvents(tl, o);
    const S0 = Math.round(from * sr), S1 = Math.round(to * sr), CH = Math.round(chunk * sr), n = S1 - S0;
    const keep = o.keep !== false;
    const L = keep ? new Float32Array(n) : null, R = keep ? new Float32Array(n) : null;
    const M = o.raw ? null : new Master(sr), lat = M ? M.lat : 0;
    const info = [], nChunks = Math.ceil(n / CH), t0 = now();
    for (let k = 0; k < nChunks; k++) {
      const c0 = S0 + k * CH, c1 = Math.min(S1, c0 + CH), last = k === nChunks - 1;
      const P = needPre(ev, c0 / sr, minPre);
      const F = c0 === 0 ? 0 : Math.max(0, Math.floor((c0 - Math.ceil(P * sr)) / 128) * 128);
      const ta = now(), extra = last ? lat : 0;
      const buf = await renderRaw(tl, ev, F, c1 - F + extra, sr, o);
      const l = buf.getChannelData(0), r = buf.getChannelData(1), s0 = c0 - F, len = c1 - c0 + extra;
      if (M && k === 0 && s0 > 0) M.process(l.subarray(0, s0), r.subarray(0, s0), s0); // settle the master on the pre-roll
      const sl = l.subarray(s0, s0 + len), sr2 = r.subarray(s0, s0 + len);
      if (M) M.process(sl, sr2, len);
      const g0 = Math.max(S0, c0 - lat), g1 = last ? S1 : c1 - lat; // global samples finished by this chunk
      const outL = sl.subarray(g0 - (c0 - lat), g1 - (c0 - lat)), outR = sr2.subarray(g0 - (c0 - lat), g1 - (c0 - lat));
      if (keep) { L.set(outL, g0 - S0); R.set(outR, g0 - S0); }
      const it = { index: k, of: nChunks, t0: c0 / sr, t1: c1 / sr, preroll: (c0 - F) / sr, ms: Math.round(now() - ta) };
      info.push(it);
      if (o.onChunk) await o.onChunk(Object.assign({}, it, { L: outL, R: outR, t0: g0 / sr, t1: g1 / sr }));
      if (o.onProgress) { try { o.onProgress(Object.assign({ done: (c1 - S0) / n }, it)); } catch (e) { /* caller's problem */ } }
    }
    return { L, R, sampleRate: sr, from: S0 / sr, to: S1 / sr, chunks: info, ms: Math.round(now() - t0) };
  },
  playSfx(name, params) { // immediate one-shot (testing); returns its length in seconds
    if (!A.init()) return 0;
    if (!_fx) _fx = new Session(_eng, null, 0, _ctx.currentTime, {});
    _fx.now = _ctx.currentTime; _fx.sweep(_fx.now);
    return sfxAt(_fx, name, params || {}, _ctx.currentTime + 0.02);
  },
});

// ------------------------------------------------------------------------------------ registry exports
Object.assign(AU, {
  BPM, BEAT, BAR, STOP_FADE, MASTER_LAT, SEAM_TAIL, PRE_MIN, IR_LEN, KS_CAP,
  clamp, mtof, dbg, nm, mulberry32, hashStr, warnOnce, now,
  BQ, pinkGen, brownGen, loopify, toBuffer, removeDC, ksRender, ksBuffer, bufCache, driveCurve,
  getTimeline, tlEnd, envAt, envSched, ADSR, PERC, Voice, MIX, STRIP, makeEngine, Session,
  INST, def, ringOf, resOf, SFX_DEF, sfx, sfxAt, normP, sfxPre, sfxLen, sfxTail,
  buildEvents, needPre, renderRaw, Master,
  strips(tbl) { Object.assign(STRIP, tbl); },
});
// test / tooling hooks (not part of the contract)
A._dbg = {
  AU, getTimeline, buildEvents: o => buildEvents(getTimeline(), o || {}), MIX, STRIP, INST, SFX_DEF,
  get BED() { return AU.BED; }, get MUSIC() { return AU.MUSIC; }, get SEQ_ERR() { return AU.SEQ_ERR || []; },
  needPre, makeEngine, Session, sfxAt, renderRaw, Master,
  renderSfx(name, p, o) { // one SFX alone → Promise<AudioBuffer> (raw by default: no master chain)
    o = o || {}; const sr = o.sampleRate || 48000, D = SFX_DEF[name], q = normP(p);
    const secs = sfxPre(D, q) + sfxLen(D, q) + sfxTail(D) + (o.revTail == null ? 1.5 : o.revTail);
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(secs * sr), sampleRate: sr });
    const eng = makeEngine(ctx, { raw: o.raw !== false }), S = new Session(eng, null, 0, 0, { dry: !!o.dry });
    S.now = 0; sfxAt(S, name, p || {}, 0.02, o.tg != null ? o.tg : 0);
    return ctx.startRendering();
  },
  renderNote(i, m, d, v, opt, o) { // one instrument note alone (dry strip level 1, raw) → Promise<AudioBuffer>
    o = o || {}; const sr = o.sampleRate || 48000, ring = ringOf(i, m, d, opt || {});
    const secs = d + ring + (o.extra == null ? 0.5 : o.extra);
    const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(secs * sr), sampleRate: sr });
    const eng = makeEngine(ctx, { raw: true }), S = new Session(eng, null, 0, 0, { dry: true });
    S.now = 0;
    const g = ctx.createGain(); g.connect(eng.input);
    INST[i].fn(S, { t: o.t || 0, i, m, d, v, o: opt || {}, len: d + ring }, 0.02, g);
    return ctx.startRendering();
  },
  bed(name, sr) { return AU.bedBuffer ? AU.bedBuffer({ sr: sr || 48000, B: bufCache(sr || 48000) }, name) : null; },
  ctxInfo() { return _ctx ? { sr: _ctx.sampleRate, state: _ctx.state, base: _ctx.baseLatency, out: _ctx.outputLatency, voices: _ses ? _ses.voices.length : 0, events: _ses ? _ses.ev.length : 0, idx: _ses ? _ses.i : 0 } : null; },
};
})();
