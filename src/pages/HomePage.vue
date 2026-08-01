<script lang="ts" setup>
import { computed } from "vue";
import OperatorGroupPanel from "../components/OperatorGroupPanel.vue";
import ProgressBackup from "../components/ProgressBackup.vue";
import FoxMascot from "../components/mascot/FoxMascot.vue";
import { OperatorGroup } from "../mastery";
import { useStreakStore } from "../stores/streak";

const streak = useStreakStore();

const groups: OperatorGroup[] = ["add", "multiply"];
const bestStreak = computed(() => streak.best);
</script>
<template>
  <section class="container mt-4 flex flex-col gap-8">
    <div class="card bg-base-100 shadow-md p-4 flex flex-row items-center gap-4">
      <FoxMascot pose="sly" class="w-16 h-16 shrink-0" label="Ziggy the fox" />
      <div>
        <p class="font-display text-lg font-bold">
          Ziggy's lurking in the fact families below, offering shortcuts.
        </p>
        <p class="text-sm text-base-content/70">
          Every trick he offers costs you a hint token — the fewer you use, the more you outfox him.
        </p>
      </div>
    </div>
    <div v-if="bestStreak > 0" class="text-center text-lg" data-testid="best-streak">
      🦊 Best time you've outfoxed Ziggy: {{ bestStreak }} in a row
    </div>
    <OperatorGroupPanel v-for="group in groups" :key="group" :group="group" />
    <div class="card bg-base-100 shadow-md p-4">
      <h2 class="font-display text-lg font-bold mb-2">Backup progress</h2>
      <ProgressBackup />
    </div>
  </section>
</template>
