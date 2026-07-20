<script lang="ts" setup>
import { computed } from "vue";
import OperatorGroupPanel from "../components/OperatorGroupPanel.vue";
import ProgressBackup from "../components/ProgressBackup.vue";
import { sections } from "../sections";
import { operatorGroup, OperatorGroup } from "../mastery";
import { useStreakStore } from "../stores/streak";

const streak = useStreakStore();

const groups = (["add", "multiply"] as OperatorGroup[]).map((group) => ({
  group,
  sections: sections.filter((s) => operatorGroup(s.operator) === group),
}));
const bestStreak = computed(() => streak.best);
</script>
<template>
  <section class="container mt-4 flex flex-col gap-8">
    <div v-if="bestStreak > 0" class="text-center text-lg" data-testid="best-streak">
      🔥 Best cheat-free streak: {{ bestStreak }}
    </div>
    <OperatorGroupPanel
      v-for="g in groups"
      :key="g.group"
      :group="g.group"
      :sections="g.sections"
    />
    <div class="card bg-base-100 shadow-md p-4">
      <h2 class="font-display text-lg font-bold mb-2">Backup progress</h2>
      <ProgressBackup />
    </div>
  </section>
</template>
