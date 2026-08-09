# Architecture & tech stack

## Tech stack

- **Vue 3** (`<script setup>` SFCs) + **TypeScript**
- **Vite+** (`vite-plus`) as the toolchain — wraps Vite 8, runs tests via its bundled Vitest (`vite-plus/test`), and provides `vp check` for Oxc-based lint/format/type-check. See [toolchain.md](./toolchain.md).
- **vue-router 5** with real (`history`) routing — `/`, `/play/:group` (`add`|`multiply`) and `/about` are the only routes — requires SPA fallback support from the host, see [development.md](./development.md#deployment)
- **Tailwind CSS 4** + **daisyUI 5**, configured entirely via CSS (`src/style.css`) using `@import`/`@plugin`/`@theme` — there is no `tailwind.config.js` or `postcss.config.js` in Tailwind v4
- **unplugin-icons** for `~icons/feather/*` imports, backed by `@iconify-json/feather`
- **howler** for all 8 sound effects (gameplay cues plus streak/mastery/badge chimes), played via a single `playSound()` in `sounds.ts`
- **canvas-confetti** for celebration bursts (session clears, cheat-free streak milestones, new personal bests)
- **@unhead/vue** for `<title>` management
- **@vueuse/core** for composable plumbing — reach for it before hand-rolling timers, dialog state or lifecycle cleanup (`useTimeoutFn`, `refAutoReset`, `useConfirmDialog`, `createEventHook` are all in use)
- **vue-tsc** for type-checking `.vue` files during `pnpm build`

## Project structure

```
src/
  main.ts           entry point: creates the Vue app, head, router
  routes.ts         route table (/, /play/:group, /about)
  App.vue           root layout: header + <RouterView> + footer
  types.ts          shared types (Question, AnswerType, SessionSummary, ...)
  mastery.ts         fact-family model + Leitner mastery engine + weighted sampling
  curriculum.ts       progressive curriculum: starter set, unlock logic
  session.ts          buildQuestion() + dynamic session composition/end-conditions
  dashboard.ts        pure helpers for the home page (Ziggy's greeting copy, stage colors)
  milestones.ts        session-outcome badge threshold helper
  sounds.ts          Howler sound effect wrappers (playSound())
  utils.ts           shuffle/format helpers + SessionMetrics (per-session scoring/timing)
  stores/            Pinia stores: settings, mastery, curriculum, progress, streak
  composables/
    usePlaySession.ts   the session runtime: question queue, answer handling, end condition
    useHintTokens.ts    the cheat economy: token budget, eliminate/reveal, costs
    useLeaveConfirm.ts  route guard + confirm dialog for abandoning work in progress
  pages/
    HomePage.vue      Ziggy's greeting + per-group progress panels + Play entry points
    PlayPage.vue       intro/active/outro phase machine + route concerns; the screens
                       themselves live in components/play/
    AboutPage.vue      what it is, who made it, asset provenance, library credits
  components/
    SiteHeader.vue, SiteFooter.vue, NavBreadcrumbs.vue, FactFamilyShape.vue,
    OperatorGroupPanel.vue
    mascot/ZiggyImage.vue    the mascot art, pose -> asset
    mascot/ZiggySpeaks.vue   portrait + speech bubble + typewriter reveal
    play/SessionIntro.vue    what's on the table + start/bonus/focus controls
    play/SessionOutro.vue    score table, Ziggy's reaction, family recap, next actions
    play/QuestionCard.vue    the sum and its answer buttons
    play/CheatControls.vue   eliminate/reveal buttons + token counter
    play/StreakToast.vue, play/SessionProgress.vue, play/LeaveSessionModal.vue
  assets/sounds/     mp3 files played via howler
  assets/ziggy/      mascot source art (1024px PNG); web/ holds the small WebP
                     derivatives components actually import
```

Routing is `/`, `/play/:group` (`group` is `"add"` or `"multiply"`, passed in as a string prop) and `/about`. `PlayPage.vue` validates it against the two known groups and redirects to `/` otherwise — this guards against arbitrary/stale URLs. A session is generated fresh from the player's current curriculum/mastery state each time; there's no per-session URL (the one legitimate case for a shareable link — practicing specific numbers — is still supported via `?focus=7,8` on `/play/:group`). See [plan-notes/phase-8.md](./plan-notes/phase-8.md) for the full design.

See also: [maintainer-notes.md](./maintainer-notes.md) for gotchas specific to this codebase.
