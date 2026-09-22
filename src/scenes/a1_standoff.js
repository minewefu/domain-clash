/* ACT I · 9 — a1_standoff (24 s). The held breath of the act. Both reach the junction and stop ~14 m apart across the
   crosswalk. Gojo slips off the robe and lets it drop; Sukuna's haori slides from his shoulders and drifts away on the
   wind (both shed their outer garment — canon for Gojo, ch. 224). Silence. The signal blinks. A can rolls across the
   asphalt between them (tink… tink…), stops. Dolly zoom on Gojo: the junction stretches behind him. Hold. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const G0 = [-7, -3, 0], S0 = [7, -3, 0];   // Gojo west, Sukuna east, on the EW avenue in the middle of the junction
  HT.fightScene({
    id: 'a1_standoff', act: 'I', title: 'The Standoff', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.42, snowFall: 0.3, wind: 0.5 },
    cast: {
      gojo: { char: 'gojo', at: G0, face: 'east', pose: 'pockets', costume: 'robe' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'loose', costume: 'haori' },
    },
    ambience: [{ name: 'wind', vol: 0.5 }, { name: 'cityEmpty', vol: 0.25 }, { name: 'snow', vol: 0.35 }],
    script: [
      // 1. the wide two-shot, symmetric, from the south kerb: two figures, the empty city, snow (hold)
      { t: 0, shot: 'static', cam: { x: 0, y: -21, z: 1.4, yaw: 0, f: 360, shift: 62 }, to: { y: -17.5 }, dur: 3.2, ease: 'linear' },
      { t: 0.8, sfx: 'signalTick', vol: 0.2 },
      // 2. Gojo: the robe comes off (medium, from Sukuna's side)
      { t: 3.2, shot: 'medium', on: ['gojo'], size: 118, yaw: 0.55, lead: -60 },
      { t: 3.4, who: 'gojo', do: 'view', view: 'front' },
      { t: 3.4, who: 'gojo', do: 'pose', pose: 'tossRobe', dur: 0.35 },
      { t: 3.75, who: 'gojo', do: 'costume', costume: 'fight' },
      { t: 3.75, fx: 'cloth', at: [G0[0] - 0.25, G0[1] + 0.15, 1.6], col: C.mist, col2: C.steel, size: 1.25, wind: [0.6, 0.1], dur: 20, layer: 'behind' },
      { t: 3.75, sfx: 'clothSnap', vol: 0.5, pan: -0.3 },
      { t: 4.3, who: 'gojo', do: 'pose', pose: 'frontPockets', dur: 0.5 },
      { t: 4.3, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      // 3. Sukuna: the haori slides off and drifts away on the wind
      { t: 6.4, shot: 'medium', on: ['sukuna'], size: 118, yaw: -0.55, lead: 60 },
      { t: 6.5, who: 'sukuna', do: 'view', view: 'front' },
      { t: 6.5, who: 'sukuna', do: 'pose', pose: 'armsOut', dur: 0.6 },
      { t: 7.2, who: 'sukuna', do: 'costume', costume: 'fight' },
      { t: 7.2, fx: 'cloth', at: [S0[0] - 0.1, S0[1] + 0.2, 1.6], col: C.shadow, col2: C.ink, size: 1.5, wind: [2.6, 0.9], carry: true, lift: 1.2, drop: false, dur: 16 },
      { t: 7.2, sfx: 'clothFlutter', vol: 0.45, pan: 0.3, panTo: 0.9, dur: 2.5 },
      { t: 7.9, who: 'sukuna', do: 'pose', pose: 'frontGrin', dur: 0.5 },
      { t: 7.9, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 4. silence; the low wide across the crosswalk; the can rolls between them and stops
      { t: 9.6, shot: 'low', on: ['gojo', 'sukuna'], size: 96, yaw: 0, height: 0.25, feetY: 300 },
      { t: 9.6, who: 'gojo', do: 'view', view: 'side' }, { t: 9.6, who: 'gojo', do: 'place', at: G0, face: 'east', pose: 'pockets' },
      { t: 9.6, who: 'sukuna', do: 'view', view: 'side' }, { t: 9.6, who: 'sukuna', do: 'place', at: S0, face: 'west', pose: 'loose' },
      { t: 10.4, fx: 'can', from: [-4.2, -14.1], to: [0.7, -13.9], roll: 4.4, dur: 13.6 },
      { t: 10.4, sfx: 'canRoll', vol: 0.8, dur: 4.4, pan: -0.4, panTo: 0.05 },
      // ground level: the can rolls through the foreground between their distant feet, slows, stops
      { t: 11.6, shot: 'static', cam: { x: 0, y: -16, z: 0.2, yaw: 0, f: 420, shift: 70 } },
      { t: 14.4, sfx: 'signalTick', vol: 0.25 },
      // 5. dolly zoom on Gojo: the junction stretches behind him; he doesn't blink
      { t: 15.6, shot: 'dolly', who: 'gojo', yaw: -Math.PI / 2 - 0.35, d0: 2.8, d1: 11, f0: 260, dur: 3.2, feetY: 390, height: 1.6 },
      { t: 15.6, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 18.8, sfx: 'riser', vol: 0.25, dur: 3.0 },
      // 6. reverse: Sukuna, the grin (close-up), then the wide again — hold, snow, nothing moves but the wind
      { t: 18.8, shot: 'closeup', who: 'sukuna', yaw: Math.PI / 2 + 0.3, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open' }, size: 272, bg: 'haze', haze: C.lilacgrey, dim: 0.35 },
      { t: 20.6, shot: 'static', cam: { x: 0, y: -17.5, z: 1.4, yaw: 0, f: 360, shift: 62 } },
      { t: 22.6, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.4 },
      { t: 22.6, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.4 },
    ],
  });
})();
