/* ACT II · 4 — a2_watchers (14 s). The watchers inside Rika (set `command`): a tower of CRTs carrying Mei Mei's crow
   feed — the shattered dome over the shredded junction; the watchers on crates round it, lit only by the screens. One
   of them (Yuji) jumps up from his crate (canon ch. 226). No faces, no voices. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  HT.fightScene({
    id: 'a2_watchers', act: 'II', title: 'The Watchers', dur: 14, transitionIn: { type: 'cut', dur: 0 },
    set: 'command', env: { time: 'night' },
    setOpts: {
      // the crow feed: the junction right after the shell broke (a static crow's-eye camera on the shredded district)
      feed: { cam: { x: 8, y: -40, z: 22, yaw: 0.45, pitch: -0.34, f: 260 }, env: { time: 'shrine', snow: 0.28 }, T: 210 + 16 + 24 + 22 },
      watchers: A.watchers({ yuji: { from: 'sit', pose: 'jump', t0: 7.4, then: 'stand' } }),
    },
    cast: {},
    ambience: [{ name: 'command', vol: 0.6 }],
    script: [
      // 1. the tower of screens, the dark all round it; the watchers' backs in silhouette (slow push)
      { t: 0, shot: 'static', cam: { x: 0.3, y: -7.4, z: 1.7, yaw: 0.02, f: 330, shift: 14 }, to: { y: -6.6 }, dur: 7, ease: 'linear' },
      { t: 0.5, sfx: 'signalTick', vol: 0.12 },
      // 2. low beside the ring: Yuji jumps up off his crate
      { t: 7.0, shot: 'static', cam: { x: -3.6, y: -5.6, z: 1.1, yaw: 0.52, f: 380, shift: 30 } },
      { t: 7.4, sfx: 'clothSnap', vol: 0.3, pan: -0.1 },
      { t: 7.75, sfx: 'footConcrete', vol: 0.25, pan: -0.1 },
      // 3. the screens again, closer: the feed holds on the broken dome
      { t: 10.4, shot: 'static', cam: { x: 0.2, y: -3.0, z: 1.55, yaw: 0, f: 560, shift: 0 }, to: { y: -2.7 }, dur: 3.6, ease: 'linear' },
    ],
  });
  void C;
})();
