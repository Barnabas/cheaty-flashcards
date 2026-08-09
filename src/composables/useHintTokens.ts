// Ziggy's help, and what it costs: the two things a player can buy mid-question
// and the wallet they're paid for out of. Kept apart from the rest of the
// session runtime because the session only has to know that a hint was bought,
// not how it was priced. Since Phase 13 the balance is a persistent wallet
// (../wallet.ts, ../stores/wallet.ts), not a per-session allowance — so a
// question is the only thing that resets here.
import { ComputedRef, Ref, computed } from "vue";
import { useTimeoutFn } from "@vueuse/core";
import { AnswerType, Question } from "../types";
import { playSound } from "../sounds";
import { shuffle } from "../utils";
import { ELIMINATE_COST, REVEAL_COST } from "../wallet";
import { useWalletStore } from "../stores/wallet";

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
  const wallet = useWalletStore();
  const tokens = computed(() => wallet.tokens);

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
    () => !locked.value && wallet.canAfford(ELIMINATE_COST) && eliminableIndices.value.length > 0,
  );
  const canReveal = computed(() => !locked.value && wallet.canAfford(REVEAL_COST));

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
    if (!wallet.spend(ELIMINATE_COST)) return;
    playSound("cheat");
    shuffle([...eliminableIndices.value])
      .slice(0, 2)
      .forEach((index) => {
        answerTypes.value[index] = "hide";
      });
    onSpend();
  }

  function reveal() {
    if (!canReveal.value) return;
    if (!wallet.spend(REVEAL_COST)) return;
    const index = question.value.answers.findIndex((a) => a === question.value.correct);
    playSound("cheat");
    answerTypes.value[index] = "hint";
    onSpend();
    startRevealFlash(index);
  }

  return { tokens, canEliminate, canReveal, eliminate, reveal, cancelRevealFlash };
}
