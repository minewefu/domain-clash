/* =====================================================================================================
   DOMAIN CLASH — Act III "Unlimited Void" score (8:00–11:00)              (src/audio/score_a3.js, classic script)
   Canon ch. 229–232. The Void breaks, both domains are burnt out, and the fight becomes fists and Blue while
   Mahoraga's wheel over Sukuna's head adapts to Infinity. The wheel is the act's clock: its mechanical ostinato (3+3+2 on
   a diminished triad, TH.mahoraga) is heard at home (D F G♯) when Mahoraga rises inside the Void, and each adaptation
   rotates it a minor third — F G♯ B at the signal, G♯ B D and B D F in the chase — until the fourth (a3_adapt)
   closes the circle on D, an octave up. (The scenes count the wheel's visual notches 1–5 including Act II's first turn;
   the music's position is notch − 1, so SPEC §3.3's adaptations 1–4 are the four rotations.)
   Cues (film seconds with Acts I–II before it; act seconds = film − 480). Sync points are read from the scenes.
     a3.frozen  480–500  the Void's stillness carried over from Act II under the act card → the barrage: "The Strongest"
                         at full drive, every blow caught → the shadow → Mahoraga rises: the ostinato at home, Gojo's
                         Red gathering against it → the sword strike (a hit) → the shatter; silence at noon
     a3.breath  500–520  breath: a low floor; Mahoraga's last clunk as it sinks; the sixth expansion = two glints of the
                         Void's chord that die; one koto note for the nosebleed; the wheel's hum (a beating tritone)
                         while it hangs over Sukuna; his Shrine chokes (a bell, a shamisen); Gojo's laugh = a koto flourish
     a3.blue    520–560  fists and Blue: a bright driving groove with Gojo's head (the pull, the hook, the slam, the
                         drag's grinding cluster, the throw, the landing); the trap = two lines converging on the Blue;
                         the heap falls; a cool hold (the wheel hums over the heap) → Sukuna bursts out: his taiko groove,
                         the stomp, the amplified flip-kick (the wheel greys: the hum sags flat, then warms back); four
                         Gojos = his head as a four-voice echo from four sides; the eyes dart; the catch; the dark fist
     a3.signal  560–582  the counter; blown back (a falling run); the perch; Sukuna walks in (his theme, a 60 BPM heart);
                         the wheel turns: the ostinato on F; the regard; the green light, the launch, the signal thrown,
                         the Infinity stops it (glass) and the music freezes on one high tone; both launch; cut dead
     a3.chase   582–604  driving percussion; the ostinato on G♯ at the second turn; the two Blues; eight orbs = eight
                         glass notes of the Lydian stack blooming 50 ms apart and closing; the blows; the deck crash; the
                         ostinato on B at the third turn; a breath
     a3.red     604–642  (a3_red → a3_blackflash) the colonnade: stalking suspense; Red readied (Gojo's head rising); the
                         blunted hit; the curve; the return; the Red into his back (a hit); the slow approach (time
                         stretched: one high tone over a swelling Lydian stack) — the music pulls out 0.1 s before the
                         contact — BLACK FLASH: the act's loudest hit, which drains into the tinnitus; then a long silence
                         (music gated from the manga page to the end of the scene)
     a3.adapt   642–660  the last notch: the ostinato on D an octave up — the circle closed — and a low D resolves it; the
                         wheel sinks; RCT; his theme as he smiles; Gojo's head darkened into Phrygian as his smile goes;
                         the shadow twitches over a low drone; fade with the black
   Loudness: AU.LEVELS clash 0 (fights), void −3 (the Void); the Black Flash is lifted for the act's loudest moment,
   still below the Purple (Act V, +3). Measured (M3, tools/audio-lab.js ?acts=III): −19.6 LUFS integrated (Act II −19.5);
   the Black Flash −11.8 LUFS momentary, 1.0 dB above any other moment of Acts I–III (next: a3_chase −12.8; Act II's
   max −12.9) — so the Purple must beat −11.8. Figures shared with score_a2.js (heart, stabs, the Lydian stack) are
   re-declared here so the act files stay independent.
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, V, THEMES: TH, ARR, LEVELS: LV, BEAT } = AU;
const G = TH.gojo, SK = TH.sukuna, MA = TH.mahoraga;
const NN = s => s.trim().split(/\s+/).map(nm);
const bt = s => s / BEAT;
// density trims (dB on top of AU.LEVELS), set from tools/audio-lab.js actChecks like Acts I–II
const TRIM = { frozen: 3, breath: 6, blue: 4, signal: 4, chase: 3.5, red: 3, adapt: 1 };
const A2_END = -0.5; // absolute cue level (dB) of the suspension that ends Act II (score_a2.js a2.clash5)

// ------------------------------------------------------------------ the director's scene data (as score_a1/a2.js)
const SCN = id => (HT.SCENES && HT.SCENES[id]) || null;
const shotsOf = id => { const s = SCN(id); return (s && s.C && s.C.shots) || []; };
const fxOf = id => { const s = SCN(id); return (s && s.C && s.C.fx) || []; };
const shotT = (id, name, def, i) => { const e = shotsOf(id).filter(x => x.shot === name)[i || 0]; return e ? e.t : def; };
const shotAfter = (id, name, tMin, def) => { const e = shotsOf(id).filter(x => x.shot === name && x.t > tMin).sort((a, b) => a.t - b.t)[0]; return e ? e.t : def; };
const evT = (id, pred, def) => { const s = SCN(id), L = ((s && s.fightDef && s.fightDef.script) || []).filter(pred).sort((a, b) => a.t - b.t); return L.length ? L[0].t : def; };
// every cue of that name (s from the cue start), or the defaults (scene seconds)
const cueList = (C, id, name, defs) => { const L = C.cuesOf(id, name); return L.length ? L.map(c => c.t) : defs.map(d => C.sceneT(id) + d); };
const lastCue = (C, id, name, def) => { const L = C.cuesOf(id, name); return L.length ? L[L.length - 1].t : C.sceneT(id) + def; };
const q16 = b => Math.ceil(b * 4 - 1e-6) / 4;

// ------------------------------------------------------------------ figures
// Mahoraga's wheel: one bar of the ostinato at position p (0 = D F G♯, each +1 = up a minor third); `first` softens the
// first step when the scene's wheelClunk SFX strikes with it
function wheelBar(C, b, p, v, first) {
  const w = MA.wheel(p);
  MA.steps.forEach((s, j) => {
    C.n('clunk', b + s * 0.25, w[j], 1, (j === 0 && first != null ? first : 0.8) * v, { t60: 1.4 });
    C.n('dbass', b + s * 0.25, w[j] - 12, 0.7, 0.7 * v, { cut: 360 });
  });
  '..x.x...x.x...x.'.split('').forEach((c, i) => { if (c === 'x') C.n('shime', b + i * 0.25, 0, 0.25, 0.4 * v, { kind: 'ka' }); });
  C.ch('strings', b, [w[0] - 12, w[2] - 12], 4, 0.18 * v, { att: 0.3, rel: 0.6, pont: 1 });
}
// the wheel's hum: its outer tritone as two beating pure tones (sag = semitones flat: the wheel greyed out)
function wheelHum(C, b, len, p, v, sag) {
  if (!(len > 0.5)) return;
  const w = MA.wheel(p);
  C.ch('tone', b, [w[0] - (sag || 0), w[2] - (sag || 0)], len, v, { att: Math.min(1.5, len * 0.3), rel: 1.2, beat0: sag ? 1.5 : 0.4, beat1: sag ? 3 : 0.9, oct: 0.2 });
}
function heart(C, b0, b1, per, v0, v1) { // lub-dub (0.375 s apart) every `per` beats
  for (let b = b0; b < b1 - 1e-6; b += per) {
    const v = v0 + (v1 - v0) * (b - b0) / Math.max(1e-6, b1 - b0);
    C.n('taiko', b, 0, 0.5, v, { kind: 'don', dec: 1.1 });
    C.n('taiko', b + 0.75, 0, 0.5, v * 0.62, { kind: 'do' });
  }
}
// Act III's hits all land on loud SFX and drive the master's limiter (measured: raw −7…−10 LUFS momentary → −12…−13.4
// mastered), so the music catches them lighter, with less low end (the SFX carry the thump) — which leaves the Black
// Flash room to be the loudest hit (tools/audio-lab.js, M3 report)
const STAB = 0.85;
function stab(C, b, kind, v) { // 'phr' Sukuna's rub · 'lyd' Gojo's fifths + glass · 'both' the two modes at once
  v *= STAB;
  C.n('taiko', b, 0, 1, 0.8 * v, { kind: 'don' });
  const ch = kind === 'lyd' ? 'D2 A2 E3' : kind === 'both' ? 'D2 Eb2 A2 G#3' : 'D2 A2 Eb3';
  C.ch('strings', b, NN(ch), 0.5, 0.8 * v, { sfz: 1, rel: 0.6 });
  if (kind === 'lyd') ARR.accent(C, b, 'inf', 0.8 * v);
}
// a groove over [b0, b1) from 16-step patterns (ARR.TAIKO letters), with an 8th-note bass line (null = rest)
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

// ====================================================================================== 1. a3_frozen
HT.music.cue({ id: 'a3.frozen', from: 'a3_frozen', to: 'a3_frozen', level: LV.clash + TRIM.frozen, fn: C => {
  const S = 'a3_frozen', END = C.endBeat;
  const hits = C.cuesOf(S, ['hitL', 'hitM', 'hitH']);
  const b0 = bt(shotT(S, 'orbit', 4.5));                                          // the barrage (orbit shot)
  const shadow = bt(C.cueT(S, 'shadowRise', 8.3)), maho = bt(shotAfter(S, 'static', 9, 9.4));
  const red = bt(evT(S, e => e.who === 'gojo' && e.pose === 'a3redTwoA', 11.7));
  const strike = bt(C.cueT(S, 'swordRing', 14.2)), shatter = bt(C.cueT(S, 'barrierShatter', 14.8)), gone = bt(C.cueT(S, 'domainCollapse', 15.1));
  // ---- under the act card: the Void's stillness — the suspension Act II ended on (sus2 + the Lydian ♯11), same voicing,
  // same velocities and the same absolute level (a2.clash5: base 2.5 dB + void − clash = −0.5 dB), re-articulated
  C.level(0, A2_END - (LV.clash + TRIM.frozen), 0.01);
  C.ch('strings', 0, NN('D3 A3 E4'), b0, 0.24, { att: 0.25, rel: 0.1 });
  C.ch('glass', 0, NN('A5 E6'), b0, 0.18, { att: 0.35, rel: 0.1, vib: 0 });
  C.n('tone', 0, nm('G#6'), b0, 0.35, { att: 0.35, rel: 0.1, beat0: 0.2, beat1: 1.2, oct: 0 });
  C.n('sub', 0, nm('D2'), b0, 0.6, { att: 0.3, rel: 0.1 });
  // ---- the barrage: The Strongest at full drive, every blow caught
  C.level(b0 - 0.1, 0, 0.02);
  const B0 = Math.round(b0 * 4) / 4, B1 = Math.max(B0 + 4, bt(evT(S, e => e.kana === 'ドッ', 7.7)) + 0.5);
  C.mel('glass', B0, V.frag(TH.strongest.upper(), 0, B1 - B0), 0.64, { vib: 9, rel: 0.3 });
  C.mel('strings', B0, V.frag(TH.strongest.lower(), 0, B1 - B0), 0.56, { att: 0.04, rel: 0.25 });
  C.mel('strings', B0, V.oct(V.frag(TH.strongest.lower(), 0, B1 - B0), 1), 0.26, { att: 0.04, rel: 0.25 });
  groove(C, B0, B1, DRIVE, DRIVE_S, B_LYD, 0.78);
  hits.forEach((h, i) => { if (i === hits.length - 1) stab(C, h.b, 'lyd', 1.1); else ARR.accent(C, h.b, 'inf', h.sfx === 'hitL' ? 0.6 : 0.75); });
  // ---- the shadow widens: a low tritone swells (the octatonic colour of what is coming)
  C.ch('strings', shadow, NN('D2 G#2'), maho - shadow + 1, 0.22, { att: 1.2, rel: 0.6, trem: 9 });
  // ---- Mahoraga rises inside the domain: its ostinato at home; Gojo's Red gathers against it
  const M0 = Math.ceil(maho * 2) / 2;
  wheelBar(C, M0, 0, 0.85); wheelBar(C, M0 + 4, 0, 0.95);
  C.n('sub', M0, nm('D2'), strike - M0, 0.7, { att: 1, rel: 0.2 });
  for (let b = red + 0.5, i = 0; b < strike - 1e-6; b += 0.125, i++) C.n('glass', b, STACK_HI[i % 5] - 12, 0.125, 0.12 + 0.35 * (b - red) / Math.max(1, strike - red), { arp: 1, t60: 0.4, pan: (i % 2 ? 0.35 : -0.35) });
  C.ch('strings', red, NN('A3 E4'), strike - red, 0.2, { att: 1.5, rel: 0.05, trem: 14 });
  // ---- the sword strikes the floor: a hit — and the Void breaks: its music dies with it
  C.n('clunk', strike, nm('D2'), 1, 1.0, { t60: 2.2 });
  stab(C, strike, 'both', 1.15);
  C.n('tamtam', strike, 0, 1, 0.7, { dec: 4 });
  C.ch('glass', shatter, NN('D6 G#6 A6 D7'), 1, 0.3, { arp: 1, t60: 1.2 });
  C.silence(gone + 0.5, END);
} });

// ====================================================================================== 2. a3_sixth
HT.music.cue({ id: 'a3.breath', from: 'a3_sixth', to: 'a3_sixth', level: LV.void + TRIM.breath, fn: C => {
  const S = 'a3_sixth', END = C.endBeat;
  const sword = bt(C.cueT(S, 'swordRing', 3.9)), sink = bt(C.cueT(S, 'shadowRise', 4.5));
  const glints = fxOf(S).filter(e => e.fx === 'voidBloom').map(e => [e.t, e.dur || 0.12]);
  const fl = glints.length ? glints : [[7.0, 0.16], [7.42, 0.1]];
  const bleed = bt(shotT(S, 'closeup', 8.2)), raise = bt(evT(S, e => e.fx === 'a3wheel', 11.35));
  const shrine = bt(C.cueT(S, 'shrineRise', 12.45)), laugh = bt(shotT(S, 'closeup', 15.9, 2)), two = bt(shotAfter(S, 'static', 16.5, 17.1));
  // ---- breath: only a floor
  C.n('sub', 1, nm('D2'), sink + 2, 0.5, { att: 2, rel: 2 });
  // the sword plants: the ostinato's last step, low and far; Mahoraga sinks back into the shadow
  C.n('clunk', sword, nm('D3'), 1, 0.45, { t60: 1.6, pan: -0.2 });
  C.ch('strings', sink, NN('D2 G#2'), 2, 0.12, { att: 0.3, rel: 1.2, cut: 700 });
  // ---- the sixth expansion: two glints of the Void's chord — and nothing
  fl.forEach(([t, d], i) => C.ch('tone', bt(t), NN('D6 A6 E7'), Math.max(0.12, bt(d)), 0.55 - 0.15 * i, { att: 0.01, rel: 0.05, beat0: 0.5, beat1: 3, oct: 0 }));
  C.n('koto', bleed + 0.4, nm('A4'), 1, 0.3, { let: 1, t60: 2.5, pan: 0.1 });                     // the cost
  // ---- the wheel over his head: its hum; his Shrine chokes as it forms
  wheelHum(C, raise, laugh - raise, 0, 0.5);
  C.n('bell', shrine, nm('Eb5'), 0.5, 0.35, { t60: 0.6, pan: 0.3 });
  C.n('shamisen', shrine + 0.1, nm('Eb4'), 0.25, 0.45, { pan: 0.3 });
  // ---- Gojo laughs: a koto flourish (up the Lydian and back), ringing out
  NN('D5 E5 F#5 G#5 A5 B5 C#6 D6 E6 D6 C#6 A5').forEach((m, i) => C.n('koto', laugh + i * 0.125, m, 0.25, 0.3 + 0.012 * i, { pan: -0.3 + 0.05 * i }));
  C.n('koto', laugh + 1.5, nm('D6'), 1, 0.38, { let: 1, t60: 3 });
  // ---- the two-shot: burnt out, grinning — a light pulse picks up toward the fists
  for (let b = Math.ceil(two + 1); b < END - 1e-6; b += 0.5) C.n('shime', b, 0, 0.25, 0.14 + 0.1 * (b - two) / Math.max(1, END - two), {});
  C.ch('strings', two, NN('D3 A3'), END - two, 0.14, { att: 1.2, rel: 0.3 });
} });

// ====================================================================================== 3–4. a3_drag → a3_decoys
HT.music.cue({ id: 'a3.blue', from: 'a3_drag', to: 'a3_decoys', level: LV.clash + TRIM.blue, fn: C => {
  const Dg = 'a3_drag', Dc = 'a3_decoys', D0 = C.sceneT(Dc), END = C.endBeat;
  // drag (its scene seconds = cue seconds)
  const pull = bt(C.cueT(Dg, 'blueImplode', 0.68)), hook = (C.cuesOf(Dg, 'hitH')[0] || { b: bt(1.07) }).b;
  const slam = bt(C.cueT(Dg, 'wallCrash', 2.42)), g0 = bt(C.cueT(Dg, 'steelGroan', 3.05) - 0.05), g1 = bt(4.75);
  const thr = bt(cueList(C, Dg, 'whooshL', [1.8, 5.0])[1]), land = bt(C.cueT(Dg, 'groundSlam', 5.42));
  const trap = bt(evT(Dg, e => e.who === 'gojo' && e.do === 'blue' && e.t > 6, 7.1)), heap = bt(C.cueT(Dg, 'collapse', 9.7));
  const hold = bt(shotAfter(Dg, 'static', 11, 11.2));
  // decoys
  const burst = bt(C.cueT(Dc, 'boom', 0.45)), stomp = bt(C.cueT(Dc, 'groundSlam', 4.34));
  const flip = (C.cuesOf(Dc, 'block')[0] || { b: bt(D0 + 4.62) }).b, warm = bt(C.cueT(Dc, 'wheelTurn', 6.0));
  const blinks = C.cuesOf(Dc, 'blink'), eyes = bt(D0 + shotT(Dc, 'ecu', 10.8)), hb = bt(C.cueT(Dc, 'heartbeat', 14.1));
  const cat = (C.cuesOf(Dc, 'block')[1] || { b: bt(D0 + 12.2) }).b, fist = bt(D0 + shotAfter(Dc, 'static', 13, 13.4)), punch = bt(lastCue(C, Dc, 'whooshL', 19.05));
  // ---- fists and Blue: a bright driving groove, Gojo's head on glass
  groove(C, 0, land, BLUE, BLUE_S, B_LYD, 0.8);
  C.mel('glass', 0, G.a.concat(V.disp(V.frag(G.b, 0, 3), 8)), 0.62, { vib: 8, rel: 0.3 });
  C.mel('strings', 0, V.oct(G.a, -1), 0.36, { att: 0.05, rel: 0.3 });
  NN('A5 D6 E6 A6').forEach((m, i) => C.n('glass', pull + i * 0.06, m, 0.25, 0.25, { arp: 1, t60: 0.6, pan: -0.3 + 0.2 * i }));   // the pull
  stab(C, hook, 'lyd', 1.0);
  stab(C, slam, 'lyd', 1.05); C.n('tamtam', slam, 0, 1, 0.45, { dec: 3 });
  // the drag along the facade: a grinding chromatic cluster that thickens, the shamisen scraping under it
  C.ch('strings', g0, NN('D3 Eb3 E3'), g1 - g0, 0.26, { att: 0.2, rel: 0.2, trem: 16 });
  C.ch('strings', g0 + 1, NN('F3 F#3'), g1 - g0 - 1, 0.22, { att: 0.3, rel: 0.2, trem: 16 });
  for (let x = q16(g0), i = 0; x < g1 - 1e-6; x += 0.25, i++) C.n('shamisen', x, nm(i % 2 ? 'Eb3' : 'D3'), 0.25, 0.35 + 0.2 * (x - g0) / Math.max(1, g1 - g0), { pan: 0.2, buzz: 3 });
  NN('D5 E5 F#5 A5 B5 D6').forEach((m, i) => C.n('glass', thr + i * 0.08, m, 0.25, 0.28, { arp: 1, t60: 0.5, pan: 0.2 }));   // the throw
  stab(C, land, 'lyd', 1.1); C.n('dbass', land, nm('D1'), 2, 0.6, { cut: 260, rel: 0.6 });
  // ---- the trap: two lines converge on the Blue — high falling, low rising — and meet as the heap falls
  const HI = NN('D7 C#7 B6 A6 G#6 F#6 E6 D6'), LO = NN('D3 E3 F#3 G#3 A3 B3 C#4 D4');
  for (let k = 0; k < 8; k++) { const b = trap + (heap - trap) * (1 - Math.pow(1 - k / 8, 1.6)); C.n('glass', b, HI[k], 0.5, 0.2 + 0.03 * k, { arp: 1, t60: 0.7, pan: 0.3 }); C.n('strings', b, LO[k], Math.max(0.5, heap - b), 0.16 + 0.02 * k, { att: 0.1, rel: 0.1 }); }
  for (let b = Math.ceil(trap), i = 0; b < heap - 1e-6; b += (b < heap - 2 ? 0.5 : 0.25), i++) C.n('taiko', b, 0, 0.5, 0.45 + 0.4 * (b - trap) / Math.max(1, heap - trap), { kind: i % 2 ? 'do' : 'don', dec: 0.8 });
  stab(C, heap, 'lyd', 1.05); C.ch('glass', heap, NN('D5 A5 D6'), 1, 0.3, { arp: 1, t60: 1.5 });
  C.n('tamtam', heap, 0, 1, 0.4, { dec: 3 });
  // ---- the hold: the dust settles, Gojo waits, loose; the wheel hums over the heap
  C.ch('strings', hold, NN('D2 A2'), bt(D0) - hold, 0.18, { att: 1.5, rel: 1 });
  wheelHum(C, hold + 1, bt(D0) - hold - 1, 0, 0.35);
  [[0, 'D5'], [1, 'A5'], [2, 'G#5'], [2.5, 'A5'], [3, 'B5'], [6, 'A5'], [8, 'E5']].forEach(([d, n], i) => C.n('koto', hold + 4 + d, nm(n), 1, 0.26 - 0.01 * i, { let: 1, t60: 2.5, pan: -0.2 }));
  // ---- Sukuna bursts out: his taiko groove and his head in the low strings
  stab(C, burst, 'phr', 1.0);
  const R0 = Math.ceil(burst + 0.5), R1 = bt(D0 + 7.2);
  groove(C, R0, R1, SUKU, SUKU_S, B_PHR, 0.78);
  C.mel('strings', R0, SK.a.concat(V.disp(SK.b, 8)), 0.5, { att: 0.05, rel: 0.3 });
  C.mel('dbass', R0, V.oct(SK.a, -1), 0.66, { cut: 380, drive: 1 });
  C.n('taiko', stomp, 0, 1, 0.9, { kind: 'don' }); C.n('dbass', stomp, nm('D1'), 1, 0.7, { cut: 240 });
  // the amplified flip-kick: his rub — the wheel greys: its hum sags flat, then warms back to pitch at the turn
  stab(C, flip, 'phr', 1.05);
  wheelHum(C, flip, warm - flip, 0, 0.45, 0.35);
  wheelHum(C, warm, R1 - warm, 0, 0.4);
  // ---- four Gojos: his head as a four-voice echo from four sides (the real one first, 0.12 s apart), then a glint
  // at every repositioning blink
  const PAN = [0.6, -0.6, -0.1, 0.25], app = blinks.filter(c => blinks.length && c.t < blinks[0].t + 0.5);
  if (app.length) for (let k = 0; k < 4; k++) {
    const b = k < app.length ? app[k].b : app[app.length - 1].b + bt(0.12) * (k - app.length + 1);
    V.frag(G.a, 0, 3).forEach(([d, m, l]) => C.n('glass', b + d * 0.5, m, l * 0.5, 0.3 - 0.04 * k, { arp: 1, t60: 0.8, pan: PAN[k] }));
  }
  blinks.slice(app.length).forEach((c, k) => C.n('glass', c.b, nm(['E6', 'A6', 'F#6', 'D7'][k % 4]), 0.5, 0.22, { arp: 1, t60: 0.9, pan: PAN[(k + 2) % 4] }));
  C.ch('strings', R1, NN('A4 E5'), eyes - R1, 0.12, { att: 0.8, rel: 0.2, trem: 12, pont: 1 });
  C.ch('strings', eyes, NN('D3 Eb3 A3'), cat - eyes, 0.22, { att: 0.8, rel: 0.05, trem: 14 });   // his eyes dart
  // the catch: his stab; the echoes are gone
  stab(C, cat, 'phr', 1.1);
  // ---- the dark fist: his head low, a cluster crescendo and a heartbeat that quickens into the punch
  C.mel('strings', fist, V.frag(SK.a, 0, 6), 0.5, { att: 0.08, rel: 0.4 });
  C.mel('dbass', fist, V.oct(V.frag(SK.a, 0, 6), -1), 0.7, { cut: 360, drive: 1 });
  C.ch('strings', fist + 4, NN('D2 Eb2 A2'), punch - fist - 4, 0.22, { att: 2, rel: 0.05, trem: 12 });
  const h0 = Math.ceil(hb + 1.5), h1 = Math.floor(fist + 7);                     // after the scene's own heartbeat
  heart(C, h0, h1, 2, 0.5, 0.65);
  heart(C, h1, punch - 0.5, 1, 0.65, 0.95);
  C.n('riser', END - 4, nm('D3'), 4, 0.4, { from: 250, to: 5000, q: 2.4, tone: 1 });            // into a3_signal's hit
} });

// ====================================================================================== 5. a3_signal
HT.music.cue({ id: 'a3.signal', from: 'a3_signal', to: 'a3_signal', level: LV.clash + TRIM.signal, fn: C => {
  const S = 'a3_signal', END = C.endBeat;
  const hit = bt(C.cueT(S, 'hitH', 0.06)), grab = bt(C.cueT(S, 'signalTick', 1.9)), perch = bt(C.cueT(S, 'dropSoft', 2.63));
  const walk = bt(shotAfter(S, 'static', 3, 3.4)), turn = bt(cueList(C, S, 'wheelClunk', [8.0])[0]), regard = bt(shotAfter(S, 'static', 9, 9.7));
  const green = bt(C.cueT(S, 'crosswalkChirp', 12.72)), launch = bt(evT(S, e => e.who === 'gojo' && e.do === 'fly' && e.t > 13, 13.33));
  const rip = bt(C.cueT(S, 'blueImplode', 13.62)), smack = bt(C.cueT(S, 'hitM', 13.87)), inf = bt(C.cueT(S, 'infinityStop', 14.72));
  const drop = bt(evT(S, e => e.sfx === 'glassTinkle', 17.27)), grin = bt(C.cueT(S, 'footConcrete', 16.4));
  const gone = bt(C.cueT(S, 'dashAir', 18.6)), road = bt(shotAfter(S, 'static', 20, 20.2));
  // ---- the counter lands on his palm — and blows him 90 m back (a falling run)
  stab(C, hit, 'phr', 1.1); C.n('tamtam', hit, 0, 1, 0.45, { dec: 3 });
  NN('A6 F#6 E6 D6 C#6 A5 G#5 F#5 E5 D5 A4 D4').forEach((m, i) => C.n('glass', hit + 0.25 + i * 0.25, m, 0.25, 0.3 - 0.012 * i, { arp: 1, t60: 0.6, pan: -0.4 + 0.07 * i }));
  C.n('koto', grab, nm('A4'), 0.5, 0.4, { pan: 0.1 });
  // the perch: a quick koto flick up, and Gojo's cool motif
  NN('D5 E5 F#5 A5').forEach((m, i) => C.n('koto', perch - 0.5 + i * 0.125, m, 0.25, 0.3, { pan: -0.2 }));
  C.mel('glass', perch + 0.2, V.frag(G.a, 0, 3), 0.34, { vib: 6, rel: 0.5 });
  // ---- Sukuna walks in out of the dust, unhurried: his theme low, a resting heart
  C.mel('strings', walk, SK.a, 0.46, { att: 0.1, rel: 0.5 });
  C.mel('dbass', walk, V.oct(SK.a, -1), 0.64, { cut: 340, drive: 1 });
  heart(C, Math.ceil(walk), turn, 2, 0.4, 0.55);
  // ---- the wheel turns (adaptation 1): the ostinato on F
  wheelBar(C, turn, 1, 0.9, 0.4);
  // ---- the regard: the one fifth both stand on, and the wheel's hum (now on F–B)
  C.ch('strings', regard, NN('D3 A3'), green - regard + 1, 0.2, { att: 1.2, rel: 0.3 });
  wheelHum(C, turn + 4, launch - turn - 4, 1, 0.35);
  // ---- green: both launch — a burst: The Strongest's heads in a quick stretto over the drive
  const L0 = q16(launch);
  C.level(launch - 0.05, -3, 0.02); C.level(inf - 0.05, 0, 0.02);                  // room for the rip, the throw and the groan
  C.n('taiko', launch, 0, 1, 0.85, { kind: 'don' });
  groove(C, L0, inf, DRIVE, DRIVE_S, B_LYD, 0.6);
  C.mel('glass', L0, V.aug(V.frag(G.a, 0, 4), 0.5), 0.5, { vib: 8, rel: 0.25 });
  C.mel('strings', L0 + 0.5, V.aug(V.frag(SK.a, 0, 4), 0.5), 0.45, { att: 0.03, rel: 0.2 });
  NN('A5 E6 A6').forEach((m, i) => C.n('glass', rip + i * 0.05, m, 0.25, 0.3, { arp: 1, t60: 0.6 }));
  stab(C, smack, 'lyd', 0.7);
  // the Infinity stops it an inch from his face: glass — and the music freezes on one high tone until it drops
  ARR.accent(C, inf, 'inf', 1.2);
  C.n('tone', inf, nm('A6'), drop - inf, 0.4, { att: 0.02, rel: 0.3, beat0: 0.1, beat1: 0.6, oct: 0 });
  C.n('glass', inf, nm('D7'), 2, 0.3, { vib: 0, att: 0.01, rel: 1.2 });
  C.mel('strings', grin, V.frag(SK.a, 0, 3), 0.36, { att: 0.1, rel: 0.4 });                      // he grins up at him
  // ---- both launch after each other: a riser — cut dead on the empty junction and the dead signal
  C.n('riser', gone - 1, nm('D3'), road - gone + 1, 0.42, { from: 300, to: 6000, q: 2.4, tone: 1 });
  for (let b = Math.ceil(gone * 4) / 4; b < road - 1e-6; b += 0.25) C.n('shime', b, 0, 0.25, 0.35 + 0.4 * (b - gone) / Math.max(0.5, road - gone), {});
  C.silence(road, END);
} });

// ====================================================================================== 6. a3_chase
HT.music.cue({ id: 'a3.chase', from: 'a3_chase', to: 'a3_chase', level: LV.clash + TRIM.chase, fn: C => {
  const S = 'a3_chase', END = C.endBeat;
  const turns = cueList(C, S, 'wheelClunk', [3.1, 17.45]).map(bt);
  const under = bt(evT(S, e => e.env && e.env.set === 'city', 4.9)), blues = C.cuesOf(S, 'blueImplode').filter(c => c.t < 8);
  const orbFx = fxOf(S).filter(e => e.fx === 'blueOrb' && /^o\d$/.test(e.at)).map(e => e.t);
  const orbs = (orbFx.length ? orbFx : [10.9, 10.95, 11, 11.05, 11.1, 11.15, 11.2, 11.25]).map(bt);
  const free = bt(lastCue(C, S, 'wallCrash', 12.0));
  const air = C.cuesOf(S, ['block', 'hitH']), deck = bt(C.cueT(S, 'bodyFall', 15.35)), alight = bt(shotAfter(S, 'static', 18, 18.6));
  // ---- the aerial chase: driving percussion; the second turn of the wheel (G♯) woven into the groove
  groove(C, 0, orbs[0] - 2, ['DdDdDdDdDdDdDdDd', 'DdDdDdDdDddDdDdD'], ['ssSsssSsssSsssSs'], B_LYD, 0.8);
  C.mel('glass', 0, V.aug(V.frag(G.a, 0, 4), 0.5), 0.5, { vib: 6, rel: 0.25 });
  C.mel('glass', 4, V.aug(V.frag(G.b, 0, 4), 0.5), 0.5, { vib: 6, rel: 0.25 });
  wheelBar(C, Math.round(turns[0] * 4) / 4, 2, 0.9, 0.45);                      // on the groove's 16th grid (≤ 62 ms)
  // under the expressway: the piers march past; two Blues land (his fifths)
  C.mel('strings', under, V.frag(SK.a, 0, 6), 0.5, { att: 0.04, rel: 0.25 });
  blues.forEach(c => stab(C, c.b, 'lyd', 0.85));
  // ---- the facade: the groove drops to a pulse; eight orbs bloom 50 ms apart on the Lydian stack and close in
  heart(C, Math.ceil(orbs[0] - 2), orbs[0], 1, 0.5, 0.7);
  const ST8 = NN('D5 A5 E6 B6 F#6 C#7 G#7 D7');
  orbs.slice(0, 8).forEach((b, k) => C.n('glass', b, ST8[k], Math.max(0.5, free - b), 0.2 + 0.02 * k, { vib: 0, att: 0.02, rel: 0.1, pan: -0.6 + 0.17 * k }));
  C.ch('strings', orbs[0], NN('D4 A4 E5'), free - orbs[0], 0.2, { att: 0.8, rel: 0.05, trem: 14 });
  stab(C, free, 'both', 0.8); C.n('tamtam', free, 0, 1, 0.35, { dec: 3 });           // under 8 implosions + a wall crash
  // ---- mid-air: the blows (blocks light, the palm and the orb's gouge heavy)
  air.forEach(c => { if (c.sfx === 'hitH') stab(C, c.b, 'lyd', 0.85); else C.n('taiko', c.b, 0, 0.5, 0.6, { kind: 'don' }); });
  groove(C, q16(free + 0.5), deck, ['D.ddD.dkD.ddDdDd'], ['s.s.S.s.s.s.S.ss'], B_PHR, 0.7);
  // ---- the deck: he crashes down; rising, the wheel turns a third time (B)
  stab(C, deck, 'phr', 1.0); C.n('dbass', deck, nm('D1'), 2, 0.6, { cut: 260, rel: 0.6 });
  if (turns[1] != null) { wheelBar(C, turns[1], 3, 0.95, 0.45); wheelHum(C, turns[1] + 4, END - turns[1] - 4, 3, 0.3); }
  // Gojo alights: a breath
  C.ch('strings', alight, NN('D3 A3'), END - alight, 0.14, { att: 1.5, rel: 0.5 });
} });

// ====================================================================================== 7–8. a3_red → a3_blackflash
HT.music.cue({ id: 'a3.red', from: 'a3_red', to: 'a3_blackflash', level: LV.clash + TRIM.red, fn: C => {
  const R = 'a3_red', K = 'a3_blackflash', K0 = C.sceneT(K), END = C.endBeat;
  const drop = bt(C.cueT(R, 'groundSlam', 1.02)), stalk = bt(evT(R, e => e.who === 'sukuna' && e.do === 'walk', 2.4));
  const ready = bt(evT(R, e => e.who === 'gojo' && e.pose === 'a3redTwoA', 6.1)), fire = bt(C.cueT(R, 'redBlast', 8.15)), arms = bt(C.cueT(R, 'hitH', 8.31));
  const curve = bt(C.cueT(R, 'flyBy', 8.35)), grin = bt(evT(R, e => e.who === 'sukuna' && e.do === 'expr' && e.face === 'grin' && e.t > 9, 10.4));
  const back = bt(lastCue(C, R, 'redBlast', 13.8)), slow = bt(shotAfter(R, 'static', 14.5, 15.0));
  const bf = bt(C.cueT(K, 'blackFlash', 0.15)), tin = bt(C.cueT(K, 'tinnitus', 0.8)), page = bt(K0 + shotT(K, 'panels', 3.0));
  // ---- the colonnade: he drops down and stalks between the piers — nothing moves
  C.n('taiko', drop, 0, 0.5, 0.55, { kind: 'do' });
  C.ch('strings', stalk, NN('D2 Eb2'), ready - stalk, 0.16, { att: 1.5, rel: 0.5, trem: 8, cut: 900 });
  for (let b = Math.ceil(stalk); b < ready - 1e-6; b += 1) C.n('shime', b, 0, 0.25, 0.22, { kind: 'ka', pan: (b % 2 ? 0.3 : -0.3) });
  // ---- behind the pier: Red, for the first time in this fight — Gojo's head rising, a tremolo
  C.mel('glass', ready + 0.5, V.frag(G.a, 0, 4.5), 0.4, { vib: 7, rel: 0.3 });
  C.ch('strings', ready, NN('A3 E4'), fire - ready, 0.2, { att: 1, rel: 0.05, trem: 14 });
  C.n('riser', ready + 1, nm('A3'), fire - ready - 1, 0.3, { from: 400, to: 6000, q: 2, tone: 1 });
  // fired through the pier; his crossed arms blunt it (his rub over Gojo's fifths)
  stab(C, arms, 'both', 1.0);
  // the curve: a glass arc up and away
  NN('A5 C#6 E6 G#6 A6 G#6 E6 C#6').forEach((m, i) => C.n('glass', curve + i * 0.3, m, 0.5, 0.2 - 0.012 * i, { arp: 1, t60: 0.8, pan: 0.5 - 0.12 * i }));
  C.mel('strings', grin, V.frag(SK.a, 0, 4), 0.44, { att: 0.08, rel: 0.4 });                      // he grins
  // ---- the Red comes round — he doesn't see it: a quickening pulse and a rising tremolo into his back
  const u0 = grin + 4;
  C.ch('strings', u0, NN('D3 Eb3 A3'), back - u0, 0.2, { att: 1.5, rel: 0.05, trem: 13 });
  for (let b = Math.ceil(u0), i = 0; b < back - 1e-6; b += (b < back - 2 ? 1 : 0.5), i++) C.n('taiko', b, 0, 0.5, 0.45 + 0.35 * (b - u0) / Math.max(1, back - u0), { kind: i % 2 ? 'do' : 'don', dec: 0.8 });
  C.n('riser', back - 3, nm('D3'), 3, 0.4, { from: 250, to: 5500, q: 2.4, tone: 1 });
  stab(C, back, 'lyd', 1.15); C.n('dbass', back, nm('D1'), 2, 0.6, { cut: 280, rel: 0.6 }); C.n('tamtam', back, 0, 1, 0.5, { dec: 3 });
  // ---- the slow approach: time stretched — one high tone over the Lydian stack swelling, a long riser …
  const pre = bf - bt(0.1);
  C.n('tone', slow, nm('D7'), pre - slow, 0.35, { att: 1.2, rel: 0.02, beat0: 0.1, beat1: 2.5, oct: 0 });
  NN('D3 A3 E4 B4 F#5').forEach((m, i) => C.n('strings', slow + i * 0.75, m, pre - slow - i * 0.75, 0.14 + 0.02 * i, { att: 1.5, rel: 0.02 }));
  C.n('riser', slow + 1, nm('D3'), pre - slow - 1, 0.45, { from: 200, to: 7000, q: 2.2, tone: 1.5 });
  // … and the music pulls out 0.1 s before the contact (C.silence would reopen the gate 15 ms early and let the reverb
  // tail of the swell back in; here it reopens 2 ms before the hit with a 2 ms time constant)
  C.hole(pre, bf); C.g('gate', pre, 0, 0.004); C.g('gate', bf - bt(0.002), 1, 0.002);
  // ---- BLACK FLASH: the act's loudest hit (this cue lifted through it), black lightning edged with red. The SFX own the
  // crack and the sub-bass (blackFlash, hitHuge, boom, subDrop); the music's weight is the sustained mid-range just after
  // it (the ensemble's sforzando cluster, the sawari, the tam-tam's bloom). Doubling the transient and the sub (taiko,
  // sub drop, low bass — the first draft) only made the limiter pull the whole hit down (measured, M3)
  C.level(bf - 0.05, 8, 0.004);
  C.ch('strings', bf, NN('A2 D3 Eb3 G#3 D4 Eb4'), 0.5, 1.4, { sfz: 1, rel: 1.6 });
  C.ch('glass', bf, NN('D6 G#6 A6 D7'), 1, 1.0, { arp: 1, t60: 1.8 });
  C.n('shamisen', bf, nm('D3'), 0.5, 1.4, { pan: 0.2, buzz: 3.2 });
  C.n('tamtam', bf, 0, 1, 1.4, { dec: 6 });
  // ---- it drains into the tinnitus; then a long silence (from the manga page to the end of the scene)
  C.fadeOut(Math.max(bf + 1, tin + 0.4), page, 8);
  C.silence(page, END);
} });

// ====================================================================================== 9. a3_adapt
HT.music.cue({ id: 'a3.adapt', from: 'a3_adapt', to: 'a3_adapt', level: LV.void + TRIM.adapt, fn: C => {
  const S = 'a3_adapt', END = C.endBeat;
  const notch = bt(cueList(C, S, 'wheelClunk', [1.3])[0]), sink = bt(evT(S, e => e.who === 'wh' && e.do === 'fly', 3.9));
  const rct = bt(C.cueT(S, 'rctHeal', 6.3)), smile = bt(shotT(S, 'closeup', 8.8)), loss = bt(shotT(S, 'closeup', 11.0, 1));
  const shadow = bt(shotAfter(S, 'static', 12.5, 13.0)), tw = C.cuesOf(S, 'shadowRise').filter(c => c.t > 15).map(c => c.b);
  const blk = (SCN(S) && SCN(S).C ? (SCN(S).C.post || []).find(e => e.post === 'black') || { t: 17.3 } : { t: 17.3 }).t;
  // ---- the last notch: the ostinato on D an octave above where it began — the circle closed; a low D resolves it;
  // the wheel blooms gold
  wheelBar(C, notch, 4, 1.0, 0.5);
  C.ch('glass', notch + 0.2, NN('D6 A6'), 3, 0.3, { vib: 0, att: 0.4, rel: 1.4 });
  C.n('clunk', notch + 4, nm('D2'), 1, 0.9, { t60: 2.4 });
  C.n('dbass', notch + 4, nm('D1'), 2, 0.8, { cut: 220, rel: 1 });
  // the wheel drops down through him into his shadow: a slow low fall
  [[0, 'D3'], [1, 'A2'], [2, 'D2']].forEach(([d, n], i) => C.n('strings', sink + d, nm(n), 1.2, 0.2 - 0.03 * i, { att: 0.2, rel: 0.6, cut: 800 }));
  // ---- RCT, the head comes up … and he smiles: his theme, low and unhurried
  C.ch('strings', rct, NN('D2 Eb2'), smile - rct, 0.16, { att: 2, rel: 0.5 });
  C.mel('strings', smile, SK.a, 0.44, { att: 0.1, rel: 0.5 });
  C.mel('dbass', smile, V.oct(SK.a, -1), 0.6, { cut: 340, drive: 1 });
  // ---- Gojo's smile goes: his head, darkened into D Phrygian
  C.mel('glass', loss + 0.3, V.frag(GOJO_DARK, 0, 4), 0.3, { vib: 5, rel: 0.6 });
  // ---- the shadow twitches: a low drone rising; a far clunk at each twitch; fade with the black
  C.ch('strings', shadow, NN('D2 G#2'), END - shadow, 0.2, { att: 2.5, rel: 0.4, trem: 8 });
  C.n('sub', shadow, nm('D2'), END - shadow, 0.6, { att: 2.5, rel: 0.4 });
  tw.forEach((b, i) => C.n('clunk', b, nm('D2'), 1, 0.45 + 0.15 * i, { t60: 1.2 }));
  C.fadeOut(bt(blk), END);
  C.g('gate', END - 0.4, 0, 0.05);              // black: the tails go with it (a4.shadow reopens the gate)
} });
})();
