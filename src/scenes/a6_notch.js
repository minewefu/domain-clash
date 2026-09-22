/* ACT VI · 1 — a6_notch (12 s). Act card. Black. Out of the dark the golden eight-handled wheel fades in — three notches
   already turned — and holds; then the last notch turns, one clunk in the silence, a glint: the adaptation to the
   Infinity, remembered (Sukuna learned the World-Cutting Slash from how Mahoraga cut through it). For an instant a
   hairline crosses the whole frame along the diagonal the cut will take. Dark again (canon ch. 236). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  HT.fightScene({
    id: 'a6_notch', act: 'VI', title: 'The Last Notch', dur: 12, transitionIn: { type: 'cut', dur: 0 },
    set: 'black', env: { time: 'night' },
    cast: {},
    ambience: [],
    script: [
      { t: 0, card: 'act', text: 'ACT VI', sub: 'THE WORLD-CUTTING SLASH', bg: 'black', dur: 2.8 },
      { t: 0, shot: 'static', cam: { x: 0, y: -10, z: 1.5, yaw: 0, f: 480 } },
      // the wheel out of the dark (three notches turned), the last notch at 7.4, the glint; then back into the dark
      { t: 3.2, fx: 'notchWheel', x: 320, y: 176, r: 64, from: 135, turnAt: 4.2, glow: 0.1, in: 1.8, out: 1.6, dur: 8.6 },
      { t: 7.4, sfx: 'wheelClunk', vol: 0.9 },
      { t: 8.6, fx: 'hairline', x: 320, y: 180, angle: -0.38, a: 0.55, dur: 0.45 },
      { t: 8.6, sfx: 'shing', vol: 0.12, pitch: 0.6 },
    ],
  });
})();
