import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { useSettingsStore } from "./settings";
import { useProgressStore } from "./progress";
import { useMasteryStore } from "./mastery";
import { useStreakStore } from "./streak";
import { LevelSummary } from "../types";

// Pinia only activates plugins once installed on a real app (pinia.use()
// before that just queues them), so each "reload" needs a fresh app + pinia
// pair, matching how main.ts wires things up.
function freshPinia() {
  const pinia = createPinia();
  pinia.use(createPersistedState());
  createApp({}).use(pinia);
  return pinia;
}

const sampleSummary: LevelSummary = {
  levelTime: 5000,
  questionsCorrect: 9,
  percentCorrect: 0.9,
  questionTimeAverage: 500,
  questionTimeMax: 900,
  message: "",
};

describe("store persistence round-trips", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("survives a simulated reload for settings", () => {
    freshPinia();
    const settings = useSettingsStore();
    settings.soundEnabled = false;
    settings.$persist();

    freshPinia();
    expect(useSettingsStore().soundEnabled).toBe(false);
  });

  it("survives a simulated reload for personal bests", () => {
    freshPinia();
    const progress = useProgressStore();
    progress.recordLevelResult("multiply", 2, sampleSummary);
    progress.$persist();

    freshPinia();
    expect(useProgressStore().getPersonalBest("multiply", 2)?.percentCorrect).toBe(0.9);
  });

  it("survives a simulated reload for mastery data", () => {
    freshPinia();
    const mastery = useMasteryStore();
    mastery.families["multiply:3,6,9"] = {
      stage: 2,
      timesSeen: 5,
      timesCorrect: 4,
      lastSeen: 1234,
    };
    mastery.$persist();

    freshPinia();
    expect(useMasteryStore().getFamily("multiply:3,6,9")).toMatchObject({ stage: 2, timesSeen: 5 });
  });

  it("survives a simulated reload for the cheat-free streak", () => {
    freshPinia();
    const streak = useStreakStore();
    streak.recordClean();
    streak.recordClean();
    streak.$persist();

    freshPinia();
    expect(useStreakStore().current).toBe(2);
    expect(useStreakStore().best).toBe(2);
  });

  it("defaults to fresh state when nothing was ever persisted", () => {
    freshPinia();
    expect(useSettingsStore().soundEnabled).toBe(true);
    expect(useMasteryStore().getFamily("add:1,2,3")).toMatchObject({ stage: 0, timesSeen: 0 });
  });
});
