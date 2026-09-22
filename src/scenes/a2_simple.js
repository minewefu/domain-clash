/* ACT II · 6 — a2_simple (22 s). Canon ch. 226: Simple Domain #1 — a pale ring opens on the ground around Gojo and the
   Shrine's slashes break on its edge; Sukuna steps into it and the ring wears away where he stands. A monitor insert:
   a watcher leans forward. Simple Domain #2 (no healing for the body now — hair lifting, eyes straining) is chewed
   away faster. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const SH = A.SHRINE, P = [A.G0[0] - 16, A.G0[1] - 4, 0];
  const SK = [P[0] + 4.2, P[1] + 0.4, 0];
  HT.fightScene({
    id: 'a2_simple', act: 'II', title: 'Simple Domain', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    setOpts: { command: {
      feed: A.crowFeed(P, { dist: 20, z: 10, f: 320, feed: { figures: [{ char: 'gojo', at: P, pose: 'guard', face: 1 }, { char: 'sukuna', at: SK, pose: 'loose', face: -1 }] } }),
      watchers: A.watchers({ hakari: { from: 'crossed', pose: 'lean', t0: 9.5 } }),
    } },
    cast: {
      gojo: { char: 'gojo', at: P, face: 'east', pose: 'kneel', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.45 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 8, sky: 0, dur: 9, sfx: false, sets: ['city'] },
      { t: 11, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 10, sky: 0, dur: 11, sfx: false, sets: ['city'] },
      // 1. Gojo rises inside a pale ring: Simple Domain #1 (high three-quarter view so the ring reads)
      { t: 0, shot: 'static', cam: { x: P[0] + 2, y: P[1] - 9.5, z: 5.2, yaw: 0.05, pitch: -0.36, f: 360 } },
      { t: 0.3, who: 'gojo', do: 'pose', pose: 'rise', dur: 0.5 },
      { t: 1.0, who: 'gojo', do: 'pose', pose: 'guardLow', dur: 0.4 },
      { t: 0.8, fx: 'simpleDomain', at: P, r: 2.4, erode: 1, erodeAt: 0.1, dur: 8, sfx: false },
      { t: 0.8, sfx: 'infinityHum', vol: 0.45, pitch: 0.7, dur: 8 }, { t: 4.0, sfx: 'erode', vol: 0.45, dur: 4.8 },
      { t: 1.6, fx: 'cleave', at: [P[0] + 2.3, P[1] + 0.8, 0.8], r: 0.6, n: 10, span: 0.25 },
      { t: 2.3, fx: 'cleave', at: [P[0] - 2.1, P[1] - 1.1, 1.0], r: 0.6, n: 10, span: 0.25 },
      { t: 3.0, fx: 'cleave', at: [P[0] + 0.8, P[1] + 2.3, 0.9], r: 0.6, n: 10, span: 0.25 },
      // 2. Sukuna walks into the ring; it wears away where he stands (medium, low)
      { t: 3.8, shot: 'medium', on: ['gojo', 'sukuna'], size: 118, yaw: 0.18 },
      { t: 4.0, who: 'sukuna', do: 'walk', to: [P[0] + 1.9, P[1] + 0.2], speed: 0.9 },
      { t: 4.2, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 5.2, fx: 'cleave', at: [P[0] + 2.4, P[1] + 0.3, 0.9], r: 0.5, n: 12, span: 0.3 },
      { t: 6.4, fx: 'cleave', at: [P[0] + 2.2, P[1] - 0.6, 1.1], r: 0.5, n: 12, span: 0.3 },
      { t: 7.4, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      // 3. the monitoring room: a watcher leans in (insert)
      { t: 9.0, env: { set: 'command', time: 'night' } },
      { t: 9.0, amb: 'command', vol: 0.5, fade: 0.15 }, { t: 9.0, amb: 'shrine', vol: 0, fade: 0.15 }, { t: 9.0, amb: 'wind', vol: 0, fade: 0.15 },
      { t: 11.0, amb: 'command', vol: 0, fade: 0.15 }, { t: 11.0, amb: 'shrine', vol: 0.45, fade: 0.15 }, { t: 11.0, amb: 'wind', vol: 0.3, fade: 0.15 },
      { t: 9.0, who: 'gojo', do: 'hide' }, { t: 9.0, who: 'sukuna', do: 'hide' },
      { t: 9.0, shot: 'static', cam: { x: -2.0, y: -5.6, z: 1.5, yaw: 0.08, f: 380, shift: 10 } },
      { t: 9.5, sfx: 'clothSnap', vol: 0.12, pan: 0 },
      // 4. Simple Domain #2: no healing for the body — the hair lifts, the eyes strain; the ring is chewed away faster
      { t: 11.0, env: { set: 'city', time: 'shrine' } },
      { t: 11.0, who: 'gojo', do: 'show' }, { t: 11.0, who: 'sukuna', do: 'show' },
      { t: 11.0, who: 'gojo', do: 'place', at: P, face: 'east', pose: 'guard' },
      { t: 11.0, who: 'sukuna', do: 'place', at: [P[0] + 2.6, P[1] + 0.2, 0], face: 'west', pose: 'loose' },
      { t: 11.0, shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.45, lead: 70 },
      { t: 11.0, who: 'gojo', do: 'expr', face: 'strain', eyes: 'glow', hairLift: 1 },
      { t: 11.2, fx: 'simpleDomain', at: P, r: 2.2, erode: 1, erodeAt: 0.1, speed: 1.4, dur: 5, sfx: false },
      { t: 11.2, sfx: 'infinityHum', vol: 0.5, pitch: 0.6, dur: 5 }, { t: 11.6, sfx: 'erode', vol: 0.55, dur: 4.6 },
      { t: 11.8, fx: 'cleave', at: [P[0] + 1.9, P[1] + 0.3, 1.0], r: 0.6, n: 14, span: 0.3 },
      { t: 12.6, fx: 'cleave', at: [P[0] + 1.6, P[1] - 0.8, 1.2], r: 0.6, n: 14, span: 0.3 },
      { t: 13.4, fx: 'cleave', at: [P[0] + 1.2, P[1] + 1.1, 0.8], r: 0.6, n: 14, span: 0.3 },
      { t: 14.2, fx: 'cleave', at: [P[0] + 0.9, P[1], 1.0], r: 0.7, n: 16, span: 0.3 },
      { t: 13.0, shot: 'static', cam: { x: P[0] + 1.4, y: P[1] - 7, z: 3.6, yaw: 0.02, pitch: -0.32, f: 400 } },
      { t: 15.0, kana: 'ギギギ', x: 320, y: 60, size: 2, dur: 1.8, style: 'rumble' },
      // 5. the last of the ring breaks; Sukuna's grin (close-up), Gojo's jaw set
      { t: 16.4, shot: 'closeup', who: 'sukuna', yaw: -Math.PI / 2 + 0.3, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open' }, size: 250, bg: 'haze', haze: C.maroon, dim: 0.4 },
      { t: 19.0, shot: 'medium', on: ['gojo', 'sukuna'], size: 118, yaw: 0.18 },
      { t: 19.0, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
    ],
  });
})();
