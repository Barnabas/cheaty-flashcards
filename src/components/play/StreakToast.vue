<script lang="ts" setup>
import ZiggyImage from "../mascot/ZiggyImage.vue";
import TokenCount from "../TokenCount.vue";
import { StreakPayout } from "../../composables/usePlaySession";

defineProps<{
  // null when there's no milestone to celebrate right now.
  milestone: StreakPayout | null;
}>();
</script>
<template>
  <div
    v-if="milestone"
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
      <!-- The streak is what earns; a milestone that paid nothing only ever
           means the wallet is already full, which is worth saying out loud. -->
      <span class="flex items-center gap-1" v-if="milestone.tokens > 0">
        {{ milestone.streak }} in a row! Ziggy pays you
        <TokenCount
          :count="milestone.tokens"
          :label="`${milestone.tokens} tokens earned`"
          class="text-lg"
        />
      </span>
      <span v-else>{{ milestone.streak }} in a row! Your pockets are already full.</span>
    </div>
  </div>
</template>
