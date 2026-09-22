/* ACT V · 3 — a5_sky (18 s). All three in the air above the city — silence, only the wind. Over Gojo's shoulder: the
   swollen Blue with the Red drifting into it, Mahoraga hanging at the top of its arc, Sukuna rising. A page of three
   (read right → left): Mahoraga · Sukuna · Gojo. Then Gojo's hand: index and little finger out → the thumb-index pinch
   → the fingers flung open (busts.hands 'purple'), a violet ring of glyphs for each phrase of the incantation; his eyes
   in violet light; a low charge begins under the silence (canon ch. 235). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const BLUE = A.BLUE, G2 = A.G2, M2 = A.MAHO2, S2 = A.SUK2;   // BLUE: HT.A5.BLUE (src/act5_extra.js)
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const look = (from, to, f, extra) => HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
  const YAW_W = Math.atan2(BLUE[0] - G2[0], BLUE[1] - G2[1]), dW = [Math.sin(YAW_W), Math.cos(YAW_W)], pW = [dW[1], -dW[0]];
  const U0 = 0.85, U1 = 0.95, redAt = t => A.redAt(U0 + (U1 - U0) * t / 18);
  const OTS = A.lookShear([G2[0] - dW[0] * 6 + pW[0] * 2.2, G2[1] - dW[1] * 6 + pW[1] * 2.2, G2[2] + 2.4], [BLUE[0], BLUE[1], BLUE[2] + 6], 380);
  const HAND = { t: 8.4, fx: 'handSign', x: 330, y: 372, size: 300, dur: 6.2, in: 0.4, rim: C.lavender, light: [-0.55, -0.45, 0.7],
    keys: [[0, 0.15], [2.2, 0.15], [2.9, 0.58, 'lerp'], [4.3, 0.58], [4.5, 0.74, 'lerp'], [4.62, 0.92, 'lerp']] };
  // the opening hold, the hand shot and the close-up keep still: their sky is rendered once each (A5.setPlate) while the
  // set is 'black' underneath (the page of panels in between renders the live sky)
  const SKYOPTS = { clouds: { z: 70, cover: 0.3 }, rays: 0 };
  const plates = [[0, 4.4], [8.4, 14.6], [14.6, 18]].map(([from, to]) => A.setPlate('sky', { from, to, setOpts: SKYOPTS }));
  HT.fightScene({
    id: 'a5_sky', act: 'V', title: 'Three in the Sky', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'sky', setOpts: SKYOPTS, env: { time: 'sunset', wind: 0.55, snow: 0.2 },
    hooks: { back(ctx, S) { for (const p of plates) if (p(ctx, S)) break; } },
    cast: {
      mahoraga: { char: 'mahoraga', at: add3(M2, [0, 0, -1.5]), face: 'south', pose: 'a5_mahoHang' },
      sukuna: { char: 'sukuna', at: add3(S2, [0, 0, -2]), face: [-0.55, 0.83], pose: 'a5_sukLeap', costume: 'fight' },
      gojo: { char: 'gojo', at: G2, face: dW, pose: 'a5_hover', costume: 'fight' },
    },
    ambience: [{ name: 'sky', vol: 0.35 }, { name: 'wind', vol: 0.45 }],
    init() { // voxel heights for the scene's ledger states; the hand close-up's ~10 distinct drawings (≈30 ms each), one per slice
      const sc = this;
      return (function* () { yield* A.warmSky(sc); for (const o of A.handJobs(HAND, null)) { HT.busts.handsRender('gojo', 'purple', o); yield; } })();
    },
    script: [
      { t: 0, fx: 'orb', kind: 'blue', at: BLUE, r: 10, minPx: 1.4, dur: 18, pull: 12, lens: 0.8 },
      { t: 0, fx: 'orb', kind: 'red', from: redAt(0), to: redAt(18), t0: 0, t1: 18, r: 0.8, minPx: 1.6, dur: 18 },
      // slow motion: they barely move — the held breath
      { t: 0, who: 'mahoraga', do: 'fly', to: M2, dur: 18, pose: 'a5_mahoHang', ease: 'outQuad' },
      { t: 0, who: 'mahoraga', do: 'expr', wheelAngle: 180, wheelGlow: 0.2 },
      { t: 0, who: 'sukuna', do: 'fly', to: S2, dur: 18, pose: 'a5_sukLeap', ease: 'outQuad' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 0, who: 'gojo', do: 'expr', face: 'calm', eyes: 'closed' },
      // 1. over Gojo's shoulder: the swollen Blue, the Red drifting into it, Mahoraga hanging above, Sukuna below (hold)
      { t: 0, shot: 'static', cam: OTS },
      { t: 0, env: { set: 'black' } }, { t: 4.4, env: { set: 'sky' } },
      { t: 0, env: { light: [0.4, -0.3, -0.35] } },
      { t: 0, who: 'gojo', do: 'place', at: G2, face: dW, pose: 'a5_backStand' },
      { t: 0, who: 'gojo', do: 'view', view: 'back' },
      { t: 4.4, who: 'gojo', do: 'place', at: G2, face: dW, pose: 'a5_hover' },
      { t: 4.4, who: 'gojo', do: 'view', view: 'side' },
      // 2. the page (right → left): Mahoraga at the top of its arc · Sukuna rising, grinning · Gojo, eyes closed
      { t: 4.4, env: { light: [-0.6, -0.3, 0.65] } },
      { t: 4.4, shot: 'panels', layout: 'strip3v', slant: 26, panels: [
        { shot: { shot: 'static', cam: look(add3(M2, [10, -9, -2]), add3(M2, [0, 0, 2.2]), 420) } },
        { shot: { shot: 'static', cam: look(add3(S2, [3.8, -3.6, 1.6]), add3(S2, [0, 0, -0.4]), 460) }, slamAt: 0.9 },
        { shot: { shot: 'static', cam: look(add3(G2, [dW[0] * 3.6 + pW[0] * 1.2, dW[1] * 3.6 + pW[1] * 1.2, 1.3]), add3(G2, [0, 0, 1.25]), 420) }, slamAt: 1.8 },
      ] },
      { t: 4.4, sfx: 'panelSlam', vol: 0.2 }, { t: 5.3, sfx: 'panelSlam', vol: 0.2 }, { t: 6.2, sfx: 'panelSlam', vol: 0.25 },
      // 3. the hand, against the sky with the two stars far behind it: three phrases, three violet rings
      { t: 8.4, shot: 'static', cam: A.lookShear([G2[0] - dW[0] * 0.5, G2[1] - dW[1] * 0.5, G2[2] + 1.6], [BLUE[0], BLUE[1], BLUE[2] + 18], 520) }, // (pitch folded into the shift: the plate and the FX share one camera)
      { t: 8.4, env: { set: 'black' } },
      { t: 8.4, env: { light: [-0.55, -0.45, 0.7] } },
      HAND,
      { t: 8.4, who: 'gojo', do: 'hide' }, { t: 14.6, who: 'gojo', do: 'show' },
      { t: 8.4, fx: 'chantRings', x: 320, y: 150, scheme: 'purple', px: 120, rings: 3, ringAt: [0.25, 2.9, 4.62], dur: 6.2, flat: 0.8, glow: 0.14, back: false },
      { t: 8.65, sfx: 'handSign', vol: 0.3 }, { t: 11.3, sfx: 'handSign', vol: 0.35 }, { t: 13.02, sfx: 'handSign', vol: 0.4 },
      { t: 13.02, fx: 'skyFlash', x: 330, y: 150, r: 90, col: C.lavender, dur: 0.4 },
      // 4. his eyes in violet light (the Six Eyes open); the two stars begin to draw together; a low charge rises
      { t: 14.6, shot: 'closeup', who: 'gojo', yaw: YAW_W + Math.PI - 0.4, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'glow', costume: 'fight', tint: [C.violet, 0.28], rim: C.lavender }, size: 220, bg: 'set' },
      { t: 14.6, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 14.6, fx: 'chantRings', x: 320, y: 214, scheme: 'purple', px: 150, rings: 3, ringAt: [0, 0.01, 0.02], dur: 3.4, flat: 0.8, glow: 0.18, back: true, spin: 1.6 },
      { t: 15.2, sfx: 'sixEyes', vol: 0.35, pitch: 0.8 },
      { t: 17.6, sfx: 'purpleCharge', vol: 0.45 },
    ],
  });
})();
