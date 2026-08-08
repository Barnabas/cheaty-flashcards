import { describe, expect, it } from "vite-plus/test";
import { mount } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
import SiteFooter from "./SiteFooter.vue";

async function mountFooter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/about", component: { template: "<div />" } },
    ],
  });
  await router.push("/");
  await router.isReady();
  return mount(SiteFooter, { global: { plugins: [router] } });
}

describe("SiteFooter", () => {
  it("is how you find the About page from anywhere in the app", async () => {
    const wrapper = await mountFooter();
    const hrefs = wrapper.findAll("a").map((link) => link.attributes("href"));
    expect(hrefs).toContain("/about");
  });

  it("opens the author's site in a new tab, safely", async () => {
    const wrapper = await mountFooter();
    const external = wrapper.get('a[href="https://barnabas.me"]');
    expect(external.attributes("target")).toBe("_blank");
    expect(external.attributes("rel")).toContain("noopener");
  });
});
