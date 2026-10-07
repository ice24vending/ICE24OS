import {
  accessContextSchema,
  subscriptionViewSchema,
  type SubscriptionView,
} from "@ice24/contracts";
import {
  isBillingOwner,
  readOnlyNotice,
  type AccessMode,
  type ReadOnlyNotice,
} from "../../features/account-shell/access";
import type { BrowserSession } from "../session/session";
import { callPrivateApi } from "../session/supabase-auth";

export interface AccountShell {
  readonly accountName: string | null;
  /** Effective mode from `subscriptions.effective_access`; null if the context is unavailable. */
  readonly mode: AccessMode | null;
  readonly notice: ReadOnlyNotice;
  readonly billingOwner: boolean;
  readonly canAudit: boolean;
  readonly canJobs: boolean;
}

const get = (session: BrowserSession, path: string) =>
  callPrivateApi(path, session, { signal: AbortSignal.timeout(5000) }).catch(() => null);

/**
 * Data of the account shell, read once per page: the active context (effective access mode,
 * roles), whether the audit and job-center links apply, and — only when the account is
 * read-only — the subscription state that explains why. Failures never block the page: each
 * service still enforces and explains its own permissions.
 */
export async function loadAccountShell(session: BrowserSession): Promise<AccountShell> {
  const [context, audit, jobs] = await Promise.all([
    get(session, "session-contexts/current"),
    get(session, "audit-events?limit=1"),
    get(session, "admin/jobs?limit=1"),
  ]);
  const parsed = context?.ok
    ? accessContextSchema.safeParse(await context.json().catch(() => null))
    : null;
  const current = parsed?.success ? parsed.data : null;
  const billingOwner = current ? isBillingOwner(current) : false;
  let subscription: SubscriptionView | null = null;
  if (current?.accessMode === "READ_ONLY") {
    const response = await get(session, "subscription");
    const view = response?.ok
      ? subscriptionViewSchema.safeParse(await response.json().catch(() => null))
      : null;
    subscription = view?.success ? view.data : null;
  }
  return {
    accountName: current?.accountName ?? null,
    mode: current?.accessMode ?? null,
    notice: readOnlyNotice(subscription, billingOwner),
    billingOwner,
    canAudit: audit?.ok ?? false,
    canJobs: jobs?.ok ?? false,
  };
}
