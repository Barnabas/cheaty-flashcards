import { describe, expect, it, beforeEach, vi } from "vite-plus/test";
import { mount, flushPromises, VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { createHead } from "@unhead/vue/client";
import PlayPage from "./PlayPage.vue";
import { useSettingsStore } from "../stores/settings";
import { useStreakStore } from "../stores/streak";
import { useMasteryStore } from "../stores/mastery";
import { useCurriculumStore } from "../stores/curriculum";
import { familyPool } from "../mastery";

// Deterministic, fixed-correct-answer questions so tests don't have to fight
// shuffle()/Math.random() — mirrors the family list they're given (real
// curriculum data, seeded per test below) rather than inventing unrelated
// families, so familyStatus/session-completion tracking still behaves
// realistically. isSessionComplete/hasReachedHardCap/buildSessionTargetKeys
// are left un-mocked, and real buildSessionTargetKeys requires both "+" and
// "-" permutations per family clean before a session ends — so each family
// gets a question for both operators here too, matching real
// buildInitialQuestions behavior.
vi.mock("../session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../session")>();
  const toQuestions = (families: { key: string; a: number; b: number }[]) =>
    families.flatMap((f) =>
      (["+", "-"] as const).map((operator) => ({
        operator,
        familyKey: f.key,
        factors: [f.a, f.b],
        correct: 2,
        answers: [2, 3, 4, 5, 6],
      })),
    );
  return {
    ...actual,
    buildInitialQuestions: vi.fn((_group: string, families: any[]) => toQuestions(families)),
    buildFollowUpQuestions: vi.fn((_group: string, pool: any[]) => toQuestions(pool.slice(0, 1))),
  };
});

async function mountPlay({
  familyCount = 4,
  query = "",
}: { familyCount?: number; query?: string } = {}) {
  setActivePinia(createPinia());
  useSettingsStore().soundEnabled = false; // avoid Howler playback under jsdom
  useCurriculumStore().active.add = familyPool("add")
    .slice(0, familyCount)
    .map((f) => f.key);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/play/:group", component: PlayPage, props: true }],
  });
  await router.push(`/play/add${query}`);
  await router.isReady();

  const wrapper = mount(PlayPage, {
    props: { group: "add" },
    global: { plugins: [router, createHead()] },
  });
  await flushPromises();
  return { wrapper, router };
}

// Loosely typed so the same helpers work for a directly-mounted PlayPage and
// for the RouterView-hosted mount the leave-guard tests need.
type PlayWrapper = VueWrapper<any>;

async function startSession(wrapper: PlayWrapper) {
  await wrapper.get('[data-testid="start-session-button"]').trigger("click");
  await flushPromises();
}

function answerButtons(wrapper: PlayWrapper) {
  return wrapper.findAll('[data-testid="answer-button"]');
}

describe("PlayPage intro", () => {
  it("shows one fact-family shape per active family and a start button", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(4);
    expect(wrapper.find('[data-testid="start-session-button"]').exists()).toBe(true);
  });

  it("offers a bonus-fact opt-in that adds one more family", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    expect(wrapper.find('[data-testid="bonus-fact-button"]').exists()).toBe(true);
    await wrapper.get('[data-testid="bonus-fact-button"]').trigger("click");
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(5);
  });

  it("restricts the family set via ?focus=", async () => {
    // familyPool("add").slice(0, 4) is [(2,2) (2,3) (2,4) (2,5)] — only (2,3)
    // touches 3, so this is a real, deterministic restriction.
    const { wrapper } = await mountPlay({ familyCount: 4, query: "?focus=3" });
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(1);
  });
});

describe("PlayPage cheat mechanic", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("starts each session with a 5-token hint budget", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(5);
  });

  it("Eliminate 2 hides two untried wrong answers and spends 1 token", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");

    const hidden = answerButtons(wrapper).filter((b) => b.classes().includes("opacity-10"));
    expect(hidden).toHaveLength(2);
    expect(hidden.every((b) => b.text() !== "2")).toBe(true);
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(4);
  });

  it("disables Eliminate 2 once no untried wrong answers remain", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    expect(wrapper.get('[data-testid="eliminate-button"]').attributes("disabled")).toBeDefined();
  });

  it("Reveal flashes the correct answer and spends 3 tokens", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
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
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click"); // 5 -> 4
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click"); // 4 -> 3
    expect(wrapper.get('[data-testid="reveal-button"]').attributes("disabled")).toBeUndefined();
    await wrapper.get('[data-testid="reveal-button"]').trigger("click"); // 3 -> 0
    expect(wrapper.get('[data-testid="reveal-button"]').attributes("disabled")).toBeDefined();
  });

  it("a cheated question grants no mastery credit", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    const mastery = useMasteryStore();
    const familyKey = familyPool("add")[0].key;
    await wrapper.get('[data-testid="reveal-button"]').trigger("click");
    const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
    await correctButton.trigger("click");

    expect(mastery.getFamily(familyKey)).toMatchObject({ stage: 0, timesCorrect: 0 });
  });
});

describe("PlayPage cheat-free streak", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("builds a streak on clean correct answers and celebrates at the first milestone", async () => {
    // 6 families so the milestone (5) is reached before the session's own
    // "every family clean" completion would end it.
    const { wrapper } = await mountPlay({ familyCount: 6 });
    await startSession(wrapper);
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
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
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
    const { wrapper } = await mountPlay({ familyCount: 6 });
    await startSession(wrapper);
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

  it("does not carry a stale milestone toast into a replayed session", async () => {
    // 3 families -> 6 (family, operator) permutations to clear. The 5th
    // clean answer hits the streak milestone with the session still one
    // permutation short of complete, so the toast is live when the 6th
    // answer completes the session in the same tick (never actually
    // rendering that final frame) — its ref/timeout are still live until
    // beginSession() (called by Replay) explicitly dismisses them.
    const { wrapper } = await mountPlay({ familyCount: 3 });
    await startSession(wrapper);
    vi.useFakeTimers();

    for (let i = 0; i < 6; i++) {
      const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
      await correctButton.trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }
    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(true);

    vi.useRealTimers();
    await wrapper.get('[data-testid="replay-button"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="streak-milestone"]').exists()).toBe(false);
  });
});

