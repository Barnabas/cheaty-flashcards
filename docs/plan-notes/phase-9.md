# Phase 9 prep — Ziggy asset pipeline — done (2026-08-07)

Full detail behind the one-line summary in PLAN.md. Covers asset generation
only — the actual Phase 9 UI checklist (home page redesign, `ZiggySpeaks`,
visual consistency pass) hadn't started as of this session.

## Why raster, and where the reference came from

A character sheet for Ziggy was commissioned from a different AI agent
(ChatGPT/GPT-image) and landed in `~/Downloads` — turnaround, expressions,
color palette, in-game action poses. Multiple attempts (across different
agents) to recreate it as clean vector art came out disappointing, so the
decision was to lean into raster for real in-game assets instead. The
character sheet itself is checked in at
`reference/ziggy-character-sheet.png` as the generation reference image.

## Tool choice: Gemini 3.1 Flash Lite Image

Compared against staying on ChatGPT (already proven, but manual/no
scripting) and Midjourney (best polish, but subscription + no API
scripting). Landed on `gemini-3.1-flash-lite-image` via Google AI Studio:
pay-as-you-go (~$0.03/image, no subscription), strong character consistency
from a reference image ("Nano Banana" lineage), and API-accessible so the
whole batch could be scripted (`scripts/generate-ziggy-assets.mjs`) rather
than copy-pasted through a chat UI one at a time.

Six assets, one prompt each, all referencing the character sheet: `brand-mark`
(small icon-style headshot — header logo + favicon source), `speaks-neutral`
/ `speaks-wink` / `speaks-gleeful` (bust portraits for the not-yet-built
`ZiggySpeaks` component), `hello-fullbody` (full-body wave pose, held in
reserve), and `icon-maskable` (opaque teal-background variant, safe-zone
framing, for Android adaptive icons + `apple-touch-icon`).

## The transparency bugs (two of them, both self-inflicted in post-processing)

The model's image response format is JPEG-only — no real alpha channel —
and asking it in the prompt for a "transparent background" just made it
**draw a checkerboard pattern as pixel content** rather than produce actual
transparency. Worked around by asking for a flat, solid magenta (`#FF00FF`)
background instead and chroma-keying it out programmatically afterward.

