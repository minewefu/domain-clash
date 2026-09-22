/* ACT IV · 2 — a4_smile (14 s). Canon ch. 233: in the monitoring room, for the first time, the thought of the
   invincible Satoru Gojo losing floods the watchers' minds — nobody moves (silhouettes, no voices). On the feed, on his
   knees before Mahoraga, Gojo raises his head — and smiles: not fear, not despair, a deep satisfaction. Then every
   screen of the pillar carries that smile, and the watchers stand frozen in front of it. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = A.START_G, S0 = A.START_S, M = [G[0] - 1.35, G[1] + 0.35, 0];
  const FEED_T = 4.6, SMILE_T = 6.6, ROOM2_T = 9.0;
  const CROW = { x: G[0] + 9, y: G[1] - 15, z: 8, yaw: -0.55, pitch: -0.3, f: 300 };
  const FIGS = [{ char: 'gojo', at: G, pose: 'a4KneelBow', face: 1, costume: 'fight' }, { char: 'mahoraga', at: M, pose: 'maho_look', face: 1 }, { char: 'sukuna', at: S0, pose: 'loose', face: -1, costume: 'fight' }];
  // the crow's feed: the street from above until he smiles — then the crow's close view of his face
  function feedFn(g, w, h, S2) {
    if (S2.t < SMILE_T) {
      const k = w / HT.W, c = HT.cam.prep(HT.cam.make({ x: CROW.x, y: CROW.y, z: CROW.z, yaw: CROW.yaw, pitch: 0, f: CROW.f * k, shift: CROW.f * Math.tan(CROW.pitch) * k, vx: 0, vy: 0, vw: w, vh: h }));
      if (HT.renderCity) HT.renderCity(g, c, S2, {});
      for (const fg of FIGS) { const q = HT.cam.project(c, fg.at[0], fg.at[1], 0); if (q) HT.rig.draw(g, fg.char, q.x, q.y, HT.rig.POSES[fg.pose], Math.max(4, HT.rig.CHARS[fg.char].height * q.s), { face: fg.face, light: A.ENV.light, costume: fg.costume }); }
      return;
    }
    HT.vgrad(g, 0, 0, w, h, [[0, C.dusk], [0.6, C.shadow], [1, C.ink]]);
    if (HT.busts) HT.busts.draw(g, 'gojo', Math.round(w * 0.52), h + 22, { size: 72, expr: 'smile', eyes: 'glow', face: -1, t: S2.t, blink: false, light: [-0.4, -0.5, 0.75] });
  }
  const WATCH = A.watchers({
    kusakabe: { poses: [[-1e9, 'stand'], [1.2, 'lean']], dur: 0.6 },
    yuji: { poses: [[-1e9, 'shout'], [1.6, 'stand'], [ROOM2_T + 2.4, 'lean']], dur: 0.8 },
    yuta: { poses: [[-1e9, 'shout'], [2.2, 'stand']], dur: 0.9 },
    hakari: { pose: 'crossed' }, kashimo: { pose: 'sit' }, maki: { pose: 'stand' },
  });
  HT.fightScene({
    id: 'a4_smile', act: 'IV', title: 'The Smile', dur: 14, transitionIn: { type: 'cut', dur: 0 },
    set: 'command', env: { time: 'night' },
    setOpts: { feed: { env: { time: 'overcastIV', snow: 0.22 }, fps: 8 }, feedFn, watchers: WATCH, glowK: 3.2 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'a4KneelBow', costume: 'fight' },
    },
    ambience: [{ name: 'command', vol: 0.6 }],
    script: [
      { t: 0, who: 'gojo', do: 'hide' },
      // 1. behind the watchers: the pillar of screens, the feed of the kneeling Gojo; nobody moves (slow push, hold)
      { t: 0, shot: 'static', cam: { x: 0.4, y: 6.6, z: 1.45, yaw: Math.PI - 0.03, f: 360, shift: 22 }, to: { x: 0.35, y: 5.7, z: 1.4 }, dur: 4.6, ease: 'linear' },
      { t: 0, sfx: 'crtHum', vol: 0.35, dur: 14 },   // audio (M4): the monitors (was signalTick 0.08)
      { t: 2.6, sfx: 'heartbeat', vol: 0.18 },
      // 2. the feed, full frame: on his knees in the ink, head bowed … he raises it — and smiles
      { t: FEED_T, env: { set: 'city', time: 'overcastIV', light: A.ENV.light, rim: A.ENV.rim, snow: A.ENV.snow } },
      { t: FEED_T, who: 'gojo', do: 'show' },
      { t: FEED_T, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      { t: FEED_T, shot: 'closeup', who: 'gojo', yaw: -1.3, dist: 6, f: 780, bust: { eyes: 'closed', hurt: 0.3, nod: 16 }, size: 210, bottom: 14, bg: 'haze', haze: C.shadow, dim: 0.45 },
      { t: FEED_T, post: 'a4monitor', dur: ROOM2_T - FEED_T, tint: C.indigo, k: 0.07 },
      { t: FEED_T + 1.4, shot: 'closeup', who: 'gojo', yaw: -1.3, dist: 6, f: 780, bust: { eyes: 'closed', hurt: 0.3, nod: 5 }, size: 210, bottom: 14, bg: 'haze', haze: C.shadow, dim: 0.45 },
      { t: SMILE_T, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: SMILE_T, shot: 'closeup', who: 'gojo', yaw: -1.3, dist: 6, f: 780, bust: { hurt: 0.3, nod: 0 }, size: 210, bottom: 14, bg: 'haze', haze: C.shadow, dim: 0.45 },
      { t: SMILE_T, sfx: 'sixEyes', vol: 0.16 },
      // 3. behind the watchers, closer: every screen now carries his smile; they stand frozen before it; Yuji leans in
      { t: ROOM2_T, env: { set: 'command', time: 'night' } },
      { t: ROOM2_T, who: 'gojo', do: 'hide' },
      { t: ROOM2_T, shot: 'static', cam: { x: 0.3, y: 6.3, z: 1.5, yaw: Math.PI - 0.02, f: 400, shift: 8 }, to: { y: 5.6 }, dur: 5, ease: 'linear' },
    ],
  });
})();
