/* ACT I · 2 — a1_tokyo (16 s). Voxel flyover of evacuated Tokyo at dawn toward Shinjuku: high over the south-east of
   the district, descending over snowy roofs and empty avenues toward the West Shinjuku towers. Place card. */
(function () {
  'use strict';
  const HT = window.HT;
  HT.fightScene({
    id: 'a1_tokyo', act: 'I', title: 'Tokyo, December 24', dur: 16, transitionIn: { type: 'dissolve', dur: 1.2 },
    set: 'voxel', env: { time: 'dawn', snow: 0.45, snowFall: 0.35, wind: 0.4 },
    cast: {},
    ambience: [{ name: 'sky', vol: 0.45 }, { name: 'wind', vol: 0.3 }],
    script: [
      // path keys: [t, x, y, z, yaw, pitch, f] — a long descending glide toward the north-west
      { t: 0, shot: 'path', shift: -40, keys: [
        [0, 380, -520, 300, -0.55, 0, 360],
        [6, 220, -330, 210, -0.62, 0, 370],
        [11, 60, -170, 130, -0.7, 0, 380],
        [16, -40, -60, 90, -0.8, 0, 390],
      ] },
      { t: 2.0, card: 'place', text: 'TOKYO · DECEMBER 24 · 06:12', dur: 5 },
      { t: 0.2, sfx: 'windGust', vol: 0.25, pan: -0.3, panTo: 0.3, dur: 4 },
    ],
  });
})();