describe("PlayPage answer feedback", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("gives the session's final answer the same feedback as any other", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    vi.useFakeTimers();

    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    vi.advanceTimersByTime(500);
    await nextTick();

    // Second (and session-completing) answer: the green flash has to land
    // before the outro takes over.
    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    expect(
      answerButtons(wrapper)
        .find((b) => b.classes().includes("btn-success"))!
        .text(),
    ).toBe("2");
    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(false);

    vi.advanceTimersByTime(500);
    await flushPromises();
    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(true);
  });

  it("ignores extra taps while a correct answer is still on screen", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    await startSession(wrapper);
    vi.useFakeTimers();
    const mastery = useMasteryStore();
    const familyKey = familyPool("add")[0].key;

    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    // Impatient double-tap on a wrong answer during the 500ms hand-off.
    await answerButtons(wrapper)
      .find((b) => b.text() === "3")!
      .trigger("click");

    // One attempt recorded, not two — a stray "wrong" here would also have
    // knocked the family's freshly-earned stage back down.
    expect(mastery.getFamily(familyKey)).toMatchObject({ timesSeen: 1, timesCorrect: 1 });
    expect(answerButtons(wrapper).some((b) => b.classes().includes("btn-error"))).toBe(false);
  });

  it("leaves no reveal cleanup pending once the question has moved on", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    await startSession(wrapper);
    vi.useFakeTimers();

    await wrapper.get('[data-testid="reveal-button"]').trigger("click");
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    vi.advanceTimersByTime(500);
    await nextTick();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the progress bar from walking backwards", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    vi.useFakeTimers();
    const progress = () => wrapper.get('[data-testid="session-progress"]').attributes("value");

    // "+" clean.
    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(progress()).toBe("1");

    // "-" answered with a reveal, so it stays uncleared and the session
    // continues into a follow-up batch.
    await wrapper.get('[data-testid="reveal-button"]').trigger("click");
    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    vi.advanceTimersByTime(500);
    await nextTick();

    // Follow-up question on the already-clean "+", answered wrong: the
    // permutation goes back to "retry" but the bar holds its ground.
    await answerButtons(wrapper)
      .find((b) => b.text() === "3")!
      .trigger("click");
    await nextTick();
    expect(progress()).toBe("1");
  });
});

describe("PlayPage leaving mid-session", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  // The abandonment guard is a route guard, so it only registers when the
  // page is rendered by a RouterView rather than mounted directly.
  async function mountRouted() {
    setActivePinia(createPinia());
    useSettingsStore().soundEnabled = false;
    useCurriculumStore().active.add = familyPool("add")
      .slice(0, 4)
      .map((f) => f.key);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div>home</div>" } },
        { path: "/play/:group", component: PlayPage, props: true },
      ],
    });
    await router.push("/play/add");
    await router.isReady();

    const wrapper = mount(
      { template: "<RouterView />" },
      { global: { plugins: [router, createHead()] } },
    );
    await flushPromises();
    return { wrapper, router };
  }

  it("asks before throwing away a session in progress", async () => {
    const { wrapper, router } = await mountRouted();
    await startSession(wrapper);

    const navigation = router.push("/");
    await flushPromises();
    expect(wrapper.find('[data-testid="leave-confirm"]').exists()).toBe(true);

    await wrapper.get('[data-testid="stay-button"]').trigger("click");
    await navigation;
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/play/add");
    expect(wrapper.find('[data-testid="leave-confirm"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true);
  });

  it("lets you go once you've confirmed", async () => {
    const { wrapper, router } = await mountRouted();
    await startSession(wrapper);

    const navigation = router.push("/");
    await flushPromises();
    await wrapper.get('[data-testid="leave-button"]').trigger("click");
    await navigation;
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
  });

  it("does not ask when no session is in progress", async () => {
    const { wrapper, router } = await mountRouted();

    await router.push("/");
    await flushPromises();

    expect(wrapper.find('[data-testid="leave-confirm"]').exists()).toBe(false);
    expect(router.currentRoute.value.path).toBe("/");
  });
});

describe("PlayPage session outro", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  // familyCount: 1 -> 2 (family, operator) permutations ("+" and "-") that
  // both have to clear before the session ends; every correct answer, the
  // session-ending one included, holds its green flash for 500ms before the
  // page moves on, so fake timers drive those gaps.
  async function completeSingleFamilySession(wrapper: PlayWrapper) {
    vi.useFakeTimers();
    for (let i = 0; i < 2; i++) {
      await answerButtons(wrapper)
        .find((b) => b.text() === "2")!
        .trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }
    await flushPromises();
  }

  it("shows a session summary once every family in the session is cleared", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);

    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="family-recap"]').exists()).toBe(true);
  });

  it("Replay starts a fresh session with a full hint-token budget", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);
    await wrapper.get('[data-testid="replay-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="hint-tokens"]').findAll("svg")).toHaveLength(5);
  });

  it("Advance returns to the intro screen", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);

    await wrapper.get('[data-testid="advance-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="start-session-button"]').exists()).toBe(true);
  });

  it("Home navigates back to the home route", async () => {
    const { wrapper, router } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);

    await wrapper.get('[data-testid="home-button"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/");
  });
});
