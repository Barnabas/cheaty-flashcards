// One-off asset generation for Phase 9 (see PLAN.md). Not part of the app build.
// Usage: GEMINI_API_KEY=... node scripts/generate-ziggy-assets.mjs [asset-id ...]
//   No args = generate everything. Pass one or more asset ids to (re)generate a subset,
//   e.g. `node scripts/generate-ziggy-assets.mjs speaks-wink` to re-roll just one.
//
// The model can't output a real alpha channel (its image response format is jpeg-only),
// and asking it for a "transparent background" just makes it draw a checkerboard pattern
// as pixel content. So for cutout assets we instead ask for a flat chroma-key background
// and key it out to real alpha ourselves afterward, using pure-JS codecs (pngjs/jpeg-js —
// no `sharp`/native build, which this repo deliberately avoids; see pnpm-workspace.yaml).

import { GoogleGenAI } from "@google/genai";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REFERENCE_IMAGE = path.join(__dirname, "../reference/ziggy-character-sheet.png");
const OUT_DIR = path.join(__dirname, "../src/assets/ziggy");

const STYLE =
  `Match the attached Ziggy the Fox character reference sheet exactly: same face shape, ` +
  `orange fur with cream muzzle/chest/tail-tip, dark brown ear tips, thick expressive dark brown ` +
  `eyebrows, teal zip-up hoodie, mustard-yellow neckerchief. Warm painterly cartoon illustration ` +
  `style (Zootopia-ish), friendly and approachable, never mean or scary. Do not change the color ` +
  `palette, outfit, or proportions from the reference.`;

const CHROMA_KEY = [255, 0, 255]; // pure magenta — not present anywhere in Ziggy's palette
const CHROMA_BACKGROUND =
  `Background must be a single flat solid color, pure magenta ` +
  `(hex #FF00FF), perfectly uniform edge-to-edge with no gradient, no shadow, no texture, no ` +
  `vignette. This exact color will be chroma-keyed out programmatically afterward, so it must ` +
  `stay pure and unbroken right up to the edges of the character.`;

const SAFE_ZONE_BACKGROUND =
  `Background must be a single flat solid color, teal (hex #65c3c8), ` +
  `filling the entire square edge-to-edge with no gradient, no shadow, no texture — this is a ` +
  `maskable app icon, so the background must be fully opaque. Keep Ziggy centered and scaled ` +
  `to fit within the middle 70% of the frame (a safe zone that survives circular/rounded-square ` +
  `cropping by the OS).`;

const ASSETS = [
  {
    id: "brand-mark",
    file: "brand-mark",
    aspectRatio: "1:1",
    chromaKey: true,
    prompt:
      `${STYLE} Generate a small icon-style headshot of Ziggy: just head and shoulders, ` +
      `friendly neutral-to-slight-smile expression, facing forward, centered and tightly cropped ` +
      `so it reads clearly even at 32x32px. ${CHROMA_BACKGROUND}`,
  },
  {
    id: "speaks-neutral",
    file: "speaks-neutral",
    aspectRatio: "1:1",
    chromaKey: true,
    prompt:
      `${STYLE} Generate a bust/chest-up portrait of Ziggy mid-conversation: warm friendly ` +
      `open expression, slight forward lean as if talking to the viewer, one eyebrow slightly ` +
      `raised for personality. ${CHROMA_BACKGROUND}`,
  },
  {
    id: "speaks-wink",
    file: "speaks-wink",
    aspectRatio: "1:1",
    chromaKey: true,
    prompt:
      `${STYLE} Generate a bust/chest-up portrait of Ziggy winking playfully at the viewer, ` +
      `mischievous grin, same framing and crop as a head-and-shoulders talking portrait. ` +
      `${CHROMA_BACKGROUND}`,
  },
  {
    id: "speaks-gleeful",
    file: "speaks-gleeful",
    aspectRatio: "1:1",
    chromaKey: true,
    prompt:
      `${STYLE} Generate a bust/chest-up portrait of Ziggy gleeful and delighted, big open ` +
      `happy grin, eyes crinkled with joy, same framing and crop as a head-and-shoulders talking ` +
      `portrait. ${CHROMA_BACKGROUND}`,
  },
  {
    id: "hello-fullbody",
    file: "hello-fullbody",
    aspectRatio: "3:4",
    chromaKey: true,
    prompt:
      `${STYLE} Generate a full-body pose of Ziggy standing and waving hello with one paw ` +
      `raised, weight on one hip, big fluffy tail visible, welcoming friendly expression. ` +
      `${CHROMA_BACKGROUND}`,
  },
  {
    id: "icon-maskable",
    file: "icon-maskable",
    aspectRatio: "1:1",
    chromaKey: false,
    prompt:
      `${STYLE} Generate a small icon-style headshot of Ziggy: just head and shoulders, ` +
      `friendly neutral-to-slight-smile expression, facing forward. ${SAFE_ZONE_BACKGROUND}`,
  },
];

