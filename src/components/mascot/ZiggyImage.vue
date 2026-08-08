<script lang="ts" setup>
// Ziggy the Fox, as painted art (Phase 9) — replaces the hand-coded flat SVG
// mascot of Phase 7. The character now has a real illustrated identity (see
// docs/plan-notes/phase-9.md for how the assets were made), and running two
// art styles for the same character on the same screen was the single biggest
// visual inconsistency left in the app.
//
// Poses carry the app's narrative rather than being decorative: "neutral" is
// Ziggy talking, "wink" is Ziggy offering a shortcut (hint tokens), "gleeful"
// is Ziggy delighted for you (streak milestones, session clears). "mark" is
// the tight headshot used as the app's logo — it stays legible at the small
// sizes where a bust portrait turns to mush.
//
// Sources are the `web/` derivatives, not the 1024px generator output — see
// scripts/optimize-ziggy-assets.mjs.
import brandMark from "../../assets/ziggy/web/brand-mark.webp";
import speaksGleeful from "../../assets/ziggy/web/speaks-gleeful.webp";
import speaksNeutral from "../../assets/ziggy/web/speaks-neutral.webp";
import speaksWink from "../../assets/ziggy/web/speaks-wink.webp";
import { ZiggyPose } from "../../types";

const SOURCES: Record<ZiggyPose, string> = {
  neutral: speaksNeutral,
  wink: speaksWink,
  gleeful: speaksGleeful,
  mark: brandMark,
};

const props = withDefaults(
  defineProps<{
    pose?: ZiggyPose;
    // Empty label = decorative. Most placements pass nothing on purpose: the
    // copy right next to Ziggy already names him, so an alt would just make
    // screen readers say it twice.
    label?: string;
  }>(),
  { pose: "neutral", label: "" },
);
</script>
<template>
  <img
    :src="SOURCES[props.pose]"
    :alt="props.label"
    :aria-hidden="props.label ? undefined : 'true'"
    :data-pose="props.pose"
    data-testid="ziggy-image"
    class="object-contain"
  />
</template>
