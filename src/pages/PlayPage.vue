<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconEliminate from "~icons/feather/eye-off";
import IconRestart from "~icons/feather/repeat";
import IconNext from "~icons/feather/arrow-right";
import IconHome from "~icons/feather/home";
import IconStreak from "~icons/feather/trending-up";
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import ZiggyImage from "../components/mascot/ZiggyImage.vue";
import ZiggySpeaks from "../components/mascot/ZiggySpeaks.vue";
import FactFamilyShape from "../components/FactFamilyShape.vue";
import {
  GROUP_LABELS,
  SESSION_MAX_QUESTIONS,
  SessionFamilyStatus,
  buildFollowUpQuestions,
  buildInitialQuestions,
  buildSessionTargetKeys,
  hasReachedHardCap,
  isSessionComplete,
  permutationKey,
  resolveTargetFamilies,
} from "../session";
import { Question, AnswerType, SessionSummary, ZiggyPose } from "../types";
import { playSound } from "../sounds";
import { celebrate, celebrateBig } from "../confetti";
import { SessionMetrics, formatPercent, formatTime, shuffle } from "../utils";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { useCurriculumStore } from "../stores/curriculum";
import { FAST_RESPONSE_MS, FactFamily, MAX_STAGE, MasteryOutcome, OperatorGroup } from "../mastery";
import { nextFamilyToUnlock } from "../curriculum";
import { isStreakMilestone } from "../streak";
import { SESSION_CLEAR_THRESHOLD } from "../milestones";

// Tiered cheat costs, spent from a per-session hint-token budget. Eliminating
// two wrong answers still leaves recall work to do, so it's cheap; revealing
// the answer outright skips recall entirely, so it costs much more.
const START_HINT_TOKENS = 5;
const ELIMINATE_COST = 1;
const REVEAL_COST = 3;
const FOLLOW_UP_BATCH_SIZE = 4;

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
const focusInput = ref("");

const questions = ref<Question[]>([]);
const questionIndex = ref(0);
const answerTypes = ref<Record<number, AnswerType>>({});
const hintTokens = ref(0);
const summary = ref<SessionSummary | null>(null);
const isNewBest = ref(false);
const hadWrongThisQuestion = ref(false);
const hintUsedThisQuestion = ref(false);
const streakMilestone = ref<number | null>(null);
let metrics = new SessionMetrics();
let streakMilestoneTimeout: ReturnType<typeof setTimeout>;

// The session's fixed target-family set, snapshotted at beginSession() so a
// focus-input edit mid-session (not exposed in the UI, but defensive) can't
// shift the goalposts underneath an in-progress session.
const sessionFamilies = ref<FactFamily[]>([]);
// One entry per (family, operator) permutation — both directions of every
// target family must clear before the session can end.
const sessionTargetKeys = ref<string[]>([]);
const familyStatus = ref<Record<string, SessionFamilyStatus>>({});
const stageBefore = ref<Record<string, number>>({});

const focusNumbers = computed<number[] | undefined>(() => {
  const raw = route.query.focus;
  if (typeof raw !== "string") return undefined;
  const numbers = raw
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
  return numbers.length > 0 ? numbers : undefined;
});

const activeFamilies = computed<FactFamily[]>(() =>
  group.value ? curriculum.activeFamilies(group.value) : [],
);
const targetFamilies = computed<FactFamily[]>(() =>
  resolveTargetFamilies(activeFamilies.value, focusNumbers.value),
);
const bonusFamily = computed<FactFamily | undefined>(() =>
  group.value ? nextFamilyToUnlock(group.value, curriculum.active[group.value]) : undefined,
);

const currentQuestion = computed<Question>(() => {
  return (
    questions.value[questionIndex.value] || {
      operator: "+",
      familyKey: "",
      factors: [],
      correct: 0,
      answers: [],
    }
  );
});

