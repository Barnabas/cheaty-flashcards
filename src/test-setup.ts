// jsdom has no real canvas backend and logs a "Not implemented" warning to
// the console every time `getContext()` is called (see
// https://github.com/jsdom/jsdom?tab=readme-ov-file#canvas-support). This
// repo relies on that absence — `confetti.ts`'s `canvasSupported()` check —
// so stub it to fail the same way silently instead of adding a native
// `canvas` dependency just to quiet the noise.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = () => null;
}
