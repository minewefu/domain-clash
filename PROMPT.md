# The prompt

DOMAIN CLASH was made in **one shot**: this single prompt, then one autonomous Claude Code run (Claude Opus 5 with
sub-agents, about 8½ hours) and no human feedback until the film was finished. The engine, all 60 scenes, the score,
the tools and the [production log](PROGRESS.md) all came out of that run.

<sub>The autonomy line in §0 was sent as a two-line follow-up four minutes after the brief, before any work was shown,
and is folded in here. One line of §11 that was cut off when the brief was pasted is restored.</sub>

```text
Make "DOMAIN CLASH" — a fully animated, full-colour, 16:9, 20-minute 2.5D pixel-art fan film of the Gojo vs Sukuna fight
(Jujutsu Kaisen, Shinjuku Showdown, ch. 221–236), with a fully synthesized score and sound design. Same style and pipeline as
my previous cartoon "Hello, Tomorrow" (D:\claude\random2\hello-tomorrow): same Resurrect 64 colour palette and dithering, same
synthesized music engine, but more detailed (640×360) and far more animated. No voiceover, no dialogue, no subtitles. Like
Genndy Tartakovsky's Primal, the story is told entirely through action, acting, music and sound. You can use subagents and
multi-agent workflows; keep each act's team under ~10 agents.

ENDING = canon      # canon | open   (see §6)

## 0. Production plan: milestones, run end to end
Build it in milestones. After each one, publish to the SAME Artifact URL (the film grows act by act), export that act's MP4
and report honestly, then keep going: you will run autonomously end to end (all milestones), without stopping for my
feedback. Do NOT worry about token budget (treat it as limitless).
- M0 Foundation (no story yet): 640×360 engine upgrade, fighter rig, choreography DSL, shot + FX libraries, Shinjuku set kit,
  audio extensions, and a 30-second "fight test" that proves all of it. Contact sheets of every pose and effect.
- M1 Act I · M2 Act II · M3 Act III · M4 Act IV · M5 Acts V–VI + credits.
- M6 Final pass: continuity, pacing, full-film QA, final single-file HTML and full MP4.

## 1. Reuse, don't restart
- Read hello-tomorrow's README.md and SPEC.md first. Copy its engine and tooling into a NEW folder D:\claude\random2\domain-clash
  (never modify hello-tomorrow):
  - src/core.js: palette + Yliluoma ordered-dither quantizer, aliased primitives, fonts, mode7 / iso / sprite-stack helpers.
  - src/main.js + src/ui.js: timeline, transitions, audio-clock sync, ?scene= / ?sheet= test modes.
  - The src/audio.js architecture: lookahead scheduler, offline render, buses, ducking, cue-anchored music.
  - tools/cdp.mjs, review.mjs, build.mjs, export.mjs.
- Same contract: every scene is a pure function draw(ctx, t). Deterministic, no Math.random at draw time, no image or audio
  files, no libraries.

## 2. Architecture for 20 minutes (so it doesn't become 20 minutes of bespoke code)
- Chapter streaming: plan for ~50–80 scenes. Init lazily: the next scene inits in idle time while the current one plays, and
  scenes far behind get disposed. Loading bar only at startup. Chapter menu of the six acts. Heap must stay flat over a full
  20-minute playthrough.
- Choreography DSL: fights are authored as data and executed by the rig. Per character: move, start time, duration, target,
  startup/active/recovery frames, contact frame, hit-stop, knockback. Plus camera shots, FX triggers and SFX cues. One DSL for
  every act and every agent.
- Shot library: wide, medium, over-the-shoulder, close-up bust, extreme close-up (eyes/hands), crash zoom, whip pan, dolly
  zoom, orbiting camera, overhead mode-7, voxel flyover, split-screen manga panels.
- FX library, shared and tested once:
  - Techniques: Infinity, Blue, Red, Hollow Purple, Dismantle/Cleave, World-Cutting Slash, Black Flash.
  - Domains: barriers and shatter, Unlimited Void, Malevolent Shrine, RCT glow, Mahoraga's wheel.
  - Physical: shockwaves, dust, debris (sprite-stacked 3D rubble), glass, fire, smoke, snow.
  - Graphic: speed lines, impact frames, screentone.
- Persistent destruction: a deterministic "damage ledger" keyed to film time. Shinjuku accumulates craters, sliced buildings
  and the Purple's canyon across acts, and every later shot shows the earlier damage.
- Audio at length: act-based score sections, chunked offline render per act for export (no clicks at chunk seams), and a SFX
  library of ~80 sounds.

## 3. Look and animation ("more detailed", still pixel art)
- 640×360 native (×3 = 1080p, ×2 = 720p), full colour, Resurrect 64. Black-and-white screentone "manga mode" is an accent,
  ~5–10% of runtime: hand-sign panels, reaction panels, key impacts.
- Fighter rig: a 2D skeletal rig with hair and cloth chains, rendered pixel-snapped with an outline pass.
  - Sizes: ~56 px wide shots, ~96 px medium, plus hand-authored close-up busts at 160–220 px.
  - A pose library of 60+ keys.
- Animation craft:
  - Motion: keys on 2s (12 fps), smears and multiples, anticipation → strike → follow-through.
  - Impact: hit-stop 3–8 frames, impact frames (1–2 inverted or 2-tone frames).
  - Camera: shake, whip pans, crash zooms, a dolly zoom, an orbiting camera around the fighters.
  - Secondary motion: Gojo's hair, Sukuna's haori, snow, dust, glass.
- Text: katakana onomatopoeia in a tiny pixel katakana font you add (ドン ゴゴゴ ザシュ バキ キィン), plus English act and
  place cards. No spoken lines anywhere.
- Colour script, by act:
  - I: cold dawn blues, white snow, blinking traffic lights.
  - II: Void (navy/ink + prismatic light) vs Shrine (crimson/maroon/bark + bone white), split compositions.
  - III: harsh noon, dust and smoke.
  - IV: overcast wreckage (charcoal/slate/rust), with Mahoraga's white and gold as the brightest thing on screen.
  - V: sunset gold → violet, and the Purple owns the palette.
  - VI: stark white, then the airport in soft warm pastels — the only calm, sunny space in the film.

## 4. Characters (original pixel interpretations — verify designs in research)
- Gojo Satoru:
  - Look: very tall and lanky; spiky white hair; bright blue Six Eyes (uncovered for this fight — verify); black
    high-collared uniform.
  - Acting: loose, playful, confident, hands in pockets until it matters.
- Sukuna in Megumi Fushiguro's body:
  - Look: spiky black hair; black markings on forehead, cheeks, chin and nose bridge; a second pair of eyes below the first;
    black haori over a white kimono, black belt, white pants, black sandals.
  - Acting: a cruel, relaxed grin.
- Mahoraga (huge white shikigami, the eight-handled wheel above its head, a sword arm) and Agito (a chimera shikigami that
  heals for Sukuna's side — verify who it heals).
- Optional silent cutaways of allies watching from a distant command post: small, sparing reaction beats for pacing
  (silhouettes are fine). Geto and old friends appear only in the coda.

## 5. Story in six acts (~20:00; 120 BPM grid; scenes start on bar lines)
Verify the beat order against canon chapter summaries during research. Keep this phase order: exchange → domain war →
Unlimited Void lands → Mahoraga/Agito 3-on-1 → 200% Hollow Purple and apparent victory → World-Cutting Slash → airport.
Adjust wrong details and note what you changed. Every act needs its own shape: build, climax, breath.
- **Act I — The Strongest (0:00–3:30)**
  - A snowflake falls through black; dawn over an evacuated Tokyo, December 24; empty Shinjuku, traffic lights blinking for
    nobody. Title card DOMAIN CLASH.
  - Gojo stretches and walks in, playful. Sukuna waits on a rooftop, grinning, second eyes opening.
  - Intercut walks; the standoff at the intersection (a can rolls, dolly zoom).
  - The first exchange: probing strikes at blinding speed; Infinity stopping fists; invisible slashes; buildings sliding apart
    a beat later. The act ends on the first colossal clash shockwave.
- **Act II — Domain War (3:30–8:00)**
  - Hand-sign panels; Unlimited Void vs the barrierless Malevolent Shrine spilling into the real city; the screen splits
    diagonally into two worlds fighting for territory.
  - Gojo's barrier shatters and he re-expands again and again (tally 1…5): nosebleed, steam, RCT healing his burnt-out brain.
  - Sukuna's counter-measures (verify which).
  - The grind, then the final push: Unlimited Void wins.
- **Act III — Unlimited Void (8:00–11:00)**
  - Sukuna paralysed, flooded with streams of "infinite information" glyphs.
  - Gojo's barrage: smears, afterimages, Black Flashes. Sukuna is launched across Shinjuku in a high-speed voxel-city chase.
  - Sukuna regenerates and smiles; his shadow twitches (Mahoraga foreshadow).
- **Act IV — Adaptation (11:00–15:00)**
  - The shadow spreads, the wheel appears, Mahoraga rises; Agito joins. 3-on-1 choreography that keeps escalating.
  - The wheel turns one notch per adaptation. Gojo improvises with Blue/Red combos and Infinity tricks (verify canon
    specifics); a slash finally nicks him (artistic).
  - The city collapses around them. Gojo withdraws skyward.
- **Act V — Hollow Purple (15:00–17:30)**
  - Gojo high above the city at sunset. Silence. The incantation visualized as glyph rings and hand gestures, no words.
  - Blue and Red fuse into a 200% Hollow Purple dwarfing the towers; the erasure canyon; Mahoraga disintegrates; Sukuna engulfed.
  - Ash and snow. Gojo lands, exhausted, smiling (manga-mode close-up); silent celebration in the command post.
- **Act VI — The World-Cutting Slash (17:30–20:00)**
  - The wheel's last notch. Sukuna rises from the smoke, regenerating; one calm swipe; the entire frame (every layer, sky
    included) splits along a diagonal and slides apart; white.
  - Airport coda: a quiet sunlit lounge, Geto waving from a bench, a plane taking off beyond the glass.
  - Credits as a B/W screentone manga page.

## 6. Ending
- canon (default): as written. Violence stays stylised: no gore, no depicted wound. The split frame and the whiteout carry the
  moment, with an optional symbolic beat (something small falling into the snow) before the airport.
- open: replace Act VI's cut and airport with both unleashing their final techniques, a collision whiteout, then the empty
  snowy intersection with two sets of footprints, then credits.

## 7. Score and sound (synthesized; same engine, bigger score)
- Themes developed across 20 minutes, with variations every section and no audible loops:
  - Gojo: bright, confident, Lydian; glassy synth + koto arps.
  - Sukuna: low taiko, detuned bass, Phrygian, dissonant strings.
  - "The Strongest": both themes in counterpoint (the domain war).
  - Mahoraga: a mechanical ostinato built on the wheel's clunk.
  - Elegy for the airport: Gojo's theme, slow, major, soft FM keys.
- Synthesized Japanese colours: Karplus-Strong shamisen/koto, breathy shakuhachi, taiko, FM temple bell. Use silence as a
  weapon: before the Purple fires and right before the Cut.
- SFX: layered impacts, whooshes, slash "shing" with a delayed split, Infinity hum, Blue implosion, Red blast, Purple charge
  → erasure, domain bloom, barrier shatter, wheel clunk, collapse, wind, snow, airport chime. No voices, shouts or speech of
  any kind.
- Mix: peaks ≤ −1 dBFS; a real dynamic arc across the whole film (loudest at the Purple, quietest at the airport); music
  ducks under the big hits.

## 8. Research first (cite sources in your reports)
- Canon: chapter/volume summaries for ch. 221–236 and character designs at Shinjuku (Wikipedia chapter list, JJK wiki).
- Long-form, dialogue-free action storytelling: Primal (Tartakovsky).
- Fight animation: pixel fighting-game sprite work and frame data (Street Fighter III: 3rd Strike, Garou: Mark of the Wolves);
  sakuga technique (smears, impact frames, hit-stop, animating on 2s).
- Manga visual language: screentone, speed lines, panel flow.

## 9. Verification ("production grade" = verified)
- Every milestone: contact sheets at 2× per scene, transition sheets, cue validation, perf (< 8 ms average per frame),
  offline audio levels, and a real-browser playback check of that act.
- M6 adds:
  - A full 20-minute real-browser playthrough: no dropped-frame spikes at lazy-init boundaries, flat heap.
  - Audio: clean seams between act chunks.
  - Continuity: damage-ledger consistency across acts.
- Be honest: what was verified and how, what nobody could check (nobody can listen to the audio), known issues.

## 10. Deliverables and budgets
- Single-file HTML ≤ 16 MB with an act menu, published to the same Artifact URL at every milestone.
- MP4s via tools/export.mjs --strict:
  - One per act, plus the full film at 1080p30 — expect roughly 1.5 GB, since dithered pixel art compresses poorly.
  - A 720p share copy (an exact ×2 upscale).
- Send me the links and files at each milestone.

## 11. Constraints
- Fan tribute for personal, non-commercial use: original pixel interpretations only — no traced manga panels, no copied
  dialogue. Credit Jujutsu Kaisen © Gege Akutami / Shueisha in the credits and on the page.
```
