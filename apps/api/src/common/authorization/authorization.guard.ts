import { authorize, type AuthorizationRequest } from "@ice24/authorization";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { IdentityStore } from "../../modules/identity/identity.store.js";
import { getHeader, type SecurityRequest } from "../security/security-request.js";

const POLICY_KEY = "ice24:authorization-policy";

export interface EndpointPolicy extends Omit<
  AuthorizationRequest,
  "accountId" | "resourceAccountId"
> {
  readonly hideResourceExistence?: boolean;
}

export const RequirePermission = (policy: EndpointPolicy): MethodDecorator =>
  SetMetadata(POLICY_KEY, policy);

@Injectable()
export class AuthorizationGuard implements CanActivate {
  public constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(IdentityStore) private readonly identityStore: IdentityStore,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<EndpointPolicy | undefined>(POLICY_KEY, context.getHandler());
    if (policy === undefined) throw new ForbiddenException("Permission denied by default");
    const request = context.switchToHttp().getRequest<SecurityRequest>();
    const user = request.localUser;
    const claims = request.identityClaims;
    const contextId = getHeader(request, "x-ice24-context-id");
    if (user === undefined || claims === undefined || contextId === undefined) {
      throw new ForbiddenException("An active context is required");
    }
    const subject = await this.identityStore.getAuthorizationSubject(
      user.id,
      contextId,
      claims.aal,
    );
    const resourceAccountId = getHeader(request, "x-ice24-resource-account-id");
    const decision = authorize(subject, {
      accountId: subject.membershipAccountId,
      permission: policy.permission,
      classification: policy.classification,
      operation: policy.operation,
      ...(policy.branchId === undefined ? {} : { branchId: policy.branchId }),
      ...(policy.machineId === undefined ? {} : { machineId: policy.machineId }),
      ...(policy.requiresMfa === undefined ? {} : { requiresMfa: policy.requiresMfa }),
      ...(resourceAccountId === undefined ? {} : { resourceAccountId }),
    });
    if (!decision.allowed) {
      if (
        policy.hideResourceExistence === true &&
        decision.reason === "resource_account_mismatch"
      ) {
        throw new NotFoundException("Resource not found");
      }
      throw new ForbiddenException("Permission denied");
    }
    request.authorizationSubject = subject;
    return true;
  }
}

export type ProtectedResourceResolution = 200 | 401 | 403 | 404;

export const resolveProtectedResource = (input: {
  readonly authenticated: boolean;
  readonly contextActive: boolean;
  readonly resourceExistsInContext: boolean;
  readonly allowed: boolean;
}): ProtectedResourceResolution => {
  if (!input.authenticated) return 401;
  if (!input.contextActive) return 403;
  if (!input.resourceExistsInContext) return 404;
  return input.allowed ? 200 : 403;
};
