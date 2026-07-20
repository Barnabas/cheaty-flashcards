import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createPinia, setActivePinia } from "pinia";
import { useMasteryStore } from "./mastery";

describe("useMasteryStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts every family at stage 0", () => {
    const mastery = useMasteryStore();
    expect(mastery.getFamily("add:3,6,9")).toMatchObject({ stage: 0, timesSeen: 0 });
  });

  it("promotes a family on a fast correct attempt", () => {
    const mastery = useMasteryStore();
    mastery.recordAttempt("add:3,6,9", "correct-fast");
    expect(mastery.getFamily("add:3,6,9")).toMatchObject({
      stage: 1,
      timesSeen: 1,
      timesCorrect: 1,
    });
  });

  it("demotes a family on a wrong attempt, floored at 0", () => {
    const mastery = useMasteryStore();
    mastery.recordAttempt("add:3,6,9", "wrong");
    expect(mastery.getFamily("add:3,6,9").stage).toBe(0);
  });

  it("tracks each family independently", () => {
    const mastery = useMasteryStore();
    mastery.recordAttempt("add:3,6,9", "correct-fast");
    mastery.recordAttempt("multiply:3,6,18", "wrong");
    expect(mastery.getFamily("add:3,6,9").stage).toBe(1);
    expect(mastery.getFamily("multiply:3,6,18").stage).toBe(0);
  });
});
