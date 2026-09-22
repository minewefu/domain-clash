/* ACT III · 6 — a3_chase (22 s). Canon ch. 232. The aerial chase: high over the ruined district, west along the line
   of the expressway — the wheel turns again (adaptation 2); Sukuna dives under the expressway and weaves between its
   piers; Gojo punches two Blues after him (they burst on a pier and in the road); Sukuna runs up a facade — eight orbs
   bloom around him on the wall and close in; he kicks free; blows in mid-air; the last orb gouges his side (a dark
   impact, dust — no wound shown); he crashes down onto the expressway deck and the wheel turns (adaptation 3). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const V = HT.city.viaduct, DZ = V.z1;                                      // deck top 9.6 m
  const b206 = HT.city.byId.b206;                                             // concrete, 21 m, south side (north face y −16.2)
  const WYN = b206 ? b206.y1 : -16.2, WX1 = b206 ? b206.x1 : -159.3;
  const WALLP = [-176.5, WYN + 0.35, 11.0];                                  // Sukuna on the facade
  const ORBR = 3.2, orbAt = k => [WALLP[0] + Math.cos(k / 8 * Math.PI * 2) * ORBR, WYN + 0.9, WALLP[2] + 0.9 + Math.sin(k / 8 * Math.PI * 2) * ORBR * 0.8];
  const DECKLAND = [-166.0, -3.6, DZ], SUKD = [DECKLAND[0] + 1.6, DECKLAND[1], DZ], GDECK = [-181.0, -2.4, DZ];
  const orbsCast = {}, orbsScript = [];
  for (let k = 0; k < 8; k++) {
    const id = 'o' + k, p0 = orbAt(k), t0 = 10.9 + k * 0.05;
    orbsCast[id] = { char: 'figure', at: p0, face: 'north', pose: 'stand' };
    orbsScript.push({ t: 0, who: id, do: 'hide' });
    orbsScript.push({ t: t0 + 0.55, who: id, do: 'fly', to: [WALLP[0] + Math.cos(k) * 0.3, WYN + 0.9, WALLP[2] + 0.9], dur: 0.62 - k * 0.02, ease: 'inCubic' });
    orbsScript.push({ t: t0, fx: 'blueOrb', at: id, r: 0.34, pull: 0.7, grow: 0.22, debris: 4, end: 'implode', dur: 1.25 - k * 0.04, sfx: false, follow: true });
    orbsScript.push({ t: t0 + 1.2 - k * 0.04, sfx: 'blueImplode', vol: 0.45 + 0.05 * (k % 3), pan: (k / 3.5 - 1) * 0.6 });
  }
  HT.fightScene({
    id: 'a3_chase', act: 'III', title: 'Pillars', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.3, fogNear: 40, fogFar: 620, fogMax: 0.6 },
    cast: Object.assign({
      gojo: { char: 'gojo', at: [-36, 8, 44], face: 'west', pose: 'dashFloat', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [-50, 12, 48], face: 'west', pose: 'jumpUp', costume: 'fight' },
      bl1: { char: 'figure', at: [-150, 0, 1.2], face: 'west', pose: 'stand' },
      bl2: { char: 'figure', at: [-150, 0, 1.2], face: 'west', pose: 'stand' },
    }, orbsCast),
    ambience: [{ name: 'wind', vol: 0.45 }, { name: 'sky', vol: 0.3 }],
    script: [
      { t: 0, who: 'bl1', do: 'hide' }, { t: 0, who: 'bl2', do: 'hide' },
      ...orbsScript,
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 2, notch: 4, turnAt: [3.1, 17.45], dur: 22 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. high over the ruined district, west along the expressway (voxel city): Sukuna bounds, Gojo flies after him
      { t: 0, env: { set: 'voxel' } },
      { t: 0, shot: 'follow', who: 'gojo', offset: [7.2, -3.4, -1.2], aimZ: 1.4, f: 360, shift: 0 },
      { t: 0, who: 'sukuna', do: 'fly', to: [-78, 8, 56], dur: 1.3, pose: 'jumpUp', ease: 'outQuad' },
      { t: 1.3, who: 'sukuna', do: 'fly', to: [-104, 4, 46], dur: 1.3, pose: 'a3fall', ease: 'inQuad' },
      { t: 0, who: 'gojo', do: 'fly', to: [-64, 5, 50], dur: 1.3, pose: 'dashFloat', ease: 'linear' },
      { t: 1.3, who: 'gojo', do: 'fly', to: [-90, 2, 48], dur: 1.3, pose: 'dashFloat', ease: 'linear' },
      { t: 0.1, sfx: 'windGust', vol: 0.5, dur: 3 }, { t: 0.8, sfx: 'flyBy', vol: 0.6 },
      // the wheel turns in mid-leap (adaptation 2): tight on Sukuna against the sky
      { t: 2.6, shot: 'follow', who: 'sukuna', offset: [2.8, -3.6, 0.8], aimZ: 1.6, f: 470 },
      { t: 2.6, who: 'sukuna', do: 'fly', to: [-126, 1, 52], dur: 1.2, pose: 'jumpUp', ease: 'outQuad' },
      { t: 2.6, who: 'gojo', do: 'fly', to: [-112, 0, 50], dur: 1.2, pose: 'dashFloat', ease: 'linear' },
      // he dives for the expressway (from below, against the sky)
      { t: 3.8, shot: 'follow', who: 'sukuna', offset: [3.2, -5.6, -2.6], aimZ: 1.0, f: 380 },
      { t: 3.8, who: 'sukuna', do: 'fly', to: [-146, -6, 12], dur: 1.1, pose: 'a3fall', ease: 'inQuad' },
      { t: 3.8, who: 'gojo', do: 'fly', to: [-134, -2, 24], dur: 1.1, pose: 'dashFloat', ease: 'inQuad' },
      // off-screen beside the lens: hidden (the renderer would draw him 200-3300 px tall)
      { t: 4.38, who: 'gojo', do: 'hide' }, { t: 4.9, who: 'gojo', do: 'show' },
      { t: 3.85, sfx: 'whooshL', vol: 0.7 },
      // 2. under the expressway (city): the piers march at the camera; he weaves between them, Gojo punches two Blues
      { t: 4.9, env: { set: 'city' } },
      { t: 4.9, shot: 'static', cam: { x: -198, y: 5.4, z: 1.3, yaw: Math.PI / 2 - 0.07, f: 400, shift: 30 } },
      { t: 4.9, fx: 'a3deck', dur: 17.1 }, { t: 4.9, fx: 'a3shade', dur: 17.1 },
      { t: 4.9, who: 'sukuna', do: 'place', at: [-138, -4.2, 0], face: 'west', pose: 'landing' },
      { t: 4.9, who: 'gojo', do: 'place', at: [-126, -1.4, 1.5], face: 'west', pose: 'dashFloat' },
      { t: 4.9, sfx: 'groundSlam', vol: 0.4 },
      { t: 5.0, who: 'sukuna', do: 'run', to: [-150, 3.6], speed: 17 },
      { t: 5.75, who: 'sukuna', do: 'run', to: [-162, -3.8], speed: 17 },
      { t: 6.55, who: 'sukuna', do: 'run', to: [-172, 3.4], speed: 17 },
      { t: 7.2, who: 'sukuna', do: 'run', to: [-178, -9.8], speed: 17 },
      { t: 5.0, who: 'gojo', do: 'fly', to: [-140, 0.6, 1.3], dur: 0.9, pose: 'dashFloat', ease: 'linear' },
      { t: 5.9, who: 'gojo', do: 'cross', face: 'west' },
      { t: 6.1, who: 'bl1', do: 'place', at: [-141.8, 0.4, 1.6] },
      { t: 6.1, who: 'bl1', do: 'fly', to: [-172.2, 1.0, 1.5], dur: 0.5, ease: 'linear' },
      { t: 6.1, fx: 'blueOrb', at: 'bl1', r: 0.3, pull: 0.8, grow: 0.08, debris: 6, end: 'implode', dur: 0.66, follow: true, sfx: false },
      { t: 6.1, sfx: 'whip', vol: 0.7 },
      { t: 6.6, fx: 'debris', at: [-172.6, 0.8, 1.6], n: 18, speed: 7, size: 0.4, mat: 'concrete' },
      { t: 6.6, fx: 'dust', at: [-172.6, 0.8, 1.2], n: 8, r: 1.4, size: 0.8, dur: 1.6 },
      { t: 6.6, sfx: 'blueImplode', vol: 0.8 }, { t: 6.6, sfx: 'wallCrash', vol: 0.6 },
      { t: 6.1, who: 'gojo', do: 'fly', to: [-160, -0.6, 1.3], dur: 1.0, pose: 'dashFloat', ease: 'linear' },
      { t: 7.1, who: 'gojo', do: 'hook', face: 'west' },
      { t: 7.3, who: 'bl2', do: 'place', at: [-161.6, -0.8, 1.5] },
      { t: 7.3, who: 'bl2', do: 'fly', to: [-176, -7.8, 0.2], dur: 0.42, ease: 'linear' },
      { t: 7.3, fx: 'blueOrb', at: 'bl2', r: 0.3, pull: 0.8, grow: 0.08, debris: 6, end: 'implode', dur: 0.58, follow: true, sfx: false },
      { t: 7.3, sfx: 'whip', vol: 0.7 },
      { t: 7.72, fx: 'crater', at: [-176, -7.8, 0], r: 1.6 },
      { t: 7.72, sfx: 'blueImplode', vol: 0.8 },
      // 3. he runs up the facade across the avenue — eight orbs bloom around him on the wall and close in
      { t: 8.0, shot: 'static', cam: { x: WALLP[0] + 1.2, y: WYN + 14.2, z: WALLP[2] + 0.6, yaw: Math.PI + 0.06, f: 300, shift: 10 } },
      { t: 8.0, who: 'sukuna', do: 'place', at: [-177.5, WYN + 5.6, 0], face: 'south', pose: 'crouch' },
      { t: 8.05, who: 'sukuna', do: 'fly', to: [WALLP[0] + 1.2, WALLP[1], 5.2], dur: 0.4, pose: 'jumpUp', ease: 'outQuad', face: 'west' },
      { t: 8.45, who: 'sukuna', do: 'fly', to: WALLP, dur: 0.6, pose: 'jumpUp', ease: 'outQuad', face: 'west' },
      { t: 8.05, sfx: 'whooshM', vol: 0.6 },
      { t: 9.05, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.2 },
      { t: 8.0, who: 'gojo', do: 'place', at: [-171.5, WYN + 8.5, 12.5], face: 'west', pose: 'float' },
      { t: 9.9, who: 'gojo', do: 'face', face: 'south' },
      { t: 9.9, who: 'gojo', do: 'pose', pose: 'blue', dur: 0.2 },
      { t: 9.9, shot: 'static', cam: { x: WALLP[0] - 0.3, y: WYN + 9.8, z: WALLP[2] + 1.1, yaw: Math.PI + 0.02, f: 360, shift: 0 } },
      { t: 10.8, kana: 'ゴゴゴ', x: 480, y: 60, size: 3, dur: 1.4, style: 'rumble' },
      { t: 9.9, who: 'gojo', do: 'hide' }, { t: 12.4, who: 'gojo', do: 'show' },       // off-screen left of this shot (perf)
      { t: 11.76, who: 'sukuna', do: 'hide' }, { t: 12.4, who: 'sukuna', do: 'show' }, // … and he has jumped out of the top of it
      { t: 11.35, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.1 },
      { t: 11.48, who: 'sukuna', do: 'fly', to: [WALLP[0] - 1.4, WYN + 7.6, WALLP[2] + 2.8], dur: 0.38, pose: 'jumpUp', ease: 'outQuad', face: 'north' },
      { t: 12.0, fx: 'shockwave', at: [WALLP[0], WYN + 0.4, WALLP[2] + 0.9], r: 4, strength: 2, dust: false },
      { t: 12.02, fx: 'debris', at: [WALLP[0], WYN + 0.5, WALLP[2] + 0.9], n: 20, speed: 6, size: 0.4, dir: [0, 1, 0.2], mat: 'concrete' },
      { t: 12.0, damage: { kind: 'hole', b: 'b206', face: 'n', u: WX1 - WALLP[0], v: WALLP[2] + 0.9, r: 1.6 } },
      { t: 12.0, sfx: 'wallCrash', vol: 0.8 },
      { t: 12.0, shake: 0.4 },
      // 4. mid-air: blows — the last orb gouges his side (dark impact, dust)
      { t: 12.4, shot: 'medium', on: ['gojo', 'sukuna'], size: 104, yaw: 0.2, height: WALLP[2] + 3.4, f: 520 },
      { t: 12.4, who: 'gojo', do: 'place', at: [WALLP[0] + 1.3, WYN + 8.2, WALLP[2] + 2.8], face: 'west', pose: 'guard' },
      { t: 12.4, who: 'sukuna', do: 'place', at: [WALLP[0] - 1.1, WYN + 8.0, WALLP[2] + 2.8], face: 'east', pose: 'guard' },
      { t: 12.55, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'block', strength: 2, knock: 0.3, speed: 1.4 },
      { t: 12.52, fx: 'a3amp', who: 'sukuna', joint: ['faH'], r: 0.3, dur: 0.6 },
      { t: 13.0, who: 'gojo', do: 'knee', target: 'sukuna', hit: 'block', strength: 2, knock: 0.3, speed: 1.3 },
      { t: 13.55, who: 'gojo', do: 'palm', target: 'sukuna', hit: 'hit', strength: 3, knock: 0.2, react: 'hitMid', impact: 1, impactMode: '2tone', hitSfx: 'hitH' },
      { t: 13.73, fx: 'blueOrb', at: 'sukuna.hip', r: 0.24, pull: 1.1, grow: 0.06, debris: 5, end: 'implode', dur: 0.4, sfx: false, follow: true },
      { t: 13.8, fx: 'dust', at: 'sukuna.hip', n: 10, r: 0.8, size: 0.5, col: 'dark', dur: 1.3 },
      { t: 13.8, fx: 'hitSpark', at: 'sukuna.hip', strength: 3, col: C.ink, dir: [-1, 0, 0] },
      { t: 13.8, sfx: 'blueImplode', vol: 0.9 },
      { t: 13.82, kana: 'ゴリッ', x: 250, y: 150, size: 3, dur: 0.8, style: 'impact' },
      { t: 14.2, who: 'sukuna', do: 'fly', to: [WALLP[0] - 3.5, WYN + 9.5, WALLP[2] + 1.0], dur: 0.6, pose: 'hitFly', ease: 'outQuad' },
      // 5. he tumbles down onto the expressway deck (on the deck)
      { t: 14.9, shot: 'static', cam: { x: DECKLAND[0] + 10.5, y: DECKLAND[1] - 2.6, z: DZ + 1.3, yaw: -Math.PI / 2 - 0.1, f: 400, shift: 30 } },
      { t: 14.9, who: 'sukuna', do: 'place', at: [DECKLAND[0] - 3.5, DECKLAND[1] - 3, DZ + 6], face: 'east', pose: 'tumble' },
      { t: 14.9, who: 'sukuna', do: 'fly', to: DECKLAND, dur: 0.45, pose: 'hitFly', ease: 'inQuad' },
      { t: 15.35, who: 'sukuna', do: 'place', at: DECKLAND, face: 'west', pose: 'down' },
      { t: 15.35, fx: 'dust', at: DECKLAND, n: 12, r: 2, size: 0.8, dur: 2 },
      { t: 15.35, fx: 'debris', at: DECKLAND, n: 12, speed: 5, size: 0.3, mat: 'asphalt', ground: DZ },
      { t: 15.35, sfx: 'groundSlam', vol: 0.9 }, { t: 15.35, sfx: 'bodyFall', vol: 0.6 },
      { t: 15.35, shake: 0.5 },
      { t: 15.5, who: 'sukuna', do: 'fly', to: SUKD, dur: 0.5, pose: 'down', ease: 'outQuad' },
      { t: 16.3, who: 'sukuna', do: 'pose', pose: 'rise', dur: 0.8 },
      // the wheel turns (adaptation 3) — tight on the halo as he rises
      { t: 17.0, shot: 'static', cam: { x: SUKD[0] + 2.9, y: SUKD[1] - 2.0, z: DZ + 2.0, yaw: -0.97, f: 640, shift: 0 } },
      { t: 17.2, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.5 },
      { t: 17.0, who: 'gojo', do: 'place', at: [GDECK[0], GDECK[1], DZ + 3.5], face: 'east', pose: 'float' },
      // 6. Gojo alights on the deck 15 m away (over Sukuna's shoulder) — a breath
      { t: 18.6, shot: 'static', cam: { x: -172.7, y: -15.7, z: 13.6, yaw: 0, pitch: -0.26, f: 380 } },
      { t: 18.6, who: 'gojo', do: 'fly', to: GDECK, dur: 0.7, pose: 'landing', ease: 'inOutSine' },
      { t: 19.4, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.5 },
      { t: 19.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 19.0, sfx: 'windGust', vol: 0.35, dur: 2.5 },
    ],
  });
})();
