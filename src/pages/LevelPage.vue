<script lang="ts" setup>
import IconHint from "~icons/feather/zap";
import IconFinish from "~icons/feather/award";
import { ref, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import { generateLevel, sections } from "../sections";
import { Level, Question } from "../types";

type AnswerType = "wrong" | "right" | "hint";

const props = defineProps<{
  section: string;
  level: string;
}>();
const router = useRouter();
const section = sections.find((s) => s.id === props.section);
const points = ref(0);
const questionIdx = ref(0);
const answers = ref<Record<number, AnswerType>>({});
const remainingHints = ref(0);
const currentLevel = ref<Level>({ level: 0, questions: [] });
const currentQuestion = ref<Question>({ factors: [], correct: 0, answers: [] });
const finalPoints = ref(0);

let intervalId: number;

if (section) {
  startLevel(parseInt(props.level));
} else {
  router.push("/");
}

onUnmounted(() => clearInterval(intervalId));

function answerButtonClass(idx: number) {
  return {
    "btn-outline": answers.value[idx] == undefined,
    "btn-error": answers.value[idx] == "wrong",
    "btn-info": answers.value[idx] == "hint",
    "animate-pulse": answers.value[idx] == "hint",
    "btn-success": answers.value[idx] == "right",
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
    answers.value[index] !== "right" &&
    currentQuestion.value.answers[index] === currentQuestion.value.correct
  ) {
    if (questionIdx.value + 1 >= currentLevel.value.questions.length) {
      finishLevel();
    } else {
      answers.value[index] = "right";
      points.value -= 1;
      setTimeout(() => {
        questionIdx.value += 1;
        answers.value = {};
        currentQuestion.value = currentLevel.value.questions[questionIdx.value];
      }, 1500);
    }
  } else if (answers.value[index] !== "wrong") {
    points.value += 1;
    answers.value[index] = "wrong";
  }
}

function startLevel(levelId: number) {
  if (!section) return;
  currentLevel.value = generateLevel(section, levelId, 20, 4);
  currentQuestion.value = currentLevel.value.questions[0];
  remainingHints.value = 5;
  points.value = 1;
  finalPoints.value = 0;
  questionIdx.value = 0;
  answers.value = {};

  clearInterval(intervalId);
  intervalId = setInterval(() => {
    points.value += 1;
  }, 2000);
}

function finishLevel() {
  clearInterval(intervalId);
  finalPoints.value = points.value;
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
  const index = currentQuestion.value.answers.findIndex(
    (a) => a === currentQuestion.value.correct
  );
  answers.value[index] = "hint";
  remainingHints.value -= 1;
  points.value += 1;

  setTimeout(() => {
    if (answers.value[index] === "hint") delete answers.value[index];
  }, 1000);
}
</script>
<template>
  <NavBreadcrumbs :section="section" :level="props.level" />
  <section>
    <div class="mt-16 mx-4 md:w-3/4 md:mx-auto" v-if="finalPoints">
      <div class="shadow-xl rounded-xl p-4 flex gap-8 border-accent border-2">
        <IconFinish class="text-2xl" />
        <div class="flex-1">
          <p>You finished {{ section.name }} level {{ currentLevel.level }}!</p>
          <p class="my-4 text-2xl tracking-widest">{{ finalPoints }} points</p>
          <div class="flex justify-between">
            <button class="btn" @click="startLevel(currentLevel.level)">Try Again</button>
            <button class="btn" @click="nextLevel()">Next Level</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="mt-8 flex flex-col gap-8">
      <div class="flex gap-8 text-8xl font-bold font-display justify-center">
        <span>{{ currentQuestion.factors[0] }}</span>
        <span>{{ section.operator }}</span>
        <span>{{ currentQuestion.factors[1] }}</span>
      </div>
      <div class="mb-8 flex gap-4 justify-center">
        <button
          class="btn btn-lg btn-circle"
          :class="answerButtonClass(idx)"
          v-for="(answer, idx) in currentQuestion.answers"
          @click="chooseAnswer(idx)"
        >
          {{ answer }}
        </button>
      </div>

      <div class="container flex justify-between">
        <button
          class="btn btn-sm btn-accent tracking-widest"
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
          :value="questionIdx + 1"
          :max="currentLevel.questions.length"
        />
        <div class="w-1/4 text-right">
          {{ questionIdx + 1 }} / {{ currentLevel.questions.length }}
        </div>
      </div>
    </div>
  </section>
</template>
