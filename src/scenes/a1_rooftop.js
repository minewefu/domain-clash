/* ACT I · 5 — a1_rooftop (16 s). Sukuna on the roof edge of his skyscraper (costume 'haori'), back to camera, haori
   and hair in the wind, the city far below; a slow push; he turns: the relaxed cruel grin; ECU: the second pair of
   eyes opens (red). Sukuna motif: taiko heartbeat, detuned bass, low dissonant strings. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city;
  const T = city.role('sukunaTower');
  const ex = (T.x0 + T.x1) / 2, ey = T.y0 + 1.1, ez = T.h;   // the south roof edge, facing the city (south)
  HT.fightScene({
    id: 'a1_rooftop', act: 'I', title: 'The King Waits', dur: 16, transitionIn: { type: 'dissolve', dur: 0.8 },
    set: 'city', env: { time: 'dawn', snow: 0.4, snowFall: 0.4, wind: 0.8, fogFar: 4200, fogMax: 0.8 },
    cast: { sukuna: { char: 'sukuna', at: [ex, ey, ez], face: 'south', pose: 'back', costume: 'haori' } },
    ambience: [{ name: 'sky', vol: 0.6 }, { name: 'wind', vol: 0.45 }],
    script: [
      // 1. behind him, high: the evacuated city spreads to the horizon (slow push-in)
      { t: 0, shot: 'static', cam: { x: ex + 1.5, y: ey + 9, z: ez + 3.2, yaw: Math.PI - 0.12, f: 330, shift: 18 }, to: { x: ex + 0.8, y: ey + 5.5, z: ez + 2.4, f: 360, shift: 30 }, dur: 6.5, ease: 'inOutSine' },
      { t: 0.1, who: 'sukuna', do: 'view', view: 'back' },
      // 2. the turn: a low front angle (the city behind him), he turns — the grin
      { t: 6.5, shot: 'static', cam: { x: ex + 4.2, y: ey - 3.2, z: ez + 2.1, yaw: -0.92, f: 440, shift: -40 } },
      { t: 6.5, who: 'sukuna', do: 'view', view: 'front' },
      { t: 6.5, who: 'sukuna', do: 'pose', pose: 'frontStand', dur: 0.01 },
      { t: 7.4, who: 'sukuna', do: 'pose', pose: 'frontGrin', dur: 0.5 },
      { t: 7.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow' },
      // 3. close-up bust: the grin widens
      { t: 9.4, shot: 'closeup', who: 'sukuna', yaw: 0.22, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'closed', costume: 'haori' }, size: 214 },
      // 4. ECU on the eyes: the second pair opens (red)
      { t: 12.0, shot: 'ecu', who: 'sukuna', yaw: 0.1 },
      { t: 13.0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 13.0, sfx: 'sixEyes', vol: 0.2, pitch: 0.6 },
      { t: 14.6, shot: 'closeup', who: 'sukuna', yaw: 0.22, dist: 6, f: 800, bust: { expr: 'contempt', eyes: 'narrow', eyes2: 'open', costume: 'haori' }, size: 214 },
    ],
  });
})();
