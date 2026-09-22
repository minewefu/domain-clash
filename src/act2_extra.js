/* DOMAIN CLASH — Act II extras (Domain War): staging constants and the act's own FX. Loads after props.js.
     HT.A2          world staging shared by the a2_* scenes (positions after Act I's walk-out, the shrine, the dome)
     FX simpleDomain   at*, r (2.4 m), erode (0..1 over the event: the eroded arc grows), erodeAt (radians: where the
                       intruder stands), speed — a pale ground ring with rotating rune ticks (Simple Domain)
     FX blossom        who ('gojo') | at, r (0.9 m), rate (flares/s) — Falling Blossom Emotion: pale petal-like flares
                       blooming around the body where the Shrine's slashes land (only shallow sparks get through)
     FX amplify        at* (e.g. 'sukuna.hand'), r (0.35 m) — Domain Amplification: dark flickering aura on the fists
     FX domeRake       center*, r*, rate (slashes/s, 14), hold — the Shrine cutting the Void's shell from outside:
                       hairline slashes flash across the dome's silhouette with sparks and short crack ticks
     FX shrineCollapse at* (shrine base), r (pool), back, h, dur — the Shrine sinking into crimson dust
     FX sealGlow       x/y (screen) | at, r (px) — a brief radial glow for a completed hand seal (≤ 3 frames bright)
     FX stopwatch      x, y (screen), from (seconds, e.g. 178), rate (1), col — a small digital readout M:SS
     FX screenSlash    x0, y0, x1, y1 (screen px) — a hairline cut flashing across a close-up */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const FX = (HT.FX = HT.FX || {});
  const clamp = HT.clamp, hash = HT.hash, floor = Math.floor, R = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI;

  // ------------------------------------------------------------------ staging (world metres; see SPEC §3.2)
  HT.A2 = {
    G0: [25.5, 10.2, 0], S0: [34.5, 10.2, 0],     // where Act I left them (walked out of the NE crater, facing south)
    DOME: [30, 10.2, 0],                          // the Void's dome is centred between them
    SHRINE: [54, 11, 0],                          // the barrierless Shrine rises behind Sukuna (east, on the avenue)
    SHRED1: 70, SHRED2: 130,                      // the Shrine's range (clash 1, then "maximum range" in clash 2)
    VIADUCT_X: -96,                               // where Sukuna lands on the expressway deck (a2_three)
  };
  // the watchers inside Rika (canon ch. 225 ff.): a loose ring of crates round the CRT tower's south side (room metres,
  // tower at the origin; see HT.SETS.command). A2.watchers({yuji: {...}}) merges per-scene changes into the ring.
  HT.A2.WATCHERS = [
    { who: 'kashimo', x: -3.3, y: -1.7, pose: 'stand' }, { who: 'hakari', x: -2.5, y: -2.9, pose: 'crossed' },
    { who: 'yuji', x: -1.1, y: -3.4, pose: 'sit' }, { who: 'yuta', x: 0.5, y: -3.6, pose: 'sit' },
    { who: 'kusakabe', x: 2.0, y: -3.1, pose: 'sit' }, { who: 'maki', x: 3.2, y: -1.9, pose: 'stand' },
    { who: 'generic', x: 2.3, y: 3.0, pose: 'sit' }, { who: 'generic', x: -2.1, y: 3.1, pose: 'stand' },
  ];
  HT.A2.watchers = mods => HT.A2.WATCHERS.map(w => Object.assign({}, w, (mods && mods[w.who]) || {}));
  // Mei Mei's crow feed: a high camera `dist` metres from `at` on bearing `brg` (radians from north), looking down at it
  HT.A2.crowFeed = (at, o) => {
    o = o || {};
    const dist = o.dist || 44, brg = o.brg === undefined ? -2.6 : o.brg, z = o.z || 24;
    const x = at[0] + Math.sin(brg) * dist, y = at[1] + Math.cos(brg) * dist;
    const cam = { x, y, z, yaw: Math.atan2(at[0] - x, at[1] - y), pitch: -Math.atan2(z - (at[2] || 0) - 1, dist), f: o.f || 300 };
    return Object.assign({ cam, env: { time: 'shrine', snow: 0.28 } }, o.feed || {});
  };

  const pj = (S, p) => (Array.isArray(p) ? S.project(p[0], p[1], p[2] || 0) : null);
  const at3 = (S, a, t) => (typeof a === 'string' ? S.pt(a, t) : a);
  const ring = (S, c, r, n, z) => { const out = []; for (let k = 0; k <= n; k++) { const a = k / n * PI * 2, q = S.project(c[0] + cos(a) * r, c[1] + sin(a) * r, z || 0.03); if (!q) return null; out.push([q.x, q.y]); } return out; };
  const stroke = (ctx, pts, col, w = 1) => { if (!pts || pts.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };

  // ------------------------------------------------------------------ Simple Domain
  FX.simpleDomain = {
    dur: 4, layer: 'ground', sfx: 'infinityHum', vol: 0.5,
    gbox(e, S) { const c = at3(S, e.at, e.t), O = HT.fxOcc; if (!c || !O) return null; const r = (e.r || 2.4) * 1.25; return O.box(S, [[c[0] - r, c[1] - r, 0], [c[0] + r, c[1] - r, 0], [c[0] - r, c[1] + r, 0], [c[0] + r, c[1] + r, 0]], 10); },
    draw(ctx, age, e, S) {
      const c = at3(S, e.at, e.t); if (!c) return;
      const r = e.r || 2.4, T = e.dur || 4, open = clamp(age / 0.25, 0, 1), fade = clamp((T - age) / 0.3, 0, 1);
      const erode = clamp(e.erode === undefined ? 0 : e.erode * (age / T), 0, 1), ea = e.erodeAt === undefined ? 0 : e.erodeAt;
      const rr = r * (0.6 + 0.4 * open), n = 64, ph = floor(age * 12) / 12 * (e.speed || 0.6);
      // the ring: skip the eroded arc (it grows from erodeAt), chewed edge ticks at its borders
      const arcHalf = erode * PI;
      let seg = [];
      const segs = [];
      for (let k = 0; k <= n; k++) {
        const a = k / n * PI * 2, da = Math.atan2(sin(a - ea), cos(a - ea));
        if (Math.abs(da) < arcHalf) { if (seg.length > 1) segs.push(seg); seg = []; continue; }
        const q = S.project(c[0] + cos(a) * rr, c[1] + sin(a) * rr, 0.03); if (!q) { seg = []; continue; }
        seg.push([q.x, q.y]);
      }
      if (seg.length > 1) segs.push(seg);
      ctx.save(); ctx.globalAlpha = 0.9 * fade;
      for (const sg of segs) { ctx.globalAlpha = 0.35 * fade; stroke(ctx, sg, C.sky, 6); ctx.globalAlpha = 0.9 * fade; stroke(ctx, sg, C.ice, 3); stroke(ctx, sg.map(p => [p[0], p[1] - 1]), C.white, 1); }
      // rune ticks rotating along the ring
      for (let k = 0; k < 24; k++) {
        const a = k / 24 * PI * 2 + ph, da = Math.atan2(sin(a - ea), cos(a - ea));
        if (Math.abs(da) < arcHalf + 0.1) continue;
        const q0 = S.project(c[0] + cos(a) * rr * 0.9, c[1] + sin(a) * rr * 0.9, 0.03), q1 = S.project(c[0] + cos(a) * rr * 0.97, c[1] + sin(a) * rr * 0.97, 0.03);
        if (q0 && q1) stroke(ctx, [[q0.x, q0.y], [q1.x, q1.y]], k % 3 ? C.sky : C.white, 1);
      }
      // sparks where the edge is being chewed
      if (erode > 0.01) for (const s of [-1, 1]) {
        const a = ea + s * arcHalf, q = S.project(c[0] + cos(a) * rr, c[1] + sin(a) * rr, 0.05);
        if (!q) continue;
        const f = floor(age * 30);
        for (let i = 0; i < 3; i++) { const h = hash(f * 7 + i * 13 + (s > 0 ? 5 : 0), 11); HT.px(ctx, R(q.x + (h - 0.5) * 8), R(q.y - h * 6), h > 0.5 ? C.white : C.ice); }
      }
      ctx.restore();
    },
  };

  // ------------------------------------------------------------------ Falling Blossom Emotion
  FX.blossom = {
    dur: 3, layer: 'front', follow: true, sfx: 'glassTinkle', vol: 0.4,
    draw(ctx, age, e, S) {
      const who = e.who || 'gojo', c = e.at ? at3(S, e.at, S.t) : S.pt(who + '.chest', S.t); if (!c) return;
      const p = pj(S, c); if (!p) return;
      const r = (e.r || 0.9) * p.s, rate = e.rate || 9, T = e.dur || 3, fade = clamp((T - age) / 0.4, 0, 1) * clamp(age / 0.2, 0, 1);
      // a faint pale aura (dithered ring) — the technique's shell
      ctx.save(); ctx.globalAlpha = 0.35 * fade;
      HT.circle(ctx, R(p.x), R(p.y), Math.max(2, R(r * 1.05)), C.mist);
      ctx.globalAlpha = 1; ctx.restore();
      // flares: each is a slash meeting the aura — a petal of light blooms at a point on the shell, then fades
      const n = floor(T * rate);
      for (let i = 0; i < n; i++) {
        const t0 = (i + hash(i, 3)) / rate, a = age - t0;
        if (a < 0 || a > 0.35) continue;
        const ang = hash(i, 5) * PI * 2, k = a / 0.35, px = p.x + cos(ang) * r, py = p.y + sin(ang) * r * 0.9;
        const L = (3 + 6 * (1 - k)) * Math.max(1, p.s / 60);
        ctx.save(); ctx.globalAlpha = (1 - k) * fade;
        for (let q = 0; q < 5; q++) { const b = ang + (q - 2) * 0.5, x1 = px + cos(b) * L, y1 = py + sin(b) * L; HT.line(ctx, R(px), R(py), R(x1), R(y1), q === 2 ? C.white : C.ice); }
        HT.px(ctx, R(px), R(py), C.white);
        ctx.restore();
      }
    },
  };

  // ------------------------------------------------------------------ Domain Amplification (dark aura on the fists)
  FX.amplify = {
    dur: 3, layer: 'front', follow: true,
    draw(ctx, age, e, S) {
      const pts = [].concat(e.at || ['sukuna.hand', 'sukuna.hand2']);
      const f = floor(age * 12);
      for (const ref of pts) {
        const c = at3(S, ref, S.t), p = pj(S, c); if (!p) continue;
        const r = Math.max(3, (e.r || 0.35) * p.s);
        for (let i = 0; i < 7; i++) {
          const h = hash(f * 17 + i * 3, 21), a = h * PI * 2, d = r * (0.3 + 0.7 * hash(f + i * 7, 22));
          const x = p.x + cos(a) * d, y = p.y + sin(a) * d * 0.8, len = r * (0.4 + 0.6 * hash(i + f * 5, 23));
          HT.line(ctx, R(x), R(y), R(x + cos(a) * len * 0.3), R(y - len), i % 3 ? C.ink : C.plum);
        }
        HT.px(ctx, R(p.x), R(p.y), C.plum);
      }
    },
  };

  // ------------------------------------------------------------------ the Shrine raking the Void's shell from outside
  FX.domeRake = {
    dur: 3, layer: 'front', sfx: false,
    occ(e, S) { const c = e.center || [0, 0, 0], r = e.r || 12, O = HT.fxOcc; return O ? { d: O.fwd(S, c) - r * 0.6, box: O.dome(S, c, r * 1.2, r * 1.2, 40) } : null; },
    draw(ctx, age, e, S) {
      const c = e.center || [0, 0, 0], r = e.r || 12, rate = e.rate || 14, T = e.dur || 3;
      const n = floor(T * rate), pc = pj(S, [c[0], c[1], c[2] || 0]); if (!pc) return;
      for (let i = 0; i < n; i++) {
        const t0 = (i + hash(i, 31)) / rate, a = age - t0;
        if (a < 0 || a > 0.22) continue;
        // a point on the dome (upper hemisphere), a slash tangent to it
        const th = hash(i, 32) * PI * 2, la = (0.15 + 0.7 * hash(i, 33)) * PI / 2;
        const X = c[0] + cos(th) * cos(la) * r, Y = c[1] + sin(th) * cos(la) * r, Z = (c[2] || 0) + sin(la) * r;
        const q = S.project(X, Y, Z); if (!q) continue;
        const L = (14 + 30 * hash(i, 34)) * Math.max(0.6, q.s / 30), an = hash(i, 35) * PI;
        const k = a / 0.22, vis = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
        ctx.save(); ctx.globalAlpha = vis;
        HT.line(ctx, R(q.x - cos(an) * L), R(q.y - sin(an) * L), R(q.x + cos(an) * L), R(q.y + sin(an) * L), k < 0.2 ? C.white : C.red);
        if (k < 0.3) for (let s = 0; s < 4; s++) { const h = hash(i * 9 + s, 36); HT.px(ctx, R(q.x + (h - 0.5) * 10), R(q.y + (hash(i * 5 + s, 37) - 0.5) * 8), h > 0.5 ? C.white : C.butter); }
        ctx.restore();
        // a crack tick that stays until the end (e.hold): the shell remembers the cuts
        if (e.hold) { ctx.save(); ctx.globalAlpha = 0.55; HT.line(ctx, R(q.x - cos(an + 0.4) * L * 0.25), R(q.y - sin(an + 0.4) * L * 0.25), R(q.x + cos(an + 0.4) * L * 0.25), R(q.y + sin(an + 0.4) * L * 0.25), C.lavender); ctx.restore(); }
      }
      if (e.hold) for (let i = 0; i < n; i++) { // earlier cracks persist faintly
        const t0 = (i + hash(i, 31)) / rate; if (age - t0 <= 0.22) continue;
        const th = hash(i, 32) * PI * 2, la = (0.15 + 0.7 * hash(i, 33)) * PI / 2;
        const q = S.project(c[0] + cos(th) * cos(la) * r, c[1] + sin(th) * cos(la) * r, (c[2] || 0) + sin(la) * r); if (!q) continue;
        const L = (4 + 8 * hash(i, 34)) * Math.max(0.6, q.s / 30), an = hash(i, 35) * PI + 0.4;
        ctx.save(); ctx.globalAlpha = 0.45; HT.line(ctx, R(q.x - cos(an) * L), R(q.y - sin(an) * L), R(q.x + cos(an) * L), R(q.y + sin(an) * L), C.lavender); ctx.restore();
      }
    },
  };

  // ------------------------------------------------------------------ the Shrine sinking into crimson dust
  FX.shrineCollapse = {
    dur: 2.4, layer: ['ground', 'behind'], sfx: 'domainCollapse', vol: 0.9, parts: true,
    occ(e, S) { const F = FX.shrineBloom; return F && F.occ ? F.occ(e, S) : null; },
    gbox(e, S) { const F = FX.shrineBloom; return F && F.gbox ? F.gbox(e, S, 9) : null; },
    draw(ctx, age, e, S) {
      const F = FX.shrineBloom; if (!F) return;
      const T = e.dur || 2.4, k = HT.E.inQuad(clamp(age / T, 0, 1));
      const base = pj(S, e.at || [0, 0, 0]); if (!base) return;
      if (S.fxLayer === 'ground') { // the crimson pool drains
        ctx.save(); ctx.globalAlpha = 1 - k; F.draw(ctx, 9, Object.assign({}, e, { sky: 0, slashes: 0, dur: 99 }), S); ctx.restore();
        return;
      }
      if (S.fxPart === 'tint') { F.draw(ctx, 9, Object.assign({}, e, { sky: 1 - k, slashes: 0, dur: 99 }), S); return; } // the fading red grade only
      const sink = k * (e.h || 20) * base.s;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * 2, base.y); ctx.clip();
      ctx.translate(0, R(sink));
      F.draw(ctx, 9, Object.assign({}, e, { sky: 1 - k, slashes: 0, dur: 99 }), S); // (S.fxPart 'body': the structure only)
      ctx.restore();
      // crimson dust and bone chips falling / rising
      const f = floor(age * 12), n = 40;
      for (let i = 0; i < n; i++) {
        const h = hash(i, 41), x = base.x + (h - 0.5) * (e.r || 22) * base.s * 0.9, life = (age * (0.6 + hash(i, 42)) + hash(i, 43)) % 1;
        const y = base.y - life * 90 * Math.max(0.5, base.s / 20) + sin(f * 0.7 + i) * 2;
        HT.px(ctx, R(x), R(y), i % 4 ? (i % 3 ? C.crimson : C.wine) : C.mist);
      }
    },
  };

  // ------------------------------------------------------------------ small graphic accents
  FX.sealGlow = {
    dur: 0.6, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      let x = e.x, y = e.y; if (e.at) { const p = pj(S, at3(S, e.at, e.t)); if (!p) return; x = p.x; y = p.y; }
      const k = age / (e.dur || 0.6), r = (e.r || 40) * (0.6 + 0.4 * k);
      ctx.save(); ctx.globalAlpha = (1 - k) * 0.8; HT.glow(ctx, x, y, r, e.col || C.ice, 0.6); ctx.restore();
      if (age < 0.1) { ctx.save(); ctx.globalAlpha = 0.9; HT.circle(ctx, R(x), R(y), Math.max(2, R(r * 0.18)), C.white); ctx.restore(); }
    },
  };
  // a hairline cut in screen space (for close-ups, where the subject is a bust rather than a world figure)
  FX.screenSlash = {
    dur: 0.5, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const k = age / (e.dur || 0.5), x0 = e.x0, y0 = e.y0, x1 = e.x1, y1 = e.y1;
      const grow = Math.min(1, age / 0.06), xe = x0 + (x1 - x0) * grow, ye = y0 + (y1 - y0) * grow;
      ctx.save(); ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
      HT.line(ctx, R(x0), R(y0), R(xe), R(ye), k < 0.25 ? C.white : C.ice);
      if (k < 0.2) { HT.line(ctx, R(x0), R(y0) - 1, R(xe), R(ye) - 1, C.white); HT.px(ctx, R(xe), R(ye), C.white); }
      ctx.restore();
    },
  };
  FX.stopwatch = {
    dur: 4, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const sec = Math.max(0, floor((e.from || 178) + age * (e.rate || 1)));
      const txt = floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
      HT.text(ctx, txt, e.x || W - 60, e.y || 20, { col: e.col || C.red, scale: e.scale || 2, align: 'center', shadow: C.ink });
    },
  };
})();
