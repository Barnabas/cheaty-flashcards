<script lang="ts" setup>
import IconToken from "~icons/feather/zap";

// One visual unit for hint tokens wherever they appear — a price on a button,
// a line on Ziggy's menu, or what's in the player's pocket. There's only one
// currency in the game (docs/game-vision.md), so it only needs one look.
defineProps<{
  count: number;
  // Spelled out for screen readers, since the icon carries the "tokens" part
  // visually: "3 tokens to spend", "costs 5 tokens".
  label?: string;
}>();
</script>
<template>
  <span class="inline-flex items-center gap-0.5 font-bold whitespace-nowrap" :aria-label="label">
    <IconToken class="w-4 h-4 shrink-0" aria-hidden="true" />{{ count }}
  </span>
</template>
