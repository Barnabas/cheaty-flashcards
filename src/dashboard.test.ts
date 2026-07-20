import { describe, expect, it } from "vite-plus/test";
import { stageBgClass, masterySummary } from "./dashboard";
import { familyPool } from "./mastery";
import { FamilyMastery } from "./stores/types";

describe("stageBgClass", () => {
  it("returns a distinct class per stage 0-5", () => {
    const classes = new Set([0, 1, 2, 3, 4, 5].map(stageBgClass));
    expect(classes.size).toBe(6);
  });

  it("clamps out-of-range stages instead of erroring", () => {
    expect(stageBgClass(-1)).toBe(stageBgClass(0));
    expect(stageBgClass(99)).toBe(stageBgClass(5));
  });
});

describe("masterySummary", () => {
  const pool = familyPool("add", 2, 3); // {2,3,5}, {2,2,4}, {3,3,6}
  const families: Record<string, FamilyMastery> = {
    "add:2,3,5": { stage: 5, timesSeen: 10, timesCorrect: 10, lastSeen: 1 },
    "add:2,2,4": { stage: 2, timesSeen: 3, timesCorrect: 1, lastSeen: 1 },
  };
  const getMastery = (key: string) => families[key];

  it("counts total families in the pool", () => {
    expect(masterySummary(pool, getMastery).total).toBe(3);
  });

  it("counts only families that have actually been seen as started", () => {
    expect(masterySummary(pool, getMastery).started).toBe(2);
  });

  it("counts only fully-promoted families as mastered", () => {
    expect(masterySummary(pool, getMastery).mastered).toBe(1);
  });

  it("treats an unseen family as neither started nor mastered", () => {
    const empty = masterySummary(pool, () => undefined);
    expect(empty).toEqual({ total: 3, mastered: 0, started: 0 });
  });
});
