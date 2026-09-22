/* DOMAIN CLASH — Act VI extras (The World-Cutting Slash, canon ch. 236): an env preset, act poses, and the act's FX.
   Loads after props.js and before manga/busts/fight. Additive only (uniquely named); staging comes from HT.A5
   (act5_extra.js: the erasure, Sukuna's spot in the crater SUK_C, Gojo's spot on the rim G_RIM).

     HT.ENVS.a6dusk   after sunset over the erasure: rose band on the horizon → purple → indigo, dusky fog, snow
     poses           a6_* (airport: Gojo front wave / laugh, Geto seated front laugh, Geto seated back view, Gojo back
                     view looking up; Sukuna (side view only): the calm swipe, the farewell hand, the look back)
     FX notchWheel   x, y (screen), r (px rim radius), from (deg), turnAt (age), glow, in/out (s) — the golden wheel
                     alone in the dark, its last notch turning (outBack overshoot + glint), fading in and out
     FX hairline     x, y, angle (rad), a (alpha), dur — a faint line across the whole frame (foreshadowing the cut)
     FX scarfFall    x0 (screen start x), y0, yLand, dur, land (s: when it settles), sway (px), len (px) — Gojo's dark
                     scarf (the rig's 'scarf' material: ink / navy / indigo) drifting down through white like a
                     falling leaf and settling into the snow, where flakes gather on it
     FX snowLine     y (screen horizon), a — a faint snowy ground appearing in the white (a pale dithered floor)
     FX kashimoBolt  from, to (world, ground), travel (s), w (px) — a crackle of blue-white lightning racing along the
                     ground far away (Kashimo coming), re-jagged on 2s, with sparks at the head
     FX cameo        char ('figure'), at, pose, face, tint, h (m), alpha — a background cameo figure drawn as a soft
                     tinted silhouette (Toji, Riko Amanai, Misato Kuroi at the airport), optionally walking (to, t0, t1) */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, rig = HT.rig;
  const FX = (HT.FX = HT.FX || {});
  const U = () => HT.fxu;
  const sat = x => (x < 0 ? 0 : x > 1 ? 1 : x), floor = Math.floor, R = Math.round, hash = HT.hash;
  const max = Math.max, min = Math.min, sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2, abs = Math.abs;
  const pj = (S, p) => (Array.isArray(p) ? S.project(p[0], p[1], p[2] || 0) : null);

  // ================================================================== env: dusk over the erasure
  if (HT.ENVS && !HT.ENVS.a6dusk) HT.ENVS.a6dusk = {
    sky: [[0, C.rose], [0.05, C.berry], [0.16, C.purple], [0.36, C.indigo], [0.7, C.navy], [1, C.ink]],
    fog: C.dusk, fogNear: 30, fogFar: 900, fogMax: 0.85, grade: [60, 50, 90], gradeK: 0.3, sun: [-0.9, 0.3, 0.03],
    lit: 0.06, skyline: C.shadow, amb: 0.5, snowCol: '#b8b8d8', ground: [0.95, 0.95, 1.05],
  };
  (HT.bootTasks = HT.bootTasks || []).push({ name: 'a6 dusk light', fn: () => { if (HT.fight && HT.fight.LIGHTS && !HT.fight.LIGHTS.a6dusk) HT.fight.LIGHTS.a6dusk = { light: [-0.6, -0.35, 0.6], rim: C.lavender }; } });

  // ================================================================== poses
  HT.onPoses.push(rg => {
    const PO = rg.POSES;
    const def = (name, o, base) => { PO[name] = rg.full(Object.assign({}, base ? PO[base] : {}, o)); return PO[name]; };
    // the airport (front views face the camera at the glass; back views for the hold toward the window). Only the coda
    // cast (chars_shiki: geto, nanami, haibara, yaga) draws P.sit in front/back views — Gojo stands.
    def('a6_gojoFrontWave', { view: 'front', lean: 0, head: -2, na: [138, 40, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'pocket', face: 'smile' });
    def('a6_gojoFrontLaughA', { view: 'front', lean: 2, neck: -4, head: -10, na: [16, 54, 0], fa: [16, 54, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket', face: 'grin', eyes: 'closed' });
    def('a6_gojoFrontLaughB', { root: [0, -0.008], lean: -1, neck: 0, head: -4 }, 'a6_gojoFrontLaughA');
    def('a6_getoSitFrontLaughA', { view: 'front', sit: true, root: [0, -0.25], lean: -2, neck: -4, head: -8, na: [16, 36, 0], fa: [16, 36, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'closed' });
    def('a6_getoSitFrontLaughB', { root: [0, -0.256], lean: 1, neck: 0, head: -2 }, 'a6_getoSitFrontLaughA');
    def('a6_getoBackSit', { view: 'back', sit: true, root: [0, -0.25], na: [16, 30, 0], fa: [16, 30, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'relaxed', fh: 'relaxed' });
    def('a6_gojoBackUp', { view: 'back', lean: 0, neck: -6, head: -8, na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket' });
    // Sukuna's calm swipe (side view facing right: the hand before the chest, then drawn out and up — the line it draws
    // rises to the right like the film's cut); no back views for him (see sukunaBare in act5_extra.js)
    def('a6_sukHand', { root: [0, 0], lean: -2, neck: -2, head: 0, twist: 0.45, na: [74, 96, 0], fa: [-14, 66, 0], nl: [5, 3, 0], fl: [-7, 2, 0], nh: 'flat', fh: 'none', eyes: 'narrow', face: 'neutral' });
    def('a6_sukSwipeEnd', { root: [0.01, 0], lean: 4, neck: 0, head: 2, twist: 0.75, na: [116, 2, 4], fa: [-14, 66, 0], nl: [9, 6, 0], fl: [-8, 3, 0], nh: 'flat', fh: 'none', eyes: 'narrow', face: 'neutral' });
    // the farewell (side view facing right, the far arm hidden): the right hand raised, open, forearm up
    def('a6_sukSalute', { root: [0, 0], lean: -3, neck: -4, head: -2, twist: 0.5, na: [84, 64, 0], fa: [-14, 66, 0], nl: [5, 3, 0], fl: [-7, 2, 0], nh: 'open', fh: 'none', eyes: 'narrow', face: 'neutral' });
    def('a6_sukLookBack', { root: [0, 0], lean: -3, neck: -8, head: -6, twist: 0.3, na: [6, 12, 0], fa: [-14, 66, 0], nl: [4, 3, 0], fl: [-6, 2, 0], nh: 'relaxed', fh: 'none', eyes: 'narrow', face: 'neutral' });
    rg.MOVES.a6_sukSwipe = { name: 'a6_sukSwipe', keys: [[0, 'a6_sukHand'], [6, 'a6_sukHand'], [10, 'a6_sukSwipeEnd'], [40, 'a6_sukSwipeEnd']], contact: 10, startup: 10, active: 30, recovery: 0, len: 40, root: [[0, 0]], smear: { limb: 'na', from: 6, to: 10 }, sfx: {} };
  });

  // ================================================================== FX: notchWheel (the golden wheel alone in the dark)
  const notchAngle = (from, turnAt, age) => { // one notch = 45°, outBack overshoot + a damped wobble (as fx.js 'wheel')
    let a = from, glint = -1;
    const x = age - turnAt;
    if (x >= 0) { a += 45 * (x < 0.14 ? HT.E.outBack(x / 0.14) : 1 + 0.035 * sin((x - 0.14) * 40) * Math.exp(-(x - 0.14) * 16)); if (x < 0.14) glint = x / 0.14; }
    return { a, glint };
  };
  FX.notchWheel = {
    dur: 10, layer: 'front',
    draw(ctx, age, e, S) {
      if (!HT.shiki || !HT.shiki.wheel) return;
      const u = U(), k = (e.in ? sat(age / e.in) : 1) * (e.out ? sat((e.dur - age) / e.out) : 1);
      if (k <= 0.01) return;
      const tq = floor(age * 30) / 30, na = notchAngle(e.from || 135, e.turnAt === undefined ? 5 : e.turnAt, tq), x = e.x === undefined ? W / 2 : e.x, y = e.y === undefined ? H / 2 : e.y, r = e.r || 70;
      const gl = (e.glow || 0) + (na.glint >= 0 ? 0.6 * (1 - na.glint) : 0);
      if (gl > 0.05) u.glow(ctx, x, y, r * 1.7, C.gold, 0.25 * gl * k);
      HT.shiki.wheel(ctx, x, y, r, Math.round(na.a * 2) / 2, { glow: Math.min(1, gl), light: [-0.45, -0.6, 0.66] });
      if (k < 0.99) { const m = u.dcol(C.ink, 1 - k); if (m) { ctx.fillStyle = m; ctx.fillRect(R(x - r * 1.8), R(y - r * 1.8), R(r * 3.6), R(r * 3.6)); } } // a dithered dissolve out of the dark
      if (na.glint >= 0) { const g2 = na.glint, a = (g2 * 360 - 60) * PI / 180; u.sparkle(ctx, x + cos(a) * r * 1.02, y + sin(a) * r * 1.02, g2 < 0.5 ? 4 : 3, C.white, C.butter); u.sparkle(ctx, x, y, 3, C.white, null); }
    },
  };

  // ================================================================== FX: hairline (a faint line across the frame)
  FX.hairline = {
    dur: 0.5, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(), x = e.x === undefined ? W / 2 : e.x, y = e.y === undefined ? H / 2 : e.y, a = e.angle === undefined ? -0.38 : e.angle;
      const k = (e.a === undefined ? 0.5 : e.a) * sin(PI * sat(age / e.dur)), L = Math.hypot(W, H), ux = cos(a), uy = sin(a);
      if (k > 0.02) u.line(ctx, x - ux * L, y - uy * L, x + ux * L, y + uy * L, u.dcol(e.col || C.ice, k));
    },
  };

  // ================================================================== FX: scarfFall (Gojo's scarf drifting down, settling in the snow)
  // screen space. The scarf is a ribbon of n segments whose centre line follows a falling-leaf path (pendulum sway with
  // lift at the ends of each swing), its body waving; on landing it relaxes into a gentle S on the snow.
  const SCARF = [C.ink, C.navy, C.indigo, C.blue]; // the rig material 'scarf' ramp
  FX.scarfFall = {
    dur: 8, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(), n = 22, len = e.len || 150, wid = e.w || 9, T = e.land || e.dur * 0.75, x0 = e.x0 === undefined ? W * 0.44 : e.x0, y0 = e.y0 === undefined ? -40 : e.y0, yL = e.yLand || H * 0.78;
      const q = sat(age / T), settle = sat((age - T) / 0.9), sw = e.sway || 70;
      // falling leaf: the swing phase advances; the drop is slower at the ends of each swing (lift)
      const ph = age * 1.15, sx = sin(ph) * sw * (1 - 0.7 * q), yy = y0 + (yL - y0) * (q - 0.035 * sin(ph * 2) * (1 - q)), tilt = cos(ph) * 0.55 * (1 - q) + 0.08;
      const cx = x0 + sx + 30 * q, cy = min(yL, yy);
      const P = [], Q = [];
      for (let i = 0; i <= n; i++) {
        const s = i / n - 0.5, flutter = (1 - settle) * sin(age * 5.2 + i * 0.55) * 7 * (0.4 + abs(s)), rest = settle * sin(s * 5 + 0.6) * 5;
        const along = s * len, ca = cos(tilt * (1 - settle)), sa = sin(tilt * (1 - settle));
        const x = cx + along * ca - (flutter + rest) * sa * 0.3, y = cy + along * sa * (1 - settle) + (flutter + rest) * ca * (1 - settle * 0.8) - settle * 2;
        const w = wid * (0.85 + 0.15 * cos(age * 3 + i)) * (1 - 0.35 * settle * abs(s));
        const nx = -sa, ny = ca;
        const lieY = settle * sin(s * 5.5 + 1.1) * 4; // lying in the snow: a soft S seen from a low angle (foreshortened)
        P.push([x + nx * w * 0.5, y + lieY + ny * w * 0.5 * (1 - settle * 0.45)]); Q.push([x - nx * w * 0.5, y + lieY - ny * w * 0.5 * (1 - settle * 0.45)]);
      }
      const poly = P.concat(Q.slice().reverse());
      if (settle > 0) HT.alpha(ctx, 0.25 * settle, () => HT.poly(ctx, poly.map(p => [p[0] + 1, p[1] + 3]), C.lilacgrey)); // its shadow in the snow
      HT.poly(ctx, poly, SCARF[1]);
      for (let i = 0; i < n; i++) { // lit / shaded bands across the twisting ribbon (the twist = the sign of the flutter slope)
        const f = sin(age * 5.2 + i * 0.55) * (1 - settle), col = f > 0.45 ? SCARF[3] : f > 0 ? SCARF[2] : f < -0.5 ? SCARF[0] : SCARF[1];
        HT.poly(ctx, [P[i], P[i + 1], Q[i + 1], Q[i]], col);
      }
      for (const end of [0, n]) { // fringe at both ends
        const a = P[end], b = Q[end], dx = (end ? 1 : -1);
        for (let k2 = 0; k2 <= 4; k2++) { const fx = a[0] + (b[0] - a[0]) * k2 / 4, fy = a[1] + (b[1] - a[1]) * k2 / 4; HT.line(ctx, fx, fy, fx + dx * 5, fy + 2 + (1 - settle) * sin(age * 7 + k2) * 2, SCARF[0]); }
      }
      if (settle > 0.5) for (let i = 0; i < 9; i++) { const t0 = T + 1 + i * 0.35; if (age < t0) continue; const s = hash(i, 5) - 0.5, j = floor((s + 0.5) * n); const p = P[Math.max(0, Math.min(n, j))]; u.sq(ctx, p[0] + hash(i, 6) * 6 - 3, p[1] + 1 + hash(i, 7) * 3, 1, C.white); }
    },
  };

  // ================================================================== FX: snowLine (a faint snowy floor in the white)
  FX.snowLine = {
    dur: 10, layer: 'behind',
    draw(ctx, age, e, S) {
      const u = U(), y = e.y === undefined ? R(H * 0.72) : e.y, k = (e.in ? sat(age / e.in) : 1) * (e.a === undefined ? 1 : e.a);
      if (k <= 0.02) return;
      u.line(ctx, 0, y, W, y, u.dcol(C.lilacgrey, 0.3 * k));
      for (let i = 0; i < 26; i++) { const x = hash(i, 11) * W, yy = y + 3 + Math.pow(hash(i, 12), 2) * (H - y - 3); u.sq(ctx, x, yy, 1, u.dcol(C.mist, 0.8 * k)); } // a few drift shadows
    },
  };

  // ================================================================== FX: kashimoBolt (lightning racing along the ground, far away)
  FX.kashimoBolt = {
    dur: 3, layer: 'front',
    draw(ctx, age, e, S) {
      const u = U(), A = e.from, B = e.to; if (!A || !B) return;
      const tr = e.travel || e.dur, q = sat(age / tr), fq = floor(age * 12), seed = (e.seed | 0) + fq * 131, rng = HT.rng(seed);
      const hx = A[0] + (B[0] - A[0]) * q, hy = A[1] + (B[1] - A[1]) * q;
      const ph = pj(S, [hx, hy, 0.8]); if (!ph) return;
      const tailQ = Math.max(0, q - 0.18), tx = A[0] + (B[0] - A[0]) * tailQ, ty = A[1] + (B[1] - A[1]) * tailQ, pt = pj(S, [tx, ty, 0.4]);
      if (pt) { // the crackling trail on the ground
        const P = u.bolt(pt.x, pt.y, ph.x, ph.y, 0.45, 4, rng);
        u.boltDraw(ctx, P, 1, e.w || 2, C.sky); u.polyline(ctx, P, C.white);
        const P2 = u.bolt(pt.x, pt.y - 2, ph.x, ph.y - 1, 0.6, 3, rng); u.polyline(ctx, P2, u.dcol(C.ice, 0.7));
      }
      u.glow(ctx, ph.x, ph.y, 12, C.sky, 0.6); u.sparkle(ctx, ph.x, ph.y, fq % 2 ? 4 : 3, C.white, C.ice);
      for (let i = 0; i < 4; i++) { const a = rng() * TAU, L = 5 + rng() * 9; u.polyline(ctx, u.bolt(ph.x, ph.y, ph.x + cos(a) * L, ph.y + sin(a) * L * 0.6 - 2, 0.7, 2, rng), i % 2 ? C.ice : C.white); }
    },
  };

  // ================================================================== FX: cameo (a soft tinted background figure)
  FX.cameo = {
    dur: 40, layer: 'behind',
    draw(ctx, age, e, S) {
      let at = e.at;
      if (e.to) { const t = e.t + age, u2 = sat((t - (e.t0 === undefined ? e.t : e.t0)) / max(0.01, (e.t1 === undefined ? e.t + e.dur : e.t1) - (e.t0 === undefined ? e.t : e.t0))); at = [at[0] + (e.to[0] - at[0]) * u2, at[1] + (e.to[1] - at[1]) * u2, at[2] || 0]; }
      const p = pj(S, at); if (!p) return;
      const ch = e.char || 'figure', hM = e.h || (rig.CHARS[ch] || { height: 1.8 }).height, px = max(6, R(hM * p.s));
      let P = rig.POSES[e.pose || 'stand'] || rig.POSES.stand;
      if (e.to && e.walk !== false) { const d = Math.hypot(e.to[0] - e.at[0], e.to[1] - e.at[1]), t = e.t + age, u2 = sat((t - (e.t0 === undefined ? e.t : e.t0)) / max(0.01, (e.t1 === undefined ? e.t + e.dur : e.t1) - (e.t0 === undefined ? e.t : e.t0))); if (u2 > 0 && u2 < 1) P = rig.walk(((d * u2) / 1.45 + floor(age * 12) * 0) % 1); }
      const face = e.face || 1, a = e.alpha === undefined ? 0.85 : e.alpha;
      rig.draw(ctx, ch, p.x, p.y, P, px, { face, light: [-0.6, -0.4, 0.7], mode: 'tint', tint: e.tint || C.rosewood, alpha: a, costume: e.costume, key: 'cameo|' + ch + '|' + (e.pose || '') + '|' + floor(age * 6) });
    },
  };
})();
