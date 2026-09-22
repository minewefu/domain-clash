/* DOMAIN CLASH — small story props and extra FX used by the acts (loads after fx.js; adds to HT.FX, never resets it).
     HT.props.crow(ctx, x, y, px, t, o)   a perched crow (Mei Mei's feed): head turns, eye glint, optional take-off
     HT.props.can(ctx, x, y, px, roll)    an empty drink can lying on its side (roll = rotation angle)
     FX 'cloth'   a garment dropped or carried off by the wind (robe / haori / scarf), world-space, pure function of age
     FX 'can'     the can rolling across the asphalt between the fighters (from → to, decelerating, bounces)
     FX 'crow'    the crow as an FX (at, turnAt, flyAt)
     SET 'office' a dark office floor inside a falling tower half (tilted horizon, desks, windows, a door) */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const props = (HT.props = HT.props || {});
  const R = Math.round;

  // ------------------------------------------------------------------ crow
  props.crow = (ctx, x, y, px, t, o = {}) => {
    const s = px / 16; // design units: a crow ≈ 16 units tall incl. legs
    const P = (u, v) => [R(x + u * s * (o.face || 1)), R(y - v * s)];
    const fly = o.fly || 0; // 0 perched → 1 in the air
    const ink = C.ink, sh = C.shadow;
    if (fly <= 0 && px < 40) { // far: the simple silhouette
      HT.line(ctx, ...P(-1, 0), ...P(-1, 3), sh); HT.line(ctx, ...P(1, 0), ...P(1, 3), sh);
      HT.poly(ctx, [P(-4, 5), P(1, 10.5), P(4, 8.5), P(2, 3), P(-2, 3)], ink);
      HT.poly(ctx, [P(-3, 4.5), P(-7.5, 0), P(-6.5, -0.5), P(-1.5, 3)], ink);
      const turn = o.turn || 0, hx = 3.2 - turn * 1.2;
      HT.circle(ctx, ...P(hx, 11.8), Math.max(1, R(2.4 * s)), ink);
      HT.poly(ctx, [P(hx + 1.6, 12.6), P(hx + 5.4 - turn * 2.2, 11.4), P(hx + 1.6, 10.8)], ink);
      const glint = o.glint || 0;
      HT.px(ctx, ...P(hx + 0.9 - turn * 0.6, 12.3), glint > 0 ? (glint > 0.5 ? C.white : C.ice) : C.dusk);
      if (glint > 0.2) HT.glow(ctx, ...P(hx + 0.8, 12.2), 3 * s * glint, C.ice, 0.35 * glint);
    } else if (fly <= 0) {
      // close: a large-billed crow (ハシブトガラス, Tokyo's city crow) — steep forehead, thick arched bill, body at ~40°,
      // folded wing with scalloped primaries, tail hanging below the perch; blue-black sheen in indigo on the lit side
      const turn = o.turn || 0, glint = o.glint || 0;
      // legs + toes gripping the perch
      HT.poly(ctx, [P(-0.9, 3.2), P(-0.3, 3.2), P(-0.2, 0), P(-0.8, 0)], sh);
      HT.poly(ctx, [P(0.9, 3.2), P(1.5, 3.2), P(1.5, 0), P(0.9, 0)], sh);
      HT.poly(ctx, [P(-1.8, 0.4), P(0.6, 0.4), P(0.6, -0.3), P(-1.8, -0.3)], sh);
      HT.poly(ctx, [P(0.2, 0.4), P(2.6, 0.4), P(2.6, -0.3), P(0.2, -0.3)], sh);
      // tail (behind), then body
      HT.poly(ctx, [P(-3.2, 5.2), P(-8.8, -0.2), P(-7.9, -1.3), P(-6.6, -0.6), P(-1.2, 3.4)], ink);
      HT.line(ctx, ...P(-3.4, 4.2), ...P(-8.2, -0.6), C.shadow);
      HT.poly(ctx, [P(-4.2, 5.4), P(-2.6, 8.8), P(0.2, 10.6), P(2.6, 10.4), P(4.1, 8.4), P(3.7, 5.6), P(2.2, 3.2), P(-0.6, 2.8), P(-2.8, 3.6)], ink);
      // chest/throat hackles (rough edge) and belly shade
      HT.poly(ctx, [P(3.2, 9.6), P(4.3, 8.3), P(4.0, 6.6), P(3.4, 7.3), P(3.7, 8.4)], C.shadow);
      // folded wing: coverts, then primaries with scalloped tips reaching the tail
      HT.poly(ctx, [P(1.6, 9.4), P(-1.6, 8.9), P(-4.4, 6.2), P(-6.2, 3.2), P(-5.2, 2.9), P(-2.4, 4.2), P(0.6, 5.2), P(2.4, 7.2)], C.shadow);
      HT.line(ctx, ...P(1.4, 9.2), ...P(-3.6, 6.9), C.indigo);            // sheen along the wing's leading edge
      HT.line(ctx, ...P(-0.2, 8.4), ...P(-4.8, 5.2), C.indigo);
      for (let k = 0; k < 4; k++) HT.line(ctx, ...P(-1.2 - k * 1.2, 5.6 - k * 0.7), ...P(-2.6 - k * 1.2, 4.6 - k * 0.8), C.ink); // primary edges
      HT.line(ctx, ...P(2.2, 10.1), ...P(0.2, 10.2), C.indigo);            // nape sheen
      // head: round crown with a steep forehead; the head turns toward the camera (profile → three-quarter)
      const hx = 3.0 - turn * 1.1, hy = 12.0;
      HT.circle(ctx, ...P(hx, hy), Math.max(2, R(2.5 * s)), ink);
      HT.poly(ctx, [P(hx - 1.6, hy - 1.8), P(hx + 1.8, hy - 2.2), P(hx + 2.2, hy - 0.4), P(hx - 1.2, hy - 0.6)], ink); // throat
      HT.line(ctx, ...P(hx - 1.0, hy + 2.2), ...P(hx + 1.2, hy + 2.4), C.indigo); // crown sheen
      // bill: thick, arched culmen, slight hook; foreshortened as the head turns
      const bl = 4.6 - turn * 2.4;
      HT.poly(ctx, [P(hx + 1.6, hy + 1.7), P(hx + 1.6 + bl * 0.55, hy + 1.3), P(hx + 1.6 + bl, hy - 0.1), P(hx + 1.6 + bl * 0.92, hy - 0.6), P(hx + 1.7, hy - 1.1)], ink);
      HT.line(ctx, ...P(hx + 1.8, hy + 1.5), ...P(hx + 1.6 + bl * 0.6, hy + 1.1), C.dusk); // culmen highlight
      HT.line(ctx, ...P(hx + 1.8, hy - 0.2), ...P(hx + 1.5 + bl * 0.8, hy - 0.3), C.shadow); // gape line
      // eye: dark with a rim; the glint is the watchers' feed switching on
      const ex = hx + 0.9 - turn * 0.5, ey = hy + 0.5;
      HT.circle(ctx, ...P(ex, ey), Math.max(1, R(0.7 * s)), C.shadow);
      HT.circle(ctx, ...P(ex, ey), Math.max(1, R(0.45 * s)), ink);
      HT.px(ctx, ...P(ex + 0.25, ey + 0.25), glint > 0 ? (glint > 0.5 ? C.white : C.ice) : C.dusk);
      if (glint > 0.2) HT.glow(ctx, ...P(ex, ey), 3 * s * glint, C.ice, 0.35 * glint);
    } else {
      // in flight: wings up/down on a 12 fps flap
      const fl = Math.floor(t * 12) % 4, up = fl < 2 ? 1 : -1;
      HT.poly(ctx, [P(-5, 6), P(3, 9), P(6, 8), P(3, 5), P(-4, 5)], ink);
      HT.poly(ctx, [P(-1, 7), P(-5, 7 + up * 7), P(2, 8)], ink);
      HT.circle(ctx, ...P(6, 8.5), Math.max(1, R(2.2 * s)), ink);
    }
  };
  // ------------------------------------------------------------------ can
  props.can = (ctx, x, y, px, roll) => {
    const r = Math.max(1, px * 0.33), L = px;
    const ca = Math.cos(roll), band = (Math.abs(ca) < 0.5);
    HT.rect(ctx, R(x - L / 2), R(y - 2 * r), R(L), R(2 * r), C.steel);
    HT.rect(ctx, R(x - L / 2), R(y - 2 * r), R(L), Math.max(1, R(r * 0.5)), C.mist);
    HT.rect(ctx, R(x - L / 2 + L * 0.2), R(y - 2 * r), Math.max(1, R(L * 0.45)), R(2 * r), band ? C.red : C.crimson);
    HT.rect(ctx, R(x - L / 2), R(y - 2 * r), 1, R(2 * r), C.lilacgrey); HT.rect(ctx, R(x + L / 2 - 1), R(y - 2 * r), 1, R(2 * r), C.lilacgrey);
    HT.hline(ctx, R(x - L / 2), R(x + L / 2), R(y), C.ink);
  };

  // ------------------------------------------------------------------ FX additions (registered into the shared library)
  HT.FX = HT.FX || {};
  const proj = (S, p) => (Array.isArray(p) ? S.project(p[0], p[1], p[2] || 0) : null);
  // a garment: starts at `at` (world). drop (default): a long coat slips off and falls in ~0.75 s (drag-reduced gravity),
  // the hem lands first and the coat folds into a heap. carry: a haori caught by the wind — T-shaped (sleeves spread),
  // turning and fluttering as it drifts away with e.wind [vx, vy] m/s and rises by e.lift m. Pure function of age.
  HT.FX.cloth = {
    dur: 6, layer: 'front',
    draw(ctx, age, e, S) {
      const at = typeof e.at === 'string' ? S.pt(e.at, e.t) : e.at, wind = e.wind || [1.2, 0];
      const col = e.col || C.mist, dark = e.col2 || HT.mix(col, C.ink, 0.35), lin = HT.mix(col, C.ink, 0.18);
      const size = e.size || 1.25, gnd = e.ground || 0.02, ph = age * (e.flutter || 7);
      if (e.carry || e.drop === false) {
        const x = at[0] + wind[0] * age, y = at[1] + (wind[1] || 0) * age;
        const z = Math.max(gnd + 0.3, at[2] + (e.lift || 0) * Math.sin(Math.min(age, 3) * 0.9) + 0.25 * age - 0.02 * age * age);
        const p = S.project(x, y, z); if (!p) return;
        const sc = p.s, th = 0.45 * Math.sin(age * 1.6) + 0.18 * age;
        const ct = Math.cos(th), st = Math.sin(th);
        const Q = (u, v, k) => { const wv = Math.sin(ph + u * 3.1 + v * 2.3) * 0.07 * k; const uu = u + wv, vv = v + Math.cos(ph * 0.8 + u * 2) * 0.05 * k; return [p.x + (uu * ct - vv * st) * sc, p.y - (uu * st + vv * ct) * sc]; };
        const hw = 0.32 * size / 1.25, hh = 0.55 * size / 1.25, sl = 0.36 * size / 1.25;
        // sleeves (spread by the wind), body, open front showing the lining
        HT.poly(ctx, [Q(-hw, hh, 0.4), Q(-hw - sl, hh - 0.02, 1), Q(-hw - sl * 0.95, hh - 0.36, 1.2), Q(-hw, hh - 0.34, 0.6)], dark);
        HT.poly(ctx, [Q(hw, hh, 0.4), Q(hw + sl, hh - 0.02, 1), Q(hw + sl * 0.95, hh - 0.36, 1.2), Q(hw, hh - 0.34, 0.6)], dark);
        HT.poly(ctx, [Q(-hw, hh, 0.3), Q(hw, hh, 0.3), Q(hw * 1.1, -hh, 1.4), Q(0, -hh * 1.05, 1.6), Q(-hw * 1.1, -hh, 1.4)], col);
        HT.poly(ctx, [Q(-0.05, hh, 0.3), Q(0.05, hh, 0.3), Q(0.1, -hh, 1.4), Q(-0.08, -hh, 1.4)], lin);
        for (let k = -1; k <= 1; k += 2) { const a0 = Q(k * hw * 0.5, hh * 0.8, 0.5), a1 = Q(k * hw * 0.62, -hh * 0.9, 1.4); HT.line(ctx, a0[0], a0[1], a1[0], a1[1], dark); }
        return;
      }
      // drop: fall time from the collar height with drag-reduced gravity; the hem lands first, then the coat heaps up
      const gEff = 6.5, len = 1.2 * size / 1.25, top0 = at[2];
      const fallTop = Math.max(0, top0 - 0.5 * gEff * age * age);           // collar height over time
      const hemZ = Math.max(gnd, fallTop - len);
      const heapU = HT.smooth(HT.clamp((len - fallTop) / Math.max(0.01, len - 0.18), 0, 1)); // 0 hanging → 1 heap
      const x = at[0] + wind[0] * Math.min(age, 1.2) * 0.12, y = at[1] + (wind[1] || 0) * Math.min(age, 1.2) * 0.12;
      const p = S.project(x, y, hemZ); if (!p) return;
      const sc = p.s;
      const hTop = Math.max(0.16, fallTop - hemZ) * sc;                     // current on-screen height of the garment
      const wHem = (0.62 + 0.16 * heapU) * sc * size / 1.25, wSh = (0.52 + 0.24 * heapU) * sc * size / 1.25;
      const sway = (1 - heapU) * Math.sin(ph) * 0.04 * sc;
      const X = p.x, Y = p.y;
      if (heapU < 0.98) { // hanging / collapsing coat: shoulders, sleeves, open front, folds
        HT.poly(ctx, [[X - wSh / 2 + sway, Y - hTop], [X + wSh / 2 + sway, Y - hTop], [X + wHem / 2, Y], [X - wHem / 2, Y]], col);
        HT.poly(ctx, [[X - wSh / 2 + sway, Y - hTop], [X - wSh / 2 - 0.08 * sc + sway, Y - hTop * 0.4], [X - wSh / 2 + 0.05 * sc, Y - hTop * 0.35]], dark);
        HT.poly(ctx, [[X + wSh / 2 + sway, Y - hTop], [X + wSh / 2 + 0.08 * sc + sway, Y - hTop * 0.4], [X + wSh / 2 - 0.05 * sc, Y - hTop * 0.35]], dark);
        HT.poly(ctx, [[X - 0.04 * sc + sway, Y - hTop], [X + 0.04 * sc + sway, Y - hTop], [X + 0.06 * sc, Y], [X - 0.05 * sc, Y]], lin);
        for (let k = 1; k < 4; k++) { const u = k / 4 - 0.5; HT.line(ctx, X + u * wSh + sway, Y - hTop * 0.85, X + u * wHem * 1.05, Y - 1, dark); }
      }
      if (heapU > 0.02) { // the heap: a low, bumpy mound with fold shadows and a sleeve poking out
        const k = heapU, wH = wHem * 0.95, hH = Math.max(2, 0.24 * sc * k);
        const pts = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8, bump = 0.55 + 0.45 * Math.sin(u * Math.PI) + 0.18 * Math.sin(u * 17 + 1.3); pts.push([X - wH / 2 + wH * u, Y - hH * bump]); }
        pts.push([X + wH / 2, Y + 1], [X - wH / 2, Y + 1]);
        HT.poly(ctx, pts, col);
        HT.poly(ctx, [[X + wH * 0.35, Y - hH * 0.3], [X + wH * 0.62, Y - hH * 0.1], [X + wH * 0.6, Y + 1], [X + wH * 0.3, Y + 1]], dark); // sleeve
        for (let i = 1; i < 4; i++) { const u = i / 4 - 0.5; HT.line(ctx, X + u * wH, Y - hH * 0.8, X + u * wH + 0.05 * sc, Y, dark); }
        HT.hline(ctx, Math.round(X - wH / 2), Math.round(X + wH / 2), Math.round(Y - hH * 0.95), HT.mix(col, C.white, 0.35));
      }
    },
  };
  // Rabbit Escape (Act IV): a swarm of rabbits pops out of a shadow at e.from, hops along curved paths, circles e.to
  // (chars_shiki.js draws it; e.split 'behind'|'front' lets it wrap around a character — register twice for both layers)
  HT.FX.rabbitSwarm = { dur: 4, layer: 'front', sfx: 'rabbitSwarm', draw(ctx, age, e, S) { if (HT.shiki && HT.shiki.swarm) HT.shiki.swarm(ctx, S, e, age); } };
  HT.FX.rabbitSwarmBack = { dur: 4, layer: 'behind', draw(ctx, age, e, S) { if (HT.shiki && HT.shiki.swarm) HT.shiki.swarm(ctx, S, Object.assign({}, e, { split: 'behind' }), age); } };
  // the can: rolls from `from` to `to` (world, on the ground), decelerating (ease-out), small bounces at the start
  HT.FX.can = {
    dur: 4, layer: 'ground', sfx: 'canRoll',
    draw(ctx, age, e, S) {
      const d = e.roll || e.dur || 4, u = HT.E.outCubic(HT.clamp(age / d, 0, 1)); // e.roll: rolling time (the can then lies still until e.dur)
      const x = HT.lerp(e.from[0], e.to[0], u), y = HT.lerp(e.from[1], e.to[1], u);
      const bounce = Math.max(0, 0.15 * Math.abs(Math.sin(age * 9)) * (1 - age / 0.9));
      const p = S.project(x, y, bounce); if (!p) return;
      const dist = Math.hypot(e.to[0] - e.from[0], e.to[1] - e.from[1]) * u;
      props.can(ctx, p.x, p.y, Math.max(2, 0.12 * p.s), dist / 0.033);
      HT.alpha(ctx, 0.3, () => HT.ellipse(ctx, p.x, p.y + 1, Math.max(2, 0.08 * p.s), 1, C.ink));
    },
  };
  HT.FX.crow = {
    dur: 30, layer: 'front',
    draw(ctx, age, e, S) {
      const at = e.at, fly = e.flyAt !== undefined && age > e.flyAt ? Math.min(1, (age - e.flyAt) * 2) : 0;
      const up = fly ? (age - e.flyAt) : 0;
      const p = S.project(at[0] + up * 3, at[1], at[2] + up * up * 1.5); if (!p) return;
      const turn = e.turnAt !== undefined ? HT.clamp((age - e.turnAt) / 0.25, 0, 1) : 0;
      const glint = e.glintAt !== undefined ? Math.max(0, 1 - Math.abs(age - e.glintAt) / 0.5) : 0;
      props.crow(ctx, p.x, p.y, Math.max(6, 0.45 * p.s), S.t, { turn, glint, fly, face: e.face || -1 });
    },
  };

  // ------------------------------------------------------------------ SET 'office': a floor inside the falling tower half
  // the whole room tilts (roll grows with time since opts.fallAt); a door stands between the fighters at opts.doorX
  HT.SETS.office = {
    init() { return {}; },
    draw(ctx, c, S) {
      const o = (S.sc && S.sc.fightDef.setOpts) || {}, t = S.t;
      const roll = (o.roll0 || 0) + (o.rollRate || 0) * Math.max(0, t - (o.fallAt || 0));
      const g = ctx;
      g.save();
      g.translate(W / 2, H / 2); g.rotate(roll); g.translate(-W / 2, -H / 2);
      HT.rect(g, -W, -H, W * 3, H * 3, C.ink);
      // window band: tilted dawn sky beyond the glass, mullions, the city far below
      const wy = 60;
      HT.vgrad(g, -W, wy, W * 3, 120, [[0, C.indigo], [0.6, C.lavender], [1, C.pinkrose]]);
      for (let x = -W; x < W * 2; x += 38) HT.rect(g, x, wy, 4, 120, C.shadow);
      HT.rect(g, -W, wy + 118, W * 3, 6, C.shadow);
      // floor + ceiling slabs with a perspective grid
      HT.rect(g, -W, 190, W * 3, H * 2, C.shadow);
      HT.rect(g, -W, -H, W * 3, wy + H, C.ink);
      for (let k = 0; k < 9; k++) { const yy = 190 + k * k * 3; HT.hline(g, -W, W * 2, yy, C.dusk); }
      for (let k = -12; k <= 12; k++) HT.line(g, W / 2 + k * 18, 190, W / 2 + k * 90, H * 2, C.dusk);
      for (let k = 0; k < 6; k++) HT.rect(g, 20 + k * 110, 20, 60, 3, C.lilacgrey); // ceiling lights (off)
      // desks and chairs in silhouette (sliding as the floor tilts)
      const slide = Math.max(0, t - (o.fallAt || 0)) * 18 * Math.sign(roll || 1);
      for (let k = 0; k < 7; k++) { const dx = 30 + k * 96 + slide * (0.6 + 0.1 * (k % 3)); HT.rect(g, dx, 196, 58, 16, C.dusk); HT.rect(g, dx + 4, 212, 4, 18, C.dusk); HT.rect(g, dx + 50, 212, 4, 18, C.dusk); HT.rect(g, dx + 20, 186, 16, 10, C.lilacgrey); }
      // the door between them, at their depth (a partition wall with a door, like canon ch. 224): full height, the
      // fighters stand on either side of it; after doorBreakAt only the broken frame and the partition remain
      if (o.doorX !== undefined) {
        const dx = o.doorX, top = 128, bot = H + 40, broken = o.doorBreakAt !== undefined && t >= o.doorBreakAt;
        HT.rect(g, dx - 60, top - 26, 120, bot - top + 26, C.dusk);                      // partition
        HT.rect(g, dx - 60, top - 26, 120, 4, C.lilacgrey);
        if (!broken) {
          HT.rect(g, dx - 34, top, 68, bot - top, C.rosewood); HT.rect(g, dx - 34, top, 68, 5, C.sand);
          HT.rect(g, dx - 27, top + 12, 54, 70, C.mauve); HT.rect(g, dx - 27, top + 94, 54, 70, C.mauve);
          HT.rect(g, dx + 20, top + 110, 6, 6, C.gold);
        } else { // splintered: the black gap with jagged remnants on the hinges
          HT.rect(g, dx - 34, top, 68, bot - top, C.ink);
          HT.poly(g, [[dx - 34, top], [dx - 20, top], [dx - 28, top + 40], [dx - 22, top + 90], [dx - 34, top + 120]], C.rosewood);
          HT.poly(g, [[dx + 34, top + 60], [dx + 24, top + 80], [dx + 30, top + 130], [dx + 34, top + 170]], C.rosewood);
        }
        HT.rect(g, dx - 36, top - 2, 3, bot - top + 2, C.ink); HT.rect(g, dx + 34, top - 2, 3, bot - top + 2, C.ink); HT.rect(g, dx - 36, top - 3, 73, 3, C.ink);
      }
      g.restore();
    },
  };
})();
