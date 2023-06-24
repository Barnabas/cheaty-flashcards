<script lang="ts" setup>
import LevelLinks from "../components/LevelLinks.vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import { sections } from "../sections";

const props = defineProps<{
  section: string;
  level: string;
}>();

const section = sections.find((s) => s.id === props.section);
</script>
<template>
    <NavBreadcrumbs :section="section" />
    <section class="container mt-8">
      <LevelLinks :section="section" />
    </section>
</template>