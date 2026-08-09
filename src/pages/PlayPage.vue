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
import ZiggyReveal from "../components/play/ZiggyReveal.vue";
import SessionProgress from "../components/play/SessionProgress.vue";
import LeaveSessionModal from "../components/play/LeaveSessionModal.vue";
import { GROUP_LABELS, resolveTargetFamilies, selectTable } from "../session";
import { usePlaySession } from "../composables/usePlaySession";
import { useLeaveConfirm } from "../composables/useLeaveConfirm";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { useCurriculumStore } from "../stores/curriculum";
import { useWalletStore } from "../stores/wallet";
import { FactFamily, OperatorGroup } from "../mastery";
import { nextFamilyToUnlock } from "../curriculum";
import { NEW_CARD_COST } from "../wallet";
import { playSound } from "../sounds";

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
const wallet = useWalletStore();

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

// Everything the player currently has in play, which the session then seats a
// table out of — deliberately not the session's target set any more.
const sessionPool = computed<FactFamily[]>(() =>
  resolveTargetFamilies(
    group.value ? curriculum.activeFamilies(group.value) : [],
    focusNumbers.value,
  ),
);
// Today's table: a ref rather than a computed, because seating draws on the
// mastery store *and* an rng, and neither may re-roll the table underneath a
// session in progress. Reseated only at the deliberate moments below.
const table = ref<FactFamily[]>([]);
const bonusFamily = computed<FactFamily | undefined>(() =>
  group.value ? nextFamilyToUnlock(group.value, curriculum.active[group.value]) : undefined,
);
// Ziggy deals early for a price now (Phase 13) — a free bonus card meant
// cheating the curriculum cost nothing while cheating one answer cost the
// streak and the fact's mastery credit.
const canAffordBonus = computed(() => wallet.canAfford(NEW_CARD_COST));
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
  ziggyReveal,
  progressValue,
  progressMax,
  summary,
  isNewBest,
  families: sessionFamilies,
  stageBefore,
  tokensEarned,
  cleanSessionBonus,
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

// Deals a fresh table from the current pool, always keeping a seat for a
// card just dealt — the intro is about to point at it and call it new, which
// would be a lie if the session never asked about it.
function seatTable() {
  table.value = selectTable(sessionPool.value, (key) => mastery.getFamily(key), {
    requiredKeys: highlightedKey.value ? [highlightedKey.value] : [],
  });
  // ...unless a ?focus= has narrowed the pool so far that the new card isn't
  // even in it, in which case there's nothing left to point at.
  if (highlightedKey.value && !table.value.some((f) => f.key === highlightedKey.value)) {
    highlightedKey.value = null;
  }
}

function enterIntro() {
  const g = group.value;
  if (!g) return;
  pageTitle.value = `${GROUP_LABELS[g]} - Practice`;
  curriculum.ensureSeeded(g);
  // One rule: win every card at the table and Ziggy deals a new one. The
  // scope is the table just played — before the first session of a visit
  // `table` is empty, and an empty scope never unlocks, so arriving on the
  // page can't produce a card nobody just earned.
  highlightedKey.value =
    curriculum.tryAutoUnlock(g, (key) => mastery.getFamily(key), table.value)?.key ?? null;
  seatTable();
  phase.value = "intro";
}

// A focus edit is a different pool, so it needs a different table. (The
// route push this comes from doesn't remount the page — see PLAN.md's
// gotchas — so nothing else re-runs.)
watch(focusQuery, () => seatTable());

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
  begin(table.value);
  phase.value = "active";
}

// Checks there's a card to deal *before* taking payment — `bonusFamily` is
// computed from the same nextFamilyToUnlock() the purchase uses, so this is
// the whole of "did the player get what they paid for".
function addBonusFamily() {
  const g = group.value;
  if (!g || !bonusFamily.value || !wallet.spend(NEW_CARD_COST)) return;
  const unlocked = curriculum.unlockBonus(g);
  if (!unlocked) return;
  playSound("cheat");
  highlightedKey.value = unlocked.key;
  seatTable();
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
      :canAffordBonus
      :tokens="wallet.tokens"
      :families="table"
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
      :tokens="wallet.tokens"
      :tokensEarned
      :cleanSessionBonus
      @replay="startSession()"
      @advance="enterIntro()"
      @home="router.push('/')"
    />
    <div v-else class="mt-4 flex flex-col gap-4 lg:gap-8 relative">
      <StreakToast :milestone="streakMilestone" />
      <ZiggyReveal :question="ziggyReveal" />
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
