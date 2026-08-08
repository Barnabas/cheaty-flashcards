<script lang="ts" setup>
import { computed } from "vue";
import { OperatorGroup } from "../mastery";
import { GROUP_LABELS } from "../session";

const props = defineProps<{
  group?: OperatorGroup;
  // For pages that aren't a play session and so have no group to name.
  label?: string;
}>();

const current = computed(
  () => props.label ?? (props.group ? GROUP_LABELS[props.group] : undefined),
);
</script>
<template>
  <div class="breadcrumbs bg-base-200 container">
    <ul>
      <li>
        <RouterLink to="/">Home</RouterLink>
      </li>
      <li v-if="current">
        {{ current }}
      </li>
    </ul>
  </div>
</template>
