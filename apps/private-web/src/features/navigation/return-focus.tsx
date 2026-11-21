"use client";

import Link from "next/link";
import { buttonClassName, Icon } from "@ice24/ui";

import { nextPath } from "./deep-links";

/** Only the explicit return link requests focus restoration; filters keep their own query. */
export const RETURN_FOCUS_PARAM = "volverA";
export const rowLinkId = (id: string) => `fila-${id}`;

export function withReturnFocus(href: string, linkId: string): string {
  const path = nextPath(href);
  if (!path) return "/plantillas/lista?ejemplo=base";
  const url = new URL(path, "https://ice24.invalid");
  url.searchParams.set(RETURN_FOCUS_PARAM, linkId);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * The shell alone calls this after the destination has rendered. Consume the marker before
 * focusing so Strict Mode, refreshes and the next ordinary navigation cannot repeat it.
 * Only a real row link inside the destination main is eligible, never an arbitrary selector.
 * At the readiness deadline, fallbackToMain consumes the intent and focuses only the container.
 */
export function resolveReturnFocus(main: HTMLElement, fallbackToMain = false): boolean {
  const url = new URL(window.location.href);
  const linkId = url.searchParams.get(RETURN_FOCUS_PARAM);
  if (!linkId) return false;
  url.searchParams.delete(RETURN_FOCUS_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  const candidate = document.getElementById(linkId);
  const link =
    candidate instanceof HTMLAnchorElement &&
    candidate.hasAttribute("data-row-link") &&
    main.contains(candidate)
      ? candidate
      : null;
  const target = fallbackToMain
    ? main
    : (link ?? main.querySelector<HTMLHeadingElement>("h1") ?? main);
  if (target !== link) target.tabIndex = -1;
  target.focus();
  return true;
}

export function ReturnLink({
  href,
  linkId,
  listName,
}: {
  readonly href: string;
  readonly linkId: string;
  readonly listName: string;
}) {
  return (
    <Link
      href={withReturnFocus(href, linkId)}
      scroll={false}
      prefetch={false}
      className={`${buttonClassName({ variant: "tertiary", size: "sm" })} ids-page-header__back`}
    >
      <Icon name="chevron-left" className="ids-button__icon" />
      Volver a {listName}
    </Link>
  );
}
