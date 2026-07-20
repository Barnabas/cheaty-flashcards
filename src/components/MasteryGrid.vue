<script lang="ts" setup>
import { computed } from "vue";
import { useMasteryStore } from "../stores/mastery";
import {
  MAX_FACTOR,
  MIN_FACTOR,
  OperatorGroup,
  factFamilyKey,
  operatorsForGroup,
} from "../mastery";
import { stageBgClass } from "../dashboard";

const props = defineProps<{
  group: OperatorGroup;
}>();

const mastery = useMasteryStore();
const factors = Array.from({ length: MAX_FACTOR - MIN_FACTOR + 1 }, (_, i) => MIN_FACTOR + i);
// A × b (or a + b) for the cell's tooltip — the group's "forward" operator,
// not whichever inverse a mixed-practice session might have used.
const symbol = operatorsForGroup(props.group)[0];

function combine(a: number, b: number) {
  return props.group === "add" ? a + b : a * b;
}

function stage(a: number, b: number) {
  return mastery.getFamily(factFamilyKey(props.group, a, b)).stage;
}

const cells = computed(() =>
  factors.map((a) => factors.map((b) => ({ a, b, stage: stage(a, b), value: combine(a, b) }))),
);
</script>
<template>
  <div class="inline-block" role="grid" :aria-label="`Fact family mastery grid for ${symbol}`">
    <div class="flex">
      <div class="w-6 h-6 md:w-8 md:h-8" />
      <div
        v-for="b in factors"
        :key="'head-' + b"
        class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs font-bold"
      >
        {{ b }}
      </div>
    </div>
    <div v-for="row in cells" :key="'row-' + row[0].a" class="flex">
      <div class="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs font-bold">
        {{ row[0].a }}
      </div>
      <div
        v-for="cell in row"
        :key="cell.a + ',' + cell.b"
        class="w-6 h-6 md:w-8 md:h-8 rounded-sm"
        :class="stageBgClass(cell.stage)"
        :data-stage="cell.stage"
        data-testid="mastery-cell"
        :title="`${cell.a} ${symbol} ${cell.b} = ${cell.value} (stage ${cell.stage}/5)`"
      />
    </div>
  </div>
</template>
