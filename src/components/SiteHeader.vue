<script lang="ts" setup>
import IconHeart from "~icons/feather/heart";
import IconHelp from "~icons/feather/help-circle";
import IconSoundOn from "~icons/feather/volume-2";
import IconSoundOff from "~icons/feather/volume-x";
import { ref } from "vue";
import ZiggyImage from "./mascot/ZiggyImage.vue";
import ZiggySpeaks from "./mascot/ZiggySpeaks.vue";
import { useSettingsStore } from "../stores/settings";

const helpModal = ref();
const settings = useSettingsStore();

// The help modal is Ziggy explaining his own racket, in his own words — the
// one place the rules get spelled out, so it's worth the extra lines.
const helpLines = [
  "I'm Ziggy. Answer right and you move on — or ask me for a favour.",
  "Hide 2 wrong answers costs 1 hint token. Beg me to reveal it costs 3. You get 5 a session.",
  "Careful though: I don't teach you anything. Facts you cheat on don't count toward mastering them, and it snaps your cheat-free streak.",
  "Keep that streak alive long enough and you've officially outfoxed me.",
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
        for L.J. from Uncle Barn
      </p>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