const currentAnswers = computed<number[]>(() => currentQuestion.value.answers);

// Untried, not-yet-hidden wrong answers — what "Eliminate 2" has left to
// hide. Once this runs out the button disables itself.
const eliminableIndices = computed<number[]>(() => {
  return currentAnswers.value
    .map((value, index) => ({ value, index }))
    .filter(
      ({ value, index }) =>
        value !== currentQuestion.value.correct && answerTypes.value[index] === undefined,
    )
    .map(({ index }) => index);
});
const canEliminate = computed(
  () => hintTokens.value >= ELIMINATE_COST && eliminableIndices.value.length > 0,
);
const canReveal = computed(() => hintTokens.value >= REVEAL_COST);

const personalBest = computed(() => (group.value ? progress.getBest(group.value) : undefined));

// Ziggy tops and tails a session: on the intro he says what's on the table
// (and is the only thing that explains the highlighted "New!" card), on the
// outro he reacts to how it went. Nothing else on either screen is him, so
// each appearance has one job.
const introLines = computed(() => {
  if (highlightedKey.value) {
    return ["Something new for you today — the card that's glowing. The rest you've met before."];
  }
  const seenAny = targetFamilies.value.some((f) => mastery.getFamily(f.key).timesSeen > 0);
  return seenAny
    ? ["Same facts as last time. Show me you've still got them."]
    : ["These are the ones we're starting with. Try not to need me."];
});
const introPose = computed<ZiggyPose>(() => (highlightedKey.value ? "gleeful" : "wink"));
const outroPose = computed<ZiggyPose>(() => {
  if (!summary.value) return "neutral";
  if (isNewBest.value || summary.value.percentCorrect >= SESSION_CLEAR_THRESHOLD) return "gleeful";
  // Below half right, Ziggy's still ahead — and enjoying it. The message
  // itself stays encouraging (see SessionMetrics.endSession).
  return summary.value.percentCorrect >= 0.5 ? "neutral" : "wink";
});

