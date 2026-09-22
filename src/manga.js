/* DOMAIN CLASH — manga language (SPEC.md §10). Public API (details in the comments above each function):
     HT.kana.draw(ctx, str, x, y, {scale, col, col2, outline, outline2, ow, ow2, spacing, align, vertical, smooth, bold, alpha}) → width
     HT.kana.measure(str, {scale, spacing, vertical}) → {w, h}      HT.kana.has(ch), HT.kana.chars(), HT.kana.verify()
     HT.kana.sfx(ctx, str, x, y, {age, dur, size|scale, rot°, style, col, fill2, outline, outline2, ow, ow2, jitter, stagger,
                 seed, vertical, spacing, skew, bold, smooth, flash, vx, vy, alpha})   HT.kana.styleOf(str), defaultDur(e)
     HT.manga.tone(ctx, rect, {levels, auto, targets, mode, edge, paper, ink, invert, contrast, bias, gamma, ox, oy, poly}) → levels
     HT.manga.focusLines(ctx, cx, cy, {rect, n, inner, aspect, jitter, width, col, beta, betaCol, seed, t, fps})
     HT.manga.speedLines(ctx, angle°, {rect, n, len, width, col, speed, t, fps, seed, clear})
     HT.manga.panels(ctx, S, e, renderFn)   HT.shots.panels   HT.manga.layout(e, age) → polygons   HT.manga.text/textWidth
     HT.post.manga(ctx, S, e, age, dur)     HT.cards.draw(ctx, e, age, S)   HT.cards.creditsPage(ctx, t, o) / creditsInit(o)
     HT.cards.CREDIT_LINES (editable)       HT.manga.bench()

   HT.kana    hand-authored pixel katakana (7-wide × 8-row cell: base glyphs on rows 1–7, dakuten/handakuten on rows
              0–1/0–2 with the voiced base squeezed to keep a 1-px gap), static text (draw/measure) and animated
              onomatopoeia (sfx: impact | rumble | slash | ring | pop). SFX glyphs are upscaled with Scale2x/Scale3x
              (AdvanceMAME EPX rules, binary masks), emboldened, then rotated/sheared by nearest-neighbour inverse mapping
              on the 1-bit mask BEFORE the outline rings are computed — so any angle stays pixel-crisp.
   HT.manga   tone(): B/W screentone conversion (luminance → white / light dots / mid dots / 45° line tone / black, dot
              screens on a 45° lattice, screen-locked so they never crawl) + ink lines from a Sobel edge detector (only
              the dark side of an edge is inked → 1-px lines). focusLines() (集中線, incl. beta flash ベタフラッシュ) and
              speedLines() (流線) with an own span rasterizer. panels(): manga page layouts that render the world through
              the runner's renderFn once per panel into a bbox-sized canvas (the sub-camera's viewport = that canvas).
   HT.post    manga (full-frame screentone with an optional wipe-in/out and line overlays).
   HT.shots   panels (the camera returned for the 'panels' shot = panel 0's camera, used for blending).
   HT.cards   act / place / title cards and creditsPage() (the end credits as a scrolling B/W screentone manga page).
   Labs       ?lab=kana  ?lab=manga  ?lab=cards  ?lab=panels
   Everything is a pure function of its time arguments (seeded hashes only); every cache is bounded (HT.lru). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const clamp = HT.clamp, lerp = HT.lerp, hash = HT.hash;
  const floor = Math.floor, round = Math.round, abs = Math.abs, min = Math.min, max = Math.max;
  const sin = Math.sin, cos = Math.cos, PI = Math.PI, D2R = PI / 180;
  const pack = hex => { const c = HT.rgb(hex); return (0xff000000 | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0; };
  const kana = (HT.kana = HT.kana || {});
  const manga = (HT.manga = HT.manga || {});
  const cards = (HT.cards = HT.cards || {});
  HT.post = HT.post || {};
  HT.shots = HT.shots || {};
  HT.labs = HT.labs || {};
  const pw = (keys, u) => { // piecewise-linear keyframes [[u, v], ...]
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0]); }
    return keys[keys.length - 1][1];
  };
  const strSeed = s => { let h = 7; for (const ch of String(s)) h = (Math.imul(h, 31) + ch.codePointAt(0)) | 0; return h & 0xffff; };

  // ================================================================== 1. KATAKANA GLYPHS
  // K7: base glyphs (7 rows → cell rows 1..7). K8: full 8-row glyphs (voiced; marks in rows 0–1, ring rows 0–2).
  // K5: small kana 5×5 (cell rows 3..7; vertical text: shifted up-right). Stroke shapes follow standard gothic kana;
  // the easily confused pairs are separated the way print fonts do it: シ/ン ticks are shallow strokes and the long
  // stroke rises diagonally from a flat foot at the lower left; ツ/ソ ticks are steep and the long stroke drops
  // vertically from the top-right corner before curving left; ク has its bar at the very top (joined to the first
  // stroke's head), ケ's bar is lower with the first stroke poking above it, タ = ク + inner stroke; ウ = ワ + top tick,
  // フ has no left stem; ヌ = ス with a crossing stroke instead of a foot; ロ is closed, コ is open on the left.
  const K7 = {
    'ア': ['#######', '.....#.', '...##..', '...#...', '...#...', '..#....', '.#.....'],
    'イ': ['......#', '.....#.', '....#..', '..###..', '##..#..', '....#..', '....#..'],
    'ウ': ['...#...', '#######', '#.....#', '#.....#', '.....#.', '....#..', '..##...'],
    'エ': ['.......', '.#####.', '...#...', '...#...', '...#...', '...#...', '#######'],
    'オ': ['....#..', '#######', '....#..', '...##..', '..#.#..', '.#..#..', '#..##..'],
    'カ': ['..#....', '..#....', '#######', '..#...#', '..#...#', '.#....#', '#...##.'],
    'キ': ['...#...', '.#####.', '...#...', '#######', '...#...', '....#..', '....#..'],
    'ク': ['..#####', '.#....#', '#.....#', '.....#.', '....#..', '...#...', '.##....'],
    'ケ': ['..#....', '.#.....', '.######', '#...#..', '....#..', '...#...', '..#....'],
    'コ': ['.......', '#######', '......#', '......#', '......#', '......#', '#######'],
    'サ': ['.#...#.', '#######', '.#...#.', '.#...#.', '.....#.', '....#..', '..##...'],
    'シ': ['##.....', '..#...#', '##...#.', '..#..#.', '....#..', '..##...', '##.....'],
    'ス': ['#######', '......#', '.....#.', '....#..', '...#.#.', '..#...#', '##....#'],
    'セ': ['.#.....', '.#.....', '#######', '.#...#.', '.#..#..', '.#.....', '..#####'],
    'ソ': ['#.....#', '#.....#', '.#....#', '......#', '.....#.', '....#..', '..##...'],
    'タ': ['..#####', '.#....#', '#.....#', '.##..#.', '...##..', '...#...', '.##....'],
    'チ': ['....###', '.###...', '...#...', '#######', '...#...', '...#...', '.##....'],
    'ツ': ['#..#..#', '#..#..#', '.#..#.#', '......#', '.....#.', '....#..', '..##...'],
    'テ': ['.#####.', '.......', '#######', '...#...', '...#...', '..#....', '.#.....'],
    'ト': ['..#....', '..#....', '..##...', '..#.##.', '..#....', '..#....', '..#....'],
    'ナ': ['...#...', '...#...', '#######', '...#...', '...#...', '..#....', '.#.....'],
    'ニ': ['.......', '.#####.', '.......', '.......', '.......', '#######', '.......'],
    'ヌ': ['#######', '......#', '.#...#.', '..#.#..', '...#...', '..#.#..', '##...#.'],
    'ネ': ['...#...', '######.', '....#..', '...#...', '..##.#.', '.#.#..#', '...#...'],
    'ノ': ['......#', '......#', '.....#.', '.....#.', '....#..', '..##...', '##.....'],
    'ハ': ['.......', '..#.#..', '..#..#.', '.#...#.', '.#....#', '#.....#', '#......'],
    'ヒ': ['#......', '#....##', '#..##..', '###....', '#......', '#......', '.######'],
    'フ': ['#######', '......#', '......#', '.....#.', '....#..', '..##...', '##.....'],
    'ヘ': ['.......', '..#....', '.#.#...', '#...#..', '.....#.', '......#', '.......'],
    'ホ': ['...#...', '#######', '...#...', '.#.#.#.', '#..#..#', '...#...', '..##...'],
    'マ': ['#######', '......#', '.....#.', '.#..#..', '..##...', '...#...', '.......'],
    'ミ': ['####...', '....##.', '.......', '.####..', '.....#.', '#......', '.######'],
    'ム': ['..#....', '..#....', '.#.....', '.#..#..', '#....#.', '#.....#', '#######'],
    'メ': ['.....#.', '.....#.', '.##.#..', '...#...', '..#.#..', '.#...#.', '#......'],
    'モ': ['.#####.', '...#...', '#######', '...#...', '...#...', '...#...', '....###'],
    'ヤ': ['..#....', '..#....', '#######', '..#..#.', '..#.#..', '..#....', '..#....'],
    'ユ': ['.......', '.####..', '....#..', '....#..', '....#..', '#######', '.......'],
    'ヨ': ['#######', '......#', '......#', '.######', '......#', '......#', '#######'],
    'ラ': ['.#####.', '.......', '#######', '......#', '.....#.', '....#..', '.###...'],
    'リ': ['.#...#.', '.#...#.', '.#...#.', '.#...#.', '.....#.', '....#..', '..##...'],
    'ル': ['.#..#..', '.#..#..', '.#..#..', '.#..#..', '.#..#.#', '#...##.', '#...#..'],
    'レ': ['#......', '#......', '#......', '#.....#', '#....#.', '#..##..', '###....'],
    'ロ': ['.......', '#######', '#.....#', '#.....#', '#.....#', '#.....#', '#######'],
    'ワ': ['#######', '#.....#', '#.....#', '#.....#', '.....#.', '....#..', '..##...'],
    'ヲ': ['#######', '......#', '.######', '......#', '.....#.', '....#..', '.###...'],
    'ン': ['##.....', '..#...#', '.....#.', '.....#.', '....#..', '..##...', '##.....'],
  };
  const K8 = {
    'ガ': ['....#.#', '....#.#', '..#....', '#######', '..#...#', '..#...#', '.#....#', '#...##.'],
    'ギ': ['....#.#', '....#.#', '..#....', '#####..', '..#....', '#######', '..#....', '...#...'],
    'グ': ['....#.#', '....#.#', '.......', '..#####', '.#....#', '#.....#', '....##.', '..##...'],
    'ゲ': ['....#.#', '.#..#.#', '.#.....', '.######', '#...#..', '....#..', '...#...', '..#....'],
    'ゴ': ['....#.#', '....#.#', '.......', '#######', '......#', '......#', '......#', '#######'],
    'ザ': ['....#.#', '....#.#', '.......', '.#...#.', '#######', '.#...#.', '.....#.', '...##..'],
    'ジ': ['....#.#', '##..#.#', '..#....', '##....#', '..#..#.', '....#..', '..##...', '##.....'],
    'ズ': ['....#.#', '....#.#', '.......', '######.', '.....#.', '....#.#', '..##..#', '##.....'],
    'ゼ': ['....#.#', '....#.#', '.#.....', '#######', '.#...#.', '.#..#..', '.#.....', '..#####'],
    'ゾ': ['....#.#', '....#.#', '.......', '#.....#', '#.....#', '.#....#', '.....#.', '..###..'],
    'ダ': ['....#.#', '....#.#', '.......', '..#####', '.#....#', '#.#..#.', '...##..', '.##....'],
    'ヂ': ['....#.#', '....#.#', '.......', '....##.', '.###...', '#######', '...#...', '.##....'],
    'ヅ': ['....#.#', '....#.#', '.......', '#..#..#', '#..#..#', '.#....#', '.....#.', '..###..'],
    'デ': ['....#.#', '....#.#', '.......', '.#####.', '.......', '#######', '...#...', '.##....'],
    'ド': ['....#.#', '....#.#', '..#....', '..#....', '..##...', '..#.##.', '..#....', '..#....'],
    'バ': ['....#.#', '....#.#', '..#....', '..#.#..', '.#...#.', '.#...#.', '#.....#', '#.....#'],
    'ビ': ['....#.#', '....#.#', '#......', '#....##', '#..##..', '###....', '#......', '.######'],
    'ブ': ['....#.#', '....#.#', '.......', '#######', '......#', '.....#.', '...##..', '###....'],
    'ベ': ['....#.#', '....#.#', '..#....', '.#.#...', '#...#..', '.....#.', '......#', '.......'],
    'ボ': ['....#.#', '....#.#', '.......', '...#...', '#######', '.#.#.#.', '#..#..#', '..##...'],
    'パ': ['.....#.', '....#.#', '..#..#.', '..#....', '.#..#..', '.#...#.', '#.....#', '#.....#'],
    'ピ': ['.....#.', '#...#.#', '#....#.', '#......', '#...###', '####...', '#......', '.######'],
    'プ': ['.....#.', '....#.#', '.....#.', '.......', '#######', '......#', '....##.', '####...'],
    'ペ': ['.....#.', '....#.#', '..#..#.', '.#.#...', '#...#..', '.....#.', '......#', '.......'],
    'ポ': ['.....#.', '....#.#', '.....#.', '...#...', '#######', '.#.#.#.', '#..#..#', '..##...'],
    'ヴ': ['....#.#', '....#.#', '..#....', '#######', '#.....#', '.....#.', '....#..', '..##...'],
  };
  const K5 = {
    'ァ': ['#####', '...#.', '.##..', '.#...', '#....'],
    'ィ': ['....#', '...#.', '..##.', '##.#.', '...#.'],
    'ゥ': ['..#..', '#####', '#...#', '...#.', '.##..'],
    'ェ': ['.....', '.###.', '..#..', '..#..', '#####'],
    'ォ': ['...#.', '#####', '..##.', '.#.#.', '#.##.'],
    'ッ': ['#.#.#', '#.#.#', '.#..#', '...#.', '.##..'],
    'ャ': ['.#...', '#####', '.#.#.', '.#...', '.#...'],
    'ュ': ['.....', '.###.', '...#.', '...#.', '#####'],
    'ョ': ['#####', '....#', '.####', '....#', '#####'],
  };
  // punctuation / extras: full 8-row cells, optional vertical-text variant (ー and 〜 turn, … stands up)
  const KP = {
    'ー': { r: ['.......', '.......', '.......', '.......', '#######', '.......', '.......', '.......'], v: ['.......', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...'] },
    '！': { r: ['..', '##', '##', '##', '##', '##', '..', '##'] },
    '・': { r: ['...', '...', '...', '.#.', '###', '.#.', '...', '...'] },
    '？': { r: ['.....', '.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'] },
    '〜': { r: ['.......', '.......', '.......', '.##....', '#..#..#', '....##.', '.......', '.......'], v: ['.......', '...#...', '....#..', '....#..', '...#...', '..#....', '..#....', '...#...'] },
    '…': { r: ['.......', '.......', '.......', '.......', '#..#..#', '.......', '.......', '.......'], v: ['.......', '...#...', '.......', '.......', '...#...', '.......', '.......', '...#...'] },
    ' ': { r: ['...', '...', '...', '...', '...', '...', '...', '...'] },
    '　': { r: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'] },
  };
  const ALIAS = { '!': '！', '?': '？', '~': '〜', '-': 'ー', '.': '・' };
  const ROMA = ('ア a イ i ウ u エ e オ o カ ka キ ki ク ku ケ ke コ ko サ sa シ shi ス su セ se ソ so タ ta チ chi ツ tsu テ te ト to ' +
    'ナ na ニ ni ヌ nu ネ ne ノ no ハ ha ヒ hi フ fu ヘ he ホ ho マ ma ミ mi ム mu メ me モ mo ヤ ya ユ yu ヨ yo ラ ra リ ri ル ru ' +
    'レ re ロ ro ワ wa ヲ wo ン n ガ ga ギ gi グ gu ゲ ge ゴ go ザ za ジ ji ズ zu ゼ ze ゾ zo ダ da ヂ di ヅ du デ de ド do ' +
    'バ ba ビ bi ブ bu ベ be ボ bo パ pa ピ pi プ pu ペ pe ポ po ヴ vu ァ xa ィ xi ゥ xu ェ xe ォ xo ッ xtsu ャ xya ュ xyu ョ xyo ' +
    'ー - ！ ! ・ . ？ ? 〜 ~ … ...').split(' ');
  const ROMAJI = {}; for (let i = 0; i + 1 < ROMA.length; i += 2) ROMAJI[ROMA[i]] = ROMA[i + 1];

  const GLYPH = new Map(); // ch → { ch, w, bits (w×8), vbits?, small, kind }
  const bitsOf = (rows, w, y0) => { const b = new Uint8Array(w * 8); rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') b[(y + y0) * w + x] = 1; }); return b; };
  const reg = (ch, rows, y0, extra) => { const w = rows[0].length; GLYPH.set(ch, Object.assign({ ch, w, bits: bitsOf(rows, w, y0), small: false }, extra)); };
  for (const ch in K7) reg(ch, K7[ch], 1, { kind: 'base' });
  for (const ch in K8) reg(ch, K8[ch], 0, { kind: 'voiced' });
  for (const ch in K5) reg(ch, K5[ch], 3, { kind: 'small', small: true });
  for (const ch in KP) reg(ch, KP[ch].r, 0, { kind: 'punct', vbits: KP[ch].v ? bitsOf(KP[ch].v, KP[ch].v[0].length, 0) : null });
  const glyphOf = ch => GLYPH.get(ALIAS[ch] || ch) || GLYPH.get('？');
  kana.GLYPHS = GLYPH; kana.ROMAJI = ROMAJI;
  kana.has = ch => GLYPH.has(ALIAS[ch] || ch);
  kana.chars = () => [...GLYPH.keys()].filter(c => c !== ' ' && c !== '　');

  // ================================================================== 2. 1-BIT MASK OPS
  const newMask = (w, h) => ({ w, h, d: new Uint8Array(max(1, w * h)) });
  function scaleNearest(m, s) {
    if (s === 1) return m;
    const o = newMask(m.w * s, m.h * s);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.d[y * m.w + x]) for (let yy = 0; yy < s; yy++) { const i = (y * s + yy) * o.w + x * s; o.d.fill(1, i, i + s); }
    return o;
  }
  // Scale2x / Scale3x (AdvanceMAME, https://www.scale2x.it/algorithm) on binary masks: smooth diagonals, keep crisp edges
  function scale2x(m) {
    const w = m.w, h = m.h, d = m.d, o = newMask(w * 2, h * 2), W2 = w * 2;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const E = d[y * w + x], B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), Hh = at(x, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E;
      if (B !== Hh && D !== F) { e0 = D === B ? D : E; e1 = B === F ? F : E; e2 = D === Hh ? D : E; e3 = Hh === F ? F : E; }
      const i = y * 2 * W2 + x * 2;
      o.d[i] = e0; o.d[i + 1] = e1; o.d[i + W2] = e2; o.d[i + W2 + 1] = e3;
    }
    return o;
  }
  function scale3x(m) {
    const w = m.w, h = m.h, d = m.d, o = newMask(w * 3, h * 3), W3 = w * 3;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const A = at(x - 1, y - 1), B = at(x, y - 1), Cc = at(x + 1, y - 1), D = at(x - 1, y), E = d[y * w + x], F = at(x + 1, y), G = at(x - 1, y + 1), Hh = at(x, y + 1), I = at(x + 1, y + 1);
      let e0 = E, e1 = E, e2 = E, e3 = E, e5 = E, e6 = E, e7 = E, e8 = E;
      if (B !== Hh && D !== F) {
        e0 = D === B ? D : E;
        e1 = (D === B && E !== Cc) || (B === F && E !== A) ? B : E;
        e2 = B === F ? F : E;
        e3 = (D === B && E !== G) || (D === Hh && E !== A) ? D : E;
        e5 = (B === F && E !== I) || (Hh === F && E !== Cc) ? F : E;
        e6 = D === Hh ? D : E;
        e7 = (D === Hh && E !== I) || (Hh === F && E !== G) ? Hh : E;
        e8 = Hh === F ? F : E;
      }
      const i = y * 3 * W3 + x * 3;
      o.d[i] = e0; o.d[i + 1] = e1; o.d[i + 2] = e2;
      o.d[i + W3] = e3; o.d[i + W3 + 1] = E; o.d[i + W3 + 2] = e5;
      o.d[i + 2 * W3] = e6; o.d[i + 2 * W3 + 1] = e7; o.d[i + 2 * W3 + 2] = e8;
    }
    return o;
  }
  function scaleSmooth(m, s) {
    switch (s) {
      case 1: return m;
      case 2: return scale2x(m);
      case 3: return scale3x(m);
      case 4: return scale2x(scale2x(m));
      case 6: return scale2x(scale3x(m));
      case 8: return scale2x(scale2x(scale2x(m)));
      case 9: return scale3x(scale3x(m));
      default: return scaleNearest(m, s);
    }
  }
  // smooth: false = nearest blocks · true = Scale2x/3x chained up to s · 'once' = one Scale2x/3x pass, then nearest
  function scaleBits(m, s, smooth) {
    if (!smooth || s === 1) return scaleNearest(m, s);
    if (smooth === 'once') { if (s % 3 === 0) return scaleNearest(scale3x(m), s / 3); if (s % 2 === 0) return scaleNearest(scale2x(m), s / 2); return scaleNearest(m, s); }
    return scaleSmooth(m, s);
  }
  // a glyph at scale s. At s ≥ 3 (smoothed) the dakuten/handakuten are redrawn as shapes at the target resolution —
  // two slanted 〃 strokes / a true ring — because an upscaled 1-px tick reads as a small ring (゜) once outlined
  function glyphScaled(it, s, smooth) {
    const g = it.g, gm = gmask(it);
    if (!(smooth && s >= 3 && g.kind === 'voiced')) return scaleBits(gm, s, smooth);
    const base = { w: gm.w, h: 8, d: gm.d.slice() };
    for (let y = 0; y <= 2; y++) for (let x = 3; x < gm.w; x++) base.d[y * gm.w + x] = 0; // the mark zone (the squeezed base never enters it)
    const m = scaleBits(base, s, smooth);
    if (gm.d[5] && !gm.d[4]) { // handakuten ring
      const cx = 5.5 * s, cy = 1.5 * s, ro = 1.5 * s, ri = max(0.5 * s, ro - max(2, 0.72 * s));
      for (let y = 0; y < Math.ceil(3 * s); y++) for (let x = floor(3.6 * s); x < m.w; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d <= ro && d >= ri) m.d[y * m.w + x] = 1; }
    } else { // dakuten: two parallel strokes leaning like 〃
      const t = max(2, 0.9 * s);
      for (const x0 of [3.65 * s, 5.5 * s]) fillPolyMask(m, [[x0, 0], [x0 + t, 0], [x0 + t + 0.6 * s, 2.3 * s], [x0 + 0.6 * s, 2.3 * s]], 1);
    }
    return m;
  }
  function padMask(m, p) {
    const o = newMask(m.w + 2 * p, m.h + 2 * p);
    for (let y = 0; y < m.h; y++) o.d.set(m.d.subarray(y * m.w, y * m.w + m.w), (y + p) * o.w + p);
    return o;
  }
  const DISCS = [];
  const disc = r => DISCS[r] || (DISCS[r] = (() => { const a = []; const lim = r * r + (r > 1 ? r - 1 : 0); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= lim) a.push(x, y); return a; })());
  function dilate(m, r) { // disc kernel (r=1: 4-neighbour ring, the classic pixel-art outline)
    if (r <= 0) return m;
    const w = m.w, h = m.h, d = m.d, o = newMask(w, h), K = disc(r), od = o.d;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      // interior pixels (all 4 neighbours set) only need themselves
      if (x > 0 && y > 0 && x < w - 1 && y < h - 1 && d[i - 1] && d[i + 1] && d[i - w] && d[i + w]) { od[i] = 1; continue; }
      for (let k = 0; k < K.length; k += 2) { const X = x + K[k], Y = y + K[k + 1]; if (X >= 0 && Y >= 0 && X < w && Y < h) od[Y * w + X] = 1; }
    }
    return o;
  }
  // affine transform about an anchor, nearest-neighbour inverse mapping: dest - anchor' = M · (src - anchor)
  function transformMask(m, ax, ay, M, margin) {
    const a = M[0], b = M[1], c = M[2], dd = M[3], det = a * dd - b * c || 1e-6;
    const ia = dd / det, ib = -b / det, ic = -c / det, id = a / det;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const corners = [0, 0, m.w, 0, 0, m.h, m.w, m.h];
    for (let k = 0; k < 8; k += 2) { const rx = corners[k] - ax, ry = corners[k + 1] - ay, X = a * rx + b * ry, Y = c * rx + dd * ry; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    const dax = -floor(x0) + margin, day = -floor(y0) + margin;
    const ow = Math.ceil(x1) + dax + margin + 1, oh = Math.ceil(y1) + day + margin + 1;
    const o = newMask(ow, oh), src = m.d, mw = m.w, mh = m.h;
    for (let Y = 0; Y < oh; Y++) {
      const ry = Y + 0.5 - day;
      for (let X = 0; X < ow; X++) {
        const rx = X + 0.5 - dax;
        const sx = floor(ia * rx + ib * ry + ax), sy = floor(ic * rx + id * ry + ay);
        if (sx >= 0 && sy >= 0 && sx < mw && sy < mh && src[sy * mw + sx]) o.d[Y * ow + X] = 1;
      }
    }
    return { m: o, ax: dax, ay: day };
  }
  // mask + rings → sprite canvas. fill2/split: lower part of the ink in a second colour
  function colorize(m, o) {
    const r1 = o.ow > 0 && o.oc ? dilate(m, o.ow) : null, r2 = o.ow2 > 0 && o.oc2 ? dilate(r1 || m, o.ow2) : null;
    const cv = HT.canvas(m.w, m.h), img = cv.g.createImageData(m.w, m.h), out = new Uint32Array(img.data.buffer);
    const F = pack(o.fill), O1 = o.oc ? pack(o.oc) : 0, O2 = o.oc2 ? pack(o.oc2) : 0;
    let F2 = F, splitRow = 1e9;
    if (o.fill2) {
      F2 = pack(o.fill2);
      let ya = m.h, yb = -1;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.d[y * m.w + x]) { if (y < ya) ya = y; if (y > yb) yb = y; }
      splitRow = ya + (yb - ya + 1) * (o.split === undefined ? 0.55 : o.split);
    }
    const n = m.w * m.h, md = m.d;
    for (let i = 0; i < n; i++) {
      if (md[i]) out[i] = (i / m.w) >= splitRow ? F2 : F;
      else if (r1 && r1.d[i]) out[i] = O1;
      else if (r2 && r2.d[i]) out[i] = O2;
    }
    cv.g.putImageData(img, 0, 0);
    return cv.c;
  }

  // ================================================================== 3. HT.kana.draw / measure (static text)
  // layout in 1× cell units. Horizontal: advance = glyph width + spacing. Vertical (縦書き): 7-px column, advance 8 +
  // spacing, small kana move to the upper right of their cell, ー/〜/… use their vertical forms.
  function layoutStr(str, vertical, spacing) {
    const items = [];
    let x = 0, y = 0;
    for (const ch of String(str)) {
      const g = glyphOf(ch);
      if (vertical) { items.push({ g, x: floor((7 - g.w) / 2) + (g.small ? 1 : 0), y: y + (g.small ? -2 : 0), v: true }); y += 8 + spacing; }
      else { items.push({ g, x, y: 0, v: false }); x += g.w + spacing; }
    }
    return { items, w: vertical ? 7 : max(0, x - spacing), h: vertical ? max(0, y - spacing) : 8 };
  }
  const gmask = (it) => ({ w: it.g.w, h: 8, d: it.v && it.g.vbits ? it.g.vbits : it.g.bits });
  const wordCache = HT.lru(160);
  HT.caches.push({ name: 'kana words', size: () => wordCache.size });
  function buildWord(str, s, o) {
    const L = layoutStr(str, o.vertical, o.spacing);
    const P = o.bold + o.ow + o.ow2 + 1;
    const m = newMask(L.w * s + 2 * P, L.h * s + 2 * P);
    for (const it of L.items) {
      const sm = glyphScaled(it, s, o.smooth);
      const ox = P + it.x * s, oy = P + it.y * s;
      for (let y = 0; y < sm.h; y++) { const Y = oy + y; if (Y < 0 || Y >= m.h) continue; for (let x = 0; x < sm.w; x++) if (sm.d[y * sm.w + x]) { const X = ox + x; if (X >= 0 && X < m.w) m.d[Y * m.w + X] = 1; } }
    }
    const mb = o.bold ? dilate(m, o.bold) : m;
    return { c: colorize(mb, o), pad: P, w: L.w * s, h: L.h * s };
  }
  function drawOpts(o) {
    const s = max(1, round(o.scale || 1));
    const oc = o.outline || null, oc2 = o.outline2 || null;
    return {
      s, vertical: !!o.vertical, spacing: o.spacing === undefined ? 1 : o.spacing, smooth: o.smooth || false, bold: o.bold || 0,
      fill: o.col || C.white, fill2: o.col2 || null, split: o.split, oc, oc2,
      ow: oc ? (o.ow === undefined ? (s >= 3 ? 2 : 1) : o.ow) : 0, ow2: oc2 ? (o.ow2 === undefined ? 1 : o.ow2) : 0,
    };
  }
  // HT.kana.draw(ctx, str, x, y, {scale, col, col2, outline, outline2, ow, ow2, spacing, align, vertical, smooth, bold,
  //   alpha}) → drawn width in px (vertical: the column width). (x, y) = top-left of the text box, like HT.text;
  //   align 'center'|'right' anchors x (and for vertical text, 'center' also centres y).
  kana.draw = (ctx, str, x, y, o = {}) => {
    const d = drawOpts(o);
    const key = [str, d.s, d.vertical ? 1 : 0, d.spacing, String(d.smooth), d.bold, d.fill, d.fill2, d.split, d.oc, d.oc2, d.ow, d.ow2].join('|');
    let spr = wordCache.get(key);
    if (!spr) spr = wordCache.set(key, buildWord(str, d.s, d));
    let dx = round(x), dy = round(y);
    if (o.align === 'center') { dx = round(x - spr.w / 2); if (d.vertical) dy = round(y - spr.h / 2); }
    else if (o.align === 'right') dx = round(x - spr.w);
    if (o.alpha !== undefined && o.alpha < 1) { const oa = ctx.globalAlpha; ctx.globalAlpha = oa * max(0, o.alpha); ctx.drawImage(spr.c, dx - spr.pad, dy - spr.pad); ctx.globalAlpha = oa; }
    else ctx.drawImage(spr.c, dx - spr.pad, dy - spr.pad);
    return spr.w;
  };
  kana.measure = (str, o = {}) => { const s = max(1, round(o.scale || 1)), L = layoutStr(str, !!o.vertical, o.spacing === undefined ? 1 : o.spacing); return { w: L.w * s, h: L.h * s }; };

  // ================================================================== 4. HT.kana.sfx (animated onomatopoeia)
  const spriteCache = HT.lru(600);
  HT.caches.push({ name: 'kana sfx sprites', size: () => spriteCache.size });
  // one glyph at integer scale s, emboldened, sheared + rotated about its cell centre, outlined AFTER the transform
  function glyphSprite(it, s, o) {
    const rq = round(((o.rot || 0) / D2R) % 360), kq = round((o.skew || 0) * 20) / 20;
    const key = [it.g.ch, it.v ? 1 : 0, s, String(o.smooth), o.bold, rq, kq, o.fill, o.oc, o.oc2, o.ow, o.ow2, o.fill2, o.split].join('|');
    let spr = spriteCache.get(key);
    if (spr) return spr;
    const sm = glyphScaled(it, s, o.smooth);
    const P = o.bold + o.ow + o.ow2 + 1;
    let m = padMask(sm, P), ax = P + it.g.w * s / 2, ay = P + 4 * s;
    if (o.bold) m = dilate(m, o.bold);
    if (rq || kq) {
      const r = rq * D2R, cr = cos(r), sr = sin(r);
      // M = R · Shx(k): x' = x + k·y (k < 0 leans the tops right), then rotate
      const T = transformMask(m, ax, ay, [cr, cr * kq - sr, sr, sr * kq + cr], o.ow + o.ow2 + 1);
      m = T.m; ax = T.ax; ay = T.ay;
    }
    spr = { c: colorize(m, o), ax, ay };
    return spriteCache.set(key, spr);
  }
  // styles: defaults per onomatopoeia family (research: ドン/バキ = heavy impact, ゴゴゴ = menace, ザシュ = blade,
  // キィン/ギィン = metallic ring, ピキ/シュン/ヒュン/パリン/ブワッ/ゾク = lighter pops). Colours are overridable.
  const STY = {
    impact: { scale: 4, bold: 'auto', smooth: 'once', fill: C.white, outline: C.ink, outline2: C.white, ow: 'auto', ow2: 1, spacing: 0, rot: -6, dur: 1.0 },
    rumble: { scale: 3, bold: 0, smooth: true, fill: C.ink, outline: C.white, outline2: C.ink, ow: 1, ow2: 1, spacing: 1, rot: 0, dur: 2.0, jitter: 1, stagger: 0.12 },
    slash: { scale: 3, bold: 0, smooth: true, fill: C.white, outline: C.ink, outline2: C.red, ow: 1, ow2: 1, spacing: 1, rot: -8, skew: -0.3, dur: 0.9 },
    ring: { scale: 3, bold: 0, smooth: true, fill: C.white, outline: C.ink, outline2: C.ice, ow: 1, ow2: 1, spacing: 2, rot: 0, dur: 1.0 },
    pop: { scale: 2, bold: 0, smooth: true, fill: C.white, outline: C.ink, outline2: null, ow: 1, ow2: 0, spacing: 1, rot: 0, dur: 0.8, stagger: 0.05 },
  };
  kana.STYLES = STY;
  const inferStyle = s => {
    if (/^(ゴ|ド|ズ|ザ|ゾ|ゴォ)\1+/.test(s)) return 'rumble';
    if (/(ザシュ|ズバ|ザン|スパ|シュパ|ズシャ|ザク|ズバッ)/.test(s)) return 'slash';
    if (/(ィン|キン|ギン|キーン|ギーン|チン)/.test(s)) return 'ring';
    if (/^(ドン|ドゴ|ドガ|ドカ|ドッ|ドーン|バキ|ボキ|ゴッ|ガッ|ズン|ズドン|バン|ドシャ|グシャ|メキ)/.test(s)) return 'impact';
    return 'pop';
  };
  kana.styleOf = inferStyle;
  kana.defaultDur = (e) => (STY[(e && e.style) || inferStyle(String((e && e.kana) || ''))] || STY.pop).dur;
  // size: an integer scale 1..8, or (if > 8) a target cell height in px (scale = round(size / 8))
  const scaleOf = v => { v = +v || 1; return max(1, round(v > 8 ? v / 8 : v)); };
  const HIDE = { vis: false }, SHOW = { vis: true, pop: 1, dx: 0, dy: 0 };
  const F30 = t => floor(t * 30 + 1e-6);
  const jit = (k, seed, amp) => (amp > 0 ? round((hash(k, seed) - 0.5) * 2 * amp) : 0);
  const ANIM = {
    impact(age, dur, n, seed, o) { // pop-in overshoot (integer scales 2→5→4), decaying shake, 1 inverted flash frame, fade
      const pop = pw([[0, 0.55], [0.034, 1.35], [0.067, 1.18], [0.1, 0.94], [0.14, 1]], age);
      const sh = age < 0.3 ? 2.2 * (1 - age / 0.3) : 0, f = F30(age), out = clamp((dur - age) / 0.2, 0, 1);
      return { pop, dx: jit(f * 2, seed, sh), dy: jit(f * 2 + 1, seed, sh) - round((1 - out) * 4), alpha: out, inv: o.flash !== false && age < 1 / 30, glyph: () => SHOW };
    },
    rumble(age, dur, n, seed, o, st) { // glyphs arrive one by one, then jitter on 2s (12 fps)
      const stag = o.stagger !== undefined ? o.stagger : st.stagger, j = o.jitter !== undefined ? o.jitter : st.jitter;
      const f12 = floor(age * 12 + 1e-6), out = clamp((dur - age) / 0.3, 0, 1);
      return { pop: 1, dx: 0, dy: 0, alpha: out, glyph: i => { const ti = age - i * stag; if (ti < 0) return HIDE; return { vis: true, pop: pw([[0, 0.5], [0.05, 1.25], [0.1, 1]], ti), dx: jit(f12 * 31 + i * 2, seed, j), dy: jit(f12 * 31 + i * 2 + 1, seed, j) }; } };
    },
    slash(age, dur, n, seed, o) { // slanted, wiped in along the blade with a streak; exits by splitting along a cut
      const exitT = min(0.32, dur * 0.4), u = clamp((age - (dur - exitT)) / exitT, 0, 1);
      return { pop: 1, dx: 0, dy: 0, alpha: 1 - clamp((u - 0.45) / 0.55, 0, 1), split: HT.E.inOutQuad(u), streak: age < 0.16 ? age / 0.16 : 0,
        glyph: i => { const ti = age - i * 0.03; if (ti < 0) return HIDE; const k = 1 - HT.E.outCubic(clamp(ti / 0.08, 0, 1)); return { vis: true, pop: 1, dx: -round(k * 14), dy: 0 }; } };
    },
    ring(age, dur, n, seed, o) { // instant, a 2-frame ice flash, a high-frequency decaying vibration, twinkling glints
      const out = clamp((dur - age) / 0.25, 0, 1), amp = 2.4 * Math.exp(-age * 5);
      return { pop: 1, dx: 0, dy: 0, alpha: out, glint: true,
        glyph: i => ({ vis: true, pop: 1, dx: round(sin(age * 2 * PI * 14 + i * 1.3) * amp), dy: 0, fill: age < 2 / 30 ? C.ice : undefined }) };
    },
    pop(age, dur, n, seed, o, st) { // bouncy per-glyph pop with a playful tilt, shrinks away
      const stag = o.stagger !== undefined ? o.stagger : st.stagger, out = clamp((dur - age) / 0.12, 0, 1);
      return { pop: 1, dx: 0, dy: 0, alpha: 1, glyph: i => { const ti = age - i * stag; if (ti < 0) return HIDE; return { vis: true, pop: pw([[0, 0.35], [0.05, 1.3], [0.09, 0.9], [0.13, 1]], ti) * out, rot: (hash(i, seed) - 0.5) * 14 * D2R }; } };
    },
  };
  let sfxTmp = null;
  // HT.kana.sfx(ctx, str, x, y, {age, dur, size|scale, rot (degrees), style, col|fill, fill2, outline, outline2, ow, ow2,
  //   jitter, stagger, seed, vertical, spacing, skew, bold, smooth, flash, vx, vy (drift px/s), alpha}) — (x, y) = centre.
  kana.sfx = (ctx, str, x, y, o = {}) => {
    str = String(str);
    const style = STY[o.style] ? o.style : inferStyle(str), st = STY[style];
    const age = o.age || 0, dur = o.dur || st.dur;
    if (age < 0 || age > dur || !str) return null;
    const s = scaleOf(o.size !== undefined ? o.size : o.scale !== undefined ? o.scale : st.scale);
    const L = layoutStr(str, !!o.vertical, o.spacing !== undefined ? o.spacing : st.spacing);
    const seed = o.seed !== undefined ? o.seed : (strSeed(str) + round((o.t || 0) * 100)) & 0xffff;
    const rot = (o.rot !== undefined ? o.rot : st.rot) * D2R, skew = o.skew !== undefined ? o.skew : (st.skew || 0), cr = cos(rot), sr = sin(rot);
    const fill = o.col || o.fill || st.fill;
    const oc = o.outline === undefined ? st.outline : o.outline, oc2 = o.outline2 === undefined ? st.outline2 : o.outline2;
    const A = ANIM[style](age, dur, L.items.length, seed, o, st);
    const alpha = (o.alpha === undefined ? 1 : o.alpha) * A.alpha;
    if (alpha <= 0.01) return null;
    const bx = x + (o.vx || 0) * age + A.dx, by = y + (o.vy || 0) * age + A.dy;
    const draws = [];
    for (let i = 0; i < L.items.length; i++) {
      const it = L.items[i], gi = A.glyph(i);
      if (!gi.vis) continue;
      const se = round(s * A.pop * gi.pop);
      if (se < 1) continue;
      const ps = s * A.pop; // positions follow the word-level pop only
      const lx = (it.x + it.g.w / 2 - L.w / 2) * ps + (gi.dx || 0), ly = (it.y + 4 - L.h / 2) * ps + (gi.dy || 0);
      const X = bx + lx * cr - ly * sr, Y = by + lx * sr + ly * cr;
      const bold = o.bold !== undefined ? o.bold : st.bold === 'auto' ? floor(se / 3) : st.bold;
      const ow = oc ? (o.ow !== undefined ? o.ow : st.ow === 'auto' ? (se >= 3 ? 2 : 1) : st.ow) : 0, ow2 = oc2 ? (o.ow2 !== undefined ? o.ow2 : st.ow2) : 0;
      const inv = A.inv;
      const gf = gi.fill || fill;
      const spr = glyphSprite(it, se, { smooth: o.smooth !== undefined ? o.smooth : st.smooth, bold, rot: rot + (gi.rot || 0), skew,
        fill: inv ? (oc || C.ink) : gf, oc: inv ? gf : oc, oc2: inv ? (oc || C.ink) : oc2, ow, ow2, fill2: inv ? null : (o.fill2 || null), split: o.split });
      draws.push([spr, X, Y]);
    }
    const oa = ctx.globalAlpha;
    ctx.globalAlpha = oa * alpha;
    if (A.split > 0 && draws.length) splitDraw(ctx, draws, bx, by, rot, A.split);
    else for (const d of draws) ctx.drawImage(d[0].c, round(d[1] - d[0].ax), round(d[2] - d[0].ay));
    ctx.globalAlpha = oa;
    const ww = L.w * s, wh = L.h * s;
    if (A.streak > 0) { // the blade's path: a white hairline with an ink edge, growing across the word
      const L0 = -ww * 0.7, L1 = ww * 0.7, sl = -0.35, p = HT.E.outCubic(A.streak);
      const ex = L0 + (L1 - L0) * p, P0 = [bx + L0 * cr - (-L0 * sl) * sr, by + L0 * sr + (-L0 * sl) * cr], P1 = [bx + ex * cr - (-ex * sl) * sr, by + ex * sr + (-ex * sl) * cr];
      HT.thick(ctx, P0[0], P0[1], P1[0], P1[1], 3, C.ink); HT.line(ctx, P0[0], P0[1], P1[0], P1[1], C.white);
    }
    if (A.glint) {
      const k = pw([[0, 0], [0.05, 1], [0.3, 0.7], [0.6, 0]], age) * (0.75 + 0.25 * sin(age * 40)), r = round(4 * k * max(1, s / 3));
      if (r > 0) { sparkle(ctx, bx + ww / 2 + 3, by - wh / 2 + 2, r); sparkle(ctx, bx - ww / 2 - 2, by + wh / 2 - 3, max(1, r - 2)); }
    }
    return { w: ww, h: wh };
  };
  function sparkle(ctx, x, y, r) {
    x = round(x); y = round(y);
    HT.rect(ctx, x - r, y, r * 2 + 1, 1, C.ice); HT.rect(ctx, x, y - r, 1, r * 2 + 1, C.ice);
    HT.rect(ctx, x - max(0, r - 2), y, max(0, r - 2) * 2 + 1, 1, C.white); HT.rect(ctx, x, y - max(0, r - 2), 1, max(0, r - 2) * 2 + 1, C.white);
  }
  // the slash exit: compose the word, then draw it as two halves sliding apart along a cut through its centre
  function splitDraw(ctx, draws, cx, cy, rot, u) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [spr, X, Y] of draws) { const a = round(X - spr.ax), b = round(Y - spr.ay); x0 = min(x0, a); y0 = min(y0, b); x1 = max(x1, a + spr.c.width); y1 = max(y1, b + spr.c.height); }
    const w = x1 - x0, h = y1 - y0;
    if (!sfxTmp || sfxTmp.c.width < w || sfxTmp.c.height < h) sfxTmp = HT.canvas(max(w, sfxTmp ? sfxTmp.c.width : 0), max(h, sfxTmp ? sfxTmp.c.height : 0));
    const g = sfxTmp.g; g.clearRect(0, 0, w, h);
    for (const [spr, X, Y] of draws) g.drawImage(spr.c, round(X - spr.ax) - x0, round(Y - spr.ay) - y0);
    const a = rot - 18 * D2R, ta = Math.tan(a), d = u * 9, ux = round(cos(a) * d), uy = round(sin(a) * d), sep = round(u * 2);
    const lcx = cx - x0, lcy = cy - y0;
    for (let x = 0; x < w; x++) {
      const cut = clamp(round(lcy + ta * (x + 0.5 - lcx)), 0, h);
      if (cut > 0) ctx.drawImage(sfxTmp.c, x, 0, 1, cut, x0 + x + ux, y0 + uy - sep, 1, cut);
      if (cut < h) ctx.drawImage(sfxTmp.c, x, cut, 1, h - cut, x0 + x - ux, y0 + cut - uy + sep, 1, h - cut);
    }
  }

  // ================================================================== 5. SCREENTONE — HT.manga.tone(ctx, rect, o)
  // 8×8 screen-locked tiles on a 45° lattice (dot centres (2,2),(6,6) → spacing 4√2 ≈ 5.7 px; 45° is the standard
  // monochrome screen angle, 10–60 % the usual manga tone range):
  //   4 white 0 % · 3 light dots 15.6 % (5-px plus dots) · 2 mid dots 28 % (3×3 dots) · 1 dark 45° line tone 50 %
  //   (fine hatching, 2.8 px pitch) · 0 solid black. mode 'halftone' = the same lattice as a clustered-dot threshold
  //   matrix (continuous gradation).
  const TILES = (() => {
    const per = v => min(v, 8 - v);
    const near = (x, y) => { let b = 99; for (const [cx, cy] of [[2, 2], [6, 6]]) b = min(b, per(abs(x - cx)) + per(abs(y - cy))); return b; };
    const T = f => { const a = new Uint8Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) a[y * 8 + x] = f(x, y) ? 1 : 0; return a; };
    const cheb = (x, y) => { let b = 99; for (const [cx, cy] of [[2, 2], [6, 6]]) b = min(b, max(per(abs(x - cx)), per(abs(y - cy)))); return b; };
    return [T(() => 1), T((x, y) => ((x + y) & 3) < 2), T((x, y) => cheb(x, y) <= 1), T((x, y) => near(x, y) <= 1), T(() => 0)];
  })();
  const THR = (() => { // clustered-dot rank matrix, both dots grow ring by ring
    const cells = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let best = 1e9, k = 0;
      [[2, 2], [6, 6]].forEach(([cx, cy], j) => { let dx = abs(x - cx), dy = abs(y - cy); dx = min(dx, 8 - dx); dy = min(dy, 8 - dy); const d = dx * dx + dy * dy; if (d < best) { best = d; k = j; } });
      cells.push({ i: y * 8 + x, d: best, k, a: Math.atan2(y - 3.5, x - 3.5) });
    }
    cells.sort((p, q) => p.d - q.d || p.a - q.a || p.k - q.k);
    const thr = new Uint8Array(64); cells.forEach((c, r) => { thr[c.i] = r; });
    return thr;
  })();
  manga.TILES = TILES; manga.THR = THR;
  manga.TONE = { levels: [42, 80, 120, 172], edge: 250, auto: 0.65, targets: [0.1, 0.3, 0.52, 0.75] };
  const toneCfgs = HT.lru(24);
  const paperOf = p => (p === 'cream' ? C.cream : p === 'white' || !p ? C.white : p === 'black' ? C.ink : p);
  function toneCfg(o) {
    const lv = o.levels || manga.TONE.levels, mode = o.mode || 'levels', paper = paperOf(o.paper), ink = o.ink || C.ink, inv = !!o.invert;
    const contrast = o.contrast === undefined ? 1 : o.contrast, bias = o.bias || 0, gamma = o.gamma || 1;
    const key = [lv.join(','), mode, paper, ink, inv, contrast, bias, gamma].join('|');
    let c = toneCfgs.get(key);
    if (c) return c;
    const I = pack(inv ? paper : ink), P = pack(inv ? ink : paper), LUT = new Uint32Array(256 * 64);
    for (let L = 0; L < 256; L++) {
      let v = clamp((L - 128) * contrast + 128 + bias, 0, 255);
      if (gamma !== 1) v = 255 * Math.pow(v / 255, gamma);
      if (mode === 'halftone') {
        const cov = v <= lv[0] ? 1 : v >= lv[3] ? 0 : 1 - (v - lv[0]) / (lv[3] - lv[0]), n = round(cov * 64);
        for (let p = 0; p < 64; p++) LUT[L * 64 + p] = THR[p] < n ? I : P;
      } else {
        const T = TILES[v < lv[0] ? 0 : v < lv[1] ? 1 : v < lv[2] ? 2 : v < lv[3] ? 3 : 4];
        for (let p = 0; p < 64; p++) LUT[L * 64 + p] = T[p] ? I : P;
      }
    }
    c = { LUT, INK: I, PAPER: P };
    return toneCfgs.set(key, c);
  }
  let LBUF = new Uint8Array(0);
  const HIST = new Uint32Array(256);
  // auto-levels: move the 4 thresholds toward the luminance percentiles `targets` of this region (a manga-like tone
  // distribution whatever the scene's exposure), blended by `auto` (0 = fixed levels), quantized to 4-unit steps so
  // tone boundaries don't shimmer from frame to frame, kept monotonic with ≥ 8-unit gaps
  function autoLevels(base, auto, targets, n) {
    const out = [], want = targets.map(f => f * n);
    let acc = 0, k = 0;
    for (let L = 0; L < 256 && k < 4; L++) { acc += HIST[L]; while (k < 4 && acc >= want[k]) out[k++] = L + 1; }
    while (k < 4) out[k++] = 255;
    const lv = base.map((b, i) => round(lerp(b, out[i], auto) / 4) * 4);
    for (let i = 1; i < 4; i++) lv[i] = max(lv[i], lv[i - 1] + 8);
    return lv;
  }
  let SPANS = new Int32Array(0);
  function polySpans(poly, x0, y0, w, h) { // per-row [xa, xb) of a convex polygon, relative to the rect, padded 2 px
    if (SPANS.length < h * 2) SPANS = new Int32Array(h * 2);
    for (let y = 0; y < h; y++) {
      const sy = y0 + y + 0.5; let a = Infinity, b = -Infinity;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const yi = poly[i][1], yj = poly[j][1]; if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) { const x = poly[i][0] + (sy - yi) / (yj - yi) * (poly[j][0] - poly[i][0]); if (x < a) a = x; if (x > b) b = x; } }
      SPANS[y * 2] = a === Infinity ? 0 : max(0, floor(a - x0) - 2); SPANS[y * 2 + 1] = a === Infinity ? 0 : min(w, Math.ceil(b - x0) + 2);
    }
    return SPANS;
  }
  // rect: [x, y, w, h] | {x, y, w, h} | null (whole canvas). o: {poly (skip pixels outside this convex polygon),
  //   levels [4 luminance thresholds], auto (0..1, default
  //   0.65), targets [4 cumulative fractions], mode 'levels'|'halftone', edge (Sobel |gx|+|gy| threshold, 0 = off),
  //   paper ('white'|'cream'|hex), ink, invert, contrast, bias, gamma, ox, oy (extra pattern offset = this canvas's
  //   origin on screen, so panel tones stay locked to the frame grid)} → the levels used
  manga.tone = (ctx, rect, o = {}) => {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    let x0 = 0, y0 = 0, w = cw, h = ch;
    if (Array.isArray(rect)) [x0, y0, w, h] = rect; else if (rect) { x0 = rect.x || 0; y0 = rect.y || 0; w = rect.w === undefined ? cw : rect.w; h = rect.h === undefined ? ch : rect.h; }
    x0 = max(0, floor(x0)); y0 = max(0, floor(y0)); w = min(cw - x0, floor(w)); h = min(ch - y0, floor(h));
    if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(x0, y0, w, h), d = new Uint32Array(img.data.buffer), n = w * h;
    // luminance into a buffer padded by 1 px on every side (borders replicated) → no clamping in the Sobel loop
    const pw2 = w + 2, np = pw2 * (h + 2);
    if (LBUF.length < np) LBUF = new Uint8Array(np);
    const L = LBUF;
    const auto = o.auto === undefined ? manga.TONE.auto : o.auto;
    HIST.fill(0);
    for (let y = 0, si = 0; y < h; y++) {
      let di = (y + 1) * pw2 + 1;
      for (let x = 0; x < w; x++, si++, di++) { const c = d[si], v = ((c & 255) * 77 + ((c >>> 8) & 255) * 150 + ((c >>> 16) & 255) * 29) >>> 8; L[di] = v; HIST[v]++; }
      L[(y + 1) * pw2] = L[(y + 1) * pw2 + 1]; L[(y + 1) * pw2 + w + 1] = L[(y + 1) * pw2 + w];
    }
    L.copyWithin(0, pw2, 2 * pw2); L.copyWithin((h + 1) * pw2, h * pw2, (h + 1) * pw2);
    const levels = auto > 0 ? autoLevels(o.levels || manga.TONE.levels, auto, o.targets || manga.TONE.targets, n) : (o.levels || manga.TONE.levels);
    const cfg = toneCfg(auto > 0 ? Object.assign({}, o, { levels }) : o), LUT = cfg.LUT, INK = cfg.INK;
    const eth = o.edge === undefined ? manga.TONE.edge : (o.edge || 0);
    const ox = ((o.ox || 0) + x0) & 7, oy = (o.oy || 0) + y0;
    const spans = o.poly ? polySpans(o.poly, x0, y0, w, h) : null; // optional: only pixels inside a convex polygon (canvas coords)
    for (let y = 0; y < h; y++) {
      const prow = ((y + oy) & 7) << 3;
      let xa = 0, xb = w;
      if (spans) { xa = spans[y * 2]; xb = spans[y * 2 + 1]; if (xb <= xa) continue; }
      let i = (y + 1) * pw2 + 1 + xa, oi = y * w + xa;
      if (eth > 0) {
        for (let x = xa; x < xb; x++, i++, oi++) {
          const e = L[i], a = L[i - pw2 - 1], b = L[i - pw2], c = L[i - pw2 + 1], dl = L[i - 1], dr = L[i + 1], g = L[i + pw2 - 1], hh = L[i + pw2], k = L[i + pw2 + 1];
          let gx = c + 2 * dr + k - a - 2 * dl - g, gy = g + 2 * hh + k - a - 2 * b - c;
          if (gx < 0) gx = -gx;
          if (gy < 0) gy = -gy;
          // ink only the darker side of an edge → 1-px lines
          d[oi] = gx + gy > eth && 12 * e <= a + 2 * b + c + 2 * dl + 2 * dr + g + 2 * hh + k ? INK : LUT[(e << 6) | prow | ((x + ox) & 7)];
        }
      } else for (let x = xa; x < xb; x++, i++, oi++) d[oi] = LUT[(L[i] << 6) | prow | ((x + ox) & 7)];
    }
    ctx.putImageData(img, x0, y0);
    return levels;
  };

  // ================================================================== 6. SPEED LINES — own span rasterizer, one putImageData
  const layers = HT.lru(6);
  HT.caches.push({ name: 'manga line layers', size: () => layers.size });
  function layer(w, h) {
    w = max(1, round(w)); h = max(1, round(h));
    const key = w + 'x' + h;
    let L = layers.get(key);
    if (!L) { const cv = HT.canvas(w, h), img = cv.g.createImageData(w, h); L = layers.set(key, { w, h, cv, img, d: new Uint32Array(img.data.buffer) }); }
    L.d.fill(0); L.clip = null;
    return L;
  }
  const inClip = (c, x, y) => { const dx = (x + 0.5 - c.x) / c.rx, dy = (y + 0.5 - c.y) / c.ry; return dx * dx + dy * dy < 1; };
  const xsBuf = [];
  function lpoly(L, pts, col) { // pixel-centre scanline fill (HT.poly's rule), clipped to the layer and an exclusion ellipse
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const ya = max(0, Math.ceil(y0 - 0.5)), yb = min(L.h - 1, floor(y1 - 0.5)), n = pts.length, xs = xsBuf, clip = L.clip;
    for (let y = ya; y <= yb; y++) {
      const sy = y + 0.5; xs.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) { const yi = pts[i][1], yj = pts[j][1]; if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) xs.push(pts[i][0] + (sy - yi) / (yj - yi) * (pts[j][0] - pts[i][0])); }
      if (xs.length < 2) continue;
      if (xs.length > 2) xs.sort((a, b) => a - b); else if (xs[0] > xs[1]) { const t = xs[0]; xs[0] = xs[1]; xs[1] = t; }
      const row = y * L.w;
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = max(0, Math.ceil(xs[k] - 0.5)), b = min(L.w - 1, floor(xs[k + 1] - 0.5));
        if (b < a) continue;
        if (clip) { for (let x = a; x <= b; x++) if (!inClip(clip, x, y)) L.d[row + x] = col; }
        else L.d.fill(col, row + a, row + b + 1);
      }
    }
  }
  function lline(L, x0, y0, x1, y1, col) {
    x0 = round(x0); y0 = round(y0); x1 = round(x1); y1 = round(y1);
    const dx = abs(x1 - x0), dy = -abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (x0 >= 0 && y0 >= 0 && x0 < L.w && y0 < L.h && !(L.clip && inClip(L.clip, x0, y0))) L.d[y0 * L.w + x0] = col;
      if ((x0 === x1 && y0 === y1) || ++n > 6000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  const lflush = (ctx, L, x, y) => { L.cv.g.putImageData(L.img, 0, 0); ctx.drawImage(L.cv.c, round(x), round(y)); };
  const rectOf = (ctx, r) => (r ? (Array.isArray(r) ? r : [r.x, r.y, r.w, r.h]) : [0, 0, ctx.canvas.width, ctx.canvas.height]).map(round);
  // 集中線 focus lines toward (cx, cy). o: {rect, n (lines), inner (clear radius px), aspect (x stretch of the clear
  //   zone), jitter (0..1 inner-radius variation), width (max base width px), col, beta (ベタフラッシュ: outside filled with
  //   betaCol, lines in col (white)), seed, t + fps (lines re-seeded on 2s/3s; fps 0 = static)}
  manga.focusLines = (ctx, cx, cy, o = {}) => {
    const [rx, ry, rw, rh] = rectOf(ctx, o.rect);
    const L = layer(rw, rh), lcx = cx - rx, lcy = cy - ry;
    const fps = o.fps === undefined ? 8 : o.fps, seed = ((o.seed || 1) * 131 + (fps ? floor((o.t || 0) * fps + 1e-6) : 0) * 7919) | 0;
    const n = o.n || 96, inner = o.inner || min(rw, rh) * 0.36, asp = o.aspect || (rw > rh * 1.3 ? 1.45 : 1), jt = o.jitter === undefined ? 0.35 : o.jitter;
    const R = Math.hypot(rw, rh) * 1.3, maxW = o.width || 6;
    const beta = !!o.beta, col = pack(o.col || (beta ? C.white : C.ink));
    const radii = [];
    for (let k = 0; k < n; k++) radii.push(inner * (1 + (hash(k * 3 + 1, seed) - 0.5) * 2 * jt));
    const ang = k => (k + (hash(k * 3, seed) - 0.5) * 0.9) / n * 2 * PI;
    if (beta) { // solid black outside a jagged star, the inside left clear
      L.d.fill(pack(o.betaCol || C.ink));
      const star = [];
      for (let k = 0; k < n; k++) { const a = ang(k), r = radii[k] * 0.98, a2 = (ang(k) + ang((k + 1) % n + (k + 1 === n ? n : 0))) / 2, r2 = min(radii[k], radii[(k + 1) % n]) * 1.06; star.push([lcx + cos(a) * r * asp, lcy + sin(a) * r]); star.push([lcx + cos(a2) * r2 * asp, lcy + sin(a2) * r2]); }
      lpoly(L, star, 0);
    }
    for (let k = 0; k < n; k++) {
      const a = ang(k), ca = cos(a), sa = sin(a), ri = radii[k] * (beta ? 1.04 : 1);
      const hw = maxW * (0.2 + 0.8 * Math.pow(hash(k * 3 + 2, seed), 2)) / 2;
      const tip = [lcx + ca * ri * asp, lcy + sa * ri], bx = lcx + ca * R * asp, by = lcy + sa * R;
      const px = -sa, py = ca * asp, pl = Math.hypot(px, py) || 1;
      lpoly(L, [tip, [bx + px / pl * hw * 2.2, by + py / pl * hw * 2.2], [bx - px / pl * hw * 2.2, by - py / pl * hw * 2.2]], col);
    }
    lflush(ctx, L, rx, ry);
  };
  // 流線 parallel speed lines. angle in degrees (0 = streaming horizontally). o: {rect, n, len [min, max] (fraction
  //   of the rect diagonal), width (max px), col, speed (px/s along the angle), t, fps (default 12), seed,
  //   clear: {x, y, rx, ry} (screen coords; lines are cut around a subject)}
  manga.speedLines = (ctx, angle, o = {}) => {
    const [rx, ry, rw, rh] = rectOf(ctx, o.rect);
    const L = layer(rw, rh);
    const a = (angle || 0) * D2R, dx = cos(a), dy = sin(a), px = -dy, py = dx;
    const fps = o.fps === undefined ? 12 : o.fps, tq = fps ? floor((o.t || 0) * fps + 1e-6) / fps : (o.t || 0);
    const n = o.n || 70, D = Math.hypot(rw, rh), seed = (o.seed || 3) | 0, col = pack(o.col || C.ink);
    const lmin = o.len ? o.len[0] : 0.18, lmax = o.len ? o.len[1] : 0.6, maxW = o.width || 3, speed = o.speed === undefined ? 900 : o.speed;
    if (o.clear) L.clip = { x: o.clear.x - rx, y: o.clear.y - ry, rx: o.clear.rx || 60, ry: o.clear.ry || o.clear.rx || 60 };
    for (let i = 0; i < n; i++) {
      const p = (hash(i * 5, seed) - 0.5) * D, len = D * (lmin + (lmax - lmin) * hash(i * 5 + 1, seed));
      const w = 1 + floor(Math.pow(hash(i * 5 + 2, seed), 3) * maxW), span = D + len;
      const along = ((hash(i * 5 + 3, seed) * span + speed * tq * (0.7 + 0.6 * hash(i * 5 + 4, seed))) % span) - span / 2;
      const cxl = rw / 2 + dx * along + px * p, cyl = rh / 2 + dy * along + py * p;
      const hx = dx * len / 2, hy = dy * len / 2;
      if (w <= 1) lline(L, cxl - hx, cyl - hy, cxl + hx, cyl + hy, col);
      else {
        const qx = px * w / 2, qy = py * w / 2;
        lpoly(L, [[cxl - hx, cyl - hy], [cxl - hx * 0.4 + qx, cyl - hy * 0.4 + qy], [cxl + hx * 0.4 + qx, cyl + hy * 0.4 + qy], [cxl + hx, cyl + hy], [cxl + hx * 0.4 - qx, cyl + hy * 0.4 - qy], [cxl - hx * 0.4 - qx, cyl - hy * 0.4 - qy]], col);
      }
    }
    lflush(ctx, L, rx, ry);
  };

  // ================================================================== 7. HT.post.manga — full-frame screentone
  // e: {in (wipe-in s, default 0.18), out (wipe-out s), wipe 'diag'|'left'|'iris'|'none', x, y (iris centre), tone
  //   options (levels, mode, edge, paper, invert… or e.tone = {...}), focus: [x, y] | 'who.head' (world ref) | true,
  //   beta, speed (angle deg), lines: {...focus/speed options}}
  let postBuf = null;
  function overlays(g, S, e, age) {
    const lo = Object.assign({ t: age, seed: (e.seed || 0) + 7 }, e.lines || {});
    if (e.focus || e.beta) {
      let fx = g.canvas.width / 2, fy = g.canvas.height / 2;
      if (Array.isArray(e.focus) && e.focus.length === 2) { fx = e.focus[0]; fy = e.focus[1]; }
      else if (e.focus && e.focus !== true && S && S.pt && S.project) { const p = S.pt(e.focus), q = S.project(p[0], p[1], p[2]); if (q) { fx = q.x; fy = q.y; } }
      manga.focusLines(g, fx, fy, Object.assign({ beta: !!e.beta }, lo));
    }
    if (e.speed !== undefined && e.speed !== false) manga.speedLines(g, e.speed === true ? 0 : e.speed, lo);
  }
  function wipeBlit(ctx, src, p, kind, e) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height, q = HT.E.inOutQuad(clamp(p, 0, 1));
    if (kind === 'iris') {
      const cx = e.x === undefined ? cw / 2 : e.x, cy = e.y === undefined ? ch / 2 : e.y, r = q * Math.hypot(cw, ch) * 0.62;
      for (let y = 0; y < ch; y++) { const dy = y + 0.5 - cy; if (abs(dy) >= r) continue; const hw = Math.sqrt(r * r - dy * dy), a = max(0, round(cx - hw)), b = min(cw, round(cx + hw)); if (b > a) { ctx.drawImage(src, a, y, b - a, 1, a, y, b - a, 1); if (a > 0) HT.rect(ctx, a - 1, y, 1, 1, C.ink); if (b < cw) HT.rect(ctx, b, y, 1, 1, C.ink); } }
      return;
    }
    const slope = kind === 'left' ? 0 : 0.5, span = cw + ch * slope;
    for (let y = 0; y < ch; y++) {
      const ex = round(q * (span + 4) - (ch - y) * slope);
      if (ex > 0) ctx.drawImage(src, 0, y, min(ex, cw), 1, 0, y, min(ex, cw), 1);
      if (ex > -2 && ex < cw) HT.rect(ctx, ex, y, 2, 1, C.ink);
    }
  }
  HT.post.manga = (ctx, S, e, age, dur) => {
    const tin = e.in === undefined ? 0.18 : e.in, tout = e.out || 0;
    let p = tin > 0 ? clamp(age / tin, 0, 1) : 1;
    if (tout > 0) p = min(p, clamp((dur - age) / tout, 0, 1));
    if (p <= 0) return;
    const opts = e.tone && typeof e.tone === 'object' ? Object.assign({}, e, e.tone) : e;
    if (p >= 1 || e.wipe === 'none') { manga.tone(ctx, null, opts); overlays(ctx, S, e, age); return; }
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    if (!postBuf || postBuf.c.width !== cw || postBuf.c.height !== ch) postBuf = HT.canvas(cw, ch);
    postBuf.g.drawImage(ctx.canvas, 0, 0);
    manga.tone(postBuf.g, null, opts);
    overlays(postBuf.g, S, e, age);
    wipeBlit(ctx, postBuf.c, p, e.wipe || 'diag', e);
  };

  // ================================================================== 8. PANELS — HT.manga.panels(ctx, S, e, renderFn)
  // Layouts (panel index = reading order, manga-style right-to-left then top-to-bottom):
  //   split2  two panels, slanted vertical gutter           diag    two worlds, full bleed, strong diagonal (e.split
  //   split3  wide top panel + two below                             may be keyframed [[t, 0..1], ...] → territory war)
  //   grid4   2×2, alternating gutter slants                 strip3v three vertical strips
  //   inset   one big panel + small insets (p.rect [x,y,w,h], fractions of the page if ≤ 1)
  //   any panel may give its own p.poly ([[x,y],...] px, or fractions of the page if all |v| ≤ 1).
  // e: {layout, panels, margin, gutter, border, page ('white'|'black'|'cream'|hex), ink, bleed, slant, split, top, dir}
  // p: {shot: {shot:'medium', ...HT.shots params}, bust (merged into a closeup shot), zoom, focus (world ref centred in
  //   the panel), pan [dx, dy], tone (true | tone options), bg (hex | 'white'|'black'|'focus'|'beta'|'speed'|'grad'),
  //   lines ({type:'focus'|'beta'|'speed', x, y, angle, ...}), grade ({col, mode:'color'|'multiply'|..., alpha}),
  //   draw(g, S, info) hook, world:false, slamAt (s after e.t), slam:false, from ('top'|'left'|'right'|'bottom'),
  //   pre:'frame', kana: [{kana, x, y (fractions of the panel box or px), t, dur, size, rot, style, ...}]}
  const panelPool = HT.lru(12);
  HT.caches.push({ name: 'manga panel canvases', size: () => panelPool.size });
  const area2 = pts => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; return a; };
  function centroid(pts) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]; a += f; cx += (pts[j][0] + pts[i][0]) * f; cy += (pts[j][1] + pts[i][1]) * f; }
    if (abs(a) < 1e-6) { let sx = 0, sy = 0; for (const p of pts) { sx += p[0]; sy += p[1]; } return [sx / pts.length, sy / pts.length]; }
    return [cx / (3 * a), cy / (3 * a)];
  }
  function offsetPoly(pts, dlt) { // convex polygon; dlt > 0 moves every edge inward
    const n = pts.length, s = area2(pts) > 0 ? 1 : -1, L = [];
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; L.push([a[0] - dy * s * dlt, a[1] + dx * s * dlt, dx, dy]); }
    const out = [];
    for (let i = 0; i < n; i++) {
      const p = L[(i + n - 1) % n], q = L[i], den = p[2] * q[3] - p[3] * q[2];
      if (abs(den) < 1e-9) { out.push([q[0], q[1]]); continue; }
      const t = ((q[0] - p[0]) * q[3] - (q[1] - p[1]) * q[2]) / den;
      out.push([p[0] + p[2] * t, p[1] + p[3] * t]);
    }
    return out;
  }
  manga.offsetPoly = offsetPoly; manga.centroid = centroid;
  function bboxOf(pts, cw, ch, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    x0 = max(0, floor(x0 - pad)); y0 = max(0, floor(y0 - pad)); x1 = min(cw, Math.ceil(x1 + pad)); y1 = min(ch, Math.ceil(y1 + pad));
    return { x: x0, y: y0, w: max(1, x1 - x0), h: max(1, y1 - y0) };
  }
  const splitAt = (e, age) => (Array.isArray(e.split) ? pw(e.split, age) : e.split === undefined ? 0.5 : e.split);
  function layoutPolys(e, cw, ch, age) {
    const lay = e.layout || 'split2', bleed = e.bleed !== undefined ? !!e.bleed : lay === 'diag';
    const m = bleed ? 0 : (e.margin === undefined ? 8 : e.margin), g = e.gutter === undefined ? (lay === 'diag' ? 10 : 8) : e.gutter;
    const x0 = m, y0 = m, x1 = cw - m, y1 = ch - m, RW = x1 - x0, RH = y1 - y0;
    const sv = (xa, ya, xb, yb, xt, xbt) => [ // split a band by a line from (xt, ya) to (xbt, yb): [right, left]
      [[xt + g / 2, ya], [xb, ya], [xb, yb], [xbt + g / 2, yb]],
      [[xa, ya], [xt - g / 2, ya], [xbt - g / 2, yb], [xa, yb]]];
    let polys;
    if (lay === 'diag') { const sl = e.slant === undefined ? cw * 0.32 : e.slant, dir = e.dir === '\\' ? -1 : 1, mid = x0 + RW * splitAt(e, age); polys = sv(x0, y0, x1, y1, mid + dir * sl / 2, mid - dir * sl / 2); }
    else if (lay === 'split2') { const sl = e.slant === undefined ? 36 : e.slant, mid = x0 + RW * splitAt(e, age); polys = sv(x0, y0, x1, y1, mid + sl / 2, mid - sl / 2); }
    else if (lay === 'split3') { const ym = y0 + RH * (e.top === undefined ? 0.46 : e.top), sl = e.slant === undefined ? 30 : e.slant, mid = x0 + RW * 0.55; polys = [[[x0, y0], [x1, y0], [x1, ym - g / 2], [x0, ym - g / 2]]].concat(sv(x0, ym + g / 2, x1, y1, mid + sl / 2, mid - sl / 2)); }
    else if (lay === 'grid4') { const ym = y0 + RH / 2, sl = e.slant === undefined ? 20 : e.slant, mid = x0 + RW / 2; polys = sv(x0, y0, x1, ym - g / 2, mid + sl / 2, mid - sl / 2).concat(sv(x0, ym + g / 2, x1, y1, mid - sl / 2, mid + sl / 2)); }
    else if (lay === 'strip3v') {
      const sl = e.slant === undefined ? 24 : e.slant, a = x0 + RW / 3, b = x0 + RW * 2 / 3;
      polys = [[[b + sl / 2 + g / 2, y0], [x1, y0], [x1, y1], [b - sl / 2 + g / 2, y1]],
        [[a - sl / 2 + g / 2, y0], [b + sl / 2 - g / 2, y0], [b - sl / 2 - g / 2, y1], [a + sl / 2 + g / 2, y1]],
        [[x0, y0], [a - sl / 2 - g / 2, y0], [a + sl / 2 - g / 2, y1], [x0, y1]]];
    } else if (lay === 'inset') {
      polys = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
      const iw = RW * 0.3, ih = RH * 0.4, pad = 14;
      const slots = [[x0 + pad, y1 - pad - ih], [x1 - pad - iw, y0 + pad], [x0 + pad, y0 + pad], [x1 - pad - iw, y1 - pad - ih]];
      (e.panels || []).slice(1).forEach((p, k) => {
        let r = p && p.rect ? p.rect.slice() : [slots[k % 4][0], slots[k % 4][1], iw, ih];
        if (r.every(v => abs(v) <= 1)) r = [x0 + r[0] * RW, y0 + r[1] * RH, r[2] * RW, r[3] * RH];
        polys.push([[r[0], r[1]], [r[0] + r[2], r[1]], [r[0] + r[2], r[1] + r[3]], [r[0], r[1] + r[3]]]);
      });
    } else polys = [[[x0, y0], [x1, y0], [x1, y1], [x0, y1]]];
    (e.panels || []).forEach((p, i) => { if (p && p.poly) polys[i] = p.poly.every(q => abs(q[0]) <= 1 && abs(q[1]) <= 1) ? p.poly.map(q => [x0 + q[0] * RW, y0 + q[1] * RH]) : p.poly.map(q => q.slice()); });
    return { polys, bleed, g };
  }
  manga.layout = (e, age = 0, cw = W, ch = H) => layoutPolys(e, cw, ch, age).polys;
  // ink border band B px wide, straddling the edge by 1 px outward (covers the clip's anti-aliased fringe); edges on
  // the frame boundary of a bleed layout get no border
  function drawBorder(ctx, poly, B, col, bleed, cw, ch) {
    if (B <= 0) return;
    const out = offsetPoly(poly, -1), inn = offsetPoly(poly, B - 1), n = poly.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = poly[i], b = poly[j];
      if (bleed && ((a[0] <= 0.5 && b[0] <= 0.5) || (a[0] >= cw - 0.5 && b[0] >= cw - 0.5) || (a[1] <= 0.5 && b[1] <= 0.5) || (a[1] >= ch - 0.5 && b[1] >= ch - 0.5))) continue;
      HT.poly(ctx, [out[i], out[j], inn[j], inn[i]], col);
    }
  }
  const namedCol = v => (v === 'white' || v === 'paper' ? C.white : v === 'black' ? C.ink : v === 'cream' ? C.cream : v);
  function drawPanelBg(g, P, bb, t) {
    const bg = P.bg;
    if (!bg) { HT.rect(g, 0, 0, bb.w, bb.h, C.white); return; } // always repaint: pooled canvases must not leak the previous frame
    if (bg === 'grad') { HT.vgrad(g, 0, 0, bb.w, bb.h, [[0, C.shadow], [1, C.white]]); return; }
    if (bg === 'focus' || bg === 'beta' || bg === 'speed') {
      HT.rect(g, 0, 0, bb.w, bb.h, C.white);
      if (bg === 'speed') manga.speedLines(g, P.angle || 0, Object.assign({ t, seed: 5 }, P.lineOpts || {}));
      else manga.focusLines(g, bb.w / 2, bb.h / 2, Object.assign({ beta: bg === 'beta', t, seed: 9, inner: min(bb.w, bb.h) * 0.3 }, P.lineOpts || {}));
      return;
    }
    HT.rect(g, 0, 0, bb.w, bb.h, namedCol(bg));
  }
  const relP = (v, base, size, def) => (v === undefined ? base + size * def : abs(v) <= 1 ? base + v * size : base + v);
  function panelLines(g, Lo, bb, cc, S, t) {
    const type = Lo.type || 'focus', lx = relP(Lo.x, 0, bb.w, (cc[0] - bb.x) / bb.w), ly = relP(Lo.y, 0, bb.h, (cc[1] - bb.y) / bb.h);
    if (type === 'speed') manga.speedLines(g, Lo.angle || 0, Object.assign({ t }, Lo));
    else manga.focusLines(g, lx, ly, Object.assign({ t, beta: type === 'beta', inner: min(bb.w, bb.h) * 0.34 }, Lo));
  }
  function grade(g, gr, bb) {
    g.save(); g.globalCompositeOperation = gr.mode || 'color'; g.globalAlpha = gr.alpha === undefined ? 1 : gr.alpha;
    g.fillStyle = gr.col || C.crimson; g.fillRect(0, 0, bb.w, bb.h); g.restore();
  }
  // the panel's camera: the shot as designed for the full frame, zoomed, then translated so its frame centre (or the
  // focus point) lands on the panel's centroid; the viewport is the panel canvas, so viewport-aware sets (the city
  // renderer) rasterize only the panel's pixels
  function subCamera(S, e, P, bb, cc, k, shake) {
    const shot = Object.assign({}, P.shot), name = shot.shot || 'medium', fn = HT.shots[name];
    if (!fn || name === 'panels') return null;
    if (P.bust && !shot.bust) shot.bust = P.bust;
    if (shot.bust && !shot.who && shot.bust.who) shot.who = shot.bust.who;
    const tx = cc[0] - bb.x + (P.pan ? P.pan[0] : 0), ty = cc[1] - bb.y + (P.pan ? P.pan[1] : 0);
    if (name === 'closeup' && shot.bust && !(HT.fight && HT.fight.bustViewport)) {
      // the current runner draws busts at (W/2 + side·0.22·W, H + bottom) in whatever canvas it is given → aim that
      // anchor at the panel's centroid column / bottom edge, and size the bust to the panel
      if (shot.side === undefined) shot.side = (tx - W / 2) / (0.22 * W);
      if (shot.bottom === undefined) shot.bottom = bb.h - H;
      if (shot.size === undefined) shot.size = clamp(round(bb.h * 1.1), 110, 230);
    }
    const t0 = (e.t || 0) + (P.slamAt || 0) + (shot.t0 || 0);
    const c = Object.assign({}, fn(S, S.t, shot, t0));
    const z = (P.zoom || 1) * k, sx0 = c.sx || 0, sy0 = c.sy || 0, shift = c.shift || 0;
    const px0 = W / 2 + sx0, py0 = H / 2 + shift + sy0;
    c.f = (c.f || 480) * z;
    let F = [px0 + (W / 2 - px0) * z, py0 + (H / 2 - py0) * z];
    if (P.focus && S.pt) {
      const tmp = Object.assign({}, c, { vx: 0, vy: 0, vw: W, vh: H, _prepped: false }), p = S.pt(P.focus), q = HT.cam.project(tmp, p[0], p[1], p[2]);
      if (q) F = [q.x, q.y];
    }
    c.vx = 0; c.vy = 0; c.vw = bb.w; c.vh = bb.h;
    c.sx = sx0 + W / 2 - F[0] + tx - bb.w / 2 + shake[0];
    c.sy = sy0 + H / 2 - F[1] + ty - bb.h / 2 + shake[1];
    c._prepped = false;
    return c;
  }
  manga.subCamera = subCamera;
  const SLAM_FROM = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
  manga.panels = (ctx, S, e, renderFn) => {
    const cw = ctx.canvas.width, ch = ctx.canvas.height, t = S.t, age = t - (e.t || 0);
    const { polys, bleed, g } = layoutPolys(e, cw, ch, age);
    const paperC = namedCol(e.page || 'white'), inkC = e.ink || C.ink, B = e.border === undefined ? 3 : e.border;
    HT.rect(ctx, 0, 0, cw, ch, paperC);
    const saveCam = S.cam, saveProj = S.project;
    const shake = [round((saveCam && saveCam.sx) || 0), round((saveCam && saveCam.sy) || 0)];
    const panels = e.panels || [], kanaQ = [];
    let jy = 0; // page jolt when a panel lands
    polys.forEach((q, i) => { const P = panels[i] || {}, pa = age - (P.slamAt || 0); if (P.slam !== false && pa >= 0.05 && pa < 0.14) jy += (F30(pa) & 1) ? -1 : 1; });
    for (let i = 0; i < polys.length; i++) {
      const P = panels[i] || {}, pa = age - (P.slamAt || 0);
      const base = polys[i].map(q => [q[0], q[1] + jy]);
      if (pa < 0) { if (P.pre === 'frame') drawBorder(ctx, base, B, inkC, bleed, cw, ch); continue; }
      const slam = P.slam !== false && pa < 0.16;
      const k = slam ? pw([[0, 1.09], [0.05, 0.968], [0.1, 1.012], [0.15, 1]], pa) : 1;
      const dv = SLAM_FROM[P.from || 'top'] || SLAM_FROM.top, dm = slam ? pw([[0, 10], [0.05, -2], [0.1, 1], [0.15, 0]], pa) : 0;
      const c0 = centroid(base);
      const poly = base.map(q => [round(c0[0] + (q[0] - c0[0]) * k + dv[0] * dm), round(c0[1] + (q[1] - c0[1]) * k + dv[1] * dm)]);
      const c1 = centroid(polys[i]), bb = bboxOf(polys[i].map(q => [c1[0] + (q[0] - c1[0]) * 1.1, c1[1] + (q[1] - c1[1]) * 1.1]), cw, ch, 12); // fixed per panel (independent of the jolt)
      const pc = panelPool.get(i + '|' + bb.w + 'x' + bb.h) || panelPool.set(i + '|' + bb.w + 'x' + bb.h, HT.canvas(bb.w, bb.h));
      const pg = pc.g;
      pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalAlpha = 1; pg.globalCompositeOperation = 'source-over'; pg.imageSmoothingEnabled = false;
      const cc = centroid(poly);
      drawPanelBg(pg, P, bb, t);
      if (P.shot && P.world !== false && renderFn) {
        const cam = subCamera(S, e, P, bb, cc, k, shake);
        if (cam) { pg.save(); try { renderFn(pg, cam, P); } catch (err) { console.error('[manga.panels] panel ' + i, err); } pg.restore(); } // P: the panel (P.env overrides the scene env)
        S.cam = saveCam; S.project = saveProj;
      }
      if (P.grade) grade(pg, P.grade, bb);
      if (P.lines) panelLines(pg, P.lines, bb, cc, S, t);
      if (P.draw) { pg.save(); P.draw(pg, S, { x: bb.x, y: bb.y, w: bb.w, h: bb.h, cx: cc[0] - bb.x, cy: cc[1] - bb.y, poly, age: pa, index: i }); pg.restore(); }
      if (P.tone) manga.tone(pg, null, Object.assign({ ox: bb.x, oy: bb.y, poly: poly.map(q => [q[0] - bb.x, q[1] - bb.y]) }, P.tone === true ? {} : P.tone));
      if (P.inset || (e.layout === 'inset' && i > 0)) HT.poly(ctx, offsetPoly(poly, -(g || 6)), paperC);
      ctx.save(); ctx.beginPath(); poly.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.clip();
      ctx.drawImage(pc.c, bb.x, bb.y);
      ctx.restore();
      drawBorder(ctx, poly, B + (slam && pa < 0.1 ? round(3 * (1 - pa / 0.1)) : 0), inkC, bleed, cw, ch);
      if (P.kana) { const kb = bboxOf(poly, cw, ch, 0); for (const kk of P.kana) kanaQ.push([kk, kb, pa]); }
    }
    S.cam = saveCam; S.project = saveProj;
    for (const [kk, bb, pa] of kanaQ) {
      const a2 = pa - (kk.t || 0), dur = kk.dur || kana.defaultDur(kk);
      if (a2 < 0 || a2 > dur) continue;
      kana.sfx(ctx, kk.kana, relP(kk.x, bb.x, bb.w, 0.5), relP(kk.y, bb.y, bb.h, 0.5), Object.assign({}, kk, { age: a2, dur, t: (e.t || 0) + (kk.t || 0) }));
    }
  };
  // camera for the 'panels' shot itself (used by the runner for blends into/out of the page): panel 0's camera, no shake
  HT.shots.panels = (S, t, p, t0) => {
    const P = (p.panels || [])[0], shot = P && P.shot, fn = shot && HT.shots[shot.shot];
    const c = fn && shot.shot !== 'panels' ? Object.assign({}, fn(S, t, Object.assign({}, shot, P.bust && !shot.bust ? { bust: P.bust } : {}), t0 + (P.slamAt || 0))) : HT.cam.make({});
    c.sx = 0; c.sy = 0; delete c.closeup; delete c.ecu;
    return c;
  };

  // ================================================================== 9. LATIN TEXT WITH EXTRA GLYPHS (— © × … curly quotes)
  // core's 'small'/'tiny' fonts are uppercase ASCII + a few symbols; unknown characters would print as '?'
  const CORE_OK = /[A-Za-z0-9.,!?:;'"\-+/()%&#=*<>_♥·→ ]/;
  const XS = { // extra glyphs, small (5×7-style)
    '—': ['.......', '.......', '.......', '#######', '.......', '.......', '.......'], '–': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
    '©': ['.#####.', '#.....#', '#.###.#', '#.#...#', '#.###.#', '#.....#', '.#####.'], '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  };
  const XT = { '—': ['.....', '.....', '#####', '.....', '.....'], '–': ['....', '....', '####', '....', '....'], '©': ['.###.', '#.#.#', '##..#', '#.#.#', '.###.'], '×': ['...', '#.#', '.#.', '#.#', '...'] };
  const XMAP = { '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', 'é': 'E', 'É': 'E', ' ': ' ' };
  const latinRuns = (str, font) => {
    const runs = []; let cur = '';
    const X = font === 'tiny' ? XT : XS;
    for (let ch of String(str)) {
      if (XMAP[ch]) ch = XMAP[ch];
      if (ch.length > 1 || CORE_OK.test(ch)) { cur += ch; continue; }
      if (cur) runs.push(cur); cur = '';
      runs.push(X[ch] ? { g: X[ch] } : '?');
    }
    if (cur) runs.push(cur);
    return runs;
  };
  manga.textWidth = (str, o = {}) => {
    const font = o.font || 'small', s = o.scale || 1, sp = o.spacing === undefined ? 1 : o.spacing;
    let w = 0; const runs = latinRuns(str, font);
    runs.forEach((r, i) => { w += typeof r === 'string' ? HT.textWidth(r, font, s, sp) : r.g[0].length * s; if (i < runs.length - 1) w += sp * s; });
    return w;
  };
  // HT.manga.text(ctx, str, x, y, {font, scale, spacing, col, shadow, align, alpha}) → width
  manga.text = (ctx, str, x, y, o = {}) => {
    const font = o.font || 'small', s = o.scale || 1, sp = o.spacing === undefined ? 1 : o.spacing, col = o.col || C.ink;
    const w = manga.textWidth(str, o);
    let cx = o.align === 'center' ? round(x - w / 2) : o.align === 'right' ? round(x - w) : round(x);
    const runs = latinRuns(str, font);
    runs.forEach((r, i) => {
      if (typeof r === 'string') cx += HT.text(ctx, r, cx, y, { font, scale: s, spacing: sp, col, shadow: o.shadow, alpha: o.alpha });
      else {
        const draw = c => { const img = HT.sprite(r.g, { '#': c }); HT.spr(ctx, img, cx + (c === col ? 0 : s), y + (c === col ? 0 : s), { scale: s, alpha: o.alpha }); };
        if (o.shadow) draw(o.shadow);
        draw(col); cx += r.g[0].length * s;
      }
      if (i < runs.length - 1) cx += sp * s;
    });
    return w;
  };
  const wrapText = (str, maxW, o) => { // greedy word wrap in px
    const words = String(str).split(' '), out = []; let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (!line || manga.textWidth(t, o) <= maxW) line = t; else { out.push(line); line = wd; } }
    if (line) out.push(line);
    return out;
  };

  // ================================================================== 10. TITLE LOGOTYPE — "DOMAIN CLASH"
  // Bespoke heavy letters on a 13-unit cap height, 3-unit stems, 45° chamfers (a cut motif), rasterised crisp at k px
  // per unit, extruded down-right, then split by a hairline diagonal cut: the upper half's extrusion is Gojo's cold
  // navy, the lower half's Sukuna's wine — the film's diagonal split, foreshadowing the World-Cutting Slash.
  const LOGO = {
    D: { w: 11, p: [[0, 0], [8, 0], [11, 3], [11, 10], [8, 13], [0, 13]], h: [[[3, 3], [7, 3], [8, 4], [8, 9], [7, 10], [3, 10]]] },
    O: { w: 11, p: [[3, 0], [8, 0], [11, 3], [11, 10], [8, 13], [3, 13], [0, 10], [0, 3]], h: [[[4, 3], [7, 3], [8, 4], [8, 9], [7, 10], [4, 10], [3, 9], [3, 4]]] },
    M: { w: 13, p: [[0, 13], [0, 0], [4, 0], [6.5, 4], [9, 0], [13, 0], [13, 13], [10, 13], [10, 6], [6.5, 11], [3, 6], [3, 13]] },
    A: { w: 11, p: [[0, 13], [0, 3], [3, 0], [8, 0], [11, 3], [11, 13], [8, 13], [8, 9], [3, 9], [3, 13]], h: [[[3, 4], [4, 3], [7, 3], [8, 4], [8, 6], [3, 6]]] },
    I: { w: 3, p: [[0, 0], [3, 0], [3, 13], [0, 13]] },
    N: { w: 11, p: [[0, 13], [0, 0], [3, 0], [8, 7], [8, 0], [11, 0], [11, 13], [8, 13], [3, 6], [3, 13]] },
    C: { w: 11, p: [[3, 0], [11, 0], [11, 3], [4, 3], [3, 4], [3, 9], [4, 10], [11, 10], [11, 13], [3, 13], [0, 10], [0, 3]] },
    L: { w: 10, p: [[0, 0], [3, 0], [3, 10], [10, 10], [10, 13], [0, 13]] },
    S: { w: 11, p: [[3, 0], [11, 0], [11, 3], [3, 3], [3, 5], [8, 5], [11, 8], [11, 10], [8, 13], [0, 13], [0, 10], [8, 10], [8, 8], [3, 8], [0, 5], [0, 3]] },
    H: { w: 11, p: [[0, 0], [3, 0], [3, 5], [8, 5], [8, 0], [11, 0], [11, 13], [8, 13], [8, 8], [3, 8], [3, 13], [0, 13]] },
    ' ': { w: 4 },
  };
  function fillPolyMask(m, pts, val) { // pixel-centre rule (same as HT.poly), even-odd within one polygon
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const xs = [];
    for (let y = max(0, Math.ceil(y0 - 0.5)); y <= min(m.h - 1, floor(y1 - 0.5)); y++) {
      const sy = y + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const yi = pts[i][1], yj = pts[j][1]; if ((yi <= sy && yj > sy) || (yj <= sy && yi > sy)) xs.push(pts[i][0] + (sy - yi) / (yj - yi) * (pts[j][0] - pts[i][0])); }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) { const a = max(0, Math.ceil(xs[k] - 0.5)), b = min(m.w - 1, floor(xs[k + 1] - 0.5)); for (let x = a; x <= b; x++) m.d[y * m.w + x] = val; }
    }
  }
  const logoCache = HT.lru(4);
  HT.caches.push({ name: 'title logo', size: () => logoCache.size });
  function buildLogo(str, k, o = {}) {
    const key = [str, k, o.depth, o.mono ? 1 : 0].join('|');
    let L = logoCache.get(key);
    if (L) return L;
    const sp = 2, depth = o.depth === undefined ? max(3, round(k * 1.7)) : o.depth, pad = depth + 4;
    let uw = 0; for (const ch of str) uw += (LOGO[ch] || LOGO[' ']).w + sp; uw -= sp;
    const w = round(uw * k) + pad * 2, h = round(13 * k) + pad * 2;
    const face = newMask(w, h);
    let ux = 0;
    for (const ch of str) {
      const G = LOGO[ch] || LOGO[' '];
      if (G.p) {
        const tr = q => [pad + (ux + q[0]) * k, pad + q[1] * k];
        fillPolyMask(face, G.p.map(tr), 1);
        if (G.h) for (const hole of G.h) fillPolyMask(face, hole.map(tr), 0);
      }
      ux += G.w + sp;
    }
    // cut line through the centre, rising to the right; |s| ≤ 0.5 is the 1-px hairline gap
    const cx = w / 2, cy = pad + 13 * k / 2, a = -11 * D2R, ta = Math.tan(a);
    const sideOf = (x, y) => (y + 0.5 - cy) - ta * (x + 0.5 - cx);
    const mk2 = () => ({ cv: HT.canvas(w, h), m: newMask(w, h), f: newMask(w, h) });
    const halves = [mk2(), mk2()];
    const cols = o.mono ? [[C.white, C.dusk, C.shadow], [C.white, C.dusk, C.shadow]] : [[C.white, C.blue, C.navy], [C.white, C.wine, C.maroon]];
    const imgs = halves.map(hf => hf.cv.g.createImageData(w, h)), outs = imgs.map(im => new Uint32Array(im.data.buffer));
    const top = pad, bot = pad + 13 * k, WHITE = pack(C.white);
    const rowCol = new Uint32Array(h); // face gradient, one packed colour per row
    for (let y = 0; y < h; y++) { const f = clamp((y + 0.5 - top) / (bot - top), 0, 1); rowCol[y] = f < 0.45 ? WHITE : pack(HT.mix(C.white, o.mono ? C.mist : C.ice, (f - 0.45) / 0.55)); }
    const sideCol = cols.map(c3 => [pack(c3[1]), pack(c3[2])]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = sideOf(x, y);
      if (abs(s) <= 0.55) continue;
      const hi = s < 0 ? 0 : 1, i = y * w + x;
      if (face.d[i]) { outs[hi][i] = rowCol[y]; halves[hi].m.d[i] = 1; halves[hi].f.d[i] = 1; continue; }
      for (let d = 1; d <= depth; d++) { // extrusion: nearest face pixel up-left along 45°
        const xx = x - d, yy = y - d;
        if (xx >= 0 && yy >= 0 && face.d[yy * w + xx]) { outs[hi][i] = sideCol[hi][d <= depth * 0.5 ? 0 : 1]; halves[hi].m.d[i] = 1; break; }
      }
    }
    halves.forEach((hf, j) => {
      // top-edge highlight on the face, then the ink outline around face ∪ extrusion
      for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (hf.f.d[i] && !hf.f.d[i - w] && !hf.m.d[i - w]) outs[j][i] = WHITE; }
      hf.cv.g.putImageData(imgs[j], 0, 0);
      hf.out = HT.outlined(hf.cv.c, C.ink);
      const fc = HT.canvas(w, h), fim = fc.g.createImageData(w, h), fo = new Uint32Array(fim.data.buffer), wh = pack(C.white);
      for (let i = 0; i < w * h; i++) if (hf.f.d[i]) fo[i] = wh;
      fc.g.putImageData(fim, 0, 0); hf.faceOnly = fc.c;
    });
    L = { upper: halves[0], lower: halves[1], w, h, cx, cy, a, pad };
    return logoCache.set(key, L);
  }
  cards.logo = buildLogo;
  // pre-build the film's title logotype at startup (≈5 ms) so the title card never pays it on its first frame
  HT.bootTasks = HT.bootTasks || [];
  HT.bootTasks.push({ name: 'title logo', fn: () => { buildLogo('DOMAIN CLASH', 3); } });
  // draw the logotype centred at (x, y): sep = half-offset along the cut (px), glint = 0..1 sweep (or <0 none)
  function drawLogo(ctx, L, x, y, sep, alpha, glint) {
    const ux = cos(L.a), uy = sin(L.a), ox = round(x - L.w / 2) - 1, oy = round(y - L.h / 2) - 1;
    const oa = ctx.globalAlpha;
    ctx.globalAlpha = oa * alpha;
    const pos = [[round(-ux * sep), round(-uy * sep)], [round(ux * sep), round(uy * sep)]];
    [L.upper, L.lower].forEach((hf, j) => ctx.drawImage(hf.out, ox + pos[j][0], oy + pos[j][1]));
    if (glint >= 0 && glint <= 1) { // a bright band sweeping across the faces only
      const bx = -40 + glint * (L.w + 80);
      [L.upper, L.lower].forEach((hf, j) => {
        ctx.save(); ctx.beginPath();
        const X = ox + 1 + pos[j][0], Y = oy + 1 + pos[j][1];
        ctx.moveTo(X + bx, Y); ctx.lineTo(X + bx + 10, Y); ctx.lineTo(X + bx + 10 - L.h, Y + L.h); ctx.lineTo(X + bx - L.h, Y + L.h); ctx.closePath(); ctx.clip();
        ctx.globalAlpha = oa * alpha * 0.9; ctx.drawImage(hf.faceOnly, X, Y); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = oa * alpha * 0.25; ctx.drawImage(hf.faceOnly, X, Y);
        ctx.restore();
      });
    }
    ctx.globalAlpha = oa;
  }
  cards.drawLogo = drawLogo;

  // ================================================================== 11. CARDS — HT.cards.draw(ctx, e, age, S)
  // e.card = 'act' | 'place' | 'title' (style; text in e.text) — or e.card = the text itself (style inferred: 'ACT …'
  // → act, 'DOMAIN CLASH' → title, else place). e.style forces a style. Common: e.dur (the runner's default is 1.2 s —
  // set it), e.x, e.y. act: e.sub, e.bg ('dim' default | 'black' | 'none'), e.accent. place: e.sub (second line, tiny
  // font), e.cps (typing speed), e.align ('left' | 'right'). title: e.sub, e.scale (px per letter unit, default 3).
  const ACCENT = { I: C.ice, II: C.red, III: C.amber, IV: C.gold, V: C.violet, VI: C.white };
  cards.DUR = { act: 4.5, place: 4, title: 6.5 };
  cards.draw = (ctx, e, age, S) => {
    const STY2 = ['act', 'place', 'title'];
    let style = STY2.includes(e.style) ? e.style : null, text = e.text;
    if (!style) {
      if (STY2.includes(e.card)) style = e.card;
      else { text = text || String(e.card || ''); style = /^ACT\b/i.test(text) ? 'act' : /DOMAIN\s*CLASH/i.test(text) ? 'title' : 'place'; }
    }
    if (!text) text = style === 'title' ? 'DOMAIN CLASH' : style === 'act' ? 'ACT I' : '';
    const dur = e.dur || cards.DUR[style];
    if (age < 0 || age > dur) return;
    CARD[style](ctx, e, String(text), age, dur, S);
  };
  const CARD = {
    act(ctx, e, text, age, dur) {
      const fin = HT.smooth(age / 0.7), fout = HT.smooth((dur - age) / 0.7), a = min(fin, fout);
      if (e.bg === 'black') HT.rect(ctx, 0, 0, W, H, C.ink);
      else if (e.bg !== 'none') HT.fx.fade(ctx, 0.5 * a, C.ink);
      const parts = text.trim().split(/\s+/), head = parts[0].toUpperCase(), num = parts.slice(1).join(' ').toUpperCase();
      const accent = e.accent || ACCENT[num] || C.ice, yc = e.y === undefined ? H / 2 : e.y, rise = round(3 * (1 - HT.E.outCubic(fin)));
      if (e.sub) { // film-intertitle hierarchy: small tracked act label, hairline, the act's name large
        const name = String(e.sub).toUpperCase(), nw = manga.textWidth(name, { scale: 2, spacing: 3 });
        const lab = head + (num ? '  ' + num : ''), lw = round((nw + 36) * HT.E.outCubic(HT.seg(age, 0.2, 1.0)));
        manga.text(ctx, lab, W / 2, yc - 22 + rise, { spacing: 3, col: accent, shadow: C.ink, align: 'center', alpha: a });
        if (lw > 0) HT.alpha(ctx, a, () => { HT.rect(ctx, round(W / 2 - lw / 2), yc - 10 + rise, lw, 1, accent); HT.rect(ctx, round(W / 2 - lw / 2) + 1, yc - 9 + rise, lw, 1, C.ink); });
        manga.text(ctx, name, W / 2, yc - 1 + rise, { scale: 2, spacing: 3, col: C.white, shadow: C.ink, align: 'center', alpha: min(HT.seg(age, 0.35, 1.15), fout) });
        return;
      }
      const s = 2, sp = 4, wA = manga.textWidth(head, { scale: s, spacing: sp }), wN = num ? manga.textWidth(num, { scale: s, spacing: sp }) : 0, gap = num ? 16 : 0;
      const x0 = round(W / 2 - (wA + gap + wN) / 2), y = round(yc - 10) + rise;
      manga.text(ctx, head, x0, y, { scale: s, spacing: sp, col: C.white, shadow: C.ink, alpha: a });
      if (num) manga.text(ctx, num, x0 + wA + gap, y, { scale: s, spacing: sp, col: accent, shadow: C.ink, alpha: a });
      const lw = round(170 * HT.E.outCubic(HT.seg(age, 0.25, 1.0)));
      if (lw > 0) HT.alpha(ctx, a, () => { HT.rect(ctx, round(W / 2 - lw / 2), y + 21, lw, 1, accent); HT.rect(ctx, round(W / 2 - lw / 2) + 1, y + 22, lw, 1, C.ink); });
    },
    place(ctx, e, text, age, dur) {
      const fout = clamp((dur - age) / 0.6, 0, 1), cps = e.cps || 32, t0 = 0.15;
      const str = text.toUpperCase(), shown = clamp(floor((age - t0) * cps), 0, str.length), typed = str.slice(0, shown);
      const accent = e.accent || C.ice, font = e.font || 'small', tw = manga.textWidth(str, { font });
      const x = e.align === 'right' ? (e.x === undefined ? W - 16 : e.x) - tw - 7 : (e.x === undefined ? 16 : e.x), y = e.y === undefined ? H - 26 : e.y;
      if (age < t0) return;
      HT.alpha(ctx, fout, () => { HT.rect(ctx, x + 1, y + 3, 3, 3, C.ink); HT.rect(ctx, x, y + 2, 3, 3, accent); });
      manga.text(ctx, typed, x + 7, y, { font, col: C.white, shadow: C.ink, alpha: fout });
      const doneAt = t0 + str.length / cps;
      if ((age < doneAt + 0.9) && floor(age * 4) % 2 === 0) HT.alpha(ctx, fout, () => HT.rect(ctx, x + 7 + manga.textWidth(typed, { font }) + (typed ? 1 : 0), y, 4, 7, accent));
      if (e.sub) {
        const sub = String(e.sub).toUpperCase(), sShown = clamp(floor((age - doneAt - 0.2) * cps), 0, sub.length);
        if (sShown > 0) manga.text(ctx, sub.slice(0, sShown), x + 7, y + 11, { font: 'tiny', spacing: 2, col: C.mist, shadow: C.ink, alpha: fout });
      }
    },
    title(ctx, e, text, age, dur) {
      const k = e.scale || 3, L = buildLogo(text.toUpperCase(), k);
      const x = e.x === undefined ? W / 2 : e.x, y = e.y === undefined ? round(H * 0.4) : e.y;
      const outT = min(1.1, dur * 0.2), fout = clamp((dur - age) / outT, 0, 1);
      // 1. the blade: a hairline drawn across the frame along the cut
      const bl = HT.E.outCubic(HT.seg(age, 0, 0.7)), bfade = 1 - HT.seg(age, 1.3, 1.9);
      if (bl > 0 && bfade > 0) {
        const ux = cos(L.a), uy = sin(L.a), x0 = -20, xe = x0 + (W + 40) * bl, yAt = xx => y + (xx - x) * uy / ux;
        HT.alpha(ctx, bfade, () => { HT.line(ctx, x0, yAt(x0), xe, yAt(xe), C.ice); if (bl < 1) HT.rect(ctx, round(xe) - 1, round(yAt(xe)) - 1, 3, 3, C.white); });
      }
      // 2. the halves slide in along the cut and settle a hair apart; 3. a glint; 4. they drift apart as it fades
      const inA = HT.E.inOutCubic(HT.seg(age, 0.3, 1.4)), sepIn = lerp(14, 1, HT.E.outCubic(HT.seg(age, 0.3, 1.5))), sepOut = lerp(0, 4, 1 - fout);
      if (inA > 0) drawLogo(ctx, L, x, y, sepIn + sepOut, inA * fout, (age - 1.6) / 0.8);
      if (e.sub) manga.text(ctx, String(e.sub).toUpperCase(), x, y + round(L.h / 2) + 6, { font: 'small', spacing: 2, col: C.white, shadow: C.ink, align: 'center', alpha: min(HT.seg(age, 1.5, 2.2), fout) });
    },
  };

  // ================================================================== 12. END CREDITS — HT.cards.creditsPage(ctx, t, o)
  // A tall B/W manga page scrolled over o.dur seconds. Every motif is drawn procedurally in colour (rig silhouettes,
  // shapes, gradients) and converted with tone(); page tones are locked to the page (they scroll with the paper).
  // Credit lines: plain strings; '' starts a new narration box (one per tier), '# Heading' is a heading. The first
  // group, if it starts with 'DOMAIN CLASH', becomes the title header; the last group goes into the final panel.
  cards.CREDIT_LINES = [
    'DOMAIN CLASH — an unofficial fan film',
    '',
    '# Source',
    'Jujutsu Kaisen © Gege Akutami / Shueisha',
    'Shinjuku Showdown, chapters 221–236',
    '',
    '# Code',
    'Made entirely of code: 0 image files · 0 audio samples',
    'Every pixel drawn in JavaScript, every sound synthesized',
    '',
    '# Techniques',
    'Resurrect 64 palette by Kerrie Lake',
    'Ordered dithering after Joel Yliluoma',
    "Voxel Space after NovaLogic's Comanche (1992)",
    'Scale2x / Scale3x pixel scaling after AdvanceMAME',
    '',
    '# Manga language',
    'Screentone, focus lines, beta flash, panel slams',
    'Katakana onomatopoeia pixeled by hand',
    '',
    '# Craft notes',
    'Silence and staging after Primal (Genndy Tartakovsky)',
    'Hit-stop and frame data after SF III 3rd Strike and Garou',
    '',
    'A non-commercial fan tribute',
  ];
  const LIGHT_C = [0.5, -0.5, 0.7];
  const snowDots = (g, w, h, seed, col, n) => { for (let i = 0; i < n; i++) { const s = hash(i * 3 + 2, seed) < 0.25 ? 2 : 1; HT.rect(g, floor(hash(i * 3, seed) * w), floor(hash(i * 3 + 1, seed) * h), s, s, col); } };
  const MOTIFS = {
    snow(g, w, h) {
      HT.rect(g, 0, 0, w, h, C.ink);
      const cx = w * 0.42, cy = h * 0.5, R = min(w, h) * 0.3;
      for (let k = 0; k < 6; k++) {
        const a = k * PI / 3 - PI / 2, ca = cos(a), sa = sin(a);
        HT.thick(g, cx, cy, cx + ca * R, cy + sa * R, 2, C.white);
        for (const [f, l] of [[0.45, 0.28], [0.72, 0.2]]) for (const sgn of [-1, 1]) { const b = a + sgn * PI / 3; HT.thick(g, cx + ca * R * f, cy + sa * R * f, cx + ca * R * f + cos(b) * R * l, cy + sa * R * f + sin(b) * R * l, 2, C.white); }
      }
      HT.circle(g, cx, cy, 3, C.white);
      snowDots(g, w, h, 17, C.mist, 40);
    },
    signal(g, w, h) { // a traffic signal blinking for nobody, close up, snow in the dark
      HT.vgrad(g, 0, 0, w, h, [[0, C.ink], [0.7, C.navy], [1, C.indigo]]);
      for (let i = 0; i < 8; i++) { const bw = w / 8, bh = h * (0.25 + 0.3 * hash(i, 41)); HT.rect(g, i * bw, h - bh, bw - 2, bh, C.shadow); }
      const px = round(w * 0.64);
      HT.rect(g, px, round(h * 0.1), 6, h, C.steel); HT.rect(g, px + 1, round(h * 0.1), 1, h, C.white);
      const hx = round(w * 0.2), hy = round(h * 0.2), hw = 92, hh = 34;
      HT.rect(g, hx + hw, hy + 14, px - hx - hw, 5, C.steel);
      HT.rect(g, hx - 2, hy - 2, hw + 4, hh + 4, C.white); HT.rect(g, hx, hy, hw, hh, C.charcoal);
      [0, 1, 2].forEach(k => { const cx = hx + 16 + k * 30, cy = hy + hh / 2; HT.rect(g, cx - 13, cy - 13, 26, 5, C.ink); HT.circle(g, cx, cy, 10, k === 2 ? C.white : C.dusk); });
      HT.glow(g, hx + 76, hy + hh / 2, 46, C.salmon, 0.6);
      HT.rect(g, px - 2, round(h * 0.5), 22, 30, C.charcoal); HT.rect(g, px + 2, round(h * 0.5) + 4, 14, 10, C.shadow); HT.rect(g, px + 2, round(h * 0.5) + 16, 14, 10, C.white);
      snowDots(g, w, h, 5, C.white, 40);
    },
    gojo(g, w, h) { // walking in, hands in pockets, footprints in the snow
      HT.vgrad(g, 0, 0, w, h, [[0, C.steel], [0.8, C.mist], [1, C.white]]);
      for (let i = 0; i < 7; i++) { const bw = w / 7, bh = h * (0.2 + 0.25 * hash(i, 7)); HT.rect(g, i * bw, h * 0.86 - bh, bw - 2, bh, C.lilacgrey); }
      HT.rect(g, 0, round(h * 0.86), w, h, C.white);
      for (let i = 0; i < 8; i++) HT.ellipse(g, w * 0.5 - i * 18, h * 0.93 + (i % 2) * 3, 3, 1, C.steel);
      HT.rig.draw(g, 'gojo', w * 0.62, h * 0.94, HT.rig.POSES.pockets, h * 0.84, { face: 1, light: LIGHT_C, costume: 'robe' });
      snowDots(g, w, h * 0.84, 9, C.white, 26);
    },
    sukuna(g, w, h) { // on the roof edge, arms crossed (drawn facing right; the silent pair mirrors it)
      HT.vgrad(g, 0, 0, w, h, [[0, C.lavender], [1, C.salmon]]);
      for (let i = 0; i < 10; i++) { const bw = w / 10, bh = h * (0.12 + 0.22 * hash(i, 13)); HT.rect(g, i * bw, h - bh, bw - 1, bh, C.dusk); }
      HT.poly(g, [[0, h * 0.86], [w * 0.62, h * 0.86], [w * 0.7, h], [0, h]], C.charcoal); HT.rect(g, 0, round(h * 0.86), round(w * 0.62), 2, C.ink);
      HT.rig.draw(g, 'sukuna', w * 0.36, h * 0.87, HT.rig.POSES.armsCrossed, h * 0.8, { face: 1, light: LIGHT_C, costume: 'haori' });
    },
    domains(g, w, h) { // Unlimited Void (black, rings of light) vs Malevolent Shrine (red field, the shrine), split diagonally
      HT.rect(g, 0, 0, w, h, C.ink);
      const cx = w * 0.26, cy = h * 0.5;
      for (let r = 6; r < w * 0.5; r += 7) { if (r % 14) HT.ring(g, cx, cy, r, C.white); }
      for (let i = 0; i < 60; i++) { const a = hash(i, 23) * 2 * PI, r = 4 + hash(i, 24) * w * 0.4; HT.px(g, cx + cos(a) * r, cy + sin(a) * r * 0.9, C.ice); }
      HT.circle(g, cx, cy, 5, C.white);
      HT.poly(g, [[w * 0.56, 0], [w, 0], [w, h], [w * 0.4, h]], C.coral);
      const sx = w * 0.78, sy = h * 0.66;
      HT.poly(g, [[sx - 44, sy - 12], [sx - 30, sy - 26], [sx + 30, sy - 26], [sx + 44, sy - 12], [sx + 30, sy - 16], [sx - 30, sy - 16]], C.ink);
      HT.poly(g, [[sx - 30, sy - 34], [sx - 20, sy - 44], [sx + 20, sy - 44], [sx + 30, sy - 34], [sx + 20, sy - 37], [sx - 20, sy - 37]], C.ink);
      HT.rect(g, sx - 22, sy - 16, 44, 4, C.maroon); for (const dx of [-20, -7, 6, 18]) HT.rect(g, sx + dx, sy - 12, 3, 30, C.maroon);
      HT.rect(g, sx - 34, sy + 18, 68, 4, C.maroon);
      HT.line(g, w * 0.56, 0, w * 0.4, h, C.white);
    },
    wheel(g, w, h) {
      HT.vgrad(g, 0, 0, w, h, [[0, C.mist], [1, C.steel]]);
      const cx = w * 0.46, cy = h * 0.52, R = min(w, h) * 0.32;
      for (let k = 0; k < 8; k++) { const a = k * PI / 4 + PI / 8; HT.thick(g, cx, cy, cx + cos(a) * R * 1.12, cy + sin(a) * R * 1.12, 3, C.ink); HT.circle(g, cx + cos(a) * R * 1.2, cy + sin(a) * R * 1.2, 4, C.ink); }
      HT.circle(g, cx, cy, round(R) + 3, C.ink); HT.circle(g, cx, cy, round(R) - 2, C.mist); HT.circle(g, cx, cy, round(R * 0.35), C.ink); HT.circle(g, cx, cy, round(R * 0.2), C.gold);
      for (let k = 0; k < 8; k++) { const a = k * PI / 4 + PI / 8; HT.thick(g, cx, cy, cx + cos(a) * R, cy + sin(a) * R, 2, C.ink); }
      for (let r = R + 10; r < R + 22; r += 5) for (let a = -0.9; a < -0.2; a += 0.02) HT.px(g, cx + cos(a) * r, cy + sin(a) * r, C.ink);
    },
    blackflash(g, w, h) {
      HT.rect(g, 0, 0, w, h, C.white);
      const cx = w * 0.45, cy = h * 0.52, star = [];
      for (let k = 0; k < 24; k++) { const a = k / 24 * 2 * PI, r = (k % 2 ? 0.22 : 0.5 + 0.2 * hash(k, 3)) * min(w, h); star.push([cx + cos(a) * r * 1.3, cy + sin(a) * r]); }
      HT.poly(g, star, C.ink);
      for (let b = 0; b < 7; b++) {
        let x = cx, y = cy, a = b / 7 * 2 * PI + 0.3;
        for (let s = 0; s < 6; s++) { const nx = x + cos(a) * 16, ny = y + sin(a) * 12; HT.thick(g, x, y, nx, ny, 4 - (s >> 1), C.ink); HT.line(g, x, y, nx, ny, C.red); x = nx; y = ny; a += (hash(b * 9 + s, 5) - 0.5) * 1.6; }
      }
      HT.circle(g, cx, cy, 5, C.white);
    },
    purple(g, w, h) {
      HT.vgrad(g, 0, 0, w, h, [[0, C.plum], [1, C.rose]]);
      const cx = w * 0.5, cy = h * 0.46, r = h * 0.56, gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, C.lavender); gr.addColorStop(0.8, C.violet); gr.addColorStop(1, 'rgba(144,94,169,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) { const bw = 4 + hash(i, 2) * 8, bh = 8 + hash(i, 4) * 22; HT.rect(g, i * w / 22, h - bh, bw, bh, C.ink); }
    },
    cut(g, w, h) {
      const t = HT.canvas(w, h), tg = t.g;
      HT.vgrad(tg, 0, 0, w, h, [[0, C.white], [1, C.mist]]);
      for (let i = 0; i < 14; i++) { const bw = w / 14, bh = h * (0.25 + 0.35 * hash(i, 29)); HT.rect(tg, i * bw, h - bh, bw - 2, bh, i % 3 ? C.charcoal : C.shadow); for (let y = h - bh + 4; y < h - 4; y += 6) HT.rect(tg, i * bw + 3, y, 2, 2, C.steel); }
      HT.rect(g, 0, 0, w, h, C.white);
      const cut = x => h * 0.78 - x * (h * 0.56) / w;
      for (let x = 0; x < w; x++) { const c = round(cut(x)); g.drawImage(t.c, x, 0, 1, max(1, c - 1), x - 9, -5, 1, max(1, c - 1)); g.drawImage(t.c, x, c + 1, 1, h - c - 1, x + 9, c + 6, 1, h - c - 1); }
    },
    scarf(g, w, h) {
      HT.vgrad(g, 0, 0, w, h, [[0, C.mist], [1, C.white]]);
      HT.rect(g, 0, round(h * 0.8), w, h, C.white);
      const pts = [], pts2 = [];
      for (let i = 0; i <= 20; i++) { const u = i / 20, x = w * (0.25 + 0.5 * u), y = h * (0.18 + 0.5 * u) + sin(u * 9) * 8; pts.push([x, y]); pts2.push([x + 5, y + 9]); }
      HT.poly(g, pts.concat(pts2.reverse()), C.shadow);
      const e0 = pts[pts.length - 1]; for (let k = 0; k < 4; k++) HT.line(g, e0[0] + k * 2, e0[1] + 2, e0[0] + k * 2 + 3, e0[1] + 9, C.shadow);
      snowDots(g, w, h, 31, C.lilacgrey, 34);
    },
    airport(g, w, h) {
      HT.vgrad(g, 0, 0, w, h, [[0, C.cream], [1, C.peach]]);
      const wy = round(h * 0.64);
      HT.vgrad(g, 0, 0, w, wy, [[0, C.sky], [0.7, C.ice], [1, C.white]]);
      for (let x = 0; x < w; x += 64) HT.rect(g, x, 0, 4, wy, C.dusk);
      HT.rect(g, 0, wy, w, 5, C.dusk); HT.rect(g, 0, round(wy * 0.5), w, 2, C.dusk);
      HT.rect(g, 0, wy + 5, w, h, C.sand);
      HT.rect(g, round(w * 0.12), round(h * 0.84), 120, 6, C.rosewood); HT.rect(g, round(w * 0.12) + 6, round(h * 0.84) + 6, 3, 10, C.rosewood); HT.rect(g, round(w * 0.12) + 110, round(h * 0.84) + 6, 3, 10, C.rosewood);
      HT.rig.draw(g, 'figure', w * 0.2, h * 0.95, HT.rig.POSES.stretchSide, h * 0.46, { face: 1, light: LIGHT_C });
      HT.rig.draw(g, 'gojo', w * 0.66, h * 1.02, HT.rig.POSES.backPockets, h * 0.66, { face: -1, light: LIGHT_C, costume: 'uniform' });
    },
  };
  cards.MOTIFS = MOTIFS;
  const MOTIF_ORDER = ['snow', 'signal', 'domains', 'wheel', 'cut', 'scarf'];
  const SILENT_PAIRS = [['gojo', 'sukuna'], ['blackflash', 'purple']]; // wordless "ma" tiers between the text tiers
  const MOTIF_KANA = { snow: ['シンシン', { vertical: true, col: C.white, scale: 2 }, 0.84, 0.12], sukuna: ['ゴゴゴ', { vertical: true, col: C.ink, outline: C.white, scale: 2 }, 0.86, 0.1], wheel: ['ガコン', { col: C.white, outline: C.ink, scale: 2, smooth: true }, 0.62, 0.1], blackflash: ['ドン', { col: C.white, outline: C.ink, outline2: C.white, scale: 3, smooth: true, bold: 1 }, 0.7, 0.12], scarf: ['ヒラ…', { col: C.ink, scale: 2 }, 0.68, 0.14] };
  function blitPoly(g, src, bx, by, poly) { g.save(); g.beginPath(); poly.forEach((q, j) => (j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.clip(); g.drawImage(src, bx, by); g.restore(); }
  function* creditPanel(g, poly, pageH, paint, toneOpts, mirror) { // colour-paint into a bbox canvas, tone it (page-locked), blit, border
    const bb = bboxOf(poly, W, pageH, 0);
    let t = HT.canvas(bb.w, bb.h);
    try { paint(t.g, bb.w, bb.h, bb); } catch (err) { // a broken dependency (e.g. a character mid-edit) must not kill the page
      HT.rect(t.g, 0, 0, bb.w, bb.h, C.white);
      if (!creditPanel.warned) { console.warn('[cards.credits] motif failed, left blank:', err && err.message); creditPanel.warned = true; }
    }
    yield;
    if (mirror) { const m = HT.canvas(bb.w, bb.h); m.g.translate(bb.w, 0); m.g.scale(-1, 1); m.g.drawImage(t.c, 0, 0); t = m; }
    if (toneOpts !== false) manga.tone(t.g, null, Object.assign({ ox: bb.x, oy: bb.y, auto: 0 }, toneOpts || {}));
    blitPoly(g, t.c, bb.x, bb.y, poly);
    drawBorder(g, poly, 3, C.ink, false, W, pageH);
    return bb;
  }
  function narration(g, poly, pageH, grp, tw) {
    HT.poly(g, poly, C.white); drawBorder(g, poly, 2, C.ink, false, W, pageH);
    const bb = bboxOf(poly, W, pageH, 0);
    let y = bb.y + 12;
    const x = bb.x + 16;
    for (const l of grp) {
      if (l.startsWith('#')) { const hd = l.replace(/^#\s*/, '').toUpperCase(), hw = manga.text(g, hd, x, y, { spacing: 2, col: C.ink }); HT.rect(g, x, y + 9, hw, 1, C.ink); y += 15; continue; }
      for (const ln of wrapText(l.toUpperCase(), tw - 30, { font: 'small' })) { manga.text(g, ln, x, y, { col: C.ink }); y += 11; }
    }
  }
  function* buildCredits(o) {
    const lines = (o.lines || cards.CREDIT_LINES).map(v => (v == null ? '' : String(v))), paper = paperOf(o.paper || 'white');
    const groups = []; let cur = [];
    for (const l of lines) { if (l === '') { if (cur.length) groups.push(cur); cur = []; } else cur.push(l); }
    if (cur.length) groups.push(cur);
    const titleGroup = groups.length && /DOMAIN\s*CLASH/i.test(groups[0][0]) ? groups.shift() : null;
    const finalGroup = groups.length > 1 ? groups.pop() : null;
    const M = 24, G = 12, CWd = W - 2 * M, textW = 272, motifW = CWd - G - textW, SL = 12;
    const measure = grp => { let h = 18; for (const l of grp) h += l.startsWith('#') ? 15 : wrapText(l.toUpperCase(), textW - 30, { font: 'small' }).length * 11; return h + 6; };
    const tiers = []; let y = M;
    tiers.push({ kind: 'header', y, h: 158 }); y += 158 + G;
    groups.forEach((grp, i) => {
      const h = max(124, measure(grp)); tiers.push({ kind: 'tier', y, h, grp, motif: MOTIF_ORDER[i % MOTIF_ORDER.length], flip: i % 2 === 1 }); y += h + G;
      const pair = SILENT_PAIRS[(i - 1) / 2];
      if (i % 2 === 1 && pair && i < groups.length - 1) { tiers.push({ kind: 'pair', y, h: 150, pair }); y += 150 + G; }
    });
    tiers.push({ kind: 'final', y, h: 240 }); y += 240 + M;
    const pageH = y, page = HT.canvas(W, pageH), g = page.g, live = [];
    HT.rect(g, 0, 0, W, pageH, paper);
    yield;
    for (const T of tiers) {
      if (T.kind === 'header') {
        const poly = [[M, T.y], [W - M, T.y], [W - M, T.y + T.h], [M, T.y + T.h]];
        const L = buildLogo('DOMAIN CLASH', 2, { mono: true });
        yield;
        yield* creditPanel(g, poly, pageH, (tg, w, h) => { HT.rect(tg, 0, 0, w, h, C.ink); drawLogo(tg, L, w / 2, h * 0.42, 1, 1, -1); }, {});
        yield;
        const bbx = [M + 3, T.y + 3, CWd - 6, T.h - 6], tmp = HT.canvas(bbx[2], bbx[3]);
        manga.focusLines(tmp.g, bbx[2] / 2, bbx[3] * 0.42, { beta: true, n: 120, inner: 58, aspect: 3.4, width: 5, jitter: 0.25, fps: 0, seed: 21 });
        g.drawImage(tmp.c, bbx[0], bbx[1]); // the beta flash's clear centre reveals the toned logo underneath
        yield;
        const sub = titleGroup ? (titleGroup[0].split(/—|–|-/)[1] || '').trim() : 'AN UNOFFICIAL FAN FILM';
        if (sub) { const sw = manga.textWidth(sub.toUpperCase(), { spacing: 2 }) + 24, bx = round(W / 2 - sw / 2), by = T.y + T.h - 36; const box = [[bx, by], [bx + sw, by], [bx + sw, by + 20], [bx, by + 20]]; HT.poly(g, box, C.white); drawBorder(g, box, 2, C.ink, false, W, pageH); manga.text(g, sub.toUpperCase(), W / 2, by + 7, { spacing: 2, align: 'center', col: C.ink }); }
        for (const extra of (titleGroup || []).slice(1)) { /* further title lines go under the header box */ manga.text(g, extra.toUpperCase(), W / 2, T.y + T.h + 2, { font: 'tiny', align: 'center', col: C.ink }); }
      } else if (T.kind === 'pair') { // two silent panels facing each other across a hard diagonal gutter
        const mid = W / 2, s2 = 16, HT_ = { mode: 'halftone', levels: [30, 80, 130, 230] };
        const L0 = [[M, T.y], [mid + s2 - G / 2, T.y], [mid - s2 - G / 2, T.y + T.h], [M, T.y + T.h]], R0 = [[mid + s2 + G / 2, T.y], [W - M, T.y], [W - M, T.y + T.h], [mid - s2 + G / 2, T.y + T.h]];
        const bl = yield* creditPanel(g, L0, pageH, (tg, w, h) => MOTIFS[T.pair[0]](tg, w, h), T.pair[0] === 'purple' ? HT_ : {});
        yield;
        const mirR = T.pair[1] === 'sukuna';
        const br = yield* creditPanel(g, R0, pageH, (tg, w, h) => MOTIFS[T.pair[1]](tg, w, h), T.pair[1] === 'purple' ? HT_ : {}, mirR);
        for (const [name, bb, mir] of [[T.pair[0], bl, false], [T.pair[1], br, mirR]]) { const mk = MOTIF_KANA[name]; if (mk) kana.draw(g, mk[0], bb.x + bb.w * (mir ? 1 - mk[2] - 0.06 : mk[2]), bb.y + bb.h * mk[3], Object.assign({ align: mk[1].vertical ? 'left' : 'center' }, mk[1])); }
      } else if (T.kind === 'tier') {
        const mx0 = T.flip ? M + textW + G : M, mx1 = mx0 + motifW, tx0 = T.flip ? M : M + motifW + G, tx1 = tx0 + textW;
        const s2 = SL / 2 * (T.flip ? -1 : 1);
        const mPoly = T.flip ? [[mx0 - s2, T.y], [mx1, T.y], [mx1, T.y + T.h], [mx0 + s2, T.y + T.h]] : [[mx0, T.y], [mx1 + s2, T.y], [mx1 - s2, T.y + T.h], [mx0, T.y + T.h]];
        const tPoly = T.flip ? [[tx0, T.y], [tx1 - s2, T.y], [tx1 + s2, T.y + T.h], [tx0, T.y + T.h]] : [[tx0 + s2, T.y], [tx1, T.y], [tx1, T.y + T.h], [tx0 - s2, T.y + T.h]];
        const bb = yield* creditPanel(g, mPoly, pageH, (tg, w, h) => MOTIFS[T.motif](tg, w, h), T.motif === 'purple' ? { mode: 'halftone', levels: [30, 80, 130, 230] } : {});
        const mk = MOTIF_KANA[T.motif];
        if (mk) kana.draw(g, mk[0], bb.x + bb.w * mk[2], bb.y + bb.h * mk[3], Object.assign({ align: mk[1].vertical ? 'left' : 'center' }, mk[1]));
        narration(g, tPoly, pageH, T.grp, textW);
        if (T.motif === 'snow' || T.motif === 'signal' || T.motif === 'scarf') live.push({ y0: T.y, y1: T.y + T.h, draw: liveSnow(mPoly, bb, T.motif === 'snow' ? C.white : C.ink, T.y) });
      } else {
        const poly = [[M, T.y], [W - M, T.y], [W - M, T.y + T.h], [M, T.y + T.h]];
        const bb = yield* creditPanel(g, poly, pageH, (tg, w, h) => MOTIFS.airport(tg, w, h), { levels: [36, 70, 110, 200] });
        kana.draw(g, 'シーン', bb.x + bb.w - 16, bb.y + 16, { align: 'right', scale: 3, col: C.white, outline: C.ink, smooth: true });
        if (finalGroup) { const ph = measure(finalGroup) - 4, pw2 = 300, box = [[bb.x + 14, bb.y + bb.h - ph - 14], [bb.x + 14 + pw2, bb.y + bb.h - ph - 14], [bb.x + 14 + pw2, bb.y + bb.h - 14], [bb.x + 14, bb.y + bb.h - 14]]; narration(g, box, pageH, finalGroup, pw2); }
        live.push({ y0: T.y, y1: T.y + T.h, draw: livePlane(poly, bb, o.dur || 50) });
      }
      yield;
    }
    return { canvas: page.c, h: pageH, live };
  }
  function clipPolyScreen(ctx, poly, dy) { ctx.beginPath(); poly.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1] - dy) : ctx.moveTo(q[0], q[1] - dy))); ctx.closePath(); ctx.clip(); }
  const liveSnow = (poly, bb, col, seed) => (ctx, t, sy) => {
    ctx.save(); clipPolyScreen(ctx, offsetPoly(poly, 3), sy);
    for (let i = 0; i < 34; i++) {
      const sp = 10 + 14 * hash(i, seed), x = bb.x + ((hash(i * 2, seed) * bb.w + sin(t * 1.3 + i) * 4) % bb.w + bb.w) % bb.w, y = bb.y + (hash(i * 2 + 1, seed) * bb.h + t * sp) % bb.h;
      HT.rect(ctx, round(x), round(y - sy), hash(i, seed + 1) < 0.3 ? 2 : 1, hash(i, seed + 1) < 0.3 ? 2 : 1, col);
    }
    ctx.restore();
  };
  const livePlane = (poly, bb, dur) => (ctx, t, sy) => { // a departing plane crosses the window during the last 14 s
    const u = clamp((t - (dur - 15)) / 13, 0, 1);
    if (u <= 0 || u >= 1) return;
    ctx.save(); clipPolyScreen(ctx, offsetPoly(poly, 3), sy);
    const x = bb.x + bb.w * lerp(0.05, 1.05, u), y = bb.y + bb.h * lerp(0.5, 0.08, u) - sy, a = -13 * D2R, ca = cos(a), sa = sin(a);
    const P = pts => pts.map(([px, py]) => [x + px * ca - py * sa, y + px * sa + py * ca]);
    HT.poly(ctx, P([[-20, -2], [16, -3], [22, 0], [16, 3], [-20, 3]]), C.ink);
    HT.poly(ctx, P([[-4, 0], [6, 0], [-6, 11], [-10, 11]]), C.ink);
    HT.poly(ctx, P([[-20, -2], [-15, -2], [-19, -10], [-22, -10]]), C.ink);
    ctx.restore();
  };
  const creditPages = HT.lru(2);
  HT.caches.push({ name: 'credits page', size: () => creditPages.size });
  const creditKey = o => JSON.stringify([o.lines || null, o.paper || null, o.dur || 50]);
  // generator for a scene's init(): builds the page in slices (≈ one panel per next())
  cards.creditsInit = (o = {}) => {
    const key = creditKey(o);
    return (function* () { if (creditPages.get(key)) return; const it = buildCredits(o); let r; while (!(r = it.next()).done) yield; creditPages.set(key, r.value); })();
  };
  // HT.cards.creditsPage(ctx, t, {lines, dur (50), hold0 (3 s at the top), hold1 (8 s on the last panel), paper,
  //   fadeIn, fadeOut, fadeCol}) — t = seconds since the credits began
  cards.creditsPage = (ctx, t, o = {}) => {
    const key = creditKey(o);
    let page = creditPages.get(key);
    if (!page) { const it = buildCredits(o); let r; while (!(r = it.next()).done); page = creditPages.set(key, r.value); }
    const dur = o.dur || 50, hold0 = o.hold0 === undefined ? 3 : o.hold0, hold1 = o.hold1 === undefined ? 8 : o.hold1;
    const u = clamp((t - hold0) / max(0.1, dur - hold0 - hold1), 0, 1), sy = round(HT.E.inOutSine(u) * max(0, page.h - H));
    HT.rect(ctx, 0, 0, W, H, C.white);
    ctx.drawImage(page.canvas, 0, -sy);
    for (const L of page.live) if (L.y1 - sy > 0 && L.y0 - sy < H) L.draw(ctx, t, sy);
    const fin = clamp(t / (o.fadeIn === undefined ? 1.2 : o.fadeIn), 0, 1), fout = clamp((dur - t) / (o.fadeOut === undefined ? 1.6 : o.fadeOut), 0, 1);
    if (fin < 1) HT.fx.fade(ctx, 1 - fin, o.fadeCol || C.white);
    if (fout < 1) HT.fx.fade(ctx, 1 - fout, o.fadeCol || C.ink);
    return { scroll: sy, pageH: page.h };
  };

  //@@PART5

  // ================================================================== LABS
  // shared: quantize an art canvas to the palette and upscale it by an integer factor (like HT.sheet)
  function labOut(art, scale, quantize) {
    if (quantize !== false) { const img = art.g.getImageData(0, 0, art.c.width, art.c.height); HT.quantize(img); art.g.putImageData(img, 0, 0); }
    const out = document.createElement('canvas');
    out.width = art.c.width * scale; out.height = art.c.height * scale;
    const og = out.getContext('2d'); og.imageSmoothingEnabled = false;
    og.drawImage(art.c, 0, 0, out.width, out.height);
    return out;
  }
  const label = (g, s, x, y, col) => HT.text(g, String(s).toUpperCase(), x, y, { font: 'tiny', col: col || C.foam });
  function busyBg(g, x, y, w, h, seed) { // deliberately noisy, colourful background (SFX legibility test)
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    HT.vgrad(g, x, y, w, h, [[0, C.navy], [0.35, C.purple], [0.65, C.rose], [1, C.amber]]);
    const r = HT.rng(seed);
    const cols = [C.ink, C.white, C.sky, C.red, C.gold, C.teal, C.shadow, C.ice, C.crimson, C.mist];
    for (let i = 0; i < 26; i++) { const c = cols[floor(r() * cols.length)], rx = x + r() * w, ry = y + r() * h, rr = 3 + r() * 16; if (r() < 0.5) HT.circle(g, rx, ry, rr, c); else HT.rect(g, rx - rr, ry - rr / 2, rr * 2, rr, c); }
    for (let i = 0; i < 14; i++) HT.line(g, x + r() * w, y + r() * h, x + r() * w, y + r() * h, cols[floor(r() * cols.length)]);
    g.restore();
  }
  // reference glyphs from the system Japanese font (lab-only verification aid; never drawn in the film).
  // Metric: both shapes are fitted (aspect kept) into a 32×32 box and binarised; score = symmetric chamfer distance
  // (mean distance from each ink pixel of one shape to the nearest ink pixel of the other, both ways). Lower = closer.
  const REF_FONT = '"MS Gothic","Yu Gothic","Meiryo","Noto Sans JP",sans-serif';
  const NB = 32;
  let STRETCH = false;
  function binFrom(canvas, w, h) {
    const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4] < 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, kx = (NB - 4) / (STRETCH ? bw : max(bw, bh)), ky = (NB - 4) / (STRETCH ? bh : max(bw, bh));
    const t = document.createElement('canvas'); t.width = NB; t.height = NB;
    const tg = t.getContext('2d'); tg.fillStyle = '#fff'; tg.fillRect(0, 0, NB, NB); tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
    tg.drawImage(canvas, x0, y0, bw, bh, NB / 2 - bw * kx / 2, NB / 2 - bh * ky / 2, bw * kx, bh * ky);
    const px = tg.getImageData(0, 0, NB, NB).data, b = new Uint8Array(NB * NB);
    for (let i = 0; i < NB * NB; i++) b[i] = px[i * 4] < 150 ? 1 : 0;
    // distance transform (chamfer 3-4, two passes)
    const D = new Float32Array(NB * NB);
    for (let i = 0; i < NB * NB; i++) D[i] = b[i] ? 0 : 1e6;
    for (let y = 0; y < NB; y++) for (let x = 0; x < NB; x++) { const i = y * NB + x; let v = D[i]; if (x > 0) v = min(v, D[i - 1] + 3); if (y > 0) { v = min(v, D[i - NB] + 3); if (x > 0) v = min(v, D[i - NB - 1] + 4); if (x < NB - 1) v = min(v, D[i - NB + 1] + 4); } D[i] = v; }
    for (let y = NB - 1; y >= 0; y--) for (let x = NB - 1; x >= 0; x--) { const i = y * NB + x; let v = D[i]; if (x < NB - 1) v = min(v, D[i + 1] + 3); if (y < NB - 1) { v = min(v, D[i + NB] + 3); if (x < NB - 1) v = min(v, D[i + NB + 1] + 4); if (x > 0) v = min(v, D[i + NB - 1] + 4); } D[i] = v; }
    return { b, D };
  }
  function chamfer(A, B) {
    let sa = 0, na = 0, sb = 0, nb = 0;
    for (let i = 0; i < NB * NB; i++) { if (A.b[i]) { sa += B.D[i]; na++; } if (B.b[i]) { sb += A.D[i]; nb++; } }
    return (sa / max(1, na) + sb / max(1, nb)) / 6; // chamfer units /3 → px; /2 for the mean of both directions
  }
  function refBin(ch) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#000';
    g.font = '52px ' + REF_FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 34);
    return binFrom(c, 64, 64);
  }
  function myBin(gl, dropMarks) {
    const s = 6, c = document.createElement('canvas'); c.width = gl.w * s + 4; c.height = 8 * s + 4;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
    for (let y = 0; y < 8; y++) for (let x = 0; x < gl.w; x++) if (gl.bits[y * gl.w + x] && !(dropMarks && y <= 2 && x >= 4)) g.fillRect(2 + x * s, 2 + y * s, s, s);
    return binFrom(c, c.width, c.height);
  }
  // confusion check. base/small: rank the system-font references of the group by chamfer distance. voiced: drop the
  // dakuten/handakuten zone (by construction the squeezed base never enters it) and rank against the plain base
  // references — the squeezed base must still read as its base (ガ→カ). pairs: the confusable pairs from the brief,
  // each glyph must be closer to its own reference than to its partner's.
  const UNVOICE = { 'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ', 'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ', 'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト', 'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ', 'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ', 'ヴ': 'ウ' };
  kana.PAIRS = [['シ', 'ツ'], ['ソ', 'ン'], ['シ', 'ン'], ['ツ', 'ソ'], ['ク', 'ケ'], ['ク', 'タ'], ['ケ', 'タ'], ['ウ', 'ワ'], ['ワ', 'フ'], ['ウ', 'フ'], ['ヌ', 'ス'], ['ロ', 'コ']];
  kana.verify = (stretch) => {
    STRETCH = !!stretch;
    const base = [...GLYPH.values()].filter(g => g.kind === 'base'), small = [...GLYPH.values()].filter(g => g.kind === 'small');
    const voiced = [...GLYPH.values()].filter(g => g.kind === 'voiced');
    const refs = new Map(); base.concat(small).forEach(g => refs.set(g.ch, refBin(g.ch)));
    const rankAgainst = (mine, target, pool) => {
      const ds = pool.map(ch => [refs.get(ch) && mine ? chamfer(mine, refs.get(ch)) : 99, ch]).sort((a, b) => a[0] - b[0]);
      const rank = ds.findIndex(s => s[1] === target) + 1, self = ds[rank - 1][0], other = ds[rank === 1 ? 1 : 0];
      return { rank, self: +self.toFixed(2), best: ds[0][1], bestD: +ds[0][0].toFixed(2), margin: +(other[0] - self).toFixed(2), runnerUp: other[1] };
    };
    const res = [];
    const bchars = base.map(g => g.ch), schars = small.map(g => g.ch);
    for (const g of base) res.push(Object.assign({ ch: g.ch, kind: 'base' }, rankAgainst(myBin(g), g.ch, bchars)));
    for (const g of small) res.push(Object.assign({ ch: g.ch, kind: 'small' }, rankAgainst(myBin(g), g.ch, schars)));
    for (const g of voiced) res.push(Object.assign({ ch: g.ch, kind: 'voiced', as: UNVOICE[g.ch] }, rankAgainst(myBin(g, true), UNVOICE[g.ch], bchars)));
    const pairs = kana.PAIRS.map(([a, b]) => {
      const ma = myBin(GLYPH.get(a)), mb = myBin(GLYPH.get(b));
      const aa = chamfer(ma, refs.get(a)), ab = chamfer(ma, refs.get(b)), bb = chamfer(mb, refs.get(b)), ba = chamfer(mb, refs.get(a));
      return { pair: a + '/' + b, ok: aa < ab && bb < ba, [a]: +aa.toFixed(2) + ' vs ' + ab.toFixed(2), [b]: +bb.toFixed(2) + ' vs ' + ba.toFixed(2) };
    });
    res.pairs = pairs;
    return res;
  };

  // ---- ?lab=manga: a synthetic colourful scene through tone() variants, line variants, swatches, perf
  function testScene(g, w, h, seed) {
    HT.vgrad(g, 0, 0, w, h * 0.62, [[0, C.navy], [0.45, C.blue], [0.8, C.sky], [1, C.peach]]);
    HT.glow(g, w * 0.8, h * 0.26, h * 0.3, C.amber, 0.55); HT.circle(g, w * 0.8, h * 0.26, h * 0.09, C.gold);
    for (let i = 0; i < 16; i++) { const bx = i * w / 16, bh = h * (0.12 + 0.2 * hash(i, 3)); HT.rect(g, bx, h * 0.62 - bh, w / 16 + 1, bh, C.dusk); }
    for (let i = 0; i < 5; i++) {
      const bx = w * (0.02 + i * 0.21), bw = w * 0.14, bh = h * (0.34 + 0.14 * hash(i, seed)), by = h * 0.64 - bh;
      HT.rect(g, bx, by, bw, bh, i % 2 ? C.charcoal : C.shadow); HT.rect(g, bx + bw - 3, by, 3, bh, C.ink);
      for (let yy = by + 5; yy < h * 0.6; yy += 7) for (let xx = bx + 4; xx < bx + bw - 6; xx += 6) HT.rect(g, xx, yy, 3, 3, hash(xx * 7 + yy, seed) < 0.3 ? C.gold : C.slate);
    }
    HT.rect(g, 0, h * 0.62, w, h * 0.38, C.slate);
    for (let i = 0; i < 9; i++) HT.rect(g, w * 0.1 + i * w * 0.09, h * 0.8, w * 0.05, h * 0.05, C.mist);
    HT.alpha(g, 0.35, () => HT.ellipse(g, w * 0.36, h * 0.93, 22, 4, C.ink));
    HT.rig.draw(g, 'gojo', w * 0.36, h * 0.93, HT.rig.POSES.guard, h * 0.55, { face: 1, light: [0.5, -0.5, 0.7], costume: 'fight' });
    HT.rig.draw(g, 'sukuna', w * 0.64, h * 0.93, HT.rig.POSES.loose, h * 0.5, { face: -1, light: [0.5, -0.5, 0.7] });
    HT.glow(g, w * 0.5, h * 0.55, 26, C.red, 0.7); HT.circle(g, w * 0.5, h * 0.55, 7, C.red); HT.circle(g, w * 0.5, h * 0.55, 3, C.white);
    HT.text(g, 'SHINJUKU', w * 0.05, h * 0.05, { col: C.white, shadow: C.ink });
  }
  manga.bench = () => { // ms per call on a 640×360 frame (median of 25 runs)
    const cv = HT.canvas(W, H), src = HT.canvas(W, H);
    testScene(src.g, W, H, 5);
    // (drawImage is deferred until the next pixel read, so flush the restore-copy before starting the clock)
    const med = f => { for (let i = 0; i < 8; i++) { cv.g.drawImage(src.c, 0, 0); f(); } const a = []; for (let i = 0; i < 25; i++) { cv.g.drawImage(src.c, 0, 0); cv.g.getImageData(0, 0, 1, 1); const t0 = performance.now(); f(); a.push(performance.now() - t0); } a.sort((x, y) => x - y); return +a[12].toFixed(2); };
    const copy = med(() => {});
    const r = {
      getPutOnly: med(() => cv.g.putImageData(cv.g.getImageData(0, 0, W, H), 0, 0)),
      toneFullFrame: med(() => manga.tone(cv.g, null, {})), toneHalftone: med(() => manga.tone(cv.g, null, { mode: 'halftone' })),
      toneNoEdges: med(() => manga.tone(cv.g, null, { edge: 0 })), focusLines: med(() => manga.focusLines(cv.g, W / 2, H / 2, { t: 0.3 })),
      betaFlash: med(() => manga.focusLines(cv.g, W / 2, H / 2, { beta: true, t: 0.3 })), speedLines: med(() => manga.speedLines(cv.g, 20, { t: 0.3 })),
      copyBaseline: copy,
    };
    const S = labS(0.8), fw = labWorld();
    r.panelsGrid4Overhead = med(() => manga.panels(cv.g, S, labPanelsEvent('grid4', false), () => {}));
    r.panelsGrid4WithWorld = med(() => manga.panels(cv.g, S, labPanelsEvent('grid4', false), fw(S)));
    r.fullFrameWorld = med(() => fw(S)(cv.g, Object.assign(HT.shots.medium(S, 0.8, { on: ['gojo', 'sukuna'] }), {})));
    r.sfxImpactCached = med(() => kana.sfx(cv.g, 'ドン', 320, 180, { style: 'impact', age: 0.5 }));
    return r;
  };
  HT.labs.manga = Q => {
    const scale = +(Q.get('scale') || 1), cwc = 320, chc = 180, cols = 3;
    const cells = [
      ['original', g => {}], ['tone levels (default)', g => manga.tone(g, null, { ox: 0 })], ['tone halftone', g => manga.tone(g, null, { mode: 'halftone' })],
      ['cream paper', g => manga.tone(g, null, { paper: 'cream' })], ['edges off', g => manga.tone(g, null, { edge: 0 })], ['inverted (impact)', g => manga.tone(g, null, { invert: true })],
      ['focus lines', g => { manga.tone(g, null, {}); manga.focusLines(g, cwc * 0.5, chc * 0.52, { t: 0.2, inner: 52 }); }],
      ['beta flash', g => { manga.tone(g, null, {}); manga.focusLines(g, cwc * 0.5, chc * 0.52, { beta: true, t: 0.2, inner: 58 }); }],
      ['speed 0 deg + clear zone', g => { manga.tone(g, null, {}); manga.speedLines(g, 0, { t: 0.2, clear: { x: cwc * 0.36, y: chc * 0.66, rx: 34, ry: 60 } }); }],
      ['speed -30 deg colour', g => manga.speedLines(g, -30, { t: 0.4, col: C.white, n: 50 })], ['focus colour white 12 lines', g => manga.focusLines(g, cwc * 0.7, chc * 0.4, { col: C.white, n: 40, t: 0.1 })],
      ['post.manga wipe p=0.5', g => HT.post.manga(g, null, { in: 0.2 }, 0.1, 1)],
    ];
    const rows = Math.ceil(cells.length / cols), sw = 360, swY = rows * (chc + 14) + 10;
    const art = HT.canvas(cols * (cwc + 8) + 8, swY + 70 + 60), g = art.g;
    g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
    cells.forEach(([name, fn], k) => {
      const x = 8 + (k % cols) * (cwc + 8), y = 12 + floor(k / cols) * (chc + 14);
      const cv = HT.canvas(cwc, chc);
      testScene(cv.g, cwc, chc, 5); fn(cv.g);
      g.drawImage(cv.c, x, y);
      label(g, name, x, y - 8, C.gold);
    });
    // swatches: the 5 tone levels and the halftone ramp
    label(g, 'TONE LEVELS 0..4 (L < 42 / 80 / 120 / 172) AND HALFTONE RAMP', 8, swY - 2, C.gold);
    for (let lv = 0; lv < 5; lv++) { const sw1 = HT.canvas(56, 40); HT.rect(sw1.g, 0, 0, 56, 40, HT.hex(...[20, 60, 100, 146, 220].map(v => [v, v, v])[lv])); HT.rect(sw1.g, 0, 0, 56, 1, C.mist); manga.tone(sw1.g, null, { edge: 0, auto: 0, ox: 8 + lv * 60, oy: swY + 8 }); g.drawImage(sw1.c, 8 + lv * 60, swY + 8); }
    const ramp = HT.canvas(sw + 300 - 60, 40); HT.hgrad(ramp.g, 0, 0, ramp.c.width, 40, [[0, '#000000'], [1, '#ffffff']]); manga.tone(ramp.g, null, { mode: 'halftone', edge: 0, auto: 0, ox: 316, oy: swY + 8 }); g.drawImage(ramp.c, 316, swY + 8);
    const b = manga.bench();
    window.__mangaPerf = b;
    console.log('manga perf', JSON.stringify(b));
    label(g, 'PERF (MEDIAN MS, 640X360): ' + Object.entries(b).map(([k, v]) => k + ' ' + v).join('  '), 8, swY + 56, C.mist);
    return labOut(art, scale);
  };

  // ---- ?lab=panels: every layout with a stand-in world renderer (projects a ground grid + both fighters through the
  //      panel's sub-camera, so the camera maths is exercised exactly as in the runner)
  function labS(t) {
    const pos = { gojo: [-1.4, 0, 0, 1.92], sukuna: [1.4, 0, 0, 1.75] };
    const S = { t, T: t, W, H, castNames: ['gojo', 'sukuna'], light: [0.5, -0.5, 0.7] };
    S.at = (n) => { const p = pos[n] || [0, 0, 0, 1.8]; return { x: p[0], y: p[1], z: p[2], h: p[3], face: [n === 'gojo' ? 1 : -1, 0] }; };
    S.pt = (ref) => { if (Array.isArray(ref)) return ref; if (ref === 'mid') return [0, 0, 0]; const [n, part] = String(ref).split('.'); const a = S.at(n); return [a.x, a.y, a.z + a.h * (part === 'head' ? 0.93 : part === 'chest' ? 0.72 : 0.5)]; };
    S.cam = HT.cam.make({}); S.project = (x, y, z) => HT.cam.project(S.cam, x, y, z);
    return S;
  }
  function labWorld() {
    return S => (g, cam) => {
      HT.cam.prep(cam); S.cam = cam; S.project = (x, y, z) => HT.cam.project(cam, x, y, z);
      const vw = cam.vw || W, vh = cam.vh || H, hz = HT.cam.project(cam, cam.x + Math.sin(cam.yaw) * 1e4, cam.y + Math.cos(cam.yaw) * 1e4, 0);
      const hy = hz ? round(hz.y) : vh / 2;
      HT.vgrad(g, 0, 0, vw, max(1, hy), [[0, C.indigo], [1, C.lavender]]);
      HT.rect(g, 0, max(0, hy), vw, vh - max(0, hy), C.charcoal);
      for (let gx = -12; gx <= 12; gx += 2) { const a = HT.cam.project(cam, gx, -8, 0), b = HT.cam.project(cam, gx, 30, 0); if (a && b) HT.line(g, a.x, a.y, b.x, b.y, C.slate); }
      for (let gy = -8; gy <= 30; gy += 2) { const a = HT.cam.project(cam, -12, gy, 0), b = HT.cam.project(cam, 12, gy, 0); if (a && b) HT.line(g, a.x, a.y, b.x, b.y, C.slate); }
      const tw = HT.cam.project(cam, 0, 16, 0), tt = HT.cam.project(cam, 0, 16, 14);
      if (tw && tt) HT.rect(g, tw.x - (tt.s * 3), tt.y, tt.s * 6, tw.y - tt.y, C.dusk);
      for (const n of ['gojo', 'sukuna']) {
        const a = S.at(n), p = HT.cam.project(cam, a.x, a.y, a.z);
        if (!p) continue;
        const right = [Math.cos(cam.yaw), -Math.sin(cam.yaw)], face = a.face[0] * right[0] + a.face[1] * right[1] >= 0 ? 1 : -1;
        HT.rig.draw(g, n, p.x, p.y, HT.rig.POSES[n === 'gojo' ? 'guard' : 'loose'], a.h * p.s, { face, light: S.light, key: 'lab' }); // cached like the runner's drawings
      }
    };
  }
  function labPanelsEvent(layout, tone) {
    const shots = [{ shot: 'medium', on: ['gojo', 'sukuna'] }, { shot: 'closeup', who: 'gojo', yaw: -0.2 }, { shot: 'closeup', who: 'sukuna', yaw: 0.25 }, { shot: 'wide', on: ['gojo', 'sukuna'], yaw: 0.5 }];
    const n = { split2: 2, diag: 2, split3: 3, grid4: 4, inset: 3, strip3v: 3 }[layout] || 2;
    const panels = [];
    for (let i = 0; i < n; i++) panels.push({ shot: shots[i % 4], slamAt: i * 0.2, tone: tone && i % 2 === 1, kana: i === 0 ? [{ kana: 'ドン', x: 0.78, y: 0.25, size: 3, style: 'impact' }] : undefined });
    if (layout === 'inset') { panels[1] = { bg: 'beta', slamAt: 0.2, kana: [{ kana: 'ゴゴゴ', size: 2, style: 'rumble', dur: 3 }] }; panels[2] = { shot: { shot: 'closeup', who: 'sukuna', yaw: 0.3 }, tone: true, slamAt: 0.4 }; }
    if (layout === 'diag') { panels[0].grade = { col: C.navy, mode: 'color', alpha: 0.85 }; panels[1].grade = { col: C.crimson, mode: 'color', alpha: 0.8 }; }
    return { t: 0, shot: 'panels', layout, panels, split: layout === 'diag' ? [[0, 0.5], [1, 0.62], [2, 0.4]] : undefined };
  }
  HT.labs.panels = Q => {
    const scale = +(Q.get('scale') || 1);
    const list = [['split2', 1.2, false], ['diag', 1.2, false], ['split3', 1.2, true], ['grid4', 1.2, true], ['inset', 1.2, false], ['strip3v', 1.2, true], ['grid4', 0.23, false], ['diag', 0.03, false]];
    const art = HT.canvas(2 * (W + 8) + 8, Math.ceil(list.length / 2) * (H + 14) + 12), g = art.g;
    g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
    const fw = labWorld();
    list.forEach(([layout, t, tone], k) => {
      const x = 8 + (k % 2) * (W + 8), y = 12 + floor(k / 2) * (H + 14);
      const cv = HT.canvas(W, H), S = labS(t);
      manga.panels(cv.g, S, labPanelsEvent(layout, tone), fw(S));
      g.drawImage(cv.c, x, y);
      label(g, layout + ' t=' + t + (tone ? ' (tone on odd panels)' : ''), x, y - 8, C.gold);
    });
    return labOut(art, scale);
  };

  // ---- ?lab=cards: act / place / title cards at several ages over a stand-in snowy dawn, and credits frames
  function dawnBg(g, w, h, t) {
    HT.vgrad(g, 0, 0, w, h * 0.62, [[0, C.navy], [0.35, C.indigo], [0.6, C.blue], [0.82, C.lavender], [1, C.salmon]]);
    for (let i = 0; i < 12; i++) { const bw = w / 12, bh = h * (0.2 + 0.3 * hash(i, 77)); HT.rect(g, i * bw, h * 0.62 - bh, bw - 3, bh, i % 2 ? C.indigo : C.shadow); for (let y = h * 0.62 - bh + 5; y < h * 0.6; y += 8) if (hash(i * 31 + y, 3) < 0.15) HT.rect(g, i * bw + 4, y, 3, 2, C.gold); }
    HT.rect(g, 0, h * 0.62, w, h * 0.38, C.lilacgrey);
    for (let i = 0; i < 10; i++) HT.rect(g, w * 0.08 + i * w * 0.086, h * 0.78, w * 0.05, h * 0.06, C.mist);
    HT.rect(g, w * 0.7, h * 0.3, 3, h * 0.33, C.charcoal); HT.rect(g, w * 0.7 - 10, h * 0.28, 22, 8, C.ink); HT.circle(g, w * 0.7 - 5, h * 0.28 + 4, 2, floor(t * 2) % 2 ? C.amber : C.shadow);
    for (let i = 0; i < 60; i++) HT.px(g, (hash(i, 5) * w + t * 9) % w, (hash(i, 6) * h + t * 22) % h, C.white);
  }
  HT.labs.cards = Q => {
    const scale = +(Q.get('scale') || 1), cwc = 320, chc = 180;
    const frames = [
      ['act 0.35', { card: 'act', text: 'ACT I', sub: 'The Strongest', dur: 4.5 }, 0.35], ['act 1.3', { card: 'act', text: 'ACT I', sub: 'The Strongest', dur: 4.5 }, 1.3],
      ['act II 2.5 bg black', { card: 'ACT II', sub: 'Domain War', dur: 4.5, bg: 'black' }, 2.5], ['place 0.8 typing', { card: 'place', text: 'SHINJUKU · DECEMBER 24 · 06:12', sub: 'Evacuation zone', dur: 4 }, 0.8],
      ['place 2.6', { card: 'place', text: 'SHINJUKU · DECEMBER 24 · 06:12', sub: 'Evacuation zone', dur: 4 }, 2.6], ['title 0.45 blade', { card: 'title', dur: 6.5 }, 0.45],
      ['title 1.0 halves', { card: 'title', dur: 6.5 }, 1.0], ['title 2.0 glint', { card: 'title', dur: 6.5 }, 2.0], ['title 3.5 hold', { card: 'title', dur: 6.5, sub: 'an unofficial fan film' }, 3.5],
    ];
    const cols = 2, rows = Math.ceil(frames.length / cols);
    const fullY = rows * (H + 14) + 12;
    const credT = [0.6, 9, 22, 36, 47.5], credY = fullY + H + 24;
    const art = HT.canvas(2 * (W + 8) + 8, credY + 2 * (chc + 14) + 20), g = art.g;
    g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
    frames.forEach(([name, e, age], k) => {
      const x = 8 + (k % cols) * (W + 8), y = 12 + floor(k / cols) * (H + 14);
      const full = HT.canvas(W, H);
      dawnBg(full.g, W, H, age); cards.draw(full.g, e, age, null);
      g.drawImage(full.c, x, y);
      label(g, name, x, y - 8, C.gold);
    });
    const full = HT.canvas(W, H); dawnBg(full.g, W, H, 3); cards.draw(full.g, { card: 'title', dur: 6.5, sub: 'an unofficial fan film' }, 3.0, null);
    g.drawImage(full.c, 8, fullY); label(g, 'title at 1:1, t=3.0', 8, fullY - 8, C.gold);
    const full2 = HT.canvas(W, H); dawnBg(full2.g, W, H, 3); cards.draw(full2.g, { card: 'act', text: 'ACT III', sub: 'Unlimited Void', dur: 4.5 }, 2.0, null); cards.draw(full2.g, { card: 'place', text: 'SHINJUKU · DECEMBER 24 · 12:40', dur: 4 }, 3.0, null);
    g.drawImage(full2.c, 0, 0, W, H, 16 + W, fullY, 320, 180); label(g, 'act III + place (half size)', 16 + W, fullY - 8, C.gold);
    const t0 = performance.now(); for (const it = cards.creditsInit({}); !it.next().done;) { /* warm */ } const buildMs = performance.now() - t0;
    credT.forEach((t, k) => {
      const x = 8 + (k % 3) * (cwc + 8), y = credY + floor(k / 3) * (chc + 14), cv = HT.canvas(W, H);
      const r = cards.creditsPage(cv.g, t, {});
      g.drawImage(cv.c, 0, 0, W, H, x, y, cwc, chc);
      label(g, 'credits t=' + t + ' scroll ' + r.scroll + '/' + (r.pageH - H), x, y - 8, C.gold);
    });
    window.__cardsPerf = { creditsBuildMs: +buildMs.toFixed(1) };
    label(g, 'CREDITS PAGE BUILD ' + buildMs.toFixed(1) + ' MS (SLICED VIA CREDITSINIT)', 8 + 2 * (cwc + 8), credY + (chc + 14) + 40, C.mist);
    return labOut(art, scale);
  };
  // ?lab=credits: the whole credits page at 1:1 (review sheet)
  HT.labs.credits = Q => {
    const scale = +(Q.get('scale') || 1);
    for (const it = cards.creditsInit({}); !it.next().done;) { /* build */ }
    const page = creditPages.get(creditKey({})), art = HT.canvas(W, page.h);
    art.g.drawImage(page.canvas, 0, 0);
    return labOut(art, scale);
  };

  HT.labs.kana = Q => {
    const scale = +(Q.get('scale') || 2), ref = Q.get('ref') !== '0';
    const glyphs = kana.chars();
    if (Q.get('part') === 'variants') { // smoothing / bold variants side by side (native pixels)
      const vars = [['smooth full, bold auto', { smooth: true }], ['smooth once, bold auto', { smooth: 'once' }], ['nearest, bold 1', { smooth: false, bold: 1 }], ['nearest, bold 0', { smooth: false, bold: 0 }], ['smooth once, bold 0', { smooth: 'once', bold: 0 }], ['smooth full, bold 0', { smooth: true, bold: 0 }]];
      const words = [['ドン', 'impact', 4], ['ゴゴゴ', 'rumble', 3], ['バキ', 'impact', 3], ['パリン', 'pop', 3]];
      const cw = 150, chh = 64, art = HT.canvas(words.length * cw + 8, vars.length * chh + 8), g = art.g;
      g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
      vars.forEach(([nm, vo], r) => words.forEach(([wd, st, sz], c) => {
        const x = 4 + c * cw, y = 4 + r * chh;
        busyBg(g, x, y, cw - 4, chh - 4, 70 + r * 5 + c);
        g.save(); g.beginPath(); g.rect(x, y, cw - 4, chh - 4); g.clip();
        kana.sfx(g, wd, x + (cw - 4) / 2, y + (chh - 4) / 2, Object.assign({ style: st, size: sz, age: 0.6, dur: 2, seed: 3, rot: 0 }, vo));
        g.restore(); if (c === 0) label(g, nm, x + 2, y + chh - 11, C.white);
      }));
      return labOut(art, scale);
    }
    if (Q.get('part') === 'sfx') { // zoomed review of the SFX styles: 4 ages each, native pixels
      const words = [['impact', 'ドン', 4, [0, 0.034, 0.1, 0.6]], ['impact', 'バキ', 3, [0.5]], ['rumble', 'ゴゴゴ', 3, [0.15, 0.5, 1.0]], ['slash', 'ザシュ', 3, [0.06, 0.3, 0.7]], ['ring', 'キィン', 3, [0.02, 0.2]], ['pop', 'シュン', 3, [0.03, 0.4]], ['impact', 'ズン', 5, [0.5]], ['pop', 'ツソシン', 3, [0.5]]];
      const cells = []; words.forEach(([st, wd, sz, ages]) => ages.forEach(a => cells.push([st, wd, sz, a])));
      const cw = 150, chh = 72, cols = 4, art = HT.canvas(cols * cw + 8, Math.ceil(cells.length / cols) * chh + 8), g = art.g;
      g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
      cells.forEach(([st, wd, sz, a], k) => {
        const x = 4 + (k % cols) * cw, y = 4 + floor(k / cols) * chh;
        busyBg(g, x, y, cw - 4, chh - 4, 40 + k);
        g.save(); g.beginPath(); g.rect(x, y, cw - 4, chh - 4); g.clip();
        kana.sfx(g, wd, x + (cw - 4) / 2, y + (chh - 4) / 2, { style: st, size: sz, age: a, dur: STY[st].dur, seed: 3 });
        g.restore(); label(g, st + ' ' + a, x + 2, y + chh - 11, C.white);
      });
      return labOut(art, scale);
    }
    if (Q.get('part') === 'diag') { // checker internals: normalised binaries, mine (left) vs reference (right)
      const list = (Q.get('chars') || 'スヌクタワフサヤ').split('');
      STRETCH = Q.get('stretch') === '1';
      const art = HT.canvas(list.length * 72 + 8, 44), g = art.g;
      g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
      list.forEach((ch, k) => {
        const A = myBin(GLYPH.get(ch)), B = refBin(ch);
        for (const [bin, dx] of [[A, 0], [B, 34]]) for (let i = 0; i < NB * NB; i++) HT.px(g, 4 + k * 72 + dx + (i % NB), 4 + floor(i / NB), bin.b[i] ? C.ink : C.cream);
        label(g, ch.codePointAt(0).toString(16) + ' ' + ROMAJI[ch], 4 + k * 72, 38, C.mist);
      });
      return labOut(art, scale, false);
    }
    if (Q.get('part') === 'table') { // zoomed review: raw ×4 bitmaps next to the system-font reference
      const cw = 68, chh = 42, cols = 12, rows = Math.ceil(glyphs.length / cols);
      const art = HT.canvas(cols * cw + 8, rows * chh + 8), g = art.g;
      g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
      glyphs.forEach((ch, k) => {
        const x = 4 + (k % cols) * cw, y = 4 + floor(k / cols) * chh;
        g.fillStyle = C.cream; g.fillRect(x, y, cw - 3, chh - 3);
        for (let yy = 0; yy < 8; yy++) HT.rect(g, x + 2, y + 2 + yy * 4, 1, 1, C.lilacgrey); // row ticks
        kana.draw(g, ch, x + 4, y + 2, { scale: 4, col: C.ink });
        if (ref) { g.fillStyle = C.dusk; g.font = '28px ' + REF_FONT; g.textBaseline = 'top'; g.fillText(ch, x + 34, y + 3); }
        label(g, ROMAJI[ch] || '', x + 2, y + chh - 9, C.rosewood);
      });
      return labOut(art, scale, false);
    }
    const CW = 78, CH = 40, COLS = 8, rowsT = Math.ceil(glyphs.length / COLS);
    const tableH = 20 + rowsT * CH;
    const sfxY = tableH + 16, sfxRows = 5, SW = 160, SH = 96;
    const vertY = sfxY + 18 + sfxRows * SH, vertH = 150;
    const drawY = vertY + vertH + 10, drawH = 70;
    const verY = drawY + drawH + 10, verH = 64;
    const art = HT.canvas(COLS * CW + 16, verY + verH);
    const g = art.g;
    g.fillStyle = '#2b2433'; g.fillRect(0, 0, art.c.width, art.c.height);
    label(g, 'KANA GLYPH TABLE - RAW X3 | SCALE3X X3 + OUTLINES' + (ref ? ' | SYSTEM FONT REFERENCE (LAB ONLY)' : ''), 8, 6, C.gold);
    glyphs.forEach((ch, k) => {
      const x = 8 + (k % COLS) * CW, y = 20 + floor(k / COLS) * CH;
      g.fillStyle = k % 2 ? '#3a3244' : '#342d3e'; g.fillRect(x, y, CW - 2, CH - 2);
      kana.draw(g, ch, x + 2, y + 2, { scale: 3, col: C.white });
      kana.draw(g, ch, x + 28, y + 2, { scale: 3, col: C.white, outline: C.ink, outline2: C.sky, smooth: true, ow: 1 });
      if (ref) { g.fillStyle = '#9babb2'; g.font = '22px ' + REF_FONT; g.textBaseline = 'top'; g.fillText(ch, x + 54, y + 3); }
      label(g, ROMAJI[ch] || ch.codePointAt(0).toString(16), x + 2, y + CH - 8, C.mist);
    });
    // SFX styles × ages over a busy background
    label(g, 'SFX STYLES OVER A BUSY BACKGROUND - AGES LEFT TO RIGHT', 8, sfxY, C.gold);
    const samples = [
      ['impact', 'ドン', { size: 4 }], ['rumble', 'ゴゴゴ', { size: 3 }], ['slash', 'ザシュ', { size: 3 }], ['ring', 'キィン', { size: 3 }], ['pop', 'ピキッ', { size: 3 }],
    ];
    samples.forEach(([style, word, o], r) => {
      const dur = STY[style].dur, ages = style === 'impact' ? [0.0, 0.034, 0.1, 0.6] : style === 'slash' ? [0.06, 0.3, dur - 0.2, dur - 0.08] : style === 'rumble' ? [0.15, 0.4, 1.0, dur - 0.1] : [0.02, 0.2, 0.5, dur - 0.05];
      ages.forEach((age, c) => {
        const x = 8 + c * SW, y = sfxY + 12 + r * SH;
        busyBg(g, x, y, SW - 4, SH - 4, 11 + r * 7 + c);
        g.save(); g.beginPath(); g.rect(x, y, SW - 4, SH - 4); g.clip();
        kana.sfx(g, word, x + (SW - 4) / 2, y + (SH - 4) / 2, Object.assign({ style, age, dur, seed: 5 }, o));
        g.restore();
        label(g, style + ' ' + word.length + 'CH T=' + age.toFixed(2), x + 2, y + SH - 11, C.white);
      });
    });
    // more words: rotation, vertical, colour overrides
    label(g, 'ROTATION / VERTICAL / MORE WORDS', 8, vertY - 12, C.gold);
    busyBg(g, 8, vertY, COLS * CW - 4, vertH, 99);
    const extra = [
      ['バキ', { style: 'impact', size: 3, rot: -18, age: 0.5 }, 70, 40], ['ドゴォ', { style: 'impact', size: 3, rot: 12, age: 0.5 }, 70, 110],
      ['ギィン', { style: 'ring', size: 3, rot: 30, age: 0.3 }, 210, 45], ['ズン', { style: 'impact', size: 5, rot: 0, age: 0.5, outline2: C.red }, 215, 112],
      ['シュン', { style: 'pop', size: 2, age: 0.5 }, 330, 30], ['ヒュン', { style: 'pop', size: 2, rot: -30, age: 0.5 }, 330, 70], ['パリン', { style: 'pop', size: 3, age: 0.5 }, 330, 118],
      ['ゴゴゴゴ', { style: 'rumble', size: 3, vertical: true, age: 1.0 }, 430, 75], ['ブワッ', { style: 'pop', size: 3, vertical: true, age: 0.5 }, 480, 75],
      ['ゾク', { style: 'pop', size: 3, age: 0.5, rot: 8 }, 560, 40], ['ビシッ', { style: 'impact', size: 3, age: 0.5, rot: -45 }, 560, 110],
    ];
    for (const [w0, o, ex, ey] of extra) kana.sfx(g, w0, 8 + ex, vertY + ey, Object.assign({ dur: 1.2, seed: 3 }, o));
    // static text: HT.kana.draw
    label(g, 'HT.KANA.DRAW - SCALE 1/2, OUTLINES, VERTICAL', 8, drawY - 2, C.gold);
    g.fillStyle = C.cream; g.fillRect(8, drawY + 8, COLS * CW - 4, drawH - 10);
    kana.draw(g, 'アイウエオ・カキクケコ・ガギグゲゴ・パピプペポ・ァィゥェォッャュョー！？〜…', 14, drawY + 12, { col: C.ink });
    kana.draw(g, 'ドドドドド！ギュイーン', 14, drawY + 26, { col: C.white, outline: C.ink, scale: 2 });
    kana.draw(g, 'シーン', 300, drawY + 26, { col: C.ink, scale: 2 });
    kana.draw(g, 'シュッ・ゴゴゴ…ヴヴヴ', 420, drawY + 12, { col: C.ink, vertical: true });
    kana.draw(g, 'ッャュョー', 440, drawY + 12, { col: C.ink, vertical: true });
    kana.draw(g, 'シツソン', 470, drawY + 12, { col: C.ink, scale: 2, vertical: true, spacing: 1 });
    // automatic confusion check
    const v = ref ? kana.verify(true) : [];
    const bad = v.filter(r => r.rank > 1);
    window.__kanaVerify = { total: v.length, rank1: v.length - bad.length, flagged: bad.map(r => `${r.ch}(${ROMAJI[r.ch]}${r.as ? '→' + r.as : ''}) rank ${r.rank}, best ${r.best}(${ROMAJI[r.best]}) ${r.bestD} vs self ${r.self}`),
      tight: v.filter(r => r.rank === 1 && r.margin < 0.15).map(r => `${r.ch}(${ROMAJI[r.ch]}) margin ${r.margin} over ${r.runnerUp}`), pairs: v.pairs || [] };
    console.log('kana verify', JSON.stringify(window.__kanaVerify));
    label(g, 'CONFUSION CHECK VS SYSTEM FONT (CHAMFER 32X32, ASPECT-NORMALISED): ' + (ref ? (v.length - bad.length) + '/' + v.length + ' RANK 1, PAIRS ' + v.pairs.filter(p => p.ok).length + '/' + v.pairs.length + ' OK' : 'OFF'), 8, verY, C.gold);
    bad.slice(0, 24).forEach((r, k) => { const x = 8 + (k % 6) * 104, y = verY + 10 + floor(k / 6) * 12; kana.draw(g, r.ch, x, y - 1, { col: C.salmon }); label(g, '> ' + ROMAJI[r.best] + ' #' + r.rank, x + 10, y + 1, C.salmon); });
    return labOut(art, scale);
  };
})();
