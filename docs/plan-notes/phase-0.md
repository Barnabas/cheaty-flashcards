# Phase 0 — Vite+ & testing foundation — done (2026-07-19)

Full detail behind the one-line summary in PLAN.md. See PLAN.md for status key and how this file fits into the overall plan.

- [x] Confirm current versions satisfy `vp migrate` prerequisites (Vite 8+ already on `^8.1.5`; Vitest 4.1+ not installed yet, so likely a fresh `vp install` rather than a true migrate for the test side) — confirmed via `pnpm --package=vite-plus dlx vp migrate --help`; `vite-plus@0.2.5` (bundling Vitest 4.1.10) was the current release.
- [x] Run `vp migrate --no-interactive`, review the merged `vite.config.ts` (tsdown/vitest/lint-staged blocks), verify Vue plugin + Tailwind vite plugin + unplugin-icons still work post-migration — ran with `--no-hooks` first (hooks decided separately below). `vite.config.ts` gained `fmt`/`lint` blocks and wraps the existing `tailwindcss()`/`vue()`/`Icons()` plugins in `lazyPlugins(() => [...])` (Vite+'s convention so `vp check`/`vp lint`/`vp fmt` don't pay Vite's dev/build plugin cost). `package.json` moved `vite`/`vite-plus` to a pnpm `catalog:` entry (`pnpm-workspace.yaml`) aliasing `vite` to `@voidzero-dev/vite-plus-core`. Also generated `AGENTS.md` (agent instructions for the `vp` CLI) and `src/env.d.ts` (Vue SFC shim). No behavior changes to app code.
- [x] Wire up `vp check` (Oxc-based lint/format/typecheck) and confirm it plays reasonably with the existing `tsconfig.json` strict settings — passes clean (`vp check --fix` only reformatted whitespace/line width, no logic touched). No `tsconfig.json` changes were needed beyond what `vp migrate` itself applied.
- [x] Get `vp test` running with a trivial smoke test — added `src/sections.test.ts` (real assertions against the pure `getLevelName()` helper, not a placeholder). **Gotcha**: running via `pnpm dlx vite-plus` spawns an isolated copy of vitest, which conflicts with the `vitest` re-exported from `vite-plus/test` inside the test file (`Cannot read properties of undefined (reading 'config')`). Fix: always invoke the project's own `./node_modules/.bin/vp`, not `dlx`, once `vite-plus` is an installed dependency.
- [x] Update `package.json` scripts and README dev instructions accordingly — added `test`/`check` scripts (`vp test`/`vp check`); README tech stack + Development section updated to mention Vite+/Vitest.
- [x] Decide on commit hooks (`vp migrate` can set these up — evaluate vs. keeping it manual) — enabled. Ran `vp config --no-agent` (hooks only, agent files already current), which points `core.hooksPath` at `.vite-hooks/_` and adds a `staged: { "*": "vp check --fix" }` block to `vite.config.ts`. Rationale: solo hobby project, `vp check` runs in well under a second, so auto-fixing staged files on commit is free insurance with no team-coordination downside.

## Baseline this phase started from (pre-redesign, as of 2026-07-19)

- Vue 3.5 + TypeScript, Vite 8, Tailwind 4 + daisyUI 5, Howler for sound.
- Router: `vue-router` with **hash history** (`createWebHashHistory`).
- No state management library — all game state was local `ref`s in `src/pages/LevelPage.vue`.
- Question generation was procedural (`src/sections.ts` `generateLevel()`), purely a function of level number → bigger factors. No fact-family or mastery tracking of any kind.
- Cheat = flash correct answer for 1s, capped at 5/level, cost "+1 point" in a scoring system (lower-is-better, ticks up automatically every 2s) that wasn't explained anywhere visible and conflated cheating with wrong answers.
- No persistence — no localStorage/cookies/backend. Nothing survived a reload.
- No PWA (no manifest, no service worker).
- No dedicated About/Credits page (there was one once, removed — see git history `3f70638 remove about page`). There was a help modal in `SiteHeader.vue` instead.
- No tests, no CI config, no wrangler/Pages config in-repo.
- Dead code: `src/components/SiteFooter.vue` was unused.

This baseline is superseded by phases 0-3; kept here only for archaeology.
