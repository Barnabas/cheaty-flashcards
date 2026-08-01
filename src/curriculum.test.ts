import { describe, expect, it } from "vite-plus/test";
import {
  STARTER_FAMILY_COUNT,
  UNLOCK_MIN_SEEN,
  UNLOCK_STAGE_THRESHOLD,
  curriculumOrder,
  isReadyToUnlock,
  nextFamilyToUnlock,
  seedStarterFamilies,
} from "./curriculum";
import { familyPool } from "./mastery";
import { FamilyMastery } from "./stores/types";

describe("curriculumOrder", () => {
  it("orders add families ascending by sum", () => {
    const ordered = curriculumOrder(familyPool("add", 2, 4));
    const sums = ordered.map((f) => f.a + f.b);
    for (let i = 1; i < sums.length; i++) expect(sums[i]).toBeGreaterThanOrEqual(sums[i - 1]);
  });

  it("orders multiply families ascending by product", () => {
    const ordered = curriculumOrder(familyPool("multiply", 2, 4));
    const products = ordered.map((f) => f.a * f.b);
    for (let i = 1; i < products.length; i++) {
      expect(products[i]).toBeGreaterThanOrEqual(products[i - 1]);
    }
  });

  it("starts with the smallest fact family", () => {
    const ordered = curriculumOrder(familyPool("add"));
    expect(ordered[0]).toMatchObject({ a: 2, b: 2 });
  });
});

describe("seedStarterFamilies", () => {
  it("returns the first STARTER_FAMILY_COUNT families in teaching order", () => {
    const starters = seedStarterFamilies("add");
    expect(starters).toHaveLength(STARTER_FAMILY_COUNT);
    expect(starters).toEqual(curriculumOrder(familyPool("add")).slice(0, STARTER_FAMILY_COUNT));
  });
});

describe("isReadyToUnlock", () => {
  const families = familyPool("add", 2, 3); // (2,2) (2,3) (3,3)

  function mastery(stage: number, timesSeen: number): FamilyMastery {
    return { stage, timesSeen, timesCorrect: 0, lastSeen: null };
  }

  it("is false with no active families", () => {
    expect(isReadyToUnlock([], () => undefined)).toBe(false);
  });

  it("is false when any active family is below the stage threshold", () => {
    const table: Record<string, FamilyMastery> = {
      [families[0].key]: mastery(UNLOCK_STAGE_THRESHOLD, UNLOCK_MIN_SEEN),
      [families[1].key]: mastery(UNLOCK_STAGE_THRESHOLD - 1, UNLOCK_MIN_SEEN),
    };
    expect(isReadyToUnlock([families[0], families[1]], (key) => table[key])).toBe(false);
  });

  it("is false when a family hasn't been seen enough times, even at full stage", () => {
    const table: Record<string, FamilyMastery> = {
      [families[0].key]: mastery(UNLOCK_STAGE_THRESHOLD, UNLOCK_MIN_SEEN - 1),
    };
    expect(isReadyToUnlock([families[0]], (key) => table[key])).toBe(false);
  });

  it("is true when every active family meets both thresholds", () => {
    const table: Record<string, FamilyMastery> = {
      [families[0].key]: mastery(UNLOCK_STAGE_THRESHOLD, UNLOCK_MIN_SEEN),
      [families[1].key]: mastery(UNLOCK_STAGE_THRESHOLD + 1, 10),
    };
    expect(isReadyToUnlock([families[0], families[1]], (key) => table[key])).toBe(true);
  });
});

describe("nextFamilyToUnlock", () => {
  it("returns the next family in teaching order not already active", () => {
    const ordered = curriculumOrder(familyPool("add"));
    const activeKeys = ordered.slice(0, 4).map((f) => f.key);
    expect(nextFamilyToUnlock("add", activeKeys)).toEqual(ordered[4]);
  });

  it("returns undefined once every family is active", () => {
    const allKeys = familyPool("add").map((f) => f.key);
    expect(nextFamilyToUnlock("add", allKeys)).toBeUndefined();
  });
});
