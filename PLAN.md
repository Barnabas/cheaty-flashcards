# Cheaty Flashcards — Redesign Plan

Living plan document. Update checkboxes and add notes as phases land; don't
delete completed items — future sessions (human or agent) should be able to
read this top to bottom and know what happened and why.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

Last updated: 2026-07-20

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

### Phase 0 — Vite+ & testing foundation — done (2026-07-19)

- [x] Confirm current versions satisfy `vp migrate` prerequisites (Vite 8+ ✅
      already on `^8.1.5`; Vitest 4.1+ — not installed yet, so likely a
      fresh `vp install` rather than a true migrate for the test side)
      — confirmed via `pnpm --package=vite-plus dlx vp migrate --help`;
      `vite-plus@0.2.5` (bundling Vitest 4.1.10) was the current release.
- [x] Run `vp migrate --no-interactive`, review the merged `vite.config.ts`
      (tsdown/vitest/lint-staged blocks), verify Vue plugin + Tailwind vite
      plugin + unplugin-icons still work post-migration
      — ran with `--no-hooks` first (hooks decided separately below).
      `vite.config.ts` gained `fmt`/`lint` blocks and wraps the existing
      `tailwindcss()`/`vue()`/`Icons()` plugins in `lazyPlugins(() => [...])`
      (Vite+'s convention so `vp check`/`vp lint`/`vp fmt` don't pay Vite's
      dev/build plugin cost). `package.json` moved `vite`/`vite-plus` to a
      pnpm `catalog:` entry (`pnpm-workspace.yaml`) aliasing `vite` to
      `@voidzero-dev/vite-plus-core`. Also generated `AGENTS.md` (agent
      instructions for the `vp` CLI) and `src/env.d.ts` (Vue SFC shim).
      No behavior changes to app code.
- [x] Wire up `vp check` (Oxc-based lint/format/typecheck) and confirm it
      plays reasonably with the existing `tsconfig.json` strict settings
      — passes clean (`vp check --fix` only reformatted whitespace/line
      width, no logic touched). No `tsconfig.json` changes were needed
      beyond what `vp migrate` itself applied.
- [x] Get `vp test` running with a trivial smoke test
      — added `src/sections.test.ts` (real assertions against the pure
      `getLevelName()` helper, not a placeholder). **Gotcha**: running via
      `pnpm dlx vite-plus` spawns an isolated copy of vitest, which
      conflicts with the `vitest` re-exported from `vite-plus/test` inside
      the test file (`Cannot read properties of undefined (reading
'config')`). Fix: always invoke the project's own
      `./node_modules/.bin/vp`, not `dlx`, once `vite-plus` is an installed
      dependency.
- [x] Update `package.json` scripts and README dev instructions accordingly
      — added `test`/`check` scripts (`vp test`/`vp check`); README tech
      stack + Development section updated to mention Vite+/Vitest.
- [x] Decide on commit hooks (`vp migrate` can set these up — evaluate vs.
      keeping it manual)
      — enabled. Ran `vp config --no-agent` (hooks only, agent files
      already current), which points `core.hooksPath` at `.vite-hooks/_`
      and adds a `staged: { "*": "vp check --fix" }` block to
      `vite.config.ts`. Rationale: solo hobby project, `vp check` runs in
      well under a second, so auto-fixing staged files on commit is free
      insurance with no team-coordination downside.

### Phase 1 — State & persistence foundation — done (2026-07-19)

- [x] Introduce Pinia + `pinia-plugin-persistedstate`
      — `pinia@4.0.2` + `pinia-plugin-persistedstate@4.7.1` added; wired in
      `src/main.ts` via `pinia.use(createPersistedState())` before
      `app.use(pinia)`.
