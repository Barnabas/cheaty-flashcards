<script lang="ts" setup>
import { useHead } from "@unhead/vue";
import { useRouter } from "vue-router";
import LevelLinks from "../components/LevelLinks.vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import { sections } from "../sections";

const props = defineProps<{
  section: string;
  level: string;
}>();

const router = useRouter();
const section = sections.find((s) => s.id === props.section);
if (section) {
  useHead({ title: section.name });
} else {
  router.push("/");
}
</script>
<template>
  <NavBreadcrumbs :section="section" />
  <section v-if="section" class="container mt-8">
    <LevelLinks :section="section" />
  </section>
</template>
