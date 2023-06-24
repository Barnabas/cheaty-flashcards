<script setup lang="ts">
import { useHead } from "@unhead/vue";
import SiteHeader from "./components/SiteHeader.vue";
import { RouterView } from "vue-router";

useHead({
  titleTemplate: (title?: string) =>
    !title ? "Cheaty Flashcards" : `${title} - Cheaty Flashcards`,
});
</script>
<template>
  <SiteHeader />
  <main class="flex-grow">
    <RouterView />
  </main>
</template>
