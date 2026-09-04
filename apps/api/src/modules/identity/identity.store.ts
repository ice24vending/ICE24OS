import { createHash, randomUUID } from "node:crypto";

import type { AuthorizationSubject, PermissionGrant } from "@ice24/authorization";
import {
  accessContextSchema,
  membershipSchema,
  recoveryCaseSchema,
  sessionSummarySchema,
  userProfileSchema,
  type AccessContext,
  type Membership,
  type OidcIdentityClaims,
  type RecoveryCase,
  type SessionSummary,
  type SecurityEventType,
  type UserProfile,
} from "@ice24/contracts";
import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

interface UserRow extends QueryResultRow {
  id: string;
  identity_subject: string;
  username: string;
  email: string;
  display_name: string;
  locale: string;
  time_zone: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  row_version: string | number;
}

interface ContextRow extends QueryResultRow {
  context_id: string | null;
  account_id: string;
  account_name: string;
  membership_id: string;
  membership_status: "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
  access_mode: "ACTIVE" | "READ_ONLY" | "SUSPENDED";
  role_codes: string[];
  branch_ids: string[];
  machine_ids: string[];
  issued_at: Date | string | null;
  expires_at: Date | string | null;
}

interface AuthorizationRow extends QueryResultRow {
  user_id: string;
  membership_id: string;
  account_id: string;
  membership_status: "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
  access_mode: "ACTIVE" | "READ_ONLY" | "SUSPENDED";
  context_active: boolean;
  permissions: PermissionGrant[];
  account_wide: boolean;
  branch_ids: string[];
  machine_ids: string[];
}

interface SessionRow extends QueryResultRow {
  id: string;
  account_id: string;
  account_name: string;
  issued_at: Date | string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  current: boolean;
  device_summary: string | null;
}

interface RecoveryRow extends QueryResultRow {
  id: string;
  user_id: string;
  status: "OPEN" | "VERIFYING" | "APPROVED" | "REJECTED" | "RESET_ISSUED" | "CLOSED";
  requested_at: Date | string;
  approval_count: string | number;
  row_version: string | number;
}

interface MembershipRow extends QueryResultRow {
  id: string;
  account_id: string;
  user_id: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
  is_primary_owner: boolean;
  role_codes: string[];
  valid_from: Date | string;
  valid_to: Date | string | null;
  row_version: string | number;
}

const mapUser = (row: UserRow): UserProfile =>
  userProfileSchema.parse({
    id: row.id,
    identitySubject: row.identity_subject,
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    locale: row.locale,
    timeZone: row.time_zone,
    status: row.status,
    version: Number(row.row_version),
  });

const mapContext = (row: ContextRow): AccessContext =>
  accessContextSchema.parse({
    id: row.context_id,
    accountId: row.account_id,
    accountName: row.account_name,
    membershipId: row.membership_id,
    membershipStatus: row.membership_status,
    accessMode: row.access_mode,
    roleCodes: row.role_codes,
    branchIds: row.branch_ids,
    machineIds: row.machine_ids,
    issuedAt: row.issued_at === null ? null : toIso(row.issued_at),
    expiresAt: row.expires_at === null ? null : toIso(row.expires_at),
  });

const mapRecovery = (row: RecoveryRow): RecoveryCase =>
  recoveryCaseSchema.parse({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    requestedAt: toIso(row.requested_at),
    approvalCount: Number(row.approval_count),
    version: Number(row.row_version),
  });

const mapMembership = (row: MembershipRow): Membership =>
  membershipSchema.parse({
    id: row.id,
    accountId: row.account_id,
    userId: row.user_id,
    status: row.status,
    isPrimaryOwner: row.is_primary_owner,
    roleCodes: row.role_codes,
    validFrom: toIso(row.valid_from),
    validTo: row.valid_to === null ? null : toIso(row.valid_to),
    version: Number(row.row_version),
  });

@Injectable()
export class IdentityStore implements OnModuleDestroy {
  private readonly pool: Pool | undefined;

