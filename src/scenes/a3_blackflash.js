/* ACT III · 8 — a3_blackflash (20 s). Canon ch. 232. The Red has blasted Sukuna straight at Gojo: a low cross to the
   sternum lands within the millionth of a second — Black Flash (black lightning edged with red, a long freeze held
   on an ink frame). Sukuna is blown back and left standing, knocked out on his feet, eyes white. Then a long
   silence: Gojo breathing, steam off his fist, the wheel still hanging over the limp head. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const PX0 = -175.4;                                              // the pier's west face (a3_red)
  const GB = [PX0 - 1.3, 7.0, 0];                                   // Gojo, coiled (end of a3_red), sunlit under the deck's edge
  const S0 = [GB[0] + 1.25, GB[1] - 0.1, 0.45], SKO = [GB[0] + 1.25 + 4.65, GB[1] - 0.1, 0];
  const CONTACT = [GB[0] + 1.02, GB[1] - 0.05, 1.3];
  HT.fightScene({
    id: 'a3_blackflash', act: 'III', title: 'Black Flash', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.15, fogNear: 40, fogFar: 560, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: GB, face: 'east', pose: 'a3punchWind', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'hitFly', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.25 }],
    hooks: {
      front(ctx, S) { if (S.t >= 1.9 && S.t < 3.0) A.bustWheel(ctx, S, { notch: 4 }); },   // the wheel above the KO'd head (close-up)
    },
    script: [
      { t: 0, fx: 'a3deck', dur: 20 }, { t: 0, fx: 'a3shade', dur: 20 },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 4, dur: 20, sfx: false },
      { t: 0, who: 'gojo', do: 'expr', face: 'grit', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'wide', eyes2: 'open' },
      // 1. the strike (the framing a3_red ended on) — Black Flash: crash zoom, the long freeze on an ink frame
      { t: 0, shot: 'static', cam: { x: GB[0] + 1.8, y: GB[1] + 6.0, z: 1.1, yaw: Math.PI - 0.12, f: 440, shift: 24 } },
      { t: 0, who: 'sukuna', do: 'fly', to: [S0[0] + 0.05, S0[1], 0], dur: 0.15, pose: 'hitFly', ease: 'linear' },
      { t: 0.05, who: 'gojo', do: 'a3bf', target: 'sukuna', hit: 'hit', strength: 4, hitstop: 18, react: 'a3koSlide', knock: 1,
        fxHit: false, hitSfx: false, impact: false, trauma: 1.0 },
      { t: 0.15, fx: 'blackFlash', at: CONTACT, dir: [1, 0, 0.1], scale: 1.8, dur: 0.62 },
      { t: 0.15, shot: 'crash', base: 'static', cam: { x: GB[0] + 1.8, y: GB[1] + 6.0, z: 1.1, yaw: Math.PI - 0.12, f: 440, shift: 24 }, target: CONTACT, zoom: 1.8, dur: 0.12 },
      { t: 0.15, post: 'impact', dur: 1 / 30, mode: 'red', accent: C.red, th: 110 },
      { t: 0.19, post: 'impact', dur: 0.36, mode: '2tone', th: 120 },
      { t: 0.15, sfx: 'blackFlash', vol: 1 }, { t: 0.15, sfx: 'hitHuge', vol: 0.9 }, { t: 0.15, sfx: 'boom', vol: 0.85 }, { t: 0.15, sfx: 'subDrop', vol: 0.8 },
      { t: 0.15, fx: 'shockwave', at: [CONTACT[0], CONTACT[1], 0], r: 9, strength: 3 },
      { t: 0.8, sfx: 'tinnitus', vol: 0.16, dur: 4.5 },
      // 2. blown back, feet dragging — and left standing, limp (side, wide)
      { t: 0.78, shot: 'static', cam: { x: GB[0] + 3.0, y: GB[1] + 9.4, z: 1.15, yaw: Math.PI - 0.02, f: 400, shift: 36 } },
      { t: 0.78, fx: 'dust', at: [S0[0] + 1.5, S0[1], 0.2], n: 8, r: 1.2, size: 0.45, dir: [1, 0, 0], dur: 1.6 },
      { t: 1.05, fx: 'dust', at: [S0[0] + 3.4, S0[1], 0.2], n: 8, r: 1.2, size: 0.45, dir: [1, 0, 0], dur: 1.6 },
      { t: 0.78, sfx: 'skid', vol: 0.6, dur: 0.7 },                                           // audio (M3): the KO slide (was footConcrete)
      { t: 0.95, fx: 'smoke', at: 'gojo.hand2', r: 0.1, rate: 7, life: 1.6, rise: 0.6, size: 0.12, grow: 1.5, dark: false, col: 'snow', wind: 0.2, dur: 5, follow: true },
      { t: 1.5, who: 'sukuna', do: 'expr', face: 'open', eyes: 'closed', eyes2: 'closed' },
      { t: 1.9, who: 'gojo', do: 'pose', pose: 'exhaust', dur: 0.9, ease: 'inOutSine' },
      // his face (colour close-up): head lolled back, all four eyes rolled white — out cold on his feet
      { t: 1.9, shot: 'closeup', who: 'sukuna', yaw: Math.PI / 2 - 0.25, dist: 6, f: 820, size: 250, bg: 'haze', haze: C.lilacgrey, dim: 0.5,
        bust: { expr: 'shock', eyes: 'wide', eyes2: 'open', look: [0, -9], nod: -10, roll: 10, blink: false, costume: 'fight' } },
      // 3. a manga page (screentone): his face, eyes rolled white · Gojo, spent, steam rising off him
      { t: 3.0, shot: 'panels', layout: 'split2', panels: [
        { shot: { shot: 'closeup', who: 'sukuna', yaw: Math.PI / 2 - 0.25, dist: 6, f: 820, bg: 'grad', cols: [[0, C.white], [1, C.mist]], bust: { expr: 'shock', eyes: 'wide', look: [0, -9], eyes2: 'open', nod: -10, roll: 10, blink: false, costume: 'fight' } }, tone: true,
          lines: { type: 'focus', n: 70, width: 3 } },
        { shot: { shot: 'closeup', who: 'gojo', yaw: -Math.PI / 2 + 0.3, dist: 6, f: 820, bg: 'grad', cols: [[0, C.dusk], [1, C.lilacgrey]], bust: { expr: 'serious', eyes: 'glow', bleed: 0.75, sweat: 0.6, steam: 0.6, costume: 'fight' } }, tone: true, slamAt: 0.5 },
      ] },
      { t: 3.0, sfx: 'panelSlam', vol: 0.5 }, { t: 3.5, sfx: 'panelSlam', vol: 0.45 },
      // close-up cameras sit where the other fighter stands: hide him (busts still draw), or the renderer draws an
      // off-screen 1700-2000 px body (40-65 ms per drawing); likewise for the later close-up and the last shot
      { t: 1.9, who: 'gojo', do: 'hide' }, { t: 3.0, who: 'sukuna', do: 'hide' }, { t: 6.2, who: 'gojo', do: 'show' }, { t: 6.2, who: 'sukuna', do: 'show' },
      { t: 12.0, who: 'sukuna', do: 'hide' }, { t: 17.0, who: 'sukuna', do: 'show' }, { t: 17.0, who: 'gojo', do: 'hide' },
      // 4. the long hold: silence under the expressway; he stands out cold, the wheel still over his head
      { t: 6.2, shot: 'static', cam: { x: GB[0] - 2.2, y: GB[1] - 2.1, z: 1.35, yaw: 1.2, f: 420, shift: 28 } },
      { t: 6.2, fx: 'dust', at: [SKO[0] - 2, SKO[1] - 1, 0.1], n: 5, r: 3, size: 0.6, rise: 0.05, col: 'concrete', alpha: 0.35, layer: 'behind', dur: 5.8 },
      { t: 6.4, sfx: 'windGust', vol: 0.18, dur: 4 },
      { t: 9.0, who: 'gojo', do: 'pose', pose: 'loose', dur: 1.4, ease: 'inOutSine' },
      // 5. Gojo: spent, and a faint smile — the Black Flash's clarity (close-up), the Six Eyes (ECU)
      { t: 12.0, shot: 'closeup', who: 'gojo', yaw: -Math.PI / 2 + 0.3, dist: 6, f: 820, bust: { expr: 'smile', eyes: 'narrow', bleed: 0.75, sweat: 0.5, steam: 0.4, costume: 'fight' }, size: 236, bg: 'haze', haze: C.lilacgrey, dim: 0.5 },
      { t: 15.0, shot: 'ecu', who: 'gojo', yaw: -Math.PI / 2 },
      { t: 15.0, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow', bleed: true },
      { t: 15.1, sfx: 'sixEyes', vol: 0.3 },
      // 6. back to him: limp, head fallen back; above it the wheel waits (low, close)
      { t: 17.0, shot: 'static', cam: { x: SKO[0] - 1.6, y: SKO[1] - 3.3, z: 0.7, yaw: 0.45, pitch: 0.34, f: 420 } },
      { t: 17.5, sfx: 'heartbeat', vol: 0.45 }, { t: 18.6, sfx: 'heartbeat', vol: 0.5 },
    ],
  });
})();
