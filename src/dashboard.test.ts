import { describe, expect, it } from "vite-plus/test";
import { stageBgClass, masterySummary, homeGreeting } from "./dashboard";
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

describe("homeGreeting", () => {
  it("introduces himself and the cheat mechanic to a player who hasn't started", () => {
    const greeting = homeGreeting({ total: 8, mastered: 0, started: 0 });
    expect(greeting.pose).toBe("wink");
    expect(greeting.lines.join(" ")).toContain("I'm Ziggy");
  });

  it("falls back to the introduction rather than dividing by an empty pool", () => {
    expect(homeGreeting({ total: 0, mastered: 0, started: 0 }).lines.join(" ")).toContain(
      "I'm Ziggy",
    );
  });

  it("counts progress back to a player mid-way through", () => {
    const greeting = homeGreeting({ total: 8, mastered: 2, started: 5 });
    expect(greeting.pose).toBe("neutral");
    expect(greeting.lines[0]).toContain("2 of 8");
  });

  it("gets excited once half the active facts are mastered", () => {
    expect(homeGreeting({ total: 8, mastered: 4, started: 8 }).pose).toBe("gleeful");
  });

  it("concedes the whole set when everything active is mastered", () => {
    const greeting = homeGreeting({ total: 8, mastered: 8, started: 8 });
    expect(greeting.pose).toBe("gleeful");
    expect(greeting.lines[0]).toContain("All 8");
  });

  it("always speaks in first person, never about himself in the third", () => {
    const summaries = [
      { total: 8, mastered: 0, started: 0 },
      { total: 8, mastered: 2, started: 5 },
      { total: 8, mastered: 4, started: 8 },
      { total: 8, mastered: 8, started: 8 },
    ];
    for (const summary of summaries) {
      expect(homeGreeting(summary).lines.join(" ")).not.toContain("Ziggy's");
    }
  });
});