  public constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.pool =
      connectionString === undefined || connectionString.length === 0
        ? undefined
        : new Pool({ connectionString, max: 10, statement_timeout: 5_000 });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  public async synchronizeIdentity(claims: OidcIdentityClaims): Promise<UserProfile> {
    if (claims.email === undefined)
      throw new ConflictException("The identity has no verified email");
    const username = this.normalizeUsername(
      claims.user_name ?? claims.email.split("@")[0] ?? claims.sub,
    );
    const displayName = claims.name?.trim() || username;
    const result = await this.query<UserRow>(
      `with linked_invitation as (
         update identity.users
         set identity_subject = $1, display_name = $4, status = 'ACTIVE',
             last_identity_sync_at = now(), updated_at = now(), row_version = row_version + 1
         where lower(email) = lower($3) and identity_subject like 'pending:%'
         returning *
       ), upserted as (
         insert into identity.users (
           identity_subject, username, email, display_name, status, last_identity_sync_at
         )
         select $1, $2, lower($3), $4, 'ACTIVE', now()
         where not exists (select 1 from linked_invitation)
         on conflict (identity_subject) do update
         set email = excluded.email, display_name = excluded.display_name,
             last_identity_sync_at = now(), updated_at = now(), row_version = identity.users.row_version + 1
         returning *
       )
       select * from linked_invitation union all select * from upserted limit 1`,
      [claims.sub, username, claims.email, displayName],
    );
    const row = result.rows[0];
    if (row === undefined) throw new ServiceUnavailableException("Identity synchronization failed");
    await this.query(
      `update identity.account_memberships
       set status = 'ACTIVE', updated_at = now(), row_version = row_version + 1
       where user_id = $1 and status = 'PENDING'`,
      [row.id],
    );
    await this.query(
      `update identity.user_invitations
       set status = 'ACCEPTED', accepted_at = now()
       where lower(email) = lower($1) and status = 'PENDING' and expires_at > now()`,
      [row.email],
    );
    return mapUser(row);
  }

  public async getProfile(userId: string): Promise<UserProfile> {
    const result = await this.query<UserRow>("select * from identity.users where id = $1", [
      userId,
    ]);
    const row = result.rows[0];
    if (row === undefined) throw new NotFoundException("Profile not found");
    return mapUser(row);
  }

  public async updateProfile(
    userId: string,
    version: number,
    changes: {
      readonly displayName?: string | undefined;
      readonly locale?: string | undefined;
      readonly timeZone?: string | undefined;
    },
  ): Promise<UserProfile> {
    const result = await this.query<UserRow>(
      `update identity.users
       set display_name = coalesce($3, display_name), locale = coalesce($4, locale),
           time_zone = coalesce($5, time_zone), updated_at = now(), row_version = row_version + 1
       where id = $1 and row_version = $2 returning *`,
      [userId, version, changes.displayName, changes.locale, changes.timeZone],
    );
    const row = result.rows[0];
    if (row === undefined) throw new ConflictException("Profile version conflict");
    return mapUser(row);
  }

  public async listContexts(userId: string): Promise<AccessContext[]> {
    const result = await this.query<ContextRow>(
      `select active_context.id as context_id, account.id as account_id, account.name as account_name,
              membership.id as membership_id, membership.status as membership_status,
              account.access_mode,
              coalesce(array_agg(distinct role.code) filter (where role.code is not null), '{}') as role_codes,
              coalesce(array_agg(distinct scope.branch_id) filter (where scope.branch_id is not null), '{}') as branch_ids,
              coalesce(array_agg(distinct scope.machine_id) filter (where scope.machine_id is not null), '{}') as machine_ids,
              active_context.issued_at, active_context.expires_at
       from identity.account_memberships membership
       join identity.accounts account on account.id = membership.account_id and account.archived_at is null
       left join authz.membership_roles membership_role on membership_role.membership_id = membership.id
         and membership_role.valid_from <= now()
         and (membership_role.valid_to is null or membership_role.valid_to > now())
       left join authz.roles role on role.id = membership_role.role_id and role.status = 'ACTIVE'
       left join authz.user_scopes scope on scope.membership_id = membership.id
         and scope.valid_from <= now() and (scope.valid_to is null or scope.valid_to > now())
       left join lateral (
         select context_session.* from identity.context_sessions context_session
         where context_session.user_id = membership.user_id
           and context_session.membership_id = membership.id and context_session.revoked_at is null
           and context_session.idle_expires_at > now() and context_session.expires_at > now()
         order by context_session.issued_at desc limit 1
       ) active_context on true
       where membership.user_id = $1 and membership.status = 'ACTIVE'
         and membership.valid_from <= now() and (membership.valid_to is null or membership.valid_to > now())
       group by active_context.id, account.id, membership.id
       order by account.name`,
      [userId],
    );
    return result.rows.map(mapContext);
  }

