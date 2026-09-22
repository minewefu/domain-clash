/* ACT V · 4 — a5_purple (24 s). The loudest moment of the film, preceded by silence. Over Gojo's shoulder the Red
   spirals into the swollen Blue far off — they fuse AT A DISTANCE: Hollow Purple. From beyond the West Shinjuku
   towers the sphere swells behind them, dwarfs them, the whole palette turns violet; the wall of light races outward
   and swallows the camera — whiteout. Inside the light: Mahoraga and its wheel come apart into drifting pixels (no
   gore — they simply cease), Sukuna braced and burning, Gojo's Infinity holding far off. The light ebbs: from high
   above, a huge stretch of Shinjuku is simply gone (ledger `erasure` r 250; the blast-torn rim: `shred`, `scorch`). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H, A = HT.A5;
  const BLUE = A.BLUE, G2 = A.G2, E = A.ERASE;          // BLUE: HT.A5.BLUE (src/act5_extra.js)
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const look = (from, to, f, extra) => HT.cam.lookAt(Object.assign({ x: from[0], y: from[1], z: from[2], f, roll: 0, shift: 0 }, extra || {}), to[0], to[1], to[2]);
  const YAW_W = Math.atan2(BLUE[0] - G2[0], BLUE[1] - G2[1]), dW = [Math.sin(YAW_W), Math.cos(YAW_W)], pW = [dW[1], -dW[0]];
  const RED = A.redAt(0.95), MID = [(RED[0] + BLUE[0]) / 2, (RED[1] + BLUE[1]) / 2, (RED[2] + BLUE[2]) / 2];
  const SEP = Math.hypot(RED[0] - BLUE[0], RED[1] - BLUE[1], RED[2] - BLUE[2]);
  const FORM = 2.4, BORN = FORM + 0.22, GROW = 3.4, HOLD = 2.6, FADE = 3.4; // the Purple's timeline (purpleTimes)
  const T_WHITE = 8.2, T_IN = 9.8, T_OUT = 16.4, T_ERASE = 8.4;
  const OTS = A.lookShear([G2[0] - dW[0] * 5.5 + pW[0] * 2.0, G2[1] - dW[1] * 5.5 + pW[1] * 2.0, G2[2] + 2.2], [MID[0], MID[1], MID[2] + 4], 400);
  const WEST = look([-900, -30, 60], [BLUE[0], BLUE[1], BLUE[2] - 30], 380);
  // inside the light: a stylised space in front of a fixed camera (the characters are staged for the image, not the map)
  const IN = { x: 0, y: -40, z: 0 };
  const inCam = { x: IN.x, y: IN.y, z: 2.5, yaw: 0, pitch: 0, f: 420, shift: 20 };
  // held shots rendered once: the opening over Gojo's shoulder (sky) and the reveal from high above (city + erasure);
  // the set is 'black' underneath for those stretches. The light's bands are redrawn only on 2s (12 drawings/s).
  const SKYOPTS = { clouds: { z: 70, cover: 0.3 }, rays: 0 };
  const plateOTS = A.setPlate('sky', { from: 0, to: BORN, setOpts: SKYOPTS });
  const REVEAL = A.lookShear([E.x + 120, E.y - 520, 360], [E.x, E.y + 20, 0], 350);
  const plateReveal = A.plate({ from: T_OUT, to: 24 });
  const bandCache = HT.lru(2);
  HT.caches.push({ name: 'a5_purple.bands', size: () => bandCache.size });
  function lightBands(ctx, tq) { // the light's interior (one drawing; cached per 1/12 s by the hook)
    const u = HT.fxu, cx = W * 0.5, cy = H * 0.4;
    HT.rect(ctx, 0, 0, W, H, C.violet);
    const band = (r, col, amp, fq, ph) => { const n = 72, P = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + amp * Math.sin(fq * a + ph) + amp * 0.6 * Math.sin((fq + 3) * a - ph * 1.4); P.push(cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.82); } u.fillPoly(ctx, P, col); };
    band(470, u.dcol(C.lavender, 0.5), 0.025, 5, tq * 0.7); band(380, C.lavender, 0.025, 6, -tq * 0.6); band(300, u.dcol(C.blush, 0.5), 0.03, 7, tq * 0.9);
    band(235, C.blush, 0.03, 5, -tq * 0.8); band(175, u.dcol(C.white, 0.5), 0.035, 6, tq); band(120, C.white, 0.03, 7, -tq * 1.1);
    for (let i = 0; i < 22; i++) { // rays turning slowly out of the core
      const a = i / 22 * Math.PI * 2 + tq * 0.05 + HT.hash(i, 5) * 0.25, L = W;
      u.taper(ctx, cx + Math.cos(a) * 60, cy + Math.sin(a) * 50, cx + Math.cos(a) * L, cy + Math.sin(a) * L * 0.82, 1, 10 + 16 * HT.hash(i, 7), u.dcol(C.white, i % 3 ? 0.45 : 0.7));
    }
  }
  HT.fightScene({
    id: 'a5_purple', act: 'V', title: 'Hollow Purple', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'sky', setOpts: SKYOPTS, env: { time: 'sunset', wind: 0.55, snow: 0.2 },
    cast: {
      gojo: { char: 'gojo', at: G2, face: dW, pose: 'a5_backStand', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [IN.x - 3.0, IN.y + 13, 0.4], face: 'east', pose: 'a5_sukGuard', costume: 'fight' },
      gojoFar: { char: 'gojo', at: [IN.x - 1.2, IN.y + 30, 4.4], face: 'east', pose: 'a5_brace', costume: 'fight' },
    },
    ambience: [{ name: 'sky', vol: 0.3 }, { name: 'wind', vol: 0.3 }],
    init() { return A.warmSky(this); }, // voxel heights for every ledger state the sky set shows (no in-frame rebuild)
    hooks: {
      back(ctx, S) { // inside the light: wobbling bands of violet → lavender → blush → white around the core, slow rays
        const t = S.t;
        S.mode = t >= T_IN && t < T_OUT ? 'ink' : undefined;
        if (plateOTS(ctx, S) || plateReveal(ctx, S)) return;
        if (!(t >= T_IN && t < T_OUT)) return;
        const tq = Math.floor(t * 12) / 12, key = tq.toFixed(4) + '|' + ctx.canvas.width;
        let cv = bandCache.get(key);
        if (!cv) { cv = HT.canvas(ctx.canvas.width, ctx.canvas.height); lightBands(cv.g, tq); bandCache.set(key, cv); }
        ctx.drawImage(cv.c, 0, 0);
      },
    },
    script: [
      // ---- 1. silence. Over Gojo's shoulder (his hand still open): the Red spirals into the swollen Blue — they fuse
      { t: 0, shot: 'static', cam: OTS },
      { t: 0, env: { set: 'black' } },
      { t: 0, env: { light: [0.4, -0.3, -0.35] } },
      { t: 0, who: 'gojo', do: 'view', view: 'back' },
      { t: 0, who: 'sukuna', do: 'hide' }, { t: 0, who: 'gojoFar', do: 'hide' },
      { t: 0, fx: 'orb', kind: 'blue', at: BLUE, swell: [[0, 10], [FORM, 2]], minPx: 1.4, dur: FORM, lens: 0.6, out: 0.3 },
      { t: 0, fx: 'purple', mode: 'burst', at: MID, blue: BLUE, red: RED, sep: SEP, orb: 3.2, phase: 0, form: FORM, r0: 2, r: A.PR, grow: GROW, hold: HOLD, fade: FADE, sfx: false, dur: BORN },
      { t: FORM, sfx: 'purpleCharge', vol: 0.8 },
      { t: 0, amb: 'wind', vol: 0, fade: 1.2 }, { t: 0, amb: 'sky', vol: 0, fade: 1.2 },
      { t: T_OUT + 0.5, amb: 'wind', vol: 0.3, fade: 3 },
      // ---- 2. BIRTH — beyond the West Shinjuku towers the sphere swells behind them and dwarfs them; violet takes over
      { t: BORN, env: { set: 'city', time: 'a5glare', light: [0.5, -0.2, -0.3] } },
      { t: BORN, shot: 'static', cam: WEST, to: { f: 330 }, dur: 4.8, ease: 'outCubic' },
      { t: BORN, fx: 'purple', mode: 'burst', at: MID, r0: 2, r: A.PR, form: 0.001, grow: GROW, hold: HOLD, fade: FADE, sfx: false, layer: 'sky', dur: T_WHITE + 0.4 - BORN, seed: 11 },
      { t: BORN, fx: 'shadeQuad', pts: [[-1400, -900], [-422, -900], [-422, 900], [-1400, 900]], col: C.ink, a: 0.7, dur: T_WHITE + 0.4 - BORN },
      { t: BORN, sfx: 'purpleErase', vol: 1, dur: 6 },
      { t: BORN, shake: 0.4 }, { t: BORN + 1.2, shake: 0.5 }, { t: BORN + 2.6, shake: 0.7 },
      { t: BORN, post: 'purpleGrade', keys: [[0, 0.2], [1.4, 0.55], [3.4, 0.8], [6, 0.9]], dur: T_WHITE + 1 - BORN, lift: 0.08 },
      { t: BORN + 0.1, fx: 'skyFlash', x: 330, y: 170, r: 110, col: C.lavender, dur: 0.5 },
      // ---- 3. the light overruns everything — whiteout (the front swallows the camera)
      { t: T_WHITE - 0.9, post: 'fadeTo', col: C.blush, in: 0.55, col2: C.white, in2: 0.9, dur: T_IN - T_WHITE + 1.1 },
      { t: T_WHITE - 0.9, shake: 0.9 },
      { t: T_WHITE + 0.5, sfx: 'tinnitus', vol: 0.3, dur: 4 },
      // the erasure itself happens inside the whiteout (the whole district within 250 m is gone; the rim is torn)
      { t: T_ERASE, damage: { kind: 'erasure', x: E.x, y: E.y, z: E.z, r: E.r } },
      // the blast gradient around the erased core: flattened to rubble out to 330 m, torn into slabs and stumps to 470 m
      ...HT.city.buildings.filter(b => { const d = Math.hypot((b.x0 + b.x1) / 2 - E.x, (b.y0 + b.y1) / 2 - E.y); return d >= E.r * 0.9 && d < 330; }).map(b => ({ t: T_ERASE, damage: { kind: 'flatten', b: b.id } })),
      { t: T_ERASE, damage: { kind: 'shred', x: E.x, y: E.y, r: 470 } },
      { t: T_ERASE, damage: { kind: 'scorch', x: E.x, y: E.y, r: 360 } },
      // ---- 4. inside the light: Mahoraga and the wheel come apart; Sukuna braced and burning; Gojo's Infinity far off
      { t: T_IN, env: { set: 'white' } },
      { t: T_IN, shot: 'static', cam: inCam },
      { t: T_IN, who: 'gojo', do: 'hide' },
      { t: T_IN, who: 'sukuna', do: 'show' }, { t: T_IN, who: 'gojoFar', do: 'show' },
      { t: T_IN, who: 'sukuna', do: 'fly', to: [IN.x - 4.4, IN.y + 13.5, 0.1], dur: T_OUT - T_IN, pose: 'a5_sukGuard', ease: 'linear' },
      { t: T_IN, fx: 'disintegrate', char: 'mahoraga', pose: 'a5_mahoHang', at: [IN.x + 2.0, IN.y + 8.5, -0.4], face: -1, mode: 'ink', opts: { wheel: false }, from: 1.2, span: 4.6, dir: [-1, -0.15], dur: T_OUT - T_IN, life: 1.8, every: 2 },
      { t: T_IN, fx: 'disintegrate', char: 'maho_wheel', pose: 'stand', x: 426, y: 122, px: 420, mode: 'normal', motes: 'gold', from: 4.4, span: 2.0, dir: [-1, 0], dur: T_OUT - T_IN, life: 2.0, every: 1 },
      { t: T_IN, fx: 'infinityAura', who: 'gojoFar', intensity: 1, dur: T_OUT - T_IN },
      { t: T_IN, sfx: 'rumble', vol: 0.5, dur: 6 },
      { t: T_IN + 3.4, sfx: 'wheelTurn', vol: 0.35 },
      // ---- 5. the light ebbs: from high above, the district is simply gone; smoke rises from the torn rim
      { t: T_OUT, env: { set: 'black', time: 'sunset', light: [-0.6, -0.3, 0.65] } },
      { t: T_OUT, who: 'sukuna', do: 'hide' }, { t: T_OUT, who: 'gojoFar', do: 'hide' },
      { t: T_OUT, post: 'purpleGrade', keys: [[0, 0.8], [3, 0.4], [7.6, 0.12]], dur: 24 - T_OUT, lift: 0.1 },
      { t: T_OUT, post: 'fadeFrom', col: C.white, dur: 2.4 },
      { t: T_OUT, fx: 'scour', at: [E.x, E.y], r: E.r * 0.89, glow: 0.8, dur: 24 - T_OUT },
      { t: T_OUT, shot: 'static', cam: REVEAL },
      { t: T_OUT, fx: 'smokeCols', cols: [[E.x - 230, E.y + 60, 0], [E.x + 150, E.y + 180, 0], [E.x + 210, E.y - 110, 0], [E.x - 120, E.y - 210, 0]], pre: 8, rate: 7, life: 9, rise: 11, size: 7, grow: 2.4, dark: true, wind: 3.5, dur: 24 - T_OUT },
      { t: T_OUT, fx: 'ashFall', density: 0.5, wind: 0.6, ember: 0.12, dur: 24 - T_OUT, in: 1.5 },
      { t: T_OUT + 0.5, sfx: 'rubble', vol: 0.4, dur: 5 },
    ],
  });
})();
