# Phase 11 — Playability repairs

Full detail behind the one-line summary in PLAN.md. Bug fixes only: every entry that was open in [../known-issues.md](../known-issues.md), nothing from the Act 2 design work. Where a fix had a choice of shapes, the one that doesn't prejudge Phases 12–17 won.

## The 390px overflow was one missing `flex-wrap`

The play screen's cheat row is a `justify-between` flex container holding an inner `div.flex.gap-2` (eliminate + reveal) and the token counter. The outer container wrapped; the inner one didn't, so the two long buttons stayed on one line and pushed the document to ~430px wide at a 390px viewport — horizontal scroll on the one screen the game is actually played on. Adding `flex-wrap` to the inner row is the entire fix; verified with Playwright that `documentElement.scrollWidth === clientWidth` at 390px on both the play and outro screens, and unchanged at 1280px.

The desktop composition is still lopsided (everything in the top-left, a long empty column below). That's Phase 17's brief, not a bug.

## Every answer gets feedback, including the last one

`chooseAnswer()` had two branches for a correct answer: the session-ending one called `finishSession()` synchronously, and every other one played the "correct" sound, flashed the button green, and handed off after 500ms. So the best answer of the session — the one that finished it — was the only one that got nothing.

Now there's one path: feedback always fires, and the 500ms timeout either advances to the next question or calls `finishSession()`. The session-end check runs at answer time (before the timeout) so `metrics` are read at the moment of the answer, not half a second later.

This changed the outro tests' timing: completing a session now needs the final `advanceTimersByTime(500)` that the intermediate answers already needed.

## The progress bar now measures the actual end condition

The bar was `value = questionIndex + 1` over `max = questions.length`, and `questions.length` grows whenever `ensureQueueHasNext()` appends a follow-up batch — so the bar visibly jumped backwards mid-session, exactly when a player is already struggling.

Rather than freezing the denominator, the bar now measures what actually ends a session: how many of `sessionTargetKeys` (one per family/operator permutation) are `"clean"`. That reaches 100% precisely when the session ends, instead of tracking a queue length that means nothing to the player. A follow-up question can knock an already-clean permutation back to `"retry"`, so the displayed value is high-water-marked in a `progressValue` ref — losing ground mid-session reads as lost work, and Phase 14/15 own the drama of a card being taken back, in a place where it's explained.

Consequence worth knowing: the bar now starts at 0 (it used to start at 1/N) and moves in one step per permutation, so it's slower and truthful rather than fast and decorative. Phase 12 reseats sessions on a 4–6 card table, which shortens the bar's span considerably.

## Abandonment: a route guard, not a `beforeunload`

`onBeforeRouteLeave` returns a promise that the modal's two buttons resolve — hold the navigation, ask, then resolve `true`/`false`. It's scoped to `phase === "active"`, so the intro's own `?focus=` navigation and the outro's Home button (which has a test) stay unblocked.

Deliberately not covered: closing the tab or hitting browser reload. A `beforeunload` handler would fire on PWA refreshes and shows an untranslatable browser dialog, which is a worse trade for a kid's app than accepting that the round is lost when the app is closed.

The copy is deliberately not in Ziggy's voice ("Leave this round? Everything you got right already counts. The round itself stops here, with no score."). There's already a Ziggy on the play screen, and Phase 9's one-Ziggy-per-moment rule holds; a modal that speaks as him without showing him reads as a system dialog wearing a costume. It's also literally accurate — per-answer mastery is banked as you go, and only the session summary/personal best is thrown away.

Because it's a route guard, it only registers when the page is rendered inside a `RouterView`. The existing tests mount `PlayPage` directly (`inject(matchedRouteKey)` falls back to a no-op there), so the three new leave-guard tests mount a `RouterView` app instead.

## The two Phase 3 races

Both were real but narrow, and both are now closed by tracking state that was previously implicit:

