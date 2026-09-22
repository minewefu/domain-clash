/* ACT V · 7 — a5_command (16 s). The watchers' room inside Rika (the command set): on the CRT tower, Mei Mei's crow
   feed shows the erased district at sunset — a scoured bowl where West Shinjuku was. Silence; nobody moves. Then
   Kusakabe rises and raises his fist; Yuji jumps up, Hakari cheers, Maki punches the air; Kashimo, arms crossed, does
   not move (he wanted this fight). Yuta, standing among them, slowly bows his head. A silent celebration (canon
   ch. 236 — the watchers believe Gojo has won). No faces, no voices: silhouettes lit by the screens.
   (The feed renders the city at the scene's own film time, so the ledger's erasure is on the screens.)
   The watchers stand in an arc 2.5–3.9 m south of the tower, with a gap in the middle so the screens stay visible from
   behind them. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5, PI = Math.PI;
  const E = A.ERASE;
  // the crow's view straight down from high above (the city set's top-down map renderer, pitch < −1): the erasure as a
  // clean dark disc punched out of the roofs — the one image that still reads at 96×54 on a CRT (a street-level view of
  // the bowl at sunset turned into noise at that size).
  // The map renderer shows the erased blocks only as bare street grid, so the feed's draw hook paints the ledger's
  // erasure over it as what the crow sees: a warm evening wash, then a dark scoured disc with a pale scorched rim (the
  // feed's mean colour also picks the room's light family: warm).
  const FEED = {
    cam: { x: E.x + 20, y: E.y - 10, z: 900, yaw: 0, pitch: -1.4, f: 420 }, env: { time: 'sunset', snow: 0.1 }, dT: 0,
    draw(g, c) {
      const mpp = c.z / c.f, w = g.canvas.width, h = g.canvas.height;
      const x = w / 2 + (E.x - c.x) / mpp, y = h / 2 - (E.y - c.y) / mpp, r = E.r / mpp;
      HT.alpha(g, 0.3, () => HT.rect(g, 0, 0, w, h, C.orange));
      HT.circle(g, x, y, r + 1.5, C.salmon); HT.circle(g, x, y, r, C.shadow); HT.circle(g, x, y, r * 0.8, C.ink);
    },
  };
  const YUTA = [0.95, -3.75];
  const WATCH = [
    { who: 'hakari', x: -3.1, y: -2.6, poses: [[-1e9, 'crossed'], [5.35, 'cheer']], dur: 0.4 },
    { who: 'yuji', x: -2.0, y: -3.3, poses: [[-1e9, 'sitLean'], [5.0, 'jump']], then: 'cheer' },
    { who: 'maki', x: -1.05, y: -3.9, poses: [[-1e9, 'stand'], [5.8, 'raise']], dur: 0.5 },
    { who: 'yuta', x: YUTA[0], y: YUTA[1], poses: [[-1e9, 'stand'], [10.4, 'bow']], dur: 1.8 },
    { who: 'kusakabe', x: 2.0, y: -3.25, poses: [[-1e9, 'sitLean'], [4.2, 'raise']], dur: 0.9 },
    { who: 'kashimo', x: 3.2, y: -2.5, pose: 'crossed' },
  ];
  HT.fightScene({
    id: 'a5_command', act: 'V', title: 'The Watchers', dur: 16, transitionIn: { type: 'cut', dur: 0 },
    set: 'command', setOpts: { feed: FEED, watchers: WATCH, noise: 0.08, glowK: 2.4 }, env: { time: 'night' }, // (director, M5: a stronger screen glow so the silhouettes read against the floor)
    cast: {},
    ambience: [{ name: 'command', vol: 0.4 }],
    script: [
      // 1. the screens: the erased district at sunset on every monitor
      { t: 0, shot: 'static', cam: { x: 0.2, y: -3.0, z: 1.55, yaw: 0, f: 600 }, to: { y: -2.6 }, dur: 3.2, ease: 'inOutSine' },
      // 2. behind them, toward the glowing tower: stillness — then Kusakabe rises, fist up; the others jump and cheer
      { t: 3.2, shot: 'static', cam: { x: 0.1, y: -8.8, z: 1.5, yaw: 0, f: 460, shift: -4 } },
      { t: 4.2, sfx: 'clothFlutter', vol: 0.08, pan: 0.4, dur: 0.8 },
      { t: 5.62, sfx: 'dropSoft', vol: 0.1, pan: -0.35 },
      // 3. closer behind them, at eye height: between the raised fists Yuta bows his head, a silhouette against the screens
      //    (director, M5: the faceless watchers read as blank heads from the front — 3/4-back as in the Act II inserts)
      { t: 8.6, shot: 'static', cam: { x: 0.6, y: -6.9, z: 1.6, yaw: -0.09, f: 260 }, to: { f: 290 }, dur: 7.4, ease: 'inOutSine' },
    ],
  });
})();
