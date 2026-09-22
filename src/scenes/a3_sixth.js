/* ACT III · 2 — a3_sixth (20 s). Canon ch. 230. Dust, noon, under the expressway where the Void broke (a shaft of light through the deck hole). Sukuna comes
   round and heals his chest (RCT); Mahoraga draws its sword out of the asphalt and sinks back into the shadow. Gojo
   tries a sixth expansion — the seal, a flicker of the Void, nothing; a thin nosebleed; he drops to one knee. Sukuna
   sets the wheel above his own head and tries to expand: his Shrine rises, stunted, and crumbles as it forms; thin
   dark lines from his nose and eyes (stylised). Gojo laughs. Both techniques are burnt out: from here on, fists and
   Blue. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const S0 = A.S0, G0 = A.G1, M0 = A.M0;               // Gojo stands where he strolled to in a3_frozen (G1)
  const POOL = [(S0[0] + M0[0]) / 2, (S0[1] + M0[1]) / 2, 0];
  HT.fightScene({
    id: 'a3_sixth', act: 'III', title: 'The Sixth Expansion', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.2, fogNear: 40, fogFar: 520, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: G0, face: 'west', pose: 'a3redTwo', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'east', pose: 'a3slump', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'rubble', vol: 0.3 }, { name: 'cityEmpty', vol: 0.2 }],
    hooks: {
      front(ctx, S) {
        // Sukuna's close-up after the failed expansion: the wheel above his head, thin dark lines under his eyes
        if (S.t >= 14.5 && S.t < 15.9) { A.bustWheel(ctx, S, { notch: 1 }); A.bustLines(ctx, S, { k: HT.clamp((S.t - 14.6) / 0.5, 0, 1) }); }
      },
    },
    script: [
      // the whole scene: the deck's noon shadow, its shaded underside, the shaft of light through the hole
      { t: 0, fx: 'a3shade', dur: 20 },
      { t: 0, fx: 'a3deck', dur: 20 },
      { t: 0, fx: 'a3shaft', dur: 20 },
      // Mahoraga (drawn as an FX so its blade can sit in the asphalt and it can sink into the ground)
      { t: 0, fx: 'shadowPool', at: POOL, r: 2.8, grow: 0.01, out: 1.3, dur: 6.4, sfx: false },
      { t: 0, fx: 'a3maho', at: M0, face: 'east', dur: 6.4, layer: 'behind', keys: [
        [0, 'maho_plunge', 1, { wheelAngle: 45 }], [3.8, 'maho_plunge', 1, { wheelAngle: 45 }], [4.2, 'maho_kneel', 1, { wheelAngle: 45 }],
        [4.5, 'maho_kneel', 1, { wheelAngle: 45 }], [6.2, 'maho_emerge', 0.0, { wheelAngle: 45 }]] },
      // 1. Sukuna comes round (medium, from Gojo's side; Mahoraga kneels behind him, blade in the asphalt)
      { t: 0, shot: 'static', cam: { x: S0[0] + 3.5, y: S0[1] - 3.7, z: 1.25, yaw: -0.74, f: 560, shift: 52 }, to: { x: S0[0] + 3.2, y: S0[1] - 3.35 }, dur: 3.4, ease: 'linear', twos: true },
      { t: 0.3, sfx: 'windGust', vol: 0.18, pan: -0.2, dur: 3 },
      // fighters off-screen beside the lens are hidden for those shots (the renderer would draw them 800-1300 px tall)
      { t: 0, who: 'gojo', do: 'hide' }, { t: 3.4, who: 'gojo', do: 'show' },
      { t: 6.4, who: 'sukuna', do: 'hide' }, { t: 9.6, who: 'sukuna', do: 'show' },
      { t: 14.5, who: 'gojo', do: 'hide' }, { t: 15.9, who: 'gojo', do: 'show' },
      { t: 15.9, who: 'sukuna', do: 'hide' }, { t: 17.1, who: 'sukuna', do: 'show' },
      { t: 1.1, who: 'sukuna', do: 'pose', pose: 'rise', dur: 1.0, ease: 'inOutSine' },
      { t: 1.1, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'narrow' },
      { t: 1.5, fx: 'rctGlow', at: 'sukuna.chest', r: 0.22, steam: true, dur: 2.2 },
      { t: 2.3, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.8, ease: 'inOutSine' },
      { t: 2.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 2. Mahoraga draws the blade out and sinks back into the shadow (low, from the south)
      { t: 3.4, shot: 'static', cam: { x: S0[0] + 3.1, y: S0[1] - 9.5, z: 0.95, yaw: -0.2, f: 460, shift: 52 } },
      { t: 3.4, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.6 },
      { t: 3.9, sfx: 'swordRing', vol: 0.45, pitch: 0.8 },
      { t: 3.9, fx: 'debris', at: [M0[0] + 1.1, M0[1] - 0.2, 0.1], n: 8, speed: 3, size: 0.22, up: 1.2, mat: 'asphalt', dur: 1.4 },
      { t: 4.5, sfx: 'shadowRise', vol: 0.6, pitch: 0.85 },
      { t: 5.4, sfx: 'downer', vol: 0.3 },
      // 3. Gojo's sixth expansion: the seal — a flicker of the Void — nothing
      { t: 6.4, shot: 'static', cam: { x: G0[0] + 0.5, y: G0[1] - 5.4, z: 1.45, yaw: -0.08, f: 600, shift: 56 } },
      { t: 6.4, who: 'gojo', do: 'view', view: 'front' },
      { t: 6.4, who: 'gojo', do: 'place', at: G0, face: 'south', pose: 'frontStand' },
      { t: 6.55, who: 'gojo', do: 'pose', pose: 'signVoid', dur: 0.22 },
      { t: 6.55, who: 'gojo', do: 'expr', face: 'grit', eyes: 'glow' },
      { t: 6.8, sfx: 'handSign', vol: 0.8 },
      { t: 7.0, fx: 'voidBloom', at: 'gojo.chest', r: 52, grow: 0.08, bh: 0, dur: 0.16, sfx: false },
      { t: 7.0, sfx: 'voidOpen', vol: 0.3, pitch: 1.6, dur: 0.3 },
      { t: 7.42, fx: 'voidBloom', at: 'gojo.chest', r: 30, grow: 0.06, bh: 0, dur: 0.1, sfx: false },
      { t: 7.8, sfx: 'tinnitus', vol: 0.12, dur: 2.2 },
      // the cost: close-up — a thin line of blood from the nose, sweat
      { t: 8.2, shot: 'closeup', who: 'gojo', yaw: 0.25, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'narrow', bleed: 0.75, sweat: 0.6, costume: 'fight' }, size: 230, bg: 'haze', haze: C.lilacgrey, dim: 0.45 },
      { t: 8.3, sfx: 'heartbeat', vol: 0.4 },
      // he drops to one knee (low, close)
      { t: 9.6, shot: 'static', cam: { x: G0[0] + 2.4, y: G0[1] - 4.3, z: 0.7, yaw: -0.5, f: 470, shift: 70 } },
      { t: 9.6, who: 'gojo', do: 'view', view: 'side' },
      { t: 9.6, who: 'gojo', do: 'place', at: G0, face: 'west', pose: 'exhaust' },
      { t: 9.6, who: 'gojo', do: 'expr', face: 'grit', eyes: 'narrow', bleed: true },
      { t: 9.85, who: 'gojo', do: 'pose', pose: 'kneel', dur: 0.28, ease: 'inQuad' },
      { t: 10.13, sfx: 'bodyFall', vol: 0.45 },
      { t: 10.13, fx: 'dust', at: [G0[0] - 0.3, G0[1], 0], n: 5, r: 0.6, size: 0.12, col: 'concrete', dur: 1.0 },
      // 4. Sukuna sets the wheel above his own head (medium, from the east)
      { t: 10.9, shot: 'medium', on: ['sukuna'], size: 140, yaw: -1.0, lead: -40, feetY: 400 },
      { t: 11.0, who: 'sukuna', do: 'pose', pose: 'a3wheelRaise', dur: 0.35 },
      { t: 11.35, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 1, alpha: [[0, 0], [0.5, 1]], dur: 8.65, sfx: false },
      { t: 11.4, sfx: 'wheelTurn', vol: 0.5 },
      // … and tries to expand: a stunted Shrine rises behind him and crumbles into crimson dust as it forms
      { t: 12.1, shot: 'static', cam: { x: S0[0] + 1.6, y: S0[1] - 10.8, z: 1.3, yaw: -0.12, f: 400, shift: 36 } },
      { t: 12.1, who: 'sukuna', do: 'view', view: 'front' },
      { t: 12.1, who: 'sukuna', do: 'place', at: S0, face: 'east', pose: 'frontStand' },
      { t: 12.15, who: 'sukuna', do: 'pose', pose: 'signShrine', dur: 0.2 },
      { t: 12.4, sfx: 'handSign', vol: 0.8 },
      { t: 12.45, fx: 'shrineBloom', at: [S0[0], S0[1], 0], back: 4.5, r: 6, h: 6.5, rise: 0.75, spread: 0.6, sky: 0.4, slashes: 0, dur: 0.8, vol: 0.6 },
      { t: 13.25, fx: 'shrineCollapse', at: [S0[0], S0[1], 0], back: 4.5, r: 6, h: 6.5, dur: 1.25, vol: 0.6 },
      { t: 13.25, sfx: 'barrierCrack', vol: 0.5, pitch: 0.7 },
      // the cost for him too: nose and eyes (thin stylised lines), close-up
      { t: 14.5, shot: 'closeup', who: 'sukuna', yaw: -0.22, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'narrow', eyes2: 'open', bleed: 0.6, costume: 'fight' }, size: 230, bg: 'haze', haze: C.lilacgrey, dim: 0.5 },
      { t: 14.7, sfx: 'heartbeat', vol: 0.35, pitch: 0.8 },
      // 5. Gojo laughs (close-up) …
      { t: 15.9, shot: 'closeup', who: 'gojo', yaw: -0.3, dist: 6, f: 820, bust: { expr: 'laugh', bleed: 0.75, sweat: 0.4, costume: 'fight' }, size: 230, bg: 'haze', haze: C.lilacgrey, dim: 0.4 },
      { t: 15.9, who: 'sukuna', do: 'view', view: 'side' },
      { t: 15.9, who: 'sukuna', do: 'place', at: S0, face: 'east', pose: 'loose' },
      { t: 15.9, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open', bleed: true },
      { t: 15.9, who: 'gojo', do: 'place', at: G0, face: 'west', pose: 'a3kneelLaugh' },
      { t: 15.9, who: 'gojo', do: 'expr', face: 'grin', eyes: 'closed', bleed: true },
      { t: 16.0, sfx: 'clothSnap', vol: 0.25, pitch: 1.3 },
      // … and the two-shot: both burnt out, the wheel above Sukuna's head; Gojo gets up grinning (hold)
      { t: 17.1, shot: 'static', cam: { x: S0[0] + 3.3, y: S0[1] - 7.1, z: 0.9, yaw: -0.05, f: 390, shift: 50 }, to: { y: S0[1] - 6.7 }, dur: 2.9, ease: 'linear', twos: true },
      { t: 17.5, who: 'gojo', do: 'pose', pose: 'rise', dur: 0.9, ease: 'inOutSine' },
      { t: 18.5, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.7, ease: 'inOutSine' },
      { t: 18.5, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow', bleed: true },
      { t: 18.8, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.5 },
      { t: 17.2, sfx: 'windGust', vol: 0.2, pan: 0.3, dur: 2.7 },
    ],
  });
})();
