# Phase 8 — Adaptive sessions: retire "levels", introduce a progressive curriculum — done (2026-08-01)

Full detail behind the one-line summary in PLAN.md.

## The ask, and why

The original level-numbered-route design (`/:section/:level`, fixed
10-question levels 1–8) existed for one reason: to make a specific drill
shareable via URL. Once mastery/progress moved into `localStorage` per player
(Phase 1) and difficulty became adaptive (Phase 2), a "level number" stopped
meaning anything stable — it wasn't tied to difficulty, and nothing gated
what facts a player had actually been introduced to. This phase removes the
concept outright rather than patching around it.

## Curriculum: starter set, unlock, bonus fact

New `src/curriculum.ts` (pure, same store-independent style as `mastery.ts`)
plus `src/stores/curriculum.ts` (thin Pinia wrapper, `persist: true`, new
localStorage key `"curriculum"`):

- **Teaching order** (`curriculumOrder`): fact families sorted ascending by
  sum (add group) or product (multiply group), so small facts unlock first —
  2+2 long before 9+9.
- **Starter set**: `STARTER_FAMILY_COUNT = 4` families per group, seeded on
  first visit (`ensureSeeded`, called both from `PlayPage.vue`'s intro and
  from `OperatorGroupPanel.vue` on Home — see gotcha below on why it needs to
  fire in both places).
- **Auto-unlock** (`isReadyToUnlock`): the next family unlocks once **every**
  currently-active family is at Leitner stage ≥ `UNLOCK_STAGE_THRESHOLD = 3`
  (of `MAX_STAGE = 5`) **and** has been seen ≥ `UNLOCK_MIN_SEEN = 3` times.
  Deliberately "all," not an average — a weak family shouldn't be able to
  hide behind strong ones pulling the average up.
- **Bonus fact**: a player-initiated unlock (`unlockBonus`) that adds the
  next family immediately, bypassing the mastery gate — surfaced as an
  "Ask Ziggy for a bonus fact" button on the session intro screen.

These starter/threshold numbers are reasonable starting guesses, not
validated against real play yet (see PLAN.md's Phase 8 open questions,
resolved below) — cheap to retune later since they're just constants.

## Session generation and lifecycle

New `src/session.ts` replaces `sections.ts`'s `generateLevel()`. Key
departures from the old fixed-length model:

- **Curriculum-scoped pool.** Questions are drawn from the player's active
  families, not the full 36-family pool per group. `focusNumbers` (`?focus=`)
  still filters on top, same fallback-to-full-set behavior as before if the
  filter matches nothing.
- **Mixed practice is now unconditional** — every family is drilled with
  both of the group's inverse operators (`+`/`-`, `×`/`÷`), not a
  coin-flipped pick between them. The old `?mixed=1` opt-in query param is
  gone entirely.
- **Dynamic composition + end conditions, tracked per (family, operator)
  permutation.** `buildInitialQuestions()` gives one question for each
  operator of every target family up front (`buildSessionTargetKeys()`
  enumerates both). A permutation becomes `"clean"` once answered correctly
  without a hint (regardless of earlier wrong guesses on that same question
  — matches how the existing `recordStreak()` already only cared about
  hints, not wrongs). The session ends early once every target permutation
  is `"clean"` (`isSessionComplete`) — both directions of a family, not just
  whichever one came up first, which is what turns "ends on a clean pass"
  into a real minimum session length instead of one lucky guess per family
  ending things; otherwise `buildFollowUpQuestions()` draws another batch,
  weighted heavily toward permutations that aren't `"clean"` yet (never
  seen this session, or most recently wrong/cheated) — with already-clean
  permutations still occasionally redrawn for interleaved review. A hard
  cap (`SESSION_MAX_QUESTIONS = 20` or `SESSION_MAX_MS = 3 minutes`,
  whichever first) guarantees a struggling player still gets to stop.
- **`PlayPage.vue`** (renamed from `LevelPage.vue`) now runs an explicit
  `phase: "intro" | "active" | "outro"` state machine instead of a single
  quiz screen with a separate level-list page. Intro shows the target
  families as `FactFamilyShape` tiles (triangle, factors at the base corners,
  sum/product at the apex, colored by mastery stage) with answers already
  visible — a teaching moment, not a quiz. Outro shows a per-family
  before/after stage recap, then Replay (same set, skips straight back to
  active) / Advance (back to intro, re-running the auto-unlock check) / Home.

## A route-reactivity gotcha this phase introduced (and fixed before it shipped)

`/play/:group` is a single route matching both `add` and `multiply`, so
vue-router can reuse the `PlayPage.vue` instance across a direct
`add` → `multiply` navigation (manual URL edit, or browser back/forward
between two play sessions) without remounting — the same class of trap
documented for the old per-level route. The first draft captured `group` as
a plain `const` at setup time, which would go stale in that scenario. Fixed
by making it a `computed` off `props.group` with an `immediate` `watch()`
that re-runs intro setup on any change — in practice this rarely fires
(the only in-app entry point is Home, a full remount), but it's a real gap a
manual URL edit or back-button could hit, and it was cheap to close properly
rather than leave as a known-but-unfixed gotcha.

