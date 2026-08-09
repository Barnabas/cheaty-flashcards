// The runtime of one practice session: the question queue, answer handling,
// hint-token spending, and the end condition. `PlayPage.vue` owns the
// intro/active/outro phase machine and everything route-shaped; everything
// that happens between "Start practicing" and the summary lives here.
import { MaybeRefOrGetter, computed, ref, toValue, watch } from "vue";
import { createEventHook, refAutoReset, useTimeoutFn } from "@vueuse/core";
import {
  SESSION_MAX_QUESTIONS,
  SessionFamilyStatus,
  buildFollowUpQuestions,
  buildInitialQuestions,
  buildSessionTargetKeys,
  hasReachedHardCap,
  isSessionComplete,
  permutationKey,
} from "../session";
import { AnswerType, Question, SessionSummary } from "../types";
import { useHintTokens } from "./useHintTokens";
import { playSound } from "../sounds";
import { celebrate, celebrateBig } from "../confetti";
import { SessionMetrics } from "../utils";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { useWalletStore } from "../stores/wallet";
import { FAST_RESPONSE_MS, FactFamily, MAX_STAGE, MasteryOutcome, OperatorGroup } from "../mastery";
import { isStreakMilestone } from "../streak";
import { SESSION_CLEAR_THRESHOLD } from "../milestones";
import { CLEAN_SESSION_REWARD, streakMilestoneReward } from "../wallet";

const FOLLOW_UP_BATCH_SIZE = 4;
// How long a correct answer stays on screen before the next question (or the
// outro) takes over.
const HAND_OFF_MS = 500;
// Ziggy's own reveal has a sentence to read on top of the answer, so it holds
// the screen much longer than a green flash does.
const ZIGGY_REVEAL_MS = 2600;
// Misses allowed per question before Ziggy takes it back and shows the answer
// himself. Two, so a slip has a second chance but tapping every button never
// gets you to the right one.
const MISS_LIMIT = 2;
const STREAK_TOAST_MS = 2500;

// What a streak milestone is worth to the player: the count Ziggy is annoyed
// about, and what he actually paid for it (which the cap can clip to 0).
export type StreakPayout = { streak: number; tokens: number };

const EMPTY_QUESTION: Question = {
  operator: "+",
  familyKey: "",
  factors: [],
  correct: 0,
  answers: [],
};

