<script lang="ts" setup>
import LevelLinks from '../components/LevelLinks.vue';
import { sections } from '../sections';

</script>
<template>
    <section class="container relative" v-for="section in sections" :key="section.id">
        <h2 class="mt-4 font-display mb-2 flex items-center justify-between md:w-1/2">
            <span class="text-xl text-accent">{{ section.name }}</span>
            <span class="text-4xl font-bold">{{ section.operator }}</span>
        </h2>
        <LevelLinks :section="section" />
    </section>
</template>