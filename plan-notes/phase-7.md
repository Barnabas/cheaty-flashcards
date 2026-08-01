# Phase 7 — Visual polish — done (2026-07-21)

Full detail behind the one-line summary in PLAN.md.

## The ask, and why the checklist alone wasn't enough

The Phase 7 checklist (custom theme, confetti, more sounds) was written
before Phase 4's mastery dashboard existed as the app's centerpiece. Having
built it, the honest read was: the heatmap grid + "X / Y facts mastered"
counters are informative but read as a spreadsheet, not a game. The user's
brief for this phase was explicit about that — asked to think about a
metaphor/character to carry through the app, not just reskin the same
screens.

## Design decision: Ziggy the Fox

The app is already named around its central mechanic — "cheat" has real
stakes (Phase 3) via a hint-token budget. A sly trickster mascot fits that
mechanic directly rather than being decoration bolted on top:

- Hint tokens are reframed as **asking Ziggy for a favor** — "Ask Ziggy to
  hide 2" / "Beg Ziggy to reveal it" replace the flat "Eliminate 2" /
  "Reveal" button labels.
- A cheat-free streak is reframed as **outfoxing Ziggy** — the milestone
  toast, the home-page best-streak line, and the in-level live streak
  counter all use this framing now.
- The mastery dashboard becomes **"Ziggy's Den"** — each operator group's
  panel title changes, and a new `denFlavor()` helper in `dashboard.ts`
  narrates the fact-family heatmap through him ("Ziggy hasn't even broken a
  sweat yet", "Ziggy's starting to sweat. Keep going!", "Ziggy's fresh out
  of tricks here — you know these cold!"). Pure function, tested the same
  way `masterySummary`/`stageBgClass` already were.
- Level-complete and streak-milestone moments show Ziggy in a "cheer" pose.

This is a genuinely small scope change (a few lines of copy, one new pure
helper, one new component) that does more for "does this feel like a game"
than a bigger reskin would have — the character does the narrative work, the
existing UI structure barely had to move.

## Mascot implementation

`src/components/mascot/FoxMascot.vue` — hand-coded flat SVG (circles,
polygons, a couple of quadratic paths), no image asset. Three poses (`idle`,
`sly`, `cheer`) via `v-if` branches on eyes/mouth/sparkles, not three separate
files — keeps the silhouette (ears, head, tail) shared and consistent.
Colors are literal hex matching the new theme (see below), not
`var(--color-*)`: SVG presentation attributes don't reliably resolve
daisyUI's oklch custom properties the same way across browsers, and the
mascot shouldn't shift with `prefers-color-scheme` since there's deliberately
only one theme now anyway.

Placed: `SiteHeader.vue` (logo slot, `sly` pose), `HomePage.vue` (greeting
banner + per-group den heading), `LevelPage.vue` (hint-token row, streak
toast, level-complete banner), and the help modal.

One care point: `LevelPage.test.ts` asserts
`wrapper.get('[data-testid="hint-tokens"]').findAll("svg")` has length equal
to the hint-token count. The new mascot icon next to that row had to go
_outside_ the `data-testid="hint-tokens"` container, not inside it, or it
would inflate that count and break the assertion. Same care with the
streak-milestone toast: the test only asserts `.text()).toContain("5
cheat-free streak")`, so the "You outfoxed Ziggy!" prefix could be added
freely as long as that exact substring survived.

## Theme: committing to one, not fixing light/dark

The plan gave two options: fix the dead light/dark selection, or commit to a
single custom theme and drop the rest. Went with the latter — there was
never a theme-switcher UI in the app (checked: no component references
`data-theme`, `theme-controller`, or `prefersdark` anywhere before this
phase), so "fix" would have meant _building_ a feature no one asked for, not
repairing a broken one. A kids' game also doesn't obviously benefit from
following OS dark-mode preference the way a utility app would.

New theme `ziggy` in `src/style.css`, via daisyUI 5's CSS-first
`@plugin "daisyui/theme" { name: "ziggy"; default: true; ... }` block
(replacing the old `themes: light --default, dark --prefersdark, cupcake;`
one-liner). Palette is a warm fox-den scheme: orange primary (`#f2711c`),
violet secondary, sunny-yellow accent, cream base, rounder corners
(`--radius-*` bumped up) than daisyUI's defaults. Colors are literal hex, not
oklch — deliberate, so the exact same values could be reused verbatim for
the mascot SVG fills, confetti particle colors, and the PWA manifest's
`theme_color`/`background_color` (previously an eyeballed oklch→hex
conversion per Phase 6's notes; now there's one source of truth, just
copied by hand into a few places since none of those consumers can read a
CSS custom property directly).

`index.html`'s hardcoded `data-theme="cupcake"` and `<meta name="theme-color">`
also needed updating — easy to miss since neither is in `style.css`.

## Confetti

`src/confetti.ts` wraps `canvas-confetti` with two presets: `celebrate()` (a
modest single burst — level clears at/above the existing 80% clear
threshold, streak milestones) and `celebrateBig()` (a two-burst fanfare,
reserved for an actual new personal best, so it reads as more special than a
routine clear). Both colored from the same theme hex palette as the mascot.

Two guards, both found by actually running things rather than by inspection:

- `prefers-reduced-motion: reduce` — skip confetti outright. Not explicitly
  asked for, but a burst of moving particles is exactly the kind of thing
  that setting exists to suppress, and it was a two-line check to add correctly.
- **canvas support detection.** `canvas-confetti` has no feature-detection of
  its own — it assumes a working 2D canvas context and drives its animation
  loop straight off it. In this repo's own Vitest suite (jsdom, no `canvas`
  npm package installed), calling `confetti()` doesn't throw at the call
  site; it throws later from inside a `requestAnimationFrame` callback once
  the test's fake-timer `vi.advanceTimersByTime()` flushes the frame,
  surfacing as an opaque `Cannot read properties of null (reading
'clearRect')` failure in an unrelated-looking test
  (`LevelPage.test.ts`'s streak-milestone test, since that's the first
  behavior in the suite that now triggers `celebrate()`). Added
  `canvasSupported()` — `document.createElement("canvas").getContext("2d")`
  wrapped in try/catch — and gate both `celebrate()`/`celebrateBig()` on it.
  This isn't just a test workaround: it's the same defensive check a real
  canvas-less environment (some minimal WebViews) would need.

