<script lang="ts" setup>
import { getLevelName } from "../sections";
import { Section } from "../types";

const props = defineProps<{
  section: Section;
}>();
</script>
<template>
  <div class="flex flex-wrap gap-4">
    <RouterLink
      class="btn"
      v-for="level in 8"
      :to="'/' + props.section.id + '/' + level"
      :key="level"
    >
      {{ getLevelName(props.section, level) }}
    </RouterLink>
  </div>
</template>
