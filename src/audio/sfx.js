/* =====================================================================================================
   DOMAIN CLASH — SFX catalog                                                (src/audio/sfx.js, classic script)
   Every name in SPEC.md §11, plus `erode` (Act II: Simple Domain wearing away). `cleave` with a cue dur > 1.5 s is the
   Shrine's cutting storm (Act II). Act III: `poleClang` (steel pole: no dur = one clang · dur ≤ 1 s gripped/damped ·
   dur > 1 s falls and clatters), `poleRing` (the pole held in the Infinity), `metalWhoosh` (a spinning pole in flight),
   `redWhistle` (the Red's curving return), `concreteGrind` (dragged through a facade), `skid` (feet sliding on concrete).
   Act IV: `extinguisherBurst`, `chairScrape`, `rip` (non-gory tear), `staticCrackle` (a body crawling with electricity),
   `waterSpray` (a jet scoring a wall), `crtHum` (a room of CRT monitors), `heelSkid` (a giant driven back on its heels).
   Registered with HT.AU.sfx(name, len, opt, fn) — see engine.js for the fields:
     len (s after the sync point, at pitch 1) · pre (pre-roll: the hit lands on the cue's t) · preDur (cue `dur` = the
     build-up length) · var (cue `dur` = len) · duck [dB, hold | 'dur'] (music ducking) · rev (reverb send) · gain ·
     tail · cut (whole-mix silence afterwards).
   fn(v, o, p, r, h, L, pre): v = Voice, o = output gain, p = {vol, pan, panTo, pitch, dur}, r = seeded rng,
   h = hit time (audio s), L = length after the hit, pre = pre-roll length. p.pitch (k) scales frequencies; fixed-length
   sounds also scale their timing by 1/k (like a playback-rate change).
   No sound contains speech, shouts, vowels or breath: the only resonances are physical (strings, membranes, metal,
   glass, air columns) and every bird is a bird (crow: harmonic source, 30–50 Hz pulsing, one broad emphasis ~2 kHz).
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { clamp, mtof, PERC, mulberry32, hashStr, toBuffer, BQ } = AU;
const L = AU.L, sfx = AU.sfx;

// ------------------------------------------------------------------------------------ building blocks
// tone(): one oscillator. o.pts (frequency points) | o.f1 (end frequency, exp unless o.lin), o.env (gain points) |
// o.dec (exponential decay) | flat with o.att/o.rel; o.fm = [modulator Hz, depth Hz]; o.det = detune cents.
function tone(v, dest, type, f0, t0, dur, amp, o) {
  o = o || {};
  const nyq = v.ctx.sampleRate * 0.45, cf = f => Math.min(nyq, Math.max(1, f));
  const x = v.at(v.osc(type, cf(f0)), t0, t0 + dur + 0.03), g = v.gain(0);
  x.connect(g); g.connect(dest);
  if (o.pts) v.env(x.frequency, o.pts.map(q => [q[0], cf(q[1]), q[2]]), false, t0);
  else if (o.f1 != null) v.env(x.frequency, [[0, cf(f0)], [dur, cf(o.f1), o.lin ? 'l' : 'e']], false, t0);
  if (o.det) x.detune.value = o.det;
  const at = o.att || 0.004, rel = Math.min(o.rel || 0.02, dur * 0.5);
  v.env(g.gain, o.env || (o.dec ? [[0, 0], [at, amp], [dur, amp * 0.001, 'e'], [dur + 0.01, 0]]
    : [[0, 0], [at, amp], [Math.max(at + 0.001, dur - rel), amp], [dur, 0]]), true, t0);
  if (o.fm) { const m = v.at(v.osc('sine', o.fm[0]), t0, t0 + dur + 0.03), mg = v.gain(o.fm[1]); m.connect(mg); mg.connect(x.frequency); }
  return x;
}
// nz(): one noise source through up to two filters. o.type/f/q (+ o.fpts or o.f1 sweep), o.type2/f2/q2, o.env|o.att.
function nz(v, dest, kind, t0, dur, amp, o) {
  o = o || {};
  const s = v.at(v.noise(kind || 'white', o.off || 0), t0, t0 + dur + 0.03);
  let node = s;
  if (o.type) {
    const f = v.filt(o.type, o.f || 1000, o.q || 0.7); s.connect(f); node = f;
    if (o.fpts) v.env(f.frequency, o.fpts, false, t0); else if (o.f1) v.env(f.frequency, [[0, o.f], [dur, o.f1, 'e']], false, t0);
  }
  if (o.type2) { const f2 = v.filt(o.type2, o.f2 || 1000, o.q2 || 0.7); node.connect(f2); node = f2; }
  const g = v.gain(0); node.connect(g); g.connect(dest);
  v.env(g.gain, o.env || [[0, 0], [o.att || 0.003, amp], [dur, amp * 0.001, 'e'], [dur + 0.01, 0]], true, t0);
  return g;
}
const q = (pre, x) => Math.min(x, pre * 0.3); // first envelope point of a pre-roll (keeps short build-ups in order)
function fmBell(v, o, f, t, dur, amp, ratio, index) {
  const car = v.at(v.osc('sine', f), t, t + dur + 0.02), mod = v.at(v.osc('sine', f * (ratio || 3.5)), t, t + dur + 0.02);
  const mg = v.gain(0), g = v.gain(0); mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(o);
  v.env(mg.gain, [[0, f * (index || 2)], [dur * 0.4, f * 0.1, 'e']], false, t);
  v.env(g.gain, [[0, 0], [0.002, amp], [dur, amp * 0.001, 'e'], [dur + 0.01, 0]], true, t);
}
// Band-passed noise sweep a → peak → c with a triangular swell peaking at `pk` (fraction of the length).
function whoosh(v, o, t, len, fa, fb, fc, amp, q, pk, off, kind) {
  return nz(v, o, kind || 'white2', t, len, amp, { type: 'bandpass', q: q || 1.1, fpts: [[0, fa], [len * pk, fb, 'e'], [len, fc, 'e']], env: [[0, 0], [len * pk, amp], [len, 0]], off });
}
// Gain points for a train of hits with exponential decay (T60 = T) between them: list [[t, amp], ...] (relative).
function hitsEnv(list, T) {
  const pts = [[0, 0]]; let cur = 0, last = 0;
  for (const [t, a] of list) {
    if (t <= last + 0.0015) continue;
    const dec = cur * Math.exp(-6.91 * (t - last) / T);
    pts.push([t, Math.max(dec, 1e-5), 'e']);
    cur = dec + a; pts.push([t + 0.001, cur]); last = t + 0.001;
  }
  pts.push([last + T, 1e-5, 'e']); pts.push([last + T + 0.01, 0]);
  return pts;
}
const pulses = (list, w, amp) => { // gain points for a train of short linear pulses [[t, amp], ...] (t relative)
  const pts = [[0, 0]];
  list.forEach(([t, a]) => { const last = pts[pts.length - 1][0]; if (t <= last + 0.0005) return; pts.push([t, 0]); pts.push([t + 0.0008, (a != null ? a : 1) * amp]); pts.push([t + w, 0]); });
  return pts;
};
// Internal stereo sweep for pass-bys when the cue gave no pan/panTo sweep.
function sweepPan(v, o, p, h, len, a, b) {
  if (p.panTo !== p.pan) return o;
  const pn = v.pan(a); pn.connect(o); v.env(pn.pan, [[0, a], [len, b]], false, h); return pn;
}

// ------------------------------------------------------------------------------------ grain textures
// Pre-rendered (seeded JS DSP, cached per sample rate): many tiny events that would need hundreds of nodes live.
const TEX = {};
function texBuf(R, name, variant) {
  const k = 'tex:' + name + ':' + (variant || 0);
  if (R.B.misc[k]) return R.B.misc[k];
  const out = TEX[name](R.sr, mulberry32(hashStr(k)));
  let pk = 1e-9; out.forEach(a => { for (let i = 0; i < a.length; i++) pk = Math.max(pk, Math.abs(a[i])); });
  out.forEach(a => { for (let i = 0; i < a.length; i++) a[i] *= 0.9 / pk; });
  return (R.B.misc[k] = toBuffer(out, R.sr));
}
function mk2(sr, dur) { const n = Math.round(sr * dur); return [new Float32Array(n), new Float32Array(n), n]; }
const panG = p => [Math.cos(p * Math.PI / 2), Math.sin(p * Math.PI / 2)];
function sineGrain(ch, n, sr, t0, f, T, amp, pan, rng, wrap) { // exponentially decaying sine
  const i0 = Math.floor(t0 * sr), len = Math.round(Math.min(T * 3.2, 1) * sr), w = 2 * Math.PI * f / sr, dk = Math.exp(-6.91 / (T * sr)), [gl, gr] = panG(pan);
  let a = amp, ph = rng() * 6.283;
  for (let i = 0; i < len; i++) {
    let j = i0 + i; if (j >= n) { if (!wrap) break; j -= n; }
    const y = Math.sin(ph) * a * (i < 16 ? i / 16 : 1); ph += w; a *= dk;
    ch[0][j] += y * gl; ch[1][j] += y * gr;
  }
}
function noiseGrain(ch, n, sr, t0, dur, f, q, amp, pan, rng, wrap, type) { // filtered noise burst, fast attack, exp decay
  const i0 = Math.floor(t0 * sr), len = Math.round(dur * sr), bq = new BQ(type || 'bp', f, q, sr), [gl, gr] = panG(pan), k = 6.91 / Math.max(1, len);
  for (let i = 0; i < len + Math.round(0.004 * sr); i++) {
    let j = i0 + i; if (j >= n) { if (!wrap) break; j -= n; }
    const e = i < len ? Math.exp(-k * i) * (i < 8 ? i / 8 : 1) : 0, y = bq.run((rng() * 2 - 1) * e) * amp;
    ch[0][j] += y * gl; ch[1][j] += y * gr;
  }
}
TEX.shards = (sr, rng) => { // glass: ~190 decaying pings, dense at first, thinning; a few long resonant pieces
  const [a, b, n] = mk2(sr, 2.2), ch = [a, b];
  for (let g = 0; g < 190; g++) {
    const t0 = Math.min(2.0, -Math.log(1 - rng() * 0.985) * 0.33);
    sineGrain(ch, n, sr, t0, 2500 + Math.pow(rng(), 1.4) * 8500, 0.012 + rng() * 0.09, (0.25 + 0.75 * rng()) * Math.exp(-t0 / 0.8), rng(), rng);
  }
  for (let g = 0; g < 3; g++) sineGrain(ch, n, sr, rng() * 0.3, 3000 + rng() * 3000, 0.3 + rng() * 0.3, 0.3, rng(), rng);
  for (let g = 0; g < 14; g++) noiseGrain(ch, n, sr, rng() * 0.12, 0.01 + rng() * 0.03, 3000 + rng() * 5000, 0.9, 0.5, rng(), rng);
  return ch;
};
TEX.debris = (sr, rng) => { // concrete / rock chunks: filtered noise knocks + low thuds, thinning out
  const [a, b, n] = mk2(sr, 2.6), ch = [a, b];
  for (let g = 0; g < 110; g++) {
    const t0 = Math.min(2.4, -Math.log(1 - rng() * 0.98) * 0.6), amp = (0.2 + 0.8 * rng()) * Math.exp(-t0 / 1.3);
    noiseGrain(ch, n, sr, t0, 0.004 + rng() * 0.036, 300 + Math.pow(rng(), 1.5) * 2700, 0.8 + rng() * 1.7, amp * 1.6, rng(), rng);
    if (rng() < 0.3) sineGrain(ch, n, sr, t0, 60 + rng() * 100, 0.04 + rng() * 0.06, amp * 0.5, 0.3 + rng() * 0.4, rng);
  }
  return ch;
};
TEX.crackle = (sr, rng) => { // fire / sizzle / grit: Poisson clicks + occasional pops (seamless loop, 3 s)
  const [a, b, n] = mk2(sr, 3), ch = [a, b];
  for (let t = rng() * 0.05; t < 3; t += -Math.log(1 - rng()) / 24) {
    if (rng() < 0.12) noiseGrain(ch, n, sr, t, 0.006 + rng() * 0.006, 600 + rng() * 900, 1.2, 1.4 * (0.4 + 0.6 * rng()), rng(), rng, true);
    else noiseGrain(ch, n, sr, t, 0.001 + rng() * 0.003, 1000 + rng() * 5000, 1.5, Math.exp(-3 * rng()) * 1.2, rng(), rng, true);
  }
  return ch;
};
TEX.patter = (sr, rng) => { // a swarm of small soft feet (seamless loop, 3 s)
  const [a, b, n] = mk2(sr, 3), ch = [a, b];
  for (let t = rng() * 0.02; t < 3; t += -Math.log(1 - rng()) / 55) {
    noiseGrain(ch, n, sr, t, 0.01 + rng() * 0.015, 200 + rng() * 500, 0.9, 0.6 + 0.4 * rng(), rng(), rng, true);
    if (rng() < 0.2) sineGrain(ch, n, sr, t, 90 + rng() * 90, 0.03, 0.3, rng(), rng, true);
  }
  return ch;
};
TEX.slashes = (sr, rng) => { // the Shrine's constant cutting (seamless loop, 3 s): ~14 hairline slashes/s — a bright
  // noise flick, a short inharmonic metal ring, now and then a low "tuk" of the cut landing; grains wrap across the end
  const [a, b, n] = mk2(sr, 3), ch = [a, b];
  for (let t = rng() * 0.05; t < 3; t += -Math.log(1 - rng() * 0.98) / 14) {
    const pan = rng(), amp = 0.35 + 0.65 * rng();
    noiseGrain(ch, n, sr, t, 0.012 + rng() * 0.03, 3200 + rng() * 5200, 1.1, amp * 1.1, pan, rng, true);
    const f = 2300 + rng() * 3800;
    sineGrain(ch, n, sr, t + 0.002, f, 0.03 + rng() * 0.09, amp * 0.28, pan, rng, true);
    sineGrain(ch, n, sr, t + 0.002, f * (1.37 + rng() * 0.2), 0.02 + rng() * 0.05, amp * 0.16, pan, rng, true);
    if (rng() < 0.22) sineGrain(ch, n, sr, t + 0.01, 140 + rng() * 160, 0.04 + rng() * 0.04, amp * 0.5, 0.35 + 0.3 * rng(), rng, true);
  }
  return ch;
};
TEX.crunch = (sr, rng) => { // one snow step: ~90 tiny crystal clicks over 0.2 s
  const [a, b, n] = mk2(sr, 0.32), ch = [a, b];
  for (let g = 0; g < 90; g++) {
    const t0 = 0.2 * Math.sqrt(rng()) * (rng() < 0.5 ? rng() : 1), env = Math.sin(Math.PI * Math.min(1, t0 / 0.2));
    noiseGrain(ch, n, sr, t0, 0.0004 + rng() * 0.0012, 1500 + rng() * 3500, 1.3, (0.3 + 0.7 * rng()) * env * 2, 0.4 + rng() * 0.2, rng);
  }
  return ch;
};
function playTex(v, dest, name, variant, t, amp, o) {
  o = o || {};
  const B = texBuf(v.S.R, name, variant), rate = o.rate || 1, dur = o.dur || (B.duration - (o.off || 0)) / rate;
  const s = v.at(v.buf(B, !!o.loop, rate), t, t + dur + 0.02), g = v.gain(0);
  s._off = o.off || 0; s.connect(g); g.connect(dest);
  v.env(g.gain, o.env || [[0, 0], [0.004, amp], [Math.max(0.005, dur - 0.03), amp], [dur, 0]], true, t);
  return g;
}

// ====================================================================================== IMPACTS
// Layered: sub thump (weight) + mid crack (contact) + noise body (air/debris); bigger = lower, longer, wider.
sfx('hitL', 0.3, { duck: [1.5, 0.25], rev: 0.08, gain: 1 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 150 * k, 72 * k, 0.1 / k, 0.55, 0.035 / k);
  L.burst(v, o, h, 0.028 / k, 0.45, 'bandpass', 2200 * k, 1.0, 'white', r() * 3);
  L.burst(v, o, h, 0.005, 0.25, 'highpass', 4200, 0.7, 'white', r() * 3);
  L.burst(v, o, h, 0.06 / k, 0.22, 'lowpass', 700 * k, 0.7, 'brown', r() * 3, 0.002);
});
sfx('hitM', 0.45, { duck: [2.5, 0.35], rev: 0.12 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 120 * k, 50 * k, 0.2 / k, 0.8, 0.05 / k);
  L.burst(v, o, h, 0.045 / k, 0.5, 'bandpass', 1400 * k, 0.9, 'white2', r() * 3);
  L.burst(v, o, h, 0.006, 0.3, 'highpass', 3800, 0.7, 'white', r() * 3);
  L.burst(v, o, h, 0.12 / k, 0.35, 'lowpass', 650 * k, 0.7, 'brown', r() * 3, 0.002);
  tone(v, o, 'square', 900 * k, h, 0.025, 0.07, { f1: 300 * k, dec: 1, att: 0.0008 });
});
sfx('hitH', 0.8, { duck: [4, 0.5], rev: 0.2 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 95 * k, 38 * k, 0.45 / k, 1.0, 0.07 / k);
  L.burst(v, o, h, 0.07 / k, 0.6, 'bandpass', 1100 * k, 0.8, 'white2', r() * 3);
  L.burst(v, o, h, 0.008, 0.4, 'highpass', 3000, 0.7, 'white2', r() * 3);
  L.burst(v, o, h, 0.25 / k, 0.4, 'lowpass', 1200 * k, 0.6, 'white2', r() * 3, 0.002);
  L.burst(v, o, h, 0.35 / k, 0.5, 'lowpass', 220 * k, 0.7, 'brown', r() * 3, 0.004);
});
sfx('hitHuge', 2.6, { pre: 0.08, duck: [9, 1.8], rev: 0.35, tail: 0.45 }, (v, o, p, r, h, len, pre) => {
  const k = p.pitch;
  nz(v, o, 'white2', h - pre, pre, 0.3, { type: 'highpass', f: 1500, env: [[0, 0], [pre * 0.92, 0.3], [pre, 0]], off: r() * 3 }); // suck-in
  L.thump(v, o, h, 70 * k, 28 * k, 1.8 / k, 1.0, 0.12 / k);
  L.thump(v, o, h, 140 * k, 55 * k, 0.4 / k, 0.5, 0.05 / k);
  L.burst(v, o, h, 0.16 / k, 0.7, 'bandpass', 800 * k, 0.7, 'white2', r() * 3);
  L.burst(v, o, h, 0.012, 0.55, 'highpass', 2500, 0.7, 'white2', r() * 3);
  L.burst(v, o, h, 0.7 / k, 0.45, 'lowpass', 3000 * k, 0.5, 'white2', r() * 3, 0.003);
  L.burst(v, o, h, 2.3 / k, 0.4, 'lowpass', 160 * k, 0.7, 'brown', r() * 3, 0.02);
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.08, 0.3, { rate: k, dur: 1.9 / k });
});
sfx('bodyFall', 0.9, { duck: [2, 0.5], rev: 0.15 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 95 * k, 50 * k, 0.25 / k, 0.8, 0.06 / k);
  L.thump(v, o, h + 0.13 / k, 80 * k, 45 * k, 0.2 / k, 0.45, 0.05 / k);
  L.burst(v, o, h, 0.3 / k, 0.3, 'bandpass', 900 * k, 0.8, 'pink', r() * 3, 0.004);
  L.burst(v, o, h + 0.02, 0.45 / k, 0.1, 'highpass', 2500, 0.7, 'white2', r() * 3, 0.02);
});
sfx('block', 0.35, { duck: [1.5, 0.25], rev: 0.1 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 180 * k, 95 * k, 0.08 / k, 0.7, 0.025 / k);
  L.burst(v, o, h, 0.03 / k, 0.5, 'bandpass', 1800 * k, 1.1, 'white', r() * 3);
  L.burst(v, o, h, 0.004, 0.25, 'highpass', 5000, 0.7, 'white', r() * 3);
  tone(v, o, 'triangle', 420 * k, h, 0.05 / k, 0.12, { f1: 260 * k, dec: 1, att: 0.0008 });
});
// Infinity: the fist never lands — the blow's energy arrives muffled (low-passed, no crack), a push of air, and a faint
// glassy ring: inharmonic pairs beating slowly and bending down a hair (time held still between fist and face).
sfx('infinityStop', 1.4, { duck: [2, 0.4], rev: 0.4 }, (v, o, p, r, h) => {
  const k = p.pitch, lp = v.filt('lowpass', 380 * k, 0.8); lp.connect(o);
  L.thump(v, lp, h, 125 * k, 62 * k, 0.28 / k, 0.9, 0.06 / k);
  nz(v, lp, 'brown', h, 0.16 / k, 0.7, { type: 'lowpass', f: 260 * k, att: 0.006, off: r() * 3 });
  [[2093, 0.075, 1.25], [3371, 0.05, 0.9], [4610, 0.022, 0.6]].forEach(([f, a, T], i) => {
    [0, 2.8 + i].forEach((dt, j) => tone(v, o, 'sine', (f + dt) * k, h + 0.012, T / Math.sqrt(k), a * (j ? 0.6 : 1), { f1: (f + dt) * k * 0.994, dec: 1, att: 0.02 }));
  });
});
sfx('groundSlam', 2.0, { duck: [6, 1.0], rev: 0.3 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 62 * k, 30 * k, 1.2 / k, 1.0, 0.1 / k);
  L.burst(v, o, h, 0.1 / k, 0.6, 'bandpass', 1500 * k, 0.8, 'white2', r() * 3);
  L.burst(v, o, h, 0.01, 0.45, 'highpass', 2600, 0.7, 'white2', r() * 3);
  L.burst(v, o, h + 0.01, 0.9 / k, 0.3, 'bandpass', 500 * k, 0.6, 'pink', r() * 3, 0.01);
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.05, 0.45, { rate: k, dur: 1.5 / k });
});
sfx('wallCrash', 2.2, { duck: [6, 1.2], rev: 0.3 }, (v, o, p, r, h) => {
  const k = p.pitch;
  for (let i = 0; i < 4; i++) L.burst(v, o, h + (i * 0.07 + r() * 0.03) / k, 0.09 / k, 0.55 - i * 0.08, 'bandpass', (600 + r() * 1400) * k, 0.8, 'white2', r() * 3);
  L.thump(v, o, h, 80 * k, 35 * k, 1.0 / k, 0.9, 0.09 / k);
  playTex(v, o, 'shards', Math.floor(r() * 3), h + 0.05, 0.28, { rate: k, dur: 1.5 / k });
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.1, 0.45, { rate: k, dur: 1.8 / k });
  tone(v, o, 'sine', 140 * k, h + 0.2, 0.8 / k, 0.08, { f1: 110 * k, fm: [3.1, 6], att: 0.1, rel: 0.3 });
});

// ====================================================================================== MOTION
sfx('whooshS', 0.25, { duck: [0.8, 0.2], rev: 0.06 }, (v, o, p, r, h, len) => {
  const k = p.pitch; whoosh(v, o, h, len, 900 * k, 3500 * k, 1500 * k, 0.5, 1.3, 0.45, r() * 3);
});
sfx('whooshM', 0.45, { duck: [1, 0.3], rev: 0.1 }, (v, o, p, r, h, len) => {
  const k = p.pitch; whoosh(v, o, h, len, 600 * k, 2600 * k, 900 * k, 0.55, 1.1, 0.45, r() * 3);
  nz(v, o, 'brown', h, len, 0.3, { type: 'lowpass', f: 450 * k, env: [[0, 0], [len * 0.5, 0.3], [len, 0]], off: r() * 3 });
});
sfx('whooshL', 0.8, { duck: [1.5, 0.5], rev: 0.15 }, (v, o, p, r, h, len) => {
  const k = p.pitch; whoosh(v, o, h, len, 300 * k, 2000 * k, 500 * k, 0.55, 1.0, 0.5, r() * 3);
  nz(v, o, 'brown', h, len, 0.45, { type: 'lowpass', f: 400 * k, env: [[0, 0], [len * 0.5, 0.45], [len, 0]], off: r() * 3 });
  tone(v, o, 'sine', 110 * k, h, len, 0.18, { f1: 70 * k, env: [[0, 0], [len * 0.5, 0.18], [len, 0]] });
});
sfx('whip', 0.35, { duck: [1, 0.3], rev: 0.1 }, (v, o, p, r, h) => {
  const k = p.pitch;
  whoosh(v, o, h, 0.16 / k, 2000 * k, 6000 * k, 4000 * k, 0.45, 1.4, 0.8, r() * 3);
  L.burst(v, o, h + 0.16 / k, 0.008, 0.8, 'highpass', 3000, 0.7, 'white2', r() * 3);
  tone(v, o, 'square', 1600 * k, h + 0.16 / k, 0.02, 0.05, { f1: 500 * k, dec: 1, att: 0.0005 });
});
sfx('dashAir', 0.6, { duck: [1.5, 0.4], rev: 0.12 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  whoosh(v, o, h, len, 400 * k, 3200 * k, 800 * k, 0.6, 0.9, 0.3, r() * 3);
  nz(v, o, 'white2', h + len * 0.2, len * 0.8, 0.12, { type: 'highpass', f: 4000, env: [[0, 0], [0.05, 0.12], [len * 0.8, 0]], off: r() * 3 });
});
sfx('blink', 0.3, { duck: [1, 0.2], rev: 0.2 }, (v, o, p, r, h) => { // Gojo's instant step: a small inward suck, a pop
  const k = p.pitch;
  nz(v, o, 'white2', h, 0.06 / k, 0.35, { type: 'bandpass', q: 1.5, fpts: [[0, 4000 * k], [0.06 / k, 1000 * k, 'e']], env: [[0, 0], [0.055 / k, 0.35], [0.06 / k, 0]], off: r() * 3 });
  tone(v, o, 'sine', 1200 * k, h + 0.055 / k, 0.035, 0.4, { f1: 300 * k, dec: 1, att: 0.0008 });
  tone(v, o, 'sine', 3520 * k, h + 0.06 / k, 0.03, 0.08, { dec: 1, att: 0.0008 });
  nz(v, o, 'pink', h + 0.06 / k, 0.15 / k, 0.12, { type: 'bandpass', f: 1500 * k, q: 0.7, off: r() * 3 });
});
sfx('flyBy', 1.6, { var: true, duck: [2, 'dur'], rev: 0.15 }, (v, o, p, r, h, len) => { // doppler pass-by
  const k = p.pitch, d = sweepPan(v, o, p, h, len, -0.75, 0.75);
  nz(v, d, 'white2', h, len, 0.55, { type: 'bandpass', q: 1.2, fpts: [[0, 2600 * k], [len * 0.45, 1900 * k, 'e'], [len * 0.55, 950 * k, 'e'], [len, 600 * k, 'e']], env: [[0, 0], [len * 0.5, 0.55], [len, 0]], off: r() * 3 });
  nz(v, d, 'brown', h, len, 0.35, { type: 'lowpass', f: 300 * k, env: [[0, 0], [len * 0.5, 0.35], [len, 0]], off: r() * 3 });
  tone(v, d, 'sine', 1300 * k, h, len, 0.06, { pts: [[0, 1300 * k], [len * 0.45, 1250 * k], [len * 0.55, 850 * k], [len, 800 * k]], env: [[0, 0], [len * 0.5, 0.06], [len, 0]] });
});

// ====================================================================================== SLASHES
function shingCore(v, o, h, k, r, amp) {
  nz(v, o, 'white2', h, 0.035, 0.35 * amp, { type: 'highpass', f: 5000 * k, att: 0.001, off: r() * 3 });
  L.ring(v, o, h, 2800 * k, [[1, 1, 1, 3.1], [1.47, 0.7, 0.8, 0], [2.11, 0.45, 0.6, 4.2], [2.76, 0.28, 0.45, 0]], 0.2 * amp, 0.95 / Math.sqrt(k), v.ctx.sampleRate);
  tone(v, o, 'sine', 5600 * k, h, 0.08, 0.06 * amp, { f1: 7400 * k, dec: 1, att: 0.001 });
}
sfx('shing', 1.2, { duck: [1.5, 0.4], rev: 0.45 }, (v, o, p, r, h) => shingCore(v, o, h, p.pitch, r, 1));
// Dismantle through a building: the crisp ring, and a beat later the grinding slide of the upper part.
sfx('slashSplit', 1.9, { duck: [3, 1.4], rev: 0.35 }, (v, o, p, r, h) => {
  const k = p.pitch, t1 = h + 0.55 / k, D = 1.25 / k;
  shingCore(v, o, h, k, r, 1);
  const am = v.gain(0.6); am.connect(o);
  const lf = v.at(v.osc('square', 37), t1, t1 + D + 0.02), lg = v.gain(0.35); lf.connect(lg); lg.connect(am.gain);
  nz(v, am, 'brown', t1, D, 0.85, { type: 'bandpass', q: 1.2, fpts: [[0, 520 * k], [D, 260 * k, 'e']], env: [[0, 0], [0.12, 0.85], [D * 0.7, 0.6], [D, 0]], off: r() * 3 });
  nz(v, o, 'pink', t1, D, 0.22, { type: 'bandpass', f: 1600 * k, q: 0.8, env: [[0, 0], [0.1, 0.22], [D, 0]], off: r() * 3 });
  playTex(v, o, 'crackle', Math.floor(r() * 2), t1, 0.22, { rate: k, dur: D, loop: true, off: r() * 2 });
  L.thump(v, o, t1, 60 * k, 40 * k, 0.4 / k, 0.4, 0.1 / k);
});
// cleave: a heavier, adaptive slash — a deep "shunk". With a cue `dur` longer than 1.5 s it becomes the Shrine's cutting
// STORM for that long (the scenes write { sfx: 'cleave', dur: 7 } for "a storm of cuts"): the seamless slashes texture
// (TEX.slashes, ~14 cuts/s) under a shunk every 0.45–0.9 s, swelling in and out.
function cleaveCore(v, o, h, k, r, amp) {
  nz(v, o, 'white2', h, 0.16 / k, 0.6 * amp, { type: 'bandpass', q: 1.3, fpts: [[0, 700 * k], [0.16 / k, 300 * k, 'e']], att: 0.001, off: r() * 3 });
  L.ring(v, o, h, 1200 * k, [[1, 1, 1, 2.2], [1.58, 0.6, 0.7, 0], [2.4, 0.3, 0.5, 0]], 0.16 * amp, 0.6 / Math.sqrt(k), v.ctx.sampleRate);
  L.thump(v, o, h, 110 * k, 55 * k, 0.25 / k, 0.6 * amp, 0.05 / k);
  L.burst(v, o, h, 0.005, 0.35 * amp, 'highpass', 3500, 0.7, 'white2', r() * 3);
}
sfx('cleave', 0.9, { var: true, duck: [2.5, 0.5], rev: 0.3 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  if (len <= 1.5) { cleaveCore(v, o, h, k, r, 1); return; }
  const E = a => [[0, 0], [Math.min(0.5, len / 4), a], [Math.max(len * 0.6, len - 0.5), a], [len, 0]];
  playTex(v, o, 'slashes', Math.floor(r() * 3), h, 0.55, { rate: k, dur: len, loop: true, off: r() * 3, env: E(0.55) });
  for (let t = 0.05 + r() * 0.2; t < len - 0.3; t += 0.45 + r() * 0.45) {
    const u = t / len, edge = Math.min(1, u * 4, (1 - u) * 4);
    cleaveCore(v, o, h + t, k * (0.8 + r() * 0.5), r, 0.45 * edge);
  }
});
sfx('dismantle', 0.7, { duck: [2, 0.4], rev: 0.3 }, (v, o, p, r, h) => { // the invisible slash: a thin, razor air-cut
  const k = p.pitch;
  whoosh(v, o, h, 0.12 / k, 3000 * k, 8000 * k, 5000 * k, 0.45, 1.6, 0.7, r() * 3);
  tone(v, o, 'sine', 6400 * k, h + 0.08 / k, 0.35 / k, 0.09, { f1: 6250 * k, dec: 1, att: 0.001 });
  tone(v, o, 'sine', 9100 * k, h + 0.08 / k, 0.2 / k, 0.03, { dec: 1, att: 0.001 });
  L.burst(v, o, h + 0.085 / k, 0.006, 0.3, 'highpass', 4000, 0.7, 'white2', r() * 3);
});
// World-Cutting Slash: a thin, impossibly high tone — then the whole mix is cut to silence (SFX_DEF.cut: for 3 s after
// the tone, fading back in over 1 s; scenes should also drop their ambience at that moment).
sfx('worldCut', 1.6, { var: true, rev: 0.15, tail: 0.05, cut: { at: 'len', hold: 3.0, fade: 1.0 } }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  [[9400, 11800, 0.12], [9404.5, 11806, 0.06]].forEach(([f0, f1, a]) => tone(v, o, 'sine', f0 * k, h, len, a, { f1: f1 * k, env: [[0, 0], [len * 0.25, a * 0.6], [len - 0.012, a], [len, 0]] }));
  nz(v, o, 'white2', h, len, 0.025, { type: 'highpass', f: 7000, env: [[0, 0], [len - 0.012, 0.025], [len, 0]], off: r() * 3 });
});

// ====================================================================================== TECHNIQUES
sfx('infinityHum', 3.0, { var: true, rev: 0.3 }, (v, o, p, r, h, len) => { // Infinity aura: low beating hum + airy shimmer
  const k = p.pitch, E = a => [[0, 0], [Math.min(0.6, len / 3), a], [Math.max(len * 0.7, len - 0.6), a], [len, 0]];
  tone(v, o, 'sine', 65 * k, h, len, 0.45, { env: E(0.45) });
  tone(v, o, 'sine', 65.45 * k, h, len, 0.35, { env: E(0.35) });
  tone(v, o, 'sine', 130.3 * k, h, len, 0.12, { env: E(0.12) });
  const am = v.gain(0.55); am.connect(o); v.lfo(0.7, 0.35, am.gain);
  [[3150, 0.035], [4720, 0.025], [6310, 0.015]].forEach(([f, a]) => tone(v, am, 'sine', f * k, h, len, a, { env: E(a) }));
  nz(v, o, 'pink', h, len, 0.05, { type: 'highpass', f: 3000, env: E(0.05), off: r() * 3 });
});
sfx('blueCharge', 0.35, { pre: 1.2, preDur: true, duck: [2, 0.4], rev: 0.35 }, (v, o, p, r, h, len, pre) => { // Blue gathers
  const k = p.pitch, t0 = h - pre, T = pre + len;
  const am = v.gain(0.55); am.connect(o);
  const lf = v.at(v.osc('sine', 4), t0, h + len + 0.02), lg = v.gain(0.4); lf.connect(lg); lg.connect(am.gain);
  v.env(lf.frequency, [[0, 4], [pre, 18, 'e'], [T, 6]], false, t0);
  nz(v, am, 'white2', t0, T, 0.5, { type: 'bandpass', q: 2.2, fpts: [[0, 220 * k], [pre, 2400 * k, 'e'], [T, 900 * k, 'e']], env: [[0, 0], [q(pre, 0.08), 0.01], [pre, 0.5, 'e'], [T, 0]], off: r() * 3 });
  tone(v, o, 'sine', 55 * k, t0, T, 0.4, { pts: [[0, 55 * k], [pre, 110 * k, 'e'], [T, 100 * k]], env: [[0, 0], [q(pre, 0.08), 0.01], [pre, 0.4, 'e'], [T, 0]] });
  tone(v, o, 'triangle', 220 * k, t0, T, 0.08, { pts: [[0, 220 * k], [pre, 880 * k, 'e'], [T, 800 * k]], env: [[0, 0], [q(pre, 0.08), 0.002], [pre, 0.08, 'e'], [T, 0]] });
  L.thump(v, o, h, 180 * k, 90 * k, 0.12, 0.4, 0.04);
});
sfx('blueImplode', 1.6, { pre: 0.6, duck: [5, 0.8], rev: 0.3 }, (v, o, p, r, h, len, pre) => { // suction, then a deep thump
  const k = p.pitch, t0 = h - pre;
  nz(v, o, 'white2', t0, pre, 0.6, { type: 'highpass', fpts: [[0, 6000], [pre, 900, 'e']], env: [[0, 0], [0.05, 0.005], [pre - 0.01, 0.6, 'e'], [pre, 0]], off: r() * 3 });
  const lp = v.filt('lowpass', 1800, 1.2); lp.connect(o);
  tone(v, lp, 'sawtooth', 800 * k, t0, pre, 0.25, { f1: 120 * k, env: [[0, 0], [0.05, 0.005], [pre - 0.01, 0.25, 'e'], [pre, 0]] });
  tone(v, o, 'sine', 400 * k, h - 0.01, 0.05, 0.35, { f1: 60 * k, dec: 1, att: 0.001 });
  L.thump(v, o, h, 55 * k, 28 * k, 1.0 / k, 1.0, 0.1 / k);
  L.burst(v, o, h, 0.03 / k, 0.55, 'bandpass', 700 * k, 1.0, 'white2', r() * 3);
  L.burst(v, o, h, 0.8 / k, 0.4, 'lowpass', 150 * k, 0.7, 'brown', r() * 3, 0.01);
});
sfx('redCharge', 0.3, { pre: 1.0, preDur: true, duck: [2, 0.3], rev: 0.3 }, (v, o, p, r, h, len, pre) => { // Red: a bright rising whine
  const k = p.pitch, t0 = h - pre, T = pre + len;
  const am = v.gain(0.6); am.connect(o);
  const lf = v.at(v.osc('square', 20), t0, h + len + 0.02), lg = v.gain(0.3); lf.connect(lg); lg.connect(am.gain);
  v.env(lf.frequency, [[0, 20], [pre, 42, 'e']], false, t0);
  const bp = v.filt('bandpass', 800, 4); bp.connect(am);
  v.env(bp.frequency, [[0, 800 * k], [pre, 3200 * k, 'e'], [T, 2400 * k]], false, t0);
  tone(v, bp, 'sawtooth', 400 * k, t0, T, 0.6, { pts: [[0, 400 * k], [pre, 1600 * k, 'e'], [T, 1500 * k]], env: [[0, 0], [q(pre, 0.06), 0.02], [pre, 0.6, 'e'], [T, 0]] });
  playTex(v, o, 'crackle', 1, t0, 0.3, { rate: k * 1.2, dur: T, loop: true, off: r() * 2, env: [[0, 0], [q(pre, 0.06), 0.01], [pre, 0.3, 'e'], [T, 0]] });
  L.burst(v, o, h, 0.02, 0.35, 'highpass', 2500, 0.7, 'white2', r() * 3);
});
sfx('redBlast', 1.8, { duck: [6, 1.0], rev: 0.35 }, (v, o, p, r, h) => { // bright outward blast
  const k = p.pitch;
  nz(v, o, 'white2', h, 0.35 / k, 0.9, { type: 'highpass', f: 600 * k, type2: 'lowpass', f2: 9000, att: 0.001, off: r() * 3 });
  L.burst(v, o, h, 0.008, 0.7, 'highpass', 2000, 0.7, 'white2', r() * 3);
  whoosh(v, o, h, 0.6 / k, 3000 * k, 2000 * k, 500 * k, 0.5, 0.8, 0.05, r() * 3);
  L.thump(v, o, h, 85 * k, 40 * k, 0.8 / k, 0.85, 0.08 / k);
  playTex(v, o, 'crackle', 0, h + 0.1, 0.35, { rate: k, dur: 1.3 / k, env: [[0, 0], [0.02, 0.35], [1.3 / k, 0.0003, 'e'], [1.3 / k + 0.01, 0]] });
});
// Hollow Purple charge: Blue (low) rises and Red (high) falls until they meet in one pitch at the sync point; their
// beating slows to nothing as they converge; then the fused tone.
sfx('purpleCharge', 1.2, { pre: 3.0, preDur: true, duck: [3, 1.0], rev: 0.4 }, (v, o, p, r, h, len, pre) => {
  const k = p.pitch, t0 = h - pre, fc = 293.66 * k, T = pre + len;
  const sw = [[0, 0], [q(pre, 0.3), 0.02], [pre, 0.3, 'e'], [pre + 0.02, 0]];
  tone(v, o, 'sine', 110 * k, t0, pre + 0.02, 0.3, { pts: [[0, 110 * k], [pre, fc, 'e']], env: sw });
  tone(v, o, 'triangle', 110 * k, t0, pre + 0.02, 0.12, { pts: [[0, 110 * k], [pre, fc, 'e']], env: sw.map(q => [q[0], q[1] * 0.4, q[2]]) });
  const lp = v.filt('lowpass', 3000, 0.8); lp.connect(o);
  tone(v, lp, 'sawtooth', 1760 * k, t0, pre + 0.02, 0.16, { pts: [[0, 1760 * k], [pre, fc, 'e']], env: sw.map(q => [q[0], q[1] * 0.55, q[2]]) });
  const am = v.gain(0.55); am.connect(o);
  const lf = v.at(v.osc('sine', 3), t0, h + 0.02), lg = v.gain(0.4); lf.connect(lg); lg.connect(am.gain);
  v.env(lf.frequency, [[0, 3], [pre, 12, 'e']], false, t0);
  nz(v, am, 'white2', t0, pre, 0.3, { type: 'bandpass', q: 1.8, fpts: [[0, 400 * k], [pre, 2000 * k, 'e']], env: [[0, 0], [q(pre, 0.3), 0.01], [pre - 0.01, 0.3, 'e'], [pre, 0]], off: r() * 3 });
  // fusion: bright crack + boom, then the fused purple tone (FM 1:1.5, hollow and otherworldly) over a sub
  L.burst(v, o, h, 0.01, 0.6, 'highpass', 2200, 0.7, 'white2', r() * 3);
  L.thump(v, o, h, 90 * k, 45 * k, 0.6, 0.6, 0.08);
  const car = v.at(v.osc('sine', fc), h, h + len + 0.02), mod = v.at(v.osc('sine', fc * 1.5), h, h + len + 0.02), mg = v.gain(0), cg = v.gain(0);
  mod.connect(mg); mg.connect(car.frequency); car.connect(cg); cg.connect(o);
  v.env(mg.gain, [[0, fc * 3], [len, fc * 1.2, 'e']], false, h);
  v.env(cg.gain, [[0, 0], [0.02, 0.32], [len * 0.7, 0.26], [len, 0]], true, h);
  tone(v, o, 'sine', fc / 4, h, len, 0.35, { env: [[0, 0], [0.05, 0.35], [len * 0.7, 0.3], [len, 0]] });
});
// Hollow Purple erasure: a colossal roar that is then sucked out (the low-pass closes, the level collapses) into a
// thin rushing whistle — vacuum — and a faint inrush at the end.
sfx('purpleErase', 5.0, { var: true, duck: [4, 'dur'], rev: 0.4, tail: 0.6 }, (v, o, p, r, h, len) => {
  const k = p.pitch, R1 = len * 0.55, V = len - R1;
  nz(v, o, 'white2', h, 0.5, 0.8, { type: 'lowpass', f: 5000 * k, att: 0.001, off: r() * 3 });
  L.burst(v, o, h, 0.01, 0.6, 'highpass', 2000, 0.7, 'white2', r() * 3);
  const roarEnv = a => [[0, 0], [0.25, a], [R1, a * 0.9], [R1 + V * 0.6, a * 0.02, 'e'], [len, 0]];
  nz(v, o, 'brown', h, len, 1.0, { type: 'lowpass', q: 0.8, fpts: [[0, 2500 * k], [R1, 2500 * k], [R1 + V * 0.6, 60, 'e'], [len, 50]], env: roarEnv(1.0), off: r() * 3 });
  const am = v.gain(0.7); am.connect(o); v.lfo(9.3, 0.3, am.gain); v.lfo(3.7, 0.15, am.gain);
  nz(v, am, 'pink', h, len, 0.5, { type: 'bandpass', q: 0.8, fpts: [[0, 800 * k], [R1, 700 * k], [R1 + V * 0.6, 120, 'e'], [len, 100]], env: roarEnv(0.5), off: r() * 3 });
  [31, 37, 46].forEach((f, i) => tone(v, o, 'sine', f * k, h, len, 0.3 - i * 0.06, { env: roarEnv(0.3 - i * 0.06) }));
  playTex(v, o, 'crackle', 2, h, 0.4, { rate: 0.8 * k, dur: R1 + V * 0.5, loop: true, env: [[0, 0], [0.1, 0.4], [R1, 0.35], [R1 + V * 0.5, 0]] });
  nz(v, o, 'white2', h + R1, V, 0.12, { type: 'bandpass', q: 8, fpts: [[0, 7000], [V, 3000, 'e']], env: [[0, 0], [0.3, 0.12], [V, 0]], off: r() * 3 });
  L.thump(v, o, h + len - 0.6, 60 * k, 35 * k, 0.55, 0.35, 0.1);
});
// Black Flash: a sharp crack, black lightning (fast descending arcs, 70 Hz buzz), a bass drop.
sfx('blackFlash', 1.6, { duck: [7, 1.2], rev: 0.3 }, (v, o, p, r, h) => {
  const k = p.pitch, hb = h + 0.012; // the crack reads first; the weight lands 12 ms later
  L.burst(v, o, h, 0.008, 1.6, 'highpass', 2200, 0.7, 'white2', r() * 3);
  L.burst(v, o, h, 0.004, 0.8, 'bandpass', 5000, 1.2, 'white', r() * 3);
  tone(v, o, 'square', 2500 * k, h, 0.004, 0.3, { dec: 1, att: 0.0003 });
  const bz = v.gain(0.5); bz.connect(o); v.lfo(70, 0.5, bz.gain, 'square');
  const bp = v.filt('bandpass', 1800 * k, 1.0); bp.connect(bz);
  [0.01, 0.05 + r() * 0.03, 0.11 + r() * 0.04].forEach((dt, i) => {
    tone(v, bp, 'sawtooth', 2200 * k, h + dt, 0.045, 0.7 - i * 0.15, { f1: 140 * k, dec: 1, att: 0.0005 });
    L.burst(v, o, h + dt, 0.03, 0.3, 'highpass', 3000, 0.7, 'white2', r() * 3);
  });
  tone(v, o, 'sine', 95 * k, hb, 1.3 / k, 0.9, { f1: 24 * k, dec: 1, att: 0.003 });
  L.thump(v, o, hb, 120 * k, 45 * k, 0.3, 0.6, 0.05);
  nz(v, o, 'white2', h, 0.12, 0.25, { type: 'highpass', f: 4000, att: 0.001, off: r() * 3 });
});
sfx('rctHeal', 2.0, { var: true, duck: [1, 'dur'], rev: 0.45 }, (v, o, p, r, h, len) => { // warm shimmer, sparkles
  const k = p.pitch, E = a => [[0, 0], [Math.min(0.4, len / 3), a], [Math.max(len * 0.6, len - 0.6), a], [len, 0]];
  [[587.3, 0.05], [880, 0.04], [1318.5, 0.025]].forEach(([f, a]) => { tone(v, o, 'sine', f * k, h, len, a, { env: E(a) }); tone(v, o, 'sine', (f + 0.7) * k, h, len, a * 0.8, { env: E(a * 0.8) }); });
  const n = Math.max(4, Math.round(len * 6));
  for (let i = 0; i < n; i++) { const t = h + r() * Math.max(0.05, len - 0.2), f = (1800 + r() * 2700) * k; tone(v, o, 'sine', f, t, 0.06 + r() * 0.06, 0.03 + r() * 0.03, { dec: 1, att: 0.002 }); }
  const am = v.gain(0.8); am.connect(o); v.lfo(2, 0.15, am.gain);
  nz(v, am, 'pink', h, len, 0.05, { type: 'bandpass', f: 2000, q: 0.7, env: E(0.05), off: r() * 3 });
});
sfx('sixEyes', 1.2, { duck: [1.5, 0.5], rev: 0.45 }, (v, o, p, r, h) => { // crystalline focus: a Lydian glint upward
  const k = p.pitch;
  fmBell(v, o, 2637 * k, h, 1.0, 0.22, 3.5, 1.2); fmBell(v, o, 3951 * k, h + 0.03, 0.8, 0.13, 3.5, 1.0);
  nz(v, o, 'white2', h, 0.3, 0.15, { type: 'bandpass', q: 2, fpts: [[0, 1000 * k], [0.3, 8000 * k, 'e']], env: [[0, 0], [0.15, 0.15], [0.3, 0]], off: r() * 3 });
  [2349.3, 2637, 2960, 3322.4, 3520].forEach((f, i) => tone(v, o, 'sine', f * k, h + 0.02 + i * 0.025, 0.15, 0.05, { dec: 1, att: 0.001 }));
});

// ====================================================================================== DOMAINS
sfx('handSign', 0.35, { duck: [1, 0.2], rev: 0.15 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.burst(v, o, h, 0.025 / k, 0.5, 'bandpass', 2500 * k, 1.0, 'white', r() * 3);
  L.thump(v, o, h, 220 * k, 140 * k, 0.03, 0.4, 0.015);
  L.burst(v, o, h + 0.004, 0.02, 0.2, 'bandpass', 900 * k, 3, 'white', r() * 3);
});
sfx('domainBloom', 3.0, { pre: 0.4, var: true, duck: [4, 1.5], rev: 0.5, tail: 0.5 }, (v, o, p, r, h, len, pre) => {
  const k = p.pitch, t0 = h - pre;
  nz(v, o, 'white2', t0, pre, 0.35, { type: 'highpass', f: 2000, env: [[0, 0], [0.05, 0.003], [pre - 0.01, 0.35, 'e'], [pre, 0]], off: r() * 3 });
  tone(v, o, 'sine', 32 * k, h, len, 0.6, { f1: 45 * k, env: [[0, 0], [0.3, 0.6], [len * 0.7, 0.4], [len, 0]] });
  nz(v, o, 'white2', h, len, 0.4, { type: 'bandpass', q: 0.9, fpts: [[0, 300 * k], [len * 0.6, 6000 * k, 'e'], [len, 3000 * k, 'e']], env: [[0, 0], [0.15, 0.4], [len * 0.6, 0.25], [len, 0]], off: r() * 3 });
  [587.3, 740, 880, 1175, 1480, 1760].forEach((f, i) => tone(v, o, 'sine', f * k, h + i * 0.08, len - i * 0.08, 0.05, { f1: f * k * 1.03, env: [[0, 0], [0.3, 0.05], [(len - i * 0.08) * 0.8, 0.03], [len - i * 0.08, 0]] }));
  fmBell(v, o, 587.3 * k, h, 2.2, 0.2, 3.5, 1.5); fmBell(v, o, 880 * k, h + 0.05, 2.0, 0.14, 3.5, 1.4);
});
sfx('voidOpen', 3.5, { var: true, duck: [4, 'dur'], rev: 0.6, tail: 0.5 }, (v, o, p, r, h, len) => { // infinite space
  const k = p.pitch;
  [587.3, 659.3, 740, 830.6, 880, 1174.7, 1480, 1661.2].forEach((f, i) => tone(v, o, 'sine', f * k, h + i * 0.12, len - i * 0.12, 0.035, { env: [[0, 0], [0.8, 0.035], [(len - i * 0.12) * 0.8, 0.03], [len - i * 0.12, 0]] }));
  nz(v, o, 'pink', h, len, 0.12, { type: 'highpass', f: 2000, env: [[0, 0], [0.6, 0.12], [len * 0.7, 0.1], [len, 0]], off: r() * 3 });
  tone(v, o, 'sine', 55 * k, h, len * 0.8, 0.5, { f1: 28 * k, dec: 1, att: 0.01 });
  for (let i = 0; i < 30; i++) tone(v, o, 'sine', (2000 + r() * 5000) * k, h + 0.3 + r() * (len - 0.6), 0.02 + r() * 0.03, 0.02 + r() * 0.02, { dec: 1, att: 0.001 });
});
sfx('shrineRise', 3.5, { var: true, duck: [4, 'dur'], rev: 0.45, tail: 0.5 }, (v, o, p, r, h, len) => { // the Shrine rising
  const k = p.pitch;
  const am = v.gain(0.6); am.connect(o); v.lfo(4.3, 0.3, am.gain); v.lfo(6.9, 0.12, am.gain);
  nz(v, am, 'brown', h, len, 0.9, { type: 'lowpass', f: 200 * k, env: [[0, 0], [0.4, 0.9], [len * 0.8, 0.8], [len, 0]], off: r() * 3 });
  L.ring(v, o, h, 55 * k, [[1, 1, 1, 0.6], [2.2, 0.6, 0.6, 1.1], [3.1, 0.4, 0.4, 0], [4.4, 0.25, 0.3, 0]], 0.3, Math.min(len, 3), v.ctx.sampleRate);
  for (let i = 0; i < 3; i++) { // creaks: a slow pulse train through a narrow resonance
    const t = h + 0.4 + i * (len - 1) / 3 + r() * 0.3, d = 0.4 + r() * 0.4, bp = v.filt('bandpass', (500 + r() * 400) * k, 6), g = v.gain(0);
    bp.connect(g); g.connect(o);
    tone(v, bp, 'sawtooth', 30 + r() * 30, t, d, 1.0, { f1: 25 + r() * 20, lin: 1, env: [[0, 0], [0.05, 1], [d * 0.8, 0.8], [d, 0]] });
    v.env(g.gain, [[0, 0.5], [d, 0.5]], false, t);
  }
  tone(v, o, 'sine', 35 * k, h, len, 0.4, { f1: 55 * k, env: [[0, 0], [len * 0.5, 0.3], [len * 0.9, 0.4], [len, 0]] });
});
// Simple Domain wearing away (Act II): a fizzing crackle and a grinding, wavering band that grows as the ring is chewed,
// over a faint hum that sags in pitch. Variable length (cue `dur`).
sfx('erode', 3.0, { var: true, rev: 0.2 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [Math.min(0.4, len / 4), a * 0.6], [Math.max(0.45, len - 0.35), a], [len, 0]];
  playTex(v, o, 'crackle', 1, h, 0.5, { rate: 1.6 * k, dur: len, loop: true, off: r() * 2, env: E(0.5) });
  const am = v.gain(0.6); am.connect(o); v.lfo(11.3, 0.3, am.gain); v.lfo(3.1, 0.2, am.gain);
  nz(v, am, 'brown', h, len, 0.6, { type: 'bandpass', q: 3, fpts: [[0, 900 * k], [len, 480 * k, 'e']], env: E(0.6), off: r() * 3 });
  nz(v, o, 'white2', h, len, 0.07, { type: 'highpass', f: 5000, env: E(0.07), off: r() * 3 });
  tone(v, o, 'sine', 220 * k, h, len, 0.06, { f1: 196 * k, env: [[0, 0], [0.2, 0.06], [len * 0.7, 0.05], [len, 0]] });
});
sfx('barrierUp', 1.2, { duck: [2, 0.6], rev: 0.4 }, (v, o, p, r, h) => {
  const k = p.pitch;
  tone(v, o, 'sine', 300 * k, h, 0.9, 0.3, { f1: 1200 * k, fm: [9, 40 * k], env: [[0, 0], [0.1, 0.3], [0.8, 0.2], [0.9, 0]] });
  fmBell(v, o, 1760 * k, h + 0.35, 0.8, 0.18, 3.5, 1.4);
  tone(v, o, 'sine', 110 * k, h, 1.1, 0.25, { env: [[0, 0], [0.4, 0.25], [1.0, 0.15], [1.1, 0]] });
});
sfx('barrierCrack', 1.0, { duck: [2.5, 0.5], rev: 0.35 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.burst(v, o, h, 0.005, 0.8, 'highpass', 2000, 0.7, 'white2', r() * 3);
  const ticks = []; let t = 0.02; for (let i = 0; i < 6; i++) { ticks.push([t, 0.4 + r() * 0.6]); t += (0.07 - i * 0.009) / k; }
  ticks.forEach(([dt, a]) => L.burst(v, o, h + dt, 0.004, 0.45 * a, 'bandpass', (3000 + r() * 3000) * k, 1.5, 'white', r() * 3));
  tone(v, o, 'sine', 180 * k, h, 0.7 / k, 0.2, { f1: 160 * k, fm: [7, 5], env: [[0, 0], [0.05, 0.2], [0.6 / k, 0.1], [0.7 / k, 0]] });
  tone(v, o, 'sine', 4300 * k, h + 0.01, 0.45, 0.08, { dec: 1, att: 0.001 });
});
sfx('barrierShatter', 2.2, { duck: [5, 1.2], rev: 0.4 }, (v, o, p, r, h) => {
  const k = p.pitch;
  nz(v, o, 'white2', h, 0.25 / k, 0.8, { type: 'highpass', f: 1500 * k, att: 0.001, off: r() * 3 });
  playTex(v, o, 'shards', Math.floor(r() * 3), h + 0.01, 0.7, { rate: k, dur: 2.0 / k });
  L.thump(v, o, h, 110 * k, 50 * k, 0.4, 0.55, 0.06);
  [2640, 3960, 5280].forEach((f, i) => tone(v, o, 'sine', f * k, h + 0.01, 1.2 - i * 0.3, 0.05, { dec: 1, att: 0.001 }));
});
sfx('domainCollapse', 3.0, { var: true, duck: [5, 'dur'], rev: 0.4, tail: 0.5 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  nz(v, o, 'white2', h, 0.5, 0.5, { type: 'bandpass', q: 1, fpts: [[0, 6000], [0.5, 800, 'e']], env: [[0, 0], [0.05, 0.005], [0.49, 0.5, 'e'], [0.5, 0]], off: r() * 3 });
  L.thump(v, o, h + 0.5, 60 * k, 30 * k, 1.2, 0.9, 0.12);
  playTex(v, o, 'shards', 1, h + 0.5, 0.35, { rate: 0.6 * k, dur: Math.min(len - 0.5, 2.2 / 0.6) });
  nz(v, o, 'brown', h + 0.5, len - 0.5, 0.5, { type: 'lowpass', f: 140, env: [[0, 0], [0.1, 0.5], [len - 0.5, 0]], off: r() * 3 });
});
sfx('tallyTick', 0.3, { duck: [0.5, 0.2], rev: 0.2 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.clack(v, o, h, 0.6, r() * 3);
  fmBell(v, o, 2200 * k, h + 0.005, 0.22, 0.12, 3.5, 1);
});

// ====================================================================================== SHIKIGAMI
sfx('wheelClunk', 2.0, { duck: [3, 0.8], rev: 0.35 }, (v, o, p, r, h) => { // Mahoraga's wheel: clunk + massive ring
  const k = p.pitch;
  L.clunk(v, o, h, 110 * k, 1.0, 1.8 / Math.sqrt(k), v.ctx.sampleRate, r() * 3);
  L.burst(v, o, h, 0.12, 0.5, 'lowpass', 180 * k, 0.7, 'brown', r() * 3, 0.002);
  playTex(v, o, 'crackle', 0, h + 0.02, 0.18, { rate: 0.7 * k, dur: 0.25 });
});
sfx('wheelTurn', 1.2, { var: true, duck: [1.5, 'dur'], rev: 0.3 }, (v, o, p, r, h, len) => { // ratchet + grind + whine
  const k = p.pitch, ticks = [];
  for (let t = 0.01; t < len - 0.03;) { const u = t / len, rate = 8 + 14 * Math.sin(Math.PI * u); ticks.push([t, 0.6 + r() * 0.4]); t += 1 / (rate * k); }
  const n = v.at(v.noise('white', r() * 3), h, h + len + 0.02), bp = v.filt('bandpass', 2400 * k, 1.6), g = v.gain(0);
  n.connect(bp); bp.connect(g); g.connect(o); v.env(g.gain, pulses(ticks, 0.006, 0.6), true, h);
  const am = v.gain(0.6); am.connect(o); v.lfo(5.3, 0.3, am.gain);
  nz(v, am, 'brown', h, len, 0.5, { type: 'bandpass', f: 150 * k, q: 1, env: [[0, 0], [0.1, 0.5], [len - 0.1, 0.5], [len, 0]], off: r() * 3 });
  tone(v, o, 'sine', 400 * k, h, len, 0.04, { f1: 620 * k, lin: 1, env: [[0, 0], [0.2, 0.04], [len, 0]] });
});
sfx('mahoStep', 0.8, { duck: [2, 0.4], rev: 0.2 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.thump(v, o, h, 55 * k, 35 * k, 0.35 / k, 1.0, 0.08 / k);
  L.burst(v, o, h, 0.06, 0.45, 'bandpass', 500 * k, 0.9, 'white2', r() * 3);
  playTex(v, o, 'debris', 2, h + 0.02, 0.15, { rate: 1.2 * k, dur: 0.4 });
});
sfx('swordRing', 2.2, { duck: [2, 0.8], rev: 0.45 }, (v, o, p, r, h) => { // the Sword of Extermination
  const k = p.pitch;
  L.ring(v, o, h, 1100 * k, [[1, 1, 1, 1.4], [2.36, 0.7, 0.75, 2.6], [3.64, 0.45, 0.55, 0], [5.55, 0.28, 0.4, 3.3]], 0.14, 1.8 / Math.sqrt(k), v.ctx.sampleRate);
  nz(v, o, 'white2', h, 0.03, 0.3, { type: 'highpass', f: 6000, att: 0.001, off: r() * 3 });
  tone(v, o, 'sine', 7000 * k, h, 0.1, 0.05, { f1: 7600 * k, dec: 1, att: 0.001 });
});
sfx('mahoSlash', 0.9, { duck: [3, 0.6], rev: 0.3 }, (v, o, p, r, h) => {
  const k = p.pitch;
  whoosh(v, o, h, 0.35 / k, 250 * k, 1800 * k, 400 * k, 0.6, 0.9, 0.7, r() * 3);
  L.burst(v, o, h + 0.3 / k, 0.008, 0.6, 'highpass', 2500, 0.7, 'white2', r() * 3);
  L.ring(v, o, h + 0.3 / k, 520 * k, [[1, 1, 1, 1.2], [2.36, 0.5, 0.6, 0], [3.64, 0.3, 0.4, 0]], 0.14, 0.55, v.ctx.sampleRate);
  L.thump(v, o, h + 0.3 / k, 100 * k, 50 * k, 0.25, 0.5, 0.05);
});
sfx('shadowRise', 2.0, { var: true, duck: [2.5, 'dur'], rev: 0.4 }, (v, o, p, r, h, len) => { // rising out of the shadow
  const k = p.pitch;
  for (let i = 0; i < 20; i++) tone(v, o, 'sine', (80 + r() * 120) * k, h + r() * Math.max(0.05, len - 0.15), 0.08 + r() * 0.06, 0.1 + r() * 0.08, { f1: (120 + r() * 160) * k, dec: 1, att: 0.004 });
  tone(v, o, 'sine', 40 * k, h, len, 0.45, { f1: 70 * k, env: [[0, 0], [len * 0.8, 0.45], [len, 0]] });
  nz(v, o, 'brown', h, len, 0.6, { type: 'lowpass', fpts: [[0, 100], [len, 900, 'e']], env: [[0, 0], [0.1, 0.01], [len * 0.9, 0.6, 'e'], [len, 0]], off: r() * 3 });
  [146.8, 155.6, 220].forEach(f => tone(v, o, 'sine', f * k, h, len, 0.04, { env: [[0, 0], [len * 0.9, 0.04], [len, 0]] }));
});
sfx('agitoSpark', 0.5, { duck: [1.5, 0.3], rev: 0.2 }, (v, o, p, r, h) => { // electric crackle zap
  const k = p.pitch;
  [0, 0.06 + r() * 0.04].forEach(dt => tone(v, o, 'sawtooth', 2000 * k, h + dt, 0.04, 0.3, { f1: 150 * k, dec: 1, att: 0.0005 }));
  playTex(v, o, 'crackle', 1, h, 0.5, { rate: 1.5 * k, dur: 0.3, off: r() });
  const lp = v.filt('lowpass', 800, 0.8); lp.connect(o);
  tone(v, lp, 'square', 60 * k, h, 0.18, 0.12, { dec: 1, att: 0.002 });
});
sfx('rabbitSwarm', 2.5, { var: true, duck: [2, 'dur'], rev: 0.25 }, (v, o, p, r, h, len) => { // hundreds of small feet + fur
  const k = p.pitch, E = a => [[0, 0], [Math.min(0.4, len / 3), a], [Math.max(len * 0.6, len - 0.5), a], [len, 0]];
  playTex(v, o, 'patter', 0, h, 0.8, { rate: k, dur: len, loop: true, off: r() * 2, env: E(0.8) });
  const am = v.gain(0.5); am.connect(o); v.lfo(13, 0.25, am.gain); v.lfo(7.3, 0.2, am.gain);
  nz(v, am, 'white2', h, len, 0.12, { type: 'bandpass', f: 3000 * k, q: 1.2, env: E(0.12), off: r() * 3 });
});
sfx('waterJet', 1.5, { var: true, duck: [3, 'dur'], rev: 0.3 }, (v, o, p, r, h, len) => { // pressurized jet + splash
  const k = p.pitch, E = a => [[0, 0], [0.05, a], [Math.max(0.06, len - 0.3), a * 0.9], [len, 0]];
  nz(v, o, 'white2', h, len, 0.55, { type: 'highpass', f: 1500 * k, type2: 'lowpass', f2: 9000, env: E(0.55), off: r() * 3 });
  const am = v.gain(0.6); am.connect(o); v.lfo(6.1, 0.35, am.gain);
  nz(v, am, 'brown', h, len, 0.6, { type: 'lowpass', f: 450 * k, env: E(0.6), off: r() * 3 });
  nz(v, o, 'white2', h + len - 0.25, 0.45, 0.45, { type: 'lowpass', f: 4000 * k, att: 0.005, off: r() * 3 });
  for (let i = 0; i < 8; i++) { const t = h + len - 0.2 + r() * 0.4, f = (1400 + r() * 2000) * k; tone(v, o, 'sine', f, t, 0.03, 0.06, { f1: f * 1.6, att: 0.001 }); }
});

// ====================================================================================== ENVIRONMENT
sfx('windGust', 3.0, { var: true, rev: 0.1 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  nz(v, o, 'pink', h, len, 0.6, { type: 'bandpass', q: 0.9, fpts: [[0, 350 * k], [len * 0.45, 900 * k, 'e'], [len, 450 * k, 'e']], env: [[0, 0], [len * 0.4, 0.6], [len * 0.6, 0.45], [len, 0]], off: r() * 3 });
  nz(v, o, 'brown', h, len, 0.35, { type: 'lowpass', f: 400 * k, env: [[0, 0], [len * 0.5, 0.35], [len, 0]], off: r() * 3 });
  nz(v, o, 'white2', h, len, 0.03, { type: 'bandpass', q: 6, fpts: [[0, 1600 * k], [len * 0.5, 2300 * k, 'e'], [len, 1800 * k, 'e']], env: [[0, 0], [len * 0.45, 0.03], [len, 0]], off: r() * 3 });
});
// Japanese pedestrian signal ("piyo piyo"): an electronic bird-like chirp from a small piezo speaker, in pairs, repeating.
// No public spec was found for the exact tones; designed by ear: ~3.3 → 2.2 kHz descending, ~0.1 s, pairs 0.19 s apart,
// every ~1.1 s. A square wave through a band-pass stands in for the piezo.
function piyo(v, o, t, k, a) {
  const bp = v.filt('bandpass', 2600 * k, 1.2), g = v.gain(0); bp.connect(g); g.connect(o);
  tone(v, bp, 'square', 3300 * k, t, 0.1, 1, { pts: [[0, 3300 * k], [0.09, 2200 * k, 'e'], [0.1, 2150 * k]], fm: [32, 60 * k], env: [[0, 0], [0.004, 1], [0.1, 1]] });
  v.env(g.gain, [[0, 0], [0.004, a], [0.08, a * 0.8], [0.1, 0]], true, t);
}
AU.piyo = piyo;
sfx('crosswalkChirp', 2.0, { var: true, rev: 0.3 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  for (let t = 0; t < len - 0.3; t += 1.1 / k) [0, 0.19].forEach(dt => piyo(v, o, h + t + dt / k, k, 0.22));
});
sfx('signalTick', 0.25, { rev: 0.15 }, (v, o, p, r, h) => { // relay click in the signal box
  const k = p.pitch;
  L.burst(v, o, h, 0.003, 0.5, 'highpass', 2000, 0.7, 'white', r() * 3);
  tone(v, o, 'sine', 1600 * k, h, 0.012, 0.2, { dec: 1, att: 0.0005 });
  tone(v, o, 'sine', 400 * k, h + 0.002, 0.03, 0.15, { dec: 1, att: 0.001 });
});
sfx('canRoll', 2.5, { var: true, duck: [1, 'dur'], rev: 0.2 }, (v, o, p, r, h, len) => { // empty aluminium can on asphalt
  const k = p.pitch, hits = [];
  for (let t = 0.01; t < len - 0.2;) { const u = t / len; hits.push([t, (0.4 + r() * 0.6) * (1 - 0.6 * u)]); t += (1 / (7 - 3.5 * u)) * (0.8 + r() * 0.4) / k; }
  hits.push([len - 0.15, 0.5]); // the stop
  const env = hitsEnv(hits, 0.25);
  [[930, 0.5], [1480, 0.35], [2390, 0.25], [3350, 0.15], [4410, 0.08]].forEach(([f, a]) => {
    const x = v.at(v.osc('sine', f * k), h, h + len + 0.26), g = v.gain(0); x.connect(g); g.connect(o);
    v.env(g.gain, env.map(q => [q[0], q[1] * a * 0.4, q[2]]), true, h);
  });
  nz(v, o, 'pink', h, len, 0.08, { type: 'bandpass', f: 1100 * k, q: 1.5, env: [[0, 0], [0.05, 0.08], [len * 0.8, 0.05], [len, 0]], off: r() * 3 });
});
sfx('glassShatter', 1.8, { duck: [3, 0.8], rev: 0.3 }, (v, o, p, r, h) => {
  const k = p.pitch;
  nz(v, o, 'white2', h, 0.25 / k, 0.6, { type: 'highpass', f: 1200 * k, att: 0.001, off: r() * 3 });
  playTex(v, o, 'shards', Math.floor(r() * 3), h + 0.005, 0.75, { rate: k, dur: 1.7 / k });
  L.thump(v, o, h, 150 * k, 80 * k, 0.12, 0.3, 0.03);
});
sfx('glassTinkle', 1.2, { rev: 0.35 }, (v, o, p, r, h) => { // a few falling pieces: the sparse tail of a shatter
  playTex(v, o, 'shards', Math.floor(r() * 3), h, 0.6, { rate: p.pitch, off: 0.7 + r() * 0.3, dur: 1.1 / p.pitch });
});
sfx('buildingSlide', 4.0, { var: true, duck: [4, 'dur'], rev: 0.35, tail: 0.5 }, (v, o, p, r, h, len) => { // a cut tower sliding
  const k = p.pitch, E = a => [[0, 0], [len * 0.2, a * 0.6], [len * 0.8, a], [len, 0]];
  const am = v.gain(0.65); am.connect(o); v.lfo(0.7, 0.2, am.gain); v.lfo(2.3, 0.1, am.gain);
  nz(v, am, 'brown', h, len, 1.0, { type: 'bandpass', q: 0.9, fpts: [[0, 120 * k], [len, 300 * k, 'e']], env: E(1.0), off: r() * 3 });
  playTex(v, o, 'crackle', 2, h, 0.35, { rate: 0.7 * k, dur: len, loop: true, off: r() * 2, env: E(0.35) });
  const bp = v.filt('bandpass', 300 * k, 4); bp.connect(o);
  tone(v, bp, 'sawtooth', 85 * k, h, len, 0.5, { f1: 70 * k, fm: [3.3, 4], env: E(0.5) });
  playTex(v, o, 'debris', Math.floor(r() * 3), h + len * 0.5, 0.3, { rate: 0.9 * k, dur: len * 0.5 });
});
sfx('collapse', 4.0, { var: true, duck: [6, 'dur'], rev: 0.35, tail: 0.5 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  nz(v, o, 'brown', h, len, 0.9, { type: 'lowpass', f: 120 * k, env: [[0, 0], [0.3, 0.9], [len * 0.7, 0.7], [len, 0]], off: r() * 3 });
  playTex(v, o, 'debris', 0, h, 0.6, { rate: k, dur: len, loop: true, env: [[0, 0], [0.2, 0.6], [len * 0.8, 0.4], [len, 0]] });
  for (let i = 0; i < 5; i++) { const t = h + r() * len * 0.7; L.thump(v, o, t, (70 + r() * 30) * k, 35 * k, 0.6, 0.6, 0.08); L.burst(v, o, t, 0.12, 0.4, 'bandpass', (500 + r() * 800) * k, 0.8, 'white2', r() * 3); }
  playTex(v, o, 'shards', 2, h + 0.3, 0.25, { rate: k, dur: Math.min(len - 0.3, 1.8) });
});
sfx('rubble', 2.0, { var: true, rev: 0.25 }, (v, o, p, r, h, len) => { // settling rubble: sparse falls + dust
  const k = p.pitch;
  playTex(v, o, 'debris', 1, h, 0.4, { rate: k, dur: len, loop: true, off: 1.2 + r() * 1.2, env: [[0, 0], [0.05, 0.4], [len - 0.2, 0.3], [len, 0]] });
  nz(v, o, 'pink', h, len, 0.05, { type: 'highpass', f: 3000, env: [[0, 0], [0.3, 0.05], [len, 0]], off: r() * 3 });
});
sfx('rumble', 3.0, { var: true, duck: [2, 'dur'], rev: 0.2 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [len * 0.3, a], [len * 0.7, a], [len, 0]];
  nz(v, o, 'brown', h, len, 0.9, { type: 'lowpass', f: 120 * k, env: E(0.9), off: r() * 3 });
  tone(v, o, 'sine', 36 * k, h, len, 0.3, { env: E(0.3) }); tone(v, o, 'sine', 41 * k, h, len, 0.22, { env: E(0.22) });
});
sfx('quake', 3.0, { var: true, duck: [3, 'dur'], rev: 0.2 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.4, a], [len * 0.7, a * 0.8], [len, 0]];
  const am = v.gain(0.6); am.connect(o); v.lfo(4.7, 0.3, am.gain); v.lfo(6.9, 0.12, am.gain);
  [26, 33, 44].forEach(f => tone(v, am, 'sine', f * k, h, len, 0.35, { env: E(0.35) }));
  nz(v, am, 'brown', h, len, 0.7, { type: 'lowpass', f: 90 * k, env: E(0.7), off: r() * 3 });
  playTex(v, o, 'crackle', 0, h, 0.3, { rate: 1.3 * k, dur: len, loop: true, off: r() * 2, env: E(0.3) });
  tone(v, o, 'sawtooth', 58 * k, h + len * 0.3, len * 0.6, 0.1, { f1: 48 * k, fm: [2.1, 3], env: [[0, 0], [len * 0.3, 0.1], [len * 0.6, 0]] });
});
sfx('fireCrackle', 3.0, { var: true, rev: 0.2 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.3, a], [Math.max(0.35, len - 0.4), a], [len, 0]];
  playTex(v, o, 'crackle', Math.floor(r() * 3), h, 0.7, { rate: k, dur: len, loop: true, off: r() * 2, env: E(0.7) });
  const am = v.gain(0.7); am.connect(o); v.lfo(3.1, 0.2, am.gain); v.lfo(7.7, 0.1, am.gain);
  nz(v, am, 'brown', h, len, 0.45, { type: 'lowpass', f: 350 * k, env: E(0.45), off: r() * 3 });
});
sfx('carAlarm', 4.0, { var: true, rev: 0.45 }, (v, o, p, r, h, len) => { // a whooping alarm somewhere in the wreckage
  const k = p.pitch, lp = v.filt('lowpass', 2500, 0.9); lp.connect(o);
  const x = v.at(v.osc('square', 1050 * k), h, h + len + 0.02), g = v.gain(0); x.connect(g); g.connect(lp);
  const lf = v.at(v.osc('triangle', 3), h, h + len + 0.02), lg = v.gain(350 * k); lf.connect(lg); lg.connect(x.frequency);
  v.env(g.gain, [[0, 0], [0.02, 0.18], [len - 0.03, 0.18], [len, 0]], true, h);
});
sfx('steelGroan', 2.5, { var: true, duck: [1.5, 'dur'], rev: 0.35 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [len * 0.3, a], [len * 0.8, a * 0.8], [len, 0]];
  const bp = v.filt('bandpass', 240 * k, 5); bp.connect(o);
  tone(v, bp, 'sawtooth', 90 * k, h, len, 0.6, { f1: 68 * k, fm: [3.3, 4], env: E(0.6) });
  tone(v, o, 'sine', 90 * k, h, len, 0.2, { f1: 68 * k, env: E(0.2) });
  nz(v, o, 'brown', h, len, 0.35, { type: 'bandpass', q: 8, fpts: [[0, 200 * k], [len, 320 * k, 'e']], env: E(0.35), off: r() * 3 });
  const bq = v.filt('bandpass', 700 * k, 5); bq.connect(o);
  tone(v, bq, 'sawtooth', 28, h + len * 0.4, len * 0.35, 0.5, { f1: 22, lin: 1, env: [[0, 0], [0.05, 0.5], [len * 0.35, 0]] });
});
sfx('sparkPop', 0.4, { rev: 0.15 }, (v, o, p, r, h) => {
  const k = p.pitch;
  for (let i = 0; i < 3; i++) L.burst(v, o, h + r() * 0.12, 0.003, 0.5, 'bandpass', (2000 + r() * 3000) * k, 1.2, 'white', r() * 3);
  tone(v, o, 'sawtooth', 3000 * k, h, 0.025, 0.2, { f1: 200 * k, dec: 1, att: 0.0005 });
});
// Crow (Mei Mei's feed): "kaa kaa". Measured crow calls: f0 ≈ 400 Hz (modulated), harmonics 1–2.5 kHz dominant, many
// calls pulsed at 30–50 pulses/s. Here: sawtooth harmonics with an inflected pitch + jitter, a 38 Hz pulsing (the
// rasp) and ONE broad emphasis near 2 kHz — not a vowel pattern — plus a little noise.
function caw(v, o, t, f0, d, a, r) {
  const src = v.gain(1), bp = v.filt('bandpass', 2200, 1.6), hp = v.filt('highpass', 700, 0.7), am = v.gain(0.5), g = v.gain(0);
  src.connect(bp); bp.connect(hp); hp.connect(am); am.connect(g); g.connect(o);
  const pl = v.at(v.osc('square', 38), t, t + d + 0.02), pg = v.gain(0.45); pl.connect(pg); pg.connect(am.gain);
  const x = tone(v, src, 'sawtooth', f0, t, d, 1, { pts: [[0, f0 * 0.92], [0.05, f0 * 1.05], [d * 0.7, f0], [d, f0 * 0.85]], env: [[0, 0], [0.01, 1], [d, 1]] });
  const jt = v.at(v.osc('sine', 23), t, t + d + 0.02), jg = v.gain(6); jt.connect(jg); jg.connect(x.frequency);
  nz(v, src, 'white', t, d, 0.12, { type: 'bandpass', f: 1800, q: 1.5, env: [[0, 0], [0.01, 0.12], [d, 0.1]], off: r() * 3 });
  v.env(g.gain, [[0, 0], [0.02, a], [d * 0.8, a * 0.8], [d, 0]], true, t);
}
sfx('crowCaw', 0.9, { rev: 0.35 }, (v, o, p, r, h) => {
  const k = p.pitch;
  caw(v, o, h, 400 * k, 0.28 / k, 0.35, r);
  caw(v, o, h + 0.42 / k, 380 * k, 0.3 / k, 0.3, r);
});
function footstep(v, o, t, k, a, r, snow) {
  if (snow) { playTex(v, o, 'crunch', Math.floor(r() * 3), t, 0.55 * a, { rate: k * (0.9 + r() * 0.2) }); L.thump(v, o, t, 90 * k, 60 * k, 0.08, 0.25 * a, 0.03); return; }
  L.burst(v, o, t, 0.008, 0.45 * a, 'bandpass', 2500 * k, 1.2, 'white', r() * 3);
  L.thump(v, o, t, 110 * k, 70 * k, 0.05, 0.4 * a, 0.02);
  L.burst(v, o, t + 0.01, 0.06, 0.12 * a, 'bandpass', 1200 * k, 0.9, 'pink', r() * 3, 0.005);
}
sfx('footConcrete', 0.3, { var: true }, (v, o, p, r, h, len) => { // one step, or steps every 0.52 s for `dur`
  for (let t = 0, i = 0; t < Math.max(0.01, len - 0.25); t += 0.52 / p.pitch, i++) footstep(v, o, h + t, p.pitch, i % 2 ? 0.8 : 1, r, false);
});
sfx('footSnow', 0.4, { var: true }, (v, o, p, r, h, len) => {
  for (let t = 0, i = 0; t < Math.max(0.01, len - 0.35); t += 0.55 / p.pitch, i++) footstep(v, o, h + t, p.pitch, i % 2 ? 0.8 : 1, r, true);
});
sfx('clothSnap', 0.3, { rev: 0.1 }, (v, o, p, r, h) => { // a garment shed with a snap
  const k = p.pitch;
  const n = v.at(v.noise('white', r() * 3), h, h + 0.08), bp = v.filt('bandpass', 1500 * k, 1.0), g = v.gain(0);
  n.connect(bp); bp.connect(g); g.connect(o);
  v.env(g.gain, [[0, 0], [0.002, 0.5], [0.01, 0.1], [0.013, 0.45], [0.022, 0.08], [0.026, 0.35], [0.06, 0.001, 'e'], [0.061, 0]], true, h);
  L.burst(v, o, h + 0.024, 0.004, 0.3, 'highpass', 3000, 0.7, 'white', r() * 3);
});
sfx('clothFlutter', 2.0, { var: true, rev: 0.1 }, (v, o, p, r, h, len) => {
  const k = p.pitch, am = v.gain(0.5); am.connect(o); v.lfo(8.7, 0.3, am.gain); v.lfo(13.1, 0.2, am.gain);
  nz(v, am, 'white2', h, len, 0.35, { type: 'bandpass', q: 1.1, fpts: [[0, 700 * k], [len * 0.5, 1500 * k, 'e'], [len, 900 * k, 'e']], env: [[0, 0], [0.2, 0.35], [len - 0.2, 0.3], [len, 0]], off: r() * 3 });
});
sfx('dropSoft', 0.8, { rev: 0.15 }, (v, o, p, r, h) => { // something light lands in snow (the scarf)
  const k = p.pitch;
  L.burst(v, o, h, 0.15, 0.5, 'lowpass', 400 * k, 0.7, 'brown', r() * 3, 0.01);
  L.burst(v, o, h + 0.02, 0.3, 0.06, 'highpass', 3000, 0.7, 'white2', r() * 3, 0.02);
});

// ====================================================================================== METAL, AIR, FRICTION (Act III)
// Steel pole (the traffic signal): a long thin-walled steel tube. Its bending modes follow the free-free beam
// (Euler–Bernoulli: frequencies ∝ (βₙL)², ratios 1 : 2.756 : 5.404 : 8.933 : 13.34 : 18.64 : 24.81 : 31.87 — the series of
// xylophone bars and tubular chimes; Fletcher & Rossing, The Physics of Musical Instruments, 1998, §2), each a slowly
// beating doublet (a real tube is not perfectly round), over a few short, bright wall ("ring") modes. Estimate for a 6 m,
// Ø 0.2 m steel pole: f₁ ≈ 35 Hz; f₁ = 62 Hz is used so the audible clang (modes 3–7) sits at 335–1540 Hz (a shorter,
// stiffer arm — an assumed, not measured, value). Higher modes decay faster (T ∝ f^−0.5).
const BEAM = [1, 2.7565, 5.4039, 8.933, 13.3444, 18.6379, 24.8134, 31.8712, 39.812, 48.6352], BEAM_W = [0.3, 0.75, 1.0, 0.9, 0.75, 0.6, 0.5, 0.4, 0.3, 0.22];
// hits = [[t, amp], …] (relative to t0); per-hit mode weights vary (a different contact point excites different modes)
function steelModes(v, o, t0, f1, hits, amp, r, Tlow, from) {
  const nyq = v.ctx.sampleRate * 0.45, end = hits[hits.length - 1][0];
  for (let n = from || 0; n < BEAM.length; n++) {
    const f = f1 * BEAM[n] * (1 + 0.004 * (r() - 0.5)); if (f > nyq) break;
    const T = clamp(Tlow * Math.sqrt(f1 * BEAM[1] / f), 0.08, Tlow * 1.2), split = 0.3 + 1.2 * r();
    const list = hits.map(([t, a]) => [t, a * BEAM_W[n] * (hits.length > 1 ? 0.45 + 1.1 * r() : 0.7 + 0.6 * r())]);
    const env = hitsEnv(list, T);
    [[f, 0.6], [f + split, 0.4]].forEach(([ff, w]) => {
      const x = v.at(v.osc('sine', ff), t0, t0 + end + T + 0.05), g = v.gain(0); x.connect(g); g.connect(o);
      v.env(g.gain, env.map(q => [q[0], q[1] * w * amp, q[2]]), true, t0);
    });
  }
}
function wallModes(v, o, t0, k, hits, amp, r) { // the tube wall's ring modes: bright, short
  const end = hits[hits.length - 1][0];
  for (let j = 0; j < 5; j++) {
    const f = (2100 + r() * 3400) * k, T = 0.2 + 0.4 * r(), env = hitsEnv(hits.map(([t, a]) => [t, a * (0.4 + 0.6 * r())]), T);
    const x = v.at(v.osc('sine', f), t0, t0 + end + T + 0.05), g = v.gain(0); x.connect(g); g.connect(o);
    v.env(g.gain, env.map(q => [q[0], q[1] * amp, q[2]]), true, t0);
  }
}
function poleStrike(v, o, t, k, a, r) { // the contact: a hard metallic tick + the weight behind it
  L.burst(v, o, t, 0.005, 0.5 * a, 'bandpass', 3200 * k, 0.8, 'white', r() * 3);
  L.burst(v, o, t, 0.002, 0.3 * a, 'highpass', 6000, 0.7, 'white', r() * 3);
  L.thump(v, o, t, 170 * k, 80 * k, 0.07, 0.35 * a, 0.025);
}
// poleClang: no dur = one free clang (rings ~1.6 s) · dur ≤ 1 s = a gripped / body-damped clang ringing about `dur` ·
// dur > 1 s = the pole falls flat and clatters for `dur`: bounces shrink by the restitution coefficient e each time
// (Δtₙ₊₁ = e·Δtₙ, amplitude ∝ e — the bouncing-ball law; cf. arXiv physics/0210092), both ends landing a few tens of ms
// apart, then a short roll and the settle, with asphalt grit.
sfx('poleClang', 1.6, { var: true, duck: [3, 0.6], rev: 0.35, tail: 1.0 }, (v, o, p, r, h, len) => {
  const k = p.pitch, f1 = 62 * k;
  if (p.dur == null || len <= 1.0) {
    const T = p.dur == null ? 1.6 : Math.max(0.15, len * 0.9);
    poleStrike(v, o, h, k, 1, r);
    steelModes(v, o, h, f1, [[0.003, 1]], 0.2, r, T, 1);            // (hitsEnv skips hits within 1.5 ms of 0)
    wallModes(v, o, h, k, [[0.003, 1]], 0.12, r);
    return;
  }
  const e = 0.58 + 0.08 * r(), hits = [];
  let t = 0.003, dt = 0.2 + 0.06 * r(), a = 1;
  while (t < len - 0.45 && a > 0.05) {
    hits.push([t, a]); const lag = 0.015 + 0.035 * r(); hits.push([t + lag, a * (0.35 + 0.3 * r())]);  // the other end lands
    t += dt; dt *= e; a *= e; if (dt < 0.018) break;
  }
  const r0 = t;                                                                  // the roll: fast small ticks, dying
  for (let q = 0; q < 10 && t < len - 0.2; q++) { hits.push([t, 0.06 * (1 - q / 10)]); t += 0.035 + 0.02 * r(); }
  steelModes(v, o, h, f1, hits, 0.2, r, 1.1, 1);
  wallModes(v, o, h, k, hits, 0.12, r);
  hits.forEach(([ht, ha]) => { if (ha > 0.12) poleStrike(v, o, h + ht, k, ha, r); });
  nz(v, o, 'pink', h, Math.min(0.35, len), 0.16, { type: 'bandpass', f: 1600 * k, q: 0.9, off: r() * 3 });   // asphalt grit
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.02, 0.12, { rate: 1.4 * k, dur: Math.min(1.2, r0 + 0.3) });
});
// poleRing: the pole held still in the Infinity — no contact, so no strike: its upper bending modes and the wall modes
// swell in over 12 ms and ring (キィン), bending down a hair like the Infinity's own ring (infinityStop).
sfx('poleRing', 2.2, { var: true, rev: 0.45 }, (v, o, p, r, h, len) => {
  const k = p.pitch, f1 = 62 * k;
  const sm = v.gain(1); sm.connect(o);
  const nyq = v.ctx.sampleRate * 0.45;
  for (let n = 3; n < BEAM.length; n++) {
    const f = f1 * BEAM[n]; if (f > nyq) break;
    const T = clamp(len * Math.sqrt(f1 * BEAM[3] / f), 0.2, len), a = BEAM_W[n] * 0.22 * (0.7 + 0.6 * r());
    [[f, 0.6], [f + 0.4 + r(), 0.4]].forEach(([ff, w]) => tone(v, sm, 'sine', ff, h, T, a * w, { f1: ff * 0.994, env: [[0, 0], [0.012, a * w], [T, a * w * 0.001, 'e'], [T + 0.01, 0]] }));
  }
  wallModes(v, o, h, k, [[0.012, 0.6]], 0.05, r);
});
// metalWhoosh: a torn-out pole spinning through the air: the whoosh swells and falls with the pass (Doppler: brighter
// coming, duller going), chopped by the rotation (a long object presents the same profile twice per turn: ~7 whomps/s at
// ~3.5 rev/s — assumed), a low vortex hum, and the faint ring of the still-vibrating steel sliding down with the pass.
sfx('metalWhoosh', 0.5, { var: true, duck: [1.5, 'dur'], rev: 0.15 }, (v, o, p, r, h, len) => {
  const k = p.pitch, d = sweepPan(v, o, p, h, len, -0.6, 0.6), am = v.gain(0.55); am.connect(d);
  const lf = v.at(v.osc('sine', 7 * k), h, h + len + 0.03), lg = v.gain(0.45); lf.connect(lg); lg.connect(am.gain);
  whoosh(v, am, h, len, 700 * k, 1600 * k, 500 * k, 0.6, 1.0, 0.55, r() * 3);
  nz(v, am, 'brown', h, len, 0.28, { type: 'lowpass', f: 380 * k, env: [[0, 0], [len * 0.55, 0.28], [len, 0]], off: r() * 3 });
  tone(v, am, 'sine', 78 * k, h, len, 0.06, { f1: 64 * k, env: [[0, 0], [len * 0.55, 0.06], [len, 0]] });
  [5, 6, 7].forEach((n, i) => tone(v, d, 'sine', 62 * BEAM[n - 1] * k * 1.02, h, len, 0.025 / (i + 1), { f1: 62 * BEAM[n - 1] * k * 0.98, env: [[0, 0], [len * 0.5, 0.025 / (i + 1)], [len, 0]] }));
});
// redWhistle: the returning Red — a whistle that follows its curve: out and round (pitch and level sag as it swings away),
// then back at him (the Doppler rise of an approaching source, f′ = f·c / (c − v_r)), ending on the hit. A flutter
// (9 Hz, ±0.8 %) and a thin sizzle keep it energy, not a kettle. Pan follows the arc unless the cue sets panTo.
sfx('redWhistle', 3.0, { var: true, duck: [1.5, 'dur'], rev: 0.25 }, (v, o, p, r, h, len) => {
  const k = p.pitch, f0 = 1500 * k; len = Math.max(0.6, len);
  const F = [[0, f0], [len * 0.35, f0 * 0.78, 'e'], [len * 0.75, f0 * 1.05, 'e'], [len, f0 * 1.45, 'e']];
  const A = [[0, 0], [0.12, 0.35], [len * 0.35, 0.22], [len * 0.8, 0.7], [len - 0.03, 1], [len, 0]];
  let d = o;
  if (p.panTo === p.pan) { const pn = v.pan(0.55); pn.connect(o); v.env(pn.pan, [[0, 0.55], [len * 0.4, -0.45], [len * 0.8, 0.1], [len, -0.1]], false, h); d = pn; }
  const g = v.gain(0); g.connect(d); v.env(g.gain, A, true, h);
  const x = v.at(v.osc('sine', f0), h, h + len + 0.03), x2 = v.at(v.osc('sine', 2 * f0), h, h + len + 0.03), g2 = v.gain(0.22);
  v.env(x.frequency, F, false, h); v.env(x2.frequency, F.map(q => [q[0], q[1] * 2, q[2]]), false, h);
  const fl = v.at(v.osc('sine', 9), h, h + len + 0.03), fg = v.gain(f0 * 0.008), fg2 = v.gain(f0 * 0.016); fl.connect(fg); fl.connect(fg2); fg.connect(x.frequency); fg2.connect(x2.frequency);
  const xg = v.gain(0.3); x.connect(xg); xg.connect(g); x2.connect(g2); g2.connect(g);
  const n = v.at(v.noise('white2', r() * 3), h, h + len + 0.03), bp = v.filt('bandpass', f0, 7), ng = v.gain(0.5);
  v.env(bp.frequency, F, false, h); n.connect(bp); bp.connect(ng); ng.connect(g);
  const s = v.at(v.noise('white', r() * 3), h, h + len + 0.03), hp = v.filt('highpass', 5500, 0.7), sg = v.gain(0.05);
  s.connect(hp); hp.connect(sg); sg.connect(g); v.lfo(23, 0.04, sg.gain);
});
// concreteGrind: a body dragged through a concrete facade — the grinding rumble (stick-slip: irregular 9–14 Hz surging,
// cf. the friction models of Avanzini, Serafin & Rocchesso 2005), the gritty scrape, chunks breaking off and pattering down.
sfx('concreteGrind', 1.8, { var: true, duck: [2, 'dur'], rev: 0.25 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.08, a], [len * 0.75, a * 0.85], [len, 0]];
  const am = v.gain(0.6); am.connect(o); v.lfo(9.3 * k, 0.3, am.gain); v.lfo(13.7 * k, 0.18, am.gain);
  nz(v, am, 'brown', h, len, 0.7, { type: 'bandpass', f: 150 * k, q: 0.8, env: E(0.7), off: r() * 3 });
  const jt = v.gain(0.55); jt.connect(o); v.lfo(31 * k, 0.4, jt.gain);
  nz(v, jt, 'white2', h, len, 0.5, { type: 'bandpass', q: 1.3, fpts: [[0, 1150 * k], [len, 800 * k, 'e']], env: E(0.5), off: r() * 3 });
  nz(v, jt, 'white', h, len, 0.15, { type: 'bandpass', f: 2600 * k, q: 1.1, env: E(0.15), off: r() * 3 });                 // the grit
  playTex(v, o, 'crackle', Math.floor(r() * 3), h, 0.6, { rate: 1.8 * k, dur: len, loop: true, off: r() * 2, env: E(0.6) });
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.05, 0.35, { rate: 1.2 * k, dur: len, loop: true, off: r() * 2, env: E(0.35) });
  for (let i = 0; i < 6; i++) { const t = h + 0.05 + r() * (len - 0.2); L.thump(v, o, t, (90 + r() * 40) * k, 45 * k, 0.18, 0.35 + 0.2 * r(), 0.04); L.burst(v, o, t, 0.06, 0.3, 'bandpass', (600 + r() * 900) * k, 0.9, 'white2', r() * 3); }
});
// skid: feet sliding on concrete (the knocked-out slide) — the scrape falls in level and brightness as the slide slows,
// the soles catch and release (a judder whose rate falls from ~45 to ~12 Hz), a second foot a beat behind, grit.
sfx('skid', 0.7, { var: true, duck: [1, 'dur'], rev: 0.15 }, (v, o, p, r, h, len) => {
  const k = p.pitch;
  [[0, 1, 2200, 0.5], [0.04, 0.7, 1500, 0.35]].forEach(([dt, a, f, amp]) => {
    const L2 = Math.max(0.1, len - dt);
    nz(v, o, 'white2', h + dt, L2, amp * a, { type: 'bandpass', q: 1.0, fpts: [[0, f * k], [L2, f * 0.42 * k, 'e']], env: [[0, 0], [0.012, amp * a], [L2 * 0.6, amp * a * 0.6], [L2, 0]], off: r() * 3 });
  });
  const ticks = []; for (let t = 0.01; t < len - 0.04;) { const u = t / len; ticks.push([t, (0.5 + 0.5 * r()) * (1 - 0.7 * u)]); t += 1 / ((45 - 33 * u) * k); }
  const n = v.at(v.noise('white', r() * 3), h, h + len + 0.02), bp = v.filt('bandpass', 2600 * k, 1.4), g = v.gain(0);
  n.connect(bp); bp.connect(g); g.connect(o); v.env(g.gain, pulses(ticks, 0.005, 0.5), true, h);
  playTex(v, o, 'crackle', Math.floor(r() * 3), h, 0.25, { rate: 2.2 * k, dur: len, off: r() * 2 });
  nz(v, o, 'brown', h, len, 0.25, { type: 'lowpass', f: 250 * k, env: [[0, 0], [0.02, 0.25], [len, 0]], off: r() * 3 });
});

// ====================================================================================== ROOMS, BODIES, MACHINES (Act IV)
// extinguisherBurst: a pressurised canister ruptures (thrown, it stopped dead on the Infinity). The burst: a hard
// metallic crack, the thin steel shell's short ring (four modes; assumed, not measured), the pressure thump. Then the
// blowdown: a broadband hiss whose level and brightness fall as the pressure drops — through a choked orifice the
// discharge rate is proportional to the upstream pressure, so the pressure (and the hiss) decays roughly exponentially
// (choked flow; a first-order approximation that ignores the gas cooling) — with a turbulent flutter; the powder
// cloud's soft whoomp; the empty shell dropping and clattering. `dur` = the blowdown.
sfx('extinguisherBurst', 2.4, { var: true, duck: [3, 0.6], rev: 0.3 }, (v, o, p, r, h, len) => {
  const k = p.pitch, T = Math.max(0.6, len);
  L.burst(v, o, h, 0.004, 0.9, 'highpass', 2500 * k, 0.7, 'white', r() * 3);
  L.burst(v, o, h, 0.03, 0.6, 'bandpass', 1400 * k, 0.9, 'white2', r() * 3);
  L.thump(v, o, h, 110 * k, 45 * k, 0.3, 0.55, 0.05);
  [[1180, 0.25, 0.18], [1930, 0.18, 0.12], [2870, 0.12, 0.09], [4150, 0.07, 0.06]].forEach(([f, a, T2]) => tone(v, o, 'sine', f * k * (0.98 + 0.04 * r()), h, T2, a, { dec: 1, att: 0.0008 }));
  const am = v.gain(0.75); am.connect(o); v.lfo(11 * k, 0.12, am.gain); v.lfo(17.3 * k, 0.08, am.gain);
  nz(v, am, 'white2', h + 0.005, T, 0.55, { type: 'bandpass', q: 0.6, fpts: [[0, 5200 * k], [T, 1800 * k, 'e']], env: [[0, 0], [0.012, 0.55], [T * 0.35, 0.2, 'e'], [T, 0.001, 'e'], [T + 0.01, 0]], off: r() * 3 });
  nz(v, am, 'white', h + 0.005, T, 0.25, { type: 'highpass', f: 7000, env: [[0, 0], [0.01, 0.25], [T * 0.3, 0.06, 'e'], [T, 0.001, 'e'], [T + 0.01, 0]], off: r() * 3 });
  nz(v, o, 'brown', h + 0.02, Math.min(1.2, T), 0.3, { type: 'lowpass', f: 320 * k, env: [[0, 0], [0.08, 0.3], [Math.min(1.2, T), 0]], off: r() * 3 });
  const t1 = h + 0.55 + 0.1 * r();
  [0, 0.16, 0.26, 0.31].forEach((dt, i) => {
    const a = 0.35 * Math.pow(0.55, i);
    L.burst(v, o, t1 + dt, 0.004, a, 'bandpass', 2600 * k, 1.2, 'white', r() * 3);
    [[870, 0.3], [2310, 0.18]].forEach(([f, g]) => tone(v, o, 'sine', f * k, t1 + dt, 0.12, a * g, { dec: 1, att: 0.0008 }));
  });
});
// chairScrape: a chair pushed back / pulled in on a hard floor — stick-slip: the leg catches and releases 55–85 times a
// second, each release a short impulse ringing the frame and the floor (three resonances), a faint squeal riding on the
// judder; level and rate follow the push.
sfx('chairScrape', 0.4, { var: true, rev: 0.15 }, (v, o, p, r, h, len) => {
  const k = p.pitch, L2 = Math.max(0.12, len), ticks = [];
  for (let t = 0.005; t < L2 - 0.02;) { const u = t / L2; ticks.push([t, (0.4 + 0.6 * r()) * Math.sin(Math.PI * Math.min(1, 0.08 + u * 0.95))]); t += 1 / ((55 + 30 * Math.sin(Math.PI * u)) * k); }
  const n = v.at(v.noise('white', r() * 3), h, h + L2 + 0.02);
  [[720, 5, 0.55], [1450, 6, 0.32], [310, 3, 0.4]].forEach(([f, q2, a]) => { const bp = v.filt('bandpass', f * k, q2), g = v.gain(0); n.connect(bp); bp.connect(g); g.connect(o); v.env(g.gain, pulses(ticks, 0.006, a), true, h); });
  const sq = tone(v, o, 'triangle', 1150 * k, h, L2, 0.035, { env: [[0, 0], [L2 * 0.3, 0.035], [L2 * 0.7, 0.025], [L2, 0]] });
  const fm = v.at(v.osc('sine', 62 * k), h, h + L2 + 0.03), fg = v.gain(40 * k); fm.connect(fg); fg.connect(sq.frequency);
});
// rip: something tough torn apart — the serpent's head off Agito's tail, non-gory (canvas / rubber, no wet sounds): a
// creak as it stretches, then the tear — a zip of fibre snaps whose rate climbs and falls — and the dull thock as it
// comes free ON the cue time (the tear is pre-roll).
sfx('rip', 0.3, { pre: 0.3, duck: [2, 0.3], rev: 0.12 }, (v, o, p, r, h, len, pre) => {
  const k = p.pitch, t0 = h - pre;
  const cr = v.filt('bandpass', 420 * k, 6); cr.connect(o);
  tone(v, cr, 'sawtooth', 70 * k, t0, 0.1, 0.35, { f1: 95 * k, env: [[0, 0], [0.08, 0.35], [0.1, 0]] });
  const snaps = []; for (let t = 0.08; t < pre;) { const u = (t - 0.08) / (pre - 0.08); snaps.push([t, (0.5 + 0.5 * r()) * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.05))]); t += 1 / ((120 + 380 * Math.sin(Math.PI * u)) * k); }
  const n = v.at(v.noise('white2', r() * 3), t0, h + 0.05);
  [[2400, 1.2, 1.7], [900, 1.0, 0.9]].forEach(([f, q2, a]) => { const bp = v.filt('bandpass', f * k, q2), g = v.gain(0); n.connect(bp); bp.connect(g); g.connect(o); v.env(g.gain, pulses(snaps, 0.003, a), true, t0); });
  nz(v, o, 'pink', t0 + 0.08, pre - 0.06, 0.45, { type: 'bandpass', f: 1600 * k, q: 0.8, env: [[0, 0], [0.12, 0.45], [pre - 0.06, 0]], off: r() * 3 });
  L.thump(v, o, h, 130 * k, 70 * k, 0.12, 0.42, 0.03);
  L.burst(v, o, h, 0.02, 0.35, 'bandpass', 700 * k, 0.9, 'white', r() * 3);
});
// staticCrackle: electricity crawling over a body (Kashimo): a dry crackle of small discharges (Poisson clicks), now
// and then an arc — a short burst of buzz (a spark gap's relaxation oscillation, 100–180 Hz, rich in harmonics) through
// a bright band — and a thin sizzle; it swells and ebbs.
sfx('staticCrackle', 3.0, { var: true, rev: 0.15 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.15, a], [Math.max(0.2, len - 0.3), a * 0.9], [len, 0]];
  const hp = v.filt('highpass', 1400, 0.7); hp.connect(o);
  playTex(v, hp, 'crackle', Math.floor(r() * 3), h, 0.85, { rate: 2.2 * k, dur: len, loop: true, off: r() * 2, env: E(0.85) });
  const sz = v.gain(0.5); sz.connect(o); v.lfo(0.9, 0.25, sz.gain);
  nz(v, sz, 'white', h, len, 0.08, { type: 'highpass', f: 6500, env: E(0.08), off: r() * 3 });
  for (let t = 0.1 + r() * 0.3; t < len - 0.1; t += 0.2 + r() * 0.6) {
    const d = 0.03 + r() * 0.06, f0 = (100 + r() * 80) * k, a = 0.3 + 0.4 * r();
    const bp = v.filt('bandpass', (2200 + r() * 2500) * k, 1.1); bp.connect(o);
    tone(v, bp, 'sawtooth', f0, h + t, d, a, { env: [[0, 0], [0.002, a], [d * 0.6, a * 0.7], [d, 0]] });
    L.burst(v, o, h + t, 0.003, a * 0.6, 'highpass', 3000, 0.7, 'white', r() * 3);
  }
});
// waterSpray: a high-pressure water jet scoring a wall — the jet's hiss, the splatter roaring off the surface
// (turbulent, low-passed, fluttering), droplets pattering, the concrete being cut (grit, chips).
sfx('waterSpray', 1.2, { var: true, duck: [2.5, 'dur'], rev: 0.25 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.01, a], [Math.max(0.02, len - 0.12), a * 0.85], [len, 0]];
  nz(v, o, 'white2', h, len, 0.55, { type: 'bandpass', f: 3200 * k, q: 0.6, env: E(0.55), off: r() * 3 });
  const am = v.gain(0.7); am.connect(o); v.lfo(13 * k, 0.2, am.gain); v.lfo(7.1 * k, 0.15, am.gain);
  nz(v, am, 'pink', h, len, 0.6, { type: 'lowpass', f: 900 * k, env: E(0.6), off: r() * 3 });
  const bp = v.filt('bandpass', 3800 * k, 0.8); bp.connect(o);
  playTex(v, bp, 'crackle', Math.floor(r() * 3), h, 0.5, { rate: 1.3 * k, dur: len, loop: true, off: r() * 2, env: E(0.5) });
  playTex(v, o, 'debris', Math.floor(r() * 3), h + 0.02, 0.25, { rate: 1.5 * k, dur: len, loop: true, off: r() * 2, env: E(0.25) });
  L.burst(v, o, h, 0.02, 0.5, 'highpass', 1800 * k, 0.8, 'white2', r() * 3);
});
// crtHum: a room of CRT monitors — mains hum at Tokyo's 50 Hz (eastern Japan's grid; the west runs at 60 Hz) with the
// transformers' 100 Hz and a few harmonics, the flyback transformer's whine at the NTSC-J line rate (15.734 kHz: at the
// edge of hearing for adults, kept very faint), a soft electrostatic hash.
sfx('crtHum', 4.0, { var: true, rev: 0.05 }, (v, o, p, r, h, len) => {
  const E = a => [[0, 0], [Math.min(0.3, len * 0.3), a], [Math.max(0.35, len - 0.3), a], [len, 0]];
  [[50, 0.18], [100, 0.3], [150, 0.08], [200, 0.1], [300, 0.04]].forEach(([f, a]) => tone(v, o, 'sine', f, h, len, a, { env: E(a) }));
  tone(v, o, 'sine', 15734, h, len, 0.006, { env: E(0.006) });
  nz(v, o, 'pink', h, len, 0.03, { type: 'bandpass', f: 2500, q: 0.8, env: E(0.03), off: r() * 3 });
});
// heelSkid: a giant driven back on its heels, gouging the asphalt — a heavy stick-slip grind whose surges slow as the
// slide slows (14 → 5 Hz), the asphalt crumbling and spraying, a mid scrape falling in pitch, and the stop.
sfx('heelSkid', 1.4, { var: true, duck: [2.5, 'dur'], rev: 0.25 }, (v, o, p, r, h, len) => {
  const k = p.pitch, E = a => [[0, 0], [0.03, a], [len * 0.6, a * 0.75], [len - 0.05, a * 0.3], [len, 0]];
  const surges = []; for (let t = 0.01; t < len - 0.05;) { const u = t / len; surges.push([t, (0.6 + 0.4 * r()) * (1 - 0.6 * u)]); t += 1 / ((14 - 9 * u) * k); }
  const n = v.at(v.noise('brown', r() * 3), h, h + len + 0.02), bp = v.filt('bandpass', 180 * k, 0.9), g = v.gain(0);
  n.connect(bp); bp.connect(g); g.connect(o); v.env(g.gain, hitsEnv(surges.map(([t, a]) => [t, a * 1.2]), 0.09), true, h);
  nz(v, o, 'brown', h, len, 0.5, { type: 'lowpass', f: 140 * k, env: E(0.5), off: r() * 3 });
  nz(v, o, 'pink', h, len, 0.45, { type: 'bandpass', q: 1.0, fpts: [[0, 900 * k], [len, 520 * k, 'e']], env: E(0.45), off: r() * 3 });
  playTex(v, o, 'debris', Math.floor(r() * 3), h, 0.45, { rate: 0.9 * k, dur: len, loop: true, off: r() * 2, env: E(0.45) });
  playTex(v, o, 'crackle', Math.floor(r() * 3), h, 0.55, { rate: 1.1 * k, dur: len, loop: true, off: r() * 2, env: E(0.55) });
  L.thump(v, o, h + len - 0.1, 70 * k, 35 * k, 0.35, 0.6, 0.06);
});

// ====================================================================================== GRAPHIC / MUSIC
sfx('impactFrame', 0.6, { duck: [3, 0.4], rev: 0.15 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.burst(v, o, h, 0.004, 0.9, 'highpass', 3000, 0.7, 'white2', r() * 3);
  L.thump(v, o, h, 90 * k, 40 * k, 0.35, 0.8, 0.05);
  nz(v, o, 'white2', h, 0.08, 0.3, { type: 'highpass', f: 3000, att: 0.001, off: r() * 3 });
});
sfx('panelSlam', 0.5, { duck: [2, 0.3], rev: 0.15 }, (v, o, p, r, h) => {
  const k = p.pitch;
  L.burst(v, o, h, 0.04, 0.6, 'bandpass', 1200 * k, 0.9, 'white2', r() * 3);
  L.thump(v, o, h, 110 * k, 60 * k, 0.15, 0.6, 0.03);
  L.burst(v, o, h + 0.002, 0.006, 0.25, 'highpass', 4000, 0.7, 'white', r() * 3);
});
sfx('titleHit', 2.8, { pre: 0.35, duck: [4, 1.5], rev: 0.5, tail: 0.6 }, (v, o, p, r, h, len, pre) => {
  const k = p.pitch;
  nz(v, o, 'white2', h - pre, pre, 0.3, { type: 'highpass', f: 2500, env: [[0, 0], [0.02, 0.005], [pre - 0.01, 0.3, 'e'], [pre, 0]], off: r() * 3 });
  L.membrane(v, o, h, 55 * k, [[1, 1, 1], [1.5, 0.42, 0.34], [1.98, 0.24, 0.2]], 0.9, 1.8, 0.35, 0.05);
  L.burst(v, o, h, 0.02, 0.4, 'bandpass', 1100, 0.9, 'white', r() * 3);
  L.burst(v, o, h, 2.2, 0.12, 'highpass', 1400, 0.6, 'white2', r() * 3, 0.2);
  [587.3, 880, 1318.5, 1661.2, 2349.3].forEach((f, i) => fmBell(v, o, f * k, h + i * 0.03, 2.4 - i * 0.3, 0.12, 2, 1.2));
});
sfx('actCard', 1.6, { pre: 0.25, duck: [2.5, 0.8], rev: 0.45 }, (v, o, p, r, h, len, pre) => { // kabuki clappers
  const k = p.pitch;
  nz(v, o, 'white2', h - pre, pre, 0.15, { type: 'highpass', f: 3000, env: [[0, 0], [0.02, 0.003], [pre - 0.01, 0.15, 'e'], [pre, 0]], off: r() * 3 });
  L.clack(v, o, h, 0.9, r() * 3); L.clack(v, o, h + 0.085 / k, 0.7, r() * 3);
  L.thump(v, o, h, 65 * k, 38 * k, 1.1, 0.5, 0.08);
  fmBell(v, o, 1174.7 * k, h + 0.1, 1.2, 0.08, 3.5, 1);
});
sfx('riser', 0.05, { pre: 2.0, preDur: true, rev: 0.3, tail: 0.1 }, (v, o, p, r, h, len, pre) => { // lands on t
  const k = p.pitch, t0 = h - pre;
  nz(v, o, 'white2', t0, pre, 0.6, { type: 'bandpass', q: 2.5, fpts: [[0, 250 * k], [pre, 7000 * k, 'e']], env: [[0, 0], [q(pre, 0.1), 0.012], [pre - 0.01, 0.6, 'e'], [pre, 0]], off: r() * 3 });
  const lp = v.filt('lowpass', 400, 2); lp.connect(o); v.env(lp.frequency, [[0, 400], [pre, 4000, 'e']], false, t0);
  tone(v, lp, 'sawtooth', 110 * k, t0, pre, 0.25, { f1: 440 * k, env: [[0, 0], [q(pre, 0.1), 0.006], [pre - 0.01, 0.25, 'e'], [pre, 0]] });
});
sfx('downer', 2.0, { var: true, rev: 0.3 }, (v, o, p, r, h, len) => { // falling sweep from t
  const k = p.pitch;
  nz(v, o, 'white2', h, len, 0.5, { type: 'bandpass', q: 2, fpts: [[0, 6000 * k], [len, 200 * k, 'e']], env: [[0, 0], [0.02, 0.5], [len, 0.0005, 'e'], [len + 0.01, 0]], off: r() * 3 });
  const lp = v.filt('lowpass', 3000, 1.5); lp.connect(o); v.env(lp.frequency, [[0, 3000], [len, 300, 'e']], false, h);
  tone(v, lp, 'sawtooth', 800 * k, h, len, 0.22, { f1: 60 * k, dec: 1, att: 0.01 });
});
sfx('revCym', 0.05, { pre: 2.0, preDur: true, rev: 0.3, tail: 0.1 }, (v, o, p, r, h, len, pre) => { // reverse cymbal ending on t
  const t0 = h - pre, n = v.at(v.noise('white2', r() * 3), t0, h + 0.03), hp = v.filt('highpass', 3000, 0.7), g = v.gain(0);
  n.connect(hp); hp.connect(g); g.connect(o);
  v.env(hp.frequency, [[0, 9000], [pre, 2500, 'e']], false, t0);
  v.env(g.gain, [[0, 0], [q(pre, 0.05), 0.003], [pre, 0.7, 'e'], [pre + 0.018, 0]], true, t0);
});
sfx('subDrop', 2.5, { duck: [2, 1.0] }, (v, o, p, r, h) => {
  const k = p.pitch;
  tone(v, o, 'sine', 60 * k, h, 2.2 / k, 0.9, { f1: 25 * k, env: [[0, 0], [0.01, 0.9], [0.8, 0.6], [2.2 / k, 0]] });
  tone(v, o, 'triangle', 120 * k, h, 0.4, 0.15, { f1: 50 * k, dec: 1, att: 0.003 });
});
sfx('boom', 2.0, { duck: [3, 1.0], rev: 0.35 }, (v, o, p, r, h) => {
  const k = p.pitch;
  tone(v, o, 'sine', 70 * k, h, 1.6 / k, 1.0, { f1: 34 * k, dec: 1, att: 0.01 });
  L.burst(v, o, h, 1.0 / k, 0.5, 'lowpass', 300 * k, 0.7, 'brown', r() * 3, 0.01);
});
sfx('heartbeat', 1.7, { var: true, duck: [1.5, 'dur'] }, (v, o, p, r, h, len) => { // lub-dub
  const per = 0.85 / p.pitch;
  for (let t = 0; t < len - 0.1; t += per) {
    tone(v, o, 'sine', 62, h + t, 0.14, 0.8, { f1: 42, dec: 1, att: 0.004 });
    tone(v, o, 'sine', 55, h + t + 0.19 / p.pitch, 0.16, 0.6, { f1: 38, dec: 1, att: 0.004 });
  }
});
sfx('tinnitus', 4.0, { var: true, duck: [8, 'dur'], rev: 0.1 }, (v, o, p, r, h, len) => { // the ring after a blast
  const k = p.pitch, E = a => [[0, 0], [0.3, a], [len * 0.6, a * 0.8], [len, 0]];
  tone(v, o, 'sine', 6800 * k, h, len, 0.06, { env: E(0.06) });
  tone(v, o, 'sine', 6804 * k, h, len, 0.03, { env: E(0.03) });
});

// ====================================================================================== CODA
sfx('airportChime', 2.5, { duck: [1, 1.0], rev: 0.5 }, (v, o, p, r, h) => { // two-tone PA "ding-dong" (E5 → C5)
  const k = p.pitch;
  [[659.3, 0], [523.3, 0.55]].forEach(([f, dt]) => {
    tone(v, o, 'sine', f * k, h + dt, 1.6, 0.3, { dec: 1, att: 0.003 });
    tone(v, o, 'sine', f * 4 * k, h + dt, 0.25, 0.03, { dec: 1, att: 0.002 });
    tone(v, o, 'sine', f * 2 * k, h + dt, 0.6, 0.05, { dec: 1, att: 0.002 });
  });
});
sfx('planeTakeoff', 10, { var: true, duck: [2, 'dur'], rev: 0.3, tail: 0.5 }, (v, o, p, r, h, len) => { // a distant jet
  const k = p.pitch, d = sweepPan(v, o, p, h, len, -0.3, 0.45), E = a => [[0, 0], [len * 0.55, a], [len, 0]];
  nz(v, d, 'pink', h, len, 0.7, { type: 'lowpass', q: 0.7, fpts: [[0, 500 * k], [len * 0.55, 1400 * k, 'e'], [len, 600 * k, 'e']], env: E(0.7), off: r() * 3 });
  nz(v, d, 'brown', h, len, 0.6, { type: 'lowpass', f: 90 * k, env: E(0.6), off: r() * 3 });
  tone(v, d, 'sine', 2900 * k, h, len, 0.012, { f1: 2750 * k, env: E(0.012) });
});

// Loudness normalization (tools/audio-lab.js sfxTable, raw dry render at vol 1, seed of t = 0): multipliers that put each
// sound's peak at its category target — blasts ≈ −2.5…−3 dBFS, heavy hits −4, light hits −6…−9, whooshes −8…−11,
// tonal/ambient details −10…−20 — so cue volumes mean the same thing across the catalog.
const NORM = {
  hitL: 1.30, hitM: 0.80, hitH: 0.64, hitHuge: 0.55, bodyFall: 0.94, block: 1.21, infinityStop: 0.92, groundSlam: 0.83, whooshL: 0.88, whip: 0.57, dashAir: 0.88, flyBy: 1.11, shing: 1.22, slashSplit: 1.28, dismantle: 1.32, worldCut: 1.19, infinityHum: 0.64, blueCharge: 0.82, blueImplode: 0.84, redCharge: 1.27, redBlast: 0.56, purpleCharge: 0.87, purpleErase: 0.82, blackFlash: 0.56, rctHeal: 1.64, sixEyes: 1.39, handSign: 1.69, voidOpen: 1.59, shrineRise: 1.35, barrierUp: 1.20, barrierCrack: 1.22, barrierShatter: 0.67, domainCollapse: 0.76, wheelClunk: 1.07, wheelTurn: 1.86, mahoStep: 0.91, swordRing: 1.58, shadowRise: 1.29, agitoSpark: 1.78, rabbitSwarm: 0.71, waterJet: 0.77, windGust: 1.16, crosswalkChirp: 1.90, canRoll: 1.45, glassShatter: 0.74, glassTinkle: 4.26, buildingSlide: 1.32, collapse: 0.88, quake: 0.91, fireCrackle: 0.76, carAlarm: 1.29, steelGroan: 1.79, sparkPop: 2.16, crowCaw: 4.2, footConcrete: 1.49, footSnow: 0.82, clothSnap: 1.64, clothFlutter: 1.68, dropSoft: 1.76, impactFrame: 0.80, titleHit: 0.61, actCard: 0.45, riser: 1.17, revCym: 0.74, subDrop: 1.05, tinnitus: 2.00, airportChime: 1.71, planeTakeoff: 1.10,
  poleClang: 1.15, poleRing: 0.8, metalWhoosh: 1.75, redWhistle: 0.5, concreteGrind: 1.25, skid: 1.15, // Act III additions (same targets)
  extinguisherBurst: 0.95, chairScrape: 4.2, rip: 0.84, staticCrackle: 0.64, waterSpray: 0.9, crtHum: 0.15, heelSkid: 1.4 // Act IV additions
};
Object.keys(NORM).forEach(n => { if (AU.SFX_DEF[n]) AU.SFX_DEF[n].gain = (AU.SFX_DEF[n].gain || 1) * NORM[n]; });
AU.sfxTools = { tone, nz, fmBell, whoosh, hitsEnv, pulses, playTex, texBuf, TEX };
})();
