<script lang="ts" setup>
import ZiggyImage from "../mascot/ZiggyImage.vue";

defineProps<{
  // null when there's no milestone to celebrate right now.
  streak: number | null;
}>();
</script>
<template>
  <div
    v-if="streak"
    class="toast toast-top toast-center z-10 animate-bounce"
    role="status"
    data-testid="streak-milestone"
  >
    <div class="alert alert-success shadow-lg">
      <ZiggyImage
        pose="gleeful"
        class="h-9 w-9 shrink-0 rounded-full bg-base-100"
        label="Ziggy, outfoxed"
      />
      <span>You outfoxed Ziggy! {{ streak }} cheat-free streak!</span>
    </div>
  </div>
</template>
