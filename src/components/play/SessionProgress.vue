<script lang="ts" setup>
import IconStreak from "~icons/feather/trending-up";

defineProps<{
  streak: number;
  value: number;
  max: number;
}>();
</script>
<template>
  <div class="container flex items-center gap-4">
    <div class="w-1/3">
      <span v-if="streak > 0" class="inline-flex items-center gap-1" data-testid="streak-count">
        <IconStreak class="w-4 h-4 shrink-0" />
        outfoxing Ziggy: {{ streak }} in a row
      </span>
    </div>
    <progress
      class="w-2/3 progress progress-primary"
      aria-label="Session progress"
      data-testid="session-progress"
      :value="value"
      :max="max"
    />
  </div>
</template>
