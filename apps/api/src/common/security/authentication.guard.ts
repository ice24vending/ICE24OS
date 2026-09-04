import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";

import { IdentityStore } from "../../modules/identity/identity.store.js";
import { getHeader, type SecurityRequest } from "./security-request.js";
import type { TokenVerifier } from "./oidc-token-verifier.js";

export const TOKEN_VERIFIER = Symbol("TOKEN_VERIFIER");

@Injectable()
export class AuthenticationGuard implements CanActivate {
  public constructor(
    @Inject(TOKEN_VERIFIER) private readonly tokenVerifier: TokenVerifier,
    @Inject(IdentityStore) private readonly identityStore: IdentityStore,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const authorization = getHeader(request, "authorization");
    if (authorization?.startsWith("Bearer ") !== true) {
      throw new UnauthorizedException("Authentication required");
    }
    let claims: Awaited<ReturnType<TokenVerifier["verify"]>>;
    try {
      claims = await this.tokenVerifier.verify(authorization.slice(7));
    } catch {
      throw new UnauthorizedException("Authentication required");
    }
    const profile = await this.identityStore.synchronizeIdentity(claims);
    if (profile.status !== "ACTIVE") throw new UnauthorizedException("Authentication required");
    request.identityClaims = claims;
    request.localUser = profile;
    return true;
  }
}
