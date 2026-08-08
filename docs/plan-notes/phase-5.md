# Phase 5 — Routing & deployment migration — done (2026-07-20)

Full detail behind the one-line summary in PLAN.md.

- [x] `createWebHashHistory` → `createWebHistory` in `src/routes.ts` — a two-line change (import + `history:` option). No other code depended on the `#` — no manual `location.hash` reads, no analytics hook keyed off hash fragments.
- [x] Cloudflare Workers static-assets config — new `wrangler.jsonc` at repo root:
  ```jsonc
  {
    "$schema": "./node_modules/wrangler/config-schema.json",
    "name": "cheaty-flashcards",
    "compatibility_date": "2026-07-20",
    "assets": {
      "directory": "./dist",
      "not_found_handling": "single-page-application",
    },
  }
  ```
  No `main` field — this is an assets-only Worker, no Worker script. `not_found_handling: "single-page-application"` is what makes deep-link/reload URLs like `/add/3` resolve to `index.html` instead of 404ing, which is required now that routing is real paths instead of a hash fragment the server never sees. `wrangler` added as a devDependency (`pnpm add -D wrangler`, landed at 4.112.0).
- [x] Confirmed Vite+'s Cloudflare deploy support: **there isn't any dedicated integration** — checked `node_modules/vite-plus/docs` end to end (`guide/pack.md`, `config/pack.md`, and a repo-wide grep for "cloudflare"/"workers"/"wrangler", zero hits). `vp pack` is for publishing libraries/executables via tsdown, not relevant here. The actual deploy path is plain: `vp build` produces `dist/`, then `wrangler deploy` reads it via the `assets` block above. Added as `pnpm deploy` (`vp build && wrangler deploy`) in `package.json`.
- [x] README "Deployment" section added (didn't exist before — the old Pages-dashboard flow was pure clickops, nothing in-repo to document). Covers `pnpm deploy`, first-time `wrangler login`, what `not_found_handling` does and why it's needed now, and how to validate config changes safely (`wrangler deploy --dry-run` — reads the assets directory and reports what would upload without publishing). Also fixed the stale "hash history" line in the Tech Stack section.

## Verification

- `wrangler deploy --dry-run` (via `pnpm exec`, since `npx` chokes on this repo's `devEngines.packageManager` pnpm requirement) — successfully read all 12 files from `dist/`, reported upload size, no bindings, exited without publishing.
- `vp preview` already SPA-falls-back deep links on its own (confirmed `curl /add/3` → 200 with `index.html` body) — that's Vite's own preview server behavior, not something `wrangler.jsonc` provides locally. The `not_found_handling` config is what makes the _deployed_ Worker do the same.
- Real-browser Playwright check against `vp preview`: navigate home → `/add` → `/add/1` via in-app links, then `page.reload()` on `/add/1` — page reloads clean at the same URL with flashcard content present, confirming the SPA-fallback story holds for a real full-page navigation, not just Vite dev-server magic. Script was a scratch file, deleted after.

## Gotcha for future phases

`pnpm add -D wrangler` triggered pnpm's ignored-build-scripts gate for `workerd` (wrangler's bundled runtime binary) and `sharp` (optional, used for wrangler's image-transform features — not needed by this asset-only static site). Approving via `pnpm-workspace.yaml`'s `allowBuilds` block also auto-appended placeholder lines (`sharp: set this to true or false`, a duplicate `workerd:` line) into the file — had to hand-clean those before `pnpm install` would run the `workerd` postinstall cleanly. `workerd: true` is required (wrangler doesn't function without it); `sharp: false` since nothing in this app touches image transforms.
