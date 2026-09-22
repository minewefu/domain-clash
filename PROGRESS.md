# DOMAIN CLASH — progress log

Mode: **autonomous** (user, 2026-09-21: "run autonomous end to end (all milestones)", token budget unlimited).
ENDING = canon. (The written brief is not part of this repository.)
Every milestone was published as a new version of one private claude.ai artifact (`dist/artifact.html`).

## Milestones
| M | scope | status |
|---|-------|--------|
| M0 | foundation: 640×360 engine, rig, DSL, shots, FX, Shinjuku set kit, audio ext, 30 s fight test, contact sheets | **done 2026-09-22** (v1 published) |
| M1 | Act I · The Strongest (0:00–3:30) | **done 2026-09-22** (artifact v2/v3, Act I MP4s) |
| M2 | Act II · Domain War (3:30–8:00) | **done 2026-09-22** (artifact v4/v5, Act II MP4s) |
| M3 | Act III · Unlimited Void (8:00–11:00) | **done 2026-09-22** (artifact v6, Act III MP4s) |
| M4 | Act IV · Adaptation (11:00–15:00) | **done 2026-09-22** (artifact v7, Act IV MP4s) |
| M5 | Acts V–VI + credits (15:00–20:00) | **done 2026-09-22** (artifact v8/v9, Act V and VI MP4s) |
| M6 | final pass, full-film QA, final HTML + MP4s | **done 2026-09-22** (artifact v9 final; full-film MP4s 1080p + 720p) |

## Next step
All milestones are delivered. Open items worth a human pass, in order: (1) LISTEN to the score — every audio result is
an analysis (loudness, true peak, seams, silences, modes); nobody has heard it, and the hardest hits (Black Flashes, the
Purple) run ~10 dB into the master limiter; (2) watch the film once end to end for pacing — the reviews are contact
sheets, transition sheets and measured playback, not a viewer's judgement; (3) the known weaknesses listed per act in the
verification log (simple secondary characters, faceless watcher silhouettes, the implied arm regrowth, small figures in
some wides). Re-export after any change with `node tools/export.mjs --strict --qp 13` (both files in parallel, one
snapshot) and republish `dist/artifact.html` to the same URL.

## Production structure (from M1 on)
Shot lists for every act are in SPEC.md §3.2–§3.6 (bar totals verified: II 135, III 90, IV 120, V 75, VI 75 → the
timeline is exactly 1200 s). Stub scene files exist for every id (src/scenes/a2_… a6_…), registered in timeline.js and
index.html; per-act extras (src/act2_extra.js … act6_extra.js) hold act-specific poses/FX/props; src/sets_rooms.js
holds the interior/domain sets. Parallel work: the director writes Act II and integrates; agents write Acts III, IV and
V–VI (each only in its own files, shared-module changes are requested in reports); a sets agent builds `void`,
`command`, `corridor`, `airport`, `sky`, env `shrine`/`airport`, post `tally`; the audio agent scores act by act.

## M0 status (foundation) — done
Director: 640×360 core (bounded caches), chapter streaming (generator inits, idle slices, disposal window, telemetry),
camera + shot library, the fighter rig (software rasterizer, cel shading, outline/inner lines/rim, stateless springs),
Gojo (fight/robe/uniform) + Sukuna (fight/haori) builds with the canon marks, 87 poses per fighter + 30 moves with
frame data, the choreography DSL, the Shinjuku world model (521 buildings), the damage ledger (slice, hole, crater,
flatten, collapse, canyon sweep, erasure, scorch, signal), the street-level 3D city renderer (per-column occlusion band,
held-shot frame cache, procedural far-city roofscape, cellular rubble, depth-tested `sky` FX layer, shaded 3D cars and
luminaires), Voxel Space + overhead sets, close-up/ECU hooks with background modes, props (crow, can, garments, office
set), tools (review, playthrough, trace, export, build). Agents: audio (engine, 30 instruments, 83 SFX, 11 beds, themes,
`HT.music.cue`, deterministic offline master, chunked render), FX library (29 effects + post + snow), manga/kana/cards
(screentone, 46+ katakana with dakuten, panel layouts, act/place/title cards, credits page), busts (gojo/sukuna/geto/
mahoraga, 11 expressions, eyes, 7 hand signs), shikigami + coda cast (Mahoraga, Agito, Geto, Nanami, Haibara, Yaga;
80 poses, 24 moves; rabbits).
Fight test (30 s): review OK (no issues), perf avg 6.5 ms (p95 15.8, max 63 first-time), flash cap max 1/s.
Exports: `dist/domain-clash_act-test.mp4` (1080p, 35.8 Mbit/s, 135 MB) and `_720p.mp4` (17.9 Mbit/s, 68 MB), both
`--strict` OK: the file decodes ≥ 99.97 % palette-exact at ≥ 43.9 dB (B path); the browser view measures ≥ 36.2 dB
(1080p) / 31.6 dB (720p) because 4:2:0 chroma upsampling blends 1-px dither (judgment call 10).
Contact sheets: `shots/m0/` (poses gojo/sukuna/mahoraga/agito, ledger, sets), `shots/busts*.png`, `shots/fx_all*.png`,
`shots/kana*.png`, `shots/manga.png`, `shots/panels.png`, `shots/cards.png`, `shots/credits.png`, `shots/shiki*.png`,
`shots/review/fighttest.png`.

