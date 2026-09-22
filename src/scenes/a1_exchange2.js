/* ACT I · 11 — a1_exchange2 (24 s). Sukuna walks out of the smoking hole, dusting off, unhurried. He points a
   finger-gun: Dismantle — a hairline flash across the NE tower behind Gojo; a beat later the tower slides apart along
   the cut (ledger `slice`, canon ch. 224). Gojo catches Sukuna's next fist and flies them both up into the falling top
   half (they vanish into its glass face). Music drops to taiko only under the slide. */
(function () {
  'use strict';
  const HT = window.HT, city = HT.city, C = HT.C;
  const HB = city.role('holeBuilding'), CT = city.role('cutTower');
  const HOLE = [HB.x1, (HB.y0 + HB.y1) / 2 + 6, 0];
  const G0 = [-1.6, -3, 0];
  HT.fightScene({
    id: 'a1_exchange2', act: 'I', title: 'Dismantle', dur: 24, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'dawn', snow: 0.42, snowFall: 0.25, wind: 0.5, camMaxDist: 26 },
    cast: {
      gojo: { char: 'gojo', at: G0, face: 'south', pose: 'frontPockets', costume: 'fight' },
      sukuna: { char: 'sukuna', at: [HOLE[0] + 0.6, HOLE[1], 0], face: 'east', pose: 'walkOut', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.4 }, { name: 'rubble', vol: 0.35 }],
    script: [
      // 1. out of the smoke: Sukuna walks out of the hole, dusting off, unhurried
      { t: 0, shot: 'static', cam: { x: HOLE[0] + 9, y: HOLE[1] + 3, z: 1.2, yaw: -Math.PI / 2 - 0.35, f: 380, shift: 40 } },
      { t: 0, fx: 'smoke', at: [HOLE[0] + 0.6, HOLE[1], 3.2], rate: 6, life: 5, rise: 2.1, size: 0.55, grow: 1.7, col: 'ash', wind: 0.9, dur: 8 },
      { t: 0.8, who: 'sukuna', do: 'walk', to: [HOLE[0] + 6, HOLE[1] + 4], speed: 1.1 },
      { t: 1.2, sfx: 'footConcrete', vol: 0.4, dur: 3, pitch: 0.81 },
      { t: 4.8, who: 'sukuna', do: 'face', toward: 'gojo' },
      { t: 4.9, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // 2. the finger-gun (medium on Sukuna; the NE tower far behind Gojo in the reverse)
      { t: 5.6, shot: 'medium', on: ['sukuna'], size: 124, yaw: -0.55, lead: -70 },
      { t: 6.0, who: 'sukuna', do: 'fingerGun' },
      { t: 6.6, sfx: 'shing', vol: 0.95 },
      { t: 6.6, fx: 'dismantle', from: [CT.x0 - 8, CT.y0 - 0.3, 53], to: [CT.x1 + 8, CT.y0 - 0.3, 24], cuts: 1, linger: 2.4 },
      { t: 6.62, post: 'flash', dur: 0.08, col: C.white },
      // 3. reverse: Gojo in the foreground (unmoved, hands in pockets), the tower behind him — a beat — it slides
      { t: 6.8, shot: 'static', cam: { x: -9, y: -16, z: 1.6, yaw: 0.52, pitch: 0.38, f: 270 } },
      { t: 6.8, who: 'gojo', do: 'place', at: [-2, -5, 0], face: 'north', pose: 'back' },
      { t: 6.8, who: 'gojo', do: 'view', view: 'back' },
      { t: 8.0, damage: { kind: 'slice', b: CT.id, zA: 50, zB: 28, dur: 1.6, slide: 16 } },
      { t: 8.0, sfx: 'slashSplit', vol: 1 },
      { t: 8.3, sfx: 'buildingSlide', vol: 0.8, dur: 1.6 },
      { t: 8.6, fx: 'glass', at: [(CT.x0 + CT.x1) / 2, CT.y0, 38], n: 50, speed: 5, dir: [0, -1, 0] },
      { t: 8.7, fx: 'dust', at: [(CT.x0 + CT.x1) / 2, CT.y0, 38], n: 18, r: 10, size: 2.5 },
      { t: 8.0, shake: 0.25 },
      // 4. Sukuna rushes in; Gojo turns and catches the fist (medium, both)
      { t: 10.8, shot: 'medium', on: ['gojo', 'sukuna'], size: 116, yaw: 0.3 },
      { t: 10.8, who: 'gojo', do: 'place', at: [-2, -5, 0], face: 'east', pose: 'loose' },
      { t: 10.8, who: 'gojo', do: 'view', view: 'side' },
      { t: 10.8, who: 'sukuna', do: 'place', at: [6, -5, 0], face: 'west', pose: 'guardLow' },
      { t: 11.0, who: 'sukuna', do: 'cross', target: 'gojo', hit: 'block', react: false, hitSfx: 'block', strength: 3 },
      { t: 11.16, who: 'gojo', do: 'catchFist' },
      { t: 11.35, kana: 'ガッ', x: 330, y: 120, size: 3, dur: 0.8, style: 'impact' },
      { t: 11.4, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      // 5. up: Gojo flies them both into the falling top half (orbit rising around them, glass, debris)
      { t: 12.8, shot: 'orbit', center: 'mid', a0: 0.2, a1: 1.3, r: 9, height: 2.2, dur: 2.8, f: 400, track: true },
      { t: 13.0, who: 'gojo', do: 'fly', to: [20, 10, 34], dur: 2.2, pose: 'flyGrab', ease: 'inCubic' },
      { t: 13.0, who: 'sukuna', do: 'fly', to: [21.5, 10.4, 33.6], dur: 2.2, pose: 'hitHigh', ease: 'inCubic' },
      { t: 13.0, sfx: 'dashAir', vol: 0.8 },
      { t: 13.0, who: 'gojo', do: 'trail', dur: 2.2, n: 3, tint: C.ice },
      // 6. wide: two specks crash into the glass face of the sliding top half — it starts to fall
      { t: 15.8, shot: 'static', cam: { x: -12, y: -40, z: 4, yaw: 0.38, pitch: 0.32, f: 260 } },
      { t: 15.8, who: 'gojo', do: 'place', at: [22, 14, 40], face: 'north', pose: 'flyGrab' },
      { t: 15.8, who: 'sukuna', do: 'place', at: [23, 14.5, 39.6], face: 'south', pose: 'hitHigh' },
      { t: 16.0, who: 'gojo', do: 'fly', to: [24, 17, 44], dur: 0.35, pose: 'flyGrab' },
      { t: 16.0, who: 'sukuna', do: 'fly', to: [25, 17.5, 43.6], dur: 0.35, pose: 'hitHigh' },
      { t: 16.35, who: 'gojo', do: 'hide' }, { t: 16.35, who: 'sukuna', do: 'hide' },
      { t: 16.35, fx: 'glass', at: [24.5, 17.5, 44], n: 40, speed: 4 },
      { t: 16.35, sfx: 'glassShatter', vol: 0.8 },
      { t: 17.4, sfx: 'steelGroan', vol: 0.7, dur: 3 },
      { t: 17.4, fx: 'dust', at: [(CT.x0 + CT.x1) / 2 + 16, CT.y0, 44], n: 14, r: 10, size: 2.4, dur: 5 },
      // the sliced tower from down the avenue: the cut, the displaced top half where they vanished (slow push)
      { t: 21.5, shot: 'static', cam: { x: -12, y: -14, z: 1.7, yaw: 0.69, f: 250, shift: 110 }, to: { x: -11, y: -12.5 }, dur: 2.5, ease: 'linear' },
    ],
  });
})();
