/* DOMAIN CLASH — the film's plan: acts and their scene ids, in order. Scenes register themselves (src/scenes/*.js);
   missing ids render as "in production" placeholders. Durations come from the scene files (multiples of one bar = 2 s).
   HT.RELEASED lists the acts in the published build (grows milestone by milestone); ?acts=I,II selects acts for
   development and review. */
window.HT = window.HT || {};
(function () {
  const HT = window.HT;
  HT.ACTS_ALL = [
    { id: 'test', title: 'Fight Test', scenes: ['fighttest'] },
    { id: 'I', title: 'The Strongest', scenes: ['a1_snow', 'a1_tokyo', 'a1_empty', 'a1_title', 'a1_rooftop', 'a1_opener', 'a1_gojo_walk', 'a1_intercut', 'a1_standoff', 'a1_exchange1', 'a1_exchange2', 'a1_clash'] },
    { id: 'II', title: 'Domain War', scenes: ['a2_signs', 'a2_expand', 'a2_shred', 'a2_watchers', 'a2_rct', 'a2_simple', 'a2_red', 'a2_clash2', 'a2_blossom', 'a2_three', 'a2_wheel', 'a2_clash5'] },
    { id: 'III', title: 'Unlimited Void', scenes: ['a3_frozen', 'a3_sixth', 'a3_drag', 'a3_decoys', 'a3_signal', 'a3_chase', 'a3_red', 'a3_blackflash', 'a3_adapt'] },
    { id: 'IV', title: 'Adaptation', scenes: ['a4_shadow', 'a4_smile', 'a4_palms', 'a4_rabbits', 'a4_corridor', 'a4_agito', 'a4_sit', 'a4_agito2', 'a4_arm', 'a4_climb', 'a4_crush', 'a4_flash34'] },
    { id: 'V', title: 'Hollow Purple', scenes: ['a5_red', 'a5_ride', 'a5_sky', 'a5_purple', 'a5_ash', 'a5_landing', 'a5_command', 'a5_breath'] },
    { id: 'VI', title: 'The World-Cutting Slash', scenes: ['a6_notch', 'a6_rise', 'a6_cut', 'a6_white', 'a6_airport', 'a6_salute', 'a6_credits'] },
  ];
  HT.RELEASED = ['I', 'II', 'III', 'IV', 'V', 'VI']; // M5: the whole film (the M0 fight test stays reachable with ?acts=test)
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('acts') : null;
  const want = q ? q.split(',') : HT.RELEASED;
  HT.ACTS = HT.ACTS_ALL.filter(a => want.includes(a.id));
  HT.POSTER_T = HT.ACTS.length && HT.ACTS[0].id === 'test' ? 8.35 : 120.5; // M1: the standoff wide (fight test: the Infinity stop)
})();
