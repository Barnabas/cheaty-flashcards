<script lang="ts" setup>
// Ziggy the Fox — the game's mascot/narrative thread (Phase 7). Hand-coded
// flat SVG, no image assets, so it scales crisply and inlines free in the
// PWA bundle. Colors are literal hex matching the "ziggy" theme in
// style.css (not var(--color-*)) — SVG presentation attributes don't
// reliably pick up daisyUI's oklch custom properties across browsers, and
// the mascot should look the same regardless of prefers-color-scheme.
//
// Poses carry the app's narrative: "idle" is Ziggy just hanging around,
// "sly" is Ziggy offering a cheat (hint tokens), "cheer" is Ziggy hyped for
// a win — level clears, new bests, and getting outfoxed by a clean streak.
withDefaults(
  defineProps<{
    pose?: "idle" | "sly" | "cheer";
    label?: string;
  }>(),
  { pose: "idle", label: "" },
);
</script>
<template>
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <!-- tail peeking out behind the head -->
    <path d="M78 72 Q99 56 87 28 Q84 46 68 57 Z" fill="#f2711c" />
    <path
      d="M86 32 Q90 44 80 54"
      fill="none"
      stroke="#fff8f0"
      stroke-width="4"
      stroke-linecap="round"
    />

    <!-- ears -->
    <polygon points="20,28 32,4 41,32" fill="#f2711c" />
    <polygon points="24,26 31,13 36,28" fill="#3a2a1e" />
    <polygon points="80,28 68,4 59,32" fill="#f2711c" />
    <polygon points="76,26 69,13 64,28" fill="#3a2a1e" />

    <!-- head + muzzle -->
    <ellipse cx="50" cy="55" rx="34" ry="30" fill="#f2711c" />
    <ellipse cx="50" cy="66" rx="18" ry="14" fill="#fff8f0" />

    <!-- eyes -->
    <g v-if="pose === 'sly'">
      <circle cx="38" cy="52" r="4" fill="#3a2a1e" />
      <path
        d="M56 52 q6 -4 12 0"
        stroke="#3a2a1e"
        stroke-width="3"
        fill="none"
        stroke-linecap="round"
      />
    </g>
    <g v-else>
      <circle cx="38" cy="52" r="4" fill="#3a2a1e" />
      <circle cx="62" cy="52" r="4" fill="#3a2a1e" />
    </g>

    <!-- nose -->
    <polygon points="50,64 44,71 56,71" fill="#3a2a1e" />

    <!-- mouth -->
    <path v-if="pose === 'cheer'" d="M37 72 Q50 88 63 72 Q50 81 37 72 Z" fill="#3a2a1e" />
    <path
      v-else-if="pose === 'sly'"
      d="M40 74 Q50 81 65 70"
      stroke="#3a2a1e"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
    />
    <path
      v-else
      d="M40 74 Q50 80 60 74"
      stroke="#3a2a1e"
      stroke-width="3"
      fill="none"
      stroke-linecap="round"
    />

    <!-- celebration sparkles -->
    <g v-if="pose === 'cheer'" fill="#ffd23f">
      <path d="M12 18 L14 24 20 26 14 28 12 34 10 28 4 26 10 24 Z" />
      <path d="M88 64 L89.5 68.5 94 70 89.5 71.5 88 76 86.5 71.5 82 70 86.5 68.5 Z" />
    </g>
  </svg>
</template>
