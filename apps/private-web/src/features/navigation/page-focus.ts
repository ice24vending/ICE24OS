import { resolveReturnFocus } from "./return-focus";

/** Bound navigation focus even when a page never finishes rendering its heading/readiness. */
export const PAGE_FOCUS_TIMEOUT_MS = 1000;

/** Page contract: main#main-content, optional data-page-ready="false" while hydrating. */
export function focusPageWhenReady(root: HTMLElement): () => void {
  const focus = (fallbackToMain = false) => {
    const main = root.querySelector<HTMLElement>("#main-content");
    if (!main) return false;
    if (
      !fallbackToMain &&
      (main.getAttribute("aria-busy") === "true" ||
        main.dataset.pageReady === "false" ||
        !main.querySelector("h1"))
    )
      return false;
    if (!resolveReturnFocus(main, fallbackToMain)) {
      main.tabIndex = -1;
      main.focus();
    }
    return true;
  };
  if (focus()) return () => undefined;

  const stop = () => {
    observer.disconnect();
    window.clearTimeout(timeout);
  };
  // A streamed destination may insert main, its heading or its readiness signal later.
  const observer = new MutationObserver(() => {
    if (focus()) stop();
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-busy", "data-page-ready"],
  });
  const timeout = window.setTimeout(() => {
    focus(true);
    stop();
  }, PAGE_FOCUS_TIMEOUT_MS);
  return stop;
}
