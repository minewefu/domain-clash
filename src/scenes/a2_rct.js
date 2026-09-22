/* ACT II · 5 — a2_rct (20 s). Canon ch. 226: Gojo heals the neck at once with Reverse Cursed Technique — then is cut
   all over while healing at full output (hairline flashes and steam; no wounds). He tries to break away; Sukuna runs
   alongside and shuts him down: a parry, a caught kick, then Sukuna drops and wraps Gojo's legs with his own. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const G = A.G0, S0 = A.S0, SH = A.SHRINE;
  const RUN = [G[0] - 16, G[1] - 4, 0];
  HT.fightScene({
    id: 'a2_rct', act: 'II', title: 'Healing Under the Blade', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'guardLow', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [S0[0] - 1.5, S0[1], 0], face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.45 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 34, h: 22, rise: 0.01, spread: 0.01, slashes: 8, sky: 0, dur: 20, sfx: false, sets: ['city'] },
      // 1. medium on Gojo: the neck closes under a pale glow; steam
      { t: 0, shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.5, lead: 60 },
      { t: 0, who: 'gojo', do: 'expr', face: 'strain', eyes: 'glow' },
      { t: 0.4, fx: 'rctGlow', who: 'gojo', r: 0.14, steam: true, dur: 3.2 },
      { t: 2.6, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      // 2. the Shrine never stops cutting: hairline flashes all over him while he heals at full output
      { t: 4.0, shot: 'full', on: ['gojo', 'sukuna'], size: 120, yaw: 0.2 },
      { t: 4.0, fx: 'rctGlow', who: 'gojo', r: 0.2, steam: true, dur: 5 },
      { t: 4.2, fx: 'cleave', at: 'gojo.chest', r: 0.8, n: 18, span: 0.4 },
      { t: 5.1, fx: 'cleave', at: 'gojo.hip', r: 0.7, n: 14, span: 0.3 },
      { t: 5.9, fx: 'cleave', at: 'gojo.head', r: 0.5, n: 12, span: 0.3 },
      { t: 6.8, fx: 'cleave', at: 'gojo.chest', r: 0.9, n: 22, span: 0.5 },
      { t: 7.6, fx: 'cleave', at: 'gojo.hip', r: 0.8, n: 16, span: 0.4 },
      { t: 4.2, who: 'gojo', do: 'pose', pose: 'exhaust', dur: 0.3 },
      { t: 4.0, fx: 'smoke', at: 'gojo.chest', rate: 4, life: 1.6, rise: 0.8, size: 0.12, grow: 3, dark: false, dur: 5, sfx: false },
      { t: 6.0, kana: 'ザザザ', x: 470, y: 90, size: 2, dur: 1.6, style: 'slash' },
      // 3. he breaks away down the avenue — Sukuna runs alongside him (tracking)
      { t: 9.0, shot: 'follow', who: 'gojo', offset: [-1.5, -7.5, 1.2], aimZ: 1.0, f: 380 },
      { t: 9.0, who: 'gojo', do: 'run', to: RUN, speed: 9 },
      { t: 9.15, who: 'sukuna', do: 'run', to: [RUN[0] + 1.6, RUN[1] + 0.8], speed: 10 },
      { t: 9.0, sfx: 'dashAir', vol: 0.6 },
      { t: 10.9, who: 'gojo', do: 'face', toward: 'sukuna' }, { t: 10.9, who: 'sukuna', do: 'face', toward: 'gojo' },
      { t: 11.0, who: 'gojo', do: 'jab', target: 'sukuna', hit: 'block', speed: 1.4, space: false },
      { t: 11.6, who: 'gojo', do: 'kick', target: 'sukuna', hit: 'block', speed: 1.3, space: false, react: false },
      { t: 11.95, who: 'sukuna', do: 'pose', pose: 'catchFist', dur: 0.1 },
      { t: 12.0, kana: 'ガシッ', x: 330, y: 110, size: 2, dur: 0.7, style: 'impact' },
      // 4. low angle: Sukuna drops, rolls, and scissors Gojo's legs — both go down
      { t: 13.2, shot: 'low', on: ['gojo', 'sukuna'], size: 110, yaw: 0.35, height: 0.3, feetY: 300 },
      { t: 13.4, who: 'sukuna', do: 'fly', to: [RUN[0] - 0.2, RUN[1] + 0.35, 0], dur: 0.32, pose: 'tumble', ease: 'outQuad' }, // the roll carries him into Gojo's legs
      { t: 13.72, who: 'sukuna', do: 'pose', pose: 'down', dur: 0.2 },
      { t: 13.8, who: 'gojo', do: 'pose', pose: 'hitMid', dur: 0.12 },
      { t: 14.0, who: 'gojo', do: 'pose', pose: 'down', dur: 0.3 },
      { t: 14.0, sfx: 'bodyFall', vol: 0.8 },
      { t: 14.1, fx: 'dust', at: [RUN[0], RUN[1], 0.2], n: 10, r: 1.5, size: 0.6 },
      { t: 14.1, shake: 0.3 },
      { t: 15.0, fx: 'cleave', at: [RUN[0] + 0.5, RUN[1], 0.6], r: 1.2, n: 20, span: 0.6 },
      { t: 16.4, fx: 'cleave', at: [RUN[0] + 0.8, RUN[1] + 0.3, 0.5], r: 1.1, n: 16, span: 0.5 },
      { t: 17.6, who: 'gojo', do: 'expr', face: 'strain', eyes: 'glow' },
    ],
  });
})();
