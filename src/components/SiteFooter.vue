<script lang="ts" setup>
import IconExternalLink from "~icons/feather/external-link";
</script>
<template>
  <footer class="footer footer-center bg-base-200 text-base-content/70 p-4 text-sm mt-auto">
    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      <RouterLink class="link link-hover" to="/about">About &amp; credits</RouterLink>
      <a
        class="link link-hover inline-flex items-center gap-1"
        href="https://barnabas.me"
        target="_blank"
        rel="noopener noreferrer"
      >
        barnabas.me
        <IconExternalLink class="size-3" />
      </a>
      <span>Your progress stays on this device.</span>
    </div>
  </footer>
</template>
