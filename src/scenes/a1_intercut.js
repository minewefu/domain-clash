/* ACT I · 8 — a1_intercut (16 s). Intercut walks, accelerating, as manga panels: Gojo walking (left→right) / Sukuna
   walking (right→left); feet in the snow; hands; eyes (screentone accents); each change quicker; they converge on
   the junction from opposite sides. The Strongest counterpoint begins (taiko + koto). */
(function () {
  'use strict';
  const HT = window.HT;
  HT.fightScene({
    id: 'a1_intercut', act: 'I', title: 'Two Walks', dur: 16, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.42, snowFall: 0.3, wind: 0.4 },
    cast: {
      gojo: { char: 'gojo', at: [-44, -3, 0], face: 'east', pose: 'pockets', costume: 'robe' },
      sukuna: { char: 'sukuna', at: [44, -3, 0], face: 'west', pose: 'loose', costume: 'haori' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'snow', vol: 0.3 }],
    script: [
      { t: 0, who: 'gojo', do: 'walk', to: [-8.5, -3], style: 'pockets', speed: 2.4 },
      { t: 0, who: 'sukuna', do: 'walk', to: [8.5, -3], speed: 2.4 },
      // 1. two tall panels: each walking toward the other (colour)
      // (panels are listed in manga reading order: right to left — Sukuna's panel on the right, Gojo's on the left, so
      //  the two walks converge on the gutter)
      { t: 0, shot: 'panels', layout: 'split2', panels: [
        { shot: { shot: 'follow', who: 'sukuna', offset: [0, -7.5, 1.2], aimZ: 1.1, f: 460 } },
        { shot: { shot: 'follow', who: 'gojo', offset: [0, -7.5, 1.2], aimZ: 1.1, f: 460 }, slamAt: 0.3 },
      ] },
      { t: 0.3, sfx: 'panelSlam', vol: 0.5 },
      { t: 0.4, sfx: 'footSnow', vol: 0.35, dur: 3.5 },
      // 2. feet in the snow (low), diagonal split
      { t: 4.0, shot: 'panels', layout: 'diag', panels: [
        { shot: { shot: 'follow', who: 'sukuna', offset: [-0.8, -2.2, 0.25], aimZ: 0.25, f: 420 } },
        { shot: { shot: 'follow', who: 'gojo', offset: [0.8, -2.2, 0.25], aimZ: 0.25, f: 420 }, slamAt: 0.2 },
      ] },
      { t: 4.2, sfx: 'panelSlam', vol: 0.45 },
      { t: 4.0, sfx: 'footSnow', vol: 0.35, pitch: 1.71, pan: -0.4, dur: 3.6 }, { t: 4.15, sfx: 'footSnow', vol: 0.35, pitch: 1.87, pan: 0.4, dur: 3.5 },
      // 3. three strips: Gojo's eyes (screentone) · the empty junction between them · Sukuna's eyes (screentone)
      { t: 8.0, shot: 'panels', layout: 'strip3v', panels: [
        { shot: { shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 - 0.2 }, tone: true },
        { shot: { shot: 'static', cam: { x: 0, y: -40, z: 2.2, yaw: 0, f: 380, shift: 24 } }, slamAt: 0.18 },
        { shot: { shot: 'ecu', who: 'gojo', yaw: Math.PI / 2 + 0.2 }, tone: true, slamAt: 0.36 },
      ] },
      { t: 8.2, sfx: 'panelSlam', vol: 0.5 },
      { t: 8.5, sfx: 'panelSlam', vol: 0.4 },
      // 4. quicker: a grid of four — hands, faces
      { t: 11.4, shot: 'panels', layout: 'grid4', panels: [
        { shot: { shot: 'closeup', who: 'sukuna', yaw: -Math.PI / 2 - 0.25, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open', costume: 'haori' } }, tone: true },
        { shot: { shot: 'closeup', who: 'gojo', yaw: Math.PI / 2 + 0.25, bust: { expr: 'smirk', eyes: 'glow', costume: 'robe' } }, tone: true, slamAt: 0.12 },
        { shot: { shot: 'follow', who: 'sukuna', offset: [-0.5, -1.8, 0.9], aimZ: 0.9, f: 500 }, slamAt: 0.24 },
        { shot: { shot: 'follow', who: 'gojo', offset: [0.5, -1.8, 0.9], aimZ: 0.9, f: 500 }, slamAt: 0.36 },
      ] },
      { t: 11.5, sfx: 'panelSlam', vol: 0.55 },
      // 5. full frame: both arrive at the junction from opposite sides (the wide that opens the standoff)
      { t: 14.2, shot: 'static', cam: { x: 0, y: -21, z: 1.4, yaw: 0, f: 360, shift: 62 } },
    ],
  });
})();
