/* =====================================================================================================
   DOMAIN CLASH — music cue for the M0 fight test                          (src/audio/score_m0.js, classic script)
   Scene 'fighttest' (0:00–0:30). Its script is still being written, so every sync point is read from the scene's cues
   with a planned default:
     0–4 s    dawn stillness — Gojo's head on glass, a sparse koto, a thread of high strings (D Lydian)
     4–8 s    Sukuna — odaiko, his motif on the detuned bass + low strings, a sul-ponticello ♭2 cluster (D Phrygian)
     8–20 s   the exchange — driving taiko/shime + bass ostinato, "The Strongest" (both themes at once), koto 16ths,
              a stretto into the silence; the music catches every hitM / hitH / blackFlash / infinityStop cue
     ~20–22 s total musical silence (notes dropped + music bus gated) before the colossal hit
              (the scene's first 'hitHuge' or 'blackFlash' cue, default 22.0 s)
     22–30 s  aftermath — the hit, Mahoraga's wheel ostinato for 2 bars (one notch turns), a temple bell, fade
   ===================================================================================================== */
(function () {
'use strict';
const HT = window.HT, AU = HT.AU;
const { nm, clamp, V, THEMES: TH, ARR } = AU;
const G = TH.gojo, SK = TH.sukuna, MA = TH.mahoraga;

HT.music.cue({ id: 'm0.fighttest', from: 'fighttest', to: 'fighttest', level: 0, fn: C => {
  const S = 'fighttest', END = C.endBeat;
  // ---- sync points
  const hit = clamp(C.cueBeat(S, ['hitHuge', 'blackFlash'], 22.0), 28, END - 4); // the colossal hit (beats)
  const sil = Math.max(20, hit - 4);                                                // 2 s of silence before it
  const EX = 16;                                                                     // the exchange starts at 8 s
  const accents = C.cuesOf(S, ['hitM', 'hitH', 'blackFlash', 'infinityStop'], 0, sil).filter(c => Math.abs(c.b - hit) > 0.5);

  // ======== 0–4 s  dawn stillness
  C.mel('glass', 0, G.a, 0.42, { vib: 7, rel: 0.7 });
  [[0, 'D4'], [1.5, 'A4'], [3, 'E5'], [4.5, 'F#5'], [6, 'B4'], [7, 'E4']].forEach(([b, n], k) => C.n('koto', b, nm(n), 1, 0.34 + 0.04 * (k % 2), { let: 1, pan: -0.3 + 0.12 * k }));
  C.ch('strings', 0, [nm('D5'), nm('A5')], 8, 0.16, { att: 1.6, rel: 1.2, cut: 1500, n: 3 });

  // ======== 4–8 s  Sukuna
  ARR.taiko(C, 8, 'D.....k...d.d...' + 'D.....d.k.ddD...', 0.85);
  C.mel('dbass', 8, V.oct(SK.a, -1), 0.82, { cut: 380, drive: 1 });
  C.mel('strings', 8, SK.a, 0.5, { att: 0.06, rel: 0.35 });
  C.ch('strings', 8, [nm('D2'), nm('A2')], 8, 0.3, { att: 0.4, rel: 0.6, cut: 1200 });
  C.ch('strings', 8, [nm('D4'), nm('Eb4')], 8, 0.14, { att: 0.8, rel: 0.6, trem: 13, pont: 1 });

  // ======== 8 s → silence  the exchange
  const GROOVE = ['D..d..D.k.d.D.d.', 'D..d..D.k.ddD.k.', 'D.dd..D.k.d.DdD.', 'D..d.dD.k.ddDdkd', 'D.d.D.d.DdDdDdDd', 'DdDdDdDdDdDdDDDD'];
  const SHIME = ['..s...s...s.s...', 's.s.S.s.s.s.S.s.', 's.s.S.s.s.s.S.ss', 's.s.S.s.s.s.S.s.', 'ssSsssSsssSsssSs', 'SsSsSsSsSsSsSSSS'];
  const BASS = [ // one 8th-note line per bar, shaped against the melody above it (null = rest)
    ['D2', null, 'D2', 'A1', 'D2', null, 'D2', 'A1'], ['A1', 'A1', 'Bb1', 'A1', 'D2', 'D2', 'C2', 'D2'],
    ['D2', 'D2', 'Eb2', 'F2', 'Eb2', 'Eb2', 'C2', 'C2'], ['D2', 'D2', 'A1', 'D2', 'D2', 'A1', 'D2', 'Eb2'],
    ['D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'D2', 'D2'], ['D2', 'D2', 'D2', 'D2', 'Eb2', 'Eb2', 'E2', 'F2']];
  for (let i = 0; EX + 4 * i < sil - 1e-6; i++) {
    const b = EX + 4 * i, k = Math.min(i, GROOVE.length - 1);
    ARR.taiko(C, b, GROOVE[k], 0.72 + 0.05 * k);
    ARR.taiko(C, b, SHIME[k], 0.55 + 0.05 * k);
    BASS[k].forEach((n, j) => { if (n) C.n('dbass', b + j * 0.5, nm(n), 0.45, (j === 0 || j === 3 || j === 6 ? 0.95 : 0.72), { cut: 420, drive: 1 }); });
  }
  // The Strongest: Gojo's 4 bars on glass over Sukuna's 4 bars on strings (doubled an octave up), bars 5–8
  C.mel('glass', EX, TH.strongest.upper(), 0.62, { vib: 9, rel: 0.4 });
  C.mel('strings', EX, TH.strongest.lower(), 0.56, { att: 0.05, rel: 0.3 });
  C.mel('strings', EX, V.oct(TH.strongest.lower(), 1), 0.28, { att: 0.05, rel: 0.3 });
  // koto 16ths above on the shared D–A frame (+E), skipping any note that would rub a semitone against the lines
  const KP = ['D5', 'A5', 'D6', 'A5', 'E5', 'A5', 'D6', 'E6'].map(nm);
  for (let b = EX; b < Math.min(EX + 16, sil) - 1e-6; b += 0.25) {
    const m = KP[Math.round((b - EX) * 4) % 8];
    if (!C.clash(b, 0.25, m, ['glass', 'strings', 'dbass'])) C.n('koto', b, m, 0.25, (Math.round(b * 4) % 4 === 0 ? 0.36 : 0.24), { pan: 0.35 });
  }
  // stretto into the silence: the two heads chase each other a beat apart, then again a fourth higher
  const st = EX + 16;
  if (st < sil - 1e-6) {
    const gh = V.frag(G.a, 0, 4), sh = V.frag(SK.a, 0, 4);
    [[st, 0], [st + 4, 5]].forEach(([b, tr]) => {
      C.mel('glass', b, gh, 0.7, { vib: 10, rel: 0.3 }, tr);
      C.mel('strings', b + 1, sh, 0.62, { att: 0.04, rel: 0.25 }, tr);
      C.mel('strings', b + 1, sh, 0.3, { att: 0.04, rel: 0.25 }, tr + 12);
    });
    const r0 = Math.max(st, sil - 4);
    for (let b = r0; b < sil - 1e-6; b += 0.25) C.n('shime', b, 0, 0.25, 0.3 + 0.5 * (b - r0) / Math.max(0.25, sil - r0), {});
    C.n('riser', r0, nm('D3'), sil - r0, 0.5, { from: 300, to: 6500, q: 2.5, tone: 1 });
    C.n('revcym', Math.max(st, sil - 3), 0, Math.min(3, sil - st), 0.45);
  }
  // accents: the music catches the hits (Infinity = glass; landed blows = taiko + string sforzando)
  accents.forEach(c => ARR.accent(C, c.b, c.sfx === 'infinityStop' ? 'inf' : c.sfx === 'blackFlash' ? 'huge' : 'hit', c.sfx === 'hitM' ? 0.8 : 1));

  // ======== the weapon: total musical silence (notes dropped, music bus gated — reverb tails cut too)
  C.silence(sil, hit);

  // ======== the colossal hit → Mahoraga's wheel (2 bars) → the temple bell → fade
  ARR.accent(C, hit, 'huge', 1);
  C.n('dbass', hit, nm('D1'), 2, 1.0, { cut: 300, rel: 0.8 });
  for (let bar = 0; bar < 2 && hit + bar * 4 < END - 1; bar++) {
    const b = hit + bar * 4, w = MA.wheel(bar); // bar 2: the wheel has turned one notch (up a minor third)
    MA.steps.forEach((s, j) => {
      C.n('clunk', b + s * 0.25, w[j], 1, (bar === 0 && j === 0 ? 0.55 : 0.8), { t60: 1.4 });
      C.n('dbass', b + s * 0.25, w[j] - 12, 0.7, 0.7, { cut: 360 });
    });
    ARR.taiko(C, b, '..x.x...x.x...x.', 0.6);
    C.ch('strings', b, [w[0] - 12, w[2] - 12], 4, 0.2, { att: 0.3, rel: 0.8, pont: 1 });
  }
  const bell = hit + 8;
  if (bell < END - 1) C.n('bonsho', bell, nm('D2'), 4, 0.95, { t60: 28 });
  C.fadeOut(Math.min(hit + 10, END - 2), END);
} });
})();
