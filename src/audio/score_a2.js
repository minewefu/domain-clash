/* =====================================================================================================
   DOMAIN CLASH — Act II "Domain War" score (3:30–8:00)                    (src/audio/score_a2.js, classic script)
   The domain war is a tug of war between the two themes, often literally at the same time:
     THE VOID (Gojo): D Lydian — glass, koto, pure tones; "space": stillness and a high shimmer (the D Lydian stack of
       fifths D A E B F♯ C♯ G♯ spread high).
     THE SHRINE (Sukuna): D Phrygian — taiko, detuned bass, low dissonant strings, and ritual/temple colours: shamisen
       sawari (the constant cutting), temple bells, wooden clappers (ki).
   Cues (film seconds with Act I before it; act seconds = film − 210). Every sync point is read from the scenes (sound
   cues, shots, posts, script events), so the music follows the director's re-timings.
     a2.signs     210–226  silence first; the two seals (handSign ×2), then ONE temple bell; when the seals complete the
                           clappers quicken into the expansion (ki no kizami — the kabuki curtain opening)
     a2.void      226–276  (layer) the Void: Gojo's head on glass in the territory war, the dome's shimmer outside, the
                           stillness inside (a2_shred 8–14 s), the strained shell
     a2.shrine    226–276  (layer) the Shrine: Sukuna's head on shamisen + low strings in the war, the ritual groove, the
                           cutting ostinato, the crack → shatter build, the hit; both layers stop dead on the neck cut
                           (272.2) and the whole mix falls silent with the black (274.6–276)
                           In a2_expand's split page each layer's level follows its share of the frame and its notes are
                           detuned in proportion — the two domains fight in tuning as well as in space and settle in
                           tune at 50/50.
     a2.watchers  276–290  the monitoring room: one low sustained note under the hum, leaning in as Yuji jumps up
     a2.grind     290–332  RCT → Simple Domain: tense and grinding — a low cluster, the cutting ostinato, a detuned bass;
                           Gojo's head darkened into D Phrygian while he is cut; the chase, the leg wrap; each Simple
                           Domain is a pure halo chord that erodes (detunes, the ♭2 invades) as Sukuna steps into it
     a2.red       332–352  the lunge, the Red charge, a big hit (3.55) and the shrine-wall hit, then a breath; Gojo's
                           shrug gets three light koto notes; unease returns
     a2.clash2    352–380  maximum range (the Shrine's procession: odaiko, temple bells, his theme in octaves); Gojo's
                           darker dome (his theme an octave down on strings); the amplified fight; the grip; THE VOW:
                           a deep bonshō + the scripted sub drop + a vow drone; the shell collapses
     a2.ball      380–428  Falling Blossom: crystalline answers to every cut + falling petals (music box, glass, koto
                           harmonics); the dome swells huge, strains at the cracks, shrinks in four steps to the ball;
                           the ball's pressure; the clock (a pulse locked to the ticks); the double collapse; the
                           expressway action (his theme in the bass, Gojo's in quick glass bursts)
     a2.wheel     428–440  darkness; the wheel's clunk and ONE bar of Mahoraga's ostinato at home (D F G♯; first time); then
                           Gojo's theme, fragile, on a solo koto around the nosebleed, the wipe and the smile
     a2.clash5    440–480  clash 4 (the war again, fast and loud; a2.clash4 is the Shrine's layer of its split page),
                           the punches, the Blue slam/pull, both domains break, the hook, the pier; the seals; the
                           tiniest silence (full mix, 18.0–18.2 s); Gojo's seal one frame first (ping) and Sukuna's
                           choked; the Void floods in with the picture (19.6): stillness, the tinnitus; one straight
                           strike (24.87); the Shrine peels away; the act ends on a held, unresolved suspension
   Dynamic plan: AU.LEVELS domains −2, clash 0, void −3 (Act II a notch above Act I's action half, below the Purple).
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, ARR, LEVELS: LV, BEAT } = AU;
const G = TH.gojo, SK = TH.sukuna, MA = TH.mahoraga;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;
const FRAME = 1 / 30;
const FULL_MIX_SILENCE = true;
// Density trims (dB on top of AU.LEVELS), measured with tools/audio-lab.js actChecks (music-only integrated LUFS per
// scene vs the SFX stem): the busy SFX of Act II sit 1.5–3 LU over the music at the plan's levels, so the active cues
// are lifted to carry the act a notch above Act I's action half. Quiet cues (signs, watchers, wheel) keep the plan.
const TRIM = { war: 5, grind: 5.5, red: 4, clash2: 3, ball: 5, clash5: 2.5 };

// ------------------------------------------------------------------ the director's scene data (as score_a1.js)
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const shotEv = (id, name, i) => shotsOf(id).filter(e => e.shot === name)[i || 0] || null;
const shotT = (id, name, def, i) => { const e = shotEv(id, name, i); return e ? e.t : def; };
const shotAfter = (id, name, tMin, def) => { const e = shotsOf(id).filter(x => x.shot === name && x.t > tMin).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const q16 = b => Math.ceil(b * 4 - 1e-6) / 4;                                        // next 16th-grid position
const postEv = (id, name, i) => { const s = SCN(id); return ((s && s.C && s.C.post) || []).filter(e => e.post === name)[i || 0] || null; };
const evT = (id, pred, def) => {
  const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t);
  return L.length ? L[0].t : def;
};
const lastCue = (C, id, name, def) => { const L = C.cuesOf(id, name); return L.length ? L[L.length - 1].t : C.sceneT(id) + def; };

// ------------------------------------------------------------------ the territory war (diag split pages)
// manga.js draws a diag page's gutter at x = split × width: the right panel is Sukuna's (the Shrine), the left Gojo's
// (the Void), so Gojo's share of the frame is `split`. Each layer's level follows its share (WAR_DB per unit away from
// 0.5) and the losing side's notes sag flat (WAR_ST semitones per unit below 0.5); at 50/50 both play in tune.
const WAR_DB = 20, WAR_ST = 3;
const pwl = (K, t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(1e-6, b[0] - a[0]); } return K[K.length - 1][1]; };
function splitKeys(id, def) { const e = shotEv(id, 'panels'); return e && Array.isArray(e.split) ? { t0: e.t, K: e.split } : { t0: 0, K: def }; }
const share = (war, side, t) => { const g = pwl(war.K, t - war.t0); return side === 'void' ? g : 1 - g; };
const detOf = (war, side, t) => -WAR_ST * Math.max(0, 0.5 - share(war, side, t));   // semitones (≤ 0)
function warLevels(C, war, side, sceneT) { // this layer's cue level follows its share across the split keys
  const K = war.K, T = t => sceneT + war.t0 + t, dB = g => WAR_DB * ((side === 'void' ? g : 1 - g) - 0.5);
  C.level(bt(T(K[0][0])), dB(K[0][1]), 0.03);
  for (let i = 1; i < K.length; i++) C.levelRamp(bt(T(K[i - 1][0])), bt(T(K[i][0])), dB(K[i - 1][1]), dB(K[i][1]));
}

// ------------------------------------------------------------------ shared figures
// the Shrine's ritual grid (kuchi-shōga, ARR.TAIKO: D don · d do · k ka · S/s shime · x shime rim): a heavy procession
const RITE = ['D.......d...k...', 'D.....d.D...k.k.', 'D...d...D.d.k...', 'D.d...d.D.d.kdkd'];
const RITE_S = ['s...s...s...s...', 's.s.s.s.s.s.s.s.', 's.s.S.s.s.s.S.s.', 'ssSsssSsssSsSsSs'];
function rite(C, b0, b1, v, k0, dense) {
  for (let b = b0, k = k0 || 0; b < b1 - 1e-6; b += 4, k++) {
    const g = RITE[dense ? 3 : k % 4], s = RITE_S[dense ? 3 : k % 4];
    for (let i = 0; i < 16; i++) {
      const bb = b + i * 0.25; if (bb >= b1 - 1e-6) break;
      const c = ARR.TAIKO[g[i]]; if (c) C.n(c[0], bb, 0, 0.25, v * c[2], c[3]);
      const d = ARR.TAIKO[s[i]]; if (d) C.n(d[0], bb, 0, 0.25, v * 0.75 * d[2], d[3]);
    }
  }
}
// the constant cutting: a shamisen ostinato in 16ths on the ♭2 rub and the Phrygian fall (sawari buzz on every note)
const CUT = [NN('D4 D4 Eb4 D4 A3 D4 Eb4 D4 D4 Eb4 F4 Eb4 D4 A3 Bb3 A3'), NN('D4 Eb4 D4 A3 D4 Eb4 F4 Eb4 D4 D4 Eb4 D4 C4 Bb3 A3 Bb3')];
function cutting(C, b0, b1, v0, v1, det, pan) {
  for (let b = b0, i = 0; b < b1 - 1e-6; b += 0.25, i++) {
    const u = (b - b0) / Math.max(0.25, b1 - b0), m = CUT[Math.floor(i / 16) % 2][i % 16];
    C.n('shamisen', b, m + (det || 0), 0.25, (v0 + (v1 - v0) * u) * (i % 4 === 0 ? 1.15 : i % 2 ? 0.66 : 0.84), { pan: pan == null ? 0.3 : pan });
  }
}
// ki no kizami: the wooden clappers struck slowly, then faster and faster (kabuki: the curtain opens as the ki quicken)
function kizami(C, t0, t1, v) {
  let t = t0, gap = Math.min(0.6, (t1 - t0) * 0.2), k = 0;
  for (; t < t1 - 0.02; t += gap, gap = Math.max(0.055, gap * 0.82), k++) C.n('hyoshigi', bt(t), 0, 0.25, v * (0.7 + 0.3 * (t - t0) / Math.max(0.1, t1 - t0)), { pan: 0.25 });
}
// heartbeat: lub (don) + dub (do) 0.375 s later, one pair every `per` beats
function heart(C, b0, b1, per, v0, v1) {
  for (let b = b0; b < b1 - 1e-6; b += per) {
    const v = v0 + (v1 - v0) * (b - b0) / Math.max(1e-6, b1 - b0);
    C.n('taiko', b, 0, 0.5, v, { kind: 'don', dec: 1.1 });
    C.n('taiko', b + 0.75, 0, 0.5, v * 0.62, { kind: 'do' });
  }
}
// a stab on a hit: odaiko + a low string sforzando — 'phr' Sukuna's rub (D A E♭) · 'lyd' Gojo's fifths (D A E) · 'both'
// the two collide (D E♭ A G♯) — plus glass pings for 'lyd'
function stab(C, b, kind, v) {
  C.n('taiko', b, 0, 1, v, { kind: 'don' });
  const ch = kind === 'lyd' ? 'D2 A2 E3' : kind === 'both' ? 'D2 Eb2 A2 G#3' : 'D2 A2 Eb3';
  C.ch('strings', b, NN(ch), 0.5, 0.8 * v, { sfz: 1, rel: 0.6 });
  if (kind === 'lyd') ARR.accent(C, b, 'inf', 0.8 * v);
}
// the Void's stillness: the D Lydian stack of fifths spread high as pure tones (barely beating), over a sub D2
const STACK_HI = NN('D5 A5 E6 B6 F#6 C#7 G#7');
function stillness(C, b, len, v, n) {
  STACK_HI.slice(0, n || 7).forEach((m, i) => C.n('tone', b + i * 0.25, m, len - i * 0.25, v * (1 - i * 0.07), { att: 2.2, rel: 1.6, beat0: 0.05 + 0.03 * i, beat1: 0.2 + 0.05 * i, pan: ((i % 3) - 1) * 0.35, oct: 0 }));
  C.n('sub', b, nm('D2'), len, 0.5 * v / 0.3, { att: 2.5, rel: 2 });
}
// a crystalline answer (Falling Blossom Emotion meeting a cut): glass ping + music box + a koto harmonic, D Lydian
const CRYST = NN('A6 F#6 D7 E6 G#6 C#7 B6 E7');
function chime(C, b, v, k) {
  const m = CRYST[k % CRYST.length];
  C.n('glass', b, m, 0.5, 0.3 * v, { arp: 1, t60: 1.1, pan: ((k % 5) - 2) * 0.2 });
  C.n('mbox', b + 0.04, m - 12, 0.5, 0.45 * v, { pan: ((k % 3) - 1) * 0.3 });
  C.n('koto', b + 0.08, m - 12, 1, 0.3 * v, { let: 1, pick: 0.24, bright: 0.4, t60: 2.5, pan: 0.2 });
}
// Gojo's head darkened: his Lydian head remapped into D Phrygian (♯4 → 4, 6 → ♭6, 7 → ♭7) — his theme under the blade
const GOJO_DARK = V.remap(G.a, 'lydian', 'phrygian', nm('D4'));

// ====================================================================================== 1. a2_signs
HT.music.cue({ id: 'a2.signs', from: 'a2_signs', to: 'a2_signs', level: LV.domains, fn: C => {
  const S = 'a2_signs', END = C.sec(C.endBeat);
  const hs = C.cuesOf(S, 'handSign'), h1 = hs.length ? hs[hs.length - 1].t : 6.52;
  const done = C.cueT(S, 'domainBloom', 13.4);
  // silence first (a1.fall closed the music gate at Act I's end); the two seals; then ONE temple bell — close, struck
  // (the Shrine opens the war)
  C.g('gate', bt(h1 + 0.5) - 0.5, 1, 0.02);
  C.n('bonsho', bt(h1 + 0.5), nm('D2'), 4, 0.75, { t60: 24, pan: 0.15 });
  // the seals complete: the clappers quicken into the expansion
  kizami(C, done + 0.3, END - 0.06, 0.6);
} });

// ====================================================================================== 2–3. a2_expand → a2_shred
// scene-derived times shared by the two layers (cue seconds)
function warTimes(C) {
  const E = 'a2_expand', X = 'a2_shred', XT = C.sceneT(X);
  const war = splitKeys(E, [[0, 0.5], [1.4, 0.64], [2.6, 0.38], [3.8, 0.56], [5, 0.5]]);
  return {
    war, ext: shotT(E, 'static', 6.0), tally: C.cueT(E, 'tallyTick', 12.4), orbit: shotT(E, 'orbit', 18.0), XT,
    inside: XT + evT(X, e => e.env && e.env.set === 'void', 8.0), smile: XT + shotT(X, 'closeup', 11.0),
    outside: XT + evT(X, e => e.env && e.env.set === 'city' && e.t > 9, 14.0),
    crack1: C.cueT(X, 'barrierCrack', 14.0), shatter: lastCue(C, X, 'barrierShatter', 20.2), neck: C.cueT(X, 'shing', 22.2),
    black: XT + ((postEv(X, 'black') || { t: 24.6 }).t), END: C.sec(C.endBeat),
  };
}
HT.music.cue({ id: 'a2.void', from: 'a2_expand', to: 'a2_shred', level: LV.void + TRIM.war, fn: C => {
  const T = warTimes(C), W = T.war, E0 = C.sceneT('a2_expand');
  // ---- the territory war: Gojo's head on glass, its level and tuning following his share of the frame
  warLevels(C, W, 'void', E0);
  G.a.forEach(([b, m, l]) => { const t = 0.25 + b * BEAT; C.n('glass', bt(t), m + detOf(W, 'void', E0 + t), l, 0.55, { vib: 7, rel: 0.4 }); });
  C.n('sub', 0, nm('D2'), bt(T.ext) + 2, 0.7, { att: 0.8, rel: 2 });                              // the shared D
  [[0.05, 'D6'], [2.5, 'A5'], [4.2, 'E6']].forEach(([t, n]) => C.n('koto', bt(t), nm(n) + detOf(W, 'void', E0 + t), 1, 0.32, { let: 1, pick: 0.24, bright: 0.4, t60: 3, pan: -0.35 }));
  // settled at 50/50: the dome — a quiet shimmer while we watch it from outside
  C.level(bt(5.2), -6, 0.3);
  C.ch('tone', bt(5.2), NN('D6 A6'), bt(T.orbit + 6 - 5.2) - 1, 0.45, { att: 2, rel: 1.5, beat0: 0.1, beat1: 0.35, oct: 0 });
  C.ch('glass', bt(T.tally), NN('A5 E6'), 2, 0.2, { arp: 1, t60: 2 });
  C.level(bt(T.XT) - 0.2, -60, 0.2);                                                               // outside: the Shrine
  // ---- inside the Void: nothing happens. Stillness; the D Lydian stack; a koto harmonic
  C.level(bt(T.inside) - 0.1, 0, 0.02);
  stillness(C, bt(T.inside), bt(T.outside - T.inside) - 0.5, 0.42);
  C.n('koto', bt(T.inside + 0.3), nm('D6'), 1, 0.4, { let: 1, pick: 0.24, bright: 0.4, t60: 4 });
  C.level(bt(T.outside) - 0.1, -4, 0.05);
  // ---- outside again: the shell strains under the cuts (the ♯4 grinding against the fifth), crescendo to the shatter
  for (let b = bt(T.crack1), i = 0; b < bt(T.shatter) - 1e-6; b += 0.25, i++) {
    const u = (b - bt(T.crack1)) / Math.max(1, bt(T.shatter - T.crack1));
    C.n('glass', b, [nm('A5'), nm('G#5'), nm('E6'), nm('G#5')][i % 4] + (u > 0.6 ? 12 : 0), 0.25, 0.14 + 0.3 * u, { arp: 1, t60: 0.5, pan: (i % 2 ? 0.3 : -0.3) });
  }
  C.ch('tone', bt(T.crack1), NN('D6 G#6'), bt(T.shatter - T.crack1), 0.4, { att: 3, rel: 0.02, beat0: 0.3, beat1: 6, oct: 0 });
  C.ch('glass', bt(T.shatter), NN('D6 G#6 A6 D7'), 2, 0.5, { arp: 1, t60: 1.6 });                  // the shell breaks
} });
HT.music.cue({ id: 'a2.shrine', from: 'a2_expand', to: 'a2_shred', level: LV.domains + TRIM.war, fn: C => {
  const T = warTimes(C), W = T.war, E0 = C.sceneT('a2_expand'), dS = t => detOf(W, 'shrine', E0 + t);
  // ---- the territory war: Sukuna's head on shamisen (an octave up) and low strings; odaiko on every push of the split
  warLevels(C, W, 'shrine', E0);
  SK.a.forEach(([b, m, l]) => { const t = 0.25 + b * BEAT; C.n('shamisen', bt(t), m + 12 + dS(t), l, 0.6, { pan: 0.35 }); C.n('strings', bt(t), m + dS(t), l, 0.5, { att: 0.06, rel: 0.3 }); });
  W.K.forEach(([t, g], i) => C.n('taiko', bt(E0 + W.t0 + t + 0.05), 0, 1, 0.75 + 0.3 * Math.abs(g - 0.5) * 4, { kind: 'don' }));
  C.ch('strings', bt(5.0), NN('D2 A2'), bt(T.ext - 5.0) + 1, 0.3, { att: 0.5, rel: 0.8 });           // settled: the fifth
  // ---- outside: the Shrine rises over the crimson city — the ritual begins, his theme in the low strings
  const R0 = Math.ceil(bt(T.ext));                                                                 // 12
  C.ch('bell', R0, NN('D5 Eb5 A5'), 2, 0.5, { t60: 3.5 });
  rite(C, R0, bt(T.XT), 0.7);
  cutting(C, R0 + 4, bt(T.XT), 0.3, 0.5);
  C.mel('strings', R0 + 2, SK.a.concat(V.disp(SK.b, 8)), 0.46, { att: 0.08, rel: 0.4 });
  C.mel('dbass', R0 + 2, V.oct(SK.a.concat(V.disp(SK.b, 8)), -1), 0.66, { cut: 360, drive: 1 });
  stab(C, bt(T.tally), 'phr', 0.95);                                                               // tally 1
  C.n('dbass', bt(T.tally), nm('D1'), 2, 0.8, { cut: 260, rel: 0.6 });
  for (let b = Math.ceil(bt(T.orbit)); b < bt(T.XT) - 1e-6; b += 4) C.ch('bell', b, NN('D5 Eb5'), 2, 0.35, { t60: 3 });
  C.levelRamp(bt(T.orbit), bt(T.XT), 0, 1);
  // ---- a2_shred, outside: the district is shredded — the ritual at full, the cutting never stops
  const S0 = bt(T.XT), SI = bt(T.inside);
  C.level(S0, 1, 0.05);
  rite(C, S0, SI, 0.85, 2);
  cutting(C, S0, SI, 0.5, 0.62);
  C.mel('strings', S0, SK.a, 0.55, { att: 0.05, rel: 0.3 });
  C.mel('strings', S0, V.oct(SK.a, 1), 0.28, { att: 0.05, rel: 0.3 });
  C.mel('strings', S0 + 8, SK.b, 0.55, { att: 0.05, rel: 0.3 });
  C.mel('dbass', S0, V.oct(SK.a.concat(V.disp(SK.b, 8)), -1), 0.75, { cut: 400, drive: 1 });
  for (let b = S0; b < SI - 1e-6; b += 4) C.ch('bell', b, NN('D5 Eb5 A5'), 2, 0.4, { t60: 3 });
  // ---- inside the Void the Shrine is silent — only his smile: one low shamisen note, sagging
  C.level(SI - 0.05, -60, 0.01);
  C.level(bt(T.smile) - 0.1, -10, 0.02);
  C.n('shamisen', bt(T.smile) + 0.2, nm('Eb3'), 1, 0.6, { let: 1, bend: -1, bendAt: 0.3, bendDur: 0.8, pan: 0.3 });
  C.level(bt(T.outside) - 0.3, -60, 0.05);
  // ---- outside again: the shell cracks all over — the ritual returns and builds into the shatter
  const O0 = bt(T.outside), SH = bt(T.shatter);
  C.level(O0 - 0.05, 1, 0.02);
  const D0 = Math.max(O0, Math.floor(SH - 4));                                                       // the last bar: dense
  rite(C, O0, D0, 0.8, 0);
  rite(C, D0, SH, 0.85, 0, true);
  cutting(C, O0, SH, 0.45, 0.8);
  C.ch('strings', O0, NN('D2 Eb2 A2'), SH - O0, 0.22, { att: 2, rel: 0.1, trem: 12 });
  C.ch('strings', O0 + 4, NN('D3 Eb3'), SH - O0 - 4, 0.18, { att: 2.5, rel: 0.1, trem: 14 });
  C.n('riser', SH - 6, nm('D3'), 6, 0.45, { from: 250, to: 5500, q: 2.4, tone: 1 });
  kizami(C, C.sec(SH) - 2.2, C.sec(SH) - 0.03, 0.7);
  // the shatter: everything at once
  C.n('taiko', SH, 0, 1, 1.25, { kind: 'don' });
  C.ch('strings', SH, NN('D2 Eb2 A2 D3'), 0.5, 0.9, { sfz: 1, rel: 1.4 });
  C.n('tamtam', SH, 0, 1, 0.7, { dec: 5 });
  C.n('dbass', SH, nm('D1'), 3, 0.9, { cut: 280, rel: 1 });
  // close on Gojo: a thin high tremolo holds until the neck cut
  C.ch('strings', SH + 0.8, NN('D6 Eb6'), bt(T.neck) - SH - 0.8, 0.1, { att: 1.2, rel: 0.02, trem: 16, pont: 1 });
  // ---- the neck cut: the music stops dead (gate, every tail) …
  C.silence(bt(T.neck), C.endBeat);
  // … and with the black the whole mix falls silent until the monitoring room
  if (FULL_MIX_SILENCE) { C.lin('cut', bt(T.black), 1, bt(T.black + 0.2), 0); C.g('cut', C.endBeat - 0.02, 1, 0.01); }
} });

// ====================================================================================== 4. a2_watchers
HT.music.cue({ id: 'a2.watchers', from: 'a2_watchers', to: 'a2_watchers', level: LV.void - 5, fn: C => {
  const S = 'a2_watchers', END = C.endBeat, j = bt(C.cueT(S, 'clothSnap', 7.2));
  // the score all but absent: one low sustained note under the monitor hum; it leans in when Yuji jumps up
  C.n('strings', 3, nm('D2'), END - 6, 0.34, { att: 3, rel: 2.5, cut: 520, n: 3 });
  C.levelRamp(j - 1, j + 0.5, 0, 3);
  C.levelRamp(j + 0.5, j + 7, 3, 0);
} });

// ====================================================================================== 5–6. a2_rct → a2_simple
HT.music.cue({ id: 'a2.grind', from: 'a2_rct', to: 'a2_simple', level: LV.domains + TRIM.grind, fn: C => {
  const R = 'a2_rct', P = 'a2_simple', P0 = C.sceneT(P), END = C.endBeat;
  const cutsR = C.cuesOf(R, 'cleave'), blocks = C.cuesOf(R, 'block');
  const run = C.cueT(R, 'dashAir', 9.0), fall = C.cueT(R, 'bodyFall', 14.0), strain = evT(R, e => e.who === 'gojo' && e.face === 'strain' && e.t > 10, 17.6);
  const ring1 = C.cueT(P, 'infinityHum', 0.8), walkIn = P0 + evT(P, e => e.who === 'sukuna' && e.do === 'walk', 4.0);
  const ins0 = P0 + evT(P, e => e.env && e.env.set === 'command', 9.0), ins1 = P0 + evT(P, e => e.env && e.env.set === 'city' && e.t > 9.5, 11.0);
  const ring2 = lastCue(C, P, 'infinityHum', 11.2), grin = P0 + shotT(P, 'closeup', 16.4), med = P0 + shotAfter(P, 'medium', 17, 19.0);
  const cutsP = C.cuesOf(P, 'cleave');
  // ---- the heal: under the Shrine's constant cutting, a fragile glass line rises
  C.ch('strings', 0, NN('D2 Eb2'), bt(run), 0.18, { att: 2, rel: 0.4, trem: 11, pont: 1, cut: 1400 });
  cutting(C, 0, bt(run), 0.16, 0.36, 0, 0.35);
  NN('D5 A5 E6').forEach((m, i) => C.n('glass', 1 + i * 2, m, 2.2, 0.26, { vib: 5, rel: 0.8 }));
  // ---- cut all over while healing at full output: the grinding thickens, his head sinks into D Phrygian
  const c0 = cutsR.length ? cutsR[0].b : bt(4.2);
  C.ch('strings', c0, NN('A2 D3 Eb3'), bt(run) - c0, 0.2, { att: 1.5, rel: 0.3, trem: 13 });
  for (let b = Math.ceil(c0); b < bt(run) - 1e-6; b += 0.5) C.n('dbass', b, b % 1 ? nm('D2') : nm('D1'), 0.45, 0.62, { cut: 320, drive: 2 });
  C.mel('glass', c0 + 0.5, GOJO_DARK, 0.42, { vib: 6, rel: 0.4 });
  cutsR.filter(c => c.t < run).forEach(c => { C.n('taiko', c.b, 0, 0.25, 0.6, { kind: 'ka' }); C.ch('strings', c.b, NN('D3 Eb3'), 0.5, 0.5, { sfz: 1, rel: 0.3 }); });
  // ---- the chase: don-doko, shime 16ths, the bass running; the two blocks caught
  const r0 = bt(run), r1 = bt(fall) - 1.5;
  for (let b = r0; b < r1 - 1e-6; b += 0.25) {
    const i = Math.round((b - r0) * 4) % 4;
    if (i === 0) C.n('taiko', b, 0, 0.5, 0.75, { kind: 'don', dec: 0.8 }); else if (i >= 2) C.n('taiko', b, 0, 0.5, 0.42, { kind: 'do' });
    C.n('shime', b, 0, 0.25, i === 0 ? 0.55 : 0.32, {});
    if (i % 2 === 0) C.n('dbass', b, [nm('D2'), nm('D2'), nm('Eb2'), nm('D2')][Math.round((b - r0) * 2) % 4], 0.45, 0.7, { cut: 420, drive: 1 });
  }
  blocks.forEach(c => stab(C, c.b, 'phr', 0.85));
  // ---- the leg wrap: a heavy low hit; the grinding resumes with him on the ground
  stab(C, bt(fall), 'phr', 1.05);
  C.n('dbass', bt(fall), nm('D1'), 2, 0.85, { cut: 260, rel: 0.6 });
  C.ch('strings', bt(fall) + 1, NN('D2 Eb2 A2'), bt(P0) - bt(fall) - 1, 0.2, { att: 1.5, rel: 0.4, trem: 10 });
  cutsR.filter(c => c.t > fall).forEach(c => C.n('taiko', c.b, 0, 0.25, 0.55, { kind: 'ka' }));
  C.mel('koto', bt(strain), V.oct(V.frag(GOJO_DARK, 0, 4), -1), 0.34, { pan: -0.3 });
  // ---- Simple Domain #1: a pure halo (D A E as pure tones) that holds the cuts off — until he steps into it
  const hEnd1 = ring1 + 8;
  C.ch('tone', bt(ring1), NN('D5 A5 E6'), bt(walkIn - ring1), 0.5, { att: 0.3, rel: 0.2, beat0: 0.1, beat1: 0.3, oct: 0.05 });
  cutsP.filter(c => c.t < walkIn).forEach((c, k) => ARR.accent(C, c.b, 'inf', 0.8));                // the cuts break on its edge
  // eroding: each note re-sounds a little flatter, the ♭2 invades, the fifth goes
  [[walkIn, 'D5', -0.15], [walkIn, 'A5', -0.25], [walkIn + 1.6, 'Eb5', -0.1], [walkIn + 1.6, 'A5', -0.5], [walkIn + 3.0, 'Eb5', -0.3]].forEach(([t, n, d], i) => {
    const t1 = i < 2 ? walkIn + 1.6 : hEnd1;
    C.n('tone', bt(t), nm(n) + d, bt(Math.max(0.3, t1 - t)), 0.45 - 0.05 * i, { att: 0.15, rel: 0.2, beat0: 0.4 + 0.3 * i, beat1: 1.5 + i, oct: 0.05 });
  });
  cutting(C, bt(P0), bt(ins0), 0.2, 0.42, 0, 0.35);
  C.ch('strings', bt(P0), NN('D2 Eb2'), bt(ins0 - P0) + 1, 0.16, { att: 1.5, rel: 0.6, trem: 11 });
  cutsP.filter(c => c.t > walkIn && c.t < ins0).forEach(c => C.ch('strings', c.b, NN('D3 Eb3 A3'), 0.5, 0.55, { sfz: 1, rel: 0.3 }));
  // ---- the monitor insert: only the low floor, as if heard in the room
  C.level(bt(ins0) - 0.05, -9, 0.05);
  C.n('strings', bt(ins0), nm('D2'), bt(ins1 - ins0), 0.3, { att: 0.3, rel: 0.4, cut: 520, n: 3 });
  C.level(bt(ins1) - 0.05, 0, 0.05);
  // ---- Simple Domain #2: no healing now — a thinner halo, chewed away faster; the bass grinds, his dark head strains
  C.ch('tone', bt(ring2), NN('D5 A5'), 2, 0.4, { att: 0.2, rel: 0.2, beat0: 0.2, beat1: 0.6, oct: 0.05 });
  [[ring2 + 1, 'D5', -0.2], [ring2 + 1.8, 'Eb5', -0.2], [ring2 + 2.6, 'Eb5', -0.45], [ring2 + 3.4, 'D5', -0.7]].forEach(([t, n, d], i) =>
    C.n('tone', bt(t), nm(n) + d, bt(0.8), 0.4, { att: 0.1, rel: 0.2, beat0: 1 + i, beat1: 3 + i, oct: 0.05 }));
  for (let b = Math.ceil(bt(ins1)); b < bt(grin) - 1e-6; b += 0.5) C.n('dbass', b, b % 1 ? nm('Eb2') : nm('D1'), 0.45, 0.68, { cut: 340, drive: 2 });
  C.ch('strings', bt(ins1), NN('D2 Eb2 A2 D3 Eb3'), bt(grin - ins1), 0.2, { att: 1.2, rel: 0.3, trem: 14 });
  cutting(C, bt(ins1), bt(grin), 0.4, 0.7, 0, 0.35);
  cutsP.filter(c => c.t > ins1).forEach(c => C.ch('strings', c.b, NN('D3 Eb3 A3'), 0.5, 0.62, { sfz: 1, rel: 0.3 }));
  C.mel('strings', bt(ring2 + 0.8), V.oct(V.frag(GOJO_DARK, 0, 6), -1), 0.36, { att: 0.1, rel: 0.4 });
  // ---- the ring breaks; his grin: Sukuna's head in the low strings over the odaiko
  stab(C, bt(grin), 'phr', 1.0);
  C.mel('strings', bt(grin), V.frag(SK.a, 0, 4), 0.55, { att: 0.05, rel: 0.4 });
  C.mel('dbass', bt(grin), V.oct(V.frag(SK.a, 0, 4), -1), 0.72, { cut: 380, drive: 1 });
  // ---- held: a tremolo and a heartbeat under Gojo's set jaw — into the lunge
  C.ch('strings', bt(med), NN('D3 Eb3'), END - bt(med) + 0.5, 0.2, { att: 0.8, rel: 0.2, trem: 13 });
  heart(C, Math.ceil(bt(med)), END, 1, 0.45, 0.65);
} });

// ====================================================================================== 7. a2_red
HT.music.cue({ id: 'a2.red', from: 'a2_red', to: 'a2_red', level: LV.clash + TRIM.red, fn: C => {
  const S = 'a2_red', END = C.endBeat;
  const lunge = bt(C.cueT(S, 'dashAir', 1.0)), clamp = bt(C.cueT(S, 'hitM', 1.16));
  const red = bt(C.cueT(S, 'redBlast', 3.55)), charge = bt(C.cueT(S, 'redCharge', 3.0)) - 2;     // the charge rises from ≈ 2.0 s
  const wall = bt(C.cueT(S, 'wallCrash', 4.95)), shrug = bt(evT(S, e => e.who === 'gojo' && e.pose === 'shrug', 15.0));
  // the lunge: a crescendo tremolo into the clamp
  C.ch('strings', 0, NN('D3 Eb3'), clamp, 0.28, { att: 0.4, rel: 0.05, trem: 14 });
  C.n('shime', lunge - 0.5, 0, 0.25, 0.5, {}); C.n('shime', lunge - 0.25, 0, 0.25, 0.6, {});
  stab(C, clamp, 'lyd', 0.9);
  // the Red: the Lydian stack gathers in a glass tremolo, strings and a riser — then the point-blank blast
  C.ch('strings', clamp + 0.5, NN('D2 A2'), red - clamp - 0.5, 0.2, { att: 1.2, rel: 0.02, trem: 10 });
  for (let b = charge, i = 0; b < red - 1e-6; b += 0.125, i++) C.n('glass', b, STACK_HI[i % 5] - 12, 0.125, 0.15 + 0.35 * (b - charge) / Math.max(0.5, red - charge), { arp: 1, t60: 0.4, pan: (i % 2 ? 0.35 : -0.35) });
  C.n('riser', charge, nm('A3'), red - charge, 0.5, { from: 400, to: 7000, q: 2, tone: 1.5 });
  C.n('taiko', red, 0, 1, 1.3, { kind: 'don' });
  C.ch('strings', red, NN('D2 A2 E3 B3'), 0.5, 0.95, { sfz: 1, rel: 1.4 });
  C.ch('glass', red, NN('D6 A6 E7'), 1, 0.45, { arp: 1, t60: 1.8 });
  C.n('subdrop', red, nm('D1'), 1, 0.9, { dec: 2.6 });
  C.n('tamtam', red, 0, 1, 0.75, { dec: 4.5 });
  C.n('dbass', red, nm('D1'), 2, 0.9, { cut: 280, rel: 0.8 });
  // into his own shrine: the second hit (his rub) — then a breath: nothing new until the shrug
  stab(C, wall, 'phr', 1.1);
  C.n('dbass', wall, nm('D1'), 2, 0.8, { cut: 260, rel: 0.8 });
  // the shrug: three light koto notes (the Lydian turn) — and unease again under the smoke
  [[0, 'G#5'], [0.25, 'A5'], [0.75, 'B5']].forEach(([d, n], i) => C.n('koto', shrug + d, nm(n), 1, 0.36 - 0.03 * i, { let: 1, pan: -0.2 }));
  C.ch('strings', shrug + 3, NN('D2 Eb2'), END - shrug - 3, 0.18, { att: 2.5, rel: 0.5, cut: 900 });
} });

// ====================================================================================== 8. a2_clash2
HT.music.cue({ id: 'a2.clash2', from: 'a2_clash2', to: 'a2_clash2', level: LV.clash + TRIM.clash2, fn: C => {
  const S = 'a2_clash2', END = C.endBeat;
  const rise = bt(C.cueT(S, 'shrineRise', 0.4)), dome = bt(C.cueT(S, 'voidOpen', 6.0)), tally = bt(C.cueT(S, 'tallyTick', 6.6));
  const inside = bt(evT(S, e => e.env && e.env.set === 'void', 10.0));
  const hits = C.cuesOf(S, ['hitL', 'hitM', 'hitH']), blink = bt(evT(S, e => e.who === 'sukuna' && e.do === 'blink', 13.6));
  const grip = bt(evT(S, e => e.kana === 'ガシッ', 14.3)), ecu = bt(shotT(S, 'ecu', 15.6)), vow = bt(C.cueT(S, 'subDrop', 15.8));
  const out = bt(evT(S, e => e.env && e.env.set === 'city' && e.t > 11, 17.8)), shatter = bt(lastCue(C, S, 'barrierShatter', 21.5));
  const med = bt(shotT(S, 'medium', 23.4, 1));
  // ---- maximum range: the Shrine's procession — odaiko on every beat, temple bells, his theme in octaves
  C.ch('bell', rise, NN('D5 Eb5 A5 Bb5'), 3, 0.55, { t60: 4 });
  for (let b = Math.ceil(rise); b < dome - 1e-6; b += 1) C.n('taiko', b, 0, 0.5, b % 2 ? 0.55 : 0.85, { kind: b % 2 ? 'do' : 'don', dec: 1.3 });
  C.mel('strings', Math.ceil(rise), SK.a, 0.5, { att: 0.1, rel: 0.5 });
  C.mel('strings', Math.ceil(rise), V.oct(SK.a, -1), 0.44, { att: 0.1, rel: 0.5 });
  C.mel('dbass', Math.ceil(rise), V.oct(SK.a, -1), 0.7, { cut: 360, drive: 1 });
  cutting(C, Math.ceil(rise) + 4, dome, 0.3, 0.5);
  // ---- Gojo expands again — a darker, heavier dome: his head an octave down on the strings, a shimmer above; tally 2
  C.mel('strings', dome, V.oct(G.a, -1), 0.5, { att: 0.12, rel: 0.5 });
  C.mel('glass', dome + 0.5, V.frag(G.a, 0, 4), 0.3, { vib: 6, rel: 0.6 });
  C.ch('tone', dome, NN('D6 A6'), inside - dome, 0.35, { att: 1.5, rel: 0.4, beat0: 0.1, beat1: 0.5, oct: 0 });
  stab(C, tally, 'lyd', 0.9);
  // ---- inside: the amplified fight — Sukuna leads (his head on top), the groove drives, every blow caught
  for (let b = inside; b < blink - 1e-6; b += 0.25) {
    const i = Math.round((b - inside) * 4) % 16, g = 'D.dkD.ddD.dkDdDd'[i], s = 's.s.S.s.s.s.S.s.'[i];
    const c = ARR.TAIKO[g]; if (c) C.n(c[0], b, 0, 0.25, 0.78 * c[2], c[3]);
    const d = ARR.TAIKO[s]; if (d) C.n(d[0], b, 0, 0.25, 0.6 * d[2], d[3]);
    if (i % 2 === 0) C.n('dbass', b, [nm('D2'), nm('D2'), nm('Eb2'), nm('D2'), nm('A1'), nm('D2'), nm('C2'), nm('D2')][(i / 2) % 8], 0.45, 0.72, { cut: 420, drive: 1 });
  }
  C.mel('strings', inside, V.oct(V.frag(SK.a, 0, 7), 1), 0.52, { att: 0.04, rel: 0.25 });
  C.mel('glass', inside + 1, V.frag(G.a, 0, 3), 0.4, { vib: 8, rel: 0.3 });
  // Sukuna's three blows get his rub; the last contact is Gojo's counterpunch to the ribs: his fifths (+ glass)
  hits.forEach((h, i) => stab(C, h.b, i === hits.length - 1 ? 'lyd' : 'phr', h.sfx === 'hitH' ? 1.05 : h.sfx === 'hitM' ? 0.8 : 0.6));
  // ---- he spins behind him: the groove drops out; a low tremolo and a heartbeat; the grip; the eyes narrow…
  C.ch('strings', blink, NN('D2 Eb2'), vow - blink, 0.22, { att: 0.3, rel: 0.05, trem: 12 });
  heart(C, Math.ceil(blink), ecu, 1, 0.5, 0.7);
  C.n('shamisen', grip, nm('Eb4'), 1, 0.6, { let: 1, bend: -1, bendAt: 0.15, bendDur: 0.3, pan: 0.3 });
  C.n('taiko', grip, 0, 0.25, 0.6, { kind: 'ka' });
  C.hole(ecu, vow);
  // ---- … THE VOW: a deep temple bell with the scripted sub drop, and the vow's drone under the darkening shell
  C.n('bonsho', vow, nm('A1'), 4, 1.0, { t60: 20, pan: 0 });
  C.n('dbass', vow, nm('D1'), shatter - vow, 0.6, { cut: 150, rel: 0.8, sub: 0.8 });
  C.ch('strings', vow + 1, NN('D2 Eb2 A2'), shatter - vow - 1, 0.2, { att: 3, rel: 0.2, cut: 900 });
  // outside: the cutting closes in on the shell — crescendo — the shell caves in
  cutting(C, q16(out), shatter, 0.3, 0.75);
  rite(C, Math.floor(out), shatter, 0.6, 1);
  C.n('riser', shatter - 5, nm('D3'), 5, 0.4, { from: 250, to: 5000, q: 2.4, tone: 1 });
  C.n('taiko', shatter, 0, 1, 1.2, { kind: 'don' });
  C.ch('strings', shatter, NN('D2 Eb2 A2 D3'), 0.5, 0.9, { sfz: 1, rel: 1.3 });
  C.n('tamtam', shatter, 0, 1, 0.6, { dec: 4 });
  // aftermath: the vow's drone stays low; Gojo's dark head strains on the koto
  C.ch('strings', shatter + 1, NN('D2 Eb2'), END - shatter - 1 + 0.5, 0.16, { att: 2, rel: 0.6, cut: 900 });
  C.mel('koto', med, V.frag(GOJO_DARK, 0, 5), 0.36, { pan: -0.3 });
} });

// ====================================================================================== 9–10. a2_blossom → a2_three
HT.music.cue({ id: 'a2.ball', from: 'a2_blossom', to: 'a2_three', level: LV.domains + TRIM.ball, fn: C => {
  const B = 'a2_blossom', T = 'a2_three', T0 = C.sceneT(T), END = C.endBeat;
  const cuts = C.cuesOf(B, 'cleave');
  const ins0 = evT(B, e => e.env && e.env.set === 'command', 5.2), ins1 = evT(B, e => e.env && e.env.set === 'city' && e.t > 6, 7.4);
  const swell = C.cueT(B, 'voidOpen', 7.4), tally = C.cueT(B, 'tallyTick', 8.0), cracks = C.cuesOf(B, 'barrierCrack');
  const down = C.cueT(B, 'downer', 12.6);
  const steps = (SCN(B) && SCN(B).C ? SCN(B).C.fx.filter(e => e.fx === 'barrier' && e.t >= down - 0.01 && e.t < down + 1).map(e => e.t) : []);
  const ST = steps.length >= 4 ? steps.slice(0, 4) : [down, down + 0.25, down + 0.47, down + 0.67];
  const ticks = C.cuesOf(T, 'signalTick'), clock0 = T0 + shotT(T, 'static', 5.6, 1);
  const coll = C.cueT(T, 'boom', 8.5), leap = T0 + shotT(T, 'low', 11.4), land = C.cueT(T, 'groundSlam', 12.95);
  const burst = C.cueT(T, 'wallCrash', 16.0), dash = C.cueT(T, 'dashAir', 18.25), palm = C.cueT(T, 'hitH', 18.68);
  const after = T0 + shotAfter(T, 'static', 19, 20.0), gr = T0 + evT(T, e => e.who === 'sukuna' && e.face === 'grin', 22.4);
  // ---- Falling Blossom Emotion: every cut answered by a crystalline chime; petals falling in D Lydian
  cuts.forEach((c, k) => chime(C, c.b, 1, k));
  const PET = NN('G#6 F#6 E6 D6 C#6 B5 A5 G#5 F#5 E5');
  for (let b = bt(0.2), k = 0; b < bt(ins0) - 1e-6; b += 0.5, k++) C.n(k % 3 === 2 ? 'glass' : 'mbox', b, PET[(k * 3) % PET.length], 0.5, 0.2 + 0.05 * (k % 2), k % 3 === 2 ? { arp: 1, t60: 0.9, pan: 0.3 } : { pan: -0.3 + 0.15 * (k % 5) });
  C.ch('strings', 0, NN('A4 E5'), bt(ins0), 0.12, { att: 1.5, rel: 0.6, pont: 1 });
  C.ch('strings', 0, NN('D2 Eb2'), bt(ins0), 0.12, { att: 2, rel: 0.6, cut: 800 });
  // the insert: one high glass note
  C.n('glass', bt(ins0), nm('A5'), bt(ins1 - ins0), 0.2, { vib: 4, att: 0.3, rel: 0.4 });
  // ---- expansion #3: the dome swells huge — Gojo's head broad in the strings (octaves) and glass, a taiko roll; tally 3
  C.mel('strings', bt(swell), G.a, 0.6, { att: 0.15, rel: 0.6 });
  C.mel('strings', bt(swell), V.oct(G.a, -1), 0.5, { att: 0.15, rel: 0.6 });
  C.mel('glass', bt(swell), G.a, 0.46, { vib: 8, rel: 0.5 });
  C.n('sub', bt(swell), nm('D2'), bt(down - swell), 0.8, { att: 1.5, rel: 0.4 });
  for (let b = bt(swell), i = 0; b < bt(down) - 1e-6; b += 0.25, i++) C.n('taiko', b, 0, 0.25, 0.3 + 0.4 * (b - bt(swell)) / Math.max(1, bt(down - swell)), { kind: i % 4 ? 'do' : 'don', dec: 0.7 });
  stab(C, bt(tally), 'lyd', 0.95);
  // the cracks: the Shrine's intervals bite into the dome's chord
  cracks.forEach(c => C.ch('strings', c.b, NN('Eb3 G3 Bb3 Eb4'), 0.5, 0.7, { sfz: 1, rel: 0.5 }));
  // ---- the shrink: four steps down to the ball, each a sforzando a fifth/fourth lower and shorter
  const SHR = [NN('D4 A4 D5'), NN('A3 E4 A4'), NN('D3 A3 D4'), NN('A2 E3 A3')];
  ST.forEach((t, i) => C.ch('strings', bt(t), SHR[i], 0.5, 0.56 - 0.07 * i, { sfz: 1, rel: 0.15 }));
  // ---- the ball: pressure — a squeezed semitone cluster, both hearts at 120 BPM, the cutting low
  const ball = ST[3] + 0.1;
  C.ch('strings', bt(ball), NN('D5 Eb5 E5'), bt(clock0 - ball), 0.12, { att: 1.5, rel: 0.1, trem: 15, pont: 1 });
  C.ch('strings', bt(ball), NN('D2 Eb2'), bt(clock0 - ball), 0.18, { att: 1, rel: 0.1, trem: 9 });
  heart(C, Math.ceil(bt(ball)), bt(clock0), 1, 0.4, 0.72);
  cutting(C, Math.ceil(bt(ball)), bt(clock0), 0.22, 0.62, 0, 0.35);
  C.n('riser', bt(T0), nm('D3'), bt(clock0 - T0), 0.3, { from: 200, to: 3500, q: 3, tone: 0.5 });
  // ---- the clock: the music strips down to a pulse locked to the ticks (2:58 · 2:59 · 3:00) …
  C.ch('strings', bt(clock0), NN('D3 Eb3 A3'), bt(coll - clock0) - 0.5, 0.22, { att: 1.8, rel: 0.05, trem: 12 });
  (ticks.length ? ticks : [5.7, 6.7, 7.7].map(t => ({ b: bt(T0 + t) }))).forEach((k, i) => {
    C.n('taiko', k.b, 0, 1, 0.7 + 0.15 * i, { kind: 'don', dec: 0.9 });
    C.n('glass', k.b, nm('A6'), 0.5, 0.25 + 0.05 * i, { arp: 1, t60: 0.8 });
    C.n('dbass', k.b, nm('D1'), 0.5, 0.7, { cut: 240, rel: 0.2 });
  });
  // … the tiniest pause … and at three minutes the double collapse: the two modes crash together
  C.hole(bt(coll) - 0.6, bt(coll));
  stab(C, bt(coll), 'both', 1.25);
  C.n('subdrop', bt(coll), nm('D1'), 1, 1.0, { dec: 3 });
  C.n('tamtam', bt(coll), 0, 1, 0.8, { dec: 5 });
  C.n('dbass', bt(coll), nm('D1'), 3, 0.95, { cut: 280, rel: 1 });
  // the crimson drains away: a falling line, dying
  [[0.5, 'D4'], [1.5, 'A3'], [2.5, 'Eb3'], [3.5, 'D3']].forEach(([d, n], i) => C.n('strings', bt(coll) + d * 2, nm(n), 2, 0.4 - 0.06 * i, { att: 0.3, rel: 0.8 }));
  // ---- the expressway: action — his theme becomes the bass line; Gojo answers in quick glass bursts
  const A0 = Math.ceil(bt(leap)) + 1, A1 = bt(after);
  for (let b = A0; b < A1 - 1e-6; b += 0.25) {
    const i = Math.round((b - A0) * 4) % 16, g = 'D.ddD.dkD.ddDdDd'[i], s = 's.s.S.s.s.s.S.ss'[i];
    const c = ARR.TAIKO[g]; if (c) C.n(c[0], b, 0, 0.25, 0.8 * c[2], c[3]);
    const d = ARR.TAIKO[s]; if (d) C.n(d[0], b, 0, 0.25, 0.62 * d[2], d[3]);
  }
  const BL = V.oct(SK.a.concat(V.disp(SK.b, 8)), -1);
  for (let b = A0; b < A1 - 1e-6; b += 16) C.mel('dbass', b, BL.filter(n => b + n[0] < A1 - 1e-6), 0.8, { cut: 440, drive: 1 });
  C.mel('strings', A0, SK.a, 0.42, { att: 0.05, rel: 0.3 });
  for (let b = A0; b < A1 - 1e-6; b += 0.25) { const m = nm(['D6', 'A5', 'E6', 'A5'][Math.round((b - A0) * 4) % 4]); if (!C.clash(b, 0.25, m, ['strings', 'dbass'])) C.n('koto', b, m, 0.25, Math.round(b * 4) % 2 ? 0.18 : 0.26, { pan: 0.35 }); }
  stab(C, bt(land), 'phr', 0.8);
  stab(C, bt(burst), 'lyd', 1.1);
  C.mel('glass', bt(burst) + 0.25, V.aug(V.frag(G.a, 0, 4), 0.5), 0.6, { vib: 8, rel: 0.3 });
  NN('D5 E5 F#5 G#5 A5 B5 C#6 D6').forEach((m, i) => C.n('glass', bt(dash) + i * 0.125, m, 0.125, 0.3 + 0.03 * i, { arp: 1, t60: 0.6, pan: 0.2 }));
  stab(C, bt(palm), 'lyd', 1.15);
  C.n('dbass', bt(palm), nm('D1'), 2, 0.85, { cut: 280, rel: 0.6 });
  // ---- he is knocked back along the deck, rises, grins: a tense hold that fades before the darkness of the wheel
  C.ch('strings', A1, NN('D3 A3 Eb4'), bt(T0 + 27) - A1, 0.2, { att: 0.6, rel: 0.8, trem: 12 });
  heart(C, Math.ceil(bt(gr)), bt(T0 + 26), 2, 0.5, 0.35);
  C.fadeOut(bt(T0 + 25), bt(T0 + 27.5));
} });

// ====================================================================================== 11. a2_wheel
HT.music.cue({ id: 'a2.wheel', from: 'a2_wheel', to: 'a2_wheel', level: LV.void, fn: C => {
  const S = 'a2_wheel', END = C.endBeat;
  const clunk = bt(C.cueT(S, 'wheelClunk', 2.6)), deck = bt(evT(S, e => e.env && e.env.set === 'city', 5.0));
  const wipe = bt(evT(S, e => e.who === 'gojo' && e.pose === 'wipe', 7.6)), smile = bt(evT(S, e => e.who === 'gojo' && e.face === 'smile', 8.5));
  const cu = bt(shotT(S, 'closeup', 9.6, 1));
  C.silence(0, clunk);                                    // darkness: no tail of the expressway survives the cut
  // ---- darkness; the wheel turns: one bar of Mahoraga's mechanical ostinato (3+3+2 on the diminished triad), stated
  // at its home position D F G♯ — Act III's four adaptations (signal, chase ×2, adapt; SPEC §3.3) then rotate it a minor
  // third each (F, G♯, B) until the fourth closes the circle on D
  const w = MA.wheel(0);
  MA.steps.forEach((s, j) => {
    C.n('clunk', clunk + s * 0.25, w[j], 1, j === 0 ? 0.45 : 0.8, { t60: 1.4 });
    C.n('dbass', clunk + s * 0.25, w[j] - 12, 0.7, 0.7, { cut: 360 });
  });
  '..x.x...x.x...x.'.split('').forEach((c, i) => { if (c === 'x') C.n('shime', clunk + i * 0.25, 0, 0.25, 0.4, { kind: 'ka' }); });
  C.ch('strings', clunk, [w[0] - 12, w[2] - 12], 4, 0.18, { att: 0.3, rel: 0.6, pont: 1 });
  // ---- the deck: the nosebleed — Gojo's theme, fragile, on a solo koto, following the wipe and the smile
  C.n('sub', deck, nm('D2'), END - deck, 0.45, { att: 2, rel: 1.5 });
  [[deck + 1.2, 'D5'], [deck + 2.8, 'A5'], [wipe, 'G#5'], [wipe + 0.5, 'A5'], [smile, 'B5'], [cu, 'C#6'], [cu + 1.5, 'B5'], [cu + 2, 'A5']]
    .forEach(([b, n], i) => C.n('koto', b, nm(n), 1, 0.3 + (n === 'B5' && b === smile ? 0.06 : 0), { let: 1, pan: -0.15 + 0.04 * i, t60: 3 }));
  C.ch('glass', smile, NN('A5 E6'), END - smile, 0.14, { att: 1.5, rel: 1.2, vib: 0 });
  C.fadeOut(END - 1.5, END);
} });

// ====================================================================================== 12. a2_clash5
function clash5Times(C) {
  const S = 'a2_clash5';
  return {
    S, war: splitKeys(S, [[0, 0.5], [0.8, 0.58], [1.6, 0.44], [2.4, 0.5]]), tally4: C.cueT(S, 'tallyTick', 0.3),
    inside: evT(S, e => e.env && e.env.set === 'void', 3.8), hits: C.cuesOf(S, ['hitL', 'hitM', 'hitH']),
    out: evT(S, e => e.env && e.env.set === 'city', 7.0), slam: C.cueT(S, 'wallCrash', 7.8), pull: lastCue(C, S, 'blueImplode', 8.6),
    brk: C.cueT(S, 'barrierShatter', 10.2), pier: lastCue(C, S, 'wallCrash', 14.05),
    seals: C.cueT(S, 'handSign', 17.0), five: lastCue(C, S, 'tallyTick', 18.2), vopen: lastCue(C, S, 'voidOpen', 19.6),
    ecu: shotT(S, 'ecu', 22.2), outside2: evT(S, e => e.env && e.env.set === 'city' && e.t > 20, 28.0),
    in2: evT(S, e => e.env && e.env.set === 'void' && e.t > 29, 32.0), END: C.sec(C.endBeat),
  };
}
HT.music.cue({ id: 'a2.clash4', from: 'a2_clash5', to: 'a2_clash5', level: LV.domains + TRIM.clash5, fn: C => {
  // the Shrine's layer of clash 4's split page (the war again, fast): Sukuna's head in diminution on shamisen + strings,
  // odaiko on each push, level and tuning following his share; silent after the page
  const T = clash5Times(C), W = T.war, dS = t => detOf(W, 'shrine', t);
  warLevels(C, W, 'shrine', 0);
  const cell = V.aug(V.frag(SK.a, 0, 4), 0.5);
  for (let b = 0.1; b < bt(T.inside) - 2 + 1e-6; b += 2) cell.forEach(([d, m, l]) => { const t = C.sec(b + d); C.n('shamisen', b + d, m + 12 + dS(t), l, 0.62, { pan: 0.35 }); C.n('strings', b + d, m + dS(t), l, 0.48, { att: 0.03, rel: 0.2 }); });
  W.K.forEach(([t, g]) => C.n('taiko', bt(W.t0 + t + 0.05), 0, 1, 0.8 + 0.3 * Math.abs(g - 0.5) * 4, { kind: 'don' }));
  C.level(bt(T.inside) - 0.1, -60, 0.05);
} });
HT.music.cue({ id: 'a2.clash5', from: 'a2_clash5', to: 'a2_clash5', level: LV.clash + TRIM.clash5, fn: C => {
  const T = clash5Times(C), W = T.war, dV = t => detOf(W, 'void', t), bI = bt(T.inside);
  // ---- clash 4, the Void's side: Gojo's head in diminution on glass, level and tuning following his share; tally 4
  warLevels(C, W, 'void', 0);
  const cell = V.aug(V.frag(G.a, 0, 4), 0.5);
  for (let b = 0.1; b < bI - 2 + 1e-6; b += 2) cell.forEach(([d, m, l]) => C.n('glass', b + d, m + dV(C.sec(b + d)), l, 0.6, { vib: 6, rel: 0.25 }));
  C.n('sub', 0, nm('D2'), bI, 0.7, { att: 0.3, rel: 0.5 });
  stab(C, bt(T.tally4), 'both', 0.9);
  C.level(bI - 0.1, 0, 0.03);
  // ---- inside the Void: rapid punches — Gojo's hands out of his pockets: fast and loud, his head bright on top
  const out = bt(T.out), brk = bt(T.brk);
  for (let b = bI; b < brk - 1e-6; b += 0.25) {
    const i = Math.round((b - bI) * 4) % 16, g = b < out ? 'DdDdDdDdDdDdDdDd'[i] : 'D.ddD.dkD.ddDdDd'[i], s = 'ssSsssSsssSsssSs'[i];
    const c = ARR.TAIKO[g]; if (c) C.n(c[0], b, 0, 0.25, (b < out ? 0.7 : 0.8) * c[2], c[3]);
    const d = ARR.TAIKO[s]; if (d) C.n(d[0], b, 0, 0.25, 0.6 * d[2], d[3]);
    if (i % 2 === 0) C.n('dbass', b, [nm('D2'), nm('D2'), nm('A1'), nm('D2'), nm('D2'), nm('Eb2'), nm('C2'), nm('D2')][(i / 2) % 8], 0.45, 0.78, { cut: 440, drive: 1 });
  }
  C.mel('glass', bI + 0.5, G.a, 0.66, { vib: 9, rel: 0.35 });
  C.mel('strings', bI + 0.5, V.oct(G.a, -1), 0.4, { att: 0.05, rel: 0.3 });
  T.hits.filter(h => h.t < T.out).forEach(h => stab(C, h.b, 'lyd', h.sfx === 'hitH' ? 1.1 : h.sfx === 'hitM' ? 0.8 : 0.65));
  // ---- Blue slams him into the Shrine (his rub) and pulls him back (Gojo's fifths); both domains break at once
  C.mel('strings', out, SK.a, 0.5, { att: 0.05, rel: 0.3 });
  stab(C, bt(T.slam), 'phr', 1.0);
  stab(C, bt(T.pull), 'lyd', 0.95);
  stab(C, brk, 'both', 1.2);
  C.n('tamtam', brk, 0, 1, 0.6, { dec: 4 });
  // a breath: the bare fifth; then the hook and the pier
  const hook = T.hits.filter(h => h.t > T.brk)[0], pier = bt(T.pier);
  C.ch('strings', brk + 1, NN('D2 A2'), (hook ? hook.b : brk + 5) - brk - 1.5, 0.22, { att: 0.8, rel: 0.3 });
  if (hook) { for (let b = hook.b - 1, i = 0; b < hook.b - 1e-6; b += 0.125, i++) C.n('shime', b, 0, 0.125, 0.3 + 0.05 * i, {}); stab(C, hook.b, 'lyd', 1.05); }
  stab(C, pier, 'phr', 1.1);
  C.n('tamtam', pier, 0, 1, 0.5, { dec: 3.5 });
  // he is down: a low tremolo and a heartbeat; the seals: a thin high tremolo over a growing drone
  const seals = bt(T.seals), five = bt(T.five);
  C.ch('strings', pier + 1, NN('D2 Eb2'), seals - pier - 1, 0.18, { att: 1, rel: 0.3, trem: 10 });
  heart(C, Math.ceil(pier + 1), seals, 1, 0.45, 0.6);
  C.ch('strings', seals, NN('D5 Eb5'), five - seals - bt(0.2), 0.14, { att: 1, rel: 0.02, trem: 16, pont: 1 });
  C.n('sub', seals, nm('D2'), five - seals - bt(0.2), 0.8, { att: 1.2, rel: 0.02 });
  // ---- the tiniest silence (the whole mix) — then Gojo's seal lights one frame before Sukuna's
  C.silence(five - bt(0.2), five);
  if (FULL_MIX_SILENCE) { C.g('cut', five - bt(0.2), 0, 0.002); C.g('cut', five - bt(0.004), 1, 0.001); }
  C.n('glass', five, nm('A6'), 1, 0.6, { arp: 1, t60: 2.4, pan: -0.2 });
  C.n('koto', five, nm('D6'), 1, 0.5, { let: 1, pick: 0.24, bright: 0.4, t60: 4.5, pan: -0.2 });
  C.n('taiko', five + bt(FRAME), 0, 0.25, 0.5, { kind: 'ka', pan: 0.3 });                           // Sukuna's, one frame late —
  C.n('shamisen', five + bt(FRAME), nm('D4'), 0.1, 0.4, { pan: 0.3 });                               // choked
  // ---- the Void lands (with the picture): stillness — the Lydian stack, pure — and the tinnitus
  const vo = bt(T.vopen), ecu = bt(T.ecu), o2 = bt(T.outside2), i2 = bt(T.in2), END = C.endBeat;
  C.level(vo - 0.1, LV.void - LV.clash, 0.05);
  stillness(C, vo, o2 - vo + 1, 0.45);
  for (let b = ecu, k = 0; b < ecu + 4 - 1e-6; b += 0.25 + 0.25 * (k % 3), k++) C.n('glass', b, STACK_HI[(k * 5) % 7] + 12, 0.25, 0.1, { arp: 1, t60: 0.5, pan: ((k % 5) - 2) * 0.3 }); // information, pouring
  // one straight strike to the chest: the only beat in the stillness
  const strike = T.hits.filter(h => h.t > 20)[0];
  if (strike) { stab(C, strike.b, 'lyd', 1.1); C.n('dbass', strike.b, nm('D1'), 2, 0.8, { cut: 260, rel: 0.8 }); }
  // outside, at 2:40, the Shrine peels away: his head falls apart, low, and one temple bell far off
  C.mel('shamisen', o2 + 0.5, V.frag(SK.b, 0, 4).map(([b, m, l]) => [b * 1.5, m, l * 1.5]), 0.4, { pan: 0.3 });
  C.n('bell', o2 + 2, nm('Eb4'), 2, 0.3, { t60: 4, pan: 0.3 });
  // ---- inside, frozen: the act ends on a held, unresolved suspension (sus2 with the Lydian ♯11), cut into Act III
  C.ch('strings', i2, NN('D3 A3 E4'), END - i2, 0.24, { att: 3, rel: 0.25 });
  C.ch('glass', i2 + 1, NN('A5 E6'), END - i2 - 1, 0.18, { att: 2.5, rel: 0.25, vib: 0 });
  C.n('tone', i2 + 2, nm('G#6'), END - i2 - 2, 0.35, { att: 3, rel: 0.25, beat0: 0.2, beat1: 1.2, oct: 0 });
  C.n('sub', i2, nm('D2'), END - i2, 0.7, { att: 2.5, rel: 0.25 });
  C.fadeOut(END - 0.8, END, LV.void - LV.clash);
} });
})();
