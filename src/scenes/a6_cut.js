/* ACT VI · 3 — a6_cut (16 s). The World-Cutting Slash — never shown on a body. Sukuna's four eyes, calm. His hand
   before his chest; one calm swipe, drawn out and up. Across the crater: Gojo on the rim, straightening, the breath
   coming back. Stillness. Then one perfect line crosses the whole frame, rising to the right — silence (the
   worldCut sound empties the mix) — and every layer of the image splits along it and slides apart; the seam opens on
   white; white takes everything. The line passes just above Gojo: the split is of the world, never of a body (canon ch. 236: the slash that cuts the world itself, learned from Mahoraga). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, SC = A.SUK_C, GR = A.G_RIM;
  const look = A.lookShear;
  const toG = (() => { const d = [GR[0] - SC[0], GR[1] - SC[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })();
  const rightOfS = [toG[1], -toG[0]];
  // the split happens on GOJO: on the rim, his back to the crater, straightening, the breath coming back — the line
  // crosses the whole frame just above him (he is entirely in the lower half: no body is ever cut on screen); the world
  // itself comes apart around him and slides away on white
  const awayG = (() => { const d = [GR[0] - E.x, GR[1] - E.y], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })();
  const GCAM = look([GR[0] + awayG[0] * 8.5 + awayG[1] * 2.4, GR[1] + awayG[1] * 8.5 - awayG[0] * 2.4, 1.3], [GR[0] - awayG[0] * 30 - awayG[1] * 6, GR[1] - awayG[1] * 30 + awayG[0] * 6, 1.6], 760);
  const CUT = { x: 300, y: 104, angle: -0.38 }, T_LINE = 6.6;
  HT.fightScene({
    id: 'a6_cut', act: 'VI', title: 'The World-Cutting Slash', dur: 16, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', setOpts: { props: false }, env: { time: 'a6dusk', snow: 0.3, snowFall: 0.4, wind: 0.3, light: [-0.55, -0.4, 0.6], fogNear: 20, fogFar: 460, fogMax: 0.93 },
    cast: {
      sukuna: { char: 'sukunaBare', at: SC, face: toG, pose: 'a6_sukHand', costume: 'fight' },
      gojo: { char: 'gojo', at: GR, face: [awayG[0] * 0.7 + awayG[1] * 0.7, awayG[1] * 0.7 - awayG[0] * 0.7], pose: 'a5_breathe', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'snow', vol: 0.3 }],
    script: [
      { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0, snow: 0.5, dur: 16 },
      { t: 0, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      // 1. his four eyes, calm
      { t: 0, shot: 'ecu', who: 'sukuna', yaw: Math.atan2(-rightOfS[0], -rightOfS[1]) },
      // 2. side-on: the hand before his chest — one calm swipe, drawn out and up
      { t: 3.0, shot: 'static', cam: look([SC[0] + rightOfS[0] * 4.4 + toG[0] * 0.3, SC[1] + rightOfS[1] * 4.4 + toG[1] * 0.3, 1.3], [SC[0] + toG[0] * 0.6, SC[1] + toG[1] * 0.6, 1.4], 520) },
      { t: 4.3, who: 'sukuna', do: 'a6_sukSwipe', speed: 0.55 },
      { t: 4.95, sfx: 'whooshS', vol: 0.18, pitch: 0.7 },
      // 3. Gojo on the rim, his back half-turned to the crater: he straightens; the breath comes back (stillness)
      { t: 5.6, shot: 'static', cam: GCAM },
      { t: 5.6, who: 'gojo', do: 'pose', pose: 'a5_breatheUp', dur: 0.9, ease: 'inOutSine' },
      { t: 5.6, who: 'gojo', do: 'expr', face: 'smile', eyes: 'narrow' },
      { t: 5.6, amb: 'wind', vol: 0.12, fade: 0.8 },
      // 4. one perfect line from his fingertips across the whole frame — silence — the image splits along it and slides
      { t: T_LINE, fx: 'worldCut', x: CUT.x, y: CUT.y, angle: CUT.angle, grow: 0.16, dur: 1.2, sfx: false },
      { t: T_LINE, sfx: 'worldCut', vol: 0.95 },
      { t: T_LINE, post: 'split', x: CUT.x, y: CUT.y, angle: CUT.angle, cut: 1.1, gap: 300, sep: 34, ease: 'inOutSine', bg: C.white, dur: 16 - T_LINE },
      { t: T_LINE, amb: 'wind', vol: 0, fade: 0.1 }, { t: T_LINE, amb: 'snow', vol: 0, fade: 0.1 },
      // 5. the seam opens on white; white takes everything
      { t: 12.2, post: 'fadeTo', col: C.white, in: 3.0, dur: 16 - 12.2 },
    ],
  });
})();
