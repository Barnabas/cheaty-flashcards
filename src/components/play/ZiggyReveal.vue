<script lang="ts" setup>
// Ziggy taking a question back after a second miss (Phase 12). He states the
// answer out loud — the point is that the player leaves the question knowing
// it, not that they're told off — and he's smug about keeping the card, never
// about the player's ability (docs/game-vision.md, "Ziggy's rules").
//
// A toast rather than an inline bubble so the question and answer buttons
// don't jump underneath it, and so it shares StreakToast's shape: on the play
// screen, Ziggy showing up means a moment just happened.
import { computed } from "vue";
import ZiggyImage from "../mascot/ZiggyImage.vue";
import { Question } from "../../types";

const props = defineProps<{
  // null whenever Ziggy hasn't taken the current question.
  question: Question | null;
}>();

const LINES = [
  "Mine. Say it with me:",
  "I'll hang onto that one:",
  "Still my card:",
  "Not this time:",
];

const line = computed(() => {
  const question = props.question;
  if (!question) return "";
  // Indexed by the answer rather than picked at random, so the same fact
  // doesn't get a different taunt every time it's missed and nothing has to
  // hold a counter.
  const taunt = LINES[question.correct % LINES.length];
  return `${taunt} ${question.factors[0]} ${question.operator} ${question.factors[1]} is ${question.correct}.`;
});
</script>
<template>
  <div
    v-if="question"
    class="toast toast-top toast-center z-10"
    role="status"
    data-testid="ziggy-reveal"
  >
    <div class="alert alert-warning shadow-lg">
      <ZiggyImage
        pose="gleeful"
        class="h-9 w-9 shrink-0 rounded-full bg-base-100"
        label="Ziggy, keeping the card"
      />
      <span>{{ line }}</span>
    </div>
  </div>
</template>