## Badge/milestone rework

`sectionId:level`-keyed `PersonalBest` records (8 possible keys per group)
don't mean anything once levels are gone. Replaced with `SessionBest` keyed
by `OperatorGroup` alone (2 keys total) — `stores/progress.ts`'s
`recordSessionResult()`/`getBest()` mirror the old
`recordLevelResult()`/`getPersonalBest()` API shape (same new-best /
faster-time tiebreak logic) with the level dimension simply dropped.
`milestones.ts`'s `highestClearedLevel()` (an 8-iteration loop) collapses to
`hasClearedGroup()` (one threshold check) — `SESSION_CLEAR_THRESHOLD` is the
same 0.8 value, renamed from `LEVEL_CLEAR_THRESHOLD`.

**No migration needed** — this was already answered in PLAN.md's open
questions before this phase started (the only real player is the niece this
was built for, and dropping old `personalBests` data on upgrade is fine).
`PROGRESS_EXPORT_VERSION` bumped 1 → 2; `parseProgressExport` already
hard-rejects on a version mismatch, so an old v1 export file just fails
import cleanly with the existing "doesn't look like a progress export"
message — no special-casing required.

One gap not explicitly called out in the original phase checklist: the JSON
export/import shape needed a new `curriculum: { active }` field, or a
backup/restore round-trip would have silently dropped which facts a player
had unlocked. Added and covered by both unit tests
(`persistence-io.test.ts`) and a manual browser check (export → clear
`localStorage` → import → confirm the exact unlocked-family keys, including
a bonus-unlocked one, survived byte-for-byte).

## What surprised me during implementation

`OperatorGroupPanel.vue`'s "X / Y facts mastered" summary switched from the
full static 36-family pool to `curriculum.activeFamilies(group)`. That's
correct per this phase's intent (don't show progress against facts the
player hasn't been introduced to yet) — but it meant the summary would read
"0 / 0" for a brand-new player who visits Home without ever having pressed
Play, since curriculum seeding previously only happened inside
`PlayPage.vue`'s intro. Fixed by also calling `curriculum.ensureSeeded()`
from `OperatorGroupPanel.vue` itself, so the starter set (and its mastery
summary) is visible from the very first Home page view — caught by updating
`HomePage.test.ts`'s mastery-summary fixture, not by inspection.

## What Phase 8 deliberately didn't touch

- `MasteryGrid.vue`'s full 64-cell heatmap stays showing the entire pool, not
  just active families — trimming that to an active-only view is explicitly
  Phase 9's job (`FactFamilyShape` tiles replacing the grid entirely).
- No new settings/preferences for session length or curriculum pacing beyond
  the bonus-fact button — the hard-cap and unlock-threshold constants are
  fixed values, not player-configurable.
- Did not migrate or attempt to preserve old `personalBests`/level-shaped
  localStorage data — confirmed unnecessary per PLAN.md's pre-answered open
  question.

## Open questions, resolved

Values actually shipped, replacing PLAN.md's "rough starting guess" framing
(all easy to retune later, just constants):

- Starter-set size: **4 families per group**.
- Unlock threshold: **every active family at Leitner stage ≥ 3 (of 5) with
  ≥ 3 attempts** — "all," not an average.
- Session end conditions: clean pass on **every target family's both
  operators** ends it early — a guaranteed minimum length, not just one
  lucky guess per family; hard cap is **20 questions or 3 minutes**,
  whichever comes first.
- `FactFamilyShape` visual: a CSS `clip-path` triangle (not SVG) so it could
  directly reuse `dashboard.ts`'s existing `stageBgClass()` background-color
  classes instead of introducing a parallel `fill-*` color mapping — factors
  at the base corners, sum/product at the apex, ring/pulse for a
  newly-unlocked highlight.

## Verification

- `pnpm check` — clean (format/lint/typecheck) after fixing two real type
  errors surfaced by this phase's schema change: `progress.bests` and
  `curriculum.active` needed to be honestly typed as
  `Partial<Record<OperatorGroup, ...>>` (the store state starts `{}`, not
  fully populated) rather than a plain `Record`, which a test fixture
  missing one group's key correctly caught.
- `pnpm test` — 125/125 passing (16 test files; new `curriculum.test.ts`,
  `stores/curriculum.test.ts`, `session.test.ts`, `FactFamilyShape.test.ts`,
  `pages/PlayPage.test.ts`; rewrote `stores/progress.test.ts`,
  `milestones.test.ts`, `persistence-io.test.ts`, `stores/persistence.test.ts`,
  `pages/HomePage.test.ts`; deleted `sections.test.ts`, `LevelPage.test.ts`).
- Manual real-browser check via scratch Playwright scripts against
  `vp preview` (deleted after, per the established pattern): full session
  lifecycle (Home → intro with bonus-fact unlock → active quiz with the
  cheat mechanic → outro with confetti/new-best badge → Replay → Advance →
  Home), `?focus=` filtering, and an export → localStorage-clear → import
  round-trip confirming curriculum + session-best data survive exactly.
  Zero console/page errors throughout.
