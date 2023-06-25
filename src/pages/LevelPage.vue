<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconFinish from "~icons/feather/award";
import IconRestart from "~icons/feather/repeat";
import IconNext from "~icons/feather/arrow-right";
import { ref, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import { generateLevel, sections } from "../sections";
import { Level, Question, AnswerType, LevelSummary } from "../types";
import { playSound } from "../sounds";
import { LevelMetrics, formatPercent, formatTime } from "../utils";

const props = defineProps<{
  section: string;
  level: string;
}>();
const router = useRouter();
const section = sections.find((s) => s.id === props.section);
const points = ref(0);
const questionIndex = ref(0);
const answerTypes = ref<Record<number, AnswerType>>({});
const remainingHints = ref(0);
const currentLevel = ref<Level>({ level: 0, questions: [] });
const summary = ref<LevelSummary | null>(null);
let metrics = new LevelMetrics();

let intervalId: number;

const currentQuestion = computed<Question>(() => {
  return (
    currentLevel.value.questions[questionIndex.value] || {
      factors: [],
      correct: 0,
      answers: [],
    }
  );
});

const currentAnswers = computed<number[]>(() => {
  return currentQuestion.value.answers;
});

if (section) {
  startLevel(parseInt(props.level));
} else {
  router.push("/");
}

onUnmounted(() => clearInterval(intervalId));

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
    "text-success": remainingHints.value > 2,
    "text-warning": remainingHints.value == 2,
    "text-error": remainingHints.value == 1,
  };
}

function chooseAnswer(index: number) {
  if (
    answerTypes.value[index] !== "right" &&
    currentAnswers.value[index] === currentQuestion.value.correct
  ) {
    metrics.answerQuestion("right");
    if (questionIndex.value + 1 >= currentLevel.value.questions.length) {
      finishLevel();
    } else {
      playSound("correct");
      currentAnswers.value.forEach((_, index2) => {
        answerTypes.value[index2] = index2 === index ? "right" : "hide";
      });
      points.value -= 1;
      setTimeout(() => {
        metrics.beginQuestion();
        questionIndex.value += 1;
        answerTypes.value = {};
      }, 500);
    }
  } else if (answerTypes.value[index] !== "wrong") {
    metrics.answerQuestion("wrong");
    playSound("wrong");
    points.value += 1;
    answerTypes.value[index] = "wrong";
  }
}

function startLevel(levelId: number) {
  if (!section) return;
  useHead({ title: `${section.name} - Level ${levelId}` });
  playSound("level_start");
  clearInterval(intervalId);

  metrics = new LevelMetrics();
  metrics.beginQuestion();

  currentLevel.value = generateLevel(section, levelId, 20, 5);
  remainingHints.value = 5;
  points.value = 1;
  summary.value = null;
  questionIndex.value = 0;
  answerTypes.value = {};

  intervalId = setInterval(() => {
    points.value += 1;
  }, 2000);
}

function finishLevel() {
  playSound("level_end");
  clearInterval(intervalId);
  summary.value = metrics.endLevel(points.value);
}

function nextLevel() {
  const next = currentLevel.value.level + 1;
  if (section && next <= 8) {
    router.push(`/${section.id}/${next}`);
    startLevel(next);
  } else {
    router.push("/");
  }
}

function showHint() {
  if (remainingHints.value < 1) return;
  const index = currentAnswers.value.findIndex(
    (a) => a === currentQuestion.value.correct
  );
  playSound("cheat");
  answerTypes.value[index] = "hint";
  remainingHints.value -= 1;
  points.value += 1;

  setTimeout(() => {
    if (answerTypes.value[index] === "hint") delete answerTypes.value[index];
  }, 1000);
}
</script>
<template>
  <NavBreadcrumbs :section="section" :level="props.level" />
  <section>
    <div class="mt-16 mx-4 max-w-2xl md:mx-auto" v-if="summary">
      <div class="shadow-xl rounded-xl p-4 border-secondary overflow-clip border-2">
        <div class="flex bg-secondary -mt-4 -mx-4 p-2">
          <IconFinish class="h-8 w-8" />
          <div class="font-display font-medium text-center text-2xl flex-1">
            {{ section.name }} Level {{ currentLevel.level }} Complete
          </div>
          <IconFinish class="h-8 w-8" />
        </div>
        <table class="table table-lg table-fixed">
          <tbody>
            <tr>
              <td class="text-right font-bold">Points:</td>
              <td>{{ summary.points }}</td>
            </tr>
            <tr>
              <td class="text-right font-bold">Score:</td>
              <td>
                {{ formatPercent(summary.percentCorrect) }}
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
          <button
            v-if="currentLevel.level < 8"
            class="btn btn-primary"
            @click="nextLevel()"
          >
            <IconNext />
            Next Level
          </button>
        </div>
      </div>
    </div>
    <div v-else class="mt-4 flex flex-col gap-4 lg:gap-8">
      <div class="flex gap-8 text-8xl font-bold font-display justify-center">
        <span>{{ currentQuestion.factors[0] }}</span>
        <span>{{ section.operator }}</span>
        <span>{{ currentQuestion.factors[1] }}</span>
      </div>
      <div class="flex gap-2 md:gap-4 lg:gap-8 justify-center">
        <button
          class="btn btn-lg btn-circle"
          :class="answerButtonClass(idx)"
          v-for="(answer, idx) in currentAnswers"
          @click="chooseAnswer(idx)"
        >
          {{ answer }}
        </button>
      </div>

      <div class="container flex justify-between">
        <button
          class="btn btn-accent tracking-widest"
          @click="showHint()"
          :disabled="remainingHints < 1"
        >
          Cheat
        </button>
        <div class="flex gap-1" :class="hintClass()">
          <IconHint class="inline-block" v-for="_hint in remainingHints" />
        </div>
      </div>
      <div class="container flex items-center">
        <div class="w-1/4">{{ points }} points</div>
        <progress
          class="w-1/2 progress progress-primary"
          :value="questionIndex + 1"
          :max="currentLevel.questions.length"
        />
        <div class="w-1/4 text-right">
          {{ questionIndex + 1 }} / {{ currentLevel.questions.length }}
        </div>
      </div>
    </div>
  </section>
</template>
