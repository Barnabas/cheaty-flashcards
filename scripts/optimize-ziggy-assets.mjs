// Derives web-sized Ziggy assets from the 1024px generator output (Phase 9).
// Usage: node scripts/optimize-ziggy-assets.mjs  (or `pnpm optimize:ziggy`)
//
// `generate-ziggy-assets.mjs` writes 1024x1024 PNGs — ~800KB each, which is
// fine as a source of truth but far too heavy to import into the bundle and
// precache for offline PWA use. Only the derivatives in `web/` are imported
// by components; the source PNGs are never imported, so they cost nothing at
// build time. WebP with alpha at ~2x the largest on-screen size lands each
// one in the tens-of-KB range.

import sharp from "sharp";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "../src/assets/ziggy");
const OUT_DIR = path.join(SRC_DIR, "web");

// Widths are ~2x the largest place each asset is rendered: the speech-bubble
// portraits top out around 160px (home page hero), the brand mark around 48px
// (header logo, hint-token row, streak toast).
const DERIVATIVES = [
  { file: "speaks-neutral", width: 320 },
  { file: "speaks-wink", width: 320 },
  { file: "speaks-gleeful", width: 320 },
  { file: "brand-mark", width: 128 },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { file, width } of DERIVATIVES) {
  const src = path.join(SRC_DIR, `${file}.png`);
  const out = path.join(OUT_DIR, `${file}.webp`);
  await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`${path.relative(process.cwd(), out)} — ${width}px, ${kb}KB`);
}
