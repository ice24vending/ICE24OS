"use client";
import { Button, Dialog } from "@ice24/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  discardUnsavedChanges,
  hasUnsavedChanges,
  subscribeUnsavedChanges,
} from "../context/unsaved-changes";
import { loginLocation } from "./deep-links";

type Leaving =
  | { readonly kind: "link"; readonly href: string }
  | { readonly kind: "back" }
  | { readonly kind: "expired" };

const here = () => `${window.location.pathname}${window.location.search}`;

/** An in-page click that the browser would turn into a same-origin navigation. */
function internalHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Same page, another anchor: nothing is left behind.
  if (url.pathname === window.location.pathname && url.search === window.location.search)
    return null;
  return url.pathname + url.search + url.hash;
}

const COPY = {
  link: {
    title: "Tienes cambios sin guardar",
    description: "Si sales de esta pantalla, los cambios que no guardaste se perderán.",
    stay: "Seguir editando",
    leave: "Descartar y salir",
  },
  back: {
    title: "Tienes cambios sin guardar",
    description: "Si regresas, los cambios que no guardaste en esta pantalla se perderán.",
    stay: "Seguir editando",
    leave: "Descartar y regresar",
  },
  expired: {
    title: "Tu sesión terminó",
    description:
      "Los cambios de esta pantalla no se guardaron. Copia lo que necesites conservar; al iniciar sesión volverás a esta misma página.",
    stay: "Quedarme en la pantalla",
    leave: "Iniciar sesión",
  },
} as const;

/**
 * Unsaved changes across the private shell (F6-11, AppFlow §6.3): with a dirty screen, an in-app
 * link, the browser's or phone's back button and the end of the session open a confirmation;
 * closing or reloading the tab gets the browser's own warning (`beforeunload`).
 */
export function UnsavedChangesGuard({ expiresAt }: { readonly expiresAt: number }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  // The extra history entry pushed while dirty, so «atrás» lands here first (see below).
  const trapped = useRef(false);

  useEffect(() => {
    const trap = () => {
      if (!hasUnsavedChanges() || trapped.current) return;
      // Same URL and state: Next sees no navigation; going back pops this entry first.
      window.history.pushState(window.history.state, "", window.location.href);
      trapped.current = true;
    };
    const unsubscribe = subscribeUnsavedChanges(trap);
    trap();

    const onClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges()) return;
      const href = internalHref(event);
      if (href === null) return;
      event.preventDefault();
      event.stopPropagation(); // Next's <Link> must not navigate either.
      setLeaving({ kind: "link", href });
    };
    const onPopState = (event: PopStateEvent) => {
      if (!trapped.current) return;
      trapped.current = false;
      if (!hasUnsavedChanges()) return; // Saved meanwhile: the extra entry just goes away.
      // Back on the real entry of this page; Next must not handle it as a navigation.
      event.stopImmediatePropagation();
      setLeaving({ kind: "back" });
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      event.returnValue = ""; // Older browsers only show the warning with a return value.
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      unsubscribe();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // The session cookie ends at `expiresAt` (no silent refresh): warn while the screen is dirty.
  useEffect(() => {
    const delay = Math.min(Math.max(0, expiresAt - Date.now()), 2_147_483_647);
    const timer = window.setTimeout(() => {
      if (hasUnsavedChanges()) setLeaving({ kind: "expired" });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const stay = () => {
    if (leaving?.kind === "back") {
      window.history.pushState(window.history.state, "", window.location.href);
      trapped.current = true;
    }
    setLeaving(null);
  };
  const leave = () => {
    const target = leaving;
    setLeaving(null);
    discardUnsavedChanges();
    if (target?.kind === "link") router.push(target.href);
    else if (target?.kind === "back") window.history.back();
    else if (target?.kind === "expired") window.location.assign(loginLocation(here(), "expired"));
  };

  const copy = leaving ? COPY[leaving.kind] : COPY.link;
  return (
    <Dialog
      open={leaving !== null}
      onClose={stay}
      role="alertdialog"
      size="sm"
      title={copy.title}
      description={copy.description}
      footer={
        <>
          <Button variant="secondary" onClick={stay}>
            {copy.stay}
          </Button>
          <Button variant={leaving?.kind === "expired" ? "primary" : "danger"} onClick={leave}>
            {copy.leave}
          </Button>
        </>
      }
    />
  );
}
