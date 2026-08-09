<script lang="ts" setup>
// Deliberately not in Ziggy's voice: there's already a Ziggy on the play
// screen behind this, and one Ziggy per moment still holds. It's also
// literally accurate — mastery is banked per answer, and only the round's
// score is lost.
const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>
<template>
  <div class="modal modal-open" role="dialog" aria-modal="true" data-testid="leave-confirm">
    <div class="modal-box">
      <h3 class="font-display text-lg font-bold">Leave this round?</h3>
      <p class="py-2">
        Everything you got right already counts. The round itself stops here, with no score.
      </p>
      <div class="modal-action">
        <button class="btn btn-primary" @click="emit('cancel')" data-testid="stay-button">
          Keep playing
        </button>
        <button class="btn btn-ghost" @click="emit('confirm')" data-testid="leave-button">
          Leave anyway
        </button>
      </div>
    </div>
  </div>
</template>
