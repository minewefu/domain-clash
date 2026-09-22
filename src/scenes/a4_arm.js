/* ACT IV · 9 — a4_arm (18 s). Canon ch. 234: Sukuna, watching from the shadows, is displeased with his shikigami — the
   Divine General is HIS shadow now. On cue the wheel turns again (the second adaptation — the one Sukuna will later use
   as his model for the World-Cutting Slash; Act VI remembers this notch). Gojo leaps over Agito's charge; from twenty-
   five metres away Mahoraga throws a flying slash: one hairline across the whole frame — impact frame — cut-away to the
   glass tower behind him, gashed across its face. Gojo falls out of the sky and lands hard; his right arm is gone (never
   shown: framing keeps that side away from the camera). Sukuna, content. The shikigami close in; Gojo breaks for the
   tower (→ the climb). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = [2.0, 85.5, 0], M = [26.0, 88.5, 0], AG = [11.5, 83.4, 0], SK = [17.5, 96.2, 0];
  const APEX = [2.3, 85.6, 12.5];                               // Gojo at the top of his leap when the slash reaches him
  const TB = HT.city.byId[A.TOWER], GS = A.GASH, CUT_T = 7.27, AWAY = 7.35;
  const SW = [M[0] - 1.0, M[1] - 0.1, 2.6];                     // the sword at release
  const dir = [APEX[0] - SW[0], APEX[1] - 0.2 - SW[1], APEX[2] + 1.4 - SW[2]], sT = (-50 - SW[0]) / dir[0];
  const GASHC = [-50, SW[1] + dir[1] * sT, SW[2] + dir[2] * sT]; // where the slash meets the tower's east face (≈ y 78.5, z 21.7)
  const holes = [];                                             // the gash: a row of punched-through holes along the cut
  for (let k = 0; k < 13; k++) { const u = k / 12, taper = 1 - 0.45 * Math.abs(u - 0.5) * 2; holes.push({ t: AWAY, damage: { kind: 'hole', b: A.TOWER, face: 'e', u: lerp(GS.y0, GS.y1, u) - (TB ? TB.y0 : 61), v: lerp(GS.z0, GS.z1, u) + (k % 2 ? 0.2 : -0.15), r: (1.25 + 0.45 * HT.hash(k, 77)) * taper } }); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  const ENV = A.ENV;
  HT.fightScene({
    id: 'a4_arm', act: 'IV', title: 'The Wheel Turns', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'guard', costume: 'fight' },
      g1: { char: 'gojo1', at: APEX, face: 'east', pose: 'hitFly', costume: 'fight' },
      maho: { char: 'mahoraga', at: M, face: 'west', pose: 'maho_idle' },
      agito: { char: 'agito', at: AG, face: 'west', pose: 'ag_idle' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'armsCrossed', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, who: 'g1', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      // ---- 0–3.4: in the shadow of a stump, Sukuna: displeased — the Divine General is his shadow now
      { t: 0, shot: 'closeup', who: 'sukuna', yaw: -1.35, dist: 6, f: 820, bust: { expr: 'contempt', eyes: 'narrow', eyes2: 'open', light: [0.6, -0.3, 0.4] }, size: 210, bg: 'grad', cols: [[0, C.ink], [0.7, C.shadow], [1, C.dusk]] },
      { t: 1.8, shot: 'closeup', who: 'sukuna', yaw: -1.35, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'narrow', eyes2: 'open', light: [0.6, -0.3, 0.4] }, size: 210, bg: 'grad', cols: [[0, C.ink], [0.7, C.shadow], [1, C.dusk]] },
      { t: 0.3, sfx: 'heartbeat', vol: 0.25 },
      // ---- 3.4–6.0: the wheel. Silence — then one notch (the one Act VI will remember)
      { t: 3.4, shot: 'static', cam: { x: M[0] - 2.6, y: M[1] - 1.3, z: 2.3, yaw: 1.1, pitch: 0.5, f: 460 } },
      { t: 3.4, who: 'maho', do: 'expr', wheel: false },
      { t: 3.4, fx: 'wheel', who: 'maho', from: 4, notch: 5, turnAt: [4.55], r: 0.72, lift: 0.4, dur: 2.6 },
      { t: 4.55, sfx: 'subDrop', vol: 0.6 },
      { t: 4.55, shake: 0.3 },
      { t: 6.0, who: 'maho', do: 'expr', wheelAngle: 225, wheelGlow: 0.55 },
      // ---- 6.0–7.35: wide from the north-east: Agito charges; Gojo leaps over it — Mahoraga, 25 m away, swings
      { t: 6.0, shot: 'static', cam: { x: 32.4, y: 88.6, z: 3.0, yaw: -1.66, f: 360, shift: 14 } },
      { t: 6.0, who: 'agito', do: 'agitoPounce', space: false, rootScale: 1.6 },
      { t: 6.35, who: 'gojo', do: 'fly', to: APEX, dur: 0.6, pose: 'jumpUp', ease: 'outCubic' },
      { t: 6.35, sfx: 'whooshL', vol: 0.6 },
      { t: 6.35, fx: 'dust', at: G, n: 8, r: 1.4, size: 0.4, col: 'concrete', dur: 1.2 },
      { t: CUT_T - 23 / 30, who: 'maho', do: 'mahoSlash', space: false, rootScale: 0.5 },
      { t: CUT_T - 0.22, fx: 'a4flySlash', from: SW, to: GASHC, travel: 0.22, w: 2.2 },
      { t: CUT_T, post: 'impact', dur: 2 / 30, mode: '2tone', th: 105 },
      { t: CUT_T, sfx: 'dismantle', vol: 1 }, { t: CUT_T, sfx: 'hitHuge', vol: 0.8 },
      { t: CUT_T, kana: 'ザン', x: 330, y: 150, size: 4, dur: 0.5, style: 'slash' },
      { t: CUT_T, shake: 0.9 },
      // ---- 7.35–9.0: cut-away — the glass tower behind him, gashed across its face ≈ 40 m up; glass bursts out, a groan
      { t: AWAY, shot: 'static', cam: { x: -12, y: 69, z: 33, yaw: -1.36, pitch: 0.14, f: 500 } },
      ...holes,
      { t: AWAY, fx: 'glass', at: [GASHC[0] + 0.5, GS.y0 + 3, GS.z0 + 0.6], n: 30, speed: 5, dir: [1, 0, -0.2] },
      { t: AWAY + 0.05, fx: 'glass', at: [GASHC[0] + 0.5, GASHC[1], GASHC[2]], n: 34, speed: 6, dir: [1, 0, -0.1] },
      { t: AWAY + 0.1, fx: 'glass', at: [GASHC[0] + 0.5, GS.y1 - 3, GS.z1 - 0.3], n: 30, speed: 5, dir: [1, 0, -0.2] },
      { t: AWAY, fx: 'dust', at: [GASHC[0] + 1.5, GASHC[1], GASHC[2] - 1.5], n: 8, r: 6, size: 0.9, col: 'concrete', dir: [1, 0, -0.3], dur: 2.2 },
      { t: AWAY, sfx: 'glassShatter', vol: 0.9 }, { t: AWAY + 0.2, sfx: 'steelGroan', vol: 0.8, dur: 2.4 },
      // the arm is gone: from here on the one-armed build ('gojo1'), always with that side away from the camera
      { t: AWAY, who: 'gojo', do: 'hide' }, { t: AWAY, who: 'g1', do: 'show' },
      { t: AWAY, who: 'g1', do: 'place', at: APEX, face: 'east', pose: 'hitFly' },
      { t: AWAY, who: 'g1', do: 'launch', vel: [-2.8, 0, 1.0], g: 9.8, dur: 1.7, spin: 5, pose: 'tumble' },
      { t: AWAY, who: 'g1', do: 'expr', face: 'grit', eyes: 'closed' },
      // ---- 9.0–11.2: from the north: he falls out of the sky through the dust and lands hard on the avenue
      { t: 8.45, shot: 'static', cam: { x: -0.6, y: 101.5, z: 2.6, yaw: Math.PI + 0.04, pitch: 0.24, f: 330 } },
      { t: AWAY + 1.7, who: 'g1', do: 'land' },
      { t: AWAY + 1.7, fx: 'dust', at: [APEX[0] - 4.7, APEX[1], 0.1], n: 10, r: 1.8, size: 0.55, col: 'concrete', dur: 1.8 },
      { t: AWAY + 1.7, fx: 'shockwave', at: [APEX[0] - 4.7, APEX[1], 0], r: 5, strength: 1, dur: 0.7, sfx: false },
      { t: AWAY + 1.7, sfx: 'bodyFall', vol: 0.8 }, { t: AWAY + 1.7, sfx: 'groundSlam', vol: 0.5 },
      { t: AWAY + 1.7, shake: 0.35 },
      { t: 9.6, who: 'agito', do: 'place', at: [9.5, 84, 0], face: 'west', pose: 'ag_idle' },
      // ---- 11.2–13.2: close, from his left: crouched, breathing hard; the green of RCT flickers at his far shoulder
      { t: 11.2, who: 'g1', do: 'place', at: [APEX[0] - 4.7, APEX[1], 0], face: 'east', pose: 'a4GripArm' },
      { t: 11.2, shot: 'medium', on: ['g1'], size: 190, yaw: Math.PI - 0.5, lead: -40, height: 1.1, feetY: 348, f: 520 },
      { t: 11.25, fx: 'rctGlow', at: [APEX[0] - 4.7, APEX[1] - 0.2, 1.1], r: 0.3, dur: 2.0, steam: true },
      { t: 11.2, who: 'g1', do: 'expr', face: 'grit', eyes: 'narrow' },
      { t: 11.25, fx: 'smoke', at: 'g1.head', rate: 1.8, life: 1.0, rise: 0.25, size: 0.06, grow: 3, dark: false, wind: 0.3, dur: 2, sfx: false },
      // ---- 13.2–15.2: Sukuna, content
      { t: 13.2, shot: 'closeup', who: 'sukuna', yaw: -1.2, dist: 6, f: 820, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open' }, size: 210, bg: 'haze', haze: C.shadow, dim: 0.45 },
      // ---- 15.2–18: wide from the north: the giants close in, Sukuna comes out of the shadows — Gojo breaks for the tower
      { t: 15.2, shot: 'static', cam: { x: -1.5, y: 70.5, z: 2.2, yaw: 0.06, f: 300, shift: 24 } },
      { t: 15.2, who: 'maho', do: 'place', at: [14.5, 88.0, 0], face: 'west', pose: 'maho_idle' },
      { t: 15.2, who: 'sukuna', do: 'place', at: [8.0, 92.5, 0], face: 'west', pose: 'guard' },
      { t: 15.3, who: 'maho', do: 'mahoStep', rootScale: 0.6 },
      { t: 15.4, who: 'agito', do: 'agitoStep', rootScale: 0.6 },
      { t: 15.4, sfx: 'mahoStep', vol: 0.5 },
      { t: 16.2, who: 'g1', do: 'face', face: 'west' },
      { t: 16.3, who: 'g1', do: 'fly', to: [-14.5, 83.6, 3.2], dur: 0.9, pose: 'a4HoverGuard', ease: 'inQuad' },
      { t: 16.3, sfx: 'dashAir', vol: 0.7 },
      { t: 16.3, who: 'g1', do: 'trail', dur: 0.9, n: 3, tint: C.ice },
    ],
  });
})();
