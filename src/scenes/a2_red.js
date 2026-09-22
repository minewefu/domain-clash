/* ACT II · 7 — a2_red (20 s). Canon ch. 226: Gojo lunges at Blue speed and clamps on — arms round Sukuna, legs round
   his waist — leans back and fires Red point-blank into his face. Sukuna is blasted backwards into the Shrine (smoke
   hides his face; the shrine's wall cracks). A monitor insert: Yuta stands. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const SH = A.SHRINE, P = [A.G0[0] - 16, A.G0[1] - 4, 0], SK = [P[0] + 2.6, P[1] + 0.2, 0];
  const WALL = [SH[0] - 6.5, SH[1] - 0.5, 0];              // the shrine's front, where Sukuna hits
  HT.fightScene({
    id: 'a2_red', act: 'II', title: 'Point-Blank Red', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    setOpts: { command: {
      feed: A.crowFeed(WALL, { dist: 26, z: 12, f: 300 }),
      watchers: A.watchers({ yuta: { poses: [[-1e9, 'sit'], [9.55, 'rise'], [9.85, 'stand']] } }),
    } },
    cast: {
      gojo: { char: 'gojo', at: P, face: 'east', pose: 'guard', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.45 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 8, sky: 0, dur: 9, sfx: false, sets: ['city'] },
      { t: 12, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 5, sky: 0, dur: 8, sfx: false, sets: ['city'] },
      // 1. the lunge: a blue streak, and he is on him (medium)
      { t: 0, shot: 'medium', on: ['gojo', 'sukuna'], size: 124, yaw: 0.22 },
      { t: 0.6, who: 'gojo', do: 'blue' },
      { t: 1.0, who: 'gojo', do: 'fly', to: [SK[0] - 0.35, SK[1], 0.55], dur: 0.16, pose: 'flyGrab', ease: 'outCubic' },
      { t: 1.0, who: 'gojo', do: 'trail', dur: 0.3, n: 4, tint: C.sky },
      { t: 1.0, sfx: 'dashAir', vol: 0.9 },
      { t: 1.16, who: 'sukuna', do: 'pose', pose: 'hitHigh', dur: 0.08 },
      { t: 1.16, sfx: 'hitM', vol: 0.8 },
      { t: 1.16, shake: 0.35 },
      { t: 1.2, kana: 'ガッ', x: 360, y: 100, size: 3, dur: 0.7, style: 'impact' },
      // 2. close and low: he leans back, two fingers to Sukuna's face — Red
      { t: 2.4, shot: 'low', on: ['gojo', 'sukuna'], size: 170, yaw: 0.28, height: 0.4, feetY: 330 },
      { t: 2.6, who: 'gojo', do: 'pose', pose: 'redA', dur: 0.3 },
      { t: 2.6, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 3.0, fx: 'redOrb', at: 'sukuna.head', dir: [1, 0, 0.1], r: 0.4, charge: 0.55, range: 12 },
      { t: 3.55, post: 'impact', dur: 3 / 30, mode: 'red' },
      { t: 3.55, kana: 'ドッ', x: 420, y: 70, size: 4, dur: 0.8, style: 'impact' },
      { t: 3.55, shake: 0.8 },
      // 3. Sukuna blasted backwards across the avenue into the Shrine
      { t: 3.6, who: 'sukuna', do: 'launch', vel: [30, 0.8, 3], dur: 1.35, spin: 5 },
      { t: 3.6, who: 'sukuna', do: 'trail', dur: 1.2, n: 4, tint: C.red },
      { t: 3.7, who: 'gojo', do: 'place', at: [SK[0] - 0.6, SK[1], 0], face: 'east', pose: 'landing' },
      { t: 4.2, shot: 'static', cam: { x: P[0] + 6, y: P[1] - 30, z: 7, yaw: 0.72, pitch: 0.05, f: 320 } },
      { t: 4.95, who: 'sukuna', do: 'hide' },
      { t: 4.95, fx: 'dust', at: [WALL[0], WALL[1], 4], n: 26, r: 7, size: 3, rise: 1.4, dur: 6 },
      { t: 4.95, fx: 'debris', at: [WALL[0], WALL[1], 4], n: 30, speed: 10, size: 0.9, mat: 'bone', dir: [-1, 0, 0.4], spread: 0.8 },
      { t: 4.95, fx: 'shockwave', at: WALL, r: 12, strength: 2 },
      { t: 4.95, sfx: 'wallCrash', vol: 1 },
      { t: 4.95, kana: 'ドゴォ', x: 470, y: 120, size: 3, dur: 1.0, style: 'impact' },
      { t: 4.95, shake: 0.6 },
      // 4. the monitoring room: Yuta is on his feet
      { t: 9.0, env: { set: 'command', time: 'night' } },
      { t: 9.0, amb: 'command', vol: 0.5, fade: 0.15 }, { t: 9.0, amb: 'shrine', vol: 0, fade: 0.15 }, { t: 9.0, amb: 'wind', vol: 0, fade: 0.15 },
      { t: 12.0, amb: 'command', vol: 0, fade: 0.15 }, { t: 12.0, amb: 'shrine', vol: 0.45, fade: 0.15 }, { t: 12.0, amb: 'wind', vol: 0.3, fade: 0.15 },
      { t: 9.0, who: 'gojo', do: 'hide' },
      { t: 9.0, shot: 'static', cam: { x: 2.4, y: -6.2, z: 1.2, yaw: -0.5, f: 420, shift: 10 } },
      { t: 9.55, sfx: 'clothSnap', vol: 0.15, pan: 0.05 }, { t: 9.9, sfx: 'footConcrete', vol: 0.15, pan: 0.05 },
      // 5. back outside: smoke pours from the shrine's cracked front; Gojo lands, watches it (hold)
      { t: 12.0, env: { set: 'city', time: 'shrine' } },
      { t: 12.0, who: 'gojo', do: 'show' },
      { t: 12.0, who: 'gojo', do: 'place', at: [SK[0] - 0.6, SK[1], 0], face: 'east', pose: 'loose' },
      { t: 12.0, shot: 'static', cam: { x: SK[0] - 5, y: SK[1] - 5, z: 1.5, yaw: 1.2, f: 320, shift: 40 }, to: { x: SK[0] - 4.4, y: SK[1] - 4.6 }, dur: 8, ease: 'linear' },
      { t: 12.0, fx: 'smoke', at: [WALL[0], WALL[1], 3], rate: 5, life: 5, rise: 1.8, size: 1.4, grow: 2, col: 'ash', wind: 0.6, dur: 8 },
      { t: 15.0, who: 'gojo', do: 'pose', pose: 'shrug', dur: 0.5 },
      { t: 15.0, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
    ],
  });
})();
