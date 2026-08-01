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
