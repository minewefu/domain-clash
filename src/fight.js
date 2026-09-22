/* DOMAIN CLASH — choreography DSL, compiler and the fight-scene runner.

   A fight scene is data:  HT.fightScene({ id, act, title, dur, set, env, cast, script, cues, ambience, hooks })
   script = time-sorted events (t = scene seconds), one DSL for every act:
     actions  { t, who, do: 'place'|'pose'|'walk'|'run'|'<move>'|'float'|'fly'|'launch'|'blink'|'face'|'expr'|'view'|'hide'|'show'|'trail', ... }
     camera   { t, shot: 'wide'|'medium'|'full'|'low'|'ots'|'closeup'|'ecu'|'crash'|'dolly'|'orbit'|'overhead'|'path'|'follow'|'static'|'panels', blend, ... }
     fx       { t, fx: '<name>', at: [x,y,z] | 'who' | 'who.head' | 'contact' | ..., ... }        (fx.js library)
     sound    { t, sfx: '<name>', vol, pan, dur, pitch }  ·  ambience changes { t, amb: 'wind', vol, fade }
     text     { t, kana: 'ドン', x, y, size, dur, rot }   ·   { t, card: 'ACT I', sub, dur }
     post     { t, post: 'impact'|'manga'|'flash'|'white'|'black'|'split'|'shake'|'letterbox'|'speed', dur, ... }
     world    { t, damage: { kind, ... } }  (persistent destruction → HT.ledger)   ·   { t, env: {...} } (lighting/weather)
   Moves come from rig.MOVES (frame data at 30 fps). Attacks with a `target` are auto-spaced so the strike lands at the
   contact frame, and they spawn the target's reaction (hit-stop hold → knockback) automatically:
     { t: 3.2, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'hit'|'block'|'infinity'|'miss', hitstop: 6, knock: 1.4 }
   Animation: poses are drawn on 2s (12 drawings/s) with key poses always shown at their exact time (the contact pose
   appears on the contact frame); root motion is smooth (camera-tracked) except for strikes; camera/FX run on 1s. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, rig = HT.rig, CAM = HT.cam;
  const W = HT.W, H = HT.H;
  const fight = (HT.fight = {});
  const FPS = 30, DFPS = 12;
  const clamp = HT.clamp, lerp = HT.lerp;

  // ------------------------------------------------------------------ helpers
  const poseOf = x => (typeof x === 'string' ? (rig.POSES[x] || (console.warn('unknown pose ' + x), rig.POSES.stand)) : typeof x === 'function' ? x() : rig.full(x));
  fight.poseOf = poseOf;
  const pw = (pts, f) => { // piecewise-linear lookup [[x, y], ...]
    if (!pts || !pts.length) return 0;
    if (f <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) { const a = pts[i - 1], b = pts[i], u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]); return a[1] + (b[1] - a[1]) * HT.E.inOutQuad(u); }
    return pts[pts.length - 1][1];
  };
  // pose of a move at frame f (keys eased: accelerate into the contact key, decelerate out of it)
  fight.movePose = (M, f) => {
    const K = M.keys;
    if (f <= K[0][0]) return poseOf(K[0][1]);
    for (let i = 1; i < K.length; i++) {
      if (f <= K[i][0]) {
        const a = K[i - 1], b = K[i], u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
        const e = b[0] === M.contact ? HT.E.inQuad(u) : a[0] === M.contact ? HT.E.outQuad(u) : HT.E.inOutQuad(u);
        return rig.lerpPose(poseOf(a[1]), poseOf(b[1]), e);
      }
    }
    return poseOf(K[K.length - 1][1]);
  };
  const HEADINGS = { east: [1, 0], west: [-1, 0], north: [0, 1], south: [0, -1] };
  const headingOf = f => (Array.isArray(f) ? norm2(f) : typeof f === 'number' ? [f >= 0 ? 1 : -1, 0] : HEADINGS[f] || [1, 0]);
  function norm2(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

  // ------------------------------------------------------------------ character track
  // segment: { t0, t1, kind, p0, p1, face, pose(tl) → pose, pos(tl) → [x,y,z], keys (abs times), stepRoot, ones, trail, shake }
  function Track(name, spec) {
    this.name = name; this.char = spec.char || name; this.h = (rig.CHARS[this.char] || { height: 1.8 }).height; this.occlude = spec.occlude; // occlude: false = never hidden by the city
    this.segs = []; this.expr = []; this.views = []; this.vis = []; this.trails = []; this.costumes = [{ t: -1e9, costume: spec.costume || null }];
    this.end = { t: 0, pos: (spec.at || [0, 0, 0]).slice(), face: headingOf(spec.face || 'east'), pose: poseOf(spec.pose || 'stand') };
    if (this.end.pos.length < 3) this.end.pos.push(0);
    this.first = { pos: this.end.pos.slice(), face: this.end.face.slice(), pose: this.end.pose };
  }
  Track.prototype = {
    push(seg) {
      // a new segment interrupts the previous one at its start
      const prev = this.segs[this.segs.length - 1];
      if (prev && prev.t1 > seg.t0) prev.cut = seg.t0;
      seg.prevPose = this.stateAt(seg.t0).pose;
      this.segs.push(seg);
      const tEnd = seg.t1;
      this.end = { t: tEnd, pos: seg.pos(tEnd - seg.t0), face: seg.face, pose: seg.pose(tEnd - seg.t0) };
      return seg;
    },
    segAt(t) { // last segment with t0 <= t
      const S = this.segs;
      let lo = 0, hi = S.length - 1, r = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (S[m].t0 <= t) { r = m; lo = m + 1; } else hi = m - 1; }
      return r;
    },
    // state at time t: { pos (smooth), pose (on 2s), face, seg, drawT }
    stateAt(t, smoothPose) {
      const i = this.segAt(t);
      if (i < 0) return { pos: this.first.pos, pose: this.first.pose, face: this.first.face, drawT: 0, seg: null };
      const s = this.segs[i], tEnd = s.cut !== undefined ? Math.min(s.cut, s.t1) : s.t1;
      const tc = Math.min(t, tEnd), tl = tc - s.t0;
      // drawing time: latest key ≤ t, then steps of 1/12 s
      let dT = tc;
      const onOnes = s.ones || (s.tContact !== undefined && tc < s.tContact - 1e-6);
      if (!onOnes && !smoothPose) {
        let k0 = s.t0;
        if (s.keys) for (const k of s.keys) { if (k <= tc + 1e-9) k0 = k; else break; }
        dT = k0 + Math.floor((tc - k0) * DFPS + 1e-6) / DFPS;
      }
      let pose = s.pose(dT - s.t0);
      // blend in from the previous pose over the first frames
      const bl = s.blendIn === undefined ? 3 / FPS : s.blendIn;
      if (bl > 0 && s.prevPose && dT - s.t0 < bl) pose = rig.lerpPose(s.prevPose, pose, HT.E.outQuad((dT - s.t0) / bl));
      const pt = s.stepRoot ? dT : tc;
      const pos = s.pos(pt - s.t0);
      return { pos, pose, face: s.face, drawT: dT, seg: s };
    },
    exprAt(t) { let e = null; for (const x of this.expr) { if (x.t <= t) e = x; else break; } return e; },
    viewAt(t) { let v = null; for (const x of this.views) { if (x.t <= t) v = x.view; else break; } return v; },
    visibleAt(t) { let v = true; for (const x of this.vis) { if (x.t <= t) v = x.on; else break; } return v; },
    trailAt(t) { let v = null; for (const x of this.trails) { if (x.t <= t && t < x.t + x.dur) v = x; } return v; },
    costumeAt(t) { let v = null; for (const x of this.costumes) { if (x.t <= t) v = x.costume; else break; } return v; },
  };

  // extra per-character draw options an 'expr' event may carry (shikigami: wheel notch/glow, Agito crackle/snake, sword)
  const EXPR_OPTS = ['wheelAngle', 'wheelGlow', 'wheel', 'spark', 'snake', 'regrow', 'tail', 'sword', 'swordGlow', 'swordArm'];
  // reach of a strike: horizontal distance (m) from the root to the striking limb tip at the contact pose
  function reachOf(M, charName) {
    const spec = rig.CHARS[charName], prop = Object.assign({}, rig.PROP, spec.prop || {});
    const P = fight.movePose(M, M.contact), J = rig.fk(P, prop), h = spec.height;
    const tips = { na: J.naH, fa: J.faH, nl: J.nlT, fl: J.flT };
    const limb = (M.smear && M.smear.limb) || 'na';
    const tip = tips[limb] || J.naH;
    return { dx: (tip[0] + (M.reachExtra || 0)) * h, z: tip[1] * h, rootDx: pw(M.root, M.contact) }; // reachExtra: blade length etc. (body heights)
  }

  // ------------------------------------------------------------------ compile a script
  fight.compile = (def) => {
    const cast = {}, order = [];
    for (const name in def.cast) { cast[name] = new Track(name, def.cast[name]); order.push(name); }
    const out = { cast, order, shots: [], fx: [], cues: [], post: [], text: [], ledger: [], env: [], contacts: [], hits: [], shakes: [], warnings: [], fxBySet: {} };
    const ev = (def.script || []).map((e, i) => Object.assign({ _i: i }, e)).sort((a, b) => a.t - b.t || a._i - b._i);
    const warn = m => { out.warnings.push(m); };
    const posAt = (name, t) => cast[name].stateAt(t, true).pos;
    for (const e of ev) {
      if (e.shot) { out.shots.push(e); continue; }
      if (e.fx) { out.fx.push(e); continue; }
      if (e.sfx || e.amb) { out.cues.push(Object.assign({}, e)); continue; }
      if (e.post) { out.post.push(e); continue; }
      if (e.kana || e.card || e.text) { out.text.push(e); continue; }
      if (e.damage) { out.ledger.push(Object.assign({ t: e.t }, e.damage)); continue; }
      if (e.env) { out.env.push(e); continue; }
      if (e.shake) { out.shakes.push({ t: e.t, trauma: e.shake <= 1 ? e.shake : Math.min(1, Math.sqrt(e.shake / 10)) }); continue; }
      if (!e.who) { warn('event without who/type at t=' + e.t); continue; }
      const T = cast[e.who];
      if (!T) { warn('unknown cast member ' + e.who); continue; }
      compileAction(T, e, out, cast, posAt, warn);
    }
    out.fx.sort((a, b) => a.t - b.t); out.post.sort((a, b) => a.t - b.t); out.text.sort((a, b) => a.t - b.t);
    out.shakes.sort((a, b) => a.t - b.t); out.env.sort((a, b) => a.t - b.t);
    return out;
  };

  function compileAction(T, e, out, cast, posAt, warn) {
    const st = T.stateAt(e.t, true);
    const p0 = st.pos.slice(), face0 = (e.face ? headingOf(e.face) : st.face).slice();
    const kind = e.do;
    if (kind === 'place') {
      const pos = (e.at || p0).slice(); if (pos.length < 3) pos.push(0);
      const pose = poseOf(e.pose || st.pose), face = e.face ? headingOf(e.face) : face0;
      T.push({ t0: e.t, t1: e.t, kind, face, pos: () => pos, pose: () => pose, blendIn: 0 });
      return;
    }
    if (kind === 'expr') { const x = { t: e.t, face: e.face, eyes: e.eyes, eyes2: e.eyes2, bleed: e.bleed, hairLift: e.hairLift }; for (const k of EXPR_OPTS) if (e[k] !== undefined) x[k] = e[k]; T.expr.push(x); T.expr.sort((a, b) => a.t - b.t); return; }
    if (kind === 'view') { T.views.push({ t: e.t, view: e.view }); return; }
    if (kind === 'costume') { T.costumes.push({ t: e.t, costume: e.costume }); T.costumes.sort((a, b) => a.t - b.t); return; }
    if (kind === 'hide' || kind === 'show') { T.vis.push({ t: e.t, on: kind === 'show' }); return; }
    if (kind === 'trail') { T.trails.push({ t: e.t, dur: e.dur || 1, n: e.n || 3, gap: e.gap || 1 / DFPS, tint: e.tint || C.ice, alpha: e.alpha || 0.55 }); return; }
    if (kind === 'face') {
      const f = e.face ? headingOf(e.face) : (e.toward ? norm2([posAt(e.toward, e.t)[0] - p0[0], posAt(e.toward, e.t)[1] - p0[1]]) : face0);
      const pose = st.pose;
      T.push({ t0: e.t, t1: e.t, kind, face: f, pos: () => p0, pose: () => pose, blendIn: 0 });
      return;
    }
    if (kind === 'pose') {
      const to = poseOf(e.pose), from = st.pose, dur = e.dur === undefined ? 0.25 : e.dur, ease = HT.E[e.ease || 'inOutQuad'];
      const by = e.by || [0, 0, 0], p1 = [p0[0] + (by[0] || 0), p0[1] + (by[1] || 0), p0[2] + (by[2] || 0)];
      T.push({ t0: e.t, t1: e.t + dur, kind, face: face0, keys: [e.t, e.t + dur], blendIn: 0, ones: !!e.ones,
        pose: tl => rig.lerpPose(from, to, ease(clamp(tl / Math.max(1e-3, dur), 0, 1))),
        pos: tl => { const u = ease(clamp(tl / Math.max(1e-3, dur), 0, 1)); return [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u), lerp(p0[2], p1[2], u)]; } });
      return;
    }
    if (kind === 'walk' || kind === 'run') {
      const to = e.to ? [e.to[0], e.to[1], e.to[2] === undefined ? p0[2] : e.to[2]] : [p0[0] + (e.by ? e.by[0] : 0), p0[1] + (e.by ? e.by[1] : 0), p0[2]];
      const dist = Math.hypot(to[0] - p0[0], to[1] - p0[1]);
      const speed = e.speed || (kind === 'run' ? 5.5 : 1.35) * (T.h / 1.8);
      const dur = e.dur || dist / speed;
      const face = e.face ? headingOf(e.face) : dist > 1e-3 ? norm2([to[0] - p0[0], to[1] - p0[1]]) : face0;
      const stride = (kind === 'run' ? 2.6 : 1.45) * (T.h / 1.8); // metres per full cycle
      const style = e.style || 'normal';
      T.push({ t0: e.t, t1: e.t + dur, kind, face, keys: [e.t],
        pose: tl => {
          const d = dist * clamp(tl / dur, 0, 1), ph = (d / stride + (e.phase || 0)) % 1;
          if (kind === 'run') return rig.run(ph);
          if (style === 'front' || style === 'back' || style === 'frontPockets') return rig.walkFront(ph, { pockets: style === 'frontPockets' || !!e.pockets, back: style === 'back' });
          return rig.walk(ph, { pockets: style === 'pockets' || !!e.pockets, base: style === 'pockets' ? 'pockets' : e.base });
        },
        pos: tl => { const u = clamp(tl / dur, 0, 1); return [lerp(p0[0], to[0], u), lerp(p0[1], to[1], u), lerp(p0[2], to[2], u)]; } });
      return;
    }
    if (kind === 'float' || kind === 'fly') {
      const to = e.to ? e.to.slice() : p0.slice(); if (to.length < 3) to.push(p0[2]);
      const dur = e.dur || 1, ease = HT.E[e.ease || 'inOutCubic'], pose = poseOf(e.pose || (kind === 'fly' ? 'dashFloat' : 'float'));
      const bob = e.bob === undefined ? (kind === 'float' ? 0.04 : 0) : e.bob;
      T.push({ t0: e.t, t1: e.t + dur, kind, face: face0, keys: [e.t], ones: kind === 'fly',
        pose: () => pose,
        pos: tl => { const u = ease(clamp(tl / dur, 0, 1)); return [lerp(p0[0], to[0], u), lerp(p0[1], to[1], u), lerp(p0[2], to[2], u) + bob * Math.sin((e.t + tl) * 2.2)]; } });
      return;
    }
    if (kind === 'launch') { // ballistic flight (knocked across the city): vel [vx, vy, vz] m/s, gravity g, optional ground bounces
      const v = e.vel || [-12, 0, 6], g = e.g === undefined ? 9.8 : e.g, dur = e.dur || 1.5, pose = poseOf(e.pose || 'tumble');
      const face = face0;
      T.push({ t0: e.t, t1: e.t + dur, kind, face, keys: [e.t], ones: true,
        pose: tl => (e.spin ? Object.assign({}, pose, { lean: pose.lean + e.spin * tl * 57.3 }) : pose),
        pos: tl => { const z = p0[2] + v[2] * tl - 0.5 * g * tl * tl; return [p0[0] + v[0] * tl, p0[1] + v[1] * tl, e.ground === false ? z : Math.max(0, z)]; } });
      return;
    }
    if (kind === 'blink') { // Gojo's instant step: vanish, reappear at `to` (trail optional)
      const to = e.to.slice(); if (to.length < 3) to.push(p0[2]);
      const dur = e.dur || 2 / FPS, pose = poseOf(e.pose || st.pose);
      const face = e.face ? headingOf(e.face) : face0;
      T.push({ t0: e.t, t1: e.t + dur, kind, face, keys: [e.t, e.t + dur], ones: true, blendIn: 0,
        pose: () => pose, pos: tl => (tl < dur ? [lerp(p0[0], to[0], tl / dur), lerp(p0[1], to[1], tl / dur), lerp(p0[2], to[2], tl / dur)] : to) });
      T.trails.push({ t: e.t, dur: dur + 0.25, n: 4, gap: dur / 3, tint: e.tint || C.ice, alpha: 0.5 });
      return;
    }
    // ---- a move (strike / technique / reaction) from rig.MOVES
    const M = rig.MOVES[kind];
    if (!M) { warn('unknown action ' + kind + ' for ' + T.name); return; }
    const speed = e.speed || 1;                      // >1 = faster
    const strength = e.strength || M.strength || 2;
    // hit-stop (frames @30 fps): research defaults 4/5/6 by strength (3rd Strike 7/9/11 f @60 fps halved), specials 7-8
    const hs = e.target && e.hit !== 'miss' ? (e.hitstop === undefined ? (M.hitstop || [0, 4, 5, 6, 8][strength] || 5) : e.hitstop) : 0;
    const cf = M.contact;
    let face = face0, rootScale = e.rootScale === undefined ? 1 : e.rootScale, lunge = 0;
    let tgt = null;
    const tContact = e.t + cf / FPS / speed;
    if (e.target && cast[e.target]) {
      tgt = cast[e.target];
      const tp = posAt(e.target, tContact);
      face = norm2([tp[0] - p0[0], tp[1] - p0[1]]);
      // auto-spacing: move so the limb tip reaches the target at the contact frame (or stops short: block/infinity)
      if (e.space !== false) {
        const R = reachOf(M, T.char);
        const gap = e.hit === 'infinity' ? (e.gap === undefined ? 0.28 : e.gap) : e.hit === 'block' ? 0.12 : e.hit === 'miss' ? 0.6 : 0.05;
        const tgtR = 0.18 * (tgt.h / 1.8); // body half-depth
        const need = Math.hypot(tp[0] - p0[0], tp[1] - p0[1]) - (R.dx - R.rootDx) - tgtR - gap;
        // small corrections scale the move's own root motion; larger gaps become a lunge during the startup
        const sc = Math.abs(R.rootDx) > 1e-3 ? need / R.rootDx : 1;
        if (sc >= 0.4 && sc <= 2.2) rootScale = sc;
        else { rootScale = 1; lunge = need - R.rootDx; }
        if (Math.abs(lunge) > 12) warn(T.name + ' ' + kind + ' at ' + e.t + ': lunging ' + lunge.toFixed(1) + ' m to reach ' + e.target);
      }
    }
    // frame → seconds with the hit-stop hold inserted after the contact frame
    const f2t = f => (f <= cf ? f : f + hs) / FPS / speed;
    const t2f = tl => { const f = tl * FPS * speed; return f <= cf ? f : f < cf + hs ? cf : f - hs; };
    const dur = f2t(M.len);
    const keys = M.keys.map(k => e.t + f2t(k[0])); if (hs) keys.push(e.t + (cf + hs) / FPS / speed); keys.sort((a, b) => a - b);
    const lift = M.lift, rootK = M.root;
    const segFace = face;
    const seg = T.push({ t0: e.t, t1: e.t + dur, kind, face: segFace, keys, stepRoot: true, move: M, hitstop: hs, tContact,
      pose: tl => fight.movePose(M, t2f(tl)),
      pos: tl => { const f = t2f(tl), d = pw(rootK, f) * rootScale + lunge * HT.E.inOutQuad(clamp(f / Math.max(1, cf), 0, 1)), z = lift ? pw(lift, f) : 0; return [p0[0] + segFace[0] * d, p0[1] + segFace[1] * d, p0[2] + z]; } });
    // default swing sounds
    if (M.sfx && e.sfx !== false) for (const f in M.sfx) out.cues.push({ t: e.t + f2t(+f), sfx: M.sfx[f], vol: 0.55, pan: 0, _auto: true, who: T.name });
    if (!tgt) return;
    // contact point (world): striking limb tip at the contact frame
    const R = reachOf(M, T.char);
    const pc = seg.pos(cf / FPS / speed);
    const contact = [pc[0] + segFace[0] * R.dx, pc[1] + segFace[1] * R.dx, pc[2] + R.z];
    const hit = { t: tContact, by: T.name, target: tgt.name, kind: e.hit || 'hit', at: contact, strength, hitstop: hs, id: e.id };
    out.contacts.push(hit);
    if (hit.kind === 'miss') return;
    // hit-stop screen shake + hit sound
    out.shakes.push({ t: tContact, trauma: e.trauma === undefined ? ([0, 0.06, 0.15, 0.35, 0.8][Math.min(4, hit.strength)] || 0.15) * (hit.kind === 'infinity' ? 0.5 : 1) : e.trauma });
    if (e.hitSfx !== false) out.cues.push({ t: tContact, sfx: e.hitSfx || (hit.kind === 'infinity' ? 'infinityStop' : hit.kind === 'block' ? 'block' : ['hitL', 'hitL', 'hitM', 'hitH'][hit.strength]), vol: e.hitVol || 0.9, _auto: true, who: T.name });
    if (e.impact || (hit.strength >= 3 && e.impact !== false && hit.kind === 'hit')) out.post.push({ t: tContact, post: 'impact', dur: (e.impact || 2) / FPS, mode: e.impactMode || 'invert', _auto: true });
    if (e.fxHit !== false) out.fx.push({ t: tContact, fx: hit.kind === 'infinity' ? 'infinityRipple' : hit.kind === 'block' ? 'blockSpark' : 'hitSpark', at: contact.slice(), strength: hit.strength, dir: segFace.slice(), _auto: true });
    // the target's reaction (unless it is protected by Infinity, or the script says react: false)
    if (hit.kind === 'infinity' || e.react === false) return;
    const reactName = e.react || (hit.kind === 'block' ? 'block' : hit.strength >= 3 ? 'knockFly' : contact[2] > tgt.h * 0.7 ? 'hitHigh' : 'hitMid');
    const RM = rig.MOVES[reactName];
    if (!RM) { warn('unknown reaction ' + reactName); return; }
    const tq = posAt(tgt.name, tContact);
    const away = norm2([tq[0] - p0[0], tq[1] - p0[1]]);
    const knock = e.knock === undefined ? 1 : e.knock;
    const rf = headingOf([-away[0], -away[1]]); // the target faces the attacker
    const rDur = (RM.len + hs) / FPS;
    const rKeys = RM.keys.map(k => tContact + (k[0] + hs) / FPS); rKeys.unshift(tContact);
    const rootR = RM.root, liftR = RM.lift;
    tgt.push({ t0: tContact, t1: tContact + rDur, kind: 'react', face: rf, keys: rKeys, stepRoot: true, blendIn: 0, hitstop: hs, shakeUntil: tContact + hs / FPS, shakeFrom: tContact, jitter: [0, 2, 3, 4, 4][Math.min(4, hit.strength)],
      pose: tl => fight.movePose(RM, Math.max(0, tl * FPS - hs)),
      pos: tl => { const f = Math.max(0, tl * FPS - hs); const d = -pw(rootR, f) * knock, z = liftR ? pw(liftR, f) * Math.max(0.3, Math.min(2, knock)) : 0; return [tq[0] + away[0] * d, tq[1] + away[1] * d, tq[2] + z]; } });
  }

  // ------------------------------------------------------------------ camera track evaluation
  function camAt(sc, S, t) {
    CAM.defaultMaxDist = (S.env && S.env.camMaxDist) || 0;
    const shots = sc.C.shots;
    let i = -1; for (let k = 0; k < shots.length; k++) { if (shots[k].t <= t) i = k; else break; }
    if (i < 0) return CAM.make({ y: -14, z: 1.5 });
    const e = shots[i], fn = HT.shots[e.shot];
    if (!fn) return CAM.make({});
    let c = fn(S, t, e, e.t);
    if (e.blend && i > 0 && t - e.t < e.blend) { // ease from the previous shot (evaluated at the same time)
      const pe = shots[i - 1], pf = HT.shots[pe.shot];
      if (pf) c = CAM.blend(pf(S, t, pe, pe.t), c, HT.E[e.blendEase || 'inOutCubic'](clamp((t - e.t) / e.blend, 0, 1)));
    }
    if (e.shake !== undefined && !e.shakeOff) { /* per-shot constant jitter */ const s = HT.shake(t, e.shake, 16, 91); c.sx = (c.sx || 0) + s[0]; c.sy = (c.sy || 0) + s[1]; }
    c._shot = e; c._shotStart = e.t;
    return c;
  }
  // camera shake: trauma model (Eiserloh, GDC 2016) made stateless - trauma(t) = min(1, sum of max(0, a_i - 1.2 (t - t_i))),
  // offset = trauma^2 * 10 px * smooth noise at ~8 Hz (integer pixels)
  const SHAKE_MAX = 10, SHAKE_DECAY = 1.2, SHAKE_HZ = 8;
  function traumaAt(sc, t) {
    let tr = 0;
    for (const s of sc.C.shakes) { if (s.t > t) break; tr += Math.max(0, s.trauma - SHAKE_DECAY * (t - s.t)); }
    return Math.min(1, tr);
  }
  function shakeAt(sc, t) {
    const tr = traumaAt(sc, t);
    if (tr <= 0.001) return [0, 0];
    const k = tr * tr * SHAKE_MAX;
    return [Math.round((HT.noise(t * SHAKE_HZ, 0.5, 71) - 0.5) * 2 * k), Math.round((HT.noise(t * SHAKE_HZ, 9.5, 73) - 0.5) * 2 * k)];
  }
  fight.traumaAt = traumaAt;
  function envAt(sc, t) {
    let env = sc.env;
    for (const e of sc.C.env) { if (e.t <= t) env = Object.assign({}, env, e.env); else break; }
    return env;
  }

  // ------------------------------------------------------------------ the scene runner
  HT.SETS = HT.SETS || {};
  const LIGHTS = { // per time-of-day defaults: key light (screen space) + rim colour
    dawn: { light: [0.55, -0.45, 0.7], rim: C.ice }, noon: { light: [-0.2, -0.9, 0.5], rim: C.white }, overcast: { light: [-0.3, -0.6, 0.75], rim: C.mist },
    sunset: { light: [-0.7, -0.25, 0.65], rim: C.gold }, void: { light: [0.1, -0.5, 0.85], rim: C.lavender }, shrine: { light: [0.3, 0.6, 0.6], rim: C.red },
    white: { light: [0, -0.5, 0.9], rim: C.white }, night: { light: [0.4, -0.6, 0.7], rim: C.blue }, airport: { light: [-0.6, -0.4, 0.7], rim: C.cream },
    command: { light: [0, -0.3, -0.9], rim: C.ice }, // lit from the tower of screens (sets agent's suggestion)
  };
  fight.LIGHTS = LIGHTS;

  HT.fightScene = (def) => {
    const sc = HT.scene({
      id: def.id, act: def.act, title: def.title || def.id, dur: def.dur, transitionIn: def.transitionIn || { type: 'cut', dur: 0 },
      cues: [], ambience: def.ambience || [],
    });
    sc.fightDef = def;
    sc.env = Object.assign({ time: 'dawn', snow: 0, set: def.set || 'plain' }, def.env || {});
    sc.C = fight.compile(def);
    if (sc.C.warnings.length) console.warn('[fight ' + def.id + ']', sc.C.warnings.join(' | '));
    // audio cues: explicit + auto (moves/contacts) + fx default sounds
    // FX default sounds come from HT.fxCues (charge + release, one clunk per wheel notch, …); a default sound that
    // duplicates a hand-placed cue of the same name within 0.12 s is dropped (the hand-placed one wins); cues without
    // a sound or ambience name are ignored
    const manual = [...(def.cues || []), ...sc.C.cues.map(c => { const o = Object.assign({}, c); delete o._auto; delete o.who; delete o._i; return o; })];
    const fxc = [];
    for (const f of sc.C.fx) {
      if (HT.fxCues) fxc.push(...HT.fxCues(f));
      else { const F = HT.FX && HT.FX[f.fx]; if (F && F.sfx && f.sfx !== false) fxc.push({ t: f.t + (F.sfxAt || 0), sfx: typeof F.sfx === 'function' ? F.sfx(f) : F.sfx, vol: f.vol === undefined ? 0.8 : f.vol }); }
    }
    const dup = c => manual.some(m => m.sfx === c.sfx && Math.abs(m.t - c.t) < 0.12);
    sc.cues.push(...manual.filter(c => c.sfx || c.amb), ...fxc.filter(c => c.sfx && !dup(c)));
    sc.cues.sort((a, b) => a.t - b.t);
    // persistent damage → the global ledger (scene-relative; resolved to film time after the timeline is built)
    if (HT.ledger) for (const d of sc.C.ledger) HT.ledger.add(Object.assign({ scene: def.id }, d));
    // init is incremental (a generator): set resources, then derived world data for every ledger state the scene
    // will show (so the first frame after a slice/crater/set switch never stalls), then the scene's own init
    sc.init = function* () {
      const set = HT.SETS[sc.env.set];
      sc.R = { set: set && set.init ? set.init(sc, def.setOpts || {}) : null };
      yield;
      const T0 = sc._start || 0, T1 = T0 + sc.dur, times = [T0 + 1e-3];
      if (HT.ledger) { HT.ledger.state(T1); for (const e of HT.ledger.entries) { if (e.T0 >= T0 && e.T0 <= T1) times.push(e.T0 + 1e-3, HT.ledger.animUntil(e) + 1e-3); } }
      const sets = new Set([sc.env.set, ...sc.C.env.filter(e => e.env && e.env.set).map(e => e.env.set)]);
      if (sets.has('city') || sets.has('voxel') || sets.has('overhead')) for (const T of times) { if (HT.cityGeometry) HT.cityGeometry(Math.min(T, T1)); yield; }
      const needsHeights = sets.has('voxel') || sets.has('overhead') || sets.has('sky') || sc.C.shots.some(e => e.shot === 'overhead');
      if (needsHeights && HT.voxelWarm) for (const T of times) { while (!HT.voxelWarm(Math.min(T, T1))) yield; }
      // close-up busts: the first render per character/expression costs 30–40 ms — warm them here, one per slice
      if (HT.busts && HT.busts.render) {
        const seen = new Set();
        const walk = (e, t) => { if (!e) return; if (e.shot === 'panels' && e.panels) { for (const p of e.panels) walk(p.shot, t); return; }
          if ((e.shot === 'closeup') && e.bust) { const tr = sc.C.cast[e.who]; if (!tr) return; const o = Object.assign({ size: e.size || 210, costume: tr.costumeAt(t) || tr.costume || undefined }, e.bust), key = tr.char + JSON.stringify(o); if (!seen.has(key)) { seen.add(key); jobs.push([tr.char, o]); } } };
        const jobs = []; for (const e of sc.C.shots) walk(e, e.t);
        // top-level close-ups: warm with exactly the options the render will use on the shot's first frame (facing, light,
        // rim, expression, costume, animation phase) — a mismatched key never hit the cache (20–80 ms first-frame spikes)
        for (const e of sc.C.shots) {
          if (e.shot !== 'closeup' || !e.bust) continue;
          try {
            const t = e.t, S = makeState(sc, t, T0 + t), env = S.env = envAt(sc, t), L = LIGHTS[env.time] || LIGHTS.dawn;
            S.light = env.light || L.light; S.rim = env.rim || L.rim;
            const c = camAt(sc, S, t), cu = c && c.closeup, tr = sc.C.cast[e.who];
            if (!cu || !tr) continue;
            const o = Object.assign({ size: cu.size || 210, face: screenFace(sc, S, e.who, c), t, light: S.light, rim: S.rim, costume: tr.costumeAt(t) || undefined }, exprOf(sc, e.who, t), cu.bust);
            jobs.push([tr.char, o]);
          } catch (err) { console.warn('[fight] bust warm (exact) failed', e.who, err); }
        }
        for (const [who, o] of jobs) { try { HT.busts.render(who, o); } catch (err) { console.warn('[fight] bust warm failed', who, err); } yield; }
      }
      if (def.init) { const r = def.init.call(sc, sc.R); if (r && typeof r.next === 'function') yield* r; }
    };
    sc.dispose = function () { const set = HT.SETS[sc.env.set]; if (set && set.dispose && sc.R) set.dispose(sc.R.set); sc._hold = null; if (def.dispose) def.dispose.call(sc); };
    sc.draw = function (ctx, t, T) { fight.render(sc, ctx, t, T); };
    return sc;
  };

  // scene state for shots/FX (reused object, refreshed every frame)
  function makeState(sc, t, T) {
    const S = sc._S || (sc._S = {});
    S.sc = sc; S.t = t; S.T = T; S.W = W; S.H = H; S.castNames = sc.C.order;
    S.at = (name, tt) => { const tr = sc.C.cast[name]; if (!tr) return { x: 0, y: 0, z: 0, h: 1.8, face: [1, 0] }; const s = tr.stateAt(tt === undefined ? t : tt, true); return { x: s.pos[0], y: s.pos[1], z: s.pos[2], h: tr.h, face: s.face }; };
    S.pt = (ref, tt) => {
      tt = tt === undefined ? t : tt;
      if (Array.isArray(ref)) return ref;
      if (ref === 'mid') { const n = sc.C.order; const a = S.at(n[0], tt), b = S.at(n[1] || n[0], tt); return [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2]; }
      const [name, part] = String(ref).split('.');
      if (part === 'hand' || part === 'hand2') { // the rig's near (hand) / far (hand2) hand joint, in world space
        const tr = sc.C.cast[name];
        if (tr) {
          const s = tr.stateAt(tt, true), prop = tr._prop || (tr._prop = Object.assign({}, HT.rig.PROP, (HT.rig.CHARS[tr.char] || {}).prop || {}));
          const J = HT.rig.fk(s.pose, prop), hj = part === 'hand' ? J.naH : J.faH, h = tr.h;
          if (hj) return [s.pos[0] + s.face[0] * hj[0] * h, s.pos[1] + s.face[1] * hj[0] * h, s.pos[2] + hj[1] * h];
        }
      }
      const a = S.at(name, tt);
      const k = part === 'head' ? 0.93 : part === 'chest' ? 0.72 : part === 'hip' ? 0.52 : part === 'feet' ? 0 : 0;
      return [a.x, a.y, a.z + a.h * k];
    };
    return S;
  }

  // render one frame of a fight scene
  fight.render = (sc, ctx, t, T) => {
    const S = makeState(sc, t, T);
    const env = S.env = envAt(sc, t);
    const L = LIGHTS[env.time] || LIGHTS.dawn;
    S.light = env.light || L.light; S.rim = env.rim || L.rim;
    // camera (+ accumulated impact shake)
    let c = camAt(sc, S, t);
    const sh = shakeAt(sc, t);
    c.sx = (c.sx || 0) + sh[0]; c.sy = (c.sy || 0) + sh[1];
    CAM.prep(c);
    S.cam = c;
    S.project = (x, y, z, o) => CAM.project(c, x, y, z, o);
    const def = sc.fightDef, hooks = def.hooks || {};
    // panels: the runner renders sub-shots into panel rects (manga.js provides the layout + borders). Panel pages
    // animate on 2s (12 drawings/s, like held manga drawings — and every other frame reuses the cached world views);
    // `ones: true` on the panels shot opts out
    if (c._shot && c._shot.shot === 'panels' && HT.manga && HT.manga.panels) {
      if (!c._shot.ones) { const tq = Math.max(c._shot.t || 0, Math.floor(t * 12 + 1e-6) / 12); if (tq !== t) return fight.render(sc, ctx, tq, T - (t - tq)); } // exact snap: the cached views key on the camera at tq
      S.twos = !c._shot.ones;
      if (S.twos && holdHit(sc, ctx, t)) return;
      HT.manga.panels(ctx, S, c._shot, (g, subCam, P) => renderView(sc, g, S, subCam, P && P.env ? Object.assign({}, env, P.env) : env, hooks)); postPass(sc, ctx, S);
      if (S.twos) holdKeep(sc, ctx, t);
      S.twos = false; return;
    }
    // `twos: true` (15 drawings/s) or `twos: <fps>` on any shot: the whole frame animates on 2s, like an anime camera
    // move shot on 2s — the world view repeats, so every other frame reuses the cached city render (wide moving shots)
    const tw = c._shot && c._shot.twos;
    if (tw) { const fps = tw === true ? 15 : tw, tq = Math.max(c._shot.t || 0, Math.floor(t * fps + 1e-6) / fps); if (tq !== t) return fight.render(sc, ctx, tq, T - (t - tq)); if (holdHit(sc, ctx, t)) return; S.twos = true; }
    renderView(sc, ctx, S, c, env, hooks);
    // falling snow over everything in the view (env.snowFall = density 0..1; the ground cover is env.snow)
    if (env.snowFall && HT.weather && HT.weather.snow) HT.weather.snow(ctx, S, env.snowFall, { wind: env.wind || 0.3 });
    postPass(sc, ctx, S);
    if (tw) { holdKeep(sc, ctx, t); S.twos = false; }
  };
  // frames on 2s repeat exactly: the finished frame at the snapped time is held and blitted for the repeat (a pure function
  // of that time — FX, panels and compositing are skipped on the second frame)
  function holdHit(sc, ctx, t) {
    const H = sc._hold, cv = ctx.canvas;
    if (!H || H.t !== t || H.w !== cv.width || H.h !== cv.height) return false;
    const tr = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(H.cv.c, 0, 0); ctx.setTransform(tr);
    return true;
  }
  function holdKeep(sc, ctx, t) {
    const cv = ctx.canvas, w = cv.width, h = cv.height;
    let H = sc._hold; if (!H || H.w !== w || H.h !== h) H = sc._hold = { cv: HT.canvas(w, h), w, h, t: NaN };
    H.cv.g.setTransform(1, 0, 0, 1, 0, 0); H.cv.g.clearRect(0, 0, w, h); H.cv.g.drawImage(cv, 0, 0); H.t = t;
  }

  // ground-layer FX (flat decals) over the set: in city views they are drawn into a scratch layer and erased where the
  // city's depth buffer has walls/roofs/props in front of the decal's plane (HT.cityOccluder), then composited
  let GS = null;
  function groundFx(ctx, S, list, env) {
    const zs = env.set === 'city' && HT.cityOccluder && HT.fxActiveZ ? HT.fxActiveZ(S, list, 'ground') : null;
    if (!zs || !zs.length) { HT.fxDraw(ctx, S, list, 'ground'); return; }
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!GS || GS.c.width !== w || GS.c.height !== h) GS = HT.canvas(w, h);
    const g = GS.g;
    for (const z of zs) {
      const L = zs.length > 1 ? list.filter(e => fxZ(e) === z) : list;
      // the union of the group's screen boxes (FX def gbox); one FX without a box → the whole region below the horizon
      let box = null, full = false;
      for (const e of L) {
        if (!(e.t <= S.t)) continue; const F = HT.FX[e.fx]; if (!F) continue;
        const Ly = e.layer || F.layer || 'front'; if (Ly !== 'ground' && !(Array.isArray(Ly) && Ly.indexOf('ground') >= 0)) continue;
        const age = S.t - e.t; if (!(age >= 0 && age < HT.fxDur(e))) continue;
        const b = F.gbox ? (S.fxLayer = 'ground', F.gbox(e, S, age)) : null; S.fxLayer = null;
        if (!b) { full = true; break; }
        box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
      }
      const m = HT.cityOccluder(z, full ? null : box);
      if (!m || (m.empty && !m.off)) { HT.fxDraw(ctx, S, L, 'ground'); continue; } // nothing in front: draw directly
      if (m.off) continue;                                                            // off screen / above the horizon
      const B = m.box, bx = B[0], by = B[1], bw = B[2] - B[0] + 1, bh = B[3] - B[1] + 1;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(bx, by, bw, bh);
      g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip();
      g.setTransform(ctx.getTransform());
      HT.fxDraw(g, S, L, 'ground');
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(m.c, m.vx, m.vy); g.globalCompositeOperation = 'source-over';
      const tr = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(GS.c, bx, by, bw, bh, bx, by, bw, bh); ctx.setTransform(tr);
    }
  }
  const fxZ = e => (e.groundZ !== undefined ? e.groundZ : Array.isArray(e.at) ? (e.at[2] || 0) : Array.isArray(e.center) ? (e.center[2] || 0) : 0);
  // world-scale FX (FX def occ(): the Void's shell, the Shrine, the rake on the shell): in city views each is drawn into
  // the scratch layer, erased inside its box where the city is nearer than its depth, and composited — first, before the
  // layer's other (near, fighter-scale) effects. Returns the list of the layer's remaining events.
  function occFx(ctx, S, list, layer, env) {
    if (env.set !== 'city' || !HT.cityOccluderAt || !HT.fxActiveOcc) return list;
    const occ = HT.fxActiveOcc(S, list, layer);
    if (!occ.length) return list;
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!GS || GS.c.width !== w || GS.c.height !== h) GS = HT.canvas(w, h);
    const g = GS.g;
    for (const e of occ) {
      const F = HT.FX[e.fx]; S.fxLayer = layer;
      const o = F.occ(e, S, S.t - e.t), m = o ? HT.cityOccluderAt(o.d, o.box) : null;
      if (!m || m.empty) { HT.fxDraw(ctx, S, [e], layer); continue; }
      if (F.parts) { S.fxPart = 'tint'; HT.fxDraw(ctx, S, [e], layer); } // an unmasked screen-wide part (FX that declare parts)
      const B = m.box, bx = B[0], by = B[1], bw = B[2] - B[0] + 1, bh = B[3] - B[1] + 1; // the body stays inside its box
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(bx, by, bw, bh);
      g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); g.setTransform(ctx.getTransform());
      S.fxPart = 'body'; HT.fxDraw(g, S, [e], layer); S.fxPart = undefined;
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(m.c, m.vx, m.vy); g.globalCompositeOperation = 'source-over';
      const tr = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(GS.c, bx, by, bw, bh, bx, by, bw, bh); ctx.setTransform(tr);
    }
    S.fxLayer = null;
    return list.filter(e => occ.indexOf(e) < 0);
  }

  // everything except full-frame post effects, for one camera (reused by manga panels)
  function renderView(sc, ctx, S, c, env, hooks) {
    if (env === S.env) return renderView0(sc, ctx, S, c, env, hooks);
    const e0 = S.env, l0 = S.light, r0 = S.rim, L = LIGHTS[env.time];
    S.env = env; if (L && env.time !== (e0 && e0.time)) { S.light = env.light || L.light; S.rim = env.rim || L.rim; }
    try { return renderView0(sc, ctx, S, c, env, hooks); } finally { S.env = e0; S.light = l0; S.rim = r0; }
  }
  function renderView0(sc, ctx, S, c, env, hooks) {
    const t = S.t;
    // sets that render with a sheared pitch (verticals stay vertical) → convert pitch into lens shift for everything
    const set0 = HT.SETS[env.set];
    if (set0 && set0.shear && c.pitch && c.pitch > -1.0) { c = Object.assign({}, c); c.shift = (c.shift || 0) + c.f * Math.tan(c.pitch); c.pitch = 0; c._prepped = false; }
    else if (c.pitch <= -1.0) { c = Object.assign({}, c, { _overhead: true }); }
    S.cam = CAM.prep(c);
    S.project = (x, y, z, o) => CAM.project(c, x, y, z, o);
    const set = HT.SETS[env.set] || HT.SETS.plain;
    // FX may be tied to worlds: e.sets = ['city'] keeps the Shrine's pool out of the Void's interior (and vice versa);
    // the view's set comes from the scene env or a manga panel's env override
    const fxList = sc.C.fxBySet ? (sc.C.fxBySet[env.set] || (sc.C.fxBySet[env.set] = sc.C.fx.filter(e => !e.sets || e.sets.indexOf(env.set) >= 0))) : sc.C.fx;
    S.envView = env;
    if (set) set.draw(ctx, c, S, 'back', sc.R ? sc.R.set : null);
    if (hooks.back) hooks.back(ctx, S);
    if (HT.fxDraw) groundFx(ctx, S, fxList, env);
    if (HT.fxDraw) HT.fxDraw(ctx, S, occFx(ctx, S, fxList, 'behind', env), 'behind');
    // close-ups: the subject is drawn as a hand-authored bust (busts.js) over the set; ECU = the eyes band
    const cu = c.closeup || null, ecu = c.ecu || null;
    if (ecu && HT.busts && HT.busts.eyes) {
      HT.fx.fade(ctx, 0.55, C.ink);
      const face = screenFace(sc, S, ecu.who, c);
      HT.busts.eyes(ctx, ecu.who, W / 2, H / 2, W * (ecu.w || 0.92), Object.assign({ t, face, light: S.light, rim: S.rim }, exprOf(sc, ecu.who, t), ecu.eyes || {}));
      if (HT.fxDraw) HT.fxDraw(ctx, S, fxList, 'front');
      if (hooks.front) hooks.front(ctx, S);
      return;
    }
    const bustWho = cu && cu.bust && HT.busts && HT.busts.draw ? cu.who : null;
    if (bustWho) { // close-up backgrounds: 'set' (as is) · 'haze' (the set washed toward cu.haze, e.g. dust) · 'grad' (abstract) · default dimmed
      if (cu.bg === 'haze') { HT.fx.fade(ctx, cu.dim === undefined ? 0.6 : cu.dim, cu.haze || C.lilacgrey); HT.fx.fade(ctx, 0.12, C.ink); }
      else if (cu.bg === 'grad') HT.vgrad(ctx, 0, 0, W, H, cu.cols || [[0, C.navy], [0.7, C.indigo], [1, C.lavender]]);
      else if (cu.bg !== 'set') HT.fx.fade(ctx, cu.dim === undefined ? 0.3 : cu.dim, C.ink);
    }
    // characters, far → near
    const list = [];
    for (const name of sc.C.order) {
      const tr = sc.C.cast[name];
      if (!tr.visibleAt(t) || name === bustWho) continue;
      const st = tr.stateAt(t);
      const pr = CAM.project(c, st.pos[0], st.pos[1], st.pos[2]);
      if (!pr) continue;
      // cull: a fighter whose box misses the view is not drawn — and one taller than 4 frames (nearly in the lens) is never
      // rasterized (a first-time 7000 px drawing of an off-screen fighter cost ~1 s and ~0.5 GB of canvas)
      if (!c._overhead) {
        const hp = (tr.h || 1.8) * pr.s, vx0 = c.vx || 0, vy0 = c.vy || 0, vx1 = vx0 + (c.vw || W), vy1 = vy0 + (c.vh || H);
        if (hp > 4 * H || pr.x + hp < vx0 || pr.x - hp > vx1 || pr.y - hp * 1.3 > vy1 || pr.y + hp * 0.4 < vy0) continue;
      }
      list.push({ name, tr, st, pr });
    }
    list.sort((a, b) => b.pr.d - a.pr.d);
    S.drawn = {};
    for (const it of list) drawFighter(ctx, S, it, env);
    if (bustWho) {
      const face = screenFace(sc, S, bustWho, c), ex = exprOf(sc, bustWho, t);
      const tr = sc.C.cast[bustWho];
      HT.busts.draw(ctx, tr.char, round2(W / 2 + (cu.side || 0) * W * 0.22), H + (cu.bottom || 0), Object.assign({ size: cu.size || 210, face, t, light: S.light, rim: S.rim, costume: tr.costumeAt(t) || undefined }, ex, cu.bust));
    }
    if (HT.fxDraw) HT.fxDraw(ctx, S, occFx(ctx, S, fxList, 'front', env), 'front');
    if (set && set.drawFront) set.drawFront(ctx, c, S, sc.R ? sc.R.set : null);
    if (hooks.front) hooks.front(ctx, S);
  }
  fight.renderView = renderView;
  const round2 = Math.round;
  function screenFace(sc, S, name, c) {
    const tr = sc.C.cast[name]; if (!tr) return 1;
    const st = tr.stateAt(S.t, true), right = [Math.cos(c.yaw), -Math.sin(c.yaw)];
    return (st.face[0] * right[0] + st.face[1] * right[1]) >= 0 ? 1 : -1;
  }
  function exprOf(sc, name, t) { // current expression flags of a character, for busts
    const tr = sc.C.cast[name], ex = tr ? tr.exprAt(t) : null, o = {};
    if (ex) {
      if (ex.face) o.expr = ex.face; if (ex.eyes) o.eyes = ex.eyes; if (ex.eyes2) o.eyes2 = ex.eyes2; if (ex.bleed) o.bleed = true;
      // the second eyes open over ~0.45 s from the moment the expression switched to eyes2: 'open'
      if (ex.eyes2 === 'open') { let t0 = ex.t; for (const x of tr.expr) { if (x.t > t) break; if (x.eyes2 === 'open' && (x === ex || x.t < t0)) t0 = Math.min(t0, x.t); } o.open2 = HT.clamp((t - t0) / 0.45, 0, 1); }
    }
    return o;
  }
  fight.screenFace = screenFace; fight.exprOf = exprOf;

  function drawFighter(ctx, S, it, env) {
    const { name, tr, st, pr } = it, t = S.t, c = S.cam;
    if (c._overhead) { // top-down: project with the map's orthographic mapping (screen up = camera heading)
      const mpp = c.z / c.f, cyw = Math.cos(c.yaw), syw = Math.sin(c.yaw), dx = st.pos[0] - c.x, dy = st.pos[1] - c.y;
      const sxm = dx * cyw - dy * syw, sym = dx * syw + dy * cyw;
      const x = (c.vx || 0) + (c.vw || W) / 2 + sxm / mpp, y = (c.vy || 0) + (c.vh || H) / 2 - sym / mpp, r = Math.max(1, Math.round(0.35 / mpp));
      HT.alpha(ctx, 0.45, () => HT.circle(ctx, x + 1, y + 1, r + 1, C.ink));
      HT.circle(ctx, x, y, r, tr.char === 'gojo' ? C.white : tr.char === 'sukuna' ? C.ink : C.mist);
      if (tr.char === 'sukuna') HT.px(ctx, x, y, C.white);
      return;
    }
    const px = tr.h * pr.s;
    if (px < 3) return;
    // screen facing: + if the heading points to the camera's right
    const right = [Math.cos(c.yaw), -Math.sin(c.yaw)];
    const face = (st.face[0] * right[0] + st.face[1] * right[1]) >= 0 ? 1 : -1;
    // pose + expression + view overrides
    let P = st.pose;
    const ex = tr.exprAt(t), vw = tr.viewAt(t);
    if (ex || vw) {
      P = Object.assign({}, P);
      if (ex) { if (ex.face) P.face = ex.face; if (ex.eyes) P.eyes = ex.eyes; if (ex.eyes2) P.eyes2 = ex.eyes2; if (ex.bleed !== undefined) P.bleed = ex.bleed; if (ex.hairLift !== undefined) P.hairLift = ex.hairLift; for (const k of EXPR_OPTS) if (ex[k] !== undefined) P[k] = ex[k]; }
      if (vw) P.view = vw;
    }
    // secondary motion: springs driven by the smooth head/hip world motion (converted to body-height units, screen-oriented)
    const sec = secondary(tr, st.drawT, face, env);
    const g0 = CAM.project(c, st.pos[0], st.pos[1], 0);
    // shake during hit-stop hold (victim jitters)
    let dx = 0, dy = 0;
    if (st.seg && st.seg.shakeUntil && t < st.seg.shakeUntil) { // victim jitter: +-2/3/4 px, flips every frame, linear decay
      const span = st.seg.shakeUntil - st.seg.shakeFrom, k = span > 0 ? 1 - (t - st.seg.shakeFrom) / span : 0;
      const amp = Math.round((st.seg.jitter || 2) * k), sgn = (Math.floor(t * FPS) & 1) ? 1 : -1;
      if (st.pos[2] > 0.25) dy = sgn * amp; else dx = sgn * amp;
    }
    const light = S.light, rimDir = [-light[0], -light[1]];
    const costume = tr.costumeAt(t);
    const key = st.drawT.toFixed(3) + '|' + (P.view || 'side') + '|' + (costume || '') + '|' + (ex ? (ex.face || '') + (ex.eyes || '') + (ex.eyes2 || '') + (ex.bleed ? 'b' : '') + (ex.hairLift || '') + EXPR_OPTS.map(k => (ex[k] !== undefined ? k[0] + ex[k] : '')).join('') : '');
    const mode = S.mode || 'normal';
    // afterimages
    const trail = tr.trailAt(t);
    if (trail) {
      for (let k = trail.n; k >= 1; k--) {
        const tt = t - k * trail.gap, s2 = tr.stateAt(tt), p2 = CAM.project(c, s2.pos[0], s2.pos[1], s2.pos[2]);
        if (!p2) continue;
        { const hp = tr.h * p2.s, vx0 = c.vx || 0, vy0 = c.vy || 0, vx1 = vx0 + (c.vw || W), vy1 = vy0 + (c.vh || H); // same cull as the fighter
          if (hp > 4 * H || p2.x + hp < vx0 || p2.x - hp > vx1 || p2.y - hp * 1.3 > vy1 || p2.y + hp * 0.4 < vy0) continue; }
        HT.rig.draw(ctx, tr.char, p2.x + dx, p2.y + dy, s2.pose, tr.h * p2.s, { face, light, rimDir, costume, mode: 'tint', tint: trail.tint, alpha: trail.alpha * (1 - k / (trail.n + 1)), key: 'tr' + s2.drawT.toFixed(3) + (costume || '') });
      }
    }
    // the fighter proper (ground shadow, the striking limb's smear, the drawing) — in city views hidden where the city has
    // something nearer than the fighter inside the fighter's box (piers, buildings, a parapet); afterimages stay unmasked
    const seg = st.seg;
    const body = g => {
      if (g0 && env.shadows !== false) {
        const hgt = st.pos[2], a = clamp(0.4 - hgt * 0.06, 0.08, 0.4), rx = Math.max(2, px * 0.22 * (1 - Math.min(0.6, hgt * 0.08)));
        HT.alpha(g, a, () => HT.ellipse(g, g0.x, g0.y, rx, Math.max(1, rx * 0.28), C.ink));
      }
      if (seg && seg.move && seg.move.smear && S.smears !== false) drawSmear(g, S, tr, seg, st, face, pr);
      return HT.rig.draw(g, tr.char, pr.x + dx, pr.y + dy, P, px, { face, light, rimDir, sec, key, costume, t: st.drawT, mode: mode === 'normal' ? undefined : mode, tint: S.tint });
    };
    let m = null;
    if (env.set === 'city' && HT.cityOccluderAt && tr.occlude !== false) {
      const bx = [pr.x + dx - px * 1.1, pr.y + dy - px * 1.4, pr.x + dx + px * 1.1, Math.max(pr.y + dy, g0 ? g0.y : pr.y) + px * 0.3];
      m = HT.cityOccluderAt(pr.d - Math.max(0.45, 0.25 * tr.h), bx);
    }
    let r;
    if (!m || m.empty) r = body(ctx);
    else {
      const w = ctx.canvas.width, h = ctx.canvas.height;
      if (!GS || GS.c.width !== w || GS.c.height !== h) GS = HT.canvas(w, h);
      const g = GS.g, B = m.box, bx0 = B[0], by0 = B[1], bw = B[2] - B[0] + 1, bh = B[3] - B[1] + 1;
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(bx0, by0, bw, bh);
      g.save(); g.beginPath(); g.rect(bx0, by0, bw, bh); g.clip(); g.setTransform(ctx.getTransform());
      r = body(g);
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(m.c, m.vx, m.vy); g.globalCompositeOperation = 'source-over';
      const tq = ctx.getTransform(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(GS.c, bx0, by0, bw, bh, bx0, by0, bw, bh); ctx.setTransform(tq);
    }
    S.drawn[name] = { r, x: pr.x + dx, y: pr.y + dy, px, face, st };
  }

  // stateless springs for hair/cloth (body-height units, screen axes: x = screen right, y = up)
  function secondary(tr, t, face, env) {
    const h = tr.h;
    const headPos = tt => { const s = tr.stateAt(tt, true); const P = s.pose; const J = HT.rig.fk(P, tr._prop || (tr._prop = Object.assign({}, HT.rig.PROP, (HT.rig.CHARS[tr.char] || {}).prop || {}))); const f = s.face[0] >= 0 ? 1 : -1; return [(s.pos[0] + f * J.head[0] * h) / h, (s.pos[2] + J.head[1] * h) / h]; };
    const hipPos = tt => { const s = tr.stateAt(tt, true); return [s.pos[0] / h, (s.pos[2]) / h + s.pose.root[1]]; };
    const hs = HT.rig.spring(headPos, t, 2.6, 0.28, 0.8);
    const cs = HT.rig.spring(hipPos, t, 1.8, 0.22, 1.0);
    // character space: x forward → flip by facing; clamp to keep shapes sane
    const k = 1;
    const hair = [clamp(hs[0] * face * k, -0.08, 0.08), clamp(hs[1] * k, -0.08, 0.08)];
    const cloth = [clamp(cs[0] * face, -0.12, 0.12), clamp(cs[1], -0.1, 0.1)];
    const wind = (env.wind || 0.3) * (0.6 + 0.4 * Math.sin(t * 1.7 + tr.h * 3)) * face;
    return { hair, cloth, wind };
  }

  function drawSmear(ctx, S, tr, seg, st, face, pr) {
    const M = seg.move, sm = M.smear, t = S.t;
    const fNow = (st.drawT - seg.t0) * FPS;
    const fPrev = fNow - FPS / DFPS;
    const fc = (f) => (f <= M.contact ? f : f < M.contact + seg.hitstop ? M.contact : f - seg.hitstop);
    const a = fc(fPrev), b = fc(fNow);
    if (!(b > sm.from && a < sm.to + 0.5) || b <= a) return;
    const spec = HT.rig.CHARS[tr.char], prop = tr._prop || (tr._prop = Object.assign({}, HT.rig.PROP, spec.prop || {}));
    const J0 = HT.rig.fk(fight.movePose(M, Math.max(0, a)), prop), J1 = HT.rig.fk(fight.movePose(M, b), prop);
    const tipK = sm.limb === 'nl' || sm.limb === 'fl' ? sm.limb + 'T' : sm.limb + 'H', midK = sm.limb === 'nl' || sm.limb === 'fl' ? sm.limb + 'A' : sm.limb + 'W';
    const px = tr.h * pr.s;
    const toS = (J, k) => [pr.x + face * J[k][0] * px, pr.y - J[k][1] * px];
    const p0 = toS(J0, tipK), p1 = toS(J1, tipK), m0 = toS(J0, midK), m1 = toS(J1, midK);
    // swept quad (previous → current limb end), light cloth tone, dithered tail
    const col = tr.char === 'sukuna' ? C.mist : C.indigo;
    HT.alpha(ctx, 0.85, () => HT.poly(ctx, [m0, p0, p1, m1], col));
    HT.alpha(ctx, 0.9, () => HT.thick(ctx, p0[0], p0[1], p1[0], p1[1], Math.max(1, Math.round(px / 40)), C.white));
    // speed lines behind the limb
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy) || 1;
    for (let i = 0; i < 3; i++) {
      const o = (i - 1) * Math.max(2, px / 30), nx = -dy / L * o, ny = dx / L * o;
      HT.alpha(ctx, 0.6, () => HT.line(ctx, p0[0] - dx * 0.6 + nx, p0[1] - dy * 0.6 + ny, p1[0] - dx * 0.15 + nx, p1[1] - dy * 0.15 + ny, C.white));
    }
  }

  // full-frame post effects: impact frames, flashes, manga mode, text, split
  // natural length of a text event: kana by style (manga.js), cards by kind, else 1.2 s
  const textDur = e => e.dur || (e.kana && HT.kana && HT.kana.defaultDur ? HT.kana.defaultDur(e) : e.card && HT.cards && HT.cards.DUR ? HT.cards.DUR[e.card] : 0) || 1.2;
  fight.textDur = textDur;
  function postPass(sc, ctx, S) {
    const t = S.t;
    // full-frame post effects first (so a manga tone or a fade to black does not swallow the lettering), then the
    // scene's post hook, then text overlays (kana / cards) on top
    for (const e of sc.C.post) {
      if (e.t > t) break;
      const age = t - e.t, dur = e.dur || 0.1;
      if (age >= dur) continue;
      const P = HT.post && HT.post[e.post];
      if (P) P(ctx, S, e, age, dur);
    }
    if (sc.fightDef.hooks && sc.fightDef.hooks.post) sc.fightDef.hooks.post(ctx, S);
    for (const e of sc.C.text) {
      if (e.t > t) break;
      const age = t - e.t, dur = textDur(e);
      if (age > dur) continue;
      if (e.kana && HT.kana) HT.kana.sfx(ctx, e.kana, e.x === undefined ? W / 2 : e.x, e.y === undefined ? H / 2 : e.y, Object.assign({}, e, { age, dur }));
      else if (e.card && HT.cards) HT.cards.draw(ctx, e, age, S);
      else if (e.text) HT.text(ctx, e.text, e.x || W / 2, e.y || H - 40, { col: e.col || C.white, align: 'center', scale: e.scale || 1, shadow: C.ink });
    }
  }

  // ------------------------------------------------------------------ basic post effects (fx.js / manga.js add more)
  HT.post = HT.post || {};
  HT.post.flash = (ctx, S, e, age, dur) => HT.fx.fade(ctx, 1 - age / dur, e.col || C.white);
  HT.post.white = (ctx, S, e, age, dur) => HT.fx.fade(ctx, e.hold ? 1 : clamp(age / Math.max(0.01, e.in || dur), 0, 1), C.white);
  HT.post.black = (ctx, S, e, age, dur) => HT.fx.fade(ctx, e.hold ? 1 : clamp(age / Math.max(0.01, e.in || dur), 0, 1), C.ink);
  // whip pan smear: pair with a camera event using blend ≈ 0.18 s; the frame streaks along the pan direction
  HT.post.whip = (ctx, S, e, age, dur) => {
    const k = Math.sin(Math.PI * HT.clamp(age / dur, 0, 1)), dir = e.dir || 1, len = Math.round((e.len || 90) * k);
    if (len < 2) return;
    const g = ctx; g.save(); g.globalAlpha = 0.34;
    for (let i = 1; i <= 4; i++) g.drawImage(g.canvas, -dir * len * i / 4, 0);
    g.restore();
  };
  HT.post.letterbox = (ctx, S, e, age, dur) => { const k = Math.round((e.size || 36) * clamp(age / 0.4, 0, 1)); HT.rect(ctx, 0, 0, W, k, C.ink); HT.rect(ctx, 0, H - k, W, k, C.ink); };
  // impact frame: invert (negative) or 2-tone (ink/white threshold) or white silhouette flash
  HT.post.impact = (ctx, S, e) => {
    const img = ctx.getImageData(0, 0, W, H), d = img.data, mode = e.mode || 'invert';
    const ink = HT.rgb(C.ink), wh = HT.rgb(C.white), red = HT.rgb(e.accent || C.red);
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (mode === 'invert') { d[i] = 255 - r; d[i + 1] = 255 - g; d[i + 2] = 255 - b; }
      else {
        const l = r * 0.299 + g * 0.587 + b * 0.114;
        const c = mode === '2tone' ? (l > (e.th || 110) ? wh : ink) : mode === 'red' ? (l > (e.th || 110) ? red : ink) : (l > (e.th || 110) ? ink : wh);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
    }
    ctx.putImageData(img, 0, 0);
  };

  // ------------------------------------------------------------------ a plain test set (sky + gridded ground)
  HT.SETS.plain = {
    init() { return {}; },
    draw(ctx, c, S) {
      HT.vgrad(ctx, 0, 0, W, H, [[0, C.navy], [0.55, C.indigo], [1, C.blue]]);
      // ground grid via projection
      const hz = CAM.project(c, c.x + Math.sin(c.yaw) * 1e4, c.y + Math.cos(c.yaw) * 1e4, 0);
      const hy = hz ? Math.round(hz.y) : H / 2;
      HT.rect(ctx, 0, Math.max(0, hy), W, H - Math.max(0, hy), C.charcoal);
      for (let gx = -40; gx <= 40; gx += 2) {
        const a = CAM.project(c, gx, -30, 0), b = CAM.project(c, gx, 60, 0);
        if (a && b) HT.line(ctx, a.x, a.y, b.x, b.y, C.slate);
      }
      for (let gy = -30; gy <= 60; gy += 2) {
        const a = CAM.project(c, -40, gy, 0), b = CAM.project(c, 40, gy, 0);
        if (a && b) HT.line(ctx, a.x, a.y, b.x, b.y, C.slate);
      }
    },
  };
})();
