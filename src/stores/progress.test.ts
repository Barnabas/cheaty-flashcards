import { describe, expect, it, beforeEach } from "vite-plus/test";
import { createPinia, setActivePinia } from "pinia";
import { useProgressStore } from "./progress";
import { SessionSummary } from "../types";

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    sessionTime: 10000,
    questionsCorrect: 8,
    percentCorrect: 0.8,
    questionTimeAverage: 1000,
    questionTimeMax: 2000,
    message: "",
    ...overrides,
  };
}

describe("useProgressStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("records a first result as a new personal best", () => {
    const progress = useProgressStore();
    const isNewBest = progress.recordSessionResult("add", summary());
    expect(isNewBest).toBe(true);
    expect(progress.getBest("add")).toMatchObject({
      percentCorrect: 0.8,
      timesPlayed: 1,
    });
  });

  it("keeps the existing best when a later run scores lower", () => {
    const progress = useProgressStore();
    progress.recordSessionResult("add", summary({ percentCorrect: 0.9 }));
    const isNewBest = progress.recordSessionResult("add", summary({ percentCorrect: 0.5 }));
    expect(isNewBest).toBe(false);
    expect(progress.getBest("add")?.percentCorrect).toBe(0.9);
  });

  it("replaces the best on a higher score, and always counts the attempt", () => {
    const progress = useProgressStore();
    progress.recordSessionResult("add", summary({ percentCorrect: 0.5 }));
    progress.recordSessionResult("add", summary({ percentCorrect: 0.5 }));
    const isNewBest = progress.recordSessionResult("add", summary({ percentCorrect: 0.9 }));
    expect(isNewBest).toBe(true);
    const best = progress.getBest("add");
    expect(best?.percentCorrect).toBe(0.9);
    expect(best?.timesPlayed).toBe(3);
  });

  it("prefers a faster time as the tiebreaker for equal scores", () => {
    const progress = useProgressStore();
    progress.recordSessionResult("add", summary({ percentCorrect: 0.8, sessionTime: 8000 }));
    const isNewBest = progress.recordSessionResult(
      "add",
      summary({ percentCorrect: 0.8, sessionTime: 4000 }),
    );
    expect(isNewBest).toBe(true);
    expect(progress.getBest("add")?.sessionTime).toBe(4000);
  });

  it("keeps separate bests per operator group", () => {
    const progress = useProgressStore();
    progress.recordSessionResult("add", summary({ percentCorrect: 0.9 }));
    progress.recordSessionResult("multiply", summary({ percentCorrect: 0.4 }));
    expect(progress.getBest("add")?.percentCorrect).toBe(0.9);
    expect(progress.getBest("multiply")?.percentCorrect).toBe(0.4);
  });
});
