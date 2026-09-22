/* ACT III · 4 — a3_decoys (20 s). Canon ch. 231. Sukuna bursts out of the rubble and ducks Gojo's flying kick; Gojo
   leaps above him and a Blue yanks him up into a stomp — Sukuna vaults over the foot and answers with a flip-kick
   charged with Domain Amplification (it cuts through the Infinity; the wheel greys while he uses it: no adaptation).
   Gojo splits into four speed decoys around him; Sukuna's eyes dart — he turns and catches the real fist, and cocks
   his own. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const WY = A.WALL.y;
  const LAND = [-104, WY + 3.6, 0];                          // the heap from a3_drag
  const G1 = [LAND[0] + 7.5, LAND[1] + 2.4, 0];              // where Gojo waited
  const SK2 = [LAND[0] + 2.9, LAND[1] + 0.6, 0];             // Sukuna after vaulting the stomp (east of the heap)
  const R4 = 2.7, ring = a => [SK2[0] + Math.cos(a) * R4, SK2[1] + Math.sin(a) * R4 * 0.85, 0];
  const PE = ring(0), PN = ring(Math.PI / 2), PW = ring(Math.PI), PS = ring(-Math.PI / 2);   // the four Gojos (east = real)
  HT.fightScene({
    id: 'a3_decoys', act: 'III', title: 'Four Gojos', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.25, fogNear: 40, fogFar: 520, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: G1, face: 'west', pose: 'pockets', costume: 'fight' },
      sukuna: { char: 'sukuna', at: LAND, face: 'east', pose: 'dustLand', costume: 'fight' },
      g2: { char: 'gojo', at: PW, face: 'east', pose: 'guard', costume: 'fight' },
      g3: { char: 'gojo', at: PN, face: 'south', pose: 'guard', costume: 'fight' },
      g4: { char: 'gojo', at: PS, face: 'north', pose: 'guard', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'rubble', vol: 0.3 }],
    script: [
      { t: 0, fx: 'a3shade', dur: 20 }, { t: 0, fx: 'a3deck', dur: 20 }, { t: 0, fx: 'a3shaft', dur: 20 },
      { t: 0, fx: 'a3groove', y: WY, n: 1, from: [-91.1, 13.6], to: [-107.1, 12.7], t0: -5, t1: -4, w: 0.8, dur: 20 },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 1, dur: 20, sfx: false,
        dark: [[0, 0], [4.25, 0], [4.4, 1], [5.6, 1], [6.9, 0], [15.6, 0], [15.8, 1], [20, 1]] },
      { t: 0, who: 'sukuna', do: 'hide' },
      { t: 0, who: 'g2', do: 'hide' }, { t: 0, who: 'g3', do: 'hide' }, { t: 0, who: 'g4', do: 'hide' },
      { t: 0, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. the heap bursts: Sukuna breaks out (over Gojo's shoulder)
      { t: 0, shot: 'ots', from: 'gojo', to: 'sukuna', side: -1, back: 2.2, off: 0.7, height: 1.55, f: 470, aim: 0.5 },
      { t: 0, fx: 'a3heap', at: LAND, r: 1.8, n: 30, hgt: 1.5, size: 1.1, build: [-2, -1.9], burst: 0.45, dur: 2.2, layer: 'front' },
      { t: 0.45, who: 'sukuna', do: 'show' },
      { t: 0.45, fx: 'shockwave', at: LAND, r: 6, strength: 1.5 },
      { t: 0.45, fx: 'dust', at: [LAND[0], LAND[1], 0.5], n: 12, r: 2.4, size: 1.1, dur: 2 },
      { t: 0.45, sfx: 'boom', vol: 0.55 }, { t: 0.45, sfx: 'rubble', vol: 0.9, dur: 1.4 },
      { t: 0.46, kana: 'ドガッ', x: 250, y: 110, size: 3, dur: 0.8, style: 'impact' },
      { t: 0.45, shake: 0.45 },
      { t: 1.0, who: 'sukuna', do: 'pose', pose: 'rise', dur: 0.5 },
      { t: 1.55, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.35 },
      { t: 1.2, who: 'gojo', do: 'pose', pose: 'guard', dur: 0.3 },
      // 2. the flying kick — he ducks under it (side, from under the deck; the facade behind them)
      { t: 2.0, shot: 'static', cam: { x: -104.2, y: -3.4, z: 0.7, yaw: Math.PI + 0.02, f: 480, shift: 40 } },
      { t: 2.05, who: 'gojo', do: 'pose', pose: 'crouch', dur: 0.14 },
      { t: 2.2, who: 'gojo', do: 'fly', to: [LAND[0] - 3.4, LAND[1] + 0.1, 1.15], dur: 0.44, pose: 'flyKick', ease: 'linear' },
      { t: 2.2, who: 'gojo', do: 'trail', dur: 0.5, n: 3, tint: C.ice },
      { t: 2.2, sfx: 'whooshL', vol: 0.8 },
      { t: 2.32, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.1 },
      { t: 2.64, who: 'gojo', do: 'fly', to: [LAND[0] - 4.6, LAND[1] + 0.2, 0], dur: 0.2, pose: 'landing', ease: 'inQuad' },
      { t: 2.84, sfx: 'footConcrete', vol: 0.5 },
      { t: 2.9, who: 'gojo', do: 'face', face: 'east' },
      { t: 2.95, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.2 },
      { t: 2.95, who: 'sukuna', do: 'face', face: 'west' },
      // 3. he leaps above him; a Blue yanks Sukuna up into the stomp — Sukuna vaults over the foot (low angle)
      { t: 3.4, shot: 'static', cam: { x: LAND[0] + 4.6, y: LAND[1] + 7.2, z: 0.55, yaw: -2.56, pitch: 0.3, f: 380 } },
      { t: 3.5, who: 'gojo', do: 'fly', to: [LAND[0] - 0.2, LAND[1], 4.9], dur: 0.36, pose: 'jumpUp', ease: 'outQuad' },
      { t: 3.5, sfx: 'whooshM', vol: 0.6 },
      { t: 3.9, fx: 'blueOrb', at: [LAND[0], LAND[1], 2.3], r: 0.22, pull: 0.9, grow: 0.1, debris: 6, end: 'implode', dur: 0.62 },
      { t: 3.92, who: 'sukuna', do: 'fly', to: [LAND[0] + 0.1, LAND[1] + 0.2, 1.1], dur: 0.2, pose: 'hitHigh', ease: 'inQuad' },
      { t: 4.08, who: 'gojo', do: 'pose', pose: 'stompA', dur: 0.06 },
      { t: 4.14, who: 'gojo', do: 'fly', to: [LAND[0], LAND[1], 0], dur: 0.2, pose: 'stomp', ease: 'inQuad' },
      { t: 4.12, who: 'sukuna', do: 'fly', to: [SK2[0] - 0.6, SK2[1] - 0.2, 2.5], dur: 0.2, pose: 'a3flipA', ease: 'outQuad', face: 'west' },
      { t: 4.34, fx: 'a3pulse', at: [LAND[0], LAND[1], 0], r: 7, dur: 0.5 },
      { t: 4.34, fx: 'crater', at: [LAND[0], LAND[1], 0], r: 1.4 },
      { t: 4.34, fx: 'dust', at: [LAND[0], LAND[1], 0.3], n: 10, r: 2, size: 0.9, dur: 1.6 },
      { t: 4.34, sfx: 'groundSlam', vol: 0.9 },
      { t: 4.34, shake: 0.5 },
      // 4. the flip-kick with Domain Amplification (the wheel greys): it cuts through the Infinity — Gojo blocks
      { t: 4.32, who: 'sukuna', do: 'a3flipKick', target: 'gojo', hit: 'block', strength: 3, knock: 1.6, space: false, trauma: 0.5 },
      { t: 4.3, fx: 'a3amp', who: 'sukuna', joint: ['nlT'], r: 0.34, dur: 0.9 },
      { t: 4.3, sfx: 'blackFlash', vol: 0.18, pitch: 0.5 },
      { t: 4.62, kana: 'ガッ', x: 360, y: 130, size: 3, dur: 0.7, style: 'impact' },
      { t: 5.4, who: 'sukuna', do: 'fly', to: SK2, dur: 0.26, pose: 'landing', ease: 'inQuad' },
      { t: 5.66, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.4 },
      { t: 5.66, sfx: 'footConcrete', vol: 0.5 },
      { t: 5.7, who: 'gojo', do: 'pose', pose: 'guard', dur: 0.5 },
      // the wheel, greyed, warms back to gold (insert, tight on the halo)
      { t: 5.9, shot: 'static', cam: { x: SK2[0] + 1.4, y: SK2[1] + 2.6, z: 2.1, yaw: -2.648, f: 600, shift: 12 } },
      { t: 6.0, sfx: 'wheelTurn', vol: 0.25, pitch: 0.7 },
      // 5. four Gojos: speed decoys flicker in around him (high angle over the street)
      { t: 7.2, shot: 'static', cam: { x: SK2[0] + 5.8, y: SK2[1] + 2.7, z: 6.9, yaw: -1.99, pitch: -0.64, f: 360 }, to: { x: SK2[0] + 5.4 }, dur: 3.6, ease: 'linear', twos: true },
      { t: 7.2, who: 'gojo', do: 'place', at: [SK2[0] - 4.4, SK2[1] + 0.3, 0], face: 'east', pose: 'guard' },
      { t: 7.2, who: 'sukuna', do: 'place', at: SK2, face: 'west', pose: 'guardLow' },
      { t: 7.5, who: 'gojo', do: 'blink', to: PE, face: 'west', pose: 'guard' },
      { t: 7.5, who: 'g2', do: 'show' }, { t: 7.5, who: 'g2', do: 'blink', to: PW, face: 'east', pose: 'guard' },
      { t: 7.62, who: 'g3', do: 'show' }, { t: 7.62, who: 'g3', do: 'blink', to: PN, face: 'south', pose: 'guard' },
      { t: 7.74, who: 'g4', do: 'show' }, { t: 7.74, who: 'g4', do: 'blink', to: PS, face: 'north', pose: 'guard' },
      { t: 7.5, sfx: 'blink', vol: 0.6 }, { t: 7.62, sfx: 'blink', vol: 0.5 }, { t: 7.74, sfx: 'blink', vol: 0.5 },
      { t: 8.6, who: 'g2', do: 'trail', dur: 2.6, n: 2, tint: C.ice, alpha: 0.4 },
      { t: 8.6, who: 'g3', do: 'trail', dur: 2.6, n: 2, tint: C.ice, alpha: 0.4 },
      { t: 8.6, who: 'g4', do: 'trail', dur: 2.6, n: 2, tint: C.ice, alpha: 0.4 },
      { t: 8.6, who: 'gojo', do: 'trail', dur: 2.6, n: 2, tint: C.ice, alpha: 0.4 },
      { t: 8.9, who: 'g3', do: 'blink', to: [PN[0] + 1.1, PN[1] - 0.2, 0], face: 'south', pose: 'guardLow' },
      { t: 9.2, who: 'g2', do: 'blink', to: [PW[0] - 0.2, PW[1] - 1.0, 0], face: 'east', pose: 'guardLow' },
      { t: 9.45, who: 'g4', do: 'blink', to: [PS[0] - 1.0, PS[1] + 0.2, 0], face: 'north', pose: 'guardLow' },
      { t: 9.7, who: 'gojo', do: 'blink', to: [PE[0], PE[1] + 0.9, 0], face: 'west', pose: 'guardLow' },
      { t: 8.9, sfx: 'blink', vol: 0.35 }, { t: 9.2, sfx: 'blink', vol: 0.35 }, { t: 9.45, sfx: 'blink', vol: 0.35 }, { t: 9.7, sfx: 'blink', vol: 0.4 },
      // Sukuna's eyes dart (extreme close-ups: left, right)
      { t: 10.8, shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 - 0.15, eyes: { look: [-0.9, 0] } },
      { t: 10.8, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 11.35, shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 - 0.15, eyes: { look: [0.9, 0.1] } },
      { t: 10.85, sfx: 'sixEyes', vol: 0.15, pitch: 0.6 },
      // 6. all four strike at once — he turns and catches the real fist behind him; the decoys scatter
      { t: 11.9, shot: 'static', cam: { x: SK2[0] - 0.5, y: SK2[1] + 7.8, z: 1.15, yaw: Math.PI, f: 460, shift: 40 } },
      { t: 11.9, who: 'g2', do: 'pose', pose: 'guard', dur: 0.1 }, { t: 11.9, who: 'g3', do: 'pose', pose: 'guard', dur: 0.1 }, { t: 11.9, who: 'g4', do: 'pose', pose: 'guard', dur: 0.1 },
      { t: 12.0, who: 'g2', do: 'cross', target: 'sukuna', hit: 'miss', speed: 1.3 },
      { t: 12.0, who: 'g3', do: 'cross', target: 'sukuna', hit: 'miss', speed: 1.3 },
      { t: 12.0, who: 'g4', do: 'cross', target: 'sukuna', hit: 'miss', speed: 1.3 },
      { t: 12.0, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'block', react: false, hitSfx: 'block', speed: 1.3, strength: 3, fxHit: false },
      { t: 12.0, who: 'sukuna', do: 'face', face: 'east' },
      { t: 12.04, who: 'sukuna', do: 'catchFist' },
      { t: 12.18, who: 'g2', do: 'hide' }, { t: 12.18, who: 'g3', do: 'hide' }, { t: 12.18, who: 'g4', do: 'hide' },
      { t: 12.18, fx: 'dust', at: [PW[0] + 0.8, PW[1], 0.6], n: 4, r: 0.5, size: 0.25, col: 'snow', dur: 0.6 },
      { t: 12.18, fx: 'dust', at: [PN[0], PN[1] - 0.8, 0.6], n: 4, r: 0.5, size: 0.25, col: 'snow', dur: 0.6 },
      { t: 12.18, fx: 'dust', at: [PS[0], PS[1] + 0.8, 0.6], n: 4, r: 0.5, size: 0.25, col: 'snow', dur: 0.6 },
      { t: 12.18, sfx: 'whooshS', vol: 0.4 },
      { t: 12.28, kana: 'ガシッ', x: 330, y: 110, size: 3, dur: 0.9, style: 'impact' },
      { t: 12.3, who: 'gojo', do: 'expr', face: 'grit', eyes: 'wide', bleed: true },
      // 7. he cocks his other fist, dark with Amplification; the grin; the wheel greys again (push in)
      { t: 13.4, shot: 'static', cam: { x: SK2[0] - 1.2, y: SK2[1] + 6.6, z: 1.3, yaw: Math.PI, f: 520, shift: 36 }, to: { y: SK2[1] + 5.2 }, dur: 1.8, ease: 'inOutSine' },
      { t: 13.6, who: 'sukuna', do: 'pose', pose: 'crossA', dur: 0.8, ease: 'inOutSine' },
      { t: 13.9, fx: 'amplify', at: ['sukuna.hand2'], r: 0.42, dur: 6.1 },
      { t: 14.1, sfx: 'heartbeat', vol: 0.3 },
      { t: 15.2, shot: 'closeup', who: 'sukuna', yaw: Math.PI / 2 + 0.35, dist: 6, f: 820, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open', costume: 'fight' }, size: 240, bg: 'haze', haze: C.lilacgrey, dim: 0.45 },
      { t: 17.0, shot: 'closeup', who: 'gojo', yaw: -Math.PI / 2 - 0.35, dist: 6, f: 820, bust: { expr: 'shock', eyes: 'wide', bleed: 0.75, sweat: 0.7, costume: 'fight' }, size: 240, bg: 'haze', haze: C.lilacgrey, dim: 0.45 },
      { t: 18.3, shot: 'static', cam: { x: SK2[0] - 1.2, y: SK2[1] + 5.2, z: 1.3, yaw: Math.PI, f: 520, shift: 36 } },
      { t: 19.05, sfx: 'whooshL', vol: 0.7 },
      { t: 19.1, who: 'sukuna', do: 'pose', pose: 'cross', dur: 0.1, ease: 'inQuad' },
      { t: 19.1, fx: 'speedLines', mode: 'focus', at: 'sukuna.hand2', n: 70, inner: 70, dur: 0.9, col: C.white },
    ],
    hooks: {
      front(ctx, S) { if (S.t >= 15.2 && S.t < 17.0) A.bustWheel(ctx, S, { notch: 1, dark: S.t > 15.75 }); },
    },
  });
})();
