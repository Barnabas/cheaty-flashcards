<script lang="ts" setup>
import { ref } from "vue";
import { useHead } from "@unhead/vue";
import { useRouter } from "vue-router";
import LevelLinks from "../components/LevelLinks.vue";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import { sections } from "../sections";
import { operatorGroup, operatorsForGroup } from "../mastery";

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

const mixedLabel = section ? operatorsForGroup(operatorGroup(section.operator)).join("/") : "";
const focusInput = ref("");

function practiceFocusNumbers() {
  if (!section || !focusInput.value.trim()) return;
  router.push({ path: `/${section.id}/1`, query: { focus: focusInput.value.trim() } });
}

function practiceMixed() {
  if (!section) return;
  router.push({ path: `/${section.id}/1`, query: { mixed: "1" } });
}
</script>
<template>
  <NavBreadcrumbs :section="section" />
  <section v-if="section" class="container mt-8 flex flex-col gap-6">
    <LevelLinks :section="section" />
    <div class="flex flex-wrap items-center gap-4">
      <button class="btn btn-secondary" @click="practiceMixed()">
        Mixed {{ mixedLabel }} Practice
      </button>
      <form class="flex items-center gap-2" @submit.prevent="practiceFocusNumbers()">
        <input
          v-model="focusInput"
          type="text"
          placeholder="Focus on numbers (e.g. 7,8)"
          class="input input-bordered"
        />
        <button class="btn" type="submit">Go</button>
      </form>
    </div>
  </section>
</template>
