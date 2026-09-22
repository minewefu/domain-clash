/* ACT I · 10 — a1_exchange1 (26 s). The first exchange (canon ch. 224): both vanish — impacts bloom all over the
   junction in three beats; Sukuna's flurry stops on Infinity (Gojo keeps his hands in his pockets — キィン); an
   uppercut: Gojo floats flat beneath it; Gojo's palm + Blue: Sukuna is slammed through the south-west building (ledger
   `hole`), glass and dust burst out; Gojo pulls rubble into a Blue and flings it after him; the hole smokes. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city, C = HT.C;
  const HB = city.role('holeBuilding');                        // SW corner, east face at x = HB.x1
  const HOLE = [HB.x1, (HB.y0 + HB.y1) / 2 + 6, 2.6];          // where Sukuna goes through the east face
  const ORB = [-3.0, -6.4, 1.8];                                 // the rubble Blue gathers 2 m in front of Gojo, toward the hole
  HT.fightScene({
    id: 'a1_exchange1', act: 'I', title: 'First Exchange', dur: 26, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.42, snowFall: 0.25, wind: 0.5, camMaxDist: 26 },
    cast: {
      gojo: { char: 'gojo', at: [-7, -3, 0], face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [7, -3, 0], face: 'west', pose: 'guardLow', costume: 'fight' },
      orb: { char: 'figure', at: ORB, face: 'south', pose: 'loose' },   // invisible carrier for the thrown Blue
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'cityEmpty', vol: 0.2 }],
    script: [
      { t: 0, who: 'orb', do: 'hide' },
      // ---- beat 1 (0–3.2 s): both vanish; impacts bloom across the junction (high wide), trails
      { t: 0, shot: 'static', cam: { x: -2, y: -24, z: 9, yaw: 0.06, pitch: -0.3, f: 300 } },
      { t: 0.4, who: 'gojo', do: 'blink', to: [-1, 5, 0], face: 'east' },
      { t: 0.4, who: 'sukuna', do: 'blink', to: [1.4, 5, 0], face: 'west' },
      { t: 0.55, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'infinity', speed: 1.8, strength: 2 },
      { t: 1.25, who: 'gojo', do: 'blink', to: [-10, -9, 0], face: 'east' },
      { t: 1.25, who: 'sukuna', do: 'blink', to: [-8.6, -9, 0], face: 'west' },
      { t: 1.4, who: 'gojo', do: 'kick', target: 'sukuna', hit: 'block', speed: 1.8, knock: 0.4 },
      { t: 2.1, who: 'gojo', do: 'blink', to: [8, 9, 0], face: 'east' },
      { t: 2.1, who: 'sukuna', do: 'blink', to: [9.4, 9, 0], face: 'west' },
      { t: 2.25, who: 'sukuna', do: 'hook', target: 'gojo', hit: 'infinity', speed: 1.8, strength: 2 },
      { t: 0.5, fx: 'speedLines', mode: 'focus', at: 'mid', n: 60, inner: 140, dur: 2.7, col: C.white },
      // the three collisions read from the high wide: a ring of air, a dust burst and debris at each
      { t: 0.74, fx: 'shockwave', at: [0.2, 5, 0.2], r: 10, strength: 2.5, dur: 0.7, vol: 0.55 },
      { t: 0.74, fx: 'dust', at: [0.2, 5, 0.3], n: 12, r: 3, size: 1.1, dur: 2.0 },
      { t: 1.6, fx: 'shockwave', at: [-9.3, -9, 0.2], r: 10, strength: 2.5, dur: 0.7, vol: 0.55 },
      { t: 1.6, fx: 'dust', at: [-9.3, -9, 0.3], n: 12, r: 3, size: 1.1, dur: 2.0 },
      { t: 1.6, fx: 'debris', at: [-9.3, -9, 0.2], n: 12, speed: 6, size: 0.3, up: 0.8 },
      { t: 2.44, fx: 'shockwave', at: [8.7, 9, 0.2], r: 12, strength: 3, dur: 0.8, vol: 0.6 },
      { t: 2.44, fx: 'dust', at: [8.7, 9, 0.3], n: 14, r: 3.5, size: 1.3, dur: 2.2 },
      { t: 0.74, kana: 'ドッ', x: 330, y: 150, size: 2, dur: 0.5, style: 'impact' },
      { t: 1.6, kana: 'ドッ', x: 170, y: 210, size: 2, dur: 0.5, style: 'impact' },
      { t: 2.44, kana: 'ドォン', x: 470, y: 120, size: 3, dur: 0.7, style: 'impact' },
      // ---- beat 2 (3.2–6.4 s): the flurry — every blow stops a hand's breadth short (Gojo's hands stay in his pockets)
      { t: 3.2, who: 'gojo', do: 'place', at: [-1.6, -3, 0], face: 'east', pose: 'pocketsTilt' },
      { t: 3.2, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      { t: 3.2, who: 'sukuna', do: 'place', at: [0.3, -3, 0], face: 'west', pose: 'guard' },
      { t: 3.2, shot: 'medium', on: ['gojo', 'sukuna'], size: 128, yaw: 0.12 },
      { t: 3.4, who: 'sukuna', do: 'jab', target: 'gojo', hit: 'infinity', speed: 1.4 },
      { t: 3.85, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'infinity', speed: 1.4 },
      { t: 4.35, who: 'sukuna', do: 'hook', target: 'gojo', hit: 'infinity', speed: 1.4 },
      { t: 4.9, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'infinity', speed: 1.2, strength: 3 },
      { t: 5.2, shot: 'crash', base: 'medium', on: ['gojo', 'sukuna'], target: 'gojo.chest', zoom: 1.9, dur: 0.18, size: 128, yaw: 0.12 },
      { t: 5.25, kana: 'キィン', x: 250, y: 96, size: 3, dur: 0.9, style: 'ring' },
      { t: 5.2, fx: 'infinityAura', who: 'gojo', dur: 1.2, intensity: 0.8 },
      // ---- beat 3 (6.4–8.6 s): the uppercut — Gojo floats flat beneath it (low angle)
      { t: 6.3, shot: 'low', on: ['gojo', 'sukuna'], size: 120, yaw: -0.1, height: 0.3, feetY: 318 },
      { t: 6.4, who: 'sukuna', do: 'uppercut', target: 'gojo', hit: 'miss', space: false },
      { t: 6.5, who: 'gojo', do: 'float', to: [-1.8, -3, 0.2], dur: 0.25, pose: 'floatFlat', bob: 0 },
      { t: 6.5, sfx: 'whooshL', vol: 0.7 },
      { t: 7.6, who: 'gojo', do: 'float', to: [-1.6, -3, 0], dur: 0.3, pose: 'loose', bob: 0 },
      // ---- beat 4 (8.6–12 s): Gojo's palm + Blue — Sukuna is slammed through the south-west building
      { t: 8.6, shot: 'medium', on: ['gojo', 'sukuna'], size: 112, yaw: 0.45 },
      { t: 8.7, who: 'gojo', do: 'palm', target: 'sukuna', hit: 'hit', strength: 3, knock: 0.5, impact: 1, react: 'hitMid' },
      { t: 8.95, fx: 'blueOrb', at: 'sukuna.chest', r: 0.55, dur: 0.9, pull: 0.9, grow: 0.12, end: 'none' },
      { t: 8.95, sfx: 'blueImplode', vol: 0.9 },
      { t: 9.25, who: 'sukuna', do: 'fly', to: [HOLE[0], HOLE[1], HOLE[2] - 1], dur: 0.42, pose: 'hitFly', ease: 'inQuad' },
      { t: 9.25, who: 'sukuna', do: 'trail', dur: 0.45, n: 4, tint: C.sky },
      { t: 9.3, shot: 'static', cam: { x: 6, y: -8, z: 1.8, yaw: -Math.PI / 2 - 0.55, f: 360, shift: 10 } },
      { t: 9.67, who: 'sukuna', do: 'hide' },
      { t: 9.67, damage: { kind: 'hole', b: HB.id, face: 'e', u: HOLE[1] - HB.y0, v: HOLE[2], r: 3.2 } },
      { t: 9.67, sfx: 'wallCrash', vol: 1 },
      { t: 9.67, fx: 'glass', at: HOLE, n: 40, speed: 6, dir: [1, 0, 0.2] },
      { t: 9.67, fx: 'dust', at: HOLE, n: 16, r: 3, size: 1.2, dir: [1, 0, 0] },
      { t: 9.67, fx: 'debris', at: HOLE, n: 16, speed: 7, size: 0.4, dir: [1, 0, 0.3], spread: 0.6 },
      { t: 9.67, kana: 'ドゴォ', x: 190, y: 120, size: 3, dur: 1.0, style: 'impact' },
      { t: 9.67, shake: 0.5 },
      { t: 10.0, shot: 'crash', base: 'static', cam: { x: 6, y: -8, z: 1.8, yaw: -Math.PI / 2 - 0.55, f: 360, shift: 10 }, target: HOLE, zoom: 2.4, dur: 0.22 },
      // ---- beat 5 (12–19 s): Gojo gathers rubble into a Blue and flings it after him
      { t: 12.0, shot: 'static', cam: { x: 5.2, y: -5.4, z: 1.5, yaw: -Math.PI / 2 + 0.12, f: 420, shift: 30 } },
      { t: 12.0, who: 'gojo', do: 'face', face: 'south' },
      { t: 12.2, who: 'gojo', do: 'blue' },
      { t: 12.55, fx: 'blueOrb', at: 'orb', r: 0.55, dur: 3.92, pull: 1.1, debris: 26, grow: 0.3, end: 'none', sfx: false },
      { t: 15.8, sfx: 'blueCharge', vol: 0.7, dur: 3.25 },
      { t: 12.6, fx: 'debris', at: [ORB[0], ORB[1], 0], n: 22, speed: -5, size: 0.5, up: 0.9 },
      { t: 15.0, shot: 'static', cam: { x: 4, y: -2, z: 3, yaw: -Math.PI / 2 - 0.5, f: 300, shift: 30 } },
      { t: 15.8, who: 'gojo', do: 'flick' },
      { t: 16.1, who: 'orb', do: 'fly', to: HOLE, dur: 0.35, ease: 'inQuad' },
      { t: 16.1, sfx: 'whip', vol: 0.8 },
      { t: 16.36, shot: 'static', cam: { x: -4, y: -20, z: 2.0, yaw: -Math.PI / 2 - 0.78, f: 380, shift: 20 } },
      { t: 16.45, fx: 'debris', at: HOLE, n: 26, speed: 9, size: 0.6, dir: [1, 0, 0.4], spread: 0.7 },
      { t: 16.45, fx: 'dust', at: HOLE, n: 22, r: 4, size: 1.6 },
      { t: 16.45, fx: 'shockwave', at: [HOLE[0] + 2, HOLE[1], 0], r: 8, strength: 2 },
      { t: 16.45, sfx: 'groundSlam', vol: 0.9 },
      { t: 16.45, shake: 0.55 },
      // ---- beat 6 (19–26 s): hold on the smoking hole; Gojo rolls his shoulder; silence but the wind
      // over Gojo's shoulder: the smoking hole across the junction; he rolls his shoulder, cracks his neck (hold)
      { t: 19.0, shot: 'static', cam: { x: 3.2, y: 1.3, z: 1.8, yaw: -2.43, f: 340, shift: 30 }, to: { x: 2.9, y: 0.9 }, dur: 7, ease: 'linear' },
      { t: 19.0, who: 'gojo', do: 'place', at: [-1.6, -3, 0], face: [-0.43, -0.9], pose: 'backPockets' },
      { t: 19.0, who: 'gojo', do: 'view', view: 'back' },
      { t: 16.6, fx: 'smoke', at: [HOLE[0] + 0.6, HOLE[1], 3.2], rate: 6, life: 5, rise: 2.1, size: 0.55, grow: 1.7, col: 'ash', wind: 0.9, dur: 9.4 },
      { t: 21.5, who: 'gojo', do: 'pose', pose: 'backPockets', dur: 0.5 },
      { t: 23.2, sfx: 'clothSnap', vol: 0.2, pitch: 1.6 },
    ],
  });
})();
