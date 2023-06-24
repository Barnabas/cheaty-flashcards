<script lang="ts" setup>
import IconLogo from "~icons/feather/zap";
import IconHelp from "~icons/feather/help-circle";
import { ref } from "vue";

const helpModal = ref();
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
        Cheaty Flashcards is a game where you can learn math and cheat a little bit too.
        The object of the game is to get as <i>few</i> points as possible, kind of like golf.
        Points are displayed on the bottom left and gradually go up with time.
      </p>
      <p class="py-2">
        You can cheat a couple of times in each level, but every cheat will add 1 point.
        Wrong answers add 1 point too, but right answers subtract 1 point.
      </p>
      <p class="py-2 text-center">Made with ❤️ for L.J. from Uncle Barn</p>
    </form>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>
