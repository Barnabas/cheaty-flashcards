# Cheaty Flashcards — Redesign Plan

Living plan document. Update checkboxes and add notes as phases land; don't delete completed items — future sessions (human or agent) should be able to read this top to bottom and know what happened and why.

**Keep this file terse.** It's re-read in full at the start of every session. Checklist items + a one-to-three sentence summary of what happened is enough. If a phase produced gotchas, design tradeoffs, or a war story worth preserving in detail, write it to `plan-notes/phase-N.md` and link it — don't inline it here. Only promote something out of a phase-notes file and into the "Known gotchas" section below if it's likely to bite a _future_ phase, not just explain the past one.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done

Last updated: 2026-07-20 (Phase 6)

## Why this redesign

The app currently has no persistence — "levels" are just a URL convention the player has to remember, scoring doesn't map to anything intuitive, and the cheat mechanic (flash the correct answer for 1s, 5×/level) has no real cost. Goal: make the app privacy-respecting but genuinely adaptive to the player, give cheating real stakes, and modernize the deployment/PWA story — while staying a fully static, backend-free app.

Current implementation state is the code itself (README.md has the architecture overview) — this section is historical motivation, not a status report.

## Design decisions (settled)

- **No visible countdown/timer pressure.** Response time is still measured silently and feeds mastery scoring, but kids never see a ticking clock by default.
- **Fact-family-level mastery tracking**, not per-equation. Group by triple (e.g. {3,6,9} for +/−, {3,6,18} for ×/÷). Each family has a mastery stage (Leitner-box style, ~0–5). Correct+fast promotes; wrong, slow, or cheated-to answers demote or withhold promotion.
- **Adaptive question generation**: weighted sampling biased toward low-mastery families, with interleaved review of mastered ones. Replaces level-number-driven difficulty.
- **Players can target specific numbers** ("work on my 7s and 8s") — this is just a filter/seed on the same weighted pool the adaptive engine uses.
- **Mixed practice mode** pairs inverse operations (add/subtract, multiply/divide), matching how fact families are taught. Single-operator drilling stays available too.
- **Levels become milestones/badges**, decoupled from raw difficulty, which is now continuous and adaptive per player.
- **Cheat mechanic gets real stakes**: tiered hints (cheap = eliminate 2 wrong answers, expensive = reveal answer), cheat-free streaks earn visible rewards, and answers reached via cheat contribute little/no mastery progress for that fact. The old point-accumulation score is retired entirely.
- **Progress is local-only, no leaderboard.** Mastery data, streaks, badges, personal bests live in `localStorage` via Pinia + persistence plugin. Optional JSON export/import for backup or cross-device transfer — no server involved. If a player name is ever collected for personalized messages, it stays local, never transmitted.
- **Routing**: switch to `createWebHistory` (real SPA routing, no `#`).
- **Deploy target**: Cloudflare Workers static assets (not the legacy Pages dashboard flow), with SPA fallback configured for web history routing.
- **PWA**: installable, offline-capable via `vite-plugin-pwa`, since the app is fully static this is close to free.
- **Visual**: move off the default `cupcake` daisyUI theme to something more custom/kid-bright; fix the currently-dead `light`/`dark` theme selection; light animation via CSS/daisyUI transitions + `canvas-confetti` for celebration moments rather than a full animation framework.
- **Toolchain**: adopt **Vite+** (viteplus.dev), currently in beta from VoidZero (acquired by Cloudflare, June 2026). Chosen deliberately — both as a good architectural fit (unified runtime/package-manager/lint/test/build) and because the user wants hands-on familiarity with it. Vitest is Vite+'s test runner, so this also satisfies the testing requirement in one move. Beta risk is accepted; if it proves unstable, fallback is plain Vite 8 + Vitest 4 (functionally what Vite+ wraps anyway, so de-risking later is cheap).
- **Testing**: add tests as each phase lands, not as a bolt-on at the end. Unit tests for pure logic (mastery engine, question generation, utils), component tests (Vue Test Utils) for interactive pieces (cheat button, answer selection, level flow), keep it lightweight — no e2e layer unless it earns its keep later.

## Library changes

