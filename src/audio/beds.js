/* =====================================================================================================
   DOMAIN CLASH — ambience beds                                              (src/audio/beds.js, classic script)
   Pre-rendered with seeded JS DSP into seamless stereo loops, in three layers: noise-like content is rendered past the
   loop length and its overhang equal-power crossfaded into the head; tonal content (hums, drones — frequencies quantized
   to whole cycles per loop) is crossfaded linearly, so a coherent drone never swells at the seam; discrete events
   (creaks, chirps, pebbles, crackles) are rendered circularly into the loop itself. Beds are
   RMS-normalized so a scene's `vol` means the same loudness for every bed: vol 1 → the RMS in BED. Rendered at half
   the context rate (all content < 11 kHz); the buffer source resamples on playback (ratio exactly 0.5).
   Scenes use them via `ambience: [{ name, vol }]` (crossfaded at scene boundaries) and `{ t, amb, vol, fade }` cues.
   No bed contains voices, murmur, cheering or breathing — the evacuated city is empty.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { BQ, pinkGen, brownGen, loopify, toBuffer, removeDC, mulberry32, hashStr, dbg } = AU;

// [loop seconds, RMS dBFS at vol 1]
const BED = AU.BED = {
  wind: [16, -28], snow: [12, -40], cityEmpty: [20, -34], void: [16, -32], shrine: [16, -30], rubble: [16, -34],
  fire: [12, -29], command: [10, -38], sky: [16, -30], airport: [12, -42], interior: [8, -36],
};

// Incremental generator: yields every 4096 samples (and between synthesized events) so the idle warm-up can spread the
// work over short slots; bedBuffer() drains it synchronously when a bed is needed right now.
function* bedGen(name, sr) {
  const secs = BED[name][0], L = Math.round(secs * sr), X = Math.round(sr * 1.2), N = L + X, TAU = 2 * Math.PI, Y = 4095;
  // three layers: ch = noise-like (equal-power crossfade into the head), tc = tonal/coherent (linear crossfade; carriers
  // quantized to whole cycles per loop, so an unmodulated drone is untouched by the seam), ev = discrete events rendered
  // circularly into the loop itself (an event crossing the end continues at the start)
  const ch = [new Float32Array(N), new Float32Array(N)], tc = [new Float32Array(N), new Float32Array(N)], evb = [new Float32Array(L), new Float32Array(L)];
  const rng = mulberry32(hashStr('bed:' + name));
  const P = pan => [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];
  const q = f => Math.max(1, Math.round(f * secs)) / secs; // whole cycles per loop → seamless periodic parts
  const two = f => [f(0), f(1)];
  const smooth = (step) => { // slowly varying random curve in [0,1], new target every `step` s (± 50 %)
    let cur = rng(), nxt = rng(), k = 0, len = Math.max(1, Math.round(step * sr * (0.5 + rng())));
    return () => { if (++k >= len) { k = 0; cur = nxt; nxt = rng(); len = Math.max(1, Math.round(step * sr * (0.5 + rng()))); } const u = k / len; return cur + (nxt - cur) * u * u * (3 - 2 * u); };
  };
  const add = (c, i, y) => { evb[c][((i % L) + L) % L] += y; };
  // noise knock: filtered burst (dur s, band f/q) at t0
  const knock = (t0, dur, f, qq, amp, pan) => {
    const i0 = Math.floor(t0 * sr), n = Math.round(dur * sr), bq = new BQ('bp', f, qq, sr), [gl, gr] = P(pan), k = 6.91 / Math.max(1, n);
    for (let i = 0; i < n + 200; i++) { const e = i < n ? Math.exp(-k * i) * Math.min(1, i / 6) : 0, y = bq.run((rng() * 2 - 1) * e) * amp; add(0, i0 + i, y * gl); add(1, i0 + i, y * gr); }
  };
  // tonal event: sine sweep f0→f1 (exp) with an attack/decay shape, optional FM trill, optional 3rd harmonic
  const chirp = (t0, dur, f0, f1, amp, pan, o) => {
    o = o || {};
    const i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), [gl, gr] = P(pan);
    let ph = rng() * TAU, lp = 0;
    for (let i = 0; i < n; i++) {
      const u = i / n, t = i / sr, f = f0 * Math.pow(f1 / f0, u) + (o.fm ? o.fm[1] * Math.sin(TAU * o.fm[0] * t) : 0);
      ph += TAU * f / sr;
      const e = o.bell ? Math.min(1, t / 0.003) * Math.exp(-5 * u) : Math.min(1, t / 0.004, (n - i) / sr / 0.02);
      let y = (Math.sin(ph) + (o.h3 || 0) * Math.sin(3 * ph)) * amp * e;
      if (o.lp) { lp += o.lp * (y - lp); y = lp; }
      add(0, i0 + i, y * gl); add(1, i0 + i, y * gr);
      for (const [dl, g] of o.echo || []) { const j = i0 + i + Math.round(dl * sr); add(0, j, y * g * gr); add(1, j, y * g * gl); }
    }
  };
  if (name === 'wind') { // cold December wind: moving band of pink noise, gusts, low rumble, a thin whistle in the gusts
    const bp = two(() => new BQ('bp', 500, 0.9, sr)), lp = two(() => new BQ('lp', 200, 0.7, sr)), pk = two(() => pinkGen(rng)), br = two(() => brownGen(rng));
    const fc = two(() => smooth(1.6)), gust = two(() => smooth(2.2)), wh = two(() => new BQ('bp', 1900, 7, sr)), whf = two(() => smooth(2.5));
    for (let i = 0; i < N; i++) {
      for (let c = 0; c < 2; c++) {
        if ((i & 63) === 0) { bp[c].set(250 + 650 * fc[c](), 0.9); wh[c].set(1500 + 900 * whf[c](), 7); } else { fc[c](); whf[c](); }
        const g = gust[c]();
        ch[c][i] = bp[c].run(pk[c]()) * 2.2 * (0.3 + 0.7 * g) + lp[c].run(br[c]()) * 0.5 + wh[c].run(rng() * 2 - 1) * 0.1 * g * g;
      }
      if ((i & Y) === Y) yield;
    }
  } else if (name === 'snow') { // the hush of snowfall: very soft air, slow drift, two soft puffs of snow sliding off
    const lp = two(() => new BQ('lp', 2500, 0.7, sr)), hp = two(() => new BQ('hp', 250, 0.7, sr)), pk = two(() => pinkGen(rng)), dr = two(() => smooth(3));
    for (let i = 0; i < N; i++) { for (let c = 0; c < 2; c++) ch[c][i] = hp[c].run(lp[c].run(pk[c]())) * (0.75 + 0.25 * dr[c]()); if ((i & Y) === Y) yield; }
    for (let k = 0; k < 2; k++) {
      const t0 = 1 + k * secs / 2 + rng() * 3, n = Math.round(0.4 * sr), i0 = Math.floor(t0 * sr), bq = new BQ('lp', 600, 0.7, sr), bg = brownGen(rng), [gl, gr] = P(rng() * 1.2 - 0.6);
      for (let i = 0; i < n; i++) { const y = bq.run(bg()) * Math.sin(Math.PI * i / n) * 1.2; add(0, i0 + i, y * gl); add(1, i0 + i, y * gr); }
      yield;
    }
  } else if (name === 'cityEmpty') { // evacuated Shinjuku: 50 Hz mains hum (east Japan grid), distant air, far signals
    const lp = two(() => new BQ('lp', 500, 0.7, sr)), pk = two(() => pinkGen(rng)), am = two(() => smooth(4));
    const wb = two(() => new BQ('bp', 400, 0.8, sr)), pk2 = two(() => pinkGen(rng)), gu = two(() => smooth(2));
    const f1 = q(50), f2 = q(100), f3 = q(150);
    for (let i = 0; i < N; i++) {
      const t = i / sr, hum = 0.06 * Math.sin(TAU * f1 * t) + 0.035 * Math.sin(TAU * f2 * t + 1) + 0.015 * Math.sin(TAU * f3 * t + 2);
      for (let c = 0; c < 2; c++) { ch[c][i] = lp[c].run(pk[c]()) * 1.6 * (0.7 + 0.3 * am[c]()) + wb[c].run(pk2[c]()) * 0.5 * gu[c](); tc[c][i] = hum * (c ? 0.9 : 1); }
      if ((i & Y) === Y) yield;
    }
    // far crosswalk signals ("piyo piyo" pairs), low-passed by distance, with slap echoes off the towers
    for (let s = 0; s < 2; s++) {
      const t0 = 1.5 + s * secs / 2 + rng() * 4, pan = rng() * 1.4 - 0.7;
      for (let rep = 0; rep < 3; rep++) for (const dt of [0, 0.19]) chirp(t0 + rep * 1.1 + dt, 0.1, 3300, 2200, 0.05, pan, { h3: 0.25, fm: [32, 60], lp: 0.35, echo: [[0.23, 0.35], [0.51, 0.15]] });
      yield;
    }
    knock(rng() * secs, 0.003, 2000, 1.2, 0.08, rng() * 1.4 - 0.7); // a relay ticking in a signal box
  } else if (name === 'void') { // Unlimited Void: a cosmic drone with slow beating + a Lydian shimmer in the stars
    const lp = two(() => new BQ('lp', 120, 0.7, sr)), br = two(() => brownGen(rng));
    const low = [[36.71, 0.125, 0.3], [55, 0.1875, 0.22], [73.42, 0.25, 0.14]].map(([f, d, a]) => [q(f), q(f) + d, a]);
    const high = [1174.66, 1318.51, 1479.98, 1661.22, 1760, 2217.46].map(f => ({ f: q(f), am: smooth(3.5), ph: rng() * TAU }));
    for (let i = 0; i < N; i++) {
      const t = i / sr; let dr = 0;
      for (const [fa, fb, a] of low) dr += a * (Math.sin(TAU * fa * t) + 0.8 * Math.sin(TAU * fb * t + 1));
      let sh = 0; for (const h of high) sh += 0.02 * h.am() * Math.sin(TAU * h.f * t + h.ph);
      for (let c = 0; c < 2; c++) { tc[c][i] = dr * 0.45 + sh * (c ? 0.8 : 1.2); ch[c][i] = lp[c].run(br[c]()) * 0.25; }
      if ((i & Y) === Y) yield;
    }
  } else if (name === 'shrine') { // Malevolent Shrine: low rumble, a rough D–E♭ drone, creaking timber, a far thud
    const lp = two(() => new BQ('lp', 90, 0.7, sr)), br = two(() => brownGen(rng)), am = two(() => smooth(2)), sw = smooth(5);
    const fa = q(73.42), fb = q(77.78);
    for (let i = 0; i < N; i++) {
      const t = i / sr, s = 0.55 + 0.45 * sw(), dr = (Math.sin(TAU * fa * t) + Math.sin(TAU * fb * t + 0.7)) * 0.09 * s;
      for (let c = 0; c < 2; c++) { ch[c][i] = lp[c].run(br[c]()) * 1.3 * (0.7 + 0.3 * am[c]()); tc[c][i] = dr; }
      if ((i & Y) === Y) yield;
    }
    for (let k = 0; k < 3; k++) { // creaks: a jittered pulse train through a narrow resonance
      const t0 = 0.8 + k * secs / 3 + rng() * 2, d = 0.4 + rng() * 0.5, n = Math.round(d * sr), i0 = Math.floor(t0 * sr), bq = new BQ('bp', 500 + rng() * 400, 6, sr), [gl, gr] = P(rng() * 1.6 - 0.8);
      let ph = 0, rate = 25 + rng() * 35;
      for (let i = 0; i < n; i++) { ph += rate / sr; let x = 0; if (ph >= 1) { ph -= 1 + (rng() - 0.5) * 0.2; x = 1; } const y = bq.run(x) * 2.2 * Math.sin(Math.PI * i / n); add(0, i0 + i, y * gl); add(1, i0 + i, y * gr); }
      yield;
    }
    const t0 = rng() * secs; chirp(t0, 0.7, 48, 40, 0.25, rng() - 0.5, { bell: 1 }); knock(t0, 0.08, 200, 0.7, 0.4, 0);
  } else if (name === 'rubble') { // settling debris: pebbles tumbling, a far crumble, dust hiss, low wind
    const hp = two(() => new BQ('hp', 3000, 0.7, sr)), pk = two(() => pinkGen(rng)), wb = two(() => new BQ('bp', 300, 0.7, sr)), pk2 = two(() => pinkGen(rng)), gu = two(() => smooth(2.5));
    for (let i = 0; i < N; i++) { for (let c = 0; c < 2; c++) ch[c][i] = hp[c].run(pk[c]()) * 0.25 + wb[c].run(pk2[c]()) * 0.9 * gu[c](); if ((i & Y) === Y) yield; }
    for (let t = rng(); t < secs; t += -Math.log(1 - rng()) / 0.9) {
      const pan = rng() * 1.6 - 0.8, reps = 3 + Math.floor(rng() * 4); let tt = t;
      for (let r = 0; r < reps; r++) { knock(tt, 0.003 + rng() * 0.012, 800 + rng() * 2200, 1.4, (0.5 + rng() * 0.5) * (1 - r / reps) * 0.9, pan); tt += 0.02 + rng() * 0.05; }
      yield;
    }
    const tc = rng() * secs, n = Math.round(1.2 * sr), i0 = Math.floor(tc * sr), bq = new BQ('lp', 800, 0.7, sr), bg = brownGen(rng), [gl, gr] = P(rng() - 0.5);
    for (let i = 0; i < n; i++) { const y = bq.run(bg()) * Math.min(1, i / (0.02 * sr)) * Math.exp(-3 * i / n) * 1.5; add(0, i0 + i, y * gl); add(1, i0 + i, y * gr); }
  } else if (name === 'fire') { // burning wreckage: flickering roar, flame hiss, crackles and pops
    const lp = two(() => new BQ('lp', 400, 0.7, sr)), br = two(() => brownGen(rng)), fl = two(() => smooth(0.15)), mb = two(() => new BQ('bp', 1200, 0.6, sr)), pk = two(() => pinkGen(rng)), fh = two(() => smooth(0.4));
    for (let i = 0; i < N; i++) { for (let c = 0; c < 2; c++) ch[c][i] = lp[c].run(br[c]()) * 1.2 * (0.6 + 0.4 * fl[c]()) + mb[c].run(pk[c]()) * 0.35 * fh[c](); if ((i & Y) === Y) yield; }
    let k = 0;
    for (let t = rng() * 0.05; t < secs; t += -Math.log(1 - rng()) / 20) {
      if (rng() < 0.1) knock(t, 0.006 + rng() * 0.006, 600 + rng() * 900, 1.2, 1.1 * (0.4 + 0.6 * rng()), rng() * 1.6 - 0.8);
      else knock(t, 0.001 + rng() * 0.003, 1000 + rng() * 4000, 1.5, Math.exp(-3 * rng()) * 0.9, rng() * 1.6 - 0.8);
      if (++k % 40 === 0) yield;
    }
  } else if (name === 'command') { // the monitor room: mains hum, fans, air conditioning, a rare soft UI blip
    const fb = two(() => new BQ('bp', 380, 0.7, sr)), pk = two(() => pinkGen(rng)), hs = two(() => new BQ('hp', 2000, 0.7, sr)), pk2 = two(() => pinkGen(rng));
    const f1 = q(50), f2 = q(100), f3 = q(150);
    for (let i = 0; i < N; i++) {
      const t = i / sr, hum = 0.05 * Math.sin(TAU * f1 * t) + 0.03 * Math.sin(TAU * f2 * t + 1) + 0.012 * Math.sin(TAU * f3 * t + 2);
      for (let c = 0; c < 2; c++) { ch[c][i] = fb[c].run(pk[c]()) * 0.9 + hs[c].run(pk2[c]()) * 0.15; tc[c][i] = hum; }
      if ((i & Y) === Y) yield;
    }
    for (let k = 0; k < 2; k++) chirp(1 + k * secs / 2 + rng() * 2, 0.07, 1180, 1180, 0.02, rng() - 0.5, { bell: 1 });
  } else if (name === 'sky') { // high altitude: strong wide wind, deep roar, a whistle in the gusts
    const bp = two(() => new BQ('bp', 900, 0.8, sr)), lp = two(() => new BQ('lp', 150, 0.7, sr)), pk = two(() => pinkGen(rng)), br = two(() => brownGen(rng));
    const fc = two(() => smooth(1.2)), gust = two(() => smooth(1.8)), wh = two(() => new BQ('bp', 2500, 8, sr));
    for (let i = 0; i < N; i++) {
      for (let c = 0; c < 2; c++) {
        if ((i & 63) === 0) bp[c].set(500 + 1300 * fc[c](), 0.8); else fc[c]();
        const g = gust[c]();
        ch[c][i] = bp[c].run(pk[c]()) * 2.4 * (0.35 + 0.65 * g) + lp[c].run(br[c]()) * 0.8 + wh[c].run(rng() * 2 - 1) * 0.08 * g * g;
      }
      if ((i & Y) === Y) yield;
    }
  } else if (name === 'airport') { // the limbo lounge: warm room tone, soft air handling, a far low rumble
    const lp = two(() => new BQ('lp', 800, 0.7, sr)), pk = two(() => pinkGen(rng)), hv = two(() => new BQ('bp', 250, 0.8, sr)), pk2 = two(() => pinkGen(rng));
    const rl = two(() => new BQ('lp', 80, 0.7, sr)), br = two(() => brownGen(rng)), dr = two(() => smooth(4)), air = two(() => new BQ('hp', 4000, 0.7, sr));
    for (let i = 0; i < N; i++) { for (let c = 0; c < 2; c++) ch[c][i] = lp[c].run(pk[c]()) * 0.9 + hv[c].run(pk2[c]()) * 0.4 + rl[c].run(br[c]()) * 0.5 * dr[c]() + air[c].run(rng() * 2 - 1) * 0.01; if ((i & Y) === Y) yield; }
  } else if (name === 'interior') { // a generic room: air + 50 Hz hum
    const lp = two(() => new BQ('lp', 700, 0.7, sr)), pk = two(() => pinkGen(rng)), f1 = q(50), f2 = q(100), f3 = q(150);
    for (let i = 0; i < N; i++) {
      const t = i / sr, hum = 0.3 * Math.sin(TAU * f1 * t) + 0.18 * Math.sin(TAU * f2 * t + 1) + 0.08 * Math.sin(TAU * f3 * t + 2);
      for (let c = 0; c < 2; c++) { tc[c][i] = hum * 0.5; ch[c][i] = lp[c].run(pk[c]()) * 0.35; }
      if ((i & Y) === Y) yield;
    }
  }
  yield;
  const out = loopify(ch, L, X);
  for (let c = 0; c < 2; c++) {
    const o = out[c], t = tc[c], e = evb[c];
    for (let i = 0; i < L; i++) o[i] += (i < X ? t[i] * (i / X) + t[L + i] * (1 - i / X) : t[i]) + e[i];
    removeDC(o);
  }
  let s = 0; out.forEach(a => { for (let i = 0; i < L; i++) s += a[i] * a[i]; });
  const g = dbg(BED[name][1]) / Math.sqrt(s / (2 * L) + 1e-20);
  out.forEach(a => { for (let i = 0; i < L; i++) a[i] *= g; });
  return toBuffer(out, sr);
}
AU.bedGen = bedGen;

// ------------------------------------------------------------------------------------ buffers & playback
const bedRate = sr => (sr >= 44100 ? Math.round(sr / 2) : sr);
function bedJob(R, name) { const J = R.B.bedJobs || (R.B.bedJobs = {}); return J[name] || (J[name] = bedGen(name, bedRate(R.sr))); }
function bedBuffer(R, name) { // synchronous (drains a partially-run incremental job if there is one)
  if (!BED[name]) return null;
  if (R.B.beds[name]) return R.B.beds[name];
  const job = bedJob(R, name); let r = job.next(); while (!r.done) r = job.next();
  return (R.B.beds[name] = r.value);
}
function bedAt(S, e, a) {
  const B = bedBuffer(S.R, e.name);
  if (!B) return;
  const v = new AU.Voice(S, a, a + e.len + 0.05), src = v.buf(B, true), g = v.gain(0);
  src._off = ((hashStr(e.name) % 997) / 997 * B.duration + e.t * 0.61) % B.duration; // start phase from the film time
  src.connect(g); g.connect(S.aBus);
  v.env(g.gain, e.pts);
  v.go();
}
function bedUses(tl) { // [[time of first use, bed name], ...] sorted
  const first = {};
  tl.forEach(s => {
    s.ambience.forEach(a => { if (a && BED[a.name] && first[a.name] == null) first[a.name] = s.start; });
    s.cues.forEach(c => { if (c && c.amb && BED[c.amb] && first[c.amb] == null) first[c.amb] = s.start + (+c.t || 0); });
  });
  return Object.keys(first).map(n => [first[n], n]).sort((a, b) => a[0] - b[0]);
}
function prepBeds(R, tl, from, horizon) { // synchronously build the beds audible within [from-3, from+horizon]
  const need = {};
  tl.forEach(s => {
    const hit = s.start + s.dur > from - 3 && s.start < from + horizon;
    if (hit) { s.ambience.forEach(a => { if (a) need[a.name] = 1; }); s.cues.forEach(c => { if (c && c.amb) need[c.amb] = 1; }); }
  });
  Object.keys(need).forEach(n => bedBuffer(R, n));
}
// Realtime: build the rest in the background, ≤ ~6 ms of work per 16 ms slot so the visuals never stall: beds in order
// of first use, then the bells the score needs (inst.js AU.bellJobs).
function warmIdle(R, tl, getEv) {
  const q = bedUses(tl).map(x => x[1]);
  let bells = null;
  const slot = () => {
    const t0 = AU.now();
    while (AU.now() - t0 < 6) {
      if (q.length) {
        const n = q[0];
        if (R.B.beds[n]) { q.shift(); continue; }
        const r = bedJob(R, n).next();
        if (r.done) { R.B.beds[n] = r.value; q.shift(); }
      } else {
        if (!bells) { try { bells = AU.bellJobs && getEv ? AU.bellJobs(R, getEv()) : []; } catch (e) { bells = []; } }
        if (!bells.length) return;
        const j = bells[0];
        if (R.B.misc[j.key]) { bells.shift(); continue; }
        const r = j.gen.next();
        if (r.done) { R.B.misc[j.key] = r.value; bells.shift(); }
      }
    }
    setTimeout(slot, 16);
  };
  setTimeout(slot, 50);
}
Object.assign(AU, { bedBuffer, bedAt, bedUses, prepBeds, warmIdle, bedRate });
})();
