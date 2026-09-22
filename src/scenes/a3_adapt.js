/* ACT III · 9 — a3_adapt (18 s). Canon ch. 232 (end). Silence. Over the limp head the wheel turns its last notch —
   adaptation complete — blooms gold and drops down into his shadow. Sukuna's head comes up; RCT, steam; the eyes come
   back; he smiles. Gojo's smile goes. Between them, on the asphalt, Sukuna's shadow twitches. (Act IV opens with
   Mahoraga's arms rising out of it.) */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const PX0 = -175.4, GB = [PX0 - 1.3, 7.0, 0], SKO = [GB[0] + 1.25 + 4.65, GB[1] - 0.1, 0];
  const WHEEL0 = [SKO[0], SKO[1], 1.75 * 0.95 + 0.49 - 0.1];     // where the halo hangs over his (fallen-back) head
  const POOL = [SKO[0] - 0.35, SKO[1] - 0.2, 0];
  HT.fightScene({
    id: 'a3_adapt', act: 'III', title: 'Adaptation', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.12, fogNear: 40, fogFar: 560, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: GB, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SKO, face: 'west', pose: 'a3koStand', costume: 'fight' },
      wh: { char: 'figure', at: WHEEL0, face: 'west', pose: 'stand' },
    },
    ambience: [{ name: 'wind', vol: 0.2 }],
    script: [
      { t: 0, who: 'wh', do: 'hide' },
      { t: 0, fx: 'a3deck', dur: 18 }, { t: 0, fx: 'a3shade', dur: 18 },
      { t: 0, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'open', eyes: 'closed', eyes2: 'closed' },
      // 1. the last notch: over the limp head the wheel turns — adaptation complete — and blooms (silence, close)
      { t: 0, shot: 'static', cam: { x: SKO[0] + 2.3, y: SKO[1] - 1.7, z: 1.85, yaw: -0.93, pitch: 0.06, f: 680 } },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 4, notch: 5, turnAt: [1.3], dur: 3.6, sfx: false,
        glow: [[0, 0], [1.3, 0], [1.45, 1], [3.4, 0.7]] },
      { t: 1.3, sfx: 'wheelClunk', vol: 1 }, { t: 1.32, sfx: 'swordRing', vol: 0.3, pitch: 0.5 },
      { t: 1.35, fx: 'glyphRings', at: WHEEL0, r: 0.55, rings: 1, stagger: 0, col: C.gold, dur: 1.4, sfx: false },
      // off-screen / behind-the-lens fighters are hidden (the page's close-up cameras stand where the other one is: 4300-4700 px drawings)
      { t: 3.6, who: 'gojo', do: 'hide' }, { t: 8.8, who: 'sukuna', do: 'hide' }, { t: 13.0, who: 'gojo', do: 'show' }, { t: 13.0, who: 'sukuna', do: 'show' },
      { t: 16.45, who: 'gojo', do: 'hide' },
      // 2. the wheel drops down through him into his shadow (medium, full figure)
      { t: 3.6, shot: 'static', cam: { x: SKO[0] + 2.0, y: SKO[1] - 4.9, z: 1.05, yaw: -0.38, pitch: 0.04, f: 580 } },
      { t: 3.6, fx: 'shadowPool', at: POOL, r: 1.5, grow: 0.8, out: 0.01, tendrils: 5, dur: 14.4, sfx: false },
      { t: 3.6, fx: 'a3wheel', at: 'wh', r: 0.39, mode: 'halo', from: 5, dur: 1.9, sfx: false, alpha: [[0, 1], [1.2, 1], [1.8, 0]], glow: [[0, 0.7], [1.2, 0.2]] },
      { t: 3.9, who: 'wh', do: 'fly', to: [POOL[0], POOL[1], 0.15], dur: 0.9, ease: 'inQuad' },
      { t: 4.8, who: 'wh', do: 'fly', to: [POOL[0], POOL[1], -0.25], dur: 0.7, ease: 'linear' },
      { t: 4.8, fx: 'a3pulse', at: POOL, r: 3.2, col: C.plum, col2: C.shadow, dur: 0.7 },
      { t: 4.8, sfx: 'dropSoft', vol: 0.4 }, { t: 4.85, sfx: 'shadowRise', vol: 0.45, pitch: 0.7 },
      // 3. his head comes up; RCT, steam; the eyes come back (medium) …
      { t: 6.2, shot: 'static', cam: { x: SKO[0] + 1.6, y: SKO[1] - 3.2, z: 1.45, yaw: -0.46, f: 560, shift: 12 }, to: { x: SKO[0] + 1.35, y: SKO[1] - 2.8 }, dur: 2.6, ease: 'inOutSine', twos: true },
      { t: 6.3, fx: 'rctGlow', at: 'sukuna.chest', r: 0.22, steam: true, dur: 2.6 },
      { t: 6.3, sfx: 'rctHeal', vol: 0.55 },
      { t: 6.6, who: 'sukuna', do: 'pose', pose: 'rise', dur: 0.9, ease: 'inOutSine' },
      { t: 7.5, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.8, ease: 'inOutSine' },
      { t: 7.4, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'open', eyes2: 'open' },
      // … and he smiles — a manga page answering the Black Flash page (same layout, fortunes reversed): his grin under
      // focus lines; Gojo's panel slams in, still smiling faintly
      { t: 8.8, shot: 'panels', layout: 'split2', panels: [
        { shot: { shot: 'closeup', who: 'sukuna', yaw: Math.PI / 2 + 0.3, dist: 6, f: 820, bg: 'grad', cols: [[0, C.white], [1, C.mist]], bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open', steam: 0.3, costume: 'fight' } }, tone: true,
          lines: { type: 'focus', n: 70, width: 3 } },
        { shot: { shot: 'closeup', who: 'gojo', yaw: -Math.PI / 2 + 0.3, dist: 6, f: 820, bg: 'grad', cols: [[0, C.dusk], [1, C.lilacgrey]], bust: { expr: 'smile', eyes: 'glow', bleed: 0.75, sweat: 0.5, costume: 'fight' } }, tone: true, slamAt: 0.6 },
      ] },
      { t: 8.8, sfx: 'panelSlam', vol: 0.5 }, { t: 9.4, sfx: 'panelSlam', vol: 0.45 },
      { t: 8.8, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 4. Gojo's smile goes (colour close-up: in screentone his pale features wash out and the change would not read)
      { t: 11.0, shot: 'closeup', who: 'gojo', yaw: -Math.PI / 2 + 0.3, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'glow', bleed: 0.75, sweat: 0.5, costume: 'fight' }, size: 240, bg: 'haze', haze: C.lilacgrey, dim: 0.5 },
      { t: 11.0, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow', bleed: true },
      { t: 11.0, who: 'gojo', do: 'pose', pose: 'guard', dur: 0.8 },
      // 5. the shadow between them twitches (low, on the asphalt; a slow push) — the act ends
      { t: 13.0, shot: 'static', cam: { x: (GB[0] + SKO[0]) / 2 - 0.4, y: SKO[1] + 5.3, z: 0.45, yaw: Math.PI + 0.1, pitch: 0.04, f: 340 }, to: { x: POOL[0] + 0.3, y: POOL[1] + 3.4, z: 0.32, yaw: Math.PI + 0.12, f: 400 }, dur: 5, ease: 'inOutSine', twos: true },
      { t: 13.2, sfx: 'heartbeat', vol: 0.5 }, { t: 14.4, sfx: 'heartbeat', vol: 0.6 }, { t: 15.5, sfx: 'heartbeat', vol: 0.7 },
      { t: 15.9, fx: 'shadowPool', at: POOL, r: 1.9, grow: 0.12, out: 0.25, tendrils: 9, dur: 0.55, sfx: false },
      { t: 15.9, sfx: 'shadowRise', vol: 0.35, pitch: 1.3 },
      { t: 16.8, fx: 'shadowPool', at: POOL, r: 2.2, grow: 0.1, out: 0.2, tendrils: 11, dur: 0.45, sfx: false },
      { t: 16.8, sfx: 'shadowRise', vol: 0.45, pitch: 1.1 },
      { t: 16.9, sfx: 'downer', vol: 0.4 },
      { t: 17.3, post: 'black', in: 0.7, dur: 0.7 },
    ],
  });
})();