  public async activateContext(input: {
    readonly userId: string;
    readonly accountId: string;
    readonly identitySessionId?: string;
    readonly assuranceLevel: "aal1" | "aal2";
    readonly deviceFingerprintHash?: string;
    readonly deviceSummary?: string;
    readonly correlationId: string;
  }): Promise<AccessContext> {
    const activated = await this.query<{ id: string } & QueryResultRow>(
      `select (identity.activate_context($1,$2,$3,$4,$5,$6,$7)).id`,
      [
        input.userId,
        input.accountId,
        input.identitySessionId,
        input.assuranceLevel,
        input.deviceFingerprintHash,
        input.deviceSummary,
        input.correlationId,
      ],
    );
    const contextId = activated.rows[0]?.id;
    if (contextId === undefined) throw new ServiceUnavailableException("Context activation failed");
    return this.getContext(input.userId, contextId);
  }

  public async getContext(userId: string, contextId: string): Promise<AccessContext> {
    const result = await this.query<ContextRow>(
      `select session.id as context_id, account.id as account_id, account.name as account_name,
              membership.id as membership_id, membership.status as membership_status,
              account.access_mode,
              coalesce(array_agg(distinct role.code) filter (where role.code is not null), '{}') as role_codes,
              coalesce(array_agg(distinct scope.branch_id) filter (where scope.branch_id is not null), '{}') as branch_ids,
              coalesce(array_agg(distinct scope.machine_id) filter (where scope.machine_id is not null), '{}') as machine_ids,
              session.issued_at, session.expires_at
       from identity.context_sessions session
       join identity.accounts account on account.id = session.account_id
       join identity.account_memberships membership on membership.id = session.membership_id
       left join authz.membership_roles membership_role on membership_role.membership_id = membership.id
         and membership_role.valid_from <= now() and (membership_role.valid_to is null or membership_role.valid_to > now())
       left join authz.roles role on role.id = membership_role.role_id and role.status = 'ACTIVE'
       left join authz.user_scopes scope on scope.membership_id = membership.id
         and scope.valid_from <= now() and (scope.valid_to is null or scope.valid_to > now())
       where session.id = $1 and session.user_id = $2 and session.revoked_at is null
         and session.idle_expires_at > now() and session.expires_at > now()
       group by session.id, account.id, membership.id`,
      [contextId, userId],
    );
    const row = result.rows[0];
    if (row === undefined) throw new NotFoundException("Active context not found");
    return mapContext(row);
  }

  public async getAuthorizationSubject(
    userId: string,
    contextId: string,
    assuranceLevel: "aal1" | "aal2",
  ): Promise<AuthorizationSubject> {
    const result = await this.query<AuthorizationRow>(
      `with effective_permissions as (
         select permission.code, role_permission.effect, permission.data_classification
         from identity.context_sessions session
         join authz.membership_roles membership_role on membership_role.membership_id = session.membership_id
           and membership_role.valid_from <= now() and (membership_role.valid_to is null or membership_role.valid_to > now())
         join authz.role_permissions role_permission on role_permission.role_id = membership_role.role_id
         join authz.permissions permission on permission.id = role_permission.permission_id
         where session.id = $2
         union all
         select permission.code, override.effect, permission.data_classification
         from identity.context_sessions session
         join authz.membership_permission_overrides override on override.membership_id = session.membership_id
           and override.valid_from <= now() and (override.valid_to is null or override.valid_to > now())
         join authz.permissions permission on permission.id = override.permission_id
         where session.id = $2
       )
       select session.user_id, membership.id as membership_id, membership.account_id,
              membership.status as membership_status, account.access_mode,
              (session.revoked_at is null and session.idle_expires_at > now() and session.expires_at > now()) as context_active,
              coalesce((select jsonb_agg(jsonb_build_object(
                'code', permission.code, 'effect', permission.effect,
                'classification', permission.data_classification
              )) from effective_permissions permission), '[]'::jsonb) as permissions,
              coalesce(array_agg(distinct scope.branch_id) filter (where scope.branch_id is not null), '{}') as branch_ids,
              coalesce(array_agg(distinct scope.machine_id) filter (where scope.machine_id is not null), '{}') as machine_ids,
              coalesce(bool_or(scope.scope_type = 'ACCOUNT'), false) as account_wide
       from identity.context_sessions session
       join identity.account_memberships membership on membership.id = session.membership_id
       join identity.accounts account on account.id = session.account_id
       left join authz.user_scopes scope on scope.membership_id = membership.id
         and scope.valid_from <= now() and (scope.valid_to is null or scope.valid_to > now())
       where session.id = $2 and session.user_id = $1
       group by session.id, membership.id, account.id`,
      [userId, contextId],
    );
    const row = result.rows[0];
    if (row === undefined) throw new NotFoundException("Active context not found");
    return {
      userId: row.user_id,
      membershipId: row.membership_id,
      membershipAccountId: row.account_id,
      membershipStatus: row.membership_status,
      contextActive: row.context_active,
      accountAccessMode: row.access_mode,
      assuranceLevel,
      permissions: row.permissions,
      accountWide: row.account_wide,
      branchIds: new Set(row.branch_ids),
      machineIds: new Set(row.machine_ids),
    };
  }

