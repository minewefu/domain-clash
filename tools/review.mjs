// DOMAIN CLASH — whole-film (or per-act) QA:
//   node tools/review.mjs [--act I|II|…|test] [--scenes a,b] [--no-sheets] [--no-trans] [--perf] [--scale 2] [--n 12]
// Writes shots/review/<scene>.png (contact sheets, frames at 2× by default), trans_<scene>.png (the last 0.4 s of the
// previous scene → the first 1.6 s of the next), report.json (cue validation, flash-cap check, perf, warnings) and
// issues.txt. Cue validation: every sfx/amb name exists in the audio catalog, cue times lie inside their scene, scene
// durations are whole bars (2 s) so every scene starts on a bar line, the photosensitivity cap (≤ 3 full-frame flashes
// or inversions in any 1 s window) holds, and fight scripts compiled without warnings.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const OUT = resolve(ROOT, val('--out', 'shots/review'));
const ACTS = val('--acts', null); // development: review acts not yet released (?acts=I,II)
const PQ = 'silent=1' + (ACTS ? '&acts=' + ACTS : '');
mkdirSync(OUT, { recursive: true });
const cdp = (args, timeout = 600000) => {
  try { return execFileSync('node', [resolve(ROOT, 'tools/cdp.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', timeout, maxBuffer: 64 << 20 }); }
  catch (e) { return (e.stdout || '') + (e.stderr || '') + '\n[review] cdp failed'; }
};
const lastJson = out => { const l = out.split('\n').filter(x => x.trim().startsWith('{') || x.trim().startsWith('[')); try { return JSON.parse(out.slice(out.indexOf(l[0]))); } catch { return null; } };

// ---------------------------------------------------------------- 1. timeline + static validation (one page load)
const VALIDATE = `(() => {
  const tl = HT.timeline, A = HT.audio || {}, sfx = A.SFX || {}, amb = new Set(A.AMB || []);
  const out = { scenes: [], problems: [], warnings: [] };
  for (const e of tl) {
    const d = e.def, s = { id: e.id, act: e.act, start: e.start, dur: e.dur, cues: (d.cues || []).length, placeholder: !!d.placeholder };
    if (Math.abs(e.dur / 2 - Math.round(e.dur / 2)) > 1e-6) out.problems.push(e.id + ': duration ' + e.dur + ' s is not a whole number of bars (2 s)');
    if (Math.abs(e.start / 2 - Math.round(e.start / 2)) > 1e-6) out.problems.push(e.id + ': starts at ' + e.start + ' s, not on a bar line');
    for (const c of d.cues || []) {
      if (c.sfx && !sfx[c.sfx]) out.problems.push(e.id + ': unknown sfx "' + c.sfx + '" at ' + c.t);
      if (c.amb && !amb.has(c.amb)) out.problems.push(e.id + ': unknown ambience "' + c.amb + '" at ' + c.t);
      if (typeof c.t === 'number' && (c.t < -0.5 || c.t > e.dur + 0.5)) out.problems.push(e.id + ': cue ' + (c.sfx || c.amb) + ' at ' + c.t + ' outside the scene');
    }
    for (const a of d.ambience || []) if (!amb.has(a.name)) out.problems.push(e.id + ': unknown ambience bed "' + a.name + '"');
    if (d.C) {
      for (const w of d.C.warnings) out.warnings.push(e.id + ': ' + w);
      // flash cap: full-frame flashes / inversions (post impact, flash, white-in < 0.2 s, fx with fullFlash)
      const fl = [];
      for (const p of d.C.post) if (p.post === 'impact' || p.post === 'flash' || (p.post === 'white' && (p.in || p.dur || 0) < 0.2)) fl.push(e.start + p.t);
      for (const f of d.C.fx) { const F = HT.FX && HT.FX[f.fx]; if (F && F.fullFlash) fl.push(e.start + f.t + (F.flashAt || 0)); }
      s.flashes = fl.length;
      s._fl = fl;
      const unknownFx = [...new Set(d.C.fx.map(f => f.fx).filter(n => !(HT.FX && HT.FX[n])))];
      if (unknownFx.length) out.problems.push(e.id + ': FX not in the library: ' + unknownFx.join(', '));
      const unknownPost = [...new Set(d.C.post.map(p => p.post).filter(n => !(HT.post && HT.post[n])))];
      if (unknownPost.length) out.problems.push(e.id + ': post effects not implemented: ' + unknownPost.join(', '));
    }
    out.scenes.push(s);
  }
  const all = out.scenes.flatMap(s => s._fl || []).sort((a, b) => a - b);
  let worst = 0, at = 0;
  for (let i = 0; i < all.length; i++) { let j = i; while (j + 1 < all.length && all[j + 1] - all[i] < 1) j++; if (j - i + 1 > worst) { worst = j - i + 1; at = all[i]; } }
  out.flashCap = { maxPerSecond: worst, at: +at.toFixed(2), total: all.length };
  if (worst > 3) out.problems.push('photosensitivity: ' + worst + ' flashes/inversions within 1 s at ' + at.toFixed(2) + ' s (cap 3)');
  out.scenes.forEach(s => delete s._fl);
  out.duration = HT.duration;
  out.acts = HT.actSpans;
  return out;
})()`;
const vOut = cdp(['--page', 'index.html?' + PQ, '--eval', VALIDATE, '--quiet']);
const V = lastJson(vOut);
if (!V) { console.error('[review] could not validate:\n' + vOut.slice(-2000)); process.exit(1); }
const actSel = val('--act', null), sceneSel = val('--scenes', null);
let scenes = V.scenes.filter(s => (!actSel || s.act === actSel) && (!sceneSel || sceneSel.split(',').includes(s.id)));
console.log(`[review] ${V.scenes.length} scenes, film ${V.duration} s; reviewing ${scenes.length}${actSel ? ' (act ' + actSel + ')' : ''}`);
const issues = [...V.problems.filter(p => !actSel || scenes.some(s => p.startsWith(s.id)) || !V.scenes.some(s => p.startsWith(s.id)))];
V.warnings.forEach(w => console.log('  warn ' + w));
const note = (label, out) => {
  const lines = out.split('\n').filter(l => /EXCEPTION|ERROR|failed|log-error/.test(l) && !/ERR_FILE_NOT_FOUND/.test(l));
  console.log(`${label}: ${lines.length ? 'ISSUES' : 'ok'}`);
  lines.forEach(l => { console.log('   ' + l); issues.push(label + ': ' + l); });
};
// ---------------------------------------------------------------- 2. contact sheets + transitions
const scale = val('--scale', '2'), n = val('--n', '12');
if (!has('--no-sheets')) for (const s of scenes) note('sheet ' + s.id, cdp(['--page', `index.html?${PQ}&sheet=${s.id}&n=${n}&cols=4&scale=${scale}`, '--shot', `${OUT}/${s.id}.png`]));
if (!has('--no-trans')) {
  const all = V.scenes;
  for (let i = 1; i < all.length; i++) {
    if (!scenes.some(s => s.id === all[i].id || s.id === all[i - 1].id)) continue;
    note(`trans ${all[i - 1].id}→${all[i].id}`, cdp(['--page', `index.html?${PQ}&sheet=${all[i].id}&from=-0.4&to=1.6&n=8&cols=4&scale=0.5`, '--shot', `${OUT}/trans_${all[i].id}.png`]));
  }
}
// ---------------------------------------------------------------- 3. perf: every frame at 30 fps, per scene (steady state after a warm-up pass)
let perf = null;
if (has('--perf')) {
  const ids = JSON.stringify(scenes.map(s => s.id));
  const js = `(() => { const ids = ${ids}, fps = 30, out = {};
    for (const e of HT.timeline) { if (!ids.includes(e.id)) continue;
      for (let t = e.start; t < e.start + Math.min(e.dur, 3); t += 1 / fps) HT.renderFrame(t); // warm-up (JIT, caches)
      const ms = []; for (let t = e.start; t < e.start + e.dur; t += 1 / fps) { const a = performance.now(); HT.renderFrame(t); ms.push(performance.now() - a); }
      ms.sort((a, b) => a - b);
      out[e.id] = { avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(1), max: +ms[ms.length - 1].toFixed(1), frames: ms.length };
    } return out; })()`;
  perf = lastJson(cdp(['--page', 'index.html?' + PQ + '&lab=noop', '--eval', js, '--quiet', '--timeout', '1800000'], 1900000));
  console.log('[review] perf (ms per frame, whole frame incl. quantizer):');
  for (const id in perf || {}) { const p = perf[id]; console.log(`   ${id.padEnd(22)} avg ${p.avg}  p95 ${p.p95}  max ${p.max}  (${p.frames} frames)${p.avg > 8 ? '  <-- over 8 ms budget' : ''}`); if (p.avg > 8) issues.push(`perf ${id}: avg ${p.avg} ms > 8 ms`); }
}
const report = { when: new Date().toISOString(), duration: V.duration, acts: V.acts, scenes, flashCap: V.flashCap, problems: V.problems, warnings: V.warnings, perf };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${OUT}/issues.txt`, issues.join('\n'));
console.log(`[review] flash cap: max ${V.flashCap.maxPerSecond}/s (at ${V.flashCap.at} s), ${V.flashCap.total} total`);
console.log(issues.length ? `${issues.length} issue(s) → ${OUT}/issues.txt\n  ` + issues.slice(0, 30).join('\n  ') : 'no issues');
