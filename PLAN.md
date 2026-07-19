# Cheaty Flashcards — Redesign Plan

Living plan document. Update checkboxes and add notes as phases land; don't
delete completed items — future sessions (human or agent) should be able to
read this top to bottom and know what happened and why.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

Last updated: 2026-07-19

## Why this redesign

The app currently has no persistence — "levels" are just a URL convention the
player has to remember, scoring doesn't map to anything intuitive, and the
cheat mechanic (flash the correct answer for 1s, 5×/level) has no real cost.
Goal: make the app privacy-respecting but genuinely adaptive to the player,
give cheating real stakes, and modernize the deployment/PWA story — while
staying a fully static, backend-free app.

## Current state (baseline, as of 2026-07-19)

- Vue 3.5 + TypeScript, Vite 8, Tailwind 4 + daisyUI 5, Howler for sound.
- Router: `vue-router` with **hash history** (`createWebHashHistory`).
- No state management library — all game state is local `ref`s in
  `src/pages/LevelPage.vue`.
- Question generation is procedural (`src/sections.ts` `generateLevel()`),
  purely a function of level number → bigger factors. No fact-family or
  mastery tracking of any kind.
- Cheat = flash correct answer for 1s, capped at 5/level, costs "+1 point" in
  a scoring system (lower-is-better, ticks up automatically every 2s) that
  isn't explained anywhere visible and conflates cheating with wrong answers.
- **No persistence** — no localStorage/cookies/backend. Nothing survives a
  reload.
- No PWA (no manifest, no service worker).
- No dedicated About/Credits page (there was one once, removed — see git
  history `3f70638 remove about page`). There's a help modal in
  `SiteHeader.vue` instead.
- No tests, no CI config, no wrangler/Pages config in-repo.
- Dead code: `src/components/SiteFooter.vue` is unused.

Full detail from the original codebase audit is preserved in the design
discussion that produced this plan (see git blame / PR description for this
file if further archaeology is needed).

## Design decisions (settled)

- **No visible countdown/timer pressure.** Response time is still measured
  silently and feeds mastery scoring, but kids never see a ticking clock by
  default.
- **Fact-family-level mastery tracking**, not per-equation. Group by triple
  (e.g. {3,6,9} for +/−, {3,6,18} for ×/÷). Each family has a mastery stage
  (Leitner-box style, ~0–5). Correct+fast promotes; wrong, slow, or
  cheated-to answers demote or withhold promotion.
- **Adaptive question generation**: weighted sampling biased toward
  low-mastery families, with interleaved review of mastered ones. Replaces
  level-number-driven difficulty.
- **Players can target specific numbers** ("work on my 7s and 8s") — this is
  just a filter/seed on the same weighted pool the adaptive engine uses.
- **Mixed practice mode** pairs inverse operations (add/subtract,
  multiply/divide), matching how fact families are taught. Single-operator
  drilling stays available too.
- **Levels become milestones/badges**, decoupled from raw difficulty, which
  is now continuous and adaptive per player.
- **Cheat mechanic gets real stakes**: tiered hints (cheap = eliminate 2
  wrong answers, expensive = reveal answer), cheat-free streaks earn visible
  rewards, and answers reached via cheat contribute little/no mastery
  progress for that fact. The old point-accumulation score is retired
  entirely.
- **Progress is local-only, no leaderboard.** Mastery data, streaks, badges,
  personal bests live in `localStorage` via Pinia + persistence plugin.
  Optional JSON export/import for backup or cross-device transfer — no
  server involved. If a player name is ever collected for personalized
  messages, it stays local, never transmitted.
- **Routing**: switch to `createWebHistory` (real SPA routing, no `#`).
- **Deploy target**: Cloudflare Workers static assets (not the legacy Pages
  dashboard flow), with SPA fallback configured for web history routing.
- **PWA**: installable, offline-capable via `vite-plugin-pwa`, since the app
  is fully static this is close to free.
- **Visual**: move off the default `cupcake` daisyUI theme to something more
  custom/kid-bright; fix the currently-dead `light`/`dark` theme selection;
  light animation via CSS/daisyUI transitions + `canvas-confetti` for
  celebration moments rather than a full animation framework.
- **Toolchain**: adopt **Vite+** (viteplus.dev), currently in beta from
  VoidZero (acquired by Cloudflare, June 2026). Chosen deliberately — both
  as a good architectural fit (unified runtime/package-manager/lint/test/
  build) and because the user wants hands-on familiarity with it. Vitest is
  Vite+'s test runner, so this also satisfies the testing requirement in one
  move. Beta risk is accepted; if it proves unstable, fallback is plain
  Vite 8 + Vitest 4 (functionally what Vite+ wraps anyway, so de-risking
  later is cheap).
- **Testing**: add tests as each phase lands, not as a bolt-on at the end.
  Unit tests for pure logic (mastery engine, question generation, utils),
  component tests (Vue Test Utils) for interactive pieces (cheat button,
  answer selection, level flow), keep it lightweight — no e2e layer unless
  it earns its keep later.

## Library changes

**Add:**
- `vite-plus` (replaces `vite` + adds `vp check`/`vp test`/`vp run`/`vp pack`
  toolchain; re-exports Vitest 4.x under `vite-plus/test`)