- [x] Define `localStorage` schema: player profile/settings, mastery data,
      streaks/badges, personal bests
      — three stores under `src/stores/`: `settings.ts` (`soundEnabled`,
      the only setting that currently exists), `progress.ts`
      (`personalBests: Record<"section:level", PersonalBest>` with a
      `recordLevelResult`/`getPersonalBest` API), and `mastery.ts`
      (`families: Record<string, FamilyMastery>` — a thin persisted
      container only; family grouping and Leitner promotion/demotion logic
      are Phase 2's job, not implemented here). Shared types in
      `src/stores/types.ts`. Streaks/badges schema deliberately **not**
      stubbed out yet — cheat-free streak tracking (Phase 3) and badges
      (Phase 4) will add their own store state when there's actual logic to
      attach it to, to avoid dead/unused schema sitting around.
- [x] Move state currently trapped in `LevelPage.vue` into stores where it
      needs to survive navigation
      — `LevelPage.vue` now calls `progress.recordLevelResult()` in
      `finishLevel()` and displays the personal best (with a "New!" badge)
      in the level-complete summary. `sounds.ts` reads
      `useSettingsStore().soundEnabled` before playing; `SiteHeader.vue` got
      a mute/unmute toggle button wired to the same store. Per-level
      ephemeral state (points, question index, answer types) intentionally
      stays local to `LevelPage.vue` — it doesn't need to survive
      navigation and the old point-accumulation score is being retired in
      Phase 3 anyway.
- [x] Unit tests for store logic (persistence round-trips, migrations of the
      schema itself if it changes later)
      — `src/stores/progress.test.ts` (best/tiebreak/timesPlayed logic) and
      `src/stores/persistence.test.ts` (round-trip through a real
      `createPersistedState()` + `localStorage`, for all three stores).
      **Gotcha #1**: Pinia plugins registered via `pinia.use()` are only
      queued (`toBeInstalled`) until the pinia instance is actually
      installed on a Vue app (`app.use(pinia)`) — `setActivePinia(pinia)`
      alone is _not_ enough to activate them, so persistence tests need a
      throwaway `createApp({}).use(pinia)` per simulated "reload", not just
      `setActivePinia`. **Gotcha #2**: Node 22+'s own experimental global
      `localStorage` (guarded behind `--localstorage-file`/`--webstorage`)
      shadows jsdom's working `window.localStorage` in Vitest 4.1, because
      Vitest's jsdom-environment global allowlist doesn't include
      `localStorage` and skips copying over any key that already exists on
      `global`. Fix: run tests with `NODE_OPTIONS=--no-experimental-webstorage`
      (now baked into the `test` script in `package.json`) so Node doesn't
      define the shadowing global in the first place. Also added
      `test: { environment: "jsdom" }` to `vite.config.ts` and `jsdom` as a
      devDependency — needed for `localStorage` and will also serve
      `@vue/test-utils` component tests in later phases.

### Phase 2 — Adaptive mastery engine — done (2026-07-20)

- [x] Define fact-family grouping for each operator pair (+/−, ×/÷)
      — new `src/mastery.ts` (pure, store-independent). `operatorGroup()`
      maps `+`/`-` → `"add"`, `×`/`÷` → `"multiply"`. `factFamilyKey()`
      encodes the full triple, e.g. `factFamilyKey("add", 3, 6)` →
      `"add:3,6,9"`, `factFamilyKey("multiply", 3, 6)` → `"multiply:3,6,18"`
      — matching the `{3,6,9}`/`{3,6,18}` grouping in the design decisions,
      and coincidentally the exact key shape already used as a placeholder
      in Phase 1's `persistence.test.ts`. `familyPool()` generates every
      unordered `(a,b)` pair over `MIN_FACTOR..MAX_FACTOR` (2–9, matching
      the previous level-based range).
- [x] Implement Leitner-style mastery stages per family
      — `applyOutcome(mastery, outcome)` in `src/mastery.ts`: pure stage
      transition, stages 0–`MAX_STAGE` (5). `correct-fast` promotes
      (capped), `correct-slow` holds the stage but still counts as a
      correct attempt, `wrong` demotes (floored at 0), `cheated` holds the
      stage and grants no credit (per "cheated-to answers contribute
      little/no mastery progress"). `src/stores/mastery.ts` gained
      `recordAttempt(key, outcome)`, a thin wrapper persisting the result
      of `applyOutcome`.
- [x] Replace `generateLevel()`'s level-number-driven difficulty with
      weighted sampling from the mastery store, with interleaved review
      — `familyWeight(mastery)` = `MAX_STAGE - stage + 1`, so weight never
      hits zero even at full mastery (stage 5 → weight 1), which is what
      gives "interleaved review" for free: `selectFamilies()` samples with
      replacement each question independently, so mastered families still
      show up sometimes, just far less often than weak ones.
      `sections.ts#generateLevel()` no longer derives `factorA`/`factorB`
      from `options.level` at all — `options.level` is kept only for the
      milestone label (`getLevelName`) and personal-best keying, not
      difficulty, matching "levels become milestones, decoupled from raw
      difficulty" (full UI for that lands in Phase 4). `buildQuestion()`
      was extracted from the old inline switch/case and now takes an
      explicit `(operator, a, b)` rather than reading level-derived
      closure variables.
- [x] Support "focus on specific numbers" as a seed/filter on the weighted
      pool
      — `selectFamilies()` takes `focusNumbers?: number[]`; when present,
      restricts the pool to families touching at least one of those
      numbers before weighting, falling back to the unrestricted pool if
      the filter would otherwise empty it out. Wired end-to-end: a
      `?focus=7,8` query param on the level route (parsed in
      `LevelPage.vue`) plus a minimal text input + "Go" button on
      `SectionPage.vue` — functional, not styled/polished (that's Phase 7).
- [x] Add mixed-operation practice mode (paired inverse operations)
      — `operatorsForGroup()` returns the `[+,-]`/`[×,÷]` pair for a group;
      `generateLevel({ mixed: true })` randomly picks between a section's
      own operator and its inverse per question, still drawn from the same
      shared family pool (a family is operator-agnostic within its group).
      `Question` gained an `operator` field so `LevelPage.vue` can render
      the actual per-question symbol instead of the fixed
      `section.operator` — needed since mixed mode varies it question to
      question. Wired via `?mixed=1` and a "Mixed +/− Practice" /
      "Mixed ×/÷ Practice" button on `SectionPage.vue` (label derived from
      `operatorsForGroup`, not hardcoded).
- [x] Unit tests: mastery promotion/demotion logic, weighted sampling
      distribution sanity checks, focus-filter behavior
      — `src/mastery.test.ts` (pure engine: family key encoding/ordering,
      pool generation, all four `applyOutcome` transitions incl. caps/
      floors, weight monotonicity, `weightedPick` distribution via a
      seeded LCG rng, `selectFamilies` bias + focus-filter + fallback),
      `src/stores/mastery.test.ts` (store wiring), and additions to
      `src/sections.test.ts` (`generateLevel` end-to-end: question
      well-formedness, mastery-biased sampling, focus restriction, mixed
      vs. non-mixed operator variety) — all with injectable seeded `rng`
      for determinism, no flaky `Math.random()` in assertions.

  **Design note on outcome classification** (not in the original
  checklist, but needed to make the engine do anything real rather than
  sit inert): `LevelPage.vue` now classifies each answered question into
  one of the four `MasteryOutcome`s before calling
  `mastery.recordAttempt()`. A question is `"cheated"` if the hint/reveal
  button was used on it (any tier — Phase 3 will refine hint cost, not
  this classification), `"correct-slow"` if the player got it right but
  only after at least one wrong guess (regardless of speed — a wrong guess
  first means it wasn't clean recall), otherwise `"correct-fast"` vs.
  `"correct-slow"` based on `FAST_RESPONSE_MS` (3000ms). A wrong guess
  itself is recorded as `"wrong"` once per question (first wrong guess
  only — clicking multiple wrong answers on the same question doesn't
  compound the demotion).

  **Gotcha**: Vue Router reuses the `LevelPage` component instance across
  navigations that only change route params/query (e.g. `/add/1` →
  `/add/2`) — it does not remount, so a plain route change alone doesn't
  regenerate a level. This is pre-existing (that's exactly why
  `nextLevel()`/the "Try Again" button call `startLevel()` explicitly
  rather than relying on a route watcher) but it tripped up manual
  browser verification: navigating directly via a headless browser's
  `page.goto()` between hash URLs on the same origin is a same-document
  navigation (browsers don't reload the document for hash-only changes,
  even via `goto`/typing a new URL), so repeated `goto()` calls to
  `/add/{n}?mixed=1` for different `n` all hit the same mounted instance
  and never re-ran `startLevel()`. Fix for verification purposes was to
  force a real `page.reload()` after each `goto()`. Not an app bug, but
  worth remembering next time a phase gets manually browser-tested this
  way.

### Phase 3 — Cheat mechanic rework — done (2026-07-20)

- [x] Tiered hints (cheap: eliminate 2 wrong answers; expensive: reveal
      answer)
      — `LevelPage.vue` replaced the flat 5-hint counter with a per-level
      5-token budget (`START_HINT_TOKENS`). `eliminateWrong()` costs
      `ELIMINATE_COST = 1`, hides up to 2 untried/unhidden wrong answers
      (picked via `shuffle()` from `eliminableIndices`, which excludes
      answers already tried or hidden); disables itself once no untried
      wrong answers remain, even if tokens are still available.
      `revealAnswer()` costs `REVEAL_COST = 3` and is the old flash-for-1s
      behavior, unchanged. Both buttons independently disable based on
      `canEliminate`/`canReveal` computeds.
- [x] Cheat-free streak tracking + visible reward (badge/animation/sound)
      — new persisted `src/stores/streak.ts` (`current`, actions
      `recordClean()`/`recordCheat()`) plus pure `src/streak.ts`
      (`STREAK_MILESTONES = [5, 10, 25, 50, 100, 250, 500]`,
      `isStreakMilestone()`). `LevelPage.vue`'s `recordStreak()` calls
      `streak.recordClean()` after every hint-free correct answer; hitting
      a milestone shows a daisyUI `toast`/`alert` badge
      (`streakMilestone` ref) for 2.5s, using Tailwind's built-in
      `animate-bounce` rather than a new animation dependency. The streak
      resets **immediately** when a hint is used (inside `markCheated()`,
      called from both `eliminateWrong()` and `revealAnswer()`), not when
      the question is later answered — cheating breaks the streak the
      moment it happens. Sound cues for streak events are explicitly out
      of scope here; Phase 7 owns "expanded sound cues for new events
      (streaks...)". A `best` (highest-ever streak) field was considered
      and deliberately left out — nothing in this phase surfaces it, and
      Phase 1 already established the precedent of not stubbing persisted
      schema ahead of a real consumer; add it back if/when a "best streak"
      UI actually lands.
- [x] Cheated-to answers contribute little/no mastery credit
      — already true from Phase 2's `applyOutcome("cheated", ...)`; both
      hint tiers set `hintUsedThisQuestion`, so `recordFamilyOutcome()`
      still classifies the eventual answer as `"cheated"` regardless of
      which tier was used. Not differentiating credit by tier was a
      deliberate simplification — see design note below.
- [x] Retire the old point-accumulation score entirely
      — removed `points` ref, the 2s `setInterval` that ticked it up, and
      the +1/-1 adjustments on right/wrong/hint. `LevelSummary.points` and
      `LevelMetrics.endLevel(points)`'s parameter are gone from
      `types.ts`/`utils.ts` (and their fixtures in
      `stores/progress.test.ts`/`stores/persistence.test.ts`). The
      level-complete summary table lost its "Points:" row; the per-level
      play view now shows the cheat-free streak count (when > 0) where
      points used to be. `SiteHeader.vue`'s help-modal copy was rewritten
      to describe hint tokens and streaks instead of the old points rules.
- [x] Component tests: cheat button behavior at each tier, streak
      resets/rewards
      — added `@vue/test-utils` as a devDependency (first component-test
      usage in the repo). New `src/pages/LevelPage.test.ts` mocks
      `../sections`' `generateLevel` to return a fixed, non-random level
      (correct answer always `2`, at a known family key) so tests don't
      have to fight `shuffle()`/`Math.random()`; mounts through a real
      `vue-router` (memory history) + `@unhead/vue/client` head instance,
      mirroring `main.ts`'s plugin wiring, and mutes `soundEnabled` before
      mount to avoid Howler playback under jsdom. Covers: hint-token
      budget rendering, `Eliminate 2` hiding exactly 2 untried wrong
      answers and disabling once exhausted, `Reveal` flashing/costing 3
      tokens and disabling below that, cheated questions granting no
      mastery credit, streak building to the first milestone (with the
      toast rendering), and immediate streak reset on hint use. Template
      gained `data-testid` hooks (`answer-button`, `eliminate-button`,
      `reveal-button`, `hint-tokens`, `streak-milestone`, `streak-count`)
      purely for test targeting.

  **Design note on hint-tier credit** (not in the original checklist):
  the plan's mastery-credit rule ("cheated-to answers contribute
  little/no mastery progress") doesn't distinguish between the two hint
  tiers. Eliminating 2 wrong answers still requires real recall among the
  remaining 3 options, arguably deserving partial credit vs. an outright
  reveal — but adding a third `MasteryOutcome` for "assisted-correct"
  felt like speculative complexity with no evidence it's needed yet.
  Revisit if playtesting shows `Eliminate 2` feels too punishing relative
  to how little it actually gives away.

  **Manual verification**: ran the app via `pnpm run dev` + a throwaway
  Playwright script (Playwright was added as a devDependency temporarily
  for this and removed again afterward — not part of the toolchain
  decision, just a one-off browser driver since no `chromium-cli` was
  available in this environment). Confirmed by screenshot: `Eliminate 2`
  visually dims exactly 2 wrong answers and spends 1 token; `Reveal`
  highlights the correct answer blue and spends 3 tokens, disabling
  itself; 5 clean answers in a row produces the "🔥 5 cheat-free streak!"
  toast and a persistent streak counter in the play view.

  **Self-review pass**: ran an 8-angle diff review before calling this
  phase done. Two real regressions from this phase's own changes got
  fixed as a result: (1) `streakMilestone`/its auto-hide timeout weren't
  reset by `startLevel()`, so hitting a milestone right before "Try
  Again"/"Next Level" could leave a stale toast showing over the new
  attempt — fixed via a shared `dismissStreakMilestone()` called from both
  `startLevel()` and `markCheated()` (the latter because cheating right
  after a milestone should also kill the now-false toast, not just reset
  the counter underneath it). (2) `hintClass()`'s success/warning/error
  thresholds were carried over unchanged from the old flat-hint-count
  system and no longer meant anything once tiers had different costs —
  fixed to key off actual affordability (`>= REVEAL_COST` /
  `>= ELIMINATE_COST` / below both). Also caught and fixed before it
  shipped: an unused `best` field speculatively added to the streak store
  (see design note above) and a missing `persistence.test.ts` case for
  the new streak store.

  **Found while writing the regression test for (1), much bigger than
  (1)**: a component test for "stale toast survives Try Again" kept
  passing regardless of whether the fix was applied, which turned out to
  be because `startLevel()` was silently failing entirely — `useHead()`
  (first line of `startLevel()`, unchanged by this phase, i.e.
  **pre-existing**) was being re-invoked every time a level starts,
  including from the "Try Again"/"Next Level" click handlers. `@unhead/vue`
  requires `useHead()` to run during a component's synchronous setup call
  stack; Vue does not restore injection context for plain DOM event
  listener invocations (confirmed by reading `callWithErrorHandling` in
  `@vue/runtime-core` — it does not call `setCurrentInstance`), so the
  second and every subsequent call threw `"useHead() was called without
provide context"`, aborting the rest of `startLevel()` before it reset
  anything. **This meant clicking "Try Again" or "Next Level" was
  completely broken in production** — confirmed with a real headless
  Chromium session (not just the jsdom component test), not merely a test
  artifact. Fixed by calling `useHead({ title: pageTitle })` exactly once
  at setup time with a reactive `ref`, and having `startLevel()` just
  update `pageTitle.value` instead of re-calling `useHead()`. Re-verified
  both "Try Again" and "Next Level" end-to-end in a real browser after the
  fix. This was a significant enough, if pre-existing, correctness bug
  that it was fixed on the spot rather than deferred — unlike the two
  narrower pre-existing races below.

  Two smaller **pre-existing** issues (present before this phase, not
  introduced by it, left unfixed as out of scope) also surfaced in the
  same review and are worth a follow-up: `chooseAnswer()`'s wrong-answer
  branch is only guarded by `answerTypes.value[index] !== "wrong"`, so a
  double-click on the button that was just marked correct (during the
  500ms transition-to-next-question window) falls through and records a
  spurious `"wrong"` mastery attempt on top of the correct one; and
  `revealAnswer()`'s (formerly `showHint()`'s) 1s cleanup `setTimeout` is
  untracked/uncancellable, unlike `streakMilestoneTimeout`, so a rapid
  "Try Again" during a reveal can in principle clear the wrong question's
  highlight early. Both are narrow races, not touched by this phase's
  changes beyond a rename, and not worth widening this diff to fix.

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
