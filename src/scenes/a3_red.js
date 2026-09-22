/* ACT III · 7 — a3_red (18 s). Canon ch. 232. Under the expressway: Sukuna drops down after Gojo and stalks between the
   piers. Behind a pier, Gojo readies Red — so far he has used only Blue — and fires it straight through the concrete;
   Sukuna crosses his arms and Domain Amplification blunts it; he brushes the flying chunks of pier aside, grinning.
   The Red, still unexploded, curves away through the building across the avenue and comes round again — into his
   back. It blasts him forward, straight at Gojo. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const V = HT.city.viaduct, DZ = V.z1;
  const b207 = HT.city.byId.b207;                                   // concrete, 56 m, south side (x −158.9 … −136.9)
  const BX0 = b207 ? b207.x0 : -158.9, BX1 = b207 ? b207.x1 : -136.9, BY1 = b207 ? b207.y1 : -16.4;
  const PX = -174, PX0 = PX - 1.4, PX1 = PX + 1.4;                 // the pier Gojo hides behind
  const GH = [PX0 - 1.1, -0.4, 0];                                  // Gojo, pressed to its west face
  const GW = [GH[0] - 0.2, 7.0, 0];                                 // where he waits for the blasted Sukuna (sunlit, under the deck's edge)
  const SR = [-168.3, -0.6, 0], SB = [SR[0] + 1.6, SR[1], 0];       // Sukuna stalking; after the Red pushes him back
  const HAND = [PX0 - 0.55, -0.45, 1.45], ARMS = [SR[0] - 0.45, -0.6, 1.45];
  const IN = [BX1 - 15.6, BY1 + 0.05, 5.0], OUT = [BX0 - 0.05, BY1 - 7.1, 5.0];   // where the Red enters / leaves b207
  const BACK = [SB[0] + 0.35, SB[1] - 0.1, 1.35];
  const PATH_A = [ARMS, [SR[0] + 5, -3.6, 3.0], [SR[0] + 11, -9.5, 4.4], [IN[0] - 1, IN[1] + 3.2, 5.0], IN];
  const PATH_B = [OUT, [OUT[0] - 4, OUT[1] + 7, 4.6], [SB[0] + 2.5, -7.5, 3.0], [SB[0] + 1.4, -2.6, 1.8], BACK];
  HT.fightScene({
    id: 'a3_red', act: 'III', title: 'Red', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.2, fogNear: 40, fogFar: 560, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: GH, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [-167.5, -8.9, DZ], face: 'west', pose: 'crouch', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.3 }, { name: 'rubble', vol: 0.25 }],
    script: [
      { t: 0, fx: 'a3deck', dur: 18 }, { t: 0, fx: 'a3shade', dur: 18 },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 4, dur: 18, sfx: false, hideWith: true },
      { t: 0, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow', bleed: true },
      { t: 0, who: 'gojo', do: 'hide' },                              // hidden behind the pier (the renderer cannot occlude him)
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. he drops down from the deck after Gojo, who has vanished (low, under the deck)
      { t: 0, shot: 'static', cam: { x: -160.5, y: -3.0, z: 0.9, yaw: -1.92, pitch: 0.16, f: 380 } },
      { t: 0.4, who: 'sukuna', do: 'fly', to: [-166.8, -6.4, 0], dur: 0.62, pose: 'fall', ease: 'inQuad' },
      { t: 1.02, who: 'sukuna', do: 'dropLand' },
      { t: 1.02, fx: 'dust', at: [-166.8, -6.4, 0], n: 8, r: 1.4, size: 0.5, dur: 1.4 },
      { t: 1.02, sfx: 'groundSlam', vol: 0.55 },
      // 2. he stalks between the piers; nothing moves (behind him, down the colonnade; slow push)
      { t: 2.3, shot: 'static', cam: { x: -160.2, y: -4.4, z: 1.55, yaw: -1.73, f: 440, shift: 22 }, to: { x: -161.6, y: -3.8 }, dur: 3.7, ease: 'linear', twos: true },
      { t: 2.4, who: 'sukuna', do: 'walk', to: SR, speed: 1.2 },
      { t: 2.6, sfx: 'footConcrete', vol: 0.3, dur: 3 },
      { t: 5.2, who: 'sukuna', do: 'face', face: 'west' },
      { t: 5.3, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.4 },
      // 3. behind the pier: two fingers — Red, for the first time in this fight (close, the pier fills the frame)
      { t: 6.0, shot: 'static', cam: { x: GH[0] - 3.3, y: GH[1] + 2.6, z: 1.55, yaw: 2.2, f: 440, shift: 20 } },
      { t: 6.0, who: 'gojo', do: 'show' },
      { t: 6.0, who: 'sukuna', do: 'hide' },                          // he is on the far side of the pier here
      { t: 8.1, who: 'sukuna', do: 'show' },
      { t: 6.1, who: 'gojo', do: 'pose', pose: 'a3redTwoA', dur: 0.35 },
      { t: 6.1, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow', bleed: true },
      { t: 6.55, fx: 'redOrb', at: HAND, r: 0.1, charge: 1.6, range: 0.1, dur: 1.65, sfx: false },
      { t: 6.55, fx: 'glyphRings', at: HAND, r: 0.5, rings: 2, stagger: 0.2, col: C.red, dur: 1.6, sfx: false },
      { t: 8.15, sfx: 'redCharge', vol: 0.85, dur: 1.6 },                                     // audio (M3): builds with the orb 6.55→8.15, lands on the shot (was t 6.55)
      // 4. fired straight through the pier; Sukuna crosses his arms — Domain Amplification blunts it (side, from the south)
      { t: 8.1, shot: 'static', cam: { x: -171.4, y: -9.6, z: 1.35, yaw: 0.0, f: 380, shift: 30 } },
      { t: 8.1, who: 'gojo', do: 'pose', pose: 'a3redTwo', dur: 0.08 },
      { t: 8.1, who: 'sukuna', do: 'pose', pose: 'a3crossArms', dur: 0.1 },
      { t: 8.1, fx: 'amplify', at: ['sukuna.hand', 'sukuna.hand2'], r: 0.45, dur: 1.4 },
      { t: 8.15, fx: 'redShot', from: HAND, to: ARMS, travel: 0.16, r: 0.24, trail: 0.12, impact: false, sfx: false },
      { t: 8.15, sfx: 'redBlast', vol: 0.95 },
      { t: 8.2, fx: 'debris', at: [PX1, -0.5, 1.5], n: 26, speed: 11, size: 0.45, dir: [1, 0, 0.15], spread: 0.35, mat: 'concrete', dur: 2.2 },
      { t: 8.2, fx: 'dust', at: [PX1 + 0.3, -0.5, 1.4], n: 10, r: 1.2, size: 0.7, dir: [1, 0, 0], dur: 1.8 },
      { t: 8.2, fx: 'debris', at: [PX0, -0.5, 1.5], n: 8, speed: 4, size: 0.3, dir: [-1, 0, 0.2], mat: 'concrete', dur: 1.6 },
      { t: 8.2, sfx: 'wallCrash', vol: 0.8 },
      { t: 8.31, fx: 'hitSpark', at: ARMS, strength: 3, col: C.red, dir: [1, 0, 0] },
      { t: 8.31, fx: 'redOrb', at: ARMS, r: 0.2, charge: 0.01, range: 2.5, dir: [1, 0, 0], dur: 0.45, sfx: false },
      { t: 8.31, sfx: 'hitH', vol: 0.8 },
      { t: 8.31, kana: 'ゴッ', x: 440, y: 120, size: 3, dur: 0.7, style: 'impact' },
      { t: 8.31, shake: 0.45 },
      { t: 8.32, who: 'sukuna', do: 'fly', to: SB, dur: 0.3, pose: 'a3crossArms', ease: 'outQuad' },
      // the Red, unexploded, glances off and curves away (it drifts, losing speed)
      { t: 8.32, fx: 'redShot', path: PATH_A, travel: 1.9, ease: 'outQuad', r: 0.24, trail: 0.3, impact: false, sfx: false },
      { t: 8.35, sfx: 'flyBy', vol: 0.45, pitch: 1.4 },
      // 5. he brushes the chunks of pier aside, grinning (medium)
      { t: 9.0, shot: 'medium', on: ['sukuna'], size: 150, yaw: -0.25, lead: -30, feetY: 400 },
      { t: 9.1, who: 'sukuna', do: 'a3swat', speed: 1.4 },
      { t: 9.2, fx: 'debris', at: [SB[0] - 0.9, SB[1], 1.7], n: 6, speed: 6, size: 0.35, dir: [0.3, -1, 0.3], mat: 'concrete', dur: 1.2 },
      { t: 9.2, sfx: 'block', vol: 0.5, pitch: 0.7 },
      { t: 9.7, who: 'sukuna', do: 'a3swat', speed: 1.5 },
      { t: 9.8, fx: 'debris', at: [SB[0] - 0.9, SB[1], 1.4], n: 5, speed: 6, size: 0.3, dir: [0.3, 1, 0.3], mat: 'concrete', dur: 1.2 },
      { t: 9.8, sfx: 'block', vol: 0.45, pitch: 0.8 },
      { t: 10.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 10.25, damage: { kind: 'hole', b: 'b207', face: 'n', u: BX1 - IN[0], v: IN[2], r: 1.05 } },
      { t: 10.25, sfx: 'glassShatter', vol: 0.4 },
      { t: 10.25, sfx: 'redWhistle', vol: 0.7, dur: 3.55 },                                   // audio (M3): the Red's curving return, ending on his back (was flyBy 12.0)
      // 6. the Red leaves the building by its west face and comes round — he doesn't see it (under the deck, wide)
      { t: 10.9, shot: 'static', cam: { x: -181.5, y: 5.6, z: 1.7, yaw: 2.3, pitch: 0.1, f: 330 } },
      { t: 10.9, who: 'gojo', do: 'place', at: [GH[0] - 0.4, GH[1] + 1.6, 0], face: 'east', pose: 'loose' },
      { t: 11.2, who: 'gojo', do: 'walk', to: [GH[0] - 0.3, GH[1] + 3.2], speed: 1.1, face: 'east' },
      { t: 13.0, who: 'gojo', do: 'blink', to: GW, face: 'east', pose: 'loose' },
      { t: 11.4, damage: { kind: 'hole', b: 'b207', face: 'w', u: BY1 - OUT[1], v: OUT[2], r: 1.05 } },
      { t: 11.4, fx: 'glass', at: [OUT[0] - 0.3, OUT[1], OUT[2]], n: 18, speed: 4, dir: [-1, 0, 0.2] },
      { t: 11.4, fx: 'redShot', path: PATH_B, travel: 2.4, ease: 'inQuad', r: 0.24, trail: 0.26, impact: false, sfx: false },
      { t: 11.4, sfx: 'glassShatter', vol: 0.5 },
      { t: 12.8, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow', bleed: true },
      // 7. into his back: the Red detonates and blasts him forward, straight at Gojo (behind Sukuna, low)
      { t: 13.2, shot: 'static', cam: { x: SB[0] + 4.6, y: SB[1] - 3.3, z: 1.2, yaw: -0.95, f: 470, shift: 28 } },
      { t: 13.8, fx: 'redOrb', at: BACK, r: 0.34, charge: 0.01, range: 5, dir: [-1, 0, 0.05], dur: 0.9, sfx: false },
      { t: 13.8, sfx: 'redBlast', vol: 1 }, { t: 13.8, sfx: 'hitHuge', vol: 0.7 },
      { t: 13.8, post: 'impact', dur: 1 / 30, mode: 'red', accent: C.red, th: 120 },
      { t: 13.8, kana: 'ドォン', x: 360, y: 110, size: 4, dur: 0.9, style: 'impact' },
      { t: 13.8, shake: 0.8 },
      { t: 13.8, fx: 'dust', at: [SB[0], SB[1], 0.4], n: 12, r: 2, size: 0.8, dur: 1.8 },
      { t: 13.82, who: 'sukuna', do: 'fly', to: [GW[0] + 1.8, GW[1] - 0.2, 1.1], dur: 0.62, pose: 'hitFly', ease: 'linear', face: 'east' },
      { t: 13.82, who: 'sukuna', do: 'trail', dur: 0.4, n: 4, tint: C.coral },   // ends before the 14.25 cut: later afterimages would sit beside that lens (2400-5000 px drawings)
      { t: 13.82, who: 'sukuna', do: 'expr', face: 'grit', eyes: 'wide', eyes2: 'open' },
      // Gojo waits for him, fist cocked (low, from the side) — cut before the blow
      { t: 14.25, shot: 'static', cam: { x: GW[0] + 0.6, y: GW[1] - 3.4, z: 0.85, yaw: 0.2, pitch: 0.12, f: 400 } },
      { t: 14.1, who: 'gojo', do: 'place', at: GW, face: 'east', pose: 'crossA' },
      { t: 14.1, who: 'gojo', do: 'expr', face: 'grit', eyes: 'glow', bleed: true },
      { t: 14.3, fx: 'speedLines', mode: 'focus', at: 'gojo.hand2', n: 80, inner: 80, dur: 0.6, col: C.white },
      { t: 14.35, sfx: 'riser', vol: 0.5, dur: 0.1 },
      { t: 15.0, shot: 'static', cam: { x: GW[0] + 1.8, y: GW[1] + 6.0, z: 1.1, yaw: Math.PI - 0.12, f: 440, shift: 24 } },
      { t: 15.0, who: 'sukuna', do: 'place', at: [GW[0] + 4.8, GW[1] - 0.1, 1.2], face: 'west', pose: 'hitFly' },
      { t: 15.0, who: 'sukuna', do: 'fly', to: [GW[0] + 1.3, GW[1] - 0.1, 0.9], dur: 3.0, pose: 'hitFly', ease: 'outCubic' },
      { t: 15.1, who: 'gojo', do: 'pose', pose: 'a3punchWind', dur: 2.6, ease: 'outCubic' },
      { t: 15.0, sfx: 'heartbeat', vol: 0.5 }, { t: 16.2, sfx: 'heartbeat', vol: 0.6 }, { t: 17.2, sfx: 'heartbeat', vol: 0.7 },
    ],
  });
})();
