import { createApp } from "vue";
import { createHead } from "@unhead/vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./routes";

const app = createApp(App);
const head = createHead();

app.use(head);
app.use(router);
app.mount("#app");
