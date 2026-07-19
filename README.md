# Cheaty Flashcards

A single-page math flashcard game for kids. Pick a section (Addition,
Subtraction, Multiplication, Division), pick a level, and answer 10
multiple-choice arithmetic questions. There's a "Cheat" button that reveals
the correct answer a limited number of times per level, at the cost of
points — hence the name.

Live logic lives entirely client-side; there's no backend or persistence
layer. Progress and scores exist only for the duration of a level.

## Tech stack

- **Vue 3** (`<script setup>` SFCs) + **TypeScript**
- **Vite+** (`vite-plus`) as the toolchain — wraps Vite 8, runs tests via its
  bundled Vitest (`vite-plus/test`), and provides `vp check` for
  Oxc-based lint/format/type-check
- **vue-router 5** with hash history, for `/section` and `/section/level` routes
- **Tailwind CSS 4** + **daisyUI 5**, configured entirely via CSS (`src/style.css`)
  using `@import`/`@plugin`/`@theme` — there is no `tailwind.config.js` or
  `postcss.config.js` in Tailwind v4
- **unplugin-icons** for `~icons/feather/*` imports, backed by `@iconify-json/feather`
- **howler** for sound effects
- **@unhead/vue** for `<title>` management
- **vue-tsc** for type-checking `.vue` files during `pnpm build`

## Project structure

```
src/
  main.ts           entry point: creates the Vue app, head, router
  routes.ts         route table + a beam analytics pageview hook
  App.vue           root layout: header + <RouterView>
  types.ts          shared types (Section, Level, Question, ...)
  sections.ts        the 4 sections' data + generateLevel() question generator
  sounds.ts          Howler sound effect wrappers
  utils.ts           shuffle/format helpers + LevelMetrics (per-level scoring/timing)
  pages/
    HomePage.vue      lists all sections
    SectionPage.vue    lists the 8 levels for one section
    LevelPage.vue      the actual flashcard game + end-of-level summary
  components/
    SiteHeader.vue, SiteFooter.vue, NavBreadcrumbs.vue, LevelLinks.vue
  assets/sounds/     mp3 files played via howler
```

Routing is `/:section` and `/:section/:level`, with `section`/`level` passed
in as string props. Both `SectionPage.vue` and `LevelPage.vue` look up the
section by id via `sections.find(...)` (so it's typed `Section | undefined`)
and redirect to `/` if the id doesn't match a known section — this guards
against arbitrary/stale URLs.

## Development

```bash
pnpm install
pnpm dev       # start Vite dev server
pnpm build     # type-check (vue-tsc) + production build to dist/
pnpm preview   # preview the production build
pnpm test      # run the Vitest suite via `vp test`
pnpm check     # lint + format + type-check via `vp check`
```

This repo uses **pnpm** (see `pnpm-workspace.yaml`) with **Vite+** as the
toolchain runner — see `AGENTS.md` for a summary, or
`node_modules/vite-plus/docs` for the full reference. Tests live alongside
the source files they cover (`*.test.ts`), imported from `vite-plus/test`.

## Notes for future maintainers / AI agents

- **TypeScript is pinned to `^6.0.3`, not the `latest`/`7.x` line.**
  TypeScript 7 is a from-scratch native (Go-based) rewrite with a completely
  different package layout — it no longer exposes the classic
  `typescript/lib/tsc` entry point that `vue-tsc` (and most of the current
  Vue tooling) depends on. Installing `typescript@latest` will break
  `pnpm build` with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Keep TypeScript on the
  last classic-architecture 6.x release until `vue-tsc`/`@vue/language-core`
  ship native-TS-7 support, then re-evaluate.
- Tailwind v4 + daisyUI config lives in `src/style.css`, not in JS/CS config
  files. If you're looking for theme/plugin config, look there, not for a
  `tailwind.config.js`.
- `autoprefixer`/`postcss.config.js` were removed — Tailwind v4's Vite
  plugin (`@tailwindcss/vite`) handles CSS transforms itself.
- `generateLevel()` in `sections.ts` procedurally generates questions and
  wrong-answer distractors per operator; there's no static question bank.
- Levels 1–8 per section; level difficulty scales via `factorA = level + 1`.
