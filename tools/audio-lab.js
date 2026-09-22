// DOMAIN CLASH — audio lab: analysis & tests for src/audio/*.js (loaded by tools/audio-lab.html), driven by tools/cdp.mjs:
//   node tools/cdp.mjs --page "tools/audio-lab.html" --eval "await runChecks()" --timeout 300000
//   node tools/cdp.mjs --page "tools/audio-lab.html" --eval "await seamTest()"            (also: sfxTable, instTable, bedTable,
//   fightSpot, fullMix, realtimeTest, determinism, drawMix / sfxGrid (+ --shot))
//   node tools/cdp.mjs --page "tools/audio-lab.html?acts=I" --eval "await actChecks()" --timeout 900000
//     (act mode: the film's real timeline for the listed acts — catalog, loudness per scene and stem, duck depths, the
//      planned silences, modes, full-length determinism, chunked-vs-continuous seams, KS cache; also drawMix --shot)
'use strict';
const A = HT.audio, D = A._dbg, AU = HT.AU;
const dB = x => (x > 0 ? 20 * Math.log10(x) : -999);
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, r3 = x => Math.round(x * 1000) / 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SR = 48000;

// ------------------------------------------------------------------ SPEC.md §11 catalog (checked against HT.audio.SFX / AMB)
const CATALOG = {
  impacts: 'hitL hitM hitH hitHuge bodyFall block infinityStop groundSlam wallCrash',
  motion: 'whooshS whooshM whooshL whip dashAir blink flyBy',
  slashes: 'shing slashSplit cleave dismantle worldCut',
  techniques: 'infinityHum blueCharge blueImplode redCharge redBlast purpleCharge purpleErase blackFlash rctHeal sixEyes',
  domains: 'handSign domainBloom voidOpen shrineRise barrierUp barrierCrack barrierShatter domainCollapse tallyTick',
  shikigami: 'wheelClunk wheelTurn mahoStep swordRing mahoSlash shadowRise agitoSpark rabbitSwarm waterJet',
  environment: 'windGust crosswalkChirp signalTick canRoll glassShatter glassTinkle buildingSlide collapse rubble rumble quake fireCrackle carAlarm steelGroan sparkPop crowCaw footConcrete footSnow clothSnap clothFlutter dropSoft',
  graphic: 'impactFrame panelSlam titleHit actCard riser downer revCym subDrop boom heartbeat tinnitus',
  coda: 'airportChime planeTakeoff',
  extra: 'erode', // added in M2 (in SPEC.md §11 since M2)
  act3: 'poleClang poleRing metalWhoosh redWhistle concreteGrind skid', // added in M3 for Act III (in SPEC §11 since M3)
  act4: 'extinguisherBurst chairScrape rip staticCrackle waterSpray crtHum heelSkid', // added in M4 for Act IV (director's request; SPEC §11 to be updated)
};
const CAT_NAMES = Object.values(CATALOG).join(' ').split(/\s+/);
const CAT_BEDS = 'wind snow cityEmpty void shrine rubble fire command sky airport interior'.split(' ');

// ------------------------------------------------------------------ lab timeline: real fight test + stub scenes
const STUB_FT = [ // used only if src/scenes/fighttest.js (or a module it needs) failed to load
  { t: 2.8, sfx: 'infinityStop', vol: 0.9 }, { t: 3.87, sfx: 'infinityStop', vol: 0.9 }, { t: 5.63, sfx: 'hitH', vol: 0.9 }, { t: 8.3, sfx: 'hitM', vol: 0.9 },
  { t: 2.7, sfx: 'whooshS', vol: 0.55 }, { t: 3.73, sfx: 'whooshM', vol: 0.55 }, { t: 5.53, sfx: 'whooshM', vol: 0.55 }, { t: 8.17, sfx: 'whooshM', vol: 0.55 }];
const LAB_A = { id: 'labA', dur: 40, ambience: [{ name: 'wind', vol: 0.45 }, { name: 'cityEmpty', vol: 0.7 }, { name: 'snow', vol: 0.5 }], cues: [
  { t: 0.5, sfx: 'titleHit', vol: 0.7 }, { t: 3.0, sfx: 'crosswalkChirp', vol: 0.4, pan: -0.4, dur: 3.4 }, { t: 6.5, sfx: 'crowCaw', vol: 0.6, pan: 0.5 },
  { t: 8.0, sfx: 'canRoll', vol: 0.6, pan: 0.4, panTo: -0.2, dur: 2.6 }, { t: 9.9, sfx: 'signalTick', vol: 0.6 },
  { t: 12.0, sfx: 'footSnow', vol: 0.6, dur: 4 }, { t: 16.5, sfx: 'clothSnap', vol: 0.7 }, { t: 17.0, sfx: 'clothFlutter', vol: 0.5, dur: 2 },
  { t: 18.0, amb: 'snow', vol: 0, fade: 2 }, { t: 20.0, sfx: 'windGust', vol: 0.7, dur: 3 },
  { t: 24.0, sfx: 'whooshL', vol: 0.8 }, { t: 24.8, sfx: 'hitL', vol: 0.8 }, { t: 25.3, sfx: 'block', vol: 0.8 }, { t: 25.9, sfx: 'whip', vol: 0.8 },
  { t: 26.5, sfx: 'blink', vol: 0.8 }, { t: 27.0, sfx: 'dashAir', vol: 0.8 }, { t: 28.0, sfx: 'flyBy', vol: 0.7, dur: 1.6 },
  { t: 29.8, sfx: 'shing', vol: 0.9 }, { t: 30.2, sfx: 'slashSplit', vol: 0.9 }, { t: 31.0, sfx: 'buildingSlide', vol: 0.8, dur: 4.5 },
  { t: 34.0, sfx: 'dismantle', vol: 0.8 }, { t: 35.0, sfx: 'cleave', vol: 0.8 }, { t: 36.0, sfx: 'glassShatter', vol: 0.7 },
  { t: 37.0, sfx: 'glassTinkle', vol: 0.6 }, { t: 38.0, sfx: 'bodyFall', vol: 0.8 }] };
const LAB_B = { id: 'labB', dur: 50, ambience: [{ name: 'void', vol: 0.6 }], cues: [
  { t: 0.5, sfx: 'handSign', vol: 0.8 }, { t: 1.2, sfx: 'actCard', vol: 0.8 }, { t: 3.0, sfx: 'domainBloom', vol: 0.9 },
  { t: 5.0, sfx: 'voidOpen', vol: 0.8, dur: 4 }, { t: 9.5, sfx: 'infinityHum', vol: 0.7, dur: 4 },
  { t: 13.0, sfx: 'sixEyes', vol: 0.8 }, { t: 14.5, sfx: 'blueCharge', vol: 0.8, dur: 1.5 }, { t: 15.5, sfx: 'blueImplode', vol: 0.9 },
  { t: 18.0, sfx: 'redCharge', vol: 0.8, dur: 1.2 }, { t: 18.6, sfx: 'redBlast', vol: 0.9 },
  { t: 20.0, amb: 'void', vol: 0, fade: 1.5 }, { t: 20.0, amb: 'shrine', vol: 0.7, fade: 1.5 },
  { t: 20.5, sfx: 'shrineRise', vol: 0.8, dur: 4 }, { t: 25.0, sfx: 'barrierUp', vol: 0.7 }, { t: 26.5, sfx: 'barrierCrack', vol: 0.8 },
  { t: 27.5, sfx: 'barrierShatter', vol: 0.9 }, { t: 29.5, sfx: 'wheelClunk', vol: 0.9 },
  { t: 31.0, sfx: 'wheelTurn', vol: 0.7, dur: 1.2 }, { t: 32.5, sfx: 'mahoStep', vol: 0.8 }, { t: 33.3, sfx: 'swordRing', vol: 0.8 },
  { t: 34.5, sfx: 'mahoSlash', vol: 0.9 }, { t: 35.5, sfx: 'shadowRise', vol: 0.7, dur: 2 }, { t: 36.0, sfx: 'agitoSpark', vol: 0.7 },
  { t: 37.0, sfx: 'rabbitSwarm', vol: 0.7, dur: 2.5 }, { t: 38.0, sfx: 'waterJet', vol: 0.7, dur: 1.5 }, { t: 40.0, sfx: 'blackFlash', vol: 1.0 },
  { t: 41.5, sfx: 'rctHeal', vol: 0.7, dur: 2 }, { t: 43.0, sfx: 'purpleCharge', vol: 0.9, dur: 3 }, { t: 43.0, sfx: 'purpleErase', vol: 1.0, dur: 5 },
  { t: 48.3, sfx: 'tinnitus', vol: 0.6, dur: 1.6 }, { t: 45.5, sfx: 'domainCollapse', vol: 0.5, dur: 3 }] };
const LAB_C = { id: 'labC', dur: 20, ambience: [{ name: 'rubble', vol: 0.6 }, { name: 'fire', vol: 0.35 }], cues: [
  { t: 0.5, sfx: 'riser', vol: 0.6, dur: 1.5 }, { t: 1.0, sfx: 'revCym', vol: 0.5, dur: 1.0 }, { t: 2.0, sfx: 'hitHuge', vol: 1.0 },
  { t: 2.0, sfx: 'impactFrame', vol: 0.8 }, { t: 2.0, sfx: 'subDrop', vol: 0.8 }, { t: 3.5, sfx: 'groundSlam', vol: 0.9 },
  { t: 5.0, sfx: 'wallCrash', vol: 0.9 }, { t: 6.5, sfx: 'collapse', vol: 0.8, dur: 4 }, { t: 6.5, sfx: 'boom', vol: 0.6 },
  { t: 8.0, sfx: 'quake', vol: 0.6, dur: 3 }, { t: 9.0, sfx: 'rumble', vol: 0.6, dur: 3 }, { t: 11.0, sfx: 'carAlarm', vol: 0.35, dur: 4 },
  { t: 11.5, sfx: 'steelGroan', vol: 0.6, dur: 2.5 }, { t: 12.5, sfx: 'sparkPop', vol: 0.6 }, { t: 13.0, sfx: 'fireCrackle', vol: 0.6, dur: 3 },
  { t: 14.0, sfx: 'rubble', vol: 0.6, dur: 2 }, { t: 15.0, sfx: 'hitM', vol: 0.8 }, { t: 15.6, sfx: 'hitH', vol: 0.9 },
  { t: 16.2, sfx: 'infinityStop', vol: 0.9 }, { t: 17.0, sfx: 'panelSlam', vol: 0.8 }, { t: 17.4, sfx: 'tallyTick', vol: 0.8 },
  { t: 17.6, sfx: 'footConcrete', vol: 0.6, dur: 1.2 }, { t: 18.5, sfx: 'worldCut', vol: 0.6, dur: 1.2 }, { t: 19.6, amb: 'rubble', vol: 0, fade: 0.2 }, { t: 19.6, amb: 'fire', vol: 0, fade: 0.2 }] };
const LAB_D = { id: 'labD', dur: 20, ambience: [{ name: 'airport', vol: 0.7 }], cues: [
  { t: 4.0, sfx: 'dropSoft', vol: 0.6 }, { t: 5.0, sfx: 'airportChime', vol: 0.6 }, { t: 7.0, sfx: 'planeTakeoff', vol: 0.5, dur: 10 },
  { t: 9.0, sfx: 'heartbeat', vol: 0.4, dur: 3.4 }, { t: 17.0, sfx: 'downer', vol: 0.4, dur: 2 }] };
function buildLabTimeline() {
  if (window.__acts) return buildActTimeline();
  const ft = HT.SCENES && HT.SCENES.fighttest;
  const list = [ft ? { id: 'fighttest', dur: ft.dur, cues: ft.cues, ambience: ft.ambience || [], real: true } : { id: 'fighttest', dur: 30, cues: STUB_FT, ambience: [], real: false }, LAB_A, LAB_B, LAB_C, LAB_D];
  let acc = 0;
  HT.timeline = list.map(s => { const e = Object.assign({}, s, { start: acc }); acc += s.dur; return e; });
  HT.duration = acc;
}
// Act mode: the film's own plan (src/timeline.js → HT.ACTS from ?acts=), built like main.js's HT.buildTimeline (which the
// lab does not load): scenes in act order, start = running sum of def.dur, cues / ambience straight from the scene defs.
function buildActTimeline() {
  let start = 0; HT.timeline = []; HT.actSpans = [];
  (HT.ACTS || []).forEach((act, ai) => {
    const a0 = start;
    act.scenes.forEach(id => {
      const def = (HT.SCENES && HT.SCENES[id]) || { id, dur: 8, cues: [], ambience: [], placeholder: true };
      HT.timeline.push({ id, def, act: act.id, actIndex: ai, start, dur: def.dur, cues: def.cues || [], ambience: def.ambience || [], placeholder: !!def.placeholder });
      start += def.dur;
    });
    HT.actSpans.push({ id: act.id, title: act.title, start: a0, dur: start - a0, index: ai });
  });
  HT.duration = start;
  (HT.onTimeline || []).forEach(f => { try { f(HT.timeline); } catch (e) { __err.push('onTimeline hook: ' + e.message); } });
}
// a lab-only music cue that puts long notes, rings, automation ramps, a gate cut and the elegy across every chunk seam
if (!window.__acts) HT.music.cue({ id: 'lab.seams', from: 'labA', to: 'labD', level: -6, fn: C => {
  const { nm, V, THEMES: TH, ARR } = AU;
  C.ch('strings', 2, [nm('D3'), nm('A3')], 44, 0.3, { att: 2, rel: 2 });                                   // crosses cue beat 20
  [[8, 'A4', 6, { meri: 1 }], [14, 'D5', 3], [17, 'E5', 7, { vib: 18 }], [24, 'D5', 2, { fall: 1 }], [28, 'A4', 8, { from: nm('D5') }]].forEach(([b, n, l, o]) => C.n('shaku', b, nm(n), l, 0.7, o || {}));
  [56, 57.5, 59, 59.75].forEach((b, k) => C.n('koto', b, nm(['D5', 'A4', 'E5', 'G#4'][k]), 1, 0.5, { let: 1 }));
  C.n('koto', 58, nm('B4'), 1, 0.5, { let: 1, bend: 1, bendAt: 0.2 });
  for (let b = 50; b < 70; b += 0.5) C.n('glass', b, [74, 81, 76, 80, 83, 85][Math.round(b * 2) % 6], 0.5, 0.35, { arp: 1 });
  C.n('bonsho', 50, nm('A2'), 4, 0.6, { t60: 24 });                                                     // rings across beats 60, 100
  for (let b = 88; b < 112; b += 4) { ARR.taiko(C, b, 'D..d..D.k.d.D.d.', 0.7); ARR.taiko(C, b, 's.s.S.s.s.s.S.s.', 0.5); C.mel('dbass', b, V.oct(V.frag(TH.sukuna.a, 0, 4), -1), 0.7, { cut: 400 }); }
  C.levelRamp(92, 108, -8, 0);                                                                           // a level ramp across beat 100
  for (let bar = 0; bar < 4; bar++) { const b = 124 + bar * 4, w = TH.mahoraga.wheel(bar); TH.mahoraga.steps.forEach((s, j) => C.n('clunk', b + s * 0.25, w[j], 1, 0.7)); }
  C.ch('strings', 124, [nm('D3'), nm('G#3')], 24, 0.25, { att: 0.5, rel: 1, pont: 1, trem: 12 });
  C.silence(138, 142);                                                                                   // a gate cut across beat 140
  [[150, 'D4'], [151, 'F4'], [152, 'Eb4'], [152.5, 'D4'], [154, 'A3'], [155, 'Bb3'], [155.5, 'A3'], [156, 'D4']].forEach(([b, n]) => C.n('shamisen', b, nm(n), 0.5, 0.7, {}));
  for (let b = 150; b < 158; b += 1) C.n('taiko', b, 0, 0.5, 0.5, { kind: b % 2 ? 'ka' : 'do' });
  const el = C.sceneBeat('labD');                                                                        // the elegy crosses beat 220
  C.mel('fmkeys', el - 4, TH.elegy.a.concat(V.disp(TH.elegy.b, 16)), 0.55, { trem: 3 });
  TH.elegy.harm.forEach((ch, k) => C.ch('fmkeys', el - 4 + k * 8, ch, 7.5, 0.3, {}));
  C.n('sub', el - 4, nm('D2'), 30, 0.5, { att: 3, rel: 3 });
  C.fadeOut(el + 32, C.endBeat);
} });
buildLabTimeline();

