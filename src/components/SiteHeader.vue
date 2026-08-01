<script lang="ts" setup>
import IconHelp from "~icons/feather/help-circle";
import IconSoundOn from "~icons/feather/volume-2";
import IconSoundOff from "~icons/feather/volume-x";
import { ref } from "vue";
import FoxMascot from "./mascot/FoxMascot.vue";
import { useSettingsStore } from "../stores/settings";

const helpModal = ref();
const settings = useSettingsStore();
</script>
<template>
  <header>
    <div class="navbar bg-base-100 font-display">
      <div class="flex-1">
        <RouterLink class="btn btn-ghost normal-case text-2xl" to="/">
          <FoxMascot pose="sly" class="w-8 h-8" label="Ziggy the fox" />
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
        <button @click="helpModal.showModal()" class="btn btn-ghost">
          <IconHelp class="w-6 h-6" />
        </button>
      </div>
    </div>
  </header>
  <dialog ref="helpModal" class="modal">
    <form method="dialog" class="modal-box">
      <h3 class="flex gap-2 items-center">
        <IconHelp class="w-6 h-6" />
        <span class="font-bold text-lg flex-1">About</span>
        <button class="btn btn-sm">Close</button>
      </h3>
      <p class="py-2 flex gap-3 items-start">
        <FoxMascot pose="sly" class="w-12 h-12 shrink-0" label="Ziggy the fox" />
        <span>
          Meet <b>Ziggy the Fox</b> — a sly trickster who's always got a shortcut up his sleeve.
          Answer correctly to move on, or ask Ziggy for a favor: <b>Eliminate 2</b> removes two
          wrong answers for 1 hint token, <b>Reveal</b> flashes the correct answer for 3 tokens.
          Each practice session starts with 5 tokens.
        </span>
      </p>
      <p class="py-2">
        Asking Ziggy for help works, but it doesn't make you any better at the facts — questions you
        cheat on don't count toward mastering that fact, and it breaks your cheat-free streak (shown
        bottom left once it starts). Keep a streak going long enough and you'll
        <b>outfox Ziggy</b> for a reward!
      </p>
      <p class="py-2 text-center">Made with ❤️ for L.J. from Uncle Barn</p>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
