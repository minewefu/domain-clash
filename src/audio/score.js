/* =====================================================================================================
   DOMAIN CLASH — score: composer toolkit, themes, music cues                (src/audio/score.js, classic script)
   Music exists only inside cues:  HT.music.cue({ id, from: sceneId, to: sceneId, level: dB, fn: C => { … } })
   A cue covers the scenes from `from` to `to` (inclusive, HT.timeline order); C.start = start(from),
   C.dur = end(to) − start(from). Scenes covered by no cue are musically SILENT — there is no generic fallback; silence
   is used as a weapon. 120 BPM, 4/4: 1 beat = 0.5 s, 1 bar = 2 s. Every scene starts on a bar line.
   Cues whose scenes are missing from the timeline are skipped (listed in HT.AU.MUSIC.skipped), so per-act score files
   (score_act1.js …) can register cues before their scenes exist.

   Composer object C (all positions in beats from the cue start; velocities 0..1.5):
     C.n(inst, b, midi, lenBeats, vel, opts)    one note (opts.thru = ignore holes)
     C.ch(inst, b, [midi…], len, vel, opts)     chord           C.mel(inst, b, notes, vel, opts, transpose)   melody
     C.pat(inst, b, '16th-grid string', vel, opts, midi)        X accent · x hit · o ghost · . rest
     C.arp(inst, b, len, tones, order, step, vel, opts, velFn)  C.kit(b, str, map, vel)  (char → [inst, midi, vel, opts])
     C.g(param, b, value, tau) / C.lin(param, b0, v0, b1, v1)   global bus automation: 'duck' 'gate' 'lvl' 'mus' 'sfx' 'amb'
     C.level(b, dB, tau) · C.levelRamp(b0, b1, dB0, dB1) · C.fadeOut(b0, b1)   this cue's level (relative to `level`)
     C.hole(b0, b1)  drop notes starting in [b0, b1)   ·   C.silence(b0, b1)  hole + music gate closed (tails cut too)
     C.hum(a) ±a random (seeded by the cue id)  ·  C.rng()
   Sync points (any scene the cue covers; times are sync points, SFX pre-roll excluded):
     C.sceneT(id) / C.sceneBeat(id)             scene start (s / beats from the cue start; NaN if not covered)
     C.cueT(sceneId, name|[names], defaultSceneSec)  → s from the cue start (first matching cue in time, else default)
     C.cueBeat(sceneId, name|[names], defaultSceneSec, q)  → beats (q > 0 quantizes to multiples of q)
     C.cuesOf(sceneId, name|[names], b0, b1)    → [{b, t, sfx, vol}] matching cues with b in [b0, b1)
     C.clash(b, len, midi, insts)               true if a note would form a m2/M7/m9 with notes already written
   Themes (HT.AU.THEMES) are motif data ([beat, midi, beats] lists) + modes; HT.AU.V develops them (transpose, modal
   remap, augment, invert, retrograde, fragment, displace) so later acts vary them rather than loop them.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { BEAT, BAR, clamp, dbg, nm, mulberry32, hashStr, ringOf, resOf, warnOnce } = AU;

// ------------------------------------------------------------------------------------ note sequences
const SEQ_ERR = (AU.SEQ_ERR = []);
// 'D5:1 E5:.5 F#5+A5:2 r:1 |' -> [[beat, midi, lenBeats], ...]; '|' checks that each bar has 4 beats.
function seq(str) {
  const out = []; let b = 0, bs = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') { if (Math.abs(b - bs - 4) > 1e-6) SEQ_ERR.push('bar @' + bs + ' = ' + (b - bs) + ' beats in "' + str.slice(0, 40) + '…"'); bs = b; continue; }
    const [nn, ll] = tok.split(':'), len = ll ? parseFloat(ll) : 1;
    if (nn !== 'r') nn.split('+').forEach(x => out.push([b, nm(x), len]));
    b += len;
  }
  return out;
}

// ------------------------------------------------------------------------------------ modes & development
const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  octatonic: [0, 1, 3, 4, 6, 7, 9, 10], wholetone: [0, 2, 4, 6, 8, 10],
};
const pcOf = m => ((m % 12) + 12) % 12;
const V = {
  tr: (ns, s) => ns.map(([b, m, l]) => [b, m + s, l]),                          // transpose (semitones)
  oct: (ns, o) => ns.map(([b, m, l]) => [b, m + 12 * o, l]),
  aug: (ns, k) => ns.map(([b, m, l]) => [b * k, m, l * k]),                     // augmentation (k > 1) / diminution
  disp: (ns, db) => ns.map(([b, m, l]) => [b + db, m, l]),                      // rhythmic displacement
  frag: (ns, b0, b1) => ns.filter(n => n[0] >= b0 - 1e-9 && n[0] < b1 - 1e-9).map(([b, m, l]) => [b - b0, m, Math.min(l, b1 - b)]),
  retro: (ns, len) => ns.map(([b, m, l]) => [len - b - l, m, l]).sort((x, y) => x[0] - y[0]),
  inv: (ns, axis) => ns.map(([b, m, l]) => [b, 2 * axis - m, l]),               // chromatic inversion around a pitch
  // modal remap: every note keeps its scale degree (relative to tonic) and takes that degree's pitch in another mode,
  // e.g. Gojo's Lydian theme → Ionian for the elegy (G♯ → G) or → Phrygian when Sukuna gets the upper hand
  remap: (ns, from, to, tonic) => ns.map(([b, m, l]) => {
    const A = MODES[from], B = MODES[to], rel = m - tonic, oc = Math.floor(rel / 12), pc = rel - 12 * oc, i = A.indexOf(pc);
    if (i < 0 || !B || B.length !== A.length) return [b, m, l];
    return [b, tonic + 12 * oc + B[i], l];
  }),
  // diatonic inversion inside a mode around an axis note
  dinv: (ns, mode, tonic, axis) => {
    const M = MODES[mode], deg = m => { const rel = m - tonic, oc = Math.floor(rel / 12), i = M.indexOf(rel - 12 * oc); return i < 0 ? null : oc * M.length + i; };
    const pitch = d => { const oc = Math.floor(d / M.length); return tonic + 12 * oc + M[d - oc * M.length]; };
    const ax = deg(axis);
    return ns.map(([b, m, l]) => { const d = deg(m); return d == null || ax == null ? [b, m, l] : [b, pitch(2 * ax - d), l]; });
  },
  vel: (ns, fn) => ns.map((n, i) => n.concat([fn(n, i)])),
  join: (...parts) => [].concat(...parts.map(([ns, at]) => V.disp(ns, at))),
};

// ------------------------------------------------------------------------------------ themes
// D is the tonal centre of the whole film. Gojo = D Lydian (D E F♯ G♯ A B C♯), Sukuna = D Phrygian (D E♭ F G A B♭ C):
// the two modes share only D and A — the bare fifth is the only ground both stand on ("The Strongest").
const THEMES = (AU.THEMES = {
  gojo: {
    mode: 'lydian', tonic: nm('D4'),
    // head: 1–5 leap, the Lydian turn (♯4→5), up to 6; answer climbs to the tonic. Bright, confident, unhurried.
    a: seq('D5:1 A5:1 G#5:.5 A5:.5 B5:1 | C#6:1.5 B5:.5 A5:2 |'),
    b: seq('F#5:1 G#5:.5 A5:.5 B5:1 E6:1 | D6:3 r:1 |'),
    // one voicing per theme bar (glass/koto/strings), D pedal: Dmaj9 | E/D (Lydian II over I) | F♯m7/D | Dmaj7♯11
    harm: [[50, 57, 64, 66, 69, 73], [50, 56, 59, 64, 68, 71], [50, 57, 61, 64, 66, 69], [50, 57, 61, 66, 68, 69]],
  },
  sukuna: {
    mode: 'phrygian', tonic: nm('D3'),
    // 1–♭3–♭2–1 (the ♭2 is his signature), a drop to the low 5th with the ♭6 sigh, back to 1, down to ♭7; the answer
    // pushes ♭2–♭3–♭2 and sinks home. Against Gojo's theme (same 4 bars) every onset is consonant (enharmonic pairs
    // G♯/E♭ ≈ P4, C♯/B♭ ≈ m3, B/E♭ ≈ m6) or a mild 9th — see THEMES.strongest.
    a: seq('D3:1 F3:1 Eb3:.5 D3:1.5 | A2:1 Bb2:.5 A2:.5 D3:1 C3:1 |'),
    b: seq('D3:1 Eb3:.5 F3:.5 Eb3:1 C3:1 | D3:3 r:1 |'),
    // low-string clusters (the ♭2 rub): Dm(♭9) | B♭/D | E♭/D (Phrygian ♭II over I) | D5 + E♭
    harm: [[38, 45, 50, 51], [38, 46, 50, 53], [38, 46, 51, 55], [38, 45, 50, 51, 57]],
  },
  strongest: { // Gojo's 4 bars over Sukuna's 4 bars, simultaneously, over the shared D–A fifth
    upper: () => THEMES.gojo.a.concat(V.disp(THEMES.gojo.b, 8)),
    lower: () => THEMES.sukuna.a.concat(V.disp(THEMES.sukuna.b, 8)),
    frame: [nm('D2'), nm('A2'), nm('D3')],
  },
  mahoraga: {
    // The Eight-Handled Wheel: a mechanical 3+3+2 ostinato (16th steps 0, 6, 12) on a diminished triad (D F G♯) from the
    // D octatonic scale. One wheel notch = rotate by a minor third (D → F → G♯ → B → D): the four notches of the
    // adaptation to Infinity close the diminished cycle — the wheel comes full circle when adaptation completes.
    mode: 'octatonic', tonic: nm('D2'), steps: [0, 6, 12], triad: [0, 3, 6],
    wheel: notch => [0, 3, 6].map(x => nm('D3') + 3 * notch + x),
    line: seq('D3:.5 Eb3:.5 F3:.5 F#3:.5 G#3:.5 A3:.5 B3:.5 C4:.5 |'), // one spoke per 8th: the wheel turning
  },
  elegy: { // Gojo's theme remembered: Lydian → Ionian (the ♯4 relaxes to 4), augmented ×2, soft FM keys
    mode: 'ionian', tonic: nm('D4'),
    get a() { return V.aug(V.remap(THEMES.gojo.a, 'lydian', 'ionian', nm('D4')), 2); },
    get b() { return V.aug(V.remap(THEMES.gojo.b, 'lydian', 'ionian', nm('D4')), 2); },
    harm: [[50, 57, 62, 66], [47, 54, 62, 66], [43, 55, 59, 62], [45, 57, 61, 64], [50, 57, 62, 66, 69]], // D | Bm | G | A | D
  },
});

// ------------------------------------------------------------------------------------ the film's dynamic arc
// Per-cue base levels (dB, relative to the M0 fight test = 0) so every act file expresses the same arc: the loudest
// moment is the Act V Purple, the quietest the airport; silence (no cue) before the Purple and before the Cut.
// Use: HT.music.cue({ id, from, to, level: HT.AU.LEVELS.purple, fn }). Big SFX duck the music on top of this.
AU.LEVELS = {
  opening: -8, cityDawn: -10, rooftop: -6, walk: -5, standoff: -4, exchange: 0,   // Act I
  domains: -2, clash: 0, void: -3,                                                  // Acts II–III
  adaptation: 0, agito: 1, collapse: 1,                                             // Act IV
  sky: -6, incantation: -3, purple: 3, aftermath: -6, celebration: -9,              // Act V (Purple = the loudest)
  cut: -12, airport: -16, credits: -10,                                             // Act VI (airport = the quietest)
};

// ------------------------------------------------------------------------------------ composer
const HARSH = new Set([1, 11, 13, 23, 25]); // m2, M7, m9 (and compounds)
function Comp(cue, tl, i0, i1, out) {
  this.cue = cue; this.id = cue.id; this.tl = tl; this.out = out;
  this.scenes = tl.slice(i0, i1 + 1);
  this.start = this.t0 = tl[i0].start;
  this.end = tl[i1].start + tl[i1].dur; this.dur = this.end - this.start;
  this.bars = Math.max(1, Math.floor(this.dur / BAR + 0.25)); this.beats = this.bars * 4; this.endBeat = this.dur / BEAT;
  this.base = cue.level || 0;
  this.rng = mulberry32(hashStr('cue:' + cue.id)); this.holes = [];
  this.notes = []; // this cue's notes (for C.clash)
}
Comp.prototype = {
  n(i, b, m, len, v, o) {
    if (!(b < this.endBeat - 1e-6) || !(b > -1e-6) || !(v > 0)) return null;
    if (!(o && o.thru)) for (const h of this.holes) if (b >= h[0] - 1e-6 && b < h[1] - 1e-6) return null;
    if (!AU.INST[i]) { warnOnce('music cue "' + this.id + '": unknown instrument ' + i); return null; }
    const d = Math.max(0.02, len * BEAT), oo = o || {};
    const e = { t: this.t0 + b * BEAT, k: 'n', i, m, d, len: d + ringOf(i, m, d, oo), v: clamp(v, 0, 1.5), o: oo, cue: this.id, res: resOf(i, oo) };
    this.out.push(e); this.notes.push(e);
    return e;
  },
  ch(i, b, ms, len, v, o) { ms.forEach(m => this.n(i, b, m, len, v, o)); },
  mel(i, b, notes, v, o, tr) { notes.forEach(x => this.n(i, b + x[0], x[1] + (tr || 0), x[2], v * (x[3] != null ? x[3] : 1), o)); },
  pat(i, b, str, v, o, m) {
    for (let k = 0; k < str.length; k++) {
      const c = str[k]; if (c === '.' || c === ' ') continue;
      this.n(i, b + k * 0.25, m || 0, 0.25, c === 'X' ? v * 1.3 : c === 'o' ? v * 0.45 : v, o);
    }
  },
  kit(b, str, map, v) { // char → [inst, midi, velMul, opts]
    for (let k = 0; k < str.length; k++) { const s = map[str[k]]; if (s) this.n(s[0], b + k * 0.25, s[1] || 0, 0.25, v * (s[2] == null ? 1 : s[2]), s[3]); }
  },
  arp(i, b, len, tones, order, step, v, o, vf) {
    let k = 0;
    for (let x = 0; x < len - 1e-6; x += step, k++) {
      const idx = order[k % order.length], m = tones[idx % tones.length] + 12 * Math.floor(idx / tones.length);
      this.n(i, b + x, m, step * 0.9, v * (vf ? vf(x / len, k) : 1), o);
    }
  },
  g(p, b, v, tau) { this.out.push({ t: this.t0 + b * BEAT, k: 'g', p, v, tau }); },
  lin(p, b0, v0, b1, v1) { this.out.push({ t: this.t0 + b0 * BEAT, k: 'g', p, v0, v: v1, lin: this.t0 + b1 * BEAT }); },
  level(b, dB, tau) { this.out.push({ t: this.t0 + b * BEAT, k: 'g', p: 'cue', cue: this.id, v: dbg(this.base + dB), tau: tau || 0.05 }); },
  levelRamp(b0, b1, dB0, dB1) { this.out.push({ t: this.t0 + b0 * BEAT, k: 'g', p: 'cue', cue: this.id, v0: dbg(this.base + dB0), v: dbg(this.base + dB1), lin: this.t0 + b1 * BEAT }); },
  fadeOut(b0, b1, dB0) { this.out.push({ t: this.t0 + b0 * BEAT, k: 'g', p: 'cue', cue: this.id, v0: dbg(this.base + (dB0 || 0)), v: 0, lin: this.t0 + b1 * BEAT }); },
  hole(b0, b1) { this.holes.push([b0, b1]); },
  silence(b0, b1) { this.hole(b0, b1); this.g('gate', b0, 0, 0.004); this.g('gate', Math.max(b0, b1 - 0.03), 1, 0.004); },
  hum(a) { return (this.rng() * 2 - 1) * a; },
  sec(b) { return b * BEAT; }, beat(t) { return t / BEAT; },
  // ---- sync points
  scene(id) { return this.scenes.find(s => s.id === id) || null; },
  sceneT(id) { const s = this.scene(id); return s ? s.start - this.start : NaN; },
  sceneBeat(id) { return this.sceneT(id) / BEAT; },
  cueT(sceneId, names, def) {
    const s = this.scene(sceneId);
    if (!s) { warnOnce('music cue "' + this.id + '": scene "' + sceneId + '" is not covered'); return NaN; }
    const want = [].concat(names);
    let best = null;
    for (const c of s.cues) if (c && typeof c.t === 'number' && c.sfx && want.includes(c.sfx) && (best === null || c.t < best)) best = c.t;
    return s.start - this.start + (best === null ? def : best);
  },
  cueBeat(sceneId, names, def, q) { const b = this.cueT(sceneId, names, def) / BEAT; return q ? Math.round(b / q) * q : b; },
  cuesOf(sceneId, names, b0, b1) {
    const s = this.scene(sceneId); if (!s) return [];
    const want = [].concat(names), off = s.start - this.start, lo = b0 == null ? -Infinity : b0, hi = b1 == null ? Infinity : b1;
    return s.cues.filter(c => c && typeof c.t === 'number' && c.sfx && want.includes(c.sfx))
      .map(c => ({ b: (off + c.t) / BEAT, t: off + c.t, sfx: c.sfx, vol: c.vol == null ? 1 : c.vol }))
      .filter(c => c.b >= lo && c.b < hi).sort((a, b) => a.b - b.b);
  },
  clash(b, len, m, insts) {
    const t0 = this.t0 + b * BEAT, t1 = t0 + len * BEAT;
    for (const e of this.notes) {
      if (insts && !insts.includes(e.i)) continue;
      if (e.t < t1 - 1e-6 && e.t + e.d > t0 + 1e-6 && HARSH.has(Math.abs(e.m - m))) return true;
    }
    return false;
  },
};

// ------------------------------------------------------------------------------------ arrangement helpers (AU.ARR)
const ARR = (AU.ARR = {
  // taiko kuchi-shōga-ish grid: D = odaiko "don", d = "do" (lighter), k = "ka" (rim), S/s = shime, x = shime rim
  TAIKO: { D: ['taiko', 0, 1, { kind: 'don' }], d: ['taiko', 0, 0.55, { kind: 'do' }], k: ['taiko', 0, 0.55, { kind: 'ka' }],
    S: ['shime', 0, 0.9, {}], s: ['shime', 0, 0.5, {}], x: ['shime', 0, 0.45, { kind: 'ka' }] },
  taiko(C, b, str, v) { C.kit(b, str, ARR.TAIKO, v); },
  // one hit accent (music "catching" a hit cue): kind 'hit' (taiko + string sfz) | 'inf' (glass) | 'huge'
  accent(C, b, kind, v) {
    if (kind === 'inf') { // two high glass pings on the shared frame (D/A/E/F#), avoiding any semitone rub with the lines
      const ok = ['A6', 'D7', 'E7', 'F#6', 'D6', 'A5'].map(nm).filter(m => !C.clash(b, 1, m, ['glass', 'strings', 'dbass', 'koto']));
      const [m1, m2] = ok.length >= 2 ? ok : [nm('A6'), nm('D7')];
      C.n('glass', b, m1, 0.5, 0.26 * v, { arp: 1, t60: 1.3, pan: -0.2 }); C.n('glass', b + 0.12, m2, 0.5, 0.2 * v, { arp: 1, t60: 1.1, pan: 0.2 }); return;
    }
    C.n('taiko', b, 0, 1, (kind === 'huge' ? 1.3 : 1.0) * v, { kind: 'don' });
    C.ch('strings', b, kind === 'huge' ? [nm('D2'), nm('Eb2'), nm('A2'), nm('D3')] : [nm('D3'), nm('Eb3'), nm('A3')], 0.5, 0.85 * v, { sfz: 1, rel: kind === 'huge' ? 1.4 : 0.5 });
    if (kind === 'huge') { C.n('subdrop', b, nm('D1'), 1, 1.0 * v, { dec: 3 }); C.n('tamtam', b, 0, 1, 0.9 * v, { dec: 5 }); }
  },
});

// ------------------------------------------------------------------------------------ cue registry
const MUSIC = (AU.MUSIC = { list: [], byId: {}, version: 0, skipped: [], composed: [] });
HT.music = {
  cue(def) {
    if (!def || typeof def.id !== 'string' || !def.from || !def.to || typeof def.fn !== 'function') { warnOnce('HT.music.cue: need {id, from, to, fn}'); return null; }
    const c = { id: def.id, from: String(def.from), to: String(def.to), level: +def.level || 0, fn: def.fn };
    if (MUSIC.byId[c.id]) MUSIC.list = MUSIC.list.filter(x => x.id !== c.id); // re-registering replaces
    MUSIC.list.push(c); MUSIC.byId[c.id] = c; MUSIC.version++;
    return c;
  },
  remove(id) { if (!MUSIC.byId[id]) return; MUSIC.list = MUSIC.list.filter(x => x.id !== id); delete MUSIC.byId[id]; MUSIC.version++; },
  get cues() { return MUSIC.list.map(c => ({ id: c.id, from: c.from, to: c.to, level: c.level })); },
};
// Called by engine.buildEvents: every registered cue whose scenes are in the timeline composes its notes/automation.
AU.composeScore = (tl, out, o) => {
  o = o || {};
  MUSIC.skipped = []; MUSIC.composed = [];
  const idx = {}; tl.forEach((s, i) => { idx[s.id] = i; });
  for (const cue of MUSIC.list) {
    if (o.cues && !o.cues.includes(cue.id)) continue;
    const i0 = idx[cue.from], i1 = idx[cue.to];
    if (i0 == null || i1 == null) { MUSIC.skipped.push(cue.id + ' (scene ' + (i0 == null ? cue.from : cue.to) + ' not in the timeline)'); continue; }
    if (i1 < i0) { warnOnce('music cue "' + cue.id + '": "' + cue.to + '" comes before "' + cue.from + '"'); continue; }
    const C = new Comp(cue, tl, i0, i1, out);
    out.push({ t: Math.max(0, C.start - 0.02), k: 'g', p: 'cue', cue: cue.id, v: dbg(C.base), tau: 0.005 });
    const n0 = out.length;
    try { cue.fn(C); } catch (err) { warnOnce('music cue "' + cue.id + '" failed: ' + (err && err.stack || err)); }
    MUSIC.composed.push({ id: cue.id, start: C.start, dur: C.dur, events: out.length - n0 });
  }
};
Object.assign(AU, { seq, MODES, V, Comp, pcOf, HARSH });
})();
