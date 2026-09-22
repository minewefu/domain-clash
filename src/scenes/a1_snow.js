/* ACT I · 1 — a1_snow (12 s). Black. One snowflake tumbles down through black, then a second, a third; the black thins
   into the navy of the dawn sky; the flakes fall past the tip of a far tower; the pink band of dawn at the bottom.
   Silence first (Primal): wind hush, one koto harmonic at the first flake. Custom drawing (not a fight scene). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const clamp = HT.clamp;
  // flakes: [appear time, x0, speed px/s, sway amp, sway freq, size 1..3, depth 0..1]
  const FLAKES = [[0.8, 322, 17, 10, 0.6, 3, 1]];
  const rng = HT.rng(1224);
  for (let i = 0; i < 70; i++) FLAKES.push([2.6 + rng() * 7, rng() * W, 10 + rng() * 22, 4 + rng() * 14, 0.3 + rng() * 0.8, 1 + Math.floor(rng() * 2.4), rng()]);
  // far tower silhouettes that rise into view from the bottom (the camera descends with the snow)
  const TOWERS = [];
  for (let i = 0; i < 22; i++) { const x = rng() * W, w = 10 + rng() * 34, h = 30 + rng() * 120; TOWERS.push([x, w, h, rng()]); }
  TOWERS.push([W * 0.56, 22, 190, 0.5], [W * 0.56 + 30, 22, 190, 0.5]); // the twin-towered city hall far away
  function flake(ctx, x, y, size, rot, col) {
    x = Math.round(x); y = Math.round(y);
    if (size <= 1) { HT.px(ctx, x, y, col); return; }
    if (size === 2) { const r = Math.floor(rot * 4) & 1; if (r) { HT.px(ctx, x, y, col); HT.px(ctx, x + 1, y, col); HT.px(ctx, x, y + 1, col); } else { HT.px(ctx, x, y, col); HT.px(ctx, x + 1, y + 1, col); } return; }
    // a 5 px six-armed flake, drawn as a rotating cross / X alternation (on 2s)
    const r = Math.floor(rot * 6) % 2;
    HT.px(ctx, x, y, C.white);
    if (r) { HT.px(ctx, x - 1, y, col); HT.px(ctx, x + 1, y, col); HT.px(ctx, x, y - 1, col); HT.px(ctx, x, y + 1, col); HT.px(ctx, x - 2, y, C.steel); HT.px(ctx, x + 2, y, C.steel); HT.px(ctx, x, y - 2, C.steel); HT.px(ctx, x, y + 2, C.steel); }
    else { HT.px(ctx, x - 1, y - 1, col); HT.px(ctx, x + 1, y + 1, col); HT.px(ctx, x + 1, y - 1, col); HT.px(ctx, x - 1, y + 1, col); }
  }
  HT.scene({
    id: 'a1_snow', act: 'I', title: 'Snow', dur: 12, transitionIn: { type: 'cut', dur: 0 },
    ambience: [{ name: 'wind', vol: 0.25 }, { name: 'snow', vol: 0.35 }],
    cues: [{ t: 0.8, sfx: 'dropSoft', vol: 0.15 }],
    draw(ctx, t) {
      // black → dawn: sky rises from the bottom as the camera descends (5 → 12 s)
      const reveal = HT.smooth(clamp((t - 4.5) / 6.5, 0, 1));
      HT.rect(ctx, 0, 0, W, H, C.ink);
      if (reveal > 0) {
        const E = HT.ENVS.dawn, sky = E.sky;
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        const k = reveal;
        sky.slice().reverse().forEach(([p, col]) => grad.addColorStop(HT.clamp(1 - p * (0.55 + 0.45 * k), 0, 1), col));
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        // far towers rise from below (opaque; the whole view fades in from black over them)
        const rise = (1 - HT.E.outCubic(clamp((t - 6) / 6, 0, 1))) * 160;
        for (const [x, w, h, tone] of TOWERS) {
          const top = H - h * 0.55 + rise;
          HT.rect(ctx, x, top, w, H - top + 2, tone < 0.5 ? C.navy : C.indigo);
          if (tone > 0.7) for (let yy = top + 6; yy < H; yy += 7) HT.px(ctx, x + 3 + ((yy * 7) % Math.max(4, w - 6)), yy, C.honey);
        }
        if (reveal < 1) HT.alpha(ctx, 1 - reveal, () => HT.rect(ctx, 0, 0, W, H, C.ink));
      }
      // flakes (the first alone, then the rest), each tumbling on 2s
      for (const [t0, x0, sp, amp, fr, size, depth] of FLAKES) {
        const age = t - t0; if (age < 0) continue;
        const y = -6 + age * sp * (0.6 + depth * 0.7), x = x0 + Math.sin(age * fr * 2 + x0) * amp + age * 3;
        if (y > H + 4) continue;
        const rot = Math.floor(age * 12) / 12 * (0.7 + depth);
        flake(ctx, x, y, size, rot, depth > 0.5 ? C.mist : C.steel);
      }
    },
  });
})();