  public async listSessions(userId: string, currentContextId?: string): Promise<SessionSummary[]> {
    const result = await this.query<SessionRow>(
      `select session.id, session.account_id, account.name as account_name,
              session.issued_at, session.expires_at, session.revoked_at,
              session.id = $2::uuid as current, session.device_summary
       from identity.context_sessions session
       join identity.accounts account on account.id = session.account_id
       where session.user_id = $1 order by session.issued_at desc limit 100`,
      [userId, currentContextId ?? null],
    );
    return result.rows.map((row) =>
      sessionSummarySchema.parse({
        id: row.id,
        accountId: row.account_id,
        accountName: row.account_name,
        issuedAt: toIso(row.issued_at),
        expiresAt: toIso(row.expires_at),
        revokedAt: row.revoked_at === null ? null : toIso(row.revoked_at),
        current: row.current,
        deviceSummary: row.device_summary,
      }),
    );
  }

  public async revokeSession(
    userId: string,
    sessionId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    const result = await this.query<{ account_id: string } & QueryResultRow>(
      `update identity.context_sessions set revoked_at = now(), revocation_reason = $3
       where id = $2 and user_id = $1 and revoked_at is null returning account_id`,
      [userId, sessionId, reason],
    );
    const accountId = result.rows[0]?.account_id;
    if (accountId === undefined) throw new NotFoundException("Session not found");
    await this.writeSecurityEvent({
      actorUserId: userId,
      subjectUserId: userId,
      contextSessionId: sessionId,
      accountId,
      eventType: "SESSION_REVOKED",
      correlationId,
      reason,
    });
  }

  public async revokeAllSessions(
    userId: string,
    reason: string,
    correlationId: string,
  ): Promise<number> {
    const result = await this.query(
      `update identity.context_sessions set revoked_at = now(), revocation_reason = $2
       where user_id = $1 and revoked_at is null`,
      [userId, reason],
    );
    await this.writeSecurityEvent({
      actorUserId: userId,
      subjectUserId: userId,
      eventType: "SESSIONS_REVOKED_GLOBAL",
      correlationId,
      reason,
    });
    return result.rowCount ?? 0;
  }

