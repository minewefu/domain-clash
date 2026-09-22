/* DOMAIN CLASH — interior and domain sets (void, command, corridor, airport, sky) + env presets (shrine, airport) +
   post 'tally' + watcher figures + ?lab=rooms. Loads after sets.js (uses HT.SETS.city / HT.renderCity / HT.SETS.voxel,
   HT.ENVS) and before fx.js (HT.fxu raster helpers are looked up lazily at draw time).

   Set interface (SPEC §9): HT.SETS[name] = { shear?, init(scene, setOpts) → res, draw(ctx, cam, S, 'back', res),
   drawFront?(ctx, cam, S, res), dispose?(res) }. Every set honours the camera viewport (cam.vx/vy/vw/vh — manga panels
   render the world into panel-sized canvases), is a pure function of S.t / S.T, keeps its caches bounded (HT.lru,
   listed in HT.caches) and works when `res` belongs to another set (a panel's env override {set:'void'} reuses the
   scene's res): it then falls back to setOpts[<name>] of the scene (e.g. setOpts: { void: {...} }) or the defaults.
   Option values marked (kf) accept a number, keyframes [[t, v], ...] (scene seconds, linear) or {at, dur, from, to}.

   Coordinate frames: metres, x east, y north, z up, floor z = 0 (the rig's feet), yaw 0 = looking north (SPEC §5).
   Interior sets are their own little worlds centred on the origin (they are not placed inside the Shinjuku model).

   INDEX (full option lists in each section's comment)
     void      shear:false — Unlimited Void: celestial-sphere nebula/stars/galaxies/black hole, glassy floor cue (mirror +
               ripples, optional hatch), glyph streams, crumble → the city behind. Frame: open space, floor z = 0.
     command   shear:true — the watchers' room inside Rika (canon ch. 225): CRT tower (origin) with live city feeds, taped
               cables on a tiled floor fading to black, crates, rim-lit watcher silhouettes, optional 7-segment clock.
     corridor  shear:true — office corridor x −1.4…1.4, y −3…37, h 2.7: panels, doors, extinguisher cabinet, window end
               wall; ceilingBreakAt → hole + falling tiles + dust + dying panels.
     airport   shear:true — the ch. 236 departure lounge x −16…16, y −8…10 (window wall y = 10), h 7: sun patches, shafts,
               Y-struts, linked seats, bench, 7-lotus planter, palms, café, abstract board; parked plane, takeoffAt.
     sky       shear:true — Voxel city from altitude + sun disc/halo + low cloud deck + cirrus + crepuscular rays.
     HT.ENVS.shrine / HT.ENVS.airport (+ '<time>_alt' presets derived at runtime by the sky set for clearer air).
     HT.post.tally(ctx, S, e{n, col, x, y, accent, hold}, age, dur) — the 5-tick clash tally (top-right, ≈ 40×10 px).
     Watchers: rig chars 'w_yuji' 'w_yuta' 'w_kusakabe' 'w_hakari' 'w_kashimo' 'w_maki' 'w_generic', poses 'w_*';
               setOpts.watchers (command set) or HT.props.watchers(ctx, S, list, {light, family}) over any set.
     HT.rooms  helpers: viewOf proj projDir kf engine{makeTex makeLev renderRoom rasterPoly rasterBox rasterOBox
               blitDepth preOf} clockStr CRTS CLOCK_CRT WHO mockS labCast voidEnsure.
     ?lab=rooms[&only=void,command,corridor,airport,sky,shrine,tally][&cols=3][&scale=1] · HT.roomsBench([names], n)
               → {name: {mean, p90, max}} ms of set.draw over n frames of a moving camera (+ a 1-px readback).
   Measured on the dev machine (headless Chrome, 640×360, 60 frames, moving camera): void ≈ 2.0–2.2 ms, command ≈ 1.5,
   corridor ≈ 1.8, airport ≈ 3.1–3.3, sky ≈ 2.9–3.1 (looking straight down on the district ≈ 4.7); void crumble frames
   add the street-level city renderer (≈ 4.6 held camera, ≈ 12 moving). Builds run as sliced boot tasks (≈ 150 ms).
*/
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, CAM = HT.cam;
  const W = HT.W, H = HT.H;
  const clamp = HT.clamp, lerp = HT.lerp;
  const floor = Math.floor, round = Math.round, abs = Math.abs, sqrt = Math.sqrt, min = Math.min, max = Math.max;
  const sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2;
  HT.SETS = HT.SETS || {};
  HT.labs = HT.labs || {};
  HT.post = HT.post || {};
  HT.bootTasks = HT.bootTasks || [];
  const ROOMS = (HT.rooms = HT.rooms || {}); // shared helpers for scene writers (projection, keyframes, figures)
  ROOMS.labCells = ROOMS.labCells || [];   // ?lab=rooms cells: [{set, label, draw(g)}] (g = a 640×360 canvas context)
  ROOMS.benches = ROOMS.benches || {};     // HT.roomsBench: name → fn(g, i) renders frame i of a moving camera

  // ================================================================== small helpers
  const rgbOf = hex => HT.rgb(hex);
  const pk = (r, g, b) => (0xff000000 | ((b < 0 ? 0 : b > 255 ? 255 : b) << 16) | ((g < 0 ? 0 : g > 255 ? 255 : g) << 8) | (r < 0 ? 0 : r > 255 ? 255 : r)) >>> 0;
  const pkHex = hex => { const c = rgbOf(hex); return pk(c[0], c[1], c[2]); };
  const smooth01 = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  // keyframed option: number | [[t, v], ...] | {at, dur, from, to, ease}
  function kf(v, t, def) {
    if (v === undefined || v === null) return def;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (Array.isArray(v)) {
      if (!v.length) return def;
      if (t <= v[0][0]) return v[0][1];
      for (let i = 1; i < v.length; i++) if (t <= v[i][0]) { const a = v[i - 1], b = v[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / Math.max(1e-6, b[0] - a[0]); }
      return v[v.length - 1][1];
    }
    if (typeof v === 'object') {
      const u = clamp((t - (v.at || 0)) / Math.max(1e-6, v.dur === undefined ? 1 : v.dur), 0, 1);
      const e = (HT.E[v.ease || 'inOutQuad'] || HT.E.inOutQuad)(u);
      return lerp(v.from === undefined ? 0 : v.from, v.to === undefined ? 1 : v.to, e);
    }
    return def;
  }
  ROOMS.kf = kf;
  // the set's options: its own res (initialised from setOpts), else the scene's setOpts[name] (panel overrides), else {}
  const fallbackRes = HT.lru(8);
  HT.caches.push({ name: 'rooms.fallbackRes', size: () => fallbackRes.size });
  function resOf(name, res, S, make) {
    if (res && res.kind === name) return res;
    const sc = S && S.sc, def = sc && sc.fightDef, o = (def && def.setOpts && def.setOpts[name]) || {};
    const key = name + '|' + (sc ? sc.id : '-');
    let r = fallbackRes.get(key);
    if (!r || r.o !== o) { r = make(o); fallbackRes.set(key, r); }
    return r;
  }

  // ------------------------------------------------------------------ view basis (matches HT.cam.project incl. roll)
  // sheared: pitch is folded into the lens shift (verticals stay vertical) — the convention of shear:true sets.
  function viewOf(c, sheared) {
    if (!c._prepped) CAM.prep(c);
    const vx = round(c.vx || 0), vy = round(c.vy || 0), vw = round(c.vw || W), vh = round(c.vh || H);
    const V = { vx, vy, vw, vh, f: c.f, hx: c._hx - vx, hy: c._hy - vy, x: c.x, y: c.y, z: c.z, c, sheared: !!sheared };
    let pitch = c.pitch || 0;
    if (sheared && pitch) { V.hy += c.f * Math.tan(pitch); pitch = 0; }
    const cy = cos(c.yaw), sy = sin(c.yaw), cp = cos(pitch), sp = sin(pitch), roll = c.roll || 0;
    V.cy = cy; V.sy = sy; V.cp = cp; V.sp = sp; V.cr = cos(roll); V.sr = sin(roll); V.roll = roll;
    V.Rx = cy; V.Ry = -sy; V.Rz = 0;                 // right
    V.Fx = sy * cp; V.Fy = cy * cp; V.Fz = sp;       // forward
    V.Ux = -sy * sp; V.Uy = -cy * sp; V.Uz = cp;     // up
    return V;
  }
  // world point → local viewport pixel {x, y, d (forward depth), s (px per metre)} or null (behind the near plane)
  function proj(V, x, y, z, out) {
    const dx = x - V.x, dy = y - V.y, dz = z - V.z;
    const d = dx * V.Fx + dy * V.Fy + dz * V.Fz;
    if (d < 0.05) return null;
    const r = dx * V.Rx + dy * V.Ry, u = dx * V.Ux + dy * V.Uy + dz * V.Uz, k = V.f / d;
    let px = r * k, py = -u * k;
    if (V.roll) { const a = px * V.cr - py * V.sr, b = px * V.sr + py * V.cr; px = a; py = b; }
    out = out || {};
    out.x = V.hx + px; out.y = V.hy + py; out.d = d; out.s = k;
    return out;
  }
  // direction (at infinity) → local pixel, or null if behind the camera
  function projDir(V, x, y, z, out) {
    const d = x * V.Fx + y * V.Fy + z * V.Fz;
    if (d < 1e-4) return null;
    const r = x * V.Rx + y * V.Ry, u = x * V.Ux + y * V.Uy + z * V.Uz, k = V.f / d;
    let px = r * k, py = -u * k;
    if (V.roll) { const a = px * V.cr - py * V.sr, b = px * V.sr + py * V.cr; px = a; py = b; }
    out = out || {};
    out.x = V.hx + px; out.y = V.hy + py; out.d = d;
    return out;
  }
  ROOMS.viewOf = viewOf; ROOMS.proj = proj; ROOMS.projDir = projDir;

  // ------------------------------------------------------------------ buffers and scratch canvases (bounded)
  const BUFS = HT.lru(6), CANV = HT.lru(8);
  HT.caches.push({ name: 'rooms.buffers', size: () => BUFS.size }, { name: 'rooms.canvases', size: () => CANV.size });
  function bufFor(name, w, h) {
    const key = name + '|' + w + 'x' + h;
    let b = BUFS.get(key);
    if (!b) { const img = new ImageData(w, h); b = { img, buf: new Uint32Array(img.data.buffer), zb: new Float32Array(w * h), w, h }; BUFS.set(key, b); }
    return b;
  }
  function canvasFor(name, w, h) {
    const key = name + '|' + w + 'x' + h;
    let cv = CANV.get(key);
    if (!cv) { cv = HT.canvas(w, h); CANV.set(key, cv); }
    cv.g.setTransform(1, 0, 0, 1, 0, 0); cv.g.globalAlpha = 1; cv.g.globalCompositeOperation = 'source-over'; cv.g.imageSmoothingEnabled = false;
    return cv;
  }
  // draw with a clip to the viewport (canvas passes of the sets must never leak outside a panel's viewport)
  function clipped(ctx, V, fn) { ctx.save(); ctx.beginPath(); ctx.rect(V.vx, V.vy, V.vw, V.vh); ctx.clip(); try { fn(); } finally { ctx.restore(); } }
  const fxu = () => HT.fxu;
  function fxClip(ctx, V) { const U = fxu(); if (U && U.setClip) U.setClip(ctx, { cam: { vx: V.vx, vy: V.vy, vw: V.vw, vh: V.vh } }); }

  // ================================================================== 3D value noise (cubemap / cloud builders)
  const h3 = (ix, iy, iz, s) => {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1440662683) + Math.imul(s, 144665)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  function vnoise3(x, y, z, s) {
    const ix = floor(x), iy = floor(y), iz = floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const a = h3(ix, iy, iz, s), b = h3(ix + 1, iy, iz, s), c = h3(ix, iy + 1, iz, s), d = h3(ix + 1, iy + 1, iz, s);
    const e = h3(ix, iy, iz + 1, s), f = h3(ix + 1, iy, iz + 1, s), g = h3(ix, iy + 1, iz + 1, s), hh = h3(ix + 1, iy + 1, iz + 1, s);
    const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (hh - g) * u;
    const y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
    return y1 + (y2 - y1) * w;
  }
  function fbm3(x, y, z, oct, s) { let sum = 0, a = 0.5, fr = 1, n = 0; for (let i = 0; i < oct; i++) { sum += a * vnoise3(x * fr, y * fr, z * fr, s + i * 31); n += a; a *= 0.5; fr *= 2.03; } return sum / n; }

  // ================================================================== VOID — Unlimited Void interior
  /* Canon: an infinite cosmic space ("infinite information"): a starfield, a huge black hole with a bright accretion ring,
     distant galaxies; the fighters stand on nothing. Everything in the sky is a DIRECTION on a celestial sphere (camera
     translation never moves it; yaw/pitch/roll/f do) — the nebula is a 6×128² cubemap sampled bilinearly (2×2 pixel
     blocks, smooth colours → the quantizer dithers), ~2400 stars are projected as points, galaxies are fx.js sprites,
     the black hole is drawn in its own 3D frame (disc tilt, near half over the hole, lensed rim, photon ring, a prismatic
     fringe). The floor cue: below the horizon the sky is mirrored very dimly (a glassy nothing) with reflected streaks of
     the black hole / bright stars, and faint ripple rings expand at the fighters' feet (z = 0).
     Not a shear set: the camera's real pitch rotates the sphere (keep pitch > −1.0: the runner treats steeper views as
     overhead maps).
     setOpts: bh [x,y,z] direction (default [0.18, 1, 0.34]) · bhR (angular radius, 0.075 rad) · bhTilt (−0.12) ·
       intensity (kf, 1) · drift (sky rotation rad/s, 0.001) · seed · floor (true | false | {at: [[x,y],...] (default:
       the cast's feet), k (strength), rings (true), hatch (false: faint diagonal hatching around them, cf. ch. 229)}) ·
       glyphs (false | true | n streams | {n, speed, near}) · crumble (kf 0..1) · crumbleAt ([x,y,z] world point where the
       break starts; default ahead of the camera on the floor) · crumbleTo ('city' | 'black' | 'white') · crumbleEnv
       (env for the revealed city, default the scene env) */
  const VN = 128;                     // cubemap face size
  const VOID = { built: false, R: null, G: null, B: null, stars: null, gal: null };
  const BAND = (() => { const v = [0.35, -0.3, 0.88], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })(); // pole of the star band
  const NEB_RAMP = [C.plum, C.purple, C.indigo, C.purple, C.plum].map(rgbOf);
  const NEB_HI = [C.violet, C.lavender, C.blue, C.sky, C.blue].map(rgbOf);
  const INK = rgbOf(C.ink);
  function* voidBuild() {
    if (VOID.built) return;
    const N = VN, R = new Uint8Array(6 * N * N), G = new Uint8Array(6 * N * N), B = new Uint8Array(6 * N * N);
    for (let face = 0; face < 6; face++) {
      const axis = face >> 1, sgn = face & 1 ? -1 : 1;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const u = (i + 0.5) / N * 2 - 1, v = (j + 0.5) / N * 2 - 1;
          let x, y, z;
          if (axis === 0) { x = sgn; y = u; z = v; } else if (axis === 1) { y = sgn; x = u; z = v; } else { z = sgn; x = u; y = v; }
          const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
          const n = fbm3(x * 1.5 + 3, y * 1.5, z * 1.5, 4, 11), wisp = fbm3(x * 4.3, y * 4.3 + 7, z * 4.3, 4, 23);
          const bd = x * BAND[0] + y * BAND[1] + z * BAND[2], band = Math.exp(-(bd * bd) / 0.06);
          const ridge = 1 - abs(2 * wisp - 1), fil = ridge * ridge * ridge;                 // thin filaments
          const cover = smooth01((n * 0.85 + band * 0.3 - 0.4) / 0.32);                  // where the clouds live
          const dens = cover * (0.18 + 0.55 * fil) + band * 0.16;
          const hq = clamp(vnoise3(x * 1.2 + 9, y * 1.2, z * 1.2 + 4, 37) * 5.2 - 0.6, 0, 3.999), hi = floor(hq), hf = hq - hi;
          const a = NEB_RAMP[hi], b = NEB_RAMP[min(4, hi + 1)];
          let r = a[0] + (b[0] - a[0]) * hf, g = a[1] + (b[1] - a[1]) * hf, bb = a[2] + (b[2] - a[2]) * hf;
          const k = min(0.85, dens * 1.1);
          r = INK[0] + (r - INK[0]) * k; g = INK[1] + (g - INK[1]) * k; bb = INK[2] + (bb - INK[2]) * k;
          if (dens > 0.5 && fil > 0.55) { const hc = NEB_HI[hi], q = min(0.4, (dens - 0.5) * 1.6); r += (hc[0] - r) * q; g += (hc[1] - g) * q; bb += (hc[2] - bb) * q; }
          const o = face * N * N + j * N + i;
          R[o] = r; G[o] = g; B[o] = bb;
        }
        if ((j & 15) === 15) yield;
      }
    }
    // stars: uniform + a band population; [x, y, z, class 0..4, colour, phase]
    const rng = HT.rng(2291), S = [];
    const add = (x, y, z) => {
      const l = Math.hypot(x, y, z) || 1, m = rng();
      const cls = m < 0.55 ? 0 : m < 0.84 ? 1 : m < 0.955 ? 2 : m < 0.992 ? 3 : 4;
      S.push(x / l, y / l, z / l, cls, floor(rng() * 8), rng());
    };
    for (let i = 0; i < 4200; i++) { const zz = rng() * 2 - 1, a = rng() * TAU, rr = sqrt(1 - zz * zz); add(rr * cos(a), rr * sin(a), zz); }
    const e1 = [BAND[1], -BAND[0], 0], l1 = Math.hypot(e1[0], e1[1]) || 1; e1[0] /= l1; e1[1] /= l1;
    const e2 = [BAND[1] * e1[2] - BAND[2] * e1[1], BAND[2] * e1[0] - BAND[0] * e1[2], BAND[0] * e1[1] - BAND[1] * e1[0]];
    for (let i = 0; i < 2200; i++) {
      const a = rng() * TAU, off = (rng() + rng() + rng() - 1.5) * 0.2;
      add(cos(a) * e1[0] + sin(a) * e2[0] + off * BAND[0], cos(a) * e1[1] + sin(a) * e2[1] + off * BAND[1], cos(a) * e1[2] + sin(a) * e2[2] + off * BAND[2]);
    }
    // a few tight clusters ("information")
    for (let k = 0; k < 9; k++) {
      const zz = rng() * 1.6 - 0.6, a = rng() * TAU, rr = sqrt(1 - zz * zz), cx = rr * cos(a), cy = rr * sin(a);
      for (let i = 0; i < 26; i++) add(cx + (rng() - 0.5) * 0.05, cy + (rng() - 0.5) * 0.05, zz + (rng() - 0.5) * 0.05);
    }
    VOID.stars = new Float32Array(S);
    // galaxies: direction, angular size, arms, seed
    VOID.gal = [];
    for (let k = 0; k < 8; k++) {
      const zz = 0.05 + rng() * 0.75, a = rng() * TAU, rr = sqrt(1 - zz * zz);
      VOID.gal.push({ d: [rr * cos(a), rr * sin(a), zz], ang: k < 2 ? 0.08 + rng() * 0.04 : 0.022 + rng() * 0.045, arms: 2 + (k % 2), seed: 700 + k * 101 });
    }
    VOID.R = R; VOID.G = G; VOID.B = B; VOID.built = true;
  }
  HT.bootTasks.push({ name: 'void-sky', fn: voidBuild });
  function voidEnsure() { if (!VOID.built) { const it = voidBuild(); while (!it.next().done) { /* drain */ } } }
  ROOMS.voidEnsure = voidEnsure;

  // star colours (packed) by class/colour index; reflections use the dim ramp
  const STAR_COL = [
    [C.dusk, C.dusk, C.mauve, C.dusk, C.lilacgrey, C.dusk, C.mauve, C.dusk],
    [C.lilacgrey, C.steel, C.dusk, C.lilacgrey, C.steel, C.lavender, C.lilacgrey, C.steel],
    [C.mist, C.ice, C.steel, C.lavender, C.blush, C.mist, C.foam, C.cream],
    [C.white, C.ice, C.cream, C.white, C.blush, C.white, C.foam, C.white],
    [C.white, C.white, C.white, C.white, C.white, C.white, C.white, C.white],
  ].map(r => r.map(pkHex));
  const PRISM = [C.white, C.ice, C.foam, C.lavender, C.blush, C.white, C.aqua, C.gold];

  function voidRes(o) {
    const bh = o.bh || [0.18, 1, 0.34], l = Math.hypot(bh[0], bh[1], bh[2]) || 1;
    const b = [bh[0] / l, bh[1] / l, bh[2] / l];
    // disc frame: e1 horizontal ⟂ b, e2 ⟂ both (≈ up), rotated about b by the tilt
    let e1 = [b[1], -b[0], 0]; const l1 = Math.hypot(e1[0], e1[1]) || 1; e1 = [e1[0] / l1, e1[1] / l1, 0];
    let e2 = [e1[1] * b[2] - e1[2] * b[1], e1[2] * b[0] - e1[0] * b[2], e1[0] * b[1] - e1[1] * b[0]];
    if (e2[2] < 0) e2 = [-e2[0], -e2[1], -e2[2]];
    const tl = o.bhTilt === undefined ? -0.12 : o.bhTilt, ct = cos(tl), st = sin(tl);
    const E1 = [e1[0] * ct + e2[0] * st, e1[1] * ct + e2[1] * st, e1[2] * ct + e2[2] * st];
    const E2 = [e2[0] * ct - e1[0] * st, e2[1] * ct - e1[1] * st, e2[2] * ct - e1[2] * st];
    return { kind: 'void', o, b, E1, E2, rho: o.bhR || 0.075, seed: o.seed || 7 };
  }

  // background pass: nebula (2×2 blocks, bilinear cubemap) + mirrored dim floor; writes buf, zb = 0 (infinitely far)
  function voidBackground(Bf, V, k, floorK, rotA) {
    const buf = Bf.buf, vw = V.vw, vh = V.vh, N = VN, NN = N * N, R = VOID.R, G = VOID.G, B = VOID.B;
    const ca = cos(rotA), sa = sin(rotA);
    // sky frame = world rotated by −rotA about z
    const rot = (x, y) => [x * ca + y * sa, -x * sa + y * ca];
    const [Fx, Fy] = rot(V.Fx, V.Fy), [Rx, Ry] = rot(V.Rx, V.Ry), [Ux, Uy] = rot(V.Ux, V.Uy);
    const Fz = V.Fz, Rz = 0, Uz = V.Uz, f = V.f, cr = V.cr, sr = V.sr;
    // D(x, y) = F·f + R·px − U·py with px = X·cr + Y·sr, py = −X·sr + Y·cr (X, Y relative to the centre)
    const dDx = (Rx * cr + Ux * sr) * 2, dDy = (Ry * cr + Uy * sr) * 2, dDz = (Rz * cr + Uz * sr) * 2; // per 2 px along a row
    const fk = floorK * k, tintR = 50 * 0.18 * k, tintG = 51 * 0.18 * k, tintB = 83 * 0.18 * k; // floor: dim mirror + navy
    const half = N * 0.5;
    for (let y = 0; y < vh; y += 2) {
      const Y = y + 1 - V.hy, X0 = 1 - V.hx;
      const px0 = X0 * cr + Y * sr, py0 = -X0 * sr + Y * cr;
      let Dx = Fx * f + Rx * px0 - Ux * py0, Dy = Fy * f + Ry * px0 - Uy * py0, Dz = Fz * f + Rz * px0 - Uz * py0;
      const row0 = y * vw, row1 = y + 1 < vh ? row0 + vw : -1;
      for (let x = 0; x < vw; x += 2) {
        let dz = Dz, kk = k, refl = false;
        if (dz < 0) {
          dz = -dz; refl = true;
          const s1 = 1 - dz / sqrt(Dx * Dx + Dy * Dy + dz * dz), s2 = s1 * s1;   // Schlick-style: (1 − sin(depression))^5
          kk = fk + (k * 0.8 - fk) * s2 * s2 * s1;
        }
        const ax = Dx < 0 ? -Dx : Dx, ay = Dy < 0 ? -Dy : Dy, az = dz;
        let face, u, v, inv;
        if (ax >= ay && ax >= az) { inv = 1 / ax; face = Dx > 0 ? 0 : 1; u = Dy * inv; v = dz * inv; }
        else if (ay >= az) { inv = 1 / ay; face = Dy > 0 ? 2 : 3; u = Dx * inv; v = dz * inv; }
        else { inv = 1 / az; face = 4; u = Dx * inv; v = Dy * inv; }
        let fx = (u + 1) * half - 0.5, fy = (v + 1) * half - 0.5;
        if (fx < 0) fx = 0; else if (fx > N - 1.001) fx = N - 1.001;
        if (fy < 0) fy = 0; else if (fy > N - 1.001) fy = N - 1.001;
        const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, i0 = face * NN + iy * N + ix, i1 = i0 + N;
        const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
        let r = (R[i0] * w00 + R[i0 + 1] * w10 + R[i1] * w01 + R[i1 + 1] * w11) * kk;
        let g = (G[i0] * w00 + G[i0 + 1] * w10 + G[i1] * w01 + G[i1 + 1] * w11) * kk;
        let b = (B[i0] * w00 + B[i0 + 1] * w10 + B[i1] * w01 + B[i1 + 1] * w11) * kk;
        if (refl) { r += tintR; g += tintG; b += tintB; }
        const col = (0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r)) >>> 0;
        buf[row0 + x] = col; if (x + 1 < vw) buf[row0 + x + 1] = col;
        if (row1 >= 0) { buf[row1 + x] = col; if (x + 1 < vw) buf[row1 + x + 1] = col; }
        Dx += dDx; Dy += dDy; Dz += dDz;
      }
    }
    Bf.zb.fill(0);
    return { Fx, Fy, Fz, Rx, Ry, Rz, Ux, Uy, Uz };
  }
  // project a sky-frame direction with the rotated basis
  function skyProj(V, Bs, x, y, z, out) {
    const d = x * Bs.Fx + y * Bs.Fy + z * Bs.Fz;
    if (d < 1e-4) return null;
    const r = x * Bs.Rx + y * Bs.Ry + z * Bs.Rz, u = x * Bs.Ux + y * Bs.Uy + z * Bs.Uz, kk = V.f / d;
    let px = r * kk, py = -u * kk;
    if (V.roll) { const a = px * V.cr - py * V.sr, b = px * V.sr + py * V.cr; px = a; py = b; }
    out.x = V.hx + px; out.y = V.hy + py; out.d = d;
    return out;
  }
  const dimPk = (col, k) => pk((col & 255) * k + INK[0] * (1 - k), ((col >> 8) & 255) * k + INK[1] * (1 - k), ((col >> 16) & 255) * k + INK[2] * (1 - k));
  function voidStars(Bf, V, Bs, k, floorK, t) {
    const S = VOID.stars, buf = Bf.buf, vw = V.vw, vh = V.vh, P = { x: 0, y: 0, d: 0 };
    const tw = floor(t * 6);
    const put = (x, y, col) => { if (x >= 0 && y >= 0 && x < vw && y < vh) buf[y * vw + x] = col; };
    const dimK = clamp(k, 0, 1);
    for (let i = 0; i < S.length; i += 6) {
      const x = S[i], y = S[i + 1], z = S[i + 2], cls = S[i + 3], ci = S[i + 4], ph = S[i + 5];
      if (dimK < 0.35 && cls < 2) continue;
      // direct image (above the horizon only: below it the "floor" hides the lower sphere) + mirrored image
      if (z > -0.02 && skyProj(V, Bs, x, y, z, P)) {
        const sx = floor(P.x), sy = floor(P.y);
        if (sx >= -3 && sy >= -3 && sx < vw + 3 && sy < vh + 3) {
          let c = cls;
          if (cls >= 2 && HT.hash(i + tw * 7919, 5) < 0.04) c = max(0, cls - 1); // twinkle (on 2s)
          let col = STAR_COL[c][ci];
          if (dimK < 0.999) col = dimPk(col, dimK);
          put(sx, sy, col);
          if (c >= 3) {
            const arm = c === 4 ? 2 + ((floor(t * 6 + ph * 12)) % 3 === 0 ? 1 : 0) : 1, ac = c === 4 ? STAR_COL[3][ci] : STAR_COL[1][ci];
            for (let a = 1; a <= arm; a++) { const q = a === arm && arm > 1 ? STAR_COL[1][ci] : ac; put(sx - a, sy, q); put(sx + a, sy, q); put(sx, sy - a, q); put(sx, sy + a, q); }
          }
        }
      }
      if (cls >= 2 && z > 0.02 && skyProj(V, Bs, x, y, -z, P)) { // reflection: a short vertical streak, dim
        const sx = floor(P.x), sy = floor(P.y);
        if (sx >= 0 && sx < vw && sy >= 0 && sy < vh) {
          const col = dimPk(STAR_COL[max(0, cls - 2)][ci], clamp(floorK * 2.2 * dimK, 0, 1));
          put(sx, sy, col); if (cls >= 3) { put(sx, sy + 1, col); put(sx, sy + 2, dimPk(col, 0.6)); }
        }
      }
    }
  }
  // the black hole in its own frame. P(θ, R) = b + R (cosθ E1 − sinθ sin(i) E2) (near half = sinθ > 0: drawn after the
  // hole). mirror: the reflection in the glassy floor (z-flipped frame, strength from the same Fresnel-style curve as
  // the mirrored background, so it fades in with grazing angles)
  function voidBlackHole(ctx, V, Bs, res, k, t, ox, oy, mirror, floorK) {
    const U = fxu(); if (!U) return null;
    const zs = mirror ? -1 : 1, rb = res.b;
    if (mirror && rb[2] < 0.02) return null;
    const b = [rb[0], rb[1], rb[2] * zs], E1 = [res.E1[0], res.E1[1], res.E1[2] * zs], E2 = [res.E2[0], res.E2[1], res.E2[2] * zs], rho = res.rho;
    // cull against the view cone (half-diagonal from the projection centre) + the disc radius
    const cosA = b[0] * Bs.Fx + b[1] * Bs.Fy + b[2] * Bs.Fz;
    if (cosA < 0.25) return null;
    const dmax = Math.max(Math.hypot(V.hx, V.hy), Math.hypot(V.vw - V.hx, V.hy), Math.hypot(V.hx, V.vh - V.hy), Math.hypot(V.vw - V.hx, V.vh - V.hy));
    if (Math.acos(Math.min(1, cosA)) > Math.atan(dmax / V.f) + rho * 3.2) return null;
    const P0 = skyProj(V, Bs, b[0], b[1], b[2], {}); if (!P0) return null;
    const eps = 0.01, P1 = skyProj(V, Bs, b[0] + E1[0] * eps, b[1] + E1[1] * eps, b[2] + E1[2] * eps, {}), P2 = skyProj(V, Bs, b[0] + E2[0] * eps, b[1] + E2[1] * eps, b[2] + E2[2] * eps, {});
    if (!P1 || !P2) return null;
    const j1x = (P1.x - P0.x) / eps, j1y = (P1.y - P0.y) / eps, j2x = (P2.x - P0.x) / eps, j2y = (P2.y - P0.y) / eps;
    const sc = (Math.hypot(j1x, j1y) + Math.hypot(j2x, j2y)) / 2, bh = rho * sc; // hole radius in px
    const cx = P0.x + ox, cy = P0.y + oy;
    let a = k;
    if (mirror) { const s1 = 1 - rb[2]; a = k * (floorK + (0.8 - floorK) * s1 * s1 * s1 * s1 * s1) * 0.6; if (a < 0.05) return null; }
    const inc = 0.13, Rd = rho * 2.6;
    const pt = (th, R) => { const u = cos(th) * R, v = -sin(th) * inc * R; return [cx + j1x * u + j2x * v, cy + j1y * u + j2y * v]; };
    const band = (front, f, col) => {
      const P = [];
      for (let i = 0; i <= 40; i++) { const q = pt((front ? 0 : PI) + (i / 40) * PI, Rd * f); P.push(q[0], q[1]); }
      for (let i = 40; i >= 0; i--) { const q = pt((front ? 0 : PI) + (i / 40) * PI, Rd * f * 0.8); P.push(q[0], q[1]); }
      U.fillPoly(ctx, P, col);
    };
    const dc = (col, al) => U.dcol(col, al * a);
    U.glow(ctx, cx, cy, bh * 3.4, C.lavender, a * Math.min(0.16, 3.2 / Math.max(1, bh))); // light spilled into the space around it
    // lensed back rim (the far side of the disc bent over and under the hole), prismatic 1-px fringe outside it
    U.annulus(ctx, cx, cy, bh * 1.3, bh * 1.58, dc(C.lavender, 0.25), 0.95);
    U.annulus(ctx, cx, cy, bh * 1.12, bh * 1.3, dc(C.blush, 1), 0.95);
    U.annulus(ctx, cx, cy, bh * 1.12, bh * 1.18, dc(C.cream, 1), 0.95);
    const PR = [C.ice, C.foam, C.lavender, C.blush, C.gold];
    for (let i = 0; i < PR.length; i++) U.ring1(ctx, cx, cy, bh * 1.62 + i * Math.max(1, bh * 0.035), dc(PR[i], 0.55));
    const disk = front => {
      for (const [f, col] of [[1, C.lavender], [0.86, C.blush], [0.74, C.ice], [0.62, C.cream]]) band(front, f, dc(col, 1));
      if (front) { // doppler-bright approaching side
        const P = [];
        for (let i = 0; i <= 12; i++) { const q = pt(PI * 0.62 + (i / 12) * PI * 0.36, Rd * 0.95); P.push(q[0], q[1]); }
        for (let i = 12; i >= 0; i--) { const q = pt(PI * 0.62 + (i / 12) * PI * 0.36, Rd * 0.62); P.push(q[0], q[1]); }
        U.fillPoly(ctx, P, dc(C.white, 0.5));
      }
      const spin = t * 0.9; // clumps orbiting in the disc (the slow ring rotation)
      for (let i = 0; i < 16; i++) {
        const th = ((HT.hash(i, res.seed + 50) * TAU + spin * (0.7 + 0.5 * HT.hash(i, res.seed + 52))) % TAU + TAU) % TAU;
        if ((th < PI) !== front) continue;
        const q = pt(th, Rd * (0.6 + 0.36 * HT.hash(i, res.seed + 51)));
        U.sq(ctx, q[0], q[1], bh > 30 ? 2 : 1, dc(C.white, 1));
      }
    };
    disk(false);
    U.disc(ctx, cx, cy, bh, mirror ? U.dcol(C.ink, 0.85) : C.ink);
    disk(true);
    U.ring1(ctx, cx, cy, bh + 0.5, dc(C.cream, 1));
    return { x: cx, y: cy, r: bh };
  }
  function voidGalaxies(ctx, V, Bs, k, ox, oy) {
    const U = fxu(); if (!U || k < 0.2) return;
    const P = {};
    for (const g of VOID.gal) {
      if (!skyProj(V, Bs, g.d[0], g.d[1], g.d[2], P)) continue;
      const size = clamp(round(V.f * g.ang / 2) * 2, 8, 120);
      if (P.x + size < 0 || P.x - size > V.vw || P.y + size < 0 || P.y - size > V.vh) continue;
      const img = U.galaxy(size, g.arms, g.seed);
      if (k < 0.99) HT.alpha(ctx, k, () => ctx.drawImage(img, round(P.x + ox - size / 2), round(P.y + oy - size / 2)));
      else ctx.drawImage(img, round(P.x + ox - size / 2), round(P.y + oy - size / 2));
    }
  }
  // streams of information glyphs flowing through the sky: gently undulating rings around the horizon (elevation
  // 4°–40°), each covering an azimuth span, glyphs flowing along it — prismatic, fading at the span ends
  function voidGlyphs(ctx, V, Bs, res, t, k, ox, oy) {
    const U = fxu(); if (!U) return;
    const g = res.o.glyphs, n = typeof g === 'number' ? g : (g && g.n) || 12, speed = (g && g.speed) || 1;
    const P = {};
    for (let s = 0; s < n; s++) {
      const hA = HT.hash(s, res.seed + 91), hB = HT.hash(s, res.seed + 92), hC = HT.hash(s, res.seed + 93);
      const e0 = 0.04 + hA * 0.36, amp = 0.04 + hC * 0.1, phi0 = hB * TAU, span = 1.6 + hC * 1.6, per = 24 + floor(span * 11);
      const dir = s % 2 ? 1 : -1, v = (0.035 + 0.03 * hA) * speed * dir, big = (s % 3) === 0;
      for (let j = 0; j < per; j++) {
        const u = ((j / per + t * v) % 1 + 1) % 1, phi = phi0 + u * span, el = e0 + amp * sin(phi * 2 + s);
        const ce = cos(el), d0 = cos(phi) * ce, d1 = sin(phi) * ce, d2 = sin(el);
        if (!skyProj(V, Bs, d0, d1, d2, P)) continue;
        if (P.x < -4 || P.y < -4 || P.x > V.vw + 4 || P.y > V.vh + 4) continue;
        const fade = Math.min(u / 0.12, (1 - u) / 0.12, 1) * k;
        if (HT.hash(j + s * 131, res.seed + 95) > fade) continue;
        const col = PRISM[(j + s + floor(t * 8)) % PRISM.length], idx = floor(HT.hash(j * 7 + s, res.seed + 96) * 1e6) + floor(t * 3 + j);
        ctx.drawImage(U.glyph(big ? 'l' : 's', idx, col), round(P.x + ox - (big ? 2 : 1)), round(P.y + oy - (big ? 3 : 2)));
      }
    }
  }
  // floor.hatch: faint diagonal hatching on the floor plane around the fighters (fading out with distance)
  function voidHatch(ctx, V, res, pts, k, ox, oy) {
    const U = fxu(); if (!U) return;
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length, R = 9, P = {}, Q = {};
    for (let i = -18; i <= 18; i++) {
      const off = i * 0.5, a0 = [cx + off - R, cy - R], a1 = [cx + off + R, cy + R];
      for (let sg = 0; sg < 12; sg++) { // short segments so each can fade with its distance from the centre
        const u0 = sg / 12, u1 = (sg + 1) / 12, x0 = lerp(a0[0], a1[0], u0), y0 = lerp(a0[1], a1[1], u0), x1 = lerp(a0[0], a1[0], u1), y1 = lerp(a0[1], a1[1], u1);
        const dm = Math.hypot((x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy) / R; if (dm > 1) continue;
        const p0 = proj(V, x0, y0, 0, P), p1 = p0 && proj(V, x1, y1, 0, Q); if (!p0 || !p1) continue;
        U.line(ctx, p0.x + ox, p0.y + oy, p1.x + ox, p1.y + oy, U.dcol(C.dusk, (1 - dm) * (1 - dm) * 0.55 * k));
      }
    }
  }
  // ripples on the invisible floor at the fighters' feet (world circles at z = 0)
  function voidFloorRings(ctx, V, S, res, t, k, ox, oy) {
    const U = fxu(); if (!U) return;
    const fo = res.o.floor; if (fo === false) return;
    let pts = fo && fo.at ? fo.at : null;
    if (!pts && S && S.sc && S.sc.C && S.at) { pts = []; for (const nm of S.sc.C.order) { const a = S.at(nm); if (a && a.z < 0.4 && (!S.sc.C.cast[nm] || S.sc.C.cast[nm].visibleAt(S.t))) pts.push([a.x, a.y]); } }
    if (!pts || !pts.length) return;
    const kk = (fo && fo.k !== undefined ? fo.k : 1) * k, P = {};
    if (fo && fo.hatch) voidHatch(ctx, V, res, pts, kk, ox, oy);
    if (fo && fo.rings === false) return;
    for (let pi = 0; pi < pts.length; pi++) {
      const [px0, py0] = pts[pi];
      // contact glow
      const q = proj(V, px0, py0, 0, P);
      if (q) U.ellipse(ctx, q.x + ox, q.y + oy, Math.max(2, 0.55 * q.s), Math.max(1, 0.14 * q.s), U.dcol(C.lavender, 0.2 * kk));
      for (let r = 0; r < 3; r++) {
        const u = ((t * 0.32 + r / 3 + pi * 0.37) % 1 + 1) % 1, rad = 0.35 + u * 2.6, a = (1 - u) * (1 - u) * 0.55 * kk;
        if (a < 0.04) continue;
        const col = U.dcol(u < 0.35 ? C.ice : C.lavender, a);
        let lx = 0, ly = 0, have = false;
        for (let s = 0; s <= 40; s++) {
          const th = (s / 40) * TAU, w = proj(V, px0 + cos(th) * rad, py0 + sin(th) * rad, 0, P);
          if (!w) { have = false; continue; }
          if (have) U.line(ctx, lx + ox, ly + oy, w.x + ox, w.y + oy, col);
          lx = w.x; ly = w.y; have = true;
        }
      }
    }
  }
  HT.SETS.void = {
    shear: false,
    init(sc, o) { voidEnsure(); return voidRes(o || {}); },
    draw(ctx, c, S, pass, res0) {
      voidEnsure();
      const res = resOf('void', res0, S, voidRes), o = res.o, t = S.t || 0;
      const V = viewOf(c, false);
      const k = kf(o.intensity, t, 1), floorK = o.floor === false ? 0 : 0.26;
      const crumble = kf(o.crumble, t, 0);
      if (crumble >= 1) { voidCrumbleDone(ctx, c, S, V, res); return; }
      const Bf = bufFor('void', V.vw, V.vh);
      const Bs = voidBackground(Bf, V, k, floorK, (o.drift === undefined ? 0.001 : o.drift) * t);
      voidStars(Bf, V, Bs, k, floorK, t);
      if (crumble > 0) { voidCrumble(ctx, c, S, V, res, Bf, Bs, crumble, k, floorK, t); return; }
      ctx.putImageData(Bf.img, V.vx, V.vy);
      clipped(ctx, V, () => {
        fxClip(ctx, V);
        voidGalaxies(ctx, V, Bs, k, V.vx, V.vy);
        if (floorK) voidBlackHole(ctx, V, Bs, res, k, t, V.vx, V.vy, true, floorK);
        voidBlackHole(ctx, V, Bs, res, k, t, V.vx, V.vy, false, floorK);
        if (o.glyphs) voidGlyphs(ctx, V, Bs, res, t, k, V.vx, V.vy);
        voidFloorRings(ctx, V, S, res, t, k, V.vx, V.vy);
      });
    },
  };
  // ---- crumble: the Void shattering from inside (Act III: Mahoraga's sword). Shards = a jittered level-2 icosphere on
  // the celestial sphere (320 spherical triangles; great-circle edges project to straight lines, so each shard is an
  // exact screen triangle for any camera). A shard cracks (prismatic edges), then peels: it tumbles toward the camera
  // and away from the break point while fading, revealing crumbleTo behind it; the sweep runs outward from crumbleAt.
  let SHARDS = null;
  function shardsBuild() {
    if (SHARDS) return SHARDS;
    const t = (1 + sqrt(5)) / 2, V0 = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const Vs = V0.map(v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; });
    for (let lvl = 0; lvl < 3; lvl++) {
      const mid = new Map(), F2 = [];
      const m = (a, b) => { const key = a < b ? a + '_' + b : b + '_' + a; let i = mid.get(key); if (i === undefined) { const p = Vs[a], q = Vs[b], x = p[0] + q[0], y = p[1] + q[1], z = p[2] + q[2], l = Math.hypot(x, y, z); i = Vs.length; Vs.push([x / l, y / l, z / l]); mid.set(key, i); } return i; };
      for (const [a, b, c] of F) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      F = F2;
    }
    // jitter every vertex once (shared by its triangles, so the tiling stays gap-free)
    for (let i = 0; i < Vs.length; i++) { const v = Vs[i], j = 0.035; const x = v[0] + (HT.hash(i, 61) - 0.5) * j, y = v[1] + (HT.hash(i, 62) - 0.5) * j, z = v[2] + (HT.hash(i, 63) - 0.5) * j, l = Math.hypot(x, y, z); Vs[i] = [x / l, y / l, z / l]; }
    const cen = F.map(([a, b, c]) => { const x = Vs[a][0] + Vs[b][0] + Vs[c][0], y = Vs[a][1] + Vs[b][1] + Vs[c][1], z = Vs[a][2] + Vs[b][2] + Vs[c][2], l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; });
    SHARDS = { V: Vs, F, cen };
    return SHARDS;
  }
  // per-frame camera-space vertices (r, u, d) and projections of the shard mesh, then clipped screen polygons
  function shardFrame(V, Bs, SH) {
    const n = SH.V.length, CV = SH.cv || (SH.cv = new Float32Array(n * 3)), PV = SH.pv || (SH.pv = new Float32Array(n * 2));
    for (let i = 0; i < n; i++) {
      const v = SH.V[i], r = v[0] * Bs.Rx + v[1] * Bs.Ry + v[2] * Bs.Rz, u = v[0] * Bs.Ux + v[1] * Bs.Uy + v[2] * Bs.Uz, d = v[0] * Bs.Fx + v[1] * Bs.Fy + v[2] * Bs.Fz;
      CV[i * 3] = r; CV[i * 3 + 1] = u; CV[i * 3 + 2] = d;
      if (d >= 0.02) { let px = V.f * r / d, py = -V.f * u / d; if (V.roll) { const a = px * V.cr - py * V.sr, b = px * V.sr + py * V.cr; px = a; py = b; } PV[i * 2] = V.hx + px; PV[i * 2 + 1] = V.hy + py; }
    }
  }
  function shardPoly(V, SH, tri) {
    const CV = SH.cv, PV = SH.pv;
    let P;
    if (CV[tri[0] * 3 + 2] >= 0.02 && CV[tri[1] * 3 + 2] >= 0.02 && CV[tri[2] * 3 + 2] >= 0.02) P = [PV[tri[0] * 2], PV[tri[0] * 2 + 1], PV[tri[1] * 2], PV[tri[1] * 2 + 1], PV[tri[2] * 2], PV[tri[2] * 2 + 1]];
    else {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const ia = tri[i] * 3, ib = tri[(i + 1) % 3] * 3, da = CV[ia + 2], db = CV[ib + 2], ina = da >= 0.02, inb = db >= 0.02;
        if (ina) out.push([CV[ia], CV[ia + 1], da]);
        if (ina !== inb) { const q = (0.02 - da) / (db - da); out.push([CV[ia] + (CV[ib] - CV[ia]) * q, CV[ia + 1] + (CV[ib + 1] - CV[ia + 1]) * q, 0.02]); }
      }
      if (out.length < 3) return null;
      P = [];
      for (const q of out) { let px = V.f * q[0] / q[2], py = -V.f * q[1] / q[2]; if (V.roll) { const a = px * V.cr - py * V.sr, b = px * V.sr + py * V.cr; px = a; py = b; } P.push(V.hx + px, V.hy + py); }
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < P.length; i += 2) { if (P[i] < x0) x0 = P[i]; if (P[i] > x1) x1 = P[i]; if (P[i + 1] < y0) y0 = P[i + 1]; if (P[i + 1] > y1) y1 = P[i + 1]; }
    if (x1 < -2 || y1 < -2 || x0 > V.vw + 2 || y0 > V.vh + 2) return null;
    return P;
  }
  function crumbleSheared(c, vx, vy, vw, vh) { // the city renderer ignores pitch: fold it into the lens shift
    const c2 = Object.assign({}, c, { vx, vy, vw, vh, pitch: 0, shift: (c.shift || 0) + c.f * Math.tan(c.pitch || 0), _prepped: false });
    return CAM.prep(c2);
  }
  function crumbleBehind(g, c, S, res, vx, vy, vw, vh) { // what is revealed: the city (default) or a flat colour
    const to = res.o.crumbleTo || 'city';
    if (to === 'city' && HT.SETS.city) {
      const e0 = S.env || {}, env = res.o.crumbleEnv || (HT.ENVS[e0.time] ? e0 : Object.assign({}, e0, { time: 'noon' }));
      HT.SETS.city.draw(g, crumbleSheared(c, vx, vy, vw, vh), { T: S.T || 0, t: S.t || 0, env, sc: null, twos: S.twos }, 'back', null);
    } else HT.rect(g, vx, vy, vw, vh, to === 'white' ? C.white : to === 'black' ? C.ink : to);
  }
  function voidCrumbleDone(ctx, c, S, V, res) { crumbleBehind(ctx, c, S, res, V.vx, V.vy, V.vw, V.vh); }
  function voidCrumble(ctx, c, S, V, res, Bf, Bs, cr, k, floorK, t) {
    const U = fxu(), SH = shardsBuild(), vw = V.vw, vh = V.vh;
    // 1. the intact void into a scratch canvas (fragments are cut out of it)
    const vc = canvasFor('void.crumble', vw, vh), vg = vc.g;
    vg.putImageData(Bf.img, 0, 0);
    const V0 = Object.assign({}, V, { vx: 0, vy: 0 });
    fxClip(vg, V0);
    voidGalaxies(vg, V0, Bs, k, 0, 0);
    if (floorK) voidBlackHole(vg, V0, Bs, res, k, t, 0, 0, true, floorK);
    voidBlackHole(vg, V0, Bs, res, k, t, 0, 0, false, floorK);
    if (res.o.glyphs) voidGlyphs(vg, V0, Bs, res, t, k, 0, 0);
    voidFloorRings(vg, V0, S, res, t, k, 0, 0);
    // 2. what lies behind, straight into the target
    crumbleBehind(ctx, c, S, res, V.vx, V.vy, vw, vh);
    // 3. break direction (sky frame) and per-shard states
    const at = res.o.crumbleAt || [V.x + V.Fx * 4, V.y + V.Fy * 4, 0];
    let bx = at[0] - V.x, by = at[1] - V.y, bz = at[2] - V.z; const bl = Math.hypot(bx, by, bz) || 1; bx /= bl; by /= bl; bz /= bl;
    const rotA = (res.o.drift === undefined ? 0.001 : res.o.drift) * t, ca = cos(rotA), sa = sin(rotA);
    const sbx = bx * ca + by * sa, sby = -bx * sa + by * ca; // world -> sky frame
    const bp = proj(V, at[0], at[1], at[2]);
    const intact = [], peel = [], crack = [];
    shardFrame(V, Bs, SH);
    for (let i = 0; i < SH.F.length; i++) {
      const cn = SH.cen[i], dot = cn[0] * sbx + cn[1] * sby + cn[2] * bz, th = Math.acos(clamp(dot, -1, 1));
      // start of the peel: along an 80° cone from the break point (+ jitter); shards beyond it go last
      const s0 = Math.min(1, th / 1.4) * 0.72 + HT.hash(i, res.seed + 70) * 0.12, u = clamp((cr - s0) / 0.12, 0, 1);
      if (u >= 1) continue;
      const P = shardPoly(V, SH, SH.F[i]); if (!P) continue;
      if (u > 0) peel.push([P, u, i]); else { intact.push(P); if (cr > s0 - 0.06) crack.push([P, clamp((cr - s0 + 0.06) / 0.06, 0, 1)]); }
    }
    const ox = V.vx, oy = V.vy;
    const path = (P, dx, dy) => { ctx.moveTo(P[0] + dx, P[1] + dy); for (let j = 2; j < P.length; j += 2) ctx.lineTo(P[j] + dx, P[j + 1] + dy); ctx.closePath(); };
    clipped(ctx, V, () => {
      if (intact.length) { ctx.save(); ctx.beginPath(); for (const P of intact) path(P, ox, oy); ctx.clip(); ctx.drawImage(vc.c, ox, oy); ctx.restore(); }
      // 4. peeling fragments: tumble toward the camera, away from the break point, fading (on 2s like drawings)
      for (const [P, u0, i] of peel) {
        const u = floor(u0 * 12) / 12 + 1 / 24;
        let cx = 0, cy = 0; for (let j = 0; j < P.length; j += 2) { cx += P[j]; cy += P[j + 1]; } cx = cx / (P.length / 2) + ox; cy = cy / (P.length / 2) + oy;
        let ax = cx - (bp ? bp.x + ox : ox + vw / 2), ay = cy - (bp ? bp.y + oy : oy + vh); const al = Math.hypot(ax, ay) || 1; ax /= al; ay /= al;
        const push = u * u * 70, drop = u * u * 60, rot = (HT.hash(i, res.seed + 71) - 0.5) * 2.4 * u, sc = 1 + 0.7 * u;
        ctx.save();
        ctx.globalAlpha = clamp(1 - u * u, 0, 1);
        ctx.translate(cx + ax * push, cy + ay * push * 0.6 + drop); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-cx, -cy);
        ctx.beginPath(); path(P, ox, oy); ctx.save(); ctx.clip(); ctx.drawImage(vc.c, ox, oy); ctx.restore();
        ctx.strokeStyle = u < 0.5 ? C.white : C.ice; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
      // 5. cracks along the edges of shards about to go + the pierce point's burst
      if (U) {
        fxClip(ctx, V);
        for (const [P, q] of crack) {
          const col = U.dcol(q > 0.6 ? C.white : q > 0.3 ? C.ice : C.lavender, 0.3 + 0.6 * q);
          for (let j = 0; j < P.length; j += 2) { const j2 = (j + 2) % P.length; U.line(ctx, P[j] + ox, P[j + 1] + oy, P[j2] + ox, P[j2 + 1] + oy, col); }
        }
        if (bp && cr < 0.2) {
          const q = 1 - cr / 0.2, x = bp.x + ox, y = bp.y + oy, L = 10 + 60 * (1 - q);
          U.sparkle(ctx, x, y, round(4 + 10 * q), C.white, C.ice);
          for (let r = 0; r < 9; r++) { const a = HT.hash(r, res.seed + 72) * TAU, l = L * (0.5 + HT.hash(r, res.seed + 73)); U.line(ctx, x, y, x + cos(a) * l, y + sin(a) * l * 0.6, U.dcol(PRISM[r % PRISM.length], 0.9)); }
        }
      }
    });
  }

  // ---- lab cells + bench (void)
  {
    const VCAMS = [
      ['void wide (t 2)', { x: 0.4, y: -9, z: 1.5, yaw: 0.02, pitch: 0.04, f: 420 }, 2, {}],
      ['void low, looking up (t 5)', { x: 1.2, y: -4.6, z: 0.45, yaw: 0.12, pitch: 0.36, f: 360 }, 5, {}],
      ['void side orbit, glyphs (t 8)', { x: 7.5, y: -2.5, z: 2.4, yaw: -1.25, pitch: -0.1, f: 460 }, 8, { glyphs: 12 }],
      ['void telephoto on the hole (t 3)', { x: 0, y: -9, z: 1.5, yaw: 0.16, pitch: 0.3, f: 1300 }, 3, {}],
      ['void hatched floor (ch. 229 staging)', { x: 2.5, y: -7.5, z: 2.6, yaw: -0.25, pitch: -0.2, f: 400 }, 4, { floor: { hatch: true } }],
    ];
    const cast = [['gojo', -1.9, 0, 0, 'guard', 1, 'fight'], ['sukuna', 1.9, 0.2, 0, 'guard', -1, 'fight']];
    for (const [label, cm, t, o] of VCAMS) ROOMS.labCells.push({ set: 'void', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = ROOMS.mockS(t, 400 + t, { time: 'void', set: 'void' }, { gojo: [-1.9, 0, 0], sukuna: [1.9, 0.2, 0] });
      const res = HT.SETS.void.init(S.sc, o);
      HT.SETS.void.draw(g, c, S, 'back', res);
      ROOMS.labCast(g, c, cast, [0.1, -0.5, 0.85], [-0.1, 0.5]);
    } });
    for (const [label, cr] of [['void crumble 0.08 (crack)', 0.08], ['void crumble 0.3 (peeling)', 0.3], ['void crumble 0.6', 0.6]]) ROOMS.labCells.push({ set: 'void', label, draw(g) {
      const c = CAM.prep(CAM.make({ x: 0.6, y: -8.5, z: 1.6, yaw: 0.05, pitch: 0.02, f: 400 }));
      const S = ROOMS.mockS(2, 480, { time: 'noon', set: 'void', snow: 0.2 }, { gojo: [-1.9, 0, 0], sukuna: [1.9, 0.2, 0] });
      HT.SETS.void.draw(g, c, S, 'back', HT.SETS.void.init(S.sc, { crumble: cr, crumbleAt: [1.2, -1.5, 0], crumbleEnv: { time: 'noon', snow: 0.2 } }));
      ROOMS.labCast(g, c, cast, [0.1, -0.5, 0.85], [-0.1, 0.5]);
    } });
    let vres = null;
    ROOMS.benches.void = (g, i) => {
      vres = vres || voidRes({ glyphs: 6 });
      const c = CAM.prep(CAM.make({ x: 6 * Math.sin(i * 0.03), y: -8 + i * 0.05, z: 1.5 + 0.02 * i, yaw: -0.6 + i * 0.03, pitch: 0.05 + 0.004 * i, f: 420 }));
      HT.SETS.void.draw(g, c, ROOMS.mockS(i / 30, 400 + i / 30, { time: 'void' }, { gojo: [-1.9, 0, 0], sukuna: [1.9, 0.2, 0] }), 'back', vres);
    };
  }

  // ================================================================== POST 'tally' — the clash tally (Act II)
  // Five slanted ink ticks in the top-right corner (≈ 40×10 px): e.n lit (0..5); the newest strikes in during the
  // first 0.3 s (a quick 1.8× → 1× pop with a one-off white flash and four 1-px sparks — not a strobe), the rest hold for
  // dur. e.col lit colour (bone white), e.x/e.y top-left override, e.accent (colour of the newest tick's flash).
  HT.post.tally = (ctx, S, e, age, dur) => {
    const n = clamp(e.n === undefined ? 1 : e.n | 0, 0, 5);
    const x0 = e.x === undefined ? W - 49 : e.x, y0 = e.y === undefined ? 10 : e.y;
    const lit = e.col || C.white, out = C.ink;
    const tick = (k, s, col, outline) => {
      const cx = x0 + k * 8 + 3, cy = y0 + 5;
      // a brush tick: thick head top-right, tapering foot bottom-left (slant 3 px over 10 px)
      const P = [[1.6, -5], [3.4, -5], [0.4, 5], [-1.6, 5]].map(([x, y]) => [cx + x * s, cy + y * s]);
      if (outline) { for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) HT.poly(ctx, P.map(p => [p[0] + dx, p[1] + dy]), outline); }
      HT.poly(ctx, P, col);
    };
    for (let k = 0; k < 5; k++) {
      if (k >= n) { HT.alpha(ctx, 0.55, () => tick(k, 1, C.shadow, null)); HT.alpha(ctx, 0.35, () => tick(k, 1, C.dusk, null)); continue; }
      const newest = k === n - 1 && age < 0.3 && !e.hold;
      if (!newest) { tick(k, 1, lit, out); continue; }
      const q = clamp(age / 0.18, 0, 1), s = 1 + 0.8 * (1 - HT.E.outCubic(q));
      tick(k, s, age < 0.07 ? C.white : lit, out);
      if (age < 0.12) { // four sparks, once
        const cx = x0 + k * 8 + 3, cy = y0 + 5, L = round(3 + 5 * (age / 0.12)), col = e.accent || C.ice;
        HT.px(ctx, cx - L, cy, col); HT.px(ctx, cx + L + 1, cy, col); HT.px(ctx, cx, cy - L - 1, col); HT.px(ctx, cx + 1, cy + L + 1, col);
      }
    }
  };

  // ================================================================== ENV presets (read by the city / voxel renderers by env.time)
  // shrine: the barrierless Malevolent Shrine spilling over the real city (Act II) — crimson/maroon sky, a blood-red
  // horizon glow, maroon fog, walls graded toward crimson, almost no lit windows, pink-tinted snow on the ground.
  HT.ENVS.shrine = {
    sky: [[0, C.red], [0.035, C.crimson], [0.1, C.wine], [0.26, C.maroon], [0.55, C.plum], [1, C.ink]],
    fog: C.wine, fogNear: 22, fogFar: 560, fogMax: 0.9,
    grade: rgbOf(C.crimson), gradeK: 0.3,
    sun: [0.92, 0.12, 0.28], lit: 0.012, skyline: C.plum, amb: 0.55,
    snowCol: HT.mix(C.mist, C.pinkrose, 0.5), ground: [1.1, 0.8, 0.84],
  };
  // airport: Act VI limbo lounge — warm cream / peach / soft sky, a low warm sun, gentle haze.
  HT.ENVS.airport = {
    sky: [[0, C.cream], [0.08, C.peach], [0.22, HT.mix(C.peach, C.ice, 0.55)], [0.55, C.ice], [1, C.sky]],
    fog: HT.mix(C.cream, C.peach, 0.4), fogNear: 60, fogFar: 2600, fogMax: 0.75,
    grade: rgbOf(C.peach), gradeK: 0.12,
    sun: [-0.62, 0.55, 0.4], lit: 0, skyline: HT.mix(C.pinkrose, C.lilacgrey, 0.5), amb: 0.92,
    snowCol: C.cream, ground: [1.04, 1.0, 0.95],
  };

  // ================================================================== ROOM ENGINE (interiors: command, corridor, airport)
  /* An axis-aligned box [x0,x1]×[y0,y1]×[0,h] seen from inside with a sheared camera (pitch → lens shift, verticals stay
     vertical, like the city renderer; roll is ignored like there). Per column: the horizontal ray hits one wall →
     textured wall span (perspective-correct u, v = height); per row: floor / ceiling casting (constant depth per row,
     the world point steps linearly). Surfaces are textures {w, h, tpm (texels/m), base: Uint32 (baked light), glow?:
     Uint8 (monitor/lamp light intensity, tinted per frame), pid?: Uint8 (light-panel id → per-frame on/off)}. A base
     texel with alpha 0 is a portal (window): room.outside(V, dx, dy, dz, px, py) shades it. Every pixel stores its
     inverse depth in zb for the prop rasterizer (1/d, larger = nearer; 0 = infinitely far). Camera must be inside. */
  function makeTex(wm, hm, tpm, fn) { // fn(u_m, v_m, i, j) → packed colour (+ optional glow via tex.glow)
    const w = Math.max(2, Math.ceil(wm * tpm)), h = Math.max(2, Math.ceil(hm * tpm)), base = new Uint32Array(w * h);
    const T = { w, h, tpm, base, wm, hm };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) base[j * w + i] = fn((i + 0.5) / tpm, (j + 0.5) / tpm, i, j, T);
    return T;
  }
  function makeLev(wm, hm, tpm, fn, withRid) { // fn(u_m, v_m, i, j, T) → light level (0 = ramp[0] …); withRid: fn sets T.r (ramp id)
    const w = Math.max(2, Math.ceil(wm * tpm)), h = Math.max(2, Math.ceil(hm * tpm)), lev = new Uint8Array(w * h);
    const T = { w, h, tpm, lev, base: null, wm, hm, rid: withRid ? new Uint8Array(w * h) : null, r: 0 };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { T.r = 0; lev[j * w + i] = Math.max(0, Math.min(255, round(fn((i + 0.5) / tpm, (j + 0.5) / tpm, i, j, T) * 32))); if (withRid) T.rid[j * w + i] = T.r; }
    return T;
  }
  // ramp-mode texels resolved per lighting state: two ramp colours + a Bayer threshold per texel (≤ 3 states cached per
  // texture), so the per-pixel work is three lookups and a compare
  function preOf(T, fr, gs, gain, pOff, pDim) {
    const RAMPS = fr.ramps, RAMP = fr.ramp || (RAMPS && RAMPS[0]);
    const offKey = pOff && T.pid ? Object.keys(pOff).join(',') : '';
    const key = (T.glow && gs !== 0 ? (gs * gain).toFixed(4) : '-') + '|' + offKey + '|' + (fr.rampKey || (RAMP ? RAMP[1] + ':' + RAMP.length : ''));
    const cache = T._pre || (T._pre = new Map());
    let P = cache.get(key);
    if (P) return P;
    const n = T.w * T.h, A = new Uint32Array(n), B = new Uint32Array(n), Q = new Uint8Array(n), lev = T.lev, glow = T.glow, rid = T.rid, pid = T.pid;
    const g = glow && gs !== 0 ? gs * gain : 0;
    for (let i = 0; i < n; i++) {
      let L = lev[i] * (1 / 32);
      if (g) L += glow[i] * g;
      if (offKey && pid[i] && pOff[pid[i]]) L = L > 2.2 ? 2.2 : L;
      const Rm = RAMPS && rid ? RAMPS[rid[i]] : RAMP, n1 = Rm.length - 1;
      if (L >= n1) { A[i] = B[i] = Rm[n1]; continue; }
      const k = L | 0; A[i] = Rm[k]; B[i] = Rm[k + 1]; Q[i] = ((L - k) * 16) | 0;
    }
    P = { A, B, Q };
    if (cache.size >= 3) cache.delete(cache.keys().next().value);
    cache.set(key, P);
    return P;
  }
  function renderRoom(Bf, V, room, fr) {
    const vw = V.vw, vh = V.vh, f = V.f, hx = V.hx, hy = V.hy, buf = Bf.buf, zb = Bf.zb;
    const camX = clamp(V.x, room.x0 + 0.02, room.x1 - 0.02), camY = clamp(V.y, room.y0 + 0.02, room.y1 - 0.02), camZ = clamp(V.z, 0.02, room.h - 0.02);
    const cy = V.cy, sy = V.sy, x0 = room.x0, x1 = room.x1, y0 = room.y0, y1 = room.y1, rh = room.h;
    const surf = room.surf, walls = [surf.s, surf.n, surf.w, surf.e];
    const gr = fr && fr.glow ? fr.glow[0] : 0, gg = fr && fr.glow ? fr.glow[1] : 0, gb = fr && fr.glow ? fr.glow[2] : 0, gs = fr && fr.glow ? (fr.glow[3] === undefined ? 1 : fr.glow[3]) / 255 : 0, useGlow = gs > 0;
    const pOff = fr && fr.panelOff && Object.keys(fr.panelOff).length ? fr.panelOff : null, pDim = fr && fr.panelDim !== undefined ? fr.panelDim : 0.25;
    const outside = room.outside;
    const rampMode = !!(fr && (fr.ramp || fr.ramps)), gain = fr && fr.gain !== undefined ? fr.gain : 3, BY = HT.BAYER;
    const PRE = s2 => (rampMode && s2.lev ? preOf(s2, fr, gs, gain, pOff, pDim) : null);
    if (!Bf.colTop || Bf.colTop.length !== vw) { Bf.colTop = new Int16Array(vw); Bf.colBot = new Int16Array(vw); }
    const colTop = Bf.colTop, colBot = Bf.colBot;
    const shade = (T, ti, col) => { // rgb mode: glow tint + light-panel switching for one texel
      if (useGlow && T.glow) { let g = T.glow[ti] * gs; if (g > 0.002) { if (g > 0.9) g = 0.9; const r0 = col & 255, g0 = (col >> 8) & 255, b0 = (col >> 16) & 255; col = (0xff000000 | ((b0 + (gb - b0) * g) << 16) | ((g0 + (gg - g0) * g) << 8) | (r0 + (gr - r0) * g)) >>> 0; } }
      if (pOff && T.pid) { const id = T.pid[ti]; if (id && pOff[id]) col = (0xff000000 | ((((col >> 16) & 255) * pDim) << 16) | ((((col >> 8) & 255) * pDim) << 8) | ((col & 255) * pDim)) >>> 0; }
      return col;
    };
    if (outside && room.outsidePrep) room.outsidePrep(V, fr);
    const skipP = !!(fr && fr.portalSkip);
    const wpre = walls.map(PRE);
    // ---- walls, column by column
    for (let x = 0; x < vw; x++) {
      const px = x + 0.5 - hx, dx = sy * f + cy * px, dy = cy * f - sy * px;
      let tw = 1e9, wall = 0;
      if (dx > 1e-9) { const t = (x1 - camX) / dx; if (t < tw) { tw = t; wall = 3; } } else if (dx < -1e-9) { const t = (x0 - camX) / dx; if (t < tw) { tw = t; wall = 2; } }
      if (dy > 1e-9) { const t = (y1 - camY) / dy; if (t < tw) { tw = t; wall = 1; } } else if (dy < -1e-9) { const t = (y0 - camY) / dy; if (t < tw) { tw = t; wall = 0; } }
      const d = tw * f, inv = 1 / d, hxw = camX + tw * dx, hyw = camY + tw * dy;
      const T = walls[wall], P = wpre[wall], tpm = T.tpm, tw_ = T.w, th = T.h, portal = outside ? T.portal : null;
      let ui = floor(((wall < 2 ? hxw - x0 : hyw - y0)) * tpm); if (ui < 0) ui = 0; else if (ui >= tw_) ui = tw_ - 1;
      const yTop = hy - f * (rh - camZ) * inv, yBot = hy + f * camZ * inv;
      const ya = Math.max(0, Math.ceil(yTop - 0.5)), yb = Math.min(vh - 1, floor(yBot - 0.5));
      colTop[x] = ya; colBot[x] = yb;
      const zPerY = d / f, vScale = tpm * zPerY, v0 = (rh - camZ - hy * zPerY) * tpm; // vi = (rh − z)·tpm, linear in y
      for (let y = ya; y <= yb; y++) {
        let vi = (v0 + (y + 0.5) * vScale) | 0; if (vi < 0) vi = 0; else if (vi >= th) vi = th - 1;
        const ti = vi * tw_ + ui, i = y * vw + x;
        if (portal && portal[ti]) { if (!skipP) buf[i] = outside(V, dx, dy, hy - (y + 0.5), x, y, hxw, hyw, 0, fr); zb[i] = 0; continue; }
        if (P) buf[i] = P.Q[ti] > BY[((y & 3) << 2) | (x & 3)] ? P.B[ti] : P.A[ti];
        else { const col = T.base[ti]; if ((col >>> 24) === 0 && outside) { buf[i] = outside(V, dx, dy, hy - (y + 0.5), x, y, hxw, hyw, 0, fr); zb[i] = 0; continue; } buf[i] = shade(T, ti, col); }
        zb[i] = inv;
      }
    }
    // ---- floor + ceiling rows
    const FL = surf.floor, CE = surf.ceil, FP = PRE(FL), CP = PRE(CE), hole = room.ceilHole, hb = room.ceilHoleBox;
    for (let y = 0; y < vh; y++) {
      const dyr = y + 0.5 - hy, row = y * vw, brow = (y & 3) << 2;
      if (dyr > 0) { // floor
        const dist = f * camZ / dyr, k = dist / f, inv = 1 / dist, T = FL, tpm = T.tpm, tw_ = T.w, th = T.h;
        let X = (camX + dist * sy + k * cy * (0.5 - hx) - x0) * tpm, Y = (camY + dist * cy - k * sy * (0.5 - hx) - y0) * tpm;
        const dX = k * cy * tpm, dY = -k * sy * tpm;
        for (let x = 0; x < vw; x++, X += dX, Y += dY) {
          if (y <= colBot[x]) continue;
          let ui = X | 0, vi = Y | 0;
          if (ui < 0) ui = 0; else if (ui >= tw_) ui = tw_ - 1;
          if (vi < 0) vi = 0; else if (vi >= th) vi = th - 1;
          const ti = vi * tw_ + ui;
          buf[row + x] = FP ? (FP.Q[ti] > BY[brow | (x & 3)] ? FP.B[ti] : FP.A[ti]) : shade(T, ti, T.base[ti]); zb[row + x] = inv;
        }
      } else if (dyr < 0) { // ceiling
        const dist = f * (rh - camZ) / -dyr, k = dist / f, inv = 1 / dist, T = CE, tpm = T.tpm, tw_ = T.w, th = T.h;
        let X = camX + dist * sy + k * cy * (0.5 - hx), Y = camY + dist * cy - k * sy * (0.5 - hx);
        const dX = k * cy, dY = -k * sy;
        for (let x = 0; x < vw; x++, X += dX, Y += dY) {
          if (y >= colTop[x]) continue;
          if (hole && X > hb[0] && X < hb[2] && Y > hb[1] && Y < hb[3] && hole(X, Y)) { buf[row + x] = room.ceilHoleCol(X, Y, fr, x, y); zb[row + x] = inv; continue; }
          let ui = ((X - x0) * tpm) | 0, vi = ((Y - y0) * tpm) | 0;
          if (ui < 0) ui = 0; else if (ui >= tw_) ui = tw_ - 1;
          if (vi < 0) vi = 0; else if (vi >= th) vi = th - 1;
          const ti = vi * tw_ + ui;
          buf[row + x] = CP ? (CP.Q[ti] > BY[brow | (x & 3)] ? CP.B[ti] : CP.A[ti]) : shade(T, ti, T.base[ti]); zb[row + x] = inv;
        }
      }
    }
  }

  // ------------------------------------------------------------------ depth-tested convex polygon rasterizer
  // pts: [[x,y,z], ...] world (convex, planar), col packed | tex {data (Uint32), w, h, uv: [[u,v] per vertex] (texels),
  // fn?(texel, u, v) → packed}. Sheared camera. Writes where 1/d > zb (nearer), with a small bias for decals.
  const RP = { sx: new Float64Array(16), sy: new Float64Array(16), iz: new Float64Array(16), uz: new Float64Array(16), vz: new Float64Array(16) };
  function rasterPoly(Bf, V, pts, col, tex, bias) {
    const n0 = pts.length; if (n0 < 3) return;
    const cx = V.x, cyP = V.y, cz = V.z, cy = V.cy, sy = V.sy, f = V.f, hx = V.hx, hy = V.hy, NEAR = 0.05;
    // camera space + near clip (Sutherland–Hodgman on d)
    const cam = [];
    const LV = col && typeof col === 'object' && col.lv ? col.lv : null;
    for (let i = 0; i < n0; i++) { const p = pts[i], dx = p[0] - cx, dy = p[1] - cyP; cam.push([dx * cy - dy * sy, dx * sy + dy * cy, p[2] - cz, tex ? tex.uv[i][0] : LV ? LV[i] : 0, tex ? tex.uv[i][1] : 0]); }
    const cl = [];
    for (let i = 0; i < cam.length; i++) {
      const a = cam[i], b = cam[(i + 1) % cam.length], ina = a[1] >= NEAR, inb = b[1] >= NEAR;
      if (ina) cl.push(a);
      if (ina !== inb) { const q = (NEAR - a[1]) / (b[1] - a[1]); cl.push([a[0] + (b[0] - a[0]) * q, NEAR, a[2] + (b[2] - a[2]) * q, a[3] + (b[3] - a[3]) * q, a[4] + (b[4] - a[4]) * q]); }
    }
    const n = Math.min(16, cl.length); if (n < 3) return;
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < n; i++) {
      const q = cl[i], id = 1 / q[1];
      RP.sx[i] = hx + f * q[0] * id; RP.sy[i] = hy - f * q[2] * id; RP.iz[i] = id; RP.uz[i] = q[3] * id; RP.vz[i] = q[4] * id;
      if (RP.sy[i] < minY) minY = RP.sy[i]; if (RP.sy[i] > maxY) maxY = RP.sy[i];
      if (RP.sx[i] < minX) minX = RP.sx[i]; if (RP.sx[i] > maxX) maxX = RP.sx[i];
    }
    const vw = V.vw, vh = V.vh;
    if (maxX < 0 || minX > vw || maxY < 0 || minY > vh) return;
    const ya = Math.max(0, Math.ceil(minY - 0.5)), yb = Math.min(vh - 1, floor(maxY - 0.5));
    const buf = Bf.buf, zb = Bf.zb, bz = bias || 0;
    const td = tex ? tex.data : null, tw = tex ? tex.w : 0, th = tex ? tex.h : 0, tfn = tex ? tex.fn : null;
    let rA = 0, rB = 0, rq = 0, LR = null, LN = 0;
    if (LV) { LR = col.ramp; LN = LR.length - 1; col = -2; }
    else if (col && typeof col === 'object') { const Rm = col.ramp, n1 = Rm.length - 1, L = clamp(col.l, 0, n1), i0 = Math.min(n1, L | 0); rA = Rm[i0]; rB = Rm[Math.min(n1, i0 + 1)]; rq = ((L - i0) * 16) | 0; col = -1; }
    const BY = HT.BAYER, useUV = !!td || !!LV;
    for (let y = ya; y <= yb; y++) {
      const syc = y + 0.5;
      let xl = Infinity, xr = -Infinity, zl = 0, zr = 0, ul = 0, ur = 0, vl = 0, vr = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const yi = RP.sy[i], yj = RP.sy[j];
        if ((yi <= syc) === (yj <= syc)) continue;
        const q = (syc - yi) / (yj - yi), xx = RP.sx[i] + (RP.sx[j] - RP.sx[i]) * q;
        const zz = RP.iz[i] + (RP.iz[j] - RP.iz[i]) * q;
        if (xx < xl) { xl = xx; zl = zz; if (useUV) { ul = RP.uz[i] + (RP.uz[j] - RP.uz[i]) * q; vl = RP.vz[i] + (RP.vz[j] - RP.vz[i]) * q; } }
        if (xx > xr) { xr = xx; zr = zz; if (useUV) { ur = RP.uz[i] + (RP.uz[j] - RP.uz[i]) * q; vr = RP.vz[i] + (RP.vz[j] - RP.vz[i]) * q; } }
      }
      if (!(xr >= xl)) continue;
      const xa = Math.max(0, Math.ceil(xl - 0.5)), xb = Math.min(vw - 1, floor(xr - 0.5));
      if (xb < xa) continue;
      const span = xr - xl || 1, dz = (zr - zl) / span, du = (ur - ul) / span, dv = (vr - vl) / span;
      const o = xa + 0.5 - xl;
      let iz = zl + dz * o, uz = ul + du * o, vz = vl + dv * o;
      const row = y * vw;
      for (let x = xa; x <= xb; x++, iz += dz, uz += du, vz += dv) {
        const i = row + x;
        if (iz + bz <= zb[i]) continue;
        if (td) {
          const d = 1 / iz; let u = floor(uz * d), v = floor(vz * d);
          if (u < 0) u = 0; else if (u >= tw) u = tw - 1;
          if (v < 0) v = 0; else if (v >= th) v = th - 1;
          const tc = td[v * tw + u];
          buf[i] = tfn ? tfn(tc, u, v, x, y) : tc;
        } else if (col === -2) { let L = uz / iz; if (L < 0) L = 0; if (L >= LN) buf[i] = LR[LN]; else { const k = L | 0; buf[i] = ((L - k) * 16 | 0) > BY[((y & 3) << 2) | (x & 3)] ? LR[k + 1] : LR[k]; } }
        else buf[i] = col === -1 ? (rq > BY[((y & 3) << 2) | (x & 3)] ? rB : rA) : col;
        zb[i] = iz + bz;
      }
    }
  }
  // axis-aligned box: cols = {top, bottom, n, s, e, w} packed colours (or a function(face) → colour); faces visible
  // from the camera only (back-face culled by the camera position)
  function rasterBox(Bf, V, x0, y0, z0, x1, y1, z1, cols) {
    const cx = V.x, cyP = V.y, cz = V.z, get = k => (typeof cols === 'function' ? cols(k) : cols[k]);
    if (cz > z1 && get('top') !== undefined) rasterPoly(Bf, V, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], get('top'));
    if (cz < z0 && get('bottom') !== undefined) rasterPoly(Bf, V, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], get('bottom'));
    if (cyP < y0 && get('s') !== undefined) rasterPoly(Bf, V, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], get('s'));
    if (cyP > y1 && get('n') !== undefined) rasterPoly(Bf, V, [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1]], get('n'));
    if (cx < x0 && get('w') !== undefined) rasterPoly(Bf, V, [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1]], get('w'));
    if (cx > x1 && get('e') !== undefined) rasterPoly(Bf, V, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], get('e'));
  }
  // sprite (canvas with alpha) blitted at a single depth with the depth test (billboards: watchers, lotus, dust)
  const SPRD = new WeakMap();
  function spriteData(cv) { let d = SPRD.get(cv); if (!d) { const g = cv.getContext('2d', { willReadFrequently: true }); d = new Uint32Array(g.getImageData(0, 0, cv.width, cv.height).data.buffer); SPRD.set(cv, d); } return d; }
  function blitDepth(Bf, V, cv, x, y, d, bias) {
    const data = spriteData(cv), w = cv.width, h = cv.height, vw = V.vw, vh = V.vh, buf = Bf.buf, zb = Bf.zb, iz = 1 / d + (bias || 0);
    const X0 = round(x), Y0 = round(y);
    for (let j = 0; j < h; j++) {
      const Y = Y0 + j; if (Y < 0 || Y >= vh) continue;
      const row = Y * vw, srow = j * w;
      for (let i = 0; i < w; i++) {
        const X = X0 + i; if (X < 0 || X >= vw) continue;
        const c = data[srow + i]; if ((c >>> 24) < 128) continue;
        const k = row + X; if (iz <= zb[k]) continue;
        buf[k] = c | 0xff000000; zb[k] = iz;
      }
    }
  }
  ROOMS.engine = { makeTex, makeLev, renderRoom, rasterPoly, rasterBox, rasterOBox: (...a) => rasterOBox(...a), blitDepth, spriteData, preOf };

  // ================================================================== COMMAND — the watchers' monitoring room
  /* Canon (ch. 225 p. 1; Fandom Chapter_225, Chapter_269): the watchers wait inside Rika — no walls or ceiling, black all
     around; a jumbled tower of boxy CRT monitors with a horn loudspeaker on top stands on a large square-tiled floor,
     thick black cables with taped joints snake outward, the watchers sit in a loose ring on crates or stand. The
     screens are the only light: a pool on the tiles fading into black. (The manga draws the screens blank; here they
     carry Mei Mei's crow feed — a live mini-render of the city at 96×54 on 2s/3s, cached by the city renderer while the
     feed camera holds — or a custom feedFn. No stopwatch exists in canon (Mei Mei states the 3:00 aloud); the clock
     option is this dialogue-free film's stand-in.) The feed's mean colour picks the light's palette ramp each frame:
     cold (ink→shadow→navy→indigo→blue→sky), warm (…plum→wine→crimson→red), pale (…dusk→lilacgrey→steel); surfaces store
     light levels and are Bayer-dithered between two ramp colours (exact palette colours).
     Frame (metres): origin = the tower's centre on the floor, z up; the tower spans r < 1.2 m, 0 < z < 3.3 (the horn
     at ≈ 3.1 m); the lit floor reaches ≈ 6–8 m, tiles fade to black by r ≈ 14 m (nothing to collide with: the room is
     effectively unbounded); crates are 0.45 m high. Rig characters placed by the runner stand on z = 0.
     setOpts: feed {cam | cam(t, T) → camera (designed for a 640×360 frame; scaled down, pitch sheared), T (fixed world
       time) | dT (offset from S.T, default 0 = live), env ({time, snow}), fps (8), figures [{char, at, pose, face,
       costume}], draw(g, cam, S)} · feeds [feed, ...] (screens alternate; each CRT shows a crop of its feed) ·
       feedFn(g, w, h, S, i) (custom feed drawing, e.g. a bust) · crops (false: every CRT shows the whole feed) ·
       screens {index: {feed, crop: [u0,v0,u1,v1], off: true}} ·
       noise (static flicker rate 0..1, 0.25) · glowK (light strength, 1) · clock {from: '2:58', at, tick (1 s), to
       (then it blinks), screen (CRT index; default HT.rooms.CLOCK_CRT = the eye-level south-facing set), hud (true: also
       a screen-space readout top-left)} · watchers [...] (see WATCHERS) · crates ('auto' = one under each seated
       watcher | [[x, y, yaw], ...]) */
  const CMD_RAMPS = {
    cold: [C.ink, C.shadow, C.navy, C.indigo, C.blue, C.sky].map(pkHex),
    warm: [C.ink, C.shadow, C.plum, C.wine, C.crimson, C.red].map(pkHex),
    pale: [C.ink, C.shadow, C.shadow, C.dusk, C.lilacgrey, C.steel].map(pkHex),
  };
  const FEED_W = 96, FEED_H = 54;
  const CROPS = [[0, 0, 1, 1], [0.22, 0.18, 0.78, 0.82], [0.02, 0.12, 0.62, 0.8], [0.4, 0.1, 1, 0.84], [0.12, 0.3, 0.6, 0.92], [0.3, 0, 0.9, 0.7]];
  // the CRT tower: tiers of boxy sets facing outward at jumbled angles (seeded, fixed)
  const CRTS = [];
  let TOWER_TOP = 0, CLOCK_IDX = 0;
  (function () {
    const rng = HT.rng(225), tiers = [5, 5, 4, 4, 3];
    let z = 0;
    for (let k = 0; k < tiers.length; k++) {
      const n = tiers[k], off = rng() * TAU, row = [];
      let hmax = 0;
      for (let j = 0; j < n; j++) {
        const w = 0.5 + rng() * 0.26 - k * 0.02, h = 0.4 + rng() * 0.2 - k * 0.015, d = 0.46 + rng() * 0.08;
        let th = off + (j / n) * TAU + (rng() - 0.5) * 0.45, yawJ = (rng() - 0.5) * 0.5;
        if (j === 0 && (k === 1 || k === 2)) { th = -PI / 2 + (k === 1 ? 0.35 : 0); if (k === 2) yawJ = 0; } // south-facing sets (tier 2: the clock set)
        const rho = 0.34 + (rng() - 0.5) * 0.06 + d / 2 + (k === 2 && j === 0 ? 0.06 : 0);
        const fx = Math.cos(th + yawJ), fy = Math.sin(th + yawJ);
        const cx = Math.cos(th) * rho, cy = Math.sin(th) * rho, dz = rng() * 0.05;
        row.push({ cx, cy, z0: z + dz, w, h, d, fx, fy, tier: k });
        hmax = Math.max(hmax, h + dz);
      }
      if (k === 2) CLOCK_IDX = CRTS.length;
      CRTS.push(...row);
      z += hmax + 0.015;
    }
    TOWER_TOP = z;
  })();
  // floor level map (tiles + cables + tape) over ±12 m at 20 texels/m; the light is analytic (radial from the tower)
  const FLOOR = { ext: 12, tpm: 20, lev: null, n: 0 };
  function cmdFloorBuild() {
    if (FLOOR.lev) return FLOOR;
    const n = FLOOR.ext * 2 * FLOOR.tpm, lev = new Uint8Array(n * n), tpm = FLOOR.tpm, ext = FLOOR.ext;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i / tpm - ext, y = j / tpm - ext, tx = x / 0.9, ty = y / 0.9, fx = tx - floor(tx), fy = ty - floor(ty);
      const seam = fx < 0.05 || fy < 0.05, alt = ((floor(tx) + floor(ty)) & 1) === 0;
      lev[j * n + i] = round((seam ? 0.55 : alt ? 1.0 : 0.88) * 32);
    }
    // cables: smooth random walks from the tower base outward; a slightly lit upper edge; tape bands every ~0.9 m
    const rng = HT.rng(9225);
    for (let c = 0; c < 22; c++) {
      let a = (c / 22) * TAU + (rng() - 0.5) * 0.3, x = Math.cos(a) * 0.9, y = Math.sin(a) * 0.9, turn = (rng() - 0.5) * 0.4;
      const len = 3 + rng() * 7.5, wdt = 0.035 + rng() * 0.03;
      let dist = 0, nextTape = 0.5 + rng() * 0.6;
      while (dist < len) {
        turn += (rng() - 0.5) * 0.25; turn *= 0.9; a += turn * 0.1;
        x += Math.cos(a) * 0.05; y += Math.sin(a) * 0.05; dist += 0.05;
        const tape = dist > nextTape; if (tape) nextTape += 0.7 + rng() * 0.5;
        const ci = round((x + ext) * tpm), cj = round((y + ext) * tpm), rr = Math.max(1, round(wdt * tpm));
        for (let dj = -rr - 1; dj <= rr + 1; dj++) for (let di = -rr - 1; di <= rr + 1; di++) {
          const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
          const d2 = di * di + dj * dj; if (d2 > (rr + 1) * (rr + 1)) continue;
          lev[jj * n + ii] = d2 > rr * rr ? Math.min(lev[jj * n + ii], 6) : tape && abs(di * Math.cos(a) + dj * Math.sin(a)) < 1.2 ? 72 : (di * -Math.sin(a) + dj * Math.cos(a)) > rr * 0.4 ? 26 : 4;
        }
      }
    }
    FLOOR.lev = lev; FLOOR.n = n;
    return FLOOR;
  }
  HT.bootTasks.push({ name: 'command-floor', fn: function* () { cmdFloorBuild(); yield; } });
  function cmdFloor(Bf, V, fam, gk, t) {
    const F = cmdFloorBuild(), RAMP = CMD_RAMPS[fam], rN = RAMP.length - 1, BY = HT.BAYER, INKP = RAMP[0];
    const vw = V.vw, vh = V.vh, f = V.f, hx = V.hx, hy = V.hy, cy = V.cy, sy = V.sy, camX = V.x, camY = V.y, camZ = Math.max(0.05, V.z);
    const buf = Bf.buf, zb = Bf.zb, lev = F.lev, n = F.n, tpm = F.tpm, ext = F.ext, gain = 3.3 * gk, MAXD = 40;
    for (let y = 0; y < vh; y++) {
      const dyr = y + 0.5 - hy, row = y * vw;
      if (dyr <= 0.5) { buf.fill(INKP, row, row + vw); zb.fill(0, row, row + vw); continue; }
      const dist = f * camZ / dyr;
      if (dist > MAXD) { buf.fill(INKP, row, row + vw); zb.fill(0, row, row + vw); continue; }
      const k = dist / f, inv = 1 / dist;
      let X = camX + dist * sy + k * cy * (0.5 - hx), Y = camY + dist * cy - k * sy * (0.5 - hx);
      const dX = k * cy, dY = -k * sy;
      for (let x = 0; x < vw; x++, X += dX, Y += dY) {
        const r2 = X * X + Y * Y;
        let L;
        if (r2 > 121) L = 0;
        else {
          const fade = r2 < 20 ? 1 : 1 - (Math.sqrt(r2) - 4.5) / 6.5;
          let tl;
          const ii = ((X + ext) * tpm) | 0, jj = ((Y + ext) * tpm) | 0;
          if (ii >= 0 && jj >= 0 && ii < n && jj < n) tl = lev[jj * n + ii] * (1 / 32); else tl = 0.9;
          L = tl * fade + gain / (1 + 0.28 * (r2 > 0.8 ? r2 - 0.8 : 0)) * (tl < 0.3 ? 0.35 : 1);
        }
        let col;
        if (L >= rN) col = RAMP[rN];
        else { const i = L | 0, q = ((L - i) * 16) | 0; col = q > BY[((y & 3) << 2) | (x & 3)] ? RAMP[i + 1] : RAMP[i]; }
        buf[row + x] = col; zb[row + x] = inv;
      }
    }
  }
  // oriented box: centre (cx, cy), base z0, half sizes along its facing (hd) and across (hw), height h; front = +facing
  function rasterOBox(Bf, V, cx, cy, z0, hw, hd, h, fx, fy, cols) {
    const rx = fy, ry = -fx; // right = facing rotated −90°
    const P = (u, v, z) => [cx + rx * u + fx * v, cy + ry * u + fy * v, z];
    const z1 = z0 + h, faces = [
      ['front', [fx, fy], [P(-hw, hd, z0), P(hw, hd, z0), P(hw, hd, z1), P(-hw, hd, z1)]],
      ['back', [-fx, -fy], [P(hw, -hd, z0), P(-hw, -hd, z0), P(-hw, -hd, z1), P(hw, -hd, z1)]],
      ['right', [rx, ry], [P(hw, hd, z0), P(hw, -hd, z0), P(hw, -hd, z1), P(hw, hd, z1)]],
      ['left', [-rx, -ry], [P(-hw, -hd, z0), P(-hw, hd, z0), P(-hw, hd, z1), P(-hw, -hd, z1)]],
    ];
    for (const [k, nrm, pts] of faces) {
      const c = cols[k]; if (c === undefined) continue;
      const mx = (pts[0][0] + pts[1][0]) / 2, my = (pts[0][1] + pts[1][1]) / 2;
      if ((V.x - mx) * nrm[0] + (V.y - my) * nrm[1] <= 0) continue;
      rasterPoly(Bf, V, pts, typeof c === 'function' ? c(nrm, mx, my, pts) : c);
    }
    if (cols.top !== undefined && V.z > z1) { const tp = [P(-hw, -hd, z1), P(hw, -hd, z1), P(hw, hd, z1), P(-hw, hd, z1)]; rasterPoly(Bf, V, tp, typeof cols.top === 'function' ? cols.top([0, 0, 1], cx, cy, tp) : cols.top); }
    return P;
  }
  // ---- feeds
  function cmdRes(o) {
    const feeds = o.feeds || [o.feed || {}];
    return { kind: 'command', o, feeds, cache: HT.lru(6), seed: o.seed || 3 };
  }
  const DEFAULT_FEED_CAM = { x: -70, y: -100, z: 38, yaw: 0.62, pitch: -0.22, f: 440 };
  function feedFrame(res, fi, S) {
    const F = res.feeds[fi % res.feeds.length] || {}, fps = F.fps || 8, t = S.t || 0, tq = floor(t * fps + 1e-6) / fps;
    const T = F.T !== undefined ? F.T : (S.T || 0) - (t - tq) + (F.dT || 0);
    const key = fi + '|' + tq.toFixed(4) + '|' + T.toFixed(3);
    let fr = res.cache.get(key);
    if (fr) return fr;
    const cv = HT.canvas(FEED_W, FEED_H), g = cv.g;
    const S2 = { t: tq, T, env: F.env || { time: 'overcast', snow: 0.3 }, sc: null, twos: false };
    if (res.o.feedFn || F.fn) { (F.fn || res.o.feedFn)(g, FEED_W, FEED_H, S2, fi); }
    else {
      const c0 = typeof F.cam === 'function' ? F.cam(tq, T) : (F.cam || DEFAULT_FEED_CAM), k = FEED_W / W;
      const pitch = c0.pitch || 0;
      const c = CAM.prep(CAM.make({ x: c0.x, y: c0.y, z: c0.z, yaw: c0.yaw || 0, pitch: 0, f: (c0.f || 480) * k, shift: ((c0.shift || 0) + (c0.f || 480) * Math.tan(pitch)) * k, vx: 0, vy: 0, vw: FEED_W, vh: FEED_H }));
      if (HT.renderCity && pitch > -1.0) HT.renderCity(g, c, S2, {});
      else if (HT.SETS.city) HT.SETS.city.draw(g, Object.assign(c, { pitch }), S2, 'back', null);
      if (F.figures) for (const fg of F.figures) { const q = CAM.project(c, fg.at[0], fg.at[1], fg.at[2] || 0); if (q && HT.rig) HT.rig.draw(g, fg.char, q.x, q.y, HT.rig.POSES[fg.pose] || HT.rig.POSES.stand, Math.max(4, (HT.rig.CHARS[fg.char] || { height: 1.8 }).height * q.s), { face: fg.face || 1, light: [0.5, -0.5, 0.7], costume: fg.costume }); }
      if (F.draw) F.draw(g, c, S2);
    }
    const data = new Uint32Array(g.getImageData(0, 0, FEED_W, FEED_H).data.buffer.slice(0));
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 7) { const q = data[i]; r += q & 255; gg += (q >> 8) & 255; b += (q >> 16) & 255; n++; }
    fr = { data, avg: [r / n / 255, gg / n / 255, b / n / 255] };
    res.cache.set(key, fr);
    return fr;
  }
  // 7-segment digits for the stopwatch (in-world readout): 'M:SS' → 26×11 texels
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const clockCache = HT.lru(8);
  HT.caches.push({ name: 'command.clock', size: () => clockCache.size });
  function clockTex(str, on) {
    const key = str + (on ? 1 : 0);
    let T = clockCache.get(key); if (T) return T;
    const w = 26, h = 11, d = new Uint32Array(w * h), bg = pkHex(C.ink), dim = pkHex(C.shadow), lit = pkHex(C.red), hi = pkHex(C.coral); // unlit segments neutral dark: they must not read as lit at CRT size
    d.fill(bg);
    const seg = (x0, ch) => {
      const S = SEG[ch] || '';
      const put = (x, y, s2) => { d[y * w + x] = on && S.indexOf(s2) >= 0 ? (s2 === 'a' ? hi : lit) : dim; };
      for (let i = 1; i <= 3; i++) { put(x0 + i, 1, 'a'); put(x0 + i, 5, 'g'); put(x0 + i, 9, 'd'); }
      for (let j = 2; j <= 4; j++) { put(x0, j, 'f'); put(x0 + 4, j, 'b'); }
      for (let j = 6; j <= 8; j++) { put(x0, j, 'e'); put(x0 + 4, j, 'c'); }
    };
    const [mm, ss] = str.split(':');
    seg(2, mm.slice(-1)); d[3 * w + 8] = d[7 * w + 8] = on ? lit : dim; seg(10, ss[0]); seg(17, ss[1]);
    T = { data: d, w, h };
    clockCache.set(key, T);
    return T;
  }
  function clockStr(ck, t) {
    const toS = str => { const [m, s2] = String(str).split(':').map(Number); return m * 60 + s2; };
    const from = toS(ck.from || '2:58'), to = ck.to !== undefined ? toS(ck.to) : Infinity, tick = ck.tick || 1, at = ck.at || 0;
    let v = t < at ? from : from + floor((t - at) / tick);
    const reached = v >= to; if (reached) v = to;
    const on = !reached || (floor((t - at - (to - from - 1) * tick) * 2) & 1) === 0;
    return { str: floor(v / 60) + ':' + String(v % 60).padStart(2, '0'), on };
  }
  ROOMS.clockStr = clockStr; ROOMS.CRTS = CRTS; ROOMS.CLOCK_CRT = CLOCK_IDX;
  HT.SETS.command = {
    shear: true,
    init(sc, o) { cmdFloorBuild(); return cmdRes(o || {}); },
    draw(ctx, c, S, pass, res0) {
      const res = resOf('command', res0, S, cmdRes), o = res.o, t = S.t || 0;
      const V = viewOf(c, true), Bf = bufFor('command', V.vw, V.vh);
      const PF = HT.roomsProf, pA = PF ? performance.now() : 0;
      // feeds: one render per feed per feed-frame; their mean colour picks the light's ramp
      const nF = Math.max(1, res.feeds.length), frames = [];
      let ar = 0, ag = 0, ab = 0;
      for (let i = 0; i < nF; i++) { const fr = feedFrame(res, i, S); frames.push(fr); ar += fr.avg[0]; ag += fr.avg[1]; ab += fr.avg[2]; }
      ar /= nF; ag /= nF; ab /= nF;
      const fam = ar > ab * 1.25 && ar > ag * 1.2 ? 'warm' : ab > ar * 1.05 ? 'cold' : 'pale';
      const gk = (o.glowK === undefined ? 1 : o.glowK) * (0.93 + 0.07 * HT.noise(t * 7, 0.5, 17)) * (0.7 + 0.35 * Math.min(1, Math.max(ar, ag, ab) * 1.5));
      res.fam = fam; res.gk = gk; res.glowCol = [...rgbOf(fam === 'warm' ? C.crimson : fam === 'cold' ? C.blue : C.lilacgrey), gk];
      const p0 = PF ? performance.now() : 0;
      cmdFloor(Bf, V, fam, gk, t);
      const p1 = PF ? performance.now() : 0;
      cmdProps(Bf, V, S, res, frames, t);
      const p2 = PF ? performance.now() : 0;
      if (ROOMS.watchersDraw) ROOMS.watchersDraw(Bf, V, S, res, res.glowCol, 'back');
      const p3 = PF ? performance.now() : 0;
      ctx.putImageData(Bf.img, V.vx, V.vy);
      if (ROOMS.watchersFx) clipped(ctx, V, () => ROOMS.watchersFx(ctx, V, S, res, res.glowCol));
      if (o.clock && o.clock.hud) { const ck = clockStr(o.clock, t), T = clockTex(ck.str, ck.on); clipped(ctx, V, () => { const cv = HT.canvas(T.w, T.h), id = cv.g.createImageData(T.w, T.h); new Uint32Array(id.data.buffer).set(T.data); cv.g.putImageData(id, 0, 0); ctx.drawImage(cv.c, V.vx + 10, V.vy + 10, T.w * 2, T.h * 2); }); }
      if (PF) { const p4 = performance.now(); PF.feed = (PF.feed || 0) + p0 - pA; PF.room = (PF.room || 0) + p1 - p0; PF.props = (PF.props || 0) + p2 - p1; PF.watchers = (PF.watchers || 0) + p3 - p2; PF.put = (PF.put || 0) + p4 - p3; PF.n = (PF.n || 0) + 1; }
    },
    drawFront(ctx, c, S, res0) {
      const res = resOf('command', res0, S, cmdRes);
      if (ROOMS.watchersFront) ROOMS.watchersFront(ctx, viewOf(c, true), S, res);
    },
    dispose(res) { if (res && res.cache) res.cache.clear(); },
  };
  function cmdProps(Bf, V, S, res, frames, t) {
    const o = res.o, RMP = CMD_RAMPS[res.fam || 'cold'], gain = 3.3 * (res.gk || 1);
    // per-vertex levels: the same radial light as the floor (gain / (1 + 0.28 (r² − 0.8))) × how much the face turns
    // toward the tower, so big faces get a dithered falloff; faces turned away stay at their dark albedo level
    const vlv = (albedo, nrm, pts, k) => ({ ramp: RMP, lv: pts.map(q => { const r2 = q[0] * q[0] + q[1] * q[1], dz = 1.6 - q[2], dl = Math.sqrt(r2 + dz * dz) || 1, facing = Math.max(0, (-q[0] * nrm[0] - q[1] * nrm[1] + dz * (nrm[2] || 0)) / dl); return albedo + (k || 1) * gain * facing / (1 + 0.28 * Math.max(0, r2 - 0.8)); }) });
    const inkP = RMP[0];
    // the core column behind the sets (hides the gaps), a pole and the horn loudspeaker on top
    rasterOBox(Bf, V, 0, 0, 0, 0.42, 0.42, TOWER_TOP, 0, 1, { front: inkP, back: inkP, left: inkP, right: inkP, top: inkP });
    rasterOBox(Bf, V, 0, 0, TOWER_TOP, 0.03, 0.03, 0.55, 0, 1, { front: inkP, back: inkP, left: inkP, right: inkP });
    { // horn: a flared square-ish frustum pointing south-east, slightly down
      const hz = TOWER_TOP + 0.5, ax = 0.55, ay = -0.83, az = -0.12, L = 0.55, r0 = 0.06, r1 = 0.24;
      const ux = -ay, uy = ax; // across
      const ring = (d, r) => { const P = []; for (let q = 0; q < 8; q++) { const a = (q / 8) * TAU, cu = cos(a) * r, cv = sin(a) * r; P.push([ax * d + ux * cu, ay * d + uy * cu, hz + az * d + cv]); } return P; };
      const A = ring(0, r0), B = ring(L, r1);
      for (let q = 0; q < 8; q++) { const q2 = (q + 1) % 8, quad = [A[q], A[q2], B[q2], B[q]]; const below = sin(((q + 0.5) / 8) * TAU) < 0; rasterPoly(Bf, V, quad, { ramp: RMP, lv: quad.map((p2, k) => (below ? 0.9 : 0.45) + (k >= 2 ? 0.35 : 0)) }); }
      if ((V.x - ax * L) * ax + (V.y - ay * L) * ay > 0) rasterPoly(Bf, V, B, inkP, null, 0.001);
    }
    // the CRTs: casing (front bezel, sides, top) + the screen (feed crop; scanlines, tube-edge falloff, rolling bar, static)
    const noiseRate = o.noise === undefined ? 0.25 : o.noise, fq = floor(t * 12);
    const ck = o.clock ? clockStr(o.clock, t) : null, clockScreen = o.clock ? (o.clock.screen === undefined ? CLOCK_IDX : o.clock.screen) : -1;
    const scrOpts = o.screens || {};
    // back-to-front order is not needed (depth-tested), but skip sets facing away cheaply
    for (let i = 0; i < CRTS.length; i++) {
      const q = CRTS[i], hw = q.w / 2, hd = q.d / 2;
      // casings stay dark (the screens light the room, not each other): a little spill toward each set's own front
      const fl = 0.35 + 0.65 * (res.gk || 1);
      // front bezel lit by its own screen; sides and top: the spill is confined to the front 30 % (two quads), the rest
      // falls to ink — the casings read as dark silhouettes around bright screens
      const P = rasterOBox(Bf, V, q.cx, q.cy, q.z0, hw, hd, q.h, q.fx, q.fy, { front: { ramp: RMP, l: 0.7 + 0.5 * fl } });
      const rxv = q.fy, ryv = -q.fx, z1 = q.z0 + q.h, dm = hd - q.d * 0.3;
      for (const sg of [-1, 1]) { // side faces (u = ±hw)
        if ((V.x - (q.cx + rxv * sg * hw)) * rxv * sg + (V.y - (q.cy + ryv * sg * hw)) * ryv * sg <= 0) continue;
        rasterPoly(Bf, V, [P(sg * hw, hd, q.z0), P(sg * hw, dm, q.z0), P(sg * hw, dm, z1), P(sg * hw, hd, z1)], { ramp: RMP, lv: [0.2 + 0.6 * fl, 0.14, 0.18, 0.3 + 0.65 * fl] });
        rasterPoly(Bf, V, [P(sg * hw, dm, q.z0), P(sg * hw, -hd, q.z0), P(sg * hw, -hd, z1), P(sg * hw, dm, z1)], { ramp: RMP, lv: [0.14, 0.03, 0.04, 0.18] });
      }
      if (V.z > z1) { // top face
        rasterPoly(Bf, V, [P(-hw, dm, z1), P(hw, dm, z1), P(hw, hd, z1), P(-hw, hd, z1)], { ramp: RMP, lv: [0.28, 0.28, 0.45 + 0.7 * fl, 0.45 + 0.7 * fl] });
        rasterPoly(Bf, V, [P(-hw, -hd, z1), P(hw, -hd, z1), P(hw, dm, z1), P(-hw, dm, z1)], { ramp: RMP, lv: [0.06, 0.06, 0.28, 0.28] });
      }
      if ((V.x - q.cx) * q.fx + (V.y - q.cy) * q.fy <= hd) continue; // the screen faces away
      const so = scrOpts[i] || {}, m = 0.07, mb = 0.06;
      rasterPoly(Bf, V, [P(-hw + m - 0.018, hd + 0.002, q.z0 + mb - 0.018), P(hw - m + 0.018, hd + 0.002, q.z0 + mb - 0.018), P(hw - m + 0.018, hd + 0.002, q.z0 + q.h - mb + 0.018), P(-hw + m - 0.018, hd + 0.002, q.z0 + q.h - mb + 0.018)], RMP[0], null, 0.001);
      const pts = [P(-hw + m, hd + 0.004, q.z0 + mb), P(hw - m, hd + 0.004, q.z0 + mb), P(hw - m, hd + 0.004, q.z0 + q.h - mb), P(-hw + m, hd + 0.004, q.z0 + q.h - mb)];
      if (so.off) { rasterPoly(Bf, V, pts, RMP[1], null, 0.002); continue; }
      let tex;
      if (i === clockScreen && ck) {
        const T = clockTex(ck.str, ck.on);
        tex = { data: T.data, w: T.w, h: T.h, uv: [[T.w, T.h], [0, T.h], [0, 0], [T.w, 0]] };
      } else {
        const fi = so.feed !== undefined ? so.feed : i % frames.length, fr = frames[fi % frames.length];
        const cr = so.crop || (o.crops === false ? CROPS[0] : CROPS[(i * 5 + q.tier) % CROPS.length]);
        const u0 = cr[0] * FEED_W, v0 = cr[1] * FEED_H, u1 = cr[2] * FEED_W, v1 = cr[3] * FEED_H;
        const noisy = HT.hash(i * 977 + floor(t * 4), res.seed + 5) < 0.16 * noiseRate;
        const roll = ((t * 0.35 + i * 0.13) % 1) * (v1 - v0) + v0;
        tex = { data: fr.data, w: FEED_W, h: FEED_H, uv: [[u1, v1], [u0, v1], [u0, v0], [u1, v0]], // pts run from the set's left (= the viewer's right)
          fn: (c2, u, v, sx, sy) => {
            let r = c2 & 255, g = (c2 >> 8) & 255, b = (c2 >> 16) & 255;
            if (noisy) { const qn = HT.hash(sx * 131 + sy * 7919 + fq * 31, 11) * 210; r = g = b = qn; }
            if (v & 1) { r *= 0.8; g *= 0.8; b *= 0.82; }                                    // scanlines
            if (abs(v - roll) < 2.5) { r += 16; g += 16; b += 20; }                           // rolling bar
            const eu = Math.min(u - u0, u1 - u) / (u1 - u0), ev = Math.min(v - v0, v1 - v) / (v1 - v0);
            if (eu < 0.07 || ev < 0.08) { r *= 0.72; g *= 0.72; b *= 0.78; }                  // tube-edge falloff
            return pk(r * 1.06 + 8, g * 1.06 + 8, b * 1.08 + 12);
          } };
      }
      rasterPoly(Bf, V, pts, 0, tex, 0.002);
    }
    // crates (seats): under sitting watchers + optional extras
    const crates = [];
    if (Array.isArray(o.crates)) for (const cr of o.crates) crates.push(cr);
    else if (o.watchers) for (const w of o.watchers) if (ROOMS.watcherSits && ROOMS.watcherSits(w)) crates.push([w.x, w.y, Math.atan2(-w.x, -w.y) + (HT.hash(round(w.x * 10), 7) - 0.5) * 0.6]);
    for (const [x, y, yaw] of crates) {
      const fx = sin(yaw), fy = cos(yaw), wood = (nrm, mx, my, pts) => vlv(0.55, [nrm[0], nrm[1], 0], pts, 1.05);
      rasterOBox(Bf, V, x, y, 0, 0.26, 0.22, 0.45, fx, fy, { front: wood, back: wood, left: wood, right: wood, top: (nrm, mx, my, pts) => vlv(0.7, [0, 0, 1], pts, 0.8) });
    }
  }

  // ================================================================== CORRIDOR — an office corridor (Act IV, ch. 233)
  /* A long office corridor seen from inside (box engine, sheared camera): suspended-tile ceiling with fluorescent panels
     every 2.4 m (the only light, baked into per-texel light levels; a glossy floor mirrors them as soft streaks), light
     grey walls with a dark baseboard and a chair rail, wood-veneer doors in dark frames alternating left/right every
     ~5 m, a red fire-extinguisher cabinet, a green pictogram exit sign (no text) over the far end, and a window wall at
     the far end looking out on the overcast wreckage. Materials use their own palette ramps (neutral / wood / red /
     window / green), Bayer-dithered by level → exact palette colours.
     ceilingBreakAt (s): the tiles over `hole` burst — a jagged hole into the dark plenum (beams, a duct), tiles tumbling
     down (rotating quads, depth-tested; the ones nearer the camera than the hole are drawn in front of the fighters),
     a dust fall, the three nearest panels flicker and die.
     Frame (metres): corridor x −1.4…1.4 (2.8 m wide), y −3…37 (the window wall at y = 37, a closed end wall with a door at
     y = −3), ceiling 2.7; the floor is z = 0. Fighters stand anywhere with |x| < 1.2. Camera must stay inside.
     setOpts: ceilingBreakAt (s) · hole [x, y] ([0, 12]) · holeR (1.1 m) · extinguisher {wall: 'e'|'w', y (6)} · emptyAt
     (s: the cabinet is empty from then on) · panelsOff [panel indices dark from the start; custom extinguisher/panel
     layouts rebuild the baked light, ≈ 27 ms once — the default layout is prebuilt at boot; a custom hole ≈ 10 ms] */
  const COR = { x0: -1.4, x1: 1.4, y0: -3, y1: 37, h: 2.7, pitch: 2.4 };
  const COR_RAMPS = [
    [C.ink, C.shadow, C.dusk, C.lilacgrey, C.steel, C.mist, C.white],          // 0 neutral walls / ceiling / floor
    [C.ink, C.shadow, C.wine, C.rust, C.rosewood, C.sand, C.tan],              // 1 wood veneer (muted)
    [C.ink, C.maroon, C.crimson, C.red, C.coral, C.salmon, C.peach],            // 2 red (extinguisher)
    [C.shadow, C.dusk, C.lilacgrey, C.steel, C.mist, C.white, C.white],         // 3 window light
    [C.ink, C.pine, C.green, C.leaf, C.mint, C.sprout, C.white],                // 4 exit sign green
    [C.ink, C.navy, C.indigo, C.blue, C.sky, C.ice, C.white],                   // 5 glass (cabinet door, door slits)
  ].map(r => r.map(pkHex));
  // panel centres (x = 0), y from 0.6 every 2.4 m; panel k spans y ± 0.6, x ± 0.3
  const COR_PANELS = []; for (let y = -1.8; y < COR.y1 - 1; y += COR.pitch) COR_PANELS.push(y);
  const corBaseCache = HT.lru(3), corRoomCache = HT.lru(4);
  HT.caches.push({ name: 'corridor.rooms', size: () => corRoomCache.size + corBaseCache.size });
  // the light of panel i at a surface point (Lambertian panels facing down, falloff 1/(0.6 + d²))
  const corPanelLight = (i, x, y, z, nx, ny, nz) => {
    const py = COR_PANELS[i], dx = -x, dy = py - y, dz = COR.h - 0.02 - z, d2 = dx * dx + dy * dy + dz * dz, d = Math.sqrt(d2);
    const cosE = dz / d; if (cosE <= 0) return 0;
    const cosR = (dx * nx + dy * ny + dz * nz) / d; if (cosR <= 0) return 0;
    return cosE * cosR / (0.6 + d2);
  };
  const corStreak = (i, x, y) => { const dy = y - COR_PANELS[i]; return Math.abs(dy) < 1.0 && Math.abs(x) < 0.3 ? 1.3 * (1 - Math.abs(dy) / 1.0) * (1 - Math.abs(x) / 0.3) : 0; };
  const COR_L = g => Math.min(2.6, g * 2.3);            // light → levels added to the albedo level
  const COR_GK = 110;                                   // glow texel units per unit of light (flicker layers)
  // surface point + normal for texel (u, v) of a corridor surface
  function corPos(which, u, v) {
    const X0 = COR.x0, X1 = COR.x1, Y0 = COR.y0, Y1 = COR.y1, Hh = COR.h;
    if (which === 'floor') return [X0 + u, Y0 + v, 0, 0, 0, 1];
    if (which === 'ceil') return [X0 + u, Y0 + v, Hh, 0, 0, -1];
    const z = Hh - v;
    if (which === 'e') return [X1, Y0 + u, z, -1, 0, 0]; if (which === 'w') return [X0, Y0 + u, z, 1, 0, 0];
    if (which === 's') return [X0 + u, Y0, z, 0, 1, 0]; return [X0 + u, Y1, z, 0, -1, 0];
  }
  function corBase(o) { // textures lit by every live panel (independent of the hole)
    const ext = o.extinguisher || { wall: 'e', y: 6 }, dead = new Set(o.panelsOff || []);
    const key = ext.wall + ext.y + '|' + [...dead].join(',');
    let B = corBaseCache.get(key); if (B) return B;
    const X0 = COR.x0, X1 = COR.x1, Y0 = COR.y0, Y1 = COR.y1, Hh = COR.h, tpm = 16;
    const lightAt = (x, y, z, nx, ny, nz) => {
      let g = 0; const i0 = Math.max(0, floor((y - 7 + 1.8) / COR.pitch)), i1 = Math.min(COR_PANELS.length - 1, Math.ceil((y + 7 + 1.8) / COR.pitch));
      for (let i = i0; i <= i1; i++) if (!dead.has(i)) g += corPanelLight(i, x, y, z, nx, ny, nz);
      return g;
    };
    const L = COR_L;
    // floor: grey vinyl tiles, glossy streaks under each panel (a soft mirror of the fixtures)
    const floorT = makeLev(X1 - X0, Y1 - Y0, tpm, (u, v, i, j, T) => {
      const x = X0 + u, y = Y0 + v, seam = (u / 0.5 % 1 < 0.05) || (v / 0.5 % 1 < 0.05);
      let lev = (seam ? 0.7 : 1.05) + L(lightAt(x, y, 0, 0, 0, 1));
      const k = Math.round((y + 1.8) / COR.pitch); if (k >= 0 && k < COR_PANELS.length && !dead.has(k)) lev += corStreak(k, x, y);
      return lev;
    }, true);
    // ceiling: 0.6 m tiles, fluorescent panels (level 6 = white; pid for switching), air vents
    const ceilT = makeLev(X1 - X0, Y1 - Y0, tpm, (u, v, i, j, T) => {
      const x = X0 + u, y = Y0 + v;
      const k = Math.round((y + 1.8) / COR.pitch);
      if (k >= 0 && k < COR_PANELS.length) { const dy = y - COR_PANELS[k]; if (Math.abs(dy) < 0.6 && Math.abs(x) < 0.3) { if (!T.pid) T.pid = new Uint8Array(T.w * T.h); T.pid[j * T.w + i] = k + 1; return dead.has(k) ? 2.2 : Math.abs(dy) > 0.56 || Math.abs(x) > 0.27 ? 4.2 : 6; } }
      const seam = (u / 0.6 % 1 < 0.05) || ((v + 0.3) / 0.6 % 1 < 0.05), vent = (Math.abs(x - 0.9) < 0.18 && (y % 7.2 + 7.2) % 7.2 < 0.36);
      return (vent ? 1.0 : seam ? 1.5 : 1.9) + L(lightAt(x, y, Hh, 0, 0, -1)) * 0.35;
    }, true);
    const doorsOf = wall => { const out = []; for (let y = 1.5 + (wall === 'e' ? 2.5 : 0); y < Y1 - 3; y += 5) out.push(y); return out; };
    const wallTex = (which) => {
      const len = which === 's' || which === 'n' ? X1 - X0 : Y1 - Y0, doors = which === 'e' || which === 'w' ? doorsOf(which) : [];
      return makeLev(len, Hh, tpm, (u, v, i, j, T2) => {
        const [x, y, z, nx, ny] = corPos(which, u, v);
        const light = L(lightAt(x, y, z, nx, ny, 0));
        if (which === 'n') { // the far window wall: glazing between mullions from 0.8 m to 2.45 m, the outside as bright bands
          if (z > 0.8 && z < 2.45 && Math.abs(x) < 1.25) {
            const mull = Math.abs(((x + 1.25) / 0.83) % 1 - 0.5) > 0.46 || Math.abs(z - 1.6) < 0.025;
            if (mull) return 1.8 + light * 0.4;
            T2.r = 3; const ruin = z < 1.3 + 0.3 * HT.noise(x * 3, 1, 5) ? (HT.noise(x * 6, 2, 7) > 0.45 ? 1.2 : 2.2) : 0;
            return ruin || (3.8 + (z - 0.8) * 0.9);
          }
          if (z > 2.48 && z < 2.62 && Math.abs(x) < 0.25) { T2.r = 4; return Math.abs(x) < 0.21 && z > 2.5 && z < 2.6 ? (Math.abs(x + 0.08) < 0.03 && z > 2.52 ? 6 : 4.2) : 1.5; } // exit pictogram
        }
        if (which === 's' && Math.abs(x) < 0.5 && z < 2.1) { T2.r = 1; return Math.abs(x) > 0.44 || z > 2.04 ? 0.8 : 2.4 + light * 0.5; }
        for (const dy of doors) {
          const du = y - dy;
          if (Math.abs(du) < 0.56 && z < 2.16) {
            if (Math.abs(du) > 0.5 || z > 2.1) return 0.9 + light * 0.3;                        // dark frame
            if (Math.abs(du - 0.3) < 0.05 && Math.abs(z - 1.02) < 0.05) return 5.2;             // handle (steel)
            if (Math.abs(du + 0.05) < 0.09 && z > 1.3 && z < 1.9) { T2.r = 5; return 1.4 + light * 0.4; } // window slit
            T2.r = 1; return 1.9 + light * 0.5 + (((du * 9) | 0) & 1 ? 0.12 : 0);
          }
        }
        if ((which === ext.wall) && Math.abs(y - ext.y) < 0.34 && z > 0.55 && z < 1.35) { // extinguisher cabinet
          if (Math.abs(y - ext.y) > 0.3 || z < 0.59 || z > 1.31) return 1.0;                  // recess edge
          if (Math.abs(y - ext.y) < 0.24 && z > 1.18 && z < 1.27) return 5.6;                 // white label (no text)
          T2.r = 2; return 1.5 + light * 0.4;                                                   // the red cabinet (its extinguisher is a prop)
        }
        if (z < 0.1) return 0.6 + light * 0.3;                                                  // baseboard
        if (Math.abs(z - 0.9) < 0.025) return 1.4 + light * 0.5;                                 // chair rail
        return (z < 0.9 ? 1.55 : 1.85) + light * 0.7;
      }, true);
    };
    B = { floor: floorT, ceil: ceilT, s: wallTex('s'), n: wallTex('n'), w: wallTex('w'), e: wallTex('e'), dead, ext };
    corBaseCache.set(key, B);
    return B;
  }
  function corRoom(o) {
    const hole = o.hole || [0, 12], B = corBase(o);
    const key = hole.join(',') + '|' + B.ext.wall + B.ext.y + '|' + [...B.dead].join(',');
    let R = corRoomCache.get(key); if (R) return R;
    // the three live panels nearest the hole flicker after the break: their light (and floor streaks) as a glow layer,
    // subtracted in the stutter / dark states (glow strength −(1 − k))
    const flick = new Set(COR_PANELS.map((y, i) => [Math.abs(y - hole[1]), i]).filter(q => !B.dead.has(q[1])).sort((a2, b2) => a2[0] - b2[0]).slice(0, 3).map(q => q[1]));
    const fl = [...flick], yMin = COR_PANELS[Math.min(...fl)] - 7, yMax = COR_PANELS[Math.max(...fl)] + 7;
    const surf = {};
    for (const which of ['floor', 'ceil', 's', 'n', 'w', 'e']) {
      const T0 = B[which], T = Object.assign({}, T0, { _pre: null, glow: new Uint8Array(T0.w * T0.h) });
      for (let j = 0; j < T.h; j++) for (let i = 0; i < T.w; i++) {
        const [x, y, z, nx, ny, nz] = corPos(which, (i + 0.5) / T.tpm, (j + 0.5) / T.tpm);
        if (y < yMin || y > yMax) continue;
        let g = 0; for (const k of fl) g += corPanelLight(k, x, y, z, nx, ny, nz);
        let lv = COR_L(g) * (which === 'ceil' ? 0.35 : which === 'floor' ? 1 : 0.7);
        if (which === 'floor') for (const k of fl) lv += corStreak(k, x, y);
        T.glow[j * T.w + i] = Math.min(255, round(lv * COR_GK / 2.6));
      }
      surf[which] = T;
    }
    R = { x0: COR.x0, x1: COR.x1, y0: COR.y0, y1: COR.y1, h: COR.h, surf, flick, hole, ext: B.ext, dead: B.dead };
    corRoomCache.set(key, R);
    return R;
  }
  function corRes(o) { return { kind: 'corridor', o, seed: o.seed || 11 }; }
  HT.bootTasks.push({ name: 'corridor-room', fn: function* () {
    const R = corRoom({}); yield;
    const offs = {}; for (const i of R.flick) offs[i + 1] = 1;
    for (const k of [1, 0.1, 0]) { for (const T of Object.values(R.surf)) { if (T.lev) preOf(T, { rampKey: 'cor', ramps: COR_RAMPS }, -(1 - k), 2.6 / COR_GK, k < 0.5 ? offs : null, 0.35); yield; } }
  } });
  // the jagged hole outline (radius by angle), the tiles that fall out of it
  const holeR = (res, a) => (res.o.holeR || 1.1) * (0.78 + 0.22 * HT.noise(a * 2.2 + 3, 0.5, res.seed) + 0.12 * ((floor(a * 5.1) & 1) ? 1 : 0));
  function corDebris(res, age) { // [{x, y, z, a (rot), s (size), axis}] at age (s since the break), pure function
    const out = [], n = 11, [hx, hy] = res.room.hole;
    for (let i = 0; i < n; i++) {
      const t0 = HT.hash(i, res.seed + 1) * 0.35, a = age - t0; if (a < 0) continue;
      const ang = HT.hash(i, res.seed + 2) * TAU, r0 = HT.hash(i, res.seed + 3) * 0.8;
      const vx = cos(ang) * (0.4 + HT.hash(i, res.seed + 4)), vy = sin(ang) * (0.4 + HT.hash(i, res.seed + 4));
      const tf = Math.sqrt(2 * (COR.h - 0.05) / 9.8), ta = Math.min(a, tf); // fall time to the floor
      const z = Math.max(0.03, COR.h - 0.05 - 4.9 * ta * ta), landed = a >= tf;
      const x = clamp(hx + cos(ang) * r0 + vx * ta, COR.x0 + 0.1, COR.x1 - 0.1), y = hy + sin(ang) * r0 + vy * ta;
      out.push({ x, y, z, rot: landed ? HT.hash(i, res.seed + 5) * 3 : a * (4 + 6 * HT.hash(i, res.seed + 6)), s: 0.35 + HT.hash(i, res.seed + 7) * 0.3, landed, i });
    }
    return out;
  }
  function tileQuad(d) { // a tumbling square tile (world points)
    const h = d.s / 2, ca = cos(d.rot), sa = sin(d.rot), cb = cos(d.rot * 0.7 + d.i), sb = sin(d.rot * 0.7 + d.i);
    const P = (u, v) => { const x1 = u, y1 = v * ca, z1 = v * sa; const x2 = x1 * cb - y1 * sb, y2 = x1 * sb + y1 * cb; return [d.x + x2, d.y + y2, d.z + (d.landed ? 0 : z1)]; };
    return [P(-h, -h), P(h, -h), P(h, h), P(-h, h)];
  }
  HT.SETS.corridor = {
    shear: true,
    init(sc, o) { const r = corRes(o || {}); r.room = corRoom(r.o); return r; },
    draw(ctx, c, S, pass, res0) {
      const res = resOf('corridor', res0, S, o => { const r = corRes(o); r.room = corRoom(o); return r; }), o = res.o, t = S.t || 0;
      const room = res.room || (res.room = corRoom(o));
      const V = viewOf(c, true), Bf = bufFor('corridor', V.vw, V.vh);
      const br = o.ceilingBreakAt, age = br === undefined ? -1 : t - br;
      // flicker group: steady before the break; after it a stutter on 2s, then dark for good
      let k = 1;
      if (age >= 0) { const f = floor(age * 12); k = age > 1.6 ? 0 : (HT.hash(f, res.seed + 9) < 0.45 - age * 0.25 ? 1 : 0.1); }
      const panelOff = {};
      if (k < 0.5) for (const i of room.flick) panelOff[i + 1] = 1;
      const fr = { rampKey: 'cor', ramps: COR_RAMPS, glow: [0, 0, 0, -255 * (1 - k)], gain: 2.6 / COR_GK, panelOff, panelDim: 0.35 };
      { const rr = (o.holeR || 1.1) * 1.4; room.ceilHoleBox = [room.hole[0] - rr, room.hole[1] - rr, room.hole[0] + rr, room.hole[1] + rr]; }
      room.ceilHole = age >= 0 ? (X, Y) => { const dx = X - room.hole[0], dy = Y - room.hole[1], d = Math.hypot(dx, dy); return d < holeR(res, Math.atan2(dy, dx)) * Math.min(1, 0.4 + age * 6); } : null;
      room.ceilHoleCol = (X, Y, fr2, sx, sy) => { // the plenum above: dark, a steel beam and a duct across, broken tile rim
        const dx = X - room.hole[0], dy = Y - room.hole[1], d = Math.hypot(dx, dy), rr = holeR(res, Math.atan2(dy, dx)) * Math.min(1, 0.4 + age * 6);
        if (rr - d < 0.06) return COR_RAMPS[0][4];
        const beam = Math.abs(Y - room.hole[1] - 0.25) < 0.12, duct = Math.abs(X + 0.35) < 0.22;
        return beam ? COR_RAMPS[0][2] : duct ? COR_RAMPS[0][((sx + sy) & 1) ? 2 : 1] : COR_RAMPS[0][0];
      };
      const PF = HT.roomsProf, q0 = PF ? performance.now() : 0;
      renderRoomCor(Bf, V, room, fr);
      if (PF) { PF.corRoom = (PF.corRoom || 0) + performance.now() - q0; PF.corN = (PF.corN || 0) + 1; }
      if (!(o.emptyAt !== undefined && t >= o.emptyAt)) { // the extinguisher standing in its cabinet (a red cylinder, dark hose)
        const ex = room.ext, xw = ex.wall === 'e' ? COR.x1 - 0.05 : COR.x0 + 0.05, ey = ex.y, red = { ramp: COR_RAMPS[2], lv: [3.2, 2.2, 2.4, 3.6] };
        rasterPoly(Bf, V, [[xw, ey - 0.09, 0.64], [xw, ey + 0.09, 0.64], [xw, ey + 0.09, 1.1], [xw, ey - 0.09, 1.1]], red, null, 0.004);
        rasterPoly(Bf, V, [[xw, ey - 0.05, 1.1], [xw, ey + 0.05, 1.1], [xw, ey + 0.04, 1.17], [xw, ey - 0.04, 1.17]], { ramp: COR_RAMPS[0], l: 1.2 }, null, 0.005);
        rasterPoly(Bf, V, [[xw, ey + 0.06, 1.12], [xw, ey + 0.085, 1.12], [xw, ey + 0.14, 0.8], [xw, ey + 0.115, 0.8]], { ramp: COR_RAMPS[0], l: 0.4 }, null, 0.006);
      }
      // falling tiles (back pass: all of them depth-tested; the nearer ones are redrawn in front of the fighters)
      if (age >= 0 && age < 30) {
        const deb = corDebris(res, age), tileCol = { ramp: COR_RAMPS[0], l: 3.4 }, tileDark = { ramp: COR_RAMPS[0], l: 1.4 };
        for (const d of deb) rasterPoly(Bf, V, tileQuad(d), d.i % 3 ? tileCol : tileDark);
        corWires(Bf, V, res, age);
        res._front = deb.filter(d => !d.landed && ((d.x - V.x) * V.Fx + (d.y - V.y) * V.Fy) < ((room.hole[0] - V.x) * V.Fx + (room.hole[1] - V.y) * V.Fy));
      } else res._front = null;
      ctx.putImageData(Bf.img, V.vx, V.vy);
      res._age = age;
    },
    drawFront(ctx, c, S, res0) {
      const res = resOf('corridor', res0, S, o => { const r = corRes(o); r.room = corRoom(o); return r; });
      const age = res._age; if (!(age >= 0) || age > 6) return;
      const V = viewOf(c, true), U = fxu(); if (!U) return;
      clipped(ctx, V, () => {
        fxClip(ctx, V);
        // tiles nearer than the hole: over the fighters
        if (res._front) for (const d of res._front) { const P = tileQuad(d).map(q => proj(V, q[0], q[1], q[2])); if (P.some(q => !q)) continue; const flat = []; for (const q of P) flat.push(q.x + V.vx, q.y + V.vy); U.fillPoly(ctx, flat, C.steel); U.polyline(ctx, flat, C.dusk, true); }
        // dust: a column falling from the hole and a puff spreading under the ceiling (dithered, on 2s)
        const a2 = floor(age * 12) / 12, [hx, hy] = res.room.hole;
        for (let i = 0; i < 70; i++) {
          const t0 = HT.hash(i, 71) * 1.2, a = a2 - t0; if (a < 0 || a > 2.6) continue;
          const ang = HT.hash(i, 72) * TAU, r = (0.2 + HT.hash(i, 73) * 1.0) * (1 + a * 0.5), z = COR.h - 0.05 - a * (0.5 + HT.hash(i, 74) * 0.9);
          const q = proj(V, hx + cos(ang) * r, hy + sin(ang) * r, Math.max(0.05, z)); if (!q) continue;
          const sz = Math.max(1, round(q.s * (0.06 + 0.08 * HT.hash(i, 75)))), al = (1 - a / 2.6) * 0.8;
          U.sq(ctx, q.x + V.vx, q.y + V.vy, sz, U.dcol(i % 3 ? C.lilacgrey : C.steel, al));
        }
      });
    },
  };
  function renderRoomCor(Bf, V, room, fr) { renderRoom(Bf, V, room, fr); }
  // wires and a torn duct hanging from the hole's rim, swaying (thin quads, depth-tested)
  function corWires(Bf, V, res, age) {
    const [hx, hy] = res.room.hole, dark = { ramp: COR_RAMPS[0], l: 0.5 };
    for (let w = 0; w < 5; w++) {
      const a = HT.hash(w, res.seed + 30) * TAU, r = holeR(res, a) * 0.92, len = 0.3 + HT.hash(w, res.seed + 31) * 0.7;
      const sw = sin(age * (2.2 + w * 0.3) + w) * 0.12 * Math.max(0.2, 1 - age * 0.15), x0 = hx + cos(a) * r, y0 = hy + sin(a) * r;
      const drop = Math.min(len, age * 3) ;
      const x1 = x0 + sw, y1 = y0 + sw * 0.5, z1 = COR.h - drop, t2 = 0.012;
      rasterPoly(Bf, V, [[x0 - t2, y0, COR.h], [x0 + t2, y0, COR.h], [x1 + t2, y1, z1], [x1 - t2, y1, z1]], dark);
      rasterPoly(Bf, V, [[x0, y0 - t2, COR.h], [x0, y0 + t2, COR.h], [x1, y1 + t2, z1], [x1, y1 - t2, z1]], dark);
    }
  }

  // ================================================================== AIRPORT — the Act VI limbo lounge (ch. 236 "Heading South")
  /* Canon (Fandom Chapter_236 + panels): an airport departure lobby — a big window wall with horizontal mullions,
     branching Y-shaped steel struts, curved ceiling beams with a round duct, rows of linked metal seats, tall potted
     palms, a café with a glass food case and round tables, square floor tiles; high-key light. The warm low sun and the
     pastel palette are this film's interpretation (the manga is black and white); the seven-lotus planter makes the
     chapter's symbolic lotus panel physical (sources count six or seven); the planes are a quiet metaphor (a plane
     appears in the chapter per a secondary page map). Every material has its own pastel palette ramp; sunlight through
     the glazing is baked into the light levels (pane-shaped patches on the floor and the walls, mullion shadows); faint
     dithered light shafts hang in the air (drawFront, so they veil the characters too).
     Frame (metres): lounge x −16…16, y −8…10 (the window wall is y = 10, looking out north), ceiling 7; floor z = 0.
     Seats: three linked rows facing the window at y = −1.5, 0.5, 2.5 (x −9.5…−2.5 and 2.5…9.5); the bench at `bench`
     (default [−0.8, 5.2], facing north: sit someone at y ≈ 5.15); the lotus planter at `planter` ([4.2, 6.6]); palms
     at (±13.5, 7.5); the café at x 10…15.5, y −7…−2. Outside: the parked plane broadside at ≈ (−3, 96), the runway
     at y ≈ 330 (the takeoff runs west → east).
     setOpts: takeoffAt (s; the plane enters from the west at 60 m/s, lifts off after 5 s, climbs out) · takeoffDir (1 |
     −1) · bench [x, y] · planter [x, y] · parked (true) · shafts (0..1 strength of the light shafts, 1) · board (true) */
  const AIR = { x0: -16, x1: 16, y0: -8, y1: 10, h: 7 };
  const AIR_E = () => HT.ENVS.airport;
  const AIR_RAMPS = [
    [C.mauve, C.rosewood, C.sand, C.cream, C.cream, C.white, C.white],          // 0 floor tiles (warm neutral)
    [C.dusk, C.lilacgrey, C.blush, C.cream, C.white, C.white, C.white],         // 1 walls / ceiling (pale, blush shade)
    [C.shadow, C.dusk, C.lilacgrey, C.mist, C.white, C.white, C.white],         // 2 steel (struts, seats' frames)
    [C.indigo, C.blue, C.sky, C.ice, C.white, C.white, C.white],                // 3 seat upholstery (soft blue)
    [C.pine, C.green, C.leaf, C.mint, C.sprout, C.butter, C.white],             // 4 plants
    [C.berry, C.rose, C.pinkrose, C.pink, C.salmon, C.peach, C.cream],          // 5 lotus / accents
    [C.bark, C.rust, C.clay, C.tan, C.honey, C.butter, C.cream],                // 6 wood (bench slats, café counter, planter)
    [C.shadow, C.navy, C.indigo, C.blue, C.sky, C.ice, C.white],                // 7 glass / screens
    [C.ink, C.shadow, C.plum, C.purple, C.lavender, C.blush, C.white],          // 8 departure board
  ].map(r => r.map(pkHex));
  // window: vertical mullions every 3 m (x), horizontal mullions every 1.3 m (z) — ch. 236 shows horizontal bands
  const winMull = (x, z) => { const fx = ((x + 16) / 3) % 1, fz = (z / 1.3) % 1; return fx < 0.04 || fx > 0.96 || fz < 0.035 || z < 0.25 || z > 6.8; };
  let AIR_ROOM = null;
  function airRoom() {
    if (AIR_ROOM) return AIR_ROOM;
    const E = AIR_E(), sd = E.sun, sl = Math.hypot(sd[0], sd[1], sd[2]), sx = sd[0] / sl, sy = sd[1] / sl, sz = sd[2] / sl;
    const X0 = AIR.x0, X1 = AIR.x1, Y0 = AIR.y0, Y1 = AIR.y1, Hh = AIR.h, tpm = 8;
    // sunlight: trace from the surface point toward the sun, through the window plane y = Y1 (glass, not mullion)
    const sunAt = (x, y, z) => {
      if (sy <= 0) return 0;
      const t = (Y1 - y) / sy; if (t < 0) return 0;
      const wx = x + sx * t, wz = z + sz * t;
      if (wx < X0 || wx > X1 || wz < 0 || wz > Hh) return 0;
      if (winMull(wx, wz)) return 0;
      // the Y-struts' shadows (columns at x = ±4, ±12, y = 2.5) — a thin vertical occluder
      for (const cx of [-12, -4, 4, 12]) { const tt = (2.5 - y) / sy; if (tt > 0 && tt < t) { const ox = x + sx * tt, oz = z + sz * tt; if (Math.abs(ox - cx) < 0.18 && oz < 4.6) return 0; } }
      return 1;
    };
    const skyFill = (y) => 0.35 + 0.65 * clamp((y - Y0) / (Y1 - Y0), 0, 1); // ambient from the window side
    const floorT = makeLev(X1 - X0, Y1 - Y0, tpm, (u, v, i, j, T) => {
      const x = X0 + u, y = Y0 + v, tx = (u / 1.2) % 1, ty = (v / 1.2) % 1, seam = tx < 0.05 || ty < 0.05, alt = ((floor(u / 1.2) + floor(v / 1.2)) & 1) === 0;
      let lev = (seam ? 1.7 : alt ? 2.35 : 2.2) + skyFill(y) * 0.5;
      if (sunAt(x, y, 0.001)) lev += 1.6;
      return lev;
    }, true);
    const ceilT = makeLev(X1 - X0, Y1 - Y0, tpm, (u, v, i, j, T) => {
      T.r = 1;
      const x = X0 + u, y = Y0 + v, beam = ((x + 16) % 4) < 0.35, duct = Math.abs(y + 2) < 0.6;
      if (duct) { T.r = 2; const q = (y + 2) / 0.6; return 2.2 + (1 - q * q) * 2.4 - (q > 0.3 ? 0.8 : 0); }
      return (beam ? 2.0 : 2.9) + skyFill(y) * 0.9;
    }, true);
    const wallTex = (which) => {
      const len = which === 's' || which === 'n' ? X1 - X0 : Y1 - Y0;
      const T = makeLev(len, Hh, tpm, (u, v, i, j, T2) => {
        const z = Hh - v;
        T2.r = 1;
        let x, y;
        if (which === 'e') { x = X1; y = Y0 + u; } else if (which === 'w') { x = X0; y = Y0 + u; } else if (which === 's') { x = X0 + u; y = Y0; } else { x = X0 + u; y = Y1; }
        if (which === 'n') { if (winMull(x, z)) { T2.r = 2; return 4.2; } T2.r = 0; return -1; } // portal (glass) → outside
        const sun = sunAt(x + (which === 'e' ? -0.01 : which === 'w' ? 0.01 : 0), y + (which === 's' ? 0.01 : 0), z) ? 1.5 : 0;
        if (z < 0.15) { T2.r = 2; return 2.0 + sun * 0.5; }
        if (which === 's' && Math.abs(x) < 3 && z < 3.2) { T2.r = 7; return Math.abs(x) > 2.9 || z > 3.1 ? 3.2 : 1.6 + (z > 1.6 ? 0.4 : 0); } // the gate doorway (dark glass)
        // pictogram signs (in-world signage, no text): a plane in a disc over the gate, an arrow on the east wall
        if (which === 's') { const dx2 = x, dz2 = z - 4.1, r2 = Math.hypot(dx2, dz2); if (r2 < 0.55) { T2.r = 7; const plane = (Math.abs(dz2) < 0.06 && Math.abs(dx2) < 0.36) || (Math.abs(dx2 + 0.02) < 0.05 && Math.abs(dz2) < 0.3 - Math.abs(dx2) * 0.3) || (Math.abs(dx2 + 0.3) < 0.05 && dz2 > -0.02 && dz2 < 0.16); return r2 > 0.5 ? 2.2 : plane ? 5.4 : 3.1; } }
        if (which === 'e' && Math.abs(y - 3) < 0.9 && Math.abs(z - 3.2) < 0.32) { T2.r = 7; const ay = y - 3, az2 = z - 3.2, arrow = (Math.abs(az2) < 0.06 && ay > -0.6 && ay < 0.3) || (ay >= 0.2 && ay < 0.55 && Math.abs(az2) < 0.3 - (ay - 0.2) * 0.85); return Math.abs(ay) > 0.86 || Math.abs(az2) > 0.28 ? 2.4 : arrow ? 5.4 : 3.2; }
        const seam = (u % 1.5) < 0.04, dado = Math.abs(z - 1.1) < 0.035;
        return 2.2 + skyFill(y) * 0.8 + sun - (seam ? 0.35 : 0) - (dado ? 0.5 : 0) + (z < 1.1 ? -0.15 : 0);
      }, true);
      return T;
    };
    AIR_ROOM = { x0: X0, x1: X1, y0: Y0, y1: Y1, h: Hh, surf: { floor: floorT, ceil: ceilT, s: wallTex('s'), n: wallTex('n'), w: wallTex('w'), e: wallTex('e') }, sun: [sx, sy, sz], sunAt };
    // portal texels: level −1 → alpha 0 base marker for the outside path
    const nT = AIR_ROOM.surf.n; nT.portal = new Uint8Array(nT.w * nT.h);
    for (let jj = 0; jj < nT.h; jj++) for (let ii = 0; ii < nT.w; ii++) { const z = Hh - (jj + 0.5) / tpm, x = X0 + (ii + 0.5) / tpm; if (!winMull(x, z)) nT.portal[jj * nT.w + ii] = 1; }
    return AIR_ROOM;
  }
  HT.bootTasks.push({ name: 'airport-room', fn: function* () { airRoom(); yield; } });
  // the outside through the glass: sky (env gradient, a sun glow, soft clouds), the far horizon, the apron and runway.
  // Per frame: per-column horizontal ray length + azimuth bin, the sun's screen position; per pixel only table lookups.
  const AIRSKY = { key: null, rows: null };
  const OUT = { hd: null, az: null, n: 0 };
  const CLOUD_NA = 1024, CLOUD_NE = 96, CLOUD = new Uint8Array(CLOUD_NA * CLOUD_NE); // azimuth × elevation (0…0.6 rad)
  (function () { for (let e = 0; e < CLOUD_NE; e++) for (let a2 = 0; a2 < CLOUD_NA; a2++) { const az = a2 / CLOUD_NA * TAU, cy = e / CLOUD_NE * 0.6; const per = (az2) => HT.noise(az2 * 5 + 40, cy * 22, 3); const w = a2 / CLOUD_NA, cl = per(az) * (1 - w) + per(az - TAU) * w - cy * 3; CLOUD[e * CLOUD_NA + a2] = cl > 0.52 ? 2 : cl > 0.42 ? 1 : 0; } })();
  function airOutsidePrep(V, fr) {
    const vw = V.vw; if (!OUT.hd || OUT.n !== vw) { OUT.hd = new Float32Array(vw); OUT.az = new Int32Array(vw); OUT.n = vw; }
    for (let x = 0; x < vw; x++) { const px = x + 0.5 - V.hx, dx = V.sy * V.f + V.cy * px, dy = V.cy * V.f - V.sy * px; OUT.hd[x] = Math.hypot(dx, dy); let az = Math.atan2(dx, dy); if (az < 0) az += TAU; OUT.az[x] = (az / TAU * CLOUD_NA) | 0; }
    const sd = AIR_ROOM.sun, sp = projDir(V, sd[0], sd[1], sd[2]);
    OUT.sunX = sp ? sp.x : -1e9; OUT.sunY = sp ? sp.y : -1e9; OUT.sunR = V.f * 0.012;
  }
  function airOutside(V, dx, dy, dz, px, py, hxw, hyw, hz0, fr) {
    const hd = OUT.hd[px], el = dz / hd, bq = HT.BAYER[((py & 3) << 2) | (px & 3)];
    if (el > 0.004) { // sky: elevation row of the gradient, the cloud panorama, the sun glow in screen space
      const rows = fr.skyRows, k = Math.min(rows.length - 1, (el * (1 - el * 0.28) / 0.9 * (rows.length - 1)) | 0);
      let col = rows[k];
      const e = (el * (1 - el * 0.3) / 0.6 * CLOUD_NE) | 0;
      if (e < CLOUD_NE) { const cl = CLOUD[e * CLOUD_NA + OUT.az[px]]; if (cl === 2) col = bq < 12 ? fr.P.white : fr.P.cream; else if (cl === 1 && bq < 6) col = fr.P.cream; }
      const sdx = px - OUT.sunX, sdy = py - OUT.sunY, r2 = sdx * sdx + sdy * sdy, sr = OUT.sunR;
      if (r2 < sr * sr * 16) col = r2 < sr * sr ? fr.P.white : r2 < sr * sr * 4 ? fr.P.butter : (bq < 10 ? fr.P.cream : col);
      return col;
    }
    const t = V.z / Math.max(1e-4, -dz), X = V.x + dx * t, Y = V.y + dy * t, D = t * hd;
    if (el > -0.02 && D > 2400) { // far horizon: a thin band of distant buildings / hills
      const az = OUT.az[px], hgt = 0.004 + 0.006 * ((HT.hash(az >> 3, 9) + HT.hash((az >> 3) + 1, 9)) * 0.5) + (HT.hash(az >> 1, 10) > 0.8 ? 0.006 : 0);
      return el > -hgt * 0.2 ? fr.P.pinkrose : fr.P.rosewood;
    }
    let col;
    if (Y < 20) col = fr.P.sand;
    else if (Y > 308 && Y < 352) { const e2 = Math.abs(Math.abs(Y - 330) - 20) < 0.8, c2 = Math.abs(Y - 330) < 0.5 && ((X / 30) - floor(X / 30)) < 0.5; col = e2 || c2 ? fr.P.cream : fr.P.dusk; }
    else if (Y > 380 || (Y > 150 && Y < 308)) col = HT.hash(floor(X / 60) * 7 + floor(Y / 35) * 131, 4) > 0.5 ? fr.P.sage : fr.P.lichen;
    else { const ln = Math.abs(((X + 9) / 38) - Math.round((X + 9) / 38)) * 38 < 0.25 || Math.abs(Y - 110) < 0.25; col = ln ? fr.P.gold : ((floor(X / 7.5) + floor(Y / 7.5)) & 1 ? fr.P.steel : fr.P.mist); }
    const hzK = Math.min(1, D / 2600); if (hzK * 16 > bq + 2) col = fr.P.haze;
    return col;
  }
  // a jetliner as flat-shaded polygons: fuselage (octagonal prism with tapered nose/tail), wings, tailplane, fin
  function planePolys(cx, cy, cz, dirx, diry, pitch, scale) {
    const L = 38 * scale, R = 2.0 * scale, polys = [];
    const ux = dirx, uy = diry, vx = -diry, vy = dirx, cp = cos(pitch), sp = sin(pitch);
    const P = (a, b, c) => { // a along the fuselage, b across (left), c up; nose up by pitch
      const a2 = a * cp - c * sp, c2 = a * sp + c * cp;
      return [cx + ux * a2 + vx * b, cy + uy * a2 + vy * b, cz + c2];
    };
    const ring = (a, r, zc) => { const out = []; for (let k = 0; k < 8; k++) { const q = (k / 8) * TAU; out.push(P(a, cos(q) * r, zc + sin(q) * r * 0.95)); } return out; };
    const secs = [[-L * 0.5, 0.25, 0.5], [-L * 0.38, 0.75, 0.25], [-L * 0.25, 1, 0], [L * 0.32, 1, 0], [L * 0.44, 0.8, -0.06], [L * 0.5, 0.2, -0.2]];
    const rings = secs.map(([a, k, zo]) => ring(a, R * k, R + zo * R));
    for (let s2 = 0; s2 + 1 < rings.length; s2++) for (let k = 0; k < 8; k++) { const k2 = (k + 1) % 8; polys.push({ pts: [rings[s2][k], rings[s2][k2], rings[s2 + 1][k2], rings[s2 + 1][k]], m: k >= 4 ? 'belly' : 'body', stripe: k === 1 || k === 2 }); }
    const wz = R * 0.55; // wings (swept), tailplane, fin
    for (const sgn of [-1, 1]) {
      polys.push({ pts: [P(L * 0.08, sgn * R * 0.9, wz), P(-L * 0.12, sgn * R * 0.9, wz), P(-L * 0.24, sgn * L * 0.47, wz + 1.2 * scale), P(-L * 0.17, sgn * L * 0.47, wz + 1.2 * scale)], m: 'wing' });
      polys.push({ pts: [P(-L * 0.38, sgn * R * 0.4, R * 1.2), P(-L * 0.47, sgn * R * 0.4, R * 1.2), P(-L * 0.51, sgn * L * 0.17, R * 1.4), P(-L * 0.46, sgn * L * 0.17, R * 1.4)], m: 'wing' });
      polys.push({ pts: [P(-L * 0.02, sgn * L * 0.16, wz - 0.6 * scale), P(-L * 0.12, sgn * L * 0.16, wz - 0.6 * scale), P(-L * 0.12, sgn * L * 0.16, wz - 1.8 * scale), P(-L * 0.02, sgn * L * 0.16, wz - 1.8 * scale)], m: 'engine' });
    }
    polys.push({ pts: [P(-L * 0.36, 0, R * 1.8), P(-L * 0.5, 0, R * 1.9), P(-L * 0.55, 0, R * 5.2), P(-L * 0.47, 0, R * 5.2)], m: 'fin' });
    for (const sgn of [-1, 1]) { // the passenger-window row and the cockpit glazing (slightly proud of the skin)
      const b = sgn * R * 1.005, zc = R + R * 0.28;
      polys.push({ pts: [P(-L * 0.33, b, zc - R * 0.07), P(L * 0.3, b, zc - R * 0.07), P(L * 0.3, b, zc + R * 0.06), P(-L * 0.33, b, zc + R * 0.06)], m: 'win', bias: 0.004 });
      polys.push({ pts: [P(L * 0.41, sgn * R * 0.7, R * 1.2), P(L * 0.45, sgn * R * 0.45, R * 1.25), P(L * 0.45, sgn * R * 0.4, R * 1.5), P(L * 0.4, sgn * R * 0.66, R * 1.5)], m: 'win', bias: 0.004 });
    }
    return polys;
  }
  function airRes(o) { return { kind: 'airport', o, seed: o.seed || 17 }; }
  let PARKED = null;
  function drawPlane(Bf, V, polys, tailRamp) {
    const R = AIR_RAMPS;
    for (const pl of polys) {
      const col = pl.m === 'body' ? { ramp: R[2], l: pl.stripe ? 4.6 : 4.1 } : pl.m === 'belly' ? { ramp: R[2], l: 2.9 } : pl.m === 'fin' ? { ramp: R[tailRamp], l: 2.2 } : pl.m === 'engine' ? { ramp: R[2], l: 2.2 } : pl.m === 'win' ? { ramp: R[7], l: 1.2 } : { ramp: R[2], l: 3.5 };
      rasterPoly(Bf, V, pl.pts, col, null, pl.bias || 0);
    }
  }
  // the departure board's blocks (abstract, no text): rows of amber/white/lavender blocks that flip at seeded times
  const boardCache = HT.lru(4);
  HT.caches.push({ name: 'airport.board', size: () => boardCache.size });
  function boardTex(t) {
    const q = floor(t * 3), key = q;
    let T = boardCache.get(key); if (T) return T;
    const w = 48, h = 22, d = new Uint32Array(w * h), R8 = AIR_RAMPS[8];
    d.fill(R8[0]);
    for (let r = 0; r < 6; r++) {
      const y0 = 2 + r * 3.3 | 0;
      for (let cI = 0; cI < 7; cI++) {
        const flipT = HT.hash(r * 13 + cI, 5) * 9, gen = floor((t + flipT) / 9 + HT.hash(r, 6));
        const flipping = ((t + flipT) % 9) < 0.35;
        const len = 1 + floor(HT.hash(r * 7 + cI * 3 + gen * 31, 7) * (cI === 0 ? 5 : 3)), x0 = 2 + cI * 6.5 | 0;
        const col = flipping ? R8[5] : cI === 0 ? R8[6] : cI === 6 ? (HT.hash(r + gen, 8) < 0.3 ? pkHex(C.gold) : R8[4]) : R8[3 + (cI & 1)];
        for (let x = x0; x < Math.min(w - 1, x0 + len + 2); x++) for (let y = y0; y < y0 + 2; y++) d[y * w + x] = flipping && y === y0 ? R8[1] : col;
      }
    }
    T = { data: d, w, h };
    boardCache.set(key, T);
    return T;
  }
  // sprites: a potted palm and a lotus bloom (cached canvases, blitted with the depth test)
  const airSpr = HT.lru(24);
  HT.caches.push({ name: 'airport.sprites', size: () => airSpr.size });
  function palmSprite(hpx, seed) {
    hpx = Math.max(12, round(hpx / 4) * 4);
    const key = 'palm' + hpx + '|' + seed; let cv = airSpr.get(key); if (cv) return cv;
    const w = round(hpx * 0.9), c = HT.canvas(w, hpx), g = c.g, R4 = AIR_RAMPS[4].map(v => HT.hex(v & 255, (v >> 8) & 255, (v >> 16) & 255)), R6 = AIR_RAMPS[6].map(v => HT.hex(v & 255, (v >> 8) & 255, (v >> 16) & 255));
    const cx = w / 2, pot = hpx * 0.16;
    HT.poly(g, [[cx - pot * 0.9, hpx - pot], [cx + pot * 0.9, hpx - pot], [cx + pot * 0.7, hpx], [cx - pot * 0.7, hpx]], R6[3]);
    HT.rect(g, cx - pot * 0.95, hpx - pot - 2, pot * 1.9, 2, R6[4]);
    const trunkTop = hpx * 0.34;
    for (let y = hpx - pot; y > trunkTop; y -= 2) HT.rect(g, cx - 1 + sin(y * 0.08) * 1.5, y - 2, 3, 2, (y / 2) & 1 ? R6[2] : R6[1]);
    const rng = HT.rng(seed);
    for (let k = 0; k < 9; k++) { // fronds: arcs of leaflets
      const a = -PI / 2 + (k / 8 - 0.5) * PI * 1.25 + (rng() - 0.5) * 0.2, L = hpx * (0.3 + rng() * 0.14);
      let px = cx, py = trunkTop;
      for (let s2 = 0; s2 < 10; s2++) {
        const u = s2 / 10, ang = a + u * u * (a > -PI / 2 ? 1.1 : -1.1), nx = px + cos(ang) * L / 10, ny = py + sin(ang) * L / 10 + u * u * L * 0.08;
        HT.line(g, px, py, nx, ny, R4[k % 3 === 0 ? 2 : 1]);
        const lf = Math.max(1, round(L * 0.08 * (1 - u)));
        HT.line(g, nx, ny, nx + cos(ang + 1.3) * lf, ny + sin(ang + 1.3) * lf + lf * 0.6, R4[(k + s2) % 2 ? 1 : 3]);
        HT.line(g, nx, ny, nx + cos(ang - 1.3) * lf, ny + sin(ang - 1.3) * lf + lf * 0.6, R4[2]);
        px = nx; py = ny;
      }
    }
    airSpr.set(key, c.c);
    return c.c;
  }
  function lotusSprite(px, open) {
    px = Math.max(3, round(px));
    const key = 'lotus' + px + '|' + open; let cv = airSpr.get(key); if (cv) return cv;
    const c = HT.canvas(px * 2 + 2, px + 2), g = c.g, cx = px + 1, by = px;
    const P5 = AIR_RAMPS[5].map(v => HT.hex(v & 255, (v >> 8) & 255, (v >> 16) & 255));
    for (let k = -2; k <= 2; k++) { // petals: pointed ovals fanning up
      const a = -PI / 2 + k * 0.42 * open, L = px * (0.95 - Math.abs(k) * 0.12);
      HT.poly(g, [[cx + cos(a - 0.35) * L * 0.25, by + sin(a - 0.35) * L * 0.25], [cx + cos(a) * L, by + sin(a) * L], [cx + cos(a + 0.35) * L * 0.25, by + sin(a + 0.35) * L * 0.25], [cx, by]], Math.abs(k) === 2 ? P5[2] : Math.abs(k) === 1 ? P5[4] : P5[5]);
    }
    HT.px(g, cx, by - px * 0.35, P5[6]);
    airSpr.set(key, c.c);
    return c.c;
  }
  HT.SETS.airport = {
    shear: true,
    init(sc, o) { airRoom(); return airRes(o || {}); },
    draw(ctx, c, S, pass, res0) {
      const res = resOf('airport', res0, S, airRes), o = res.o, t = S.t || 0, room = airRoom();
      const V = viewOf(c, true), Bf = bufFor('airport', V.vw, V.vh), E = AIR_E();
      // per-frame lookup: sky rows by elevation (env gradient) and the named palette colours for the outside
      if (AIRSKY.key !== E) { const n = 96, st = E.sky.map(([q, hx]) => [q, rgbOf(hx)]); AIRSKY.rows = new Uint32Array(n); for (let i = 0; i < n; i++) { const q = i / (n - 1); let k = 1; while (k < st.length - 1 && q > st[k][0]) k++; const [q0, c0] = st[k - 1], [q1, c1] = st[k], u = clamp((q - q0) / Math.max(1e-6, q1 - q0), 0, 1); AIRSKY.rows[i] = pk(c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u); } AIRSKY.key = E; AIRSKY.P = { white: pkHex(C.white), butter: pkHex(C.butter), cream: pkHex(C.cream), pinkrose: pkHex(C.pinkrose), rosewood: pkHex(C.rosewood), sand: pkHex(C.sand), dusk: pkHex(C.dusk), sage: pkHex(C.sage), lichen: pkHex(C.lichen), gold: pkHex(C.gold), steel: pkHex(C.steel), mist: pkHex(C.mist), haze: pkHex(HT.mix(C.cream, C.peach, 0.4)) }; }
      const fr = { ramps: AIR_RAMPS, skyRows: AIRSKY.rows, P: AIRSKY.P };
      room.outside = airOutside; room.outsidePrep = airOutsidePrep; fr.rampKey = 'air';
      const PF = HT.roomsProf, q0 = PF ? performance.now() : 0;
      renderRoomAir(Bf, V, room, fr);
      const q1 = PF ? performance.now() : 0;
      airProps(Bf, V, S, res, room, t);
      if (PF) { PF.airRoom = (PF.airRoom || 0) + q1 - q0; PF.airProps = (PF.airProps || 0) + performance.now() - q1; PF.airN = (PF.airN || 0) + 1; }
      ctx.putImageData(Bf.img, V.vx, V.vy);
    },
    drawFront(ctx, c, S, res0) {
      const res = resOf('airport', res0, S, airRes), o = res.o, k = o.shafts === undefined ? 1 : o.shafts;
      if (k <= 0) return;
      const V = viewOf(c, true), U = fxu(), room = airRoom(); if (!U) return;
      const [sx, sy, sz] = room.sun, t = S.t || 0;
      clipped(ctx, V, () => {
        fxClip(ctx, V);
        // light shafts: for each glazing column (3 m wide) the prism from the window (z 0.3…6.5) to its floor patch;
        // its screen hull filled with sparse warm dither, shimmering slowly
        for (let col = 0; col < 10; col++) {
          const xa = -15 + col * 3 + 0.15, xb = xa + 2.7, za = 0.4, zb = 6.4;
          const tf = zb / sz, t0 = 2.2 / Math.max(0.2, sy); // the beam shows from ~2.2 m inside the glass
          const at = (x, z, tt) => [x - sx * tt, AIR.y1 - sy * tt, z - sz * tt];
          const corners = [at(xa, za + sz * t0, t0), at(xb, za + sz * t0, t0), at(xa, zb, t0), at(xb, zb, t0), [xa - sx * za / sz, AIR.y1 - sy * za / sz, 0], [xb - sx * za / sz, AIR.y1 - sy * za / sz, 0], [xa - sx * tf, AIR.y1 - sy * tf, 0], [xb - sx * tf, AIR.y1 - sy * tf, 0]].filter(q => q[2] >= 0);
          const P = []; let ok = true;
          for (const q of corners) { const pr = proj(V, q[0], q[1], q[2]); if (!pr) { ok = false; break; } P.push(pr.x + V.vx, pr.y + V.vy); }
          if (!ok) continue;
          const hullP = hull2(P); if (!hullP) continue;
          const a = (0.07 + 0.025 * sin(t * 0.7 + col * 1.7)) * k;
          U.fillPoly(ctx, hullP, U.dcol(col % 3 ? C.cream : C.white, a));
        }
      });
    },
  };
  function hull2(P) { // convex hull of a flat [x0,y0,...] list (monotone chain) → flat list
    const pts = []; for (let i = 0; i < P.length; i += 2) pts.push([P[i], P[i + 1]]);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    const h = lo.slice(0, -1).concat(up.slice(0, -1)); if (h.length < 3) return null;
    const out = []; for (const p of h) out.push(p[0], p[1]); return out;
  }
  function renderRoomAir(Bf, V, room, fr) { airOutsidePass(Bf, V, room, fr); fr.portalSkip = true; renderRoom(Bf, V, room, fr); }
  // the view through the glazing, painted before the room pass for every column whose horizontal ray meets the window
  // wall first (rows between the glazing's bottom and top); the room pass then paints the mullions over it
  function airOutsidePass(Bf, V, room, fr) {
    airOutsidePrep(V, fr);
    const vw = V.vw, vh = V.vh, f = V.f, hx = V.hx, hy = V.hy, buf = Bf.buf, cy = V.cy, sy = V.sy, BY = HT.BAYER;
    const camX = clamp(V.x, room.x0 + 0.02, room.x1 - 0.02), camY = clamp(V.y, room.y0 + 0.02, room.y1 - 0.02), camZ = clamp(V.z, 0.02, room.h - 0.02);
    const rows = fr.skyRows, nR = rows.length - 1, P = fr.P, sunX = OUT.sunX, sunY = OUT.sunY, sr2 = OUT.sunR * OUT.sunR;
    const cInk = P.pinkrose, cRose = P.rosewood, cSand = P.sand, cCream = P.cream, cDusk = P.dusk, cSage = P.sage, cLich = P.lichen, cGold = P.gold, cSteel = P.steel, cMist = P.mist, cHaze = P.haze, cWhite = P.white, cButter = P.butter;
    for (let x = 0; x < vw; x++) {
      const px = x + 0.5 - hx, dx = sy * f + cy * px, dy = cy * f - sy * px;
      if (dy <= 1e-9) continue;
      const tN = (room.y1 - camY) / dy, hitX = camX + tN * dx;
      if (hitX <= room.x0 || hitX >= room.x1) continue;                 // a side wall is nearer
      const d = tN * f, inv = 1 / d, zPerY = d / f;
      const ya = Math.max(0, Math.ceil(hy - (6.8 - camZ) / zPerY - 0.5)), yb = Math.min(vh - 1, floor(hy - (0.25 - camZ) / zPerY - 0.5));
      if (yb < ya) continue;
      const hd = OUT.hd[x], invHd = 1 / hd, az = OUT.az[x];
      for (let y = ya; y <= yb; y++) {
        const dz = hy - (y + 0.5), el = dz * invHd, bq = BY[((y & 3) << 2) | (x & 3)], i = y * vw + x;
        let col;
        if (el > 0.004) {
          col = rows[Math.min(nR, (el * (1 - el * 0.28) * 1.1111 * nR) | 0)];
          const e = (el * (1 - el * 0.3) * 1.6667 * CLOUD_NE) | 0;
          if (e < CLOUD_NE) { const cl = CLOUD[e * CLOUD_NA + az]; if (cl === 2) col = bq < 12 ? cWhite : cCream; else if (cl === 1 && bq < 6) col = cCream; }
          const sdx = x - sunX, sdy = y - sunY, r2 = sdx * sdx + sdy * sdy;
          if (r2 < sr2 * 16) col = r2 < sr2 ? cWhite : r2 < sr2 * 4 ? cButter : (bq < 10 ? cCream : col);
        } else {
          const t = camZ / Math.max(1e-4, -dz), X = camX + dx * t, Y = camY + dy * t, D = t * hd;
          if (el > -0.02 && D > 2400) { const hgt = 0.004 + 0.006 * ((HT.hash(az >> 3, 9) + HT.hash((az >> 3) + 1, 9)) * 0.5) + (HT.hash(az >> 1, 10) > 0.8 ? 0.006 : 0); col = el > -hgt * 0.2 ? cInk : cRose; }
          else {
            if (Y < 20) col = cSand;
            else if (Y > 308 && Y < 352) { const e2 = Math.abs(Math.abs(Y - 330) - 20) < 0.8, c2 = Math.abs(Y - 330) < 0.5 && ((X / 30) - floor(X / 30)) < 0.5; col = e2 || c2 ? cCream : cDusk; }
            else if (Y > 380 || (Y > 150 && Y < 308)) col = HT.hash(floor(X / 60) * 7 + floor(Y / 35) * 131, 4) > 0.5 ? cSage : cLich;
            else { const q = (X + 9) / 38, ln = Math.abs(q - Math.round(q)) * 38 < 0.25 || Math.abs(Y - 110) < 0.25; col = ln ? cGold : ((floor(X / 7.5) + floor(Y / 7.5)) & 1 ? cSteel : cMist); }
            if (D * (16 / 2600) > bq + 2) col = cHaze;
          }
        }
        buf[i] = col;
      }
      void inv;
    }
  }
  function airProps(Bf, V, S, res, room, t) {
    const o = res.o, R = AIR_RAMPS, sunAt = room.sunAt;
    const inView = (x, y, r) => { const dx = x - V.x, dy = y - V.y, d = dx * V.Fx + dy * V.Fy; if (d < -r) return false; const lat = Math.abs(dx * V.Rx + dy * V.Ry); return lat < (Math.max(d, 0) + r) * (V.vw / 2 / V.f) + r * 2; };
    const lvl = (ramp, base, x, y, z) => ({ ramp: R[ramp], l: base + (sunAt(x, y, z) ? 1.4 : 0) });
    // outside first (behind the glass; mullions and everything inside occlude it by depth)
    if (o.parked !== false && inView(-3, 96, 30)) drawPlane(Bf, V, PARKED || (PARKED = planePolys(-3, 96, 0.8, 1, 0, 0, 1)), 5); // broadside at a remote stand
    if (o.takeoffAt !== undefined) {
      const tau = t - o.takeoffAt, dir = o.takeoffDir || 1;
      if (tau > -1 && tau < 40) {
        const v0 = 60, acc = 3, xr = -dir * 520 + dir * (v0 * tau + 0.5 * acc * tau * tau), rot = clamp((tau - 4.2) / 1.5, 0, 1), climb = Math.max(0, tau - 5);
        const z = 0.8 + climb * (6 + 1.5 * climb), pitch = 0.16 * rot;
        if (inView(xr, 330, 50)) drawPlane(Bf, V, planePolys(xr, 330, z, dir, 0, pitch, 1.35), 3); // a widebody
      }
    }
    // Y-struts: a column rising to 4.6 m, two arms branching to the ceiling (thin boxes / quads)
    for (const cx of [-12, -4, 4, 12]) {
      if (!inView(cx, 2.5, 4)) continue;
      const cy2 = 2.5, st = { ramp: R[2], l: 4.4 }, sd = { ramp: R[2], l: 3.2 };
      rasterOBox(Bf, V, cx, cy2, 0, 0.16, 0.16, 4.6, 0, 1, { front: sd, back: st, left: st, right: sd });
      for (const sg of [-1, 1]) { // arms: quads from (cx, 4.6) to (cx ± 2.2, 7) in the x–z plane, 0.2 m thick
        const a = [cx, cy2, 4.5], b = [cx + sg * 2.2, cy2, AIR.h];
        rasterPoly(Bf, V, [[a[0] - 0.14, cy2 - 0.15, a[2]], [a[0] + 0.14, cy2 - 0.15, a[2]], [b[0] + 0.12, cy2 - 0.15, b[2]], [b[0] - 0.12, cy2 - 0.15, b[2]]], st);
        rasterPoly(Bf, V, [[a[0] - 0.14, cy2 + 0.15, a[2]], [a[0] + 0.14, cy2 + 0.15, a[2]], [b[0] + 0.12, cy2 + 0.15, b[2]], [b[0] - 0.12, cy2 + 0.15, b[2]]], sd);
      }
    }
    // linked seat rows (beam seating facing the window): legs + beam, seat pans, backrests, armrests
    for (const ry of [-1.5, 0.5, 2.5]) for (const [xa, xb] of [[-9.5, -2.5], [2.5, 9.5]]) {
      if (!inView((xa + xb) / 2, ry, 4.5)) continue;
      const mid = (xa + xb) / 2, hw = (xb - xa) / 2;
      const up = lvl(3, 3.2, mid, ry, 0.5), upd = lvl(3, 2.2, mid, ry, 0.4), fr2 = lvl(2, 3.4, mid, ry, 0.3), frd = lvl(2, 2.2, mid, ry, 0.3);
      rasterOBox(Bf, V, mid, ry + 0.05, 0.02, hw - 0.1, 0.05, 0.36, 0, 1, { front: frd, back: frd, top: fr2 });              // beam + legs block
      rasterOBox(Bf, V, mid, ry + 0.02, 0.4, hw, 0.24, 0.06, 0, 1, { front: upd, back: upd, left: upd, right: upd, top: up });  // seat pans
      rasterOBox(Bf, V, mid, ry - 0.25, 0.46, hw, 0.04, 0.46, 0, 1, { front: up, back: upd, left: upd, right: upd, top: up });  // backrest (south side; they face north)
      for (let x = xa; x <= xb + 0.01; x += 0.7) rasterOBox(Bf, V, x, ry, 0.46, 0.025, 0.24, 0.2, 0, 1, { front: fr2, back: frd, left: frd, right: fr2, top: fr2 }); // armrests
    }
    // the bench (Geto's): wood slats on two steel legs, facing north
    const bn = o.bench || [-0.8, 5.2];
    if (inView(bn[0], bn[1], 2.5)) {
      const wd = lvl(6, 3.2, bn[0], bn[1], 0.45), wdd = lvl(6, 2.2, bn[0], bn[1], 0.4), leg = lvl(2, 2.4, bn[0], bn[1], 0.2);
      for (const lx of [-0.8, 0.8]) rasterOBox(Bf, V, bn[0] + lx, bn[1], 0, 0.04, 0.2, 0.42, 0, 1, { front: leg, back: leg, left: leg, right: leg });
      for (let k = 0; k < 3; k++) rasterOBox(Bf, V, bn[0], bn[1] - 0.14 + k * 0.14, 0.42, 0.95, 0.055, 0.04, 0, 1, { front: wdd, back: wdd, left: wdd, right: wdd, top: wd });
    }
    // the lotus planter: a low wooden box, water, lily pads (ellipses) and seven blooms (depth-tested sprites)
    const pl = o.planter || [4.2, 6.6];
    if (inView(pl[0], pl[1], 2)) {
      const wd = lvl(6, 3.0, pl[0], pl[1], 0.5), wdd = lvl(6, 2.1, pl[0], pl[1], 0.4);
      rasterOBox(Bf, V, pl[0], pl[1], 0, 0.95, 0.42, 0.5, 0, 1, { front: wdd, back: wdd, left: wd, right: wdd, top: wd });
      rasterPoly(Bf, V, [[pl[0] - 0.87, pl[1] - 0.34, 0.505], [pl[0] + 0.87, pl[1] - 0.34, 0.505], [pl[0] + 0.87, pl[1] + 0.34, 0.505], [pl[0] - 0.87, pl[1] + 0.34, 0.505]], lvl(7, 3.4, pl[0], pl[1], 0.5), null, 0.001);
      for (let k = 0; k < 6; k++) { // pads
        const px = pl[0] - 0.7 + k * 0.28 + (HT.hash(k, 3) - 0.5) * 0.1, py = pl[1] + (HT.hash(k, 4) - 0.5) * 0.4, r = 0.11 + HT.hash(k, 5) * 0.05, pts = [];
        for (let q = 0; q < 8; q++) { const a = (q / 8) * TAU; pts.push([px + cos(a) * r, py + sin(a) * r, 0.51]); }
        rasterPoly(Bf, V, pts, lvl(4, 2.6 + (k & 1) * 0.6, px, py, 0.5), null, 0.002);
      }
      for (let k = 0; k < 7; k++) { // seven blooms on stems
        const bx = pl[0] - 0.75 + k * 0.25 + (HT.hash(k, 6) - 0.5) * 0.08, by = pl[1] + (HT.hash(k, 7) - 0.5) * 0.36, bz = 0.62 + HT.hash(k, 8) * 0.22;
        const q = proj(V, bx, by, bz), q0 = proj(V, bx, by, 0.5); if (!q || !q0) continue;
        const spx = Math.max(2, q.s * 0.09);
        if (q0.y - q.y > 1) for (let yy = round(q.y); yy <= round(q0.y); yy++) { const xx = round(q.x), i = yy * V.vw + xx; if (xx >= 0 && yy >= 0 && xx < V.vw && yy < V.vh && 1 / q.d > Bf.zb[i]) { Bf.buf[i] = R[4][1]; Bf.zb[i] = 1 / q.d; } }
        blitDepth(Bf, V, lotusSprite(spx, 1), q.x - spx - 1, q.y - spx - 1, q.d - 0.02);
      }
    }
    // palms in pots by the window corners
    for (const [px, py] of [[-13.5, 7.5], [13.5, 7.5]]) {
      if (!inView(px, py, 3)) continue;
      const q = proj(V, px, py, 0); if (!q) continue;
      const hpx = q.s * 3.4, spr = palmSprite(hpx, px > 0 ? 3 : 7);
      blitDepth(Bf, V, spr, q.x - spr.width / 2, q.y - spr.height, q.d);
    }
    // the café (east): counter with a glass food case, round tables and chairs
    if (inView(12.8, -4.5, 6)) {
      const wd = { ramp: R[6], l: 3.2 }, wdd = { ramp: R[6], l: 2.2 }, gl = { ramp: R[7], l: 4.4 }, gld = { ramp: R[7], l: 3.2 };
      rasterOBox(Bf, V, 13.4, -6.2, 0, 2.0, 0.45, 1.0, 0, 1, { front: wd, back: wdd, left: wdd, right: wdd, top: { ramp: R[1], l: 4.4 } });
      rasterOBox(Bf, V, 12.2, -5.7, 1.0, 0.8, 0.08, 0.42, 0, 1, { front: gl, back: gld, left: gld, right: gld, top: gl });
      for (let k = 0; k < 4; k++) rasterOBox(Bf, V, 11.7 + k * 0.33, -5.75, 1.04, 0.1, 0.04, 0.08, 0, 1, { front: { ramp: R[5], l: 3.5 + (k & 1) }, top: { ramp: R[5], l: 4.5 } }); // pastries
      for (const [tx, ty] of [[11, -3.2], [13.2, -3.0], [14.6, -4.4]]) {
        if (!inView(tx, ty, 1.2)) continue;
        const top = [], topC = lvl(1, 4.6, tx, ty, 0.75); for (let q = 0; q < 8; q++) { const a = (q / 8) * TAU; top.push([tx + cos(a) * 0.4, ty + sin(a) * 0.4, 0.75]); }
        rasterOBox(Bf, V, tx, ty, 0, 0.035, 0.035, 0.73, 0, 1, { front: { ramp: R[2], l: 2.6 }, left: { ramp: R[2], l: 3 }, right: { ramp: R[2], l: 2.6 }, back: { ramp: R[2], l: 3 } });
        if (V.z > 0.75) rasterPoly(Bf, V, top, topC); else { const pts = top.slice(4).concat(top.slice(0, 1)); void pts; rasterOBox(Bf, V, tx, ty, 0.72, 0.38, 0.38, 0.03, 0, 1, { front: { ramp: R[1], l: 3.6 }, left: { ramp: R[1], l: 3.6 }, right: { ramp: R[1], l: 3.6 }, back: { ramp: R[1], l: 3.6 } }); }
        for (const [cxo, cyo] of [[-0.62, 0], [0.62, 0]]) { const ch = lvl(5, 3.1, tx + cxo, ty + cyo, 0.4); rasterOBox(Bf, V, tx + cxo, ty + cyo, 0.42, 0.2, 0.2, 0.05, cxo > 0 ? -1 : 1, 0, { front: ch, back: ch, left: ch, right: ch, top: ch }); rasterOBox(Bf, V, tx + cxo * 1.3, ty + cyo, 0.47, 0.2, 0.03, 0.4, cxo > 0 ? -1 : 1, 0, { front: ch, back: ch, left: ch, right: ch, top: ch }); }
      }
    }
    // the departure board: a dark panel high on the west wall, abstract blocks flipping (no readable text)
    if (o.board !== false) {
      const T = boardTex(t), x = AIR.x0 + 0.06, yA = -4.2, yB = 1.8, zA = 3.2, zB = 5.8;
      rasterOBox(Bf, V, x + 0.06, (yA + yB) / 2, zA - 0.12, (yB - yA) / 2 + 0.12, 0.08, zB - zA + 0.24, 1, 0, { front: { ramp: R[2], l: 1.2 }, left: { ramp: R[2], l: 2 }, right: { ramp: R[2], l: 2 }, top: { ramp: R[2], l: 2.2 } });
      rasterPoly(Bf, V, [[x + 0.15, yA, zA], [x + 0.15, yB, zA], [x + 0.15, yB, zB], [x + 0.15, yA, zB]], 0, { data: T.data, w: T.w, h: T.h, uv: [[0, T.h], [T.w, T.h], [T.w, 0], [0, 0]] }, 0.002);
    }
  }

  // ================================================================== SKY — high above the city at sunset (Act V)
  /* The city far below is the Voxel Space renderer (HT.SETS.voxel — it reads the damage ledger at S.T, so the Purple's
     erasure crater appears once it is in the ledger). Over it, in software on the same pixels: the sun disc with a
     soft halo (only on pure-sky pixels — recognised by recomputing the voxel renderer's own sky-row colours — so it
     sets behind the far skyline), a broken low cloud deck (a horizontal plane: exact per-row casting, so it parallaxes
     correctly with altitude and yaw; tops lit gold/rose on the sun side, purple in shade, edges Bayer-dithered, fading
     into the env fog with distance), high cirrus streaks on the sky, and faint crepuscular rays from the sun.
     Frame: the Shinjuku world (metres, SPEC §5); typical camera altitude 250–900 m; the deck defaults to z = 260 m
     (above the tallest tower, 195 m), the cirrus to z = 1500 m. Shear set (like voxel/city).
     setOpts: clouds (true | false | {z, cover (0.4 = fraction of the sky covered), scale (m per texel, 14), drift [vx, vy]
     m/s}) · cirrus (true | false | {z, cover (0.3)}) · sun (true | false) · rays (0..1, 0.6) · clearAir (true: the voxel
     pass uses a derived '<time>_alt' env preset with the fog pushed out — thinner haze seen from altitude) ·
     env: the scene env's time ('sunset' by default) */
  const CLN = 256, CLD = new Uint8Array(CLN * CLN), CIR = new Uint8Array(CLN * CLN);
  let CL_BUILT = false;
  function* skyBuild() {
    if (CL_BUILT) return;
    const per = (fn, x, y, P) => fn(x, y) * (1 - x / P) * (1 - y / P) + fn(x - P, y) * (x / P) * (1 - y / P) + fn(x, y - P) * (1 - x / P) * (y / P) + fn(x - P, y - P) * (x / P) * (y / P);
    for (let j = 0; j < CLN; j++) {
      for (let i = 0; i < CLN; i++) {
        const x = i / 32, y = j / 32; // period 8 in noise units
        const n = per((a, b) => HT.fbm(a, b, 4, 81), x, y, 8), w = per((a, b) => HT.noise(a * 3, b * 3, 83), x, y, 8);
        CLD[j * CLN + i] = clamp(round((n * 0.85 + w * 0.15) * 255), 0, 255);
        const c = per((a, b) => HT.noise(a * 0.7, b * 5.5, 85) * 0.7 + HT.noise(a * 1.6, b * 12, 86) * 0.3, x, y, 8);
        CIR[j * CLN + i] = clamp(round(c * 255), 0, 255);
      }
      if ((j & 31) === 31) yield;
    }
    // cumulative histograms → a coverage fraction maps to a density threshold (fbm clusters around 0.5)
    for (const [src, dst] of [[CLD, CLD_Q], [CIR, CIR_Q]]) { const h = new Uint32Array(256); for (let i = 0; i < src.length; i++) h[src[i]]++; let acc = 0; for (let v = 255; v >= 0; v--) { acc += h[v]; dst[v] = acc / src.length; } }
    CL_BUILT = true;
  }
  const CLD_Q = new Float32Array(256), CIR_Q = new Float32Array(256); // fraction of texels ≥ v
  const thOf = (Q, cover) => { let v = 255; while (v > 0 && Q[v] < cover) v--; return v; };
  HT.bootTasks.push({ name: 'sky-clouds', fn: skyBuild });
  function skyEnsure() { if (!CL_BUILT) { const it = skyBuild(); while (!it.next().done) { /* drain */ } } }
  const SKY_RAMP = [C.plum, C.purple, C.rose, C.pinkrose, C.coral, C.amber, C.gold, C.butter].map(pkHex);
  const skyRowCache = HT.lru(4);
  HT.caches.push({ name: 'sky.rows', size: () => skyRowCache.size });
  function skyRowsOf(E) { // identical to sets.js skyRows(E, 256): the voxel renderer's sky colours
    const key = E.sky.map(q => q.join(':')).join('|');
    let a = skyRowCache.get(key); if (a) return a;
    const n = 256; a = new Uint32Array(n);
    const st = E.sky.map(([q, hx]) => [q, rgbOf(hx)]);
    for (let i = 0; i < n; i++) { const q = i / (n - 1); let k = 1; while (k < st.length - 1 && q > st[k][0]) k++; const [q0, c0] = st[k - 1], [q1, c1] = st[k], u = clamp((q - q0) / Math.max(1e-6, q1 - q0), 0, 1); a[i] = pk(c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u); }
    skyRowCache.set(key, a);
    return a;
  }
  function skyRes(o) { return { kind: 'sky', o, seed: o.seed || 5 }; }
  HT.SETS.sky = {
    shear: true,
    init(sc, o) { skyEnsure(); return skyRes(o || {}); },
    draw(ctx, c, S, pass, res0) {
      skyEnsure();
      const res = resOf('sky', res0, S, skyRes), o = res.o, t = S.t || 0;
      const env = S.env && HT.ENVS[S.env.time] ? S.env : Object.assign({}, S.env, { time: 'sunset' }), E = HT.ENVS[env.time];
      const V = viewOf(c, true);
      // the city below (voxel renderer) → read back its pixels for the composite
      const hiKey = env.time + '_alt';
      if (!HT.ENVS[hiKey]) HT.ENVS[hiKey] = Object.assign({}, E, { fogNear: E.fogNear * 2, fogFar: Math.max(E.fogFar * 3, 2600) });
      const S2 = Object.assign({}, S, { env: Object.assign({}, env, { time: o.clearAir === false ? env.time : hiKey }) });
      const c2 = V.sheared && c.pitch ? CAM.prep(Object.assign({}, c, { pitch: 0, shift: (c.shift || 0) + c.f * Math.tan(c.pitch), _prepped: false })) : c;
      HT.SETS.voxel.draw(ctx, c2, S2, 'back', null);
      const img = ctx.getImageData(V.vx, V.vy, V.vw, V.vh), buf = new Uint32Array(img.data.buffer);
      const vw = V.vw, vh = V.vh, hy = V.hy, f = V.f, SK = skyRowsOf(E), BY = HT.BAYER;
      const isSky = new Uint8Array(vw * vh); // pure sky (not skyline, not terrain)
      for (let y = 0; y < vh; y++) { const el = clamp((hy - y) / (vh * 0.9), 0, 1), sc = SK[Math.min(255, floor(el * 255))], row = y * vw; if (y + 0.5 > hy) continue; for (let x = 0; x < vw; x++) if (buf[row + x] === sc) isSky[row + x] = 1; }
      // ---- sun disc + halo (sky pixels only)
      const sd = E.sun, sl = Math.hypot(sd[0], sd[1], sd[2]), sp = projDir(V, sd[0] / sl, sd[1] / sl, sd[2] / sl);
      if (o.sun !== false && sp) {
        const R0 = Math.max(3, f * 0.016), cols = [pkHex(C.white), pkHex(C.butter), pkHex(C.gold), pkHex(C.amber)];
        const x0 = Math.max(0, floor(sp.x - R0 * 7)), x1 = Math.min(vw - 1, Math.ceil(sp.x + R0 * 7)), y0 = Math.max(0, floor(sp.y - R0 * 7)), y1 = Math.min(vh - 1, Math.ceil(sp.y + R0 * 7));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const i = y * vw + x; if (!isSky[i]) continue;
          const dx = x + 0.5 - sp.x, dy = (y + 0.5 - sp.y) * 1.12, r = Math.sqrt(dx * dx + dy * dy) / R0, b = BY[((y & 3) << 2) | (x & 3)];
          if (r < 0.8) buf[i] = cols[0]; else if (r < 1) buf[i] = cols[1];
          else if (r < 1.5) buf[i] = b < 11 ? cols[2] : cols[1];
          else if (r < 3.2) { if (b < (3.2 - r) / 1.7 * 16) buf[i] = cols[r < 2.2 ? 2 : 3]; }
          else if (r < 7 && b < (7 - r) / 3.8 * 5) buf[i] = cols[3];
        }
      }
      const sx = sd[0] / sl, sy = sd[1] / sl, sh = Math.hypot(sx, sy) || 1, sux = sx / sh, suy = sy / sh;
      const fogC = rgbOf(E.fog), fogP = pk(fogC[0], fogC[1], fogC[2]);
      // ---- high cirrus (seen from below, sky pixels)
      const ci = o.cirrus === undefined ? {} : o.cirrus;
      if (ci) {
        const zc = ci.z || 1500, cover = ci.cover === undefined ? 0.3 : ci.cover, th = thOf(CIR_Q, cover), sc = 1 / 30, drift = t * 2;
        const cp = [pkHex(C.peach), pkHex(C.cream), pkHex(C.salmon), pkHex(C.pinkrose)];
        for (let y = 0; y < vh; y++) {
          const dz = hy - (y + 0.5); if (dz <= 0.5) break;
          const tt = (zc - V.z) / dz; if (tt <= 0) continue;
          const row = y * vw, dist = tt * f; if (dist > 30000) continue;
          let X = (V.x + tt * (V.sy * f + V.cy * (0.5 - V.hx)) + drift) * sc, Y = (V.y + tt * (V.cy * f - V.sy * (0.5 - V.hx))) * sc;
          const dX = tt * V.cy * sc, dY = -tt * V.sy * sc, fade = clamp(1 - dist / 30000, 0, 1);
          for (let x = 0; x < vw; x++, X += dX, Y += dY) {
            if (!isSky[row + x]) continue;
            const v = CIR[((Y | 0) & 255) * CLN + ((X | 0) & 255)];
            if (v < th) continue;
            const q = (v - th) / (255 - th) * fade * 16;
            if (q > BY[((y & 3) << 2) | (x & 3)] + 2) buf[row + x] = cp[q > 9 ? 1 : q > 5 ? 0 : (x + y) & 1 ? 2 : 3];
          }
        }
      }
      // ---- the low deck (seen from above: tops lit on the sun side; from below: dark undersides)
      const cl = o.clouds === undefined ? {} : o.clouds;
      if (cl) {
        const zc = cl.z || 260, cover = cl.cover === undefined ? 0.45 : cl.cover, scl = cl.scale || 14, dr = cl.drift || [3, 1], above = V.z > zc;
        const th = thOf(CLD_Q, cover), inv = 1 / scl, maxD = (E.fogFar || 900) * 7;
        const lx = sux * 3, ly = suy * 3; // sample offset toward the sun (texels) for the lit-edge term
        for (let y = 0; y < vh; y++) {
          const dz = hy - (y + 0.5);
          if (above ? dz >= -0.5 : dz <= 0.5) continue;
          const tt = (zc - V.z) / dz; if (tt <= 0) continue;
          const dist = tt * f; if (dist > maxD) continue;
          const row = y * vw, fog = Math.min(1, dist / maxD);
          let X = (V.x + tt * (V.sy * f + V.cy * (0.5 - V.hx)) + dr[0] * t) * inv, Y = (V.y + tt * (V.cy * f - V.sy * (0.5 - V.hx)) + dr[1] * t) * inv;
          const dX = tt * V.cy * inv, dY = -tt * V.sy * inv;
          for (let x = 0; x < vw; x++, X += dX, Y += dY) {
            if (!above && !isSky[row + x]) continue;
            const ix = X | 0, iy = Y | 0, v = CLD[(iy & 255) * CLN + (ix & 255)];
            if (v < th) continue;
            const b = BY[((y & 3) << 2) | (x & 3)], edge = (v - th) / (255 - th);
            if (edge * 16 * 4 < b) continue; // dithered rim
            let L;
            if (above) { const vs = CLD[((iy + ly) & 255) * CLN + ((ix + lx) & 255)]; L = 2.0 + edge * 2.6 + (v - vs) * 0.035; }
            else { const vs = CLD[((iy + ly) & 255) * CLN + ((ix + lx) & 255)]; L = 0.4 + edge * 1.2 + (vs < th ? 2.2 : 0); }
            L = clamp(L, 0, SKY_RAMP.length - 1.001);
            const k = L | 0, qq = ((L - k) * 16) | 0;
            let col = qq > b ? SKY_RAMP[k + 1] : SKY_RAMP[k];
            if (fog * 16 > b + 3) col = fogP;
            buf[row + x] = col;
          }
        }
      }
      // ---- crepuscular rays: faint wedges fanned upward from the sun, Bayer-thinned, on sky pixels only
      const rk = o.rays === undefined ? 0.45 : o.rays;
      if (rk > 0 && sp && sp.x > -vw * 0.3 && sp.x < vw * 1.3 && sp.y > -vh * 0.2 && sp.y < vh * 1.2) {
        const tq = floor(t * 12) / 12, rc = [pkHex(C.peach), pkHex(C.gold), pkHex(C.salmon)];
        for (let r = 0; r < 8; r++) {
          const a0 = -PI / 2 + (HT.hash(r, res.seed + 20) - 0.5) * 2.7 + 0.03 * sin(tq * 0.3 + r), w = 0.018 + HT.hash(r, res.seed + 21) * 0.03, L = Math.hypot(vw, vh) * (0.5 + 0.5 * HT.hash(r, res.seed + 22));
          const lvl = (1.2 + 1.6 * HT.hash(r, 23)) * rk, col = rc[r % 3];
          const P = [[sp.x, sp.y], [sp.x + cos(a0 - w) * L, sp.y + sin(a0 - w) * L], [sp.x + cos(a0 + w) * L, sp.y + sin(a0 + w) * L]];
          let y0 = Math.max(0, Math.ceil(Math.min(P[0][1], P[1][1], P[2][1]) - 0.5)), y1 = Math.min(vh - 1, floor(Math.max(P[0][1], P[1][1], P[2][1]) - 0.5));
          for (let y = y0; y <= y1; y++) {
            const syc = y + 0.5; let xl = Infinity, xr = -Infinity;
            for (let i = 0, j = 2; i < 3; j = i++) { const yi = P[i][1], yj = P[j][1]; if ((yi <= syc) !== (yj <= syc)) { const xx = P[i][0] + (syc - yi) / (yj - yi) * (P[j][0] - P[i][0]); if (xx < xl) xl = xx; if (xx > xr) xr = xx; } }
            const xa = Math.max(0, Math.ceil(xl - 0.5)), xb = Math.min(vw - 1, floor(xr - 0.5)), row = y * vw, brow = (y & 3) << 2;
            for (let x = xa; x <= xb; x++) { const i = row + x; if (!isSky[i]) continue; const dd = Math.hypot(x - sp.x, y - sp.y) / L; if (lvl * (1 - dd) > BY[brow | (x & 3)] + 0.5) buf[i] = col; }
          }
        }
      }
      ctx.putImageData(img, V.vx, V.vy);
    },
  };

  // ================================================================== WATCHERS — the allies in the monitoring room
  /* Rig characters (the film's fighter rig, rig.js) with silhouette materials lit by the monitors: a dark body, the
     lit tone and a 1-px rim in the monitor light's colour family (cold / warm / pale — picked per frame from the feed),
     minimal readable traits and no faces: Yuji (short spiky hair with a pink lit side, red hood), Yuta (slim, white
     uniform, a sheathed katana on his back), Kusakabe (brown peacoat to the knees, short hair), Hakari (tallest,
     swept-up hair, open jacket), Kashimo (wild light hair + electric crackle), Maki (ponytail, glasses glint, slim),
     generic. Also usable by the fight runner as cast chars 'w_yuji', 'w_yuta', … (rig poses 'w_sit', 'w_stand', 'w_jump',
     'w_cheer', 'w_raise', 'w_lean', 'w_sitLean', 'w_bow', 'w_shout', 'w_point', 'w_hand', 'w_rise', 'w_crossed', 'w_argue',
     'w_crouch').
     setOpts.watchers = [{who, x, y (room metres), pose, from, t0, dur (0.3 s), then (after 'jump', 'cheer'), poses
     [[t, pose], ...], face ('pillar' default | [dx, dy] world heading | 'east'…), layer ('front' → drawn over the fighters,
     for over-the-shoulder foregrounds), h (height override)}]. Pose names drop the 'w_' prefix. A 'jump' hops 0.35 m
     and lands in `then`. Sitting poses get a folding chair under them. */
  const rig = HT.rig, RH = rig && rig.helpers;
  const WFAMS = { cold: [C.navy, C.ice], warm: [C.maroon, C.salmon], pale: [C.shadow, C.lavender] };
  const WMAT = {};
  if (rig) for (const fam in WFAMS) {
    const [lit, rim] = WFAMS[fam];
    WMAT[fam] = {
      body: rig.material('w_body_' + fam, [C.ink, C.ink, C.ink, lit], { line: C.ink, rim }),
      skin: rig.material('w_skin_' + fam, [C.ink, C.ink, C.ink, C.shadow], { line: C.ink, rim }),
      pink: rig.material('w_pink_' + fam, [C.ink, C.wine, C.berry, C.rose], { line: C.ink, rim: C.pinkrose }),
      light: rig.material('w_light_' + fam, [C.shadow, C.dusk, C.lilacgrey, C.steel], { line: C.ink, rim: C.white }),
      coat: rig.material('w_coat_' + fam, [C.ink, C.maroon, C.maroon, C.rust], { line: C.ink, rim }),
      white: rig.material('w_white_' + fam, [C.ink, C.shadow, C.dusk, C.lilacgrey], { line: C.ink, rim }),
      hood: rig.material('w_hood_' + fam, [C.ink, C.maroon, C.maroon, C.brick], { line: C.ink, rim }),
      blade: rig.material('w_blade_' + fam, [C.ink, C.slate, C.steel, C.mist], { line: C.ink, rim: C.white }),
      hair: rig.material('w_hair_' + fam, [C.ink, C.ink, C.ink, C.shadow], { line: C.ink, rim }),
    };
  }
  if (rig) rig.material('w_glint', [C.white, C.white, C.white, C.white], { flat: true });
  let WF = 'cold';
  const WHO = {
    yuji: { h: 1.73, hair: 'pink', hood: true, spikes: [[-128, 0.12, 20], [-96, 0.2, 18], [-66, 0.26, 17], [-36, 0.3, 16], [-6, 0.3, 16], [24, 0.24, 17], [52, 0.16, 18]], bangs: [[0.3, 0.1, 0.1]] },
    yuta: { h: 1.75, hair: 'hair', top: 'white', sword: true, slim: true, spikes: [[-130, 0.14, 22], [-95, 0.18, 22], [-60, 0.2, 21], [-25, 0.2, 20], [10, 0.18, 21], [44, 0.2, 22], [70, 0.2, 20]], bangs: [[0.34, 0.26, 0.04], [0.2, 0.24, 0.02]] },
    kusakabe: { h: 1.78, hair: 'hair', coat: true, stocky: true, spikes: [[-110, 0.08, 24], [-70, 0.1, 24], [-30, 0.1, 24], [10, 0.08, 24]], bangs: null },
    hakari: { h: 1.9, hair: 'hair', jacket: true, broad: true, spikes: [[-120, 0.1, 22], [-80, 0.16, 20], [-40, 0.24, 18], [-5, 0.34, 16], [30, 0.4, 14], [58, 0.3, 14]], bangs: null, sweep: 0.35 },
    kashimo: { h: 1.8, hair: 'light', crackle: true, spikes: [[-150, 0.26, 16], [-118, 0.34, 15], [-86, 0.4, 14], [-56, 0.44, 13], [-26, 0.44, 13], [6, 0.4, 13], [36, 0.32, 14], [64, 0.22, 15]], bangs: [[0.3, 0.16, 0.12]] },
    maki: { h: 1.7, hair: 'hair', ponytail: true, glasses: true, slim: true, spikes: [[-100, 0.08, 24], [-50, 0.1, 24], [0, 0.08, 24]], bangs: [[0.3, 0.2, 0.06], [0.16, 0.2, 0.04]] },
    generic: { h: 1.74, hair: 'hair', spikes: [[-110, 0.1, 22], [-60, 0.14, 21], [-15, 0.14, 21], [30, 0.1, 22]], bangs: null },
  };
  function watcherBuild(who) {
    const sp = WHO[who];
    return function (T) {
      const M = WMAT[WF] || WMAT.cold, J = T.J, P = T.P;
      const top = sp.top === 'white' ? M.white : M.body, pants = sp.top === 'white' ? M.white : M.body;
      const cfg = { skin: M.skin, top, sleeve: 'long', pants, legs: 'normal', shoe: M.body };
      const d = RH.torsoFrame(T);
      if (sp.sword) { const a = RH.add(J.chest, [-0.07, 0.13]), b = RH.add(J.hip, [-0.13, -0.1]); T.cap(a, b, 0.013, 0.013, M.body, 4); T.cap(RH.lerp2(a, b, 0.2), RH.lerp2(a, b, 0.23), 0.02, 0.02, M.hair, 4); }
      RH.armSide(T, 'fa', cfg, 1, -1); RH.legSide(T, 'fl', pants, 3, -1); RH.footSide(T, 'fl', M.body, 3, -1);
      if (sp.coat) { // the peacoat's back panel behind the far leg, flaring to the knees
        const kn = RH.lerp2(J.flK, J.nlK, 0.5);
        T.poly([d.tp(1.0, -d.wc * 1.05), d.tp(0.2, -d.wh * 1.3), RH.add(kn, [-0.06, -0.02]), RH.add(kn, [0.05, -0.02]), d.tp(0.2, d.wh * 1.2), d.tp(1.0, d.wc)], M.coat, 4, 0, -1, d.fw);
      }
      const torsoMat = sp.coat ? M.coat : top;
      T.poly([d.tp(-0.1, -d.wh), d.tp(-0.1, d.wh), d.tp(0.8, d.wc), d.tp(1.03, d.wc * 0.3), d.tp(1.03, -d.wc * 0.4), d.tp(0.85, -d.wc)], torsoMat, 5, 0, -1, d.fw);
      if (sp.jacket) T.poly([d.tp(1.04, d.wc * 0.2), d.tp(1.0, d.wc * 1.1), d.tp(-0.05, d.wh * 1.25), d.tp(-0.12, d.wh * 0.5), d.tp(0.5, d.wc * 0.35)], M.body, 6, 0, -1, d.fw);
      if (sp.hood) T.poly([d.tp(1.08, -d.wc * 0.9), d.tp(1.1, d.wc * 0.1), d.tp(0.86, d.wc * 0.2), d.tp(0.8, -d.wc * 0.95)], M.hood, 6, 0, -1, d.fw);
      RH.legSide(T, 'nl', pants, 7, 0); RH.footSide(T, 'nl', M.body, 7, 0);
      if (sp.coat) { const kn = J.nlK; T.poly([d.tp(0.55, d.wc * 0.9), d.tp(0.1, d.wh * 1.35), RH.add(kn, [0.07, -0.03]), RH.add(kn, [-0.05, -0.03]), d.tp(0.1, -d.wh * 0.6), d.tp(0.55, -d.wc * 0.2)], M.coat, 8, 0, -1, d.fw); }
      const H = RH.headFrame(T);
      T.ell(H(0.02, 0.02), 0.5 * T.prop.head, 0.52 * T.prop.head, J.headA, M.skin, 9);
      const hm = sp.hair === 'pink' ? M.pink : sp.hair === 'light' ? M.light : M.hair;
      if (sp.ponytail) { const b = H(-0.45, 0.25), c2 = H(-0.95, -0.55); T.cap(b, c2, T.prop.head * 0.14, T.prop.head * 0.08, hm, 10); }
      RH.hairSide(T, H, hm, sp.spikes, sp.bangs, { sweep: sp.sweep === undefined ? -0.14 : sp.sweep });
      if (sp.glasses && T.lod >= 1) T.dot(H(0.3, 0.06), rig.mat('w_glint'), 3, 12, T.lod >= 2 ? 2 : 1, 1);
      RH.armSide(T, 'na', cfg, 13, 0);
    };
  }
  if (rig && RH) for (const who in WHO) {
    const sp = WHO[who];
    rig.define({ name: 'w_' + who, height: sp.h, margin: 0.3, prop: Object.assign({}, sp.slim ? { chest: 0.115, waist: 0.09, limb: 0.031, leg: 0.041 } : {}, sp.stocky ? { chest: 0.14, waist: 0.115, shoulderW: 0.25 } : {}, sp.broad ? { chest: 0.14, shoulderW: 0.27 } : {}), build: watcherBuild(who) });
  }
  // poses (side 3/4 view; degrees as in rig.js)
  const WPOSES = {
    stand: { lean: 2, neck: 2, na: [6, 10, 0], fa: [-4, 12, 0], nl: [2, 2, 0], fl: [-3, 2, 0], nh: 'relaxed', fh: 'relaxed' },
    sit: { root: [-0.25, -0.25], lean: 4, neck: 4, twist: 0.4, na: [26, 60, 0], fa: [14, 64, 0], nl: [86, 90, 0], fl: [80, 86, 0], nh: 'relaxed', fh: 'relaxed' },
    sitLean: { root: [-0.22, -0.25], lean: 34, neck: -8, head: 4, twist: 0.4, na: [52, 74, 0], fa: [44, 80, 0], nl: [86, 94, 0], fl: [80, 90, 0], nh: 'fist', fh: 'fist' },
    lean: { lean: 20, neck: -6, head: 6, na: [30, 30, 0], fa: [20, 26, 0], nl: [8, 10, 0], fl: [-8, 4, 0], nh: 'relaxed', fh: 'relaxed' },
    crossed: { lean: -2, na: [20, 120, 0], fa: [16, 124, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'fist', fh: 'fist' },
    cheer: { lean: -4, neck: -10, head: -8, na: [170, 14, 0], fa: [158, 18, 0], nl: [4, 2, 0], fl: [-4, 2, 0], nh: 'fist', fh: 'fist' },
    jump: { root: [0, 0.02], lean: -2, neck: -8, na: [160, 22, 0], fa: [148, 26, 0], nl: [34, 64, 0], fl: [12, 52, 0], nh: 'fist', fh: 'fist' },
    crouch: { root: [0, -0.1], lean: 22, neck: -12, na: [20, 40, 0], fa: [10, 40, 0], nl: [60, 100, 0], fl: [30, 80, 0], nh: 'fist', fh: 'fist' },
    bow: { lean: 14, neck: 32, head: 18, na: [4, 8, 0], fa: [-2, 8, 0], nl: [2, 2, 0], fl: [-2, 2, 0], nh: 'relaxed', fh: 'relaxed' },
    shout: { lean: 18, neck: -16, head: -12, na: [-34, 44, 0], fa: [-40, 48, 0], nl: [16, 16, 0], fl: [-12, 6, 0], nh: 'fist', fh: 'fist' },
    point: { lean: 4, neck: -2, na: [88, 6, 0], fa: [-6, 12, 0], nl: [6, 4, 0], fl: [-4, 2, 0], nh: 'point', fh: 'relaxed' },
    hand: { lean: 8, na: [98, 12, 0], fa: [2, 12, 0], nl: [8, 6, 0], fl: [-6, 2, 0], nh: 'open', fh: 'relaxed' },
    rise: { root: [-0.12, -0.13], lean: 28, neck: -10, na: [44, 30, 0], fa: [32, 30, 0], nl: [52, 64, 0], fl: [40, 52, 0], nh: 'open', fh: 'open' },
    argue: { lean: 2, neck: -4, na: [62, 74, 0], fa: [22, 44, 0], nl: [6, 4, 0], fl: [-6, 2, 0], nh: 'open', fh: 'fist' },
    raise: { lean: -2, neck: -8, head: -6, na: [172, 10, 0], fa: [-6, 12, 0], nl: [4, 2, 0], fl: [-4, 2, 0], nh: 'fist', fh: 'relaxed' },
  };
  if (HT.onPoses && rig) HT.onPoses.push(r => { for (const k in WPOSES) r.POSES['w_' + k] = r.full(WPOSES[k]); });
  else if (rig) for (const k in WPOSES) rig.POSES['w_' + k] = rig.full(WPOSES[k]);
  const SITS = { sit: 1, sitLean: 1, rise: 1 };
  const wPose = n => (rig.POSES['w_' + n] || rig.POSES[n] || rig.POSES.w_stand);
  function watcherKeys(w) {
    if (w.poses) return w.poses;
    if (w.t0 !== undefined) return [[-1e9, w.from || (w.pose === 'jump' || w.pose === 'stand' || w.pose === 'rise' || w.pose === 'cheer' ? 'sit' : 'stand')], [w.t0, w.pose]];
    return [[-1e9, w.pose || 'stand']];
  }
  ROOMS.watcherSits = w => watcherKeys(w).some(k => SITS[k[1]]);
  // pose at scene time t (drawings on 2s during transitions) + hop height for jumps
  function watcherState(w, t) {
    const K = watcherKeys(w);
    let i = 0; while (i + 1 < K.length && K[i + 1][0] <= t) i++;
    const cur = K[i][1], prev = i > 0 ? K[i - 1][1] : cur, tk = K[i][0], bl = w.dur || 0.3;
    let u = i > 0 ? clamp((t - tk) / bl, 0, 1) : 1;
    u = u < 1 ? floor(u * bl * 12) / Math.max(1, round(bl * 12)) : 1;
    let hop = 0, pose;
    if (cur === 'jump') {
      const a = t - tk, then = w.then || 'cheer';
      if (a < 0.1) pose = rig.lerpPose(wPose(prev), wPose('crouch'), floor(a * 12) / 1.2);
      else if (a < 0.62) { pose = wPose('jump'); hop = 0.38 * sin(PI * (a - 0.1) / 0.52); }
      else pose = rig.lerpPose(wPose('crouch'), wPose(then), clamp(floor((a - 0.62) * 12) / 3, 0, 1));
      return { pose, hop, key: 'j' + floor(a * 12) + then };
    }
    pose = u >= 1 ? wPose(cur) : rig.lerpPose(wPose(prev), wPose(cur), HT.E.outQuad(u));
    return { pose, hop, key: (u >= 1 ? cur : prev + '>' + cur + (u * 12 | 0)) };
  }
  const wCache = HT.lru(40);
  HT.caches.push({ name: 'rooms.watchers', size: () => wCache.size });
  const famOf = g => { const mx = Math.max(g[0], g[1], g[2]) || 1; return g[0] > g[2] * 1.2 && g[0] >= mx * 0.95 ? 'warm' : g[2] > g[0] * 1.08 ? 'cold' : 'pale'; };
  // per-frame placement: projects every watcher, renders (cached) and blits with the depth test; remembers screen boxes
  function watcherItems(V, S, res, glow, layer) {
    const ws = res.o.watchers; if (!ws || !rig) return [];
    const t = S.t || 0, fam = res.fam || famOf(glow || [0.5, 0.5, 0.6]), out = [];
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k]; if ((w.layer === 'front') !== (layer === 'front')) continue;
      const st = watcherState(w, t), sp = WHO[w.who] || WHO.generic, hgt = w.h || sp.h;
      const p = proj(V, w.x, w.y, 0); if (!p || p.d < 0.3) continue;
      let fx, fy;
      if (Array.isArray(w.face)) { fx = w.face[0]; fy = w.face[1]; }
      else if (typeof w.face === 'string' && w.face !== 'pillar') { const Hh = { east: [1, 0], west: [-1, 0], north: [0, 1], south: [0, -1] }[w.face] || [1, 0]; fx = Hh[0]; fy = Hh[1]; }
      else { fx = -w.x; fy = -w.y; }
      const face = (fx * V.Rx + fy * V.Ry) >= 0 ? 1 : -1;
      // monitor light direction in screen space (x right, y down, z toward the viewer)
      const lx = 0 - w.x, ly = 0 - w.y, lz = 1.6 - hgt * 0.6;
      const lr = lx * V.Rx + ly * V.Ry, lf = lx * V.Fx + ly * V.Fy, ll = Math.hypot(lr, lz, lf) || 1;
      const light = [lr / ll, -lz / ll * 0.6, -lf / ll];
      const q = v => Math.round(v * 2) / 2, lq = [q(light[0]), q(light[1]), q(light[2])];
      const px = hgt * p.s, pq = Math.max(6, Math.round(Math.pow(1.08, Math.round(Math.log(px) / Math.log(1.08)))));
      // cull (director, M5): a watcher beside the lens (taller than 4 frames) or wholly outside the view is never
      // rasterized — one standing next to a close camera rendered at ~2,000 px, ~100 ms and a 500 MB heap jump
      if (px > 4 * V.vh || p.x + px < 0 || p.x - px > V.vw || p.y - px * 1.3 > V.vh || p.y + px * 0.4 < 0) continue;
      const key = w.who + '|' + st.key + '|' + pq + '|' + face + '|' + lq.join(',') + '|' + fam;
      let r = wCache.get(key);
      if (!r) { WF = fam; r = rig.render('w_' + (WHO[w.who] ? w.who : 'generic'), st.pose, pq, { face, light: lq, rimDir: [lq[0] || 0.01, lq[1] * 0.5] }); wCache.set(key, r); }
      out.push({ w, r, p, hop: st.hop, face, px: pq });
    }
    return out;
  }
  ROOMS.watchersDraw = (Bf, V, S, res, glow) => {
    const items = watcherItems(V, S, res, glow, 'back');
    res._wItems = items;
    for (const it of items) blitDepth(Bf, V, it.r.canvas, it.p.x - it.r.ox, it.p.y - it.r.oy - it.hop * it.p.s, it.p.d - 0.05);
  };
  // Kashimo's crackle (drawn on 2s over the frame; skipped when his head is hidden behind something nearer)
  ROOMS.watchersFx = (ctx, V, S, res) => {
    const U = fxu(); if (!U || !res._wItems) return;
    const t = S.t || 0, fq = floor(t * 12);
    fxClip(ctx, V);
    for (const it of res._wItems) {
      const sp = WHO[it.w.who]; if (!sp || !sp.crackle) continue;
      const x0 = V.vx + it.p.x, y0 = V.vy + it.p.y - it.hop * it.p.s, hpx = it.px;
      const Bf = bufFor('command', V.vw, V.vh), hx = round(it.p.x), hy = round(it.p.y - hpx * 0.85);
      if (hx >= 0 && hy >= 0 && hx < V.vw && hy < V.vh && Bf.zb[hy * V.vw + hx] > 1 / (it.p.d - 0.05) + 1e-3) continue;
      for (let b = 0; b < 2; b++) {
        if (HT.hash(b + fq * 7, 41 + it.w.x * 10) < 0.3) continue;
        const a = HT.hash(b * 3 + fq * 11, 43) * TAU, r0 = hpx * (0.18 + 0.2 * HT.hash(b + fq, 44)), yy = y0 - hpx * (0.25 + 0.6 * HT.hash(b * 5 + fq, 45));
        let px = x0 + cos(a) * r0 * 0.6, py = yy;
        const col = U.dcol(b === 0 ? C.white : C.ice, 0.95);
        for (let s = 0; s < 3; s++) { const nx = px + (HT.hash(s + b * 9 + fq * 13, 46) - 0.5) * hpx * 0.12, ny = py + (HT.hash(s + b * 9 + fq * 13, 47) - 0.5) * hpx * 0.12; U.line(ctx, px, py, nx, ny, col); px = nx; py = ny; }
      }
    }
  };
  ROOMS.watchersFront = (ctx, V, S, res) => {
    const items = watcherItems(V, S, res, res.glowCol, 'front');
    clipped(ctx, V, () => { for (const it of items) ctx.drawImage(it.r.canvas, round(V.vx + it.p.x - it.r.ox), round(V.vy + it.p.y - it.r.oy - it.hop * it.p.s)); });
  };
  ROOMS.WHO = WHO;
  HT.props = HT.props || {};
  HT.props.watchers = (ctx, S, list, o = {}) => {
    if (!rig || !S || !S.project) return;
    const t = S.t || 0, fam = o.family || 'cold', L = o.light || [0.4, -0.3, -0.6];
    const items = [];
    for (const w of list || []) { const p = S.project(w.x, w.y, w.z || 0); if (!p) continue; const hp = (w.h || 1.75) * p.s; if (hp > 4 * H || p.x + hp < 0 || p.x - hp > W || p.y - hp * 1.3 > H || p.y + hp * 0.4 < 0) continue; items.push({ w, p }); }
    items.sort((a, b) => b.p.d - a.p.d);
    for (const { w, p } of items) {
      const st = watcherState(w, t), sp = WHO[w.who] || WHO.generic, px = Math.max(6, round((w.h || sp.h) * p.s));
      const face = w.screenFace || (typeof w.face === 'number' ? w.face : 1);
      const key = 'P|' + w.who + '|' + st.key + '|' + px + '|' + face + '|' + L.join(',') + '|' + fam;
      let r = wCache.get(key);
      if (!r) { WF = fam; r = rig.render('w_' + (WHO[w.who] ? w.who : 'generic'), st.pose, px, { face, light: L, rimDir: [L[0] || 0.01, L[1] * 0.5] }); wCache.set(key, r); }
      ctx.drawImage(r.canvas, round(p.x - r.ox), round(p.y - r.oy - st.hop * p.s));
    }
  };

  // ---- lab cells + bench (command)
  {
    const feedA = { cam: { x: 36, y: -64, z: 24, yaw: -0.32, pitch: -0.2, f: 400 }, env: { time: 'overcast', snow: 0.3 }, T: 205 };
    const feedB = { cam: { x: -30, y: -40, z: 9, yaw: 0.5, pitch: -0.05, f: 360 }, env: { time: 'shrine', snow: 0.3 }, T: 205 };
    const feedV = { fn: (g, w, h, S2) => { HT.vgrad(g, 0, 0, w, h, [[0, C.ink], [0.6, C.navy], [1, C.indigo]]); for (let i = 0; i < 40; i++) HT.px(g, (HT.hash(i, 3) * w) | 0, (HT.hash(i, 4) * h) | 0, i % 5 ? C.lilacgrey : C.white); HT.circle(g, w * 0.62, h * 0.35, 6, C.ink); HT.ring(g, w * 0.62, h * 0.35, 7, C.cream); } };
    const W8 = [
      { who: 'yuji', x: -1.6, y: -3.2, pose: 'sit' }, { who: 'yuta', x: 0.3, y: -3.6, pose: 'stand' }, { who: 'kusakabe', x: 2.1, y: -3.1, pose: 'sit' },
      { who: 'hakari', x: -3.2, y: -1.8, pose: 'crossed' }, { who: 'kashimo', x: 3.3, y: -1.4, pose: 'stand' }, { who: 'maki', x: -2.6, y: 2.6, pose: 'stand' },
      { who: 'generic', x: 1.9, y: 3.2, pose: 'sit' }, { who: 'generic', x: -0.4, y: 3.9, pose: 'lean', face: [0, -1] },
    ];
    const CC = [
      ['command wide (overcast feed)', { x: -6.8, y: -8.6, z: 2.1, yaw: 0.62, f: 360, shift: 30 }, 1, { feed: feedA, watchers: W8 }],
      ['command behind the watchers (crimson feed)', { x: 0.6, y: -7.0, z: 1.4, yaw: -0.03, f: 440, shift: -8 }, 2, { feeds: [feedB], watchers: W8 }],
      ['command on the clock CRT: 2:59 (void feed)', { x: 0.9, y: -3.1, z: 1.45, yaw: -0.28, f: 420, shift: 0 }, 1.5, { feeds: [feedV], clock: { from: '2:58', at: 0.5, tick: 1, to: '3:00' }, watchers: W8 }],
      ['command from the tower toward the watchers', { x: 0.3, y: -1.35, z: 1.5, yaw: PI - 0.08, f: 300, shift: 16 }, 3, { feed: feedA, watchers: W8 }],
      ['command close on the tower (director cam, crimson)', { x: 0.2, y: -3.0, z: 1.55, yaw: 0, f: 560 }, 2, { feeds: [feedB], watchers: W8 }],
      ['command close on the tower (director cam, overcast)', { x: 0.2, y: -3.0, z: 1.55, yaw: 0, f: 560 }, 2, { feed: feedA, watchers: W8 }],
    ];
    for (const [label, cm, t, o] of CC) ROOMS.labCells.push({ set: 'command', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = ROOMS.mockS(t, 230 + t, { time: 'night', set: 'command' }, {});
      const r = HT.SETS.command.init(S.sc, o);
      HT.SETS.command.draw(g, c, S, 'back', r);
      HT.SETS.command.drawFront(g, c, S, r);
    } });
    ROOMS.labCells.push({ set: 'command', label: 'watchers close (void feed, Yuji jumps, Kashimo stops Yuta)', draw(g) {
      const o = { feeds: [feedV], watchers: [
        { who: 'yuji', x: -1.5, y: -2.8, pose: 'jump', t0: 0.9 }, { who: 'yuta', x: -0.4, y: -3.0, pose: 'rise' }, { who: 'kusakabe', x: 0.6, y: -2.9, pose: 'lean' },
        { who: 'hakari', x: 1.6, y: -3.1, pose: 'crossed' }, { who: 'kashimo', x: 0.3, y: -3.35, pose: 'hand', face: [-1, 0.2] }, { who: 'maki', x: -2.6, y: -3.0, pose: 'stand' }] };
      const c = CAM.prep(CAM.make({ x: 0.1, y: -1.25, z: 1.2, yaw: PI, f: 520, shift: 30 })), S = ROOMS.mockS(1.2, 231.2, { time: 'night' }, {});
      const r = HT.SETS.command.init(S.sc, o); HT.SETS.command.draw(g, c, S, 'back', r);
    } });
    let bres = null;
    ROOMS.benches.command = (g, i) => {
      bres = bres || cmdRes({ feed: { cam: (t) => ({ x: 36 + t * 3, y: -64, z: 24, yaw: -0.32 + t * 0.02, pitch: -0.2, f: 400 }), env: { time: 'overcast', snow: 0.3 }, T: 205 }, watchers: W8 });
      const c = CAM.prep(CAM.make({ x: -6.5 + i * 0.05, y: -8.2 + i * 0.03, z: 2, yaw: 0.62 - i * 0.004, f: 360, shift: 30 }));
      HT.SETS.command.draw(g, c, ROOMS.mockS(i / 30, 230 + i / 30, { time: 'night' }, {}), 'back', bres);
    };
  }

  // ---- lab cells + bench (corridor)
  {
    const CV = [
      ['corridor down the length (t 1)', { x: 0.3, y: -2.2, z: 1.55, yaw: 0.02, f: 300, shift: 10 }, 1, {}],
      ['corridor ceiling break +0.35 s', { x: -0.6, y: 4.5, z: 1.4, yaw: 0.08, f: 340, shift: -40 }, 5.35, { ceilingBreakAt: 5 }],
      ['corridor after the break +2.5 s, extinguisher', { x: 1.0, y: 2.0, z: 1.3, yaw: -0.38, f: 320, shift: 0 }, 7.5, { ceilingBreakAt: 5 }],
      ['corridor: cabinet emptied (emptyAt)', { x: 0.1, y: 3.6, z: 1.3, yaw: 0.9, f: 360, shift: 10 }, 7.5, { ceilingBreakAt: 5, emptyAt: 2 }],
      ['corridor: extinguisher in place', { x: 0.1, y: 3.6, z: 1.3, yaw: 0.9, f: 360, shift: 10 }, 1, {}],
      ['corridor looking back to the end wall', { x: 0.2, y: 20, z: 1.6, yaw: PI + 0.03, f: 300, shift: 10 }, 2, {}],
    ];
    const cast = [['sukuna', 0.35, 9.5, 0, 'guard', 1, 'fight'], ['gojo', -0.3, 14.5, 0, 'guard', -1, 'fight']];
    for (const [label, cm, t, o] of CV) ROOMS.labCells.push({ set: 'corridor', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = ROOMS.mockS(t, 700 + t, { time: 'overcast', set: 'corridor' }, {});
      const r = HT.SETS.corridor.init(S.sc, o);
      HT.SETS.corridor.draw(g, c, S, 'back', r);
      ROOMS.labCast(g, c, cast, [-0.2, -0.9, 0.5], [0.2, 0.9]);
      HT.SETS.corridor.drawFront(g, c, S, r);
    } });
    let bres = null;
    ROOMS.benches.corridor = (g, i) => {
      bres = bres || HT.SETS.corridor.init(null, { ceilingBreakAt: 0.4 });
      const c = CAM.prep(CAM.make({ x: 0.3 * Math.sin(i * 0.05), y: -2 + i * 0.12, z: 1.5, yaw: 0.02 + 0.004 * i, f: 300, shift: 10 }));
      const S = ROOMS.mockS(i / 30, 700 + i / 30, { time: 'overcast' }, {});
      HT.SETS.corridor.draw(g, c, S, 'back', bres); HT.SETS.corridor.drawFront(g, c, S, bres);
    };
  }

  // ---- lab cells + bench (airport)
  {
    const AC = [
      ['airport wide toward the window (t 3)', { x: -1.0, y: -6.6, z: 1.65, yaw: 0.05, f: 300, shift: 30 }, 3, { takeoffAt: 1 }],
      ['airport bench + lotus planter, takeoff (t 9)', { x: 1.6, y: 1.2, z: 1.3, yaw: 0.28, f: 360, shift: 20 }, 9, { takeoffAt: 1 }],
      ['airport across the seats to the cafe', { x: -8.5, y: 4.5, z: 1.7, yaw: 2.1, f: 320, shift: 25 }, 5, {}],
      ['airport low push on the bench (t 14)', { x: -0.3, y: 2.1, z: 0.9, yaw: -0.05, f: 420, shift: 50 }, 14, { takeoffAt: 1 }],
      ['airport at the glass: parked plane + takeoff (t 6.5)', { x: 2.0, y: 7.4, z: 1.7, yaw: 0.35, f: 360, shift: 10 }, 6.5, { takeoffAt: 1 }],
      ['airport west wall: departure board', { x: 6, y: -2, z: 1.7, yaw: -1.75, f: 300, shift: 0 }, 4, {}],
      ['airport the cafe (east)', { x: 5.5, y: 0.5, z: 1.6, yaw: 2.0, f: 340, shift: 20 }, 4, {}],
    ];
    const cast = [['geto', -0.9, 5.15, 0, 'geto_sitWave', 1], ['gojo', 1.2, 3.8, 0, 'frontPockets', 1, 'uniform'], ['nanami', 3.2, 5.0, 0, 'nanami_stand', -1], ['haibara', 2.4, 5.6, 0, 'haibara_wave', -1], ['yaga', -3.3, 4.2, 0, 'yaga_stand', 1]];
    for (const [label, cm, t, o] of AC) ROOMS.labCells.push({ set: 'airport', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = ROOMS.mockS(t, 1100 + t, { time: 'airport', set: 'airport' }, {});
      const r = HT.SETS.airport.init(S.sc, o);
      HT.SETS.airport.draw(g, c, S, 'back', r);
      ROOMS.labCast(g, c, cast.filter(q => HT.rig.CHARS[q[0]]), [-0.6, -0.4, 0.7], [0.6, 0.4]);
      HT.SETS.airport.drawFront(g, c, S, r);
    } });
    let bres = null;
    ROOMS.benches.airport = (g, i) => {
      bres = bres || HT.SETS.airport.init(null, { takeoffAt: 0.2 });
      const c = CAM.prep(CAM.make({ x: -1 + i * 0.03, y: -6.4 + i * 0.05, z: 1.6, yaw: 0.05 + i * 0.002, f: 300, shift: 30 }));
      const S = ROOMS.mockS(i / 30, 1100 + i / 30, { time: 'airport' }, {});
      HT.SETS.airport.draw(g, c, S, 'back', bres); HT.SETS.airport.drawFront(g, c, S, bres);
    };
  }

  // ---- lab cells + bench (sky)
  {
    const SC = [
      ['sky: toward the sun over the deck (z 520)', { x: 150, y: -520, z: 520, yaw: -1.25, f: 380, shift: 60 }, 3, {}, 900],
      ['sky: looking down on the district (z 600)', { x: 0, y: -620, z: 600, yaw: 0.05, f: 360, shift: -170 }, 3, {}, 900],
      ['sky: low, below the deck (z 200), sun behind', { x: -100, y: -300, z: 200, yaw: -1.4, f: 420, shift: -20 }, 8, {}, 900],
      ['sky: away from the sun, lit deck tops (z 700)', { x: 200, y: -500, z: 700, yaw: 1.2, f: 400, shift: -40 }, 3, { cover: 0.5 }, 900],
    ];
    for (const [label, cm, t, clo, T] of SC) ROOMS.labCells.push({ set: 'sky', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = ROOMS.mockS(t, T + t, { time: 'sunset', set: 'sky', snow: 0.2 }, {});
      HT.SETS.sky.draw(g, c, S, 'back', HT.SETS.sky.init(S.sc, { clouds: Object.assign({}, clo) }));
      if (/toward/.test(label)) ROOMS.labCast(g, c, [['gojo', 150 + 22 * Math.sin(-1.25), -520 + 22 * Math.cos(-1.25), 520 - 2.5, 'float', 1, 'fight']], [-0.7, -0.25, 0.65], [0.7, 0.25]);
    } });
    let bres = null;
    ROOMS.benches.sky = (g, i) => {
      bres = bres || HT.SETS.sky.init(null, {});
      const c = CAM.prep(CAM.make({ x: 150 + i * 2, y: -520 + i, z: 520, yaw: -1.25 + i * 0.005, f: 380, shift: 60 }));
      HT.SETS.sky.draw(g, c, ROOMS.mockS(i / 30, 900 + i / 30, { time: 'sunset', snow: 0.2 }, {}), 'back', bres);
    };
  }

  // ---- lab cells: env 'shrine' on the street-level city renderer (Act II) + LIGHTS.shrine check
  {
    const SH = [
      ['city under the Shrine: the avenue east (T 220)', { x: 10, y: -3, z: 1.7, yaw: Math.PI / 2 - 0.12, f: 380, shift: 30 }],
      ['city under the Shrine: crane over the junction', { x: -30, y: -80, z: 40, yaw: 0.25, f: 420, shift: -60 }],
      ['city under the Shrine: low toward the towers', { x: 8, y: -10, z: 0.5, yaw: 0.3, f: 320, shift: 90 }],
    ];
    for (const [label, cm] of SH) ROOMS.labCells.push({ set: 'shrine', label, draw(g) {
      const c = CAM.prep(CAM.make(cm)), S = { T: 220, t: 0, env: { time: 'shrine', snow: 0.35 }, cam: c };
      HT.SETS.city.draw(g, c, S, 'back', { o: {} });
      const L = HT.fight && HT.fight.LIGHTS && HT.fight.LIGHTS.shrine;
      if (/avenue/.test(label)) ROOMS.labCast(g, c, [['sukuna', 34.5, 10, 0, 'guard', -1, 'fight'], ['gojo', 25.5, 10, 0, 'guard', 1, 'fight']], L ? L.light : [0.3, 0.6, 0.6], L ? [-L.light[0], -L.light[1]] : [-0.3, -0.6]);
    } });
    ROOMS.labCells.push({ set: 'tally', label: 'post tally: n = 0…5, strike-in frames (x2 zoom)', draw(g) {
      HT.rect(g, 0, 0, W, H, C.shadow);
      const cv = HT.canvas(W, H), S = { t: 0 };
      const states = [[0, 1], [1, 0.02], [1, 0.1], [1, 0.25], [2, 1], [3, 0.05], [4, 1], [5, 0.04], [5, 0.16], [5, 2]];
      states.forEach(([n, age], k) => {
        cv.g.fillStyle = k % 2 ? '#3a4f5c' : '#6b3e3e'; cv.g.fillRect(0, 0, W, H); // busy-ish backgrounds (the tally must read on both)
        for (let i = 0; i < 12; i++) HT.rect(cv.g, W - 60 + i * 5, 4 + (i % 3) * 7, 3, 3, i % 2 ? C.white : C.ink);
        HT.post.tally(cv.g, S, { n }, age, 3);
        const col = k % 5, row = floor(k / 5);
        g.drawImage(cv.c, W - 58, 0, 58, 26, 8 + col * 126, 40 + row * 90, 116, 52);
        HT.text(g, 'N=' + n + ' AGE ' + age, 10 + col * 126, 96 + row * 90, { font: 'tiny', col: C.foam });
      });
      // in context: a frame with the tally over the city
      const c = CAM.prep(CAM.make({ x: 10, y: -3, z: 1.7, yaw: Math.PI / 2 - 0.12, f: 380, shift: 30, vx: 0, vy: 0, vw: W, vh: H }));
      HT.SETS.city.draw(cv.g, c, { T: 220, t: 0, env: { time: 'shrine', snow: 0.35 }, cam: c }, 'back', { o: {} });
      HT.post.tally(cv.g, S, { n: 3 }, 1, 3);
      g.drawImage(cv.c, 0, 0, W, H, 8, 226, 224, 126);
    } });
  }

  // ---- lab: time strips (three moments of each set side by side, 1/3 scale) — the animation over time
  {
    const strip = (label, set, times, cam, o, env, castFn) => ROOMS.labCells.push({ set, label, draw(g) {
      HT.rect(g, 0, 0, W, H, C.shadow);
      const cv = HT.canvas(W, H), res = HT.SETS[set].init(null, o);
      times.forEach((t, k) => {
        const c = CAM.prep(CAM.make(typeof cam === 'function' ? cam(t) : cam)), S = ROOMS.mockS(t, 500 + t, env, { gojo: [-1.9, 0, 0], sukuna: [1.9, 0.2, 0] });
        cv.g.setTransform(1, 0, 0, 1, 0, 0); HT.rect(cv.g, 0, 0, W, H, C.ink);
        HT.SETS[set].draw(cv.g, c, S, 'back', res);
        if (castFn) castFn(cv.g, c, t);
        if (HT.SETS[set].drawFront) HT.SETS[set].drawFront(cv.g, c, S, res);
        g.drawImage(cv.c, 0, 0, W, H, 4 + k * 212, 60, 208, 117);
        HT.text(g, 'T=' + t, 6 + k * 212, 180, { font: 'tiny', col: C.foam });
      });
    } });
    strip('time strip: void ring spin, twinkle, glyph flow (t 0 / 3 / 6)', 'void', [0, 3, 6], { x: 0.3, y: -6, z: 1.5, yaw: 0.14, pitch: 0.22, f: 640 }, { glyphs: 12 }, { time: 'void' });
    strip('time strip: command feed + Yuji jumps at t 1 (t 0.5 / 1.3 / 2.2)', 'command', [0.5, 1.3, 2.2], { x: 0.1, y: -8.0, z: 1.5, yaw: 0.02, f: 440 }, { feed: { cam: t => ({ x: 36 + t * 6, y: -64, z: 24, yaw: -0.32 + t * 0.03, pitch: -0.2, f: 400 }), env: { time: 'overcast', snow: 0.3 }, T: 205 }, watchers: [{ who: 'yuji', x: -1.2, y: -3.2, pose: 'jump', t0: 1 }, { who: 'kusakabe', x: 1.3, y: -3.1, pose: 'sit' }] }, { time: 'night' });
    strip('time strip: ceiling break (+0.05 / +0.4 / +1.6 s)', 'corridor', [1.05, 1.4, 2.6], { x: 0.2, y: 5.2, z: 1.5, yaw: 0.05, f: 340, shift: -30 }, { ceilingBreakAt: 1 }, { time: 'overcast' });
    strip('time strip: takeoff (t 5 / 7 / 9.5)', 'airport', [5, 7, 9.5], { x: 0, y: 5, z: 1.6, yaw: -0.05, f: 300, shift: 10 }, { takeoffAt: 1 }, { time: 'airport' });
    strip('time strip: deck drift + rays (t 0 / 10 / 20)', 'sky', [0, 10, 20], { x: 150, y: -520, z: 520, yaw: -1.25, f: 380, shift: 60 }, {}, { time: 'sunset', snow: 0.2 });
  }

  ROOMS._internal = { bufFor, canvasFor, clipped, fxClip, pk, pkHex, rgbOf, smooth01, fbm3, vnoise3, voidRes };
})();

