<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconEliminate from "~icons/feather/eye-off";
import IconRestart from "~icons/feather/repeat";
import IconNext from "~icons/feather/arrow-right";
import { ref, computed, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import FoxMascot from "../components/mascot/FoxMascot.vue";
import { generateLevel, sections } from "../sections";
import { Level, Question, AnswerType, LevelSummary } from "../types";
import { playSound, playChime } from "../sounds";
import { celebrate, celebrateBig } from "../confetti";
import { LevelMetrics, formatPercent, formatTime, shuffle } from "../utils";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { FAST_RESPONSE_MS, MAX_STAGE, MasteryOutcome } from "../mastery";
import { isStreakMilestone } from "../streak";
import { LEVEL_CLEAR_THRESHOLD } from "../milestones";

// Tiered cheat costs, spent from a per-level hint-token budget. Eliminating
// two wrong answers still leaves recall work to do, so it's cheap; revealing
// the answer outright skips recall entirely, so it costs much more.
const START_HINT_TOKENS = 5;
const ELIMINATE_COST = 1;
const REVEAL_COST = 3;

const props = defineProps<{
  section: string;
  level: string;
}>();
const router = useRouter();
const route = useRoute();
const section = sections.find((s) => s.id === props.section);
const progress = useProgressStore();
const mastery = useMasteryStore();
const streak = useStreakStore();
// useHead() must be called once, synchronously during setup — calling it
// again later from a click handler (e.g. "Try Again") throws, since Vue
// doesn't restore injection context for plain event listener invocations.
// Passing a ref lets startLevel() just update the title reactively instead.
const pageTitle = ref("");
useHead({ title: pageTitle });
const questionIndex = ref(0);
const answerTypes = ref<Record<number, AnswerType>>({});
const hintTokens = ref(0);
const currentLevel = ref<Level>({ name: "?", level: 0, questions: [] });
const summary = ref<LevelSummary | null>(null);
const isNewBest = ref(false);
const hadWrongThisQuestion = ref(false);
const hintUsedThisQuestion = ref(false);
const streakMilestone = ref<number | null>(null);
let metrics = new LevelMetrics();
let streakMilestoneTimeout: ReturnType<typeof setTimeout>;

// "Focus on my 7s and 8s": a comma-separated ?focus=7,8 query param seeds the
// weighted family pool. "Mixed practice" (?mixed=1) pairs inverse operations
// from the same fact-family group in one session.
const focusNumbers = computed<number[] | undefined>(() => {
  const raw = route.query.focus;
  if (typeof raw !== "string") return undefined;
  const numbers = raw
    .split(",")
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
  return numbers.length > 0 ? numbers : undefined;
});
const mixed = computed(() => route.query.mixed === "1");

const currentQuestion = computed<Question>(() => {
  return (
    currentLevel.value.questions[questionIndex.value] || {
      operator: "+",
      familyKey: "",
      factors: [],
      correct: 0,
      answers: [],
    }
  );
});

const currentAnswers = computed<number[]>(() => {
  return currentQuestion.value.answers;
});

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

const personalBest = computed(() => {
  return section ? progress.getPersonalBest(section.id, currentLevel.value.level) : undefined;
});

if (section) {
  startLevel(parseInt(props.level));
} else {
  router.push("/");
}

onUnmounted(() => clearTimeout(streakMilestoneTimeout));

// Cancels any in-flight milestone celebration — used both when a hint use
// breaks the streak the toast was just celebrating, and when starting a
// fresh level/attempt shouldn't carry over a toast from the last one.
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

// Colors track what's actually still affordable, not a raw token count —
// with tiered costs, "2 tokens left" means very different things depending
// on whether Reveal (3) is still in reach.
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
  const stageBefore = mastery.getFamily(familyKey).stage;
  mastery.recordAttempt(familyKey, outcome);
  // Celebrate the first time a family reaches full mastery — Ziggy's out of
  // tricks for that one now (see dashboard.ts's denFlavor()).
  if (stageBefore < MAX_STAGE && mastery.getFamily(familyKey).stage >= MAX_STAGE) {
    playChime("mastery_up");
  }
}