**Added so far:** `vite-plus` (replaces `vite`, adds `vp check`/`vp test`/`vp run`/`vp pack`; re-exports Vitest 4.x under `vite-plus/test`), `pinia` + `pinia-plugin-persistedstate`, `@vue/test-utils`, `playwright` (devDependency, kept permanently as of Phase 4 for manual real-browser verification — was previously added/removed per phase, which was just churn since every phase needs it), `wrangler` (Phase 5, deploy tooling — see `wrangler.jsonc`), `vite-plugin-pwa` (Phase 6, manifest + offline precaching — see `vite.config.ts`).

**Not yet added:** `canvas-confetti` (+ `@types/canvas-confetti`) — planned for Phase 7.

**Removed:** nothing yet — `howler`, `@unhead/vue`, `@fontsource-variable/fredoka`, daisyUI/Tailwind all stay.

**Deleted:** `src/components/SiteFooter.vue` was a dead placeholder — still pending; Phase 8 will delete it or repurpose it as the real footer.

## Known gotchas

Things that already cost a session real time once. Check this before touching adjacent code.

- **`useHead()` must be called exactly once**, during a component's synchronous `setup()`, with a reactive ref for anything that changes later (e.g. `pageTitle`). Vue does not restore injection context for plain DOM event-listener callbacks, so calling `useHead()` again from a click handler throws and silently aborts the rest of that handler. (Found in Phase 3 — see `plan-notes/phase-3.md`.)
- **Pinia plugins registered via `pinia.use()`** only activate once the pinia instance is installed on a real Vue app (`app.use(pinia)`) — `setActivePinia(pinia)` alone is not enough. Persistence tests need a throwaway `createApp({}).use(pinia)` per simulated "reload". (Phase 1.)
- **Run tests with `NODE_OPTIONS=--no-experimental-webstorage`** (already baked into the `test` script) — Node 22+'s experimental global `localStorage` shadows jsdom's working one in Vitest 4.1 otherwise. (Phase 1.)
- **`vue-router` reuses the `LevelPage` instance** across param/query-only navigations (e.g. `/add/1` → `/add/2`) — it does not remount. Level regeneration relies on explicit `startLevel()` calls, not a route watcher. This also affects manual browser verification: same-document hash navigations via `page.goto()` don't reload the document, so force a `page.reload()` between test navigations. (Phase 2.)
- **TypeScript is pinned to `^6.0.3`**, not `latest`/`7.x` — see README "Notes for future maintainers" for why (`vue-tsc` compatibility).

## Known pre-existing issues (not yet fixed, found during Phase 3 review)

- `chooseAnswer()`'s wrong-answer guard (`answerTypes.value[index] !== "wrong"`) lets a double-click during the 500ms transition-to-next-question window record a spurious extra `"wrong"` mastery attempt on top of the correct one.
- `revealAnswer()`'s 1s cleanup `setTimeout` is untracked/uncancellable (unlike `streakMilestoneTimeout`), so a rapid "Try Again" during a reveal can clear the wrong question's highlight early.

Both are narrow races in `LevelPage.vue`, worth fixing opportunistically if a future phase is already in that file.

## Phases

### Phase 0 — Vite+ & testing foundation — done (2026-07-19)

Migrated to Vite+ (`vp check`/`vp test`/`vp run`), added the first real unit test, wired commit hooks (`vp check --fix` on staged files). Full detail + pre-redesign baseline: `plan-notes/phase-0.md`.

### Phase 1 — State & persistence foundation — done (2026-07-19)

Added Pinia + `pinia-plugin-persistedstate`; three stores (`settings`, `progress`, `mastery`) under `src/stores/`; moved cross-navigation state out of `LevelPage.vue`. Full detail: `plan-notes/phase-1.md`.

### Phase 2 — Adaptive mastery engine — done (2026-07-20)

Fact-family grouping + Leitner stages (`src/mastery.ts`), weighted adaptive sampling replacing level-driven difficulty, focus-number filter (`?focus=7,8`), mixed-operation practice mode (`?mixed=1`). Full detail: `plan-notes/phase-2.md`.

### Phase 3 — Cheat mechanic rework — done (2026-07-20)

