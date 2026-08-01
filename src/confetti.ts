import confetti from "canvas-confetti";

// Matches the "ziggy" daisyUI theme in style.css (primary/secondary/accent/
// success) — kept as literal hex here for the same reason as FoxMascot.vue:
// no dependency on CSS custom-property resolution inside a canvas context.
const THEME_COLORS = ["#f2711c", "#7c3aed", "#ffd23f", "#4ade80"];

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// canvas-confetti drives its animation loop straight off a 2D context with
// no feature-detection of its own — in an environment that has a <canvas>
// element but no working 2D context (jsdom in this repo's own test suite;
// conceivably some minimal WebViews), it throws from inside a rAF callback
// instead of failing at the call site. Skip up front rather than let that
// surface as an uncaught error.
function canvasSupported(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return !!document.createElement("canvas").getContext("2d");
  } catch {
    return false;
  }
}

function canCelebrate(): boolean {
  return !prefersReducedMotion() && canvasSupported();
}

// A modest burst for "nice!" moments — a cleared level, a cheat-free streak
// milestone. Deliberately smaller than celebrateBig() so a routine clear
// doesn't compete with the fanfare reserved for a genuine new best.
export function celebrate(originY = 0.3) {
  if (!canCelebrate()) return;
  void confetti({
    particleCount: 60,
    spread: 65,
    origin: { y: originY },
    colors: THEME_COLORS,
  });
}

// Two-burst fanfare for a new personal best.
export function celebrateBig() {
  if (!canCelebrate()) return;
  void confetti({ particleCount: 100, spread: 80, origin: { y: 0.3 }, colors: THEME_COLORS });
  setTimeout(() => {
    void confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 }, colors: THEME_COLORS });
  }, 200);
}
