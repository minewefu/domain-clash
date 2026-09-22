/* ACT I · 3 — a1_empty (14 s). Street level. Blinking yellow signals over the empty junction (held wide, ~5 s); an
   abandoned car with snow on its roof; a crosswalk chirps for nobody; a crow on a lamp post turns its head and its eye
   glints (Mei Mei's crow — the watchers' feed). Music thins out; the city is holding its breath. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city;
  // the lamp nearest to the junction's south-west corner hosts the crow; a car left on the EW avenue east of the junction
  const lamp = city.props.filter(p => p.type === 'lamp').sort((a, b) => Math.hypot(a.x + 20, a.y + 14) - Math.hypot(b.x + 20, b.y + 14))[0];
  const car = city.props.filter(p => p.type === 'car').sort((a, b) => Math.hypot(a.x - 40, a.y) - Math.hypot(b.x - 40, b.y))[0];
  const crowAt = [lamp.x + 1.2, lamp.y, lamp.h + 0.05];
  HT.fightScene({
    id: 'a1_empty', act: 'I', title: 'Empty Shinjuku', dur: 14, transitionIn: { type: 'dissolve', dur: 0.8 },
    set: 'city', env: { time: 'dawn', snow: 0.4, snowFall: 0.3, wind: 0.3 },
    cast: {},
    ambience: [{ name: 'cityEmpty', vol: 0.5 }, { name: 'wind', vol: 0.35 }, { name: 'snow', vol: 0.3 }],
    script: [
      // 1. the empty junction from the NE corner: signals blink for nobody (hold)
      { t: 0, shot: 'static', cam: { x: 2, y: 24, z: 3.2, yaw: -Math.PI + 0.083, f: 340, shift: 20 } },
      { t: 0.6, sfx: 'signalTick', vol: 0.25, pan: 0.2 },
      { t: 1.9, sfx: 'crosswalkChirp', vol: 0.4, pan: -0.3 },
      { t: 3.3, sfx: 'crosswalkChirp', vol: 0.3, pan: -0.3 },
      // 2. the abandoned car, snow on its roof (low, close, slow push)
      { t: 5.0, shot: 'static', cam: { x: car.x - 7, y: car.y - 4.5, z: 2.1, yaw: 0.95, f: 380, shift: -14 }, to: { x: car.x - 6, y: car.y - 3.8 }, dur: 3.5, ease: 'linear' },
      // 3. the crow on the lamp post: it turns its head toward us; the eye glints
      { t: 8.5, shot: 'static', cam: { x: crowAt[0] - 3.2, y: crowAt[1] - 2.2, z: crowAt[2] - 0.4, yaw: 0.9, pitch: 0.12, f: 900 } },
      { t: 8.5, fx: 'crow', at: crowAt, turnAt: 1.4, glintAt: 2.3, dur: 5.6, face: -1 },
      { t: 9.9, sfx: 'crowCaw', vol: 0.35, pan: 0.1 },
      { t: 10.8, sfx: 'sixEyes', vol: 0.12 },
      // 4. back to the junction, wider and higher: the stage is set
      { t: 12.0, shot: 'static', cam: { x: -26, y: -30, z: 7, yaw: 0.75, f: 300, shift: -10 } },
    ],
  });
})();
