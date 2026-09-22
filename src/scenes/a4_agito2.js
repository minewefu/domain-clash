/* ACT IV · 8 — a4_agito2 (22 s). Canon ch. 234, back out on the avenue: Agito grabs, Gojo ducks under its arms, lunges
   past Mahoraga's downward cut and lands the fight's second Black Flash through Agito's middle (the film's #2: freeze,
   red-and-black lightning, a manga beat). Agito regrows (Round Deer's RCT heals only itself) and lashes its serpent tail;
   Gojo rips the snake's head off — it regrows too. Mahoraga cuts the road and flings gravel: the Infinity stops it in the
   air; Gojo hooks the giant's arm with a leg and sweeps it aside, swats the current between Agito's hands and lands a right
   hook. Between the two giants, breathing hard; up on the kerb Sukuna watches, not pleased. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = [3.0, 90.0, 0], AG = [0.3, 90.3, 0], M = [7.3, 91.0, 0], SK = [17.5, 96.0, 0];
  const ENV = A.ENV, BF = 3.95;                                // the Black Flash lands at BF (contact frame)
  HT.fightScene({
    id: 'a4_agito2', act: 'IV', title: 'Black Flash, Twice Over', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo', at: G, face: 'west', pose: 'guard', costume: 'fight' },
      agito: { char: 'agito', at: AG, face: 'east', pose: 'ag_idle' },
      maho: { char: 'mahoraga', at: M, face: 'west', pose: 'maho_idle' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.25 }],
    script: [
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 0, who: 'agito', do: 'expr', spark: 0.35 },
      { t: 0, who: 'sukuna', do: 'expr', face: 'neutral', eyes: 'narrow', eyes2: 'open' },
      // ---- 0–2.7: the avenue from the south: Gojo between the two giants; they close in (held)
      { t: 0, shot: 'static', cam: { x: 4.4, y: 78.8, z: 1.5, yaw: -0.06, f: 380, shift: 34 } },
      { t: 0.6, who: 'agito', do: 'agitoStep', rootScale: 0.35 },
      { t: 0.9, who: 'maho', do: 'mahoStep', rootScale: 0.35 },
      { t: 1.0, sfx: 'mahoStep', vol: 0.45 }, { t: 1.6, sfx: 'agitoSpark', vol: 0.35 },
      // ---- 2.7: Agito grabs — he ducks under; Mahoraga's cut comes down behind him — he lunges: BLACK FLASH
      { t: 2.7, shot: 'static', cam: { x: 3.6, y: 83.2, z: 1.3, yaw: -0.04, f: 420, shift: 34 } },
      { t: 2.75, who: 'agito', do: 'a4AgitoGrab', target: 'gojo', hit: 'miss', space: false, rootScale: 0.6 },
      { t: 3.05, who: 'gojo', do: 'pose', pose: 'crouch', dur: 0.12, ones: true },
      { t: 3.0, who: 'maho', do: 'mahoSlash', target: 'gojo', hit: 'miss', space: false, rootScale: 0.9 },
      { t: 3.77, fx: 'debris', at: [G[0] + 0.9, G[1] + 0.4, 0.1], n: 14, speed: 7, size: 0.3, up: 1.1, mat: 'asphalt', dur: 1.3 },
      { t: 3.77, fx: 'dust', at: [G[0] + 0.9, G[1] + 0.4, 0.2], n: 8, r: 1.2, size: 0.45, col: 'concrete', dur: 1.4 },
      { t: 3.77, sfx: 'groundSlam', vol: 0.5 },
      { t: BF - 8 / 30, who: 'gojo', do: 'cross', target: 'agito', hit: 'hit', strength: 4, hitstop: 12, knock: 1.3, react: 'agitoKnock', impact: 3, impactMode: '2tone', speed: 1.0 },
      { t: BF, fx: 'blackFlash', at: [AG[0] + 0.55, AG[1], 1.55], dir: [-1, 0, 0], scale: 1.3 },
      { t: BF, sfx: 'hitHuge', vol: 0.9 },
      { t: BF, kana: 'ドン', x: 196, y: 128, size: 5, dur: 1.1, style: 'impact' },
      { t: BF, shake: 1.0 },
      // the manga beat: the frozen strike as a screentone page (~0.9 s)
      { t: BF + 0.42, post: 'manga', dur: 0.8, in: 0.08, out: 0.2, wipe: 'diag', focus: 'agito.chest', lines: { n: 70, inner: 60 } },
      // ---- 5.2–8.2: Agito reels back, its middle hidden in black smoke — then Round Deer's glow: it regrows
      { t: 5.2, shot: 'static', cam: { x: -2.4, y: 83.6, z: 1.6, yaw: 0.34, f: 400, shift: 26 } },
      { t: BF + 0.4, fx: 'smoke', at: 'agito.chest', rate: 6, life: 1.4, rise: 0.5, size: 0.4, grow: 1.8, dark: true, wind: 0.3, dur: 1.9, sfx: false },
      { t: 6.1, who: 'agito', do: 'agitoRegrow' },
      { t: 6.1, fx: 'rctGlow', at: 'agito.chest', r: 0.45, dur: 1.8, steam: true, vol: 0.5 },
      { t: 6.5, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'narrow' },
      // ---- 8.2–10.4: the serpent tail lashes at him — he catches the snake's head and rips it off
      { t: 8.2, shot: 'static', cam: { x: AG[0] - 1.2, y: AG[1] - 6.4, z: 1.7, yaw: 0.0, f: 440, shift: 22 } },
      { t: 8.2, who: 'agito', do: 'place', at: AG, face: 'east', pose: 'ag_idle' },
      { t: 8.2, who: 'gojo', do: 'place', at: [AG[0] - 1.62, AG[1] + 0.05, 0.62], face: 'east', pose: 'a4HoverGuard' },
      { t: 8.3, who: 'agito', do: 'agitoTail' },
      { t: 8.5, who: 'gojo', do: 'a4TearTail' },
      { t: 9.1, who: 'agito', do: 'expr', snake: 0, spark: 0.2 },
      { t: 9.1, fx: 'dust', at: [AG[0] - 0.95, AG[1], 2.15], n: 7, r: 0.5, size: 0.25, col: 'dark', dur: 1.0 },
      { t: 9.1, fx: 'debris', at: [AG[0] - 0.95, AG[1], 2.15], n: 8, speed: 4, size: 0.12, mat: 'bone', dur: 1.0, sfx: false },   // audio (M4): no rubble under the tear
      { t: 9.1, sfx: 'rip', vol: 0.85 },   // audio (M4): a non-gory tear (was hitM)
      { t: 9.1, kana: 'ブチッ', x: 250, y: 96, size: 3, dur: 0.7, style: 'slash' },
      { t: 9.15, fx: 'smoke', at: [AG[0] - 1.9, AG[1] - 0.1, 1.9], rate: 4, life: 1.2, rise: 0.4, size: 0.18, grow: 2, dark: true, wind: 0.4, dur: 1.3, sfx: false },
      { t: 9.9, who: 'gojo', do: 'float', to: [AG[0] - 2.2, AG[1], 0], dur: 0.4, pose: 'guard', bob: 0 },
      // ---- 10.4–12.6: the stump of the tail bubbles, lengthens — the head regrows
      { t: 10.4, shot: 'medium', on: ['agito'], size: 150, yaw: 0.72, lead: 0 },
      { t: 10.6, who: 'agito', do: 'expr', snake: 0.3, regrow: 0.8 },
      { t: 11.2, who: 'agito', do: 'expr', snake: 0.65, regrow: 0.8 },
      { t: 11.8, who: 'agito', do: 'expr', snake: 1, regrow: 0.4 },
      { t: 12.3, who: 'agito', do: 'expr', snake: 1, regrow: 0, spark: 0.4 },
      { t: 10.6, sfx: 'rctHeal', vol: 0.45 },
      // ---- 12.6–16.6: the giant cuts the road and flings the gravel — it stops dead in the air before him; a leg hooks
      //      the giant's arm and sweeps it aside; he swats the current between Agito's hands, a right hook
      { t: 12.6, shot: 'static', cam: { x: 3.2, y: 80.4, z: 1.7, yaw: 0.0, f: 360, shift: 30 } },
      { t: 12.6, who: 'gojo', do: 'place', at: [2.2, 90.2, 0], face: 'east', pose: 'guard' },
      { t: 12.6, who: 'agito', do: 'place', at: [-1.2, 90.8, 0], face: 'east', pose: 'ag_idle' },
      { t: 12.6, who: 'maho', do: 'place', at: [7.6, 90.6, 0], face: 'west', pose: 'maho_idle' },
      { t: 12.65, who: 'maho', do: 'mahoUpcut', space: false, rootScale: 0.4 },
      { t: 13.28, fx: 'a4halt', from: [6.6, 90.5, 0.3], to: [2.4, 90.2, 1.2], n: 16, stop: 0.78, spread: 0.8, fly: 0.2, hold: 0.7, size: 0.22 },
      { t: 13.3, fx: 'infinityRipple', at: [3.3, 90.25, 1.2], strength: 2, dir: [-1, 0, 0] },
      { t: 13.28, sfx: 'rubble', vol: 0.5, dur: 0.6 }, { t: 13.45, sfx: 'infinityStop', vol: 0.7 },
      { t: 14.0, who: 'maho', do: 'mahoPunch', target: 'gojo', hit: 'miss', space: false, rootScale: 0.6 },
      { t: 14.25, who: 'gojo', do: 'round', target: 'maho', hit: 'hit', strength: 2, react: 'mahoHit', knock: 1.4, speed: 1.2 },
      { t: 14.9, who: 'gojo', do: 'face', face: 'west' },
      { t: 14.9, fx: 'a4crackle', at: 'agito.hand', r: 0.5, n: 5, dur: 0.6, glow: false },
      { t: 14.95, who: 'gojo', do: 'swipe', speed: 1.4 },
      { t: 15.1, sfx: 'sparkPop', vol: 0.6 },
      { t: 15.35, who: 'gojo', do: 'hook', target: 'agito', hit: 'hit', strength: 3, react: 'agitoKnock', knock: 0.9, impact: false },
      { t: 15.62, kana: 'バキ', x: 250, y: 110, size: 3, dur: 0.6, style: 'impact' },
      // ---- 16.6–19.4: breath: between the two giants, breathing hard; the avenue behind him
      { t: 16.6, shot: 'static', cam: { x: -4.4, y: 84.4, z: 0.9, yaw: 0.62, f: 360, shift: 44 } },
      { t: 16.6, fx: 'smoke', at: 'gojo.head', rate: 1.2, life: 1.2, rise: 0.25, size: 0.06, grow: 3, dark: false, wind: 0.3, dur: 5.4, sfx: false },
      { t: 16.8, who: 'gojo', do: 'pose', pose: 'guardLow', dur: 0.5 },
      { t: 16.8, who: 'gojo', do: 'expr', face: 'open', eyes: 'narrow' },
      // ---- 19.4–22: up on the kerb, Sukuna — not pleased with his shikigami
      { t: 19.4, shot: 'closeup', who: 'sukuna', yaw: -1.0, dist: 6, f: 800, bust: { expr: 'contempt', eyes: 'narrow', eyes2: 'open' }, size: 206, bg: 'haze', haze: C.shadow, dim: 0.45 },
      { t: 19.5, sfx: 'heartbeat', vol: 0.2 },
    ],
  });
})();
