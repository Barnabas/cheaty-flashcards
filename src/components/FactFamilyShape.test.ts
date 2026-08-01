import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import FactFamilyShape from "./FactFamilyShape.vue";
import { stageBgClass } from "../dashboard";

describe("FactFamilyShape", () => {
  it("shows the two factors and their sum for an add family", () => {
    const wrapper = mount(FactFamilyShape, {
      props: { family: { group: "add", a: 3, b: 6, key: "add:3,6,9" }, stage: 2 },
    });
    const text = wrapper.text();
    expect(text).toContain("3");
    expect(text).toContain("6");
    expect(text).toContain("9");
  });

  it("shows the two factors and their product for a multiply family", () => {
    const wrapper = mount(FactFamilyShape, {
      props: { family: { group: "multiply", a: 3, b: 6, key: "multiply:3,6,18" }, stage: 2 },
    });
    expect(wrapper.text()).toContain("18");
  });

  it("colors the shape according to its stage", () => {
    const wrapper = mount(FactFamilyShape, {
      props: { family: { group: "add", a: 2, b: 2, key: "add:2,2,4" }, stage: 4 },
    });
    const shape = wrapper.get('[data-testid="fact-family-shape"] > div');
    expect(shape.classes()).toContain(stageBgClass(4));
  });

  it("shows a 'New!' badge only when highlighted", () => {
    const plain = mount(FactFamilyShape, {
      props: { family: { group: "add", a: 2, b: 2, key: "add:2,2,4" }, stage: 0 },
    });
    expect(plain.find('[data-testid="new-family-badge"]').exists()).toBe(false);

    const highlighted = mount(FactFamilyShape, {
      props: { family: { group: "add", a: 2, b: 2, key: "add:2,2,4" }, stage: 0, highlight: true },
    });
    expect(highlighted.find('[data-testid="new-family-badge"]').exists()).toBe(true);
  });
});
