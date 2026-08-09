<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconEliminate from "~icons/feather/eye-off";
import { computed } from "vue";
import ZiggyImage from "../mascot/ZiggyImage.vue";
import { ELIMINATE_COST, REVEAL_COST } from "../../composables/useHintTokens";

const props = defineProps<{
  hintTokens: number;
  canEliminate: boolean;
  canReveal: boolean;
}>();

const emit = defineEmits<{
  eliminate: [];
  reveal: [];
}>();

// Running low on tokens is worth noticing before you're stuck with none.
const tokenClass = computed(() => ({
  "text-success": props.hintTokens >= REVEAL_COST,
  "text-warning": props.hintTokens >= ELIMINATE_COST && props.hintTokens < REVEAL_COST,
  "text-error": props.hintTokens < ELIMINATE_COST,
}));
</script>
<template>
  <div class="container flex flex-wrap justify-between items-center gap-2">
    <div class="flex flex-wrap gap-2">
      <button
        class="btn btn-secondary tracking-wide"
        @click="emit('eliminate')"
        :disabled="!canEliminate"
        data-testid="eliminate-button"
      >
        <IconEliminate />
        Ask Ziggy to hide 2 ({{ ELIMINATE_COST }})
      </button>
      <button
        class="btn btn-accent tracking-wide"
        @click="emit('reveal')"
        :disabled="!canReveal"
        data-testid="reveal-button"
      >
        <IconHint />
        Beg Ziggy to reveal it ({{ REVEAL_COST }})
      </button>
    </div>
    <div class="flex items-center gap-2">
      <ZiggyImage pose="mark" class="w-8 h-8 shrink-0 rounded-full bg-base-200" />
      <div class="flex gap-1 items-center" :class="tokenClass" data-testid="hint-tokens">
        <IconHint class="inline-block" v-for="_hint in hintTokens" />
      </div>
    </div>
  </div>
</template>
