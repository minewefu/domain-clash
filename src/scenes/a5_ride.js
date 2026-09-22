/* ACT V · 2 — a5_ride (20 s). Mahoraga leaps from the street to destroy the Blue; Gojo lets the Blue's pull take him
   (Mahoraga, adapted to Infinity, cannot ride it) and overtakes it — an uppercut in mid-air knocks it tumbling up;
   Sukuna, below, fires his Piercing-Blood water beam at the Red; Gojo chants Blue — the floating Blue swells, bends
   the beam into itself and swallows it; Sukuna leaps after them (canon ch. 235). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const BLUE = A.BLUE, G0 = A.G0, G2 = A.G2, M0 = A.MAHO0, S0 = A.SUK0; // BLUE: HT.A5.BLUE (src/act5_extra.js)
  const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const M = v => lerp3(M0, BLUE, v);                  // Mahoraga's leap line
  const MX = M(0.72);                                 // where the leap meets Gojo (≈ 115 m up)
  const TC = 8.6;                                     // the uppercut's contact
  const GD = (() => { const d = [G0[0] - MX[0], G0[1] - MX[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })(); // toward Gojo's side
  const GX = [MX[0] + GD[0] * 1.1, MX[1] + GD[1] * 1.1, MX[2] + 0.8]; // Gojo's feet for the uppercut
  const U0 = 0.3, U1 = 0.85;                          // the Red's progress over the scene
  const redAt = t => A.redAt(U0 + (U1 - U0) * t / 20);
  const look = (from, to, f, extra) => HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
  const SIDE = (() => { const m = M(0.62), d = [BLUE[0] - M0[0], BLUE[1] - M0[1]], l = Math.hypot(d[0], d[1]); return [m[0] + d[1] / l * 210, m[1] - d[0] / l * 210]; })(); // 210 m to the side of the leap
  const YAW_W = Math.atan2(BLUE[0] - G2[0], BLUE[1] - G2[1]); // from G2 toward the Blue (≈ west, into the sun)
  const dW = [Math.sin(YAW_W), Math.cos(YAW_W)], pW = [dW[1], -dW[0]];
  // the held sky shots (3.4–5.4, 7.4–10.4, 13.4–17.6) render their sky once (A5.setPlate) with the set 'black' underneath
  const SKYOPTS = { clouds: { z: 70, cover: 0.3 }, rays: 0 };
  const plates = [[3.4, 5.4], [7.4, 10.4], [13.4, 17.6]].map(([from, to]) => A.setPlate('sky', { from, to, setOpts: SKYOPTS }));
  const lookS = A.lookShear;
  HT.fightScene({
    id: 'a5_ride', act: 'V', title: 'Riding the Blue', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'sky', setOpts: SKYOPTS, env: { time: 'sunset', wind: 0.6, snow: 0.2 },
    hooks: { back(ctx, S) { for (const p of plates) if (p(ctx, S)) break; } },
    cast: {
      mahoraga: { char: 'mahoraga', at: M0, face: 'north', pose: 'maho_idle' },
      gojo: { char: 'gojo', at: G0, face: [-GD[0], -GD[1]], pose: 'a5_hoverLook', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'north', pose: 'a5_sukLook', costume: 'fight' },
    },
    ambience: [{ name: 'sky', vol: 0.5 }, { name: 'wind', vol: 0.35 }],
    init() { return A.warmSky(this); }, // voxel heights for every ledger state the sky set shows (no in-frame rebuild)
    script: [
      { t: 0, fx: 'orb', kind: 'blue', at: BLUE, swell: [[0, 2.4], [14.5, 2.4], [15.7, 9.5], [20, 10]], minPx: 1.4, dur: 20, pull: 12, lens: 0.8 },
      { t: 0, fx: 'orb', kind: 'red', from: redAt(0), to: redAt(20), t0: 0, t1: 20, r: 0.55, minPx: 1.4, dur: 20 },
      // 1. street level, low, up the avenue: Mahoraga looks up at the Blue, the wheel over its head; it crouches — leaps,
      //    out of the frame; the dust hangs over the crater
      { t: 0, env: { set: 'city', light: [-0.6, -0.3, 0.65] } },
      { t: 0, shot: 'static', cam: { x: M0[0] + 5.2, y: M0[1] - 6.0, z: 0.6, yaw: -0.71, pitch: 0.26, f: 360 } },
      { t: 0, who: 'mahoraga', do: 'pose', pose: 'maho_look', dur: 0.01 },
      { t: 0.2, who: 'mahoraga', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0.7, who: 'mahoraga', do: 'pose', pose: 'a5_mahoCrouch', dur: 1.1, ease: 'inOutCubic' },
      { t: 0.9, sfx: 'mahoStep', vol: 0.6 },
      { t: 2.3, who: 'mahoraga', do: 'pose', pose: 'a5_mahoLeap', dur: 0.1, ones: true },
      { t: 2.4, who: 'mahoraga', do: 'fly', to: M(0.2), dur: 1.0, pose: 'a5_mahoLeap', ease: 'inQuad' },
      { t: 2.4, who: 'mahoraga', do: 'trail', dur: 0.6, n: 3, tint: C.gold },
      { t: 2.4, fx: 'smoke', at: [M0[0], M0[1], 0.2], rate: 5, life: 2.4, rise: 1.6, size: 0.7, grow: 2, dark: false, col: 'ash', wind: 0.4, dur: 2.2, sfx: false },
      { t: 2.4, fx: 'crater', at: [M0[0], M0[1], 0], r: 3.2, n: 16, dur: 1.2, hold: true },
      { t: 2.4, fx: 'shockwave', at: [M0[0], M0[1], 0], r: 14, strength: 3, dur: 1.0, col: 'ash' },
      { t: 2.4, fx: 'dust', at: [M0[0], M0[1], 0.4], n: 10, r: 4, size: 0.8, rise: 1.2, dur: 1.1, col: 'ash' },
      { t: 2.4, damage: { kind: 'crater', x: M0[0], y: M0[1], r: 3.5 } },
      { t: 2.4, sfx: 'groundSlam', vol: 0.9 },
      { t: 2.4, shake: 0.6 },
      { t: 2.45, kana: 'ドンッ', x: 470, y: 96, size: 3, dur: 0.9, style: 'impact' },
      { t: 2.6, sfx: 'whooshL', vol: 0.7 },
      // 2a. far off, side-on: a gold streak rising out of the city toward the blue star
      { t: 3.4, env: { set: 'black' } },
      { t: 3.4, shot: 'static', cam: lookS([SIDE[0], SIDE[1], 112], [M(0.62)[0], M(0.62)[1], 100], 300) },
      { t: 3.4, who: 'mahoraga', do: 'place', at: M(0.2), face: [GD[0], GD[1]], pose: 'a5_mahoLeap' },
      { t: 3.4, who: 'mahoraga', do: 'fly', to: M(0.64), dur: 2.0, pose: 'a5_mahoLeap', ease: 'outQuad' },
      { t: 3.4, who: 'mahoraga', do: 'trail', dur: 2.0, n: 4, tint: C.gold },
      { t: 3.4, fx: 'streak', who: 'mahoraga', col: C.gold, len: 1.1, dur: 2.0 },
      // 2b. Gojo lets the Blue take him: yanked along its pull (tracking beside him, the city streaming below)
      { t: 5.4, env: { set: 'sky' } },
      { t: 5.4, shot: 'follow', who: 'gojo', offset: [GD[1] * 7 + GD[0] * 2.2, -GD[0] * 7 + GD[1] * 2.2, 1.3], aimZ: 1.0, f: 440 },
      { t: 5.4, who: 'gojo', do: 'pose', pose: 'a5_ride', dur: 0.2 },
      { t: 5.6, who: 'gojo', do: 'fly', to: lerp3(G0, GX, 0.75), dur: 1.8, pose: 'a5_ride', ease: 'inCubic' },
      // (no afterimage trail here: with the camera riding along at ~250 m/s the past positions fall beside/behind the lens —
      //  off-screen or giant, 200–400 ms rig renders; the speed lines carry the motion)
      { t: 5.4, sfx: 'blueCharge', vol: 0.5, dur: 1.4 },
      { t: 5.9, sfx: 'dashAir', vol: 0.8 },
      { t: 5.6, post: 'speed', mode: 'parallel', angle: 0.35, n: 60, len: 180, col: C.ice, dur: 1.8 },
      // 3. the interception, mid-air, the sky behind: it rises looking up at the Blue — Gojo arrives on the pull and
      //    drives an uppercut into its jaw; it tumbles up past the Blue
      { t: 7.4, env: { set: 'black' } },
      { t: 7.4, shot: 'static', cam: lookS(add3(MX, [GD[1] * 9 + GD[0] * 7.5, -GD[0] * 9 + GD[1] * 7.5, -2.4]), add3(MX, [GD[0] * 1.0, GD[1] * 1.0, 2.3]), 470) },
      { t: 7.4, who: 'mahoraga', do: 'place', at: M(0.66), face: [GD[0], GD[1]], pose: 'a5_mahoLeap' },
      { t: 7.4, who: 'mahoraga', do: 'fly', to: MX, dur: TC - 7.4, pose: 'a5_mahoLeap', ease: 'linear' },
      { t: 7.4, who: 'gojo', do: 'place', at: [GX[0] + GD[0] * 12, GX[1] + GD[1] * 12, GX[2] + 4], face: [-GD[0], -GD[1]], pose: 'a5_ride' },
      { t: 7.4, who: 'gojo', do: 'fly', to: GX, dur: TC - 0.27 - 7.4, pose: 'a5_ride', ease: 'outQuad' },
      { t: 7.4, who: 'gojo', do: 'trail', dur: 0.9, n: 4, tint: C.ice },
      { t: TC - 0.27, who: 'gojo', do: 'a5_airUpper', target: 'mahoraga', hit: 'hit', strength: 3, space: false, react: false, impact: 1, impactMode: '2tone', hitstop: 7, hitSfx: 'hitHuge' },
      { t: TC + 0.05, kana: 'ゴッ', x: 360, y: 110, size: 4, dur: 1.0, style: 'impact' },
      { t: TC + 7 / 30, who: 'mahoraga', do: 'launch', vel: [GD[0] * -3, GD[1] * -3, 24], g: 5, dur: 1.8, spin: 1.2, pose: 'a5_mahoTumble', ground: false },
      // 4. below: Sukuna takes the Piercing Blood stance and fires the water beam at the Red
      { t: 10.4, env: { set: 'city' } },
      { t: 10.4, shot: 'static', cam: { x: S0[0] + 3.9, y: S0[1] - 4.3, z: 0.8, yaw: -0.74, pitch: 0.2, f: 420 } },
      { t: 10.4, who: 'mahoraga', do: 'hide' },
      { t: 10.4, who: 'gojo', do: 'place', at: G2, face: dW, pose: 'a5_hover' },
      { t: 10.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 10.8, who: 'sukuna', do: 'pose', pose: 'a5_sukBeamA', dur: 0.5 },
      { t: 11.4, sfx: 'handSign', vol: 0.4 },
      { t: 12.2, who: 'sukuna', do: 'pose', pose: 'a5_sukBeam', dur: 0.1, ones: true },
      { t: 12.3, fx: 'waterBeam', from: 'sukuna.hand', to: redAt(13.2), travel: 1.0, w: 0.2, dur: 1.2 },
      { t: 12.3, sfx: 'waterJet', vol: 0.65, dur: 3.4 },   // audio (M5): was 0.9 (the ride must stay under the Purple)
      { t: 12.3, shake: 0.2 },
      // 5. the sky, from behind Gojo into the sun: the beam races up at the Red — he chants Blue; the Blue swells,
      //    bends the beam into itself and swallows it (hold)
      { t: 13.4, env: { set: 'black', light: [0.45, -0.3, -0.4] } },
      { t: 13.4, shot: 'static', cam: lookS([G2[0] - dW[0] * 6.5 + pW[0] * 2.6, G2[1] - dW[1] * 6.5 + pW[1] * 2.6, G2[2] + 2.3], [BLUE[0] + 10, BLUE[1] - 26, BLUE[2] - 4], 420) },
      { t: 13.4, fx: 'waterBeam', from: [S0[0] - 0.3, S0[1] + 0.4, 2.4], to: redAt(15.4), travel: 1.4, w: 0.9, bend: { at: BLUE, from: 1.4, dur: 1.3 }, stopAt: 3.0, tailDur: 1.0, dur: 4.2, sfx: false },
      { t: 13.8, who: 'gojo', do: 'pose', pose: 'a5_chantBlue', dur: 0.3 },
      { t: 13.8, fx: 'chantRings', at: 'gojo.chest', scheme: 'blue', r: 0.8, rings: 3, ringAt: [0, 0.35, 0.7], dur: 2.4, flat: 0.9 },
      { t: 13.8, sfx: 'handSign', vol: 0.4 },
      { t: 14.5, sfx: 'blueImplode', vol: 0.9 },
      { t: 14.5, shake: 0.3 },
      { t: 15.2, kana: 'ゴゴゴ', x: 250, y: 60, size: 3, dur: 2.2, style: 'rumble' },
      // 6. Sukuna leaps after them (low on the avenue): a crouch, a crack of asphalt, gone up out of the frame
      { t: 17.6, env: { set: 'city', light: [-0.6, -0.3, 0.65] } },
      { t: 17.6, shot: 'static', cam: { x: S0[0] + 6.2, y: S0[1] - 4.8, z: 0.5, yaw: -0.92, pitch: 0.22, f: 400 } },
      { t: 17.6, who: 'sukuna', do: 'place', at: S0, face: 'north', pose: 'a5_sukLook' },
      { t: 17.6, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 17.9, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.45 },
      { t: 18.6, who: 'sukuna', do: 'pose', pose: 'a5_sukLeap', dur: 0.08, ones: true },
      { t: 18.66, who: 'sukuna', do: 'fly', to: add3(S0, [-3, 4, 30]), dur: 0.8, pose: 'a5_sukLeap', ease: 'inQuad' },
      { t: 18.66, who: 'sukuna', do: 'trail', dur: 0.5, n: 3, tint: C.salmon },
      { t: 18.66, fx: 'shockwave', at: [S0[0], S0[1], 0], r: 9, strength: 2, dur: 0.8, col: 'ash' },
      { t: 18.66, fx: 'dust', at: [S0[0], S0[1], 0.3], n: 8, r: 2.5, size: 0.6, dur: 1.0, col: 'ash' },
      { t: 18.66, damage: { kind: 'crater', x: S0[0], y: S0[1], r: 1.6 } },
      { t: 18.66, sfx: 'groundSlam', vol: 0.6 },
      { t: 18.7, sfx: 'whooshL', vol: 0.6 },
    ],
  });
})();
