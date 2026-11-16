import { useEffect, useRef } from "react";

/**
 * A form disabled while saving drops the focus to <body>. Once `busy` ends, give it back to the
 * control that started the save, unless the screen already moved it. The result is announced by
 * a live region, so focusing the message too made NVDA read it twice (SR-03).
 */
export function useRestoreFocus(busy: boolean) {
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const target = origin.current;
    if (busy || !target) return;
    origin.current = null;
    const active = document.activeElement;
    if (target.isConnected && (!active || active === document.body)) target.focus();
  }, [busy]);
  return () => {
    origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
}
