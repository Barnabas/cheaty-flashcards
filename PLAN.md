# Cheaty Flashcards — Redesign Plan

Living plan document. Update checkboxes and add notes as phases land; don't delete completed items — future sessions (human or agent) should be able to read this top to bottom and know what happened and why.

**Keep this file terse.** It's re-read in full at the start of every session. Checklist items + a one-to-three sentence summary of what happened is enough. If a phase produced gotchas, design tradeoffs, or a war story worth preserving in detail, write it to `plan-notes/phase-N.md` and link it — don't inline it here. Only promote something out of a phase-notes file and into the "Known gotchas" section below if it's likely to bite a _future_ phase, not just explain the past one.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

Last updated: 2026-08-01 (Phase 8)

## Why this redesign

The app currently has no persistence — "levels" are just a URL convention the player has to remember, scoring doesn't map to anything intuitive, and the cheat mechanic (flash the correct answer for 1s, 5×/level) has no real cost. Goal: make the app privacy-respecting but genuinely adaptive to the player, give cheating real stakes, and modernize the deployment/PWA story — while staying a fully static, backend-free app.

Current implementation state is the code itself (README.md has the architecture overview) — this section is historical motivation, not a status report.

## Design decisions (settled)

- **No visible countdown/timer pressure.** Response time is still measured silently and feeds mastery scoring, but kids never see a ticking clock by default.
- **Fact-family-level mastery tracking**, not per-equation. Group by triple (e.g. {3,6,9} for +/−, {3,6,18} for ×/÷). Each family has a mastery stage (Leitner-box style, ~0–5). Correct+fast promotes; wrong, slow, or cheated-to answers demote or withhold promotion.
- **Adaptive question generation**: weighted sampling biased toward low-mastery families, with interleaved review of mastered ones. Replaces level-number-driven difficulty.
- **Players can target specific numbers** ("work on my 7s and 8s") — this is just a filter/seed on the same weighted pool the adaptive engine uses.
- **Mixed practice mode** pairs inverse operations (add/subtract, multiply/divide), matching how fact families are taught. Single-operator drilling stays available too.
- **Levels become milestones/badges**, decoupled from raw difficulty, which is now continuous and adaptive per player. (Superseded by Phase 8: level _numbers_ are retired entirely rather than just decoupled from difficulty — the player only picks an operator group, and a session is generated dynamically from their current curriculum/mastery state. Badges move from `sectionId + level`-keyed personal bests to session-outcome-based tracking.)
- **Cheat mechanic gets real stakes**: tiered hints (cheap = eliminate 2 wrong answers, expensive = reveal answer), cheat-free streaks earn visible rewards, and answers reached via cheat contribute little/no mastery progress for that fact. The old point-accumulation score is retired entirely.
- **Progress is local-only, no leaderboard.** Mastery data, streaks, badges, personal bests live in `localStorage` via Pinia + persistence plugin. Optional JSON export/import for backup or cross-device transfer — no server involved. If a player name is ever collected for personalized messages, it stays local, never transmitted.
- **Routing**: switch to `createWebHistory` (real SPA routing, no `#`). (Phase 8: route shape also simplifies to just two player-facing screens — `/` (home/progress) and `/play/:group` (`add`|`multiply`) — since a "level" is no longer a URL-addressable unit; a session is generated fresh each time from current mastery/curriculum state. The old per-level route's one legitimate use case, a shareable link to drill specific numbers, stays supported via `?focus=` on `/play/:group` instead. `/:section/:level` and the per-section level-list page are retired.)
- **Deploy target**: Cloudflare Workers static assets (not the legacy Pages dashboard flow), with SPA fallback configured for web history routing.
- **PWA**: installable, offline-capable via `vite-plugin-pwa`, since the app is fully static this is close to free.
- **Visual**: move off the default `cupcake` daisyUI theme to something more custom/kid-bright; light animation via CSS/daisyUI transitions + `canvas-confetti` for celebration moments rather than a full animation framework. (Phase 7: committed to a single custom theme rather than "fixing" light/dark — there was never a switcher UI, so light/dark was dead config, not a working feature to repair.)
- **Mascot/narrative**: "Ziggy the Fox" (Phase 7) — a sly trickster who personifies the cheat mechanic (hint tokens = asking Ziggy for a favor, a cheat-free streak = outfoxing him), woven through the mastery dashboard ("Ziggy's Den"), level-complete/streak-milestone celebrations, and the help modal. Chosen over a generic reskin because it reframes existing mechanics with a character rather than adding new UI surface.
- **Progressive curriculum** (Phase 8): fact families are introduced gradually per player, not all ~64 combinations at once — a small starter set per operator group, with new families unlocked automatically once the active set shows good mastery, plus an explicit opt-in "bonus fact" at session start if a player wants to move faster. Not-yet-introduced families simply don't appear anywhere in the UI (nothing to feel behind on).
- **Sessions replace fixed-length levels** (Phase 8): a play session ends early once it's shown a clean pass on everything it covered, lingers on/repeats missed facts if the player's struggling, and always has a hard time/question cap as a fallback so no one gets stuck grinding forever. Each session opens with an intro (what we're practicing, answers already shown, new facts highlighted) and closes with an outro (per-family recap, then replay/advance/home).
- **Ziggy speaks directly to the player** (Phase 9): first-person speech-bubble dialogue with a typewriter-style reveal, replacing third-person "about Ziggy" copy — kept to one purposeful appearance per moment rather than repeated static illustrations of him on the same screen.
- **Toolchain**: adopt **Vite+** (viteplus.dev), currently in beta from VoidZero (acquired by Cloudflare, June 2026). Chosen deliberately — both as a good architectural fit (unified runtime/package-manager/lint/test/build) and because the user wants hands-on familiarity with it. Vitest is Vite+'s test runner, so this also satisfies the testing requirement in one move. Beta risk is accepted; if it proves unstable, fallback is plain Vite 8 + Vitest 4 (functionally what Vite+ wraps anyway, so de-risking later is cheap).
- **Testing**: add tests as each phase lands, not as a bolt-on at the end. Unit tests for pure logic (mastery engine, question generation, utils), component tests (Vue Test Utils) for interactive pieces (cheat button, answer selection, level flow), keep it lightweight — no e2e layer unless it earns its keep later.

## Library changes

**Added so far:** `vite-plus` (replaces `vite`, adds `vp check`/`vp test`/`vp run`/`vp pack`; re-exports Vitest 4.x under `vite-plus/test`), `pinia` + `pinia-plugin-persistedstate`, `@vue/test-utils`, `playwright` (devDependency, kept permanently as of Phase 4 for manual real-browser verification — was previously added/removed per phase, which was just churn since every phase needs it), `wrangler` (Phase 5, deploy tooling — see `wrangler.jsonc`), `vite-plugin-pwa` (Phase 6, manifest + offline precaching — see `vite.config.ts`), `canvas-confetti` + `@types/canvas-confetti` (Phase 7, celebration bursts — see `src/confetti.ts`).

**Removed:** nothing yet — `howler`, `@unhead/vue`, `@fontsource-variable/fredoka`, daisyUI/Tailwind all stay.

**Deleted:** `src/components/SiteFooter.vue` was a dead placeholder — still pending; Phase 10 will delete it or repurpose it as the real footer. Phase 8 deleted `src/pages/SectionPage.vue`, `src/components/LevelLinks.vue` (per-operator level-list page, obsolete once sessions are dynamic), and `src/sections.ts`/`src/sections.test.ts` (the `Section`/level-shaped question generator — superseded by `src/session.ts` + `src/curriculum.ts`; not explicitly named in this list before landing, but a natural consequence of the same cleanup — see `plan-notes/phase-8.md`).

## Known gotchas

Things that already cost a session real time once. Check this before touching adjacent code.

- **`useHead()` must be called exactly once**, during a component's synchronous `setup()`, with a reactive ref for anything that changes later (e.g. `pageTitle`). Vue does not restore injection context for plain DOM event-listener callbacks, so calling `useHead()` again from a click handler throws and silently aborts the rest of that handler. (Found in Phase 3 — see `plan-notes/phase-3.md`.)
- **Pinia plugins registered via `pinia.use()`** only activate once the pinia instance is installed on a real Vue app (`app.use(pinia)`) — `setActivePinia(pinia)` alone is not enough. Persistence tests need a throwaway `createApp({}).use(pinia)` per simulated "reload". (Phase 1.)
- **Run tests with `NODE_OPTIONS=--no-experimental-webstorage`** (already baked into the `test` script) — Node 22+'s experimental global `localStorage` shadows jsdom's working one in Vitest 4.1 otherwise. (Phase 1.)
- **`vue-router` reuses the `PlayPage` instance** across param/query-only navigations on `/play/:group` (e.g. a `?focus=` change, or even `add` → `multiply` via manual URL edit / back-forward) — it does not remount. Query-driven state (like `?focus=`) is fine as a plain `computed`, but the `group` param itself is captured as a `computed` + an `immediate watch()` that re-runs intro setup on change — a plain `const` would go stale across an `add`→`multiply` reuse. This also affects manual browser verification: same-document hash navigations via `page.goto()` don't reload the document, so force a `page.reload()` between test navigations. (Phase 2; group-reactivity fix in Phase 8 — see `plan-notes/phase-8.md`.)
- **TypeScript is pinned to `^6.0.3`**, not `latest`/`7.x` — see README "Notes for future maintainers" for why (`vue-tsc` compatibility).

## Known pre-existing issues (not yet fixed, found during Phase 3 review)

- `chooseAnswer()`'s wrong-answer guard (`answerTypes.value[index] !== "wrong"`) lets a double-click during the 500ms transition-to-next-question window record a spurious extra `"wrong"` mastery attempt on top of the correct one.
- `revealAnswer()`'s 1s cleanup `setTimeout` is untracked/uncancellable (unlike `streakMilestoneTimeout`), so a rapid "Replay" during a reveal can clear the wrong question's highlight early.

Both are narrow races, carried over unchanged into `PlayPage.vue` (renamed from `LevelPage.vue` in Phase 8) — still worth fixing opportunistically if a future phase is already in that file.

## Phases

### Phase 0 — Vite+ & testing foundation — done (2026-07-19)

Migrated to Vite+ (`vp check`/`vp test`/`vp run`), added the first real unit test, wired commit hooks (`vp check --fix` on staged files). [Full detail](./plan-notes/phase-0.md) + pre-redesign baseline.

### Phase 1 — State & persistence foundation — done (2026-07-19)

Added Pinia + `pinia-plugin-persistedstate`; three stores (`settings`, `progress`, `mastery`) under `src/stores/`; moved cross-navigation state out of `LevelPage.vue`. [Full detail](./plan-notes/phase-1.md).

### Phase 2 — Adaptive mastery engine — done (2026-07-20)

Fact-family grouping + Leitner stages (`src/mastery.ts`), weighted adaptive sampling replacing level-driven difficulty, focus-number filter (`?focus=7,8`), mixed-operation practice mode (`?mixed=1`). [Full detail](./plan-notes/phase-2.md).

### Phase 3 — Cheat mechanic rework — done (2026-07-20)

Tiered hint-token budget (eliminate-2 costs 1, reveal costs 3) replacing the flat 5-hint counter; cheat-free streak tracking with milestone toasts; old point-accumulation score fully retired; component tests added. Also fixed a production-breaking pre-existing bug ("Try Again"/"Next Level" silently failing via `useHead()`). [Full detail](./plan-notes/phase-3.md), design notes, self-review findings.

### Phase 4 — Progress UI — done (2026-07-20)

Home page replaced with a mastery-first dashboard: per-group fact-family heatmaps, level-clear badges, best cheat-free streak, JSON export/import. Caught and fixed a real (not just test-theoretical) export bug via manual browser verification — see notes. [Full detail](./plan-notes/phase-4.md).

### Phase 5 — Routing & deployment migration — done (2026-07-20)

Switched `createWebHashHistory` → `createWebHistory`; new `wrangler.jsonc` (assets-only Worker) plus `pnpm deploy` script, `not_found_handling: "single-page-application"` for deep-link fallback now that routes are real paths. Vite+ has no dedicated Cloudflare deploy integration — plain `vp build` + `wrangler deploy` is the whole story. Verified with `wrangler deploy --dry-run` and a real-browser Playwright reload check on `vp preview`. [Full detail](./plan-notes/phase-5.md).

### Phase 6 — PWA — mostly done (2026-07-20), real-device check still open

`vite-plugin-pwa` (`generateSW`, `registerType: "autoUpdate"`) with manifest + offline precaching; new icon set rendered from scratch-built SVGs via macOS's `sips`. Explicit `workbox.navigateFallback` + widened `globPatterns` (added `woff2`/`mp3`) were required for real offline SPA-route + sound support. Verified via Playwright against `vp preview` and `wrangler deploy --dry-run`; installability/offline play **not yet confirmed on a real device** (none available that session) — treat "Add to Home Screen" as unconfirmed until checked for real. [Full detail](./plan-notes/phase-6.md).

### Phase 7 — Visual polish — done (2026-07-21)

New custom `ziggy` daisyUI theme (warm fox-den palette, one committed theme — no light/dark switcher ever existed, so nothing needed "fixing"); introduced "Ziggy the Fox" as a narrative mascot woven through hint tokens ("ask Ziggy"), cheat-free streaks ("outfox Ziggy"), and the mastery dashboard (reframed as "Ziggy's Den" with running commentary), not just a visual reskin; `canvas-confetti` bursts on level clears/new bests/streak milestones; new streak/mastery/badge sound cues synthesized via Web Audio API instead of adding more mp3 assets. [Full detail](./plan-notes/phase-7.md).

### Phase 8 — Adaptive sessions: retire "levels", introduce a progressive curriculum — done (2026-08-01)

Motivation (2026-07-21 planning session): the original level-numbered-route design existed to make a specific practice session shareable via URL, but now that mastery/progress live in `localStorage` per player, a "level" doesn't mean anything stable — it's not tied to difficulty (that's adaptive, Phase 2) or to what's actually been introduced to this player. The fix isn't a UI patch, it's removing the concept.

- [x] **Curriculum state**: per-player "active" fact-family set per operator group (introduced vs. not-yet-introduced), seeded with a small starter set, persisted (new store or extension of `mastery` store).
- [x] **Unlock logic**: pure function(s) that introduce the next fact family automatically once the active set shows good mastery, plus an explicit player opt-in ("bonus fact") at session start to add one early.
- [x] **Routing simplification**: `/play/:group` (`add`|`multiply`) replaces `/:section/:level`. `?focus=` carries over for shareable "practice my 7s and 8s" links. Delete `SectionPage.vue`/`LevelLinks.vue` (see Library changes).
- [x] **Session generator rework**: replace fixed `questionCount: 10` level generation with dynamic composition from the active curriculum; bias toward re-drilling facts missed earlier in _this_ session, not just long-run Leitner weighting; mixed inverse-operator practice becomes the default rather than an opt-in query param.
- [x] **Dynamic end-of-session conditions**: early celebratory finish once every family in the session has a clean pass; otherwise keep going (repeating misses) up to a hard cap (time and/or question count — see Open questions for exact numbers) so a struggling player still gets to stop.
- [x] **Session intro screen**: shows the fact families about to be practiced with answers already revealed (a teaching moment, not a quiz) via a new `FactFamilyShape` component, colored by mastery stage; highlights whatever's newly unlocked; offers the bonus-fact opt-in.
- [x] **Session outro screen**: per-family mastery-movement recap, then Replay (same set) / Advance (next/harder set) / Home — replacing the current "Try Again"/"Next Level" pair.
- [x] **Badge/milestone rework**: `milestones.ts`/`progress.ts`'s `sectionId + level`-keyed personal bests stop making sense once levels are gone. Replace with session-outcome-based badges; decide explicitly whether to migrate or drop existing localStorage progress data on this schema change (see Open questions).

Implementation landed largely as planned; one gap found along the way (not in the original checklist): the JSON export/import shape needed a `curriculum` field too, or backup/restore would silently drop unlocked-fact progress — added and tested. [Full detail](./plan-notes/phase-8.md).

### Phase 9 — Home page redesign & Ziggy as a speaking companion

Motivation: home page feedback from this planning session — a full 64-cell mastery grid reads as a wall of debt rather than progress, Ziggy appears four separate times on one page without a clear job each time, and 🔥/🦊/📦-style emoji sit awkwardly next to the app's actual Feather-icon language.

- [ ] **Home page becomes progress-plus-CTA**: replace the full heatmap with `FactFamilyShape` tiles for only the currently-active (introduced) families — a growing collection, not a wall of what's not mastered yet — plus one prominent "Play" button per operator group as the obvious next action.
- [ ] **`ZiggySpeaks` component**: mascot + speech bubble + typewriter-style visual reveal, replacing static third-person "about Ziggy" copy with first-person lines from Ziggy. Full text must be present in the DOM immediately (reveal is a visual overlay/mask, not incremental `textContent`) so screen readers get it right away and tests don't need to wait on animation timers; respects `prefers-reduced-motion` (skip straight to fully revealed).
- [ ] **Visual consistency pass**: fix the repeated-Ziggy and mixed-icon-language issues called out this session — each Ziggy appearance on a page should do a distinct job (header brand mark vs. the one place he's actually "talking"), and emoji in copy get replaced by Feather icons or dropped in favor of Ziggy's own presence carrying the "fox" identity.
- [ ] Revisit whether `/settings` is worth splitting into its own route yet (currently just a sound toggle in the header) — low priority unless this phase or Phase 8 adds more player-facing preferences.

### Phase 10 — About/Credits page

- [ ] Real `/about` route (not a modal) linking to barnabas.me
- [ ] Credits: Vue, Tailwind, daisyUI, Fredoka (Fontsource), Feather icons, Howler, canvas-confetti, sound asset sources (check licenses), Vite+, niece co-creation note
- [ ] Delete or repurpose the dead `SiteFooter.vue` as the real footer, linking to About

## Open questions / revisit later

- Exact Leitner stage count and promotion/demotion thresholds — start simple (0–5), tune based on how it feels in play.
- Whether "levels" as milestones need any UI presence at all, or whether the mastery dashboard alone is enough motivational structure. _(Superseded by Phase 8 — levels are going away outright; see the session-outcome badge question below instead.)_
- Vite+ is beta and evolving fast — re-check `viteplus.dev/guide/migrate` and `viteplus.dev/guide/upgrade` before each new phase in case the CLI surface has changed.
- **Phase 8 — curriculum seeding/unlock thresholds**: how many fact families to start a new player with, and exactly how much mastery on the active set (all at some stage? an average?) triggers auto-unlocking the next one. _(Answer: 4 starter families per group; unlock requires **every** active family at Leitner stage ≥3/5 with ≥3 attempts each — deliberately "all," not an average, so a weak family can't hide behind strong ones. Untested against real play yet; easy to retune, see `src/curriculum.ts`.)_
- **Phase 8 — session end-condition numbers**: what counts as "a clean pass" per family this session, and the hard-cap fallback values (rough starting guesses: ~3 minutes or ~20 questions, whichever first — needs to feel right in play, not just on paper). _(Answer: a (family, operator) permutation is "clean" once answered correctly without a hint (wrong guesses beforehand on that question don't disqualify it); a session ends once **every** target family's **both** operators are clean, not just one — first shipped as one operator per family, but that let an all-correct player end the session after just one question per family, so it was tightened to guarantee a real minimum length. Shipped the rough-guess hard cap as-is — 20 questions or 3 minutes, whichever first. See `src/session.ts`.)_
- **Phase 8 — `FactFamilyShape` visual design**: shape and layout (a triangle with the two factors + result at its points is the mental model to start from), and how add vs. multiply groups stay visually distinct. _(Answer: shipped as a CSS `clip-path` triangle — not SVG — so it reuses `dashboard.ts`'s existing `stageBgClass()` classes directly instead of a parallel color mapping; factors at the base corners, sum/product at the apex. Add vs. multiply distinction is currently just the displayed numbers, not a shape/color difference — worth revisiting in Phase 9's visual pass if the two groups read as too similar in practice.)_
- **Phase 8 — localStorage schema break**: `personalBests` keyed by `sectionId:level` becomes meaningless once levels are gone. Given the only real player right now is the niece this was built for, dropping old progress data on upgrade is probably fine. (Answer: it is fine, no migration necessary)
- **Phase 9 — `/settings` route**: worth it yet, or still just a header toggle?
