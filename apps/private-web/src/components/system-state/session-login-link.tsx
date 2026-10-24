"use client";
import { ButtonLink } from "@ice24/ui";
import { useSyncExternalStore } from "react";

import { loginLocation } from "../../features/navigation/deep-links";

const noChanges = () => () => {};
const here = () => loginLocation(`${window.location.pathname}${window.location.search}`, "expired");

/** «Iniciar sesión» of an expired session: after signing in, back to this same page (F6-11). */
export function SessionLoginLink() {
  const href = useSyncExternalStore(noChanges, here, () => "/?error=expired");
  return <ButtonLink href={href}>Iniciar sesión</ButtonLink>;
}
