/* ACT V · 6 — a5_landing (20 s). Gojo comes down out of the sunset onto the rim of the erasure — lighter hurt than
   Sukuna, but spent: he lands, his knees give a little, he breathes hard, steam coming off him, and heals (RCT). The
   manga close-up (screentone, B/W): exhausted — then the smile. Back in colour: he straightens on the rim, the vast
   crater and the low sun in front of him, hands going into his pockets (canon ch. 235). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, GR = A.G_RIM;
  const look = (from, to, f, extra) => HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
  const toC = (() => { const d = [E.x - GR[0], E.y - GR[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })(); // rim → crater centre
  HT.fightScene({
    id: 'a5_landing', act: 'V', title: 'The Rim', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', setOpts: { props: false }, env: { time: 'sunset', snow: 0.12, snowFall: 0.1, wind: 0.45, fogFar: 1100 },
    cast: {
      gojo: { char: 'gojo', at: [GR[0], GR[1], 26], face: toC, pose: 'a5_descend', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0.2, dur: 20 },
      { t: 0, post: 'purpleGrade', keys: [[0, 0.24], [20, 0.1]], dur: 20 },
      { t: 0, fx: 'ashFall', density: 0.3, wind: 0.45, ember: 0.08, dur: 20 },
      { t: 0, fx: 'smokeCols', cols: [[GR[0] + 60, GR[1] - 55, 0]], pre: 30, rate: 6, life: 9, rise: 8, size: 3.5, grow: 2.4, dark: true, wind: 3, dur: 20 },
      // 1. from the crater floor, looking up at the rim: he comes down out of the sunset, lands, the knees give a little
      { t: 0, shot: 'static', cam: look([GR[0] + toC[0] * 9.5 + toC[1] * 2, GR[1] + toC[1] * 9.5 - toC[0] * 2, 0.9], [GR[0], GR[1], 3.4], 440) },
      { t: 0.2, who: 'gojo', do: 'fly', to: [GR[0], GR[1], 0], dur: 4.0, pose: 'a5_descend', ease: 'outCubic' },
      { t: 4.2, who: 'gojo', do: 'pose', pose: 'a5_landBend', dur: 0.18 },
      { t: 4.2, fx: 'dust', at: [GR[0], GR[1], 0.1], n: 8, r: 1.6, size: 0.45, rise: 0.4, dur: 1.4, col: 'ash' },
      { t: 4.2, sfx: 'dropSoft', vol: 0.5 },
      { t: 4.3, sfx: 'footConcrete', vol: 0.3 },
      // 2. closer, side-on: breathing hard, steam; the healing glow (RCT)
      { t: 5.6, shot: 'static', cam: look([GR[0] - toC[1] * 5.4 + toC[0] * 1.2, GR[1] + toC[0] * 5.4 + toC[1] * 1.2, 1.0], [GR[0], GR[1], 1.0], 560) },
      { t: 5.6, who: 'gojo', do: 'pose', pose: 'a5_breathe', dur: 0.9, ease: 'inOutSine' },
      { t: 5.6, who: 'gojo', do: 'expr', face: 'open', eyes: 'narrow' },
      { t: 6.6, who: 'gojo', do: 'pose', pose: 'a5_landBend', dur: 1.1, ease: 'inOutSine' },
      { t: 7.8, who: 'gojo', do: 'pose', pose: 'a5_breathe', dur: 1.1, ease: 'inOutSine' },
      { t: 5.8, fx: 'smoke', at: [GR[0], GR[1], 1.2], rate: 4, life: 1.8, rise: 0.6, size: 0.18, grow: 3, dark: false, wind: 0.5, dur: 3.6, sfx: false },
      { t: 6.4, fx: 'rctGlow', who: 'gojo', at: 'gojo.chest', r: 0.2, steam: true, dur: 3.0 },
      { t: 6.4, sfx: 'rctHeal', vol: 0.45, dur: 2.6 },
      // 3. the manga close-up (screentone): exhausted — then the smile
      { t: 9.6, shot: 'closeup', who: 'gojo', yaw: Math.atan2(-toC[0], -toC[1]) + Math.PI + 0.35, dist: 6, f: 820, bust: { expr: 'exhausted', eyes: 'narrow', costume: 'fight', sweat: 0.7, hurt: 0.35, mono: true }, size: 236, dim: 0.2 },
      { t: 9.6, post: 'manga', in: 0.2, wipe: 'diag', out: 0.2, dur: 6.0, focus: true, lines: { n: 70, inner: 150, width: 2 } },
      { t: 9.6, sfx: 'panelSlam', vol: 0.25 },
      { t: 12.6, shot: 'closeup', who: 'gojo', yaw: Math.atan2(-toC[0], -toC[1]) + Math.PI + 0.35, dist: 6, f: 820, bust: { expr: 'smile', eyes: 'narrow', costume: 'fight', sweat: 0.4, hurt: 0.2, mono: true }, size: 236, dim: 0.2 },
      { t: 12.6, sfx: 'clothSnap', vol: 0.12, pitch: 1.6 },
      // 4. colour again: behind him on the rim — the crater and the low sun before him; the hands go into the pockets
      { t: 15.6, shot: 'static', cam: look([GR[0] - toC[0] * 7 + toC[1] * 2.4, GR[1] - toC[1] * 7 - toC[0] * 2.4, 2.4], [GR[0] + toC[0] * 40, GR[1] + toC[1] * 40, 1.4], 420) },
      { t: 15.6, env: { light: [0.4, -0.3, -0.35] } },
      { t: 15.6, who: 'gojo', do: 'place', at: GR, face: toC, pose: 'a5_backStand' },
      { t: 15.6, who: 'gojo', do: 'view', view: 'back' },
      { t: 17.0, who: 'gojo', do: 'pose', pose: 'a5_backPockets', dur: 0.8 },
      { t: 17.4, sfx: 'clothSnap', vol: 0.15, pitch: 1.4 },
    ],
  });
})();