`sharp` was the obvious tool for that, but `pnpm-workspace.yaml` set
`allowBuilds.sharp: false` (a Phase 5/6 decision to avoid native
image-processing builds — at the time, sharp had no use case in this repo
beyond an optional wrangler feature this app doesn't touch). Used `pngjs` +
`jpeg-js` instead — both pure JS, no native compilation — decode →
chroma-key → re-encode as PNG with a real alpha channel.

**Update (2026-08-07, later dependency-cleanup pass):** re-examined during a
broader dependency audit — the "avoid sharp" call had no reason beyond "not
needed yet," and this script is exactly a case where it _is_ needed.
`allowBuilds.sharp` flipped to `true`; `generate-ziggy-assets.mjs` now
decodes/encodes via `sharp` directly (still hand-rolls the actual
chroma-key/un-premultiply math below, since that part is bespoke) and the
`pngjs`/`jpeg-js` dependencies were dropped. `fix-ziggy-alpha-fringe.mjs`
(the one-off repair described below) was deleted — it had already been run
against the affected assets and the generator itself no longer regresses,
so there was nothing left for it to do.

Two bugs surfaced across the actual generation runs, both in the
color-recovery math rather than the alpha computation itself:

1. **First pass**: a naive "subtract some magenta" heuristic on
   partial-alpha edge pixels left a visible magenta-tinted halo around every
   cutout. Fixed by switching to proper un-premultiply math — since an edge
   pixel is `fg·alpha + key·(1-alpha)`, you can solve for `fg` directly
   instead of guessing at a correction.
2. **Second pass**: that division is numerically unstable as `alpha → 0` —
   residual JPEG compression noise gets divided by a near-zero number and
   amplified into wildly-out-of-range colors. Invisible in the deep
   background (alpha genuinely is 0 there, so the garbage color never
   renders), but very visible as a false-color fringe in the thin band of
   pixels with small-but-nonzero alpha, whose color _does_ contribute to
   compositing. Symptom looked like a green cast in this specific case
   (magenta's green channel is 0, so any leftover green-channel noise gets
   maximally amplified). Fixed two ways: (a) the generator script now skips
   the unstable division below `alpha ≈ 0.15` and just keeps the raw decoded
   color there instead (harmless since it's barely opaque anyway), and (b)
   rather than re-spend API budget re-generating the 5 images already
   affected, wrote a local repair pass
   (`scripts/fix-ziggy-alpha-fringe.mjs`) that recolors only the
   partial-alpha pixels in the already-saved PNGs from their nearest
   fully-opaque neighbor. Both verified against synthetic JPEG-compressed
   test images (not just eyeballing output) before trusting them.

**Gotcha for next time verifying transparent PNGs by eye**: the inline
image-preview tool used mid-session to sanity-check generated PNGs does
**not** respect the alpha channel — it renders raw RGB regardless of alpha,
which is exactly why the "still green!" symptom persisted even after the
alpha channel itself was already correct (confirmed independently via
`sips -g hasAlpha` and raw pixel sampling). The reliable way to visually
verify a transparent PNG in this environment is to composite it over a
solid color yourself (a few lines of `pngjs`) and view _that_ — don't trust
the raw file preview for alpha correctness.

A third, minor flakiness: the generation API occasionally threw
`BadRequestError: 400 ... prohibited content guidelines` on a prompt+
reference-image combination that had succeeded moments earlier on a
near-identical prompt — looks like classifier noise on this preview model,
not a real content issue. The script now retries once automatically and
continues past a persistent per-asset failure instead of aborting the whole
batch, printing a ready-to-paste re-run command for whatever's still
missing.

## Icons

`public/`'s PWA/favicon PNGs were regenerated from `brand-mark.png`
(transparent — favicons + "any purpose" 192/512 icons) and
`icon-maskable.png` (opaque teal `#65c3c8` background matching the old
icon's brand color, Ziggy kept in the safe zone — maskable icon +
`apple-touch-icon`, since iOS handles transparency poorly) via macOS's
built-in `sips -Z <size>`, the same zero-dependency approach established in
Phase 6. The old placeholder source SVGs (`src/assets/icons/icon.svg`,
`icon-maskable.svg` — a generic rounded-square "×" card, unrelated to Ziggy)
were deleted; source is raster now, documented in README.

## Sound refresh

Separately, `src/sounds.ts` already had 5 mp3 sound effects
(`cheat`/`correct`/`level_end`/`level_start`/`wrong`) from early phases —
these were regenerated with Ziggy-appropriate character via ElevenLabs.
Initially considered whether this reversed Phase 7's decision to synthesize
sounds via Web Audio API instead of adding mp3 assets, but on inspection
Phase 7 only chose synthesis for _its own new_ chimes
(`streak_milestone`/`mastery_up`/`badge`) — it never touched the original 5.
Given that, and since a working SFX pipeline now existed anyway, the 3
Phase-7 chimes were _also_ converted to mp3 and folded into the same
Howler-based `playSound()` — `CHIMES`, `playTones`, `getAudioContext`, and
`playChime` are gone entirely from `src/sounds.ts`; all 8 sounds now go
through one code path. `PlayPage.vue`'s 3 `playChime()` call sites became
`playSound()`.

Considered Google's Lyria for the SFX instead (already had Gemini API
access) — ruled out, it only generates 30s–2min music clips, no short-SFX
mode, wrong tool for a UI chime. ElevenLabs' free web-tier (10k credits/mo)
was used manually rather than its paid API tier (free API access is capped
at 10 credits/mo, unusably low) — a $5/mo subscription wasn't worth it for
a one-time batch of 8 short sounds. Not yet resolved: the free tier's
license is non-commercial-only, and whether that matters for a public but
non-monetized personal site is a judgment call still open.

## Incidental bug fix

While confirming `pnpm build` still passed after the `sounds.ts` refactor,
found it was already broken on a clean checkout before any Phase 9 changes
— `PlayPage.vue`'s `enterIntro()` assigned the whole `FactFamily` object
from `curriculum.tryAutoUnlock()` into `highlightedKey` (typed
`string | null`) instead of `.key`. `vp check`'s type-aware lint didn't
catch it; `vue-tsc` (only run in `pnpm build`) did. One-line fix — see
"Known pre-existing issues" in PLAN.md.

## Verification

`pnpm check`, `pnpm test` (128 tests), and `pnpm build` all pass. Generated
images spot-checked by compositing over white (see gotcha above); app icons
spot-checked the same way plus direct view for the opaque maskable variant.
Not yet checked: real-device "Add to Home Screen" with the new icons
(carries forward the same open item from Phase 6).
