/* ACT II · 12 — a2_clash5 (40 s). Canon ch. 229. Clash 4 (tally 4): both expand at once again; inside, rapid punches;
   Blue slams Sukuna into the Shrine and pulls him back; both domains break at the same instant. A left hook sends
   Sukuna into an expressway pier. Clash 5 (tally 5): the two seals side by side — Gojo's lights one frame earlier
   (< 0.01 s): the Void lands. Sukuna freezes (information pours into his eyes); one straight strike to the chest
   (impact frame; no gore); at 2:40 the Shrine peels away; Sukuna fully frozen in the glyph streams. Hold. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const VX = A.VIADUCT_X, DZ = 9.6;
  const G = [VX - 1, 0.1, DZ], SK = [VX + 2.2, 0.3, DZ];
  const GR = [VX + 6, -12.5, 0], SR = [VX + 8.2, -12.2, 0];      // they drop to the avenue under the deck for clash 4/5
  const PIER = [-118, 0, 0];                                      // the pier west of them (piers every 28 m from x −62)
  const SHR = [VX + 30, -12, 0];                                  // the Shrine re-forms on the avenue behind Sukuna
  const seal = (who, sign, flip, glowAt) => (g, S, P) => {
    if (HT.busts && HT.busts.hands) HT.busts.hands(g, who, sign, P.cx, P.h + 4, Math.round(P.h * 0.92), { face: flip ? -1 : 1, t: S.t, light: S.light, rim: S.rim });
    const a = P.age - glowAt;
    if (a >= 0 && a < 0.5) { // the seal completes: a burst of light from the fingertips (white core, coloured ring)
      const k = a / 0.5, r = P.h * (0.1 + 0.35 * k), col = who === 'gojo' ? C.ice : C.red;
      g.save(); g.globalAlpha = 1 - k; HT.circle(g, Math.round(P.cx), Math.round(P.h * 0.3), Math.round(r * 0.45), C.white);
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(P.cx, P.h * 0.3, r, 0, Math.PI * 2); g.stroke(); g.restore();
    }
  };
  HT.fightScene({
    id: 'a2_clash5', act: 'II', title: 'The Void Lands', dur: 40, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.25, wind: 0.4, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: GR, face: 'east', pose: 'signVoid', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SR, face: 'west', pose: 'signShrine', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.3 }],
    script: [
      // 1. clash 4: both expand at once (the split page, fast); tally 4
      { t: 0, shot: 'panels', layout: 'diag', split: [[0, 0.5], [0.8, 0.58], [1.6, 0.44], [2.4, 0.5]], panels: [
        { shot: { shot: 'medium', on: ['sukuna'], size: 150, yaw: Math.PI / 2 - 0.4, lead: 80 }, env: { time: 'shrine' } },
        { shot: { shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.4, lead: -80 }, env: { set: 'void', time: 'void' } },
      ] },
      { t: 0.05, fx: 'shrineBloom', at: SHR, back: 0, r: 30, h: 20, rise: 0.8, spread: 0.8, slashes: 4, sky: 0, dur: 11.4, sets: ['city'] },
      { t: 0.05, sfx: 'voidOpen', vol: 0.8, pan: -0.4 },
      { t: 0.3, post: 'tally', n: 4, dur: 3.5 },
      { t: 0.3, sfx: 'tallyTick', vol: 0.6 },
      // 2. inside the Void: rapid punches — Gojo's hands finally out of his pockets
      { t: 3.8, env: { set: 'void', time: 'void' } },
      { t: 3.8, shot: 'medium', on: ['gojo', 'sukuna'], size: 126, yaw: 0.14 },
      { t: 3.8, who: 'gojo', do: 'place', at: GR, face: 'east', pose: 'guard' },
      { t: 3.8, who: 'sukuna', do: 'place', at: [GR[0] + 1.9, GR[1] + 0.2, 0], face: 'west', pose: 'guard' },
      { t: 4.0, who: 'gojo', do: 'jab', target: 'sukuna', hit: 'hit', strength: 1, speed: 1.6 },
      { t: 4.35, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 2, speed: 1.6 },
      { t: 4.75, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 2, speed: 1.6 },
      { t: 5.15, who: 'gojo', do: 'knee', target: 'sukuna', hit: 'hit', strength: 2, speed: 1.5 },
      { t: 5.6, who: 'gojo', do: 'elbow', target: 'sukuna', hit: 'hit', strength: 3, speed: 1.4, react: 'hitHigh' },
      { t: 5.0, fx: 'speedLines', mode: 'focus', at: 'sukuna.chest', n: 70, inner: 120, dur: 1.2, col: C.white },
      { t: 5.2, kana: 'ドドドド', x: 470, y: 80, size: 2, dur: 1.4, style: 'impact' },
      // 3. outside: Blue slams him into the Shrine — and pulls him back
      { t: 7.0, env: { set: 'city', time: 'shrine' } },
      { t: 7.0, shot: 'static', cam: { x: GR[0] + 9, y: GR[1] - 15, z: 2, yaw: 0.22, pitch: 0.08, f: 300 } },
      { t: 7.0, who: 'gojo', do: 'blue' },
      { t: 7.3, fx: 'blueOrb', at: 'sukuna.chest', r: 0.5, dur: 0.8, pull: 0.8, end: 'none' },
      { t: 7.4, who: 'sukuna', do: 'fly', to: [SHR[0] - 6, SHR[1], 1.2], dur: 0.4, pose: 'hitFly', ease: 'inQuad' },
      { t: 7.8, fx: 'dust', at: [SHR[0] - 6, SHR[1], 2], n: 16, r: 4, size: 1.6 },
      { t: 7.8, fx: 'debris', at: [SHR[0] - 6, SHR[1], 2], n: 20, speed: 8, size: 0.6, mat: 'bone' },
      { t: 7.8, sfx: 'wallCrash', vol: 0.9 },
      { t: 7.8, shake: 0.5 },
      { t: 8.6, fx: 'blueOrb', at: [GR[0] + 2, GR[1], 1.2], r: 0.5, dur: 0.9, pull: 1, end: 'implode' },
      { t: 8.8, who: 'sukuna', do: 'fly', to: [GR[0] + 2.2, GR[1] + 0.2, 0], dur: 0.35, pose: 'hitHigh', ease: 'inQuad' },
      // 4. both domains break at the same instant
      { t: 10.2, fx: 'barrierShatter', center: [GR[0] + 1, GR[1], 0], r: 10, crack: 0.2, dur: 1.8, sets: ['city'] },
      { t: 10.2, fx: 'shrineCollapse', at: SHR, back: 0, r: 30, h: 20, dur: 2, sets: ['city'] },
      { t: 10.2, sfx: 'barrierShatter', vol: 0.9 }, { t: 10.25, sfx: 'domainCollapse', vol: 0.9 },
      { t: 10.2, env: { time: 'noon' } },
      { t: 10.2, shake: 0.5 },
      // 5. a left hook sends Sukuna into the expressway pier
      { t: 12.2, shot: 'medium', on: ['gojo', 'sukuna'], size: 120, yaw: 0.25 },
      { t: 12.2, who: 'gojo', do: 'place', at: [GR[0] + 0.2, GR[1], 0], face: 'east', pose: 'guard' },
      { t: 12.2, who: 'sukuna', do: 'place', at: [GR[0] + 2.1, GR[1] + 0.2, 0], face: 'west', pose: 'guardLow' },
      { t: 12.5, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 3, knock: 1.3, react: 'knockFly' },
      { t: 13.6, shot: 'static', cam: { x: PIER[0] + 14, y: -14, z: 2.5, yaw: -0.9, f: 300, shift: 30 } },
      { t: 13.6, who: 'sukuna', do: 'place', at: [PIER[0] + 14, -10, 1.5], face: 'east', pose: 'hitFly' },
      { t: 13.6, who: 'sukuna', do: 'fly', to: [PIER[0] + 1.6, -1.8, 1.3], dur: 0.45, pose: 'hitFly', ease: 'linear' },
      { t: 14.05, fx: 'dust', at: [PIER[0] + 1.4, -1.6, 1.4], n: 14, r: 2, size: 1 },
      { t: 14.05, fx: 'debris', at: [PIER[0] + 1.4, -1.6, 1.4], n: 18, speed: 7, size: 0.5, mat: 'concrete' },
      { t: 14.05, sfx: 'wallCrash', vol: 1 },
      { t: 14.05, kana: 'ドゴォ', x: 250, y: 110, size: 3, dur: 0.9, style: 'impact' },
      { t: 14.05, shake: 0.6 },
      { t: 14.5, who: 'sukuna', do: 'pose', pose: 'down', dur: 0.3 },
      // 6. clash 5: the seals side by side — Gojo's lights one frame earlier (< 0.01 s); tally 5
      { t: 17.0, shot: 'panels', layout: 'split2', slant: 24, panels: [
        { world: false, bg: 'beta', draw: seal('sukuna', 'shrine', true, 1.2 + 1 / 30) },
        { world: false, bg: 'focus', draw: seal('gojo', 'void', false, 1.2) },
      ] },
      { t: 17.0, sfx: 'handSign', vol: 0.8, pan: 0.3 }, { t: 17.03, sfx: 'handSign', vol: 0.8, pan: -0.3 },
      { t: 18.2, sfx: 'tallyTick', vol: 0.8 },
      { t: 18.2, post: 'tally', n: 5, dur: 21.8 },
      // 7. the Void lands: Sukuna frozen, information pouring into his eyes; one straight strike to the chest
      { t: 19.6, env: { set: 'void', time: 'void' } },
      { t: 19.6, who: 'gojo', do: 'place', at: [PIER[0] + 5, -1.8, 0], face: 'west', pose: 'guard' },
      { t: 19.6, who: 'sukuna', do: 'place', at: [PIER[0] + 3, -1.8, 0], face: 'east', pose: 'hitMid' },
      { t: 19.6, who: 'sukuna', do: 'expr', face: 'shock', eyes: 'open', eyes2: 'open' },
      { t: 19.6, shot: 'medium', on: ['gojo', 'sukuna'], size: 126, yaw: 0.2 },
      { t: 19.6, sfx: 'voidOpen', vol: 1 },
      { t: 19.8, fx: 'infoStream', at: 'sukuna.head', n: 22, speed: 1.3, dur: 20.2, sets: ['void'] }, // (the Void's flood: not in the 28–32 s city cut)
      { t: 22.2, shot: 'ecu', who: 'sukuna', yaw: Math.PI / 2 - 0.2 },
      { t: 24.2, shot: 'medium', on: ['gojo', 'sukuna'], size: 132, yaw: 0.2 },
      { t: 24.6, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 3, impact: 2, impactMode: '2tone', knock: 0.2, react: false },
      { t: 24.9, kana: 'ドン', x: 330, y: 90, size: 4, dur: 0.9, style: 'impact' },
      // 8. at 2:40 the Shrine peels away (outside, the crimson dust drifting off); inside he stays frozen (hold)
      { t: 28.0, env: { set: 'city', time: 'noon' } },
      { t: 28.0, shot: 'static', cam: { x: -40, y: 2, z: 3, yaw: -2.06, pitch: 0.12, f: 300 } }, // from the avenue east of the deck's end: a clear view of the Shrine
      { t: 28.0, fx: 'shrineCollapse', at: SHR, back: 0, r: 30, h: 20, dur: 3.6, sets: ['city'] },
      { t: 28.0, who: 'gojo', do: 'hide' }, { t: 28.0, who: 'sukuna', do: 'hide' },
      { t: 32.0, env: { set: 'void', time: 'void' } },
      { t: 32.0, who: 'gojo', do: 'show' }, { t: 32.0, who: 'sukuna', do: 'show' },
      { t: 32.0, shot: 'static', cam: { x: PIER[0] + 4, y: -7.6, z: 1.5, yaw: 0.02, f: 420, shift: 40 }, to: { y: -5.8 }, dur: 8, ease: 'linear' },
      { t: 32.2, sfx: 'tinnitus', vol: 0.25, dur: 6 },
    ],
  });
  void G; void SK; void DZ;
})();
