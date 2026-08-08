# Phase 6 — PWA — mostly done (2026-07-20), real-device check still open

Full detail behind the one-line summary in PLAN.md.

## What changed

- `pnpm add -D vite-plugin-pwa` (1.3.0) — peer-compatible with the Rolldown-based
  Vite 8 that Vite+ aliases `vite` to (checked `peerDependencies` before installing:
  `vite: ^3 || ^4 || ^5 || ^6 || ^7 || ^8`).
- `vite.config.ts` — added `VitePWA(...)` to the `lazyPlugins` array:
  - `registerType: "autoUpdate"` — no update-prompt UI exists in the app yet, and
    auto-update is the simpler default for a kids' app (no "new version available"
    dialog to build/localize). Revisit if Phase 7/8 ever wants a manual "refresh to
    update" affordance.
  - `manifest` — name/short_name "Cheaty Flashcards", `theme_color: "#65c3c8"` /
    `background_color: "#faf7f5"` matching the current (Phase-7-pending) daisyUI
    `cupcake` theme's `--color-primary` / `--color-base-100` (read directly from
    `node_modules/.../daisyui/theme/cupcake.css`, converted from oklch by eye —
    close enough for a manifest color, and moot once Phase 7 lands a new theme).
    `display: "standalone"`, `start_url`/`scope: "/"` (matches real Phase-5 routing).
  - `workbox.globPatterns` widened to
    `["**/*.{js,css,html,ico,png,svg,woff2,mp3,webmanifest}"]` — the workbox
    default (`js,css,html,ico,png,svg`) misses the Fredoka variable-font `.woff2`
    files and the Howler `.mp3` sound effects, both of which are real build
    outputs (`vp build` emits them into `dist/assets/`). Without this, offline
    play would silently lose the font and all sound effects.
  - `workbox.navigateFallback: "/index.html"` — **not** set by `generateSW` by
    default. Without it, the service worker precaches `index.html` as a
    same-URL cache entry but doesn't register a `NavigationRoute` for it, so an
    offline reload/deep-link to e.g. `/add/3` (a real path, not a real file,
    per Phase 5's `createWebHistory` switch) would 404 through the SW instead of
    falling back to the SPA shell. Confirmed the generated `dist/sw.js` contains
    `registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")))`
    only after adding this option.
- `index.html` — added `<meta name="theme-color">`, a `<meta name="description">`
  (manifest and SEO both benefit), and explicit favicon/apple-touch-icon `<link>`
  tags. `vite-plugin-pwa` auto-injects the `<link rel="manifest">` and the
  `registerSW.js` script tag at build time (confirmed in `dist/index.html` output)
  — those did **not** need to be added by hand.
- New icons in `public/`: `pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon.png` (180×180),
  `favicon.ico`, `favicon-32x32.png`, `favicon-16x16.png`.
- New source SVGs in `src/assets/icons/`: `icon.svg` (rounded-square card +
  "×" + a sparkle, nodding at the cheat mechanic) and `icon-maskable.svg`
  (same art, full-bleed square background, content shrunk to fit the
  maskable-icon safe zone — center ~80%-radius circle).

## Icon generation without an image toolchain

No `sharp`/ImageMagick/Inkscape/`cairosvg` available in this environment
(and `sharp` is explicitly `false` in `pnpm-workspace.yaml`'s `allowBuilds`
from Phase 5, since nothing else in the app needs image transforms). Found
that **macOS's built-in `sips`** can rasterize SVG directly despite only
listing `svg` as a _readable_, not writable, format:

```bash
sips -s format png icon.svg --out icon-512.png -Z 512
```

`-Z <n>` resamples to fit within an n×n box (use `-z <h> <w>` for exact
non-square dimensions). Text elements, `<path>` shapes, and fills all
rendered correctly — verified visually before committing to this approach.
`sips -s format ico favicon-32x32.png --out favicon.ico` handles the `.ico`
conversion too (`ico` is listed as `Writable`). No new tooling dependency
needed; this is worth remembering for any future icon/asset regeneration
since it's zero-install on any Mac.

## Verification

- `vp build` (via `pnpm build`, which runs `vue-tsc` first) — succeeds,
  emits `dist/sw.js` + `dist/workbox-*.js` + `dist/manifest.webmanifest`,
  reports "precache 28 entries (389.38 KiB)".
- `pnpm exec wrangler deploy --dry-run` — reads 23 files from `dist/`
  (icons/manifest/SW included) with no config changes needed on top of
  Phase 5's `wrangler.jsonc`; static-assets serving doesn't care what the
  files are, so PWA output rides the existing deploy path for free.
- Scratch Playwright script (`node verify-pwa.mjs`, deleted after — not
  committed) against `vp preview`:
  - `<link rel="manifest">` resolves, fetches 200, body matches configured
    manifest.
  - `navigator.serviceWorker.ready` resolves with `state: "activated"`.
  - All 5 icon URLs (`pwa-192`, `pwa-512`, `maskable-512`, apple-touch,
    favicon.ico) return 200 with correct `content-type`.
  - Navigated in-app to `/add`, then `context.setOffline(true)` + reload —
    page reloads clean at `/add` with full content, offline.
  - **Without leaving offline mode**, navigated directly to `/add/2` (a
    route never visited this session, so not individually precached) —
    resolved via the `NavigationRoute` fallback to the cached
    `index.html`, then client-side `vue-router` rendered the real level
    content offline. This is the scenario `navigateFallback` fixes; it's
    the meaningful proof the offline SPA story actually works, not just
    that a static shell loads.
- Not verified: real mobile-device install (Add to Home Screen) — no
  device was available this session. Manifest validity + icon
  sizes/purposes follow the standard installability checklist (192 + 512
  "any" icons, a separate 512 maskable icon, `display: standalone`,
  `start_url`/`scope` set), so it should pass Chrome's installability
  criteria, but treat this as unconfirmed until checked on a real
  Android/desktop Chrome install prompt.
- `pnpm check` (format + lint + type-check) and `pnpm test` (86 tests / 13
  files) both pass unchanged — this phase added no application logic, only
  build config and static assets.

## Gotchas for future phases

- If Phase 7's new daisyUI theme changes the primary/base colors, update
  `manifest.theme_color`/`background_color` in `vite.config.ts` (and the
  `<meta name="theme-color">` in `index.html`) to match — they're currently
  hand-set to Phase 6-era `cupcake` values and will go stale silently
  otherwise (no test catches a "wrong" but valid hex color).
- The service worker only builds/activates for production (`vp build` /
  `vp preview`), not `vp dev` — this is `vite-plugin-pwa`'s default
  (`devOptions.enabled` unset). Don't debug PWA/offline behavior against the
  dev server; use `vp preview`.
- Real device install/offline testing still needs to happen at some point
  (see "Not verified" above) — worth a quick check before or during Phase 8
  if a device is handy, rather than carrying it indefinitely as a gap.
