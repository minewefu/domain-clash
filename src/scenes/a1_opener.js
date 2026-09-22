/* ACT I · 6 — a1_opener (16 s). Canon ch. 223, seen from afar: far to the south a violet point swells on the horizon
   (Shibuya); silence; a line of violet light crosses the skyline toward Sukuna's tower and the city along it simply
   ceases (the ledger's sweeping canyon); the tower's lower floors vanish and it sinks into its own dust. From the dust,
   Sukuna drops to the street, unhurried, regrowing (a brief RCT glow — no wounds shown), grinning wider. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city;
  const TW = city.role('sukunaTower');
  const TX = (TW.x0 + TW.x1) / 2, TY = (TW.y0 + TW.y1) / 2;
  const P0 = [-250, -420, 22], P1 = [-328, 104, 30];          // the path of the 200% Purple, ending at the tower's feet
  const LAND = [TX + 8, 111, 0];                              // the street south of the tower (EW street at y = 112)
  HT.fightScene({
    id: 'a1_opener', act: 'I', title: 'Hollow Purple, from Afar', dur: 16, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.4, snowFall: 0.25, wind: 0.6, fogFar: 1400 },
    cast: { sukuna: { char: 'sukuna', at: [TX, TW.y0 + 1.1, TW.h], face: 'south', pose: 'back', costume: 'haori' } },
    ambience: [{ name: 'sky', vol: 0.5 }, { name: 'wind', vol: 0.4 }],
    script: [
      // 1. from behind Sukuna on the roof: far to the south, a violet point swells on the horizon — silence
      { t: 0, shot: 'static', cam: { x: TX + 1.2, y: TW.y0 + 6.5, z: TW.h + 2.2, yaw: Math.PI - 0.05, f: 520, shift: 67 } },
      { t: 0.1, who: 'sukuna', do: 'view', view: 'back' },
      { t: 0.6, fx: 'purple', mode: 'fire', at: [-240, -760, 185], from: [-240, -760, 185], to: [-240, -760, 185], r: 30, form: 1.0, sep: 40, travel: 1.3, grow: 0.6, hold: 0.1, fade: 0.3, dur: 3.4, sfx: false, layer: 'sky' },
      // 2. from high behind its origin, looking straight down its path: the violet line crosses the city toward the tower;
      //    everything along it ceases (the canyon opens behind the front)
      { t: 3.0, shot: 'static', cam: { x: -226, y: -520, z: 120, yaw: -0.13, pitch: -0.2, f: 300 } },
      { t: 3.2, fx: 'purple', mode: 'fire', at: P0, from: P0, to: P1, r: 30, form: 0.01, travel: 2.4, grow: 0.15, hold: 0.1, fade: 0.5, dur: 3.2, layer: 'sky', sfx: false },
      { t: 3.2, sfx: 'purpleCharge', vol: 0.3, pitch: 0.7, dur: 2.6, lp: 1400 },
      { t: 3.2, damage: { kind: 'canyon', x0: P0[0], y0: P0[1], x1: P1[0], y1: P1[1], w: 44, depth: 26, dur: 2.4 } },
      { t: 3.2, sfx: 'purpleErase', vol: 0.55, pan: -0.5, panTo: 0.2, dur: 3, lp: 900, wet: 1.6 },
      // 3. the tower: its lower floors are gone — it sinks into its own dust
      { t: 5.8, shot: 'static', cam: { x: -290, y: -150, z: 60, yaw: -0.139, f: 280, shift: 20 } },
      { t: 5.6, damage: { kind: 'collapse', b: TW.id, dur: 3.2 } },
      { t: 5.8, who: 'sukuna', do: 'hide' },
      { t: 5.7, sfx: 'collapse', vol: 0.9, dur: 3.5 },
      { t: 5.9, fx: 'dust', at: [TX, TY, 8], n: 34, r: 34, size: 11, rise: 2.4, dur: 8.5, layer: 'behind' },
      { t: 6.4, fx: 'smoke', at: [TX, TY, 0], rate: 7, life: 6, rise: 4, size: 9, grow: 2.2, dark: false, wind: 2.5, dur: 9.6 },
      { t: 6.6, fx: 'smoke', at: [TX - 12, TY + 14, 0], rate: 4, life: 5, rise: 3, size: 7, grow: 2, dark: false, wind: 2.5, dur: 9.4 },
      { t: 6.2, fx: 'debris', at: [TX, TY, 30], n: 30, speed: 12, size: 2.2 },
      { t: 6.0, shake: 0.35 },
      // 4. hold on the dust (the breath)
      { t: 9.4, shot: 'static', cam: { x: TX + 60, y: 40, z: 6, yaw: -0.35, f: 360, shift: -8 }, to: { x: TX + 50, y: 52 }, dur: 6.6, ease: 'linear' },
      // 5. out of the dust: Sukuna drops to the street, unhurried; a brief RCT glow; the grin widens
      { t: 11.1, shot: 'static', cam: { x: LAND[0] + 2.6, y: LAND[1] - 5.2, z: 0.8, yaw: -0.46, f: 330, shift: 64 } },
      { t: 11.2, who: 'sukuna', do: 'place', at: [LAND[0], LAND[1], 14], face: 'south', pose: 'fall', costume: 'haori' },
      { t: 11.2, who: 'sukuna', do: 'show' },
      { t: 11.2, who: 'sukuna', do: 'view', view: 'side' },
      { t: 11.2, who: 'sukuna', do: 'fly', to: LAND, dur: 0.55, pose: 'fall', ease: 'inQuad' },
      { t: 11.75, who: 'sukuna', do: 'dropLand' },
      { t: 11.75, fx: 'shockwave', at: LAND, r: 5, strength: 1 },
      { t: 11.75, fx: 'dust', at: LAND, n: 10, r: 3 },
      { t: 11.75, sfx: 'groundSlam', vol: 0.7 },
      { t: 12.3, fx: 'rctGlow', at: [LAND[0], LAND[1], 1.2], dur: 1.6 },
      { t: 12.3, sfx: 'rctHeal', vol: 0.5 },
      { t: 13.8, shot: 'closeup', who: 'sukuna', yaw: Math.PI - 0.25, dist: 6, f: 800, bust: { expr: 'grin', eyes: 'narrow', eyes2: 'open', costume: 'haori' }, size: 210, bg: 'haze' },
    ],
  });
})();
