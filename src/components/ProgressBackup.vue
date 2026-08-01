<script lang="ts" setup>
import { ref } from "vue";
import IconDownload from "~icons/feather/download";
import IconUpload from "~icons/feather/upload";
import { useSettingsStore } from "../stores/settings";
import { useProgressStore } from "../stores/progress";
import { useMasteryStore } from "../stores/mastery";
import { useStreakStore } from "../stores/streak";
import { useCurriculumStore } from "../stores/curriculum";
import { buildProgressExport, parseProgressExport, applyProgressExport } from "../persistence-io";

const settings = useSettingsStore();
const progress = useProgressStore();
const mastery = useMasteryStore();
const streak = useStreakStore();
const curriculum = useCurriculumStore();
const fileInput = ref<HTMLInputElement>();
const importMessage = ref("");
const importFailed = ref(false);

function exportProgress() {
  const data = buildProgressExport({ settings, progress, mastery, streak, curriculum });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cheaty-flashcards-progress-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importProgress(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const data = parseProgressExport(await file.text());
    applyProgressExport(data, { settings, progress, mastery, streak, curriculum });
    importFailed.value = false;
    importMessage.value = "Progress imported!";
  } catch (err) {
    importFailed.value = true;
    importMessage.value = err instanceof Error ? err.message : "Import failed.";
  } finally {
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>
<template>
  <div class="flex flex-wrap items-center gap-4">
    <button class="btn btn-outline btn-sm" @click="exportProgress()" data-testid="export-button">
      <IconDownload class="w-4 h-4" />
      Export progress
    </button>
    <label class="btn btn-outline btn-sm" data-testid="import-button">
      <IconUpload class="w-4 h-4" />
      Import progress
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="importProgress"
      />
    </label>
    <span
      v-if="importMessage"
      :class="importFailed ? 'text-error' : 'text-success'"
      data-testid="import-message"
    >
      {{ importMessage }}
    </span>
  </div>
</template>
