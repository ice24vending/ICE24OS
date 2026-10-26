import { authorize, type AuthorizationSubject } from "@ice24/authorization";
import {
  contextFocusSchema,
  createContextRequestSchema,
  navigationDenialRequestSchema,
  updateMyProfileRequestSchema,
  type AccessContext,
  type ContextCapabilities,
  type ContextFocus,
  type ContextFocusOptions,
  type SessionSummary,
  type UserProfile,
} from "@ice24/contracts";
import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Inject,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import { AllowReadOnlyOperation } from "../../common/authorization/account-write.guard.js";
import { getHeader, type SecurityRequest } from "../../common/security/security-request.js";
import { IdentityStore } from "./identity.store.js";

const requireUser = (request: SecurityRequest): UserProfile => {
  if (request.localUser === undefined) throw new Error("Authentication guard invariant failed");
  return request.localUser;
};

/**
 * Whether a destination of the private web may be shown (F6-07). Classification and scope are
 * enforced by each endpoint the destination calls; the menu only needs the action itself.
 */
export const navigationDecision = (
  subject: AuthorizationSubject,
  permission: string,
  requiresMfa = false,
) =>
  authorize(subject, {
    accountId: subject.membershipAccountId,
    permission,
    classification: "PUBLIC",
    operation: "READ",
    requiresMfa,
  });

export const contextCapabilities = (subject: AuthorizationSubject): ContextCapabilities => ({
  permissions: [...new Set(subject.permissions.map((grant) => grant.code))].filter(
    (code) => navigationDecision(subject, code).allowed,
  ),
  mfaVerified: subject.assuranceLevel === "aal2",
  accountWide: subject.accountWide,
});

/** An inactive or foreign context is a 404, like `session-contexts/current`; a missing grant, 403. */
const requireFocusPermission = (subject: AuthorizationSubject, permission: string) => {
  const decision = navigationDecision(subject, permission);
  if (decision.allowed) return;
  if (["membership_inactive", "context_inactive", "account_mismatch"].includes(decision.reason))
    throw new NotFoundException("Active context not found");
  throw new ForbiddenException("Operation not authorized");
};

const parseVersion = (value: string | undefined): number => {
  const match = value?.match(/^(?:W\/)?"?(\d+)"?$/);
  if (match?.[1] === undefined)
    throw new Error("If-Match with the expected numeric version is required");
  return Number(match[1]);
};

@ApiTags("identity")
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller()
export class IdentityController {
  public constructor(@Inject(IdentityStore) private readonly identityStore: IdentityStore) {}

  @Get("me")
  @ApiOperation({ summary: "Return the synchronized local identity profile" })
  public getMe(@Req() request: SecurityRequest): UserProfile {
    return requireUser(request);
  }

  @Patch("me")
  @AllowReadOnlyOperation("identity-self-service")
  @ApiOperation({ summary: "Update editable fields on the current profile" })
  public updateMe(
    @Req() request: SecurityRequest,
    @Headers("if-match") expectedVersion: string | undefined,
    @Body() body: unknown,
  ): Promise<UserProfile> {
    const user = requireUser(request);
    const changes = updateMyProfileRequestSchema.parse(body);
    return this.identityStore.updateProfile(user.id, parseVersion(expectedVersion), changes);
  }

  @Get("me/contexts")
  @ApiOperation({ summary: "List active memberships available to the identity" })
  public listContexts(@Req() request: SecurityRequest): Promise<AccessContext[]> {
    return this.identityStore.listContexts(requireUser(request).id);
  }