function enterIntro() {
  const g = group.value;
  if (!g) return;
  pageTitle.value = `${GROUP_LABELS[g]} - Practice`;
  curriculum.ensureSeeded(g);
  highlightedKey.value = curriculum.tryAutoUnlock(g, (key) => mastery.getFamily(key))?.key ?? null;
  focusInput.value = typeof route.query.focus === "string" ? route.query.focus : "";
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

onUnmounted(() => clearTimeout(streakMilestoneTimeout));

function dismissStreakMilestone() {
  streakMilestone.value = null;
  clearTimeout(streakMilestoneTimeout);
}

function answerButtonClass(index: number) {
  const answerType = answerTypes.value[index];
  return {
    "btn-outline": answerType === undefined,
    "btn-error": answerType === "wrong",
    "btn-info": answerType === "hint",
    "btn-success": answerType === "right",
    "opacity-10": answerType === "hide",
  };
}

function hintClass() {
  return {
    "text-success": hintTokens.value >= REVEAL_COST,
    "text-warning": hintTokens.value >= ELIMINATE_COST && hintTokens.value < REVEAL_COST,
    "text-error": hintTokens.value < ELIMINATE_COST,
  };
}

// Cheated-to or eventually-correct-after-a-wrong-guess answers still count
// as "known", but don't earn the fast-recall promotion a clean, quick
// answer does.
function recordFamilyOutcome() {
  let outcome: MasteryOutcome;
  if (hintUsedThisQuestion.value) {
    outcome = "cheated";
  } else if (hadWrongThisQuestion.value) {
    outcome = "correct-slow";
  } else {
    const elapsed = Date.now() - metrics.questionStart;
    outcome = elapsed < FAST_RESPONSE_MS ? "correct-fast" : "correct-slow";
  }
  const familyKey = currentQuestion.value.familyKey;
  const stageBeforeThis = mastery.getFamily(familyKey).stage;
  mastery.recordAttempt(familyKey, outcome);
  if (stageBeforeThis < MAX_STAGE && mastery.getFamily(familyKey).stage >= MAX_STAGE) {
    playSound("mastery_up");
  }
}

function recordStreak() {
  if (hintUsedThisQuestion.value) return;
  const newStreak = streak.recordClean();
  if (isStreakMilestone(newStreak)) {
    streakMilestone.value = newStreak;
    playSound("streak_milestone");
    celebrate(0.15);
    clearTimeout(streakMilestoneTimeout);
    streakMilestoneTimeout = setTimeout(() => {
      streakMilestone.value = null;
    }, 2500);
  }
}

function ensureQueueHasNext() {
  if (!group.value) return;
  if (
    questionIndex.value >= questions.value.length &&
    questions.value.length < SESSION_MAX_QUESTIONS
  ) {
    const batchSize = Math.min(
      FOLLOW_UP_BATCH_SIZE,
      SESSION_MAX_QUESTIONS - questions.value.length,
    );
    const batch = buildFollowUpQuestions(
      group.value,
      sessionFamilies.value,
      familyStatus.value,
      batchSize,
      { getMastery: (key) => mastery.getFamily(key) },
    );
    questions.value.push(...batch);
  }
}

function chooseAnswer(index: number) {
  if (
    answerTypes.value[index] !== "right" &&
    currentAnswers.value[index] === currentQuestion.value.correct
  ) {
    metrics.answerQuestion("right");
    recordFamilyOutcome();
    recordStreak();
    const permKey = permutationKey(currentQuestion.value.familyKey, currentQuestion.value.operator);
    familyStatus.value[permKey] = hintUsedThisQuestion.value ? "retry" : "clean";

    const elapsed = Date.now() - metrics.sessionStart;
    if (
      isSessionComplete(familyStatus.value, sessionTargetKeys.value) ||
      hasReachedHardCap(metrics.questionsTotal, elapsed)
    ) {
      finishSession();
    } else {
      playSound("correct");
      currentAnswers.value.forEach((_, index2) => {
        answerTypes.value[index2] = index2 === index ? "right" : "hide";
      });
      setTimeout(() => {
        metrics.beginQuestion();
        questionIndex.value += 1;
        ensureQueueHasNext();
        answerTypes.value = {};
        hadWrongThisQuestion.value = false;
        hintUsedThisQuestion.value = false;
      }, 500);
    }
  } else if (answerTypes.value[index] !== "wrong") {
    metrics.answerQuestion("wrong");
    playSound("wrong");
    answerTypes.value[index] = "wrong";
    if (!hadWrongThisQuestion.value) {
      hadWrongThisQuestion.value = true;
      mastery.recordAttempt(currentQuestion.value.familyKey, "wrong");
      const permKey = permutationKey(
        currentQuestion.value.familyKey,
        currentQuestion.value.operator,
      );
      familyStatus.value[permKey] = "retry";
    }
  }
}

function beginSession() {
  if (!group.value) return;
  sessionFamilies.value = targetFamilies.value;
  sessionTargetKeys.value = buildSessionTargetKeys(group.value, sessionFamilies.value);
  stageBefore.value = Object.fromEntries(
    sessionFamilies.value.map((f) => [f.key, mastery.getFamily(f.key).stage]),
  );
  familyStatus.value = Object.fromEntries(sessionTargetKeys.value.map((key) => [key, "pending"]));

  playSound("level_start");
  metrics = new SessionMetrics();
  metrics.beginQuestion();

  questions.value = buildInitialQuestions(group.value, sessionFamilies.value, {
    getMastery: (key) => mastery.getFamily(key),
  });
  hintTokens.value = START_HINT_TOKENS;
  summary.value = null;
  questionIndex.value = 0;
  answerTypes.value = {};
  dismissStreakMilestone();
  hadWrongThisQuestion.value = false;
  hintUsedThisQuestion.value = false;
  phase.value = "active";
}

function finishSession() {
  if (!group.value) return;
  playSound("level_end");
  summary.value = metrics.endSession();
  isNewBest.value = progress.recordSessionResult(group.value, summary.value);
  if (isNewBest.value) {
    playSound("badge");
    celebrateBig();
  } else if (summary.value.percentCorrect >= SESSION_CLEAR_THRESHOLD) {
    celebrate();
  }
  phase.value = "outro";
}

function replaySession() {
  beginSession();
}

function advanceSession() {
  enterIntro();
}

function goHome() {
  router.push("/");
}

function addBonusFamily() {
  if (!group.value) return;
  const unlocked = curriculum.unlockBonus(group.value);
  if (unlocked) highlightedKey.value = unlocked.key;
}

function applyFocus() {
  if (!group.value) return;
  const trimmed = focusInput.value.trim();
  router.push({ path: `/play/${group.value}`, query: trimmed ? { focus: trimmed } : {} });
}

function markCheated() {
  hintUsedThisQuestion.value = true;
  streak.recordCheat();
  dismissStreakMilestone();
}

function eliminateWrong() {
  if (!canEliminate.value) return;
  playSound("cheat");
  shuffle([...eliminableIndices.value])
    .slice(0, 2)
    .forEach((index) => {
      answerTypes.value[index] = "hide";
    });
  hintTokens.value -= ELIMINATE_COST;
  markCheated();
}

function revealAnswer() {
  if (!canReveal.value) return;
  const index = currentAnswers.value.findIndex((a) => a === currentQuestion.value.correct);
  playSound("cheat");
  answerTypes.value[index] = "hint";
  hintTokens.value -= REVEAL_COST;
  markCheated();

  setTimeout(() => {
    if (answerTypes.value[index] === "hint") delete answerTypes.value[index];
  }, 1000);
}
</script>
<template>
  <NavBreadcrumbs :group="group" />
  <section v-if="group">
    <div v-if="phase === 'intro'" class="container mt-8 flex flex-col gap-6">
      <h1 class="font-display text-2xl font-bold">{{ GROUP_LABELS[group] }}</h1>
      <ZiggySpeaks size="sm" :pose="introPose" :lines="introLines" />
      <div class="flex flex-wrap gap-4" data-testid="intro-families">
        <FactFamilyShape
          v-for="family in targetFamilies"
          :key="family.key"
          :family="family"
          :stage="mastery.getFamily(family.key).stage"
          :highlight="family.key === highlightedKey"
        />
      </div>
      <div class="flex flex-wrap items-center gap-4">
        <button
          v-if="bonusFamily"
          class="btn btn-secondary"
          @click="addBonusFamily()"
          data-testid="bonus-fact-button"
        >
          Ask Ziggy for a bonus fact
        </button>
        <form class="flex items-center gap-2" @submit.prevent="applyFocus()">
          <input
            v-model="focusInput"
            type="text"
            placeholder="Focus on numbers (e.g. 7,8)"
            class="input input-bordered"
          />
          <button class="btn" type="submit">Go</button>
        </form>
      </div>
      <button
        class="btn btn-primary btn-lg self-start"
        @click="beginSession()"
        data-testid="start-session-button"
      >
        Start practicing
      </button>
    </div>
    <div
      v-else-if="phase === 'outro'"
      class="mt-16 mx-4 max-w-2xl md:mx-auto"
      data-testid="session-summary"
    >
      <div class="shadow-xl rounded-xl p-4 border-secondary overflow-clip border-2">
        <div class="flex items-center bg-secondary -mt-4 -mx-4 p-2">
          <div class="font-display font-medium text-center text-2xl flex-1">
            {{ GROUP_LABELS[group] }} Session Complete
          </div>
        </div>
        <table class="table table-lg table-fixed" v-if="summary">
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
        <ZiggySpeaks
          v-if="summary"
          size="sm"
          class="p-2"
          :pose="outroPose"
          :lines="[summary.message]"
        />
        <div class="flex flex-wrap gap-4 p-2 justify-center" data-testid="family-recap">
          <div
            v-for="family in sessionFamilies"
            :key="family.key"
            class="flex flex-col items-center gap-1"
          >
            <FactFamilyShape :family="family" :stage="mastery.getFamily(family.key).stage" />
            <span class="text-xs">
              {{ stageBefore[family.key] }} → {{ mastery.getFamily(family.key).stage }}
            </span>
          </div>
        </div>
        <div class="flex justify-between flex-wrap gap-2">
          <button class="btn" @click="replaySession()" data-testid="replay-button">
            <IconRestart />
            Replay
          </button>
          <button class="btn btn-primary" @click="advanceSession()" data-testid="advance-button">
            <IconNext />
            Advance
          </button>
          <button class="btn" @click="goHome()" data-testid="home-button">
            <IconHome />
            Home
          </button>
        </div>
      </div>
    </div>
    <div v-else class="mt-4 flex flex-col gap-4 lg:gap-8 relative">
      <div
        v-if="streakMilestone"
        class="toast toast-top toast-center z-10 animate-bounce"
        role="status"
        data-testid="streak-milestone"
      >
        <div class="alert alert-success shadow-lg">
          <ZiggyImage
            pose="gleeful"
            class="h-9 w-9 shrink-0 rounded-full bg-base-100"
            label="Ziggy, outfoxed"
          />
          <span>You outfoxed Ziggy! {{ streakMilestone }} cheat-free streak!</span>
        </div>
      </div>
      <div class="flex gap-8 text-8xl font-bold font-display justify-center">
        <span>{{ currentQuestion.factors[0] }}</span>
        <span>{{ currentQuestion.operator }}</span>
        <span>{{ currentQuestion.factors[1] }}</span>
      </div>
      <div class="flex gap-2 md:gap-4 lg:gap-8 justify-center">
        <button
          class="btn btn-lg btn-circle"
          :class="answerButtonClass(idx)"
          v-for="(answer, idx) in currentAnswers"
          @click="chooseAnswer(idx)"
          data-testid="answer-button"
        >
          {{ answer }}
        </button>
      </div>

      <div class="container flex flex-wrap justify-between items-center gap-2">
        <div class="flex gap-2">
          <button
            class="btn btn-secondary tracking-wide"
            @click="eliminateWrong()"
            :disabled="!canEliminate"
            data-testid="eliminate-button"
          >
            <IconEliminate />
            Ask Ziggy to hide 2 ({{ ELIMINATE_COST }})
          </button>
          <button
            class="btn btn-accent tracking-wide"
            @click="revealAnswer()"
            :disabled="!canReveal"
            data-testid="reveal-button"
          >
            <IconHint />
            Beg Ziggy to reveal it ({{ REVEAL_COST }})
          </button>
        </div>
        <div class="flex items-center gap-2">
          <ZiggyImage pose="mark" class="w-8 h-8 shrink-0 rounded-full bg-base-200" />
          <div class="flex gap-1 items-center" :class="hintClass()" data-testid="hint-tokens">
            <IconHint class="inline-block" v-for="_hint in hintTokens" />
          </div>
        </div>
      </div>
      <div class="container flex items-center gap-4">
        <div class="w-1/3">
          <span
            v-if="streak.current > 0"
            class="inline-flex items-center gap-1"
            data-testid="streak-count"
          >
            <IconStreak class="w-4 h-4 shrink-0" />
            outfoxing Ziggy: {{ streak.current }} in a row
          </span>
        </div>
        <progress
          class="w-2/3 progress progress-primary"
          :value="questionIndex + 1"
          :max="Math.max(questions.length, questionIndex + 1)"
        />
      </div>
    </div>
  </section>
</template>
