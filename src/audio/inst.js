/* =====================================================================================================
   DOMAIN CLASH — instruments                                              (src/audio/inst.js, classic script)
   Registered with HT.AU.def(name, { strip, ring, res }, fn) — see engine.js. fn(S, e, a, dest) schedules one note:
   e = { t (film s), i, m (midi), d (written length s), v (velocity 0..1.5), o (options), cue }, a = audio start time.
   `ring` = audible tail beyond d (conservative: it sizes seek-resume and the chunk-seam pre-roll), `res` = the voice is
   exactly resumable (only buffers + LTI filters + resumable envelopes).
   Shared synthesis layers are exported on HT.AU.L for sfx.js (taiko membrane, metal ring, bell strike …).

   Japanese instruments (design notes / sources in the audio report):
   koto      Karplus-Strong + pick-position comb (tsume near the bridge), nail click, kiri-body resonance, oshide bends, yuri
   shamisen  KS with sawari buzz (the unilateral string/neck contact radiated as a persistent high-passed kink), bachi skin
   shaku     shakuhachi: flute-spectrum tone + pitch-tracking breath band + hiss, chiff, delayed vibrato, meri, portamento
   taiko     odaiko: near-harmonic air-loaded membrane modes, stretched-head pitch glide, bachi noise; kinds don/do/ka
   shime     shime-daiko: tight, high, short; kinds ten/ka
   bonsho    temple bell: pre-rendered inharmonic doublets (slow "unari" beating), oshi swell, very long okuri decay
   Film instruments: glass (glassy FM lead/arp), dbass (detuned saw bass), strings (ensemble, tremolo, sul ponticello,
   clusters), fmkeys (soft FM electric piano), clunk (Mahoraga's wheel as a pitched instrument), hyoshigi (kabuki
   clappers), tamtam, subdrop, tone (pure sustained tone with a quickening beat) + the general kit kept from HELLO,
   TOMORROW (bell, mbox, pluck, pizz, pad, bass, kick,
   snare, hat, tom, wood, crash, revcym, riser, sub, boom).
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { clamp, mtof, ADSR, PERC, Voice, def, ksBuffer, mulberry32, hashStr, toBuffer } = AU;
const O = e => e.o || {};
const noff = e => ((e.t * 7.317 + (e.m || 0) * 0.131) % 3.6 + 3.6) % 3.6; // deterministic noise-buffer offset

// ------------------------------------------------------------------------------------ channel strips
// [level, reverb send, delay send] — balanced in tools/audio-lab.html on the fight-test cue (K-weighted loudness per stem:
// the themes on glass/strings on top, taiko a few dB under, the detuned bass supportive, koto/shime as sparkle)
AU.strips({
  koto: [1.3, 0.24, 0.1], shamisen: [0.42, 0.2, 0.05], shaku: [0.5, 0.36, 0.1], taiko: [0.54, 0.2, 0], shime: [0.6, 0.14, 0],
  bonsho: [0.69, 0.42, 0], glass: [0.83, 0.3, 0.18], dbass: [0.28, 0.03, 0], strings: [0.68, 0.34, 0], fmkeys: [0.5, 0.3, 0.08],
  clunk: [0.87, 0.26, 0], perc: [0.34, 0.16, 0.02], fx: [0.34, 0.3, 0], drone: [0.16, 0.14, 0], tone: [0.3, 0.22, 0],
  bell: [0.3, 0.42, 0.14], mbox: [0.36, 0.36, 0.1], pluck: [0.4, 0.18, 0.08], pizz: [0.44, 0.2, 0], pad: [0.2, 0.34, 0],
  bass: [0.4, 0.02, 0], kick: [0.42, 0.02, 0], snare: [0.28, 0.16, 0], hat: [0.13, 0.04, 0], cym: [0.16, 0.18, 0],
});

// ------------------------------------------------------------------------------------ shared layers (AU.L)
const L = (AU.L = {});
// Membrane: modes [[ratio, amp, decay factor]], pitch glide: start at f0·(1+glide) → f0·1.02 in `gt` s → f0·0.985.
L.membrane = (v, dest, t, f0, modes, amp, dec, glide, gt) => {
  for (const [r, g, df] of modes) {
    const f = f0 * r, x = v.at(v.osc('sine', f), t, t + dec * df + 0.05), gg = v.gain(0);
    x.connect(gg); gg.connect(dest);
    v.env(x.frequency, [[0, f * (1 + glide)], [gt, f * 1.02, 'e'], [Math.max(gt + 0.01, dec * df), f * 0.985, 'e']], false, t);
    v.env(gg.gain, PERC(0.0015, dec * df, g * amp), true, t);
  }
};
// Metal ring: parts [[ratio, amp, t60 factor, doublet split Hz]] — each part optionally a beating doublet.
L.ring = (v, dest, t, f, parts, amp, t60, sr) => {
  const nyq = (sr || 48000) * 0.45;
  for (const [r, g, tf, split] of parts) {
    const fr = f * r;
    if (fr > nyq) continue;
    const T = t60 * tf, comps = split ? [[fr, 0.6], [fr + split, 0.4]] : [[fr, 1]];
    for (const [ff, w] of comps) {
      const x = v.at(v.osc('sine', ff), t, t + T + 0.05), gg = v.gain(0);
      x.connect(gg); gg.connect(dest);
      v.env(gg.gain, PERC(0.001, T, g * w * amp), true, t);
    }
  }
};
// Short filtered noise burst (hits, sticks, clicks). kind: noise buffer, type/f/q: filter.
L.burst = (v, dest, t, dur, amp, type, f, q, kind, off, att) => {
  const n = v.at(v.noise(kind || 'white', off || 0), t, t + dur + 0.02), fl = v.filt(type || 'bandpass', f || 1000, q || 0.8), g = v.gain(0);
  n.connect(fl); fl.connect(g); g.connect(dest);
  v.env(g.gain, [[0, 0], [att || 0.0008, amp], [dur, amp * 0.001, 'e'], [dur + 0.01, 0]], true, t);
  return fl;
};
// Pitch-dropping sine thump.
L.thump = (v, dest, t, f0, f1, dur, amp, drop) => {
  const x = v.at(v.osc('sine', f0), t, t + dur + 0.03), g = v.gain(0);
  x.connect(g); g.connect(dest);
  v.env(x.frequency, [[0, f0], [drop || dur * 0.35, f1, 'e'], [dur, f1 * 0.92, 'e']], false, t);
  v.env(g.gain, [[0, 0], [0.002, amp], [dur, amp * 0.001, 'e'], [dur + 0.01, 0]], true, t);
};

// ------------------------------------------------------------------------------------ koto
const kotoT60 = f => clamp(2.8 * Math.pow(330 / f, 0.35), 0.9, 4.5);
function ksPlay(S, e, a, dest, cfg) { // shared by koto / shamisen / pluck
  const o = O(e), f = mtof(e.m), t60 = o.t60 || cfg.t60(f);
  const hold = o.let ? Math.min(t60, cfg.maxLet || 99) : e.d;
  const bd = Math.round(clamp(hold + 0.25, 0.3, t60 + 0.3) * 4) / 4;
  const b = ksBuffer(S.R, e.m, bd, t60, o.bright || cfg.bright, cfg.ks(o));
  const rel = cfg.rel || 0.14, stopAt = Math.min(bd - 0.03, hold);
  const v = new Voice(S, a, a + stopAt + rel + 0.05);
  const src = v.buf(b), amp = v.gain(0), pn = v.pan(o.pan || 0);
  let node = src;
  for (const [type, fq, q, gdb] of cfg.eq) { const fl = v.filt(type, fq, q, gdb); node.connect(fl); node = fl; }
  node.connect(amp); amp.connect(pn); pn.connect(dest);
  const pk = cfg.amp * e.v;
  v.env(amp.gain, [[0, pk], [stopAt, pk], [stopAt + rel, 0]]);
  if (o.bend != null) { const at = o.bendAt != null ? o.bendAt : 0.12, bdur = o.bendDur || 0.15; v.env(src.detune, [[0, 0], [at, 0], [at + bdur, o.bend * 100], [at + bdur + (o.bendHold != null ? o.bendHold : 99), o.bend * 100]], false); }
  if (o.yuri) { const lg = v.lfo(o.yuriRate || 5, 0, src.detune); v.env(lg.gain, [[0, 0], [0.22, 0], [0.6, o.yuri]], false); }
  return { v, pn, pk, o };
}
// Koto: plucked near the bridge with ivory tsume → bright, nasal (pick comb β≈0.12), kiri-wood body, nail click.
// o.let = ring freely (else damped after d); o.bend (semitones, oshide) at o.bendAt over o.bendDur; o.yuri (cents).
def('koto', { strip: 'koto', ring: (m, d, o) => (o.let ? (o.t60 || kotoT60(mtof(m))) : 0) + 0.3, res: o => o.bend == null && !o.yuri }, (S, e, a, dest) => {
  const { v, pn, pk } = ksPlay(S, e, a, dest, { t60: kotoT60, bright: 0.88, amp: 0.62, ks: o => ({ pick: o.pick || 0.12 }),
    eq: [['peaking', 280, 1.1, 3], ['highshelf', 4500, 0.7, 2.5]] });
  L.burst(v, pn, a, 0.012, 0.16 * pk, 'highpass', 3500, 0.8, 'white', noff(e)); // tsume click
  v.go();
});
// Shamisen: brighter, drier (skin body), sawari buzz, and the bachi hitting the skin ("pa").
const shamT60 = f => clamp(1.3 * Math.pow(262 / f, 0.25), 0.6, 1.8);
def('shamisen', { strip: 'shamisen', ring: (m, d, o) => (o.let ? 1.6 : 0) + 0.3, res: o => o.bend == null && !o.yuri }, (S, e, a, dest) => {
  const { v, pn, pk } = ksPlay(S, e, a, dest, { t60: shamT60, maxLet: 1.6, bright: 0.95, amp: 0.55, rel: 0.1,
    ks: o => ({ pick: o.pick || 0.07, buzz: o.buzz == null ? 2.2 : o.buzz, buzzTh: o.buzzTh == null ? 0.3 : o.buzzTh }),
    eq: [['highpass', 110, 0.7], ['peaking', 460, 1.4, 4], ['peaking', 2600, 1.2, 2]] });
  L.burst(v, pn, a, 0.014, 0.5 * pk, 'bandpass', 2300, 0.9, 'white', noff(e));   // bachi on skin
  L.thump(v, pn, a, 200, 125, 0.06, 0.35 * pk, 0.03);                         // skin membrane
  v.go();
});
// Karplus-Strong guitar / harp-like pluck (general).
def('pluck', { strip: 'pluck', ring: 0.3, res: true }, (S, e, a, dest) => {
  const { v } = ksPlay(S, e, a, dest, { t60: () => O(e).t60 || 2.2, bright: 0.55, amp: 0.8, rel: 0.1, ks: () => ({}), eq: [] });
  v.go();
});
def('pizz', { strip: 'pizz', ring: 0.8, res: true }, (S, e, a, dest) => { // KS with heavy damping = pizzicato
  const o = O(e), b = ksBuffer(S.R, e.m, 0.75, o.t60 || 0.42, o.bright || 0.3);
  const v = new Voice(S, a, a + 0.8);
  const src = v.buf(b), lp = v.filt('lowpass', o.cut || 2600, 0.7), amp = v.gain(0), pn = v.pan(o.pan || 0);
  src.connect(lp); lp.connect(amp); amp.connect(pn); pn.connect(dest);
  v.env(amp.gain, [[0, 0.9 * e.v], [0.7, 0.9 * e.v], [0.75, 0]]);
  v.go();
});

// ------------------------------------------------------------------------------------ shakuhachi
def('shaku', { strip: 'shaku', ring: (m, d, o) => (o.rel || 0.28) + 0.06 }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), d = e.d, at = o.att || (o.muraiki ? 0.05 : 0.14), rel = o.rel || 0.28;
  const v = new Voice(S, a, a + d + rel + 0.05);
  const pn = v.pan(o.pan || 0), lp = v.filt('lowpass', 1500 + 3600 * clamp(e.v, 0, 1), 0.6);
  lp.connect(pn); pn.connect(dest);
  // pitch curve in cents (tone + breath band): portamento from o.from, or a meri scoop, then an optional fall
  const cents = [[0, 0]];
  if (o.from != null) { cents[0] = [0, (o.from - e.m) * 100]; cents.push([o.port || 0.12, 0]); }
  else if (o.meri) { cents[0] = [0, -o.meri * 100]; cents.push([o.meriT || 0.22, 0]); }
  if (o.fall && d > 0.4) { cents.push([Math.max(cents[cents.length - 1][0] + 0.01, d - 0.3), 0]); cents.push([d + rel, -o.fall * 100]); }
  const tone = v.osc(S.R.w.flute, f), tg = v.gain(0);
  tone.connect(tg); tg.connect(lp);
  v.env(tone.detune, cents, false);
  const n = v.noise('white', noff(e)), bp = v.filt('bandpass', f, 9), bg = v.gain(0);   // air-column breath band
  n.connect(bp); bp.connect(bg); bg.connect(lp);
  v.env(bp.detune, cents, false);
  const n2 = v.noise('pink', noff(e) + 1.3), hp = v.filt('highpass', 2600, 0.7), hg = v.gain(0); // edge-tone hiss
  n2.connect(hp); hp.connect(hg); hg.connect(pn);
  if (d > 0.6 && o.vib !== 0) { const lg = v.lfo(o.vibRate || 5.2, 0, tone.detune); lg.connect(bp.detune); v.env(lg.gain, [[0, 0], [0.35, 0], [0.9, o.vib || 16]], false); }
  const pk = 0.3 * e.v, br = o.breath == null ? 0.5 : o.breath;
  v.env(tg.gain, ADSR(at, 0.25, 0.86, d, rel, pk));
  v.env(bg.gain, ADSR(at * 0.6, 0.2, 0.7, d, rel, pk * br * 9));
  v.env(hg.gain, ADSR(at * 0.5, 0.15, 0.55, d, rel, pk * br * 0.8));
  const c = v.at(v.noise('white', noff(e) + 2.1), a, a + 0.26), cb = v.filt('bandpass', f * 2.6, 1.4), cg = v.gain(0); // chiff / muraiki
  c.connect(cb); cb.connect(cg); cg.connect(lp);
  v.env(cg.gain, o.muraiki ? [[0, 0], [0.02, pk * 2.4], [0.22, 0]] : [[0, 0], [0.006, pk * 0.9], [0.05, 0]]);
  v.go();
});

// ------------------------------------------------------------------------------------ taiko
const TAIKO_MODES = [[1, 1, 1], [1.5, 0.42, 0.34], [1.98, 0.24, 0.2], [2.46, 0.13, 0.13], [2.9, 0.07, 0.09]];
def('taiko', { strip: 'taiko', ring: (m, d, o) => (o.kind === 'ka' ? 0.12 : (o.dec || (o.kind === 'do' ? 0.7 : 1.5))) + 0.08 }, (S, e, a, dest) => {
  const o = O(e), vel = clamp(e.v, 0, 1.5), kind = o.kind || 'don';
  const dec = kind === 'ka' ? 0.1 : (o.dec || (kind === 'do' ? 0.7 : 1.5));
  const v = new Voice(S, a, a + dec + 0.06), out = v.gain(1), pn = v.pan(o.pan || 0);
  out.connect(pn); pn.connect(dest);
  if (kind === 'ka') { // rim / shell: dry wooden click, no membrane
    L.burst(v, out, a, 0.03, 0.55 * vel, 'bandpass', 1900, 2.2, 'white', noff(e));
    const x = v.osc('sine', 830), g = v.gain(0); x.connect(g); g.connect(out); v.env(g.gain, PERC(0.0008, 0.035, 0.4 * vel));
    const y = v.osc('sine', 1710), g2 = v.gain(0); y.connect(g2); g2.connect(out); v.env(g2.gain, PERC(0.0008, 0.02, 0.2 * vel));
    v.go(); return;
  }
  const f0 = e.m ? mtof(e.m) : (o.f || 58), bright = clamp(0.35 + 0.5 * vel, 0, 1);
  const modes = TAIKO_MODES.map(([r, g, df], k) => [r, k ? g * bright : g, df]);
  L.membrane(v, out, a, f0, modes, 0.72 * vel, dec, 0.22 + 0.14 * vel, 0.05);
  L.burst(v, out, a, 0.02, 0.3 * vel * bright, 'bandpass', 1100, 0.9, 'white', noff(e));          // bachi on the head
  L.burst(v, out, a, 0.004, 0.16 * vel * bright, 'highpass', 3200, 0.7, 'white', noff(e) + 0.7);   // stick click
  L.thump(v, out, a, 190, 110, 0.07, 0.26 * vel, 0.04);                                              // head slap
  v.go();
});
def('shime', { strip: 'shime', ring: (m, d, o) => (o.kind === 'ka' ? 0.1 : 0.32) }, (S, e, a, dest) => {
  const o = O(e), vel = clamp(e.v, 0, 1.5), kind = o.kind || 'ten';
  const v = new Voice(S, a, a + (kind === 'ka' ? 0.1 : 0.3)), out = v.gain(1), pn = v.pan(o.pan != null ? o.pan : 0.15);
  out.connect(pn); pn.connect(dest);
  if (kind === 'ka') { L.burst(v, out, a, 0.025, 0.45 * vel, 'bandpass', 2600, 2.5, 'white', noff(e)); v.go(); return; }
  const f0 = e.m ? mtof(e.m) : (o.f || 430);
  L.membrane(v, out, a, f0, [[1, 1, 1], [1.59, 0.5, 0.45], [2.14, 0.3, 0.3], [2.3, 0.22, 0.25], [2.65, 0.12, 0.2]], 0.5 * vel, 0.22, 0.07, 0.015);
  L.burst(v, out, a, 0.008, 0.38 * vel, 'bandpass', 3100, 1.0, 'white', noff(e));
  L.burst(v, out, a, 0.003, 0.2 * vel, 'highpass', 5000, 0.7, 'white', noff(e) + 0.5);
  v.go();
});

// ------------------------------------------------------------------------------------ bonsho (temple bell)
// [ratio, amp, T60 factor, doublet split Hz, oshi swell time constant s]
const BONSHO = [[1.0, 1.0, 1.0, 0.55, 0], [2.02, 0.5, 0.62, 1.7, 0], [2.73, 0.8, 0.42, 2.3, 0.35], [3.46, 0.34, 0.28, 1.1, 0],
  [4.63, 0.3, 0.18, 2.9, 0.12], [5.72, 0.17, 0.12, 1.6, 0], [7.14, 0.11, 0.08, 3.4, 0], [8.9, 0.07, 0.05, 2.2, 0]];
const halfRate = sr => (sr >= 44100 ? Math.round(sr / 2) : sr);
function* bonshoGen(sr0, midi, t60) { // pre-render (half rate), yields every ~64k samples
  const sr = halfRate(sr0), f0 = mtof(midi), n = Math.round(sr * t60 * 1.02), out = new Float32Array(n);
  const rng = mulberry32(hashStr('bonsho:' + midi + ':' + t60));
  for (const [r, g, tf, split, sw] of BONSHO) {
    const T = t60 * tf;
    for (const [ff, w] of [[f0 * r, 0.62], [f0 * r + split, 0.38]]) {
      if (ff > sr * 0.45) continue;
      const wr = 2 * Math.PI * ff / sr, c = Math.cos(wr), s = Math.sin(wr), ph = rng() * 2 * Math.PI;
      const d1 = Math.exp(-6.91 / (T * sr)), d2 = sw ? Math.exp(-6.91 / (T * sr) - 1 / (sw * sr)) : 0;
      let x = Math.cos(ph), y = Math.sin(ph), x2 = x, y2 = y, a1 = g * w, a2 = sw ? g * w : 0;
      for (let i = 0; i < n; i++) {
        out[i] += x * a1 - x2 * a2; // oshi partials swell: e^{-t/T} − e^{-t/T − t/sw}
        const nx = x * c - y * s; y = x * s + y * c; x = nx; a1 *= d1;
        if (sw) { const nx2 = x2 * c - y2 * s; y2 = x2 * s + y2 * c; x2 = nx2; a2 *= d2; }
        if ((i & 65535) === 65535) yield;
      }
    }
  }
  let pk = 1e-9; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
  const fo = Math.round(sr * 0.5), fi = Math.round(sr * 0.003);
  for (let i = 0; i < n; i++) { out[i] /= pk; if (i < fi) out[i] *= i / fi; if (i > n - fo) out[i] *= (n - i) / fo; }
  return toBuffer([out], sr);
}
const bonshoKey = (midi, t60) => 'bonsho|' + midi + '|' + t60.toFixed(1);
function bonshoBuf(R, midi, t60) {
  const k = bonshoKey(midi, t60);
  if (R.B.misc[k]) return R.B.misc[k];
  const g = bonshoGen(R.sr, midi, t60); let r = g.next(); while (!r.done) r = g.next();
  return (R.B.misc[k] = r.value);
}
AU.bonshoBuf = bonshoBuf; AU.bonshoGen = bonshoGen; AU.bonshoKey = bonshoKey;
def('bonsho', { strip: 'bonsho', ring: (m, d, o) => (o.t60 || 28) * 1.02 + 0.1, res: true }, (S, e, a, dest) => {
  const o = O(e), t60 = o.t60 || 28, B = bonshoBuf(S.R, e.m, t60), f0 = mtof(e.m), vel = clamp(e.v, 0, 1.5);
  const v = new Voice(S, a, a + B.duration + 0.05), pn = v.pan(o.pan || 0), out = v.gain(1);
  out.connect(pn); pn.connect(dest);
  const src = v.buf(B), g = v.gain(0); src.connect(g); g.connect(out);
  v.env(g.gain, [[0, 0.5 * vel], [B.duration - 0.02, 0.5 * vel], [B.duration, 0]]);
  // atari: the shumoku beam — a dull wooden thud + an inharmonic FM clang that dies within half a second
  L.burst(v, out, a, 0.09, 0.35 * vel, 'lowpass', 280, 0.7, 'brown', noff(e));
  const car = v.at(v.osc('sine', f0 * 2.73), a, a + 0.6), mod = v.at(v.osc('sine', f0 * 2.73 * 1.41), a, a + 0.6), mg = v.gain(0), cg = v.gain(0);
  mod.connect(mg); mg.connect(car.frequency); car.connect(cg); cg.connect(out);
  v.env(mg.gain, [[0, f0 * 2.73 * 2.6], [0.3, f0 * 0.05, 'e']], false);
  v.env(cg.gain, PERC(0.002, 0.5, 0.2 * vel));
  v.go();
});

// ------------------------------------------------------------------------------------ glass (glassy FM)
// Two detuned FM pairs (carrier:modulator 1:3.5, fast-decaying index → a bright glassy attack over a pure body),
// spread in stereo, plus an octave partial. o.arp: percussive (t60), else a sustained lead with delayed vibrato.
const glassT60 = f => clamp(1.6 * Math.pow(880 / f, 0.3), 0.5, 2.6);
def('glass', { strip: 'glass', ring: (m, d, o) => (o.arp ? (o.t60 || glassT60(mtof(m))) : (o.rel || 0.45)) + 0.06 }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), d = e.d, arp = !!o.arp, t60 = o.t60 || glassT60(f), rel = o.rel || 0.45;
  const v = new Voice(S, a, arp ? a + t60 + 0.05 : a + d + rel + 0.05);
  const out = v.gain(0), pn = v.pan(o.pan || 0); out.connect(pn); pn.connect(dest);
  const ratio = o.ratio || 3.5, nyq = S.R.sr * 0.45;
  const idx = Math.min((o.idx || 2.4) * (0.5 + 0.6 * clamp(e.v, 0, 1.2)), (nyq - f) / (f * ratio));
  const vib = !arp && d > 0.45 && o.vib !== 0 ? v.gain(0) : null;
  if (vib) { const lf = v.osc('sine', o.vibRate || 5.4); lf.connect(vib); v.env(vib.gain, [[0, 0], [0.3, 0], [0.75, o.vib || 9]], false); }
  [-1, 1].forEach(sg => {
    const car = v.osc('sine', f, sg * 4), mod = v.osc('sine', f * ratio, sg * 4), mg = v.gain(0), cg = v.gain(0.5), pk = v.pan(sg * 0.35);
    mod.connect(mg); mg.connect(car.frequency); car.connect(cg); cg.connect(pk); pk.connect(out);
    if (vib) { vib.connect(car.detune); vib.connect(mod.detune); }
    v.env(mg.gain, [[0, f * idx], [0.07, f * idx * 0.3, 'e'], [0.6, f * idx * 0.06, 'e']], false);
  });
  const p2 = v.osc('sine', f * 2), g2 = v.gain(0); p2.connect(g2); g2.connect(out);
  v.env(g2.gain, PERC(0.002, Math.min(1.2, t60 * 0.5), 0.16));
  v.env(out.gain, arp ? PERC(0.002, t60, 0.42 * e.v) : ADSR(o.att || 0.012, 0.3, 0.6, d, rel, 0.42 * e.v));
  v.go();
});

// ------------------------------------------------------------------------------------ dbass (Sukuna's bass)
// Two sawtooths ±9 cents + a sine sub an octave down, 24 dB low-pass with a filter envelope (o.cut, o.env), o.drive
// 1|2 = tanh saturation (growl). Short, punchy by default.
def('dbass', { strip: 'dbass', ring: (m, d, o) => (o.rel || 0.08) + 0.05 }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), d = e.d, rel = o.rel || 0.08, vel = clamp(e.v, 0, 1.5);
  const v = new Voice(S, a, a + d + rel + 0.04);
  const lp1 = v.filt('lowpass', 800, o.q || 1.6), lp2 = v.filt('lowpass', 800, 0.6), amp = v.gain(0);
  [-9, 9].forEach(dt => { const x = v.osc('sawtooth', f, dt); x.connect(lp1); });
  lp1.connect(lp2);
  let node = lp2;
  if (o.drive) { const pre = v.gain(o.drive === 2 ? 2.2 : 1.4), sh = v.shaper(o.drive === 2 ? S.R.drive2 : S.R.drive), post = v.gain(0.7); node.connect(pre); pre.connect(sh); sh.connect(post); node = post; }
  node.connect(amp);
  const sub = v.osc('sine', f >= 55 ? f / 2 : f), sg = v.gain(o.sub == null ? 0.55 : o.sub); sub.connect(sg); sg.connect(amp);
  amp.connect(dest);
  const c0 = (o.cut || 420) * (0.7 + 0.5 * vel), env = o.env == null ? 5 : o.env;
  v.env(lp1.frequency, [[0, c0 * env], [0.18, c0 * 1.3, 'e'], [Math.max(0.19, d), c0, 'e']], false);
  v.env(lp2.frequency, [[0, c0 * env * 1.3], [0.18, c0 * 1.6, 'e'], [Math.max(0.19, d), c0 * 1.2, 'e']], false);
  v.env(amp.gain, ADSR(0.005, 0.16, 0.78, d, rel, 0.5 * vel));
  v.go();
});

// ------------------------------------------------------------------------------------ strings (ensemble)
// n detuned sawtooths (±15 cents) panned across the stereo field, two slow vibrato LFOs, low-pass + high-pass.
// o.att/o.rel (s), o.cut (Hz), o.trem (Hz, bowed tremolo), o.pont (sul ponticello: glassy, thin), o.cluster
// ([semitone offsets] added as extra detuned voices sharing the envelope), o.n (voices), o.sfz (hard accent).
const STR_DET = [-15, -6, 1, 8, 14, -11, 11];
def('strings', { strip: 'strings', ring: (m, d, o) => (o.rel != null ? o.rel : 0.7) + (o.sfz ? 0.4 : 0.08) }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), vel = clamp(e.v, 0, 1.5);
  const at = o.att != null ? o.att : (o.sfz ? 0.02 : 0.35), rel = o.rel != null ? o.rel : 0.7;
  const d = o.sfz ? Math.max(e.d, at + 0.27) : e.d;
  const v = new Voice(S, a, a + d + rel + 0.06);
  const cut = o.cut || (o.pont ? 7000 : 1800 + 2600 * clamp(vel, 0, 1));
  const lp = v.filt('lowpass', cut, 0.5), hp = v.filt('highpass', o.pont ? 900 : 65, 0.7), amp = v.gain(0);
  lp.connect(hp); hp.connect(amp);
  let node = amp;
  if (o.trem) { const tg = v.gain(0.55); v.lfo(o.trem, 0.45, tg.gain, 'triangle'); amp.connect(tg); node = tg; }
  node.connect(dest);
  const l1 = v.gain(0), l2 = v.gain(0), o1 = v.osc('sine', 5.3), o2 = v.osc('sine', 5.9);
  o1.connect(l1); o2.connect(l2);
  const vd = o.vib == null ? 7 : o.vib;
  v.env(l1.gain, [[0, 0], [at + 0.15, 0], [at + 0.6, vd]], false); v.env(l2.gain, [[0, 0], [at + 0.2, 0], [at + 0.7, vd]], false);
  const n = o.n || (f > 900 ? 3 : 5), tones = [[e.m, n]];
  (o.cluster || []).forEach(c => tones.push([e.m + c, 3]));
  let cnt = 0;
  tones.forEach(([m, k]) => {
    const fm = mtof(m);
    for (let j = 0; j < k; j++) {
      const x = v.osc('sawtooth', fm, STR_DET[j % STR_DET.length] + (j >= 5 ? 3 : 0)), p = v.pan(((j % 5) - 2) * 0.28);
      x.connect(p); p.connect(lp); (cnt++ % 2 ? l2 : l1).connect(x.detune);
    }
  });
  const pk = (o.sfz ? 0.22 : 0.15) * vel / Math.sqrt(cnt / 5);
  v.env(amp.gain, o.sfz ? [[0, 0], [at, pk * 1.6], [at + 0.25, pk * 0.6, 'e'], [d, pk * 0.55], [d + rel, 0]] : ADSR(at, 0.3, 0.9, d, rel, pk));
  v.go();
});

// ------------------------------------------------------------------------------------ fmkeys (soft FM e-piano)
// Additive body (1, 2, 3 × f with faster decays up the series) + an FM "tine" (carrier f, modulator 14 f, index
// decaying in 40 ms — the DX7 e-piano trick, placed so no sideband lands at 0 Hz), soft velocity response,
// o.trem = suitcase auto-pan rate (Hz).
const keysT60 = f => clamp(3.4 * Math.pow(262 / f, 0.5), 0.9, 6);
def('fmkeys', { strip: 'fmkeys', ring: (m, d, o) => (o.rel || 0.4) + 0.06 }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), d = e.d, rel = o.rel || 0.4, vel = clamp(e.v, 0, 1.3), t60 = o.t60 || keysT60(f);
  const hold = Math.min(d, t60);
  const v = new Voice(S, a, a + hold + rel + 0.05);
  const out = v.gain(1), pn = v.pan(o.pan || 0); out.connect(pn); pn.connect(dest);
  if (o.trem) v.lfo(o.trem, 0.25, pn.pan);
  const decAt = (T, x) => Math.exp(-6.91 * x / T);
  [[1, 1, t60], [2, 0.22 * (0.6 + 0.5 * vel), t60 * 0.45], [3, 0.06 * vel, t60 * 0.25]].forEach(([r, g, T]) => {
    const x = v.osc('sine', f * r), gg = v.gain(0); x.connect(gg); gg.connect(out);
    const A = 0.3 * vel * g;
    v.env(gg.gain, [[0, 0], [0.004, A], [hold, A * decAt(T, hold), 'e'], [hold + rel, 0]]);
  });
  const car = v.at(v.osc('sine', f), a, a + 0.35), mod = v.at(v.osc('sine', f * 14), a, a + 0.35), mg = v.gain(0), cg = v.gain(0);
  mod.connect(mg); mg.connect(car.frequency); car.connect(cg); cg.connect(out);
  v.env(mg.gain, [[0, Math.max(f * 0.2, Math.min(f * 14 * 1.3, S.R.sr * 0.45 - f))], [0.04, f * 0.1, 'e']], false);
  v.env(cg.gain, PERC(0.001, 0.3, 0.1 * Math.pow(vel, 1.5)));
  v.go();
});

// ------------------------------------------------------------------------------------ Mahoraga's wheel (clunk)
// Heavy mechanical clunk + a massive metal ring (inharmonic ring partials, beating doublets) pitched on m.
const CLUNK_PARTS = [[1, 1, 1, 1.3], [2.32, 0.6, 0.7, 0.9], [3.87, 0.45, 0.5, 0], [5.43, 0.3, 0.35, 2.1], [7.1, 0.18, 0.25, 0]];
L.clunk = (v, dest, t, f, amp, t60, sr, off) => {
  L.thump(v, dest, t, 78, 42, 0.2, 0.8 * amp, 0.06);                          // the mass stopping
  L.burst(v, dest, t, 0.03, 0.55 * amp, 'bandpass', 1250, 1.1, 'white', off);   // metal impact
  L.burst(v, dest, t + 0.004, 0.005, 0.3 * amp, 'highpass', 3600, 0.7, 'white', (off || 0) + 0.3); // latch click
  L.ring(v, dest, t, f, CLUNK_PARTS, 0.22 * amp, t60, sr);
};
def('clunk', { strip: 'clunk', ring: (m, d, o) => (o.t60 || 1.6) + 0.1 }, (S, e, a, dest) => {
  const o = O(e), t60 = o.t60 || 1.6, v = new Voice(S, a, a + t60 + 0.08), pn = v.pan(o.pan || 0);
  pn.connect(dest);
  L.clunk(v, pn, a, mtof(e.m || 45), clamp(e.v, 0, 1.5), t60, S.R.sr, noff(e));
  v.go();
});
// Hyoshigi: two hardwood clappers struck together (kabuki "ki") — a hard transient + short wood modes.
L.clack = (v, dest, t, amp, off) => {
  L.burst(v, dest, t, 0.006, 0.8 * amp, 'highpass', 1800, 0.7, 'white', off);
  [[1920, 0.5, 0.09], [3180, 0.32, 0.06], [4460, 0.18, 0.04], [990, 0.2, 0.05]].forEach(([fq, g, T]) => {
    const x = v.at(v.osc('sine', fq), t, t + T + 0.03), gg = v.gain(0); x.connect(gg); gg.connect(dest); v.env(gg.gain, PERC(0.0005, T, g * amp), true, t);
  });
};
def('hyoshigi', { strip: 'perc', ring: 0.25 }, (S, e, a, dest) => {
  const o = O(e), v = new Voice(S, a, a + (o.double ? 0.3 : 0.2)), pn = v.pan(o.pan || 0); pn.connect(dest);
  L.clack(v, pn, a, clamp(e.v, 0, 1.5), noff(e));
  if (o.double) L.clack(v, pn, a + 0.085, clamp(e.v, 0, 1.5) * 0.8, noff(e) + 0.9);
  v.go();
});
// Tam-tam: a cloud of inharmonic partials that blooms (energy climbs into the higher modes after the strike) over a
// noise wash; long decay.
def('tamtam', { strip: 'fx', ring: (m, d, o) => (o.dec || 6) + 0.1 }, (S, e, a, dest) => {
  const o = O(e), dec = o.dec || 6, vel = clamp(e.v, 0, 1.5), v = new Voice(S, a, a + dec + 0.06);
  const out = v.gain(1), pn = v.pan(o.pan || 0); out.connect(pn); pn.connect(dest);
  const rng = mulberry32(hashStr('tamtam:' + (e.m || 0)));
  const f0 = e.m ? mtof(e.m) : 70;
  for (let k = 0; k < 22; k++) {
    const fr = f0 * (1 + k * 0.63 + rng() * 0.4) * (1 + 0.004 * k * k), bloom = 0.05 + 0.9 * (k / 22), T = dec * (0.35 + 0.65 * (1 - k / 22));
    if (fr > S.R.sr * 0.4) continue;
    const x = v.osc('sine', fr), g = v.gain(0); x.connect(g); g.connect(out);
    v.env(g.gain, [[0, 0], [0.004, 0.02 * vel], [bloom, 0.06 * vel * (1 - k / 40), 'e'], [T, 0.0001, 'e'], [T + 0.02, 0]]);
  }
  L.burst(v, out, a, dec * 0.6, 0.12 * vel, 'highpass', 1400, 0.6, 'white2', noff(e), 0.3);
  L.thump(v, out, a, 90, 55, 0.5, 0.35 * vel, 0.1);
  v.go();
});
// Sub drop: 808-style sine falling from 1.8·f to f and on down, long decay.
def('subdrop', { strip: 'fx', ring: (m, d, o) => (o.dec || 2.4) + 0.1 }, (S, e, a, dest) => {
  const o = O(e), f = e.m ? mtof(e.m) : 36, dec = o.dec || 2.4, v = new Voice(S, a, a + dec + 0.06);
  const x = v.osc('sine', f * 1.8), g = v.gain(0); x.connect(g); g.connect(dest);
  v.env(x.frequency, [[0, f * 1.8], [0.25, f, 'e'], [dec, f * 0.72, 'e']], false);
  v.env(g.gain, [[0, 0], [0.01, 0.9 * e.v], [dec * 0.4, 0.5 * e.v, 'e'], [dec, 0.001, 'e'], [dec + 0.02, 0]]);
  v.go();
});

// ------------------------------------------------------------------------------------ general kit (kept)
def('bell', { strip: 'bell', ring: (m, d, o) => (o.t60 || clamp(2.6 * Math.pow(440 / mtof(m), 0.35), 0.8, 4)) + 0.06 }, (S, e, a, dest) => { // FM bell (Chowning 1973)
  const o = O(e), f = mtof(e.m), t60 = o.t60 || clamp(2.6 * Math.pow(440 / f, 0.35), 0.8, 4);
  const v = new Voice(S, a, a + t60 + 0.06);
  const car = v.osc('sine', f), mod = v.osc('sine', f * (o.ratio || 3.5)), mg = v.gain(0);
  mod.connect(mg); mg.connect(car.frequency);
  v.env(mg.gain, [[0, f * (o.index || 2)], [0.45, f * 0.12, 'e'], [t60, f * 0.04, 'e']], false);
  const p2 = v.osc('sine', f * 2), g2 = v.gain(0), amp = v.gain(0), pn = v.pan(o.pan || 0);
  p2.connect(g2); car.connect(amp); g2.connect(amp); amp.connect(pn); pn.connect(dest);
  v.env(amp.gain, PERC(0.003, t60, 0.45 * e.v));
  v.env(g2.gain, PERC(0.002, t60 * 0.28, 0.3));
  v.go();
});
def('mbox', { strip: 'mbox', ring: (m, d, o) => (o.t60 || clamp(2.2 * Math.pow(523 / mtof(m), 0.4), 0.7, 3.2)) + 0.06 }, (S, e, a, dest) => { // music box
  const o = O(e), f = mtof(e.m), t60 = o.t60 || clamp(2.2 * Math.pow(523 / f, 0.4), 0.7, 3.2);
  const v = new Voice(S, a, a + t60 + 0.06);
  const car = v.osc('sine', f), mod = v.osc('sine', f * 2), mg = v.gain(0);
  mod.connect(mg); mg.connect(car.frequency);
  v.env(mg.gain, [[0, f * 0.9], [0.22, f * 0.02, 'e']], false);
  const amp = v.gain(0), pn = v.pan(o.pan || 0);
  car.connect(amp); amp.connect(pn); pn.connect(dest);
  if (f * 6.27 < 15000) { const tn = v.osc('sine', f * 6.27), tg = v.gain(0); tn.connect(tg); tg.connect(amp); v.env(tg.gain, PERC(0.001, 0.11, 0.22)); }
  v.env(amp.gain, PERC(0.002, t60, 0.5 * e.v));
  v.go();
});
def('pad', { strip: 'pad', ring: (m, d, o) => (o.rel != null ? o.rel : 1.2) + 0.06 }, (S, e, a, dest) => { // two detuned saws L/R → low-pass
  const o = O(e), f = mtof(e.m), d = e.d, at = o.att != null ? o.att : 0.6, rel = o.rel != null ? o.rel : 1.2;
  const v = new Voice(S, a, a + d + rel + 0.05);
  const A = v.osc(o.w ? S.R.w[o.w] : 'sawtooth', f, -8), B = v.osc(o.w ? S.R.w[o.w] : 'sawtooth', f, 8);
  const mg = v.n(S.ctx.createChannelMerger(2));
  A.connect(mg, 0, 0); B.connect(mg, 0, 1);
  const lp = v.filt('lowpass', o.cut || 1400, 0.5), amp = v.gain(0);
  mg.connect(lp); lp.connect(amp); amp.connect(dest);
  if (o.cut2) v.env(lp.frequency, [[0, o.cut || 1400], [Math.max(0.05, d), o.cut2, 'e']], false);
  v.env(amp.gain, ADSR(at, 0.3, 0.85, d, rel, 0.3 * e.v));
  v.go();
});
def('bass', { strip: 'bass', ring: 0.1 }, (S, e, a, dest) => { // saw + sine sub through a 4-pole low-pass
  const o = O(e), f = mtof(e.m), d = e.d, rel = 0.06;
  const v = new Voice(S, a, a + d + rel + 0.03);
  const s1 = v.osc('sawtooth', f), s2 = v.osc('sine', f), g2 = v.gain(0.35);
  const lp1 = v.filt('lowpass', 800, 1.2), lp2 = v.filt('lowpass', 800, 0.6), amp = v.gain(0);
  s2.connect(g2); s1.connect(lp1); lp1.connect(lp2); lp2.connect(amp); g2.connect(amp); amp.connect(dest);
  const c0 = (o.cut || 1000) * (0.6 + 0.6 * e.v);
  v.env(lp1.frequency, [[0, c0], [0.2, c0 * 0.35, 'e']], false);
  v.env(lp2.frequency, [[0, c0 * 1.3], [0.2, c0 * 0.45, 'e']], false);
  v.env(amp.gain, ADSR(0.005, 0.12, 0.8, d, rel, 0.55 * e.v));
  v.go();
});
def('kick', { strip: 'kick', ring: 0.5 }, (S, e, a, dest) => {
  const v = new Voice(S, a, a + 0.5);
  const x = v.osc('sine', 150), amp = v.gain(0); x.connect(amp); amp.connect(dest);
  v.env(x.frequency, [[0, 165], [0.085, 50, 'e'], [0.4, 41, 'e']], false);
  v.env(amp.gain, [[0, 0], [0.002, e.v], [0.12, 0.55 * e.v, 'e'], [0.42, 0.001 * e.v, 'e'], [0.44, 0]]);
  L.burst(v, dest, a, 0.012, 0.2 * e.v, 'highpass', 1800, 0.7, 'white', noff(e));
  v.go();
});
def('snare', { strip: 'snare', ring: (m, d, o) => (o.dec || 0.17) + 0.1 }, (S, e, a, dest) => {
  const o = O(e), dec = o.dec || 0.17, v = new Voice(S, a, a + dec + 0.1);
  const pn = v.pan(o.pan || 0); pn.connect(dest);
  const f1 = L.burst(v, pn, a, dec, 1.1 * e.v, 'highpass', 700, 0.7, 'white', noff(e));
  const t1 = v.osc('triangle', 190), tg = v.gain(0); t1.connect(tg); tg.connect(pn);
  v.env(t1.frequency, [[0, 235], [0.05, 175, 'e']], false);
  v.env(tg.gain, PERC(0.001, 0.08, 0.5 * e.v));
  v.go();
});
def('hat', { strip: 'hat', ring: (m, d, o) => (o.open ? 0.3 : 0.05) + 0.05 }, (S, e, a, dest) => {
  const o = O(e), dec = o.open ? 0.3 : 0.045, v = new Voice(S, a, a + dec + 0.05);
  const n = v.noise('white', noff(e)), hp = v.filt('highpass', 7200, 0.8), pk = v.filt('peaking', 10500, 1.2, 5), g = v.gain(0), pn = v.pan(o.pan != null ? o.pan : 0.18);
  n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(pn); pn.connect(dest);
  v.env(g.gain, PERC(0.001, dec, e.v));
  v.go();
});
def('wood', { strip: 'perc', ring: 0.14 }, (S, e, a, dest) => { // woodblock / mokugyo-like tock
  const o = O(e), f = e.m ? mtof(e.m) : 1100, v = new Voice(S, a, a + 0.14);
  const x = v.osc('sine', f), g = v.gain(0), x2 = v.osc('sine', f * 2.76), g2 = v.gain(0), pn = v.pan(o.pan || 0);
  x.connect(g); x2.connect(g2); g.connect(pn); g2.connect(pn); pn.connect(dest);
  v.env(g.gain, PERC(0.001, 0.07, 0.8 * e.v)); v.env(g2.gain, PERC(0.001, 0.025, 0.3 * e.v));
  v.go();
});
def('tom', { strip: 'perc', ring: 0.45 }, (S, e, a, dest) => {
  const o = O(e), f = e.m ? mtof(e.m) : 160, v = new Voice(S, a, a + 0.45);
  const x = v.osc('sine', f), g = v.gain(0), pn = v.pan(o.pan || 0); x.connect(g); g.connect(pn); pn.connect(dest);
  v.env(x.frequency, [[0, f * 1.5], [0.2, f * 0.85, 'e']], false);
  v.env(g.gain, PERC(0.002, 0.38, 0.9 * e.v));
  v.go();
});
def('crash', { strip: 'cym', ring: (m, d, o) => (o.dec || 1.8) + 0.1 }, (S, e, a, dest) => {
  const o = O(e), dec = o.dec || 1.8, v = new Voice(S, a, a + dec + 0.1);
  const n = v.noise('white2', noff(e)), hp = v.filt('highpass', 4200, 0.6), pk = v.filt('peaking', 7500, 0.8, 4), g = v.gain(0);
  n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(dest);
  v.env(g.gain, [[0, 0], [0.003, e.v], [0.08, 0.6 * e.v, 'e'], [dec, 0.001 * e.v, 'e'], [dec + 0.02, 0]]);
  v.go();
});
def('revcym', { strip: 'cym', ring: 0.05 }, (S, e, a, dest) => { // reversed cymbal swell that ends exactly at t + d
  const d = Math.max(0.2, e.d), v = new Voice(S, a, a + d + 0.05);
  const n = v.noise('white2', noff(e)), hp = v.filt('highpass', 3000, 0.7), g = v.gain(0);
  n.connect(hp); hp.connect(g); g.connect(dest);
  v.env(hp.frequency, [[0, 9000], [d, 2500, 'e']], false);
  v.env(g.gain, [[0, 0], [0.05, 0.003 * e.v], [d, e.v, 'e'], [d + 0.018, 0]]);
  v.go();
});
def('riser', { strip: 'fx', ring: 0.06 }, (S, e, a, dest) => { // noise swell through a rising band-pass (+ optional tonal sweep)
  const o = O(e), d = Math.max(0.3, e.d), v = new Voice(S, a, a + d + 0.06);
  const n = v.noise('white2', noff(e)), bp = v.filt('bandpass', 300, o.q || 3), g = v.gain(0);
  n.connect(bp); bp.connect(g); g.connect(dest);
  v.env(bp.frequency, [[0, o.from || 250], [d, o.to || 6000, 'e']], false);
  v.env(g.gain, [[0, 0], [0.1, 0.02 * e.v], [d, e.v, 'e'], [d + 0.04, 0]]);
  if (o.tone) {
    const x = v.osc('sawtooth', mtof(e.m || 50)), lp = v.filt('lowpass', 900, 2), tg = v.gain(0);
    x.connect(lp); lp.connect(tg); tg.connect(dest);
    v.env(x.detune, [[0, 0], [d, 1200 * (o.tone || 1), 'e']], false);
    v.env(lp.frequency, [[0, 400], [d, 4000, 'e']], false);
    v.env(tg.gain, [[0, 0], [0.1, 0.01 * e.v], [d, 0.3 * e.v, 'e'], [d + 0.04, 0]]);
  }
  v.go();
});
def('sub', { strip: 'drone', ring: (m, d, o) => (o.rel || 2) + 0.06 }, (S, e, a, dest) => { // sine pair with slow beating
  const o = O(e), f = mtof(e.m), d = e.d, at = o.att || 2, rel = o.rel || 2;
  const v = new Voice(S, a, a + d + rel + 0.05);
  const A = v.osc('sine', f), B = v.osc('sine', f * 1.004), C = v.osc(S.R.w.soft, f * 2), gc = v.gain(0.18), amp = v.gain(0);
  C.connect(gc); A.connect(amp); B.connect(amp); gc.connect(amp); amp.connect(dest);
  v.env(amp.gain, ADSR(at, 0.5, 0.9, d, rel, 0.35 * e.v));
  v.go();
});
// A single pure sustained tone (the standoff's dolly zoom): a sine + a faint octave, and a second sine whose offset glides
// linearly from o.beat0 to o.beat1 Hz over the note, so the slow beating quickens while the pitch stands still ("the
// space stretches, he doesn't move"). o.att / o.rel (s), o.mix (level of the beating partner, 0..1), o.oct (octave level).
def('tone', { strip: 'tone', ring: (m, d, o) => (o.rel != null ? o.rel : 0.3) + 0.05 }, (S, e, a, dest) => {
  const o = O(e), f = mtof(e.m), d = e.d, at = o.att != null ? o.att : 1, rel = o.rel != null ? o.rel : 0.3, vel = clamp(e.v, 0, 1.5);
  const v = new Voice(S, a, a + d + rel + 0.05), amp = v.gain(0), pn = v.pan(o.pan || 0);
  amp.connect(pn); pn.connect(dest);
  const b0 = o.beat0 != null ? o.beat0 : 0.2, b1 = o.beat1 != null ? o.beat1 : 3, mix = o.mix != null ? o.mix : 0.7;
  const x = v.osc('sine', f), gx = v.gain(0.5), y = v.osc('sine', f + b0), gy = v.gain(0.5 * mix), h = v.osc('sine', 2 * f), gh = v.gain(0.5 * (o.oct != null ? o.oct : 0.06));
  x.connect(gx); gx.connect(amp); y.connect(gy); gy.connect(amp); h.connect(gh); gh.connect(amp);
  v.env(y.frequency, [[0, f + b0], [Math.max(0.05, d), f + b1]], false);
  v.env(amp.gain, ADSR(at, 0.2, 1, d, rel, 0.3 * vel));
  v.go();
});
def('boom', { strip: 'fx', ring: (m, d, o) => (o.dec || 1.6) + 0.1 }, (S, e, a, dest) => { // soft cinematic low boom
  const o = O(e), dec = o.dec || 1.6, v = new Voice(S, a, a + dec + 0.1);
  const x = v.osc('sine', 62), g = v.gain(0); x.connect(g); g.connect(dest);
  v.env(x.frequency, [[0, 70], [dec, 34, 'e']], false);
  v.env(g.gain, [[0, 0], [0.01, e.v], [dec, 0.001 * e.v, 'e'], [dec + 0.02, 0]]);
  L.burst(v, dest, a, dec * 0.6, 0.5 * e.v, 'lowpass', 300, 0.7, 'brown', noff(e), 0.01);
  v.go();
});

// ------------------------------------------------------------------------------------ buffer pre-warming
// Offline renders and realtime play() call AU.prepEvents(R, ev, t0, t1): pre-render the bells needed in [t0, t1]
// (a bonshō buffer takes ~50 ms to synthesize, too long to do inside the realtime scheduler tick).
AU.prepEvents = (R, ev, t0, t1) => {
  for (const e of ev) {
    if (e.t > t1) break;
    if (e.k === 'n' && e.i === 'bonsho' && e.t + (e.len || 0) >= t0) bonshoBuf(R, e.m, (e.o && e.o.t60) || 28);
  }
};
AU.bellJobs = (R, ev) => { // incremental jobs for the idle warm-up (beds.js)
  const seen = {}, jobs = [];
  for (const e of ev) if (e.k === 'n' && e.i === 'bonsho') {
    const t60 = (e.o && e.o.t60) || 28, k = bonshoKey(e.m, t60);
    if (seen[k] || R.B.misc[k]) continue; seen[k] = 1;
    jobs.push({ key: k, gen: bonshoGen(R.sr, e.m, t60) });
  }
  return jobs;
};
})();
