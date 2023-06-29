<script lang="ts" setup>
import { getLevelName } from "../sections";
import { Section } from "../types";

const props = defineProps<{
  section?: Section;
  level?: string;
}>();
</script>
<template>
  <div class="breadcrumbs bg-base-200 container">
    <ul>
      <li>
        <RouterLink to="/">Home</RouterLink>
      </li>
      <li v-if="props.section">
        <RouterLink :to="'/' + props.section.id">
          {{ props.section.name }}
        </RouterLink>
      </li>
      <li v-if="props.level">
        {{ getLevelName(props.section, parseInt(props.level)) }}
      </li>
    </ul>
  </div>
</template>