// ------------------------------------------------------------------ measurement helpers
function stats(buf, t0, t1) {
  const sr = buf.sampleRate, i0 = Math.max(0, Math.floor(t0 * sr)), i1 = Math.min(buf.length, Math.floor(t1 * sr));
  let pk = 0, ss = 0, nan = 0, over = 0, full = 0; const dc = [];
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const x = buf.getChannelData(c); let s = 0;
    for (let i = i0; i < i1; i++) {
      const v = x[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      const a = Math.abs(v); if (a > pk) pk = a;
      ss += v * v; s += v;
      if (a > 0.8913) over++; if (a >= 0.999) full++;
    }
    dc.push(s / Math.max(1, i1 - i0));
  }
  const n = Math.max(1, (i1 - i0) * buf.numberOfChannels);
  return { peak: r2(dB(pk)), rms: r2(dB(Math.sqrt(ss / n))), dc: dc.map(v => +v.toExponential(1)), nan, over, full };
}
// ITU-R BS.1770-4 K-weighting (48 kHz coefficients from the standard)
function kweight(buf) {
  const S1 = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
  const S2 = [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621];
  const run = (x, [b0, b1, b2, a1, a2]) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const out = []; for (let c = 0; c < buf.numberOfChannels; c++) out.push(run(run(buf.getChannelData(c), S1), S2));
  return out;
}
function msum(K, i0, i1) { let s = 0; for (const y of K) { for (let i = i0; i < i1; i++) s += y[i] * y[i]; } return s / Math.max(1, i1 - i0); }
const lufs = z => (z > 0 ? -0.691 + 10 * Math.log10(z) : -999);
function integrated(K, sr, t0, t1) { // gated integrated loudness (400 ms blocks, 75 % overlap, −70 abs / −10 rel gates)
  const i0 = Math.floor((t0 || 0) * sr), i1 = Math.min(K[0].length, Math.floor((t1 == null ? K[0].length / sr : t1) * sr)), B = Math.round(0.4 * sr), H = Math.round(0.1 * sr), z = [];
  for (let i = i0; i + B <= i1; i += H) z.push(msum(K, i, i + B));
  const a = z.filter(v => lufs(v) > -70); if (!a.length) return -999;
  const gr = lufs(a.reduce((p, v) => p + v, 0) / a.length) - 10, b = a.filter(v => lufs(v) > gr);
  return r1(lufs(b.reduce((p, v) => p + v, 0) / b.length));
}
function shortTermMax(K, sr, t0, t1) { let m = -999, at = 0; const W = 3 * sr; for (let i = Math.floor(t0 * sr); i + W <= Math.floor(t1 * sr); i += Math.round(0.1 * sr)) { const l = lufs(msum(K, i, i + W)); if (l > m) { m = l; at = i / sr; } } return { lufs: r1(m), at: r1(at) }; }
function contour(K, sr, win, hop) { const out = [], W = Math.round(win * sr); for (let t = 0; (t * sr) + W <= K[0].length; t += hop) out.push([r2(t + win / 2), r1(lufs(msum(K, Math.round(t * sr), Math.round(t * sr) + W)))]); return out; }
// True peak (BS.1770-4 Annex 2 idea): 4× oversampling by windowed-sinc interpolation, evaluated only next to samples
// above half the sample peak (an inter-sample peak cannot exceed the sample peak by more than that elsewhere).
function truePeak(buf) { // truePeak = 4× (BS.1770-4 Annex 2 phases 1/4, 2/4, 3/4); truePeak8x = phases k/8 (finer)
  const K = 16, PH = [1, 2, 3, 4, 5, 6, 7].map(q => q / 8), ker = PH.map(ph => { const h = []; for (let k = -K + 1; k <= K; k++) { const x = ph - k, w = 0.5 + 0.5 * Math.cos(Math.PI * x / K); h.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w); } return h; });
  let tp4 = 0, tp8 = 0, sp = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) { const x = buf.getChannelData(c); for (let i = 0; i < x.length; i++) sp = Math.max(sp, Math.abs(x[i])); }
  const thr = sp * 0.5;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const x = buf.getChannelData(c), n = x.length;
    for (let i = K; i < n - K - 1; i++) {
      if (Math.abs(x[i]) < thr && Math.abs(x[i + 1]) < thr) continue;
      ker.forEach((h, q) => { let s = 0; for (let k = -K + 1, j = 0; k <= K; k++, j++) s += x[i + k] * h[j]; const a = Math.abs(s); if (a > tp8) tp8 = a; if (q % 2 === 1 && a > tp4) tp4 = a; });
    }
  }
  return { samplePeak: r2(dB(sp)), truePeak: r2(dB(Math.max(tp4, sp))), truePeak8x: r2(dB(Math.max(tp8, sp))) };
}
// isolated discontinuities: |2nd difference| ≫ its local RMS (5 ms window)
function clicks(x, sr, t0, t1) {
  const i0 = Math.floor((t0 || 0) * sr) + 2, i1 = Math.min(x.length, Math.floor((t1 == null ? x.length / sr : t1) * sr)), W = Math.round(sr * 0.005), n = i1 - i0;
  if (n <= 2 * W) return [];
  const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = x[i0 + i] - 2 * x[i0 + i - 1] + x[i0 + i - 2];
  const c2 = new Float64Array(n + 1); for (let i = 0; i < n; i++) c2[i + 1] = c2[i] + y[i] * y[i];
  const hits = [];
  for (let i = W; i < n - W; i++) {
    const a = Math.abs(y[i]); if (a < 0.004) continue;
    const loc = Math.sqrt(Math.max(0, c2[i + W] - c2[i - W] - a * a) / (2 * W - 1));
    if (a > 14 * loc + 1e-4) { hits.push(r3((i0 + i) / sr)); i += W; }
  }
  return hits;
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
const PCN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function chroma(buf, t0, t1, fmin, fmax) { // pitch-class energy (FFT 16384, bins fmin..fmax → nearest semitone, tent-weighted)
  const sr = buf.sampleRate, N = 16384, hop = 4096, L = buf.getChannelData(0), R = buf.getChannelData(1), win = new Float32Array(N), out = new Float64Array(12);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const re = new Float64Array(N), im = new Float64Array(N), lo = Math.ceil((fmin || 60) * N / sr), hi = Math.floor((fmax || 2100) * N / sr);
  for (let s = Math.floor(t0 * sr); s + N <= Math.floor(t1 * sr); s += hop) {
    for (let i = 0; i < N; i++) { re[i] = (L[s + i] + R[s + i]) * 0.5 * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = lo; k <= hi; k++) { const p = re[k] * re[k] + im[k] * im[k], m = 69 + 12 * Math.log2(k * sr / N / 440), rm = Math.round(m), w = 1 - 2 * Math.abs(m - rm); out[((rm % 12) + 12) % 12] += p * Math.max(0, w); }
  }
  const mx = Math.max(...out) || 1;
  return Array.from(out).map((v, i) => [PCN[i], r2(v / mx)]).sort((a, b) => b[1] - a[1]);
}
const secOf = id => HT.timeline.find(s => s.id === id);
function toBufferLike(L, R, sr) { return { sampleRate: sr, length: L.length, numberOfChannels: 2, duration: L.length / sr, getChannelData: c => (c ? R : L) }; }

// ------------------------------------------------------------------ 1. catalog + per-SFX analysis
async function sfxTable() {
  const rows = [], problems = [], names = Object.keys(A.SFX);
  const missing = CAT_NAMES.filter(n => !A.SFX[n]), extra = names.filter(n => !CAT_NAMES.includes(n));
  for (const n of CAT_NAMES) {
    if (!A.SFX[n]) { rows.push({ name: n, flag: 'MISSING' }); continue; }
    const S = A.SFX[n], Dd = D.SFX_DEF[n], q = AU.normP({});
    const pre = AU.sfxPre(Dd, q), len = AU.sfxLen(Dd, q), voiceEnd = 0.02 + pre + len + AU.sfxTail(Dd);
    const b = await D.renderSfx(n, {}, { sampleRate: SR, dry: true, revTail: 1.0 });
    const st = stats(b, 0, b.duration), act = stats(b, 0.02, 0.02 + pre + len);
    // audible length: last time the signal exceeds −70 dBFS
    const x0 = b.getChannelData(0), x1 = b.getChannelData(1); let last = 0;
    for (let i = x0.length - 1; i >= 0; i--) if (Math.abs(x0[i]) > 3.16e-4 || Math.abs(x1[i]) > 3.16e-4) { last = i / SR; break; }
    const over = stats(b, voiceEnd + 0.005, b.duration); // after the voice ends nothing may sound (dry render)
    // parameter support: pitch, pan, dur
    const bp = await D.renderSfx(n, { pitch: 1.5 }, { sampleRate: SR, dry: true, revTail: 0.5 }), sp = stats(bp, 0, bp.duration);
    const bl = await D.renderSfx(n, { pan: -1 }, { sampleRate: SR, dry: true, revTail: 0.5 });
    let eL = 0, eR = 0; { const l = bl.getChannelData(0), r = bl.getChannelData(1); for (let i = 0; i < l.length; i++) { eL += l[i] * l[i]; eR += r[i] * r[i]; } }
    let durOk = '—';
    if (Dd.var || Dd.preDur) { const bd = await D.renderSfx(n, { dur: 2.5 }, { sampleRate: SR, dry: true, revTail: 0.3 }), sd = stats(bd, 0, bd.duration); durOk = sd.nan ? 'NaN' : r2(bd.duration) + 's'; }
    const flags = [];
    if (st.nan || sp.nan) flags.push('NaN');
    if (st.peak < -50) flags.push('SILENT');
    if (st.peak > -0.5) flags.push('HOT');
    if (over.peak > -80) flags.push('OVERRUN ' + over.peak);
    if (eR > 0 && dB(Math.sqrt(eL / (eR + 1e-20))) < 10) flags.push('PAN?');
    const row = { name: n, len: r2(len), pre: r2(pre), peak: st.peak, rms: act.rms, audible: r2(last - 0.02), duck: S.duck ? S.duck.join('/') : '-', pitch15: sp.peak, panL_dB: r1(dB(Math.sqrt(eL / (eR + 1e-20)))), dur: durOk, flag: flags.join(' ') };
    rows.push(row);
    if (flags.length) problems.push(n + ': ' + flags.join(' '));
  }
  return { catalog: CAT_NAMES.length, implemented: CAT_NAMES.length - missing.length, missing, extra, problems, rows };
}
const fmtRows = (rows, cols) => rows.map(r => cols.map(([k, w]) => String(r[k] == null ? '' : r[k]).padEnd(w)).join(' ')).join('\n');

// ------------------------------------------------------------------ 2. instruments: level, declared ring vs audible end
const INST_TESTS = [
  ['koto', 'A4', 1, { let: 1 }], ['koto', 'D6', 0.5, {}], ['koto', 'A4', 1, { let: 1, bend: 1 }], ['shamisen', 'D4', 1, { let: 1 }], ['shamisen', 'A4', 0.5, {}],
  ['shaku', 'A4', 3, { meri: 1, vib: 16 }], ['shaku', 'D5', 1, { muraiki: 1 }], ['taiko', 0, 0.5, {}], ['taiko', 0, 0.5, { kind: 'do' }], ['taiko', 0, 0.5, { kind: 'ka' }],
  ['shime', 0, 0.25, {}], ['shime', 0, 0.25, { kind: 'ka' }], ['bonsho', 'D2', 4, { t60: 28 }], ['glass', 'A5', 1, {}], ['glass', 'D6', 0.5, { arp: 1 }],
  ['dbass', 'D2', 0.5, { drive: 1 }], ['dbass', 'D2', 0.5, {}], ['dbass', 'A1', 2, {}], ['strings', 'D3', 3, {}], ['strings', 'D4', 2, { trem: 13, pont: 1 }], ['strings', 'D3', 0.25, { sfz: 1 }],
  ['strings', 'D3', 2, { cluster: [1, 2] }], ['fmkeys', 'D4', 2, {}], ['fmkeys', 'D6', 1, {}], ['clunk', 'D3', 1, {}], ['hyoshigi', 0, 0.25, { double: 1 }],
  ['tamtam', 0, 1, {}], ['subdrop', 'D1', 1, {}], ['bell', 'A5', 1, {}], ['mbox', 'D5', 1, {}], ['pluck', 'D4', 1, {}], ['pizz', 'D4', 0.5, {}], ['pad', 'D4', 2, {}],
  ['bass', 'D2', 1, {}], ['kick', 0, 0.25, {}], ['snare', 0, 0.25, {}], ['hat', 0, 0.25, { open: 1 }], ['wood', 'D6', 0.25, {}], ['tom', 'D3', 0.25, {}],
  ['crash', 0, 1, {}], ['revcym', 0, 2, {}], ['riser', 'D3', 2, { tone: 1 }], ['sub', 'D2', 2, {}], ['boom', 0, 1, {}],
  ['tone', 'A5', 6.4, { att: 1.6, rel: 0.05, beat0: 0.15, beat1: 3.2 }]];
async function instTable() {
  const rows = [], problems = [];
  for (const [i, n, beats, o] of INST_TESTS) {
    const m = typeof n === 'string' ? AU.nm(n) : n, d = beats * AU.BEAT, ring = AU.ringOf(i, m, d, o);
    const b = await D.renderNote(i, m, d, 1, o, { sampleRate: SR, extra: 0.6 });
    const st = stats(b, 0, b.duration), x0 = b.getChannelData(0), x1 = b.getChannelData(1);
    let last = 0; for (let k = x0.length - 1; k >= 0; k--) if (Math.abs(x0[k]) > 3.16e-5 || Math.abs(x1[k]) > 3.16e-5) { last = k / SR; break; }
    const audible = last - 0.02, declared = d + ring, ok = audible <= declared + 0.005;
    // click detector on sustained tones only (a driven sawtooth's saturated plateau + reset edge is a waveform feature)
    const clt = ['glass', 'strings', 'fmkeys', 'shaku', 'bonsho', 'dbass', 'pad', 'sub', 'tone'].includes(i) && !o.drive ? clicks(x0, SR, 0.03) : null, cl = clt ? clt.length : '-';
    rows.push({ inst: i + (Object.keys(o).length ? ' ' + JSON.stringify(o).replace(/"/g, '') : ''), note: n, d: r2(d), peak: st.peak, rms: st.rms, audible: r2(audible), declared: r2(declared), res: AU.resOf(i, o) ? 'yes' : 'no', clicks: cl, ok: ok ? 'ok' : 'RING TOO SHORT' });
    if (!ok) problems.push(i + ' ' + n + ': audible ' + r2(audible) + ' s > declared ' + r2(declared) + ' s');
    if (st.nan) problems.push(i + ': NaN');
    if (typeof cl === 'number' && cl) problems.push(i + ' ' + n + ': ' + cl + ' click(s) at ' + clt.slice(0, 3).map(t => r3(t - 0.02) + 's').join(', ') + ' (note starts at 0, ends at ' + r2(d) + ')');
  }
  return { problems, rows };
}

// ------------------------------------------------------------------ 3. beds: level vs table, loop seam, crossfade bump
function bedTable() {
  const rows = [], problems = [];
  for (const n of CAT_BEDS) {
    if (!(AU.BED && AU.BED[n])) { rows.push({ bed: n, flag: 'MISSING' }); problems.push(n + ' missing'); continue; }
    const t0 = performance.now(), b = D.bed(n, SR), ms = performance.now() - t0, st = stats(b, 0, b.duration), sr = b.sampleRate;
    let worst = 0, typ = 0;
    for (let c = 0; c < 2; c++) {
      const x = b.getChannelData(c), L = x.length, loc = [];
      for (let i = L - 200; i < L - 1; i++) loc.push(Math.abs(x[i + 1] - x[i])); for (let i = 0; i < 200; i++) loc.push(Math.abs(x[i + 1] - x[i]));
      loc.sort((p, q) => p - q); typ = Math.max(typ, loc[Math.floor(loc.length * 0.99)]); worst = Math.max(worst, Math.abs(x[0] - x[L - 1]));
    }
    // crossfade region (first 1.2 s) vs the spread of every other 1.2 s window (event beds are naturally uneven)
    const head = stats(b, 0, 1.2).rms, wins = []; for (let t = 1.2; t + 1.2 <= b.duration; t += 1.2) wins.push(stats(b, t, t + 1.2).rms);
    const lo = Math.min(...wins), hi = Math.max(...wins), body = stats(b, 1.2, b.duration).rms;
    const flags = [];
    if (Math.abs(st.rms - AU.BED[n][1]) > 0.3) flags.push('LEVEL');
    if (worst > typ * 1.5) flags.push('SEAM');
    if (head < lo - 1 || head > hi + 1) flags.push('XFADE ' + r1(head - body) + ' dB');
    if (st.nan) flags.push('NaN');
    rows.push({ bed: n, loop: r2(b.duration), sr, target: AU.BED[n][1], rms: st.rms, peak: st.peak, seamStep: worst.toExponential(1), p99: typ.toExponential(1), xfadeDiff: r1(head - body), winRange: r1(lo - body) + '..' + r1(hi - body), ms: Math.round(ms), flag: flags.join(' ') });
    if (flags.length) problems.push(n + ': ' + flags.join(' '));
  }
  return { problems, rows };
}

// ------------------------------------------------------------------ 4. full soundtrack of the lab timeline
async function fullMix() {
  const t0 = performance.now(), buf = await A.renderOffline({ sampleRate: SR }), renderMs = performance.now() - t0;
  window.__mix = buf;
  const K = kweight(buf), tl = HT.timeline, dur = buf.duration;
  const res = { seconds: r3(dur), renderMs: Math.round(renderMs), realtimeX: r1(dur / (renderMs / 1000)) };
  res.global = stats(buf, 0, dur);
  Object.assign(res.global, truePeak(buf));
  res.integratedLUFS = integrated(K, SR);
  res.scenes = tl.map(s => ({ id: s.id, lufs: integrated(K, SR, s.start, s.start + s.dur), stMax: shortTermMax(K, SR, s.start, s.start + s.dur), peak: stats(buf, s.start, s.start + s.dur).peak }));
  const t1 = performance.now(), mus = await A.renderOffline({ sampleRate: SR, sfx: false, amb: false }), Km = kweight(mus);
  res.musicRenderMs = Math.round(performance.now() - t1);
  res.cues = (AU.MUSIC.composed || []).map(c => ({ id: c.id, start: c.start, dur: c.dur, events: c.events, musicLUFS: integrated(Km, SR, c.start, c.start + c.dur), musicPeak: stats(mus, c.start, c.start + c.dur).peak }));
  res.skippedCues = AU.MUSIC.skipped.slice();
  res.musicClicks = clicks(mus.getChannelData(0), SR, 0.05).length;
  res.shortTerm = contour(K, SR, 3, 2).map(([t, l]) => t + ':' + l).join(' ');
  window.__K = K; window.__mus = mus;
  return res;
}

// ------------------------------------------------------------------ 5. seam test: chunked vs continuous
async function seamTest(o) {
  o = o || {};
  const total = HT.duration, chunk = o.chunk || 20;
  const full = window.__mix && window.__mix.duration >= total - 0.01 ? window.__mix : (window.__mix = await A.renderOffline({ sampleRate: SR }));
  const cmp = (C, from, label) => {
    const F = Math.round(from * SR), n = C.L.length, a = [full.getChannelData(0), full.getChannelData(1)], b = [C.L, C.R];
    let md = 0, mdAt = 0, pk = 0;
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) { const d = Math.abs(a[c][F + i] - b[c][i]); if (d > md) { md = d; mdAt = (F + i) / SR; } pk = Math.max(pk, Math.abs(a[c][F + i])); }
    // discontinuity at sample s of x: |2nd difference| there vs its ±5 ms neighbourhood p99, and its absolute size
    const jump = (x, s, n0) => {
      const loc = [];
      for (let i = s - 240; i < s + 240; i++) if (i > 1 && i < n0 && Math.abs(i - s) > 2) loc.push(Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]));
      loc.sort((p, q) => p - q);
      const at = Math.max(Math.abs(x[s] - 2 * x[s - 1] + x[s - 2]), Math.abs(x[s + 1] - 2 * x[s] + x[s - 1]));
      return { ratio: at / (loc[Math.floor(loc.length * 0.99)] || 1e-9), abs: at };
    };
    const seams = C.chunks.slice(1).map(ch => {
      const s = Math.round(ch.t0 * SR) - F, W = Math.round(0.05 * SR); let m = 0, disc = 0, ref = 0, absJ = 0;
      for (let c = 0; c < 2; c++) {
        for (let i = Math.max(0, s - W); i < Math.min(n, s + W); i++) m = Math.max(m, Math.abs(a[c][F + i] - b[c][i]));
        const jc = jump(b[c], s, n), jr = jump(a[c], F + s, a[c].length);
        disc = Math.max(disc, jc.ratio); ref = Math.max(ref, jr.ratio); absJ = Math.max(absJ, jc.abs);
      }
      // a seam defect = a jump in the chunked output that the continuous render does not have (ratio clearly above the
      // continuous render's at the same sample) AND that is not negligible in absolute terms (> −110 dBFS); a large ratio
      // in near-silence where both renders agree to < −110 dBFS is the signal itself, not the seam
      const bad = disc >= 1.5 && disc > 1.5 * ref + 0.2 && absJ > 3e-6;
      return { seam: r3(ch.t0), preroll: r2(ch.preroll), maxDiff_dBFS: r1(dB(m)), jumpVsLocalP99: r2(disc), continuousRatio: r2(ref), jumpAbs_dBFS: r1(dB(absJ)), bad };
    });
    return { label, from, to: r2(from + n / SR), chunks: C.chunks.length, chunkedMs: C.ms, maxAbsDiff: +md.toExponential(2), maxDiff_dBFS: r1(dB(md)), at: r3(mdAt), signalPeak_dBFS: r1(dB(pk)), seams };
  };
  const out = { continuousRenderMs: null };
  const tc = performance.now(); await A.renderOffline({ sampleRate: SR, to: Math.min(40, total) }); out.continuous40sMs = Math.round(performance.now() - tc);
  out.runs = [];
  for (const ch of (o.chunks || [chunk])) { // o.chunks: several chunk sizes (60 = tools/export.js), each over the whole timeline
    const C1 = await A.renderChunked({ sampleRate: SR, from: 0, to: total, chunk: ch });
    out.runs.push(cmp(C1, 0, 'renderChunked(0→' + total + ', chunk ' + ch + ')'));
  }
  out.full = out.runs[0];
  const off = o.offset || [35, 75, 15]; // [from, to, chunk]: a render that starts mid-film (resumed voices, chunk pre-rolls)
  const C2 = await A.renderChunked({ sampleRate: SR, from: off[0], to: off[1], chunk: off[2] });
  out.offset = cmp(C2, off[0], 'renderChunked(' + off[0] + '→' + off[1] + ', chunk ' + off[2] + ') vs the continuous render sliced');
  out.pass = [...out.runs, out.offset].every(r => r.maxDiff_dBFS <= -80 && r.seams.every(s => !s.bad));
  return out;
}

// ------------------------------------------------------------------ 6. fight-test cue spot checks (note lists + audio)
async function fightSpot() {
  const s = secOf('fighttest'), ev = D.buildEvents({ sfx: false, amb: false }).filter(e => e.k === 'n' && e.cue === 'm0.fighttest');
  const hitCue = s.cues.find(c => c.sfx === 'hitHuge' || c.sfx === 'blackFlash'), hitT = hitCue ? hitCue.t : 22.0, silT = Math.max(10, hitT - 2);
  const sections = [['dawn 0–4 s', 0, 4], ['sukuna 4–8 s', 4, 8], ['exchange 8 s–silence', 8, silT], ['silence', silT, hitT], ['aftermath', hitT, s.dur]];
  const PITCHED = new Set(['glass', 'koto', 'strings', 'dbass', 'shaku', 'fmkeys', 'bonsho', 'clunk', 'shamisen', 'bell', 'mbox']);
  const pcs = (list) => { const h = {}; list.forEach(e => { const p = PCN[((e.m % 12) + 12) % 12]; h[p] = (h[p] || 0) + 1; }); return Object.entries(h).sort((a, b) => b[1] - a[1]).map(([p, c]) => p + ':' + c).join(' '); };
  const notesIn = (t0, t1, insts) => ev.filter(e => e.t - s.start >= t0 - 1e-6 && e.t - s.start < t1 - 1e-6 && (!insts || insts.includes(e.i)) && PITCHED.has(e.i));
  const out = { hitAt: hitT, silenceFrom: silT, sections: sections.map(([name, a, b]) => ({ name, notes: notesIn(a, b).length, pitchClasses: pcs(notesIn(a, b)), byInst: [...new Set(notesIn(a, b).map(e => e.i))].join(',') })) };
  // mode checks on the thematic lines: Gojo lines (glass) must be D Lydian; Sukuna lines (strings/dbass motif) D Phrygian
  const LYD = new Set([2, 4, 6, 8, 9, 11, 1]), PHR = new Set([2, 3, 5, 7, 9, 10, 0]), TR = 18; // from 18 s the stretto restates both heads a 4th up (G Lydian / G Phrygian, by design)
  const glassOut = ev.filter(e => e.i === 'glass' && e.t - s.start < Math.min(silT, TR) && !LYD.has(((e.m % 12) + 12) % 12) && !(e.o && e.o.arp));
  const sukOut = ev.filter(e => e.i === 'strings' && e.t - s.start >= 4 && e.t - s.start < Math.min(silT, TR) && e.d < 3 && !(e.o && (e.o.sfz || e.o.trem)) && !PHR.has(((e.m % 12) + 12) % 12));
  const G_LYD = new Set([7, 9, 11, 1, 2, 4, 6]), G_PHR = new Set([7, 8, 10, 0, 2, 3, 5]);
  out.strettoTransposed = { glassNotes: ev.filter(e => e.i === 'glass' && e.t - s.start >= TR && e.t - s.start < silT).length, glassOutsideGLydian: ev.filter(e => e.i === 'glass' && e.t - s.start >= TR && e.t - s.start < silT && !G_LYD.has(e.m % 12)).length,
    stringsOutsideGPhrygian: ev.filter(e => e.i === 'strings' && e.t - s.start >= TR + 0.5 && e.t - s.start < silT && e.d < 3 && !(e.o && (e.o.sfz || e.o.trem)) && !G_PHR.has(e.m % 12)).length };
  out.gojoLinesOutsideLydian = glassOut.map(e => r2(e.t - s.start) + 's ' + PCN[e.m % 12]).slice(0, 12);
  out.sukunaLinesOutsidePhrygian = sukOut.map(e => r2(e.t - s.start) + 's ' + PCN[e.m % 12]).slice(0, 12);
  // audio: music-only dry renders of the dawn and Sukuna sections → chroma (pitch-class energy)
  const dawn = await A.renderOffline({ sampleRate: SR, from: s.start, to: s.start + 4, sfx: false, amb: false, dry: true });
  const suk = await A.renderOffline({ sampleRate: SR, from: s.start + 4, to: s.start + 8, sfx: false, amb: false, dry: true, stems: ['strings', 'dbass'] });
  out.chromaDawn = chroma(dawn, 0.1, 4, 250, 2100).slice(0, 7).map(x => x.join(' ')).join(' | ');
  out.chromaSukunaLow = chroma(suk, 0.1, 4, 60, 700).slice(0, 7).map(x => x.join(' ')).join(' | ');
  // the silence and the fade, measured on the music bus alone
  const mus = window.__mus || await A.renderOffline({ sampleRate: SR, sfx: false, amb: false });
  out.musicRMS = { before: stats(mus, s.start + silT - 1.5, s.start + silT - 0.05).rms, silence: stats(mus, s.start + silT + 0.05, s.start + hitT - 0.05).rms, hit: stats(mus, s.start + hitT, s.start + hitT + 1.5).rms, last0_5s: stats(mus, s.start + s.dur - 0.5, s.start + s.dur).rms };
  // stem balance of the exchange (music strips alone, raw, dry): RMS dBFS per instrument group
  out.stemsLUFS = {};
  for (const [a, b2, lab] of [[0, 4, 'dawn'], [4, 8, 'sukuna'], [8, silT, 'exchange'], [hitT, s.dur, 'aftermath']]) {
    const row = {};
    for (const st of ['glass', 'strings', 'dbass', 'koto', 'taiko', 'shime', 'clunk', 'bonsho', 'fx']) {
      const b = await A.renderOffline({ sampleRate: SR, from: s.start + a, to: s.start + b2, sfx: false, amb: false, raw: true, dry: true, stems: [st] });
      const l = integrated(kweight(b), SR); if (l > -70) row[st] = l;
    }
    out.stemsLUFS[lab] = Object.entries(row).map(([k, v]) => k + ' ' + v).join(', ');
  }
  // ducking: music with vs without the duck automation around the scene's loud hits
  const nod = await A.renderOffline({ sampleRate: SR, from: s.start, to: s.start + s.dur, sfx: false, amb: false, noDuck: true, raw: true });
  const dk = await A.renderOffline({ sampleRate: SR, from: s.start, to: s.start + s.dur, sfx: false, amb: false, raw: true });
  out.ducking = s.cues.filter(c => ['hitH', 'hitM', 'infinityStop', 'hitHuge', 'blackFlash'].includes(c.sfx) && (c.vol == null || c.vol > 0.15)).slice(0, 8).map(c => {
    const a = stats(dk, c.t + 0.03, c.t + 0.25).rms, b = stats(nod, c.t + 0.03, c.t + 0.25).rms; return c.sfx + '@' + r2(c.t) + ' −' + r1(b - a) + ' dB';
  }).join(', ');
  return out;
}

// ------------------------------------------------------------------ 6b. signature spot checks (does each sound have its designed character?)
function mono(buf) { const l = buf.getChannelData(0), r = buf.getChannelData(1), x = new Float32Array(l.length); for (let i = 0; i < l.length; i++) x[i] = (l[i] + r[i]) * 0.5; return x; }
function spectrum(x, sr, t, N) { // magnitude spectrum (Hann) of N samples centred at t
  N = N || 8192; const re = new Float64Array(N), im = new Float64Array(N), c = Math.floor(t * sr) - N / 2;
  for (let i = 0; i < N; i++) { const j = c + i, w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)); re[i] = (j >= 0 && j < x.length ? x[j] : 0) * w; }
  fft(re, im); const m = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) m[k] = Math.hypot(re[k], im[k]); return m;
}
function peaks(x, sr, t, fmin, fmax, k, N) { // top-k spectral peaks (parabolic interpolation), [[Hz, dB rel. max]]
  N = N || 8192; const m = spectrum(x, sr, t, N), bw = sr / N, lo = Math.max(2, Math.floor(fmin / bw)), hi = Math.min(N / 2 - 2, Math.ceil(fmax / bw)), out = [];
  for (let i = lo; i <= hi; i++) if (m[i] > m[i - 1] && m[i] >= m[i + 1]) { const a = Math.log(m[i - 1] + 1e-12), b = Math.log(m[i] + 1e-12), c = Math.log(m[i + 1] + 1e-12), d = 0.5 * (a - c) / ((a - 2 * b + c) || 1e-9); out.push([(i + d) * bw, m[i]]); }
  out.sort((p, q) => q[1] - p[1]); const mx = out.length ? out[0][1] : 1;
  return out.slice(0, k).map(([f, v]) => [Math.round(f), r1(dB(v / mx))]);
}
function bandFrac(x, sr, t0, t1, edges) { // share of energy (%) per band over [t0, t1] (frames of 2048)
  const N = 2048, sums = new Array(edges.length + 1).fill(0), bw = sr / N;
  for (let t = t0 + N / 2 / sr; t <= Math.max(t0 + N / 2 / sr, t1 - N / 2 / sr) + 1e-9; t += N / 4 / sr) {
    const m = spectrum(x, sr, t, N);
    for (let k = 1; k < N / 2; k++) { const f = k * bw; let b = 0; while (b < edges.length && f >= edges[b]) b++; sums[b] += m[k] * m[k]; }
  }
  const tot = sums.reduce((a, b) => a + b, 0) || 1; return sums.map(v => Math.round(100 * v / tot));
}
function yinAt(x, sr, t, fmin, fmax) {
  const tauMin = Math.floor(sr / fmax), tauMax = Math.ceil(sr / fmin), W = Math.round(sr * 0.03), i0 = Math.floor(t * sr);
  if (i0 < 0 || i0 + W + tauMax + 2 > x.length) return null;
  const cm = new Float64Array(tauMax + 2); let run = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) { let s = 0; for (let j = 0; j < W; j++) { const q = x[i0 + j] - x[i0 + j + tau]; s += q * q; } run += s; cm[tau] = s * tau / (run || 1); }
  let best = -1; for (let tau = tauMin; tau <= tauMax; tau++) if (cm[tau] < 0.2) { while (tau + 1 <= tauMax && cm[tau + 1] < cm[tau]) tau++; best = tau; break; }
  if (best < 0) return null; const a = cm[best - 1], b = cm[best], e = cm[best + 1], den = a - 2 * b + e;
  return r1(sr / (best + (den ? 0.5 * (a - e) / den : 0)));
}
function BPF(f, q, sr) { const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al; this.b0 = al / a0; this.b2 = -al / a0; this.a1 = -2 * Math.cos(w) / a0; this.a2 = (1 - al) / a0; this.x1 = this.x2 = this.y1 = this.y2 = 0; }
BPF.prototype.run = function (x) { const y = this.b0 * x + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; };
function envMod(x, sr, f, q, t0, t1, fmax) { // band-pass at f, RMS envelope (400 Hz), strongest modulation frequency < fmax
  const bq = new BPF(f, q, sr), e = [], hop = Math.round(sr / 400); let acc = 0, n = 0;
  for (let i = Math.floor(t0 * sr); i < Math.floor(t1 * sr); i++) { const y = bq.run(x[i]); acc += y * y; if (++n === hop) { e.push(Math.sqrt(acc / n)); acc = 0; n = 0; } }
  let N = 1; while (N < e.length) N <<= 1; N <<= 2;
  const re = new Float64Array(N), im = new Float64Array(N), mean = e.reduce((a, b) => a + b, 0) / Math.max(1, e.length);
  for (let i = 0; i < e.length; i++) re[i] = (e[i] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.max(1, e.length - 1)));
  fft(re, im);
  let bi = 1, bv = 0; for (let k = 1; k < N / 2; k++) { const fr = k * 400 / N; if (fr > fmax) break; const v = Math.hypot(re[k], im[k]); if (v > bv) { bv = v; bi = k; } }
  return r2(bi * 400 / N);
}
function logEnvMod(x, sr, f, q, t0, t1, fmax) { // modulation of a decaying partial: band-pass, log envelope, linear detrend
  const bq = new BPF(f, q, sr), e = [], hop = Math.round(sr / 200); let acc = 0, n = 0;
  for (let i = Math.floor(t0 * sr); i < Math.floor(t1 * sr); i++) { const y = bq.run(x[i]); acc += y * y; if (++n === hop) { e.push(10 * Math.log10(acc / n + 1e-30)); acc = 0; n = 0; } }
  const m = e.length, xm = (m - 1) / 2, ym = e.reduce((a, b) => a + b, 0) / m; let sxy = 0, sxx = 0;
  for (let i = 0; i < m; i++) { sxy += (i - xm) * (e[i] - ym); sxx += (i - xm) * (i - xm); }
  const sl = sxy / (sxx || 1); let N = 1; while (N < m) N <<= 1; N <<= 3;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < m; i++) re[i] = (e[i] - ym - sl * (i - xm)) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (m - 1)));
  fft(re, im); let bi = 1, bv = 0; for (let k = 1; k < N / 2; k++) { const fr = k * 200 / N; if (fr > fmax) break; const v = Math.hypot(re[k], im[k]); if (v > bv) { bv = v; bi = k; } }
  return { beat_Hz: r2(bi * 200 / N), decay_dB_per_s: r2(sl * 200) };
}
function vibratoRate(x, sr, t0, t1, fmin, fmax) { // f0 track (YIN every 10 ms) → detrended → strongest rate
  const tr = []; for (let t = t0; t < t1; t += 0.01) { const f = yinAt(x, sr, t, fmin, fmax); if (f) tr.push(f); }
  const m = tr.length, mean = tr.reduce((a, b) => a + b, 0) / Math.max(1, m); let N = 1; while (N < m) N <<= 1; N <<= 3;
  const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < m; i++) re[i] = (tr[i] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (m - 1)));
  fft(re, im); let bi = 1, bv = 0; for (let k = 1; k < N / 2; k++) { const fr = k * 100 / N; if (fr > 12) break; const v = Math.hypot(re[k], im[k]); if (v > bv) { bv = v; bi = k; } }
  const hi = Math.max(...tr), lo = Math.min(...tr);
  return { rate_Hz: r2(bi * 100 / N), depth_cents_peak_to_peak: r1(1200 * Math.log2(hi / lo)), frames: m };
}
function bandFracN(x, sr, t0, t1, edges, N) { // like bandFrac with a short frame for transients
  const sums = new Array(edges.length + 1).fill(0), bw = sr / N;
  for (let t = t0 + N / 2 / sr; t <= Math.max(t0 + N / 2 / sr, t1 - N / 2 / sr) + 1e-9; t += N / 4 / sr) {
    const m = spectrum(x, sr, t, N); for (let k = 1; k < N / 2; k++) { const f = k * bw; let b = 0; while (b < edges.length && f >= edges[b]) b++; sums[b] += m[k] * m[k]; }
  }
  const tot = sums.reduce((a, b) => a + b, 0) || 1; return sums.map(v => Math.round(100 * v / tot));
}
function rmsEnv(x, sr, t0, t1, win) { const out = []; for (let t = t0; t < t1 - 1e-9; t += win) { let s = 0, n = 0; for (let i = Math.floor(t * sr); i < Math.floor((t + win) * sr) && i < x.length; i++) { s += x[i] * x[i]; n++; } out.push(r1(dB(Math.sqrt(s / Math.max(1, n))))); } return out; }
async function sfxSpot() {
  const O = { sampleRate: SR, dry: true, revTail: 0.5 }, R = {};
  let x;
  x = mono(await D.renderSfx('infinityStop', {}, O));
  R.infinityStop = { share_below500Hz_first80ms_pct: bandFrac(x, SR, 0.02, 0.1, [500])[0], share_above3kHz_first80ms_pct: bandFrac(x, SR, 0.02, 0.1, [3000])[1], ringPeaks_at0p6s: peaks(x, SR, 0.62, 1500, 6000, 3, 16384) };
  x = mono(await D.renderSfx('blueImplode', {}, O));
  R.blueImplode = { rms_per100ms_preroll_then_hit: rmsEnv(x, SR, 0.02, 0.92, 0.1).join(' '), share_below200Hz_at_thump_pct: bandFrac(x, SR, 0.64, 0.95, [200])[0] };
  x = mono(await D.renderSfx('purpleCharge', { dur: 3 }, O));
  R.purpleCharge = { peaks_at0p75s: peaks(x, SR, 0.77, 80, 3000, 3, 16384), peaks_at2p5s: peaks(x, SR, 2.52, 80, 3000, 3, 16384), peaks_at2p95s: peaks(x, SR, 2.97, 80, 3000, 3, 16384), fusedPitch_at3p4s: peaks(x, SR, 3.42, 150, 500, 1, 16384), target_Hz: 293.66 };
  x = mono(await D.renderSfx('blackFlash', {}, O));
  R.blackFlash = { share_above3kHz_first6ms_pct: bandFracN(x, SR, 0.02, 0.026, [3000], 256)[1], bassDrop_f0: [0.15, 0.35, 0.6, 0.95].map(t => yinAt(x, SR, 0.02 + t, 18, 140)).join(' → ') + ' Hz' };
  x = mono(await D.renderSfx('crosswalkChirp', { dur: 3.4 }, O));
  R.crosswalkChirp = { chirpPeaks_start_end: peaks(x, SR, 0.025, 1000, 6000, 1, 1024).concat(peaks(x, SR, 0.1, 1000, 6000, 1, 1024)), repetition_Hz: envMod(x, SR, 2600, 0.7, 0.02, 3.4, 3), expected_Hz: r2(1 / 1.1) };
  x = mono(await D.renderSfx('crowCaw', {}, O));
  R.crowCaw = { f0_Hz: [0.08, 0.15, 0.22].map(t => yinAt(x, SR, 0.02 + t, 250, 900)).join(' '), strongest_harmonics: peaks(x, SR, 0.17, 300, 5000, 4, 8192), share_1to2p5kHz_pct: bandFrac(x, SR, 0.05, 0.28, [1000, 2500])[1], pulsing_Hz: envMod(x, SR, 2000, 1, 0.04, 0.28, 90) };
  x = mono(await D.renderSfx('slashSplit', {}, O));
  R.slashSplit = { rms_per100ms: rmsEnv(x, SR, 0.02, 1.92, 0.1).join(' '), share_below800Hz_ring_vs_grind_pct: bandFrac(x, SR, 0.02, 0.3, [800])[0] + ' vs ' + bandFrac(x, SR, 0.8, 1.6, [800])[0] };
  const N = async (i, m, d, v, o, extra) => mono(await D.renderNote(i, typeof m === 'string' ? AU.nm(m) : m, d, v, o || {}, { sampleRate: SR, extra: extra == null ? 0.3 : extra }));
  x = await N('taiko', 0, 0.5, 1, {});
  R.taiko = { f0_glide: [0.01, 0.03, 0.06, 0.15, 0.4].map(t => yinAt(x, SR, 0.02 + t, 35, 140)).join(' → ') + ' Hz (nominal 58)' };
  x = await N('bonsho', 'D2', 2, 1, { t60: 28 }, 0.5);
  const e1 = rmsEnv(x, SR, 1, 2, 1)[0], e10 = rmsEnv(x, SR, 10, 11, 1)[0], e20 = rmsEnv(x, SR, 20, 21, 1)[0];
  R.bonsho = { partials_at3s: peaks(x, SR, 3, 40, 1200, 6, 65536), fundamental_beat: logEnvMod(x, SR, 73.42, 60, 2, 22, 3), partial2p73_beat: logEnvMod(x, SR, 73.42 * 2.73, 50, 1, 9, 5), rms_1s_10s_20s: [e1, e10, e20].join(' '), designed: 'beats 0.55 Hz (fundamental) / 2.3 Hz (2.73 partial), T60 28 s' };
  const sh0 = await N('shamisen', 'A3', 0.5, 1, { let: 1, buzz: 0 }), sh = await N('shamisen', 'A3', 0.5, 1, { let: 1 });
  R.sawari = { share_above3kHz_pct_early_mid: 'no sawari ' + bandFrac(sh0, SR, 0.07, 0.27, [3000])[1] + ' / ' + bandFrac(sh0, SR, 0.42, 0.72, [3000])[1] + ' · sawari ' + bandFrac(sh, SR, 0.07, 0.27, [3000])[1] + ' / ' + bandFrac(sh, SR, 0.42, 0.72, [3000])[1],
    rms_early_late: 'no sawari ' + rmsEnv(sh0, SR, 0.07, 0.27, 0.2)[0] + ' / ' + rmsEnv(sh0, SR, 0.5, 0.9, 0.4)[0] + ' · sawari ' + rmsEnv(sh, SR, 0.07, 0.27, 0.2)[0] + ' / ' + rmsEnv(sh, SR, 0.5, 0.9, 0.4)[0] };
  x = await N('shaku', 'A4', 2, 0.8, { vib: 16 });
  R.shaku = { f0_Hz_at_0p25: yinAt(x, SR, 0.27, 200, 1000) + ' (A4 = 440)', vibrato: vibratoRate(x, SR, 0.95, 1.9, 300, 600), designed: '5.2 Hz, ±16 cents after 0.35–0.9 s' };
  const mix = window.__mix || await A.renderOffline({ sampleRate: SR }), c = secOf('labC'), t0 = c.start + 18.5 + 1.2;
  R.worldCutInMix = { rms_before_tone: stats(mix, c.start + 17, c.start + 18.4).rms, rms_during_cut: stats(mix, t0 + 0.05, t0 + 2.95).rms, rms_after_return: stats(mix, t0 + 4.2, t0 + 5).rms };
  return R;
}

