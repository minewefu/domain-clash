/* ACT II · 3 — a2_shred (26 s). Canon ch. 225: the barrierless Shrine cuts the Void's barrier from OUTSIDE. Slashes
   rain on the dome's shell; the district around the Shrine is shredded (ledger `shred`, r 70: towers cut into slabs
   that slide). Inside the Void the two sure-hits cancel — nothing happens; Sukuna smiles. Outside, the shell cracks
   all over and shatters — a hairline flash across Gojo's neck (a white line and an impact frame; no blood). Black. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const G = A.G0, S0 = A.S0, D = A.DOME, SH = A.SHRINE;
  HT.fightScene({
    id: 'a2_shred', act: 'II', title: 'Cut From Outside', dur: 26, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.45 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, who: 'gojo', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' },
      // (the domain FX live in the real city; the Void's interior (8–14 s) is a different space: no shrine, no shell)
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 6, sky: 0, dur: 8, sfx: false, sets: ['city'] },
      { t: 14, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 8, sky: 0, dur: 12, sfx: false, sets: ['city'] },
      { t: 0, fx: 'barrier', center: D, r: 14, state: 'hold', dur: 8, sfx: false, sets: ['city'] },
      { t: 14, fx: 'barrier', center: D, r: 14, state: 'hold', dur: 3.6, sfx: false, sets: ['city'] },
      // 1. high over the junction: the Shrine's range reaches out — buildings come apart in slabs; the dome is raked
      { t: 0, shot: 'static', cam: { x: -20, y: -70, z: 46, yaw: 0.62, pitch: -0.36, f: 290 }, to: { x: -16, y: -64, z: 44 }, dur: 8, ease: 'linear', twos: true },
      { t: 0.4, damage: { kind: 'shred', x: SH[0], y: SH[1], r: A.SHRED1, dur: 7 } },
      { t: 0.4, fx: 'domeRake', center: D, r: 14, rate: 18, hold: true, dur: 7.6, sets: ['city'] },
      { t: 14, fx: 'domeRake', center: D, r: 14, rate: 30, hold: true, dur: 3.6, sets: ['city'] },
      { t: 14, sfx: 'cleave', vol: 0.45, dur: 3.6 },
      { t: 8.0, amb: 'void', vol: 0.5, fade: 0.2 }, { t: 8.0, amb: 'shrine', vol: 0, fade: 0.2 }, { t: 8.0, amb: 'wind', vol: 0, fade: 0.2 },
      { t: 14.0, amb: 'void', vol: 0, fade: 0.2 }, { t: 14.0, amb: 'shrine', vol: 0.45, fade: 0.2 }, { t: 14.0, amb: 'wind', vol: 0.3, fade: 0.2 },
      { t: 0.4, sfx: 'cleave', vol: 0.5, dur: 7 },
      { t: 1.2, fx: 'glass', at: [32, -30, 22], n: 40, speed: 6, dir: [0, -1, 0.3] },
      { t: 2.4, fx: 'dust', at: [40, -34, 8], n: 18, r: 12, size: 4, rise: 1.2, dur: 5 },
      { t: 3.0, sfx: 'buildingSlide', vol: 0.7, dur: 2 },
      { t: 3.6, fx: 'dust', at: [-6, 44, 8], n: 16, r: 10, size: 4, rise: 1.2, dur: 5 },
      { t: 4.4, fx: 'glass', at: [-10, 30, 18], n: 30, speed: 5, dir: [0, -1, 0.2] },
      { t: 5.0, sfx: 'glassShatter', vol: 0.6 },
      // 2. inside the Void: the two sure-hits cancel — they simply stand in the starfield; Sukuna smiles
      { t: 8.0, env: { set: 'void', time: 'void' } },
      { t: 8.0, who: 'gojo', do: 'show' }, { t: 8.0, who: 'sukuna', do: 'show' },
      { t: 8.0, shot: 'static', cam: { x: 30, y: 2.5, z: 1.4, yaw: 0, f: 420, shift: 50 } },
      { t: 8.0, who: 'gojo', do: 'expr', face: 'calm', eyes: 'glow' },
      { t: 8.0, sfx: 'voidOpen', vol: 0.3 },
      { t: 11.0, shot: 'closeup', who: 'sukuna', yaw: -Math.PI / 2 + 0.35, dist: 6, f: 800, bust: { expr: 'smirk', eyes: 'narrow', eyes2: 'open' }, size: 250, bg: 'set' },
      { t: 11.0, who: 'sukuna', do: 'expr', face: 'smirk', eyes: 'narrow', eyes2: 'open' },
      // 3. outside again: the whole shell cracks (the cuts converge) — then it shatters
      { t: 14.0, env: { set: 'city', time: 'shrine' } },
      { t: 14.0, who: 'gojo', do: 'hide' }, { t: 14.0, who: 'sukuna', do: 'hide' },
      { t: 14.0, shot: 'static', cam: { x: 10, y: -8, z: 2.2, yaw: 0.95, pitch: 0.2, f: 280 }, to: { x: 11, y: -6.6 }, dur: 6.2, ease: 'linear', twos: true }, // (the old spot sits under a slid slab of b222)
      { t: 14.0, sfx: 'barrierCrack', vol: 0.8 }, { t: 16.2, sfx: 'barrierCrack', vol: 0.9 },
      { t: 17.6, fx: 'barrierShatter', center: D, r: 14, crack: 2.6, hit: [D[0] + 6, D[1] - 8, 9], dur: 4.2, sets: ['city'], sfx: false },
      { t: 20.2, sfx: 'barrierShatter', vol: 1 },
      { t: 20.2, shake: 0.5 },
      // 4. the shell falls away — close on Gojo: one hairline flash across his neck; his eyes widen (no blood)
      { t: 20.6, env: { set: 'city', time: 'shrine' } },
      { t: 20.6, who: 'gojo', do: 'show' }, { t: 20.6, who: 'sukuna', do: 'show' },
      { t: 20.6, shot: 'closeup', who: 'gojo', yaw: Math.PI / 2 + 0.3, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'glow' }, size: 260, bg: 'haze', haze: C.maroon, dim: 0.45 },
      { t: 22.2, fx: 'screenSlash', x0: 262, y0: 262, x1: 372, y1: 250, dur: 0.6 },
      { t: 22.2, post: 'impact', dur: 2 / 30, mode: '2tone' },
      { t: 22.2, sfx: 'shing', vol: 1 },
      { t: 22.25, shot: 'closeup', who: 'gojo', yaw: Math.PI / 2 + 0.3, dist: 6, f: 820, bust: { expr: 'shock', eyes: 'glow' }, size: 260, bg: 'haze', haze: C.maroon, dim: 0.45 },
      { t: 22.25, kana: 'ザシュ', x: 150, y: 100, size: 3, dur: 0.9, style: 'slash' },
      { t: 24.6, post: 'black', in: 0.4, dur: 1.4 },
    ],
  });
})();
