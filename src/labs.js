/* DOMAIN CLASH — contact-sheet labs (test pages): ?lab=<name>. Each lab builds a canvas; tools/cdp.mjs screenshots it.
     ?lab=rig&char=gojo&size=96&scale=2         every pose of a character (side + front views)
     ?lab=sizes&pose=guard                      both fighters at 24/56/96/150/220 px
     ?lab=moves&char=gojo&move=jab              a move's drawings on 2s with frame numbers
   Modules add their own labs (fx.js → ?lab=fx, sets.js → ?lab=sets, busts.js → ?lab=busts, kana → ?lab=kana). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, rig = HT.rig;
  const labs = (HT.labs = HT.labs || {});
  // shared sheet builder: cells [{label, draw(g, w, h)}], cell size in art px, output upscaled by `scale`
  HT.sheet = (cells, o = {}) => {
    const cw = o.cw || 120, ch = o.ch || 140, cols = o.cols || 8, scale = o.scale || 2, pad = 12;
    const rows = Math.ceil(cells.length / cols);
    const art = HT.canvas(cols * cw, rows * (ch + pad));
    const g = art.g;
    g.fillStyle = o.bg || '#3b3444'; g.fillRect(0, 0, art.c.width, art.c.height);
    cells.forEach((cell, k) => {
      const x = (k % cols) * cw, y = Math.floor(k / cols) * (ch + pad);
      g.save(); g.beginPath(); g.rect(x, y + pad, cw, ch); g.clip();
      if (o.cellBg) o.cellBg(g, x, y + pad, cw, ch, k); else { g.fillStyle = k % 2 ? '#4a4255' : '#433b4d'; g.fillRect(x, y + pad, cw, ch); }
      g.translate(x, y + pad);
      try { cell.draw(g, cw, ch); } catch (e) { console.error(cell.label, e); g.fillStyle = '#f00'; g.fillRect(0, 0, cw, ch); }
      g.restore();
      HT.text(g, String(cell.label).toUpperCase().slice(0, Math.floor(cw / 4)), x + 2, y + 3, { font: 'tiny', col: C.foam });
    });
    if (o.quantize !== false) { const img = g.getImageData(0, 0, art.c.width, art.c.height); HT.quantize(img); g.putImageData(img, 0, 0); }
    const out = document.createElement('canvas');
    out.width = art.c.width * scale; out.height = art.c.height * scale;
    const og = out.getContext('2d'); og.imageSmoothingEnabled = false;
    og.drawImage(art.c, 0, 0, out.width, out.height);
    return out;
  };
  const LIGHT = [-0.55, -0.5, 0.65];
  labs.rig = Q => {
    const who = Q.get('char') || 'gojo', size = +(Q.get('size') || 96), filter = Q.get('filter');
    // each shikigami / coda character owns its prefixed poses; the fighters use the shared (unprefixed) library
    const PRE = { mahoraga: 'maho_', agito: 'ag_', geto: 'geto_', nanami: 'nanami_', haibara: 'haibara_', yaga: 'yaga_' };
    const own = PRE[who], anyPre = n => Object.values(PRE).some(p => n.startsWith(p));
    const names = Object.keys(rig.POSES).filter(n => (own ? n.startsWith(own) : !anyPre(n)) && (!filter || n.includes(filter)));
    const cells = names.map(n => ({ label: n, draw(g, w, h) { rig.draw(g, who, w / 2, h - 10, rig.POSES[n], size, { light: LIGHT, face: 1 }); } }));
    const cw = Math.round(size * 1.35), ch = Math.round(size * 1.45);
    return HT.sheet(cells, { cw, ch, cols: +(Q.get('cols') || 10), scale: +(Q.get('scale') || 2) });
  };
  labs.sizes = Q => {
    const pose = rig.POSES[Q.get('pose') || 'guard'];
    const sizes = [24, 40, 56, 96, 150, 220];
    const cells = [];
    for (const who of ['gojo', 'sukuna']) for (const s of sizes) cells.push({ label: who + ' ' + s, draw(g, w, h) { rig.draw(g, who, w / 2, h - 8, pose, s, { light: LIGHT, face: who === 'gojo' ? 1 : -1 }); } });
    return HT.sheet(cells, { cw: 190, ch: 250, cols: 6, scale: +(Q.get('scale') || 2) });
  };
  labs.moves = Q => {
    const who = Q.get('char') || 'gojo', name = Q.get('move') || 'jab', size = +(Q.get('size') || 96);
    const M = rig.MOVES[name], cells = [];
    for (let f = 0; f <= M.len; f += 2.5) {
      const p = HT.fight ? HT.fight.movePose(M, f) : rig.POSES.guard;
      cells.push({ label: name + ' f' + f.toFixed(1) + (Math.abs(f - M.contact) < 1.3 ? ' *' : ''), draw(g, w, h) { rig.draw(g, who, w / 2, h - 8, p, size, { light: LIGHT }); } });
    }
    return HT.sheet(cells, { cw: Math.round(size * 1.3), ch: Math.round(size * 1.4), cols: 8, scale: 2 });
  };
})();
(function () {
  const HT = window.HT, rig = HT.rig;
  // ?lab=one&char=gojo&pose=guard&size=150&scale=4&costume=fight — one drawing, big, for detail review
  HT.labs.one = Q => {
    const who = (Q.get('char') || 'gojo').split(','), poses = (Q.get('pose') || 'guard').split(','), size = +(Q.get('size') || 150);
    const cells = [];
    for (const w of who) for (const p of poses) cells.push({ label: w + ' ' + p, draw(g, cw, ch) { rig.draw(g, w, cw / 2, ch - 6, rig.POSES[p], size, { light: [-0.55, -0.5, 0.65], face: +(Q.get('face') || 1), costume: Q.get('costume') || undefined, sec: { hair: [0, 0], cloth: [0, 0], wind: 0.3 } }); } });
    return HT.sheet(cells, { cw: Math.round(size * 1.2), ch: Math.round(size * 1.25), cols: +(Q.get('cols') || 4), scale: +(Q.get('scale') || 4) });
  };
})();
(function () {
  const HT = window.HT, CAM = HT.cam, W = HT.W, H = HT.H;
  // ?lab=ledger — the persistent damage kinds on the city: canyon sweep (mid / done), collapse, slice, crater, hole
  HT.labs.ledger = Q => {
    const L = HT.ledger, tower = HT.city.role('sukunaTower'), cut = HT.city.role('cutTower'), hole = HT.city.role('holeBuilding');
    L.add({ T: 1, kind: 'canyon', x0: -250, y0: -420, x1: -330, y1: 150, w: 40, depth: 26, dur: 3 });
    L.add({ T: 4.2, kind: 'collapse', b: tower.id, dur: 3 });
    L.add({ T: 10, kind: 'slice', b: cut.id, zA: 50, zB: 28, dur: 1.3, slide: 15 });
    L.add({ T: 10, kind: 'hole', b: hole.id, face: 'e', u: 22, v: 3, r: 3 });
    L.add({ T: 10, kind: 'crater', x: 4, y: -5, r: 5 });
    L.resolved = false;
    const off = HT.canvas(W, H);
    const views = [
      ['canyon mid-sweep (T=2.2) from the junction', 2.2, { x: 0, y: -6, z: 30, yaw: -Math.PI / 2 + 0.25, f: 300, shift: -30 }],
      ['canyon done (T=4.5)', 4.5, { x: 0, y: -6, z: 30, yaw: -Math.PI / 2 + 0.25, f: 300, shift: -30 }],
      ['tower collapsing (T=5.5)', 5.5, { x: -200, y: 20, z: 40, yaw: -Math.PI / 2 + 0.4, f: 360, shift: -80 }],
      ['aftermath overhead (T=12)', 12, { x: -120, y: -60, z: 700, yaw: 0, pitch: -Math.PI / 2 + 0.001, f: 380 }],
      ['junction after the exchange (T=12)', 12, { x: -12, y: -14, z: 1.7, yaw: 0.69, f: 250, shift: 110 }],
      ['voxel (T=12)', 12, { x: 0, y: -380, z: 160, yaw: -0.2, f: 380, shift: -80, set: 'voxel' }],
    ];
    const cells = views.map(([label, T, cm]) => ({ label, draw(g) {
      const c = CAM.prep(CAM.make(cm)); if (cm.pitch && cm.pitch < -1) c._overhead = true;
      (HT.SETS[cm.set || 'city']).draw(off.g, c, { T, env: { time: 'dawn', snow: 0.4 }, cam: c, t: 0 }, 'back', { o: {} });
      g.drawImage(off.c, 0, 0);
    } }));
    return HT.sheet(cells, { cw: W, ch: H, cols: 2, scale: +(Q.get('scale') || 1) });
  };
})();
(function () {
  const HT = window.HT, CAM = HT.cam, W = HT.W, H = HT.H;
  // ?lab=rooftop — Sukuna on his skyscraper's roof edge at dawn (staging test for Act I)
  HT.labs.rooftop = Q => {
    const t = HT.city.role('sukunaTower'), off = HT.canvas(W, H);
    const edgeX = (t.x0 + t.x1) / 2, edgeY = t.y0 + 1.2, z = t.h;
    const views = [
      ['back view, city below', { x: edgeX + 1, y: edgeY + 7, z: z + 1.7, yaw: Math.PI - 0.15, f: 380, shift: 70 }, 'back', 1.6],
      ['front, low, grin', { x: edgeX - 2, y: edgeY - 6, z: z + 0.6, yaw: 0.25, f: 420, shift: 120 }, 'frontGrin', 3],
    ];
    const cells = views.map(([label, cm, pose, sc]) => ({ label, draw(g) {
      const c = CAM.prep(CAM.make(cm));
      HT.SETS.city.draw(off.g, c, { T: 0, env: { time: 'dawn', snow: 0.4 }, cam: c, t: 0 }, 'back', { o: {} });
      const p = CAM.project(c, edgeX, edgeY, z);
      if (p) HT.rig.draw(off.g, 'sukuna', p.x, p.y, HT.rig.POSES[pose], 1.75 * p.s, { costume: 'haori', light: [0.55, -0.45, 0.7], face: 1, sec: { hair: [0.02, 0], cloth: [-0.04, 0.01], wind: 0.6 } });
      g.drawImage(off.c, 0, 0);
    } }));
    return HT.sheet(cells, { cw: W, ch: H, cols: 2, scale: +(Q.get('scale') || 1) });
  };
})();
(function () {
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  // ?lab=grad — how the quantizer renders the gradients we use (sky ramps, snow tints) — before/after
  HT.labs.grad = Q => {
    const ramps = [
      ['dawn sky', [[0, C.navy], [0.35, C.indigo], [0.6, C.blue], [0.8, C.lavender], [0.9, C.pinkrose], [1, C.salmon]]],
      ['navy→blue', [[0, C.navy], [1, C.blue]]],
      ['ink→navy→indigo', [[0, C.ink], [0.5, C.navy], [1, C.indigo]]],
      ['blue→lavender', [[0, C.blue], [1, C.lavender]]],
      ['snow greys', [[0, '#8c8aa0'], [0.5, '#bcbad4'], [1, '#e4e2f6']]],
      ['sunset', [[0, C.plum], [0.3, C.purple], [0.55, C.rose], [0.75, C.coral], [1, C.gold]]],
    ];
    const cells = ramps.map(([label, st]) => ({ label, draw(g, w, h) { HT.hgrad(g, 0, 0, w, h, st); } }));
    return HT.sheet(cells, { cw: 600, ch: 60, cols: 1, scale: +(Q.get('scale') || 2), quantize: Q.get('raw') ? false : true });
  };
})();