export function usePlaySession(group: MaybeRefOrGetter<OperatorGroup | undefined>) {
  const progressStore = useProgressStore();
  const mastery = useMasteryStore();
  const streak = useStreakStore();
  const wallet = useWalletStore();

  const questions = ref<Question[]>([]);
  const questionIndex = ref(0);
  const answerTypes = ref<Record<number, AnswerType>>({});
  const summary = ref<SessionSummary | null>(null);
  const isNewBest = ref(false);
  const missesThisQuestion = ref(0);
  const hintUsedThisQuestion = ref(false);
  // The question Ziggy has taken over after a second miss — non-null only
  // while he's on screen showing the answer himself. Also stretches the
  // hand-off, since there's a line to read before the next question lands.
  const ziggyReveal = ref<Question | null>(null);
  // Auto-clears itself, so nothing has to remember to take the toast down.
  const streakMilestone = refAutoReset<StreakPayout | null>(null, STREAK_TOAST_MS);
  // Ziggy's side of the economy for this session: what he's paid out so far,
  // and whether the end-of-session bonus for asking him for nothing landed.
  const tokensEarned = ref(0);
  const cleanSessionBonus = ref(0);
  const hintsBought = ref(0);
  // True from the moment a question is answered correctly until the next one
  // is on screen. Nothing about the current question may change in that
  // window — without it, a double-tap during the hand-off records a spurious
  // extra "wrong" attempt, and a reveal could still be bought for a question
  // that's already been answered.
  const isResolving = ref(false);
  let metrics = new SessionMetrics();

  // The session's fixed target-family set, snapshotted at begin() so a
  // focus-input edit mid-session (not exposed in the UI, but defensive)
  // can't shift the goalposts underneath an in-progress session.
  const families = ref<FactFamily[]>([]);
  // One entry per (family, operator) permutation — both directions of every
  // target family must clear before the session can end.
  const targetKeys = ref<string[]>([]);
  const familyStatus = ref<Record<string, SessionFamilyStatus>>({});
  const stageBefore = ref<Record<string, number>>({});

  const sessionEnd = createEventHook<SessionSummary>();

  const currentQuestion = computed<Question>(
    () => questions.value[questionIndex.value] || EMPTY_QUESTION,
  );
  const currentAnswers = computed<number[]>(() => currentQuestion.value.answers);

  const hints = useHintTokens({
    question: currentQuestion,
    answerTypes,
    locked: isResolving,
    onSpend: markCheated,
  });

  // How much of the session's end condition is met: one step per (family,
  // operator) permutation cleared, so the bar fills exactly as the session
  // approaches its real ending. The high-water mark is belt-and-braces since
  // Phase 12 stopped follow-up batches re-asking clean permutations — but a
  // bar that walks backwards reads as lost work, and Phases 14/16 are going
  // to put cards back in play mid-session on purpose.
  const clearedTargetCount = computed(
    () => targetKeys.value.filter((key) => familyStatus.value[key] === "clean").length,
  );
  const progressValue = ref(0);
  const progressMax = computed(() => Math.max(targetKeys.value.length, 1));
  watch(clearedTargetCount, (cleared) => {
    if (cleared > progressValue.value) progressValue.value = cleared;
  });

  // Read by useTimeoutFn at start() time, so setting `ziggyReveal` before
  // handing off is what buys the longer pause.
  const handOffMs = computed(() => (ziggyReveal.value ? ZIGGY_REVEAL_MS : HAND_OFF_MS));
  const { start: startHandOff, stop: stopHandOff } = useTimeoutFn(
    (isFinalAnswer: boolean) => {
      if (isFinalAnswer) {
        finish();
        return;
      }
      metrics.beginQuestion();
      questionIndex.value += 1;
      ensureQueueHasNext();
      answerTypes.value = {};
      missesThisQuestion.value = 0;
      hintUsedThisQuestion.value = false;
      ziggyReveal.value = null;
      isResolving.value = false;
    },
    handOffMs,
    { immediate: false },
  );

  function dismissStreakMilestone() {
    // Writing the ref restarts refAutoReset's timer, so only write when
    // there's actually a toast to take down.
    if (streakMilestone.value !== null) streakMilestone.value = null;
  }

  // Cheated-to or eventually-correct-after-a-wrong-guess answers still count
  // as "known", but don't earn the fast-recall promotion a clean, quick
  // answer does.
  function recordFamilyOutcome() {
    let outcome: MasteryOutcome;
    if (hintUsedThisQuestion.value) {
      outcome = "cheated";
    } else if (missesThisQuestion.value > 0) {
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

  // The streak is the earning engine now, not a guilt meter: every milestone
  // it celebrates also pays. Spending resets the streak, which is what puts a
  // player who just bought help back on the cheap early milestones.
  function recordStreak() {
    if (hintUsedThisQuestion.value) return;
    const newStreak = streak.recordClean();
    if (isStreakMilestone(newStreak)) {
      const paid = wallet.earn(streakMilestoneReward(newStreak));
      tokensEarned.value += paid;
      streakMilestone.value = { streak: newStreak, tokens: paid };
      playSound("streak_milestone");
      celebrate(0.15);
    }
  }

  function ensureQueueHasNext() {
    const g = toValue(group);
    if (!g) return;
    if (
      questionIndex.value >= questions.value.length &&
      questions.value.length < SESSION_MAX_QUESTIONS
    ) {
      const batchSize = Math.min(
        FOLLOW_UP_BATCH_SIZE,
        SESSION_MAX_QUESTIONS - questions.value.length,
      );
      questions.value.push(
        ...buildFollowUpQuestions(g, families.value, familyStatus.value, batchSize, {
          getMastery: (key) => mastery.getFamily(key),
        }),
      );
    }
  }

  function currentPermutationKey() {
    return permutationKey(currentQuestion.value.familyKey, currentQuestion.value.operator);
  }

  function chooseAnswer(index: number) {
    if (isResolving.value) return;
    if (
      answerTypes.value[index] !== "right" &&
      currentAnswers.value[index] === currentQuestion.value.correct
    ) {
      metrics.answerQuestion("right");
      recordFamilyOutcome();
      recordStreak();
      familyStatus.value[currentPermutationKey()] = hintUsedThisQuestion.value ? "retry" : "clean";

      // Every correct answer gets the same feedback, including the one that
      // ends the session — it used to jump straight to the outro, making the
      // climax of a session the one answer with no green flash and no sound.
      isResolving.value = true;
      playSound("correct");
      hints.cancelRevealFlash();
      currentAnswers.value.forEach((_, other) => {
        answerTypes.value[other] = other === index ? "right" : "hide";
      });

      const elapsed = Date.now() - metrics.sessionStart;
      startHandOff(
        isSessionComplete(familyStatus.value, targetKeys.value) ||
          hasReachedHardCap(metrics.questionsTotal, elapsed),
      );
    } else if (answerTypes.value[index] !== "wrong") {
      metrics.answerQuestion("wrong");
      playSound("wrong");
      answerTypes.value[index] = "wrong";
      missesThisQuestion.value += 1;
      // The family takes its hit once per question, on the first miss — a
      // second miss is the same question still being wrong, not a second
      // demotion.
      if (missesThisQuestion.value === 1) {
        mastery.recordAttempt(currentQuestion.value.familyKey, "wrong");
        familyStatus.value[currentPermutationKey()] = "retry";
      }
      if (missesThisQuestion.value >= MISS_LIMIT) ziggyTakesTheCard();
    }
  }

  // Second miss: Ziggy shows the answer himself, for free, and play moves on.
  // The permutation stays "retry" so the session will come back to it, but
  // there's nothing left to tap — which is what stops working through every
  // button from ever being a strategy.
  function ziggyTakesTheCard() {
    isResolving.value = true;
    dismissStreakMilestone();
    hints.cancelRevealFlash();
    const correctIndex = currentAnswers.value.findIndex(
      (answer) => answer === currentQuestion.value.correct,
    );
    if (correctIndex >= 0) answerTypes.value[correctIndex] = "hint";
    ziggyReveal.value = currentQuestion.value;

    const elapsed = Date.now() - metrics.sessionStart;
    startHandOff(hasReachedHardCap(metrics.questionsTotal, elapsed));
  }

  function begin(targetFamilies: FactFamily[]) {
    const g = toValue(group);
    if (!g) return;
    families.value = targetFamilies;
    targetKeys.value = buildSessionTargetKeys(g, targetFamilies);
    stageBefore.value = Object.fromEntries(
      targetFamilies.map((f) => [f.key, mastery.getFamily(f.key).stage]),
    );
    familyStatus.value = Object.fromEntries(targetKeys.value.map((key) => [key, "pending"]));

    playSound("level_start");
    metrics = new SessionMetrics();
    metrics.beginQuestion();

    questions.value = buildInitialQuestions(g, targetFamilies, {
      getMastery: (key) => mastery.getFamily(key),
    });
    // The wallet carries over between sessions, so there's nothing to refill —
    // only a stale reveal-flash timer to cancel.
    hints.cancelRevealFlash();
    tokensEarned.value = 0;
    cleanSessionBonus.value = 0;
    hintsBought.value = 0;
    summary.value = null;
    questionIndex.value = 0;
    progressValue.value = 0;
    answerTypes.value = {};
    dismissStreakMilestone();
    stopHandOff();
    missesThisQuestion.value = 0;
    hintUsedThisQuestion.value = false;
    ziggyReveal.value = null;
    isResolving.value = false;
  }

  function finish() {
    const g = toValue(group);
    if (!g) return;
    playSound("level_end");
    // Asked Ziggy for nothing all session, so he pays. Deliberately not tied
    // to the score: a player who's struggling but never buys help still earns,
    // which is what keeps an empty wallet from staying empty.
    cleanSessionBonus.value = hintsBought.value === 0 ? wallet.earn(CLEAN_SESSION_REWARD) : 0;
    tokensEarned.value += cleanSessionBonus.value;
    const result = metrics.endSession();
    summary.value = result;
    isNewBest.value = progressStore.recordSessionResult(g, result);
    if (isNewBest.value) {
      playSound("badge");
      celebrateBig();
    } else if (result.percentCorrect >= SESSION_CLEAR_THRESHOLD) {
      celebrate();
    }
    // Handlers are synchronous phase switches; nothing waits on them.
    void sessionEnd.trigger(result);
  }

  // A purchase, not a sin: the fact stays Ziggy's (no mastery credit) and the
  // streak goes back to zero, but nothing here scolds — the player made a
  // trade and paid the price up front.
  function markCheated() {
    hintUsedThisQuestion.value = true;
    hintsBought.value += 1;
    streak.recordCheat();
    dismissStreakMilestone();
  }

  return {
    // state the play screen renders
    currentQuestion,
    answerTypes,
    hintTokens: hints.tokens,
    canEliminate: hints.canEliminate,
    canReveal: hints.canReveal,
    eliminateWrong: hints.eliminate,
    revealAnswer: hints.reveal,
    streakMilestone,
    ziggyReveal,
    progressValue,
    progressMax,
    // what the outro renders
    summary,
    isNewBest,
    families,
    stageBefore,
    tokensEarned,
    cleanSessionBonus,
    // actions
    begin,
    chooseAnswer,
    onSessionEnd: sessionEnd.on,
  };
}
