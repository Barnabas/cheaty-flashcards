<script lang="ts" setup>
import LevelLinks from "../components/LevelLinks.vue";
import { sections } from "../sections";
</script>
<template>
  <section class="container mt-4 grid gap-8 md:grid-cols-2">
    <div v-for="section in sections" :key="section.id">
      <h2 class="font-display mb-2 flex items-center gap-2">
        <span class="text-2xl font-bold">{{ section.operator }}</span>
        <RouterLink class="text-xl text-accent" :to="'/' + section.id">
          {{ section.name }}
        </RouterLink>
      </h2>
      <LevelLinks :section="section" />
    </div>
  </section>
</template>
