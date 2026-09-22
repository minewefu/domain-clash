/* DOMAIN CLASH — Act IV extras (Adaptation, film 11:00–15:00): staging, the one-armed Gojo build, act poses/moves, FX.
   Loads after props.js and before manga/busts/fight; used only by src/scenes/a4_*.js (SPEC §3.4, canon ch. 232–235).

   HT.A4            world staging shared by the a4_* scenes (constants below) incl. BLUE, the Blue left hanging in the
                    sky after Agito's destruction (Act V fires Red into it)
   char 'gojo1'     Gojo after Mahoraga's flying slash (canon ch. 234): the 'gojo' build with the RIGHT arm's primitives
                    filtered out (sleeve and hand too — never a stump). The scenes keep that side away from the camera
                    (Gojo faces screen-left in side views, so the missing arm is the far one) — the loss is never shown.
   Poses (HT.onPoses)  (all a4-prefixed: act5_extra.js defines unprefixed FX of its own, e.g. waterBeam)
                    gojo: a4Pinned a4KneelPinned a4KneelHit a4KneelBow a4KneelUp a4DoublePalmA a4DoublePalm a4Chant
                    a4PointDown a4BlockBeam a4GripArm a4TearA a4Tear a4TossA a4Toss a4BlueFistA a4BlueFist a4RiseSky
                    a4LookSky a4PunchDownA a4PunchDown a4HoverGuard a4FlexA a4Flex · sukuna: a4KoStand a4PbA a4Pb
                    a4ThrowOA a4ThrowO · mahoraga: a4maho_grabUp a4maho_pullDown a4maho_catch · agito: a4ag_grab
   Moves            a4DoublePalm a4PbFire a4ThrowObj a4TossFoe a4BlueFist a4TearTail a4PunchDown a4MahoCatch
                    a4AgitoGrab (frame data @ 30 fps)
   FX a4emerge      a rig figure rising out of / sinking into a shadow pool, clipped at the ground line
                    {char, at [x,y,z] ground point, face ('east'|…|[dx,dy]), pose | poses [[age, name], …], z (m, number or
                    [[age, z], …] smooth keys: below ground < 0), opts (draw options e.g. {wheel:false}), costume, lip}
   FX a4arm         a Mahoraga arm reaching out of a shadow pool to grip a figure (procedural) {base, grip (ref), gripOff,
                    elbow, grow, retract, w, hand, curl, sink}
   FX a4ink         Ten Shadows ink wrapping a figure's legs {who, h (fraction of the height, 0.45), grow (0.4 s), n}
   FX a4infCut      the blade passing THROUGH the Infinity: the shimmer shell torn along the cut {at, angle (screen rad), r}
   FX a4ext         the thrown fire extinguisher (canon ch. 233): a tumbling red canister along an arc that bursts on the
                    Infinity {from, to, travel (0.55 s), lift (m)}
   FX a4powder      the white smokescreen {at, r (m), grow (0.5 s), n puffs, drift [vx, vy] m/s, rise, alpha, splitWho,
                    tunnel: {from, to, at (scene s), w (m)} — the water beam bores a clean tunnel through it}
   FX a4jet         Sukuna's imitation of Choso's Piercing Blood fired with Max Elephant's water {from (ref, follows the
                    palms), to (world), charge (0.5 s), hold (0.45 s), w (m)}
   FX a4flySlash    Mahoraga's long-range slash (canon ch. 234): a travelling crescent, then ONE hairline across the whole
                    frame along its path {from, to, travel (0.22 s), w (crescent width m)}
   FX a4blueStar    the Blue hanging in the sky (persists into Act V): a small dark-cored star with a lens shimmer,
                    depth-tested against the city (ray vs. building boxes) {at (default HT.A4.BLUE), r (m)}
   FX a4crackle     electric arcs around a point or figure {at | who (+ part 'chest'|'hand'…), r (m), n, col, glow}
   FX a4eyes        Sukuna's four red eyes opening in a shadow {at, open, w, look}
   FX a4pit         the black hole Red blasts into the street where the shadow was {at, r, open}
   FX a4glint       a screen-space sparkle (the Six Eyes' violet glint before Purple) {x, y, col, col2, arm}
   FX a4halt        gravel flung at Gojo and stopped dead by the Infinity {from, to, n, stop, spread, fly, hold, size}
   FX a4agitoBall   Agito imploding into a dark knot of feathers inside the max-output Blue {at, r0, r1, crush (s)}
   post a4monitor   the monitoring room's screen look over a shot (scanlines, rolling bar, bezel) {tint, k, bezel}
   Dev: ?a4sim=1 adds Act II's district damage (shred r 130 around (54, 11), the deck hole at (−100, 1.5)) when the
   timeline is reviewed without the Act II scenes (?acts=IV), so the Act IV sheets show the wreckage they sit in. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, rig = HT.rig;
  const FX = (HT.FX = HT.FX || {});
  const clamp = HT.clamp, lerp = HT.lerp, hash = HT.hash;
  const sin = Math.sin, cos = Math.cos, abs = Math.abs, min = Math.min, max = Math.max, hypot = Math.hypot;
  const floor = Math.floor, R = Math.round, PI = Math.PI, TAU = PI * 2, sqrt = Math.sqrt;
  const sat = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const h1 = (i, s) => hash(i, s), h2 = (i, s) => hash(i, s) * 2 - 1;
  const U = () => HT.fxu;                                   // fx.js raster helpers (clip-aware, exact-palette dither)

  // ================================================================== staging (world metres; x east, y north, z up)
  // Geography of the act (all inside the wreckage of Act II's Shrine, r 130 m around (54, 11), unless noted):
  //   A  the junction's west arm (EW avenue, y ≈ −3): where Act III leaves them; the viaduct's end (x −62) to the west,
  //      the crater of the fallen NE tower (b277) across the junction. Shadow, palms, rabbits.
  //   —  the corridor (set 'corridor', its own little world) — Red blasted Sukuna's hiding shadow through the street.
  //   B  the NS avenue north of the junction (x ≈ 0, y 60–100): the 129 m glass tower b275 stands intact at the edge of
  //      the wasteland 40 m to the west (x −71…−50, y 61…104). Agito, agito2, arm.
  //   C  b275's north face (y = 104; its east face is screened by the stump of b276): the climb and the crush (≈ 32 m up),
  //      the flying slash's gash high on its east face (z ≈ 40, above the stumps).
  //   D  the Blue's trench down the middle of the EW street at y = 112 (x −42 → 46), then the Blue lifts off and hangs.
  //   E  b334 (51 m glass, across that street at the NW corner of the (0, 112) intersection): Mahoraga is blasted through
  //      it (collapse).
  const A4 = (HT.A4 = {
    START_G: [-24.5, -3.2, 0], START_S: [-21.0, -3.2, 0], // a4_shadow: Gojo west of Sukuna, 3.5 m apart (after Act III's Black Flash)
    B_G: [2.0, 84, 0], B_S: [4.5, 100, 0],               // around the NS avenue north of the junction
    TOWER: 'b275', TOWER_BOX: [-71, 61, -50, 104, 129],  // the tall intact glass tower (east face x = −50)
    GASH: { y0: 71, y1: 86, z0: 38.4, z1: 41.4 },          // the flying slash's gash across b275's east face (a4_arm), above the stumps
    NFACE: 104,                                           // b275's north face (y = 104) opens onto the EW street at y = 112 (the climb)
    TRENCH: { x0: -42, y0: 112, x1: 46, y1: 112, w: 10, depth: 6 },  // the Blue's trench down the middle of that street
    BLUE: [-40, 60, 160],                                 // ← the Blue left hanging in the sky (Act V fires Red into it) — = HT.A5.BLUE (M4: Act V stages the Purple and the 250 m erasure around it)
    COLLAPSE: 'b334',
    // the monitoring room (set 'command'; origin = the monitor pillar): the watchers stand in an arc north of it
    ROOM: { kusakabe: [-1.7, 2.6], yuji: [-0.2, 2.3], yuta: [1.2, 2.5], hakari: [2.6, 3.1], kashimo: [-3.0, 3.3], maki: [0.6, 3.6] },
  });
  // setOpts.watchers from per-watcher options (positions from A4.ROOM): A4.watchers({ yuji: { pose: 'sit' }, … })
  A4.watchers = spec => Object.keys(A4.ROOM).filter(k => spec[k] !== false).map(k => Object.assign({ who: k, x: A4.ROOM[k][0], y: A4.ROOM[k][1], pose: 'stand' }, spec[k] || {}));

  // ================================================================== the act's light: 'overcastIV' (SPEC colour script: charcoal / slate / rust)
  // The shared 'overcast' preset (sets.js) has a pale mist sky and ungraded facades (saturated teal glass, orange
  // brick). Act IV needs the wreck under a heavy sky with Mahoraga's white and gold as the brightest things on screen:
  // a darker steel → dusk → shadow sky, walls graded toward charcoal-slate (teal → slate grey, brick → rust), almost no
  // lit windows, dirty snow. Additive preset (like sets_rooms' 'shrine'/'airport'); scenes use HT.A4.ENV.
  const rgbOf = hx => HT.rgb(hx);
  HT.ENVS.overcastIV = Object.assign({}, HT.ENVS.overcast || {}, {
    sky: [[0, C.steel], [0.1, C.lilacgrey], [0.34, C.dusk], [1, C.shadow]],
    fog: C.lilacgrey, fogNear: 24, fogFar: 560, fogMax: 0.82,
    grade: rgbOf(C.charcoal), gradeK: 0.36,
    lit: 0.015, skyline: C.dusk, amb: 0.64, snowCol: C.steel, ground: [0.94, 0.93, 0.97],
  });
  A4.ENV = { time: 'overcastIV', light: [-0.3, -0.6, 0.75], rim: C.mist, snow: 0.22, wind: 0.45 };  // light/rim = fight.js LIGHTS.overcast

  // ================================================================== dev: Act II's damage when the Act II scenes lack it
  const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  if (Q && Q.get('a4sim')) {
    HT.onTimeline = HT.onTimeline || [];
    HT.onTimeline.push(() => {
      const L = HT.ledger; if (!L || !HT.sceneStart) return;
      const T0 = HT.sceneStart('a4_shadow'); if (!isFinite(T0)) return;
      if (!L.entries.some(e => e.kind === 'shred' && isFinite(e.T0 === undefined ? 0 : e.T0))) L.add({ T: T0 - 200, kind: 'shred', x: 54, y: 11, r: 130 });
      if (!L.entries.some(e => e.kind === 'deckHole')) L.add({ T: T0 - 150, kind: 'deckHole', x: -100, y: 1.5, r: 2.4 });
      L.resolve();
    });
  }

  // ================================================================== 'gojo1': the right arm gone (never drawn, never a stump)
  (function defineOneArm() {
    const base = rig.CHARS.gojo; if (!base) return;
    const dseg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9, u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2, 0, 1); return hypot(p[0] - a[0] - dx * u, p[1] - a[1] - dy * u); };
    rig.define(Object.assign({}, base, { name: 'gojo1', build(T) {
      const view = T.P.view || 'side', face = T.face || 1;
      // the anatomical right arm: side view → the near arm when facing screen-right; front → the screen-left arm; back → screen-right
      const key = view === 'side' ? (face > 0 ? 'na' : 'fa') : view === 'front' ? (face > 0 ? 'fa' : 'na') : (face > 0 ? 'na' : 'fa');
      const J = T.J, chain = [J[key + 'S'], J[key + 'E'], J[key + 'W'], J[key + 'H']];
      if (!chain[0] || !chain[3]) { base.build(T); return; }
      const zs = view === 'side' ? (key === 'na' ? [13, 14] : [1, 2]) : (key === 'na' ? [13, 14] : [12, 13]);
      const r = (T.prop.limb || 0.03) * 2.7;
      const near = p => dseg(p, chain[0], chain[1]) < r || dseg(p, chain[1], chain[2]) < r || dseg(p, chain[2], chain[3]) < r * 1.3;
      const drop = (z, pts) => zs.indexOf(z) >= 0 && pts.every(near);
      base.build(Object.assign({}, T, {
        cap: (a, b, ra, rb, mat, z, dt, ft) => { if (!drop(z, [a, b])) T.cap(a, b, ra, rb, mat, z, dt, ft); },
        poly: (pts, mat, z, dt, ft, axis) => { if (!drop(z, pts)) T.poly(pts, mat, z, dt, ft, axis); },
        ell: (c, rx, ry, rot, mat, z, dt, ft) => { if (!drop(z, [c])) T.ell(c, rx, ry, rot, mat, z, dt, ft); },
        line: (a, b, mat, tone, z, w) => { if (!drop(z, [a, b])) T.line(a, b, mat, tone, z, w); },
        dot: (a, mat, tone, z, w, h) => { if (!drop(z, [a])) T.dot(a, mat, tone, z, w, h); },
      }));
    } }));
  })();

  // ================================================================== poses + moves (registered now: poses.js has run)
  HT.onPoses.push(function (rg) {
    const P = rg.POSES, M = rg.MOVES;
    const def = (name, o, base) => { P[name] = rg.full(Object.assign({}, base ? P[base] : {}, o)); return P[name]; };
    const mv = (name, o) => { o.name = name; o.len = o.keys[o.keys.length - 1][0]; M[name] = o; return o; };
    // ---- Gojo
    def('a4Pinned', { root: [0, -0.07], lean: -8, neck: 14, head: 10, twist: 0.3, na: [6, 28, 0], fa: [2, 32, 0], nl: [28, 56, 0], fl: [-8, 40, 0], nh: 'fist', fh: 'fist', face: 'grit', eyes: 'wide' });
    def('a4KneelPinned', { root: [0, -0.22], lean: 16, neck: 14, head: 12, twist: 0.3, na: [4, 24, 0], fa: [0, 28, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'fist', fh: 'relaxed', face: 'grit', eyes: 'narrow' });
    def('a4KneelHit', { root: [0, -0.24], lean: 30, neck: 22, head: 16, twist: 0.3, na: [-10, 30, 0], fa: [-16, 34, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'fist', fh: 'open', face: 'grit', eyes: 'closed' });
    def('a4KneelBow', { root: [0, -0.23], lean: 22, neck: 24, head: 18, twist: 0.3, na: [8, 24, 0], fa: [2, 28, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'relaxed', fh: 'relaxed', face: 'neutral', eyes: 'closed' });
    def('a4KneelUp', { root: [0, -0.22], lean: 4, neck: -4, head: -8, twist: 0.3, na: [16, 38, 0], fa: [6, 28, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'relaxed', fh: 'relaxed', face: 'smile', eyes: 'glow' });
    def('a4DoublePalmA', { root: [-0.02, -0.05], lean: 4, twist: 0.25, na: [-30, 100, -20], fa: [-24, 106, -20], nl: [22, 30, 0], fl: [-22, 18, 0], nh: 'open', fh: 'open', eyes: 'narrow' });
    def('a4DoublePalm', { root: [0.07, -0.05], lean: 20, twist: 0.4, na: [86, 4, -60], fa: [80, 8, -60], nl: [40, 40, 0], fl: [-30, 10, 0], nh: 'open', fh: 'open', eyes: 'glare', face: 'grit' });
    def('a4Chant', { lean: 0, neck: 2, head: -2, twist: 0.4, na: [30, 130, 0], fa: [-6, 18, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'two', fh: 'relaxed', eyes: 'narrow', face: 'neutral' });
    def('a4PointDown', { root: [0, 0.02], lean: 24, neck: 16, head: 14, twist: 0.5, na: [22, 4, 0], fa: [-14, 30, 0], nl: [14, 24, -20], fl: [-8, 30, -30], nh: 'two', fh: 'relaxed', eyes: 'glare', face: 'grin' });
    def('a4BlockBeam', { root: [-0.01, -0.04], lean: 2, neck: 4, twist: 0.35, na: [70, 110, 0], fa: [40, 120, 0], nl: [22, 30, 0], fl: [-24, 18, 0], nh: 'fist', fh: 'open', face: 'grit', eyes: 'wide' });
    def('a4GripArm', { root: [0, -0.03], lean: 12, neck: 6, head: 4, twist: 0.3, na: [30, 100, 0], fa: [20, 110, 0], nl: [20, 26, 0], fl: [-18, 14, 0], nh: 'claw', fh: 'fist', face: 'grit', eyes: 'narrow' });
    def('a4TearA', { root: [0, -0.05], lean: 14, twist: 0.4, na: [96, 20, 0], fa: [90, 26, 0], nl: [30, 34, 0], fl: [-26, 16, 0], nh: 'claw', fh: 'claw', eyes: 'glare', face: 'grit' });
    def('a4Tear', { root: [-0.04, -0.06], lean: -22, neck: -8, twist: 0.5, na: [40, 60, 0], fa: [-30, 50, 0], nl: [36, 30, 0], fl: [-30, 24, 0], nh: 'fist', fh: 'claw', eyes: 'glare', face: 'grin' });
    def('a4TossA', { root: [-0.02, -0.06], lean: -10, twist: 0.6, na: [60, 40, 0], fa: [-40, 60, 0], nl: [26, 30, 0], fl: [-30, 20, 0], nh: 'claw', fh: 'fist', eyes: 'narrow' });
    def('a4Toss', { root: [0.08, -0.05], lean: 30, twist: 0.9, na: [130, 10, 0], fa: [-20, 40, 0], nl: [40, 44, 0], fl: [-34, 10, 20], nh: 'open', fh: 'fist', eyes: 'glare', face: 'grit' });
    def('a4BlueFistA', { root: [-0.02, -0.05], lean: 4, twist: 0.2, na: [-20, 120, 0], fa: [20, 110, 0], nl: [22, 28, 0], fl: [-22, 16, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
    def('a4BlueFist', { root: [0.08, -0.05], lean: 24, neck: -6, twist: 0.8, na: [88, 2, 0], fa: [20, 110, 0], nl: [40, 40, 0], fl: [-34, 8, 20], nh: 'fist', fh: 'fist', eyes: 'glow', face: 'grit' });
    def('a4RiseSky', { root: [0, 0.02], lean: -4, neck: -16, head: -12, twist: 0.3, na: [12, 18, 0], fa: [8, 22, 0], nl: [10, 18, -30], fl: [-6, 30, -40], nh: 'relaxed', fh: 'relaxed', eyes: 'glow', face: 'smile' });
    def('a4LookSky', { lean: -8, neck: -24, head: -22, twist: 0.35, na: [6, 14, 0], fa: [-4, 12, 0], nl: [4, 3, 0], fl: [-6, 2, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'glow', face: 'grin' });
    def('a4PunchDownA', { root: [0, -0.02], lean: -6, neck: 4, twist: 0.5, na: [150, 60, 0], fa: [20, 60, 0], nl: [16, 20, 0], fl: [-14, 12, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
    def('a4PunchDown', { root: [0.04, -0.2], lean: 46, neck: -10, head: -6, twist: 0.6, na: [20, 4, 0], fa: [-30, 40, 0], nl: [70, 110, 10], fl: [-6, 90, 30], nh: 'fist', fh: 'fist', eyes: 'glare', face: 'grit' });
    def('a4HoverGuard', { root: [0, 0.02], lean: 10, neck: -4, twist: 0.45, na: [52, 92, 6], fa: [22, 122, 0], nl: [16, 30, -20], fl: [-10, 40, -30], nh: 'fist', fh: 'fist', eyes: 'narrow' });
    // the regrown hand raised in front of his eyes: open (A), then closed into a fist (a4_flash34)
    def('a4FlexA', { root: [0, 0.02], lean: 2, neck: 8, head: 8, twist: 0.35, na: [58, 112, 0], fa: [10, 22, 0], nl: [14, 24, -20], fl: [-8, 34, -30], nh: 'open', fh: 'relaxed', eyes: 'glow', face: 'open' });
    def('a4Flex', { root: [0, 0.02], lean: 4, neck: 6, head: 4, twist: 0.35, na: [62, 118, 0], fa: [10, 24, 0], nl: [14, 24, -20], fl: [-8, 34, -30], nh: 'fist', fh: 'fist', eyes: 'glow', face: 'grin' });
    // ---- Sukuna
    def('a4KoStand', { lean: 8, neck: 22, head: 18, twist: 0.3, na: [2, 8, 0], fa: [-4, 10, 0], nl: [4, 6, 0], fl: [-5, 4, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'closed', face: 'neutral' });
    def('a4PbA', { root: [0, -0.03], lean: 6, neck: -2, twist: 0.25, na: [56, 94, 0], fa: [52, 98, 0], nl: [24, 30, 0], fl: [-20, 16, 0], nh: 'flat', fh: 'flat', face: 'grin', eyes: 'narrow' });
    def('a4Pb', { root: [0.03, -0.04], lean: 14, neck: -6, twist: 0.3, na: [86, 6, 0], fa: [84, 8, 0], nl: [32, 36, 0], fl: [-26, 12, 0], nh: 'flat', fh: 'flat', face: 'grin', eyes: 'glare' });
    def('a4ThrowOA', { root: [-0.02, -0.03], lean: -12, neck: -4, twist: 0.6, na: [170, 70, 0], fa: [60, 40, 0], nl: [24, 28, 0], fl: [-24, 18, 0], nh: 'fist', fh: 'open', face: 'grin', eyes: 'narrow' });
    def('a4ThrowO', { root: [0.06, -0.05], lean: 26, twist: 0.9, na: [80, 6, 0], fa: [-30, 40, 0], nl: [40, 40, 0], fl: [-30, 10, 20], nh: 'open', fh: 'open', face: 'grin', eyes: 'glare' });
    // ---- Mahoraga / Agito
    // arms out of the ground: the body lies back almost level under the pool (clipped away), both arms reach straight
    // up from just below the surface so only the arms show (FX emerge); pullDown = the same body hauling downward
    def('a4maho_grabUp', { root: [0, 0], lean: -80, neck: -40, head: -30, twist: 0.3, na: [256, 2, 0], fa: [250, 6, 0], nl: [0, 0, 0], fl: [0, 0, 0], nh: 'open', fh: 'open' });
    def('a4maho_pullDown', { root: [0, 0], lean: -80, neck: -40, head: -30, twist: 0.3, na: [250, 12, 0], fa: [244, 16, 0], nl: [0, 0, 0], fl: [0, 0, 0], nh: 'fist', fh: 'fist' });
    def('maho_pull', { root: [0, -0.06], lean: 10, neck: 6, twist: 0.3, na: [120, 70, 0], fa: [112, 76, 0], nl: [18, 30, 0], fl: [-16, 20, 0], nh: 'fist', fh: 'fist' });
    def('a4maho_catch', { root: [0, -0.04], lean: -8, neck: 8, head: 6, twist: 0.35, na: [70, 60, 0], fa: [62, 66, 0], nl: [22, 24, 0], fl: [-24, 16, 0], nh: 'open', fh: 'open' });
    def('a4ag_grab', { root: [0.02, -0.05], lean: 26, neck: 4, head: -12, twist: 0.5, na: [96, 20, 0], fa: [88, 28, 0], nl: [34, 38, 0], fl: [-26, 16, 0], nh: 'claw', fh: 'claw', spark: 0.5 });
    // ---- moves (frame data @ 30 fps: keys, contact frame, root [[f, dx m]], smear, default swing sounds)
    mv('a4DoublePalm', { keys: [[0, 'guard'], [5, 'a4DoublePalmA'], [9, 'a4DoublePalm'], [16, 'a4DoublePalm'], [28, 'guard']], contact: 9, startup: 9, active: 7, recovery: 12, strength: 3, root: [[0, 0], [9, 0.6], [28, 0.5]], smear: { limb: 'na', from: 5, to: 9 }, sfx: { 5: 'whooshL' } });
    mv('a4PbFire', { keys: [[0, 'loose'], [8, 'a4PbA'], [22, 'a4PbA'], [24, 'a4Pb'], [42, 'a4Pb'], [54, 'loose']], contact: 24, startup: 24, active: 18, recovery: 12, root: [[0, 0], [22, 0], [24, -0.18], [54, -0.2]], sfx: {} });
    mv('a4ThrowObj', { keys: [[0, 'loose'], [8, 'a4ThrowOA'], [12, 'a4ThrowOA'], [15, 'a4ThrowO'], [24, 'a4ThrowO'], [34, 'loose']], contact: 15, startup: 15, active: 9, recovery: 10, root: [[0, 0], [15, 0.3], [34, 0.3]], smear: { limb: 'na', from: 12, to: 15 }, sfx: { 12: 'whooshM' } });
    mv('a4TossFoe', { keys: [[0, 'guard'], [4, 'a4TossA'], [12, 'a4TossA'], [16, 'a4Toss'], [28, 'a4Toss'], [38, 'guard']], contact: 16, startup: 16, active: 12, recovery: 10, strength: 3, root: [[0, 0], [16, 0.4], [38, 0.4]], smear: { limb: 'na', from: 12, to: 16 }, sfx: { 12: 'whooshL' } });
    mv('a4BlueFist', { keys: [[0, 'guard'], [4, 'a4BlueFistA'], [8, 'a4BlueFist'], [22, 'a4BlueFist'], [32, 'guard']], contact: 8, startup: 8, active: 14, recovery: 10, strength: 3, root: [[0, 0], [8, 0.55], [32, 0.5]], smear: { limb: 'na', from: 4, to: 8 }, sfx: { 4: 'whooshM' } });
    mv('a4TearTail', { keys: [[0, 'guard'], [5, 'a4TearA'], [14, 'a4TearA'], [18, 'a4Tear'], [30, 'a4Tear'], [40, 'guard']], contact: 18, startup: 18, active: 12, recovery: 10, root: [[0, 0], [14, 0.1], [18, -0.3], [40, -0.35]], sfx: { 16: 'whooshM' } });
    mv('a4PunchDown', { keys: [[0, 'guard'], [5, 'a4PunchDownA'], [9, 'a4PunchDownA'], [12, 'a4PunchDown'], [24, 'a4PunchDown'], [36, 'guard']], contact: 12, startup: 12, active: 12, recovery: 12, strength: 3, root: [[0, 0], [12, 0.4], [36, 0.4]], smear: { limb: 'na', from: 9, to: 12 }, sfx: { 9: 'whooshL' } });
    mv('a4MahoCatch', { keys: [[0, 'maho_idle'], [6, 'a4maho_catch'], [30, 'a4maho_catch'], [44, 'maho_idle']], contact: 6, startup: 6, active: 24, recovery: 14, root: [[0, 0], [6, -0.2], [30, -0.3]] });
    mv('a4AgitoGrab', { keys: [[0, 'ag_idle'], [6, 'ag_crouch'], [12, 'a4ag_grab'], [22, 'a4ag_grab'], [36, 'ag_idle']], contact: 12, startup: 12, active: 10, recovery: 14, root: [[0, 0], [6, 0], [12, 1.4], [36, 1.5]], sfx: { 8: 'whooshM' } });
  });

  // ================================================================== staging helpers (scene files call these at load time)
  // joint of a character in a pose, in metres: [forward, up] from the feet point (rig.fk × height)
  A4.joint = (ch, pose, jn) => {
    const sp = rig.CHARS[ch], prop = Object.assign({}, rig.PROP, sp.prop || {}), J = rig.fk(typeof pose === 'string' ? rig.POSES[pose] : pose, prop), v = J[jn];
    return v ? [v[0] * sp.height, v[1] * sp.height] : [0, 0];
  };
  // where to put a (sunk) figure so that its joint `jn` in `pose` lands on the world point `target`, facing `heading`
  // → { at: [x, y, 0], z } for FX emerge (z < 0 = below the ground)
  A4.reach = (ch, pose, jn, target, heading, side) => {
    const j = A4.joint(ch, pose, jn), hd = headingOf(heading), s = side || 0;
    return { at: [target[0] - hd[0] * j[0] - hd[1] * s, target[1] - hd[1] * j[0] + hd[0] * s, 0], z: target[2] - j[1] };
  };
  // world position of a cast member's joint for a given feet point + heading + pose (e.g. Gojo's shoulder)
  A4.jointWorld = (ch, pose, jn, at, heading) => { const j = A4.joint(ch, pose, jn), hd = headingOf(heading); return [at[0] + hd[0] * j[0], at[1] + hd[1] * j[0], (at[2] || 0) + j[1]]; };

  // ================================================================== FX helpers
  const HEAD = { east: [1, 0], west: [-1, 0], north: [0, 1], south: [0, -1] };
  const headingOf = f => { if (Array.isArray(f)) { const l = hypot(f[0], f[1]) || 1; return [f[0] / l, f[1] / l]; } return HEAD[f] || [1, 0]; };
  const screenFace = (S, hd) => { const c = S.cam; return hd[0] * cos(c.yaw) - hd[1] * sin(c.yaw) >= 0 ? 1 : -1; };
  const at3 = (S, a, t) => (typeof a === 'string' ? S.pt(a, t) : a);
  const pj = (S, p) => (p ? S.project(p[0], p[1], p[2] || 0) : null);
  const poseOf = n => (typeof n === 'string' ? rig.POSES[n] || rig.POSES.stand : rig.full(n || {}));
  const keyed = (v, age, def) => { // number | [[age, value], ...] (smoothstep between keys)
    if (v === undefined || v === null) return def;
    if (typeof v === 'number') return v;
    if (age <= v[0][0]) return v[0][1];
    for (let i = 1; i < v.length; i++) if (age <= v[i][0]) { const a = v[i - 1], b = v[i], u = (age - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * u * u * (3 - 2 * u); }
    return v[v.length - 1][1];
  };
  function poseAt(e, age) { // e.pose | e.poses [[age, name], ...] — drawings on 2s, eased between keys
    const K = e.poses; if (!K) return poseOf(e.pose || 'stand');
    const a = floor(age * 12 + 1e-6) / 12;
    if (a <= K[0][0]) return poseOf(K[0][1]);
    for (let i = 1; i < K.length; i++) if (a <= K[i][0]) { const u = (a - K[i - 1][0]) / Math.max(1e-6, K[i][0] - K[i - 1][0]); return rig.lerpPose(poseOf(K[i - 1][1]), poseOf(K[i][1]), HT.E.inOutQuad(u)); }
    return poseOf(K[K.length - 1][1]);
  }

  // ---- emerge: a rig figure out of the ground (Mahoraga's arms from Sukuna's shadow; Mahoraga / Agito / Sukuna rising)
  FX.a4emerge = {
    dur: 2, layer: 'behind',
    draw(ctx, age, e, S) {
      const ch = e.char || 'mahoraga', spec = rig.CHARS[ch]; if (!spec || !e.at) return;
      const at = e.at, z = keyed(e.z, age, 0), gz = at[2] || 0;
      const p = S.project(at[0], at[1], gz + z), g = S.project(at[0], at[1], gz); if (!p || !g) return;
      const px = spec.height * p.s; if (px < 4) return;
      const face = screenFace(S, headingOf(e.face || 'east')), dT = floor(age * 12 + 1e-6) / 12;
      const Pz = Object.assign({}, poseAt(e, age), e.opts || {});
      const L = S.light || [-0.3, -0.6, 0.75], clipY = R(g.y + (e.clipOff || 0));
      if (clipY <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(-W, -H, W * 3, clipY + H); ctx.clip();
      rig.draw(ctx, ch, p.x, p.y, Pz, px, { face, light: L, rimDir: [-L[0], -L[1]], costume: e.costume, t: dT, key: 'em' + e.t + '|' + dT.toFixed(3) + (e.opts ? JSON.stringify(e.opts) : '') + '|' + R(clipY - p.y) });
      ctx.restore();
      if (e.lip !== false) { const w = Math.max(3, px * (e.lipW || 0.26)); U().ellipse(ctx, g.x, g.y, w, Math.max(1, w * 0.13), C.ink); }
    },
  };

  // ---- shadowArm: one of Mahoraga's huge pale arms erupting from the shadow and clamping onto a target (canon ch. 232:
  //      "Mahoraga's arms erupt from the shadows and immobilize Gojo's upper body"). World-space chain base → elbow →
  //      wrist → hand, sized in metres (Mahoraga is 3.4 m: upper arm ≈ 0.24 m thick), maho_skin ramp + ink outline +
  //      bandaged forearm; grows out of the pool over e.grow, then the grip follows its target (refs follow).
  //      {base [x,y,0], grip ref|[x,y,z], gripOff [dx,dy,dz], elbow [dx,dy,dz] (offset from the base→grip midpoint),
  //       grow (0.14 s), retract (s: withdraw into the pool at the end), w [upper, fore, wrist] m, hand (0.13 m), curl
  //       (screen rad), sink [[age, dz], …] (pull the grip down)}
  FX.a4arm = {
    dur: 3, layer: 'front', follow: true, sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), B = e.base; if (!B) return;
      const gp = at3(S, e.grip, S.t); if (!gp) return;
      const go = e.gripOff || [0, 0, 0], dz = keyed(e.sink, age, 0);
      const Gw = [gp[0] + go[0], gp[1] + go[1], gp[2] + go[2] + dz], eo = e.elbow || [0, 0, 0.3];
      const Ew = [(B[0] + Gw[0]) / 2 + eo[0], (B[1] + Gw[1]) / 2 + eo[1], (B[2] + Gw[2]) / 2 + eo[2]];
      const Ww = [lerp(Ew[0], Gw[0], 0.86), lerp(Ew[1], Gw[1], 0.86), lerp(Ew[2], Gw[2], 0.86)];
      const pts = [B, Ew, Ww, Gw].map(p => S.project(p[0], p[1], p[2]));
      if (pts.some(p => !p)) return;
      const k = HT.E.outCubic(sat(age / (e.grow || 0.14))) * (e.retract ? HT.E.inOutQuad(sat((e.dur - age) / e.retract)) : 1), out = sat((e.dur - age) / 0.05);
      if (k <= 0.01 || out <= 0) return;
      const wd = e.w || [0.26, 0.21, 0.15], wpx = [wd[0] * pts[0].s, wd[0] * pts[1].s, wd[1] * pts[2].s, wd[2] * pts[3].s].map(v => max(2, v));
      // truncate the chain at arc length k (the arm shooting up out of the pool)
      const L = [0]; for (let i = 1; i < 4; i++) L.push(L[i - 1] + hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      const tot = L[3] * k, P = [[pts[0].x, pts[0].y, wpx[0]]];
      for (let i = 1; i < 4; i++) {
        if (L[i] <= tot) { P.push([pts[i].x, pts[i].y, wpx[i]]); continue; }
        const f = (tot - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
        P.push([lerp(pts[i - 1].x, pts[i].x, f), lerp(pts[i - 1].y, pts[i].y, f), lerp(wpx[i - 1], wpx[i], f)]);
        break;
      }
      const seg = (fn) => { for (let i = 0; i + 1 < P.length; i++) fn(P[i], P[i + 1], i); };
      seg((a, b) => u.taper(ctx, a[0], a[1], b[0], b[1], a[2] + 2, b[2] + 2, C.ink));               // outline
      seg((a, b) => u.taper(ctx, a[0], a[1], b[0], b[1], a[2], b[2], C.mist));                      // body
      seg((a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l, sgn = (nx * -0.5 + ny * -0.8) > 0 ? 1 : -1;
        const o0 = a[2] * 0.3 * sgn, o1 = b[2] * 0.3 * sgn;
        u.taper(ctx, a[0] + nx * o0, a[1] + ny * o0, b[0] + nx * o1, b[1] + ny * o1, max(1, a[2] * 0.28), max(1, b[2] * 0.28), C.white);          // lit edge
        u.taper(ctx, a[0] - nx * o0 * 1.4, a[1] - ny * o0 * 1.4, b[0] - nx * o1 * 1.4, b[1] - ny * o1 * 1.4, max(1, a[2] * 0.22), max(1, b[2] * 0.22), C.steel); });
      if (P.length >= 3) { // bandage wraps round the forearm
        const a = P[1], b = P[2];
        for (let j = 1; j <= 4; j++) { const f = 0.2 + j * 0.14, x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f), w = lerp(a[2], b[2], f) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = hypot(dx, dy) || 1; u.line(ctx, x - dy / l * w, y + dx / l * w + 1, x + dy / l * w, y - dx / l * w - 1, C.sand); }
      }
      if (k > 0.9 && P.length === 4) { // the hand: palm + fingers curling round the target
        const g = P[3], a = P[2], dx = g[0] - a[0], dy = g[1] - a[1], l = hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
        const hs = max(3, (e.hand || 0.13) * pts[3].s), curl = e.curl === undefined ? 1.1 : e.curl;
        u.disc(ctx, g[0], g[1], hs + 1, C.ink); u.disc(ctx, g[0], g[1], hs, C.mist); u.disc(ctx, g[0] - hs * 0.3, g[1] - hs * 0.3, hs * 0.45, C.white);
        for (let f = 0; f < 4; f++) {
          const sp = (f - 1.5) * 0.3, c1 = cos(sp), s1 = sin(sp), fx = ux * c1 - uy * s1, fy = uy * c1 + ux * s1;
          const m = [g[0] + fx * hs * 1.3, g[1] + fy * hs * 1.3], c2 = cos(curl), s2 = sin(curl), tx = fx * c2 - fy * s2, ty = fy * c2 + fx * s2, t = [m[0] + tx * hs * 1.1, m[1] + ty * hs * 1.1];
          u.taper(ctx, g[0], g[1], m[0], m[1], hs * 0.75 + 2, hs * 0.55 + 2, C.ink); u.taper(ctx, m[0], m[1], t[0], t[1], hs * 0.55 + 2, hs * 0.35 + 2, C.ink);
          u.taper(ctx, g[0], g[1], m[0], m[1], hs * 0.75, hs * 0.55, C.mist); u.taper(ctx, m[0], m[1], t[0], t[1], hs * 0.55, hs * 0.35, f === 0 ? C.white : C.mist);
        }
      }
      if (age < 0.25) for (let i = 0; i < 8; i++) { const th = h1(i, 51) * TAU, d = (age / 0.25) * wpx[0] * (1.5 + h1(i, 52)); u.sq(ctx, pts[0].x + cos(th) * d, pts[0].y + sin(th) * d * 0.4 - age * 20, 2, C.ink); } // ink splash
    },
  };

  // ---- inkGrip: the shadow's ink climbing a figure's legs (drawn over the figure)
  FX.a4ink = {
    dur: 3, layer: 'front', follow: true,
    draw(ctx, age, e, S) {
      const who = e.who || 'gojo', a = S.at(who, S.t), f0 = S.project(a.x, a.y, a.z); if (!f0) return;
      const k = HT.E.outCubic(sat(age / (e.grow || 0.4))) * sat((e.dur - age) / 0.3), hh = (e.h === undefined ? 0.45 : e.h) * a.h * k;
      if (k <= 0.02) return;
      const top = S.project(a.x, a.y, a.z + hh); if (!top) return;
      const u = U(), px = a.h * f0.s, wB = px * 0.2, n = e.n || 7, g = floor(age * 12);
      u.ellipse(ctx, f0.x, f0.y, wB * 1.25, Math.max(1, wB * 0.3), C.ink);
      for (let i = 0; i < n; i++) { // tendrils curling up around the legs (re-drawn on 2s)
        const side = i % 2 ? 1 : -1, ph = h1(i, 41) * TAU + g * 0.35, x0 = f0.x + side * wB * (0.3 + 0.7 * h1(i, 42)), hgt = (f0.y - top.y) * (0.55 + 0.45 * h1(i, 43));
        let px0 = x0, py0 = f0.y;
        for (let j = 1; j <= 6; j++) {
          const v = j / 6, x = f0.x + (x0 - f0.x) * (1 - v * 0.8) + sin(ph + v * 5) * wB * 0.45 * v, y = f0.y - hgt * v;
          u.taper(ctx, px0, py0, x, y, max(1.2, wB * 0.28 * (1 - v * 0.8)), max(1, wB * 0.28 * (1 - v)), C.ink);
          px0 = x; py0 = y;
        }
      }
      if (px > 40) for (let i = 0; i < 5; i++) { const ph = (age * 0.9 + h1(i, 44)) % 1; u.sq(ctx, f0.x + h2(i, 45) * wB, f0.y - (f0.y - top.y) * ph * 1.3, 1, u.dcol(C.plum, 1 - ph)); }
    },
  };

  // ---- infinityCut: the sword passes THROUGH the Infinity — the invisible shell's rings torn and parted along the cut
  FX.a4infCut = {
    dur: 0.8, layer: 'front', sfx: 'swordRing', vol: 0.7,
    draw(ctx, age, e, S) {
      const p = pj(S, at3(S, e.at, e.t)); if (!p) return;
      const u = U(), T = e.dur, q = age / T, f = floor(age * 30), seed = e.seed || 5;
      const Rm = clamp(p.s * (e.r || 0.6), 16, 120), a = e.angle === undefined ? -0.95 : e.angle, ux = cos(a), uy = sin(a), nx = -uy, ny = ux;
      const sep = HT.E.outCubic(sat(age / 0.2)) * Math.max(2, Rm * 0.1), grow = 0.8 + 0.3 * HT.E.outCubic(sat(age / 0.35));
      for (let k = 0; k < 3; k++) {
        const rr = Rm * (0.42 + 0.3 * k) * grow, col = u.dcol(k ? C.ice : C.white, (1 - q) * (k === 2 ? 0.45 : 0.85));
        for (const s of [-1, 1]) { // half shells either side of the cut, sliding apart
          const ox = nx * s * sep, oy = ny * s * sep; let x0 = 0, y0 = 0;
          for (let i = 0; i <= 26; i++) {
            const th = (i / 26) * PI, c = cos(th), sn = sin(th), x = p.x + ox + ux * c * rr + nx * s * sn * rr * 0.55, y = p.y + oy + uy * c * rr + ny * s * sn * rr * 0.55;
            if (i && HT.noise(c * 2 + k, sn * 2 + age * 3, seed + k) > 0.32) u.line(ctx, x0, y0, x, y, col);
            x0 = x; y0 = y;
          }
        }
      }
      const Lc = Rm * 1.7 * HT.E.outCubic(sat(age / 0.07));
      if (q < 0.55) u.line(ctx, p.x - ux * Lc, p.y - uy * Lc, p.x + ux * Lc, p.y + uy * Lc, f <= 2 ? C.white : u.dcol(C.ice, 1 - q / 0.55));
      if (f <= 1) u.sparkle(ctx, p.x, p.y, 5, C.white, C.ice);
      for (let i = 0; i < 12; i++) { // glassy flecks of the torn shell falling away
        const th = h1(i, seed + 3) * TAU, v = Rm * (1.2 + 1.6 * h1(i, seed + 4)), d = v * (1 - Math.exp(-5 * age)) / 5;
        u.sq(ctx, p.x + cos(th) * (Rm * 0.5 + d), p.y + sin(th) * (Rm * 0.35 + d * 0.6) + 60 * age * age, 1, u.dcol(i % 3 ? C.ice : C.white, 1 - q));
      }
    },
  };

  // ---- extinguisher: the thrown canister (tumbling) that bursts against the Infinity
  FX.a4ext = {
    dur: e => (e.travel || 0.55) + 0.45, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), tr = e.travel || 0.55, A = at3(S, e.from, e.t), B = at3(S, e.to, e.t); if (!A || !B) return;
      if (age < tr) {
        const s = age / tr, x = lerp(A[0], B[0], s), y = lerp(A[1], B[1], s), z = lerp(A[2] || 0, B[2] || 0, s) + 4 * s * (1 - s) * (e.lift || 0.8);
        const p = S.project(x, y, z); if (!p) return;
        const L = Math.max(4, 0.55 * p.s), rr = Math.max(1.5, 0.09 * p.s), rot = floor(age * 12) / 12 * 9 + 0.6;
        const dx = cos(rot) * L / 2, dy = sin(rot) * L / 2;
        u.thick(ctx, p.x - dx, p.y - dy, p.x + dx, p.y + dy, rr * 2 + 2, C.ink);
        u.thick(ctx, p.x - dx, p.y - dy, p.x + dx, p.y + dy, rr * 2, C.red);
        u.line(ctx, p.x - dx * 0.8 - rr * 0.4, p.y - dy * 0.8 - rr * 0.6, p.x + dx * 0.6 - rr * 0.4, p.y + dy * 0.6 - rr * 0.6, C.coral);
        u.sq(ctx, p.x + dx * 1.15, p.y + dy * 1.15, Math.max(1, rr), C.ink);        // valve head
        u.line(ctx, p.x + dx * 1.1, p.y + dy * 1.1, p.x + dx * 0.4 + dy * 0.5, p.y + dy * 0.4 - dx * 0.5, C.ink); // hose
        return;
      }
      const tau = age - tr, f = floor(tau * 30), p = pj(S, B); if (!p) return;
      const r0 = Math.max(4, 0.5 * p.s);
      if (f <= 1) { u.disc(ctx, p.x, p.y, r0 * (f ? 1.6 : 1.1), f ? C.mist : C.white); u.sparkle(ctx, p.x, p.y, R(r0 * 1.8), C.white, null); }
      for (let i = 0; i < 9; i++) { // red shards of the split canister
        const th = h1(i, 71) * TAU, v = r0 * (5 + 5 * h1(i, 72)), d = v * (1 - Math.exp(-6 * tau)) / 6;
        u.sq(ctx, p.x + cos(th) * d, p.y + sin(th) * d * 0.8 + 90 * tau * tau, i % 3 ? 1 : 2, tau < 0.3 ? C.red : C.crimson);
      }
    },
  };

  // ---- powder: the white smokescreen (big dithered puffs; a bored tunnel where the water beam passed)
  FX.a4powder = {
    dur: 6, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), c = at3(S, e.at, e.t); if (!c) return;
      const n = e.n || 44, r = e.r || 3, g = HT.E.outCubic(sat(age / (e.grow || 0.5))), fade = sat((e.dur - age) / 1.2), dr = e.drift || [0, 0], seed = e.seed || 11;
      const tun = e.tunnel, tunOn = tun && S.t >= tun.at, pal = e.pal || [C.white, C.white, C.mist, C.steel], al = (e.alpha === undefined ? 0.85 : e.alpha) * fade;
      const list = [];
      for (let i = 0; i < n; i++) {
        const th = h1(i, seed) * TAU, ph = Math.acos(1 - 2 * h1(i, seed + 1)), rr = r * g * Math.cbrt(h1(i, seed + 2));
        const x = c[0] + rr * Math.sin(ph) * cos(th) + dr[0] * age, y = c[1] + rr * Math.sin(ph) * sin(th) * (e.flat || 1) + dr[1] * age;
        const z = Math.max(0.2, (c[2] || 0) + rr * cos(ph) * 0.6 + (e.rise || 0.12) * age);
        if (tunOn) { // clear the puffs along the beam's line
          const A = tun.from, B = tun.to, dx = B[0] - A[0], dy = B[1] - A[1], dz = (B[2] || 0) - (A[2] || 0), L2 = dx * dx + dy * dy + dz * dz || 1;
          const s = clamp(((x - A[0]) * dx + (y - A[1]) * dy + (z - (A[2] || 0)) * dz) / L2, 0, 1), d = hypot(x - A[0] - dx * s, y - A[1] - dy * s, z - (A[2] || 0) - dz * s);
          const open = sat((S.t - tun.at) / 0.12) * (1 - sat((S.t - tun.at - 1.6) / 1.6));
          if (d < (tun.w || 0.8) * open) continue;
        }
        const p = S.project(x, y, z); if (!p) continue;
        list.push([p.d, p.x, p.y, Math.max(2, r * (0.3 + 0.25 * h1(i, seed + 3)) * (0.6 + 0.4 * g) * p.s), i]);
      }
      list.sort((a, b) => b[0] - a[0]);
      // depth split (layer ['behind','front'] + splitWho: [names]): puffs beyond the nearest of those figures draw behind
      // the fighters, nearer ones in front — so a figure standing clear of the cloud is not painted over by it
      let dS = null;
      if (e.splitWho && S.fxLayer) for (const nm of [].concat(e.splitWho)) { const a = S.at(nm), q = S.project(a.x, a.y, a.z + a.h * 0.5); if (q && (dS === null || q.d < dS)) dS = q.d; }
      for (const [d, x, y, rp, i] of list) {
        if (dS !== null && ((S.fxLayer === 'behind') !== (d >= dS))) continue;
        u.puff(ctx, x, y, rp, pal, al, seed + i);
      }
    },
  };

  // ---- waterBeam: the imitation Piercing Blood (Max Elephant's water compressed between the palms, then one thin jet)
  FX.a4jet = {
    dur: e => (e.charge === undefined ? 0.5 : e.charge) + (e.hold || 0.45) + 0.45, layer: 'front', follow: true, sfx: false,
    cues: e => [{ t: 0, sfx: 'blueCharge', vol: 0.35 }, { t: e.charge === undefined ? 0.5 : e.charge, sfx: 'waterJet', vol: 0.95 }],
    draw(ctx, age, e, S) {
      const u = U(), ch = e.charge === undefined ? 0.5 : e.charge, hold = e.hold || 0.45, seed = e.seed || 3;
      const A = at3(S, e.from, S.t), pA = pj(S, A); if (!pA) return;
      if (age < ch) { // the compressed sphere of water between the palms, droplets spiralling in
        const q = age / ch, rp = Math.max(1.5, (0.03 + 0.04 * q) * pA.s);
        u.glow(ctx, pA.x, pA.y, rp * 2.2 + 2, C.sky, 0.25 + 0.25 * q);
        u.disc(ctx, pA.x, pA.y, rp + 1, C.sky); u.disc(ctx, pA.x, pA.y, rp, C.ice); u.disc(ctx, pA.x - rp * 0.3, pA.y - rp * 0.3, Math.max(0.6, rp * 0.4), C.white);
        for (let i = 0; i < 10; i++) { const ph = (age * 2.6 + h1(i, seed)) % 1, th = h1(i, seed + 1) * TAU + age * 5, d = rp * (1.3 + 4 * (1 - ph)); u.sq(ctx, pA.x + cos(th) * d, pA.y + sin(th) * d, 1, ph > 0.5 ? C.white : C.ice); }
        return;
      }
      const tau = age - ch, B = at3(S, e.to, e.t + ch), pB = pj(S, B); if (!pB) return;
      const ext = sat(tau / 0.06), bx = pA.x + (pB.x - pA.x) * ext, by = pA.y + (pB.y - pA.y) * ext;
      const dx = bx - pA.x, dy = by - pA.y, L = hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      if (tau < hold) {
        const w = Math.max(1, (e.w || 0.06) * Math.min(pA.s, pB.s)), wob = floor(tau * 30);
        u.taper(ctx, pA.x, pA.y, bx, by, w + 3, w + 2, u.dcol(C.sky, 0.6));
        u.taper(ctx, pA.x, pA.y, bx, by, w + 1, w, C.ice);
        u.line(ctx, pA.x + nx * (wob % 2 ? 0.5 : -0.5), pA.y + ny * (wob % 2 ? 0.5 : -0.5), bx, by, C.white);
        for (let i = 0; i < 16; i++) { // mist shed along the jet
          const s = h1(i + wob * 17, seed + 2), d = (h1(i, seed + 3) - 0.5) * 6 + (tau * 30 % 3);
          u.sq(ctx, pA.x + dx * s + nx * d, pA.y + dy * s + ny * d - tau * 10, 1, u.dcol(i % 2 ? C.white : C.ice, 0.8));
        }
        u.disc(ctx, pA.x, pA.y, Math.max(2, 0.08 * pA.s), C.white);
        if (ext >= 1 && e.splash !== false) { // the splash where it strikes
          const f = floor(tau * 30), rr = Math.max(3, 0.25 * pB.s) * (1 + 0.3 * (f % 2));
          u.sparkle(ctx, pB.x, pB.y, R(rr), C.white, C.ice);
          for (let i = 0; i < 12; i++) { const th = h1(i + f * 13, seed + 4) * TAU, d = rr * (0.8 + 1.8 * h1(i, seed + 5)); u.sq(ctx, pB.x + cos(th) * d, pB.y + sin(th) * d * 0.7, i % 4 ? 1 : 2, i % 3 ? C.ice : C.white); }
        }
        return;
      }
      const q = (tau - hold) / 0.45; // the jet breaks up into falling droplets
      for (let i = 0; i < 26; i++) { const s = h1(i, seed + 6); u.sq(ctx, pA.x + dx * s + h2(i, seed + 7) * 3, pA.y + dy * s + 180 * q * q * (0.4 + 0.6 * h1(i, seed + 8)), 1, u.dcol(i % 3 ? C.ice : C.white, 1 - q)); }
    },
  };

  // ---- flySlash: Mahoraga's flying slash — a crescent races along the path, then one hairline across the whole frame
  FX.a4flySlash = {
    dur: e => (e.travel || 0.22) + 0.7, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), tr = e.travel || 0.22, A = at3(S, e.from, e.t), B = at3(S, e.to, e.t); if (!A || !B) return;
      const pA = pj(S, A), pB = pj(S, B);
      if (age < tr) {
        const s = HT.E.inQuad(age / tr), P = [lerp(A[0], B[0], s), lerp(A[1], B[1], s), lerp(A[2], B[2], s)], p = pj(S, P); if (!p) return;
        const dd = pB && pA ? [pB.x - pA.x, pB.y - pA.y] : [1, 0], L = hypot(dd[0], dd[1]) || 1, ux = dd[0] / L, uy = dd[1] / L, nx = -uy, ny = ux;
        const half = Math.max(8, (e.w || 1.6) * p.s * 0.5), bow = half * 0.45;
        for (let k = 0; k < 3; k++) { // the crescent (bow pointing along the travel), with two trailing afterimages
          const o = -k * half * 0.5, col = k ? u.dcol(C.ice, 0.6 - k * 0.2) : C.white;
          let x0 = 0, y0 = 0;
          for (let i = 0; i <= 12; i++) { const v = i / 12 * 2 - 1, x = p.x + nx * v * half + ux * (bow * (1 - v * v) + o), y = p.y + ny * v * half + uy * (bow * (1 - v * v) + o); if (i) u.thick(ctx, x0, y0, x, y, k ? 1 : 2, col); x0 = x; y0 = y; }
        }
        for (let i = 0; i < 6; i++) { const v = h2(i, 91) * half, len = half * (1.5 + h1(i, 92) * 2); u.line(ctx, p.x + nx * v - ux * len * 0.3, p.y + ny * v - uy * len * 0.3, p.x + nx * v - ux * len, p.y + ny * v - uy * len, u.dcol(C.ice, 0.5)); }
        return;
      }
      if (!pA || !pB) return;
      const tau = age - tr, f = floor(tau * 30), dx = pB.x - pA.x, dy = pB.y - pA.y, L = hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, D = hypot(W, H) * 1.2;
      const x0 = pB.x - ux * D, y0 = pB.y - uy * D, x1 = pB.x + ux * D, y1 = pB.y + uy * D, nx = -uy, ny = ux;
      if (f <= 2) { const c2 = u.dcol(C.ice, f <= 1 ? 0.9 : 0.5); u.line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny, c2); u.line(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, c2); }
      u.line(ctx, x0, y0, x1, y1, tau < 0.3 ? C.white : u.dcol(C.ice, 1 - (tau - 0.3) / 0.4));
      if (f <= 1) u.sparkle(ctx, pB.x, pB.y, 6, C.white, C.ice);
    },
  };

  // ---- blueStar: the Blue hanging over the city (small; hidden behind buildings: ray vs. the city's current pieces)
  function occluded(S, P) {
    if (!HT.cityGeometry || !S.env || S.env.set !== 'city') return false;
    const c = S.cam, G = HT.cityGeometry(S.T || 0); if (!G || !G.pieces) return false;
    const ox = c.x, oy = c.y, oz = c.z, dx = P[0] - ox, dy = P[1] - oy, dz = P[2] - oz;
    for (const pc of G.pieces) {
      const top = Math.max(pc.zt[0], pc.zt[1]); if (top < oz && top < P[2]) continue; // the segment passes above this piece
      let t0 = 0, t1 = 1;
      const slab = (o, d, a, b) => { if (abs(d) < 1e-9) return o >= a && o <= b; let ta = (a - o) / d, tb = (b - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; return t0 <= t1; };
      if (slab(ox, dx, pc.x0, pc.x1) && slab(oy, dy, pc.y0, pc.y1) && slab(oz, dz, Math.min(pc.zb[0], pc.zb[1]), top)) return true;
    }
    return false;
  }
  HT.A4.occluded = occluded;
  FX.a4blueStar = {
    dur: 30, layer: 'behind', sfx: false,
    draw(ctx, age, e, S) {
      const P = e.at || A4.BLUE, p = pj(S, P); if (!p) return;
      const vw = (S.cam.vw || W), vh = (S.cam.vh || H), vx = S.cam.vx || 0, vy = S.cam.vy || 0;
      if (p.x < vx - 30 || p.x > vx + vw + 30 || p.y < vy - 30 || p.y > vy + vh + 30) return;
      if (e.occlude !== false && occluded(S, P)) return;
      const u = U(), r = clamp((e.r || 1.1) * p.s, 1.6, e.max || 11), a2 = floor(age * 12) / 12, k = sat(age / (e.fadeIn || 0.01));
      u.glow(ctx, p.x, p.y, r * 4.2 + 3, C.blue, 0.42 * k);
      u.glow(ctx, p.x, p.y, r * 2.2 + 1, C.sky, 0.5 * k);
      for (let j = 0; j < 2; j++) { // two swirl arcs turning slowly around the core
        const rr = r * (1.7 + 0.5 * j) + 1, a0 = a2 * (j ? -1.3 : 1.7) + j * 2;
        let x0 = p.x + cos(a0) * rr, y0 = p.y + sin(a0) * rr * 0.45;
        for (let i = 1; i <= 8; i++) { const a = a0 + i * 0.22, x = p.x + cos(a) * rr, y = p.y + sin(a) * rr * 0.45; u.line(ctx, x0, y0, x, y, j ? C.sky : C.ice); x0 = x; y0 = y; }
      }
      u.disc(ctx, p.x, p.y, r + 1, C.ice); u.disc(ctx, p.x, p.y, Math.max(0.6, r - 0.4), C.navy); u.disc(ctx, p.x + r * 0.1, p.y + r * 0.1, Math.max(0.4, r * 0.6), C.ink);
      if ((floor(age * 12) % 17) < 2) u.sparkle(ctx, p.x - r * 0.7, p.y - r * 0.7, 2, C.white, null);
    },
  };

  // ---- crackle: electricity (Nue's current around Agito's hands; Kashimo's aura in the monitoring room)
  FX.a4crackle = {
    dur: 2, layer: 'front', follow: true, sfx: false,
    draw(ctx, age, e, S) {
      const ref = e.at || ((e.who || 'agito') + '.' + (e.part || 'chest')), c = at3(S, ref, S.t), p = pj(S, c); if (!p) return;
      const u = U(), rr = Math.max(4, (e.r || 0.5) * p.s), n = e.n || 5, g = floor(age * 12), rng = HT.rng((e.seed || 9) * 31 + g * 977);
      const cols = e.col || [C.white, C.ice, C.sky], k = sat(age / 0.1) * sat((e.dur - age) / 0.2);
      if (k <= 0) return;
      if (e.glow !== false) u.glow(ctx, p.x, p.y, rr * 0.7, cols[2] || C.sky, 0.14 * k);
      for (let i = 0; i < n; i++) {
        if (rng() > k) continue;
        const a = rng() * TAU, r0 = rr * (0.2 + 0.4 * rng()), L = rr * (0.6 + 0.8 * rng());
        const P = u.bolt(p.x + cos(a) * r0, p.y + sin(a) * r0, p.x + cos(a) * (r0 + L), p.y + sin(a) * (r0 + L), 0.8, 2, rng);
        u.polyline(ctx, P, cols[i % cols.length]);
      }
    },
  };

  // ---- shadowEyes: Sukuna hiding in a shadow — his four eyes (two pairs, the lower pair smaller) open in the ink
  //      {at (ground point), open (0.25 s), look [dx, dy] px drift, w (eye spacing m, 0.16)}
  FX.a4eyes = {
    dur: 3, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const u = U(), k = sat(age / (e.open || 0.25)) * sat((e.dur - age) / 0.15), sp = Math.max(2, (e.w || 0.16) * p.s);
      if (k <= 0) return;
      const blink = (floor(age * 12) % 29) === 0 ? 0 : 1, lk = e.look || [0, 0], hgt = Math.max(1, R(k * 2 * blink));
      for (const [dx, dy, s] of [[-1, -1, 2], [1, -1, 2], [-0.8, 0.4, 1], [0.8, 0.4, 1]]) {
        const x = R(p.x + dx * sp * 0.5 + lk[0]), y = R(p.y + dy * sp * 0.22 + lk[1]);
        u.glow(ctx, x, y, s * 3, C.crimson, 0.35 * k);
        HT.rect(ctx, x - s, y - (hgt > 1 ? 1 : 0), s * 2, s === 2 ? hgt : 1, C.red);
        if (s === 2 && hgt > 1) HT.px(ctx, x, y - 1, C.coral);
      }
    },
  };

  // ---- pit: the hole Red blasts through the street into the dark below (a4_rabbits → the corridor): a jagged black
  //      mouth with the lit far wall of its throat and broken slabs round the lip {at, r (m, 1.6), open (0.25 s)}
  FX.a4pit = {
    dur: 12, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const c = e.at; if (!c) return;
      const u = U(), k = HT.E.outCubic(sat(age / (e.open || 0.25))), r = (e.r || 1.6) * k, seed = e.seed || 21;
      if (r < 0.05) return;
      const fn = a => 0.8 + 0.35 * HT.noise(cos(a) * 2.1 + 4, sin(a) * 2.1, seed);
      const P = u.projPoly(S, u.circle3(c[0], c[1], 0.02, r, 40, fn));
      u.fillPoly(ctx, P, C.dusk);                                                  // the far inner wall catching the light
      const Pin = u.projPoly(S, u.circle3(c[0], c[1] + r * 0.22, 0.02, r * 0.86, 40, fn));
      u.fillPoly(ctx, Pin, C.ink);                                                 // the throat
      u.polyline(ctx, P, C.shadow, true);
      for (let i = 0; i < 14; i++) { // broken slabs tipped round the lip
        const a = h1(i, seed + 1) * TAU, d = r * (1.02 + 0.25 * h1(i, seed + 2)), q = S.project(c[0] + cos(a) * d, c[1] + sin(a) * d, 0.05); if (!q) continue;
        const s = Math.max(1.5, (0.18 + 0.2 * h1(i, seed + 3)) * q.s);
        u.fillPoly(ctx, [q.x - s, q.y, q.x - s * 0.3, q.y - s * 0.7, q.x + s, q.y - s * 0.2, q.x + s * 0.6, q.y + s * 0.3], i % 3 ? C.lilacgrey : C.steel);
      }
    },
  };

  // ---- glint: a screen-space sparkle (e.g. a violet glint in the eyes of an ECU — the idea of Purple) {x, y, col, arm, dur}
  FX.a4glint = {
    dur: 0.6, layer: 'front', sfx: false,
    draw(ctx, age, e) {
      const u = U(), q = age / e.dur, k = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7, arm = R((e.arm || 6) * k);
      if (arm < 1) return;
      u.glow(ctx, e.x, e.y, arm * 2.2, e.col || C.violet, 0.5 * k);
      u.sparkle(ctx, e.x, e.y, arm, e.col2 || C.lavender, C.white);
    },
  };

  // ---- a4halt: flung gravel stopped dead a hand's breadth short by the Infinity — flies, hangs trembling, drops
  //      {from, to, n (14), stop (0.85: fraction of the way), spread (m, 0.7), fly (0.22 s), hold (0.6 s), size (m, 0.2)}
  FX.a4halt = {
    dur: 2.2, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), A = e.from, B = e.to; if (!A || !B) return;
      const n = e.n || 14, stop = e.stop === undefined ? 0.85 : e.stop, fly = e.fly || 0.22, hold = e.hold || 0.6, seed = e.seed || 41, sp = e.spread || 0.7;
      for (let i = 0; i < n; i++) {
        const d0 = h1(i, seed) * 0.08, a = age - d0; if (a < 0) continue;
        const ox = h2(i, seed + 1) * sp, oy = h2(i, seed + 2) * sp * 0.6, oz = h2(i, seed + 3) * sp * 0.6;
        const P = [A[0] + (B[0] - A[0]) * stop + ox, A[1] + (B[1] - A[1]) * stop + oy, A[2] + (B[2] - A[2]) * stop + oz];
        let x, y, z;
        if (a < fly) { const q = HT.E.outCubic(a / fly); x = lerp(A[0], P[0], q); y = lerp(A[1], P[1], q); z = lerp(A[2], P[2], q); }
        else if (a < fly + hold) { const j = floor(a * 30) % 2 ? 0.01 : -0.01; x = P[0] + j; y = P[1]; z = P[2] + j; }
        else { const tf = a - fly - hold; x = P[0]; y = P[1]; z = Math.max(0.05, P[2] - 4.9 * tf * tf); }
        const p = S.project(x, y, z); if (!p) continue;
        const s = Math.max(1.5, (e.size || 0.2) * (0.6 + 0.8 * h1(i, seed + 4)) * p.s), r = h1(i, seed + 5) * TAU + (a > fly + hold ? a * 6 : 0);
        const pts = []; for (let k = 0; k < 5; k++) { const th = r + k / 5 * TAU, rr = s * (0.6 + 0.4 * h1(i * 5 + k, seed + 6)); pts.push(p.x + cos(th) * rr, p.y + sin(th) * rr); }
        u.fillPoly(ctx, pts, i % 3 ? C.lilacgrey : C.dusk);
        u.polyline(ctx, pts, C.shadow, true);
      }
    },
  };

  // ---- POST monitor: the full frame seen as Mei Mei's crow feed on the monitoring room's screens (a4_smile): scanlines,
  //      a slow rolling bar, darkened tube edges, a cool tint and a dark bezel. {tint (C.navy), k (0.16), bezel (px, 7)}
  HT.post = HT.post || {};
  HT.post.a4monitor = (ctx, S, e, age) => {
    const k = e.k === undefined ? 0.16 : e.k, bz = e.bezel === undefined ? 7 : e.bezel;
    HT.fx.fade(ctx, k, e.tint || C.navy);
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = C.ink;
    for (let y = 1; y < H; y += 2) ctx.fillRect(0, y, W, 1);                          // scanlines
    ctx.globalAlpha = 0.1; ctx.fillStyle = C.white;
    const ry = R(((age * 0.35) % 1) * (H + 40)) - 20; ctx.fillRect(0, ry, W, 14);         // rolling bar
    ctx.globalAlpha = 0.35; ctx.fillStyle = C.ink;
    for (let i = 0; i < 10; i++) { ctx.fillRect(bz + i, bz + i, W - 2 * (bz + i), 1); ctx.fillRect(bz + i, H - bz - i - 1, W - 2 * (bz + i), 1); ctx.fillRect(bz + i, bz + i, 1, H - 2 * (bz + i)); ctx.fillRect(W - bz - i - 1, bz + i, 1, H - 2 * (bz + i)); ctx.globalAlpha *= 0.8; }
    ctx.restore();
    HT.rect(ctx, 0, 0, W, bz, C.ink); HT.rect(ctx, 0, H - bz, W, bz, C.ink); HT.rect(ctx, 0, 0, bz, H, C.ink); HT.rect(ctx, W - bz, 0, bz, H, C.ink);
    HT.rect(ctx, bz, bz - 1, W - 2 * bz, 1, C.shadow); HT.rect(ctx, bz, H - bz, W - 2 * bz, 1, C.shadow);
  };

  // ---- agitoBall: Agito folding into itself inside the max-output Blue (a dark knot of feathers and antler shards)
  FX.a4agitoBall = {
    dur: 1.6, layer: 'front', follow: true, sfx: false,
    draw(ctx, age, e, S) {
      const c = at3(S, e.at, S.t), p = pj(S, c); if (!p) return;
      const u = U(), cr = e.crush || 0.9, q = HT.E.inCubic(sat(age / cr)), r = Math.max(2, lerp(e.r0 || 1.3, e.r1 || 0.35, q) * p.s), seed = e.seed || 13;
      const out = sat((e.dur - age) / 0.25);
      if (out <= 0) return;
      for (let i = 0; i < 18; i++) { // shards spiralling in
        const ph = (age * (1.2 + h1(i, seed)) + h1(i, seed + 1)) % 1, th = h1(i, seed + 2) * TAU + age * 6, d = r * (1 + 2.2 * (1 - ph)) * (1 - q * 0.5);
        const x = p.x + cos(th) * d, y = p.y + sin(th) * d * 0.7, s = Math.max(1, r * 0.22 * (1 - ph));
        u.fillPoly(ctx, [x, y - s, x + s * 0.6, y + s, x - s * 0.6, y + s], i % 4 === 0 ? C.sand : i % 3 ? C.charcoal : C.deepteal);
      }
      u.disc(ctx, p.x, p.y, r + 1, C.plum); u.disc(ctx, p.x, p.y, r, C.ink);
      if (r > 5) { u.line(ctx, p.x - r * 0.6, p.y - r * 0.2, p.x + r * 0.5, p.y + r * 0.3, C.charcoal); u.line(ctx, p.x - r * 0.3, p.y + r * 0.5, p.x + r * 0.2, p.y - r * 0.6, C.deepteal); }
    },
  };
})();
