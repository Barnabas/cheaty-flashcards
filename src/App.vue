<script setup lang="ts">
import SiteHeader from "./components/SiteHeader.vue";
import { RouterView } from "vue-router";
</script>
<template>
  <SiteHeader />
  <main class="flex-grow">
    <RouterView />
  </main>
</template>
