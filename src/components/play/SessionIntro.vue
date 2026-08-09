<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import ZiggySpeaks from "../mascot/ZiggySpeaks.vue";
import FactFamilyShape from "../FactFamilyShape.vue";
import TokenCount from "../TokenCount.vue";
import { GROUP_LABELS } from "../../session";
import { FactFamily, OperatorGroup } from "../../mastery";
import { ZiggyPose } from "../../types";
import { useMasteryStore } from "../../stores/mastery";
import { NEW_CARD_COST, ZIGGY_PRICES } from "../../wallet";

const props = defineProps<{
  group: OperatorGroup;
  families: FactFamily[];
  highlightedKey: string | null;
  bonusFamily?: FactFamily;
  canAffordBonus: boolean;
  tokens: number;
  focus: string;
}>();

const emit = defineEmits<{
  start: [];
  bonus: [];
  focus: [value: string];
}>();

const mastery = useMasteryStore();

// Ziggy tops and tails a session: here he says what's on the table (and is
// the only thing that explains the highlighted "New!" card). Nothing else on
// this screen is him, so the one appearance has one job.
//
// `families` is a freshly seated table since Phase 12, not the player's whole
// active set — so the middle line no longer claims these are the same facts
// as last time, because usually they aren't.
const lines = computed(() => {
  if (props.highlightedKey) {
    return ["Something new for you today — the card that's glowing. The rest you've met before."];
  }
  const seenAny = props.families.some((f) => mastery.getFamily(f.key).timesSeen > 0);
  return seenAny
    ? ["Here's what I'm putting on the table. Show me you've still got them."]
    : ["These are the ones we're starting with. Try not to need me."];
});
const pose = computed<ZiggyPose>(() => (props.highlightedKey ? "gleeful" : "wink"));

// Seeded from the URL's ?focus= and kept in sync with it, so the input always
// reflects the session it actually produced.
const focusInput = ref(props.focus);
watch(
  () => props.focus,
  (value) => (focusInput.value = value),
);
</script>
<template>
  <div class="container mt-8 flex flex-col gap-6">
    <h1 class="font-display text-2xl font-bold">{{ GROUP_LABELS[group] }}</h1>
    <ZiggySpeaks size="sm" :pose="pose" :lines="lines" />
    <div class="flex flex-wrap gap-4" data-testid="intro-families">
      <FactFamilyShape
        v-for="family in families"
        :key="family.key"
        :family="family"
        :stage="mastery.getFamily(family.key).stage"
        :highlight="family.key === highlightedKey"
      />
    </div>
    <!-- The whole menu, before a single token is spent: the two things you can
         buy mid-question and the one you can buy right here. -->
    <div
      class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
      data-testid="ziggy-prices"
      aria-label="Ziggy's prices"
    >
      <span class="font-display font-bold">Ziggy's prices:</span>
      <span v-for="price in ZIGGY_PRICES" :key="price.label" class="flex items-center gap-1">
        {{ price.label }}
        <TokenCount :count="price.cost" :label="`costs ${price.cost} tokens`" />
      </span>
      <!-- Basis-full on a phone so the balance gets its own line instead of
           trailing off the end of a wrapped price list. -->
      <span class="flex items-center gap-1 basis-full sm:basis-auto sm:ml-auto">
        You have
        <TokenCount
          :count="tokens"
          :label="`${tokens} tokens to spend`"
          data-testid="hint-tokens"
        />
      </span>
    </div>
    <div class="flex flex-wrap items-center gap-4">
      <button
        v-if="bonusFamily"
        class="btn btn-secondary"
        @click="emit('bonus')"
        :disabled="!canAffordBonus"
        :title="canAffordBonus ? undefined : `You need ${NEW_CARD_COST} tokens for a new card`"
        data-testid="bonus-fact-button"
      >
        Buy a new card
        <TokenCount :count="NEW_CARD_COST" :label="`costs ${NEW_CARD_COST} tokens`" />
      </button>
      <form class="flex items-center gap-2" @submit.prevent="emit('focus', focusInput)">
        <input
          v-model="focusInput"
          type="text"
          placeholder="Focus on numbers (e.g. 7,8)"
          class="input input-bordered"
        />
        <button class="btn" type="submit">Go</button>
      </form>
    </div>
    <button
      class="btn btn-primary btn-lg self-start"
      @click="emit('start')"
      data-testid="start-session-button"
    >
      Start practicing
    </button>
  </div>
</template>
