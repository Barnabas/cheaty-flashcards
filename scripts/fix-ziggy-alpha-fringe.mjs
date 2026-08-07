// One-off repair for the first batch of chroma-keyed Ziggy assets: the un-premultiply
// division in generate-ziggy-assets.mjs was numerically unstable near alpha=0, amplifying
// JPEG noise into a false green cast on partial-alpha edge pixels (invisible in the deep
// background where alpha truly is 0, but visible as a color fringe right at the cutout
// edge, where alpha is small-but-nonzero and so its color DOES contribute to compositing).
// Fixes it in place by recoloring only those partial-alpha pixels from nearby fully-opaque
// (trusted) neighbors, rather than the unstable formula. Run once; the generator script
// itself has already been fixed so future runs don't need this.

import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "../src/assets/ziggy");
const TARGETS = [
  "brand-mark.png",
  "speaks-neutral.png",
  "speaks-wink.png",
  "speaks-gleeful.png",
  "hello-fullbody.png",
];

function repair(file) {
  const filePath = path.join(DIR, file);
  const png = PNG.sync.read(fs.readFileSync(filePath));
  const { width, height, data } = png;
  let fixed = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const a = data[o + 3];
      if (a === 0 || a === 255) continue; // fully transparent (invisible) or already trusted

      // Search outward in growing rings for a fully-opaque neighbor to borrow color from.
      let found = null;
      for (let radius = 1; radius <= 8 && !found; radius++) {
        for (let dy = -radius; dy <= radius && !found; dy++) {
          for (let dx = -radius; dx <= radius && !found; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const no = (ny * width + nx) * 4;
            if (data[no + 3] === 255) found = [data[no], data[no + 1], data[no + 2]];
          }
        }
      }
      if (found) {
        data[o] = found[0];
        data[o + 1] = found[1];
        data[o + 2] = found[2];
        fixed++;
      }
    }
  }

  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log(`${file}: recolored ${fixed} partial-alpha edge pixels`);
}

for (const file of TARGETS) {
  const filePath = path.join(DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`${file}: not found, skipping`);
    continue;
  }
  repair(file);
}
