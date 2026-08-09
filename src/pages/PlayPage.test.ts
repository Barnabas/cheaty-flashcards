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
import { useWalletStore } from "../stores/wallet";
import { familyPool } from "../mastery";
import { TABLE_MAX_SEATS } from "../session";
import {
  CLEAN_SESSION_REWARD,
  ELIMINATE_COST,
  NEW_CARD_COST,
  REVEAL_COST,
  STARTING_TOKENS,
  WALLET_CAP,
} from "../wallet";

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

// The wallet readout wherever it's on screen — the play screen's counter, the
// intro's "you have", the outro's pocket. One number, one testid.
function walletText(wrapper: PlayWrapper) {
  return wrapper.get('[data-testid="hint-tokens"]').text();
}

describe("PlayPage intro", () => {
  it("shows one fact-family shape per active family and a start button", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(4);
    expect(wrapper.find('[data-testid="start-session-button"]').exists()).toBe(true);
  });

  it("sells a new card for tokens, adding one more family to the table", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    const wallet = useWalletStore();
    expect(wrapper.find('[data-testid="bonus-fact-button"]').exists()).toBe(true);

    await wrapper.get('[data-testid="bonus-fact-button"]').trigger("click");

    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(5);
    expect(wallet.tokens).toBe(STARTING_TOKENS - NEW_CARD_COST);
  });

  it("won't deal a card the player can't pay for", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    const wallet = useWalletStore();
    wallet.tokens = NEW_CARD_COST - 1;
    await nextTick();

    const button = wrapper.get('[data-testid="bonus-fact-button"]');
    expect(button.attributes("disabled")).toBeDefined();
    await button.trigger("click");

    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(4);
    expect(wallet.tokens).toBe(NEW_CARD_COST - 1);
  });

  it("shows every price before anything is bought", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    const prices = wrapper.get('[data-testid="ziggy-prices"]').text();
    expect(prices).toContain(`Hide 2 wrong answers ${ELIMINATE_COST}`);
    expect(prices).toContain(`Show you the answer ${REVEAL_COST}`);
    expect(prices).toContain(`Deal you a new card ${NEW_CARD_COST}`);
    expect(walletText(wrapper)).toBe(String(STARTING_TOKENS));
  });

  it("restricts the family set via ?focus=", async () => {
    // familyPool("add").slice(0, 4) is [(2,2) (2,3) (2,4) (2,5)] — only (2,3)
    // touches 3, so this is a real, deterministic restriction.
    const { wrapper } = await mountPlay({ familyCount: 4, query: "?focus=3" });
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(1);
  });

  it("reseats the table when the focus numbers change", async () => {
    const { wrapper } = await mountPlay({ familyCount: 36 });
    await wrapper.get('input[type="text"]').setValue("3");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const seated = wrapper.findAll('[data-testid="fact-family-shape"]');
    expect(seated).toHaveLength(TABLE_MAX_SEATS);
    // Eight families touch 3, so the table is a real subset of them rather
    // than the table it was seated with before the focus was typed. Read off
    // the factors in FactFamilyShape's title ("3 & 7 = 10 (stage 0/5)") — the
    // rendered digits would also match a sum like 13.
    const factors = seated.map((shape) =>
      shape.get("[title]").attributes("title")!.split(" = ")[0].split(" & "),
    );
    expect(factors.every((pair) => pair.includes("3"))).toBe(true);
  });

  it("seats a table of at most TABLE_MAX_SEATS however much is in play", async () => {
    const { wrapper } = await mountPlay({ familyCount: 36 });
    expect(wrapper.findAll('[data-testid="fact-family-shape"]')).toHaveLength(TABLE_MAX_SEATS);
  });

  it("plays only the seated table, not everything in play", async () => {
    const { wrapper } = await mountPlay({ familyCount: 36 });
    const seated = wrapper
      .findAll('[data-testid="fact-family-shape"]')
      .map((shape) => shape.text());
    await startSession(wrapper);
    vi.useFakeTimers();

    // Both operators of all six seated families, and then the session is
    // over — a 36-family session could never have ended this way.
    for (let i = 0; i < TABLE_MAX_SEATS * 2; i++) {
      await answerButtons(wrapper)
        .find((b) => b.text() === "2")!
        .trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }
    await flushPromises();
    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="fact-family-shape"]').map((s) => s.text())).toEqual(
      seated,
    );
  });
});

