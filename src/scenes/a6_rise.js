/* ACT VI · 2 — a6_rise (20 s). Dusk. Snow falls into the erasure. In the smoke, something moves: Sukuna rises —
   burned, bare-torsoed, regenerating (the pale RCT glow, steam) — and stands. Far across the crater Gojo stands on
   the rim, back half-turned, catching his breath; he does not see. Sukuna raises his right hand, calm (canon ch. 236).
   Sukuna always faces screen-right here: his body hides the left side (the lost hand is never shown). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, SC = A.SUK_C, GR = A.G_RIM;
  const look = A.lookShear;
  const toG = (() => { const d = [GR[0] - SC[0], GR[1] - SC[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })(); // Sukuna → Gojo
  const rightOfS = [toG[1], -toG[0]];                    // Sukuna's right side (a camera there sees him facing screen-right)
  const awayG = (() => { const d = [GR[0] - E.x, GR[1] - E.y], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })(); // Gojo looks out, away from the crater
  const SCOUR = { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0, snow: 0.45, dur: 20 };
  HT.fightScene({
    id: 'a6_rise', act: 'VI', title: 'He Rises', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', setOpts: { props: false }, env: { time: 'a6dusk', snow: 0.3, snowFall: 0.4, wind: 0.35, light: [-0.55, -0.4, 0.6], fogNear: 20, fogFar: 460, fogMax: 0.93 },
    cast: {
      sukuna: { char: 'sukunaBare', at: SC, face: toG, pose: 'a5_sukKneel', costume: 'fight' },
      gojo: { char: 'gojo', at: GR, face: [awayG[0] * 0.8 - awayG[1] * 0.6, awayG[1] * 0.8 + awayG[0] * 0.6], pose: 'a5_breathe', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'snow', vol: 0.35 }],
    script: [
      SCOUR,
      { t: 0, fx: 'smokeCols', cols: [[E.x - 235, E.y + 40, 0], [E.x + 205, E.y + 110, 0]], pre: 90, rate: 4, life: 10, rise: 7, size: 3.4, grow: 2.2, dark: true, wind: 2.5, dur: 20 },
      // 1. the crater at dusk, snow falling into it; a low smoke mound in the foreground (stillness, hold)
      { t: 0, shot: 'static', cam: look([SC[0] + rightOfS[0] * 17 - toG[0] * 9, SC[1] + rightOfS[1] * 17 - toG[1] * 9, 1.3], [SC[0] + toG[0] * 6, SC[1] + toG[1] * 6, 1.6], 380) },
      { t: 0, fx: 'smoke', at: [SC[0], SC[1], 0.2], rate: 5, life: 4.5, rise: 0.5, size: 0.9, grow: 2.4, dark: true, wind: 0.6, dur: 11, sfx: false },
      { t: 0, fx: 'smoke', at: [SC[0] - 1.4, SC[1] + 0.8, 0.1], rate: 4, life: 5, rise: 0.4, size: 1.1, grow: 2, dark: true, wind: 0.6, dur: 11, sfx: false },
      { t: 0.8, sfx: 'windGust', vol: 0.2, pan: -0.3, panTo: 0.3, dur: 4 },
      // 2. out of the smoke he rises, regenerating: the glow, the steam; he stands (low, close, side-on)
      { t: 5.0, shot: 'static', cam: look([SC[0] + rightOfS[0] * 5.2 - toG[0] * 0.8, SC[1] + rightOfS[1] * 5.2 - toG[1] * 0.8, 0.6], [SC[0] + toG[0] * 0.4, SC[1] + toG[1] * 0.4, 1.05], 460) },
      { t: 5.0, env: { light: [-0.5, -0.45, 0.55] } },
      { t: 5.4, who: 'sukuna', do: 'pose', pose: 'a5_sukRise', dur: 1.8, ease: 'inOutCubic' },
      { t: 7.4, who: 'sukuna', do: 'pose', pose: 'a5_sukStand', dur: 1.6, ease: 'inOutCubic' },
      { t: 5.4, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      { t: 5.6, fx: 'rctGlow', at: 'sukuna.chest', r: 0.13, steam: true, dur: 4.6 },
      { t: 5.6, sfx: 'rctHeal', vol: 0.45, dur: 3.5 },
      { t: 6.0, fx: 'smoke', at: 'sukuna.chest', rate: 3, life: 2, rise: 0.7, size: 0.12, grow: 3, dark: false, wind: 0.5, dur: 4.4, sfx: false },
      { t: 7.2, sfx: 'rubble', vol: 0.2, dur: 1.2 },
      // 3. on the rim, his back to the crater: Gojo catching his breath — far behind him, small in the mist, Sukuna stands
      { t: 10.4, shot: 'static', cam: look([GR[0] + awayG[0] * 9 - awayG[1] * 2.2, GR[1] + awayG[1] * 9 + awayG[0] * 2.2, 1.35], [SC[0], SC[1], 1.1], 980) },
      { t: 10.4, who: 'sukuna', do: 'place', at: SC, face: toG, pose: 'a5_sukStand' },
      { t: 10.4, who: 'gojo', do: 'pose', pose: 'a5_breathe', dur: 0.01 },
      { t: 10.4, fx: 'rctGlow', at: 'sukuna.chest', r: 0.5, dur: 3.6, sfx: false },   // far off, the pale healing glow marks him in the mist
      { t: 11.2, who: 'gojo', do: 'pose', pose: 'a5_landBend', dur: 1.2, ease: 'inOutSine' },
      { t: 12.5, who: 'gojo', do: 'pose', pose: 'a5_breathe', dur: 1.2, ease: 'inOutSine' },
      // 4. Sukuna raises his right hand, calm (medium, side-on; the snow)
      { t: 14.0, shot: 'static', cam: look([SC[0] + rightOfS[0] * 4.2 + toG[0] * 0.6, SC[1] + rightOfS[1] * 4.2 + toG[1] * 0.6, 1.2], [SC[0] + toG[0] * 0.5, SC[1] + toG[1] * 0.5, 1.45], 520) },
      { t: 14.0, env: { light: [-0.55, -0.4, 0.6] } },
      { t: 15.2, who: 'sukuna', do: 'pose', pose: 'a6_sukHand', dur: 1.6, ease: 'inOutCubic' },
      { t: 15.2, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      { t: 15.4, sfx: 'clothFlutter', vol: 0.12, dur: 1.5 },
    ],
  });
})();
