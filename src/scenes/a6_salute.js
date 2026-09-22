/* ACT VI · 6 — a6_salute (14 s). Dusk, snow, the erased district. From behind (over his right shoulder), Sukuna stands
   alone in the crater and quietly raises his right hand toward where Gojo stood — off-frame to the right (the rim is
   265 m away, just outside the frame). Far off, a crackle of blue-white lightning races along the ground: Kashimo is
   coming. Sukuna lowers his hand and looks toward it. Black.
   Sukuna is drawn in the side view facing screen-right, so his left side is hidden behind his body (the lost hand is
   never shown; the rig's back view would show the left arm ending at the elbow, so it is not used here). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, SC = A.SUK_C, GR = A.G_RIM;
  const look = A.lookShear;
  const toG = (() => { const d = [GR[0] - SC[0], GR[1] - SC[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })(); // Sukuna → the rim
  const rightOfS = [toG[1], -toG[0]];                    // his right-hand side
  const at = (b, r, z) => [SC[0] - toG[0] * b + rightOfS[0] * r, SC[1] - toG[1] * b + rightOfS[1] * r, z]; // b metres behind him, r to his right
  const fwd = (f, z) => [SC[0] + toG[0] * f, SC[1] + toG[1] * f, z];
  // 1. over his right shoulder, 45° behind: the rim direction lies ~35° right of centre, just outside a 460 mm frame
  const CAM1 = look(at(3.9, 3.9, 1.3), fwd(2.6, 1.15), 520);
  // 2. closer and low: his raised hand against the dusk; the far ground where the lightning runs
  const CAM2 = look(at(2.56, 1.92, 0.9), [...fwd(1.6, 0).slice(0, 2), 1.7], 440);
  const v2 = (() => { const d = [CAM2.x, CAM2.y], t = fwd(1.6, 0), x = t[0] - d[0], y = t[1] - d[1], l = Math.hypot(x, y); return [x / l, y / l]; })();
  const r2 = [v2[1], -v2[0]];
  const far = (k, s) => [SC[0] + v2[0] * k + r2[0] * s, SC[1] + v2[1] * k + r2[1] * s, 0];
  HT.fightScene({
    id: 'a6_salute', act: 'VI', title: 'Farewell', dur: 14, transitionIn: { type: 'dissolve', dur: 1.5 },
    set: 'city', setOpts: { props: false }, env: { time: 'a6dusk', snow: 0.34, snowFall: 0.45, wind: 0.35, light: [-0.55, -0.4, 0.6], fogNear: 20, fogFar: 460, fogMax: 0.93 },
    cast: {
      sukuna: { char: 'sukunaBare', at: SC, face: toG, pose: 'a5_sukStand', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'snow', vol: 0.3 }],
    script: [
      { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0, snow: 0.55, dur: 14 },
      { t: 0, fx: 'smokeCols', cols: [[E.x - 235, E.y + 40, 0], [E.x + 205, E.y + 110, 0]], pre: 100, rate: 3, life: 10, rise: 6, size: 3.4, grow: 2.2, dark: true, wind: 2.5, dur: 14 },
      { t: 0, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      // 1. he stands alone in the snow; he raises his right hand toward where Gojo stood (off-frame right)
      { t: 0, shot: 'static', cam: CAM1 },
      { t: 0.6, sfx: 'windGust', vol: 0.16, pan: -0.3, panTo: 0.3, dur: 4 },
      { t: 2.4, who: 'sukuna', do: 'pose', pose: 'a6_sukSalute', dur: 1.5, ease: 'inOutCubic' },
      { t: 2.6, sfx: 'clothFlutter', vol: 0.08, dur: 1.2 },
      // 2. closer, low: the raised hand in the falling snow; far off, lightning runs along the ground (Kashimo) —
      //    he lowers the hand and looks toward it
      { t: 6.6, shot: 'static', cam: CAM2 },
      { t: 8.7, who: 'sukuna', do: 'pose', pose: 'a5_sukStand', dur: 1.3, ease: 'inOutSine' },
      { t: 9.0, fx: 'kashimoBolt', from: far(240, 105), to: far(175, 38), travel: 1.6, w: 2, seed: 7, dur: 1.9 },
      { t: 9.05, sfx: 'sparkPop', vol: 0.12, pan: 0.5 },
      { t: 9.4, sfx: 'agitoSpark', vol: 0.07, pan: 0.3 },
      { t: 9.9, who: 'sukuna', do: 'pose', pose: 'a6_sukLookBack', dur: 0.9, ease: 'inOutSine' },
      { t: 10.3, fx: 'kashimoBolt', from: far(185, 62), to: far(160, 44), travel: 1.0, w: 1, seed: 19, dur: 1.2 },
      // black
      { t: 11.0, post: 'fadeTo', col: C.ink, in: 3.0, dur: 3.0 },
      { t: 11.0, amb: 'wind', vol: 0, fade: 3.0 }, { t: 11.0, amb: 'snow', vol: 0, fade: 3.0 },
    ],
  });
})();