function recordStreak() {
  if (hintUsedThisQuestion.value) return;
  const newStreak = streak.recordClean();
  if (isStreakMilestone(newStreak)) {
    streakMilestone.value = newStreak;
    playChime("streak_milestone");
    celebrate(0.15);
    clearTimeout(streakMilestoneTimeout);
    streakMilestoneTimeout = setTimeout(() => {
      streakMilestone.value = null;
    }, 2500);
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
    if (questionIndex.value + 1 >= currentLevel.value.questions.length) {
      finishLevel();
    } else {
      playSound("correct");
      currentAnswers.value.forEach((_, index2) => {
        answerTypes.value[index2] = index2 === index ? "right" : "hide";
      });
      setTimeout(() => {
        metrics.beginQuestion();
        questionIndex.value += 1;
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
    }
  }
}

function startLevel(levelId: number) {
  if (!section) return;
  pageTitle.value = `${section.name} - Level ${levelId}`;
  playSound("level_start");

  metrics = new LevelMetrics();
  metrics.beginQuestion();

  currentLevel.value = generateLevel(section, {
    level: levelId,
    questionCount: 10,
    answerCount: 5,
    focusNumbers: focusNumbers.value,
    mixed: mixed.value,
    getMastery: (key) => mastery.getFamily(key),
  });
  hintTokens.value = START_HINT_TOKENS;
  summary.value = null;
  questionIndex.value = 0;
  answerTypes.value = {};
  dismissStreakMilestone();
  hadWrongThisQuestion.value = false;
  hintUsedThisQuestion.value = false;
}

function finishLevel() {
  playSound("level_end");
  summary.value = metrics.endLevel();
  isNewBest.value = section
    ? progress.recordLevelResult(section.id, currentLevel.value.level, summary.value)
    : false;
  if (isNewBest.value) {
    playChime("badge");
    celebrateBig();
  } else if (summary.value.percentCorrect >= LEVEL_CLEAR_THRESHOLD) {
    celebrate();
  }
}

function nextLevel() {
  const next = currentLevel.value.level + 1;
  if (section && next <= 8) {
    router.push({ path: `/${section.id}/${next}`, query: route.query });
    startLevel(next);
  } else {
    router.push("/");
  }
}

// Both hint tiers still hold the family's mastery stage and grant no credit
// for this question — see recordFamilyOutcome — and break the cheat-free
// streak immediately, rather than waiting for the question to resolve.
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
  <NavBreadcrumbs :section="section" :level="props.level" />
  <section v-if="section">
    <div class="mt-16 mx-4 max-w-2xl md:mx-auto" v-if="summary">
      <div class="shadow-xl rounded-xl p-4 border-secondary overflow-clip border-2">
        <div class="flex items-center bg-secondary -mt-4 -mx-4 p-2">
          <FoxMascot pose="cheer" class="h-10 w-10 shrink-0" label="Ziggy cheering" />
          <div class="font-display font-medium text-center text-2xl flex-1">
            {{ section.name }} Level {{ currentLevel.level }} Complete
          </div>
          <FoxMascot pose="cheer" class="h-10 w-10 shrink-0" label="Ziggy cheering" />
        </div>
        <table class="table table-lg table-fixed">
          <tbody>
            <tr>
              <td class="text-right font-bold">Score:</td>
              <td>
                {{ formatPercent(summary.percentCorrect) }}
              </td>
            </tr>
            <tr v-if="personalBest">
              <td class="text-right font-bold">Personal Best:</td>
              <td>
                {{ formatPercent(personalBest.percentCorrect) }}
                <span v-if="isNewBest" class="badge badge-success ml-2">New!</span>
              </td>
            </tr>
            <tr>
              <td class="text-right font-bold">Level Time:</td>
              <td>{{ formatTime(summary.levelTime) }}</td>
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
        <div class="p-2 text-center">{{ summary.message }}</div>
        <div class="flex justify-between">
          <button class="btn" @click="startLevel(currentLevel.level)">
            <IconRestart />
            Try Again
          </button>
          <button v-if="currentLevel.level < 8" class="btn btn-primary" @click="nextLevel()">
            <IconNext />
            Next Level
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
          <FoxMascot pose="cheer" class="h-8 w-8 shrink-0" label="Ziggy outfoxed" />
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
          <FoxMascot pose="sly" class="w-6 h-6 shrink-0" label="Ziggy" />
          <div class="flex gap-1 items-center" :class="hintClass()" data-testid="hint-tokens">
            <IconHint class="inline-block" v-for="_hint in hintTokens" />
          </div>
        </div>
      </div>
      <div class="container flex items-center gap-4">
        <div class="w-1/3">
          <span v-if="streak.current > 0" data-testid="streak-count"
            >🦊 outfoxing Ziggy: {{ streak.current }} in a row</span
          >
        </div>
        <progress
          class="w-2/3 progress progress-primary"
          :value="questionIndex + 1"
          :max="currentLevel.questions.length"
        />
      </div>
    </div>
  </section>
</template>
