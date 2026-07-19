import { defineStore } from "pinia";
import { FamilyMastery } from "./types";

const emptyMastery: FamilyMastery = { stage: 0, timesSeen: 0, timesCorrect: 0, lastSeen: null };

export const useMasteryStore = defineStore("mastery", {
  state: () => ({
    families: {} as Record<string, FamilyMastery>,
  }),
  actions: {
    getFamily(key: string): FamilyMastery {
      return this.families[key] ?? emptyMastery;
    },
  },
  persist: true,
});