## Sound: synthesized chimes instead of new mp3 assets

The checklist called for "expanded sound cues" for streak milestones,
mastery achieved, and badges. Rather than sourcing/licensing three more mp3
files (and repeating Phase 6's `globPatterns`/offline-caching work for them),
added `playChime()` to `sounds.ts` — short Web Audio API oscillator
sequences (`streak_milestone`, `mastery_up`, `badge`), synthesized at
playback time with a simple gain-envelope helper. No new binary assets, no
licensing question, and it's a natural fit for short "jingle" cues rather
than the longer sound-effect-style clips Howler already handles well.
Gated on the same `settings.soundEnabled` flag as the existing Howler
sounds.

`mastery_up` needed a stage-transition check that didn't exist yet:
`recordFamilyOutcome()` in `LevelPage.vue` now reads the family's mastery
stage before calling `mastery.recordAttempt()`, then compares to the stage
after, firing the chime only on the crossing into `MAX_STAGE` (not on every
attempt at an already-mastered family).

## What didn't change

- No new settings/toggle for confetti specifically — reduced-motion
  preference was judged sufficient, and adding a second control next to the
  existing sound toggle felt like scope creep for what the phase asked for.
- Didn't touch the pre-existing `LevelPage.vue` double-click/timeout races
  documented in PLAN.md's "Known pre-existing issues" — not touched by this
  phase's changes, and fixing them wasn't in scope.
- Left the README's opening paragraph (still describes the pre-redesign
  "Cheat button"/points mechanic) alone — stale, but unrelated to this
  phase's scope; Phase 8 (About/Credits) is a more natural place to give the
  README a real pass.

## Verification

- `pnpm test` — 86/86 passing (one pre-existing-looking failure surfaced
  during this phase, from the canvas issue above; fixed via
  `canvasSupported()`, not by weakening the test).
- `pnpm check` — clean (format/lint/typecheck), after fixing three
  `no-floating-promises` warnings on the `confetti()` calls (`void`-prefixed,
  since nothing needs to await a purely decorative animation).
- `pnpm build` — succeeds; confirmed the compiled CSS actually contains
  `--color-primary:#f2711c` (i.e. the new daisyUI 5 CSS-theme syntax was
  parsed correctly, not silently ignored).
- Manual real-browser check via a scratch Playwright script against
  `vp preview` (deleted after): home page and an in-progress level screenshot
  confirm the theme, mascot, den-flavor copy, and disabled/error button
  states all render as expected with zero `pageerror`/console-error events.
