/* DOMAIN CLASH — Act V extras (Hollow Purple, canon ch. 235): staging, act poses/moves, a bare-torso Sukuna variant,
   the act's FX and one post effect. Loads after props.js and before manga/busts/fight (fight.js / busts.js are only
   used at draw time). Nothing here changes a shared module; everything is additive and uniquely named.

     HT.A5          world staging shared by the a5_* (and a6_*) scenes — BLUE is the one constant to align with Act IV
     rig 'sukunaBare'   Sukuna after the Purple: the fight costume with the kimono top burned away (bare torso, ash
                        smudges, the canon arm bands); trousers and belt stay. Same proportions/poses as 'sukuna'.
     poses/moves    a5_* (Gojo in the air, Mahoraga's leap, Sukuna's Piercing-Blood water beam, the barely-standing
                    Sukuna) — registered through HT.onPoses
     FX orb         kind 'red'|'blue', at (ref) | from/to + t0/t1 (scene s) + ease; r (m) or swell [[t, r], ...];
                    minPx; star (twinkle when small); lens (Blue pull warp); pull (converging pull lines); crackle
     FX chantRings  at (ref), scheme 'red'|'blue'|'purple', r (m), rings (3), ringAt [ages] (one ring per phrase),
                    flat, spin — Gojo's incantation made visible, coloured per technique
     FX waterBeam   from (ref, e.g. 'sukuna.hand'), to; travel (s: the head's flight), w (m); bend {at, from, dur}
                    (a pull point: the path swings into it and is swallowed), stopAt (s: the source stops, the tail
                    follows the head in) — the Max Elephant water fired with the Piercing Blood stance
     FX handSign    x, y (screen, bottom-centre), size, sign ('purple'), keys [[age, phase], ...] (phase held between
                    keys unless a key says lerp), face, light, rim — busts.hands close-up on 2s
     FX disintegrate char, pose, at (feet, world) | x/y/px (screen), face, from/dur (the erosion window), dir
                    (screen [dx, dy]: the side facing the blast goes first), mode ('ink' silhouette | 'normal'),
                    opts (rig draw options, e.g. {wheel:false}), last ('top': the top of the sprite erodes last) —
                    pixels peel off and blow away as lavender/white motes (no gore, the body simply ceases)
     FX ashFall     density, wind, ember (0..1 share of glowing embers), col — ash through the light, 3 depths
     FX skyFlash    x/y | at, r (px), col — a soft round bloom (≤ 3 frames bright, local)
     POST purpleGrade  k (0..1) or keys [[age, k], ...] (event ages), col (violet) — the palette turns violet: a
                    value-preserving 'color' blend (the quantizer then snaps it to the plum/purple/violet/lavender
                    ramp), optional lift (lavender screen) for the glare
   ?lab=a5 renders the act's poses on 'sukunaBare', 'gojo' and 'mahoraga' (verification aid). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, rig = HT.rig;
  const FX = (HT.FX = HT.FX || {});
  const clamp = HT.clamp, lerp = HT.lerp, hash = HT.hash;
  const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2, R = Math.round, floor = Math.floor;
  const max = Math.max, min = Math.min, abs = Math.abs, hypot = Math.hypot, sqrt = Math.sqrt, atan2 = Math.atan2;
  const U = () => HT.fxu;                       // fx.js raster helpers (loaded before this file)
  const sat = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const on2 = a => floor(a * 12 + 1e-6) / 12;
  const pwl = (K, t) => { // piecewise-linear keys [[t, v], ...]
    if (!K || !K.length) return 0;
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / max(1e-6, b[0] - a[0]); }
    return K[K.length - 1][1];
  };
  const pj = (S, p) => (Array.isArray(p) ? S.project(p[0], p[1], p[2] || 0) : null);

  // ================================================================== staging (world metres; SPEC §3.5)
  // BLUE: where the Blue that imploded Agito still hangs (Act IV, a4_crush) — the ONE constant to align with Act IV.
  const BLUE = [-40, 60, 160];
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const A5 = (HT.A5 = {
    BLUE,
    G0: add3(BLUE, [160, -200, 30]),        // Gojo hovers here for the chanted Red (a5_red)
    MAHO0: [-2, 34, 0],                      // Mahoraga's launch point (the NS avenue just north of the old junction)
    SUK0: [30, -4, 0],                       // Sukuna fires the water beam from the EW avenue east of the junction
    G2: add3(BLUE, [140, 20, 30]),           // Gojo in the air for the Purple (a5_sky/a5_purple): ~145 m east of the Blue,
                                             // well off the Red's line so the two stars read apart from behind him
    MAHO2: add3(BLUE, [18, -26, 42]),        // Mahoraga at the top of its arc after the uppercut (~53 m)
    SUK2: add3(BLUE, [70, -40, -84]),        // Sukuna rising below (~116 m)
    PR: 240,                                 // the Purple's visible radius (m); the ledger erasure is r 250
    ERASE: { x: BLUE[0], y: BLUE[1], z: BLUE[2], r: 250 },
    SUK_C: [-60, 110, 0],                    // Sukuna in the crater (a5_ash, Act VI)
    G_RIM: [81.7, -113.8, 0],                // Gojo on the south-east rim, 212 m out (inside the building-free 225 m, the
                                             // flattened ring right behind him) (a5_landing, Act VI) — "far across the crater"
    // the Red's flight: fired at a5_red 15.2 s from Gojo's hand, it drifts toward the Blue across three scenes and
    // reaches it at a5_purple ~2.4 s (u along the straight line G0hand → BLUE)
    sunAt(yaw, el) { yaw = yaw === undefined ? -1.23 : yaw; el = el === undefined ? 0.065 : el; return [Math.sin(yaw) * 30000, Math.cos(yaw) * 30000, Math.sin(el) * 30000]; }, // far anchor: the city's sky layer depth-tests FX by their 'at'
    redAt(u) { const a = A5.RED0, b = BLUE; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; },
  });
  A5.RED0 = add3(A5.G0, [-1.2, 1.0, 1.6]);   // roughly Gojo's fingertip at the release

  // ================================================================== Sukuna after the Purple: bare torso
  rig.material('a5_soot', [C.dusk, C.dusk, C.lilacgrey, C.lilacgrey], { flat: true });
  const clipHalf = (pts, f) => { // Sutherland–Hodgman against f(p) >= 0
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  const SUK = rig.CHARS.sukuna;
  if (SUK) rig.define({
    name: 'sukunaBare', height: SUK.height, prop: SUK.prop, margin: SUK.margin, extraTop: SUK.extraTop,
    build(T) {
      const white = rig.mat('whiteCloth'), black = rig.mat('black'), skin = rig.mat('skin'), mark = rig.mat('mark'), soot = rig.mat('a5_soot');
      const J = T.J, hip = J.hip, ch = J.chest, L = hypot(ch[0] - hip[0], ch[1] - hip[1]) || 1e-6, up = [(ch[0] - hip[0]) / L, (ch[1] - hip[1]) / L];
      const sOf = p => ((p[0] - hip[0]) * up[0] + (p[1] - hip[1]) * up[1]) / L;
      const back = T.P.view === 'back';
      let nW = 0, nB = 0;
      const P = Object.create(T);
      // his left hand is gone (canon ch. 235) and must never read as a stump: in the side view facing screen-right
      // (the only framing used for this character) the left arm is the far arm, and only its upper arm is drawn — the
      // forearm reads as held in front of the body, hidden by it. Facing screen-left, frontal AND back views are never
      // used: from behind the lone upper arm ends at the elbow and reads like a stump (checked in ?lab=a5), so no
      // back-view poses exist for him (the drop below still applies there as a safety net).
      const drop = (T.P.view === 'side' && T.face > 0) || back ? 'fa' : null;
      if (drop) {
        const E = J[drop + 'E'], Wr = J[drop + 'W'], ex = Wr[0] - E[0], ey = Wr[1] - E[1], l2 = ex * ex + ey * ey || 1e-9;
        const onFore = p => { const u2 = ((p[0] - E[0]) * ex + (p[1] - E[1]) * ey) / l2; return u2 > 0.25 && u2 < 1.6 && abs((p[0] - E[0]) * ey - (p[1] - E[1]) * ex) / sqrt(l2) < T.prop.limb * 2.5; };
        P.P = Object.assign({}, T.P, { fh: 'none' });
        const zs = back ? [12] : [1, 2]; // the far arm's layers (side: arm 1, hand 2; back: frontBody's far arm 12)
        P.cap = (a, b, ra, rb, mat, z, dt, ft) => { if (zs.includes(z) && (a === E || onFore(a) && onFore(b))) return; T.cap(a, b, ra, rb, mat, z, dt, ft); };
        P.ell = (c, rx, ry, rot, mat, z, dt, ft) => { if (zs.includes(z) && onFore(c)) return; T.ell(c, rx, ry, rot, mat, z, dt, ft); };
        P.zs = zs;
      }
      P.poly = (pts, mat, z, dt, ft, axis) => {
        if (mat === white && z === 5 && ++nW === 1) { // the kimono top (side) / the torso (front, back): skin above the belt
          T.poly(pts, mat, z, dt, ft, axis);
          const top = clipHalf(pts, p => sOf(p) - 0.13);
          if (top.length >= 3) T.poly(top, skin, z, dt, ft, axis);
          return;
        }
        if (mat === black && z === 6 && !back && ++nB === 1) return; // the undershirt in the V
        T.poly(pts, mat, z, dt, ft, axis);
      };
      P.line = (a, b, mat, tone, z, w) => { // the collar line goes with the kimono; the wrist bands with the forearm
        if (mat === white && z === 6) return;
        if (drop && mat === mark && P.zs.includes(z)) { const m2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], E = J[drop + 'E'], Wr = J[drop + 'W'], ex = Wr[0] - E[0], ey = Wr[1] - E[1], u2 = ((m2[0] - E[0]) * ex + (m2[1] - E[1]) * ey) / (ex * ex + ey * ey || 1e-9); if (u2 > 0.3 && u2 < 1.3 && hypot(m2[0] - (E[0] + ex * u2), m2[1] - (E[1] + ey * u2)) < T.prop.limb * 2.5) return; }
        T.line(a, b, mat, tone, z, w);
      };
      SUK.build.call(this, P);
      if (T.lod < 2) return;
      // torso details (the kimono is gone): chest marks, an abdomen mark, ash smudges
      if (T.P.view === 'side') {
        const fw = [up[1], -up[0]], pr = T.prop, tw = 1 + 0.35 * (T.P.twist === undefined ? 0.35 : T.P.twist), wc = pr.chest * tw * 0.5, ww = pr.waist * tw * 0.5;
        const tp = (s, f) => [hip[0] + up[0] * s * L + fw[0] * f, hip[1] + up[1] * s * L + fw[1] * f];
        T.line(tp(0.78, wc * 0.95), tp(0.7, wc * 0.25), mark, 0, 6);
        T.line(tp(0.46, ww * 0.95), tp(0.42, ww * 0.35), mark, 0, 6);
        T.dot(tp(0.6, -wc * 0.3), soot, 0, 6, 2, 1); T.dot(tp(0.3, ww * 0.1), soot, 0, 6, 1, 1); T.dot(tp(0.86, -wc * 0.6), soot, 0, 6, 1, 1);
      } else {
        const rt = [up[1], -up[0]], sw = T.prop.shoulderW / 2, ww = T.prop.waist * 0.8;
        const tp = (s, f) => [hip[0] + up[0] * s * L + rt[0] * f, hip[1] + up[1] * s * L + rt[1] * f];
        if (!back) {
          for (const s of [-1, 1]) T.line(tp(0.8, s * sw * 0.18), tp(0.74, s * sw * 0.72), mark, 0, 6);
          T.line(tp(0.44, -ww * 0.3), tp(0.44, ww * 0.3), mark, 0, 6);
          T.dot(tp(0.6, sw * 0.4), soot, 0, 6, 2, 1); T.dot(tp(0.3, -ww * 0.5), soot, 0, 6, 1, 1);
        } else {
          T.line(tp(0.9, -sw * 0.1), tp(0.25, -sw * 0.04), soot, 0, 6); // the spine groove in ash
          T.dot(tp(0.7, sw * 0.5), soot, 0, 6, 2, 1); T.dot(tp(0.5, -sw * 0.6), soot, 0, 6, 1, 1); T.dot(tp(0.85, sw * 0.1), soot, 0, 6, 1, 1);
        }
      }
    },
  });

  // ================================================================== poses + moves (a5_*)
  HT.onPoses.push(rg => {
    const PO = rg.POSES, MV = rg.MOVES;
    const def = (name, o, base) => { PO[name] = rg.full(Object.assign({}, base ? PO[base] : {}, o)); return PO[name]; };
    const mv = (name, o) => { o.name = name; o.len = o.keys[o.keys.length - 1][0]; MV[name] = o; return o; };
    // ---- Gojo, high above the city
    def('a5_hover', { root: [0, 0.02], lean: -2, neck: 2, head: -2, twist: 0.35, na: [10, 22, 0], fa: [4, 26, 0], nl: [8, 18, -28], fl: [-6, 30, -38], nh: 'relaxed', fh: 'relaxed', eyes: 'open' });
    def('a5_hoverLook', { neck: -10, head: -8 }, 'a5_hover');
    def('a5_chantRed', { root: [0, 0.02], lean: 0, neck: 0, head: 2, twist: 0.5, na: [64, 118, 0], fa: [4, 24, 0], nl: [8, 16, -28], fl: [-6, 28, -38], nh: 'point', fh: 'relaxed', eyes: 'narrow' });
    def('a5_fireRed', { root: [0.02, 0.02], lean: 8, neck: -4, twist: 0.6, na: [96, 2, -16], fa: [-12, 24, 0], nl: [16, 20, -24], fl: [-12, 26, -36], nh: 'point', fh: 'relaxed', eyes: 'glare' });
    def('a5_ride', { root: [0.06, 0.05], lean: 58, neck: -30, head: -8, twist: 0.4, na: [-36, 96, 0], fa: [-52, 18, 0], nl: [-10, 32, -20], fl: [-30, 52, -30], nh: 'fist', fh: 'relaxed', eyes: 'glare' });
    def('a5_upperA', { root: [0.02, 0.02], lean: 30, neck: -12, head: -6, twist: 0.3, na: [-24, 104, 0], fa: [30, 100, 0], nl: [30, 60, -10], fl: [-20, 50, -20], nh: 'fist', fh: 'fist', eyes: 'glare' });
    def('a5_upper', { root: [0.04, 0.05], lean: -10, neck: -16, head: -10, twist: 0.75, na: [166, 30, 0], fa: [10, 100, 0], nl: [24, 30, -20], fl: [-30, 40, 20], nh: 'fist', fh: 'fist', eyes: 'glare' });
    def('a5_chantBlue', { root: [0, 0.02], lean: 4, neck: -2, twist: 0.55, na: [84, 14, 0], fa: [-6, 24, 0], nl: [10, 18, -28], fl: [-8, 28, -38], nh: 'two', fh: 'relaxed', eyes: 'glare' });
    def('a5_signFront', { view: 'front', lean: 0, head: -2, na: [36, 118, 0], fa: [14, 30, 0], nl: [8, 10, 0], fl: [8, 14, 0], nh: 'sign', fh: 'relaxed', eyes: 'glow' });
    def('a5_openFront', { view: 'front', lean: 0, head: -4, na: [74, 20, 0], fa: [14, 30, 0], nl: [8, 10, 0], fl: [8, 14, 0], nh: 'open', fh: 'relaxed', eyes: 'glow' });
    def('a5_brace', { root: [0, 0.02], lean: 10, neck: 8, head: 6, twist: 0.3, na: [70, 120, 0], fa: [60, 124, 0], nl: [30, 50, -20], fl: [-10, 60, -30], nh: 'fist', fh: 'fist', eyes: 'closed' });
    def('a5_descend', { root: [0, 0.02], lean: 4, neck: 10, head: 8, twist: 0.3, na: [18, 20, 0], fa: [10, 24, 0], nl: [6, 10, -30], fl: [-4, 16, -40], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
    def('a5_landBend', { root: [0, -0.1], lean: 26, neck: 12, head: 10, twist: 0.3, na: [-14, 26, 0], fa: [-22, 30, 0], nl: [44, 76, 6], fl: [-8, 60, 20], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow', face: 'open' });
    def('a5_breathe', { root: [0, -0.03], lean: 20, neck: 10, head: 14, twist: 0.3, na: [-12, 24, 0], fa: [-20, 26, 0], nl: [14, 18, 0], fl: [-8, 12, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow', face: 'open' });
    def('a5_breatheUp', { root: [0, -0.01], lean: 6, neck: 0, head: -6, twist: 0.3, na: [-2, 20, 0], fa: [-8, 22, 0], nl: [8, 8, 0], fl: [-6, 6, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow', face: 'smile' });
    def('a5_backStand', { view: 'back', lean: 2, head: 4, na: [10, 14, 0], fa: [10, 14, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'relaxed', fh: 'relaxed' });
    def('a5_backPockets', { view: 'back', lean: 0, head: 6, na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket' });
    mv('a5_airUpper', { keys: [[0, 'a5_ride'], [4, 'a5_upperA'], [8, 'a5_upper'], [20, 'a5_upper'], [34, 'a5_hover']], contact: 8, startup: 8, active: 12, recovery: 14, hitstop: 7, strength: 3, root: [[0, 0], [8, 0.4], [34, 0.5]], lift: [[0, 0], [8, 0.3], [34, 0.8]], smear: { limb: 'na', from: 4, to: 8 }, sfx: { 4: 'whooshL' } });
    // ---- Mahoraga
    def('a5_mahoCrouch', { root: [0, -0.16], lean: 30, neck: -34, head: -18, twist: 0.3, na: [-40, 30, 0], fa: [-50, 30, 0], nl: [80, 120, 10], fl: [30, 110, 30], nh: 'fist', fh: 'fist' });
    def('a5_mahoLeap', { root: [0, 0.03], lean: 4, neck: -26, head: -14, twist: 0.35, na: [172, 16, 0], fa: [150, 30, 0], nl: [-6, 24, -30], fl: [-26, 44, -40], nh: 'fist', fh: 'open' });
    def('a5_mahoTumble', { root: [0, 0.04], lean: -64, neck: -30, head: -18, twist: 0.25, na: [-90, 34, 0], fa: [-124, 22, 0], nl: [44, 70, 0], fl: [12, 92, 0], nh: 'open', fh: 'open', face: 'open' });
    def('a5_mahoHang', { root: [0, 0.03], lean: -18, neck: -20, head: -10, twist: 0.3, na: [40, 60, 0], fa: [-30, 50, 0], nl: [30, 60, -10], fl: [-10, 70, -20], nh: 'fist', fh: 'open' });
    // ---- Sukuna (poses work on 'sukuna' and 'sukunaBare'; after the Purple he always faces screen-right so the far
    //      arm — his left — stays behind the body: the lost hand is never shown)
    def('a5_sukLook', { lean: -6, neck: -22, head: -18, twist: 0.35, na: [6, 14, 0], fa: [-6, 12, 0], nl: [8, 6, 0], fl: [-8, 4, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow', face: 'grin' });
    def('a5_sukBeamA', { root: [0, -0.02], lean: 2, neck: -8, head: -6, twist: 0.4, na: [72, 122, 0], fa: [68, 126, 0], nl: [18, 20, 0], fl: [-18, 12, 0], nh: 'flat', fh: 'flat', eyes: 'narrow', face: 'grit' });
    def('a5_sukBeam', { root: [0.02, -0.03], lean: -10, neck: -16, head: -12, twist: 0.5, na: [132, 6, 0], fa: [128, 10, 0], nl: [30, 30, 0], fl: [-26, 12, 0], nh: 'point', fh: 'point', eyes: 'glare', face: 'grit' });
    def('a5_sukLeap', { root: [0, 0.03], lean: 10, neck: -20, head: -12, twist: 0.4, na: [150, 30, 0], fa: [-30, 40, 0], nl: [10, 40, -20], fl: [-30, 60, -30], nh: 'fist', fh: 'none', eyes: 'narrow' });
    def('a5_sukGuard', { root: [0, 0.02], lean: 20, neck: 12, head: 10, twist: 0.2, na: [80, 126, 0], fa: [60, 130, 0], nl: [40, 70, -10], fl: [0, 80, -20], nh: 'fist', fh: 'fist', eyes: 'closed', face: 'grit' });
    def('a5_sukBurnt', { root: [0, -0.04], lean: 16, neck: 16, head: 12, twist: 0.2, na: [-12, 14, 0], fa: [-14, 64, 0], nl: [14, 22, 0], fl: [-10, 16, 0], nh: 'relaxed', fh: 'none', eyes: 'narrow', face: 'grit' });
    def('a5_sukSway', { root: [-0.01, -0.05], lean: 22, neck: 20, head: 14 }, 'a5_sukBurnt');
    def('a5_sukKneel', { root: [0.0, -0.22], lean: 18, neck: 14, head: 10, twist: 0.2, na: [20, 30, 0], fa: [-14, 70, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'fist', fh: 'none', eyes: 'closed' });
    def('a5_sukRise', { root: [0, -0.06], lean: 14, neck: 6, head: 4, twist: 0.25, na: [-6, 30, 0], fa: [-14, 70, 0], nl: [26, 42, 0], fl: [-14, 30, 0], nh: 'relaxed', fh: 'none', eyes: 'narrow' });
    def('a5_sukStand', { root: [0, 0], lean: -2, neck: -2, head: -2, twist: 0.3, na: [6, 12, 0], fa: [-14, 66, 0], nl: [4, 3, 0], fl: [-6, 2, 0], nh: 'relaxed', fh: 'none', eyes: 'narrow', face: 'neutral' });
  });

  // ================================================================== FX: orb (the Red / the Blue as objects in the sky)
  const ORB = {
    red: { glow: C.red, halo: C.crimson, rim: C.crimson, body: C.red, hi: C.coral, core: C.white, star: C.salmon },
    blue: { glow: C.blue, halo: C.sky, rim: C.sky, body: C.navy, hi: C.ice, core: C.white, star: C.ice },
  };
  FX.orb = {
    dur: 20, layer: 'behind', follow: true,
    draw(ctx, age, e, S) {
      const u = U(), t = e.t + age, pal = ORB[e.kind] || ORB.red, seed = e.seed;
      let P = e.at;
      if (e.from && e.to) {
        const t0 = e.t0 === undefined ? e.t : e.t0, t1 = e.t1 === undefined ? e.t + e.dur : e.t1;
        const k = (HT.E[e.ease || 'linear'] || HT.E.linear)(sat((t - t0) / max(1e-3, t1 - t0)));
        P = [lerp(e.from[0], e.to[0], k), lerp(e.from[1], e.to[1], k), lerp(e.from[2], e.to[2], k)];
      }
      const p = pj(S, P); if (!p) return;
      const rw = e.swell ? pwl(e.swell, t) : (e.r || 1), fade = e.out ? sat((e.dur - age) / e.out) : 1, fin = e.in ? sat(age / e.in) : 1, k = fade * fin;
      if (k <= 0.01) return;
      const rp = max(e.minPx || 1.2, rw * p.s), x = p.x, y = p.y, tq = on2(age);
      if (e.lens && rp > 2.5 && k > 0.5) { // the Blue's attraction bends the view around it (point-lens map, as fx.js blueOrb)
        const tE = rp * 1.3 * sqrt(e.lens), Rw = min(max(rp * 3.6, rp + 12), 140);
        u.warp(ctx, x, y, Rw, dd => { const w = 1 - dd / Rw, s2 = w * w * (3 - 2 * w); return dd - ((tE * tE) / max(dd, 0.75)) * s2; });
      }
      u.glow(ctx, x, y, rp * (e.glowK || 2.6) + 4, pal.glow, 0.42 * k);
      u.glow(ctx, x, y, rp * 1.6 + 2, pal.halo, 0.4 * k);
      if (e.pull && rp > 6) { // manga pull lines converging on the Blue (redrawn on 2s)
        const gi = floor(age * 12), n = e.pull === true ? 12 : e.pull;
        for (let i = 0; i < n; i++) { if ((i + gi) % 2) continue; const a = hash(i + gi * 13, seed) * TAU, r1 = rp * (3.2 + 1.4 * hash(i, seed + gi)), r2 = rp * (1.6 + 0.4 * hash(i + 5, seed)); u.line(ctx, x + cos(a) * r1, y + sin(a) * r1, x + cos(a) * r2, y + sin(a) * r2, u.dcol(pal.hi, 0.6 * k)); }
      }
      if (rp < (e.starBelow || 4.5)) { // far: a star with twinkling arms
        const arm = R(2 + rp + (e.star === false ? 0 : 2 * (0.5 + 0.5 * sin(tq * 7 + seed))));
        u.sparkle(ctx, x, y, arm, u.dcol(pal.star, k), null);
        u.disc(ctx, x, y, rp + 0.6, u.dcol(pal.rim, k)); u.sq(ctx, x, y, rp > 1.8 ? 2 : 1, u.dcol(pal.core, k));
        return;
      }
      if (e.kind === 'blue') {
        u.disc(ctx, x, y, rp + 1.5, u.dcol(C.sky, k)); u.disc(ctx, x, y, rp + 0.5, u.dcol(C.ice, k)); u.disc(ctx, x, y, rp - 0.5, u.dcol(C.navy, k));
        u.disc(ctx, x + rp * 0.08, y + rp * 0.1, rp * 0.72, u.dcol(C.ink, k));
        for (let j = 0; j < 3; j++) { // swirl arcs
          const rr = rp * (1.2 + 0.28 * j) + 1.5, a0 = hash(j, seed) * TAU + (j % 2 ? -1 : 1) * (5 - j) * tq, m = 10;
          for (let s = 0; s < m; s++) { const a1 = a0 + s * 0.16, a2 = a1 + 0.16; u.line(ctx, x + cos(a1) * rr, y + sin(a1) * rr * 0.42, x + cos(a2) * rr, y + sin(a2) * rr * 0.42, u.dcol(s === m - 1 ? C.white : C.ice, 0.85 * k)); }
        }
      } else {
        u.disc(ctx, x, y, rp + 1, u.dcol(C.crimson, k)); u.disc(ctx, x, y, rp, u.dcol(C.red, k));
        u.disc(ctx, x - rp * 0.08, y - rp * 0.08, rp * 0.68, u.dcol(C.coral, k)); u.disc(ctx, x - rp * 0.1, y - rp * 0.12, rp * 0.4, u.dcol(C.white, k));
        if (e.crackle !== false) { // crackling sparks (2s)
          const rng = HT.rng(seed * 31 + floor(age * 12) * 977);
          for (let i = 0; i < 4; i++) { const a = rng() * TAU, r0 = rp * (0.95 + 0.2 * rng()), L = rp * (0.5 + 0.8 * rng()) + 2; u.polyline(ctx, u.bolt(x + cos(a) * r0, y + sin(a) * r0, x + cos(a) * (r0 + L), y + sin(a) * (r0 + L), 0.7, 2, rng), i % 2 ? C.coral : C.white); }
        }
      }
    },
  };

  // ================================================================== FX: chantRings (glyphRings in the technique's colour)
  const SCHEMES = {
    red: { glow: C.red, line: C.crimson, line2: C.coral, g1: C.salmon, g2: C.coral, hi: C.white },
    blue: { glow: C.blue, line: C.blue, line2: C.sky, g1: C.ice, g2: C.sky, hi: C.white },
    purple: { glow: C.violet, line: C.violet, line2: C.lavender, g1: C.lavender, g2: C.ice, hi: C.white },
  };
  FX.chantRings = {
    dur: 4, layer: ['behind', 'front'], follow: true,
    draw(ctx, age, e, S) {
      const u = U(), p = e.x !== undefined ? { x: e.x, y: e.y, s: 1 } : pj(S, e.at); if (!p) return; // e.x/e.y: screen mode
      const sc = SCHEMES[e.scheme] || SCHEMES.purple, Rb = e.px || max(16, (e.r || 1.2) * p.s), nR = e.rings || 3, fl = e.flat === undefined ? 1 : e.flat, seed = e.seed;
      const ringAt = e.ringAt || Array.from({ length: nR }, (_, i) => i * (e.stagger === undefined ? 0.35 : e.stagger));
      const out = sat((e.dur - age) / (e.out || 0.5));
      if (S.fxLayer === 'behind') {
        const n = ringAt.filter(a => age >= a).length;
        u.glow(ctx, p.x, p.y, Rb * (0.4 + 0.14 * n), sc.glow, (e.glow === undefined ? 0.2 : e.glow) * out * sat(age / 0.4));
        if (!e.back) return;
      } else if (e.back) return;
      const spin = e.spin === undefined ? 1 : e.spin;
      for (let kR = 0; kR < nR; kR++) {
        const a0 = age - ringAt[kR]; if (a0 < 0) continue;
        const s1 = HT.E.outBack(min(1, a0 / 0.3)), rr = Rb * (0.5 + 0.34 * kR) * s1, w = (kR % 2 ? -1 : 1) * (0.5 + 0.2 * kR) * spin, rot = w * age + hash(kR, seed) * TAU;
        const flash = a0 < 0.2 ? 1 - a0 / 0.2 : 0; // each phrase lands with a brief brightening of its ring
        const lc = u.dcol(flash > 0.4 ? sc.hi : kR === nR - 1 ? sc.line2 : sc.line, 0.9 * out);
        u.annulus(ctx, p.x, p.y, rr + 4, rr + 5, lc, fl); u.annulus(ctx, p.x, p.y, rr - 6, rr - 5, lc, fl);
        for (let q = 0; q < 24; q++) { const a = rot + (q / 24) * TAU; u.line(ctx, p.x + cos(a) * (rr + 5), p.y + sin(a) * (rr + 5) * fl, p.x + cos(a) * (rr + 7), p.y + sin(a) * (rr + 7) * fl, lc); }
        const big = rr > 36, gw = big ? 5 : 3, gh = big ? 7 : 5, count = max(6, floor((TAU * rr) / (gw + 4)));
        for (let j = 0; j < count; j++) {
          if (out < 1 && hash(j, seed + kR) > out) continue;
          const a = rot + (j / count) * TAU, X = p.x + cos(a) * rr, Y = p.y + sin(a) * rr * fl;
          const hl = ((j / count + age * 0.35 * (kR % 2 ? -1 : 1)) % 1 + 1) % 1 < 0.08;
          ctx.drawImage(u.glyph(big ? 'l' : 's', floor(hash(j * 7 + kR, seed + 5) * 1e6), hl || flash > 0.5 ? sc.hi : kR % 2 ? sc.g2 : sc.g1), R(X - gw / 2), R(Y - gh / 2));
        }
      }
    },
  };

  // ================================================================== FX: waterBeam (Sukuna's Piercing-Blood water jet)
  const bez = (a, c, b, s) => { const v = 1 - s; return [a[0] * v * v + 2 * c[0] * v * s + b[0] * s * s, a[1] * v * v + 2 * c[1] * v * s + b[1] * s * s, a[2] * v * v + 2 * c[2] * v * s + b[2] * s * s]; };
  FX.waterBeam = {
    dur: 4, layer: 'front', follow: true, sfx: 'waterJet', vol: 0.8,
    draw(ctx, age, e, S) {
      const u = U(), seed = e.seed, A = e.from, B0 = e.to; if (!A || !B0) return;
      const travel = e.travel || 0.5, wm = e.w || 0.22;
      // the path: straight A → B0, swinging toward the pull point (bend.at) as the bend grows; its end becomes the pull point
      let m = 0, Bp = B0;
      if (e.bend) { m = HT.E.inOutCubic(sat((age - (e.bend.from || 0)) / (e.bend.dur || 0.8))); Bp = e.bend.at; }
      const B = [lerp(B0[0], Bp[0], m), lerp(B0[1], Bp[1], m), lerp(B0[2], Bp[2], m)];
      const mid = [lerp(A[0], B0[0], 0.55), lerp(A[1], B0[1], 0.55), lerp(A[2], B0[2], 0.55)], Cp = [lerp(mid[0], B0[0], m * 0.5), lerp(mid[1], B0[1], m * 0.5), lerp(mid[2], B0[2], m * 0.5)];
      const head = sat(age / travel), tail = e.stopAt !== undefined ? sat((age - e.stopAt) / (e.tailDur || 0.6)) : 0;
      if (tail >= 1) return;
      const N = 22, pts = [];
      for (let i = 0; i <= N; i++) { const s = tail + (head - tail) * (i / N), q = pj(S, bez(A, Cp, B, s)); if (q) pts.push([q.x, q.y, q.s, s]); }
      if (pts.length < 2) return;
      const fl = floor(age * 12);
      for (let i = 0; i + 1 < pts.length; i++) { // three tapered bands (spray, body, core), ragged on 2s
        const a = pts[i], b = pts[i + 1], wa = max(1, wm * a[2]), wb = max(1, wm * b[2]), j = 1 + 0.25 * (hash(i + fl * 7, seed) - 0.5);
        u.taper(ctx, a[0], a[1], b[0], b[1], wa * 3.2 * j, wb * 3.2 * j, u.dcol(C.teal, 0.45));
        u.taper(ctx, a[0], a[1], b[0], b[1], wa * 1.9, wb * 1.9, C.aqua);
        u.taper(ctx, a[0], a[1], b[0], b[1], max(1, wa * 0.8), max(1, wb * 0.8), i % 3 === fl % 3 ? C.white : C.foam);
      }
      for (let i = 0; i < 26; i++) { // droplets streaming along and off the beam
        const s = (hash(i, seed) + age * 1.8) % 1, idx = min(pts.length - 1, floor(s * (pts.length - 1))), P = pts[idx], off = (hash(i, seed + 3) - 0.5) * max(3, wm * P[2] * 7);
        u.sq(ctx, P[0] + off, P[1] - off * 0.6, hash(i, seed + 4) < 0.3 ? 2 : 1, i % 3 ? C.foam : C.white);
      }
      const hd = pts[pts.length - 1];
      if (head < 1 || !e.bend) { // the head: a spray burst
        const r0 = min(18, max(3, wm * hd[2] * 2));
        u.glow(ctx, hd[0], hd[1], r0 * 2.4, C.aqua, 0.5);
        for (let i = 0; i < 10; i++) { const a = hash(i + fl * 3, seed + 9) * TAU, rr = r0 * (0.6 + 1.2 * hash(i, seed + fl)); u.sq(ctx, hd[0] + cos(a) * rr, hd[1] + sin(a) * rr, 1, i % 2 ? C.white : C.foam); }
      }
      if (tail < 0.02) { const s0 = pts[0]; u.glow(ctx, s0[0], s0[1], min(26, max(3, wm * s0[2] * 1.6)), C.foam, 0.55); } // the muzzle mist
    },
  };

  // ================================================================== FX: handSign (close-up of a hand sign, on 2s)
  // keys: [[age, phase(, 'lerp')], ...]: the phase holds a key's value until the next key; a key marked 'lerp' eases
  // from the previous value (busts.hands' purple interpolation adds its own snap between A → B → C)
  const handPhase = (K, a) => {
    if (!K || !K.length) return 0;
    if (a <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      const k0 = K[i - 1], k1 = K[i];
      if (a < k1[0]) return k1[2] === 'lerp' ? lerp(k0[1], k1[1], HT.E.inOutQuad((a - k0[0]) / max(1e-3, k1[0] - k0[0]))) : k0[1];
    }
    return K[K.length - 1][1];
  };
  const handOpts = (e, S) => ({ size: e.size || 200, phase: 0, face: e.face || 1, light: e.light || (S && S.light) || [-0.6, -0.4, 0.7], rim: e.rim || C.gold, rimDir: e.rimDir, costume: e.costume || 'fight' });
  FX.handSign = {
    dur: 6, layer: 'front',
    draw(ctx, age, e, S) {
      if (!HT.busts || !HT.busts.hands) return;
      const tq = on2(age), ph = Math.round(handPhase(e.keys, tq) * 100) / 100;
      const o = Object.assign(handOpts(e, S), { phase: ph });
      const k = e.in ? sat(age / e.in) : 1, dy = R((1 - HT.E.outCubic(k)) * 30);
      HT.busts.hands(ctx, e.who || 'gojo', e.sign || 'purple', e.x === undefined ? W / 2 : e.x, (e.y === undefined ? H : e.y) + dy, o.size, o);
    },
  };
  // the distinct drawings a handSign event will need (for pre-warming in a scene's init: ~30 ms each, one per slice)
  A5.handJobs = (e, S) => {
    const out = new Map(), dur = e.dur || 6;
    for (let a = 0; a < dur; a += 1 / 12) { const ph = Math.round(handPhase(e.keys, on2(a)) * 100) / 100; if (!out.has(ph)) out.set(ph, Object.assign(handOpts(e, S), { phase: ph })); }
    return [...out.values()];
  };

  // ================================================================== FX: disintegrate
  const disCache = HT.lru(8);
  HT.caches.push({ name: 'a5.disintegrate', size: () => disCache.size });
  function spriteData(char, pose, px, face, mode, opts, light) {
    const P = typeof pose === 'string' ? (rig.POSES[pose] || rig.POSES.stand) : pose;
    const key = [char, typeof pose === 'string' ? pose : 'obj', px, face, mode || 'n', JSON.stringify(opts || {}), light ? light.join(',') : ''].join('|');
    let d = disCache.get(key);
    if (d) return d;
    const r = rig.render(char, Object.assign({}, P, opts || {}), px, Object.assign({ face, light, mode: mode === 'normal' ? undefined : mode, key: null }, opts || {}));
    const w = r.canvas.width, h = r.canvas.height, img = r.canvas.getContext('2d').getImageData(0, 0, w, h), px32 = new Uint32Array(img.data.buffer);
    const idx = [];
    for (let i = 0; i < w * h; i++) if (px32[i] >>> 24) idx.push(i);
    d = { w, h, ox: r.ox, oy: r.oy, px32, idx: Int32Array.from(idx), J: r.J, S: r.S, face: r.face };
    return disCache.set(key, d);
  }
  const MOTE = [C.white, C.blush, C.lavender, C.violet], MOTE_INK = [C.ink, C.plum, C.violet, C.lavender], MOTE_GOLD = [C.butter, C.gold, C.white, C.blush];
  const disBuf = { c: null, g: null, img: null, w: 0, h: 0 };
  FX.disintegrate = {
    dur: 6, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U();
      let x, y, px;
      if (e.at) { const p = pj(S, e.at); if (!p) return; x = p.x; y = p.y; px = R((rig.CHARS[e.char || 'mahoraga'] || { height: 1.8 }).height * p.s * (e.scale || 1)); }
      else { x = e.x; y = e.y; px = R(e.px || 120); }
      if (!(px >= 8)) return;
      px = Math.min(px, 420);
      const d = spriteData(e.char || 'mahoraga', e.pose || 'maho_idle', px, e.face || 1, e.mode || 'ink', e.opts, S.light);
      const from = e.from || 0, span = e.span || e.dur * 0.8, q = (age - from) / span; // q: erosion progress
      const dir = e.dir || [1, 0], dl = hypot(dir[0], dir[1]) || 1, dx = dir[0] / dl, dy = dir[1] / dl;
      const w = d.w, h = d.h, x0 = R(x - d.ox), y0 = R(y - d.oy);
      const seed = e.seed | 0, lastTop = e.last === 'top';
      // per-pixel threshold τ (cached per sprite + direction): blocky noise (2×2 cells) + the side facing the blast
      // first (+ the top of the sprite last if e.last === 'top')
      const tk = dx.toFixed(2) + ',' + dy.toFixed(2) + '|' + seed + '|' + (lastTop ? 1 : 0);
      if (!d.tau || d.tauKey !== tk) {
        const T2 = new Float32Array(d.idx.length), den = 0.5 * (abs(dx) * w + abs(dy) * h) + 1;
        for (let n = 0; n < d.idx.length; n++) {
          const i = d.idx[n], xx = i % w, yy = (i / w) | 0, pr = ((xx - w / 2) * dx + (yy - h / 2) * dy) / den;
          let tau = 0.55 * hash((xx >> 1) * 7919 + (yy >> 1), seed + 17) + 0.45 * (0.5 - 0.5 * pr);
          if (lastTop) tau = tau * 0.75 + 0.25 * (1 - yy / h);
          T2[n] = tau;
        }
        d.tau = T2; d.tauKey = tk;
      }
      if (!disBuf.c || disBuf.w < w || disBuf.h < h) { disBuf.w = max(w, disBuf.w); disBuf.h = max(h, disBuf.h); const cv = HT.canvas(disBuf.w, disBuf.h); disBuf.c = cv.c; disBuf.g = cv.g; disBuf.img = cv.g.createImageData(disBuf.w, disBuf.h); }
      const out = disBuf.img, o32 = new Uint32Array(out.data.buffer), BW = disBuf.w;
      o32.fill(0);
      const life = e.life || 1.4, motes = [], TAUS = d.tau;
      for (let n = 0; n < d.idx.length; n++) {
        const i = d.idx[n], xx = i % w, yy = (i / w) | 0, tau = TAUS[n];
        if (tau > q) { o32[yy * BW + xx] = d.px32[i]; continue; }
        // released at age tr (when q passed tau): a mote drifting with the blast, up and away, fading through the violets
        const tr = from + tau * span, a = age - tr;
        if (a < 0 || a > life || (n % (e.every || 3))) continue;
        const v = 40 + 70 * hash(n, seed + 3), lift = 18 + 30 * hash(n, seed + 5);
        const mx = x0 + xx + (dx * v * a + (hash(n, seed + 7) - 0.5) * 30 * a), my = y0 + yy + (dy * v * a - lift * a - 12 * a * a);
        motes.push(mx, my, a / life);
      }
      disBuf.g.putImageData(out, 0, 0, 0, 0, w, h);
      if (e.alpha !== undefined && e.alpha < 1) { const oa = ctx.globalAlpha; ctx.globalAlpha = oa * e.alpha; ctx.drawImage(disBuf.c, 0, 0, w, h, x0, y0, w, h); ctx.globalAlpha = oa; }
      else ctx.drawImage(disBuf.c, 0, 0, w, h, x0, y0, w, h);
      const MC = e.motes === 'gold' ? MOTE_GOLD : (e.mode || 'ink') === 'ink' ? MOTE_INK : MOTE;
      for (let k = 0; k < motes.length; k += 3) { const f = motes[k + 2]; u.sq(ctx, motes[k], motes[k + 1], f < 0.3 ? 2 : 1, MC[min(3, floor(f * 4))]); }
    },
  };

  // ================================================================== FX: ashFall (ash + embers through the light, 3 depths)
  FX.ashFall = {
    dur: 20, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(), c = S.cam || { yaw: 0, pitch: 0, x: 0, y: 0, z: 1.5, f: 480 }, t = e.t + age, dens = e.density === undefined ? 0.6 : e.density;
      const wind = e.wind === undefined ? 0.5 : e.wind, f = c.f || 480, lat = c.x * cos(c.yaw) - c.y * sin(c.yaw), TWd = W + 96, THd = H + 96;
      const Ls = [[40, 120, 1, C.dusk], [14, 70, 1, C.lilacgrey], [5, 26, 2, C.steel]];
      const ember = e.ember === undefined ? 0.15 : e.ember, k0 = e.in ? sat(age / e.in) : 1, k1 = e.out ? sat((e.dur - age) / e.out) : 1, kk = k0 * k1;
      for (let li = 0; li < 3; li++) {
        const [D, cnt, s, col] = Ls[li], n = R(cnt * dens * kk), kd = f / D, fall = 0.55 * kd, drift = wind * 1.6 * kd;
        const ox = -c.yaw * f - lat * kd + drift * t, oy = (c.pitch || 0) * f + c.z * kd + fall * t;
        for (let i = 0; i < n; i++) {
          const sway = sin(t * (0.6 + hash(i, 171 + li)) + i) * (3 + li * 3);
          let X = (hash(i, 161 + li) * TWd + ox + sway) % TWd; if (X < 0) X += TWd;
          let Y = (hash(i, 181 + li) * THd + oy) % THd; if (Y < 0) Y += THd;
          const px = R(X - 48), py = R(Y - 48); if (px < -2 || px > W + 2 || py < -2 || py > H + 2) continue;
          const em = hash(i, 191 + li) < ember;
          if (em) { const tw = 0.5 + 0.5 * sin(t * 5 + i * 1.7); u.sq(ctx, px, py, s, tw > 0.5 ? C.amber : C.orange); if (li === 2) u.sq(ctx, px, py - 1, 1, C.butter); }
          else u.sq(ctx, px, py, s, e.col || col);
        }
      }
    },
  };

  // ================================================================== FX: sun (a low sun disc on the sky, sets without their own)
  // e.yaw (heading, rad), e.el (elevation, rad), e.r (px), e.cols [rim, body, core]; drawn in 'behind' (after the set)
  FX.sun = {
    dur: 60, layer: 'behind',
    draw(ctx, age, e, S) {
      const u = U(), c = S.cam; if (!c) return;
      const yaw = e.yaw === undefined ? -1.23 : e.yaw, el = e.el === undefined ? 0.07 : e.el, D = 20000; // (layer 'sky' + A5.sunAt(yaw) in city shots)
      const p = S.project(c.x + Math.sin(yaw) * Math.cos(el) * D, c.y + Math.cos(yaw) * Math.cos(el) * D, c.z + Math.sin(el) * D); if (!p) return;
      const r = e.r || 16, k = e.in ? sat(age / e.in) : 1, cols = e.cols || [C.orange, C.gold, C.butter];
      if (e.halo) { // a big soft sunset halo (in the city's sky layer only the sky shows it: the ruins cut its shape)
        u.glow(ctx, p.x, p.y, r * 12, cols[0], 0.4 * k); u.glow(ctx, p.x, p.y, r * 6.5, cols[1], 0.45 * k); u.glow(ctx, p.x, p.y, r * 3, cols[2], 0.55 * k);
      }
      u.glow(ctx, p.x, p.y, r * 4.5, cols[0], 0.35 * k);
      u.glow(ctx, p.x, p.y, r * 2.2, cols[1], 0.5 * k);
      u.disc(ctx, p.x, p.y, r, u.dcol(cols[1], k)); u.disc(ctx, p.x, p.y, r * 0.8, u.dcol(cols[2], k)); u.disc(ctx, p.x - r * 0.15, p.y - r * 0.15, r * 0.45, u.dcol(C.white, k));
      if (e.cut) HT.rect(ctx, 0, R(p.y + r * e.cut), W, 1, C.ink); // unused hook for a horizon clip
    },
  };

  // ================================================================== FX: streak (a comet trail behind a fast mover)
  // e.who (cast member; the trail samples its smooth path over the last e.len s), e.col, e.w (px), e.z (height on the
  // body, m, default 1.2) — reads even when the mover is a few pixels tall (far wides)
  FX.streak = {
    dur: 2, layer: 'behind',
    draw(ctx, age, e, S) {
      const u = U(); if (!e.who || !S.at) return;
      const n = 14, len = e.len || 1, col = e.col || C.gold, w0 = e.w || 3, zo = e.z === undefined ? 1.2 : e.z, pts = [];
      for (let i = 0; i <= n; i++) { const tt = S.t - len * (i / n); if (tt < e.t) break; const a = S.at(e.who, tt), p = S.project(a.x, a.y, a.z + zo); if (p) pts.push([p.x, p.y]); }
      if (pts.length < 2) return;
      const k = sat((e.dur - age) / 0.4);
      for (let i = 0; i + 1 < pts.length; i++) { const f = i / (pts.length - 1), w = max(1, w0 * (1 - f)); u.taper(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w * 2.2, max(1, w * 1.6), u.dcol(col, 0.45 * k * (1 - f))); u.line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], u.dcol(i < 3 ? C.white : col, k * (1 - f))); }
      u.glow(ctx, pts[0][0], pts[0][1], w0 * 3 + 3, col, 0.5 * k);
    },
  };

  // ================================================================== FX: scour (the erased ground: a scoured, blast-streaked disc)
  // e.at [x, y] centre, e.r (m, keep ≤ 0.9 × the ledger erasure r: buildings are gone only inside that), e.glow 0..1
  // (the violet edge still hot), e.snow 0..1 (fresh snow dusting). Use layer 'sky' in the city set (depth-tested
  // against the rim's stumps) and 'ground' elsewhere. It hides the street grid the flat ledger decal leaves visible.
  // (static cameras: the disc is rendered once per camera into a cached layer and re-blitted — it has no animation)
  const scourCache = HT.lru(3);
  HT.caches.push({ name: 'a5.scour', size: () => scourCache.size });
  FX.scour = {
    dur: 60, layer: 'ground',
    draw(ctx, age, e, S) {
      const cam = S.cam; if (!cam) return;
      if (!cam._prepped) HT.cam.prep(cam);
      const cw = ctx.canvas.width, ch = ctx.canvas.height;
      const key = cam._key + '|' + (e.at || []).join(',') + '|' + (e.r || 220) + '|' + (e.glow || 0) + '|' + (e.snow || 0) + '|' + (e.seed | 0) + '|' + cw + 'x' + ch;
      let lay = scourCache.get(key);
      if (!lay) {
        const cv = HT.canvas(cw, ch); cv.g.setTransform(1, 0, 0, 1, 0, 0);
        U().setClip(cv.g, S); scourDraw(cv.g, e, S);
        lay = scourCache.set(key, cv.c);
        U().setClip(ctx, S);
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lay, 0, 0); ctx.restore();
    },
  };
  function scourDraw(ctx, e, S) {
    {
      const u = U(), c = e.at || [0, 0], Rr = e.r || 220, seed = e.seed | 0, z = 0.04, age = 0;
      const ring = (r, n, f) => u.projPoly(S, u.circle3(c[0], c[1], z, r, n, f));
      const rough = (a) => 1 + 0.035 * HT.noise(Math.cos(a) * 3 + 7, Math.sin(a) * 3, seed);
      const outer = ring(Rr, 96, rough); if (outer.length < 6) return;
      u.fillPoly(ctx, outer, C.shadow);
      // concentric glassed bands: darker toward the centre, a hot violet edge that cools with e.glow
      const bands = [[0.94, u.dcol(C.dusk, 0.45)], [0.8, u.dcol(C.plum, 0.5)], [0.64, u.dcol(C.plum, 0.85)], [0.46, u.dcol(C.ink, 0.45)], [0.28, u.dcol(C.ink, 0.75)]];
      for (const [k, col] of bands) { const P = ring(Rr * k, 90, a => 1 + 0.09 * HT.noise(Math.cos(a) * 5 + k * 9, Math.sin(a) * 5, seed + 3) - 0.045); if (P.length >= 6) u.fillPoly(ctx, P, col); }
      for (let i = 0; i < 160; i++) { // debris specks and glassed glints on the floor
        const a = hash(i, seed + 11) * TAU, rr = Rr * Math.sqrt(hash(i, seed + 12)) * 0.97, p = S.project(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, z); if (!p) continue;
        const gl = hash(i, seed + 13) < 0.12 && ((floor(age * 3) + i) % 7 === 0);
        u.sq(ctx, p.x, p.y, 1, gl ? C.lavender : i % 3 ? C.dusk : C.mauve);
      }
      // radial blast streaks (the ground scoured outward)
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * TAU + hash(i, seed + 5) * 0.08, r0 = Rr * (0.2 + 0.4 * hash(i, seed + 6)), r1 = Rr * (0.75 + 0.24 * hash(i, seed + 7));
        const p0 = S.project(c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0, z), p1 = S.project(c[0] + Math.cos(a) * r1, c[1] + Math.sin(a) * r1, z);
        if (p0 && p1) u.line(ctx, p0.x, p0.y, p1.x, p1.y, i % 3 ? u.dcol(C.dusk, 0.6) : u.dcol(C.mauve, 0.5));
      }
      const gl = e.glow === undefined ? 0 : e.glow;
      if (gl > 0.02) { const P1 = ring(Rr * 1.01, 96, rough), P2 = ring(Rr * 0.95, 96, rough); if (P1.length >= 6 && P2.length >= 6) { u.fillPolys(ctx, [P1, P2], u.dcol(C.violet, 0.7 * gl)); u.polyline(ctx, P1, u.dcol(C.lavender, gl), true); } }
      if (e.snow) { const P = ring(Rr * 0.99, 72, rough); if (P.length >= 6) u.fillPoly(ctx, P, u.dcol(C.lilacgrey, 0.35 * e.snow)); }
      u.polyline(ctx, outer, u.dcol(C.dusk, 0.8), true);
    }
  }

  // ================================================================== FX: goldMotes (the last of the wheel, drifting down)
  // e.at (world start), e.n, e.fall (m/s), e.spread (m), e.dur — gold motes sway down like embers, twinkle and go out
  // (they dim to rust as they near the ground)
  FX.goldMotes = {
    dur: 5, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(), at = e.at; if (!at) return;
      const n = e.n || 20, fall = e.fall || 3, sp = e.spread || 3, seed = e.seed | 0;
      for (let i = 0; i < n; i++) {
        const t0 = hash(i, seed + 1) * e.dur * 0.35, a = age - t0; if (a < 0) continue;
        const z = at[2] - fall * a * (0.7 + 0.5 * hash(i, seed + 2)); if (z < 0.05) continue;
        const sw = Math.sin(a * (1.2 + hash(i, seed + 3)) + i) * 0.6, x = at[0] + (hash(i, seed + 4) - 0.5) * sp + sw, y = at[1] + (hash(i, seed + 5) - 0.5) * sp;
        const p = S.project(x, y, z); if (!p) continue;
        const life = z / at[2], tw = (floor(age * 12) + i) % 5 === 0;
        const col = life > 0.5 ? (tw ? C.white : C.butter) : life > 0.2 ? C.gold : C.amber;
        if (life > 0.3) u.glow(ctx, p.x, p.y, 4, C.gold, 0.4 * life);
        u.sq(ctx, p.x, p.y, life > 0.6 ? 2 : 1, col);
      }
    },
  };

  // ================================================================== FX: haze (a soft world-anchored glow backdrop)
  // e.at (world), e.r (px) or e.rw (m), e.cols [outer, mid, core], e.a — lit smoke / afterglow behind a silhouette
  // a bank of lit smoke puffs churning slowly (not a disc: puffs read as cloud, a glow reads as a target)
  FX.haze = {
    dur: 20, layer: 'behind',
    draw(ctx, age, e, S) {
      const u = U(), p = pj(S, e.at); if (!p) return;
      const r = e.rw ? e.rw * p.s : (e.r || 120), pal = e.pal || [C.white, C.blush, C.lavender, C.violet], a = e.a === undefined ? 0.8 : e.a;
      const k = (e.in ? sat(age / e.in) : 1) * (e.out ? sat((e.dur - age) / e.out) : 1), seed = e.seed | 0, n = e.n || 14, t = e.t + age;
      for (let i = 0; i < n; i++) {
        const ang = hash(i, seed + 1) * TAU, rr = r * Math.sqrt(hash(i, seed + 2)) * 0.8, dx = Math.cos(ang) * rr + Math.sin(t * 0.21 + i) * r * 0.05, dy = Math.sin(ang) * rr * 0.6 - (t * 2 + hash(i, seed + 3) * 40) % 40 * 0.3;
        u.puff(ctx, p.x + dx, p.y + dy, Math.min(56, r * (0.28 + 0.2 * hash(i, seed + 4))), pal, a * k * (0.7 + 0.3 * hash(i, seed + 5)), seed + i);
      }
    },
  };

  // ================================================================== FX: smokeCols (several smoke columns in one event)
  // e.cols [[x, y, z], ...], e.pre (s of pre-roll: columns already standing when the event starts) + FX 'smoke' params.
  // One event instead of one per column: in the city set a 'sky'-layer event costs a full-view composite, so use
  // layer 'behind' unless a near wall really must occlude the columns.
  FX.smokeCols = {
    dur: 20, layer: 'behind',
    draw(ctx, age, e, S) {
      const F = FX.smoke; if (!F || !e.cols) return;
      const pre = e.pre || 0, sd = e.seed | 0;
      for (let i = 0; i < e.cols.length; i++) {
        const v = Object.create(e, { at: { value: e.cols[i] }, seed: { value: sd + i * 101 }, dur: { value: e.dur + pre } });
        F.draw(ctx, age + pre, v, S);
      }
    },
  };

  // ================================================================== FX: shadeQuad (a dithered world-space ground polygon)
  // e.pts [[x, y, z], ...] (world), e.col, e.a (0..1): dims or tints an area of the ground (layer 'ground')
  FX.shadeQuad = {
    dur: 60, layer: 'ground',
    draw(ctx, age, e, S) {
      const u = U(), P3 = []; for (const p of e.pts || []) P3.push(p[0], p[1], p[2] || 0.02);
      const P = u.projPoly(S, P3); if (P.length >= 6) u.fillPoly(ctx, P, u.dcol(e.col || C.ink, e.a === undefined ? 0.6 : e.a));
    },
  };

  // ================================================================== FX: skyFlash (a soft local bloom)
  FX.skyFlash = {
    dur: 0.5, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(); let x = e.x, y = e.y;
      if (e.at && x === undefined) { const p = pj(S, e.at); if (!p) return; x = p.x; y = p.y; }
      const q = age / e.dur, r = (e.r || 60) * (0.6 + 0.6 * HT.E.outCubic(q)), a = 1 - q;
      u.glow(ctx, x, y, r, e.col || C.lavender, 0.7 * a);
      if (q < 0.2) u.disc(ctx, x, y, r * 0.3, C.white);
    },
  };

  // ================================================================== plates: held city shots pre-rendered once
  // The city renderer caches a held view only while no 'sky'-layer FX is active (and it treats a sky FX as active for
  // 60 s after its start). A plate renders the held view ONCE — the set plus the given (static) sky-layer FX, e.g. a
  // sun setting behind the ruins, depth-tested — and re-blits it every frame. Use in hooks.back while the scene's set
  // is 'black' for that stretch; cameras must have pitch 0 (use shift): the plate is drawn with the camera as given.
  //   A5.plate({ from, to, sky: [fx events], ground: [fx events] }) → (ctx, S) => bool (drawn)
  A5.plate = (o) => {
    const cache = HT.lru(3);
    HT.caches.push({ name: 'a5.plate', size: () => cache.size });
    return (ctx, S) => {
      if (S.t < o.from || S.t >= o.to || !HT.renderCity) return false;
      const cam = S.cam; if (!cam._prepped) HT.cam.prep(cam);
      const cw = ctx.canvas.width, ch = ctx.canvas.height, key = cam._key + '|' + (HT.ledger ? HT.ledger.key(S.T) : 0) + '|' + cw + 'x' + ch;
      let cv = cache.get(key);
      if (!cv) {
        cv = HT.canvas(cw, ch);
        const S2 = Object.create(S); S2.sc = { C: { fx: o.sky || [] } };
        HT.renderCity(cv.g, cam, S2, { nocache: true, props: false }); // (no street props: the plate looks across the erasure and the shredded ring around it)
        if (o.ground && HT.fxDraw) HT.fxDraw(cv.g, S2, o.ground, 'ground');
        cache.set(key, cv);
      }
      ctx.drawImage(cv.c, 0, 0);
      return true;
    };
  };
  // the same for any set (e.g. 'sky', whose voxel city + clouds cost ≈ 3 ms a frame and have no held-frame cache): the
  // set's back pass (+ drawFront) for a held camera, rendered once per camera/ledger state and re-blitted. The scene
  // switches its set to 'black' for [from, to) and calls this in hooks.back. Clouds freeze for the hold (fine for a few s).
  //   A5.setPlate(name, { from, to, setOpts }) → (ctx, S) => bool (drawn)
  A5.setPlate = (name, o) => {
    // rendered at the exact viewport (the sky set recognises its sky pixels by recomputing the gradient rows from the
    // viewport height — a padded canvas shifts its sun halo), so an impact shake (camera sx/sy) is a new key
    const cache = HT.lru(4);
    HT.caches.push({ name: 'a5.setPlate.' + name, size: () => cache.size });
    let res = null;
    return (ctx, S) => {
      const set = HT.SETS[name];
      if (S.t < o.from || S.t >= o.to || !set) return false;
      const cam = S.cam; if (!cam._prepped) HT.cam.prep(cam);
      const cw = ctx.canvas.width, ch = ctx.canvas.height;
      const key = cam._key + '|' + (S.env && S.env.time) + '|' + (HT.ledger ? HT.ledger.key(S.T) : 0) + '|' + cw + 'x' + ch;
      let cv = cache.get(key);
      if (!cv) {
        if (!res) res = set.init ? set.init(null, o.setOpts || {}) : null;
        cv = HT.canvas(cw, ch);
        set.draw(cv.g, cam, S, 'back', res);
        if (set.drawFront) set.drawFront(cv.g, cam, S, res);
        cache.set(key, cv);
      }
      ctx.drawImage(cv.c, 0, 0);
      return true;
    };
  };
  // voxel heights for every ledger state a 'sky'-set scene shows. The runner's init warms them only for the 'voxel' and
  // 'overhead' sets, so without this the first sky frame after a crater / the erasure rebuilt the 840² heightfield
  // inside a frame (≈ 300 ms stall). Use as (part of) a scene's init: init() { return HT.A5.warmSky(this); }
  A5.warmSky = function* (sc) {
    if (!HT.voxelWarm || !HT.ledger || !sc) return;
    const T0 = sc._start || 0, T1 = T0 + (sc.dur || 0), times = [T0 + 1e-3];
    HT.ledger.state(T1);
    for (const e of HT.ledger.entries) if (e.T0 >= T0 && e.T0 <= T1) times.push(e.T0 + 1e-3, HT.ledger.animUntil(e) + 1e-3);
    for (const T of times) while (!HT.voxelWarm(Math.min(T, T1))) yield;
  };
  // a camera aimed with lookAt, its pitch folded into the lens shift (verticals stay vertical, as the city set draws)
  A5.lookShear = (from, to, f, extra) => {
    const c = HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
    c.shift = (c.shift || 0) + f * Math.tan(c.pitch); c.pitch = 0; return c;
  };

  // ================================================================== ENV 'a5glare' (exposed for the Purple: the city goes dark)
  // When the Purple is born the camera "exposes" for the blast: everything else sinks to violet silhouettes. The key
  // light comes from the blast (east of the West Shinjuku towers), no lit windows, plum fog.
  if (HT.ENVS && !HT.ENVS.a5glare) HT.ENVS.a5glare = { sky: [[0, C.lavender], [0.12, C.violet], [0.35, C.purple], [0.7, C.plum], [1, C.ink]], fog: C.plum, fogNear: 20, fogFar: 700, fogMax: 0.9, sun: [0.93, 0.2, 0.3], lit: 0, skyline: C.shadow, amb: 0.34, snowCol: C.lavender };

  // ================================================================== POST: fadeFrom (fade in from a colour, default ink)
  HT.post = HT.post || {};
  // ordered-dither fades: every pixel is either the frame or the exact palette colour (Bayer mask aligned with the
  // quantizer), so a fade never passes through off-palette mixes (a violet frame alpha-blended toward white snaps to the
  // pale blues/greys; a dithered dissolve stays violet → blush → white)
  const ditherFill = (ctx, a, col) => { if (a <= 0.01) return; const f = U().dcol(col, a); if (!f) return; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = f; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); };
  A5.ditherFill = ditherFill;
  if (!HT.post.fadeFrom) HT.post.fadeFrom = (ctx, S, e, age, dur) => (e.smooth ? HT.fx.fade(ctx, 1 - sat(age / dur), e.col || C.ink) : ditherFill(ctx, 1 - sat(age / dur), e.col || C.ink));
  // fadeTo: like 'white'/'black' but to any colour, with an optional second colour: e.col (0 → e.in s), then e.col2
  // (e.in → e.in2 s) — e.g. violet frames bleach through blush to white
  if (!HT.post.fadeTo) HT.post.fadeTo = (ctx, S, e, age, dur) => {
    ditherFill(ctx, sat(age / max(0.01, e.in || dur)), e.col || C.white);
    if (e.col2) ditherFill(ctx, sat((age - (e.in || 0)) / max(0.01, (e.in2 || dur) - (e.in || 0))), e.col2);
  };

  // ================================================================== POST: purpleGrade (the palette turns violet)
  HT.post.purpleGrade = (ctx, S, e, age, dur) => {
    const k = e.keys ? pwl(e.keys, age) : (e.k === undefined ? 1 : e.k) * sat(age / (e.in || 0.001)) * sat((dur - age) / (e.out || 0.001));
    if (k <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'color'; ctx.globalAlpha = min(1, k); ctx.fillStyle = e.col || C.violet; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (e.lift) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = min(1, k * e.lift); ctx.fillStyle = e.liftCol || C.purple; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
    ctx.restore();
  };

  // ================================================================== ?lab=a5 (poses on the act's characters)
  HT.labs = HT.labs || {};
  HT.labs.a5 = (Q) => {
    const list = (Q.get('poses') || 'a5_sukLook,a5_sukBeamA,a5_sukBeam,a5_sukBurnt,a5_sukSway,a5_sukKneel,a5_sukRise,a5_sukStand,a6_sukHand,a6_sukSwipeEnd,a6_sukSalute,a6_sukLookBack').split(',');
    const who = Q.get('who') || 'sukunaBare', px = +(Q.get('px') || 150), cols = +(Q.get('cols') || 6), cw = px * 0.9 | 0, ch = px + 30;
    const rows = Math.ceil(list.length / cols), cv = HT.canvas(cols * cw, rows * ch), g = cv.g;
    HT.vgrad(g, 0, 0, cols * cw, rows * ch, [[0, C.rose], [0.6, C.purple], [1, C.plum]]);
    list.forEach((nm, i) => {
      const x = (i % cols) * cw + cw / 2, y = floor(i / cols) * ch + ch - 8, P = rig.POSES[nm];
      if (P) rig.draw(g, who, x, y, P, px, { face: +(Q.get('face') || 1), light: [-0.7, -0.25, 0.65], costume: Q.get('costume') || undefined });
      HT.text(g, nm.toUpperCase(), (i % cols) * cw + 2, floor(i / cols) * ch + 2, { font: 'tiny', col: C.white });
    });
    const img = g.getImageData(0, 0, cv.c.width, cv.c.height); HT.quantize(img); g.putImageData(img, 0, 0);
    const scale = +(Q.get('scale') || 2), out = document.createElement('canvas'); out.width = cv.c.width * scale; out.height = cv.c.height * scale;
    const og = out.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(cv.c, 0, 0, out.width, out.height);
    return out;
  };
})();
