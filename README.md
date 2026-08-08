# Cheaty Flashcards

A single-page math flashcard game for kids. Pick a group (Addition &
Subtraction, or Multiplication & Division) and practice a dynamically
generated session of multiple-choice arithmetic questions, drawn from a
per-player fact-family curriculum that unlocks gradually as mastery builds.
There's a hint-token budget that lets you "ask Ziggy" to eliminate wrong
answers or reveal the correct one — at the cost of mastery credit for that
fact — hence the name.

Live logic lives entirely client-side; there's no backend. Mastery,
curriculum progress, and session bests persist locally via Pinia +
`localStorage` (see `plan-notes/phase-1.md`), with optional JSON export/import
for backup.

## Tech stack

- **Vue 3** (`<script setup>` SFCs) + **TypeScript**
- **Vite+** (`vite-plus`) as the toolchain — wraps Vite 8, runs tests via its
  bundled Vitest (`vite-plus/test`), and provides `vp check` for
  Oxc-based lint/format/type-check
- **vue-router 5** with real (`history`) routing — `/` and `/play/:group`
  (`add`|`multiply`) are the only two player-facing routes — requires SPA
  fallback support from the host, see Deployment below
- **Tailwind CSS 4** + **daisyUI 5**, configured entirely via CSS (`src/style.css`)
  using `@import`/`@plugin`/`@theme` — there is no `tailwind.config.js` or
  `postcss.config.js` in Tailwind v4
- **unplugin-icons** for `~icons/feather/*` imports, backed by `@iconify-json/feather`
- **howler** for all 8 sound effects (gameplay cues plus streak/mastery/badge
  chimes), played via a single `playSound()` in `sounds.ts`
- **canvas-confetti** for celebration bursts (session clears, cheat-free streak
  milestones, new personal bests)
- **@unhead/vue** for `<title>` management
- **vue-tsc** for type-checking `.vue` files during `pnpm build`

## Project structure

```
src/
  main.ts           entry point: creates the Vue app, head, router
  routes.ts         route table (/ and /play/:group)
  App.vue           root layout: header + <RouterView>
  types.ts          shared types (Question, AnswerType, SessionSummary, ...)
  mastery.ts         fact-family model + Leitner mastery engine + weighted sampling
  curriculum.ts       progressive curriculum: starter set, unlock logic
  session.ts          buildQuestion() + dynamic session composition/end-conditions
  dashboard.ts        pure helpers for the mastery dashboard (Ziggy's Den copy, colors)
  milestones.ts        session-outcome badge threshold helper
  sounds.ts          Howler sound effect wrappers (playSound())
  utils.ts           shuffle/format helpers + SessionMetrics (per-session scoring/timing)
  stores/            Pinia stores: settings, mastery, curriculum, progress, streak
  pages/
    HomePage.vue      per-group mastery dashboard + Play entry points
    PlayPage.vue       intro (curriculum preview) / active (quiz) / outro (recap) session flow
  components/
    SiteHeader.vue, SiteFooter.vue, NavBreadcrumbs.vue, FactFamilyShape.vue,
    OperatorGroupPanel.vue, MasteryGrid.vue
  assets/sounds/     mp3 files played via howler
```

Routing is just `/` and `/play/:group` (`group` is `"add"` or `"multiply"`),
with `group` passed in as a string prop. `PlayPage.vue` validates it against
the two known groups and redirects to `/` otherwise — this guards against
arbitrary/stale URLs. A session is generated fresh from the player's current
curriculum/mastery state each time; there's no per-session URL (the one
legitimate case for a shareable link — practicing specific numbers — is still
supported via `?focus=7,8` on `/play/:group`). See `plan-notes/phase-8.md`
for the full design.

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

- **Icons**: source is now raster, not vector — `src/assets/ziggy/brand-mark.png`
  (transparent, used for the favicons + "any purpose" PWA icons) and
  `src/assets/ziggy/icon-maskable.png` (opaque teal background, Ziggy kept
  inside the safe zone — for Android adaptive/maskable icons and
  `apple-touch-icon`, since iOS doesn't handle transparency well). Both are
  AI-generated via `scripts/generate-ziggy-assets.mjs` (see that file and
  `reference/ziggy-character-sheet.png`). The actual PNGs served from
  `public/` (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`,
  `apple-touch-icon.png`, `favicon.ico` + `favicon-{16,32}x32.png`) are
  resized from those two source images with macOS's built-in
  `sips -Z <size> file.png --out out.png` — no ImageMagick/`sharp`/Node
  canvas dependency needed if you need to regenerate them (`sips -s format
ico favicon-32x32.png --out favicon.ico` handles the `.ico` conversion).
- **Offline**: `workbox.navigateFallback: "/index.html"` is set explicitly —
  without it, `generateSW`'s default precache doesn't serve `index.html` for
  arbitrary client-side routes, so an offline deep-link/reload to e.g.
  `/play/add` would fail even though the shell is cached. `globPatterns` is
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
  a fresh offline navigation to a previously-unvisited route (`/play/multiply`)
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
- `buildQuestion()` in `session.ts` procedurally generates questions and
  wrong-answer distractors per operator; there's no static question bank.
- No fixed level count or difficulty scale — a session's fact-family mix is
  adaptive (weighted toward low-mastery families, `mastery.ts`) and scoped to
  whatever's currently unlocked in the player's curriculum (`curriculum.ts`).
