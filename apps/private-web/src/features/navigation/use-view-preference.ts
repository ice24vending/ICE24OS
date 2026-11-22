"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ListView = "lista" | "bloques";
export const viewPreferenceKey = (screen: string) => `ice24.view.${screen}`;
const changed = "ice24:view-preference";
const parseView = (value: string | null): ListView => (value === "bloques" ? "bloques" : "lista");

function readPreference(screen: string): ListView {
  try {
    return parseView(localStorage.getItem(viewPreferenceKey(screen)));
  } catch {
    return "lista";
  }
}

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(changed, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(changed, listener);
  };
}

/** URL wins over storage; hydration and restoring a preference never produce announcements. */
export function useViewPreference(screen: string, enabled = true) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const stored = useSyncExternalStore(
    subscribe,
    () => readPreference(screen),
    () => "lista" as const,
  );
  const explicit = params.get("vista");
  const query = params.toString();
  const location = `${pathname}?${query}`;
  const [pending, setPending] = useState<{ location: string; value: ListView } | null>(null);
  // Give native radios immediate controlled feedback while Next commits the URL. Clear the
  // transient choice as soon as navigation commits, including history and another screen.
  if (pending && pending.location !== location) setPending(null);
  const view =
    pending?.location === location
      ? pending.value
      : explicit === null
        ? stored
        : parseView(explicit);

  // Materialize a saved view into the shareable URL without filling browser history.
  useEffect(() => {
    if (!enabled || explicit !== null || stored === "lista" || pending !== null) return;
    const next = new URLSearchParams(query);
    next.set("vista", stored);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [enabled, explicit, pathname, query, router, stored, pending]);

  const changeView = (value: ListView) => {
    if (!enabled || value === view) return;
    setPending({ location, value });
    const next = new URLSearchParams(query);
    // Explicit lista also wins over a previously stored bloques when the URL is shared.
    next.set("vista", value);
    try {
      localStorage.setItem(viewPreferenceKey(screen), value);
    } catch {
      // The URL remains the source of truth when storage is unavailable.
    }
    window.dispatchEvent(new Event(changed));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return { view, changeView };
}
