import { authorize } from "@ice24/authorization";
import { auditQuerySchema } from "@ice24/contracts";
import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { AuditPort, type AuditScope } from "./audit.port.js";

@Injectable()
export class AuditService {
  constructor(@Inject(AuditPort) private readonly db: AuditPort) {}

  private scope(request: SecurityRequest, global: boolean): AuditScope {
    const subject = request.authorizationSubject;
    if (
      !subject ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: global ? "audit.global-read" : "audit.read",
        classification: "RESTRICTED",
        operation: "READ",
        requiresMfa: global,
      }).allowed
    )
      throw new ForbiddenException("Audit permission required");
    if (global && !subject.accountWide) throw new ForbiddenException("Global scope required");
    return {
      accountId: global ? null : subject.membershipAccountId,
      accountWide: global || subject.accountWide,
      branchIds: [...subject.branchIds],
      machineIds: [...subject.machineIds],
    };
  }

  list(request: SecurityRequest, input: unknown, global = false) {
    const scope = this.scope(request, global);
    const query = auditQuerySchema.parse(input);
    // A caller-supplied account is only a narrowing filter, never an authority.
    if (!global && query.accountId && query.accountId !== scope.accountId)
      throw new ForbiddenException("Account outside active context");
    return this.db.list(scope, query);
  }

  async detail(request: SecurityRequest, id: string) {
    const event = await this.db.detail(this.scope(request, false), id);
    if (!event) throw new NotFoundException("Audit event not found");
    return event;
  }
}
