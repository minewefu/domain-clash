/* ACT IV · 3 — a4_palms (18 s). Canon ch. 233: Gojo, smiling, tears free of the ink and pummels Mahoraga's face —
   a right, a left, then a double-palm strike that sends the giant crashing back down the avenue (three beats, then the
   held breath). His output has fallen; he recites the incantation of Red to restore it (glyph rings, a red point at his
   fingertip). Behind him, unseen, Sukuna sinks into his own shadow — and two red eyes open in Gojo's. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = A.START_G, S0 = A.START_S;
  const M = [G[0] - 1.35, G[1] + 0.35, 0];                      // where a4_shadow left the giant: right behind him
  const GF = [G[0] - 0.15, G[1], 0];                             // Gojo after the combo (faces west, toward Mahoraga)
  const SK = [S0[0] + 0.6, S0[1] + 0.4, 0];                      // Sukuna, recovering, a few metres east
  const ENV = A.ENV;
  HT.fightScene({
    id: 'a4_palms', act: 'IV', title: 'Right, Left, Both Palms', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'a4KneelUp', costume: 'fight' },
      maho: { char: 'mahoraga', at: M, face: 'east', pose: 'maho_look' },
      sukuna: { char: 'sukuna', at: SK, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 0, fx: 'shadowPool', at: [G[0] - 0.4, G[1] + 0.2, 0], r: 2.3, grow: 0.01, out: 0.3, tendrils: 9, dur: 2.2, sfx: false },
      { t: 0, fx: 'a4ink', who: 'gojo', h: 0.3, grow: 0.01, dur: 2.0 },
      // ---- 0–2: side medium: on his knees, smiling; the giant raises its sword again (hold)
      { t: 0, shot: 'static', cam: { x: G[0] - 0.5, y: G[1] - 7.2, z: 1.5, yaw: 0.02, f: 400, shift: 36 } },
      { t: 0.7, who: 'maho', do: 'pose', pose: 'maho_slashA', dur: 0.7 },
      { t: 0.8, sfx: 'swordRing', vol: 0.35 },
      // ---- 2.0: he tears free of the ink, turns and rises to its face — right, left, both palms
      { t: 1.95, fx: 'dust', at: [G[0], G[1], 0.1], n: 8, r: 1.4, size: 0.3, col: 'dark', dur: 0.9 },
      { t: 1.95, fx: 'debris', at: [G[0], G[1], 0.1], n: 10, speed: 5, size: 0.18, up: 0.9, mat: 'asphalt', dur: 1.0 },
      { t: 1.95, sfx: 'whooshM', vol: 0.6 },
      { t: 1.95, who: 'gojo', do: 'face', face: 'west' },
      { t: 1.95, who: 'gojo', do: 'float', to: [G[0] - 0.1, G[1], 1.3], dur: 0.25, pose: 'a4HoverGuard', ease: 'outCubic', bob: 0 },
      { t: 1.95, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 2.0, shot: 'static', cam: { x: G[0] - 1.2, y: G[1] - 6.6, z: 2.0, yaw: -0.02, f: 440, shift: 10 } },
      { t: 2.25, who: 'gojo', do: 'cross', target: 'maho', hit: 'hit', strength: 2, react: 'mahoHit', knock: 0.5, speed: 1.3 },
      { t: 2.46, kana: 'バキ', x: 250, y: 96, size: 3, dur: 0.6, style: 'impact' },
      { t: 2.72, who: 'gojo', do: 'hook', target: 'maho', hit: 'hit', strength: 2, react: 'mahoHit', knock: 0.5, speed: 1.3 },
      { t: 3.22, who: 'gojo', do: 'a4DoublePalm', target: 'maho', hit: 'hit', strength: 3, react: 'mahoStagger', knock: 2.5, impact: 1, hitstop: 7 },
      { t: 3.52, fx: 'shockwave', at: [G[0] - 1.1, G[1], 1.8], r: 7, strength: 2, dur: 0.8, sfx: false },
      { t: 3.52, kana: 'ドン', x: 170, y: 120, size: 4, dur: 0.9, style: 'impact' },
      { t: 3.52, sfx: 'hitHuge', vol: 0.8 },
      // ---- 3.8–7: wide: the giant skids back down the avenue on its heels, ploughing the asphalt, and drops to one knee
      { t: 3.75, shot: 'static', cam: { x: G[0] - 5.5, y: G[1] - 15, z: 2.4, yaw: -0.08, f: 360, shift: 30 } },
      { t: 3.75, fx: 'dust', at: [G[0] - 3.2, G[1] + 0.35, 0.2], n: 14, r: 2.6, size: 0.7, col: 'concrete', dir: [-1, 0, 0], dur: 2.6 },
      { t: 3.85, fx: 'debris', at: [G[0] - 3.5, G[1] + 0.35, 0.1], n: 16, speed: 7, size: 0.3, dir: [-1, 0, 0.4], spread: 0.6, mat: 'asphalt', dur: 1.4 },
      { t: 4.1, fx: 'dust', at: [G[0] - 5.4, G[1] + 0.35, 0.2], n: 10, r: 2.2, size: 0.8, col: 'concrete', dur: 3 },
      { t: 3.6, sfx: 'heelSkid', vol: 0.8, dur: 1.5 }, { t: 4.0, sfx: 'groundSlam', vol: 0.4 },   // audio (M4): the giant skids back on its heels (was groundSlam 0.55 + rubble)
      { t: 4.3, who: 'gojo', do: 'float', to: [GF[0], GF[1], 0], dur: 0.55, pose: 'loose', ease: 'inOutSine', bob: 0 },
      { t: 4.9, sfx: 'footConcrete', vol: 0.3 },
      // ---- 7–9: low wide from the west, past the kneeling giant: Gojo stands, breath steaming; Sukuna behind him
      { t: 7.0, shot: 'static', cam: { x: G[0] - 1.2, y: G[1] - 12.5, z: 1.5, yaw: 0.02, f: 330, shift: 34 } },
      { t: 7.0, fx: 'smoke', at: [GF[0] - 0.2, GF[1] - 0.05, 1.78], rate: 1.1, life: 1.2, rise: 0.25, size: 0.06, grow: 3, dark: false, wind: 0.3, dur: 11, sfx: false },
      { t: 7.6, who: 'sukuna', do: 'pose', pose: 'guard', dur: 0.5 },
      // ---- 9–11.6: the incantation of Red: two fingers raised, eyes closed; glyph rings open round him
      { t: 9.0, who: 'gojo', do: 'pose', pose: 'a4Chant', dur: 0.45 },
      { t: 9.0, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      { t: 9.0, shot: 'static', cam: { x: GF[0] - 4.2, y: GF[1] - 1.9, z: 0.55, yaw: 1.14, pitch: 0.26, f: 380 }, to: { x: GF[0] - 3.6, y: GF[1] - 1.6 }, dur: 2.6, ease: 'linear' },
      { t: 9.35, fx: 'glyphRings', at: 'gojo.chest', r: 1.25, rings: 3, stagger: 0.55, col: C.wine, dur: 8.65, sfx: false },
      { t: 9.35, sfx: 'infinityHum', vol: 0.45, dur: 8.4 }, { t: 9.4, sfx: 'sixEyes', vol: 0.25 },
      { t: 13.2, fx: 'redOrb', at: 'gojo.hand', r: 0.035, charge: 4.8, dur: 4.8, sfx: false },
      // ---- 11.6–13.8: wide from behind Gojo's back (south-east): the kneeling giant rising — and, behind Gojo,
      //      Sukuna melting into his own shadow while Gojo's eyes are closed
      { t: 11.6, shot: 'static', cam: { x: GF[0] + 6.0, y: GF[1] - 7.5, z: 1.8, yaw: -0.52, f: 360, shift: 30 } },
      { t: 11.6, who: 'maho', do: 'pose', pose: 'maho_kneel', dur: 0.01 },
      { t: 12.2, fx: 'shadowPool', at: [SK[0], SK[1], 0], r: 1.3, grow: 0.3, out: 0.4, tendrils: 7, dur: 1.8, sfx: false },
      { t: 12.3, who: 'sukuna', do: 'hide' },
      { t: 12.3, fx: 'a4emerge', char: 'sukuna', at: SK, face: 'west', pose: 'crouch', z: [[0, 0], [0.8, -1.9]], costume: 'fight', dur: 0.85, lipW: 0.28 },
      { t: 12.3, sfx: 'shadowRise', vol: 0.4 },
      { t: 12.9, who: 'maho', do: 'pose', pose: 'maho_look', dur: 1.1, ease: 'inOutSine' },
      // ---- 13.8–15.6: close: the rings turn, the red point swells at his fingertip; his lips move without a sound
      { t: 13.8, shot: 'medium', on: ['gojo'], size: 180, yaw: 1.25, lead: 30, height: 1.5, feetY: 352, f: 520 },
      { t: 14.6, who: 'gojo', do: 'expr', face: 'open', eyes: 'closed' }, { t: 14.9, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      { t: 15.2, who: 'gojo', do: 'expr', face: 'open', eyes: 'closed' }, { t: 15.45, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      // ---- 15.6–18: at his feet: his own shadow on the asphalt — it deepens; two pairs of red eyes open in it
      { t: 15.6, shot: 'static', cam: { x: GF[0] + 0.6, y: GF[1] - 3.2, z: 1.3, yaw: -0.12, pitch: -0.55, f: 360 } },
      { t: 15.7, fx: 'shadowPool', at: [GF[0] + 0.55, GF[1] - 0.35, 0], r: 0.9, grow: 1.2, out: 0.2, tendrils: 5, wisps: false, dur: 2.3, sfx: false },
      { t: 16.6, fx: 'a4eyes', at: [GF[0] + 0.62, GF[1] - 0.5, 0.01], open: 0.3, w: 0.2, dur: 1.4 },
      { t: 16.6, sfx: 'heartbeat', vol: 0.35 },
    ],
  });
})();
