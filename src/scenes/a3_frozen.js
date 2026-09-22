/* ACT III · 1 — a3_frozen (20 s). Canon ch. 229. Act card. Inside the Unlimited Void that landed at the end of Act II:
   Sukuna stands frozen, information pouring into him (glyph streams). Gojo's barrage — a dozen blows in three
   seconds, afterimages, smears, the head snapping each way (no blood). A shadow widens at Sukuna's feet: Mahoraga
   rises out of it INSIDE the domain, the wheel above its head (turned once already). Gojo readies Red (two fingers)
   — Mahoraga drives the Sword of Extermination into the floor and the Void breaks from inside: its sky cracks and
   peels away in shards, and the noon city under the expressway is back. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const S0 = A.S0, G0 = A.G0, G1 = A.G1, M0 = A.M0;
  const POOL = [(S0[0] + M0[0]) / 2, (S0[1] + M0[1]) / 2, 0];
  const TIP = [M0[0] + 1.25, M0[1] - 0.25, 0];                       // where the blade enters the floor
  const T_STRIKE = 14.2, T_OPEN = 16.4;                               // the sword strikes · the Void is gone
  const E = S0[0] + 0.95, Wx = S0[0] - 0.95, Y = S0[1];              // the barrage: Gojo blinks either side of him
  const CITY_ENV = { time: 'noon', snow: 0.2, wind: 0.2, fogNear: 40, fogFar: 520, fogMax: 0.6 };
  HT.fightScene({
    id: 'a3_frozen', act: 'III', title: 'Unlimited Void', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'void', env: { time: 'void', snow: 0, wind: 0.1 },
    setOpts: {
      floor: { k: 1, rings: true }, glyphs: { n: 12, speed: 0.8 },
      crumble: [[0, 0], [T_STRIKE, 0], [T_STRIKE + 0.12, 0.08], [T_STRIKE + 0.7, 0.22], [T_OPEN, 1]], crumbleAt: TIP,
      crumbleTo: 'city', crumbleEnv: CITY_ENV,
    },
    cast: {
      gojo: { char: 'gojo', at: G0, face: 'west', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'east', pose: 'a3frozen', costume: 'fight' },
    },
    ambience: [{ name: 'void', vol: 0.55 }],
    script: [
      { t: 0, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'open', eyes: 'wide', eyes2: 'open' },
      // 1. act card over the held wide: Sukuna frozen in the Void's information, Gojo at ease
      // (the framing Act II ended on, pulling back as Gojo strolls away from his frozen opponent, back turned)
      { t: 0, shot: 'static', cam: { x: S0[0] + 1.0, y: S0[1] - 4.0, z: 1.5, yaw: 0.02, f: 420, shift: 40 }, to: { x: (S0[0] + G1[0]) / 2 + 0.2, y: S0[1] - 9.4, z: 1.4, shift: 30 }, dur: 4.3, ease: 'inOutSine', twos: true },
      { t: 0.7, who: 'gojo', do: 'walk', to: G1, style: 'pockets', speed: 1.15 },
      { t: 0.7, who: 'gojo', do: 'pose', pose: 'pockets', dur: 0.3 },
      { t: 4.0, who: 'gojo', do: 'face', face: 'west' },
      { t: 0.3, card: 'act', text: 'ACT III', sub: 'Unlimited Void', dur: 4.2 },
      { t: 0, fx: 'infoStream', at: 'sukuna.head', n: 18, speed: 1.0, dur: 8.2, sfx: false },
      { t: 0.1, sfx: 'tinnitus', vol: 0.22, dur: 4.4 },
      // 2. the barrage: a dozen blows in three seconds, either side; the head snaps each way (orbit around him)
      { t: 4.5, shot: 'orbit', center: 'sukuna', a0: -0.45, a1: 0.85, r: 5.0, height: 1.35, dur: 3.3, f: 440, track: true, aimZ: 1.1 },
      { t: 4.55, who: 'gojo', do: 'blink', to: [E, Y, 0], face: 'west', pose: 'guard' },
      { t: 4.62, who: 'gojo', do: 'jab', target: 'sukuna', hit: 'hit', strength: 1, speed: 2.0, hitstop: 2, react: 'a3snap', knock: 0.6 },
      { t: 4.86, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.0, hitstop: 3, react: 'a3snap', knock: 0.6 },
      { t: 5.12, who: 'gojo', do: 'blink', to: [Wx, Y + 0.1, 0], face: 'east', pose: 'guard' },
      { t: 5.18, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.1, hitstop: 3, react: 'a3snap', knock: 0.6 },
      { t: 5.44, who: 'gojo', do: 'elbow', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.0, hitstop: 2, react: 'a3snapBody', knock: 0.5 },
      { t: 5.7, who: 'gojo', do: 'blink', to: [E, Y - 0.1, 0], face: 'west', pose: 'guard' },
      { t: 5.76, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.1, hitstop: 3, react: 'a3snap', knock: 0.6 },
      { t: 6.0, who: 'gojo', do: 'knee', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.0, hitstop: 2, react: 'a3snapBody', knock: 0.5 },
      { t: 6.26, who: 'gojo', do: 'blink', to: [Wx, Y, 0], face: 'east', pose: 'guard' },
      { t: 6.32, who: 'gojo', do: 'jab', target: 'sukuna', hit: 'hit', strength: 1, speed: 2.2, hitstop: 2, react: 'a3snap', knock: 0.6 },
      { t: 6.52, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.1, hitstop: 3, react: 'a3snap', knock: 0.6 },
      { t: 6.78, who: 'gojo', do: 'blink', to: [E, Y + 0.1, 0], face: 'west', pose: 'guard' },
      { t: 6.84, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.1, hitstop: 3, react: 'a3snap', knock: 0.6 },
      { t: 7.1, who: 'gojo', do: 'uppercut', target: 'sukuna', hit: 'hit', strength: 2, speed: 2.0, hitstop: 3, react: 'a3snap', knock: 0.5 },
      // the last one: a palm into the chest (heavy; one impact frame)
      { t: 7.42, who: 'gojo', do: 'palm', target: 'sukuna', hit: 'hit', strength: 3, speed: 1.6, hitstop: 6, react: 'a3snapBody', knock: 2.2, impact: 1, impactMode: 'invert' },
      { t: 4.55, who: 'gojo', do: 'trail', dur: 3.2, n: 3, tint: C.ice, alpha: 0.45 },
      { t: 4.55, sfx: 'blink', vol: 0.5 }, { t: 5.12, sfx: 'blink', vol: 0.45 }, { t: 5.7, sfx: 'blink', vol: 0.45 }, { t: 6.26, sfx: 'blink', vol: 0.45 }, { t: 6.78, sfx: 'blink', vol: 0.45 },
      { t: 7.7, kana: 'ドッ', x: 380, y: 120, size: 3, dur: 0.7, style: 'impact' },
      // 3. a shadow widens at his feet (low, on the Void's floor)
      { t: 8.2, shot: 'static', cam: { x: S0[0] + 2.2, y: S0[1] - 3.4, z: 0.32, yaw: -0.55, pitch: 0.1, f: 400 } },
      { t: 8.2, who: 'gojo', do: 'place', at: G1, face: 'west', pose: 'loose' },
      { t: 8.2, who: 'gojo', do: 'hide' }, { t: 9.4, who: 'gojo', do: 'show' },   // off-screen beside the lens here (perf)
      { t: 8.2, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'glow' },
      { t: 8.2, who: 'sukuna', do: 'place', at: S0, face: 'east', pose: 'a3frozen' },
      { t: 8.3, fx: 'shadowPool', at: POOL, r: 3.0, grow: 1.1, out: 0.01, tendrils: 8, dur: 11.7 },
      { t: 8.3, fx: 'a3glowRing', at: POOL, r: 2.75, w: 0.5, grow: 1.1, out: 0.6, dur: 8.1 },
      { t: 8.35, sfx: 'rumble', vol: 0.35, dur: 2.5 },
      { t: 8.6, fx: 'infoStream', at: 'sukuna.head', n: 12, speed: 0.8, dur: 5.6, sfx: false },
      // 4. Mahoraga rises out of it, inside the domain — the wheel first (wide, low, from the south-east)
      { t: 9.4, shot: 'static', cam: { x: S0[0] + 4.6, y: S0[1] - 7.4, z: 1.0, yaw: -0.36, pitch: 0.16, f: 400 } },
      { t: 9.4, fx: 'a3maho', at: M0, face: 'east', dur: 10.6, layer: 'behind', keys: [
        [0, 'maho_emerge', 0, { wheelAngle: 45 }], [2.1, 'maho_kneel', 1, { wheelAngle: 45 }], [2.8, 'maho_look', 1, { wheelAngle: 45 }],
        [4.3, 'maho_look', 1, { wheelAngle: 45 }], [4.5, 'maho_plungeA', 1, { wheelAngle: 45 }], [4.75, 'maho_plungeA', 1, { wheelAngle: 45 }],
        [4.8, 'maho_plunge', 1, { wheelAngle: 45 }], [10.6, 'maho_plunge', 1, { wheelAngle: 45 }]] },
      { t: 9.45, sfx: 'shadowRise', vol: 0.8 }, { t: 10.6, sfx: 'mahoStep', vol: 0.6 }, { t: 11.4, sfx: 'wheelTurn', vol: 0.25, pitch: 0.6 },
      { t: 11.0, kana: 'ゴゴゴ', x: 120, y: 60, size: 3, dur: 1.8, style: 'rumble' },
      // 5. Gojo readies Red — two fingers (medium, Mahoraga looming behind Sukuna)
      { t: 11.6, shot: 'static', cam: { x: G1[0] + 1.4, y: G1[1] - 4.6, z: 1.55, yaw: -0.52, f: 470, shift: 26 } },
      { t: 11.7, who: 'gojo', do: 'pose', pose: 'a3redTwoA', dur: 0.35 },
      { t: 11.7, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 12.1, who: 'gojo', do: 'pose', pose: 'a3redTwo', dur: 0.3 },
      { t: 12.2, fx: 'redOrb', at: 'gojo.hand', r: 0.12, charge: 3.4, range: 0.1, dur: 3.0, sfx: false, follow: true },
      { t: 14.2, sfx: 'redCharge', vol: 0.6, dur: 2.0 },                                      // audio (M3): grows with the orb until the sword strike cuts it (was t 12.2)
      // 6. Mahoraga drives its sword into the floor: the Void breaks from inside (low wide from the south)
      { t: 13.2, shot: 'static', cam: { x: (S0[0] + G1[0]) / 2 - 0.8, y: S0[1] - 9.6, z: 0.9, yaw: -0.08, pitch: 0.14, f: 360 } },
      { t: 13.95, sfx: 'whooshL', vol: 0.6 },
      { t: T_STRIKE, sfx: 'swordRing', vol: 0.9 }, { t: T_STRIKE, sfx: 'groundSlam', vol: 0.8 }, { t: T_STRIKE + 0.05, sfx: 'barrierCrack', vol: 1 },
      { t: T_STRIKE, fx: 'a3pulse', at: TIP, r: 9, col: C.white, col2: C.lavender, dur: 0.7 },
      { t: T_STRIKE, fx: 'debris', at: TIP, n: 14, speed: 5, size: 0.3, up: 1.3, mat: 'stone', dur: 1.6 },
      { t: T_STRIKE, shake: 0.7 },
      { t: T_STRIKE + 0.02, kana: 'バキィン', x: 330, y: 80, size: 4, dur: 1.1, style: 'impact' },
      { t: T_STRIKE + 0.6, sfx: 'barrierShatter', vol: 1 }, { t: T_STRIKE + 0.9, sfx: 'domainCollapse', vol: 0.9 }, { t: T_STRIKE + 1.4, sfx: 'glassTinkle', vol: 0.6 },
      { t: T_STRIKE + 0.1, amb: 'void', vol: 0, fade: 2.0 },
      // 7. noon again: under the expressway, dust; Mahoraga's blade in the asphalt, the light through the deck hole (hold)
      { t: T_OPEN, env: Object.assign({ set: 'city' }, CITY_ENV) },
      { t: T_STRIKE + 0.7, fx: 'a3shade', dur: 20 - T_STRIKE - 0.7 }, { t: T_STRIKE + 0.7, fx: 'a3deck', dur: 20 - T_STRIKE - 0.7 }, { t: T_OPEN, fx: 'a3shaft', dur: 20 - T_OPEN, k: [[0, 0], [0.8, 1]] },
      { t: T_OPEN - 0.4, amb: 'wind', vol: 0.35, fade: 1.5 }, { t: T_OPEN - 0.4, amb: 'cityEmpty', vol: 0.2, fade: 1.5 },
      { t: T_OPEN, sfx: 'windGust', vol: 0.3, dur: 3 },
      { t: 15.4, shot: 'static', cam: { x: S0[0] + 6.6, y: S0[1] - 8.8, z: 1.2, yaw: -0.52, pitch: 0.06, f: 380 } },
      { t: 16.8, who: 'sukuna', do: 'pose', pose: 'a3slump', dur: 1.2, ease: 'inOutSine' },
      { t: 16.8, who: 'sukuna', do: 'expr', face: 'open', eyes: 'closed', eyes2: 'closed' },
    ],
  });
})();
