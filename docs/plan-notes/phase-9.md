# Phase 9 — Home page redesign & Ziggy as a speaking companion

Full detail behind the one-line summary in PLAN.md. Two sessions: the asset pipeline (2026-08-07) is written up first, the UI work that consumed those assets (2026-08-07, same day) is at the bottom under "The UI work".

## Why raster, and where the reference came from

A character sheet for Ziggy was commissioned from a different AI agent (ChatGPT/GPT-image) and landed in `~/Downloads` — turnaround, expressions, color palette, in-game action poses. Multiple attempts (across different agents) to recreate it as clean vector art came out disappointing, so the decision was to lean into raster for real in-game assets instead. The character sheet itself is checked in at `reference/ziggy-character-sheet.png` as the generation reference image.

## Tool choice: Gemini 3.1 Flash Lite Image

Compared against staying on ChatGPT (already proven, but manual/no scripting) and Midjourney (best polish, but subscription + no API scripting). Landed on `gemini-3.1-flash-lite-image` via Google AI Studio: pay-as-you-go (~$0.03/image, no subscription), strong character consistency from a reference image ("Nano Banana" lineage), and API-accessible so the whole batch could be scripted (`scripts/generate-ziggy-assets.mjs`) rather than copy-pasted through a chat UI one at a time.

Six assets, one prompt each, all referencing the character sheet: `brand-mark` (small icon-style headshot — header logo + favicon source), `speaks-neutral` / `speaks-wink` / `speaks-gleeful` (bust portraits for the not-yet-built `ZiggySpeaks` component), `hello-fullbody` (full-body wave pose, held in reserve), and `icon-maskable` (opaque teal-background variant, safe-zone framing, for Android adaptive icons + `apple-touch-icon`).

## The transparency bugs (two of them, both self-inflicted in post-processing)

The model's image response format is JPEG-only — no real alpha channel — and asking it in the prompt for a "transparent background" just made it **draw a checkerboard pattern as pixel content** rather than produce actual transparency. Worked around by asking for a flat, solid magenta (`#FF00FF`) background instead and chroma-keying it out programmatically afterward.

`sharp` was the obvious tool for that, but `pnpm-workspace.yaml` set `allowBuilds.sharp: false` (a Phase 5/6 decision to avoid native image-processing builds — at the time, sharp had no use case in this repo beyond an optional wrangler feature this app doesn't touch). Used `pngjs` + `jpeg-js` instead — both pure JS, no native compilation — decode → chroma-key → re-encode as PNG with a real alpha channel.

**Update (2026-08-07, later dependency-cleanup pass):** re-examined during a broader dependency audit — the "avoid sharp" call had no reason beyond "not needed yet," and this script is exactly a case where it _is_ needed. `allowBuilds.sharp` flipped to `true`; `generate-ziggy-assets.mjs` now decodes/encodes via `sharp` directly (still hand-rolls the actual chroma-key/un-premultiply math below, since that part is bespoke) and the `pngjs`/`jpeg-js` dependencies were dropped. `fix-ziggy-alpha-fringe.mjs` (the one-off repair described below) was deleted — it had already been run against the affected assets and the generator itself no longer regresses, so there was nothing left for it to do.

Two bugs surfaced across the actual generation runs, both in the color-recovery math rather than the alpha computation itself:

1. **First pass**: a naive "subtract some magenta" heuristic on partial-alpha edge pixels left a visible magenta-tinted halo around every cutout. Fixed by switching to proper un-premultiply math — since an edge pixel is `fg·alpha + key·(1-alpha)`, you can solve for `fg` directly instead of guessing at a correction.
2. **Second pass**: that division is numerically unstable as `alpha → 0` — residual JPEG compression noise gets divided by a near-zero number and amplified into wildly-out-of-range colors. Invisible in the deep background (alpha genuinely is 0 there, so the garbage color never renders), but very visible as a false-color fringe in the thin band of pixels with small-but-nonzero alpha, whose color _does_ contribute to compositing. Symptom looked like a green cast in this specific case (magenta's green channel is 0, so any leftover green-channel noise gets maximally amplified). Fixed two ways: (a) the generator script now skips the unstable division below `alpha ≈ 0.15` and just keeps the raw decoded color there instead (harmless since it's barely opaque anyway), and (b) rather than re-spend API budget re-generating the 5 images already affected, wrote a local repair pass (`scripts/fix-ziggy-alpha-fringe.mjs`) that recolors only the partial-alpha pixels in the already-saved PNGs from their nearest fully-opaque neighbor. Both verified against synthetic JPEG-compressed test images (not just eyeballing output) before trusting them.

**Gotcha for next time verifying transparent PNGs by eye**: the inline image-preview tool used mid-session to sanity-check generated PNGs does **not** respect the alpha channel — it renders raw RGB regardless of alpha, which is exactly why the "still green!" symptom persisted even after the alpha channel itself was already correct (confirmed independently via `sips -g hasAlpha` and raw pixel sampling). The reliable way to visually verify a transparent PNG in this environment is to composite it over a solid color yourself (a few lines of `pngjs`) and view _that_ — don't trust the raw file preview for alpha correctness.

A third, minor flakiness: the generation API occasionally threw `BadRequestError: 400 ... prohibited content guidelines` on a prompt+ reference-image combination that had succeeded moments earlier on a near-identical prompt — looks like classifier noise on this preview model, not a real content issue. The script now retries once automatically and continues past a persistent per-asset failure instead of aborting the whole batch, printing a ready-to-paste re-run command for whatever's still missing.

## Icons

`public/`'s PWA/favicon PNGs were regenerated from `brand-mark.png` (transparent — favicons + "any purpose" 192/512 icons) and `icon-maskable.png` (opaque teal `#65c3c8` background matching the old icon's brand color, Ziggy kept in the safe zone — maskable icon + `apple-touch-icon`, since iOS handles transparency poorly) via macOS's built-in `sips -Z <size>`, the same zero-dependency approach established in Phase 6. The old placeholder source SVGs (`src/assets/icons/icon.svg`, `icon-maskable.svg` — a generic rounded-square "×" card, unrelated to Ziggy) were deleted; source is raster now, documented in README.

