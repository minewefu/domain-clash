/* DOMAIN CLASH — fighter rig: a 2D skeletal rig rendered by a tiny software rasterizer.

   Pipeline per drawing (a "drawing" = one pose at one time, animated on 2s = 12 drawings/s):
     pose (joint angles) → forward kinematics (side 3/4 view or front/back view) → parts rasterized into a
     G-buffer {material, tone, z-layer} with per-pixel cel shading (3–4 tones from a cylinder normal vs. the scene
     light) → resolve pass: palette colours, 1-px ink silhouette outline, selective inner lines where a nearer part
     overlaps a farther one, screen-space rim light on the lit edge → ImageData → canvas (cached in a small LRU).
   Secondary motion (hair spikes, cloth flaps) is a *stateless* damped spring: the displacement is the FIR convolution
   of the anchor's acceleration history with the spring's impulse response, evaluated from the pure pose function, so
   every frame stays a pure function of t (seekable, exportable). See SPEC.md §6. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const rig = (HT.rig = {});
  const D2R = Math.PI / 180;
  const clamp = HT.clamp, lerp = HT.lerp;
  const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, abs = Math.abs, floor = Math.floor, round = Math.round;

  // ------------------------------------------------------------------ colours → packed ABGR (canvas little-endian)
  const pack = hex => { const [r, g, b] = HT.rgb(hex); return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; };
  rig.pack = pack;

  // ------------------------------------------------------------------ materials
  // ramp: [deep, shadow, base, light] palette colours; line: inner-line colour; rim: rim-light colour (optional)
  const MATS = []; const MAT_ID = {};
  rig.material = (name, ramp, o = {}) => {
    let id = MAT_ID[name];
    if (id === undefined) { id = MATS.length + 1; MAT_ID[name] = id; }
    MATS[id] = { name, ramp: ramp.map(pack), hex: ramp.slice(), line: pack(o.line || ramp[0]), rim: o.rim ? pack(o.rim) : 0, flat: !!o.flat, glow: !!o.glow };
    return id;
  };
  rig.mat = name => { const id = MAT_ID[name]; if (id === undefined) throw new Error('unknown material ' + name); return id; };
  rig.MATS = MATS;

  // ------------------------------------------------------------------ G-buffer
  // One shared scratch buffer (grown on demand); each drawing is resolved into its own small canvas.
  const G = { w: 0, h: 0, mat: null, tone: null, z: null, cap: 0 };
  function gbuf(w, h) {
    const n = w * h;
    if (n > G.cap) { G.cap = Math.ceil(n * 1.25); G.mat = new Uint8Array(G.cap); G.tone = new Uint8Array(G.cap); G.z = new Uint8Array(G.cap); }
    G.w = w; G.h = h;
    G.mat.fill(0, 0, n); G.tone.fill(0, 0, n); G.z.fill(0, 0, n);
    return G;
  }
  // light for the current drawing (screen space; y down): L = normalised (lx, ly, lz)
  let LX = -0.5, LY = -0.55, LZ = 0.67, TH = [-0.1, 0.35, 0.78]; // tone thresholds: <TH0 deep, <TH1 shadow, <TH2 base, else light
  function setLight(l) {
    let x = l ? l[0] : -0.5, y = l ? l[1] : -0.55, z = l ? l[2] : 0.67;
    const n = Math.hypot(x, y, z) || 1; LX = x / n; LY = y / n; LZ = z / n;
  }
  const toneOf = I => (I < TH[0] ? 0 : I < TH[1] ? 1 : I < TH[2] ? 2 : 3);
  // write one pixel if its layer is >= the stored one
  function put(i, mat, tone, z) { if (z >= G.z[i]) { G.z[i] = z; G.mat[i] = mat; G.tone[i] = tone; } }

  // tapered capsule A→B (radius ra at A, rb at B). shade: 'cyl' (cylinder across the axis), 'flat' (tone fixed)
  // tone offset `dt` shifts all tones (far limbs −1).
  function capsule(ax, ay, bx, by, ra, rb, mat, z, dt = 0, flatTone = -1) {
    const minX = Math.max(0, floor(Math.min(ax - ra, bx - rb))), maxX = Math.min(G.w - 1, Math.ceil(Math.max(ax + ra, bx + rb)));
    const minY = Math.max(0, floor(Math.min(ay - ra, by - rb))), maxY = Math.min(G.h - 1, Math.ceil(Math.max(ay + ra, by + rb)));
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, L = sqrt(L2);
    const px = -dy / L, py = dx / L; // unit perpendicular
    const Lp = LX * px + LY * py;    // light component along the perpendicular
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      for (let x = minX; x <= maxX; x++) {
        const cx = x + 0.5;
        let u = ((cx - ax) * dx + (cy - ay) * dy) / L2; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const qx = ax + dx * u - cx, qy = ay + dy * u - cy;
        const r = ra + (rb - ra) * u, d2 = qx * qx + qy * qy;
        if (d2 > r * r) continue;
        let tone;
        if (flatTone >= 0) tone = flatTone;
        else {
          const v = -(qx * px + qy * py) / (r || 1); // signed lateral −1..1
          const I = v * Lp + sqrt(Math.max(0, 1 - v * v)) * LZ;
          tone = toneOf(I);
        }
        tone = clamp(tone + dt, 0, 3);
        put(y * G.w + x, mat, tone, z);
      }
    }
  }
  // polygon (any simple polygon), shading from a direction: tone by dot(normal-ish, light) using a horizontal gradient
  // across the polygon's bounding box along axis (ux, uy) (e.g. the torso's across-body axis). flatTone >= 0 → flat.
  function poly(pts, mat, z, dt = 0, flatTone = -1, axis) {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
    const y0 = Math.max(0, Math.ceil(minY - 0.5)), y1 = Math.min(G.h - 1, floor(maxY - 0.5));
    let ax = 1, ay = 0, c0 = 0, span = 1;
    if (axis) { ax = axis[0]; ay = axis[1]; const a = Math.hypot(ax, ay) || 1; ax /= a; ay /= a; }
    if (flatTone < 0) { // project bbox corners on the axis for normalisation
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) { const s = p[0] * ax + p[1] * ay; if (s < lo) lo = s; if (s > hi) hi = s; }
      c0 = (lo + hi) / 2; span = Math.max(1e-3, (hi - lo) / 2);
    }
    const Lp = LX * ax + LY * ay;
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) xs.push(xi + ((sy - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(xs[k] - 0.5)), b = Math.min(G.w - 1, floor(xs[k + 1] - 0.5));
        for (let x = a; x <= b; x++) {
          let tone;
          if (flatTone >= 0) tone = flatTone;
          else {
            const v = clamp(((x + 0.5) * ax + sy * ay - c0) / span, -1, 1);
            tone = toneOf(v * Lp + sqrt(1 - v * v) * LZ);
          }
          put(y * G.w + x, mat, clamp(tone + dt, 0, 3), z);
        }
      }
    }
  }
  function ellipse(cx, cy, rx, ry, rot, mat, z, dt = 0, flatTone = -1) {
    const R = Math.max(rx, ry) + 1;
    const x0 = Math.max(0, floor(cx - R)), x1 = Math.min(G.w - 1, Math.ceil(cx + R)), y0 = Math.max(0, floor(cy - R)), y1 = Math.min(G.h - 1, Math.ceil(cy + R));
    const cr = cos(rot), sr = sin(rot);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * cr + dy * sr) / rx, v = (-dx * sr + dy * cr) / ry, d = u * u + v * v;
      if (d > 1) continue;
      let tone;
      if (flatTone >= 0) tone = flatTone;
      else {
        const nx = (u * cr - v * sr), ny = (u * sr + v * cr), nz = sqrt(Math.max(0, 1 - d));
        tone = toneOf(nx * LX + ny * LY + nz * LZ);
      }
      put(y * G.w + x, mat, clamp(tone + dt, 0, 3), z);
    }
  }
  // 1-px (or w-px) line of a fixed tone (details: markings, finger strokes, folds)
  function line(x0, y0, x1, y1, mat, tone, z, w = 1) {
    x0 = floor(x0); y0 = floor(y0); x1 = floor(x1); y1 = floor(y1);
    const dx = abs(x1 - x0), dy = -abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    const o = floor((w - 1) / 2);
    for (;;) {
      for (let j = 0; j < w; j++) for (let i = 0; i < w; i++) { const X = x0 - o + i, Y = y0 - o + j; if (X >= 0 && Y >= 0 && X < G.w && Y < G.h) put(Y * G.w + X, mat, tone, z); }
      if ((x0 === x1 && y0 === y1) || ++n > 2000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function dot(x, y, mat, tone, z, w = 1, h = 1) {
    x = floor(x); y = floor(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < G.w && Y < G.h) put(Y * G.w + X, mat, tone, z); }
  }
  rig.raster = { capsule, poly, ellipse, line, dot, setLight, put, G };

  // ------------------------------------------------------------------ resolve: palette, outline, inner lines, rim light
  const INK = pack(C.ink);
  // mode: 0 normal, 1 flash (white), 2 silhouette (ink), 3 tint (fixed colour, keeps outline)
  function resolve(img, o) {
    const w = G.w, h = G.h, out = new Uint32Array(img.data.buffer);
    const mat = G.mat, tone = G.tone, z = G.z;
    const mode = o.mode || 0, tint = o.tint ? pack(o.tint) : 0, outline = o.outline === undefined ? INK : (o.outline ? pack(o.outline) : 0);
    const rimOn = o.rim !== false && mode === 0, rdx = o.rimDir ? o.rimDir[0] : 1, rdy = o.rimDir ? o.rimDir[1] : 0;
    const inner = o.inner !== false;
    const white = pack(C.white);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        const i = row + x, m = mat[i];
        if (!m) {
          // silhouette outline: an empty pixel with an opaque 4-neighbour
          if (outline && ((x > 0 && mat[i - 1]) || (x < w - 1 && mat[i + 1]) || (y > 0 && mat[i - w]) || (y < h - 1 && mat[i + w]))) out[i] = outline;
          else out[i] = 0;
          continue;
        }
        const M = MATS[m];
        if (mode === 1) { out[i] = white; continue; }
        if (mode === 2) { out[i] = INK; continue; }
        if (mode === 3) { out[i] = tint; continue; }
        let c = M.ramp[tone[i]];
        const zi = z[i];
        if (inner && !M.flat) {
          // inner line: a nearer part bordering a farther part (layer gap >= 2) gets its line colour on the border
          const zl = x > 0 && mat[i - 1] ? z[i - 1] : 255, zr = x < w - 1 && mat[i + 1] ? z[i + 1] : 255;
          const zu = y > 0 && mat[i - w] ? z[i - w] : 255, zd = y < h - 1 && mat[i + w] ? z[i + w] : 255;
          if ((zl !== 255 && zi - zl >= 2) || (zr !== 255 && zi - zr >= 2) || (zu !== 255 && zi - zu >= 2) || (zd !== 255 && zi - zd >= 2)) { out[i] = M.line; continue; }
        }
        if (rimOn && M.rim) {
          // rim light: lit-side edge pixel (empty neighbour in the rim direction)
          const ex = rdx > 0.3 ? (x < w - 1 ? !mat[i + 1] : true) : rdx < -0.3 ? (x > 0 ? !mat[i - 1] : true) : false;
          const ey = rdy > 0.3 ? (y < h - 1 ? !mat[i + w] : true) : rdy < -0.3 ? (y > 0 ? !mat[i - w] : true) : false;
          if (ex || ey) c = M.rim;
        }
        out[i] = c;
      }
    }
  }

  // ------------------------------------------------------------------ poses
  // Pose (degrees in the library; converted on use). Side view (3/4 profile facing +x):
  //   root [dx, dy] hip offset in body-heights; lean, neck, head (deg, + = forward); twist 0..1 (chest opens to camera)
  //   na/fa: near/far arm [shoulder, elbow, wrist]  (shoulder 0 = hanging, 90 = forward horizontal, 180 = straight up;
  //          elbow + = flex (forearm swings forward/up))
  //   nl/fl: near/far leg [hip, knee, ankle]  (hip + = thigh forward; knee + = bend; ankle + = toes up)
  //   nh/fh: hand shape 'fist' | 'open' | 'relaxed' | 'point' | 'two' | 'claw' | 'pocket' | 'flat' | 'sign'
  //   face: 'neutral' | 'smile' | 'grin' | 'grit' | 'open' | 'calm' | 'smirk' | 'shout'(teeth, no sound) ; eyes: 'open' | 'narrow' | 'closed' | 'wide' | 'glare'
  // Front view (view: 'front' or 'back'): na/fa become screen-left/right arms [abduct, elbow, wrist] (abduct + = away from
  //   the body, elbow + = forearm toward the midline); nl/fl legs [abduct, knee, ankle].
  const ZERO = { view: 'side', root: [0, 0], lean: 0, neck: 0, head: 0, twist: 0.35, na: [0, 0, 0], fa: [0, 0, 0], nl: [0, 0, 0], fl: [0, 0, 0], nh: 'relaxed', fh: 'relaxed', face: 'neutral', eyes: 'open' };
  rig.ZERO = ZERO;
  const lerpArr = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2] || 0, b[2] || 0, t)];
  rig.full = p => Object.assign({}, ZERO, p);
  rig.lerpPose = (a, b, t) => {
    if (t <= 0) return a; if (t >= 1) return b;
    const o = Object.assign({}, t < 0.5 ? a : b);
    o.root = [lerp(a.root[0], b.root[0], t), lerp(a.root[1], b.root[1], t)];
    o.lean = lerp(a.lean, b.lean, t); o.neck = lerp(a.neck, b.neck, t); o.head = lerp(a.head, b.head, t); o.twist = lerp(a.twist, b.twist, t);
    o.na = lerpArr(a.na, b.na, t); o.fa = lerpArr(a.fa, b.fa, t); o.nl = lerpArr(a.nl, b.nl, t); o.fl = lerpArr(a.fl, b.fl, t);
    if (a.view !== b.view) o.view = t < 0.5 ? a.view : b.view;
    if (a.hairLift !== undefined || b.hairLift !== undefined) o.hairLift = lerp(a.hairLift || 0, b.hairLift || 0, t);
    return o;
  };

  // ------------------------------------------------------------------ skeleton / forward kinematics
  // Proportions (fractions of the character height Hc). Characters override via spec.prop.
  const PROP = { foot: 0.036, shin: 0.235, thigh: 0.245, spine: 0.285, neck: 0.04, head: 0.13, uarm: 0.178, farm: 0.152, hand: 0.072,
    shoulderW: 0.24, hipW: 0.15, chest: 0.13, waist: 0.1, limb: 0.034, leg: 0.045 };
  rig.PROP = PROP;
  const dirv = a => [sin(a), -cos(a)]; // character space: x forward, y up; angle from straight down, + toward forward
  // returns joints in character space (units: body heights, origin at the feet point, y up)
  rig.fk = (P, prop) => {
    const pr = prop || PROP, J = {};
    const legLen = pr.thigh + pr.shin + pr.foot;
    const hip = [P.root[0], legLen + P.root[1]];
    J.hip = hip;
    if (P.view === 'side') {
      const L = P.lean * D2R;
      J.chest = [hip[0] + pr.spine * sin(L), hip[1] + pr.spine * cos(L)];
      J.mid = [hip[0] + pr.spine * 0.5 * sin(L), hip[1] + pr.spine * 0.5 * cos(L)];
      const N = L + P.neck * D2R;
      J.neck = [J.chest[0] + pr.neck * sin(N), J.chest[1] + pr.neck * cos(N)];
      J.headA = N + P.head * D2R;
      J.head = [J.neck[0] + pr.head * 0.5 * sin(J.headA), J.neck[1] + pr.head * 0.5 * cos(J.headA)];
      const tw = P.twist === undefined ? 0.35 : P.twist;
      // shoulders: near a little forward, far a little back (3/4 view); both just below the neck base
      const sh = (s) => { const off = s * (0.012 + 0.03 * tw); return [J.chest[0] + off * cos(L) - 0.02 * sin(L), J.chest[1] - off * sin(L) - 0.02 * cos(L)]; };
      const arm = (A, sgn, key) => {
        const s = sh(sgn), a1 = L + A[0] * D2R, a2 = a1 + A[1] * D2R, a3 = a2 + (A[2] || 0) * D2R;
        const e = [s[0] + pr.uarm * sin(a1), s[1] - pr.uarm * cos(a1)];
        const w = [e[0] + pr.farm * sin(a2), e[1] - pr.farm * cos(a2)];
        const h = [w[0] + pr.hand * 0.6 * sin(a3), w[1] - pr.hand * 0.6 * cos(a3)];
        J[key + 'S'] = s; J[key + 'E'] = e; J[key + 'W'] = w; J[key + 'H'] = h; J[key + 'A'] = [a1, a2, a3];
      };
      arm(P.na, 1, 'na'); arm(P.fa, -1, 'fa');
      const leg = (G2, sgn, key) => {
        const hp = [hip[0] + sgn * 0.012 * (0.5 + tw), hip[1] + sgn * 0.004];
        const a1 = G2[0] * D2R, a2 = a1 - G2[1] * D2R, a3 = a2 + Math.PI / 2 + (G2[2] || 0) * D2R;
        const k = [hp[0] + pr.thigh * sin(a1), hp[1] - pr.thigh * cos(a1)];
        const an = [k[0] + pr.shin * sin(a2), k[1] - pr.shin * cos(a2)];
        const toe = [an[0] + pr.foot * 2.3 * sin(a3), an[1] - pr.foot * 2.3 * cos(a3)];
        J[key + 'P'] = hp; J[key + 'K'] = k; J[key + 'A'] = an; J[key + 'T'] = toe; J[key + 'G'] = [a1, a2, a3];
      };
      leg(P.nl, 1, 'nl'); leg(P.fl, -1, 'fl');
    } else { // front / back: screen right = +x; na = screen-right arm (character's left when facing us)
      const L = P.lean * D2R; // side-bend
      J.chest = [hip[0] + pr.spine * sin(L), hip[1] + pr.spine * cos(L)];
      J.mid = [hip[0] + pr.spine * 0.5 * sin(L), hip[1] + pr.spine * 0.5 * cos(L)];
      const N = L + P.neck * D2R;
      J.neck = [J.chest[0] + pr.neck * sin(N), J.chest[1] + pr.neck * cos(N)];
      J.headA = N + P.head * D2R;
      J.head = [J.neck[0] + pr.head * 0.5 * sin(J.headA), J.neck[1] + pr.head * 0.5 * cos(J.headA)];
      const arm = (A, s, key) => {
        const sw = pr.shoulderW / 2;
        const S0 = [J.chest[0] + s * sw * cos(L) - 0.022 * sin(L), J.chest[1] - s * sw * sin(L) - 0.022 * cos(L)];
        const a1 = A[0] * D2R, a2 = a1 - A[1] * D2R, a3 = a2 - (A[2] || 0) * D2R;
        const e = [S0[0] + s * pr.uarm * sin(a1), S0[1] - pr.uarm * cos(a1)];
        const w = [e[0] + s * pr.farm * sin(a2), e[1] - pr.farm * cos(a2)];
        const h = [w[0] + s * pr.hand * 0.6 * sin(a3), w[1] - pr.hand * 0.6 * cos(a3)];
        J[key + 'S'] = S0; J[key + 'E'] = e; J[key + 'W'] = w; J[key + 'H'] = h; J[key + 'A'] = [a1, a2, a3];
      };
      arm(P.na, 1, 'na'); arm(P.fa, -1, 'fa');
      const leg = (G2, s, key) => {
        const hp = [hip[0] + s * pr.hipW * 0.36, hip[1]];
        const a1 = G2[0] * D2R, bend = G2[1] * D2R;
        // knee bend in the frontal view: thigh foreshortens a little and the knee pushes outward
        const th = pr.thigh * (1 - 0.25 * Math.min(1, bend / 1.6)), sh2 = pr.shin * (1 - 0.18 * Math.min(1, bend / 1.6));
        const k = [hp[0] + s * th * sin(a1 + bend * 0.25), hp[1] - th * cos(a1 + bend * 0.25)];
        const an = [k[0] + s * sh2 * sin(a1 - bend * 0.15), k[1] - sh2 * cos(a1 - bend * 0.15)];
        J[key + 'P'] = hp; J[key + 'K'] = k; J[key + 'A'] = an; J[key + 'T'] = [an[0] + s * 0.02, an[1] - pr.foot * 0.2]; J[key + 'G'] = [a1, a1 - bend, 0];
      };
      leg(P.nl, 1, 'nl'); leg(P.fl, -1, 'fl');
    }
    return J;
  };

  // ------------------------------------------------------------------ stateless springs (secondary motion)
  // Displacement of a damped spring (natural frequency f Hz, damping ratio zeta) whose anchor follows posFn(t) = [x, y]:
  // x(t) = −Σ_k Δv_k · h(k·dt), h(τ) = e^(−ζωτ) sin(ω_d τ) / ω_d  (response to the velocity changes of the anchor).
  const hCache = new Map();
  function kernel(f, zeta, n, dt) {
    const key = f + '|' + zeta + '|' + n + '|' + dt;
    let k = hCache.get(key);
    if (k) return k;
    const w = 2 * Math.PI * f, wd = w * sqrt(Math.max(1e-4, 1 - zeta * zeta));
    k = new Float32Array(n);
    for (let i = 0; i < n; i++) { const tau = (i + 0.5) * dt; k[i] = Math.exp(-zeta * w * tau) * sin(wd * tau) / wd; }
    hCache.set(key, k);
    return k;
  }
  rig.spring = (posFn, t, f = 2.2, zeta = 0.3, win = 0.9, dt = 1 / 30) => {
    const n = Math.max(2, Math.round(win / dt));
    const K = kernel(f, zeta, n, dt);
    let sx = 0, sy = 0;
    let p0 = posFn(t), p1 = posFn(t - dt), p2;
    let v0x = (p0[0] - p1[0]) / dt, v0y = (p0[1] - p1[1]) / dt;
    for (let i = 0; i < n; i++) {
      p2 = posFn(t - (i + 2) * dt);
      const v1x = (p1[0] - p2[0]) / dt, v1y = (p1[1] - p2[1]) / dt;
      sx -= (v0x - v1x) * K[i]; sy -= (v0y - v1y) * K[i];
      v0x = v1x; v0y = v1y; p1 = p2;
    }
    return [sx, sy];
  };

  // ------------------------------------------------------------------ characters registry
  // spec: { name, height (m), prop (overrides), mats (names), build(ctx) } — see chars.js
  const CHARS = (rig.CHARS = {});
  rig.define = spec => { CHARS[spec.name] = spec; return spec; };

  // ------------------------------------------------------------------ drawing
  // rig.render(name, P, px, o) → { canvas, ox, oy } with (ox, oy) = the feet point inside the canvas.
  //   P   full pose (rig.full), px = on-screen height in pixels for the character's full height
  //   o   { face: +1 right / −1 left, light: [lx, ly, lz], rimDir: [dx, dy], mode: 'normal'|'flash'|'ink'|'tint', tint,
  //         sec: secondary-motion values from rig.secondary(), t (for idle flutter), key (cache key or null) }
  const drawCache = HT.lru(48);
  HT.caches.push({ name: 'rig drawings', size: () => drawCache.size });
  const MODES = { normal: 0, flash: 1, ink: 2, tint: 3 };
  rig.render = (name, P, px, o = {}) => {
    const spec = CHARS[name];
    if (!spec) throw new Error('rig: unknown character ' + name);
    const key = o.key ? name + '|' + o.key + '|' + px + '|' + (o.face || 1) + '|' + (o.mode || 'n') + '|' + (o.tint || '') + '|' + (o.light ? o.light.join(',') : '') + '|' + (o.costume || '') : null;
    if (key) { const hit = drawCache.get(key); if (hit) return hit; }
    const prop = spec.propFull || (spec.propFull = Object.assign({}, PROP, spec.prop || {}));
    const J = rig.fk(P, prop);
    const S = px; // px per body-height
    // bounds (character space → pixels) with generous margins for hair, cloth and weapons
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const k in J) { const v = J[k]; if (!Array.isArray(v) || typeof v[0] !== 'number' || v.length !== 2) continue; if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0]; if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1]; }
    const m = (spec.margin || 0.22);
    minX -= m; maxX += m; minY -= 0.06; maxY += m + (spec.extraTop || 0);
    const face = o.face || 1;
    const W2 = Math.ceil((maxX - minX) * S) + 4, H2 = Math.ceil((maxY - minY) * S) + 4;
    gbuf(W2, H2);
    setLight(o.light);
    // character space (x fwd, y up) → buffer pixels; mirror for facing left
    const ox = face > 0 ? round(-minX * S) + 2 : round(maxX * S) + 2, oy = round(maxY * S) + 2;
    const X = v => ox + face * v * S, Y = v => oy - v * S;
    const T = { J, S, X, Y, P, face, prop, spec, o, px, lod: px < 30 ? 0 : px < 70 ? 1 : px < 140 ? 2 : 3,
      cap: (a, b, ra, rb, mat, z, dt, ft) => capsule(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), ra * S, rb * S, mat, z, dt, ft),
      poly: (pts, mat, z, dt, ft, axis) => poly(pts.map(p => [X(p[0]), Y(p[1])]), mat, z, dt, ft, axis ? [axis[0] * face, -axis[1]] : [face, 0]),
      ell: (c, rx, ry, rot, mat, z, dt, ft) => ellipse(X(c[0]), Y(c[1]), rx * S, ry * S, -rot * face, mat, z, dt, ft),
      line: (a, b, mat, tone, z, w) => line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), mat, tone, z, w),
      dot: (a, mat, tone, z, w, h) => dot(face > 0 ? X(a[0]) : X(a[0]) - (w || 1) + 1, Y(a[1]), mat, tone, z, w, h),
      raster: rig.raster,
    };
    spec.build(T);
    const cv = HT.canvas(W2, H2);
    const img = cv.g.createImageData(W2, H2);
    resolve(img, { mode: MODES[o.mode || 'normal'] || 0, tint: o.tint, rimDir: o.rimDir ? [o.rimDir[0], o.rimDir[1]] : [-LX, -LY], outline: o.outline, inner: o.inner });
    cv.g.putImageData(img, 0, 0);
    const res = { canvas: cv.c, ox, oy, w: W2, h: H2, J, S, face };
    if (key) drawCache.set(key, res);
    return res;
  };
  // draw a character with its feet at screen (x, y)
  rig.draw = (ctx, name, x, y, P, px, o = {}) => {
    const r = rig.render(name, P, Math.max(4, round(px)), o);
    const a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0) return r;
    if (a < 1) { const oa = ctx.globalAlpha; ctx.globalAlpha = oa * a; ctx.drawImage(r.canvas, round(x) - r.ox, round(y) - r.oy); ctx.globalAlpha = oa; }
    else ctx.drawImage(r.canvas, round(x) - r.ox, round(y) - r.oy);
    return r;
  };
  // screen position of a joint of a rendered drawing (for FX attachment)
  rig.jointScreen = (r, x, y, joint) => {
    const v = r.J[joint]; if (!v) return [x, y];
    return [round(x) - r.ox + r.ox + r.face * v[0] * r.S, round(y) - r.oy + r.oy - v[1] * r.S];
  };
})();
