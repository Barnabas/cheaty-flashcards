import { MaybeRefOrGetter, toValue } from "vue";
import { useConfirmDialog } from "@vueuse/core";
import { onBeforeRouteLeave } from "vue-router";

// Holds an in-app navigation open while a modal asks whether it's really OK
// to walk away from work in progress. `shouldAsk` decides when the guard
// applies, so it stays out of the way the rest of the time.
//
// Only in-app (router) navigation is covered — deliberately no
// `beforeunload`, which would fire on PWA refreshes and shows a browser
// dialog we can't word. Note the guard only registers when the component is
// rendered by a `RouterView`, which matters for tests.
export function useLeaveConfirm(shouldAsk: MaybeRefOrGetter<boolean>) {
  const dialog = useConfirmDialog();

  onBeforeRouteLeave(async () => {
    if (!toValue(shouldAsk)) return true;
    // A second navigation attempt supersedes the first, which vue-router has
    // already cancelled — release the open dialog so its promise can't dangle.
    if (dialog.isRevealed.value) dialog.cancel();
    const { isCanceled } = await dialog.reveal();
    return !isCanceled;
  });

  return dialog;
}
