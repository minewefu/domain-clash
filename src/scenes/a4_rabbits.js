/* ACT IV · 4 — a4_rabbits (20 s). Canon ch. 233: before the Red is released, Sukuna — hidden in Gojo's own shadow —
   looses Rabbit Escape: hundreds of small white rabbits pour out of the shadow and heap round Gojo to blind him. Amused
   (Sukuna is still reeling from the Black Flash), Gojo points two fingers down and blasts his own shadow with Red, through
   the street (a crater with a black mouth stays in the road); the rabbits scatter and dissolve. A dark shape streaks out
   of the burst shadow into the stump of the building across the avenue; Gojo goes in after it; Mahoraga smashes through
   the wall behind them (→ the corridor, the building's ground floor). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = [A.START_G[0] - 0.15, A.START_G[1], 0];             // where a4_palms left Gojo (facing west, chanting)
  const SHD = [G[0] + 0.55, G[1] - 0.35, 0];                     // his shadow on the asphalt (Sukuna is in it)
  const HOLE = [G[0] + 0.3, G[1] - 0.2, 0];                      // the Red's crater: a hole through the street
  const M = [A.START_G[0] - 6.3, A.START_G[1] + 0.35, 0];        // Mahoraga, standing again down the avenue
  const HB = HT.city.role('holeBuilding');                      // the stump of the SW corner building (Act I's hole building)
  const DOOR = [G[0] + 0.2, HB.y1, 0];                          // where Sukuna (then Gojo, then Mahoraga) goes in: its north face
  const BLAST = 7.8, ENV = A.ENV;
  const RAB = { from: SHD, to: [G[0], G[1] - 0.05, 0], n: 170, emit: 1.3, speed: 5.2, size: 0.3, cloud: 1.7, spread: 2.2, pile: 1.45, seed: 23 };
  const scatter = (i, dx, dy) => ({ t: BLAST, fx: 'rabbitSwarm', from: [G[0], G[1], 0.4], to: [G[0] + dx, G[1] + dy, 0], n: 26, emit: 0.18, speed: 13, size: 0.3, cloud: 2.2, spread: 3.5, life: 0.55, dur: 1.4, seed: 60 + i, shadows: false, sfx: false });
  HT.fightScene({
    id: 'a4_rabbits', act: 'IV', title: 'Rabbit Escape', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo', at: G, face: 'west', pose: 'a4Chant', costume: 'fight' },
      maho: { char: 'mahoraga', at: M, face: 'east', pose: 'maho_look' },
      sukuna: { char: 'sukuna', at: SHD, face: 'east', pose: 'dash', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      { t: 0, fx: 'glyphRings', at: 'gojo.chest', r: 1.25, rings: 3, stagger: 0.01, col: C.wine, dur: 2.1, sfx: false },
      { t: 0, fx: 'redOrb', at: 'gojo.hand', r: 0.04, charge: 2.2, dur: 1.9, sfx: false },
      { t: 0, sfx: 'infinityHum', vol: 0.4, dur: 1.8 },
      { t: 0, fx: 'shadowPool', at: SHD, r: 0.9, grow: 0.01, out: 0.2, tendrils: 5, wisps: false, dur: 7.9, sfx: false },
      // ---- 0–1.8: medium low from the south-west: still chanting, the rings turning; his shadow too dark at his feet
      { t: 0, shot: 'static', cam: { x: G[0] - 2.4, y: G[1] - 5.2, z: 0.9, yaw: 0.46, f: 380, shift: 56 } },
      // ---- 1.8: the shadow boils over — rabbits, hundreds, heaping round him to blind him
      { t: 1.8, fx: 'rabbitSwarm', ...RAB, split: 'front', dur: BLAST + 0.05 - 1.8 },
      { t: 1.8, fx: 'rabbitSwarmBack', ...RAB, layer: 'behind', dur: BLAST + 0.05 - 1.8 },
      { t: 1.85, kana: 'ワラワラ', x: 470, y: 90, size: 3, dur: 1.6, style: 'rumble' },
      { t: 1.9, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'wide' },
      { t: 2.0, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.4 },
      // ---- 2.8–4.6: wider: a white sea of rabbits churning round him, piling to his chest
      { t: 2.8, shot: 'static', cam: { x: G[0] + 3.2, y: G[1] - 6.5, z: 2.4, yaw: -0.46, pitch: -0.18, f: 400 } },
      // ---- 4.6–6.0: at rabbit height: they hop past the lens
      { t: 4.6, shot: 'static', cam: { x: G[0] - 0.4, y: G[1] - 2.9, z: 0.35, yaw: 0.12, pitch: 0.18, f: 300 } },
      { t: 4.6, fx: 'rabbitSwarm', from: [G[0] - 1.4, G[1] - 1.2, 0], to: [G[0] + 1.6, G[1] - 1.9, 0], n: 18, emit: 1.2, speed: 3.5, size: 0.3, cloud: 0.8, spread: 0.8, dur: 1.5, seed: 31, sfx: false },
      // ---- 6.0–7.4: his face above them: amused (Sukuna is still reeling from the Black Flash)
      { t: 6.0, shot: 'closeup', who: 'gojo', yaw: 1.2, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'glow' }, size: 210, bg: 'haze', haze: C.mist, dim: 0.35 },
      // ---- 7.4: two fingers straight down — Red, point-blank, into his own shadow and through the street
      { t: 7.2, shot: 'static', cam: { x: G[0] - 3.6, y: G[1] - 4.4, z: 1.6, yaw: 0.66, pitch: -0.12, f: 360 } },
      { t: 7.25, who: 'gojo', do: 'float', to: [G[0], G[1], 0.9], dur: 0.3, pose: 'a4PointDown', bob: 0 },
      { t: 7.25, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 7.4, fx: 'redOrb', at: [SHD[0] - 0.15, SHD[1], 0.25], dir: [0, 0, -1], r: 0.34, charge: 0.4, range: 6, dur: 1.2, sfx: false },
      { t: BLAST, sfx: 'redCharge', vol: 0.7, dur: 0.55 }, { t: BLAST, sfx: 'redBlast', vol: 0.95 },   // audio (M4): the charge lands on the blast (the orb's default built 6.4–7.4)
      { t: BLAST, post: 'impact', dur: 2 / 30, mode: 'red', th: 120 },
      { t: BLAST, damage: { kind: 'crater', x: HOLE[0], y: HOLE[1], r: 3.4 } },
      { t: BLAST, fx: 'a4pit', at: HOLE, r: 1.7, open: 0.2, dur: 12.2 },
      { t: BLAST, fx: 'shockwave', at: HOLE, r: 11, strength: 3, dur: 1.0, sfx: false },
      { t: BLAST, fx: 'debris', at: [HOLE[0], HOLE[1], 0.2], n: 26, speed: 11, size: 0.4, up: 1.3, mat: 'asphalt', dur: 2.2 },
      { t: BLAST + 0.05, fx: 'dust', at: [HOLE[0], HOLE[1], 0.5], n: 18, r: 3.6, size: 1.0, rise: 1.8, col: 'concrete', dur: 3.2 },
      { t: BLAST, kana: 'ドォン', x: 452, y: 112, size: 4, dur: 1.0, style: 'impact' },
      { t: BLAST, sfx: 'boom', vol: 0.8 }, { t: BLAST, sfx: 'groundSlam', vol: 0.8 }, { t: BLAST + 0.1, sfx: 'rubble', vol: 0.6, dur: 2 },
      { t: BLAST, shake: 0.85 },
      scatter(0, 7, 2), scatter(1, -6, 3), scatter(2, 3, -7), scatter(3, -5, -5), scatter(4, 1, 7), scatter(5, 7, -3),
      // a dark shape shoots out of the burst shadow, across the avenue and into the stump of the building to the south
      { t: BLAST + 0.05, who: 'sukuna', do: 'show' },
      { t: BLAST + 0.05, who: 'sukuna', do: 'place', at: [HOLE[0] + 0.4, HOLE[1] - 0.6, 0.4], face: 'south', pose: 'dash' },
      { t: BLAST + 0.05, who: 'sukuna', do: 'fly', to: [DOOR[0], DOOR[1] + 0.6, 1.0], dur: 0.38, pose: 'dashFloat', ease: 'inQuad' },
      { t: BLAST + 0.05, who: 'sukuna', do: 'trail', dur: 0.4, n: 4, tint: C.ink, alpha: 0.6 },
      { t: BLAST + 0.43, who: 'sukuna', do: 'hide' },
      { t: BLAST + 0.43, damage: { kind: 'hole', b: HB.id, face: 'n', u: DOOR[0] - HB.x0, v: 1.5, r: 1.5 } },
      { t: BLAST + 0.43, fx: 'debris', at: [DOOR[0], DOOR[1] + 0.3, 1.2], n: 12, speed: 5, size: 0.3, dir: [0, 1, 0.3], mat: 'brick', dur: 1.3 },
      { t: BLAST + 0.43, sfx: 'wallCrash', vol: 0.55 },
      // ---- 9–13.4: wide: dust settles on a crater with a black hole in it; the last rabbits dissolve; Gojo hovers over it,
      //      looking toward the new hole in the building's face
      { t: 9.0, shot: 'static', cam: { x: G[0] + 4.6, y: G[1] - 9.8, z: 3.4, yaw: -0.44, pitch: -0.22, f: 360 } },
      { t: 9.0, who: 'gojo', do: 'float', to: [G[0] + 0.2, G[1] - 0.1, 1.4], dur: 1.2, pose: 'float', ease: 'inOutSine' },
      { t: 9.2, fx: 'smoke', at: [HOLE[0], HOLE[1], 0.1], r: 0.8, rate: 1.4, life: 2.2, rise: 0.9, size: 0.26, grow: 1.8, col: 'ash', wind: 0.5, dur: 10.8, sfx: false },
      { t: 9.4, fx: 'smoke', at: [DOOR[0], DOOR[1] + 0.4, 1.4], r: 0.5, rate: 1.2, life: 2, rise: 0.6, size: 0.22, grow: 1.8, col: 'ash', wind: 0.5, dur: 10.6, sfx: false },
      { t: 10.4, who: 'maho', do: 'mahoStep' },
      { t: 11.2, who: 'gojo', do: 'face', face: 'south' },
      // ---- 13.4–16.2: from the bottom of the crater: against the heavy sky he looks off after Sukuna — and grins
      { t: 13.4, shot: 'static', cam: { x: HOLE[0] + 1.4, y: HOLE[1] - 1.8, z: 0.25, yaw: -0.62, pitch: 0.95, f: 300 } },
      { t: 13.5, who: 'gojo', do: 'pose', pose: 'lookDown', dur: 0.4 },
      { t: 14.6, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      // ---- 16.2–20: past the smoking crater, the building's face: he goes in after Sukuna; the giant follows through the wall
      { t: 16.2, shot: 'static', cam: { x: G[0] + 9.5, y: G[1] + 8.5, z: 3.4, yaw: -2.72, pitch: -0.1, f: 330 } },
      { t: 16.5, who: 'gojo', do: 'fly', to: [DOOR[0], DOOR[1] + 0.5, 1.2], dur: 0.45, pose: 'dash', ease: 'inQuad' },
      { t: 16.5, sfx: 'whooshM', vol: 0.6 },
      { t: 16.95, who: 'gojo', do: 'hide' },
      { t: 16.95, fx: 'dust', at: [DOOR[0], DOOR[1] + 0.4, 1.2], n: 8, r: 1.4, size: 0.5, col: 'ash', dur: 1.6 },
      { t: 17.0, who: 'maho', do: 'place', at: [DOOR[0] - 4.5, DOOR[1] + 5.5, 0], face: [0.6, -0.8], pose: 'maho_idle' },
      { t: 17.1, who: 'maho', do: 'walk', to: [DOOR[0] - 0.8, DOOR[1] + 1.0], speed: 2.0 },
      { t: 17.2, sfx: 'mahoStep', vol: 0.6 }, { t: 18.1, sfx: 'mahoStep', vol: 0.6 },
      { t: 19.4, who: 'maho', do: 'hide' },
      { t: 19.4, damage: { kind: 'hole', b: HB.id, face: 'n', u: DOOR[0] - 0.8 - HB.x0, v: 2.2, r: 2.4 } },
      { t: 19.4, fx: 'debris', at: [DOOR[0] - 0.8, DOOR[1] + 0.3, 1.8], n: 18, speed: 6, size: 0.4, dir: [0, 1, 0.3], mat: 'brick', dur: 1.2 },
      { t: 19.4, fx: 'dust', at: [DOOR[0] - 0.8, DOOR[1] + 0.5, 1.5], n: 12, r: 2.2, size: 0.8, col: 'concrete', dur: 1.2 },
      { t: 19.4, sfx: 'wallCrash', vol: 0.8 }, { t: 19.4, shake: 0.4 },
    ],
  });
})();
