/* =====================================================================================================
   DOMAIN CLASH — Act VI "The World-Cutting Slash" score (17:30–20:00)      (src/audio/score_a6.js, classic script)
   Canon ch. 236. Almost nothing, placed exactly. The last notch (the wheel's second adaptation, remembered — its E♭ F♯ A
   tritone); one low Sukuna note as he rises; SILENCE before the Cut, and the Cut empties the whole mix (worldCut's own
   3 s full-mix silence, sfx.js); in the white, one koto harmonic as the scarf lands — the snow's note, the first sound
   of the film (a1.snow, D6); then "Heading South": the Elegy (Gojo's theme remembered: Lydian → Ionian, the ♯4 relaxed
   to 4, augmented, soft FM keys) — the quietest music of the film and its resolution; Sukuna's salute in the snow
   without music; the credits carry the Elegy once more and end on the bell.
   Cues (film seconds; act seconds = film − 1050). Sync points are read from the scenes.
     a6.notch    1050–1062 silence under the act card; after the wheel's clunk (SFX) its adapted tritone hums and dies
     a6.rise     1062–1082 one low note (D) as he rises; his ♭2 joins as he raises his hand; out before the Cut
     (a6_cut     1082–1098 no music; the worldCut SFX empties the mix for 3 s)
     a6.white    1098–1108 one koto harmonic (D6) as the scarf settles into the snow
     a6.airport  1108–1148 the Elegy: D chord as he walks in; the theme from Geto's wave (D | Bm | G | A — its last note a
                          suspension over A, held through their laugh, resolving to D as the plane scene opens); the
                          plane (the head again, low, the chords breathing); the seven lotuses — seven koto harmonics
                          down the D major pentatonic — and the last D chord
     (a6_salute  1148–1162 no music: wind, a distant crackle)
     a6.credits  1162–1200 the Elegy once more (keys, koto, strings): theme and answer, the cadence, and the bell
                          (bonshō D2) as the page holds on シーン
   Loudness: AU.LEVELS cut −12 · airport −16 (the quietest music) · credits −10, with trims for the soft instruments.
   Measured (M5): Act VI −29.3 LUFS integrated; music: the airport's Elegy −31.9 (the quietest passage), the credits −27.9
   (the bell −22.3 momentary); the Cut's 3 s full-mix silence is digital zero (raw mix); the film ends at −182 dBFS.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, LEVELS: LV, BEAT } = AU;
const EL = TH.elegy;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;
// (soft instruments and single notes: the trims bring the measured music loudness to quiet but audible levels — the
// airport's Elegy ≈ −31 LUFS, the film's quietest music; the credits ≈ −27; tools/audio-lab.js actChecks, M5)
const TRIM = { notch: 18, rise: 9, white: 6, airport: 17, credits: 14 };

// ------------------------------------------------------------------ the director's scene data (as score_a1–a5.js)
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const shotAfter = (id, name, tMin, def) => { const e = shotsOf(id).filter(x => x.shot === name && x.t > tMin).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const evT = (id, pred, def) => { const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t); return L.length ? L[0].t : def; };

const WEB = NN('Eb4 F#4 A4');                  // the adapted wheel (Act IV)
const HARM = o => Object.assign({ let: 1, pick: 0.24, bright: 0.4, t60: 4.2 }, o || {});   // koto harmonic (score_a1.js)
const ELEGY = () => EL.a.concat(V.disp(EL.b, 16));   // 32 beats: the theme (16) and its answer (16)
// the Elegy's chords, one per 8 beats (D | Bm | G | A), then the final D — soft FM keys and a low pad
function elegyChords(C, b0, v, n) {
  EL.harm.slice(0, n || 5).forEach((ch, k) => C.ch('fmkeys', b0 + k * 8, ch, 7.5, v, { rel: 1.2 }));
}

// ====================================================================================== 1. a6_notch
HT.music.cue({ id: 'a6.notch', from: 'a6_notch', to: 'a6_notch', level: LV.cut + TRIM.notch, fn: C => {
  const S = 'a6_notch', END = C.endBeat;
  const clunk = bt(C.cueT(S, 'wheelClunk', 7.4));
  C.g('gate', clunk - 0.5, 1, 0.02);            // (a5.command closed it)
  // silence under the act card and the wheel fading in; after its last notch (the clunk is the SFX) the adapted
  // tritone hums once and dies — the adaptation to the Infinity, remembered
  C.ch('tone', clunk + 0.2, [WEB[0] - 12, WEB[2] - 12], END - clunk - 1.5, 0.22, { att: 0.3, rel: 1.2, beat0: 0.6, beat1: 0.2, oct: 0.15 });
  C.fadeOut(clunk + 2, END - 0.5);
} });

// ====================================================================================== 2. a6_rise
HT.music.cue({ id: 'a6.rise', from: 'a6_rise', to: 'a6_rise', level: LV.cut + TRIM.rise, fn: C => {
  const S = 'a6_rise', END = C.endBeat;
  const rise = bt(evT(S, e => e.who === 'sukuna' && e.pose === 'a5_sukRise', 5.4)), hand = bt(evT(S, e => e.who === 'sukuna' && e.pose === 'a6_sukHand', 15.2));
  // one low note as he rises out of the smoke; his ♭2 joins it as he raises his hand; out before the Cut
  C.n('strings', rise, nm('D2'), END - rise - 1, 0.2, { att: 3, rel: 0.8, cut: 600 });
  C.n('sub', rise, nm('D2'), END - rise - 1, 0.45, { att: 3, rel: 0.8 });
  C.n('strings', hand, nm('Eb2'), END - hand - 1, 0.14, { att: 1.5, rel: 0.8, cut: 600 });
  C.fadeOut(END - 3, END - 1);
  C.silence(END - 1, END + bt(16));             // silence before (and through) the Cut: no tail may reach it
} });

// ====================================================================================== 4. a6_white
HT.music.cue({ id: 'a6.white', from: 'a6_white', to: 'a6_white', level: LV.cut + TRIM.white, fn: C => {
  const S = 'a6_white';
  const land = bt(C.cueT(S, 'dropSoft', 7.4));
  // white; the scarf drifts down and settles: one koto harmonic — the snow's note, the film's first sound (a1.snow)
  C.n('koto', land, nm('D6'), 1, 0.55, HARM({ t60: 5 }));
} });

// ====================================================================================== 5. a6_airport
HT.music.cue({ id: 'a6.airport', from: 'a6_airport', to: 'a6_airport', level: LV.airport + TRIM.airport, fn: C => {
  const S = 'a6_airport', END = C.endBeat;
  const wave = bt(evT(S, e => e.who === 'geto' && e.pose === 'geto_sitFrontWave', 8.0));
  const plane = bt(shotAfter(S, 'static', 22.5, 23.0)), lotus = bt(shotAfter(S, 'static', 32.5, 33.0));
  const T0 = Math.round(wave * 2) / 2;                                   // the theme enters with Geto's wave
  // ---- he walks into the warm light: the D chord, then G, very soft
  C.ch('fmkeys', 0.5, EL.harm[0], T0 - 8.5, 0.22, { rel: 1.5 });
  C.ch('fmkeys', T0 - 8, EL.harm[2], 7.5, 0.18, { rel: 1.5 });
  C.n('sub', 0.5, nm('D2'), END - 1, 0.28, { att: 4, rel: 2 });
  // ---- Geto waves: the Elegy — theme and answer over D | Bm | G | A; the answer's last note (D6) is a suspension
  // over A, held through their laugh, resolving as the plane scene opens
  C.mel('fmkeys', T0, ELEGY(), 0.42, { rel: 0.8 });
  elegyChords(C, T0, 0.24, 4);
  C.ch('strings', T0, NN('D3 A3'), 32, 0.08, { att: 3, rel: 2 });
  // ---- the plane takes off beyond the window: the resolution to D, and the head again, low and slow (koto)
  const R = Math.max(plane, T0 + 32);
  C.ch('fmkeys', R, EL.harm[4], 8, 0.26, { rel: 2 });
  C.mel('koto', R + 2, V.oct(V.frag(EL.a, 0, 8), -1), 0.3, { let: 1, t60: 3 });
  C.ch('fmkeys', R + 10, EL.harm[2], 6, 0.2, { rel: 1.5 });
  // ---- the seven lotuses in the sun: seven koto harmonics down the D major pentatonic, and the last D chord
  NN('D6 B5 A5 F#5 E5 D5 A4').forEach((m, i) => C.n('koto', lotus + 0.5 + i * 1.5, m, 1, 0.3 - 0.015 * i, HARM({ t60: 3.5, pan: -0.3 + 0.1 * i })));
  C.ch('fmkeys', lotus + 6, EL.harm[3], 3, 0.18, { rel: 1 });
  C.ch('fmkeys', lotus + 9, EL.harm[4], END - lotus - 9, 0.22, { rel: 2, t60: 5 });
  C.fadeOut(END - 3, END);
  C.g('gate', END - 0.4, 0, 0.05);              // the salute has no music (a6.credits reopens the gate)
} });

// ====================================================================================== 7. a6_credits
HT.music.cue({ id: 'a6.credits', from: 'a6_credits', to: 'a6_credits', level: LV.credits + TRIM.credits, fn: C => {
  const END = C.endBeat, T0 = bt(2), BELL = END - bt(6);
  C.g('gate', T0 - 0.5, 1, 0.02);
  // ---- the Elegy once more, a little fuller: theme and answer on the keys, the koto doubling the head, strings
  C.mel('fmkeys', T0, ELEGY(), 0.42, { rel: 0.8, trem: 3 });
  C.mel('koto', T0, V.oct(EL.a, -1), 0.22, { let: 1, t60: 2.5, pan: -0.2 });
  elegyChords(C, T0, 0.24, 5);
  C.ch('strings', T0, NN('D3 A3'), 40, 0.09, { att: 3, rel: 2 });
  C.n('sub', T0, nm('D2'), BELL - T0 + 4, 0.28, { att: 4, rel: 3 });
  // ---- again, the answer only, higher (glass) over the last cadence (G → A → D)
  const T1 = T0 + 40;
  C.mel('glass', T1, V.oct(EL.b, 0), 0.22, { vib: 4, rel: 1.2 });
  C.ch('fmkeys', T1, EL.harm[2], 7.5, 0.22, { rel: 1.2 });
  C.ch('fmkeys', T1 + 8, EL.harm[3], 7.5, 0.22, { rel: 1.2 });
  C.ch('fmkeys', Math.min(T1 + 16, BELL - 2), EL.harm[4], 12, 0.24, { rel: 3, t60: 6 });
  // ---- the page holds on シーン: the bell
  C.n('bonsho', BELL, nm('D2'), 4, 0.35, { t60: 20 });            // (measured −19.3 LUFS momentary at 0.55: a soft stroke, not a jolt)
  C.fadeOut(END - bt(2), END);
} });
})();
