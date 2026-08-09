# Phase 12 — Sessions that stay short and completable

Full detail behind the one-line summary in PLAN.md. First Act 2 phase to change the game rather than repair it, so it follows [../game-vision.md](../game-vision.md) where that conflicts with older docs.

The problem in one line: a session targeted every curriculum-active family, so its floor was two questions per active family — 20 questions by the time 10 families were in play, and mathematically impossible past that against a 20-question cap. Every late-game session ended at the hard cap, which is also why "0 of 8 facts down" could follow a flawless round.

## The table

`selectTable()` (in `session.ts`) seats at most `TABLE_MAX_SEATS = 6` families for a session, and everything else follows from that: the clean-pass end condition is scoped to the table, so a session is 12 questions at the floor whether the player has 4 cards in play or all 36.

Seats are filled in tiers rather than by one weighted draw across everything:

1. **Required** — a card Ziggy just dealt. Without this the intro can glow a "New!" card the session then never asks about.
2. **Ziggy's hand** — families below the winning stage (`UNLOCK_STAGE_THRESHOLD`), which take every remaining seat but one.
3. **Review** — `TABLE_REVIEW_SEATS = 1` for a card the player has already won, so defending what you hold is part of an ordinary session rather than a separate mode.

When there aren't enough unwon families to fill the table — late game, or a narrow `?focus=` — won cards take the spare seats instead of the table shrinking. Within each tier the pick is the existing mastery-weighted sampler, which grew a `distinct` option (`selectFamilies(..., { distinct: true })`) to sample without replacement; per-question sampling deliberately keeps sampling with replacement, since repetition there is the point.

Tiering matters more than weighting here. `familyWeight` only spans 6:1, so a stage-0 family among 35 stage-2 families is merely 1.5× as likely to be seated — the thing that actually guarantees the weakest cards get played is that unwon cards only compete with other unwon cards for five of the six seats.

The table is a `ref` on `PlayPage`, not a `computed`: seating reads the mastery store _and_ an rng, so a computed would re-roll the table underneath a session in progress every time an answer moved a stage. It's reseated at exactly three moments — entering the intro, taking a bonus card, and a `?focus=` edit (which doesn't remount the page, per PLAN.md's gotcha, so nothing else re-runs).

## Ziggy deals when you clear the table

The unlock rule moved scope: `tryAutoUnlock()` now takes the set to judge, and `PlayPage` passes **the table just played** instead of every active family. This is the vision's one rule — "win every card at the table and Ziggy deals a new one" — and it's the rule that makes dealing survive a big collection. The old rule needed all N active families at stage ≥3 simultaneously; that's reachable while N is small, but one persistently-hard card among 25 silently stops Ziggy dealing forever, with nothing on screen to explain why.

An empty scope never unlocks, which is what stops a card being dealt for a session nobody played (the check runs on entering the intro, including the first one of a visit). The known cost: leaving the page before pressing Advance defers the deal to the end of the next session rather than losing it, since `table` is component state. Making that survive a reload means persisting card movements, which is Phase 14's job.

`UNLOCK_MIN_SEEN = 3` is unchanged and still does useful work — a seated family gets two questions per session, so winning a card still takes more than one lucky session.

## Two misses and the question is his

A question now ends on a right answer **or** a second miss. On the second, Ziggy states the answer himself for free, keeps the card, and play moves on after 2.6s (versus 500ms for a correct answer's green flash — there's a sentence to read). Tapping every button is no longer a route to the right one.

The family takes its wrong-outcome hit **once per question, on the first miss**. A second miss is the same question still being wrong, not a second demotion — `missesThisQuestion` replaced the old `hadWrongThisQuestion` boolean precisely so the difference is expressible.

`ZiggyReveal.vue` is a toast, matching `StreakToast`'s shape rather than an inline speech bubble: the answer buttons must not move under a player who is mid-tap. Its taunt is indexed by the correct answer rather than picked at random, so the same fact doesn't get a different line every time it's missed and nothing has to hold a counter. He's smug about keeping the card, never about the player's ability.

