/* ACT II · 11 — a2_wheel (12 s). Canon ch. 228 ends by cutting between Mahoraga's wheel turning in darkness and Gojo's
   sudden nosebleed. Darkness: a golden eight-handled wheel turns one notch (clunk). Cut: Gojo on the deck, a thin line
   of blood under his nose (stylised, 1 px); he wipes it with his thumb (canon ch. 229 opens with it) and smiles. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const VX = A.VIADUCT_X, DZ = 9.6, G = [VX - 1, 0.1, DZ], SK = [VX + 12, 0.3, DZ];
  HT.fightScene({
    id: 'a2_wheel', act: 'II', title: 'The Wheel Turns', dur: 12, transitionIn: { type: 'cut', dur: 0 },
    set: 'black', env: { time: 'night' },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'guardLow', costume: 'fight' },
    },
    ambience: [],
    script: [
      { t: 0, who: 'gojo', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' },
      // 1. darkness; the wheel floats, still — then one notch (clunk)
      { t: 0, shot: 'static', cam: { x: 0, y: -3.2, z: 1.5, yaw: 0, f: 520, shift: 0 } },
      { t: 0.2, fx: 'wheel', at: [0, 0, 1.5], r: 0.55, from: 0, notch: 1, turnAt: [2.6], dur: 4.6, sfx: false },
      { t: 2.6, sfx: 'wheelClunk', vol: 0.9 },
      // 2. the deck, noon: Gojo — a thin line of blood under his nose; he wipes it with his thumb, smiles
      { t: 5.0, env: { set: 'city', time: 'noon', snow: 0.25 } },
      { t: 5.0, amb: 'wind', vol: 0.25, fade: 0.4 },
      { t: 5.0, who: 'gojo', do: 'show' }, { t: 5.0, who: 'sukuna', do: 'show' },
      { t: 5.0, shot: 'closeup', who: 'gojo', yaw: Math.PI / 2 + 0.25, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'glow', bleed: 0.6 }, size: 260, bg: 'haze', haze: C.steel, dim: 0.3 },
      { t: 7.4, shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.5, lead: 60 },
      { t: 7.6, who: 'gojo', do: 'pose', pose: 'wipe', dur: 0.35 },
      { t: 7.6, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow', bleed: true },
      { t: 8.5, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 9.2, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.4 },
      { t: 9.6, shot: 'closeup', who: 'gojo', yaw: Math.PI / 2 + 0.25, dist: 6, f: 820, bust: { expr: 'smirk', eyes: 'glow' }, size: 260, bg: 'haze', haze: C.steel, dim: 0.3 },
    ],
  });
})();
