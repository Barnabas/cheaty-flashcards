import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createPinia, setActivePinia } from "pinia";
import { useCurriculumStore } from "./curriculum";
import {
  STARTER_FAMILY_COUNT,
  UNLOCK_MIN_SEEN,
  UNLOCK_STAGE_THRESHOLD,
  curriculumOrder,
} from "../curriculum";
import { familyPool } from "../mastery";
import { FamilyMastery } from "./types";

describe("useCurriculumStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts with no active families until seeded", () => {
    const curriculum = useCurriculumStore();
    expect(curriculum.activeFamilies("add")).toHaveLength(0);
  });

  it("ensureSeeded seeds the starter set once, and is a no-op afterward", () => {
    const curriculum = useCurriculumStore();
    curriculum.ensureSeeded("add");
    expect(curriculum.activeFamilies("add")).toHaveLength(STARTER_FAMILY_COUNT);
    const seeded = [...curriculum.active.add];
    curriculum.ensureSeeded("add");
    expect(curriculum.active.add).toEqual(seeded);
  });

  it("keeps groups independent", () => {
    const curriculum = useCurriculumStore();
    curriculum.ensureSeeded("add");
    expect(curriculum.activeFamilies("multiply")).toHaveLength(0);
  });

  describe("tryAutoUnlock", () => {
    it("does nothing until every active family is well-mastered", () => {
      const curriculum = useCurriculumStore();
      curriculum.ensureSeeded("add");
      expect(curriculum.tryAutoUnlock("add", () => undefined)).toBeUndefined();
      expect(curriculum.activeFamilies("add")).toHaveLength(STARTER_FAMILY_COUNT);
    });

    it("unlocks the next family once the active set is ready", () => {
      const curriculum = useCurriculumStore();
      curriculum.ensureSeeded("add");
      const good: FamilyMastery = {
        stage: UNLOCK_STAGE_THRESHOLD,
        timesSeen: UNLOCK_MIN_SEEN,
        timesCorrect: 0,
        lastSeen: null,
      };
      const unlocked = curriculum.tryAutoUnlock("add", () => good);
      expect(unlocked).toBeDefined();
      expect(curriculum.activeFamilies("add")).toHaveLength(STARTER_FAMILY_COUNT + 1);
      expect(curriculum.active.add).toContain(unlocked!.key);
    });

    it("judges only the given scope — the table just played, not everything in play", () => {
      const curriculum = useCurriculumStore();
      curriculum.active.add = familyPool("add")
        .slice(0, 20)
        .map((f) => f.key);
      const table = curriculum.activeFamilies("add").slice(0, 5);
      const tableKeys = new Set(table.map((f) => f.key));
      const good: FamilyMastery = {
        stage: UNLOCK_STAGE_THRESHOLD,
        timesSeen: UNLOCK_MIN_SEEN,
        timesCorrect: 0,
        lastSeen: null,
      };
      const untouched: FamilyMastery = { stage: 0, timesSeen: 0, timesCorrect: 0, lastSeen: null };
      const getMastery = (key: string) => (tableKeys.has(key) ? good : untouched);

      // The other 15 families are nowhere near ready, which under the old
      // whole-active-set rule would have blocked the deal indefinitely.
      expect(curriculum.tryAutoUnlock("add", getMastery, table)).toBeDefined();
      expect(curriculum.activeFamilies("add")).toHaveLength(21);
    });

    it("never unlocks for an empty scope — nothing was played, nothing is dealt", () => {
      const curriculum = useCurriculumStore();
      curriculum.ensureSeeded("add");
      const good: FamilyMastery = {
        stage: UNLOCK_STAGE_THRESHOLD,
        timesSeen: UNLOCK_MIN_SEEN,
        timesCorrect: 0,
        lastSeen: null,
      };
      expect(curriculum.tryAutoUnlock("add", () => good, [])).toBeUndefined();
      expect(curriculum.activeFamilies("add")).toHaveLength(STARTER_FAMILY_COUNT);
    });
  });

  describe("unlockBonus", () => {
    it("unlocks the next family immediately, ignoring mastery", () => {
      const curriculum = useCurriculumStore();
      curriculum.ensureSeeded("add");
      const unlocked = curriculum.unlockBonus("add");
      const expectedNext = curriculumOrder(familyPool("add"))[STARTER_FAMILY_COUNT];
      expect(unlocked).toEqual(expectedNext);
      expect(curriculum.activeFamilies("add")).toHaveLength(STARTER_FAMILY_COUNT + 1);
    });

    it("returns undefined once every family in the group is active", () => {
      const curriculum = useCurriculumStore();
      curriculum.active.add = familyPool("add").map((f) => f.key);
      expect(curriculum.unlockBonus("add")).toBeUndefined();
    });
  });
});
