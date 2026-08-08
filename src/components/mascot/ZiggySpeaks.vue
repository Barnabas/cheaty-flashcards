<script lang="ts" setup>
// Ziggy talking to the player in first person (Phase 9), replacing the
// third-person "here's some copy *about* Ziggy" blocks of Phase 7.
//
// The typewriter reveal is deliberately *not* an incremental textContent
// update: every character is in the DOM from the first frame and only its
// opacity is animated, staggered by a per-character CSS animation-delay. That
// keeps the full sentence available to screen readers and assertable in tests
// without waiting on timers, and means an interrupted/backgrounded animation
// can never leave a half-written sentence behind. The base (un-animated)
// state is fully visible and the keyframes fill `backwards`, so anything that
// suppresses the animation — reduced-motion, a browser that skips it, jsdom —
// degrades to plain text rather than invisible text.
import { computed } from "vue";
import ZiggyImage from "./ZiggyImage.vue";
import { ZiggyPose } from "../../types";

const props = withDefaults(
  defineProps<{
    // One paragraph per entry. Ziggy's lines are short by design — this is a
    // speech bubble, not a help page.
    lines: string[];
    pose?: ZiggyPose;
    size?: "sm" | "md";
  }>(),
  { pose: "neutral", size: "md" },
);

// Per-character delay, capped so a long line still finishes promptly — a kid
// waiting on a slow crawl before they can press Play is a worse outcome than
// a slightly hurried reveal.
const CHAR_DELAY_MS = 26;
const MAX_REVEAL_MS = 1800;

const totalChars = computed(() => props.lines.reduce((sum, line) => sum + line.length, 0));
const stepMs = computed(() =>
  Math.min(CHAR_DELAY_MS, MAX_REVEAL_MS / Math.max(1, totalChars.value)),
);

// Delays accumulate across paragraphs so the reveal reads as one continuous
// sentence-by-sentence crawl rather than every paragraph starting at once.
const paragraphs = computed(() => {
  let charIndex = 0;
  return props.lines.map((line, index) => ({
    key: `${index}:${line}`,
    chars: [...line].map((char) => ({ char, delay: Math.round(charIndex++ * stepMs.value) })),
  }));
});
</script>
<template>
  <div class="chat chat-start" data-testid="ziggy-speaks">
    <!-- daisyUI bottom-aligns the avatar against the bubble; with a multi-line
         speech that leaves Ziggy hanging off the bottom corner, so pin him to
         the top of whatever he's saying instead. -->
    <div class="chat-image avatar self-start">
      <div
        class="rounded-full bg-base-200 ring-2 ring-primary/30"
        :class="size === 'sm' ? 'w-12' : 'w-20 md:w-28'"
      >
        <ZiggyImage :pose="pose" class="w-full h-full" />
      </div>
    </div>
    <div
      class="chat-bubble font-display max-w-prose"
      :class="size === 'sm' ? 'text-sm' : 'text-base md:text-lg'"
    >
      <p v-for="paragraph in paragraphs" :key="paragraph.key" class="mt-2 first:mt-0">
        <span
          v-for="(entry, index) in paragraph.chars"
          :key="index"
          class="ziggy-char"
          :style="{ animationDelay: entry.delay + 'ms' }"
          >{{ entry.char }}</span
        >
      </p>
    </div>
  </div>
</template>
<style scoped>
.ziggy-char {
  animation: ziggy-type 160ms ease-out backwards;
}

@keyframes ziggy-type {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ziggy-char {
    animation: none;
  }
}
</style>
