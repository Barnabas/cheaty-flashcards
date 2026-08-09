<script lang="ts" setup>
import { useHead } from "@unhead/vue";
import IconExternalLink from "~icons/feather/external-link";
import NavBreadcrumbs from "../components/NavBreadcrumbs.vue";
import ZiggySpeaks from "../components/mascot/ZiggySpeaks.vue";

useHead({ title: "About" });

// Ziggy's job on this page is provenance — where he came from and who else
// had a hand in the app. One appearance, one job (Phase 9).
const introLines = [
  "This whole place got built for one kid learning her math facts.",
  "I'm the part that makes it interesting. Here's everyone else who helped.",
];

type Credit = { name: string; url: string; role: string; license: string };

// Everything the shipped app is actually built out of. Dev-only tooling that
// never reaches the browser is deliberately left out, except Vite+ — it's what
// builds, tests and checks the whole thing, which is worth naming.
const credits: Credit[] = [
  { name: "Vue", url: "https://vuejs.org", role: "the app framework", license: "MIT" },
  {
    name: "Vite+",
    url: "https://viteplus.dev",
    role: "build, test and lint toolchain",
    license: "MIT",
  },
  {
    name: "Pinia",
    url: "https://pinia.vuejs.org",
    role: "state and saved progress",
    license: "MIT",
  },
  { name: "Vue Router", url: "https://router.vuejs.org", role: "page routing", license: "MIT" },
  { name: "Unhead", url: "https://unhead.unjs.io", role: "page titles", license: "MIT" },
  {
    name: "VueUse",
    url: "https://vueuse.org",
    role: "timers, dialogs and other reactive plumbing",
    license: "MIT",
  },
  { name: "Tailwind CSS", url: "https://tailwindcss.com", role: "styling", license: "MIT" },
  { name: "daisyUI", url: "https://daisyui.com", role: "the component look", license: "MIT" },
  {
    name: "Fredoka",
    url: "https://fontsource.org/fonts/fredoka",
    role: "the rounded display font, via Fontsource",
    license: "OFL-1.1",
  },
  {
    name: "Feather icons",
    url: "https://feathericons.com",
    role: "every icon on every screen",
    license: "MIT",
  },
  { name: "Howler.js", url: "https://howlerjs.com", role: "sound playback", license: "MIT" },
  {
    name: "canvas-confetti",
    url: "https://www.kirilv.com/canvas-confetti/",
    role: "celebrations",
    license: "ISC",
  },
];
</script>
<template>
  <NavBreadcrumbs label="About" />
  <section class="container mt-4 mb-8 flex flex-col gap-6">
    <ZiggySpeaks pose="wink" :lines="introLines" />

    <div class="card bg-base-100 shadow-md p-4 flex flex-col gap-2">
      <h2 class="font-display text-xl font-bold">What this is</h2>
      <p>
        Cheaty Flashcards is a math practice game with a catch: you can always ask Ziggy for help,
        and it always costs you something. Each session is built from the facts you're actually
        struggling with rather than a fixed list.
      </p>
      <p>
        Everything stays on this device. There are no accounts, no servers and no tracking — your
        progress lives in this browser, and the Export button on the home page is the only way it
        goes anywhere else.
      </p>
    </div>

    <div class="card bg-base-100 shadow-md p-4 flex flex-col gap-2">
      <h2 class="font-display text-xl font-bold">Who made it</h2>
      <p>
        Built by Barnabas Kendall, with and for my niece — she's the first player, the chief
        play-tester, and the reason any of this exists.
      </p>
      <p>
        <a
          class="link link-primary inline-flex items-center gap-1"
          href="https://barnabas.me"
          target="_blank"
          rel="noopener noreferrer"
        >
          barnabas.me
          <IconExternalLink class="w-4 h-4" />
        </a>
      </p>
    </div>

    <div class="card bg-base-100 shadow-md p-4 flex flex-col gap-2">
      <h2 class="font-display text-xl font-bold">Ziggy, and the noises he makes</h2>
      <p>
        Ziggy the Fox began as a character sheet — expressions, poses, palette — generated with
        ChatGPT's image model. Every picture of him in the app was then generated from that
        reference with Google's Gemini image model, scripted rather than hand-prompted one at a time
        so the same fox shows up in every pose. His voice is hand-written.
      </p>
      <p>The eight sound effects were generated with ElevenLabs.</p>
    </div>

    <div class="card bg-base-100 shadow-md p-4 flex flex-col gap-3">
      <h2 class="font-display text-xl font-bold">Built with</h2>
      <p class="text-sm">Free, open-source work by other people. Thank you, all of you.</p>
      <ul class="flex flex-col gap-2" data-testid="credits-list">
        <li
          v-for="credit in credits"
          :key="credit.name"
          class="flex flex-wrap items-baseline gap-2"
        >
          <a
            class="link link-primary font-bold"
            :href="credit.url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ credit.name }}</a
          >
          <span class="text-sm flex-1">{{ credit.role }}</span>
          <span class="badge badge-ghost badge-sm">{{ credit.license }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
