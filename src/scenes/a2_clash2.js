/* ACT II · 8 — a2_clash2 (28 s). Canon ch. 227: the Shrine widens to maximum range (crimson spreads across the
   district; `shred` grows to r 130); Gojo expands again — a heavier, darker shell, tough against the outside (tally 2).
   Inside: Sukuna fights with Domain Amplification (dark aura on the fists) — jabs to the chest, a chop snaps Gojo's head
   back; Gojo counterpunches the ribs; Sukuna spins behind him and grabs his leg, back to back (touching Gojo makes
   him immune to the Void); his eyes narrow — a binding vow (canon: he gives up his sure-hit inside and narrows his
   range so the cuts outside hit harder); the shell collapses. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const SH = A.SHRINE, P = [A.G0[0] - 16, A.G0[1] - 4, 0];
  const G = [P[0] + 1.4, P[1], 0], S0 = [P[0] + 3.4, P[1] + 0.2, 0], D = [P[0] + 2.4, P[1] + 0.1, 0];
  const PAL2 = { body: C.ink, line: C.navy, edge: C.indigo, hi: C.blue, ring: C.sky };
  HT.fightScene({
    id: 'a2_clash2', act: 'II', title: 'Maximum Range', dur: 28, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'guard', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'guardLow', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.5 }, { name: 'wind', vol: 0.3 }],
    script: [
      // 1. the Shrine widens to its full range: the crimson floods the district; buildings further out come apart
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 10, sky: 0, dur: 10, sfx: false, sets: ['city'] },
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 120, h: 0.01, rise: 0.01, spread: 5, slashes: 0, sky: 0, dur: 10, sfx: false, layer: 'ground', sets: ['city'] },
      { t: 0, who: 'gojo', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0, shot: 'static', cam: { x: -60, y: -110, z: 70, yaw: 0.66, pitch: -0.42, f: 280 }, to: { x: -56, y: -104, z: 68 }, dur: 6, ease: 'linear', twos: true },
      { t: 0.4, damage: { kind: 'shred', x: SH[0], y: SH[1], r: A.SHRED2, dur: 5.2 } },
      { t: 0.4, sfx: 'shrineRise', vol: 0.6 },
      { t: 1.4, sfx: 'buildingSlide', vol: 0.6, dur: 2.5 }, { t: 3.4, sfx: 'glassShatter', vol: 0.6 },
      { t: 1.8, fx: 'dust', at: [-30, -38, 10], n: 20, r: 16, size: 5, rise: 1.4, dur: 6 },
      { t: 3.2, fx: 'dust', at: [-38, 38, 10], n: 20, r: 16, size: 5, rise: 1.4, dur: 6 },
      // 2. Gojo expands again: a darker, heavier dome over the two of them (tally 2)
      { t: 6.0, shot: 'static', cam: { x: D[0] - 26, y: D[1] - 30, z: 8, yaw: 0.72, pitch: 0.05, f: 300 } },
      { t: 6.0, fx: 'barrier', center: D, r: 12, state: 'grow', grow: 1.2, pal: PAL2, dur: 4, sets: ['city'] },
      { t: 6.0, sfx: 'voidOpen', vol: 0.8 },
      { t: 6.6, post: 'tally', n: 2, dur: 3.4 },
      { t: 6.6, sfx: 'tallyTick', vol: 0.6 },
      // 3. inside: amplification — dark aura on Sukuna's fists; jab, jab to the chest, a chop snaps Gojo's head back
      { t: 10.0, env: { set: 'void', time: 'void' } },
      { t: 10.0, who: 'gojo', do: 'show' }, { t: 10.0, who: 'sukuna', do: 'show' },
      { t: 10.0, shot: 'medium', on: ['gojo', 'sukuna'], size: 128, yaw: 0.15 },
      { t: 10.0, fx: 'amplify', at: ['sukuna.hand', 'sukuna.hand2'], r: 0.3, dur: 6.8 },
      { t: 10.0, sfx: 'infinityHum', vol: 0.3, pitch: 0.5, dur: 6 },
      { t: 10.4, who: 'sukuna', do: 'jab', target: 'gojo', hit: 'hit', strength: 1, speed: 1.3 },
      { t: 10.9, who: 'sukuna', do: 'jab', target: 'gojo', hit: 'hit', strength: 2, speed: 1.3 },
      { t: 11.5, who: 'sukuna', do: 'slash', target: 'gojo', hit: 'hit', strength: 3, react: 'hitHigh', speed: 1.1 },
      { t: 12.3, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 2, react: 'hitMid', speed: 1.2 },
      { t: 12.6, kana: 'ドスッ', x: 380, y: 110, size: 2, dur: 0.7, style: 'impact' },
      // 4. Sukuna spins behind him — back to back — and grabs his leg (close on the grip), then the vow
      { t: 13.6, who: 'sukuna', do: 'blink', to: [G[0] - 0.9, G[1] + 0.3, 0], face: 'west' },
      { t: 13.7, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.1 },
      { t: 13.6, shot: 'low', on: ['gojo', 'sukuna'], size: 140, yaw: 0.3, height: 0.25, feetY: 320 },
      { t: 13.7, sfx: 'whooshM', vol: 0.6 },
      { t: 14.3, shot: 'follow', who: 'gojo', offset: [0.4, -1.8, 0.35], aimZ: 0.3, f: 520 },
      { t: 14.3, kana: 'ガシッ', x: 380, y: 150, size: 2, dur: 0.8, style: 'impact' },
      { t: 15.6, shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 + 0.25 },
      { t: 15.6, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 15.8, sfx: 'subDrop', vol: 0.7 },
      // 5. outside: the vow darkens the shell — and it caves in
      { t: 17.8, env: { set: 'city', time: 'shrine' } },
      { t: 17.8, who: 'gojo', do: 'hide' }, { t: 17.8, who: 'sukuna', do: 'hide' },
      { t: 17.8, fx: 'shrineBloom', at: SH, back: 0, r: 120, h: 22, rise: 0.01, spread: 0.01, slashes: 14, sky: 0, dur: 10.2, sfx: false, sets: ['city'] },
      { t: 17.8, fx: 'barrier', center: D, r: 12, state: 'hold', pal: PAL2, dur: 3.2, sfx: false, sets: ['city'] },
      { t: 17.8, fx: 'domeRake', center: D, r: 12, rate: 34, hold: true, dur: 3.2, sets: ['city'] },
      { t: 17.8, sfx: 'cleave', vol: 0.45, dur: 3.2 },
      { t: 17.8, shot: 'static', cam: { x: D[0] - 14, y: D[1] - 22, z: 3, yaw: 0.56, pitch: 0.2, f: 300 } },
      { t: 21.0, fx: 'barrierShatter', center: D, r: 12, crack: 0.5, pal: PAL2, dur: 2.2, sets: ['city'], sfx: false },
      { t: 21.5, sfx: 'barrierShatter', vol: 1 },
      { t: 21.5, shake: 0.5 },
      { t: 23.4, who: 'gojo', do: 'show' }, { t: 23.4, who: 'sukuna', do: 'show' },
      { t: 23.4, who: 'gojo', do: 'place', at: G, face: 'east', pose: 'guardLow' },
      { t: 23.4, who: 'sukuna', do: 'place', at: [G[0] - 0.9, G[1] + 0.3, 0], face: 'west', pose: 'crouch' },
      { t: 23.4, shot: 'medium', on: ['gojo', 'sukuna'], size: 130, yaw: 0.2 },
      { t: 23.4, who: 'gojo', do: 'expr', face: 'strain', eyes: 'glow' },
    ],
  });
})();
