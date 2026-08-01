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
- **vue-router 5** with real (`history`) routing, for `/section` and `/section/level` routes —
  requires SPA fallback support from the host, see Deployment below
- **Tailwind CSS 4** + **daisyUI 5**, configured entirely via CSS (`src/style.css`)
  using `@import`/`@plugin`/`@theme` — there is no `tailwind.config.js` or
  `postcss.config.js` in Tailwind v4
- **unplugin-icons** for `~icons/feather/*` imports, backed by `@iconify-json/feather`
- **howler** for mp3 sound effects; a handful of newer event chimes (streak
  milestones, mastery-ups, new-best badges) are synthesized directly via the
  Web Audio API instead (`playChime()` in `sounds.ts`) rather than adding more
  binary assets
- **canvas-confetti** for celebration bursts (level clears, cheat-free streak
  milestones, new personal bests)
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

## Deployment

Deploys to **Cloudflare Workers** using [Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
— there's no Worker script, `wrangler.jsonc` just points at the `dist/`
build output:

```bash
pnpm deploy    # vp build, then wrangler deploy
```

The first deploy from a new machine needs `wrangler login` (or `CLOUDFLARE_API_TOKEN`
in CI) to authenticate. `wrangler.jsonc` sets `assets.not_found_handling` to
`single-page-application`, so unmatched navigation requests fall back to
`index.html` — required because the app uses real (non-hash) `vue-router`
history and routes like `/add/3` aren't real files. Verify a config change
without publishing via `pnpm exec wrangler deploy --dry-run`.

This replaces the old ad hoc Cloudflare Pages dashboard flow — there is no
Pages project for this app anymore, only a Workers one.

## PWA

The production build is installable and playable offline via
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (`generateSW` mode,
configured in `vite.config.ts`). `vp build` emits `dist/sw.js` +
`dist/manifest.webmanifest` alongside the usual assets, and `registerSW.js`
is auto-injected into `index.html`'s `<head>`.

- **Icons**: source SVGs live in `src/assets/icons/` (`icon.svg` for
  favicons/app icons, `icon-maskable.svg` — full-bleed background, content
  kept inside the safe zone — for Android adaptive/maskable icons). The
  actual PNGs served from `public/` (`pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon.png`, `favicon.ico` +
  `favicon-{16,32}x32.png`) are pre-rendered from those SVGs — macOS's
  built-in `sips -s format png file.svg --out out.png -Z <size>` rasterizes
  SVG directly, no ImageMagick/`sharp`/Node canvas dependency needed if you
  need to regenerate them.
- **Offline**: `workbox.navigateFallback: "/index.html"` is set explicitly —
  without it, `generateSW`'s default precache doesn't serve `index.html` for
  arbitrary client-side routes, so an offline deep-link/reload to e.g.
  `/add/3` would fail even though the shell is cached. `globPatterns` is
  widened beyond the workbox default to include `woff2` (Fredoka variable
  font files) and `mp3` (Howler sound effects) so the app is fully playable,
  sound and all, with no network.
- **Dev server**: the plugin only activates for production builds by
  default (`devOptions.enabled` is unset/false) — `vp dev` has no service
  worker, which avoids the classic "why isn't my change showing up" caching
  confusion during development. Test PWA behavior against `vp preview`
  (serves the real `dist/` build) instead.
- Verified manually: manifest resolves and validates, service worker
  activates, all icon URLs 200, and — via a scratch Playwright script
  toggling `context.setOffline(true)` — both a same-page offline reload and
  a fresh offline navigation to a previously-unvisited route (`/add/2`)
  render full app content instead of a network error.

## Visual identity

- **Theme**: a single custom daisyUI theme, `ziggy`, defined in `src/style.css`
  via daisyUI 5's CSS-first `@plugin "daisyui/theme"` syntax. There is no
  light/dark toggle — the app never had a UI control for one, so the old
  `light`/`dark`/`cupcake` trio (Phase 0–6) was dead config, not a real
  feature. One warm, kid-bright palette also keeps mascot art, confetti
  colors, and the PWA manifest's `theme_color`/`background_color` trivially
  in sync (all reference the same hex values by hand — see `vite.config.ts`
  and `index.html`).
- **Mascot**: "Ziggy the Fox", a sly trickster who personifies the cheat
  mechanic — hint tokens are framed as asking Ziggy for a favor, and a
  cheat-free streak is "outfoxing" him. Rendered as hand-coded flat SVG
  (`src/components/mascot/FoxMascot.vue`, `pose: "idle" | "sly" | "cheer"`),
  not an image asset, so it's crisp at any size and free in the bundle. Colors
  are literal hex matching the `ziggy` theme rather than `var(--color-*)` —
  SVG presentation attributes don't reliably resolve daisyUI's oklch custom
  properties across browsers.
- Confetti (`src/confetti.ts`) and the synthesized chimes above are the other
  half of the "make it feel like a game, not a worksheet" push — see
  `plan-notes/phase-7.md` for the full design reasoning.

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
