import { authorize } from "@ice24/authorization";
import { integrationLogQuerySchema } from "@ice24/contracts";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { IntegrationLogsPort, type IntegrationLogScope } from "./integration-logs.port.js";

export const INTEGRATION_LOGS_PERMISSION = "integration-logs.read";

/**
 * RF-ADM-009 diagnosis. Re-checks the guard decision (permission, RESTRICTED, MFA) and derives
 * the data scope: an account-wide ICE24 subject reads every account; any other subject only the
 * account of its active context. Filters narrow the scope and never widen it.
 */
@Injectable()
export class IntegrationLogsService {
  constructor(@Inject(IntegrationLogsPort) private readonly logs: IntegrationLogsPort) {}

  private scope(request: SecurityRequest): IntegrationLogScope {
    const subject = request.authorizationSubject;
    if (
      !subject ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: INTEGRATION_LOGS_PERMISSION,
        classification: "RESTRICTED",
        operation: "READ",
        requiresMfa: true,
      }).allowed
    )
      throw new ForbiddenException("Integration log permission required");
    return { accountId: subject.accountWide ? null : subject.membershipAccountId };
  }

  list(request: SecurityRequest, input: unknown) {
    const scope = this.scope(request);
    return this.logs.list(scope, integrationLogQuerySchema.parse(input));
  }
}
