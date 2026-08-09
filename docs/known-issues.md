# Known issues (not yet fixed)

Canonical bug list. Phase 11 (see [../PLAN.md](../PLAN.md)) cleared everything that was here — keep adding to the top section as new bugs are found, and move them down when they land. Design-level flaws (session scaling, the cheat economy) are not bugs and live in [game-vision.md](./game-vision.md) / the Act 2 phases instead.

**Currently open: none.**

## Fixed in Phase 11 (2026-08-08)

From the whole-app review (2026-08-08, found by playing in-browser):

- **Mobile overflow on the play screen**: at 390px the two cheat buttons didn't wrap, so "Beg Ziggy to reveal it (3)" hung off the right edge and the core play screen scrolled horizontally. The inner button row in `PlayPage.vue` needed `flex-wrap`.
- **Failing test on this branch**: `SiteFooter.test.ts` expected `rel` containing `noopener` on the barnabas.me link; the link had `target="_blank"` and no `rel`.
- **The session's final answer got no feedback**: a correct answer that completed the session called `finishSession()` immediately — no green flash, no "correct" sound — making the climax of a session the one answer with no reward.
- **Progress bar moved backwards**: its `max` was `questions.length`, which grows as follow-up batches append mid-session. Now it counts cleared (family, operator) permutations against the session's target list, high-water-marked.
- **Silent session abandonment**: navigating Home/breadcrumbs mid-session discarded the round with no confirmation. Now an `onBeforeRouteLeave` guard holds the navigation while a modal asks.
- **Decimal percentages shown to kids**: `formatPercent()` rendered "100.0%"; it now rounds to whole percent. (The fuller counts-not-percents rework is still Phase 15.)

From the Phase 3 review (narrow races, carried through the Phase 8 rename to `PlayPage.vue`):

- `chooseAnswer()`'s wrong-answer guard let a double-click during the 500ms transition-to-next-question window record a spurious extra `"wrong"` mastery attempt on top of the correct one. An `isResolving` flag now freezes the question — including the cheat buttons — until the next one is up.
- `revealAnswer()`'s 1s cleanup `setTimeout` was untracked/uncancellable, so a rapid "Replay" during a reveal could clear the wrong question's highlight early. It's tracked now and cancelled on answer, on `beginSession()`, and on unmount.

## Historical

A third bug was found and fixed during Phase 9 prep (2026-08-07): `enterIntro()` assigned a whole `FactFamily` object into `highlightedKey` (typed `string | null`) instead of `.key`, breaking the production type-check and leaving the auto-unlock highlight silently dead since Phase 8. Kept here as a reminder that `vp check`'s lint-level type-awareness does not catch everything `vue-tsc` (via `pnpm build`) does.
