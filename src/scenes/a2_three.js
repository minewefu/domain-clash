/* ACT II · 10 — a2_three (28 s). Canon ch. 228: the ball-sized barrier holds while Sukuna narrows his range again
   (the cuts outside intensify). Mei Mei's count on the monitor: 2:58 · 2:59 · 3:00 — at three minutes the ball
   shatters and the Shrine collapses at the same moment; the sky loses its crimson. Sukuna leaps up onto the elevated
   expressway; Gojo punches up through the deck from below, comes up through the hole, dashes in on Blue and knocks
   him back along the deck. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const SH = A.SHRINE, P = [A.G0[0] - 16, A.G0[1] - 4, 0];
  const G = [P[0] + 1.4, P[1], 0], SK = [P[0] + 3.2, P[1] + 0.3, 0], D = [P[0] + 2.3, P[1] + 0.15, 0];
  const PAL3 = { body: C.ink, line: C.indigo, edge: C.blue, hi: C.sky, ring: C.ice };
  const VX = A.VIADUCT_X, DZ = 9.6, HOLE = [VX - 4, 1.5];      // the deck top is at z 9.6; Gojo comes up 4 m behind him
  HT.fightScene({
    id: 'a2_three', act: 'II', title: 'Three Minutes', dur: 28, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    setOpts: { command: {
      feed: A.crowFeed(D, { dist: 16, z: 7, f: 340, feed: { draw: (g, c, S2) => {
        const q = HT.cam.project(c, D[0], D[1], 1.2); if (!q) return;
        const r = Math.max(2, 1.9 * q.s); HT.circle(g, q.x, q.y, r, C.ink); HT.ring(g, q.x, q.y, r + 1, C.sky);
        for (let i = 0; i < 3; i++) { const k = Math.floor(S2.t * 8) * 7 + i, y0 = HT.hash(k, 1) * 54, y1 = HT.hash(k, 2) * 54; HT.line(g, 0, y0 | 0, 95, y1 | 0, i ? C.red : C.salmon); }
      } } }),
      clock: { from: '2:58', at: 5.7, tick: 1, to: '3:00' },
      watchers: A.watchers(),
    } },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'guardLow', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.5 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, who: 'gojo', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 120, h: 22, rise: 0.01, spread: 0.01, slashes: 22, sky: 0, dur: 5.6, sfx: false, sets: ['city'] },
      { t: 0, fx: 'barrier', center: D, r: 1.9, state: 'hold', pal: PAL3, dur: 5.6, sfx: false, sets: ['city'] },
      { t: 0, fx: 'domeRake', center: D, r: 1.9, rate: 30, dur: 5.6, sets: ['city'] },
      // 1. the ball holds in a storm of cuts (low, close)
      { t: 0, shot: 'static', cam: { x: D[0] - 5, y: D[1] - 7.5, z: 1.0, yaw: 0.58, f: 330, shift: 44 }, to: { x: D[0] - 4.4, y: D[1] - 6.8 }, dur: 5.6, ease: 'linear', twos: true },
      { t: 0.2, sfx: 'cleave', vol: 0.6, dur: 5 },
      { t: 1.4, fx: 'dismantle', from: [D[0] - 18, D[1] + 6, 6], to: [D[0] + 18, D[1] + 4, 1], cuts: 3, stagger: 0.05, sfx: false },
      { t: 2.8, fx: 'dismantle', from: [D[0] - 16, D[1] - 5, 8], to: [D[0] + 16, D[1] - 3, 2], cuts: 2, stagger: 0.05, sfx: false },
      // 2. the count on the monitor: 2:58 · 2:59 · 3:00
      { t: 5.6, env: { set: 'command', time: 'night' } },
      { t: 5.6, amb: 'command', vol: 0.5, fade: 0.15 }, { t: 5.6, amb: 'shrine', vol: 0, fade: 0.15 }, { t: 5.6, amb: 'wind', vol: 0, fade: 0.15 },
      { t: 8.5, amb: 'command', vol: 0, fade: 0.15 }, { t: 8.5, amb: 'wind', vol: 0.3, fade: 0.15 }, { t: 8.5, amb: 'rubble', vol: 0.3, fade: 0.15 },
      { t: 5.6, shot: 'static', cam: { x: 0.9, y: -3.1, z: 1.45, yaw: -0.28, f: 420, shift: 0 } },
      { t: 5.7, sfx: 'signalTick', vol: 0.4 }, { t: 6.7, sfx: 'signalTick', vol: 0.4 }, { t: 7.7, sfx: 'signalTick', vol: 0.5 },
      // 3. at three minutes: the ball shatters and the Shrine collapses at the same moment; the crimson drains away
      { t: 8.5, env: { set: 'city', time: 'noon' } },
      { t: 8.5, shot: 'static', cam: { x: -20, y: 1.5, z: 3.5, yaw: Math.PI / 2 + 0.02, pitch: 0.12, f: 300 } },
      { t: 8.5, fx: 'barrierShatter', center: D, r: 1.9, crack: 0.12, pal: PAL3, dur: 1.6, sets: ['city'] },
      { t: 8.5, fx: 'shrineCollapse', at: SH, back: 0, r: 120, h: 22, dur: 2.6, sets: ['city'] },
      { t: 8.5, who: 'gojo', do: 'show' }, { t: 8.5, who: 'sukuna', do: 'show' },
      { t: 8.5, sfx: 'boom', vol: 0.9 }, { t: 8.55, sfx: 'domainCollapse', vol: 1 },
      { t: 8.5, shake: 0.5 },
      // 4. Sukuna crouches and leaps straight up out of frame (low angle) — and drops onto the expressway deck
      { t: 11.4, shot: 'low', on: ['sukuna'], size: 130, yaw: 0.4, height: 0.3, feetY: 310 },
      { t: 11.5, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.15 },
      { t: 11.9, who: 'sukuna', do: 'fly', to: [SK[0], SK[1], 26], dur: 0.45, pose: 'jumpUp', ease: 'inQuad' },
      { t: 11.9, sfx: 'whooshL', vol: 0.8 },
      { t: 11.9, fx: 'dust', at: [SK[0], SK[1], 0.2], n: 10, r: 1.6, size: 0.7 },
      { t: 12.4, shot: 'static', cam: { x: VX - 8, y: -15, z: DZ + 2.6, yaw: 0.36, pitch: -0.1, f: 330 } },
      { t: 12.4, who: 'sukuna', do: 'place', at: [VX, 0, 24], face: 'east', pose: 'fall' },
      { t: 12.4, who: 'sukuna', do: 'fly', to: [VX, 0, DZ], dur: 0.55, pose: 'fall', ease: 'inQuad' },
      { t: 12.95, who: 'sukuna', do: 'pose', pose: 'landing', dur: 0.1 },
      { t: 12.95, sfx: 'groundSlam', vol: 0.6 },
      { t: 12.95, fx: 'dust', at: [VX, 0, DZ + 0.1], n: 8, r: 1.4, size: 0.6 },
      { t: 13.8, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.3 },
      { t: 11.6, who: 'gojo', do: 'run', to: [HOLE[0], HOLE[1] - 0.5], speed: 44 },
      // 5. on the deck: Sukuna turns — under his feet the deck bursts: Gojo punches up through it
      { t: 14.4, who: 'gojo', do: 'place', at: [HOLE[0], HOLE[1], 0], face: 'east', pose: 'uppercut' },
      { t: 14.4, who: 'gojo', do: 'hide' },
      { t: 16.0, damage: { kind: 'deckHole', x: HOLE[0], y: HOLE[1], r: 2.4 } },
      { t: 16.0, who: 'gojo', do: 'show' },
      { t: 16.0, who: 'gojo', do: 'fly', to: [HOLE[0], HOLE[1], DZ + 2.6], dur: 0.3, pose: 'uppercut', ease: 'outCubic' },
      { t: 16.0, fx: 'debris', at: [HOLE[0], HOLE[1], DZ], n: 30, speed: 9, size: 0.7, up: 1.4, mat: 'concrete' },
      { t: 16.0, fx: 'dust', at: [HOLE[0], HOLE[1], DZ + 0.3], n: 14, r: 2.4, size: 1.2 },
      { t: 16.0, sfx: 'wallCrash', vol: 1 },
      { t: 16.0, kana: 'バキッ', x: 250, y: 90, size: 3, dur: 0.9, style: 'impact' },
      { t: 16.0, shake: 0.6 },
      { t: 16.3, who: 'gojo', do: 'fly', to: [HOLE[0] + 0.8, HOLE[1] - 0.6, DZ], dur: 0.35, pose: 'landing', ease: 'inQuad' },
      // 6. he dashes in on Blue and knocks him back along the deck
      { t: 17.8, shot: 'medium', on: ['gojo', 'sukuna'], size: 116, yaw: 0.3 },
      { t: 17.8, who: 'gojo', do: 'face', toward: 'sukuna' },
      { t: 18.2, who: 'gojo', do: 'fly', to: [VX - 0.9, 0.1, DZ], dur: 0.2, pose: 'dash', ease: 'outCubic' },
      { t: 18.2, who: 'gojo', do: 'trail', dur: 0.35, n: 4, tint: C.sky },
      { t: 18.25, sfx: 'dashAir', vol: 0.8 },
      { t: 18.45, who: 'gojo', do: 'palm', target: 'sukuna', hit: 'hit', strength: 3, knock: 1.4, react: 'knockFly' },
      { t: 18.6, kana: 'ドン', x: 400, y: 110, size: 3, dur: 0.8, style: 'impact' },
      { t: 20.0, shot: 'static', cam: { x: VX + 5.5, y: -8.0, z: DZ + 1.45, yaw: 0, f: 300, shift: 18 }, to: { x: VX + 6.1 }, dur: 8, ease: 'linear', twos: true }, // on the deck at the south parapet
      { t: 20.0, who: 'sukuna', do: 'place', at: [VX + 12, 0.3, DZ], face: 'west', pose: 'landing' },
      { t: 20.0, who: 'gojo', do: 'place', at: [VX - 1, 0.1, DZ], face: 'east', pose: 'loose' },
      { t: 21.4, who: 'sukuna', do: 'pose', pose: 'rise', dur: 0.6 },
      { t: 22.4, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.4 },
      { t: 22.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
    ],
  });
})();
