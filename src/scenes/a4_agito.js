/* ACT IV · 6 — a4_agito (20 s). Canon ch. 233: back on the streets (the NS avenue north of the junction, the 129 m glass
   tower standing intact beyond the wasteland). "It's three against one": Sukuna summons Merged Beast Agito out of his
   shadow — the three-shot, the King small between two giants (Gojo's taunt about a little lost alien child is his grin;
   Sukuna smirks). They rush him; Gojo gives ground; Sukuna rises from Gojo's own shadow and fires the water beam — a sway;
   a downward punch at the shadow, Sukuna backflips clear; the shikigami close in; Gojo slips round the giant and fires
   Red into its head point-blank — it barely turns its head. The adaptation is gradual: only one blow can end this. He
   looks up at the sky: Purple. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const HOLE = [-14, 84, 1.8];                                  // where they burst out of the wasteland stump (b276's east face)
  const G0 = [3.5, 84, 0], S1 = [-8.5, 84, 0], M1 = [-9.6, 86.9, 0], AG1 = [-9.4, 81.1, 0];
  const G2 = [8.6, 84, 0], SK2 = [10.5, 84.5, 0];               // Gojo gives ground; Sukuna surfaces behind him
  const B276 = HT.city.byId.b276;
  const ENV = A.ENV;
  HT.fightScene({
    id: 'a4_agito', act: 'IV', title: 'Three Against One', dur: 20, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo', at: [HOLE[0] + 1, HOLE[1], 1.2], face: 'west', pose: 'hitFly', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [HOLE[0] - 0.6, HOLE[1], 0], face: 'east', pose: 'walkOut', costume: 'fight' },
      maho: { char: 'mahoraga', at: [HOLE[0] - 0.8, HOLE[1] + 2.4, 0], face: 'east', pose: 'maho_idle' },
      agito: { char: 'agito', at: AG1, face: 'east', pose: 'ag_crouch' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.25 }],
    script: [
      { t: 0, who: 'agito', do: 'hide' }, { t: 0, who: 'sukuna', do: 'hide' }, { t: 0, who: 'maho', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.3 },
      { t: 0, who: 'gojo', do: 'expr', face: 'grit', eyes: 'narrow' },
      // ---- 0–1.2: the stump's face bursts outward and Gojo shoots out through it (close, from the south-east)
      { t: 0, shot: 'static', cam: { x: -4.2, y: 75.8, z: 1.3, yaw: -0.9, f: 340, shift: 26 } },
      { t: 0.25, damage: { kind: 'hole', b: 'b276', face: 'e', u: HOLE[1] - (B276 ? B276.y0 : 61) - 1.2, v: 1.9, r: 2.3 } },
      { t: 0.25, fx: 'glass', at: HOLE, n: 30, speed: 6, dir: [1, 0, 0.25] },
      { t: 0.25, fx: 'debris', at: HOLE, n: 18, speed: 8, size: 0.4, dir: [1, 0, 0.3], spread: 0.6 },
      { t: 0.25, fx: 'dust', at: HOLE, n: 14, r: 2.6, size: 1.0, dir: [1, 0, 0], col: 'concrete', dur: 3 },
      { t: 0.25, sfx: 'wallCrash', vol: 0.9 }, { t: 0.3, sfx: 'glassShatter', vol: 0.6 },
      { t: 0.25, shake: 0.4 },
      { t: 0.25, who: 'gojo', do: 'fly', to: [G0[0], G0[1], 0], dur: 0.55, pose: 'hitFly', ease: 'outQuad' },
      { t: 0.8, who: 'gojo', do: 'land' },
      // ---- 1.2–2.4: the reverse: he skids to a stop on the avenue, facing the smoking hole
      { t: 1.2, shot: 'static', cam: { x: G0[0] + 4.2, y: G0[1] - 5.6, z: 1.2, yaw: -0.62, f: 380, shift: 34 } },
      { t: 0.8, fx: 'dust', at: G0, n: 8, r: 1.5, size: 0.5, col: 'concrete', dir: [1, 0, 0], dur: 1.6 },
      { t: 0.8, sfx: 'footConcrete', vol: 0.5 },
      { t: 1.0, fx: 'rctGlow', at: 'gojo.hand2', r: 0.12, dur: 1.6, steam: true, vol: 0.35 },   // healing the arm the water beam cut
      // ---- 2.4–4.8: out of the dust Sukuna and Mahoraga step onto the avenue; Sukuna's shadow spreads — Agito rises from it
      { t: 2.4, shot: 'static', cam: { x: 3.8, y: 77.5, z: 1.6, yaw: -1.2, f: 360, shift: 30 } },
      { t: 2.4, who: 'sukuna', do: 'show' }, { t: 2.4, who: 'maho', do: 'show' },
      { t: 2.4, who: 'sukuna', do: 'walk', to: S1, speed: 2.4 },
      { t: 2.4, who: 'maho', do: 'walk', to: M1, speed: 2.2 },
      { t: 2.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 2.5, sfx: 'mahoStep', vol: 0.5 }, { t: 3.4, sfx: 'mahoStep', vol: 0.5 },
      { t: 3.3, who: 'sukuna', do: 'pose', pose: 'beckon', dur: 0.3 },
      { t: 3.3, fx: 'shadowPool', at: [AG1[0], AG1[1], 0], r: 2.0, grow: 0.4, out: 0.4, tendrils: 8, dur: 2.0 },
      { t: 3.5, fx: 'a4emerge', char: 'agito', at: AG1, face: 'east', poses: [[0, 'ag_crouch'], [0.8, 'ag_crouch'], [1.25, 'ag_idle']], z: [[0, -3.0], [1.1, 0]], opts: { spark: 0.3 }, dur: 1.3, lipW: 0.3 },
      { t: 3.6, fx: 'a4crackle', at: [AG1[0] + 0.4, AG1[1], 2.2], r: 0.9, n: 6, dur: 1.2, glow: false },
      { t: 3.6, sfx: 'agitoSpark', vol: 0.8 },
      { t: 4.8, who: 'agito', do: 'show' },
      // ---- 4.8–8.0: the three-shot (held): the King small between two giants, all three facing Gojo; the tower beyond
      { t: 4.8, shot: 'static', cam: { x: -2.9, y: 84.0, z: 0.8, yaw: -Math.PI / 2, f: 300, shift: 58 } },
      { t: 4.8, who: 'sukuna', do: 'place', at: S1, face: 'east', pose: 'frontGrin' }, { t: 4.8, who: 'sukuna', do: 'view', view: 'front' },
      { t: 4.8, who: 'maho', do: 'place', at: M1, face: 'east', pose: 'maho_idleFront' }, { t: 4.8, who: 'maho', do: 'view', view: 'front' },
      { t: 4.8, who: 'agito', do: 'place', at: AG1, face: 'east', pose: 'ag_idleFront' }, { t: 4.8, who: 'agito', do: 'view', view: 'front' },
      { t: 4.8, who: 'gojo', do: 'place', at: G0, face: 'west', pose: 'loose' },
      { t: 4.8, fx: 'a4crackle', at: 'agito.chest', r: 0.6, n: 3, dur: 3.2, glow: false },
      { t: 4.8, who: 'agito', do: 'expr', spark: 0.12 },
      { t: 5.0, sfx: 'agitoSpark', vol: 0.35 },
      // ---- 8.0–9.3: Gojo's grin — a lost little alien between two minders
      { t: 8.0, shot: 'closeup', who: 'gojo', yaw: 1.25, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'glow' }, size: 212, bg: 'haze', haze: C.lilacgrey, dim: 0.4 },
      // ---- 9.3–10.0: Sukuna smirks at the remark
      { t: 9.3, shot: 'closeup', who: 'sukuna', yaw: -1.3, dist: 6, f: 800, bust: { expr: 'smirk', eyes: 'narrow', eyes2: 'open' }, size: 204, bg: 'haze', haze: C.lilacgrey, dim: 0.4 },
      { t: 9.3, who: 'maho', do: 'hide' }, { t: 9.3, who: 'agito', do: 'hide' }, { t: 10.0, who: 'maho', do: 'show' }, { t: 10.0, who: 'agito', do: 'show' },
      // ---- 10.0–14.3: the phrase — rush, give ground, the beam from his own shadow, the downward punch, Red point-blank
      { t: 10.0, shot: 'static', cam: { x: 5.6, y: 72.2, z: 1.8, yaw: 0.02, f: 330, shift: 30 } },
      { t: 12.0, shot: 'static', cam: { x: 10.4, y: 76.4, z: 1.5, yaw: 0.12, f: 340, shift: 32 } },
      { t: 10.0, who: 'sukuna', do: 'view', view: 'side' }, { t: 10.0, who: 'maho', do: 'view', view: 'side' }, { t: 10.0, who: 'agito', do: 'view', view: 'side' },
      { t: 10.0, who: 'sukuna', do: 'place', at: S1, face: 'east', pose: 'loose' },
      { t: 10.0, who: 'maho', do: 'mahoLeap', space: false, rootScale: 2.3 },
      { t: 10.05, who: 'agito', do: 'agitoPounce', space: false, rootScale: 2.55 },
      { t: 10.35, who: 'gojo', do: 'blink', to: G2, face: 'west' },
      { t: 10.35, sfx: 'blink', vol: 0.5 },
      { t: 10.5, who: 'sukuna', do: 'hide' },
      { t: 10.55, fx: 'shadowPool', at: SK2, r: 1.1, grow: 0.25, out: 0.3, tendrils: 5, dur: 1.4, sfx: false },
      { t: 10.6, fx: 'a4emerge', char: 'sukuna', at: SK2, face: 'west', pose: 'a4PbA', z: [[0, -1.8], [0.3, 0]], costume: 'fight', dur: 0.32, lipW: 0.22 },
      { t: 10.92, who: 'sukuna', do: 'place', at: SK2, face: 'west', pose: 'a4PbA' }, { t: 10.92, who: 'sukuna', do: 'show' },
      { t: 10.92, who: 'sukuna', do: 'a4PbFire' },
      { t: 11.22, fx: 'a4jet', from: 'sukuna.hand', to: [G2[0] - 6.5, G2[1] - 2.0, 9.4], charge: 0.5, hold: 0.35, splash: false, sfx: false },
      { t: 11.72, sfx: 'blueCharge', vol: 0.35, pitch: 1.4, dur: 0.8 }, { t: 11.72, sfx: 'waterJet', vol: 0.6 },   // audio (M4): the charge builds stance → fire (the jet's default built 10.0–11.2)
      { t: 11.66, who: 'gojo', do: 'pose', pose: 'recoil', dur: 0.1, ones: true },
      { t: 12.05, who: 'gojo', do: 'face', face: 'east' },
      { t: 12.05, who: 'gojo', do: 'a4PunchDown' },
      { t: 12.45, damage: { kind: 'crater', x: SK2[0] - 0.4, y: SK2[1] - 0.1, r: 2.3 } },
      { t: 12.45, fx: 'shockwave', at: [SK2[0] - 0.4, SK2[1] - 0.1, 0], r: 7, strength: 2, dur: 0.8, sfx: false },
      { t: 12.45, fx: 'debris', at: [SK2[0] - 0.4, SK2[1] - 0.1, 0.1], n: 18, speed: 8, size: 0.35, up: 1, mat: 'asphalt', dur: 1.6 },
      { t: 12.45, sfx: 'groundSlam', vol: 0.65 },   // audio (M4): was 0.8 (with the jet, louder than the Black Flashes)
      { t: 12.45, shake: 0.5 },
      { t: 12.45, kana: 'ドゴ', x: 420, y: 160, size: 3, dur: 0.6, style: 'impact' },
      { t: 12.3, who: 'sukuna', do: 'launch', vel: [6, 0.8, 6], g: 12, dur: 1.0, spin: -9, pose: 'tumble' },
      { t: 13.3, who: 'sukuna', do: 'land' },
      { t: 12.55, who: 'agito', do: 'fly', to: [G2[0] + 0.6, G2[1] - 2.0, 0], dur: 0.35, pose: 'a4ag_grab', ease: 'outQuad' },
      { t: 12.6, who: 'maho', do: 'fly', to: [G2[0] + 2.6, G2[1] + 1.6, 0], dur: 0.3, pose: 'maho_punchA', ease: 'outQuad' },
      { t: 12.9, who: 'maho', do: 'face', face: [-1, -0.45] },
      { t: 12.9, who: 'maho', do: 'mahoPunch', space: false, rootScale: 0.5 },
      { t: 13.15, who: 'gojo', do: 'blink', to: [G2[0] + 4.0, G2[1] + 2.6, 0], face: [-1, -0.5] },
      { t: 13.15, sfx: 'blink', vol: 0.5 },
      { t: 13.3, who: 'gojo', do: 'red', target: 'maho', hit: 'hit', strength: 2, react: 'mahoHit', knock: 0.25, space: false, hitSfx: false, fxHit: false },
      { t: 13.4, fx: 'redOrb', at: 'maho.head', dir: [-1, -0.4, 0], r: 0.4, charge: 0.3, range: 5, dur: 1.2, vol: 0.55, sfx: false },
      { t: 13.7, sfx: 'redCharge', vol: 0.55, dur: 0.4 },   // audio (M4): the orb's charge 13.4 → 13.7 (its default built 12.4–13.4)
      { t: 13.7, sfx: 'redBlast', vol: 0.5, lp: 1400 },   // audio (M4): muffled (SPEC §3.4)
      { t: 13.7, shake: 0.45 },
      // ---- 14.3–16.4: low: the smoke peels off the giant's head — barely a mark; it turns its head, slowly, toward him
      { t: 14.3, shot: 'static', cam: { x: G2[0] + 4.6, y: G2[1] - 3.4, z: 0.7, yaw: -0.3, pitch: 0.36, f: 360 } },
      { t: 13.75, fx: 'smoke', at: 'maho.head', rate: 5, life: 1.6, rise: 0.8, size: 0.35, grow: 2, dark: true, wind: 0.4, dur: 1.6, sfx: false },
      { t: 14.9, who: 'maho', do: 'pose', pose: 'maho_look', dur: 1.2, ease: 'inOutSine' },
      { t: 14.9, who: 'maho', do: 'face', face: [1, 0.6] },
      { t: 15.2, sfx: 'wheelTurn', vol: 0.18 },
      // ---- 16.4–18.6: Gojo, a few metres off, looks up past them at the heavy sky (low angle behind him)
      { t: 16.4, who: 'gojo', do: 'place', at: [G2[0] + 6.5, G2[1] + 4.4, 0], face: 'east', pose: 'a4LookSky' },
      { t: 16.4, who: 'maho', do: 'hide' }, { t: 16.4, who: 'agito', do: 'hide' }, { t: 16.4, who: 'sukuna', do: 'hide' },
      { t: 16.4, shot: 'closeup', who: 'gojo', yaw: -1.05, dist: 6, f: 760, shift: 70, bust: { expr: 'calm', eyes: 'glow', nod: -18 }, size: 200, bottom: 10, bg: 'grad', cols: [[0, C.shadow], [0.55, C.dusk], [1, C.lilacgrey]] },
      { t: 17.5, shot: 'closeup', who: 'gojo', yaw: -1.05, dist: 6, f: 760, shift: 70, bust: { expr: 'grin', eyes: 'glow', nod: -18 }, size: 200, bottom: 10, bg: 'grad', cols: [[0, C.shadow], [0.55, C.dusk], [1, C.lilacgrey]] },
      { t: 16.6, sfx: 'windGust', vol: 0.3, dur: 2.5 },
      // ---- 18.6–20: the eyes — a violet glint: Purple
      { t: 18.6, shot: 'ecu', who: 'gojo', yaw: 0.1 },
      { t: 18.6, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 19.0, fx: 'a4glint', x: 196, y: 176, col: C.violet, col2: C.lavender, arm: 7, dur: 0.7 },
      { t: 19.1, fx: 'a4glint', x: 440, y: 176, col: C.violet, col2: C.lavender, arm: 7, dur: 0.7 },
      { t: 19.0, sfx: 'purpleCharge', vol: 0.12 },
    ],
  });
})();
