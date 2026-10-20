import type { BreadcrumbItem, IconName } from "@ice24/ui";
import type { ContextCapabilities } from "@ice24/contracts";

/**
 * The only list of destinations of the private shell (F6-07). The server filters it with the
 * capabilities of the active context: a destination the viewer may not open is never rendered
 * nor sent to the browser. Each page also checks its own entry (`guardDestination`).
 */
export interface Destination {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
  /** Permission the destination's main read requires (same code the API checks). */
  readonly permission: string;
  readonly requiresMfa?: boolean;
  /** Product module that owns the destination (PRD); per-account enablement does not exist yet. */
  readonly module: string;
  /** `bottom`: one of the priority destinations of the mobile bottom bar; the rest go in «Más». */
  readonly placement: "sidebar" | "bottom";
}

export const DESTINATIONS = [
  {
    key: "workspace",
    href: "/workspace",
    label: "Cuentas y máquinas",
    icon: "machine",
    permission: "equipment.read",
    module: "equipment",
    placement: "bottom",
  },
  {
    key: "notifications",
    href: "/notifications",
    label: "Avisos",
    icon: "bell",
    permission: "notifications.read",
    module: "notifications",
    placement: "bottom",
  },
  {
    key: "files",
    href: "/files",
    label: "Archivos privados",
    icon: "document",
    permission: "files.read",
    module: "files",
    placement: "bottom",
  },
  {
    key: "subscription",
    href: "/subscription",
    label: "Suscripción",
    icon: "settings",
    permission: "subscriptions.read",
    module: "subscriptions",
    placement: "sidebar",
  },
  {
    key: "audit",
    href: "/audit",
    label: "Auditoría",
    icon: "audit",
    permission: "audit.read",
    module: "audit",
    placement: "sidebar",
  },
  {
    key: "jobs",
    href: "/jobs",
    label: "Centro de trabajos",
    icon: "activity",
    permission: "jobs.admin-read",
    requiresMfa: true,
    module: "jobs",
    placement: "sidebar",
  },
  {
    key: "profile",
    href: "/profile",
    label: "Perfil",
    icon: "user",
    permission: "identity.profile-read",
    module: "identity",
    placement: "bottom",
  },
] as const satisfies readonly Destination[];

export type DestinationKey = (typeof DESTINATIONS)[number]["key"];

/** UI_UX §10.3: at most five items in the bottom bar, «Más» included. */
export const BOTTOM_LIMIT = 4;

/** What the browser receives: only the drawing data of authorized destinations. */
export type NavDestination = Pick<Destination, "key" | "href" | "label" | "icon" | "placement">;

export const isAuthorized = (destination: Destination, capabilities: ContextCapabilities) =>
  capabilities.permissions.includes(destination.permission) &&
  (!destination.requiresMfa || capabilities.mfaVerified);

export const authorizedDestinations = (capabilities: ContextCapabilities): NavDestination[] =>
  DESTINATIONS.filter((destination) => isAuthorized(destination, capabilities)).map(
    ({ key, href, label, icon, placement }) => ({ key, href, label, icon, placement }),
  );

export const bottomDestinations = (destinations: readonly NavDestination[]) =>
  destinations.filter((destination) => destination.placement === "bottom").slice(0, BOTTOM_LIMIT);

/** Destination that owns a path: its first segment. */
export const destinationOf = <T extends Pick<Destination, "href">>(
  pathname: string,
  destinations: readonly T[],
): T | undefined =>
  destinations.find(
    (destination) => pathname === destination.href || pathname.startsWith(`${destination.href}/`),
  );

const segmentLabel = (segment: string) => {
  const text = decodeURIComponent(segment).replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Breadcrumbs of a path (UI_UX §10.4): the destination, then one item per deeper segment.
 * Top-level pages return a single item; the shell shows breadcrumbs only on deeper pages.
 */
export function breadcrumbsFor(
  pathname: string,
  destinations: readonly NavDestination[],
): BreadcrumbItem[] {
  const destination = destinationOf(pathname, destinations);
  if (!destination) return [];
  const rest = pathname.slice(destination.href.length).split("/").filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: destination.label, href: destination.href }];
  let href = destination.href;
  for (const segment of rest) {
    href = `${href}/${segment}`;
    items.push({ label: segmentLabel(segment), href });
  }
  return items;
}
