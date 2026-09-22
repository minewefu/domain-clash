/* =====================================================================================================
   DOMAIN CLASH — Act IV "Adaptation" score (11:00–15:00)                   (src/audio/score_a4.js, classic script)
   Canon ch. 232–235. Mahoraga has adapted to Infinity: it cuts through it, and Gojo — pinned, cut, one-armed, three
   against one — smiles, because this is the fight he wanted. The act is scored from his side: every loss is marked
   (a silence, a bell), every recovery is joy (his theme, whole, at last), and the Black Flashes are its peaks.
   Materials: Gojo (D Lydian: glass, koto, the shakuhachi for the chanted Red), Sukuna (D Phrygian: low strings, detuned
   bass, shamisen, the rabbits' pizzicato), Mahoraga's wheel (the octatonic ostinato; Act III closed its circle on D, so
   it turns here on D F G♯ an octave up), and one new turn: at a4_arm the wheel moves a SEMITONE, onto Sukuna's ♭2
   (E♭ F♯ A — the other diminished chord of the same octatonic scale): the second adaptation, the one Sukuna will copy
   for the World-Cutting Slash (Act VI remembers it). Agito is a driven bass buzzing on that ♭2. The Blue left hanging
   in the sky is a fifth of pure tones (A6–E7) that waits there for Act V.
   Cues (film seconds; act seconds = film − 660). Every sync point is read from the scenes.
     a4.shadow   660–696  (a4_shadow → a4_smile) silence under the act card; the arms erupt (a low octatonic blow), the
                          drag; the wheel's hum on his face; the giant rises — nothing — the blade crosses the Infinity (its
                          glass ping, beating harshly: breached), then silence through the monitor room; back on the
                          street a low D; the watchers' dread (the ♭2 creeps in); he smiles: ONE koto harmonic (the snow's
                          note from Act I); every screen carries it: his fifths in the glass, swelling
     a4.palms    696–734  (a4_palms → a4_rabbits) he tears free: right, left, double palm = his head, one note per blow,
                          then the held breath; the chanted Red: a glass ring per glyph ring, his head on the shakuhachi
                          (augmented) over a drone; Sukuna sinks into the shadow (a bent ♭2); the red point grows (a
                          tremolo climbing into the blast); the eyes in his shadow (a low ♭2 sforzando-piano); Rabbit
                          Escape: a skittering pizzicato swarm in D Phrygian; he laughs (koto); the Red into his own
                          shadow: the music pulls out and the blast scatters the swarm (a spray of glass); the giant comes
                          (the wheel); he goes in after the shape; the giant smashes through the wall
     a4.corridor 734–756  the crash; a dry indoor pulse; the extinguisher bursts: the music is swallowed by the smoke (a
                          muffled tremolo, a thin high thread, a slow heart); the giant through the ceiling; the stance —
                          pressure rising in a pure beating tone; the beam; the impact frame — silence — the scored wall:
                          the loss (a low koto note, the ♭2 under D); his face: his theme darkened; two against one:
                          Sukuna's theme as he walks out of the smoke, the wheel's hum as the giant kneels
     a4.agito    756–776  out through the wall; they advance (the wheel, his drum); Agito: the beast's buzz, and at the
                          three-shot one low chord — the King small between two giants; Gojo grins (koto), Sukuna smirks
                          (shamisen); the rush, three on one; the point-blank Red, muffled — it barely turns its head —
                          everything stops; he looks up at the sky: Purple — the whole Lydian stack, very far away
     (a4_sit     776–788  no music: the monitoring room, room tone, Kashimo crackling)
     a4.agito2   788–828  (a4_agito2 → a4_arm) the giants close; Black Flash #2 (pulled out 0.1 s before, then the lifted
                          hit through the manga beat); the regrowth: an uncanny shimmer; the serpent's head torn off (a
                          stab) — it regrows too; the gravel held by the Infinity (glass); the hook, the swat, the hook;
                          breathing hard; Sukuna displeased; THE WHEEL TURNS A SEMITONE (E♭ F♯ A); the leap; the flying
                          slash — pulled out — one blow, then nothing as he falls; he lands: a temple bell (bonshō: all
                          things pass), his theme fragile on a solo koto, Sukuna content; the new wheel closes in; he runs
     a4.climb    828–852  up the glass face: a driving groove, his head climbing a step of the Lydian scale every bar; the
                          top; two blows; Agito's electric punch — pulled out — the Infinity stops it: it is back (his
                          glass, the whole Lydian chord blooming); he looks back at the beast: his theme, whole and sure
     a4.crush    852–876  the Blue round his fist: the Lydian stack gathering faster and faster — pulled out — the
                          implosion (a peak of the act); the Blue tears down the street (a great low chord, the drums
                          rolling); it lifts into the sky (a line rising to the star's note); silence; Sukuna uneasy
     a4.star     862–900  (layer, a4_crush 10.2 → a4_flash34) the small blue star: A6–E7, faint; brightening as he rises
     a4.flash    876–900  his arm grows back: his theme, whole and bright (exhilaration); Sukuna uneasy (his head, low,
                          unresolved); The Strongest at full drive — Black Flash #3 — the catch, the throw — Black Flash #4
                          (the act's climax; the blade's flat on the new wheel's root); the tower sinks (a cascade down his
                          scale); high above, Gojo rises toward the star: his head, slow and climbing; fade
   Loudness: AU.LEVELS adaptation 0 · agito +1 · collapse +1; Black Flashes #2–#4 and the implosion are lifted to be the
   act's peaks, below the Act V Purple. Measured (M4, tools/audio-lab.js): −19.7 LUFS integrated; momentary maxima (400 ms,
   25 ms hop) Black Flash #4 −11.6, the implosion −11.8, #2 −12.1, #3 −12.4, everything else ≤ −13.1 (the Purple: −10.0).
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, ARR, LEVELS: LV, BEAT, MODES } = AU;
const G = TH.gojo, SK = TH.sukuna, MA = TH.mahoraga;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;
// density trims (dB on top of AU.LEVELS) and the Black Flash / implosion lifts (dB), set from tools/audio-lab.js
const TRIM = { shadow: 2, palms: 4, corridor: 4, agito: 3, agito2: 3.5, climb: 3, crush: 2.5, star: 0, flash: 2.5 };
const LIFT = { bf2: 5.5, crush: 4, bf3: 5.5, bf4: 8 };

// ------------------------------------------------------------------ the director's scene data (as score_a1–a3.js)
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const fxOf = id => { const s = SCN(id); return (s && s.C && s.C.fx) || []; };
const postOf = id => { const s = SCN(id); return (s && s.C && s.C.post) || []; };
const shotT = (id, name, def, i) => { const e = shotsOf(id).filter(x => x.shot === name)[i || 0]; return e ? e.t : def; };
const shotAfter = (id, name, tMin, def) => { const e = shotsOf(id).filter(x => x.shot === name && x.t > tMin).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const fxT = (id, name, def, i) => { const e = fxOf(id).filter(x => x.fx === name).sort((a, b) => a.t - b.t)[i || 0]; return e ? e.t : def; };
const evT = (id, pred, def) => { const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t); return L.length ? L[0].t : def; };
const nthCue = (C, id, names, i, def) => { const L = C.cuesOf(id, names); return L[i] ? L[i].t : C.sceneT(id) + def; };   // s from the cue start
const lastCue = (C, id, name, def) => { const L = C.cuesOf(id, name); return L.length ? L[L.length - 1].t : C.sceneT(id) + def; };
const q16 = b => Math.ceil(b * 4 - 1e-6) / 4;

// ------------------------------------------------------------------ figures
const W4 = MA.wheel(4);                       // D4 F4 G♯4: the circle Act III closed
const WEB = NN('Eb4 F#4 A4');                 // the second adaptation: the other diminished chord, rooted on the ♭2
function wheelBar(C, b, w, v, first) {        // one bar of the ostinato (3+3+2, 16th steps 0 6 12)
  MA.steps.forEach((s, j) => {
    C.n('clunk', b + s * 0.25, w[j], 1, (j === 0 && first != null ? first : 0.8) * v, { t60: 1.4 });
    C.n('dbass', b + s * 0.25, w[j] - 12, 0.7, 0.7 * v, { cut: 360 });
  });
  '..x.x...x.x...x.'.split('').forEach((c, i) => { if (c === 'x') C.n('shime', b + i * 0.25, 0, 0.25, 0.4 * v, { kind: 'ka' }); });
  C.ch('strings', b, [w[0] - 12, w[2] - 12], 4, 0.18 * v, { att: 0.3, rel: 0.6, pont: 1 });
}
function wheelHum(C, b, len, w, v) {          // its outer tritone, two beating pure tones
  if (!(len > 0.5)) return;
  C.ch('tone', b, [w[0] - 12, w[2] - 12], len, v, { att: Math.min(1.5, len * 0.3), rel: 1.2, beat0: 0.4, beat1: 0.9, oct: 0.2 });
}
function heart(C, b0, b1, per, v0, v1) {      // lub-dub (0.375 s apart) every `per` beats
  for (let b = b0; b < b1 - 1e-6; b += per) {
    const v = v0 + (v1 - v0) * (b - b0) / Math.max(1e-6, b1 - b0);
    C.n('taiko', b, 0, 0.5, v, { kind: 'don', dec: 1.1 });
    C.n('taiko', b + 0.75, 0, 0.5, v * 0.62, { kind: 'do' });
  }
}
// the music catches the hits lightly (the SFX carry the thump; measured in Act III): 'phr' · 'lyd' · 'both'
const STAB = 0.85;
function stab(C, b, kind, v) {
  v *= STAB;
  C.n('taiko', b, 0, 1, 0.8 * v, { kind: 'don' });
  const ch = kind === 'lyd' ? 'D2 A2 E3' : kind === 'both' ? 'D2 Eb2 A2 G#3' : 'D2 A2 Eb3';
  C.ch('strings', b, NN(ch), 0.5, 0.8 * v, { sfz: 1, rel: 0.6 });
  if (kind === 'lyd') ARR.accent(C, b, 'inf', 0.8 * v);
}
// pull the music out `s` seconds before a hit (the gate reopens 2 ms before it with a 2 ms time constant)
function pullOut(C, b, s) { const pre = b - bt(s); C.hole(pre, b); C.g('gate', pre, 0, 0.004); C.g('gate', b - bt(0.002), 1, 0.002); }
// a Black Flash: pulled out 0.1 s before the contact, the hit lifted; its weight is sustained mid-range (the SFX own the
// crack and the sub: doubling them only makes the limiter pull the hit down — measured, M3)
function blackFlash(C, bf, lift, v) {
  pullOut(C, bf, 0.1);
  C.level(bf - 0.05, lift, 0.004);
  C.ch('strings', bf, NN('A2 D3 Eb3 G#3 D4 Eb4'), 0.5, 1.4 * v, { sfz: 1, rel: 1.4 });
  C.ch('glass', bf, NN('D6 G#6 A6 D7'), 1, 0.9 * v, { arp: 1, t60: 1.6 });
  C.n('shamisen', bf, nm('D3'), 0.5, 1.3 * v, { pan: 0.2, buzz: 3.2 });
  C.n('tamtam', bf, 0, 1, 1.3 * v, { dec: 5 });
  C.levelRamp(bf + 1, bf + 2.2, lift, 0);
}
// a groove over [b0, b1) from 16-step patterns (ARR.TAIKO letters) with an 8th-note bass line (null = rest)
function groove(C, b0, b1, pats, shis, bass, v) {
  for (let b = b0; b < b1 - 1e-6; b += 0.25) {
    const i = Math.round((b - b0) * 4), bar = Math.floor(i / 16), k = i % 16;
    const c = ARR.TAIKO[pats[bar % pats.length][k]]; if (c) C.n(c[0], b, 0, 0.25, v * c[2], c[3]);
    const d = ARR.TAIKO[shis[bar % shis.length][k]]; if (d) C.n(d[0], b, 0, 0.25, v * 0.75 * d[2], d[3]);
    if (bass && k % 2 === 0) { const n = bass[bar % bass.length][k / 2]; if (n && !C.clash(b, 0.45, nm(n), ['glass', 'strings'])) C.n('dbass', b, nm(n), 0.45, (k % 8 === 0 ? 0.92 : 0.7) * v / 0.8, { cut: 420, drive: 1 }); }
  }
}
const DRIVE = ['DdDdDdDdDdDdDdDd'], DRIVE_S = ['ssSsssSsssSsssSs'];
const BLUE = ['D.ddD.dkD.ddD.dk', 'D.ddD.dkD.dd.kdd'], BLUE_S = ['s.s.S.s.s.s.S.s.', 's.s.S.s.s.s.S.ss'];
const SUKU = ['D..d..D.k.d.D.d.', 'D..d.dD.k.ddD.k.'], SUKU_S = ['..s...s...s.s...', 's.s...s.s.s...s.'];
const B_LYD = [['D2', 'D2', 'A1', 'D2', 'D2', 'A1', 'E2', 'D2'], ['D2', 'D2', 'A1', 'D2', 'E2', 'D2', 'A1', 'A1']];
const B_PHR = [['D2', null, 'D2', 'Eb2', 'D2', null, 'C2', 'D2'], ['A1', 'A1', 'Bb1', 'A1', 'D2', 'D2', 'Eb2', 'D2']];
const GOJO_DARK = V.remap(G.a, 'lydian', 'phrygian', nm('D4'));
const STACK_HI = NN('D5 A5 E6 B6 F#6 C#7 G#7');
const STACK_FULL = NN('D4 A4 E5 B5 F#6 C#7 G#7');   // the D Lydian stack of fifths, all of it: "Purple" (Act V)
const HARM = o => Object.assign({ let: 1, pick: 0.24, bright: 0.4, t60: 4.2 }, o || {});   // koto harmonic (score_a1.js)
// diatonic transposition inside D Lydian (the climb's sequence stays in Gojo's mode)
const LYD = MODES.lydian;
const dtr = (ns, k) => ns.map(([b, m, l]) => {
  const rel = m - nm('D4'), oc = Math.floor(rel / 12), i = LYD.indexOf(rel - 12 * oc);
  if (i < 0) return [b, m, l];
  const d = i + k, o2 = oc + Math.floor(d / 7);
  return [b, nm('D4') + 12 * o2 + LYD[((d % 7) + 7) % 7], l];
});

// ====================================================================================== 1–2. a4_shadow → a4_smile
HT.music.cue({ id: 'a4.shadow', from: 'a4_shadow', to: 'a4_smile', level: LV.adaptation + TRIM.shadow, fn: C => {
  const S = 'a4_shadow', M = 'a4_smile', M0 = C.sceneT(M), END = C.endBeat;
  const arms = bt(C.cueT(S, 'hitM', 6.56)), kneel = bt(C.cueT(S, 'bodyFall', 7.9)), close = bt(shotT(S, 'closeup', 9.3));
  const rise = bt(fxT(S, 'a4emerge', 10.4)), cut = bt(C.cueT(S, 'impactFrame', 11.27));
  const back = bt(shotAfter(S, 'static', 17, 17.2));
  const smile = bt(C.cueT(M, 'sixEyes', 6.6)), room2 = bt(M0 + shotAfter(M, 'static', 8, 9.0));
  // 0 → the arms: silence (the act card's clappers, the wheel spinning on the asphalt, a heartbeat); a3.adapt closed the
  // music gate on the black — reopen it just before the first note
  C.g('gate', arms - 0.5, 1, 0.02);
  // ---- the arms erupt from his shadow and clamp him: a low octatonic blow, then the drag down
  C.n('taiko', arms, 0, 1, 0.8, { kind: 'don' });
  C.ch('strings', arms, NN('D2 Eb2 G#2'), 0.5, 0.75, { sfz: 1, rel: 0.8 });
  C.n('dbass', arms, nm('D1'), 1.5, 0.7, { cut: 240, rel: 0.5 });
  C.ch('strings', arms + 0.5, NN('D2 G#2'), close - arms, 0.2, { att: 0.6, rel: 0.4, trem: 11 });
  C.n('taiko', kneel, 0, 0.5, 0.55, { kind: 'do' });
  // ---- his face (close): the wheel's hum under the ink
  wheelHum(C, close, rise - close + 1, W4, 0.4);
  // ---- the giant rises behind him: its first step … and nothing, until the blade crosses the Infinity
  C.n('clunk', rise, nm('D3'), 1, 0.6, { t60: 1.2 });
  C.hole(cut - 0.8, cut);
  // the cut: the Infinity's glass, breached — a ping whose partner beats fast and harsh; then silence to the street
  C.n('tone', cut, nm('A6'), 1.2, 0.5, { att: 0.005, rel: 0.4, beat0: 9, beat1: 23, oct: 0 });
  C.n('glass', cut, nm('D7'), 0.5, 0.22, { arp: 1, t60: 0.5 });
  C.n('clunk', cut, nm('D2'), 1, 0.6, { t60: 1.6 });
  C.silence(cut + 1.4, back);
  // ---- back on the street: the breath at the end — a low D, the giant over him
  C.n('sub', back, nm('D2'), END - back, 0.5, { att: 2.5, rel: 1.5 });
  C.ch('strings', back + 1, NN('D2 A2'), smile - back - 1, 0.13, { att: 2.5, rel: 1.5, cut: 900 });
  // ---- the watchers' dread (a4_smile): the ♭2 creeps under the fifth — nobody moves
  C.n('strings', bt(M0) + 1, nm('Eb2'), smile - bt(M0) - 1, 0.1, { att: 3, rel: 0.8, cut: 700 });
  // ---- on the feed he raises his head … and smiles: one koto harmonic (the snow's note, Act I)
  C.n('koto', smile, nm('D6'), 1, 0.5, HARM({ pan: 0.05 }));
  // ---- every screen carries that smile: his fifths in the glass, very softly, swelling into a4_palms
  C.ch('glass', room2, NN('D5 A5 E6'), END - room2, 0.1, { att: 3, rel: 0.2, vib: 0 });
  C.n('tone', room2 + 2, nm('G#6'), END - room2 - 2, 0.2, { att: 2.5, rel: 0.2, beat0: 0.2, beat1: 0.8, oct: 0 });
  C.levelRamp(room2, END, 0, 3);
} });

// ====================================================================================== 3–4. a4_palms → a4_rabbits
HT.music.cue({ id: 'a4.palms', from: 'a4_palms', to: 'a4_rabbits', level: LV.adaptation + TRIM.palms, fn: C => {
  const P = 'a4_palms', R = 'a4_rabbits', R0 = C.sceneT(R), END = C.endBeat;
  const free = bt(C.cueT(P, 'whooshM', 1.95)), hits = C.cuesOf(P, ['hitM', 'hitH']).filter(c => c.t < 5);
  const chant = bt(evT(P, e => e.who === 'gojo' && e.pose === 'a4Chant', 9.0));
  const gr = fxOf(P).find(e => e.fx === 'glyphRings') || { t: 9.35, rings: 3, stagger: 0.55 };
  const rings = Array.from({ length: gr.rings || 3 }, (_, i) => bt(gr.t + i * (gr.stagger || 0.5)));
  const sink = bt(C.cueT(P, 'shadowRise', 12.3)), redT = bt(fxT(P, 'redOrb', 13.2)), eyes = bt(fxT(P, 'a4eyes', 16.6));
  const swarm = bt(R0 + fxT(R, 'rabbitSwarm', 1.8)), amused = bt(R0 + shotT(R, 'closeup', 6.0)), blast = bt(C.cueT(R, 'redBlast', 7.8));
  const dash = bt(nthCue(C, R, 'wallCrash', 0, 8.23)), maho0 = bt(nthCue(C, R, 'mahoStep', 0, 11.067));
  const look = bt(R0 + evT(R, e => e.who === 'gojo' && e.pose === 'lookDown', 13.5)), go = bt(C.cueT(R, 'whooshM', 16.5)), crash = bt(lastCue(C, R, 'wallCrash', 19.4));
  // ---- on his knees in the ink, the low D still hanging … he tears free: a bright upward rush
  C.n('sub', 0, nm('D2'), free, 0.45, { att: 0.3, rel: 0.3 });
  NN('D5 E5 F#5 A5 B5 D6').forEach((m, i) => C.n('glass', free - 0.5 + i * 0.1, m, 0.25, 0.3, { arp: 1, t60: 0.5, pan: -0.3 + 0.1 * i }));
  C.n('taiko', free, 0, 0.5, 0.7, { kind: 'do' });
  // ---- right, left, double palm (three beats, then the held breath): his head, one note per blow; the last turns
  // ♯4 → 5 (the Lydian turn) as the giant skids away
  const HEAD = [[nm('D5'), 'lyd', 0.9], [nm('A5'), 'lyd', 0.95], [nm('G#5'), 'both', 1.1]];
  hits.slice(0, 3).forEach((h, i) => { stab(C, h.b, HEAD[i][1], HEAD[i][2]); C.n('glass', h.b, HEAD[i][0], i === 2 ? 1 : 0.5, 0.5, { vib: 0, rel: i === 2 ? 0.2 : 0.3 }); });
  const last = hits.length ? hits[Math.min(2, hits.length - 1)].b : bt(3.52);
  C.n('glass', last + 1, nm('A5'), 3, 0.35, { vib: 6, rel: 1.5 });
  C.ch('strings', last, NN('D3 A3 E4'), 4, 0.25, { att: 0.05, rel: 2 });
  // ---- the held breath (dust) … the incantation of Red: a ring of glass per glyph ring, the chant on the shakuhachi
  // (his head, augmented, low), a drone
  rings.forEach((b, i) => C.n('glass', b, NN('D5 A5 E6')[i % 3], 1, 0.3, { arp: 1, t60: 2.2, pan: [-0.3, 0.3, 0][i % 3] }));
  C.n('sub', chant, nm('D2'), bt(R0) + 2 - chant, 0.45, { att: 2, rel: 1 });
  C.ch('strings', chant, NN('D3 A3'), bt(R0) + 2 - chant, 0.14, { att: 2.5, rel: 1 });
  C.mel('shaku', rings[0] + 0.5, V.oct(V.aug(G.a, 2), -1), 0.55, { breath: 0.6 });
  // Sukuna sinks into his own shadow (unseen): his ♭2, bent, far away
  C.n('shamisen', sink, nm('Eb3'), 0.5, 0.3, { pan: 0.6, bend: -1, bendAt: 0.15, bendDur: 0.3 });
  // the red point at his fingertip: a tremolo climbing under the chant, into the blast
  C.ch('strings', redT, NN('A3 E4'), blast - redT - bt(0.1), 0.12, { att: 3, rel: 0.05, trem: 13 });
  // two red eyes open in his shadow: the ♭2 under the drone, sforzando-piano
  C.ch('strings', eyes, NN('D2 Eb2'), 3, 0.25, { sfz: 1, rel: 1.2 });
  C.n('dbass', eyes, nm('Eb1'), 2, 0.4, { cut: 200, rel: 0.6 });
  // ---- Rabbit Escape: hundreds of rabbits pour out of his shadow — a skittering pizzicato swarm (seeded), D Phrygian
  const PHR = NN('D4 Eb4 F4 G4 A4 Bb4 C5 D5 Eb5 F5 G5 A5');
  for (let b = swarm; b < blast - 0.25; b += 0.125) {
    const u = (b - swarm) / Math.max(1, blast - swarm), dens = 0.35 + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.4));
    if (C.rng() < dens) C.n('pizz', b, PHR[Math.floor(C.rng() * PHR.length)], 0.25, 0.35 + 0.25 * C.rng(), { pan: C.rng() * 1.6 - 0.8, cut: 3200 });
  }
  // he is amused: his laugh, quick, on the koto
  NN('A5 B5 C#6 D6 E6').forEach((m, i) => C.n('koto', amused + i * 0.125, m, 0.25, 0.28, { pan: -0.2 }));
  // Red into his own shadow: the music pulls out, and the blast scatters the swarm (a spray of glass, falling away)
  pullOut(C, blast, 0.1);
  stab(C, blast, 'lyd', 1.0);
  for (let i = 0; i < 16; i++) C.n('glass', blast + 0.1 + i * 0.09 + C.rng() * 0.05, STACK_HI[i % 7] - 12 * Math.floor(i / 8), 0.25, 0.3 - 0.012 * i, { arp: 1, t60: 0.5, pan: C.rng() * 1.8 - 0.9 });
  C.n('taiko', dash, 0, 0.5, 0.6, { kind: 'do' });
  // ---- he floats over the pit; the giant comes: the wheel, low and slow; he looks down
  for (let b = q16(maho0), i = 0; b + 4 <= crash + 1e-6; b += 4, i++) wheelBar(C, b, W4, 0.5 + 0.1 * i);
  C.mel('glass', look, V.frag(G.a, 0, 3), 0.3, { vib: 6, rel: 0.5 });
  // ---- he goes in after the dark shape; the giant smashes through the wall behind them
  NN('D4 A4 D5 E5 A5').forEach((m, i) => C.n('glass', go + i * 0.1, m, 0.25, 0.3, { arp: 1, t60: 0.4, pan: 0.3 }));
  stab(C, crash, 'phr', 1.0);
} });

// ====================================================================================== 5. a4_corridor
HT.music.cue({ id: 'a4.corridor', from: 'a4_corridor', to: 'a4_corridor', level: LV.adaptation + TRIM.corridor, fn: C => {
  const S = 'a4_corridor', END = C.endBeat;
  const crash = bt(C.cueT(S, 'wallCrash', 0.3)), rip = bt(C.cueT(S, 'clothSnap', 2.75)), burst = bt(C.cueT(S, ['extinguisherBurst', 'infinityStop'], 3.95));
  const land = bt(C.cueT(S, 'groundSlam', 8.08)), blockT = bt(C.cueT(S, 'swordRing', 8.18));
  const stance = bt(evT(S, e => e.who === 'sukuna' && e.do === 'a4PbFire', 9.45)), fire = bt(C.cueT(S, 'waterJet', 10.62));
  const hitT = bt(C.cueT(S, 'hitH', 10.92)), wall = bt(C.cueT(S, ['waterSpray', 'shing'], 10.98)), face = bt(shotT(S, 'closeup', 12.3));
  const slash = bt(C.cueT(S, 'mahoSlash', 14.62)), walk = bt(evT(S, e => e.who === 'sukuna' && e.do === 'walk', 16.2));
  const kneel = bt(evT(S, e => e.who === 'maho' && e.pose === 'maho_kneel', 18.5));
  // ---- they crash into the building: a blow, then an indoor pulse — dry and muted (a corridor: Sukuna's ground)
  stab(C, crash, 'phr', 0.9);
  const P0 = Math.ceil(crash + 1);
  for (let b = P0; b < burst - 0.25; b += 0.5) {
    C.n('taiko', b, 0, 0.25, (b % 1) ? 0.22 : 0.32, { kind: (b % 1) ? 'ka' : 'do', dec: 0.3 });
    C.n('dbass', b, nm(['D2', 'D2', 'Eb2', 'D2'][Math.round((b - P0) * 2) % 4]), 0.4, 0.45, { cut: 300 });
  }
  // he rips the extinguisher off the wall: his rub on the shamisen
  C.n('shamisen', rip, nm('Eb3'), 0.25, 0.5, { pan: 0.3 });
  // ---- it bursts on the Infinity: white-out — the music is swallowed by the smoke (a muffled tremolo, a thin high
  // thread, a slow heart)
  C.silence(burst, burst + 1);
  C.ch('strings', burst + 1, NN('D3 Eb3'), land - burst - 1, 0.14, { att: 1.5, rel: 0.2, trem: 7, cut: 600 });
  C.n('strings', burst + 1, nm('A5'), land - burst - 1, 0.06, { att: 2, rel: 0.2, pont: 1, trem: 14 });
  heart(C, Math.ceil(burst + 1.5), land - 1, 2, 0.3, 0.45);
  // ---- Mahoraga drops through the ceiling: the wheel's clunk; the blade on his arms
  C.n('clunk', land, nm('D2'), 1, 0.9, { t60: 1.4 }); stab(C, land, 'both', 0.9);
  C.ch('strings', blockT, NN('D4 G#4'), 0.5, 0.35, { sfz: 1, rel: 0.4 });
  // ---- at the far end, the stance: pressure — a pure tone beating faster and faster, the strings creeping
  C.n('tone', stance, nm('Eb6'), fire - stance - bt(0.08), 0.35, { att: 0.3, rel: 0.02, beat0: 0.5, beat1: 12, oct: 0.1 });
  C.ch('strings', stance, NN('D3 Eb3 A3'), fire - stance - bt(0.08), 0.18, { att: 0.8, rel: 0.05, trem: 16 });
  C.hole(fire - bt(0.08), fire);
  // the beam: one needle of sound
  C.n('glass', fire, nm('Eb7'), 0.6, 0.3, { vib: 0, att: 0.005, rel: 0.1 });
  // the impact frame … silence … the scored wall: the loss (a low koto note, the ♭2 under D)
  C.silence(hitT - bt(0.02), wall + 0.3);
  C.n('koto', wall + 0.3, nm('D3'), 1, 0.5, { let: 1, t60: 3.5 });
  C.ch('strings', wall + 0.3, NN('D2 Eb2'), face - wall + 2, 0.16, { att: 0.3, rel: 1.5, cut: 700 });
  // his face: his theme, darkened (Phrygian), slow
  C.mel('glass', face, V.aug(V.frag(GOJO_DARK, 0, 4), 1.5), 0.26, { vib: 4, rel: 0.8 });
  // ---- the blade again; he slips aside
  stab(C, slash, 'phr', 0.7);
  // ---- two against one: Sukuna walks out of the smoke — his theme, low; a slow heart; the giant kneels beside him
  C.mel('strings', walk, SK.a, 0.4, { att: 0.12, rel: 0.6 });
  C.mel('dbass', walk, V.oct(SK.a, -1), 0.55, { cut: 320, drive: 1 });
  heart(C, Math.ceil(walk), END - 1, 2, 0.35, 0.5);
  wheelHum(C, kneel, END - kneel, W4, 0.3);
} });

// ====================================================================================== 6. a4_agito
HT.music.cue({ id: 'a4.agito', from: 'a4_agito', to: 'a4_agito', level: LV.agito + TRIM.agito, fn: C => {
  const S = 'a4_agito', END = C.endBeat;
  const burst = bt(C.cueT(S, 'wallCrash', 0.25)), adv = bt(evT(S, e => e.who === 'sukuna' && e.do === 'walk', 2.4));
  const summon = bt(fxT(S, 'a4emerge', 3.5)), three = bt(shotAfter(S, 'static', 4.5, 4.8));
  const grin = bt(shotT(S, 'closeup', 8.0)), smirk = bt(shotT(S, 'closeup', 9.3, 1)), rush = bt(shotAfter(S, 'static', 9.9, 10.0));
  const jet = bt(C.cueT(S, 'waterJet', 11.72)), down = bt(lastCue(C, S, 'groundSlam', 12.45)), red = bt(C.cueT(S, 'redBlast', 13.7));
  const look = bt(evT(S, e => e.who === 'maho' && e.pose === 'maho_look', 14.9)), sky = bt(shotT(S, 'closeup', 16.4, 2)), glint = bt(fxT(S, 'a4glint', 19.0));
  // ---- out through the wall onto the street: a blow; he lands and grips his arm (RCT)
  stab(C, burst, 'lyd', 0.9);
  // ---- Sukuna and the giant advance: the wheel and his slow drum
  wheelBar(C, q16(adv), W4, 0.7);
  C.n('taiko', q16(adv), 0, 1, 0.6, { kind: 'don', dec: 1.5 });
  // ---- Agito rises out of his shadow: the beast — a driven bass buzzing on the ♭2 — and at the three-shot ONE low
  // chord: the King small between two giants
  for (let b = q16(summon); b < grin - 1e-6; b += 0.25) C.n('dbass', b, nm('Eb2'), 0.2, 0.25 + 0.2 * ((b * 4) % 2), { cut: 900, drive: 2 });
  C.ch('strings', three, NN('D2 Eb2 G#2 A2'), grin - three, 0.3, { att: 0.5, rel: 1, trem: 6 });
  C.n('dbass', three, nm('D1'), grin - three, 0.6, { cut: 200, rel: 1 });
  C.n('tamtam', three, 0, 1, 0.5, { dec: 5 });
  C.n('taiko', three, 0, 1, 0.9, { kind: 'don', dec: 2 });
  // ---- Gojo grins ("a little lost alien"): his laugh on the koto; Sukuna smirks: his sigh on the shamisen
  NN('D5 E5 F#5 G#5 A5 D6').forEach((m, i) => C.n('koto', grin + 0.5 + i * 0.125, m, 0.25, 0.3, { pan: -0.3 }));
  C.n('koto', grin + 1.3, nm('A5'), 1, 0.3, { let: 1, t60: 2 });
  C.n('shamisen', smirk + 0.3, nm('Eb4'), 0.5, 0.45, { pan: 0.3, bend: -1, bendAt: 0.1, bendDur: 0.25 });
  // ---- the rush, three on one: his groove, the wheel, the beast's buzz; Gojo's head in pieces over it
  groove(C, rush, red, SUKU, SUKU_S, B_PHR, 0.72);
  for (let b = rush; b + 4 <= red + 1e-6; b += 4) wheelBar(C, b, W4, 0.6);
  for (let b = rush; b < red - 1e-6; b += 0.25) C.n('dbass', b + 0.125, nm('Eb3'), 0.1, 0.18, { cut: 1200, drive: 2 });
  C.mel('glass', rush + 0.5, V.frag(G.a, 0, 4), 0.45, { vib: 6, rel: 0.25 });
  C.n('tone', jet, nm('Eb7'), 0.4, 0.3, { att: 0.005, rel: 0.08, beat0: 3, beat1: 9, oct: 0 });   // the water beam: a sway
  stab(C, down, 'lyd', 0.9);
  // the Red to Mahoraga's head, point-blank — muffled: it barely turns its head — and everything stops
  C.n('taiko', red, 0, 0.5, 0.5, { kind: 'do' });
  C.ch('strings', red, NN('D3 A3 E4'), 0.5, 0.5, { sfz: 1, rel: 0.3, cut: 900 });
  C.silence(red + 0.25, look);
  wheelHum(C, look, sky - look, W4, 0.35);
  // ---- he looks up at the sky: Purple — the Lydian stack of fifths, all of it, very far away
  C.n('sub', sky, nm('D2'), END - sky, 0.4, { att: 2, rel: 0.3 });
  STACK_FULL.forEach((m, i) => { const b = sky + 1 + i * (glint - sky - 1) / STACK_FULL.length; C.n('glass', b, m, END - b, 0.08 + 0.01 * i, { vib: 0, att: 0.5, rel: 0.2 }); });
  C.n('tone', glint, nm('G#6'), END - glint, 0.25, { att: 0.3, rel: 0.1, beat0: 0.3, beat1: 1.5, oct: 0 });
  C.fadeOut(END - 1, END);
  // the monitoring room (a4_sit) has no music: close the gate slowly after the fade (it also takes the reverb and delay
  // tails) and reopen it just before a4_agito2
  const SIT = bt(12);
  C.g('gate', END + 0.5, 0, 0.2); C.g('gate', END + SIT - 0.2, 1, 0.02);
} });

// ====================================================================================== 8–9. a4_agito2 → a4_arm
HT.music.cue({ id: 'a4.agito2', from: 'a4_agito2', to: 'a4_arm', level: LV.agito + TRIM.agito2, fn: C => {
  const S = 'a4_agito2', A = 'a4_arm', A0 = C.sceneT(A), END = C.endBeat;
  const grab = bt(evT(S, e => e.who === 'agito' && e.do === 'a4AgitoGrab', 2.75)), bf = bt(C.cueT(S, 'blackFlash', 3.95));
  const regrow = bt(nthCue(C, S, 'rctHeal', 0, 6.1)), tear = bt(C.cueT(S, ['rip', 'hitM'], 9.1)), regrow2 = bt(nthCue(C, S, 'rctHeal', 1, 10.6));
  const act0 = bt(shotAfter(S, 'static', 12, 12.6)), halt = bt(C.cueT(S, 'infinityStop', 13.45));
  const hook1 = (C.cuesOf(S, 'hitM').filter(c => c.t > 14 - 0.001)[0] || { b: bt(14.528) }).b, swat = bt(C.cueT(S, 'sparkPop', 15.1)), hook2 = bt(lastCue(C, S, 'hitH', 15.65));
  const breath = bt(shotAfter(S, 'static', 16, 16.6)), watch = bt(shotT(S, 'closeup', 19.4));
  const turn = bt(C.cueT(A, 'wheelClunk', 4.55)), leap = bt(C.cueT(A, 'whooshL', 6.35)), slash = bt(C.cueT(A, 'dismantle', 7.27));
  const landT = bt(C.cueT(A, 'bodyFall', 9.05)), grip = bt(A0 + shotT(A, 'medium', 11.2)), content = bt(A0 + shotT(A, 'closeup', 13.2, 2));
  const close = bt(A0 + shotAfter(A, 'static', 15, 15.2)), dash = bt(C.cueT(A, 'dashAir', 16.3));
  // ---- the giants close on him: the wheel and the beast's tread, a tremolo tightening; the grab, the downward cut
  wheelBar(C, 0, W4, 0.6); wheelBar(C, 4, W4, 0.7);
  C.ch('strings', 0, NN('D3 Eb3 G#3'), grab, 0.15, { att: 1.5, rel: 0.1, trem: 12 });
  C.n('riser', grab - 1, nm('D3'), bf - bt(0.1) - grab + 1, 0.35, { from: 250, to: 5000, q: 2.4, tone: 1 });
  // ---- BLACK FLASH #2 through Agito's middle
  blackFlash(C, bf, LIFT.bf2, 1.0);
  // ---- the beast regrows: an uncanny shimmer — his mode rising in the glass over tones beating faster
  const shimmer = (b, n) => {
    NN('D5 Eb5 F5 G5 A5 Bb5 C6 D6 Eb6 F6').slice(0, n).forEach((m, i) => C.n('glass', b + i * 0.25, m, 0.5, 0.12 + 0.012 * i, { arp: 1, t60: 1.2, pan: -0.4 + 0.08 * i }));
    C.ch('tone', b, NN('D5 Eb5'), n * 0.25 + 1, 0.2, { att: 0.4, rel: 0.6, beat0: 0.5, beat1: 7, oct: 0 });
  };
  shimmer(regrow, 10);
  // the tail lashes; he tears the serpent's head off: a stab — and it regrows too
  stab(C, tear, 'lyd', 0.9);
  shimmer(regrow2, 7);
  // ---- the giant cuts the road and flings gravel: the Infinity holds it in the air; the hook, the swat, the hook
  groove(C, q16(act0), hook2 + 0.5, BLUE, BLUE_S, B_LYD, 0.55);
  ARR.accent(C, halt, 'inf', 1.0);
  stab(C, hook1, 'lyd', 0.7);
  C.n('glass', swat, nm('E6'), 0.25, 0.25, { arp: 1, t60: 0.3, pan: -0.3 });
  stab(C, hook2, 'lyd', 0.9);
  // ---- breathing hard between the giants; up on the kerb Sukuna watches, not pleased
  C.ch('strings', breath, NN('D3 A3'), watch - breath, 0.14, { att: 1, rel: 0.5 });
  C.mel('strings', watch, V.frag(SK.a, 0, 4), 0.38, { att: 0.1, rel: 0.5 });
  C.mel('dbass', watch, V.oct(V.frag(SK.a, 0, 4), -1), 0.5, { cut: 300, drive: 1 });
  // ======== a4_arm: displeased (his head, low) … the wheel turns again — the second adaptation: the ostinato leaves the
  // circle it closed and lands a semitone up, on his ♭2 (E♭ F♯ A): the Divine General is his shadow now
  C.ch('strings', bt(A0), NN('D2 Eb2'), turn - bt(A0), 0.12, { att: 1.5, rel: 0.3, cut: 800 });
  wheelBar(C, turn, WEB, 1.1, 0.4);
  C.ch('strings', turn, NN('Eb2 A2'), 4, 0.3, { att: 0.1, rel: 1 });
  C.n('dbass', turn, nm('Eb1'), 3, 0.7, { cut: 220, rel: 0.8 });
  // the beast charges, he leaps: an upward rush … the flying slash — pulled out — one blow, then nothing as he falls
  NN('D4 A4 E5 B5 F#6 C#7').forEach((m, i) => C.n('glass', leap + i * 0.12, m, 0.25, 0.26, { arp: 1, t60: 0.4, pan: -0.2 + 0.08 * i }));
  pullOut(C, slash, 0.15);
  C.n('taiko', slash, 0, 1, 0.9, { kind: 'don' });
  C.ch('strings', slash, NN('Eb2 A2 Eb3 A3'), 0.5, 0.85, { sfz: 1, rel: 0.6 });
  C.silence(slash + 0.5, landT);
  // he lands hard: the loss — a temple bell (bonshō: all things pass), the ♭2 under D
  C.n('bonsho', landT + 0.5, nm('D2'), 4, 0.45, { t60: 16 });
  C.ch('strings', landT, NN('D2 Eb2'), grip - landT + 4, 0.14, { att: 1, rel: 1.5, cut: 700 });
  // gripping the stump: his theme, fragile, on a solo koto (as in the wheel's darkness, Act II)
  C.mel('koto', grip + 0.5, V.frag(G.a, 0, 4), 0.35, { let: 1, t60: 2.5, pan: -0.1 });
  // Sukuna, content: his theme, quietly
  C.mel('strings', content, V.frag(SK.a, 0, 4), 0.3, { att: 0.15, rel: 0.6 });
  // ---- the giants close in: the new wheel; he breaks for the tower
  wheelBar(C, q16(close), WEB, 0.7);
  NN('D4 A4 D5 E5 A5 D6').forEach((m, i) => C.n('glass', dash + i * 0.1, m, 0.25, 0.3, { arp: 1, t60: 0.4 }));
  C.n('riser', dash - 1, nm('D3'), END - dash + 1, 0.35, { from: 250, to: 5000, q: 2.4, tone: 1 });
} });

// ====================================================================================== 10. a4_climb
HT.music.cue({ id: 'a4.climb', from: 'a4_climb', to: 'a4_climb', level: LV.agito + TRIM.climb, fn: C => {
  const S = 'a4_climb', END = C.endBeat;
  const run0 = bt(nthCue(C, S, 'footConcrete', 0, 1.2)), top = bt(C.cueT(S, 'windGust', 6.6)), blocks = C.cuesOf(S, 'block');
  const punch = bt(nthCue(C, S, 'hitH', 0, 10.067)), kick = bt(nthCue(C, S, 'hitH', 1, 11.053));
  const spark = bt(C.cueT(S, 'agitoSpark', 12.55)), stop = bt(C.cueT(S, 'infinityStop', 13.32));
  const look = bt(shotT(S, 'closeup', 16.4)), wide = bt(shotAfter(S, 'static', 20, 20.4));
  // ---- up the glass face: a driving groove; his head climbs a step of the Lydian scale every bar, the bass with it
  const R0 = q16(run0);
  groove(C, R0, top, DRIVE, DRIVE_S, null, 0.72);
  for (let bar = 0; R0 + bar * 4 < top - 1; bar++) {
    const b = R0 + bar * 4;
    C.mel('glass', b, dtr(V.frag(G.a, 0, 4), bar), 0.45, { vib: 6, rel: 0.2 });
    C.n('dbass', b, dtr([[0, nm('D2'), 1]], bar)[0][1], 3.8, 0.6, { cut: 420, drive: 1 });
  }
  blocks.forEach(c => C.n('taiko', c.b, 0, 0.5, 0.6, { kind: 'don' }));
  // ---- the top of the facade, the wind: a suspended breath
  C.ch('strings', top, NN('A3 D4 E4'), punch - top, 0.16, { att: 1, rel: 0.3, trem: 10 });
  // Mahoraga punches him out over the street; Sukuna's head kick: two blows, a falling run as he spins
  stab(C, punch, 'phr', 0.85); stab(C, kick, 'phr', 1.0);
  NN('A6 E6 D6 B5 A5 F#5 E5 D5').forEach((m, i) => C.n('glass', kick + 0.25 + i * 0.12, m, 0.25, 0.26 - 0.015 * i, { arp: 1, t60: 0.4, pan: 0.5 - 0.12 * i }));
  // ---- Agito leaps the street, fist crackling: the beast's buzz swells — the music pulls out —
  for (let b = spark; b < stop - bt(0.1) - 1e-6; b += 0.125) C.n('dbass', b, nm('Eb2'), 0.1, 0.3 + 0.5 * (b - spark) / Math.max(0.5, stop - spark), { cut: 1200, drive: 2 });
  C.ch('strings', spark, NN('D3 Eb3 G#3'), stop - spark - bt(0.1), 0.2, { att: 0.3, rel: 0.02, trem: 16 });
  pullOut(C, stop, 0.1);
  // … and the Infinity stops it dead: it is back — his glass, and the whole Lydian chord blooming out of it
  ARR.accent(C, stop, 'inf', 1.3);
  C.ch('glass', stop + 0.1, NN('D5 A5 E6 B6'), 6, 0.2, { vib: 0, att: 1.2, rel: 2 });
  C.ch('strings', stop + 0.1, NN('D3 A3 E4 F#4 G#4'), 8, 0.18, { att: 1.5, rel: 2 });
  C.n('koto', stop + 0.5, nm('D5'), 1, 0.35, { let: 1, t60: 3 });
  // ---- held in the air, he turns to look back at the beast: his theme, whole and sure
  C.mel('glass', look, G.a.concat(V.disp(G.b, 8)), 0.45, { vib: 8, rel: 0.4 });
  C.mel('strings', look, V.oct(G.a, -1), 0.25, { att: 0.1, rel: 0.5 });
  C.n('sub', look, nm('D2'), END - look, 0.4, { att: 1.5, rel: 1 });
  C.levelRamp(wide, END, 0, 2);
} });

// ====================================================================================== 11. a4_crush
HT.music.cue({ id: 'a4.crush', from: 'a4_crush', to: 'a4_crush', level: LV.collapse + TRIM.crush, fn: C => {
  const S = 'a4_crush', END = C.endBeat;
  const form = bt(fxT(S, 'blueOrb', 0.9)), imp = bt(C.cueT(S, 'blueImplode', 3.69));
  const trench = bt(C.cueT(S, 'rumble', 4.85)), lift = bt(lastCue(C, S, 'whooshL', 7.2)), star = bt(fxT(S, 'a4blueStar', 10.2));
  const quiet = bt(shotAfter(S, 'static', 10.4, 10.6)), uneasy = bt(shotT(S, 'closeup', 16.4)), wide = bt(shotAfter(S, 'static', 20, 20.4));
  // ---- a sphere of Blue round his remaining fist: the Lydian stack gathering, faster and faster
  for (let b = form, i = 0; b < imp - bt(0.1) - 1e-6; i++) {
    const u = (b - form) / Math.max(1, imp - form);
    C.n('glass', b, STACK_HI[i % 7] - 12, 0.25, 0.15 + 0.3 * u, { arp: 1, t60: 0.5, pan: (i % 2 ? 0.3 : -0.3) });
    b += 0.5 - 0.375 * u;
  }
  C.ch('strings', form, NN('D3 A3 E4'), imp - form - bt(0.1), 0.2, { att: 1.2, rel: 0.02, trem: 14 });
  C.n('riser', form + 1, nm('D3'), imp - form - 1 - bt(0.1), 0.4, { from: 200, to: 6500, q: 2.2, tone: 1 });
  // … pulled out 0.1 s before — the Blue into Agito's core: it implodes (a peak of the act)
  pullOut(C, imp, 0.1);
  C.level(imp - 0.05, LIFT.crush, 0.004);
  C.ch('strings', imp, NN('A2 D3 E3 A3 E4 G#4'), 0.5, 1.3, { sfz: 1, rel: 1.4 });
  C.ch('glass', imp, NN('D6 A6 E7'), 1, 0.8, { arp: 1, t60: 1.5 });
  C.n('tamtam', imp, 0, 1, 1.2, { dec: 5 });
  C.levelRamp(imp + 1, imp + 2.2, LIFT.crush, 0);
  // ---- he hurls it down; it tears on down the street: a great low chord under the roar, the drums rolling
  C.ch('strings', trench, NN('D2 A2 E3 B3'), lift - trench, 0.3, { att: 0.2, rel: 1, trem: 8 });
  C.n('dbass', trench, nm('D1'), lift - trench, 0.6, { cut: 180, rel: 1 });
  for (let b = trench; b < lift - 1e-6; b += 0.25) C.n('taiko', b, 0, 0.25, 0.3 + 0.25 * Math.sin(Math.PI * (b - trench) / Math.max(1, lift - trench)), { kind: 'do', dec: 0.4 });
  // ---- it lifts off and stops, hanging in the sky: a line rising to the star's note (the star itself is a4.star)
  const LINE = NN('D5 E5 F#5 A5 B5 D6 E6 F#6 A6');
  LINE.forEach((m, i) => C.n('glass', lift + i * (star - lift) / LINE.length, m, 1, 0.25, { vib: 0, att: 0.05, rel: 0.6 }));
  // ---- silence (only the star); Sukuna looks up at it, uneasy for the first time: his ♭2 against D, trembling, and his
  // head, hesitant (no gate here: a4.star keeps sounding)
  C.hole(quiet, uneasy);
  C.ch('strings', uneasy, NN('D2 Eb2'), wide - uneasy, 0.14, { att: 1.5, rel: 1, trem: 5, cut: 700 });
  C.mel('strings', uneasy + 1, V.aug(V.frag(SK.a, 0, 2.5), 1.5), 0.28, { att: 0.2, rel: 0.8 });
  C.fadeOut(wide, END);
} });

// ====================================================================================== the blue star (layer)
HT.music.cue({ id: 'a4.star', from: 'a4_crush', to: 'a4_flash34', level: LV.collapse + TRIM.star, fn: C => {
  const S = 'a4_crush', F = 'a4_flash34', F0 = C.sceneT(F), END = C.endBeat;
  const star = bt(fxT(S, 'a4blueStar', 10.2)), rise = bt(F0 + evT(F, e => e.who === 'gojo' && e.do === 'fly' && e.pose === 'a4RiseSky', 18.6));
  // the small blue star over the city: a fifth of pure tones, high and faint, beating slowly — it waits for Act V's Red
  C.ch('tone', star, NN('A6 E7'), END - star, 0.14, { att: 1.5, rel: 1.5, beat0: 0.15, beat1: 0.4, oct: 0 });
  // he rises toward it: it brightens (the Lydian ♯4 joins)
  C.n('tone', rise, nm('G#7'), END - rise, 0.1, { att: 2.5, rel: 1.5, beat0: 0.2, beat1: 0.6, oct: 0 });
  C.levelRamp(rise, END - 4, 0, 4);
  C.fadeOut(END - 4, END, 4);
} });

// ====================================================================================== 12. a4_flash34
HT.music.cue({ id: 'a4.flash', from: 'a4_flash34', to: 'a4_flash34', level: LV.collapse + TRIM.flash, fn: C => {
  const S = 'a4_flash34', END = C.endBeat;
  const heal = bt(C.cueT(S, 'rctHeal', 0.3)), gc = bt(shotT(S, 'closeup', 3.8)), sc = bt(shotT(S, 'closeup', 5.3, 1));
  const go = bt(shotAfter(S, 'static', 6, 6.6)), bf3 = bt(nthCue(C, S, 'blackFlash', 0, 7.5)), bf4 = bt(nthCue(C, S, 'blackFlash', 1, 11.75));
  const mg = postOf(S).filter(e => e.post === 'manga')[0], mEnd = bt(mg ? mg.t + (mg.dur || 0.6) : 8.55);
  const catchT = bt(C.cueT(S, 'block', 9.717)), toss = bt(lastCue(C, S, 'whooshL', 10.53));
  const wall = bt(C.cueT(S, 'wallCrash', 12.22)), fall = bt(C.cueT(S, 'collapse', 14.2)), sky = bt(shotAfter(S, 'static', 17.5, 18.0));
  // ---- his arm grows back: exhilaration — his theme at last whole and bright, in octaves, over a light drive
  const G16 = G.a.concat(V.disp(G.b, 8)), gl = sc - heal;                                      // (cut off by Sukuna's close-up)
  groove(C, q16(heal + 0.5), sc, BLUE, BLUE_S, B_LYD, 0.5);
  C.mel('glass', heal, V.frag(G16, 0, gl), 0.55, { vib: 9, rel: 0.4 });
  C.mel('koto', heal, V.frag(V.oct(G.a, -1), 0, gl), 0.3, { pan: -0.2 });
  C.mel('strings', heal, V.frag(V.oct(G16, -1), 0, gl), 0.3, { att: 0.08, rel: 0.4 });
  C.ch('glass', gc, NN('C#6 E6'), Math.min(2, sc - gc), 0.2, { vib: 5, att: 0.2, rel: 1 });      // the close-up: his eyes
  // ---- Sukuna, uneasy for the first time in a thousand years: the music darkens — his head, low, unresolved
  C.mel('strings', sc, V.frag(SK.a, 0, 3.5), 0.35, { att: 0.1, rel: 0.4 });
  C.ch('strings', sc, NN('D2 Eb2'), go - sc, 0.12, { att: 0.3, rel: 0.2, trem: 6 });
  // ---- Black Flash #3: The Strongest at full drive
  const D0 = q16(go);
  groove(C, D0, bf3 - bt(0.1), DRIVE, DRIVE_S, B_LYD, 0.7);
  C.mel('glass', D0, V.frag(TH.strongest.upper(), 0, bf3 - D0), 0.5, { vib: 8, rel: 0.2 });
  C.mel('strings', D0, V.frag(TH.strongest.lower(), 0, bf3 - D0), 0.45, { att: 0.04, rel: 0.2 });
  blackFlash(C, bf3, LIFT.bf3, 0.95);
  // the manga beat holds; then he catches Sukuna's fist and throws him into the giant's arms
  const R1 = q16(mEnd);
  groove(C, R1, bf4 - bt(0.1), DRIVE, DRIVE_S, B_LYD, 0.72);
  C.mel('glass', R1, V.frag(TH.strongest.upper(), 4, 4 + bf4 - R1), 0.5, { vib: 8, rel: 0.2 });
  C.mel('strings', R1, V.frag(TH.strongest.lower(), 4, 4 + bf4 - R1), 0.45, { att: 0.04, rel: 0.2 });
  stab(C, catchT, 'lyd', 0.9);
  NN('D5 E5 F#5 A5 B5 D6').forEach((m, i) => C.n('glass', toss + i * 0.08, m, 0.25, 0.3, { arp: 1, t60: 0.4, pan: 0.3 }));
  // ---- Black Flash #4: the giant shields its master with the flat of its sword — the act's climax
  blackFlash(C, bf4, LIFT.bf4, 1.1);
  C.n('clunk', bf4, nm('Eb2'), 1, 0.9, { t60: 2.5 });                                         // the blade's flat: the new wheel's root
  // ---- through the tower, which sinks into its own dust: a cascade falling down his scale
  NN('D4 C4 Bb3 A3 G3 F3 Eb3 D3').forEach((m, i) => C.ch('strings', wall + i * 0.75, [m, m - 12], 1, 0.3 - 0.02 * i, { att: 0.05, rel: 0.8 }));
  C.n('tamtam', fall, 0, 1, 0.8, { dec: 6 });
  C.n('sub', fall, nm('D2'), sky - fall, 0.5, { att: 0.5, rel: 1.5 });
  // ---- high above: he rises toward the small blue star — his head, slow, climbing; the wind
  C.mel('glass', sky + 1, V.aug(V.frag(G.a, 0, 4), 2), 0.35, { vib: 6, rel: 1.2 });
  C.ch('strings', sky, NN('D3 A3 E4'), END - sky, 0.14, { att: 2, rel: 1 });
  C.fadeOut(END - 3, END);
  C.g('gate', END - 0.4, 0, 0.05);              // the act's end: tails out before the Act V card (a5.red reopens)
} });
})();