// ------------------------------------------------------------------ 7. misc
async function determinism() {
  const a = await A.renderOffline({ sampleRate: SR, from: 5, to: 25 }), b = await A.renderOffline({ sampleRate: SR, from: 5, to: 25 });
  let md = 0; for (let c = 0; c < 2; c++) { const x = a.getChannelData(c), y = b.getChannelData(c); for (let i = 0; i < x.length; i++) md = Math.max(md, Math.abs(x[i] - y[i])); }
  return 'two renders of 5–25 s: max |diff| = ' + md;
}
function eventStats() {
  const ev = D.buildEvents({}), byInst = {}, pts = [];
  ev.forEach(e => { if (e.k === 'n') byInst[e.i] = (byInst[e.i] || 0) + 1; if (e.k === 'n' || e.k === 'x') { pts.push([e.t, 1]); pts.push([e.t + (e.len || 0), -1]); } });
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); let c = 0, m = 0, at = 0; pts.forEach(([t, d]) => { c += d; if (c > m) { m = c; at = t; } });
  return { total: ev.length, notes: ev.filter(e => e.k === 'n').length, sfx: ev.filter(e => e.k === 'x').length, ambSegments: ev.filter(e => e.k === 'a').length, automation: ev.filter(e => e.k === 'g').length, maxSimultaneousVoices: m, at: r2(at), byInst };
}
function audioBlockCheck() { // the lab loads index.html's script list; report the audio files and any load failure
  const audio = (window.__scripts || []).filter(x => x.startsWith('src/audio/'));
  const failed = __err.filter(e => e.startsWith('failed to load'));
  return audio.length + ' audio files from index.html (' + audio.map(x => x.slice(10)).join(', ') + ')' + (failed.length ? ' · LOAD FAILURES: ' + failed.join('; ') : '');
}