## Sound refresh

Separately, `src/sounds.ts` already had 5 mp3 sound effects (`cheat`/`correct`/`level_end`/`level_start`/`wrong`) from early phases — these were regenerated with Ziggy-appropriate character via ElevenLabs. Initially considered whether this reversed Phase 7's decision to synthesize sounds via Web Audio API instead of adding mp3 assets, but on inspection Phase 7 only chose synthesis for _its own new_ chimes (`streak_milestone`/`mastery_up`/`badge`) — it never touched the original 5. Given that, and since a working SFX pipeline now existed anyway, the 3 Phase-7 chimes were _also_ converted to mp3 and folded into the same Howler-based `playSound()` — `CHIMES`, `playTones`, `getAudioContext`, and `playChime` are gone entirely from `src/sounds.ts`; all 8 sounds now go through one code path. `PlayPage.vue`'s 3 `playChime()` call sites became `playSound()`.

Considered Google's Lyria for the SFX instead (already had Gemini API access) — ruled out, it only generates 30s–2min music clips, no short-SFX mode, wrong tool for a UI chime. ElevenLabs' free web-tier (10k credits/mo) was used manually rather than its paid API tier (free API access is capped at 10 credits/mo, unusably low) — a $5/mo subscription wasn't worth it for a one-time batch of 8 short sounds. Not yet resolved: the free tier's license is non-commercial-only, and whether that matters for a public but non-monetized personal site is a judgment call still open.

## Incidental bug fix

While confirming `pnpm build` still passed after the `sounds.ts` refactor, found it was already broken on a clean checkout before any Phase 9 changes — `PlayPage.vue`'s `enterIntro()` assigned the whole `FactFamily` object from `curriculum.tryAutoUnlock()` into `highlightedKey` (typed `string | null`) instead of `.key`. `vp check`'s type-aware lint didn't catch it; `vue-tsc` (only run in `pnpm build`) did. One-line fix — see "Known pre-existing issues" in PLAN.md.

## Verification (asset pipeline)

`pnpm check`, `pnpm test` (128 tests), and `pnpm build` all pass. Generated images spot-checked by compositing over white (see gotcha above); app icons spot-checked the same way plus direct view for the opaque maskable variant. Not yet checked: real-device "Add to Home Screen" with the new icons (carries forward the same open item from Phase 6).

---

# The UI work

## Web-sized derivatives, because the source PNGs are unshippable

The generator's output is 1024x1024 PNG at ~800KB each. Importing four of those into the bundle would have roughly doubled the PWA precache (it was ~1050KB for the entire app, sound effects and fonts included) for art that renders at 112px at its very largest. `scripts/optimize-ziggy-assets.mjs` (`pnpm optimize:ziggy`) resizes to ~2x the largest on-screen size and re-encodes as WebP-with-alpha into `src/assets/ziggy/web/`: 4.1KB for the brand mark, 13–15KB for each bust portrait, 46KB for the lot. Components import only the `web/` derivatives; the 1024px originals stay checked in as the source of truth and, since nothing imports them, cost nothing at build time.

