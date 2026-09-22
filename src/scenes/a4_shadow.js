/* ACT IV · 1 — a4_shadow (22 s). Act card "ACT IV · ADAPTATION". Canon ch. 232–233: the wheel that fell from Sukuna's
   head spins on the asphalt (the adaptation is complete); Sukuna, still reeling from the Black Flash, stands with his
   head down; his shadow crawls under Gojo — Mahoraga's arms erupt from it, clamp Gojo's upper body and drag him down to
   his knees; Mahoraga rises behind him and its sword cuts through the Infinity across his shoulder (impact frame,
   cut-away: dust and a scrap of black cloth — no wound). The monitoring room: Yuji and Yuta cry out (silhouettes, no
   voices). Back on the street: Gojo on his knees in the ink, the giant over him. Silence first; the breath at the end. */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A4;
  const G = A.START_G, S0 = A.START_S;
  const M = [G[0] - 1.7, G[1] + 0.35, 0];                                   // Mahoraga rises behind Gojo (west of him)
  const WHEEL = [(G[0] + S0[0]) / 2 + 0.3, G[1] - 0.4, 0];                  // the fallen wheel, spinning on the asphalt
  const SH = A.jointWorld('gojo', 'a4KneelPinned', 'naS', G, 'east');        // Gojo's shoulder once he is on his knees
  const CUT = [SH[0] - 0.05, SH[1], SH[2] + 0.02];
  const ENV = A.ENV, ROOM_T = 13.6, BACK_T = 17.2;
  // the monitoring room (HT.A4.ROOM: the watchers in an arc north of the monitor pillar, facing it)
  const WATCH = A.watchers({
    kusakabe: { pose: 'stand' },
    yuji: { pose: 'jump', t0: ROOM_T + 0.35, then: 'shout', from: 'sit' },
    yuta: { poses: [[-1e9, 'sit'], [ROOM_T + 0.7, 'rise'], [ROOM_T + 1.0, 'shout']], dur: 0.25 },
    hakari: { pose: 'lean' }, kashimo: { pose: 'sit' }, maki: { pose: 'stand' },
  });
  HT.fightScene({
    id: 'a4_shadow', act: 'IV', title: 'The Shadow', dur: 22, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: ENV,
    setOpts: { command: {
      // Mei Mei's crow feed: a high crow's-eye view of the junction's west arm (live: the kneeling Gojo, the giant)
      feed: { cam: { x: G[0] + 9, y: G[1] - 15, z: 8, yaw: -0.55, pitch: -0.3, f: 300 }, env: { time: 'overcastIV', snow: 0.22 },
        figures: [{ char: 'gojo', at: G, pose: 'a4KneelHit', face: 1, costume: 'fight' }, { char: 'mahoraga', at: M, pose: 'maho_slashEnd', face: 1 }, { char: 'sukuna', at: S0, pose: 'a4KoStand', face: -1, costume: 'fight' }] },
      watchers: WATCH, glowK: 3.2,
    } },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'a4KoStand', costume: 'fight' },
      maho: { char: 'mahoraga', at: M, face: 'east', pose: 'maho_idle' },
    },
    ambience: [{ name: 'wind', vol: 0.45 }, { name: 'rubble', vol: 0.22 }],
    init() { if (HT.SETS.command && HT.SETS.command.init) HT.SETS.command.init(this, {}); }, // bake the room's light once
    script: [
      { t: 0, who: 'maho', do: 'hide' },
      { t: 0, who: 'maho', do: 'expr', wheelAngle: 180, wheelGlow: 0.35 },     // four notches: adapted to the Infinity
      { t: 0, who: 'gojo', do: 'expr', face: 'smirk', eyes: 'glow' },
      { t: 0, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'closed' },
      // ---- 0–2.4: the act card on black
      { t: 0, card: 'act', text: 'ACT IV', sub: 'ADAPTATION', bg: 'black', dur: 2.6 },
      { t: 0, post: 'black', hold: true, dur: 2.4 },
      { t: 0.2, sfx: 'actCard', vol: 0.5 },
      // ---- 2.4–4.6: the wide, held: the wreck under a heavy sky, the viaduct's end beyond; the wheel spinning between them
      { t: 0, shot: 'static', cam: { x: -12.6, y: -9.4, z: 1.4, yaw: -1.08, f: 400, shift: 34 } },
      { t: 0, fx: 'wheel', mode: 'spin', at: WHEEL, r: 0.42, spinRate: 3.2, dur: 6.4 },
      // ---- 4.6–6.5: at ground level: Sukuna's shadow crawls across the asphalt under Gojo; the wheel sinks into it
      { t: 4.6, shot: 'static', cam: { x: (G[0] + S0[0]) / 2 + 0.3, y: G[1] - 5.8, z: 1.5, yaw: 0.02, pitch: -0.28, f: 330 } },
      { t: 4.7, fx: 'shadowPool', at: [S0[0] - 0.3, S0[1] + 0.1, 0], r: 1.6, grow: 0.5, out: 0.4, tendrils: 9, dur: 17.2, sfx: false },
      { t: 5.1, fx: 'shadowPool', at: [(G[0] + S0[0]) / 2, G[1] + 0.1, 0], r: 1.5, grow: 0.5, out: 0.4, tendrils: 6, dur: 16.8, sfx: false },
      { t: 5.5, fx: 'shadowPool', at: [G[0] - 0.4, G[1] + 0.2, 0], r: 2.3, grow: 0.6, out: 0.5, tendrils: 9, dur: 16.4 },
      { t: 4.8, sfx: 'heartbeat', vol: 0.3 },
      { t: 5.9, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'narrow' },
      // ---- 6.5: the arms erupt behind him and clamp his upper body (side medium)
      { t: 6.45, shot: 'static', cam: { x: G[0] + 0.5, y: G[1] - 5.6, z: 1.25, yaw: 0.02, f: 420, shift: 34 } },
      { t: 6.5, fx: 'a4arm', layer: 'front', base: [G[0] - 0.55, G[1] - 0.35, 0], grip: 'gojo.chest', gripOff: [0.1, -0.2, 0.06], elbow: [-0.22, -0.1, 0.05], dur: 2.8, sink: [[0.9, 0], [1.4, -0.05]] },
      { t: 6.55, fx: 'a4arm', layer: 'behind', base: [G[0] - 0.5, G[1] + 0.45, 0], grip: 'gojo.chest', gripOff: [0.02, 0.2, 0.12], elbow: [-0.25, 0.1, 0.05], dur: 2.75, sink: [[0.85, 0], [1.35, -0.05]] },
      { t: 6.5, who: 'gojo', do: 'pose', pose: 'a4Pinned', dur: 0.1, ones: true },
      { t: 6.5, who: 'gojo', do: 'expr', face: 'grit', eyes: 'wide' },
      { t: 6.5, sfx: 'shadowRise', vol: 0.95 }, { t: 6.56, sfx: 'hitM', vol: 0.8 }, { t: 6.56, sfx: 'clothSnap', vol: 0.5 },
      { t: 6.56, kana: 'ガッ', x: 236, y: 150, size: 3, dur: 0.8, style: 'impact' },
      { t: 6.56, shake: 0.4 },
      // ---- 7.4–9.3: high three-quarter: they haul him down to his knees; the ink climbs his legs
      { t: 7.4, shot: 'static', cam: { x: G[0] + 3.4, y: G[1] - 3.4, z: 3.5, yaw: -0.78, pitch: -0.42, f: 420 } },
      { t: 7.6, who: 'gojo', do: 'pose', pose: 'a4KneelPinned', dur: 0.3, ease: 'inQuad' },
      { t: 7.6, fx: 'a4ink', who: 'gojo', h: 0.3, grow: 0.5, dur: 14.4 },
      { t: 7.9, fx: 'dust', at: [G[0] + 0.3, G[1] - 0.2, 0.05], n: 5, r: 0.8, size: 0.22, col: 'dark', dur: 0.9 },
      { t: 7.9, sfx: 'bodyFall', vol: 0.75 }, { t: 7.9, sfx: 'groundSlam', vol: 0.35 },
      { t: 7.9, shake: 0.3 },
      // ---- 9.3–10.4: the held breath: his face (the Infinity has never failed him)
      { t: 9.3, who: 'sukuna', do: 'hide' }, { t: 10.4, who: 'sukuna', do: 'show' },
      { t: 9.3, shot: 'closeup', who: 'gojo', yaw: -1.25, dist: 6, f: 820, bust: { expr: 'strain', eyes: 'wide', sweat: 0.5 }, size: 214, bg: 'haze', haze: C.shadow, dim: 0.55 },
      { t: 9.3, sfx: 'wheelTurn', vol: 0.25 },
      // ---- 10.4–12.0: low front: Mahoraga rises out of the pool behind him and brings the sword down THROUGH the Infinity
      { t: 10.4, shot: 'static', cam: { x: G[0] + 2.8, y: G[1] - 3.6, z: 0.5, yaw: -0.74, pitch: 0.3, f: 330 } },
      { t: 10.4, fx: 'a4emerge', char: 'mahoraga', at: M, face: 'east', poses: [[0, 'maho_emerge'], [0.35, 'maho_kneel'], [0.6, 'maho_idle']], z: [[0, -2.4], [0.55, 0]], opts: { wheelAngle: 180, wheelGlow: 0.35 }, dur: 0.62, lipW: 0.3 },
      { t: 10.4, fx: 'shadowPool', at: [M[0], M[1], 0], r: 1.7, grow: 0.2, out: 0.4, tendrils: 7, dur: 1.6, sfx: false },
      { t: 10.4, sfx: 'shadowRise', vol: 0.7 },
      { t: 10.42, kana: 'ゴゴゴ', x: 470, y: 60, size: 2, dur: 1.4, style: 'rumble' },
      { t: 10.5, who: 'maho', do: 'mahoSlash', target: 'gojo', hit: 'hit', space: false, rootScale: 0.25, react: false, hitSfx: false, fxHit: false, impact: 2, impactMode: '2tone', hitstop: 8 },
      { t: 11.02, who: 'maho', do: 'show' },
      { t: 11.27, fx: 'a4infCut', at: CUT, angle: -1.05, r: 0.8 },
      { t: 11.27, who: 'gojo', do: 'pose', pose: 'a4KneelHit', dur: 0.08, ones: true },
      { t: 11.27, who: 'gojo', do: 'expr', face: 'grit', eyes: 'closed' },
      { t: 11.27, sfx: 'hitH', vol: 1 }, { t: 11.27, sfx: 'impactFrame', vol: 0.7 },
      { t: 11.29, kana: 'ザシュ', x: 300, y: 150, size: 4, dur: 0.9, style: 'slash' },
      { t: 11.27, shake: 0.75 },
      // ---- 12.0–13.6: cut-away — the pair from afar: a burst of dust, a scrap of black cloth turning in the wind
      { t: 12.0, shot: 'static', cam: { x: -36, y: -22, z: 8, yaw: 0.55, pitch: -0.26, f: 400 } },
      { t: 11.3, fx: 'dust', at: [G[0], G[1] + 0.3, 0.4], n: 10, r: 2.0, size: 0.6, col: 'ash', dur: 2.6 },
      { t: 11.3, fx: 'debris', at: [G[0], G[1], 0.3], n: 12, speed: 6, size: 0.25, up: 0.7, dur: 1.8 },
      { t: 11.35, fx: 'cloth', at: CUT, col: C.ink, col2: C.shadow, size: 0.32, carry: true, wind: [0.9, 0.35], lift: 2.4, dur: 6, layer: 'front' },
      { t: 12.0, sfx: 'downer', vol: 0.45 },
      // ---- 13.6–17.2: the monitoring room: Yuji jumps up, Yuta rises — both cry out (silhouettes, no voices)
      { t: ROOM_T, env: { set: 'command', time: 'night' } },
      { t: ROOM_T, who: 'gojo', do: 'hide' }, { t: ROOM_T, who: 'sukuna', do: 'hide' }, { t: ROOM_T, who: 'maho', do: 'hide' },
      { t: ROOM_T, shot: 'static', cam: { x: 0.5, y: 6.4, z: 1.3, yaw: Math.PI - 0.02, f: 380, shift: 28 } },
      { t: ROOM_T, amb: 'command', vol: 0.6, fade: 0.2 }, { t: ROOM_T, sfx: 'crtHum', vol: 0.35, dur: BACK_T - ROOM_T },   // audio (M4): the monitors
      { t: ROOM_T + 0.36, sfx: 'clothSnap', vol: 0.35, pan: 0.1 }, { t: ROOM_T + 0.72, sfx: 'footConcrete', vol: 0.3, pan: 0.3 },
      { t: ROOM_T + 0.5, sfx: 'dropSoft', vol: 0.3, pan: 0.2 },
      { t: ROOM_T + 2.0, shot: 'static', cam: { x: 4.3, y: 2.5, z: 1.4, yaw: -1.52, f: 330, shift: 14 }, to: { x: 4.0 }, dur: 1.6, ease: 'linear' },
      // ---- 17.2–22: the street: Gojo on his knees in the ink, head bowed; the giant over him; Sukuna straightens
      { t: BACK_T, env: { set: 'city', time: ENV.time } },
      { t: BACK_T, amb: 'command', vol: 0, fade: 0.2 },
      { t: BACK_T, who: 'gojo', do: 'show' }, { t: BACK_T, who: 'sukuna', do: 'show' }, { t: BACK_T, who: 'maho', do: 'show' },
      { t: BACK_T, who: 'gojo', do: 'place', at: G, face: 'east', pose: 'a4KneelBow' },
      { t: BACK_T, who: 'gojo', do: 'expr', face: 'neutral', eyes: 'closed' },
      { t: BACK_T, who: 'maho', do: 'place', at: [M[0] + 0.35, M[1], 0], face: 'east', pose: 'maho_look' },
      { t: BACK_T, shot: 'static', cam: { x: G[0] + 1.9, y: G[1] - 8.0, z: 1.45, yaw: -0.1, f: 400, shift: 30 } },   // held (a push here cost ~16 ms/frame: the city re-renders every frame)
      { t: BACK_T + 0.1, fx: 'smoke', at: [G[0] + 0.28, G[1] - 0.05, 1.12], rate: 1.2, life: 1.2, rise: 0.25, size: 0.06, grow: 3, dark: false, wind: 0.3, dur: 4.7, sfx: false },
      { t: BACK_T + 1.6, who: 'sukuna', do: 'pose', pose: 'loose', dur: 0.8 },
      { t: BACK_T + 1.6, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: BACK_T + 0.4, sfx: 'windGust', vol: 0.25, pan: -0.3, panTo: 0.3, dur: 3.5 },
    ],
  });
})();
