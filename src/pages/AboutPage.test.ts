import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import { createHead } from "@unhead/vue/client";
import AboutPage from "./AboutPage.vue";

async function mountAbout() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/about", component: AboutPage },
    ],
  });
  await router.push("/about");
  await router.isReady();
  return mount(AboutPage, { global: { plugins: [router, createHead()] } });
}

describe("AboutPage", () => {
  it("has Ziggy introduce the page, exactly once", async () => {
    const wrapper = await mountAbout();
    const bubbles = wrapper.findAll('[data-testid="ziggy-speaks"]');
    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].text()).toContain("I'm the part that makes it interesting");
  });

  it("links to the author's site and back home", async () => {
    const wrapper = await mountAbout();
    const hrefs = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(hrefs).toContain("https://barnabas.me");
    expect(hrefs).toContain("/");
  });

  // The credits list is the whole point of the page, and the easiest thing to
  // let quietly rot when a dependency is added or swapped out.
  it.each([
    "Vue",
    "Vite+",
    "Pinia",
    "Vue Router",
    "Unhead",
    "Tailwind CSS",
    "daisyUI",
    "Fredoka",
    "Feather icons",
    "Howler.js",
    "canvas-confetti",
  ])("credits %s", async (name) => {
    const wrapper = await mountAbout();
    expect(wrapper.get('[data-testid="credits-list"]').text()).toContain(name);
  });

  it("gives every credited library a license and an outbound link", async () => {
    const wrapper = await mountAbout();
    const items = wrapper.get('[data-testid="credits-list"]').findAll("li");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.get("a").attributes("href")).toMatch(/^https:\/\//);
      expect(item.get(".badge").text()).toMatch(/MIT|ISC|OFL-1\.1/);
    }
  });

  it("names where the art and the sounds came from", async () => {
    const text = (await mountAbout()).text();
    expect(text).toContain("ChatGPT");
    expect(text).toContain("Gemini");
    expect(text).toContain("ElevenLabs");
  });

  it("credits the niece without naming her", async () => {
    const text = (await mountAbout()).text();
    expect(text).toContain("my niece");
    expect(text).not.toMatch(/L\.J\./);
  });
});
