import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  UnauthorizedException,
  UseFilters,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { TOKEN_VERIFIER } from "../../common/security/authentication.guard.js";
import type { TokenVerifier } from "../../common/security/oidc-token-verifier.js";
import { getHeader, type SecurityRequest } from "../../common/security/security-request.js";
import { IdentityStore } from "../identity/identity.store.js";
import { OfflineOrders } from "../work-orders/application/offline-orders.js";
import { MaintenanceErrorFilter } from "../maintenance/scheduling/scheduling-error.filter.js";
/** A disabled user with a still-valid signed identity may report their own cleanup only. No order data is returned. */
@Controller("synchronization")
@UseFilters(MaintenanceErrorFilter)
export class OfflinePurgeController {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(IdentityStore) private readonly identity: IdentityStore,
    @Inject(OfflineOrders) private readonly orders: OfflineOrders,
  ) {}
  @Post("purge-receipts")
  async report(@Req() request: SecurityRequest, @Body() body: unknown) {
    const bearer = getHeader(request, "authorization");
    if (!bearer?.startsWith("Bearer ")) throw new UnauthorizedException();
    let claims;
    try {
      claims = await this.verifier.verify(bearer.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    const user = await this.identity.synchronizeIdentity(claims);
    return this.orders.reportPurge(user.id, body, request.correlationId ?? randomUUID());
  }
}
