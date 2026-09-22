/* DOMAIN CLASH — close-ups: character busts, extreme close-ups of the eyes, hand close-ups (SPEC.md §10).

   API
   HT.busts.draw(ctx, who, x, y, o) → r          who: 'gojo' | 'sukuna' | 'geto' | 'mahoraga'; (x, y) = bottom-centre anchor
     o.size     px height of the bust (160–220 typical; 120 and 260 supported). Mahoraga's wheel extends above it.
     o.face     +1 looks right / −1 looks left (3/4 view facing that way);  o.turn 0 = 3/4 … 1 = frontal (continuous)
     o.expr     neutral smirk grin serious strain exhausted smile laugh shock calm contempt   (HT.busts.EXPRS)
     o.eyes     open narrow closed wide glow;  o.eyes2 'closed'|'open' or o.open2 0..1 (Sukuna's lower eyes)
     o.look     [-1..1, -1..1] gaze (screen x, y);  o.costume gojo: fight|robe|uniform · sukuna: fight|haori
     o.bleed 0..1 (nosebleed line length) · o.sweat 0..1 · o.hurt 0..1 (scuffs only) · o.rct 0..1 · o.steam 0..1
     o.light    [lx, ly, lz] key light toward the light, screen space (y down); default [-0.5, -0.55, 0.67]
     o.rim      rim-light colour (e.g. C.ice); o.rimDir [dx, dy] (default: opposite the key light)
     o.tint     [colour, 0..1] mood tint as a value-preserving palette swap;  o.mono  manga values (ink/dusk/steel/white)
     o.t        seconds (hair sway, blink, breath; quantized to 12 drawings/s); o.wind [dx, dy]; o.idle flutter;
                o.blink false / o.breath false to hold still; o.nod / o.roll / o.yaw (deg) extra head pose;
                o.notch 0..8 + o.wheel (rad) Mahoraga's wheel; o.glasses false (Gojo uniform); o.alpha
     r = { canvas, ox, oy, W, H, s (px per head unit), anchors: { head, eyes: [[x,y],[x,y]], mouth, nose } } — anchors
         are canvas px: screen = (x − r.ox + ax, y − r.oy + ay)
   HT.busts.render(who, o) → r (cached; no overlays)
   HT.busts.eyes(ctx, who, x, y, w, o)   extreme close-up of the eye band, centred on (x, y), w px wide (full-res render,
                                         not an upscale); same o (default turn 1); o.open2 reveals Sukuna's lower eyes
   HT.busts.hands(ctx, who, sign, x, y, size, o)   signs: void shrine purple point two fist open (HT.busts.SIGNS);
                                         (x, y) bottom-centre, size = px height; o.phase 0..1 (purple), o.face ±1
   Labs: ?lab=busts[&who=] ?lab=bust&who=&expr=&face=&turn=&size=&scale= ?lab=eyes ?lab=hands ?lab=bustfx ?lab=bustperf
   Debug: o.debug = 'pid' | 'sh' | 'spec' (part ids, cast shadows, strand highlight)

   METHOD (sources in the M0 report / PROGRESS.md):
   * A tiny software cel renderer. Each character is a set of low-poly 3D proxies (lofted head with superellipse cross
     sections and a far-cheek "corner bump", nose, ears, neck, torso, arm capsules, hair locks as tapered tubes, clothing
     pieces) rasterized into a G-buffer (depth, part id, material, N·L, hair sheen) — Guilty Gear Xrd's approach to
     "2D-looking 3D" (Motomura, GDC 2015): a stepped threshold on N·L per material, per-part/per-vertex threshold bias
     painted like occlusion (neck under the jaw, lock roots), hand-edited normals (hair locks blended toward the hair-mass
     normal, the face's front plane flattened), and a light vector chosen per shot.
   * Cast shadows (fringe on the forehead, jaw on the neck, head on the chest) come from a small shadow map in the light's
     frame, hard-edged like anime cel shadows.
   * Resolve pass in pixel-art terms: 1-px ink silhouette with selective outline (lighter on the lit side), inner lines
     where a nearer part overlaps a farther one (hair clumps only near their tips, jaw over neck, arm over torso) in the
     part's own dark shade (never black inside), rim light along the silhouette.
   * Hair: every lock is its own part with a Kajiya-Kay strand term (1-(T·H)^2)^(p/2) (Scheuermann 2004) plus a
     camera-relative "angel ring" band broken into one zig-zag stroke per clump (black hair).
   * Faces are drawn in pixel space on top: eyes, brows, lashes, nose tip, mouth, markings are hand-shaped pixel clusters
     at points projected from the 3D head, so 3/4 foreshortening (far eye narrower, same height) and occlusion by hair
     come for free; brows read through the fringe (anime convention); extreme close-ups switch to a high-detail painter.
     Acting follows FACS action units (contempt/smirk = unilateral lip corner, surprise = raised curved brows + wide lids,
     strain = lowered knit brows + tightened lids + clenched teeth, anger presses the inner upper lid down).
   * Two cached stages: BASE (geometry → G-buffer → resolve) and FEATURES (face on a copy), so blinks, gaze, eye states and
     the second-eyes reveal re-run only the cheap stage. Everything is a pure function of the parameters (seeded, no
     state); animated inputs are quantized to 12 drawings/s; caches are HT.lru (40 drawings, 6 bases). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const B = (HT.busts = HT.busts || {});
  const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, abs = Math.abs, floor = Math.floor, ceil = Math.ceil;
  const round = Math.round, min = Math.min, max = Math.max, PI = Math.PI, pow = Math.pow;
  const D2R = PI / 180;
  const clamp = HT.clamp, lerp = HT.lerp;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------------ colours
  const pk = hex => { const [r, g, b] = HT.rgb(hex); return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; };
  const K = {}; for (const n in C) K[n] = pk(C[n]);   // packed palette colours by name
  const unpk = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
  const PALP = HT.PAL.map(pk);
  const lumOf = c => { const [r, g, b] = unpk(c); return (r * 0.299 + g * 0.587 + b * 0.114) / 255; };
  // mood tint as a palette swap: each colour moves toward the mood colour but keeps its value (luminance), choosing the
  // palette entry closest to the tinted target with a strong penalty on luminance change (crisp, no dither noise)
  const tintLUT = new Map();
  function tintOf(c, tint, amt) {
    const key = c + '|' + tint + '|' + amt;
    let v = tintLUT.get(key);
    if (v !== undefined) return v;
    const [r, g, b] = unpk(c), [tr, tg, tb] = HT.rgb(tint), l0 = lumOf(c);
    const R = r + (tr - r) * amt, G = g + (tg - g) * amt, Bc = b + (tb - b) * amt;
    let best = 1e9; v = c;
    for (let i = 0; i < 64; i++) {
      const [pr, pg, pb] = unpk(PALP[i]), dl = lumOf(PALP[i]) - l0;
      const d = ((pr - R) ** 2 * 0.3 + (pg - G) ** 2 * 0.59 + (pb - Bc) ** 2 * 0.11) / 65025 + 3.5 * dl * dl;
      if (d < best) { best = d; v = PALP[i]; }
    }
    if (tintLUT.size > 30000) tintLUT.clear();
    tintLUT.set(key, v);
    return v;
  }
  // mono (manga) value map: every colour → ink / dusk / steel / white by luminance (materials may override)
  function monoOf(c) {
    if (!c) return 0;
    const l = lumOf(c);
    return l < 0.2 ? K.ink : l < 0.42 ? K.dusk : l < 0.7 ? K.steel : K.white;
  }

  // ------------------------------------------------------------------ vectors & matrices (3x4, row-major)
  const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const vlen = a => Math.hypot(a[0], a[1], a[2]);
  const vnorm = a => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vlerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const bez2 = (a, c, b, t) => { const u = 1 - t, k0 = u * u, k1 = 2 * u * t, k2 = t * t; return [a[0] * k0 + c[0] * k1 + b[0] * k2, a[1] * k0 + c[1] * k1 + b[1] * k2, a[2] * k0 + c[2] * k1 + b[2] * k2]; };
  const bez3 = (a, b, c, d, t) => { const u = 1 - t, k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t; return [a[0] * k0 + b[0] * k1 + c[0] * k2 + d[0] * k3, a[1] * k0 + b[1] * k1 + c[1] * k2 + d[1] * k3, (a[2] || 0) * k0 + (b[2] || 0) * k1 + (c[2] || 0) * k2 + (d[2] || 0) * k3]; };
  const sph = (az, el) => { const a = az * D2R, e = el * D2R; return [sin(a) * cos(e), sin(e), cos(a) * cos(e)]; }; // az 0 = front (+z), +90 = +x
  const mId = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const mMul = (A, Bm) => {
    const r = new Array(12);
    for (let i = 0; i < 3; i++) {
      const a0 = A[i * 4], a1 = A[i * 4 + 1], a2 = A[i * 4 + 2];
      r[i * 4] = a0 * Bm[0] + a1 * Bm[4] + a2 * Bm[8];
      r[i * 4 + 1] = a0 * Bm[1] + a1 * Bm[5] + a2 * Bm[9];
      r[i * 4 + 2] = a0 * Bm[2] + a1 * Bm[6] + a2 * Bm[10];
      r[i * 4 + 3] = a0 * Bm[3] + a1 * Bm[7] + a2 * Bm[11] + A[i * 4 + 3];
    }
    return r;
  };
  const mChain = (...ms) => ms.reduce((a, b) => mMul(a, b));
  const mRotY = a => { const c = cos(a), s = sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; };  // + = turn right
  const mRotX = a => { const c = cos(a), s = sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; }; // + = nod down
  const mRotZ = a => { const c = cos(a), s = sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0]; };  // + = top tilts right
  const mTr = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z];
  const mAbout = (M, p) => mChain(mTr(p[0], p[1], p[2]), M, mTr(-p[0], -p[1], -p[2]));
  const mP = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2] + M[3], M[4] * p[0] + M[5] * p[1] + M[6] * p[2] + M[7], M[8] * p[0] + M[9] * p[1] + M[10] * p[2] + M[11]];
  const mN = (M, n) => [M[0] * n[0] + M[1] * n[1] + M[2] * n[2], M[4] * n[0] + M[5] * n[1] + M[6] * n[2], M[8] * n[0] + M[9] * n[1] + M[10] * n[2]];

  // ------------------------------------------------------------------ materials
  // ramp [deep, shade, base, light]; th = thresholds on N·L(+bias) between the 4 tones; line/lineLit = inner-line
  // colours (shadow / lit side, "sel-out"), out/outLit = silhouette outline; hi = strand highlight colour (hiTh > 0);
  // shCap = N·L ceiling inside cast shadows; mono = manga ramp.
  function mat(o) {
    const r = o.ramp.map(pk);
    return {
      ramp: r, th: o.th || [-0.45, 0.02, 0.72], line: pk(o.line || o.ramp[0]), lineLit: pk(o.lineLit || o.line || o.ramp[0]),
      out: pk(o.out || C.ink), outLit: pk(o.outLit || o.out || C.ink), hi: pk(o.hi || o.ramp[3]), hiTh: o.hiTh || 0, hi2: o.hi2 ? pk(o.hi2) : 0,
      shCap: o.shCap === undefined ? -0.1 : o.shCap, rim: o.rim !== false, lines: o.lines !== false, edge: o.edge || 0, lineD: o.lineD || 0,
      mono: (o.mono || null) && o.mono.map(pk), monoLine: o.monoLine ? pk(o.monoLine) : 0, monoHi: o.monoHi ? pk(o.monoHi) : 0,
      ring: o.ring || null, ringCol: o.ringCol ? pk(o.ringCol) : 0,
    };
  }

  // ------------------------------------------------------------------ G-buffer + shadow map (shared scratch, grown on demand)
  const GB = { w: 0, h: 0, n: 0, cap: 0 };
  function gbuf(w, h) {
    const n = w * h;
    if (n > GB.cap) {
      const cap = ceil(n * 1.2);
      GB.cap = cap;
      GB.depth = new Float32Array(cap); GB.pid = new Uint16Array(cap); GB.mat = new Uint8Array(cap);
      GB.lam = new Float32Array(cap); GB.nx = new Float32Array(cap); GB.ny = new Float32Array(cap);
      GB.spec = new Float32Array(cap); GB.sh = new Uint8Array(cap); GB.tone = new Uint8Array(cap); GB.lk = new Uint8Array(cap);
    }
    GB.w = w; GB.h = h; GB.n = n;
    GB.depth.fill(-1e9, 0, n); GB.pid.fill(0, 0, n); GB.mat.fill(0, 0, n); GB.sh.fill(0, 0, n); GB.spec.fill(0, 0, n);
    return GB;
  }
  const SM = { w: 0, h: 0, n: 0, cap: 0 };
  function smbuf(w, h) {
    const n = w * h;
    if (n > SM.cap) { SM.cap = ceil(n * 1.2); SM.depth = new Float32Array(SM.cap); SM.grp = new Uint8Array(SM.cap); }
    SM.w = w; SM.h = h; SM.n = n;
    SM.depth.fill(-1e9, 0, n); SM.grp.fill(0, 0, n);
    return SM;
  }

  // ------------------------------------------------------------------ meshes
  // mesh = {P (object xyz), N (object normals), I (triangles), T (tangents|null), BV (per-vertex bias|null), pid, grp,
  //         mat, matFn(x,y,z)→mat|0 (object-space material function, 0 = discard), bias, cull, cast, M (transform)}
  function mkMesh(P, N, I, o) {
    return Object.assign({ P, N, I, T: null, BV: null, pid: 1, grp: 1, mat: 1, matFn: null, bias: 0, cull: true, cast: true, M: null, skin: null }, o || {});
  }
  // grid of rings: rows[r][k] = [x,y,z]; k wraps around. Smooth normals from central differences, oriented away from
  // the ring centroid (tiny end rings: away from the neighbouring ring).
  function gridMesh(rows, o, extra) {
    const R = rows.length, Kn = rows[0].length;
    const nv = R * Kn;
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3);
    for (let r = 0; r < R; r++) for (let k = 0; k < Kn; k++) { const p = rows[r][k], i = (r * Kn + k) * 3; P[i] = p[0]; P[i + 1] = p[1]; P[i + 2] = p[2]; }
    for (let r = 0; r < R; r++) {
      let cx = 0, cy = 0, cz = 0, rad = 0;
      for (let k = 0; k < Kn; k++) { const i = (r * Kn + k) * 3; cx += P[i]; cy += P[i + 1]; cz += P[i + 2]; }
      cx /= Kn; cy /= Kn; cz /= Kn;
      for (let k = 0; k < Kn; k++) { const i = (r * Kn + k) * 3; rad = max(rad, Math.hypot(P[i] - cx, P[i + 1] - cy, P[i + 2] - cz)); }
      const r0 = max(0, r - 1), r1 = min(R - 1, r + 1);
      const tiny = rad < 1e-3;
      let ax = 0, ay = 0, az = 0;
      if (tiny) { // direction away from the neighbouring ring
        const rn = r === 0 ? 1 : r - 1;
        let nx = 0, ny = 0, nz = 0;
        for (let k = 0; k < Kn; k++) { const i = (rn * Kn + k) * 3; nx += P[i]; ny += P[i + 1]; nz += P[i + 2]; }
        ax = cx - nx / Kn; ay = cy - ny / Kn; az = cz - nz / Kn;
        const l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
      }
      for (let k = 0; k < Kn; k++) {
        const i = (r * Kn + k) * 3;
        if (tiny) { N[i] = ax; N[i + 1] = ay; N[i + 2] = az; continue; }
        const k0 = (k - 1 + Kn) % Kn, k1 = (k + 1) % Kn;
        const ia = (r * Kn + k1) * 3, ib = (r * Kn + k0) * 3, ic = (r1 * Kn + k) * 3, id = (r0 * Kn + k) * 3;
        const ux = P[ia] - P[ib], uy = P[ia + 1] - P[ib + 1], uz = P[ia + 2] - P[ib + 2];
        const vx = P[ic] - P[id], vy = P[ic + 1] - P[id + 1], vz = P[ic + 2] - P[id + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (nx * (P[i] - cx) + ny * (P[i + 1] - cy) + nz * (P[i + 2] - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const l = Math.hypot(nx, ny, nz) || 1; N[i] = nx / l; N[i + 1] = ny / l; N[i + 2] = nz / l;
      }
    }
    const I = new Uint16Array((R - 1) * Kn * 6);
    let t = 0;
    for (let r = 0; r < R - 1; r++) for (let k = 0; k < Kn; k++) {
      const a = r * Kn + k, b = r * Kn + (k + 1) % Kn, c = (r + 1) * Kn + (k + 1) % Kn, d = (r + 1) * Kn + k;
      I[t++] = a; I[t++] = b; I[t++] = c; I[t++] = a; I[t++] = c; I[t++] = d;
    }
    const m = mkMesh(P, N, I, o);
    if (extra) extra(m, R, Kn);
    return m;
  }
  // tube along a spine (typed arrays, analytic elliptical normals): width/thickness radii per station; `ref` orients the
  // thickness axis (e.g. the scalp normal so a hair lock lies flat on the head). Per-vertex tangents for the strand
  // highlight. Index buffers are shared per (stations, segments).
  const tubeIdx = new Map(), trig = new Map();
  function tubeMesh(pts, rw, rt, segs, ref, o) {
    const S = pts.length, nv = S * segs;
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), Tn = new Float32Array(nv * 3);
    let tg = trig.get(segs);
    if (!tg) { tg = { c: new Float32Array(segs), s: new Float32Array(segs) }; for (let k = 0; k < segs; k++) { tg.c[k] = cos((k / segs) * 2 * PI); tg.s[k] = sin((k / segs) * 2 * PI); } trig.set(segs, tg); }
    const perStation = Array.isArray(ref[0]);
    for (let i = 0; i < S; i++) {
      const pa = pts[i > 0 ? i - 1 : 0], pb = pts[i < S - 1 ? i + 1 : S - 1], pi = pts[i];
      let tx = pb[0] - pa[0], ty = pb[1] - pa[1], tz = pb[2] - pa[2];
      const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      const rf = perStation ? ref[i] : ref;
      let wx = ty * rf[2] - tz * rf[1], wy = tz * rf[0] - tx * rf[2], wz = tx * rf[1] - ty * rf[0];
      let wl = Math.hypot(wx, wy, wz);
      if (wl < 1e-5) { wx = ty; wy = -tx; wz = 0; wl = Math.hypot(wx, wy, wz); if (wl < 1e-5) { wx = 0; wy = tz; wz = -ty; wl = Math.hypot(wx, wy, wz) || 1; } }
      wx /= wl; wy /= wl; wz /= wl;
      const hx = wy * tz - wz * ty, hy = wz * tx - wx * tz, hz = wx * ty - wy * tx;
      const ra = rw[i], rb = rt[i], ia = 1 / max(1e-4, ra), ib = 1 / max(1e-4, rb);
      for (let k = 0; k < segs; k++) {
        const ca = tg.c[k], sa = tg.s[k], j = (i * segs + k) * 3;
        P[j] = pi[0] + wx * ra * ca + hx * rb * sa; P[j + 1] = pi[1] + wy * ra * ca + hy * rb * sa; P[j + 2] = pi[2] + wz * ra * ca + hz * rb * sa;
        let nx = wx * ca * ia + hx * sa * ib, ny = wy * ca * ia + hy * sa * ib, nz = wz * ca * ia + hz * sa * ib;
        const nl = Math.hypot(nx, ny, nz) || 1; N[j] = nx / nl; N[j + 1] = ny / nl; N[j + 2] = nz / nl;
        Tn[j] = tx; Tn[j + 1] = ty; Tn[j + 2] = tz;
      }
    }
    const ik = S * 1000 + segs;
    let I = tubeIdx.get(ik);
    if (!I) {
      I = new Uint16Array((S - 1) * segs * 6);
      let t = 0;
      for (let r = 0; r < S - 1; r++) for (let k = 0; k < segs; k++) {
        const a = r * segs + k, b = r * segs + (k + 1) % segs, c = (r + 1) * segs + (k + 1) % segs, d = (r + 1) * segs + k;
        I[t++] = a; I[t++] = b; I[t++] = c; I[t++] = a; I[t++] = c; I[t++] = d;
      }
      tubeIdx.set(ik, I);
    }
    const m = mkMesh(P, N, I, o);
    m.T = Tn;
    return m;
  }
  // capsule / round-ended tube from A to B (radii ra → rb), optional hemispherical caps
  function capsuleMesh(A, Bp, ra, rb, segs, o, capA = true, capB = true, ref = [0, 0, 1], mid = 3) {
    const T = vnorm(vsub(Bp, A)), L = vlen(vsub(Bp, A));
    const pts = [], rw = [];
    const nc = 4;
    if (capA) for (let k = nc; k >= 1; k--) { const th = (k / nc) * PI / 2; pts.push(vadd(A, vmul(T, -ra * sin(th)))); rw.push(ra * cos(th)); }
    for (let k = 0; k <= mid; k++) { const u = k / mid; pts.push(vadd(A, vmul(T, L * u))); rw.push(lerp(ra, rb, u)); }
    if (capB) for (let k = 1; k <= nc; k++) { const th = (k / nc) * PI / 2; pts.push(vadd(Bp, vmul(T, rb * sin(th)))); rw.push(rb * cos(th)); }
    return tubeMesh(pts, rw, rw, segs, ref, o);
  }
  // ellipsoid (centre c, radii r, rotation R 3x4 or null)
  function ellipsoidMesh(c, r, R, nu, nv, o) {
    const rows = [];
    for (let i = 0; i <= nv; i++) {
      const lat = -PI / 2 + PI * (0.02 + 0.96 * i / nv), ring = [];
      for (let k = 0; k < nu; k++) {
        const lon = (k / nu) * 2 * PI;
        let p = [cos(lat) * sin(lon) * r[0], sin(lat) * r[1], cos(lat) * cos(lon) * r[2]];
        if (R) p = mN(R, p);
        ring.push([c[0] + p[0], c[1] + p[1], c[2] + p[2]]);
      }
      rows.push(ring);
    }
    return gridMesh(rows, o);
  }

  // ------------------------------------------------------------------ head profile (lofted superellipse sections)
  // rows: [y, W half-width, zc (z at the widest point), zf front z, zb back z, nF front superellipse exponent]
  function profile(rows, dense = 64) {
    const R = rows.length, tab = [];
    const cr = (p0, p1, p2, p3, t) => 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
    for (let i = 0; i < dense; i++) {
      const u = (i / (dense - 1)) * (R - 1), j = min(R - 2, floor(u)), t = u - j;
      const r0 = rows[max(0, j - 1)], r1 = rows[j], r2 = rows[j + 1], r3 = rows[min(R - 1, j + 2)];
      const v = []; for (let c = 0; c < 7; c++) v.push(cr(r0[c] || 0, r1[c] || 0, r2[c] || 0, r3[c] || 0, t));
      v[1] = max(0.004, v[1]);
      tab.push(v);
    }
    const at = y => { // tab is ordered by decreasing y
      if (y >= tab[0][0]) return tab[0];
      if (y <= tab[dense - 1][0]) return tab[dense - 1];
      let lo = 0, hi = dense - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m][0] >= y) lo = m; else hi = m; }
      const a = tab[lo], b = tab[hi], t = (a[0] - y) / (a[0] - b[0] || 1);
      return [y, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t), lerp(a[4], b[4], t), lerp(a[5], b[5], t), lerp(a[6], b[6], t)];
    };
    return { tab, at, top: tab[0][0], bot: tab[dense - 1][0] };
  }
  // section point at angle a (0 = front, +90° = +x). Front half: superellipse; back half: ellipse. p[6] = "corner bump"
  // pushes the front-side corner (a ≈ ±45°) out/in: brow bone +, eye socket −, cheekbone + (the far-cheek contour of a
  // 3/4 view: brow bump → socket dip → cheek bulge → jaw).
  function secPt(p, a, grow = 0) {
    const s = sin(a), c = cos(a), W = p[1] + grow;
    if (c >= 0) {
      const e = 2 / p[5], s2 = sin(2 * a), cb = 1 + (p[6] || 0) * s2 * s2;
      return [W * Math.sign(s) * pow(abs(s), e) * cb, p[2] + (p[3] + grow - p[2]) * pow(c, e) * cb];
    }
    return [W * s, p[2] + (p[4] - grow - p[2]) * (-c)];
  }
  function surfZ(prof, x, y) { // front surface z of the head at (x, y)
    const p = prof.at(y), W = p[1];
    const u = min(0.999, abs(x) / W);
    return p[2] + (p[3] - p[2]) * pow(1 - pow(u, p[5]), 1 / p[5]);
  }
  function headRings(prof, nRings, nSeg, grow = 0, y0 = null, y1 = null, fn = null) {
    const rows = [];
    const top = y0 === null ? prof.top : y0, bot = y1 === null ? prof.bot : y1;
    for (let r = 0; r < nRings; r++) {
      const y = lerp(top, bot, r / (nRings - 1)), p = prof.at(y), ring = [];
      for (let k = 0; k < nSeg; k++) {
        const a = (k / nSeg) * 2 * PI, q = secPt(p, a, grow);
        let pt = [q[0], y + (r === 0 ? grow * 0.8 : r === nRings - 1 && y1 === null ? -grow * 0.3 : 0), q[1]];
        if (fn) pt = fn(pt, a, r);
        ring.push(pt);
      }
      rows.push(ring);
    }
    return rows;
  }

  // ------------------------------------------------------------------ transform + rasterization
  const RS = { s: 1, ox: 0, oy: 0, L: [0, 0, 1], U: [1, 0, 0], V: [0, 1, 0], su0: 0, sv0: 0, smS: 1 };
  function xform(m) { // object → world (m.M, or linear-blend skin m.skin = {MA, MB, w(y)})
    const n = m.P.length / 3;
    const WP = new Float32Array(n * 3), WN = new Float32Array(n * 3);
    const WT = m.T ? new Float32Array(n * 3) : null;
    const P = m.P, N = m.N, T = m.T;
    if (m.skin) {
      const { MA, MB, w } = m.skin;
      for (let i = 0; i < n; i++) {
        const j = i * 3, p = [P[j], P[j + 1], P[j + 2]], q = [N[j], N[j + 1], N[j + 2]];
        const k = w(p[1]), a = mP(MA, p), b = mP(MB, p), na = mN(MA, q), nb = mN(MB, q);
        WP[j] = lerp(b[0], a[0], k); WP[j + 1] = lerp(b[1], a[1], k); WP[j + 2] = lerp(b[2], a[2], k);
        const nn = vnorm([lerp(nb[0], na[0], k), lerp(nb[1], na[1], k), lerp(nb[2], na[2], k)]);
        WN[j] = nn[0]; WN[j + 1] = nn[1]; WN[j + 2] = nn[2];
      }
    } else {
      const M = m.M || mId();
      for (let i = 0; i < n; i++) {
        const j = i * 3, x = P[j], y = P[j + 1], z = P[j + 2];
        WP[j] = M[0] * x + M[1] * y + M[2] * z + M[3]; WP[j + 1] = M[4] * x + M[5] * y + M[6] * z + M[7]; WP[j + 2] = M[8] * x + M[9] * y + M[10] * z + M[11];
        const a = N[j], b = N[j + 1], c = N[j + 2];
        WN[j] = M[0] * a + M[1] * b + M[2] * c; WN[j + 1] = M[4] * a + M[5] * b + M[6] * c; WN[j + 2] = M[8] * a + M[9] * b + M[10] * c;
        if (WT) { const d = T[j], e = T[j + 1], f = T[j + 2]; WT[j] = M[0] * d + M[1] * e + M[2] * f; WT[j + 1] = M[4] * d + M[5] * e + M[6] * f; WT[j + 2] = M[8] * d + M[9] * e + M[10] * f; }
      }
    }
    m.WP = WP; m.WN = WN; m.WT = WT;
  }
  // main pass: screen projection (orthographic), depth = world z (larger = nearer)
  function rasterMain(m, H) {
    const n = m.WP.length / 3, s = RS.s, ox = RS.ox, oy = RS.oy, WP = m.WP;
    const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
    for (let i = 0; i < n; i++) { X[i] = ox + WP[i * 3] * s; Y[i] = oy - WP[i * 3 + 1] * s; Z[i] = WP[i * 3 + 2]; }
    const w = GB.w, h = GB.h, dep = GB.depth, pidB = GB.pid, matB = GB.mat, lamB = GB.lam, nxB = GB.nx, nyB = GB.ny, spB = GB.spec;
    const N = m.WN, I = m.I, O = m.P, TT = m.WT, BV = m.BV, LV = m.LV, lkB = GB.lk, fn = m.matFn, pid = m.pid, mat0 = m.mat, bias = m.bias || 0, cull = m.cull;
    const lx = RS.L[0], ly = RS.L[1], lz = RS.L[2];
    const hx = H[0], hy = H[1], hz = H[2], sp = m.specShift || 0, spPow = m.specPow || 40;
    for (let t = 0, nt = I.length; t < nt; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2], a3 = a * 3, b3 = b * 3, c3 = c * 3;
      if (cull && N[a3 + 2] < -0.2 && N[b3 + 2] < -0.2 && N[c3 + 2] < -0.2) continue;
      const ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx = X[c], cy = Y[c];
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (area > -1e-7 && area < 1e-7) continue;
      const x0 = max(0, floor(min(ax, bx, cx))), x1 = min(w - 1, ceil(max(ax, bx, cx)));
      const y0 = max(0, floor(min(ay, by, cy))), y1 = min(h - 1, ceil(max(ay, by, cy)));
      if (x0 > x1 || y0 > y1) continue;
      const inv = 1 / area;
      const w0dx = -(cy - by) * inv, w0dy = (cx - bx) * inv, w1dx = -(ay - cy) * inv, w1dy = (ax - cx) * inv, w2dx = -(by - ay) * inv, w2dy = (bx - ax) * inv;
      const px0 = x0 + 0.5, py0 = y0 + 0.5;
      let w0r = ((cx - bx) * (py0 - by) - (cy - by) * (px0 - bx)) * inv;
      let w1r = ((ax - cx) * (py0 - cy) - (ay - cy) * (px0 - cx)) * inv;
      let w2r = ((bx - ax) * (py0 - ay) - (by - ay) * (px0 - ax)) * inv;
      const za = Z[a], zb = Z[b], zc = Z[c];
      for (let y = y0; y <= y1; y++, w0r += w0dy, w1r += w1dy, w2r += w2dy) {
        let w0 = w0r, w1 = w1r, w2 = w2r, i = y * w + x0;
        for (let x = x0; x <= x1; x++, i++, w0 += w0dx, w1 += w1dx, w2 += w2dx) {
          if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
          const z = w0 * za + w1 * zb + w2 * zc;
          if (z <= dep[i]) continue;
          let mt = mat0;
          if (fn) {
            mt = fn(w0 * O[a3] + w1 * O[b3] + w2 * O[c3], w0 * O[a3 + 1] + w1 * O[b3 + 1] + w2 * O[c3 + 1], w0 * O[a3 + 2] + w1 * O[b3 + 2] + w2 * O[c3 + 2]);
            if (!mt) continue;
          }
          let nx = w0 * N[a3] + w1 * N[b3] + w2 * N[c3], ny = w0 * N[a3 + 1] + w1 * N[b3 + 1] + w2 * N[c3 + 1], nz = w0 * N[a3 + 2] + w1 * N[b3 + 2] + w2 * N[c3 + 2];
          const nl = 1 / sqrt(nx * nx + ny * ny + nz * nz + 1e-12); nx *= nl; ny *= nl; nz *= nl;
          dep[i] = z; pidB[i] = pid; matB[i] = mt;
          lkB[i] = LV ? (w0 * LV[a] + w1 * LV[b] + w2 * LV[c] > 0.5 ? 1 : 0) : 1;
          let bb = bias; if (BV) bb += w0 * BV[a] + w1 * BV[b] + w2 * BV[c];
          lamB[i] = nx * lx + ny * ly + nz * lz + bb;
          nxB[i] = nx; nyB[i] = ny;
          if (TT) { // Kajiya-Kay strand highlight with a shifted tangent T' = T + s·N
            let tx = w0 * TT[a3] + w1 * TT[b3] + w2 * TT[c3] + sp * nx, ty = w0 * TT[a3 + 1] + w1 * TT[b3 + 1] + w2 * TT[c3 + 1] + sp * ny, tz = w0 * TT[a3 + 2] + w1 * TT[b3 + 2] + w2 * TT[c3 + 2] + sp * nz;
            const tl = 1 / sqrt(tx * tx + ty * ty + tz * tz + 1e-12);
            const th = (tx * hx + ty * hy + tz * hz) * tl;
            const q2 = 1 - th * th;
            spB[i] = q2 > 0.8 ? pow(q2, spPow * 0.5) : 0;
          } else spB[i] = 0;
        }
      }
    }
  }
  // shadow pass: depth toward the light (larger = nearer the light), group id of the nearest caster
  function rasterShadow(m) {
    if (!m.cast) return;
    const n = m.WP.length / 3, WP = m.WP, U = RS.U, V = RS.V, L = RS.L, s = RS.smS, u0 = RS.su0, v0 = RS.sv0;
    const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = WP[i * 3], y = WP[i * 3 + 1], z = WP[i * 3 + 2];
      X[i] = u0 + (x * U[0] + y * U[1] + z * U[2]) * s; Y[i] = v0 - (x * V[0] + y * V[1] + z * V[2]) * s; Z[i] = x * L[0] + y * L[1] + z * L[2];
    }
    const w = SM.w, h = SM.h, dep = SM.depth, grpB = SM.grp, I = m.I, grp = m.grp, fn = m.matFn, O = m.P;
    for (let t = 0, nt = I.length; t < nt; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const ax = X[a], ay = Y[a], bx = X[b], by = Y[b], cx = X[c], cy = Y[c];
      const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (area > -1e-7 && area < 1e-7) continue;
      const x0 = max(0, floor(min(ax, bx, cx))), x1 = min(w - 1, ceil(max(ax, bx, cx)));
      const y0 = max(0, floor(min(ay, by, cy))), y1 = min(h - 1, ceil(max(ay, by, cy)));
      if (x0 > x1 || y0 > y1) continue;
      const inv = 1 / area;
      const w0dx = -(cy - by) * inv, w0dy = (cx - bx) * inv, w1dx = -(ay - cy) * inv, w1dy = (ax - cx) * inv, w2dx = -(by - ay) * inv, w2dy = (bx - ax) * inv;
      const px0 = x0 + 0.5, py0 = y0 + 0.5;
      let w0r = ((cx - bx) * (py0 - by) - (cy - by) * (px0 - bx)) * inv;
      let w1r = ((ax - cx) * (py0 - cy) - (ay - cy) * (px0 - cx)) * inv;
      let w2r = ((bx - ax) * (py0 - ay) - (by - ay) * (px0 - ax)) * inv;
      const za = Z[a], zb = Z[b], zc = Z[c], a3 = a * 3, b3 = b * 3, c3 = c * 3;
      for (let y = y0; y <= y1; y++, w0r += w0dy, w1r += w1dy, w2r += w2dy) {
        let w0 = w0r, w1 = w1r, w2 = w2r, i = y * w + x0;
        for (let x = x0; x <= x1; x++, i++, w0 += w0dx, w1 += w1dx, w2 += w2dx) {
          if (w0 < -1e-5 || w1 < -1e-5 || w2 < -1e-5) continue;
          const z = w0 * za + w1 * zb + w2 * zc;
          if (z <= dep[i]) continue;
          if (fn && !fn(w0 * O[a3] + w1 * O[b3] + w2 * O[c3], w0 * O[a3 + 1] + w1 * O[b3 + 1] + w2 * O[c3 + 1], w0 * O[a3 + 2] + w1 * O[b3 + 2] + w2 * O[c3 + 2])) continue;
          dep[i] = z; grpB[i] = grp;
        }
      }
    }
  }
  function shadowTest(pidGrp, recv, bias) {
    const w = GB.w, h = GB.h, dep = GB.depth, matB = GB.mat, pidB = GB.pid, sh = GB.sh;
    const U = RS.U, V = RS.V, L = RS.L, s = RS.s, ox = RS.ox, oy = RS.oy, ss = RS.smS, u0 = RS.su0, v0 = RS.sv0;
    const sw = SM.w, shh = SM.h, sd = SM.depth, sg = SM.grp;
    for (let y = 0; y < h; y++) {
      const wy = (oy - y - 0.5) / s;
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!matB[i]) continue;
        const g = pidGrp[pidB[i]];
        if (!recv[g]) continue;
        const wx = (x + 0.5 - ox) / s, wz = dep[i];
        const u = u0 + (wx * U[0] + wy * U[1] + wz * U[2]) * ss, v = v0 - (wx * V[0] + wy * V[1] + wz * V[2]) * ss;
        const iu = floor(u), iv = floor(v);
        if (iu < 0 || iv < 0 || iu >= sw || iv >= shh) continue;
        const j = iv * sw + iu, d = wx * L[0] + wy * L[1] + wz * L[2];
        if (sd[j] > d + bias && sg[j] !== g && recv[g] & (1 << sg[j])) sh[i] = 1;
      }
    }
  }

  // ------------------------------------------------------------------ resolve: tones, sel-out silhouette, inner lines, rim
  function resolve(out, mats, o) {
    const w = GB.w, h = GB.h, matB = GB.mat, pidB = GB.pid, dep = GB.depth, lamB = GB.lam, shB = GB.sh, spB = GB.spec, nxB = GB.nx, nyB = GB.ny, toneB = GB.tone, lkB = GB.lk;
    const dth = o.lineDepth, pg = o.pidGrp;
    // pass 1: tones
    for (let i = 0, n = w * h; i < n; i++) {
      const m = matB[i];
      if (!m) continue;
      const M = mats[m];
      let l = lamB[i];
      if (shB[i]) l = min(l, M.shCap);
      toneB[i] = l < M.th[0] ? 0 : l < M.th[1] ? 1 : l < M.th[2] ? 2 : 3;
    }
    const rim = o.rim, rdx = o.rimDir[0], rdy = o.rimDir[1];
    const rsx = rdx > 0.38 ? 1 : rdx < -0.38 ? -1 : 0, rsy = rdy > 0.38 ? 1 : rdy < -0.38 ? -1 : 0;
    const rimW = o.rimW || 1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x, m = matB[i];
        if (!m) {
          let bd = -1e9, bj = -1;
          if (x > 0 && matB[i - 1] && dep[i - 1] > bd) { bd = dep[i - 1]; bj = i - 1; }
          if (x < w - 1 && matB[i + 1] && dep[i + 1] > bd) { bd = dep[i + 1]; bj = i + 1; }
          if (y > 0 && matB[i - w] && dep[i - w] > bd) { bd = dep[i - w]; bj = i - w; }
          if (y < h - 1 && matB[i + w] && dep[i + w] > bd) { bd = dep[i + w]; bj = i + w; }
          out[i] = bj < 0 ? 0 : (toneB[bj] >= 2 ? mats[matB[bj]].outLit : mats[matB[bj]].out);
          continue;
        }
        const M = mats[m], tone = toneB[i];
        let c = M.ramp[tone];
        if (M.hiTh && spB[i] > M.hiTh && tone >= 1 && !shB[i]) c = tone >= 2 ? M.hi : (M.hi2 || M.ramp[2]);
        if (M.ring && tone >= 2 && !shB[i]) { // angel ring: a band of the (edited) normal's screen height on the lit side,
          // broken into one short zig-zag stroke per lock (per-lock offset + a slant along the lock)
          const p0 = pidB[i], jit = (((p0 * 37) % 13) / 13 - 0.5) * M.ring[2], ny = nyB[i] + nxB[i] * 0.25 * (((p0 * 11) % 3) - 1);
          if (ny > M.ring[0] + jit && ny < M.ring[1] + jit && nxB[i] * o.lx > -0.15) c = M.ringCol;
        }
        if (M.lines && lkB[i]) {
          // inner line on the nearer part: across groups (hair over skin, head over neck) a small depth gap is enough;
          // inside a group (lock over lock) only a clear overlap (material lineD) draws a line
          const p = pidB[i], g = pg[p], d0 = dep[i] - dth, d1 = dep[i] - (M.lineD || dth);
          const tst = j => matB[j] && pidB[j] !== p && dep[j] < (pg[pidB[j]] === g ? d1 : d0);
          let ln = (x > 0 && tst(i - 1)) || (x < w - 1 && tst(i + 1)) || (y > 0 && tst(i - w)) || (y < h - 1 && tst(i + w));
          if (!ln && M.edge) { // material edge inside one part (e.g. kimono collar over the undershirt)
            const e = M.edge;
            ln = (x > 0 && pidB[i - 1] === p && matB[i - 1] !== m && mats[matB[i - 1]].edge < e) || (x < w - 1 && pidB[i + 1] === p && matB[i + 1] !== m && mats[matB[i + 1]].edge < e) ||
              (y > 0 && pidB[i - w] === p && matB[i - w] !== m && mats[matB[i - w]].edge < e) || (y < h - 1 && pidB[i + w] === p && matB[i + w] !== m && mats[matB[i + w]].edge < e);
          }
          if (ln) { out[i] = tone >= 2 ? M.lineLit : M.line; continue; }
        }
        if (rim && M.rim && (rsx || rsy)) {
          const snx = nxB[i], sny = -nyB[i];
          if (snx * rdx + sny * rdy > 0.2) {
            let edge = false;
            for (let k = 1; k <= rimW && !edge; k++) {
              const ex = x + rsx * k, ey = y + rsy * k;
              if (ex < 0 || ey < 0 || ex >= w || ey >= h) { edge = ey < h; break; }
              const j = ey * w + ex;
              if (!matB[j] || dep[j] < dep[i] - 0.25) edge = true;
            }
            if (edge) c = rim;
          }
        }
        out[i] = c;
      }
    }
  }

  // ------------------------------------------------------------------ pixel-space feature drawing (masked by part id)
  // F = { out, w, h, pid, mask(pid)→bool }
  const F = { out: null, w: 0, h: 0, allow: null };
  function fset(x, y, c) {
    x = floor(x); y = floor(y);
    if (x < 0 || y < 0 || x >= F.w || y >= F.h) return;
    const i = y * F.w + x;
    if (F.allow && !F.allow[GB.pid[i]]) return;
    F.out[i] = c;
  }
  function fget(x, y) { x = floor(x); y = floor(y); if (x < 0 || y < 0 || x >= F.w || y >= F.h) return 0; return F.out[y * F.w + x]; }
  function fline(x0, y0, x1, y1, c) {
    x0 = round(x0); y0 = round(y0); x1 = round(x1); y1 = round(y1);
    const dx = abs(x1 - x0), dy = -abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      fset(x0, y0, c);
      if ((x0 === x1 && y0 === y1) || ++n > 3000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function fpoly(pts, c) { // scanline fill at pixel centres
    if (pts.length < 3) return;
    let y0 = 1e9, y1 = -1e9;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const ya = max(0, ceil(y0 - 0.5)), yb = min(F.h - 1, floor(y1 - 0.5));
    const xs = [];
    for (let y = ya; y <= yb; y++) {
      const sy = y + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = ceil(xs[k] - 0.5), xb = floor(xs[k + 1] - 0.5);
        for (let x = xa; x <= xb; x++) fset(x, y, c);
      }
    }
  }
  // polygon coverage mask over a bbox (for eyes/mouth interiors): returns {x0, y0, w, h, m: Uint8Array}
  function polyMask(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = min(x0, p[0]); x1 = max(x1, p[0]); y0 = min(y0, p[1]); y1 = max(y1, p[1]); }
    x0 = floor(x0) - 1; y0 = floor(y0) - 1; x1 = ceil(x1) + 1; y1 = ceil(y1) + 1;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Uint8Array(max(1, w * h));
    const xs = [];
    for (let yy = 0; yy < h; yy++) {
      const sy = y0 + yy + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = max(0, ceil(xs[k] - 0.5) - x0), xb = min(w - 1, floor(xs[k + 1] - 0.5) - x0);
        for (let x = xa; x <= xb; x++) m[yy * w + x] = 1;
      }
    }
    return { x0, y0, w, h, m };
  }
  // thick stroke along a polyline: per-column vertical spans (clean stepped pixel lines); th(u) thickness in px
  function fstroke(pts, th, c, up = 0.5) {
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1];
      const n = max(1, ceil(max(abs(b[0] - a[0]), abs(b[1] - a[1])) * 2));
      for (let j = 0; j <= n; j++) {
        const t = j / n, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t), u = (k + t) / (pts.length - 1);
        const tk = th(u);
        if (tk <= 0) continue;
        const ya = round(y - tk * up), yb = round(y - tk * up + tk) - 1;
        for (let yy = ya; yy <= max(ya, yb); yy++) fset(x, yy, c);
      }
    }
  }
  const sampleCurve = (fn, n) => { const r = []; for (let i = 0; i <= n; i++) r.push(fn(i / n)); return r; };

  // ------------------------------------------------------------------ expressions (FACS-flavoured parameter sets)
  // brow: raise (head units), tilt (+ = inner end down, knit/anger; − = inner end up, worry), arch; per side n/f overrides
  // lid: up (upper-lid openness 0..1.3), low (lower-lid raise 0..1, cheek push AU6), happy (closed-arc ^ ^ when shut)
  // mouth: shape id; head: nod (+ = chin down), roll (deg)
  const EXPR = {
    neutral: { brow: { raise: 0, tilt: 0.04 }, lid: { up: 0.9, low: 0.06 }, mouth: 'line', head: { nod: 0, roll: 0 } },
    smirk: { brow: { raise: -0.004, tilt: 0.1, n: { raise: 0.022, tilt: -0.12 } }, lid: { up: 0.64, low: 0.22 }, mouth: 'smirk', head: { nod: -3, roll: 4 } },
    grin: { brow: { raise: 0.006, tilt: 0.14 }, lid: { up: 0.66, low: 0.42 }, mouth: 'grin', head: { nod: -4, roll: -2 } },
    serious: { brow: { raise: -0.024, tilt: 0.36 }, lid: { up: 0.8, low: 0.16 }, mouth: 'firm', head: { nod: 4, roll: 0 } },
    strain: { brow: { raise: -0.02, tilt: 0.44, knit: 1 }, lid: { up: 0.56, low: 0.42 }, mouth: 'teeth', head: { nod: 5, roll: -4 }, cheek: 1 },
    exhausted: { brow: { raise: 0.012, tilt: -0.34 }, lid: { up: 0.44, low: 0.08 }, mouth: 'tired', head: { nod: 7, roll: -6 } },
    smile: { brow: { raise: 0.008, tilt: -0.1 }, lid: { up: 0.72, low: 0.42 }, mouth: 'smile', head: { nod: -1, roll: 3 } },
    laugh: { brow: { raise: 0.022, tilt: -0.22 }, lid: { up: 0.0, low: 0.5, happy: true }, mouth: 'laugh', head: { nod: -9, roll: 6 } },
    shock: { brow: { raise: 0.042, tilt: -0.16, arch: 0.014 }, lid: { up: 1.24, low: -0.06 }, pupil: 0.58, mouth: 'o', head: { nod: -3, roll: 0 } },
    calm: { brow: { raise: 0.002, tilt: -0.02 }, lid: { up: 0.62, low: 0.12 }, mouth: 'soft', head: { nod: 3, roll: 0 } },
    contempt: { brow: { raise: -0.01, tilt: 0.2, n: { raise: 0.024, tilt: -0.06 } }, lid: { up: 0.5, low: 0.16 }, mouth: 'sneer', head: { nod: -8, roll: -4 } },
  };
  B.EXPRS = Object.keys(EXPR);
  function exprOf(o) {
    const E = EXPR[o.expr] || EXPR.neutral;
    const e = { brow: Object.assign({ raise: 0, tilt: 0, arch: 0, knit: 0 }, E.brow), lid: Object.assign({ up: 1, low: 0, happy: false }, E.lid), mouth: E.mouth, head: Object.assign({ nod: 0, roll: 0 }, E.head), pupil: E.pupil || 1, cheek: E.cheek || 0 };
    const eyes = o.eyes || (o.expr === 'laugh' ? 'closed' : 'open');
    e.eyes = eyes;
    if (eyes === 'narrow') { e.lid.up = min(e.lid.up, 0.52); e.lid.low = max(e.lid.low, 0.3); }
    else if (eyes === 'wide') { e.lid.up = max(e.lid.up, 1.2); e.lid.low = min(e.lid.low, -0.04); e.pupil = min(e.pupil, 0.75); }
    else if (eyes === 'closed') { e.lid.up = 0; }
    else if (eyes === 'open' && o.expr === 'laugh') { e.lid.up = 0.42; e.lid.happy = false; }
    e.glow = eyes === 'glow';
    return e;
  }

  // ------------------------------------------------------------------ characters registry
  const CH = (B.CHARS = {});
  B.define = spec => { CH[spec.name] = spec; for (const [al, to] of ALIASES) if (to === spec.name) CH[al] = spec; return spec; };
  // rig variants that share a bust (a head-and-shoulders bust never shows the arms): 'gojo1' = Gojo after ch. 234
  const ALIASES = [['gojo1', 'gojo']];

  // ------------------------------------------------------------------ render
  const cache = HT.lru(40);
  HT.caches.push({ name: 'busts', size: () => cache.size });
  const q = (v, k) => round(v * k) / k;
  const DEF_LIGHT = [-0.5, -0.55, 0.67];
  B.stats = { renders: 0, ms: 0, last: 0 };
  function keyOf(who, o, anim) {
    const L = o.light || DEF_LIGHT;
    return [who, o.size | 0, o.face || 1, q(o.turn || 0, 20), o.expr || 'neutral', o.eyes || '', o.eyes2 || '', o.look ? q(o.look[0], 10) + ',' + q(o.look[1], 10) : '',
      o.costume || '', o.bleed ? q(+o.bleed, 10) : 0, o.sweat ? q(+o.sweat, 10) : 0, o.hurt ? q(+o.hurt, 10) : 0, q(L[0], 10), q(L[1], 10), q(L[2], 10), o.rim || '',
      o.rimDir ? q(o.rimDir[0], 5) + ',' + q(o.rimDir[1], 5) : '', o.mono ? 1 : 0, o.tint ? o.tint.join(':') : '', anim.key, o.nod || 0, o.roll || 0, o.yaw || 0, o.open2 === undefined ? '' : q(o.open2, 10),
      o.notch === undefined ? '' : q(o.notch, 8), o.wheel === undefined ? '' : q(o.wheel, 50), o.glasses === undefined ? '' : o.glasses, o.crop ? o.crop.join(',') : '', o.lod || '',
      o.who || '', o.sign || '', o.phase === undefined ? '' : q(o.phase, 100), o.headStill ? 1 : 0].join('|');
  }
  // animated inputs quantized to 12 drawings/s (hair sway, blink, breath) — returned as a small state + a cache key
  function animState(spec, o) {
    const t = o.t || 0, fr = floor(t * 12 + 1e-6), tq = fr / 12;
    const wind = o.wind || [0, 0];
    const wmag = Math.hypot(wind[0], wind[1]);
    // breath: 3.6 s period, amplitude in px rounded (0..1 px at 180)
    const s = (o.size || 180) / 2.3;
    const br = o.breath === false ? 0 : round((0.5 - 0.5 * cos(tq * 2 * PI / 3.6)) * s * 0.012 * 2) / 2; // px, half-pixel steps
    // blink: one blink every ~3.2–5.6 s (seeded by the bust's seed), 3 drawings: half, shut, half
    let blink = 0;
    if (o.blink !== false && o.eyes !== 'closed' && o.expr !== 'laugh') {
      const per = 4.4, k = floor(tq / per), st = k * per + 0.6 + HT.hash(k, spec.seed || 7) * (per - 1.4);
      const d = tq - st;
      if (d >= 0 && d < 3 / 12) blink = d < 1 / 12 ? 1 : d < 2 / 12 ? 2 : 1;
    }
    // hair sway: wind + idle flutter (only with wind or o.idle); a ping-pong through 6 poses per second (1 s cycle), so a
    // windy hold renders at most 6 distinct bases and then plays from the cache
    const amp = wmag * 1.0 + (o.idle ? 0.25 : 0);
    const sway = amp > 0 ? round(HT.pingpong(tq / 0.5) * 5) : 0;
    return { tq, br, blink, wind, amp, sway, key: [br, blink, sway, q(wind[0], 20), q(wind[1], 20), amp > 0 ? 1 : 0].join(',') };
  }
  B.render = (who, o = {}) => {
    const spec = CH[who];
    if (!spec) throw new Error('busts: unknown character ' + who);
    o = Object.assign({ size: 180 }, o);
    const A = animState(spec, o);
    const key = keyOf(who, o, A);
    const hit = cache.get(key);
    if (hit) return hit;
    const t0 = performance.now();
    const res = renderNow(spec, o, A);
    const ms = performance.now() - t0;
    B.stats.renders++; B.stats.ms += ms; B.stats.last = ms;
    cache.set(key, res);
    return res;
  };
  B.clearCache = () => { cache.clear(); if (typeof baseCache !== 'undefined') baseCache.clear(); };
  B.profStart = () => (B.prof = { n: 0, build: 0, xform: 0, shadow: 0, main: 0, stest: 0, resolve: 0, feat: 0, tris: 0 });
  B.profReport = () => { const P2 = B.prof, r = {}; for (const k in P2) r[k] = k === 'n' ? P2.n : +(P2[k] / max(1, P2.n)).toFixed(2); return r; };

  // Two stages: BASE (meshes → G-buffer → shadow map → resolve; cached by everything that changes geometry/lighting)
  // and FEATURES (eyes, brows, mouth, marks, sweat… drawn on a copy of the base with the base's G-buffer as occlusion
  // masks). Blinks, eye states, the second-eyes reveal, looks and expression features only re-run the cheap stage.
  const baseCache = HT.lru(12);
  HT.caches.push({ name: 'bust bases', size: () => baseCache.size });
  function baseKeyOf(spec, o, A, ex) {
    const L = o.light || DEF_LIGHT;
    const hk = o.headStill ? 0 : 1;
    return [spec.name, o.size | 0, o.face || 1, q(o.turn || 0, 20), o.costume || '', q(L[0], 10), q(L[1], 10), q(L[2], 10), o.rim || '', o.rimDir ? q(o.rimDir[0], 5) + ',' + q(o.rimDir[1], 5) : '',
      o.mono ? 1 : 0, o.crop ? o.crop.join(',') : '', ex.head.nod * hk, ex.head.roll * hk, o.nod || 0, o.roll || 0, o.yaw === undefined ? '' : o.yaw, A.br, A.sway, q(A.amp, 20),
      q(A.wind[0], 20), q(A.wind[1], 20), o.notch === undefined ? '' : q(o.notch, 8), o.wheel === undefined ? '' : q(o.wheel, 50), o.who || '', o.sign || '', o.phase === undefined ? '' : q(o.phase, 100),
      o.debug || '', o.shadows === false ? 0 : 1].join('|');
  }
  function renderBase(spec, o, A, ex) {
    const size = o.size, s = size / 2.3;
    const fr = spec.frame || { top: 1.0, bot: -1.45, half: 1.3 };
    let W = ceil(s * fr.half * 2), H = ceil(s * (fr.top - fr.bot));
    let ox = W / 2, oy = H + fr.bot * s;
    if (o.crop) { // [x0, y0, w, h] in world units relative to the head centre (extreme close-ups)
      const [cx0, cy0, cw, ch] = o.crop;
      W = ceil(cw * s); H = ceil(ch * s); ox = -cx0 * s; oy = cy0 * s;
    }
    ox = round(ox); oy = round(oy);
    gbuf(W, H);
    RS.s = s; RS.ox = ox; RS.oy = oy;
    const Ls = o.light || DEF_LIGHT;
    const L = vnorm([Ls[0], -Ls[1], Ls[2]]);
    RS.L = L;
    const Hh = vnorm([L[0], L[1], L[2] + 1]);
    const ctx3 = { o, A, ex, s, spec, meshes: [], pidGrp: new Uint8Array(1024), mats: [null], matIx: {}, anchors: {} };
    ctx3.addMat = (name, m) => { if (ctx3.matIx[name]) return ctx3.matIx[name]; ctx3.mats.push(m); return (ctx3.matIx[name] = ctx3.mats.length - 1); };
    ctx3.add = (m) => { ctx3.meshes.push(m); ctx3.pidGrp[m.pid] = m.grp; return m; };
    const PR = B.prof, tA = performance.now();
    const face = spec.build(ctx3);
    const tB = performance.now();
    for (const m of ctx3.meshes) xform(m);
    const tC = performance.now();
    // shadow map in the light's frame at reduced resolution (≤ 0.6 of the screen, ≤ 90 px per head unit)
    let U = vcross([0, 1, 0], L); if (vlen(U) < 1e-3) U = [1, 0, 0]; U = vnorm(U);
    const V = vcross(L, U);
    const smK = min(0.6, 90 / s);
    RS.U = U; RS.V = V; RS.smS = s * smK;
    const smw = ceil(W * smK * 1.25) + 8, smh = ceil(H * smK * 1.25) + 8;
    smbuf(smw, smh);
    const hc = ctx3.headCenter || [0, 0, 0];
    RS.su0 = smw / 2 - (hc[0] * U[0] + hc[1] * U[1] + hc[2] * U[2]) * RS.smS;
    RS.sv0 = smh / 2 + (hc[0] * V[0] + hc[1] * V[1] + hc[2] * V[2]) * RS.smS;
    const castShadows = o.shadows !== false && spec.shadows !== false;
    if (castShadows) for (const m of ctx3.meshes) rasterShadow(m);
    const tD = performance.now();
    for (const m of ctx3.meshes) rasterMain(m, Hh);
    const tE = performance.now();
    if (castShadows) shadowTest(ctx3.pidGrp, spec.recv || ctx3.recv, 0.035);
    const tF = performance.now();
    const mats = ctx3.mats.map(m => {
      if (!m || !o.mono) return m;
      const mm = Object.assign({}, m);
      mm.ramp = m.mono ? m.mono : m.ramp.map(monoOf);
      mm.line = m.monoLine || K.ink; mm.lineLit = m.monoLine || K.ink; mm.out = K.ink; mm.outLit = K.ink;
      mm.hi = m.monoHi || K.white; mm.hi2 = m.monoHi || K.white;
      return mm;
    });
    const out = new Uint32Array(W * H);
    const rimCol = o.rim ? pk(o.rim) : 0;
    const rd = o.rimDir || [-Ls[0], -Ls[1]];
    const rl = Math.hypot(rd[0], rd[1]) || 1;
    resolve(out, mats, { lineDepth: 0.02, pidGrp: ctx3.pidGrp, rim: o.mono ? 0 : rimCol, rimDir: [rd[0] / rl, rd[1] / rl], rimW: size >= 210 ? 2 : 1, lx: L[0] });
    const n = W * H;
    if (o.debug === 'sh') for (let i = 0; i < n; i++) if (GB.sh[i]) out[i] = K.red;
    if (o.debug === 'pid') for (let i = 0; i < n; i++) if (GB.mat[i]) out[i] = PALP[(GB.pid[i] * 7) % 64];
    if (o.debug === 'spec') for (let i = 0; i < n; i++) if (GB.mat[i]) { const v = GB.spec[i]; out[i] = v > 0.95 ? K.white : v > 0.9 ? K.gold : v > 0.8 ? K.orange : v > 0.6 ? K.red : v > 0.3 ? K.maroon : K.ink; }
    const tG = performance.now();
    if (PR) { PR.n++; PR.build += tB - tA; PR.xform += tC - tB; PR.shadow += tD - tC; PR.main += tE - tD; PR.stest += tF - tE; PR.resolve += tG - tF; PR.tris += ctx3.meshes.reduce((a, m) => a + m.I.length / 3, 0); }
    // snapshot of what the feature pass reads
    return { out, W, H, ox, oy, s, L, Ls, face, anchors: ctx3.anchors, pid: GB.pid.slice(0, n), tone: GB.tone.slice(0, n), mat: GB.mat.slice(0, n), sh: GB.sh.slice(0, n), depth: GB.depth.slice(0, n) };
  }
  function renderNow(spec, o, A) {
    const ex = exprOf(o);
    const bk = baseKeyOf(spec, o, A, ex);
    let base = baseCache.get(bk);
    if (!base) { base = renderBase(spec, o, A, ex); baseCache.set(bk, base); }
    const tG = performance.now();
    const { W, H, ox, oy, s } = base;
    const img = new ImageData(W, H);
    const out = new Uint32Array(img.data.buffer);
    out.set(base.out);
    // point the G-buffer views at the base snapshot for the feature pass (restored after)
    const keep = { w: GB.w, h: GB.h, pid: GB.pid, tone: GB.tone, mat: GB.mat, sh: GB.sh, depth: GB.depth };
    GB.w = W; GB.h = H; GB.pid = base.pid; GB.tone = base.tone; GB.mat = base.mat; GB.sh = base.sh; GB.depth = base.depth;
    try {
      F.out = out; F.w = W; F.h = H; F.allow = null;
      const project = p => [ox + p[0] * s, oy - p[1] * s, p[2]];
      if (base.face && o.debug !== 'pid') base.face({ project, out, W, H, s, L: base.L, Ls: base.Ls, ex, o, A, mono: !!o.mono, col: o.mono ? monoOf : (c => c) });
    } finally { GB.w = keep.w; GB.h = keep.h; GB.pid = keep.pid; GB.tone = keep.tone; GB.mat = keep.mat; GB.sh = keep.sh; GB.depth = keep.depth; F.allow = null; }
    if (o.tint && o.tint[1] > 0) { // post: mood tint as a value-preserving palette swap (crisp, no dither noise)
      const tcol = o.tint[0], ta = round(clamp(o.tint[1], 0, 1) * 20) / 20;
      let last = -1, lastV = 0;
      for (let i = 0, n = W * H; i < n; i++) {
        const c = out[i];
        if (!c) continue;
        if (c !== last) { last = c; lastV = tintOf(c, tcol, ta); }
        out[i] = lastV;
      }
    }
    const cv = HT.canvas(W, H);
    cv.g.putImageData(img, 0, 0);
    const PR = B.prof;
    if (PR) PR.feat += performance.now() - tG;
    return { canvas: cv.c, ox, oy: H, W, H, s, anchors: base.anchors, headOy: oy };
  }

  // draw with the bottom-centre anchor at (x, y); overlays (glow, RCT, steam) drawn live on top (12 drawings/s)
  B.draw = (ctx, who, x, y, o = {}) => {
    o = Object.assign({ size: 180 }, o);
    const r = B.render(who, o);
    const dx = round(x - r.ox), dy = round(y - r.oy);
    const a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0) return r;
    underlays(ctx, r, dx, dy, o);
    if (a < 1) HT.alpha(ctx, a, () => ctx.drawImage(r.canvas, dx, dy)); else ctx.drawImage(r.canvas, dx, dy);
    const spec = CH[who];
    if (spec.overlay && !o.mono) spec.overlay(ctx, r, dx, dy, o);
    overlays(ctx, r, dx, dy, o);
    return r;
  };
  const headXY = (r, dx, dy) => { const an = r.anchors; return [dx + (an.head ? an.head[0] : r.ox), dy + (an.head ? an.head[1] : r.headOy)]; };
  // behind the bust: RCT healing halo — a soft pale glow that only shows around the head/shoulder silhouette
  function underlays(ctx, r, dx, dy, o) {
    if (!o.rct || o.mono) return;
    const t = floor((o.t || 0) * 12) / 12, s = r.s, [hx, hy] = headXY(r, dx, dy);
    const k = clamp(+o.rct, 0, 1), pulse = 0.8 + 0.2 * sin(t * 2 * PI / 1.6);
    HT.glow(ctx, hx, hy - s * 0.08, s * 0.9, C.foam, 0.28 * k * pulse);
    HT.glow(ctx, hx, hy - s * 0.05, s * 0.62, C.white, 0.22 * k * pulse);
  }
  // in front: RCT motes, steam wisps
  function overlays(ctx, r, dx, dy, o) {
    const t = floor((o.t || 0) * 12) / 12, s = r.s, [hx, hy] = headXY(r, dx, dy);
    const px = max(1, round(s / 78));
    if (o.rct && !o.mono) { // a few pale motes drifting up around the head (healing)
      const k = clamp(+o.rct, 0, 1);
      for (let i = 0; i < 12; i++) {
        const ph = (t * 0.4 + HT.hash(i, 71)) % 1, ang = HT.hash(i, 72) * 2 * PI;
        const rad = s * (0.42 + 0.12 * HT.hash(i, 73));
        const x0 = hx + cos(ang) * rad, y0 = hy + sin(ang) * rad * 0.9 - ph * s * 0.45;
        HT.alpha(ctx, k * sin(ph * PI) * 0.9, () => HT.rect(ctx, x0 + sin(ph * 5 + i) * 2, y0, px, px, ph < 0.4 ? C.white : C.foam));
      }
    }
    if (o.steam && !o.mono) { // heat steam: wisps rising from the head and shoulders, widening and fading as they climb
      const k = clamp(+o.steam, 0, 1);
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.28 + HT.hash(i, 91)) % 1;
        const side = HT.hash(i, 93) < 0.3 ? (HT.hash(i, 94) < 0.5 ? -1 : 1) : 0;
        const bx = hx + (side ? side * s * (0.55 + 0.2 * HT.hash(i, 95)) : (HT.hash(i, 92) - 0.5) * s * 0.7);
        const by = hy + (side ? s * 0.75 : -s * 0.3) - ph * s * 0.7;
        const len = s * (0.22 + 0.12 * HT.hash(i, 96));
        for (let j = 0; j < 14; j++) {
          const u = j / 13, yy = by - u * len, xx = bx + sin(ph * 6 + u * 4 + i * 1.7) * s * (0.02 + 0.05 * u);
          const al = k * sin(ph * PI) * (1 - u) * 0.6;
          if (al <= 0.02) continue;
          HT.alpha(ctx, al, () => HT.rect(ctx, xx, yy, max(1, round(px * (1 + u))), 1, u < 0.5 ? C.white : C.mist));
        }
      }
    }
  }

  // ================================================================== SHARED BODY + FACE KIT
  // pids: 1 torso · 2 neck · 3/4 arms · 5 head · 6/7 ears · 8 collar · 9 scarf/outer · 10.. cloth pieces · 40..199 hair
  // locks · 200 hair cap · 210+ extras. groups (shadow receiving): 1 body 2 head 3 hair 4 cloth 5 extra
  const PID = { torso: 1, neck: 2, armL: 3, armR: 4, head: 5, earL: 6, earR: 7, collar: 8, outer: 9, cloth: 10, cloth2: 11, cloth3: 12, cloth4: 13, sleeveL: 14, sleeveR: 15, glass: 16, cap: 200, lock0: 40, bun: 201, wheel: 220, extra: 230 };
  const GRP = { body: 1, head: 2, hair: 3, cloth: 4, extra: 5 };
  B.PID = PID;
  const HEAD_EAR = new Uint8Array(1024); HEAD_EAR[PID.head] = 1; HEAD_EAR[PID.earL] = 1; HEAD_EAR[PID.earR] = 1;
  const BROW_ALLOW = new Uint8Array(1024); BROW_ALLOW[PID.head] = 1; BROW_ALLOW[PID.cap] = 1; for (let i = PID.lock0; i < PID.cap; i++) BROW_ALLOW[i] = 1;
  // receivers: which groups a group may be shadowed by (bitmask over groups)
  const RECV = new Uint8Array(8);
  RECV[GRP.body] = (1 << GRP.head) | (1 << GRP.hair) | (1 << GRP.cloth);
  RECV[GRP.head] = (1 << GRP.hair) | (1 << GRP.extra);
  RECV[GRP.hair] = 1 << GRP.hair;
  RECV[GRP.cloth] = (1 << GRP.head) | (1 << GRP.hair) | (1 << GRP.body);
  RECV[GRP.extra] = 0;

  // pose: head matrix (about the neck pivot), body matrix; yaw from face/turn
  function poseOf(c) {
    const o = c.o, ex = c.ex, spec = c.spec;
    const face = (o.face || 1) >= 0 ? 1 : -1;
    const turn = clamp(o.turn === undefined ? 0 : o.turn, 0, 1);
    const yaw = (o.yaw !== undefined ? o.yaw : face * (1 - turn) * (spec.yaw3q || 34)) * D2R;
    const hk = o.headStill ? 0 : 1;
    const nod = ((o.nod || 0) + ex.head.nod * hk) * D2R;
    const roll = ((o.roll || 0) + ex.head.roll * face * hk) * D2R;
    const pivot = spec.pivot || [0, -0.36, -0.06];
    const breath = c.A.br / c.s; // px → units
    const bodyYaw = yaw * (spec.bodyFollow === undefined ? 0.55 : spec.bodyFollow);
    const bodyM = mChain(mTr(0, breath, 0), mAbout(mRotY(bodyYaw), [0, -1.2, 0]));
    const lean = spec.headLean || [0, 0, 0];
    const headM = mChain(mTr(lean[0], lean[1] + breath * 0.5, lean[2]), mAbout(mChain(mRotZ(roll), mRotY(yaw), mRotX(nod)), pivot));
    return { yaw, nod, roll, face, turn, headM, bodyM, bodyYaw, pivot };
  }

  // ---- body parts
  function addNeck(c, P, o) {
    const r0 = o.r || 0.14, rz = o.rz || 0.13;
    const pts = [], rw = [], rt = [];
    const top = o.top === undefined ? -0.16 : o.top, bot = o.bot === undefined ? -1.02 : o.bot;
    for (let i = 0; i <= 6; i++) { const u = i / 6, y = lerp(top, bot, u); pts.push([0, y, lerp(-0.1, -0.07, u) + (o.zoff || 0)]); const k = 1 + 0.18 * u * u; rw.push(r0 * k); rt.push(rz * k); }
    const m = c.add(tubeMesh(pts, rw, rt, 16, [0, 0, 1], { pid: PID.neck, grp: GRP.body, mat: o.mat, bias: o.bias === undefined ? -0.12 : o.bias, matFn: o.matFn || null }));
    // swap axes: tube width axis = cross(T, ref) → x; thickness axis → z
    m.skin = { MA: P.headM, MB: P.bodyM, w: y => sstep(-0.95, -0.2, y) * 0.85 };
    const nv = m.P.length / 3; m.BV = new Float32Array(nv);
    for (let i = 0; i < nv; i++) m.BV[i] = -0.34 * sstep(-0.75, -0.42, m.P[i * 3 + 1]);
    return m;
  }
  function addTorso(c, P, o) {
    const prof = profile(o.rows, 40);
    const rows = headRings(prof, 14, 28, 0);
    const m = c.add(gridMesh(rows, { pid: PID.torso, grp: GRP.body, mat: o.mat, matFn: o.matFn || null, bias: o.bias || 0, M: P.bodyM }));
    return m;
  }
  function addArm(c, P, side, o) {
    const A = [side * o.x0, o.y0, o.z0 || -0.03], Bp = [side * o.x1, o.y1, o.z1 || -0.06];
    const m = c.add(capsuleMesh(A, Bp, o.r0, o.r1, 14, { pid: side < 0 ? PID.armL : PID.armR, grp: GRP.body, mat: o.mat, matFn: o.matFn ? (x, y, z) => o.matFn(x * side, y, z) : null, bias: o.bias || 0, M: P.bodyM }, true, false, [0, 0, 1], 4));
    return m;
  }
  // head + nose + ears
  function addHead(c, P, prof, o) {
    const rows = headRings(prof, 26, 32, 0);
    const hm = c.add(gridMesh(rows, { pid: PID.head, grp: GRP.head, mat: o.skin, bias: o.bias || 0.06, M: P.headM }));
    // edited normals: flatten the front plane of the face toward "forward" so it lights/shades as one clean plane
    // (a terminator along the cheekbone → jaw instead of a diagonal band across the cheek)
    const flat = o.flatFace === undefined ? 0.55 : o.flatFace;
    for (let i = 0; i < hm.P.length; i += 3) {
      const y = hm.P[i + 1], z = hm.P[i + 2], pr = prof.at(y);
      const fr = clamp((z - pr[2]) / max(0.01, pr[3] - pr[2]), 0, 1);
      const wgt = flat * pow(fr, 1.4) * sstep(-0.47, -0.3, y) * sstep(0.34, 0.16, y);
      if (wgt <= 0) continue;
      const nx = hm.N[i] * (1 - wgt), ny = hm.N[i + 1] * (1 - wgt), nz = hm.N[i + 2] * (1 - wgt) + wgt;
      const nl = Math.hypot(nx, ny, nz) || 1; hm.N[i] = nx / nl; hm.N[i + 1] = ny / nl; hm.N[i + 2] = nz / nl;
    }
    // per-vertex bias: darken under the jaw / chin (occlusion-like, GG Xrd vertex channel)
    const nv = hm.P.length / 3; hm.BV = new Float32Array(nv);
    for (let i = 0; i < nv; i++) {
      const y = hm.P[i * 3 + 1], z = hm.P[i * 3 + 2], ny = hm.N[i * 3 + 1];
      hm.BV[i] = (ny < -0.45 ? -0.35 * sstep(-0.45, -0.85, ny) : 0) + (z < -0.2 && y < -0.1 ? -0.1 : 0);
    }
    // nose: a small wedge-like ellipsoid on the face, same part as the head (so it only shades, no outline)
    const nz = surfZ(prof, 0, -0.13);
    const nose = o.nose || { y: -0.13, len: 0.105, w: 0.034, d: 0.052, pitch: -14 };
    c.add(ellipsoidMesh([0, nose.y, nz - 0.012], [nose.w, nose.len, nose.d], mRotX(nose.pitch * D2R), 10, 8, { pid: PID.head, grp: GRP.head, mat: o.skin, bias: 0.18, M: P.headM }));
    // ears
    const er = o.ear || { x: 0.345, y: -0.1, z: -0.07, ry: 0.13, rz: 0.075, rx: 0.03, tilt: -14 };
    for (const sd of [-1, 1]) {
      c.add(ellipsoidMesh([sd * er.x, er.y, er.z], [er.rx, er.ry, er.rz], mChain(mRotY(sd * 18 * D2R), mRotX(er.tilt * D2R)), 12, 8, { pid: sd < 0 ? PID.earL : PID.earR, grp: GRP.head, mat: o.skin, bias: 0.05, M: P.headM }));
    }
    return hm;
  }
  // hair cap: inflated upper head; keepFn(x, y, z) decides where the scalp hair is
  function addCap(c, P, prof, o) {
    const rows = headRings(prof, 18, 30, o.grow || 0.035, prof.top, o.bot || -0.34);
    return c.add(gridMesh(rows, { pid: PID.cap, grp: GRP.hair, mat: o.mat, matFn: o.keep, bias: o.bias || 0, M: P.headM, cull: true }));
  }
  // hair lock: root on the scalp (az, el), tip direction (taz, tel) or explicit tip, bent quadratic spine, tapered
  function addLock(c, P, L, i, o) {
    const cen = o.center, rr = o.radius;
    // seeded irregularity (deterministic): angles ±, length/width ±
    const vr = L.vary === undefined ? (o.vary || 0) : L.vary;
    const hv = k => (HT.hash(i * 13 + k, o.seed || 5) - 0.5) * 2 * vr;
    const d0 = sph(L.az + hv(1) * 4, L.el + hv(2) * 3);
    const root = vadd(cen, vmul(d0, rr - (L.sink || 0.05)));
    let tip, ctrl;
    const wind = c.A.wind, amp = c.A.amp;
    // sway: wind push (screen → world) + flutter; head-local approximation
    const fl = amp ? (c.A.sway / 5 - 0.5) * 2 * (0.55 + 0.45 * HT.hash(i, 32)) : 0, ph = HT.hash(i, 31) * 2 * PI;
    const len = (L.len || 0.3) * (1 + hv(3) * 0.14);
    const sw = [wind[0] * 0.22 * len + fl * 0.045 * amp * len, -wind[1] * 0.22 * len + (amp ? fl * sin(ph) * 0.025 * amp * len : 0), 0];
    if (L.scalp) { // lies along the scalp: slerp root dir → tip dir at radius rr + lift (+ a small arch)
      const dT = vnorm(sph(L.taz, L.tel)), lift = L.lift === undefined ? 0.035 : L.lift;
      const pts0 = [];
      for (let k = 0; k < 8; k++) { const t = k / 7; const d = vnorm(vlerp(d0, dT, t)); pts0.push(vadd(cen, vmul(d, rr - 0.03 + lift + (L.arch || 0.02) * sin(PI * t) + (L.end || 0) * t))); }
      const S = 8, rw = [], rt = [], refs = [];
      const w0 = (L.w || 0.08) * (1 + hv(8) * 0.12), fl2 = L.flat || 0.4, te = L.taper || 0.8;
      for (let k = 0; k < S; k++) { const t = k / (S - 1), taper = pow(1 - t * 0.92, te) * (1 + 0.15 * sin(PI * t)); rw.push(w0 * taper); rt.push(w0 * fl2 * taper); refs.push(vnorm(vsub(pts0[k], cen))); }
      const m = tubeMesh(pts0, rw, rt, 6, refs, { pid: PID.lock0 + i, grp: GRP.hair, mat: L.mat || o.mat, bias: (L.bias || 0) + (o.bias || 0), M: P.headM });
      const km = L.mass === undefined ? 0.8 : L.mass;
      for (let j = 0; j < m.P.length; j += 3) { let rx = m.P[j] - cen[0], ry = m.P[j + 1] - cen[1], rz = m.P[j + 2] - cen[2]; const rl = Math.hypot(rx, ry, rz) || 1; const nx = m.N[j] * (1 - km) + rx / rl * km, ny = m.N[j + 1] * (1 - km) + ry / rl * km, nz = m.N[j + 2] * (1 - km) + rz / rl * km; const nl = Math.hypot(nx, ny, nz) || 1; m.N[j] = nx / nl; m.N[j + 1] = ny / nl; m.N[j + 2] = nz / nl; }
      m.LV = new Float32Array(S * 6).fill(1);
      m.specShift = o.specShift || 0; m.specPow = o.specPow || 30;
      return c.add(m);
    }
    if (L.tip) { // explicit tip on the face surface (fringe)
      const tx = L.tip[0] + hv(4) * 0.012, ty = L.tip[1] + hv(5) * 0.012;
      tip = [tx, ty, surfZ(o.prof, tx, ty) + (L.lift === undefined ? 0.045 : L.lift)];
      const mid = vlerp(root, tip, 0.45);
      const outv = vnorm(vsub(mid, cen));
      ctrl = vadd(mid, vmul(outv, L.bulge === undefined ? 0.1 : L.bulge));
      if (L.curl) { const side = vnorm(vcross(outv, vsub(tip, root))); ctrl = vadd(ctrl, vmul(side, vlen(vsub(tip, root)) * L.curl / 90)); }
      if (L.ctrl) ctrl = vadd(ctrl, L.ctrl);
    } else {
      const td = sph((L.taz === undefined ? L.az : L.taz) + hv(6) * 7, (L.tel === undefined ? L.el : L.tel) + hv(7) * 6);
      tip = vadd(root, vmul(td, len));
      ctrl = vadd(root, vadd(vmul(d0, len * (L.push === undefined ? 0.42 : L.push)), vmul(td, len * 0.18)));
      if (L.curl) { let side = vcross(d0, td); if (vlen(side) < 0.05) side = vcross(d0, [0, 1, 0]); side = vnorm(side); ctrl = vadd(ctrl, vmul(side, len * L.curl / 60)); tip = vadd(tip, vmul(side, len * L.curl / 140)); }
      if (L.droop) { tip[1] -= L.droop; ctrl[1] -= L.droop * 0.3; }
      if (L.ctrl) ctrl = vadd(ctrl, L.ctrl);
    }
    tip = vadd(tip, sw); ctrl = vadd(ctrl, vmul(sw, 0.45));
    const S = 8, pts = [], rw = [], rt = [], refs = [];
    const w0 = (L.w || 0.08) * (1 + hv(8) * 0.12), fl2 = L.flat || 0.55, te = L.taper || o.taper || 0.75, belly = L.belly === undefined ? (o.belly === undefined ? 0.3 : o.belly) : L.belly;
    for (let k = 0; k < S; k++) {
      const t = k / (S - 1), p = bez2(root, ctrl, tip, t);
      pts.push(p);
      const taper = pow(1 - t, te) * (1 + belly * sin(PI * pow(t, 0.8)));
      rw.push(w0 * taper); rt.push(w0 * fl2 * taper);
      refs.push(vnorm(vsub(p, cen)));
    }
    const m = tubeMesh(pts, rw, rt, 6, refs, { pid: PID.lock0 + i, grp: GRP.hair, mat: L.mat || o.mat, bias: (L.bias || 0) + (o.bias || 0), M: P.headM });
    // edited normals (GG Xrd): blend each lock's tube normal toward the hair-mass normal (radial from the head centre) so
    // the whole volume reads as one big lit/shadow shape and the clumps only modulate it
    const km = L.mass === undefined ? (o.mass === undefined ? 0.85 : o.mass) : L.mass;
    if (km > 0) {
      const Pm = m.P, Nm = m.N;
      for (let j = 0; j < Pm.length; j += 3) {
        let rx = Pm[j] - cen[0], ry = Pm[j + 1] - cen[1], rz = Pm[j + 2] - cen[2];
        const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
        const nx = Nm[j] * (1 - km) + rx * km, ny = Nm[j + 1] * (1 - km) + ry * km, nz = Nm[j + 2] * (1 - km) + rz * km;
        const nl = Math.hypot(nx, ny, nz) || 1; Nm[j] = nx / nl; Nm[j + 1] = ny / nl; Nm[j + 2] = nz / nl;
      }
    }
    // per-vertex: root darker → tip lighter (clumps emerge from a shadowed mass); inner lines only on the outer part
    const segs = 6, nvv = S * segs;
    m.BV = new Float32Array(nvv); m.LV = new Float32Array(nvv);
    const rb = o.rootBias === undefined ? -0.28 : o.rootBias, tb = o.tipBias === undefined ? 0.08 : o.tipBias, lt = L.lineFrom === undefined ? (o.lineFrom === undefined ? 0.34 : o.lineFrom) : L.lineFrom;
    for (let k = 0; k < S; k++) {
      const t = k / (S - 1);
      for (let q2 = 0; q2 < segs; q2++) { m.BV[k * segs + q2] = lerp(rb, tb, sstep(0, 0.7, t)); m.LV[k * segs + q2] = t >= lt ? 1 : 0; }
    }
    m.specShift = o.specShift || 0; m.specPow = o.specPow || 30;
    return c.add(m);
  }
  // a hair set: main locks + an auto under-layer (shorter, darker clumps beneath each non-fringe lock → depth)
  function addHair(c, P, list, o) {
    let i = 0;
    const under = o.under === undefined ? 0.72 : o.under;
    for (const L of list) {
      if (under && !L.tip && !L.noUnder) {
        addLock(c, P, Object.assign({}, L, { el: L.el - 11, tel: (L.tel === undefined ? L.el : L.tel) - 9, len: (L.len || 0.3) * under, w: (L.w || 0.08) * 1.18, bias: (L.bias || 0) - 0.32, curl: -(L.curl || 0) * 0.5 }), i++, o);
      }
    }
    for (const L of list) addLock(c, P, L, i++, o);
    return i;
  }

  // ---- face features (pixel space). All shapes in head-local coordinates → projected with the head matrix.
  function faceKit(c, P, prof, fs) {
    // fs: per-character face spec
    return (D) => {
      const { project, s, ex, o } = D;
      const col = D.col;
      const H = P.headM;
      const hp = (x, y, dz = 0.004) => project(mP(H, [x, y, surfZ(prof, x, y) + dz]));
      const HEADONLY = new Uint8Array(1024); HEADONLY[PID.head] = 1;
      F.allow = HEADONLY;
      const near = P.face > 0 ? -1 : 1; // head-local x sign of the near side (face=+1 turns right → x- side is near)
      const lightSide = D.Ls[0] >= 0 ? 1 : -1; // screen side of the key light
      // skin tone at a projected point (for shadow-aware feature colours)
      const toneAt = (p) => { const x = floor(p[0]), y = floor(p[1]); if (x < 0 || y < 0 || x >= D.W || y >= D.H) return 2; return GB.tone[y * D.W + x]; };
      const shaded = (p) => GB.mat[floor(p[1]) * D.W + floor(p[0])] && (toneAt(p) < 2 || GB.sh[floor(p[1]) * D.W + floor(p[0])]);
      const px = max(1, s / 78); // pixel scale relative to the 180-px design
      const kit = { hp, near, lightSide, toneAt, shaded, px, col, s, ex, o, P, prof, D, fs };
      // --- nose: tip line + nostril, shadow side follows the light
      if (fs.nose !== false) drawNose(kit);
      // --- mouth
      drawMouth(kit);
      // --- eyes + brows
      if (!fs.noEyes) for (const sd of [-1, 1]) drawEye(kit, sd);
      if (!fs.noEyes) for (const sd of [-1, 1]) drawBrow(kit, sd);
      // --- extras
      if (fs.extra) fs.extra(kit);
      if (o.hurt) drawHurt(kit);
      if (o.bleed) drawBleed(kit);
      F.allow = null;
      if (o.sweat) drawSweat(kit);
      if (fs.after) fs.after(kit);
      // anchors for FX
      const hc = project(mP(H, [0, 0, 0]));
      c.anchors.head = [round(hc[0]), round(hc[1])];
      const el = hp(-fs.eye.cx, fs.eye.cy), er = hp(fs.eye.cx, fs.eye.cy);
      c.anchors.eyes = [[round(el[0]), round(el[1])], [round(er[0]), round(er[1])]];
      const mo = hp(0, fs.mouthY || -0.34); c.anchors.mouth = [round(mo[0]), round(mo[1])];
      const no = hp(0, -0.22); c.anchors.nose = [round(no[0]), round(no[1])];
    };
  }
  function drawNose(k) {
    const { hp, px, col, fs, P, D } = k;
    const ny = fs.noseY || -0.225;
    // tip point slightly in front of the surface (the nose mesh protrudes); line colour on the underside
    const tip = k.D.project(mP(P.headM, [0, ny + 0.012, surfZ(k.prof, 0, ny) + 0.05]));
    const under = k.D.project(mP(P.headM, [0, ny, surfZ(k.prof, 0, ny) + 0.035]));
    const ln = col(fs.noseCol || K.rosewood);
    const side = P.yaw > 0.05 ? 1 : P.yaw < -0.05 ? -1 : 0; // screen direction the nose points
    F.allow = null; // nose tip may sit on the face edge
    const tx = round(tip[0]), ty = round(tip[1]);
    if (side === 0) { // frontal: short underside line, shadow side
      const w = max(1, round(px * 1.5));
      for (let i = 0; i < w; i++) fset(tx - (k.lightSide > 0 ? i + 1 : -i), round(under[1]) + 1, ln);
    } else {
      // 3/4: an angled underside stroke from the tip back toward the nostril
      const back = -side;
      fset(tx, ty + 1, ln);
      for (let i = 1; i <= max(1, round(px * 1.6)); i++) fset(tx + back * i, ty + 1 + (i > px ? 1 : 0), ln);
      fset(tx + back * round(px * 2.2), ty, col(K.salmon));
    }
    F.allow = new Uint8Array(1024); F.allow[PID.head] = 1;
  }
  // ---- eyes
  // per-side brow parameters (near/far overrides resolve to the viewer-facing side)
  function browOf(k, sd) {
    const ex = k.ex, P = k.P;
    const isNear = sd === k.near || (P.turn >= 0.99 && sd > 0);
    const side = isNear ? ex.brow.n : ex.brow.f;
    const raise = side && side.raise !== undefined ? side.raise : ex.brow.raise;
    const tilt = side && side.tilt !== undefined ? side.tilt : ex.brow.tilt;
    return { raise, tilt, arch: ex.brow.arch || 0, knit: ex.brow.knit || 0 };
  }
  function eyeCurves(k, sd, ex) {
    const E = k.fs.eye, lid = ex.lid;
    const blink = k.D.A.blink;
    let up = lid.up * (blink === 1 ? 0.45 : blink === 2 ? 0 : 1);
    const bw = browOf(k, sd);
    const hw = E.hw, hU = E.hU, hL = E.hL * (1 - 0.45 * max(0, lid.low));
    const tilt = E.tilt || 0;
    const X = (u) => sd * (E.cx + u);
    const lowRaise = max(0, lid.low) * E.hL * 0.55;
    const ic = [-hw, -0.12 * hU + (E.inY || 0)], oc = [hw, tilt * hw + lowRaise * 0.35];
    // upper lid (inner → outer): flatter and lower as it closes; coupled to the brow: an angry brow (tilt > 0) presses
    // the inner lid down, a worried/tired brow (tilt < 0) lets the outer lid droop
    const angry = max(0, bw.tilt), sad = max(0, -bw.tilt);
    const u1 = [-hw * 0.45, lerp(ic[1], hU * 1.02, up) - angry * hU * 0.95 * min(1, up * 1.4) + sad * hU * 0.2 * up];
    const u2 = [hw * 0.4, lerp(oc[1], hU * (E.peakOut || 0.95), up) - sad * hU * 0.7 * min(1, up * 1.4) + angry * hU * 0.12 * up];
    // lower lid (outer → inner)
    const l1 = [hw * 0.45, -hL + lowRaise * 1.2], l2 = [-hw * 0.45, -hL * 0.85 + lowRaise * 0.8];
    return { X, ic, oc, u1, u2, l1, l2, up, hw, hU, hL };
  }
  function drawEye(k, sd) {
    const { fs, ex, D, px, col } = k;
    const E = fs.eye, EC = fs.eyeCol;
    const g = eyeCurves(k, sd, ex);
    const cy = E.cy;
    const P3 = (u, v, dz = 0.006) => k.hp(g.X(u), cy + v, dz);
    const nS = 10;
    const upper = sampleCurve(t => { const p = bez3(g.ic, g.u1, g.u2, g.oc, t); return P3(p[0], p[1]); }, nS);
    const lower = sampleCurve(t => { const p = bez3(g.oc, g.l1, g.l2, g.ic, t); return P3(p[0], p[1]); }, nS);
    if (px >= 3) return drawEyeHD(k, sd, g, E, EC, ex);
    const lashC = col(EC.lash), lidC = col(EC.lid || EC.lash);
    const lashT = max(1, round(px * (E.lashT || 1.6)));
    const closed = g.up < 0.12;
    if (closed) {
      // shut lid: a curve (relaxed = sagging arc, happy = ^ arc) with lash weight
      const happy = ex.lid.happy && D.A.blink === 0;
      const mid = happy ? E.hU * 0.55 : -E.hL * 0.35;
      const pts = sampleCurve(t => { const u = lerp(-g.hw, g.hw, t); const v = lerp(g.ic[1], g.oc[1], t) + mid * sin(PI * t); return P3(u, v); }, nS);
      fstroke(pts, u => (u < 0.15 ? max(1, lashT - 1) : lashT), lashC, happy ? 0.3 : 0.5);
      if (E.lashes && !happy) lashFlicks(k, sd, g, pts, lashC, true);
      return;
    }
    // interior: sclera / iris / pupil / highlights
    const poly = upper.concat(lower.slice(1)).map(p => [p[0], p[1]]);
    const mk = polyMask(poly);
    const eyeC3 = P3(0, 0);
    const shade = k.shaded(eyeC3);
    const look = D.o.look || [0, 0];
    // iris centre in eye-local coords (+u = outer), vertical from look.y; horizontal look is in screen space
    const lookU = look[0] * sd * (k.P.face < 0 ? 1 : 1);
    const iu = clamp(lookU * g.hw * 0.42 + (E.irisU || 0) * sd * 0, -g.hw * 0.5, g.hw * 0.5), iv = -look[1] * E.hU * 0.25 + (E.irisV || -0.05) * E.hU;
    const ic2 = P3(iu, iv), ir3 = E.iris * (ex.eyes === 'wide' ? 0.92 : 1);
    // foreshortening: projected half width of the eye vs its true half width
    const eL = P3(-g.hw, 0), eR = P3(g.hw, 0);
    const fsx = clamp(abs(eR[0] - eL[0]) / (2 * g.hw * D.s), 0.3, 1.05);
    const irx = ir3 * D.s * fsx * (E.irisW || 0.86), iry = ir3 * D.s;
    const pr = (E.pupil || 0.42) * ex.pupil;
    const glow = ex.glow || EC.alwaysGlow;
    const scl = col(shade ? EC.sclShade : EC.scl), sclTop = col(EC.sclTop);
    const irisTop = col(glow ? EC.irisGlow[0] : EC.iris[0]), irisMid = col(glow ? EC.irisGlow[1] : EC.iris[1]), irisLow = col(glow ? EC.irisGlow[2] : EC.iris[2]);
    const ring = col(glow ? EC.ringGlow || EC.ring : EC.ring), pupC = col(glow ? EC.pupilGlow || EC.pupil : EC.pupil);
    // upper-lid y at a column (for the lid shadow band on the eyeball)
    const lidY = new Map();
    for (let j = 0; j + 1 < upper.length; j++) {
      const a = upper[j], b = upper[j + 1];
      const xa = round(min(a[0], b[0])), xb = round(max(a[0], b[0]));
      for (let x = xa; x <= xb; x++) { const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]); const yv = lerp(a[1], b[1], clamp(t, 0, 1)); if (!lidY.has(x) || yv < lidY.get(x)) lidY.set(x, yv); }
    }
    const band = max(1, round(px * 0.9));
    for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) {
      if (!mk.m[yy * mk.w + xx]) continue;
      const X = mk.x0 + xx, Y = mk.y0 + yy, cx = X + 0.5, cy2 = Y + 0.5;
      const dx = (cx - ic2[0]) / irx, dy = (cy2 - ic2[1]) / iry, rr = dx * dx + dy * dy;
      const ly = lidY.has(X) ? lidY.get(X) : -1e9;
      const underLid = cy2 - ly < band + 0.5;
      let c;
      if (rr <= 1) {
        const tv = (cy2 - (ic2[1] - iry)) / (2 * iry);
        c = tv < 0.36 ? irisTop : tv < 0.68 ? irisMid : irisLow;
        if (rr > 0.72) c = ring;
        const pdx = (cx - ic2[0]) / (irx * pr), pdy = (cy2 - ic2[1] - iry * 0.04) / (iry * pr * 1.12);
        if (pdx * pdx + pdy * pdy <= 1) c = pupC;
        if (underLid) c = ring === irisTop ? pupC : irisTop;
        if (glow && EC.glowFx && rr > 0.35 && rr < 0.6 && !underLid) c = col(EC.glowFx);
      } else c = underLid ? sclTop : scl;
      fset(X, Y, c);
    }
    // highlights (main toward the key light, secondary opposite-low); none when the eye is in deep shade
    if (!D.mono || true) {
      const hs = max(1, round(px * (E.hiSize || 1.4)));
      const hx = ic2[0] + k.lightSide * irx * 0.32 - hs / 2, hy = ic2[1] - iry * 0.42;
      const white = col(EC.hi || K.white);
      for (let a = 0; a < hs; a++) for (let b2 = 0; b2 < hs; b2++) if (mk.m[(round(hy) + b2 - mk.y0) * mk.w + (round(hx) + a - mk.x0)]) fset(round(hx) + a, round(hy) + b2, white);
      if (px >= 1.2 || E.hi2) {
        const sx2 = round(ic2[0] - k.lightSide * irx * 0.35), sy2 = round(ic2[1] + iry * 0.38);
        if (mk.m[(sy2 - mk.y0) * mk.w + (sx2 - mk.x0)]) fset(sx2, sy2, col(EC.hi2 || K.white));
      }
      if (glow && EC.spark) { // Six-Eyes glint: tiny cross
        const gx = round(ic2[0] - k.lightSide * irx * 0.1), gy = round(ic2[1] + iry * 0.1);
        if (px >= 1.4) { fset(gx, gy, white); }
      }
    }
    // upper lash line (thick, thinner at the inner corner), extended past the outer corner
    const lashOut = E.lashOut === undefined ? 1 : E.lashOut; // extra weight on the outer part of the lid (anime male eye)
    fstroke(upper, u => (u < 0.18 ? max(1, lashT - 1) : u > 0.55 ? lashT + (px >= 0.9 ? lashOut : 0) : lashT), lashC, 0.85);
    // outer flick
    const oc = upper[upper.length - 1], pre = upper[upper.length - 3];
    const fx = oc[0] - pre[0], fy = oc[1] - pre[1], fl = Math.hypot(fx, fy) || 1;
    const flen = max(1, round(px * (E.flick || 1.6)));
    for (let i = 1; i <= flen; i++) fset(round(oc[0] + fx / fl * i), round(oc[1] + fy / fl * i + (E.flickDrop || 0.5) * i), lashC);
    // lower lid: short line on the outer 55%
    const lowC = col(EC.lower || K.rosewood);
    for (let j = 0; j < lower.length * 0.55; j++) fset(round(lower[j][0]), round(lower[j][1]), lowC);
    // crease above the lid (double eyelid), follows the lid at ~0.35 hU
    if (E.crease && g.up > 0.5 && px >= 0.9) {
      const cr = sampleCurve(t => { const p = bez3(g.ic, g.u1, g.u2, g.oc, t); return P3(p[0] * 0.9 + g.hw * 0.08, p[1] + E.hU * E.crease); }, 8);
      for (let j = 3; j < cr.length - 1; j++) fset(round(cr[j][0]), round(cr[j][1]), col(EC.creaseC || K.salmon));
    }
    if (E.lashes) lashFlicks(k, sd, g, upper, col(EC.lashHi || EC.lash), false);
  }
  // fine lashes (Gojo's white lashes): short strands fanning out from the outer third of the lid
  function lashFlicks(k, sd, g, upper, c, shut) {
    const { px } = k;
    if (px < 0.85) return;
    const n = upper.length;
    const out = sd * (k.P.face > 0 ? 1 : 1);
    const L = max(1, round(px * 1.4));
    for (const j of [n - 1, n - 2, n - 4]) {
      const p = upper[j], q2 = upper[max(0, j - 1)];
      const tx = p[0] - q2[0], ty = p[1] - q2[1], tl = Math.hypot(tx, ty) || 1;
      // strand direction: outward along the lid + up (or down when shut)
      const dx = tx / tl, dy = ty / tl - (shut ? -0.6 : 0.9);
      const dl = Math.hypot(dx, dy) || 1;
      for (let i = 1; i <= L + (j === n - 1 ? 1 : 0); i++) fset(round(p[0] + dx / dl * i), round(p[1] - 1 + dy / dl * i), c);
    }
  }
  function drawBrow(k, sd) {
    const { fs, px, col } = k;
    const Bw = fs.brow, E = fs.eye;
    if (!Bw) return;
    const { raise, tilt, arch, knit } = browOf(k, sd);
    const y0 = E.cy + Bw.y + raise;
    const inner = [Bw.x0, y0 - tilt * 0.06 - (knit ? 0.01 : 0)], outer = [Bw.x1, y0 + (Bw.drop || -0.012) + tilt * 0.02];
    const mid = [lerp(Bw.x0, Bw.x1, 0.45), y0 + (Bw.arch || 0.012) + arch - tilt * 0.015];
    const X = u => sd * u;
    const pts = sampleCurve(t => { const p = bez2([inner[0], inner[1], 0], [mid[0], mid[1], 0], [outer[0], outer[1], 0], t); return k.hp(X(p[0]) - (knit ? sd * 0.012 * (1 - t) : 0), p[1], 0.05); }, 10);
    const T0 = (Bw.t0 || 2.2) * px, T1 = (Bw.t1 || 1.2) * px;
    const c = col(fs.browCol), c2 = fs.browCol2 ? col(fs.browCol2) : c;
    // brows read through the fringe (anime convention): draw over head + hair parts; over hair add a dark edge
    const prev = F.allow;
    F.allow = BROW_ALLOW;
    const thk = u => max(1, round(lerp(T0, T1, u)));
    if (px >= 3) { // HD brow: tapered filled shape + hair strokes along the growth direction
      const up = [], dn = [];
      for (let i = 0; i < pts.length; i++) {
        const u = i / (pts.length - 1), tk = lerp(T0, T1 * 0.55, pow(u, 0.9)) * (u < 0.08 ? lerp(0.7, 1, u / 0.08) : 1);
        const a = pts[max(0, i - 1)], b = pts[min(pts.length - 1, i + 1)];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; if (ny > 0) { nx = -nx; ny = -ny; }
        up.push([pts[i][0] + nx * tk * 0.5, pts[i][1] + ny * tk * 0.5]); dn.push([pts[i][0] - nx * tk * 0.5, pts[i][1] - ny * tk * 0.5]);
      }
      const shape = up.concat(dn.reverse());
      if (fs.browEdge) { const ce = col(fs.browEdge); fpoly(shape.map(p => [p[0], p[1] + max(1, px * 0.35)]), ce); }
      fpoly(shape, c);
      const nStroke = round(clamp(px * 2.2, 8, 30));
      for (let j = 0; j < nStroke; j++) {
        const u = (j + 0.5) / nStroke, i0 = round(u * (pts.length - 1)), p = pts[i0];
        const tk = lerp(T0, T1 * 0.55, u);
        const ang = -0.9 + u * 0.7, L = tk * 0.9;
        const sx = p[0] - Math.cos(ang) * L * 0.5 * sd * (k.P.face >= 0 ? 1 : 1), sy = p[1] + tk * 0.3;
        fline(sx, sy, sx + Math.cos(ang) * L * (pts[pts.length - 1][0] > pts[0][0] ? 1 : -1), sy + Math.sin(ang) * L, HT.hash(j, 77) > 0.5 ? c2 : (fs.browEdge ? col(fs.browEdge) : c));
      }
      F.allow = prev;
      return;
    }
    if (fs.browEdge) {
      const ce = col(fs.browEdge);
      const edgePts = pts.map(p => [p[0], p[1] + 1]);
      fstroke(edgePts, thk, ce, 0.5);
    }
    fstroke(pts, thk, c, 0.5);
    if (fs.browCol2) fstroke(pts, u => (u > 0.12 && u < 0.85 ? 1 : 0), c2, round(lerp(T0, T1, 0.5)) > 1 ? -0.1 : 0.5);
    F.allow = prev;
  }
  // ---- mouth
  function drawMouth(k) {
    const { fs, ex, px, col, P, D } = k;
    const my = fs.mouthY || -0.34, mw = fs.mouthW || 0.105;
    const shape = ex.mouth;
    const nearS = k.near;
    const line = col(fs.mouthCol || K.rosewood), dark = col(fs.mouthDark || K.maroon), teeth = col(K.white), teethS = col(K.mist), tongue = col(K.pinkrose), lipC = col(K.salmon);
    const M = (x, y, dz = 0.006) => k.hp(x, my + y, dz);
    const ptsOf = (f, n = 10) => sampleCurve(f, n);
    if (fs.mouthShape === 'maho') { // lipless toothy grin (canon): a wide band of teeth, dark gaps, no lips
      const w = mw * 1.25, cornUp = 0.03;
      const up = ptsOf(t => M(lerp(-w, w, t), cornUp * pow(abs(t - 0.5) * 2, 2) + 0.018, 0.01), 16);
      const lo = ptsOf(t => M(lerp(w, -w, t), cornUp * pow(abs(t - 0.5) * 2, 2) - 0.024 + 0.012 * pow(abs(t - 0.5) * 2, 2), 0.01), 16);
      const poly = up.concat(lo.slice(1)).map(p => [p[0], p[1]]);
      const mk = polyMask(poly);
      let x0 = 1e9, x1 = -1e9; for (const p of poly) { x0 = min(x0, p[0]); x1 = max(x1, p[0]); }
      const nT = 12, midY = (up[8][1] + lo[8][1]) / 2;
      for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) {
        if (!mk.m[yy * mk.w + xx]) continue;
        const X = mk.x0 + xx, Y = mk.y0 + yy, u = (X + 0.5 - x0) / max(1, x1 - x0);
        const gap = abs(((u * nT) % 1) - 0.5) > 0.44 || abs(Y + 0.5 - midY) < 0.6;
        fset(X, Y, gap ? col(K.dusk) : (Y < midY ? col(K.white) : col(K.mist)));
      }
      fstroke(up, () => 1, col(K.dusk), 0.5); fstroke(lo, () => 1, col(K.dusk), 0.5);
      return;
    }
    if (shape === 'line' || shape === 'firm' || shape === 'soft' || shape === 'smile' || shape === 'smirk' || shape === 'sneer' || shape === 'tired') {
      let wL = mw, wR = mw, upL = 0, upR = 0, sag = 0;
      if (shape === 'firm') { wL = wR = mw * 0.92; upL = upR = -0.006; sag = 0.004; }
      if (shape === 'soft') { wL = wR = mw * 0.8; upL = upR = 0.003; }
      if (shape === 'smile') { wL = wR = mw * 1.1; upL = upR = 0.02; sag = -0.012; }
      if (shape === 'tired') { wL = wR = mw * 0.95; upL = upR = 0.012; sag = -0.006; }
      // smirk / sneer: unilateral lip-corner raise (FACS AU12/AU14 on one side) — near side for the smirk
      const ns = nearS; // head-local sign of the near side
      if (shape === 'smirk') { if (ns < 0) { upL = 0.03; wL = mw * 1.12; upR = 0.004; } else { upR = 0.03; wR = mw * 1.12; upL = 0.004; } sag = -0.004; }
      if (shape === 'sneer') { if (ns < 0) { upL = 0.024; wL = mw * 1.05; upR = -0.006; } else { upR = 0.024; wR = mw * 1.05; upL = -0.006; } }
      const pts = ptsOf(t => { const x = lerp(-wL, wR, t); const cornerL = (1 - t) * (1 - t), cornerR = t * t; const y = upL * sstep(0.45, 0, t) * 1.0 + upR * sstep(0.55, 1, t) + sag * sin(PI * t) - (cornerL + cornerR) * 0; return M(x, y); }, 12);
      const th = max(1, round(px * 0.9));
      fstroke(pts, u => (u > 0.2 && u < 0.8 ? th : 1), line, 0.5);
      // corner accents: the raised corner gets a dimple pixel (cheek push)
      if (shape === 'smirk' || shape === 'smile' || shape === 'sneer') {
        const cornerX = shape === 'smile' ? [-1, 1] : [ns];
        for (const cs of cornerX) { const p = M(cs < 0 ? -(cs === ns && shape !== 'smile' ? wL : wL) - 0.012 : wR + 0.012, (cs < 0 ? upL : upR) + 0.012); fset(round(p[0]), round(p[1]), col(K.salmon)); }
      }
      if (shape === 'tired' && px >= 1) { const p = M(0, -0.012); fset(round(p[0]), round(p[1]), dark); fset(round(p[0]) + 1, round(p[1]), dark); }
      // lower lip hint (lit)
      if (px >= 1.1 && shape !== 'sneer') { const p = M(0, -0.03); fset(round(p[0]), round(p[1]), col(K.peach)); }
      return;
    }
    // open shapes: outline polygon upper lip (corner → top centre → corner), lower lip (corner → bottom → corner)
    let w = mw, top = 0.012, bot = -0.05, cornUp = 0, teethTop = true, teethBot = false, clench = false, tongueOn = false, asym = 0;
    if (shape === 'grin') { w = mw * (fs.grinW || 1.5); top = 0.012; bot = -0.05; cornUp = 0.045; teethTop = true; teethBot = true; asym = fs.grinAsym || 0; }
    if (shape === 'laugh') { w = mw * 1.3; top = 0.02; bot = -0.085; cornUp = 0.022; tongueOn = true; }
    if (shape === 'o') { w = mw * 0.5; top = 0.02; bot = -0.06; cornUp = 0; teethTop = false; }
    if (shape === 'teeth') { w = mw * 1.25; top = 0.018; bot = -0.03; cornUp = -0.008; clench = true; teethBot = true; }
    const cl = [-w, cornUp + (asym && nearS < 0 ? asym : 0)], cr = [w, cornUp + (asym && nearS > 0 ? asym : 0)];
    const up = ptsOf(t => { const x = lerp(cl[0], cr[0], t), y = lerp(cl[1], cr[1], t) + (top - (cl[1] + cr[1]) / 2 * 0) * sin(PI * t) * (shape === 'o' ? 1 : 0.55); return M(x, y); }, 12);
    const lo = ptsOf(t => { const x = lerp(cr[0], cl[0], t), y = lerp(cr[1], cl[1], t) + bot * pow(sin(PI * t), shape === 'o' ? 1 : 0.8); return M(x, y); }, 12);
    const poly = up.concat(lo.slice(1)).map(p => [p[0], p[1]]);
    const mk = polyMask(poly);
    // interior
    let minY = 1e9, maxY = -1e9;
    for (const p of poly) { minY = min(minY, p[1]); maxY = max(maxY, p[1]); }
    const hgt = max(1, maxY - minY);
    const tb = clench ? hgt : max(1, round(hgt * (shape === 'grin' ? 0.42 : 0.3)));
    for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) {
      if (!mk.m[yy * mk.w + xx]) continue;
      const X = mk.x0 + xx, Y = mk.y0 + yy, ry = Y + 0.5 - minY;
      let c = dark;
      if (teethTop && ry < tb) c = teeth;
      if (teethBot && ry > hgt - max(1, round(hgt * 0.3)) && !clench) c = teethS;
      if (clench) c = (ry > hgt * 0.5 && ry < hgt * 0.5 + 1) ? teethS : teeth;
      if (tongueOn && ry > hgt * 0.62) c = tongue;
      fset(X, Y, c);
    }
    if (clench && px >= 1) { // tooth gaps
      for (let j = 1; j < 4; j++) { const p = M(lerp(-w, w, j / 4) , -0.006); fset(round(p[0]), round(p[1]), teethS); }
    }
    // outline
    fstroke(up, u => 1, line, 0.5);
    fstroke(lo, u => 1, line, 0.5);
    if (fs.fangs && (shape === 'grin' || shape === 'laugh')) { // pointed canines (Sukuna)
      for (const cs of [-1, 1]) { const p = M(cs * w * 0.55, top * 0.2); fset(round(p[0]), round(p[1]) + 1, teeth); fset(round(p[0]), round(p[1]) + 2, teeth); }
    }
  }
  // fabric folds: 1-px lines in body space on a given part, colour picked from the tone under each pixel (sel-out style)
  function drawFolds(k, pid, lines, colLit, colShade) {
    const prev = F.allow; F.allow = new Uint8Array(1024); F.allow[pid] = 1;
    const M2 = k.P.bodyM;
    for (const ln of lines) {
      for (let j = 0; j + 1 < ln.length; j++) {
        const a = k.D.project(mP(M2, ln[j])), b = k.D.project(mP(M2, ln[j + 1]));
        const n = max(2, ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
        for (let i = 0; i <= n; i++) {
          const x = round(lerp(a[0], b[0], i / n)), y = round(lerp(a[1], b[1], i / n));
          if (x < 0 || y < 0 || x >= k.D.W || y >= k.D.H) continue;
          const ii = y * k.D.W + x;
          if (GB.depth[ii] > lerp(a[2], b[2], i / n) + 0.08) continue; // hidden behind something nearer
          fset(x, y, GB.tone[ii] >= 2 ? k.col(colLit) : k.col(colShade));
        }
      }
    }
    F.allow = prev;
  }
  function drawBleed(k) { // thin nosebleed line from the near nostril over the lip (bleed 0..1 = length)
    const { hp, px, col, fs } = k;
    const L = clamp(+k.o.bleed, 0, 1);
    const nsx = k.near * 0.03, y0 = (fs.noseY || -0.225) - 0.01, y1 = lerp(y0, -0.47, L);
    const c = col(K.crimson), c2 = col(K.maroon);
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const y = lerp(y0, y1, i / n), x = nsx + sin(i * 0.7) * 0.004 * (i > 5 ? 1 : 0);
      const p = hp(x, y, 0.008);
      fset(round(p[0]), round(p[1]), i < 2 ? c2 : c);
      if (px >= 1.6 && i > 1 && i < n) fset(round(p[0]) + (k.near < 0 ? -1 : 1), round(p[1]), c2);
    }
    const e = hp(nsx, y1, 0.008); fset(round(e[0]), round(e[1]) + 1, c); // drop
  }
  function drawSweat(k) { // anime sweat drops at the temple + forehead sheen
    const { hp, px, col } = k;
    const n = clamp(round(+k.o.sweat * 3), 1, 3);
    const spots = [[k.near * -0.26, 0.2], [k.near * 0.3, 0.06], [k.near * -0.08, 0.26]];
    for (let j = 0; j < n; j++) {
      const p = hp(spots[j][0], spots[j][1], 0.03);
      const r = max(1, round(px * (j === 0 ? 1.8 : 1.3)));
      const cx = round(p[0]), cy = round(p[1]);
      // teardrop: point up, round bottom, outlined
      for (let yy = -r * 2; yy <= r; yy++) {
        const hw2 = yy < 0 ? round(r * (1 + yy / (r * 2))) : round(sqrt(max(0, r * r - yy * yy)));
        for (let xx = -hw2; xx <= hw2; xx++) fset(cx + xx, cy + yy, abs(xx) === hw2 || yy === r || yy === -r * 2 ? col(K.steel) : col(K.ice));
      }
      fset(cx - (r > 1 ? 1 : 0), cy - (r > 1 ? 1 : 0), col(K.white));
    }
  }
  function drawHurt(k) { // scuffs only: dust smudges + a light graze (no wounds)
    const { hp, px, col } = k;
    const L = clamp(+k.o.hurt, 0, 1);
    const smudge = [[k.near * 0.2, -0.2], [k.near * -0.1, 0.18], [k.near * 0.26, -0.36]];
    const n = L > 0.66 ? 3 : L > 0.33 ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const p = hp(smudge[j][0], smudge[j][1]);
      const r = max(1, round(px * 2.2));
      for (let yy = -r; yy <= r; yy++) for (let xx = -r * 2; xx <= r * 2; xx++) {
        if ((xx * xx) / 4 + yy * yy > r * r) continue;
        if (((xx + yy * 3 + j) & 3) === 0 || ((xx * 7 + yy * 5) & 7) === 1) fset(round(p[0]) + xx, round(p[1]) + yy, col(j === 1 ? K.sand : K.rosewood));
      }
    }
    // graze line on the near cheekbone
    const a = hp(k.near * 0.24, -0.09), b = hp(k.near * 0.16, -0.14);
    fline(a[0], a[1], b[0], b[1], col(K.salmon));
  }

  // ---- high-detail eye painter (extreme close-ups, px ≥ 3): sclera shading bands + caruncle, iris with procedural
  // radial fibres / collarette / limbal ring, pupil, window highlights, Six-Eyes sparkles, tapered lash line with
  // individual lash strands, lower lashes, lid crease.
  function drawEyeHD(k, sd, g, E, EC, ex) {
    const { D, px, col } = k;
    const cy = E.cy;
    const P3 = (u, v, dz = 0.006) => k.hp(g.X(u), cy + v, dz);
    const N = 40;
    const upper = sampleCurve(t => { const p = bez3(g.ic, g.u1, g.u2, g.oc, t); return P3(p[0], p[1]); }, N);
    const lower = sampleCurve(t => { const p = bez3(g.oc, g.l1, g.l2, g.ic, t); return P3(p[0], p[1]); }, N);
    const lashC = col(EC.lash), lashHi = col(EC.lashHi || EC.lash);
    const lashT = (E.lashT || 1.6) * px;
    const out = u => (u > 0.5 ? 1 + (E.lashOut === undefined ? 1 : E.lashOut) * 0.35 * sstep(0.5, 0.95, u) : 1);
    const closed = g.up < 0.12;
    const drawLashes = (curve, shut) => { // individual lash strands fanning from the outer 85% of the lid
      if (!E.lashes && !EC.lashAll) return;
      const n = round(clamp(px * 1.6, 6, 22));
      for (let j = 0; j < n; j++) {
        const u = 0.15 + 0.85 * (j + HT.hash(j, 61) * 0.6) / n;
        const idx = clamp(round(u * N), 1, N - 1);
        const p = curve[idx], q2 = curve[idx - 1];
        const tx = p[0] - q2[0], ty = p[1] - q2[1], tl = Math.hypot(tx, ty) || 1;
        // outward normal of the lid (screen up) turning toward the outer corner with u
        let nx = ty / tl, ny = -tx / tl; if ((shut ? -ny : ny) > 0) { nx = -nx; ny = -ny; }
        const sideT = (tx / tl) * (0.25 + 1.1 * u * u);
        let dx = nx + sideT, dy = ny + (shut ? 0.2 : -0.1); const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const len = (0.012 + 0.055 * u * u * (E.lashLen || 1)) * D.s * (0.85 + 0.3 * HT.hash(j, 62));
        const wid = max(1, round(px * 0.35 * (1 - u * 0.3)));
        const steps = max(2, ceil(len));
        const y0 = shut ? p[1] + lashT * 0.45 : p[1] - lashT * out(u) * 0.95; // root just outside the lash line
        for (let i = 0; i < steps; i++) {
          const t = i / steps, curl = t * t * 0.35;
          const x = p[0] + dx * len * t + (tx / tl) * len * curl * 0.6, y = y0 + dy * len * t - (shut ? -1 : 1) * len * curl * 0.25;
          const ww = max(1, round(wid * (1 - t * 0.7)));
          for (let a = 0; a < ww; a++) fset(round(x) + a, round(y), t > 0.1 && EC.lashHi ? lashHi : lashC);
        }
      }
    };
    if (closed) {
      const happy = ex.lid.happy && D.A.blink === 0;
      const mid = happy ? E.hU * 0.55 : -E.hL * 0.35;
      const pts = sampleCurve(t => { const u = lerp(-g.hw, g.hw, t); return P3(u, lerp(g.ic[1], g.oc[1], t) + mid * sin(PI * t)); }, N);
      fstroke(pts, u => max(1, round(lashT * (u < 0.15 ? 0.6 : 1) * out(u))), lashC, happy ? 0.3 : 0.5);
      if (!happy) drawLashes(pts, true);
      return;
    }
    const poly = upper.concat(lower.slice(1)).map(p => [p[0], p[1]]);
    const mk = polyMask(poly);
    // per-column lid extents inside the mask
    const top = new Float32Array(mk.w).fill(1e9), bot = new Float32Array(mk.w).fill(-1e9);
    for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) if (mk.m[yy * mk.w + xx]) { const Y = mk.y0 + yy; if (Y < top[xx]) top[xx] = Y; if (Y > bot[xx]) bot[xx] = Y; }
    const eL = upper[0], eR = upper[N];
    const look = D.o.look || [0, 0];
    const iu = clamp(look[0] * sd * g.hw * 0.42, -g.hw * 0.5, g.hw * 0.5), iv = -look[1] * E.hU * 0.25 + (E.irisV || -0.05) * E.hU;
    const ic2 = P3(iu, iv), ir3 = E.iris * (ex.eyes === 'wide' ? 0.92 : 1);
    const fsx = clamp(abs(eR[0] - eL[0]) / (2 * g.hw * D.s), 0.3, 1.05);
    const irx = ir3 * D.s * fsx * (E.irisW || 0.86), iry = ir3 * D.s;
    const pr = (E.pupil || 0.42) * ex.pupil;
    const glow = ex.glow || EC.alwaysGlow;
    const R = EC.hd || { ring: EC.ring, dark: EC.iris[0], mid: EC.iris[1], light: EC.iris[2], hi: K.white, pupil: EC.pupil };
    const irisTone = [col(R.ring), col(R.dark), col(R.mid), col(R.light), col(R.hi)];
    const pupC = col(R.pupil), pupRing = col(R.pupilRing || R.ring);
    const sclW = col(EC.scl), sclM = col(EC.sclTop), sclS = col(EC.sclDeep || K.steel), car = col(K.pinkrose), carL = col(K.salmon);
    const seed = (k.fs.seed || 7) + (sd > 0 ? 13 : 0);
    const dirSign = sd * (k.P.face >= 0 ? 1 : 1);
    for (let yy = 0; yy < mk.h; yy++) for (let xx = 0; xx < mk.w; xx++) {
      if (!mk.m[yy * mk.w + xx]) continue;
      const X = mk.x0 + xx, Y = mk.y0 + yy, cx = X + 0.5, cy2 = Y + 0.5;
      const hgt = max(1, bot[xx] - top[xx] + 1), tv = (Y - top[xx]) / hgt;
      const ux = (cx - eL[0]) / ((eR[0] - eL[0]) || 1); // 0 at the inner corner → 1 outer (screen param along the eye)
      const uo = ux; // inner=0 for both eyes because the curves start at the inner corner
      const dx = (cx - ic2[0]) / irx, dy = (cy2 - ic2[1]) / iry, rr = sqrt(dx * dx + dy * dy);
      let c;
      if (rr <= 1) {
        const ang = Math.atan2(dy, dx);
        const fib = HT.noise(ang * 7.5 + seed, rr * 2.2, seed) * 0.65 + HT.noise(ang * 19 + seed * 3, rr * 5, seed + 5) * 0.35;
        let tone = 2;
        const lb = EC.irisLift || 0;
        if (fib > 0.6 - lb) tone = 3; else if (fib < 0.36 - lb) tone = 1;
        if (rr > 0.86) tone = rr > 0.93 ? 0 : 1;                        // limbal ring
        else if (rr > pr + 0.1 && rr < pr + 0.24) tone = glow ? 4 : 3;   // collarette (bright ring round the pupil)
        if (tv < 0.3 + (1 - rr) * 0.05) tone = max(0, tone - 1);          // upper-lid shadow over the iris
        if (tv < 0.14) tone = 0;
        c = irisTone[tone];
        if (rr < pr) c = rr > pr - 0.06 ? pupRing : pupC;
        if (glow && EC.sparkHD && rr > pr + 0.2 && rr < 0.84 && HT.hash(floor(cx / max(1, px * 0.8)) * 131 + floor(cy2 / max(1, px * 0.8)), seed) > 0.975) c = col(K.white);
      } else {
        c = tv < 0.1 ? sclS : tv < 0.24 ? sclM : sclW;
        if (uo < 0.12 || uo > 0.9) c = tv < 0.2 ? sclS : sclM;          // corners in shade
        if (uo < 0.07 && tv > 0.25) c = uo < 0.04 ? car : carL;            // caruncle (inner corner)
      }
      fset(X, Y, c);
    }
    // highlights: main window toward the key light (upper), secondary opposite-low, plus a thin rim reflection
    const hiC = col(K.white), hi2C = col(EC.hi2c || K.white);
    const hx = ic2[0] + k.lightSide * irx * 0.34, hy = ic2[1] - iry * 0.38;
    const hrx = irx * 0.26, hry = iry * 0.2;
    for (let yy = -ceil(hry); yy <= ceil(hry); yy++) for (let xx = -ceil(hrx); xx <= ceil(hrx); xx++) {
      if ((xx * xx) / (hrx * hrx) + (yy * yy) / (hry * hry) > 1) continue;
      const X = round(hx + xx), Y = round(hy + yy);
      if (mk.m[(Y - mk.y0) * mk.w + (X - mk.x0)] && X >= mk.x0 && X < mk.x0 + mk.w) fset(X, Y, hiC);
    }
    const sx2 = ic2[0] - k.lightSide * irx * 0.42, sy2 = ic2[1] + iry * 0.46, sr = max(1, irx * 0.09);
    for (let yy = -ceil(sr); yy <= ceil(sr); yy++) for (let xx = -ceil(sr); xx <= ceil(sr); xx++) if (xx * xx + yy * yy <= sr * sr) { const X = round(sx2 + xx), Y = round(sy2 + yy); if (X >= mk.x0 && X < mk.x0 + mk.w && mk.m[(Y - mk.y0) * mk.w + (X - mk.x0)]) fset(X, Y, hi2C); }
    // lash line: thick, tapering at the inner corner, heavier at the outer end, flaring into a small wing
    fstroke(upper, u => max(1, round(lashT * (u < 0.18 ? lerp(0.45, 1, u / 0.18) : 1) * out(u))), lashC, 0.85);
    if (EC.lashRim) fstroke(upper, u => (u > 0.08 && u < 0.97 ? max(1, round(px * 0.45)) : 0), col(EC.lashRim), -0.02);
    const oc = upper[N], pre = upper[N - 3];
    const fx = oc[0] - pre[0], fy = oc[1] - pre[1], fl = Math.hypot(fx, fy) || 1;
    const flen = (E.flick || 1.6) * px * 1.4;
    for (let i = 0; i < flen; i++) {
      const t = i / flen, wv = max(1, round(lashT * out(1) * (1 - t) * 0.9));
      const x = oc[0] + fx / fl * i, y = oc[1] + fy / fl * i + (E.flickDrop || 0.5) * i - lashT * 0.4;
      for (let a = 0; a < wv; a++) fset(round(x), round(y) + a - round(wv / 2), lashC);
    }
    drawLashes(upper, false);
    // lower lid: thin line on the outer 60%, a few short lower lashes
    const lowC = col(EC.lower || K.rosewood);
    const lw = max(1, round(px * 0.45));
    fstroke(lower.slice(0, round(N * 0.62)), u => (u < 0.85 ? lw : max(1, lw - 1)), lowC, 0.2);
    if (E.lashes) for (let j = 0; j < 7; j++) {
      const idx = round(N * (0.05 + j * 0.07)), p = lower[idx];
      const len = (0.006 + 0.012 * (1 - j / 7)) * D.s;
      for (let i = 0; i < len; i++) fset(round(p[0] + dirSign * 0 + (j < 3 ? 1 : 0) * i * 0.4 * (eR[0] > eL[0] ? 1 : -1)), round(p[1] + i + 1), lashHi);
    }
    // crease above the lid
    if (E.crease && g.up > 0.45) {
      const cr = sampleCurve(t => { const p = bez3(g.ic, g.u1, g.u2, g.oc, t); return P3(p[0] * 0.92 + g.hw * 0.06, p[1] + E.hU * E.crease); }, N);
      fstroke(cr.slice(round(N * 0.25), round(N * 0.92)), u => max(1, round(px * 0.4)), col(EC.creaseC || K.salmon), 0.5);
    }
  }
  // ---- extreme close-up: the eye band rendered at full resolution (not an upscale)
  B.eyes = (ctx, who, x, y, w, o = {}) => {
    const spec = CH[who];
    const fsE = spec.faceSpec && spec.faceSpec.eye || { cy: -0.05 };
    const half = spec.ecuHalf || 0.4;
    const s = w / (2 * half);
    const band = who === 'sukuna' ? [0.17, -0.235] : who === 'mahoraga' ? [0.3, -0.3] : [0.16, -0.155];
    const y0 = fsE.cy + band[0], h = band[0] - band[1];
    const oo = Object.assign({ turn: 1, face: 1 }, o, { size: s * 2.3, crop: [-half, y0, 2 * half, h], breath: false, headStill: o.headStill !== false });
    if (o.open2 !== undefined) oo.open2 = o.open2;
    const r = B.render(who, oo);
    const dx = round(x - r.W / 2), dy = round(y - r.H / 2);
    ctx.drawImage(r.canvas, dx, dy);
    if (spec.overlay && !o.mono) spec.overlay(ctx, Object.assign({}, r, { ox: 0 }), dx, dy, oo);
    return r;
  };

  B.kit = { PID, GRP, RECV, K, mat, profile, surfZ, headRings, gridMesh, tubeMesh, capsuleMesh, ellipsoidMesh, mP, mN, mRotX, mRotY, mRotZ, mTr, mChain, mAbout, sph, vadd, vsub, vmul, vnorm, vlerp, bez2, bez3,
    poseOf, addNeck, addTorso, addArm, addHead, addCap, addLock, addHair, faceKit, fset, fline, fpoly, fstroke, polyMask, sampleCurve, F, GB, drawEye, eyeCurves };

  // ================================================================== GOJO SATORU
  // >190 cm, lean; white tousled spiky hair (volume up and out, strands over the forehead); bright light-blue Six Eyes with
  // fine white lashes; fair skin. Costumes: fight (black crew-neck tee), robe (pale loose robe + dark scarf), uniform (black
  // high collar + small round black sunglasses).
  const GOJO_HEAD = [ // [y, W, zc, zf, zb, nF, cornerBump]
    [0.505, 0.03, -0.03, 0.0, -0.06, 2.0, 0],
    [0.45, 0.18, -0.03, 0.14, -0.21, 2.1, 0],
    [0.37, 0.28, -0.03, 0.25, -0.325, 2.2, 0],
    [0.25, 0.338, -0.03, 0.318, -0.382, 2.4, 0.0],
    [0.12, 0.358, -0.035, 0.347, -0.398, 2.6, 0.012],
    [0.03, 0.356, -0.045, 0.336, -0.385, 2.9, -0.02],
    [-0.06, 0.352, -0.05, 0.336, -0.34, 3.0, -0.026],
    [-0.15, 0.338, -0.045, 0.342, -0.26, 3.0, 0.016],
    [-0.25, 0.305, -0.03, 0.338, -0.16, 2.9, 0.008],
    [-0.34, 0.25, 0.01, 0.318, -0.06, 2.7, 0],
    [-0.415, 0.18, 0.055, 0.288, 0.02, 2.5, 0],
    [-0.47, 0.105, 0.1, 0.255, 0.085, 2.3, 0],
    [-0.5, 0.04, 0.14, 0.222, 0.125, 2.0, 0],
  ];
  const TORSO_M = [ // [y, W, zc, zf, zb, n]
    [-0.62, 0.15, -0.08, 0.05, -0.2, 2.0],
    [-0.69, 0.31, -0.07, 0.1, -0.22, 2.2],
    [-0.76, 0.5, -0.06, 0.15, -0.24, 2.4],
    [-0.83, 0.63, -0.05, 0.19, -0.25, 2.6],
    [-0.91, 0.69, -0.04, 0.23, -0.26, 2.8],
    [-1.03, 0.71, -0.03, 0.27, -0.26, 2.8],
    [-1.25, 0.7, -0.03, 0.29, -0.25, 2.8],
    [-1.5, 0.68, -0.03, 0.28, -0.24, 2.6],
    [-1.85, 0.64, -0.03, 0.26, -0.23, 2.4],
  ];
  const GOJO_LOCKS = [
    // windswept combat hair (research: bangs hang down; windswept spikes in combat): long clumps sweeping back/up
    { az: -30, el: 62, taz: -150, tel: 56, len: 0.5, w: 0.14, curl: 16 },
    { az: 20, el: 64, taz: 152, tel: 58, len: 0.5, w: 0.14, curl: -16 },
    { az: -72, el: 50, taz: -132, tel: 42, len: 0.48, w: 0.13, curl: 10 },
    { az: 76, el: 50, taz: 132, tel: 40, len: 0.48, w: 0.13, curl: -10 },
    // crown volume (up, curling)
    { az: -5, el: 76, taz: -24, tel: 74, len: 0.4, w: 0.145, curl: 22 },
    { az: 32, el: 56, taz: 48, tel: 66, len: 0.38, w: 0.13, curl: -22 },
    { az: -42, el: 54, taz: -60, tel: 64, len: 0.38, w: 0.13, curl: 16 },
    // sides: out and a little down
    { az: -100, el: 30, taz: -118, tel: 12, len: 0.36, w: 0.12, curl: -10 },
    { az: 102, el: 30, taz: 120, tel: 10, len: 0.36, w: 0.12, curl: 10 },
    { az: -136, el: 14, taz: -146, tel: -8, len: 0.3, w: 0.115, noUnder: true },
    { az: 136, el: 14, taz: 146, tel: -8, len: 0.3, w: 0.115, noUnder: true },
    { az: -70, el: 22, taz: -86, tel: -4, len: 0.27, w: 0.1, curl: 12, noUnder: true },
    { az: 70, el: 22, taz: 86, tel: -4, len: 0.27, w: 0.1, curl: -12, noUnder: true },
    // back
    { az: 180, el: 40, taz: 180, tel: 22, len: 0.36, w: 0.13, noUnder: true },
    { az: -160, el: 4, taz: -166, tel: -40, len: 0.22, w: 0.11, noUnder: true },
    { az: 160, el: 4, taz: 166, tel: -40, len: 0.22, w: 0.11, noUnder: true },
    { az: 180, el: -6, taz: 180, tel: -50, len: 0.2, w: 0.11, noUnder: true },
    // front top: rising off the hairline, up and a little forward
    { az: -20, el: 47, taz: -30, tel: 70, len: 0.34, w: 0.12, curl: 10, noUnder: true },
    { az: 18, el: 47, taz: 26, tel: 68, len: 0.34, w: 0.12, curl: -10, noUnder: true },
    // fringe over the forehead (tips on the face)
    { az: -56, el: 29, tip: [-0.33, 0.1], w: 0.11, bulge: 0.07, curl: -8 },
    { az: -38, el: 35, tip: [-0.22, 0.05], w: 0.12, bulge: 0.08, curl: 6 },
    { az: -19, el: 40, tip: [-0.11, 0.0], w: 0.115, bulge: 0.085, curl: -5 },
    { az: 0, el: 43, tip: [0.0, -0.045], w: 0.11, bulge: 0.09, curl: 6 },
    { az: 19, el: 40, tip: [0.11, 0.01], w: 0.115, bulge: 0.085, curl: -6 },
    { az: 38, el: 35, tip: [0.22, 0.06], w: 0.12, bulge: 0.08, curl: 7 },
    { az: 56, el: 29, tip: [0.33, 0.1], w: 0.11, bulge: 0.07, curl: 8 },
  ];
  const gojoMats = {
    skin: () => mat({ ramp: [C.salmon, C.peach, C.cream, C.cream], th: [-0.5, 0.0, 2], line: C.rosewood, lineLit: C.salmon, out: C.ink, outLit: C.rosewood, shCap: -0.05, mono: [C.steel, C.steel, C.white, C.white] }),
    hair: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.12, 0.34, 2], lineD: 0.1, line: C.lilacgrey, lineLit: C.steel, out: C.ink, outLit: C.lilacgrey, hi: C.white, hi2: C.white, hiTh: 0.975, shCap: 0.05, mono: [C.steel, C.white, C.white, C.white], monoLine: C.dusk }),
    tee: () => mat({ ramp: [C.ink, C.ink, C.shadow, C.indigo], th: [-0.3, 0.02, 0.84], line: C.ink, lineLit: C.ink, out: C.ink, mono: [C.ink, C.ink, C.ink, C.dusk] }),
    teeRib: () => mat({ ramp: [C.ink, C.shadow, C.dusk, C.lilacgrey], th: [-0.3, 0.05, 0.6], line: C.ink, out: C.ink, mono: [C.ink, C.ink, C.dusk, C.steel] }),
  };
  B.define({
    name: 'gojo', seed: 11, yaw3q: 34,
    frame: { top: 0.98, bot: -1.45, half: 1.32 },
    build(c) {
      const P = poseOf(c), o = c.o;
      const costume = o.costume || 'fight';
      const prof = profile(GOJO_HEAD);
      const skin = c.addMat('skin', gojoMats.skin()), hair = c.addMat('hair', gojoMats.hair());
      const tee = c.addMat('tee', gojoMats.tee()), rib = c.addMat('rib', gojoMats.teeRib());
      c.recv = RECV;
      c.headCenter = mP(P.headM, [0, 0, 0]);
      // body
      const neckY = (x, z) => -0.74 - 0.05 * max(0, z + 0.075) / 0.165;
      const ARM = { x0: 0.62, y0: -0.99, x1: 0.78, y1: -2.1, r0: 0.158, r1: 0.14 };
      addNeck(c, P, { mat: skin, r: 0.148, rz: 0.138, bot: -0.95 });
      if (costume === 'uniform') addUniform(c, P, TORSO_M, ARM);
      else if (costume === 'robe') addRobe(c, P, TORSO_M, ARM);
      else {
        addTorso(c, P, { rows: TORSO_M, mat: tee, matFn: (x, y, z) => (y > neckY(x, z) + 0.005 ? skin : tee) });
        for (const sd of [-1, 1]) addArm(c, P, sd, Object.assign({}, ARM, { mat: tee, matFn: (x, y) => (y > -1.42 ? tee : skin) }));
        // crew-neck rib
        const ring = [];
        for (let k2 = 0; k2 <= 24; k2++) { const a = (k2 / 24) * 2 * PI; const z = -0.075 + 0.172 * cos(a); ring.push([0.186 * sin(a), neckY(0, z) + 0.004, z]); }
        c.add(tubeMesh(ring, ring.map(() => 0.024), ring.map(() => 0.02), 6, [0, 1, 0], { pid: PID.collar, grp: GRP.cloth, mat: rib, M: P.bodyM, bias: 0.05 }));
      }
      // head
      addHead(c, P, prof, { skin, bias: 0.08 });
      // hair
      const keep = (x, y, z) => {
        if (z > 0.1) return y > 0.24 - 0.12 * (x * x) / 0.1 ? hair : 0;
        if (z > -0.06) return y > lerp(-0.06, 0.12, (z + 0.06) / 0.16) ? hair : 0;
        return y > -0.3 ? hair : 0;
      };
      addCap(c, P, prof, { mat: hair, keep, grow: 0.04, bot: -0.32 });
      const center = [0, 0.06, -0.035];
      addHair(c, P, GOJO_LOCKS, { center, radius: 0.395, mat: hair, prof, specShift: 0.1, specPow: 24, vary: 1, seed: 3 });
      return faceKit(c, P, prof, GOJO_FACE);
    },
  });
  const GOJO_FACE = {
    eye: { cx: 0.162, cy: -0.05, hw: 0.096, hU: 0.066, hL: 0.04, tilt: 0.05, iris: 0.057, irisW: 0.9, irisV: -0.08, pupil: 0.4, lashT: 1.8, lashOut: 1, flick: 2.6, flickDrop: 0.4, crease: 0.5, lashes: true, hiSize: 1.8, hi2: true },
    eyeCol: { hd: { ring: K.navy, dark: K.blue, mid: K.sky, light: K.ice, hi: K.white, pupil: K.navy, pupilRing: K.blue }, irisLift: 0.14, sparkHD: true, hi2c: K.ice, lashRim: K.indigo, lash: K.navy, lashHi: K.white, lower: K.lilacgrey, scl: K.white, sclTop: K.mist, sclShade: K.mist, iris: [K.blue, K.sky, K.ice], irisGlow: [K.sky, K.ice, K.white], ring: K.blue, ringGlow: K.sky, pupil: K.navy, pupilGlow: K.blue, hi: K.white, glowFx: K.foam, spark: true, creaseC: K.peach },
    brow: { x0: 0.07, x1: 0.26, y: 0.105, arch: 0.014, drop: -0.018, t0: 2.2, t1: 1.1 },
    browCol: K.steel, browCol2: K.mist, browEdge: K.lilacgrey,
    mouthY: -0.335, mouthW: 0.108, noseY: -0.215,
    after(k) {
      const cos2 = k.o.costume || 'fight';
      if (cos2 === 'uniform' && k.o.glasses !== false) drawGlasses(k);
      if (cos2 === 'fight') drawFolds(k, PID.torso, [
        [[-0.5, -1.02, 0.18], [-0.34, -1.12, 0.26], [-0.22, -1.2, 0.29]], [[0.5, -1.02, 0.18], [0.34, -1.12, 0.26], [0.22, -1.2, 0.29]],
        [[-0.44, -1.2, 0.24], [-0.3, -1.3, 0.28]], [[0.44, -1.2, 0.24], [0.3, -1.3, 0.28]],
      ], K.ink, K.ink);
      if (cos2 === 'fight') drawFolds(k, PID.armL, [[[-0.7, -1.2, 0.1], [-0.72, -1.34, 0.12]]], K.ink, K.ink);
      if (cos2 === 'fight') drawFolds(k, PID.armR, [[[0.7, -1.2, 0.1], [0.72, -1.34, 0.12]]], K.ink, K.ink);
    },
  };
  // Six Eyes glow overlay (live, additive)
  CH.gojo.overlay = (ctx, r, dx, dy, o) => {
    if (o.eyes !== 'glow' || !r.anchors.eyes) return;
    const t = floor((o.t || 0) * 12) / 12, k = (0.8 + 0.2 * sin(t * 2 * PI / 1.2)) * (r.s > 200 ? 0.45 : 1);
    for (const e of r.anchors.eyes) { HT.glow(ctx, dx + e[0], dy + e[1], r.s * (r.s > 200 ? 0.13 : 0.2), C.sky, 0.3 * k); HT.glow(ctx, dx + e[0], dy + e[1], r.s * 0.06, C.ice, 0.35 * k); }
  };

  // ================================================================== RYOMEN SUKUNA (in Megumi Fushiguro's body)
  // 175 cm; spiky black "sea-urchin" hair with a blue-black sheen; sharp red eyes, a second pair directly below (closed =
  // dark slit, open = small red eyes); graphic black markings: a crown-like mark mid-forehead, a line across the nose
  // bridge, short cheek marks. Costumes: fight (sleeveless white kimono over a black undershirt, V neckline, bare arms with
  // black double bands on the upper arms) · haori (black haori over it; rooftop).
  const SUK_HEAD = [
    [0.505, 0.03, -0.03, 0.0, -0.06, 2.0, 0],
    [0.45, 0.175, -0.03, 0.14, -0.21, 2.1, 0],
    [0.37, 0.272, -0.03, 0.25, -0.32, 2.2, 0],
    [0.25, 0.33, -0.03, 0.318, -0.378, 2.4, 0.0],
    [0.12, 0.35, -0.035, 0.345, -0.392, 2.6, 0.012],
    [0.03, 0.348, -0.045, 0.336, -0.38, 2.9, -0.022],
    [-0.06, 0.344, -0.05, 0.336, -0.335, 3.0, -0.028],
    [-0.15, 0.326, -0.045, 0.342, -0.255, 3.0, 0.018],
    [-0.25, 0.288, -0.03, 0.336, -0.155, 2.9, 0.008],
    [-0.34, 0.23, 0.01, 0.316, -0.06, 2.7, 0],
    [-0.415, 0.16, 0.055, 0.286, 0.02, 2.5, 0],
    [-0.47, 0.086, 0.1, 0.252, 0.085, 2.3, 0],
    [-0.5, 0.03, 0.14, 0.218, 0.125, 2.0, 0],
  ];
  const TORSO_S = [
    [-0.62, 0.145, -0.08, 0.05, -0.2, 2.0],
    [-0.69, 0.3, -0.07, 0.1, -0.22, 2.2],
    [-0.76, 0.48, -0.06, 0.15, -0.24, 2.4],
    [-0.83, 0.6, -0.05, 0.19, -0.25, 2.6],
    [-0.91, 0.66, -0.04, 0.23, -0.26, 2.8],
    [-1.03, 0.68, -0.03, 0.27, -0.26, 2.8],
    [-1.25, 0.67, -0.03, 0.29, -0.25, 2.8],
    [-1.5, 0.65, -0.03, 0.28, -0.24, 2.6],
    [-1.85, 0.61, -0.03, 0.26, -0.23, 2.4],
  ];
  // sea-urchin spikes: Fibonacci directions over the scalp (face excluded), radial with a slight upward lean + bangs
  const SUK_LOCKS = (() => {
    const L = [], n = 58;
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 1.3, r = sqrt(max(0, 1 - y * y)), th = i * 2.399963;
      const el = Math.asin(y) / D2R, az = Math.atan2(r * sin(th), r * cos(th)) / D2R;
      if (el < -24) continue;
      if (abs(az) < 64 && el < 44) continue; // forehead/face: bangs below
      const h1 = HT.hash(i, 401), h2 = HT.hash(i, 402);
      L.push({ az, el, taz: az + (h1 - 0.5) * 16, tel: min(84, el + 10 + h2 * 8), len: 0.27 + 0.1 * h2 + (el > 40 ? 0.04 : 0), w: 0.082 + 0.02 * h1, curl: (h1 - 0.5) * 18, taper: 0.9, belly: 0.18, push: 0.3 });
    }
    // bangs: spiky clumps pointing down over the forehead (the crown mark shows between them)
    L.push({ az: -50, el: 32, tip: [-0.29, 0.12], w: 0.1, bulge: 0.06, curl: -10, taper: 0.9, belly: 0.15 });
    L.push({ az: -30, el: 40, tip: [-0.17, 0.08], w: 0.1, bulge: 0.07, curl: 8, taper: 0.9, belly: 0.15 });
    L.push({ az: -14, el: 50, tip: [-0.12, 0.2], w: 0.075, bulge: 0.05, curl: -10, taper: 0.9, belly: 0.15 });
    L.push({ az: 16, el: 50, tip: [0.125, 0.19], w: 0.075, bulge: 0.05, curl: 10, taper: 0.9, belly: 0.15 });
    L.push({ az: 30, el: 40, tip: [0.18, 0.07], w: 0.1, bulge: 0.07, curl: -8, taper: 0.9, belly: 0.15 });
    L.push({ az: 50, el: 32, tip: [0.3, 0.12], w: 0.1, bulge: 0.06, curl: 10, taper: 0.9, belly: 0.15 });
    L.push({ az: -66, el: 22, tip: [-0.35, 0.02], w: 0.085, bulge: 0.05, curl: -6, taper: 0.9 });
    L.push({ az: 66, el: 22, tip: [0.35, 0.02], w: 0.085, bulge: 0.05, curl: 6, taper: 0.9 });
    return L;
  })();
  const sukMats = {
    hair: () => mat({ ramp: [C.ink, C.ink, C.ink, C.navy], th: [-0.2, 0.05, 0.52], lineD: 0.1, line: C.ink, lineLit: C.ink, out: C.ink, outLit: C.ink, hi: C.indigo, hi2: C.navy, hiTh: 0.9, ring: [0.5, 0.58, 0.3], ringCol: C.indigo, shCap: -0.3, mono: [C.ink, C.ink, C.ink, C.ink], monoHi: C.white }),
    kimono: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.35, 0.05, 2], line: C.lilacgrey, lineLit: C.steel, out: C.ink, outLit: C.lilacgrey, edge: 2, mono: [C.steel, C.white, C.white, C.white] }),
    collar: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.35, 0.05, 2], line: C.lilacgrey, lineLit: C.steel, out: C.ink, outLit: C.lilacgrey, edge: 3, mono: [C.steel, C.white, C.white, C.white] }),
    under: () => mat({ ramp: [C.ink, C.ink, C.shadow, C.dusk], th: [-0.3, 0.1, 0.85], line: C.ink, out: C.ink, edge: 1, mono: [C.ink, C.ink, C.ink, C.dusk] }),
    band: () => mat({ ramp: [C.ink, C.ink, C.ink, C.shadow], th: [-0.3, 0.1, 0.8], line: C.ink, out: C.ink, edge: 1, mono: [C.ink, C.ink, C.ink, C.ink] }),
    haori: () => mat({ ramp: [C.ink, C.ink, C.ink, C.shadow], th: [-0.3, 0.05, 0.55], line: C.ink, out: C.ink, edge: 2, mono: [C.ink, C.ink, C.ink, C.dusk] }),
    haoriCollar: () => mat({ ramp: [C.ink, C.shadow, C.dusk, C.lilacgrey], th: [-0.3, 0.12, 0.82], line: C.ink, out: C.ink, edge: 3, mono: [C.ink, C.ink, C.dusk, C.steel] }),
  };
  function sukMarks(k) {
    const { hp, col } = k;
    const ink = col(K.ink);
    const polyH = pts => fpoly(pts.map(q => { const p = hp(q[0], q[1], 0.006); return [p[0], p[1]]; }), ink);
    // forehead (canon, research): a dot inside a V of two barbed strokes, the point toward the nose
    const ay = 0.155, ty = 0.262, th = 0.017;
    for (const sd of [-1, 1]) {
      const x1 = sd * 0.074;
      polyH([[0, ay], [x1 + sd * th * 0.2, ty], [x1 - sd * th * 1.2, ty], [sd * -0.004, ay + th * 1.5]]);           // arm
      const bx = sd * 0.047, by = ay + (ty - ay) * 0.6;                                                                // barb (outward spur)
      polyH([[bx, by], [bx + sd * 0.034, by - 0.006], [bx + sd * 0.004, by + 0.018]]);
    }
    polyH([[-0.011, 0.216], [0.011, 0.216], [0.011, 0.236], [-0.011, 0.236]]);                                        // the dot
    // a line across the bridge of the nose (between the inner eye corners, above the lower eyes)
    polyH([[-0.042, -0.05], [0.042, -0.05], [0.038, -0.066], [-0.038, -0.066]]);
    // cheeks (canon): jagged bands from below the mouth corners up to under the lower eyes - clean, two teeth
    for (const sd of [-1, 1]) {
      const P0 = [sd * 0.128, -0.405], P1 = [sd * 0.262, -0.205];
      const dx = P1[0] - P0[0], dy = P1[1] - P0[1], L = Math.hypot(dx, dy), nx = -dy / L * sd, ny = dx / L * sd; // outward normal
      const wd = 0.018, pts = [];
      pts.push([P0[0], P0[1]]);
      for (const t of [0.3, 0.42, 0.62, 0.74]) { const i = pts.length; const tooth = i % 2 === 1 ? 0.024 : 0.006; pts.push([P0[0] + dx * t + nx * (wd + tooth), P0[1] + dy * t + ny * (wd + tooth)]); }
      pts.push([P1[0] + nx * wd * 0.6, P1[1] + ny * wd * 0.6], [P1[0], P1[1]]);
      pts.push([P0[0] + dx * 0.5 - nx * wd * 0.2, P0[1] + dy * 0.5 - ny * wd * 0.2]);
      polyH(pts);
    }
    for (const sd of [-1, 1]) drawEye2(k, sd);
  }
  function drawEye2(k, sd) {
    const fs = k.fs, o = k.o;
    const open = o.open2 !== undefined ? clamp(+o.open2, 0, 1) : (o.eyes2 === 'open' ? 1 : 0);
    const E2 = fs.eye2;
    if (open < 0.15) { // shut: a dark slit, slightly curved
      const pts = sampleCurve(t => { const u = lerp(-E2.hw, E2.hw, t); return k.hp(sd * (E2.cx + u), E2.cy + (E2.tilt || 0) * u * 0.6 - 0.006 * sin(PI * t)); }, 8);
      fstroke(pts, u => (u < 0.2 || u > 0.8 ? 1 : max(1, round(k.px * 1.2))), k.col(K.ink), 0.5);
      return;
    }
    const ex2 = Object.assign({}, k.ex, { lid: { up: min(1, open * 1.05), low: 0, happy: false }, eyes: 'open', glow: false, brow: { raise: 0, tilt: 0, arch: 0, knit: 0 }, pupil: 1 });
    const k2 = Object.assign({}, k, { fs: Object.assign({}, fs, { eye: E2, eyeCol: fs.eyeCol2 || fs.eyeCol }), ex: ex2 });
    drawEye(k2, sd);
  }
  const SUK_FACE = {
    eye: { cx: 0.158, cy: -0.045, hw: 0.092, hU: 0.054, hL: 0.03, tilt: 0.17, inY: -0.004, iris: 0.047, irisW: 0.86, irisV: -0.1, pupil: 0.34, lashT: 1.8, lashOut: 1, flick: 2.8, flickDrop: -0.35, crease: 0, lashes: false, hiSize: 1.2, hi2: false, peakOut: 1.02 },
    eyeCol: { hd: { ring: K.maroon, dark: K.crimson, mid: K.red, light: K.coral, hi: K.salmon, pupil: K.ink, pupilRing: K.maroon }, hi2c: K.salmon, lash: K.ink, lower: K.rosewood, scl: K.white, sclTop: K.mist, sclShade: K.mist, iris: [K.maroon, K.crimson, K.red], irisGlow: [K.crimson, K.red, K.coral], ring: K.maroon, ringGlow: K.crimson, pupil: K.ink, hi: K.white, creaseC: K.peach },
    eyeCol2: { lash: K.ink, lower: K.rosewood, scl: K.white, sclTop: K.mist, sclShade: K.mist, iris: [K.maroon, K.crimson, K.red], irisGlow: [K.crimson, K.red, K.coral], ring: K.maroon, pupil: K.ink, hi: K.coral },
    eye2: { cx: 0.17, cy: -0.158, hw: 0.054, hU: 0.03, hL: 0.018, tilt: 0.14, iris: 0.027, irisW: 0.9, irisV: -0.05, pupil: 0.42, lashT: 1.3, lashOut: 0, flick: 1.3, flickDrop: -0.2, crease: 0, hiSize: 1, hi2: false },
    brow: { x0: 0.07, x1: 0.265, y: 0.1, arch: 0.008, drop: -0.004, t0: 2.6, t1: 1.3 },
    browCol: K.ink,
    mouthY: -0.335, mouthW: 0.112, noseY: -0.215, grinAsym: 0.02, grinW: 1.7,
    extra: sukMarks,
    after(k) {
      drawFolds(k, PID.torso, [
        [[-0.34, -1.0, 0.24], [-0.36, -1.25, 0.28], [-0.35, -1.5, 0.28]], [[0.36, -1.02, 0.24], [0.38, -1.3, 0.28]],
        [[-0.5, -1.1, 0.2], [-0.47, -1.4, 0.24]], [[0.52, -1.16, 0.2], [0.5, -1.45, 0.24]],
      ], K.steel, K.lilacgrey);
    },
  };
  B.define({
    name: 'sukuna', seed: 23, yaw3q: 34,
    frame: { top: 0.94, bot: -1.45, half: 1.32 },
    build(c) {
      const P = poseOf(c), o = c.o;
      const costume = o.costume || 'fight';
      const prof = profile(SUK_HEAD);
      const skin = c.addMat('skin', gojoMats.skin()), hair = c.addMat('hair', sukMats.hair());
      const kim = c.addMat('kimono', sukMats.kimono()), col2 = c.addMat('collar', sukMats.collar()), und = c.addMat('under', sukMats.under()), band = c.addMat('band', sukMats.band());
      c.recv = RECV;
      c.headCenter = mP(P.headM, [0, 0, 0]);
      const neckY = (x, z) => -0.74 - 0.04 * max(0, z + 0.075) / 0.165;
      addNeck(c, P, { mat: skin, r: 0.142, rz: 0.134, bot: -0.95 });
      // kimono: V opening (left panel over right) showing the black undershirt; collar band along the V; sleeveless
      const yV = -1.34, xV = -0.02;
      const vHalf = y => 0.2 * clamp((y - yV) / (-0.74 - yV), 0, 1);
      const kimFn = (x, y, z) => {
        if (y > neckY(x, z) + 0.004) return und;                      // the undershirt's high collar covers the neck base
        if (abs(x) > 0.585 && y > -1.12) return skin;                 // armhole: bare shoulder
        if (z > -0.02) {
          const d = abs(x - xV * (1 - vHalf(y) / 0.2)) - vHalf(y);
          if (d < 0) return und;
          if (d < 0.05 && y > yV - 0.02) return col2;
        }
        return kim;
      };
      addTorso(c, P, { rows: TORSO_S, mat: kim, matFn: kimFn });
      { // the undershirt's high black collar (canon, research) around the neck base
        const pts = [], rw = [], rt = [];
        for (let i = 0; i <= 3; i++) { const u = i / 3; pts.push([0, lerp(-0.76, -0.6, u), lerp(-0.075, -0.085, u)]); rw.push(lerp(0.175, 0.158, u)); rt.push(lerp(0.166, 0.148, u)); }
        const m = c.add(tubeMesh(pts, rw, rt, 20, [0, 0, 1], { pid: PID.collar, grp: GRP.cloth, mat: und, M: P.bodyM, cull: false }));
        m.skin = { MA: P.headM, MB: P.bodyM, w: y => sstep(-0.8, -0.63, y) * 0.35 };
      }
      // bare arms with black double bands on the upper arms
      const AX0 = 0.575, AY0 = -0.99, AX1 = 0.72, AY1 = -2.1;
      const Tl = Math.hypot(AX1 - AX0, AY1 - AY0), tx = (AX1 - AX0) / Tl, ty = (AY1 - AY0) / Tl;
      const armFn = (x, y) => { const u = (x - AX0) * tx + (y - AY0) * ty; return (u > 0.3 && u < 0.338) || (u > 0.372 && u < 0.41) ? band : skin; };
      for (const sd of [-1, 1]) addArm(c, P, sd, { x0: AX0, y0: AY0, x1: AX1, y1: AY1, r0: 0.158, r1: 0.14, mat: skin, matFn: armFn });
      if (costume === 'haori') {
        const hm = c.addMat('haori', sukMats.haori()), hc = c.addMat('haoriCollar', sukMats.haoriCollar());
        const rows = TORSO_S.map(r => [r[0], r[1] + 0.07, r[2], r[3] + 0.05, r[4] - 0.05, r[5]]);
        rows[0] = [-0.66, 0.22, -0.08, 0.1, -0.24, 2.0];
        const open = y => 0.2 + (-0.7 - y) * 0.08;
        const hFn = (x, y, z) => {
          if (z > 0 && abs(x) < open(y)) return 0;                                   // open front
          if (z > 0 && abs(x) < open(y) + 0.07 && y < -0.66) return hc;             // collar band (eri)
          return hm;
        };
        const prof2 = profile(rows, 40);
        c.add(gridMesh(headRings(prof2, 18, 32, 0), { pid: PID.outer, grp: GRP.cloth, mat: hm, matFn: hFn, M: P.bodyM }));
        for (const sd of [-1, 1]) c.add(capsuleMesh([sd * 0.6, -0.97, -0.03], [sd * 0.8, -2.1, -0.07], 0.215, 0.23, 14, { pid: sd < 0 ? PID.sleeveL : PID.sleeveR, grp: GRP.cloth, mat: hm, M: P.bodyM }, true, false));
      }
      addHead(c, P, prof, { skin, bias: 0.08 });
      const keep = (x, y, z) => {
        if (z > 0.1) return y > 0.26 - 0.12 * (x * x) / 0.1 ? hair : 0;
        if (z > -0.06) return y > lerp(-0.04, 0.14, (z + 0.06) / 0.16) ? hair : 0;
        return y > -0.3 ? hair : 0;
      };
      addCap(c, P, prof, { mat: hair, keep, grow: 0.04, bot: -0.32 });
      addHair(c, P, SUK_LOCKS, { center: [0, 0.06, -0.035], radius: 0.39, mat: hair, prof, specShift: 0.08, specPow: 28, vary: 0.8, seed: 9, under: 0, mass: 0.7, rootBias: -0.2, tipBias: 0.1 });
      return faceKit(c, P, prof, SUK_FACE);
    },
  });

  // ================================================================== SHARED COSTUMES (uniform, robe + scarf)
  const clothMats = {
    jacket: () => mat({ ramp: [C.ink, C.ink, C.shadow, C.indigo], th: [-0.3, 0.05, 0.84], line: C.ink, out: C.ink, edge: 2, mono: [C.ink, C.ink, C.ink, C.dusk] }),
    ucollar: () => mat({ ramp: [C.ink, C.ink, C.shadow, C.dusk], th: [-0.3, 0.1, 0.78], line: C.ink, out: C.ink, mono: [C.ink, C.ink, C.ink, C.dusk] }),
    robe: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.35, 0.06, 2], line: C.rosewood, lineLit: C.sand, out: C.ink, outLit: C.rosewood, edge: 2, mono: [C.steel, C.white, C.white, C.white] }),
    robeEdge: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.35, 0.06, 2], line: C.rosewood, lineLit: C.sand, out: C.ink, outLit: C.rosewood, edge: 3, mono: [C.steel, C.white, C.white, C.white] }),
    scarf: () => mat({ ramp: [C.ink, C.ink, C.shadow, C.dusk], th: [-0.35, 0.1, 0.74], line: C.ink, lineLit: C.ink, out: C.ink, mono: [C.ink, C.ink, C.ink, C.dusk] }),
  };
  // black high-collared student uniform: jacket torso + sleeves, a tall collar around the neck (slit at the front)
  function addUniform(c, P, rows, arm, o = {}) {
    const jk = c.addMat('jacket', clothMats.jacket()), cl = c.addMat('ucollar', clothMats.ucollar());
    const jFn = (x, y, z) => (z > 0.05 && abs(x) < 0.006 && y < -0.84 ? cl : jk); // front closure line
    addTorso(c, P, { rows, mat: jk, matFn: jFn });
    for (const sd of [-1, 1]) addArm(c, P, sd, Object.assign({}, arm, { mat: jk, matFn: null }));
    const pts = [], rw = [], rt = [];
    for (let i = 0; i <= 4; i++) { const u = i / 4; pts.push([0, lerp(-0.9, o.top || -0.56, u), lerp(-0.075, -0.085, u)]); rw.push(lerp(0.2, 0.182, u)); rt.push(lerp(0.19, 0.172, u)); }
    const m = c.add(tubeMesh(pts, rw, rt, 20, [0, 0, 1], { pid: PID.collar, grp: GRP.cloth, mat: cl, M: P.bodyM, matFn: (x, y, z) => (z > 0.05 && abs(x) < 0.02 ? 0 : cl), cull: false }));
    m.skin = { MA: P.headM, MB: P.bodyM, w: y => sstep(-0.8, -0.56, y) * 0.35 };
    return { jk, cl };
  }
  // pale loose robe (wrapped front, left over right) + a dark scarf wound around the neck with a hanging end
  function addRobe(c, P, rows, arm) {
    const rb = c.addMat('robe', clothMats.robe()), re = c.addMat('robeEdge', clothMats.robeEdge()), sc = c.addMat('scarf', clothMats.scarf());
    const R2 = rows.map(r => [r[0], r[1] + 0.06, r[2], r[3] + 0.05, r[4] - 0.04, r[5]]);
    const cross = (x, y) => x - (-0.02 + (y + 0.74) * 0.34);  // wrap edge: from the neck (left) diagonally down to the right
    const rFn = (x, y, z) => { if (z > 0) { const d = cross(x, y); if (abs(d) < 0.035) return re; } return rb; };
    addTorso(c, P, { rows: R2, mat: rb, matFn: rFn });
    for (const sd of [-1, 1]) c.add(capsuleMesh([sd * (arm.x0 + 0.02), arm.y0 + 0.02, -0.03], [sd * (arm.x1 + 0.08), arm.y1, -0.07], arm.r0 + 0.05, arm.r1 + 0.09, 14, { pid: sd < 0 ? PID.sleeveL : PID.sleeveR, grp: GRP.cloth, mat: rb, M: P.bodyM }, true, false));
    // scarf: two loops around the neck + a hanging end over the chest
    for (let k = 0; k < 2; k++) {
      const ring = [], rw = [], rt = [];
      const y0 = -0.6 - k * 0.1, R = 0.2 + k * 0.035;
      for (let j = 0; j <= 20; j++) { const a = (j / 20) * 2 * PI; ring.push([R * sin(a), y0 + 0.02 * cos(a * 2 + k), -0.075 + R * 0.95 * cos(a)]); rw.push(0.07 - k * 0.006); rt.push(0.06); }
      const m = c.add(tubeMesh(ring, rw, rt, 8, [0, 1, 0], { pid: PID.outer + 20 + k, grp: GRP.cloth, mat: sc, M: P.bodyM, bias: -0.05 * k }));
      m.skin = { MA: P.headM, MB: P.bodyM, w: () => 0.25 };
    }
    const sw = c.A.wind[0] * 0.1;
    const endP = [[0.1, -0.7, 0.16], [0.14 + sw * 0.3, -0.86, 0.2], [0.16 + sw * 0.6, -1.05, 0.22], [0.15 + sw, -1.3, 0.22]];
    c.add(tubeMesh(endP, [0.06, 0.068, 0.07, 0.07], [0.022, 0.022, 0.022, 0.022], 8, [0, 0, 1], { pid: PID.outer + 22, grp: GRP.cloth, mat: sc, M: P.bodyM }));
  }
  // small round black sunglasses (Gojo, airport): lenses + bridge + temples, drawn over the eyes
  function drawGlasses(k) {
    const { hp, px, col } = k;
    const ink = col(K.ink), lens = col(K.shadow), glint = col(K.white), rimC = col(K.ink);
    const E = k.fs.eye;
    const prev = F.allow; F.allow = null;
    const cen = [];
    for (const sd of [-1, 1]) {
      const c0 = hp(sd * E.cx, E.cy - 0.005, 0.06);
      const e1 = hp(sd * (E.cx - 0.075), E.cy, 0.06), e2 = hp(sd * (E.cx + 0.075), E.cy, 0.06);
      const rx = max(2, abs(e2[0] - e1[0]) / 2), ry = max(2, 0.07 * k.s);
      for (let y = -ceil(ry); y <= ceil(ry); y++) for (let x = -ceil(rx); x <= ceil(rx); x++) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d > 1) continue;
        fset(round(c0[0]) + x, round(c0[1]) + y, d > 0.62 ? rimC : lens);
      }
      fset(round(c0[0] - rx * 0.35), round(c0[1] - ry * 0.4), glint);
      if (px >= 1.2) fset(round(c0[0] - rx * 0.35) + 1, round(c0[1] - ry * 0.4), glint);
      cen.push([c0, rx, ry]);
    }
    // bridge
    const b1 = hp(-E.cx + 0.075, E.cy + 0.012, 0.06), b2 = hp(E.cx - 0.075, E.cy + 0.012, 0.06);
    fline(b1[0], b1[1], b2[0], b2[1], ink);
    // temples toward the ears (near side visible)
    for (const sd of [-1, 1]) {
      const a = hp(sd * (E.cx + 0.08), E.cy + 0.01, 0.05), b = hp(sd * 0.33, E.cy + 0.02, -0.02);
      F.allow = HEAD_EAR; fline(a[0], a[1], b[0], b[1], ink); F.allow = null;
    }
    F.allow = prev;
  }

  // ================================================================== GETO SUGURU (student; airport coda only)
  // long black hair in a half-up bun with one bang strand falling over the forehead; stretched earlobes with round
  // gauges; calm narrow eyes; black high-collar uniform; a gentle smile.
  const GETO_HEAD = GOJO_HEAD.map(r => [r[0], r[0] < -0.2 ? r[1] * 1.03 : r[1], r[2], r[3], r[4], r[5], r[6]]);
  const GETO_LOCKS = [
    // swept-back strands along the scalp toward the bun (texture + volume, no spikes)
    { az: -48, el: 30, taz: -160, tel: 42, w: 0.1, scalp: true, lift: 0.03, arch: 0.025, noUnder: true },
    { az: 48, el: 30, taz: 160, tel: 42, w: 0.1, scalp: true, lift: 0.03, arch: 0.025, noUnder: true },
    { az: -88, el: 20, taz: -168, tel: 34, w: 0.1, scalp: true, lift: 0.03, arch: 0.02, noUnder: true },
    { az: 88, el: 20, taz: 168, tel: 34, w: 0.1, scalp: true, lift: 0.03, arch: 0.02, noUnder: true },
    { az: -20, el: 44, taz: -175, tel: 52, w: 0.11, scalp: true, lift: 0.035, arch: 0.03, noUnder: true },
    { az: 20, el: 44, taz: 175, tel: 52, w: 0.11, scalp: true, lift: 0.035, arch: 0.03, noUnder: true },
    // long hair falling behind the neck to the shoulders (from under the bun)
    { az: 180, el: -4, taz: 180, tel: -80, len: 0.6, w: 0.13, taper: 0.6, belly: 0.1, push: 0.15, mass: 0.5 },
    { az: 150, el: -2, taz: 158, tel: -82, len: 0.62, w: 0.12, curl: 6, taper: 0.6, belly: 0.1, push: 0.15, mass: 0.5 },
    { az: -150, el: -2, taz: -158, tel: -82, len: 0.62, w: 0.12, curl: -6, taper: 0.6, belly: 0.1, push: 0.15, mass: 0.5 },
    { az: 122, el: 2, taz: 128, tel: -84, len: 0.58, w: 0.1, curl: 4, taper: 0.6, belly: 0.1, push: 0.15, mass: 0.5 },
    { az: -122, el: 2, taz: -128, tel: -84, len: 0.58, w: 0.1, curl: -4, taper: 0.6, belly: 0.1, push: 0.15, mass: 0.5 },
    // side strands framing the face (in front of the ears)
    { az: -80, el: 16, taz: -84, tel: -76, len: 0.36, w: 0.07, taper: 0.7, belly: 0.1, push: 0.12, lineFrom: 0.1 },
    { az: 80, el: 16, taz: 84, tel: -76, len: 0.34, w: 0.07, taper: 0.7, belly: 0.1, push: 0.12, lineFrom: 0.1 },
    // the signature bang: one long strand from the part falling over the forehead beside the nose to the cheek
    { az: 14, el: 52, tip: [0.15, -0.19], w: 0.066, bulge: 0.12, curl: -10, taper: 0.8, belly: 0.3, lineFrom: 0.12, lift: 0.06, bias: 0.34, mass: 0.35 },
  ];
  const getoMats = {
    hair: () => mat({ ramp: [C.ink, C.ink, C.ink, C.shadow], th: [-0.2, 0.05, 0.5], lineD: 0.06, line: C.ink, lineLit: C.ink, out: C.ink, outLit: C.ink, hi: C.dusk, hi2: C.shadow, hiTh: 0.92, ring: [0.52, 0.6, 0.24], ringCol: C.dusk, shCap: -0.3, mono: [C.ink, C.ink, C.ink, C.ink], monoHi: C.white }),
    tie: () => mat({ ramp: [C.ink, C.ink, C.ink, C.ink], th: [0, 0.5, 2], line: C.ink, out: C.ink, mono: [C.ink, C.ink, C.ink, C.ink] }),
  };
  const GETO_FACE = {
    eye: { cx: 0.158, cy: -0.05, hw: 0.09, hU: 0.036, hL: 0.02, tilt: 0.15, inY: -0.002, iris: 0.036, irisW: 0.84, irisV: -0.05, pupil: 0.46, lashT: 1.8, lashOut: 1, flick: 2.2, flickDrop: -0.2, crease: 0, lashes: false, hiSize: 1, hi2: false, peakOut: 1.0 },
    eyeCol: { hd: { ring: K.plum, dark: K.purple, mid: K.violet, light: K.lavender, hi: K.blush, pupil: K.ink }, lash: K.ink, lower: K.salmon, scl: K.white, sclTop: K.mist, sclShade: K.mist, iris: [K.plum, K.purple, K.violet], irisGlow: [K.purple, K.violet, K.lavender], ring: K.ink, pupil: K.ink, hi: K.white },
    brow: { x0: 0.07, x1: 0.265, y: 0.1, arch: 0.014, drop: -0.016, t0: 1.9, t1: 1.0 },
    browCol: K.ink,
    mouthY: -0.335, mouthW: 0.1, noseY: -0.215,
    after(k) { // off-centre gold button on the high collar (canon)
      const prev = F.allow; F.allow = null;
      const p = k.D.project(mP(k.P.bodyM, [0.06, -0.8, 0.13]));
      const r = max(1, 0.018 * k.s);
      for (let y = -ceil(r); y <= ceil(r); y++) for (let x = -ceil(r); x <= ceil(r); x++) if (x * x + y * y <= r * r + 0.5) fset(round(p[0]) + x, round(p[1]) + y, x + y < 0 ? k.col(K.butter) : k.col(K.amber));
      F.allow = prev;
    },
    extra(k) { // stretched earlobes with round gauges (visible below the side strands)
      const { hp, px, col } = k;
      const prev = F.allow; F.allow = null;
      for (const sd of [-1, 1]) {
        const lobe = k.D.project(mP(k.P.headM, [sd * 0.365, -0.235, -0.065]));
        if (GB.depth[floor(lobe[1]) * k.D.W + floor(lobe[0])] > lobe[2] + 0.05) continue; // hidden behind the head / hair
        const r = max(1.5, 0.028 * k.s);
        for (let y = -ceil(r); y <= ceil(r); y++) for (let x = -ceil(r); x <= ceil(r); x++) {
          const d = sqrt(x * x + y * y);
          if (d > r + 0.3) continue;
          fset(round(lobe[0]) + x, round(lobe[1]) + y, d > r - 1.1 ? col(K.ink) : col(K.shadow));
        }
        fset(round(lobe[0] - r * 0.4), round(lobe[1] - r * 0.4), col(K.steel));
      }
      F.allow = prev;
    },
  };
  B.define({
    name: 'geto', seed: 31, yaw3q: 34,
    frame: { top: 0.9, bot: -1.45, half: 1.32 },
    build(c) {
      const P = poseOf(c), o = c.o;
      const prof = profile(GETO_HEAD);
      const skin = c.addMat('skin', gojoMats.skin()), hair = c.addMat('hair', getoMats.hair()), tie = c.addMat('tie', getoMats.tie());
      c.recv = RECV;
      c.headCenter = mP(P.headM, [0, 0, 0]);
      addNeck(c, P, { mat: skin, r: 0.148, rz: 0.138, bot: -0.95 });
      addUniform(c, P, TORSO_M, { x0: 0.62, y0: -0.99, x1: 0.78, y1: -2.1, r0: 0.165, r1: 0.15 });
      addHead(c, P, prof, { skin, bias: 0.08 });
      // hair pulled back: a smooth cap with a visible hairline (slight M), parted at the bang
      const keep = (x, y, z) => {
        if (z > 0.1) return y > 0.3 - 0.16 * (x * x) / 0.1 ? hair : 0;
        if (z > -0.04) return y > lerp(-0.06, 0.2, (z + 0.04) / 0.14) ? hair : 0;
        return y > -0.32 ? hair : 0;
      };
      addCap(c, P, prof, { mat: hair, keep, grow: 0.045, bot: -0.34 });
      // the half-up bun at the back of the crown, with a dark tie
      c.add(ellipsoidMesh([0, 0.4, -0.37], [0.16, 0.15, 0.15], mRotX(-35 * D2R), 14, 10, { pid: PID.bun, grp: GRP.hair, mat: hair, M: P.headM, bias: 0.05 }));
      const tieRing = []; for (let j = 0; j <= 16; j++) { const a = (j / 16) * 2 * PI; tieRing.push([0.1 * sin(a), 0.33 + 0.035 * cos(a), -0.3 + 0.1 * cos(a) * 0.6]); }
      c.add(tubeMesh(tieRing, tieRing.map(() => 0.018), tieRing.map(() => 0.018), 6, [0, 1, 0], { pid: PID.bun + 1, grp: GRP.hair, mat: tie, M: P.headM }));
      addHair(c, P, GETO_LOCKS, { center: [0, 0.06, -0.035], radius: 0.38, mat: hair, prof, specShift: 0.05, specPow: 30, vary: 0.4, seed: 17, under: 0, mass: 0.6, rootBias: -0.1, tipBias: 0.05 });
      return faceKit(c, P, prof, GETO_FACE);
    },
  });

  // ================================================================== MAHORAGA (Eight-Handled Sword Divergent Sila Divine General)
  // huge white shikigami: no normal eyes — four small wing-like growths from the eye sockets; a tail-like appendage from
  // the back of the head; the eight-handled golden wheel floating above the head (o.notch 0..8 turns it one spoke per
  // adaptation; o.wheel = extra angle in radians).
  const MAHO_HEAD = [
    [0.5, 0.04, -0.03, 0.0, -0.07, 2.0, 0],
    [0.44, 0.2, -0.03, 0.15, -0.23, 2.1, 0],
    [0.36, 0.3, -0.03, 0.26, -0.34, 2.2, 0],
    [0.24, 0.35, -0.03, 0.33, -0.39, 2.4, 0.02],
    [0.1, 0.37, -0.035, 0.36, -0.4, 2.6, 0.03],
    [0.0, 0.37, -0.045, 0.33, -0.39, 2.9, -0.05],
    [-0.1, 0.37, -0.05, 0.34, -0.34, 3.0, 0.02],
    [-0.2, 0.36, -0.04, 0.35, -0.24, 3.0, 0.02],
    [-0.3, 0.34, -0.02, 0.34, -0.12, 3.0, 0],
    [-0.39, 0.29, 0.02, 0.32, -0.03, 2.8, 0],
    [-0.46, 0.21, 0.07, 0.29, 0.04, 2.6, 0],
    [-0.5, 0.1, 0.11, 0.26, 0.09, 2.3, 0],
    [-0.52, 0.04, 0.14, 0.23, 0.12, 2.0, 0],
  ];
  const TORSO_H = [
    [-0.55, 0.22, -0.08, 0.08, -0.22, 2.0],
    [-0.62, 0.46, -0.07, 0.14, -0.25, 2.2],
    [-0.7, 0.72, -0.06, 0.2, -0.28, 2.4],
    [-0.8, 0.9, -0.05, 0.25, -0.3, 2.6],
    [-0.92, 0.98, -0.04, 0.3, -0.31, 2.8],
    [-1.1, 1.0, -0.03, 0.34, -0.31, 2.8],
    [-1.35, 0.97, -0.03, 0.35, -0.3, 2.8],
    [-1.6, 0.92, -0.03, 0.33, -0.29, 2.6],
    [-1.9, 0.86, -0.03, 0.3, -0.27, 2.4],
  ];
  const mahoMats = {
    skin: () => mat({ ramp: [C.lilacgrey, C.steel, C.mist, C.white], th: [-0.4, 0.02, 0.62], line: C.dusk, lineLit: C.lilacgrey, out: C.ink, outLit: C.dusk, mono: [C.steel, C.steel, C.white, C.white] }),
    wing: () => mat({ ramp: [C.steel, C.mist, C.white, C.white], th: [-0.3, 0.15, 2], lineD: 0.03, line: C.lilacgrey, lineLit: C.steel, out: C.ink, outLit: C.lilacgrey, mono: [C.steel, C.white, C.white, C.white] }),
    gold: () => mat({ ramp: [C.rust, C.amber, C.gold, C.butter], th: [-0.35, 0.1, 0.7], line: C.bark, lineLit: C.rust, out: C.ink, outLit: C.bark, mono: [C.dusk, C.steel, C.white, C.white] }),
    mouth: () => mat({ ramp: [C.dusk, C.lilacgrey, C.steel, C.mist], th: [-0.3, 0.1, 0.7], line: C.dusk, out: C.ink, mono: [C.dusk, C.dusk, C.steel, C.white] }),
  };
  const MAHO_FACE = {
    nose: false, noEyes: true,
    eye: { cx: 0.16, cy: -0.02, hw: 0.08, hU: 0.04, hL: 0.03 },
    mouthY: -0.36, mouthW: 0.14,
    after(k) { // metal-chain design at the collarbone (canon): a row of links across the upper chest
      const { col } = k;
      const prev = F.allow; F.allow = new Uint8Array(1024); F.allow[PID.torso] = 1;
      const M2 = k.P.bodyM;
      for (let i = -7; i <= 7; i++) {
        const x = i * 0.085, y = -0.8 - 0.035 * (i * i) / 49 * 3;
        const p = k.D.project(mP(M2, [x, y, 0.2 + 0.05 * (1 - abs(i) / 7)]));
        const rx = max(1.5, 0.03 * k.s), ry = max(1, 0.018 * k.s);
        for (let a = 0; a < 16; a++) { const t = a / 16 * 2 * PI; fset(round(p[0] + cos(t) * rx), round(p[1] + sin(t) * ry), col(i % 2 ? K.steel : K.lilacgrey)); }
      }
      F.allow = prev;
    },
    extra(k) {
      const { hp, px, col } = k;
      // deep eye sockets (shadowed ovals) where the wings grow
      for (const sd of [-1, 1]) {
        const pts = sampleCurve(t => { const a = t * 2 * PI; return hp(sd * (0.16 + 0.075 * cos(a)), -0.02 + 0.04 * sin(a), 0.004); }, 16).map(p => [p[0], p[1]]);
        fpoly(pts, col(K.lilacgrey));
        const pts2 = sampleCurve(t => { const a = t * 2 * PI; return hp(sd * (0.165 + 0.035 * cos(a)), -0.024 + 0.014 * sin(a), 0.004); }, 12).map(p => [p[0], p[1]]);
        fpoly(pts2, col(K.steel));
      }
    },
    mouthShape: 'maho',
  };
  B.define({
    name: 'mahoraga', seed: 41, yaw3q: 30, shadows: true,
    frame: { top: 1.95, bot: -1.45, half: 1.5 },
    build(c) {
      const P = poseOf(c), o = c.o;
      const prof = profile(MAHO_HEAD);
      const skin = c.addMat('mskin', mahoMats.skin()), wing = c.addMat('wing', mahoMats.wing()), gold = c.addMat('gold', mahoMats.gold()), mouth = c.addMat('mmouth', mahoMats.mouth());
      c.recv = RECV;
      c.headCenter = mP(P.headM, [0, 0, 0]);
      addNeck(c, P, { mat: skin, r: 0.22, rz: 0.2, bot: -0.95, top: -0.1, bias: -0.08 });
      addTorso(c, P, { rows: TORSO_H, mat: skin });
      for (const sd of [-1, 1]) addArm(c, P, sd, { x0: 0.86, y0: -0.95, x1: 1.02, y1: -2.1, r0: 0.25, r1: 0.22, mat: skin });
      const hm = addHead(c, P, prof, { skin, bias: 0.04, nose: { y: -0.15, len: 0.09, w: 0.045, d: 0.05, pitch: -10 }, ear: { x: 0.36, y: -0.08, z: -0.07, ry: 0.07, rz: 0.05, rx: 0.025, tilt: -10 } });
      // (canon: a lipless toothy grin - drawn in the feature pass)
      // the four wing-like growths: two per eye socket (upper sweeps up-out over the brow, lower sweeps down-out along the
      // cheekbone), each a fan of four feathers (flattened tapered tubes)
      let wi = 0;
      for (const sd of [-1, 1]) for (const up of [1, -1]) {
        const base = [sd * 0.17, -0.02 + up * 0.014, surfZ(prof, sd * 0.17, -0.02) - 0.012];
        for (let f = 0; f < 4; f++) {
          const ang = (up > 0 ? 34 : -26) + (f - 1.5) * (up > 0 ? 15 : 12);
          const dir = [sd * cos(ang * D2R) * 0.9, sin(ang * D2R), 0.5];
          const len = (0.3 - abs(f - 1.2) * 0.04) * (up > 0 ? 1 : 0.8);
          const tip = vadd(base, vmul(vnorm(dir), len));
          const ctrl = vadd(vlerp(base, tip, 0.45), [0, up * 0.03, 0.05]);
          const pts = [], rw = [], rt = [];
          for (let q2 = 0; q2 <= 6; q2++) { const t = q2 / 6; pts.push(bez2(base, ctrl, tip, t)); const tp = pow(1 - t, 0.65) * (1 + 0.5 * sin(PI * t)); rw.push(0.04 * tp); rt.push(0.014 * tp); }
          c.add(tubeMesh(pts, rw, rt, 6, [0, 0, 1], { pid: PID.extra + wi++, grp: GRP.extra, mat: wing, M: P.headM, bias: 0.12 }));
        }
      }
      // tail-like appendage from the back of the head, curving down behind the neck
      const tp0 = [0, 0.18, -0.38], tp1 = [0, 0.05, -0.62], tp2 = [0, -0.35, -0.7], tp3 = [0, -0.8, -0.62];
      const tpts = [], trw = [];
      for (let q2 = 0; q2 <= 8; q2++) { const t = q2 / 8; tpts.push(bez3(tp0, tp1, tp2, tp3, t)); trw.push(0.1 * pow(1 - t, 0.6) + 0.015); }
      c.add(tubeMesh(tpts, trw, trw.map(v => v * 0.9), 10, [1, 0, 0], { pid: PID.extra + 20, grp: GRP.extra, mat: skin, M: P.headM, bias: -0.05 }));
      // the eight-handled wheel above the head (gold): rim, hub, 8 spokes with handles; tilted toward the camera
      const notch = o.notch || 0, wa = notch * (PI / 4) + (o.wheel || 0);
      const WM = mChain(mTr(0, 1.24, -0.12), mRotX(-48 * D2R), mRotZ(wa));
      const rimPts = []; for (let j = 0; j <= 32; j++) { const a = (j / 32) * 2 * PI; rimPts.push([0.52 * cos(a), 0.52 * sin(a), 0]); }
      c.add(tubeMesh(rimPts, rimPts.map(() => 0.032), rimPts.map(() => 0.032), 8, [0, 0, 1], { pid: PID.wheel, grp: GRP.extra, mat: gold, M: mMul(P.headM, WM) }));
      c.add(ellipsoidMesh([0, 0, 0], [0.09, 0.09, 0.05], null, 12, 8, { pid: PID.wheel + 1, grp: GRP.extra, mat: gold, M: mMul(P.headM, WM) }));
      for (let j = 0; j < 8; j++) {
        const a = j * PI / 4, ca = cos(a), sa = sin(a);
        c.add(capsuleMesh([ca * 0.08, sa * 0.08, 0], [ca * 0.5, sa * 0.5, 0], 0.018, 0.018, 6, { pid: PID.wheel + 2 + j, grp: GRP.extra, mat: gold, M: mMul(P.headM, WM) }, false, false));
        c.add(capsuleMesh([ca * 0.54, sa * 0.54, 0], [ca * 0.68, sa * 0.68, 0], 0.026, 0.034, 6, { pid: PID.wheel + 10 + j, grp: GRP.extra, mat: gold, M: mMul(P.headM, WM) }, true, true));
      }
      c.anchorsWheel = mP(mMul(P.headM, WM), [0, 0, 0]);
      return faceKit(c, P, prof, MAHO_FACE);
    },
  });

  // ================================================================== HANDS (close-ups of hand signs)
  // A posable 3D hand in "hand units" (1 = wrist → middle fingertip), rendered by the same cel pipeline: palm loft,
  // thenar pad, three-segment fingers (each segment its own part → inner lines where fingers overlap), thumb chain,
  // forearm + sleeve/bands. Local frame of a RIGHT hand: fingers +y, palm normal +z, thumb on the +x side (left hand =
  // mirrored x). Finger pose [spread°, MCP°, PIP°, DIP°] (flexion curls toward the palm); thumb pose = three segment
  // directions. Signs are poses + a wrist orientation; 'purple' interpolates key poses by o.phase.
  const FING = [ // base, segment lengths, radius (index, middle, ring, pinky)
    { base: [0.122, 0.5, 0.0], len: [0.25, 0.145, 0.105], r: 0.043 },
    { base: [0.04, 0.515, 0.0], len: [0.27, 0.165, 0.11], r: 0.045 },
    { base: [-0.043, 0.5, 0.0], len: [0.255, 0.155, 0.105], r: 0.042 },
    { base: [-0.118, 0.47, 0.0], len: [0.2, 0.12, 0.095], r: 0.037 },
  ];
  const THUMB = { base: [0.108, 0.17, 0.036], len: [0.17, 0.145, 0.11], r: [0.06, 0.052, 0.046] };
  const EXT = [0, 4, 6, 3], CURL = [0, 86, 102, 58], HALF = [0, 44, 60, 30];
  const T_OVER = [[0.45, 0.62, 0.64], [-0.35, 0.5, 0.8], [-0.9, 0.18, 0.4]];     // thumb folded over curled fingers
  const T_UP = [[0.62, 0.66, 0.42], [0.52, 0.84, 0.18], [0.42, 0.9, 0.0]];         // thumb extended up/out
  const T_OPEN = [[0.6, 0.66, 0.46], [0.74, 0.6, 0.26], [0.8, 0.58, 0.06]];        // relaxed open
  const T_SIDE = [[0.5, 0.62, 0.6], [0.2, 0.75, 0.62], [0.05, 0.8, 0.6]];           // along the index side
  // signs: fingers [index, middle, ring, pinky], thumb dirs, wrist rotation (deg: yaw, pitch, roll), offset
  const SIGNS = {
    open: { f: [[-12, 4, 6, 3], [-3, 3, 5, 3], [6, 4, 6, 3], [15, 7, 8, 4]], t: T_OPEN, rot: [0, -8, -6] },
    fist: { f: [[2, 88, 104, 56], [0, 90, 104, 58], [-2, 90, 104, 58], [-4, 88, 100, 56]], t: T_OVER, rot: [-18, -14, -8] },
    two: { f: [[3, 2, 4, 2], [-3, 2, 4, 2], CURL, CURL], t: T_OVER, rot: [-150, -6, -10] },
    // finger-gun (Dismantle): index points screen-right (face=+1), thumb up, back of the hand to the camera (basis:
    // local x → up, local y → right, local z → away), then a small 3/4 turn
    point: { f: [[0, 2, 3, 2], [0, 84, 100, 56], [0, 86, 100, 56], [0, 84, 98, 54]], t: T_UP, basis: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0, -1, 0], rot: [-24, 0, 6] },
    // Unlimited Void (canon, research): right hand, palm toward the opponent, index up, middle lightly crossed around it,
    // ring + little fingers curled, thumb out
    void: { f: [[12, 3, 4, 2], [-16, 8, 5, 2], CURL, CURL], t: [[0.78, 0.5, 0.38], [0.9, 0.4, 0.14], [0.92, 0.38, 0.0]], rot: [18, -6, -4], cross: true },
    // purple keys (phase 0 → 1): index + pinky extended → pinch (thumb meets index) → fingers flung open
    purpleA: { f: [[-4, 3, 4, 2], CURL, CURL, [8, 4, 6, 3]], t: T_OVER, rot: [-10, -6, -6] },
    purpleB: { f: [[0, 38, 56, 30], [-2, 3, 4, 2], [0, 84, 98, 54], [0, 84, 96, 52]], t: 'pinch', rot: [-26, -10, -12] },
    purpleC: { f: [[-22, -6, 0, 0], [-7, -8, 0, 0], [8, -8, 0, 0], [24, -6, 0, 0]], t: [[0.8, 0.5, 0.3], [0.92, 0.36, 0.15], [0.96, 0.28, 0.0]], rot: [4, -18, -4] },
  };
  B.SIGNS = ['void', 'shrine', 'purple', 'point', 'two', 'fist', 'open'];
  const rotAxis = (v, ax, a) => { // Rodrigues
    const c0 = cos(a), s0 = sin(a), d = vdot(v, ax), cr = vcross(ax, v);
    return [v[0] * c0 + cr[0] * s0 + ax[0] * d * (1 - c0), v[1] * c0 + cr[1] * s0 + ax[1] * d * (1 - c0), v[2] * c0 + cr[2] * s0 + ax[2] * d * (1 - c0)];
  };
  // finger chain → joint points
  function fingerChain(F0, pose) {
    const [spread, mcp, pip, dip] = pose;
    let dir = rotAxis([0, 1, 0], [0, 0, 1], spread * D2R); // + spread toward the pinky side (−x)
    let side = rotAxis([1, 0, 0], [0, 0, 1], spread * D2R);
    const pts = [F0.base.slice()];
    const flex = [mcp, pip, dip];
    let p = F0.base;
    for (let k = 0; k < 3; k++) {
      dir = rotAxis(dir, side, flex[k] * D2R);
      p = vadd(p, vmul(dir, F0.len[k]));
      pts.push(p);
    }
    return pts;
  }
  function thumbChain(T0, dirs) {
    const pts = [T0.base.slice()];
    let p = T0.base;
    for (let k = 0; k < 3; k++) { p = vadd(p, vmul(vnorm(dirs[k]), T0.len[k])); pts.push(p); }
    return pts;
  }
  const lerpPose = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  function signPose(sign, phase) {
    if (sign !== 'purple') return SIGNS[sign] || SIGNS.open;
    const ph = clamp(phase || 0, 0, 1);
    const A = SIGNS.purpleA, Bp = SIGNS.purpleB, Cp = SIGNS.purpleC;
    // holds: A 0–0.3, A→B 0.3–0.45, B 0.45–0.7, B→C 0.7–0.78 (flung open, fast), C 0.78–1
    let a, b, t;
    if (ph < 0.3) { a = A; b = A; t = 0; } else if (ph < 0.45) { a = A; b = Bp; t = HT.E.inOutCubic((ph - 0.3) / 0.15); }
    else if (ph < 0.7) { a = Bp; b = Bp; t = 0; } else if (ph < 0.78) { a = Bp; b = Cp; t = HT.E.outCubic((ph - 0.7) / 0.08); } else { a = Cp; b = Cp; t = 0; }
    const f = a.f.map((fa, i) => lerpPose(fa, b.f[i], t));
    const ta = a.t, tb = b.t;
    const rot = lerpPose(a.rot, b.rot, t);
    return { f, t: ta === 'pinch' && tb === 'pinch' ? 'pinch' : (t < 0.5 ? ta : tb), rot, blendT: [ta, tb, t] };
  }
  // one hand into the scene: side = +1 right hand, −1 left (mirrored); M = placement matrix (wrist at origin)
  function addHand(c, M, side, pose, o) {
    const skin = o.skin, pidBase = o.pidBase;
    const mir = p => [p[0] * side, p[1], p[2]];
    const MM = mMul(M, [side, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);  // mirror in local space
    // palm: lofted rounded slab wrist → knuckles
    const rows = [];
    const secs = [[-0.02, 0.105, 0.052], [0.08, 0.13, 0.056], [0.22, 0.15, 0.058], [0.36, 0.16, 0.055], [0.47, 0.162, 0.05], [0.53, 0.155, 0.044]];
    for (const [y, w, t] of secs) {
      const ring = [];
      for (let k = 0; k < 20; k++) { const a = (k / 20) * 2 * PI, sa = sin(a), ca = cos(a); ring.push([w * Math.sign(sa) * pow(abs(sa), 0.6) + 0.005, y + 0.03 * max(0, -abs(sa) + 0.3) * 0, t * Math.sign(ca) * pow(abs(ca), 0.8) + (ca > 0 ? 0.004 : 0)]); }
      rows.push(ring);
    }
    // close the knuckle end with a small ring
    c.add(gridMesh(rows, { pid: pidBase, grp: GRP.body, mat: skin, M: MM, bias: 0.04, cull: false }));
    // thenar pad (thumb muscle) on the palm side
    c.add(ellipsoidMesh([0.085, 0.17, 0.035], [0.07, 0.12, 0.045], mRotZ(-20 * D2R), 12, 8, { pid: pidBase, grp: GRP.body, mat: skin, M: MM, bias: 0.04 }));
    // fingers
    const tips = [];
    const fingerPts = [];
    for (let fi = 0; fi < 4; fi++) {
      const F0 = pose.fx && pose.fx[fi] ? Object.assign({}, FING[fi], { base: vadd(FING[fi].base, [pose.fx[fi], 0, 0]) }) : FING[fi];
      const pts = fingerChain(F0, pose.f[fi]);
      fingerPts.push(pts);
      for (let k = 0; k < 3; k++) {
        const ra = F0.r * (1 - k * 0.1), rb = F0.r * (0.94 - k * 0.1);
        let A = pts[k], Bq = pts[k + 1];
        if (pose.cross && fi === 1) { A = vadd(A, [0, 0, 0.03 + k * 0.012]); Bq = vadd(Bq, [0, 0, 0.042 + k * 0.012]); } // middle finger in front
        c.add(capsuleMesh(A, Bq, ra, rb, 10, { pid: pidBase + 1 + fi * 3 + k, grp: GRP.body, mat: skin, M: MM, bias: 0.02 }, true, true, [0, 0, 1], 1));
      }
      tips.push(pts[3]);
    }
    // thumb
    let tdirs = pose.t;
    if (tdirs === 'pinch') { // aim the thumb chain at the index fingertip
      const it = fingerPts[0][3], b0 = THUMB.base;
      const mid = vadd(vlerp(b0, it, 0.5), [0.08, -0.02, 0.07]);
      tdirs = [vsub(mid, b0), vsub(vlerp(mid, it, 0.55), mid), vsub(it, vlerp(mid, it, 0.55))];
    }
    if (pose.blendT && pose.blendT[0] !== pose.blendT[1] && pose.blendT[0] !== 'pinch' && pose.blendT[1] !== 'pinch') tdirs = pose.blendT[0].map((d, i) => vlerp(d, pose.blendT[1][i], pose.blendT[2]));
    const tpts = thumbChain(THUMB, tdirs);
    for (let k = 0; k < 3; k++) c.add(capsuleMesh(tpts[k], tpts[k + 1], THUMB.r[k], THUMB.r[min(2, k + 1)] * 0.95, 10, { pid: pidBase + 13 + k, grp: GRP.body, mat: skin, M: MM, bias: 0.02 }, true, true, [0, 0, 1], 1));
    // forearm + sleeve / bands
    const fa = c.add(capsuleMesh([0, 0.04, -0.005], [0, -1.2, -0.03], 0.1, 0.135, 14, { pid: pidBase + 17, grp: GRP.body, mat: skin, matFn: o.armFn ? (x, y, z) => o.armFn(x, y, z) : null, M: MM, bias: 0.0 }, true, false, [0, 0, 1], 3));
    // nail anchors (distal segment tips, world) for the feature pass
    const nails = [];
    for (let fi = 0; fi < 4; fi++) { const p = fingerPts[fi]; nails.push({ a: mP(MM, p[2]), b: mP(MM, p[3]), r: FING[fi].r, n: mN(MM, [0, 0, -1]), pid: pidBase + 1 + fi * 3 + 2 }); }
    nails.push({ a: mP(MM, tpts[2]), b: mP(MM, tpts[3]), r: THUMB.r[2] * 0.85, n: mN(MM, [0, 0, -1]), pid: pidBase + 15 });
    return { nails, M: MM, tips: tips.map(p => mP(MM, p)) };
  }
  // Enmaten no Shoin (Malevolent Shrine, canon per research): palms together; middle + ring fingers straight and pressed
  // together; index + little fingers bent, their middle knuckles touching pairwise; thumbs straight, side by side.
  function addShrine(c, o) {
    const res = [];
    for (const side of [1, -1]) {
      // right hand: palm faces -x (toward the left hand), thumb toward the camera; forearms angle out (elbows out)
      const M = mChain(mTr(side * 0.052, 0.0, 0), mRotZ(side * -5 * D2R), mRotY(side * -90 * D2R));
      const pose = {
        f: [[0, 4, 82, 46], [3, 0, 0, 0], [-3, 0, 0, 0], [0, 8, 84, 44]],
        t: [[0.22, 0.92, 0.2], [0.08, 0.99, 0.06], [0.03, 1, 0.02]],
        fx: side > 0 ? [0.03, 0, 0, -0.012] : [-0.004, 0, 0, 0.004],   // bent index fingers hook in front (right over left)
      };
      res.push(addHand(c, M, side, pose, Object.assign({}, o, { pidBase: side > 0 ? 300 : 330 })));
    }
    return res;
  }
  const HAND_PID0 = 300;
  function handMats(c, who, costume) {
    const skin = c.addMat('skin', who === 'mahoraga' ? mahoMats.skin() : gojoMats.skin());
    const dark = c.addMat('sleeve', clothMats.jacket());
    const band = c.addMat('band', sukMats.band());
    let armFn = null;
    if (who === 'sukuna') armFn = (x, y) => ((y < -0.14 && y > -0.19) || (y < -0.23 && y > -0.28) ? band : skin); // wrist double band
    else if ((who === 'gojo' && costume === 'uniform') || who === 'geto') armFn = (x, y) => (y < -0.22 ? dark : skin);
    return { skin, armFn };
  }
  CH.__hands = {
    name: '__hands', seed: 3, shadows: true,
    build(c) {
      const o = c.o, who = o.who || 'gojo', sign = o.sign || 'open';
      const { skin, armFn } = handMats(c, who, o.costume);
      c.recv = RECV;
      c.headCenter = [0, 0.4, 0];
      const face = (o.face || 1) >= 0 ? 1 : -1;
      let hands;
      if (sign === 'shrine') hands = addShrine(c, { skin, armFn });
      else {
        const pose = signPose(sign, o.phase);
        const r = pose.rot;
        let M = mChain(mTr(0, 0, 0), mRotY((r[0] * face) * D2R), mRotX(r[1] * D2R), mRotZ((r[2] * face) * D2R));
        if (pose.basis) { // explicit orientation (mirrored for face = -1), then the small turn from rot
          const Bm = pose.basis.slice(); if (face < 0) { Bm[1] = -Bm[1]; Bm[4] = -Bm[4]; Bm[8] = -Bm[8]; Bm[0] = -Bm[0]; }
          M = mChain(mTr(0.1 * face, -0.25, 0), mRotY((r[0] * face) * D2R), mRotZ((r[2] * face) * D2R), Bm);
        }
        hands = [addHand(c, M, face, pose, { skin, armFn, pidBase: HAND_PID0 })];
      }
      return (D) => { // features: nails where the nail side faces the camera, knuckle creases
        const col = D.col;
        for (const h of hands) for (const nl of h.nails) {
          if (nl.n[2] < 0.25) continue;
          const a = D.project(vlerp(nl.a, nl.b, 0.55)), b = D.project(vlerp(nl.a, nl.b, 0.92));
          const rr = max(1, nl.r * D.s * 0.55);
          F.allow = new Uint8Array(1024); F.allow[nl.pid] = 1;
          const n = 6;
          for (let i = 0; i <= n; i++) {
            const p = [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)];
            for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) if (xx * xx + yy * yy <= rr * rr * 0.6) fset(round(p[0] + xx * rr * 0.6), round(p[1] + yy * rr * 0.6), col(o.who === 'sukuna' ? (i < 2 ? K.shadow : K.ink) : K.cream));
          }
          F.allow = null;
        }
      };
    },
  };
  B.handsRender = (who, sign, o = {}) => {
    const size = o.size || 180;
    const oo = Object.assign({}, o, { who, sign, size: size * 2.3 / 1.6, expr: 'neutral', blink: false, breath: false });
    return B.render('__hands', oo);
  };
  B.hands = (ctx, who, sign, x, y, size, o = {}) => {
    const r = B.handsRender(who, sign, Object.assign({}, o, { size }));
    ctx.drawImage(r.canvas, round(x - r.ox), round(y - r.oy));
    return r;
  };
  CH.__hands.frame = { top: 1.1, bot: -0.5, half: 0.8 };

  CH.gojo.faceSpec = GOJO_FACE; CH.sukuna.faceSpec = SUK_FACE; CH.geto.faceSpec = GETO_FACE; CH.mahoraga.faceSpec = MAHO_FACE;
  CH.mahoraga.ecuHalf = 0.46;

  // ================================================================== LABS
  HT.labs = HT.labs || {};
  const labBg = (g, x, y, w, h, k) => { HT.vgrad(g, x, y, w, h, [[0, k % 2 ? '#2f3a55' : '#3a3150'], [1, k % 2 ? '#5a6a86' : '#6a5a78']]); };
  // ?lab=busts[&who=gojo][&size=180][&scale=2] — per character: every expression (3/4 right), 3/4 left + frontal,
  // costumes, effects (bleed, sweat, hurt, RCT, steam, glow), mono (manga) variants
  const BUST_LAB = {
    gojo: [['neutral', { face: -1 }], ['neutral', { turn: 1 }], ['smirk', { turn: 1 }], ['grin', { face: -1 }], ['serious', { eyes: 'glow', face: -1 }],
      ['smile', { costume: 'robe' }], ['smile', { costume: 'uniform', turn: 1 }], ['strain', { bleed: 0.7, sweat: 1, hurt: 0.6, steam: 1 }], ['exhausted', { rct: 1, bleed: 0.4, hurt: 1, face: -1 }],
      ['smirk', { mono: true }], ['serious', { mono: true, face: -1, eyes: 'glow' }]],
    sukuna: [['neutral', { face: -1 }], ['neutral', { turn: 1 }], ['grin', { turn: 1, eyes2: 'open' }], ['contempt', { face: -1, eyes2: 'open' }], ['smirk', { costume: 'haori' }],
      ['grin', { costume: 'haori', face: -1, eyes2: 'open' }], ['strain', { hurt: 0.8, sweat: 0.6 }], ['calm', { rct: 1, face: -1 }], ['grin', { mono: true, eyes2: 'open' }], ['contempt', { mono: true, face: -1 }]],
    geto: [['neutral', { face: -1 }], ['neutral', { turn: 1 }], ['smile', { turn: 1 }], ['calm', { face: -1 }], ['smile', { mono: true }]],
    mahoraga: [['neutral', { face: -1 }], ['neutral', { turn: 1 }], ['neutral', { notch: 2, face: -1 }], ['neutral', { notch: 4, turn: 1, wheel: 0.2 }], ['neutral', { mono: true }]],
  };
  HT.labs.busts = Q => {
    const who = (Q.get('who') || 'gojo,sukuna,geto,mahoraga').split(','), size = +(Q.get('size') || 180);
    const L = Q.get('lx') ? [+Q.get('lx'), +Q.get('ly'), +Q.get('lz')] : undefined;
    const cells = [];
    for (const w of who) {
      const list = (w === 'mahoraga' || w === 'geto' ? [] : B.EXPRS.map(e => [e, {}])).concat(BUST_LAB[w] || []);
      for (const [e, oo] of list) {
        const label = w + ' ' + e + ' ' + Object.entries(oo).map(([k2, v]) => k2 + (v === true ? '' : ':' + v)).join(' ');
        cells.push({ label, draw(g, cw, ch) { B.draw(g, w, cw / 2, ch, Object.assign({ size, light: L, t: 0 }, oo, { expr: e })); } });
      }
    }
    const topMax = Math.max(...who.map(w => (CH[w].frame || { top: 1 }).top));
    return HT.sheet(cells, { cw: round(size * 1.3), ch: round(size * (min(topMax, 1.2) + 1.45) / 2.3 + 4), cols: +(Q.get('cols') || 6), scale: +(Q.get('scale') || 2), cellBg: labBg });
  };
  // ?lab=bustperf — uncached render ms per character (animated t defeats the cache) and cached draw ms; also checks
  // determinism (same params → identical pixels) and palette purity (every opaque pixel is a Resurrect 64 colour)
  HT.labs.bustperf = Q => {
    const size = +(Q.get('size') || 180), N = +(Q.get('n') || 12);
    const res = {}, palSet = new Set(PALP);
    const cv = HT.canvas(640, 360);
    for (const who of ['gojo', 'sukuna', 'geto', 'mahoraga']) {
      B.clearCache();
      const times = [];
      for (let i = 0; i < N; i++) { // wind + t → a new drawing every time (uncached)
        const t0 = performance.now();
        B.render(who, { size, expr: B.EXPRS[i % B.EXPRS.length], t: i / 12, wind: [0.4, 0], idle: true });
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      const r = B.render(who, { size, expr: 'neutral', t: 0 });
      const t1 = performance.now();
      for (let i = 0; i < 1000; i++) B.draw(cv.g, who, 320, 360, { size, expr: 'neutral', t: 0 });
      const cachedMs = (performance.now() - t1) / 1000;
      // determinism: render the same bust twice from scratch and compare pixels
      B.clearCache();
      const a = B.render(who, { size, expr: 'grin', t: 1.5, wind: [0.3, -0.1], idle: true }).canvas.getContext('2d').getImageData(0, 0, r.W, r.H).data;
      B.clearCache();
      const b = B.render(who, { size, expr: 'grin', t: 1.5, wind: [0.3, -0.1], idle: true }).canvas.getContext('2d').getImageData(0, 0, r.W, r.H).data;
      let diff = 0, offPal = 0, opaque = 0;
      for (let i = 0; i < a.length; i += 4) {
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) diff++;
        if (a[i + 3]) { opaque++; const c = (0xff000000 | (a[i + 2] << 16) | (a[i + 1] << 8) | a[i]) >>> 0; if (!palSet.has(c)) offPal++; }
      }
      res[who] = { medianMs: +times[N >> 1].toFixed(2), maxMs: +times[N - 1].toFixed(2), minMs: +times[0].toFixed(2), cachedDrawMs: +cachedMs.toFixed(4), deterministic: diff === 0, diffPx: diff, offPalettePx: offPal, opaquePx: opaque, canvas: r.W + 'x' + r.H };
    }
    { // hands + eyes
      B.clearCache();
      const ht = [];
      for (const sg of B.SIGNS) { const t0 = performance.now(); B.handsRender('gojo', sg, { size: 180, phase: 0.5 }); ht.push(performance.now() - t0); }
      ht.sort((a, b) => a - b);
      res.hands = { medianMs: +ht[ht.length >> 1].toFixed(2), maxMs: +ht[ht.length - 1].toFixed(2) };
      const et = [];
      for (const w of ['gojo', 'sukuna']) { const t0 = performance.now(); B.eyes(cv.g, w, 320, 180, 600, { t: 0 }); et.push(performance.now() - t0); }
      res.eyes600 = { ms: et.map(v => +v.toFixed(1)) };
    }
    window.__bustPerf = res;
    console.log('bustperf', JSON.stringify(res));
    const out = HT.canvas(900, 260);
    out.g.fillStyle = '#17111a'; out.g.fillRect(0, 0, 900, 260);
    let y = 10;
    for (const k2 in res) { HT.text(out.g, (k2 + ' ' + JSON.stringify(res[k2]).replace(/[{}"]/g, '')).toUpperCase().slice(0, 170), 6, y, { font: 'tiny', col: C.foam }); y += 12; }
    return out.c;
  };
  // ?lab=bustfx&who=gojo — sizes 120/180/260, scene lights (dawn from the right, sunset from the left, noon), rim, tint,
  // and a 12-drawing time strip (wind sway + a blink) to check animation and determinism by eye
  HT.labs.bustfx = Q => {
    const who = Q.get('who') || 'gojo', part = Q.get('part') || 'all';
    const cells = [];
    const add = (label, size, oo) => cells.push({ label, draw(g, cw, ch) { B.draw(g, who, cw / 2, ch, Object.assign({ size, t: 0 }, oo)); } });
    if (part === 'all' || part === 'size') for (const sz of [120, 180, 260]) add('size ' + sz, sz, { expr: 'smirk' });
    if (part === 'all' || part === 'light') {
      add('dawn R light, ice rim', 180, { expr: 'serious', light: [0.7, -0.35, 0.6], rim: C.ice, face: -1 });
      add('sunset L, coral rim, tint', 180, { expr: 'smile', light: [-0.75, -0.2, 0.6], rim: C.coral, tint: [C.orange, 0.18] });
      add('noon top', 180, { expr: 'neutral', light: [0.1, -0.95, 0.3] });
      add('void tint navy', 180, { expr: 'calm', light: [-0.3, -0.5, 0.8], rim: C.sky, tint: [C.navy, 0.3], eyes: 'glow' });
      add('shrine tint crimson', 180, { expr: 'strain', light: [0.4, -0.6, 0.7], rim: C.red, tint: [C.crimson, 0.22], face: -1 });
      add('back light', 180, { expr: 'neutral', light: [0.0, -0.3, -0.6], rim: C.white });
    }
    if (part === 'all' || part === 'time') for (let i = 0; i < 12; i++) { const t = +(Q.get('t0') || 2.6) + i / 12; add('t ' + t.toFixed(2), 150, { expr: 'neutral', t, wind: [0.7, -0.1], idle: true }); }
    return HT.sheet(cells, { cw: 340, ch: 300, cols: +(Q.get('cols') || 6), scale: +(Q.get('scale') || 2), cellBg: labBg });
  };
  // ?lab=eyes&w=600&scale=2 — extreme close-ups (Gojo open/glow/narrow/closed, Sukuna open2 0 → 1, Geto, Mahoraga)
  HT.labs.eyes = Q => {
    const w = +(Q.get('w') || 600);
    const list = [
      ['gojo', { eyes: 'open' }], ['gojo', { eyes: 'glow' }], ['gojo', { expr: 'serious', eyes: 'narrow' }], ['gojo', { expr: 'exhausted', eyes: 'closed' }],
      ['sukuna', { expr: 'contempt', open2: 0 }], ['sukuna', { expr: 'contempt', open2: 0.5 }], ['sukuna', { expr: 'grin', open2: 1 }],
      ['geto', { expr: 'smile' }], ['mahoraga', {}],
    ].filter(e => !Q.get('who') || Q.get('who').split(',').includes(e[0]));
    const cells = list.map(([who, oo]) => ({ label: who + ' ' + JSON.stringify(oo).replace(/[{}"]/g, ''), draw(g, cw, ch) { B.eyes(g, who, cw / 2, ch / 2, w, Object.assign({ light: [-0.5, -0.55, 0.67], t: 0 }, oo)); } }));
    return HT.sheet(cells, { cw: w + 20, ch: round(w * 0.5), cols: +(Q.get('cols') || 2), scale: +(Q.get('scale') || 1), cellBg: labBg });
  };
  // ?lab=hands&who=gojo,sukuna&size=160&scale=3 — every sign; purple phases
  HT.labs.hands = Q => {
    const who = (Q.get('who') || 'gojo,sukuna').split(','), size = +(Q.get('size') || 160);
    const signs = (Q.get('signs') || 'void,shrine,point,two,fist,open').split(',');
    const L = Q.get('lx') ? [+Q.get('lx'), +Q.get('ly'), +Q.get('lz')] : undefined;
    const cells = [];
    for (const w of who) for (const sg of signs) cells.push({ label: w + ' ' + sg, draw(g, cw, ch) { B.hands(g, w, sg, cw / 2, ch, size, { light: L, face: +(Q.get('face') || 1), costume: Q.get('costume') || undefined, mono: !!Q.get('mono'), debug: Q.get('debug') || undefined }); } });
    if (!Q.get('signs')) for (const ph of [0.1, 0.38, 0.55, 0.74, 0.9]) cells.push({ label: 'purple ' + ph, draw(g, cw, ch) { B.hands(g, 'gojo', 'purple', cw / 2, ch, size, { phase: ph, light: L }); } });
    return HT.sheet(cells, { cw: round(size * 1.3), ch: round(size * 1.02), cols: +(Q.get('cols') || 6), scale: +(Q.get('scale') || 2), cellBg: labBg });
  };
  // one bust, big: ?lab=bust&who=gojo&expr=smirk&eyes=open&size=180&face=1&turn=0&costume=fight&scale=4&lx=&ly=&lz=&rim=
  HT.labs.bust = Q => {
    const who = (Q.get('who') || 'gojo').split(','), exprs = (Q.get('expr') || 'neutral').split(','), size = +(Q.get('size') || 180);
    const faces = (Q.get('face') || '1').split(',').map(Number), turns = (Q.get('turn') || '0').split(',').map(Number);
    const L = Q.get('lx') ? [+Q.get('lx'), +Q.get('ly'), +Q.get('lz')] : undefined;
    const cells = [];
    for (const w of who) for (const e of exprs) for (const f of faces) for (const tn of turns) cells.push({ label: `${w} ${e} f${f} t${tn}`, draw(g, cw, ch) {
      B.draw(g, w, cw / 2, ch, { size, expr: e, eyes: Q.get('eyes') || undefined, face: f, turn: tn, costume: Q.get('costume') || undefined, light: L, rim: Q.get('rim') ? C[Q.get('rim')] : undefined, mono: !!Q.get('mono'), t: +(Q.get('t') || 0), bleed: +(Q.get('bleed') || 0), sweat: +(Q.get('sweat') || 0), hurt: +(Q.get('hurt') || 0), look: Q.get('look') ? Q.get('look').split(',').map(Number) : undefined, eyes2: Q.get('eyes2') || undefined, debug: Q.get('debug') || undefined });
    } });
    const topMax = Math.max(...who.map(w => (CH[w].frame || { top: 1 }).top));
    return HT.sheet(cells, { cw: round(size * 1.3), ch: round(size * (topMax + 1.45) / 2.3 + 6), cols: +(Q.get('cols') || 4), scale: +(Q.get('scale') || 3), cellBg: labBg, quantize: !Q.get('nq') });
  };
})();
