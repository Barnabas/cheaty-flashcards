<script lang="ts" setup>
import { computed } from "vue";
import IconAward from "~icons/feather/award";
import MasteryGrid from "./MasteryGrid.vue";
import FoxMascot from "./mascot/FoxMascot.vue";
import { useMasteryStore } from "../stores/mastery";
import { useProgressStore } from "../stores/progress";
import { OperatorGroup, familyPool } from "../mastery";
import { masterySummary, denFlavor, denPose } from "../dashboard";
import { highestClearedLevel } from "../milestones";
import { Section } from "../types";

const props = defineProps<{
  group: OperatorGroup;
  sections: Section[];
}>();

const mastery = useMasteryStore();
const progress = useProgressStore();
const MAX_LEVEL = 8;

const title = computed(() => props.sections.map((s) => s.name).join(" & "));
const summary = computed(() =>
  masterySummary(familyPool(props.group), (key) => mastery.getFamily(key)),
);
const flavor = computed(() => denFlavor(summary.value));
const pose = computed(() => denPose(summary.value));

function levelBadge(sectionId: string) {
  return highestClearedLevel(sectionId, MAX_LEVEL, (id, level) =>
    progress.getPersonalBest(id, level),
  );
}
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
    <div class="flex flex-wrap gap-4">
      <div v-for="section in sections" :key="section.id" class="flex items-center gap-2">
        <RouterLink class="btn btn-sm" :to="'/' + section.id">{{ section.name }}</RouterLink>
        <span
          v-if="levelBadge(section.id) > 0"
          class="badge badge-success gap-1"
          data-testid="level-badge"
        >
          <IconAward class="w-4 h-4" />
          Level {{ levelBadge(section.id) }}
        </span>
      </div>
    </div>
  </div>
</template>