// ------------------------------------------------------------------ everything
async function runChecks() {
  const T0 = performance.now(), R = {};
  R.env = { sceneLoaded: !!(HT.SCENES && HT.SCENES.fighttest), fightCues: (secOf('fighttest').cues || []).map(c => (c.sfx || c.amb) + '@' + r2(c.t)).join(' '), timeline: HT.timeline.map(s => s.id + ' ' + s.start + '–' + (s.start + s.dur)).join(', '), audioFiles: audioBlockCheck(), seqErrors: D.SEQ_ERR.slice() };
  R.sfx = await sfxTable();
  R.inst = await instTable();
  R.beds = bedTable();
  R.mix = await fullMix();
  R.seams = await seamTest();
  R.fight = await fightSpot();
  R.spot = await sfxSpot();
  R.determinism = await determinism();
  R.events = eventStats();
  R.warnings = __warn.slice(); R.errors = __err.slice();
  R.summary = {
    sfx: R.sfx.implemented + '/' + R.sfx.catalog + ' catalog names, problems: ' + (R.sfx.problems.join(' | ') || 'none'),
    inst: 'problems: ' + (R.inst.problems.join(' | ') || 'none'), beds: 'problems: ' + (R.beds.problems.join(' | ') || 'none'),
    mix: 'peak ' + R.mix.global.peak + ' dBFS, true peak ' + R.mix.global.truePeak + ' dBTP, NaN ' + R.mix.global.nan + ', >−1 dBFS samples ' + R.mix.global.over + ', integrated ' + R.mix.integratedLUFS + ' LUFS, render ' + R.mix.realtimeX + '× realtime',
    seams: (R.seams.pass ? 'PASS' : 'FAIL') + ' full ' + R.seams.full.maxDiff_dBFS + ' dBFS, offset ' + R.seams.offset.maxDiff_dBFS + ' dBFS',
    totalSec: r1((performance.now() - T0) / 1000),
  };
  R.sfx.table = fmtRows(R.sfx.rows, [['name', 15], ['len', 5], ['pre', 5], ['peak', 7], ['rms', 7], ['audible', 7], ['duck', 7], ['pitch15', 7], ['panL_dB', 7], ['dur', 6], ['flag', 10]]); delete R.sfx.rows;
  R.inst.table = fmtRows(R.inst.rows, [['inst', 36], ['note', 4], ['d', 5], ['peak', 7], ['rms', 7], ['audible', 7], ['declared', 8], ['res', 4], ['clicks', 6], ['ok', 4]]); delete R.inst.rows;
  R.beds.table = fmtRows(R.beds.rows, [['bed', 10], ['loop', 5], ['sr', 6], ['target', 6], ['rms', 7], ['peak', 7], ['seamStep', 9], ['p99', 9], ['xfadeDiff', 5], ['winRange', 11], ['ms', 5], ['flag', 8]]); delete R.beds.rows;
  window.__report = R;
  return R;
}

