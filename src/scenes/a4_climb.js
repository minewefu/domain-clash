/* ACT IV · 10 — a4_climb (24 s). Canon ch. 234: one-armed, Gojo breaks for the glass tower and runs up its face; Sukuna
   comes out of the shadows and they pursue him up the side of the building (the camera looking up the facade, glass
   bursting under every footfall; Agito bounds up the building across the street in parallel). Mahoraga, on the wall,
   punches him out over the street; Sukuna springs off the glass after him — a head kick sends him spinning; Agito leaps
   the street and drives an electrified punch at his back — and the Infinity stops it dead: it is back up. Held in the
   air, Gojo turns his head to look back at Agito. (The tower's north face, y = 104, opens onto the EW street at y = 112;
   his missing right arm is never shown: every shot keeps his left side to the camera.) */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const FY = A.NFACE + 0.65, OY = 121 - 0.65;                  // just off the tower's north face / the facade across the street
  const P = (x, z) => [x, FY, z], Q = (x, z) => [x, OY, z];
  const ENV = A.ENV;
  const glassAt = (t, x, z, n, y) => ({ t, fx: 'glass', at: [x, y === undefined ? A.NFACE + 0.05 : y, z], n: n || 12, speed: 3.5, dir: [0, y === undefined ? 1 : -1, -0.3], size: 0.2 });
  const KO = [-54.0, 105.5, 32.0];                              // where Mahoraga punches him off the wall
  const HOLD = [-53.4, 111.6, 31.6];                            // where he hangs when Agito's punch stops on the Infinity
  HT.fightScene({
    id: 'a4_climb', act: 'IV', title: 'Up the Glass', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo1', at: [-40, 110, 4], face: 'west', pose: 'a4HoverGuard', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [-62.5, 107.2, 0], face: 'east', pose: 'crouch', costume: 'fight' },
      maho: { char: 'mahoraga', at: [-44, 113, 0], face: 'west', pose: 'maho_idle' },
      agito: { char: 'agito', at: [-45, 116, 0], face: 'west', pose: 'ag_idle' },
      gojoB: { char: 'gojo', at: HOLD, face: 'south', pose: 'a4HoverGuard', costume: 'fight' },   // bust helper (close-ups)
    },
    ambience: [{ name: 'wind', vol: 0.5 }, { name: 'rubble', vol: 0.15 }],
    script: [
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 225, wheelGlow: 0.5 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grit', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 0, who: 'sukuna', do: 'hide' }, { t: 0, who: 'gojoB', do: 'hide' },
      { t: 16.4, who: 'gojo', do: 'hide' }, { t: 16.4, who: 'agito', do: 'hide' }, { t: 20.4, who: 'gojo', do: 'show' }, { t: 20.4, who: 'agito', do: 'show' },
      // ---- 0–3.2: the tower's foot, from the street: he lands against the face, turns and bounds up it; Sukuna surfaces
      //      from a shadow at its base; the giants come after him
      { t: 0, shot: 'static', cam: { x: -50.5, y: 117.5, z: 1.8, yaw: -2.3, pitch: 0.36, f: 300 } },
      { t: 0.05, who: 'gojo', do: 'fly', to: [-65, 106.2, 1.2], dur: 0.6, pose: 'a4HoverGuard', ease: 'inOutQuad' },
      { t: 0.7, who: 'gojo', do: 'face', face: 'east' },
      { t: 0.72, who: 'gojo', do: 'fly', to: P(-63, 6), dur: 0.5, pose: 'dash', ease: 'outQuad' }, glassAt(1.22, -63, 6, 16),
      { t: 1.22, sfx: 'glassShatter', vol: 0.55 },
      { t: 1.24, who: 'gojo', do: 'fly', to: P(-61, 12), dur: 0.55, pose: 'dash', ease: 'outQuad' }, glassAt(1.8, -61, 12),
      { t: 1.82, who: 'gojo', do: 'fly', to: P(-59, 17.5), dur: 0.55, pose: 'dash', ease: 'outQuad' }, glassAt(2.38, -59, 17.5),
      { t: 1.2, sfx: 'footConcrete', vol: 0.45 }, { t: 1.8, sfx: 'footConcrete', vol: 0.4 },
      { t: 0.9, fx: 'shadowPool', at: [-62.5, 107.2, 0], r: 1.2, grow: 0.25, out: 0.3, tendrils: 6, dur: 1.5 },
      { t: 1.0, fx: 'a4emerge', char: 'sukuna', at: [-62.5, 107.2, 0], face: 'east', pose: 'crouch', z: [[0, -1.8], [0.35, 0]], costume: 'fight', dur: 0.36, lipW: 0.24 },
      { t: 1.36, who: 'sukuna', do: 'show' },
      { t: 1.4, who: 'sukuna', do: 'fly', to: P(-65, 7), dur: 0.5, pose: 'dash', ease: 'outQuad' }, glassAt(1.9, -65, 7),
      { t: 1.2, who: 'maho', do: 'fly', to: [-67.5, FY + 0.2, 7], dur: 0.8, pose: 'maho_leap', ease: 'outQuad' }, glassAt(2.0, -67.5, 7, 16),
      { t: 1.4, who: 'agito', do: 'fly', to: Q(-62, 6), dur: 0.7, pose: 'ag_pounce', ease: 'outQuad' }, glassAt(2.1, -62, 6, 14, 121 - 0.05),
      { t: 1.2, sfx: 'whooshL', vol: 0.5 }, { t: 2.0, sfx: 'glassShatter', vol: 0.45 },
      // ---- 3.2–9.2: craning up the tower's corner with them, looking along its face — they race up the glass toward us
      //      (Agito's parallel climb across the street is off frame right here; it reads in the shot before)
      // (the city view shears pitch into a lens shift, so a street-level look-up cannot reach climbers 30 m up a few metres
      //  away: the camera cranes up the corner with them instead — on 2s, like an anime camera move)
      { t: 3.2, shot: 'static', cam: { x: -49.4, y: 108.2, z: 21, yaw: -1.68, pitch: 0.3, f: 240 }, to: { z: 30.5 }, dur: 4.2, ease: 'inOutSine', twos: true },
      { t: 2.4, who: 'gojo', do: 'fly', to: P(-57.4, 22.5), dur: 0.7, pose: 'dash', ease: 'outQuad' }, glassAt(3.1, -57.4, 22.5),
      { t: 3.12, who: 'gojo', do: 'fly', to: P(-56, 26.5), dur: 0.8, pose: 'a4HoverGuard', ease: 'outQuad' }, glassAt(3.92, -56, 26.5),
      { t: 1.9, who: 'sukuna', do: 'fly', to: P(-63, 13), dur: 0.8, pose: 'dash', ease: 'outQuad' }, glassAt(2.7, -63, 13),
      { t: 2.72, who: 'sukuna', do: 'fly', to: P(-60.5, 19), dur: 0.8, pose: 'dash', ease: 'outQuad' }, glassAt(3.5, -60.5, 19),
      { t: 3.52, who: 'sukuna', do: 'fly', to: P(-57.6, 25.5), dur: 0.7, pose: 'flyKick', ease: 'outQuad' },
      { t: 2.0, who: 'maho', do: 'fly', to: [-65.5, FY + 0.2, 15], dur: 1.0, pose: 'maho_leap', ease: 'outQuad' }, glassAt(3.0, -65.5, 15, 16),
      { t: 3.02, who: 'maho', do: 'fly', to: [-62.5, FY + 0.2, 23], dur: 1.1, pose: 'maho_leap', ease: 'outQuad' }, glassAt(4.1, -62.5, 23, 16),
      { t: 4.1, sfx: 'mahoStep', vol: 0.5 },
      { t: 2.1, who: 'agito', do: 'fly', to: Q(-60, 13), dur: 0.9, pose: 'ag_pounce', ease: 'outQuad' }, glassAt(3.0, -60, 13, 12, 121 - 0.05),
      { t: 3.02, who: 'agito', do: 'fly', to: Q(-57.5, 21), dur: 1.0, pose: 'ag_pounce', ease: 'outQuad' }, glassAt(4.0, -57.5, 21, 12, 121 - 0.05),
      { t: 4.05, who: 'agito', do: 'fly', to: Q(-55.5, 27), dur: 1.0, pose: 'ag_pounce', ease: 'outQuad' }, glassAt(5.05, -55.5, 27, 12, 121 - 0.05),
      // the exchange on the glass: Sukuna's kick — parried one-handed; a second — blocked; they climb on
      { t: 4.2, who: 'gojo', do: 'face', face: 'west' },
      { t: 4.25, who: 'sukuna', do: 'kick', target: 'gojo', hit: 'block', strength: 2, react: 'block', knock: 0.3, space: false },
      { t: 4.7, who: 'sukuna', do: 'round', target: 'gojo', hit: 'block', strength: 2, react: 'block', knock: 0.3, space: false },
      { t: 5.35, who: 'gojo', do: 'face', face: 'east' },
      { t: 5.4, who: 'gojo', do: 'fly', to: P(-55, 30), dur: 0.8, pose: 'dash', ease: 'outQuad' }, glassAt(6.2, -55, 30),
      { t: 5.45, who: 'sukuna', do: 'fly', to: P(-56.8, 30), dur: 0.8, pose: 'dash', ease: 'outQuad' }, glassAt(6.25, -56.8, 30),
      { t: 5.2, who: 'maho', do: 'fly', to: [-58, FY + 0.2, 29.5], dur: 1.1, pose: 'maho_leap', ease: 'outQuad' }, glassAt(6.3, -58, 29.5, 16),
      { t: 5.1, who: 'agito', do: 'fly', to: Q(-54.5, 30), dur: 1.2, pose: 'ag_pounce', ease: 'outQuad' }, glassAt(6.3, -54.5, 30, 12, 121 - 0.05),
      { t: 6.25, who: 'gojo', do: 'fly', to: P(-54.3, 31.8), dur: 1.6, pose: 'a4HoverGuard', ease: 'outQuad' },
      { t: 6.3, who: 'sukuna', do: 'fly', to: P(-57.4, 32), dur: 1.5, pose: 'guard', ease: 'outQuad' },
      { t: 6.3, who: 'maho', do: 'fly', to: [-55.8, FY + 0.2, 31.2], dur: 1.6, pose: 'maho_punchA', ease: 'outQuad' },
      { t: 4.4, sfx: 'block', vol: 0.5 }, { t: 6.6, sfx: 'windGust', vol: 0.35, dur: 2.5 },
      // ---- 9.2–12.4: at height, from the east down the street: the face on the left, the drop to the right. Mahoraga,
      //      on the wall, punches him out over the street; Sukuna springs off the glass after him — a head kick
      { t: 9.2, shot: 'static', cam: { x: -35.5, y: 112.2, z: 31.2, yaw: -1.64, pitch: 0.02, f: 340, shift: 16 } },
      { t: 9.2, who: 'gojo', do: 'place', at: KO, face: 'south', pose: 'a4HoverGuard' },
      { t: 9.2, who: 'maho', do: 'place', at: [-54.6, FY - 0.1, 31.2], face: 'north', pose: 'maho_idle' },
      { t: 9.2, who: 'sukuna', do: 'place', at: [-57.2, FY, 32.2], face: 'east', pose: 'guard' },
      { t: 9.2, who: 'agito', do: 'place', at: Q(-53.4, 30.2), face: 'south', pose: 'ag_idle' },
      { t: 9.5, who: 'maho', do: 'mahoPunch', target: 'gojo', hit: 'hit', strength: 3, react: 'hitHigh', knock: 1.1, space: false, impact: false, hitstop: 6 },
      { t: 9.5, who: 'gojo', do: 'expr', face: 'grit', eyes: 'closed' },
      { t: 10.3, who: 'gojo', do: 'launch', vel: [0.2, 3.6, 0.2], g: 1.5, dur: 0.8, pose: 'hitHigh', ground: false },
      { t: 10.2, who: 'sukuna', do: 'fly', to: [-54.4, 107.0, 32.6], dur: 0.5, pose: 'flyKick', ease: 'inQuad' },
      { t: 10.72, who: 'sukuna', do: 'round', target: 'gojo', hit: 'hit', strength: 3, react: false, space: false, impact: 1, impactMode: 'invert', hitstop: 7 },
      { t: 10.72, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'glare', eyes2: 'open' },
      { t: 11.05, kana: 'ガッ', x: 270, y: 110, size: 3, dur: 0.6, style: 'impact' },
      { t: 11.3, who: 'gojo', do: 'launch', vel: [0.4, 2.8, 0.1], g: 1.2, dur: 1.0, spin: 7, pose: 'tumble', ground: false },
      { t: 11.3, sfx: 'whooshL', vol: 0.5 },
      // ---- 12.4–16.4: Agito leaps the street at his back — an electrified punch — stopped dead: the Infinity is back up
      { t: 12.4, shot: 'static', cam: { x: -41.5, y: 110.6, z: 32.0, yaw: -1.62, pitch: 0.0, f: 400, shift: 26 } },
      { t: 12.4, who: 'gojo', do: 'place', at: [HOLD[0], HOLD[1] - 0.4, HOLD[2] - 0.2], face: 'south', pose: 'hitHigh' },
      { t: 12.4, who: 'gojo', do: 'float', to: HOLD, dur: 0.8, pose: 'a4HoverGuard', ease: 'outCubic', bob: 0.03 },
      { t: 12.4, who: 'sukuna', do: 'hide' }, { t: 12.4, who: 'maho', do: 'hide' },
      { t: 12.4, who: 'agito', do: 'place', at: Q(-53.6, 30.4), face: 'south', pose: 'ag_crouch' },
      { t: 12.5, who: 'agito', do: 'expr', spark: 1 },
      { t: 12.45, who: 'agito', do: 'fly', to: [HOLD[0], HOLD[1] + 4.2, HOLD[2] - 0.3], dur: 0.35, pose: 'ag_pounce', ease: 'outQuad' },
      { t: 12.55, fx: 'a4crackle', at: 'agito.hand', r: 0.6, n: 6, dur: 1.6, glow: false },
      { t: 12.55, sfx: 'agitoSpark', vol: 0.9 },
      { t: 12.82, who: 'agito', do: 'agitoPunch', target: 'gojo', hit: 'infinity', strength: 3, gap: 0.3, hitSfx: 'infinityStop', trauma: 0.4 },
      { t: 13.32, kana: 'キィン', x: 380, y: 92, size: 3, dur: 1.0, style: 'ring' },
      { t: 13.32, fx: 'infinityAura', who: 'gojo', intensity: 1, dur: 10.6 },
      { t: 13.32, fx: 'a4crackle', at: [HOLD[0], HOLD[1] + 0.9, HOLD[2] + 1.1], r: 0.9, n: 7, col: [C.white, C.ice, C.sky], dur: 2.4, glow: false, seed: 23 },
      { t: 13.32, sfx: 'sparkPop', vol: 0.7 }, { t: 13.8, sfx: 'sparkPop', vol: 0.4 },
      { t: 13.32, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'glow' },
      { t: 14.1, who: 'agito', do: 'place', at: [HOLD[0], HOLD[1] + 1.55, HOLD[2] - 0.25], face: 'south', pose: 'ag_punch' },
      // ---- 16.4–20.4: close: held in the air, he turns his head to look back at Agito — the Six Eyes, a small smile
      { t: 16.4, shot: 'closeup', who: 'gojoB', yaw: -1.62, dist: 6, f: 820, bust: { expr: 'calm', eyes: 'glow', look: [0.8, 0] }, size: 214, bg: 'haze', haze: C.lilacgrey, dim: 0.5 },
      { t: 18.2, shot: 'closeup', who: 'gojoB', yaw: -1.62, dist: 6, f: 820, bust: { expr: 'smile', eyes: 'glow', look: [0.9, 0] }, size: 214, bg: 'haze', haze: C.lilacgrey, dim: 0.5 },
      { t: 16.4, sfx: 'infinityHum', vol: 0.4, dur: 7 },
      // ---- 20.4–24: the held breath: 32 m above the street, Agito's fist a hand's breadth from his back, crackling
      { t: 20.4, shot: 'static', cam: { x: -44.5, y: 118.5, z: 36.5, yaw: -2.1, pitch: -0.28, f: 360 }, to: { x: -45.2, y: 118.2 }, dur: 3.6, ease: 'linear' },
      { t: 20.4, fx: 'a4crackle', at: [HOLD[0], HOLD[1] + 0.9, HOLD[2] + 1.1], r: 0.8, n: 5, col: [C.white, C.ice, C.sky], dur: 3.6, glow: false, seed: 31 },
      { t: 20.6, sfx: 'windGust', vol: 0.3, dur: 3 },
    ],
  });
})();
