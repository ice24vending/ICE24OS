import {
  createContextRequestSchema,
  updateMyProfileRequestSchema,
  type AccessContext,
  type SessionSummary,
  type UserProfile,
} from "@ice24/contracts";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import { getHeader, type SecurityRequest } from "../../common/security/security-request.js";
import { IdentityStore } from "./identity.store.js";

const requireUser = (request: SecurityRequest): UserProfile => {
  if (request.localUser === undefined) throw new Error("Authentication guard invariant failed");
  return request.localUser;
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
  @ApiOperation({ summary: "Activate a membership context without a new global login" })
  public activateContext(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<AccessContext> {
    const input = createContextRequestSchema.parse(body);
    const claims = request.identityClaims;
    if (claims === undefined) throw new Error("Authentication guard invariant failed");
    const identitySessionId = input.identitySessionId ?? claims.session_id;
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

  @Delete("session-contexts/current")
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
}
