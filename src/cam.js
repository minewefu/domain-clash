/* DOMAIN CLASH — camera model, projection and the shot library.

   World: metres. x = east, y = north, z = up. Ground plane z = 0. Fighters stand at (x, y, z = feet height).
   Camera: { x, y, z, yaw, pitch, roll, f, shift, sx, sy, vx, vy, vw, vh }
     yaw   heading from +y toward +x (0 = looking north, +π/2 = looking east)
     pitch radians, + = look up.  roll radians (rare; dutch angles)
     f     focal length in pixels (horizontal FOV = 2·atan(vw/2/f)); 480 ≈ 67°, 640 ≈ 53°, 1200 ≈ 30°
     shift vertical lens shift in px (moves the horizon without tilting verticals — architectural framing)
     sx,sy screen-space shake offset in px (added by the scene runner)
     vx..vh viewport (default full frame) — manga panels render the same world with several cameras
   Projection of a world point returns {x, y (screen px), s (px per metre at that depth), d (depth m)}. */
(function () {
  'use strict';
  const HT = window.HT, W = HT.W, H = HT.H;
  const cam = (HT.cam = {});
  const clamp = HT.clamp, lerp = HT.lerp;

  cam.defaultMaxDist = 0; // scenes in narrow streets set env.camMaxDist (applied by the runner per frame)
  cam.make = o => Object.assign({ x: 0, y: -12, z: 1.5, yaw: 0, pitch: 0, roll: 0, f: 480, shift: 0, sx: 0, sy: 0, vx: 0, vy: 0, vw: W, vh: H }, o);
  cam.copy = c => Object.assign({}, c);
  // precompute trig + projection centre; call after changing any field (project() calls it lazily when stale)
  cam.prep = c => {
    c._cy = Math.cos(c.yaw); c._sy = Math.sin(c.yaw);
    c._cp = Math.cos(c.pitch); c._sp = Math.sin(c.pitch);
    c._cr = Math.cos(c.roll || 0); c._sr = Math.sin(c.roll || 0);
    const vw = c.vw || W, vh = c.vh || H;
    c._hx = (c.vx || 0) + vw / 2 + (c.sx || 0); c._hy = (c.vy || 0) + vh / 2 + (c.shift || 0) + (c.sy || 0);
    c._key = c.x + ',' + c.y + ',' + c.z + ',' + c.yaw + ',' + c.pitch + ',' + c.roll + ',' + c.f + ',' + c.shift + ',' + c.sx + ',' + c.sy + ',' + c.vx + ',' + c.vy + ',' + vw + ',' + vh;
    c._prepped = true;
    return c;
  };
  // world → camera space {r (right), u (up), d (depth)}
  cam.toView = (c, x, y, z, out) => {
    if (!c._prepped) cam.prep(c);
    const dx = x - c.x, dy = y - c.y, dz = z - c.z;
    const xr = dx * c._cy - dy * c._sy, yf = dx * c._sy + dy * c._cy;
    out = out || {};
    out.r = xr; out.d = yf * c._cp + dz * c._sp; out.u = -yf * c._sp + dz * c._cp;
    return out;
  };
  const NEAR = 0.08;
  cam.NEAR = NEAR;
  cam.project = (c, x, y, z, out) => {
    if (!c._prepped) cam.prep(c);
    const dx = x - c.x, dy = y - c.y, dz = z - c.z;
    const xr = dx * c._cy - dy * c._sy, yf = dx * c._sy + dy * c._cy;
    const fw = yf * c._cp + dz * c._sp, up = -yf * c._sp + dz * c._cp;
    if (fw < NEAR) return null;
    const k = c.f / fw;
    let px = xr * k, py = -up * k;
    if (c.roll) { const rx = px * c._cr - py * c._sr, ry = px * c._sr + py * c._cr; px = rx; py = ry; }
    out = out || {};
    out.x = c._hx + px; out.y = c._hy + py; out.s = k; out.d = fw;
    return out;
  };
  // screen → world ray direction (unit-less, not normalised) for the pixel centre (sx, sy); roll ignored
  cam.ray = (c, sx, sy, out) => {
    if (!c._prepped) cam.prep(c);
    const rx = (sx - c._hx) / c.f, ru = -(sy - c._hy) / c.f; // camera space: right, up, forward = 1
    // undo pitch: forward/up → horizontal forward + z
    const yf = 1 * c._cp - ru * c._sp, z = 1 * c._sp + ru * c._cp;
    // undo yaw: (right, forward) → world x, y
    out = out || {};
    out.x = rx * c._cy + yf * c._sy; out.y = -rx * c._sy + yf * c._cy; out.z = z;
    return out;
  };
  // aim a camera at a world point (sets yaw & pitch)
  cam.lookAt = (c, tx, ty, tz) => {
    const dx = tx - c.x, dy = ty - c.y, dz = tz - c.z;
    c.yaw = Math.atan2(dx, dy);
    c.pitch = Math.atan2(dz, Math.hypot(dx, dy));
    c._prepped = false;
    return c;
  };
  const angLerp = (a, b, t) => { let d = ((b - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * t; };
  // blend two cameras (position/f/shift linear, angles along the short arc)
  cam.blend = (a, b, t) => {
    if (t <= 0) return a; if (t >= 1) return b;
    const c = {};
    for (const k of ['x', 'y', 'z', 'f', 'shift', 'sx', 'sy', 'vx', 'vy', 'vw', 'vh']) c[k] = lerp(a[k] ?? 0, b[k] ?? 0, t);
    c.yaw = angLerp(a.yaw || 0, b.yaw || 0, t); c.pitch = lerp(a.pitch || 0, b.pitch || 0, t); c.roll = lerp(a.roll || 0, b.roll || 0, t);
    if (!c.vw) c.vw = W; if (!c.vh) c.vh = H;
    return c;
  };
  cam.fovX = c => 2 * Math.atan((c.vw || W) / 2 / c.f);
  cam.forward = c => [Math.sin(c.yaw) * Math.cos(c.pitch), Math.cos(c.yaw) * Math.cos(c.pitch), Math.sin(c.pitch)];
  cam.right = c => [Math.cos(c.yaw), -Math.sin(c.yaw), 0];

  // ------------------------------------------------------------------ framing helpers
  // Frame world points (feet positions + heights) from a given yaw so the reference height (1.8 m) spans `size` px.
  // opts: size (px for 1.8 m), yaw, f, height (camera z, m), feetY (screen y for the lowest foot), lead (px, + = right),
  //       spread (max fraction of the frame width the subjects may span), minDist, pitch.
  cam.frame = (pts, o = {}) => {
    const yaw = o.yaw || 0, f = o.f || 480, sy = Math.sin(yaw), cy = Math.cos(yaw);
    let rMin = Infinity, rMax = -Infinity, dSum = 0, zMin = Infinity, zMax = -Infinity, cxs = 0, cys = 0;
    for (const p of pts) {
      const r = p[0] * cy - p[1] * sy, d = p[0] * sy + p[1] * cy, h = p[3] || 1.8;
      rMin = Math.min(rMin, r - 0.4); rMax = Math.max(rMax, r + 0.4); dSum += d; zMin = Math.min(zMin, p[2]); zMax = Math.max(zMax, p[2] + h);
      cxs += p[0]; cys += p[1];
    }
    const n = Math.max(1, pts.length), rc = (rMin + rMax) / 2, dc = dSum / n;
    let s = (o.size || 56) / 1.8;
    const spread = o.spread || 0.62;
    if ((rMax - rMin) * s > W * spread) s = (W * spread) / (rMax - rMin);
    let D = Math.max(o.minDist || 1.2, f / s);
    const maxD = o.maxDist || cam.defaultMaxDist;
    let fOut = f;
    if (maxD && D > maxD) { fOut = f * maxD / D; D = maxD; } // keep the camera inside the street: shorter lens, same framing
    const camZ = o.height !== undefined ? o.height : zMin + 1.25;
    const c = { f: fOut, yaw, pitch: o.pitch || 0, roll: 0, z: camZ, vx: 0, vy: 0, vw: W, vh: H };
    // camera sits D metres "in front" (−forward) of the subjects' centre, offset along right so rc is centred (+lead)
    const lead = (o.lead || 0) / s;
    const cr = rc - lead, cd = dc - D;
    c.x = cr * cy + cd * sy; c.y = -cr * sy + cd * cy;
    const feetY = o.feetY !== undefined ? o.feetY : H * 0.8;
    c.shift = o.pitch ? (o.shift || 0) : feetY - H / 2 + fOut * (zMin - camZ) / D;
    c._D = D; c._s = s;
    return c;
  };

  // ------------------------------------------------------------------ shot library
  // Every shot: fn(S, t, p, t0) → camera (unprepped). S = scene state from the fight runner:
  //   S.at(name, t) → {x, y, z, h, face} (smooth, unquantised world position of a character's feet)
  //   S.pt(ref, t) → [x, y, z] for 'name', 'name.head', 'name.chest', 'mid' (midpoint of the first two cast members), or [x,y,z]
  // p = the shot event's params, t0 = the event's start time (so shots can animate over their own duration).
  const shots = (HT.shots = {});
  const pts = (S, t, on) => (on || S.castNames.slice(0, 2)).map(n => { const a = S.at(n, t); return [a.x, a.y, a.z, a.h]; });
  const easeOf = (p, x) => (HT.E[p.ease || 'inOutCubic'] || HT.E.inOutCubic)(clamp(x, 0, 1));
  const prog = (p, t, t0) => easeOf(p, (t - t0) / Math.max(1e-3, p.dur || 1));

  shots.static = (S, t, p, t0) => {
    const a = cam.make(p.cam || {});
    if (p.to) { const b = cam.make(Object.assign({}, p.cam, p.to)); return cam.blend(a, b, prog(p, t, t0)); }
    return a;
  };
  shots.wide = (S, t, p) => cam.frame(pts(S, t, p.on), Object.assign({ size: 56, f: 460 }, p));
  shots.medium = (S, t, p) => cam.frame(pts(S, t, p.on), Object.assign({ size: 96, f: 560, spread: 0.7 }, p));
  shots.full = (S, t, p) => cam.frame(pts(S, t, p.on), Object.assign({ size: 150, f: 620, spread: 0.8, feetY: H * 0.94 }, p));
  // low heroic angle: camera near the ground looking up a little
  shots.low = (S, t, p) => { const c = cam.frame(pts(S, t, p.on), Object.assign({ size: 110, f: 420, height: 0.35, feetY: H * 0.86 }, p)); return c; };
  // over-the-shoulder: behind `from`, looking at `to`. The `from` fighter renders as a near, dark foreground shape.
  shots.ots = (S, t, p) => {
    const A = S.at(p.from, t), B = S.at(p.to, t);
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const side = p.side === undefined ? 1 : p.side; // +1 = camera over the from-fighter's right shoulder (screen left)
    const back = p.back || 1.6, off = (p.off || 0.55) * side;
    const c = { x: A.x - ux * back + uy * off, y: A.y - uy * back - ux * off, z: A.z + (p.height || A.h * 0.92), f: p.f || 520, roll: 0, shift: 0, vw: W, vh: H, vx: 0, vy: 0 };
    cam.lookAt(c, B.x, B.y, B.z + B.h * (p.aim || 0.62));
    return c;
  };
  // telephoto portrait framing for bust close-ups (the runner draws the bust over this camera's background)
  shots.closeup = (S, t, p) => {
    const A = S.at(p.who, t), yaw = p.yaw || 0, f = p.f || 900, D = p.dist || 6;
    const c = { f, yaw, pitch: 0, roll: 0, z: A.z + A.h * 0.9, vw: W, vh: H, vx: 0, vy: 0 };
    c.x = A.x - Math.sin(yaw) * D + Math.cos(yaw) * (p.dx || 0); c.y = A.y - Math.cos(yaw) * D - Math.sin(yaw) * (p.dx || 0);
    c.shift = p.shift || 40;
    c.closeup = p; // marker for the runner
    return c;
  };
  shots.ecu = (S, t, p) => { const c = shots.closeup(S, t, Object.assign({ f: 1400, dist: 5 }, p)); c.ecu = p; return c; };
  // crash zoom: fast push onto a target (f multiplies by `zoom` over `dur`, default 0.22 s, ease-out)
  shots.crash = (S, t, p, t0) => {
    const base = (shots[p.base || 'wide'])(S, t0, p, t0);
    const tgt = S.pt(p.target || p.on?.[0] || 'mid', t0);
    const q = HT.E.outCubic(clamp((t - t0) / (p.dur || 0.22), 0, 1));
    const c = cam.copy(base);
    const z = 1 + ((p.zoom || 3) - 1) * q;
    // zoom toward the target: rotate the aim toward it as we push (keeps it centred)
    const aim = cam.copy(base); cam.prep(aim);
    const sp = cam.project(aim, tgt[0], tgt[1], tgt[2]);
    c.f = base.f * z;
    if (sp) { c.shift = lerp(base.shift, (base.shift - (sp.y - H / 2)) * z + (p.frameY || 0), q); c.yaw = base.yaw + Math.atan2(sp.x - W / 2, base.f) * q; }
    c.crash = q;
    return c;
  };
  // dolly zoom (vertigo): the camera travels along its view axis from dist d0 to d1 while f changes so the subject
  // keeps its screen size: f(t) = f0 · d(t) / d0
  shots.dolly = (S, t, p, t0) => {
    const A = S.at(p.who, t0), yaw = p.yaw || 0, d0 = p.d0 || 4, d1 = p.d1 || 16, f0 = p.f0 || 320;
    const q = prog(p, t, t0), d = lerp(d0, d1, q);
    const c = { yaw, pitch: 0, roll: 0, z: A.z + (p.height || 1.55), f: f0 * d / d0, vw: W, vh: H, vx: 0, vy: 0 };
    c.x = A.x - Math.sin(yaw) * d; c.y = A.y - Math.cos(yaw) * d;
    c.shift = (p.feetY !== undefined ? p.feetY : H * 0.84) - H / 2 + c.f * (A.z - c.z) / d;
    return c;
  };
  // orbit around a centre point (default: the midpoint of the fighters) from yaw a0 to a1 (radians) over dur
  shots.orbit = (S, t, p, t0) => {
    const ctr = S.pt(p.center || 'mid', p.track ? t : t0);
    const q = prog(Object.assign({ ease: 'inOutSine' }, p), t, t0), a = lerp(p.a0 || 0, p.a1 || Math.PI, q);
    const R = p.r || 9, h = p.height || 2.2;
    const c = { x: ctr[0] - Math.sin(a) * R, y: ctr[1] - Math.cos(a) * R, z: ctr[2] + h, f: p.f || 460, roll: 0, shift: p.shift || 0, vw: W, vh: H, vx: 0, vy: 0 };
    cam.lookAt(c, ctr[0], ctr[1], ctr[2] + (p.aimZ || 1.0));
    return c;
  };
  // high angle / overhead: pitch −90° is straight down (the set renders roofs/ground; fighters render as tiny figures)
  shots.overhead = (S, t, p, t0) => {
    const ctr = S.pt(p.center || 'mid', p.track ? t : t0), q = prog(p, t, t0);
    const h = lerp(p.h0 || p.height || 60, p.h1 || p.height || 60, q), pitch = p.pitch !== undefined ? p.pitch : -Math.PI / 2 + 0.001;
    const yaw = lerp(p.yaw0 || p.yaw || 0, p.yaw1 !== undefined ? p.yaw1 : (p.yaw || 0), q);
    const back = pitch > -1.5 ? h / Math.tan(-pitch) : 0;
    return { x: ctr[0] - Math.sin(yaw) * back, y: ctr[1] - Math.cos(yaw) * back, z: ctr[2] + h, yaw, pitch, roll: 0, f: p.f || 420, shift: 0, vw: W, vh: H, vx: 0, vy: 0 };
  };
  // path: camera keyframes [[t, x, y, z, yaw, pitch, f], ...] (times relative to the shot start), Catmull-Rom
  shots.path = (S, t, p, t0) => {
    const K = p.keys, u = t - t0;
    let i = 0; while (i < K.length - 2 && u > K[i + 1][0]) i++;
    const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[Math.min(K.length - 1, i + 1)], k3 = K[Math.min(K.length - 1, i + 2)];
    const s = clamp((u - k1[0]) / Math.max(1e-6, k2[0] - k1[0]), 0, 1), s2 = s * s, s3 = s2 * s;
    const cr = j => 0.5 * ((2 * k1[j]) + (-k0[j] + k2[j]) * s + (2 * k0[j] - 5 * k1[j] + 4 * k2[j] - k3[j]) * s2 + (-k0[j] + 3 * k1[j] - 3 * k2[j] + k3[j]) * s3);
    const c = { x: cr(1), y: cr(2), z: cr(3), yaw: cr(4), pitch: cr(5), f: cr(6), roll: 0, shift: p.shift || 0, vw: W, vh: H, vx: 0, vy: 0 };
    if (p.look) { const L = S.pt(p.look, t); cam.lookAt(c, L[0], L[1], L[2]); }
    return c;
  };
  // follow: tracks a subject from a fixed offset (chase cam)
  shots.follow = (S, t, p) => {
    const A = S.at(p.who, t), o = p.offset || [0, -8, 2];
    const c = { x: A.x + o[0], y: A.y + o[1], z: A.z + o[2], f: p.f || 460, roll: 0, shift: p.shift || 0, vw: W, vh: H, vx: 0, vy: 0 };
    cam.lookAt(c, A.x, A.y, A.z + (p.aimZ || 1));
    return c;
  };
})();
