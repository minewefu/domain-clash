/* M0 — FIGHT TEST (30 s, 15 bars @120 BPM). A showcase that exercises every foundation system once:
   city set at dawn + snow + blinking signals, rig (both fighters, costume change, expressions, second eyes), the DSL
   (walks, auto-spaced strikes, Infinity stops, hit-stop + knockback, lunge), shots (wide, dolly zoom, crash zoom, orbit,
   over-the-shoulder, low, close-up busts, ECU eyes, manga panels, overhead, voxel flyover, whip), FX (Infinity ripple,
   Dismantle + the delayed building slide, Blue, Red, Black Flash, shockwave, debris, glass, dust, smoke, speed lines,
   domain barrier bloom, Mahoraga's wheel), graphic post (impact frames, manga screentone, kana), persistent damage
   (sliced tower + crater visible in every later shot) and the synthesized score/SFX. Not part of the film. */
(function () {
  'use strict';
  const HT = window.HT;
  const cut = HT.city.role('cutTower');      // NE of the main junction, on the avenue's north side
  const X0 = 4, Y0 = -5;                     // the fight happens in the main junction, the cut tower behind it (NE corner)
  const G = (dx, dy = 0, z = 0) => [X0 + dx, Y0 + dy, z];
  HT.fightScene({
    id: 'fighttest', act: 'test', title: 'Fight Test', dur: 30, transitionIn: { type: 'fade', dur: 0.6 },
    set: 'city', env: { time: 'dawn', snow: 0.4, wind: 0.35, camMaxDist: 30 },
    cast: {
      gojo: { char: 'gojo', at: G(-5), face: 'east', pose: 'pockets', costume: 'robe' },
      sukuna: { char: 'sukuna', at: G(14), face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.5 }, { name: 'cityEmpty', vol: 0.35 }, { name: 'snow', vol: 0.3 }],
    script: [
      // ---- 0–4 s establishing: dawn avenue, snow, a blinking signal; Sukuna walks in
      { t: 0, shot: 'static', cam: { x: X0 - 26, y: Y0 - 3, z: 1.7, yaw: Math.PI / 2 - 0.08, f: 380, shift: 18 } },
      { t: 0, card: 'place', text: 'SHINJUKU · DECEMBER 24 · 06:12', dur: 3.6 },
      { t: 0.3, sfx: 'crosswalkChirp', vol: 0.35, pan: 0.4 },
      { t: 0.6, who: 'sukuna', do: 'walk', to: G(5), style: 'normal', speed: 1.5 },
      { t: 1.8, sfx: 'crowCaw', vol: 0.3, pan: -0.6 },
      // ---- 4–6 dolly zoom on Gojo (the world stretches behind him)
      { t: 4, shot: 'dolly', who: 'gojo', yaw: 0.35, d0: 3.2, d1: 13, f0: 300, dur: 2, feetY: 330 },
      { t: 4.2, who: 'gojo', do: 'expr', eyes: 'narrow', face: 'smirk' },
      // ---- 6–8 standoff: Gojo sheds the robe, Sukuna's second eyes open
      { t: 6, shot: 'medium', on: ['gojo', 'sukuna'], size: 104, yaw: 0 },
      { t: 6.3, who: 'gojo', do: 'costume', costume: 'fight' },
      { t: 6.3, sfx: 'clothSnap', vol: 0.7, pan: -0.3 },
      { t: 6.3, fx: 'dust', at: 'gojo', n: 6, r: 1 },
      { t: 6.4, who: 'gojo', do: 'pose', pose: 'loose', dur: 0.3 },
      { t: 6.9, shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 },
      { t: 6.9, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 7.4, shot: 'medium', on: ['gojo', 'sukuna'], size: 100, yaw: 0 },
      // ---- 8–10 Sukuna attacks: two strikes stop on Infinity (ripples), crash zoom on the second
      { t: 8.0, who: 'sukuna', do: 'jab', target: 'gojo', hit: 'infinity' },
      { t: 8.6, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'infinity', strength: 3 },
      { t: 8.86, shot: 'crash', base: 'medium', on: ['gojo', 'sukuna'], target: 'gojo.chest', zoom: 2.2, dur: 0.2, size: 100 },
      { t: 8.9, kana: 'キィン', x: 250, y: 90, size: 3, dur: 0.8, style: 'ring' },
      // ---- 10–12 Gojo's counter: a palm strike launches Sukuna (impact frame), whip-pan follow
      { t: 9.7, shot: 'medium', on: ['gojo', 'sukuna'], size: 96, yaw: 0 },
      { t: 9.8, who: 'gojo', do: 'pose', pose: 'guard', dur: 0.15 },
      { t: 10.1, who: 'gojo', do: 'palm', target: 'sukuna', hit: 'hit', strength: 3, knock: 1.3, impact: 1 },
      { t: 10.45, kana: 'バキ', x: 420, y: 110, size: 3, dur: 0.7, style: 'impact' },
      { t: 10.5, fx: 'speedLines', mode: 'parallel', angle: 0, dur: 0.5 },
      { t: 11.0, shot: 'wide', on: ['gojo', 'sukuna'], size: 60, yaw: 0.35, blend: 0.2, blendEase: 'inOutQuad' },
      { t: 11.0, post: 'whip', dur: 0.2, dir: 1 },
      // ---- 12–14 Dismantle: a finger-gun slash; a beat later the tower behind Gojo slides apart
      { t: 12.0, who: 'sukuna', do: 'flick', target: 'gojo', hit: 'miss', space: false },
      { t: 12.2, fx: 'dismantle', from: [cut.x0 - 6, cut.y0 - 0.2, 53], to: [cut.x1 + 6, cut.y0 - 0.2, 24], cuts: 1 },
      { t: 12.2, sfx: 'shing', vol: 0.9 },
      { t: 12.4, shot: 'static', cam: { x: -12, y: -14, z: 1.7, yaw: 0.69, pitch: 0.42, f: 250 } },
      { t: 12.8, damage: { kind: 'slice', b: cut.id, zA: 50, zB: 28, dur: 1.3, slide: 15 } },
      { t: 12.8, sfx: 'slashSplit', vol: 1 },
      { t: 13.4, fx: 'dust', at: [(cut.x0 + cut.x1) / 2, cut.y0, 36], n: 14, r: 9 },
      { t: 13.5, fx: 'glass', at: [(cut.x0 + cut.x1) / 2, cut.y0, 38], n: 40 },
      // ---- 14–16 orbit: blows traded, a kick blocked, a hook through Infinity
      { t: 14.4, shot: 'orbit', center: 'mid', a0: -0.2, a1: 1.0, r: 8.5, height: 1.8, dur: 1.6, f: 440 },
      { t: 14.4, who: 'sukuna', do: 'kick', target: 'gojo', hit: 'infinity' },
      { t: 14.9, who: 'gojo', do: 'hook', target: 'sukuna', hit: 'block' },
      { t: 15.5, who: 'sukuna', do: 'round', target: 'gojo', hit: 'infinity', strength: 3 },
      // ---- 16–18 manga panels: both faces in screentone, hand signs, ゴゴゴ
      { t: 16.0, shot: 'panels', layout: 'diag', panels: [
        { shot: { shot: 'closeup', who: 'gojo', yaw: -0.2 }, tone: true, bust: { who: 'gojo', expr: 'smirk', eyes: 'glow' } },
        { shot: { shot: 'closeup', who: 'sukuna', yaw: 0.2 }, tone: true, bust: { who: 'sukuna', expr: 'grin', eyes2: 'open' }, slamAt: 0.25 },
      ] },
      { t: 16.0, sfx: 'panelSlam', vol: 0.8 },
      { t: 16.3, kana: 'ゴゴゴ', x: 320, y: 60, size: 3, dur: 1.6, style: 'rumble' },
      // ---- 18–20 Blue pulls Sukuna in, Red blasts him back: shockwave, debris, glass
      { t: 18.0, shot: 'wide', on: ['gojo', 'sukuna'], size: 64, yaw: 0.1 },
      { t: 18.0, who: 'gojo', do: 'blue' },
      { t: 18.3, fx: 'blueOrb', at: G(4, 0, 1.2), r: 0.7, dur: 1.0 },
      { t: 18.3, fx: 'debris', at: G(4, 0, 0), n: 18, speed: -6, size: 0.6 },
      { t: 18.35, who: 'sukuna', do: 'fly', to: G(2.2, 0, 0.4), dur: 0.55, pose: 'hitMid' },
      { t: 19.0, who: 'gojo', do: 'red' },
      { t: 19.4, fx: 'redOrb', at: G(1.4, 0, 1.3), r: 0.9, dir: [1, 0, 0] },
      { t: 19.4, who: 'sukuna', do: 'launch', vel: [16, 0, 4.5], dur: 0.9, spin: -6 },
      { t: 19.45, fx: 'shockwave', at: G(1.4, 0, 0), r: 9, strength: 2 },
      { t: 19.5, fx: 'glass', at: G(8, 18, 8), n: 30 },
      { t: 19.5, shake: 0.6 },
      // ---- 20–22 silence: both reset and charge (slow, wide, snow)
      { t: 20.0, shot: 'low', on: ['gojo'], size: 130, yaw: 0.25, lead: -120 },
      { t: 20.0, who: 'sukuna', do: 'place', at: G(16), face: 'west', pose: 'guardLow' },
      { t: 20.0, who: 'gojo', do: 'pose', pose: 'guardLow', dur: 0.4 },
      { t: 20.9, who: 'sukuna', do: 'run', to: G(3), speed: 13 },
      { t: 21.0, who: 'gojo', do: 'run', to: G(1), speed: 9 },
      // ---- 22.0 the colossal hit: Black Flash (impact frames, crater, shockwave, ドン)
      { t: 21.6, who: 'gojo', do: 'cross', target: 'sukuna', hit: 'hit', strength: 4, hitstop: 10, knock: 1.6, impact: 2, impactMode: '2tone', react: 'knockFly' },
      { t: 21.6, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'infinity', strength: 3, hitSfx: false, fxHit: false },
      { t: 21.87, shot: 'crash', base: 'medium', on: ['gojo', 'sukuna'], target: 'mid', zoom: 1.8, dur: 0.15, size: 110 },
      { t: 21.87, fx: 'blackFlash', at: G(2.3, 0, 1.45), dir: [1, 0, 0], scale: 1.4 },
      { t: 21.87, sfx: 'blackFlash', vol: 1 },
      { t: 21.9, fx: 'shockwave', at: G(2.3, 0, 0), r: 14, strength: 3 },
      { t: 21.9, fx: 'crater', at: G(2.3, 0, 0), r: 4 },
      { t: 21.9, damage: { kind: 'crater', x: X0 + 2.3, y: Y0, r: 4.5 } },
      { t: 21.9, fx: 'debris', at: G(2.3, 0, 0), n: 26, speed: 9, size: 0.7 },
      { t: 21.95, kana: 'ドン', x: 470, y: 120, size: 4, dur: 1.0, style: 'impact' },
      { t: 21.9, shake: 1.0 },
      // ---- 22–26 aftermath: overhead → voxel pull-back (the sliced tower and the crater persist)
      { t: 23.0, shot: 'overhead', center: [X0 + 8, 10, 0], h0: 120, h1: 200, dur: 1.5, yaw: 0.4, f: 420 },
      { t: 23.0, fx: 'smoke', at: G(2.3, 0, 0), r: 3, dur: 7 },
      { t: 24.5, shot: 'path', keys: [[0, X0 - 60, Y0 - 160, 60, 0.35, 0, 380], [1.6, X0 - 120, Y0 - 260, 120, 0.4, 0, 380]], shift: -60 },
      { t: 24.5, env: { set: 'voxel' } },
      // ---- 26–28 a domain glimpse and Mahoraga's wheel behind Sukuna
      { t: 26.0, env: { set: 'city' } },
      { t: 26.0, shot: 'wide', on: ['gojo', 'sukuna'], size: 70, yaw: 0 },
      { t: 26.0, who: 'sukuna', do: 'place', at: G(12), face: 'west', pose: 'loose' },
      { t: 26.0, who: 'gojo', do: 'place', at: G(-2), face: 'east', pose: 'loose' },
      { t: 26.1, fx: 'barrier', center: G(-2, 0, 0), r: 7, state: 'grow', dur: 1.8 },
      { t: 26.8, fx: 'wheel', at: G(12, 0, 2.5), notch: 1, turnAt: [27.2], dur: 1.6 },
      { t: 27.2, sfx: 'wheelClunk', vol: 0.9 },
      // ---- 28–30 close-ups and out
      { t: 28.0, shot: 'closeup', who: 'gojo', yaw: -0.2, bust: { expr: 'smirk', eyes: 'glow' } },
      { t: 29.0, shot: 'closeup', who: 'sukuna', yaw: 0.2, bust: { expr: 'grin', eyes2: 'open' } },
      { t: 29.4, post: 'black', dur: 0.6, in: 0.6 },
    ],
  });
})();
