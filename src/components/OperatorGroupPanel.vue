<script lang="ts" setup>
import { computed } from "vue";
import IconAward from "~icons/feather/award";
import MasteryGrid from "./MasteryGrid.vue";
import { useMasteryStore } from "../stores/mastery";
import { useProgressStore } from "../stores/progress";
import { OperatorGroup, familyPool } from "../mastery";
import { masterySummary } from "../dashboard";
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
    <h2 class="font-display text-xl font-bold">{{ title }}</h2>
    <div class="flex flex-wrap gap-6 items-start">
      <MasteryGrid :group="group" />
      <div class="text-sm" data-testid="mastery-summary">
        {{ summary.mastered }} / {{ summary.total }} facts mastered
        <span v-if="summary.started > summary.mastered">
          ({{ summary.started - summary.mastered }} in progress)
        </span>
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
