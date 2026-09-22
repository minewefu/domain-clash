/* ACT II · 2 — a2_expand (24 s). Both expand at once (canon ch. 225). A diagonal page: the Void's interior on Gojo's
   side, the Shrine rising on its skull heap over the crimson city on Sukuna's side — the split line wavers (a territory
   war) and settles at half. Then outside: the black dome grows over the avenue while crimson spreads over the ground
   around it; the Shrine stands OUTSIDE the dome behind Sukuna — no barrier. The sky turns crimson. Tally 1. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const G = A.G0, S0 = A.S0, D = A.DOME, SH = A.SHRINE;
  HT.fightScene({
    id: 'a2_expand', act: 'II', title: 'Domain Expansion', dur: 24, transitionIn: { type: 'flash', dur: 0.3 },
    set: 'city', env: { time: 'noon', snow: 0.3, wind: 0.4, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'signVoid', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'signShrine', costume: 'fight' },
    },
    ambience: [{ name: 'void', vol: 0.3 }, { name: 'shrine', vol: 0.3 }],
    script: [
      { t: 0, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. the territory war: one page, two worlds (panel order right→left: the Shrine's side first)
      { t: 0, shot: 'panels', layout: 'diag', split: [[0, 0.5], [1.4, 0.64], [2.6, 0.38], [3.8, 0.56], [5, 0.5]], panels: [
        { shot: { shot: 'medium', on: ['sukuna'], size: 150, yaw: Math.PI / 2 - 0.4, lead: 80 }, env: { time: 'shrine' } },
        { shot: { shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.4, lead: -80 }, env: { set: 'void', time: 'void' } },
      ] },
      { t: 0.05, fx: 'shrineBloom', at: SH, back: 0, r: 30, h: 22, rise: 1.4, spread: 1.2, slashes: 3, sky: 0, dur: 24, sets: ['city'] },
      { t: 0.05, sfx: 'voidOpen', vol: 0.8, pan: -0.4 }, { t: 0.05, sfx: 'shrineRise', vol: 0.8, pan: 0.4 },
      { t: 1.4, kana: 'ゴゴゴ', x: 470, y: 60, size: 3, dur: 3.2, style: 'rumble' },
      // 2. outside, high over the avenue from the west: the dome swells at the junction, the Shrine rising behind it
      //    (a view down the avenue: from the south-east the 14 m dome sits wholly behind 20–40 m rooftops)
      { t: 6.0, shot: 'static', cam: { x: -30, y: 6, z: 26, yaw: Math.PI / 2, pitch: -0.26, f: 300 }, to: { x: -23, y: 4.5, z: 23.5 }, dur: 6, ease: 'linear', twos: true },
      { t: 6.0, fx: 'barrier', center: D, r: 14, state: 'grow', grow: 1.6, dur: 18, sets: ['city'] },
      { t: 7.2, who: 'gojo', do: 'hide' }, { t: 7.2, who: 'sukuna', do: 'hide' }, // inside the closed dome from here on
      { t: 6.0, sfx: 'barrierUp', vol: 0.9 },
      { t: 6.3, env: { time: 'shrine' } },
      { t: 6.3, sfx: 'domainBloom', vol: 0.7 },
      // 3. ground level at the dome's edge: black shell on one side, the crimson city and the shrine on the other
      { t: 12.0, shot: 'static', cam: { x: 36, y: -12, z: 1.2, yaw: 0.9, f: 300, shift: 70 }, to: { x: 37, y: -11 }, dur: 6, ease: 'linear', twos: true },
      { t: 12.4, post: 'tally', n: 1, dur: 11.6 },
      { t: 12.4, sfx: 'tallyTick', vol: 0.6 },
      // 4. the long look: a slow orbit around the dome; the shrine outside it, stray hairline slashes in the air
      { t: 18.0, shot: 'orbit', center: [D[0], D[1], 4], a0: -0.9, a1: -0.3, r: 46, height: 10, dur: 6, f: 300, twos: true },
    ],
  });
})();
