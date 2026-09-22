/* ACT II · 9 — a2_blossom (20 s). Canon ch. 227: with the shell gone, Gojo meets the Shrine's cuts with Falling
   Blossom Emotion — a pale aura that answers every slash, so only shallow sparks get through (in the monitoring room
   only Kusakabe knows the technique). Expansion #3 (tally 3): the dome swells huge, cracks — then shrinks to a ball
   around the two of them. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const SH = A.SHRINE, P = [A.G0[0] - 16, A.G0[1] - 4, 0];
  const G = [P[0] + 1.4, P[1], 0], SK = [P[0] + 3.2, P[1] + 0.3, 0], D = [P[0] + 2.3, P[1] + 0.15, 0];
  const PAL3 = { body: C.ink, line: C.indigo, edge: C.blue, hi: C.sky, ring: C.ice };
  HT.fightScene({
    id: 'a2_blossom', act: 'II', title: 'Falling Blossom Emotion', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'shrine', snow: 0.28, wind: 0.5, fogFar: 900 },
    setOpts: { command: {
      feed: A.crowFeed(D, { dist: 18, z: 8, f: 320, feed: { figures: [{ char: 'gojo', at: G, pose: 'guardLow', face: 1 }, { char: 'sukuna', at: SK, pose: 'loose', face: -1 }] } }),
      watchers: A.watchers({ kusakabe: { from: 'sit', pose: 'sitLean', t0: 5.75 } }),
    } },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'guardLow', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'shrine', vol: 0.5 }, { name: 'wind', vol: 0.3 }],
    script: [
      { t: 0, fx: 'shrineBloom', at: SH, back: 0, r: 120, h: 22, rise: 0.01, spread: 0.01, slashes: 12, sky: 0, dur: 7.4, sfx: false, sets: ['city'] },
      // 1. the aura answers the cuts (medium on Gojo, then wider)
      { t: 0, shot: 'medium', on: ['gojo'], size: 150, yaw: -Math.PI / 2 + 0.4, lead: 60 },
      { t: 0.2, fx: 'blossom', who: 'gojo', r: 0.9, rate: 10, dur: 7.2 },
      { t: 0.2, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 0.6, fx: 'cleave', at: 'gojo.chest', r: 1.1, n: 10, span: 0.3 },
      { t: 1.5, fx: 'cleave', at: 'gojo.head', r: 1.0, n: 8, span: 0.3 },
      { t: 2.4, fx: 'cleave', at: 'gojo.hip', r: 1.1, n: 10, span: 0.3 },
      { t: 3.0, shot: 'full', on: ['gojo', 'sukuna'], size: 120, yaw: 0.2 },
      { t: 3.3, fx: 'cleave', at: 'gojo.chest', r: 1.2, n: 12, span: 0.3 },
      { t: 4.2, fx: 'cleave', at: 'gojo.chest', r: 1.1, n: 12, span: 0.3 },
      { t: 3.2, kana: 'シャラ', x: 250, y: 90, size: 2, dur: 1.4, style: 'ring' },
      // 2. the monitoring room: only Kusakabe leans in
      { t: 5.2, env: { set: 'command', time: 'night' } },
      { t: 5.2, amb: 'command', vol: 0.5, fade: 0.15 }, { t: 5.2, amb: 'shrine', vol: 0, fade: 0.15 }, { t: 5.2, amb: 'wind', vol: 0, fade: 0.15 },
      { t: 7.4, amb: 'command', vol: 0, fade: 0.15 }, { t: 7.4, amb: 'shrine', vol: 0.5, fade: 0.15 }, { t: 7.4, amb: 'wind', vol: 0.3, fade: 0.15 },
      { t: 5.2, who: 'gojo', do: 'hide' }, { t: 5.2, who: 'sukuna', do: 'hide' },
      { t: 5.2, shot: 'static', cam: { x: 4.4, y: -5.0, z: 1.3, yaw: -0.8, f: 400, shift: 10 } },
      { t: 5.75, sfx: 'clothSnap', vol: 0.1, pan: -0.2 },
      // 3. expansion #3: the dome swells huge (tally 3), cracks all over…
      { t: 7.4, env: { set: 'city', time: 'shrine' } },
      { t: 7.4, fx: 'shrineBloom', at: SH, back: 0, r: 120, h: 22, rise: 0.01, spread: 0.01, slashes: 12, sky: 0, dur: 12.6, sfx: false, sets: ['city'] },
      { t: 7.4, shot: 'static', cam: { x: D[0] - 40, y: D[1] - 58, z: 78, yaw: 0.6, pitch: -0.62, f: 230 } }, // high over the ruins: street level is walled in by stumps
      { t: 7.4, fx: 'barrier', center: D, r: 40, state: 'grow', grow: 1.4, pal: PAL3, dur: 5.2, sets: ['city'] },
      { t: 7.4, sfx: 'voidOpen', vol: 0.9 },
      { t: 8.0, post: 'tally', n: 3, dur: 12 },
      { t: 8.0, sfx: 'tallyTick', vol: 0.6 },
      { t: 9.2, fx: 'domeRake', center: D, r: 40, rate: 40, hold: true, dur: 3.4, sets: ['city'] },
      { t: 9.2, sfx: 'cleave', vol: 0.45, dur: 3.4 },
      { t: 9.4, sfx: 'barrierCrack', vol: 0.9 }, { t: 11.0, sfx: 'barrierCrack', vol: 1 },
      // 4. …then shrinks — steps down to a ball around the two of them
      { t: 12.6, fx: 'barrier', center: D, r: 22, state: 'hold', pal: PAL3, dur: 0.25, sfx: false, sets: ['city'] },
      { t: 12.85, fx: 'barrier', center: D, r: 11, state: 'hold', pal: PAL3, dur: 0.22, sfx: false, sets: ['city'] },
      { t: 13.07, fx: 'barrier', center: D, r: 5, state: 'hold', pal: PAL3, dur: 0.2, sfx: false, sets: ['city'] },
      { t: 12.6, sfx: 'downer', vol: 0.7 },
      { t: 13.3, shot: 'static', cam: { x: D[0] - 6, y: D[1] - 9, z: 1.6, yaw: 0.58, f: 330, shift: 30 } },
      { t: 13.27, fx: 'barrier', center: D, r: 1.9, state: 'hold', pal: PAL3, dur: 6.73, sfx: false, sets: ['city'] },
      { t: 13.27, who: 'gojo', do: 'hide' }, { t: 13.27, who: 'sukuna', do: 'hide' },
      { t: 13.3, fx: 'domeRake', center: D, r: 1.9, rate: 22, dur: 6.7, sets: ['city'] },
      { t: 13.3, sfx: 'cleave', vol: 0.4, dur: 6.7 },
      { t: 14.0, kana: 'ギュウ', x: 470, y: 100, size: 2, dur: 1.2, style: 'rumble' },
    ],
  });
})();
