# Cheaty Flashcards — Redesign Plan

Living plan index. Update checkboxes and add a one-to-three sentence summary as phases land — don't delete completed items, and don't inline detail here. Full phase detail, war stories, and design tradeoffs live in `docs/plan-notes/phase-N.md`; link, don't paste. Only promote something into "Known gotchas" below if it's likely to bite a _future_ phase, not just explain the past one.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

Last updated: 2026-08-07 (Phase 9 — home page redesign & Ziggy as a speaking companion)

## Why this redesign

The app originally had no persistence — "levels" were just a URL convention, scoring didn't map to anything intuitive, and the cheat mechanic had no real cost. Goal: privacy-respecting but genuinely adaptive to the player, real stakes for cheating, and a modernized deployment/PWA story — while staying a fully static, backend-free app. Current implementation state is the code itself ([README.md](./README.md) has the architecture overview); this section is historical motivation, not a status report. Settled design reasoning per decision lives in [docs/design-decisions.md](./docs/design-decisions.md).

## Known gotchas

Things that already cost a session real time once. Check this before touching adjacent code.

- **`useHead()` must be called exactly once**, during a component's synchronous `setup()`, with a reactive ref for anything that changes later (e.g. `pageTitle`). Vue does not restore injection context for plain DOM event-listener callbacks, so calling `useHead()` again from a click handler throws and silently aborts the rest of that handler. (Phase 3 — [docs/plan-notes/phase-3.md](./docs/plan-notes/phase-3.md).)
- **Pinia plugins registered via `pinia.use()`** only activate once the pinia instance is installed on a real Vue app (`app.use(pinia)`) — `setActivePinia(pinia)` alone is not enough. Persistence tests need a throwaway `createApp({}).use(pinia)` per simulated "reload". (Phase 1.)
- **Run tests with `NODE_OPTIONS=--no-experimental-webstorage`** (already baked into the `test` script) — Node 22+'s experimental global `localStorage` shadows jsdom's working one in Vitest 4.1 otherwise. (Phase 1.)
- **`vue-router` reuses the `PlayPage` instance** across param/query-only navigations on `/play/:group` (e.g. a `?focus=` change, or `add` → `multiply` via manual URL edit / back-forward) — it does not remount. The `group` param is captured as a `computed` + an `immediate watch()` that re-runs intro setup on change; a plain `const` would go stale. Also affects manual browser verification: same-document navigations via `page.goto()` don't reload the document, so force a `page.reload()` between test navigations. (Phase 2; group-reactivity fix in Phase 8 — [docs/plan-notes/phase-8.md](./docs/plan-notes/phase-8.md).)
- **TypeScript is pinned to `^6.0.3`**, not `latest`/`7.x` — see [docs/maintainer-notes.md](./docs/maintainer-notes.md) for why (`vue-tsc` compatibility).

Also see [docs/known-issues.md](./docs/known-issues.md) (not-yet-fixed bugs) and [docs/open-questions.md](./docs/open-questions.md) (undecided/answered-inline questions).

## Phases

### Phase 0 — Vite+ & testing foundation — done (2026-07-19)

Migrated to Vite+ (`vp check`/`vp test`/`vp run`), added the first real unit test, wired commit hooks (`vp check --fix` on staged files). [Full detail](./docs/plan-notes/phase-0.md) + pre-redesign baseline.

### Phase 1 — State & persistence foundation — done (2026-07-19)

Added Pinia + `pinia-plugin-persistedstate`; three stores (`settings`, `progress`, `mastery`) under `src/stores/`; moved cross-navigation state out of `LevelPage.vue`. [Full detail](./docs/plan-notes/phase-1.md).

### Phase 2 — Adaptive mastery engine — done (2026-07-20)

Fact-family grouping + Leitner stages (`src/mastery.ts`), weighted adaptive sampling replacing level-driven difficulty, focus-number filter (`?focus=7,8`), mixed-operation practice mode (`?mixed=1`). [Full detail](./docs/plan-notes/phase-2.md).

### Phase 3 — Cheat mechanic rework — done (2026-07-20)

Tiered hint-token budget (eliminate-2 costs 1, reveal costs 3) replacing the flat 5-hint counter; cheat-free streak tracking with milestone toasts; old point-accumulation score fully retired; component tests added. Also fixed a production-breaking pre-existing bug ("Try Again"/"Next Level" silently failing via `useHead()`). [Full detail](./docs/plan-notes/phase-3.md), design notes, self-review findings.

### Phase 4 — Progress UI — done (2026-07-20)

Home page replaced with a mastery-first dashboard: per-group fact-family heatmaps, level-clear badges, best cheat-free streak, JSON export/import. Caught and fixed a real (not just test-theoretical) export bug via manual browser verification — see notes. [Full detail](./docs/plan-notes/phase-4.md).