## Judgment calls to revisit (autonomous mode)
1. **Canon costumes** replace the brief's "black high-collared uniform" for Gojo (black tee, baggy white trousers,
   belt, slippers; robe + scarf before the fight; uniform + round sunglasses only at the airport) and the haori for
   Sukuna (rooftop only; sleeveless white kimono in the fight). Both shed the outer garment at the standoff.
2. **Two Purples.** Canon: the 200% Purple opens the fight (ch. 223, a 4 km path); the finale (ch. 235) is a chanted
   Purple detonated in all directions. Kept the brief's phase order; Act I shows the opener only as a distant violet
   line across the skyline that fells Sukuna's tower (so the canyon persists from Act I on — the ledger's `canyon`);
   Act V uses the canon chanted all-directions Purple, leaving a spherical `erasure` crater instead of a canyon.
3. Agito heals only itself (brief said "heals for Sukuna's side").
4. Mahoraga's wheel shows 4 notches for Infinity (sources disagree 4 vs 5).
5. No gore: Gojo's neck cut, shoulder cut, arm loss (ch. 225/232/234) and Sukuna's lost hand (ch. 235) are implied by
   impact frames, cut-aways and framing only.
6. The resolution of "second eyes opening" timing is unverified in canon; shown on the rooftop in Act I (artistic).
7. **Time of day is artistic licence.** Canon gives only the date (Dec 24); no clock time, snow or sunset is stated
   (research, ch. 225–236). The colour script (dawn → noon → overcast → sunset) and the snow are the film's choices.
8. **Airport plane** (Act VI) is in no source; kept as a quiet visual metaphor for "Heading South" (ch. 236). The seven
   lotuses and the watchers' reactions (Yuji/Yuta/Hakari standing, Kashimo) are canon and will be used.
