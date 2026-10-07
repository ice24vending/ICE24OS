import type { AuthorizationSubject } from "@ice24/authorization";
import type { OidcIdentityClaims, UserProfile } from "@ice24/contracts";

export interface SecurityRequest {
  readonly method?: string;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly params?: Readonly<Record<string, string | undefined>>;
  correlationId?: string;
  identityClaims?: OidcIdentityClaims;
  localUser?: UserProfile;
  authorizationSubject?: AuthorizationSubject;
}

export const getHeader = (request: SecurityRequest, name: string): string | undefined => {
  const value = request.headers[name];
  return typeof value === "string" ? value : value?.[0];
};

const IF_MATCH_VERSION = /^(?:W\/)?"?([1-9][0-9]{0,8})"?$/u;

/** Expected row version from `If-Match` (`W/"n"`, `"n"` or `n`); undefined when absent or invalid. */
export const readIfMatchVersion = (request: SecurityRequest): number | undefined => {
  const match = getHeader(request, "if-match")?.match(IF_MATCH_VERSION);
  return match?.[1] ? Number(match[1]) : undefined;
};
