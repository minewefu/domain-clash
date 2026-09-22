/* ACT II · 1 — a2_signs (16 s). Act card. The two on the EW avenue in front of the crater where the NE tower fell,
   9 m apart, breath steaming, silence. Both raise their hands at the same instant — a manga page read right→left:
   Sukuna's Enma palm seal · Gojo's one-hand seal; a strip of their eyes; the seals complete together (canon ch. 225:
   the expansions are simultaneous). */
(function () {
  'use strict';
  const HT = window.HT, C = HT.C, A = HT.A2;
  const G = A.G0, S0 = A.S0;
  const seal = (who, sign, flip) => (g, S, P) => {
    if (HT.busts && HT.busts.hands) HT.busts.hands(g, who, sign, P.cx, P.h + 4, Math.round(P.h * 0.92), { face: flip ? -1 : 1, t: S.t, light: S.light, rim: S.rim });
  };
  HT.fightScene({
    id: 'a2_signs', act: 'II', title: 'Hand Signs', dur: 16, transitionIn: { type: 'cut', dur: 0 },
    set: 'city', env: { time: 'noon', snow: 0.3, snowFall: 0.12, wind: 0.3, fogFar: 900 },
    cast: {
      gojo: { char: 'gojo', at: G, face: 'east', pose: 'loose', costume: 'fight' },
      sukuna: { char: 'sukuna', at: S0, face: 'west', pose: 'loose', costume: 'fight' },
    },
    ambience: [{ name: 'wind', vol: 0.35 }, { name: 'rubble', vol: 0.2 }],
    script: [
      { t: 0, card: 'act', text: 'ACT II', sub: 'DOMAIN WAR', bg: 'black', dur: 2.6 },
      { t: 0, post: 'black', hold: true, dur: 2.4 },
      // 1. the wide two-shot from the south kerb: the crater and the fallen tower's rubble behind them; silence (hold)
      { t: 2.4, shot: 'static', cam: { x: 30, y: -4.4, z: 1.5, yaw: 0, f: 400, shift: 46 }, to: { y: -3.0 }, dur: 4, ease: 'linear' }, // (the lane dash stays under the lens)
      { t: 2.4, fx: 'smoke', at: [G[0] + 0.25, G[1], 1.78], rate: 0.8, life: 1.4, rise: 0.25, size: 0.07, grow: 3, dark: false, wind: 0.3, dur: 4, sfx: false },
      { t: 3.1, fx: 'smoke', at: [S0[0] - 0.22, S0[1], 1.62], rate: 0.8, life: 1.4, rise: 0.25, size: 0.07, grow: 3, dark: false, wind: 0.3, dur: 3.3, sfx: false },
      // 2. the seals (manga page, right→left: Sukuna's panel first)
      { t: 6.4, shot: 'panels', layout: 'split2', slant: 30, panels: [
        { world: false, bg: 'beta', draw: seal('sukuna', 'shrine', true) },
        { world: false, bg: 'focus', draw: seal('gojo', 'void', false), slamAt: 0.12 },
      ] },
      { t: 6.4, sfx: 'handSign', vol: 0.8, pan: 0.3 }, { t: 6.52, sfx: 'handSign', vol: 0.8, pan: -0.3 },
      { t: 6.4, who: 'gojo', do: 'pose', pose: 'signVoid', dur: 0.2 },
      { t: 6.4, who: 'sukuna', do: 'pose', pose: 'signShrine', dur: 0.2 },
      { t: 7.0, kana: 'ゴゴゴ', x: 320, y: 40, size: 3, dur: 3.2, style: 'rumble' },
      // 3. the eyes: Sukuna's four (red) · the junction between them · Gojo's (blue)
      { t: 10.4, shot: 'panels', layout: 'strip3v', panels: [
        { shot: { shot: 'ecu', who: 'sukuna', yaw: -Math.PI / 2 - 0.2 }, tone: true },
        { shot: { shot: 'static', cam: { x: 30, y: -20, z: 2.2, yaw: 0, f: 460, shift: 20 } }, slamAt: 0.14 },
        { shot: { shot: 'ecu', who: 'gojo', yaw: Math.PI / 2 + 0.2 }, slamAt: 0.28 },
      ] },
      { t: 10.4, who: 'sukuna', do: 'expr', face: 'grin', eyes: 'narrow', eyes2: 'open' },
      { t: 10.4, who: 'gojo', do: 'expr', face: 'serious', eyes: 'glow' },
      { t: 10.5, sfx: 'panelSlam', vol: 0.5 },
      // 4. the seals complete together: one glow each, then the wide again, both holding their seals
      { t: 13.4, shot: 'static', cam: { x: 30, y: -3.0, z: 1.5, yaw: 0, f: 400, shift: 46 } },
      { t: 13.4, fx: 'sealGlow', at: 'gojo.chest', r: 30, col: C.ice },
      { t: 13.4, fx: 'sealGlow', at: 'sukuna.chest', r: 30, col: C.red },
      { t: 13.4, sfx: 'domainBloom', vol: 0.6 },
      { t: 13.4, shake: 0.2 },
    ],
  });
})();
