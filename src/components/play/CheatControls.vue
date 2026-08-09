<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconEliminate from "~icons/feather/eye-off";
import { computed } from "vue";
import ZiggyImage from "../mascot/ZiggyImage.vue";
import TokenCount from "../TokenCount.vue";
import { ELIMINATE_COST, REVEAL_COST } from "../../wallet";

const props = defineProps<{
  hintTokens: number;
  canEliminate: boolean;
  canReveal: boolean;
}>();

const emit = defineEmits<{
  eliminate: [];
  reveal: [];
}>();

// Running low is worth noticing before you're stuck with none — and since
// Phase 13 the wallet doesn't refill at the start of the next session either.
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
        Hide 2
        <TokenCount :count="ELIMINATE_COST" :label="`costs ${ELIMINATE_COST} tokens`" />
      </button>
      <button
        class="btn btn-accent tracking-wide"
        @click="emit('reveal')"
        :disabled="!canReveal"
        data-testid="reveal-button"
      >
        <IconHint />
        Show me the answer
        <TokenCount :count="REVEAL_COST" :label="`costs ${REVEAL_COST} tokens`" />
      </button>
    </div>
    <div class="flex items-center gap-2">
      <ZiggyImage pose="mark" class="w-8 h-8 shrink-0 rounded-full bg-base-200" />
      <TokenCount
        :count="hintTokens"
        :label="`${hintTokens} tokens to spend`"
        :class="tokenClass"
        class="text-lg"
        data-testid="hint-tokens"
      />
    </div>
  </div>
</template>
