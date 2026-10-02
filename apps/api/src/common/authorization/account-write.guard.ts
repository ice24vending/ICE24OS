import { randomUUID } from "node:crypto";
import {
  ForbiddenException,
  NotFoundException,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ApiError } from "@ice24/contracts";
import type { IdentityStore } from "../../modules/identity/identity.store.js";
import { getHeader, type SecurityRequest } from "../security/security-request.js";

const EXCEPTION_KEY = "ice24:read-only-exception";
const reflector = new Reflector();

// Method-only exceptions: future mutations on the same controller remain protected.
export const AllowReadOnlyOperation = (
  reason: "billing-recovery" | "identity-self-service",
): MethodDecorator => SetMetadata(EXCEPTION_KEY, reason);

export class AccountReadOnlyException extends ForbiddenException {
  constructor(correlationId?: string) {
    const body: ApiError = {
      error: {
        code: "ACCOUNT_READ_ONLY",
        message:
          "La cuenta está en modo solo lectura. Puedes consultar y descargar documentos existentes, pero no modificar registros.",
        correlationId: correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
    super(body);
  }
}

/** Invoked by AuthenticationGuard after identity verification on every private endpoint. */
export class AccountWriteGuard implements CanActivate {
  constructor(private readonly identity: Pick<IdentityStore, "getAuthorizationSubject">) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method?.toUpperCase() ?? "")) return true;
    const exception = reflector.get<string | undefined>(EXCEPTION_KEY, context.getHandler());
    // These operations concern the authenticated identity, not account business data.
    if (exception === "identity-self-service") return true;
    const contextId = getHeader(request, "x-ice24-context-id");
    if (!contextId || !request.localUser || !request.identityClaims)
      throw new ForbiddenException("An active account context is required");
    // A context owned by another identity is an access denial, not a missing resource:
    // answer 403 so the guard never reveals whether a foreign context exists.
    const subject = await this.identity
      .getAuthorizationSubject(request.localUser.id, contextId, request.identityClaims.aal)
      .catch((error: unknown) => {
        if (error instanceof NotFoundException)
          throw new ForbiddenException("Account access denied");
        throw error;
      });
    if (
      !subject.contextActive ||
      subject.membershipStatus !== "ACTIVE" ||
      subject.accountAccessMode === "SUSPENDED"
    )
      throw new ForbiddenException("Account access denied");
    if (subject.accountAccessMode === "READ_ONLY" && exception !== "billing-recovery") {
      context
        .switchToHttp()
        .getResponse<{ setHeader(name: string, value: string): void }>()
        .setHeader("Cache-Control", "no-store");
      throw new AccountReadOnlyException(request.correlationId);
    }
    // Existing permission, ownership, MFA, scope and transactional checks still run.
    return true;
  }
}