/* ------------------------------------------------------------------ ?lab=rooms — contact sheet of every set
   ?lab=rooms[&only=void,command,corridor,airport,sky,shrine,tally][&cols=3][&scale=1]  ·  HT.roomsBench([names]) → ms */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, CAM = HT.cam, W = HT.W, H = HT.H, ROOMS = HT.rooms;
  const mockS = (t, T, env, cast) => {
    const pos = cast || {};
    const names = Object.keys(pos);
    const S = { t, T, env, W, H, castNames: names, twos: false };
    S.at = (nm) => { const p = pos[nm] || [0, 0, 0]; return { x: p[0], y: p[1], z: p[2] || 0, h: 1.8, face: [1, 0] }; };
    S.pt = (ref) => { if (Array.isArray(ref)) return ref; const a = S.at(String(ref).split('.')[0]); return [a.x, a.y, a.z]; };
    S.sc = { id: 'lab', fightDef: { setOpts: {} }, C: { order: names, cast: Object.fromEntries(names.map(n => [n, { visibleAt: () => true }])), fx: [] } };
    return S;
  };
  ROOMS.mockS = mockS;
  // draw rig characters standing in a set (lab only): [[char, x, y, z, pose, face(+1/-1), costume]]
  ROOMS.labCast = (g, c, list, light, rim) => {
    const V = ROOMS.viewOf(c, false), items = [];
    for (const [ch, x, y, z, pose, face, costume] of list) { const p = CAM.project(c, x, y, z); if (p) items.push({ ch, p, pose, face, costume }); }
    items.sort((a, b) => b.p.d - a.p.d);
    for (const it of items) {
      const hgt = (HT.rig.CHARS[it.ch] || { height: 1.8 }).height * it.p.s;
      HT.alpha(g, 0.35, () => HT.ellipse(g, it.p.x, it.p.y, Math.max(2, hgt * 0.22), Math.max(1, hgt * 0.06), C.ink));
      HT.rig.draw(g, it.ch, it.p.x, it.p.y, HT.rig.POSES[it.pose] || HT.rig.POSES.stand, hgt, { face: it.face || 1, light: light || [0.1, -0.5, 0.85], rimDir: rim || [-0.1, 0.5], costume: it.costume });
    }
    void V;
  };
  HT.labs.rooms = Q => {
    const only = Q.get('only') ? Q.get('only').split(',') : null;
    const cells = ROOMS.labCells.filter(cl => !only || only.includes(cl.set));
    const off = HT.canvas(W, H), perf = [];
    const out = HT.sheet(cells.map(cl => ({ label: cl.label, draw(g) {
      off.g.setTransform(1, 0, 0, 1, 0, 0); off.g.globalAlpha = 1; off.g.fillStyle = '#000'; off.g.fillRect(0, 0, W, H);
      const a = performance.now(); cl.draw(off.g); perf.push([cl.label, +(performance.now() - a).toFixed(2)]);
      g.drawImage(off.c, 0, 0);
    } })), { cw: W, ch: H, cols: +(Q.get('cols') || 3), scale: +(Q.get('scale') || 1) });
    console.log('rooms lab ms', JSON.stringify(perf));
    return out;
  };
  // per-set frame cost: 30 frames of a moving camera (after 3 warm-up frames); mean / max / p90 ms of set.draw (+ a
  // 1-px readback so queued canvas work is included)
  HT.roomsBench = (names, n = 30) => {
    const off = HT.canvas(W, H), res = {};
    for (const nm of names || Object.keys(ROOMS.benches)) {
      const fn = ROOMS.benches[nm]; if (!fn) continue;
      for (let i = 0; i < 3; i++) { fn(off.g, i); off.g.getImageData(0, 0, 1, 1); }
      const ms = [];
      for (let i = 0; i < n; i++) { const a = performance.now(); fn(off.g, i + 3); off.g.getImageData(0, 0, 1, 1); ms.push(performance.now() - a); }
      ms.sort((a, b) => a - b);
      res[nm] = { mean: +(ms.reduce((a, b) => a + b, 0) / n).toFixed(2), p90: +ms[Math.floor(n * 0.9)].toFixed(2), max: +ms[n - 1].toFixed(2) };
    }
    return res;
  };
})();
