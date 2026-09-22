/* ACT IV · 12 — a4_flash34 (24 s). Canon ch. 235: the consecutive Black Flashes restore his reverse-technique output —
   Gojo's arm grows back in a flare of RCT (he is whole again) and a rush of exhilaration takes him; Sukuna, for the first
   time in a thousand years, is uneasy. Black Flash #3: a straight right blows Mahoraga back past its master. Sukuna closes
   in — Gojo catches his arm and throws him into Mahoraga's arms — Black Flash #4: the giant shields its master with the
   flat of its sword and is still blasted, with him, through the glass tower across the street (b334), which sinks into
   its own dust. Gojo rises skyward out of the dust, toward the small blue star still hanging over the city (Act V: high
   above, at sunset).
   Geography: the EW street at y = 112 (y 104–120), west of the trench mouth (the Blue's trench fills the road for
   x > −42, rounded cap to x ≈ −47): the fight stays on the intact road and the north sidewalk (y 117–120); b334's south
   face is y = 120.25 (x −44.5 … −14.4). Missing-arm rule: until the swap at 1.5 s the camera stays on his left. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const B334 = HT.city.byId[A.COLLAPSE];
  const FACE_Y = B334 ? B334.y0 : 120.25, X0 = B334 ? B334.x0 : -44.53;
  const P0 = [-52.0, 113.2, 7.6], P1 = [-52.0, 113.2, 5.8];            // hovering over the street's west end
  const MG = [-40.2, 118.0, 0], SG = [-39.9, 119.35, 0];                 // BF4: the giant shielding its master
  const CRASH = [-40.1, FACE_Y, 2.2];
  const BF3 = 7.5, BF4 = 11.75, HIT4 = BF4 + 12 / 30;                    // contact times; HIT4 = end of BF4's hit-stop
  const RISE = [-47.4, 116.4, 0.3];
  const ENV = A.ENV;
  HT.fightScene({
    id: 'a4_flash34', act: 'IV', title: 'Black Flash, Black Flash', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      g1: { char: 'gojo1', at: P0, face: 'east', pose: 'a4HoverGuard', costume: 'fight' },
      gojo: { char: 'gojo', at: P0, face: 'east', pose: 'a4HoverGuard', costume: 'fight' },
      maho: { char: 'mahoraga', at: [-42.1, 118.9, 0], face: 'west', pose: 'maho_idle' },
      sukuna: { char: 'sukuna', at: [-44.8, 117.4, 0], face: 'west', pose: 'guard', costume: 'fight' },
      sukB: { char: 'sukuna', at: [-44.8, 117.4, 0], face: 'west', pose: 'guard', costume: 'fight' },   // bust helper
    },
    ambience: [{ name: 'wind', vol: 0.45 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, who: 'gojo', do: 'hide' }, { t: 0, who: 'sukB', do: 'hide' },
      { t: 0, who: 'maho', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 225, wheelGlow: 0.5 },
      { t: 0, who: 'g1', do: 'expr', face: 'grit', eyes: 'glow' },
      { t: 0, who: 'gojo', do: 'expr', face: 'open', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'serious', eyes: 'narrow', eyes2: 'open' },
      { t: 0, fx: 'a4blueStar', at: A.BLUE, r: 1.1, dur: 24 },
      // ---- 0–2.2: from his left (north), hovering over the street, one-armed: RCT flares behind his torso — at the
      //      far shoulder — and under the flare he is whole again (identical tracks, the swap at 1.5 is invisible)
      { t: 0, shot: 'static', cam: { x: -50.8, y: 117.6, z: 8.1, yaw: Math.PI + 0.15, f: 480 } },
      { t: 0, who: 'g1', do: 'fly', to: P1, dur: 2.3, pose: 'a4HoverGuard', ease: 'inOutSine' },
      { t: 0, who: 'gojo', do: 'fly', to: P1, dur: 2.3, pose: 'a4HoverGuard', ease: 'inOutSine' },
      { t: 0.3, fx: 'rctGlow', at: 'g1.chest', r: 0.22, dur: 1.45, steam: true, vol: 0.8 },
      { t: 1.2, fx: 'rctGlow', at: 'gojo.chest', r: 0.38, dur: 0.75, sfx: false },
      { t: 1.45, fx: 'rctGlow', at: 'gojo.chest', r: 0.2, dur: 0.8, steam: true, sfx: false },
      { t: 1.5, who: 'g1', do: 'hide' }, { t: 1.5, who: 'gojo', do: 'show' },
      // ---- 2.2–3.8: from his right, waist-up: the regrown hand rises before his eyes, opens — and closes into a fist
      { t: 2.2, shot: 'static', cam: { x: -51.75, y: 111.2, z: 7.55, yaw: 0.07, f: 500 } },
      { t: 2.2, who: 'gojo', do: 'place', at: P1, face: 'east', pose: 'a4HoverGuard' },
      { t: 2.25, who: 'gojo', do: 'pose', pose: 'a4FlexA', dur: 0.4 },
      { t: 2.35, fx: 'rctGlow', at: 'gojo.hand', r: 0.035, dur: 1.2, steam: true, sfx: false },
      { t: 3.05, who: 'gojo', do: 'pose', pose: 'a4Flex', dur: 0.15 },
      { t: 3.1, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      // ---- 3.8–5.3: exhilaration — the grin, the Six Eyes blazing
      { t: 3.8, shot: 'closeup', who: 'gojo', yaw: 1.3, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'glow', rct: 0.5, steam: 0.4 }, size: 214, bg: 'haze', haze: C.lilacgrey, dim: 0.55 },
      { t: 3.9, sfx: 'sixEyes', vol: 0.4 },
      // ---- 5.3–6.6: Sukuna, uneasy for the first time in a thousand years
      { t: 5.3, shot: 'closeup', who: 'sukB', yaw: -1.25, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'narrow', eyes2: 'open', sweat: 0.6, nod: -6 }, size: 208, bg: 'haze', haze: C.shadow, dim: 0.55 },
      { t: 5.4, sfx: 'heartbeat', vol: 0.35 },
      // ---- 6.6–9.3: the street from the south, over the trench mouth: the giant charges — Gojo blitzes past Sukuna:
      //      BLACK FLASH #3, a straight right (the regrown arm), blows Mahoraga back, past its master and out of frame
      { t: 6.6, shot: 'static', cam: { x: -47.4, y: 111.4, z: 1.6, yaw: 0.02, f: 420, shift: 22 } },
      { t: 6.6, who: 'maho', do: 'show' }, { t: 6.6, who: 'sukuna', do: 'show' },
      { t: 6.6, who: 'gojo', do: 'place', at: [-51.4, 118.6, 0], face: 'east', pose: 'guard' },
      { t: 6.6, who: 'sukuna', do: 'place', at: [-47.3, 117.1, 0], face: 'west', pose: 'guard' },
      { t: 6.6, who: 'maho', do: 'place', at: [-42.3, 118.9, 0], face: 'west', pose: 'maho_idle' },
      { t: 6.65, who: 'maho', do: 'mahoStep', rootScale: 0.9 },
      { t: BF3 - 8 / 30, who: 'gojo', do: 'a4BlueFist', target: 'maho', hit: 'hit', strength: 4, hitstop: 11, knock: 1.6, react: 'mahoStagger', impact: 2, impactMode: '2tone', hitSfx: 'hitHuge', fxHit: false },
      { t: BF3, fx: 'blackFlash', at: 'contact', dir: [1, 0, 0], scale: 1.3 },
      { t: BF3, kana: 'ドン', x: 430, y: 110, size: 5, dur: 1.0, style: 'impact' },
      { t: BF3 + 0.1, fx: 'dust', at: [-43.0, 118.9, 0.3], n: 8, r: 2, size: 0.7, col: 'concrete', dur: 2.0, sfx: false },
      { t: BF3 + 0.45, post: 'manga', dur: 0.6, in: 0.06, out: 0.18, wipe: 'diag', focus: 'maho.chest', lines: { n: 60, inner: 70 } },
      { t: BF3 + 0.3, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'wide', eyes2: 'open' },
      { t: BF3 + 0.5, who: 'sukuna', do: 'face', face: 'east' },
      // ---- 9.3–11.2: closer: Sukuna comes at him from behind — Gojo catches the arm, turns, and swings him past
      //      himself into Mahoraga's arms
      { t: 9.3, shot: 'static', cam: { x: -46.3, y: 111.7, z: 1.5, yaw: 0.14, f: 440, shift: 18 } },
      { t: 9.3, who: 'gojo', do: 'place', at: [-45.2, 118.5, 0], face: 'west', pose: 'guard' },
      { t: 9.3, who: 'sukuna', do: 'place', at: [-47.4, 118.2, 0], face: 'east', pose: 'guard' },
      { t: 9.3, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'narrow', eyes2: 'open' },
      { t: 9.3, who: 'maho', do: 'place', at: [-40.2, 118.95, 0], face: 'west', pose: 'maho_kneel' },
      { t: 9.35, who: 'maho', do: 'pose', pose: 'maho_idle', dur: 0.6 },
      { t: 9.45, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'block', react: false, hitSfx: 'block', fxHit: false, strength: 2 },
      { t: 9.62, who: 'gojo', do: 'catchFist' },
      { t: 9.72, kana: 'ガシ', x: 300, y: 150, size: 3, dur: 0.6, style: 'impact' },
      { t: 10.0, who: 'gojo', do: 'face', face: 'east' },
      { t: 10.0, who: 'gojo', do: 'a4TossFoe' },
      { t: 10.05, who: 'sukuna', do: 'fly', to: [-45.6, 119.1, 0.8], dur: 0.25, pose: 'hitHigh', ease: 'inQuad' },
      { t: 10.3, who: 'sukuna', do: 'fly', to: [-44.5, 118.6, 1.0], dur: 0.23, pose: 'hitFly', ease: 'linear' },
      { t: 10.53, who: 'sukuna', do: 'fly', to: [-40.9, 118.7, 1.0], dur: 0.32, pose: 'hitFly', ease: 'outQuad' },
      { t: 10.53, sfx: 'whooshL', vol: 0.7 },
      { t: 10.65, who: 'maho', do: 'a4MahoCatch' },
      { t: 10.85, sfx: 'bodyFall', vol: 0.5 },
      // ---- 11.2–12.9: BLACK FLASH #4, from over the trench: the giant shields its master with the flat of its sword;
      //      both are blasted through the glass tower's face behind them
      { t: 11.2, shot: 'static', cam: { x: -38.4, y: 108.8, z: 1.9, yaw: -0.215, f: 330, shift: 16 } },
      { t: 11.2, who: 'maho', do: 'place', at: MG, face: 'south', pose: 'maho_idle' },
      { t: 11.2, who: 'sukuna', do: 'place', at: SG, face: 'south', pose: 'guard' },
      { t: 11.2, who: 'gojo', do: 'place', at: [-40.7, 112.4, 0.9], face: 'north', pose: 'a4HoverGuard' },
      { t: 11.42, who: 'maho', do: 'mahoBlock' },
      { t: BF4 - 8 / 30, who: 'gojo', do: 'cross', target: 'maho', hit: 'block', strength: 4, hitstop: 12, react: false, hitSfx: 'hitHuge', fxHit: false, impact: 3, impactMode: '2tone' },
      { t: BF4, fx: 'blackFlash', at: 'contact', dir: [0, 1, 0], scale: 1.5 },
      { t: BF4, sfx: 'swordRing', vol: 0.8 },
      { t: BF4, kana: 'ドゴォ', x: 420, y: 96, size: 5, dur: 1.1, style: 'impact' },
      { t: HIT4, who: 'maho', do: 'launch', vel: [0.3, 8.5, 0.9], g: 1, dur: 0.5, pose: 'maho_hitHeavy', ground: false },
      { t: HIT4, who: 'sukuna', do: 'launch', vel: [0.3, 8.5, 0.8], g: 1, dur: 0.5, pose: 'hitFly', ground: false },
      { t: HIT4 + 0.06, damage: { kind: 'hole', b: A.COLLAPSE, face: 's', u: CRASH[0] - X0, v: CRASH[2], r: 2.5 } },
      { t: HIT4 + 0.07, who: 'sukuna', do: 'hide' }, { t: HIT4 + 0.23, who: 'maho', do: 'hide' },
      { t: HIT4 + 0.07, fx: 'glass', at: CRASH, n: 44, speed: 6, dir: [0, -1, 0.2] },
      { t: HIT4 + 0.07, fx: 'debris', at: CRASH, n: 16, speed: 7, size: 0.45, dir: [0, -1, 0.3], spread: 0.7, dur: 1.6, sfx: false },
      { t: HIT4 + 0.1, fx: 'dust', at: [CRASH[0], CRASH[1] - 1.2, 0.6], n: 6, r: 2.2, size: 0.8, col: 'concrete', dur: 1.7, sfx: false },
      { t: HIT4 + 0.07, sfx: 'wallCrash', vol: 1 }, { t: HIT4 + 0.15, sfx: 'glassShatter', vol: 0.8 },
      { t: HIT4 + 0.07, shake: 0.6 },
      { t: HIT4 + 0.3, who: 'gojo', do: 'pose', pose: 'a4HoverGuard', dur: 0.3 },
      // ---- 12.9–14.1: behind him: the hole in the glass, glass still raining — the building groans
      { t: 12.9, shot: 'static', cam: { x: -41.6, y: 110.6, z: 2.2, yaw: 0.08, f: 360, shift: 10 } },
      { t: 12.9, who: 'gojo', do: 'place', at: [-42.0, 116.0, 1.0], face: [0.5, 1], pose: 'a4HoverGuard' },
      { t: 12.9, fx: 'smoke', at: [CRASH[0], CRASH[1] - 0.3, 1.2], rate: 3, life: 2.4, rise: 0.5, size: 0.9, grow: 1.6, dark: false, wind: 0.4, dur: 1.2, sfx: false },
      { t: 12.9, fx: 'glass', at: [CRASH[0], CRASH[1], 4.6], n: 18, speed: 1.5, dir: [0, -1, -0.2] },
      { t: 13.0, sfx: 'glassTinkle', vol: 0.5 },
      { t: 13.3, sfx: 'steelGroan', vol: 0.6, dur: 3 },
      { t: 13.5, shake: 0.2 },
      // ---- 14.1–18.0: across the avenue, from the south-east: the glass tower sinks into its own dust
      { t: 14.1, shot: 'static', cam: { x: 4, y: 93, z: 3, yaw: -0.62, pitch: 0.55, f: 200 } },
      { t: 14.1, who: 'gojo', do: 'place', at: [-46.2, 116.8, 0], face: 'north', pose: 'loose' },
      { t: 14.1, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 14.2, damage: { kind: 'collapse', b: A.COLLAPSE, dur: 3.6 } },
      { t: 14.2, sfx: 'collapse', vol: 1, dur: 4 }, { t: 14.2, sfx: 'rumble', vol: 0.8, dur: 3.8 },
      { t: 14.3, fx: 'dust', at: [B334 ? (B334.x0 + B334.x1) / 2 : -29.5, FACE_Y + 6, 6], n: 16, r: 18, size: 6, rise: 2.0, col: 'concrete', dur: 7.0, sfx: false },
      { t: 15.0, fx: 'smoke', at: [B334 ? (B334.x0 + B334.x1) / 2 : -29.5, B334 ? (B334.y0 + B334.y1) / 2 : 143.5, 0], rate: 4, life: 5, rise: 3, size: 5, grow: 2, dark: false, wind: 1.5, dur: 9, sfx: false },
      { t: 14.4, shake: 0.35 }, { t: 16.2, shake: 0.3 },
      // ---- 18.0–20.7: low in the settling dust: he looks up — and lifts off, out of frame
      { t: 18.0, shot: 'static', cam: { x: -50.5, y: 112.8, z: 0.9, yaw: 0.71, pitch: 0.5, f: 360 } },
      { t: 18.0, who: 'gojo', do: 'place', at: RISE, face: 'south', pose: 'a4LookSky' }, // toward the Blue (south, high)
      { t: 18.6, who: 'gojo', do: 'fly', to: [RISE[0], RISE[1], 12], dur: 2.1, pose: 'a4RiseSky', ease: 'inQuad' },
      { t: 18.6, sfx: 'windGust', vol: 0.4, dur: 3 },
      { t: 18.2, amb: 'sky', vol: 0.55, fade: 3 },
      { t: 18.2, amb: 'rubble', vol: 0, fade: 3 },
      // ---- 20.7–24: high above the district: he rises into frame and slows to a hover at the Blue's height — two points
      //      in the overcast, the blue star hanging to the east (Act V: high above, at sunset)
      { t: 20.7, shot: 'static', cam: { x: -90, y: 140, z: 150, yaw: 2.32, pitch: 0, f: 400 } }, // Gojo and the Blue: two points at one height
      { t: 20.7, who: 'gojo', do: 'place', at: [RISE[0], RISE[1], 128], face: 'south', pose: 'a4RiseSky' },
      { t: 20.7, who: 'gojo', do: 'fly', to: [RISE[0], RISE[1], 156], dur: 3.3, pose: 'a4RiseSky', ease: 'outCubic' },
      { t: 21.0, sfx: 'windGust', vol: 0.3, dur: 3 },
    ],
  });
})();
