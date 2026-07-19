import { defineStore } from "pinia";
import { LevelSummary } from "../types";
import { PersonalBest } from "./types";

function bestKey(sectionId: string, level: number) {
  return `${sectionId}:${level}`;
}

export const useProgressStore = defineStore("progress", {
  state: () => ({
    personalBests: {} as Record<string, PersonalBest>,
  }),
  actions: {
    getPersonalBest(sectionId: string, level: number): PersonalBest | undefined {
      return this.personalBests[bestKey(sectionId, level)];
    },
    // Returns true when this result beat the existing personal best.
    recordLevelResult(sectionId: string, level: number, summary: LevelSummary): boolean {
      const key = bestKey(sectionId, level);
      const existing = this.personalBests[key];
      const isNewBest =
        !existing ||
        summary.percentCorrect > existing.percentCorrect ||
        (summary.percentCorrect === existing.percentCorrect &&
          summary.levelTime < existing.levelTime);

      this.personalBests[key] = {
        percentCorrect: isNewBest ? summary.percentCorrect : existing.percentCorrect,
        levelTime: isNewBest ? summary.levelTime : existing.levelTime,
        questionTimeAverage: isNewBest ? summary.questionTimeAverage : existing.questionTimeAverage,
        achievedAt: isNewBest ? Date.now() : existing.achievedAt,
        timesPlayed: (existing?.timesPlayed ?? 0) + 1,
      };
      return isNewBest;
    },
  },
  persist: true,
});
