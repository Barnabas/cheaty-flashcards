import { describe, expect, it } from "vite-plus/test";
import { DOMWrapper, mount } from "@vue/test-utils";
import ZiggySpeaks from "./ZiggySpeaks.vue";

function delayMs(span: DOMWrapper<Element>) {
  return parseFloat((span.attributes("style") ?? "").replace(/[^0-9.]/g, ""));
}

describe("ZiggySpeaks", () => {
  it("puts the whole line in the DOM immediately, not one character at a time", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["Hi there.", "Second line."] } });
    // The typewriter effect is opacity-only, so nothing has to be awaited for
    // the text to be readable by a screen reader or assertable in a test.
    expect(wrapper.text()).toContain("Hi there.");
    expect(wrapper.text()).toContain("Second line.");
  });

  it("wraps every character, including spaces, in its own delayed span", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["ab c"] } });
    const spans = wrapper.findAll(".ziggy-char");
    expect(spans).toHaveLength(4);
    expect(spans.map((span) => span.element.textContent)).toEqual(["a", "b", " ", "c"]);
    expect(delayMs(spans[0])).toBe(0);
    expect(delayMs(spans[1])).toBeGreaterThan(0);
    expect(delayMs(spans[3])).toBeGreaterThan(delayMs(spans[1]));
  });

  it("continues the delay across paragraphs rather than restarting each one", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["ab", "cd"] } });
    const spans = wrapper.findAll(".ziggy-char");
    expect(delayMs(spans[2])).toBeGreaterThan(delayMs(spans[1]));
  });

  it("compresses the per-character delay so a long speech still finishes quickly", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["x".repeat(400)] } });
    const spans = wrapper.findAll(".ziggy-char");
    expect(delayMs(spans[spans.length - 1])).toBeLessThanOrEqual(1800);
  });

  it("shows the pose it was asked for", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["Ha!"], pose: "gleeful" } });
    expect(wrapper.get('[data-testid="ziggy-image"]').attributes("data-pose")).toBe("gleeful");
  });

  it("leaves the portrait out of the accessibility tree — the speech is the content", () => {
    const wrapper = mount(ZiggySpeaks, { props: { lines: ["Ha!"] } });
    expect(wrapper.get('[data-testid="ziggy-image"]').attributes("aria-hidden")).toBe("true");
  });
});