// ------------------------------------------------------------------ act mode (?acts=I): checks on the film's own timeline
//   node tools/cdp.mjs --page "tools/audio-lab.html?acts=I" --eval "await actChecks()" --timeout 900000 --out <file>
// 1. every sfx / amb name the scenes use exists in the catalog; cue times inside their scene
function sceneCueNames() {
  const sfx = {}, amb = {}, problems = [];
  HT.timeline.forEach(s => {
    s.cues.forEach(c => {
      if (!c) return;
      if (c.sfx) (sfx[c.sfx] = sfx[c.sfx] || []).push(s.id + '@' + r2(c.t));
      if (c.amb) (amb[c.amb] = amb[c.amb] || []).push(s.id + '@' + r2(c.t));
      if (typeof c.t === 'number' && (c.t < 0 || c.t > s.dur)) problems.push(s.id + ': ' + (c.sfx || c.amb) + ' at ' + c.t + ' outside the scene');
    });
    s.ambience.forEach(a => { if (a && a.name) (amb[a.name] = amb[a.name] || []).push(s.id + ' (bed)'); });
  });
  const missingSfx = Object.keys(sfx).filter(n => !A.SFX[n]), missingAmb = Object.keys(amb).filter(n => !(AU.BED && AU.BED[n]));
  return { sfxNames: Object.keys(sfx).sort().join(' '), ambNames: Object.keys(amb).sort().join(' '), missingSfx, missingAmb, problems };
}
// 2. stem balance per scene: integrated loudness of music / SFX / beds alone and of the full mix (all mastered renders)
async function stemBalance() {
  const mix = window.__mix, mus = window.__mus || (window.__mus = await A.renderOffline({ sampleRate: SR, sfx: false, amb: false }));
  const sfx = await A.renderOffline({ sampleRate: SR, music: false, amb: false }), amb = await A.renderOffline({ sampleRate: SR, music: false, sfx: false });
  const K = { mix: window.__K || kweight(mix), mus: kweight(mus), sfx: kweight(sfx), amb: kweight(amb) };
  const momMax = (Kx, a, b) => { let m = -999, at = 0; const W = Math.round(0.4 * SR); for (let i = Math.floor(a * SR); i + W <= Math.floor(b * SR); i += Math.round(0.1 * SR)) { const l = lufs(msum(Kx, i, i + W)); if (l > m) { m = l; at = i / SR; } } return { lufs: r1(m), at: r2(at) }; };
  const rows = HT.timeline.map(s => { const a = s.start, b = s.start + s.dur, L = k => integrated(K[k], SR, a, b), mm = momMax(K.mix, a, b);
    return { scene: s.id, mix: L('mix'), music: L('mus'), sfx: L('sfx'), beds: L('amb'), stMaxMix: shortTermMax(K.mix, SR, a, b).lufs, stMaxMusic: shortTermMax(K.mus, SR, a, b).lufs, momMaxMix: mm.lufs, momAt: mm.at, peak: stats(mix, a, b).peak }; });
  const whole = { mix: integrated(K.mix, SR), music: integrated(K.mus, SR), sfx: integrated(K.sfx, SR), beds: integrated(K.amb, SR) };
  const musicPeak = shortTermMax(K.mus, SR, 0, HT.duration), mixPeak = shortTermMax(K.mix, SR, 0, HT.duration), mixMom = momMax(K.mix, 0, HT.duration);
  return { note: 'integrated LUFS per scene of each stem alone (a sparse stem reads as its loudness while active: blocks below −70 LUFS are gated out); stMax = 3 s short-term max, momMax = 400 ms momentary max',
    whole, musicShortTermMax: musicPeak, mixShortTermMax: mixPeak, mixMomentaryMax: mixMom,
    table: fmtRows(rows, [['scene', 13], ['mix', 7], ['music', 7], ['sfx', 7], ['beds', 7], ['stMaxMix', 9], ['stMaxMusic', 10], ['momMaxMix', 10], ['momAt', 8], ['peak', 7]]) };
}
// 3. ducking: the music (raw, no master) with vs without the duck automation, 60–300 ms after every ducking SFX cue
async function duckCheck() {
  const nod = await A.renderOffline({ sampleRate: SR, sfx: false, amb: false, noDuck: true, raw: true });
  const dk = await A.renderOffline({ sampleRate: SR, sfx: false, amb: false, raw: true });
  const rows = [];
  HT.timeline.forEach(s => s.cues.forEach(c => {
    const Dd = c && c.sfx && D.SFX_DEF[c.sfx]; if (!Dd || !Dd.duck) return;
    const vol = c.vol == null ? 1 : +c.vol; if (vol <= 0.15) return;
    const t = s.start + c.t, a = stats(dk, t + 0.06, t + 0.3).rms, b = stats(nod, t + 0.06, t + 0.3).rms;
    rows.push({ at: r2(t), scene: s.id, sfx: c.sfx, vol, planned: r1(Dd.duck[0] * Math.min(1, vol)), measured: b > -65 ? r1(b - a) : '(music silent)', musicRMS: b });
  }));
  return { note: 'planned = SFX_DEF duck dB × min(1, vol); the duck envelope is the deepest ACTIVE duck at each instant (gaps < 0.25 s bridged); measured = music RMS without − with ducking, 60–300 ms after the cue, raw renders', table: fmtRows(rows, [['at', 8], ['scene', 13], ['sfx', 13], ['vol', 5], ['planned', 8], ['measured', 15], ['musicRMS', 8]]) };
}
// 4. the planned silences, measured (music-only render for music silences, the full mix for the full-mix ones)
function silenceWindows() {
  const st = id => (secOf(id) || {}).start, sc = id => (HT.SCENES && HT.SCENES[id]) || {};
  const post = (id, n) => (((sc(id).C || {}).post) || []).find(e => e.post === n);
  const cue = (id, n, d) => { const c = (((secOf(id) || {}).cues) || []).filter(x => x && x.sfx === n).sort((a, b) => a.t - b.t)[0]; return c ? c.t : d; };
  const W = [];
  if (secOf('a1_opener')) W.push(['opener: music gate from the picture cut until the drone', st('a1_opener') + 0.05, st('a1_opener') + cue('a1_opener', 'collapse', 5.7) + 2.7, 'music']);
  if (secOf('a1_intercut') && secOf('a1_standoff')) W.push(['intercut arrival → standoff start (gate)', st('a1_intercut') + 14.25, st('a1_standoff'), 'music']);
  if (secOf('a1_standoff')) W.push(['standoff before the bell', st('a1_standoff'), st('a1_standoff') + 9.55, 'music']);
  if (secOf('a1_exchange1') && secOf('a1_exchange2')) W.push(['exchange1: the smoking hole (after the tails are gated out)', st('a1_exchange1') + 19 + 1.5, st('a1_exchange2') - 0.1, 'music']);
  if (secOf('a1_exchange2')) W.push(['Dismantle: the held breath (gate)', st('a1_exchange2') + cue('a1_exchange2', 'shing', 6.6) + 0.06, st('a1_exchange2') + cue('a1_exchange2', 'slashSplit', 8.0) - 0.02, 'music']);
  if (secOf('a1_clash')) {
    const h = st('a1_clash') + cue('a1_clash', 'hitHuge', 3.62), w = post('a1_clash', 'white') || { t: 4.6, in: 0.5, dur: 1.9 };
    W.push(['clash: the frame before the double punch', h - 1 / 30 + 0.011, h - 0.005, 'mix']);
    W.push(['clash: the white-out', st('a1_clash') + w.t + (w.in || 0.5) + 0.01, st('a1_clash') + w.t + (w.dur || 1.9) - 0.13, 'mix']);
  }
  // Act II
  if (secOf('a2_signs')) W.push(['a2_signs: silence first (no music before the bell)', st('a2_signs') + 0.05, st('a2_signs') + cue('a2_signs', 'handSign', 6.4) + 0.5, 'music']);
  if (secOf('a2_shred')) {
    const b = (post('a2_shred', 'black') || { t: 24.6 }).t;
    W.push(['a2_shred: the music stops dead on the neck cut', st('a2_shred') + cue('a2_shred', 'shing', 22.2) + 0.06, st('a2_shred') + b, 'music']);
    W.push(['a2_shred: hard silence with the black (full mix)', st('a2_shred') + b + 0.25, st('a2_shred') + secOf('a2_shred').dur - 0.03, 'mix']);
  }
  if (secOf('a2_wheel')) W.push(['a2_wheel: darkness before the clunk', st('a2_wheel') + 0.05, st('a2_wheel') + cue('a2_wheel', 'wheelClunk', 2.6) - 0.05, 'music']);
  if (secOf('a2_clash5')) { const f = (((secOf('a2_clash5') || {}).cues) || []).filter(x => x && x.sfx === 'tallyTick').map(x => x.t).sort((a, b) => b - a)[0] || 18.2;
    W.push(['a2_clash5: the tiniest silence before the seals light (full mix)', st('a2_clash5') + f - 0.2 + 0.012, st('a2_clash5') + f - 0.005, 'mix']); }
  // Act III (the gate closes with a 4 ms time constant: −60 dB after ~28 ms, so windows start 45 ms after it)
  if (secOf('a3_frozen')) W.push(['a3_frozen: the Void dies with its music — silence from the collapse to noon', st('a3_frozen') + cue('a3_frozen', 'domainCollapse', 15.1) + 0.25 + 0.045, st('a3_frozen') + secOf('a3_frozen').dur - 0.03, 'music']);
  if (secOf('a3_signal')) { const road = ((sc('a3_signal').C || {}).shots || []).filter(s => s.shot === 'static' && s.t > 20).map(s => s.t)[0] || 20.2;
    W.push(['a3_signal: cut dead on the empty junction', st('a3_signal') + road + 0.045, st('a3_signal') + secOf('a3_signal').dur - 0.03, 'music']); }
  if (secOf('a3_blackflash')) {
    const k = st('a3_blackflash'), bf = k + cue('a3_blackflash', 'blackFlash', 0.15), page = (((sc('a3_blackflash').C || {}).shots || []).find(s => s.shot === 'panels') || { t: 3.0 }).t;
    W.push(['a3_blackflash: the music pulls out 0.1 s before the contact', bf - 0.1 + 0.045, bf - 0.004, 'music']);
    W.push(['a3_blackflash: the long silence (manga page → end of scene)', k + page + 0.045, k + secOf('a3_blackflash').dur - 0.03, 'music']);
  }
  // Act IV (pull-outs: the gate closes 0.1 s before a hit with a 4 ms time constant → windows start 45 ms after it)
  const pull = (id, name, d, s, label) => { if (secOf(id)) { const h = st(id) + cue(id, name, d); W.push([id + ': ' + label, h - s + 0.045, h - 0.004, 'music']); } };
  if (secOf('a4_shadow')) { const a = st('a4_shadow'), sh = ((sc('a4_shadow').C || {}).shots || []).filter(x => x.shot === 'static' && x.t > 17).map(x => x.t)[0] || 17.2;
    W.push(['a4_shadow: silence first (act card, the spinning wheel) until the arms', a + 0.05, a + cue('a4_shadow', 'hitM', 6.56) - 0.02, 'music']);
    W.push(['a4_shadow: after the cut, silence through the monitor room', a + cue('a4_shadow', 'impactFrame', 11.27) + 0.7 + 0.045, a + sh - 0.03, 'music']); }
  pull('a4_rabbits', 'redBlast', 7.8, 0.1, 'the music pulls out before the Red into the shadow');
  if (secOf('a4_corridor')) { const a = st('a4_corridor'), b = cue('a4_corridor', 'extinguisherBurst', 3.95);
    W.push(['a4_corridor: swallowed by the smoke (the burst)', a + b + 0.045, a + b + 0.5 - 0.03, 'music']); }
  if (secOf('a4_agito')) { const a = st('a4_agito'), r = cue('a4_agito', 'redBlast', 13.7), lk = (((sc('a4_agito').fightDef || {}).script || []).find(e => e.who === 'maho' && e.pose === 'maho_look') || { t: 14.9 }).t;
    W.push(['a4_agito: the point-blank Red does nothing — everything stops', a + r + 0.125 + 0.045, a + lk - 0.03, 'music']); }
  if (secOf('a4_sit')) W.push(['a4_sit: no music in the monitoring room (gate closed 0.25 s in, τ 0.2 s)', st('a4_sit') + 1.5, st('a4_sit') + secOf('a4_sit').dur - 0.15, 'music']);
  pull('a4_agito2', 'blackFlash', 3.95, 0.1, 'the music pulls out before Black Flash #2');
  if (secOf('a4_arm')) { const a = st('a4_arm');
    W.push(['a4_arm: the slash lands — nothing while he falls', a + cue('a4_arm', 'dismantle', 7.27) + 0.25 + 0.045, a + cue('a4_arm', 'bodyFall', 9.05) - 0.03, 'music']); }
  pull('a4_climb', 'infinityStop', 13.32, 0.1, 'the music pulls out before the Infinity stops the punch');
  pull('a4_crush', 'blueImplode', 3.69, 0.1, 'the music pulls out before the implosion');
  if (secOf('a4_flash34')) { const bfs = ((secOf('a4_flash34').cues) || []).filter(x => x && x.sfx === 'blackFlash').map(x => x.t).sort((p, q) => p - q);
    bfs.forEach((t, i) => W.push(['a4_flash34: the music pulls out before Black Flash #' + (i + 3), st('a4_flash34') + t - 0.1 + 0.045, st('a4_flash34') + t - 0.004, 'music'])); }
  // Acts V–VI
  if (secOf('a5_sky')) W.push(['a5_sky: silence before the Purple (wind only)', st('a5_sky') + 0.05, st('a5_sky') + secOf('a5_sky').dur - 0.03, 'music']);
  if (secOf('a5_purple')) { const a = st('a5_purple'), born = cue('a5_purple', 'purpleErase', 2.62), f = post('a5_purple', 'fadeTo') || { t: 7.3, in: 0.55 };
    const light = ((sc('a5_purple').C || {}).shots || []).filter(x => x.shot === 'static' && x.t > 9).map(x => x.t)[0] || 9.8;
    W.push(['a5_purple: silence while the Red spirals in', a + 0.05, a + born - 0.1, 'music']);
    // (starts 0.35 s after the gate: the master's 28 Hz high-pass rings for ~0.2 s after the film's loudest moment is cut)
    W.push(['a5_purple: the white (only the tinnitus)', a + f.t + (f.in || 0.55) + 0.125 + 0.35, a + light - 0.03, 'music']); }
  if (secOf('a5_breath')) W.push(['a5_breath: wind only', st('a5_breath') + 0.05, st('a5_breath') + secOf('a5_breath').dur - 0.03, 'music']);
  if (secOf('a6_notch')) W.push(['a6_notch: silence until the last notch', st('a6_notch') + 0.05, st('a6_notch') + cue('a6_notch', 'wheelClunk', 7.4) - 0.03, 'music']);
  if (secOf('a6_cut')) { const a = st('a6_cut'), wc = cue('a6_cut', 'worldCut', 6.6), D0 = D.SFX_DEF.worldCut, cc = (secOf('a6_cut').cues || []).find(x => x && x.sfx === 'worldCut') || {};
    const len = cc.dur != null ? cc.dur : D0.len, hold = D0.cut ? D0.cut.hold : 3;
    W.push(['a6_cut: no music before or through the Cut', a + 0.05, a + secOf('a6_cut').dur - 0.03, 'music']);
    W.push(['a6_cut: the World-Cutting Slash empties the mix (full mix)', a + wc + len + 0.05, a + wc + len + hold - 0.03, 'mix']); }
  if (secOf('a6_white')) W.push(['a6_white: silence until the scarf lands', st('a6_white') + 0.05, st('a6_white') + cue('a6_white', 'dropSoft', 7.4) - 0.03, 'music']);
  if (secOf('a6_salute')) W.push(['a6_salute: no music (wind, a distant crackle)', st('a6_salute') + 0.05, st('a6_salute') + secOf('a6_salute').dur - 0.03, 'music']);
  return W;
}
// Full-mix silences are also measured on the RAW (pre-master) mix: after an abrupt full-mix cut the master's 28 Hz subsonic
// high-pass rings out (a damped ~15 Hz response of whatever low end was playing), so the mastered file is not digital zero
// for a few tens of ms; the raw mix shows whether the cut itself is clean. ok = raw (mix windows) / music stem < −80 dBFS.
async function silenceCheck() {
  const out = [];
  for (const [name, t0, t1, bus] of silenceWindows()) {
    const m = stats(window.__mus, t0, t1), x = stats(window.__mix, t0, t1), row = { name, from: r3(t0), to: r3(t1), bus, musicPeak: m.peak, musicRMS: m.rms, mixPeak: x.peak, mixRMS: x.rms };
    if (bus === 'mix') { const raw = await A.renderOffline({ sampleRate: SR, from: t0 - 0.3, to: t1 + 0.05, raw: true }), s = stats(raw, 0.3, 0.3 + (t1 - t0)); row.rawMixPeak = s.peak; row.rawMixRMS = s.rms; }
    row.ok = (bus === 'music' ? m.peak : row.rawMixPeak) < -80;
    out.push(row);
  }
  return out;
}
// 5. modes: pitch classes per cue and instrument; parts with a declared role must stay in D Lydian (L), D Phrygian (P)
// or the pitches both share (LP = D, A). Transposed stretti, clusters and sforzandi are listed but not checked.
const MODE_PC = { L: new Set([2, 4, 6, 8, 9, 11, 1]), P: new Set([2, 3, 5, 7, 9, 10, 0]), LP: new Set([2, 9]), I: new Set([2, 4, 6, 7, 9, 11, 1]) }; // I = D Ionian (the Elegy)
const ROLE = {
  'a1.snow': { koto: 'L' }, 'a1.city': { glass: 'L', koto: 'L', strings: 'L', sub: 'L' }, 'a1.king': { strings: 'P', dbass: 'P', sub: 'P' },
  'a1.opener': { strings: 'P', dbass: 'P', sub: 'P' }, 'a1.walk': { glass: 'L', koto: 'L', strings: 'L', pizz: 'L' }, 'a1.intercut': { koto: 'L', shamisen: 'P' },
  'a1.standoff': { bonsho: 'LP', tone: 'LP' }, 'a1.exchange': { glass: 'L', koto: 'L', dbass: 'P' }, 'a1.fall': { dbass: 'P', sub: 'LP' },
  // Act II (notes detuned by the territory war are rounded to the nearest semitone before the check; the wheel's clunk
  // is Mahoraga's octatonic triad by design and is not checked)
  'a2.signs': { bonsho: 'LP' }, 'a2.void': { glass: 'L', koto: 'L', tone: 'L', sub: 'LP' },
  'a2.shrine': { shamisen: 'P', strings: 'P', dbass: 'P', bell: 'P' }, 'a2.watchers': { strings: 'LP' },
  'a2.grind': { shamisen: 'P', dbass: 'P', koto: 'P', strings: 'P' }, 'a2.red': { glass: 'L', koto: 'L', dbass: 'LP' },
  'a2.clash2': { bell: 'P', shamisen: 'P', dbass: 'P', tone: 'L', koto: 'P' }, 'a2.ball': { mbox: 'L', koto: 'L', glass: 'L', shamisen: 'P', dbass: 'P' },
  'a2.wheel': { koto: 'L', glass: 'L', sub: 'LP' }, 'a2.clash4': { shamisen: 'P', strings: 'P' },
  'a2.clash5': { glass: 'L', tone: 'L', koto: 'L', shamisen: 'P', bell: 'P' },
  // Act III (strings / dbass carry both themes, the stabs and Mahoraga's octatonic wheel → not checked; the wheel's hum is
  // a 'tone' pair on its outer tritone, so 'tone' is only checked where the wheel sits at D–G♯, which Lydian contains)
  'a3.frozen': { glass: 'L', tone: 'L' }, 'a3.breath': { koto: 'L', tone: 'L', bell: 'P', shamisen: 'P', sub: 'LP' },
  'a3.blue': { glass: 'L', koto: 'L', shamisen: 'P' }, 'a3.signal': { glass: 'L', koto: 'L' }, 'a3.chase': { glass: 'L' },
  'a3.red': { glass: 'L', tone: 'L', shamisen: 'LP' }, 'a3.adapt': { glass: 'P', sub: 'LP' },
  // Act IV (the corridor's glass/tone carry the darkened theme and the beam's E♭: Phrygian; a4.agito2's glass mixes the
  // regrowth shimmer (Phrygian) with Gojo's runs and is not checked)
  'a4.shadow': { koto: 'L', glass: 'L', tone: 'L', sub: 'LP' }, 'a4.palms': { glass: 'L', koto: 'L', shaku: 'L', shamisen: 'P', pizz: 'P' },
  'a4.corridor': { shamisen: 'P', glass: 'P', koto: 'LP' }, 'a4.agito': { glass: 'L', koto: 'L', shamisen: 'P' },
  'a4.agito2': { koto: 'L', bonsho: 'LP' }, 'a4.climb': { glass: 'L', koto: 'L' }, 'a4.crush': { glass: 'L' }, 'a4.star': { tone: 'L' },
  'a4.flash': { glass: 'L', koto: 'L' },
  // Acts V–VI (octatonic lines — the streak, the dying wheel, its motes, the notch's hum — are left unchecked)
  'a5.red': { koto: 'L', shaku: 'L', glass: 'L', sub: 'LP' }, 'a5.stars': { tone: 'L' }, 'a5.ride': { tone: 'P' },
  'a5.purple': { koto: 'L', bonsho: 'LP' }, 'a5.landing': { koto: 'L', glass: 'L', fmkeys: 'L' }, 'a5.command': { fmkeys: 'L' },
  'a6.rise': { strings: 'P', sub: 'LP' }, 'a6.white': { koto: 'L' }, 'a6.airport': { fmkeys: 'I', koto: 'I' },
  'a6.credits': { fmkeys: 'I', koto: 'I', glass: 'I', bonsho: 'LP' },
};
function modeCheck() {
  const PITCHED = new Set(['glass', 'koto', 'strings', 'dbass', 'shaku', 'fmkeys', 'bonsho', 'clunk', 'shamisen', 'bell', 'mbox', 'sub', 'pizz', 'tone', 'pluck', 'pad', 'bass']);
  const out = {};
  D.buildEvents({ sfx: false, amb: false }).filter(e => e.k === 'n').forEach(e => {
    const c = out[e.cue] || (out[e.cue] = { notes: 0, pitched: {}, unpitched: {}, outside: [] });
    c.notes++;
    if (!PITCHED.has(e.i)) { c.unpitched[e.i] = (c.unpitched[e.i] || 0) + 1; return; }
    const pc = ((Math.round(e.m) % 12) + 12) % 12, bi = c.pitched[e.i] || (c.pitched[e.i] = {});
    bi[PCN[pc]] = (bi[PCN[pc]] || 0) + 1;
    const role = ROLE[e.cue] && ROLE[e.cue][e.i];
    if (role && !MODE_PC[role].has(pc)) c.outside.push(e.i + ' ' + PCN[pc] + '@' + r2(e.t));
  });
  Object.values(out).forEach(c => { Object.keys(c.pitched).forEach(i => { c.pitched[i] = Object.entries(c.pitched[i]).sort((a, b) => b[1] - a[1]).map(([p, n]) => p + ':' + n).join(' '); }); c.outside = c.outside.slice(0, 12); });
  return out;
}
// 6. determinism over the whole timeline: a second continuous render vs the first
async function determinismFull() {
  const a = window.__mix, b = await A.renderOffline({ sampleRate: SR });
  let md = 0, at = 0;
  for (let c = 0; c < 2; c++) { const x = a.getChannelData(c), y = b.getChannelData(c); for (let i = 0; i < x.length; i++) { const d = Math.abs(x[i] - y[i]); if (d > md) { md = d; at = i / SR; } } }
  return { seconds: r2(a.duration), maxAbsDiff: md, maxDiff_dBFS: r1(dB(md)), at: r3(at), identical: md === 0 };
}
function ksStats() { const B = AU.bufCache(SR); return { entries: B.ks.size, samples: B.ksSamples, MB: r1(B.ksSamples * 4 / 1048576), synthesized: B.ksMade, evicted: B.ksEvicted, capSamples: AU.KS_CAP, capMB: r1(AU.KS_CAP * 4 / 1048576) }; }
// The scene-cue changes requested from the director for Act I (M1 audio report), applied IN MEMORY ONLY (the scene files
// are not touched) so their effect on the mix can be measured: actChecks({ proposed: true }). Each entry: scene, what to
// drop (cues matching name + time), what to add.
const A1_PROPOSED = [
  { scene: 'a1_opener', why: 'distant, muffled 200% Purple: the charge swells 0.6→3.2 s and fuses as the line fires (as written its 4.3 s pre-roll starts inside a1_rooftop); the fx default cues (charge v0.9 from 0.21 s, a second erase v1) go (sfx:false on the 3.2 s purple fx)',
    drop: [['purpleCharge', 0.6], ['purpleCharge', 3.21], ['purpleErase', 3.43], ['purpleErase', 3.2]],
    add: [{ t: 3.2, sfx: 'purpleCharge', vol: 0.3, pitch: 0.7, dur: 2.6, lp: 1400 }, { t: 3.2, sfx: 'purpleErase', vol: 0.55, pan: -0.5, panTo: 0.2, dur: 3, lp: 900, wet: 1.6 }] },
  { scene: 'a1_standoff', why: 'the can rolls 4.4 s on screen; the fx default canRoll has no dur (2.5 s, stop at 12.75 s)', drop: [['canRoll', 10.4]], add: [{ t: 10.4, sfx: 'canRoll', vol: 0.8, dur: 4.4, pan: -0.4, panTo: 0.05 }] },
  { scene: 'a1_standoff', why: 'riser under the dolly zoom (pre-roll semantics: t is where it lands)', drop: [['riser', 15.8]], add: [{ t: 18.8, sfx: 'riser', vol: 0.22, dur: 3.0 }] },
  { scene: 'a1_exchange1', why: 'the Blue gathers 12.55→15.8 (flick): charge lands on the flick; the blueOrb default implode (thump at the START of the gathering) goes (sfx:false on the 12.55 blueOrb)',
    drop: [['blueCharge', 12.55], ['blueImplode', 12.55]], add: [{ t: 15.8, sfx: 'blueCharge', vol: 0.7, dur: 3.25 }] },
  { scene: 'a1_gojo_walk', why: 'footsteps (SPEC: footSnow); step period 0.55/0.96 = 0.573 s = his walk (1.35 m/s, 1.547 m per cycle)', drop: [], add: [{ t: 0.3, sfx: 'footSnow', vol: 0.3, dur: 9.4, pitch: 0.96 }] },
  { scene: 'a1_intercut', why: 'panel 2 is a close-up of the feet in snow with no steps (walk 2.4 m/s: Gojo 3.1 steps/s, Sukuna 3.4)', drop: [], add: [{ t: 4.0, sfx: 'footSnow', vol: 0.4, dur: 4.0, pitch: 1.71, pan: -0.4 }, { t: 4.15, sfx: 'footSnow', vol: 0.45, dur: 3.85, pitch: 1.87, pan: 0.4 }] },
  { scene: 'a1_exchange2', why: 'footsteps at his pace (1.1 m/s → a step every 0.64 s; footConcrete steps every 0.52/pitch s)', drop: [['footConcrete', 1.2]], add: [{ t: 1.2, sfx: 'footConcrete', vol: 0.4, dur: 3, pitch: 0.81 }] },
  { scene: 'a1_clash', why: 'the office bed continues outside after 4.2 s: out under the white-out, wind + rubble in with the picture', drop: [], add: [{ t: 5.4, amb: 'interior', vol: 0, fade: 0.4 }, { t: 6.5, amb: 'wind', vol: 0.35, fade: 1.5 }, { t: 6.5, amb: 'rubble', vol: 0.3, fade: 1.5 }] },
];
// Act II requests (M2 audio report); the command-room inserts switch the bed to the room and back
const insertBeds = (t0, t1, back) => [{ t: t0, amb: 'shrine', vol: 0, fade: 0.15 }, { t: t0, amb: 'wind', vol: 0, fade: 0.15 }, { t: t0, amb: 'command', vol: 0.5, fade: 0.15 },
  { t: t1, amb: 'command', vol: 0, fade: 0.15 }, ...back.map(([n, v]) => ({ t: t1, amb: n, vol: v, fade: 0.15 }))];
