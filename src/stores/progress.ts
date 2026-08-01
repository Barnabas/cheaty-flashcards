import { defineStore } from "pinia";
import { SessionSummary } from "../types";
import { OperatorGroup } from "../mastery";
import { SessionBest } from "./types";

export const useProgressStore = defineStore("progress", {
  state: () => ({
    bests: {} as Partial<Record<OperatorGroup, SessionBest>>,
  }),
  actions: {
    getBest(group: OperatorGroup): SessionBest | undefined {
      return this.bests[group];
    },
    // Returns true when this result beat the existing personal best.
    recordSessionResult(group: OperatorGroup, summary: SessionSummary): boolean {
      const existing = this.bests[group];
      const isNewBest =
        !existing ||
        summary.percentCorrect > existing.percentCorrect ||
        (summary.percentCorrect === existing.percentCorrect &&
          summary.sessionTime < existing.sessionTime);

      this.bests[group] = {
        percentCorrect: isNewBest ? summary.percentCorrect : existing.percentCorrect,
        sessionTime: isNewBest ? summary.sessionTime : existing.sessionTime,
        questionTimeAverage: isNewBest ? summary.questionTimeAverage : existing.questionTimeAverage,
        achievedAt: isNewBest ? Date.now() : existing.achievedAt,
        timesPlayed: (existing?.timesPlayed ?? 0) + 1,
      };
      return isNewBest;
    },
  },
  persist: true,
});
