// Ziggy's help, and what it costs: the hint-token budget plus the two things
// it buys. Kept apart from the rest of the session runtime because this is
// the piece the economy rework changes (see docs/game-vision.md) — the
// session only has to know that a hint was bought, not how it was priced.
import { ComputedRef, Ref, computed, ref } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import { AnswerType, Question } from "../types";
import { playSound } from "../sounds";
import { shuffle } from "../utils";

// Tiered costs. Eliminating two wrong answers still leaves recall work to do,
// so it's cheap; revealing the answer outright skips recall entirely, so it
// costs much more.
export const START_HINT_TOKENS = 5;
export const ELIMINATE_COST = 1;
export const REVEAL_COST = 3;

const REVEAL_FLASH_MS = 1000;

export function useHintTokens(options: {
  question: ComputedRef<Question>;
  answerTypes: Ref<Record<number, AnswerType>>;
  // True while an answered question is still on screen — nothing can be
  // bought for a question that's already resolved.
  locked: Ref<boolean>;
  onSpend: () => void;
}) {
  const { question, answerTypes, locked, onSpend } = options;
  const tokens = ref(0);

  // Untried, not-yet-hidden wrong answers — what "Eliminate 2" has left to
  // hide. Once this runs out the button disables itself.
  const eliminableIndices = computed<number[]>(() =>
    question.value.answers
      .map((value, index) => ({ value, index }))
      .filter(
        ({ value, index }) =>
          value !== question.value.correct && answerTypes.value[index] === undefined,
      )
      .map(({ index }) => index),
  );
  const canEliminate = computed(
    () => !locked.value && tokens.value >= ELIMINATE_COST && eliminableIndices.value.length > 0,
  );
  const canReveal = computed(() => !locked.value && tokens.value >= REVEAL_COST);

  // Tracked so it can be cancelled: an untracked cleanup used to survive into
  // the next question (or a Replay) and clear the wrong highlight.
  const { start: startRevealFlash, stop: cancelRevealFlash } = useTimeoutFn(
    (index: number) => {
      if (answerTypes.value[index] === "hint") delete answerTypes.value[index];
    },
    REVEAL_FLASH_MS,
    { immediate: false },
  );

  function eliminate() {
    if (!canEliminate.value) return;
    playSound("cheat");
    shuffle([...eliminableIndices.value])
      .slice(0, 2)
      .forEach((index) => {
        answerTypes.value[index] = "hide";
      });
    tokens.value -= ELIMINATE_COST;
    onSpend();
  }

  function reveal() {
    if (!canReveal.value) return;
    const index = question.value.answers.findIndex((a) => a === question.value.correct);
    playSound("cheat");
    answerTypes.value[index] = "hint";
    tokens.value -= REVEAL_COST;
    onSpend();
    startRevealFlash(index);
  }

  function refill() {
    tokens.value = START_HINT_TOKENS;
    cancelRevealFlash();
  }

  return { tokens, canEliminate, canReveal, eliminate, reveal, refill, cancelRevealFlash };
}
