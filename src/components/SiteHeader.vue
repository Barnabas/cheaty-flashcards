<script lang="ts" setup>
import IconHeart from "~icons/feather/heart";
import IconHelp from "~icons/feather/help-circle";
import IconSoundOn from "~icons/feather/volume-2";
import IconSoundOff from "~icons/feather/volume-x";
import { ref } from "vue";
import ZiggyImage from "./mascot/ZiggyImage.vue";
import ZiggySpeaks from "./mascot/ZiggySpeaks.vue";
import { useSettingsStore } from "../stores/settings";
import {
  CLEAN_SESSION_REWARD,
  ELIMINATE_COST,
  NEW_CARD_COST,
  REVEAL_COST,
  WALLET_CAP,
} from "../wallet";

const helpModal = ref();
const settings = useSettingsStore();

// The help modal is Ziggy explaining his own racket, in his own words — the
// one place the rules get spelled out, so it's worth the extra lines. Since
// Phase 13 that racket is a shop, not a scolding: every favour has a price on
// it, and he pays you when you don't need him.
const helpLines = [
  "I'm Ziggy. Answer right and you move on. Miss twice and I show you the answer myself — and the card stays mine.",
  `Stuck? Buy your way out. Hide 2 wrong answers, ${ELIMINATE_COST} token. Show you the answer, ${REVEAL_COST}. Deal you a whole new card, ${NEW_CARD_COST}.`,
  "Buying is fair play. But an answer I hand you isn't one you knew, so that card stays mine and your run starts over.",
  `I pay, too: 5 right in a row without me earns a token, and finishing a session without buying anything earns ${CLEAN_SESSION_REWARD}.`,
  `Keep at most ${WALLET_CAP} tokens in your pocket. Spend them on me — there's nothing else to buy.`,
];
</script>
<template>
  <header>
    <div class="navbar bg-base-100 font-display">
      <div class="flex-1">
        <RouterLink class="btn btn-ghost normal-case text-2xl" to="/">
          <ZiggyImage pose="mark" class="w-8 h-8 rounded-full bg-base-200" label="Ziggy the fox" />
          Cheaty Flashcards
        </RouterLink>
      </div>
      <div class="flex-none">
        <button
          @click="settings.soundEnabled = !settings.soundEnabled"
          class="btn btn-ghost"
          :aria-label="settings.soundEnabled ? 'Mute sound' : 'Unmute sound'"
        >
          <IconSoundOn v-if="settings.soundEnabled" class="w-6 h-6" />
          <IconSoundOff v-else class="w-6 h-6" />
        </button>
        <button @click="helpModal.showModal()" class="btn btn-ghost" aria-label="How to play">
          <IconHelp class="w-6 h-6" />
        </button>
      </div>
    </div>
  </header>
  <dialog ref="helpModal" class="modal">
    <form method="dialog" class="modal-box">
      <h3 class="flex gap-2 items-center">
        <IconHelp class="w-6 h-6" />
        <span class="font-bold text-lg flex-1">How to play</span>
        <button class="btn btn-sm">Close</button>
      </h3>
      <ZiggySpeaks pose="wink" size="sm" :lines="helpLines" class="py-2" />
      <p class="py-2 flex items-center justify-center gap-1 text-sm">
        Made with
        <IconHeart class="w-4 h-4 text-error" aria-label="love" />
        for my niece
      </p>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
