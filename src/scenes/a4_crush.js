/* ACT IV · 11 — a4_crush (24 s). Canon ch. 234: Gojo turns in the air to face Agito, a sphere of Blue forming round his
   remaining fist, and jams it into Agito's core at maximum output: Agito implodes into a knot. He hurls the Blue down at
   Sukuna; Mahoraga yanks its master clear; the Blue tears on down the street — a trench ripped along the road — lifts
   off at its end and stops, hanging in the sky over the city (it waits there for Act V's Red). Silence. From the tower,
   the trench and the small blue star; in the street Sukuna looks up at it, uneasy for the first time. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const HOLD = [-53.4, 111.6, 31.6];                            // where a4_climb left Gojo (Agito's punch stopped at his back)
  const AGP = [-53.4, 113.15, 31.35];                           // Agito, fist on the Infinity
  const TR = A.TRENCH, BLUE = A.BLUE;
  const SK0 = [-43.5, 110.4, 0], MA0 = [-39.5, 114.6, 0], SAFE = [-36.5, 118.4, 0];
  const RUN0 = 4.85, RUN = 2.35, LIFT = 3.0;                    // the run along the street, then the climb into the sky
  const ENV = A.ENV;
  // the wake: bursts of road along the run (debris walls, dust), timed to the Blue's passage
  const wake = [];
  for (let k = 0; k <= 10; k++) {
    const u = k / 10, x = TR.x0 + (TR.x1 - TR.x0) * u, t = RUN0 + RUN * u;
    wake.push({ t, fx: 'debris', at: [x, TR.y0, 0.2], n: 14, speed: 9, size: 0.45, up: 1.5, spread: 0.9, mat: 'asphalt', dur: 1.8, sfx: false });
    if (k % 2 === 0) wake.push({ t: t + 0.05, fx: 'dust', at: [x, TR.y0, 0.6], n: 10, r: 5, size: 1.4, rise: 1.4, col: 'concrete', dur: 4.2, sfx: false });
  }
  HT.fightScene({
    id: 'a4_crush', act: 'IV', title: 'Blue, Maximum Output', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    cast: {
      gojo: { char: 'gojo1', at: HOLD, face: 'south', pose: 'a4HoverGuard', costume: 'fight' },
      agito: { char: 'agito', at: AGP, face: 'south', pose: 'ag_punch' },
      sukuna: { char: 'sukuna', at: SK0, face: 'north', pose: 'guard', costume: 'fight' },
      maho: { char: 'mahoraga', at: MA0, face: 'west', pose: 'maho_idle' },
      orb: { char: 'figure', at: AGP, face: 'south', pose: 'stand' },      // invisible carrier of the Blue
      sukB: { char: 'sukuna', at: SAFE, face: 'east', pose: 'loose', costume: 'fight' },   // bust helper
    },
    ambience: [{ name: 'wind', vol: 0.5 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, who: 'orb', do: 'hide' }, { t: 0, who: 'sukB', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 225, wheelGlow: 0.5 },
      { t: 0, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 0, who: 'agito', do: 'expr', spark: 0.8 },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 0, fx: 'infinityAura', who: 'gojo', intensity: 0.8, dur: 3.6 },
      { t: 0, fx: 'a4crackle', at: [AGP[0], AGP[1] - 0.6, AGP[2] + 1.2], r: 0.7, n: 5, dur: 3.4, glow: false },
      // ---- 0–2.5: from his left, in the air: he turns to face Agito; a sphere of Blue forms round his remaining fist
      { t: 0, shot: 'static', cam: { x: HOLD[0] - 6.2, y: HOLD[1] + 0.6, z: HOLD[2] + 0.6, yaw: Math.PI / 2 - 0.02, f: 420, shift: 20 } },
      { t: 0.5, who: 'gojo', do: 'face', face: 'north' },
      { t: 0.5, who: 'gojo', do: 'pose', pose: 'a4BlueFistA', dur: 0.35 },
      { t: 0.9, fx: 'blueOrb', at: 'gojo.hand', r: 0.11, grow: 0.9, pull: 0.45, debris: 4, end: 'none', dur: 2.9, sfx: false },
      { t: 3.69, sfx: 'blueCharge', vol: 0.8, dur: 2.79 },   // audio (M4): lands on the implosion (was t 0.9 d2.5: built before the orb)
      { t: 0.9, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      // ---- 2.5–3.4: the fist, close: the air bending into it
      { t: 2.5, shot: 'static', cam: { x: HOLD[0] - 3.4, y: HOLD[1] + 1.1, z: HOLD[2] + 1.45, yaw: Math.PI / 2 - 0.1, f: 560, shift: 0 } },
      // ---- 3.4: he drives it into Agito's core at maximum output — Agito folds into itself
      { t: 3.4, shot: 'static', cam: { x: HOLD[0] - 7.5, y: HOLD[1] + 1.2, z: HOLD[2] + 1.0, yaw: Math.PI / 2 - 0.02, f: 400, shift: 22 } },
      { t: 3.42, who: 'gojo', do: 'a4BlueFist', target: 'agito', hit: 'hit', strength: 3, react: 'agitoCrush', hitstop: 8, impact: 2, impactMode: '2tone', hitSfx: false, fxHit: false, space: false },
      { t: 3.69, fx: 'blueOrb', at: [AGP[0], AGP[1], AGP[2] + 1.4], r: 0.95, grow: 0.12, pull: 1.4, debris: 18, crush: true, end: 'none', dur: 0.62, sfx: false },
      { t: 3.69, fx: 'a4agitoBall', at: [AGP[0], AGP[1], AGP[2] + 1.4], r0: 1.4, r1: 0.35, crush: 0.5, dur: 0.66 },
      { t: 3.69, sfx: 'blueImplode', vol: 1 }, { t: 3.69, sfx: 'subDrop', vol: 0.8 }, { t: 3.69, sfx: 'hitHuge', vol: 0.7 },
      { t: 3.69, kana: 'ギュン', x: 230, y: 112, size: 4, dur: 0.9, style: 'impact' },
      { t: 3.69, shake: 1.0 },
      { t: 3.95, who: 'agito', do: 'hide' },
      { t: 3.69, who: 'orb', do: 'place', at: [AGP[0], AGP[1], AGP[2] + 1.4] },
      // ---- 4.3–5.2: high over the street: the Blue hurled down at Sukuna — Mahoraga yanks him clear
      { t: 4.3, shot: 'static', cam: { x: -22.5, y: 126, z: 14, yaw: -2.18, pitch: -0.22, f: 300 } },
      { t: 4.3, who: 'orb', do: 'fly', to: [TR.x0, TR.y0, 1.6], dur: RUN0 - 4.3, ease: 'inQuad' },
      { t: 4.3, fx: 'blueOrb', at: 'orb', r: 1.05, grow: 0.05, pull: 1.25, debris: 30, end: 'none', dur: RUN0 + RUN + LIFT - 4.3, sfx: false },
      { t: 4.3, fx: 'a4agitoBall', at: 'orb', r0: 0.35, r1: 0.12, crush: 1.2, dur: 1.4 },
      { t: 4.3, sfx: 'whooshL', vol: 0.8 },
      { t: 4.45, who: 'maho', do: 'fly', to: [SK0[0] + 0.9, SK0[1] + 1.0, 0], dur: 0.2, pose: 'a4maho_catch', ease: 'outQuad' },
      { t: 4.65, who: 'maho', do: 'fly', to: [SAFE[0] - 0.8, SAFE[1] + 0.3, 0], dur: 0.45, pose: 'a4maho_catch', ease: 'outQuad' },
      { t: 4.65, who: 'sukuna', do: 'fly', to: SAFE, dur: 0.45, pose: 'hitHigh', ease: 'outQuad' },
      { t: 4.65, sfx: 'whooshM', vol: 0.6 },
      // ---- 5.2–7.4: down the street from its east end: the Blue comes straight at us, the road bursting open behind it
      { t: 5.2, shot: 'static', cam: { x: TR.x1 + 7, y: TR.y0 + 2.2, z: 2.4, yaw: -Math.PI / 2 - 0.03, pitch: 0.04, f: 360 } },
      { t: RUN0, who: 'orb', do: 'fly', to: [TR.x1, TR.y0, 1.8], dur: RUN, ease: 'linear' },
      { t: RUN0, damage: { kind: 'canyon', x0: TR.x0, y0: TR.y0, x1: TR.x1, y1: TR.y1, w: TR.w, depth: TR.depth, dur: RUN, floor: 'rubble' } },
      ...wake,
      { t: RUN0, sfx: 'rumble', vol: 1, dur: RUN + 0.6 }, { t: RUN0, sfx: 'quake', vol: 0.7, dur: RUN }, { t: RUN0 + 0.3, sfx: 'glassShatter', vol: 0.5 },
      { t: RUN0, shake: 0.5 }, { t: RUN0 + 1.2, shake: 0.6 }, { t: RUN0 + RUN - 0.2, shake: 0.8 },
      // ---- 7.4–10.6: it lifts off the end of the street and climbs into the sky — and stops. Silence.
      { t: 7.4, shot: 'static', cam: { x: 120, y: 200, z: 60, yaw: -2.36, pitch: 0, f: 200 } }, // high to the north-east: the whole climb from the trench's east end to where it hangs (the Blue's rest is Act V's (−40, 60, 160))
      { t: RUN0 + RUN, who: 'orb', do: 'fly', to: BLUE, dur: LIFT, ease: 'outCubic' },
      { t: RUN0 + RUN, sfx: 'whooshL', vol: 0.6 },
      { t: RUN0 + RUN + LIFT, fx: 'a4blueStar', at: BLUE, r: 1.1, dur: 24 - (RUN0 + RUN + LIFT) },
      { t: 7.4, amb: 'wind', vol: 0.25, fade: 1.5 },
      // ---- 10.6–16.4: from above the tower: the trench down the street, the dust settling, the small blue star hanging
      //      over the city; Gojo in the foreground, one-armed, breathing
      { t: 10.6, shot: 'static', cam: { x: -37.5, y: 130, z: 68, yaw: Math.PI, pitch: 0.6, f: 230 } }, // behind and just below him: up past him to the star beside b275's crown
      { t: 10.6, who: 'gojo', do: 'place', at: [-35, 118, 70], face: 'south', pose: 'a4HoverGuard' }, // risen to watch it
      { t: 10.6, who: 'gojo', do: 'expr', face: 'open', eyes: 'glow' },
      { t: 10.6, fx: 'smoke', at: 'gojo.head', rate: 1.4, life: 1.2, rise: 0.25, size: 0.06, grow: 3, dark: false, wind: 0.3, dur: 5.8, sfx: false },
      { t: 10.7, sfx: 'windGust', vol: 0.3, dur: 4 },
      // ---- 16.4–20.4: in the street, pulled clear by his shikigami, Sukuna looks up at the hanging Blue — uneasy
      { t: 16.4, shot: 'closeup', who: 'sukB', yaw: -2.5, dist: 6, f: 820, bust: { expr: 'serious', eyes: 'narrow', eyes2: 'open', nod: -12, look: [0.2, -0.8] }, size: 208, bg: 'haze', haze: C.shadow, dim: 0.4 },
      { t: 18.4, shot: 'closeup', who: 'sukB', yaw: -2.5, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'narrow', eyes2: 'open', nod: -12, look: [0.2, -0.8] }, size: 208, bg: 'haze', haze: C.shadow, dim: 0.4 },
      { t: 16.4, who: 'sukuna', do: 'hide' }, { t: 20.4, who: 'sukuna', do: 'show' },
      { t: 16.5, sfx: 'heartbeat', vol: 0.3 },
      // ---- 20.4–24: low in the street: the giant and its master before the trench, both looking up at the Blue (M4:
      //      it now hangs at Act V's (−40, 60, 160) — from here nearly overhead, so the star itself stays off frame)
      { t: 20.4, shot: 'static', cam: { x: -47.5, y: 111.5, z: 1.0, yaw: 1.1, pitch: 0.45, f: 300 } },
      { t: 20.4, who: 'sukuna', do: 'place', at: SAFE, face: 'south', pose: 'a4LookSky' }, // the Blue hangs high to the south (off frame: from the street it is nearly overhead)
      { t: 20.4, who: 'maho', do: 'place', at: [SAFE[0] - 1.5, SAFE[1] + 0.8, 0], face: 'south', pose: 'maho_look' },
    ],
  });
})();
