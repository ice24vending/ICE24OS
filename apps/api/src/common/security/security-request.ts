import type { AuthorizationSubject } from "@ice24/authorization";
import type { OidcIdentityClaims, UserProfile } from "@ice24/contracts";

export interface SecurityRequest {
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