const A2_PROPOSED = [
  { scene: 'a2_shred', why: 'the barrierShatter fx default fires at 17.6 (start of its 2.6 s crack phase); the shatter lands at 20.2 (hand-placed cue): sfx:false on the 17.6 fx', drop: [['barrierShatter', 17.6]], add: [] },
  { scene: 'a2_shred', why: 'inside the Void (8–14 s) the Shrine bed and the wind continue: the void bed instead, and back outside', drop: [],
    add: [{ t: 8.0, amb: 'shrine', vol: 0, fade: 0.2 }, { t: 8.0, amb: 'wind', vol: 0, fade: 0.2 }, { t: 8.0, amb: 'void', vol: 0.5, fade: 0.2 },
      { t: 14.0, amb: 'void', vol: 0, fade: 0.2 }, { t: 14.0, amb: 'shrine', vol: 0.45, fade: 0.2 }, { t: 14.0, amb: 'wind', vol: 0.3, fade: 0.2 }] },
  { scene: 'a2_clash2', why: 'the barrierShatter fx default fires at 21.0 (crack 0.5 s) and the hand-placed shatter at 21.5: sfx:false on the 21.0 fx', drop: [['barrierShatter', 21.0]], add: [] },
  { scene: 'a2_simple', why: 'SPEC: ring hum = infinityHum pitched down, lasting the ring (the fx default is unpitched and 3 s) + the erosion crackle (new SFX erode): sfx:false on both simpleDomain fx',
    drop: [['infinityHum', 0.8], ['infinityHum', 11.2]],
    add: [{ t: 0.8, sfx: 'infinityHum', vol: 0.45, pitch: 0.7, dur: 8 }, { t: 11.2, sfx: 'infinityHum', vol: 0.5, pitch: 0.6, dur: 5 },
      { t: 4.0, sfx: 'erode', vol: 0.45, dur: 4.8 }, { t: 11.6, sfx: 'erode', vol: 0.55, dur: 4.6 }, ...insertBeds(9.0, 11.0, [['shrine', 0.45], ['wind', 0.3]])] },
  { scene: 'a2_red', why: 'command-room insert 9–12 s: the room bed instead of the Shrine', drop: [], add: insertBeds(9.0, 12.0, [['shrine', 0.45], ['wind', 0.3]]) },
  { scene: 'a2_blossom', why: 'command-room insert 5.2–7.4 s: the room bed instead of the Shrine', drop: [], add: insertBeds(5.2, 7.4, [['shrine', 0.5], ['wind', 0.3]]) },
  { scene: 'a2_three', why: 'command-room insert 5.6–8.5 s; at 8.5 the Shrine has collapsed: no Shrine bed after it (wind + rubble)', drop: [], add: insertBeds(5.6, 8.5, [['wind', 0.3], ['rubble', 0.3]]) },
  { scene: 'a2_clash5', why: 'the two handSign cues at exactly 17.000 are merged into one by the engine (same name + time): offset the second by a frame so both seals (L/R) sound', drop: [['handSign', 17.0]], add: [{ t: 17.03, sfx: 'handSign', vol: 0.8, pan: -0.3 }] },
  { scene: 'a2_wheel', why: 'the deck (5–12 s) has no bed at all after the darkness', drop: [], add: [{ t: 5.0, amb: 'wind', vol: 0.25, fade: 0.4 }] },
];
// Act III requests (M3 audio report): the charge family lands on `t` and builds for `dur` before it (preDur), so a charge
// that should grow WITH its orb goes at the release with dur = the orb's charge time
const A3_PROPOSED = [
  { scene: 'a3_drag', why: 'the Blue gathers 7.4→9.7 (blueOrb dur 2.3, debris converging) and the heap falls at 9.7; the charge as written (t 7.4, dur 2) builds 5.4→7.4 over the landing slam instead',
    drop: [['blueCharge', 7.4]], add: [{ t: 9.7, sfx: 'blueCharge', vol: 0.7, dur: 2.3 }] },
  { scene: 'a3_red', why: 'the Red charges 6.55→8.15 (redOrb charge 1.6) and fires at 8.15; the charge as written (t 6.55, default pre 1 s) builds 5.55→6.55, before Gojo is on screen, and the orb then grows silently',
    drop: [['redCharge', 6.55]], add: [{ t: 8.15, sfx: 'redCharge', vol: 0.85, dur: 1.6 }] },
  { scene: 'a3_frozen', why: '(optional) the Red grows from 12.2 until the sword strike cuts it at 14.2; as written the whine builds 11.2→12.2 and stops as the orb appears',
    drop: [['redCharge', 12.2]], add: [{ t: 14.2, sfx: 'redCharge', vol: 0.6, dur: 2.0 }] },
];
// (A1_PROPOSED and A2_PROPOSED: applied to the scene files by the director; A3_PROPOSED: applied by the composer in M3 —
// the a3_* scene files were opened to audio-cue edits — all kept for the record.) Pending proposals go in PENDING.
const PENDING = [];
function applyProposed() {
  const log = [];
  PENDING.forEach(p => {
    const e = secOf(p.scene); if (!e) return;
    const cues = e.cues.slice(); let dropped = 0;
    p.drop.forEach(([n, t]) => { const i = cues.findIndex(c => c && c.sfx === n && Math.abs(c.t - t) < 0.02); if (i >= 0) { cues.splice(i, 1); dropped++; } });
    cues.push(...p.add.map(c => Object.assign({}, c)));
    cues.sort((a, b) => a.t - b.t);
    e.cues = cues; log.push(p.scene + ': −' + dropped + ' +' + p.add.length + ' (' + p.why + ')');
  });
  window.__mix = window.__mus = window.__K = null;
  return log;
}
async function actChecks(o) {
  o = o || {};
  const T0 = performance.now(), R = {};
  if (o.proposed) R.proposed = applyProposed();
  R.env = { acts: window.__acts, duration: HT.duration, timeline: HT.timeline.map(s => s.id + ' ' + s.start + '–' + (s.start + s.dur) + (s.placeholder ? ' (placeholder)' : '')).join(', '), audioFiles: audioBlockCheck(), seqErrors: D.SEQ_ERR.slice() };
  R.catalog = sceneCueNames();
  R.mix = await fullMix();
  R.cues = (AU.MUSIC.composed || []).map(c => c.id + ' ' + r2(c.start) + '–' + r2(c.start + c.dur) + ' (' + c.events + ' events)').join(' · ');
  R.stems = await stemBalance();
  // per act (combined runs, e.g. ?acts=II,III): integrated loudness of the mix and the momentary max inside each act
  R.acts = (HT.actSpans || []).map(a => { const K = window.__K, a0 = a.start, a1 = a.start + a.dur, Wn = Math.round(0.4 * SR); let m = -999, at = 0;
    for (let i = Math.floor(a0 * SR); i + Wn <= Math.floor(a1 * SR); i += Math.round(0.1 * SR)) { const l = lufs(msum(K, i, i + Wn)); if (l > m) { m = l; at = i / SR; } }
    return { act: a.id, from: a0, to: a1, integrated: integrated(K, SR, a0, a1), shortTermMax: shortTermMax(K, SR, a0, a1), momentaryMax: { lufs: r1(m), at: r2(at) } }; });
  R.ducking = await duckCheck();
  R.silences = await silenceCheck();
  R.modes = modeCheck();
  R.determinism = await determinismFull();
  if (o.seams !== false) R.seams = await seamTest({ chunks: o.chunks || [60, 20], offset: o.offset || [95, 155, 15] });
  R.ks = ksStats();
  R.events = eventStats();
  R.warnings = __warn.slice(); R.errors = __err.slice();
  R.summary = {
    catalog: 'sfx names ' + R.catalog.sfxNames.split(' ').length + ', missing sfx: ' + (R.catalog.missingSfx.join(' ') || 'none') + ', missing beds: ' + (R.catalog.missingAmb.join(' ') || 'none') + ', cue problems: ' + (R.catalog.problems.join(' | ') || 'none'),
    mix: 'sample peak ' + R.mix.global.peak + ' dBFS, true peak ' + R.mix.global.truePeak + ' dBTP (8×: ' + R.mix.global.truePeak8x + '), NaN ' + R.mix.global.nan + ', integrated ' + R.mix.integratedLUFS + ' LUFS, short-term max ' + R.stems.mixShortTermMax.lufs + ' @' + R.stems.mixShortTermMax.at + ' s',
    music: 'integrated ' + R.stems.whole.music + ' LUFS, short-term max ' + R.stems.musicShortTermMax.lufs + ' @' + R.stems.musicShortTermMax.at + ' s',
    silences: R.silences.map(s => (s.ok ? 'ok ' : 'LOUD ') + s.name + ' ' + (s.bus === 'music' ? 'music peak ' + s.musicPeak : 'raw mix peak ' + s.rawMixPeak + ' / mastered ' + s.mixPeak) + ' dBFS').join(' | '),
    loudest: 'mix momentary max ' + R.stems.mixMomentaryMax.lufs + ' LUFS @' + R.stems.mixMomentaryMax.at + ' s',
    acts: R.acts.map(a => a.act + ' ' + a.from + '–' + a.to + ' s: ' + a.integrated + ' LUFS, short-term max ' + a.shortTermMax.lufs + ' @' + a.shortTermMax.at + ', momentary max ' + a.momentaryMax.lufs + ' @' + a.momentaryMax.at).join(' | '),
    modes: Object.entries(R.modes).map(([k, v]) => k + (v.outside.length ? ' OUTSIDE: ' + v.outside.join(', ') : ' ok')).join(' | '),
    determinism: R.determinism.identical ? 'bit-identical' : 'max diff ' + R.determinism.maxDiff_dBFS + ' dBFS',
    seams: R.seams ? (R.seams.pass ? 'PASS ' : 'FAIL ') + R.seams.runs.map(r => r.label + ' ' + r.maxDiff_dBFS + ' dBFS').concat([R.seams.offset.label + ' ' + R.seams.offset.maxDiff_dBFS + ' dBFS']).join(' | ') : 'skipped',
    ks: R.ks.entries + ' buffers, ' + R.ks.MB + ' MB (cap ' + R.ks.capMB + ' MB), evicted ' + R.ks.evicted,
    totalSec: r1((performance.now() - T0) / 1000),
  };
  window.__report = R;
  return R;
}

