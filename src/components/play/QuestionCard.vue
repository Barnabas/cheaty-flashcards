<script lang="ts" setup>
import { AnswerType, Question } from "../../types";

const props = defineProps<{
  question: Question;
  answerTypes: Record<number, AnswerType>;
}>();

const emit = defineEmits<{
  choose: [index: number];
}>();

function answerButtonClass(index: number) {
  const answerType = props.answerTypes[index];
  return {
    "btn-outline": answerType === undefined,
    "btn-error": answerType === "wrong",
    "btn-info": answerType === "hint",
    "btn-success": answerType === "right",
    "opacity-10": answerType === "hide",
  };
}
</script>
<template>
  <div
    class="flex gap-8 text-8xl font-bold font-display justify-center"
    data-testid="question-card"
  >
    <span>{{ question.factors[0] }}</span>
    <span>{{ question.operator }}</span>
    <span>{{ question.factors[1] }}</span>
  </div>
  <div class="flex gap-2 md:gap-4 lg:gap-8 justify-center">
    <button
      class="btn btn-lg btn-circle"
      :class="answerButtonClass(idx)"
      v-for="(answer, idx) in question.answers"
      @click="emit('choose', idx)"
      data-testid="answer-button"
    >
      {{ answer }}
    </button>
  </div>
</template>
