<script lang="ts" setup>
import { computed } from "vue";
import IconAward from "~icons/feather/award";
import IconPlay from "~icons/feather/play";
import FactFamilyShape from "./FactFamilyShape.vue";
import { useMasteryStore } from "../stores/mastery";
import { useProgressStore } from "../stores/progress";
import { useCurriculumStore } from "../stores/curriculum";
import { OperatorGroup } from "../mastery";
import { GROUP_LABELS } from "../session";
import { masterySummary } from "../dashboard";
import { hasClearedGroup } from "../milestones";
import { formatPercent } from "../utils";

const props = defineProps<{
  group: OperatorGroup;
}>();

const mastery = useMasteryStore();
const progress = useProgressStore();
const curriculum = useCurriculumStore();
// Seeds the starter curriculum on first visit, even before the player has
// ever pressed Play — so the tiles below show the starter set from the very
// first Home page view, not an empty row.
curriculum.ensureSeeded(props.group);

const title = computed(() => GROUP_LABELS[props.group]);
// Only the families the player has actually been introduced to. Phase 4's
// full 8x8 heatmap showed all 64 combinations at once, which read as a wall of
// debt on a fresh save; the curriculum already decides what's in play, so the
// home page shows exactly that and nothing more.
const families = computed(() => curriculum.activeFamilies(props.group));
const summary = computed(() => masterySummary(families.value, (key) => mastery.getFamily(key)));
const best = computed(() => progress.getBest(props.group));
const cleared = computed(() => hasClearedGroup(props.group, (g) => progress.getBest(g)));
</script>
<template>
  <div
    class="card bg-base-100 shadow-md p-4 flex flex-col gap-4"
    data-testid="operator-group-panel"
  >
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="font-display text-xl font-bold flex-1">{{ title }}</h2>
      <span v-if="cleared" class="badge badge-success gap-1" data-testid="session-badge">
        <IconAward class="w-4 h-4" />
        Best: {{ formatPercent(best!.percentCorrect) }}
      </span>
    </div>
    <div class="flex flex-wrap gap-4" data-testid="active-families">
      <FactFamilyShape
        v-for="family in families"
        :key="family.key"
        :family="family"
        :stage="mastery.getFamily(family.key).stage"
      />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="text-sm" data-testid="mastery-summary">
        {{ summary.mastered }} / {{ summary.total }} facts mastered
        <span v-if="summary.started > summary.mastered">
          ({{ summary.started - summary.mastered }} in progress)
        </span>
      </div>
      <RouterLink class="btn btn-primary btn-lg gap-2" :to="'/play/' + group">
        <IconPlay class="w-5 h-5" />
        Play
      </RouterLink>
    </div>
  </div>
</template>
