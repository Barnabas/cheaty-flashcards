import { describe, expect, it, beforeEach, vi } from "vite-plus/test";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { createHead } from "@unhead/vue/client";
import LevelPage from "./LevelPage.vue";
import { useSettingsStore } from "../stores/settings";
import { useStreakStore } from "../stores/streak";
import { useMasteryStore } from "../stores/mastery";

// A fixed, non-random level so tests can rely on the correct answer always
// being at index 0 and every wrong answer being untried at the start of a
// question, instead of fighting shuffle()/Math.random().
vi.mock("../sections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../sections")>();
  const fixedQuestion = () => ({
    operator: "+" as const,
    familyKey: "add:1,1,2",
    factors: [1, 1],
    correct: 2,
    answers: [2, 3, 4, 5, 6],
  });
  return {
    ...actual,
    generateLevel: vi.fn(() => ({
      name: "+ 1",
      level: 1,
      questions: Array.from({ length: 10 }, fixedQuestion),
    })),
  };
});

async function mountLevel() {
  setActivePinia(createPinia());
  useSettingsStore().soundEnabled = false; // avoid Howler playback under jsdom

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:section/:level", component: LevelPage, props: true }],
  });
  await router.push("/add/1");
  await router.isReady();

  const wrapper = mount(LevelPage, {
    props: { section: "add", level: "1" },
    global: { plugins: [router, createHead()] },
  });
  await flushPromises();
  return wrapper;
}

function answerButtons(wrapper: Awaited<ReturnType<typeof mountLevel>>) {
  return wrapper.findAll('[data-testid="answer-button"]');
}

describe("LevelPage cheat mechanic", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("starts each level with a 5-token hint budget", async () => {
    const wrapper = await mountLevel();
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(5);
  });

  it("Eliminate 2 hides two untried wrong answers and spends 1 token", async () => {
    const wrapper = await mountLevel();
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");

    const hidden = answerButtons(wrapper).filter((b) => b.classes().includes("opacity-10"));
    expect(hidden).toHaveLength(2);
    // the correct answer (2) is never eliminated
    expect(hidden.every((b) => b.text() !== "2")).toBe(true);
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(4);
  });

  it("disables Eliminate 2 once no untried wrong answers remain", async () => {
    const wrapper = await mountLevel();
    // 4 wrong answers total; two rounds of eliminate exhausts them.
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    expect(wrapper.get('[data-testid="eliminate-button"]').attributes("disabled")).toBeDefined();
  });

  it("Reveal flashes the correct answer and spends 3 tokens", async () => {
    const wrapper = await mountLevel();
    vi.useFakeTimers();

    await wrapper.get('[data-testid="reveal-button"]').trigger("click");

    const revealed = answerButtons(wrapper).filter((b) => b.classes().includes("btn-info"));
    expect(revealed).toHaveLength(1);
    expect(revealed[0].text()).toBe("2");
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    await nextTick();
    expect(answerButtons(wrapper).some((b) => b.classes().includes("btn-info"))).toBe(false);
  });

  it("disables Reveal once fewer than 3 tokens remain", async () => {
    const wrapper = await mountLevel();
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click"); // 5 -> 4
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click"); // 4 -> 3
    expect(wrapper.get('[data-testid="reveal-button"]').attributes("disabled")).toBeUndefined();
    await wrapper.get('[data-testid="reveal-button"]').trigger("click"); // 3 -> 0
    expect(wrapper.get('[data-testid="reveal-button"]').attributes("disabled")).toBeDefined();
  });

  it("a cheated question grants no mastery credit", async () => {
    const wrapper = await mountLevel();
    const mastery = useMasteryStore();
    await wrapper.get('[data-testid="reveal-button"]').trigger("click");
    const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
    await correctButton.trigger("click");

    expect(mastery.getFamily("add:1,1,2")).toMatchObject({ stage: 0, timesCorrect: 0 });
  });
});

describe("LevelPage cheat-free streak", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("builds a streak on clean correct answers and celebrates at the first milestone", async () => {
    const wrapper = await mountLevel();
    vi.useFakeTimers();
    const streak = useStreakStore();

    for (let i = 0; i < 5; i++) {
      const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
      await correctButton.trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }

    expect(streak.current).toBe(5);
    expect(wrapper.find('[data-testid="streak-milestone"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="streak-milestone"]').text()).toContain("5 cheat-free streak");
  });

  it("resets the streak as soon as a hint is used", async () => {
    const wrapper = await mountLevel();
    vi.useFakeTimers();
    const streak = useStreakStore();

    const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
    await correctButton.trigger("click");
    expect(streak.current).toBe(1);

    vi.advanceTimersByTime(500);
    await nextTick();

    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    expect(streak.current).toBe(0);
  });

  it("dismisses a pending milestone toast the moment a hint is used", async () => {
    const wrapper = await mountLevel();
    vi.useFakeTimers();

    for (let i = 0; i < 5; i++) {
      const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
      await correctButton.trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }
    expect(wrapper.find('[data-testid="streak-milestone"]').exists()).toBe(true);

    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    expect(wrapper.find('[data-testid="streak-milestone"]').exists()).toBe(false);
  });

  it("does not carry a stale milestone toast into a restarted level", async () => {
    const wrapper = await mountLevel();
    vi.useFakeTimers();

    // Answer all 10 questions cleanly: hits the streak-5 milestone mid-level,
    // then finishes the level with the toast/timeout still pending.
    for (let i = 0; i < 10; i++) {
      const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
      await correctButton.trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }

    // Back to real timers for the restart click: Vue's async update scheduler
    // and vitest's fake timers don't interleave cleanly across a full
    // unmount-free "startLevel() re-runs on an already-mounted instance"
    // cycle, which is a test-harness quirk, not app behavior (confirmed
    // working in a real browser during manual verification).
    vi.useRealTimers();
    const tryAgain = wrapper.findAll("button").find((b) => b.text().includes("Try Again"))!;
    await tryAgain.trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="streak-milestone"]').exists()).toBe(false);
  });
});
