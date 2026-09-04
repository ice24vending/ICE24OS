import {
  associationTransitionRequestSchema,
  createAccountWithOwnerRequestSchema,
  createMembershipRequestSchema,
  createRecoveryCaseRequestSchema,
  recoveryDecisionRequestSchema,
  type Membership,
  type RecoveryCase,
} from "@ice24/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import {
  AuthorizationGuard,
  RequirePermission,
} from "../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { IdentityStore } from "./identity.store.js";
import { SupabaseAdminClient } from "./supabase-admin.client.js";

const actorId = (request: SecurityRequest): string => {
  if (request.localUser === undefined) throw new Error("Authentication guard invariant failed");
  return request.localUser.id;
};

const actorAccountId = (request: SecurityRequest): string => {
  const accountId = request.authorizationSubject?.membershipAccountId;
  if (accountId === undefined) throw new Error("Authorization guard invariant failed");
  return accountId;
};

@ApiTags("identity-admin")
@ApiBearerAuth()
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller()
export class AdminIdentityController {
  public constructor(
    @Inject(IdentityStore) private readonly identityStore: IdentityStore,
    @Inject(SupabaseAdminClient) private readonly supabaseAdmin: SupabaseAdminClient,
  ) {}

  @Post("admin/accounts")
  @RequirePermission({
    permission: "accounts.create",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  @ApiOperation({ summary: "Create an account and privately invite its primary owner" })
  public async createAccount(
    @Req() request: SecurityRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const input = createAccountWithOwnerRequestSchema.parse(body);
    if (idempotencyKey === undefined || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const created = await this.identityStore.createAccountWithOwner({
      actorUserId: actorId(request),
      accountName: input.accountName,
      accountType: input.accountType,
      ownerEmail: input.owner.email,
      ownerUsername: input.owner.username,
      ownerDisplayName: input.owner.displayName,
      idempotencyKey,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
    await this.supabaseAdmin.inviteUser(input.owner.email);
    return created;
  }

  @Post("user-associations")
  @RequirePermission({
    permission: "identity.membership-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  @ApiOperation({ summary: "Associate an existing global identity with roles and scopes" })
  public createMembership(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<Membership> {
    const input = createMembershipRequestSchema.parse(body);
    if (input.accountId !== actorAccountId(request))
      throw new NotFoundException("Account not found");
    return this.identityStore.createMembership({
      actorUserId: actorId(request),
      accountId: input.accountId,
      userId: input.userId,
      roleCodes: input.roleCodes,
      branchIds: input.branchIds,
      machineIds: input.machineIds,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }

  @Post("user-associations/:associationId/suspend")
  @RequirePermission({
    permission: "identity.membership-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  public suspendMembership(
    @Req() request: SecurityRequest,
    @Param("associationId") associationId: string,
    @Body() body: unknown,
  ): Promise<Membership> {
    return this.transitionMembership(request, associationId, body, "SUSPENDED");
  }

  @Post("user-associations/:associationId/reactivate")
  @RequirePermission({
    permission: "identity.membership-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  public reactivateMembership(
    @Req() request: SecurityRequest,
    @Param("associationId") associationId: string,
    @Body() body: unknown,
  ): Promise<Membership> {
    return this.transitionMembership(request, associationId, body, "ACTIVE");
  }

  @Post("user-associations/:associationId/end")
  @RequirePermission({
    permission: "identity.membership-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  public endMembership(
    @Req() request: SecurityRequest,
    @Param("associationId") associationId: string,
    @Body() body: unknown,
  ): Promise<Membership> {
    return this.transitionMembership(request, associationId, body, "ENDED");
  }

  @Post("identity-recovery-cases")
  @RequirePermission({
    permission: "identity.recovery-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  @ApiOperation({ summary: "Open a restricted manual identity-recovery case" })
  public createRecoveryCase(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<RecoveryCase> {
    const input = createRecoveryCaseRequestSchema.parse(body);
    return this.identityStore.createRecoveryCase({
      actorUserId: actorId(request),
      userId: input.userId,
      requestedChannel: input.requestedChannel,
      reason: input.reason,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }

  @Post("identity-recovery-cases/:caseId/approvals")
  @RequirePermission({
    permission: "identity.recovery-manage",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  @ApiOperation({ summary: "Record one of two independent recovery approvals" })
  public approveRecoveryCase(
    @Req() request: SecurityRequest,
    @Param("caseId") caseId: string,
    @Body() body: unknown,
  ): Promise<RecoveryCase> {
    const input = recoveryDecisionRequestSchema.parse(body);
    return this.identityStore.approveRecoveryCase({
      caseId,
      operatorUserId: actorId(request),
      verificationMethod: input.verificationMethod,
      evidenceReferences: input.evidenceReferences,
      reason: input.reason,
      expectedVersion: input.expectedVersion,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }

  private transitionMembership(
    request: SecurityRequest,
    membershipId: string,
    body: unknown,
    targetStatus: "ACTIVE" | "SUSPENDED" | "ENDED",
  ): Promise<Membership> {
    const input = associationTransitionRequestSchema.parse(body);
    return this.identityStore.transitionMembership({
      actorUserId: actorId(request),
      actorAccountId: actorAccountId(request),
      membershipId,
      targetStatus,
      expectedVersion: input.expectedVersion,
      reason: input.reason,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }
}
