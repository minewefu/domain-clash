/* ACT IV · 5 — a4_corridor (22 s). Canon ch. 233: Gojo pursues Sukuna into a building — a long office corridor
   (set 'corridor': x −1.4…1.4, y −3…37, ceiling 2.7 m). Sukuna rips a fire extinguisher off the wall and throws it: it
   stops dead on the Infinity and bursts — a white smokescreen. Mahoraga drops through the ceiling behind Gojo; he turns
   and blocks the blade with his arms. At the far end Sukuna takes Choso's Piercing Blood stance and fires Max Elephant's
   water through the smoke: Gojo throws an arm up at the last instant — impact frame — cut-away to the end wall scored by
   the jet (the wound is never shown). Mahoraga cuts again; Gojo slips aside into a doorway. Two against one: he grips his
   forearm (RCT slow now, his output falling) as Sukuna walks out of the smoke to stand by the crouching giant. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = [0.0, 3.0, 0], S0 = [0.25, 17.5, 0], M = [0.1, 1.55, 0], NICHE = [-1.05, 5.4, 0];
  const EXT_Y = 17.0, BURST = 3.95, BREAK = 7.8, FIRE = 10.62, WALL = [0.05, -2.92, 1.85];
  const PALMS = [0.28, 17.0, 1.4];                                  // Sukuna's palms in the stance (the jet's origin)
  HT.fightScene({
    id: 'a4_corridor', act: 'IV', title: 'The Corridor', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'corridor', env: { time: 'overcastIV', light: [-0.1, -0.85, 0.5], rim: C.mist, shadows: true },
    setOpts: { ceilingBreakAt: BREAK, hole: [M[0], M[1]], holeR: 1.2, extinguisher: { wall: 'e', y: EXT_Y }, emptyAt: 2.75 },
    cast: {
      gojo: { char: 'gojo', at: [0, -2.4, 1.2], face: 'north', pose: 'dash', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'south', pose: 'loose', costume: 'fight' },
      maho: { char: 'mahoraga', at: [M[0], M[1], 3.3], face: 'north', pose: 'maho_dive' },
    },
    ambience: [{ name: 'interior', vol: 0.5 }],
    script: [
      { t: 0, who: 'maho', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheel: false },                  // (the corridor is 2.7 m high: the wheel would clip)
      { t: 0, who: 'gojo', do: 'expr', face: 'grin', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      // ---- 0–2.2: the end door bursts in and Gojo lands in the corridor (from inside, looking back at the door)
      { t: 0, shot: 'static', cam: { x: 0.85, y: 9.6, z: 1.5, yaw: Math.PI + 0.06, f: 300, shift: 8 } },
      { t: 0.3, fx: 'debris', at: [0, -2.95, 1.1], n: 22, speed: 7, size: 0.18, dir: [0, 1, 0.2], spread: 0.6, mat: 'brick', dur: 1.4 },
      { t: 0.3, fx: 'dust', at: [0, -2.6, 1.0], n: 12, r: 1.2, size: 0.5, col: 'concrete', dir: [0, 1, 0], dur: 2.2 },
      { t: 0.3, sfx: 'wallCrash', vol: 0.9 }, { t: 0.3, shake: 0.45 },
      { t: 0.3, who: 'gojo', do: 'fly', to: G, dur: 0.4, pose: 'dash', ease: 'outQuad' },
      { t: 0.7, who: 'gojo', do: 'land' },
      { t: 0.75, sfx: 'footConcrete', vol: 0.5 },
      // ---- 2.2–4.2: behind him, down the corridor: at the far end Sukuna tears the extinguisher off the wall and throws it
      { t: 2.2, shot: 'static', cam: { x: -0.95, y: -0.4, z: 1.6, yaw: 0.05, f: 330, shift: 6 } },
      { t: 2.3, who: 'sukuna', do: 'face', face: 'east' },
      { t: 2.3, who: 'sukuna', do: 'pose', pose: 'catchFist', dur: 0.3 },
      { t: 2.75, sfx: 'clothSnap', vol: 0.4 }, { t: 2.75, sfx: 'block', vol: 0.35 },
      { t: 2.8, who: 'sukuna', do: 'face', face: 'south' },
      { t: 2.9, who: 'sukuna', do: 'a4ThrowObj' },
      { t: 3.4, fx: 'a4ext', from: [0.45, 17.2, 1.95], to: [0.05, G[1] + 0.85, 1.62], travel: 0.55, lift: 0.5 },
      { t: BURST, sfx: 'infinityStop', vol: 0.5 }, { t: BURST, sfx: 'extinguisherBurst', vol: 0.85, dur: 2.4 },   // audio (M4): was infinityStop 0.7 + boom + windGust
      { t: BURST, fx: 'infinityRipple', at: [0.05, G[1] + 0.8, 1.62], strength: 2, dir: [0, -1, 0] },
      { t: BURST, kana: 'バシュ', x: 330, y: 150, size: 3, dur: 0.7, style: 'pop' },
      { t: BURST, fx: 'a4powder', at: [0.0, G[1] + 0.9, 1.25], r: 1.7, grow: 0.45, n: 40, rise: 0.05, drift: [0, 0.3], alpha: 0.62, dur: 10.6, layer: ['behind', 'front'], splitWho: ['gojo', 'sukuna', 'maho'],
        tunnel: { from: PALMS, to: WALL, at: FIRE, w: 0.45 } },
      // ---- 4.2–7.8: in the white: his silhouette, still; muffled; the eyes narrow (the held breath)
      { t: 4.2, shot: 'static', cam: { x: 1.05, y: 6.4, z: 1.55, yaw: Math.PI + 0.3, f: 420, shift: 4 }, to: { x: 0.95, y: 5.9 }, dur: 3.6, ease: 'linear' },
      { t: 4.2, amb: 'interior', vol: 0.25, fade: 0.6 },
      { t: 5.6, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'narrow' },
      // ---- 7.8–9.4: the ceiling bursts behind him — Mahoraga drops, blade first; he turns and takes it on his arms
      { t: 7.8, shot: 'static', cam: { x: 0.95, y: 7.4, z: 1.35, yaw: Math.PI + 0.14, f: 340, shift: 10 } },
      { t: BREAK, who: 'maho', do: 'show' },
      { t: BREAK, who: 'maho', do: 'fly', to: M, dur: 0.28, pose: 'maho_dive', ease: 'inQuad' },
      { t: BREAK + 0.28, who: 'maho', do: 'pose', pose: 'maho_land', dur: 0.1 },
      { t: BREAK, sfx: 'collapse', vol: 0.6, dur: 1.2 }, { t: BREAK + 0.28, sfx: 'groundSlam', vol: 0.7 },
      { t: BREAK + 0.28, fx: 'dust', at: [M[0], M[1], 0.3], n: 12, r: 1.3, size: 0.45, col: 'concrete', dur: 2.2 },
      { t: BREAK + 0.1, who: 'gojo', do: 'face', face: 'south' },
      { t: BREAK + 0.12, who: 'gojo', do: 'pose', pose: 'block', dur: 0.12, ones: true },
      { t: BREAK + 0.3, who: 'maho', do: 'pose', pose: 'maho_slash', dur: 0.1 },
      { t: BREAK + 0.38, fx: 'blockSpark', at: [0.05, G[1] - 0.45, 1.95], strength: 3, dir: [0, 1, 0] },
      { t: BREAK + 0.38, sfx: 'swordRing', vol: 0.9 }, { t: BREAK + 0.38, sfx: 'block', vol: 0.8 }, { t: BREAK + 0.38, shake: 0.55 },
      { t: BREAK + 0.38, kana: 'ギィン', x: 290, y: 96, size: 3, dur: 0.7, style: 'ring' },
      { t: BREAK + 0.38, who: 'gojo', do: 'expr', face: 'grit', eyes: 'wide' },
      { t: BREAK + 0.9, fx: 'blockSpark', at: [0.05, G[1] - 0.45, 1.9], strength: 1, dir: [0, 1, 0] },
      // ---- 9.4–10.6: through the smoke at the far end: Choso's Piercing Blood stance — the water compressed between his palms
      { t: 9.4, shot: 'static', cam: { x: -0.75, y: 13.8, z: 1.3, yaw: 0.2, f: 480, shift: 6 } },
      { t: 9.45, who: 'sukuna', do: 'a4PbFire' },
      { t: FIRE - 0.5, fx: 'a4jet', from: 'sukuna.hand', to: WALL, charge: 0.5, hold: 0.4, w: 0.045, splash: false, sfx: false },
      { t: FIRE, sfx: 'blueCharge', vol: 0.35, pitch: 1.4, dur: FIRE - 9.47 }, { t: FIRE, sfx: 'waterJet', vol: 0.7 },   // audio (M4): the charge builds stance → fire (was 9.5 + the jet's default charge at 10.12)
      // ---- 10.6–11.0: FIRE — down the corridor from behind him: the jet bores through the smoke; Gojo throws an arm up
      { t: FIRE - 0.05, shot: 'static', cam: { x: 0.95, y: 21.0, z: 1.75, yaw: Math.PI + 0.05, f: 360, shift: 6 } },
      { t: FIRE, who: 'gojo', do: 'pose', pose: 'a4BlockBeam', dur: 0.06, ones: true },
      { t: FIRE + 0.3, post: 'impact', dur: 2 / 30, mode: '2tone', th: 118 },
      { t: FIRE + 0.3, sfx: 'hitH', vol: 0.8 }, { t: FIRE + 0.3, shake: 0.6 },
      // ---- 11.0–12.3: cut-away — the end wall behind him: the jet scores a line across the door, water and splinters
      { t: FIRE + 0.36, shot: 'static', cam: { x: 0.55, y: 1.2, z: 1.55, yaw: Math.PI - 0.05, f: 330, shift: 4 } },
      { t: FIRE + 0.36, who: 'gojo', do: 'hide' }, { t: FIRE + 0.36, who: 'maho', do: 'hide' },
      { t: FIRE + 0.36, fx: 'a4flySlash', from: [0.6, -2.9, 2.2], to: [-0.8, -2.9, 1.45], travel: 0.01, w: 0.3 },
      { t: FIRE + 0.36, fx: 'debris', at: [0, -2.85, 1.8], n: 16, speed: 4, size: 0.12, dir: [0, 1, 0], spread: 0.8, mat: 'brick', dur: 1.2, vol: 0.45 },   // audio (M4): vol (was the default 0.8)
      { t: FIRE + 0.36, fx: 'glass', at: [0, -2.85, 1.8], n: 22, speed: 3, dir: [0, 1, 0.1], size: 0.12, vol: 0.45 },   // audio (M4): vol (was the default 0.85)
      { t: FIRE + 0.36, sfx: 'waterSpray', vol: 0.55, dur: 0.9 },   // audio (M4): the jet scoring the end wall (was shing)
      { t: 12.3, who: 'gojo', do: 'show' }, { t: 12.3, who: 'maho', do: 'show' },
      // ---- 12.3–14.0: his face — shock, then the grit of it (the arm stays out of frame)
      { t: 12.3, shot: 'closeup', who: 'gojo', yaw: Math.PI + 0.45, dist: 6, f: 820, bust: { expr: 'shock', eyes: 'wide', sweat: 0.6 }, size: 214, bg: 'haze', haze: C.mist, dim: 0.55 },
      { t: 13.1, shot: 'closeup', who: 'gojo', yaw: Math.PI + 0.45, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'narrow', sweat: 0.6 }, size: 214, bg: 'haze', haze: C.mist, dim: 0.55 },
      // ---- 14.0–15.8: Mahoraga cuts again — he slips aside into a doorway; the blade tears the wall where he stood
      { t: 14.0, shot: 'static', cam: { x: 0.9, y: 11.2, z: 1.6, yaw: Math.PI + 0.1, f: 320, shift: 8 } },
      { t: 14.0, who: 'gojo', do: 'place', at: G, face: 'south', pose: 'a4GripArm' },
      { t: 14.0, who: 'maho', do: 'place', at: M, face: 'north', pose: 'maho_land' },
      { t: 14.1, who: 'maho', do: 'pose', pose: 'maho_slashA', dur: 0.3 },
      { t: 14.55, who: 'gojo', do: 'blink', to: NICHE, face: 'east' },
      { t: 14.55, sfx: 'blink', vol: 0.5 },
      { t: 14.6, who: 'maho', do: 'pose', pose: 'maho_slashEnd', dur: 0.08, ones: true },
      { t: 14.62, fx: 'dismantle', from: [1.35, 3.8, 2.2], to: [1.35, 2.2, 0.4], linger: 0.8 },
      { t: 14.62, fx: 'debris', at: [1.3, 3.0, 1.2], n: 14, speed: 5, size: 0.15, dir: [-1, 0, 0.2], mat: 'brick', dur: 1.2 },
      { t: 14.62, sfx: 'mahoSlash', vol: 0.8 }, { t: 14.62, shake: 0.4 },
      // ---- 15.8–22: two against one — he grips his forearm in the doorway (RCT, slow now); Sukuna walks out of the
      //      thinning smoke to stand by the crouching giant (the held breath)
      { t: 15.8, shot: 'static', cam: { x: 1.1, y: 12.8, z: 1.45, yaw: Math.PI - 0.12, f: 330, shift: 10 }, to: { y: 12.2 }, dur: 6.2, ease: 'linear' },
      { t: 15.8, who: 'gojo', do: 'place', at: NICHE, face: 'east', pose: 'a4GripArm' },
      { t: 15.9, fx: 'rctGlow', at: 'gojo.hand2', r: 0.14, dur: 5.8, steam: true, vol: 0.3 },
      { t: 15.8, who: 'gojo', do: 'expr', face: 'grit', eyes: 'narrow' },
      { t: 15.8, who: 'sukuna', do: 'place', at: [0.35, 10.2, 0], face: 'south', pose: 'walkOut' },
      { t: 16.2, who: 'sukuna', do: 'walk', to: [0.55, 4.8], speed: 1.3 },
      { t: 20.4, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.4 },
      { t: 16.4, sfx: 'footConcrete', vol: 0.3, dur: 4 },
      { t: 18.5, who: 'maho', do: 'pose', pose: 'maho_kneel', dur: 0.8 },
      { t: 19.8, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
    ],
  });
})();
