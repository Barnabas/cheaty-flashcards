# Known issues (not yet fixed)

Canonical bug list. Phase 11 (see [../PLAN.md](../PLAN.md)) is scoped to clear everything here — update this file as items land. Design-level flaws (session scaling, the cheat economy) are not bugs and live in [game-vision.md](./game-vision.md) / the Act 2 phases instead.

## From the whole-app review (2026-08-08, found by playing in-browser)

- **Mobile overflow on the play screen**: at 390px width the two cheat buttons don't wrap — "Beg Ziggy to reveal it (3)" hangs off the right edge and the core play screen scrolls horizontally. The inner button row in `PlayPage.vue` (`div.flex.gap-2` holding eliminate/reveal) lacks `flex-wrap`.
- **Failing test on this branch**: `SiteFooter.test.ts` expects `rel` containing `noopener` on the barnabas.me link; `SiteFooter.vue` has `target="_blank"` with no `rel`. One-line fix, and the suite is red until it lands.
- **The session's final answer gets no feedback**: a correct answer that completes the session calls `finishSession()` immediately — no green flash, no "correct" sound — so the climax of a session is the one answer with no reward.
- **Progress bar moves backwards**: its `max` is `questions.length`, which grows as follow-up batches append mid-session, so the bar visibly jumps back.
- **Silent session abandonment**: navigating Home/breadcrumbs mid-session discards the session with no confirmation and no partial credit.
- **Decimal percentages shown to kids**: `formatPercent()` renders "100.0%" everywhere, including the outro score. (Display-only rounding fix here; the fuller counts-not-percents rework is Phase 15.)

## From the Phase 3 review (narrow races, carried through the Phase 8 rename to `PlayPage.vue`)

- `chooseAnswer()`'s wrong-answer guard (`answerTypes.value[index] !== "wrong"`) lets a double-click during the 500ms transition-to-next-question window record a spurious extra `"wrong"` mastery attempt on top of the correct one.
- `revealAnswer()`'s 1s cleanup `setTimeout` is untracked/uncancellable (unlike `streakMilestoneTimeout`), so a rapid "Replay" during a reveal can clear the wrong question's highlight early.

## Historical

A third bug was found and fixed during Phase 9 prep (2026-08-07): `enterIntro()` assigned a whole `FactFamily` object into `highlightedKey` (typed `string | null`) instead of `.key`, breaking the production type-check and leaving the auto-unlock highlight silently dead since Phase 8. Kept here as a reminder that `vp check`'s lint-level type-awareness does not catch everything `vue-tsc` (via `pnpm build`) does.
