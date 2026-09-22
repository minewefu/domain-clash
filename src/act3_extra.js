/* DOMAIN CLASH — Act III extras (Unlimited Void, film 8:00–11:00): staging constants, act-specific poses/moves and
   FX used only by src/scenes/a3_*.js. Loads after props.js / act2_extra.js and before manga/busts/fight.

   HT.A3            world staging shared by the a3_* scenes (see the comments on each constant) + helpers:
                    A3.jointAt(S, name, joint, t) world position of a rig joint ('nlT' near toe, 'naH' near hand …)
                    A3.bustLines(ctx, S, spec) thin dark lines under the eyes of a close-up bust (stylised, no gore)
                    A3.redrawNearer(ctx, S, depth) re-blits fighters nearer than `depth` (after an FX drawn in front)
   POSES (HT.onPoses) a3frozen a3slump a3dragged a3dragPull a3perch a3catch a3throwA a3throw a3flipA a3flipKick
                    a3flipKick2 a3koStand a3kneelLaugh a3redTwoA a3redTwo a3wheelRaise a3swatA a3swat a3crossArms
                    a3fall a3punchLow a3punchWind maho_plungeA maho_plunge
   MOVES            a3flipKick (Sukuna's flip kick, contact 9) · a3throw (javelin throw of the signal, release 10) ·
                    a3swat (backhand brush-aside) · a3catch (two-hand catch, contact 3) · a3bf (the Black Flash strike,
                    contact 3, 18-frame freeze) · a3koSlide (reaction: blown back 4.6 m, left standing limp) ·
                    a3snap / a3snapBody (reactions of the frozen Sukuna: head / body snaps, back to a3frozen)
   FX
     a3maho       at*, face (heading), keys [[age, pose, rise 0..1, {wheelAngle, wheelGlow, swordGlow}]...], h (3.4) —
                  Mahoraga drawn as an FX so it can rise out of / sink into the ground (clipped at its ground line)
                  and drive its sword INTO the ground (the blade below z = 0 is hidden). Drawings on 2s.
     a3wheel      FX 'wheel' + dark [[age, 0..1]...] (Domain Amplification greys the wheel) + alpha [[age, a]...] +
                  glow [[age, 0..1]...] (a golden bloom: adaptation complete) + hideWith (hidden with its wearer)
     a3shade      the expressway deck's noon shadow on the ground (multiply), sunlit discs under deck holes
     a3signal     keys [[age, x, y, z, yaw, roll]...] (base point of the pole; roll tips the pole in its arm plane),
                  lamp 'green'|'off' — a torn-off traffic signal (pole + arm + three-lamp head) flying/tumbling
     a3groove     wall {x0, x1, y (face plane), n (normal sign)}, from [x, z], to [x, z], t0/t1 (scene times of the
                  scrape), w (m) — a gouge scraped along a facade, sparks + grit at its head while it grows
     a3heap       at*, r, n, build [age0, age1] (chunks rain in), burst (age: they blow outward), mat — a rubble heap
     a3voidBack   (screen) bhx, bhy, nebula — the Unlimited Void's interior as a full-frame backdrop (voidBloom art)
     a3voidShatter x/y (screen impact point), crack (s), n, rings — the Void cracks from the point where the sword
                  struck and its shards peel away to reveal whatever set is behind (switch env.set at crack end)
     a3pulse      at*, r (m), col — a quick expanding ring on the ground (sword strike, stomp)
     a3glowRing   at*, r, w, grow, out, col, col2 — a soft glowing band on the ground (a pool's edge on the Void's floor)
     a3amp        who, joint(s) ('nlT', 'naH', 'faH'…), r — FX 'amplify' (act2_extra) placed on rig joints (a kicking foot)
*/
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const FX = (HT.FX = HT.FX || {});
  const rig = HT.rig;
  const clamp = HT.clamp, lerp = HT.lerp, hash = HT.hash;
  const floor = Math.floor, ceil = Math.ceil, R = Math.round, sin = Math.sin, cos = Math.cos, PI = Math.PI, TAU = PI * 2;
  const min = Math.min, max = Math.max, abs = Math.abs, hypot = Math.hypot;
  const on2 = a => floor(a * 12 + 1e-6) / 12;
  const U = () => HT.fxu;                                    // fx.js raster helpers (exported after fx.js loads)

  // ------------------------------------------------------------------ staging (world metres; x east, y north, z up)
  const city = HT.city, V = city.viaduct;
  const b214 = city.byId.b214;                               // concrete, 42 m, south side of the avenue (north face y = −16.4)
  const A3 = (HT.A3 = {
    // the Void landed at the end of Act II (a2_clash5) on the avenue under the expressway, just east of the pier at
    // x −118 that Sukuna was slammed into: Sukuna frozen at S0, Gojo 2 m east of him (G0) — he strolls back to G1 while
    // the act card holds. Mahoraga rises from Sukuna's shadow behind him (north-west, by the pier). The hole Gojo
    // punched through the deck in a2_three (HOLE, −100, 1.5) throws a shaft of noon light a few metres east of them.
    S0: [-115.0, -1.8, 0], G0: [-113.0, -1.8, 0], G1: [-109.4, -1.8, 0], M0: [-115.9, 1.5, 0],
    HOLE: [-100, 1.5, 2.4],
    PIER: -118, DECK_Z0: V.z0, DECK_Z1: V.z1,
    // the drag: along the north face of b214 (y = its y1), westward at ~15 m, thrown down onto the sidewalk below
    WALL: { b: 'b214', y: b214 ? b214.y1 : -16.4, x0: b214 ? b214.x0 : -110, x1: b214 ? b214.x1 : -77.1, h: b214 ? b214.h : 42 },
    // the traffic signal Gojo perches on (a3_signal): sig0 at the junction's NE corner, its arm reaching west over the
    // road; it and the crossing light ped1 turn green at 12.7 s, then the signal is ripped out (ledger state 'gone')
    SIG: { id: 'sig0', ped: 'ped1', x: 12, y: 14, h: 5.2, arm: 3.5 },
    SUN_OFF: [2.9, -2.9],                                    // noon: the deck's shadow falls 2.9 m east / 2.9 m south
  });

  // world position of a rig joint of a cast member at time t (fight runner state S)
  A3.jointAt = (S, name, joint, t) => {
    const tr = S.sc && S.sc.C && S.sc.C.cast[name]; if (!tr) return [0, 0, 0];
    const s = tr.stateAt(t === undefined ? S.t : t, true), prop = tr._prop || (tr._prop = Object.assign({}, rig.PROP, (rig.CHARS[tr.char] || {}).prop || {}));
    const J = rig.fk(s.pose, prop), j = J[joint] || J.head, h = tr.h;
    return [s.pos[0] + s.face[0] * j[0] * h, s.pos[1] + s.face[1] * j[0] * h, s.pos[2] + j[1] * h];
  };
  // re-blit fighters that are nearer to the camera than `depth` (m) — for FX drawn in front of everyone (Mahoraga)
  A3.redrawNearer = (ctx, S, depth) => {
    if (!S.drawn) return;
    const list = [];
    for (const n in S.drawn) { const d = S.drawn[n]; if (!d || !d.r || !d.st) continue; const q = S.project(d.st.pos[0], d.st.pos[1], d.st.pos[2]); if (q && q.d < depth) list.push([q.d, d]); }
    list.sort((a, b) => b[0] - a[0]);
    for (const [, d] of list) ctx.drawImage(d.r.canvas, R(d.x) - d.r.ox, R(d.y) - d.r.oy);
  };
  // the close-up bust the runner draws this frame (its render + screen offset), replicated to find its anchors
  function bustOf(S) {
    const sc = S.sc, c = S.cam, cu = c && c.closeup; if (!cu || !cu.bust || !HT.busts || !HT.fight) return null;
    const tr = sc.C.cast[cu.who]; if (!tr) return null;
    const face = HT.fight.screenFace(sc, S, cu.who, c), ex = HT.fight.exprOf(sc, cu.who, S.t);
    const o = Object.assign({ size: cu.size || 210, face, t: S.t, light: S.light, rim: S.rim, costume: tr.costumeAt(S.t) || undefined }, ex, cu.bust);
    const r = HT.busts.render(tr.char, Object.assign({ size: 180 }, o));
    const x = R(W / 2 + (cu.side || 0) * W * 0.22), y = H + (cu.bottom || 0);
    return { r, dx: R(x - r.ox), dy: R(y - r.oy), face, who: cu.who };
  }
  A3.bustOf = bustOf;
  // the wheel above a close-up bust's head (world FX would project it onto the face): notch n (45° each), dark 0..1
  A3.bustWheel = (ctx, S, o = {}) => {
    const b = bustOf(S); if (!b || !HT.shiki || !HT.shiki.wheel) return;
    const an = b.r.anchors, hx = b.dx + (an.head ? an.head[0] : b.r.ox), hy = b.dy + (an.head ? an.head[1] : b.r.headOy);
    const rp = b.r.s * (o.r || 0.42), y = hy - b.r.s * (o.lift || 0.98);
    HT.shiki.wheel(ctx, hx + (o.dx || 0) * b.face, y, rp, (o.notch || 0) * 45, { glow: o.glow || 0, light: S.light, mode: o.dark ? 'tint' : undefined, tint: o.dark ? C.slate : undefined, alpha: o.alpha });
  };
  // thin dark lines from the eyes of a close-up bust (the runner's bust draw is replicated to find its anchors)
  A3.bustLines = (ctx, S, spec) => {
    const b = bustOf(S); if (!b) return;
    const r = b.r, dx = b.dx, dy = b.dy;
    const an = r.anchors; if (!an || !an.eyes) return;
    const k = clamp(spec.k === undefined ? 1 : spec.k, 0, 1), L = r.s * 0.34 * k, w = max(1, R(r.s / 110));
    for (const e of an.eyes) {
      const ex0 = dx + e[0] + (spec.dx || 0), ey0 = dy + e[1] + max(2, R(r.s * 0.05));
      for (let i = 0; i < L; i++) {
        const xx = R(ex0 + sin(i * 0.35 + e[0]) * 0.6), yy = R(ey0 + i);
        HT.rect(ctx, xx, yy, w, 1, i < 2 ? C.maroon : C.wine);
      }
      if (L > 3) HT.rect(ctx, R(ex0), R(ey0 + L), w, 1, C.maroon);
    }
  };

  // ------------------------------------------------------------------ poses + moves (poses.js is loaded: push runs now)
  const register = (rg) => {
    const P = rg.POSES, M = rg.MOVES, full = rg.full;
    const def = (name, o, base) => { P[name] = full(Object.assign({}, base ? P[base] : {}, o)); return P[name]; };
    const mv = (name, o) => { o.name = name; o.len = o.keys[o.keys.length - 1][0]; M[name] = o; return o; };
    // Sukuna frozen by the Void's information: stiff, arms half-raised mid-motion, eyes wide open
    def('a3frozen', { root: [0, -0.02], lean: 6, neck: 2, head: -6, twist: 0.4, na: [34, 46, 0], fa: [20, 52, 0], nl: [16, 14, 0], fl: [-14, 8, 0], nh: 'open', fh: 'open', face: 'open', eyes: 'wide' });
    // coming round: head hanging, shoulders slack
    def('a3slump', { root: [0, -0.05], lean: 18, neck: 22, head: 16, twist: 0.3, na: [4, 16, 0], fa: [-6, 18, 0], nl: [18, 26, 0], fl: [-12, 18, 0], nh: 'relaxed', fh: 'relaxed', face: 'open', eyes: 'closed' });
    // dragged along a facade by the collar (front view: back to the wall, arms flung up, head knocked back)
    def('a3dragged', { view: 'front', root: [0, 0.02], lean: -8, neck: -6, head: -16, na: [128, 48, 0], fa: [104, 70, 0], nl: [22, 44, 0], fl: [12, 26, 0], nh: 'open', fh: 'claw', face: 'grit', eyes: 'closed' });
    // Gojo flying ahead, hauling with the near hand behind him (a grip at the collar)
    def('a3dragPull', { root: [0, 0.04], lean: 46, neck: -24, head: -8, twist: 0.55, na: [-128, 8, 0], fa: [-30, 40, 0], nl: [-8, 34, -20], fl: [-30, 56, -30], nh: 'claw', fh: 'fist', face: 'grin', eyes: 'glare' });
    // perched on the traffic signal: a deep squat on the housing, forearms on the knees
    def('a3perch', { root: [0.02, -0.29], lean: 32, neck: -16, head: -8, twist: 0.35, na: [26, 64, 0], fa: [14, 74, 0], nl: [86, 150, 12], fl: [64, 148, 30], nh: 'relaxed', fh: 'relaxed', face: 'smirk', eyes: 'glow' });
    // catching the flying signal pole with both hands (overhead, twisted back)
    def('a3catch', { root: [-0.02, -0.05], lean: -12, neck: -10, head: -8, twist: 0.7, na: [152, 36, 0], fa: [138, 48, 0], nl: [26, 34, 0], fl: [-24, 22, 0], nh: 'claw', fh: 'claw', face: 'grin', eyes: 'narrow' });
    // javelin throw: wind-up (arm cocked behind the head) → release (arm through, body over the front leg)
    def('a3throwA', { root: [-0.04, -0.05], lean: -16, neck: -6, twist: 0.15, na: [150, 110, 0], fa: [60, 30, 0], nl: [34, 30, 0], fl: [-30, 20, 0], nh: 'claw', fh: 'open', face: 'grin', eyes: 'narrow' });
    def('a3throw', { root: [0.07, -0.06], lean: 30, neck: -10, twist: 0.9, na: [70, 4, 0], fa: [-40, 40, 0], nl: [44, 46, 0], fl: [-38, 10, 20], nh: 'open', fh: 'open', face: 'grin', eyes: 'glare' });
    // the flip kick: crouch → inverted, kicking leg straight up at a target above → coming round
    def('a3flipA', { root: [0, -0.18], lean: 34, neck: -18, head: -8, na: [-40, 40, 0], fa: [-50, 30, 0], nl: [70, 116, 10], fl: [22, 104, 30], nh: 'fist', fh: 'fist', eyes: 'glare' });
    def('a3flipKick', { root: [0, 0.1], lean: -140, neck: -30, head: -10, twist: 0.5, na: [-40, 60, 0], fa: [-70, 40, 0], nl: [172, 4, 20], fl: [110, 80, 0], nh: 'fist', fh: 'fist', face: 'grin', eyes: 'glare' });
    def('a3flipKick2', { root: [0, 0.08], lean: -230, neck: -20, head: -10, twist: 0.4, na: [-70, 50, 0], fa: [-90, 40, 0], nl: [230, 30, 10], fl: [200, 70, 0], nh: 'fist', fh: 'fist', face: 'grin', eyes: 'narrow' });
    // knocked out on his feet: slack, head fallen back, arms hanging, mouth open, eyes shut (busts show them white)
    def('a3koStand', { root: [-0.01, -0.035], lean: -9, neck: -18, head: -24, twist: 0.3, na: [-8, 8, 0], fa: [-12, 10, 0], nl: [10, 12, 0], fl: [-9, 8, 0], nh: 'relaxed', fh: 'relaxed', face: 'open', eyes: 'closed' });
    // Gojo on one knee, head thrown back: the laugh
    def('a3kneelLaugh', { root: [0, -0.22], lean: 2, neck: -22, head: -20, twist: 0.4, na: [36, 70, 0], fa: [12, 40, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'fist', fh: 'relaxed', face: 'grin', eyes: 'closed' });
    // Red readied with two fingers (canon: the index + middle finger): cocked → aimed
    def('a3redTwoA', { lean: -2, twist: 0.25, na: [72, 112, 0], fa: [-6, 20, 0], nl: [10, 8, 0], fl: [-10, 4, 0], nh: 'two', fh: 'relaxed', eyes: 'narrow' });
    def('a3redTwo', { lean: 8, twist: 0.6, na: [90, 4, -10], fa: [-12, 24, 0], nl: [18, 14, 0], fl: [-14, 8, 0], nh: 'two', fh: 'relaxed', eyes: 'glare' });
    // Sukuna sets the wheel above his own head (an open hand raised over the crown)
    def('a3wheelRaise', { lean: -3, neck: -4, head: -6, twist: 0.5, na: [168, 16, 0], fa: [-8, 18, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'open', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
    // brushing the flying debris aside with a backhand
    def('a3swatA', { lean: -4, twist: 0.25, na: [96, 110, 0], fa: [-6, 20, 0], nl: [8, 6, 0], fl: [-8, 4, 0], nh: 'open', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
    def('a3swat', { lean: 4, twist: 0.8, na: [100, 4, 20], fa: [-10, 24, 0], nl: [14, 10, 0], fl: [-12, 6, 0], nh: 'open', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
    // forearms crossed in front of the face (Domain Amplification blunting the Red)
    def('a3crossArms', { root: [-0.02, -0.06], lean: 14, neck: 10, head: 6, twist: 0.3, na: [96, 118, 0], fa: [84, 124, 0], nl: [30, 40, 0], fl: [-26, 24, 0], nh: 'fist', fh: 'fist', face: 'grit', eyes: 'narrow' });
    // falling / hurled (arms up, legs bent)
    def('a3fall', { root: [0, 0.04], lean: -24, neck: -20, head: -12, twist: 0.3, na: [150, 40, 0], fa: [120, 60, 0], nl: [50, 80, 0], fl: [10, 60, 0], nh: 'open', fh: 'open', face: 'grit', eyes: 'closed' });
    // the Black Flash's body line: low cross, weight fully through the front leg
    def('a3punchLow', { root: [0.09, -0.08], lean: 26, neck: -10, twist: 0.9, na: [16, 120, 0], fa: [84, 2, 0], nl: [48, 56, 0], fl: [-40, 10, 22], nh: 'fist', fh: 'fist', face: 'grit', eyes: 'glare' });
    // the Black Flash: the wind-up (coiled low, rear fist far back) — the strike is a3punchLow
    def('a3punchWind', { root: [-0.04, -0.09], lean: 12, neck: -6, head: -4, twist: 0.05, na: [40, 100, 0], fa: [-40, 120, 0], nl: [40, 58, 0], fl: [-30, 22, 14], nh: 'fist', fh: 'fist', face: 'grit', eyes: 'glare' });
    // Mahoraga drives the Sword of Extermination into the ground: raised high → down on one knee, blade straight down
    def('maho_plungeA', { root: [0, 0.0], lean: -12, neck: -8, head: -6, twist: 0.3, na: [172, 8, 0], fa: [60, 50, 0], nl: [20, 24, 0], fl: [-18, 14, 0], nh: 'fist', fh: 'open' });
    def('maho_plunge', { root: [0.02, -0.24], lean: 34, neck: 14, head: 8, twist: 0.35, na: [-36, 0, 0], fa: [20, 40, 0], nl: [82, 96, 0], fl: [-8, 118, 40], nh: 'fist', fh: 'open', face: 'open' });

    mv('a3flipKick', { keys: [[0, 'guardLow'], [4, 'a3flipA'], [7, 'a3flipKick'], [9, 'a3flipKick'], [14, 'a3flipKick2'], [20, 'landing'], [30, 'guard']], contact: 9, startup: 9, active: 5, recovery: 21, strength: 3, hitstop: 7,
      root: [[0, 0], [4, 0], [9, 0.6], [20, 1.2], [30, 1.3]], lift: [[0, 0], [4, 0], [9, 1.3], [14, 1.6], [20, 0], [30, 0]], smear: { limb: 'nl', from: 5, to: 9 }, sfx: { 5: 'whooshL' } });
    mv('a3throw', { keys: [[0, 'a3catch'], [5, 'a3throwA'], [8, 'a3throwA'], [10, 'a3throw'], [18, 'a3throw'], [30, 'guard']], contact: 10, startup: 10, active: 8, recovery: 12, strength: 3,
      root: [[0, 0], [8, -0.1], [10, 0.5], [30, 0.6]], smear: { limb: 'na', from: 8, to: 10 }, sfx: { 8: 'whooshL' } });
    mv('a3swat', { keys: [[0, 'guard'], [4, 'a3swatA'], [7, 'a3swat'], [14, 'a3swat'], [24, 'guard']], contact: 7, startup: 7, active: 3, recovery: 17, root: [[0, 0]], smear: { limb: 'na', from: 4, to: 7 }, sfx: { 4: 'whooshM' } });
    // Gojo's Black Flash: an explosive 3-frame strike from the coiled wind-up, a long freeze on the contact drawing
    mv('a3bf', { keys: [[0, 'a3punchWind'], [3, 'a3punchLow'], [16, 'a3punchLow'], [34, 'guard']], contact: 3, startup: 3, active: 13, recovery: 18, strength: 4, hitstop: 18,
      root: [[0, 0], [3, 0.45], [34, 0.55]], smear: { limb: 'fa', from: 0, to: 3 }, sfx: { 0: 'whooshL' } });
    // knocked out on his feet: blown back, feet dragging, and left standing limp
    mv('a3koSlide', { keys: [[0, 'hitMid'], [9, 'hitMid'], [22, 'a3koStand'], [40, 'a3koStand']], contact: 0, startup: 0, active: 22, recovery: 18,
      root: [[0, 0], [9, -3.4], [22, -4.6], [40, -4.7]] });
    // the frozen Sukuna's reaction to each blow of the barrage: the head snaps, then the stiff pose returns
    mv('a3snap', { keys: [[0, 'hitHigh'], [5, 'hitHigh'], [13, 'a3frozen']], contact: 0, startup: 0, active: 5, recovery: 8, root: [[0, 0], [5, -0.14], [13, -0.16]] });
    mv('a3snapBody', { keys: [[0, 'hitMid'], [5, 'hitMid'], [13, 'a3frozen']], contact: 0, startup: 0, active: 5, recovery: 8, root: [[0, 0], [5, -0.18], [13, -0.2]] });
    mv('a3catch', { keys: [[0, 'guard'], [3, 'a3catch'], [16, 'a3catch'], [22, 'a3catch']], contact: 3, startup: 3, active: 13, recovery: 6, root: [[0, 0], [3, -0.2], [22, -0.3]] });
  };
  (HT.onPoses = HT.onPoses || []).push(register);

  // ------------------------------------------------------------------ small helpers
  const pj = (S, p) => (p ? S.project(p[0], p[1], p[2] || 0) : null);
  const headingOf = f => (Array.isArray(f) ? f : f === 'west' ? [-1, 0] : f === 'north' ? [0, 1] : f === 'south' ? [0, -1] : [1, 0]);
  const screenFaceOf = (S, hd) => { const c = S.cam, rt = [cos(c.yaw), -sin(c.yaw)]; return hd[0] * rt[0] + hd[1] * rt[1] >= 0 ? 1 : -1; };
  // piecewise keyframe value [[age, v]...] (smooth) — v numbers
  const kv = (keys, age, def) => {
    if (!keys || !keys.length) return def;
    if (age <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (age <= keys[i][0]) { const a = keys[i - 1], b = keys[i], u = (age - a[0]) / max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * HT.E.inOutQuad(u); }
    return keys[keys.length - 1][1];
  };

  // ------------------------------------------------------------------ a3maho: Mahoraga as an FX (rise / sink / plunge)
  FX.a3maho = {
    dur: 8, layer: 'behind', sfx: false,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at || !rig.POSES) return;
      const K = e.keys || [[0, 'maho_idle', 1]];
      const a2 = on2(age);                                 // drawings on 2s
      let i = 0; while (i < K.length - 1 && a2 >= K[i + 1][0]) i++;
      const k0 = K[i], k1 = K[min(K.length - 1, i + 1)];
      const u = k1 === k0 ? 0 : clamp((a2 - k0[0]) / max(1e-6, k1[0] - k0[0]), 0, 1), ue = k0[4] === 'hold' ? 0 : HT.E.inOutQuad(u);
      const P0 = rig.POSES[k0[1]] || rig.POSES.maho_idle, P1 = rig.POSES[k1[1]] || P0;
      const P = u > 0 && P1 !== P0 ? rig.lerpPose(P0, P1, ue) : P0;
      const rise = lerp(k0[2] === undefined ? 1 : k0[2], k1[2] === undefined ? 1 : k1[2], ue);
      const o0 = k0[3] || {}, o1 = k1[3] || {};
      const wa = lerp(o0.wheelAngle || 0, o1.wheelAngle === undefined ? (o0.wheelAngle || 0) : o1.wheelAngle, ue), wg = lerp(o0.wheelGlow || 0, o1.wheelGlow || 0, ue);
      const p = pj(S, at); if (!p) return;
      const hM = e.h || 3.4, px = R(hM * p.s); if (px < 5 || rise <= 0.005) return;
      const face = screenFaceOf(S, headingOf(e.face || 'east'));
      const light = S.light, sink = R((1 - rise) * px);
      // ground shadow (only when out of the ground)
      if (rise > 0.3) HT.alpha(ctx, 0.35 * rise, () => HT.ellipse(ctx, p.x, p.y, max(3, px * 0.2), max(1, px * 0.05), C.ink));
      ctx.save();
      ctx.beginPath(); ctx.rect(-W, -H, W * 3, R(p.y) + (e.lip || 0) + H); ctx.clip();   // nothing below its own ground line
      // a held pose (same pose at both keys, or past the last key) keeps one cached drawing instead of 12 new ones a second
      const held = P1 === P0 || u <= 0 || k1 === k0;
      const key = 'a3m|' + (held ? k0[1] + '#' : (e.t + a2).toFixed(3)) + '|' + R(wa) + '|' + R(wg * 10) + '|' + (e.swordGlow ? 1 : 0) + '|' + (o0.swordGlow ? 1 : 0);
      const r = rig.draw(ctx, 'mahoraga', p.x, p.y + sink, P, px, { face, light, rimDir: [-light[0], -light[1]], key, wheelAngle: wa, wheelGlow: wg, swordGlow: !!(e.swordGlow || o0.swordGlow), t: e.t + a2 });
      ctx.restore();
      S.a3maho = { d: p.d, r, x: p.x, y: p.y + sink, px };
    },
  };

  // ------------------------------------------------------------------ a3wheel: the wheel halo + Domain Amplification greying
  let wOff = null;
  // Domain Amplification greys the wheel in two palette steps (continuous blends would jitter through the quantizer)
  const RAMPS = [null, [C.ink, C.bark, C.rust, C.clay, C.tan].map(c => HT.rgb(c)), [C.ink, C.shadow, C.dusk, C.lilacgrey, C.steel].map(c => HT.rgb(c))];
  FX.a3wheel = {
    dur: 6, layer: 'front', follow: true, sfx: 'wheelClunk', vol: 0.9,
    cues: e => (FX.wheel && FX.wheel.cues ? FX.wheel.cues(e) : []),
    draw(ctx, age, e, S) {
      const F = FX.wheel; if (!F) return;
      if (S.cam && (S.cam.closeup || S.cam.ecu) && !e.inCloseup) return;   // close-ups: A3.bustWheel draws it above the bust
      if (e.hideWith && e.who && S.sc && S.sc.C.cast[e.who] && !S.sc.C.cast[e.who].visibleAt(S.t)) return;
      const dark = clamp(kv(e.dark, age, 0), 0, 1), al = clamp(kv(e.alpha, age, 1), 0, 1), gl = clamp(kv(e.glow, age, 0), 0, 1);
      if (al <= 0.02) return;
      const cw = ctx.canvas.width, ch = ctx.canvas.height;
      let c, hgt = 1.8;
      if (e.who && S.at) { const a = S.at(e.who, S.t); hgt = a.h; c = [a.x, a.y, a.z + a.h * 0.95 + (e.lift === undefined ? 0.5 : e.lift) * (a.h / 1.8)]; } else c = e.at;
      const p = pj(S, c); if (!p) return;
      if (gl > 0.02 && U()) { const rw = (e.r === undefined ? 0.4 * (hgt / 1.8) : e.r) * p.s; U().glow(ctx, p.x, p.y, rw * 1.4 + 5, C.gold, 0.28 * gl * al); U().glow(ctx, p.x, p.y, rw * 1.1 + 2, C.butter, 0.26 * gl * al); }
      if ((dark <= 0.25 && al > 0.98) || cw !== W || ch !== H) { F.draw(ctx, age, e, S); return; }
      // off-screen pass: draw the wheel alone, grey it by luminance, blit it back (with alpha)
      const Rw = (e.r === undefined ? 0.4 * (hgt / 1.8) : e.r) * p.s * 1.7 + 8;
      const x0 = max(0, floor(p.x - Rw)), y0 = max(0, floor(p.y - Rw)), x1 = min(W, ceil(p.x + Rw)), y1 = min(H, ceil(p.y + Rw));
      if (x1 <= x0 || y1 <= y0) return;
      if (!wOff) wOff = HT.canvas(W, H);
      const g = wOff.g; g.clearRect(x0, y0, x1 - x0, y1 - y0);
      F.draw(g, age, e, S);
      const lvl = dark > 0.66 ? 2 : dark > 0.25 ? 1 : 0;
      if (lvl) {
        const RP = RAMPS[lvl], img = g.getImageData(x0, y0, x1 - x0, y1 - y0), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          if (!d[i + 3]) continue;
          const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255, c = RP[min(RP.length - 1, floor(clamp(l * 1.12, 0, 0.999) * RP.length))];
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
        }
        g.putImageData(img, x0, y0);
      }
      const oa = ctx.globalAlpha; ctx.globalAlpha = oa * al;
      ctx.drawImage(wOff.c, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
      ctx.globalAlpha = oa;
    },
  };

  // ------------------------------------------------------------------ a3shade: the deck's shadow at noon (+ sunlit holes)
  // piers seen from under/beside the deck: screen hulls (so the shade passes leave them out and shade them once, lighter)
  function hull2(P) { // convex hull of flat [x, y, …]
    const n = P.length / 2, idx = []; for (let i = 0; i < n; i++) idx.push(i);
    idx.sort((a, b) => P[2 * a] - P[2 * b] || P[2 * a + 1] - P[2 * b + 1]);
    const cr = (o, a, b) => (P[2 * a] - P[2 * o]) * (P[2 * b + 1] - P[2 * o + 1]) - (P[2 * a + 1] - P[2 * o + 1]) * (P[2 * b] - P[2 * o]);
    const lo = [], up = [];
    for (const i of idx) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], i) <= 0) lo.pop(); lo.push(i); }
    for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], i) <= 0) up.pop(); up.push(i); }
    up.pop(); lo.pop();
    const out = []; for (const i of lo.concat(up)) out.push(P[2 * i], P[2 * i + 1]);
    return out;
  }
  function pierHulls(S) {
    const c = S.cam, out = [];
    if (c.z > V.z1 + 0.5 || c.y < V.y0 - 30 || c.y > V.y1 + 30) return out;
    for (const pr of V.pillars) {
      const mx = (pr.x0 + pr.x1) / 2; if (abs(mx - c.x) > 110) continue;
      const P = []; let ok = true;
      for (const x of [pr.x0, pr.x1]) for (const y of [pr.y0, pr.y1]) for (const z of [0, V.z0]) { const q = S.project(x, y, z); if (!q) { ok = false; break; } P.push(q.x, q.y); }
      if (ok) out.push(hull2(P));
    }
    return out;
  }
  // multiply `polys` with `col`, leaving the piers' silhouettes out (successive even-odd clips = outside their union)
  function shadeOutsidePiers(ctx, S, polys, col, hulls) {
    const u = U();
    ctx.save();
    for (const Hh of hulls) { ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.moveTo(Hh[0], Hh[1]); for (let i = 2; i < Hh.length; i += 2) ctx.lineTo(Hh[i], Hh[i + 1]); ctx.closePath(); ctx.clip('evenodd'); }
    ctx.globalCompositeOperation = 'multiply';
    u.fillPolys(ctx, polys, col);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
  FX.a3shade = {
    dur: 60, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u) return;
      const c = S.cam, off = e.off || A3.SUN_OFF, span = e.span || 170;
      const xa = max(V.x0, c.x - span), xb = min(V.x1, c.x + span); if (xa >= xb) return;
      const z = 0.02, ox = off[0], oy = off[1];
      // seen from above the deck only the strip of shadow outside its footprint is visible (the deck hides the rest)
      const yA = V.y0 + oy, yB = c.z > V.z0 ? V.y0 : V.y1 + oy;
      const P = u.projPoly(S, new Float64Array([xa + ox, yA, z, xb + ox, yA, z, xb + ox, yB, z, xa + ox, yB, z]));
      if (P.length < 6) return;
      const polys = [P];
      if (HT.ledger && c.z <= V.z0) for (const h of HT.ledger.state(S.T || 0)) if (h.kind === 'deckHole' && h.x > xa - 5 && h.x < xb + 5) { const Q = u.projPoly(S, u.circle3(h.x + ox, h.y + oy, z, h.r * 0.9, 18, a => 0.85 + 0.2 * HT.noise(cos(a) * 2, sin(a) * 2, 5))); if (Q.length >= 6) polys.push(Q); }
      shadeOutsidePiers(ctx, S, polys, e.col || '#8e8aa6', pierHulls(S));
    },
  };

  // ------------------------------------------------------------------ a3deck: the underside of the deck in shade
  // (cameras below the deck): a multiply over the deck's bottom plane (holes stay open to the sky) + girder lines;
  // the piers are left out of both shade passes and shaded once, lighter, so they stay readable
  const deckHolesAt = (T, xa, xb) => { const out = []; if (HT.ledger) for (const h of HT.ledger.state(T)) if (h.kind === 'deckHole' && h.x > xa - 5 && h.x < xb + 5) out.push(h); return out; };
  FX.a3deck = {
    dur: 60, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u) return;
      const c = S.cam; if (c.z > V.z0 - 0.05) return;
      const span = e.span || 140, xa = max(V.x0, c.x - span), xb = min(V.x1, c.x + span); if (xa >= xb) return;
      const z = V.z0;
      const P = u.projPoly(S, new Float64Array([xa, V.y0, z, xb, V.y0, z, xb, V.y1, z, xa, V.y1, z])); if (P.length < 6) return;
      const holes = deckHolesAt(S.T || 0, xa, xb), polys = [P];
      for (const h of holes) { const Q = u.projPoly(S, u.circle3(h.x, h.y, z, h.r * 0.92, 18)); if (Q.length >= 6) polys.push(Q); }
      const hulls = pierHulls(S);
      shadeOutsidePiers(ctx, S, polys, e.col || '#77738f', hulls);
      // girders: longitudinal beams + transverse diaphragms every 7 m (only near the camera: far lines would alias)
      ctx.save();
      for (const Hh of hulls) { ctx.beginPath(); ctx.rect(-W, -H, W * 3, H * 3); ctx.moveTo(Hh[0], Hh[1]); for (let i = 2; i < Hh.length; i += 2) ctx.lineTo(Hh[i], Hh[i + 1]); ctx.closePath(); ctx.clip('evenodd'); }
      const near = e.near || 46, gx0 = max(xa, c.x - near), gx1 = min(xb, c.x + near), zc = z - 0.06;
      for (const gy of [-6.6, -2.2, 2.2, 6.6]) { const sg = u.projSeg(S, [gx0, gy, zc], [gx1, gy, zc]); if (sg) u.line(ctx, sg[0], sg[1], sg[2], sg[3], C.shadow); }
      for (let x = Math.ceil(gx0 / 7) * 7; x <= gx1; x += 7) { if (holes.some(h => abs(h.x - x) < h.r)) continue; const sg = u.projSeg(S, [x, V.y0 + 0.4, zc], [x, V.y1 - 0.4, zc]); if (sg) u.line(ctx, sg[0], sg[1], sg[2], sg[3], C.shadow); }
      ctx.restore();
      // the piers themselves: in shade too, but lighter (one multiply over the union of their silhouettes)
      if (hulls.length) {
        ctx.save(); ctx.beginPath();
        for (const Hh of hulls) { ctx.moveTo(Hh[0], Hh[1]); for (let i = 2; i < Hh.length; i += 2) ctx.lineTo(Hh[i], Hh[i + 1]); ctx.closePath(); }
        ctx.clip('nonzero');
        ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = e.pierCol || '#c4c0d4'; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    },
  };
  // ------------------------------------------------------------------ a3shaft: a shaft of noon light through a deck hole
  FX.a3shaft = {
    dur: 60, layer: 'behind', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u) return;
      const h = e.hole || A3.HOLE, off = e.off || A3.SUN_OFF, cam = S.cam;
      if (cam.closeup || cam.ecu || cam.z > V.z0) return;              // above the deck: the beam is hidden under it
      const dAx = hypot(cam.x - (h[0] + off[0] / 2), cam.y - (h[1] + off[1] / 2));   // near the beam: fade it out
      const k = clamp(kv(e.k, age, 1), 0, 1) * clamp((dAx - 6) / 5, 0, 1); if (k < 0.02) return;
      const pts = [], n = 20;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        for (const [zz, dx, dy] of [[V.z0, 0, 0], [0.02, off[0], off[1]]]) { const q = S.project(h[0] + dx + cos(a) * h[2] * 0.9, h[1] + dy + sin(a) * h[2] * 0.9, zz); if (q) pts.push(q.x, q.y); }
      }
      if (pts.length < 6) return;
      // convex hull of both discs = the shaft's silhouette
      const idx = []; for (let i = 0; i < pts.length / 2; i++) idx.push(i);
      idx.sort((a, b) => pts[2 * a] - pts[2 * b] || pts[2 * a + 1] - pts[2 * b + 1]);
      const cr = (o, a, b) => (pts[2 * a] - pts[2 * o]) * (pts[2 * b + 1] - pts[2 * o + 1]) - (pts[2 * a + 1] - pts[2 * o + 1]) * (pts[2 * b] - pts[2 * o]);
      const lo = [], up = [];
      for (const i of idx) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], i) <= 0) lo.pop(); lo.push(i); }
      for (let j = idx.length - 1; j >= 0; j--) { const i = idx[j]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], i) <= 0) up.pop(); up.push(i); }
      up.pop(); lo.pop();
      const hull = []; for (const i of lo.concat(up)) hull.push(pts[2 * i], pts[2 * i + 1]);
      u.fillPoly(ctx, hull, u.dcol(C.cream, (e.a || 0.065) * k));
      // the sunlit disc on the ground (warm) + motes drifting in the beam
      const D = u.projPoly(S, u.circle3(h[0] + off[0], h[1] + off[1], 0.03, h[2] * 0.9, 24));
      u.fillPoly(ctx, D, u.dcol(C.cream, 0.14 * k));
      const g = floor(S.t * 12);
      for (let i = 0; i < 18; i++) {
        const ph = ((S.t * (0.05 + 0.05 * hash(i, 61)) + hash(i, 62)) % 1), a = hash(i, 63) * TAU, rr = h[2] * 0.8 * Math.sqrt(hash(i, 64));
        const zz = V.z0 * (1 - ph), q = S.project(h[0] + off[0] * (1 - zz / V.z0) + cos(a) * rr, h[1] + off[1] * (1 - zz / V.z0) + sin(a) * rr, zz);
        if (q && (g + i) % 5) HT.px(ctx, R(q.x), R(q.y), (i % 3) ? C.cream : C.white);
      }
    },
  };

  // ------------------------------------------------------------------ a3signal: a torn-off traffic signal, flying/tumbling
  // local frame: base at the origin, pole up (+t) 5.2 m, arm along +s 3.5 m at 5.05 m, head (1.12 × 0.4 m) at the arm tip
  function sigPose(e, age) {
    const K = e.keys; if (!K || !K.length) return null;
    let i = 0; while (i < K.length - 1 && age >= K[i + 1][0]) i++;
    const a = K[i], b = K[min(K.length - 1, i + 1)], q = b === a ? 0 : clamp((age - a[0]) / max(1e-6, b[0] - a[0]), 0, 1);
    const ease = HT.E[(a[6] || 'linear')] || HT.E.linear, v = ease(q);
    const ang = (x, y) => x + (((y - x) % TAU) + TAU + PI) % TAU - PI;
    return { x: lerp(a[1], b[1], v), y: lerp(a[2], b[2], v), z: lerp(a[3], b[3], v), yaw: lerp(a[4], ang(a[4], b[4]), v), roll: lerp(a[5], a[5] + (b[5] - a[5]), v), flat: lerp(a[7] || 0, b[7] || 0, v) };
  }
  FX.a3signal = {
    dur: 6, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u) return;
      const s0 = sigPose(e, age); if (!s0) return;
      // the L lies in the plane (hdir, up'), up' = world up tipped toward the normal by flat·90° (flat 1 = lying on the road)
      const hdir = [cos(s0.yaw), sin(s0.yaw), 0], n0 = [-sin(s0.yaw), cos(s0.yaw), 0], cr = cos(s0.roll), sr = sin(s0.roll);
      const fa = s0.flat * PI / 2, cf = cos(fa), sf = sin(fa), up = [n0[0] * sf, n0[1] * sf, cf], nrm = [n0[0] * cf, n0[1] * cf, -sf];
      const W3 = (ls, lt, ln) => { const ss = ls * cr - lt * sr, tt = ls * sr + lt * cr, q = ln || 0; return [s0.x + hdir[0] * ss + up[0] * tt + nrm[0] * q, s0.y + hdir[1] * ss + up[1] * tt + nrm[1] * q, s0.z + up[2] * tt + nrm[2] * q]; };
      const PR = p => S.project(p[0], p[1], p[2]);
      const pB = W3(0, 0), pT = W3(0, 5.2), pA = W3(0, 5.05), pH = W3(3.4, 5.05);
      const base = PR(pB), top = PR(pT), head = PR(pH);
      const sAt = q => (q ? q.s : 0), sP = max(sAt(base), sAt(top), sAt(head), 1) * 0.6;
      const wPole = max(1, min(14, R(0.17 * sP))), wArm = max(1, min(10, R(0.11 * sP)));
      const mid = C.dusk, lite = C.lilacgrey, dark = C.shadow;
      const bar = (a3, b3, w) => { const sg = u.projSeg(S, a3, b3); if (!sg) return; u.thick(ctx, sg[0], sg[1], sg[2], sg[3], w + 2, C.ink); u.thick(ctx, sg[0], sg[1], sg[2], sg[3], w, mid); if (w >= 3) u.line(ctx, sg[0] - 1, sg[1], sg[2] - 1, sg[3], lite); };
      bar(pB, pT, wPole); bar(pA, pH, wArm);
      // torn base: a jagged stub of anchor bolts
      if (base && e.torn !== false && base.s > 6) for (let k = -1; k <= 1; k++) u.line(ctx, base.x + k * 2, base.y, base.x + k * 3, base.y + max(2, R(base.s * 0.12)), C.steel);
      // the head: a housing box around the arm tip (front face toward the camera)
      const hc = [3.4, 5.05], hw = 0.56, hh = 0.2, hd = 0.14;
      const cam = S.cam, toCam = [cam.x - s0.x, cam.y - s0.y, cam.z - s0.z], fsgn = toCam[0] * nrm[0] + toCam[1] * nrm[1] + toCam[2] * nrm[2] >= 0 ? 1 : -1;
      const F4 = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => PR(W3(hc[0] + a, hc[1] + b, fsgn * hd)));
      const B4 = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => PR(W3(hc[0] + a, hc[1] + b, -fsgn * hd)));
      if (F4.every(Boolean) && B4.every(Boolean)) {
        const flat = Q => Q.flatMap(q => [q.x, q.y]);
        u.fillPoly(ctx, flat(B4), C.ink);
        u.fillPoly(ctx, flat([F4[3], F4[2], B4[2], B4[3]]), e.snow ? C.mist : dark);
        u.fillPoly(ctx, flat(F4), C.ink);
        u.polyline(ctx, flat(F4), dark, true);
        const lamp = e.lampOff !== undefined && age >= e.lampOff ? 'off' : e.lamp;
        const lamps = [lamp === 'green' ? C.green : C.deepteal, lamp === 'yellow' ? C.gold : C.bark, lamp === 'red' ? C.red : C.wine];
        for (let k = 0; k < 3; k++) {
          const q = PR(W3(hc[0] + (k - 1) * 0.36, hc[1], fsgn * (hd + 0.01))); if (!q) continue;
          const rr = max(1, 0.13 * q.s);
          u.disc(ctx, q.x, q.y, rr, lamps[k]);
          if (k === 0 && lamp === 'green' && rr > 2) { u.glow(ctx, q.x, q.y, rr * 3, C.mint, 0.35); u.disc(ctx, q.x - rr * 0.3, q.y - rr * 0.3, max(1, rr * 0.35), C.white); }
        }
      }
      S.a3sig = { base: pB, top: pT, head: pH, d: top ? top.d : 0 };
    },
  };

  // ------------------------------------------------------------------ a3groove: a gouge scraped along a facade
  FX.a3groove = {
    dur: 20, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u) return;
      const y = e.y, ny = e.n || 1, dy = 0.04 * ny;              // drawn a hair in front of the wall plane
      const t0 = e.t0 === undefined ? e.t : e.t0, t1 = e.t1 === undefined ? e.t + 1 : e.t1;
      const g = clamp((S.t - t0) / max(1e-3, t1 - t0), 0, 1); if (g <= 0) return;
      const a = e.from, b = e.to, hw = (e.w || 0.7) / 2, n = max(4, R(abs(b[0] - a[0]) / 0.45));
      const upper = [], lower = [], lip = [];
      const m = max(1, R(n * g));
      for (let i = 0; i <= m; i++) {
        const q = i / n, x = lerp(a[0], b[0], q), z = lerp(a[1], b[1], q) + sin(q * 17) * 0.08;
        const j1 = (hash(i, 51) - 0.5) * 0.35, j2 = (hash(i, 52) - 0.5) * 0.35;
        const P1 = S.project(x, y + dy, z + hw + j1), P2 = S.project(x, y + dy, z - hw - j2), P3 = S.project(x, y + dy, z + hw + j1 + 0.16);
        if (!P1 || !P2 || !P3) continue;
        upper.push(P1.x, P1.y); lower.push(P2.x, P2.y); lip.push(P3.x, P3.y);
      }
      if (upper.length < 4) return;
      const poly = upper.slice(); for (let i = lower.length - 2; i >= 0; i -= 2) poly.push(lower[i], lower[i + 1]);
      const lipP = lip.slice(); for (let i = upper.length - 2; i >= 0; i -= 2) lipP.push(upper[i], upper[i + 1]);
      u.fillPoly(ctx, lipP, C.steel);                          // the torn upper lip catches the sun
      u.fillPoly(ctx, poly, C.shadow);
      // the deep core line + cracks radiating from the gouge
      const core = []; for (let i = 0; i + 1 < upper.length; i += 2) core.push((upper[i] + lower[i]) / 2, (upper[i + 1] + lower[i + 1]) / 2);
      u.polyline(ctx, core, C.ink);
      for (let i = 2; i < upper.length - 2; i += 6) { const h = hash(i, 53); if (h < 0.5) continue; const L = 3 + h * 7; u.line(ctx, upper[i], upper[i + 1], upper[i] + (hash(i, 54) - 0.5) * 6, upper[i + 1] - L, C.dusk); }
      // while growing: sparks and grit spray at the head
      if (g < 1 && S.t < t1) {
        const hx = lerp(a[0], b[0], g), hz = lerp(a[1], b[1], g), ph = S.project(hx, y + dy * 2, hz);
        if (ph) {
          const f = floor(S.t * 30);
          for (let i = 0; i < 14; i++) {
            const h1 = hash(f * 13 + i, 55), h2 = hash(f * 7 + i, 56), L = (6 + 22 * h1) * max(0.5, ph.s / 30), an = PI * (0.6 + 0.8 * h2) * (e.dir || 1);
            const x1 = ph.x + cos(an) * L * (e.dir || 1), y1 = ph.y - abs(sin(an)) * L * 0.6 + h1 * 6;
            u.line(ctx, ph.x, ph.y, x1, y1, i % 3 ? C.butter : C.white);
          }
          u.sparkle(ctx, ph.x, ph.y, 3, C.white, C.butter);
        }
      }
    },
  };

  // ------------------------------------------------------------------ a3heap: a rubble heap raining in, then blown outward
  FX.a3heap = {
    dur: 6, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const at = e.at; if (!at || !HT.fxInternals) return;
      const chunk = HT.fxInternals.chunkSprite, n = e.n || 26, r = e.r || 1.4, mat = e.mat || 'concrete', seed = e.seed || 7;
      const b0 = e.build ? e.build[0] : 0, b1 = e.build ? e.build[1] : 0.01, burst = e.burst === undefined ? 1e9 : e.burst;
      const items = [];
      for (let i = 0; i < n; i++) {
        const h = k => hash(i * 17 + k, seed);
        const land = b0 + (b1 - b0) * h(1), ang = h(2) * TAU, rad = r * Math.sqrt(h(3)), heap = (1 - rad / r) * (e.hgt || 1.3) * (0.6 + 0.5 * h(4));
        let x = at[0] + cos(ang) * rad, y = at[1] + sin(ang) * rad * 0.8, z = heap;
        if (age < land) { const fall = land - age; if (fall > 0.6) continue; z = heap + 4.9 * fall * fall * 6; x += cos(ang) * fall * 3; }
        if (age > burst) { const tb = age - burst, v = 7 + 8 * h(5), el = 0.4 + 0.9 * h(6); x += cos(ang) * cos(el) * v * tb; y += sin(ang) * cos(el) * v * tb; z = max(0, z + sin(el) * v * tb - 4.9 * tb * tb); if (tb > 1.4) continue; }
        const P = S.project(x, y, z); if (!P) continue;
        const px = (0.3 + 0.5 * h(7)) * (e.size || 1) * P.s;
        items.push([P.d, P.x, P.y, px, i, h(8)]);
      }
      items.sort((p, q) => q[0] - p[0]);
      const SZ = [3, 4, 5, 6, 8, 10, 13, 16, 20, 26, 32];
      for (const [, x, y, px, i, rot] of items) {
        if (px < 2.5) { HT.px(ctx, R(x), R(y), i % 2 ? C.lilacgrey : C.dusk); continue; }
        let N = SZ[0]; for (const s of SZ) if (s <= px * 1.05) N = s;
        const spr = chunk(i % 6, mat, N, floor(rot * 16) % 16);
        ctx.drawImage(spr, R(x - spr.width / 2), R(y - spr.height / 2));
      }
    },
  };

  // ------------------------------------------------------------------ the Void, when the set 'void' is not available
  // a3voidBack: the voidBloom art held fully open as a full-frame backdrop (draw it on the 'ground' layer)
  FX.a3voidBack = {
    dur: 30, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const F = FX.voidBloom; if (!F) return;
      F.draw(ctx, 3 + age, Object.assign(Object.create(e), { x: e.x === undefined ? W / 2 : e.x, y: e.y === undefined ? H / 2 : e.y, grow: 0.01, r: undefined, at: undefined }), S);
    },
  };
  // a3voidShatter: cracks race from (x, y), then the Void's image breaks into shards that fly outward / fall,
  // revealing the frame underneath (the scene switches env.set to the city at e.t + crack)
  let vOff = null;
  const cellsCache = HT.lru(4);
  function vCells(x, y, seed, nR, nA) {
    const key = [R(x), R(y), seed, nR, nA].join('|');
    let cells = cellsCache.get(key); if (cells) return cells;
    const rings = [0]; for (let j = 1; j < nR; j++) rings.push(22 * Math.pow(460 / 22, (j - 1) / max(1, nR - 2))); rings.push(1400);
    const Vt = (i, j) => { if (j === 0) return [x, y]; const a = ((i % nA) / nA) * TAU + (hash((i % nA) * 97 + j, seed) * 2 - 1) * (0.33 * PI / nA), rr = rings[j] * (1 + (j < nR ? (hash((i % nA) * 31 + j * 7, seed + 1) * 2 - 1) * 0.2 : 0)); return [x + cos(a) * rr, y + sin(a) * rr]; };
    cells = [];
    for (let j = 0; j < nR; j++) for (let i = 0; i < nA; i++) {
      const a = Vt(i, j), b = Vt(i + 1, j), c = Vt(i + 1, j + 1), d = Vt(i, j + 1);
      const P = j === 0 ? [a[0], a[1], c[0], c[1], d[0], d[1]] : [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]];
      let cx = 0, cy = 0; for (let k = 0; k < P.length; k += 2) { cx += P[k]; cy += P[k + 1]; } cx /= P.length / 2; cy /= P.length / 2;
      cells.push({ P, cx, cy, j, h: hash(i * 13 + j, seed + 2), w: hash(i * 7 + j, seed + 3) * 2 - 1 });
    }
    return cellsCache.set(key, cells);
  }
  FX.a3voidShatter = {
    dur: 3, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(), F = FX.voidBloom; if (!u || !F || ctx.canvas.width !== W) return;
      const x = e.x === undefined ? W / 2 : e.x, y = e.y === undefined ? H / 2 : e.y, crack = e.crack === undefined ? 0.5 : e.crack, seed = e.seed || 11;
      const cells = vCells(x, y, seed, e.rings || 6, e.n || 14);
      if (!vOff) vOff = HT.canvas(W, H);
      const vb = Object.assign(Object.create(e), { x: W / 2, y: H / 2, grow: 0.01, r: undefined, at: undefined, bhx: e.bhx, bhy: e.bhy });
      if (age < crack) { // the Void is still whole: cracks race out from the strike (white, ice at the front)
        F.draw(ctx, 3 + e.t + age, vb, S);
        const q = age / crack, maxR = hypot(W, H);
        for (const c of cells) {
          const d = hypot(c.cx - x, c.cy - y) / maxR; if (d > q * 1.25) continue;
          const n = c.P.length;
          for (let k = 0; k < n; k += 2) { const k2 = (k + 2) % n; if (hash(R(c.P[k] * 7 + c.P[k2] * 13), seed) < 0.3) continue; u.line(ctx, c.P[k] + 1, c.P[k + 1] + 1, c.P[k2] + 1, c.P[k2 + 1] + 1, C.ink); u.line(ctx, c.P[k], c.P[k + 1], c.P[k2], c.P[k2 + 1], d > q ? C.ice : C.white); }
        }
        return;
      }
      const tau = age - crack;
      vOff.g.setTransform(1, 0, 0, 1, 0, 0); vOff.g.clearRect(0, 0, W, H);
      F.draw(vOff.g, 3 + e.t + crack, vb, S);
      const g = e.fall || 520;
      for (const c of cells) {
        const dx = c.cx - x, dy = c.cy - y, D = hypot(dx, dy) || 1, v = (90 + 240 * c.h) * (1.25 - min(1, D / 420) * 0.55);
        const delay = (D / 900) * 0.35, tt = max(0, tau - delay);
        const ox = (dx / D) * v * tt, oy = (dy / D) * v * tt + 0.5 * g * tt * tt * (0.5 + 0.5 * c.h), ang = c.w * 2.6 * tt, sc = max(0.05, 1 - tt * (0.35 + 0.5 * c.h));
        if (sc <= 0.06) continue;
        let rad = 0; for (let k = 0; k < c.P.length; k += 2) rad = max(rad, hypot(c.P[k] - c.cx, c.P[k + 1] - c.cy));
        const X = c.cx + ox, Y = c.cy + oy, rs = rad * sc;
        if (X + rs < 0 || X - rs > W || Y + rs < 0 || Y - rs > H) continue;
        ctx.save();
        ctx.translate(X, Y); ctx.rotate(ang); ctx.scale(sc, sc); ctx.translate(-c.cx, -c.cy);
        ctx.beginPath(); ctx.moveTo(c.P[0], c.P[1]); for (let k = 2; k < c.P.length; k += 2) ctx.lineTo(c.P[k], c.P[k + 1]); ctx.closePath();
        ctx.save(); ctx.clip(); ctx.drawImage(vOff.c, 0, 0); ctx.restore();
        ctx.strokeStyle = (floor(ang * 3 + c.h * 5) % 3 === 0) ? C.white : C.lavender; ctx.lineWidth = 1 / sc; ctx.stroke();
        ctx.restore();
      }
    },
  };

  // ------------------------------------------------------------------ a3amp: Domain Amplification on a rig joint (the
  // kicking foot 'nlT', a fist 'naH'/'faH'): FX 'amplify' (act2_extra) placed on the joint's current world position
  FX.a3amp = {
    dur: 1, layer: 'front', sfx: false,
    draw(ctx, age, e, S) {
      const F = FX.amplify; if (!F) return;
      const js = [].concat(e.joint || 'nlT'), pts = js.map(j => A3.jointAt(S, e.who || 'sukuna', j, S.t));
      F.draw(ctx, age, Object.assign(Object.create(e), { at: pts, r: e.r || 0.32 }), S);
    },
  };

  // ------------------------------------------------------------------ a3glowRing: a soft glowing band on the ground (the
  // edge of a shadow pool catching the Void's light, where ink on a dark floor would not read) — grows like shadowPool
  FX.a3glowRing = {
    dur: 3, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u || !e.at) return;
      const g = e.grow === undefined ? 0.7 : e.grow, out = e.out || 0.4, T = e.dur;
      let k = HT.E.outCubic(min(1, age / g)); if (age > T - out) k *= 1 - HT.E.inQuad((age - (T - out)) / out);
      if (k <= 0.02) return;
      const r = (e.r || 2.2) * k, w = e.w || 0.45, z = (e.at[2] || 0) + 0.02, seed = 13;
      const fn = a => 0.9 + 0.14 * HT.noise(cos(a) * 1.7 + 9, sin(a) * 1.7 + age * 0.6, seed);
      const O = u.projPoly(S, u.circle3(e.at[0], e.at[1], z, r + w, 48, fn)), I = u.projPoly(S, u.circle3(e.at[0], e.at[1], z, max(0.05, r - w * 0.3), 48, fn));
      if (O.length < 6) return;
      u.fillPolys(ctx, [O, I], u.dcol(e.col || C.purple, 0.5 * k));
      u.polyline(ctx, u.projPoly(S, u.circle3(e.at[0], e.at[1], z, r, 48, fn)), u.dcol(e.col2 || C.lavender, 0.9 * k), true);
    },
  };

  // ------------------------------------------------------------------ a3pulse: a quick ring racing over the ground
  FX.a3pulse = {
    dur: 0.6, layer: 'ground', sfx: false,
    draw(ctx, age, e, S) {
      const u = U(); if (!u || !e.at) return;
      const q = age / e.dur, rr = (e.r || 6) * HT.E.outCubic(q);
      const P = u.projPoly(S, u.circle3(e.at[0], e.at[1], (e.at[2] || 0) + 0.03, max(0.05, rr), 40));
      u.polyline(ctx, P, u.dcol(e.col || C.white, 1 - q), true);
      const P2 = u.projPoly(S, u.circle3(e.at[0], e.at[1], (e.at[2] || 0) + 0.03, max(0.05, rr * 0.92), 40));
      u.polyline(ctx, P2, u.dcol(e.col2 || C.ice, 0.7 * (1 - q)), true);
    },
  };
})();
