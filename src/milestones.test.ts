import { describe, expect, it } from "vite-plus/test";
import { hasClearedGroup, SESSION_CLEAR_THRESHOLD } from "./milestones";
import { SessionBest } from "./stores/types";

function best(percentCorrect: number): SessionBest {
  return {
    percentCorrect,
    sessionTime: 1000,
    questionTimeAverage: 100,
    achievedAt: 0,
    timesPlayed: 1,
  };
}

describe("hasClearedGroup", () => {
  it("is false when nothing has been played", () => {
    expect(hasClearedGroup("add", () => undefined)).toBe(false);
  });

  it("is false when the best doesn't meet the clear threshold", () => {
    expect(hasClearedGroup("add", () => best(0.79))).toBe(false);
  });

  it("is true once the best meets or exceeds the clear threshold", () => {
    expect(hasClearedGroup("add", () => best(SESSION_CLEAR_THRESHOLD))).toBe(true);
    expect(hasClearedGroup("add", () => best(0.95))).toBe(true);
  });
});
