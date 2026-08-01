// JSON export/import of local progress data (Phase 4). Pure serialize/parse
// logic lives here so it's testable without touching the DOM File APIs;
// components/ProgressBackup.vue owns the download/file-picker glue.
import { toRaw } from "vue";
import { OperatorGroup } from "./mastery";
import { FamilyMastery, SessionBest } from "./stores/types";
import { fnv1aHash } from "./checksum";

// Bumped from 1 -> 2 for Phase 8's progress/curriculum schema change.
// Deliberately not migrated: parseProgressExport already hard-rejects on a
// version mismatch, so an old v1 file just fails import cleanly with a
// friendly "doesn't look like a progress export" message (see PLAN.md's
// Phase 8 open questions — dropping old data on this upgrade is fine, the
// only real player is the niece this was built for).
export const PROGRESS_EXPORT_VERSION = 2;

// The payload whose contents the checksum actually covers — everything in
// ProgressExport except the checksum field itself.
export type ProgressPayload = {
  version: typeof PROGRESS_EXPORT_VERSION;
  exportedAt: number;
  settings: { soundEnabled: boolean };
  progress: { bests: Partial<Record<OperatorGroup, SessionBest>> };
  mastery: { families: Record<string, FamilyMastery> };
  streak: { current: number; best: number };
  curriculum: { active: Record<OperatorGroup, string[]> };
};

export type ProgressExport = ProgressPayload & { checksum: string };

type StoreSnapshot = {
  settings: { soundEnabled: boolean };
  progress: { bests: Partial<Record<OperatorGroup, SessionBest>> };
  mastery: { families: Record<string, FamilyMastery> };
  streak: { current: number; best: number };
  curriculum: { active: Record<OperatorGroup, string[]> };
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
    progress: { bests: structuredClone(toRaw(stores.progress.bests)) },
    mastery: { families: structuredClone(toRaw(stores.mastery.families)) },
    streak: { current: stores.streak.current, best: stores.streak.best },
    curriculum: { active: structuredClone(toRaw(stores.curriculum.active)) },
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
    typeof (data as ProgressExport).curriculum !== "object" ||
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
  stores.progress.bests = { ...data.progress.bests };
  stores.mastery.families = { ...data.mastery.families };
  stores.streak.current = data.streak.current;
  stores.streak.best = data.streak.best;
  stores.curriculum.active = { ...data.curriculum.active };
}
