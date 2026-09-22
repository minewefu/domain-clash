/* ACT V · 1 — a5_red (20 s). Act card. Sunset, high above the city: Gojo rises into the golden light and stops; far
   off, the Blue left from Agito's destruction still hangs over the district — a small blue star. He chants Red (three
   phrases → three crimson glyph rings, the orb swelling at his fingertip) and fires it into the sky toward the Blue:
   a red star drifting toward the blue one (canon ch. 235). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const BLUE = A.BLUE, G0 = A.G0;                   // BLUE: HT.A5.BLUE (src/act5_extra.js) — align with Act IV there
  const dx = BLUE[0] - G0[0], dy = BLUE[1] - G0[1], dh = Math.hypot(dx, dy), ux = dx / dh, uy = dy / dh;
  const YAW_B = Math.atan2(dx, dy);                 // heading from Gojo to the Blue (NNW)
  const SUN = { yaw: -1.23, el: 0.065 };            // the low sun (WNW), matching env 'sunset'
  const RED_T1 = 20, RED_U1 = 0.3;                   // the Red is 30 % of the way when the scene ends
  // camera helpers around Gojo: heading a (rad), distance d, height dz, aim offset (rad)
  const around = (a, d, dz, f, aim, shift, pitch) => ({ x: G0[0] - Math.sin(a) * d, y: G0[1] - Math.cos(a) * d, z: G0[2] + dz, yaw: a + (aim || 0), pitch: pitch || 0, f, shift: shift || 0 });
  // every shot holds still: the sky (voxel city + clouds, ≈ 3 ms) is rendered once per shot (A5.setPlate) while the
  // scene's set is switched to 'black' underneath; all cameras have pitch 0 (lens shift only)
  const SKYOPTS = { clouds: { z: 70, cover: 0.3 }, rays: 0 }, plate = A.setPlate('sky', { from: 0, to: 20, setOpts: SKYOPTS });
  HT.fightScene({
    id: 'a5_red', act: 'V', title: 'Red, Chanted', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'sky', setOpts: SKYOPTS, env: { time: 'sunset', wind: 0.6, snow: 0.2 },
    hooks: { back(ctx, S) { plate(ctx, S); } },
    cast: {
      gojo: { char: 'gojo', at: [G0[0], G0[1], G0[2] - 24], face: [ux, uy], pose: 'a5_hover', costume: 'fight' },
    },
    ambience: [{ name: 'sky', vol: 0.55 }, { name: 'wind', vol: 0.35 }],
    init() { return A.warmSky(this); }, // voxel heights for every ledger state the sky set shows (no in-frame rebuild)
    script: [
      { t: 0, env: { set: 'black' } },
      { t: 0, card: 'act', text: 'ACT V', sub: 'HOLLOW PURPLE', bg: 'black', dur: 2.8 },
      { t: 0, post: 'black', hold: true, dur: 2.6 },
      { t: 2.6, post: 'fadeFrom', dur: 1.6 },
      { t: 0, fx: 'orb', kind: 'blue', at: BLUE, r: 2.4, minPx: 1.4, dur: 20, pull: 10 },
      // 1. the vista, looking into the low sun: he rises into frame and stops against it, the Blue a star to the right;
      //    silence but the wind (hold)
      { t: 0, shot: 'static', cam: around(-1.325, 9, 0.8, 400, 0.291, 60) },
      { t: 0, env: { light: [0.4, -0.3, -0.35] } },
      { t: 2.6, who: 'gojo', do: 'fly', to: G0, dur: 3.8, pose: 'a5_hover', ease: 'outCubic' },
      { t: 2.6, who: 'gojo', do: 'trail', dur: 2.2, n: 3, tint: C.ice },
      { t: 3.4, sfx: 'windGust', vol: 0.3, pan: -0.2, panTo: 0.3, dur: 3 },
      { t: 6.8, fx: 'smoke', at: 'gojo.head', rate: 0.9, life: 1.3, rise: 0.3, size: 0.06, grow: 3, dark: false, wind: 0.6, dur: 1.2, sfx: false },
      // 2. the Six Eyes find the blue star (bust: calm → serious); the wind in his hair
      { t: 7.6, shot: 'closeup', who: 'gojo', yaw: YAW_B + Math.PI / 2 + 0.35, dist: 6, f: 820, bust: { expr: 'calm', eyes: 'glow', costume: 'fight', look: [-0.6, -0.1] }, size: 214, dim: 0.2 },
      { t: 7.6, env: { light: [-0.6, -0.35, 0.7] } },
      { t: 7.6, who: 'gojo', do: 'face', face: [ux, uy] },
      { t: 9.2, shot: 'closeup', who: 'gojo', yaw: YAW_B + Math.PI / 2 + 0.35, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'glow', costume: 'fight', look: [-0.8, -0.1] }, size: 214, dim: 0.2 },
      { t: 9.2, sfx: 'sixEyes', vol: 0.3 },
      // 3. the chant, warm front light: the hand rises; three phrases → three crimson rings; the orb swells at the tip
      { t: 10.4, shot: 'static', cam: around(YAW_B + Math.PI - 0.62, 6.4, 0.2, 620, 0, 30) },
      { t: 10.6, who: 'gojo', do: 'pose', pose: 'a5_chantRed', dur: 0.5 },
      { t: 10.6, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 10.9, fx: 'chantRings', at: 'gojo.chest', scheme: 'red', r: 0.85, rings: 3, ringAt: [0, 1.2, 2.4], dur: 4.4, flat: 0.9 },
      { t: 10.9, sfx: 'handSign', vol: 0.35 }, { t: 12.1, sfx: 'handSign', vol: 0.4 }, { t: 13.3, sfx: 'handSign', vol: 0.45 },
      { t: 10.9, sfx: 'infinityHum', vol: 0.3, dur: 4.3, pitch: 0.8 },
      { t: 11.4, fx: 'redOrb', at: 'gojo.hand', r: 0.14, charge: 99, dur: 3.9, sfx: false },
      { t: 15.3, sfx: 'redCharge', vol: 0.6, dur: 3.9 },   // audio (M5): builds with the orb 11.4 → the shot (was t 12.4 d2.8: built 9.6–12.4)
      // 4. fire: from behind him, along its flight — the Red leaves the fingertip and drifts toward the blue star
      { t: 15.2, who: 'gojo', do: 'pose', pose: 'a5_fireRed', dur: 0.1, ones: true },
      { t: 15.2, shot: 'static', cam: around(YAW_B - 0.34, 6.5, 1.0, 470, 0.34, 26) },
      { t: 15.2, env: { light: [-0.2, -0.45, 0.6] } },
      { t: 15.3, fx: 'redOrb', at: A.RED0, dir: [ux, uy, -0.1], r: 0.26, charge: 0.01, range: 9, dur: 1.0, sfx: false },
      { t: 15.3, fx: 'orb', kind: 'red', from: A.RED0, to: A.redAt(RED_U1), t0: 15.3, t1: RED_T1, r: 0.55, minPx: 1.4, dur: 4.7, ease: 'outQuad' },
      { t: 15.3, sfx: 'redBlast', vol: 0.7 },
      { t: 15.3, shake: 0.25 },
      { t: 16.4, who: 'gojo', do: 'pose', pose: 'a5_hoverLook', dur: 1.4 },
    ],
  });
})();
