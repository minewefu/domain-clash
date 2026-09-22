/* ACT V · 5 — a5_ash (20 s). The afterglow. Ground level on the scoured floor of the erasure: ash and the first snow
   drift down through violet light; smoke rises from the torn rim. The last of the golden wheel comes down as a few
   gold motes and goes out in the ash — Mahoraga is gone. In the smoke, Sukuna: burned, bare-torsoed, barely standing,
   a swaying silhouette against the glow (always turned so the body and the smoke hide his left side — the lost hand
   is never shown). Silence but the ash wind and embers (canon ch. 235). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, SC = A.SUK_C;
  const look = (from, to, f, extra) => HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
  HT.fightScene({
    id: 'a5_ash', act: 'V', title: 'Ash', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', setOpts: { props: false }, env: { time: 'sunset', snow: 0.1, snowFall: 0.12, wind: 0.5, fogFar: 1100 },
    cast: {
      sukuna: { char: 'sukunaBare', at: SC, face: 'north', pose: 'a5_sukBurnt', costume: 'fight' },
    },
    ambience: [{ name: 'rubble', vol: 0.35 }, { name: 'wind', vol: 0.3 }, { name: 'fire', vol: 0.15 }],
    hooks: { back(ctx, S) { S.mode = S.t >= 11.6 ? 'ink' : undefined; } }, // in silhouette against the afterglow
    script: [
      { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0.3, dur: 20 },
      { t: 0, post: 'purpleGrade', keys: [[0, 0.5], [20, 0.26]], dur: 20 },
      { t: 0, fx: 'ashFall', density: 0.55, wind: 0.5, ember: 0.14, dur: 20 },
      // smoke columns from the torn rim (depth-tested behind the stumps)
      { t: 0, fx: 'smokeCols', cols: [[E.x - 235, E.y + 40, 0], [E.x - 150, E.y + 190, 0], [E.x + 60, E.y + 232, 0]], pre: 16, rate: 8, life: 10, rise: 9, size: 4, grow: 2.4, dark: true, wind: 3, dur: 20 },
      // 1. the plain of the erasure from the south: the far rim a ring of stumps, smoke, the violet afterglow (hold)
      { t: 0, shot: 'static', cam: look([E.x + 60, E.y - 150, 2.2], [E.x - 40, E.y + 120, 14], 360) },
      { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0.4, sfx: 'windGust', vol: 0.25, pan: 0.3, panTo: -0.3, dur: 3 },
      // 2. the last of the wheel: a few gold motes drift down through the frame and go out in the ash
      { t: 6.4, shot: 'static', cam: look([SC[0] + 21, SC[1] - 15, 1.6], [SC[0] + 10, SC[1] - 6, 3.6], 720) },
      { t: 6.4, fx: 'goldMotes', at: [SC[0] + 10, SC[1] - 6, 9], n: 24, fall: 3.6, spread: 3.2, dur: 5.2 },
      { t: 7.2, sfx: 'glassTinkle', vol: 0.15, pitch: 0.7 },
      { t: 9.4, sfx: 'glassTinkle', vol: 0.1, pitch: 0.6 },
      // 3. Sukuna in the smoke, against the glow: burned, bare-torsoed, swaying — barely standing (hold on the cost)
      { t: 11.6, shot: 'static', cam: look([SC[0] + 9.2, SC[1] - 2.9, 0.7], [SC[0], SC[1], 1.05], 660) },
      { t: 11.6, env: { light: [0.6, -0.1, -0.5] } },
      { t: 11.6, who: 'sukuna', do: 'show' },
      { t: 11.6, post: 'purpleGrade', k: 0.2, dur: 8.4 },
      { t: 11.6, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'narrow' },
      { t: 12.6, who: 'sukuna', do: 'pose', pose: 'a5_sukSway', dur: 1.6, ease: 'inOutSine' },
      { t: 14.8, who: 'sukuna', do: 'pose', pose: 'a5_sukBurnt', dur: 1.8, ease: 'inOutSine' },
      { t: 17.0, who: 'sukuna', do: 'pose', pose: 'a5_sukSway', dur: 2.2, ease: 'inOutSine' },
      { t: 11.6, fx: 'smoke', at: [SC[0] - 0.8, SC[1] + 0.9, 0.2], rate: 5, life: 3.6, rise: 0.8, size: 0.6, grow: 2.4, dark: true, wind: 0.9, dur: 8.4, sfx: false },
      { t: 11.6, fx: 'haze', at: [SC[0] - 14, SC[1] + 4.4, 2.6], r: 150, pal: [C.lavender, C.violet, C.purple, C.plum], a: 0.9, n: 16, dur: 8.4 },
      { t: 11.6, fx: 'smoke', at: [SC[0] - 2.4, SC[1] - 1.5, 0.1], rate: 3, life: 4, rise: 0.5, size: 0.9, grow: 2, dark: true, wind: 1.1, dur: 8.4, sfx: false },
      { t: 12.2, sfx: 'fireCrackle', vol: 0.2, dur: 6 },
      { t: 15.0, sfx: 'rubble', vol: 0.2, dur: 1.5 },
    ],
  });
})();
