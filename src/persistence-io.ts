// JSON export/import of local progress data (Phase 4). Pure serialize/parse
// logic lives here so it's testable without touching the DOM File APIs;
// components/ProgressBackup.vue owns the download/file-picker glue.
import { toRaw } from "vue";
import { FamilyMastery, PersonalBest } from "./stores/types";
import { fnv1aHash } from "./checksum";

export const PROGRESS_EXPORT_VERSION = 1;

// The payload whose contents the checksum actually covers — everything in
// ProgressExport except the checksum field itself.
export type ProgressPayload = {
  version: typeof PROGRESS_EXPORT_VERSION;
  exportedAt: number;
  settings: { soundEnabled: boolean };
  progress: { personalBests: Record<string, PersonalBest> };
  mastery: { families: Record<string, FamilyMastery> };
  streak: { current: number; best: number };
};

export type ProgressExport = ProgressPayload & { checksum: string };

type StoreSnapshot = {
  settings: { soundEnabled: boolean };
  progress: { personalBests: Record<string, PersonalBest> };
  mastery: { families: Record<string, FamilyMastery> };
  streak: { current: number; best: number };
};

function checksumFor(payload: ProgressPayload): string {
  return fnv1aHash(JSON.stringify(payload));
}

export function buildProgressExport(stores: StoreSnapshot): ProgressExport {
  const payload: ProgressPayload = {
    version: PROGRESS_EXPORT_VERSION,
    exportedAt: Date.now(),
    settings: { soundEnabled: stores.settings.soundEnabled },
    // Store state is a Vue reactive Proxy; structuredClone can't handle a
    // Proxy directly, but toRaw() unwraps it back to the plain object the
    // store actions actually assigned, which structuredClone can then clone
    // freely (so mutating the store later doesn't mutate this snapshot).
    progress: { personalBests: structuredClone(toRaw(stores.progress.personalBests)) },
    mastery: { families: structuredClone(toRaw(stores.mastery.families)) },
    streak: { current: stores.streak.current, best: stores.streak.best },
  };
  return { ...payload, checksum: checksumFor(payload) };
}

// Throws on anything that doesn't look like a real, untampered export —
// callers should present that as a friendly message rather than letting a
// raw JSON.parse/shape error surface. Two distinct failure modes get
// distinct messages: "not our file format" vs. "this file was edited".
export function parseProgressExport(json: string): ProgressExport {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (
    !data ||
    typeof data !== "object" ||
    (data as ProgressExport).version !== PROGRESS_EXPORT_VERSION ||
    typeof (data as ProgressExport).settings !== "object" ||
    typeof (data as ProgressExport).progress !== "object" ||
    typeof (data as ProgressExport).mastery !== "object" ||
    typeof (data as ProgressExport).streak !== "object" ||
    typeof (data as ProgressExport).checksum !== "string"
  ) {
    throw new Error("That file doesn't look like a Cheaty Flashcards progress export.");
  }

  const { checksum, ...payload } = data as ProgressExport;
  if (checksum !== checksumFor(payload)) {
    throw new Error("That file doesn't match its checksum — it looks like it was edited.");
  }
  return data as ProgressExport;
}

export function applyProgressExport(data: ProgressExport, stores: StoreSnapshot) {
  stores.settings.soundEnabled = data.settings.soundEnabled;
  stores.progress.personalBests = { ...data.progress.personalBests };
  stores.mastery.families = { ...data.mastery.families };
  stores.streak.current = data.streak.current;
  stores.streak.best = data.streak.best;
}
