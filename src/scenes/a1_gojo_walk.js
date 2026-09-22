/* ACT I · 7 — a1_gojo_walk (18 s). Gojo walks in down the snowy NS avenue from the south (from where the violet light
   came), costume 'robe' + dark scarf, hands in pockets, footprints; stops at the edge of the junction; stretches
   (front view), cracks his neck, loose; a slow push to the ECU of his eyes opening: the Six Eyes, luminous blue.
   Gojo motif: confident, Lydian (glass + koto arp). */
(function () {
  'use strict';
  const HT = window.HT;
  const STOP = [2, -26, 0];                                    // south edge of the junction (behind the crosswalk)
  HT.fightScene({
    id: 'a1_gojo_walk', act: 'I', title: 'The Strongest Walks In', dur: 18, transitionIn: { type: 'dissolve', dur: 0.6 },
    set: 'city', env: { time: 'dawn', snow: 0.4, snowFall: 0.35, wind: 0.35 },
    cast: { gojo: { char: 'gojo', at: [3, -60, 0], face: 'north', pose: 'frontPockets', costume: 'robe' } },
    ambience: [{ name: 'cityEmpty', vol: 0.35 }, { name: 'wind', vol: 0.35 }, { name: 'snow', vol: 0.3 }],
    script: [
      // 1. low wide from the junction looking south: a tall figure walks out of the snow toward us (front view)
      { t: 0, shot: 'static', cam: { x: 1.2, y: -14, z: 0.9, yaw: Math.PI + 0.03, f: 840, shift: 50 } },
      { t: 0, who: 'gojo', do: 'view', view: 'front' },
      { t: 0.3, sfx: 'footSnow', vol: 0.3, dur: 9.4, pitch: 0.96 },
      { t: 0.2, who: 'gojo', do: 'walk', to: [2.6, -40], style: 'frontPockets', speed: 1.35 },
      // 2. side tracking at knee height: the robe, the scarf in the wind, footprints behind him
      { t: 5.6, shot: 'follow', who: 'gojo', offset: [7.5, 1.5, 1.1], aimZ: 1.25, f: 520, shift: 12 },
      { t: 5.6, who: 'gojo', do: 'view', view: 'side' },
      { t: 5.6, who: 'gojo', do: 'walk', to: STOP, style: 'pockets', speed: 1.35 },
      // 3. he stops at the crosswalk: stretches, cracks his neck, loose (front, medium)
      { t: 9.8, shot: 'static', cam: { x: 2.4, y: -19.5, z: 1.5, yaw: Math.PI, f: 520, shift: 60 } },
      { t: 9.8, who: 'gojo', do: 'place', at: STOP, face: 'north', pose: 'frontPockets', costume: 'robe' },
      { t: 9.8, who: 'gojo', do: 'view', view: 'front' },
      { t: 10.4, who: 'gojo', do: 'pose', pose: 'stretchUp', dur: 0.6 },
      { t: 11.8, who: 'gojo', do: 'pose', pose: 'neckCrack', dur: 0.4 },
      { t: 12.3, sfx: 'clothSnap', vol: 0.25, pitch: 1.8 },
      { t: 12.9, who: 'gojo', do: 'pose', pose: 'frontPockets', dur: 0.5 },
      { t: 12.9, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'closed' },
      // 4. push in to the eyes: they open — the Six Eyes
      { t: 14.2, shot: 'closeup', who: 'gojo', yaw: Math.PI + 0.12, dist: 6, f: 820, bust: { expr: 'smirk', eyes: 'closed', costume: 'robe' }, size: 210 },
      { t: 15.8, shot: 'ecu', who: 'gojo', yaw: Math.PI },
      { t: 16.2, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      { t: 16.2, sfx: 'sixEyes', vol: 0.55 },
    ],
  });
})();