// ------------------------------------------------------------------ realtime API smoke test (headless Chrome, autoplay allowed)
async function realtimeTest() {
  const out = {}, e0 = __err.length, w0 = __warn.length;
  A.init(); await sleep(400);
  out.ctx = D.ctxInfo();
  out.sfxErrors = [];
  for (const n of Object.keys(A.SFX)) { try { const L = A.playSfx(n, { vol: 0.3, pan: -0.3, panTo: 0.3 }); if (!(L > 0)) out.sfxErrors.push(n + ' len ' + L); } catch (e) { out.sfxErrors.push(n + ': ' + e.message); } await sleep(15); }
  await sleep(300);
  out.probes = [];
  for (const t of [0, 7.3, 21.9, 35, 58.7, 81, 99.5, 119.5, 139.2, 150]) {
    const c0 = performance.now(); A.play(t); const playMs = performance.now() - c0;
    await sleep(600); const n1 = A.now(), w1 = performance.now(); await sleep(500); const n2 = A.now(), w2 = performance.now();
    out.probes.push({ from: t, playMs: r1(playMs), now1: r3(n1), rate: r3((n2 - n1) / ((w2 - w1) / 1000)), voices: D.ctxInfo().voices });
  }
  A.pause(); const p1 = A.now(); await sleep(300); const p2 = A.now();
  out.pause = { playing: A.playing, stable: p1 === p2, at: r3(p1) };
  A.seek(50); out.seekWhilePaused = { now: A.now(), playing: A.playing };
  A.play(HT.duration - 1.5); await sleep(2300); out.endOfFilm = { playing: A.playing, now: r3(A.now()) };
  A.setVolume(0.5); A.setMuted(true); A.setMuted(false); A.setVolume(1);
  out.errors = __err.slice(e0); out.warnings = __warn.slice(w0);
  return out;
}

