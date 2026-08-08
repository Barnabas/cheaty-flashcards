<script lang="ts" setup>
import { computed } from "vue";
import IconAward from "~icons/feather/award";
import OperatorGroupPanel from "../components/OperatorGroupPanel.vue";
import ProgressBackup from "../components/ProgressBackup.vue";
import ZiggySpeaks from "../components/mascot/ZiggySpeaks.vue";
import { OperatorGroup } from "../mastery";
import { homeGreeting, masterySummary } from "../dashboard";
import { useCurriculumStore } from "../stores/curriculum";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";

const streak = useStreakStore();
const curriculum = useCurriculumStore();
const mastery = useMasteryStore();

const groups: OperatorGroup[] = ["add", "multiply"];
// Seeded here as well as in the panels so the greeting — computed during this
// component's render, before any child has run setup() — sees the starter
// curriculum on a first-ever visit rather than an empty pool.
groups.forEach((group) => curriculum.ensureSeeded(group));

// Ziggy greets the player about their progress as a whole; per-group detail is
// the panels' job.
const overall = computed(() =>
  masterySummary(
    groups.flatMap((group) => curriculum.activeFamilies(group)),
    (key) => mastery.getFamily(key),
  ),
);
const greeting = computed(() => homeGreeting(overall.value));
const bestStreak = computed(() => streak.best);
</script>
<template>
  <section class="container mt-4 mb-8 flex flex-col gap-8">
    <ZiggySpeaks :pose="greeting.pose" :lines="greeting.lines" />
    <div v-if="bestStreak > 0" class="-mt-4 flex justify-center">
      <span class="badge badge-lg badge-accent gap-2" data-testid="best-streak">
        <IconAward class="w-4 h-4" />
        Best run without asking Ziggy: {{ bestStreak }} in a row
      </span>
    </div>
    <OperatorGroupPanel v-for="group in groups" :key="group" :group="group" />
    <div class="card bg-base-100 shadow-md p-4">
      <h2 class="font-display text-lg font-bold mb-2">Backup progress</h2>
      <ProgressBackup />
    </div>
  </section>
</template>
