# Development, deployment & PWA

## Development

```bash
pnpm install
pnpm dev       # start Vite dev server
pnpm build     # type-check (vue-tsc) + production build to dist/
pnpm preview   # preview the production build
pnpm test      # run the Vitest suite via `vp test`
pnpm check     # lint + format + type-check via `vp check`
```

This repo uses **pnpm** (see `pnpm-workspace.yaml`) with **Vite+** as the toolchain runner — see [toolchain.md](./toolchain.md) for a summary, or `node_modules/vite-plus/docs` for the full reference. Tests live alongside the source files they cover (`*.test.ts`), imported from `vite-plus/test`.

## Deployment

Deploys to **Cloudflare Workers** using [Workers static assets](https://developers.cloudflare.com/workers/static-assets/) — there's no Worker script, `wrangler.jsonc` just points at the `dist/` build output:

```bash
pnpm deploy    # vp build, then wrangler deploy
```

The first deploy from a new machine needs `wrangler login` (or `CLOUDFLARE_API_TOKEN` in CI) to authenticate. `wrangler.jsonc` sets `assets.not_found_handling` to `single-page-application`, so unmatched navigation requests fall back to `index.html` — required because the app uses real (non-hash) `vue-router` history and routes like `/add/3` aren't real files. Verify a config change without publishing via `pnpm exec wrangler deploy --dry-run`.

This replaces the old ad hoc Cloudflare Pages dashboard flow — there is no Pages project for this app anymore, only a Workers one.

## PWA

The production build is installable and playable offline via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) (`generateSW` mode, configured in `vite.config.ts`). `vp build` emits `dist/sw.js` + `dist/manifest.webmanifest` alongside the usual assets, and `registerSW.js` is auto-injected into `index.html`'s `<head>`.

- **Icons**: source is now raster, not vector — `src/assets/ziggy/brand-mark.png` (transparent, used for the favicons + "any purpose" PWA icons) and `src/assets/ziggy/icon-maskable.png` (opaque teal background, Ziggy kept inside the safe zone — for Android adaptive/maskable icons and `apple-touch-icon`, since iOS doesn't handle transparency well). Both are AI-generated via `scripts/generate-ziggy-assets.mjs` (see that file and `reference/ziggy-character-sheet.png`). The actual PNGs served from `public/` (`pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`, `favicon.ico` + `favicon-{16,32}x32.png`) are resized from those two source images with macOS's built-in `sips -Z <size> file.png --out out.png` — no ImageMagick/`sharp`/Node canvas dependency needed if you need to regenerate them (`sips -s format ico favicon-32x32.png --out favicon.ico` handles the `.ico` conversion).
- **Mascot art**: `src/assets/ziggy/*.png` are the 1024px generator outputs and are never imported directly — `pnpm optimize:ziggy` (`scripts/optimize-ziggy-assets.mjs`, uses `sharp`) derives the small WebP files in `src/assets/ziggy/web/` that components import. Re-run it after regenerating any source art.
- **Offline**: `workbox.navigateFallback: "/index.html"` is set explicitly — without it, `generateSW`'s default precache doesn't serve `index.html` for arbitrary client-side routes, so an offline deep-link/reload to e.g. `/play/add` would fail even though the shell is cached. `globPatterns` is widened beyond the workbox default to include `woff2` (Fredoka variable font files), `mp3` (Howler sound effects) and `webp` (Ziggy mascot art) so the app is fully playable, sound and all, with no network. It's an explicit allowlist — a new asset type that isn't listed there silently won't be precached.
- **Dev server**: the plugin only activates for production builds by default (`devOptions.enabled` is unset/false) — `vp dev` has no service worker, which avoids the classic "why isn't my change showing up" caching confusion during development. Test PWA behavior against `vp preview` (serves the real `dist/` build) instead.
- Verified manually: manifest resolves and validates, service worker activates, all icon URLs 200, and — via a scratch Playwright script toggling `context.setOffline(true)` — both a same-page offline reload and a fresh offline navigation to a previously-unvisited route (`/play/multiply`) render full app content instead of a network error.