`workbox.globPatterns` in `vite.config.ts` needed `webp` added — it's an explicit extension allowlist, so the new assets would have silently not been precached and Ziggy would have gone missing offline.

## `ZiggySpeaks`: typewriter without incremental text

The reveal is opacity-only. Every character is in the DOM from the first frame, wrapped in its own `<span>` with a staggered `animation-delay`; the keyframes only animate opacity. Consequences that made this the right shape:

- The full sentence is available to assistive tech and to tests immediately — no fake timers, no waiting, no half-written sentence if the animation is interrupted or the tab is backgrounded.
- The base (un-animated) state is **visible**, and the keyframes fill `backwards`. Anything that suppresses the animation — `prefers-reduced-motion` (handled explicitly), jsdom, a browser that skips it — degrades to plain text rather than to invisible text. Getting this backwards (base state hidden, animation reveals) would fail closed.
- Per-character `<span>`s are plain `inline`, deliberately not `inline-block`: an inline element boundary isn't a line-break opportunity, so words never break mid-word, and screen readers don't treat each character as its own word the way they can with inline-blocks.

Per-character delay is 26ms, but the total is capped at 1800ms and the step shrinks to fit — a kid staring at a slow crawl before they can press Play is worse than a slightly hurried reveal. Delays accumulate _across_ paragraphs so a multi-line speech reads as one continuous crawl instead of every paragraph starting at once.

One layout fix: daisyUI's `chat-image` bottom-aligns the avatar against the bubble, which leaves Ziggy dangling off the bottom corner of a four-line speech. `self-start` pins him to the top of whatever he's saying.

## One art style, one Ziggy per moment

`FoxMascot.vue` (Phase 7's hand-coded flat SVG) is **deleted**. Running two art styles for the same character on the same screen was the single biggest visual inconsistency left, and the painted assets exist precisely to replace it. Every placement now goes through `ZiggyImage.vue` (pose → `web/` asset, `mark` being the tight headshot that survives small sizes) or `ZiggySpeaks.vue`.

Placements, one job each:

| Where                  | Who     | Job                                                                                 |
| ---------------------- | ------- | ----------------------------------------------------------------------------------- |
| Header logo            | `mark`  | brand                                                                               |
| Home hero              | speaks  | greet + react to overall progress                                                   |
| Help modal             | speaks  | explain his own racket, first person                                                |
| Session intro          | speaks  | say what's on the table; the _only_ thing that explains the highlighted "New!" card |
| Session outro          | speaks  | react to the score                                                                  |
| Hint-token row         | `mark`  | mark the tokens as his                                                              |
| Streak-milestone toast | gleeful | react to being outfoxed                                                             |

The outro previously flanked its title with two copies of the mascot; those are gone, and `SessionSummary.message` — which was already being rendered right there — became what Ziggy says instead. That meant rewriting the eight score-band messages in `utils.ts` into first person and dropping their leading emoji; the art carries the tone the emoji used to.

`denFlavor()`/`denPose()` are replaced by `homeGreeting()` in `dashboard.ts`. Same mood thresholds, but one first-person voice on the page instead of a third-person aside repeated per panel ("Ziggy's starting to sweat", once for each group). There's a test asserting the greeting never says "Ziggy's" — regressing to third person is exactly the drift worth catching.

## The home page

`MasteryGrid.vue` is deleted along with its tests. It rendered all 64 fact-family combinations per group, so a fresh save opened on 128 grey cells — a wall of debt, when the curriculum has deliberately introduced 4 of them. Panels now show `FactFamilyShape` tiles for the active families only (the same triangles the session intro/outro already use, so the shapes mean one consistent thing app-wide), the `X / Y facts mastered` line, and a `Play` CTA per group.

The best-cheat-free-streak line kept its own element rather than folding into Ziggy's speech — it's an achievement readout, and burying a number in a sentence that retypes itself on every visit reads worse than a badge. Its 🦊 became a Feather `award` icon; the in-session current-streak 🦊 became `trending-up`; the help modal's ❤️ became Feather `heart` (left outline, matching every other icon in the app rather than being the one filled glyph).

## Verification (UI)

`pnpm check`, `pnpm test` (141 tests), and `pnpm build` all pass. Real-browser pass with Playwright against `pnpm preview` at 900px and 390px wide: home (fresh + post-session), session intro, active question, a played-to-completion outro, and the help modal — no console errors, and the speech bubbles were screenshotted after the reveal to confirm the animation actually lands on fully-opaque text. Precache after the change: 35 entries, 1193KB.
