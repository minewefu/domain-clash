# DOMAIN CLASH — production spec (shared by every contributor)

A 20-minute, 16:9, dialogue-free 2.5D pixel-art fan film of the Gojo vs Sukuna fight (Jujutsu Kaisen, "Shinjuku
Showdown", ch. 221–236), made **entirely of code**: every pixel is drawn by JS on a canvas and every sound is
synthesized with the Web Audio API. **No image files, no audio samples, no voices, no libraries.** Fan tribute for
personal, non-commercial use — original pixel interpretations only (no traced panels, no copied dialogue).
Credit line (credits + page): *Jujutsu Kaisen © Gege Akutami / Shueisha. Unofficial fan work.*

Engine lineage: HELLO, TOMORROW (an earlier code-only pixel short, never modified) → upgraded here to 640×360,
a skeletal fighter rig, a choreography DSL, a 3D city set kit, chapter streaming and a bigger synthesized score.

---------------------------------------------------------------------------------------------------
## 1. Hard rules (every file)

* **Resolution 640×360** (×3 = 1080p, ×2 = 720p). All drawing at integer pixels. `HT.W`, `HT.H`.
* **Palette: Resurrect 64** (Kerrie Lake). Every frame is quantized with Yliluoma-style 2-colour ordered dither.
  Use exact palette colours (`HT.C.*`) for crisp shapes; gradients/glows/alpha are allowed and dither.
* **Determinism:** `draw(ctx, t, T)` is a pure function of `t` (scene seconds; `T` = film seconds). No
  `Math.random()` at draw time, no state carried between frames, no frame-rate dependence. Seeded randomness only
  (`HT.hash(i, seed)`, `HT.rng(seed)` in init). Seeking, contact sheets and video export must be exact.
* **Performance:** < 8 ms average per frame (whole frame incl. quantizer) on a desktop; spikes < 25 ms.
  Pre-render static layers in `init()`; per-frame caches must be bounded (`HT.lru`).
* **Classic scripts, one global `HT`.** No modules, no build step for dev (`index.html` works from `file://`).
* **No voices/speech/shouts/cheering** in the sound, **no text dialogue/subtitles**. Allowed text: katakana
  onomatopoeia, English act/place/title cards, in-world signage, credits.
* **Stylised violence, no gore:** no depicted wounds, no severed limbs on screen. Canon injuries are implied by
  impact frames, cutaways, framing, and at most a thin nosebleed line / thin cut line that RCT heals.
* **Photosensitivity:** at most 3 full-frame flashes or high-contrast inversions in any 1 s window (NHK/JBA
  guideline, WCAG 2.3.1). `tools/review.mjs` validates this.

---------------------------------------------------------------------------------------------------
## 2. Canon research → design decisions (sources in PROGRESS.md §Research)

Sources: Jujutsu Kaisen Fandom chapter pages 221–236 (read through the MediaWiki API), "Satoru Gojo vs. Sukuna",
character/technique pages; Wikipedia chapter list. Canon beat order (condensed):
223 200% Hollow Purple (full incantation, from a Shibuya rooftop) flattens ~4 km toward Sukuna's Shinjuku tower ·
224 Gojo drops his outer robe; Infinity vs domain amplification; Blue slams Sukuna through a building; finger-gun
Dismantle halves a tower; simultaneous punches flatten a building · 225 Domain clash 1 (barrierless Shrine shreds
UV from outside; Gojo's neck cut) · 226 RCT at full output, 2× Simple Domain shredded, Blue-lunge + point-blank Red ·
227 clash 2 (barrier toughened vs outside; Sukuna grabs Gojo's leg + binding vow), Falling Blossom Emotion, clash 3
(barrier shrunk to a ball) · 228 3 minutes, both collapse; Mahoraga's wheel turns in darkness; Gojo's nosebleed ·
229 clash 4 (both reset with RCT), clash 5 (Gojo first by <0.01 s): UV lands, Shrine collapses, Sukuna stunned;
Mahoraga's sword shatters UV · 230 6th expansion fails; the wheel now over Sukuna's head; Blue pull + right hook ·
231 Blue-only fighting (Red kept unadapted); Gojo lands on a pedestrian signal, flings it with Blue · 232 2 then 8
Blues; Red loops around a building; **Black Flash** to the sternum; adaptation completes; Mahoraga drags Gojo into the
shadow and cuts through Infinity · 233 Rabbit Escape swarm; Agito summoned (3-on-1) · 234 Black Flash through Agito,
it regenerates (it heals **only itself**); Gojo crushes Agito with a Blue fist · 235 Black Flashes (4 in the fight,
all Gojo's); chanted Red at the floating Blue; **chanted Purple detonated in all directions in the sky**: Mahoraga
and the wheel disintegrate, Sukuna burned; the watchers believe Gojo won · 236 opens in an airport limbo (Gojo and
Geto as students; Nanami, Haibara, Yaga), then the reveal: the World-Cutting Slash (Sukuna's Dismantle aimed at the
world, learned from Mahoraga's adaptation to Infinity).

**Changes from the brief (kept its phase order; adjusted wrong details):**
1. Gojo's outfit is not the black uniform: he fights in a tight black short-sleeved T-shirt, baggy white trousers
   gathered at the ankles, a black belt knotted at the back, black martial-arts slippers; before the fight a pale
   loose robe with a dark scarf. The black high-collar uniform + small round sunglasses appear only at the airport.
2. Sukuna's black haori is worn only on the rooftop (ch. 221–222); he fights in a sleeveless white kimono (black
   undershirt, black belt, white trousers, black sandals) with black double bands on his arms. Both fighters shed their
   outer garment at the standoff (a symmetric beat that is also canon for Gojo).
3. The finale Purple (Act V) is the canon *chanted* Purple — the floating Blue left from Agito's destruction +
   chanted Red → detonated in all directions above the city — not "200%". Its damage is a vast spherical erasure
   crater (the ledger's `erasure`), which replaces the brief's "canyon". The 200% Purple that opened the canon fight
   (ch. 223) is referenced in Act I as a distant opening salvo line of violet light (see §3) so the persistent
   **canyon** exists from Act I on; the phase order of the fight proper is unchanged.
4. Agito heals only itself (Round Deer's RCT); Gojo destroys it so it cannot heal Sukuna.
5. Mahoraga's wheel: one notch per adaptation step (sources disagree whether Infinity took 4 or 5 spins; we show 4
   notches for Infinity, clunk each). The wheel first appears over Sukuna's own head (ch. 230), then Mahoraga.
6. Black Flashes are Gojo's (Sukuna lands none in this fight).
7. Mahoraga's sword shatters Unlimited Void from inside (ch. 229) — Act III's "shadow twitches" pays off there.
8. The Cut: the brief's diagonal frame-split is kept as the film's visual metaphor for the World-Cutting Slash.

---------------------------------------------------------------------------------------------------
## 3. Film structure (120 BPM; 1 bar = 2 s; every scene starts on a bar line; durations are multiples of 2 s)

Act spans (fixed): **I 0:00–3:30 · II 3:30–8:00 · III 8:00–11:00 · IV 11:00–15:00 · V 15:00–17:30 · VI 17:30–20:00**.
Scene ids and order live in `src/timeline.js` (`HT.ACTS`). Scene files: `src/scenes/a<act>_<name>.js`.
Each act: build → climax → breath. Primal rules (Tartakovsky, see research): phrase action like music (3–5 beats,
then one held breath); hold key shots 10–20 s; silence first; camera for legibility; figure/ground in opposite
values; one unreal colour at the peak; score the loss, not the action; never repeat choreography; escalate with new
actions, not faster cuts; show exhaustion and cost.

Colour script: I cold dawn blues, white snow, blinking traffic lights · II Void (navy/ink + prismatic) vs Shrine
(crimson/maroon/bark + bone white), split compositions · III harsh noon, dust and smoke · IV overcast wreckage
(charcoal/slate/rust), Mahoraga's white and gold the brightest thing · V sunset gold → violet, Purple owns the palette
· VI stark white, then the airport in soft warm pastels (the only calm, sunny space).

Draft outline (each milestone refines its act into a shot list in §3.x before building):
* **I The Strongest** snowflake through black → dawn over evacuated Tokyo (Dec 24) → empty Shinjuku, blinking
  signals, a crow (Mei Mei's feed) → title → Sukuna on a skyscraper roof (haori, grin, second eyes open) → far away a
  thin violet line crosses the skyline (the 200% Purple opener, seen from afar; the canyon) → Gojo walks in, robe and
  scarf, hands in pockets, stretches → intercut walks → standoff at the intersection, both shed outer garments, a can
  rolls, dolly zoom → first exchange (Infinity stops fists, Gojo floats under an uppercut, finger-gun Dismantle, a
  tower slides apart a beat later, Blue slams Sukuna through a building) → simultaneous punches: colossal shockwave.
* **II Domain War** hand-sign panels → Unlimited Void vs barrierless Malevolent Shrine spilling into the city, the
  frame split diagonally → clashes 1–5 with a tally (neck nick + RCT, Simple Domain shredded, Blue lunge + point-blank
  Red, leg grab + binding vow, the ball-sized barrier, 3 minutes, nosebleed and steam, the wheel turning in darkness,
  both resetting with RCT) → clash 5: the Void wins.
* **III Unlimited Void** Sukuna paralysed in information glyph streams → barrage (afterimages, smears, chest
  thrust) → Mahoraga's sword shatters the Void from the shadow → 6th expansion fails → the wheel over Sukuna's head →
  Blue pull, voxel-city chase, building-face drag, the traffic-signal throw (the signal turns green) → 8 Blues, the
  curving Red, **Black Flash** → Sukuna regenerates and smiles; the wheel completes; his shadow twitches.
* **IV Adaptation** Mahoraga rises and cuts through Infinity (a slash finally nicks Gojo) → Rabbit Escape swarm →
  Agito, 3-on-1 → Black Flash through Agito, it regrows → Blue-fist crush of Agito → Black Flashes, both through a
  building → the city collapses → chanted Red skyward at the floating Blue; Gojo withdraws skyward.
* **V Hollow Purple** high above the city at sunset, silence → the incantation as glyph rings and hand gestures →
  the Purple dwarfs the towers, detonates in all directions → Mahoraga and the wheel disintegrate, Sukuna engulfed →
  ash and snow; Gojo lands, exhausted, smiling (manga close-up); silent celebration in the command post.
* **VI The World-Cutting Slash** the wheel's last notch → Sukuna rises from the smoke, regenerating → one calm
  swipe → silence → every layer of the frame splits along a diagonal and slides apart → white → the scarf from Act I
  falls into the snow → airport lounge (Geto waving from a bench, old friends, a plane taking off) → credits as a
  B/W screentone manga page.

---------------------------------------------------------------------------------------------------
## 4. Core API (`src/core.js`, inherited — see hello-tomorrow/SPEC.md §5 for the full list)

Palette `HT.C.<name>` (64 names: ink shadow dusk rosewood sand mauve lilacgrey steel mist white maroon brick vermilion
coral crimson red orange amber gold wine rust clay tan honey bark olive moss lime butter pine green leaf mint sprout
charcoal slate sage fern lichen deepteal teal jade aqua foam navy indigo blue sky ice plum purple violet lavender
blush berry rose pinkrose pink magenta raspberry hotpink salmon peach cream). NB: `blue` #4d65b4, `sky` #4d9be6,
`ice` #8fd3ff. Ramps `HT.R.*`. Math `HT.clamp lerp seg smooth E.<ease> hash rng noise fbm frame`. Primitives
`HT.rect px hline vline line thick circle ring ellipse poly tri vgrad hgrad dither ditherMask glow shadowBlob alpha`.
Canvases/sprites `HT.canvas sprite spr outlined recolor tint flipped`. Text `HT.text textWidth title3d` (fonts
'small' 5×7, 'tiny' 3×5). 2.5D `HT.parallax mode7 isoPt isoBox stack shake`. `HT.fx.fade iris vignette scanlines`.
New: `HT.lru(max)` bounded cache; `HT.caches` registry; scene contract below.

**Scene contract:** `HT.scene({ id, act, title, dur, transitionIn: {type, dur}, init(), draw(ctx, t, T), dispose(),
cues: [...], ambience: [...] })`. `init()` may return an iterator (generator) — each `next()` ≤ ~4 ms — for
incremental idle-time init. Store init resources on `this.R` (cleared by dispose). Transitions: cut fade white flash
smash iris wipe whip slide dissolve. Most scenes are built with `HT.fightScene` (§7) instead of by hand.

**Streaming (`src/main.js`):** `HT.ACTS` → `HT.timeline` (entries `{id, def, act, start, dur, ...}`);
`HT.stream.ensure(i)` (sync init), `idle(i)` (sliced init of upcoming scenes, ≤ 3.5 ms per frame), window
[i−1, i+2] (others disposed). `HT.bootTasks.push({name, fn})` for shared startup work (fn may be a generator).
Test modes: `?scene=id&t=`, `?sheet=id&n=&cols=&scale=&from=&to=&times=`, `?sheetAll=1`, `?lab=<name>` (§12).

---------------------------------------------------------------------------------------------------
## 5. Camera and shots (`src/cam.js`)

World metres: x east, y north, z up; ground z = 0. Camera `{x, y, z, yaw, pitch, roll, f, shift, sx, sy, vx, vy, vw,
vh}` (yaw 0 = looking north; f = focal length px; shift = vertical lens shift px; sx/sy = shake px; v* = viewport).
`HT.cam.make(o) prep(c) project(c, x, y, z) → {x, y, s (px per metre), d (depth)} | null`, `toView ray lookAt blend
frame(pts, opts) fovX forward right`. Shots (`HT.shots.<name>(S, t, p, t0)` → camera): `static wide medium full low ots
closeup ecu crash dolly orbit overhead path follow`, plus `panels` (manga.js). Framing sizes: wide ≈ 56 px per 1.8 m,
medium ≈ 96, full ≈ 150; close-ups are hand-authored busts (§10).
In the city set (a shear set) pitch is folded into lens shift so verticals stay vertical: a steep look-up at a NEAR
subject shows empty facade — crane the camera up instead (Act IV found this in a4_climb). Keep pitch > −1.0 or the
runner switches to its overhead mode. Check that a camera is not inside geometry that later damage creates (slid
slabs, collapses) — with occlusion on, a wall in front hides the FX behind it too.

---------------------------------------------------------------------------------------------------
## 6. Fighter rig (`src/rig.js`, `src/chars.js`, `src/chars_shiki.js`, `src/poses.js`)

A 2D skeletal rig rasterized in software per drawing: FK (side = fighting-game 3/4 view, or front/back) → parts into a
G-buffer (material, tone, z-layer) with per-pixel cel shading from the scene light → resolve: palette colours, 1-px
ink silhouette, selective inner lines (layer gap ≥ 2), screen-space rim light → cached canvas (LRU 48).
`HT.rig.draw(ctx, name, x, y, pose, heightPx, {face, light, rimDir, mode:'normal'|'flash'|'ink'|'tint', tint, sec,
costume, alpha, key})` (feet at x, y). `HT.rig.render(...)` → `{canvas, ox, oy, J, S, face}`. `HT.rig.fk(pose, prop)`.
`HT.rig.spring(posFn, t, f, zeta, win)` stateless damped spring (FIR over the anchor's motion history) → secondary
motion for hair and cloth. Characters: `gojo` (1.92 m; costumes fight | robe | uniform), `sukuna` (1.75 m; fight |
haori; pose flag `eyes2: 'open'`), `figure` (silhouette), `mahoraga`, `agito` (chars_shiki.js). Poses `HT.rig.POSES`
(60+), procedural `rig.walk(ph, o) run(ph) walkFront(ph, o)`, moves `HT.rig.MOVES` (frame data). Pose fields: see
rig.js header (degrees; `face` expression, `eyes`, `eyes2`, `bleed`, `hairLift`).

---------------------------------------------------------------------------------------------------
## 7. Choreography DSL (`src/fight.js`) — one DSL for every act and every agent

```js
HT.fightScene({
  id: 'a1_exchange', act: 'I', title: 'First Exchange', dur: 24, transitionIn: { type: 'cut' },
  set: 'city', setOpts: { ... }, env: { time: 'dawn', snow: 0.5, wind: 0.3 },
  cast: { gojo: { char: 'gojo', at: [x, y, z], face: 'east', pose: 'pockets', costume: 'fight' }, sukuna: {...} },
  script: [ ...events... ], cues: [...], ambience: [{ name: 'wind', vol: 0.5 }],
  hooks: { back(ctx, S), front(ctx, S), post(ctx, S) },   // optional custom drawing
});
```
Events (t = scene seconds): actions `{t, who, do, ...}` — `place` (at, face, pose), `pose` (pose, dur, ease, by),
`walk`/`run` (to | by, speed | dur, style 'normal'|'pockets'|'front'|'back'), `float`/`fly` (to, dur, pose),
`launch` (vel, g, dur, spin), `blink` (to), `face` (face | toward), `expr` (face, eyes, eyes2, bleed, hairLift),
`view`, `hide`/`show`, `trail` (dur, n, tint), `costume` (costume) — `expr` also carries shikigami draw options
(`wheelAngle wheelGlow wheel spark snake regrow tail sword swordGlow swordArm`) — or a move from `HT.rig.MOVES`
(`jab cross hook uppercut palm elbow kick round axe knee flyKick slash swipe flick blue red dash block …`) with
`target`, `hit: 'hit'|'block'|'infinity'|'miss'`, `hitstop` (frames), `knock` (× default), `strength` 1–3, `react`
(reaction move), `impact` (frames), `speed`. Attacks auto-space to land on the contact frame (lunging over longer
gaps) and spawn the target's reaction, the hit spark / Infinity ripple FX, the hit sound and the camera shake.
Camera `{t, shot, blend, ...}`, FX `{t, fx, at, ...}`, sound `{t, sfx, vol, pan, dur}` / `{t, amb, vol, fade}`, text
`{t, kana, x, y, size, dur}` / `{t, card, sub, dur}`, post `{t, post: 'impact'|'manga'|'flash'|'white'|'black'|
'split'|'speed'|'letterbox', dur, ...}`, persistent damage `{t, damage: {kind, ...}}`, lighting `{t, env: {...}}`,
extra shake `{t, shake: amp, decay}`. Refs: `'name'`, `'name.head|chest|hip|feet'`, `'name.hand'` / `'name.hand2'`
(the rig's near / far hand joint), `'mid'`. Close-up shots take `bust: {expr, eyes, eyes2, costume}`, `size`, `side`,
`bottom`, and `bg: 'set'|'haze'|'grad'` (`haze` washes the set toward `haze` colour, default dust; `grad` = abstract
gradient `cols`). Panels (`shot: 'panels'`) accept a per-panel `env` override (e.g. `{set: 'void'}` beside
`{set: 'shrine'}` on one diag page). Text overlays are drawn after all post effects; kana/cards default to their
natural length (`HT.kana.defaultDur`, `HT.cards.DUR`). FX default sounds come from `HT.fxCues(e)`; a default sound that
duplicates a hand-placed cue of the same name within 0.12 s is dropped. `twos: true` (or a rate) on any shot animates
the whole frame on 2s at 15 fps (camera moves on 2s; the finished frame is held and blitted on the repeat, and the city
view comes from the frame cache) — for wide moving shots; manga panel pages are on 2s by default (`ones: true` opts
out). Panel `env` overrides reach the set renderer and the lighting (S.env / S.light / S.rim per view). Fighters whose
box misses the view, or taller than 4 frames (in the lens), are not drawn.

Animation craft (research defaults, see PROGRESS.md §Research): drawings on 2s (12/s, key poses always on their exact
frame), anticipation and strike on 1s, recovery on 2s; hit-stop light/medium/heavy 4/5/6 frames @30 fps, specials
7–8, climax freezes up to 25; the contact drawing holds through the freeze; victim jitter ±2/3/4 px (sideways on the
ground, vertical in the air); impact frames none for light/medium, 1 for heavy, 2–4 for finishers; camera shake =
trauma² (hit adds 0.15 / 0.35 / 0.7–1.0, linear decay 1.2/s, 6–10 Hz noise, max ≈ 10 px); smears on the fastest
in-between of heavy swings, never on the contact drawing.

---------------------------------------------------------------------------------------------------
## 8. FX library (`src/fx.js`)

`HT.FX[name] = { dur, layer: 'ground'|'behind'|'front'|'sky' (or an array), sfx?, sfxAt?, cues(e)?, follow?,
draw(ctx, age, e, S) }` (`e.layer` overrides; `sky` = composited by the city renderer behind buildings with a depth test
at the effect's nearest key point — for distant effects such as the 200% Purple) — e = the
script event (params), S = scene state (`S.t, S.T, S.cam, S.project(x,y,z), S.pt(ref, t), S.at(name, t), S.env,
S.drawn[name]` = last rendered fighter `{r, x, y, px, face}`). `HT.fxDraw(ctx, S, list, layer)` draws the active
events of one layer. `e.at`: world `[x, y, z]` or a ref (`'gojo'`, `'gojo.head'`, `'gojo.chest'`, `'mid'`) resolved
by `S.pt(ref, t)`; screen-space FX use `e.x, e.y`. All FX are pure functions of `age` (seeded by `e.seed`).
**Occlusion in city views:** every `ground`-layer FX is a flat decal on the plane `e.groundZ` (default `e.at[2]` or 0)
and is erased where the city depth buffer has walls/roofs/props in front of that plane (`HT.cityOccluder`); an FX def
may give `gbox(e, S, age)` → its screen box so the mask covers only that region. World-scale FX give
`occ(e, S, age)` → `{d: forward depth, box}` and are erased inside the box where the city is nearer than `d`
(`HT.cityOccluderAt`); `parts: true` + `S.fxPart = 'tint' | 'body'` splits an unmasked screen-wide part (the Shrine's
red grade, its stray slashes) from the masked body. `e.occlude: false` opts an event out. `e.sets` limits an event to
views of those sets (e.g. `['city']`, `['void']`).
Names: techniques `infinityRipple infinityAura blueOrb redOrb redShot purple dismantle cleave worldCut blackFlash
hitSpark blockSpark` · domains `barrier barrierShatter voidBloom shrineBloom rctGlow wheel shadowPool infoStream
glyphRings` · physical `shockwave dust debris glass fire smoke crater` · graphic `speedLines` · story props
(props.js) `cloth can crow rabbitSwarm rabbitSwarmBack`. Full parameter docs: fx.js header. Post effects (full
frame) `HT.post.<name>(ctx, S, e, age, dur)`: `impact flash white black letterbox` (fight.js) + `speed split shatter
manga` (fx.js / manga.js). Weather: `HT.weather.snow(ctx, S, density)` (3 parallax depths).

---------------------------------------------------------------------------------------------------
## 9. Sets and the damage ledger (`src/city.js`, `src/sets.js`)

One Shinjuku world model (streets, blocks, buildings with procedural facades, signals, props) feeds every renderer:
`city` (3D street-level renderer: textured vertical walls column by column + roofs + mode-7 ground + far skyline
panorama; supports orbit, dolly zoom, down-the-street perspective), `voxel` (Voxel Space flyover/chase from the same
buildings), `overhead` (top-down map), plus bespoke sets (`void`, `shrine`, `sky`, `rooftop`, `command`, `airport`,
`black`, `white`, `plain`). Set interface: `HT.SETS[name] = { init(scene, opts) → res, draw(ctx, cam, S, 'back', res),
drawFront(ctx, cam, S, res), dispose(res) }`. **Damage ledger** `HT.ledger.add({scene, t, kind, ...})` (scene-relative,
resolved to film time after the timeline is built), `HT.ledger.state(T)` → entries with `T0 ≤ T` (+ age). Kinds:
`slice` (building cut along a plane, upper part slides), `hole`, `crater`, `flatten`, `collapse`, `canyon`
(the 200% Purple path), `erasure` (spherical Purple crater), `scorch`, `signal` (traffic-light states), `shred`
(the Shrine's range: buildings inside a radius growing over `dur` become stumps with 1–2 slid slabs; the cut tops are
rubble-strewn and their rims glint for 12 s after the range reaches the building — geometry fixed since M2, later acts
stage action on specific stumps), `deckHole` (a hole through the expressway deck). Every set draws the ledger state at `S.T`. Isolated act previews (`?acts=II`)
apply the entries of earlier acts as already happened. The city model includes the Metropolitan Expressway viaduct
over the EW avenue west of the junction (x −420…−62, y ±8.5, deck z 8.0–9.6, piers every 28 m). Renderer notes: a
per-column occlusion band skips walls hidden behind nearer ones; held views are cached (a view seen twice is kept;
manga panel views on 2s are kept at once); far walls (> 150 m) shade every other row; beyond the modelled district
the ground is a procedural roofscape and the Voxel renderer uses a baked far-city LUT; rubble is a baked Worley tile;
the `sky` FX layer is composited with a depth test (occluded only by geometry nearer than the effect). The depth
buffer holds forward depth for walls, roofs and props (ground and sky = far); the frame cache keeps each view's depth
(for the FX occlusion masks) and keys on the number of cuts still glinting. `HT.cityView()` returns the last view.

---------------------------------------------------------------------------------------------------
## 10. Close-ups, manga mode, text (`src/busts.js`, `src/manga.js`)

`HT.busts.draw(ctx, who, x, y, o)` → `{canvas, ox, oy, W, H, s, anchors}` hand-authored busts (`who`: gojo | sukuna |
geto | mahoraga; o: size, face, turn, expr (11), eyes, eyes2, open2, look, costume, bleed, sweat, hurt, rct, steam,
light, rim, rimDir, tint, t, wind, mono, idle, blink, breath, nod, roll, notch/wheel, glasses, alpha).
`HT.busts.render(who, o)` cached render (scene init warms it). `HT.busts.eyes(ctx, who, x, y, w, o)` extreme close-up
of the eyes (full resolution; `open2` opens Sukuna's lower eyes); `HT.busts.hands(ctx, who, sign, x, y, size, o)` hand
signs (`void shrine purple point two fist open`; `o.phase` for purple). Labs `?lab=busts|bustfx|bustperf`.
`HT.kana.draw/sfx` tiny pixel katakana (ドン ゴゴゴ ザシュ バキ キィン …), `HT.manga.tone(ctx, rect, o)` screentone
(B/W manga mode, ~5–10 % of runtime), `HT.manga.panels(ctx, S, shotEvent, renderFn)` split-screen panels,
`HT.post.manga`, `HT.cards.draw(ctx, e, age, S)` act/place/title cards, `HT.cards.creditsPage(ctx, t, o)` +
`creditsInit(o)` (the scrolling B/W manga credits page; text in `HT.cards.CREDIT_LINES`). Labs `?lab=kana|manga|cards|
panels`. Full parameter docs: manga.js header.

---------------------------------------------------------------------------------------------------
## 11. Sound (`src/audio/*.js`)

Architecture inherited from HELLO, TOMORROW: lookahead scheduler over a time-sorted event list (music notes + SFX
cues + ambience segments + bus automation) built from `HT.timeline`; the same list renders offline for export; buses
music (duck → gate → level) / SFX / ambience → master glue → limiter → soft clip (ceiling −1 dBFS). Files:
`engine.js` (core + public API `HT.audio.init play pause seek now renderOffline renderChunked playSfx`), `inst.js`
(instruments incl. Karplus-Strong koto/shamisen, shakuhachi, taiko, FM temple bell, glassy synth, detuned bass,
strings, soft FM keys), `sfx.js` (~80 SFX), `beds.js` (ambience beds), `score.js` (themes + music cues spanning
scenes). Themes: Gojo (bright, confident, Lydian; glassy synth + koto arps), Sukuna (low taiko, detuned bass, Phrygian,
dissonant strings), "The Strongest" (both in counterpoint), Mahoraga (mechanical ostinato on the wheel clunk), Elegy
(Gojo's theme slow, major, soft FM keys). Silence as a weapon before the Purple and before the Cut. Loudest at the
Purple, quietest at the airport; music ducks under big hits. Score cues: `HT.music.cue({id, from, to, level, fn(C)})`
(composer helpers `n ch mel pat arp kit level levelRamp fadeOut silence`, sync `sceneT cueT cueBeat cuesOf clash`;
cues whose scenes are absent are skipped), themes in `AU.V`, loudness plan `AU.LEVELS`. Offline renders (export) use a
deterministic JS master (sub-sonic HPF → glue compressor → true-peak look-ahead limiter at −1.5 dBTP) running
continuously across `renderChunked` chunks (per-seam pre-roll); live playback uses Web Audio nodes with the same
settings (close, not bit-identical). Cue conventions: `t` = sync point; SFX with pre-roll
(risers, charges) land their hit on `t`.

**SFX catalog (names used by scenes, fight.js and fx.js):** impacts `hitL hitM hitH hitHuge bodyFall block
infinityStop groundSlam wallCrash` · motion `whooshS whooshM whooshL whip dashAir blink flyBy` · slashes `shing
slashSplit cleave dismantle worldCut erode` (a cue's `dur` on `cleave` plays a cutting storm for that long; `erode` =
Simple Domain's ring being worn away, a crackle) · techniques `infinityHum blueCharge blueImplode redCharge redBlast purpleCharge
purpleErase blackFlash rctHeal sixEyes` · domains `handSign domainBloom voidOpen shrineRise barrierUp barrierCrack
barrierShatter domainCollapse tallyTick` · shikigami `wheelClunk wheelTurn mahoStep swordRing mahoSlash shadowRise
agitoSpark rabbitSwarm waterJet` · environment `windGust crosswalkChirp signalTick canRoll glassShatter glassTinkle
buildingSlide collapse rubble rumble quake fireCrackle carAlarm steelGroan sparkPop crowCaw footConcrete footSnow
clothSnap clothFlutter dropSoft poleClang poleRing metalWhoosh redWhistle concreteGrind skid extinguisherBurst chairScrape rip
staticCrackle waterSpray crtHum heelSkid` (`poleClang`: a single clang;
≤ 1 s `dur` = a gripped, damped clang; longer = a fall-and-clatter) · graphic/music `impactFrame panelSlam titleHit actCard riser downer revCym subDrop
boom heartbeat tinnitus` · coda `airportChime planeTakeoff`. Beds: `wind snow cityEmpty void shrine rubble fire command
sky airport interior`.

---------------------------------------------------------------------------------------------------
## 12. Labs and verification (tools)

Labs (`?lab=`): `rig` (all poses), `sizes`, `moves`, `one` (detail), `fx` (every effect over time), `sets`, `busts`,
`kana`, `manga`, `shiki`. Tools: `node tools/build.mjs` (single-file HTML + artifact), `node tools/review.mjs`
(contact sheets at 2×, transition sheets, cue validation incl. the flash cap, perf < 8 ms, offline audio levels),
`node tools/cdp.mjs` (headless Chrome driver), `node tools/export.mjs --strict [--from --to] [--scale 3|2]`
(frame-exact MP4, chunked audio), `node tools/playthrough.mjs` (real-time browser playback: frame gaps at lazy-init
boundaries, heap samples). Verification is reported honestly: what was checked and how, what nobody could check
(nobody listens to the audio before delivery), known issues.

---------------------------------------------------------------------------------------------------
## 3.1 Act I — The Strongest (0:00–3:30, 105 bars) · shot list

World staging: main junction at (0, 0) (EW avenue y = 0, 32 m wide; NS avenue x = 0, 28 m). Corner buildings:
NE `b277` = cutTower (74 m, glass), NW `b271` = punchBuilding (39 m), SW `b216` = holeBuilding (35 m), SE `b222`.
Sukuna's skyscraper = `city.role('sukunaTower')` (195 m) at x −351…−313, y 120…180. The 200% Purple (canon opener,
seen from afar) runs from the south edge (−250, −420) to the tower: ledger `canyon {x0:−250, y0:−420, x1:−330, y1:150,
w:40, depth:26}` + `collapse` of the tower. Time: 06:12 → 06:40, snow 0.35–0.5, blinking yellow signals (ledger
`signal` states only change in Act III). Colour: cold dawn blues, white snow, the pink horizon band, warm lit windows
rare; Gojo's blue eyes and the Purple's violet are the only saturated accents.

| # | id | bars | beats (Primal: silence first; hold the key shots) | sound / music |
|---|----|-----:|---------------------------------------------------|---------------|
| 1 | a1_snow | 6 | Black. One snowflake tumbles down through black (1 px → 3 px as it nears), a second, a third; the black thins to the navy of the dawn sky; the flakes fall past the tip of a far tower; fade up to the sky gradient. | wind hush; one koto harmonic at the first flake; silence otherwise |
| 2 | a1_tokyo | 8 | Voxel flyover of evacuated Tokyo at dawn toward Shinjuku (path keys over the district, descending); snow; empty avenues; the West Shinjuku towers ahead. Card `place`: "TOKYO · DECEMBER 24 · 06:12". | Gojo motif (glass + koto, sparse), low pedal |
| 3 | a1_empty | 7 | Street level: blinking yellow signals over the empty junction (held wide, 5 s); an abandoned car with snow on its roof; a crosswalk chirps for nobody; a crow on a lamp post turns its head — its eye glints (Mei Mei's crow: the watchers' feed). | crosswalkChirp ×2, crowCaw, cityEmpty bed, wind; music thins out |
| 4 | a1_title | 5 | Wide on the empty junction, snow; the title DOMAIN CLASH strikes in (card `title`), holds, dissolves. | titleHit, then 2 s of near-silence |
| 5 | a1_rooftop | 8 | Sukuna on the roof edge of his skyscraper (costume `haori`), back to camera, haori and hair in the wind, the city far below; slow push; he turns (front view): the relaxed cruel grin; ECU: the second pair of eyes opens (red). | Sukuna motif: taiko heartbeat, dbass, low dissonant strings |
| 6 | a1_opener | 8 | Far to the south a violet point swells on the horizon (Shibuya) — silence — a thin line of violet light crosses the whole skyline toward the tower (wide, side-on), the city along it simply ceases (canyon); the tower's lower floors vanish; it collapses into dust. Hold on the dust. From the dust: Sukuna drops to the street, unhurried, regrowing his arms (implied by a brief rctGlow; no wounds shown), grinning wider. | purpleCharge far → purpleErase (distant, muffled), rumble, collapse; music cuts to silence then a low drone |
| 7 | a1_gojo_walk | 9 | Gojo walks in down the snowy avenue from the south (costume `robe`, dark scarf, hands in pockets), footprints; stops at the edge of the junction; stretches (front view `stretchUp`), cracks his neck, loose; a slow push to the ECU of his eyes opening: the Six Eyes, luminous blue. | footSnow; Gojo motif, confident, Lydian (glass + koto arp) |
| 8 | a1_intercut | 8 | Intercut walks, accelerating: manga panels (split2 → split3, screentone accents) of Gojo walking / Sukuna walking; feet in snow; hands; eyes; each cut shorter; both reach the junction from opposite sides. | footSnow/footConcrete alternating, The Strongest counterpoint begins, taiko + koto |
| 9 | a1_standoff | 12 | The standoff: wide, both 14 m apart across the crosswalk. Gojo slips off the robe and lets it drop; Sukuna's haori slides from his shoulders and drifts away on the wind. Silence. The signal blinks. A can rolls across the asphalt between them (tink… tink…), stops. Dolly zoom on Gojo (the junction stretches behind him). Hold. | silence as a weapon: wind, canRoll, signalTick; one bonsho far away |
| 10 | a1_exchange1 | 13 | The first exchange (ch. 224): both vanish — impacts all over the junction in 3 beats; Sukuna's fists stop on Infinity (ripples, キィン); Gojo floats flat under an uppercut; Gojo's palm → Blue slams Sukuna through the SW building (ledger `hole` on b216), crash zoom, speed lines, dust. | driving Strongest theme, hits synced; infinityStop, hitH, blueImplode, wallCrash |
| 11 | a1_exchange2 | 12 | Sukuna walks out of the hole, points a finger-gun: Dismantle (hairline flash) — the NE tower behind Gojo; a beat later it slides apart along the cut (ledger `slice` on b277); Gojo grabs Sukuna's fist and flies them both up into the falling top half (orbit shot, glass, debris). | shing → slashSplit (delayed), buildingSlide, glassShatter; music drops to taiko only under the slide |
| 12 | a1_clash | 9 | Inside the falling half, a door between them; both punch at once — the building is flattened (ledger `flatten` on b271 / the fallen half), colossal clash shockwave (ドン), white. Dust settles over a new crater; two silhouettes walk out of the dust, unhurt. Breath. | boom, collapse, a 1 s white-out silence, then a sustained chord (end of act) |

---------------------------------------------------------------------------------------------------
## 3.2 Act II — Domain War (3:30–8:00, 135 bars) · shot list

Canon ch. 225–229 (research in PROGRESS.md §Research). Staging: the EW avenue east of the junction, in front of the
crater where the NE tower (b277) fell (they walked out of it at the end of Act I: Gojo (25.5, 10), Sukuna (34.5, 10)).
The barrierless Shrine rises behind Sukuna (east, ≈ (48, 10)); the Void's dome is centred between them. The Shrine's
range shreds the district around it: ledger `shred {x, y, r, dur}` (every building inside r is cut into slabs and
jagged stumps; r 70 m in clash 1, 130 m after "maximum range" in clash 2). The Metropolitan Expressway runs over the
EW avenue west of the junction (new city element `viaduct`: deck at z 8–9.5 m on pillars every 30 m) — Sukuna jumps
onto it at 3:00; Gojo punches up through it (ledger `hole` on the deck). Time: late morning, grey-blue; inside the
Void: space; under the Shrine: the city graded crimson (env `shrine`). Colour: navy/ink + prismatic (Void) against
crimson/maroon/bark + bone (Shrine), split compositions. A clash tally (post `tally`, 5 ticks, top-right corner, one
lit per clash) marks clashes 1–5.

| # | id | bars | beats | sound / music |
|---|----|-----:|-------|---------------|
| 1 | a2_signs | 8 | Act card "II · DOMAIN WAR". The two on the avenue, 9 m apart, breath steaming; silence; both raise their hands at the same instant: manga page (split2, read right→left): Sukuna's Enma palm seal (busts.hands `shrine`) · Gojo's one-hand seal (`void`); ECU strip of the eyes; the seals complete together. | silence; handSign ×2 together; one bell |
| 2 | a2_expand | 12 | Both expand at once (canon: simultaneous). Diag page with per-panel env: upper-left the Void interior (set `void`, voidBloom), lower-right the Shrine rising on its skull heap over the crimson city (shrineBloom) — the split line wavers (territory war), settles 50/50. Exterior wide: the black dome (barrier r 14) grows over the avenue while crimson spreads over the ground outside it; the shrine stands outside the dome behind Sukuna (barrierless); the sky tints crimson. Tally 1. | voidOpen + shrineRise + domainBloom; both themes at once, detuned |
| 3 | a2_shred | 13 | Outside: slashes rain on the dome's shell from outside (cleave/dismantle lines raking it, sparks, crack lines); the district around is shredded (ledger `shred` r 70: towers cut into slabs that slide and topple, glass). Inside (set `void`): both stand in the starfield — the sure-hits cancel; nothing happens; Sukuna smiles. Outside: the shell cracks all over and shatters (barrierShatter) — one hairline flash across Gojo's neck (a thin white line + impact frame; no blood), his eyes widen. Black 0.5 s. | cleave storm, barrierCrack → barrierShatter, then silence |
| 4 | a2_watchers | 7 | The monitoring room (set `command`): a pillar of monitors showing Mei Mei's crow feed (the shattered dome, Gojo's hand at his neck); the watchers as silhouettes lit by the screens; one small figure (Yuji) jumps up. | command bed, monitor hum, a chair scrape |
| 5 | a2_rct | 10 | Gojo heals the neck at once (rctGlow at the neck, steam), then is cut all over while healing at full output (dozens of hairline flashes on his body, steam; no wounds); he tries to run — Sukuna runs alongside: a parry, a caught kick, Sukuna rolls and wraps Gojo's legs with his own (low angle). | rctHeal, rapid cleave ticks, whooshes, body falls |
| 6 | a2_simple | 11 | Simple Domain #1: a pale ring opens on the ground around Gojo (thin light ring + runes); slashes break on its edge; Sukuna steps into it and it wears away where he stands (an eroding arc). Simple Domain #2 (no body healing: hair lifts, eyes strain) is chewed away faster. Monitor insert: a watcher leans forward. | ring hum (infinityHum pitched down), erosion crackle |
| 7 | a2_red | 10 | Gojo lunges at Blue speed and clamps on — arms round Sukuna, legs round his waist — leans back and fires Red point-blank into his face (redOrb; red 2-tone impact frame) → Sukuna blasted backwards into the shrine (smoke hides the face; the shrine's wall cracks). Monitor insert: Yuta stands. | dashAir, redCharge → redBlast, wall hit, silence |
| 8 | a2_clash2 | 14 | The Shrine widens to maximum range (crimson spreads across the district; `shred` grows to r 130); Gojo expands again — a heavier, darker dome (tough against the outside). Tally 2. Inside: Sukuna fights with Domain Amplification (dark aura on the fists): jabs to the chest, a chop snaps Gojo's head back; Gojo counterpunches the ribs; Sukuna spins behind him and grabs his leg (back to back; ECU on the hand at the ankle); Sukuna's eyes narrow — the binding vow (a deep bell + sub drop, the dome darkens); the barrier collapses. | amplification hum, hits, vow drone, barrierShatter |
| 9 | a2_blossom | 10 | Falling Blossom Emotion: a pale aura of petal-like flares around Gojo meets each slash — shallow sparks only (monitor insert: Kusakabe's peacoat silhouette leans in). Expansion #3 (tally 3): the dome grows huge (r 40), cracks, then shrinks to a ball (r 1.5 m) around the two fighters. | glass chimes, barrier strain, shrink sweep |
| 10 | a2_three | 14 | The ball holds; Sukuna narrows his range (slashes intensify outside the ball); the monitor stopwatch: 2:58 · 2:59 · 3:00 — the ball shatters and the Shrine collapses at the same moment (crimson dust falls, the sky un-tints). Sukuna leaps onto the elevated expressway; Gojo punches up through the deck from below (the deck bursts), comes up through the hole, dashes in on Blue and knocks him back along the deck. | clock ticks, double collapse boom, concrete burst, dash |
| 11 | a2_wheel | 6 | Darkness: a golden eight-handled wheel turns one notch (clunk) — cut — Gojo on the deck, a thin line of blood from his nose (1-px, stylised); he wipes it with his thumb and smiles. | wheelClunk in silence; one bar of the Mahoraga motif |
| 12 | a2_clash5 | 20 | Clash 4 (tally 4): both expand at once (split page, fast); inside: rapid punches, Blue slams Sukuna into the shrine and pulls him back; both domains break at the same instant. A left hook sends Sukuna into an expressway pillar. Clash 5 (tally 5): split-screen seals — Gojo's panel lights one frame earlier (< 0.01 s): the Void lands; Sukuna freezes (info streams into his eyes), one straight strike to the chest (impact frame, no gore); at 2:40 the Shrine peels away in crimson dust; Sukuna fully frozen in the glyph streams. Hold. | both expansions, blows, pillar crash, silence, one click, voidOpen, tinnitus |

## 3.3 Act III — Unlimited Void (8:00–11:00, 90 bars) · shot list

Canon ch. 229–232. Noon (env `noon`, dust haze), around the junction and along the expressway west of it; the aerial
chase over the voxel district. The wheel over Sukuna's head (FX `wheel` mode halo, `who: 'sukuna'`) counts
adaptations: 1 at the traffic light (a3_signal), 2 and 3 in the chase, 4 (complete) in a3_adapt.

| # | id | bars | beats | sound / music |
|---|----|-----:|-------|---------------|
| 1 | a3_frozen | 10 | Act card "III · UNLIMITED VOID". Inside the Void: Sukuna frozen; Gojo's barrage (afterimages, a dozen blows in three seconds, smears; the head snaps each way; no blood). A shadow widens at Sukuna's feet — Mahoraga emerges inside the domain, the wheel above its head; Gojo readies Red (two fingers) — Mahoraga drives its sword into the ground: the Void shatters from inside (starfield fragments peel away to the noon city). | the Strongest at full drive → Mahoraga ostinato → shatter |
| 2 | a3_sixth | 10 | Dust, noon. Sukuna comes round and heals his chest; Mahoraga sinks back into the shadow. Gojo's 6th expansion fails (the seal, a flicker of the Void, nothing; nosebleed; he drops to one knee). Sukuna sets the wheel above his own head and tries to expand: his Shrine crumbles as it forms; thin dark lines from his nose and eyes. Gojo laughs (bust `laugh`). | breath, wheel hum, the laugh as a koto flourish |
| 3 | a3_drag | 10 | A left-hand Blue pulls Sukuna in, a right hook; Gojo drags him by the collar along a building face (sparks, a groove in the facade — ledger `scorch` streak), throws him down and pulls debris onto him with Blue (a trap). | Blue pull, facade grind, debris rain |
| 4 | a3_decoys | 10 | Sukuna breaks out, ducks a flying kick; a Blue orb above pulls him into a stomp but he flips over it; a flip-kick with Amplification (the wheel darkens a tone); Gojo splits into four speed decoys; Sukuna catches the real punch and counters. | taiko, decoy shimmer, whooshes |
| 5 | a3_signal | 11 | Gojo gets his palm up in time, flies back, grabs a traffic light and perches on it; the wheel turns (1); the light turns green (ledger `signal` green); both launch; Blue yanks the signal into Sukuna's back; he catches it and throws it back; the Infinity stops it an inch from Gojo's face (キィン). | wheelClunk, signal chirp, metal whoosh, infinityStop |
| 6 | a3_chase | 11 | Aerial chase low over the rooftops (voxel set); wheel (2); Sukuna weaves between the expressway pillars; Gojo throws two Blues from his fists, then eight orbs surround Sukuna against a wall and close in; blows mid-air; an orb gouges his side (a dark impact + dust); wheel (3). | driving percussion, clunks, 8 staggered implosions |
| 7 | a3_red | 9 | Red fired through a pillar; Amplification blunts it; Sukuna brushes aside the thrown debris; the Red, still unexploded, curves round through the building and hits him in the back (redShot path). | redCharge, a curving whistle, redBlast |
| 8 | a3_blackflash | 10 | Black Flash to the sternum (the red/black 2-tone spark, a long freeze with an ink frame); Sukuna knocked out on his feet, eyes white. | the loudest hit so far, then a long silence |
| 9 | a3_adapt | 9 | The wheel falls and turns (4) — adaptation complete (the ostinato closes its circle); Sukuna regenerates and smiles; his shadow twitches. | wheelClunk, heartbeat, the ostinato resolves |

## 3.4 Act IV — Adaptation (11:00–15:00, 120 bars) · shot list

Canon ch. 232–235 (first half). Overcast wreckage (env `overcast`: charcoal/slate/rust); Mahoraga's white and gold are
the brightest thing on screen. The monitoring room (set `command`) returns twice. Indoors: an office corridor (set
`corridor`). No wound is shown: the shoulder cut, the arm lost to the water beam's cut and to the flying slash are
impact frames, cut-aways and framing only.

| # | id | bars | beats | sound / music |
|---|----|-----:|-------|---------------|
| 1 | a4_shadow | 11 | Act card "IV · ADAPTATION". Mahoraga's arms rise from Sukuna's shadow, pin Gojo's upper body and drag him down; a sword cut through the Infinity (impact frame, cut-away; dust and cloth). Monitor room: Yuji and Yuta cry out (silhouettes, no voices). | shadowRise, swordRing, silence |
| 2 | a4_smile | 7 | The watchers' dread; on the monitor Gojo smiles. | command bed, one koto note |
| 3 | a4_palms | 9 | Right, left, then a double-palm strike knocks Mahoraga back; Gojo chants Red (glyph rings). | hits, glyph hum |
| 4 | a4_rabbits | 10 | Hidden in Gojo's own shadow, Sukuna looses a swarm of rabbits (Rabbit Escape) to blind him; Red blasts the shadow; the rabbits scatter. | rabbitSwarm, redBlast |
| 5 | a4_corridor | 11 | Indoors, a corridor: a fire extinguisher Sukuna throws bursts against the Infinity (white smokescreen); Mahoraga drops through the ceiling; Sukuna takes the Piercing Blood stance and fires a water beam that cuts the arm Gojo blocks with (beam, impact frame, cut-away). | extinguisher burst, ceiling crash, waterJet |
| 6 | a4_agito | 10 | Agito summoned: the three-shot — Sukuna small between two giants ("the lost alien"); Gojo grins; a close-range Red to Mahoraga's head does little; Gojo looks up at the sky: Purple. | agitoSpark, low chord, muffled redBlast |
| 7 | a4_sit | 6 | Monitor room: Yuta rises; Kashimo, crackling, stops him with a hand on his shoulder; an argument in silhouettes. | sparkPop, room tone |
| 8 | a4_agito2 | 11 | Black Flash (#2) through Agito's middle; it regrows; Gojo tears the head off its serpent tail; it regrows too. | blackFlash, regrow shimmer |
| 9 | a4_arm | 9 | The wheel turns; a flying slash crosses the frame and gashes the building behind Gojo (impact frame, cut-away to the gash; the arm is never shown). | heavy dismantle, building groan |
| 10 | a4_climb | 12 | A three-way fight up the side of a building (camera looking up the facade; they run up the wall); Agito's electric punch stopped by the Infinity. | climbing thuds, agitoSpark, infinityStop |
| 11 | a4_crush | 12 | Gojo forms a Blue round his remaining fist and drives it into Agito's core: Agito implodes into a ball; the Blue rips on through the city (a trench across blocks); Mahoraga pulls Sukuna clear. The Blue stays hanging in the sky (it returns in Act V). | huge blueImplode, trench roar |
| 12 | a4_flash34 | 12 | Gojo's arm is back (rctGlow); Black Flash #3 knocks Mahoraga back; Gojo throws Sukuna into Mahoraga's arms and lands Black Flash #4 — Mahoraga blocks with the flat of its sword and crashes through a building (collapse). Gojo rises skyward. | blackFlash ×2, collapse, wind high above |

## 3.5 Act V — Hollow Purple (15:00–17:30, 75 bars) · shot list

Canon ch. 235. High above the city at sunset (env `sunset`, set `sky`/voxel from altitude). Silence before the
Purple; the Purple owns the palette; the loudest moment of the film. Damage: ledger `erasure` (a spherical crater,
r ≈ 250 m) centred over the district.

| # | id | bars | beats | sound / music |
|---|----|-----:|-------|---------------|
| 1 | a5_red | 10 | Act card "V · HOLLOW PURPLE". Sunset. Gojo, high above, chants Red (glyph rings) and fires it into the sky toward the Blue left from Agito's destruction, still hanging over the city (a small blue star). | glyph hum, far redBlast |
| 2 | a5_ride | 10 | Mahoraga leaps to destroy the Blue; Gojo rides its pull and uppercuts Mahoraga; Sukuna fires his water beam at the Red; Gojo chants Blue — it swells and swallows the beam. | leap, waterJet, blueCharge |
| 3 | a5_sky | 9 | All three in the air above the city — silence. Gojo's hand: index and little finger → a thumb-index pinch → fingers burst open (busts.hands `purple` phases); the incantation's glyph rings around him. | total silence (wind only), then a low purpleCharge |
| 4 | a5_purple | 12 | Red and Blue fuse at a distance: Hollow Purple dwarfs the towers and detonates in all directions (the palette turns violet); whiteout; the erasure spreads (ledger `erasure`). | purpleErase — the peak of the dynamic arc — then ringing |
| 5 | a5_ash | 10 | Ash and snow through violet light over the vast crater; Mahoraga and the wheel disintegrate; Sukuna, burned, bare-torsoed, barely standing, in silhouette (the missing hand hidden by framing and smoke). | ash wind, embers |
| 6 | a5_landing | 10 | Gojo lands on the crater rim, exhausted, smiling (manga close-up: toned bust `exhausted` → `smile`); he heals. | Gojo's theme, sparse, relieved |
| 7 | a5_command | 8 | Monitor room: silent celebration — Kusakabe raises an arm; the others jump up; Yuta bows his head. | room tone, one warm chord |
| 8 | a5_breath | 6 | The sun sets over the erased district; snow. | wind |

## 3.6 Act VI — The World-Cutting Slash (17:30–20:00, 75 bars) · shot list

Canon ch. 236. The Cut is never shown on a body: the whole frame splits along one diagonal (post `split` + worldCut)
and slides apart; white; the scarf from Act I falls into the snow. The airport is limbo ("Heading South"): soft warm
pastels (env `airport`), the only calm, sunny space; its plane is a judgment call (not canon).

| # | id | bars | beats | sound / music |
|---|----|-----:|-------|---------------|
| 1 | a6_notch | 6 | Act card "VI". Black: the golden wheel's last notch turns (the adaptation to Infinity, remembered). | one clunk in silence |
| 2 | a6_rise | 10 | Dusk, snow in the crater: Sukuna rises from the smoke, regenerating (rctGlow), bare-torsoed; far across the crater Gojo stands, back half-turned, catching his breath. Sukuna raises his right hand. | wind, one low Sukuna note |
| 3 | a6_cut | 8 | One calm swipe — silence — every layer of the frame splits along one perfect diagonal and slides apart; white. | worldCut (the mix goes silent for 3 s) |
| 4 | a6_white | 5 | White; the dark scarf drifts down and settles into the snow. | silence, one koto harmonic |
| 5 | a6_airport | 20 | The airport (set `airport`): warm light; teen Gojo in the black uniform with round sunglasses walks in; Geto on a bench waves; Nanami, Haibara, Yaga nearby; Toji, Riko and Kuroi in the background; seven lotuses in a planter; they laugh together (silently); a plane takes off beyond the window. | airport bed; Elegy (Gojo's theme, slow, major, FM keys) — the quietest music |
| 6 | a6_salute | 7 | Snow at dusk: from behind, Sukuna alone raises a hand in a salute toward where Gojo stood (off-frame); far away a crackle of lightning approaches (Kashimo). Black. | wind, a distant crackle |
| 7 | a6_credits | 19 | Credits: the scrolling B/W screentone manga page (HT.cards.creditsPage), ending on シーン. Jujutsu Kaisen © Gege Akutami / Shueisha. | Elegy continues, ends on the bell |
