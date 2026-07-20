import { describe, expect, it, beforeEach } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import MasteryGrid from "./MasteryGrid.vue";
import { useMasteryStore } from "../stores/mastery";
import { stageBgClass } from "../dashboard";

describe("MasteryGrid", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders one cell per fact family in an 8x8 grid", () => {
    const wrapper = mount(MasteryGrid, { props: { group: "add" } });
    expect(wrapper.findAll('[data-testid="mastery-cell"]')).toHaveLength(64);
  });

  it("colors a cell according to its family's mastery stage", () => {
    const mastery = useMasteryStore();
    mastery.recordAttempt("add:3,6,9", "correct-fast"); // stage -> 1

    const wrapper = mount(MasteryGrid, { props: { group: "add" } });
    const cell = wrapper
      .findAll('[data-testid="mastery-cell"]')
      .find((c) => c.attributes("title")?.startsWith("3 + 6"));

    expect(cell).toBeDefined();
    expect(cell!.attributes("data-stage")).toBe("1");
    expect(cell!.classes()).toContain(stageBgClass(1));
  });

  it("shows an unseen family at stage 0", () => {
    const wrapper = mount(MasteryGrid, { props: { group: "multiply" } });
    const cell = wrapper
      .findAll('[data-testid="mastery-cell"]')
      .find((c) => c.attributes("title")?.startsWith("2 × 2"));

    expect(cell!.attributes("data-stage")).toBe("0");
    expect(cell!.classes()).toContain(stageBgClass(0));
  });
});
