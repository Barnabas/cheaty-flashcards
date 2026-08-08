# Known pre-existing issues (not yet fixed)

Found during Phase 3 review, both narrow races, carried over unchanged into `PlayPage.vue` (renamed from `LevelPage.vue` in Phase 8) — still worth fixing opportunistically if a future phase is already in that file.

- `chooseAnswer()`'s wrong-answer guard (`answerTypes.value[index] !== "wrong"`) lets a double-click during the 500ms transition-to-next-question window record a spurious extra `"wrong"` mastery attempt on top of the correct one.
- `revealAnswer()`'s 1s cleanup `setTimeout` is untracked/uncancellable (unlike `streakMilestoneTimeout`), so a rapid "Replay" during a reveal can clear the wrong question's highlight early.

A third, unrelated bug was found and fixed during Phase 9 prep (2026-08-07), while verifying `pnpm build` still passed: `enterIntro()` assigned the whole `FactFamily` object returned by `curriculum.tryAutoUnlock()` straight into `highlightedKey` (typed `string | null`) instead of pulling out `.key`, unlike the equivalent assignment in `unlockBonus()`'s handler. This both broke the production type-check (`vue-tsc`, not caught by `vp check`'s lint-level type-awareness) and meant the "highlight the newly auto-unlocked family" UI could never actually have matched — silently dead since Phase 8. One-line fix.
