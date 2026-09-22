/* DOMAIN CLASH — set renderers. All draw the one Shinjuku world model (city.js) + the damage ledger at film time T.

   'city'     street-level 3D: a software renderer into one ImageData per frame —
                walls (vertical faces, column by column, perspective-correct u, front-to-back with a coverage mask so
                every pixel is shaded once; faces may have sloped top/bottom edges → sliced buildings), roofs (general
                plane casting), props (signals, lamps, bare trees, cars; depth-tested against walls), ground (per-row
                floor casting of a procedural street surface: asphalt, lane marks, crosswalk stripes, paving, snow,
                craters, the Purple canyon trench), sky (per-row gradient + a cylindrical far skyline + clouds).
              Pitch is sheared (converted to lens shift) so verticals stay vertical — the scene runner does the same
              conversion for characters/FX when a set declares shear:true.
   'voxel'    Voxel Space (NovaLogic Comanche 1992, after s-macke/VoxelSpace) over a heightfield built from the same
              buildings (walls get floor/window patterns from the per-pixel world height) — flyovers and chases.
   'overhead' top-down map (roofs with props and sun shadows, streets, damage) — overhead mode-7 style shots.
   'plain', 'black', 'white' utility sets. Domain / sky / rooftop / command / airport sets live in their own files. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, CAM = HT.cam, city = HT.city;
  const W = HT.W, H = HT.H;
  const clamp = HT.clamp, lerp = HT.lerp;
  const floor = Math.floor, round = Math.round, abs = Math.abs, sqrt = Math.sqrt;
  HT.SETS = HT.SETS || {};

  const rgb = hex => HT.rgb(hex);
  const pk = (r, g, b) => (0xff000000 | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;

  // ------------------------------------------------------------------ lighting environments (per time of day)
  // sky: [elevationFrac 0 (horizon) .. 1 (top), hex]; fog colour + range; sun dir (world, unit) for wall shading;
  // lit: fraction of lit windows; skyline colour; ambient multiplier; wall face light by facing (N,E,S,W)
  const ENVS = {
    dawn: { sky: [[0, C.salmon], [0.06, C.pinkrose], [0.16, C.lavender], [0.32, C.blue], [0.62, C.indigo], [1, C.navy]], fog: C.lilacgrey, fogNear: 30, fogFar: 700, fogMax: 0.9, grade: [72, 74, 119], gradeK: 0.34, sun: [0.8, -0.2, 0.12], lit: 0.05, skyline: C.indigo, amb: 0.62, snowCol: '#e2ecfa', ground: [1, 1, 1.04] },
    noon: { sky: [[0, C.mist], [0.12, C.ice], [0.5, C.sky], [1, C.blue]], fog: C.mist, fogNear: 60, fogFar: 1200, sun: [-0.3, 0.3, 0.9], lit: 0.0, skyline: C.steel, amb: 0.8, snowCol: C.white },
    overcast: { sky: [[0, C.mist], [0.3, C.steel], [1, C.lilacgrey]], fog: C.steel, fogNear: 30, fogFar: 650, sun: [-0.4, 0.2, 0.6], lit: 0.03, skyline: C.dusk, amb: 0.7, snowCol: C.mist },
    sunset: { sky: [[0, C.gold], [0.05, C.amber], [0.12, C.coral], [0.26, C.rose], [0.5, C.purple], [1, C.plum]], fog: C.rose, fogNear: 40, fogFar: 900, sun: [-0.85, 0.3, 0.1], lit: 0.12, skyline: C.berry, amb: 0.6, snowCol: C.peach },
    night: { sky: [[0, C.indigo], [0.25, C.navy], [1, C.ink]], fog: C.navy, fogNear: 30, fogFar: 700, sun: [0.3, 0.3, 0.4], lit: 0.25, skyline: C.shadow, amb: 0.4, snowCol: C.lilacgrey },
    white: { sky: [[0, C.white], [1, C.mist]], fog: C.white, fogNear: 10, fogFar: 300, sun: [0, 0, 1], lit: 0, skyline: C.mist, amb: 1, snowCol: C.white },
  };
  HT.ENVS = ENVS;
  const envOf = env => ENVS[env && env.time] || ENVS.dawn;

  // ------------------------------------------------------------------ facade tiles (one bay × one floor, 8 texels/m)
  // styles × variants: 0 dark window, 1 lit window, 2 broken, 3 ground floor (shutters/storefront)
  const TW = 32, TH = 28;
  const TILES = {};
  function makeTiles() {
    const P = (hex) => { const [r, g, b] = rgb(hex); return [r, g, b]; };
    const def = {
      glass: { frame: P(C.slate), wall: P(C.charcoal), glass: P(C.deepteal), glass2: P(C.teal), lit: P(C.butter), sill: P(C.steel) },
      office: { frame: P(C.steel), wall: P(C.lilacgrey), glass: P(C.navy), glass2: P(C.indigo), lit: P(C.honey), sill: P(C.mist) },
      concrete: { frame: P(C.sand), wall: P(C.rosewood), glass: P(C.shadow), glass2: P(C.dusk), lit: P(C.amber), sill: P(C.mist) },
      tile: { frame: P(C.clay), wall: P(C.rust), glass: P(C.shadow), glass2: P(C.mauve), lit: P(C.gold), sill: P(C.tan) },
      tower: { frame: P(C.steel), wall: P(C.slate), glass: P(C.navy), glass2: P(C.blue), lit: P(C.butter), sill: P(C.mist) },
      kabuki: { frame: P(C.dusk), wall: P(C.mauve), glass: P(C.plum), glass2: P(C.purple), lit: P(C.hotpink), sill: P(C.lilacgrey) },
    };
    for (const st in def) {
      const d = def[st], out = [];
      for (let v = 0; v < 4; v++) {
        const px = new Uint32Array(TW * TH);
        for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
          let c = d.wall;
          const glassBand = st === 'glass' || st === 'tower';
          const wx0 = glassBand ? 2 : 6, wx1 = glassBand ? TW - 2 : TW - 6, wy0 = glassBand ? 3 : 7, wy1 = TH - 5;
          if (v === 3) { // ground floor: storefront glass + shutters
            if (y > 5 && y < TH - 1 && x > 2 && x < TW - 3) c = (y % 3 === 0) ? d.frame : (x < TW / 2 ? P(C.dusk) : P(C.lilacgrey));
            if (y <= 5) c = d.frame;
          } else if (x >= wx0 && x < wx1 && y >= wy0 && y < wy1) {
            if (v === 2) c = ((x * 7 + y * 13) % 5 < 2) ? P(C.ink) : P(C.shadow); // broken: dark hole + shards
            else {
              // pane: sky reflection brighter toward the top of each pane, a darker lower half, a crisp glint corner
              const fy = (y - wy0) / Math.max(1, wy1 - wy0);
              const g = v === 1 ? d.lit : (fy < 0.45 ? d.glass2 : d.glass);
              c = g;
              if (glassBand && (x - wx0) % 8 === 0) c = d.frame; // mullions
              else if (v !== 1 && ((x - wx0) % 8) === 1 && fy < 0.45) c = [Math.min(255, g[0] + 34), Math.min(255, g[1] + 40), Math.min(255, g[2] + 46)]; // glint
              if (v === 1 && (y - wy0) === 0) c = [Math.min(255, g[0] + 20), Math.min(255, g[1] + 20), Math.min(255, g[2] + 10)];
            }
          } else if (y >= wy1 && y < wy1 + 2 && x >= wx0 - 1 && x < wx1 + 1) c = d.sill;
          else if ((y === 0 || x === 0) && !glassBand) c = d.frame;
          px[y * TW + x] = (c[0] << 16) | (c[1] << 8) | c[2];
        }
        out.push(px);
      }
      TILES[st] = out;
    }
    // plain concrete for the expressway: deck side (a guard-rail band at the top, a drip line at the bottom) and piers
    const plain = (base, band, dark) => { const px = new Uint32Array(TW * TH); for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { let c = base; if (band && y >= TH - 6) c = (x % 8 === 0) ? dark : band; else if (band && y <= 1) c = dark; else if (((x * 13 + y * 7) % 23) === 0) c = dark; px[y * TW + x] = (c[0] << 16) | (c[1] << 8) | c[2]; } return px; };
    TILES.deck = [0, 1, 2, 3].map(() => plain(P(C.lilacgrey), P(C.steel), P(C.dusk)));
    TILES.pier = [0, 1, 2, 3].map(() => plain(P(C.dusk), null, P(C.shadow)));
  }
  makeTiles();

  // ------------------------------------------------------------------ tileable smooth noise (256², 0.35 m/texel, bilinear)
  const NZ = 256, NOISE = new Float32Array(NZ * NZ);
  (function () {
    const per = (x, y, p, seed) => HT.noise(x, y, seed) * (1 - x / p) * (1 - y / p) + HT.noise(x - p, y, seed) * (x / p) * (1 - y / p) + HT.noise(x, y - p, seed) * (1 - x / p) * (y / p) + HT.noise(x - p, y - p, seed) * (x / p) * (y / p);
    for (let y = 0; y < NZ; y++) for (let x = 0; x < NZ; x++) {
      const a = per(x / 32, y / 32, 8, 31) * 0.55 + per(x / 8, y / 8, 32, 32) * 0.3 + per(x / 2, y / 2, 128, 33) * 0.15;
      NOISE[y * NZ + x] = a;
    }
  })();
  const NSC = 1 / 0.35;
  function noiseAt(wx, wy) {
    const fx = wx * NSC, fy = wy * NSC, ix = Math.floor(fx), iy = Math.floor(fy), ax = fx - ix, ay = fy - iy;
    const x0 = ix & 255, y0 = iy & 255, x1 = (ix + 1) & 255, y1 = (iy + 1) & 255;
    const a = NOISE[y0 * NZ + x0], b = NOISE[y0 * NZ + x1], c2 = NOISE[y1 * NZ + x0], d = NOISE[y1 * NZ + x1];
    return a + (b - a) * ax + (c2 - a) * ay + (a - b - c2 + d) * ax * ay;
  }
  HT.cityNoise = noiseAt;

  // ------------------------------------------------------------------ derived geometry from the ledger
  // pieces: { b (building), x0,y0,x1,y1, zb:[z at x0/y0 side, z at x1/y1 side], zt:[...], axis: 'x'|'y' (slope axis),
  //           style, seed, rubble: bool, u0 (facade u offset) }
  // ground decal grid (1 m): 1 canyon, 2 crater core, 3 crater rim rubble, 4 scorch, 5 erasure bowl; K = strength 0..255
  const decalCache = HT.lru(4);
  function decalGrid(version, craters, canyons, erasures, scorch) {
    let dg = decalCache.get(version);
    if (dg) return dg;
    const GN = city.GN, EXT = city.EXT, DEC = new Uint8Array(GN * GN), DK = new Uint8Array(GN * GN), DP = new Uint8Array(GN * GN), CI = new Uint8Array(GN * GN), XI = new Uint8Array(GN * GN);
    const stamp = (x0, y0, x1, y1, fn) => { for (let y = Math.max(-EXT, Math.floor(y0)); y < Math.min(EXT, Math.ceil(y1)); y++) for (let x = Math.max(-EXT, Math.floor(x0)); x < Math.min(EXT, Math.ceil(x1)); x++) fn((y + EXT) * GN + x + EXT, x + 0.5, y + 0.5); };
    canyons.forEach((cn, k) => stamp(Math.min(cn.x0, cn.x1) - cn.w, Math.min(cn.y0, cn.y1) - cn.w, Math.max(cn.x0, cn.x1) + cn.w, Math.max(cn.y0, cn.y1) + cn.w, (i, x, y) => {
      const d = segDist(x, y, cn); if (d >= cn.w / 2) return;
      if (DEC[i] === 1 && (canyons[CI[i]].depth || 24) >= (cn.depth || 24)) return; // a crossing: the deeper cut wins
      DEC[i] = 1; CI[i] = k; DK[i] = Math.min(255, Math.round((cn.w / 2 - d) * 20)); DP[i] = Math.round(segParam(x, y, cn) * 255);
    }));
    // (cells whose square reaches the decal are marked; the ground pass shades each pixel from the exact geometry — a 1 m
    // cell shaded flat read as blocky squares at street level)
    const reach = (x, y, cx, cy, r) => { const dx = Math.max(0, Math.abs(x - cx) - 0.71), dy = Math.max(0, Math.abs(y - cy) - 0.71); return (dx * dx + dy * dy) / (r * r); };
    craters.forEach((cr, k) => stamp(cr.x - cr.r * 1.4, cr.y - cr.r * 1.4, cr.x + cr.r * 1.4, cr.y + cr.r * 1.4, (i, x, y) => { const q = ((x - cr.x) ** 2 + (y - cr.y) ** 2) / (cr.r * cr.r); if (q < 1) { DEC[i] = 2; DK[i] = Math.round(q * 255); XI[i] = k; } else if (reach(x, y, cr.x, cr.y, cr.r) < 1.6 && DEC[i] !== 2) { DEC[i] = 3; DK[i] = 128; XI[i] = k; } }));
    scorch.forEach((sc, k) => stamp(sc.x - sc.r - 1, sc.y - sc.r - 1, sc.x + sc.r + 1, sc.y + sc.r + 1, (i, x, y) => { if (reach(x, y, sc.x, sc.y, sc.r) < 1 && !DEC[i]) { DEC[i] = 4; DK[i] = Math.round(Math.min(1, ((x - sc.x) ** 2 + (y - sc.y) ** 2) / (sc.r * sc.r)) * 255); XI[i] = k; } }));
    erasures.forEach((er, k) => stamp(er.x - er.r - 1, er.y - er.r - 1, er.x + er.r + 1, er.y + er.r + 1, (i, x, y) => { if (reach(x, y, er.x, er.y, er.r) < 1) { DEC[i] = 5; DK[i] = Math.round(Math.max(0, 1 - ((x - er.x) ** 2 + (y - er.y) ** 2) / (er.r * er.r)) * 255); XI[i] = k; } }));
    dg = { DEC, DK, DP, CI, XI };
    decalCache.set(version, dg);
    return dg;
  }
  const geoCache = HT.lru(6);
  function geometry(T) {
    const key = HT.ledger ? HT.ledger.key(T) : '0';
    let g = geoCache.get(key);
    if (g) return g;
    const st = HT.ledger ? HT.ledger.state(T) : [];
    const dead = new Set(), slices = {}, holes = {}, craters = [], canyons = [], erasures = [], scorch = [], signals = {}, collapsing = {}, shreds = [], deckHoles = [];
    for (const e of st) {
      const age = T - e.T0;
      if (e.kind === 'slice') slices[e.b] = { e, age };
      else if (e.kind === 'hole') (holes[e.b] = holes[e.b] || []).push(e);
      else if (e.kind === 'crater') craters.push(e);
      else if (e.kind === 'flatten') dead.add(e.b);
      else if (e.kind === 'collapse') { if (age >= (e.dur || 3)) dead.add(e.b); else collapsing[e.b] = { e, age }; }
      else if (e.kind === 'canyon') canyons.push(Object.assign({}, e, { prog: e.dur ? clamp(age / e.dur, 0, 1) : 1 }));
      else if (e.kind === 'erasure') erasures.push(e);
      else if (e.kind === 'scorch') scorch.push(e);
      else if (e.kind === 'signal') signals[e.id] = e.state;
      else if (e.kind === 'shred') shreds.push(Object.assign({}, e, { prog: e.dur ? clamp(age / e.dur, 0, 1) : 1 }));
      else if (e.kind === 'deckHole') deckHoles.push(e);
    }
    const pieces = [];
    const inCanyon = (x, y) => canyons.some(c => segDist(x, y, c) < c.w / 2 && segParam(x, y, c) <= c.prog);
    for (const b of city.buildings) {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      if (canyons.some(c => segDist(cx, cy, c) < c.w / 2 + Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.3 && segParam(cx, cy, c) <= c.prog)) { rubbleOf(b, pieces, 3); continue; }
      const cl = collapsing[b.id];
      if (cl && !slices[b.id]) { // sinking into its own dust (vertical walls stay vertical), then rubble once the entry's dur has passed
        const k = HT.E.inQuad(clamp(cl.age / (cl.e.dur || 3), 0, 1)), h2 = Math.max(4, b.h * (1 - k));
        pieces.push({ b, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, zb: [0, 0], zt: [h2, h2], axis: 'x', style: b.style, seed: b.seed, holes: holes[b.id], cutTop: k > 0.02 });
        continue;
      }
      const sinkK = cl ? HT.E.inQuad(clamp(cl.age / (cl.e.dur || 3), 0, 1)) : 0; // a sliced building collapsing: both halves sink
      if (erasures.some(E => Math.hypot(cx - E.x, cy - E.y) < E.r * 0.9)) continue; // erased entirely
      if (dead.has(b.id)) { rubbleOf(b, pieces, 6); continue; }
      const shr = slices[b.id] ? null : shreds.find(sh => Math.hypot(cx - sh.x, cy - sh.y) < sh.r * sh.prog);
      if (shr) { shredOf(b, pieces, holes[b.id], (shr.T0 || 0) + (shr.dur || 0) * Math.hypot(cx - shr.x, cy - shr.y) / shr.r); continue; } // (the moment the range reached it)
      const s = slices[b.id];
      if (s) {
        const e = s.e, axis = e.axis || 'x', zA = e.zA, zB = e.zB;
        const u = HT.E.inQuad(clamp(s.age / (e.dur || 2.2), 0, 1));
        const width = axis === 'x' ? b.x1 - b.x0 : b.y1 - b.y0;
        const slide = (e.slide === undefined ? 0.35 * width : e.slide) * u;
        const dir = zA > zB ? 1 : -1; // slide toward the lower end of the cut
        const dz = -abs(zA - zB) / width * slide;
        const sk = 1 - sinkK, low = z => Math.max(3, z * sk);
        pieces.push({ b, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, zb: [0, 0], zt: [low(zA), low(zB)], axis, style: b.style, seed: b.seed, holes: holes[b.id], cutTop: true });
        const ox = axis === 'x' ? dir * slide : 0, oy = axis === 'y' ? dir * slide : 0;
        if (e.fall && s.age > (e.dur || 2.2)) continue; // upper piece has fallen out of the scene (collapse elsewhere)
        if (sinkK < 0.98) { const drop = (b.h + dz) * sinkK; pieces.push({ b, x0: b.x0 + ox, y0: b.y0 + oy, x1: b.x1 + ox, y1: b.y1 + oy, zb: [Math.max(0, zA + dz - drop), Math.max(0, zB + dz - drop)], zt: [Math.max(3, b.h + dz - drop), Math.max(3, b.h + dz - drop)], axis, style: b.style, seed: b.seed, cutBottom: true, u0: 0 }); }
        continue;
      }
      pieces.push({ b, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, zb: [0, 0], zt: [b.h, b.h], axis: 'x', style: b.style, seed: b.seed, holes: holes[b.id] });
    }
    // the expressway: deck spans + piers (gone inside the canyon or an erasure; a span with a deckHole keeps its hole)
    const V = city.viaduct;
    if (V) {
      const gone = (x, y) => inCanyon(x, y) || erasures.some(E => Math.hypot(x - E.x, y - E.y) < E.r * 0.9);
      for (const sp of V.spans) {
        const mx = (sp.x0 + sp.x1) / 2;
        if (gone(mx, 0)) continue;
        const hs = deckHoles.filter(h => h.x > sp.x0 - h.r && h.x < sp.x1 + h.r);
        pieces.push({ b: { h: V.z1, floorH: 99, bay: 99, roof: 0 }, x0: sp.x0, y0: sp.y0, x1: sp.x1, y1: sp.y1, zb: [V.z0, V.z0], zt: [V.z1, V.z1], axis: 'x', style: 'deck', seed: 7, deck: true, deckHoles: hs.length ? hs : null });
      }
      for (const pr of V.pillars) { if (gone((pr.x0 + pr.x1) / 2, 0)) continue; pieces.push({ b: { h: V.z0, floorH: 99, bay: 99 }, x0: pr.x0, y0: pr.y0, x1: pr.x1, y1: pr.y1, zb: [0, 0], zt: [V.z0, V.z0], axis: 'x', style: 'pier', seed: 8, pier: true }); }
    }
    // canyon trench walls (faces below ground along both band edges)
    const trench = [];
    for (const c of canyons) {
      const dx = c.x1 - c.x0, dy = c.y1 - c.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const ex = c.x0 + dx * c.prog, ey = c.y0 + dy * c.prog; // the trench only exists behind the sweeping front
      if (c.prog > 0.001) for (const s of [-1, 1]) trench.push({ ax: c.x0 + nx * s * c.w / 2, ay: c.y0 + ny * s * c.w / 2, bx: ex + nx * s * c.w / 2, by: ey + ny * s * c.w / 2, depth: c.depth || 24, inward: [-nx * s, -ny * s] });
    }
    // ground decal grid (1 m) depends only on which entries exist (not on animation) → cached per ledger version
    const dg = decalGrid(HT.ledger ? HT.ledger.version(T) : 0, craters, canyons, erasures, scorch);
    const DEC = dg.DEC, DK = dg.DK, DP = dg.DP;
    const canProg = canyons.length ? Math.round(canyons[0].prog * 255) : 255, canProgs = canyons.map(c => Math.round(c.prog * 255));
    const glintEnds = pieces.filter(p => p.cutAt !== undefined).map(p => p.cutAt + 12).sort((a, b) => a - b); // when each cut stops glinting
    // street props gone with the ground they stood on: inside a crater, a canyon, an erasure, or the blast ring of
    // flattened buildings around an erasure (its radius = the farthest flattened building within 2.5 r, + 10 m)
    const blasts = erasures.map(E => { let R2 = E.r; for (const b of city.buildings) { if (!dead.has(b.id)) continue; const d = Math.hypot((b.x0 + b.x1) / 2 - E.x, (b.y0 + b.y1) / 2 - E.y); if (d < E.r * 2.5 && d + 10 > R2) R2 = d + 10; } return { x: E.x, y: E.y, r: R2 }; });
    const propGone = new Uint8Array(city.props.length);
    if (craters.length || canyons.length || blasts.length) city.props.forEach((p, k) => {
      if (blasts.some(B => Math.hypot(p.x - B.x, p.y - B.y) < B.r) || craters.some(cr => Math.hypot(p.x - cr.x, p.y - cr.y) < cr.r * 1.1) || inCanyon(p.x, p.y)) propGone[k] = 1;
    });
    g = { pieces, craters, canyons, erasures, scorch, signals, trench, inCanyon, version: key, DEC, DK, DP, CI: dg.CI, XI: dg.XI, canProg, canProgs, shreds, deckHoles, glintEnds, propGone };
    geoCache.set(key, g);
    return g;
  }
  // Malevolent Shrine damage: a building cut by many slashes — a jagged stump with a sloped cut top, one or two slabs
  // above it slid off along their cuts (deterministic per building), plus a rubble skirt where the rest came down
  function shredOf(b, pieces, holes, tCut) {
    // what the Shrine's range leaves of a building: a stump with a sloped cut, 1–2 slabs slid on it, rubble at its foot.
    // The cut tops render as rubble-strewn (diced by the range) with a rim that glints for ~12 s after tCut. (Geometry is
    // fixed since M2: later acts stage action on specific stumps — e.g. the Act IV climb up b275.)
    const rng = HT.rng(b.seed * 7 + 3), axis = rng() < 0.5 ? 'x' : 'y', w = axis === 'x' ? b.x1 - b.x0 : b.y1 - b.y0;
    const h0 = b.h * (0.18 + rng() * 0.3), tilt = (rng() - 0.5) * Math.min(12, b.h * 0.25);
    const za = Math.max(3, h0 + tilt), zb = Math.max(3, h0 - tilt);
    pieces.push({ b, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, zb: [0, 0], zt: [za, zb], axis, style: b.style, seed: b.seed, holes, cutTop: true, cutAt: tCut });
    let base = [za, zb];
    const nSlab = b.h > 30 ? 2 : 1;
    for (let k = 0; k < nSlab; k++) {
      const th = Math.min(b.h - Math.max(base[0], base[1]), b.h * (0.12 + rng() * 0.16));
      if (th < 3) break;
      const t2 = (rng() - 0.5) * Math.min(10, b.h * 0.2), slide = (1.5 + rng() * 0.18 * w) * (rng() < 0.5 ? -1 : 1);
      const ox = axis === 'x' ? slide : 0, oy = axis === 'y' ? slide : 0, sink = 0.6 + rng() * 1.2;
      const lo = [base[0] - sink, base[1] - sink], hi = [base[0] + th + t2, base[1] + th - t2];
      pieces.push({ b, x0: b.x0 + ox, y0: b.y0 + oy, x1: b.x1 + ox, y1: b.y1 + oy, zb: [Math.max(0, lo[0]), Math.max(0, lo[1])], zt: [Math.max(lo[0] + 2, hi[0]), Math.max(lo[1] + 2, hi[1])], axis, style: b.style, seed: b.seed + k + 1, cutTop: true, cutBottom: true, u0: 0, cutAt: tCut });
      base = hi;
    }
    rubbleOf(b, pieces, 2.5);
  }
  function rubbleOf(b, pieces, h) {
    // a mound, not a box: four wedges sloping down to the footprint's edges around a raised, tilted core (all rubble-
    // textured); the rubble of a tall building piles higher (the caller passes the base height, scaled here by size)
    const rng = HT.rng(b.seed), H = h > 5 ? Math.min(30, h + (b.h || 20) * 0.08) : h;
    const w = b.x1 - b.x0, dpt = b.y1 - b.y0, dx = w * (0.26 + rng() * 0.08), dy = dpt * (0.26 + rng() * 0.08);
    const H1 = H * (0.45 + rng() * 0.15), H2 = H * (0.8 + rng() * 0.3), edge = Math.min(1.2, H * 0.12);
    const P = (x0, y0, x1, y1, zt, axis, k) => pieces.push({ b, x0, y0, x1, y1, zb: [0, 0], zt, axis, style: 'rubble', seed: b.seed + k, rubble: true });
    P(b.x0, b.y0, b.x1, b.y0 + dy, [edge, H1], 'y', 0);                 // south wedge (rises inward)
    P(b.x0, b.y1 - dy, b.x1, b.y1, [H1, edge], 'y', 1);                 // north wedge
    P(b.x0, b.y0 + dy, b.x0 + dx, b.y1 - dy, [edge, H1], 'x', 2);       // west wedge
    P(b.x1 - dx, b.y0 + dy, b.x1, b.y1 - dy, [H1, edge], 'x', 3);       // east wedge
    const ax = rng() < 0.5 ? 'x' : 'y';
    P(b.x0 + dx, b.y0 + dy, b.x1 - dx, b.y1 - dy, rng() < 0.5 ? [H1 * 1.05, H2] : [H2, H1 * 1.05], ax, 4); // the core
    if (H > 8) { // a leaning slab sticking out of the heap
      const sx = lerp(b.x0 + dx, b.x1 - dx, rng()), sy = lerp(b.y0 + dy, b.y1 - dy, rng()), sw = 2 + rng() * 3;
      P(sx - sw, sy - 1, sx + sw, sy + 1, [H2 * 0.6, H2 * 1.25], 'x', 5);
    }
  }
  function segParam(x, y, c) { const dx = c.x1 - c.x0, dy = c.y1 - c.y0, L2 = dx * dx + dy * dy || 1; return clamp(((x - c.x0) * dx + (y - c.y0) * dy) / L2, 0, 1); }
  function segDist(x, y, c) {
    const dx = c.x1 - c.x0, dy = c.y1 - c.y0, L2 = dx * dx + dy * dy || 1;
    const u = clamp(((x - c.x0) * dx + (y - c.y0) * dy) / L2, 0, 1);
    return Math.hypot(x - (c.x0 + dx * u), y - (c.y0 + dy * u));
  }
  HT.cityGeometry = geometry;

  // ------------------------------------------------------------------ the city renderer
  const R = { img: null, w: 0, h: 0, mask: null, depth: null, buf: null };
  function ensure(w, h, ctx) {
    if (R.w !== w || R.h !== h || !R.img) {
      R.w = w; R.h = h; R.img = ctx.createImageData(w, h); R.buf = new Uint32Array(R.img.data.buffer);
      R.mask = new Uint8Array(w * h); R.depth = new Float32Array(w * h);
      R.cTop = new Int16Array(w); R.cBot = new Int16Array(w); // per-column contiguous covered band (occlusion skip)
    }
  }
  // per-environment row gradient + fog
  const skyCache = HT.lru(8);
  function skyRows(E, n) { // colour for elevation fraction 0..1 sampled at n steps
    const key = E.sky.map(s => s.join(':')).join('|') + n;
    let a = skyCache.get(key); if (a) return a;
    a = new Uint32Array(n);
    const st = E.sky.map(([p, h]) => [p, rgb(h)]);
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1); let k = 1; while (k < st.length - 1 && p > st[k][0]) k++;
      const [p0, c0] = st[k - 1], [p1, c1] = st[k], u = clamp((p - p0) / Math.max(1e-6, p1 - p0), 0, 1);
      a[i] = pk(c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u);
    }
    skyCache.set(key, a); return a;
  }
  // far skyline: silhouette elevation (radians) by azimuth (4096 bins), with landmark towers west/north-west
  const SKY_N = 4096, SKYLINE = new Float32Array(SKY_N), SKYWIN = new Uint8Array(SKY_N);
  (function () {
    const rng = HT.rng(9);
    for (let i = 0; i < SKY_N; i++) SKYLINE[i] = 0.004 + 0.01 * HT.fbm(i / 60, 0, 3, 5);
    const tower = (az, w, e, win) => { const c = Math.round(((az / (2 * Math.PI)) % 1 + 1) % 1 * SKY_N), hw = Math.round(w / (2 * Math.PI) * SKY_N / 2); for (let k = -hw; k <= hw; k++) { const i = (c + k + SKY_N) % SKY_N; SKYLINE[i] = Math.max(SKYLINE[i], e * (1 - 0.05 * Math.abs(k) / hw)); SKYWIN[i] = win; } };
    // clusters of distant towers all around (Tokyo), heavier to the west (West Shinjuku, beyond the district)
    for (let k = 0; k < 140; k++) { const az = rng() * Math.PI * 2, west = Math.cos(az + Math.PI / 2) > 0.5; tower(az, 0.004 + rng() * 0.012, (west ? 0.03 : 0.012) + rng() * (west ? 0.07 : 0.03), 1 + (rng() < 0.3 ? 1 : 0)); }
    // the twin-towered city hall landmark (twin spires) to the west-north-west
    const tw = -Math.PI / 2 + 0.25; tower(tw - 0.012, 0.012, 0.13, 2); tower(tw + 0.012, 0.012, 0.13, 2); tower(tw, 0.035, 0.085, 1);
    // a cocoon-shaped tower to the south-west
    for (let k = -8; k <= 8; k++) tower(-Math.PI / 2 - 0.5 + k * 0.001, 0.002, 0.11 * Math.sqrt(1 - (k / 9) * (k / 9)), 2);
  })();

  const DEPTH_FAR = 1e9;
  // broken concrete: cellular (Worley) chunks — big slabs in some regions, small debris in others (low-frequency noise
  // picks the cell size) — each chunk tilted (tone ramps across it), dark voids along the chunk borders, a rare rust
  // fleck; the cracks fade out far away (d > 60 m). Returns 0xRRGGBB (bit 24 = an up-facing chunk: snow on rubble tops).
  const RUB = [0x2e222f, 0x3e3546, 0x625565, 0x7f708a, 0x9babb2];
  function rubbleTex(u, v, seed, d) {
    const big = noiseAt(u * 0.13 + seed * 0.37, v * 0.13) > 0.52, cs = big ? 1.6 : 0.6;
    const gx = floor(u / cs), gy = floor(v / cs);
    let d1 = 99, d2 = 99, id = 0, px1 = 0, py1 = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = gx + i, cyy = gy + j;
      const px = (cx + 0.1 + 0.8 * HT.hash(cx * 7919 + cyy * 104729, seed)) * cs, py = (cyy + 0.1 + 0.8 * HT.hash(cx * 31 + cyy * 977, seed + 3)) * cs;
      const dd = (u - px) * (u - px) + (v - py) * (v - py);
      if (dd < d1) { d2 = d1; d1 = dd; id = cx * 131 + cyy * 7 + (big ? 5 : 0); px1 = px; py1 = py; } else if (dd < d2) d2 = dd;
    }
    const edge = (Math.sqrt(d2) - Math.sqrt(d1)) / cs, n = HT.hash(id, seed + 7);
    if (d < 60 && edge < (big ? 0.04 : 0.07)) return RUB[0];                      // voids between chunks
    const tx = HT.hash(id, seed + 11) - 0.5, ty = HT.hash(id, seed + 13) - 0.5;
    const shade = ((u - px1) * tx + (v - py1) * ty) * 2.4 / cs;                   // the chunk's tilt
    let k = clamp(0.18 + n * 0.62 + shade * 0.45, 0, 0.999);
    if (d < 60 && edge < 0.12 && v > py1) k = Math.min(0.999, k + 0.25);          // lit upper lip
    let tone = RUB[floor(k * RUB.length)];
    if (n > 0.6 && n < 0.625 && d < 30) tone = 0x966c6c;                          // rust
    return (tone | (ty > 0.22 ? 0x1000000 : 0)) >>> 0;
  }
  // held shots: the set's pixels are a pure function of (viewport, camera, env, ledger key, signal blink phase), so a
  // view seen on two consecutive frames is kept and blitted while it stays unchanged (moving shots never pay the copy)
  const FRAMES = HT.lru(6), SEEN = HT.lru(12); // SEEN: recently rendered view keys (no pixels) — a key rendered twice gets stored
  HT.caches.push({ name: 'city.frames', size: () => FRAMES.size });
  // the Worley rubble is static: bake it once into a 512² tile (0.1 m/texel, 51.2 m period, per-piece offset) at boot
  // and sample it per pixel (the per-pixel 3×3 cell search cost ~0.4 µs; a rubble wall filling half the frame was 50 ms)
  const RT = 512, RTS = 10;
  let RUBTEX = null;
  function bakeRubble() { if (RUBTEX) return; const t = new Uint32Array(RT * RT); for (let y = 0; y < RT; y++) for (let x = 0; x < RT; x++) t[y * RT + x] = rubbleTex(x / RTS, y / RTS, 5, 0); RUBTEX = t; }
  (HT.bootTasks = HT.bootTasks || []).push({ name: 'rubble tile', fn: bakeRubble });
  const rubbleAt = (u, v, seed) => { if (!RUBTEX) bakeRubble(); const o = (seed * 97) & 511; return RUBTEX[(((v * RTS) | 0) + o & 511) * RT + ((((u * RTS) | 0) + o * 3) & 511)]; };
  function renderCity(ctx, c, S, opts) {
    const vx = round(c.vx || 0), vy = round(c.vy || 0), vw = round(c.vw || W), vh = round(c.vh || H);
    let ck = null;
    if (!opts.nocache) {
      const e0 = S.env || {}, fxl0 = S.sc && S.sc.C && S.sc.C.fx;
      let skyFx = false;
      if (fxl0) for (const e of fxl0) { const L = e.layer; if ((L === 'sky' || (Array.isArray(L) && L.indexOf('sky') >= 0)) && e.t <= S.t && S.t - e.t < (HT.fxDur ? HT.fxDur(e) : 60)) { skyFx = true; break; } }
      if (!skyFx) {
        const gE = geometry(S.T || 0).glintEnds; let nG = 0; if (gE) for (let k = gE.length - 1; k >= 0 && gE[k] > (S.T || 0); k--) nG++;
        ck = [vx, vy, vw, vh, c.x, c.y, c.z, c.yaw, c.f, c._hx, c._hy, e0.time, e0.snow, e0.fogFar, e0.fogMax, e0.fogNear, HT.ledger ? HT.ledger.key(S.T || 0) : 0, Math.floor((S.T || 0) * 1.4) & 1, opts.props === false ? 0 : 1, nG].join('|');
        const hit = FRAMES.get(ck);
        if (hit) { ctx.putImageData(hit.img, vx, vy); R.view = { ck, vx, vy, vw, vh, hy: (c._hy !== undefined ? c._hy : vy + vh / 2) - vy, f: c.f, camZ: c.z, depth: hit.depth }; return; }
      }
    }
    ensure(vw, vh, ctx);
    const buf = R.buf, mask = R.mask, depth = R.depth;
    const PF = HT.cityProf, pf0 = PF ? performance.now() : 0;
    mask.fill(0); depth.fill(DEPTH_FAR);
    const cTop = R.cTop, cBot = R.cBot; cTop.fill(1); cBot.fill(0); // empty bands (top > bottom)
    const env = S.env || {}, E = envOf(env);
    const T = S.T || 0;
    const G = geometry(T);
    const f = c.f, camX = c.x, camY = c.y, camZ = c.z;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
    const hx = (c._hx !== undefined ? c._hx : vx + vw / 2) - vx, hy = (c._hy !== undefined ? c._hy : vy + vh / 2) - vy;
    const fogC = rgb(E.fog), fogN = env.fogNear || E.fogNear, fogF = env.fogFar || E.fogFar;
    const fogMax = env.fogMax || E.fogMax || 0.92;
    const fogAt = d => fogMax * clamp((d - fogN) / (fogF - fogN), 0, 1);
    const snow = env.snow || 0, snowC = rgb(E.snowCol);
    const sun = E.sun, amb = E.amb;
    const toCam = (x, y) => { const dx = x - camX, dy = y - camY; return [dx * cy - dy * sy, dx * sy + dy * cy]; }; // [right, forward]
    const NEAR = 0.15;
    // ---------------- walls (front to back)
    const faces = [];
    const addFace = (ax, ay, bx, by, zb0, zb1, zt0, zt1, nx, ny, piece, u0, u1, kind) => {
      // back-face cull: normal must point toward the camera
      const mx = (ax + bx) / 2 - camX, my = (ay + by) / 2 - camY;
      if (mx * nx + my * ny >= 0) return;
      const A = toCam(ax, ay), B = toCam(bx, by);
      if (A[1] < NEAR && B[1] < NEAR) return;
      faces.push({ A, B, zb0, zb1, zt0, zt1, piece, u0, u1, nx, ny, kind, d: Math.min(Math.hypot(mx, my), Math.hypot(ax - camX, ay - camY), Math.hypot(bx - camX, by - camY)) });
    };
    const maxD = fogF * 1.05, fovCos = Math.cos(Math.min(1.45, Math.atan(vw / 2 / f) + 0.35));
    for (const p of G.pieces) {
      const cx = (p.x0 + p.x1) / 2, cyy = (p.y0 + p.y1) / 2, rad = Math.hypot(p.x1 - p.x0, p.y1 - p.y0) / 2;
      const dx = cx - camX, dy = cyy - camY, dist = Math.hypot(dx, dy);
      if (dist - rad > maxD) continue;
      if (dist > rad * 1.2) { const fw = (dx * sy + dy * cy) / dist; if (fw < fovCos - rad / dist) continue; }
      const zat = (arr, x, y) => (p.axis === 'x' ? lerp(arr[0], arr[1], (x - p.x0) / Math.max(1e-6, p.x1 - p.x0)) : lerp(arr[0], arr[1], (y - p.y0) / Math.max(1e-6, p.y1 - p.y0)));
      const Z = (x, y) => [zat(p.zb, x, y), zat(p.zt, x, y)];
      // south face (y0, normal −y), north (y1, +y), west (x0, −x), east (x1, +x); u runs left→right seen from outside
      const nFaces0 = faces.length;
      let a = Z(p.x0, p.y0), b = Z(p.x1, p.y0); addFace(p.x0, p.y0, p.x1, p.y0, a[0], b[0], a[1], b[1], 0, -1, p, 0, p.x1 - p.x0, 's');
      a = Z(p.x1, p.y1); b = Z(p.x0, p.y1); addFace(p.x1, p.y1, p.x0, p.y1, a[0], b[0], a[1], b[1], 0, 1, p, 0, p.x1 - p.x0, 'n');
      a = Z(p.x0, p.y1); b = Z(p.x0, p.y0); addFace(p.x0, p.y1, p.x0, p.y0, a[0], b[0], a[1], b[1], -1, 0, p, 0, p.y1 - p.y0, 'w');
      a = Z(p.x1, p.y0); b = Z(p.x1, p.y1); addFace(p.x1, p.y0, p.x1, p.y1, a[0], b[0], a[1], b[1], 1, 0, p, 0, p.y1 - p.y0, 'e');
      // top plane visible when the camera is above it (evaluated at the camera's position: planes may be sloped);
      // the upper piece of a sliced building also shows its cut underside when the camera is below it
      const planeAtCam = arr => { const w0 = p.axis === 'x' ? p.x1 - p.x0 : p.y1 - p.y0, u = ((p.axis === 'x' ? camX - p.x0 : camY - p.y0)) / Math.max(1e-6, w0); return arr[0] + (arr[1] - arr[0]) * u; };
      p._roofVisible = camZ > planeAtCam(p.zt) - 0.05;
      p._botVisible = (!!p.cutBottom || !!p.deck) && camZ < planeAtCam(p.zb) + 0.05;
      p._dist = dist;
      // a piece seen only from above/below (camera under a deck, above a roof inside its footprint) has no visible face:
      // queue its roof/underside at its nearest horizontal distance so it still sorts front to back
      if ((p._roofVisible || p._botVisible) && faces.length === nFaces0) {
        const nx0 = clamp(camX, p.x0, p.x1), ny0 = clamp(camY, p.y0, p.y1);
        faces.push({ roofOnly: true, piece: p, d: Math.hypot(nx0 - camX, ny0 - camY) });
      }
    }
    for (const t of G.trench) addFace(t.ax, t.ay, t.bx, t.by, -t.depth, -t.depth, 0, 0, t.inward[0], t.inward[1], { style: 'trench', seed: 3, trench: true }, 0, Math.hypot(t.bx - t.ax, t.by - t.ay), 't');
    faces.sort((p, q) => p.d - q.d);
    // roofs are interleaved with their piece's walls: collect roof jobs keyed by piece, drawn right after the piece's first face
    const roofDone = new Set();
    for (const F of faces) {
      if (!F.roofOnly) drawFace(F);
      const p = F.piece;
      if (p && !roofDone.has(p) && (p._roofVisible || p._botVisible)) { roofDone.add(p); if (p._roofVisible) drawRoof(p, false); if (p._botVisible) drawRoof(p, true); }
    }
    function drawFace(F) {
      let A = F.A, B = F.B, uA = F.u0, uB = F.u1;
      let tA = 0, tB = 1;
      // clip against the near plane
      if (A[1] < NEAR) { const k = (NEAR - A[1]) / (B[1] - A[1]); A = [A[0] + (B[0] - A[0]) * k, NEAR]; tA = k; }
      else if (B[1] < NEAR) { const k = (NEAR - A[1]) / (B[1] - A[1]); B = [A[0] + (B[0] - A[0]) * k, NEAR]; tB = k; }
      let sxA = hx + f * A[0] / A[1], sxB = hx + f * B[0] / B[1];
      let iA = 1 / A[1], iB = 1 / B[1], pA = tA * iA, pB = tB * iB; // t (face param) / depth, perspective-correct
      if (sxA > sxB) { let q = sxA; sxA = sxB; sxB = q; q = iA; iA = iB; iB = q; q = pA; pA = pB; pB = q; }
      const x0 = Math.max(0, Math.ceil(sxA - 0.5)), x1 = Math.min(vw - 1, floor(sxB - 0.5));
      if (x1 < x0) return;
      const p = F.piece, style = p.trench ? 'trench' : p.style, tiles = TILES[style] || TILES.concrete;
      const b = p.b || {}, seed = p.seed | 0;
      const nx = F.nx, ny = F.ny;
      const lf = clamp(amb + (1 - amb) * Math.max(0, nx * sun[0] + ny * sun[1]) * 1.25 - (nx === 0 ? 0.04 : 0), 0.35, 1.15); // flat face light
      const flH = p.deck ? 1.6 : (b.floorH || 3.5), bay = p.deck ? 8 : (b.bay || 3.8), h = b.h || 20, rub = p.rubble, lit = E.lit, expr = !!(p.deck || p.pier);
      const tint = 0.9 + 0.2 * (b.tint || 0.5);
      const holes = p.holes ? p.holes.filter(e => e.face === F.kind) : null;
      const kindCode = F.kind.charCodeAt(0) << 20, trenchF = !!p.trench, cutT = !!p.cutTop, cutB = !!p.cutBottom;
      const fresh = p.cutAt === undefined || T - p.cutAt < 12, glT = cutT && fresh, glB = cutB && fresh;
      const gk = E.gradeK || 0, gr0 = E.grade ? E.grade[0] : 0, gg0 = E.grade ? E.grade[1] : 0, gb0 = E.grade ? E.grade[2] : 0;
      const span = sxB - sxA || 1;
      if (HT.cityProf) { const PF2 = HT.cityProf; PF2.faces = (PF2.faces || 0) + 1; PF2.cols = (PF2.cols || 0) + (x1 - x0 + 1); }
      for (let x = x0; x <= x1; x++) {
        const s = (x + 0.5 - sxA) / span, inv = iA + (iB - iA) * s, d = 1 / inv, t = (pA + (pB - pA) * s) * d;
        const u = F.u0 + (F.u1 - F.u0) * t;                 // metres along the face
        const zt = F.zt0 + (F.zt1 - F.zt0) * t, zb = F.zb0 + (F.zb1 - F.zb0) * t;
        const yTop = hy - f * (zt - camZ) * inv, yBot = hy - f * (zb - camZ) * inv;
        const y0 = Math.max(0, Math.ceil(yTop - 0.5)), y1 = Math.min(vh - 1, floor(yBot - 0.5));
        if (y1 < y0) continue;
        // occlusion: walls arrive front to back and usually stack into one contiguous covered band per column —
        // spans fully inside it are skipped, partly covered spans jump over it, touching spans extend it
        const bt = cTop[x], bb = cBot[x];
        if (bt <= bb && y0 >= bt && y1 <= bb) continue;
        if (bt > bb) { cTop[x] = y0; cBot[x] = y1; } else if (y0 <= bb + 1 && y1 >= bt - 1) { if (y0 < bt) cTop[x] = y0; if (y1 > bb) cBot[x] = y1; }
        const fg = fogAt(d), fi = 1 - fg, fr = fogC[0] * fg, fgc = fogC[1] * fg, fb = fogC[2] * fg;
        const L = lf * tint;
        const bayI = floor(u / bay), tu = floor(((u / bay) - bayI) * TW) & 31;
        const zPerY = d / f, Lf = L * fi;
        let lastFl = -99999, trow = null, rowBase = 0, lastY = -9;
        const half = d > 150 && !cutT && !cutB && !holes && !rub; // far walls: shade every other row (floors ≥ 2 px tall there)
        for (let y = y0; y <= y1; y++) {
          if (y === bt && bt <= bb) { y = bb; continue; }   // jump over the band covered before this face
          const i = y * vw + x;
          if (mask[i]) continue;
          if (half && (y & 1) && lastY === y - 1) { buf[i] = buf[i - vw]; mask[i] = 1; depth[i] = d; continue; }
          lastY = y;
          const z = camZ + (hy - (y + 0.5)) * zPerY;
          let col, inHole = false;
          if (rub) col = rubbleAt(u < 0 ? u + 512 : u, z < 0 ? z + 512 : z, seed);
          else if (trenchF) { const n = ((floor(u * 1.5) * 73856093) ^ (floor(z * 1.5) * 19349663)) & 1; col = z > -1.5 ? 0x484a77 : n ? 0x323353 : 0x2e222f; }
          else {
            const zf = z / flH, fl = floor(zf), tv = floor((zf - fl) * TH);
            if (fl !== lastFl) {
              lastFl = fl;
              let v;
              if (fl <= 0) v = 3;
              else { const hsh = HT.hash(bayI * 7919 + fl * 104729 + kindCode, seed); v = hsh < lit ? 1 : hsh > 0.97 ? 2 : 0; }
              trow = tiles[v];
            }
            rowBase = (TH - 1 - (tv < 0 ? 0 : tv > TH - 1 ? TH - 1 : tv)) * TW;
            col = trow[rowBase + tu];
            if (z > h - 0.9 && zt >= h - 0.01) col = 0x9babb2; // parapet cap
            else if (snow > 0 && tv === 0 && fl > 0 && !expr) col = 0xc7dcd0; // snow on the ledges
            if (glT && zt - z < 0.5) col = 0x8fd3ff;           // freshly cut edge glints
            if (glB && z - zb < 0.5) col = 0x8fd3ff;
            if (holes) for (const hl of holes) { const du = u - hl.u, dv = z - hl.v; if (du * du + dv * dv < hl.r * hl.r * (0.8 + 0.4 * HT.hash(floor(du * 3) + 77 * floor(dv * 3), 5))) { col = du * du + dv * dv > hl.r * hl.r * 0.6 ? 0x3e3546 : 0x2e222f; inHole = du * du + dv * dv <= hl.r * hl.r * 0.6; break; } }
          }
          let cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
          if (gk) { cr += (gr0 - cr) * gk; cg += (gg0 - cg) * gk; cb += (gb0 - cb) * gk; } // colour grade (cool dawn: toward indigo)
          buf[i] = (0xff000000 | (((cb * Lf + fb) & 255) << 16) | (((cg * Lf + fgc) & 255) << 8) | ((cr * Lf + fr) & 255)) >>> 0;
          mask[i] = 1; depth[i] = inHole ? d + 25 : rub ? d + 8 : d; // holes see-through; rubble is ground you stand on
        }
      }
    }
    function drawRoof(p, under) {
      // roof plane through the top corners (sloped when cut): z = a + bx·x + by·y; under = the piece's cut underside
      const zt = under ? p.zb : p.zt, ax = p.axis === 'x';
      const section = !p.deck && (under || p.cutTop); // a freshly cut cross-section rather than a roof (the deck's underside is plain concrete)
      const wdt = ax ? p.x1 - p.x0 : p.y1 - p.y0;
      const slope = (zt[1] - zt[0]) / Math.max(1e-6, wdt);
      const pz = (x, y) => zt[0] + slope * (ax ? x - p.x0 : y - p.y0);
      const corners = [[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]];
      // camera space polygon, clipped to the near plane
      let poly = corners.map(([x, y]) => { const q = toCam(x, y); const z = pz(x, y); return [q[0], q[1], z]; });
      const clipped = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ina = a[1] >= NEAR, inb = b[1] >= NEAR;
        if (ina) clipped.push(a);
        if (ina !== inb) { const k = (NEAR - a[1]) / (b[1] - a[1]); clipped.push([a[0] + (b[0] - a[0]) * k, NEAR, a[2] + (b[2] - a[2]) * k]); }
      }
      if (clipped.length < 3) return;
      const scr = clipped.map(q => [hx + f * q[0] / q[1], hy - f * (q[2] - camZ) / q[1]]);
      let minY = Infinity, maxY = -Infinity;
      for (const s of scr) { if (s[1] < minY) minY = s[1]; if (s[1] > maxY) maxY = s[1]; }
      const yA = Math.max(0, Math.ceil(minY - 0.5)), yB = Math.min(vh - 1, floor(maxY - 0.5));
      // plane in world: n·P = k with n = (−bx, −by, 1)
      const bxs = ax ? slope : 0, bys = ax ? 0 : slope, k0 = zt[0] - slope * (ax ? p.x0 : p.y0);
      const nX = -bxs, nY = -bys, nZ = 1, kk = k0;
      const b = p.b || {}, seed = p.seed | 0, rub = p.rubble;
      const base = rub ? [98, 85, 101] : section ? [155, 171, 178] : [[155, 171, 178], [127, 112, 138], [171, 148, 122], [98, 85, 101]][floor((b.roof || 0) * 4)];
      const flH = b.floorH || 3.5, bay = b.bay || 3.8;
      const xs = [];
      const secFresh = p.cutAt === undefined || T - p.cutAt < 12, rubTop = !under && p.cutAt !== undefined;
      const px0 = p.x0, px1 = p.x1, py0 = p.y0, py1 = p.y1, dHoles = p.deckHoles || null, isDeck = !!p.deck, deckLongX = px1 - px0 >= py1 - py0, b0 = base[0], b1 = base[1], b2 = base[2];
      const PFR = HT.cityProf; if (PFR) { PFR.roofs = (PFR.roofs || 0) + 1; PFR.roofRows = (PFR.roofRows || 0) + (yB - yA + 1); }
      let nVis = 0, nCov = 0;
      // the roof polygon is convex (a planar quad, near-clipped): each scanline crosses it in one span [min, max]
      const nV = scr.length, SX = new Float64Array(nV), SY = new Float64Array(nV);
      for (let i = 0; i < nV; i++) { SX[i] = scr[i][0]; SY[i] = scr[i][1]; }
      for (let y = yA; y <= yB; y++) {
        const sy2 = y + 0.5; xs.length = 0;
        let xl = Infinity, xr = -Infinity;
        for (let i = 0, j = nV - 1; i < nV; j = i++) {
          const yi = SY[i], yj = SY[j];
          if ((yi <= sy2 && yj > sy2) || (yj <= sy2 && yi > sy2)) { const xc = SX[i] + ((sy2 - yi) / (yj - yi)) * (SX[j] - SX[i]); if (xc < xl) xl = xc; if (xc > xr) xr = xc; }
        }
        if (xl <= xr) { xs.push(xl, xr); }
        // per row: the ray's up component and |ray|² share (right/forward are orthonormal: |ray|² = rr² + 1 + ru²)
        const ru = (hy - sy2) / f, dzw = ru, len0 = 1 + ru * ru, num = kk - (nX * camX + nY * camY + nZ * camZ), invF = 1 / f;
        for (let kx = 0; kx + 1 < xs.length; kx += 2) {
          const xa = Math.max(0, Math.ceil(xs[kx] - 0.5)), xb = Math.min(vw - 1, floor(xs[kx + 1] - 0.5));
          if (PFR && xb >= xa) nVis += xb - xa + 1;
          for (let x = xa; x <= xb; x++) {
            const i = y * vw + x;
            if (mask[i]) { if (PFR) nCov++; continue; }
            // ray (camera space right, forward=1, up) → world
            const rr = (x + 0.5 - hx) * invF;
            const dxw = rr * cy + sy, dyw = -rr * sy + cy;
            const den = nX * dxw + nY * dyw + nZ * dzw;
            if (den < 1e-6 && den > -1e-6) continue;
            const tt = num / den;
            if (tt <= 0) continue;
            const wx = camX + dxw * tt, wy = camY + dyw * tt;
            let r = b0, g = b1, bb = b2;
            // roof props: AC units / tanks on a 3 m grid, parapet ring
            const e1 = wx - px0, e2 = px1 - wx, e3 = wy - py0, e4 = py1 - wy, edge = e1 < e2 ? (e1 < e3 ? (e1 < e4 ? e1 : e4) : (e3 < e4 ? e3 : e4)) : (e2 < e3 ? (e2 < e4 ? e2 : e4) : (e3 < e4 ? e3 : e4));
            if (dHoles) { let inHole = false; for (const hl of dHoles) { const q = (wx - hl.x) ** 2 + (wy - hl.y) ** 2; if (q < hl.r * hl.r * (0.85 + 0.3 * HT.hash(floor(wx * 2) * 57 + floor(wy * 2), 9))) { inHole = true; break; } } if (inHole) continue; }
            if (isDeck) { // the expressway: asphalt with lane dashes and parapets on top; ribbed concrete underneath
              if (under) { const rib = ((wx / 4) - floor(wx / 4)) < 0.12; r = rib ? 98 : 72; g = rib ? 85 : 64; bb = rib ? 101 : 86; }
              else {
                // parapets run along the deck's long sides; span ends only get a thin steel expansion joint
                const eSide = deckLongX ? (e3 < e4 ? e3 : e4) : (e1 < e2 ? e1 : e2), eEnd = deckLongX ? (e1 < e2 ? e1 : e2) : (e3 < e4 ? e3 : e4);
                if (eSide < 0.5) { r = 155; g = 171; bb = 178; }
                else if (eEnd < 0.05) { r = 72; g = 74; bb = 94; }
                else { const n = noiseAt(wx, wy); r = 60 + n * 14; g = 56 + n * 13; bb = 68 + n * 15; if (abs(wy) < 0.12 && ((wx / 10) - floor(wx / 10)) < 0.5) { r = 199; g = 220; bb = 208; } }
                if (snow > 0.2 && eSide >= 0.5 && eEnd >= 0.05) { const nz = noiseAt(wx * 1.1 + 5, wy * 1.1); const k = clamp((snow * 1.05 - nz) * 4, 0, 0.85); r += (199 - r) * k; g += (214 - g) * k; bb += (216 - bb) * k; }
              }
            }
            else if (rubTop) { // a shredded stump's cut top: diced to rubble, the rim still glinting while fresh
              if (edge < 0.45 && secFresh) { r = 143; g = 211; bb = 255; }
              else { const cc = rubbleAt(wx + 1024, wy + 1024, seed); r = (cc >> 16) & 255; g = (cc >> 8) & 255; bb = cc & 255; if (snow > 0.2 && ((cc >> 24) & 1)) { const k = Math.min(0.45, snow); r += (199 - r) * k; g += (214 - g) * k; bb += (216 - bb) * k; } }
            }
            else if (section) { // cross-section: floor slabs + columns (light concrete) over dark interiors, bright glinting rim
              const wz = kk - nX * wx - nY * wy, fz = wz / flH - floor(wz / flH), along = ax ? wy : wx;
              const col = ((along / bay) - floor(along / bay)) < 0.1;
              if (edge < 0.45) { if (secFresh) { r = 143; g = 211; bb = 255; } else { r = 155; g = 171; bb = 178; } }
              else if (fz < 0.14 || col) { r = 155; g = 171; bb = 178; }
              else { const n = HT.hash(floor(wx) * 131 + floor(wy) * 7 + floor(wz / flH) * 977, seed); r = n < 0.2 ? 98 : 46; g = n < 0.2 ? 85 : 34; bb = n < 0.2 ? 101 : 47; }
            }
            else if (!rub && edge < 0.6) { r = 199; g = 220; bb = 208; }
            else if (!rub) {
              const gx = floor(wx / 3), gy = floor(wy / 3), hsh = HT.hash(gx * 92821 + gy, seed);
              if (hsh < 0.12 && (wx - gx * 3) > 0.6 && (wy - gy * 3) > 0.8) { r *= 0.7; g *= 0.7; bb *= 0.75; }
              if (snow > 0.2) { // drifts: finer noise, soft (dithered) edges, the same cool white as the street snow
                // (octaves finer than a pixel are dropped with distance: the fine one beyond 40 m, both beyond 140 m)
                const dq = tt * tt * (rr * rr + len0);
                const nz = dq < 1600 ? noiseAt(wx * 1.3 + 17, wy * 1.3) * 0.7 + noiseAt(wx * 4.1, wy * 4.1 + 9) * 0.3 : dq < 19600 ? noiseAt(wx * 1.3 + 17, wy * 1.3) * 0.7 + 0.15 : 0.5;
                const k = clamp((snow * 0.95 + 0.02 - nz) * 5, 0, 0.9);
                if (k > 0) { r += (199 - r) * k; g += (214 - g) * k; bb += (216 - bb) * k; }
              }
            } else if (rub) { const cc = rubbleAt(wx + 1024, wy + 1024, seed); r = (cc >> 16) & 255; g = (cc >> 8) & 255; bb = cc & 255; if (snow > 0.2 && ((cc >> 24) & 1)) { const k = Math.min(0.45, snow); r += (199 - r) * k; g += (214 - g) * k; bb += (216 - bb) * k; } } // fresh rubble: a dusting, not white slabs
            const d = tt * Math.sqrt(rr * rr + len0), fg = fogAt(d), fi = 1 - fg;
            buf[i] = pk(r * fi + fogC[0] * fg, g * fi + fogC[1] * fg, bb * fi + fogC[2] * fg);
            mask[i] = 1; depth[i] = rub ? tt + 8 : tt; // forward depth (tt: the ray's forward component is 1); rubble 8 m back
          }
        }
      }
      if (PFR) { PFR.roofVis = (PFR.roofVis || 0) + nVis; PFR.roofCov = (PFR.roofCov || 0) + nCov; }
    }
    const pf1 = PF ? performance.now() : 0;
    // ---------------- props (depth-tested against walls), written into the same buffer
    if (opts.props !== false) drawProps(c, S, G, { buf, mask, depth, vw, vh, hx, hy, f, camX, camY, camZ, cy, sy, fogAt, fogC, T, E, env });
    const pf2 = PF ? performance.now() : 0;
    // ---------------- ground + sky (every pixel not covered yet)
    const skyN = 256, SK = skyRows(E, skyN);
    const DEC = G.DEC, DK = G.DK, CI = G.CI, XI = G.XI, CPR = G.canProgs, GR = city.GROUND, GN = city.GN, EXT = city.EXT, LY = city.LANE_Y, LX = city.LANE_X;
    // per-column far-skyline azimuth bins (the same for every sky row)
    if (!R.bins || R.bins.length !== vw) R.bins = new Int32Array(vw);
    const bins = R.bins;
    for (let x = 0; x < vw; x++) { const az = c.yaw + Math.atan2(x + 0.5 - hx, f); bins[x] = ((floor(az / (2 * Math.PI) * SKY_N) % SKY_N) + SKY_N) % SKY_N; }
    const skl = rgb(E.skyline), SKC = pk(skl[0], skl[1], skl[2]), SKW = pk(skl[0] + 40, skl[1] + 36, skl[2] + 20);
    const litW = 0.25 + E.lit * 2;
    const gtR = E.ground ? E.ground[0] : 1, gtG = E.ground ? E.ground[1] : 1, gtB = E.ground ? E.ground[2] : 1; // ground tint per environment
    for (let y = 0; y < vh; y++) {
      const dyr = (y + 0.5 - hy);
      const row = y * vw;
      if (dyr <= 0.5) { // sky
        const el = clamp(-dyr / (vh * 0.9), 0, 1), sc = SK[Math.min(skyN - 1, floor(el * (skyN - 1)))];
        const elev = Math.atan2(-dyr, f), ey = floor(elev * 900), ey4 = floor(elev * 400);
        for (let x = 0; x < vw; x++) {
          const i = row + x;
          if (mask[i]) continue;
          const bi = bins[x];
          if (elev < SKYLINE[bi]) buf[i] = (SKYWIN[bi] && ((ey + bi) & 3) === 0 && HT.hash(bi * 3 + ey4, 1) < litW) ? SKW : SKC;
          else buf[i] = sc;
        }
        continue;
      }
      // ground row: depth constant along the row
      const dd = camZ * f / dyr; // horizontal distance along the view axis
      const fg = fogAt(dd), fi = 1 - fg, fr = fogC[0] * fg, fgc = fogC[1] * fg, fb = fogC[2] * fg;
      const detail = dd < 70 ? 1 : dd < 160 ? 0.5 : 0;
      // world point at x: cam + forward*dd + right*(x - hx)*dd/f
      const bxw = camX + sy * dd, byw = camY + cy * dd, stepR = dd / f;
      const half = dd > 80 && stepR > 0.12; // far rows: shade every other pixel (a lateral step ≥ 0.12 m already hides it)
      for (let x = 0; x < vw; x++) {
        const i = row + x;
        if (mask[i]) continue;
        if (half && (x & 1) && !mask[i - 1]) { buf[i] = buf[i - 1]; continue; }
        const rr = (x + 0.5 - hx) * stepR;
        let wx = bxw + cy * rr, wy = byw - sy * rr;
        let r, g, b;
        const ixg = floor(wx) + EXT, iyg = floor(wy) + EXT;
        const inside = ixg >= 0 && iyg >= 0 && ixg < GN && iyg < GN;
        const gidx = inside ? iyg * GN + ixg : -1;
        let dec = inside ? DEC[gidx] : 0;
        if (dec === 1 && G.DP[gidx] > CPR[CI[gidx]]) dec = 0; // not reached by its sweep yet (each canyon has its own)
        if (dec === 1) { // the canyon: look down into the trench floor instead of the street
          const ci = CI[gidx], cn = G.canyons[ci], dep = cn.depth || 24, d2 = (camZ + dep) * f / dyr, rr2 = (x + 0.5 - hx) * d2 / f;
          const tx = camX + sy * d2 + cy * rr2, ty = camY + cy * d2 - sy * rr2;
          const jx = floor(tx) + EXT, jy = floor(ty) + EXT;
          const jg = jy * GN + jx, k2 = (jx >= 0 && jy >= 0 && jx < GN && jy < GN && DEC[jg] === 1 && CI[jg] === ci && G.DP[jg] <= CPR[ci]) ? DK[jg] : 0;
          if (k2 && cn.floor === 'rubble') { const cc = rubbleAt(tx + 1024, ty + 1024, 17); r = ((cc >> 16) & 255) * 0.8; g = ((cc >> 8) & 255) * 0.8; b = (cc & 255) * 0.8; } // a torn trench: broken concrete
          else if (k2) { const n = noiseAt(tx * 2, ty * 2); r = 44 + n * 26; g = 36 + n * 20; b = 64 + n * 30; if (k2 < 40) { r = 107; g = 62; b = 117; } }
          else { r = 72; g = 74; b = 119; }
          const fg2 = fogAt(d2), fi2 = 1 - fg2;
          buf[i] = pk(r * fi2 + fogC[0] * fg2, g * fi2 + fogC[1] * fg2, b * fi2 + fogC[2] * fg2);
          continue;
        }
        const m = inside ? GR[gidx] : 0;
        const n = detail ? noiseAt(wx, wy) : 0.5;
        if (m === 1) { // road
          r = 58 + n * 16; g = 54 + n * 15; b = 66 + n * 17;
          if (detail) { // centre-line dashes (12 m period)
            const fy = wy - floor(wy), fx = wx - floor(wx), ly = LY[iyg], lx = LX[ixg];
            if (((ly === 1 && fy > 0.85) || (ly === 2 && fy < 0.15)) && (wx * 0.08333333 - floor(wx * 0.08333333)) < 0.5) { r = 199; g = 220; b = 208; }
            else if (((lx === 1 && fx > 0.85) || (lx === 2 && fx < 0.15)) && (wy * 0.08333333 - floor(wy * 0.08333333)) < 0.5) { r = 199; g = 220; b = 208; }
          }
        } else if (m === 3 || m === 8) { // crosswalk stripes (0.45 m bars)
          const q = m === 3 ? wx : wy;
          if (detail && (q * 1.1111111 - floor(q * 1.1111111)) < 0.5) { r = 199; g = 220; b = 208; } else { r = 70 + n * 8; g = 64 + n * 8; b = 78 + n * 8; }
        } else if (m === 2) { // sidewalk paving
          const tile = detail > 0.5 && (((floor(wx * 2) + floor(wy * 2)) & 1) === 0);
          r = (tile ? 150 : 140) + n * 10; g = (tile ? 140 : 130) + n * 10; b = (tile ? 130 : 122) + n * 10;
        } else if (m === 4) { r = 116 + n * 12; g = 106 + n * 12; b = 98 + n * 10; } // plaza
        else if (inside) { r = 88 + n * 10; g = 78 + n * 10; b = 86 + n * 10; }
        else { // beyond the modelled district: the endless far city as a roofscape (blocks, lots, streets), LOD-faded
          const blk = 52, bx = wx / blk, by = wy / (blk * 0.8), ix = floor(bx), iy = floor(by), fx = bx - ix, fy = by - iy;
          const pxb = blk * f / Math.max(1, dd), lod = clamp((pxb - 5) / 10, 0, 1); // block size in px → pattern contrast
          const hb = HT.hash(ix * 73 + iy * 9151, 11);
          let v;
          if (fx < 0.15 || fy < 0.19) v = 50;                                   // streets
          else {
            const lx = floor((fx - 0.15) / 0.85 * (2 + floor(hb * 3))), ly = floor((fy - 0.19) / 0.81 * 2);
            const hl = HT.hash(ix * 7 + lx + (iy * 5 + ly) * 131, 9);
            v = 64 + hl * 64;
            if (snow > 0.2 && hl > 0.3) v = 150 + hl * 40;                      // snow on the flat roofs
            if (hl > 0.965 && E.lit > 0.02) v = 230;                              // a lit roof sign
          }
          v = 80 + (v - 80) * lod;
          r = v * 0.94; g = v * 0.9; b = v * 1.02;
        }
        if (snow > 0 && inside) { // soft drifts (smooth noise), fine sparkle close to the camera
          let k = (snow * 1.1 + 0.18 - (detail ? n : 0.5) * 0.45) * (m === 1 ? 0.85 : 1);
          k = k < 0 ? 0 : k > 0.85 ? 0.85 : k;
          r += (snowC[0] - r) * k; g += (snowC[1] - g) * k; b += (snowC[2] - b) * k;
        }
        if (dec) { // per-pixel from the exact decal (the grid only says which decal the pixel may belong to)
          if (dec === 2 || dec === 3) {
            const cr = G.craters[XI[gidx]], q = cr ? ((wx - cr.x) * (wx - cr.x) + (wy - cr.y) * (wy - cr.y)) / (cr.r * cr.r) : 9;
            if (q < 1) { const qq = 0.25 + 0.5 * q; r = 46 + (r - 46) * qq * 0.6; g = 34 + (g - 34) * qq * 0.6; b = 47 + (b - 47) * qq * 0.6; }
            else if (q < 1.6 && noiseAt(wx * 2.6 + 11, wy * 2.6 + 7) < (1.6 - q) * 1.25) { const cc = rubbleAt(wx + 1024, wy + 1024, 23); r = (cc >> 16) & 255; g = (cc >> 8) & 255; b = cc & 255; } // rim debris, fine scatter
          } else if (dec === 4) {
            const sc = G.scorch[XI[gidx]], q = sc ? ((wx - sc.x) * (wx - sc.x) + (wy - sc.y) * (wy - sc.y)) / (sc.r * sc.r) : 9;
            if (q < 1) { const qq = 0.4 + 0.6 * q; r *= qq; g *= qq; b *= qq; }
          } else if (dec === 5) {
            const er = G.erasures[XI[gidx]], q = er ? ((wx - er.x) * (wx - er.x) + (wy - er.y) * (wy - er.y)) / (er.r * er.r) : 9;
            if (q < 1) { const qq = 0.4 + 0.5 * (1 - q); r = lerp(r, 69, qq); g = lerp(g, 41, qq); b = lerp(b, 63, qq); }
          }
        }
        buf[i] = pk(r * gtR * fi + fr, g * gtG * fi + fgc, b * gtB * fi + fb);
      }
    }
    const pf3 = PF ? performance.now() : 0;
    // ---------------- 'sky' FX layer: effects out in the city (a distant Purple, the 200% line, a sky detonation) are
    // drawn one by one into a scratch canvas and composited with a depth test: only walls/roofs/props NEARER than the
    // effect's nearest key point (at/from/to/center, minus its radius) occlude it; ground and sky never do
    const fxl = S.sc && S.sc.C && S.sc.C.fx;
    if (fxl && HT.fxDraw) {
      for (const e of fxl) {
        const L = e.layer;
        if (!((L === 'sky' || (Array.isArray(L) && L.indexOf('sky') >= 0)) && e.t <= S.t && S.t - e.t < (HT.fxDur ? HT.fxDur(e) : 60))) continue;
        let dE = Infinity;
        for (const k of ['at', 'from', 'to', 'center']) { const q = e[k]; if (Array.isArray(q)) { const dq = (q[0] - camX) * sy + (q[1] - camY) * cy; if (dq < dE) dE = dq; } }
        dE = isFinite(dE) ? Math.max(0.5, dE - (e.r || 0)) : 0.5;
        const cw = ctx.canvas.width, ch = ctx.canvas.height;
        if (!R.skyC || R.skyC.width !== cw || R.skyC.height !== ch) { R.skyC = document.createElement('canvas'); R.skyC.width = cw; R.skyC.height = ch; R.skyG = R.skyC.getContext('2d', { willReadFrequently: true }); }
        const g2 = R.skyG; g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, cw, ch);
        HT.fxDraw(g2, S, [e], 'sky');
        const fd = g2.getImageData(vx, vy, vw, vh).data;
        for (let i = 0, j = 0; i < vw * vh; i++, j += 4) {
          const al = fd[j + 3]; if (!al || depth[i] < dE) continue;
          const k = al / 255, q = buf[i];
          buf[i] = pk((q & 255) * (1 - k) + fd[j] * k, ((q >> 8) & 255) * (1 - k) + fd[j + 1] * k, ((q >> 16) & 255) * (1 - k) + fd[j + 2] * k);
        }
      }
    }
    ctx.putImageData(R.img, vx, vy);
    R.view = { ck, vx, vy, vw, vh, hy, f, camZ, depth };
    if (PF) { const pf4 = performance.now(); PF.walls = (PF.walls || 0) + pf1 - pf0; PF.props = (PF.props || 0) + pf2 - pf1; PF.ground = (PF.ground || 0) + pf3 - pf2; PF.put = (PF.put || 0) + pf4 - pf3; PF.n = (PF.n || 0) + 1; }
    if (ck) { if (S.twos || SEEN.get(ck)) FRAMES.set(ck, { img: new ImageData(new Uint8ClampedArray(R.img.data), vw, vh), depth: new Float32Array(depth) }); else SEEN.set(ck, 1); } // S.twos: views drawn on 2s repeat next frame
  }

  // ------------------------------------------------------------------ ground-layer FX occlusion
  // FX drawn in the 'ground' layer (the Shrine's pool, Simple Domain's ring, shockwave rings, scorch/shadow decals) are
  // flat decals on a plane z. They are composited after the city, so walls, roofs and props standing in front of the
  // decal must hide it: HT.cityOccluder(z) returns a mask of the last city view (alpha 255 where the depth buffer holds
  // something nearer than plane z on that row, or on rows where the plane is not visible at all), cached per view key.
  // The runner erases the ground-FX layer through it (destination-out) before drawing that layer over the set.
  HT.cityView = () => R.view; // the last city view: {ck, vx, vy, vw, vh, hy, f, camZ, depth} (debugging, occlusion)
  // mask canvases are recycled: a per-size pool fed by the caches' evictions (moving cameras build new masks every frame)
  const MPOOL = new Map(), IDS = new Map();
  const takeMask = (w, h) => { const L = MPOOL.get(w * 4096 + h); return L && L.length ? L.pop() : HT.canvas(w, h); };
  const giveMask = m => { if (!m || !m.cv) return; const k = m.cv.c.width * 4096 + m.cv.c.height; let L = MPOOL.get(k); if (!L) MPOOL.set(k, L = []); if (L.length < 6) L.push(m.cv); };
  const idOf = (g, w, h) => { const k = w * 4096 + h; let id = IDS.get(k); if (!id) { if (IDS.size > 24) IDS.clear(); id = g.createImageData(w, h); IDS.set(k, id); } return id; };
  const OCC = HT.lru(8, giveMask);
  HT.caches.push({ name: 'city.occluder', size: () => OCC.size });
  HT.cityOccluder = (z = 0, box = null) => {
    const V = R.view; if (!V || !V.depth) return null;
    const { vw, vh, hy, f, camZ, depth } = V, num = (camZ - z) * f;
    // the region: the box (snapped to 8 px, clamped to the view) ∩ the rows that can show the plane (below the horizon)
    const yH = z < camZ ? Math.max(0, Math.min(vh - 1, Math.floor(hy))) : 0;
    let x0 = 0, y0 = yH, x1 = vw - 1, y1 = vh - 1;
    if (box) { x0 = Math.max(0, Math.floor((box[0] - V.vx) / 8) * 8); y0 = Math.max(yH, Math.floor((box[1] - V.vy) / 8) * 8); x1 = Math.min(vw - 1, Math.ceil((box[2] - V.vx) / 8) * 8 + 7); y1 = Math.min(vh - 1, Math.ceil((box[3] - V.vy) / 8) * 8 + 7); }
    const B = [V.vx + x0, V.vy + y0, V.vx + x1, V.vy + y1];
    if (x1 < x0 || y1 < y0) return { c: null, box: B, empty: true, off: true };
    const key = V.ck ? V.ck + '|' + z.toFixed(2) + '|' + x0 + ',' + y0 + ',' + x1 + ',' + y1 : null;
    let m = key ? OCC.get(key) : null;
    if (m) return m;
    const lims = new Float64Array(y1 - y0 + 1);
    let any = false;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - hy, dP = dy !== 0 && num / dy > 0 ? num / dy : Infinity;   // the plane's forward depth on this row
      const lim = dP === Infinity ? Infinity : dP - Math.max(0.3, dP * 0.02);          // slack: decals touching a wall's foot
      lims[y - y0] = lim;
      if (!any) { const row = y * vw; for (let x = x0; x <= x1; x++) if (depth[row + x] < lim) { any = true; break; } }
    }
    if (!any) { m = { c: null, box: B, empty: true }; if (key) OCC.set(key, m); return m; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = key ? takeMask(w, h) : (OCC.scratch && OCC.scratch.c.width === w && OCC.scratch.c.height === h ? OCC.scratch : (OCC.scratch = HT.canvas(w, h)));
    const id = idOf(cv.g, w, h), u = new Uint32Array(id.data.buffer);
    for (let y = 0; y < h; y++) { const lim = lims[y], row = (y + y0) * vw + x0, o = y * w; for (let x = 0; x < w; x++) u[o + x] = depth[row + x] < lim ? 0xff000000 : 0; }
    cv.g.putImageData(id, 0, 0);
    m = { c: cv.c, cv: key ? cv : null, vx: V.vx + x0, vy: V.vy + y0, box: B };
    if (key) OCC.set(key, m);
    return m;
  };

  // world-scale FX: a mask of the last city view inside `box` (view-relative screen px; null = whole view) where the
  // depth buffer holds something nearer than forward depth d (cached per view key, d to 0.5 m, box to 8 px)
  const OCC2 = HT.lru(12, giveMask);
  HT.caches.push({ name: 'city.occluderAt', size: () => OCC2.size });
  HT.cityOccluderAt = (d, box) => {
    const V = R.view; if (!V || !V.depth) return null;
    const { vw, vh, depth } = V;
    let x0 = 0, y0 = 0, x1 = vw - 1, y1 = vh - 1;
    if (box) { x0 = Math.max(0, (Math.floor((box[0] - V.vx) / 8) * 8)); y0 = Math.max(0, (Math.floor((box[1] - V.vy) / 8) * 8)); x1 = Math.min(vw - 1, Math.ceil((box[2] - V.vx) / 8) * 8 + 7); y1 = Math.min(vh - 1, Math.ceil((box[3] - V.vy) / 8) * 8 + 7); }
    if (x1 < x0 || y1 < y0) return { c: null, vx: V.vx, vy: V.vy, box: [x0, y0, x1, y1], empty: true };
    const dq = Math.round(d * 2) / 2, key = V.ck ? V.ck + '|' + dq + '|' + x0 + ',' + y0 + ',' + x1 + ',' + y1 : null;
    let m = key ? OCC2.get(key) : null;
    if (m) return m;
    // nothing nearer inside the box → an empty mask (the runner draws the effect directly, no compositing)
    let any = false;
    for (let y = y0; y <= y1 && !any; y++) { const row = y * vw; for (let x = x0; x <= x1; x++) if (depth[row + x] < dq) { any = true; break; } }
    if (!any) { m = { c: null, vx: V.vx + x0, vy: V.vy + y0, box: [V.vx + x0, V.vy + y0, V.vx + x1, V.vy + y1], empty: true }; if (key) OCC2.set(key, m); return m; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = takeMask(w, h), id = idOf(cv.g, w, h), u = new Uint32Array(id.data.buffer);
    for (let y = 0; y < h; y++) { const row = (y + y0) * vw + x0, o = y * w; for (let x = 0; x < w; x++) u[o + x] = depth[row + x] < dq ? 0xff000000 : 0; }
    cv.g.putImageData(id, 0, 0);
    m = { c: cv.c, cv: key ? cv : null, vx: V.vx + x0, vy: V.vy + y0, box: [V.vx + x0, V.vy + y0, V.vx + x1, V.vy + y1] };
    if (!key) giveMask({ cv }); // uncached: back to the pool right away (the caller uses it before the next build)
    if (key) OCC2.set(key, m);
    return m;
  };

  // ------------------------------------------------------------------ props into the software buffer
  function drawProps(c, S, G, P) {
    const { buf, mask, depth, vw, vh, hx, hy, f, camX, camY, camZ, cy, sy, fogAt, fogC, T } = P;
    const toView = (x, y, z) => { const dx = x - camX, dy = y - camY; const r = dx * cy - dy * sy, d = dx * sy + dy * cy; return d > 0.2 ? [hx + f * r / d, hy - f * (z - camZ) / d, d] : null; };
    const span = (x, y0, y1, d, col) => { // vertical span with depth test
      x = round(x); if (x < 0 || x >= vw) return;
      const a = Math.max(0, round(Math.min(y0, y1))), b = Math.min(vh - 1, round(Math.max(y0, y1)));
      const fg = fogAt(d), r = ((col >> 16) & 255) * (1 - fg) + fogC[0] * fg, g = ((col >> 8) & 255) * (1 - fg) + fogC[1] * fg, bl = (col & 255) * (1 - fg) + fogC[2] * fg, pc = pk(r, g, bl);
      for (let y = a; y <= b; y++) { const i = y * vw + x; if (d < depth[i]) { depth[i] = d; buf[i] = pc; mask[i] = 1; } }
    };
    const rectW = (cxp, cyp, w, h, d, col) => { for (let k = 0; k < w; k++) span(cxp - w / 2 + k, cyp - h / 2, cyp + h / 2, d, col); };
    const lineW = (a, b, col) => { // world-space line between projected points (for arms/branches)
      if (!a || !b) return;
      const n = Math.max(abs(b[0] - a[0]), abs(b[1] - a[1]), 1);
      for (let k = 0; k <= n; k++) { const u = k / n; span(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, col); }
    };
    // mini 3D rasterizer for small solid props (cars, lamp heads): flat-shaded convex faces, back-face culled,
    // perspective-correct depth (1/d interpolated in screen space), graded + fogged like the walls
    const E = P.E, sun = E.sun, amb = E.amb, gk = E.gradeK || 0, gr = E.grade || [0, 0, 0];
    const cam3 = (x, y, z) => { const dx = x - camX, dy = y - camY; return [dx * cy - dy * sy, dx * sy + dy * cy, z - camZ]; };
    const tri = (A, B, Cc, pc) => {
      if (A[1] < 0.3 || B[1] < 0.3 || Cc[1] < 0.3) return;
      const ax = hx + f * A[0] / A[1], ay = hy - f * A[2] / A[1], bx = hx + f * B[0] / B[1], by = hy - f * B[2] / B[1];
      const qx = hx + f * Cc[0] / Cc[1], qy = hy - f * Cc[2] / Cc[1];
      const area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax); if (abs(area) < 1e-4) return;
      const aw = 1 / A[1], bw = 1 / B[1], cw = 1 / Cc[1], ia = 1 / area;
      const x0 = Math.max(0, floor(Math.min(ax, bx, qx))), x1 = Math.min(vw - 1, Math.ceil(Math.max(ax, bx, qx)));
      const y0 = Math.max(0, floor(Math.min(ay, by, qy))), y1 = Math.min(vh - 1, Math.ceil(Math.max(ay, by, qy)));
      for (let y = y0; y <= y1; y++) {
        const py = y + 0.5;
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5;
          const w0 = ((bx - px) * (qy - py) - (by - py) * (qx - px)) * ia, w1 = ((qx - px) * (ay - py) - (qy - py) * (ax - px)) * ia, w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const d = 1 / (w0 * aw + w1 * bw + w2 * cw), i = y * vw + x;
          if (d < depth[i]) { depth[i] = d; buf[i] = pc; mask[i] = 1; }
        }
      }
    };
    // face = world-space polygon (convex, any winding) + outward normal; col 0xRRGGBB; lit=false for emissive colours
    const face = (pts, n, col, lit = true, bias = 0) => {
      let mx = 0, my = 0, mz = 0; for (const q of pts) { mx += q[0]; my += q[1]; mz += q[2]; }
      mx /= pts.length; my /= pts.length; mz /= pts.length;
      if ((camX - mx) * n[0] + (camY - my) * n[1] + (camZ - mz) * n[2] <= 0) return;
      let r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
      if (lit) {
        const lf = clamp(amb + (1 - amb) * Math.max(0, n[0] * sun[0] + n[1] * sun[1] + n[2] * Math.max(0.35, sun[2] || 0)) * 1.2, 0.3, 1.15);
        if (gk) { r += (gr[0] - r) * gk; g += (gr[1] - g) * gk; b += (gr[2] - b) * gk; }
        r *= lf; g *= lf; b *= lf;
      }
      const dd = (mx - camX) * sy + (my - camY) * cy, fg = fogAt(dd);
      const pc = pk(Math.min(255, r * (1 - fg) + fogC[0] * fg), Math.min(255, g * (1 - fg) + fogC[1] * fg), Math.min(255, b * (1 - fg) + fogC[2] * fg));
      const V = pts.map(q => { const v = cam3(q[0], q[1], q[2]); v[1] -= bias; return v; });
      for (let k = 1; k < V.length - 1; k++) tri(V[0], V[k], V[k + 1], pc);
    };
    const maxD = 220;
    const blinkOn = (Math.floor((S.T || 0) * 1.4) & 1) === 0;
    const PG = G.propGone;
    for (let pi = 0; pi < city.props.length; pi++) {
      const p = city.props[pi];
      if (PG && PG[pi]) continue; // destroyed with the ground it stood on
      const dx = p.x - camX, dy = p.y - camY;
      if (abs(dx) > maxD || abs(dy) > maxD) continue;
      const d = dx * sy + dy * cy; if (d < 0.5 || d > maxD) continue;
      const base = toView(p.x, p.y, 0), top = toView(p.x, p.y, p.h || 5);
      if (!base) continue;
      if (base[0] < -60 || base[0] > vw + 60) { // the pole is off-screen — its arm (signal head / luminaire) may still reach in
        const reach = p.type === 'signal' ? toView(p.x + p.facing[0] * p.arm, p.y + p.facing[1] * p.arm, p.h) : p.type === 'lamp' ? toView(p.x + 1.6, p.y, p.h) : null;
        if (!reach || reach[0] < -80 || reach[0] > vw + 80) continue;
      }
      const s = f / d; // px per metre
      if (p.type === 'lamp' || p.type === 'signal' || p.type === 'pedsig') {
        const pw = Math.max(1, round(0.16 * s));
        if (pw < 6) rectW(base[0], (base[1] + top[1]) / 2, pw, base[1] - top[1], d, 0x484a77);
        else { // close: a shaded cylinder (lit edge toward the sun side, core shadow on the far side)
          const cyP = (base[1] + top[1]) / 2, hP = base[1] - top[1], w1 = Math.max(1, round(pw * 0.22)), w3 = Math.max(1, round(pw * 0.3));
          rectW(base[0] - pw / 2 + w1 / 2, cyP, w1, hP, d, 0x7f708a);
          rectW(base[0] - pw / 2 + w1 + (pw - w1 - w3) / 2, cyP, pw - w1 - w3, hP, d, 0x484a77);
          rectW(base[0] + pw / 2 - w3 / 2, cyP, w3, hP, d, 0x323353);
        }
        if (p.type === 'lamp') {
          const arm = toView(p.x + 1.2, p.y, p.h);
          if (s < 14) lineW(top, arm, 0x484a77);
          else { // the arm as a thin box
            const A8 = [[p.x, p.y - 0.035, p.h - 0.05], [p.x + 0.9, p.y - 0.035, p.h - 0.03], [p.x + 0.9, p.y + 0.035, p.h - 0.03], [p.x, p.y + 0.035, p.h - 0.05],
              [p.x, p.y - 0.035, p.h + 0.02], [p.x + 0.9, p.y - 0.035, p.h + 0.03], [p.x + 0.9, p.y + 0.035, p.h + 0.03], [p.x, p.y + 0.035, p.h + 0.02]];
            face([A8[4], A8[5], A8[6], A8[7]], [0, 0, 1], 0x7f708a); face([A8[0], A8[1], A8[2], A8[3]], [0, 0, -1], 0x323353);
            face([A8[0], A8[1], A8[5], A8[4]], [0, -1, 0], 0x484a77); face([A8[3], A8[2], A8[6], A8[7]], [0, 1, 0], 0x484a77);
          }
          if (s < 14) { if (arm) rectW(arm[0], arm[1] + 1, Math.max(2, round(0.5 * s)), Math.max(1, round(0.2 * s)), d, 0x9babb2); }
          else { // close: a real cobra-head luminaire (tapered housing, lit lens underneath, snow on top)
            const hx0 = p.x + 0.85, hx1 = p.x + 1.55, zc = p.h;
            const Lh = (u, v, z) => [hx0 + (hx1 - hx0) * u, p.y + v, z];
            const Q = [Lh(0, -0.1, zc - 0.03), Lh(1, -0.16, zc - 0.06), Lh(1, 0.16, zc - 0.06), Lh(0, 0.1, zc - 0.03), Lh(0, -0.08, zc + 0.07), Lh(1, -0.13, zc + 0.1), Lh(1, 0.13, zc + 0.1), Lh(0, 0.08, zc + 0.07)];
            face([Q[4], Q[5], Q[6], Q[7]], [0, 0, 1], 0x7f708a);
            face([Q[0], Q[1], Q[5], Q[4]], [0, -1, 0], 0x625565);
            face([Q[3], Q[2], Q[6], Q[7]], [0, 1, 0], 0x625565);
            face([Q[1], Q[2], Q[6], Q[5]], [1, 0, 0], 0x625565);
            face([Q[0], Q[3], Q[7], Q[4]], [-1, 0, 0], 0x625565);
            face([Q[0], Q[1], Q[2], Q[3]], [0, 0, -1], 0xfbff86, false);
            if (snowCap(S)) face([Lh(0.1, -0.06, zc + 0.085), Lh(0.92, -0.11, zc + 0.115), Lh(0.92, 0.11, zc + 0.115), Lh(0.1, 0.06, zc + 0.085)], [0, 0, 1], 0xe2ecfa, true, 0.01);
          }
        }
        else if (p.type === 'signal') {
          const st = G.signals[p.id] || 'blink';
          if (st === 'gone') continue;
          const ax = toView(p.x + p.facing[0] * p.arm, p.y + p.facing[1] * p.arm, p.h);
          lineW(top, ax, 0x484a77);
          if (ax && s < 18) {
            const bw = Math.max(3, round(1.1 * s)), bh = Math.max(2, round(0.36 * s));
            rectW(ax[0], ax[1] + bh / 2, bw, bh, d - 0.05, 0x2e222f);
            const on = st === 'blink' ? (blinkOn ? 0xf9c22b : 0x4c3e24) : st === 'green' ? 0x1ebc73 : st === 'red' ? 0xe83b3b : 0x3e3546;
            const lx = st === 'green' ? -bw / 3 : st === 'red' ? bw / 3 : 0;
            rectW(ax[0] + lx, ax[1] + bh / 2, Math.max(1, round(bh * 0.7)), Math.max(1, round(bh * 0.7)), d - 0.1, on);
          } else if (ax) { // close: a real horizontal Japanese vehicle signal — housing, three lamps (green · yellow · red), visors, snow
            const fx = p.facing[0], fy = p.facing[1], nx0 = fx !== 0 ? 0 : Math.sign(p.x) || 1, ny0 = fx !== 0 ? Math.sign(p.y) || 1 : 0;
            const hx0 = p.x + fx * p.arm, hy0 = p.y + fy * p.arm, hz = p.h - 0.05;
            const Lq = (u, v, z) => [hx0 + fx * u + nx0 * v, hy0 + fy * u + ny0 * v, hz + z]; // u along the arm, v toward the normal
            const W2 = 0.56, D2 = 0.13, H2 = 0.2;
            face([Lq(-W2, D2, -H2), Lq(W2, D2, -H2), Lq(W2, D2, H2), Lq(-W2, D2, H2)], [nx0, ny0, 0], 0x2e222f);
            face([Lq(-W2, -D2, -H2), Lq(W2, -D2, -H2), Lq(W2, -D2, H2), Lq(-W2, -D2, H2)], [-nx0, -ny0, 0], 0x3e3546);
            face([Lq(-W2, -D2, H2), Lq(W2, -D2, H2), Lq(W2, D2, H2), Lq(-W2, D2, H2)], [0, 0, 1], snowCap(S) ? 0xe2ecfa : 0x484a77);
            face([Lq(-W2, -D2, -H2), Lq(W2, -D2, -H2), Lq(W2, D2, -H2), Lq(-W2, D2, -H2)], [0, 0, -1], 0x2e222f);
            face([Lq(W2, -D2, -H2), Lq(W2, D2, -H2), Lq(W2, D2, H2), Lq(W2, -D2, H2)], [fx, fy, 0], 0x3e3546);
            face([Lq(-W2, -D2, -H2), Lq(-W2, D2, -H2), Lq(-W2, D2, H2), Lq(-W2, -D2, H2)], [-fx, -fy, 0], 0x3e3546);
            // lamps: seen from the front, green is on the left — u runs toward the arm tip, so pick the side from the normal
            const side = (fx * ny0 - fy * nx0) > 0 ? -1 : 1;
            const cols = [st === 'green' ? 0x1ebc73 : 0x0f3a2e, st === 'blink' ? (blinkOn ? 0xf9c22b : 0x4c3e24) : st === 'yellow' ? 0xf9c22b : 0x4c3e24, st === 'red' ? 0xe83b3b : 0x45293f];
            for (let k = 0; k < 3; k++) {
              const uc = side * (k - 1) * 0.36, disc = [];
              for (let q = 0; q < 8; q++) { const a = (q + 0.5) * Math.PI / 4; disc.push(Lq(uc + Math.cos(a) * 0.13, D2 + 0.004, Math.sin(a) * 0.13)); }
              face(disc, [nx0, ny0, 0], cols[k], k === 1 ? st !== 'blink' || !blinkOn : true, 0.01);
              face([Lq(uc - 0.15, D2, 0.15), Lq(uc + 0.15, D2, 0.15), Lq(uc + 0.15, D2 + 0.14, 0.13), Lq(uc - 0.15, D2 + 0.14, 0.13)], [0, 0, 1], 0x2e222f, true, 0.02); // visor
            }
          }
        } else { // pedestrian signal box
          const bw = Math.max(2, round(0.4 * s)), bh = Math.max(3, round(0.8 * s));
          rectW(top[0], top[1] + bh / 2, bw, bh, d - 0.05, 0x2e222f);
          const st = G.signals[p.id] || 'blink';
          rectW(top[0], top[1] + bh * 0.3, Math.max(1, bw - 2), Math.max(1, round(bh * 0.3)), d - 0.1, st === 'green' ? 0x1ebc73 : (blinkOn ? 0xae2334 : 0x45293f));
        }
      } else if (p.type === 'tree') { // bare December tree
        rectW(base[0], (base[1] + top[1]) / 2 + (base[1] - top[1]) * 0.25, Math.max(1, round(0.25 * s)), (base[1] - top[1]) * 0.5, d, 0x4c3e24);
        const rng = HT.rng(p.seed);
        for (let k = 0; k < 7; k++) {
          const a = rng() * Math.PI * 2, l = 1.2 + rng() * 1.8, z0 = p.h * (0.45 + rng() * 0.2);
          lineW(toView(p.x, p.y, z0), toView(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l, z0 + 1 + rng() * 2), 0x625565);
        }
      } else if (p.type === 'car') {
        // a compact sedan: tapered lower body + glasshouse, wheels, lamps; snow on roof, hood and trunk
        const ux = p.dir[0], uy = p.dir[1], vx = -uy, vy = ux, col = parseInt(p.col.slice(1), 16);
        const Lc = (u, v, z) => [p.x + ux * u + vx * v, p.y + uy * u + vy * v, z];
        const nU = [ux, uy, 0], nV = [vx, vy, 0];
        const sn = snowCap(S), glass = 0x323353, trim = 0x2e222f;
        // lower body (8 corners): bottom z .3, hood top .84 at the nose, trunk top .92
        const B = [Lc(-2.15, -0.86, 0.3), Lc(2.15, -0.86, 0.3), Lc(2.15, 0.86, 0.3), Lc(-2.15, 0.86, 0.3),
          Lc(-2.12, -0.84, 0.92), Lc(2.08, -0.84, 0.84), Lc(2.08, 0.84, 0.84), Lc(-2.12, 0.84, 0.92)];
        const nTop = [0, 0, 1];
        face([B[4], B[5], B[6], B[7]], nTop, col);
        face([B[1], B[2], B[6], B[5]], nU, col);                                 // nose
        face([B[0], B[3], B[7], B[4]], [-ux, -uy, 0], col);                      // tail
        face([B[0], B[1], B[5], B[4]], [-vx, -vy, 0], col);                      // right side
        face([B[3], B[2], B[6], B[7]], nV, col);                                 // left side
        // bumpers / sill: dark strips (slightly proud of the body)
        face([Lc(2.16, -0.86, 0.3), Lc(2.16, 0.86, 0.3), Lc(2.16, 0.86, 0.46), Lc(2.16, -0.86, 0.46)], nU, trim, true, 0.01);
        face([Lc(-2.16, -0.86, 0.3), Lc(-2.16, 0.86, 0.3), Lc(-2.16, 0.86, 0.46), Lc(-2.16, -0.86, 0.46)], [-ux, -uy, 0], trim, true, 0.01);
        // lamps
        for (const sv of [-1, 1]) {
          face([Lc(2.165, sv * 0.52, 0.6), Lc(2.165, sv * 0.78, 0.6), Lc(2.165, sv * 0.78, 0.72), Lc(2.165, sv * 0.52, 0.72)], nU, 0xfbff86, false, 0.02);
          face([Lc(-2.165, sv * 0.56, 0.66), Lc(-2.165, sv * 0.8, 0.66), Lc(-2.165, sv * 0.8, 0.8), Lc(-2.165, sv * 0.56, 0.8)], [-ux, -uy, 0], 0xe83b3b, false, 0.02);
        }
        // glasshouse: bottom u -1.3..1.0 at z .88, roof u -0.95..0.35 at z 1.42
        const G8 = [Lc(-1.3, -0.8, 0.88), Lc(1.0, -0.8, 0.86), Lc(1.0, 0.8, 0.86), Lc(-1.3, 0.8, 0.88),
          Lc(-0.95, -0.68, 1.42), Lc(0.35, -0.68, 1.42), Lc(0.35, 0.68, 1.42), Lc(-0.95, 0.68, 1.42)];
        face([G8[4], G8[5], G8[6], G8[7]], nTop, col);                                         // roof
        const ws = [0.54 * ux, 0.54 * uy, 0.84], wl = Math.hypot(ws[0], ws[1], ws[2]);
        face([G8[1], G8[2], G8[6], G8[5]], [ws[0] / wl, ws[1] / wl, ws[2] / wl], glass);        // windshield
        face([G8[0], G8[3], G8[7], G8[4]], [-0.35 * ux / 0.9, -0.35 * uy / 0.9, 0.83], glass);   // rear window
        face([G8[0], G8[1], G8[5], G8[4]], [-vx * 0.97, -vy * 0.97, 0.22], glass);              // side windows
        face([G8[3], G8[2], G8[6], G8[7]], [vx * 0.97, vy * 0.97, 0.22], glass);
        // B-pillars (body colour strips over the side glass)
        for (const sv of [-1, 1]) {
          const nn = [sv * vx * 0.97, sv * vy * 0.97, 0.22];
          face([Lc(-0.3, sv * 0.805, 0.87), Lc(-0.14, sv * 0.805, 0.87), Lc(-0.18, sv * 0.685, 1.41), Lc(-0.34, sv * 0.685, 1.41)], nn, col, true, 0.01);
        }
        // wheels: octagons on each side, just proud of the body
        for (const su of [-1.38, 1.38]) for (const sv of [-1, 1]) {
          const oct = []; for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; oct.push(Lc(su + Math.cos(a) * 0.34, sv * 0.875, 0.34 + Math.sin(a) * 0.34)); }
          face(oct, [sv * vx, sv * vy, 0], 0x2e222f, true, 0.01);
          const hub = []; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; hub.push(Lc(su + Math.cos(a) * 0.14, sv * 0.88, 0.34 + Math.sin(a) * 0.14)); }
          face(hub, [sv * vx, sv * vy, 0], 0x9babb2, true, 0.015);
        }
        if (sn) { // snow caps (slightly irregular, inset from the edges)
          const sc = 0xe2ecfa;
          face([Lc(-0.9, -0.6, 1.45), Lc(0.3, -0.62, 1.45), Lc(0.3, 0.6, 1.45), Lc(-0.88, 0.63, 1.45)], nTop, sc, true, 0.01);
          face([Lc(1.15, -0.72, 0.885), Lc(1.95, -0.66, 0.855), Lc(1.9, 0.7, 0.855), Lc(1.1, 0.74, 0.885)], nTop, sc, true, 0.01);
          face([Lc(-2.0, -0.7, 0.945), Lc(-1.45, -0.74, 0.935), Lc(-1.45, 0.7, 0.935), Lc(-1.98, 0.66, 0.945)], nTop, sc, true, 0.01);
        }
      }
    }
  }
  const snowCap = S => (S.env && S.env.snow || 0) > 0.2;

  HT.SETS.city = {
    shear: true,
    init(sc, o) { return { o: o || {} }; },
    draw(ctx, c, S, pass, res) {
      if (c.pitch < -1.0 || c._overhead) { renderOverhead(ctx, c, S); return; } // steep top-down views use the map renderer
      renderCity(ctx, c, S, (res && res.o) || {});
    },
  };
  HT.renderCity = renderCity;

  // ------------------------------------------------------------------ Voxel Space set (flyover / chase)
  // heightfield 1 m cells over the district (840²), built lazily per ledger version (cached per version)
  const VN = city.GN, vxCache = HT.lru(3), vxJobs = new Map();
  // incremental builder (a generator): scene init steps it in idle slices so the first voxel frame never stalls
  function* voxelBuild(T) {
    const G = geometry(T), key = G.version;
    if (vxCache.get(key)) return vxCache.get(key);
    const Hf = new Float32Array(VN * VN), Cm = new Uint32Array(VN * VN), Bi = new Int16Array(VN * VN);
    const EXT = city.EXT;
    for (let row = 0; row < VN; row += 64) {
      const end = Math.min(VN * VN, (row + 64) * VN);
      for (let i = row * VN; i < end; i++) {
        const m = city.GROUND[i];
        Cm[i] = m === 1 ? 0x3e3a46 : (m === 3 || m === 8) ? 0x5a5460 : m === 2 ? 0x8c8278 : m === 4 ? 0x786e64 : 0x5a505a;
      }
      yield;
    }
    let k = 0;
    for (const p of G.pieces) {
      k++;
      for (let y = Math.max(-EXT, floor(p.y0)); y < Math.min(EXT, Math.ceil(p.y1)); y++) for (let x = Math.max(-EXT, floor(p.x0)); x < Math.min(EXT, Math.ceil(p.x1)); x++) {
        const i = (y + EXT) * VN + (x + EXT);
        const hh = p.axis === 'x' ? lerp(p.zt[0], p.zt[1], (x - p.x0) / Math.max(1, p.x1 - p.x0)) : lerp(p.zt[0], p.zt[1], (y - p.y0) / Math.max(1, p.y1 - p.y0));
        if (hh > Hf[i]) { Hf[i] = hh; Bi[i] = k; Cm[i] = p.rubble ? 0x625565 : [0x9babb2, 0x7f708a, 0xab947a, 0x625565][floor(((p.b && p.b.roof) || 0) * 4)]; }
      }
      if ((k & 31) === 0) yield;
    }
    const dg = decalGrid(HT.ledger ? HT.ledger.version(T) : 0, G.craters, G.canyons, G.erasures, G.scorch);
    for (let i = 0; i < VN * VN; i++) if (dg.DEC[i] === 1) { const cn = G.canyons[dg.CI[i]]; Hf[i] = -((cn && cn.depth) || 24); Cm[i] = 0x323353; Bi[i] = 0; }
    const V = { Hf, Cm, Bi, G };
    vxCache.set(key, V);
    return V;
  }
  function voxelData(T) {
    const key = geometry(T).version;
    const hit = vxCache.get(key);
    if (hit) return hit;
    let job = vxJobs.get(key);
    if (!job) { job = voxelBuild(T); vxJobs.set(key, job); }
    let r = job.next(); while (!r.done) r = job.next();
    vxJobs.delete(key);
    return r.value;
  }
  // step a pending build by one slice (used by scene init iterators)
  function voxelWarm(T) {
    const key = geometry(T).version;
    if (vxCache.get(key)) return true;
    let job = vxJobs.get(key);
    if (!job) { job = voxelBuild(T); vxJobs.set(key, job); }
    const r = job.next();
    if (r.done) { vxJobs.delete(key); return true; }
    return false;
  }
  HT.voxelData = voxelData; HT.voxelWarm = voxelWarm;
  const FARC = {};
  function farCity(snowy) { // 4 m cells over ±2048 m: lot heights / roof colours / a lot id (for window hashing)
    const key = snowy ? 's' : 'n'; if (FARC[key]) return FARC[key];
    const h = new Float32Array(1024 * 1024), c = new Uint32Array(1024 * 1024), b = new Int32Array(1024 * 1024);
    for (let gy = 0; gy < 1024; gy++) for (let gx = 0; gx < 1024; gx++) {
      const px = gx * 4 - 2048 + 2, py = gy * 4 - 2048 + 2, k = gy * 1024 + gx;
      const bxf = px / 52, byf = py / 41.6, bxi = Math.floor(bxf), byi = Math.floor(byf), fxf = bxf - bxi, fyf = byf - byi;
      if (fxf < 0.15 || fyf < 0.19) { h[k] = 0; c[k] = 0x3a3440; b[k] = 0; continue; }
      const nl = 2 + Math.floor(HT.hash(bxi * 73 + byi * 9151, 11) * 3), lxi = Math.floor((fxf - 0.15) / 0.85 * nl), lyi = Math.floor((fyf - 0.19) / 0.81 * 2);
      const hl = HT.hash(bxi * 7 + lxi + (byi * 5 + lyi) * 131, 9);
      h[k] = 8 + hl * hl * 46; c[k] = snowy && hl > 0.35 ? 0xb8c8c8 : [0x7f708a, 0x625565, 0x9babb2, 0x5a505e][Math.floor(hl * 4)]; b[k] = 1 + Math.floor(hl * 1000);
    }
    return (FARC[key] = { h, c, b });
  }
  HT.bootTasks.push({ name: 'far city', fn: () => { farCity(true); farCity(false); } });
  function renderVoxel(ctx, c, S) {
    const vx = round(c.vx || 0), vy = round(c.vy || 0), vw = round(c.vw || W), vh = round(c.vh || H);
    ensure(vw, vh, ctx);
    const buf = R.buf, env = S.env || {}, E = envOf(env), V = voxelData(S.T || 0), EXT = city.EXT;
    const f = c.f, hy = (c._hy !== undefined ? c._hy : vy + vh / 2) - vy, hx = (c._hx !== undefined ? c._hx : vx + vw / 2) - vx;
    const cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw);
    const fogC = rgb(E.fog), fogN = E.fogNear * 2, fogF = Math.max(E.fogFar, 1400);
    const skyN = 256, SK = skyRows(E, skyN);
    // sky first, with the far skyline silhouettes beyond the district (azimuth-indexed, like the street renderer)
    // below the horizon, beyond the marched distance: the hazy far city (fog over dark roofs), never the sky
    const hazeK = 0.86, HAZE = pk(0x3a * (1 - hazeK) + fogC[0] * hazeK, 0x34 * (1 - hazeK) + fogC[1] * hazeK, 0x40 * (1 - hazeK) + fogC[2] * hazeK);
    for (let y = 0; y < vh; y++) { const el = clamp((hy - y) / (vh * 0.9), 0, 1), col = y + 0.5 > hy ? HAZE : SK[Math.min(skyN - 1, floor(el * (skyN - 1)))]; buf.fill(col, y * vw, y * vw + vw); }
    {
      const skl = rgb(E.skyline), fg0 = 0.55, SKC = pk(skl[0] * (1 - fg0) + fogC[0] * fg0, skl[1] * (1 - fg0) + fogC[1] * fg0, skl[2] * (1 - fg0) + fogC[2] * fg0);
      const horizonDrop = Math.atan2(c.z, 2500); // the far skyline sits ~2.5 km away: it dips below the horizon seen from altitude
      for (let x = 0; x < vw; x++) {
        const az = c.yaw + Math.atan2(x + 0.5 - hx, f), bi = ((floor(az / (2 * Math.PI) * SKY_N) % SKY_N) + SKY_N) % SKY_N;
        const top = hy - f * Math.tan(SKYLINE[bi] * 2.2 - horizonDrop), bot = hy + f * Math.tan(horizonDrop);
        for (let y = Math.max(0, floor(top)); y < Math.min(vh, Math.ceil(bot) + 1); y++) buf[y * vw + x] = SKC;
      }
    }
    const ybuf = new Int32Array(vw).fill(vh);
    const snow = env.snow || 0;
    let dz = 0.5, z = 1;
    const zMax = Math.min(1600, fogF);
    while (z < zMax) {
      // left/right ends of this depth line
      const lx = c.x + syw * z + cyw * (-hx) * z / f, ly = c.y + cyw * z - syw * (-hx) * z / f;
      const rx = c.x + syw * z + cyw * (vw - hx) * z / f, ry = c.y + cyw * z - syw * (vw - hx) * z / f;
      const dxs = (rx - lx) / vw, dys = (ry - ly) / vw;
      const fg = clamp((z - fogN) / (fogF - fogN), 0, 1) * 0.95, fi = 1 - fg;
      let px = lx, py = ly;
      for (let x = 0; x < vw; x++, px += dxs, py += dys) {
        const ix = floor(px) + EXT, iy = floor(py) + EXT;
        let hgt = 0, col = 0x2e222f, bi = 0;
        if (ix >= 0 && iy >= 0 && ix < VN && iy < VN) { const i = iy * VN + ix; hgt = V.Hf[i]; col = V.Cm[i]; bi = V.Bi[i]; }
        else { // beyond the modelled district: the procedural far city (blocks of lots with hashed heights) from a baked LUT
          const F = farCity(snow > 0.2), gx = ((px + 2048) * 0.25) | 0, gy = ((py + 2048) * 0.25) | 0;
          if (gx >= 0 && gy >= 0 && gx < 1024 && gy < 1024) { const k = gy * 1024 + gx; hgt = F.h[k]; col = F.c[k]; bi = F.b[k]; } else { hgt = 0; col = 0x3a3440; }
        }
        const yTop = floor(hy - (hgt - c.z) * f / z);
        if (yTop >= ybuf[x]) continue;
        const y0 = Math.max(0, yTop), y1 = ybuf[x];
        for (let y = y0; y < y1; y++) {
          let cc = col;
          if (bi && y > yTop + 1) { // wall pixel: window pattern from the world height
            const wz = c.z + (hy - y - 0.5) * z / f, fl = floor(wz / 3.6), bayv = floor((abs(px) + abs(py)) / 3.8);
            const lit = HT.hash(bi * 131 + fl * 7 + bayv * 13, 2) < E.lit;
            cc = ((wz / 3.6 - fl) > 0.35 && ((abs(px) + abs(py)) / 3.8 - bayv) > 0.25) ? (lit ? 0xfbd954 : 0x323353) : 0x5a505e;
          } else if (snow > 0.2 && !bi && noiseAt(px * 0.5, py * 0.5) < snow * 0.8 - 0.1) cc = 0xc7dcd0;
          const r = ((cc >> 16) & 255) * fi + fogC[0] * fg, g = ((cc >> 8) & 255) * fi + fogC[1] * fg, b = (cc & 255) * fi + fogC[2] * fg;
          buf[y * vw + x] = pk(r, g, b);
        }
        ybuf[x] = y0;
      }
      z += dz; dz *= 1.016;
    }
    ctx.putImageData(R.img, vx, vy);
  }
  HT.SETS.voxel = { shear: true, init() { return {}; }, draw(ctx, c, S) { renderVoxel(ctx, c, S); } };

  // ------------------------------------------------------------------ overhead map (true top-down)
  function renderOverhead(ctx, c, S) {
    const vx = round(c.vx || 0), vy = round(c.vy || 0), vw = round(c.vw || W), vh = round(c.vh || H);
    ensure(vw, vh, ctx);
    const buf = R.buf, env = S.env || {}, E = envOf(env), EXT = city.EXT, V = voxelData(S.T || 0), Hf = V.Hf, Bi = V.Bi, GR = city.GROUND;
    const dg = decalGrid(HT.ledger ? HT.ledger.version(S.T || 0) : 0, V.G.craters, V.G.canyons, V.G.erasures, V.G.scorch), DEC = dg.DEC;
    // metres per pixel (orthographic approximation from the camera height and focal length); screen up = camera heading
    const mpp = c.z / c.f, cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw);
    const sun = E.sun, sox = Math.round(-sun[0] * 7), soy = Math.round(-sun[1] * 7); // shadow sample offset (cells)
    const snow = env.snow || 0, g0 = E.grade, gk = E.gradeK || 0;
    const roofPal = [[140, 146, 168], [118, 108, 140], [150, 136, 128], [96, 88, 112]];
    for (let y = 0; y < vh; y++) {
      const sym = (vh / 2 - y - 0.5) * mpp;
      let wx = c.x + cyw * (-vw / 2 + 0.5) * mpp + syw * sym, wy = c.y - syw * (-vw / 2 + 0.5) * mpp + cyw * sym;
      const dxs = cyw * mpp, dys = -syw * mpp;
      for (let x = 0; x < vw; x++, wx += dxs, wy += dys) {
        const ix = floor(wx) + EXT, iy = floor(wy) + EXT;
        let r = 46, g = 34, b = 47;
        if (ix >= 1 && iy >= 1 && ix < VN - 1 && iy < VN - 1) {
          const i = iy * VN + ix, h = Hf[i];
          if (h > 0.5) {
            const k = 0.6 + Math.min(0.4, h / 220), pal = roofPal[Bi[i] & 3];
            r = pal[0] * k; g = pal[1] * k; b = pal[2] * k;
            const edge = Hf[i - 1] < h - 2 || Hf[i + 1] < h - 2 || Hf[i - VN] < h - 2 || Hf[i + VN] < h - 2;
            if (edge) { r = 199; g = 204; b = 222; }
            else {
              const gx = floor(wx / 3), gy = floor(wy / 3);
              if (HT.hash(gx * 92821 + gy, 17) < 0.14 && (wx - gx * 3) > 0.7 && (wy - gy * 3) > 0.9) { r *= 0.72; g *= 0.72; b *= 0.78; }
              if (snow > 0.2 && noiseAt(wx * 0.6, wy * 0.6) < snow * 0.9 - 0.05) { r = 220; g = 222; b = 242; }
            }
          } else if (DEC[i] === 1 || h < -1) { r = 50; g = 42; b = 72; }
          else {
            const m = GR[i];
            if (m === 1) { r = 62; g = 58; b = 76; }
            else if (m === 3 || m === 8) { const q = m === 3 ? wx : wy; if ((((q % 0.9) + 0.9) % 0.9) < 0.45) { r = 199; g = 204; b = 222; } else { r = 70; g = 64; b = 84; } }
            else if (m === 2) { r = 140; g = 132; b = 142; }
            else { r = 90; g = 82; b = 98; }
            if (snow > 0.2 && noiseAt(wx * 0.8, wy * 0.8) < snow - 0.15) { r = lerp(r, 210, 0.6); g = lerp(g, 212, 0.6); b = lerp(b, 236, 0.6); }
            const j = (iy + soy) * VN + (ix + sox);
            if (j >= 0 && j < VN * VN && Hf[j] > 8) { r *= 0.6; g *= 0.6; b *= 0.7; } // cast shadow
            const dc = DEC[i]; if (dc === 2) { r *= 0.45; g *= 0.4; b *= 0.45; } else if (dc === 3 && HT.hash(i, 4) < 0.45) { r = 98; g = 85; b = 101; }
            else if (dc === 4) { const q = 0.45 + 0.55 * dg.DK[i] / 255; r *= q; g *= q; b *= q; } // scorch
            else if (dc === 5) { const q = 0.35 + 0.55 * dg.DK[i] / 255; r = lerp(r, 58, q); g = lerp(g, 36, q); b = lerp(b, 60, q); if ((dg.DK[i] & 31) < 2) { r = 107; g = 62; b = 117; } } // erasure bowl: dark violet, faint contour rings
          }
        }
        if (gk) { r += (g0[0] - r) * gk * 0.5; g += (g0[1] - g) * gk * 0.5; b += (g0[2] - b) * gk * 0.5; }
        buf[y * vw + x] = pk(r, g, b);
      }
    }
    ctx.putImageData(R.img, vx, vy);
  }
  HT.SETS.overhead = { init() { return {}; }, draw(ctx, c, S) { renderOverhead(ctx, c, S); } };

  // ------------------------------------------------------------------ utility sets
  HT.SETS.black = { init() { return {}; }, draw(ctx) { HT.rect(ctx, 0, 0, W, H, C.ink); } };
  HT.SETS.white = { init() { return {}; }, draw(ctx) { HT.rect(ctx, 0, 0, W, H, C.white); } };

  // ------------------------------------------------------------------ lab: ?lab=sets
  HT.labs = HT.labs || {};
  HT.labs.sets = Q => {
    const time = Q.get('time') || 'dawn', snow = +(Q.get('snow') || 0.5);
    const shots = [
      ['intersection wide', { x: 0, y: -40, z: 1.6, yaw: 0, f: 420, shift: 30 }],
      ['down the avenue', { x: -6, y: -14, z: 1.7, yaw: Math.PI / 2 - 0.05, f: 380, shift: 20 }],
      ['low looking up', { x: 8, y: -10, z: 0.5, yaw: 0.3, f: 320, shift: 90 }],
      ['crane', { x: -30, y: -80, z: 40, yaw: 0.25, f: 420, shift: -60 }],
      ['west towers', { x: -60, y: 0, z: 2, yaw: -Math.PI / 2 + 0.3, f: 420, shift: 60 }],
      ['voxel', { x: 0, y: -380, z: 120, yaw: 0.1, f: 380, shift: -80, set: 'voxel' }],
      ['overhead', { x: 0, y: 0, z: 300, yaw: 0, f: 380, set: 'overhead' }],
      ['close', { x: 3, y: 8, z: 1.5, yaw: 0.7, f: 460, shift: 20 }],
    ];
    const T = +(Q.get('T') || 0);
    const off = HT.canvas(W, H);
    const cells = shots.map(([label, cm]) => ({ label: label + ' ' + time, draw(g) {
      const c = CAM.prep(CAM.make(cm));
      const S = { T, env: { time, snow }, cam: c, t: 0 };
      (HT.SETS[cm.set || 'city']).draw(off.g, c, S, 'back', { o: {} });
      g.drawImage(off.c, 0, 0); // putImageData ignores the sheet's transform → render offscreen first
    } }));
    const perf = [];
    const out = HT.sheet(cells.map(cl => ({ label: cl.label, draw(g, w, h) { const a = performance.now(); cl.draw(g, w, h); perf.push(+(performance.now() - a).toFixed(1)); } })), { cw: W, ch: H, cols: 2, scale: +(Q.get('scale') || 1) });
    console.log('sets perf ms', JSON.stringify(perf));
    return out;
  };
})();
