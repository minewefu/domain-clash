/* ACT V · 8 — a5_breath (12 s). The breath at the end of the act: the sun sets over the erased district. Low on the
   south-east rim, behind Gojo's back: the scoured floor of the erasure runs out to the torn ruins of West Shinjuku,
   smoke columns lean in the wind, the sun goes down behind the ruins; the first real snow begins to fall. Fade to
   black. (The held view is a pre-rendered plate — the sun is depth-tested behind the ruins, rendered once.) */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A5;
  const E = A.ERASE, GR = A.G_RIM;
  const toC = (() => { const d = [E.x - GR[0], E.y - GR[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; })();
  const YAW = -0.92, dir = [Math.sin(YAW), Math.cos(YAW)];
  const CAM = A.lookShear([GR[0] - toC[0] * 9 + toC[1] * 2.2, GR[1] - toC[1] * 9 - toC[0] * 2.2, 2.3], [GR[0] + dir[0] * 700, GR[1] + dir[1] * 700, 26], 400);
  const SUN = { t: 0, fx: 'sun', yaw: -1.23, el: 0.03, r: 11, halo: true, dur: 12, layer: 'sky', at: A.sunAt(-1.23, 0.03), cols: [C.vermilion, C.orange, C.gold] };
  const SCOUR = { t: 0, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0.1, snow: 0.25, dur: 12 };
  const plate = A.plate({ from: 0, to: 12, sky: [SUN], ground: [SCOUR] });
  HT.fightScene({
    id: 'a5_breath', act: 'V', title: 'Sunset over the Erasure', dur: 12, transitionIn: { type: 'dissolve', dur: 1.0 },
    set: 'black', env: { time: 'sunset', snow: 0.14, snowFall: 0.22, wind: 0.5, fogFar: 1300 },
    cast: {
      gojo: { char: 'gojo', at: GR, face: toC, pose: 'a5_backPockets', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.45 }, { name: 'snow', vol: 0.3 }],
    hooks: { back(ctx, S) { plate(ctx, S); } },
    script: [
      { t: 99, env: { set: 'city' } },            // (never reached: makes the runner warm the city geometry for the plate)
      { t: 0, who: 'gojo', do: 'view', view: 'back' },
      { t: 0, fx: 'smokeCols', cols: [[E.x - 235, E.y + 40, 0], [E.x - 150, E.y + 190, 0], [E.x + 205, E.y + 110, 0]], pre: 50, rate: 6, life: 10, rise: 9, size: 4, grow: 2.2, dark: true, wind: 4, dur: 12 },
      // the held wide, low behind him on the rim, into the setting sun (static: one plate)
      { t: 0, shot: 'static', cam: CAM },
      { t: 9.6, post: 'fadeTo', col: C.ink, in: 2.4, dur: 2.4 },
      { t: 1.0, sfx: 'windGust', vol: 0.2, pan: 0.4, panTo: -0.2, dur: 4 },
    ],
  });
})();
