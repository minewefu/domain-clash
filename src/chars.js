/* DOMAIN CLASH — character builds for the rig (rig.js). Original pixel interpretations (no traced art); designs follow
   the canon research in SPEC.md §5 (Fandom chapter pages 221–236, character pages):
     GOJO   >190 cm, lean; white tousled spiky hair; light-blue eyes, uncovered. Costumes:
            'fight'   tight black short-sleeved T-shirt, baggy white trousers gathered at the ankles, black belt knotted at
                      the back (tails), black martial-arts slippers                                  (ch. 224–235)
            'robe'    a pale loose outer robe with a dark scarf wrap over the fight clothes             (ch. 223)
            'uniform' black high-collared student uniform + small round black sunglasses (airport, ch. 236)
     SUKUNA in Megumi's body, 175 cm; spiky black hair; red eyes; a second pair of eyes below the first; crown-like mark
            on the forehead, a line across the nose bridge (+ small cheek marks); black double bands on the upper arms and
            wrists. Costumes: 'fight' sleeveless white kimono over a black undershirt, black belt, white trousers, black
            sandals · 'haori' the same under a long black haori (rooftop, ch. 221–222)
   A build(T) draws the parts of one drawing into the rig's G-buffer (see rig.js). z-layers (inner lines appear where
   layers differ by ≥ 2): 1 far arm · 2 far sleeve · 3 far leg · 4 back cloth · 5 torso · 6 torso details · 7 near leg ·
   8 front cloth · 9 head · 10 face details · 11 hair · 13 near arm · 14 near sleeve / hand details */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, rig = HT.rig;
  const M = rig.material;
  const sin = Math.sin, cos = Math.cos, D2R = Math.PI / 180;

  // ------------------------------------------------------------------ materials
  M('skin', [C.rosewood, C.salmon, C.peach, C.cream], { line: C.rosewood, rim: C.white });
  M('black', [C.ink, C.ink, C.shadow, C.indigo], { line: C.ink, rim: C.blue });
  M('blackSoft', [C.ink, C.shadow, C.dusk, C.lilacgrey], { line: C.ink, rim: C.steel });
  M('whiteCloth', [C.dusk, C.steel, C.mist, C.white], { line: C.lilacgrey, rim: C.white });
  M('robe', [C.lilacgrey, C.steel, C.mist, C.white], { line: C.dusk, rim: C.white });
  M('scarf', [C.ink, C.navy, C.indigo, C.blue], { line: C.ink, rim: C.sky });
  M('gojo_hair', [C.lilacgrey, C.steel, C.mist, C.white], { line: C.lilacgrey, rim: C.ice });
  M('gojo_eye', [C.blue, C.sky, C.ice, C.white], { flat: true });
  M('suk_hair', [C.ink, C.ink, C.shadow, C.navy], { line: C.ink, rim: C.indigo });
  M('suk_eye', [C.maroon, C.crimson, C.red, C.salmon], { flat: true });
  M('mark', [C.ink, C.ink, C.ink, C.ink], { flat: true });
  M('white', [C.white, C.white, C.white, C.white], { flat: true });
  M('mouth', [C.maroon, C.rosewood, C.rosewood, C.rosewood], { flat: true });
  M('teeth', [C.mist, C.white, C.white, C.white], { flat: true });
  M('blood', [C.maroon, C.crimson, C.crimson, C.red], { flat: true });
  M('glass', [C.ink, C.ink, C.shadow, C.indigo], { flat: true });
  M('sil', [C.ink, C.ink, C.shadow, C.dusk], { line: C.ink });
  // Mahoraga: white body, gold wheel, black hakama, white sash, pale steel sword
  M('maho_skin', [C.lilacgrey, C.steel, C.mist, C.white], { line: C.dusk, rim: C.white });
  M('maho_gold', [C.rust, C.amber, C.gold, C.butter], { line: C.bark, rim: C.butter });
  M('maho_blade', [C.slate, C.steel, C.mist, C.white], { line: C.charcoal, rim: C.white });
  M('bandage', [C.sand, C.mist, C.white, C.white], { line: C.rosewood });
  // Agito: dark feathers, bone mask, black antlers, striped torso, amber tiger feet, dark-teal serpent tail
  M('ag_feather', [C.ink, C.charcoal, C.slate, C.sage], { line: C.ink, rim: C.fern });
  M('ag_bone', [C.rosewood, C.sand, C.mist, C.white], { line: C.rosewood });
  M('ag_body', [C.dusk, C.lilacgrey, C.steel, C.mist], { line: C.shadow, rim: C.white });
  M('ag_tiger', [C.bark, C.rust, C.amber, C.honey], { line: C.ink });
  M('ag_snake', [C.ink, C.deepteal, C.teal, C.jade], { line: C.ink, rim: C.aqua });

  // ------------------------------------------------------------------ vector helpers (character space)
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, k) => [a[0] * k, a[1] * k];
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const norm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  const perp = a => [a[1], -a[0]]; // for an "up" vector this points forward
  // head frame (head units: u forward, v up; 1 = head height)
  const headFrame = (T) => {
    const a = T.J.headA, hs = T.prop.head, c = T.J.head;
    const up = [sin(a), cos(a)], fw = [cos(a), -sin(a)];
    return (u, v) => [c[0] + (fw[0] * u + up[0] * v) * hs, c[1] + (fw[1] * u + up[1] * v) * hs];
  };
  const secOf = (T, k) => (T.o.sec && T.o.sec[k]) || [0, 0];

  // ------------------------------------------------------------------ hands
  function hand(T, key, shape, mat, z, dt) {
    const J = T.J, w = J[key + 'W'], h = J[key + 'H'], A = J[key + 'A'][2];
    const r = T.prop.limb;
    const dir = [sin(A), -cos(A)];
    if (shape === 'pocket' || shape === 'none') return;
    if (shape === 'fist' || shape === 'sign') { T.ell(lerp2(w, h, 0.62), r * 1.02, r * 0.9, A, mat, z, dt); return; }
    if (shape === 'relaxed') { T.cap(w, add(w, mul(dir, T.prop.hand * 0.8)), r * 0.82, r * 0.62, mat, z, dt); return; }
    if (shape === 'flat') { T.cap(w, add(w, mul(dir, T.prop.hand * 1.05)), r * 0.78, r * 0.42, mat, z, dt); return; }
    if (shape === 'open' || shape === 'claw') {
      T.ell(lerp2(w, h, 0.5), r * 0.95, r * 0.82, A, mat, z, dt);
      if (T.lod >= 2) {
        const pd = perp(dir);
        for (let k = -1; k <= 2; k++) {
          const base = add(lerp2(w, h, 0.85), mul(pd, k * r * 0.42 - r * 0.2));
          const tip = add(base, mul(shape === 'claw' ? norm(add(dir, mul(pd, -0.7))) : dir, T.prop.hand * 0.5));
          T.line(base, tip, mat, Math.max(0, 2 + (dt || 0)), z);
        }
        const th = add(lerp2(w, h, 0.4), mul(pd, r * 0.95));
        T.line(th, add(th, mul(norm(add(dir, pd)), T.prop.hand * 0.36)), mat, 2, z);
      } else T.cap(lerp2(w, h, 0.5), add(h, mul(dir, T.prop.hand * 0.3)), r * 0.72, r * 0.5, mat, z, dt);
      return;
    }
    if (shape === 'point' || shape === 'two') {
      T.ell(lerp2(w, h, 0.55), r * 0.98, r * 0.86, A, mat, z, dt);
      const pd = perp(dir), n = shape === 'two' ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const base = add(h, mul(pd, (k - (n - 1) / 2) * r * 0.5 + r * 0.2));
        T.cap(base, add(base, mul(dir, T.prop.hand * 0.62)), r * 0.3, r * 0.26, mat, z, dt);
      }
      return;
    }
    T.ell(lerp2(w, h, 0.55), r, r * 0.9, A, mat, z, dt);
  }

  // ------------------------------------------------------------------ side (3/4) view body parts
  // limb helper: two capsules; `bulge` widens the middle (muscle / baggy cloth)
  const limb = (T, a, b, ra, rb, mat, z, dt) => T.cap(a, b, ra, rb, mat, z, dt);
  // torso frame: s along the spine (0 hip → 1 neck base), f across (+ = chest/front)
  function torsoFrame(T) {
    const J = T.J, P = T.P, hip = J.hip, ch = J.chest, up = norm(sub(ch, hip)), fw = perp(up);
    const L = Math.hypot(ch[0] - hip[0], ch[1] - hip[1]);
    const tw = 1 + 0.35 * (P.twist === undefined ? 0.35 : P.twist);
    const pr = T.prop;
    return { hip, ch, up, fw, L, tp: (s, f) => add(hip, add(mul(up, s * L), mul(fw, f))), wc: pr.chest * tw * 0.5, ww: pr.waist * tw * 0.5, wh: pr.hipW * 0.55 * tw * 0.5 };
  }
  // trousers: baggy (gathered at the ankle) or straight-wide
  function legSide(T, key, mat, z, dt, style) {
    const J = T.J, pr = T.prop, lR = pr.leg;
    const P0 = J[key + 'P'], K = J[key + 'K'], A = J[key + 'A'];
    if (style === 'baggy') {
      T.cap(P0, K, lR * 1.32, lR * 1.12, mat, z, dt);
      T.cap(K, lerp2(K, A, 0.82), lR * 1.12, lR * 0.95, mat, z, dt);
      T.cap(lerp2(K, A, 0.8), A, lR * 0.95, lR * 0.62, mat, z, dt); // gathered cuff
      if (T.lod >= 2) { // fold lines at the knee and the cuff
        const kd = norm(sub(A, K)), kp = perp(kd);
        T.line(add(K, mul(kp, lR * 0.4)), add(lerp2(K, A, 0.18), mul(kp, -lR * 0.3)), mat, Math.max(0, 1 + (dt || 0)), z);
        T.line(add(lerp2(K, A, 0.86), mul(kp, lR * 0.6)), add(lerp2(K, A, 0.86), mul(kp, -lR * 0.6)), mat, Math.max(0, 1 + (dt || 0)), z);
      }
    } else if (style === 'wide') {
      T.cap(P0, K, lR * 1.25, lR * 1.1, mat, z, dt);
      T.cap(K, A, lR * 1.1, lR * 1.18, mat, z, dt);
    } else {
      T.cap(P0, K, lR * 1.08, lR * 0.9, mat, z, dt);
      T.cap(K, A, lR * 0.9, lR * 0.78, mat, z, dt);
    }
  }
  function footSide(T, key, mat, z, dt, style) {
    const J = T.J, an = J[key + 'A'], toe = J[key + 'T'], pr = T.prop;
    const d = norm(sub(toe, an)), n = perp(d);
    const h = pr.foot * (style === 'slipper' ? 0.7 : 0.85);
    const heel = add(an, mul(d, -pr.foot * 0.55));
    const pts = [add(heel, mul(n, -h * 0.95)), add(an, mul(n, -h * 1.0)), add(lerp2(an, toe, 0.6), mul(n, -h * 0.55)), add(toe, mul(n, -h * 0.1)), add(toe, mul(n, h * 0.5)), add(heel, mul(n, h * 0.6))];
    T.poly(pts, mat, z, dt, -1, [0, 1]);
  }
  function armSide(T, key, cfg, z, dt) {
    const J = T.J, pr = T.prop, P = T.P, aR = pr.limb;
    const S = J[key + 'S'], E = J[key + 'E'], Wr = J[key + 'W'];
    // skin arm (muscled: fuller upper arm and forearm)
    T.cap(S, E, aR * 1.15, aR * 1.0, cfg.armMat || cfg.skin, z, dt);
    T.cap(E, Wr, aR * 1.02, aR * 0.8, cfg.foreMat || cfg.skin, z, dt);
    const smat = cfg.sleeveMat || cfg.top;
    if (cfg.sleeve === 'short') T.cap(S, lerp2(S, E, 0.5), aR * 1.35, aR * 1.25, smat, z, dt);
    else if (cfg.sleeve === 'long') { T.cap(S, E, aR * 1.25, aR * 1.12, smat, z, dt); T.cap(E, lerp2(E, Wr, 0.92), aR * 1.12, aR * 0.98, smat, z, dt); }
    else if (cfg.sleeve === 'wide') { T.cap(S, E, aR * 1.5, aR * 1.7, smat, z, dt); T.cap(E, lerp2(E, Wr, 0.7), aR * 1.7, aR * 2.0, smat, z, dt); }
    if (cfg.bands && T.lod >= 2) { // Sukuna's double bands (upper arm + wrist)
      const mk = rig.mat('mark'), up2 = lerp2(S, E, 0.62), up3 = lerp2(S, E, 0.72), w1 = lerp2(E, Wr, 0.78), w2 = lerp2(E, Wr, 0.88);
      const bw = (a, b, r) => { const d = perp(norm(sub(b, a))); T.line(add(a, mul(d, r)), add(a, mul(d, -r)), mk, 0, z); };
      bw(up2, E, aR * 1.05); bw(up3, E, aR * 1.02); bw(w1, Wr, aR * 0.86); bw(w2, Wr, aR * 0.84);
    }
    hand(T, key, key === 'na' ? P.nh : P.fh, cfg.skin, z + 1, dt);
  }

  // ------------------------------------------------------------------ heads (side 3/4 view)
  function headSide(T, H, skin) {
    const z = 9, hs = T.prop.head;
    T.cap(T.J.neck, lerp2(T.J.chest, T.J.neck, 0.15), T.prop.limb * 1.15, T.prop.limb * 1.25, skin, 8, -1);
    T.ell(H(-0.03, 0.06), 0.47 * hs, 0.47 * hs, T.J.headA, skin, z);
    // face: cheek → nose → mouth → chin → jaw (anime 3/4: small nose, pointed chin)
    T.poly([H(-0.28, -0.02), H(0.06, 0.16), H(0.42, 0.13), H(0.46, 0.0), H(0.52, -0.1), H(0.45, -0.15), H(0.44, -0.24), H(0.36, -0.36), H(0.24, -0.46), H(0.06, -0.42), H(-0.2, -0.24)], skin, z, 0, -1, [1, 0]);
    if (T.lod >= 2) T.ell(H(-0.12, -0.04), 0.07 * hs, 0.11 * hs, T.J.headA, skin, z + 1, -1); // ear
  }
  function eyesSide(T, H, o) {
    const lod = T.lod, P = T.P, z = 10, lineM = rig.mat('mark'), eyeM = o.eyeMat;
    if (lod === 0) return;
    const eyes = P.eyes || 'open', ex = 0.29, ey = 0.03;
    if (lod === 1) { if (eyes !== 'closed') T.dot(H(ex, ey), eyeM, o.glow ? 3 : 1, z); return; }
    if (eyes === 'closed') T.line(H(ex - 0.09, ey + 0.01), H(ex + 0.08, ey - 0.02), lineM, 0, z);
    else {
      const hh = eyes === 'narrow' || eyes === 'glare' ? 1 : eyes === 'wide' ? 3 : 2;
      T.line(H(ex - 0.1, ey + 0.08), H(ex + 0.09, ey + 0.07), lineM, 0, z, lod >= 3 ? 2 : 1); // upper lash
      if (lod >= 3) T.dot(H(ex - 0.08, ey + 0.05), rig.mat('white'), 3, z, 1, hh);
      T.dot(H(ex - 0.03, ey + 0.05), eyeM, 1, z, lod >= 3 ? 3 : 2, hh);
      if (o.glow) T.dot(H(ex - 0.01, ey + 0.05), eyeM, 3, z);
      T.dot(H(0.46, ey + 0.05), eyeM, 1, z, 1, Math.min(2, hh)); // far eye at the face edge
      const bl = eyes === 'glare' ? -0.05 : eyes === 'wide' ? 0.03 : 0;
      T.line(H(ex - 0.1, ey + 0.19 + bl), H(ex + 0.1, ey + 0.17 - bl * 0.6), o.browMat || lineM, 1, z);
    }
  }
  function mouthSide(T, H) {
    const lod = T.lod, P = T.P, z = 10, face = P.face || 'neutral', mx = 0.34, my = -0.28;
    if (lod < 2) return;
    const mm = rig.mat('mouth');
    if (face === 'grin' || face === 'smirk') {
      T.line(H(mx - 0.09, my + 0.02), H(mx + 0.08, my + (face === 'grin' ? 0.08 : 0.05)), mm, 0, z);
      if (face === 'grin') T.dot(H(mx - 0.03, my + 0.0), rig.mat('teeth'), 2, z, 2, 1);
    } else if (face === 'open' || face === 'shout') {
      T.dot(H(mx - 0.05, my + 0.03), mm, 0, z, 2, face === 'shout' ? 3 : 2);
      if (face === 'shout') T.dot(H(mx - 0.05, my + 0.03), rig.mat('teeth'), 2, z, 2, 1);
    } else if (face === 'smile') T.line(H(mx - 0.07, my + 0.03), H(mx + 0.06, my + 0.05), mm, 0, z);
    else if (face === 'grit') T.line(H(mx - 0.08, my + 0.02), H(mx + 0.07, my + 0.02), rig.mat('teeth'), 2, z);
    else if (lod >= 3) T.line(H(mx - 0.04, my + 0.02), H(mx + 0.04, my + 0.02), mm, 1, z);
    if (P.bleed) T.line(H(0.44, -0.14), H(0.42, -0.32), rig.mat('blood'), 1, z);
  }
  // spiky hair (side view). spikes: [angle from up (deg, + = forward), length, base half-width]; front hairline at v ≈ 0.25
  function hairSide(T, H, mat, spikes, bangs, o = {}) {
    const z = 11, sec = secOf(T, 'hair'), lift = T.P.hairLift || 0, lod = T.lod;
    // hair mass: front hairline → crown → back → nape → behind the ear → temple
    const cap = [H(0.44, 0.24), H(0.46, 0.4), H(0.3, 0.62), H(0.02, 0.7), H(-0.3, 0.62), H(-0.5, 0.4), H(-0.54, 0.12), H(-0.48, -0.16), H(-0.36, -0.3), H(-0.24, -0.16), H(-0.16, 0.04), H(-0.02, 0.14), H(0.2, 0.2)];
    T.poly(cap, mat, z, 0, -1, [0.4, 1]);
    const list = lod <= 1 ? spikes.filter((_, i) => i % 2 === 0) : spikes;
    for (const [ang0, len0, bw] of list) {
      const len = len0 * (1 + 0.18 * lift), ang = ang0 * (1 - 0.12 * lift);
      const a = ang * D2R, R0 = 0.5, cx = -0.03, cy = 0.12;
      const b1 = [cx + sin((ang - bw) * D2R) * R0, cy + cos((ang - bw) * D2R) * R0], b2 = [cx + sin((ang + bw) * D2R) * R0, cy + cos((ang + bw) * D2R) * R0];
      const ca = [cx + sin(a) * R0, cy + cos(a) * R0];
      const sw = (o.sweep === undefined ? -0.14 : o.sweep);
      const k = 3.4 * len;
      const tip = [ca[0] + sin(a + sw) * len + sec[0] * k, ca[1] + cos(a + sw) * len + sec[1] * k + lift * 0.08];
      T.poly([H(b1[0], b1[1]), H(tip[0], tip[1]), H(b2[0], b2[1])], mat, z, 0, -1, [cos(a), -sin(a)]);
    }
    if (lod >= 2 && bangs) for (const [u, l, lean] of bangs) T.poly([H(u - 0.1, 0.32), H(u + 0.09, 0.32), H(u + lean + sec[0] * 0.7, 0.32 - l)], mat, z, 0, -1, [1, 0]);
  }

  // ------------------------------------------------------------------ front / back view
  function frontBody(T, cfg, back) {
    const J = T.J, pr = T.prop, P = T.P, aR = pr.limb * 1.05, lR = pr.leg;
    const hip = J.hip, ch = J.chest, up = norm(sub(ch, hip)), rt = [up[1], -up[0]];
    const L = Math.hypot(ch[0] - hip[0], ch[1] - hip[1]);
    const tp = (s, f) => add(hip, add(mul(up, s * L), mul(rt, f)));
    const sw = pr.shoulderW / 2, hw = pr.hipW / 2, ww = pr.waist * 0.8;
    for (const k of ['fl', 'nl']) {
      const dt = k === 'fl' ? -1 : 0, s = k === 'nl' ? 1 : -1;
      const P0 = J[k + 'P'], K = J[k + 'K'], A = J[k + 'A'];
      if (cfg.legs === 'baggy') { T.cap(P0, K, lR * 1.35, lR * 1.15, cfg.pants, 3, dt); T.cap(K, lerp2(K, A, 0.8), lR * 1.15, lR * 0.95, cfg.pants, 3, dt); T.cap(lerp2(K, A, 0.78), A, lR * 0.95, lR * 0.62, cfg.pants, 3, dt); }
      else if (cfg.legs === 'wide') { T.cap(P0, K, lR * 1.25, lR * 1.1, cfg.pants, 3, dt); T.cap(K, A, lR * 1.1, lR * 1.2, cfg.pants, 3, dt); }
      else { T.cap(P0, K, lR * 1.1, lR * 0.95, cfg.pants, 3, dt); T.cap(K, A, lR * 0.95, lR * 0.82, cfg.pants, 3, dt); }
      T.poly([add(A, [-pr.foot * 0.9, pr.foot * 0.3]), add(A, [pr.foot * 0.9, pr.foot * 0.3]), add(A, [pr.foot * 1.05 + s * 0.004, -pr.foot * 0.8]), add(A, [-pr.foot * 1.05 + s * 0.004, -pr.foot * 0.8])], cfg.shoe, 3, 0, -1, [1, 0]);
    }
    const torso = [tp(-0.06, -hw), tp(-0.06, hw), tp(0.45, ww), tp(0.8, sw * 0.95), tp(0.98, sw * 0.9), tp(1.05, sw * 0.3), tp(1.05, -sw * 0.3), tp(0.98, -sw * 0.9), tp(0.8, -sw * 0.95), tp(0.45, -ww)];
    T.poly(torso, cfg.top, 5, 0, -1, rt);
    if (cfg.frontDetail) cfg.frontDetail(T, tp, up, rt, { sw, hw, ww, L, back });
    for (const k of ['fa', 'na']) {
      const z = k === 'na' ? 13 : 12, S0 = J[k + 'S'], E = J[k + 'E'], Wr = J[k + 'W'];
      T.cap(S0, E, aR * 1.12, aR, cfg.armMat || cfg.skin, z, 0);
      T.cap(E, Wr, aR, aR * 0.82, cfg.skin, z, 0);
      const smat = cfg.sleeveMat || cfg.top;
      if (cfg.sleeve === 'short') T.cap(S0, lerp2(S0, E, 0.5), aR * 1.32, aR * 1.2, smat, z, 0);
      else if (cfg.sleeve === 'long') { T.cap(S0, E, aR * 1.25, aR * 1.12, smat, z, 0); T.cap(E, lerp2(E, Wr, 0.92), aR * 1.12, aR, smat, z, 0); }
      else if (cfg.sleeve === 'wide') { T.cap(S0, E, aR * 1.5, aR * 1.7, smat, z, 0); T.cap(E, lerp2(E, Wr, 0.7), aR * 1.7, aR * 2.0, smat, z, 0); }
      if (cfg.bands && T.lod >= 2) { const mk = rig.mat('mark'); for (const u of [0.62, 0.72]) { const p = lerp2(S0, E, u); T.line(add(p, [-aR, 0]), add(p, [aR, 0]), mk, 0, z); } for (const u of [0.78, 0.88]) { const p = lerp2(E, Wr, u); T.line(add(p, [-aR * 0.8, 0]), add(p, [aR * 0.8, 0]), mk, 0, z); } }
      hand(T, k, k === 'na' ? P.nh : P.fh, cfg.skin, z + 1, 0);
    }
    return { tp, up, rt, sw, hw, L };
  }
  function eyesFront(T, H, o) {
    const lod = T.lod, P = T.P, z = 10, lineM = rig.mat('mark'), eyeM = o.eyeMat;
    if (lod === 0) return;
    const eyes = P.eyes || 'open';
    for (const s of [-1, 1]) {
      const ex = s * 0.2, ey = 0.03;
      if (lod === 1) { if (eyes !== 'closed') T.dot(H(ex, ey), eyeM, o.glow ? 3 : 1, z); continue; }
      if (eyes === 'closed') { T.line(H(ex - 0.08, ey), H(ex + 0.08, ey), lineM, 0, z); continue; }
      const hh = eyes === 'narrow' || eyes === 'glare' ? 1 : eyes === 'wide' ? 3 : 2;
      T.line(H(ex - 0.1, ey + 0.08), H(ex + 0.1, ey + 0.08), lineM, 0, z, lod >= 3 ? 2 : 1);
      T.dot(H(ex - 0.04, ey + 0.05), eyeM, 1, z, 2, hh);
      if (o.glow) T.dot(H(ex - 0.02, ey + 0.05), eyeM, 3, z);
      T.line(H(ex - 0.1, ey + 0.19), H(ex + 0.1, ey + 0.18 + (eyes === 'glare' ? -s * 0.04 : 0)), o.browMat || lineM, 1, z);
    }
    if (lod >= 2) {
      const face = P.face || 'neutral', my = -0.28, mm = rig.mat('mouth');
      if (face === 'grin') { T.line(H(-0.12, my + 0.03), H(0.12, my + 0.03), mm, 0, z); T.dot(H(-0.05, my + 0.0), rig.mat('teeth'), 2, z, 3, 1); }
      else if (face === 'smile' || face === 'smirk') T.line(H(-0.08, my + 0.02), H(0.08, my + 0.04), mm, 0, z);
      else if (face === 'open' || face === 'shout') T.dot(H(-0.04, my + 0.04), mm, 0, z, 2, 2);
      else if (lod >= 3) T.line(H(-0.04, my + 0.02), H(0.04, my + 0.02), mm, 1, z);
      if (P.bleed) T.line(H(0.02, -0.14), H(0.02, -0.32), rig.mat('blood'), 1, z);
    }
    if (o.marks && lod >= 2) o.marks(T, H);
  }
  function hairFront(T, H, mat, back, spikes, bangs) {
    const z = 11, sec = secOf(T, 'hair'), lift = T.P.hairLift || 0;
    const cap = [];
    for (let a = -118; a <= 118; a += 9) cap.push(H(sin(a * D2R) * 0.6, cos(a * D2R) * 0.58 + 0.1));
    cap.push(H(0.5, -0.08)); cap.push(H(0.32, back ? -0.38 : 0.22)); cap.push(H(-0.32, back ? -0.38 : 0.22)); cap.push(H(-0.5, -0.08));
    T.poly(cap, mat, z, 0, -1, [1, 0.3]);
    for (const [ang, len0] of (T.lod <= 1 ? spikes.filter((_, i) => i % 2 === 0) : spikes)) {
      const a = ang * D2R, len = len0 * (1 + 0.18 * lift), bw = 13 * D2R, ca = [sin(a) * 0.52, cos(a) * 0.52 + 0.12];
      const tip = [ca[0] + sin(a) * len + sec[0] * len * 3.2, ca[1] + cos(a) * len + sec[1] * len * 3.2 + lift * 0.08];
      T.poly([H(sin(a - bw) * 0.52, cos(a - bw) * 0.52 + 0.12), H(tip[0], tip[1]), H(sin(a + bw) * 0.52, cos(a + bw) * 0.52 + 0.12)], mat, z, 0, -1, [cos(a), -sin(a)]);
    }
    if (!back && T.lod >= 2 && bangs) for (const [u, l] of bangs) T.poly([H(u - 0.1, 0.34), H(u + 0.1, 0.34), H(u + sec[0] * 0.6, 0.34 - l)], mat, z, 0, -1, [1, 0]);
  }
  function headFront(T, H, skin, back) {
    T.cap(T.J.neck, lerp2(T.J.chest, T.J.neck, 0.15), T.prop.limb * 1.2, T.prop.limb * 1.3, skin, 8, -1);
    if (back) { T.ell(H(0, 0.1), 0.42 * T.prop.head, 0.38 * T.prop.head, T.J.headA, skin, 9); return; } // the back of the head: no jaw (a skin oval below the hair read as a blank face); the hair cap covers it
    T.ell(H(0, 0.04), 0.44 * T.prop.head, 0.46 * T.prop.head, T.J.headA, skin, 9);
    T.poly([H(-0.42, 0.0), H(0.42, 0.0), H(0.36, -0.24), H(0.14, -0.44), H(0, -0.48), H(-0.14, -0.44), H(-0.36, -0.24)], skin, 9, 0, -1, [1, 0]);
  }

  // ================================================================== GOJO SATORU
  const GOJO_SPIKES = [[-138, 0.2, 20], [-108, 0.34, 20], [-78, 0.46, 19], [-50, 0.56, 18], [-22, 0.6, 17], [4, 0.56, 17], [30, 0.44, 18], [56, 0.3, 19], [76, 0.2, 18]];
  const GOJO_BANGS = [[0.34, 0.18, 0.08], [0.2, 0.2, 0.06]];
  const GOJO_FRONT_SPIKES = [[-110, 0.26], [-84, 0.4], [-58, 0.52], [-32, 0.58], [-10, 0.6], [12, 0.6], [34, 0.56], [58, 0.5], [84, 0.38], [110, 0.24]];
  const GOJO_FRONT_BANGS = [[-0.24, 0.24], [-0.08, 0.3], [0.1, 0.28], [0.26, 0.22]];
  // belt tails knotted at the back (cloth chain, sways with the cloth spring + wind)
  function beltTails(T, d, mat) {
    const sec = secOf(T, 'cloth'), wind = (T.o.sec && T.o.sec.wind) || 0;
    const knot = d.tp(0.08, -d.ww * 1.15);
    const sw = [sec[0] * 2.4 - wind * 0.03 - 0.02, sec[1] * 1.5];
    for (const [len, off] of [[0.2, 0], [0.16, 0.012]]) {
      const tip = add(add(knot, [-0.03 - off, -len]), mul(sw, len * 5));
      const mid = add(lerp2(knot, tip, 0.5), mul(sw, len * 1.5));
      T.poly([add(knot, [0, 0.008]), add(mid, [0.006, 0]), tip, add(tip, [0.012, 0.004]), add(mid, [0.02, 0]), add(knot, [0.014, -0.004])], mat, 4, 0, -1, [1, 0]);
    }
    T.ell(knot, 0.02, 0.016, 0, mat, 4);
  }
  // pale loose robe with wide sleeves + dark scarf (Act I walk-in)
  function robeSide(T, d, layer) {
    const J = T.J, rm = rig.mat('robe'), sec = secOf(T, 'cloth'), wind = (T.o.sec && T.o.sec.wind) || 0;
    const sway = [sec[0] * 2.4 - wind * 0.03, sec[1] * 1.2];
    const hem = -1.05;
    if (layer === 'back') {
      T.poly([d.tp(1.0, -d.wc * 0.3), d.tp(0.92, -d.wc * 1.2), d.tp(0.3, -d.ww * 1.35), add(d.tp(hem, -d.wh * 1.9), mul(sway, 1.1)), add(d.tp(hem - 0.03, d.wh * 1.5), mul(sway, 0.8)), d.tp(0.0, d.wh * 1.2)], rm, 4, -1, -1, d.fw);
      const s = J.faS, e = J.faE, w = J.faW;
      T.poly([lerp2(s, e, 0.1), lerp2(e, w, 0.55), add(add(lerp2(e, w, 0.6), [0, -0.12]), mul(sway, 0.7)), add(add(lerp2(s, e, 0.5), [0, -0.12]), mul(sway, 0.5))], rm, 2, -1, -1, [1, 0]);
    } else if (layer === 'front') {
      T.poly([d.tp(1.05, d.wc * 0.3), d.tp(0.98, d.wc * 1.1), d.tp(0.5, d.ww * 1.3), add(d.tp(hem + 0.05, d.wh * 1.6), mul(sway, 0.7)), add(d.tp(hem, -d.wh * 0.6), mul(sway, 0.9)), d.tp(0.1, -d.ww * 0.6), d.tp(0.9, -d.wc * 0.8)], rm, 8, 0, -1, d.fw);
      if (T.lod >= 2) T.line(d.tp(1.0, d.wc * 0.5), d.tp(hem + 0.1, d.wh * 0.9), rm, 1, 8);
      // scarf around the neck, ends trailing back
      const sc = rig.mat('scarf'), n0 = lerp2(J.chest, J.neck, 0.6);
      T.ell(n0, T.prop.limb * 1.9, T.prop.limb * 1.5, 0, sc, 12);
      const tip = add(add(n0, [-0.1, -0.12]), mul(sway, 0.6));
      T.poly([add(n0, [-0.01, 0.02]), add(n0, [-0.04, -0.02]), tip, add(tip, [0.015, 0.02])], sc, 12, 0, -1, [1, 0]);
    } else if (layer === 'sleeve') {
      const s = J.naS, e = J.naE, w = J.naW;
      T.poly([lerp2(s, e, 0.05), lerp2(e, w, 0.7), add(add(lerp2(e, w, 0.72), [0, -0.1]), mul(sway, 0.8)), add(add(lerp2(s, e, 0.55), [0, -0.12]), mul(sway, 0.6))], rm, 14, 0, -1, [1, 0]);
    }
  }
  function sunglasses(T, H, front) {
    if (T.lod < 1) return;
    const g = rig.mat('glass');
    if (front) { for (const s of [-1, 1]) T.ell(H(s * 0.2, 0.05), 0.09 * T.prop.head, 0.08 * T.prop.head, 0, g, 10); T.line(H(-0.1, 0.07), H(0.1, 0.07), g, 0, 10); }
    else { T.ell(H(0.3, 0.05), 0.09 * T.prop.head, 0.08 * T.prop.head, 0, g, 10); T.dot(H(0.46, 0.06), g, 0, 10); }
  }
  rig.define({
    name: 'gojo', height: 1.92,
    prop: { head: 0.134, neck: 0.038, spine: 0.274, thigh: 0.25, shin: 0.242, foot: 0.034, uarm: 0.178, farm: 0.154, hand: 0.068, chest: 0.148, waist: 0.112, hipW: 0.13, shoulderW: 0.25, limb: 0.03, leg: 0.042 },
    margin: 0.34, extraTop: 0.06,
    build(T) {
      const m = rig.mat, P = T.P, costume = T.o.costume || 'fight';
      const uni = costume === 'uniform';
      const cfg = uni
        ? { skin: m('skin'), top: m('black'), sleeve: 'long', pants: m('black'), legs: 'wide', shoe: m('black'), shoeStyle: 'shoe' }
        : { skin: m('skin'), top: m('black'), sleeve: 'short', pants: m('whiteCloth'), legs: 'baggy', shoe: m('black'), shoeStyle: 'slipper' };
      const hm = m('gojo_hair'), eye = { eyeMat: m('gojo_eye'), glow: true, browMat: hm };
      if (P.view === 'side') {
        const d = torsoFrame(T);
        if (costume === 'robe') robeSide(T, d, 'back');
        if (!uni) beltTails(T, d, m('black'));
        // far limbs
        armSide(T, 'fa', cfg, 1, -1);
        legSide(T, 'fl', cfg.pants, 3, -1, cfg.legs); footSide(T, 'fl', cfg.shoe, 3, -1, cfg.shoeStyle);
        // torso: tee tucked into the trousers (fight) / high-collar jacket (uniform)
        const { tp, wc, ww, wh, fw } = d;
        T.poly([tp(0.02, -wh * 1.12), tp(0.02, wh * 1.18), tp(0.4, ww * 1.05), tp(0.76, wc * 1.08), tp(0.96, wc * 0.74), tp(1.03, wc * 0.22), tp(1.03, -wc * 0.42), tp(0.9, -wc * 1.02), tp(0.48, -ww * 1.02)], cfg.top, 5, 0, -1, fw);
        // hips / waistband
        T.poly([tp(0.12, -wh * 1.2), tp(0.12, wh * 1.25), tp(-0.12, wh * 1.35), tp(-0.14, -wh * 1.3)], cfg.pants, 5, 0, -1, fw);
        if (!uni) T.poly([tp(0.16, -ww * 1.1), tp(0.16, ww * 1.14), tp(0.07, wh * 1.24), tp(0.07, -wh * 1.18)], m('black'), 6, 0, -1, fw); // belt
        else {
          T.poly([tp(0.94, wc * 0.6), tp(1.16, wc * 0.46), tp(1.17, -wc * 0.48), tp(0.93, -wc * 0.85)], cfg.top, 6, 0, -1, fw); // high collar
          if (T.lod >= 2) T.line(tp(0.98, wc * 0.72), tp(0.1, ww * 0.95), m('blackSoft'), 1, 6);
        }
        if (T.lod >= 2 && !uni) T.line(tp(0.62, wc * 0.9), tp(0.3, ww * 0.92), m('black'), 3, 6); // chest fold highlight
        legSide(T, 'nl', cfg.pants, 7, 0, cfg.legs); footSide(T, 'nl', cfg.shoe, 7, 0, cfg.shoeStyle);
        if (costume === 'robe') robeSide(T, d, 'front');
        const H = headFrame(T);
        headSide(T, H, cfg.skin);
        if (uni) sunglasses(T, H, false); else eyesSide(T, H, eye);
        mouthSide(T, H);
        hairSide(T, H, hm, GOJO_SPIKES, GOJO_BANGS);
        armSide(T, 'na', cfg, 13, 0);
        if (costume === 'robe') robeSide(T, d, 'sleeve');
      } else {
        const back = P.view === 'back';
        const fb = frontBody(T, Object.assign({}, cfg, costume === 'robe' ? { sleeve: 'wide', sleeveMat: m('robe') } : {}, {
          frontDetail(T2, tp, up, rt, d) {
            if (!uni) T2.poly([tp(0.16, -d.ww * 1.08), tp(0.16, d.ww * 1.08), tp(0.06, d.hw * 1.05), tp(0.06, -d.hw * 1.05)], m('black'), 6, 0, -1, rt);
            else { T2.poly([tp(0.94, -d.sw * 0.34), tp(1.15, -d.sw * 0.3), tp(1.15, d.sw * 0.3), tp(0.94, d.sw * 0.34)], cfg.top, 6, 0, -1, rt); if (!d.back && T2.lod >= 2) T2.line(tp(0.96, 0), tp(0.0, 0), m('blackSoft'), 1, 6); }
            if (costume === 'robe') {
              const rm = m('robe');
              if (d.back) T2.poly([tp(1.05, -d.sw * 0.95), tp(1.05, d.sw * 0.95), tp(-1.02, d.hw * 2.0), tp(-1.02, -d.hw * 2.0)], rm, 6, 0, -1, rt);
              else for (const s of [-1, 1]) T2.poly([tp(1.04, s * d.sw * 0.25), tp(1.0, s * d.sw * 1.05), tp(-1.0, s * d.hw * 1.9), tp(-1.02, s * d.hw * 0.4), tp(0.3, s * d.ww * 0.3)], rm, 6, 0, -1, rt);
              T2.ell(lerp2(T2.J.chest, T2.J.neck, 0.6), T2.prop.limb * 2.4, T2.prop.limb * 1.5, 0, m('scarf'), 12);
            }
          },
        }), back);
        const H = headFrame(T);
        headFront(T, H, cfg.skin, back);
        if (!back) { if (uni) sunglasses(T, H, true); else eyesFront(T, H, eye); }
        hairFront(T, H, hm, back, GOJO_FRONT_SPIKES, GOJO_FRONT_BANGS);
      }
    },
  });

  // ================================================================== RYOMEN SUKUNA (in Megumi Fushiguro's body)
  const SUK_SPIKES = [[-146, 0.22, 17], [-122, 0.4, 15], [-98, 0.34, 15], [-76, 0.56, 14], [-52, 0.48, 14], [-30, 0.62, 13], [-8, 0.46, 14], [16, 0.5, 14], [40, 0.3, 15], [62, 0.2, 15]];
  const SUK_BANGS = [[0.3, 0.22, 0.08], [0.16, 0.26, 0.06], [0.42, 0.14, 0.06]];
  const SUK_FRONT_SPIKES = [[-104, 0.26], [-78, 0.42], [-52, 0.52], [-26, 0.58], [0, 0.6], [26, 0.58], [52, 0.52], [78, 0.42], [104, 0.26]];
  const SUK_FRONT_BANGS = [[-0.22, 0.26], [-0.06, 0.32], [0.1, 0.3], [0.25, 0.24]];
  // canon marks (research: Sukuna wiki + anime frames of the two-armed host): forehead = a dot inside a V of two barbed
  // strokes pointing to the nose; a line across the nose bridge; jagged cheek bands from below the mouth corners up to
  // under the eyes; the lower (second) eyes under the normal ones, slightly smaller and set outward; neck dashes.
  function sukMarksSide(T, H) {
    const mk = rig.mat('mark'), z = 10, lod = T.lod, P = T.P;
    if (lod < 2) { if (lod === 1 && P.eyes2 === 'open') T.dot(H(0.28, -0.08), rig.mat('suk_eye'), 2, z); return; }
    if (P.eyes2 === 'open') { T.dot(H(0.26, -0.08), rig.mat('suk_eye'), 2, z, 2, 1); T.line(H(0.22, -0.05), H(0.36, -0.06), mk, 0, z); T.dot(H(0.47, -0.08), rig.mat('suk_eye'), 2, z); }
    else { T.line(H(0.23, -0.08), H(0.37, -0.09), mk, 0, z); T.dot(H(0.47, -0.08), mk, 0, z); }
    // near cheek band: a zigzag from below the mouth corner up toward the eye
    T.line(H(0.3, -0.42), H(0.22, -0.33), mk, 0, z); T.line(H(0.22, -0.33), H(0.3, -0.26), mk, 0, z); T.line(H(0.3, -0.26), H(0.24, -0.17), mk, 0, z);
    T.line(H(0.36, 0.36), H(0.44, 0.28), mk, 0, z); T.dot(H(0.4, 0.34), mk, 0, z);   // forehead V (profile: one barbed stroke + the dot)
    T.dot(H(0.47, 0.12), mk, 0, z, 1, 2);                                              // line across the nose bridge
    if (lod >= 3) for (const y of [-0.62, -0.72]) T.dot(H(0.1, y), mk, 0, z);          // neck dashes
  }
  function sukMarksFront(T, H) {
    const mk = rig.mat('mark'), z = 10, open2 = T.P.eyes2 === 'open';
    for (const s of [-1, 1]) {
      if (open2) { T.dot(H(s * 0.22 - 0.03, -0.08), rig.mat('suk_eye'), 2, z, 2, 1); T.line(H(s * 0.22 - 0.09, -0.05), H(s * 0.22 + 0.09, -0.05), mk, 0, z); }
      else T.line(H(s * 0.22 - 0.08, -0.08), H(s * 0.22 + 0.08, -0.09), mk, 0, z);
      // jagged cheek band: below the mouth corner → under the eye
      T.line(H(s * 0.16, -0.46), H(s * 0.26, -0.37), mk, 0, z); T.line(H(s * 0.26, -0.37), H(s * 0.22, -0.28), mk, 0, z); T.line(H(s * 0.22, -0.28), H(s * 0.31, -0.19), mk, 0, z);
    }
    // forehead: a V of two barbed strokes (point toward the nose) with a dot inside; the nose-bridge line
    T.line(H(-0.11, 0.38), H(0, 0.27), mk, 0, z); T.line(H(0.11, 0.38), H(0, 0.27), mk, 0, z);
    T.dot(H(-0.14, 0.35), mk, 0, z); T.dot(H(0.14, 0.35), mk, 0, z); T.dot(H(0, 0.34), mk, 0, z);
    T.line(H(-0.08, 0.12), H(0.08, 0.12), mk, 0, z);
    if (T.lod >= 3) for (const y of [-0.64, -0.74]) T.dot(H(0, y), mk, 0, z);        // neck dashes
  }
  // Sukuna's long black haori (rooftop only, ch. 221–222): back panel + far sleeve, near front panel, near sleeve
  function haoriSide(T, d, layer) {
    const J = T.J, hm = rig.mat('black'), sec = secOf(T, 'cloth'), wind = (T.o.sec && T.o.sec.wind) || 0;
    const { tp, fw, wc, ww, wh } = d, hem = -0.72;
    const sway = [sec[0] * 2.3 - wind * 0.03, sec[1] * 1.2];
    if (layer === 'back') {
      T.poly([tp(0.98, -wc * 0.2), tp(0.9, -wc * 1.15), tp(0.3, -ww * 1.3), add(tp(hem, -wh * 1.7), mul(sway, 1.0)), add(tp(hem - 0.02, wh * 1.0), mul(sway, 0.7)), tp(0.1, wh * 0.7)], hm, 4, -1, -1, fw);
      const s = J.faS, e = J.faE, w = J.faW;
      T.poly([lerp2(s, e, 0.1), lerp2(e, w, 0.45), add(add(lerp2(e, w, 0.5), [0, -0.13]), mul(sway, 0.8)), add(add(lerp2(s, e, 0.4), [0, -0.13]), mul(sway, 0.6))], hm, 2, -1, -1, [1, 0]);
    } else if (layer === 'front') {
      T.poly([tp(1.02, wc * 0.1), tp(0.96, wc * 0.62), tp(0.55, ww * 0.95), add(tp(hem + 0.04, wh * 1.2), mul(sway, 0.6)), add(tp(hem, -wh * 0.5), mul(sway, 0.8)), tp(0.2, -ww * 0.5), tp(0.86, -wc * 0.65)], hm, 8, 0, -1, fw);
    } else if (layer === 'sleeve') {
      const s = J.naS, e = J.naE, w = J.naW;
      T.poly([lerp2(s, e, 0.05), lerp2(e, w, 0.35), add(add(lerp2(e, w, 0.4), [0, -0.12]), mul(sway, 0.9)), add(add(lerp2(s, e, 0.45), [0, -0.13]), mul(sway, 0.7))], hm, 14, 0, -1, [1, 0]);
    }
  }
  rig.define({
    name: 'sukuna', height: 1.75,
    prop: { head: 0.142, neck: 0.038, spine: 0.28, thigh: 0.238, shin: 0.228, foot: 0.036, uarm: 0.172, farm: 0.146, hand: 0.07, chest: 0.15, waist: 0.118, hipW: 0.145, shoulderW: 0.25, limb: 0.032, leg: 0.045 },
    margin: 0.34, extraTop: 0.04,
    build(T) {
      const m = rig.mat, P = T.P, costume = T.o.costume || 'fight';
      const cfg = { skin: m('skin'), top: m('whiteCloth'), sleeve: 'none', pants: m('whiteCloth'), legs: 'wide', shoe: m('black'), shoeStyle: 'sandal', bands: true };
      const eye = { eyeMat: m('suk_eye'), glow: false };
      if (P.view === 'side') {
        const d = torsoFrame(T), { tp, wc, ww, wh, fw } = d;
        if (costume === 'haori') haoriSide(T, d, 'back');
        armSide(T, 'fa', cfg, 1, -1);
        legSide(T, 'fl', cfg.pants, 3, -1, cfg.legs); footSide(T, 'fl', cfg.shoe, 3, -1, 'sandal');
        // sleeveless kimono top: cross collar over a black undershirt, black belt
        T.poly([tp(0.02, -wh * 1.12), tp(0.02, wh * 1.18), tp(0.4, ww * 1.06), tp(0.76, wc * 1.08), tp(0.95, wc * 0.78), tp(1.02, wc * 0.3), tp(1.02, -wc * 0.42), tp(0.9, -wc * 1.02), tp(0.48, -ww * 1.02)], cfg.top, 5, 0, -1, fw);
        T.poly([tp(1.02, wc * 0.3), tp(0.94, wc * 0.72), tp(0.7, wc * 0.86), tp(0.99, wc * 0.1)], m('black'), 6, 0, -1, fw); // undershirt in the V
        if (T.lod >= 2) T.line(tp(0.98, wc * 0.62), tp(0.55, ww * 1.0), m('whiteCloth'), 1, 6);
        T.poly([tp(0.12, -wh * 1.2), tp(0.12, wh * 1.25), tp(-0.12, wh * 1.35), tp(-0.14, -wh * 1.3)], cfg.pants, 5, 0, -1, fw);
        T.poly([tp(0.2, -ww * 1.1), tp(0.2, ww * 1.14), tp(0.07, wh * 1.24), tp(0.07, -wh * 1.18)], m('black'), 6, 0, -1, fw); // belt
        legSide(T, 'nl', cfg.pants, 7, 0, cfg.legs); footSide(T, 'nl', cfg.shoe, 7, 0, 'sandal');
        if (costume === 'haori') haoriSide(T, d, 'front');
        const H = headFrame(T);
        headSide(T, H, cfg.skin);
        eyesSide(T, H, eye);
        sukMarksSide(T, H);
        mouthSide(T, H);
        hairSide(T, H, m('suk_hair'), SUK_SPIKES, SUK_BANGS, { sweep: -0.22 });
        armSide(T, 'na', cfg, 13, 0);
        if (costume === 'haori') haoriSide(T, d, 'sleeve');
      } else {
        const back = P.view === 'back';
        frontBody(T, Object.assign({}, cfg, costume === 'haori' ? { sleeve: 'wide', sleeveMat: m('black') } : {}, {
          frontDetail(T2, tp, up, rt, d) {
            if (!d.back) { T2.poly([tp(1.04, -d.sw * 0.28), tp(1.04, d.sw * 0.28), tp(0.55, d.ww * 0.1), tp(0.55, -d.ww * 0.1)], m('black'), 6, 0, -1, rt); if (T2.lod >= 2) { T2.line(tp(1.02, -d.sw * 0.3), tp(0.45, d.ww * 0.15), m('whiteCloth'), 1, 6); } }
            T2.poly([tp(0.2, -d.ww * 1.06), tp(0.2, d.ww * 1.06), tp(0.06, d.hw * 1.05), tp(0.06, -d.hw * 1.05)], m('black'), 6, 0, -1, rt);
            if (costume === 'haori') {
              if (d.back) T2.poly([tp(1.05, -d.sw * 0.95), tp(1.05, d.sw * 0.95), tp(-0.72, d.hw * 1.7), tp(-0.72, -d.hw * 1.7)], m('black'), 6, 0, -1, rt); // the haori covers the whole back
              else for (const s of [-1, 1]) T2.poly([tp(1.04, s * d.sw * 0.3), tp(1.0, s * d.sw * 1.05), tp(-0.7, s * d.hw * 1.6), tp(-0.7, s * d.hw * 0.5), tp(0.3, s * d.ww * 0.4)], m('black'), 6, 0, -1, rt);
            }
          },
        }), back);
        const H = headFrame(T);
        headFront(T, H, cfg.skin, back);
        if (!back) eyesFront(T, H, Object.assign({ marks: sukMarksFront }, eye));
        hairFront(T, H, m('suk_hair'), back, SUK_FRONT_SPIKES, SUK_FRONT_BANGS);
      }
    },
  });

  // ================================================================== generic silhouette figure (command-post allies, far figures)
  rig.define({
    name: 'figure', height: 1.72,
    build(T) {
      const m = rig.mat('sil'), P = T.P;
      const cfg = { skin: m, top: m, sleeve: 'long', pants: m, legs: 'normal', shoe: m };
      if (P.view === 'side') {
        const d = torsoFrame(T);
        armSide(T, 'fa', cfg, 1, -1); legSide(T, 'fl', m, 3, -1); footSide(T, 'fl', m, 3, -1);
        T.poly([d.tp(-0.1, -d.wh), d.tp(-0.1, d.wh), d.tp(0.8, d.wc), d.tp(1.03, d.wc * 0.3), d.tp(1.03, -d.wc * 0.4), d.tp(0.85, -d.wc)], m, 5, 0, -1, d.fw);
        legSide(T, 'nl', m, 7, 0); footSide(T, 'nl', m, 7, 0);
        const H = headFrame(T); T.ell(H(0.02, 0.02), 0.5 * T.prop.head, 0.52 * T.prop.head, T.J.headA, m, 9); armSide(T, 'na', cfg, 13, 0);
      } else { frontBody(T, cfg, P.view === 'back'); const H = headFrame(T); T.ell(H(0, 0.02), 0.46 * T.prop.head, 0.52 * T.prop.head, T.J.headA, m, 9); }
    },
  });

  rig.helpers = { hand, torsoFrame, legSide, footSide, armSide, headSide, eyesSide, mouthSide, hairSide, frontBody, eyesFront, hairFront, headFront, headFrame, add, sub, mul, lerp2, norm, perp, secOf };
})();
