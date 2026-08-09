<script lang="ts" setup>
import IconRestart from "~icons/feather/repeat";
import IconNext from "~icons/feather/arrow-right";
import IconHome from "~icons/feather/home";
import { computed } from "vue";
import ZiggySpeaks from "../mascot/ZiggySpeaks.vue";
import FactFamilyShape from "../FactFamilyShape.vue";
import { GROUP_LABELS } from "../../session";
import { FactFamily, OperatorGroup } from "../../mastery";
import { SessionSummary, ZiggyPose } from "../../types";
import { SessionBest } from "../../stores/types";
import { useMasteryStore } from "../../stores/mastery";
import { formatPercent, formatTime } from "../../utils";
import { SESSION_CLEAR_THRESHOLD } from "../../milestones";

const props = defineProps<{
  group: OperatorGroup;
  summary: SessionSummary;
  personalBest?: SessionBest;
  isNewBest: boolean;
  families: FactFamily[];
  stageBefore: Record<string, number>;
}>();

const emit = defineEmits<{
  replay: [];
  advance: [];
  home: [];
}>();

const mastery = useMasteryStore();

const pose = computed<ZiggyPose>(() => {
  if (props.isNewBest || props.summary.percentCorrect >= SESSION_CLEAR_THRESHOLD) return "gleeful";
  // Below half right, Ziggy's still ahead — and enjoying it. The message
  // itself stays encouraging (see SessionMetrics.endSession).
  return props.summary.percentCorrect >= 0.5 ? "neutral" : "wink";
});
</script>
<template>
  <div class="mt-16 mx-4 max-w-2xl md:mx-auto" data-testid="session-summary">
    <div class="shadow-xl rounded-xl p-4 border-secondary overflow-clip border-2">
      <div class="flex items-center bg-secondary -mt-4 -mx-4 p-2">
        <div class="font-display font-medium text-center text-2xl flex-1">
          {{ GROUP_LABELS[group] }} Session Complete
        </div>
      </div>
      <table class="table table-lg table-fixed">
        <tbody>
          <tr>
            <td class="text-right font-bold">Score:</td>
            <td>{{ formatPercent(summary.percentCorrect) }}</td>
          </tr>
          <tr v-if="personalBest">
            <td class="text-right font-bold">Personal Best:</td>
            <td>
              {{ formatPercent(personalBest.percentCorrect) }}
              <span v-if="isNewBest" class="badge badge-success ml-2">New!</span>
            </td>
          </tr>
          <tr>
            <td class="text-right font-bold">Session Time:</td>
            <td>{{ formatTime(summary.sessionTime) }}</td>
          </tr>
          <tr>
            <td class="text-right font-bold">Time/question:</td>
            <td>
              {{ formatTime(summary.questionTimeAverage) }} average,
              {{ formatTime(summary.questionTimeMax) }} max
            </td>
          </tr>
        </tbody>
      </table>
      <ZiggySpeaks size="sm" class="p-2" :pose="pose" :lines="[summary.message]" />
      <div class="flex flex-wrap gap-4 p-2 justify-center" data-testid="family-recap">
        <div v-for="family in families" :key="family.key" class="flex flex-col items-center gap-1">
          <FactFamilyShape :family="family" :stage="mastery.getFamily(family.key).stage" />
          <span class="text-xs">
            {{ stageBefore[family.key] }} → {{ mastery.getFamily(family.key).stage }}
          </span>
        </div>
      </div>
      <div class="flex justify-between flex-wrap gap-2">
        <button class="btn" @click="emit('replay')" data-testid="replay-button">
          <IconRestart />
          Replay
        </button>
        <button class="btn btn-primary" @click="emit('advance')" data-testid="advance-button">
          <IconNext />
          Advance
        </button>
        <button class="btn" @click="emit('home')" data-testid="home-button">
          <IconHome />
          Home
        </button>
      </div>
    </div>
  </div>
</template>
