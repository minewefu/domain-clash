/* =====================================================================================================
   DOMAIN CLASH — Act V "Hollow Purple" score (15:00–17:30)                 (src/audio/score_a5.js, classic script)
   Canon ch. 235. High above the city at sunset. The act's shape is the SPEC's dynamic arc in miniature: a golden rise,
   the last chase, TOTAL SILENCE (a5_sky: wind only), then the loudest moment of the film, then ringing and ash.
   The two stars: the Blue left hanging over the city (Act IV) is the upper fifth of Gojo's Lydian stack of fifths
   (A6–E7, pure tones); the Red he fires is its lower fifth (D6–A6): they share the A. When they fuse at a distance the
   whole stack sounds at once — D A E B F♯ C♯ G♯, every note of D Lydian stacked in fifths from the bottom of the
   orchestra to the top: HOLLOW PURPLE (Act IV's glimpse of it, a4_agito, was the same stack, very far away).
   Cues (film seconds; act seconds = film − 900). Sync points are read from the scenes.
     a5.red      900–920  silence under the act card; sunset: a warm Lydian chord as he rises; his eyes (koto); the
                          incantation — three phrases on the shakuhachi, each a fifth higher (the stack climbing), a glass
                          ring for each glyph ring; the red point swelling (a tremolo); the Red fired: a far burst
     a5.stars    902–940  (layer, a5_red → a5_ride) the blue star (A6–E7) from the sunset on; the red star (D6–A6) from
                          the firing — drifting toward it; the blue swells as it swallows the beam; both gone before the sky
     a5.ride     920–940  Mahoraga's crouch and leap (the adapted wheel on E♭, rising as a golden streak); Gojo rides the
                          Blue's pull (his head, fast); the uppercut; Sukuna's beam (his theme low, the beam's E♭ needle);
                          Gojo chants Blue (three glass rings) and it swallows the beam (the Lydian swell); Sukuna leaps
                          after them; the music thins to nothing
     (a5_sky     940–958  no music: silence, wind only — the page of three, the hand signs, the low charge)
     a5.purple   958–982  silence while the Red spirals into the Blue; HOLLOW PURPLE: the whole Lydian stack, strings to
                          glass, a temple bell, the drums rolling, swelling with the sphere — the peak of the film's arc —
                          up into the whiteout; silence in the white (the tinnitus); inside the light the adapted wheel's
                          ostinato one last time, breaking apart, gold motes falling; the ringing; the crater at sunset
     a5.ash      982–1002 only the ash wind and embers — and the wheel's last three notes as its gold motes go out
     a5.landing  1002–1022 Gojo's theme, sparse and relieved: the koto as he breathes, the answer in the glass at the
                          smile, a warm chord; hands in pockets
     a5.command  1022–1038 one warm chord (soft FM keys): the silent celebration (they believe he has won)
     (a5_breath  1038–1050 no music: the sun sets, snow, wind)
   Loudness: AU.LEVELS sky −6 · incantation −3 · purple +3 (lifted) · aftermath −6 · celebration −9 (the sparse aftermath
   cues carry trims that bring soft instruments to quiet but audible levels). purpleErase ducks the music 4 dB (sfx.js;
   it was 12 dB) so the Purple's chord is heard inside the roar. Measured (M5, full-film run): the Purple −10.0 LUFS
   momentary @965.0 and −10.4 short-term @962.8 — the loudest moment of the film (next: Act IV's Black Flash #4 −11.6;
   the loudest 3 s outside Act V −14.3); Act V −19.5 LUFS integrated.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, ARR, LEVELS: LV, BEAT } = AU;
const G = TH.gojo, SK = TH.sukuna, MA = TH.mahoraga;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;
// (the aftermath cues are sparse and soft — koto, FM keys, single notes: their trims bring them to audible, still quiet
// levels — measured music loudness in tools/audio-lab.js actChecks, M5)
const TRIM = { red: 6, stars: 0, ride: 2, purple: 0, ash: 10, landing: 8, command: 13 };
const LIFT = { purple0: 6, purple1: 10 };      // the Purple's lift: at the detonation → at the swell before the whiteout

// ------------------------------------------------------------------ the director's scene data (as score_a1–a4.js)
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const fxOf = id => { const s = SCN(id); return (s && s.C && s.C.fx) || []; };
const postOf = id => { const s = SCN(id); return (s && s.C && s.C.post) || []; };
const shotT = (id, name, def, i) => { const e = shotsOf(id).filter(x => x.shot === name)[i || 0]; return e ? e.t : def; };
const shotAfter = (id, name, tMin, def) => { const e = shotsOf(id).filter(x => x.shot === name && x.t > tMin).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const fxT = (id, name, def, i) => { const e = fxOf(id).filter(x => x.fx === name).sort((a, b) => a.t - b.t)[i || 0]; return e ? e.t : def; };
const postT = (id, name, def) => { const e = postOf(id).filter(x => x.post === name).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const evT = (id, pred, def) => { const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t); return L.length ? L[0].t : def; };
const nthCue = (C, id, names, i, def) => { const L = C.cuesOf(id, names); return L[i] ? L[i].t : C.sceneT(id) + def; };
const q16 = b => Math.ceil(b * 4 - 1e-6) / 4;

// ------------------------------------------------------------------ figures
const WEB = NN('Eb4 F#4 A4');                 // the adapted wheel (Act IV's second adaptation)
const STACK = NN('D2 A2 E3 B3 F#4 C#5 G#5');  // the Purple: the D Lydian stack of fifths (low)
const STACK_HI = NN('D5 A5 E6 B6 F#6 C#7 G#7');
const HARM = o => Object.assign({ let: 1, pick: 0.24, bright: 0.4, t60: 4.2 }, o || {});
function stab(C, b, kind, v) {                // the light catch of Acts III–IV
  v *= 0.85;
  C.n('taiko', b, 0, 1, 0.8 * v, { kind: 'don' });
  const ch = kind === 'lyd' ? 'D2 A2 E3' : kind === 'both' ? 'D2 Eb2 A2 G#3' : 'D2 A2 Eb3';
  C.ch('strings', b, NN(ch), 0.5, 0.8 * v, { sfz: 1, rel: 0.6 });
  if (kind === 'lyd') ARR.accent(C, b, 'inf', 0.8 * v);
}
function groove(C, b0, b1, pats, shis, v) {
  for (let b = b0; b < b1 - 1e-6; b += 0.25) {
    const i = Math.round((b - b0) * 4), bar = Math.floor(i / 16), k = i % 16;
    const c = ARR.TAIKO[pats[bar % pats.length][k]]; if (c) C.n(c[0], b, 0, 0.25, v * c[2], c[3]);
    const d = ARR.TAIKO[shis[bar % shis.length][k]]; if (d) C.n(d[0], b, 0, 0.25, v * 0.75 * d[2], d[3]);
  }
}
const BLUE = ['D.ddD.dkD.ddD.dk', 'D.ddD.dkD.dd.kdd'], BLUE_S = ['s.s.S.s.s.s.S.s.', 's.s.S.s.s.s.S.ss'];

// ====================================================================================== 1. a5_red
HT.music.cue({ id: 'a5.red', from: 'a5_red', to: 'a5_red', level: LV.incantation + TRIM.red, fn: C => {
  const S = 'a5_red', END = C.endBeat;
  const open = bt(postT(S, 'fadeFrom', 2.6)), eyes = bt(C.cueT(S, 'sixEyes', 9.2));
  const signs = C.cuesOf(S, 'handSign').map(c => c.b), fire = bt(C.cueT(S, 'redBlast', 15.3)), orb = bt(fxT(S, 'redOrb', 11.4));
  const ph = signs.length >= 3 ? signs.slice(0, 3) : [bt(10.9), bt(12.1), bt(13.3)];
  // 0 → the picture: silence under the act card (a4.flash closed the music gate at its end: reopen it)
  C.g('gate', open - 0.5, 1, 0.02);
  // ---- sunset, high above the city: a warm Lydian chord as he rises into the golden light
  C.ch('strings', open, NN('D3 A3 E4 F#4'), ph[0] - open, 0.13, { att: 3, rel: 1.2 });
  C.n('sub', open, nm('D2'), fire - open, 0.35, { att: 3, rel: 1 });
  C.ch('glass', open + 2, NN('A5 E6'), ph[0] - open - 2, 0.07, { att: 2.5, rel: 1, vib: 0 });
  // his eyes (close-up): the first two notes of his head, on the koto
  C.n('koto', eyes, nm('D5'), 1, 0.3, { let: 1, t60: 2.5, pan: -0.1 }); C.n('koto', eyes + 1, nm('A5'), 1, 0.28, { let: 1, t60: 2.5, pan: -0.1 });
  // ---- the incantation of Red: three phrases, each a fifth higher (the stack climbing), a glass ring for each
  [[NN('D4 E4 F#4 A4'), nm('D5')], [NN('A4 B4 C#5 E5'), nm('A5')], [NN('E5 F#5 G#5 B5'), nm('E6')]].forEach(([line, ring], k) => {
    const b0 = ph[k];
    line.forEach((m, i) => C.n('shaku', b0 + i * 0.5, m, i === 3 ? 1.2 : 0.5, 0.5, { breath: 0.6 }));
    C.n('glass', b0, ring, 1, 0.3, { arp: 1, t60: 2.2, pan: [-0.3, 0.3, 0][k] });
  });
  C.ch('strings', ph[0], NN('D3 A3'), fire - ph[0], 0.12, { att: 1.5, rel: 0.3 });
  // the red point swelling at his fingertip: a tremolo rising into the shot
  C.ch('strings', orb, NN('A3 E4'), fire - orb - bt(0.05), 0.08, { att: 2.5, rel: 0.05, trem: 13 });
  // ---- fired toward the Blue: a far burst (muffled by the distance), then the red star drifts (a5.stars)
  C.n('taiko', fire, 0, 0.5, 0.45, { kind: 'do', dec: 1.2 });
  C.ch('strings', fire, NN('D3 A3 E4'), 0.5, 0.4, { sfz: 1, rel: 1.2, cut: 1500 });
  NN('D6 A6 E7').forEach((m, i) => C.n('glass', fire + 0.1 + i * 0.12, m, 0.5, 0.2, { arp: 1, t60: 1.6 }));
  C.ch('strings', fire + 1, NN('D3 A3 F#4'), END - fire - 1, 0.1, { att: 2, rel: 1 });
} });

// ====================================================================================== the two stars (layer)
HT.music.cue({ id: 'a5.stars', from: 'a5_red', to: 'a5_ride', level: LV.sky + TRIM.stars, fn: C => {
  const S = 'a5_red', R = 'a5_ride', R0 = C.sceneT(R), END = C.endBeat;
  const open = bt(postT(S, 'fadeFrom', 2.6)), fire = bt(C.cueT(S, 'redBlast', 15.3)), swallow = bt(C.cueT(R, 'blueImplode', 14.5));
  const out = bt(R0 + shotAfter(R, 'static', 17, 17.6));
  // the blue star (A6–E7) over the district from the first light
  C.ch('tone', open, NN('A6 E7'), out - open, 0.14, { att: 2, rel: 1.5, beat0: 0.15, beat1: 0.4, oct: 0 });
  // the red star (D6–A6) from the firing, drifting toward it (its beating slows as they near)
  C.ch('tone', fire, NN('D6 A6'), out - fire, 0.11, { att: 1.5, rel: 1.5, beat0: 0.9, beat1: 0.2, oct: 0 });
  // the Blue swallows the beam and swells: its fifth opens out upward (B6, F♯7)
  C.ch('tone', swallow, NN('B6 F#7'), out - swallow, 0.08, { att: 1, rel: 1.5, beat0: 0.3, beat1: 0.6, oct: 0 });
  C.fadeOut(out - 1, out + 1);
} });

// ====================================================================================== 2. a5_ride
HT.music.cue({ id: 'a5.ride', from: 'a5_ride', to: 'a5_ride', level: LV.clash + TRIM.ride, fn: C => {
  const S = 'a5_ride', END = C.endBeat;
  const crouch = bt(C.cueT(S, 'mahoStep', 0.9)), leap = bt(C.cueT(S, 'groundSlam', 2.4)), streak = bt(fxT(S, 'streak', 3.4));
  const ride = bt(shotT(S, 'follow', 5.4)), upper = bt(C.cueT(S, 'hitHuge', 8.597)), stance = bt(evT(S, e => e.who === 'sukuna' && e.pose === 'a5_sukBeamA', 10.8));
  const beam = bt(C.cueT(S, 'waterJet', 12.3)), rings = bt(fxT(S, 'chantRings', 13.8)), swallow = bt(C.cueT(S, 'blueImplode', 14.5));
  const after = bt(nthCue(C, S, 'groundSlam', 1, 18.66));
  // ---- Mahoraga crouches on the street: the adapted wheel (E♭ F♯ A), low
  MA.steps.forEach((s, j) => { C.n('clunk', crouch + s * 0.25, WEB[j] - 12, 1, 0.55, { t60: 1.4 }); C.n('dbass', crouch + s * 0.25, WEB[j] - 24, 0.7, 0.5, { cut: 300 }); });
  // it leaps for the Blue: a blow, then a golden streak — the wheel's triad climbing through the octatonic scale
  stab(C, leap, 'both', 0.9);
  NN('Eb3 F#3 A3 C4 Eb4 F#4 A4 C5 Eb5 F#5').forEach((m, i) => C.n('glass', streak + i * ((ride - streak) / 10), m, 0.5, 0.18 + 0.01 * i, { arp: 1, t60: 0.8, pan: -0.4 + 0.08 * i }));
  C.n('strings', streak, nm('Eb3'), ride - streak, 0.16, { att: 1, rel: 0.2, trem: 12, pont: 1 });
  // ---- Gojo lets the Blue's pull take him: his head, fast, over a drive
  groove(C, q16(ride), upper, BLUE, BLUE_S, 0.6);
  C.mel('glass', q16(ride), V.aug(V.frag(G.a, 0, 6), 0.5), 0.5, { vib: 6, rel: 0.2 });
  C.mel('strings', q16(ride), V.oct(V.aug(V.frag(G.a, 0, 6), 0.5), -1), 0.3, { att: 0.03, rel: 0.2 });
  // the uppercut in mid-air: the giant tumbles up (a falling run)
  stab(C, upper, 'lyd', 1.0);
  NN('A6 F#6 E6 C#6 B5 A5').forEach((m, i) => C.n('glass', upper + 0.3 + i * 0.15, m, 0.25, 0.22 - 0.02 * i, { arp: 1, t60: 0.5 }));
  // ---- Sukuna, below, takes the stance: his theme low; the beam: a needle on his ♭2
  C.mel('strings', stance, V.frag(SK.a, 0, 4), 0.4, { att: 0.08, rel: 0.4 });
  C.mel('dbass', stance, V.oct(V.frag(SK.a, 0, 4), -1), 0.5, { cut: 320, drive: 1 });
  C.n('tone', beam, nm('Eb6'), swallow - beam, 0.2, { att: 0.02, rel: 0.1, beat0: 2, beat1: 9, oct: 0 });
  // ---- Gojo chants Blue: three glass rings; the Blue swallows the beam — his fifths swell out of it
  NN('D5 A5 E6').forEach((m, i) => C.n('glass', rings + i * 0.8, m, 1, 0.28, { arp: 1, t60: 2, pan: [-0.3, 0.3, 0][i] }));
  C.ch('strings', swallow, NN('D3 A3 E4 B4'), 4, 0.2, { att: 0.3, rel: 1.5 });
  C.ch('glass', swallow, NN('D5 A5 E6 B6'), 4, 0.14, { vib: 0, att: 0.5, rel: 1.5 });
  // ---- Sukuna leaps after them: his rub, a drum — then the music thins to nothing (the sky is silent)
  stab(C, after, 'phr', 0.8);
  C.fadeOut(after + 1, END);
  C.g('gate', END - 0.4, 0, 0.05);              // the sky is silent: tails out (a5.purple reopens the gate at the Purple)
} });

// ====================================================================================== 4. a5_purple
HT.music.cue({ id: 'a5.purple', from: 'a5_purple', to: 'a5_purple', level: LV.purple + TRIM.purple, fn: C => {
  const S = 'a5_purple', END = C.endBeat;
  const born = bt(C.cueT(S, 'purpleErase', 2.62)), white = bt(postT(S, 'fadeTo', 7.3)), inW = 0.55;
  const light = bt(shotAfter(S, 'static', 9, 9.8)), motes = bt(fxT(S, 'disintegrate', 9.8, 1) + 4.4), crater = bt(shotAfter(S, 'static', 16, 16.4));
  const peak = white + bt(inW);                                           // the pink flash → white
  // 0 → born: silence (the Red spirals into the Blue; only the charge) — a5.ride closed the gate; it opens with the Purple
  C.g('gate', born - 0.1, 1, 0.005);
  // ---- HOLLOW PURPLE: the whole D Lydian stack of fifths, from the bass to the glass — swelling with the sphere
  C.level(born - 0.05, LIFT.purple0, 0.004);
  C.levelRamp(born + 1, white, LIFT.purple0, LIFT.purple1);
  const L = peak - born;
  STACK.forEach((m, i) => C.n('strings', born, m, L, 0.5 + 0.05 * i, { att: 0.03 + 0.05 * i, rel: 0.3 }));
  STACK.forEach((m, i) => C.n('strings', born, m + 12, L, 0.3, { att: 0.4, rel: 0.3, trem: 8 + i }));
  STACK_HI.forEach((m, i) => C.n('glass', born + i * 0.12, m, L - i * 0.12, 0.3, { vib: 0, att: 0.05, rel: 0.3 }));
  C.n('tone', born, nm('G#6'), L, 0.4, { att: 0.2, rel: 0.3, beat0: 1, beat1: 7, oct: 0.2 });
  C.n('bonsho', born, nm('D2'), 4, 0.9, { t60: 22 });
  C.n('subdrop', born, nm('D1'), 1, 1.0, { dec: 4 });
  C.n('dbass', born, nm('D1'), L, 0.8, { cut: 240, rel: 0.3 });
  C.n('tamtam', born, 0, 1, 1.2, { dec: 6 }); C.n('tamtam', born + L * 0.55, nm('A1'), 1, 1.0, { dec: 5 });
  for (let b = born, i = 0; b < peak - 1e-6; b += 0.125, i++) C.n('taiko', b, 0, 0.25, 0.35 + 0.55 * (b - born) / L, { kind: i % 2 ? 'do' : 'don', dec: 0.5 });
  for (let b = born, i = 0; b < peak - 1e-6; b += 0.125, i++) C.n('koto', b, [nm('D5'), nm('A5'), nm('E6'), nm('A5')][i % 4], 0.25, 0.3, { pan: (i % 2 ? 0.3 : -0.3) });
  C.n('riser', white - 2, nm('D4'), peak - white + 2, 0.5, { from: 400, to: 9000, q: 1.8, tone: 1 });
  // … up into the whiteout — then nothing in the white (the tinnitus); the lift is reset before the light
  C.silence(peak + 0.25, light);
  C.level(light - 0.5, 0, 0.05);
  // ---- inside the light: Mahoraga and its wheel come apart — the adapted wheel's ostinato one last time, slowed,
  // breaking: steps drop out, each fainter; gold motes falling (glass); the wheel's hum sagging flat
  for (let bar = 0; bar < 3; bar++) {
    const b0 = light + 1 + bar * 4;
    MA.steps.forEach((s, j) => { if ((bar * 3 + j) % 4 !== 3) C.n('clunk', b0 + s * 0.5, WEB[j] - 12 * (bar > 1 ? 1 : 0), 1, 0.5 - 0.13 * bar, { t60: 2 }); });
  }
  C.ch('tone', light + 1, [WEB[0] - 12.4, WEB[2] - 12.4], motes - light, 0.25, { att: 1, rel: 1.5, beat0: 1.5, beat1: 5, oct: 0.1 });
  NN('A6 F#6 Eb6 C6 A5 F#5 Eb5').forEach((m, i) => C.n('glass', motes + i * 0.55, m, 0.5, 0.16 - 0.015 * i, { arp: 1, t60: 1.6, pan: -0.3 + 0.1 * i }));
  // Sukuna braced and burning (his ♭2, low); Gojo's Infinity holding far off (one high glass)
  C.ch('strings', light, NN('D2 Eb2'), crater - light, 0.12, { att: 1.5, rel: 1, cut: 600 });
  C.n('glass', light + 2, nm('D7'), crater - light - 2, 0.08, { vib: 0, att: 1.5, rel: 1.5 });
  // ---- the crater at sunset: the ringing — the Purple's A–E still hanging, fading to nothing
  C.ch('tone', crater, NN('A6 E7'), END - crater - 2, 0.12, { att: 0.5, rel: 2.5, beat0: 0.4, beat1: 0.15, oct: 0 });
  C.fadeOut(crater + 4, END);
} });

// ====================================================================================== 5. a5_ash
HT.music.cue({ id: 'a5.ash', from: 'a5_ash', to: 'a5_ash', level: LV.aftermath + TRIM.ash, fn: C => {
  const S = 'a5_ash';
  const motes = bt(fxT(S, 'goldMotes', 6.4));
  // only the ash wind and embers — and the wheel's last three notes as its gold motes go out in the ash
  WEB.forEach((m, i) => C.n('glass', motes + 1 + i * 2.2, m + 12, 1, 0.14 - 0.03 * i, { arp: 1, t60: 2.5, pan: 0.2 - 0.2 * i }));
} });

// ====================================================================================== 6. a5_landing
HT.music.cue({ id: 'a5.landing', from: 'a5_landing', to: 'a5_landing', level: LV.aftermath + TRIM.landing, fn: C => {
  const S = 'a5_landing', END = C.endBeat;
  const breath = bt(shotAfter(S, 'static', 5, 5.6)), tired = bt(shotT(S, 'closeup', 9.6)), smile = bt(shotT(S, 'closeup', 12.6, 1));
  const back = bt(shotAfter(S, 'static', 15, 15.6)), pockets = bt(evT(S, e => e.who === 'gojo' && e.pose === 'a5_backPockets', 17.0));
  // ---- he breathes on the rim: his head on a solo koto, slow and sparse
  C.mel('koto', breath, V.aug(V.frag(G.a, 0, 4), 1.5), 0.35, { let: 1, t60: 3, pan: -0.1 });
  C.n('sub', breath, nm('D2'), END - breath, 0.3, { att: 3, rel: 2 });
  // ---- exhausted (the manga close-up): a low fifth
  C.ch('strings', tired, NN('D3 A3'), smile - tired + 2, 0.13, { att: 1.5, rel: 1.5 });
  // ---- the smile: the answer in the glass, relieved — and a warm chord under it
  C.mel('glass', smile, V.aug(G.b, 1.25), 0.3, { vib: 5, rel: 1 });
  C.ch('fmkeys', smile, NN('D3 A3 D4 F#4 A4'), 6, 0.3, { rel: 1.5 });
  // ---- he straightens on the rim, hands into his pockets: one koto note, then its harmonic
  C.n('koto', pockets, nm('A4'), 1, 0.3, { let: 1, t60: 3, pan: 0.1 });
  C.n('koto', pockets + 1.5, nm('D6'), 1, 0.3, HARM({ pan: 0.05 }));
  C.ch('strings', back, NN('D3 A3 E4'), END - back, 0.1, { att: 2, rel: 2 });
  C.fadeOut(END - 2, END);
} });

// ====================================================================================== 7. a5_command
HT.music.cue({ id: 'a5.command', from: 'a5_command', to: 'a5_command', level: LV.celebration + TRIM.command, fn: C => {
  const S = 'a5_command', END = C.endBeat;
  const up = bt(C.cueT(S, 'clothFlutter', 4.2));
  // the silent celebration (they believe he has won): one warm chord — D with its ninth, soft FM keys, a low string pad
  C.ch('fmkeys', up, NN('D3 A3 D4 F#4 A4 E5'), 16, 0.32, { rel: 2, t60: 6 });
  C.ch('strings', up, NN('D3 A3 F#4'), END - up - 2, 0.1, { att: 2, rel: 2 });
  C.fadeOut(END - 3, END);
  C.g('gate', END - 0.4, 0, 0.05);              // a5_breath is wind only (a6.notch reopens the gate)
} });
})();
