import { randomUUID } from "node:crypto";
import { cache } from "react";

import {
  accessContextSchema,
  contextCapabilitiesSchema,
  subscriptionViewSchema,
  userProfileSchema,
  type ContextCapabilities,
  type SubscriptionView,
} from "@ice24/contracts";
import {
  isBillingOwner,
  readOnlyNotice,
  type AccessMode,
  type ReadOnlyNotice,
} from "../../features/account-shell/access";
import {
  DESTINATIONS,
  authorizedDestinations,
  isAuthorized,
  type DestinationKey,
  type NavDestination,
} from "../../features/navigation/destinations";
import { readBrowserSession, type BrowserSession } from "../session/session";
import { callPrivateApi } from "../session/supabase-auth";

export interface AccountShell {
  readonly accountName: string | null;
  readonly userName: string | null;
  /** Effective mode from `subscriptions.effective_access`; null if the context is unavailable. */
  readonly mode: AccessMode | null;
  readonly notice: ReadOnlyNotice;
  readonly billingOwner: boolean;
  /** Null when the API could not say what the context may do: nothing is shown nor denied. */
  readonly capabilities: ContextCapabilities | null;
  /** Authorized destinations only (F6-07); empty when `capabilities` is null. */
  readonly destinations: NavDestination[];
}

type ApiSession = Pick<BrowserSession, "accessToken" | "contextId">;

const get = (session: ApiSession, path: string) =>
  callPrivateApi(path, session, { signal: AbortSignal.timeout(5000) }).catch(() => null);

const parse = async <T>(
  response: Response | null,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
): Promise<T | null> => {
  if (!response?.ok) return null;
  const parsed = schema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
};

/**
 * Data of the account shell, read once per request (layout and page share it): the active
 * context (effective access mode, roles), the capabilities that decide the navigation, the
 * viewer's name and — only when the account is read-only — the subscription state that explains
 * why. Failures never block the page: each service still enforces and explains its permissions.
 */
export const loadAccountShell = (session: BrowserSession) =>
  loadShell(session.accessToken, session.contextId);

// Keyed by primitives: layout and page read their own session object for the same request.
const loadShell = cache(async (accessToken: string, contextId?: string): Promise<AccountShell> => {
  const session: ApiSession = { accessToken, contextId };
  const [current, capabilities, profile] = await Promise.all([
    get(session, "session-contexts/current").then((r) => parse(r, accessContextSchema)),
    get(session, "session-contexts/current/capabilities").then((r) =>
      parse(r, contextCapabilitiesSchema),
    ),
    get(session, "me").then((r) => parse(r, userProfileSchema)),
  ]);
  const billingOwner = current ? isBillingOwner(current) : false;
  let subscription: SubscriptionView | null = null;
  if (current?.accessMode === "READ_ONLY")
    subscription = await parse(await get(session, "subscription"), subscriptionViewSchema);
  return {
    accountName: current?.accountName ?? null,
    userName: profile?.displayName ?? null,
    mode: current?.accessMode ?? null,
    notice: readOnlyNotice(subscription, billingOwner),
    billingOwner,
    capabilities,
    destinations: capabilities ? authorizedDestinations(capabilities) : [],
  };
});

export interface DeniedDestination {
  readonly label: string;
  readonly correlationId: string;
}

/**
 * Check of a page opened by URL (F6-07): when the active context lacks the destination's
 * permission, the API audits the denial (actor, context, correlation, result) and the page shows
 * its "sin permiso" state instead of calling the service. Null means the page may render.
 */
export async function guardDestination(key: DestinationKey): Promise<DeniedDestination | null> {
  const session = await readBrowserSession();
  if (!session?.contextId) return null; // The layout redirects first.
  const { capabilities } = await loadAccountShell(session);
  const destination = DESTINATIONS.find((candidate) => candidate.key === key)!;
  if (!capabilities || isAuthorized(destination, capabilities)) return null;
  const correlationId = randomUUID();
  await callPrivateApi("session-contexts/current/navigation-denials", session, {
    method: "POST",
    headers: { "content-type": "application/json", "x-correlation-id": correlationId },
    body: JSON.stringify({
      destination: destination.key,
      permission: destination.permission,
      requiresMfa: "requiresMfa" in destination && destination.requiresMfa,
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null); // The page stays denied even if the audit call fails.
  return { label: destination.label, correlationId };
}
