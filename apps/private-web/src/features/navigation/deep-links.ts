import { safePath, type ContextSelectorData } from "../context/model";

/**
 * Deep links (F6-11, AppFlow §6.2). A private link carries the account (`cuenta`) and, when it
 * matters, the branch (`sucursal`) it belongs to, so whoever opens it lands in the right context.
 * Anything else in the URL (filters, page, record) is the page's own.
 */
export const ACCOUNT_PARAM = "cuenta";
export const BRANCH_PARAM = "sucursal";

/** Request header with the page's own path and query, set by `proxy.ts` for the account layout. */
export const REQUESTED_PATH_HEADER = "x-ice24-requested-path";

/** Login with the page to come back to; `expired` shows «La sesión terminó» and clears the queue. */
export function loginLocation(path: string | null, error: "expired" | "access" | null): string {
  const query = new URLSearchParams();
  if (error) query.set("error", error);
  const next = safePath(path);
  if (next !== null && next !== "/") query.set("next", next);
  const search = query.toString();
  return search ? `/?${search}` : "/";
}

/** Context selection after signing in, still carrying the deep link. */
export const contextLocation = (next: string | null): string =>
  next ? `/access/context?next=${encodeURIComponent(next)}` : "/access/context";

/** Where to go after signing in: the requested page, or the context selector's default. */
export const nextPath = (value: unknown): string | null => {
  const path = safePath(value);
  // The access pages are steps of the sign-in itself; coming back to them would loop.
  return path === null || path === "/" || path.startsWith("/access/") ? null : path;
};

export interface LinkContext {
  readonly accountId: string | null;
  readonly branchId: string | null;
}

/** Account and branch a link asks for; null when the link does not say. */
export function linkContext(path: string | null): LinkContext {
  const query = new URL(safePath(path) ?? "/", "http://ice24.invalid").searchParams;
  return { accountId: query.get(ACCOUNT_PARAM), branchId: query.get(BRANCH_PARAM) };
}

/** Link to share: the current page plus the account (and branch) it belongs to. */
export function shareableLink(
  href: string,
  accountId: string | null,
  branchId: string | null,
): string {
  const url = new URL(href);
  url.searchParams.delete(FROM_PARAM); // The sender's origin means nothing to whoever opens it.
  if (accountId) url.searchParams.set(ACCOUNT_PARAM, accountId);
  if (branchId) url.searchParams.set(BRANCH_PARAM, branchId);
  else url.searchParams.delete(BRANCH_PARAM);
  return url.toString();
}

/**
 * Origin of a detail or wizard to come back to (`desde`): the list with its filters and page, as
 * it was. Only internal paths count; otherwise the screen's own default.
 */
export const FROM_PARAM = "desde";

export const backHref = (from: unknown, fallback: string): string => nextPath(from) ?? fallback;

/** `href` with the current page as its origin, for «Regresar» on the next screen. */
export function withOrigin(href: string, origin: string): string {
  const url = new URL(href, "http://ice24.invalid");
  url.searchParams.set(FROM_PARAM, origin);
  return url.pathname + url.search;
}

/** What the account layout does with a link of another account or branch (AppFlow §6.2). */
export type LinkDecision =
  | { readonly kind: "switch-account"; readonly accountId: string; readonly accountName: string }
  | { readonly kind: "switch-branch"; readonly branchId: string; readonly branchName: string }
  /** Not within the viewer's reach, or does not exist: the same answer, nothing is revealed. */
  | { readonly kind: "denied" }
  /** The lists could not be loaded: neither switch nor deny. */
  | { readonly kind: "unavailable" };

export function decideLink(link: LinkContext, selector: ContextSelectorData): LinkDecision | null {
  if (link.accountId !== null && link.accountId !== selector.current?.accountId) {
    if (selector.current === null || selector.accounts === null) return { kind: "unavailable" };
    const account = selector.accounts.find((item) => item.accountId === link.accountId);
    return account
      ? { kind: "switch-account", accountId: account.accountId, accountName: account.accountName }
      : { kind: "denied" };
  }
  if (link.branchId !== null && link.branchId !== selector.branch?.id) {
    if (selector.options === null) return { kind: "unavailable" };
    if (selector.options === "forbidden") return { kind: "denied" };
    const branch = selector.options.branches.find((item) => item.id === link.branchId);
    return branch
      ? { kind: "switch-branch", branchId: branch.id, branchName: branch.name }
      : { kind: "denied" };
  }
  return null;
}