  @Post("session-contexts")
  @AllowReadOnlyOperation("identity-self-service")
  @ApiOperation({ summary: "Activate a membership context without a new global login" })
  public activateContext(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<AccessContext> {
    const input = createContextRequestSchema.parse(body);
    const claims = request.identityClaims;
    if (claims === undefined) throw new Error("Authentication guard invariant failed");
    if (input.identitySessionId !== undefined && input.identitySessionId !== claims.session_id) {
      throw new BadRequestException("Identity session must match the authenticated token");
    }
    const identitySessionId = claims.session_id;
    const deviceSummary = getHeader(request, "user-agent")?.slice(0, 160);
    return this.identityStore.activateContext({
      userId: requireUser(request).id,
      accountId: input.accountId,
      assuranceLevel: claims.aal,
      correlationId: request.correlationId ?? crypto.randomUUID(),
      ...(identitySessionId === undefined ? {} : { identitySessionId }),
      ...(deviceSummary === undefined ? {} : { deviceSummary }),
    });
  }

  @Get("session-contexts/current")
  @ApiOperation({ summary: "Return the active, non-revoked context" })
  public getCurrentContext(@Req() request: SecurityRequest): Promise<AccessContext> {
    const contextId = getHeader(request, "x-ice24-context-id");
    if (contextId === undefined) throw new Error("x-ice24-context-id is required");
    return this.identityStore.getContext(requireUser(request).id, contextId);
  }

  @Get("session-contexts/current/capabilities")
  @ApiOperation({ summary: "Permission codes of the active context, for its navigation" })
  public async getCapabilities(@Req() request: SecurityRequest): Promise<ContextCapabilities> {
    return contextCapabilities(await this.currentSubject(request));
  }

  @Post("session-contexts/current/navigation-denials")
  // The denial concerns the identity's own access: it must be auditable in read-only accounts.
  @AllowReadOnlyOperation("identity-self-service")
  @HttpCode(204)
  @ApiOperation({ summary: "Audit a private-web destination opened without permission" })
  public async recordNavigationDenial(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<void> {
    const input = navigationDenialRequestSchema.parse(body);
    const subject = await this.currentSubject(request);
    // Re-decided here: the web cannot write a denial the API would not make.
    const decision = navigationDecision(subject, input.permission, input.requiresMfa);
    if (decision.allowed) throw new ConflictException("The destination is authorized");
    await this.identityStore.recordNavigationDenial({
      subject,
      contextId: getHeader(request, "x-ice24-context-id")!,
      timeZone: requireUser(request).timeZone,
      destination: input.destination,
      permission: input.permission,
      reason: decision.reason,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }

  @Get("session-contexts/current/focus-options")
  @ApiOperation({ summary: "Branches and machines the context selector may offer (F6-08)" })
  public async getFocusOptions(@Req() request: SecurityRequest): Promise<ContextFocusOptions> {
    const subject = await this.currentSubject(request);
    requireFocusPermission(subject, "equipment.read");
    return this.identityStore.contextFocusOptions(subject);
  }

  @Post("session-contexts/current/focus")
  // Choosing where to look is self-service: it must work in read-only accounts.
  @AllowReadOnlyOperation("identity-self-service")
  @HttpCode(200)
  @ApiOperation({ summary: "Validate and audit the working branch and machine (F6-08)" })
  public async setFocus(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<ContextFocus> {
    const focus = contextFocusSchema.parse(body);
    const subject = await this.currentSubject(request);
    // Going back to "all" needs only an active context; picking one also needs to read equipment.
    requireFocusPermission(subject, "identity.context-activate");
    if (focus.branchId !== null || focus.machineId !== null)
      requireFocusPermission(subject, "equipment.read");
    return this.identityStore.setContextFocus({
      subject,
      contextId: getHeader(request, "x-ice24-context-id")!,
      timeZone: requireUser(request).timeZone,
      focus,
      correlationId: request.correlationId ?? crypto.randomUUID(),
    });
  }

  @Delete("session-contexts/current")
  @AllowReadOnlyOperation("identity-self-service")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke only the current account context" })
  public async revokeCurrentContext(@Req() request: SecurityRequest): Promise<void> {
    const contextId = getHeader(request, "x-ice24-context-id");
    if (contextId === undefined) throw new Error("x-ice24-context-id is required");
    await this.identityStore.revokeSession(
      requireUser(request).id,
      contextId,
      "USER_CONTEXT_LOGOUT",
      request.correlationId ?? crypto.randomUUID(),
    );
  }

  @Get("me/sessions")
  @ApiOperation({ summary: "List the current user's account-context sessions" })
  public listSessions(@Req() request: SecurityRequest): Promise<SessionSummary[]> {
    return this.identityStore.listSessions(
      requireUser(request).id,
      getHeader(request, "x-ice24-context-id"),
    );
  }

  @Delete("me/sessions/:sessionId")
  @AllowReadOnlyOperation("identity-self-service")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke one own session" })
  public async revokeSession(@Req() request: SecurityRequest): Promise<void> {
    const sessionId = request.params?.sessionId;
    if (sessionId === undefined) throw new Error("Session id is required");
    await this.identityStore.revokeSession(
      requireUser(request).id,
      sessionId,
      "USER_REVOKED_SESSION",
      request.correlationId ?? crypto.randomUUID(),
    );
  }

  @Post("me/sessions/revoke-all")
  @AllowReadOnlyOperation("identity-self-service")
  @HttpCode(204)
  @ApiOperation({ summary: "Revoke every local context session for this identity" })
  public async revokeAllSessions(
    @Req() request: SecurityRequest,
    @Body() body: { readonly reason?: string },
  ): Promise<void> {
    await this.identityStore.revokeAllSessions(
      requireUser(request).id,
      body.reason?.trim() || "USER_GLOBAL_LOGOUT",
      request.correlationId ?? crypto.randomUUID(),
    );
  }

  private currentSubject(request: SecurityRequest): Promise<AuthorizationSubject> {
    const contextId = getHeader(request, "x-ice24-context-id");
    const claims = request.identityClaims;
    if (contextId === undefined) throw new Error("x-ice24-context-id is required");
    if (claims === undefined) throw new Error("Authentication guard invariant failed");
    return this.identityStore.getAuthorizationSubject(
      requireUser(request).id,
      contextId,
      claims.aal,
    );
  }
}
