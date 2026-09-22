/* =====================================================================================================
   DOMAIN CLASH — Act I "The Strongest" score (0:00–3:30)                  (src/audio/score_a1.js, classic script)
   Nine HT.music cues over the 12 scenes of SPEC.md §3.1 (film seconds; 120 BPM, 1 beat = 0.5 s, 1 bar = 2 s).
   Every sync point is read from the scenes (sound cues via C.cueT / C.cuesOf; shots, posts and script events from the
   compiled fight scenes), so the music follows the director's re-timings; the numbers below are the planned values
   (and the fallbacks).
     a1.snow      0–12   silence first: ONE koto harmonic (D6) at the first flake (0.8 s), nothing else
     a1.city     12–42   Gojo's head augmented ×2 on glass over a low D pedal, koto "snowflakes" (D Lydian); the
                         answer phrase begins and is left unfinished; in the empty junction the music thins out (the
                         crosswalk chirps, the signal and the crow are left alone) and is gone by 40 s
     a1.king     42–68   the title hit stands alone (2 s near-silence), then Sukuna's taiko heartbeat pre-laps under the
                         held title (a sound bridge) → the rooftop: heartbeat (60 BPM lub-dub), detuned bass, low
                         Phrygian clusters, his theme; the heartbeat doubles on the ECU; the second eyes open on an accent
     a1.opener   68–84   TRUE SILENCE (music gate closed on the picture cut at 68.0) through the distant Purple and the
                         collapse; then a low drone (sub + low strings; the ♭2 creeps in as he regrows; one bass growl)
     a1.walk     84–102  Gojo's theme in full, confident D Lydian: glass lead, koto arpeggios, strings, a light walking
                         pulse; a breath when he stops and stretches; a tightening glass arpeggio and a bloom as the
                         Six Eyes open (16.2 s)
     a1.intercut 102–118 "The Strongest" counterpoint: koto (Gojo) against shamisen (Sukuna) over a taiko oroshi that
                         accelerates with the panel cuts (halves → quarters → don-doko → 16th roll); cut dead (gate)
                         on the arrival at 116.2
     a1.standoff 118–142 silence as a weapon (ma): one far bonshō at the low wide (127.6), one pure tone (A5) under the
                         dolly zoom (133.6–136.8) whose beating quickens as the junction stretches
     a1.exchange 142–168 three stabs on the three collisions; the driving Strongest theme (glass over strings, taiko
                         don-doko, detuned bass, koto) with every contact caught; the float; palm → Blue → wall crash;
                         the Blue gathers the D Lydian stack of fifths; silence on the throw, the impact; the bare fifth
                         fades by 161.0; the tails are gated out (161.25) — silence but the wind on the smoking hole
     a1.fall     168–210 Sukuna walks out (heartbeat, bass, cluster); the music cuts on Dismantle (174.6); taiko ONLY
                         (a free-time oroshi) under the tower slide into the catch (179.27); the stretto flight into the
                         falling half; tension in the tilting office; a ONE-FRAME full-mix stop before the double punch
                         (195.587–195.62), the colossal hit, a ~1 s white-out silence (full mix drains 197.25→197.5,
                         silent to 198.38, back by 198.6), the closing chord (the bare D–A fifth + the opening's koto
                         harmonic at 200.0), faded with the picture (208.4→210)
   Dynamic arc: AU.LEVELS (opening −8, cityDawn −10, rooftop −6, walk −5, standoff −4, exchange 0 dB). The two
   full-mix silences use the engine's `cut` bus; FULL_MIX_SILENCE = false turns them into music-only silences.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, ARR, LEVELS: LV, BEAT } = AU;
const G = TH.gojo, SK = TH.sukuna;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;                                   // seconds → beats
const FRAME = 1 / 30;
const FULL_MIX_SILENCE = true;
// Density trims (dB, added to the AU.LEVELS base): the plan's levels are relative to the dense M0 fight-test cue; these
// sparse cues measured 2–6 LU under their planned loudness (tools/audio-lab.js actChecks, music-only integrated LUFS),
// so they are trimmed up to where the plan puts them. The dense exchange cues use the plan as is.
const TRIM = { city: 5, king: 2, walk: 3.5, intercut: 3 };

// ------------------------------------------------------------------ the director's scene data
// Fight scenes compile their scripts when they load (fight.js): shots / posts / raw events are read here, with the
// planned values as fallbacks, so a re-timed shot moves the music with it.
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const shotEv = (id, name, i) => shotsOf(id).filter(e => e.shot === name)[i || 0] || null;
const shotT = (id, name, def, i) => { const e = shotEv(id, name, i); return e ? e.t : def; };
const postEv = (id, name) => { const s = SCN(id); return ((s && s.C && s.C.post) || []).find(e => e.post === name) || null; };
const evT = (id, pred, def) => {
  const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t);
  return L.length ? L[0].t : def;
};

// ------------------------------------------------------------------ helpers
// Koto harmonic: a string lightly touched at its midpoint loses every odd mode and sounds the octave with only the even
// partials — i.e. a Karplus-Strong string at 2f whose excitation comb sits at twice the pluck position (0.12 → 0.24),
// with a soft excitation and a long ring.
const HARM = o => Object.assign({ let: 1, pick: 0.24, bright: 0.4, t60: 4.2 }, o || {});
// taiko stroke at a cue time in SECONDS (free-time passages)
const tk = (C, s, kind, v, o) => C.n('taiko', bt(s), 0, 0.5, v, Object.assign({ kind }, o || {}));
// heartbeat: lub (odaiko don) + dub (do) 0.75 beat = 0.375 s later (≈ the resting systole, S1→S2 ≈ 0.3–0.35 s),
// one pair every `per` beats (2 = 60 BPM, 1 = 120 BPM), velocity ramp v0 → v1
function heart(C, b0, b1, per, v0, v1) {
  for (let b = b0; b < b1 - 1e-6; b += per) {
    const v = v0 + (v1 - v0) * (b - b0) / Math.max(1e-6, b1 - b0);
    C.n('taiko', b, 0, 0.5, v, { kind: 'don', dec: 1.1 });
    C.n('taiko', b + 0.75, 0, 0.5, v * 0.62, { kind: 'do' });
  }
}
// a music stab on a contact: odaiko + low string sforzando (Phrygian rub for Sukuna's blows / a Lydian fifth-stack when
// Gojo lands) + glass pings when the blow stops on Infinity
function stab(C, b, kind, v) {
  C.n('taiko', b, 0, 1, v, { kind: 'don' });
  C.ch('strings', b, kind === 'lyd' ? NN('D2 A2 E3') : NN('D2 A2 Eb3'), 0.5, 0.8 * v, { sfz: 1, rel: 0.6 });
  if (kind === 'inf') ARR.accent(C, b, 'inf', v);
}
// the four exchange grooves (kuchi-shōga grid, ARR.TAIKO: D don · d do · k ka · S/s shime · x shime rim), built on the
// "don doko" ji-uchi (the horse rhythm: an 8th + two 16ths)
const GROOVE = ['D.ddD.dkD.ddD.k.', 'D.ddD.dkD.dd.kdd', 'D.dkD.ddD.dkDdDd', 'D.ddD.dkD.ddDDDD'];
const SHIME = ['s.s.S.s.s.s.S.s.', 's.s.S.s.s.s.S.ss', 's.s.S.s.s.s.S.s.', 'ssSsssSsssSsSSSS'];
// detuned-bass 8ths shaped against The Strongest (null = rest); bar 4 is the D pedal under the theme's resolution
const BASS = [['D2', null, 'D2', 'D2', null, 'D2', 'A1', 'C2'], ['A1', 'A1', 'Bb1', 'A1', 'D2', 'D2', 'C2', 'C2'],
  ['D2', 'D2', 'Eb2', 'Eb2', 'F2', 'Eb2', 'C2', 'C2'], ['D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'D2']];
// one groove bar: taiko + shime + bass (skipping bass notes that would rub a semitone against lines ALREADY written, so
// write the melodies first); steps at/after `until` or inside `skip` = [b0, b1) rest
function grooveBar(C, b, k, v, until, skip) {
  const g = GROOVE[k % 4], s = SHIME[k % 4], rest = bb => bb >= until - 1e-6 || (skip && bb >= skip[0] - 1e-6 && bb < skip[1] - 1e-6);
  for (let i = 0; i < 16; i++) {
    const bb = b + i * 0.25; if (rest(bb)) continue;
    const c = ARR.TAIKO[g[i]]; if (c) C.n(c[0], bb, 0, 0.25, v * c[2], c[3]);
    const d = ARR.TAIKO[s[i]]; if (d) C.n(d[0], bb, 0, 0.25, v * 0.8 * d[2], d[3]);
  }
  BASS[k % 4].forEach((n, j) => {
    const bb = b + j * 0.5; if (!n || rest(bb)) return;
    if (!C.clash(bb, 0.45, nm(n), ['glass', 'strings'])) C.n('dbass', bb, nm(n), 0.45, (j % 3 === 0 ? 0.92 : 0.7) * v / 0.8, { cut: 420, drive: 1 });
  });
}

// ====================================================================================== 1. a1_snow
HT.music.cue({ id: 'a1.snow', from: 'a1_snow', to: 'a1_snow', level: LV.opening, fn: C => {
  C.n('koto', bt(C.cueT('a1_snow', 'dropSoft', 0.8)), nm('D6'), 1, 0.6, HARM({ t60: 4.5, pan: 0.06 }));
} });

// ====================================================================================== 2–3. a1_tokyo → a1_empty
HT.music.cue({ id: 'a1.city', from: 'a1_tokyo', to: 'a1_empty', level: LV.cityDawn + TRIM.city, fn: C => {
  const E = C.sceneBeat('a1_empty');                                                       // 32 (28 s)
  // the cold floor: a sub D2 and a breath of low strings
  C.n('sub', 0, nm('D2'), E + 14, 0.7, { att: 4, rel: 5 });
  C.ch('strings', 2, NN('D2 A2'), E + 6, 0.2, { att: 3.5, rel: 4, cut: 700, n: 3 });
  // koto snowflakes over the flyover (D Lydian, let ring, drifting across the stereo field)
  [[1, 'A5', 0.3, -0.45], [3.5, 'E6', 0.22, 0.35], [5.5, 'F#5', 0.26, -0.15], [6.75, 'B5', 0.2, 0.5]]
    .forEach(([b, n, v, p]) => C.n('koto', b, nm(n), 1, v, { let: 1, pan: p }));
  // Gojo's head, augmented ×2 on glass: a promise (the full theme waits for the walk-in)
  C.mel('glass', 8, V.aug(G.a, 2), 0.34, { vib: 6, att: 0.1, rel: 1.0 });
  // the Lydian shine under the C♯6: E/D (II over I), very soft
  C.ch('strings', 15, NN('E4 G#4 B4'), 9, 0.1, { att: 2.5, rel: 3, cut: 2400, n: 3 });
  // koto answers inside the long notes
  [[17.5, 'G#5', 0.24, 0.3], [18.25, 'E6', 0.2, 0.4], [21, 'D6', 0.24, -0.3], [21.75, 'C#6', 0.2, -0.2], [22.5, 'A5', 0.22, -0.1]]
    .forEach(([b, n, v, p]) => C.n('koto', b, nm(n), 1, v, { let: 1, pan: p }));
  // the answer phrase begins (F♯ G♯ A B) … and is left hanging on E6
  [[24, 'F#5'], [25, 'G#5'], [25.5, 'A5'], [26, 'B5'], [28, 'E6']]
    .forEach(([b, n], k) => C.n('koto', b, nm(n), 1, 0.26 - 0.02 * k, { let: 1, pan: 0.2 - 0.1 * k }));
  // the empty junction: one koto note before the chirps, the head's first interval once more at the car, then nothing
  C.n('koto', E + 1, nm('A5'), 1, 0.2, { let: 1, pan: -0.3 });
  C.n('koto', E + 11, nm('D5'), 1, 0.2, { let: 1, pan: 0.25 });
  C.n('koto', E + 13, nm('A5'), 1, 0.17, { let: 1, pan: 0.35 });
  C.fadeOut(E + 16, E + 24);
} });

// ====================================================================================== 4–5. a1_title → a1_rooftop
HT.music.cue({ id: 'a1.king', from: 'a1_title', to: 'a1_rooftop', level: LV.rooftop + TRIM.king, fn: C => {
  const R = C.sceneBeat('a1_rooftop'), END = C.endBeat;                                  // 20, 52
  const hit = bt(C.cueT('a1_title', 'titleHit', 1.0));                                   // 2
  const turn = R + bt(evT('a1_rooftop', e => e.who === 'sukuna' && e.do === 'view' && e.view === 'front', 6.5)); // 33
  const grin = R + bt(evT('a1_rooftop', e => e.who === 'sukuna' && e.do === 'expr' && e.face === 'grin', 7.4));  // 34.8
  const ecu = R + bt(shotT('a1_rooftop', 'ecu', 12.0));                                  // 44
  const eyes = bt(C.cueT('a1_rooftop', 'sixEyes', 13.0));                                // 46
  // title: the hit stands alone; only a floor surfaces after ~2 s of near-silence
  C.level(0, -4);
  C.n('sub', hit, nm('D2'), R - hit + 2, 0.5, { att: 3.5, rel: 3 });
  // Sukuna's heartbeat pre-laps under the held title (sound bridge into the rooftop), with a low D–E♭ rub
  heart(C, hit + 8, R, 2, 0.16, 0.5);
  C.ch('strings', hit + 11, NN('D2 Eb2'), R - hit - 9, 0.14, { att: 3, rel: 1, cut: 600, n: 3 });
  C.levelRamp(hit + 8, R, -4, 0);
  // rooftop: heartbeat, the low cluster Dm(♭9), his motif on the detuned bass
  heart(C, R, ecu, 2, 0.55, 0.7);
  C.ch('strings', R, SK.harm[0], turn - R + 1, 0.24, { att: 2, rel: 1.5, cut: 1100 });
  C.mel('dbass', R + 4, V.oct(SK.a, -1), 0.72, { cut: 360, drive: 1 });
  // the turn: B♭/D swells; the grin: odaiko + a bass drop; then his theme on the low strings, the bass an octave below
  C.ch('strings', turn - 1, SK.harm[1], 4, 0.3, { att: 1.5, rel: 1 });
  C.n('taiko', grin, 0, 1, 0.85, { kind: 'don' });
  C.n('dbass', grin, nm('D1'), 1.5, 0.8, { cut: 300, rel: 0.5 });
  const th = R + 16;                                                                      // 36 (8.0 s)
  C.mel('strings', th, SK.a, 0.5, { att: 0.08, rel: 0.4 });
  C.mel('dbass', th, V.oct(SK.a, -1), 0.7, { cut: 380, drive: 1 });
  C.ch('strings', th + 4, NN('D4 Eb4'), ecu - th - 2, 0.1, { att: 1.5, rel: 0.5, trem: 13, pont: 1 });
  // the ECU: the heartbeat doubles; the second pair of eyes opens on an accent; the answer phrase sinks home (cut by
  // the opener's silence at the picture cut)
  heart(C, ecu, eyes, 1, 0.7, 0.85);
  C.n('taiko', eyes, 0, 1, 1.05, { kind: 'don' });
  C.ch('strings', eyes, NN('D2 Eb2 A2 D3'), 0.5, 0.75, { sfz: 1, rel: 1.0 });
  C.ch('strings', eyes, NN('D4 Eb4'), END - eyes, 0.16, { att: 0.3, rel: 0.3, trem: 15, pont: 1 });
  C.mel('strings', eyes, SK.b, 0.55, { att: 0.06, rel: 0.4 });
  C.mel('dbass', eyes, V.oct(SK.b, -1), 0.75, { cut: 360, drive: 1 });
  heart(C, eyes + 2, END, 2, 0.6, 0.5);
} });

// ====================================================================================== 6. a1_opener
HT.music.cue({ id: 'a1.opener', from: 'a1_opener', to: 'a1_opener', level: LV.rooftop, fn: C => {
  const S = 'a1_opener', END = C.endBeat;                                                 // 32
  const col = C.cueT(S, 'collapse', 5.7), rct = bt(C.cueT(S, 'rctHeal', 12.3));
  const cu = bt(shotT(S, 'closeup', 13.8));
  const d0 = bt(col + 2.8);                   // ≈ 8.5 s: the drone rises out of the collapse's tail into the hold on the dust
  C.silence(0, d0);                           // TRUE SILENCE from the picture cut (rooftop notes and reverb tails cut)
  C.n('sub', d0, nm('D2'), END - d0 - 3, 0.75, { att: 3, rel: 3 });
  C.ch('strings', d0 + 1, NN('D2 A2'), END - d0 - 4, 0.2, { att: 4, rel: 3, cut: 600, n: 3 });
  C.n('strings', rct, nm('Eb3'), END - rct - 4, 0.09, { att: 2.5, rel: 3, cut: 800, n: 3 });  // the ♭2 as he regrows
  C.n('dbass', cu, nm('D1'), 4, 0.5, { cut: 220, rel: 1.2, sub: 0.7 });                      // the grin: one low growl
  C.fadeOut(END - 5, END);
} });

// ====================================================================================== 7. a1_gojo_walk
HT.music.cue({ id: 'a1.walk', from: 'a1_gojo_walk', to: 'a1_gojo_walk', level: LV.walk + TRIM.walk, fn: C => {
  const S = 'a1_gojo_walk', END = C.endBeat;                                              // 36
  const stop = bt(evT(S, e => e.who === 'gojo' && e.do === 'place', 9.8));                // 19.6
  const stretch = bt(evT(S, e => e.who === 'gojo' && e.pose === 'stretchUp', 10.4));      // 20.8
  const cu = bt(shotT(S, 'closeup', 14.2));                                               // 28.4
  const eyes = bt(C.cueT(S, 'sixEyes', 16.2));                                            // 32.4
  const H = G.harm, T0 = 4;                                                               // theme from bar 2
  const ARP = ['D4 A4 E5 F#5 A5 F#5 E5 A4', 'D4 G#4 B4 E5 G#5 E5 B4 G#4', 'D4 A4 C#5 E5 F#5 E5 C#5 A4', 'D4 A4 C#5 F#5 G#5 F#5 C#5 A4'].map(NN);
  const ORD = [0, 1, 2, 3, 4, 5, 6, 7];
  // the walking pulse: pizzicato root on beats 1 & 3, a soft shime on 2 & 4 — until he stops
  for (let b = 0; b < Math.min(stop, T0 + 16) - 1e-6; b += 1) {
    if (b % 2 === 0) C.n('pizz', b, b % 4 === 0 ? nm('D2') : nm('A1'), 1, 0.75, {});
    else C.n('shime', b, 0, 0.25, 0.2, {});
  }
  // bar 1: the koto arpeggio on Dmaj9 over a strings floor
  C.arp('koto', 0, 4, ARP[0], ORD, 0.5, 0.28, { pan: -0.25 });
  C.ch('strings', 0, NN('D3 A3'), T0, 0.16, { att: 1.2, rel: 0.8, cut: 1600 });
  // bars 2–5: the theme on glass (a + b), one voicing per bar (Dmaj9 | E/D | F♯m7/D | Dmaj7♯11), koto arps following
  C.mel('glass', T0, G.a.concat(V.disp(G.b, 8)), 0.52, { vib: 8, rel: 0.5 });
  for (let k = 0; k < 4; k++) {
    const b = T0 + 4 * k;
    C.ch('strings', b, H[k].slice(0, 4), 3.9, 0.17, { att: 0.4, rel: 0.7, cut: 2200 });
    C.arp('koto', b, Math.min(4, stop - b), ARP[k], ORD, 0.5, 0.26, { pan: -0.25 });
  }
  // he stops: a breath — E/D held, a quiet glass stretch upward with his arms, then F♯m7/D and two koto notes
  C.ch('strings', T0 + 16, H[1].slice(0, 4), 4, 0.13, { att: 0.8, rel: 1 });
  NN('D5 E5 F#5 G#5 A5 B5 C#6 D6').forEach((m, i) => C.n('glass', stretch + i * 0.25, m, 0.25, 0.16 + 0.02 * i, { arp: 1, t60: 1.2, pan: 0.3 }));
  C.ch('strings', T0 + 20, H[2].slice(0, 4), cu - T0 - 19.5, 0.12, { att: 1, rel: 1 });
  C.n('koto', T0 + 21, nm('A5'), 1, 0.2, { let: 1, pan: 0.3 });
  C.n('koto', T0 + 22.5, nm('E5'), 1, 0.18, { let: 1, pan: 0.15 });
  // the eyes: a glass arpeggio on Dmaj7♯11 tightens (8ths → 16ths) and swells; strings crescendo; the bloom
  const A = NN('D5 A5 C#6 G#6 C#6 A5');
  for (let b = cu, i = 0; b < eyes - 0.1; i++) {
    const u = (b - cu) / Math.max(0.5, eyes - cu), step = u < 0.5 ? 0.5 : 0.25;
    C.n('glass', b, A[i % A.length], step, 0.2 + 0.3 * u, { arp: 1, t60: 0.9, pan: (i % 2 ? 0.25 : -0.25) });
    b += step;
  }
  C.ch('strings', cu, H[3], eyes - cu + 0.5, 0.2, { att: 1.8, rel: 1.2 });
  C.n('revcym', eyes - 3, 0, 3, 0.28);
  C.ch('glass', eyes, NN('A5 C#6 F#6'), END - eyes, 0.3, { att: 0.02, rel: 1.4, vib: 5 });
  C.ch('strings', eyes, NN('D3 A3 C#4 G#4'), END - eyes, 0.24, { att: 0.3, rel: 1.6 });
  C.n('koto', eyes, nm('D6'), 1, 0.3, { let: 1, pan: 0.35 });
} });

// ====================================================================================== 8. a1_intercut
HT.music.cue({ id: 'a1.intercut', from: 'a1_intercut', to: 'a1_intercut', level: LV.standoff + TRIM.intercut, fn: C => {
  const S = 'a1_intercut', END = C.endBeat;                                               // 32
  const cuts = shotsOf(S).map(e => bt(e.t)).sort((a, b) => a - b);
  const P = (cuts.length >= 5 ? cuts.slice(0, 5) : [0, 8, 16, 22.8, 28.4]);
  const arrive = P[4];                                                                     // 28.4: both arrive — cut
  const q = b => Math.round(b * 4) / 4, Q = P.map(q);                                     // panels on the 16th grid
  const panelAt = b => { let k = 0; for (let i = 0; i < 4; i++) if (b >= Q[i] - 1e-6) k = i; return k; };
  // the taiko oroshi, quantized to the panels: halves → quarters → don-doko → 16th roll (crescendo)
  const PAT = ['D.......d.......', 'D...d...D...d...', 'D.ddD.ddD.ddD.dd', 'DdDdDdDdDdDdDdDd'];
  const SHI = ['................', '..x...x...x...x.', 's.s.s.s.s.s.s.s.', 'ssssssssssssssss'];
  for (let b = 0; b < arrive - 1e-6; b += 0.25) {
    const k = panelAt(b), i = Math.round((b % 4) * 4), c = PAT[k][i], s = SHI[k][i];
    const v = k === 3 ? 0.5 + 0.55 * (b - Q[3]) / Math.max(0.25, arrive - Q[3]) : 0.58 + 0.1 * k;
    if (c === 'D') C.n('taiko', b, 0, 0.5, v, { kind: 'don', dec: k >= 2 ? 0.9 : 1.5 });
    else if (c === 'd') C.n('taiko', b, 0, 0.5, v * 0.7, { kind: 'do' });
    if (s === 's') C.n('shime', b, 0, 0.25, 0.3 + 0.06 * k + (k === 3 ? 0.25 * (b - Q[3]) / Math.max(0.25, arrive - Q[3]) : 0), {});
    else if (s === 'x') C.n('shime', b, 0, 0.25, 0.32, { kind: 'ka' });
  }
  // panels 1–2 (the split screens): The Strongest — koto (Gojo, D Lydian) against shamisen (Sukuna, D Phrygian, an
  // octave up), heads, then answers
  C.mel('koto', Q[0], G.a, 0.46, { pan: -0.35 });
  C.mel('shamisen', Q[0], V.oct(SK.a, 1), 0.5, { pan: 0.35 });
  C.mel('koto', Q[1], G.b, 0.48, { pan: -0.35 });
  C.mel('shamisen', Q[1], V.oct(SK.b, 1), 0.52, { pan: 0.35 });
  // panel 3 (eyes · junction · eyes): the heads in diminution, alternating (hocket), cell against cell
  const gc = V.aug(V.frag(G.a, 0, 3), 0.5), sc = V.aug(V.frag(V.oct(SK.a, 1), 0, 3), 0.5);   // 1.5 beats each
  for (let b = Q[2], turn = 0; b + 1.5 <= Q[3] + 1e-6; b += 1.5, turn ^= 1) C.mel(turn ? 'shamisen' : 'koto', b, turn ? sc : gc, 0.54, { pan: turn ? 0.35 : -0.35 });
  // panel 4 (the grid): the two signature intervals hammered together — Gojo's fifth (A5/D6) vs Sukuna's ♭2 (D4/E♭4)
  for (let b = Q[3]; b < arrive - 1e-6; b += 0.25) {
    const k = Math.round((b - Q[3]) * 4), u = (b - Q[3]) / Math.max(0.25, arrive - Q[3]);
    C.n('koto', b, k % 2 ? nm('D6') : nm('A5'), 0.25, 0.3 + 0.25 * u, { pan: -0.35 });
    C.n('shamisen', b, k % 2 ? nm('Eb4') : nm('D4'), 0.25, 0.32 + 0.25 * u, { pan: 0.35 });
  }
  // the arrival: cut dead with the picture (gate closed: every tail too) — the standoff begins in silence. The gate
  // reopens exactly at the cue end, where a1.standoff closes it again at the same instant (the later event wins), so no
  // tail slips through between the two scenes.
  C.hole(arrive, END);
  C.g('gate', arrive, 0, 0.004);
  C.g('gate', END, 1, 0.004);
} });

// ====================================================================================== 9. a1_standoff
HT.music.cue({ id: 'a1.standoff', from: 'a1_standoff', to: 'a1_standoff', level: LV.standoff, fn: C => {
  const S = 'a1_standoff', bell = bt(shotT(S, 'low', 9.6));
  // ma: the silence is the music — the music bus stays gated (no tail of the intercut survives) until the bell
  C.g('gate', 0, 0, 0.004);
  C.g('gate', bell - 0.1, 1, 0.004);
  // one far temple bell at the low wide across the crosswalk (the Heike's bell of impermanence), ringing on under the can …
  C.n('bonsho', bell, nm('D2'), 4, 0.4, { t60: 28, pan: -0.3 });
  // … and one pure tone under the dolly zoom: A — with D the only pitch Gojo's Lydian and Sukuna's Phrygian share —
  // its beating quickening as the junction stretches; cut dead on the reverse shot
  const dz = shotEv(S, 'dolly'), t0 = dz ? dz.t : 15.6, t1 = t0 + (dz && dz.dur ? dz.dur : 3.2);
  C.n('tone', bt(t0), nm('A5'), bt(t1 - t0), 0.55, { att: 1.6, rel: 0.05, beat0: 0.15, beat1: 3.2, pan: -0.1 });
} });

// ====================================================================================== 10. a1_exchange1
HT.music.cue({ id: 'a1.exchange', from: 'a1_exchange1', to: 'a1_exchange1', level: LV.exchange, fn: C => {
  const S = 'a1_exchange1';
  const hits = C.cuesOf(S, ['infinityStop', 'block', 'hitH']);
  const beat1 = hits.filter(h => h.t < 3.1), flurry = hits.filter(h => h.t >= 3.1 && h.t < 6.3 && h.sfx === 'infinityStop');
  const palm = (C.cuesOf(S, 'hitH')[0] || { b: bt(8.933) }).b;                            // 17.87
  const crash = bt(C.cueT(S, 'wallCrash', 9.67));                                         // 19.34
  const fl0 = bt(evT(S, e => e.who === 'gojo' && e.do === 'float', 6.5));                 // 13
  const fl1 = bt(evT(S, e => e.who === 'gojo' && e.do === 'float' && e.t > 7, 7.6));      // 15.2
  const blue = bt(evT(S, e => e.who === 'gojo' && e.do === 'blue', 12.2));                // 24.4
  const flick = bt(evT(S, e => e.who === 'gojo' && e.do === 'flick', 15.8));              // 31.6
  const whip = bt(C.cueT(S, 'whip', 16.1));                                               // 32.2
  const impact = bt(C.cueT(S, 'groundSlam', 16.45));                                      // 32.9
  const holdT = shotsOf(S).map(e => e.t).filter(t => t > 17).sort((a, b) => a - b)[0];
  const hold = bt(holdT == null ? 19.0 : holdT);                                          // 38: the smoking hole
  const EX = 6;                                     // the groove enters on beat 3 of bar 2 (3.0 s), a beat before the flurry cut
  // ---- beat 1: three stabs on the three collisions (they grow), over a low tremolo pedal that swells into the groove
  beat1.forEach((h, k) => stab(C, h.b, h.sfx === 'infinityStop' ? 'inf' : 'hit', 0.7 + 0.1 * k));
  C.ch('strings', 0.8, NN('D2 A2'), EX - 0.8, 0.22, { att: 1.2, rel: 0.3, trem: 11 });
  // ---- the driving Strongest theme: Gojo's 4 bars on glass over Sukuna's 4 bars on strings (+ octave), the groove
  // (which rests from the float until the beat after he lands, then drives into the palm)
  const TE = EX + 16;                                                                     // 22: the theme's end
  const FL = [fl0, Math.ceil(fl1 + 0.6)];                                                 // [13, 16)
  C.mel('glass', EX, TH.strongest.upper(), 0.6, { vib: 9, rel: 0.4 });
  C.mel('strings', EX, TH.strongest.lower(), 0.56, { att: 0.05, rel: 0.3 });
  C.mel('strings', EX, V.oct(TH.strongest.lower(), 1), 0.26, { att: 0.05, rel: 0.3 });
  for (let bar = 0; EX + 4 * bar < TE - 1e-6; bar++) grooveBar(C, EX + 4 * bar, bar, 0.74 + 0.04 * bar, TE, FL);
  // koto 16ths on the shared frame (D A E), skipping any note that rubs a semitone against the lines (not in the float)
  const KP = NN('A5 D6 E6 A5 D6 A6 E6 D6');
  for (let b = EX; b < TE - 1e-6; b += 0.25) {
    if (b >= FL[0] - 1e-6 && b < FL[1] - 1e-6) continue;
    const m = KP[Math.round((b - EX) * 4) % 8];
    if (!C.clash(b, 0.25, m, ['glass', 'strings', 'dbass'])) C.n('koto', b, m, 0.25, (Math.round(b * 4) % 4 === 0 ? 0.34 : 0.22), { pan: 0.35 });
  }
  // the float: the groove rests, only the lines and a glass drift upward under him
  NN('A5 D6 E6 A6 D7').forEach((m, i) => C.n('glass', fl0 + 0.25 + i * 0.5, m, 0.5, 0.2, { arp: 1, t60: 1.4, pan: 0.2 - 0.1 * i }));
  // flurry: every blow that stops on Infinity is caught by glass pings (the last, the strong cross, with the odaiko)
  flurry.forEach((h, k) => { ARR.accent(C, h.b, 'inf', k === flurry.length - 1 ? 1.1 : 0.85); if (k === flurry.length - 1) C.n('taiko', h.b, 0, 1, 0.9, { kind: 'don' }); });
  // the palm lands (Lydian stab), the Blue, the wall crash (odaiko + cluster + tam-tam)
  // (kept a notch under the act's peak: the clash is the loudest moment of Act I)
  C.n('revcym', palm - 2, 0, 2, 0.28);
  stab(C, palm, 'lyd', 0.9);
  C.n('taiko', crash, 0, 1, 1.05, { kind: 'don' });
  C.ch('strings', crash, NN('D2 A2 D3 Eb3'), 0.5, 0.72, { sfz: 1, rel: 1.2 });
  C.n('tamtam', crash, 0, 1, 0.48, { dec: 4 });
  C.n('dbass', crash, nm('D1'), 4, 0.72, { cut: 260, rel: 0.6 });
  // aftermath bar: rim ticks over the held D
  [TE, TE + 1].forEach((b, i) => C.n('taiko', b, 0, 0.25, 0.4 - 0.1 * i, { kind: 'ka' }));
  // ---- the Blue gathers: the D Lydian stack of fifths (D A E B F♯ C♯ G♯) is built one fifth per beat in the strings
  const B0 = Math.max(TE + 2, Math.floor(blue));                                          // 24
  const STACK = NN('D2 A2 E3 B3 F#4 C#5 G#5');
  STACK.forEach((m, i) => { const b = B0 + i; if (b < flick) C.n('strings', b, m, whip - b, 0.16 + 0.03 * i, { att: 0.6, rel: 0.12, cut: 3000 }); });
  for (let b = B0; b < whip - 1e-6; b += 0.25) {                                           // koto spins through what is gathered
    const n = Math.min(STACK.length, 1 + Math.floor(b - B0)), top = STACK.slice(0, n).map(m => { while (m < nm('D5')) m += 12; return m; }).sort((x, y) => x - y);
    const i = Math.round((b - B0) * 4), u = (b - B0) / Math.max(1, whip - B0);
    if (b < flick || i % 2 === 0) C.n('koto', b, top[i % top.length], 0.25, 0.22 + 0.2 * u, { pan: (i % 2 ? 0.3 : -0.3) });
  }
  for (let b = B0; b < flick - 1e-6; b += 0.25) {                                          // taiko: quarters → 8ths → 16ths
    const u = (b - B0) / Math.max(1, flick - B0), step = u < 0.5 ? 1 : u < 0.8 ? 0.5 : 0.25;
    if (Math.abs((b - B0) / step - Math.round((b - B0) / step)) < 1e-6) C.n('taiko', b, 0, 0.5, 0.5 + 0.4 * u, { kind: Math.round((b - B0) / step) % 2 ? 'do' : 'don', dec: 0.9 });
  }
  for (let b = B0 + 4; b < flick - 1e-6; b += 0.5) C.n('dbass', b, nm('D2'), 0.4, 0.62, { cut: 380 });
  C.n('taiko', flick, 0, 1, 1.0, { kind: 'don' });
  // silence on the throw (the whip carries it), then the impact
  C.silence(whip, impact);
  stab(C, impact, 'lyd', 1.1);
  C.n('dbass', impact, nm('D1'), 3, 0.8, { cut: 260, rel: 0.8 });
  // resolution: the bare D–A fifth (the only ground both stand on), dissolving before the hold on the smoking hole
  C.ch('strings', impact + 0.1, NN('D2 A2 D3 A3'), hold - impact - 1, 0.24, { att: 0.2, rel: 1.4 });
  C.n('glass', impact + 1, nm('D6'), 2, 0.2, { vib: 5, rel: 1.2 });
  C.n('koto', impact + 2, nm('D5'), 1, 0.26, { let: 1, pan: -0.2 });
  C.n('koto', impact + 3, nm('A5'), 1, 0.22, { let: 1, pan: 0.2 });
  C.fadeOut(hold - 3, hold);
  // "silence but the wind" on the smoking hole: the reverb/echo tails are drawn out by a slow gate, reopened for the
  // next cue just before the scene ends
  C.g('gate', hold + 0.5, 0, 0.25);
  C.g('gate', C.endBeat - 0.1, 1, 0.004);
} });

// ====================================================================================== 11–12. a1_exchange2 → a1_clash
HT.music.cue({ id: 'a1.fall', from: 'a1_exchange2', to: 'a1_clash', level: LV.exchange, fn: C => {
  const X = 'a1_exchange2', K = 'a1_clash', END = C.endBeat;                             // 84
  const XT = C.sceneT(X), KT = C.sceneT(K), K0 = bt(KT);                                  // 0, 24 s; 48
  const face = bt(XT + evT(X, e => e.who === 'sukuna' && e.do === 'face', 4.8));          // 9.6
  const grin = bt(XT + evT(X, e => e.who === 'sukuna' && e.do === 'expr' && e.face === 'grin', 4.9)); // 9.8
  const shing = bt(C.cueT(X, 'shing', 6.6));                                              // 13.2
  const slideT = C.cueT(X, 'slashSplit', 8.0);                                            // 8.0 s
  const catchB = (C.cuesOf(X, 'block')[0] || { b: bt(11.267) }).b;                       // 22.53
  const glassB = (C.cuesOf(X, 'glassShatter').slice(-1)[0] || { b: bt(16.35) }).b;       // 32.7
  const groan = bt(C.cueT(X, 'steelGroan', 17.4));                                        // 34.8
  const farT = shotsOf(X).map(e => e.t).filter(t => t > 18).sort((a, b) => a - b)[0];
  const far = bt(XT + (farT == null ? 21.5 : farT));                                      // 43
  const hitT = C.cueT(K, 'hitHuge', 3.62), hit = bt(hitT);                                // 27.62 s → 55.24
  const stopT = hitT - FRAME, stop = bt(stopT);                                           // the frame before the double punch
  const W = postEv(K, 'white'), wT = KT + (W ? W.t : 4.6), wIn = W && W.in ? W.in : 0.5, wEnd = KT + (W ? W.t + (W.dur || 1.9) : 6.5);
  const Bk = postEv(K, 'black'), fade0 = bt(KT + (Bk ? Bk.t : 16.4));
  const walkT = KT + evT(K, e => e.who === 'gojo' && e.do === 'walk', 8.0);
  // ---- Sukuna walks out of the smoke: heartbeat, his motif on the detuned bass, a low cluster, a whisper above
  heart(C, 0, face, 2, 0.5, 0.66);
  C.mel('dbass', 1, V.oct(SK.a, -1), 0.72, { cut: 360, drive: 1 });
  C.ch('strings', 0, NN('D2 Eb2 A2'), shing, 0.2, { att: 1.5, rel: 0.05, cut: 1000 });
  C.ch('strings', 4, NN('D4 Eb4'), shing - 4, 0.08, { att: 2, rel: 0.05, trem: 12, pont: 1 });
  // he faces Gojo: the heartbeat doubles, the cluster climbs, a shamisen sneer on the grin, a riser into the finger-gun
  heart(C, Math.round(face), shing, 1, 0.66, 0.9);
  C.ch('strings', face, NN('D3 Eb3'), shing - face, 0.2, { att: 1.2, rel: 0.05 });
  C.n('shamisen', grin, nm('Eb4'), 1, 0.55, { let: 1, bend: -1, bendAt: 0.16, bendDur: 0.34, pan: 0.2 });
  C.n('riser', face + 0.5, nm('D3'), shing - face - 0.5, 0.32, { from: 250, to: 5000, q: 2.5, tone: 1 });
  // ---- Dismantle: the music cuts on the hairline flash; the held breath until the tower slides
  C.silence(shing, bt(slideT));
  // ---- the slide: taiko ONLY — a free-time oroshi (strokes accelerating ×0.8 each, then a roll) into the catch
  const catchT = C.sec(catchB);
  let t = slideT, gap = 0.62, k = 0;
  for (; t < catchT - 0.5 && gap > 0.07; t += gap, gap *= 0.8, k++) tk(C, t, k % 2 ? 'do' : 'don', 0.72 + 0.3 * (t - slideT) / (catchT - slideT), { dec: 1.2 });
  for (; t < catchT - 0.04; t += 0.0625, k++) tk(C, t, 'do', 0.55 + 0.45 * (t - slideT) / (catchT - slideT));
  // ---- the catch: everything returns
  stab(C, catchB, 'hit', 1.0);
  C.n('dbass', catchB, nm('D1'), 1.5, 0.85, { cut: 300, rel: 0.4 });
  // ---- the flight up into the falling half: The Strongest in stretto — the two heads chase each other a beat apart,
  // rising a fourth at each entry — over the groove
  const F0 = Math.max(Math.ceil(catchB + 0.4), 24);                                      // 24
  const gh = V.frag(G.a, 0, 4), sh = V.frag(SK.a, 0, 4);
  C.level(F0 - 0.1, -1.5, 0.05);                              // a notch under the clash to come
  C.level(glassB, 0, 0.05);
  [[F0, 0], [F0 + 3, 5], [F0 + 6, 10]].forEach(([b, tr]) => {
    C.mel('glass', b, gh, 0.6, { vib: 10, rel: 0.3 }, tr);
    C.mel('strings', b + 1, sh, 0.55, { att: 0.04, rel: 0.25 }, tr);
    C.mel('strings', b + 1, sh, 0.25, { att: 0.04, rel: 0.25 }, tr + 12);
  });
  for (let bar = 0; F0 + 4 * bar < glassB - 1e-6; bar++) grooveBar(C, F0 + 4 * bar, 2 + (bar % 2), 0.78 + 0.03 * bar, glassB);
  for (let b = F0; b < glassB - 1e-6; b += 0.25) {
    const m = nm(['D6', 'A5', 'E6', 'A5'][Math.round((b - F0) * 4) % 4]);
    if (!C.clash(b, 0.25, m, ['glass', 'strings', 'dbass'])) C.n('koto', b, m, 0.25, Math.round(b * 4) % 2 ? 0.2 : 0.3, { pan: 0.35 });
  }
  // ---- into the glass: a stab — then the falling half: tension that carries through the cut into the office
  stab(C, glassB, 'hit', 1.0);
  C.ch('strings', glassB + 0.5, NN('D2 Eb2'), stop - glassB - 0.5, 0.2, { att: 2.5, rel: 0.02, trem: 9 });
  for (let b = Math.ceil(glassB + 1); b < stop - 0.2; b += (b < far ? 1 : b < K0 ? 0.5 : 0.25)) C.n('taiko', b, 0, 0.25, b < K0 ? 0.3 + 0.1 * (b - glassB) / (K0 - glassB) : 0.42 + 0.25 * (b - K0) / (stop - K0), { kind: 'ka' });
  for (let b = Math.ceil(groan); b < stop - 0.5; b += 1) C.n('dbass', b, nm('D1'), 0.5, 0.5 + 0.3 * (b - groan) / (stop - groan), { cut: 200, rel: 0.05 });
  C.n('taiko', far, 0, 1, 0.9, { kind: 'don' });
  // the tilting office: the cluster grows (A2 D3 E♭3 join), a riser lands on the stop
  C.ch('strings', K0, NN('A2 D3 Eb3'), stop - K0, 0.2, { att: 2.5, rel: 0.02, trem: 13 });
  C.n('riser', K0 + 1, nm('D3'), stop - K0 - 1.02, 0.5, { from: 200, to: 5000, q: 2.2, tone: 1 });
  // ---- the frame before the double punch: a hard stop (one frame of silence) …
  C.silence(stop, hit);
  if (FULL_MIX_SILENCE) { C.g('cut', stop, 0, 0.0012); C.g('cut', bt(hitT - 0.004), 1, 0.0008); }
  // … the colossal hit (the act's loudest moment: odaiko, cluster sforzando, sub drop, tam-tam). hitHuge ducks the music
  // bus 9 dB (the collapse 6 dB); this cue is lifted 6 dB through the hit so the accent still carries (net −3 dB), and a
  // second strike lands on the flattening (the cut outside)
  const colB = bt(C.cueT(K, 'collapse', 4.2));
  C.level(hit - 0.04, 6, 0.004);
  ARR.accent(C, hit, 'huge', 1);
  C.n('dbass', hit, nm('D1'), 2, 1.0, { cut: 300, rel: 0.8 });
  C.n('taiko', colB, 0, 1, 1.25, { kind: 'don' });
  C.ch('strings', colB, NN('D2 A2 D3'), 0.5, 0.8, { sfz: 1, rel: 1.2 });
  C.n('dbass', colB, nm('D1'), 2, 0.9, { cut: 260, rel: 0.8 });
  C.level(colB + 2.5, 0, 0.3);
  // ---- the white-out: ~1 s of silence — the mix drains during the second half of the white's fade-in, stays silent
  // while the frame is white, and hearing returns with the picture (and the director's tinnitus)
  const s0 = wT + wIn * 0.5, s0e = wT + wIn, s1 = wEnd - 0.12;
  C.silence(bt(s0e), bt(wEnd));
  if (FULL_MIX_SILENCE) { C.lin('cut', bt(s0), 1, bt(s0e), 0); C.lin('cut', bt(s1), 0, bt(wEnd + 0.1), 1); }
  // ---- the closing chord: the bare D–A fifth, and the opening's koto harmonic as they walk out of the dust
  const ch0 = bt(wEnd);
  C.level(ch0 - 0.25, -6);
  C.ch('strings', ch0, NN('D2 A2 D3 A3'), END - ch0, 0.3, { att: 2.5, rel: 1.5, cut: 1500 });
  C.ch('strings', ch0 + 2, NN('D4 A4'), END - ch0 - 2, 0.12, { att: 3, rel: 1.5, cut: 2400, n: 3 });
  C.n('sub', ch0, nm('D2'), END - ch0, 0.6, { att: 3, rel: 2 });
  C.ch('glass', ch0 + 3, NN('A4 D5'), END - ch0 - 3, 0.16, { att: 2.5, rel: 1.5, vib: 0 });
  C.n('koto', bt(walkT), nm('D6'), 1, 0.45, HARM({ t60: 4.5, pan: 0.1 }));
  C.fadeOut(fade0, END, -6);
  C.g('gate', END - 0.4, 0, 0.05);              // the act's end: tails out before Act II's silence (a2.signs reopens)
} });
})();