- **`isResolving`** is true from a correct answer until the next question is on screen. `chooseAnswer()` returns early while it's set, which kills the spurious extra `"wrong"` attempt a double-tap used to record. It also gates `canEliminate`/`canReveal` — an unlisted variant of the same bug, where you could still buy a reveal (and break your streak) for a question you'd already answered correctly.
- **The reveal-flash cleanup** is tracked instead of fire-and-forget, and cancelled on answering, on starting a session, and on unmount (it's a `useTimeoutFn` in `useHintTokens` after the decomposition below, so the unmount case comes free). The test asserts `vi.getTimerCount() === 0` once the question has moved on, which is the property that was violated rather than any particular symptom.

## Percentages

`formatPercent()` drops to whole numbers (`Math.round`), which fixes the kid-facing decimals in the outro score and the home-page best badge in one place. New `src/utils.test.ts` pins it. The deeper change — counts of cards instead of percentages at all — is Phase 15's, and this doesn't get in its way.

## Decomposition: `PlayPage.vue` 700 lines → 183

Raised during review: a page that large is unmaintainable regardless of how central it is, and `@vueuse/core` had just been added to lean on instead of hand-rolled plumbing. Treat ~200 lines as the signal to split — now recorded in [../maintainer-notes.md](../maintainer-notes.md) so it outlives this phase.

The split follows the jobs the Act 2 phases will actually touch, so the next agent edits one small file instead of a big one:

| File                             | Lines      | Job                                                                                                                                                    |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pages/PlayPage.vue`             | 183        | intro/active/outro phase machine, route + curriculum wiring                                                                                            |
| `composables/usePlaySession.ts`  | 293        | the session runtime: queue, answer handling, mastery/streak recording, end condition (Phase 12's ground)                                               |
| `composables/useHintTokens.ts`   | 85         | the cheat economy: budget, costs, eliminate/reveal (Phase 13's ground)                                                                                 |
| `composables/useLeaveConfirm.ts` | 26         | route guard + confirm dialog                                                                                                                           |
| `components/play/*.vue`          | 25–99 each | one screen or one control each: `SessionIntro`, `SessionOutro`, `QuestionCard`, `CheatControls`, `StreakToast`, `SessionProgress`, `LeaveSessionModal` |

`usePlaySession` is the one file still over 200. It's a single state machine — the remaining seams (question queue vs. answer handling) share `answerTypes` and `currentQuestion` closely enough that splitting them would cost more in parameter-passing than it buys. Phases 12 and 13 will both cut into it; better to let them re-shape it than to pre-carve it now.

Presentation logic moved with its markup rather than staying behind as props: `SessionIntro` owns Ziggy's intro lines and pose, `SessionOutro` owns his reaction pose and the formatting, `QuestionCard` owns answer-button classes, `CheatControls` owns the low-token colour. Both intro and outro read the mastery store directly for stage values instead of taking a `stages` prop — they're app-specific screens, not generic widgets.

### Considered and rejected: provide/inject for the play screens

`createInjectionState` (or a plain provide/inject) would fit a deep tree where intermediate components pass props they never read. That isn't the shape here: `PlayPage` → screen component is exactly one level, and every child consumes every prop it's given. Injecting would trade a typed, visible interface for an implicit one, and would mean each screen could no longer be mounted on its own in a test without a provider — a real cost given Phases 12–17 all rework these screens. Revisit only if Phase 14's card table grows a genuinely nested tree.

What did help was Vue 3.4's same-name shorthand (`:group` for `:group="group"`), applied wherever the local name already matched the prop name. It also makes the exceptions legible: after the shorthand attributes, the only remaining `:prop="value"` bindings are the ones where the name genuinely changes (`targetFamilies` → `families`, `currentQuestion` → `question`, `focusQuery` → `focus`). This switched those bindings from kebab-case to camelCase, which cost nothing — the kebab bindings introduced earlier in this phase were the only component-prop kebab in the codebase; everything else in kebab is a real HTML attribute (`aria-*`, `data-*`) and stays that way.

### What VueUse replaced

- `useTimeoutFn` for the question hand-off and the reveal flash: both auto-stop on scope dispose, which deleted the `onUnmounted` cleanup block and the three `let …Timeout` handles. `start()` takes the callback's arguments, so the hand-off passes "is this the final answer?" through instead of a captured variable.
- `refAutoReset(null, 2500)` for the streak-milestone toast — the toast now takes itself down, so there's no timeout to remember. One wrinkle worth knowing: **writing the ref restarts its timer**, so `dismissStreakMilestone()` only writes when there's actually a toast up. Without that guard, every hint purchase would leave a stray 2.5s timer pending (which the reveal-cleanup test catches, via `vi.getTimerCount()`).
- `useConfirmDialog` for the leave modal: `reveal()` returns the promise the route guard awaits, and `confirm`/`cancel` are the modal's two buttons. This replaced a hand-rolled `pendingLeave` resolver ref.
- `createEventHook` for "the session ended", so the composable doesn't need to know that the page calls that state `phase === "outro"`.

Not adopted: `@vueuse/math`'s `useMax` for the progress high-water mark (separate package, not installed) and `@vueuse/router`'s `useRouteQuery` for `?focus=` (same reason).

The refactor changed no test file and no `data-testid` — all 167 tests passed unmodified afterwards, which is the main evidence that behaviour is unchanged.

## Verification

`vp check` clean, `vp test` green (19 files, 167 tests — 11 new), `pnpm build` (vue-tsc + Vite + PWA) clean. Real-browser pass with Playwright against `vp preview` at 390×844 and 1280×800: no horizontal overflow on the play or outro screens, leave-modal shown and navigation actually held (URL unchanged) with "Keep playing" returning to the live question, a full session played to the outro with the progress bar never decreasing, whole-number score on the outro, and the outro's Home button navigating without a prompt. No page errors.

Re-run end-to-end after the decomposition, on the rebuilt bundle: same checks plus token spend (5 → 4 with two answers hidden), Replay restoring a full budget, the streak line appearing after a clean answer, the bonus-fact button adding a family, and `?focus=` filtering the intro from 5 families to 2. No console or page errors.
