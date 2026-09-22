/* ACT VI · 4 — a6_white (10 s). White. Silence. Out of the top of the white, a dark scarf — the one Gojo wore when he
   walked in at dawn in Act I (the rig's 'scarf': ink / navy / indigo) — drifts down like a falling leaf, turning,
   and settles into the snow that has faintly appeared at the bottom of the white; a few flakes land on it. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  HT.fightScene({
    id: 'a6_white', act: 'VI', title: 'The Scarf', dur: 10, transitionIn: { type: 'cut', dur: 0 },
    set: 'white', env: { time: 'white', snowFall: 0 },
    cast: {},
    ambience: [{ name: 'snow', vol: 0.12 }],
    script: [
      { t: 0, shot: 'static', cam: { x: 0, y: -10, z: 1.5, yaw: 0, f: 480 } },
      { t: 1.6, fx: 'snowLine', y: 262, in: 3.0, dur: 8.4 },
      { t: 1.2, fx: 'scarfFall', x0: 250, y0: -60, yLand: 282, land: 6.2, sway: 80, len: 150, w: 9, dur: 8.8 },
      { t: 1.4, sfx: 'clothFlutter', vol: 0.12, pan: -0.2, panTo: 0.2, dur: 5 },
      { t: 7.4, sfx: 'dropSoft', vol: 0.18 },
      { t: 7.6, sfx: 'footSnow', vol: 0.08 },
    ],
  });
})();
