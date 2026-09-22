/* DOMAIN CLASH — effects library: techniques, domains, physical and graphic FX, post effects (speed · split ·
   shatter), weather (snow) and the FX labs (?lab=fx, ?lab=fx&name=<fx>&n=12, ?lab=post, ?lab=fxperf).

   API (SPEC.md §8)
     HT.FX[name] = { dur, layer, sfx?, sfxAt?, vol?, cues?(e), follow?, draw(ctx, age, e, S) }
       dur     seconds, or fn(e) → seconds (an event's e.dur always overrides)
       layer   'ground' | 'behind' | 'front', or an array of them: the effect draws one part per pass and reads the
               current pass from S.fxLayer (e.g. shockwave: ground ring in 'ground', far dust 'behind', near dust
               'front'). An event may override with e.layer (any name — a set may call fxDraw(…, 'sky')).
       sfx     default sound (SPEC §11 catalog) cued at e.t + sfxAt;  cues(e) → [{t (age), sfx, vol}] lists every
               cue of multi-cue effects (wheel clunks, purple charge + erase) — see HT.fxCues(e).
       follow  string refs (e.at/from/to/center/…) resolve at the current time (tracks a fighter) instead of e.t.
     HT.fxDraw(ctx, S, list, layer)  draws the active events of `list` whose layer matches.
     Every effect is a pure function of (age, e, S): randomness is seeded by e.seed (default: derived from e.t and
     the script index), time-varying detail is snapped to drawings on 2s (12/s) or 1s (30/s), never frame-counted.
     World-space FX project with S.project(x, y, z) → {x, y, s px/m, d} and size themselves by s (with minimum pixel
     sizes), so a 0.5 m Blue reads in a 30 px/m wide shot and in a 200 px/m close-up.
     Colour: solid shapes use exact palette colours; fades use dcol(col, a) — exact-palette Bayer masks aligned with
     the quantizer's matrix — so transparency is authentic ordered dither; glows are nested pattern discs (dither
     anchored to the frame, so moving glows never crawl; additive light would mix hues and band once quantized).
     Pixel-reading FX (lens pulls, ripples, haze, 2-tone bursts) touch ≤ 72k px each.  Large dithered fills are
     single path fills (a pattern fillRect per row costs ~1.4 µs); puffs, chunks, skulls, glyphs, galaxies and the
     nebula are cached sprites in bounded caches (HT.lru / capped Maps, listed in HT.caches).
   Canon notes: Infinity is invisible (only a shimmer where things stop); Blue pulls (lens + inward spirals); Red
   repels (outward rings); Purple = Blue + Red fused into an erasing sphere; Dismantle is a hairline flash; Cleave a
   web of cuts; Black Flash = black lightning with red; UV = outer space; Shrine = warped shrine on a skull heap, no
   barrier; the wheel turns one notch (45°) per adaptation; Ten Shadows spread like ink.  No gore anywhere.
   Photosensitivity: FX flashes are local and ≤ 3 frames; ?lab=fxperf runs a WCAG 2.3.1-style check (concurrent area
   > 25 % of a 10° field, 4×4-block luminance, Δ ≥ 0.1) — every effect scores ≤ 1 flash/s at the lab cameras.

   PARAMETERS (all optional unless marked *; world points may be refs: 'gojo', 'gojo.head|chest|hip|feet', 'mid',
   'contact'; every event also takes seed, dur, layer, follow, vol, sfx:false)
     hitSpark      at*, strength 1–3, dir [dx,dy(,dz)], size, scale, col               (no sfx: fight.js cues hits)
     blockSpark    at*, strength, dir, size, scale                                      (no sfx)
     infinityRipple at*, strength, dir, flat (ellipse ratio 1.9)                        (no sfx)
     infinityAura  who ('gojo'), intensity                                              sustained, follows
     blueOrb       at*, r (0.3 m), grow (0.28), end 'implode'|'none', pull (lens 0–1+), debris (n), tilt, crush
     redOrb        at*, dir, r (0.32 m), charge (0.42 s), range (7 m)
     redShot       path [[x,y,z]…] | from/to (+ curve m sideways, lift m up), travel (0.7 s), ease, r, trail, impact
     purple        mode 'burst'|'fire', at, r (burst 60 m | fire 2.5 m), r0, form (1.4 s), sep (2.4 m), phase, blue,
                   red, orb, grow, hold, fade; fire: from, to, travel (1.2 s)
     dismantle     from/to | at + len (m) + angle (rad); cuts (1), stagger (0.035 s), linger (s)
     cleave        at*, r (0.7 m), n (16), span (0.3 s)
     worldCut      x/y (screen) | at, angle (−0.38), grow (0.16 s)          → pair with post 'split'
     blackFlash    at*, dir, r (1.4 m), scale
     barrier       center|at*, r (12 m), state 'grow'|'hold', grow (1.2 s), pal {body,line,edge,hi,ring}
     barrierShatter center|at*, r, hit (impact point; default the top), crack (0.35 s), pal
     voidBloom     x/y | at, r (px; default fills the frame), grow (1.1 s), bh (px), bhx/bhy (offset), nebula (seed)
     shrineBloom   at* (Sukuna's feet), r (22 m pool), spread (1 s), back (7 m), h (20 m), rise (1.6 s), sky, slashes/s
     rctGlow       at | who (→ who.head), r (0.35 m), steam
     wheel         who (above the head, lift 0.5 m) | at; r (0.4 m), from, notch, turnAt [scene times] | turnIn
                   [ages] | first/every; mode 'halo'|'spin' (spinRate); tilt
     shadowPool    at*, r (2.2 m), grow (0.7 s), out (0.5 s), tendrils (7), wisps
     infoStream    at*, n (18 streams), speed, curl, reach (px)
     glyphRings    at*, r (1.2 m), rings (3), stagger (0.35 s), flat, col
     shockwave     at*, r (6 + 3·strength m), strength 1–3, z, air, dust, col
     dust          at*, n (8), r (1.2 m), size (0.38 m), rise, dir, col, alpha
     debris        at*, n (14), speed (8; < 0 = suction), size (0.35 m), dir, spread, up, g, bounce, mat, ground,
                   pull (point: suction into it), r (suction radius 4 m)
     glass         at*, n (26), speed (5), dir, size (0.24 m), drag, ground
     fire          at*, r (0.8 m), h (1.6 m), n (5), wind, embers
     smoke         at*, r (base 0.3 m), rate, life, rise, size, grow, dark (true), col, wind
     crater        at*, r (3 m), hold, n/speed/size/mat (debris), col (dust)
     speedLines    mode 'focus'|'parallel', x/y | at, angle, n (90), density, inner (px), len, width, col, fps
   dust palettes (col): concrete ash snow sand dark earth or [light, mid, shade, dark]; debris mats: concrete asphalt
   brick stone bone.  POST (HT.post.<name>(ctx, S, e, age, dur)): speed (as speedLines), split (x, y, angle, gap px,
   sep px, cut s, ease, bg, line, edge), shatter (x, y, crack s, rings, n, fall, bg).  HT.weather.snow(ctx, S,
   density, {wind, speed, layers, near, t}).  Helpers: HT.fxCues(e), HT.fxu (raster primitives), HT.fxLab. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const FX = (HT.FX = HT.FX || {});
  const POST = (HT.post = HT.post || {});
  const clamp = HT.clamp, lerp = HT.lerp, E = HT.E, hash = HT.hash;
  const sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
  const floor = Math.floor, ceil = Math.ceil, R = Math.round, PI = Math.PI, TAU = PI * 2, hypot = Math.hypot;
  const atan2 = Math.atan2, exp = Math.exp, pow = Math.pow;
  const sat = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const sm = x => { x = sat(x); return x * x * (3 - 2 * x); };
  const fr = a => floor(a * 30 + 1e-6);                  // 30 fps frame index of an age
  const on2 = a => floor(a * 12 + 1e-6) / 12;            // age snapped to drawings on 2s
  const h1 = (i, s) => hash(i, s);                       // [0, 1)
  const h2 = (i, s) => hash(i, s) * 2 - 1;               // [-1, 1)
  const num = (v, d) => (v === undefined || v === null ? d : v);
  const envl = (age, dur, a, b) => sat(min(a > 0 ? age / a : 1, b > 0 ? (dur - age) / b : 1));

  // ================================================================== clip / transform state (set per fxDraw call)
  let CX0 = 0, CY0 = 0, CX1 = W - 1, CY1 = H - 1, VX0 = 0, VY0 = 0, VX1 = W - 1, VY1 = H - 1, TX = 0, TY = 0, PURE = true;
  function setClip(ctx, S) {
    const cv = ctx.canvas, cw = cv ? cv.width : W, ch = cv ? cv.height : H;
    let m = null;
    try { m = ctx.getTransform(); } catch (err) { m = null; }
    PURE = !m || (m.a === 1 && m.d === 1 && m.b === 0 && m.c === 0);
    TX = PURE && m ? m.e : 0; TY = PURE && m ? m.f : 0;
    if (PURE) { CX0 = -TX; CY0 = -TY; CX1 = cw - 1 - TX; CY1 = ch - 1 - TY; }
    else { CX0 = -W; CY0 = -H; CX1 = 2 * W; CY1 = 2 * H; }
    VX0 = CX0; VY0 = CY0; VX1 = CX1; VY1 = CY1;
    const c = S && S.cam;
    if (c && c.vw) { VX0 = max(VX0, c.vx || 0); VY0 = max(VY0, c.vy || 0); VX1 = min(VX1, (c.vx || 0) + c.vw - 1); VY1 = min(VY1, (c.vy || 0) + (c.vh || H) - 1); }
  }

  // ================================================================== colour helpers
  const RGB = new Map();
  const rgb = hx => { let v = RGB.get(hx); if (!v) { v = HT.rgb(hx); RGB.set(hx, v); } return v; };
  const rgba = (hx, a) => { const c = rgb(hx); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const PATS = new Map(), patG = HT.canvas(4, 4).g, PATINFO = new WeakMap(); // pattern → [colour, Bayer level]
  HT.caches.push({ name: 'fx.patterns', size: () => PATS.size });
  // exact-palette dithered transparency: a fill style painting `col` on round(a·16) of every 16 pixels (Bayer 4×4,
  // aligned with the quantizer), null when invisible. Solid when a ≥ 0.97.
  function dcol(col, a) {
    if (!col) return null;
    if (typeof col !== 'string') return col;
    const lvl = R(a * 16);
    if (lvl <= 0) return null;
    if (lvl >= 16) return col;
    const key = col + lvl;
    let p = PATS.get(key);
    if (!p) {
      const t = HT.canvas(4, 4);
      t.g.fillStyle = col;
      for (let i = 0; i < 16; i++) if (HT.BAYER[i] < lvl) t.g.fillRect(i & 3, i >> 2, 1, 1);
      p = patG.createPattern(t.c, 'repeat');
      if (PATS.size > 1500) PATS.clear();
      PATS.set(key, p);
      PATINFO.set(p, [col, lvl]);
    }
    return p;
  }

  // ================================================================== raster primitives (crisp, clipped)
  const XS = new Float64Array(2048);
  // scanline fill of closed contours (flat [x0,y0,x1,y1,…]), even-odd rule, clipped to the canvas
  function fillPolys(ctx, cs, col) {
    if (!col) return;
    let y0 = Infinity, y1 = -Infinity;
    for (let c = 0; c < cs.length; c++) { const P = cs[c]; if (!P) continue; for (let i = 1; i < P.length; i += 2) { const y = P[i]; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    const ya = max(ceil(CY0), ceil(y0 - 0.5)), yb = min(floor(CY1), floor(y1 - 0.5));
    if (!(yb >= ya)) return;
    const xa = ceil(CX0), xb = floor(CX1);
    ctx.fillStyle = col;
    if (typeof col !== 'string' && yb - ya > 40) { // big dithered/gradient fills: one even-odd path fill instead of a call per row
      ctx.beginPath();
      for (let c = 0; c < cs.length; c++) { const P = cs[c]; if (!P || P.length < 6) continue; ctx.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) ctx.lineTo(P[i], P[i + 1]); ctx.closePath(); }
      ctx.fill('evenodd');
      return;
    }
    for (let y = ya; y <= yb; y++) {
      const sy = y + 0.5;
      let n = 0;
      for (let c = 0; c < cs.length; c++) {
        const P = cs[c];
        if (!P || P.length < 6) continue;
        const m = P.length;
        for (let i = 0, j = m - 2; i < m; j = i, i += 2) {
          const yi = P[i + 1], yj = P[j + 1];
          if ((yi <= sy) !== (yj <= sy) && n < 2048) XS[n++] = P[i] + ((sy - yi) / (yj - yi)) * (P[j] - P[i]);
        }
      }
      for (let a = 1; a < n; a++) { const v = XS[a]; let b = a - 1; while (b >= 0 && XS[b] > v) { XS[b + 1] = XS[b]; b--; } XS[b + 1] = v; }
      for (let k = 0; k + 1 < n; k += 2) {
        let a = ceil(XS[k] - 0.5), b = floor(XS[k + 1] - 0.5);
        if (a < xa) a = xa;
        if (b > xb) b = xb;
        if (b >= a) ctx.fillRect(a, y, b - a + 1, 1);
      }
    }
  }
  const fillPoly = (ctx, P, col) => fillPolys(ctx, [P], col);
  function disc(ctx, cx, cy, r, col) {
    if (!col || !(r > 0)) return;
    if (cx + r < CX0 || cx - r > CX1 + 1 || cy + r < CY0 || cy - r > CY1 + 1) return;
    if (r > 150 || (r > 28 && typeof col !== 'string')) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(R(cx) + 0.5, R(cy) + 0.5, r + 0.5, 0, TAU); ctx.fill(); return; } // dithered: 1 call
    cx = R(cx); cy = R(cy);
    const ri = R(r), rr = (ri + 0.5) * (ri + 0.5);
    const ya = max(-ri, ceil(CY0) - cy), yb = min(ri, floor(CY1) - cy);
    ctx.fillStyle = col;
    for (let y = ya; y <= yb; y++) { const h = floor(sqrt(rr - y * y)); ctx.fillRect(cx - h, cy + y, 2 * h + 1, 1); }
  }
  function ellipse(ctx, cx, cy, rx, ry, col) {
    if (!col || !(rx > 0) || !(ry > 0)) return;
    if (cx + rx < CX0 || cx - rx > CX1 + 1 || cy + ry < CY0 || cy - ry > CY1 + 1) return;
    cx = R(cx); cy = R(cy);
    const ryi = R(ry), ya = max(-ryi, ceil(CY0) - cy), yb = min(ryi, floor(CY1) - cy);
    ctx.fillStyle = col;
    for (let y = ya; y <= yb; y++) { const t = y / (ryi + 0.5); const h = R(rx * sqrt(max(0, 1 - t * t))); ctx.fillRect(cx - h, cy + y, 2 * h + 1, 1); }
  }
  // ring band between radii r0 < r1 (px), vertical squash k
  function annulus(ctx, cx, cy, r0, r1, col, k) {
    k = k || 1;
    if (!col || !(r1 > 0.5) || !(r1 > r0)) return;
    const ry1 = r1 * k;
    if (cx + r1 < CX0 || cx - r1 > CX1 + 1 || cy + ry1 < CY0 || cy - ry1 > CY1 + 1) return;
    if (r0 < 0) r0 = 0;
    if (r1 > 260 || (r1 > 28 && typeof col !== 'string')) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, r1, ry1, 0, 0, TAU); if (r0 > 0) ctx.ellipse(cx, cy, r0, r0 * k, 0, 0, TAU); ctx.fill('evenodd'); return; }
    cx = R(cx); cy = R(cy);
    const ry0 = r0 * k, Y = floor(ry1 + 0.5);
    const ya = max(-Y, ceil(CY0) - cy), yb = min(Y, floor(CY1) - cy);
    ctx.fillStyle = col;
    for (let y = ya; y <= yb; y++) {
      const v = y / ry1;
      if (v * v > 1) continue;
      const ho = floor(r1 * sqrt(1 - v * v) + 0.5);
      if (ry0 > 0.5 && abs(y) < ry0) {
        const w = y / ry0;
        let hi = floor(r0 * sqrt(1 - w * w) + 0.5);
        if (hi >= ho) hi = ho - 1;
        if (hi < 0) { ctx.fillRect(cx - ho, cy + y, 2 * ho + 1, 1); continue; }
        ctx.fillRect(cx - ho, cy + y, ho - hi, 1);
        ctx.fillRect(cx + hi + 1, cy + y, ho - hi, 1);
      } else ctx.fillRect(cx - ho, cy + y, 2 * ho + 1, 1);
    }
  }
  // 1-px circle (midpoint); dithered colours plot only their Bayer pixels with a solid fill (no pattern per pixel)
  function ring1(ctx, cx, cy, r, col) {
    if (!col || !(r >= 0.5)) return;
    if (cx + r < CX0 || cx - r > CX1 + 1 || cy + r < CY0 || cy - r > CY1 + 1) return;
    let lvl = 16, solid = col;
    if (typeof col !== 'string') { const inf = PATINFO.get(col); if (!inf) { annulus(ctx, cx, cy, r - 0.5, r + 0.5, col); return; } solid = inf[0]; lvl = inf[1]; }
    cx = R(cx); cy = R(cy); r = R(r);
    ctx.fillStyle = solid;
    const B = HT.BAYER, P = (x, y) => { if (lvl >= 16 || B[((y & 3) << 2) | (x & 3)] < lvl) ctx.fillRect(x, y, 1, 1); };
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      P(cx + x, cy + y); P(cx + y, cy + x); P(cx - y, cy + x); P(cx - x, cy + y);
      P(cx - x, cy - y); P(cx - y, cy - x); P(cx + y, cy - x); P(cx + x, cy - y);
      y++;
      if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  }
  const CL = new Float64Array(4);
  function clipSeg(x0, y0, x1, y1, pad) {
    pad = pad || 2;
    const dx = x1 - x0, dy = y1 - y0;
    if (!(dx === dx && dy === dy && x0 === x0 && y0 === y0)) return false;
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 4; i++) {
      const p = i === 0 ? -dx : i === 1 ? dx : i === 2 ? -dy : dy;
      const q = i === 0 ? x0 - (CX0 - pad) : i === 1 ? CX1 + pad - x0 : i === 2 ? y0 - (CY0 - pad) : CY1 + pad - y0;
      if (p === 0) { if (q < 0) return false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    CL[0] = x0 + t0 * dx; CL[1] = y0 + t0 * dy; CL[2] = x0 + t1 * dx; CL[3] = y0 + t1 * dy;
    return true;
  }
  function line(ctx, x0, y0, x1, y1, col) {
    if (!col || !clipSeg(x0, y0, x1, y1)) return;
    let lvl = 16, solid = col;
    if (typeof col !== 'string') { const inf = PATINFO.get(col); if (!inf) { HT.line(ctx, CL[0], CL[1], CL[2], CL[3], col); return; } solid = inf[0]; lvl = inf[1]; }
    let ax = R(CL[0]), ay = R(CL[1]);
    const bx = R(CL[2]), by = R(CL[3]), dx = abs(bx - ax), dy = -abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1, B = HT.BAYER;
    ctx.fillStyle = solid;
    let err = dx + dy, n = 0;
    if (lvl >= 16) { // solid: batch runs along the major axis
      const horiz = dx >= -dy;
      let rx = ax, ry = ay, len = 0;
      for (;;) {
        if (len === 0) { rx = ax; ry = ay; len = 1; }
        else if (horiz ? ay === ry : ax === rx) len++;
        else { if (horiz) ctx.fillRect(sx > 0 ? rx : rx - len + 1, ry, len, 1); else ctx.fillRect(rx, sy > 0 ? ry : ry - len + 1, 1, len); rx = ax; ry = ay; len = 1; }
        if ((ax === bx && ay === by) || ++n > 4000) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; ax += sx; }
        if (e2 <= dx) { err += dx; ay += sy; }
      }
      if (len) { if (horiz) ctx.fillRect(sx > 0 ? rx : rx - len + 1, ry, len, 1); else ctx.fillRect(rx, sy > 0 ? ry : ry - len + 1, 1, len); }
      return;
    }
    // dithered: runs of ≥ 3 px become one pattern-filled span; shorter runs plot their Bayer pixels in solid colour
    const horiz = dx >= -dy, flush = (rx, ry, len) => {
      if (len >= 3) { ctx.fillStyle = col; if (horiz) ctx.fillRect(sx > 0 ? rx : rx - len + 1, ry, len, 1); else ctx.fillRect(rx, sy > 0 ? ry : ry - len + 1, 1, len); ctx.fillStyle = solid; return; }
      for (let k = 0; k < len; k++) { const X = horiz ? rx + k * sx : rx, Y = horiz ? ry : ry + k * sy; if (B[((Y & 3) << 2) | (X & 3)] < lvl) ctx.fillRect(X, Y, 1, 1); }
    };
    let rx = ax, ry = ay, len = 0;
    for (;;) {
      if (len === 0) { rx = ax; ry = ay; len = 1; }
      else if (horiz ? ay === ry : ax === rx) len++;
      else { flush(rx, ry, len); rx = ax; ry = ay; len = 1; }
      if ((ax === bx && ay === by) || ++n > 4000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
    if (len) flush(rx, ry, len);
  }
  function thick(ctx, x0, y0, x1, y1, w, col) {
    if (!col) return;
    if (w < 1.5) { line(ctx, x0, y0, x1, y1, col); return; }
    if (clipSeg(x0, y0, x1, y1, w + 2)) HT.thick(ctx, CL[0], CL[1], CL[2], CL[3], R(w), col);
  }
  // tapered stroke as a crisp filled quad (w0 at the start, w1 at the end); thin strokes fall back to lines
  function taper(ctx, x0, y0, x1, y1, w0, w1, col) {
    if (!col) return;
    if (max(w0, w1) < 1.6) { line(ctx, x0, y0, x1, y1, col); return; }
    const dx = x1 - x0, dy = y1 - y0, L = hypot(dx, dy);
    if (!(L > 0.3)) { disc(ctx, x0, y0, max(w0, w1) / 2, col); return; }
    const nx = -dy / L, ny = dx / L, a = w0 / 2, b = w1 / 2;
    fillPoly(ctx, [x0 + nx * a, y0 + ny * a, x1 + nx * b, y1 + ny * b, x1 - nx * b, y1 - ny * b, x0 - nx * a, y0 - ny * a], col);
    line(ctx, x0, y0, x1, y1, col);
  }
  function polyline(ctx, P, col, closed) {
    if (!col || !P) return;
    const n = P.length;
    for (let i = 0; i + 3 < n; i += 2) line(ctx, P[i], P[i + 1], P[i + 2], P[i + 3], col);
    if (closed && n >= 6) line(ctx, P[n - 2], P[n - 1], P[0], P[1], col);
  }
  function sq(ctx, x, y, s, col) {
    if (!col) return;
    const k = max(1, R(s));
    const X = R(x - (k - 1) / 2), Y = R(y - (k - 1) / 2);
    if (X + k < CX0 || X > CX1 + 1 || Y + k < CY0 || Y > CY1 + 1) return;
    ctx.fillStyle = col; ctx.fillRect(X, Y, k, k);
  }
  function sparkle(ctx, x, y, arm, col, core) {
    if (!col || arm < 0) return;
    x = R(x); y = R(y);
    if (x + arm < CX0 || x - arm > CX1 || y + arm < CY0 || y - arm > CY1) return;
    ctx.fillStyle = col;
    ctx.fillRect(x - arm, y, 2 * arm + 1, 1); ctx.fillRect(x, y - arm, 1, 2 * arm + 1);
    if (core && arm >= 3) { ctx.fillStyle = core; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
  }
  // exact-palette dithered glow: nested Bayer discs (sparse outside → dense inside). Additive gradients mix hues
  // (red over teal → olive) and band into rainbows once quantized, so glows stay in the effect's own colour.
  function glow(ctx, x, y, r, col, a) { // three nested pattern discs: frame-aligned dither, so moving/growing glows never crawl
    if (!(r >= 1) || !(a > 0.02)) return;
    if (x + r < CX0 || x - r > CX1 || y + r < CY0 || y - r > CY1) return;
    a = min(1, a);
    disc(ctx, x, y, r, dcol(col, a * 0.3));
    disc(ctx, x, y, r * 0.68, dcol(col, a * 0.55));
    disc(ctx, x, y, r * 0.42, dcol(col, a * 0.85));
  }
  function aglow(ctx, x, y, r, col, a) { // additive light (only over dark, near-neutral backgrounds)
    if (!(r >= 1) || !(a > 0.01)) return;
    if (x + r < CX0 || x - r > CX1 || y + r < CY0 || y - r > CY1) return;
    HT.glow(ctx, x, y, r, col, min(1, a));
  }
  // soft source-over radial falloff (darkening / tinting)
  function shade(ctx, x, y, r, col, a, inner) {
    if (!(r >= 1) || !(a > 0.01)) return;
    const c = rgb(col), g = ctx.createRadialGradient(x, y, r * (inner || 0), x, y, r);
    g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
    ctx.fillStyle = g;
    const x0 = max(CX0, x - r), y0 = max(CY0, y - r), x1 = min(CX1 + 1, x + r), y1 = min(CY1 + 1, y + r);
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // jagged bolt (midpoint displacement) from (x0,y0) to (x1,y1) → flat xy array
  function bolt(x0, y0, x1, y1, rough, levels, rng) {
    let P = [x0, y0, x1, y1];
    for (let l = 0; l < levels; l++) {
      const N = [];
      for (let i = 0; i + 3 < P.length; i += 2) {
        const ax = P[i], ay = P[i + 1], bx = P[i + 2], by = P[i + 3], dx = bx - ax, dy = by - ay, L = hypot(dx, dy) || 1;
        const off = (rng() - 0.5) * rough * L, t = 0.35 + 0.3 * rng();
        N.push(ax, ay, ax + dx * t - (dy / L) * off, ay + dy * t + (dx / L) * off);
      }
      N.push(P[P.length - 2], P[P.length - 1]);
      P = N;
    }
    return P;
  }
  // draw a bolt polyline tapering from w0 to w1
  function boltDraw(ctx, P, w0, w1, col) {
    const n = P.length / 2 - 1;
    for (let i = 0; i < n; i++) { const w = lerp(w0, w1, i / max(1, n - 1)); thick(ctx, P[2 * i], P[2 * i + 1], P[2 * i + 2], P[2 * i + 3], w, col); }
  }

  // ================================================================== pixel-reading warps (lens, ripples, haze)
  let WBUF = new Uint32Array(16384), LUT = new Float32Array(1024);
  const WMAX = 72000;
  // Radial remap around (cx, cy) within radius Rr: the destination pixel at distance d samples the source at map(d)
  // along the same ray. Anisotropy {ux, uy, k}: distances along (ux, uy) are multiplied by k (elliptical rings).
  function warp(ctx, cx, cy, Rr, map, o) {
    if (!PURE || !(Rr >= 3)) return false;
    let x0 = floor(cx - Rr), y0 = floor(cy - Rr), x1 = ceil(cx + Rr), y1 = ceil(cy + Rr);
    x0 = max(x0, ceil(VX0)); y0 = max(y0, ceil(VY0)); x1 = min(x1, floor(VX1) + 1); y1 = min(y1, floor(VY1) + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2 || w * h > WMAX) return false;
    const img = ctx.getImageData(x0 + TX, y0 + TY, w, h), d32 = new Uint32Array(img.data.buffer), n = w * h;
    if (WBUF.length < n) WBUF = new Uint32Array(n);
    WBUF.set(d32);
    const N = ceil(Rr * 2) + 2;
    if (LUT.length < N) LUT = new Float32Array(N * 2);
    for (let k = 0; k < N; k++) { const d = max(0.35, k * 0.5); LUT[k] = map(d) / d; }
    const aniso = o && o.k && o.k !== 1, ux = o ? o.ux : 1, uy = o ? o.uy : 0, kk = o ? o.k : 1;
    for (let yy = 0; yy < h; yy++) {
      const py = y0 + yy + 0.5 - cy, row = yy * w;
      for (let xx = 0; xx < w; xx++) {
        const px = x0 + xx + 0.5 - cx;
        let dd;
        if (aniso) { const a = (px * ux + py * uy) * kk, b = -px * uy + py * ux; dd = sqrt(a * a + b * b); } else dd = sqrt(px * px + py * py);
        if (dd >= Rr) continue;
        const r = LUT[(dd * 2) | 0];
        let sx = floor(cx + px * r - x0), sy = floor(cy + py * r - y0);
        if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
        if (sy < 0) sy = 0; else if (sy >= h) sy = h - 1;
        d32[row + xx] = WBUF[sy * w + sx];
      }
    }
    ctx.putImageData(img, x0 + TX, y0 + TY);
    return true;
  }
  // heat-haze: horizontal row wobble inside an elliptical shell (normalised radius inner..1)
  function haze(ctx, cx, cy, rx, ry, inner, amp, phase) {
    if (!PURE || amp < 0.5 || rx < 3 || ry < 3) return;
    let x0 = floor(cx - rx), y0 = floor(cy - ry), x1 = ceil(cx + rx), y1 = ceil(cy + ry);
    x0 = max(x0, ceil(VX0)); y0 = max(y0, ceil(VY0)); x1 = min(x1, floor(VX1) + 1); y1 = min(y1, floor(VY1) + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2 || w * h > WMAX) return;
    const img = ctx.getImageData(x0 + TX, y0 + TY, w, h), d32 = new Uint32Array(img.data.buffer);
    if (WBUF.length < w * h) WBUF = new Uint32Array(w * h);
    WBUF.set(d32);
    for (let yy = 0; yy < h; yy++) {
      const py = (y0 + yy + 0.5 - cy) / ry, row = yy * w;
      const sh = sin((y0 + yy) * 0.55 + phase) * amp;
      for (let xx = 0; xx < w; xx++) {
        const px = (x0 + xx + 0.5 - cx) / rx, rr = sqrt(px * px + py * py);
        if (rr >= 1 || rr <= inner) continue;
        const band = sin(PI * (rr - inner) / (1 - inner));
        const dx = R(sh * band);
        if (!dx) continue;
        let sx = xx - dx; if (sx < 0) sx = 0; else if (sx >= w) sx = w - 1;
        d32[row + xx] = WBUF[row + sx];
      }
    }
    ctx.putImageData(img, x0 + TX, y0 + TY);
  }
  // 2-tone threshold inside a polygon (Black Flash): luma > th → hi, else lo
  function twoTone(ctx, P, lo, hi, th) {
    if (!PURE) return;
    let xmn = Infinity, xmx = -Infinity, ymn = Infinity, ymx = -Infinity;
    for (let i = 0; i < P.length; i += 2) { xmn = min(xmn, P[i]); xmx = max(xmx, P[i]); ymn = min(ymn, P[i + 1]); ymx = max(ymx, P[i + 1]); }
    const x0 = max(floor(xmn), ceil(VX0)), y0 = max(floor(ymn), ceil(VY0)), x1 = min(ceil(xmx), floor(VX1) + 1), y1 = min(ceil(ymx), floor(VY1) + 1);
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2 || w * h > WMAX) return;
    const img = ctx.getImageData(x0 + TX, y0 + TY, w, h), d = img.data;
    const L = rgb(lo), Hc = rgb(hi), m = P.length;
    for (let yy = 0; yy < h; yy++) {
      const sy = y0 + yy + 0.5;
      let n = 0;
      for (let i = 0, j = m - 2; i < m; j = i, i += 2) {
        const yi = P[i + 1], yj = P[j + 1];
        if ((yi <= sy) !== (yj <= sy)) XS[n++] = P[i] + ((sy - yi) / (yj - yi)) * (P[j] - P[i]);
      }
      for (let a = 1; a < n; a++) { const v = XS[a]; let b = a - 1; while (b >= 0 && XS[b] > v) { XS[b + 1] = XS[b]; b--; } XS[b + 1] = v; }
      for (let k = 0; k + 1 < n; k += 2) {
        const a = max(x0, ceil(XS[k] - 0.5)), b = min(x1 - 1, floor(XS[k + 1] - 0.5));
        for (let x = a; x <= b; x++) {
          const q = (yy * w + (x - x0)) * 4, l = d[q] * 0.299 + d[q + 1] * 0.587 + d[q + 2] * 0.114, c = l > th ? Hc : L;
          d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, x0 + TX, y0 + TY);
  }

  // ================================================================== projection helpers
  function camOf(S) { const c = S.cam; if (c && !c._prepped) HT.cam.prep(c); return c; }
  const pj = (S, p) => (p ? S.project(p[0], p[1], p[2] || 0) : null);
  function toCam(c, x, y, z, o, k) {
    const dx = x - c.x, dy = y - c.y, dz = z - c.z;
    const xr = dx * c._cy - dy * c._sy, yf = dx * c._sy + dy * c._cy;
    o[k] = xr; o[k + 1] = -yf * c._sp + dz * c._cp; o[k + 2] = yf * c._cp + dz * c._sp;
  }
  function camScr(c, r, u, d, o, k) {
    const f = c.f / d;
    let px = r * f, py = -u * f;
    if (c.roll) { const rx = px * c._cr - py * c._sr, ry = px * c._sr + py * c._cr; px = rx; py = ry; }
    o[k] = c._hx + px; o[k + 1] = c._hy + py;
    return f;
  }
  const NEARC = 0.15;
  // project a closed 3D polygon (flat xyz) with near-plane clipping → flat xy array (possibly empty)
  function projPoly(S, P3) {
    const c = camOf(S), n = (P3.length / 3) | 0, cs = new Float64Array(n * 3), out = [], tmp = [0, 0];
    for (let i = 0; i < n; i++) toCam(c, P3[3 * i], P3[3 * i + 1], P3[3 * i + 2], cs, 3 * i);
    for (let i = 0; i < n; i++) {
      const a = 3 * i, b = 3 * ((i + 1) % n), da = cs[a + 2], db = cs[b + 2], ia = da >= NEARC, ib = db >= NEARC;
      if (ia) { camScr(c, cs[a], cs[a + 1], da, tmp, 0); out.push(tmp[0], tmp[1]); }
      if (ia !== ib) { const t = (NEARC - da) / (db - da); camScr(c, cs[a] + (cs[b] - cs[a]) * t, cs[a + 1] + (cs[b + 1] - cs[a + 1]) * t, NEARC, tmp, 0); out.push(tmp[0], tmp[1]); }
    }
    return out;
  }
  // world segment → screen [x0,y0,x1,y1] with near clipping (null if fully behind)
  function projSeg(S, a, b) {
    const c = camOf(S), A = [0, 0, 0], B = [0, 0, 0], o = [0, 0, 0, 0];
    toCam(c, a[0], a[1], a[2] || 0, A, 0); toCam(c, b[0], b[1], b[2] || 0, B, 0);
    if (A[2] < NEARC && B[2] < NEARC) return null;
    if (A[2] < NEARC) { const t = (NEARC - A[2]) / (B[2] - A[2]); for (let k = 0; k < 3; k++) A[k] += (B[k] - A[k]) * t; }
    if (B[2] < NEARC) { const t = (NEARC - B[2]) / (A[2] - B[2]); for (let k = 0; k < 3; k++) B[k] += (A[k] - B[k]) * t; }
    camScr(c, A[0], A[1], A[2], o, 0); camScr(c, B[0], B[1], B[2], o, 2);
    return o;
  }
  function circle3(cx, cy, cz, r, n, fn) {
    const P = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = fn ? fn(a, i) : 1; P[3 * i] = cx + cos(a) * r * k; P[3 * i + 1] = cy + sin(a) * r * k; P[3 * i + 2] = cz; }
    return P;
  }
  function heading3(d) { const x = d[0] || 0, y = d[1] || 0, z = d[2] || 0, L = hypot(x, y, z) || 1; return [x / L, y / L, z / L]; }
  // two unit vectors perpendicular to d (and to each other)
  function perp(d) {
    let ax = d[1], ay = -d[0], az = 0, L = hypot(ax, ay);
    if (L < 1e-3) { ax = 1; ay = 0; L = 1; }
    ax /= L; ay /= L;
    return [ax, ay, az, ay * d[2] - az * d[1], az * d[0] - ax * d[2], ax * d[1] - ay * d[0]];
  }
  function ring3(c, d, r, n) {
    const B = perp(d), P = new Float64Array(n * 3);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, ca = cos(a) * r, sa = sin(a) * r; P[3 * i] = c[0] + B[0] * ca + B[3] * sa; P[3 * i + 1] = c[1] + B[1] * ca + B[4] * sa; P[3 * i + 2] = c[2] + B[2] * ca + B[5] * sa; }
    return P;
  }
  // screen direction of a world heading at a point → [ux, uy, px length of `len` m]
  function sdir(S, at, dir, len) {
    len = len || 0.5;
    const p0 = S.project(at[0], at[1], at[2] || 0), p1 = S.project(at[0] + (dir[0] || 0) * len, at[1] + (dir[1] || 0) * len, (at[2] || 0) + (dir[2] || 0) * len);
    if (!p0 || !p1) return [1, 0, 0];
    const x = p1.x - p0.x, y = p1.y - p0.y, L = hypot(x, y);
    if (L < 0.5) return [dir[0] >= 0 ? 1 : -1, 0, L];
    return [x / L, y / L, L];
  }
  // camera basis in world space
  function basis(S) {
    const c = camOf(S), cy = cos(c.yaw), sy = sin(c.yaw), cp = cos(c.pitch), sp = sin(c.pitch);
    return { r: [cy, -sy, 0], u: [-sy * sp, -cy * sp, cp], f: [sy * cp, cy * cp, sp] };
  }
  // screen disc of a world sphere: {x, y, rho} | {inside:true} | null
  function sphereScr(S, x, y, z, r) {
    const c = camOf(S), dx = x - c.x, dy = y - c.y, dz = z - c.z, d = sqrt(dx * dx + dy * dy + dz * dz);
    if (d <= r * 1.002) return { inside: true, d };
    const p = S.project(x, y, z);
    if (!p) return null;
    return { x: p.x, y: p.y, rho: (c.f * r) / sqrt(d * d - r * r), s: p.s, d: p.d, inside: false };
  }
  function hull(P) { // convex hull of a flat xy point list → flat xy (counter-clockwise)
    const n = P.length / 2, idx = [];
    for (let i = 0; i < n; i++) idx.push(i);
    idx.sort((a, b) => P[2 * a] - P[2 * b] || P[2 * a + 1] - P[2 * b + 1]);
    const cr = (o, a, b) => (P[2 * a] - P[2 * o]) * (P[2 * b + 1] - P[2 * o + 1]) - (P[2 * a + 1] - P[2 * o + 1]) * (P[2 * b] - P[2 * o]);
    const lo = [], up = [];
    for (const i of idx) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], i) <= 0) lo.pop(); lo.push(i); }
    for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], i) <= 0) up.pop(); up.push(i); }
    up.pop(); lo.pop();
    const out = [];
    for (const i of lo.concat(up)) out.push(P[2 * i], P[2 * i + 1]);
    return out;
  }

  // ================================================================== reference resolution, seeds, the drawer
  const REFS = ['at', 'from', 'to', 'center', 'target', 'hit', 'path', 'blue', 'red', 'pull'];
  function resolveRef(S, ref, t, e) {
    if (ref === undefined || ref === null) return ref;
    if (Array.isArray(ref)) {
      if (ref.length && typeof ref[0] !== 'number') return ref.map(r => resolveRef(S, r, t, e));
      return ref.length < 3 ? [ref[0] || 0, ref[1] || 0, 0] : ref;
    }
    if (typeof ref === 'string') {
      if (ref === 'contact') {
        const cs = S.sc && S.sc.C && S.sc.C.contacts;
        let best = null, bd = 1e9;
        if (cs) for (const c of cs) { const d = abs(c.t - e.t); if (d < bd) { bd = d; best = c; } }
        return best ? best.at : [0, 0, 1];
      }
      return S.pt ? S.pt(ref, t) : [0, 0, 0];
    }
    return ref;
  }
  const NAMEH = {};
  function seedOf(e) {
    let h = NAMEH[e.fx];
    if (h === undefined) { h = 7; for (const ch of String(e.fx)) h = (h * 31 + ch.charCodeAt(0)) | 0; NAMEH[e.fx] = h; }
    return (Math.imul(R((e.t || 0) * 1000), 40503) + Math.imul(e._i || 0, 2654435) + h) | 0;
  }
  function durOf(F, e) { if (e.dur !== undefined) return e.dur; return typeof F.dur === 'function' ? F.dur(e) : F.dur || 1; }
  HT.fxDur = e => { const F = FX[e.fx]; return F ? durOf(F, e) : (e.dur || 60); }; // an event's effective duration
  function viewOf(e, F, S, dur) {
    const v = Object.create(e);
    v.dur = dur;
    v.seed = e.seed !== undefined ? e.seed : seedOf(e);
    const tt = (e.follow !== undefined ? e.follow : F.follow) ? S.t : e.t;
    for (let i = 0; i < REFS.length; i++) { const k = REFS[i]; if (e[k] !== undefined) v[k] = resolveRef(S, e[k], tt, e); }
    return v;
  }
  const WARNED = {};
  HT.fxDraw = (ctx, S, list, layer) => {
    if (!list || !list.length || !S) return;
    const t = S.t;
    let clipped = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e || !(e.t <= t)) continue;
      const F = FX[e.fx];
      if (!F) { if (!WARNED[e.fx]) { WARNED[e.fx] = 1; console.warn('[fx] unknown effect ' + e.fx); } continue; }
      const L = e.layer || F.layer || 'front';
      if (L !== layer && !(Array.isArray(L) && L.indexOf(layer) >= 0)) continue;
      const dur = durOf(F, e), age = t - e.t;
      if (!(age >= 0 && age < dur)) continue;
      if (!clipped) { setClip(ctx, S); clipped = true; }
      const v = viewOf(e, F, S, dur);
      S.fxLayer = layer;
      const ga = ctx.globalAlpha, gc = ctx.globalCompositeOperation;
      try { F.draw(ctx, age, v, S); }
      catch (err) { if (!F._err) { F._err = String((err && err.message) || err); console.error('[fx] ' + e.fx + ' failed at age ' + age.toFixed(3), err); } }
      ctx.globalAlpha = ga; ctx.globalCompositeOperation = gc;
    }
    S.fxLayer = null;
  };
  // world-scale effects out in the city (the Void's shell, the Shrine) can stand behind buildings: an FX def's
  // occ(e, S, age) returns { d: forward depth (m) — city pixels nearer than this hide the effect, box: [x0, y0, x1, y1]
  // screen rect the effect stays inside (null = whole view) } or null (draw unoccluded). The runner draws such effects
  // through a mask of the city depth buffer (HT.cityOccluderAt). S.fxPart = 'tint' | 'body' lets an effect split off a
  // full-screen part that must not be masked (the Shrine's red grade, its stray slashes) from its world-anchored body.
  const occFwd = (S, p) => { const c = S.cam || {}; const yw = c.yaw || 0; return (p[0] - c.x) * sin(yw) + (p[1] - c.y) * cos(yw); };
  const occBox = (S, pts, pad) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { const q = S.project(p[0], p[1], p[2] || 0); if (!q) return null; if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
    return [Math.floor(x0 - pad), Math.floor(y0 - pad), Math.ceil(x1 + pad), Math.ceil(y1 + pad)];
  };
  const occDome = (S, c, r, zTop, pad) => { // the axis-aligned box around a dome (or a shard cloud) of radius r
    const z0 = c[2] || 0, pts = [];
    for (const dx of [-r, r]) for (const dy of [-r, r]) { pts.push([c[0] + dx, c[1] + dy, z0]); pts.push([c[0] + dx, c[1] + dy, z0 + zTop]); }
    return occBox(S, pts, pad);
  };
  HT.fxOcc = { fwd: occFwd, box: occBox, dome: occDome };
  // the active events of `layer` at S.t whose FX def has occ() (world-scale effects to be drawn through a city mask)
  HT.fxActiveOcc = (S, list, layer) => {
    const out = []; if (!list || !list.length || !S) return out;
    const t = S.t;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (!e || !(e.t <= t) || e.occlude === false) continue;
      const F = FX[e.fx]; if (!F || !F.occ) continue;
      const L = e.layer || F.layer || 'front';
      if (L !== layer && !(Array.isArray(L) && L.indexOf(layer) >= 0)) continue;
      const age = t - e.t; if (!(age >= 0 && age < durOf(F, e))) continue;
      out.push(e);
    }
    return out;
  };
  // the plane heights of the effects active in `layer` at S.t (for the runner's ground-FX occlusion); [] when none
  HT.fxActiveZ = (S, list, layer) => {
    const out = []; if (!list || !list.length || !S) return out;
    const t = S.t;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (!e || !(e.t <= t)) continue;
      const F = FX[e.fx]; if (!F) continue;
      const L = e.layer || F.layer || 'front';
      if (L !== layer && !(Array.isArray(L) && L.indexOf(layer) >= 0)) continue;
      const age = t - e.t; if (!(age >= 0 && age < durOf(F, e))) continue;
      const z = e.groundZ !== undefined ? e.groundZ : Array.isArray(e.at) ? (e.at[2] || 0) : Array.isArray(e.center) ? (e.center[2] || 0) : 0;
      if (out.indexOf(z) < 0) out.push(z);
    }
    return out;
  };
  // every audio cue of an fx event (film-relative times); the runner can use this instead of F.sfx/F.sfxAt
  HT.fxCues = e => {
    const F = FX[e.fx];
    if (!F || e.sfx === false) return [];
    const vol = c => (e.vol !== undefined ? e.vol : c.vol !== undefined ? c.vol : F.vol !== undefined ? F.vol : 0.8);
    if (F.cues) return F.cues(e).map(c => ({ t: e.t + c.t, sfx: c.sfx, vol: vol(c) }));
    if (!F.sfx) return [];
    return [{ t: e.t + (F.sfxAt || 0), sfx: typeof F.sfx === 'function' ? F.sfx(e) : F.sfx, vol: vol({}) }];
  };

  // ================================================================== shared looks
  const DUSTS = {
    concrete: [C.white, C.mist, C.steel, C.lilacgrey], ash: [C.steel, C.lilacgrey, C.dusk, C.shadow],
    snow: [C.white, C.mist, C.steel, C.lilacgrey], sand: [C.cream, C.sand, C.rosewood, C.mauve],
    dark: [C.lilacgrey, C.dusk, C.shadow, C.ink], earth: [C.sand, C.rosewood, C.mauve, C.shadow],
  };
  const dustPal = e => (Array.isArray(e.col) ? e.col : DUSTS[e.col] || DUSTS.concrete);
  const STEAM = [C.white, C.white, C.mist, C.mist];
  // a pixel-art puff (light from the upper left): an irregular cluster of lobes — dark underside offset down-right,
  // mid body, a smaller lit crown on the upper lobes, a rare highlight. Dissolves by shrinking + dither (a).
  const puffCache = HT.lru(360);
  HT.caches.push({ name: 'fx.puffs', size: () => puffCache.size });
  function puff(ctx, x, y, r, pal, a, seed) {
    if (!(a > 0.03)) return;
    if (r > 56) { a *= max(0, 1 - (r - 56) / 56); r = 56; if (a <= 0.03) return; } // near the lens: cap the size, fade out
    if (r < 0.9) { sq(ctx, x, y, 1, dcol(pal[2], a)); return; }
    if (r < 2.2) { disc(ctx, x + 0.5, y + 0.5, r, dcol(pal[3], a)); disc(ctx, x, y, r * 0.7, dcol(pal[2], a)); return; }
    const rb = r < 12 ? R(r) : r < 40 ? R(r / 2) * 2 : R(r / 4) * 4, sd = seed & 7, key = rb + '|' + pal.join('') + '|' + sd;
    let spr = puffCache.get(key);
    if (!spr) {
      const size = ceil(rb * 2.8) + 4, cv = HT.canvas(size, size), sv = [CX0, CY0, CX1, CY1];
      CX0 = 0; CY0 = 0; CX1 = size - 1; CY1 = size - 1;
      puffShape(cv.g, size / 2, size / 2, rb, pal, sd);
      CX0 = sv[0]; CY0 = sv[1]; CX1 = sv[2]; CY1 = sv[3];
      spr = puffCache.set(key, cv.c);
    }
    const X = R(x - spr.width / 2), Y = R(y - spr.height / 2);
    if (X > CX1 || Y > CY1 || X + spr.width < CX0 || Y + spr.height < CY0) return;
    if (a < 0.97) { const oa = ctx.globalAlpha; ctx.globalAlpha = oa * a; ctx.drawImage(spr, X, Y); ctx.globalAlpha = oa; } else ctx.drawImage(spr, X, Y);
  }
  function puffShape(ctx, x, y, r, pal, seed) {
    const a = 1;
    const L = [];
    for (let i = 0; i < 4; i++) { const th = (i / 4) * TAU + h1(i, seed) * 1.3, d = r * (0.32 + 0.26 * h1(i, seed + 1)); L.push([cos(th) * d, sin(th) * d * 0.72, r * (0.42 + 0.22 * h1(i, seed + 2))]); }
    const sx = r * 0.12, sy = r * 0.18, cd = dcol(pal[3], a), cm = dcol(pal[2], a), cl = dcol(pal[1], a);
    disc(ctx, x + sx, y + sy, r * 0.72, cd);
    for (const l of L) disc(ctx, x + l[0] + sx, y + l[1] + sy, l[2], cd);
    disc(ctx, x, y, r * 0.66, cm);
    for (const l of L) disc(ctx, x + l[0], y + l[1], l[2] * 0.92, cm);
    disc(ctx, x - r * 0.2, y - r * 0.22, r * 0.38, cl);
    for (const l of L) if (l[1] < 0 || l[0] < -r * 0.2) disc(ctx, x + l[0] - l[2] * 0.25, y + l[1] - l[2] * 0.3, l[2] * 0.55, cl);
    if (r > 16) disc(ctx, x - r * 0.32, y - r * 0.34, max(1, r * 0.06), dcol(pal[0], a));
  }
  // bright red orb (Red)
  function redBall(ctx, x, y, rp) {
    if (rp < 2.2) { disc(ctx, x, y, rp + 0.6, C.red); sq(ctx, x, y, 1, C.white); return; }
    disc(ctx, x, y, rp + 1, C.crimson);
    disc(ctx, x, y, rp, C.red);
    disc(ctx, x - rp * 0.08, y - rp * 0.08, rp * 0.68, C.coral);
    disc(ctx, x - rp * 0.1, y - rp * 0.12, rp * 0.4, C.white);
  }
  // dark-core Blue orb with an ice rim and a highlight crescent
  function blueBall(ctx, x, y, rp) {
    if (rp < 2.5) { disc(ctx, x, y, rp + 1, C.ice); disc(ctx, x, y, max(0.4, rp - 0.5), C.navy); return; }
    disc(ctx, x, y, rp + 1.5, C.sky);
    disc(ctx, x, y, rp + 0.5, C.ice);
    disc(ctx, x, y, rp - 0.5, C.navy);
    disc(ctx, x + rp * 0.08, y + rp * 0.1, rp * 0.72, C.ink);
    if (rp > 4) for (let k = 0; k < 6; k++) { const a0 = -2.55 + k * 0.22, a1 = a0 + 0.22, rr = rp - 1.4; line(ctx, x + cos(a0) * rr, y + sin(a0) * rr, x + cos(a1) * rr, y + sin(a1) * rr, C.white); }
  }
  // crackling sparks around an orb (re-drawn on 2s)
  function crackle(ctx, x, y, rp, n, seed, age, cols, lk) {
    lk = lk || 1;
    const g = floor(age * 12), rng = HT.rng(seed * 31 + g * 977);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, r0 = rp * (0.9 + 0.2 * rng()), L = (rp * (0.5 + 0.9 * rng()) + 2) * lk;
      const P = bolt(x + cos(a) * r0, y + sin(a) * r0, x + cos(a) * (r0 + L), y + sin(a) * (r0 + L), 0.7, 2, rng);
      polyline(ctx, P, cols[i % cols.length]);
    }
  }
  // rotated ellipse outline (semi-axis a along (ax, ay), b along (bx, by)) with noise gaps: a shimmering ring
  function ellipseArcs(ctx, cx, cy, a, b, ax, ay, bx, by, col, seed, t, gap) {
    if (!col) return;
    const n = clamp(R(a * 0.8), 16, 110);
    let x0 = 0, y0 = 0;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * TAU, c = cos(th), s = sin(th);
      const x = cx + ax * a * c + bx * b * s, y = cy + ay * a * c + by * b * s;
      if (i > 0 && HT.noise(c * 1.6 + 5, s * 1.6 + t * 3, seed) > gap) line(ctx, x0, y0, x, y, col);
      x0 = x; y0 = y;
    }
  }
  function arcsOn(ctx, cx, cy, rx, ry, t, seed, col, n, w) {
    if (!col) return;
    for (let i = 0; i < n; i++) {
      const a0 = h1(i, seed) * TAU + w * t * (1 + 0.3 * i), span = 0.7 + 0.5 * h1(i, seed + 3);
      const m = max(6, R((rx + ry) * span * 0.25));
      let x0 = cx + cos(a0) * rx, y0 = cy + sin(a0) * ry;
      for (let j = 1; j <= m; j++) { const a = a0 + (span * j) / m, x1 = cx + cos(a) * rx, y1 = cy + sin(a) * ry; line(ctx, x0, y0, x1, y1, col); x0 = x1; y0 = y1; }
    }
  }

  // ================================================================== TECHNIQUES
  // ---- hitSpark  e.at, e.strength 1–3, e.dir heading [dx,dy(,dz)], e.size (×), e.col (hot accent). No sound
  //      (fight.js already cues the hit). Frames: 2 of star flash (ink-outlined, reads on snow), spikes detach,
  //      a ring that thins as it grows, directional sparks with drag.
  const SPIKES = [[0, 2.2], [PI, 1.05], [PI / 2, 0.95], [-PI / 2, 0.95], [0.62, 1.2], [-0.62, 1.2], [2.35, 0.7], [-2.35, 0.7], [0.28, 1.6], [-0.3, 1.5]];
  function starBurst(ctx, x, y, L, ux, uy, n, seed, col, pad) {
    if (pad > 0) { // outline = the star dilated by 1 px (4 offset copies); padding a thin kite would not offset its long edges
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) starBurst(ctx, x + ox, y + oy, L, ux, uy, n, seed, col, 0);
      return;
    }
    for (let i = 0; i < n; i++) {
      const sp = SPIKES[i], a = sp[0] + h2(i, seed) * 0.12, ca = cos(a), sa = sin(a);
      const dx = ca * ux - sa * uy, dy = ca * uy + sa * ux;
      const len = L * sp[1] * (0.85 + 0.3 * h1(i + 17, seed)) + pad, w = L * 0.19 + pad;
      fillPoly(ctx, [x + dx * len, y + dy * len, x - dy * w, y + dx * w, x - dx * w * 0.8, y - dy * w * 0.8, x + dy * w, y - dx * w], col);
    }
  }
  FX.hitSpark = {
    dur: e => 0.24 + 0.07 * clamp(e.strength || 1, 1, 3), layer: 'front',
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const st = clamp(R(e.strength || 1), 1, 3), seed = e.seed, x = p.x, y = p.y, f = fr(age);
      const sz = (e.size || 1) * (e.scale || 1), L = clamp(p.s * (0.16 + 0.1 * st) * sz, (4 + 2 * st) * sz, (18 + 16 * st) * sz);
      const d = e.dir ? sdir(S, e.at, e.dir) : [1, 0, 1], ux = d[0], uy = d[1];
      const hot = e.col || (st >= 3 ? C.orange : C.gold), nsp = st >= 3 ? 10 : st >= 2 ? 8 : 6;
      if (f <= 1) {
        const k = f === 0 ? 1 : 1.2;
        starBurst(ctx, x, y, L * k, ux, uy, nsp, seed, C.ink, 1.5);
        starBurst(ctx, x, y, L * k, ux, uy, nsp, seed, f === 0 ? C.white : hot, 0);
        if (f === 1) starBurst(ctx, x, y, L * k * 0.6, ux, uy, nsp, seed, C.butter, 0);
        disc(ctx, x, y, L * (f === 0 ? 0.45 : 0.32), C.white);
      } else if (f <= 3) {
        const k = (f - 1) / 2;
        for (let i = 0; i < nsp; i++) {
          const sp = SPIKES[i], a = sp[0] + h2(i, seed) * 0.12, ca = cos(a), sa = sin(a);
          const dx = ca * ux - sa * uy, dy = ca * uy + sa * ux;
          const r0 = L * (0.5 + 0.9 * k) * sp[1] * 0.8, r1 = r0 + L * sp[1] * (0.9 - 0.3 * k);
          taper(ctx, x + dx * r0, y + dy * r0, x + dx * r1, y + dy * r1, 2.4 - k, 1, f === 2 ? C.white : C.butter);
        }
        disc(ctx, x, y, L * 0.22 * (1 - k * 0.6), C.white);
      }
      if (f >= 1 && f <= 9) {
        const q = (f - 1) / 8, r = L * (0.6 + 1.0 * E.outCubic(q)), th = max(1, R((1 - q) * (1 + st)));
        annulus(ctx, x, y, r - th, r, dcol(f <= 3 ? C.white : st >= 3 ? C.butter : C.ice, 1 - q * q));
      }
      const n = 3 + 4 * st, T = e.dur, base = atan2(uy, ux);
      for (let i = 0; i < n; i++) {
        const life = T * (0.55 + 0.45 * h1(i, seed + 3));
        if (age > life || f < 1) continue;
        const a0 = base + h2(i, seed + 5) * (i % 3 === 0 ? 2.4 : 0.9), v = L * (7 + 9 * h1(i, seed + 7)), k = 7;
        const s1 = (v * (1 - exp(-k * age))) / k, s0 = (v * (1 - exp(-k * max(0, age - 0.035)))) / k, g1 = 90 * age * age, g0 = 90 * max(0, age - 0.035) ** 2;
        const ca = cos(a0), sa = sin(a0), q = age / life;
        const col = q < 0.3 ? C.white : q < 0.6 ? C.butter : q < 0.85 ? hot : C.rust;
        taper(ctx, x + ca * s0, y + sa * s0 + g0, x + ca * s1, y + sa * s1 + g1, st >= 2 && q < 0.5 ? 2 : 1, 1, col);
      }
    },
  };

  // ---- blockSpark  e.at, e.strength, e.dir: a guard crescent facing the attacker + sparks deflected sideways
  FX.blockSpark = {
    dur: 0.32, layer: 'front',
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const st = clamp(R(e.strength || 1), 1, 3), seed = e.seed, x = p.x, y = p.y, f = fr(age);
      const sz = (e.size || 1) * (e.scale || 1), L = clamp(p.s * (0.3 + 0.09 * st) * sz, 9 * sz, 56 * sz);
      const d = e.dir ? sdir(S, e.at, e.dir) : [1, 0, 1], ux = d[0], uy = d[1], nx = -uy, ny = ux;
      if (f <= 6) {
        const q = f / 6, rr = L * (0.8 + 0.5 * q), th = f <= 1 ? 3.2 : f <= 3 ? 2.2 : 1;
        const cx = x + ux * rr * 0.55, cy = y + uy * rr * 0.55, a0 = atan2(-uy, -ux), span = 1.2 - 0.3 * q;
        const col = f <= 1 ? C.white : f <= 3 ? C.ice : dcol(C.sky, 1 - q);
        if (f <= 1) for (let k = 0; k < 10; k++) { const a1 = a0 - span + (2 * span * k) / 10, a2 = a1 + (2 * span) / 10, w = (th + 2) * (1 - abs(k - 4.5) / 6); thick(ctx, cx + cos(a1) * rr, cy + sin(a1) * rr, cx + cos(a2) * rr, cy + sin(a2) * rr, max(1, w), C.navy); }
        for (let k = 0; k < 10; k++) { const a1 = a0 - span + (2 * span * k) / 10, a2 = a1 + (2 * span) / 10, w = th * (1 - abs(k - 4.5) / 6); thick(ctx, cx + cos(a1) * rr, cy + sin(a1) * rr, cx + cos(a2) * rr, cy + sin(a2) * rr, max(1, w + 0.4), col); }
      }
      if (f <= 2) sparkle(ctx, x, y, R(L * (f === 0 ? 0.75 : 0.45)), C.white, C.ice);
      const n = 6 + 3 * st;
      for (let i = 0; i < n; i++) {
        const life = e.dur * (0.6 + 0.4 * h1(i, seed));
        if (age > life) continue;
        const side = i % 2 ? 1 : -1, sp = h2(i, seed + 2) * 0.6, back = 0.35 + 0.3 * h1(i, seed + 4);
        const dx = nx * side * cos(sp) - ux * back, dy = ny * side * cos(sp) - uy * back;
        const v = L * (6 + 6 * h1(i, seed + 6)), k = 6;
        const s1 = (v * (1 - exp(-k * age))) / k, s0 = (v * (1 - exp(-k * max(0, age - 0.03)))) / k, g1 = 260 * age * age, g0 = 260 * max(0, age - 0.03) ** 2;
        const q = age / life;
        line(ctx, x + dx * s0, y + dy * s0 + g0, x + dx * s1, y + dy * s1 + g1, q < 0.35 ? C.white : q < 0.7 ? C.ice : C.steel);
      }
    },
  };

  // ---- infinityRipple  e.at (where the blow stops), e.strength, e.dir, e.flat (ellipse ratio, 1.9)
  //      Canon: Infinity is invisible — only a lens shimmer (real pixel refraction) and faint broken rings.
  FX.infinityRipple = {
    dur: 0.75, layer: 'front',
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const st = clamp(e.strength || 1, 1, 3), seed = e.seed, T = e.dur, q = age / T;
      const Rm = clamp(p.s * (0.5 + 0.22 * st), 14, 120);
      const d = e.dir ? sdir(S, e.at, e.dir) : [1, 0, 1], ux = d[0], uy = d[1], nx = -uy, ny = ux;
      const kk = e.flat || 1.9, rf = Rm * E.outCubic(min(1, age / (T * 0.85)));
      const A = (1.1 + 0.7 * st) * (1 - q) * (1 - q), wf = max(2.5, Rm * 0.14);
      if (A > 0.3 && rf > 2) {
        const r2 = rf * 0.58;
        warp(ctx, p.x, p.y, rf + wf * 2.6, dd => { const u1 = (dd - rf) / wf, u2 = (dd - r2) / wf; return dd + A * 1.6 * (u1 * exp(-u1 * u1) + 0.55 * u2 * exp(-u2 * u2)); }, { ux, uy, k: kk });
      }
      const rings = [[rf, C.ice, 0.85], [rf * 0.58, C.foam, 0.6], [rf * 0.3, C.white, 0.45]];
      for (let k = 0; k < 3; k++) {
        const rr = rings[k][0];
        if (rr < 2) continue;
        const a = rings[k][2] * (1 - q) * (k === 2 ? sat(1 - age * 5) : 1);
        ellipseArcs(ctx, p.x, p.y, rr, rr / kk, nx, ny, ux, uy, dcol(rings[k][1], a), seed + k, age, 0.36);
      }
      for (let i = 0; i < 5; i++) {
        if ((fr(age) + i) % 3 || q > 0.7) continue;
        const a = h1(i, seed + 9) * TAU, cx = p.x + (nx * cos(a) + (ux * sin(a)) / kk) * rf, cy = p.y + (ny * cos(a) + (uy * sin(a)) / kk) * rf;
        sparkle(ctx, cx, cy, q < 0.3 ? 2 : 1, C.white, null);
      }
      if (fr(age) <= 2) { const r0 = Rm * (0.18 + 0.08 * fr(age)); ellipseArcs(ctx, p.x, p.y, r0, r0 / kk, nx, ny, ux, uy, fr(age) < 2 ? C.white : C.ice, seed + 7, 0, -1); }
      if (fr(age) <= 1) sparkle(ctx, p.x, p.y, 3, C.white, null);
    },
  };

  // ---- infinityAura  e.who (default 'gojo'), e.dur, e.intensity: sustained heat-haze shimmer of the background
  //      around the body (behind pass), faint rotating shell arcs, rare twinkles (front pass)
  FX.infinityAura = {
    dur: 4, layer: ['behind', 'front'], follow: true, sfx: 'infinityHum', vol: 0.35,
    draw(ctx, age, e, S) {
      const a = S.at(e.who || 'gojo', S.t), p = S.project(a.x, a.y, a.z + a.h * 0.52); if (!p) return;
      const k = envl(age, e.dur, 0.35, 0.35) * num(e.intensity, 1), seed = e.seed;
      const rx = max(7, a.h * 0.34 * p.s), ry = max(12, a.h * 0.62 * p.s);
      if (S.fxLayer === 'behind') {
        haze(ctx, p.x, p.y, rx * 1.3, ry * 1.14, 0.62, max(1, R(p.s / 55)) * k, on2(age) * 11);
        arcsOn(ctx, p.x, p.y, rx * 1.08, ry * 1.04, age, seed, dcol(C.ice, 0.3 * k), 2, 0.7);
        return;
      }
      arcsOn(ctx, p.x, p.y, rx * 1.14, ry * 1.07, age, seed + 5, dcol(C.foam, 0.38 * k), 1, -0.9);
      for (let i = 0; i < 6; i++) {
        const per = 1.1 + 0.9 * h1(i, seed), ph = ((age + h1(i, seed + 1) * per) % per) / per;
        if (ph > 0.3 || k < 0.3) continue;
        const th = h1(i, seed + 2) * TAU + age * 0.4 * (i % 2 ? 1 : -1), arm = ph < 0.1 ? 2 : ph < 0.2 ? 1 : 0;
        sparkle(ctx, p.x + cos(th) * rx * 1.12, p.y + sin(th) * ry * 1.06, arm, arm === 2 ? C.white : C.ice, null);
      }
    },
  };

  // ---- blueOrb  e.at (follows refs), e.r world radius (0.5 m), e.dur, e.grow (0.28 s), e.end 'implode'|'none',
  //      e.pull lens strength 0–1+, e.debris count, e.tilt (swirl plane). Canon: attraction — a lens that drags the
  //      background toward the dark core (point-lens equation β = θ − θE²/θ), inward spirals, swirling rims.
  FX.blueOrb = {
    dur: 2, layer: 'front', follow: true, sfx: 'blueImplode', vol: 0.85,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const T = e.dur, g = num(e.grow, 0.28), seed = e.seed, x = p.x, y = p.y;
      const endT = e.end === 'none' ? 0 : min(0.32, T * 0.3);
      let k = age < g ? E.outBack(age / g) : 1, imp = 0;
      if (endT && age > T - endT) { imp = (age - (T - endT)) / endT; k *= 1 - E.inCubic(imp); }
      const r0 = max(2.5, num(e.r, 0.3) * p.s), rp = r0 * k * (1 + 0.05 * sin(on2(age) * TAU * 3.5));
      const crush = !!e.crush, pull = num(e.pull, 1) * min(1, k * 1.5) * (crush ? 1.3 : 1);
      if (pull > 0.05 && rp > 1.5) {
        const tE = rp * 1.4 * sqrt(pull), Rw = min(max(rp * (crush ? 4.6 : 3.8), rp + 14), 150);
        warp(ctx, x, y, Rw, dd => { const w = sm(1 - dd / Rw); return dd - ((tE * tE) / max(dd, 0.75)) * w; });
      }
      glow(ctx, x, y, rp * 3.4 + 5, C.blue, 0.45 * min(1, k + 0.2));
      glow(ctx, x, y, rp * 1.9 + 2, C.sky, 0.4 * k);
      // manga pull lines converging on the core (redrawn on 2s)
      if (rp > 5 && !imp) {
        const gi = floor(age * 12);
        for (let i = 0; i < 8; i++) { if ((i + gi) % 2) continue; const a = h1(i + gi * 13, seed) * TAU, r1 = rp * (2.5 + 0.8 * h1(i, seed + gi)), r2 = rp * (1.7 + 0.3 * h1(i + 5, seed)); line(ctx, x + cos(a) * r1, y + sin(a) * r1, x + cos(a) * r2, y + sin(a) * r2, dcol(C.ice, 0.5)); }
      }
      // spirals: energy streaks + debris (tilted plane; the far half is drawn first, the near half after the core)
      const tilt = num(e.tilt, -0.35), ct = cos(tilt), st = sin(tilt);
      const N = clamp(R(8 + rp * 0.5), 8, 24), nd = num(e.debris, 10), Rmax = rp * 3.6 + 10, front = [];
      const pos = (rr, th, o) => { const dx = cos(th) * rr, dy = sin(th) * rr * 0.5; o[0] = x + dx * ct - dy * st; o[1] = y + dx * st + dy * ct; o[2] = sin(th); };
      const A = [0, 0, 0], B = [0, 0, 0];
      for (let i = 0; i < N + nd; i++) {
        const deb = i >= N, rate = (deb ? 0.55 : 1.3) + 0.9 * h1(i, seed + 11);
        if (age * rate < h1(i, seed + 13) * 0.6) continue;
        const u = age * rate + h1(i, seed + 12), ph = u - floor(u), reach = deb ? Rmax * 1.4 : Rmax;
        const f1 = pow(1 - ph, 1.6), f0 = pow(1 - max(0, ph - 0.045), 1.6);
        const th0 = h1(i, seed + 14) * TAU + age * 1.5, spin = deb ? 2.2 : 3.4;
        pos(rp * 0.9 + reach * f1, th0 + (1 - f1) * spin, A); pos(rp * 0.9 + reach * f0, th0 + (1 - f0) * spin, B);
        const item = [deb, A[0], A[1], B[0], B[1], f1, i];
        if (A[2] > 0) front.push(item); else spiralItem(ctx, item, seed, false);
      }
      // swirl arcs (back halves)
      const arcs = [];
      for (let j = 0; j < 4; j++) {
        const rr = rp * (1.25 + 0.3 * j) + 1.5, sqz = 0.3 + 0.08 * j, tl = tilt + h2(j, seed + 20) * 0.5, c2 = cos(tl), s2 = sin(tl);
        const w = (8 - j) * (j % 2 ? -1 : 1), a0 = h1(j, seed + 21) * TAU + w * age, span = 1.3 + 0.8 * h1(j, seed + 22), m = 14;
        for (let s = 0; s < m; s++) {
          const a1 = a0 + (span * s) / m, a2 = a0 + (span * (s + 1)) / m;
          const X1 = cos(a1) * rr, Y1 = sin(a1) * rr * sqz, X2 = cos(a2) * rr, Y2 = sin(a2) * rr * sqz;
          const seg = [x + X1 * c2 - Y1 * s2, y + X1 * s2 + Y1 * c2, x + X2 * c2 - Y2 * s2, y + X2 * s2 + Y2 * c2, s === m - 1];
          if (sin(a1) < 0) line(ctx, seg[0], seg[1], seg[2], seg[3], dcol(C.sky, 0.8 * k)); else arcs.push(seg);
        }
      }
      if (rp >= 1) blueBall(ctx, x, y, rp);
      for (const s of arcs) { if (s[4] && rp > 5) thick(ctx, s[0], s[1], s[2], s[3], 2, C.white); else line(ctx, s[0], s[1], s[2], s[3], k > 0.5 ? C.ice : dcol(C.ice, k)); }
      for (const it of front) spiralItem(ctx, it, seed, true);
      if (crush && age > T * 0.4 && !imp) { // max output: a dark compression ring closes on the core, space folding in
        const q = (age - T * 0.4) / (T * 0.6 - endT || 1), rr = rp * (4.2 - 3 * E.inQuad(sat(q)));
        annulus(ctx, x, y, rr - max(2, rp * 0.25), rr, dcol(C.navy, 0.85)); annulus(ctx, x, y, rr - 1, rr, C.sky);
      }
      if (imp > 0.72) { const q = (imp - 0.72) / 0.28, rr = r0 * (1 + (crush ? 4.5 : 2.6) * q); annulus(ctx, x, y, rr - max(1, (crush ? 5 : 3) * (1 - q)), rr, q < 0.5 ? C.white : C.ice); sparkle(ctx, x, y, R(r0 * (1 - q) * (crush ? 1.6 : 1)) + 1, C.white, null); }
    },
  };
  function spiralItem(ctx, it, seed, near) {
    const [deb, ax, ay, bx, by, f1, i] = it;
    if (deb) { sq(ctx, ax, ay, f1 > 0.35 ? 2 : 1, f1 > 0.25 ? (i % 2 ? C.steel : C.lilacgrey) : C.sky); return; }
    line(ctx, bx, by, ax, ay, f1 < 0.18 ? C.white : near ? C.ice : C.sky);
  }

  // ---- redOrb  e.at (follows refs), e.dir heading, e.r (0.32 m), e.charge (0.42 s), e.range (7 m), e.dur (1.15)
  //      charge: a bright red orb crackling; release: flash, push warp, repulsion rings racing along the heading,
  //      radial streaks and embers (canon: repulsion).
  FX.redOrb = {
    dur: 1.15, layer: 'front', follow: true, sfx: 'redBlast', sfxAt: 0.42, vol: 0.95,
    cues: e => [{ t: 0, sfx: 'redCharge', vol: 0.7 }, { t: num(e.charge, 0.42), sfx: 'redBlast', vol: 0.95 }],
    draw(ctx, age, e, S) {
      const at = e.at, p = pj(S, at); if (!p) return;
      const ch = num(e.charge, 0.42), seed = e.seed, x = p.x, y = p.y;
      const r0 = max(2.5, num(e.r, 0.32) * p.s), d3 = heading3(e.dir || [1, 0, 0]);
      if (age < ch) {
        const q = age / ch, rp = r0 * E.outBack(min(1, q * 1.25)) + (fr(age) % 2 ? 0.5 : 0);
        glow(ctx, x, y, rp * 3.2 + 4, C.red, 0.3 + 0.35 * q);
        for (let i = 0; i < 10; i++) {
          const ph = (age * 2.4 + h1(i, seed)) % 1, a = h1(i, seed + 1) * TAU + age * 2, rr = rp * (1.2 + 3 * (1 - ph));
          sq(ctx, x + cos(a) * rr, y + sin(a) * rr, ph > 0.6 ? 1 : 2, ph > 0.5 ? C.coral : C.red);
        }
        redBall(ctx, x, y, rp);
        crackle(ctx, x, y, rp, 4, seed, age, [C.white, C.coral, C.salmon]);
        return;
      }
      const tau = age - ch, f = fr(tau), T2 = e.dur - ch, range = num(e.range, 7), rw = num(e.r, 0.32);
      const pd = sdir(S, at, d3, 1), base = atan2(pd[1], pd[0]);
      if (tau < 0.2) { const Rb = min(150, r0 * 7 + 24), A = 0.32 * (1 - tau / 0.2); warp(ctx, x, y, Rb, dd => dd * (1 - A * sin((PI * dd) / Rb))); }
      // the blast: a cone of repulsion racing down the heading (screen hull of the 3D cone), its tail catching up
      const cq = sat(tau / (T2 * 0.6));
      if (cq < 1) {
        const D = range * E.outCubic(min(1, tau / 0.22)), tail = D * E.inQuad(cq) * 0.9;
        const A = [at[0] + d3[0] * tail, at[1] + d3[1] * tail, at[2] + d3[2] * tail], B = [at[0] + d3[0] * D, at[1] + d3[1] * D, at[2] + d3[2] * D];
        const pA = pj(S, A), pB = pj(S, B);
        if (pA && pB) { // a tapered beam with ragged (Kanada-style) edges that re-jitter on 2s
          const dx = pB.x - pA.x, dy = pB.y - pA.y, L = hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
          const wA = (rw * 0.8 + tail * 0.05) * pA.s, wB = (rw * 2 + D * 0.08) * pB.s, gj = floor(tau * 12);
          const bands = [[1, C.crimson], [0.7, C.red], [0.42, C.coral], [0.16, C.white]];
          for (const [k, col] of bands) {
            const c2 = dcol(col, (1 - cq) * (k < 0.3 ? 1 - cq : 1)), P = [], Q = [];
            for (let j = 0; j <= 8; j++) {
              const u = j / 8, w = lerp(wA, wB, u) * k * (1 + (j > 0 && j < 8 ? h2(j + gj * 9, seed + R(k * 10)) * 0.22 : 0)), X = pA.x + dx * u, Y = pA.y + dy * u;
              P.push(X + nx * w, Y + ny * w); Q.push(X - nx * w, Y - ny * w);
            }
            for (let j = 8; j >= 0; j--) P.push(Q[2 * j], Q[2 * j + 1]);
            fillPoly(ctx, P, c2);
            disc(ctx, pB.x, pB.y, wB * k * 1.05, c2);
          }
        }
      }
      for (let j = 0; j < 2; j++) { // repulsion rings riding the front
        const tj = tau - j * 0.07; if (tj < 0) continue;
        const q = min(1, tj / (T2 * 0.85)); if (q >= 1) continue;
        const D = range * E.outCubic(q), rad = rw * 2.4 + D * 0.45, c3 = [at[0] + d3[0] * D, at[1] + d3[1] * D, at[2] + d3[2] * D];
        const po = projPoly(S, ring3(c3, d3, rad, 32)), pi = projPoly(S, ring3(c3, d3, rad * (1 - 0.14 * (1 - q)), 32));
        fillPolys(ctx, [po, pi], dcol(j === 0 ? C.red : C.crimson, 1 - q * q));
        polyline(ctx, po, dcol(q < 0.35 ? C.white : C.coral, 1 - q), true);
      }
      if (tau < 0.3) { const q = tau / 0.3, rr = r0 * (1.4 + 4.5 * E.outCubic(q)); annulus(ctx, x, y, rr - max(1, 4 * (1 - q)), rr, dcol(q < 0.3 ? C.white : q < 0.6 ? C.coral : C.red, 1 - q)); }
      if (f <= 1) { // release burst: an angular star, white then coral
        starBurst(ctx, x, y, r0 * 1.7, pd[0], pd[1], 8, seed, C.crimson, 2);
        starBurst(ctx, x, y, r0 * 1.7, pd[0], pd[1], 8, seed, C.white, 0);
        disc(ctx, x, y, r0 * (f ? 0.9 : 1.2), C.white);
      }
      for (let i = 0; i < 14; i++) {
        const q = tau / (T2 * 0.6); if (q > 1) break;
        const a = base + h2(i, seed + 3) * 0.55, r1 = r0 * (1.5 + 14 * E.outCubic(q) * (0.6 + 0.4 * h1(i, seed + 4))), r2 = r1 - r0 * (4 + 3 * h1(i, seed)) * (1 - q);
        line(ctx, x + cos(a) * max(r0, r2), y + sin(a) * max(r0, r2), x + cos(a) * r1, y + sin(a) * r1, q < 0.25 ? C.white : q < 0.6 ? C.coral : dcol(C.red, 1 - q));
      }
      for (let i = 0; i < 18; i++) {
        const life = T2 * (0.5 + 0.5 * h1(i, seed + 8)); if (tau > life) continue;
        const a = base + h2(i, seed + 9) * 1.1, v = r0 * (18 + 20 * h1(i, seed + 10)), s1 = (v * (1 - exp(-4 * tau))) / 4, q = tau / life;
        sq(ctx, x + cos(a) * s1, y + sin(a) * s1 + 40 * tau * tau, q < 0.4 ? 2 : 1, q < 0.3 ? C.butter : q < 0.6 ? C.orange : C.red);
      }
    },
  };

  // ---- redShot  e.path [[x,y,z]…] (Catmull-Rom) | e.from/e.to (+ e.curve m sideways bulge, e.lift m up),
  //      e.travel (0.7 s), e.ease, e.r (0.28 m), e.trail (0.22 s), e.impact (true)
  function catmull(P, u) {
    const n = P.length - 1, f = clamp(u, 0, 1) * n, i = min(n - 1, floor(f)), s = f - i;
    const p0 = P[max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[min(n, i + 2)], out = [0, 0, 0];
    for (let k = 0; k < 3; k++) { const a = p0[k] || 0, b = p1[k] || 0, c = p2[k] || 0, d = p3[k] || 0; out[k] = 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s); }
    return out;
  }
  function shotPos(e, u) {
    if (e.path && e.path.length >= 2) return catmull(e.path, u);
    const a = e.from || e.at || [0, 0, 1], b = e.to || [a[0] + 10, a[1], a[2]];
    let x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2] || 0, b[2] || 0, u);
    if (e.curve) { const dx = b[0] - a[0], dy = b[1] - a[1], L = hypot(dx, dy) || 1, k = 4 * u * (1 - u) * e.curve; x += (-dy / L) * k; y += (dx / L) * k; }
    if (e.lift) z += 4 * u * (1 - u) * e.lift;
    return [x, y, z];
  }
  FX.redShot = {
    dur: e => num(e.travel, 0.7) + (e.impact === false ? 0 : 0.36), layer: 'front', sfx: 'redBlast', vol: 0.8,
    draw(ctx, age, e, S) {
      const travel = num(e.travel, 0.7), seed = e.seed, ease = E[e.ease || 'linear'] || E.linear, rw = num(e.r, 0.28);
      const pos = uu => shotPos(e, ease(clamp(uu, 0, 1))), u = clamp(age / travel, 0, 1), tr = num(e.trail, 0.22) / travel;
      if (age <= travel) {
        const K = 16;
        for (let k = K; k >= 1; k--) {
          const uk = u - (tr * k) / K; if (uk < 0) continue;
          const P = pos(uk), q = S.project(P[0], P[1], P[2]); if (!q) continue;
          const f = k / K, rr = max(0.8, rw * q.s * pow(1 - f * 0.92, 0.8));
          disc(ctx, q.x, q.y, rr, dcol(f > 0.7 ? C.maroon : f > 0.45 ? C.crimson : f > 0.2 ? C.red : C.coral, 1 - f * 0.55));
        }
        for (let i = 0; i < 12; i++) { // embers shed along the path
          const ue = u - 0.02 - i * 0.035; if (ue < 0) break;
          const P = pos(ue), q = S.project(P[0], P[1], P[2]); if (!q) continue;
          const drift = (u - ue) * travel, a = h1(i + floor(ue * 40), seed) * TAU;
          sq(ctx, q.x + cos(a) * drift * 30, q.y + sin(a) * drift * 30 - drift * 12, 1, drift < 0.12 ? C.orange : C.crimson);
        }
        const P = pos(u), q = S.project(P[0], P[1], P[2]);
        if (q) { const rp = max(2, rw * q.s); glow(ctx, q.x, q.y, rp * 3 + 3, C.red, 0.55); redBall(ctx, q.x, q.y, rp); crackle(ctx, q.x, q.y, rp, 3, seed, age, [C.white, C.coral]); }
      }
      if (e.impact !== false && age >= travel) {
        const P = pos(1), q = S.project(P[0], P[1], P[2]); if (!q) return;
        const tau = age - travel, f = fr(tau), r0 = max(3, rw * q.s), k = tau / 0.36;
        if (f <= 1) disc(ctx, q.x, q.y, r0 * (f ? 3.2 : 2.4), f ? C.coral : C.white);
        const rr = r0 * (2 + 5 * E.outCubic(k));
        annulus(ctx, q.x, q.y, rr - max(1, 4 * (1 - k)), rr, dcol(k < 0.4 ? C.red : C.crimson, 1 - k));
        glow(ctx, q.x, q.y, r0 * 5, C.red, 0.5 * (1 - k));
      }
    },
  };

  // ---- purple  e.mode 'burst' (all directions, to e.r m; default r 60) | 'fire' (from → to, sphere e.r, default
  //      2.5 m, e.travel 1.2 s, erased trail); e.at formation point; e.form (1.4 s) Blue+Red converge (e.sep m);
  //      fusion flash (local); e.grow / e.hold / e.fade. The sphere: dithered violet bands around a white core,
  //      rotating great-circle arcs, rim crackle, disintegration pixels peeling off, matter drawn in and erased.
  function purpleTimes(e) {
    const form = num(e.form, 1.4), fuse = form, born = form + 0.22;
    if ((e.mode || 'burst') === 'fire') { const grow = num(e.grow, 0.25), travel = num(e.travel, 1.2), fade = num(e.fade, 0.9); return { form, fuse, born, grow, travel, fade, hold: 0, end: born + grow + travel + fade }; }
    const grow = num(e.grow, 1.3), hold = num(e.hold, 0.6), fade = num(e.fade, 1.2);
    return { form, fuse, born, grow, hold, fade, end: born + grow + hold + fade };
  }
  FX.purple = {
    dur: e => purpleTimes(e).end, layer: 'behind', sfx: 'purpleCharge', sfxAt: 1.4, vol: 1,
    cues: e => { const T = purpleTimes(e); return [{ t: T.fuse, sfx: 'purpleCharge', vol: 0.9 }, { t: T.born, sfx: 'purpleErase', vol: 1 }]; },
    draw(ctx, age, e, S) {
      const T = purpleTimes(e), at = e.at || [0, 0, 2], seed = e.seed, fire = e.mode === 'fire';
      if (age < T.born + 0.06) purpleForm(ctx, S, e, age, T, at, seed);
      if (age >= T.fuse && age < T.born + 0.12) {
        const p = pj(S, at);
        if (p) {
          const f = fr(age - T.fuse), r = max(6, 1.1 * p.s);
          if (f <= 2) { glow(ctx, p.x, p.y, r * 1.9, C.lavender, 0.7); starBurst(ctx, p.x, p.y, r * (1 + 0.3 * f), 1, 0, 10, seed, f ? C.lavender : C.white, 0); disc(ctx, p.x, p.y, r * (f === 2 ? 0.7 : 1), f === 0 ? C.white : C.blush); disc(ctx, p.x, p.y, r * 0.55, C.white); }
          const rr = r * (1.5 + f * 0.8);
          annulus(ctx, p.x, p.y, rr - max(1, 3 - f * 0.5), rr, dcol(C.lavender, 1 - f / 7));
        }
      }
      if (age < T.born - 0.02) return;
      const tb = age - T.born;
      if (!fire) {
        const r0 = max(0.6, num(e.r0, 1.0)), rm = r0 + (num(e.r, 60) - r0) * E.outCubic(min(1, tb / T.grow));
        const fq = sat((tb - T.grow - T.hold) / T.fade);
        purpleSphere(ctx, S, at, rm, age, fq, seed, e);
      } else {
        const from = e.from || at, to = e.to || [from[0] + 40, from[1], from[2]], rm = num(e.r, 2.5) * E.outBack(min(1, tb / T.grow));
        const uu = sat((tb - T.grow) / T.travel), fq = sat((tb - T.grow - T.travel) / T.fade);
        const c = [lerp(from[0], to[0], uu), lerp(from[1], to[1], uu), lerp(from[2], to[2], uu)];
        if (uu > 0) purpleTrail(ctx, S, from, c, rm, fq, seed, age);
        if (fq < 1) purpleSphere(ctx, S, c, rm * (1 - 0.6 * fq), age, fq, seed, e);
      }
    },
  };
  function purpleForm(ctx, S, e, age, T, at, seed) {
    const B = basis(S), q = sat(age / T.form), sep = num(e.sep, 2.4) * (1 - E.inCubic(q)), ang = num(e.phase, 0) + q * q * 7.5;
    const off = (sgn) => { const cx = cos(ang) * sep * 0.5 * sgn, cz = sin(ang) * sep * 0.5 * sgn; return [at[0] + B.r[0] * cx + B.f[0] * cz * 0.8 + B.u[0] * cz * 0.15, at[1] + B.r[1] * cx + B.f[1] * cz * 0.8 + B.u[1] * cz * 0.15, at[2] + B.r[2] * cx + B.f[2] * cz * 0.8 + B.u[2] * cz * 0.15]; };
    const pb = e.blue && q < 0.02 ? e.blue : off(1), pr = e.red && q < 0.02 ? e.red : off(-1);
    const PB = pj(S, pb), PR = pj(S, pr), PC = pj(S, at);
    if (PC) {
      glow(ctx, PC.x, PC.y, max(10, 2.2 * PC.s) * (0.4 + q), C.purple, 0.25 + 0.4 * q);
      for (let i = 0; i < 16; i++) { // violet motes converging on the centre
        const ph = (age * 1.7 + h1(i, seed + 40)) % 1, a = h1(i, seed + 41) * TAU + ph * 1.5, rr = max(8, 2.2 * PC.s) * (1 - ph) * (0.6 + 0.8 * q);
        sq(ctx, PC.x + cos(a) * rr, PC.y + sin(a) * rr, ph > 0.7 ? 1 : 2, ph > 0.6 ? C.lavender : C.violet);
      }
    }
    if (PB && PR && q > 0.55) { // arcs of violet lightning between the two as they close in
      const rng = HT.rng(seed * 7 + floor(age * 12) * 131);
      for (let i = 0; i < 2 + floor(q * 3); i++) polyline(ctx, bolt(PB.x, PB.y, PR.x, PR.y, 0.5, 3, rng), i ? C.lavender : C.white);
    }
    const list = [];
    if (PB) list.push([PB, 'b']); if (PR) list.push([PR, 'r']);
    list.sort((a, b) => b[0].d - a[0].d);
    for (const [P, kind] of list) {
      const rp = max(3, num(e.orb, 0.32) * P.s);
      if (kind === 'b') { glow(ctx, P.x, P.y, rp * 3, C.blue, 0.5); blueBall(ctx, P.x, P.y, rp); }
      else { glow(ctx, P.x, P.y, rp * 3, C.red, 0.5); redBall(ctx, P.x, P.y, rp); }
    }
  }
  const PBANDS = [[1.0, C.plum, 1], [0.965, C.purple, 1], [0.9, C.violet, 0.5], [0.86, C.violet, 1], [0.74, C.lavender, 0.5], [0.7, C.lavender, 1], [0.54, C.blush, 0.5], [0.5, C.blush, 1], [0.36, C.white, 0.5], [0.31, C.white, 1]];
  function purpleSphere(ctx, S, pos, rm, age, fq, seed, e) {
    const sp = sphereScr(S, pos[0], pos[1], pos[2], rm);
    if (!sp) return;
    if (sp.inside) { // the camera is inside the imaginary mass: everything is erased to light (one slow ramp, no strobe)
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      g.addColorStop(0, rgba(C.white, 1 - fq)); g.addColorStop(0.5, rgba(C.blush, 1 - fq)); g.addColorStop(1, rgba(C.lavender, 1 - fq));
      ctx.fillStyle = g; ctx.fillRect(CX0, CY0, CX1 - CX0 + 1, CY1 - CY0 + 1);
      return;
    }
    const x = sp.x, y = sp.y, rho = sp.rho;
    if (x + rho * 1.6 < CX0 || x - rho * 1.6 > CX1 || y + rho * 1.6 < CY0 || y - rho * 1.6 > CY1) return;
    const k = 1 - fq;
    annulus(ctx, x, y, rho * 1.12 + 3, rho * 1.22 + 5, dcol(C.purple, 0.25 * k));   // halo: narrow falloff bands
    annulus(ctx, x, y, rho * 1.05 + 1.5, rho * 1.12 + 3, dcol(C.violet, 0.35 * k));
    annulus(ctx, x, y, rho, rho * 1.05 + 1.5, dcol(C.lavender, 0.55 * k));
    // matter drawn in from outside, violet as it nears the rim, erased at the rim
    const nIn = clamp(R(rho * 0.25), 8, 48);
    for (let i = 0; i < nIn; i++) {
      const ph = (age * (0.5 + 0.4 * h1(i, seed + 60)) + h1(i, seed + 61)) % 1, a = h1(i, seed + 62) * TAU + ph * 0.4;
      const rr = rho * (1.02 + 0.55 * (1 - ph) * (1 - ph)), s = rho > 60 ? 3 : 2;
      sq(ctx, x + cos(a) * rr, y + sin(a) * rr, ph > 0.8 ? s - 1 : s, dcol(ph > 0.75 ? C.lavender : ph > 0.55 ? C.violet : i % 2 ? C.dusk : C.steel, k));
    }
    if (fq < 0.3) { // full mass; as the fade begins the inner bands bloom outward until the sphere is white
      const u = E.inQuad(fq / 0.3);
      for (let bi = 0; bi < PBANDS.length; bi++) {
        const b = PBANDS[bi], rr = rho * (b[0] + (1 - b[0]) * u * 0.98), col = b[2] < 1 ? dcol(b[1], b[2]) : b[1];
        if (bi < 2 || rr < 6) disc(ctx, x, y, rr, col); else wobDisc(ctx, x, y, rr, col, 0.028 * (1 - u), 4 + (bi % 3), age * (bi % 2 ? 0.8 : -0.65) + bi); // slow churn: band edges stay well under 3 alternations/s
      }
      ring1(ctx, x, y, rho + 1, C.lavender);
    } else { // then the erased interior opens (the sky shows through) and the shell thins outward into a ring
      const v = (fq - 0.3) / 0.7, o = rho * (1 + 0.1 * v), inner = rho * (0.25 + 0.72 * E.outCubic(v));
      if (v < 0.2) disc(ctx, x, y, inner, dcol(C.white, 1 - v / 0.2));
      annulus(ctx, x, y, inner, o, dcol(C.violet, 1 - v));
      annulus(ctx, x, y, inner + (o - inner) * 0.45, o, dcol(C.lavender, 1 - v));
      annulus(ctx, x, y, inner, inner + max(1, (o - inner) * 0.2), dcol(C.white, 1 - v));
      ring1(ctx, x, y, o + 1, dcol(C.white, 1 - v));
    }
    // rotating great-circle arcs on the surface (front hemisphere only)
    if (k > 0.2 && rho > 4) {
      const w = rho > 140 ? 2 : 1;
      for (let i = 0; i < 5; i++) {
        const a1 = h1(i, seed + 70) * TAU + age * (0.6 + 0.25 * i), a2 = h1(i, seed + 71) * PI;
        const nxv = cos(a1) * sin(a2), nyv = sin(a1) * sin(a2), nzv = cos(a2);
        const P = perp([nxv, nyv, nzv]), m = clamp(R(rho * 0.35), 16, 72);
        let x0 = 0, y0 = 0, ok0 = false;
        for (let j = 0; j <= m; j++) {
          const t = (j / m) * TAU, vx = P[0] * cos(t) + P[3] * sin(t), vy = P[1] * cos(t) + P[4] * sin(t), vz = P[2] * cos(t) + P[5] * sin(t);
          const X = x + vx * rho * 0.97, Y = y - vz * rho * 0.97, ok = vy < 0.05;
          if (j > 0 && ok && ok0) { const c = vy < -0.6 ? C.white : C.lavender; if (w > 1) thick(ctx, x0, y0, X, Y, 2, dcol(c, k)); else line(ctx, x0, y0, X, Y, dcol(c, k)); }
          x0 = X; y0 = Y; ok0 = ok;
        }
      }
    }
    if (k > 0.1) crackle(ctx, x, y, rho, clamp(R(rho / 10), 4, 16), seed + 3, age, [C.lavender, C.white, C.violet], min(1, (4 + rho * 0.2) / (rho * 0.95 + 2)));
    // disintegration pixels peeling off the rim
    const nOut = clamp(R(rho * 0.6), 20, 150) * (fq > 0 ? 2 : 1);
    for (let i = 0; i < nOut; i++) {
      const rate = 0.7 + 0.8 * h1(i, seed + 80), ph = (age * rate + h1(i, seed + 81)) % 1;
      const a = h1(i, seed + 82) * TAU + ph * 0.25 * (i % 2 ? 1 : -1), rr = rho * (0.97 + (0.18 + 0.5 * fq) * ph) + ph * 6;
      const s = max(1, R((1 + 2 * h1(i, seed + 83)) * (1 - ph) * (rho > 90 ? 1.6 : 1)));
      const col = ph < 0.25 ? C.white : ph < 0.5 ? C.blush : ph < 0.75 ? C.lavender : C.violet;
      sq(ctx, x + cos(a) * rr, y + sin(a) * rr, s, fq > 0 ? dcol(col, 1 - fq * ph) : col);
    }
  }
  // a disc whose rim churns (two travelling sine lobes): energy bands that never sit still
  function wobDisc(ctx, x, y, r, col, amp, fq, ph) {
    const n = clamp(R(r * 0.45), 24, 96), P = new Array(n * 2);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU, k = 1 + amp * sin(fq * a + ph) + amp * 0.5 * sin((fq + 3) * a - ph * 1.3); P[2 * i] = x + cos(a) * r * k; P[2 * i + 1] = y + sin(a) * r * k; }
    fillPoly(ctx, P, col);
  }
  function purpleTrail(ctx, S, from, to, rm, fq, seed, age) {
    const n = 18, L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, P = [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(from[2], to[2], u)], sp = sphereScr(S, P[0], P[1], P[2], rm);
      if (!sp || sp.inside) continue;
      L.push(sp.x, sp.y); Rr.push(sp.rho * (0.35 + 0.55 * u));
    }
    const m = L.length / 2; if (m < 2) return;
    const strip = kf => {
      const left = [], right = [];
      for (let i = 0; i < m; i++) {
        const j0 = max(0, i - 1), j1 = min(m - 1, i + 1), dx = L[2 * j1] - L[2 * j0], dy = L[2 * j1 + 1] - L[2 * j0 + 1], D = hypot(dx, dy) || 1, w = max(0.6, Rr[i] * kf);
        left.push(L[2 * i] - (dy / D) * w, L[2 * i + 1] + (dx / D) * w); right.push(L[2 * i] + (dy / D) * w, L[2 * i + 1] - (dx / D) * w);
      }
      const P = left.slice();
      for (let i = m - 1; i >= 0; i--) P.push(right[2 * i], right[2 * i + 1]);
      return P;
    };
    const a = 1 - fq;
    fillPoly(ctx, strip(1.0), dcol(C.plum, a));
    fillPoly(ctx, strip(0.72), dcol(C.purple, a));
    fillPoly(ctx, strip(0.4), dcol(C.violet, a));
    polyline(ctx, L, dcol(C.lavender, a * 0.9));
    for (let i = 0; i < 24; i++) { // erased matter drifting up out of the channel
      const u = h1(i, seed + 90), j = min(m - 1, floor(u * m)), ph = (age * 0.8 + h1(i, seed + 91)) % 1;
      sq(ctx, L[2 * j] + h2(i, seed + 92) * Rr[j], L[2 * j + 1] - ph * Rr[j] * 1.5, 1, dcol(ph < 0.5 ? C.lavender : C.violet, a * (1 - ph)));
    }
  }

  // ---- dismantle  e.from/e.to (world or refs) | e.at + e.len (m) + e.angle (screen rad); e.cuts (1), e.stagger,
  //      e.linger (s: a faint cut line stays until the slide). Canon: an invisible slash — a hairline flash.
  function slash(ctx, x0, y0, x1, y1, a, seed, wk) {
    const f = fr(a); if (f > 9) return;
    wk = wk || 1;
    const dx = x1 - x0, dy = y1 - y0, L = hypot(dx, dy); if (L < 1) return;
    const nx = -dy / L, ny = dx / L, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (f === 0) {
      fillPoly(ctx, [x0, y0, mx + nx * 2.6 * wk, my + ny * 2.6 * wk, x1, y1, mx - nx * 2.6 * wk, my - ny * 2.6 * wk], dcol(C.ice, 0.55));
      fillPoly(ctx, [x0, y0, mx + nx * 1.1 * wk, my + ny * 1.1 * wk, x1, y1, mx - nx * 1.1 * wk, my - ny * 1.1 * wk], C.white);
      line(ctx, x0, y0, x1, y1, C.white);
    } else if (f === 1) {
      line(ctx, x0, y0, x1, y1, C.white);
      const u = 0.3 + 0.4 * h1(1, seed);
      sparkle(ctx, x0 + dx * u, y0 + dy * u, 3, C.white, null);
    } else {
      const s = min(0.95, (f - 1) * 0.15);
      const col = f <= 3 ? C.ice : dcol(C.ice, 1 - (f - 3) / 7);
      if (wk > 1.6 && f <= 3) taper(ctx, x0 + dx * s, y0 + dy * s, x1, y1, 1, wk * 1.2, col); else line(ctx, x0 + dx * s, y0 + dy * s, x1, y1, col);
    }
  }
  FX.dismantle = {
    dur: e => max(0.42, num(e.linger, 0)), layer: 'front', sfx: 'shing', vol: 0.8,
    draw(ctx, age, e, S) {
      let sg = null;
      if (e.from && e.to) sg = projSeg(S, e.from, e.to);
      else if (e.at) { const p = pj(S, e.at); if (p) { const L = (num(e.len, 6) * p.s) / 2, a = num(e.angle, -0.3); sg = [p.x - cos(a) * L, p.y - sin(a) * L, p.x + cos(a) * L, p.y + sin(a) * L]; } }
      if (!sg) return;
      const n = max(1, e.cuts || 1), seed = e.seed, x0 = sg[0], y0 = sg[1], x1 = sg[2], y1 = sg[3], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, len = hypot(x1 - x0, y1 - y0);
      for (let i = 0; i < n; i++) {
        const a = age - i * num(e.stagger, 0.035); if (a < 0) continue;
        if (!i) { slash(ctx, x0, y0, x1, y1, a, seed); continue; }
        const rot = h2(i, seed) * 0.16, sc = 0.55 + 0.45 * h1(i, seed + 1), off = h2(i, seed + 2) * (4 + len * 0.05), c = cos(rot), s = sin(rot);
        const ax = (x0 - mx) * sc, ay = (y0 - my) * sc, L = len || 1, ox = (-(y1 - y0) / L) * off, oy = ((x1 - x0) / L) * off;
        slash(ctx, mx + ax * c - ay * s + ox, my + ax * s + ay * c + oy, mx - ax * c + ay * s + ox, my - ax * s - ay * c + oy, a, seed + i);
      }
      if (e.linger && age > 0.12) line(ctx, x0, y0, x1, y1, dcol(C.ice, 0.4 * (1 - age / e.linger)));
    },
  };

  // ---- cleave  e.at (target, follows refs), e.r region (0.55 m), e.n cuts (16), e.span (0.3 s): a web of cuts
  FX.cleave = {
    dur: 0.5, layer: 'front', follow: true, sfx: 'cleave', vol: 0.85,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const Rp = max(9, num(e.r, 0.7) * p.s), n = e.n || 16, span = num(e.span, 0.3), seed = e.seed, wk = max(1, Rp / 22);
      for (let k = 0; k < n; k++) {
        const a = age - (span * (k + 0.6 * h1(k, seed))) / n; if (a < 0) continue;
        const rr = sqrt(h1(k, seed + 1)) * Rp * 0.75, th = h1(k, seed + 2) * TAU, cx = p.x + cos(th) * rr, cy = p.y + sin(th) * rr * 0.9;
        const ang = (h1(k, seed + 3) - 0.5) * PI * 0.9 + (k % 2 ? 0.5 : -0.5), L = Rp * (0.55 + 0.8 * h1(k, seed + 4)), dx = (cos(ang) * L) / 2, dy = (sin(ang) * L) / 2;
        const f = fr(a);
        if (f <= 4) { slash(ctx, cx - dx, cy - dy, cx + dx, cy + dy, a * 1.8, seed + k, wk); if (f === 0) { sq(ctx, cx + dx, cy + dy, 2, C.white); sq(ctx, cx - dx, cy - dy, 1, C.ice); } }
        else if (age < e.dur - 0.05) line(ctx, cx - dx * 0.8, cy - dy * 0.8, cx + dx * 0.8, cy + dy * 0.8, dcol(C.ice, 0.45));
      }
    },
  };

  // ---- worldCut  e.x/e.y (screen) or e.at (world), e.angle (rad, −0.38), e.grow (0.16 s), e.dur (1.2):
  //      one perfect line across the whole frame growing from a point (HT.post.split does the actual split)
  FX.worldCut = {
    dur: 1.2, layer: 'front', sfx: 'worldCut', vol: 0.9,
    draw(ctx, age, e, S) {
      let x = num(e.x, W / 2), y = num(e.y, H / 2);
      if (e.at && e.x === undefined) { const p = pj(S, e.at); if (p) { x = p.x; y = p.y; } }
      const a = num(e.angle, -0.38), ux = cos(a), uy = sin(a), nx = -uy, ny = ux, g = num(e.grow, 0.16);
      const L = hypot(W, H) * E.outCubic(min(1, age / g)) + 2, x0 = x - ux * L, y0 = y - uy * L, x1 = x + ux * L, y1 = y + uy * L, f = fr(age);
      if (f <= 3) { const c = dcol(C.ice, f <= 1 ? 0.9 : 0.5); line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny, c); line(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, c); }
      const pulse = age > g ? ((age - g) % 0.45) / 0.45 : 1;
      if (pulse < 0.3) { const c = dcol(C.ice, 0.5 * (1 - pulse / 0.3)); line(ctx, x0 + nx, y0 + ny, x1 + nx, y1 + ny, c); line(ctx, x0 - nx, y0 - ny, x1 - nx, y1 - ny, c); }
      line(ctx, x0, y0, x1, y1, C.white);
      if (age < g) { sq(ctx, x0, y0, 3, C.white); sq(ctx, x1, y1, 3, C.white); sparkle(ctx, x0, y0, 4, C.ice, null); sparkle(ctx, x1, y1, 4, C.ice, null); }
      if (f <= 2) sparkle(ctx, x, y, 6 - f * 2, C.white, C.ice);
    },
  };

  // ---- blackFlash  e.at (fist contact), e.dir heading, e.r burst radius (1.4 m), e.dur (0.55)
  //      a local red/ink 2-tone burst, jagged black lightning outlined in red (re-drawn on 2s), red-black sparks,
  //      a black shock ring.
  FX.blackFlash = {
    dur: 0.55, layer: 'front', sfx: 'blackFlash', vol: 1,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const seed = e.seed, x = p.x, y = p.y, f = fr(age), q = age / e.dur;
      const sc = e.scale || 1, Rb = clamp(num(e.r, 1.4) * sc * p.s, 26 * sc, 150 * sc), d = e.dir ? sdir(S, e.at, e.dir) : [1, 0, 1], base = atan2(d[1], d[0]);
      if (f <= 3) { // 2-tone burst inside a jagged star
        const k = f <= 1 ? 1 : 0.62, P = [];
        for (let i = 0; i < 22; i++) { const a = base + (i / 22) * TAU + h2(i, seed + 2) * 0.08, rr = Rb * k * (i % 2 ? 0.3 + 0.15 * h1(i, seed) : 0.7 + 0.55 * h1(i, seed + 1)) * (abs(cos(a - base)) > 0.8 ? 1.3 : 1); P.push(x + cos(a) * rr, y + sin(a) * rr); }
        twoTone(ctx, P, C.ink, f % 2 ? C.crimson : C.red, 96);
        if (f === 0) polyline(ctx, P, C.white, true);
      }
      if (f >= 2 && f <= 9) { const k = (f - 2) / 7, rr = Rb * (0.45 + 0.85 * E.outCubic(k)), th = max(1, R(4 * (1 - k))); annulus(ctx, x, y, rr - th - 1, rr + 1, dcol(C.red, 1 - k)); annulus(ctx, x, y, rr - th, rr, C.ink); }
      if (q < 0.8) { // lightning
        const g = floor(age * 12), rng = HT.rng(seed * 13 + g * 7919), nb = f < 6 ? 9 : 6, shrink = f < 6 ? 1 : 1 - (f - 6) / 12;
        const bolts = [];
        for (let i = 0; i < nb; i++) {
          const fwd = i < nb * 0.55, a = fwd ? base + (rng() - 0.5) * 1.8 : rng() * TAU, L = Rb * (0.55 + 0.75 * rng()) * shrink;
          const P = bolt(x, y, x + cos(a) * L, y + sin(a) * L, 0.55, 3, rng);
          bolts.push(P);
          if (rng() < 0.5) { const j = 2 * (2 + floor(rng() * 4)), ab = a + (rng() - 0.5) * 1.6, Lb = L * 0.4; bolts.push(bolt(P[j], P[j + 1], P[j] + cos(ab) * Lb, P[j + 1] + sin(ab) * Lb, 0.6, 2, rng)); }
        }
        const w0 = max(3, Rb / 22), wk = f < 6 ? 1 : 0.7;
        for (const P of bolts) boltDraw(ctx, P, (w0 + 2) * wk, 2.5 * wk, f < 3 ? C.red : C.crimson);
        for (const P of bolts) boltDraw(ctx, P, w0 * wk, 1, C.ink);
        if (f <= 2) { disc(ctx, x, y, max(3, Rb * 0.12), C.red); disc(ctx, x, y, max(2, Rb * 0.08), C.ink); }
      }
      for (let i = 0; i < 26; i++) { // sparks: red squares and black chips with drag
        const life = e.dur * (0.5 + 0.5 * h1(i, seed + 5)); if (age > life) continue;
        const a = i < 16 ? base + h2(i, seed + 6) * 1.2 : h1(i, seed + 7) * TAU, v = Rb * (5 + 7 * h1(i, seed + 8)), s1 = (v * (1 - exp(-5 * age))) / 5, k = age / life;
        const X = x + cos(a) * s1, Y = y + sin(a) * s1 + 50 * age * age;
        if (i % 3 === 0) { sq(ctx, X, Y, 3, C.red); sq(ctx, X, Y, 1, C.ink); } else sq(ctx, X, Y, k < 0.5 ? 2 : 1, i % 3 === 1 ? C.raspberry : C.crimson);
      }
    },
  };

  // ================================================================== DOMAINS
  // ---- barrier  e.center|e.at (ground point), e.r (12 m), e.state 'grow'|'hold', e.grow (1.2 s), e.col
  //      A dark dome (convex hull of the projected hemisphere), latitude structure, a shimmering band of hex cells
  //      near the silhouette, crackle on the rim, a bright contact ring while growing. Camera inside → dark veil.
  function domeScreen(S, c, r, nLon, nLat) {
    const cm = camOf(S), pts = [], tmp = [0, 0, 0], o = [0, 0];
    for (let j = 0; j <= nLat; j++) {
      const la = (j / nLat) * (PI / 2), rr = cos(la) * r, z = c[2] + sin(la) * r, nl = j === nLat ? 1 : nLon;
      for (let i = 0; i < nl; i++) {
        const lo = (i / nl) * TAU;
        toCam(cm, c[0] + cos(lo) * rr, c[1] + sin(lo) * rr, z, tmp, 0);
        if (tmp[2] < NEARC) continue;
        camScr(cm, tmp[0], tmp[1], tmp[2], o, 0);
        pts.push(o[0], o[1]);
      }
    }
    return pts;
  }
  function camInDome(S, c, r) { const cm = camOf(S), dx = cm.x - c[0], dy = cm.y - c[1], dz = cm.z - c[2]; return dz > -0.2 && dx * dx + dy * dy + dz * dz < r * r; }
  function domeBody(ctx, S, c, r, age, seed, k, pal, lite) {
    if (camInDome(S, c, r)) {
      ctx.fillStyle = rgba(pal.body, 0.82 * k); ctx.fillRect(VX0, VY0, VX1 - VX0 + 1, VY1 - VY0 + 1);
      for (let i = 0; i < 6; i++) { const y = VY0 + ((i + 0.5) / 6) * (VY1 - VY0) + sin(age + i) * 4; line(ctx, VX0, y, VX1, y + 6, dcol(pal.edge, 0.12 * k)); }
      return null;
    }
    const pts = domeScreen(S, c, r, 28, 7);
    if (pts.length < 6) return null;
    const hl = hull(pts);
    fillPoly(ctx, hl, pal.body);
    { // a faint sheen: the crown catches a little light (vertical gradient, quantized into dither)
      let yT = Infinity, yB = -Infinity;
      for (let i = 1; i < hl.length; i += 2) { yT = min(yT, hl[i]); yB = max(yB, hl[i]); }
      if (yB - yT > 6) { const gr = ctx.createLinearGradient(0, yT, 0, yT + (yB - yT) * 0.6); gr.addColorStop(0, rgba(pal.line, 0.95 * k)); gr.addColorStop(1, rgba(pal.line, 0)); fillPoly(ctx, hl, gr); }
    }
    const cm = camOf(S), view = [cm.x - c[0], cm.y - c[1], cm.z - c[2]], vl = hypot(view[0], view[1], view[2]) || 1;
    // latitude rings (front half, very dark structure lines)
    for (let j = 1; j <= (lite ? 0 : 3); j++) {
      const la = (j / 4) * (PI / 2), rr = cos(la) * r, z = c[2] + sin(la) * r, P = [];
      for (let i = 0; i <= 40; i++) { const lo = (i / 40) * TAU, X = c[0] + cos(lo) * rr, Y = c[1] + sin(lo) * rr, nd = (cos(lo) * cos(la) * view[0] + sin(lo) * cos(la) * view[1] + sin(la) * view[2]) / vl; const q = nd > 0.05 ? S.project(X, Y, z) : null; if (q) P.push(q.x, q.y); else if (P.length) { polyline(ctx, P, dcol(pal.line, 0.6)); P.length = 0; } }
      polyline(ctx, P, dcol(pal.line, 0.6));
    }
    // hex cells shimmering near the silhouette (fresnel band)
    for (let j = 0; j < (lite ? 0 : 6); j++) {
      const la = ((j + 0.5) / 6) * (PI / 2), nj = max(4, R(26 * cos(la))), cell = ((TAU / nj) * r * cos(la)) * 0.42;
      for (let i = 0; i < nj; i++) {
        const lo = ((i + (j % 2) * 0.5) / nj) * TAU, nx = cos(lo) * cos(la), ny = sin(lo) * cos(la), nz = sin(la);
        const nd = (nx * view[0] + ny * view[1] + nz * view[2]) / vl;
        if (nd < -0.02 || nd > 0.42) continue;
        const wave = 0.5 + 0.5 * sin(age * 3.2 - lo * 3 + j * 1.3 + seed), a = (1 - nd * 2) * (0.35 + 0.65 * wave) * k;
        const col = a > 0.62 ? pal.hi : a > 0.32 ? pal.edge : pal.line;
        const P3 = new Float64Array(18), T1 = perp([nx, ny, nz]);
        for (let v = 0; v < 6; v++) { const t = (v / 6) * TAU + PI / 6, ca = cos(t) * cell, sa = sin(t) * cell; P3[3 * v] = c[0] + nx * r + T1[0] * ca + T1[3] * sa; P3[3 * v + 1] = c[1] + ny * r + T1[1] * ca + T1[4] * sa; P3[3 * v + 2] = c[2] + nz * r + T1[2] * ca + T1[5] * sa; }
        polyline(ctx, projPoly(S, P3), dcol(col, min(1, a + 0.15)), true);
      }
    }
    // fresnel rim: a navy band inside the silhouette, an indigo edge, lavender glints where the edge faces the light
    const m0 = hl.length / 2;
    let cxh = 0, cyh = 0, rad = 0;
    for (let i = 0; i < m0; i++) { cxh += hl[2 * i]; cyh += hl[2 * i + 1]; }
    cxh /= m0; cyh /= m0;
    for (let i = 0; i < m0; i++) rad = max(rad, hypot(hl[2 * i] - cxh, hl[2 * i + 1] - cyh));
    const inset = kk => { const P = []; for (let i = 0; i < m0; i++) P.push(cxh + (hl[2 * i] - cxh) * kk, cyh + (hl[2 * i + 1] - cyh) * kk); return P; };
    fillPolys(ctx, [hl, inset(1 - min(0.12, 7 / max(rad, 1)))], dcol(pal.line, 0.5 * k));
    fillPolys(ctx, [hl, inset(1 - min(0.05, 2.5 / max(rad, 1)))], pal.line);
    polyline(ctx, hl, pal.edge, true);
    for (let i = 0; i < m0; i++) {
      const j = (i + 1) % m0, ex = hl[2 * j] - hl[2 * i], ey = hl[2 * j + 1] - hl[2 * i + 1], L = hypot(ex, ey) || 1, nx = ey / L, ny = -ex / L;
      const lit = -nx * 0.6 - ny * 0.8;
      if (lit > 0.55) line(ctx, hl[2 * i], hl[2 * i + 1], hl[2 * j], hl[2 * j + 1], lit > 0.85 ? pal.hi : dcol(pal.hi, 0.6));
    }
    { // specular streak on the upper left of the dome
      const B = basis(S), hx = view[0] / vl - B.r[0] * 0.9, hy = view[1] / vl - B.r[1] * 0.9, lon0 = atan2(hy, hx), P = [];
      for (let i = 0; i <= 10; i++) { const lo = lon0 - 0.3 + (i / 10) * 0.6, la = 0.95 + 0.1 * sin((i / 10) * PI), q = S.project(c[0] + cos(lo) * cos(la) * r, c[1] + sin(lo) * cos(la) * r, c[2] + sin(la) * r); if (q) P.push(q.x, q.y); }
      polyline(ctx, P, dcol(pal.edge, 0.9 * k));
    }
    // crackle along the silhouette (2s)
    const g = floor(age * 12), rng = HT.rng(seed * 17 + g * 331), m = hl.length / 2;
    for (let i = 0; i < 5; i++) {
      const j = floor(rng() * m), j2 = (j + 1) % m, ax = hl[2 * j], ay = hl[2 * j + 1], bx = hl[2 * j2], by = hl[2 * j2 + 1];
      if (hypot(bx - ax, by - ay) < 4) continue;
      polyline(ctx, bolt(ax, ay, bx, by, 0.35, 2, rng), rng() < 0.4 ? pal.hi : pal.edge);
    }
    return hl;
  }
  const DOME_PAL = { body: C.ink, line: C.navy, edge: C.indigo, hi: C.lavender, ring: C.ice };
  FX.barrier = {
    dur: 3, layer: 'behind', sfx: 'barrierUp', vol: 0.8,
    occ(e, S, age) {
      const c = e.center || e.at || [0, 0, 0], r = num(e.r, 12), gq = e.state === 'hold' ? 1 : min(1, age / num(e.grow, 1.2)), rr = r * E.outCubic(gq);
      return { d: occFwd(S, c) - rr * 0.6, box: occDome(S, c, rr * 1.1, rr * 1.05, 6) };
    },
    draw(ctx, age, e, S) {
      const c = e.center || e.at || [0, 0, 0], r = num(e.r, 12), seed = e.seed, pal = Object.assign({}, DOME_PAL, e.pal || {});
      const grow = num(e.grow, 1.2), gq = e.state === 'hold' ? 1 : min(1, age / grow), rr = r * E.outCubic(gq);
      if (rr < 0.05) return;
      domeBody(ctx, S, c, rr, age, seed, 1, pal);
      if (gq < 1) { // contact ring racing out on the ground + ripples on the growing surface
        const P = projPoly(S, circle3(c[0], c[1], c[2] + 0.03, rr * 1.01, 48));
        polyline(ctx, P, pal.ring, true);
        const P2 = projPoly(S, circle3(c[0], c[1], c[2] + 0.03, rr * 1.06, 48));
        polyline(ctx, P2, dcol(pal.hi, 0.5 * (1 - gq)), true);
      }
    },
  };
  // ---- barrierShatter  e.center, e.r, e.hit (world impact point, default: the top), e.crack (0.35 s), e.dur (1.8)
  //      cracks race over the dome from the impact, then triangular shards blow out, spin, fall and glint.
  FX.barrierShatter = {
    dur: 1.8, layer: 'behind', sfx: 'barrierShatter', vol: 1,
    occ(e, S) { const c = e.center || e.at || [0, 0, 0], r = num(e.r, 12); return { d: occFwd(S, c) - r, box: occDome(S, c, r * 2.2, r * 1.8, 10) }; },
    draw(ctx, age, e, S) {
      const c = e.center || e.at || [0, 0, 0], r = num(e.r, 12), seed = e.seed, crack = num(e.crack, 0.35), pal = Object.assign({}, DOME_PAL, e.pal || {});
      const shards = domeShards(c, r, seed), hit = e.hit || [c[0], c[1], c[2] + r];
      let dmax = 0; for (const s of shards) dmax = max(dmax, hypot(s.cx - hit[0], s.cy - hit[1], s.cz - hit[2]));
      if (age < crack) {
        domeBody(ctx, S, c, r, age, seed, 1, pal, true);
        const q = age / crack;
        for (const s of shards) { // jagged cracks at the racing front, settled (straight) cracks behind it
          const dd = hypot(s.cx - hit[0], s.cy - hit[1], s.cz - hit[2]) / (dmax || 1);
          if (dd > q * 1.15) continue;
          const P = projPoly(S, s.P), m = P.length / 2, front = dd > q * 0.72, col = dd > q * 0.8 ? pal.hi : C.white;
          for (let v = 0; v < m; v++) { const w = (v + 1) % m; if (front) edgeJag(ctx, P[2 * v], P[2 * v + 1], P[2 * w], P[2 * w + 1], col); else line(ctx, P[2 * v], P[2 * v + 1], P[2 * w], P[2 * w + 1], col); }
        }
        return;
      }
      const tau = age - crack, k = sat((age - e.dur * 0.55) / (e.dur * 0.45)), cm = camOf(S), f = fr(tau);
      if (f <= 1) { const pts = domeScreen(S, c, r, 20, 5); if (pts.length >= 6) fillPoly(ctx, hull(pts), dcol(f ? pal.edge : pal.hi, 0.5)); }
      const P3 = new Float64Array(9), groups = [[], [], [], []], edges = [];
      for (const s of shards) {
        const nx = (s.cx - c[0]) / r, ny = (s.cy - c[1]) / r, nz = (s.cz - c[2]) / r, sp = (1.5 + 3 * s.h) * (r / 12);
        const ox = nx * sp * tau, oy = ny * sp * tau, oz = nz * sp * tau * 0.6 - 4.9 * tau * tau * (0.8 + 0.5 * s.h), ang = s.w * tau;
        for (let v = 0; v < 3; v++) {
          let px = s.P[3 * v] - s.cx, py = s.P[3 * v + 1] - s.cy, pz = s.P[3 * v + 2] - s.cz;
          const ca = cos(ang), sa = sin(ang), ax = s.ax, ay = s.ay, az = s.az, dot = ax * px + ay * py + az * pz; // Rodrigues
          const rx = px * ca + (ay * pz - az * py) * sa + ax * dot * (1 - ca), ry = py * ca + (az * px - ax * pz) * sa + ay * dot * (1 - ca), rz = pz * ca + (ax * py - ay * px) * sa + az * dot * (1 - ca);
          P3[3 * v] = s.cx + ox + rx; P3[3 * v + 1] = s.cy + oy + ry; P3[3 * v + 2] = s.cz + oz + rz;
        }
        const P = projPoly(S, P3); if (P.length < 6) continue;
        let bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
        for (let v = 0; v < P.length; v += 2) { bx0 = min(bx0, P[v]); bx1 = max(bx1, P[v]); by0 = min(by0, P[v + 1]); by1 = max(by1, P[v + 1]); }
        if (bx1 < CX0 || bx0 > CX1 || by1 < CY0 || by0 > CY1) continue;
        const glint = (floor(ang * 1.1 + s.h * 7) % 12 === 0), gi = glint ? (s.h > 0.75 ? 3 : 2) : s.h > 0.7 ? 1 : 0;
        groups[gi].push(P);
        if (k < 0.8 && (glint || bx1 - bx0 + by1 - by0 > 12)) edges.push(P[0], P[1], P[2], P[3], glint ? 1 : 0);
      }
      const gcols = [pal.body, pal.line, pal.edge, pal.hi];
      for (let gi = 0; gi < 4; gi++) { // one path fill per colour: 240 shards cost 4 fill calls
        const fc = dcol(gcols[gi], 1 - k), G = groups[gi];
        if (!fc || !G.length) continue;
        ctx.fillStyle = fc; ctx.beginPath();
        for (const P of G) { ctx.moveTo(P[0], P[1]); for (let v = 2; v < P.length; v += 2) ctx.lineTo(P[v], P[v + 1]); ctx.closePath(); }
        ctx.fill();
      }
      for (let i = 0; i < edges.length; i += 5) { line(ctx, edges[i], edges[i + 1], edges[i + 2], edges[i + 3], dcol(edges[i + 4] ? C.white : pal.edge, 1 - k)); if (edges[i + 4] && k < 0.9) sparkle(ctx, edges[i], edges[i + 1], 2, C.white, null); }
      void cm;
    },
  };
  // a jagged crack along an edge; shared edges get the same seed (canonical endpoint order) so they overlap exactly
  function edgeJag(ctx, ax, ay, bx, by, col) {
    if (ax > bx || (ax === bx && ay > by)) { let t = ax; ax = bx; bx = t; t = ay; ay = by; by = t; }
    const rng = HT.rng((R(ax) * 73856093) ^ (R(ay) * 19349663) ^ (R(bx) * 83492791) ^ (R(by) * 2654435));
    polyline(ctx, bolt(ax, ay, bx, by, 0.22, 2, rng), col);
  }
  const shardCache = HT.lru(8);
  function domeShards(c, r, seed) {
    const key = c.join(',') + '|' + r + '|' + seed;
    let S = shardCache.get(key);
    if (S) return S;
    S = [];
    const nLon = 20, nLat = 6, jit = (i, j, k) => h2(i * 131 + j * 17 + k, seed) * 0.18;
    const V = (i, j) => { const lo = ((i % nLon) / nLon) * TAU + (j < nLat ? jit(i % nLon, j, 1) * (TAU / nLon) : 0), la = (j / nLat) * (PI / 2) + (j > 0 && j < nLat ? jit(i % nLon, j, 2) * (PI / 2 / nLat) : 0); return [c[0] + cos(lo) * cos(la) * r, c[1] + sin(lo) * cos(la) * r, c[2] + sin(la) * r]; };
    const tri = (a, b, d) => { const cx = (a[0] + b[0] + d[0]) / 3, cy = (a[1] + b[1] + d[1]) / 3, cz = (a[2] + b[2] + d[2]) / 3, n = S.length; const ax = h2(n, seed + 1), ay = h2(n, seed + 2), az = h2(n, seed + 3), L = hypot(ax, ay, az) || 1; S.push({ P: new Float64Array([...a, ...b, ...d]), cx, cy, cz, ax: ax / L, ay: ay / L, az: az / L, w: h2(n, seed + 4) * 7, h: h1(n, seed + 5) }); };
    for (let j = 0; j < nLat; j++) for (let i = 0; i < nLon; i++) {
      const a = V(i, j), b = V(i + 1, j), d = V(i + 1, j + 1), f = V(i, j + 1);
      if (j === nLat - 1) { tri(a, b, [c[0], c[1], c[2] + r]); continue; }
      if (h1(i * 7 + j, seed + 9) < 0.5) { tri(a, b, d); tri(a, d, f); } else { tri(a, b, f); tri(b, d, f); }
    }
    return shardCache.set(key, S);
  }

  // ---- voidBloom  e.x/e.y (screen) or e.at (world), e.r (px, default: fills the frame), e.grow (1.1 s), e.dur (3),
  //      e.bh (black-hole radius px). Canon: Unlimited Void's interior is outer space — a black hole with an
  //      accretion ring, galaxies, white specks; a prismatic fringe rides the opening edge.
  const galCache = HT.lru(12);
  HT.caches.push({ name: 'fx.galaxies', size: () => galCache.size });
  function galaxy(size, arms, seed) {
    const key = size + '|' + arms + '|' + seed;
    let g = galCache.get(key);
    if (g) return g;
    const cv = HT.canvas(size, size), c = size / 2, rng = HT.rng(seed), n = size * 7;
    const cols = [C.white, C.cream, C.ice, C.lavender, C.blush, C.lilacgrey, C.dusk];
    for (let i = 0; i < n; i++) {
      const t = pow(rng(), 0.8), a = (floor(rng() * arms) / arms) * TAU + t * 3.4 + (rng() - 0.5) * 0.5, rr = t * c * 0.95;
      const X = c + cos(a) * rr, Y = c + sin(a) * rr * 0.5;
      cv.g.fillStyle = cols[min(cols.length - 1, floor(t * 6 + rng() * 1.2))];
      cv.g.fillRect(floor(X), floor(Y), 1, 1);
    }
    cv.g.fillStyle = C.white; cv.g.fillRect(floor(c) - 1, floor(c), 3, 1); cv.g.fillRect(floor(c), floor(c) - 1, 1, 3);
    return galCache.set(key, cv.c);
  }
  const nebCache = HT.lru(3), nebJobs = {};
  HT.caches.push({ name: 'fx.nebula', size: () => nebCache.size });
  function* nebulaGen(seed) {
    const w = W + 100, h = H + 60, cv = HT.canvas(w, h), img = cv.g.createImageData(w, h), d32 = new Uint32Array(img.data.buffer);
    const pk = hx => { const c = rgb(hx); return (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
    const ramp = [C.plum, C.purple, C.indigo, C.navy, C.deepteal].map(pk), hi = [pk(C.violet), pk(C.rose), pk(C.blue), pk(C.blue), pk(C.teal)];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = HT.fbm(x / 150, y / 95, 4, seed), wisp = HT.fbm(x / 42 + 3, y / 27, 3, seed + 7);
        const dens = sm((n - 0.44) / 0.3) * (0.45 + 0.75 * wisp), th = (HT.BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
        if (dens > th) { const idx = min(4, floor(HT.noise(x / 220 + 11, y / 160, seed + 3) * 5.5)); d32[y * w + x] = dens > 0.8 && wisp > 0.62 ? hi[idx] : ramp[idx]; }
      }
      if ((y & 7) === 7) yield;
    }
    cv.g.putImageData(img, 0, 0);
    nebCache.set(seed, cv.c);
  }
  function nebulaTex(seed) {
    let c = nebCache.get(seed);
    if (c) return c;
    const job = nebJobs[seed] || nebulaGen(seed);
    while (!job.next().done) { /* drain synchronously (only if the boot warm-up has not built it) */ }
    delete nebJobs[seed];
    return nebCache.get(seed);
  }
  HT.bootTasks = HT.bootTasks || [];
  HT.bootTasks.push({ name: 'fx-nebula', fn: function* () { const job = (nebJobs[1] = nebulaGen(1)); while (!job.next().done) yield; delete nebJobs[1]; } });
  FX.voidBloom = {
    dur: 3, layer: 'behind', sfx: 'voidOpen', vol: 0.9,
    draw(ctx, age, e, S) {
      let x = num(e.x, W / 2), y = num(e.y, H / 2);
      if (e.at && e.x === undefined) { const p = pj(S, e.at); if (p) { x = p.x; y = p.y; } }
      const seed = e.seed, grow = num(e.grow, 1.1), Rmax = num(e.r, hypot(max(x, W - x), max(y, H - y)) + 4);
      const q = min(1, age / grow), Rr = Rmax * E.outCubic(q);
      if (Rr < 1) return;
      const full = Rr >= hypot(max(x - VX0, VX1 - x), max(y - VY0, VY1 - y));
      ctx.save();
      if (!full) { ctx.beginPath(); ctx.arc(x, y, Rr, 0, TAU); ctx.clip(); }
      const bx0 = max(VX0, x - Rr), by0 = max(VY0, y - Rr), bx1 = min(VX1 + 1, x + Rr), by1 = min(VY1 + 1, y + Rr);
      ctx.fillStyle = C.ink; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      const neb = nebulaTex(num(e.nebula, 1));   // fbm nebula in exact palette colours with dithered edges (built at boot)
      ctx.drawImage(neb, R(VX0 - 50 - age * 3), R(VY0 - 30 + age * 1));
      const drift = 1 + age * 0.06; // slow push into space: specks stream outward
      const layers = [[220, C.dusk, 1, 0.35], [110, C.steel, 1, 0.6], [50, C.white, 1, 1], [14, C.white, 2, 1.4]];
      for (let L = 0; L < 4; L++) {
        const [n, col, s, spd] = layers[L];
        for (let i = 0; i < n; i++) {
          const a = h1(i, seed + 10 + L) * TAU, d0 = pow(h1(i, seed + 20 + L), 0.7) * W * 0.62, dd = d0 * (1 + (drift - 1) * spd);
          const X = x + cos(a) * dd, Y = y + sin(a) * dd * 0.8;
          if (L === 3) { const tw = (floor(age * 6) + i) % 4; sparkle(ctx, X, Y, tw === 0 ? 2 : 1, C.white, null); }
          else sq(ctx, X, Y, s, (floor(age * 5) + i * 3) % 11 === 0 ? C.ice : col);
        }
      }
      for (let i = 0; i < 5; i++) {
        const size = 16 + floor(h1(i, seed + 30) * 30), a = h1(i, seed + 31) * TAU, d = (0.3 + 0.6 * h1(i, seed + 32)) * W * 0.46 * (1 + age * 0.03);
        ctx.drawImage(galaxy(size, 2 + (i % 2), seed + i * 101), R(x + cos(a) * d - size / 2), R(y + sin(a) * d * 0.75 - size / 2));
      }
      // black hole: lensed back rim, accretion disc (back half, hole, front half), photon ring
      const bh = num(e.bh, min(W, H) * 0.075) * sm(q * 1.6);
      const x_ = x, y_ = y;
      x = x_ + num(e.bhx, 0); y = clamp(y_ + num(e.bhy, -H * 0.2), VY0 + H * 0.2, VY1 - H * 0.2);
      if (bh > 1.5) {
        const tilt = -0.12, ct = cos(tilt), st = sin(tilt), rx = bh * 2.6, ry = bh * 0.34, spin = age * 1.3;
        annulus(ctx, x, y - bh * 0.1, bh * 1.35, bh * 1.75, dcol(C.lavender, 0.3), 0.95);
        annulus(ctx, x, y - bh * 0.1, bh * 1.12, bh * 1.35, C.blush, 0.95);
        annulus(ctx, x, y - bh * 0.1, bh * 1.12, bh * 1.2, C.cream, 0.95);
        const disk = (front) => {
          const bands = [[1, C.lavender], [0.86, C.blush], [0.74, C.ice], [0.62, C.cream]];
          for (const [f, col] of bands) {
            const P = [];
            for (let i = 0; i <= 40; i++) { const t = front ? (i / 40) * PI : PI + (i / 40) * PI, X = cos(t) * rx * f, Y = sin(t) * ry * f; P.push(x + X * ct - Y * st, y + X * st + Y * ct); }
            for (let i = 40; i >= 0; i--) { const t = front ? (i / 40) * PI : PI + (i / 40) * PI, X = cos(t) * rx * f * 0.8, Y = sin(t) * ry * f * 0.8; P.push(x + X * ct - Y * st, y + X * st + Y * ct); }
            fillPoly(ctx, P, col);
          }
          if (front) { const P = []; for (let i = 0; i <= 12; i++) { const t = PI * 0.62 + (i / 12) * PI * 0.36, X = cos(t) * rx * 0.95, Y = sin(t) * ry * 0.95; P.push(x + X * ct - Y * st, y + X * st + Y * ct); } for (let i = 12; i >= 0; i--) { const t = PI * 0.62 + (i / 12) * PI * 0.36, X = cos(t) * rx * 0.62, Y = sin(t) * ry * 0.62; P.push(x + X * ct - Y * st, y + X * st + Y * ct); } fillPoly(ctx, P, dcol(C.white, 0.5)); } // doppler-bright approaching side
          for (let i = 0; i < 14; i++) { const t = (h1(i, seed + 50) * TAU + spin) % TAU; if ((t < PI) !== front) continue; const f = 0.6 + 0.35 * h1(i, seed + 51), X = cos(t) * rx * f, Y = sin(t) * ry * f; sq(ctx, x + X * ct - Y * st, y + X * st + Y * ct, 1, C.white); }
        };
        disk(false);
        disc(ctx, x, y, bh, C.ink);
        disk(true);
        ring1(ctx, x, y, bh + 0.5, C.cream);
      }
      x = x_; y = y_;
      ctx.restore();
      if (!full) { // prismatic fringe on the opening edge
        const rings = [[0, 2, C.white], [2, 3, C.ice], [3, 4, C.foam], [4, 5, C.lavender], [5, 6, C.blush], [6, 7, C.gold]];
        for (const [a, b, col] of rings) annulus(ctx, x, y, Rr + a, Rr + b, dcol(col, 1 - q * 0.5));
        for (let i = 0; i < 16; i++) { const a = h1(i + floor(age * 12) * 16, seed) * TAU; sparkle(ctx, x + cos(a) * (Rr + 3), y + sin(a) * (Rr + 3), 2, C.white, null); }
      }
    },
  };

  // ---- shrineBloom  e.at (Sukuna's feet), e.r (crimson ground radius, 22 m), e.spread (1 s), e.back (m behind,
  //      7), e.h (shrine height, 20 m), e.rise (1.6 s), e.sky (tint strength 0–1), e.slashes (per s, 4)
  //      Malevolent Shrine: barrierless — crimson spreads over the real ground, a warped Buddhist shrine rises on a
  //      heap of cattle skulls (horned roofs, skull finial, four toothed mouths as doorways). Stylised, no gore.
  const skullCache = HT.lru(24);
  HT.caches.push({ name: 'fx.skulls', size: () => skullCache.size });
  function skull(N) {
    N = clamp(R(N), 3, 40);
    let s = skullCache.get(N);
    if (s) return s;
    const w = N + 2, h = ceil(N * 0.9) + 2, cv = HT.canvas(w, h), g = cv.g, cx = w / 2;
    const P = (pts, col) => { g.fillStyle = col; fillPolyRaw(g, pts); };
    if (N < 6) {
      g.fillStyle = C.cream; g.fillRect(R(cx - N * 0.3), 1, max(2, R(N * 0.6)), max(2, R(N * 0.5)));
      g.fillStyle = C.sand; g.fillRect(0, 0, 1, 1); g.fillRect(w - 1, 0, 1, 1);
      g.fillStyle = C.ink; g.fillRect(R(cx - 1), 2, 1, 1); if (N >= 4) g.fillRect(R(cx + 0.5), 2, 1, 1);
    } else {
      P([cx - N * 0.2, N * 0.18, cx - N * 0.52, N * 0.02, cx - N * 0.5, N * 0.14, cx - N * 0.26, N * 0.3], C.sand);    // horns
      P([cx + N * 0.2, N * 0.18, cx + N * 0.52, N * 0.02, cx + N * 0.5, N * 0.14, cx + N * 0.26, N * 0.3], C.sand);
      P([cx - N * 0.26, N * 0.12, cx + N * 0.26, N * 0.12, cx + N * 0.3, N * 0.42, cx + N * 0.15, N * 0.86, cx - N * 0.15, N * 0.86, cx - N * 0.3, N * 0.42], C.cream);
      P([cx + N * 0.05, N * 0.12, cx + N * 0.26, N * 0.12, cx + N * 0.3, N * 0.42, cx + N * 0.15, N * 0.86, cx + N * 0.02, N * 0.86], C.mist);
      const es = max(1, R(N / 8));
      g.fillStyle = C.ink; g.fillRect(R(cx - N * 0.2), R(N * 0.34), es + (N > 12 ? 1 : 0), es); g.fillRect(R(cx + N * 0.2) - es, R(N * 0.34), es + (N > 12 ? 1 : 0), es);
      g.fillRect(R(cx - N * 0.08), R(N * 0.72), max(1, R(N / 14)), max(1, R(N / 12))); g.fillRect(R(cx + N * 0.04), R(N * 0.72), max(1, R(N / 14)), max(1, R(N / 12)));
    }
    s = N >= 9 ? HT.outlined(cv.c, C.ink) : cv.c;
    return skullCache.set(N, s);
  }
  function fillPolyRaw(g, P) { // unclipped scanline fill for small sprite canvases
    let y0 = Infinity, y1 = -Infinity;
    for (let i = 1; i < P.length; i += 2) { y0 = min(y0, P[i]); y1 = max(y1, P[i]); }
    for (let y = ceil(y0 - 0.5); y <= floor(y1 - 0.5); y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const yi = P[i + 1], yj = P[j + 1]; if ((yi <= sy) !== (yj <= sy)) xs.push(P[i] + ((sy - yi) / (yj - yi)) * (P[j] - P[i])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = ceil(xs[k] - 0.5), b = floor(xs[k + 1] - 0.5); if (b >= a) g.fillRect(a, y, b - a + 1, 1); }
    }
  }
  // the shrine, drawn in metres around its base point (bx, by = screen of the ground point) at s px/m
  function drawShrine(ctx, bx, by, s, lift, age, seed, kScale) {
    const k = kScale;
    const X = x => bx + x * k * s * (1 + 0.012 * sin(x * 0.7));
    const Y = (y, x) => by - (y * k - lift) * s - (x !== undefined ? 0.035 * y * k * s * sin(x * 0.45 + 1) : 0);
    const poly = (pts, col) => { const P = []; for (let i = 0; i < pts.length; i += 2) P.push(X(pts[i]), Y(pts[i + 1], pts[i])); fillPoly(ctx, P, col); return P; };
    const edge = (pts, col) => { const P = []; for (let i = 0; i < pts.length; i += 2) P.push(X(pts[i]), Y(pts[i + 1], pts[i])); polyline(ctx, P, col); };
    const roof = (w, y0, y1, top, horn, lip) => {
      const P = [-w, y0, -w - horn * 0.5, y0 + horn * 0.9, -w - horn * 0.2, y0 + horn * 1.55, -w * 0.72, y0 + (y1 - y0) * 0.45, -top, y1, top, y1, w * 0.72, y0 + (y1 - y0) * 0.45, w + horn * 0.2, y0 + horn * 1.55, w + horn * 0.5, y0 + horn * 0.9, w, y0];
      poly(P, C.shadow);
      poly([-w * 0.9, y0 + 0.25, w * 0.9, y0 + 0.25, w * 0.62, y0 + (y1 - y0) * 0.55, -w * 0.62, y0 + (y1 - y0) * 0.55], C.wine);
      poly([-w, y0 - lip, w, y0 - lip, w, y0, -w, y0], C.ink);
      edge([-w - horn * 0.2, y0 + horn * 1.55, -w * 0.72, y0 + (y1 - y0) * 0.45, -top, y1, top, y1, w * 0.72, y0 + (y1 - y0) * 0.45, w + horn * 0.2, y0 + horn * 1.55], C.crimson);
      edge([-w, y0, w, y0], C.red);
    };
    // mound under the skulls
    poly([-12, 0, -9, 2.6, -5, 4.1, 0, 4.6, 5, 4.1, 9, 2.6, 12, 0], C.maroon);
    // main hall: body, pillars, four toothed mouths
    poly([-8, 4.3, 8, 4.3, 7.6, 10.2, -7.6, 10.2], C.ink);
    for (const px of [-7.1, -3.55, 0, 3.55, 7.1]) { poly([px - 0.45, 4.3, px + 0.45, 4.3, px + 0.4, 10.2, px - 0.4, 10.2], C.plum); edge([px + 0.4, 4.3, px + 0.35, 10.2], C.wine); }
    for (let m = 0; m < 4; m++) {
      const mx = -5.33 + m * 3.55, jaw = 0.25 * sin(age * 3 + m * 1.7);
      const P = poly([mx - 1.3, 4.8, mx + 1.3, 4.8, mx + 1.45, 7.2, mx + 0.9, 8.6, mx, 9.0, mx - 0.9, 8.6, mx - 1.45, 7.2], C.crimson);
      poly([mx - 1.05, 5.1 - jaw, mx + 1.05, 5.1 - jaw, mx + 1.2, 7.1, mx + 0.75, 8.3, mx, 8.6, mx - 0.75, 8.3, mx - 1.2, 7.1], C.ink);
      for (let t = 0; t < 5; t++) { const tx = mx - 0.84 + t * 0.42; poly([tx - 0.17, 8.2 - abs(t - 2) * 0.18, tx + 0.17, 8.2 - abs(t - 2) * 0.18, tx, 7.55 - abs(t - 2) * 0.18], C.cream); poly([tx - 0.17, 5.2 - jaw, tx + 0.17, 5.2 - jaw, tx, 5.8 - jaw], C.cream); }
      void P;
    }
    roof(10.4, 10.2, 12.6, 6.2, 1.9, 0.35);
    poly([-4.2, 12.5, 4.2, 12.5, 4, 15.2, -4, 15.2], C.ink);
    for (const px of [-3.6, -1.2, 1.2, 3.6]) poly([px - 0.3, 12.5, px + 0.3, 12.5, px + 0.28, 15.2, px - 0.28, 15.2], C.plum);
    poly([-0.8, 13, 0.8, 13, 0.8, 14.6, -0.8, 14.6], C.crimson);
    roof(6.6, 15.2, 17.3, 3.2, 1.4, 0.3);
    poly([-0.22, 17.2, 0.22, 17.2, 0.18, 18.6, -0.18, 18.6], C.bark);
    const sk = skull(2.8 * k * s);
    ctx.drawImage(sk, R(X(0) - sk.width / 2), R(Y(18.4) - sk.height * 0.95));
  }
  FX.shrineBloom = {
    dur: 4, layer: ['ground', 'behind'], sfx: 'shrineRise', vol: 1, parts: true,
    gbox(e, S, age) { // the screen box of the crimson pool (ground layer): the runner masks/composites only inside it
      const at = e.at || [0, 0, 0], rr = num(e.r, 22) * E.outCubic(min(1, age / num(e.spread, 1.0)));
      return occBox(S, [[at[0] - rr, at[1] - rr, 0.02], [at[0] + rr, at[1] - rr, 0.02], [at[0] - rr, at[1] + rr, 0.02], [at[0] + rr, at[1] + rr, 0.02]], 4);
    },
    occ(e, S) {
      if (S.fxLayer !== 'behind') return null;
      const at = e.at || [0, 0, 0], B = basis(S), back = num(e.back, 7), hN = hypot(B.f[0], B.f[1]) || 1, kS = num(e.h, 20) / 20;
      const base = [at[0] + (B.f[0] / hN) * back, at[1] + (B.f[1] / hN) * back, 0], c = S.cam || {}, rx = cos(c.yaw || 0), ry = -sin(c.yaw || 0), W2 = 14 * kS;
      const box = occBox(S, [[base[0] - rx * W2, base[1] - ry * W2, 0], [base[0] + rx * W2, base[1] + ry * W2, 0], [base[0] - rx * W2, base[1] - ry * W2, 23 * kS], [base[0] + rx * W2, base[1] + ry * W2, 23 * kS]], 8);
      return { d: occFwd(S, base) - 3, box };
    },
    draw(ctx, age, e, S) {
      const at = e.at || [0, 0, 0], seed = e.seed;
      if (S.fxLayer === 'ground') {
        const rr = num(e.r, 22) * E.outCubic(min(1, age / num(e.spread, 1.0)));
        if (rr < 0.05) return;
        const fn = a => 0.86 + 0.14 * HT.noise(cos(a) * 1.8 + 3, sin(a) * 1.8 + age * 0.5, seed);
        fillPoly(ctx, projPoly(S, circle3(at[0], at[1], 0.02, rr, 56, fn)), C.maroon);
        polyline(ctx, projPoly(S, circle3(at[0], at[1], 0.02, rr, 56, fn)), C.crimson, true);
        for (let i = 0; i < 4; i++) { const ph = (age * 0.35 + i / 4) % 1, r2 = rr * ph; if (r2 > 0.3) polyline(ctx, projPoly(S, circle3(at[0], at[1], 0.03, r2, 40)), dcol(C.wine, 1 - ph), true); }
        return;
      }
      const part = S.fxPart; // 'tint' (screen-wide grade + stray slashes) | 'body' (the structure) | undefined (both)
      const skyK = part === 'body' ? 0 : num(e.sky, 1) * sm(age / 1.2);
      if (skyK > 0.02) {
        const g = ctx.createLinearGradient(0, VY0, 0, VY1); // a red grade (multiply): the real city turns to the domain's hue
        g.addColorStop(0, rgba(C.crimson, 0.8 * skyK)); g.addColorStop(0.6, rgba(C.red, 0.45 * skyK)); g.addColorStop(1, rgba(C.red, 0.2 * skyK));
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(VX0, VY0, VX1 - VX0 + 1, VY1 - VY0 + 1); ctx.globalCompositeOperation = 'source-over';
      }
      const B = basis(S), back = num(e.back, 7), hN = hypot(B.f[0], B.f[1]) || 1;
      const base = [at[0] + (B.f[0] / hN) * back, at[1] + (B.f[1] / hN) * back, 0], pb = part === 'tint' ? null : pj(S, base);
      if (pb) {
        const kS = num(e.h, 20) / 20, q = min(1, age / num(e.rise, 1.6)), lift = -(1 - E.outCubic(q)) * 20 * kS;
        const shake = q < 1 ? R(sin(age * 60) * 1.2) : 0;
        ctx.save(); ctx.beginPath(); ctx.rect(VX0, VY0, VX1 - VX0 + 1, pb.y - VY0 + 1); ctx.clip();
        drawShrine(ctx, pb.x + shake, pb.y, pb.s, lift, age, seed, kS);
        const heap = 34; // bone-white cattle skulls piled on the mound
        const list = [];
        for (let i = 0; i < heap; i++) { const u = h2(i, seed + 3), v = pow(h1(i, seed + 4), 0.8); list.push([u * 11 * (1 - v * 0.55), v * 4.2 * (1 - abs(u) * 0.45), 0.9 + 0.6 * h1(i, seed + 5), i]); }
        list.sort((a, b) => b[1] - a[1]);
        for (const [sx, sy, sz, i] of list) { const sk = skull(sz * kS * pb.s), X = pb.x + shake + sx * kS * pb.s, Y = pb.y - (sy * kS + lift) * pb.s; if (i % 3 === 0) ctx.drawImage(HT.flipped(sk), R(X - sk.width / 2), R(Y - sk.height / 2)); else ctx.drawImage(sk, R(X - sk.width / 2), R(Y - sk.height / 2)); }
        ctx.restore();
      }
      const ns = part === 'body' ? 0 : num(e.slashes, 4);
      for (let i = 0; i < ns * e.dur; i++) { // the sure-hit area never stops cutting: stray hairline slashes
        const t0 = (i + h1(i, seed + 7)) / ns, a = age - t0;
        if (a < 0 || a > 0.3) continue;
        const X = VX0 + h1(i, seed + 8) * (VX1 - VX0), Yc = VY0 + h1(i, seed + 9) * (VY1 - VY0) * 0.8, L = 20 + 50 * h1(i, seed + 10), an = h2(i, seed + 11) * 0.9;
        slash(ctx, X - cos(an) * L, Yc - sin(an) * L, X + cos(an) * L, Yc + sin(an) * L, a, seed + i);
      }
    },
  };

  // ---- rctGlow  e.at (follows refs; default e.who + '.head'), e.who, e.r (0.35 m), e.steam: soft white-green glow,
  //      a slow ring, rising motes (Reverse Cursed Technique)
  FX.rctGlow = {
    dur: 2, layer: ['behind', 'front'], follow: true, sfx: 'rctHeal', vol: 0.6,
    draw(ctx, age, e, S) {
      const at = e.at || (S.pt ? S.pt((e.who || 'gojo') + '.head', S.t) : null), p = pj(S, at); if (!p) return;
      const k = envl(age, e.dur, 0.3, 0.5), seed = e.seed, rp = max(7, num(e.r, 0.35) * p.s), pulse = 0.88 + 0.12 * sin(on2(age) * 6);
      if (S.fxLayer === 'behind') { // the glow sits behind the fighter so the face stays clean
        glow(ctx, p.x, p.y, rp * 1.9 * pulse, C.mint, 0.5 * k);
        glow(ctx, p.x, p.y, rp * 1.15, C.foam, 0.6 * k);
        glow(ctx, p.x, p.y, rp * 0.6, C.white, 0.6 * k);
        return;
      }
      const rq = (age % 0.9) / 0.9;
      annulus(ctx, p.x, p.y, rp * (0.9 + rq) - 1, rp * (0.9 + rq), dcol(C.foam, 0.5 * k * (1 - rq)), 0.9);
      for (let i = 0; i < 16; i++) {
        const ph = (age * (0.5 + 0.4 * h1(i, seed)) + h1(i, seed + 1)) % 1, X = p.x + h2(i, seed + 2) * rp * 1.3 + sin(age * 3 + i) * 2, Y = p.y + rp * 0.9 - ph * rp * 3.4;
        sq(ctx, X, Y, ph < 0.4 && i % 3 === 0 ? 2 : 1, dcol(ph < 0.3 ? C.white : ph < 0.65 ? C.sprout : C.mint, k * (1 - ph * 0.7)));
      }
      if (e.steam) for (let i = 0; i < 5; i++) { const ph = (age * 0.6 + i / 5) % 1; puff(ctx, p.x + sin(i * 2 + age) * rp * 0.5, p.y - rp * (0.8 + ph * 2.5), rp * (0.2 + 0.35 * ph), STEAM, k * (1 - ph) * 0.6, seed + i); }
    },
  };

  // ---- wheel  e.who (attach above the head) | e.at, e.lift (m above the head, 0.5), e.r (0.4 m), e.from (notch),
  //      e.notch (target), e.turnAt [ages] (or evenly: e.first 0.6, e.every 0.9), e.mode 'halo' | 'spin' (lying on
  //      the ground, spinning at e.spinRate rad/s with a wobble), e.tilt. Mahoraga's eight-handled golden wheel:
  //      each adaptation turns it one notch (45°) with a clunk (outBack overshoot + a glint).
  function turnTimes(e) { // → ages. e.turnAt: scene times (same clock as t); e.turnIn: ages after t
    if (e.turnIn) return e.turnIn.slice();
    if (e.turnAt) { const t0 = e.t || 0, abs = e.turnAt.every(x => x >= t0 - 1e-6); return e.turnAt.map(x => (abs ? x - t0 : x)); }
    const n = max(0, (e.notch || 0) - (e.from || 0)), out = [];
    for (let i = 0; i < n; i++) out.push(num(e.first, 0.6) + i * num(e.every, 0.9));
    return out;
  }
  function wheelAngle(e, age) {
    let a = num(e.from, 0), glint = -1;
    const T = turnTimes(e), lim = e.notch !== undefined ? e.notch - num(e.from, 0) : T.length;
    for (let i = 0; i < T.length && i < lim; i++) {
      const x = age - T[i]; if (x < 0) break;
      a += x < 0.14 ? E.outBack(x / 0.14) : 1 + 0.035 * sin((x - 0.14) * 40) * exp(-(x - 0.14) * 16);
      if (x < 0.12) glint = x / 0.12;
    }
    return { a: a * (PI / 4), glint };
  }
  FX.wheel = {
    dur: 6, layer: 'front', follow: true, sfx: 'wheelClunk', sfxAt: 0.6, vol: 0.9,
    cues: e => (e.mode === 'spin' ? [{ t: 0, sfx: 'wheelTurn', vol: 0.6 }] : turnTimes(e).map(t => ({ t, sfx: 'wheelClunk', vol: 0.9 }))),
    draw(ctx, age, e, S) {
      const spin = e.mode === 'spin';
      let c = e.at, hgt = 1.8;
      if (!spin && e.who && S.at) { const a = S.at(e.who, S.t); hgt = a.h; c = [a.x, a.y, a.z + a.h * 0.95 + num(e.lift, 0.5) * (a.h / 1.8)]; }
      if (!c) return;
      const Rw = num(e.r, 0.4 * (hgt / 1.8)), B = basis(S);
      let u, v, rot, glint = -1, bob = 0;
      if (spin) {
        rot = age * num(e.spinRate, 5);
        const wa = age * 1.1, tilt = 0.32 + 0.1 * sin(age * 2.3); // a coin-like wobble: the wheel leans and precesses
        u = [cos(wa), sin(wa), tilt]; v = [-sin(wa), cos(wa), 0];
        c = [c[0], c[1], (c[2] || 0) + 0.06 + Rw * tilt * 0.9];
      } else {
        const wa = wheelAngle(e, age); rot = wa.a; glint = wa.glint; bob = glint >= 0 && glint < 0.5 ? 1 : 0;
        const tl = num(e.tilt, 0.12), ct = cos(tl), st = sin(tl);
        u = B.r; v = [B.u[0] * ct + B.f[0] * st, B.u[1] * ct + B.f[1] * st, B.u[2] * ct + B.f[2] * st];
      }
      const P = (rr, a) => { const ca = cos(a + rot) * rr * Rw, sa = sin(a + rot) * rr * Rw; return S.project(c[0] + u[0] * ca + v[0] * sa, c[1] + u[1] * ca + v[1] * sa, c[2] + u[2] * ca + v[2] * sa); };
      const pc = pj(S, c); if (!pc) return;
      const px = Rw * pc.s, wS = max(1, px * 0.11), ink = C.ink, oy = bob;
      const ringPts = (rr) => { const out = []; for (let i = 0; i < 40; i++) { const q = P(rr, (i / 40) * TAU); if (q) out.push(q.x, q.y + oy); } return out; };
      const spokes = [];
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, a0 = P(0.2, a), a1 = P(1.0, a), a2 = P(1.34, a), kn = P(1.42, a); if (a0 && a1 && a2 && kn) spokes.push([a0, a1, a2, kn]); }
      const outer = ringPts(1.1), inner = ringPts(0.86), mid = ringPts(0.66);
      // ink pass (outline) then gold pass
      fillPolys(ctx, [ringPts(1.1 + 1.4 / max(px, 1)), ringPts(max(0.6, 0.86 - 1.4 / max(px, 1)))], ink);
      for (const [a0, a1, a2, kn] of spokes) { thick(ctx, a0.x, a0.y + oy, a2.x, a2.y + oy, wS + 2, ink); disc(ctx, kn.x, kn.y + oy, max(1.5, px * 0.1) + 1, ink); }
      disc(ctx, pc.x, pc.y + oy, max(2, px * 0.22) + 1, ink);
      fillPolys(ctx, [outer, inner], C.gold);
      polyline(ctx, mid, C.amber, true);
      for (const [a0, a1, a2, kn] of spokes) { thick(ctx, a0.x, a0.y + oy, a2.x, a2.y + oy, wS, C.gold); disc(ctx, kn.x, kn.y + oy, max(1.5, px * 0.1), C.honey); }
      disc(ctx, pc.x, pc.y + oy, max(2, px * 0.22), C.gold);
      disc(ctx, pc.x, pc.y + oy, max(1, px * 0.09), C.rust);
      if (px > 6) { // light from the upper left: honey/butter on the top rim, amber on the lower right
        const hi = []; for (let i = 0; i < outer.length; i += 2) hi.push(outer[i], outer[i + 1]);
        for (let i = 0; i + 3 < outer.length; i += 2) { const mxp = (outer[i] + outer[i + 2]) / 2 - pc.x, myp = (outer[i + 1] + outer[i + 3]) / 2 - pc.y - oy, dd = (-mxp - myp) / (hypot(mxp, myp) || 1); if (dd > 0.45) line(ctx, outer[i], outer[i + 1], outer[i + 2], outer[i + 3], dd > 0.85 ? C.butter : C.honey); else if (dd < -0.5) line(ctx, outer[i], outer[i + 1], outer[i + 2], outer[i + 3], C.amber); }
        void hi;
      }
      if (glint >= 0) { const gi = floor(glint * 40) % 40, q = P(1.02, (gi / 40) * TAU); if (q) sparkle(ctx, q.x, q.y + oy, glint < 0.5 ? 3 : 2, C.white, C.butter); sparkle(ctx, pc.x, pc.y + oy, 2, C.white, null); }
    },
  };

  // ---- shadowPool  e.at (ground), e.r (2.2 m), e.grow (0.7 s), e.out (0.5 s recede), e.tendrils (7), e.wisps
  //      Ten Shadows: ink spreading on the ground with a wobbling edge and crawling tendrils, plum rim light
  FX.shadowPool = {
    dur: 3, layer: 'ground', sfx: 'shadowRise', vol: 0.7,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const r = num(e.r, 2.2), g = num(e.grow, 0.7), out = num(e.out, 0.5), seed = e.seed, T = e.dur;
      let k = E.outCubic(min(1, age / g)); if (age > T - out) k *= 1 - E.inQuad((age - (T - out)) / out);
      if (k <= 0.01) return;
      const fn = a => 0.78 + 0.3 * HT.noise(cos(a) * 1.7 + 9, sin(a) * 1.7 + age * 0.7, seed);
      const P = projPoly(S, circle3(at[0], at[1], (at[2] || 0) + 0.015, r * k, 48, fn));
      const nt = num(e.tendrils, 7), k2 = E.outCubic(sat((age - g * 0.3) / g)) * (age > T - out ? 1 - E.inQuad((age - (T - out)) / out) : 1);
      for (let i = 0; i < nt; i++) { // tendrils first so the pool's rim light sits on top
        const a0 = (i / nt) * TAU + h2(i, seed + 1) * 0.4, len = r * (0.6 + 0.9 * h1(i, seed + 2)) * k2, n = 14, L = [], Rr = [];
        for (let j = 0; j <= n; j++) {
          const u = j / n, a = a0 + sin(u * 6 + age * 2.4 + i * 1.7) * 0.28 * u + u * u * 0.5 * (i % 2 ? 1 : -1), rr = r * k * 0.8 + len * u;
          const q = S.project(at[0] + cos(a) * rr, at[1] + sin(a) * rr, (at[2] || 0) + 0.02); if (!q) continue;
          L.push(q.x, q.y); Rr.push(max(0.5, 0.13 * pow(1 - u, 1.4) * q.s));
        }
        for (let j = 0; j + 1 < Rr.length; j++) taper(ctx, L[2 * j], L[2 * j + 1], L[2 * j + 2], L[2 * j + 3], Rr[j] * 2, Rr[j + 1] * 2, C.ink);
      }
      fillPoly(ctx, P, C.ink);
      polyline(ctx, P, dcol(C.plum, 0.9), true);
      const P2 = projPoly(S, circle3(at[0], at[1], (at[2] || 0) + 0.02, r * k * 0.62, 36, fn));
      polyline(ctx, P2, dcol(C.shadow, 0.5), true);
      if (e.wisps !== false) for (let i = 0; i < 8; i++) { // ink wisps rising from the pool
        const ph = (age * 0.8 + h1(i, seed + 5)) % 1, a = h1(i, seed + 6) * TAU, rr = r * k * 0.7 * h1(i, seed + 7);
        const q = S.project(at[0] + cos(a) * rr, at[1] + sin(a) * rr, (at[2] || 0) + ph * 1.4); if (!q) continue;
        sq(ctx, q.x, q.y, ph < 0.5 ? 2 : 1, dcol(ph < 0.5 ? C.ink : C.plum, k * (1 - ph)));
      }
    },
  };

  // ---- glyphs (abstract runes, never real text): strokes between grid nodes, some mirrored
  const glyphCache = new Map(); // bounded by construction: 2 sizes × 48 glyphs × the few colours used
  HT.caches.push({ name: 'fx.glyphs', size: () => glyphCache.size });
  const GLYPH_N = 48;
  let GLYPH_BITS = null;
  function glyphBits() {
    if (GLYPH_BITS) return GLYPH_BITS;
    GLYPH_BITS = { s: [], l: [] };
    for (const [key, gw, gh, nx, ny, strokes] of [['s', 3, 5, 2, 3, 3], ['l', 5, 7, 3, 4, 4]]) {
      for (let gI = 0; gI < GLYPH_N; gI++) {
        const rng = HT.rng(9001 + gI * 37 + (key === 'l' ? 5 : 0)), bits = new Uint8Array(gw * gh), mirror = rng() < 0.45;
        const node = () => [floor(rng() * nx) * 2, floor(rng() * ny) * 2];
        let [cx, cy] = node();
        for (let s = 0; s < strokes + floor(rng() * 2); s++) {
          const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, 2], [2, -2], [-2, -2]], d = dirs[floor(rng() * (s ? 8 : 4))];
          const tx = clamp(cx + d[0], 0, (nx - 1) * 2), ty = clamp(cy + d[1], 0, (ny - 1) * 2);
          const n = max(abs(tx - cx), abs(ty - cy));
          for (let k = 0; k <= n; k++) { const X = R(cx + ((tx - cx) * k) / (n || 1)), Y = R(cy + ((ty - cy) * k) / (n || 1)); bits[Y * gw + X] = 1; if (mirror) bits[Y * gw + (gw - 1 - X)] = 1; }
          if (rng() < 0.3) [cx, cy] = node(); else { cx = tx; cy = ty; }
        }
        if (rng() < 0.35) bits[floor(rng() * gh) * gw + floor(rng() * gw)] = 1;
        GLYPH_BITS[key].push({ w: gw, h: gh, bits });
      }
    }
    return GLYPH_BITS;
  }
  function glyph(size, idx, col) {
    const key = size + (idx % GLYPH_N) + col;
    let c = glyphCache.get(key);
    if (c) return c;
    if (glyphCache.size > 1200) glyphCache.clear();
    const G = glyphBits()[size][idx % GLYPH_N], cv = HT.canvas(G.w, G.h);
    cv.g.fillStyle = col;
    for (let i = 0; i < G.bits.length; i++) if (G.bits[i]) cv.g.fillRect(i % G.w, floor(i / G.w), 1, 1);
    glyphCache.set(key, cv.c);
    return cv.c;
  }
  const PRISM = [C.white, C.ice, C.foam, C.lavender, C.blush, C.white, C.aqua, C.gold];

  // ---- infoStream  e.at (target, follows refs), e.n streams (14), e.speed (1.1), e.curl, e.dur
  //      Unlimited Void's infinite information: streams of glyphs pouring into the target, prismatic, shrinking to
  //      dots as they arrive; the target pulses with overload.
  FX.infoStream = {
    dur: 3, layer: ['behind', 'front'], follow: true, sfx: 'tinnitus', vol: 0.35,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      if (S.fxLayer === 'behind') { const pr = max(4, 0.25 * p.s); glow(ctx, p.x, p.y, pr * (2.5 + 0.8 * sin(on2(age) * 9)), C.ice, 0.55 * envl(age, e.dur, 0.4, 0.3)); return; }
      const n = e.n || 18, seed = e.seed, k = envl(age, e.dur, 0.4, 0.3), Rs = num(e.reach, hypot(W, H) * 0.62), per = 14;
      for (let i = 0; i < n; i++) {
        const th = (i / n) * TAU + h2(i, seed) * 0.3, curl = num(e.curl, 0.9) * (i % 2 ? 1 : -1), spd = num(e.speed, 1.1) * (0.8 + 0.4 * h1(i, seed + 1));
        { let px0 = 0, py0 = 0; const gc = k > 0.5 ? (i % 3 ? C.navy : C.indigo) : dcol(C.navy, k * 2); for (let j = 0; j <= 16; j++) { const u = j / 16, rr = Rs * pow(1 - u, 1.35) + 2, a = th + curl * u * u, X = p.x + cos(a) * rr, Y = p.y + sin(a) * rr * 0.8; if (j && rr < Rs * k + 4) line(ctx, px0, py0, X, Y, gc); px0 = X; py0 = Y; } }
        for (let j = 0; j < per; j++) {
          const u = (age * spd * 0.55 + j / per + h1(i, seed + 2)) % 1, rr = Rs * pow(1 - u, 1.35) + 2, a = th + curl * u * u;
          if (rr > Rs * k + 4) continue;
          const X = p.x + cos(a) * rr, Y = p.y + sin(a) * rr * 0.8, idx = floor(h1(i * per + j, seed + 3) * 1e6) + floor(age * 6 + j);
          const col = PRISM[(i + j + floor(age * 8)) % PRISM.length];
          if (u < 0.45) { const gI = glyph('l', idx, col); ctx.drawImage(gI, R(X - 2), R(Y - 3)); }
          else if (u < 0.8) { const gI = glyph('s', idx, col); ctx.drawImage(gI, R(X - 1), R(Y - 2)); }
          else sq(ctx, X, Y, 1, col);
        }
      }
      if (fr(age) % 4 < 2) sparkle(ctx, p.x, p.y, R(max(4, 0.25 * p.s) * 0.8), C.white, null);
    },
  };

  // ---- glyphRings  e.at (follows refs), e.r (1.2 m), e.rings (3), e.stagger (0.35 s), e.flat (vertical squash, 1),
  //      e.col: concentric rings of rotating runes — Gojo's incantation made visible
  FX.glyphRings = {
    dur: 4, layer: ['behind', 'front'], follow: true, sfx: 'sixEyes', vol: 0.6,
    draw(ctx, age, e, S) {
      const p = pj(S, e.at); if (!p) return;
      const Rb = max(18, num(e.r, 1.2) * p.s), nR = e.rings || 3, stg = num(e.stagger, 0.35), fl = num(e.flat, 1), seed = e.seed, out = envl(age, e.dur, 0, 0.4);
      if (S.fxLayer === 'behind') { glow(ctx, p.x, p.y, Rb * (0.6 + 0.6 * sat(age / (nR * stg + 0.3))), e.col || C.violet, 0.35 * out * sat(age / 0.4)); return; }
      for (let kR = 0; kR < nR; kR++) {
        const a0 = age - kR * stg; if (a0 < 0) continue;
        const sc = E.outBack(min(1, a0 / 0.3)), rr = Rb * (0.5 + 0.34 * kR) * sc, w = (kR % 2 ? -1 : 1) * (0.55 + 0.2 * kR), rot = w * age + h1(kR, seed) * TAU;
        const lineC = dcol(kR === nR - 1 ? C.lavender : C.violet, 0.9 * out);
        annulus(ctx, p.x, p.y, rr + 4, rr + 5, lineC, fl); annulus(ctx, p.x, p.y, rr - 6, rr - 5, lineC, fl);
        const ticks = 24;
        for (let t = 0; t < ticks; t++) { const a = rot + (t / ticks) * TAU; line(ctx, p.x + cos(a) * (rr + 5), p.y + sin(a) * (rr + 5) * fl, p.x + cos(a) * (rr + 7), p.y + sin(a) * (rr + 7) * fl, lineC); }
        const big = rr > 36, gw = big ? 5 : 3, gh = big ? 7 : 5, count = max(6, floor((TAU * rr) / (gw + 4)));
        for (let j = 0; j < count; j++) {
          const a = rot + (j / count) * TAU, X = p.x + cos(a) * rr, Y = p.y + sin(a) * rr * fl;
          const hl = ((j / count + age * 0.35 * (kR % 2 ? -1 : 1)) % 1 + 1) % 1 < 0.08;
          const col = hl ? C.white : kR % 2 ? C.ice : C.lavender;
          if (out < 1 && h1(j, seed + kR) > out) continue;
          ctx.drawImage(glyph(big ? 'l' : 's', floor(h1(j * 7 + kR, seed + 5) * 1e6), col), R(X - gw / 2), R(Y - gh / 2));
        }
      }
    },
  };

  // ================================================================== PHYSICAL
  // ---- shockwave  e.at (ground centre), e.r (m, 6 + 3·strength), e.strength 1–3, e.dur (0.9), e.air (true),
  //      e.dust (true), e.col (dust palette). Ground ring = circle that thins as it grows (fast, then slow), a white
  //      leading edge, an air-refraction ring, dust puffs along the front (far half behind the fighters).
  FX.shockwave = {
    dur: 0.9, layer: ['ground', 'behind', 'front'], sfx: 'boom', vol: 0.9,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const st = clamp(e.strength || 2, 1, 3), T = e.dur, q = age / T, seed = e.seed, gz = num(e.z, 0), pal = dustPal(e);
      const Rm = num(e.r, 6 + 3 * st), rr = Rm * E.outCubic(min(1, q * 1.08));
      if (S.fxLayer === 'ground') {
        const th = Rm * (0.24 - 0.14 * q), ring = r => projPoly(S, circle3(at[0], at[1], gz + 0.02, max(0.01, r), 56));
        const po = ring(rr), pi = ring(rr - th), pi2 = ring(rr - th * 2);
        fillPolys(ctx, [po, pi], dcol(pal[1], 0.9 * (1 - q)));
        fillPolys(ctx, [pi, pi2], dcol(pal[2], 0.55 * (1 - q)));
        polyline(ctx, ring(rr - Rm * 0.02), dcol(pal[0], 1 - q), true);
        polyline(ctx, po, dcol(C.white, 1 - q * q), true);
        return;
      }
      const pc = S.project(at[0], at[1], gz); if (!pc) return;
      if (S.fxLayer === 'front' && e.air !== false && q < 0.5) {
        const pa = S.project(at[0], at[1], gz + 1.2);
        if (pa) { const ra = rr * pa.s, A = 3 * st * (1 - q / 0.5), wv = max(3, ra * 0.08); if (ra > 4 && !warp(ctx, pa.x, pa.y, ra + wv * 2.5, dd => { const u = (dd - ra) / wv; return dd + A * u * exp(-u * u); })) ring1(ctx, pa.x, pa.y, ra, dcol(C.white, 0.35 * (1 - q / 0.5))); }
      }
      if (e.dust === false) return;
      const n = 16 + 6 * st, grow = E.outCubic(min(1, q * 1.6)), shrink = q > 0.5 ? 1 - ((q - 0.5) / 0.5) * 0.7 : 1;
      for (let i = 0; i < n; i++) { // dust kicked up just behind the front, low, dissolving by shrinking
        const a = (i / n) * TAU + h2(i, seed) * 0.25, rr2 = rr * (0.84 + 0.12 * h1(i, seed + 1));
        if (rr2 < Rm * 0.08) continue;
        const P = S.project(at[0] + cos(a) * rr2, at[1] + sin(a) * rr2, gz + 0.1 + (0.2 + 0.9 * h1(i, seed + 2)) * q * (0.5 + 0.25 * st));
        if (!P || (P.d > pc.d) !== (S.fxLayer === 'behind')) continue;
        const size = (0.16 + 0.34 * grow) * (0.7 + 0.6 * h1(i, seed + 3)) * (0.6 + 0.25 * st) * shrink;
        puff(ctx, P.x, P.y, size * P.s, pal, q > 0.55 ? 1 - (q - 0.55) / 0.45 : 1, seed + i);
      }
      for (let i = 0; i < n * 2; i++) { // grit flung ahead of the front
        const a = h1(i, seed + 9) * TAU, rr2 = rr * (1 + 0.08 * h1(i, seed + 10)), z = gz + q * (1 - q) * 4 * (0.3 + 0.8 * h1(i, seed + 11));
        const P = S.project(at[0] + cos(a) * rr2, at[1] + sin(a) * rr2, z);
        if (!P || (P.d > pc.d) !== (S.fxLayer === 'behind')) continue;
        sq(ctx, P.x, P.y, P.s > 40 ? 2 : 1, dcol(i % 3 ? pal[2] : pal[3], 1 - q));
      }
    },
  };

  // ---- dust  e.at, e.n (8), e.r spread (1.2 m), e.size (0.5 m), e.rise (m/s, 0.6), e.dir bias, e.col, e.dur (1.2)
  FX.dust = {
    dur: 1.2, layer: 'front',
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const n = e.n || 8, T = e.dur, seed = e.seed, pal = dustPal(e), spread = num(e.r, 1.2), size = num(e.size, 0.38), rise = num(e.rise, 0.6);
      const items = [];
      for (let i = 0; i < n; i++) {
        const life = T * (0.7 + 0.3 * h1(i, seed)), a = age / life; if (a >= 1) continue;
        let th = h1(i, seed + 1) * TAU;
        if (e.dir) th = atan2(e.dir[1], e.dir[0]) + h2(i, seed + 1) * 1.3;
        const dd = spread * (0.4 + 0.6 * h1(i, seed + 2)) * (1 - exp(-4 * age)), z = (at[2] || 0) + 0.15 + rise * age * (0.6 + 0.8 * h1(i, seed + 3));
        const P = S.project(at[0] + cos(th) * dd, at[1] + sin(th) * dd, z); if (!P) continue;
        const grow = size * (0.45 + 0.9 * E.outCubic(min(1, a * 1.6))) * (0.7 + 0.5 * h1(i, seed + 4)), shrink = a > 0.55 ? 1 - (a - 0.55) / 0.45 : 1;
        items.push([P.d, P.x, P.y, grow * shrink * P.s, a > 0.7 ? 1 - (a - 0.7) / 0.3 : 1, i]);
      }
      items.sort((a, b) => b[0] - a[0]);
      for (const [, x, y, r, al, i] of items) puff(ctx, x, y, r, pal, al * num(e.alpha, 0.85), seed + i);
    },
  };

  // ---- debris  e.at, e.n (14), e.speed (8 m/s), e.size (0.35 m), e.dir heading bias, e.spread (0–1 cone, 1),
  //      e.up (vertical bias, 0.6), e.g (9.8), e.bounce (0.35), e.mat 'concrete'|'asphalt'|'brick'|'stone',
  //      e.dur (2.5). Sprite-stacked chunks (voxel-ish slices rotated per yaw angle, cached), analytic ballistic
  //      paths p(t) = p0 + v t − ½ g t² with up to 3 bounces, spin that dies with each bounce.
  const CHUNK_MATS = { concrete: [C.steel, C.lilacgrey, C.dusk, C.shadow], asphalt: [C.dusk, C.shadow, C.charcoal, C.ink], brick: [C.clay, C.rust, C.wine, C.maroon], stone: [C.steel, C.lilacgrey, C.dusk, C.shadow], bone: [C.cream, C.sand, C.rosewood, C.mauve] };
  const CHUNK_SIZES = [3, 4, 5, 6, 8, 10, 13, 16, 20, 26, 32];
  const chunkCache = HT.lru(360), sliceCache = HT.lru(90);
  HT.caches.push({ name: 'fx.chunks', size: () => chunkCache.size + sliceCache.size });
  function chunkSlices(type, mat, N) {
    const key = type + '|' + mat + '|' + N;
    let sl = sliceCache.get(key);
    if (sl) return sl;
    const pal = CHUNK_MATS[mat] || CHUNK_MATS.concrete, rng = HT.rng(type * 7919 + 13), nv = 4 + (type % 3), ns = max(2, R(N * (0.3 + 0.18 * (type % 3))));
    const radii = [], ang = [], ex = 1 + 0.45 * (type % 2); // angular slabs: few corners, uneven radii, some elongated
    for (let i = 0; i < nv; i++) { radii.push(0.5 + 0.5 * rng()); ang.push(((i + 0.35 * (rng() - 0.5)) / nv) * TAU + type); }
    sl = [];
    for (let s = 0; s < ns; s++) {
      const h = ns > 1 ? s / (ns - 1) : 1, prof = h < 0.8 ? 1 : 0.86;
      const cv = HT.canvas(N, N), P = [];
      for (let i = 0; i < nv; i++) { const a = ang[i], rr = radii[i] * prof * (N / 2 - 0.5); P.push(N / 2 + cos(a) * rr * min(1, ex * 0.8), N / 2 + sin(a) * rr / ex); }
      cv.g.fillStyle = s === ns - 1 ? pal[0] : s >= ns - 2 ? pal[1] : s === 0 ? pal[3] : pal[2];
      fillPolyRaw(cv.g, P);
      if (s === ns - 1 && N >= 6) { cv.g.fillStyle = pal[1]; cv.g.fillRect(floor(N / 2), floor(N / 2), 1, 1); cv.g.fillRect(floor(N / 2) + 1, floor(N / 2) - 1, 1, 1); }
      sl.push(cv.c);
    }
    return sliceCache.set(key, sl);
  }
  function chunkSprite(type, mat, N, ai) {
    const key = type + '|' + mat + '|' + N + '|' + ai;
    let c = chunkCache.get(key);
    if (c) return c;
    const sl = chunkSlices(type, mat, N), sz = ceil(N * 1.5) + sl.length + 2, cv = HT.canvas(sz, sz);
    HT.stack(cv.g, sl, sz / 2, sz / 2 + sl.length / 2, (ai / 16) * TAU, { spacing: 1 });
    c = HT.outlined(cv.c, C.ink);
    return chunkCache.set(key, c);
  }
  // analytic bouncing ballistic motion: returns [x, y, z, spinFactor, restingAge]
  function bounce(p0, v, g, rest, t, groundZ) {
    let x = p0[0], y = p0[1], z = p0[2], vx = v[0], vy = v[1], vz = v[2], tt = t, sp = 1;
    for (let b = 0; b < 4; b++) {
      const disc2 = vz * vz + 2 * g * (z - groundZ), tHit = g > 0 ? (vz + sqrt(max(0, disc2))) / g : Infinity;
      if (tt < tHit || b === 3) {
        if (b === 3 && tt >= tHit) return [x + vx * tHit, y + vy * tHit, groundZ, 0, tt - tHit];
        return [x + vx * tt, y + vy * tt, z + vz * tt - 0.5 * g * tt * tt, sp, -1];
      }
      x += vx * tHit; y += vy * tHit; z = groundZ;
      const vzi = vz - g * tHit;
      vz = -vzi * rest; vx *= 0.55; vy *= 0.55; tt -= tHit; sp *= 0.5;
      if (vz < 0.6) return [x, y, groundZ, 0, tt];
    }
    return [x, y, z, 0, tt];
  }
  // suction (e.pull point, or a negative e.speed = pull into e.at): chunks lift off the ground within e.r of the
  // target and are dragged in on accelerating, slightly spiralling paths, shrinking as they are crushed
  function debrisPull(ctx, age, e, S, target) {
    const at = e.at, n = e.n || 14, seed = e.seed, size = num(e.size, 0.35), R0 = num(e.r, 4), T = e.dur, mat = e.mat || 'concrete', items = [];
    for (let i = 0; i < n; i++) {
      const a0 = h1(i, seed + 1) * TAU, r0 = R0 * (0.35 + 0.65 * h1(i, seed + 2)), delay = h1(i, seed + 3) * T * 0.45, travel = T * (0.35 + 0.25 * h1(i, seed + 4));
      const u = sat((age - delay) / travel); if (u >= 1) continue;
      const q = E.inCubic(u), sp = (1 - q) * r0, ang = a0 + q * (1.2 + h1(i, seed + 5));
      const x = target[0] + cos(ang) * sp, y = target[1] + sin(ang) * sp, z = lerp(max(0, (at[2] || 0) - 0.3), target[2], q) + sin(PI * u) * 0.8 * (0.5 + h1(i, seed + 6));
      const P = S.project(x, y, z); if (!P) continue;
      const px = size * (0.5 + h1(i, seed + 7)) * P.s * (1 - 0.7 * q * q);
      items.push([P.d, P.x, P.y, px, h1(i, seed + 8) * TAU + q * 9 * (i % 2 ? 1 : -1), i]);
    }
    items.sort((a, b) => b[0] - a[0]);
    for (const [, x, y, px, ang, i] of items) {
      if (px < 2.5) { sq(ctx, x, y, px < 1.5 ? 1 : 2, i % 2 ? CHUNK_MATS[mat][1] : CHUNK_MATS[mat][2]); continue; }
      let N = CHUNK_SIZES[0]; for (const s2 of CHUNK_SIZES) if (s2 <= px * 1.05) N = s2;
      const spr = chunkSprite(i % 6, mat, N, floor(((((ang / TAU) % 1) + 1) % 1) * 16) % 16);
      ctx.drawImage(spr, R(x - spr.width / 2), R(y - spr.height / 2));
    }
  }
  FX.debris = {
    dur: 2.5, layer: 'front', sfx: 'rubble', vol: 0.8,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      if (e.pull || num(e.speed, 8) < 0) { debrisPull(ctx, age, e, S, e.pull || [at[0], at[1], max(1, at[2] || 0)]); return; }
      const n = e.n || 14, seed = e.seed, speed = num(e.speed, 8), size = num(e.size, 0.35), g = num(e.g, 9.8), rest = num(e.bounce, 0.35), T = e.dur;
      const gz = num(e.ground, 0), spread = num(e.spread, 1), up = num(e.up, 0.6), mat = e.mat || 'concrete';
      const dh = e.dir ? heading3(e.dir) : null, fade = sat((age - T * 0.8) / (T * 0.2));
      const items = [];
      for (let i = 0; i < n; i++) {
        let vx, vy, vz;
        const sp = speed * (0.45 + 0.75 * h1(i, seed + 1));
        if (dh) { const a = atan2(dh[1], dh[0]) + h2(i, seed + 2) * PI * 0.5 * spread; vx = cos(a) * sp; vy = sin(a) * sp; vz = (up + dh[2] + h1(i, seed + 3) * 0.8) * sp * 0.7; }
        else { const a = h1(i, seed + 2) * TAU, el = (0.15 + 0.85 * h1(i, seed + 3)) * (PI / 2) * (0.4 + 0.6 * up); vx = cos(a) * cos(el) * sp * spread; vy = sin(a) * cos(el) * sp * spread; vz = sin(el) * sp; }
        const pos = bounce([at[0] + h2(i, seed + 4) * 0.2, at[1] + h2(i, seed + 5) * 0.2, max(gz, at[2] || 0)], [vx, vy, vz], g, rest, age, gz);
        const P = S.project(pos[0], pos[1], pos[2]); if (!P) continue;
        const sz = size * (0.5 + 1.0 * h1(i, seed + 6)), px = sz * P.s * (1 - fade * 0.6);
        const spin = h2(i, seed + 7) * 9, ang = h1(i, seed + 8) * TAU + spin * min(age, 0.6 + age * pos[3]);
        items.push([P.d, P.x, P.y, px, ang, i, pos[2] - gz]);
      }
      items.sort((a, b) => b[0] - a[0]);
      for (const [, x, y, px, ang, i, hgt] of items) {
        if (px < 2.5) { sq(ctx, x, y, px < 1.5 ? 1 : 2, dcol(i % 2 ? CHUNK_MATS[mat][1] : CHUNK_MATS[mat][2], 1 - fade)); continue; }
        let N = CHUNK_SIZES[0]; for (const s of CHUNK_SIZES) if (s <= px * 1.05) N = s;
        const ai = floor(((((ang / TAU) % 1) + 1) % 1) * 16) % 16, spr = chunkSprite(i % 6, mat, N, ai);
        if (hgt < 0.6 && px > 5) HT.alpha(ctx, 0.3, () => ellipse(ctx, x, y + px * 0.35 + hgt * 0.5, px * 0.5, max(1, px * 0.12), C.ink));
        if (fade > 0) { const oa = ctx.globalAlpha; ctx.globalAlpha = oa * (1 - fade); ctx.drawImage(spr, R(x - spr.width / 2), R(y - spr.height / 2)); ctx.globalAlpha = oa; }
        else ctx.drawImage(spr, R(x - spr.width / 2), R(y - spr.height / 2));
      }
    },
  };

  // ---- glass  e.at, e.n (26), e.speed (5), e.dir, e.size (0.14 m), e.drag (1.4), e.dur (2.4): shards burst out,
  //      flutter down (width ∝ |cos spin|), glint white when they face the light, lie glinting on the ground
  FX.glass = {
    dur: 2.4, layer: 'front', sfx: 'glassShatter', vol: 0.85,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const n = e.n || 26, seed = e.seed, speed = num(e.speed, 5), size = num(e.size, 0.24), kd = num(e.drag, 1.4), g = 9.8, T = e.dur, gz = num(e.ground, 0);
      const dh = e.dir ? heading3(e.dir) : null, fade = sat((age - T * 0.75) / (T * 0.25));
      const zAt = (z0, vz, t) => z0 + ((vz + g / kd) * (1 - exp(-kd * t))) / kd - (g * t) / kd;
      for (let i = 0; i < n; i++) {
        const sp = speed * (0.3 + 0.8 * h1(i, seed + 1));
        let vx, vy, vz;
        if (dh) { const a = atan2(dh[1], dh[0]) + h2(i, seed + 2) * 1.1; vx = cos(a) * sp; vy = sin(a) * sp; vz = (dh[2] + h2(i, seed + 3) * 0.6) * sp; }
        else { const a = h1(i, seed + 2) * TAU; vx = cos(a) * sp * 0.7; vy = sin(a) * sp * 0.7; vz = h2(i, seed + 3) * sp * 0.6; }
        const z0 = at[2] || 0;
        let tl = age, landed = false;
        if (zAt(z0, vz, age) <= gz) { let lo = 0, hi = age; for (let it = 0; it < 18; it++) { const m = (lo + hi) / 2; if (zAt(z0, vz, m) > gz) lo = m; else hi = m; } tl = hi; landed = true; }
        const fx = (1 - exp(-kd * tl)) / kd, X = at[0] + vx * fx, Y = at[1] + vy * fx, Z = landed ? gz + 0.01 : zAt(z0, vz, tl);
        const P = S.project(X, Y, Z); if (!P) continue;
        const L = max(1.5, size * (0.6 + 0.9 * h1(i, seed + 4)) * P.s), spin = (landed ? tl : age) * (6 + 8 * h1(i, seed + 5)) + h1(i, seed + 6) * TAU;
        const wv = abs(cos(spin)), a0 = h1(i, seed + 7) * PI, ca = cos(a0), sa = sin(a0);
        const glint = landed ? (floor(age * 7 + i * 3) % 9 === 0) : wv > 0.93;
        const col = dcol(glint ? C.white : wv > 0.6 ? C.ice : wv > 0.3 ? C.foam : C.steel, 1 - fade);
        if (L < 2.5) sq(ctx, P.x, P.y, 1, col);
        else fillPoly(ctx, [P.x + ca * L, P.y + sa * L * 0.8, P.x - sa * L * wv * 0.45, P.y + ca * L * wv * 0.4, P.x - ca * L * 0.6, P.y - sa * L * 0.5], col);
        if (glint && fade < 0.8) sparkle(ctx, P.x, P.y, L > 4 ? 2 : 1, C.white, null);
      }
    },
  };

  // ---- fire  e.at (ground), e.r base radius (0.8 m), e.h flame height (1.6 m), e.n tongues (5), e.wind (−1..1,
  //      default S.env.wind), e.embers (14), e.dur (3). Layered teardrop tongues (crimson/red → orange/amber →
  //      gold/butter core) redrawn on 2s, a hot base, rising embers, additive glow.
  FX.fire = {
    dur: 3, layer: 'behind', sfx: 'fireCrackle', vol: 0.6,
    draw(ctx, age, e, S) {
      const at = e.at, pb = pj(S, at); if (!pb) return;
      const seed = e.seed, r = num(e.r, 0.8), hh = num(e.h, 1.6), n = e.n || 5, k = envl(age, e.dur, 0.25, 0.5), s = pb.s;
      const wind = num(e.wind, (S.env && S.env.wind) || 0.2), ta = on2(age);
      glow(ctx, pb.x, pb.y - hh * s * 0.3, hh * s * 0.75, C.orange, 0.35 * k);
      ellipse(ctx, pb.x, pb.y, r * s * 1.05, max(1, r * s * 0.22), dcol(C.amber, 0.8 * k));
      const layers = [[1, C.crimson], [0.93, C.red], [0.72, C.orange], [0.5, C.amber], [0.3, C.gold], [0.16, C.butter]];
      for (let i = 0; i < n; i++) {
        const bx = pb.x + h2(i, seed) * r * s * 0.8, hi = hh * s * (0.45 + 0.55 * h1(i, seed + 1)) * (0.82 + 0.25 * sin(ta * TAU * (1.3 + h1(i, seed + 2)) + i)) * k;
        const wi = r * s * (0.35 + 0.35 * h1(i, seed + 3)) * (0.6 + 0.4 * k);
        if (hi < 2) continue;
        for (const [f, col] of layers) {
          const P = [], H2 = hi * (0.35 + 0.65 * f), W2 = wi * f, m = 10;
          for (let j = 0; j <= m; j++) { const v = j / m, prof = sin(PI * min(1, v * 1.15 + 0.05)) * pow(1 - v, 0.35), sway = wind * v * v * H2 * 0.45 + (HT.noise(v * 3 - ta * 5, i * 3.1, seed) - 0.5) * W2 * 0.9 * v; P.push(bx - W2 * prof + sway, pb.y - v * H2); }
          for (let j = m; j >= 0; j--) { const v = j / m, prof = sin(PI * min(1, v * 1.15 + 0.05)) * pow(1 - v, 0.35), sway = wind * v * v * H2 * 0.45 + (HT.noise(v * 3 - ta * 5, i * 3.1, seed) - 0.5) * W2 * 0.9 * v; P.push(bx + W2 * prof + sway, pb.y - v * H2); }
          fillPoly(ctx, P, col);
        }
      }
      const ne = num(e.embers, 14);
      for (let i = 0; i < ne; i++) {
        const ph = (age * (0.6 + 0.5 * h1(i, seed + 5)) + h1(i, seed + 6)) % 1, X = pb.x + h2(i, seed + 7) * r * s + sin(age * 4 + i) * 3 + wind * ph * hh * s * 0.8, Y = pb.y - hh * s * (0.3 + 1.6 * ph);
        sq(ctx, X, Y, 1, dcol(ph < 0.4 ? C.butter : ph < 0.75 ? C.amber : C.orange, k * (1 - ph * 0.8)));
      }
    },
  };

  // ---- smoke  e.at, e.rate (puffs/s, 5), e.life (2.6 s), e.rise (1.5 m/s), e.size (0.6 m), e.grow (1.8), e.dark
  //      (true = black smoke), e.wind, e.dur (4). A rising, drifting column of shaded puffs that shrink as they go.
  FX.smoke = {
    dur: 4, layer: 'behind',
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const br = num(e.r, 0.3), rate = num(e.rate, 5), life = num(e.life, 2.6), rise = num(e.rise, 1.5), size = num(e.size, max(0.6, br * 0.4)), grow = num(e.grow, 1.8), seed = e.seed;
      const pal = e.dark === false ? DUSTS.concrete : e.col ? dustPal(e) : DUSTS.dark, wind = num(e.wind, (S.env && S.env.wind) || 0.3), T = e.dur, end = sat((age - (T - 0.6)) / 0.6);
      const k0 = max(0, floor((age - life) * rate)), k1 = floor(age * rate), list = [];
      for (let k = k0; k <= k1; k++) {
        const a = age - k / rate; if (a < 0 || a > life) continue;
        const q = a / life, z = (at[2] || 0) + rise * a * (0.85 + 0.3 * h1(k, seed)), dx = wind * pow(a, 1.4) * 0.9 + h2(k, seed + 1) * 0.25 * a;
        const P = S.project(at[0] + dx + h2(k, seed + 4) * br, at[1] + h2(k, seed + 2) * (0.2 * a + br * 0.5), z); if (!P) continue;
        const rr = size * (1 + grow * E.outCubic(q)) * (0.75 + 0.5 * h1(k, seed + 3)) * (q > 0.7 ? 1 - (q - 0.7) / 0.3 * 0.7 : 1);
        list.push([k, P.x, P.y, rr * P.s, (0.95 - 0.45 * q) * (q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1) * (1 - end) * min(1, a * 4)]);
      }
      for (const [k, x, y, r, al] of list) puff(ctx, x, y, r, pal, al, seed + k);
    },
  };

  // ---- crater  e.at (ground), e.r (3 m), e.dur (1.6), e.hold (keep until the end), e.col (dust), e.mat (debris)
  //      ground: white-hot flash, the bowl (dark, lit far wall, raised lip), radial cracks; front: thrown chunks + dust
  FX.crater = {
    dur: 1.6, layer: ['ground', 'front'], sfx: 'groundSlam', vol: 1,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at) return;
      const r = num(e.r, 3), seed = e.seed, T = e.dur, gz = at[2] || 0, f = fr(age);
      const fade = e.hold ? 1 : 1 - sat((age - T * 0.75) / (T * 0.25)), rr = r * E.outCubic(min(1, age / 0.18));
      if (S.fxLayer === 'ground') {
        const fn = a => 0.9 + 0.12 * HT.noise(cos(a) * 2 + 1, sin(a) * 2, seed);
        const lip = projPoly(S, circle3(at[0], at[1], gz + 0.02, rr * 1.12, 44, fn)), bowl = projPoly(S, circle3(at[0], at[1], gz + 0.03, rr, 44, fn));
        const c = camOf(S), toC = atan2(c.y - at[1], c.x - at[0]);
        fillPoly(ctx, lip, dcol(C.lilacgrey, fade));
        fillPoly(ctx, bowl, dcol(C.shadow, fade));
        const far = projPoly(S, circle3(at[0] - cos(toC) * rr * 0.28, at[1] - sin(toC) * rr * 0.28, gz + 0.04, rr * 0.7, 36, fn));
        fillPoly(ctx, far, dcol(C.dusk, fade));
        const deep = projPoly(S, circle3(at[0] + cos(toC) * rr * 0.1, at[1] + sin(toC) * rr * 0.1, gz + 0.05, rr * 0.55, 32, fn));
        fillPoly(ctx, deep, dcol(C.ink, fade));
        polyline(ctx, lip, dcol(C.steel, fade * 0.8), true);
        const nc = 8, cq = min(1, age / 0.28);
        for (let i = 0; i < nc; i++) {
          const a0 = (i / nc) * TAU + h2(i, seed) * 0.3, rng = HT.rng(seed + i * 17), len = r * (0.8 + 1.1 * h1(i, seed + 1)) * cq, pts = [];
          let a = a0;
          for (let j = 0; j <= 5; j++) { const q = S.project(at[0] + cos(a) * (rr * 1.05 + (len * j) / 5), at[1] + sin(a) * (rr * 1.05 + (len * j) / 5), gz + 0.02); if (q) pts.push(q.x, q.y); a += (rng() - 0.5) * 0.35; }
          polyline(ctx, pts, dcol(C.ink, fade));
        }
        if (f <= 2) { const flash = projPoly(S, circle3(at[0], at[1], gz + 0.06, r * (0.6 + 0.3 * f), 32)); fillPoly(ctx, flash, f < 2 ? C.white : C.butter); const pc = pj(S, at); if (pc) glow(ctx, pc.x, pc.y, r * pc.s * 0.9, f < 2 ? C.butter : C.gold, 0.6); }
        return;
      }
      if (age < 1.8) FX.debris.draw(ctx, age, Object.create(e, { n: { value: num(e.n, 10) }, speed: { value: num(e.speed, 7 + r) }, size: { value: num(e.size, 0.1 + r * 0.08) }, dur: { value: T }, seed: { value: seed + 1 }, mat: { value: e.mat || 'stone' } }), S);
      FX.dust.draw(ctx, age, Object.create(e, { n: { value: 9 }, r: { value: r * 1.3 }, size: { value: r * 0.28 }, dur: { value: T }, seed: { value: seed + 2 }, rise: { value: 0.8 } }), S);
    },
  };

  // ================================================================== GRAPHIC
  // ---- speedLines  e.mode 'focus' (manga 集中線 to e.x/e.y or e.at) | 'parallel' (e.angle), e.n (90), e.inner (clear
  //      radius px, 90), e.len, e.width (max wedge px, 3), e.col (white), e.fps (12), e.dur (0.6). Screen space.
  function speedPaint(ctx, e, age, S) {
    const col = e.col || C.white, fps = num(e.fps, 12), g = floor(age * fps), seed = (e.seed || 0) + g * 7919, dur = e.dur || 0.6;
    const k = sat(min(age / 0.06, (dur - age) / 0.1)), n = R(num(e.n, 90) * (e.density === undefined ? 1 : e.density));
    if (k <= 0) return;
    if ((e.mode || 'focus') === 'parallel') {
      const a = num(e.angle, 0), ux = cos(a), uy = sin(a), nx = -uy, ny = ux, span = hypot(W, H);
      for (let i = 0; i < n; i++) {
        const off = (h1(i, seed) - 0.5) * span, along = (h1(i, seed + 1) - 0.5) * span * 1.4, L = num(e.len, 160) * (0.3 + 0.9 * h1(i, seed + 2)), w = 1 + floor(h1(i, seed + 3) * num(e.width, 2));
        const cx = W / 2 + nx * off + ux * along, cy = H / 2 + ny * off + uy * along;
        taper(ctx, cx - ux * L * 0.5, cy - uy * L * 0.5, cx + ux * L * 0.5, cy + uy * L * 0.5, w, 0.6, dcol(col, k));
      }
      return;
    }
    let x = num(e.x, W / 2), y = num(e.y, H / 2);
    if (e.at && e.x === undefined && S) { const p = pj(S, e.at); if (p) { x = p.x; y = p.y; } }
    const inner = num(e.inner, 90), Ro = hypot(W, H), c2 = dcol(col, k);
    if (!c2) return;
    ctx.fillStyle = c2; ctx.beginPath(); // every wedge in one path: one fill call
    for (let i = 0; i < n; i++) {
      const a = h1(i, seed) * TAU, r1 = inner + h1(i, seed + 1) * num(e.len, Ro * 0.3), w = 1 + h1(i, seed + 2) * num(e.width, 3);
      const ca = cos(a), sa = sin(a), px = -sa, py = ca;
      ctx.moveTo(x + ca * Ro + px * w, y + sa * Ro + py * w); ctx.lineTo(x + ca * r1, y + sa * r1); ctx.lineTo(x + ca * Ro - px * w, y + sa * Ro - py * w); ctx.closePath();
    }
    ctx.fill();
  }
  FX.speedLines = { dur: 0.6, layer: 'front', draw(ctx, age, e, S) { speedPaint(ctx, e, age, S); } };

  // ================================================================== POST EFFECTS (full frame; ctx = the composited frame)
  const scratch = HT.canvas(W, H);
  function postClip(ctx) { setClip(ctx, null); }
  // 'speed': full-frame speed lines (same params as FX.speedLines)
  POST.speed = (ctx, S, e, age, dur) => { postClip(ctx); speedPaint(ctx, Object.assign({}, e, { dur }), age, S); };
  // 'split': the World-Cutting Slash. The whole composited frame (every layer, sky and text included) is cut along
  // the line through (e.x, e.y) at e.angle; after e.cut s the halves slide apart along the line by e.gap px (e.ease,
  // default inQuad: slow, then gliding) and open by e.sep px, showing a white seam. e.line: draw the growing cut line.
  POST.split = (ctx, S, e, age, dur) => {
    postClip(ctx);
    const cut = num(e.cut, 0.25), x = num(e.x, W / 2), y = num(e.y, H / 2), a = num(e.angle, -0.38), ux = cos(a), uy = sin(a), nx = -uy, ny = ux;
    if (age < cut) {
      if (e.line !== false) { const L = hypot(W, H) * E.outCubic(min(1, age / max(0.01, cut * 0.6))); line(ctx, x - ux * L, y - uy * L, x + ux * L, y + uy * L, C.white); line(ctx, x - ux * L + nx, y - uy * L + ny, x + ux * L + nx, y + uy * L + ny, dcol(C.ice, 0.6)); }
      return;
    }
    const q = (E[e.ease || 'inQuad'] || E.inQuad)(sat((age - cut) / max(0.01, dur - cut))), gap = num(e.gap, 48) * q * 0.5, sep = num(e.sep, 6) * q * 0.5 + 0.6;
    scratch.g.clearRect(0, 0, W, H);
    scratch.g.drawImage(ctx.canvas, -TX, -TY);
    ctx.fillStyle = e.bg || C.white; ctx.fillRect(CX0, CY0, CX1 - CX0 + 1, CY1 - CY0 + 1);
    const BIG = 3000;
    for (const side of [1, -1]) {
      const ox = R(side * (ux * gap + nx * sep)), oy = R(side * (uy * gap + ny * sep));
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - ux * BIG + ox, y - uy * BIG + oy); ctx.lineTo(x + ux * BIG + ox, y + uy * BIG + oy);
      ctx.lineTo(x + ux * BIG + nx * side * BIG + ox, y + uy * BIG + ny * side * BIG + oy); ctx.lineTo(x - ux * BIG + nx * side * BIG + ox, y - uy * BIG + ny * side * BIG + oy);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(scratch.c, ox + CX0, oy + CY0);
      ctx.restore();
      if (e.edge !== false) line(ctx, x - ux * BIG + ox + nx * side * 0.5, y - uy * BIG + oy + ny * side * 0.5, x + ux * BIG + ox + nx * side * 0.5, y + uy * BIG + oy + ny * side * 0.5, dcol(C.ice, 0.7));
    }
  };
  // 'shatter': the screen cracks from (e.x, e.y) (e.crack s), then breaks into shards that fly out, spin, fall and
  // shrink, revealing e.bg (ink). Shards: a jittered radial × ring grid; edges glint.
  const shatterCache = HT.lru(6);
  function shatterCells(x, y, seed, nR, nA) {
    const key = [R(x), R(y), seed, nR, nA].join('|');
    let cells = shatterCache.get(key);
    if (cells) return cells;
    const rings = [0]; for (let j = 1; j < nR; j++) rings.push(26 * pow(420 / 26, (j - 1) / max(1, nR - 2))); // geometric: small near the impact
    rings.push(1200);
    const V = (i, j) => { if (j === 0) return [x, y]; const a = ((i % nA) / nA) * TAU + h2((i % nA) * 97 + j, seed) * (0.35 * PI / nA), rr = rings[j] * (1 + (j < nR ? h2((i % nA) * 31 + j * 7, seed + 1) * 0.18 : 0)); return [x + cos(a) * rr, y + sin(a) * rr]; };
    cells = [];
    for (let j = 0; j < nR; j++) for (let i = 0; i < nA; i++) {
      const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1);
      const P = j === 0 ? [a[0], a[1], c[0], c[1], d[0], d[1]] : [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]];
      let cx = 0, cy = 0; for (let k = 0; k < P.length; k += 2) { cx += P[k]; cy += P[k + 1]; } cx /= P.length / 2; cy /= P.length / 2;
      cells.push({ P, cx, cy, j, h: h1(i * 13 + j, seed + 2), w: h2(i * 7 + j, seed + 3) });
    }
    return shatterCache.set(key, cells);
  }
  POST.shatter = (ctx, S, e, age, dur) => {
    postClip(ctx);
    const x = num(e.x, W / 2), y = num(e.y, H / 2), seed = e.seed || 5, crack = num(e.crack, 0.35), cells = shatterCells(x, y, seed, num(e.rings, 5), num(e.n, 12));
    if (age < crack) { // jagged cracks race outward; ring cracks are partial (glass breaks radially first)
      const q = age / crack, maxR = hypot(W, H);
      for (const c of cells) {
        const d = hypot(c.cx - x, c.cy - y) / maxR; if (d > q * 1.3) continue;
        const n = c.P.length;
        for (let k = 0; k < n; k += 2) {
          const k2 = (k + 2) % n, ax = c.P[k], ay = c.P[k + 1], bx = c.P[k2], by = c.P[k2 + 1];
          const radial = abs((bx - ax) * (ay - y) - (by - ay) * (ax - x)) < 0.35 * hypot(bx - ax, by - ay) * hypot(ax - x, ay - y);
          if (!radial && h1(R(ax * 7 + bx * 13 + ay * 3 + by * 5), seed) < 0.45) continue;
          const col = d > q ? C.ice : C.white;
          edgeJag(ctx, ax + 1, ay + 1, bx + 1, by + 1, C.ink); edgeJag(ctx, ax, ay, bx, by, col);
        }
      }
      return;
    }
    const tau = age - crack;
    scratch.g.clearRect(0, 0, W, H);
    scratch.g.drawImage(ctx.canvas, -TX, -TY);
    ctx.fillStyle = e.bg || C.ink; ctx.fillRect(CX0, CY0, CX1 - CX0 + 1, CY1 - CY0 + 1);
    const g = num(e.fall, 900);
    for (const c of cells) {
      const dx = c.cx - x, dy = c.cy - y, D = hypot(dx, dy) || 1, v = (120 + 260 * c.h) * (1.2 - min(1, D / 400) * 0.5);
      const ox = (dx / D) * v * tau, oy = (dy / D) * v * tau + 0.5 * g * tau * tau * (0.6 + 0.4 * c.h), ang = c.w * 2.2 * tau, sc = max(0.2, 1 - tau * (0.25 + 0.35 * c.h));
      let rad = 0; for (let k = 0; k < c.P.length; k += 2) rad = max(rad, hypot(c.P[k] - c.cx, c.P[k + 1] - c.cy));
      const X = c.cx + ox, Y = c.cy + oy, rs = rad * sc;
      if (X + rs < CX0 || X - rs > CX1 || Y + rs < CY0 || Y - rs > CY1) continue; // flown out of the frame
      ctx.save();
      ctx.translate(c.cx + ox, c.cy + oy); ctx.rotate(ang); ctx.scale(sc, sc); ctx.translate(-c.cx, -c.cy);
      ctx.beginPath(); ctx.moveTo(c.P[0], c.P[1]); for (let k = 2; k < c.P.length; k += 2) ctx.lineTo(c.P[k], c.P[k + 1]); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(scratch.c, CX0, CY0); ctx.restore();
      ctx.strokeStyle = (floor(ang * 3 + c.h * 5) % 3 === 0) ? C.white : C.ice; ctx.lineWidth = 1 / sc; ctx.stroke();
      ctx.restore();
    }
  };

  // ================================================================== WEATHER
  // HT.weather.snow(ctx, S, density 0–1, o): deterministic snowfall in 3 parallax depths (≈ 30 / 10 / 3.5 m). Flakes
  // live in wrapped screen tiles offset by the camera: yaw/pitch rotate every layer by f·angle px, lateral and
  // vertical camera travel shift each layer by f/depth, and wind + fall speed are scaled per depth. o: wind (default
  // S.env.wind), speed (×), layers ([0,1,2] far→near; draw far ones behind fighters, near ones in front), t.
  HT.weather = HT.weather || {};
  HT.weather.snow = (ctx, S, density, o) => {
    o = o || {}; density = density === undefined ? 0.5 : density;
    if (density <= 0) return;
    setClip(ctx, S);
    const c = S.cam ? camOf(S) : { yaw: 0, pitch: 0, x: 0, y: 0, z: 1.5, f: 480 }, t = num(o.t, S.T !== undefined ? S.T : S.t);
    const wind = num(o.wind, (S.env && S.env.wind) !== undefined ? S.env.wind : 0.3), f = c.f || 480;
    const lat = c.x * cos(c.yaw) - c.y * sin(c.yaw), TW = W + 96, TH = H + 96, x0 = (c.vx || 0) - 48, y0 = (c.vy || 0) - 48;
    const L = [[30, 320, 1, C.steel, 0.9], [10, 180, 1, C.white, 1.05], [3.5, 70, 2, C.white, 1.25], [1.6, 16, 3, C.white, 1.4]];
    const layers = o.layers || (o.near ? [0, 1, 2, 3] : [0, 1, 2]);
    for (const li of layers) {
      const [D, cnt, s, col, vs] = L[li], n = R(cnt * density), k = f / D;
      const fall = vs * num(o.speed, 1) * k, drift = wind * 2.2 * k;
      const ox = -c.yaw * f - lat * k + drift * t, oy = (c.pitch || 0) * f + c.z * k + fall * t;
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const sway = sin(t * (0.7 + h1(i, 71 + li)) + i) * (2 + li * 2);
        let X = (h1(i, 61 + li) * TW + ox + sway) % TW; if (X < 0) X += TW;
        let Y = (h1(i, 81 + li) * TH + oy) % TH; if (Y < 0) Y += TH;
        const px = R(x0 + X), py = R(y0 + Y);
        if (px < VX0 - 2 || px > VX1 + 2 || py < VY0 - 2 || py > VY1 + 2) continue;
        if (s === 3) { ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); } // very near: soft plus-shaped flakes
        else if (s === 2) { ctx.fillRect(px, py, 2, 2); if (abs(drift) > 60) ctx.fillRect(px - (drift > 0 ? 1 : -2), py, 1, 1); }
        else ctx.fillRect(px, py, 1, 1);
      }
    }
  };

  // exported helpers for sets / other modules
  HT.fxu = { dcol, fillPoly, fillPolys, disc, ellipse, annulus, ring1, line, thick, taper, polyline, sq, sparkle, glow, shade, bolt, boltDraw, puff, warp, projPoly, projSeg, circle3, sphereScr, setClip, skull, glyph, galaxy };
  HT.fxInternals = { purpleTimes, turnTimes, bounce, chunkSprite };
})();