  public async createAccountWithOwner(input: {
    readonly actorUserId: string;
    readonly accountName: string;
    readonly accountType: "INDIVIDUAL" | "COMPANY";
    readonly ownerEmail: string;
    readonly ownerUsername: string;
    readonly ownerDisplayName: string;
    readonly idempotencyKey: string;
    readonly correlationId: string;
  }): Promise<{
    accountId: string;
    ownerUserId: string;
    membershipId: string;
    invitationId: string;
  }> {
    const client = await this.getPool().connect();
    try {
      await client.query("begin");
      const requestHash = createHash("sha256")
        .update(
          JSON.stringify({
            accountName: input.accountName,
            accountType: input.accountType,
            ownerEmail: input.ownerEmail.toLowerCase(),
            ownerUsername: input.ownerUsername.toLowerCase(),
            ownerDisplayName: input.ownerDisplayName,
          }),
        )
        .digest("hex");
      const replay = await client.query<{
        request_hash: string;
        response_payload: {
          accountId: string;
          ownerUserId: string;
          membershipId: string;
          invitationId: string;
        };
      }>(
        `select request_hash,response_payload from identity.idempotency_records
         where actor_user_id=$1 and operation='accounts.create' and idempotency_key=$2
           and expires_at > now() for update`,
        [input.actorUserId, input.idempotencyKey],
      );
      const prior = replay.rows[0];
      if (prior !== undefined) {
        if (prior.request_hash !== requestHash) {
          throw new ConflictException("Idempotency key reused with a different request");
        }
        await client.query("commit");
        return prior.response_payload;
      }
      const accountId = randomUUID();
      const account = await client.query<{ id: string }>(
        "insert into identity.accounts (id,name,account_type) values ($1,$2,$3) returning id",
        [accountId, input.accountName, input.accountType],
      );
      const owner = await client.query<{ id: string }>(
        `insert into identity.users (identity_subject,username,email,display_name,status)
         values ($1,$2,lower($3),$4,'INVITED')
         on conflict ((lower(email))) do update set display_name = excluded.display_name
         returning id`,
        [`pending:${randomUUID()}`, input.ownerUsername, input.ownerEmail, input.ownerDisplayName],
      );
      const ownerUserId = owner.rows[0]?.id;
      if (ownerUserId === undefined || account.rows[0] === undefined)
        throw new Error("Owner creation failed");
      const membership = await client.query<{ id: string }>(
        `insert into identity.account_memberships (account_id,user_id,status,is_primary_owner)
         values ($1,$2,'PENDING',true) returning id`,
        [accountId, ownerUserId],
      );
      const membershipId = membership.rows[0]?.id;
      if (membershipId === undefined) throw new Error("Membership creation failed");
      await client.query(
        `insert into authz.membership_roles (membership_id,role_id)
         select $1,id from authz.roles where code = 'OW'`,
        [membershipId],
      );
      await client.query(
        "insert into authz.user_scopes (membership_id,scope_type) values ($1,'ACCOUNT')",
        [membershipId],
      );
      const invitationId = randomUUID();
      const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
      await client.query(
        `insert into identity.user_invitations (
           id,account_id,email,invited_role_codes,token_hash,expires_at,invited_by_user_id
         ) values ($1,$2,lower($3),'["OW"]'::jsonb,$4,now()+interval '24 hours',$5)`,
        [invitationId, accountId, input.ownerEmail, tokenHash, input.actorUserId],
      );
      await client.query(
        `insert into audit.security_events (
           actor_user_id,subject_user_id,account_id,event_type,result,correlation_id,metadata
         ) values ($1,$2,$3,'ACCOUNT_CREATED','SUCCESS',$4,jsonb_build_object('invitationId',$5::text))`,
        [input.actorUserId, ownerUserId, accountId, input.correlationId, invitationId],
      );
      const responsePayload = { accountId, ownerUserId, membershipId, invitationId };
      await client.query(
        `insert into identity.idempotency_records (
           actor_user_id,operation,idempotency_key,request_hash,response_payload
         ) values ($1,'accounts.create',$2,$3,$4::jsonb)`,
        [input.actorUserId, input.idempotencyKey, requestHash, JSON.stringify(responsePayload)],
      );
      await client.query("commit");
      return responsePayload;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  public async createMembership(input: {
    readonly actorUserId: string;
    readonly accountId: string;
    readonly userId: string;
    readonly roleCodes: readonly string[];
    readonly branchIds: readonly string[];
    readonly machineIds: readonly string[];
    readonly correlationId: string;
  }): Promise<Membership> {
    const client = await this.getPool().connect();
    try {
      await client.query("begin");
      const membership = await client.query<{ id: string }>(
        `insert into identity.account_memberships (account_id,user_id,status,is_primary_owner)
         values ($1,$2,'ACTIVE',false) returning id`,
        [input.accountId, input.userId],
      );
      const membershipId = membership.rows[0]?.id;
      if (membershipId === undefined) throw new Error("Membership creation failed");
      const assignedRoles = await client.query(
        `insert into authz.membership_roles (membership_id,role_id)
         select $1,id from authz.roles where code = any($2::text[]) and status = 'ACTIVE'`,
        [membershipId, input.roleCodes],
      );
      if (assignedRoles.rowCount !== input.roleCodes.length) {
        throw new ConflictException("One or more roles are unavailable");
      }
      if (input.branchIds.length === 0 && input.machineIds.length === 0) {
        await client.query(
          "insert into authz.user_scopes (membership_id,scope_type) values ($1,'ACCOUNT')",
          [membershipId],
        );
      }
      await client.query(
        `insert into authz.user_scopes (membership_id,scope_type,branch_id)
         select $1,'BRANCH',scope_id from unnest($2::uuid[]) scope_id`,
        [membershipId, input.branchIds],
      );
      await client.query(
        `insert into authz.user_scopes (membership_id,scope_type,machine_id)
         select $1,'MACHINE',scope_id from unnest($2::uuid[]) scope_id`,
        [membershipId, input.machineIds],
      );
      await client.query(
        `insert into audit.security_events (
           actor_user_id,subject_user_id,account_id,event_type,result,correlation_id,metadata
         ) values ($1,$2,$3,'MEMBERSHIP_CHANGED','SUCCESS',$4,
           jsonb_build_object('membershipId',$5::text,'operation','CREATE'))`,
        [input.actorUserId, input.userId, input.accountId, input.correlationId, membershipId],
      );
      await client.query("commit");
      return await this.getMembership(membershipId);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  public async transitionMembership(input: {
    readonly actorUserId: string;
    readonly actorAccountId: string;
    readonly membershipId: string;
    readonly targetStatus: "ACTIVE" | "SUSPENDED" | "ENDED";
    readonly expectedVersion: number;
    readonly reason: string;
    readonly correlationId: string;
  }): Promise<Membership> {
    const previousStates =
      input.targetStatus === "ACTIVE"
        ? ["SUSPENDED"]
        : input.targetStatus === "SUSPENDED"
          ? ["ACTIVE"]
          : ["ACTIVE", "SUSPENDED"];
    const client = await this.getPool().connect();
    try {
      await client.query("begin");
      const updated = await client.query<{ user_id: string }>(
        `update identity.account_memberships
         set status=$1, valid_to=case when $1='ENDED' then now() else null end,
             ended_reason=case when $1='ENDED' then $6 else null end,
             updated_at=now(), row_version=row_version+1
         where id=$2 and account_id=$3 and row_version=$4 and status=any($5::text[])
           and not is_primary_owner
         returning user_id`,
        [
          input.targetStatus,
          input.membershipId,
          input.actorAccountId,
          input.expectedVersion,
          previousStates,
          input.reason,
        ],
      );
      const subjectUserId = updated.rows[0]?.user_id;
      if (subjectUserId === undefined) {
        throw new ConflictException("Membership transition or version is invalid");
      }
      if (input.targetStatus !== "ACTIVE") {
        await client.query(
          `update identity.context_sessions
           set revoked_at=now(), revocation_reason=$3
           where membership_id=$1 and account_id=$2 and revoked_at is null`,
          [input.membershipId, input.actorAccountId, input.reason],
        );
      }
      await client.query(
        `insert into audit.security_events (
           actor_user_id,subject_user_id,account_id,event_type,result,reason,correlation_id,metadata
         ) values ($1,$2,$3,'MEMBERSHIP_CHANGED','SUCCESS',$4,$5,
           jsonb_build_object('membershipId',$6::text,'status',$7::text))`,
        [
          input.actorUserId,
          subjectUserId,
          input.actorAccountId,
          input.reason,
          input.correlationId,
          input.membershipId,
          input.targetStatus,
        ],
      );
      await client.query("commit");
      return await this.getMembership(input.membershipId);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  public async getMembership(membershipId: string): Promise<Membership> {
    const result = await this.query<MembershipRow>(
      `select membership.id,membership.account_id,membership.user_id,membership.status,
              membership.is_primary_owner,membership.valid_from,membership.valid_to,
              membership.row_version,
              coalesce(array_agg(role.code order by role.code) filter (where role.code is not null),'{}') role_codes
       from identity.account_memberships membership
       left join authz.membership_roles membership_role on membership_role.membership_id=membership.id
         and membership_role.valid_from <= now()
         and (membership_role.valid_to is null or membership_role.valid_to > now())
       left join authz.roles role on role.id=membership_role.role_id
       where membership.id=$1 group by membership.id`,
      [membershipId],
    );
    const row = result.rows[0];
    if (row === undefined) throw new NotFoundException("Membership not found");
    return mapMembership(row);
  }

  public async createRecoveryCase(input: {
    readonly actorUserId: string;
    readonly userId: string;
    readonly requestedChannel: string;
    readonly reason: string;
    readonly correlationId: string;
  }): Promise<RecoveryCase> {
    const result = await this.query<RecoveryRow>(
      `with created as (
         insert into identity.recovery_cases (user_id,requested_channel,request_reason)
         values ($1,$2,$3) returning *
       ), event as (
         insert into audit.security_events (
           actor_user_id,subject_user_id,event_type,result,reason,correlation_id,metadata
         ) select $4,user_id,'RECOVERY_REQUESTED','SUCCESS',$3,$5,jsonb_build_object('caseId',id)
         from created
       )
       select created.*, 0::bigint as approval_count from created`,
      [input.userId, input.requestedChannel, input.reason, input.actorUserId, input.correlationId],
    );
    const row = result.rows[0];
    if (row === undefined) throw new ServiceUnavailableException("Recovery case creation failed");
    return mapRecovery(row);
  }

  public async approveRecoveryCase(input: {
    readonly caseId: string;
    readonly operatorUserId: string;
    readonly verificationMethod: string;
    readonly evidenceReferences: readonly string[];
    readonly reason: string;
    readonly expectedVersion: number;
    readonly correlationId: string;
  }): Promise<RecoveryCase> {
    const result = await this.query<RecoveryRow>(
      `select approved.*, (
         select count(*) from identity.recovery_approvals approval
         where approval.recovery_case_id = approved.id and approval.decision = 'APPROVE'
       ) as approval_count
       from identity.approve_recovery_case($1,$2,$3,$4::jsonb,$5,$6,$7) approved`,
      [
        input.caseId,
        input.operatorUserId,
        input.verificationMethod,
        JSON.stringify(input.evidenceReferences),
        input.reason,
        input.expectedVersion,
        input.correlationId,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) throw new ServiceUnavailableException("Recovery approval failed");
    return mapRecovery(row);
  }

  public async recordBffSecurityEvent(input: {
    readonly identitySubject?: string | undefined;
    readonly eventType: SecurityEventType;
    readonly result: "SUCCESS" | "DENIED" | "FAILED";
    readonly correlationId: string;
    readonly reason?: string | undefined;
    readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  }): Promise<void> {
    await this.query(
      `insert into audit.security_events (
         actor_user_id,subject_user_id,event_type,result,reason,correlation_id,metadata
       ) values (
         (select id from identity.users where identity_subject = $1),
         (select id from identity.users where identity_subject = $1),
         $2,$3,$4,$5,$6::jsonb
       )`,
      [
        input.identitySubject,
        input.eventType,
        input.result,
        input.reason,
        input.correlationId,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  private normalizeUsername(input: string): string {
    const normalized = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 80);
    return normalized.length >= 3 ? normalized : `user-${normalized.padEnd(3, "0")}`;
  }

  private async writeSecurityEvent(input: {
    readonly actorUserId: string;
    readonly subjectUserId: string;
    readonly contextSessionId?: string;
    readonly accountId?: string;
    readonly eventType: string;
    readonly correlationId: string;
    readonly reason: string;
  }): Promise<void> {
    await this.query(
      `insert into audit.security_events (
         actor_user_id,subject_user_id,context_session_id,account_id,event_type,
         result,reason,correlation_id
       ) values ($1,$2,$3,$4,$5,'SUCCESS',$6,$7)`,
      [
        input.actorUserId,
        input.subjectUserId,
        input.contextSessionId,
        input.accountId,
        input.eventType,
        input.reason,
        input.correlationId,
      ],
    );
  }

  private getPool(): Pool {
    if (this.pool === undefined) {
      throw new ServiceUnavailableException("DATABASE_URL is required for identity endpoints");
    }
    return this.pool;
  }

  private query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ) {
    return this.getPool().query<Row>(text, [...values]);
  }
}

export type IdentityTransactionClient = PoolClient;
