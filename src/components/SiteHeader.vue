<script lang="ts" setup>
import IconLogo from "~icons/feather/zap";
import IconHelp from "~icons/feather/help-circle";
import IconSoundOn from "~icons/feather/volume-2";
import IconSoundOff from "~icons/feather/volume-x";
import { ref } from "vue";
import { useSettingsStore } from "../stores/settings";

const helpModal = ref();
const settings = useSettingsStore();
</script>
<template>
  <header>
    <div class="navbar bg-base-100 font-display">
      <div class="flex-1">
        <RouterLink class="btn btn-ghost normal-case text-2xl" to="/">
          <IconLogo />
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
      <p class="py-2">
        Cheaty Flashcards is a game where you can learn math and cheat a little bit too. Answer
        correctly to move on, or spend hint tokens to cheat: <b>Eliminate 2</b> removes two wrong
        answers for 1 token, <b>Reveal</b> flashes the correct answer for 3 tokens. Each level
        starts with 5 tokens.
      </p>
      <p class="py-2">
        Cheating works, but it doesn't help you get faster at the facts — questions you cheat on
        don't count toward mastering that fact, and cheating breaks your cheat-free streak (shown
        bottom left once it starts). Keep the streak going for a reward!
      </p>
      <p class="py-2 text-center">Made with ❤️ for L.J. from Uncle Barn</p>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
