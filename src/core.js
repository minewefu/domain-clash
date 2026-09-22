/* DOMAIN CLASH — core engine (inherited from HELLO, TOMORROW, upgraded to 640x360): palette, quantizer, pixel
   primitives, sprites, fonts, icons, 2.5D helpers, small caches. Everything here is deterministic and allocation-light.
   See SPEC.md §4 for the public API. */
(function () {
  'use strict';
  const HT = (window.HT = window.HT || {});
  HT.W = 640; HT.H = 360;
  HT.caches = HT.caches || []; // module-level caches register here ({name, size()}) so tools can report them

  // ------------------------------------------------------------------ palette (Resurrect 64, Kerrie Lake)
  HT.PAL = [
    '#2e222f', '#3e3546', '#625565', '#966c6c', '#ab947a', '#694f62', '#7f708a', '#9babb2', '#c7dcd0', '#ffffff',
    '#6e2727', '#b33831', '#ea4f36', '#f57d4a', '#ae2334', '#e83b3b', '#fb6b1d', '#f79617', '#f9c22b', '#7a3045',
    '#9e4539', '#cd683d', '#e6904e', '#fbb954', '#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86', '#165a4c',
    '#239063', '#1ebc73', '#91db69', '#cddf6c', '#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90', '#0b5e65',
    '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2', '#323353', '#484a77', '#4d65b4', '#4d9be6', '#8fd3ff', '#45293f',
    '#6b3e75', '#905ea9', '#a884f3', '#eaaded', '#753c54', '#a24b6f', '#cf657f', '#ed8099', '#831c5d', '#c32454',
    '#f04f78', '#f68181', '#fca790', '#fdcbb0',
  ];
  const NAMES = ('ink shadow dusk rosewood sand mauve lilacgrey steel mist white maroon brick vermilion coral crimson ' +
    'red orange amber gold wine rust clay tan honey bark olive moss lime butter pine green leaf mint sprout charcoal ' +
    'slate sage fern lichen deepteal teal jade aqua foam navy indigo blue sky ice plum purple violet lavender blush ' +
    'berry rose pinkrose pink magenta raspberry hotpink salmon peach cream').split(' ');
  HT.C = {};
  NAMES.forEach((n, i) => { HT.C[n] = HT.PAL[i]; });
  const C = HT.C;
  HT.R = {
    neutral: [C.ink, C.shadow, C.dusk, C.lilacgrey, C.steel, C.mist, C.white],
    warmgrey: [C.ink, C.shadow, C.mauve, C.rosewood, C.sand, C.mist],
    fire: [C.maroon, C.brick, C.vermilion, C.orange, C.amber, C.gold, C.butter],
    brown: [C.wine, C.rust, C.clay, C.tan, C.honey],
    earth: [C.bark, C.olive, C.moss, C.lime, C.butter],
    green: [C.pine, C.green, C.leaf, C.mint, C.sprout],
    sage: [C.charcoal, C.slate, C.sage, C.fern, C.lichen],
    teal: [C.deepteal, C.teal, C.jade, C.aqua, C.foam],
    blue: [C.navy, C.indigo, C.blue, C.sky, C.ice],
    purple: [C.plum, C.purple, C.violet, C.lavender, C.blush],
    pink: [C.berry, C.rose, C.pinkrose, C.pink, C.salmon, C.peach, C.cream],
    red: [C.maroon, C.crimson, C.red, C.coral, C.salmon],
    magenta: [C.plum, C.magenta, C.raspberry, C.hotpink, C.pink],
    sunset: [C.ink, C.navy, C.indigo, C.purple, C.rose, C.pinkrose, C.coral, C.orange, C.amber, C.gold, C.butter, C.white],
  };

  HT.rgb = hex => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const h2 = v => { const s = Math.max(0, Math.min(255, Math.round(v))).toString(16); return s.length < 2 ? '0' + s : s; };
  HT.hex = (r, g, b) => '#' + h2(r) + h2(g) + h2(b);
  HT.mix = (a, b, t) => { const A = HT.rgb(a), B = HT.rgb(b); return HT.hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); };
  HT.rgba = (hex, a) => { const c = HT.rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

  // ------------------------------------------------------------------ math / easing / randomness
  HT.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  HT.lerp = (a, b, t) => a + (b - a) * t;
  HT.seg = (t, a, b) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a));
  HT.smooth = x => { x = HT.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  HT.pingpong = x => { x = ((x % 2) + 2) % 2; return x > 1 ? 2 - x : x; };
  HT.frame = (t, fps = 10) => Math.floor(t * fps);
  HT.E = {
    linear: x => x,
    inQuad: x => x * x,
    outQuad: x => 1 - (1 - x) * (1 - x),
    inOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: x => x * x * x,
    outCubic: x => 1 - Math.pow(1 - x, 3),
    inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: x => (x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    outBounce: x => {
      const n1 = 7.5625, d1 = 2.75;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    },
    inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  HT.hash = (n, seed = 0) => {
    let h = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((seed | 0) + 0x6a09e667, 0xc2b2ae35);
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  HT.rng = seed => {
    let a = (seed | 0) + 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hgrid = (ix, iy, seed) => {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 144665)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  HT.noise = (x, y = 0, seed = 0) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hgrid(ix, iy, seed), b = hgrid(ix + 1, iy, seed), c = hgrid(ix, iy + 1, seed), d = hgrid(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  HT.fbm = (x, y = 0, oct = 4, seed = 0) => {
    let s = 0, a = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += a * HT.noise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2; }
    return s / n;
  };

  // ------------------------------------------------------------------ canvases
  HT.canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    return { c, g };
  };

  // ------------------------------------------------------------------ pixel primitives (aliased)
  const R = Math.round;
  HT.rect = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(R(x), R(y), R(w), R(h)); };
  HT.px = (ctx, x, y, col) => { ctx.fillStyle = col; ctx.fillRect(R(x), R(y), 1, 1); };
  HT.hline = (ctx, x0, x1, y, col) => { if (x1 < x0) { const t = x0; x0 = x1; x1 = t; } ctx.fillStyle = col; ctx.fillRect(R(x0), R(y), R(x1) - R(x0) + 1, 1); };
  HT.vline = (ctx, x, y0, y1, col) => { if (y1 < y0) { const t = y0; y0 = y1; y1 = t; } ctx.fillStyle = col; ctx.fillRect(R(x), R(y0), 1, R(y1) - R(y0) + 1); };
  HT.line = (ctx, x0, y0, x1, y1, col) => {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    ctx.fillStyle = col;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if ((x0 === x1 && y0 === y1) || ++n > 4000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  HT.thick = (ctx, x0, y0, x1, y1, w, col) => {
    x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
    ctx.fillStyle = col;
    const o = Math.floor((w - 1) / 2);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      ctx.fillRect(x0 - o, y0 - o, w, w);
      if ((x0 === x1 && y0 === y1) || ++n > 4000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  HT.circle = (ctx, cx, cy, r, col) => {
    cx = R(cx); cy = R(cy); r = Math.max(0, R(r));
    ctx.fillStyle = col;
    const rr = (r + 0.5) * (r + 0.5);
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  };
  HT.ellipse = (ctx, cx, cy, rx, ry, col) => {
    cx = R(cx); cy = R(cy); rx = Math.max(0, rx); ry = Math.max(0, R(ry));
    ctx.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const t = y / (ry + 0.5);
      const half = R(rx * Math.sqrt(Math.max(0, 1 - t * t)));
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  };
  HT.ring = (ctx, cx, cy, r, col) => {
    cx = R(cx); cy = R(cy); r = R(r);
    ctx.fillStyle = col;
    let x = r, y = 0, err = 1 - r;
    while (x >= y) {
      ctx.fillRect(cx + x, cy + y, 1, 1); ctx.fillRect(cx + y, cy + x, 1, 1);
      ctx.fillRect(cx - y, cy + x, 1, 1); ctx.fillRect(cx - x, cy + y, 1, 1);
      ctx.fillRect(cx - x, cy - y, 1, 1); ctx.fillRect(cx - y, cy - x, 1, 1);
      ctx.fillRect(cx + y, cy - x, 1, 1); ctx.fillRect(cx + x, cy - y, 1, 1);
      y++;
      if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  };
  HT.poly = (ctx, pts, col) => {
    if (pts.length < 3) return;
    ctx.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
    const y0 = Math.ceil(minY - 0.5), y1 = Math.floor(maxY - 0.5);
    const xs = [];
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) xs.push(xi + ((sy - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.ceil(xs[k] - 0.5), b = Math.floor(xs[k + 1] - 0.5);
        if (b >= a) ctx.fillRect(a, y, b - a + 1, 1);
      }
    }
  };
  HT.tri = (ctx, x0, y0, x1, y1, x2, y2, col) => HT.poly(ctx, [[x0, y0], [x1, y1], [x2, y2]], col);
  const grad = (ctx, x, y, w, h, stops, vertical) => {
    const g = vertical ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    for (const [p, c] of stops) g.addColorStop(HT.clamp(p, 0, 1), c);
    ctx.fillStyle = g; ctx.fillRect(R(x), R(y), R(w), R(h));
  };
  HT.vgrad = (ctx, x, y, w, h, stops) => grad(ctx, x, y, w, h, stops, true);
  HT.hgrad = (ctx, x, y, w, h, stops) => grad(ctx, x, y, w, h, stops, false);
  HT.alpha = (ctx, a, fn) => { const o = ctx.globalAlpha; ctx.globalAlpha = o * HT.clamp(a, 0, 1); try { fn(); } finally { ctx.globalAlpha = o; } };

  // 4x4 Bayer matrix (values 0..15)
  HT.BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const ditherTiles = new Map();
  HT.dither = (ctx, x, y, w, h, colA, colB, ratio) => {
    const lvl = HT.clamp(Math.round(ratio * 16), 0, 16);
    if (lvl === 0) return HT.rect(ctx, x, y, w, h, colA);
    if (lvl === 16) return HT.rect(ctx, x, y, w, h, colB);
    const key = colA + colB + lvl;
    let tile = ditherTiles.get(key);
    if (!tile) {
      const { c, g } = HT.canvas(4, 4);
      for (let i = 0; i < 16; i++) { g.fillStyle = HT.BAYER[i] < lvl ? colB : colA; g.fillRect(i & 3, i >> 2, 1, 1); }
      tile = c; ditherTiles.set(key, tile);
    }
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(R(x), R(y), R(w), R(h));
  };
  // dithered mask fill with only one colour: pixels where bayer < ratio*16 get col (transparent elsewhere)
  const maskTiles = new Map();
  HT.ditherMask = (ctx, x, y, w, h, col, ratio) => {
    const lvl = HT.clamp(Math.round(ratio * 16), 0, 16);
    if (lvl === 0) return;
    if (lvl === 16) return HT.rect(ctx, x, y, w, h, col);
    const key = col + lvl;
    let tile = maskTiles.get(key);
    if (!tile) {
      const { c, g } = HT.canvas(4, 4);
      g.fillStyle = col;
      for (let i = 0; i < 16; i++) if (HT.BAYER[i] < lvl) g.fillRect(i & 3, i >> 2, 1, 1);
      tile = c; maskTiles.set(key, tile);
    }
    ctx.fillStyle = ctx.createPattern(tile, 'repeat');
    ctx.fillRect(R(x), R(y), R(w), R(h));
  };
  HT.glow = (ctx, x, y, r, col, alpha = 0.5) => {
    if (r <= 0 || alpha <= 0) return;
    const [cr, cg, cb] = HT.rgb(col);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
    g.addColorStop(0.4, `rgba(${cr},${cg},${cb},${alpha * 0.45})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    const op = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fillRect(R(x - r), R(y - r), R(r * 2), R(r * 2));
    ctx.globalCompositeOperation = op;
  };
  HT.shadowBlob = (ctx, cx, cy, rx, ry, alpha = 0.35) => HT.alpha(ctx, alpha, () => HT.ellipse(ctx, cx, cy, rx, ry, C.ink));

  // ------------------------------------------------------------------ sprites
  const spriteCache = new Map();
  HT.caches.push({ name: 'sprite', size: () => spriteCache.size });
  HT.sprite = (rows, map) => {
    const key = rows.join('\n') + '|' + JSON.stringify(map);
    let c = spriteCache.get(key);
    if (c) return c;
    const w = Math.max(...rows.map(r => r.length)), h = rows.length;
    const cv = HT.canvas(w, h);
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const col = map[ch];
        if (!col) continue;
        cv.g.fillStyle = col; cv.g.fillRect(x, y, 1, 1);
      }
    }
    if (spriteCache.size > 4000) spriteCache.clear();
    spriteCache.set(key, cv.c);
    return cv.c;
  };
  HT.spr = (ctx, img, x, y, o = {}) => {
    const s = o.scale || 1;
    const w = R(img.width * s), h = R(img.height * s);
    if (w <= 0 || h <= 0) return;
    const a = o.alpha === undefined ? 1 : o.alpha;
    const oa = ctx.globalAlpha;
    if (a !== 1) ctx.globalAlpha = oa * a;
    if (o.flip) {
      ctx.save(); ctx.translate(R(x) + w, R(y)); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
    } else ctx.drawImage(img, R(x), R(y), w, h);
    if (a !== 1) ctx.globalAlpha = oa;
  };
  const derived = new WeakMap(); // img -> Map(key -> canvas)
  const derive = (img, key, make) => {
    let m = derived.get(img);
    if (!m) { m = new Map(); derived.set(img, m); }
    let c = m.get(key);
    if (!c) { c = make(); m.set(key, c); }
    return c;
  };
  // returns a canvas 2 px larger (1 px border on each side) — draw it at (x-1, y-1)
  HT.outlined = (img, col = C.ink, diag = false) => derive(img, 'o' + col + diag, () => {
    const w = img.width, h = img.height;
    const src = img.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const cv = HT.canvas(w + 2, h + 2);
    const out = cv.g.createImageData(w + 2, h + 2);
    const [r, g, b] = HT.rgb(col);
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 127;
    for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
      if (op(x, y)) continue;
      let n = op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1);
      if (!n && diag) n = op(x - 1, y - 1) || op(x + 1, y - 1) || op(x - 1, y + 1) || op(x + 1, y + 1);
      if (n) { const i = ((y + 1) * (w + 2) + (x + 1)) * 4; out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = 255; }
    }
    cv.g.putImageData(out, 0, 0);
    cv.g.drawImage(img, 1, 1);
    return cv.c;
  });
  HT.recolor = (img, map) => derive(img, 'r' + JSON.stringify(map), () => {
    const w = img.width, h = img.height;
    const cv = HT.canvas(w, h);
    cv.g.drawImage(img, 0, 0);
    const d = cv.g.getImageData(0, 0, w, h);
    const lut = new Map();
    for (const k in map) { const a = HT.rgb(k), b = HT.rgb(map[k]); lut.set((a[0] << 16) | (a[1] << 8) | a[2], b); }
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      const t = lut.get((d.data[i] << 16) | (d.data[i + 1] << 8) | d.data[i + 2]);
      if (t) { d.data[i] = t[0]; d.data[i + 1] = t[1]; d.data[i + 2] = t[2]; }
    }
    cv.g.putImageData(d, 0, 0);
    return cv.c;
  });
  HT.tint = (img, col) => derive(img, 't' + col, () => {
    const cv = HT.canvas(img.width, img.height);
    cv.g.drawImage(img, 0, 0);
    cv.g.globalCompositeOperation = 'source-in';
    cv.g.fillStyle = col; cv.g.fillRect(0, 0, img.width, img.height);
    return cv.c;
  });
  HT.flipped = img => derive(img, 'flip', () => {
    const cv = HT.canvas(img.width, img.height);
    cv.g.translate(img.width, 0); cv.g.scale(-1, 1); cv.g.drawImage(img, 0, 0);
    return cv.c;
  });

  // ------------------------------------------------------------------ fonts
  const SMALL = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['.#.', '##.', '.#.', '.#.', '.#.', '.#.', '###'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
    '.': ['.', '.', '.', '.', '.', '.', '#'],
    ',': ['..', '..', '..', '..', '.#', '.#', '#.'],
    '!': ['#', '#', '#', '#', '#', '.', '#'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    ':': ['.', '#', '.', '.', '.', '#', '.'],
    ';': ['..', '.#', '..', '..', '..', '.#', '#.'],
    "'": ['#', '#', '.', '.', '.', '.', '.'],
    '"': ['#.#', '#.#', '...', '...', '...', '...', '...'],
    '-': ['...', '...', '...', '###', '...', '...', '...'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
    '(': ['.#', '#.', '#.', '#.', '#.', '#.', '.#'],
    ')': ['#.', '.#', '.#', '.#', '.#', '.#', '#.'],
    '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##'],
    '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
    '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
    '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
    '*': ['.....', '..#..', '#.#.#', '.###.', '#.#.#', '..#..', '.....'],
    '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#'],
    '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...'],
    '_': ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
    '♥': ['.....', '.#.#.', '#####', '#####', '.###.', '..#..', '.....'],
    '·': ['.', '.', '.', '#', '.', '.', '.'],
    '→': ['.....', '...#.', '....#', '#####', '....#', '...#.', '.....'],
    ' ': ['...', '...', '...', '...', '...', '...', '...'],
  };
  const TINY = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
    J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
    P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
    V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
    3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
    9: ['###', '#.#', '###', '..#', '##.'],
    '.': ['.', '.', '.', '.', '#'], ',': ['.', '.', '.', '#', '#'], ':': ['.', '#', '.', '#', '.'], ';': ['.', '#', '.', '#', '#'],
    '!': ['#', '#', '#', '.', '#'], '?': ['##.', '..#', '.#.', '...', '.#.'], '-': ['...', '...', '###', '...', '...'],
    '+': ['...', '.#.', '###', '.#.', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'], "'": ['#', '#', '.', '.', '.'],
    '"': ['#.#', '#.#', '...', '...', '...'], '(': ['.#', '#.', '#.', '#.', '.#'], ')': ['#.', '.#', '.#', '.#', '#.'],
    '%': ['#.#', '..#', '.#.', '#..', '#.#'], '&': ['.#.', '#.#', '.#.', '#.#', '.##'], '#': ['#.#', '###', '#.#', '###', '#.#'],
    '=': ['...', '###', '...', '###', '...'], '*': ['#.#', '.#.', '#.#', '...', '...'], '<': ['..#', '.#.', '#..', '.#.', '..#'],
    '>': ['#..', '.#.', '..#', '.#.', '#..'], '_': ['...', '...', '...', '...', '###'],
    '♥': ['.#.#.', '#####', '#####', '.###.', '..#..'], '·': ['.', '.', '#', '.', '.'], '→': ['..#.', '...#', '####', '...#', '..#.'],
    ' ': ['..', '..', '..', '..', '..'],
  };
  const FONTS = { small: { g: SMALL, h: 7 }, tiny: { g: TINY, h: 5 } };
  const glyph = (font, ch) => {
    const F = FONTS[font] || FONTS.small;
    return F.g[ch] || F.g[ch.toUpperCase()] || F.g['?'];
  };
  HT.textWidth = (str, font = 'small', scale = 1, spacing = 1) => {
    let w = 0;
    for (const ch of String(str)) w += (glyph(font, ch)[0].length + spacing) * scale;
    return Math.max(0, w - spacing * scale);
  };
  const textCache = new Map();
  HT.caches.push({ name: 'text', size: () => textCache.size });
  const renderText = (str, font, col, scale, spacing) => {
    const key = font + '|' + col + '|' + scale + '|' + spacing + '|' + str;
    let c = textCache.get(key);
    if (c) return c;
    const F = FONTS[font] || FONTS.small;
    const w = Math.max(1, HT.textWidth(str, font, scale, spacing)), h = F.h * scale;
    const cv = HT.canvas(w, h);
    cv.g.fillStyle = col;
    let x = 0;
    for (const ch of String(str)) {
      const gl = glyph(font, ch);
      for (let yy = 0; yy < gl.length; yy++) for (let xx = 0; xx < gl[yy].length; xx++)
        if (gl[yy][xx] === '#') cv.g.fillRect(x + xx * scale, yy * scale, scale, scale);
      x += (gl[0].length + spacing) * scale;
    }
    if (textCache.size > 800) textCache.clear();
    textCache.set(key, cv.c);
    return cv.c;
  };
  HT.text = (ctx, str, x, y, o = {}) => {
    const font = o.font || 'small', scale = o.scale || 1, spacing = o.spacing === undefined ? 1 : o.spacing;
    const col = o.col || C.ink;
    str = String(str);
    const img = renderText(str, font, col, scale, spacing);
    let dx = R(x);
    if (o.align === 'center') dx = R(x - img.width / 2);
    else if (o.align === 'right') dx = R(x - img.width);
    const dy = R(y);
    const oa = ctx.globalAlpha;
    if (o.alpha !== undefined) ctx.globalAlpha = oa * o.alpha;
    if (o.outline) {
      const oi = HT.outlined(renderText(str, font, o.outline, scale, spacing), o.outline, !!o.outlineDiag);
      ctx.drawImage(oi, dx - 1, dy - 1);
    }
    if (o.shadow) ctx.drawImage(renderText(str, font, o.shadow, scale, spacing), dx + (o.shadowX === undefined ? scale : o.shadowX), dy + (o.shadowY === undefined ? scale : o.shadowY));
    ctx.drawImage(img, dx, dy);
    ctx.globalAlpha = oa;
    return img.width;
  };
  // Extruded 2.5D display lettering
  const titleCache = new Map();
  HT.caches.push({ name: 'title3d', size: () => titleCache.size });
  HT.title3d = (ctx, str, cx, y, o = {}) => {
    const scale = o.scale || 3, depth = o.depth === undefined ? 4 : o.depth;
    const face = o.face || [C.butter, C.orange], side = o.side || C.maroon, outline = o.outline || C.ink;
    const hl = o.highlight === undefined ? C.white : o.highlight;
    const key = [str, scale, depth, face.join(), side, outline, hl, o.spacing].join('|');
    let img = titleCache.get(key);
    if (!img) {
      const spacing = o.spacing === undefined ? 1 : o.spacing;
      const mask = renderText(str, 'small', '#ffffff', scale, spacing);
      const w = mask.width, h = mask.height;
      const cv = HT.canvas(w + depth + 2, h + depth + 2);
      const sideImg = HT.tint(mask, side);
      for (let d = depth; d >= 1; d--) cv.g.drawImage(sideImg, 1 + d, 1 + d);
      // face with vertical gradient (two-tone split + dithered middle band handled by quantizer)
      const f = HT.canvas(w, h);
      const gr = f.g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, face[0]); gr.addColorStop(0.45, face[0]); gr.addColorStop(1, face[1]);
      f.g.fillStyle = gr; f.g.fillRect(0, 0, w, h);
      f.g.globalCompositeOperation = 'destination-in'; f.g.drawImage(mask, 0, 0);
      cv.g.drawImage(f.c, 1, 1);
      if (hl) { // top highlight row of each stroke
        const m = mask.getContext('2d').getImageData(0, 0, w, h).data;
        cv.g.fillStyle = hl;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          const i = (yy * w + xx) * 4 + 3;
          if (m[i] > 127 && (yy === 0 || m[i - w * 4] < 128) && (yy % scale === 0)) cv.g.fillRect(1 + xx, 1 + yy, 1, 1);
        }
      }
      img = HT.outlined(cv.c, outline);
      if (titleCache.size > 200) titleCache.clear();
      titleCache.set(key, img);
    }
    const dx = R(cx - img.width / 2), dy = R(y);
    if (o.alpha !== undefined && o.alpha < 1) HT.alpha(ctx, o.alpha, () => ctx.drawImage(img, dx, dy));
    else ctx.drawImage(img, dx, dy);
    return img;
  };

  // ------------------------------------------------------------------ icons (9x9)
  const IC = {
    k: C.ink, w: C.white, y: C.gold, o: C.orange, r: C.red, g: C.leaf, d: C.green, b: C.sky, B: C.blue, a: C.aqua, n: C.rust,
    p: C.hotpink, u: C.butter, c: C.peach, s: C.steel, m: C.mist, v: C.violet, t: C.teal, l: C.lime, h: C.honey,
  };
  HT.ICON_ROWS = {
    sun: ['....y....', '.y..y..y.', '...yyy...', '..yyyyy..', 'yyyywyyyy', '..yyyyy..', '...yyy...', '.y..y..y.', '....y....'],
    moon: ['...uuu...', '.uuuu....', '.uuu.....', 'uuu......', 'uuu......', 'uuu......', '.uuu.....', '.uuuu....', '...uuu...'],
    star: ['....y....', '....y....', '...yyy...', 'yyyyyyyyy', '.yyyyyyy.', '..yyyyy..', '..yyyyy..', '.yyy.yyy.', '.y.....y.'],
    heart: ['.........', '.rr...rr.', 'rwrr.rrrr', 'rwrrrrrrr', 'rrrrrrrrr', '.rrrrrrr.', '..rrrrr..', '...rrr...', '....r....'],
    kite: ['....o....', '...ooa...', '..oooaa..', '.ooooaaa.', '..oooaa..', '...ooa...', '....o....', '.....r...', '....r.r..'],
    bulb: ['...yyy...', '..yyyyy..', '.yywyyyy.', '.ywyyyyy.', '.yyyyyyy.', '..yyyyy..', '...sss...', '...sss...', '....k....'],
    question: ['..kkkkk..', '.kk...kk.', '......kk.', '.....kk..', '....kk...', '....kk...', '.........', '....kk...', '....kk...'],
    exclaim: ['...kkk...', '...kkk...', '...kkk...', '...kkk...', '....k....', '....k....', '.........', '...kkk...', '...kkk...'],
    note: ['...kkkkkk', '...kkkkkk', '...k....k', '...k....k', '...k....k', '.kkk..kkk', 'kkkk.kkkk', 'kkk..kkk.', '.........'],
    check: ['.........', '........d', '.......dd', '......dd.', 'd....dd..', 'dd..dd...', '.dddd....', '..dd.....', '.........'],
    cross: ['rr.....rr', 'rrr...rrr', '.rrr.rrr.', '..rrrrr..', '...rrr...', '..rrrrr..', '.rrr.rrr.', 'rrr...rrr', 'rr.....rr'],
    rocket: ['....w....', '...wmw...', '...wbw...', '...wmw...', '...wmw...', '..rwmwr..', '.rr.m.rr.', '...oyo...', '....o....'],
    leaf: ['......ddd', '....ddggd', '...dgggdd', '..dggggd.', '.dgggdd..', '.dggdd...', '.ddd.....', 'd........', '.........'],
    sprout: ['.........', '.dd...dd.', 'dggd.dggd', 'dgggdgggd', '.ddgggdd.', '....g....', '....g....', '..nnnnn..', '...nnn...'],
    tree: ['...ddd...', '..dgggd..', '.dggggld.', 'dgggggggd', 'dgggggggd', '.dgggggd.', '..ddndd..', '....n....', '...nnn...'],
    book: ['.........', 'BBBB.BBBB', 'Bwww.wwwB', 'Bwkk.kkwB', 'Bwww.wwwB', 'Bwkk.kkwB', 'Bwww.wwwB', 'BBBBBBBBB', '.........'],
    clock: ['..kkkkk..', '.kwwwwwk.', 'kwwwkwwwk', 'kwwwkwwwk', 'kwwwkkkwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kwwwwwk.', '..kkkkk..'],
    home: ['....r....', '...rrr...', '..rrrrr..', '.rrrrrrr.', 'rrrrrrrrr', '.mmmmmmm.', '.mmmnmmm.', '.mmmnmmm.', '.mmmnmmm.'],
    drop: ['....b....', '....b....', '...bbb...', '..bbbbb..', '.bbbbbbb.', '.bwbbbbb.', '.bwbbbbb.', '..bbbbb..', '...bbb...'],
    bolt: ['....yyy..', '...yyy...', '..yyy....', '.yyyyyy..', '...yyy...', '..yyy....', '.yyy.....', '.yy......', '.y.......'],
    whale: ['.........', '.......b.', '..bbbb.bb', '.bbbbbbbb', 'bkbbbbbb.', 'bbbbbbb..', '.mmmmmm..', '.........', '.........'],
    planet: ['.........', '...ooo...', '..ooooo.y', '.ooooooy.', '.oooooyo.', '.ooooyoo.', '.yooooo..', 'y..ooo...', '.........'],
    globe: ['..BBBBB..', '.BggBBBB.', 'BgggBBBBB', 'BggBBBggB', 'BBBBBgggB', 'BBBBBggBB', 'BBgBBBBBB', '.BggBBBB.', '..BBBBB..'],
    smile: ['..yyyyy..', '.yyyyyyy.', 'yykyyykyy', 'yykyyykyy', 'yyyyyyyyy', 'ykyyyyyky', 'yykkkkkyy', '.yyyyyyy.', '..yyyyy..'],
    zzz: ['kkkk.....', '...k.....', '..k......', '.k.......', 'kkkk.kkk.', '......k..', '.....k...', '....kkk..', '.........'],
    wind: ['.........', 'bbbbbb...', '......b..', 'bbbbbbb..', '.........', 'bbbbbbbb.', '........b', '......bb.', '.........'],
    fish: ['.........', '.........', '..ooo..o.', '.oooooooo', 'ookoooo..', '.oooooooo', '..ooo..o.', '.........', '.........'],
    gear: ['...s.s...', '..sssss..', '.sssssss.', 'ssss.ssss', '.ss...ss.', 'ssss.ssss', '.sssssss.', '..sssss..', '...s.s...'],
    hand: ['..c.c....', '.cc.cc.c.', '.cc.cc.cc', '.cc.cc.cc', '.cccccccc', '.ccccccc.', '..cccccc.', '..ccccc..', '...cccc..'],
    pancake: ['.........', '....u....', '..hhhhh..', '.hnnnnnh.', '.hhhhhhh.', '.hnnnnnh.', '.hhhhhhh.', '..nnnnn..', '.........'],
    camera: ['.........', '..kkk....', 'kkkkkkkkk', 'kwwwkwwwk', 'kwwkkkwwk', 'kwwkbkwwk', 'kwwkkkwwk', 'kkkkkkkkk', '.........'],
    paint: ['..nnnnn..', '.nrnnnbn.', 'nnnnnnnnn', 'nynn..nnn', 'nnnn..nnn', 'nngnnnnn.', '.nnnnnn..', '.........', '.........'],
    music: ['...kkkkkk', '...kkkkkk', '...k....k', '...k....k', '...k....k', '.kkk..kkk', 'kkkk.kkkk', 'kkk..kkk.', '.........'],
    eye: ['.........', '..kkkkk..', '.kwwkwwk.', 'kwwkbkwwk', 'kwwkkkwwk', '.kwwkwwk.', '..kkkkk..', '.........', '.........'],
    flower: ['...p.p...', '..ppppp..', '.ppyyypp.', '..ppppp..', '...p.p...', '....g....', '..g.g....', '...gg....', '....g....'],
  };
  HT.ICONS = {};
  for (const k in HT.ICON_ROWS) HT.ICONS[k] = HT.sprite(HT.ICON_ROWS[k], IC);
  HT.icon = (ctx, name, x, y, o = {}) => {
    let img = HT.ICONS[name] || HT.ICONS.question;
    if (o.col) img = HT.tint(img, o.col);
    if (o.outline) { img = HT.outlined(img, o.outline); x -= 1; y -= 1; }
    HT.spr(ctx, img, x, y, { scale: o.scale || 1, alpha: o.alpha });
  };

  // ------------------------------------------------------------------ 2.5D helpers
  HT.parallax = (ctx, img, camX, factor, y, o = {}) => {
    const w = img.width;
    let x = R(-(camX * factor) + (o.xOff || 0));
    if (o.wrap === false) { ctx.drawImage(img, x, R(y)); return; }
    x = (((x % w) + w) % w) - w;
    for (; x < HT.W; x += w) ctx.drawImage(img, x, R(y));
  };

  const texCache = new WeakMap();
  const texData = tex => {
    if (tex instanceof ImageData) return { w: tex.width, h: tex.height, d: new Uint32Array(tex.data.buffer) };
    let t = texCache.get(tex);
    if (!t) {
      const id = tex.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, tex.width, tex.height);
      t = { w: tex.width, h: tex.height, d: new Uint32Array(id.data.buffer) };
      texCache.set(tex, t);
    }
    return t;
  };
  HT.texInvalidate = tex => texCache.delete(tex);
  const m7bufs = new Map(); // reusable output buffers per size (putImageData copies, so reuse is safe)
  // Mode-7 style textured plane. Everything in world units; camera looks along `angle` (radians, 0 = +x).
  HT.mode7 = (ctx, tex, o) => {
    const W = HT.W;
    const horizon = o.horizon, focal = o.focal || 200, camZ = o.camZ || 40;
    const ca = Math.cos(o.angle || 0), sa = Math.sin(o.angle || 0);
    const x0 = o.x0 || 0, w = o.w || W, y0 = o.y0 === undefined ? Math.ceil(horizon) : o.y0;
    const h = o.h === undefined ? HT.H - y0 : o.h;
    const T = texData(tex);
    const tw = T.w, th = T.h, td = T.d;
    const scaleX = o.texScale || 1;
    let fogR = 0, fogG = 0, fogB = 0;
    const fog = !!o.fog;
    if (fog) [fogR, fogG, fogB] = HT.rgb(o.fog);
    const fs = o.fogStart === undefined ? 200 : o.fogStart, fe = o.fogEnd === undefined ? 1000 : o.fogEnd;
    if (h > 0 && w > 0) {
      const bufKey = w + "x" + h; let img = m7bufs.get(bufKey); if (!img) { img = ctx.createImageData(w, h); m7bufs.set(bufKey, img); }
      const out = new Uint32Array(img.data.buffer);
      const cx = W / 2;
      for (let yy = 0; yy < h; yy++) {
        const sy = y0 + yy;
        const dy = sy - horizon + 0.5;
        if (dy <= 0) { out.fill(0, yy * w, yy * w + w); continue; }
        const z = (camZ * focal) / dy;
        const fx = o.camX + z * ca, fy = o.camY + z * sa;
        const k = z / focal;
        const rx = -sa * k, ry = ca * k;
        let wx = fx + (x0 - cx + 0.5) * rx, wy = fy + (x0 - cx + 0.5) * ry;
        const f = fog ? HT.clamp((z - fs) / (fe - fs), 0, 1) : 0;
        const inv = 1 - f;
        const row = yy * w;
        for (let xx = 0; xx < w; xx++) {
          let tx = Math.floor(wx * scaleX) % tw, ty = Math.floor(wy * scaleX) % th;
          if (tx < 0) tx += tw; if (ty < 0) ty += th;
          let c = td[ty * tw + tx];
          if (f > 0) {
            const r = (c & 255) * inv + fogR * f, g = ((c >> 8) & 255) * inv + fogG * f, b = ((c >> 16) & 255) * inv + fogB * f;
            c = 0xff000000 | (b << 16) | (g << 8) | r;
          } else c |= 0xff000000;
          out[row + xx] = c;
          wx += rx; wy += ry;
        }
      }
      ctx.putImageData(img, x0, y0);
    }
    return {
      project(px, py, pz = 0) {
        const dx = px - o.camX, dy = py - o.camY;
        const z = dx * ca + dy * sa;
        if (z <= 0.5) return null;
        const lat = -dx * sa + dy * ca;
        const s = focal / z;
        return { x: W / 2 + lat * s, y: horizon + (camZ - pz) * s, scale: s, depth: z };
      },
    };
  };

  // isometric 2:1: x axis → right-down, y axis → left-down, z up. 1 world unit = 2 px across, 1 px down.
  HT.isoPt = (x, y, z, ox = 0, oy = 0) => [ox + (x - y) * 2, oy + (x + y) - z];
  HT.isoBox = (ctx, x, y, z, w, d, h, o = {}) => {
    const P = (a, b, c) => HT.isoPt(a, b, c, o.ox || 0, o.oy || 0);
    if (h > 0) {
      if (o.left) HT.poly(ctx, [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], o.left);
      if (o.right) HT.poly(ctx, [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], o.right);
    }
    if (o.top) HT.poly(ctx, [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], o.top);
    if (o.outline) {
      const L = (a, b) => HT.line(ctx, a[0], a[1], b[0], b[1], o.outline);
      const t0 = P(x, y, z + h), t1 = P(x + w, y, z + h), t2 = P(x + w, y + d, z + h), t3 = P(x, y + d, z + h);
      L(t0, t1); L(t1, t2); L(t2, t3); L(t3, t0);
      if (h > 0) { const b1 = P(x + w, y, z), b2 = P(x + w, y + d, z), b3 = P(x, y + d, z); L(t1, b1); L(t2, b2); L(t3, b3); L(b1, b2); L(b2, b3); }
    }
  };

  // sprite stacking: slices bottom→top, each rotated by angle and lifted by spacing px
  HT.stack = (ctx, slices, cx, cy, angle, o = {}) => {
    const sp = o.spacing || 1, sc = o.scale || 1, sub = o.sub || 1;
    for (let i = 0; i < slices.length; i++) {
      const s = slices[i];
      for (let k = 0; k < sub; k++) {
        ctx.save();
        ctx.translate(R(cx), R(cy - (i + k / sub) * sp * sc));
        ctx.rotate(angle);
        ctx.drawImage(s, R(-s.width * sc / 2), R(-s.height * sc / 2), R(s.width * sc), R(s.height * sc));
        ctx.restore();
      }
    }
  };

  HT.shake = (t, amp, freq = 20, seed = 7) => [
    R((HT.noise(t * freq, 0.5, seed) - 0.5) * 2 * amp),
    R((HT.noise(t * freq, 7.5, seed + 1) - 0.5) * 2 * amp),
  ];

  // ------------------------------------------------------------------ fx
  HT.fx = {
    fade(ctx, a, col = C.ink) { if (a <= 0) return; HT.alpha(ctx, a, () => HT.rect(ctx, 0, 0, HT.W, HT.H, col)); },
    iris(ctx, cx, cy, r, col = C.ink) {
      cx = R(cx); cy = R(cy); r = Math.max(0, r);
      ctx.fillStyle = col;
      for (let y = 0; y < HT.H; y++) {
        const dy = y + 0.5 - cy;
        if (Math.abs(dy) >= r) { ctx.fillRect(0, y, HT.W, 1); continue; }
        const half = Math.sqrt(r * r - dy * dy);
        const a = R(cx - half), b = R(cx + half);
        if (a > 0) ctx.fillRect(0, y, a, 1);
        if (b < HT.W) ctx.fillRect(b, y, HT.W - b, 1);
      }
    },
    vignette(ctx, s = 0.35) {
      const g = ctx.createRadialGradient(HT.W / 2, HT.H / 2, HT.H * 0.35, HT.W / 2, HT.H / 2, HT.W * 0.62);
      g.addColorStop(0, 'rgba(46,34,47,0)'); g.addColorStop(1, `rgba(46,34,47,${s})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, HT.W, HT.H);
    },
    scanlines(ctx, a = 0.15, col = C.ink) {
      HT.alpha(ctx, a, () => { ctx.fillStyle = col; for (let y = 0; y < HT.H; y += 2) ctx.fillRect(0, y, HT.W, 1); });
    },
  };

  // ------------------------------------------------------------------ palette quantizer (Yliluoma-style 2-colour ordered dither)
  const PR = new Int32Array(64), PG = new Int32Array(64), PB = new Int32Array(64), PU32 = new Uint32Array(64);
  HT.PAL.forEach((h, i) => { const [r, g, b] = HT.rgb(h); PR[i] = r; PG[i] = g; PB[i] = b; PU32[i] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; });
  // Yliluoma's ColorCompare: luma-weighted RGB distance + luma difference
  const cmp = (r1, g1, b1, r2, g2, b2) => {
    const l1 = (r1 * 299 + g1 * 587 + b1 * 114) / 255000, l2 = (r2 * 299 + g2 * 587 + b2 * 114) / 255000;
    const dl = l1 - l2, dr = (r1 - r2) / 255, dg = (g1 - g2) / 255, db = (b1 - b2) / 255;
    return (dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114) * 0.75 + dl * dl;
  };
  const LUT = new Int32Array(32768).fill(-1);
  const K = 8;
  let PENALTY = 0.1;
  HT.setDitherPenalty = p => { PENALTY = p; LUT.fill(-1); };
  // --- perceptual plan (default): pick the 2-colour ordered-dither mix by OKLab distance (Björn Ottosson 2020), with
  // the pair blended in LINEAR light (a dither pattern is averaged by the eye as light, not as sRGB numbers), plus
  // Yliluoma's psychovisual penalty on mixing far-apart colours. The legacy luma-weighted sRGB plan made navy→blue
  // gradients band through slate green and pale greys through tan/green/pink; this keeps every ramp in its hue.
  const lin8 = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const oklab = (lr, lg, lb, out, o) => {
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s2 = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    out[o] = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s2;
    out[o + 1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s2;
    out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s2;
  };
  const PLAB = new Float32Array(64 * 3), PLIN = new Float32Array(64 * 3);
  for (let i = 0; i < 64; i++) { PLIN[i * 3] = lin8(PR[i]); PLIN[i * 3 + 1] = lin8(PG[i]); PLIN[i * 3 + 2] = lin8(PB[i]); oklab(PLIN[i * 3], PLIN[i * 3 + 1], PLIN[i * 3 + 2], PLAB, i * 3); }
  let MIXLAB = null; // [a][b][q=1..8] → OKLab of the linear-light mix (1 − q/16)·a + (q/16)·b
  const mixTable = () => {
    MIXLAB = new Float32Array(64 * 64 * 9 * 3);
    for (let a = 0; a < 64; a++) for (let b = 0; b < 64; b++) for (let q = 1; q <= 8; q++) {
      const t = q / 16, o = ((a * 64 + b) * 9 + q) * 3;
      oklab(PLIN[a * 3] + (PLIN[b * 3] - PLIN[a * 3]) * t, PLIN[a * 3 + 1] + (PLIN[b * 3 + 1] - PLIN[a * 3 + 1]) * t, PLIN[a * 3 + 2] + (PLIN[b * 3 + 2] - PLIN[a * 3 + 2]) * t, MIXLAB, o);
    }
  };
  const KP = 10, PENP = 0.08, CWP = 1.5, OPPW = 0.6, TL = new Float32Array(3), DS = new Float32Array(64), IDX = new Int32Array(64);
  const planOK = key => {
    if (!MIXLAB) mixTable();
    const R5 = key >> 10, G5 = (key >> 5) & 31, B5 = key & 31;
    for (let i = 0; i < 64; i++) if (PR[i] >> 3 === R5 && PG[i] >> 3 === G5 && PB[i] >> 3 === B5) return i;
    oklab(lin8(R5 * 8 + 4), lin8(G5 * 8 + 4), lin8(B5 * 8 + 4), TL, 0);
    for (let i = 0; i < 64; i++) { const dl = TL[0] - PLAB[i * 3], da = TL[1] - PLAB[i * 3 + 1], db = TL[2] - PLAB[i * 3 + 2]; DS[i] = Math.sqrt(dl * dl + da * da + db * db); IDX[i] = i; }
    // partial selection sort for the KP nearest
    for (let k = 0; k < KP; k++) { let m = k; for (let j = k + 1; j < 64; j++) if (DS[IDX[j]] < DS[IDX[m]]) m = j; const tmp = IDX[k]; IDX[k] = IDX[m]; IDX[m] = tmp; }
    let best = DS[IDX[0]], plan = IDX[0];
    for (let x = 0; x < KP; x++) for (let y = 0; y < KP; y++) {
      if (x === y) continue;
      const a = IDX[x], b = IDX[y];
      const dl = PLAB[a * 3] - PLAB[b * 3], da = PLAB[a * 3 + 1] - PLAB[b * 3 + 1], db = PLAB[a * 3 + 2] - PLAB[b * 3 + 2];
      // psychovisual penalty: chroma differences cost more than lightness differences (hue noise reads as confetti),
      // and mixing opposite hues (ice + peach → "grey") costs extra
      const opp = Math.max(0, -(PLAB[a * 3 + 1] * PLAB[b * 3 + 1] + PLAB[a * 3 + 2] * PLAB[b * 3 + 2]));
      const pen = PENP * Math.sqrt(dl * dl + CWP * (da * da + db * db)) + OPPW * Math.sqrt(opp);
      if (pen >= best) continue;
      const base = (a * 64 + b) * 9 * 3;
      for (let q = 1; q <= 8; q++) {
        const o = base + q * 3, el = TL[0] - MIXLAB[o], ea = TL[1] - MIXLAB[o + 1], eb = TL[2] - MIXLAB[o + 2];
        const e = Math.sqrt(el * el + ea * ea + eb * eb) + pen;
        if (e < best) { best = e; plan = a | (b << 8) | (q << 16); }
      }
    }
    return plan;
  };
  HT.QUANT = 'oklab';
  const planYL = key => {
    const R5 = key >> 10, G5 = (key >> 5) & 31, B5 = key & 31;
    const r = R5 * 8 + 4, g = G5 * 8 + 4, b = B5 * 8 + 4;
    // palette colour inside this bucket → pure
    for (let i = 0; i < 64; i++) if (PR[i] >> 3 === R5 && PG[i] >> 3 === G5 && PB[i] >> 3 === B5) return i;
    const ds = [];
    for (let i = 0; i < 64; i++) ds.push([cmp(r, g, b, PR[i], PG[i], PB[i]), i]);
    ds.sort((a, c) => a[0] - c[0]);
    let best = ds[0][0], plan = ds[0][1];
    for (let a = 0; a < K; a++) for (let c = 0; c < K; c++) {
      if (a === c) continue;
      const ia = ds[a][1], ib = ds[c][1];
      const pen = cmp(PR[ia], PG[ia], PB[ia], PR[ib], PG[ib], PB[ib]) * PENALTY;
      if (pen >= best) continue;
      for (let q = 1; q <= 8; q++) {
        const t = q / 16;
        const mr = PR[ia] + (PR[ib] - PR[ia]) * t, mg = PG[ia] + (PG[ib] - PG[ia]) * t, mb = PB[ia] + (PB[ib] - PB[ia]) * t;
        const e = cmp(r, g, b, mr, mg, mb) + pen;
        if (e < best) { best = e; plan = ia | (ib << 8) | (q << 16); }
      }
    }
    return plan;
  };
  const plan = key => (HT.QUANT === 'yl1' ? planYL(key) : planOK(key));
  HT.setQuantMode = m => { HT.QUANT = m; LUT.fill(-1); };
  HT.quantizeWarm = () => { for (let k = 0; k < 32768; k++) if (LUT[k] < 0) LUT[k] = plan(k); };
  HT.quantize = (img) => {
    const d32 = new Uint32Array(img.data.buffer), w = img.width, h = img.height;
    const B = HT.BAYER;
    for (let y = 0; y < h; y++) {
      const brow = (y & 3) << 2, row = y * w;
      for (let x = 0; x < w; x++) {
        const p = row + x, c = d32[p];
        const key = ((c & 0xf8) << 7) | ((c >> 6) & 0x3e0) | ((c >> 19) & 0x1f);
        let e = LUT[key];
        if (e < 0) e = LUT[key] = plan(key);
        const q = e >> 16;
        d32[p] = PU32[q && B[brow + (x & 3)] < q ? (e >> 8) & 255 : e & 255];
      }
    }
    return img;
  };

  // ------------------------------------------------------------------ small bounded caches
  // HT.lru(max): Map-backed least-recently-used cache. Use it for any per-frame cache whose key space is open-ended
  // (rig drawings, text, derived sprites) so a 20-minute playthrough keeps a flat heap.
  HT.lru = (max = 32, onEvict = null) => {
    const m = new Map();
    return {
      get(k) { const v = m.get(k); if (v !== undefined) { m.delete(k); m.set(k, v); } return v; },
      set(k, v) { if (m.has(k)) m.delete(k); m.set(k, v); while (m.size > max) { const k0 = m.keys().next().value, v0 = m.get(k0); m.delete(k0); if (onEvict) onEvict(v0); } return v; },
      has(k) { return m.has(k); }, delete(k) { return m.delete(k); }, clear() { m.clear(); }, get size() { return m.size; },
    };
  };

  // ------------------------------------------------------------------ scene registry
  // A scene: { id, act, title, dur, transitionIn, init() (may return an iterator for incremental init), draw(ctx, t, T),
  //            dispose(), cues, ambience }. t = scene-local seconds, T = global film seconds.
  HT.SCENES = HT.SCENES || {};
  HT.scene = def => {
    if (!def || !def.id) throw new Error('HT.scene needs an id');
    def.cues = def.cues || []; def.ambience = def.ambience || [];
    def.transitionIn = def.transitionIn || { type: 'cut', dur: 0 };
    HT.SCENES[def.id] = def;
    return def;
  };
})();
