import { describe, expect, it } from "vite-plus/test";
import { highestClearedLevel, LEVEL_CLEAR_THRESHOLD } from "./milestones";
import { PersonalBest } from "./stores/types";

function best(percentCorrect: number): PersonalBest {
  return {
    percentCorrect,
    levelTime: 1000,
    questionTimeAverage: 100,
    achievedAt: 0,
    timesPlayed: 1,
  };
}

describe("highestClearedLevel", () => {
  it("returns 0 when nothing has been played", () => {
    expect(highestClearedLevel("add", 8, () => undefined)).toBe(0);
  });

  it("returns 0 when no personal best meets the clear threshold", () => {
    const bests: Record<number, PersonalBest> = { 1: best(0.5), 2: best(0.79) };
    expect(highestClearedLevel("add", 8, (_id, level) => bests[level])).toBe(0);
  });

  it("returns the highest level at or above the clear threshold", () => {
    const bests: Record<number, PersonalBest> = {
      1: best(LEVEL_CLEAR_THRESHOLD),
      3: best(0.95),
      5: best(0.5),
    };
    expect(highestClearedLevel("add", 8, (_id, level) => bests[level])).toBe(3);
  });

  it("doesn't require earlier levels to also be cleared", () => {
    const bests: Record<number, PersonalBest> = { 6: best(1) };
    expect(highestClearedLevel("add", 8, (_id, level) => bests[level])).toBe(6);
  });

  it("only looks up to maxLevel", () => {
    const bests: Record<number, PersonalBest> = { 9: best(1) };
    expect(highestClearedLevel("add", 8, (_id, level) => bests[level])).toBe(0);
  });
});
