import { createRouter, createWebHistory } from "vue-router";

import About from "./pages/AboutPage.vue";
import Home from "./pages/HomePage.vue";
import Play from "./pages/PlayPage.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/play/:group", component: Play, props: true },
  { path: "/about", component: About },
];
export const router = createRouter({
  history: createWebHistory(),
  routes,
});
