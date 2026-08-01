import { createRouter, createWebHistory } from "vue-router";

import Home from "./pages/HomePage.vue";
import Play from "./pages/PlayPage.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/play/:group", component: Play, props: true },
];
export const router = createRouter({
  history: createWebHistory(),
  routes,
});
