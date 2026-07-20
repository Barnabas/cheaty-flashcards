import { defineStore } from "pinia";
import { FamilyMastery } from "./types";
import { MasteryOutcome, applyOutcome } from "../mastery";

const emptyMastery: FamilyMastery = { stage: 0, timesSeen: 0, timesCorrect: 0, lastSeen: null };

export const useMasteryStore = defineStore("mastery", {
  state: () => ({
    families: {} as Record<string, FamilyMastery>,
  }),
  actions: {
    getFamily(key: string): FamilyMastery {
      return this.families[key] ?? emptyMastery;
    },
    // Applies the pure Leitner transition for one attempt and persists it.
    recordAttempt(key: string, outcome: MasteryOutcome) {
      this.families[key] = applyOutcome(this.families[key], outcome);
    },
  },
  persist: true,
});
