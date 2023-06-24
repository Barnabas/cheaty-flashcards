import { createRouter, createWebHashHistory } from "vue-router";

import Home from "./pages/HomePage.vue";
import About from "./pages/AboutPage.vue";
import Section from "./pages/SectionPage.vue";
import Level from "./pages/LevelPage.vue";

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/:section', component: Section, props: true, },
  { path: '/:section/:level', component: Level, props: true, },
]
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

