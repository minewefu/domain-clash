/* DOMAIN CLASH — timeline (acts → scenes), chapter streaming (lazy init / dispose), transitions, quantized renderer,
   player clock, test modes. Inherited from HELLO, TOMORROW's main.js and extended for a 20-minute, ~70-scene film.

   Streaming: a scene is initialised only when it is needed. While a scene plays, the next scenes' init() runs in idle
   slices (≤ HT.stream.budget ms per animation frame); scenes outside the window [current-1, current+2] are disposed so the
   heap stays flat. init() may return an iterator (a generator): each next() call must do ≤ ~4 ms of work. Rendering a
   scene that is not ready yet (a seek, a video export) drains its init synchronously. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const W = HT.W, H = HT.H;
  const Q = new URLSearchParams(location.search);
  HT.settings = { quantize: true };

  // ------------------------------------------------------------------ plan (acts and their scene ids) — src/timeline.js sets HT.ACTS
  HT.ACTS = HT.ACTS || [{ id: 'test', title: 'Fight Test', scenes: ['fighttest'] }];

  function placeholder(id, act) {
    return {
      id, act, title: id, dur: 8, transitionIn: { type: 'dissolve', dur: 0.6 }, cues: [], ambience: [], placeholder: true,
      init() {},
      draw(ctx, t) {
        HT.vgrad(ctx, 0, 0, W, H, [[0, C.ink], [1, C.navy]]);
        for (let i = 0; i < 60; i++) HT.px(ctx, (HT.hash(i, 3) * W + t * 12 * (1 + HT.hash(i, 4))) % W, HT.hash(i, 5) * H, C.lilacgrey);
        HT.text(ctx, String(id).toUpperCase(), W / 2, 160, { col: C.white, align: 'center', scale: 2, shadow: C.ink });
        HT.text(ctx, 'SCENE IN PRODUCTION · T=' + t.toFixed(1), W / 2, 186, { col: C.aqua, align: 'center', font: 'tiny' });
      },
    };
  }

  // ------------------------------------------------------------------ timeline
  HT.buildTimeline = () => {
    let start = 0;
    HT.timeline = [];
    HT.actSpans = [];
    HT.ACTS.forEach((act, ai) => {
      const a0 = start;
      act.scenes.forEach(id => {
        const def = HT.SCENES[id] || (HT.SCENES[id] = placeholder(id, act.id));
        def.act = def.act || act.id;
        const e = { id, def, act: act.id, actIndex: ai, start, dur: def.dur, title: def.title || id, cues: def.cues || [], ambience: def.ambience || [],
          transitionIn: def.transitionIn || { type: 'cut', dur: 0 } };
        def._start = start;
        HT.timeline.push(e);
        start += def.dur;
      });
      HT.actSpans.push({ id: act.id, title: act.title, start: a0, dur: start - a0, index: ai });
    });
    HT.duration = start;
    if (HT.onTimeline) HT.onTimeline.forEach(f => { try { f(HT.timeline); } catch (e) { console.error(e); } });
    return HT.timeline;
  };
  HT.onTimeline = HT.onTimeline || []; // hooks run after the timeline is built (e.g. the damage ledger resolves scene-relative times)
  HT.sceneAt = tg => {
    const tl = HT.timeline;
    let lo = 0, hi = tl.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tg >= tl[m].start) lo = m; else hi = m - 1; }
    return lo;
  };
  HT.sceneIndex = id => HT.timeline.findIndex(e => e.id === id);
  HT.sceneStart = id => { const e = HT.timeline.find(x => x.id === id); return e ? e.start : NaN; };

  // ------------------------------------------------------------------ chapter streaming
  const S = HT.stream = {
    budget: 3.5,           // ms of idle init work per animation frame
    ahead: 2, behind: 1,   // keep scenes [i - behind, i + ahead] alive
    log: [],               // [{id, what, ms, T}] (init/dispose events, for the playthrough test)
    stats: { syncInits: 0, idleSlices: 0, maxSliceMs: 0, disposed: 0 },
  };
  const stateOf = d => d._state || 'cold'; // cold → warming (iterator pending) → ready
  function startInit(d) {
    if (d._state === 'ready' || d._state === 'warming') return;
    d._t0 = performance.now(); d._initMs = 0;
    let r;
    try { r = d.init ? d.init() : null; } catch (e) { console.error('init failed for', d.id, e); r = null; }
    if (r && typeof r.next === 'function') { d._iter = r; d._state = 'warming'; }
    else { d._state = 'ready'; d._iter = null; }
    d._initMs += performance.now() - d._t0;
  }
  function stepInit(d, budgetMs) { // returns true when ready
    if (stateOf(d) === 'cold') { const a = performance.now(); startInit(d); budgetMs -= performance.now() - a; }
    if (d._state !== 'warming') return d._state === 'ready';
    const t0 = performance.now();
    do {
      let r;
      try { r = d._iter.next(); } catch (e) { console.error('init failed for', d.id, e); r = { done: true }; }
      if (r.done) { d._state = 'ready'; d._iter = null; break; }
    } while (performance.now() - t0 < budgetMs);
    d._initMs += performance.now() - t0;
    return d._state === 'ready';
  }
  S.ensure = (i) => { // synchronous: scene i must be drawable now
    const d = HT.timeline[i].def;
    if (d._state === 'ready') return;
    const t0 = performance.now();
    while (!stepInit(d, 1e9)) { /* drain */ }
    S.stats.syncInits++;
    S.log.push({ id: d.id, what: 'sync-init', ms: +(performance.now() - t0).toFixed(1), T: HT.lastFrame ? +HT.lastFrame.tg.toFixed(2) : 0 });
  };
  S.dispose = (i) => {
    const d = HT.timeline[i].def;
    if (stateOf(d) === 'cold') return;
    try { d.dispose && d.dispose(); } catch (e) { console.error('dispose failed for', d.id, e); }
    d._state = 'cold'; d._iter = null; d.R = null;
    S.stats.disposed++;
    S.log.push({ id: d.id, what: 'dispose', ms: 0, T: HT.lastFrame ? +HT.lastFrame.tg.toFixed(2) : 0 });
  };
  S.window = (i) => { // dispose everything outside [i - behind, i + ahead]
    const tl = HT.timeline;
    for (let k = 0; k < tl.length; k++) if ((k < i - S.behind || k > i + S.ahead) && stateOf(tl[k].def) !== 'cold') S.dispose(k);
  };
  S.idle = (i, budgetMs = S.budget) => { // advance init of upcoming scenes within a time budget
    const tl = HT.timeline, t0 = performance.now();
    for (let k = i; k <= Math.min(tl.length - 1, i + S.ahead); k++) {
      const d = tl[k].def;
      if (d._state === 'ready') continue;
      const left = budgetMs - (performance.now() - t0);
      if (left <= 0.2) break;
      const a = performance.now();
      const done = stepInit(d, left);
      const ms = performance.now() - a;
      S.stats.idleSlices++; S.stats.maxSliceMs = Math.max(S.stats.maxSliceMs, ms);
      if (done) S.log.push({ id: d.id, what: 'idle-init', ms: +(d._initMs || 0).toFixed(1), T: HT.lastFrame ? +HT.lastFrame.tg.toFixed(2) : 0 });
      else break; // one scene at a time
    }
  };
  // startup: shared resources (registered by modules as HT.onBoot hooks, may be generators) + the first scene
  HT.bootTasks = HT.bootTasks || []; // [{name, fn}] fn may return an iterator
  HT.initStartup = async (onProgress, firstIndex = 0) => {
    const tasks = HT.bootTasks.slice();
    const total = tasks.length + 2;
    let done = 0;
    for (const t of tasks) {
      const t0 = performance.now();
      try {
        const r = t.fn();
        if (r && typeof r.next === 'function') {
          let slice = performance.now();
          while (!r.next().done) { if (performance.now() - slice > 30) { await new Promise(res => setTimeout(res, 0)); slice = performance.now(); } }
        }
      } catch (e) { console.error('boot task failed', t.name, e); }
      t.ms = performance.now() - t0;
      onProgress && onProgress(++done / total, t.name);
      await new Promise(r => setTimeout(r, 0));
    }
    const d = HT.timeline[firstIndex].def;
    const t0 = performance.now();
    while (!stepInit(d, 30)) { await new Promise(r => setTimeout(r, 0)); }
    S.log.push({ id: d.id, what: 'boot-init', ms: +(performance.now() - t0).toFixed(1), T: 0 });
    onProgress && onProgress(++done / total, d.id);
    const q0 = performance.now();
    HT.quantizeWarm();
    HT._warmMs = performance.now() - q0;
    onProgress && onProgress(1, 'palette');
  };

  // ------------------------------------------------------------------ rendering
  const frame = HT.canvas(W, H), bufA = HT.canvas(W, H), bufB = HT.canvas(W, H);
  HT.frameCanvas = frame.c;
  const BAYER8 = (() => { // 8x8 Bayer 0..63
    const m = new Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let v = 0; const xc = x ^ y, yc = y;
      for (let bit = 0; bit < 3; bit++) { v = (v << 2) | (((xc >> (2 - bit)) & 1) << 1) | ((yc >> (2 - bit)) & 1); }
      m[y * 8 + x] = v;
    }
    return m;
  })();
  const drawScene = (g, i, t) => {
    const e = HT.timeline[i], d = e.def;
    S.ensure(i);
    g.save();
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    try { d.draw(g, t, e.start + t); } catch (err) {
      if (!d._errLogged) { console.error('draw failed for', d.id, 'at t=' + t.toFixed(2), err); d._errLogged = true; }
      HT.rect(g, 0, 0, W, H, C.maroon); HT.text(g, 'ERROR IN ' + d.id.toUpperCase(), 10, 10, { col: C.white });
    }
    g.restore();
  };
  HT.renderFrame = (tg, opts = {}) => {
    tg = HT.clamp(tg, 0, HT.duration - 1e-4);
    const i = HT.sceneAt(tg), e = HT.timeline[i], t = tg - e.start;
    const tr = e.transitionIn || { type: 'cut', dur: 0 };
    const g = frame.g;
    if (i > 0 && tr.type !== 'cut' && tr.dur > 0 && t < tr.dur) {
      const p = t / tr.dur, prev = HT.timeline[i - 1], tp = prev.dur + t;
      switch (tr.type) {
        case 'fade': case 'white': {
          const col = tr.type === 'white' ? C.white : C.ink;
          if (p < 0.5) { drawScene(g, i - 1, tp); HT.fx.fade(g, p * 2, col); }
          else { drawScene(g, i, t); HT.fx.fade(g, (1 - p) * 2, col); }
          break;
        }
        case 'flash': { // hard cut hidden under a white flash that decays
          drawScene(g, i, t); HT.fx.fade(g, 1 - p, C.white); break;
        }
        case 'smash': { // 2 frames of black, then cut
          if (t < 2 / 30) HT.rect(g, 0, 0, W, H, C.ink); else drawScene(g, i, t);
          break;
        }
        case 'iris': {
          const maxR = Math.hypot(W, H) * 0.6;
          if (p < 0.5) { drawScene(g, i - 1, tp); const q = HT.E.inCubic(1 - p * 2); HT.fx.iris(g, tr.fromX ?? W / 2, tr.fromY ?? H / 2, q * maxR); }
          else { drawScene(g, i, t); const q = HT.E.outCubic((p - 0.5) * 2); HT.fx.iris(g, tr.x ?? W / 2, tr.y ?? H / 2, q * maxR); }
          break;
        }
        case 'wipe': {
          drawScene(bufB.g, i - 1, tp); drawScene(bufA.g, i, t);
          g.drawImage(bufB.c, 0, 0);
          const q = HT.E.inOutQuad(p), span = W + H * 0.6;
          for (let y = 0; y < H; y++) {
            const ex = Math.round(q * span - (H - y) * 0.6);
            if (ex > 0) g.drawImage(bufA.c, 0, y, Math.min(ex, W), 1, 0, y, Math.min(ex, W), 1);
            if (ex > 0 && ex < W) { g.fillStyle = C.white; g.fillRect(ex, y, 2, 1); }
          }
          break;
        }
        case 'whip': { // whip pan: both frames smeared sideways, streak lines, then the new frame settles
          drawScene(bufB.g, i - 1, tp); drawScene(bufA.g, i, t);
          const dir = tr.dir || 1, q = HT.E.inOutCubic(p), off = Math.round(q * W) * dir;
          g.drawImage(bufB.c, -off, 0); g.drawImage(bufA.c, dir > 0 ? W - off : -W - off, 0);
          const k = Math.sin(Math.PI * p);
          if (k > 0.05) {
            for (let y = 0; y < H; y++) {
              const len = Math.round((0.25 + 0.75 * HT.hash(y, 77)) * 80 * k);
              if (HT.hash(y, 78) < 0.55) continue;
              g.globalAlpha = 0.35 * k; g.drawImage(g.canvas, 0, y, W, 1, -len * dir, y, W, 1); g.globalAlpha = 1;
            }
          }
          break;
        }
        case 'slide': {
          drawScene(bufB.g, i - 1, tp); drawScene(bufA.g, i, t);
          const q = HT.E.inOutCubic(p), off = Math.round(q * W);
          g.drawImage(bufB.c, -off, 0); g.drawImage(bufA.c, W - off, 0);
          g.fillStyle = C.ink; g.fillRect(W - off - 2, 0, 3, H);
          break;
        }
        default: { // dissolve (8x8 Bayer on 2×2-pixel cells: the retro dissolve, one step coarser so it survives video encoding)
          drawScene(bufB.g, i - 1, tp); drawScene(bufA.g, i, t);
          const a = bufA.g.getImageData(0, 0, W, H), b = bufB.g.getImageData(0, 0, W, H);
          const A = new Uint32Array(a.data.buffer), B = new Uint32Array(b.data.buffer);
          const th = Math.floor(p * 64);
          for (let y = 0; y < H; y++) { const row = y * W, br = ((y >> 1) & 7) << 3; for (let x = 0; x < W; x++) if (BAYER8[br + ((x >> 1) & 7)] >= th) A[row + x] = B[row + x]; }
          g.putImageData(a, 0, 0);
        }
      }
    } else drawScene(g, i, t);
    if (HT.settings.quantize && !opts.raw) {
      const img = g.getImageData(0, 0, W, H);
      HT.quantize(img);
      g.putImageData(img, 0, 0);
    }
    HT.lastFrame = { tg, i, t };
    if (!opts.noStream) S.window(i);
    return frame.c;
  };

  // ------------------------------------------------------------------ clock
  const clock = { playing: false, t: 0, perf0: 0, t0: 0 };
  const hasAudio = () => !!(HT.audio && HT.audio.init);
  HT.player = {
    get time() { return clock.playing ? HT.player.now() : clock.t; },
    get playing() { return clock.playing; },
    now() {
      if (!clock.playing) return clock.t;
      if (hasAudio() && HT.audio.playing) return HT.audio.now();
      return clock.t0 + (performance.now() - clock.perf0) / 1000;
    },
    play(from) {
      if (from !== undefined) clock.t = from;
      if (clock.t >= HT.duration - 0.05) clock.t = 0;
      clock.playing = true; clock.t0 = clock.t; clock.perf0 = performance.now();
      if (hasAudio() && !HT.settings.silent) { try { HT.audio.init(); HT.audio.play(clock.t); } catch (e) { console.warn('audio play failed', e); } }
      emit();
    },
    pause() {
      clock.t = HT.player.now(); clock.playing = false;
      if (hasAudio() && HT.audio.playing) HT.audio.pause();
      emit();
    },
    seek(tg) {
      tg = HT.clamp(tg, 0, HT.duration - 0.01);
      clock.t = tg; clock.t0 = tg; clock.perf0 = performance.now();
      if (clock.playing && hasAudio() && HT.audio.playing) { try { HT.audio.seek(tg); } catch (e) { console.warn(e); } }
      emit(); HT.player.draw();
    },
    toggle() { clock.playing ? HT.player.pause() : HT.player.play(); },
    draw() { const c = HT.renderFrame(HT.player.time); blit(c); },
  };
  const subs = [];
  HT.player.on = fn => subs.push(fn);
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });

  // frame-time telemetry for the playthrough test: per-frame render ms + rAF gaps
  HT.telemetry = { frames: 0, renderMs: 0, maxRenderMs: 0, gaps: [], longFrames: 0, samples: [] };
  let screen = null, sctx = null, lastRaf = 0;
  const blit = c => { if (sctx) sctx.drawImage(c, 0, 0); };
  function loop(ts) {
    const T = HT.telemetry;
    if (clock.playing) {
      let tg = HT.player.now();
      if (tg >= HT.duration) { tg = HT.duration - 0.001; HT.player.pause(); clock.t = HT.duration - 0.001; }
      const a = performance.now();
      blit(HT.renderFrame(tg));
      const ms = performance.now() - a;
      T.frames++; T.renderMs += ms; if (ms > T.maxRenderMs) T.maxRenderMs = ms;
      if (lastRaf && ts - lastRaf > 50) { T.longFrames++; if (T.gaps.length < 400) T.gaps.push([+tg.toFixed(2), Math.round(ts - lastRaf)]); }
      emit();
      S.idle(HT.lastFrame.i);
    } else if (HT.timeline && HT.lastFrame) S.idle(HT.lastFrame.i, 6);
    lastRaf = clock.playing ? ts : 0;
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ boot
  HT.boot = async () => {
    if (Q.get('nq')) HT.settings.quantize = false;
    if (Q.get('silent')) HT.settings.silent = true;
    HT.buildTimeline();
    const bar = document.getElementById('loadbar');
    const mode = Q.get('lab') ? 'lab' : Q.get('sheet') ? 'sheet' : Q.get('sheetAll') ? 'sheetAll' : (Q.get('scene') || Q.get('t')) ? 'still' : 'player';
    let first = 0;
    if (mode === 'still' && Q.get('scene')) first = Math.max(0, HT.sceneIndex(Q.get('scene')));
    if (mode === 'sheet') first = Math.max(0, HT.sceneIndex(Q.get('sheet')));
    if (mode === 'player' && Q.get('at')) first = HT.sceneAt(parseFloat(Q.get('at')) || 0);
    await HT.initStartup((p) => { if (bar) bar.style.width = Math.round(p * 100) + '%'; }, first);
    if (mode !== 'player') return testMode(mode);
    screen = document.getElementById('screen');
    sctx = screen.getContext('2d');
    sctx.imageSmoothingEnabled = false;
    document.documentElement.classList.add('ready');
    const startAt = parseFloat(Q.get('at') || '0') || 0;
    clock.t = startAt;
    HT.player.draw();
    requestAnimationFrame(loop);
    window.__ready = true;
    emit();
    if (HT.onBoot) HT.onBoot();
  };

  // ------------------------------------------------------------------ test modes
  HT.labs = HT.labs || {}; // name → fn(params) → {canvas} ; e.g. ?lab=poses, ?lab=fx&name=blue
  function testMode(mode) {
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#17111a;overflow:hidden';
    const scale = parseFloat(Q.get('scale') || (mode === 'still' ? '2' : '1'));
    const perf = [];
    const timed = tg => { const t0 = performance.now(); const c = HT.renderFrame(tg); perf.push(performance.now() - t0); return c; };
    let out;
    if (mode === 'lab') {
      const fn = HT.labs[Q.get('lab')];
      if (!fn) { out = document.createElement('canvas'); out.width = 400; out.height = 40; const g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillText('unknown lab ' + Q.get('lab') + ' — have: ' + Object.keys(HT.labs).join(', '), 4, 20); }
      else out = fn(Q, { timed, perf });
    } else {
      out = document.createElement('canvas');
      const og = out.getContext('2d');
      if (mode === 'still') {
        let tg = parseFloat(Q.get('t') || '0');
        if (Q.get('scene')) { const e = HT.timeline.find(x => x.id === Q.get('scene')); tg = (e ? e.start : 0) + parseFloat(Q.get('t') || '0'); }
        out.width = W * scale; out.height = H * scale;
        og.imageSmoothingEnabled = false;
        og.drawImage(timed(tg), 0, 0, out.width, out.height);
      } else {
        const frames = [];
        if (mode === 'sheet') {
          const e = HT.timeline.find(x => x.id === Q.get('sheet')) || HT.timeline[0];
          const n = parseInt(Q.get('n') || '12', 10);
          const from = parseFloat(Q.get('from') || '0'), to = parseFloat(Q.get('to') || String(e.dur));
          const list = Q.get('times') ? Q.get('times').split(',').map(Number) : null;
          if (list) list.forEach(t => frames.push([e.start + t, e.id + ' ' + t.toFixed(2)]));
          else for (let k = 0; k < n; k++) { const t = from + ((to - from) * (k + 0.5)) / n; frames.push([e.start + t, e.id + ' ' + t.toFixed(2)]); }
        } else {
          for (const e of HT.timeline) frames.push([e.start + e.dur * 0.55, e.id]);
        }
        const cols = parseInt(Q.get('cols') || '4', 10), rows = Math.ceil(frames.length / cols);
        const fw = Math.round(W * scale), fh = Math.round(H * scale), pad = 14;
        out.width = cols * fw + (cols + 1) * 4; out.height = rows * (fh + pad) + 4;
        og.fillStyle = '#17111a'; og.fillRect(0, 0, out.width, out.height);
        og.imageSmoothingEnabled = false;
        frames.forEach(([tg, label], k) => {
          const x = 4 + (k % cols) * (fw + 4), y = 4 + Math.floor(k / cols) * (fh + pad);
          og.drawImage(timed(tg), x, y + pad - 2, fw, fh);
          og.fillStyle = '#8ff8e2'; og.font = '11px monospace'; og.fillText(label, x + 2, y + 9);
        });
      }
    }
    out.style.display = 'block';
    document.body.appendChild(out);
    window.__shotSize = { w: out.width, h: out.height };
    window.__perf = { frames: perf.length, avgMs: perf.reduce((a, b) => a + b, 0) / Math.max(1, perf.length), maxMs: Math.max(0, ...perf), warmMs: HT._warmMs,
      init: HT.timeline.filter(e => e.def._initMs).map(e => [e.id, Math.round(e.def._initMs || 0)]), boot: HT.bootTasks.map(t => [t.name, Math.round(t.ms || 0)]) };
    console.log('perf', JSON.stringify(window.__perf));
    window.__ready = true;
  }

  window.__ready = false;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => HT.boot());
  else setTimeout(() => HT.boot(), 0);
})();
