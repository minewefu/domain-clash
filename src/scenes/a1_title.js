/* ACT I · 4 — a1_title (10 s). Wide on the empty junction at dawn, snow falling; the title DOMAIN CLASH strikes in,
   holds, dissolves; near-silence after the hit. */
(function () {
  'use strict';
  const HT = window.HT;
  HT.fightScene({
    id: 'a1_title', act: 'I', title: 'Title', dur: 10, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.42, snowFall: 0.45, wind: 0.35 },
    cast: {},
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'snow', vol: 0.35 }],
    script: [
      { t: 0, shot: 'static', cam: { x: -4, y: -46, z: 2.2, yaw: 0.02, f: 330, shift: 26 }, to: { y: -40, z: 2.4 }, dur: 10, ease: 'linear', twos: true },
      { t: 1.0, card: 'title', dur: 8.2 },
      { t: 1.0, sfx: 'titleHit', vol: 0.9 },
    ],
  });
})();
