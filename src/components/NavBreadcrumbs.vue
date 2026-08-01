<script lang="ts" setup>
import { OperatorGroup } from "../mastery";
import { GROUP_LABELS } from "../session";

const props = defineProps<{
  group?: OperatorGroup;
}>();
</script>
<template>
  <div class="breadcrumbs bg-base-200 container">
    <ul>
      <li>
        <RouterLink to="/">Home</RouterLink>
      </li>
      <li v-if="props.group">
        {{ GROUP_LABELS[props.group] }}
      </li>
    </ul>
  </div>
</template>