describe("PlayPage two-miss rule", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  // Two distinct wrong answers on the same question.
  async function missTwice(wrapper: PlayWrapper) {
    for (const label of ["3", "4"]) {
      await answerButtons(wrapper)
        .find((b) => b.text() === label)!
        .trigger("click");
    }
  }

  it("has Ziggy show the answer after a second miss", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    await startSession(wrapper);
    vi.useFakeTimers();

    await missTwice(wrapper);

    expect(wrapper.find('[data-testid="ziggy-reveal"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="ziggy-reveal"]').text()).toContain("is 2.");
    // The correct answer is on screen too, flagged the same way a bought
    // reveal flags it.
    expect(
      answerButtons(wrapper)
        .find((b) => b.classes().includes("btn-info"))!
        .text(),
    ).toBe("2");
  });

  it("moves on by itself instead of waiting for the right answer", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    await startSession(wrapper);
    vi.useFakeTimers();
    const firstQuestion = wrapper.get('[data-testid="question-card"]').text();

    await missTwice(wrapper);
    // Tapping the correct answer during Ziggy's reveal changes nothing — the
    // question is his now.
    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    expect(wrapper.find('[data-testid="ziggy-reveal"]').exists()).toBe(true);

    // Ziggy has a sentence to read, so his reveal holds the screen far longer
    // than a correct answer's green flash does.
    vi.advanceTimersByTime(500);
    await nextTick();
    expect(wrapper.find('[data-testid="ziggy-reveal"]').exists()).toBe(true);

    vi.advanceTimersByTime(2100);
    await nextTick();

    expect(wrapper.find('[data-testid="ziggy-reveal"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="question-card"]').text()).not.toBe(firstQuestion);
    expect(answerButtons(wrapper).some((b) => b.classes().includes("btn-error"))).toBe(false);
  });

  it("takes the family down once for the question, not once per miss", async () => {
    const { wrapper } = await mountPlay({ familyCount: 4 });
    const mastery = useMasteryStore();
    const familyKey = familyPool("add")[0].key;
    mastery.recordAttempt(familyKey, "correct-fast");
    mastery.recordAttempt(familyKey, "correct-fast");
    expect(mastery.getFamily(familyKey).stage).toBe(2);

    await startSession(wrapper);
    vi.useFakeTimers();
    await missTwice(wrapper);

    // One demotion, not two — and no third "seen" for Ziggy's own reveal.
    expect(mastery.getFamily(familyKey)).toMatchObject({ stage: 1, timesSeen: 3 });
  });

  it("does not end the session on a question Ziggy took", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    vi.useFakeTimers();

    // Clear "+", then lose "-" twice: the table isn't clean, so the session
    // keeps going rather than counting a taken card as a pass.
    await answerButtons(wrapper)
      .find((b) => b.text() === "2")!
      .trigger("click");
    vi.advanceTimersByTime(500);
    await nextTick();

    await missTwice(wrapper);
    vi.advanceTimersByTime(2600);
    await flushPromises();

    expect(wrapper.find('[data-testid="session-summary"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true);
  });
});

