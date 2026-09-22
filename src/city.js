/* DOMAIN CLASH — the Shinjuku world model and the damage ledger.

   One deterministic city feeds every renderer (sets.js): the street-level 3D renderer (walls + roofs + ground), the
   Voxel Space flyover, the overhead map and the far skyline. Units: metres; x east, y north, z up; ground z = 0.
   The district spans [−420, 420]²; beyond it a panorama skyline (West Shinjuku towers) closes the horizon.

   Damage ledger: persistent destruction keyed to film time. Scenes add entries relative to themselves
   ({scene, t, kind, ...}); after the timeline is built they resolve to film time T0. HT.ledger.state(T) returns the
   entries with T0 ≤ T (sorted) and HT.ledger.version(T) their count — renderers rebuild derived geometry only when the
   version changes, so every later shot shows the earlier damage. Kinds (params):
     slice    {b: buildingId, zA, zB (cut heights at the building's west/east edges, or south/north with axis:'y'),
               slide (m, default 0.35·width), dur (s)} — cut along a plane; the upper piece slides downhill
     hole     {b, face: 'n'|'s'|'e'|'w', u, v (m on the face), r}         — punched-through hole
     crater   {x, y, r, depth}                                            — ground crater (+ rubble ring)
     flatten  {b} / collapse {b, dur}                                     — building reduced to a rubble mound
     canyon   {x0, y0, x1, y1, w, depth}                                  — the 200% Purple path (erased band + trench)
     erasure  {x, y, z, r}                                                — the finale Purple's spherical erasure
     scorch   {x, y, r}                                                   — burnt ground decal
     signal   {id, state: 'blink'|'green'|'red'|'off'|'gone'}            — traffic-signal state changes
     shred    {x, y, r, dur}                                              — Malevolent Shrine: every building inside r
                                                                            (reached by a front growing over dur) is cut
                                                                            into slid slabs and jagged stumps
     deckHole {x, y, r}                                                   — a hole punched through the expressway deck

   Metropolitan Expressway (city.viaduct): an elevated deck over the EW avenue west of the junction (x −420 … −62,
   y −8.5 … 8.5, z 8.0 … 9.6) on piers every 28 m; spans inside the Purple's canyon are gone. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C;
  const city = (HT.city = {});
  const EXT = 420;
  city.EXT = EXT;

  // ------------------------------------------------------------------ streets
  // EW streets run along x at y = c; NS streets along y at x = c. w = full width incl. sidewalks (5 m per side on
  // avenues, 3 m on side streets).
  const EW = [{ c: 0, w: 32, side: 5, name: 'avenue' }, { c: 112, w: 16, side: 3 }, { c: -104, w: 16, side: 3 }, { c: 222, w: 14, side: 3 }, { c: -212, w: 16, side: 3 }, { c: 322, w: 22, side: 4 }, { c: -318, w: 14, side: 3 }];
  const NS = [{ c: 0, w: 28, side: 5, name: 'avenue' }, { c: -118, w: 16, side: 3 }, { c: 116, w: 16, side: 3 }, { c: -244, w: 34, side: 6, name: 'boulevard' }, { c: 232, w: 14, side: 3 }, { c: -362, w: 14, side: 3 }, { c: 344, w: 14, side: 3 }];
  city.EW = EW; city.NS = NS;

  // ------------------------------------------------------------------ materials of the ground (1 m grid)
  // 0 lot (under buildings / empty lot), 1 road, 2 sidewalk, 3 crosswalk, 4 plaza, 5 park
  const N = EXT * 2, GROUND = new Uint8Array(N * N);
  city.GN = N; city.GROUND = GROUND;
  const gi = (x, y) => (Math.floor(y + EXT) * N + Math.floor(x + EXT));
  city.groundAt = (x, y) => { if (x < -EXT || y < -EXT || x >= EXT || y >= EXT) return 0; return GROUND[gi(x, y)]; };

  // ------------------------------------------------------------------ buildings
  // { id, x0, y0, x1, y1, h, style, seed, floorH, bay, tint, roof, sign, zone }
  const B = (city.buildings = []);
  const byId = (city.byId = {});
  const STYLES = ['glass', 'concrete', 'tile', 'tower', 'kabuki', 'office'];
  city.STYLES = STYLES;
  function addBuilding(o) {
    o.id = o.id || 'b' + B.length;
    o.floorH = o.floorH || (o.style === 'tower' || o.style === 'glass' ? 3.9 : 3.5);
    o.bay = o.bay || (o.style === 'tower' ? 3.2 : o.style === 'kabuki' ? 3 : 3.8);
    B.push(o); byId[o.id] = o; return o;
  }

  function gen() {
    const rng = HT.rng(1224);
    // ground: roads + sidewalks
    const fillRect = (x0, y0, x1, y1, v, onlyIf) => {
      for (let y = Math.max(-EXT, Math.floor(y0)); y < Math.min(EXT, Math.ceil(y1)); y++)
        for (let x = Math.max(-EXT, Math.floor(x0)); x < Math.min(EXT, Math.ceil(x1)); x++) {
          const i = gi(x, y); if (onlyIf === undefined || onlyIf(GROUND[i])) GROUND[i] = v;
        }
    };
    for (const s of EW) { fillRect(-EXT, s.c - s.w / 2, EXT, s.c + s.w / 2, 2); fillRect(-EXT, s.c - s.w / 2 + s.side, EXT, s.c + s.w / 2 - s.side, 1); }
    for (const s of NS) { fillRect(s.c - s.w / 2, -EXT, s.c + s.w / 2, EXT, 2, v => v !== 1); fillRect(s.c - s.w / 2 + s.side, -EXT, s.c + s.w / 2 - s.side, EXT, 1); }
    // crosswalk bands at every intersection (stripes are drawn procedurally inside material 3)
    for (const a of EW) for (const b of NS) {
      const cw = 4;
      // crossings over the NS road (north/south of the junction): stripes repeat along x → material 3;
      // crossings over the EW road (east/west of the junction): stripes repeat along y → material 8
      fillRect(b.c - b.w / 2 + b.side, a.c + a.w / 2 - a.side, b.c + b.w / 2 - b.side, a.c + a.w / 2 - a.side + cw, 3);
      fillRect(b.c - b.w / 2 + b.side, a.c - a.w / 2 + a.side - cw, b.c + b.w / 2 - b.side, a.c - a.w / 2 + a.side, 3);
      fillRect(b.c + b.w / 2 - b.side, a.c - a.w / 2 + a.side, b.c + b.w / 2 - b.side + cw, a.c + a.w / 2 - a.side, 8);
      fillRect(b.c - b.w / 2 + b.side - cw, a.c - a.w / 2 + a.side, b.c - b.w / 2 + b.side, a.c + a.w / 2 - a.side, 8);
    }
    // blocks between streets
    const ys = EW.map(s => s).sort((a, b) => a.c - b.c), xs = NS.map(s => s).sort((a, b) => a.c - b.c);
    const edgesY = [{ c: -EXT - 20, w: 0 }, ...ys, { c: EXT + 20, w: 0 }], edgesX = [{ c: -EXT - 20, w: 0 }, ...xs, { c: EXT + 20, w: 0 }];
    for (let j = 0; j + 1 < edgesY.length; j++) for (let i = 0; i + 1 < edgesX.length; i++) {
      const bx0 = edgesX[i].c + edgesX[i].w / 2, bx1 = edgesX[i + 1].c - edgesX[i + 1].w / 2;
      const by0 = edgesY[j].c + edgesY[j].w / 2, by1 = edgesY[j + 1].c - edgesY[j + 1].w / 2;
      if (bx1 - bx0 < 10 || by1 - by0 < 10) continue;
      fillBlock(bx0, by0, bx1, by1, rng);
    }
    // plazas / a small park (bare December trees are drawn as props)
    fillRect(-236 + 17, 30, -130, 96, 4, v => v === 0);
  }
  function zoneOf(x, y) {
    if (x < -250) return 'west';                // West Shinjuku skyscraper district
    if (x > 30 && y > 20) return 'kabuki';      // dense entertainment blocks
    return 'central';
  }
  function fillBlock(x0, y0, x1, y1, rng) {
    // split the block into two rows of lots along its long axis
    const longX = (x1 - x0) >= (y1 - y0);
    const L0 = longX ? x0 : y0, L1 = longX ? x1 : y1, S0 = longX ? y0 : x0, S1 = longX ? y1 : x1;
    const depth = S1 - S0;
    const rows = depth > 46 ? [[S0, S0 + depth / 2 - 0.5], [S0 + depth / 2 + 0.5, S1]] : [[S0, S1]];
    for (const [r0, r1] of rows) {
      let p = L0;
      while (p < L1 - 6) {
        const zone = zoneOf(longX ? p : (r0 + r1) / 2, longX ? (r0 + r1) / 2 : p);
        let w = zone === 'west' ? 34 + rng() * 30 : zone === 'kabuki' ? 11 + rng() * 14 : 14 + rng() * 22;
        if (L1 - (p + w) < 9) w = L1 - p;
        const gap = rng() < 0.25 ? 1.5 + rng() * 2 : 0.4;
        const q0 = p, q1 = Math.min(L1, p + w) - gap;
        const inset = zone === 'west' ? 3 + rng() * 5 : rng() * 0.8;
        const bx0 = longX ? q0 : r0 + inset, bx1 = longX ? q1 : r1 - inset, by0 = longX ? r0 + inset : q0, by1 = longX ? r1 - inset : q1;
        p += w;
        if (bx1 - bx0 < 6 || by1 - by0 < 6) continue;
        let h, style;
        const u = rng();
        if (zone === 'west') { h = 70 + rng() * 120; style = u < 0.6 ? 'tower' : 'glass'; }
        else if (zone === 'kabuki') { h = 14 + rng() * 32; style = u < 0.55 ? 'kabuki' : u < 0.8 ? 'tile' : 'concrete'; }
        else { h = 18 + rng() * 42 + (rng() < 0.12 ? 40 + rng() * 40 : 0); style = u < 0.35 ? 'glass' : u < 0.65 ? 'concrete' : u < 0.85 ? 'office' : 'tile'; }
        const fl = style === 'tower' || style === 'glass' ? 3.9 : 3.5;
        h = Math.max(fl * 3, Math.round(h / fl) * fl);
        addBuilding({ x0: bx0, y0: by0, x1: bx1, y1: by1, h, style, seed: Math.floor(rng() * 1e9), zone,
          tint: rng(), roof: rng(), sign: zone !== 'west' && rng() < 0.55, screen: zone === 'central' && h > 30 && rng() < 0.12 });
      }
    }
  }
  gen();
  // lane centre lines (all street centres are integer coordinates): flag the two 1 m cells either side
  const LANE_Y = new Uint8Array(N), LANE_X = new Uint8Array(N);
  // 1 = the line runs along this cell's upper edge, 2 = along its lower edge
  for (const s of EW) { const i = Math.round(s.c) + EXT; if (i > 0 && i < N) { LANE_Y[i] = 2; LANE_Y[i - 1] = 1; } }
  for (const s of NS) { const i = Math.round(s.c) + EXT; if (i > 0 && i < N) { LANE_X[i] = 2; LANE_X[i - 1] = 1; } }
  city.LANE_Y = LANE_Y; city.LANE_X = LANE_X;
  // landmark overrides (story buildings): pick existing buildings near given points and shape them
  function nearest(x, y, pred) {
    let best = null, bd = 1e9;
    for (const b of B) { if (pred && !pred(b)) continue; const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, d = Math.hypot(cx - x, cy - y); if (d < bd) { bd = d; best = b; } }
    return best;
  }
  city.nearest = nearest;
  const tower = nearest(-310, 160, b => b.zone === 'west');
  if (tower) { tower.h = 195; tower.style = 'tower'; tower.role = 'sukunaTower'; }
  // the first-exchange tower (cut by Dismantle): NE corner of the main intersection
  const t1 = nearest(22, 26, b => b.x0 > 13 && b.y0 > 15);   // the NE corner building of the main junction
  if (t1) { t1.h = 74.1; t1.style = 'glass'; t1.role = 'cutTower'; t1.sign = false; }
  // the building Sukuna is slammed through (SW corner) and the one flattened by the double punch (NW corner)
  const t2 = nearest(-40, -40, b => b.x1 < -14 && b.y1 < -16); if (t2) { t2.role = 'holeBuilding'; t2.h = Math.max(t2.h, 31.5); }
  const t3 = nearest(-40, 40, b => b.x1 < -14 && b.y0 > 16); if (t3) { t3.role = 'punchBuilding'; t3.h = Math.max(t3.h, 38.5); }
  city.role = r => B.find(b => b.role === r);

  // spatial index (1 m grid of building index + 1) for the voxel and overhead renderers
  const BIDX = new Int16Array(N * N);
  city.BIDX = BIDX;
  B.forEach((b, k) => {
    for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) {
      if (x < -EXT || y < -EXT || x >= EXT || y >= EXT) continue;
      BIDX[gi(x, y)] = k + 1;
    }
  });

  // ------------------------------------------------------------------ street props
  // signals at every intersection corner (car signals facing each approach + pedestrian signals), lamps, trees
  // ------------------------------------------------------------------ Metropolitan Expressway (Shuto) viaduct
  const VIA = (city.viaduct = { spans: [], pillars: [], z0: 8.0, z1: 9.6, y0: -8.5, y1: 8.5, x0: -420, x1: -62 });
  for (let x = VIA.x1; x > VIA.x0; x -= 28) {
    const xa = Math.max(VIA.x0, x - 28);
    VIA.spans.push({ id: 'deck' + VIA.spans.length, x0: xa, x1: x, y0: VIA.y0, y1: VIA.y1 });
    VIA.pillars.push({ id: 'pier' + VIA.pillars.length, x0: x - 1.4, x1: x + 1.4, y0: -1.6, y1: 1.6 });
  }
  const PROPS = (city.props = []);
  (function genProps() {
    let sid = 0;
    for (const a of EW) for (const b of NS) {
      const hx = b.w / 2 - b.side * 0.4, hy = a.w / 2 - a.side * 0.4;
      for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        PROPS.push({ type: 'signal', id: 'sig' + (sid++), x: b.c + sx * hx, y: a.c + sy * hy, h: 5.2, arm: 3.5, facing: [-sx, 0], main: a.name === 'avenue' && b.name === 'avenue' });
        PROPS.push({ type: 'pedsig', id: 'ped' + (sid++), x: b.c + sx * (hx + 0.6), y: a.c + sy * (hy + 0.6), h: 2.6, facing: [0, -sy] });
      }
    }
    const rng = HT.rng(77);
    for (const a of EW) for (let x = -EXT + 10; x < EXT; x += 24 + rng() * 10) for (const s of [-1, 1]) {
      const y = a.c + s * (a.w / 2 - a.side * 0.35);
      if (NS.some(b => Math.abs(x - b.c) < b.w / 2 + 4)) continue;
      PROPS.push({ type: rng() < 0.7 ? 'lamp' : 'tree', x, y, h: 7 + rng() * 2, seed: Math.floor(rng() * 1e6) });
    }
    for (const b of NS) for (let y = -EXT + 10; y < EXT; y += 26 + rng() * 10) for (const s of [-1, 1]) {
      const x = b.c + s * (b.w / 2 - b.side * 0.35);
      if (EW.some(a => Math.abs(y - a.c) < a.w / 2 + 4)) continue;
      PROPS.push({ type: rng() < 0.75 ? 'lamp' : 'tree', x, y, h: 7 + rng() * 2, seed: Math.floor(rng() * 1e6) });
    }
    // abandoned cars on the avenues (the district is evacuated; a few cars left behind)
    for (let k = 0; k < 18; k++) {
      const onEW = rng() < 0.55, st = onEW ? EW[Math.floor(rng() * 3)] : NS[Math.floor(rng() * 3)];
      const along = -300 + rng() * 600, lane = (rng() < 0.5 ? -1 : 1) * (2 + rng() * (st.w / 2 - st.side - 3));
      if ((onEW ? NS : EW).some(s => Math.abs(along - s.c) < s.w / 2 + 6)) continue;
      PROPS.push({ type: 'car', x: onEW ? along : st.c + lane, y: onEW ? st.c + lane : along, dir: onEW ? [1, 0] : [0, 1], col: [C.red, C.white, C.steel, C.ink, C.blue, C.gold][Math.floor(rng() * 6)], seed: k });
    }
  })();
  city.propsNear = (x, y, r) => PROPS.filter(p => Math.abs(p.x - x) < r && Math.abs(p.y - y) < r);

  // ------------------------------------------------------------------ the damage ledger
  const L = (HT.ledger = { entries: [], resolved: false });
  L.add = e => { L.entries.push(Object.assign({}, e)); L.resolved = false; return e; };
  L.resolve = () => {
    // film acts in order (the fight test is not part of the film's continuity)
    const film = (HT.ACTS_ALL || []).filter(a => a.id !== 'test'), first = HT.ACTS && HT.ACTS[0] ? film.findIndex(a => a.id === HT.ACTS[0].id) : -1;
    const where = sid => { for (let i = 0; i < film.length; i++) { const k = film[i].scenes.indexOf(sid); if (k >= 0) return [i, k]; } return null; };
    for (const e of L.entries) {
      if (e.T !== undefined && e.scene === undefined) { e.T0 = e.T; continue; }
      const st = e.scene !== undefined && HT.sceneStart ? HT.sceneStart(e.scene) : 0;
      if (isFinite(st)) { e.T0 = st + (e.t || 0); continue; }
      // a scene outside this timeline: damage from an EARLIER act (reviewing a later act on its own) has already
      // happened — applied at a large negative time that keeps its order; later acts / the fight test never apply
      const w = e.scene !== undefined ? where(e.scene) : null;
      e.T0 = w && first >= 0 && w[0] < first ? -1e6 + w[0] * 1e4 + w[1] * 100 + (e.t || 0) : Infinity;
    }
    L.entries.sort((a, b) => a.T0 - b.T0);
    L.resolved = true;
  };
  L.state = T => { if (!L.resolved) L.resolve(); const out = []; for (const e of L.entries) { if (e.T0 <= T + 1e-9) out.push(e); else break; } return out; };
  L.version = T => { if (!L.resolved) L.resolve(); let n = 0; for (const e of L.entries) { if (e.T0 <= T + 1e-9) n++; else break; } return n; };
  // the moment until which an entry is still animating (a slice sliding, a collapse falling)
  L.animUntil = e => e.T0 + (e.dur || (e.kind === 'slice' ? 2.2 : e.kind === 'collapse' ? 3 : 0));
  L.key = T => { // cache key: version + whether any entry is still animating at T (then it changes every frame)
    const st = L.state(T); let anim = false;
    for (const e of st) if (T < L.animUntil(e)) { anim = true; break; }
    return st.length + (anim ? '@' + T.toFixed(3) : '');
  };
  HT.onTimeline = HT.onTimeline || [];
  HT.onTimeline.push(() => L.resolve());
})();