- `pinia` + `pinia-plugin-persistedstate`
- `canvas-confetti` (+ `@types/canvas-confetti`)
- `@vue/test-utils` (component testing, alongside Vite+'s bundled Vitest)

**Remove:** nothing yet — `howler`, `@unhead/vue`, `@fontsource-variable/fredoka`,
daisyUI/Tailwind all stay.

**Delete:** `src/components/SiteFooter.vue` (dead placeholder) — or repurpose
it as the real footer in the About/Credits phase.

## Phases

### Phase 0 — Vite+ & testing foundation
- [ ] Confirm current versions satisfy `vp migrate` prerequisites (Vite 8+ ✅
      already on `^8.1.5`; Vitest 4.1+ — not installed yet, so likely a
      fresh `vp install` rather than a true migrate for the test side)
- [ ] Run `vp migrate --no-interactive`, review the merged `vite.config.ts`
      (tsdown/vitest/lint-staged blocks), verify Vue plugin + Tailwind vite
      plugin + unplugin-icons still work post-migration
- [ ] Wire up `vp check` (Oxc-based lint/format/typecheck) and confirm it
      plays reasonably with the existing `tsconfig.json` strict settings
- [ ] Get `vp test` running with a trivial smoke test
- [ ] Update `package.json` scripts and README dev instructions accordingly
- [ ] Decide on commit hooks (`vp migrate` can set these up — evaluate vs.
      keeping it manual)

### Phase 1 — State & persistence foundation
- [ ] Introduce Pinia + `pinia-plugin-persistedstate`
- [ ] Define `localStorage` schema: player profile/settings, mastery data,
      streaks/badges, personal bests
- [ ] Move state currently trapped in `LevelPage.vue` into stores where it
      needs to survive navigation
- [ ] Unit tests for store logic (persistence round-trips, migrations of the
      schema itself if it changes later)

### Phase 2 — Adaptive mastery engine
- [ ] Define fact-family grouping for each operator pair (+/−, ×/÷)
- [ ] Implement Leitner-style mastery stages per family
- [ ] Replace `generateLevel()`'s level-number-driven difficulty with
      weighted sampling from the mastery store, with interleaved review
- [ ] Support "focus on specific numbers" as a seed/filter on the weighted
      pool
- [ ] Add mixed-operation practice mode (paired inverse operations)
- [ ] Unit tests: mastery promotion/demotion logic, weighted sampling
      distribution sanity checks, focus-filter behavior

### Phase 3 — Cheat mechanic rework
- [ ] Tiered hints (cheap: eliminate 2 wrong answers; expensive: reveal
      answer)
- [ ] Cheat-free streak tracking + visible reward (badge/animation/sound)
- [ ] Cheated-to answers contribute little/no mastery credit
- [ ] Retire the old point-accumulation score entirely
- [ ] Component tests: cheat button behavior at each tier, streak
      resets/rewards

### Phase 4 — Progress UI
- [ ] Home page dashboard: per-operation mastery view (grid/heatmap of fact
      families), personal bests, streaks — replaces "pick a level number"
      flow
- [ ] Milestone/badge display decoupled from raw difficulty
- [ ] JSON export/import of progress (local file, no server)
- [ ] Component tests for dashboard rendering against store fixtures

### Phase 5 — Routing & deployment migration
- [ ] Switch `createWebHashHistory` → `createWebHistory`
- [ ] Cloudflare Workers static-assets config (wrangler config, SPA fallback
      / `not_found_handling`) replacing the ad hoc Pages-dashboard flow
- [ ] Confirm Vite+'s Cloudflare deploy support covers this cleanly
- [ ] Update README deployment instructions

### Phase 6 — PWA
- [ ] `vite-plugin-pwa` with manifest (icons, theme colors) + offline
      precaching
- [ ] Verify installability and offline play on a real device
- [ ] Confirm interaction with Workers static-assets deploy (caching
      headers, service worker scope)

### Phase 7 — Visual polish
- [ ] New/custom daisyUI theme, fix dead `light`/`dark` theme selection (or
      commit to a single custom theme and drop the unused ones)
- [ ] `canvas-confetti` for celebration moments (level milestones, cheat-free
      streaks)
- [ ] Expanded sound cues for new events (streaks, mastery achieved, badges)

### Phase 8 — About/Credits page
- [ ] Real `/about` route (not a modal) linking to barnabas.me
- [ ] Credits: Vue, Tailwind, daisyUI, Fredoka (Fontsource), Feather icons,
      Howler, sound asset sources (check licenses), Vite+, niece
      co-creation note
- [ ] Delete or repurpose the dead `SiteFooter.vue` as the real footer,
      linking to About

## Open questions / revisit later

- Exact Leitner stage count and promotion/demotion thresholds — start
  simple (0–5), tune based on how it feels in play.
- Whether "levels" as milestones need any UI presence at all, or whether the
  mastery dashboard alone is enough motivational structure.
- Vite+ is beta and evolving fast — re-check `viteplus.dev/guide/migrate`
  and `viteplus.dev/guide/upgrade` before Phase 0 lands in case the CLI
  surface has changed.