/* ---------------------------------------------------------------------------------------------------------------
   FX labs.  ?lab=fx[&scale=2][&only=a,b][&all=1][&cw=320&ch=180]  every effect as a row of 6 frames (1:1 crops of
   full 640×360 renders on a dark city backdrop, camera ~20 m from the origin for most, quantized like the film);
   ?lab=fx&name=<fx>&n=12[&v=variant][&p=key:val,…][&cols=4]  one effect, full frames;  ?lab=post  split / shatter /
   speed / snow on a test pattern;  ?lab=fxperf  per-effect draw time (warm, avg/max over 12 ages × 3 reps),
   determinism check, photosensitivity flash count, cache sizes → window.__fxPerf. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, U = HT.fxu;
  const labs = (HT.labs = HT.labs || {});
  const CAST = { gojo: [-1.2, 0, 0], sukuna: [1.2, 0, 0] }, CH = { gojo: 1.92, sukuna: 1.75 };
  const CAMS = {
    def: { x: 0, y: -20, z: 3.2, f: 460, look: [0, 0, 1.6] },
    med: { x: 0.3, y: -8.5, z: 1.9, f: 520, look: [0.3, 0, 1.45] },
    close: { x: 1.0, y: -4.2, z: 2.2, f: 560, look: [1.1, 0, 2.05] },
    high: { x: 0, y: -26, z: 11, f: 460, look: [0, 4, 1] },
    far: { x: 0, y: -260, z: 30, f: 420, look: [0, 300, 120] },
    shrine: { x: 1.2, y: -40, z: 3.5, f: 430, look: [1.2, 6, 8.5] },
  };
  function mockS(cs, t) {
    const c = HT.cam.make({ x: cs.x, y: cs.y, z: cs.z, f: cs.f || 460 });
    if (cs.look) HT.cam.lookAt(c, cs.look[0], cs.look[1], cs.look[2]);
    if (cs.dyaw) c.yaw += cs.dyaw;
    HT.cam.prep(c);
    const S = { t, T: t, W, H, cam: c, env: { time: 'dusk', wind: 0.3 }, castNames: ['gojo', 'sukuna'], drawn: {} };
    S.project = (x, y, z, o) => HT.cam.project(c, x, y, z, o);
    S.at = name => { const p = CAST[name] || [0, 0, 0]; return { x: p[0], y: p[1], z: p[2], h: CH[name] || 1.8, face: name === 'sukuna' ? [-1, 0] : [1, 0] }; };
    S.pt = ref => {
      if (Array.isArray(ref)) return ref;
      if (ref === 'mid') return [0, 0, 0];
      const parts = String(ref).split('.'), a = S.at(parts[0]), k = parts[1] === 'head' ? 0.93 : parts[1] === 'chest' ? 0.72 : parts[1] === 'hip' ? 0.52 : 0;
      return [a.x, a.y, a.z + a.h * k];
    };
    return S;
  }
  // ---- a neutral dark city: extruded boxes projected with the lab camera (cached per camera)
  const BLD = (() => {
    const rng = HT.rng(4242), B = [];
    for (let i = 0; i < 90; i++) { const x = (rng() - 0.5) * 1000, y = 70 + rng() * 800; B.push([x, y, 16 + rng() * 34, 16 + rng() * 34, 24 + rng() * rng() * 170]); }
    for (let i = 0; i < 12; i++) B.push([-70 + i * 12.5 + (rng() - 0.5) * 3, 24 + rng() * 5, 9 + rng() * 2.5, 8, 10 + rng() * 26]);
    return B;
  })();
  const bdCache = HT.lru(8);
  function backdrop(cs) {
    const key = JSON.stringify(cs);
    let bd = bdCache.get(key);
    if (bd) return bd;
    const cv = HT.canvas(W, H), g = cv.g, S = mockS(cs, 0), c = S.cam;
    U.setClip(g, S);
    HT.vgrad(g, 0, 0, W, H, [[0, C.ink], [0.35, C.navy], [0.62, C.indigo], [0.8, C.dusk]]);
    const hz = HT.cam.project(c, c.x + Math.sin(c.yaw) * 1e5, c.y + Math.cos(c.yaw) * 1e5, 0), hy = hz ? Math.round(hz.y) : H / 2;
    const gy = Math.max(0, Math.min(H, hy));
    HT.rect(g, 0, gy, W, H - gy, C.charcoal);
    HT.vgrad(g, 0, gy, W, Math.min(40, H - gy), [[0, C.shadow], [1, C.charcoal]]);
    const order = BLD.map((b, i) => [Math.hypot(b[0] - c.x, b[1] - c.y), i]).sort((a, b) => b[0] - a[0]);
    for (const [dist, i] of order) {
      const [x, y, w, d, h] = BLD[i], x0 = x - w / 2, x1 = x + w / 2, y0 = y - d / 2, y1 = y + d / 2;
      const far = dist > 300, mid = dist > 90;
      const faces = [[x0, y0, x1, y0, 0, -1], [x1, y0, x1, y1, 1, 0], [x1, y1, x0, y1, 0, 1], [x0, y1, x0, y0, -1, 0]];
      for (const [ax, ay, bx, by, nx, ny] of faces) {
        if ((c.x - (ax + bx) / 2) * nx + (c.y - (ay + by) / 2) * ny <= 0) continue;
        const P = U.projPoly(S, [ax, ay, 0, bx, by, 0, bx, by, h, ax, ay, h]);
        if (P.length < 6) continue;
        const lit = nx < 0 || ny < 0;
        U.fillPoly(g, P, far ? (lit ? C.navy : C.ink) : mid ? (lit ? C.shadow : C.navy) : lit ? C.dusk : C.shadow);
        if (!far) for (let wy = 3; wy < h - 2; wy += 3.2) for (let wx = 0.12; wx < 0.9; wx += 0.13) {
          if (HT.hash(i * 977 + Math.round(wy * 7) + Math.round(wx * 100), 7) > (mid ? 0.12 : 0.18)) continue;
          const q = S.project(ax + (bx - ax) * wx, ay + (by - ay) * wx, wy);
          if (q) HT.rect(g, q.x, q.y, Math.max(1, q.s * 0.6), Math.max(1, q.s * 0.8), HT.hash(i + wy * 3, 9) < 0.5 ? C.rust : mid ? C.clay : C.honey);
        }
      }
      const top = U.projPoly(S, [x0, y0, h, x1, y0, h, x1, y1, h, x0, y1, h]);
      if (top.length >= 6 && c.z > h) U.fillPoly(g, top, far ? C.shadow : C.dusk);
    }
    for (let gx = -40; gx <= 40; gx += 4) { const P = U.projSeg(S, [gx, -40, 0], [gx, 60, 0]); if (P) U.line(g, P[0], P[1], P[2], P[3], C.slate); }
    for (let gy2 = -40; gy2 <= 60; gy2 += 4) { const P = U.projSeg(S, [-40, gy2, 0], [40, gy2, 0]); if (P) U.line(g, P[0], P[1], P[2], P[3], C.slate); }
    for (let k = -3; k <= 3; k++) { const P = U.projPoly(S, [k * 1.6 - 0.5, -4, 0.01, k * 1.6 + 0.5, -4, 0.01, k * 1.6 + 0.5, -1.5, 0.01, k * 1.6 - 0.5, -1.5, 0.01]); U.fillPoly(g, P, C.dusk); }
    return bdCache.set(key, cv.c);
  }
  function drawCast(g, S) {
    for (const name of ['gojo', 'sukuna']) {
      const a = S.at(name), p = S.project(a.x, a.y, a.z);
      if (!p || a.h * p.s < 4) continue;
      HT.rig.draw(g, name, p.x, p.y, HT.rig.POSES.guard, a.h * p.s, { face: name === 'sukuna' ? -1 : 1, light: [-0.55, -0.5, 0.65] });
    }
  }
  // ---- lab configurations: every effect (variants in arrays)
  const LAB = {
    hitSpark: [{ e: { at: [-0.85, 0, 1.45], strength: 2, dir: [-1, 0] }, cam: 'med' }, { e: { at: [-0.85, 0, 1.45], strength: 3, dir: [-1, 0] }, cam: 'med' }, { e: { at: [-0.85, 0, 1.45], strength: 1, dir: [-1, 0] }, cam: 'def' }],
    blockSpark: { e: { at: [0.85, 0, 1.35], strength: 2, dir: [1, 0] }, cam: 'med' },
    infinityRipple: [{ e: { at: [-0.8, 0, 1.45], strength: 2, dir: [-1, 0] }, cam: 'med' }, { e: { at: [-0.8, 0, 1.45], strength: 3, dir: [-1, 0] }, cam: 'def' }],
    infinityAura: { e: { who: 'gojo', dur: 3 }, cam: 'med', focus: [-1.2, 0, 1] },
    blueOrb: [{ e: { at: [0, 0, 1.6], r: 0.3, dur: 2 }, cam: 'med' }, { e: { at: [0, 0, 1.6], r: 0.3, dur: 2 }, cam: 'def' }, { e: { at: [0, 0, 1.6], r: 0.6, dur: 2 }, cam: 'med' }, { e: { at: [1.2, 0, 1.3], r: 0.45, dur: 1.6, crush: true }, cam: 'med', focus: [1.2, 0, 1.3] }],
    redOrb: { e: { at: [-0.4, 0, 1.4], dir: [1, 0, 0], dur: 1.15 }, cam: 'med', focus: [1.2, 0, 1.4] },
    redShot: { e: { from: [-7, 0, 1.4], to: [6, 2, 1.8], curve: 3, travel: 0.7 }, cam: 'def', focus: [0, 0, 1.6] },
    purple: [{ e: { at: [0, 300, 170], r: 150, mode: 'burst' }, cam: 'far', focus: [0, 300, 170] }, { e: { at: [-2, 0, 1.6], from: [-2, 0, 1.6], to: [40, 60, 3], r: 2.5, mode: 'fire', form: 1.0 }, cam: 'def', focus: [2, 4, 2] }, { e: { at: [0, 0, 1.8], r: 3.2, mode: 'burst', form: 1.0, grow: 0.6, hold: 0.3 }, cam: 'def' }],
    dismantle: { e: { from: [-9, 3, 0.8], to: [9, 3, 3.8], cuts: 3, linger: 0.8 }, cam: 'def' },
    cleave: { e: { at: 'sukuna.chest', r: 0.6 }, cam: 'med', focus: [1.2, 0, 1.3] },
    worldCut: { e: { x: 320, y: 180, angle: -0.38 }, cam: 'def', screen: [320, 180] },
    blackFlash: [{ e: { at: [0.85, 0, 1.3], dir: [1, 0] }, cam: 'med', focus: [0.9, 0, 1.3] }, { e: { at: [0.85, 0, 1.3], dir: [1, 0] }, cam: 'def' }],
    barrier: { e: { center: [0, 14, 0], r: 11, grow: 1.2, dur: 2.6 }, cam: 'def', focus: [0, 14, 5] },
    barrierShatter: { e: { center: [0, 14, 0], r: 11 }, cam: 'def', focus: [0, 14, 5] },
    voidBloom: { e: { at: [0, 0, 1.6], dur: 3 }, cam: 'def' },
    shrineBloom: [{ e: { at: [1.2, 0, 0], dur: 4 }, cam: 'shrine', focus: [1.2, 6, 7] }, { e: { at: [1.2, 0, 0], dur: 4 }, cam: 'def', focus: [1.2, 6, 5] }],
    rctGlow: { e: { at: 'gojo.head', who: 'gojo', dur: 2, steam: true }, cam: 'med', focus: [-1.2, 0, 1.5] },
    wheel: [{ e: { who: 'sukuna', notch: 4, turnAt: [0.3, 0.8, 1.3, 1.8], dur: 2.4 }, cam: 'close', focus: [1.2, 0, 2.2] }, { e: { at: [0.5, -1.5, 0], mode: 'spin', dur: 2 }, cam: 'med', focus: [0.5, -1.5, 0.2] }, { e: { who: 'sukuna', notch: 2, turnAt: [0.3, 1.0], dur: 1.6 }, cam: 'def' }],
    shadowPool: { e: { at: [1.2, 0, 0], r: 2.2 }, cam: 'med', focus: [1.2, 0, 0.3] },
    infoStream: { e: { at: 'sukuna.head', dur: 3 }, cam: 'med', focus: [1.2, 0, 1.6] },
    glyphRings: { e: { at: 'gojo.chest', r: 1.3, dur: 4 }, cam: 'med', focus: [-1.2, 0, 1.4] },
    shockwave: { e: { at: [0, 0, 0], r: 9, strength: 3 }, cam: 'def', focus: [0, 0, 1] },
    dust: { e: { at: [0, 0, 0], n: 9 }, cam: 'med', focus: [0, 0, 0.6] },
    debris: [{ e: { at: [0, 0, 0.5], n: 16, speed: 9 }, cam: 'def', focus: [0, 0, 2] }, { e: { at: [0, 0, 0.5], n: 12, speed: 6, size: 0.45, mat: 'brick' }, cam: 'med', focus: [0, 0, 1.2] }, { e: { at: [0, 0, 0], pull: [0, 0, 1.6], n: 18, r: 4, size: 0.4 }, cam: 'med', focus: [0, 0, 1] }],
    glass: { e: { at: [0, 2, 7], n: 28, speed: 5 }, cam: 'def', focus: [0, 2, 3] },
    fire: { e: { at: [0, 0, 0], r: 1.1, h: 2.4 }, cam: 'med', focus: [0, 0, 1.1] },
    smoke: [{ e: { at: [0, 3, 0], dur: 4 }, cam: 'def', focus: [0, 3, 3] }, { e: { at: [0, 3, 0], dur: 4, dark: false }, cam: 'def', focus: [0, 3, 3] }],
    crater: { e: { at: [0, 0, 0], r: 3 }, cam: 'high', focus: [0, 0, 0] },
    speedLines: [{ e: { x: 320, y: 180 }, cam: 'def', screen: [320, 180] }, { e: { mode: 'parallel', angle: 0.12 }, cam: 'def', screen: [320, 180] }],
  };
  const variants = name => (Array.isArray(LAB[name]) ? LAB[name] : [LAB[name]]);
  const frameCv = HT.canvas(W, H);
  function renderFx(name, cfg, age, extraE) {
    const g = frameCv.g, cs = CAMS[cfg.cam] || CAMS.def;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const S = mockS(cs, age);
    g.drawImage(backdrop(cs), 0, 0);
    const list = [Object.assign({ fx: name, t: 0, seed: 1234 }, cfg.e, extraE || {})];
    // Chrome records 2D commands and rasterizes them on flush; a 1-px readback flushes, so each timed window holds
    // exactly the effect's own recording + rasterization (the film flushes every frame for the quantizer anyway)
    g.getImageData(0, 0, 1, 1);
    const t0 = performance.now();
    HT.fxDraw(g, S, list, 'ground'); HT.fxDraw(g, S, list, 'behind');
    g.getImageData(0, 0, 1, 1);
    const t1 = performance.now();
    if (cfg.cast !== false) drawCast(g, S);
    g.getImageData(0, 0, 1, 1);
    const t2 = performance.now();
    HT.fxDraw(g, S, list, 'front');
    g.getImageData(0, 0, 1, 1);
    const t3 = performance.now();
    return { S, ms: t1 - t0 + (t3 - t2) };
  }
  const durFor = (name, cfg, extraE) => { const F = HT.FX[name], e = Object.assign({ fx: name, t: 0 }, cfg.e, extraE || {}); return e.dur !== undefined ? e.dur : typeof F.dur === 'function' ? F.dur(e) : F.dur; };
  function focusOf(cfg, S) {
    if (cfg.screen) return cfg.screen;
    const f = cfg.focus || (Array.isArray(cfg.e.at) ? cfg.e.at : cfg.e.center) || [0, 0, 1];
    const p = S.project(f[0], f[1], f[2] || 0);
    return p ? [p.x, p.y] : [W / 2, H / 2];
  }
  const parseP = Q => { const o = {}, s = Q.get('p'); if (s) for (const kv of s.split(',')) { const [k, v] = kv.split(':'); o[k] = isNaN(+v) ? (v === 'true' ? true : v === 'false' ? false : v) : +v; } return o; };
  labs.fx = Q => {
    const scale = +(Q.get('scale') || 1), name = Q.get('name');
    if (name) {
      const vs = variants(name), cfg = vs[+(Q.get('v') || 0)] || vs[0], n = +(Q.get('n') || 12), extra = parseP(Q), dur = durFor(name, cfg, extra);
      const from = +(Q.get('from') || 0), to = Math.min(dur, +(Q.get('to') || dur)), cells = [];
      const cw = +(Q.get('cw') || W), ch = +(Q.get('ch') || H); // cw/ch < frame: 1:1 crop around the effect (use scale=2 to inspect pixels)
      for (let k = 0; k < n; k++) {
        const age = Math.min(dur - 1e-3, from + ((to - from) * k) / n);
        cells.push({ label: name + ' ' + age.toFixed(2) + 's', draw(g) { const r = renderFx(name, cfg, age, extra), f = focusOf(cfg, r.S); const x0 = cw < W ? Math.max(0, Math.min(W - cw, Math.round(f[0] - cw / 2))) : 0, y0 = ch < H ? Math.max(0, Math.min(H - ch, Math.round(f[1] - ch / 2))) : 0; g.drawImage(frameCv.c, -x0, -y0); } });
      }
      return HT.sheet(cells, { cw, ch, cols: +(Q.get('cols') || 4), scale, bg: '#17111a' });
    }
    const only = Q.get('only') ? Q.get('only').split(',') : null, cw = +(Q.get('cw') || 320), ch = +(Q.get('ch') || 180), cells = [];
    for (const nm of Object.keys(LAB).filter(n => !only || only.includes(n))) {
      const vs = Q.get('all') ? variants(nm) : [variants(nm)[0]];
      vs.forEach((cfg, vi) => {
        const dur = durFor(nm, cfg);
        for (let k = 0; k < 6; k++) {
          const age = cfg.ages ? cfg.ages[k] : Math.min(dur - 1e-3, (dur * k) / 6 + (k ? 0 : 0.001));
          cells.push({ label: nm + (vi ? ' v' + vi : '') + ' ' + age.toFixed(2), draw(g) { const r = renderFx(nm, cfg, age), f = focusOf(cfg, r.S); const x0 = Math.max(0, Math.min(W - cw, Math.round(f[0] - cw / 2))), y0 = Math.max(0, Math.min(H - ch, Math.round(f[1] - ch / 2))); g.drawImage(frameCv.c, -x0, -y0); } });
        }
      });
    }
    return HT.sheet(cells, { cw, ch, cols: 6, scale, bg: '#17111a' });
  };
  // ---- post lab: a test pattern through split / shatter / speed, and snow at three camera yaws (parallax)
  function testPattern(g) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    HT.vgrad(g, 0, 0, W, H, [[0, C.navy], [0.5, C.indigo], [1, C.teal]]);
    for (let i = 0; i < 64; i++) HT.rect(g, (i % 16) * 40, 280 + Math.floor(i / 16) * 20, 40, 20, HT.PAL[i]);
    for (let x = 0; x < W; x += 32) HT.vline(g, x, 0, 279, C.shadow);
    for (let y = 0; y < 280; y += 32) HT.hline(g, 0, W, y, C.shadow);
    HT.circle(g, 160, 140, 60, C.coral); HT.circle(g, 160, 140, 40, C.gold); HT.circle(g, 470, 130, 70, C.lavender); HT.ring(g, 470, 130, 90, C.white);
    HT.text(g, 'DOMAIN CLASH', W / 2, 30, { col: C.white, align: 'center', scale: 3, shadow: C.ink });
  }
  const POSTS = [['split', { angle: -0.38, gap: 60, sep: 8, cut: 0.25 }, 1.6], ['shatter', { x: 330, y: 150, crack: 0.35 }, 1.6], ['speed', { mode: 'focus', x: 320, y: 170 }, 0.6], ['speed', { mode: 'parallel', angle: 0.1 }, 0.6]];
  labs.post = Q => {
    const scale = +(Q.get('scale') || 1), cells = [];
    for (const [nm, e, dur] of POSTS) for (let k = 0; k < 6; k++) {
      const age = (dur * (k + 0.5)) / 6;
      cells.push({ label: nm + ' ' + age.toFixed(2), draw(g) { const fg = frameCv.g; testPattern(fg); HT.post[nm](fg, mockS(CAMS.def, age), Object.assign({ t: 0 }, e), age, dur); g.drawImage(frameCv.c, 0, 0); } });
    }
    for (const dyaw of [-0.3, 0, 0.3]) for (const t of [0, 0.5]) cells.push({ label: 'snow dyaw ' + dyaw + ' t ' + t, draw(g) { const fg = frameCv.g, cs = Object.assign({}, CAMS.def, { dyaw }), S = mockS(cs, t); fg.setTransform(1, 0, 0, 1, 0, 0); fg.drawImage(backdrop(cs), 0, 0); HT.weather.snow(fg, S, 0.8, { t }); g.drawImage(frameCv.c, 0, 0); } });
    return HT.sheet(cells, { cw: W, ch: H, cols: +(Q.get('cols') || 3), scale, bg: '#17111a' });
  };
  // ---- perf + determinism + photosensitivity self-checks
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = lin(i / 255);
  function relLum(img, out) { const d = img.data, n = d.length / 4; for (let i = 0; i < n; i++) out[i] = 0.2126 * LIN[d[4 * i]] + 0.7152 * LIN[d[4 * i + 1]] + 0.0722 * LIN[d[4 * i + 2]]; return out; }
  function pixHash(g) { const d = g.getImageData(0, 0, W, H).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) { h ^= d[i] | (d[i + 1] << 8) | (d[i + 2] << 16); h = Math.imul(h, 16777619); } return h >>> 0; }
  labs.fxperf = Q => {
    const out = {}, reps = +(Q.get('reps') || 3), only = Q.get('only') ? Q.get('only').split(',') : null, flash = Q.get('flash') !== '0';
    const AREA = 0.0277 * W * H; // WCAG 2.3.1 general flash: 25 % of a 10° field ≈ 2.8 % of a full-screen frame (strict)
    const LUM = new Float32Array(W * H), La = new Float32Array((W / 4) * (H / 4)), Lb = new Float32Array((W / 4) * (H / 4));
    const blockLum = (L, out) => { for (let by = 0; by < H / 4; by++) for (let bx = 0; bx < W / 4; bx++) { let sum = 0; for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) sum += L[(by * 4 + yy) * W + bx * 4 + xx]; out[by * (W / 4) + bx] = sum / 16; } return out; };
    for (const nm of Object.keys(LAB)) {
      if (only && !only.includes(nm)) continue;
      variants(nm).forEach((cfg, vi) => {
        const key = nm + (vi ? ':' + vi : ''), dur = durFor(nm, cfg), ages = [];
        for (let k = 0; k < 12; k++) ages.push(Math.min(dur - 1e-3, (dur * (k + 0.5)) / 12));
        for (const a of ages) renderFx(nm, cfg, a);
        let sum = 0, mx = 0, cnt = 0;
        for (let r = 0; r < reps; r++) for (const a of ages) { const { ms } = renderFx(nm, cfg, a); sum += ms; cnt++; if (ms > mx) mx = ms; }
        renderFx(nm, cfg, ages[5]); const hA = pixHash(frameCv.g);
        renderFx(nm, cfg, ages[9]); renderFx(nm, cfg, ages[2]);
        renderFx(nm, cfg, ages[5]); const hB = pixHash(frameCv.g);
        const rec = { avg: +(sum / cnt).toFixed(3), max: +mx.toFixed(3), det: hA === hB };
        if (flash && vi === 0) {
          // WCAG 2.3.1 general-flash approximation: luminance averaged over 4×4 blocks (dither averages out); a block
          // transitions when relative luminance changes by ≥ 0.1 with the darker state < 0.8; a flash event happens
          // when the blocks transitioning the same way cover > 25 % of a 10° field (≈ 212×160 art px, film full-screen,
          // sliding windows); flashes/s = completed opposing event pairs in the worst window within any 30 frames.
          const GW = W / 4, GH = H / 4, nb = GW * GH, n = Math.ceil(dur * 30), FW = 53, FH = 40, STEP = 6;
          const wins = []; for (let wy = 0; wy + FH <= GH; wy += STEP) for (let wx = 0; wx + FW <= GW; wx += STEP) wins.push([wx, wy, []]);
          const need = FW * FH * 0.25, up = new Int32Array((GW + 1) * (GH + 1)), dn = new Int32Array((GW + 1) * (GH + 1));
          let prev = null, cur = La, total = 0;
          for (let f = 0; f <= n; f++) {
            renderFx(nm, cfg, Math.min(dur - 1e-3, f / 30));
            const img = frameCv.g.getImageData(0, 0, W, H); HT.quantize(img);
            relLum(img, LUM); blockLum(LUM, cur);
            if (prev) {
              for (let by = 0; by < GH; by++) for (let bx = 0; bx < GW; bx++) { // 2D prefix sums of up / down transitions
                const i = by * GW + bx, d = cur[i] - prev[i], t = Math.min(cur[i], prev[i]) < 0.8 && Math.abs(d) >= 0.1, o = (by + 1) * (GW + 1) + bx + 1;
                if (t) total++;
                up[o] = (t && d > 0 ? 1 : 0) + up[o - 1] + up[o - GW - 1] - up[o - GW - 2];
                dn[o] = (t && d < 0 ? 1 : 0) + dn[o - 1] + dn[o - GW - 1] - dn[o - GW - 2];
              }
              const S2 = (A, x0, y0) => A[(y0 + FH) * (GW + 1) + x0 + FW] - A[y0 * (GW + 1) + x0 + FW] - A[(y0 + FH) * (GW + 1) + x0] + A[y0 * (GW + 1) + x0];
              for (const w of wins) { if (S2(up, w[0], w[1]) > need) w[2].push(f, 1); if (S2(dn, w[0], w[1]) > need) w[2].push(f, -1); }
            }
            prev = cur; cur = cur === La ? Lb : La;
          }
          let worst = 0;
          for (const w of wins) { const E2 = w[2]; for (let a = 0; a < E2.length; a += 2) { let flips = 0, last = 0; for (let b = a; b < E2.length && E2[b] - E2[a] < 30; b += 2) if (E2[b + 1] !== last) { flips++; last = E2[b + 1]; } worst = Math.max(worst, Math.floor(flips / 2)); } }
          rec.flashesPerSec = worst; rec.transitions = total;
        }
        if (HT.FX[nm]._err) rec.error = HT.FX[nm]._err;
        out[key] = rec;
      });
    }
    const fg = frameCv.g;
    for (const [nm, e, dur] of POSTS.slice(0, 3)) {
      let sum = 0, mx = 0, cnt = 0;
      for (let r = 0; r <= reps; r++) for (let k = 0; k < 12; k++) { const age = (dur * (k + 0.5)) / 12, S = mockS(CAMS.def, age); testPattern(fg); fg.getImageData(0, 0, 1, 1); const t0 = performance.now(); HT.post[nm](fg, S, Object.assign({ t: 0 }, e), age, dur); fg.getImageData(0, 0, 1, 1); const ms = performance.now() - t0; if (r) { sum += ms; cnt++; mx = Math.max(mx, ms); } }
      out['post.' + nm] = { avg: +(sum / cnt).toFixed(3), max: +mx.toFixed(3) };
    }
    { let sum = 0, mx = 0; for (let k = 0; k < 24; k++) { const S = mockS(CAMS.def, k / 10); fg.drawImage(backdrop(CAMS.def), 0, 0); fg.getImageData(0, 0, 1, 1); const t0 = performance.now(); HT.weather.snow(fg, S, 1, { near: true }); fg.getImageData(0, 0, 1, 1); const ms = performance.now() - t0; sum += ms; mx = Math.max(mx, ms); } out['weather.snow(1)'] = { avg: +(sum / 24).toFixed(3), max: +mx.toFixed(3) }; }
    out._caches = HT.caches.filter(c => c.name.startsWith('fx.')).map(c => [c.name, c.size()]);
    window.__fxPerf = out;
    console.log('fxperf ' + JSON.stringify(out));
    const rows = Object.keys(out).filter(k => k[0] !== '_'), cv = document.createElement('canvas');
    cv.width = 760; cv.height = 30 + rows.length * 10 + 20;
    const g = cv.getContext('2d'); g.fillStyle = '#17111a'; g.fillRect(0, 0, cv.width, cv.height);
    HT.text(g, 'FX DRAW TIME MS (WARM)  AVG     MAX   DETERMINISTIC  FLASH/S', 8, 8, { col: C.foam, font: 'small' });
    rows.forEach((k, i) => {
      const r = out[k], bad = r.error || r.det === false || r.flashesPerSec > 3;
      HT.text(g, k.padEnd(22, ' ') + String(r.avg).padStart(8, ' ') + String(r.max).padStart(8, ' ') + (r.det === undefined ? '' : r.det ? '     YES' : '     NO!') + (r.flashesPerSec === undefined ? '' : '         ' + r.flashesPerSec) + (r.error ? '  ERROR ' + r.error : ''), 8, 24 + i * 10, { col: bad ? C.red : r.max > 3 ? C.gold : C.mist, font: 'small' });
    });
    return cv;
  };
  HT.fxLab = { LAB, CAMS, mockS, backdrop, renderFx, durFor, frame: frameCv };
})();