### Phase 5 — Routing & deployment migration — done (2026-07-20)

Switched `createWebHashHistory` → `createWebHistory`; new `wrangler.jsonc` (assets-only Worker) plus `pnpm deploy` script, `not_found_handling: "single-page-application"` for deep-link fallback now that routes are real paths. Verified with `wrangler deploy --dry-run` and a real-browser Playwright reload check on `vp preview`. [Full detail](./docs/plan-notes/phase-5.md).

### Phase 6 — PWA — mostly done (2026-07-20), real-device check still open

`vite-plugin-pwa` (`generateSW`, `registerType: "autoUpdate"`) with manifest + offline precaching; new icon set rendered from scratch-built SVGs via macOS's `sips`. Verified via Playwright against `vp preview` and `wrangler deploy --dry-run`; installability/offline play **not yet confirmed on a real device**. [Full detail](./docs/plan-notes/phase-6.md).

### Phase 7 — Visual polish — done (2026-07-21)

New custom `ziggy` daisyUI theme; introduced "Ziggy the Fox" as a narrative mascot woven through hint tokens, cheat-free streaks, and the mastery dashboard ("Ziggy's Den"), not just a visual reskin; `canvas-confetti` bursts on level clears/new bests/streak milestones; streak/mastery/badge sound cues synthesized via Web Audio API. [Full detail](./docs/plan-notes/phase-7.md).

### Phase 8 — Adaptive sessions: retire "levels", introduce a progressive curriculum — done (2026-08-01)

Motivation: the original level-numbered-route design existed to make a specific practice session shareable via URL, but once mastery/progress live in `localStorage` per player, a "level" doesn't mean anything stable. Replaced with: per-player active fact-family curriculum with auto-unlock, `/play/:group` routing (`?focus=` carries over), dynamic session generation/end-conditions, new intro/outro screens, session-outcome badges replacing `sectionId + level`-keyed personal bests. One gap found along the way: JSON export/import needed a `curriculum` field too. [Full detail](./docs/plan-notes/phase-8.md).

### Phase 9 — Home page redesign & Ziggy as a speaking companion — done (2026-08-07)

Motivation: a full 64-cell mastery grid reads as a wall of debt rather than progress, Ziggy appears four times on one page without a clear job each time, and emoji sit awkwardly next to the app's Feather-icon language.

Asset pipeline prep landed first: 6 Ziggy image assets (AI-generated, `src/assets/ziggy/`), regenerated app icons, and an 8-sound mp3 refresh via ElevenLabs (retiring Phase 7's synthesized chimes). Then the UI: Ziggy became a first-person speaking companion via `ZiggySpeaks`, the home page dropped its heatmap for active-family tiles plus a Play CTA per group, and the hand-coded SVG mascot was retired so there's one art style and one Ziggy per moment. [Full detail](./docs/plan-notes/phase-9.md). Open item: whether the free-tier ElevenLabs non-commercial license matters for this public-but-non-monetized site — not yet vetted.

- [x] **Home page becomes progress-plus-CTA**: replace the full heatmap with `FactFamilyShape` tiles for only the currently-active families, plus one "Play" button per operator group. (`MasteryGrid.vue` deleted.)
- [x] **`ZiggySpeaks` component**: mascot + speech bubble + typewriter-style reveal, first-person lines. Full text present in the DOM immediately (per-character opacity animation, not incremental `textContent`) for a11y + tests; respects `prefers-reduced-motion`.
- [x] **Visual consistency pass**: each Ziggy appearance does a distinct job; `FoxMascot.vue`'s flat SVG retired in favour of the painted assets everywhere; emoji in copy (🦊, ❤️, and the eight outro score messages) replaced by Feather icons or dropped.
- [x] Revisit whether `/settings` is worth splitting into its own route yet. (No — see [docs/open-questions.md](./docs/open-questions.md).)

### Phase 10 — About/Credits page

- [ ] Real `/about` route (not a modal) linking to barnabas.me
- [ ] Credits: Vue, Tailwind, daisyUI, Fredoka (Fontsource), Feather icons, Howler, canvas-confetti, sound asset sources (check licenses), Vite+, niece co-creation note
- [ ] Delete or repurpose the dead `SiteFooter.vue` as the real footer, linking to About

## Reference

- [docs/design-decisions.md](./docs/design-decisions.md) — settled design decisions with reasoning
- [docs/dependencies.md](./docs/dependencies.md) — library additions/removals by phase
- [docs/known-issues.md](./docs/known-issues.md) — known pre-existing bugs, not yet fixed
- [docs/open-questions.md](./docs/open-questions.md) — open/answered questions by phase
