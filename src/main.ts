import { createApp } from "vue";
import { createPinia } from "pinia";
import { createPersistedState } from "pinia-plugin-persistedstate";
import { createHead } from "@unhead/vue/client";
import App from "./App.vue";
import { router } from "./routes";

const app = createApp(App);
const head = createHead();
const pinia = createPinia();

pinia.use(createPersistedState());
app.use(pinia);
app.use(head);
app.use(router);
app.mount("#app");
