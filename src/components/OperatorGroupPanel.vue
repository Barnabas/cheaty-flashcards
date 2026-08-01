<script lang="ts" setup>
import { computed } from "vue";
import IconAward from "~icons/feather/award";
import MasteryGrid from "./MasteryGrid.vue";
import FoxMascot from "./mascot/FoxMascot.vue";
import { useMasteryStore } from "../stores/mastery";
import { useProgressStore } from "../stores/progress";
import { useCurriculumStore } from "../stores/curriculum";
import { OperatorGroup } from "../mastery";
import { GROUP_LABELS } from "../session";
import { masterySummary, denFlavor, denPose } from "../dashboard";
import { hasClearedGroup } from "../milestones";
import { formatPercent } from "../utils";

const props = defineProps<{
  group: OperatorGroup;
}>();

const mastery = useMasteryStore();
const progress = useProgressStore();
const curriculum = useCurriculumStore();
// Seeds the starter curriculum on first visit, even before the player has
// ever pressed Play — so the "X / Y facts mastered" summary reflects the
// starter set from the very first Home page view, not an empty pool.
curriculum.ensureSeeded(props.group);

const title = computed(() => GROUP_LABELS[props.group]);
const summary = computed(() =>
  masterySummary(curriculum.activeFamilies(props.group), (key) => mastery.getFamily(key)),
);
const flavor = computed(() => denFlavor(summary.value));
const pose = computed(() => denPose(summary.value));
const best = computed(() => progress.getBest(props.group));
const cleared = computed(() => hasClearedGroup(props.group, (g) => progress.getBest(g)));
</script>
<template>
  <div
    class="card bg-base-100 shadow-md p-4 flex flex-col gap-4"
    data-testid="operator-group-panel"
  >
    <div class="flex items-center gap-2">
      <FoxMascot :pose="pose" class="w-10 h-10 shrink-0" />
      <h2 class="font-display text-xl font-bold">{{ title }} — Ziggy's Den</h2>
    </div>
    <div class="flex flex-wrap gap-6 items-start">
      <MasteryGrid :group="group" />
      <div class="flex flex-col gap-1">
        <div class="text-sm" data-testid="mastery-summary">
          {{ summary.mastered }} / {{ summary.total }} facts mastered
          <span v-if="summary.started > summary.mastered">
            ({{ summary.started - summary.mastered }} in progress)
          </span>
        </div>
        <div class="text-sm italic text-base-content/70" data-testid="den-flavor">
          {{ flavor }}
        </div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <RouterLink class="btn btn-primary" :to="'/play/' + group">Play</RouterLink>
      <span v-if="cleared" class="badge badge-success gap-1" data-testid="session-badge">
        <IconAward class="w-4 h-4" />
        Best: {{ formatPercent(best!.percentCorrect) }}
      </span>
    </div>
  </div>
</template>
