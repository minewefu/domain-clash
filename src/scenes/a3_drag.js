/* ACT III · 3 — a3_drag (20 s). Canon ch. 230. Techniques burnt out, Gojo fights with Blue alone: a left-hand Blue
   yanks Sukuna in onto a right hook; Gojo seizes him by the collar, rockets out from under the expressway and drags
   him along the facade of the building across the avenue (sparks, a gouge scraped into the concrete), throws him
   down into the street and pulls the rubble onto him with Blue — a trap. The dust settles; the wheel hangs above
   the heap. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const S0 = A.S0, G0 = A.G1, WL = A.WALL;               // where a3_sixth left them
  const WY = WL.y, ZD = 12.8;                              // the facade plane (north face of b214) and the drag height
  const ORB = [G0[0] - 1.25, G0[1], 1.25];                  // the Blue in front of Gojo's left hand
  const SLAM = [-90.5, WY + 0.3, ZD + 0.4];                 // where Sukuna is slammed into the facade
  const DRAG1 = [-107.5, WY + 0.3, ZD - 0.6];               // the end of the drag
  const LAND = [-104, WY + 3.6, 0];                          // thrown down onto the sidewalk / road edge
  const TRAP = [LAND[0], LAND[1], 3.3];                      // the Blue that pulls the rubble onto him
  HT.fightScene({
    id: 'a3_drag', act: 'III', title: 'Blue', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.25, fogNear: 40, fogFar: 520, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: G0, face: 'west', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'east', pose: 'guardLow', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'rubble', vol: 0.3 }],
    script: [
      { t: 0, fx: 'a3shade', dur: 20 }, { t: 0, fx: 'a3deck', dur: 20 }, { t: 0, fx: 'a3shaft', dur: 20 },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 1, dur: 20, sfx: false },
      { t: 0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. the pull: a left-hand Blue — Sukuna is yanked across the gap onto a right hook (side, low)
      { t: 0, shot: 'static', cam: { x: (S0[0] + G0[0]) / 2 + 0.4, y: S0[1] - 7.6, z: 1.05, yaw: 0.02, f: 470, shift: 40 } },
      { t: 0.35, who: 'gojo', do: 'blue' },
      { t: 0.68, fx: 'blueOrb', at: ORB, r: 0.2, pull: 0.9, grow: 0.12, debris: 6, end: 'implode', dur: 0.9 },
      { t: 0.72, who: 'sukuna', do: 'fly', to: [ORB[0] - 0.55, ORB[1], 0.25], dur: 0.36, pose: 'hitMid', ease: 'inQuad' },
      { t: 0.72, who: 'sukuna', do: 'trail', dur: 0.4, n: 4, tint: C.sky },
      { t: 0.72, sfx: 'dashAir', vol: 0.7 },
      { t: 0.8, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 3, hitstop: 6, impact: 1, impactMode: '2tone', knock: 0.4, react: 'hitHigh', trauma: 0.55 },
      { t: 1.1, kana: 'バキッ', x: 250, y: 96, size: 3, dur: 0.8, style: 'impact' },
      // 2. he seizes the collar and rockets them both out from under the deck, into the facade across the avenue
      { t: 1.7, who: 'gojo', do: 'pose', pose: 'flyGrab', dur: 0.1 },
      { t: 1.8, who: 'gojo', do: 'fly', to: [G0[0] + 1.5, WY + 6.5, 4.5], dur: 0.32, pose: 'flyGrab', ease: 'inQuad' },
      { t: 1.8, who: 'sukuna', do: 'fly', to: [G0[0] + 2.2, WY + 5.8, 4.4], dur: 0.32, pose: 'hitFly', ease: 'inQuad' },
      { t: 1.8, who: 'gojo', do: 'trail', dur: 0.8, n: 3, tint: C.ice },
      { t: 1.8, sfx: 'whooshL', vol: 0.8 },
      // they rocket past the lens: hidden for the last frames before the cut (the renderer would draw them 500-1800 px tall)
      { t: 2.03, who: 'sukuna', do: 'hide' }, { t: 2.075, who: 'gojo', do: 'hide' },
      { t: 2.12, who: 'sukuna', do: 'show' }, { t: 2.12, who: 'gojo', do: 'show' },
      { t: 2.12, shot: 'static', cam: { x: SLAM[0] + 3.2, y: WY + 17, z: ZD + 1.6, yaw: Math.PI + 0.12, f: 380, shift: 10 } },
      { t: 2.12, who: 'gojo', do: 'fly', to: [SLAM[0] - 0.9, SLAM[1] + 0.6, SLAM[2] + 0.2], dur: 0.3, pose: 'a3dragPull', ease: 'outQuad' },
      { t: 2.12, who: 'sukuna', do: 'fly', to: SLAM, dur: 0.3, pose: 'a3dragged', ease: 'outQuad', face: 'north' },
      { t: 2.42, damage: { kind: 'hole', b: WL.b, face: 'n', u: WL.x1 - SLAM[0], v: SLAM[2] + 0.4, r: 1.25 } },
      { t: 2.42, fx: 'debris', at: [SLAM[0], WY + 0.4, SLAM[2] + 0.6], n: 22, speed: 7, size: 0.35, dir: [0, 1, 0.3], spread: 0.8, mat: 'concrete' },
      { t: 2.42, fx: 'dust', at: [SLAM[0], WY + 0.5, SLAM[2] + 0.5], n: 10, r: 1.6, size: 0.9, dir: [0, 1, 0] },
      { t: 2.42, sfx: 'wallCrash', vol: 1 },
      { t: 2.42, shake: 0.6 },
      { t: 2.44, kana: 'ドゴッ', x: 380, y: 110, size: 3, dur: 0.8, style: 'impact' },
      // 3. the drag: along the facade, westward — sparks, grit, a gouge scraped into the concrete (tracking)
      { t: 2.9, shot: 'follow', who: 'gojo', offset: [-1.6, 11.8, 1.1], aimZ: 0.35, f: 400, shift: 0 },
      { t: 3.0, who: 'gojo', do: 'fly', to: [DRAG1[0] - 0.9, DRAG1[1] + 0.6, DRAG1[2] + 0.2], dur: 1.75, pose: 'a3dragPull', ease: 'inOutSine' },
      { t: 3.0, who: 'sukuna', do: 'fly', to: DRAG1, dur: 1.75, pose: 'a3dragged', ease: 'inOutSine', face: 'north' },
      { t: 3.0, fx: 'a3groove', y: WY, n: 1, from: [SLAM[0] - 0.6, SLAM[2] + 0.4], to: [DRAG1[0] + 0.4, DRAG1[2] + 0.5], t0: 3.0, t1: 4.75, w: 0.8, dir: 1, dur: 17 },
      { t: 2.9, sfx: 'concreteGrind', vol: 0.9, dur: 1.85 },                                  // audio (M3): the drag along the facade (was rubble + steelGroan)
      { t: 3.2, fx: 'debris', at: [SLAM[0] - 3, WY + 0.4, ZD], n: 10, speed: 5, size: 0.28, dir: [1, 1, 0.1], mat: 'concrete', dur: 2 },
      { t: 3.7, fx: 'debris', at: [SLAM[0] - 8, WY + 0.4, ZD - 0.2], n: 10, speed: 5, size: 0.28, dir: [1, 1, 0.1], mat: 'concrete', dur: 2 },
      { t: 4.2, fx: 'debris', at: [SLAM[0] - 13, WY + 0.4, ZD - 0.4], n: 10, speed: 5, size: 0.28, dir: [1, 1, 0.1], mat: 'concrete', dur: 2 },
      { t: 3.4, fx: 'dust', at: [SLAM[0] - 5, WY + 0.4, ZD], n: 6, r: 1.2, size: 0.8, rise: -0.3, dur: 2.2 },
      { t: 4.1, fx: 'dust', at: [SLAM[0] - 11, WY + 0.4, ZD - 0.3], n: 6, r: 1.2, size: 0.8, rise: -0.3, dur: 2.2 },
      { t: 3.3, kana: 'ガガガ', x: 300, y: 70, size: 3, dur: 1.4, style: 'rumble' },
      // 4. he swings him round and hurls him down into the street (high angle)
      { t: 4.9, shot: 'static', cam: { x: LAND[0] + 22, y: LAND[1] - 0.8, z: 15, yaw: -Math.PI / 2 - 0.03, pitch: -0.55, f: 330 } },
      { t: 4.9, who: 'gojo', do: 'pose', pose: 'a3throw', dur: 0.15 },
      { t: 5.0, who: 'sukuna', do: 'fly', to: [LAND[0], LAND[1], 0.1], dur: 0.42, pose: 'a3fall', ease: 'inQuad' },
      { t: 5.0, who: 'sukuna', do: 'trail', dur: 0.45, n: 3, tint: C.mist },
      { t: 5.0, sfx: 'whooshL', vol: 0.8 },
      { t: 5.42, who: 'sukuna', do: 'place', at: LAND, face: 'east', pose: 'down' },
      { t: 5.42, damage: { kind: 'crater', x: LAND[0], y: LAND[1], r: 2.4 } },
      { t: 5.42, fx: 'crater', at: LAND, r: 2.2 },
      { t: 5.42, fx: 'shockwave', at: LAND, r: 9, strength: 2 },
      { t: 5.42, fx: 'dust', at: [LAND[0], LAND[1], 0.4], n: 14, r: 3.2, size: 1.2, dur: 2.4 },
      { t: 5.42, sfx: 'groundSlam', vol: 1 },
      { t: 5.42, shake: 0.7 },
      { t: 5.44, kana: 'ズドン', x: 330, y: 150, size: 4, dur: 0.9, style: 'impact' },
      // 5. the trap: a Blue above him pulls the rubble in — and lets it all fall on him (low, from the east)
      { t: 6.9, shot: 'static', cam: { x: LAND[0] + 13, y: LAND[1] + 5.5, z: 2.0, yaw: -1.935, pitch: 0.24, f: 340 } },
      { t: 6.9, who: 'gojo', do: 'place', at: [LAND[0] + 5.0, LAND[1] + 2.2, 5.2], face: 'west', pose: 'float' },
      { t: 7.1, who: 'gojo', do: 'blue' },
      { t: 7.0, who: 'sukuna', do: 'pose', pose: 'rise', dur: 0.9 },
      { t: 7.4, fx: 'blueOrb', at: TRAP, r: 0.4, pull: 1.1, grow: 0.3, debris: 16, end: 'none', dur: 2.3 },
      { t: 9.7, sfx: 'blueCharge', vol: 0.7, dur: 2.3 },                                      // audio (M3): builds with the orb 7.4→9.7, lands as the heap falls (was t 7.4 d2)
      { t: 7.45, fx: 'debris', at: [LAND[0], LAND[1], 0], pull: TRAP, n: 26, r: 8, size: 0.55, mat: 'concrete', dur: 2.3 },
      { t: 7.6, fx: 'debris', at: [LAND[0] + 1, WY + 0.4, 9], pull: TRAP, n: 12, r: 5, size: 0.5, mat: 'concrete', dur: 2.1 },
      { t: 9.7, fx: 'a3heap', at: [LAND[0], LAND[1], 0], r: 1.8, n: 30, hgt: 1.5, size: 1.1, build: [0, 0.5], dur: 10.3, layer: 'front' },
      { t: 9.7, sfx: 'collapse', vol: 0.8, dur: 1.6 },
      { t: 9.7, sfx: 'rubble', vol: 0.9, dur: 1.4 },
      { t: 9.75, fx: 'dust', at: [LAND[0], LAND[1], 0.6], n: 16, r: 3, size: 1.3, rise: 0.3, dur: 3.4 },
      { t: 10.2, who: 'sukuna', do: 'hide' },
      { t: 9.7, shake: 0.4 },
      // 6. the dust settles; the wheel hangs over the heap; Gojo lands and waits, loose (hold)
      { t: 11.2, who: 'gojo', do: 'place', at: [LAND[0] + 7.5, LAND[1] + 2.4, 0], face: 'west', pose: 'loose' },
      { t: 11.2, shot: 'static', cam: { x: LAND[0] + 13.2, y: LAND[1] - 1.3, z: 1.3, yaw: -1.217, f: 360, shift: 34 } },
      { t: 11.2, fx: 'smoke', at: [LAND[0], LAND[1], 0.8], r: 1.4, rate: 2.5, life: 5, rise: 0.6, size: 0.7, grow: 1.8, col: 'concrete', dark: false, wind: 0.5, dur: 8.8 },
      { t: 13.0, who: 'gojo', do: 'pose', pose: 'pockets', dur: 0.8 },
      { t: 16.4, fx: 'debris', at: [LAND[0] + 0.4, LAND[1] - 0.2, 1.2], n: 3, speed: 1.6, size: 0.3, up: 1, mat: 'concrete', dur: 1.2 },
      { t: 16.4, sfx: 'rubble', vol: 0.35, dur: 0.6 },
      { t: 18.6, fx: 'debris', at: [LAND[0] - 0.3, LAND[1] + 0.2, 1.3], n: 4, speed: 2.2, size: 0.3, up: 1, mat: 'concrete', dur: 1.2 },
      { t: 18.6, sfx: 'rubble', vol: 0.45, dur: 0.6 },
      { t: 17.2, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow', bleed: true },
    ],
  });
})();