/** Distance-based chroma key with soft edges and simple spill suppression. */
function chromaKeyToAlpha(data, width, height, key, { inner = 90, outer = 200 } = {}) {
  const [kr, kg, kb] = key;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const dist = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
    const alpha = Math.max(0, Math.min(1, (dist - inner) / (outer - inner)));
    data[o + 3] = Math.round(alpha * 255);

    // Un-premultiply: edge pixels are a blend of the true foreground color and the key
    // color (pixel = fg*alpha + key*(1-alpha)), so recover fg by solving for it — a plain
    // "subtract some magenta" heuristic left a visible tinted halo since it didn't account
    // for how much key color was actually mixed in at each alpha level. Below ~0.15 alpha
    // the division blows up (dividing residual JPEG noise by a near-zero number produces
    // wildly out-of-range colors — invisible at true alpha=0, but a visible false-color
    // fringe in the thin band just above it) — those pixels keep their raw decoded color
    // instead, which is harmless since they're barely opaque anyway.
    if (alpha < 1 && alpha > 0.15) {
      const bleed = 1 - alpha;
      data[o] = Math.max(0, Math.min(255, (r - bleed * kr) / alpha));
      data[o + 1] = Math.max(0, Math.min(255, (g - bleed * kg) / alpha));
      data[o + 2] = Math.max(0, Math.min(255, (b - bleed * kb) / alpha));
    }
  }
  return data;
}

/** 3x3 box blur on the alpha channel only, to smooth JPEG-artifact noise at the cutout edge. */
function blurAlpha(data, width, height) {
  const src = Float64Array.from({ length: width * height }, (_, i) => data[i * 4 + 3]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          sum += src[ny * width + nx];
          count++;
        }
      }
      data[(y * width + x) * 4 + 3] = Math.round(sum / count);
    }
  }
}

function decodeToRgba(buffer, mimeType) {
  if (mimeType === "image/png") {
    const png = PNG.sync.read(buffer);
    return { data: png.data, width: png.width, height: png.height };
  }
  // Default to JPEG — that's what this model's image response format actually returns.
  const { data, width, height } = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true });
  return { data, width, height };
}

function cutoutToPng(buffer, mimeType) {
  const { data, width, height } = decodeToRgba(buffer, mimeType);
  chromaKeyToAlpha(data, width, height, CHROMA_KEY);
  blurAlpha(data, width, height);
  const png = new PNG({ width, height });
  png.data = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return PNG.sync.write(png);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Set GEMINI_API_KEY in your environment before running this script.");
    process.exit(1);
  }
  if (!fs.existsSync(REFERENCE_IMAGE)) {
    console.error(`Reference image not found at ${REFERENCE_IMAGE}.`);
    console.error("Copy the Ziggy character sheet PNG there first.");
    process.exit(1);
  }

  const requestedIds = process.argv.slice(2);
  const assets = requestedIds.length ? ASSETS.filter((a) => requestedIds.includes(a.id)) : ASSETS;
  if (requestedIds.length && assets.length !== requestedIds.length) {
    const known = ASSETS.map((a) => a.id).join(", ");
    console.error(`Unknown asset id in [${requestedIds.join(", ")}]. Known ids: ${known}`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ai = new GoogleGenAI({ apiKey });
  const referenceData = fs.readFileSync(REFERENCE_IMAGE).toString("base64");

  const failed = [];
  for (const asset of assets) {
    // The safety classifier on the prompt+reference-image combo is occasionally flaky —
    // one retry is often enough for a transient "prohibited content" 400 to clear.
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`Generating ${asset.id}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}...`);
      try {
        const interaction = await ai.interactions.create({
          model: "gemini-3.1-flash-lite-image",
          input: [
            { type: "text", text: asset.prompt },
            { type: "image", mime_type: "image/png", data: referenceData },
          ],
          response_format: {
            type: "image",
            aspect_ratio: asset.aspectRatio,
            image_size: "1K",
          },
        });

        const generatedImage = interaction.output_image;
        if (!generatedImage?.data) {
          throw new Error(`No image returned: ${JSON.stringify(interaction)}`);
        }
        const rawBuffer = Buffer.from(generatedImage.data, "base64");
        const outPath = path.join(OUT_DIR, `${asset.file}.png`);
        const pngBuffer = asset.chromaKey
          ? cutoutToPng(rawBuffer, generatedImage.mime_type)
          : cutoutToPngPassthrough(rawBuffer, generatedImage.mime_type);
        fs.writeFileSync(outPath, pngBuffer);
        console.log(`  Saved ${outPath}`);
        break;
      } catch (err) {
        console.error(`  ${asset.id} failed: ${err.message}`);
        if (attempt === 2) failed.push(asset.id);
      }
    }
  }

  if (failed.length) {
    console.error(`\nFailed after retry: ${failed.join(", ")}`);
    console.error(
      `Re-run just those with: node scripts/generate-ziggy-assets.mjs ${failed.join(" ")}`,
    );
    process.exitCode = 1;
  }
}

/** For non-cutout assets (opaque background by design) — just re-encode as PNG, no keying. */
function cutoutToPngPassthrough(buffer, mimeType) {
  const { data, width, height } = decodeToRgba(buffer, mimeType);
  const png = new PNG({ width, height });
  png.data = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return PNG.sync.write(png);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