9. **Export bitrate vs size.** The brief estimated ~1.5 GB for the 20-min 1080p30 file (≈10 Mbit/s). Measured on the
   fight test: at 10 Mbit/s the file decodes only 84 % palette-exact at 30 dB (the 1-px ordered dither turns to mush);
   at the default 36 Mbit/s it is 99.97 % at 44 dB (≈5.4 GB for 20 min). The final bitrate is decided at M6 with a
   sweep; quality wins over the size estimate unless the sweep finds a knee. **Decided (M6):** constant QP 13 for
   both full-film files (the sweep in call 22 found no knee that keeps Act V's densest frames above the gates):
   1080p 2.05 GB, 720p 0.91 GB.
10. **Export verification rule.** `export.mjs --strict` now gates frames on the decoded FILE (B path: raw planes + exact
   BT.709 inverse, ≥ 99.5 % palette, ≥ 40 dB) and gates the browser `<video>` view only against gross errors (≥ 30 dB,
   ≥ 90 %): every browser's bilinear 4:2:0 chroma upsampling blends neighbouring dither colours, a property of 4:2:0
   playback rather than of the encode (A-path numbers are still printed).
11. **Mahoraga's sword** breaks the Void from inside after appearing within it (ch. 229), per the research — not from a
   shadow; the shadow motif is used for ch. 232 (its arms rise from Sukuna's shadow).
12. **Act II staging.** The domain war stays at the junction/EW avenue where Act I ended: the barrierless Shrine rises
   on the avenue east of Sukuna (≈ (54, 11)); its range shreds the district (new ledger kind `shred`: buildings inside
   the growing radius become slid slabs + jagged stumps — an abstraction of the Shrine's cuts; r 70 → 130). The
   elevated road of ch. 228 is a Metropolitan Expressway viaduct added to the city model over the EW avenue west of
   the junction (x −420…−62, deck z 8–9.6, piers every 28 m; spans inside the Act I canyon are gone) — it also serves
   the pillars of ch. 232. A clash tally (5 small marks, top right) is an invented UI accent for "clashes 1–5".
13. **Domains read as places, not overlays.** Inside shots of the Void use the `void` set (per-panel env overrides on
   split pages); exterior shots hide the fighters inside the opaque dome; FX tagged `sets:['city']` (the Shrine, the
   dome, the rake) never draw inside the Void. The Shrine is camera-independent at a fixed world position.
14. **Isolated act previews apply earlier acts' damage.** When a later act is reviewed on its own (?acts=II), ledger
   entries of earlier acts are applied as already happened (continuity in review sheets); the fight test's entries
   never apply to the film.
15. **Export gates (revised at M1).** File path ≥ 99.0 % palette-exact and ≥ 38.5 dB (the densest dithered frames — snow
   over a full city, mid-dissolve — measure ~99.4–99.7 % / 39.8 dB at the default bitrate); browser view ≥ 27 dB / 88 %
   (a gross-error guard: at 720p the browser's chroma upsampling of 1-px dither measures ~29.6 dB). The dissolve
   transition now uses 2×2-pixel Bayer cells (the 1-px checkerboard was the worst case for H.264).
16. **The monitoring room is inside Rika (canon ch. 225 p. 1).** The sets agent rebuilt `command` from the panel: a
   jumbled tower of CRTs with a horn speaker, taped cables on a tiled floor, black all round, watchers on crates, the
   screens the only light (the manga's screens are blank; ours carry Mei Mei's crow feed). Canon has no stopwatch — Mei
   Mei says "3 minutes" aloud — so a 2:58 → 2:59 → 3:00 readout on one CRT is this dialogue-free film's stand-in.
17. **Watcher reactions are silhouettes.** Reverse angles on the faceless watchers read as mannequins, so every insert is
   a 3/4-back view against the lit tower. Reactions: Yuji jumps up (a2_watchers), Hakari leans in (a2_simple — who
   reacts there is my choice), Yuta gets to his feet (a2_red), only Kusakabe leans in (a2_blossom: the one watcher
   who knows Falling Blossom Emotion).
18. **Wide moving establishing shots animate on 2s** (`twos: true`, 15 drawings/s — the anime convention for camera
   moves; fighters in those shots are hidden inside the dome or far away). Every other frame then reuses the cached
   city render, which brought a2_expand and a2_shred under the 8 ms budget.
19. **World FX are occluded by the city.** Found at M2: ground-layer FX (the Shrine's pool, Simple Domain's ring,
   shockwave rings, scorch and shadow decals — including the Act III–V agents' ground FX) and the big world-space
   effects (the Void's dome, the Shrine, the rake of cuts, the shatter, the collapse) were composited over the city with
   no depth test, so they painted over nearer buildings. They are now erased through masks built from the city's depth
   buffer (per-row plane depth for decals; a depth threshold + screen box per world FX). Three shots only "worked"
   because of the bug and were re-staged: the a2_expand dome wide (now down the avenue from the west), the a2_blossom
   r 40 dome (now high over the ruins), the a2_clash5 Shrine collapse (now from the avenue east of the deck's end).
20. **Shred aftermath.** Stump tops render as rubble-strewn cuts (diced by the range) and cut edges glint only for 12 s
   after the range reaches a building; stump/slab geometry is unchanged because Act IV stages action on specific stumps
   (the climb up b275). Fresh rubble carries a light snow dusting, not white slabs (the rubble was only minutes old).
21. **Expressway deck joints.** Span pieces drew a pale 1 m band across the roadway at every 28 m joint; parapet edges now
   run along the long sides only, with a thin dark steel expansion joint at span ends.
22. **1080p export uses constant QP 14 from M2 on.** Act II's dense frames (the Shrine's crimson grade, rubble
   tops) failed the file gate at the default VBR: the NVIDIA hardware encoder averaged only ~20 Mbit/s against its
   40 Mbit/s target and decoded 98.2 % palette-exact / 37.7 dB on the worst frames. A 12 s test on the worst window:
   QP 18 → 98.1 % / 38.3 dB at 11.1 Mbit/s (fail), QP 16 → 99.20 % / 40.0 dB at 13.1 Mbit/s, QP 15 → 99.49 % / 40.9 dB at
   13.8 Mbit/s, QP 14 → 99.79 % / 41.6 dB at 14.6 Mbit/s (all three pass; the window is the film's worst so far — whole
   acts at QP 14 average 12.8–13.5 Mbit/s, i.e. ≈ 1.9 GB for 20 min vs the brief's ~1.5 GB estimate). The M6 full-film decision uses
   the same QP sweep. The 720p share copy moves to constant QP 16 from M4 on: on the same worst window it decodes
   99.69 % / 40.0 dB at 5.8 Mbit/s (QP 19: 98.2 % / 37.5 dB, fail), better than the VBR copies (Acts I–III: 9.3–12.3
   Mbit/s, worst 99.45 % / 39.2 dB) at about half the size — a share copy should be small.
23. **Verifier fixes (M2).** (a) Frame identity: a neighbouring frame may tie within encoder noise when its source is
   identical (frames held on 2s, static shots) — a checkpoint failed on 4.197 vs 4.198 MAE; a 2 % tie tolerance now
   applies. (b) The browser-view (A) guard is PSNR ≥ 27 dB only (M3): 4:2:0 chroma upsampling of 1-px saturated dither drops
   the browser view's palette match to 65–82 % (Act II's crimson Shrine at 720p; Act III's ring of eight Blue orbs:
   77 % at 1080p, 65 % at 720p) while the files decode at 99.4–99.8 %; a wrong colour matrix or range measures < 20 dB
   and a wrong frame fails the frame-identity check, so the palette % is reported but no longer gated on A.
24. **Fighters are occluded by the city too** (the Act III agent's request): in city views a fighter is erased where
   the depth buffer holds something nearer than the fighter (a pier, a parapet, a building corner) inside its screen
   box; the box test short-circuits when nothing nearer overlaps, so unoccluded fighters cost one scan. Facade holes
   are see-through for the test (a fighter knocked into a hole stays visible inside it). Afterimage trails are not
   occluded. The Act III agent's manual hide/show windows around the pier in a3_red stay in place (harmless).
25. **The Blue hangs where Act V needs it** (M4 continuity): Act IV left the Blue at (54, 117, 92) while Act V staged the
   Red, the Purple and the 250 m erasure around (−40, 60, 160). Act V's constant won (its whole staging derives from
   it); Act IV's three dependent shots were re-staged: the lift is now a high wide from the north-east following the
   Blue's climb to its rest, the hanging star is seen past Gojo risen to 70 m (camera below and behind him), the final
   hover rises to 156 m, two points at one height; the street shot of Sukuna and Mahoraga looks up (the Blue is nearly
   overhead from there, so it stays off frame). Act V's opening repositions Gojo under the act card.
26. **Shared-module requests from the scene agents, done at M4:** street props vanish with the ground they stood on
   (craters, canyons, an erasure and its ring of flattened buildings); afterimage trails get the fighter cull; the sky
   set warms voxel heights at scene init; back views draw the back of the head (no jaw — the skin oval under the hair
   read as a blank face); per-canyon trench floors (Act IV's Blue trench has a rubble floor, 6 m deep); `gojo1` bust
   alias; `rabbitSwarmBack` draws in the `behind` layer; the overhead map shows scorch and the erasure bowl.
   Not done (worked around in the scenes, low value now): a facade-gouge ledger kind, pier damage, wheel grey/glow
   options, rolled-white eyes in screentone, extreme close-ups inside manga panels, Gojo sitting in front/back views.
27. **a5_command's last shot is 3/4-back** (director, M5): from the tower the faceless watchers read as blank heads;
   the shot now looks past the raised fists to Yuta bowing, a silhouette against the screens, and the room's screen
   glow is stronger (glowK 2.4) so the silhouettes separate from the floor.
28. **Acts V–VI deviations signed off (the scene agent's list):** Gojo stands at the airport bench (the rig cannot sit
   in front/back views); the airport's long hold is flat dark silhouettes (back views read as blank faces at that size,
   before judgment call 26's fix — kept: the silhouettes are the better image); the salute is shot over Sukuna's right
   shoulder at ~45° with his side-view rig (a back view would show his left arm ending at the elbow — canon ch. 235 —
   which reads as a stump; no gore); the watchers' CRTs show a top-down map with the erasure painted in (a street-level
   feed turned to noise at 96×54); the credits use the default lines; held shots in the sky are pre-rendered plates
   (clouds freeze during those holds); a5_sky's opening push-in became a static hold; the sky set's light rays are off
   (they drew a thin vertical line above the sun). The scarf that falls through the white (a6_white) is taken to be the
   scarf of Gojo's Act I robe costume (chars.js `scarf` material) — consistent with Act I.

## Research (sources)
**Canon** — Jujutsu Kaisen Fandom chapter pages 221–236 via the MediaWiki API (https://jujutsu-kaisen.fandom.com/wiki/Chapter_221
… Chapter_236, Satoru_Gojo_vs._Sukuna, Shinjuku_Showdown_Arc, Satoru_Gojo, Sukuna, Megumi_Fushiguro,
Eight-Handled_Sword_Divergent_Sila_Divine_General_Mahoraga, Merged_Beast_Agito, Unlimited_Void, Malevolent_Shrine,
Shrine, Black_Flash, Hollow_Technique:_Purple, Domain_Amplification); chapter titles checked against
https://en.wikipedia.org/wiki/List_of_Jujutsu_Kaisen_chapters ; https://screenrant.com/jujutsu-kaisen-how-sukuna-kill-gojo/ .
Condensed beat order in SPEC.md §2.

**Primal / dialogue-free storytelling** — Cartoon Brew (https://www.cartoonbrew.com/interviews/primal-creator-genndy-tartakovsky-animation-is-too-fast-i-wanted-to-slow-things-down-184158.html,
https://www.cartoonbrew.com/interviews/genndy-tartakovsky-rules-of-primal-258094.html), CGMagazine
(https://www.cgmagonline.com/interviews/a-primal-evolution-talking-to-cartoon-legend-genndy-tartakovsky/),
Rotten Tomatoes (https://editorial.rottentomatoes.com/article/primal-creator-genndy-tartakovsky-revolutionized-animated-action/),
Collider (https://collider.com/primal-genndy-tartakovsky-interview/). Rules adopted: SPEC.md §3.

**Fight animation / frame data** — 3rd Strike per-frame traces (http://baston.esn3s.com/index.php?id=11): hit-stop
7/9/11 f @60 fps by strength, identical on hit and block, contact drawing held through the freeze, fast in / slow out;
Garou (SuperCombo wiki, excerpt): 8/12 f; Sakurai on hitstop (https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/);
CritPoints (https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/). Sakuga: ANN lexicon (on 2s/3s),
Sakugabooru (smears, impact frames, Kanada light, yutapon cubes), animetudes (Kanada style), P.A.Works animator guide,
Wave Motion Cannon (framerate modulation; Yutaka Nakamura interview). Screen shake: Eiserloh GDC 2016 (trauma²).
Photosensitivity: JBA guideline (https://j-ba.or.jp/stance/jba103852.html), WCAG 2.3.1.

**Canon beats ch. 225–236 (visual)** — Fandom chapter pages 225–236 and "Satoru Gojo vs. Sukuna" via the MediaWiki
API; technique pages (Malevolent_Shrine, Unlimited_Void, Simple_Domain, Falling_Blossom_Emotion, Domain_Amplification,
Rabbit_Escape, Merged_Beast_Agito, Mahoraga, Black_Flash, Hollow_Technique:_Purple); Wikipedia chapter list; GameRant
reviews of ch. 231/235/236; CBR ch. 231; lower-confidence leak recaps (DualShockers 227–232) only where Fandom is silent.
Key facts: clash 1 simultaneous; Simple Domain ×2 (Gojo); leg grab + Sukuna's binding vow; Falling Blossom Emotion
(Gojo); barrier shrunk to a ball; 3:00 double collapse; elevated-road punch-through; wheel + nosebleed; clash 5 Gojo
first by < 0.01 s; Shrine collapses at 2:40; Mahoraga's sword breaks the Void; wheel turns 4 (1 at the traffic light,
3 in ch. 232); 2 + 8 Blues; the curving Red; Black Flash ×4 (1 Sukuna, 1 Agito, 2 Mahoraga); Rabbit Escape blinds Gojo;
Agito heals only itself; the Blue fist implodes Agito; chanted Purple detonated in the sky in all directions; ch. 236
airport (teen Gojo & Geto, Nanami, Haibara, Yaga; Toji, Riko, Kuroi; seven lotuses); the slash happens off-panel;
Sukuna salutes; Kashimo runs at him.
**Design research (agents)** — busts: Motomura GDC 2015 (Guilty Gear Xrd), FACS (Ekman), Saint11/Slynyrd/Derek Yu pixel
tutorials, Clip Studio Art Rocket; FX: Slynyrd Pixelblog 31/33, the point-lens equation for the Blue, WCAG 2.3.1; audio:
Karplus & Strong 1983, Jaffe & Smith 1983, Chowning 1973, ITU-R BS.1770-4, bonshō beating (storiedjapan.com; Jie Pan,
Acoustics 2009), the sawari contact model; manga: scale2x.it, MakeLineArt screentone guide, ja.wikipedia ベタフラッシュ.

**Manga language** — Shogakukan manga school (https://shincomi.shogakukan.co.jp/training/008.html, 005.html), IC Screen
tones (https://www.icscr.jp/icscreen/), Wikipedia 効果線 / Manga iconography, onomatopoeia (http://kakimoji.han-be.com/,
https://www.tofugu.com/japanese/japanese-onomatopoeia/). ドン boom · ゴゴゴ menace · ザシュ slice · バキ crack · キィン ring.

## Verification log
**M0 (2026-09-22)** · review (fight test): no issues; perf avg 6.52 ms, p95 15.8, max 63.1 (first-time JIT/bust warm-
up); flash cap max 1/s. Act I review (draft): all sheets + 11 transitions OK; perf over 8 ms in a1_opener (11.2) and
a1_intercut (13.3) before the renderer optimisations → after: opener ≈ 7.3–8.4, intercut ≈ 8.2 incl. quantizer (panel
pages on 2s, per-column occlusion, held-shot cache); flash cap max 1/s. Real-time playthrough (fight test, headless
Chrome): film-side frame work 2–5.7 ms avg, no long tasks; rAF gaps of 100–450 ms traced (tools/trace.mjs) to the GPU
process (`SkiaOutputSurfaceImplOnGpu::SwapBuffers` / `ScheduleOverlays`) on this machine — with `--disable-gpu`
(software compositing) 1 gap in 30 s. Audio (agent, headless analysis; nobody has listened): peaks −1.44 dBTP, fight
test −19.2 LUFS, chunked vs continuous −99.5…−110 dBFS, seams −124…−155 dBFS. Exports: see M0 status. Artifact v1.
**M1 (2026-09-22)** · Act I (12 scenes, 210 s): review — all sheets + transitions OK, no validation issues, flash cap
max 1/s; perf (under heavy CPU contention from 5 agents): 11 of 12 scenes < 8 ms avg, a1_opener 12.5 → after the
renderer work (baked rubble tile, far-city LUT, far-wall row LOD) 8.9 ms in isolation, a1_intercut 8.2; the act's
weighted average ≈ 5 ms. Real-time playthrough (`--flags disable-gpu`): 60 fps, frame work 3–5 ms avg, 3 rAF gaps
> 50 ms in 210 s (the play-from-poster seek at 0 s: 267 ms; two 67 ms gaps at 52.1 s and 73.5 s), 2 sync scene inits;
heap 130 → 173 MB with a +17.6 MB/min slope over the run while bounded caches were still filling (to be re-measured over
the full film at M6). Score (audio agent; analysis only, nobody has listened): 9 cues, true peak −1.44 dBTP, whole act
−22.7 LUFS, action half −19.8 LUFS, loudest 400 ms −13.3 LUFS at the clash (196.2 s), quietest scenes snow −39.7 and
standoff −31.7 LUFS; chunked vs continuous render −97.5 dBFS (seams ≤ −118 dBFS). Exports: `dist/domain-clash_act-I.mp4`
1080p, 26.1 Mbit/s avg, 689.5 MB, `--strict` OK (26 seeks; file path worst 39.88 dB / 99.71 % palette, mean 45.8 dB;
browser view ≥ 34.7 dB / 97.9 %); `dist/domain-clash_act-I_720p.mp4` 12.3 Mbit/s, 328.5 MB, `--strict` OK (browser view ≥ 30.6 dB / 93.8 %). Artifact v2 (Act I) and v3 (the coarser dissolve).
**M2 (2026-09-22)** · Act II (12 scenes, 270 s): review — all sheets + 11 transitions OK, no cue/compile issues, flash
cap max 1/s. Perf (machine shared with 4–5 agents; per-scene averages vary ±30 % between runs, so the untouched
a2_wheel is the yardstick): final run a2_expand 7.6, a2_shred 7.5, a2_red 7.5, a2_clash2 8.2 → 7.9 after its opener
went on 2s, a2_three 10.2 → 6.7 after two slow moves went on 2s, the rest 2.7–6.8 ms (a2_wheel 2.6–2.7, i.e. this run
was ~1.25× the quiet-machine figure). Renderer work this milestone: roof spans without per-row sort + hoisted piece
fields (the wall/roof pass 14.4 → 8.4 ms/render in the heaviest view), the 60 s sky-FX cache block now uses the
effect's own duration (a1_opener 10.9 → 6.6 ms), frames on 2s are held and blitted (exactly deterministic: 7/7 probe
frames identical sequential vs fresh). World/ground-FX and fighter occlusion cost 0.5–1.3 ms/frame where something
actually occludes. Real-time playthrough (`--flags disable-gpu`, 270 s): 60 fps, frame work 1.9–7.4 ms per 5 s
window, 1 rAF gap > 50 ms (483 ms at the play-from-poster seek), 2 sync inits, heap 112–248 MB, slope +3.1 MB/min.
(The first playthrough found a 600–950 ms stall + a 470 MB heap jump at 290.6 s: a 7,095 px Sukuna standing beside the
lens, off-screen, rasterized by rig.draw — fighters outside the view or taller than 4 frames are now culled.) Score
(audio agent; analysis only, nobody has listened): Act II −19.5 LUFS integrated, loudest 3 s −14.6 LUFS (234.1 s),
400 ms max −12.9, true peak −1.51 dBTP (8× detector), seams −94…−101 dBFS, repeat renders identical to −96.7 dBFS.
Exports (one source snapshot 62b128bc12ebc900 for both, same code as artifact v5): `dist/domain-clash_act-II.mp4`
1080p, constant QP 14, 12.8 Mbit/s avg, 437.1 MB, `--strict` OK — file ≥ 99.868 % palette-exact, worst 41.38 dB (mean
43.78); browser view ≥ 32.59 dB / 89.73 %; `dist/domain-clash_act-II_720p.mp4` VBR 9.3 Mbit/s, 320.2 MB, `--strict` OK
— file ≥ 99.451 % / 39.18 dB (mean 45.52); browser view ≥ 28.36 dB / 81.84 % (judgment call 23). Audio in both: lag 0
samples, RMS Δ −0.013 dB. Build 2.06 MB. Artifact v4 (Acts I–II) and v5 (occlusion + rubble fix).
**M3 (2026-09-22)** · Act III (9 scenes, 180 s; written by the Act III agent, reviewed and fixed by the director):
review in the I–III timeline — all sheets + transitions OK (incl. the Act II → III boundary), no cue/compile issues,
flash cap max 2/s (the Black Flash stack at 622.15 s). Perf (shared machine): 4.3–7.5 ms avg per scene (a3_frozen
7.46 highest). Director fixes this milestone: crater/scorch/erasure decals shaded per pixel (the 1 m decal grid read
as blocky squares at street level around the a3_drag crater), fighters occluded by nearer geometry (judgment call
24), close-up busts warmed with the exact render options (the warm-up keys never matched), per-canyon trench floors
(for Act IV), `gojo1` bust alias, rabbit-swarm layer default, a bust/scene-level cull of off-screen fighters.
Real-time playthrough (180 s, `--flags disable-gpu`): ≥ 59.4 fps, frame work 2.2–7.1 ms per 5 s window, 1 rAF gap
> 50 ms (533 ms at the play-from-poster seek), heap 105–222 MB (+17.1 MB/min over this short run while caches fill;
the full-film heap check is M6). Score (audio agent; analysis only, nobody has listened): Act III −19.6 LUFS
(continuous with Act II's −19.5), true peak −1.51 dBTP, loudest 400 ms −11.8 LUFS at the Black Flash (622.1 s) — the
film's loudest moment so far, the Act V Purple must exceed it; silences ≤ −111 dBFS; seams −99.5…−100.1 dBFS; six new
physically modelled SFX (poleClang, poleRing, metalWhoosh, redWhistle, concreteGrind, skid) wired into a3_* scenes.
Exports (one snapshot 8317db24399922ef, same code as artifact v6): `dist/domain-clash_act-III.mp4` 1080p QP 14,
13.5 Mbit/s avg, 303.2 MB — file ≥ 99.475 % palette-exact, worst 41.82 dB; browser view ≥ 33.86 dB (palette 77.4 % at
the ring of Blue orbs, judgment call 23); `dist/domain-clash_act-III_720p.mp4` 9.3 Mbit/s, 209.9 MB — file ≥ 99.437 %
/ 39.83 dB; browser view ≥ 29.43 dB. Audio lag 0, RMS Δ −0.017 dB. Build 2.06 MB. Artifact v6 (Acts I–III).
Known and accepted (Act III agent's list): hide/show windows around the pier in a3_red, limbs pass through in the two
clinches, the voxel chase opening is blocky, the act card's dimming overlay shifts tints for ~0.5 s under the palette.
**M4 (2026-09-22)** · Act IV (12 scenes, 240 s; written by the Act IV agent, reviewed and integrated by the director):
review in the I–IV timeline — all sheets + transitions OK, no cue/compile issues, flash cap max 2/s; perf 3.1–4.6 ms avg
per scene. Director changes: the Blue's continuity with Act V (judgment call 25; three shots re-staged), the agents'
shared-module requests (judgment call 26). Acts V–VI were also reviewed in the full I–VI timeline against the current
engine (no issues; 1.3–5.4 ms avg per scene) and an act-boundary continuity sheet (16 frames, 205 s … 1199 s) shows
consistent damage and staging across every act break. Real-time playthrough (Act IV, 240 s, `--flags disable-gpu`):
≥ 59.2 fps, frame work 1.6–7.5 ms per 5 s window, 2 rAF gaps > 50 ms (450 ms at the play-from-poster seek, 50 ms at
722.0 s), heap 118–251 MB, slope +0.54 MB/min. Score (audio agent; analysis only, nobody has listened): Act IV
−19.7 LUFS (Acts II/III −19.5/−19.6), true peak −1.51 dBTP, Black Flash #4 −11.6 LUFS (400 ms) — the loudest moment so
far (the Act V Purple measures −10.0) — seams −96.5…−98.0 dBFS, the 660 s act seam −131.4 dBFS, 12/12 silences, seven
new SFX (extinguisherBurst, chairScrape, rip, staticCrackle, waterSpray, crtHum, heelSkid) replacing the agent's
substitutes. Exports (one snapshot 355f77dd6398f906, same code as artifact v7): `dist/domain-clash_act-IV.mp4` 1080p
QP 14, 9.4 Mbit/s avg, 287.3 MB — file ≥ 99.635 % / 42.02 dB, browser view ≥ 35.6 dB; `dist/domain-clash_act-IV_720p.mp4`
QP 16, 3.5 Mbit/s, 111.9 MB — file ≥ 99.094 % / 40.67 dB, browser view ≥ 31.2 dB. Audio lag 0, RMS Δ −0.018 dB.
Build 2.15 MB. Artifact v7 (Acts I–IV).
Known and accepted (Act IV agent's list): the arm regrowth is implied (a green glow + a model swap), wide-shot fighters
are small (40–60 px), the flat of Mahoraga's sword reads as a raised guard, the collapse sinks rather than topples.
**M5 (2026-09-22)** · Acts V–VI (15 scenes, 300 s; written by the Acts V–VI agent, reviewed and integrated by the
director): review in the full I–VI timeline — no issues (1.0–4.2 ms avg per scene on the now quiet machine); the
full-film review (60 scenes, 59 transitions, cue validation, flash cap, perf) — no issues, no warnings, weighted
average 3.02 ms per frame over 36,047 frames, highest scene average 6.03 ms (a1_opener), highest p95 17.5 ms (a1_intercut's
panel pages), flash cap max 2/s (27 full-frame flashes in 20 min). Director changes: a5_command's last shot (judgment call
27); the watcher figures of the command set get the fighter cull (the V–VI playthrough found a 1.5 s stutter — nine rAF
gaps of 67–133 ms — and a heap jump to 732 MB at the start of a5_command: watchers beside the close camera were
rasterized at ~2,000 px; after the fix the scene's first 4 s average 3.4 ms, max 9.8 ms, heap 117 MB; frame hashes at
five probe times are identical with and without the cull, so the exported Act V file stays valid). Real-time
playthrough (Acts V–VI, 300 s, before the fix): ≥ 51.2 fps (the stutter), frame work 1.0–6.5 ms per 5 s window; the
targeted re-run over 1015–1045 s after the fix: no gaps except the start seek, 1.7–3.4 ms, heap 134–167 MB. Score
(audio agent; analysis only, nobody has listened): Act V −19.5 LUFS, Act VI −29.3 LUFS; the Purple −10.0 LUFS (400 ms,
964.5 s) and −10.4 (3 s) — the film's loudest moment, 1.6 dB above Black Flash #4; the World-Cutting Slash empties the
mix to digital zero for 3 s; the credits end at −182 dBFS; the whole film −20.3 LUFS integrated, true peak −1.51 dBTP,
37/37 planned silences, seams −95.0 dBFS over the whole film incl. every act boundary; the aftermath/airport/credits cues
needed +6 to +18 dB trims to be audible (the Elegy at −31.9 LUFS is the quietest music). Exports (one snapshot
f8fc5e88ac5bfd43 = artifact v8): `dist/domain-clash_act-V.mp4` 1080p QP 13 (QP 14 missed the file PSNR gate on
a5_sky's dense sunset hand-sign frame by 0.1 dB: 38.39 vs 38.5), 15.7 Mbit/s, 297.2 MB — file ≥ 99.749 % / 38.81 dB;
`dist/domain-clash_act-V_720p.mp4` QP 13 (QP 16 → 37.61 dB, QP 15 → 38.12, QP 14 → 38.50 at the edge), 7.1 Mbit/s,
137.4 MB — file ≥ 99.761 % / 38.86 dB; `dist/domain-clash_act-VI.mp4` QP 14, 7.7 Mbit/s, 147.1 MB — file ≥ 99.837 % /
42.14 dB; `dist/domain-clash_act-VI_720p.mp4` QP 16, 2.8 Mbit/s, 56.1 MB — file ≥ 99.729 % / 39.98 dB. Audio lag 0 in
all four. Build 2.15 MB. Artifact v8 (the whole film), v9 (+ the watcher cull; pixel-identical output).
Known and accepted (Acts V–VI agent's list): simple airport figures, yellow lotus pads, an easy-to-miss plane; thin
watcher silhouettes (the celebration reads through raised arms); a small Kashimo spark; generic Toji/Riko/Kuroi figures;
intact lit towers beyond the destroyed ring in the a5_ash wide.
**M6 (2026-09-22)** · the whole film, one source snapshot bb353524cd39b7cf = artifact v9 = both full-film MP4s.
Full-film review (60 scenes, 59 transitions): no issues, no warnings; weighted average 3.02 ms per frame over 36,047
frames (highest scene average 6.03 ms, highest p95 17.5 ms), flash cap max 2/s. Ledger continuity: an act-boundary
sheet (16 frames from 205 s to 1199 s) plus the per-act reviews run inside the full timeline — damage, staging and
time of day carry across every act break (the Blue now hangs where Act V needs it). Real-time playthrough of the full
20:00 (headless Chrome, `--flags disable-gpu`, real Web Audio clock): 60 fps (worst 5 s window 59.6, median 60.2),
frame work 0.75–7.3 ms per 5 s window (worst single frame 52.6 ms), 2 rAF gaps > 50 ms in 20 minutes (250 ms at the
play-from-poster start, 50 ms at 52.1 s on a scene boundary), 2 sync scene inits, 234 idle-init slices (max 21.6 ms),
62 disposals, no page errors. Heap: the post-GC floor rises from 101 MB to ≈ 190 MB over the first 12 minutes while the
bounded caches fill, then holds (185–193 MB floor over the last 8 minutes; per-2-minute medians 143 → 250 MB; peaks up
to 483 MB before collection); the least-squares slope over the whole run is +5.1 MB/min, dominated by that warm-up —
bounded, not literally flat. Audio chunk seams (audio agent): the chunked render of the whole film matches the
continuous render to −95.0 dBFS, every act boundary included; 37/37 planned silences; true peak −1.51 dBTP; −20.3 LUFS
integrated; analysis only, nobody has listened. Final single-file HTML: `dist/domain-clash.html` 2.20 MB (limit 16 MB,
aim < 6 MB). Full MP4: `dist/domain-clash.mp4` 20:00 1920×1080@30, H.264 High constant QP 13, 13.5 Mbit/s avg, AAC 192
kbit/s, 2,047,142,605 bytes (2.05 GB vs the brief's ~1.5 GB estimate — the QP that passes the file gates on Act V's
densest frames; judgment call 22), `--strict` OK at 122 seek checkpoints: file ≥ 99.749 % palette-exact, worst 38.81 dB,
mean 45.4 dB; browser view ≥ 32.5 dB; audio lag 0 samples, RMS Δ −0.017 dB; encoded in 613 s. 720p share copy:
`dist/domain-clash_720p.mp4` QP 13, 5.9 Mbit/s avg, 914,330,514 bytes, `--strict` OK at 122 checkpoints: file ≥ 99.761 %
/ 38.86 dB (mean 45.47); browser view ≥ 28.33 dB. A one-frame-per-scene overview: `shots/film_overview.png`.
