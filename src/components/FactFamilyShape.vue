<script lang="ts" setup>
import { computed } from "vue";
import { FactFamily } from "../mastery";
import { stageBgClass } from "../dashboard";

const props = defineProps<{
  family: FactFamily;
  stage: number;
  highlight?: boolean;
}>();

const result = computed(() =>
  props.family.group === "add" ? props.family.a + props.family.b : props.family.a * props.family.b,
);
</script>
<template>
  <div class="relative w-20 h-20 shrink-0" data-testid="fact-family-shape">
    <div
      class="absolute inset-0"
      :class="[stageBgClass(stage), highlight ? 'ring-4 ring-secondary animate-pulse' : '']"
      style="clip-path: polygon(50% 4%, 96% 96%, 4% 96%)"
      :title="`${family.a} & ${family.b} = ${result} (stage ${stage}/5)`"
    />
    <span class="absolute top-1 inset-x-0 text-center text-lg font-bold font-display">
      {{ result }}
    </span>
    <span class="absolute bottom-2 left-3 text-base font-bold font-display">{{ family.a }}</span>
    <span class="absolute bottom-2 right-3 text-base font-bold font-display">{{ family.b }}</span>
    <div
      v-if="highlight"
      class="absolute -top-2 -right-2 badge badge-secondary badge-xs"
      data-testid="new-family-badge"
    >
      New!
    </div>
  </div>
</template>
