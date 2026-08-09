<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import SessionIntro from "../components/play/SessionIntro.vue";
import SessionOutro from "../components/play/SessionOutro.vue";
import QuestionCard from "../components/play/QuestionCard.vue";
import CheatControls from "../components/play/CheatControls.vue";
import StreakToast from "../components/play/StreakToast.vue";
import SessionProgress from "../components/play/SessionProgress.vue";
import LeaveSessionModal from "../components/play/LeaveSessionModal.vue";
import { GROUP_LABELS, resolveTargetFamilies } from "../session";
import { usePlaySession } from "../composables/usePlaySession";
import { useLeaveConfirm } from "../composables/useLeaveConfirm";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { useCurriculumStore } from "../stores/curriculum";
import { FactFamily, OperatorGroup } from "../mastery";
import { nextFamilyToUnlock } from "../curriculum";

const props = defineProps<{
  group: string;
}>();
const router = useRouter();
const route = useRoute();
// vue-router reuses this component instance across param-only navigations
// (e.g. a manual URL edit or back/forward between two /play/:group visits),
// so `group` has to stay reactive to props.group rather than being captured
// once — see the watcher below, which re-runs intro setup on any change.
const group = computed<OperatorGroup | undefined>(() =>
  props.group === "add" || props.group === "multiply" ? props.group : undefined,
);

const progress = useProgressStore();
const mastery = useMasteryStore();
const streak = useStreakStore();
const curriculum = useCurriculumStore();

// useHead() must be called once, synchronously during setup — calling it
// again later from a click handler throws, since Vue doesn't restore
// injection context for plain event listener invocations. Passing a ref lets
// phase transitions update the title reactively instead.
const pageTitle = ref("");
useHead({ title: pageTitle });

const phase = ref<"intro" | "active" | "outro">("intro");
const highlightedKey = ref<string | null>(null);

const focusQuery = computed(() => (typeof route.query.focus === "string" ? route.query.focus : ""));
const focusNumbers = computed<number[] | undefined>(() => {
  const numbers = focusQuery.value
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
  return numbers.length > 0 ? numbers : undefined;
});

const targetFamilies = computed<FactFamily[]>(() =>
  resolveTargetFamilies(
    group.value ? curriculum.activeFamilies(group.value) : [],
    focusNumbers.value,
  ),
);
const bonusFamily = computed<FactFamily | undefined>(() =>
  group.value ? nextFamilyToUnlock(group.value, curriculum.active[group.value]) : undefined,
);
const personalBest = computed(() => (group.value ? progress.getBest(group.value) : undefined));

// Destructured so the template reads these as plain values rather than
// reaching through `session.x.value` everywhere.
const {
  currentQuestion,
  answerTypes,
  hintTokens,
  canEliminate,
  canReveal,
  streakMilestone,
  progressValue,
  progressMax,
  summary,
  isNewBest,
  families: sessionFamilies,
  stageBefore,
  begin,
  chooseAnswer,
  eliminateWrong,
  revealAnswer,
  onSessionEnd,
} = usePlaySession(group);

onSessionEnd(() => (phase.value = "outro"));

const {
  isRevealed: isLeaveRevealed,
  confirm: confirmLeave,
  cancel: cancelLeave,
} = useLeaveConfirm(() => phase.value === "active");

function enterIntro() {
  const g = group.value;
  if (!g) return;
  pageTitle.value = `${GROUP_LABELS[g]} - Practice`;
  curriculum.ensureSeeded(g);
  highlightedKey.value = curriculum.tryAutoUnlock(g, (key) => mastery.getFamily(key))?.key ?? null;
  phase.value = "intro";
}

watch(
  group,
  (g) => {
    if (g) {
      enterIntro();
    } else {
      router.push("/");
    }
  },
  { immediate: true },
);

function startSession() {
  begin(targetFamilies.value);
  phase.value = "active";
}

function addBonusFamily() {
  if (!group.value) return;
  const unlocked = curriculum.unlockBonus(group.value);
  if (unlocked) highlightedKey.value = unlocked.key;
}

function applyFocus(value: string) {
  if (!group.value) return;
  const trimmed = value.trim();
  router.push({
    path: `/play/${group.value}`,
    query: trimmed ? { focus: trimmed } : {},
  });
}
</script>
<template>
  <NavBreadcrumbs :group />
  <section v-if="group">
    <SessionIntro
      v-if="phase === 'intro'"
      :group
      :highlightedKey
      :bonusFamily
      :families="targetFamilies"
      :focus="focusQuery"
      @start="startSession()"
      @bonus="addBonusFamily()"
      @focus="applyFocus"
    />
    <SessionOutro
      v-else-if="phase === 'outro' && summary"
      :group
      :summary
      :personalBest
      :isNewBest
      :stageBefore
      :families="sessionFamilies"
      @replay="startSession()"
      @advance="enterIntro()"
      @home="router.push('/')"
    />
    <div v-else class="mt-4 flex flex-col gap-4 lg:gap-8 relative">
      <StreakToast :streak="streakMilestone" />
      <QuestionCard :answerTypes :question="currentQuestion" @choose="chooseAnswer" />
      <CheatControls
        :hintTokens
        :canEliminate
        :canReveal
        @eliminate="eliminateWrong()"
        @reveal="revealAnswer()"
      />
      <SessionProgress :streak="streak.current" :value="progressValue" :max="progressMax" />
    </div>
    <LeaveSessionModal v-if="isLeaveRevealed" @confirm="confirmLeave()" @cancel="cancelLeave()" />
  </section>
</template>
