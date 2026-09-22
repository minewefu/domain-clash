/* ACT III · 5 — a3_signal (22 s). Canon ch. 231. Gojo gets his palm up in time — the amplified counter still blows
   him 90 m back along the avenue; he catches the arm of a traffic signal at the junction's north-east corner, swings up and perches on
   it. The wheel over Sukuna's head turns (adaptation 1). Sukuna walks up, unhurried; the two regard each other. The
   light turns green (the crossing chirps): both launch — Blue rips the signal out of the ground into Sukuna's back;
   he catches it, spins and throws it back; the Infinity stops it an inch from Gojo's face (キィン). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A3;
  const WY = A.WALL.y, LAND = [-104, WY + 3.6, 0], SK2 = [LAND[0] + 2.9, LAND[1] + 0.6, 0];
  const SX = 12, SY = 14, SH = 5.2, SARM = 3.5;                            // sig0: NE corner, arm reaching west
  const PERCH = [SX - SARM + 0.45, SY + 0.05, SH + 0.25];
  const G2 = [0.8, 15.6, 9.2], S2 = [6.9, 13.6, 6.7];                    // mid-air after the launch
  // the thrown signal (a3signal base point + heading/roll): held above Sukuna's head, thrown at Gojo's face
  const YT = Math.atan2(G2[1] - S2[1], G2[0] - S2[0]), HX = Math.cos(YT), HY = Math.sin(YT);
  const HELD = [S2[0] - 2.6 * HX, S2[1] - 2.6 * HY, S2[2] + 2.0], BACK = [HELD[0] - 0.7 * HX, HELD[1] - 0.7 * HY, HELD[2] + 0.1];
  const FACE = [G2[0], G2[1], G2[2] + 1.75];
  const d3 = [FACE[0] - S2[0], FACE[1] - S2[1], FACE[2] - HELD[2]], dl = Math.hypot(d3[0], d3[1], d3[2]), un = d3.map(v => v / dl);
  const PIT = Math.atan2(d3[2], Math.hypot(d3[0], d3[1])), ROLLT = -Math.PI / 2 + PIT;
  const TOP = [FACE[0] - 0.35 * un[0], FACE[1] - 0.35 * un[1], FACE[2] - 0.35 * un[2]];
  const AX = [Math.cos(PIT) * HX, Math.cos(PIT) * HY, Math.sin(PIT)];
  const STOPB = [TOP[0] - 5.2 * AX[0], TOP[1] - 5.2 * AX[1], TOP[2] - 5.2 * AX[2]];
  const REST = [3.4, 13.9, 0.2];
  const T0 = 13.65;                                                     // the signal rips out of the ground
  HT.fightScene({
    id: 'a3_signal', act: 'III', title: 'Green Light', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.2, wind: 0.25, fogNear: 40, fogFar: 560, fogMax: 0.6 },
    cast: {
      gojo: { char: 'gojo', at: [SK2[0] + 1.05, SK2[1], 0], face: 'west', pose: 'palm', costume: 'fight' },
      sukuna: { char: 'sukuna', at: SK2, face: 'east', pose: 'cross', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'cityEmpty', vol: 0.25 }, { name: 'rubble', vol: 0.15 }],
    script: [
      { t: 0, fx: 'a3shade', dur: 22 }, { t: 0, fx: 'a3deck', dur: 22 }, { t: 0, fx: 'a3shaft', dur: 22 },
      { t: 0, fx: 'a3wheel', who: 'sukuna', mode: 'halo', from: 1, notch: 2, turnAt: [8.0], dur: 22 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grit', eyes: 'glow', bleed: true },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 1. the amplified counter lands on Gojo's raised palm — it blows him back along the avenue
      { t: 0, shot: 'static', cam: { x: SK2[0] - 1.0, y: SK2[1] + 5.2, z: 1.3, yaw: Math.PI, f: 520, shift: 36 } },
      { t: 0.06, fx: 'blockSpark', at: [SK2[0] + 0.62, SK2[1], 1.45], strength: 3, dir: [1, 0, 0] },
      { t: 0.06, fx: 'amplify', at: ['sukuna.hand2'], r: 0.4, dur: 0.4 },
      { t: 0.06, sfx: 'hitH', vol: 1 }, { t: 0.06, sfx: 'block', vol: 0.8 },
      { t: 0.06, kana: 'ドン', x: 280, y: 110, size: 4, dur: 0.8, style: 'impact' },
      { t: 0.06, shake: 0.7 },
      { t: 0.12, who: 'gojo', do: 'fly', to: [-52, -6.5, 2.8], dur: 1.05, pose: 'hitFly', ease: 'outQuad' },
      { t: 0.12, sfx: 'whooshL', vol: 0.9 },
      { t: 0.5, who: 'sukuna', do: 'pose', pose: 'guardLow', dur: 0.4 },
      { t: 0.17, who: 'gojo', do: 'hide' }, { t: 0.42, who: 'gojo', do: 'show' },   // blown out past the lens (perf: off-screen, 200-400 px)
      // tracking: 90 m back along the avenue, out from under the expressway into the ruined junction
      { t: 0.42, shot: 'follow', who: 'gojo', offset: [-4.6, 6.8, 0.5], aimZ: 0.9, f: 360 },
      { t: 0.42, fx: 'speedLines', mode: 'parallel', angle: 0.12, n: 60, len: 180, dur: 1.5, col: C.white },
      { t: 1.0, sfx: 'flyBy', vol: 0.6 },
      { t: 1.17, who: 'gojo', do: 'fly', to: [SX - 1.0, SY - 0.05, SH + 0.45], dur: 0.72, pose: 'flyGrab', ease: 'linear' },
      // 2. he catches the signal's arm, swings round under it and up onto the housing (low, from the junction)
      { t: 1.89, shot: 'static', cam: { x: 3.6, y: 5.0, z: 1.4, yaw: 0.48, pitch: 0.34, f: 420 } },
      { t: 1.89, who: 'gojo', do: 'fly', to: [SX - 2.3, SY + 0.1, SH - 1.15], dur: 0.3, pose: 'hitHigh', ease: 'outQuad' },
      { t: 1.9, sfx: 'block', vol: 0.55, pitch: 0.7 },
      { t: 1.9, sfx: 'signalTick', vol: 0.4 },
      { t: 2.19, who: 'gojo', do: 'fly', to: [PERCH[0], PERCH[1], PERCH[2] + 0.5], dur: 0.3, pose: 'jumpUp', ease: 'outQuad' },
      { t: 2.2, sfx: 'whooshM', vol: 0.5 },
      { t: 2.49, who: 'gojo', do: 'fly', to: PERCH, dur: 0.14, pose: 'a3perch', ease: 'inQuad', face: 'west' },
      { t: 2.63, sfx: 'dropSoft', vol: 0.35 }, { t: 2.63, sfx: 'block', vol: 0.2, pitch: 1.4 },
      { t: 2.66, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow', bleed: true },
      // 3. hold: perched, the long avenue west; far away Sukuna walks in out of the dust, unhurried
      { t: 3.4, shot: 'static', cam: { x: 12.9, y: SY + 0.75, z: 6.35, yaw: -Math.PI / 2 - 0.04, f: 330, shift: 40 }, to: { x: 13.3 }, dur: 4, ease: 'linear', twos: true },
      { t: 3.4, who: 'sukuna', do: 'place', at: [-64, 9.4, 0], face: 'east', pose: 'loose' },
      { t: 3.4, who: 'sukuna', do: 'walk', to: [-57.5, 9.4], speed: 1.6 },
      { t: 3.6, sfx: 'windGust', vol: 0.3, pan: -0.3, dur: 3.5 },
      { t: 4.4, sfx: 'signalTick', vol: 0.25 }, { t: 5.8, sfx: 'signalTick', vol: 0.25 },
      // 4. Sukuna walking (front, low): the wheel turns — adaptation 1
      { t: 7.4, shot: 'static', cam: { x: -33.8, y: 8.4, z: 1.05, yaw: -Math.PI / 2 + 0.06, f: 440, shift: 40 } },
      { t: 7.4, who: 'sukuna', do: 'place', at: [-40, 9.6, 0], face: 'east', pose: 'loose' },
      { t: 7.4, who: 'sukuna', do: 'walk', to: [-37.7, 9.7], speed: 1.55 },
      { t: 8.1, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 8.9, shot: 'ecu', who: 'gojo', yaw: Math.PI / 2 },
      { t: 8.95, sfx: 'sixEyes', vol: 0.25 },
      // 5. he arrives under the signal; the two regard each other (low two-shot from the junction)
      { t: 9.7, shot: 'static', cam: { x: 0.4, y: 2.8, z: 1.1, yaw: 0.67, pitch: 0.2, f: 380 } },
      { t: 9.7, who: 'sukuna', do: 'place', at: [1.4, 9.2, 0], face: 'east', pose: 'loose' },
      { t: 9.7, who: 'sukuna', do: 'walk', to: [5.6, 10.5], speed: 1.55 },
      { t: 12.5, who: 'sukuna', do: 'pose', pose: 'lookUp', dur: 0.5 },
      // 6. the light turns green; the crossing chirps (insert on the signal head, Gojo's feet on the housing)
      { t: 12.4, shot: 'static', cam: { x: 6.7, y: 18.1, z: 4.55, yaw: 2.72, pitch: 0.14, f: 600 } },
      { t: 12.7, damage: { kind: 'signal', id: 'sig0', state: 'green' } },
      { t: 12.7, damage: { kind: 'signal', id: 'ped1', state: 'green' } },
      { t: 12.72, sfx: 'crosswalkChirp', vol: 0.55, pan: -0.2 },
      { t: 13.02, sfx: 'crosswalkChirp', vol: 0.5, pan: -0.2 },
      // 7. both launch; Blue rips the signal out of the ground into Sukuna's back; he catches it and throws it back
      { t: 13.3, shot: 'static', cam: { x: 12.8, y: 3.6, z: 3.6, yaw: -0.62, pitch: 0.26, f: 330 } },
      { t: 13.33, who: 'gojo', do: 'fly', to: G2, dur: 0.16, pose: 'jumpUp', ease: 'outQuad', face: [1, -0.33] },
      { t: 13.33, who: 'sukuna', do: 'fly', to: S2, dur: 0.38, pose: 'jumpUp', ease: 'outQuad', face: [-1, 0.33] },
      { t: 13.33, sfx: 'whooshM', vol: 0.7 }, { t: 13.36, sfx: 'whooshL', vol: 0.6 },
      { t: 13.5, who: 'gojo', do: 'blue', face: [1, -0.3] },
      { t: 13.62, fx: 'blueOrb', at: [G2[0] + 0.75, G2[1] - 0.25, G2[2] + 1.3], r: 0.2, pull: 0.8, grow: 0.1, debris: 4, end: 'none', dur: 1.0, sfx: false },
      { t: 13.62, sfx: 'blueImplode', vol: 0.7 },
      { t: T0, damage: { kind: 'signal', id: 'sig0', state: 'gone' } },
      { t: T0, fx: 'debris', at: [SX, SY, 0.2], n: 16, speed: 5, size: 0.3, up: 1.3, mat: 'asphalt' },
      { t: T0, fx: 'dust', at: [SX, SY, 0.2], n: 8, r: 1, size: 0.6, dur: 1.4 },
      { t: T0, sfx: 'steelGroan', vol: 0.8, pitch: 1.3, dur: 0.8 },
      { t: T0 + 0.01, sfx: 'metalWhoosh', vol: 0.6, dur: 0.38, pan: 0.35, panTo: -0.15 },   // audio (M3): the pole's flight into his back + his spin
      { t: T0, fx: 'a3signal', lamp: 'green', lampOff: 20.8 - T0, layer: 'front', dur: 22 - T0, keys: [
        [0, SX, SY, 0, Math.PI, 0, 'inQuad'],
        [0.22, 9.9, 14.0, 3.4, Math.PI, -0.62, 'linear'],
        [0.3, HELD[0], HELD[1], HELD[2], YT, -Math.PI / 2, 'outQuad'],
        [0.55, BACK[0], BACK[1], BACK[2], YT, -Math.PI / 2, 'linear'],
        [0.72, BACK[0], BACK[1], BACK[2], YT, -Math.PI / 2, 'outCubic'],
        [1.07, STOPB[0], STOPB[1], STOPB[2], YT, ROLLT, 'linear'],
        [2.85, STOPB[0], STOPB[1], STOPB[2], YT, ROLLT, 'inQuad', 0],
        [3.62, REST[0], REST[1], REST[2], YT - 0.5, -Math.PI / 2, 'linear', 1],
        [22, REST[0], REST[1], REST[2], YT - 0.5, -Math.PI / 2, 'linear', 1]] },
      { t: T0 + 0.22, who: 'sukuna', do: 'hitMid' },
      { t: T0 + 0.22, fx: 'hitSpark', at: [S2[0] + 0.3, S2[1] + 0.1, S2[2] + 1.1], strength: 2, dir: [-0.9, -0.2, 0] },
      { t: T0 + 0.22, sfx: 'hitM', vol: 0.9 },
      { t: T0 + 0.22, sfx: 'poleClang', vol: 0.75, dur: 0.5 },                               // audio (M3): the pole slams into his back (body-damped)
      { t: T0 + 0.3, who: 'sukuna', do: 'a3catch' },
      { t: T0 + 0.3, sfx: 'poleClang', vol: 0.5, dur: 0.3, pitch: 1.1 },                      // audio (M3): caught — a gripped clang (was block)
      { t: T0 + 0.39, who: 'sukuna', do: 'a3throw' },
      { t: T0 + 0.71, sfx: 'metalWhoosh', vol: 0.75, dur: 0.36, pan: -0.3, panTo: 0.25 },    // audio (M3): the throw, ending at the stop
      { t: T0 + 1.07, fx: 'infinityRipple', at: TOP, strength: 3, dir: un },
      { t: T0 + 1.07, sfx: 'infinityStop', vol: 1 },
      { t: T0 + 1.07, sfx: 'poleRing', vol: 0.6, dur: 1.8 },                                  // audio (M3): キィン — the pole rings, held still
      { t: T0 + 1.07, kana: 'キィン', x: 360, y: 92, size: 3, dur: 1.0, style: 'ring' },
      // 8. stopped an inch from his face, the green lamp still lit (profile, crash zoom); then it drops
      { t: T0 + 1.07, shot: 'crash', base: 'static', cam: { x: G2[0] + 0.9, y: G2[1] + 4.2, z: FACE[2] - 0.1, yaw: -2.95, f: 460, shift: 10 }, target: [FACE[0] + 0.35, FACE[1] - 0.15, FACE[2]], zoom: 1.7, dur: 0.2 },
      { t: T0 + 1.1, fx: 'infinityAura', who: 'gojo', dur: 1.8, intensity: 0.8 },
      { t: T0 + 1.3, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow', bleed: true },
      { t: T0 + 1.1, who: 'gojo', do: 'float', to: G2, dur: 3.0, pose: 'float' },
      { t: T0 + 1.1, who: 'sukuna', do: 'fly', to: [5.0, 10.8, 0], dur: 0.9, pose: 'fall', ease: 'inQuad' },
      { t: T0 + 2.9, sfx: 'whooshS', vol: 0.4 },
      { t: T0 + 3.62, sfx: 'poleClang', vol: 0.7, dur: 1.5 }, { t: T0 + 3.62, sfx: 'rubble', vol: 0.6, dur: 0.8 }, { t: T0 + 3.62, sfx: 'glassTinkle', vol: 0.5 },   // audio (M3): falls flat and clatters (was block)
      { t: T0 + 3.62, fx: 'dust', at: [REST[0] + 2, REST[1] + 1, 0.2], n: 8, r: 2, size: 0.5, dur: 1.4 },
      // 9. down in the junction: Sukuna grins up at him; then both are gone (the chase) — the dead signal lies in the road
      { t: 16.4, shot: 'static', cam: { x: 0.2, y: 3.6, z: 1.2, yaw: 0.35, pitch: 0.3, f: 360 } },
      { t: 16.0, who: 'sukuna', do: 'pose', pose: 'landing', dur: 0.1 },
      { t: 16.4, who: 'sukuna', do: 'pose', pose: 'lookUp', dur: 0.5 },
      { t: 16.4, sfx: 'footConcrete', vol: 0.5 },
      { t: 18.6, who: 'gojo', do: 'fly', to: [-50, 12, 24], dur: 1.2, pose: 'dashFloat', ease: 'inQuad', face: 'west' },
      { t: 18.6, who: 'gojo', do: 'trail', dur: 1.2, n: 3, tint: C.ice },
      { t: 18.6, sfx: 'dashAir', vol: 0.8 },
      { t: 18.9, who: 'sukuna', do: 'pose', pose: 'crouch', dur: 0.12 },
      { t: 19.05, who: 'sukuna', do: 'fly', to: [-40, 20, 32], dur: 1.1, pose: 'jumpUp', ease: 'outQuad', face: 'west' },
      { t: 19.05, sfx: 'whooshL', vol: 0.8 },
      // both have left the frame (past the lens: the renderer would draw them up to 1100 px tall) — hidden to the end
      { t: 14.72, who: 'sukuna', do: 'hide' }, { t: 16.4, who: 'sukuna', do: 'show' },
      { t: 19.1, who: 'gojo', do: 'hide' }, { t: 19.2, who: 'sukuna', do: 'hide' },
      { t: 19.05, fx: 'dust', at: [5.0, 10.8, 0], n: 8, r: 1.5, size: 0.6, dur: 1.4 },
      { t: 19.05, fx: 'a3pulse', at: [5.0, 10.8, 0], r: 4, dur: 0.5 },
      { t: 20.2, shot: 'static', cam: { x: 3.7, y: 17.0, z: 0.55, yaw: -0.42, f: 520, shift: 64 } },
      { t: 20.4, sfx: 'signalTick', vol: 0.3 },
      { t: 21.2, sfx: 'windGust', vol: 0.25, dur: 0.8 },
    ],
  });
})();
