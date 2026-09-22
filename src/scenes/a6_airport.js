/* ACT VI · 5 — a6_airport (40 s). "Heading South" (canon ch. 236): a limbo departure lounge in warm, soft sunlight —
   the only calm space in the film. Teen Gojo (black high-collar uniform, small round sunglasses) walks in. Geto, on a
   bench, smiles and waves; Haibara waves too; Nanami and Yaga stand by. Far off by the glass, background figures:
   Toji by the window, a girl and a woman (Riko Amanai, Misato Kuroi) walking past. Gojo and Geto laugh together,
   silently. From behind, against the light, they watch a plane take off beyond the window (the plane is this film's
   quiet metaphor, not canon). Last: the seven lotuses in the planter, in the sun.
   Layout (airport set defaults, src/sets_rooms.js): bench [−0.8, 5.2] facing north, planter [4.2, 6.6], linked seat rows
   at y −1.5 / 0.5 / 2.5 for |x| 2.5…9.5 (the aisle x ±2.5 is clear), the window wall y = 10, runway y ≈ 330.
   Staging notes: characters are drawn over the set without a depth test, so no camera sees anyone behind a seat row;
   the glass-side shots look down a little so the dark uniforms read against the bright floor (not the dark gate door);
   the close-ups are painted in the front hook (over the set's light shafts, which would otherwise veil the busts). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, A = HT.A5;
  const GETO = [-0.4, 5.15, 0], GOJO = [0.75, 5.35, 0], HAIB = [1.9, 5.8, 0], NANA = [2.7, 5.25, 0], YAGA = [-2.4, 4.7, 0];
  const TAKEOFF = 21.5, HOLD = [23.0, 33.0];                                   // the widebody rolls in from the west, lifts off 5 s later
  const softGround = ctx => { // white → cream → peach in ordered-dither bands (no off-palette gradient mixes)
    const n = 14, y0 = Math.round(H * 0.18);
    HT.rect(ctx, 0, 0, W, y0, C.white);
    for (let i = 0; i < n; i++) { const a = Math.round(y0 + (H - y0) * i / n), b = Math.round(y0 + (H - y0) * (i + 1) / n), q = (i + 0.5) / n; HT.dither(ctx, 0, a, W, b - a, q < 0.5 ? C.white : C.cream, q < 0.5 ? C.cream : C.peach, q < 0.5 ? q * 2 : q * 2 - 1); }
  };
  const swing = (who, a, b, t0, t1, step) => { const ev = []; for (let t = t0, k = 0; t < t1 - 1e-6; t += step, k++) ev.push({ t: Math.round(t * 1000) / 1000, who, do: 'pose', pose: k % 2 ? b : a, dur: step * 0.85, ease: 'inOutSine' }); return ev; };
  // close-ups (silent): Gojo smiles · Geto smiles · the two laughing side by side — busts over a soft warm ground
  const CU = [
    { t0: 13.0, t1: 15.0, b: [{ who: 'gojo', x: 0.44, size: 238, face: 1, o: { expr: 'smile', eyes: 'open', costume: 'uniform' } }] },
    { t0: 15.0, t1: 17.0, b: [{ who: 'geto', x: 0.56, size: 238, face: -1, o: { expr: 'smile', eyes: 'narrow' } }] },
    { t0: 17.0, t1: 20.0, b: [{ who: 'gojo', x: 0.29, size: 218, face: 1, o: { expr: 'laugh', costume: 'uniform' } }, { who: 'geto', x: 0.71, size: 218, face: -1, o: { expr: 'smile', eyes: 'closed' } }] },
  ];
  HT.fightScene({
    id: 'a6_airport', act: 'VI', title: 'Heading South', dur: 40, transitionIn: { type: 'dissolve', dur: 2.0 },
    set: 'airport', setOpts: { takeoffAt: TAKEOFF, takeoffDir: 1, shafts: 0.3 }, env: { time: 'airport', light: [-0.62, 0.55, 0.5] },
    cast: {
      gojo: { char: 'gojo', at: [3.4, -3.1, 0], face: 'west', pose: 'pockets', costume: 'uniform' },
      geto: { char: 'geto', at: GETO, face: 'south', pose: 'geto_sitFront' },
      haibara: { char: 'haibara', at: HAIB, face: 'south', pose: 'haibara_front' },
      nanami: { char: 'nanami', at: NANA, face: 'south', pose: 'nanami_front' },
      yaga: { char: 'yaga', at: YAGA, face: 'south', pose: 'yaga_front' },
    },
    ambience: [{ name: 'airport', vol: 0.3 }],
    hooks: {
      back(ctx, S) { // the hold toward the glass: everyone backlit → flat warm-dark silhouettes against the light
        if (S.t >= HOLD[0] && S.t < HOLD[1]) { S.mode = 'tint'; S.tint = C.shadow; } else { S.mode = 'normal'; S.tint = undefined; }
      },
      front(ctx, S) {
        const c = CU.find(q => S.t >= q.t0 && S.t < q.t1);
        if (!c || !HT.busts) return;
        softGround(ctx);
        for (const b of c.b) HT.busts.draw(ctx, b.who, Math.round(W * b.x), H + 4, Object.assign({ size: b.size, face: b.face, t: S.t, light: S.light, rim: S.rim }, b.o));
      },
    },
    script: [
      // background figures (soft tinted silhouettes): Toji by the glass; Riko and Kuroi walking past, later by the window
      { t: 0, fx: 'cameo', char: 'figure', at: [-8.6, 8.9, 0], pose: 'armsCrossed', face: 1, tint: C.dusk, h: 1.9, alpha: 0.7, dur: 40 },
      { t: 0, fx: 'cameo', char: 'figure', at: [9.5, 8.35, 0], to: [-3.5, 8.35, 0], t0: 0.2, t1: 6.8, pose: 'stand', face: -1, tint: C.rosewood, h: 1.52, alpha: 0.7, dur: 6.8 },
      { t: 0, fx: 'cameo', char: 'figure', at: [10.3, 8.55, 0], to: [-2.7, 8.55, 0], t0: 0.2, t1: 6.8, pose: 'stand', face: -1, tint: C.mauve, h: 1.64, alpha: 0.7, dur: 6.8 },
      { t: 23.0, fx: 'cameo', char: 'figure', at: [5.9, 8.8, 0], pose: 'stand', face: 1, tint: C.rosewood, h: 1.52, alpha: 0.7, dur: 10 },
      { t: 23.0, fx: 'cameo', char: 'figure', at: [6.5, 8.95, 0], pose: 'stand', face: 1, tint: C.mauve, h: 1.64, alpha: 0.7, dur: 10 },
      // 1. the lounge from the back, toward the sunlit glass (the parked plane outside, the friends small at the bench):
      //    Gojo comes in from the right and walks up the aisle into the light
      { t: 0, shot: 'static', cam: { x: -0.2, y: -5.6, z: 1.6, yaw: 0.02, f: 330, shift: 24 }, to: { y: -4.9 }, dur: 6.8, ease: 'inOutSine' },
      { t: 1.2, sfx: 'airportChime', vol: 0.3 },
      //    (a diagonal path keeps him in profile: the rig's back view reads as a blank face at this size)
      { t: 0.3, who: 'gojo', do: 'walk', to: [2.0, -2.6], style: 'pockets', speed: 1.3 },
      { t: 0.3, sfx: 'footConcrete', vol: 0.1, dur: 6 },
      { t: 1.45, who: 'gojo', do: 'walk', to: [-0.2, 2.9], style: 'pockets', speed: 1.3 },
      // 2. from the glass, a little above, looking back into the room: he comes toward us; Geto looks up, smiles, waves
      { t: 6.8, shot: 'static', cam: A.lookShear([0.35, 9.3, 2.6], [0.15, 4.3, 0.7], 360) },
      { t: 6.8, who: 'gojo', do: 'walk', to: [GOJO[0], GOJO[1]], style: 'frontPockets', speed: 1.3 },
      { t: 6.8, who: 'geto', do: 'expr', face: 'neutral', eyes: 'open' },
      { t: 7.6, who: 'geto', do: 'expr', face: 'smile', eyes: 'narrow' },
      ...swing('geto', 'geto_sitFrontWave', 'geto_sitFront', 8.0, 9.6, 0.4),
      { t: 9.6, who: 'geto', do: 'pose', pose: 'geto_sitFront', dur: 0.5 },
      ...swing('haibara', 'haibara_frontWave', 'haibara_front', 8.5, 9.9, 0.35),
      { t: 9.9, who: 'haibara', do: 'pose', pose: 'haibara_front', dur: 0.4 },
      { t: 8.85, who: 'gojo', do: 'place', at: GOJO, face: 'south', pose: 'frontPockets' },
      { t: 9.5, who: 'gojo', do: 'pose', pose: 'a6_gojoFrontWave', dur: 0.4, ease: 'outCubic' },
      { t: 10.7, who: 'gojo', do: 'pose', pose: 'frontPockets', dur: 0.5 },
      // 3. close-ups (painted by the front hook, CU above); the camera meanwhile just holds the two-shot framing and the
      //    room is switched off underneath (nothing of it shows; saves the room render)
      { t: 13.0, shot: 'static', cam: A.lookShear([0.1, 8.2, 2.1], [0.2, 5.2, 0.95], 470) },
      { t: 13.0, env: { set: 'black' } }, { t: 20.0, env: { set: 'airport' } },
      // 4. the two of them, from the glass: Gojo laughing, Geto laughing on the bench
      { t: 20.0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'closed' },
      { t: 20.0, who: 'geto', do: 'expr', face: 'grin', eyes: 'closed' },
      ...swing('gojo', 'a6_gojoFrontLaughA', 'a6_gojoFrontLaughB', 20.0, 22.2, 0.24),
      ...swing('geto', 'a6_getoSitFrontLaughA', 'a6_getoSitFrontLaughB', 20.1, 22.3, 0.26),
      { t: 22.2, who: 'gojo', do: 'pose', pose: 'frontPockets', dur: 0.5 },
      { t: 22.3, who: 'geto', do: 'pose', pose: 'geto_sitFront', dur: 0.5 },
      { t: 22.2, who: 'gojo', do: 'expr', face: 'smile', eyes: 'open' },
      { t: 22.3, who: 'geto', do: 'expr', face: 'smile', eyes: 'narrow' },
      // 5. behind them toward the glass (backlit): the plane rolls in, lifts off and climbs away — the long hold
      { t: 23.0, shot: 'static', cam: A.lookShear([0.2, 1.5, 1.7], [0.25, 9.9, 1.35], 330) },
      { t: 23.0, who: 'gojo', do: 'place', at: GOJO, face: 'north', pose: 'backPockets' },
      { t: 23.0, who: 'geto', do: 'place', at: GETO, face: 'north', pose: 'a6_getoBackSit' },
      { t: 23.0, who: 'haibara', do: 'place', at: HAIB, face: 'north', pose: 'back' },
      { t: 23.0, who: 'nanami', do: 'place', at: NANA, face: 'north', pose: 'back' },
      { t: 23.0, who: 'yaga', do: 'place', at: YAGA, face: 'north', pose: 'back' },
      { t: 23.5, sfx: 'planeTakeoff', vol: 0.26, dur: 11 },
      { t: 26.8, who: 'gojo', do: 'pose', pose: 'a6_gojoBackUp', dur: 1.6, ease: 'inOutSine' },
      // 6. the seven lotuses in the planter, in the sun (looking down into it; everyone else is out of frame — hidden, so
      //    no stray limb of a near billboard enters the shot)
      ...['gojo', 'geto', 'haibara', 'nanami', 'yaga'].map(who => ({ t: 33.0, who, do: 'hide' })),
      { t: 33.0, shot: 'static', cam: A.lookShear([3.45, 5.55, 1.05], [4.35, 6.75, 0.6], 440), to: A.lookShear([3.55, 5.72, 1.0], [4.35, 6.75, 0.62], 440), dur: 7, ease: 'inOutSine' },
      { t: 36.2, sfx: 'airportChime', vol: 0.16 },
    ],
  });
})();
