import { describe, expect, it, beforeEach } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import HomePage from "./HomePage.vue";
import { useMasteryStore } from "../stores/mastery";
import { useProgressStore } from "../stores/progress";
import { useStreakStore } from "../stores/streak";
import { seedStarterFamilies } from "../curriculum";
import { SessionSummary } from "../types";

function summary(percentCorrect: number): SessionSummary {
  return {
    sessionTime: 1000,
    questionsCorrect: 9,
    percentCorrect,
    questionTimeAverage: 100,
    questionTimeMax: 200,
    message: "",
  };
}

async function mountHome() {
  setActivePinia(createPinia());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: HomePage }],
  });
  await router.push("/");
  await router.isReady();
  return mount(HomePage, { global: { plugins: [router] } });
}

describe("HomePage dashboard", () => {
  beforeEach(() => {});

  it("renders a mastery panel for each operator group", async () => {
    const wrapper = await mountHome();
    const panels = wrapper.findAll('[data-testid="operator-group-panel"]');
    expect(panels).toHaveLength(2);
    expect(panels[0].text()).toContain("Addition & Subtraction");
    expect(panels[1].text()).toContain("Multiplication & Division");
  });

  it("shows only the active fact families, not the whole 8x8 pool", async () => {
    const wrapper = await mountHome();
    const additionPanel = wrapper.findAll('[data-testid="operator-group-panel"]')[0];
    expect(additionPanel.findAll('[data-testid="fact-family-shape"]')).toHaveLength(
      seedStarterFamilies("add").length,
    );
  });

  it("gives each group its own Play link", async () => {
    const wrapper = await mountHome();
    const links = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(links).toContain("/play/add");
    expect(links).toContain("/play/multiply");
  });

  it("greets a brand-new player with Ziggy speaking, exactly once", async () => {
    const wrapper = await mountHome();
    const bubbles = wrapper.findAll('[data-testid="ziggy-speaks"]');
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].text()).toContain("I'm Ziggy");
  });

  it("has Ziggy count the player's progress back to them once they've started", async () => {
    setActivePinia(createPinia());
    const mastery = useMasteryStore();
    for (const family of seedStarterFamilies("add")) {
      for (let i = 0; i < 5; i++) mastery.recordAttempt(family.key, "correct-fast");
    }

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomePage }],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePage, { global: { plugins: [router] } });

    const starters = seedStarterFamilies("add").length;
    const total = starters + seedStarterFamilies("multiply").length;
    expect(wrapper.get('[data-testid="ziggy-speaks"]').text()).toContain(`${starters} of ${total}`);
  });

  it("reflects mastery store fixtures in the facts-mastered summary", async () => {
    setActivePinia(createPinia());
    const mastery = useMasteryStore();
    const starterKey = seedStarterFamilies("add")[1].key;
    for (let i = 0; i < 5; i++) mastery.recordAttempt(starterKey, "correct-fast");

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomePage }],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePage, { global: { plugins: [router] } });

    const additionPanel = wrapper.findAll('[data-testid="operator-group-panel"]')[0];
    expect(additionPanel.get('[data-testid="mastery-summary"]').text()).toContain(
      `1 / ${seedStarterFamilies("add").length} facts mastered`,
    );
  });

  it("shows a session badge once a group clears the threshold, and none before", async () => {
    setActivePinia(createPinia());
    const progress = useProgressStore();
    progress.recordSessionResult("multiply", summary(0.85));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomePage }],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePage, { global: { plugins: [router] } });

    const multiplyPanel = wrapper.findAll('[data-testid="operator-group-panel"]')[1];
    expect(multiplyPanel.find('[data-testid="session-badge"]').text()).toContain("85.0%");
    const additionPanel = wrapper.findAll('[data-testid="operator-group-panel"]')[0];
    expect(additionPanel.find('[data-testid="session-badge"]').exists()).toBe(false);
  });

  it("shows the best cheat-free streak only once one has been set", async () => {
    const fresh = await mountHome();
    expect(fresh.find('[data-testid="best-streak"]').exists()).toBe(false);

    setActivePinia(createPinia());
    useStreakStore().$patch({ current: 4, best: 12 });
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomePage }],
    });
    await router.push("/");
    await router.isReady();
    const wrapper = mount(HomePage, { global: { plugins: [router] } });
    expect(wrapper.get('[data-testid="best-streak"]').text()).toContain("12");
  });

  it("offers export/import controls for backing up progress", async () => {
    const wrapper = await mountHome();
    expect(wrapper.find('[data-testid="export-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-button"]').exists()).toBe(true);
  });
});
