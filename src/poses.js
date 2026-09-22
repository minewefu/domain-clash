/* DOMAIN CLASH — pose library (60+ keys) and move library (frame data) for the rig.
   Poses are authored in degrees (see rig.js for the angle conventions). Moves are sequences of poses with frame
   timings at 30 fps: startup (anticipation) → active (strike, contact frame) → recovery (follow-through).
   Frame-data conventions follow fighting-game practice (SF3 3rd Strike / Garou: startup·active·recovery) but are
   slowed to cinematic timings; hit-stop is a hold inside the move (see fight.js and SPEC.md §7). */
(function () {
  'use strict';
  const HT = window.HT, rig = HT.rig;
  const P = (o) => rig.full(o);
  const POSES = (rig.POSES = {});
  const def = (name, o, base) => { POSES[name] = P(Object.assign({}, base ? POSES[base] : {}, o)); return POSES[name]; };

  // ------------------------------------------------------------------ stances / idles
  def('stand', { lean: 2, na: [4, 8, 0], fa: [-4, 10, 0], nl: [2, 2, 0], fl: [-3, 2, 0], nh: 'relaxed', fh: 'relaxed' });
  def('pockets', { lean: -3, neck: 4, head: -2, twist: 0.25, na: [-12, 34, 0], fa: [-18, 36, 0], nl: [4, 3, 0], fl: [-6, 2, 0], nh: 'pocket', fh: 'pocket' });
  def('pocketsLean', { lean: -7, neck: 8, head: 4, twist: 0.2, root: [-0.01, -0.004], na: [-14, 36, 0], fa: [-20, 38, 0], nl: [10, 4, 0], fl: [-8, 1, 0], nh: 'pocket', fh: 'pocket', face: 'smile' });
  def('guard', { root: [0, -0.03], lean: 10, neck: -6, head: -4, twist: 0.45, na: [52, 92, 6], fa: [22, 122, 0], nl: [22, 28, 0], fl: [-20, 14, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('guardLow', { root: [0, -0.07], lean: 20, neck: -10, head: -6, na: [30, 96, 0], fa: [18, 110, 0], nl: [32, 58, 0], fl: [-24, 34, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('loose', { lean: 4, neck: 2, head: 0, twist: 0.35, na: [10, 20, 0], fa: [-6, 18, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'relaxed', fh: 'relaxed', face: 'smirk' });
  def('armsCrossed', { lean: -2, na: [20, 120, 0], fa: [16, 124, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'fist', fh: 'fist' });
  def('crouch', { root: [0.01, -0.2], lean: 30, neck: -16, head: -8, na: [30, 60, 0], fa: [16, 64, 0], nl: [70, 120, 10], fl: [20, 110, 30], nh: 'open', fh: 'open' });
  def('kneel', { root: [0.0, -0.25], lean: 18, neck: -8, na: [20, 30, 0], fa: [8, 26, 0], nl: [78, 96, 0], fl: [-4, 118, 40], nh: 'open', fh: 'relaxed' });
  def('stretchUp', { view: 'front', lean: 0, neck: -6, head: -10, na: [168, 30, 0], fa: [168, 30, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'open', eyes: 'closed', face: 'open' });
  def('stretchSide', { view: 'front', lean: -12, neck: -6, head: -4, na: [150, 60, 0], fa: [20, 90, 0], nl: [8, 0, 0], fl: [4, 0, 0], nh: 'open', fh: 'relaxed', eyes: 'closed', face: 'smile' });
  def('frontStand', { view: 'front', na: [8, 6, 0], fa: [8, 6, 0], nl: [5, 0, 0], fl: [5, 0, 0], nh: 'relaxed', fh: 'relaxed' });
  def('frontPockets', { view: 'front', lean: 0, head: -2, na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket', face: 'smile' });
  def('frontGrin', { view: 'front', lean: 0, head: 6, na: [10, 10, 0], fa: [10, 10, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
  def('frontGuard', { view: 'front', root: [0, -0.03], na: [30, 120, 0], fa: [30, 120, 0], nl: [14, 20, 0], fl: [14, 20, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('back', { view: 'back', na: [8, 6, 0], fa: [8, 6, 0], nl: [5, 0, 0], fl: [5, 0, 0], nh: 'relaxed', fh: 'relaxed' });
  def('backPockets', { view: 'back', na: [14, 50, 0], fa: [14, 50, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'pocket', fh: 'pocket' });
  def('float', { root: [0, 0.02], lean: -4, neck: 4, na: [18, 26, 0], fa: [10, 30, 0], nl: [12, 20, -30], fl: [-6, 34, -40], nh: 'relaxed', fh: 'relaxed' });
  def('floatPockets', { root: [0, 0.02], lean: -5, neck: 6, na: [-12, 34, 0], fa: [-18, 36, 0], nl: [10, 24, -30], fl: [-8, 36, -40], nh: 'pocket', fh: 'pocket', face: 'smirk' });

  // ------------------------------------------------------------------ strikes (keys: antic → strike → follow-through)
  def('jabA', { root: [-0.01, -0.03], lean: 8, na: [26, 120, 0], fa: [30, 118, 0], nl: [20, 28, 0], fl: [-20, 16, 0], nh: 'fist', fh: 'fist', eyes: 'narrow', twist: 0.3 });
  def('jab', { root: [0.05, -0.03], lean: 16, neck: -6, na: [88, 4, 0], fa: [30, 118, 0], nl: [34, 34, 0], fl: [-26, 12, 0], nh: 'fist', fh: 'fist', eyes: 'glare', twist: 0.6 });
  def('crossA', { root: [-0.02, -0.04], lean: 4, twist: 0.1, na: [30, 110, 0], fa: [-10, 120, 0], nl: [20, 26, 0], fl: [-24, 18, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('cross', { root: [0.08, -0.05], lean: 22, neck: -8, twist: 0.8, na: [20, 120, 0], fa: [86, 2, 0], nl: [40, 40, 0], fl: [-34, 8, 20], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('hookA', { root: [-0.01, -0.04], lean: 6, twist: 0.2, na: [-20, 90, 0], fa: [26, 118, 0], nl: [22, 28, 0], fl: [-22, 16, 0], nh: 'fist', fh: 'fist' });
  def('hook', { root: [0.04, -0.05], lean: 18, twist: 0.9, na: [96, 80, 0], fa: [18, 120, 0], nl: [30, 34, 0], fl: [-26, 12, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('uppercutA', { root: [0.0, -0.1], lean: 26, neck: -10, na: [-16, 70, 0], fa: [24, 116, 0], nl: [40, 70, 0], fl: [-24, 40, 0], nh: 'fist', fh: 'fist' });
  def('uppercut', { root: [0.04, 0.03], lean: -6, neck: -12, head: -8, na: [150, 40, 0], fa: [10, 110, 0], nl: [14, 8, 0], fl: [-30, 20, 30], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('palmA', { root: [-0.02, -0.04], lean: 6, na: [10, 100, 0], fa: [20, 110, 0], nl: [20, 28, 0], fl: [-22, 18, 0], nh: 'open', fh: 'fist' });
  def('palm', { root: [0.07, -0.05], lean: 20, na: [84, 6, -60], fa: [20, 112, 0], nl: [38, 38, 0], fl: [-30, 10, 0], nh: 'open', fh: 'fist', eyes: 'glare' });
  def('elbow', { root: [0.05, -0.04], lean: 18, twist: 0.8, na: [100, 150, 0], fa: [16, 116, 0], nl: [32, 34, 0], fl: [-26, 12, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('kickA', { root: [0, -0.02], lean: -8, na: [30, 90, 0], fa: [40, 100, 0], nl: [70, 110, 0], fl: [-4, 10, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('kick', { root: [0.02, 0.0], lean: -22, neck: 10, na: [60, 60, 0], fa: [-30, 80, 0], nl: [96, 4, 20], fl: [-4, 6, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('roundA', { root: [0, -0.03], lean: 10, twist: 0.1, na: [20, 100, 0], fa: [40, 100, 0], nl: [-30, 60, 0], fl: [10, 16, 0], nh: 'fist', fh: 'fist' });
  def('round', { root: [0.02, 0.01], lean: -30, neck: 14, twist: 0.9, na: [-40, 60, 0], fa: [70, 40, 0], nl: [110, 10, 30], fl: [-6, 10, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('axeA', { root: [0, 0.0], lean: -12, na: [40, 70, 0], fa: [20, 80, 0], nl: [150, 10, 20], fl: [-2, 8, 0], nh: 'fist', fh: 'fist' });
  def('axe', { root: [0.04, -0.06], lean: 26, na: [-10, 60, 0], fa: [30, 90, 0], nl: [70, 4, 10], fl: [-16, 20, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('knee', { root: [0.04, 0.0], lean: 14, na: [60, 80, 0], fa: [50, 90, 0], nl: [100, 130, 0], fl: [-10, 6, 20], nh: 'claw', fh: 'claw', eyes: 'glare' });
  def('flyKick', { root: [0.05, 0.25], lean: -20, na: [90, 30, 0], fa: [-40, 60, 0], nl: [90, 0, 20], fl: [-20, 110, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('dash', { root: [0.08, -0.1], lean: 48, neck: -26, head: -10, na: [-50, 30, 0], fa: [-40, 40, 0], nl: [60, 80, 0], fl: [-50, 40, 20], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('dashFloat', { root: [0.06, 0.05], lean: 60, neck: -34, head: -12, na: [-60, 10, 0], fa: [-54, 16, 0], nl: [-10, 30, -20], fl: [-30, 50, -30], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('slashA', { root: [-0.01, -0.02], lean: -4, twist: 0.2, na: [150, 50, 0], fa: [10, 40, 0], nl: [10, 10, 0], fl: [-10, 6, 0], nh: 'flat', fh: 'relaxed', face: 'grin' });
  def('slash', { root: [0.02, -0.03], lean: 14, twist: 0.7, na: [40, 4, 0], fa: [-10, 50, 0], nl: [24, 24, 0], fl: [-18, 10, 0], nh: 'flat', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
  def('flick', { lean: 2, twist: 0.5, na: [74, 30, 30], fa: [-6, 20, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'two', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
  def('swipe', { lean: -2, twist: 0.6, neck: 4, head: 6, na: [100, 10, 10], fa: [-8, 20, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'flat', fh: 'relaxed', face: 'smirk', eyes: 'narrow' });

  // ------------------------------------------------------------------ techniques (Gojo)
  def('blueA', { lean: 4, twist: 0.4, na: [60, 60, 0], fa: [-6, 20, 0], nl: [8, 6, 0], fl: [-8, 4, 0], nh: 'two', fh: 'relaxed', eyes: 'narrow' });
  def('blue', { lean: 8, twist: 0.6, na: [88, 8, 0], fa: [-10, 20, 0], nl: [14, 12, 0], fl: [-10, 6, 0], nh: 'two', fh: 'relaxed', eyes: 'glare' });
  def('redA', { lean: -2, twist: 0.2, na: [70, 110, 0], fa: [-6, 20, 0], nl: [8, 6, 0], fl: [-8, 4, 0], nh: 'point', fh: 'relaxed', eyes: 'narrow' });
  def('red', { lean: 10, twist: 0.6, na: [90, 2, -20], fa: [-12, 24, 0], nl: [18, 14, 0], fl: [-14, 8, 0], nh: 'point', fh: 'relaxed', eyes: 'glare' });
  def('purpleA', { view: 'front', lean: 0, na: [70, 20, 0], fa: [70, 20, 0], nl: [12, 4, 0], fl: [12, 4, 0], nh: 'open', fh: 'open', eyes: 'glare' });
  def('purple', { view: 'front', lean: 0, na: [60, 60, 0], fa: [60, 60, 0], nl: [12, 4, 0], fl: [12, 4, 0], nh: 'point', fh: 'point', eyes: 'glare' });
  def('purpleThrust', { lean: 10, twist: 0.6, na: [90, 0, 0], fa: [80, 10, 0], nl: [26, 20, 0], fl: [-20, 8, 0], nh: 'point', fh: 'open', eyes: 'glare' });
  def('signVoid', { view: 'front', lean: 0, head: 4, na: [40, 128, 0], fa: [10, 20, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'sign', fh: 'relaxed', eyes: 'open' });
  def('signShrine', { view: 'front', lean: 0, head: 2, na: [34, 118, 0], fa: [34, 118, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'sign', fh: 'sign', face: 'grin', eyes: 'narrow' });
  def('pointUp', { lean: -4, twist: 0.4, na: [170, 6, 0], fa: [-6, 20, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'point', fh: 'relaxed', face: 'smirk' });
  def('beckon', { lean: 0, twist: 0.5, na: [60, 100, 30], fa: [-12, 30, 0], nl: [4, 2, 0], fl: [-6, 2, 0], nh: 'open', fh: 'pocket', face: 'smirk' });
  def('wipe', { lean: 6, neck: 10, head: 10, twist: 0.4, na: [40, 140, 0], fa: [-8, 20, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'flat', fh: 'relaxed', eyes: 'narrow' });
  def('laugh', { lean: -14, neck: -18, head: -16, twist: 0.4, na: [6, 40, 0], fa: [-10, 30, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'relaxed', fh: 'relaxed', face: 'grin', eyes: 'closed' });
  def('lookUp', { lean: -6, neck: -20, head: -20, na: [4, 10, 0], fa: [-4, 10, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'relaxed', fh: 'relaxed' });
  def('lookDown', { lean: 6, neck: 14, head: 12, na: [4, 10, 0], fa: [-4, 10, 0], nl: [3, 2, 0], fl: [-4, 2, 0], nh: 'relaxed', fh: 'relaxed' });
  def('exhaust', { root: [0, -0.04], lean: 26, neck: 8, head: 14, na: [30, 20, 0], fa: [10, 30, 0], nl: [16, 20, 0], fl: [-10, 14, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow', face: 'open' });

  // ------------------------------------------------------------------ reactions
  def('hitHigh', { root: [-0.04, -0.02], lean: -24, neck: -26, head: -14, twist: 0.3, na: [40, 70, 0], fa: [-40, 60, 0], nl: [16, 20, 0], fl: [-20, 10, 0], nh: 'open', fh: 'open', eyes: 'closed', face: 'grit' });
  def('hitMid', { root: [-0.05, -0.05], lean: 34, neck: 10, head: 8, twist: 0.2, na: [-30, 60, 0], fa: [-50, 40, 0], nl: [28, 40, 0], fl: [-30, 20, 0], nh: 'open', fh: 'open', eyes: 'wide', face: 'open' });
  def('hitFly', { root: [-0.06, 0.06], lean: -40, neck: -20, head: -20, twist: 0.2, na: [-70, 30, 0], fa: [-100, 20, 0], nl: [40, 60, 0], fl: [10, 90, 0], nh: 'open', fh: 'open', eyes: 'closed', face: 'grit' });
  def('tumble', { root: [0, 0.1], lean: -110, neck: -20, head: -10, na: [-130, 40, 0], fa: [-90, 60, 0], nl: [70, 90, 0], fl: [20, 110, 0], nh: 'open', fh: 'open', eyes: 'closed' });
  def('down', { root: [-0.12, -0.44], lean: -86, neck: 10, head: 6, na: [-150, 20, 0], fa: [-60, 20, 0], nl: [80, 10, 0], fl: [70, 30, 0], nh: 'open', fh: 'relaxed', eyes: 'closed' });
  def('block', { root: [-0.01, -0.04], lean: 6, neck: 6, twist: 0.2, na: [60, 130, 0], fa: [50, 128, 0], nl: [24, 30, 0], fl: [-22, 18, 0], nh: 'fist', fh: 'fist', eyes: 'narrow', face: 'grit' });
  def('recoil', { root: [-0.03, -0.02], lean: -10, twist: 0.3, na: [60, 40, 0], fa: [-20, 60, 0], nl: [10, 12, 0], fl: [-24, 14, 0], nh: 'open', fh: 'fist', eyes: 'wide', face: 'grit' });
  def('landing', { root: [0, -0.16], lean: 36, neck: -20, head: -8, na: [-40, 30, 0], fa: [30, 40, 0], nl: [60, 110, 10], fl: [-10, 90, 30], nh: 'open', fh: 'open', eyes: 'narrow' });
  def('rise', { root: [0, -0.1], lean: 30, neck: 6, na: [10, 40, 0], fa: [-6, 30, 0], nl: [40, 70, 0], fl: [-20, 50, 0], nh: 'relaxed', fh: 'relaxed' });
  def('jumpUp', { root: [0, 0.05], lean: 6, neck: -12, na: [150, 20, 0], fa: [120, 30, 0], nl: [10, 40, -20], fl: [-20, 60, -30], nh: 'open', fh: 'open' });
  def('fall', { root: [0, 0.05], lean: 10, na: [120, 50, 0], fa: [90, 60, 0], nl: [40, 70, 0], fl: [-10, 50, 0], nh: 'open', fh: 'open' });

  // ------------------------------------------------------------------ Act I acting beats
  def('fingerGun', { lean: 0, twist: 0.55, neck: 2, head: 4, na: [92, 6, 0], fa: [-4, 16, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'point', fh: 'relaxed', face: 'grin', eyes: 'narrow' });
  def('fingerGunA', { lean: -2, twist: 0.4, na: [70, 40, 0], fa: [-4, 16, 0], nl: [6, 4, 0], fl: [-8, 3, 0], nh: 'point', fh: 'relaxed', face: 'smirk', eyes: 'narrow' });
  def('catchFist', { root: [0.01, -0.02], lean: 6, twist: 0.6, na: [84, 24, 0], fa: [20, 110, 0], nl: [16, 12, 0], fl: [-14, 8, 0], nh: 'claw', fh: 'fist', eyes: 'narrow', face: 'smirk' });
  def('tossRobe', { view: 'front', lean: -4, head: -4, na: [120, 30, 0], fa: [14, 30, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'relaxed', face: 'smile' });
  def('shrug', { view: 'front', lean: 0, head: 6, na: [40, 110, 0], fa: [40, 110, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'open', fh: 'open', face: 'smirk' });
  def('neckCrack', { view: 'front', lean: 4, neck: 0, head: 18, na: [10, 20, 0], fa: [150, 60, 0], nl: [6, 0, 0], fl: [6, 0, 0], nh: 'relaxed', fh: 'open', eyes: 'closed', face: 'smile' });
  def('stomp', { root: [0, -0.04], lean: 10, na: [30, 60, 0], fa: [20, 70, 0], nl: [26, 20, 30], fl: [-10, 10, 0], nh: 'fist', fh: 'fist', eyes: 'glare' });
  def('stompA', { root: [0, 0.02], lean: -6, na: [40, 70, 0], fa: [30, 80, 0], nl: [80, 90, 10], fl: [-4, 6, 0], nh: 'fist', fh: 'fist', eyes: 'narrow' });
  def('dustLand', { root: [0, -0.22], lean: 24, neck: -14, head: -6, na: [-30, 30, 0], fa: [20, 40, 0], nl: [70, 116, 12], fl: [-14, 108, 34], nh: 'open', fh: 'open', face: 'grin', eyes: 'narrow' });
  def('armsOut', { view: 'front', lean: 0, head: -2, na: [60, 10, 0], fa: [60, 10, 0], nl: [8, 0, 0], fl: [8, 0, 0], nh: 'open', fh: 'open', face: 'grin', eyes: 'narrow' });
  def('flyGrab', { root: [0.02, 0.04], lean: 40, neck: -20, na: [80, 10, 0], fa: [-40, 40, 0], nl: [-20, 40, -20], fl: [-40, 60, -30], nh: 'claw', fh: 'relaxed', eyes: 'glare' });
  def('punchBoth', { root: [0.06, -0.04], lean: 20, twist: 0.8, na: [20, 110, 0], fa: [88, 2, 0], nl: [38, 38, 0], fl: [-32, 8, 18], nh: 'fist', fh: 'fist', eyes: 'glare', face: 'grit' });
  def('walkOut', { lean: 3, neck: 4, na: [2, 14, 0], fa: [-6, 16, 0], nl: [10, 8, 0], fl: [-10, 6, 0], nh: 'relaxed', fh: 'relaxed', eyes: 'narrow' });
  def('floatFlat', { root: [0.0, 0.3], lean: -86, neck: 8, head: 10, twist: 0.3, na: [-12, 34, 0], fa: [-18, 36, 0], nl: [4, 6, 0], fl: [-4, 10, 0], nh: 'pocket', fh: 'pocket', face: 'smirk', eyes: 'narrow' });
  def('pocketsTilt', { lean: -2, neck: 6, head: 12, twist: 0.25, na: [-12, 34, 0], fa: [-18, 36, 0], nl: [4, 3, 0], fl: [-6, 2, 0], nh: 'pocket', fh: 'pocket', face: 'smirk', eyes: 'narrow' });
  def('flurry', { root: [0.04, -0.04], lean: 18, twist: 0.7, na: [80, 30, 0], fa: [60, 70, 0], nl: [30, 34, 0], fl: [-24, 12, 0], nh: 'fist', fh: 'fist', face: 'grin', eyes: 'glare' });
  // fixes: kneel (one knee down), lying on the back
  def('kneel', { root: [0.0, -0.22], lean: 16, neck: -6, na: [26, 40, 0], fa: [6, 30, 0], nl: [84, 92, 0], fl: [-10, 124, 40], nh: 'fist', fh: 'relaxed', eyes: 'narrow' });
  def('down', { root: [-0.18, -0.43], lean: -84, neck: 6, head: 4, na: [-140, 20, 0], fa: [-70, 20, 0], nl: [84, 12, 0], fl: [76, 26, 0], nh: 'open', fh: 'relaxed', eyes: 'closed' });

  // ------------------------------------------------------------------ walk / run cycles (procedural, phase 0..1)
  rig.walk = (ph, o = {}) => {
    const a = ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), k = o.stride || 1, pk = o.pockets;
    const base = o.base ? POSES[o.base] : POSES.stand;
    const p = Object.assign({}, base);
    p.root = [0, -0.012 * Math.abs(c) * k - 0.006];
    p.lean = (base.lean || 0) + 3 * k;
    p.nl = [24 * s * k, 8 + 14 * Math.max(0, -c) * k + 8 * Math.max(0, s) * k, 6 * Math.max(0, -s)];
    p.fl = [-24 * s * k, 8 + 14 * Math.max(0, c) * k + 8 * Math.max(0, -s) * k, 6 * Math.max(0, s)];
    if (!pk) { p.na = [-18 * s * k, 16 + 8 * Math.max(0, -s), 0]; p.fa = [18 * s * k, 16 + 8 * Math.max(0, s), 0]; }
    p.head = (base.head || 0) + 1.5 * c;
    return p;
  };
  rig.run = (ph, o = {}) => {
    const a = ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), k = o.stride || 1;
    const p = Object.assign({}, POSES.stand);
    p.root = [0.02, -0.03 + 0.03 * Math.abs(s) * k];
    p.lean = 16 * k; p.neck = -8;
    p.nl = [40 * s * k, 20 + 60 * Math.max(0, -c) * k, 10 * Math.max(0, -s)];
    p.fl = [-40 * s * k, 20 + 60 * Math.max(0, c) * k, 10 * Math.max(0, s)];
    p.na = [-40 * s * k, 90, 0]; p.fa = [40 * s * k, 90, 0];
    p.nh = 'fist'; p.fh = 'fist';
    return p;
  };
  rig.walkFront = (ph, o = {}) => {
    const a = ph * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), k = o.stride || 1;
    const p = Object.assign({}, POSES[o.pockets ? 'frontPockets' : 'frontStand']);
    p.view = o.back ? 'back' : 'front';
    p.root = [0.006 * s, -0.012 * Math.abs(c) * k];
    p.lean = 1.5 * s;
    p.nl = [5, 26 * Math.max(0, s) * k, 0]; p.fl = [5, 26 * Math.max(0, -s) * k, 0];
    if (!o.pockets) { p.na = [8 + 4 * s, 10 + 8 * Math.max(0, s), 0]; p.fa = [8 - 4 * s, 10 + 8 * Math.max(0, -s), 0]; }
    return p;
  };

  // ------------------------------------------------------------------ moves (frame data @ 30 fps)
  // keys: [[frame, poseName | fn(t) | pose], ...]; contact: frame of impact; phases: startup | active | recovery
  // root: [[frame, dx(m)], ...] forward displacement over the move (relative to the move's start)
  // smear: {limb:'na'|'fa'|'nl'|'fl', from, to} frames that draw a smear/multiples for that limb
  // sfx: {frame: name} default sounds (whoosh on the swing; the hit sound comes from the contact)
  const MOVES = (rig.MOVES = {});
  const mv = (name, o) => { o.name = name; o.len = o.keys[o.keys.length - 1][0]; MOVES[name] = o; return o; };
  mv('jab', { keys: [[0, 'guard'], [3, 'jabA'], [6, 'jab'], [11, 'jab'], [18, 'guard']], contact: 6, startup: 6, active: 3, recovery: 9, root: [[0, 0], [6, 0.35], [18, 0.3]], smear: { limb: 'na', from: 3, to: 6 }, sfx: { 3: 'whooshS' } });
  mv('cross', { keys: [[0, 'guard'], [4, 'crossA'], [8, 'cross'], [14, 'cross'], [24, 'guard']], contact: 8, startup: 8, active: 3, recovery: 13, root: [[0, 0], [8, 0.55], [24, 0.45]], smear: { limb: 'fa', from: 4, to: 8 }, sfx: { 4: 'whooshM' } });
  mv('hook', { keys: [[0, 'guard'], [5, 'hookA'], [9, 'hook'], [15, 'hook'], [25, 'guard']], contact: 9, startup: 9, active: 3, recovery: 13, root: [[0, 0], [9, 0.4], [25, 0.35]], smear: { limb: 'na', from: 5, to: 9 }, sfx: { 5: 'whooshM' } });
  mv('uppercut', { keys: [[0, 'guard'], [6, 'uppercutA'], [10, 'uppercut'], [16, 'uppercut'], [28, 'guard']], contact: 10, startup: 10, active: 4, recovery: 14, root: [[0, 0], [10, 0.3], [28, 0.25]], smear: { limb: 'na', from: 6, to: 10 }, sfx: { 6: 'whooshM' } });
  mv('palm', { keys: [[0, 'guard'], [4, 'palmA'], [7, 'palm'], [13, 'palm'], [22, 'guard']], contact: 7, startup: 7, active: 3, recovery: 12, root: [[0, 0], [7, 0.5], [22, 0.45]], smear: { limb: 'na', from: 4, to: 7 }, sfx: { 4: 'whooshM' } });
  mv('elbow', { keys: [[0, 'guard'], [4, 'hookA'], [7, 'elbow'], [12, 'elbow'], [20, 'guard']], contact: 7, startup: 7, active: 3, recovery: 10, root: [[0, 0], [7, 0.45], [20, 0.4]], sfx: { 4: 'whooshS' } });
  mv('kick', { keys: [[0, 'guard'], [5, 'kickA'], [9, 'kick'], [15, 'kick'], [26, 'guard']], contact: 9, startup: 9, active: 4, recovery: 13, root: [[0, 0], [9, 0.3], [26, 0.25]], smear: { limb: 'nl', from: 5, to: 9 }, sfx: { 5: 'whooshM' } });
  mv('round', { keys: [[0, 'guard'], [5, 'roundA'], [10, 'round'], [16, 'round'], [28, 'guard']], contact: 10, startup: 10, active: 4, recovery: 14, root: [[0, 0], [10, 0.35], [28, 0.3]], smear: { limb: 'nl', from: 5, to: 10 }, sfx: { 5: 'whooshL' } });
  mv('axe', { keys: [[0, 'guard'], [6, 'axeA'], [10, 'axe'], [16, 'axe'], [28, 'guard']], contact: 10, startup: 10, active: 4, recovery: 14, root: [[0, 0], [10, 0.4], [28, 0.35]], smear: { limb: 'nl', from: 6, to: 10 }, sfx: { 6: 'whooshL' } });
  mv('knee', { keys: [[0, 'guard'], [4, 'guardLow'], [7, 'knee'], [12, 'knee'], [20, 'guard']], contact: 7, startup: 7, active: 3, recovery: 10, root: [[0, 0], [7, 0.5], [20, 0.4]], sfx: { 4: 'whooshS' } });
  mv('flyKick', { keys: [[0, 'guard'], [5, 'crouch'], [9, 'flyKick'], [16, 'flyKick'], [26, 'landing'], [32, 'guard']], contact: 12, startup: 12, active: 4, recovery: 16, root: [[0, 0], [9, 0.6], [16, 2.2], [32, 2.4]], lift: [[0, 0], [9, 0.3], [14, 0.8], [26, 0], [32, 0]], smear: { limb: 'nl', from: 9, to: 12 }, sfx: { 6: 'whooshL' } });
  mv('slash', { keys: [[0, 'loose'], [4, 'slashA'], [7, 'slash'], [14, 'slash'], [24, 'loose']], contact: 7, startup: 7, active: 3, recovery: 14, root: [[0, 0], [7, 0.1], [24, 0.1]], smear: { limb: 'na', from: 4, to: 7 }, sfx: { 4: 'whooshS' } });
  mv('swipe', { keys: [[0, 'loose'], [5, 'slashA'], [8, 'swipe'], [18, 'swipe'], [30, 'loose']], contact: 8, startup: 8, active: 4, recovery: 18, root: [[0, 0]], smear: { limb: 'na', from: 5, to: 8 } });
  mv('flick', { keys: [[0, 'loose'], [4, 'blueA'], [7, 'flick'], [16, 'flick'], [26, 'loose']], contact: 7, startup: 7, active: 3, recovery: 16, root: [[0, 0]] });
  mv('blue', { keys: [[0, 'loose'], [6, 'blueA'], [10, 'blue'], [24, 'blue'], [34, 'loose']], contact: 10, startup: 10, active: 14, recovery: 10, root: [[0, 0]] });
  mv('red', { keys: [[0, 'loose'], [8, 'redA'], [12, 'red'], [22, 'red'], [34, 'loose']], contact: 12, startup: 12, active: 10, recovery: 12, root: [[0, 0], [12, 0.1], [34, 0.05]] });
  mv('dash', { keys: [[0, 'guard'], [2, 'dash'], [8, 'dash'], [12, 'guard']], contact: 8, startup: 2, active: 6, recovery: 4, root: [[0, 0], [2, 0.2], [8, 3.0], [12, 3.2]] });
  mv('block', { keys: [[0, 'guard'], [3, 'block'], [12, 'block'], [18, 'guard']], contact: 3, startup: 3, active: 9, recovery: 6, root: [[0, 0], [12, -0.2], [18, -0.2]] });
  mv('hitHigh', { keys: [[0, 'hitHigh'], [10, 'hitHigh'], [18, 'guard']], contact: 0, startup: 0, active: 10, recovery: 8, root: [[0, 0], [10, -0.6], [18, -0.7]] });
  mv('hitMid', { keys: [[0, 'hitMid'], [12, 'hitMid'], [22, 'guard']], contact: 0, startup: 0, active: 12, recovery: 10, root: [[0, 0], [12, -0.8], [22, -0.9]] });
  mv('recoil', { keys: [[0, 'recoil'], [8, 'recoil'], [16, 'guard']], contact: 0, startup: 0, active: 8, recovery: 8, root: [[0, 0], [8, -0.35], [16, -0.4]] });
  mv('knockFly', { keys: [[0, 'hitFly'], [8, 'hitFly'], [16, 'tumble'], [26, 'tumble'], [34, 'down'], [44, 'down']], contact: 0, startup: 0, active: 30, recovery: 14, root: [[0, 0], [26, -5.5], [34, -6.5], [44, -6.7]], lift: [[0, 0], [10, 1.2], [26, 0.5], [34, 0], [44, 0]] });
  mv('getUp', { keys: [[0, 'down'], [10, 'kneel'], [20, 'rise'], [30, 'guard']], contact: 0, startup: 0, active: 20, recovery: 10, root: [[0, 0]] });
  mv('land', { keys: [[0, 'fall'], [3, 'landing'], [12, 'landing'], [22, 'guard']], contact: 3, startup: 3, active: 9, recovery: 10, root: [[0, 0]] });
  mv('fingerGun', { keys: [[0, 'loose'], [8, 'fingerGunA'], [12, 'fingerGun'], [30, 'fingerGun'], [42, 'loose']], contact: 12, startup: 12, active: 18, recovery: 12, root: [[0, 0]], sfx: {} });
  mv('stomp', { keys: [[0, 'guard'], [6, 'stompA'], [9, 'stomp'], [18, 'stomp'], [26, 'guard']], contact: 9, startup: 9, active: 9, recovery: 8, root: [[0, 0]], smear: { limb: 'nl', from: 6, to: 9 }, sfx: { 6: 'whooshM' } });
  mv('catchFist', { keys: [[0, 'loose'], [3, 'catchFist'], [20, 'catchFist'], [30, 'guard']], contact: 3, startup: 3, active: 17, recovery: 10, root: [[0, 0], [3, 0.1]] });
  mv('punchBoth', { keys: [[0, 'guard'], [5, 'crossA'], [9, 'punchBoth'], [16, 'punchBoth'], [28, 'guard']], contact: 9, startup: 9, active: 7, recovery: 12, root: [[0, 0], [9, 0.5], [28, 0.4]], smear: { limb: 'fa', from: 5, to: 9 }, strength: 3, sfx: { 5: 'whooshL' } });
  mv('dropLand', { keys: [[0, 'fall'], [2, 'dustLand'], [20, 'dustLand'], [34, 'walkOut']], contact: 2, startup: 2, active: 18, recovery: 14, root: [[0, 0]] });

  // other files (chars_shiki.js) queue pose/move registrations here; run them now that the library exists
  (HT.onPoses || []).forEach(fn => { try { fn(rig); } catch (e) { console.error('onPoses hook failed', e); } });
  HT.onPoses = { push(fn) { fn(rig); }, concat(a) { (Array.isArray(a) ? a : [a]).forEach(f => f(rig)); return this; } };
})();