Deliberately unchanged: a miss does not break the cheat-free streak. The streak counts clean _correct_ answers, so a taken question simply doesn't extend it — and Ziggy's free reveal isn't something the player bought. Phase 13 rebuilds the streak into the earning engine and can revisit it there.

## What the simulation found

The property test (`session.test.ts`, `describe("session length")`) plays whole sessions over the pure API — seat a table, answer with a given miss chance, draw follow-up batches, stop on a clean pass or the cap. It immediately found a real flaw that no unit test would have: **follow-up batches were re-asking already-clean permutations, and each such question had a 25%-ish chance of un-clearing one.** On a 12-permutation table that made a struggling player's session a random walk, and the "rare fallback" hard cap became the usual ending.

So `buildFollowUpQuestions()` narrowed from "boost the unclean ones by `RETRY_WEIGHT_BOOST`" to "ask nothing else" (with a defensive fallback to the full set, which a live session can't reach — it would have ended). Interleaved review of cards the player already holds is the table's review seat now, not the follow-up batch's job.

Measured clean-pass rate and average session length, 2000 seeded runs each, all 36 families in play:

| cap | 15% miss     | 25% miss     | 40% miss     |
| --- | ------------ | ------------ | ------------ |
| 16  | 71.0% / 14.3 | 37.0% / 15.3 | 6.7% / 15.9  |
| 18  | 92.0% / 14.7 | 63.0% / 16.4 | 20.5% / 17.7 |
| 20  | 95.5% / 14.9 | 74.4% / 17.1 | 30.4% / 19.2 |
| 24  | 99.6% / 15.0 | 94.7% / 17.6 | 60.1% / 21.5 |

`SESSION_MAX_QUESTIONS` went 20 → **24** on that evidence: at the old 20 a quarter of an average player's sessions still ended at the cap. A perfect session is 12 questions, a typical one 15–18, and `SESSION_MAX_MS` (3 min, unchanged) is the real backstop for a genuinely struggling player — which is the right shape, since that player is also sitting through 2.6s reveals.

## Consequences worth knowing

- **The progress bar's high-water mark is now belt-and-braces.** Nothing re-asks a clean permutation, so it can't regress. Left in place (with the comment corrected) because Phases 14/16 put cards back in play mid-session on purpose.
- `SessionIntro`'s middle line said "Same facts as last time", which a freshly seated table usually makes false. Now "Here's what I'm putting on the table." The intro's fuller reorganisation is Phase 14's.
- `QuestionCard` gained a `data-testid="question-card"` so tests can tell "the question moved on" from "the question is still here".
- A `?focus=` narrow enough to exclude a freshly dealt card drops the "New!" highlight rather than pointing at a card that isn't on the table.

## Verification

`vp check` clean, `vp test` green (19 files, 189 tests — 22 new), `pnpm build` (vue-tsc + Vite + PWA) clean.

Real-browser pass with Playwright against `vp preview` at 390×844 and 1280×800, seeding localStorage to reach states that would take an hour to play to:

- 20 active families → intro seats 6, no horizontal overflow at either width.
- Two misses on one question → "Still my card: 11 − 5 is 6", correct answer flagged, cheat buttons disabled, and the question advances unaided after the reveal.
- Whole session at 20 active families: 13 questions including the missed one; summary reached.
- Clean session at 20 families all one step short of won → 12 questions, and Advance deals a 21st card with the "New!" badge on it at the new table. The old rule would never have dealt it.
- No page or console errors.

One screenshot caveat for whoever verifies next: `page.screenshot()` right after a state assertion catches daisyUI's button colour transitions mid-flight and can show a stale-looking frame. A ~300ms wait before the shot is the difference between a confusing screenshot and an accurate one; the DOM assertions were right both times.