Tiered hint-token budget (eliminate-2 costs 1, reveal costs 3) replacing the flat 5-hint counter; cheat-free streak tracking with milestone toasts; old point-accumulation score fully retired; component tests added. Also fixed a production-breaking pre-existing bug ("Try Again"/"Next Level" silently failing via `useHead()`). Full detail, design notes, self-review findings: `plan-notes/phase-3.md`.

### Phase 4 — Progress UI — done (2026-07-20)

Home page replaced with a mastery-first dashboard: per-group fact-family heatmaps, level-clear badges, best cheat-free streak, JSON export/import. Caught and fixed a real (not just test-theoretical) export bug via manual browser verification — see notes. Full detail: `plan-notes/phase-4.md`.

### Phase 5 — Routing & deployment migration — done (2026-07-20)

- [x] Switch `createWebHashHistory` → `createWebHistory`
- [x] Cloudflare Workers static-assets config (wrangler config, SPA fallback / `not_found_handling`) replacing the ad hoc Pages-dashboard flow
- [x] Confirm Vite+'s Cloudflare deploy support covers this cleanly
- [x] Update README deployment instructions

New `wrangler.jsonc` (assets-only Worker, no script) plus `pnpm deploy` script; `not_found_handling: "single-page-application"` handles deep-link fallback now that routes are real paths. Vite+ has no dedicated Cloudflare deploy integration — plain `vp build` + `wrangler deploy` is the whole story. Verified with `wrangler deploy --dry-run` and a real-browser Playwright reload check on `vp preview`. Full detail: `plan-notes/phase-5.md`.

### Phase 6 — PWA — mostly done (2026-07-20), real-device check still open

- [x] `vite-plugin-pwa` with manifest (icons, theme colors) + offline precaching
- [~] Verify installability and offline play on a real device — verified via Playwright browser automation (manifest validity, service-worker activation, offline reload, offline deep-link) against `vp preview`, **not** yet on an actual phone/tablet (none available this session). Meets Chrome's documented installability criteria on paper; treat "Add to Home Screen" as unconfirmed until checked for real.
- [x] Confirm interaction with Workers static-assets deploy (caching headers, service worker scope)

`generateSW` mode, `registerType: "autoUpdate"`. New icon set (`public/pwa-*.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`, `favicon.ico`/`favicon-*.png`) rendered from scratch-built source SVGs in `src/assets/icons/` via macOS's built-in `sips` SVG rasterizer — no image-processing dependency needed. Explicit `workbox.navigateFallback` + widened `globPatterns` (added `woff2`/`mp3`) were required for real offline SPA-route + sound support — the workbox defaults don't cover either out of the box. Verified via a scratch Playwright script against `vp preview` (manifest/service-worker/icons all resolve; offline reload and a fresh offline deep-link both render full content) and `wrangler deploy --dry-run` (icons/manifest/SW files upload cleanly through the existing Workers static-assets config from Phase 5, no changes needed there). Full detail: `plan-notes/phase-6.md`.

### Phase 7 — Visual polish

- [ ] New/custom daisyUI theme, fix dead `light`/`dark` theme selection (or commit to a single custom theme and drop the unused ones)
- [ ] `canvas-confetti` for celebration moments (level milestones, cheat-free streaks)
- [ ] Expanded sound cues for new events (streaks, mastery achieved, badges)

### Phase 8 — About/Credits page

- [ ] Real `/about` route (not a modal) linking to barnabas.me
- [ ] Credits: Vue, Tailwind, daisyUI, Fredoka (Fontsource), Feather icons, Howler, sound asset sources (check licenses), Vite+, niece co-creation note
- [ ] Delete or repurpose the dead `SiteFooter.vue` as the real footer, linking to About

## Open questions / revisit later

- Exact Leitner stage count and promotion/demotion thresholds — start simple (0–5), tune based on how it feels in play.
- Whether "levels" as milestones need any UI presence at all, or whether the mastery dashboard alone is enough motivational structure.
- Vite+ is beta and evolving fast — re-check `viteplus.dev/guide/migrate` and `viteplus.dev/guide/upgrade` before each new phase in case the CLI surface has changed.
