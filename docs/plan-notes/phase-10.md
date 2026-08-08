# Phase 10 — About/Credits page

Full detail behind the one-line summary in PLAN.md.

## A route, not a modal

The app already had one modal (help), and Phase 9's rule of "one Ziggy per moment, each doing a distinct job" applies to modals too: the help dialog explains the game while you're playing it, and a credits page is something you go and read. A second dialog competing for the same header space would have muddied both. `/about` is a real route with a real title, so it's linkable, bookmarkable, and shareable — which matters for a page whose whole job is pointing at other people's work.

Deep-linking it needed nothing new: `not_found_handling: "single-page-application"` from Phase 5 already covers arbitrary paths, confirmed by a hard reload on `/about` against `pnpm preview`.

`NavBreadcrumbs` grew an optional `label` prop. It previously derived its trailing crumb solely from `GROUP_LABELS[group]`, which assumed every non-home page is a play session; About is the first page that isn't.

## The footer was a placeholder for three years

`SiteFooter.vue` was `<footer class="bg-red-100">I am the footer</footer>`, unimported by anything since the initial commit. Repurposed rather than deleted — the About page needs a way to be found from every screen, and a footer is exactly that affordance. It's mounted in `App.vue` below `<RouterView>`, so it's the one piece of chrome besides the header that every route gets.

`HomePage.vue`'s section picked up an `mb-8`; with a footer now underneath it, the last card sat almost flush against it.

## What's credited, and why the list is longer than planned

PLAN.md listed Vue, Tailwind, daisyUI, Fredoka, Feather, Howler, canvas-confetti and Vite+. The shipped list adds Pinia, Vue Router and Unhead — they're runtime dependencies doing visible work, and a credits page that omits real dependencies is worse than one that's slightly longer than the outline. Dev-only tooling that never reaches the browser stays off the page, with Vite+ the deliberate exception since it builds, tests and checks the whole thing.

Licenses were read off the installed packages rather than recalled: all MIT except canvas-confetti (ISC) and Fredoka (OFL-1.1). There's a test asserting every entry has both an `https://` link and a license badge, so adding a credit without either fails.

## Licenses of the generated assets — the Phase 9 open item, answered

Phase 9 left open whether ElevenLabs' free-tier non-commercial license matters for a public-but-non-monetized site. The answer taken here is disclosure rather than avoidance: the page names ChatGPT's image model (the original character sheet), Google's Gemini image model (every in-app Ziggy, generated from that reference), and ElevenLabs (all eight sounds). Nothing about the app is commercial — no ads, no payments, no data collection — so the non-commercial restriction isn't currently being tripped. If that ever changes, the sounds are the thing to regenerate, and now the page says so plainly enough that it's hard to forget.

## Naming a child on a public page

The help modal read "Made with ❤ for L.J. from Uncle Barn". Initials on a public page are still identifying detail attached to a kid, and About would have made a second copy of it, so both places now say "my niece" with no name at all. The About copy credits her as first player and play-tester without inventing specific anecdotes about her.

## Verification

`pnpm check`, `pnpm test` (159 tests), and `pnpm build` all pass. Real-browser pass with Playwright against `pnpm preview` at 900px and 390px: home (footer present, doesn't crowd the last card), `/about` reached by footer link and by hard-reloaded deep link, breadcrumb back to home, browser back button, and `/play/add` (footer present, pinned below a short intro screen rather than floating mid-page). No console errors. Page titles verified to be restored on navigating away — an initial "the title is still 'About'" reading turned out to be the check racing ahead of unhead's flush, not a leak.
