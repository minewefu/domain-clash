/* DOMAIN CLASH — shikigami & supporting cast for the rig (rig.js). Loads after chars.js (reuses rig.helpers and the
   materials registered there) and BEFORE poses.js, so poses/moves are registered later through HT.onPoses (see the end).

   CHARACTERS (rig.define; side 3/4 view + front + back unless noted)
     mahoraga   Eight-Handled Sword Divergent Sila Divine General Mahoraga, 3.4 m
     agito      Merged Beast Agito (Nue + Great Serpent + Tiger Funeral + Round Deer), 3.0 m
     geto       Suguru Geto as a student (airport coda, ch. 236), 1.85 m
     nanami     Kento Nanami as a student, 1.84 m · haibara  Yu Haibara, 1.75 m · yaga  Masamichi Yaga, 1.95 m
     maho_wheel the eight-handled wheel alone (HT.shiki.wheel draws it for FX / busts)
   DRAW OPTIONS (rig.draw/render `o`; the same field on the pose also works, `o` wins)
     mahoraga  wheelAngle (deg, clockwise on screen; one adaptation = 45) · wheelGlow 0..1 · wheel:false · sword:false ·
               swordGlow:true · swordArm:'na'|'fa' (default: the near arm = its right arm when facing right)
     agito     spark 0..1 (Nue's electricity) · snake 0..1 (1 serpent head, 0 torn-off stump, between = regrowing) ·
               regrow 0..1 (Round Deer RCT glow) · tail −1..1 (swing the serpent tail forward)
     all       t (seconds) animates crackle / idle sway when given · sec {hair, cloth, wind} springs (fight.js secondary())
   FX JOINTS added to the render's J (use rig.jointScreen): wheel, swordTip (mahoraga) · snakeHead, maskEye (agito)
   Pose flags: face 'open' (Mahoraga/Agito jaws open, silent) · sit:true (front-view seated legs for the coda cast).

   Canon research → design (original pixel interpretations, nothing traced; sources in the final report):
     MAHORAGA  towering, heavily muscled, pale white body; four wing-like growths from the eye sockets (two per side, no
               eyes); a tail-like appendage from the back of the head; an eight-handled golden wheel hovering above the
               head that turns as it adapts (we: one 45° notch per step); a metal chain/collar piece at the collarbones;
               black hakama with a white sash; bandaged forearm(s); the Sword of Extermination on the right forearm; bare
               feet. Acting: implacable holds, then explosive 2–3-frame strikes, long heavy recoveries.
     AGITO     towering muscular humanoid: feathered mane, a mask resembling Nue's (bird face, beak), black antlers,
               feathered arms ending in claws, a feminine torso with black stripes, tiger feet, a tail ending in a
               snake's head (can be torn off, regrows via Round Deer's RCT), black hakama; Nue's electricity.
     GETO      student: hair tied up in a single bun, a long bang strand over the forehead, stretched earlobes with large
               round black earrings, black high-collared uniform with a single gold swirl button, very baggy trousers.
     NANAMI    student: neat side-parted blond hair, dark-blue high-collared uniform. HAIBARA short dark hair, wide eyes,
               cheerful; cropped, unbuttoned uniform jacket. YAGA big; short spiky dark hair on top, shaved sides,
               sunglasses, mustache + goatee; dark coat.
   Pixel-art LOD rules (Derek Yu "Pixel art tutorial: basics"; SLYNYRD Pixelblog 47 "Tiny Pixels"): design the silhouette
   first, exaggerate identifying features as the drawing shrinks (wings, wheel, antlers, beak, sword are boosted at
   lod ≤ 1), drop interior detail before silhouette detail, keep lines inside shapes (no stray pixels).

   z-layers (inner lines appear where layers differ by ≥ 2): see Z below. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, rig = HT.rig;
  if (!rig || !rig.helpers) { console.error('chars_shiki.js needs rig.js + chars.js'); return; }
  const Hp = rig.helpers;
  const { add, sub, mul, lerp2, norm, perp, torsoFrame, headFrame, secOf } = Hp;
  const sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, D2R = Math.PI / 180, PI = Math.PI, TAU = Math.PI * 2;
  const clamp = HT.clamp, lerp = HT.lerp;
  const mm = rig.mat, MAT = rig.material;
  const vlen = v => Math.hypot(v[0], v[1]);
  const ang = v => atan2(v[1], v[0]);
  const rot = (v, a) => [v[0] * cos(a) - v[1] * sin(a), v[0] * sin(a) + v[1] * cos(a)];
  const windOf = T => (T.o.sec && T.o.sec.wind) || 0;
  const tOf = T => (typeof T.o.t === 'number' ? T.o.t : null);
  const opt = (T, k, d) => (T.o[k] !== undefined ? T.o[k] : T.P[k] !== undefined ? T.P[k] : d);
  const shiki = (HT.shiki = HT.shiki || {});

  // ------------------------------------------------------------------ materials (chars.js already registered
  // maho_skin maho_gold maho_blade bandage ag_feather ag_bone ag_body ag_tiger ag_snake black whiteCloth skin mark …)
  MAT('maho_socket', [C.ink, C.shadow, C.shadow, C.dusk], { flat: true });
  MAT('maho_mouth', [C.ink, C.ink, C.shadow, C.dusk], { flat: true });
  MAT('maho_chain', [C.ink, C.charcoal, C.slate, C.steel], { line: C.ink, rim: C.mist });
  MAT('maho_hakama', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink, rim: C.lilacgrey });
  MAT('maho_goldHot', [C.amber, C.gold, C.butter, C.white], { line: C.rust, rim: C.white });
  MAT('maho_goldWhite', [C.gold, C.butter, C.white, C.white], { line: C.amber, rim: C.white });
  MAT('maho_bladeHot', [C.steel, C.mist, C.white, C.white], { line: C.slate, rim: C.white });
  MAT('ag_feather', [C.ink, C.ink, C.charcoal, C.slate], { line: C.ink, rim: C.sage }); // darker than chars.js' default
  MAT('ag_antler', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink, rim: C.lilacgrey });
  MAT('ag_hakama', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink, rim: C.slate });
  MAT('ag_eye', [C.amber, C.gold, C.butter, C.white], { flat: true });
  MAT('ag_spark', [C.sky, C.ice, C.white, C.white], { flat: true, glow: true });
  MAT('ag_claw', [C.ink, C.shadow, C.sand, C.mist], { line: C.ink });
  MAT('ag_regrow', [C.teal, C.jade, C.aqua, C.foam], { line: C.deepteal, rim: C.foam });
  MAT('ag_mouth', [C.ink, C.maroon, C.maroon, C.wine], { flat: true });
  MAT('coda_black', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink, rim: C.sand });
  MAT('coda_navy', [C.ink, C.navy, C.indigo, C.blue], { line: C.ink, rim: C.lavender });
  MAT('coda_coat', [C.ink, C.ink, C.shadow, C.mauve], { line: C.ink, rim: C.rosewood });
  MAT('coda_shirt', [C.sand, C.mist, C.white, C.white], { line: C.sand, rim: C.white });
  MAT('coda_hairBlack', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink, rim: C.mauve });
  MAT('coda_hairBlond', [C.rust, C.tan, C.honey, C.cream], { line: C.rust, rim: C.cream });
  MAT('coda_hairBrown', [C.ink, C.bark, C.bark, C.rosewood], { line: C.ink, rim: C.sand });
  MAT('coda_eye', [C.ink, C.ink, C.shadow, C.dusk], { flat: true });
  MAT('coda_gold', [C.rust, C.amber, C.gold, C.butter], { flat: true });
  MAT('coda_stubble', [C.rosewood, C.rosewood, C.salmon, C.salmon], { flat: true });

  // z-layers for the big builds (gap ≥ 2 → inner line on the nearer part's border)
  const Z = { farArm: 2, farBlade: 5, farLeg: 6, back: 8, torso: 10, torsoDet: 11, neck: 11, chain: 12, hips: 12,
    nearLeg: 13, sash: 16, wingFar: 17, mane: 17, head: 19, mask: 21, faceDet: 22, wingNear: 23, wheel: 25,
    nearArm: 29, blade: 32, spark: 36 };
  shiki.Z = Z;

  // ------------------------------------------------------------------ shared shape helpers (character space)
  // pointed feather / leaf from root along dir (unit), length L, half-width w
  function feather(T, root, dir, L, w, mat, z, dt) {
    const n = perp(dir), tip = add(root, mul(dir, L)), m = add(root, mul(dir, L * 0.42));
    T.poly([add(root, mul(n, w * 0.55)), add(m, mul(n, w)), tip, add(m, mul(n, -w)), add(root, mul(n, -w * 0.55))], mat, z, dt || 0, -1, n);
  }
  // capsule chain through points
  function chain(T, pts, radii, mat, z, dt) { for (let i = 0; i + 1 < pts.length; i++) T.cap(pts[i], pts[i + 1], radii[i], radii[i + 1], mat, z, dt || 0); }
  // a hand at wrist W pointing along dir (works in every view; rig.helpers.hand assumes side-view wrist angles)
  function handAt(T, W, dir, shape, mat, z, dt, rr) {
    const r = rr || T.prop.limb, hl = T.prop.hand, Hh = add(W, mul(dir, hl * 0.6)), a = ang(dir);
    if (shape === 'pocket' || shape === 'none') return;
    if (shape === 'fist' || shape === 'sign') { T.ell(lerp2(W, Hh, 0.62), r * 1.02, r * 0.9, a, mat, z, dt); return; }
    if (shape === 'relaxed') { T.cap(W, add(W, mul(dir, hl * 0.8)), r * 0.82, r * 0.62, mat, z, dt); return; }
    if (shape === 'flat') { T.cap(W, add(W, mul(dir, hl * 1.05)), r * 0.78, r * 0.42, mat, z, dt); return; }
    const pd = perp(dir);
    if (shape === 'point' || shape === 'two') {
      T.ell(lerp2(W, Hh, 0.55), r * 0.98, r * 0.86, a, mat, z, dt);
      const n = shape === 'two' ? 2 : 1;
      for (let k = 0; k < n; k++) { const b = add(Hh, mul(pd, (k - (n - 1) / 2) * r * 0.5 + r * 0.2)); T.cap(b, add(b, mul(dir, hl * 0.62)), r * 0.3, r * 0.26, mat, z, dt); }
      return;
    }
    T.ell(lerp2(W, Hh, 0.5), r * 0.95, r * 0.82, a, mat, z, dt); // open / claw
    if (T.lod >= 2) {
      for (let k = -1; k <= 2; k++) {
        const b = add(lerp2(W, Hh, 0.85), mul(pd, k * r * 0.42 - r * 0.2));
        T.line(b, add(b, mul(shape === 'claw' ? norm(add(dir, mul(pd, -0.7))) : dir, hl * 0.5)), mat, Math.max(0, 2 + (dt || 0)), z);
      }
      const th = add(lerp2(W, Hh, 0.4), mul(pd, r * 0.95));
      T.line(th, add(th, mul(norm(add(dir, pd)), hl * 0.36)), mat, 2, z);
    } else T.cap(lerp2(W, Hh, 0.5), add(Hh, mul(dir, hl * 0.3)), r * 0.72, r * 0.5, mat, z, dt);
  }
  const handDir = (T, key) => norm(sub(T.J[key + 'H'], T.J[key + 'W']));

  // wide hakama leg (side view): thigh → knee → flaring hem above the ankle; sways with the cloth spring
  function hakamaLeg(T, key, mat, z, dt, o = {}) {
    const J = T.J, lR = T.prop.leg, lod = T.lod;
    const P0 = J[key + 'P'], K = J[key + 'K'], A = J[key + 'A'];
    const sec = secOf(T, 'cloth'), wind = windOf(T), sway = [clamp(sec[0] * 0.55 - wind * 0.012, -0.04, 0.04), clamp(sec[1] * 0.3, -0.015, 0.015)];
    const kd = norm(sub(A, K)), kp = perp(kd), td = norm(sub(K, P0)), tpp = perp(td);
    const hem = add(lerp2(K, A, o.hemU || 0.88), sway);
    const wT = lR * (o.thigh || 1.6), wK = lR * (o.knee || 1.5), wH = lR * (o.flare || 2.15);
    T.cap(P0, K, wT, wK, mat, z, dt);
    T.poly([add(K, mul(kp, wK)), add(hem, mul(kp, wH)), add(hem, mul(kp, -wH)), add(K, mul(kp, -wK))], mat, z, dt, -1, kp);
    if (lod >= 2) { // pleats, kept inside the shapes
      const tone = Math.max(0, 1 + (dt || 0));
      for (const f of lod >= 3 ? [-0.5, 0.1, 0.62] : [0.15]) {
        T.line(add(K, mul(kp, f * wK * 0.8)), add(hem, mul(kp, f * wH * 0.85)), mat, tone, z);
        T.line(add(lerp2(P0, K, 0.3), mul(tpp, f * wT * 0.6)), add(K, mul(tpp, f * wK * 0.6)), mat, tone, z);
      }
    }
  }
  // hakama leg, front/back view (flares outward)
  function hakamaLegFront(T, key, s, mat, z, dt, o = {}) {
    const J = T.J, lR = T.prop.leg, lod = T.lod;
    const P0 = J[key + 'P'], K = J[key + 'K'], A = J[key + 'A'];
    const sec = secOf(T, 'cloth'), sway = [clamp(sec[0] * 0.5, -0.035, 0.035), 0];
    const hem = add(lerp2(K, A, o.hemU || 0.88), sway), wK = lR * 1.5, wH = lR * (o.flare || 2.15);
    T.cap(P0, K, lR * 1.6, wK, mat, z, dt);
    T.poly([add(K, [s * wK, 0]), add(hem, [s * wH * 1.12, 0]), add(hem, [-s * wH * 0.72, 0]), add(K, [-s * wK * 0.9, 0])], mat, z, dt, -1, [1, 0]);
    if (lod >= 2) for (const f of lod >= 3 ? [-0.4, 0.2, 0.75] : [0.2]) T.line(add(K, [s * f * wK * 0.8, 0]), add(hem, [s * f * wH * 0.85, 0]), mat, Math.max(0, 1 + (dt || 0)), z);
  }
  // bare foot (side): sole on the ground (the ankle joint sits one foot-height up)
  function bareFootSide(T, key, mat, z, dt) {
    const J = T.J, an = J[key + 'A'], toe = J[key + 'T'], f = T.prop.foot;
    const d = norm(sub(toe, an)), n = perp(d);
    const Q = (u, v) => add(an, add(mul(d, u * f), mul(n, v * f)));
    T.poly([Q(-0.35, -0.6), Q(-0.75, 0.3), Q(-0.55, 1.0), Q(1.5, 1.0), Q(2.45, 0.9), Q(2.55, 0.45), Q(2.1, 0.2), Q(1.0, -0.2), Q(0.35, -0.6)], mat, z, dt, -1, mul(n, -1));
    if (T.lod >= 2) for (const u of T.lod >= 3 ? [2.05, 1.7, 1.4] : [1.9]) T.line(Q(u, 0.95), Q(u + 0.08, 0.5), mat, Math.max(0, 1 + (dt || 0)), z);
  }
  function bareFootFront(T, key, s, mat, z, dt) {
    const A = T.J[key + 'A'], f = T.prop.foot;
    const Q = (u, v) => add(A, [(u + s * 0.12) * f, v * f]);
    T.poly([Q(-0.8, 0.4), Q(0.8, 0.4), Q(1.15, -0.8), Q(0.9, -1.0), Q(-0.9, -1.0), Q(-1.15, -0.8)], mat, z, dt, -1, [1, 0]);
    if (T.lod >= 2) for (const u of [-0.45, 0.05, 0.5]) T.line(Q(u, -0.55), Q(u, -0.95), mat, Math.max(0, 1 + (dt || 0)), z);
  }

  // ================================================================== MAHORAGA
  const MAHO_PROP = { head: 0.128, neck: 0.058, spine: 0.272, thigh: 0.25, shin: 0.235, foot: 0.036, uarm: 0.19, farm: 0.165, hand: 0.078,
    chest: 0.19, waist: 0.13, hipW: 0.17, shoulderW: 0.33, limb: 0.043, leg: 0.056 };
  const WHEEL = { R: 0.082, handle: 1.42, gap: 0.045 }; // rim radius (body heights), handle-tip radius / R, gap above the skull

  // the eight-handled wheel: rim tube + 8 spokes that run through the rim into turned handles + hub.
  // c centre, R rim radius (char units), angDeg clockwise on screen, sx horizontal squash (3/4 view ≈ 0.62)
  function wheelParts(T, c, R, angDeg, glow, sx, z) {
    const S = T.S, px = R * S;
    const mat = glow > 0.66 ? mm('maho_goldWhite') : glow > 0.25 ? mm('maho_goldHot') : mm('maho_gold');
    const tube = Math.max(0.8 / S, R * 0.11), spoke = Math.max(0.55 / S, R * 0.062), knob = Math.max(0.85 / S, R * 0.105);
    const a0 = PI / 2 - angDeg * D2R * (T.face || 1);
    const P = (r, a) => [c[0] + sx * r * cos(a), c[1] + r * sin(a)];
    const N = px < 5 ? 12 : px < 12 ? 16 : 28;
    for (let i = 0; i < N; i++) T.cap(P(R, (i / N) * TAU), P(R, ((i + 1) / N) * TAU), tube, tube, mat, z);
    const hr = WHEEL.handle;
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * PI) / 4;
      T.cap(P(R * 0.22, a), P(R * 1.02, a), spoke, spoke, mat, z, -1);
      if (px >= 7) {
        T.cap(P(R * 1.04, a), P(R * (hr - 0.1), a), knob * 0.55, knob * 0.85, mat, z);
        T.ell(P(R * hr, a), knob * lerp(1, sx, Math.abs(cos(a))) * 1.05, knob * 1.05, 0, mat, z);
      } else T.cap(P(R * 1.02, a), P(R * hr, a), spoke, spoke * 1.25, mat, z);
    }
    T.ell(c, R * 0.3 * sx, R * 0.3, 0, mat, z + 2);
    if (px >= 8) T.ell(c, R * 0.13 * sx, R * 0.13, 0, mat, z + 2, 0, glow > 0.25 ? 3 : 2);
  }
  // wing-like growth from an eye socket: leading edge toward `up`, four primary-feather notches on the trailing edge
  const WING = [[0, 0.1], [0.25, 0.42], [0.6, 0.46], [0.88, 0.32], [1.0, 0.1], [0.86, -0.02], [0.8, 0.12], [0.68, -0.14], [0.6, 0.02], [0.48, -0.22], [0.4, -0.05], [0.26, -0.24], [0.18, -0.08], [0.06, -0.18], [0, -0.05]];
  const WING_LO = [[0, 0.14], [0.3, 0.44], [0.75, 0.36], [1.0, 0.08], [0.6, -0.18], [0.2, -0.2], [0, -0.06]];
  function eyeWing(T, root, tip, W, mat, z, dt, up, flat) {
    const d = sub(tip, root), L = vlen(d), u = mul(d, 1 / L);
    let n = perp(u); if (n[0] * up[0] + n[1] * up[1] < 0) n = mul(n, -1);
    const shape = T.lod >= 2 ? WING : WING_LO;
    T.poly(shape.map(([a, b]) => add(root, add(mul(u, a * L), mul(n, b * W)))), mat, z, dt, flat ? 3 : -1, n);
    if (T.lod >= 3) T.line(add(root, mul(n, W * 0.12)), add(root, add(mul(u, L * 0.8), mul(n, W * 0.22))), mat, 1, z);
    if (T.lod >= 2 && flat) T.line(add(root, add(mul(u, L * 0.3), mul(n, -W * 0.08))), add(root, add(mul(u, L * 0.62), mul(n, -W * 0.1))), mat, 2, z);
  }
  // wheel centre: floats above the skull, lags a little behind head motion (hair spring)
  function wheelCenter(T, H) { // world-up from the head centre, so it stays above the head in any pose
    const sec = secOf(T, 'hair'), c = T.J.head, hs = T.prop.head;
    return [c[0] + sec[0] * 0.6, c[1] + hs * 0.52 + WHEEL.gap + WHEEL.R * WHEEL.handle + sec[1] * 0.4];
  }
  // muscled arm (deltoid, biceps bulge, thick forearm); the sword arm's forearm is bandaged and carries the blade
  function mahoArm(T, key, z, dt, sword, swordGlow, zBlade) {
    const J = T.J, pr = T.prop, aR = pr.limb, lod = T.lod, P = T.P;
    const S0 = J[key + 'S'], E = J[key + 'E'], Wr = J[key + 'W'];
    const skin = mm('maho_skin'), band = mm('bandage');
    const ua = norm(sub(E, S0)), fa = norm(sub(Wr, E));
    T.ell(add(S0, mul(ua, aR * 0.45)), aR * 1.45, aR * 1.3, ang(ua), skin, z, dt);
    const m1 = lerp2(S0, E, 0.45);
    T.cap(S0, m1, aR * 1.24, aR * 1.34, skin, z, dt);
    T.cap(m1, E, aR * 1.34, aR * 0.98, skin, z, dt);
    const fm = sword ? band : skin, m2 = lerp2(E, Wr, 0.3);
    T.cap(E, m2, aR * 1.02, aR * 1.16, fm, z, dt);
    T.cap(m2, Wr, aR * 1.16, aR * 0.78, fm, z, dt);
    const n = perp(fa);
    if (lod >= 2) {
      if (sword) { // bandage wraps (diagonal, inside the forearm)
        const k = lod >= 3 ? 6 : 3;
        for (let i = 0; i < k; i++) { const u = 0.1 + (i * 0.8) / k, p = lerp2(E, Wr, u), r = aR * (1.12 - 0.32 * u) * 0.82; T.line(add(p, mul(n, r)), add(add(p, mul(fa, aR * 0.4)), mul(n, -r)), band, 0, z); }
      } else T.line(add(E, mul(n, aR * 0.2)), add(lerp2(E, Wr, 0.55), mul(n, aR * 0.45)), skin, 1, z); // forearm muscle
      if (lod >= 3) T.line(add(lerp2(S0, E, 0.25), mul(perp(ua), -aR * 0.5)), add(lerp2(S0, E, 0.8), mul(perp(ua), -aR * 0.35)), skin, 1, z); // biceps
      const pu = perp(ua), dl = add(S0, mul(ua, aR * 1.25)); // deltoid separation + elbow crease
      T.line(add(dl, mul(pu, aR * 0.95)), add(add(dl, mul(ua, aR * 0.5)), mul(pu, -aR * 0.2)), skin, 1, z);
      T.line(add(E, mul(pu, aR * 0.5)), add(E, mul(perp(fa), -aR * 0.45)), skin, 1, z);
    }
    handAt(T, Wr, handDir(T, key), key === 'na' ? P.nh : P.fh, skin, z + 1, dt, aR);
    if (sword) swordBlade(T, E, Wr, fa, zBlade, dt, swordGlow);
  }
  // the Sword of Extermination: a long straight blade fixed along the forearm, running past the fist
  function swordBlade(T, E, Wr, fa, z, dt, glow) {
    const pr = T.prop, lod = T.lod, n = perp(fa);
    const L = 0.29, w = Math.max(1.2 / T.S, 0.034);
    const base = lerp2(E, Wr, 0.38), tip = add(Wr, mul(fa, L)), ts = add(Wr, mul(fa, L - w * 1.7));
    const mat = glow ? mm('maho_bladeHot') : mm('maho_blade');
    T.poly([add(base, mul(n, w * 0.5)), add(ts, mul(n, w * 0.5)), add(tip, mul(n, w * 0.12)), add(ts, mul(n, -w * 0.5)), add(base, mul(n, -w * 0.5))], mat, z, dt, -1, n);
    if (lod >= 2) {
      T.line(add(base, mul(n, -w * 0.3)), add(ts, mul(n, -w * 0.3)), mat, 3, z);       // edge light
      if (lod >= 3) T.line(add(base, mul(n, w * 0.16)), add(lerp2(base, ts, 0.88), mul(n, w * 0.16)), mat, 1, z); // fuller
    }
    if (lod >= 1) for (const u of [0.46, 0.84]) { const s = lerp2(E, Wr, u); T.cap(add(s, mul(n, pr.limb * 1.2)), add(s, mul(n, -pr.limb * 1.2)), pr.limb * 0.26, pr.limb * 0.26, mm('maho_chain'), z + 1, dt); }
    T.J.swordTip = tip;
  }
  // the tail-like appendage from the back of the head: attached to the skull, then hanging with the hair spring
  function mahoAppendage(T, H, z, back) {
    const hs = T.prop.head, skin = mm('maho_skin'), sec = secOf(T, 'hair'), wind = windOf(T);
    // heavy appendage: modest spring response, clamped so it never juts out like a spike
    const sw = [clamp(sec[0] * 1.1 - wind * 0.012, -0.03, 0.03), clamp(sec[1] * 0.8, -0.02, 0.02)];
    const p0 = back ? H(0, 0.12) : H(-0.42, 0.16), p1 = back ? H(0, -0.3) : H(-0.66, -0.16);
    const drift = back ? [0, 0] : [-0.03, 0];
    const p2 = add(add(p1, add(drift, [0, -0.05])), mul(sw, 0.5));
    const p3 = add(add(p2, add(mul(drift, 0.4), [0, -0.058])), mul(sw, 1.0));
    const p4 = add(add(p3, [0.004, -0.052]), mul(sw, 1.6));
    const p5 = add(add(p4, [0.008, -0.034]), mul(sw, 2.0));
    const k = T.lod <= 1 ? 1.25 : 1;
    chain(T, [p0, p1, p2, p3, p4, p5], [0.15, 0.125, 0.1, 0.08, 0.062, 0.03].map(v => v * hs * k), skin, z, back ? 0 : -1);
    if (T.lod >= 2) for (const [a, b, r] of [[p1, p2, 0.115], [p2, p3, 0.09], [p3, p4, 0.07]]) { const m = lerp2(a, b, 0.5), nn = perp(norm(sub(b, a))); T.line(add(m, mul(nn, r * hs * 0.8)), add(m, mul(nn, -r * hs * 0.8)), skin, 1, z); }
  }
  function mahoHeadSide(T, H) {
    const hs = T.prop.head, z = Z.head, skin = mm('maho_skin'), lod = T.lod, P = T.P, J = T.J;
    T.cap(lerp2(J.neck, J.head, 0.2), lerp2(J.chest, J.neck, -0.15), T.prop.limb * 1.2, T.prop.limb * 1.62, skin, Z.neck, -1);
    T.ell(H(-0.08, 0.1), 0.5 * hs, 0.47 * hs, J.headA, skin, z);
    T.poly([H(-0.3, -0.02), H(0.04, 0.3), H(0.34, 0.32), H(0.5, 0.22), H(0.46, 0.12), H(0.5, 0.03), H(0.57, -0.08), H(0.52, -0.15), H(0.57, -0.22), H(0.55, -0.33), H(0.46, -0.46), H(0.24, -0.55), H(-0.06, -0.47), H(-0.26, -0.24)], skin, z, 0, -1, [1, 0]);
    if (lod >= 2) { // heavy lips + cheekbone + jaw shadow (Mahoraga's prominent mouth)
      T.poly([H(0.57, -0.21), H(0.4, -0.2), H(0.36, -0.25), H(0.55, -0.26)], skin, z + 1, 0, 1);
      T.poly([H(0.55, -0.3), H(0.38, -0.3), H(0.4, -0.35), H(0.52, -0.36)], skin, z + 1, 0, 1);
      T.line(H(0.3, -0.06), H(0.44, -0.12), skin, 1, z + 1);
      if (lod >= 3) T.line(H(0.4, -0.48), H(0.02, -0.4), skin, 0, z + 1);
    }
    const up = norm(sub(H(0, 1), H(0, 0))), b = lod <= 1 ? 1.3 : 1, Wd = 0.34 * hs * (lod <= 1 ? 1.2 : 1);
    eyeWing(T, H(0.44, 0.14), H(0.44 - 0.5 * b, 0.14 + 0.98 * b), Wd * 0.9, skin, Z.wingFar, -1, up);     // far upper
    eyeWing(T, H(0.44, 0.06), H(0.44 - 0.9 * b, 0.06 + 0.74 * b), Wd * 0.8, skin, Z.wingFar, -1, up);     // far lower
    eyeWing(T, H(0.34, 0.12), H(0.34 - 1.1 * b, 0.12 + 0.86 * b), Wd, skin, Z.wingNear, 0, up, true);     // near upper
    eyeWing(T, H(0.34, 0.03), H(0.34 - 1.3 * b, 0.03 + 0.36 * b), Wd * 0.9, skin, Z.wingNear, 0, up, true); // near lower
    if (lod >= 2) T.ell(H(0.37, 0.07), 0.1 * hs, 0.08 * hs, J.headA, mm('maho_socket'), z + 1);
    const face = P.face || 'neutral', mo = mm('maho_mouth'), open = face === 'open' || face === 'shout' || face === 'grin';
    if (lod >= 2) {
      if (open) {
        T.poly([H(0.54, -0.2), H(0.3, -0.22), H(0.33, -0.38), H(0.5, -0.39)], mo, z + 1, 0, 1);
        if (lod >= 3) { T.line(H(0.51, -0.22), H(0.35, -0.23), mm('teeth'), 2, z + 2); T.line(H(0.48, -0.37), H(0.36, -0.36), mm('teeth'), 2, z + 2); }
      } else T.line(H(0.56, -0.28), H(0.34, -0.28), mo, 1, z + 2, lod >= 3 && T.S > 300 ? 2 : 1);
      if (lod >= 3) T.line(H(0.47, 0.22), H(0.16, 0.28), skin, 1, z + 1);
    } else if (lod === 1 && open) T.dot(H(0.48, -0.28), mo, 1, z + 1);
  }
  function mahoHeadFront(T, H, back) {
    const hs = T.prop.head, z = Z.head, skin = mm('maho_skin'), lod = T.lod, P = T.P, J = T.J;
    T.cap(lerp2(J.neck, J.head, 0.2), lerp2(J.chest, J.neck, -0.15), T.prop.limb * 1.55, T.prop.limb * 2.2, skin, Z.neck, -1);
    T.ell(H(0, 0.1), 0.47 * hs, 0.47 * hs, J.headA, skin, z);
    T.poly([H(-0.46, 0.08), H(0.46, 0.08), H(0.44, -0.24), H(0.28, -0.46), H(0, -0.54), H(-0.28, -0.46), H(-0.44, -0.24)], skin, z, 0, -1, [1, 0]);
    const up = norm(sub(H(0, 1), H(0, 0))), b = lod <= 1 ? 1.3 : 1, Wd = 0.32 * hs * (lod <= 1 ? 1.2 : 1);
    const zw = back ? Z.wingFar : Z.wingNear;
    for (const s of [-1, 1]) {
      eyeWing(T, H(s * 0.2, 0.12), H(s * (0.2 + 0.78 * b), 0.12 + 0.72 * b), Wd, skin, zw, back ? -1 : 0, up, !back);
      eyeWing(T, H(s * 0.22, 0.03), H(s * (0.22 + 0.95 * b), 0.03 + 0.22 * b), Wd * 0.9, skin, zw, back ? -1 : 0, up, !back);
      if (!back && lod >= 2) T.ell(H(s * 0.2, 0.06), 0.1 * hs, 0.075 * hs, 0, mm('maho_socket'), z + 1);
    }
    if (!back && lod >= 2) {
      const face = P.face || 'neutral', mo = mm('maho_mouth');
      if (face === 'open' || face === 'shout' || face === 'grin') { T.poly([H(-0.18, -0.24), H(0.18, -0.24), H(0.13, -0.4), H(-0.13, -0.4)], mo, z + 1, 0, 1); if (lod >= 3) { T.line(H(-0.15, -0.26), H(0.15, -0.26), mm('teeth'), 2, z + 2); T.line(H(-0.11, -0.38), H(0.11, -0.38), mm('teeth'), 2, z + 2); } }
      else T.line(H(-0.17, -0.3), H(0.17, -0.3), mo, 1, z + 1);
      if (lod >= 3) { T.line(H(-0.08, -0.02), H(-0.05, -0.16), skin, 1, z + 1); T.line(H(0.08, -0.02), H(0.05, -0.16), skin, 1, z + 1); }
    }
  }
  function mahoTorsoDetails(T, d) {
    const { tp, wc, ww } = d, skin = mm('maho_skin'), z = Z.torsoDet, lod = T.lod;
    T.line(tp(0.62, wc * 0.94), tp(0.66, wc * 0.4), skin, 1, z);
    T.line(tp(0.66, wc * 0.4), tp(0.76, wc * 0.02), skin, 1, z);
    for (const s of [0.27, 0.39, 0.51]) T.line(tp(s, ww * 1.0), tp(s + 0.01, ww * 0.55), skin, 1, z);
    T.line(tp(0.14, ww * 0.8), tp(0.56, wc * 0.7), skin, 1, z);
    if (lod >= 3) {
      for (let i = 0; i < 3; i++) T.line(tp(0.5 + i * 0.045, wc * 0.3), tp(0.47 + i * 0.045, wc * 0.08), skin, 1, z);
      T.line(tp(0.9, -wc * 0.25), tp(0.66, -wc * 0.72), skin, 1, z);
    }
  }
  // chain collar across the collarbones (links + a few hanging pendants)
  function chainSide(T, d) {
    const lod = T.lod; if (lod === 0) return;
    const { tp, wc, fw } = d, cm = mm('maho_chain'), z = Z.chain, J = T.J;
    // draped over the base of the neck (in 3/4 view the near deltoid hides the collarbone itself)
    const a = tp(0.95, wc * 0.86), b = add(lerp2(J.chest, J.neck, 0.35), mul(fw, 0.034)), c = add(lerp2(J.chest, J.neck, 0.6), mul(fw, -0.045));
    if (lod === 1) { T.line(a, b, cm, 1, z); T.line(b, c, cm, 1, z); return; }
    const N = lod >= 3 ? 10 : 6, pts = [];
    for (let i = 0; i <= N; i++) { const u = i / N; pts.push(u < 0.5 ? lerp2(a, b, u * 2) : lerp2(b, c, u * 2 - 1)); }
    const lr = Math.max(0.9 / T.S, 0.0105);
    pts.forEach((p, i) => T.ell(p, lr * (i % 2 ? 1.0 : 0.72), lr * (i % 2 ? 0.72 : 1.0), 0, cm, z));
    if (lod >= 3) for (const i of [3, 5, 7]) { const p = pts[i]; T.cap(p, add(p, [0.002, -0.024]), 0.0045, 0.0085, cm, z); }
  }
  function chainFront(T, tp, sw) {
    const lod = T.lod; if (lod === 0) return;
    const cm = mm('maho_chain'), z = Z.chain, N = lod >= 3 ? 14 : lod >= 2 ? 8 : 0;
    const P = u => { const x = (u * 2 - 1) * sw * 0.72; return tp(0.965 - 0.09 * (1 - (u * 2 - 1) ** 2), x); };
    if (!N) { T.line(P(0), P(0.5), cm, 1, z); T.line(P(0.5), P(1), cm, 1, z); return; }
    const lr = Math.max(0.9 / T.S, 0.0105);
    for (let i = 0; i <= N; i++) T.ell(P(i / N), lr * (i % 2 ? 1.0 : 0.72), lr * (i % 2 ? 0.72 : 1.0), 0, cm, z);
    if (lod >= 3) for (const u of [0.3, 0.5, 0.7]) { const p = P(u); T.cap(p, add(p, [0, -0.026]), 0.0045, 0.0085, cm, z); }
  }
  // white sash (obi) over the hakama top, knotted in front, two tails that sway
  function sashSide(T, d, mat) {
    const { tp, ww, wh } = d, lod = T.lod, sec = secOf(T, 'cloth'), wind = windOf(T);
    const sway = [clamp(sec[0] * 1.3 - wind * 0.02, -0.1, 0.1), clamp(sec[1] * 0.8, -0.06, 0.06)];
    T.poly([tp(0.25, -ww * 1.12), tp(0.25, ww * 1.2), tp(0.1, wh * 1.5), tp(0.1, -wh * 1.42)], mat, Z.sash, 0, -1, d.fw);
    const knot = tp(0.17, ww * 1.24);
    for (const [Ln, off, w0] of [[0.13, 0, 0.017], [0.1, 0.02, 0.014]]) {
      const tip = add(add(knot, [0.012 + off, -Ln]), mul(sway, Ln * 4)), mid = add(lerp2(knot, tip, 0.5), mul(sway, Ln * 1.2));
      T.poly([add(knot, [-w0 * 0.5, 0]), add(mid, [-w0 * 0.7, 0]), add(tip, [-w0, 0]), add(tip, [w0 * 0.6, -0.004]), add(mid, [w0 * 0.7, 0]), add(knot, [w0 * 0.6, 0])], mat, Z.sash + 1, off ? -1 : 0, -1, [1, 0]);
    }
    T.ell(knot, 0.024, 0.019, 0, mat, Z.sash + 2);
    if (lod >= 3) T.line(tp(0.2, -ww * 0.9), tp(0.15, wh * 1.1), mat, 1, Z.sash);
  }
  function sashFront(T, tp, ww, mat, back) {
    const sec = secOf(T, 'cloth'), wind = windOf(T), sway = [clamp(sec[0] * 1.3 - wind * 0.02, -0.1, 0.1), clamp(sec[1] * 0.7, -0.06, 0.06)];
    T.poly([tp(0.25, -ww * 1.34), tp(0.25, ww * 1.34), tp(0.1, ww * 1.4), tp(0.1, -ww * 1.4)], mat, Z.sash, 0, -1, [1, 0]);
    if (back) return;
    const knot = tp(0.17, ww * 0.3);
    for (const [Ln, dx] of [[0.13, -0.012], [0.11, 0.014]]) { const tip = add(add(knot, [dx, -Ln]), mul(sway, Ln * 3)); T.poly([add(knot, [-0.01, 0]), add(tip, [-0.014, 0]), add(tip, [0.012, -0.003]), add(knot, [0.01, 0])], mat, Z.sash + 1, dx > 0 ? -1 : 0, -1, [1, 0]); }
    T.ell(knot, 0.022, 0.019, 0, mat, Z.sash + 2);
  }

  function mahoSide(T, swordOn, swordGlow) {
    const J = T.J, lod = T.lod, skin = mm('maho_skin'), hak = mm('maho_hakama');
    const swordArm = opt(T, 'swordArm', 'na');
    const d = torsoFrame(T), { tp, wc, ww, wh, fw } = d;
    const H = headFrame(T);
    mahoAppendage(T, H, Z.back, false);
    mahoArm(T, 'fa', Z.farArm, -1, swordOn && swordArm === 'fa', swordGlow, Z.farBlade);
    bareFootSide(T, 'fl', skin, Z.farLeg, -1);
    hakamaLeg(T, 'fl', hak, Z.farLeg, -1);
    T.poly([tp(0.04, -ww * 1.0), tp(0.04, ww * 1.08), tp(0.34, ww * 1.14), tp(0.6, wc * 0.96), tp(0.76, wc * 1.1), tp(0.9, wc * 0.98), tp(1.02, wc * 0.55), tp(1.12, wc * 0.05), tp(1.1, -wc * 0.45), tp(0.98, -wc * 0.98), tp(0.72, -wc * 1.08), tp(0.36, -ww * 1.02)], skin, Z.torso, 0, -1, fw);
    T.ell(tp(1.06, -wc * 0.22), wc * 0.56, wc * 0.46, ang(fw), skin, Z.torso);
    if (lod >= 2) mahoTorsoDetails(T, d);
    chainSide(T, d);
    T.poly([tp(0.17, -ww * 1.08), tp(0.17, ww * 1.14), tp(-0.06, wh * 1.6), tp(-0.2, wh * 1.35), tp(-0.2, -wh * 1.35), tp(-0.08, -wh * 1.55)], hak, Z.hips, 0, -1, fw);
    bareFootSide(T, 'nl', skin, Z.nearLeg, 0);
    hakamaLeg(T, 'nl', hak, Z.nearLeg, 0);
    sashSide(T, d, mm('whiteCloth'));
    mahoHeadSide(T, H);
    mahoArm(T, 'na', Z.nearArm, 0, swordOn && swordArm === 'na', swordGlow, Z.blade);
  }
  function mahoFront(T, back, swordOn, swordGlow) {
    const J = T.J, pr = T.prop, lod = T.lod, skin = mm('maho_skin'), hak = mm('maho_hakama');
    const hip = J.hip, ch = J.chest, up = norm(sub(ch, hip)), rt = [up[1], -up[0]], L = vlen(sub(ch, hip));
    const tp = (s, f) => add(hip, add(mul(up, s * L), mul(rt, f)));
    const sw = pr.shoulderW / 2, ww = pr.waist * 0.62, hw = pr.hipW / 2;
    const H = headFrame(T);
    for (const k of ['fl', 'nl']) { const dt = k === 'fl' ? -1 : 0, s = k === 'nl' ? 1 : -1; bareFootFront(T, k, s, skin, Z.farLeg, dt); hakamaLegFront(T, k, s, hak, Z.farLeg, dt); }
    T.poly([tp(0.12, -hw * 1.3), tp(0.12, hw * 1.3), add(J.nlK, [-pr.leg * 0.3, 0]), add(J.flK, [pr.leg * 0.3, 0])], hak, Z.farLeg, 0, 1, rt);
    T.poly([tp(0.02, -ww * 1.2), tp(0.02, ww * 1.2), tp(0.32, ww * 1.3), tp(0.6, sw * 0.74), tp(0.8, sw * 0.95), tp(0.96, sw * 0.86), tp(1.07, sw * 0.42), tp(1.12, sw * 0.12), tp(1.12, -sw * 0.12), tp(1.07, -sw * 0.42), tp(0.96, -sw * 0.86), tp(0.8, -sw * 0.95), tp(0.6, -sw * 0.74), tp(0.32, -ww * 1.3)], skin, Z.torso, 0, -1, rt);
    if (lod >= 2) {
      const z = Z.torsoDet;
      if (!back) {
        for (const s of [-1, 1]) { T.line(tp(0.64, s * sw * 0.06), tp(0.6, s * sw * 0.42), skin, 1, z); T.line(tp(0.6, s * sw * 0.42), tp(0.67, s * sw * 0.7), skin, 1, z); }
        T.line(tp(0.1, 0), tp(0.58, 0), skin, 1, z);
        for (const s of [0.24, 0.36, 0.48]) T.line(tp(s, -ww * 0.85), tp(s, ww * 0.85), skin, 1, z);
        if (lod >= 3) T.line(tp(0.66, 0), tp(0.92, 0), skin, 1, z);
      } else {
        T.line(tp(0.1, 0), tp(1.0, 0), skin, 1, z);
        for (const s of [-1, 1]) { T.line(tp(0.9, s * sw * 0.2), tp(0.7, s * sw * 0.55), skin, 1, z); T.line(tp(0.7, s * sw * 0.55), tp(0.56, s * sw * 0.4), skin, 1, z); }
      }
    }
    if (!back) chainFront(T, tp, sw);
    T.poly([tp(0.2, -ww * 1.26), tp(0.2, ww * 1.26), tp(-0.1, hw * 1.45), tp(-0.1, -hw * 1.45)], hak, Z.hips, 0, -1, rt);
    sashFront(T, tp, ww, mm('whiteCloth'), back);
    const swordKey = back ? 'na' : 'fa';
    mahoArm(T, 'fa', Z.nearArm - 2, 0, swordOn && swordKey === 'fa', swordGlow, Z.blade - 2);
    mahoArm(T, 'na', Z.nearArm, 0, swordOn && swordKey === 'na', swordGlow, Z.blade);
    if (back) mahoAppendage(T, H, Z.head + 2, true);
    mahoHeadFront(T, H, back);
  }
  function mahoBuild(T) {
    const P = T.P;
    const swordOn = opt(T, 'sword', true) !== false, swordGlow = !!opt(T, 'swordGlow', false);
    if (P.view === 'side') mahoSide(T, swordOn, swordGlow); else mahoFront(T, P.view === 'back', swordOn, swordGlow);
    if (opt(T, 'wheel', true) !== false) {
      const c = wheelCenter(T, headFrame(T));
      wheelParts(T, c, WHEEL.R, +opt(T, 'wheelAngle', 0) || 0, +opt(T, 'wheelGlow', 0) || 0, P.view === 'side' ? 0.62 : 1, Z.wheel);
      T.J.wheel = c;
    }
  }
  rig.define({ name: 'mahoraga', height: 3.4, prop: MAHO_PROP, margin: 0.4, extraTop: 0.0, build: mahoBuild });

  // the wheel alone (tiny skeleton so the canvas is just the wheel): HT.shiki.wheel(ctx, x, y, rPx, angleDeg, o)
  const WH_PROP = { foot: 1e-4, shin: 1e-4, thigh: 1e-4, spine: 1e-4, neck: 1e-4, head: 1e-4, uarm: 1e-4, farm: 1e-4, hand: 1e-4, shoulderW: 1e-4, hipW: 1e-4, chest: 1e-4, waist: 1e-4, limb: 1e-4, leg: 1e-4 };
  const WR = 0.105 / WHEEL.handle, WCY = 0.045; // rim radius and centre height in the pseudo character's units
  rig.define({ name: 'maho_wheel', height: 1, prop: WH_PROP, margin: 0.15, extraTop: 0,
    build(T) { const c = [0, WCY]; wheelParts(T, c, WR, +opt(T, 'wheelAngle', 0) || 0, +opt(T, 'wheelGlow', 0) || 0, T.P.view === 'side' ? 0.62 : 1, 10); T.J.wheel = c; } });
  // draw the wheel centred at (x, y) with rim radius rPx; o: { glow, view:'front'|'side', light, rimDir, mode, tint, alpha, key }
  shiki.wheel = (ctx, x, y, rPx, angleDeg = 0, o = {}) => {
    const px = Math.max(8, Math.round(rPx / WR));
    const P = rig.full({ view: o.view === 'side' ? 'side' : 'front', wheelAngle: angleDeg, wheelGlow: o.glow || 0 });
    const r = rig.render('maho_wheel', P, px, { light: o.light, rimDir: o.rimDir, mode: o.mode, tint: o.tint, face: o.face || 1, key: o.key === undefined ? 'w' + (+angleDeg).toFixed(1) + '|' + (o.glow || 0) + '|' + (o.view || 'f') : o.key });
    const cx = r.ox, cy = r.oy - WCY * px, a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0) return r;
    const oa = ctx.globalAlpha; if (a < 1) ctx.globalAlpha = oa * a;
    ctx.drawImage(r.canvas, Math.round(x - cx), Math.round(y - cy));
    if (a < 1) ctx.globalAlpha = oa;
    return r;
  };
  shiki.WHEEL = WHEEL;

  // ================================================================== AGITO
  const AG_PROP = { head: 0.125, neck: 0.045, spine: 0.3, thigh: 0.245, shin: 0.235, foot: 0.04, uarm: 0.195, farm: 0.18, hand: 0.085,
    chest: 0.16, waist: 0.1, hipW: 0.17, shoulderW: 0.3, limb: 0.037, leg: 0.048 };
  // clawed hand: dark palm + bone talons (curl by hand shape)
  function talons(T, key, shape, z, dt) {
    const J = T.J, pr = T.prop, r = pr.limb, lod = T.lod;
    const Wr = J[key + 'W'], Hh = J[key + 'H'], dir = norm(sub(Hh, Wr)), n = perp(dir);
    T.ell(lerp2(Wr, Hh, 0.55), r * 1.05, r * 0.92, ang(dir), mm('ag_feather'), z, dt);
    const claw = mm('ag_claw');
    const curl = shape === 'fist' ? 1.15 : shape === 'claw' ? 0.6 : shape === 'open' ? 0.15 : 0.4;
    const cnt = lod >= 2 ? 4 : 2, Lc = pr.hand * (shape === 'fist' ? 0.5 : 0.8) * (lod <= 1 ? 1.2 : 1);
    for (let k = 0; k < cnt; k++) {
      const b = add(lerp2(Wr, Hh, 1.05), mul(n, (k - (cnt - 1) / 2) * r * 0.5));
      const m1 = add(b, mul(norm(add(dir, mul(n, curl * 0.5))), Lc * 0.55));
      const tip = add(m1, mul(norm(add(dir, mul(n, curl * 1.4))), Lc * 0.45));
      T.cap(b, m1, r * 0.27, r * 0.18, claw, z, dt);
      T.cap(m1, tip, r * 0.18, r * 0.05, claw, z, dt);
    }
  }
  // feathered arm with a wing-like fringe of long feathers along its underside (outer = fringe side in front view)
  function featherArm(T, key, z, dt, outer) {
    const J = T.J, pr = T.prop, aR = pr.limb, lod = T.lod, P = T.P;
    const S0 = J[key + 'S'], E = J[key + 'E'], Wr = J[key + 'W'];
    const fea = mm('ag_feather'), ua = norm(sub(E, S0)), fa = norm(sub(Wr, E));
    const sec = secOf(T, 'cloth'), wind = windOf(T), t = tOf(T);
    const sway = [sec[0] * 1.6 - wind * 0.02, sec[1] * 0.8];
    const n = lod >= 3 ? 8 : lod >= 2 ? 6 : lod >= 1 ? 4 : 3;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.6) / n, fore = u > 0.4, uu = fore ? (u - 0.4) / 0.6 : u / 0.4;
      const a = fore ? E : S0, b = fore ? Wr : E, dir = fore ? fa : ua;
      let nn = perp(dir);
      if (outer) { if (nn[0] * outer[0] + nn[1] * outer[1] < 0) nn = mul(nn, -1); }
      else if (nn[1] > 0.3) nn = mul(nn, -1);
      const flut = t === null ? 0 : 0.08 * sin(t * 7 + i * 1.7);
      const fd = norm(add(add(mul(nn, 0.55), [flut, -0.5]), mul(sway, 3)));
      const Lf = (0.04 + 0.17 * u * u) * (lod <= 1 ? 1.15 : 1);
      feather(T, add(lerp2(a, b, uu), mul(nn, aR * 0.45)), fd, Lf, aR * (0.5 + 0.4 * u), fea, z, (dt || 0) - (i % 2));
    }
    T.ell(add(S0, mul(ua, aR * 0.35)), aR * 1.4, aR * 1.25, ang(ua), fea, z, dt);
    T.cap(S0, E, aR * 1.18, aR * 0.95, fea, z, dt);
    T.cap(E, Wr, aR * 1.0, aR * 0.78, fea, z, dt);
    if (lod >= 2) { const m = lerp2(E, Wr, 0.5), q = perp(fa); T.line(add(E, mul(q, aR * 0.3)), add(m, mul(q, aR * 0.5)), fea, 3, z); } // feather sheen
    talons(T, key, key === 'na' ? P.nh : P.fh, z + 1, dt);
  }
  // tiger leg below the hakama hem + big striped paw with bone claws (side)
  function tigerPaw(T, key, z, dt) {
    const J = T.J, pr = T.prop, f = pr.foot, lod = T.lod, tig = mm('ag_tiger'), mk = mm('mark');
    const K = J[key + 'K'], A = J[key + 'A'], toe = J[key + 'T'];
    T.cap(lerp2(K, A, 0.6), A, pr.leg * 0.95, pr.leg * 0.8, tig, z, dt);
    const d = norm(sub(toe, A)), n = perp(d), Q = (u, v) => add(A, add(mul(d, u * f), mul(n, v * f)));
    T.poly([Q(-0.7, -0.7), Q(-1.0, 0.1), Q(-0.7, 0.95), Q(1.6, 1.0), Q(2.5, 0.8), Q(2.7, 0.3), Q(2.3, -0.3), Q(1.2, -0.55), Q(0.4, -0.85)], tig, z, dt, -1, mul(n, -1));
    if (lod >= 2) {
      T.line(Q(1.95, 0.9), Q(1.95, 0.3), mk, 0, z); T.line(Q(1.35, 0.95), Q(1.4, 0.15), mk, 0, z);
      T.line(Q(0.2, -0.75), Q(0.55, -0.2), mk, 0, z); T.line(Q(-0.55, -0.55), Q(-0.2, 0.05), mk, 0, z);
      const kd = norm(sub(A, K)), kp = perp(kd);
      for (const u of [0.72, 0.86]) { const p = lerp2(K, A, u); T.line(add(p, mul(kp, pr.leg * 0.7)), add(add(p, mul(kd, pr.leg * 0.25)), mul(kp, -pr.leg * 0.1)), mk, 0, z); }
    }
    if (lod >= 1) { const cl = mm('ag_claw'); for (const [u, v] of [[2.55, 0.8], [2.15, 0.93], [1.6, 1.0]]) T.cap(Q(u, v - 0.2), Q(u + 0.38, v + 0.08), f * 0.15, f * 0.05, cl, z + 1, dt); }
  }
  function tigerPawFront(T, key, s, z, dt) {
    const J = T.J, pr = T.prop, f = pr.foot, lod = T.lod, tig = mm('ag_tiger');
    const K = J[key + 'K'], A = J[key + 'A'];
    T.cap(lerp2(K, A, 0.6), A, pr.leg * 0.95, pr.leg * 0.85, tig, z, dt);
    const Q = (u, v) => add(A, [(u + s * 0.1) * f, v * f]);
    T.poly([Q(-1.0, 0.5), Q(1.0, 0.5), Q(1.4, -0.4), Q(1.2, -1.0), Q(-1.2, -1.0), Q(-1.4, -0.4)], tig, z, dt, -1, [1, 0]);
    if (lod >= 2) { const mk = mm('mark'); T.line(Q(-0.4, -0.3), Q(-0.4, -0.95), mk, 0, z); T.line(Q(0.4, -0.3), Q(0.4, -0.95), mk, 0, z); T.line(Q(-0.9, 0.3), Q(-0.3, 0.1), mk, 0, z); T.line(Q(0.9, 0.3), Q(0.3, 0.1), mk, 0, z); }
    if (lod >= 1) { const cl = mm('ag_claw'); for (const u of [-0.8, 0, 0.8]) T.cap(Q(u, -0.75), Q(u, -1.15), f * 0.13, f * 0.05, cl, z + 1, dt); }
  }
  // serpent head (L = head length) at `neck` pointing along dir; open jaw; eye
  function snakeHead(T, neck, dir, L, mat, z) {
    const n0 = perp(dir), n = n0[1] < 0 ? mul(n0, -1) : n0, lod = T.lod;
    const Q = (u, v) => add(neck, add(mul(dir, u * L), mul(n, v * L)));
    T.poly([Q(-0.1, 0.3), Q(0.35, 0.42), Q(0.8, 0.3), Q(1.05, 0.08), Q(1.0, -0.05), Q(0.55, -0.02), Q(0.2, -0.3), Q(-0.1, -0.3)], mat, z, 0, -1, n);
    T.poly([Q(0.2, -0.3), Q(0.55, -0.1), Q(0.97, -0.32), Q(0.82, -0.42), Q(0.3, -0.44)], mat, z, -1, -1, n);
    if (lod >= 1) T.poly([Q(0.52, -0.04), Q(1.0, -0.06), Q(0.93, -0.28), Q(0.56, -0.1)], mm('ag_mouth'), z, 0, 1);
    if (lod >= 3) { T.line(Q(0.95, -0.05), Q(0.92, -0.18), mm('teeth'), 2, z); T.line(Q(0.2, 0.36), Q(0.7, 0.33), mat, 3, z); }
    if (lod >= 1) T.dot(Q(0.62, 0.2), mm('ag_eye'), 3, z + 1, lod >= 3 ? 2 : 1, 1);
    T.J.snakeHead = Q(0.9, 0);
  }
  // serpent tail from the lower back: S-curve, spring lag grows toward the tip; snake 0 = stump, 0..1 regrowing
  function agTail(T, root, z, front) {
    const lod = T.lod, snakeM = mm('ag_snake');
    const state = clamp(+opt(T, 'snake', 1), 0, 1), curl = +opt(T, 'tail', 0) || 0;
    const sec = secOf(T, 'cloth'), t = tOf(T);
    const base = front ? [-2.35, -2.75, -3.0, 2.75, 2.1] : [-2.45, -2.72, -3.05, 2.8, 2.2];
    const lens = [0.085, 0.08, 0.075, 0.07, 0.06], radii = [0.032, 0.029, 0.026, 0.022, 0.019, 0.017];
    const pts = [root];
    let p = root, a = 0;
    for (let i = 0; i < 5; i++) {
      a = base[i] - curl * (0.5 + 0.35 * i) + (t === null ? 0 : 0.12 * sin(t * 2.1 + i * 0.9));
      const Ln = lens[i] * (i >= 3 ? Math.max(0.001, state) : 1);
      p = add(add(p, [cos(a) * Ln, sin(a) * Ln]), mul([clamp(sec[0], -0.08, 0.08), clamp(sec[1], -0.06, 0.06)], 0.07 * (i + 1)));
      pts.push(p);
    }
    const k = lod <= 1 ? 1.2 : 1;
    chain(T, pts.slice(0, 4), radii.slice(0, 4).map(r => r * k), snakeM, z, -1);
    if (lod >= 2) for (let i = 0; i < 3; i++) { const m = lerp2(pts[i], pts[i + 1], 0.5), nn = perp(norm(sub(pts[i + 1], pts[i]))); T.line(add(m, mul(nn, radii[i] * 0.8)), add(m, mul(nn, -radii[i] * 0.8)), snakeM, 1, z); }
    if (state < 0.04) { T.ell(pts[3], radii[3] * 1.05 * k, radii[3] * 1.05 * k, 0, snakeM, z, -1); T.J.snakeHead = pts[3]; return; }
    const rg = state >= 0.999 ? snakeM : mm('ag_regrow');
    chain(T, pts.slice(3), radii.slice(3).map(r => r * k * (0.6 + 0.4 * state)), rg, z, state >= 0.999 ? -1 : 0);
    const last = norm(sub(pts[5], pts[4]));
    const hd = norm(add(last, front ? [-0.3, 0.9] : [1.5, 0.5 - curl * 0.8]));
    snakeHead(T, pts[5], hd, 0.085 * state * (lod <= 1 ? 1.3 : 1), rg, z);
  }
  // feathered mane: a ruff around the neck, feathers flowing back/down (+ a few over the chest)
  const MANE_SIDE = [[-28, 0.09], [-52, 0.12], [-76, 0.14], [-100, 0.15], [-124, 0.15], [-146, 0.13], [-166, 0.1], [118, 0.07], [140, 0.08], [160, 0.07]];
  function mane(T, c, z, spikes, front) {
    const fea = mm('ag_feather'), lod = T.lod, sec = secOf(T, 'hair'), t = tOf(T);
    T.ell(c, 0.075, front ? 0.06 : 0.07, 0, fea, z);
    const list = lod <= 1 ? spikes.filter((_, i) => i % 2 === 0) : spikes;
    list.forEach(([deg, Ln], i) => {
      const a = deg * D2R, dir = [sin(a), cos(a)];
      const flut = t === null ? 0 : 0.04 * sin(t * 5 + i * 1.3);
      const base = add(c, mul(dir, 0.045));
      const tip = add(add(base, mul(dir, Ln)), add(mul(sec, Ln * 3), [flut, -Ln * 0.25]));
      feather(T, base, norm(sub(tip, base)), vlen(sub(tip, base)), 0.03, fea, z, -(i % 2));
    });
  }
  function antlerSide(T, H, far, z) {
    const hs = T.prop.head, m = mm('ag_antler'), lod = T.lod;
    const du = far ? -0.12 : 0, dv = far ? 0.03 : 0, Q = (u, v) => H(u + du, v + dv);
    const b = [Q(0.04, 0.42), Q(-0.06, 0.92), Q(-0.32, 1.36), Q(-0.7, 1.64)];
    const k = lod <= 1 ? 1.35 : 1, r = [0.11, 0.085, 0.062, 0.03].map(v => v * hs * k);
    chain(T, b, r, m, z);
    T.cap(b[1], Q(0.26, 1.26), r[1] * 0.8, r[3] * 0.9, m, z);
    T.cap(lerp2(b[2], b[3], 0.25), Q(-0.24, 1.86), r[2] * 0.85, r[3] * 0.8, m, z);
    if (lod >= 2) { T.cap(lerp2(b[0], b[1], 0.35), Q(0.36, 0.8), r[1] * 0.75, r[3] * 0.8, m, z); T.cap(lerp2(b[2], b[3], 0.75), Q(-0.56, 1.95), r[3] * 1.3, r[3] * 0.7, m, z); }
  }
  function antlersFront(T, H, z) {
    const hs = T.prop.head, m = mm('ag_antler'), lod = T.lod, k = lod <= 1 ? 1.35 : 1;
    const r = [0.11, 0.085, 0.062, 0.03].map(v => v * hs * k);
    for (const s of [-1, 1]) {
      const b = [H(s * 0.22, 0.38), H(s * 0.46, 0.86), H(s * 0.76, 1.2), H(s * 1.12, 1.38)];
      chain(T, b, r, m, z);
      T.cap(b[1], H(s * 0.36, 1.34), r[1] * 0.8, r[3] * 0.9, m, z);
      T.cap(lerp2(b[2], b[3], 0.3), H(s * 0.84, 1.72), r[2] * 0.85, r[3] * 0.8, m, z);
      if (lod >= 2) { T.cap(lerp2(b[0], b[1], 0.4), H(s * 0.1, 0.86), r[1] * 0.75, r[3] * 0.8, m, z); T.cap(lerp2(b[2], b[3], 0.8), H(s * 1.16, 1.66), r[3] * 1.3, r[3] * 0.7, m, z); }
    }
  }
  function agitoHeadSide(T, H) {
    const hs = T.prop.head, z = Z.head, fea = mm('ag_feather'), bone = mm('ag_bone'), lod = T.lod, J = T.J, pr = T.prop;
    T.cap(J.neck, lerp2(J.chest, J.neck, 0.1), pr.limb * 1.3, pr.limb * 1.45, fea, Z.neck, -1);
    T.ell(H(-0.12, 0.06), 0.5 * hs, 0.48 * hs, J.headA, fea, z);
    const bk = lod <= 1 ? 1.25 : 1;
    T.poly([H(-0.1, 0.46), H(0.26, 0.5), H(0.5, 0.36), H(0.6, 0.14), H(0.64, 0.0), H(0.64 + 0.3 * bk, -0.1 * bk), H(0.64 + 0.42 * bk, -0.3 * bk), H(0.64 + 0.3 * bk, -0.26 * bk), H(0.62, -0.3), H(0.5, -0.42), H(0.22, -0.48), H(-0.02, -0.36), H(-0.12, 0.08)], bone, Z.mask, 0, -1, [1, 0]);
    if (lod >= 1) {
      T.poly([H(0.2, 0.2), H(0.52, 0.13), H(0.47, 0.01), H(0.26, 0.04)], mm('mark'), Z.faceDet, 0, 0);
      T.dot(H(0.4, 0.08), mm('ag_eye'), 3, Z.faceDet + 1, lod >= 3 ? 2 : 1, lod >= 3 ? 2 : 1);
      T.J.maskEye = H(0.4, 0.08);
    }
    if (lod >= 2) {
      T.line(H(0.18, 0.3), H(0.56, 0.22), bone, 1, Z.mask);                         // brow ridge
      T.line(H(0.66, -0.04), H(0.9, -0.24), mm('ag_antler'), 0, Z.faceDet);         // beak ridge
      T.line(H(0.62, -0.28), H(0.92, -0.28), mm('ag_antler'), 0, Z.faceDet);        // beak gape
      T.line(H(0.24, -0.04), H(0.3, -0.26), mm('mark'), 0, Z.faceDet); T.line(H(0.38, -0.04), H(0.42, -0.22), mm('mark'), 0, Z.faceDet); // mask markings
    }
  }
  function agitoHeadFront(T, H, back) {
    const hs = T.prop.head, z = Z.head, fea = mm('ag_feather'), bone = mm('ag_bone'), lod = T.lod, J = T.J, pr = T.prop;
    T.cap(J.neck, lerp2(J.chest, J.neck, 0.1), pr.limb * 1.45, pr.limb * 1.6, fea, Z.neck, -1);
    T.ell(H(0, 0.06), 0.48 * hs, 0.48 * hs, J.headA, fea, z);
    if (back) return;
    const bk = lod <= 1 ? 1.25 : 1;
    T.poly([H(-0.38, 0.48), H(0.38, 0.48), H(0.48, 0.14), H(0.38, -0.2), H(0.14, -0.32), H(0.06, -0.3 - 0.36 * bk), H(0, -0.34 - 0.42 * bk), H(-0.06, -0.3 - 0.36 * bk), H(-0.14, -0.32), H(-0.38, -0.2), H(-0.48, 0.14)], bone, Z.mask, 0, -1, [1, 0]);
    if (lod >= 1) for (const s of [-1, 1]) { T.poly([H(s * 0.06, 0.06), H(s * 0.36, 0.2), H(s * 0.36, 0.08), H(s * 0.1, -0.02)], mm('mark'), Z.faceDet, 0, 0); T.dot(H(s * 0.22 - (s < 0 ? 0.02 : 0), 0.08), mm('ag_eye'), 3, Z.faceDet + 1, lod >= 3 ? 2 : 1, lod >= 3 ? 2 : 1); }
    T.J.maskEye = H(0.22, 0.08);
    if (lod >= 2) { T.line(H(0, 0.44), H(0, -0.3), bone, 1, Z.mask); for (const s of [-1, 1]) T.line(H(s * 0.2, -0.06), H(s * 0.24, -0.24), mm('mark'), 0, Z.faceDet); }
  }
  // tiger stripes across the pale torso (side): tapered, from the back edge wrapping forward
  function stripesSide(T, d) {
    const { tp, wc, ww } = d, mk = mm('mark'), z = Z.torsoDet, lod = T.lod;
    if (lod === 0) return;
    const edge = s => lerp(ww * 0.88, wc * 0.96, HT.smooth((s - 0.2) / 0.55));
    const list = lod >= 2 ? [[0.1, 0.18, 0.35], [0.24, 0.33, 0.6], [0.38, 0.45, 0.25], [0.5, 0.6, 0.55], [0.64, 0.7, 0.2], [0.8, 0.88, 0.45]] : [[0.24, 0.33, 0.5], [0.5, 0.6, 0.5], [0.8, 0.88, 0.4]];
    for (const [s0, s1, fe] of list) {
      const e0 = edge(s0), e1 = edge(s1);
      if (lod >= 2) T.poly([tp(s0, -e0 * 0.95), tp(s0 + 0.04, -e0 * 0.95), tp(s1 + 0.012, fe * e1), tp(s1 - 0.004, fe * e1 - 0.004)], mk, z, 0, 0);
      else T.line(tp(s0, -e0 * 0.85), tp(s1, fe * e1), mk, 0, z);
    }
  }
  // Nue's electricity: short jagged arcs (flat bright), seeded per drawing (o.t when given, else from the pose)
  function sparks(T, level, anchors) {
    if (level <= 0.02 || T.lod === 0) return;
    const P = T.P, t = tOf(T), m = mm('ag_spark');
    const seed = t !== null ? Math.floor(t * 12) : Math.round((P.na[0] + P.fa[0] * 3 + P.lean * 7 + P.nl[0] * 11 + P.na[1] * 5) * 10);
    const n = Math.max(1, Math.round(level * (T.lod >= 3 ? 7 : T.lod >= 2 ? 5 : 3)));
    const w = T.lod >= 3 && T.S > 220 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const h = k => HT.hash(i * 13 + k, seed);
      const A0 = anchors[i % anchors.length];
      let p = add(A0, [(h(1) - 0.5) * 0.07, (h(2) - 0.5) * 0.07]);
      let dir = [cos(h(3) * TAU), sin(h(3) * TAU)];
      const segs = 3 + ((h(4) * 3) | 0), step = 0.016 + 0.018 * h(5) + 0.4 / T.S;
      for (let s = 0; s < segs; s++) {
        dir = norm(rot(dir, (h(10 + s) - 0.5) * 2.0));
        const q = add(p, mul(dir, step));
        T.line(p, q, m, s === 0 ? 2 : 3, Z.spark, w);
        if (s === 1 && h(20) < 0.5) T.line(q, add(q, mul(norm(rot(dir, 1.1)), step * 0.7)), m, 2, Z.spark);
        p = q;
      }
    }
  }

  function agitoSide(T) {
    const J = T.J, P = T.P, lod = T.lod, body = mm('ag_body'), hak = mm('ag_hakama'), fea = mm('ag_feather');
    const d = torsoFrame(T), { tp, wc, ww, wh, fw } = d;
    const H = headFrame(T);
    agTail(T, tp(0.08, -wh * 1.25), Z.back, false);
    antlerSide(T, H, true, 15);
    featherArm(T, 'fa', Z.farArm, -1, null);
    tigerPaw(T, 'fl', Z.farLeg, -1);
    hakamaLeg(T, 'fl', hak, Z.farLeg, -1, { hemU: 0.72, flare: 1.65, knee: 1.3, thigh: 1.45 });
    T.poly([tp(0.04, -ww * 1.02), tp(0.04, ww * 1.08), tp(0.3, ww * 0.9), tp(0.56, wc * 0.9), tp(0.7, wc * 1.12), tp(0.84, wc * 1.04), tp(0.97, wc * 0.72), tp(1.06, wc * 0.3), tp(1.08, -wc * 0.3), tp(0.96, -wc * 0.96), tp(0.7, -wc * 1.0), tp(0.4, -ww * 0.88), tp(0.15, -ww * 1.0)], opt(T, 'regrow', 0) > 0.5 ? mm('ag_regrow') : body, Z.torso, 0, -1, fw);
    stripesSide(T, d);
    if (lod >= 2) T.line(tp(0.63, wc * 0.95), tp(0.68, wc * 0.35), body, 1, Z.torsoDet);
    T.poly([tp(0.17, -ww * 1.08), tp(0.17, ww * 1.14), tp(-0.06, wh * 1.6), tp(-0.2, wh * 1.35), tp(-0.2, -wh * 1.35), tp(-0.08, -wh * 1.55)], hak, Z.hips, 0, -1, fw);
    tigerPaw(T, 'nl', Z.nearLeg, 0);
    hakamaLeg(T, 'nl', hak, Z.nearLeg, 0, { hemU: 0.72, flare: 1.65, knee: 1.3, thigh: 1.45 });
    T.poly([tp(0.24, -ww * 1.1), tp(0.24, ww * 1.14), tp(0.11, wh * 1.45), tp(0.11, -wh * 1.4)], fea, Z.sash, 0, -1, fw); // dark sash
    mane(T, lerp2(J.chest, J.neck, 0.55), Z.mane, MANE_SIDE, false);
    agitoHeadSide(T, H);
    antlerSide(T, H, false, Z.wingNear + 1);
    featherArm(T, 'na', Z.nearArm, 0, null);
    const lvl = clamp(+opt(T, 'spark', 0.3), 0, 1);
    sparks(T, lvl, lvl >= 0.9 ? [J.naH, J.naH, J.naW, J.naE, J.naH, J.head] : [J.naH, J.faH, J.naE, J.chest, J.head, J.faE]);
  }
  function agitoFront(T, back) {
    const J = T.J, pr = T.prop, lod = T.lod, body = mm('ag_body'), hak = mm('ag_hakama'), fea = mm('ag_feather');
    const hip = J.hip, ch = J.chest, up = norm(sub(ch, hip)), rt = [up[1], -up[0]], L = vlen(sub(ch, hip));
    const tp = (s, f) => add(hip, add(mul(up, s * L), mul(rt, f)));
    const sw = pr.shoulderW / 2, ww = pr.waist * 0.62, hw = pr.hipW / 2;
    const H = headFrame(T);
    agTail(T, tp(0.06, -hw * 0.5), back ? Z.hips + 2 : 4, true);
    for (const k of ['fl', 'nl']) { const dt = k === 'fl' ? -1 : 0, s = k === 'nl' ? 1 : -1; tigerPawFront(T, k, s, Z.farLeg, dt); hakamaLegFront(T, k, s, hak, Z.farLeg, dt, { hemU: 0.72, flare: 1.65 }); }
    T.poly([tp(0.12, -hw * 1.3), tp(0.12, hw * 1.3), add(J.nlK, [-pr.leg * 0.3, 0]), add(J.flK, [pr.leg * 0.3, 0])], hak, Z.farLeg, 0, 1, rt);
    T.poly([tp(0.02, -hw * 1.2), tp(0.02, hw * 1.2), tp(0.3, ww * 1.05), tp(0.6, sw * 0.66), tp(0.8, sw * 0.86), tp(0.96, sw * 0.84), tp(1.06, sw * 0.4), tp(1.1, sw * 0.12), tp(1.1, -sw * 0.12), tp(1.06, -sw * 0.4), tp(0.96, -sw * 0.84), tp(0.8, -sw * 0.86), tp(0.6, -sw * 0.66), tp(0.3, -ww * 1.05)], opt(T, 'regrow', 0) > 0.5 ? mm('ag_regrow') : body, Z.torso, 0, -1, rt);
    if (lod >= 1) { // stripes from both flanks toward the centre
      const mk = mm('mark'), edge = s => lerp(ww * 1.0, sw * 0.8, HT.smooth((s - 0.25) / 0.55));
      const list = lod >= 2 ? [[0.12, 0.18, 0.4], [0.3, 0.36, 0.55], [0.46, 0.52, 0.35], [0.62, 0.68, 0.5], [0.8, 0.86, 0.3]] : [[0.3, 0.36, 0.5], [0.62, 0.68, 0.45]];
      for (const [s0, s1, fe] of list) for (const g of [-1, 1]) { const e0 = edge(s0), e1 = edge(s1); if (lod >= 2) T.poly([tp(s0, g * e0 * 0.95), tp(s0 + 0.04, g * e0 * 0.95), tp(s1 + 0.01, g * e1 * (1 - fe)), tp(s1 - 0.004, g * e1 * (1 - fe))], mk, Z.torsoDet, 0, 0); else T.line(tp(s0, g * e0 * 0.85), tp(s1, g * e1 * (1 - fe)), mk, 0, Z.torsoDet); }
    }
    T.poly([tp(0.2, -ww * 1.26), tp(0.2, ww * 1.26), tp(-0.1, hw * 1.45), tp(-0.1, -hw * 1.45)], hak, Z.hips, 0, -1, rt);
    T.poly([tp(0.25, -ww * 1.32), tp(0.25, ww * 1.32), tp(0.11, ww * 1.4), tp(0.11, -ww * 1.4)], fea, Z.sash, 0, -1, rt);
    const spikes = []; // radial ruff: over both shoulders + down the chest
    for (const s of [-1, 1]) for (const [deg, Ln] of [[70, 0.1], [95, 0.13], [120, 0.14], [145, 0.12], [165, 0.09]]) spikes.push([s * deg, Ln]);
    mane(T, lerp2(J.chest, J.neck, 0.35), Z.mane, spikes, true);
    featherArm(T, 'fa', Z.nearArm - 2, 0, [-1, 0]);
    featherArm(T, 'na', Z.nearArm, 0, [1, 0]);
    agitoHeadFront(T, H, back);
    antlersFront(T, H, back ? Z.head + 2 : Z.wingNear + 1);
    const lvl = clamp(+opt(T, 'spark', 0.3), 0, 1);
    sparks(T, lvl, [J.naH, J.faH, J.naE, J.faE, J.chest, J.head]);
  }
  rig.define({ name: 'agito', height: 3.0, prop: AG_PROP, margin: 0.44, extraTop: 0.04, build(T) { if (T.P.view === 'side') agitoSide(T); else agitoFront(T, T.P.view === 'back'); } });

  // ================================================================== AIRPORT CODA: GETO, NANAMI, HAIBARA, YAGA
  // generic student build (chars.js z-layers: 1 far arm · 3 far leg · 4 back cloth · 5 torso · 6 details · 7 near leg ·
  // 8 front cloth · 9 head · 10 face · 11 hair · 13 near arm). cfg: skin top pants legs shoe eye hairSide hairFront
  // collar button cropped shirt coat glasses beard earrings
  function coatSide(T, d, cfg, layer) {
    const J = T.J, m = cfg.top, sec = secOf(T, 'cloth'), wind = windOf(T), sway = [clamp(sec[0] * 0.8 - wind * 0.015, -0.05, 0.05), clamp(sec[1] * 0.5, -0.03, 0.03)];
    const { tp, ww, wh } = d;
    if (layer === 'back') { const P0 = J.flP, K = J.flK; T.poly([tp(0.3, -ww * 1.15), tp(0.2, wh * 0.4), add(lerp2(P0, K, 1.12), add([0.035, -0.02], sway)), add(lerp2(P0, K, 1.12), add([-0.1, -0.01], mul(sway, 1.2)))], m, 4, -1, -1, d.fw); }
    else { const P0 = J.nlP, K = J.nlK; T.poly([tp(0.36, ww * 1.12), add(lerp2(P0, K, 1.1), add([0.075, -0.02], sway)), add(lerp2(P0, K, 1.1), add([-0.07, 0], mul(sway, 1.1))), tp(0.22, -ww * 0.55)], m, 8, 0, -1, d.fw); if (T.lod >= 2) T.line(tp(0.34, ww * 0.9), add(lerp2(P0, K, 1.06), [0.05, -0.01]), m, 1, 8); }
  }
  // very baggy student trousers (Geto): wide from hip to shin, gathered hard at the ankle
  function bontanLeg(T, key, mat, z, dt) {
    const J = T.J, lR = T.prop.leg, P0 = J[key + 'P'], K = J[key + 'K'], A = J[key + 'A'];
    T.cap(P0, K, lR * 1.6, lR * 1.62, mat, z, dt);
    T.cap(K, lerp2(K, A, 0.72), lR * 1.62, lR * 1.3, mat, z, dt);
    T.cap(lerp2(K, A, 0.7), A, lR * 1.3, lR * 0.62, mat, z, dt);
    if (T.lod >= 2) { const kd = norm(sub(A, K)), kp = perp(kd), tone = Math.max(0, 1 + (dt || 0)); T.line(add(K, mul(kp, lR * 0.6)), add(lerp2(K, A, 0.5), mul(kp, -lR * 0.5)), mat, tone, z); T.line(add(lerp2(K, A, 0.84), mul(kp, lR * 0.8)), add(lerp2(K, A, 0.84), mul(kp, -lR * 0.8)), mat, tone, z); }
  }
  const legOf = (T, key, cfg, z, dt) => (cfg.legs === 'bontan' ? bontanLeg(T, key, cfg.pants, z, dt) : Hp.legSide(T, key, cfg.pants, z, dt, cfg.legs));
  function humanSide(T, cfg) {
    const lod = T.lod, d = torsoFrame(T), { tp, wc, ww, wh, fw } = d;
    if (cfg.coat) coatSide(T, d, cfg, 'back');
    Hp.armSide(T, 'fa', cfg, 1, -1);
    legOf(T, 'fl', cfg, 3, -1); Hp.footSide(T, 'fl', cfg.shoe, 3, -1, 'shoe');
    const hemS = cfg.cropped ? 0.3 : 0.02;
    if (cfg.cropped) T.poly([tp(0.36, -ww * 1.0), tp(0.36, ww * 1.02), tp(0.02, wh * 1.12), tp(0.02, -wh * 1.08)], cfg.shirt, 5, 0, -1, fw);
    T.poly([tp(hemS, -wh * 1.12), tp(hemS, wh * 1.18), tp(0.4, ww * 1.05), tp(0.76, wc * 1.08), tp(0.96, wc * 0.74), tp(1.03, wc * 0.22), tp(1.03, -wc * 0.42), tp(0.9, -wc * 1.02), tp(0.48, -ww * 1.02)], cfg.top, 5, 0, -1, fw);
    if (cfg.cropped) T.poly([tp(0.95, wc * 0.72), tp(0.34, ww * 1.03), tp(0.34, ww * 0.62), tp(0.9, wc * 0.4)], cfg.shirt, 6, 0, -1, fw);
    T.poly([tp(0.12, -wh * 1.2), tp(0.12, wh * 1.25), tp(-0.12, wh * 1.35), tp(-0.14, -wh * 1.3)], cfg.pants, 5, 0, -1, fw);
    if (cfg.collar) {
      T.poly([tp(0.94, wc * 0.6), tp(1.15, wc * 0.46), tp(1.16, -wc * 0.48), tp(0.93, -wc * 0.85)], cfg.top, 6, 0, -1, fw);
      if (cfg.button && lod >= 2) T.dot(tp(1.05, wc * 0.5), cfg.button, 2, 6, lod >= 3 ? 2 : 1, lod >= 3 ? 2 : 1);
    }
    if (lod >= 2 && !cfg.cropped && !cfg.coat) T.line(tp(0.98, wc * 0.72), tp(0.1, ww * 0.95), cfg.seam || mm('blackSoft'), 1, 6);
    if (cfg.coat && lod >= 2) T.line(tp(1.0, wc * 0.7), tp(0.4, ww * 1.0), mm('coda_black'), 0, 6); // coat opening
    legOf(T, 'nl', cfg, 7, 0); Hp.footSide(T, 'nl', cfg.shoe, 7, 0, 'shoe');
    if (cfg.coat) coatSide(T, d, cfg, 'front');
    const H = headFrame(T);
    Hp.headSide(T, H, cfg.skin);
    if (cfg.glasses) glassesSide(T, H); else codaEyesSide(T, H, cfg.eye);
    Hp.mouthSide(T, H);
    if (cfg.beard) beardSide(T, H, cfg.beard);
    cfg.hairSide(T, H);
    if (cfg.earrings) earringSide(T, H, cfg.skin);
    Hp.armSide(T, 'na', cfg, 13, 0);
  }
  // front / back view; P.sit → seated legs (thighs toward the camera, shins down to the floor)
  function humanFront(T, cfg, back) {
    const J = T.J, pr = T.prop, P = T.P, lod = T.lod, aR = pr.limb * 1.05, lR = pr.leg;
    const hip = J.hip, ch = J.chest, up = norm(sub(ch, hip)), rt = [up[1], -up[0]], L = vlen(sub(ch, hip));
    const tp = (s, f) => add(hip, add(mul(up, s * L), mul(rt, f)));
    const sw = pr.shoulderW / 2, hw = pr.hipW / 2, ww = pr.waist * 0.8, sit = !!P.sit;
    const baggy = cfg.legs === 'bontan' ? 1.42 : cfg.legs === 'baggy' ? 1.25 : cfg.legs === 'wide' ? 1.12 : 1.0;
    const gathered = cfg.legs === 'bontan' || cfg.legs === 'baggy';
    if (sit) { // the lap: both thighs toward the camera read as one trapezoid, knees rounded
      const kL = add(J.flP, [-0.022, -0.036]), kR = add(J.nlP, [0.022, -0.036]), r = lR * 1.05 * baggy;
      T.poly([add(J.flP, [-r, 0.012]), add(J.nlP, [r, 0.012]), add(kR, [r, -r * 0.2]), add(kR, [r * 0.3, -r * 0.95]), add(kL, [-r * 0.3, -r * 0.95]), add(kL, [-r, -r * 0.2])], cfg.pants, 7, 0, -1, [1, 0]);
      if (lod >= 2) T.line(add(lerp2(J.flP, J.nlP, 0.5), [0, 0.0]), add(lerp2(kL, kR, 0.5), [0, -r * 0.7]), cfg.pants, 1, 7);
    }
    for (const k of ['fl', 'nl']) {
      const dt = k === 'fl' ? -1 : 0, s = k === 'nl' ? 1 : -1, P0 = J[k + 'P'];
      let K, A;
      if (sit) { K = add(P0, [s * 0.026, -0.05]); A = [K[0] + s * 0.012, pr.foot]; T.cap(K, A, lR * 1.02 * baggy, lR * (gathered ? 0.66 : 0.85), cfg.pants, 6, dt); }
      else {
        K = J[k + 'K']; A = J[k + 'A'];
        T.cap(P0, K, lR * 1.12 * baggy, lR * 0.98 * baggy, cfg.pants, 3, dt);
        T.cap(K, A, lR * 0.98 * baggy, lR * (gathered ? 0.7 : 0.85), cfg.pants, 3, dt);
      }
      const f = pr.foot, zs = sit ? 6 : 3;
      T.poly([add(A, [-f * 0.9, f * 0.3]), add(A, [f * 0.9, f * 0.3]), add(A, [f * 1.05 + s * 0.004, -f * 0.8]), add(A, [-f * 1.05 + s * 0.004, -f * 0.8])], cfg.shoe, zs, 0, -1, [1, 0]);
    }
    if (cfg.coat) { // long coat skirt to the knees
      const kz = J.nlK[1] - 0.01;
      T.poly([tp(0.3, -ww * 1.2), tp(0.3, ww * 1.2), [hip[0] + hw * 1.9, kz], [hip[0] - hw * 1.9, kz]], cfg.top, sit ? 4 : 8, 0, -1, rt);
      if (!back && lod >= 2) T.line(tp(0.3, 0), [hip[0], kz + 0.01], mm('coda_black'), 0, sit ? 4 : 8);
    }
    const hemS = cfg.cropped ? 0.32 : -0.06;
    if (cfg.cropped) T.poly([tp(-0.06, -hw), tp(-0.06, hw), tp(0.4, ww), tp(0.4, -ww)], cfg.shirt, 5, 0, -1, rt);
    T.poly([tp(hemS, -hw * (cfg.cropped ? 1.0 : 1.02)), tp(hemS, hw * (cfg.cropped ? 1.0 : 1.02)), tp(0.45, ww), tp(0.8, sw * 0.95), tp(0.98, sw * 0.9), tp(1.05, sw * 0.3), tp(1.05, -sw * 0.3), tp(0.98, -sw * 0.9), tp(0.8, -sw * 0.95), tp(0.45, -ww)], cfg.top, 5, 0, -1, rt);
    if (!back) {
      if (cfg.cropped) T.poly([tp(0.98, -sw * 0.2), tp(0.98, sw * 0.2), tp(0.34, ww * 0.4), tp(0.34, -ww * 0.4)], cfg.shirt, 6, 0, -1, rt);
      if (cfg.collar) { T.poly([tp(0.94, -sw * 0.34), tp(1.15, -sw * 0.3), tp(1.15, sw * 0.3), tp(0.94, sw * 0.34)], cfg.top, 6, 0, -1, rt); if (lod >= 2 && !cfg.cropped) T.line(tp(0.96, 0), tp(0.0, 0), cfg.seam || mm('blackSoft'), 1, 6); if (cfg.button && lod >= 2) T.dot(tp(1.03, 0), cfg.button, 2, 6, lod >= 3 ? 2 : 1, lod >= 3 ? 2 : 1); }
      if (cfg.coat && lod >= 2) { T.line(tp(1.0, -sw * 0.25), tp(0.3, 0), mm('coda_black'), 0, 6); T.line(tp(1.0, sw * 0.25), tp(0.3, 0), mm('coda_black'), 0, 6); }
    }
    for (const k of ['fa', 'na']) {
      const z = k === 'na' ? 13 : 12, S0 = J[k + 'S'], E = J[k + 'E'], Wr = J[k + 'W'];
      T.cap(S0, E, aR * 1.12, aR, cfg.skin, z, 0); T.cap(E, Wr, aR, aR * 0.82, cfg.skin, z, 0);
      T.cap(S0, E, aR * 1.25, aR * 1.12, cfg.top, z, 0); T.cap(E, lerp2(E, Wr, 0.92), aR * 1.12, aR, cfg.top, z, 0);
      handAt(T, Wr, handDir(T, k), k === 'na' ? P.nh : P.fh, cfg.skin, z + 1, 0);
    }
    const H = headFrame(T);
    Hp.headFront(T, H, cfg.skin, back);
    if (!back) { if (cfg.glasses) { glassesFront(T, H); codaEyesFront(T, H, Object.assign({}, cfg.eye, { noEyes: true })); } else codaEyesFront(T, H, cfg.eye); if (cfg.beard) beardFront(T, H, cfg.beard); }
    cfg.hairFront(T, H, back);
    if (cfg.earrings) earringFront(T, H, cfg.skin, back);
  }
  // dark-eyed faces need whites + a pupil (a dark block alone reads as sunglasses at 100–200 px)
  function codaEyesSide(T, H, o) {
    const lod = T.lod, P = T.P, z = 10, mk = mm('mark');
    if (lod === 0) return;
    const eyes = P.eyes || 'open', ex = 0.29, ey = 0.03;
    if (lod === 1) { if (eyes !== 'closed') T.dot(H(ex, ey), mk, 0, z); return; }
    if (eyes === 'closed') T.line(H(ex - 0.09, ey + 0.01), H(ex + 0.08, ey - 0.02), mk, 0, z);
    else {
      const hh = eyes === 'narrow' ? 1 : eyes === 'wide' ? (lod >= 3 ? 3 : 2) : 2;
      T.dot(H(ex - 0.08, ey + 0.05), mm('white'), 3, z, lod >= 3 ? 3 : 2, hh);
      T.dot(H(ex - 0.01, ey + 0.05), o.eyeMat, 1, z, 1, hh);
      T.line(H(ex - 0.11, ey + 0.08), H(ex + 0.07, ey + 0.08), mk, 0, z);
      T.dot(H(0.46, ey + 0.05), mk, 0, z, 1, Math.min(2, hh));
    }
    const bl = eyes === 'narrow' ? -0.02 : eyes === 'wide' ? 0.04 : 0;
    T.line(H(ex - 0.1, ey + 0.19 + bl), H(ex + 0.1, ey + 0.17), o.browMat || mk, 1, z);
  }
  function codaEyesFront(T, H, o) {
    const lod = T.lod, P = T.P, z = 10, mk = mm('mark');
    if (lod === 0) return;
    const eyes = P.eyes || 'open';
    for (const s of o.noEyes ? [] : [-1, 1]) {
      const ex = s * 0.2, ey = 0.03;
      if (lod === 1) { if (eyes !== 'closed') T.dot(H(ex, ey), mk, 0, z); continue; }
      if (eyes === 'closed') { T.line(H(ex - 0.08, ey), H(ex + 0.08, ey), mk, 0, z); continue; }
      const hh = eyes === 'narrow' ? 1 : eyes === 'wide' ? (lod >= 3 ? 3 : 2) : 2;
      T.dot(H(ex - 0.08, ey + 0.05), mm('white'), 3, z, lod >= 3 ? 3 : 2, hh);
      T.dot(H(ex - s * 0.01, ey + 0.05), o.eyeMat, 1, z, 1, hh);
      T.line(H(ex - 0.1, ey + 0.08), H(ex + 0.1, ey + 0.08), mk, 0, z);
      T.line(H(ex - 0.1, ey + 0.19 + (eyes === 'wide' ? 0.03 : 0)), H(ex + 0.1, ey + 0.18), o.browMat || mk, 1, z);
    }
    if (lod >= 2) {
      const face = P.face || 'neutral', my = -0.28, mo = mm('mouth');
      if (face === 'grin') { T.line(H(-0.12, my + 0.03), H(0.12, my + 0.03), mo, 0, z); T.dot(H(-0.05, my), mm('teeth'), 2, z, 3, 1); }
      else if (face === 'smile' || face === 'smirk') T.line(H(-0.08, my + 0.02), H(0.08, my + 0.04), mo, 0, z);
      else if (face === 'open' || face === 'shout') T.dot(H(-0.04, my + 0.04), mo, 0, z, 2, 2);
      else if (lod >= 3) T.line(H(-0.04, my + 0.02), H(0.04, my + 0.02), mo, 1, z);
    }
  }
  function earringSide(T, H, skin) {
    if (T.lod < 2) return;
    const hs = T.prop.head;
    T.ell(H(-0.12, -0.17), 0.055 * hs, 0.065 * hs, T.J.headA, skin, 10);
    T.ell(H(-0.12, -0.18), 0.04 * hs, 0.04 * hs, 0, mm('mark'), 11);
  }
  function earringFront(T, H, skin, back) {
    if (T.lod < 2) return;
    const hs = T.prop.head;
    for (const s of [-1, 1]) { T.ell(H(s * 0.45, -0.15), 0.05 * hs, 0.06 * hs, 0, skin, back ? 12 : 10); T.ell(H(s * 0.45, -0.16), 0.036 * hs, 0.036 * hs, 0, mm('mark'), back ? 12 : 11); }
  }
  function glassesSide(T, H) {
    if (T.lod < 1) return;
    const g = mm('glass'), hs = T.prop.head;
    T.poly([H(0.2, 0.1), H(0.42, 0.1), H(0.4, -0.01), H(0.22, -0.01)], g, 10, 0, 0);
    T.dot(H(0.46, 0.06), g, 0, 10); T.line(H(0.2, 0.08), H(-0.12, 0.07), g, 0, 10);
    if (T.lod >= 3) T.dot(H(0.36, 0.07), mm('white'), 3, 10);
  }
  function glassesFront(T, H) {
    if (T.lod < 1) return;
    const g = mm('glass');
    for (const s of [-1, 1]) T.poly([H(s * 0.08, 0.1), H(s * 0.32, 0.1), H(s * 0.3, -0.01), H(s * 0.1, -0.01)], g, 10, 0, 0);
    T.line(H(-0.08, 0.08), H(0.08, 0.08), g, 0, 10);
    if (T.lod >= 3) { T.dot(H(-0.24, 0.07), mm('white'), 3, 10); T.dot(H(0.16, 0.07), mm('white'), 3, 10); }
  }
  function beardSide(T, H, mat) {
    if (T.lod < 1) return;
    T.poly([H(0.26, -0.33), H(0.44, -0.3), H(0.4, -0.5), H(0.22, -0.52)], mat, 10, 0, -1, [1, 0]);
    if (T.lod >= 2) T.line(H(0.3, -0.19), H(0.46, -0.18), mat, 1, 10);
  }
  function beardFront(T, H, mat) {
    if (T.lod < 1) return;
    T.poly([H(-0.12, -0.36), H(0.12, -0.36), H(0.08, -0.54), H(-0.08, -0.54)], mat, 10, 0, -1, [1, 0]);
    if (T.lod >= 2) { T.line(H(-0.15, -0.2), H(0.15, -0.2), mat, 1, 10); T.line(H(-0.15, -0.2), H(-0.13, -0.3), mat, 1, 10); T.line(H(0.15, -0.2), H(0.13, -0.3), mat, 1, 10); }
  }
  // smooth cap helper for front views (sleek hair); `hairline` = forehead edge height
  function capFront(T, H, mat, back, hairline, z) {
    const cap = [];
    for (let a = -114; a <= 114; a += 8) cap.push(H(sin(a * D2R) * 0.56, cos(a * D2R) * 0.56 + 0.1));
    if (back) { cap.push(H(0.5, -0.14)); cap.push(H(0.34, -0.36)); cap.push(H(-0.34, -0.36)); cap.push(H(-0.5, -0.14)); } // down to the nape
    else { cap.push(H(0.5, 0.0)); cap.push(H(0.42, hairline - 0.04)); cap.push(H(0.15, hairline)); cap.push(H(-0.15, hairline)); cap.push(H(-0.42, hairline - 0.04)); cap.push(H(-0.5, 0.0)); }
    T.poly(cap, mat, z || 11, 0, -1, [1, 0.3]);
  }
  // GETO: sleek black hair pulled back into a bun, one long bang strand over the forehead
  function getoHairSide(T, H) {
    const m = mm('coda_hairBlack'), hs = T.prop.head, sec = secOf(T, 'hair'), lod = T.lod;
    T.poly([H(0.44, 0.24), H(0.46, 0.4), H(0.3, 0.6), H(0.02, 0.68), H(-0.3, 0.62), H(-0.5, 0.42), H(-0.55, 0.14), H(-0.47, -0.1), H(-0.33, -0.12), H(-0.22, 0.02), H(-0.08, 0.14), H(0.2, 0.2)], m, 11, 0, -1, [0.4, 1]);
    T.ell(H(-0.5, 0.44), 0.21 * hs, 0.2 * hs, T.J.headA, m, 11);
    if (lod >= 2) { T.line(H(-0.36, 0.42), H(-0.38, 0.6), mm('mark'), 0, 12); T.line(H(0.3, 0.52), H(-0.3, 0.5), m, 3, 11); }
    const t1 = add(H(0.5, 0.1), mul(sec, 0.3)), t2 = add(H(0.49, -0.16), mul(sec, 0.55));
    T.poly([H(0.26, 0.38), H(0.42, 0.34), add(t1, [0.004, 0]), t2, add(t1, [-0.008, 0.004]), H(0.32, 0.26)], m, 12, 0, -1, [1, 0]);
  }
  function getoHairFront(T, H, back) {
    const m = mm('coda_hairBlack'), hs = T.prop.head, sec = secOf(T, 'hair');
    if (!back) T.ell(H(0.02, 0.62), 0.17 * hs, 0.12 * hs, 0, m, 8);
    capFront(T, H, m, back, 0.32);
    if (back) { T.ell(H(0, 0.3), 0.21 * hs, 0.2 * hs, 0, m, 12); if (T.lod >= 2) T.line(H(-0.16, 0.18), H(0.16, 0.18), mm('mark'), 0, 12); return; }
    const t1 = add(H(-0.28, 0.06), mul(sec, 0.3)), t2 = add(H(-0.3, -0.2), mul(sec, 0.55));
    T.poly([H(-0.02, 0.4), H(-0.18, 0.38), add(t1, [-0.006, 0]), t2, add(t1, [0.01, 0.002]), H(-0.1, 0.26)], m, 12, 0, -1, [1, 0]);
  }
  // NANAMI: neat blond hair with a side part, fringe swept to one side
  function nanamiHairSide(T, H) {
    const m = mm('coda_hairBlond'), lod = T.lod;
    T.poly([H(0.46, 0.22), H(0.48, 0.36), H(0.34, 0.58), H(0.04, 0.66), H(-0.28, 0.6), H(-0.5, 0.4), H(-0.54, 0.12), H(-0.48, -0.14), H(-0.36, -0.2), H(-0.24, -0.06), H(-0.14, 0.08), H(0.02, 0.16), H(0.24, 0.18)], m, 11, 0, -1, [0.4, 1]);
    T.poly([H(0.06, 0.6), H(0.44, 0.44), H(0.52, 0.22), H(0.4, 0.3), H(0.2, 0.4)], m, 11, 0, -1, [1, 0.3]);
    if (lod >= 2) { T.line(H(-0.02, 0.64), H(0.22, 0.56), m, 0, 12); T.line(H(0.1, 0.5), H(0.4, 0.34), m, 1, 12); }
  }
  function nanamiHairFront(T, H, back) {
    const m = mm('coda_hairBlond');
    capFront(T, H, m, back, 0.3);
    if (back) return;
    T.poly([H(0.18, 0.56), H(-0.46, 0.34), H(-0.48, 0.16), H(-0.2, 0.3), H(0.1, 0.38)], m, 12, 0, -1, [1, 0.3]);
    if (T.lod >= 2) T.line(H(0.2, 0.62), H(0.16, 0.42), m, 0, 12);
  }
  // HAIBARA: short, slightly messy dark hair (short spikes)
  const HAI_SPIKES = [[-140, 0.1, 22], [-110, 0.16, 20], [-80, 0.18, 19], [-50, 0.2, 18], [-20, 0.2, 17], [10, 0.18, 17], [38, 0.14, 18], [62, 0.1, 18]];
  const HAI_BANGS = [[0.36, 0.14, 0.05], [0.22, 0.16, 0.04]];
  const HAI_FRONT = [[-100, 0.12], [-70, 0.16], [-40, 0.18], [-12, 0.2], [14, 0.2], [40, 0.18], [70, 0.16], [100, 0.12]];
  const HAI_FRONT_BANGS = [[-0.22, 0.18], [-0.06, 0.22], [0.1, 0.2], [0.26, 0.16]];
  // YAGA: short spiky dark hair on top, shaved sides
  function yagaHairSide(T, H) {
    const m = mm('coda_hairBrown'), lod = T.lod;
    if (lod >= 2) T.poly([H(0.1, 0.36), H(-0.1, 0.46), H(-0.44, 0.34), H(-0.52, 0.04), H(-0.42, -0.14), H(-0.28, -0.02), H(-0.1, 0.2)], mm('coda_stubble'), 10, 0, 0);
    T.poly([H(0.38, 0.3), H(0.36, 0.52), H(0.1, 0.66), H(-0.22, 0.64), H(-0.42, 0.48), H(-0.34, 0.38), H(0.0, 0.44), H(0.2, 0.38)], m, 11, 0, -1, [0.4, 1]);
    if (lod >= 1) for (const [u, v, du, dv] of [[0.3, 0.52, 0.06, 0.1], [0.12, 0.64, 0.02, 0.12], [-0.1, 0.66, -0.02, 0.12], [-0.3, 0.56, -0.06, 0.1]]) T.poly([H(u - 0.07, v - 0.04), H(u + du, v + dv), H(u + 0.07, v - 0.04)], m, 11, 0, -1, [1, 0]);
  }
  function yagaHairFront(T, H, back) {
    const m = mm('coda_hairBrown'), lod = T.lod;
    if (lod >= 2) for (const s of [-1, 1]) T.poly([H(s * 0.3, 0.42), H(s * 0.47, 0.22), H(s * 0.47, -0.02), H(s * 0.4, 0.1), H(s * 0.3, 0.3)], mm('coda_stubble'), 10, 0, 0);
    const cap = [];
    for (let a = -70; a <= 70; a += 10) cap.push(H(sin(a * D2R) * 0.5, cos(a * D2R) * 0.52 + 0.12));
    cap.push(H(0.3, 0.38)); cap.push(H(-0.3, 0.38));
    T.poly(cap, m, 11, 0, -1, [1, 0.3]);
    if (lod >= 1) for (const u of [-0.3, -0.1, 0.1, 0.3]) T.poly([H(u - 0.08, 0.58), H(u + u * 0.1, 0.76), H(u + 0.08, 0.58)], m, 11, 0, -1, [1, 0]);
  }
  const CODA = {};
  function defineHuman(name, height, prop, cfgFn) {
    rig.define({ name, height, prop, margin: 0.34, extraTop: 0.05,
      build(T) { const cfg = CODA[name] || (CODA[name] = cfgFn()); if (T.P.view === 'side') humanSide(T, cfg); else humanFront(T, cfg, T.P.view === 'back'); } });
  }
  defineHuman('geto', 1.85, { head: 0.132, neck: 0.04, spine: 0.276, thigh: 0.25, shin: 0.242, foot: 0.034, uarm: 0.178, farm: 0.152, hand: 0.068, chest: 0.14, waist: 0.11, hipW: 0.13, shoulderW: 0.25, limb: 0.03, leg: 0.05 },
    () => ({ skin: mm('skin'), top: mm('coda_black'), sleeve: 'long', pants: mm('coda_black'), legs: 'bontan', shoe: mm('black'), collar: true, button: mm('coda_gold'), earrings: true,
      eye: { eyeMat: mm('coda_eye'), glow: false, browMat: mm('coda_hairBlack') }, hairSide: getoHairSide, hairFront: getoHairFront }));
  defineHuman('nanami', 1.84, { head: 0.13, neck: 0.04, spine: 0.278, thigh: 0.25, shin: 0.24, foot: 0.034, uarm: 0.178, farm: 0.152, hand: 0.068, chest: 0.152, waist: 0.118, hipW: 0.135, shoulderW: 0.26, limb: 0.032, leg: 0.044 },
    () => ({ skin: mm('skin'), top: mm('coda_navy'), sleeve: 'long', pants: mm('coda_navy'), legs: 'wide', shoe: mm('black'), collar: true, button: mm('coda_gold'), seam: mm('coda_black'),
      eye: { eyeMat: mm('coda_eye'), glow: false, browMat: mm('coda_hairBlond') }, hairSide: nanamiHairSide, hairFront: nanamiHairFront }));
  defineHuman('haibara', 1.75, { head: 0.14, neck: 0.04, spine: 0.276, thigh: 0.245, shin: 0.236, foot: 0.035, uarm: 0.172, farm: 0.148, hand: 0.07, chest: 0.142, waist: 0.112, hipW: 0.135, shoulderW: 0.25, limb: 0.031, leg: 0.044 },
    () => ({ skin: mm('skin'), top: mm('coda_black'), sleeve: 'long', pants: mm('coda_black'), legs: 'wide', shoe: mm('black'), collar: true, cropped: true, shirt: mm('coda_shirt'),
      eye: { eyeMat: mm('coda_eye'), glow: false, browMat: mm('coda_hairBlack') },
      hairSide: (T, H) => Hp.hairSide(T, H, mm('coda_hairBlack'), HAI_SPIKES, HAI_BANGS, { sweep: -0.1 }),
      hairFront: (T, H, back) => Hp.hairFront(T, H, mm('coda_hairBlack'), back, HAI_FRONT, HAI_FRONT_BANGS) }));
  defineHuman('yaga', 1.95, { head: 0.124, neck: 0.042, spine: 0.284, thigh: 0.245, shin: 0.238, foot: 0.036, uarm: 0.178, farm: 0.152, hand: 0.072, chest: 0.178, waist: 0.15, hipW: 0.15, shoulderW: 0.29, limb: 0.037, leg: 0.05 },
    () => ({ skin: mm('skin'), top: mm('coda_coat'), sleeve: 'long', pants: mm('coda_black'), legs: 'wide', shoe: mm('black'), coat: true, glasses: true, beard: mm('coda_hairBrown'),
      eye: { eyeMat: mm('coda_eye'), glow: false }, hairSide: yagaHairSide, hairFront: yagaHairFront }));

  // ================================================================== POSES (degrees; conventions in rig.js) + MOVES
  const POSES = (shiki.POSES = {}), MOVES = (shiki.MOVES = {});
  const def = (name, o, base) => { POSES[name] = rig.full(Object.assign({}, base ? POSES[base] : {}, o)); return POSES[name]; };
  const mv = (name, o) => { o.name = name; o.len = o.keys[o.keys.length - 1][0]; MOVES[name] = o; return o; };

  // ---- MAHORAGA: heavy stance, implacable holds, explosive strikes
  def('maho_idle', { root: [0, -0.02], lean: 8, neck: -2, head: 4, twist: 0.35, na: [8, 18, 0], fa: [-4, 22, 0], nl: [10, 12, 0], fl: [-12, 8, 0], nh: 'fist', fh: 'relaxed' });
  def('maho_look', { neck: 14, head: 12 }, 'maho_idle');                       // looking down at a small opponent
  def('maho_idleFront', { view: 'front', root: [0, -0.01], lean: 0, na: [12, 12, 0], fa: [14, 16, 0], nl: [7, 4, 0], fl: [7, 4, 0], nh: 'fist', fh: 'fist' });
  def('maho_idleBack', { view: 'back', root: [0, -0.01], na: [12, 12, 0], fa: [14, 16, 0], nl: [7, 4, 0], fl: [7, 4, 0], nh: 'fist', fh: 'fist' });
  def('maho_stepA', { root: [0, -0.03], lean: 10, twist: 0.35, na: [-12, 20, 0], fa: [14, 22, 0], nl: [24, 8, 0], fl: [-22, 14, 10], nh: 'fist', fh: 'relaxed' });
  def('maho_stepB', { root: [0, 0], lean: 9, na: [0, 18, 0], fa: [0, 20, 0], nl: [4, 4, 0], fl: [20, 44, 0] }, 'maho_stepA');
  def('maho_stepC', { root: [0, -0.03], lean: 10, na: [14, 22, 0], fa: [-12, 20, 0], nl: [-22, 14, 10], fl: [24, 8, 0] }, 'maho_stepA');
  def('maho_stepD', { root: [0, 0], lean: 9, na: [0, 18, 0], fa: [0, 20, 0], nl: [20, 44, 0], fl: [4, 4, 0] }, 'maho_stepA');
  def('maho_stompA', { root: [0, 0.02], lean: -6, neck: 10, head: 6, twist: 0.3, na: [30, 50, 0], fa: [-30, 30, 0], nl: [96, 104, 10], fl: [-6, 6, 0], nh: 'fist', fh: 'fist' });
  def('maho_stomp', { root: [0.02, -0.08], lean: 22, neck: -8, head: -2, twist: 0.45, na: [20, 70, 0], fa: [-40, 40, 0], nl: [42, 64, 0], fl: [-28, 42, 10], nh: 'fist', fh: 'fist', face: 'open' });
  def('maho_slashA', { root: [-0.03, -0.03], lean: -8, neck: 6, head: 2, twist: 0.05, na: [158, 62, 0], fa: [40, 60, 0], nl: [26, 30, 0], fl: [-22, 18, 0], nh: 'fist', fh: 'open' });
  def('maho_slash', { root: [0.06, -0.06], lean: 24, neck: -6, twist: 0.8, na: [70, 4, 0], fa: [-30, 40, 0], nl: [40, 44, 0], fl: [-34, 10, 20], nh: 'fist', fh: 'open' });
  def('maho_slashEnd', { root: [0.08, -0.08], lean: 28, neck: -4, twist: 0.95, na: [12, 8, 0], fa: [-50, 30, 0], nl: [44, 50, 0], fl: [-36, 12, 20], nh: 'fist', fh: 'relaxed' });
  def('maho_upcutA', { root: [0, -0.08], lean: 26, neck: -6, twist: 0.3, na: [-34, 18, 0], fa: [40, 60, 0], nl: [40, 60, 0], fl: [-30, 40, 0], nh: 'fist', fh: 'open' });
  def('maho_upcut', { root: [0.04, 0.0], lean: -10, neck: -10, head: -6, twist: 0.7, na: [165, 10, 0], fa: [-20, 40, 0], nl: [20, 12, 0], fl: [-30, 20, 30], nh: 'fist', fh: 'relaxed' });
  def('maho_block', { root: [-0.01, -0.05], lean: 8, neck: 4, twist: 0.3, na: [70, 110, 0], fa: [40, 100, 0], nl: [26, 30, 0], fl: [-24, 20, 0], nh: 'fist', fh: 'open' });
  def('maho_leapA', { root: [0, -0.16], lean: 38, neck: -20, head: -6, twist: 0.3, na: [-40, 30, 0], fa: [-50, 30, 0], nl: [80, 120, 10], fl: [30, 110, 30], nh: 'fist', fh: 'fist' });
  def('maho_leap', { root: [0, 0.03], lean: 20, neck: -10, twist: 0.4, na: [130, 60, 0], fa: [60, 50, 0], nl: [70, 100, -20], fl: [-10, 70, -30], nh: 'fist', fh: 'open' });
  def('maho_dive', { root: [0.02, 0.0], lean: 36, neck: -14, twist: 0.8, na: [22, 4, 0], fa: [-40, 40, 0], nl: [80, 110, -10], fl: [20, 90, -30], nh: 'fist', fh: 'open' });
  def('maho_land', { root: [0, -0.18], lean: 40, neck: -22, head: -6, twist: 0.4, na: [60, 20, 0], fa: [30, 20, 0], nl: [70, 115, 10], fl: [-6, 100, 30], nh: 'fist', fh: 'open' });
  def('maho_punchA', { root: [-0.02, -0.03], lean: 4, twist: 0.1, na: [40, 70, 0], fa: [-30, 110, 0], nl: [22, 26, 0], fl: [-22, 16, 0], nh: 'fist', fh: 'fist' });
  def('maho_punch', { root: [0.07, -0.05], lean: 22, neck: -4, twist: 0.85, na: [-10, 60, 0], fa: [88, 4, 0], nl: [38, 40, 0], fl: [-32, 8, 20], nh: 'fist', fh: 'fist' });
  def('maho_hit', { root: [-0.03, -0.02], lean: -18, neck: -22, head: -12, twist: 0.25, na: [30, 60, 0], fa: [-40, 50, 0], nl: [18, 20, 0], fl: [-20, 12, 0], nh: 'open', fh: 'open', face: 'open' });
  def('maho_hitHeavy', { root: [-0.05, 0.0], lean: -32, neck: -26, head: -18, twist: 0.2, na: [-60, 30, 0], fa: [-90, 20, 0], nl: [30, 50, 0], fl: [0, 30, 0], nh: 'open', fh: 'open', face: 'open' });
  def('maho_kneel', { root: [0, -0.24], lean: 20, neck: 10, head: 4, na: [30, 30, 0], fa: [10, 20, 0], nl: [80, 95, 0], fl: [-6, 118, 40], nh: 'fist', fh: 'open' });
  def('maho_emerge', { root: [0, -0.3], lean: 50, neck: 20, head: 10, twist: 0.3, na: [10, 10, 0], fa: [0, 10, 0], nl: [100, 140, 0], fl: [60, 130, 30], nh: 'fist', fh: 'relaxed' });
  def('maho_roarA', { root: [0, -0.04], lean: 18, neck: 10, head: 8, na: [20, 60, 0], fa: [10, 60, 0], nl: [16, 20, 0], fl: [-16, 14, 0], nh: 'fist', fh: 'fist' });
  def('maho_roar', { root: [0, -0.02], lean: -12, neck: -18, head: -16, twist: 0.5, na: [70, 30, 0], fa: [-50, 30, 0], nl: [20, 16, 0], fl: [-20, 10, 0], nh: 'open', fh: 'open', face: 'open' });
  def('maho_roarFront', { view: 'front', root: [0, -0.03], lean: 0, head: -10, na: [70, 40, 0], fa: [70, 40, 0], nl: [12, 8, 0], fl: [12, 8, 0], nh: 'open', fh: 'open', face: 'open' });

  mv('mahoSlash', { keys: [[0, 'maho_idle'], [10, 'maho_slashA'], [20, 'maho_slashA'], [23, 'maho_slash'], [30, 'maho_slashEnd'], [40, 'maho_slashEnd'], [58, 'maho_idle']], contact: 23, startup: 23, active: 7, recovery: 35, hitstop: 7, strength: 3, root: [[0, 0], [20, -0.15], [23, 1.2], [40, 1.4], [58, 1.4]], smear: { limb: 'na', from: 20, to: 23 }, sfx: { 20: 'mahoSlash' }, reachExtra: 0.29 });
  mv('mahoUpcut', { keys: [[0, 'maho_idle'], [8, 'maho_upcutA'], [16, 'maho_upcutA'], [19, 'maho_upcut'], [26, 'maho_upcut'], [44, 'maho_idle']], contact: 19, startup: 19, active: 7, recovery: 25, hitstop: 6, strength: 3, root: [[0, 0], [16, 0], [19, 0.8], [44, 0.9]], smear: { limb: 'na', from: 16, to: 19 }, sfx: { 16: 'whooshL' }, reachExtra: 0.29 });
  mv('mahoStomp', { keys: [[0, 'maho_idle'], [12, 'maho_stompA'], [22, 'maho_stompA'], [25, 'maho_stomp'], [45, 'maho_stomp'], [62, 'maho_idle']], contact: 25, startup: 25, active: 20, recovery: 17, hitstop: 6, strength: 3, root: [[0, 0], [25, 0.4], [62, 0.4]], smear: { limb: 'nl', from: 22, to: 25 }, sfx: { 25: 'groundSlam' } });
  mv('mahoLeap', { keys: [[0, 'maho_idle'], [8, 'maho_leapA'], [16, 'maho_leapA'], [20, 'maho_leap'], [36, 'maho_leap'], [40, 'maho_land'], [58, 'maho_land'], [72, 'maho_idle']], contact: 40, startup: 40, active: 18, recovery: 32, hitstop: 6, strength: 3, root: [[0, 0], [16, 0], [40, 5], [72, 5.2]], lift: [[0, 0], [16, 0], [28, 3.2], [40, 0], [72, 0]], sfx: { 17: 'whooshL', 40: 'groundSlam' } });
  mv('mahoDive', { keys: [[0, 'maho_idle'], [8, 'maho_leapA'], [16, 'maho_leapA'], [20, 'maho_leap'], [32, 'maho_leap'], [35, 'maho_dive'], [40, 'maho_land'], [58, 'maho_land'], [74, 'maho_idle']], contact: 35, startup: 35, active: 5, recovery: 39, hitstop: 8, strength: 3, root: [[0, 0], [16, 0], [35, 4.6], [74, 4.8]], lift: [[0, 0], [16, 0], [27, 3.0], [35, 0.9], [40, 0], [74, 0]], smear: { limb: 'na', from: 32, to: 35 }, sfx: { 17: 'whooshL', 32: 'mahoSlash', 40: 'groundSlam' }, reachExtra: 0.29 });
  mv('mahoBlock', { keys: [[0, 'maho_idle'], [4, 'maho_block'], [22, 'maho_block'], [34, 'maho_idle']], contact: 4, startup: 4, active: 18, recovery: 12, root: [[0, 0], [22, -0.35], [34, -0.35]], sfx: { 4: 'swordRing' } });
  mv('mahoPunch', { keys: [[0, 'maho_idle'], [8, 'maho_punchA'], [14, 'maho_punchA'], [17, 'maho_punch'], [24, 'maho_punch'], [40, 'maho_idle']], contact: 17, startup: 17, active: 7, recovery: 23, hitstop: 6, strength: 2, root: [[0, 0], [14, -0.05], [17, 0.9], [40, 1.0]], smear: { limb: 'fa', from: 14, to: 17 }, sfx: { 14: 'whooshM' } });
  mv('mahoHit', { keys: [[0, 'maho_hit'], [12, 'maho_hit'], [28, 'maho_idle']], contact: 0, startup: 0, active: 12, recovery: 16, root: [[0, 0], [12, -0.35], [28, -0.4]] });
  mv('mahoStagger', { keys: [[0, 'maho_hitHeavy'], [14, 'maho_hitHeavy'], [26, 'maho_kneel'], [40, 'maho_kneel'], [56, 'maho_idle']], contact: 0, startup: 0, active: 26, recovery: 30, root: [[0, 0], [14, -1.6], [26, -2.0], [56, -2.0]] });
  mv('mahoRise', { keys: [[0, 'maho_emerge'], [24, 'maho_kneel'], [44, 'maho_look'], [56, 'maho_idle']], contact: 0, startup: 0, active: 44, recovery: 12, root: [[0, 0]], sfx: { 0: 'shadowRise' } });
  mv('mahoRoar', { keys: [[0, 'maho_idle'], [8, 'maho_roarA'], [12, 'maho_roar'], [48, 'maho_roar'], [64, 'maho_idle']], contact: 12, startup: 12, active: 36, recovery: 16, root: [[0, 0]] });
  mv('mahoStep', { keys: [[0, 'maho_stepA'], [10, 'maho_stepB'], [20, 'maho_stepC'], [30, 'maho_stepD'], [40, 'maho_stepA']], contact: 0, startup: 0, active: 40, recovery: 0, root: [[0, 0], [10, 0.6], [20, 1.15], [30, 1.75], [40, 2.3]], sfx: { 20: 'mahoStep', 40: 'mahoStep' } });

  // ---- AGITO: predatory hunch, electric punch, wing-arm swipes, regrowth
  def('ag_idle', { root: [0, -0.04], lean: 22, neck: 10, head: -14, twist: 0.4, na: [4, 72, 0], fa: [-12, 58, 0], nl: [18, 26, 0], fl: [-18, 20, 0], nh: 'claw', fh: 'claw', spark: 0.3 });
  def('ag_idleFront', { view: 'front', root: [0, -0.02], lean: 0, na: [34, 46, 0], fa: [34, 46, 0], nl: [10, 10, 0], fl: [10, 10, 0], nh: 'claw', fh: 'claw', spark: 0.3 });
  def('ag_idleBack', { view: 'back', root: [0, -0.02], na: [34, 46, 0], fa: [34, 46, 0], nl: [10, 10, 0], fl: [10, 10, 0], nh: 'claw', fh: 'claw', spark: 0.2 });
  def('ag_punchA', { root: [-0.03, -0.05], lean: 10, neck: 6, head: -8, twist: 0.15, na: [-40, 110, 0], fa: [50, 60, 0], nl: [26, 30, 0], fl: [-24, 20, 0], nh: 'fist', fh: 'claw', spark: 0.8 });
  def('ag_punch', { root: [0.08, -0.06], lean: 26, neck: 0, head: -10, twist: 0.85, na: [88, 2, 0], fa: [-30, 50, 0], nl: [42, 44, 0], fl: [-34, 8, 20], nh: 'fist', fh: 'claw', spark: 1 });
  def('ag_swipeA', { root: [-0.02, -0.03], lean: 4, neck: 4, head: -8, twist: 0.2, na: [160, 30, 0], fa: [-20, 40, 0], nl: [20, 20, 0], fl: [-20, 14, 0], nh: 'claw', fh: 'claw', spark: 0.4 });
  def('ag_swipe', { root: [0.05, -0.06], lean: 24, neck: 4, head: -10, twist: 0.8, na: [60, 10, 0], fa: [-40, 40, 0], nl: [38, 40, 0], fl: [-30, 10, 10], nh: 'claw', fh: 'claw', spark: 0.5 });
  def('ag_swipeEnd', { root: [0.06, -0.07], lean: 30, neck: 6, head: -8, twist: 0.95, na: [0, 10, 0], fa: [-50, 30, 0], nl: [40, 46, 0], fl: [-32, 12, 10], nh: 'claw', fh: 'claw', spark: 0.3 });
  def('ag_crouch', { root: [0.02, -0.18], lean: 45, neck: -10, head: -24, twist: 0.4, na: [60, 60, 0], fa: [40, 60, 0], nl: [80, 120, 10], fl: [30, 110, 30], nh: 'claw', fh: 'claw', spark: 0.4 });
  def('ag_pounce', { root: [0.04, 0.04], lean: 40, neck: -12, head: -26, twist: 0.5, na: [110, 20, 0], fa: [100, 30, 0], nl: [40, 90, -20], fl: [-40, 60, -30], nh: 'claw', fh: 'claw', spark: 0.6 });
  def('ag_spread', { root: [0, -0.03], lean: -6, neck: -8, head: -12, twist: 0.5, na: [100, 20, 0], fa: [-80, 20, 0], nl: [20, 16, 0], fl: [-20, 12, 0], nh: 'claw', fh: 'claw', spark: 0.7 });
  def('ag_spreadFront', { view: 'front', root: [0, -0.03], lean: 0, head: -6, na: [95, 12, 0], fa: [95, 12, 0], nl: [14, 10, 0], fl: [14, 10, 0], nh: 'claw', fh: 'claw', spark: 0.6 });
  def('ag_hit', { root: [-0.04, -0.02], lean: -20, neck: -24, head: -12, twist: 0.3, na: [50, 60, 0], fa: [-40, 50, 0], nl: [18, 20, 0], fl: [-20, 12, 0], nh: 'open', fh: 'open', spark: 0.1 });
  def('ag_hitHeavy', { root: [-0.06, 0.02], lean: -36, neck: -30, head: -20, twist: 0.2, na: [-70, 30, 0], fa: [-100, 20, 0], nl: [40, 60, 0], fl: [10, 80, 0], nh: 'open', fh: 'open', spark: 0 });
  def('ag_crushed', { root: [0, -0.36], lean: 62, neck: 22, head: 10, twist: 0.3, na: [60, 40, 0], fa: [40, 50, 0], nl: [82, 140, 0], fl: [50, 140, 20], nh: 'open', fh: 'open', spark: 0 });
  def('ag_regrow', { root: [0, -0.08], lean: 30, neck: 20, head: 10, twist: 0.35, na: [40, 40, 0], fa: [30, 50, 0], nl: [30, 50, 0], fl: [-20, 40, 0], nh: 'claw', fh: 'claw', spark: 0, regrow: 1 });
  def('ag_regrowA', { snake: 0 }, 'ag_regrow');
  def('ag_regrowB', { snake: 0.3 }, 'ag_regrow');
  def('ag_regrowC', { snake: 0.65 }, 'ag_regrow');
  def('ag_regrowD', { snake: 1, regrow: 0 }, 'ag_idle');
  def('ag_tailA', { root: [0, -0.04], lean: 12, neck: 6, head: -10, twist: 0.2, na: [40, 50, 0], fa: [-10, 50, 0], nl: [20, 24, 0], fl: [-20, 18, 0], nh: 'claw', fh: 'claw', tail: -0.5 });
  def('ag_tailStrike', { root: [0.02, -0.05], lean: 26, neck: 4, head: -12, twist: 0.6, na: [20, 40, 0], fa: [-30, 40, 0], nl: [30, 36, 0], fl: [-26, 16, 0], nh: 'claw', fh: 'claw', tail: 1 });
  def('ag_stepA', { root: [0, -0.04], lean: 24, neck: 10, head: -14, twist: 0.4, na: [16, 50, 0], fa: [34, 56, 0], nl: [26, 16, 0], fl: [-24, 22, 10], nh: 'claw', fh: 'claw', spark: 0.3 });
  def('ag_stepB', { root: [0, -0.01], na: [26, 52, 0], fa: [24, 58, 0], nl: [4, 12, 0], fl: [22, 56, 0] }, 'ag_stepA');
  def('ag_stepC', { root: [0, -0.04], na: [34, 56, 0], fa: [16, 50, 0], nl: [-24, 22, 10], fl: [26, 16, 0] }, 'ag_stepA');
  def('ag_stepD', { root: [0, -0.01], na: [24, 58, 0], fa: [26, 52, 0], nl: [22, 56, 0], fl: [4, 12, 0] }, 'ag_stepA');

  mv('agitoPunch', { keys: [[0, 'ag_idle'], [6, 'ag_punchA'], [12, 'ag_punchA'], [15, 'ag_punch'], [22, 'ag_punch'], [36, 'ag_idle']], contact: 15, startup: 15, active: 7, recovery: 21, hitstop: 8, strength: 3, root: [[0, 0], [12, -0.1], [15, 1.2], [36, 1.3]], smear: { limb: 'na', from: 12, to: 15 }, sfx: { 6: 'agitoSpark', 13: 'whooshM' } });
  mv('agitoSwipe', { keys: [[0, 'ag_idle'], [7, 'ag_swipeA'], [13, 'ag_swipeA'], [16, 'ag_swipe'], [22, 'ag_swipeEnd'], [40, 'ag_idle']], contact: 16, startup: 16, active: 6, recovery: 24, hitstop: 6, strength: 2, root: [[0, 0], [13, 0], [16, 0.8], [40, 0.9]], smear: { limb: 'na', from: 13, to: 16 }, sfx: { 13: 'whooshL' } });
  mv('agitoPounce', { keys: [[0, 'ag_idle'], [6, 'ag_crouch'], [14, 'ag_crouch'], [18, 'ag_pounce'], [30, 'ag_pounce'], [36, 'ag_crouch'], [50, 'ag_idle']], contact: 30, startup: 30, active: 6, recovery: 20, hitstop: 6, strength: 3, root: [[0, 0], [14, 0], [30, 4.5], [50, 4.8]], lift: [[0, 0], [14, 0], [22, 1.6], [30, 0.4], [36, 0], [50, 0]], smear: { limb: 'na', from: 18, to: 22 }, sfx: { 15: 'whooshL' } });
  mv('agitoTail', { keys: [[0, 'ag_idle'], [8, 'ag_tailA'], [12, 'ag_tailStrike'], [22, 'ag_tailStrike'], [36, 'ag_idle']], contact: 12, startup: 12, active: 10, recovery: 14, root: [[0, 0]], sfx: { 9: 'whooshM' } });
  mv('agitoHit', { keys: [[0, 'ag_hit'], [10, 'ag_hit'], [24, 'ag_idle']], contact: 0, startup: 0, active: 10, recovery: 14, root: [[0, 0], [10, -0.5], [24, -0.6]] });
  mv('agitoKnock', { keys: [[0, 'ag_hitHeavy'], [12, 'ag_hitHeavy'], [24, 'ag_crouch'], [40, 'ag_idle']], contact: 0, startup: 0, active: 24, recovery: 16, root: [[0, 0], [12, -2.5], [24, -3.0], [40, -3.0]] });
  mv('agitoCrush', { keys: [[0, 'ag_hitHeavy'], [4, 'ag_crushed'], [40, 'ag_crushed']], contact: 0, startup: 0, active: 40, recovery: 0, root: [[0, 0]] });
  mv('agitoRegrow', { keys: [[0, 'ag_regrowA'], [12, 'ag_regrowB'], [24, 'ag_regrowC'], [36, 'ag_regrowD'], [48, 'ag_idle']], contact: 0, startup: 0, active: 36, recovery: 12, root: [[0, 0]], sfx: { 0: 'rctHeal' } });
  mv('agitoStep', { keys: [[0, 'ag_stepA'], [8, 'ag_stepB'], [16, 'ag_stepC'], [24, 'ag_stepD'], [32, 'ag_stepA']], contact: 0, startup: 0, active: 32, recovery: 0, root: [[0, 0], [8, 0.5], [16, 1.0], [24, 1.5], [32, 2.0]] });

  // ---- GETO (student): hands in pockets, bench sitting, waving
  // sitting: hip at seat height (≈ shin + foot), thighs forward; the draw point stays under the feet (hip 0.25 H behind it)
  def('geto_stand', { lean: -2, neck: 3, head: -2, twist: 0.25, na: [-12, 34, 0], fa: [-18, 36, 0], nl: [3, 2, 0], fl: [-5, 2, 0], nh: 'pocket', fh: 'pocket', face: 'smile', eyes: 'narrow' });
  def('geto_wave', { lean: 0, neck: 2, twist: 0.45, na: [150, 36, 0], fa: [-18, 36, 0], nl: [4, 2, 0], fl: [-5, 2, 0], nh: 'open', fh: 'pocket', face: 'smile', eyes: 'narrow' });
  def('geto_wave2', { na: [162, 12, 0] }, 'geto_wave');
  def('geto_sit', { root: [-0.25, -0.25], lean: -8, neck: 6, head: 0, twist: 0.4, na: [30, 40, 0], fa: [-30, 30, 0], nl: [86, 90, 0], fl: [80, 84, 0], nh: 'relaxed', fh: 'relaxed', face: 'smile', eyes: 'narrow' });
  def('geto_sitWave', { twist: 0.5, na: [150, 40, 0], nh: 'open' }, 'geto_sit');
  def('geto_sitWave2', { na: [160, 16, 0], nh: 'open' }, 'geto_sitWave');
  def('geto_frontPockets', { view: 'front', head: -2, na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket', face: 'smile', eyes: 'narrow' });
  def('geto_frontWave', { view: 'front', na: [150, 30, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'pocket', face: 'smile', eyes: 'narrow' });
  def('geto_sitFront', { view: 'front', sit: true, root: [0, -0.25], na: [16, 30, 0], fa: [16, 30, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'relaxed', fh: 'relaxed', face: 'smile', eyes: 'narrow' });
  def('geto_sitFrontWave', { na: [150, 30, 0], nh: 'open' }, 'geto_sitFront');
  def('geto_back', { view: 'back', na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket' });
  mv('getoWave', { keys: [[0, 'geto_wave'], [6, 'geto_wave2'], [12, 'geto_wave'], [18, 'geto_wave2'], [24, 'geto_wave']], contact: 0, startup: 0, active: 24, recovery: 0, root: [[0, 0]] });
  mv('getoSitWave', { keys: [[0, 'geto_sitWave'], [6, 'geto_sitWave2'], [12, 'geto_sitWave'], [18, 'geto_sitWave2'], [24, 'geto_sitWave']], contact: 0, startup: 0, active: 24, recovery: 0, root: [[0, 0]] });
  // ---- NANAMI, HAIBARA, YAGA
  def('nanami_stand', { lean: 1, twist: 0.3, na: [4, 10, 0], fa: [-4, 12, 0], nl: [2, 2, 0], fl: [-3, 2, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('nanami_arms', { lean: -1, twist: 0.3, na: [22, 118, 0], fa: [18, 122, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('nanami_sit', { root: [-0.25, -0.25], lean: 2, neck: 2, twist: 0.4, na: [24, 50, 0], fa: [10, 50, 0], nl: [88, 90, 0], fl: [82, 86, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('nanami_front', { view: 'front', na: [8, 6, 0], fa: [8, 6, 0], nl: [5, 0, 0], fl: [5, 0, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('nanami_sitFront', { view: 'front', sit: true, root: [0, -0.25], na: [16, 34, 0], fa: [16, 34, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('haibara_stand', { lean: 0, twist: 0.4, na: [6, 14, 0], fa: [-6, 14, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'wide' });
  def('haibara_wave', { lean: -2, twist: 0.5, na: [165, 20, 0], fa: [-10, 20, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'open', fh: 'relaxed', face: 'grin', eyes: 'wide' });
  def('haibara_wave2', { na: [150, 45, 0] }, 'haibara_wave');
  def('haibara_front', { view: 'front', na: [10, 8, 0], fa: [10, 8, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'wide' });
  def('haibara_frontWave', { view: 'front', na: [160, 20, 0], fa: [10, 8, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'relaxed', face: 'grin', eyes: 'wide' });
  def('haibara_sit', { root: [-0.245, -0.245], lean: 4, neck: -4, twist: 0.45, na: [40, 50, 0], fa: [20, 60, 0], nl: [84, 88, 0], fl: [78, 84, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'open' });
  mv('haibaraWave', { keys: [[0, 'haibara_wave'], [5, 'haibara_wave2'], [10, 'haibara_wave'], [15, 'haibara_wave2'], [20, 'haibara_wave']], contact: 0, startup: 0, active: 20, recovery: 0, root: [[0, 0]] });
  def('yaga_stand', { lean: -2, neck: 2, twist: 0.3, na: [22, 118, 0], fa: [18, 122, 0], nl: [4, 2, 0], fl: [-5, 2, 0], nh: 'fist', fh: 'fist' });
  def('yaga_front', { view: 'front', na: [30, 125, 0], fa: [30, 125, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'fist', fh: 'fist' });
  def('yaga_sit', { root: [-0.24, -0.25], lean: 6, neck: 2, twist: 0.35, na: [30, 60, 0], fa: [20, 60, 0], nl: [86, 90, 0], fl: [80, 86, 0], nh: 'fist', fh: 'fist' });

  // ---- registration into rig.POSES / rig.MOVES (poses.js creates those objects AFTER this file loads)
  shiki.register = () => {
    if (!rig.POSES || !rig.MOVES) return false;
    for (const k in POSES) if (!rig.POSES[k]) rig.POSES[k] = POSES[k];
    for (const k in MOVES) if (!rig.MOVES[k]) rig.MOVES[k] = MOVES[k];
    if (!shiki.registered) shiki.registeredBy = 'register()';
    shiki.registered = true;
    return true;
  };
  HT.onPoses = (HT.onPoses || []).concat(shiki.register);   // poses.js should run: (HT.onPoses || []).forEach(f => f())
  shiki.register();                                         // no-op unless rig.POSES already exists
  HT.bootTasks = HT.bootTasks || [];
  HT.bootTasks.push({ name: 'shiki poses', fn: () => { shiki.register(); } }); // fallback (labs); scenes compile earlier
  // heavy walk helpers (rig.walk exists after poses.js): mahoraga — slower stride, deeper dip, restrained arm swing
  shiki.mahoWalk = (ph) => {
    const p = rig.walk(ph, { base: 'maho_idle', stride: 0.85 }), c = Math.cos(ph * TAU);
    p.root = [0, -0.022 * Math.abs(c) - 0.01]; p.na = [p.na[0] * 0.6 + 6, 22, 0]; p.fa = [p.fa[0] * 0.6 - 2, 24, 0]; p.nh = 'fist';
    return p;
  };
  shiki.agitoWalk = (ph) => { const p = rig.walk(ph, { base: 'ag_idle', stride: 0.9 }); p.na = [30 + p.na[0] * 0.5, 50, 0]; p.fa = [10 + p.fa[0] * 0.5, 60, 0]; p.nh = 'claw'; p.fh = 'claw'; return p; };

  // ================================================================== RABBIT ESCAPE
  // Small white rabbits (canvas sprites, not rig drawings — a swarm draws hundreds). 3 hop drawings: crouch / leap /
  // land; aliased shapes + 1-px ink outline; cached per (size, drawing, facing) in a bounded LRU.
  const rabbitCache = HT.lru(160);
  HT.caches.push({ name: 'shiki rabbits', size: () => rabbitCache.size });
  function fillEll(g, cx, cy, rx, ry, rt, col) {
    if (!rt) { HT.ellipse(g, cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), col); return; }
    const pts = [], cr = cos(rt), sr = sin(rt);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU, x = cos(a) * rx, y = sin(a) * ry; pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]); }
    HT.poly(g, pts, col);
  }
  const earShape = (g, s, x0, y0, x1, y1, col) => fillEll(g, (x0 + x1) / 2 * s, (y0 + y1) / 2 * s, Math.hypot(x1 - x0, y1 - y0) * s / 2, Math.max(0.6, 0.065 * s), Math.atan2(y1 - y0, x1 - x0), col);
  function rabbitSprite(L, fr, face) {
    L = Math.max(3, Math.min(64, Math.round(L)));
    const key = L + '|' + fr + '|' + face;
    let sp = rabbitCache.get(key);
    if (sp) return sp;
    const s = L, W = Math.ceil(1.3 * s) + 2, Hh = Math.ceil(1.12 * s) + 2, B = Hh - 1; // B = sole row
    const cv = HT.canvas(W, Hh), g = cv.g;
    const wt = C.white, sh = C.mist, pink = C.pink;
    const Y = v => B - v * s; // height above the sole (in body lengths) → y
    if (fr === 0) { // crouched
      earShape(g, s, 0.8, Y(0.62) / s, 0.64, Y(0.98) / s, sh);
      fillEll(g, 0.14 * s, Y(0.42), 0.11 * s, 0.1 * s, 0, wt);
      fillEll(g, 0.46 * s, Y(0.3), 0.36 * s, 0.28 * s, 0, wt);
      fillEll(g, 0.68 * s, Y(0.3), 0.26 * s, 0.22 * s, 0, wt);
      fillEll(g, 0.62 * s, Y(0.12), 0.3 * s, 0.07 * s, 0, sh);
      fillEll(g, 0.42 * s, Y(0.05), 0.21 * s, 0.06 * s, 0, wt);
      fillEll(g, 0.88 * s, Y(0.04), 0.07 * s, 0.045 * s, 0, wt);
      fillEll(g, 0.93 * s, Y(0.5), 0.2 * s, 0.18 * s, 0, wt);
      earShape(g, s, 0.9, Y(0.64) / s, 0.84, Y(1.04) / s, wt);
      if (L >= 10) earShape(g, s, 0.885, Y(0.72) / s, 0.85, Y(0.96) / s, pink);
    } else if (fr === 1) { // stretched mid-leap
      earShape(g, s, 0.88, Y(0.82) / s, 0.6, Y(0.98) / s, sh);
      fillEll(g, 0.1 * s, Y(0.42), 0.1 * s, 0.09 * s, 0, wt);
      fillEll(g, 0.18 * s, Y(0.3), 0.2 * s, 0.06 * s, 0.5, wt);
      fillEll(g, 0.55 * s, Y(0.48), 0.46 * s, 0.2 * s, -0.25, wt);
      fillEll(g, 0.55 * s, Y(0.36), 0.3 * s, 0.06 * s, -0.25, sh);
      fillEll(g, 1.0 * s, Y(0.42), 0.14 * s, 0.05 * s, 1.0, wt);
      fillEll(g, 1.0 * s, Y(0.72), 0.19 * s, 0.17 * s, 0, wt);
      earShape(g, s, 0.96, Y(0.84) / s, 0.7, Y(1.04) / s, wt);
      if (L >= 10) earShape(g, s, 0.93, Y(0.87) / s, 0.76, Y(0.99) / s, pink);
    } else { // landing, front paws down
      earShape(g, s, 0.86, Y(0.44) / s, 0.6, Y(0.64) / s, sh);
      fillEll(g, 0.16 * s, Y(0.58), 0.1 * s, 0.09 * s, 0, wt);
      fillEll(g, 0.26 * s, Y(0.5), 0.16 * s, 0.07 * s, -0.6, wt);
      fillEll(g, 0.55 * s, Y(0.36), 0.42 * s, 0.22 * s, 0.35, wt);
      fillEll(g, 0.62 * s, Y(0.22), 0.26 * s, 0.06 * s, 0.35, sh);
      fillEll(g, 0.98 * s, Y(0.05), 0.07 * s, 0.05 * s, 0, wt);
      fillEll(g, 0.95 * s, Y(0.3), 0.19 * s, 0.17 * s, 0, wt);
      earShape(g, s, 0.92, Y(0.46) / s, 0.68, Y(0.7) / s, wt);
    }
    const hy = fr === 1 ? 0.74 : fr === 0 ? 0.53 : 0.32;
    if (L >= 5) HT.rect(g, Math.round((fr === 1 ? 1.06 : 0.99) * s), Math.round(Y(hy)), 1, L >= 14 ? 2 : 1, C.ink);
    if (L >= 12) HT.px(g, Math.round((fr === 1 ? 1.17 : 1.1) * s), Math.round(Y(hy - 0.06)), C.pinkrose);
    let out = HT.outlined(cv.c, C.ink);
    let ox = Math.round(0.6 * s) + 1;
    if (face < 0) { out = HT.flipped(out); ox = out.width - 1 - ox; }
    sp = { c: out, w: out.width, h: out.height, ox, oy: B + 1 };
    rabbitCache.set(key, sp);
    return sp;
  }
  // one rabbit with its feet at (x, y); size = body length in px; hop phase from t and seed (deterministic).
  // o: { face ±1, phase 0..1, hop:false, emerge 0..1 (rising out of a shadow: only the top part shows), alpha, rate }
  shiki.rabbit = (ctx, x, y, size, t = 0, seed = 0, o = {}) => {
    const k = o.emerge === undefined ? 1 : clamp(o.emerge, 0, 1);
    if (k <= 0) return;
    if (size < 3) { HT.px(ctx, x, y - 1, C.white); return; }
    const rate = o.rate || 2.2 + 1.3 * HT.hash(seed, 11);
    const ph = o.phase !== undefined ? o.phase : (((t * rate + HT.hash(seed, 12)) % 1) + 1) % 1;
    const still = o.hop === false;
    const fr = still ? 0 : ph < 0.22 ? 0 : ph < 0.62 ? 1 : ph < 0.8 ? 2 : 0;
    const arc = still || ph < 0.2 || ph > 0.78 ? 0 : sin((PI * (ph - 0.2)) / 0.58);
    const face = o.face || (HT.hash(seed, 13) < 0.5 ? -1 : 1);
    const sp = rabbitSprite(size, fr, face);
    const lift = Math.round(arc * size * 0.42), vis = Math.max(1, Math.round(sp.h * k));
    const dx = Math.round(x) - sp.ox, dy = Math.round(y) - sp.oy - lift + (sp.h - vis);
    const a = o.alpha === undefined ? 1 : o.alpha, oa = ctx.globalAlpha;
    if (a < 1) ctx.globalAlpha = oa * a;
    ctx.drawImage(sp.c, 0, 0, sp.w, vis, dx, dy, sp.w, vis);
    if (a < 1) ctx.globalAlpha = oa;
  };
  const ptOf = (S, ref) => (Array.isArray(ref) ? ref : S && S.pt ? S.pt(ref) : [0, 0, 0]);
  // Rabbit Escape swarm: e = { from, to (world [x,y,z] or refs), n (80), emit (s, 2), speed (m/s, 4.2), size (m, 0.32),
  //   spread (m, 2.5: lateral bow of the paths), cloud (m, 1.6: radius they mill around `to`), life (s: vanish after),
  //   seed, shadows (true), split ('behind'|'front': only rabbits farther/nearer than `to` (or splitD m) — draw the event in
  //   both FX layers to wrap a character), shadowR (m, 0.5: spawn radius inside the shadow), pile (m, 0: heap height around
  //   `to` — ~1.5 buries a person) }. Each rabbit pops out of the shadow at `from`, hops along its own curved path to a spot in the
  //   cloud around `to`, then circles there. Pure function of age; depth-sorted; returns the number drawn.
  shiki.swarm = (ctx, S, e, age) => {
    const n = e.n || 80, emit = e.emit || 2.0, speed = e.speed || 4.2, size = e.size || 0.32, seed = e.seed || 7;
    const spread = e.spread === undefined ? 2.5 : e.spread, cloud = e.cloud === undefined ? 1.6 : e.cloud;
    const from = ptOf(S, e.from || e.at || 'mid'), to = ptOf(S, e.to || e.target || e.from || 'mid');
    const right = S.cam ? [cos(S.cam.yaw), -sin(S.cam.yaw)] : [1, 0];
    const D = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1e-3, nx = -(to[1] - from[1]) / D, ny = (to[0] - from[0]) / D;
    const list = [], shR = e.shadowR === undefined ? 0.5 : e.shadowR, pile = e.pile || 0;
    // optional depth split (draw the swarm twice: layer 'behind' with split:'behind', layer 'front' with split:'front')
    const pTo = e.split ? S.project(to[0], to[1], to[2] || 0) : null, splitD = e.splitD !== undefined ? e.splitD : pTo ? pTo.d : 0;
    for (let i = 0; i < n; i++) {
      const h = k => HT.hash(i * 31 + k, seed);
      const a = age - (emit * (i + 0.6 * h(1))) / n;
      if (a < 0) continue;
      let vis = clamp(a / 0.25, 0, 1);
      if (e.life !== undefined) { const tv = e.life + 0.7 * h(7); if (age > tv + 0.2) continue; if (age > tv) vis = Math.min(vis, 1 - (age - tv) / 0.2); }
      const sr = shR * Math.sqrt(h(8)), sa = h(9) * TAU, fx = from[0] + sr * cos(sa), fy = from[1] + sr * sin(sa) * 0.6; // spawn point inside the shadow
      const R = cloud * Math.sqrt(h(3)), phi = h(4) * TAU, ex = to[0] + R * cos(phi), ey = to[1] + R * sin(phi);
      const bow = spread * (h(5) - 0.5), cx = (fx + ex) / 2 + nx * bow, cy = (fy + ey) / 2 + ny * bow;
      const Tt = (Math.hypot(ex - fx, ey - fy) + Math.abs(bow) * 0.5) / (speed * (0.75 + 0.5 * h(2)));
      let x, y, vx, vy, z = from[2] || 0;
      if (a < Tt) { const u = a / Tt, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; x = w0 * fx + w1 * cx + w2 * ex; y = w0 * fy + w1 * cy + w2 * ey; vx = (1 - u) * (cx - fx) + u * (ex - cx); vy = (1 - u) * (cy - fy) + u * (ey - cy); }
      else {
        const om = (h(6) - 0.5) * 1.8, th = phi + om * (a - Tt); x = to[0] + R * cos(th); y = to[1] + R * sin(th); vx = -sin(th) * om; vy = cos(th) * om;
        if (pile) z += pile * Math.pow(Math.max(0, 1 - R / Math.max(0.01, cloud)), 0.6) * h(10) * clamp((a - Tt) / 0.8, 0, 1); // heaping up
      }
      const pr = S.project(x, y, z);
      if (!pr) continue;
      if (e.split === 'behind' ? pr.d < splitD : e.split === 'front' ? pr.d >= splitD : false) continue;
      list.push({ d: pr.d, z, x: pr.x, y: pr.y, px: size * pr.s, face: vx * right[0] + vy * right[1] >= 0 ? 1 : -1, vis, i });
    }
    list.sort((p, q) => q.d - p.d || p.z - q.z);
    for (const r of list) {
      if (r.px >= 5 && e.shadows !== false) HT.alpha(ctx, 0.3 * r.vis, () => HT.ellipse(ctx, r.x, r.y, r.px * 0.34, Math.max(1, r.px * 0.08), C.ink));
      shiki.rabbit(ctx, r.x, r.y, r.px, age, seed * 977 + r.i, { face: r.face, emerge: r.vis });
    }
    return list.length;
  };

  // ================================================================== LABS: ?lab=shiki  ·  ?lab=shikiperf
  //   ?lab=shiki[&char=mahoraga][&size=][&scale=2][&extras=1]   every pose of every character (+ extras when no char)
  //   ?lab=shiki&only=extras                                     wheel / variants / LOD / rabbits / in-context frames
  //   ?lab=shikiperf[&size=250][&reps=4]                          uncached render timings (console + window.__shikiPerf)
  const LAB_CHARS = [
    { name: 'mahoraga', prefix: 'maho_', size: 200, cw: 1.12, ch: 1.5, cols: 8 },
    { name: 'agito', prefix: 'ag_', size: 180, cw: 1.25, ch: 1.42, cols: 8 },
    { name: 'geto', prefix: 'geto_', size: 120, cw: 0.9, ch: 1.22, cols: 11 },
    { name: 'nanami', prefix: 'nanami_', size: 120, cw: 0.9, ch: 1.22, cols: 11 },
    { name: 'haibara', prefix: 'haibara_', size: 120, cw: 0.9, ch: 1.22, cols: 11 },
    { name: 'yaga', prefix: 'yaga_', size: 124, cw: 0.9, ch: 1.22, cols: 11 },
  ];
  shiki.LAB_CHARS = LAB_CHARS;
  const LAB_LIGHT = [-0.55, -0.5, 0.65], LAB_SEC = { hair: [0, 0], cloth: [0, 0], wind: 0.3 };
  function stackCanvases(list) {
    const w = Math.max(...list.map(c => c.width)), h = list.reduce((a, c) => a + c.height, 0);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const g = out.getContext('2d'); g.fillStyle = '#17111a'; g.fillRect(0, 0, w, h);
    let y = 0; for (const c of list) { g.drawImage(c, 0, y); y += c.height; }
    return out;
  }
  const posesOf = prefix => Object.keys(POSES).filter(n => n.startsWith(prefix));
  function labExtras(scale) {
    const sheets = [], D = (who, pose, size, o = {}) => (g, w, h) => rig.draw(g, who, w / 2, h - 8, typeof pose === 'string' ? POSES[pose] : pose, size, Object.assign({ light: LAB_LIGHT, face: 1, sec: LAB_SEC, t: 0.35 }, o));
    // wheel: 8 notches, glow, 3/4 view, tiny sizes
    const wc = [];
    for (let k = 0; k < 8; k++) wc.push({ label: 'wheel ' + k * 45, draw(g, w, h) { shiki.wheel(g, w / 2, h / 2, 22, k * 45, { light: LAB_LIGHT }); } });
    wc.push({ label: 'glow .5', draw(g, w, h) { shiki.wheel(g, w / 2, h / 2, 22, 22.5, { glow: 0.5, light: LAB_LIGHT }); } });
    wc.push({ label: 'glow 1', draw(g, w, h) { shiki.wheel(g, w / 2, h / 2, 22, 0, { glow: 1, light: LAB_LIGHT }); } });
    wc.push({ label: '3/4 view', draw(g, w, h) { shiki.wheel(g, w / 2, h / 2, 22, 10, { view: 'side', light: LAB_LIGHT }); } });
    wc.push({ label: 'r 4/6/10', draw(g, w, h) { shiki.wheel(g, 12, h / 2, 4, 0, { light: LAB_LIGHT }); shiki.wheel(g, 30, h / 2, 6, 0, { light: LAB_LIGHT }); shiki.wheel(g, 56, h / 2, 10, 0, { light: LAB_LIGHT }); } });
    sheets.push(HT.sheet(wc, { cw: 76, ch: 70, cols: 12, scale }));
    // variants
    const vc = [
      { label: 'maho glow wheel', draw: D('mahoraga', 'maho_idle', 150, { wheelGlow: 1, wheelAngle: 20 }) },
      { label: 'maho swordglow', draw: D('mahoraga', 'maho_slash', 150, { swordGlow: true }) },
      { label: 'maho no wheel', draw: D('mahoraga', 'maho_idle', 150, { wheel: false }) },
      { label: 'maho facing left', draw: D('mahoraga', 'maho_slashA', 150, { face: -1 }) },
      { label: 'maho sword fa', draw: D('mahoraga', 'maho_idle', 150, { swordArm: 'fa' }) },
      { label: 'ag snake 0', draw: D('agito', 'ag_idle', 140, { snake: 0 }) },
      { label: 'ag snake .3', draw: D('agito', 'ag_idle', 140, { snake: 0.3 }) },
      { label: 'ag snake .65', draw: D('agito', 'ag_idle', 140, { snake: 0.65 }) },
      { label: 'ag spark 1', draw: D('agito', 'ag_idle', 140, { spark: 1, t: 1.3 }) },
      { label: 'ag spark 0', draw: D('agito', 'ag_idle', 140, { spark: 0 }) },
      { label: 'ag left', draw: D('agito', 'ag_punch', 140, { face: -1 }) },
      { label: 'ag tail fwd', draw: D('agito', 'ag_idle', 140, { tail: 1 }) },
    ];
    sheets.push(HT.sheet(vc, { cw: 190, ch: 215, cols: 6, scale }));
    // LOD ladder
    const lc = [];
    for (const [who, pose, sizes] of [['mahoraga', 'maho_idle', [40, 60, 100, 150, 250]], ['agito', 'ag_idle', [40, 60, 100, 150, 250]], ['geto', 'geto_stand', [24, 40, 60, 120]], ['nanami', 'nanami_stand', [24, 40, 60, 120]], ['haibara', 'haibara_wave', [24, 40, 60, 120]], ['yaga', 'yaga_stand', [24, 40, 60, 120]]])
      for (const s of sizes) lc.push({ label: who.slice(0, 4) + ' ' + s, draw: D(who, pose, s) });
    sheets.push(HT.sheet(lc, { cw: 200, ch: 350, cols: 9, scale }));
    // rabbits: 3 drawings × sizes, plus swarm snapshots from a fixed camera
    const rc = [];
    for (const s of [5, 8, 12, 18, 26]) rc.push({ label: 'rabbit ' + s, draw(g, w, h) { for (let f = 0; f < 3; f++) shiki.rabbit(g, 14 + f * (s * 1.4 + 6), h - 8, s, 0, 3, { phase: [0.1, 0.4, 0.7][f], face: 1 }); } });
    const cam = HT.cam.make({ x: 0, y: -9, z: 2.2, pitch: -0.12, f: 330, vw: 200, vh: 110 });
    const S = { cam, project: (x, y, z) => HT.cam.project(cam, x, y, z), pt: r => r };
    for (const age of [0.4, 1.2, 2.2, 4.0]) rc.push({ label: 'swarm t' + age, draw(g, w, h) { HT.cam.prep(cam); HT.ellipse(g, S.project(-3, 0, 0).x, S.project(-3, 0, 0).y, 14, 3, C.ink); shiki.swarm(g, S, { from: [-3, 0, 0], to: [2.5, 2, 0], n: 70, seed: 5 }, age); } });
    sheets.push(HT.sheet(rc, { cw: 200, ch: 110, cols: 5, scale, cellBg: (g, x, y, w, h) => { HT.vgrad(g, x, y, w, h, [[0, C.slate], [0.5, C.charcoal], [1, C.charcoal]]); } }));
    // in context (true 640×360 frames): Act IV overcast wide shot; airport coda in warm pastels
    const overcast = (g, w, h) => {
      HT.vgrad(g, 0, 0, w, h * 0.62, [[0, C.slate], [1, C.lilacgrey]]);
      HT.rect(g, 0, h * 0.62, w, h * 0.38, C.charcoal);
      for (let i = 0; i < 9; i++) HT.rect(g, 20 + i * 70, h * 0.62 - 30 - HT.hash(i, 3) * 90, 40 + HT.hash(i, 4) * 30, 200, i % 2 ? C.shadow : C.dusk);
      const L2 = fightLight('overcast');
      rig.draw(g, 'gojo', 170, 300, rig.POSES && rig.POSES.guard ? rig.POSES.guard : POSES.nanami_stand, 60, { light: L2, face: 1, costume: 'fight' });
      rig.draw(g, 'mahoraga', 330, 305, POSES.maho_idle, 113, { light: L2, face: -1, wheelAngle: 22.5 });
      rig.draw(g, 'agito', 470, 300, POSES.ag_idle, 100, { light: L2, face: -1, t: 0.4 });
      rig.draw(g, 'mahoraga', 590, 330, POSES.maho_slashA, 56, { light: L2, face: -1 });
    };
    const airport = (g, w, h) => {
      HT.vgrad(g, 0, 0, w, h * 0.66, [[0, C.cream], [0.6, C.peach], [1, C.pinkrose]]);
      for (let i = 0; i < 6; i++) HT.rect(g, 30 + i * 105, 40, 86, 150, C.ice);
      HT.rect(g, 0, h * 0.66, w, h * 0.34, C.sand);
      HT.rect(g, 250, 250, 170, 10, C.tan); HT.rect(g, 250, 212, 170, 8, C.tan); HT.rect(g, 262, 260, 6, 36, C.clay); HT.rect(g, 402, 260, 6, 36, C.clay);
      const L3 = fightLight('airport');
      rig.draw(g, 'geto', 350, 300, POSES.geto_sitWave, 150, { light: L3, face: 1 });
      rig.draw(g, 'gojo', 180, 300, rig.POSES && rig.POSES.pockets ? rig.POSES.pockets : POSES.geto_stand, 155, { light: L3, face: 1, costume: 'uniform' });
      rig.draw(g, 'nanami', 470, 302, POSES.nanami_stand, 148, { light: L3, face: -1 });
      rig.draw(g, 'haibara', 540, 302, POSES.haibara_wave, 140, { light: L3, face: -1 });
      rig.draw(g, 'yaga', 610, 305, POSES.yaga_stand, 156, { light: L3, face: -1 });
    };
    sheets.push(HT.sheet([{ label: 'act iv overcast', draw: overcast }, { label: 'airport coda', draw: airport }], { cw: 640, ch: 360, cols: 2, scale }));
    return sheets;
  }
  const fightLight = k => (HT.fight && HT.fight.LIGHTS && HT.fight.LIGHTS[k] ? HT.fight.LIGHTS[k].light : LAB_LIGHT);
  HT.labs = HT.labs || {};
  HT.labs.shiki = Q => {
    shiki.register();
    const who = Q.get('char'), scale = +(Q.get('scale') || 2), sheets = [];
    if (Q.get('only') !== 'extras') for (const c of LAB_CHARS) {
      if (who && who !== c.name) continue;
      const size = +(Q.get('size') || c.size);
      const cells = posesOf(c.prefix).map(n => ({ label: n, draw(g, w, h) { rig.draw(g, c.name, w / 2, h - 8, POSES[n], size, { light: LAB_LIGHT, face: 1, sec: LAB_SEC, t: 0.35 }); } }));
      sheets.push(HT.sheet(cells, { cw: Math.round(size * c.cw), ch: Math.round(size * c.ch), cols: +(Q.get('cols') || c.cols), scale }));
    }
    if ((!who && Q.get('extras') !== '0') || Q.get('extras') === '1' || Q.get('only') === 'extras') sheets.push(...labExtras(scale));
    return stackCanvases(sheets);
  };
  HT.labs.shikiperf = Q => {
    shiki.register();
    const px = +(Q.get('size') || 250), reps = Math.max(2, +(Q.get('reps') || 4)), res = {};
    const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    for (const c of LAB_CHARS) {
      const names = posesOf(c.prefix), per = {}, all = [];
      for (let r = 0; r < reps; r++) for (const n of names) {
        const t0 = performance.now();
        rig.render(c.name, POSES[n], px, { light: LAB_LIGHT, sec: LAB_SEC, t: 0.35 });
        const ms = performance.now() - t0;
        if (r === 0) continue; // warm-up pass excluded
        (per[n] = per[n] || []).push(ms); all.push(ms);
      }
      let worst = '', worstMed = 0;
      for (const n in per) { const m = q(per[n], 0.5); if (m > worstMed) { worstMed = m; worst = n; } }
      res[c.name] = { avgMs: +(all.reduce((a, b) => a + b, 0) / all.length).toFixed(3), p50: +q(all, 0.5).toFixed(2), p95: +q(all, 0.95).toFixed(2), max: +Math.max(...all).toFixed(2), worstPoseMedian: [worst, +worstMed.toFixed(2)], poses: names.length, px };
    }
    const cam = HT.cam.make({ x: 0, y: -12, z: 2.2, pitch: -0.1, f: 480 }), S = { cam, project: (x, y, z) => HT.cam.project(cam, x, y, z), pt: r => r };
    const tmp = HT.canvas(640, 360);
    let t0 = performance.now();
    for (let k = 0; k < 60; k++) shiki.swarm(tmp.g, S, { from: [-5, 0, 0], to: [4, 3, 0], n: 150, seed: 2 }, 1 + k / 30);
    res.swarm150 = { avgMs: +((performance.now() - t0) / 60).toFixed(3) };
    t0 = performance.now();
    for (let k = 0; k < 60; k++) shiki.wheel(tmp.g, 320, 180, 40, k * 3, { key: null, light: LAB_LIGHT });
    res.wheel40uncached = { avgMs: +((performance.now() - t0) / 60).toFixed(3) };
    console.log('shikiperf', JSON.stringify(res));
    window.__shikiPerf = res;
    const lines = Object.entries(res).map(([k, v]) => k + '  ' + JSON.stringify(v));
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 20 + lines.length * 16;
    const g = cv.getContext('2d'); g.fillStyle = '#17111a'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#8ff8e2'; g.font = '12px monospace';
    lines.forEach((l, i) => g.fillText(l, 8, 18 + i * 16));
    return cv;
  };
})();
