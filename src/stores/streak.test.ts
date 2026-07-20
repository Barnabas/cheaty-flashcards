import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createPinia, setActivePinia } from "pinia";
import { useStreakStore } from "./streak";

describe("useStreakStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("starts at 0", () => {
    expect(useStreakStore().current).toBe(0);
  });

  it("increments on each clean answer and returns the new count", () => {
    const streak = useStreakStore();
    expect(streak.recordClean()).toBe(1);
    expect(streak.recordClean()).toBe(2);
    expect(streak.current).toBe(2);
  });

  it("resets to 0 on a cheat", () => {
    const streak = useStreakStore();
    streak.recordClean();
    streak.recordClean();
    streak.recordCheat();
    expect(streak.current).toBe(0);
  });
});
