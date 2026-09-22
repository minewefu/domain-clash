/* ACT I · 12 — a1_clash (18 s). Inside the falling top half of the tower: a dark office floor tilting as it falls, a
   door between them (canon ch. 224). Both punch at once — the door bursts; outside, the falling half is flattened in
   a colossal clash shockwave (ドン); white. The dust settles over a new crater; two silhouettes walk out of it,
   unhurt. The breath at the end of Act I. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city, C = HT.C;
  const CT = city.role('cutTower');
  const CX = (CT.x0 + CT.x1) / 2, CY = (CT.y0 + CT.y1) / 2;
  HT.fightScene({
    id: 'a1_clash', act: 'I', title: 'The First Clash', dur: 18, transitionIn: { type: 'cut', dur: 0 },
    set: 'office', setOpts: { roll0: 0.06, rollRate: 0.05, fallAt: 0, doorX: 320, doorBreakAt: 3.62 },
    env: { time: 'dawn', snow: 0.42, wind: 0.3, shadows: false },
    cast: {
      gojo: { char: 'gojo', at: [-1.9, 0, 0], face: 'east', pose: 'guard', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [1.9, 0, 0], face: 'west', pose: 'guard', costume: 'fight' },
    },
    ambience: [{ name: 'interior', vol: 0.4 }],
    script: [
      // 1. inside: the floor tilts; the door between them; each sees the other's shadow through it (medium)
      { t: 0, shot: 'static', cam: { x: 0, y: -6.2, z: 1.25, yaw: 0, f: 560, shift: 78 } },
      { t: 0.2, sfx: 'steelGroan', vol: 0.6, dur: 3 },
      { t: 1.4, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 1.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 2. the double punch through the door (one frame of silence, then everything)
      { t: 3.0, who: 'gojo', do: 'punchBoth', target: 'sukuna', hit: 'block', react: false, hitSfx: false, fxHit: false, space: false, speed: 1.1 },
      { t: 3.0, who: 'sukuna', do: 'punchBoth', target: 'gojo', hit: 'block', react: false, hitSfx: false, fxHit: false, space: false, speed: 1.1 },
      { t: 3.62, fx: 'debris', at: [0, 0, 1.3], n: 26, speed: 6, size: 0.25, mat: 'brick', dur: 1.6 },
      { t: 3.62, fx: 'hitSpark', at: [0, 0, 1.35], strength: 3, size: 2.4 },
      { t: 3.62, post: 'impact', dur: 2 / 30, mode: '2tone' },
      { t: 3.62, kana: 'ドン', x: 320, y: 110, size: 5, dur: 1.1, style: 'impact' },
      { t: 3.62, sfx: 'hitHuge', vol: 1 },
      { t: 3.62, shake: 1.0 },
      // 3. outside: the falling half is flattened — the colossal clash shockwave rolls over the junction
      { t: 4.2, env: { set: 'city' } },
      { t: 4.2, who: 'gojo', do: 'hide' }, { t: 4.2, who: 'sukuna', do: 'hide' },
      { t: 4.2, shot: 'static', cam: { x: -12, y: -14, z: 1.7, yaw: 0.69, f: 250, shift: 110 } },
      { t: 4.2, damage: { kind: 'collapse', b: CT.id, dur: 1.0 } },
      { t: 4.2, damage: { kind: 'crater', x: CX, y: CY - 6, r: 16 } },
      { t: 4.2, fx: 'shockwave', at: [CX, CY - 6, 0], r: 60, strength: 3, dur: 1.6 },
      { t: 4.2, fx: 'dust', at: [CX, CY - 6, 4], n: 40, r: 30, size: 5, rise: 2.2, dur: 7 },
      { t: 4.3, fx: 'debris', at: [CX, CY - 6, 10], n: 40, speed: 16, size: 1.4, up: 0.9, dur: 3.5 },
      { t: 4.2, sfx: 'collapse', vol: 1, dur: 4 },
      { t: 4.2, sfx: 'boom', vol: 1 },
      { t: 5.0, post: 'white', in: 0.5, dur: 1.5 },
      { t: 6.5, sfx: 'tinnitus', vol: 0.18, dur: 2.5 },
      { t: 5.4, amb: 'interior', vol: 0, fade: 0.4 },
      { t: 6.5, amb: 'wind', vol: 0.35, fade: 1.5 }, { t: 6.5, amb: 'rubble', vol: 0.3, fade: 1.5 },
      // 4. white → the dust settles over a new crater; two silhouettes walk out of it, unhurt (hold)
      { t: 6.5, shot: 'static', cam: { x: CX - 1, y: CY - 35, z: 1.1, yaw: 0.02, f: 430, shift: 50 } },
      { t: 6.5, fx: 'smoke', at: [CX, CY - 6, 0], rate: 5, life: 5, rise: 1.2, size: 2.4, grow: 2, dark: false, wind: 0.5, dur: 11.5 },
      { t: 6.5, who: 'gojo', do: 'place', at: [CX - 3, CY - 17, 0], face: 'south', pose: 'walkOut', costume: 'fight' },
      { t: 6.5, who: 'sukuna', do: 'place', at: [CX + 3, CY - 17, 0], face: 'south', pose: 'walkOut', costume: 'fight' },
      { t: 6.5, who: 'gojo', do: 'show' }, { t: 6.5, who: 'sukuna', do: 'show' },
      { t: 8.0, who: 'gojo', do: 'walk', to: [CX - 4.5, CY - 27.5], style: 'front', speed: 1.0 },
      { t: 8.4, who: 'sukuna', do: 'walk', to: [CX + 4.5, CY - 27.5], style: 'front', speed: 1.0 },
      { t: 8.0, who: 'gojo', do: 'view', view: 'front' }, { t: 8.4, who: 'sukuna', do: 'view', view: 'front' },
      { t: 13.6, who: 'gojo', do: 'pose', pose: 'frontPockets', dur: 0.6 },
      { t: 13.6, who: 'gojo', do: 'expr', face: 'smile', eyes: 'glow' },
      { t: 14.0, who: 'sukuna', do: 'pose', pose: 'frontGrin', dur: 0.6 },
      { t: 14.0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 16.4, post: 'black', in: 1.6, dur: 1.6 },
    ],
  });
})();
