/* ACT IV · 7 — a4_sit (12 s). Canon ch. 234, the monitoring room (silhouettes, no voices): Yuta gets up to go and
   help his teacher. Kashimo — electricity crawling over him — steps into his way and puts a hand on his shoulder: sit
   down, this is Satoru Gojo's fight. Yuta's cursed energy flares; Hakari sides with Kashimo, Maki and Yuji argue;
   Kusakabe raises a hand and the room stills. Yuta bows his head and sits back down. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const Y0 = [0.9, 3.9, 0], K0 = [-1.9, 4.2, 0];                // Yuta and Kashimo sit at the back of the group
  const YM = [-0.55, 4.05, 0], KM = [-1.35, 4.15, 0];            // … where they meet, face to face
  const WATCH = A.watchers({
    yuta: false, kashimo: false,                                // (cast members: they walk)
    kusakabe: { poses: [[-1e9, 'stand'], [8.4, 'hand'], [10.4, 'stand']], dur: 0.35 },
    yuji: { poses: [[-1e9, 'stand'], [3.2, 'lean'], [6.9, 'argue'], [9.0, 'stand']], dur: 0.4 },
    hakari: { poses: [[-1e9, 'crossed'], [6.6, 'point'], [8.8, 'crossed']], dur: 0.4 },
    maki: { x: 0.9, y: 2.9, poses: [[-1e9, 'stand'], [7.1, 'argue'], [9.1, 'stand']], dur: 0.4 },
  });
  const FEED = { cam: { x: 26, y: 62, z: 14, yaw: -0.72, pitch: -0.3, f: 300 }, env: { time: 'overcastIV', snow: 0.22 },
    figures: [{ char: 'gojo', at: [8.6, 84, 0], pose: 'guard', face: -1, costume: 'fight' }, { char: 'mahoraga', at: [11.2, 86, 0], pose: 'maho_punch', face: -1 }, { char: 'agito', at: [6.6, 82, 0], pose: 'a4ag_grab', face: 1 }] };
  HT.fightScene({
    id: 'a4_sit', act: 'IV', title: 'Sit Down', dur: 12, transitionIn: { type: 'cut', dur: 0 },
    set: 'command', env: { time: 'night', light: [0.2, -0.5, 0.8], rim: C.lavender },
    setOpts: { feed: FEED, watchers: WATCH, glowK: 3.2, chairs: [[Y0[0], Y0[1] - 0.05, Math.PI], [K0[0], K0[1] - 0.05, Math.PI]] },
    cast: {
      yuta: { char: 'w_yuta', at: Y0, face: 'south', pose: 'w_sit' },
      kashimo: { char: 'w_kashimo', at: K0, face: 'south', pose: 'w_sit' },
    },
    ambience: [{ name: 'command', vol: 0.6 }],
    script: [
      // ---- 0–2.3: from behind the group (north-west): the pillar of screens — the fight on the feed; Yuta gets up
      { t: 0, shot: 'static', cam: { x: -4.6, y: 8.4, z: 1.55, yaw: 2.52, f: 360, shift: 16 } },
      { t: 0.7, who: 'yuta', do: 'pose', pose: 'w_rise', dur: 0.25 },
      { t: 1.0, who: 'yuta', do: 'pose', pose: 'w_stand', dur: 0.3 },
      { t: 0.7, sfx: 'chairScrape', vol: 0.5, dur: 0.35 }, { t: 0.8, sfx: 'clothSnap', vol: 0.25 },   // audio (M4): the chair pushed back (was dropSoft)
      { t: 0, sfx: 'crtHum', vol: 0.35, dur: 12 },   // audio (M4): the monitors
      { t: 1.35, who: 'yuta', do: 'walk', to: YM, speed: 1.6 },
      { t: 1.5, sfx: 'footConcrete', vol: 0.3, dur: 0.9 },
      // ---- 2.3–6.6: closer, from the north: Kashimo rises into his way, crackling, a hand on his shoulder; Yuta's energy flares
      { t: 2.3, shot: 'static', cam: { x: -0.7, y: 8.0, z: 1.45, yaw: Math.PI + 0.06, f: 440, shift: 12 } },
      { t: 2.2, who: 'kashimo', do: 'pose', pose: 'w_stand', dur: 0.3 },
      { t: 2.5, who: 'kashimo', do: 'walk', to: KM, speed: 1.4 },
      { t: 2.4, fx: 'a4crackle', at: 'kashimo.head', r: 0.45, n: 4, col: [C.white, C.ice, C.sky], dur: 7.0, glow: false },
      { t: 2.4, fx: 'a4crackle', at: 'kashimo.chest', r: 0.55, n: 3, col: [C.ice, C.white, C.sky], dur: 6.8, glow: false, seed: 17 },
      { t: 2.4, sfx: 'staticCrackle', vol: 0.55, dur: 7.0 }, { t: 3.2, sfx: 'sparkPop', vol: 0.3 },   // audio (M4): Kashimo crackling (was sparkPop ×3); one snap as his hand lands
      { t: 3.1, who: 'kashimo', do: 'face', face: 'east' },
      { t: 3.1, who: 'kashimo', do: 'pose', pose: 'w_hand', dur: 0.3 },
      { t: 3.1, who: 'yuta', do: 'face', face: 'west' },
      { t: 3.1, who: 'yuta', do: 'pose', pose: 'w_stand', dur: 0.2 },
      { t: 4.0, who: 'yuta', do: 'pose', pose: 'w_argue', dur: 0.3 },
      { t: 4.0, fx: 'a4crackle', at: 'yuta.chest', r: 0.6, n: 5, col: [C.ink, C.plum, C.purple], dur: 2.4, glow: false, seed: 29 },
      { t: 4.0, sfx: 'downer', vol: 0.3 },
      // ---- 6.6–9.4: wider, from the east: the argument in silhouettes — Hakari points, Maki and Yuji argue back
      { t: 6.6, shot: 'static', cam: { x: 5.6, y: 5.4, z: 1.55, yaw: -2.02, f: 380, shift: 14 } },
      { t: 6.9, sfx: 'clothSnap', vol: 0.2 },
      // ---- 9.4–12: Kusakabe's raised hand stills the room; Yuta bows his head and sits back down (the wide again)
      { t: 9.4, shot: 'static', cam: { x: -4.6, y: 8.4, z: 1.55, yaw: 2.52, f: 360, shift: 16 }, to: { x: -4.3, y: 8.0 }, dur: 2.6, ease: 'linear' },
      { t: 9.5, who: 'kashimo', do: 'pose', pose: 'w_crossed', dur: 0.4 },
      { t: 9.6, who: 'yuta', do: 'pose', pose: 'w_bow', dur: 0.5 },
      { t: 10.3, who: 'yuta', do: 'face', face: 'east' },
      { t: 10.3, who: 'yuta', do: 'walk', to: [Y0[0], Y0[1]], speed: 1.3 },
      { t: 11.4, who: 'yuta', do: 'face', face: 'south' },
      { t: 11.4, who: 'yuta', do: 'pose', pose: 'w_sit', dur: 0.35 },
      { t: 11.3, sfx: 'chairScrape', vol: 0.4, dur: 0.3, pitch: 0.9 }, { t: 11.5, sfx: 'dropSoft', vol: 0.25 },   // audio (M4): the chair pulled in
    ],
  });
})();