describe("PlayPage cheat mechanic", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("spends from the wallet the player brought, not a per-session allowance", async () => {
    const { wrapper } = await mountPlay();
    useWalletStore().tokens = 8;
    await startSession(wrapper);
    expect(walletText(wrapper)).toBe("8");
  });

  it("Eliminate 2 hides two untried wrong answers and spends 1 token", async () => {
    const { wrapper } = await mountPlay();
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");

    const hidden = answerButtons(wrapper).filter((b) => b.classes().includes("opacity-10"));
    expect(hidden).toHaveLength(2);
    expect(hidden.every((b) => b.text() !== "2")).toBe(true);
    expect(walletText(wrapper)).toBe(String(STARTING_TOKENS - ELIMINATE_COST));
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
    expect(walletText(wrapper)).toBe(String(STARTING_TOKENS - REVEAL_COST));

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

  it("builds a streak on clean correct answers and pays out at the first milestone", async () => {
    // 6 families so the milestone (5) is reached before the session's own
    // "every family clean" completion would end it.
    const { wrapper } = await mountPlay({ familyCount: 6 });
    await startSession(wrapper);
    vi.useFakeTimers();
    const streak = useStreakStore();
    const wallet = useWalletStore();

    for (let i = 0; i < 5; i++) {
      const correctButton = answerButtons(wrapper).find((b) => b.text() === "2")!;
      await correctButton.trigger("click");
      vi.advanceTimersByTime(500);
      await nextTick();
    }

    expect(streak.current).toBe(5);
    // The streak is the earning engine now: the milestone toast is a receipt.
    expect(wallet.tokens).toBe(STARTING_TOKENS + 1);
    expect(wrapper.get('[data-testid="streak-milestone"]').text()).toContain(
      "5 in a row! Ziggy pays you 1",
    );
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

    // Deliberately still on fake timers: Vue skips a handler whose event
    // timestamp predates the listener's attachment, and switching back to
    // real timers rewinds the clock under everything rendered while faked —
    // so a Replay clicked after vi.useRealTimers() silently does nothing and
    // this test would pass without ever replaying.
    await wrapper.get('[data-testid="replay-button"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true);
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

  // A bought hint leaves its permutation on "retry", so a session that used
  // one needs more clean answers than the family count alone predicts.
  async function answerCleanUntilSummary(wrapper: PlayWrapper, maxAnswers = 8) {
    vi.useFakeTimers();
    for (let i = 0; i < maxAnswers; i++) {
      if (wrapper.find('[data-testid="session-summary"]').exists()) break;
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

  it("Replay carries the wallet over instead of refilling it", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    await answerCleanUntilSummary(wrapper);

    // Stays on fake timers through the click — see the replay test in
    // "PlayPage cheat-free streak" for why switching back kills the handler.
    await wrapper.get('[data-testid="replay-button"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="answer-button"]').exists()).toBe(true);
    // Spent one, earned nothing (help was bought), and the new session opens
    // on what's left rather than a fresh five.
    expect(walletText(wrapper)).toBe(String(STARTING_TOKENS - ELIMINATE_COST));
  });

  it("pays out for a session where Ziggy was never asked for anything", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    const wallet = useWalletStore();
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);

    expect(wallet.tokens).toBe(STARTING_TOKENS + CLEAN_SESSION_REWARD);
    expect(wrapper.get('[data-testid="session-earnings"]').text()).toContain(
      `Earned ${CLEAN_SESSION_REWARD}`,
    );
  });

  it("pays nothing for a session that bought help, and says what would have paid", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    const wallet = useWalletStore();
    await startSession(wrapper);
    await wrapper.get('[data-testid="eliminate-button"]').trigger("click");
    await answerCleanUntilSummary(wrapper);

    expect(wallet.tokens).toBe(STARTING_TOKENS - ELIMINATE_COST);
    expect(wrapper.get('[data-testid="session-earnings"]').text()).toContain(
      `Ziggy pays ${CLEAN_SESSION_REWARD}`,
    );
  });

  it("clips a payout at the wallet cap rather than promising tokens it didn't give", async () => {
    const { wrapper } = await mountPlay({ familyCount: 1 });
    const wallet = useWalletStore();
    wallet.tokens = WALLET_CAP;
    await startSession(wrapper);
    await completeSingleFamilySession(wrapper);

    expect(wallet.tokens).toBe(WALLET_CAP);
    expect(wrapper.get('[data-testid="session-earnings"]').text()).toContain("Pockets full");
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