// ------------------------------------------------------------------ pictures (optional, for --shot)
const CMAP = [[0, [0, 0, 4]], [0.2, [40, 11, 84]], [0.4, [101, 21, 110]], [0.6, [159, 42, 99]], [0.75, [212, 72, 66]], [0.88, [245, 125, 21]], [1, [252, 255, 164]]];
function cmap(u) { u = Math.max(0, Math.min(1, u)); for (let k = 1; k < CMAP.length; k++) if (u <= CMAP[k][0]) { const [a, ca] = CMAP[k - 1], [b, cb] = CMAP[k], v = (u - a) / (b - a); return ca.map((x, i) => x + (cb[i] - x) * v); } return CMAP[CMAP.length - 1][1]; }
function spectro(g, buf, t0, t1, X, Y, w, h, o) {
  o = o || {}; const sr = buf.sampleRate, N = o.nfft || 4096, fmin = o.fmin || 40, fmax = o.fmax || 16000, lo = o.lo || -100, hi = o.hi || -20;
  const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, img = g.createImageData(w, h), win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const re = new Float64Array(N), im = new Float64Array(N), mag = new Float64Array(N / 2), bw = sr / N;
  const rowBin = []; for (let y = 0; y <= h; y++) rowBin.push(fmin * Math.pow(fmax / fmin, 1 - y / h) / bw);
  for (let col = 0; col < w; col++) {
    const c = Math.floor((t0 + (t1 - t0) * (col + 0.5) / w) * sr) - N / 2;
    for (let i = 0; i < N; i++) { const j = c + i; re[i] = (j >= 0 && j < L.length ? (L[j] + R[j]) * 0.5 : 0) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) / (N / 4);
    for (let y = 0; y < h; y++) {
      const b0 = rowBin[y + 1], b1 = rowBin[y]; let m = 0;
      for (let k = Math.max(0, Math.floor(b0)); k <= Math.min(N / 2 - 1, Math.ceil(b1)); k++) m = Math.max(m, mag[k]);
      const col3 = cmap((dB(m) - lo) / (hi - lo)), p = (y * w + col) * 4;
      img.data[p] = col3[0]; img.data[p + 1] = col3[1]; img.data[p + 2] = col3[2]; img.data[p + 3] = 255;
    }
  }
  g.putImageData(img, X, Y);
}
async function drawMix() { // whole lab timeline: spectrogram + loudness
  const buf = window.__mix || (window.__mix = await A.renderOffline({ sampleRate: SR })), K = window.__K || (window.__K = kweight(buf));
  const W = 1800, SH = 420, LH = 160, M = 44, cv = document.getElementById('cv'), total = buf.duration;
  cv.width = W + M + 10; cv.height = SH + LH + 70;
  const g = cv.getContext('2d'); g.fillStyle = '#0b0d10'; g.fillRect(0, 0, cv.width, cv.height);
  spectro(g, buf, 0, total, M, 20, W, SH, { fmin: 40, fmax: 16000 });
  const X = t => M + (t / total) * W;
  g.font = '11px monospace'; g.textAlign = 'left';
  HT.timeline.forEach(s => { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(Math.round(X(s.start)), 12, 1, SH + 8); g.fillText(s.id, X(s.start) + 3, 12); s.cues.forEach(c => { if (c.sfx) { g.fillStyle = '#3cf'; g.fillRect(Math.round(X(s.start + c.t)), SH + 20, 1, 7); } }); });
  const Y0 = SH + 40, ly = l => Y0 + LH * (1 - (Math.max(-50, Math.min(-5, l)) + 50) / 45);
  g.fillStyle = '#15191e'; g.fillRect(M, Y0, W, LH);
  const plot = (arr, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); arr.forEach(([t, l], i) => { const x = X(t), y = ly(l); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
  plot(contour(K, SR, 0.4, 0.1), 'rgba(120,170,255,0.35)', 1); plot(contour(K, SR, 3, 0.25), '#ffd060', 2);
  g.fillStyle = '#cde'; g.fillText('DOMAIN CLASH audio lab — full mix (log f 40 Hz–16 kHz) · loudness short-term 3 s (gold), momentary (blue), −50..−5 LUFS · cyan = SFX cues', M, SH + LH + 60);
  window.__shotSize = { w: cv.width, h: cv.height + cv.offsetTop };
  return cv.width + 'x' + cv.height;
}

async function sfxGrid() { // spectrogram tile per catalog SFX (raw, dry, vol 1) + every bed (first 6 s), labelled with peak/RMS
  const tiles = [];
  for (const n of CAT_NAMES) { const b = await D.renderSfx(n, {}, { sampleRate: SR, dry: true, revTail: 0.2 }); tiles.push({ n, b, st: stats(b, 0, b.duration), dur: b.duration }); }
  for (const n of CAT_BEDS) { const b = D.bed(n, SR); tiles.push({ n: 'bed:' + n, b, st: stats(b, 0, b.duration), dur: 6 }); }
  const cols = 8, tw = 224, th = 112, gap = 6, M = 6, rows = Math.ceil(tiles.length / cols), cv = document.getElementById('cv');
  cv.width = M * 2 + cols * (tw + gap); cv.height = M * 2 + rows * (th + gap + 26);
  const g = cv.getContext('2d'); g.fillStyle = '#0b0d10'; g.fillRect(0, 0, cv.width, cv.height);
  tiles.forEach((T, i) => {
    const x = M + (i % cols) * (tw + gap), y = M + Math.floor(i / cols) * (th + gap + 26);
    spectro(g, T.b, 0, T.dur, x, y + 13, tw, th, { nfft: 2048, fmin: 40, fmax: 16000, lo: -95, hi: -15 });
    g.fillStyle = '#e8eef4'; g.font = '11px monospace'; g.fillText(T.n, x, y + 10);
    g.fillStyle = '#9ab'; g.font = '10px monospace'; g.fillText('pk ' + T.st.peak + ' rms ' + T.st.rms + ' ' + T.dur.toFixed(1) + 's', x + 2, y + th + 24);
  });
  window.__shotSize = { w: cv.width, h: cv.height + cv.offsetTop };
  return tiles.length + ' tiles';
}

// ------------------------------------------------------------------ interactive UI
(function ui() {
  const u = document.getElementById('ui'), btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; u.appendChild(b); };
  btn('▶ 0', () => A.play(0)); btn('⏸', () => A.pause());
  HT.timeline.forEach(s => btn(s.id, () => A.play(s.start)));
  Object.keys(A.SFX).forEach(n => btn(n, () => A.playSfx(n)));
  const cl = document.createElement('span'); u.appendChild(cl);
  setInterval(() => { cl.textContent = '  t=' + A.now().toFixed(2) + (A.playing ? ' ▶' : ' ⏸'); }, 100);
})();
window.__ready = true;
