/* ACT VI · 7 — a6_credits (38 s). The end credits: the tall black-and-white screentone manga page (HT.cards.creditsPage,
   manga.js) scrolls from the DOMAIN CLASH header through the credit tiers (snow · signal · domains · wheel · cut) and
   the wordless panel pairs down to the final airport panel, which holds on シーン while a small plane crosses its
   window; "A non-commercial fan tribute" is the last line. The lines are HT.cards.CREDIT_LINES as the manga module
   defines them (including "Jujutsu Kaisen © Gege Akutami / Shueisha") — not overridden here, so they stay editable in
   one place. The page is built in slices by the scene's init (creditsInit) so the first frame never stalls. The scene
   follows the salute's black: it fades in from ink and out to ink with an ordered (Bayer) dissolve — pure ink + paper
   pixels — instead of the page's alpha fades, which quantize to lilac / blue-grey mixes on the white paper. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, W = HT.W, H = HT.H;
  const O = { dur: 38, hold0: 3.4, hold1: 8, fadeIn: 0.001, fadeOut: 0.001 }, FIN = 2.0, FOUT = 2.0;
  HT.scene({
    id: 'a6_credits', act: 'VI', title: 'Credits', dur: 38, transitionIn: { type: 'cut', dur: 0 },
    ambience: [],
    cues: [],
    init() { return HT.cards && HT.cards.creditsInit ? HT.cards.creditsInit(O) : null; },
    draw(ctx, t) {
      if (HT.cards && HT.cards.creditsPage) HT.cards.creditsPage(ctx, t, O);
      else { HT.rect(ctx, 0, 0, W, H, C.ink); return; }
      const k = Math.max(1 - HT.clamp(t / FIN, 0, 1), 1 - HT.clamp((O.dur - t) / FOUT, 0, 1));
      if (k > 0.001 && HT.fxu) { const m = HT.fxu.dcol(C.ink, k); if (m) { ctx.fillStyle = m; ctx.fillRect(0, 0, W, H); } }
    },
  });
})();
