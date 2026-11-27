import { createHash, randomUUID } from "node:crypto";
import { authorize } from "@ice24/authorization";
import {
  MEMBER_ACTIVITY_DAYS,
  accountInvitationSchema,
  memberActivityPeriodSchema,
  membershipPermissionsSchema,
} from "@ice24/contracts";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { SupabaseAdminClient } from "../identity/supabase-admin.client.js";
import { ACTIVE_OWNERS_SQL, keepAnOwner } from "../identity/identity.store.js";
import {
  EquipmentDatabase,
  audit,
  branch,
  one,
  scope,
  expected,
  versionHeader,
  type RecordRow,
  type Operation,
} from "./equipment.database.js";

/** Memberships of the account ($1), or only one ($2); ended associations leave the list. */
const MEMBERS_SQL = `select m.id,m.row_version::int as row_version,m.status,u.display_name,u.email,
  u.phone,u.job_title,m.is_primary_owner,
  coalesce((select array_agg(r.code order by r.code) from authz.membership_roles mr join authz.roles r on r.id=mr.role_id
    where mr.membership_id=m.id and mr.valid_to is null),'{}') as roles,
  exists(select 1 from authz.user_scopes s where s.membership_id=m.id and s.valid_to is null and s.scope_type='ACCOUNT') as account_wide,
  coalesce((select array_agg(s.branch_id::text order by s.branch_id) from authz.user_scopes s
    where s.membership_id=m.id and s.valid_to is null and s.branch_id is not null),'{}') as branch_ids,
  coalesce((select array_agg(s.machine_id::text order by s.machine_id) from authz.user_scopes s
    where s.membership_id=m.id and s.valid_to is null and s.machine_id is not null),'{}') as machine_ids,
  exists(select 1 from authz.membership_permission_overrides o join authz.permissions p on p.id=o.permission_id
    where o.membership_id=m.id and o.valid_to is null and p.code='equipment.manage' and o.effect='DENY') as denies_equipment_changes,
  (select max(c.last_seen_at) from identity.context_sessions c where c.membership_id=m.id) as last_access_at
  from identity.account_memberships m join identity.users u on u.id=m.user_id
  where m.account_id=$1 and (($2::uuid is null and m.status<>'ENDED') or m.id=$2)
  order by u.display_name,m.id limit 200`;

async function validateDelegation(
  client: PoolClient,
  op: Operation,
  input: { roleCodes: string[]; branchIds: string[]; machineIds: string[] },
) {
  scope(op, { account_id: op.accountId } as RecordRow, "account");
  if (
    !authorize(op.subject, {
      accountId: op.accountId,
      permission: "identity.membership-manage",
      classification: "RESTRICTED",
      operation: "WRITE",
      requiresMfa: true,
    }).allowed
  )
    throw new ForbiddenException();
  for (const id of input.branchIds) await branch(client, op, id);
  for (const id of input.machineIds)
    scope(
      op,
      await one(
        client,
        "select * from equipment.machines where id=$1 and operational_status<>'retired' for share",
        [id],
      ),
      "machine",
    );
  const roles = await client.query(
    "select id from authz.roles where code=any($1::text[]) and status='ACTIVE'",
    [input.roleCodes],
  );
  if (roles.rowCount !== input.roleCodes.length)
    throw new ConflictException("Duplicate or unavailable role");
  const permissions = await client.query<{
    code: string;
    data_classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  }>(
    `select p.code,p.data_classification from authz.permissions p
    join authz.role_permissions rp on rp.permission_id=p.id and rp.effect='ALLOW'
    join authz.roles r on r.id=rp.role_id where r.code=any($1::text[])`,
    [input.roleCodes],
  );
  for (const p of permissions.rows)
    if (
      !authorize(op.subject, {
        accountId: op.accountId,
        permission: p.code,
        classification: p.data_classification,
        operation: "READ",
      }).allowed
    )
      throw new ForbiddenException("Cannot delegate a permission you do not hold");
}

async function permissionSnapshot(client: PoolClient, id: string) {
  const result = await client.query<{ snapshot: Record<string, unknown> }>(
    `select jsonb_build_object(
      'roleCodes',coalesce((select jsonb_agg(r.code order by r.code) from authz.membership_roles mr join authz.roles r on r.id=mr.role_id where mr.membership_id=$1 and mr.valid_to is null),'[]'::jsonb),
      'permissionOverrides',coalesce((select jsonb_agg(p.code || ':' || o.effect order by p.code) from authz.membership_permission_overrides o join authz.permissions p on p.id=o.permission_id where o.membership_id=$1 and o.valid_to is null),'[]'::jsonb),
      'branchIds',coalesce((select jsonb_agg(branch_id::text order by branch_id) from authz.user_scopes where membership_id=$1 and valid_to is null and branch_id is not null),'[]'::jsonb),
      'machineIds',coalesce((select jsonb_agg(machine_id::text order by machine_id) from authz.user_scopes where membership_id=$1 and valid_to is null and machine_id is not null),'[]'::jsonb),
      'accountWide',exists(select 1 from authz.user_scopes where membership_id=$1 and valid_to is null and scope_type='ACCOUNT')
    ) as snapshot`,
    [id],
  );
  return result.rows[0]!.snapshot;
}
async function assign(
  client: PoolClient,
  id: string,
  input: { roleCodes: string[]; branchIds: string[]; machineIds: string[] },
) {
  await client.query(
    "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=any($2::text[]) and status='ACTIVE'",
    [id, input.roleCodes],
  );
  if (!input.branchIds.length && !input.machineIds.length)
    await client.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [id],
    );
  for (const branchId of input.branchIds)
    await client.query(
      "insert into authz.user_scopes(membership_id,scope_type,branch_id) values($1,'BRANCH',$2)",
      [id, branchId],
    );
  for (const machineId of input.machineIds)
    await client.query(
      "insert into authz.user_scopes(membership_id,scope_type,machine_id) values($1,'MACHINE',$2)",
      [id, machineId],
    );
}

@Injectable()
export class MembersStore {
  constructor(
    @Inject(EquipmentDatabase) private readonly db: EquipmentDatabase,
    @Inject(SupabaseAdminClient) private readonly auth: SupabaseAdminClient,
  ) {}
  /** «Usuarios» (UXD-09): same gate as before, equipment.read with account-wide scope. */
  list(request: SecurityRequest) {
    return this.db.run(request, "members", null, false, async (client, op) => {
      scope(op, { account_id: op.accountId } as RecordRow, "account");
      return (await client.query(MEMBERS_SQL, [op.accountId, null])).rows;
    });
  }
  /** One person's membership and activity; reading another's activity needs membership-manage. */
  detail(request: SecurityRequest, id: string, period: unknown) {
    const window = memberActivityPeriodSchema.parse(period ?? "week");
    // Not "members:…": that prefix makes run() demand the write permission with MFA.
    return this.db.run(request, `member-detail:${id}`, null, false, async (client, op) => {
      scope(op, { account_id: op.accountId } as RecordRow, "account");
      if (
        !authorize(op.subject, {
          accountId: op.accountId,
          permission: "identity.membership-manage",
          classification: "RESTRICTED",
          operation: "READ",
        }).allowed
      )
        throw new ForbiddenException();
      const member = (await client.query(MEMBERS_SQL, [op.accountId, id])).rows[0];
      if (!member) throw new NotFoundException("Resource not found");
      const user = await one(
        client,
        "select user_id as id from identity.account_memberships where id=$1",
        [id],
      );
      const values = [op.accountId, user.id];
      const totals = (
        await client.query(
          `with clock as (select coalesce(nullif(details->>'timezone',''),'America/Mexico_City') as zone
            from identity.accounts where id=$1),
          win as (select zone,
            (date_trunc('day', now() at time zone zone) - make_interval(days => $3::int - 1)) at time zone zone as since
            from clock)
          select win.zone as "timeZone", win.since as "from",
            (select count(distinct e.order_id)::int from maintenance.work_order_executions e
              where e.account_id=$1 and e.actor_id=$2 and e.kind='closure' and e.created_at>=win.since) as "maintenanceCompleted",
            (select count(*)::int from audit.events a where a.account_id=$1 and a.actor_user_id=$2
              and a.operation='TicketCreated' and a.result='SUCCESS' and a.occurred_at_utc>=win.since) as "ticketsCreated",
            (select count(distinct a.entity_id)::int from audit.events a where a.account_id=$1 and a.actor_user_id=$2
              and a.operation='TicketDiagnosed' and a.result='SUCCESS' and a.occurred_at_utc>=win.since) as "ticketsAttended",
            (select count(*)::int from maintenance.work_orders w
              where w.account_id=$1 and w.assignee_id=$2 and w.created_at>=win.since) as "ordersAssigned"
          from win`,
          [...values, MEMBER_ACTIVITY_DAYS[window]],
        )
      ).rows[0];
      const recentWorkOrders = (
        await client.query(
          `select id,folio,machine_code,state,created_at as at from maintenance.work_orders
          where account_id=$1 and assignee_id=$2 order by created_at desc,id limit 5`,
          values,
        )
      ).rows;
      const recentTickets = (
        await client.query(
          `select t.id,t.folio,t.machine_code,t.state,t.created_at as at from maintenance.tickets t
          where t.account_id=$1 and exists(select 1 from audit.events a where a.entity_id=t.id
            and a.actor_user_id=$2 and a.operation in ('TicketCreated','TicketDiagnosed') and a.result='SUCCESS')
          order by t.created_at desc,t.id limit 5`,
          values,
        )
      ).rows;
      const owners = (await client.query<{ id: string }>(ACTIVE_OWNERS_SQL, [op.accountId])).rows;
      return {
        member,
        lastActiveOwner: owners.length === 1 && owners[0]!.id === id,
        self: op.subject.membershipId === id,
        activity: { period: window, ...totals, recentWorkOrders, recentTickets },
      };
    });
  }
  async invite(request: SecurityRequest, body: unknown) {
    const input = accountInvitationSchema.parse(body);
    const result = await this.db.run(request, "members:invite", input, true, async (client, op) => {
      await validateDelegation(client, op, input);
      // An existing identity keeps its own name, phone and job title (UXD-09).
      const user = await one(
        client,
        `insert into identity.users(identity_subject,username,email,display_name,status,phone,job_title)
        values($1,$2,lower($3),$4,'INVITED',$5,$6) on conflict((lower(email))) do update set email=identity.users.email returning *`,
        [
          `pending:${randomUUID()}`,
          `invite-${randomUUID()}`,
          input.email,
          input.displayName,
          input.phone ?? null,
          input.jobTitle ?? null,
        ],
      );
      const row = await one(
        client,
        "insert into identity.account_memberships(account_id,user_id,status) values($1,$2,$3) returning *",
        [op.accountId, user.id, user.status === "ACTIVE" ? "ACTIVE" : "PENDING"],
      );
      await assign(client, row.id, input);
      await client.query(
        `insert into identity.user_invitations(account_id,email,invited_role_codes,token_hash,expires_at,invited_by_user_id)
        values($1,lower($2),$3,$4,now()+interval '24 hours',$5)`,
        [
          op.accountId,
          input.email,
          JSON.stringify(input.roleCodes),
          createHash("sha256").update(randomUUID()).digest("hex"),
          op.userId,
        ],
      );
      await audit(client, op, row, "MEMBER_INVITED", "Account membership invited");
      return {
        id: row.id,
        status: row.status,
        needsEmail: String(user.identity_subject).startsWith("pending:"),
      };
    });
    // Commit the pending association before delivery. Retrying with the same key retries delivery, not membership creation.
    if (result.needsEmail) await this.auth.inviteUser(input.email);
    return { id: result.id, status: result.status };
  }
  permissions(request: SecurityRequest, id: string, body: unknown) {
    const input = membershipPermissionsSchema.parse(body);
    return this.db.run(request, `members:${id}:permissions`, input, true, async (client, op) => {
      await validateDelegation(client, op, input);
      const before = await one(
        client,
        "select * from identity.account_memberships where id=$1 for update",
        [id],
      );
      scope(op, before, "account");
      if (!input.roleCodes.includes("OW"))
        await keepAnOwner(client, op.accountId, id, op.correlationId);
      expected(before, versionHeader(request));
      const previousPermissions = await permissionSnapshot(client, id);
      if (before.status !== "ACTIVE" || before.is_primary_owner || before.user_id === op.userId)
        throw new ConflictException("Only another active delegated membership can be edited");
      const platform = await client.query(
        "select 1 from authz.membership_roles mr join authz.roles r on r.id=mr.role_id where mr.membership_id=$1 and mr.valid_to is null and r.role_scope='PLATFORM'",
        [id],
      );
      if (platform.rowCount)
        throw new ForbiddenException(
          "Platform roles cannot be edited through account administration",
        );
      for (const override of input.overrides) {
        const permission = await one(client, "select * from authz.permissions where code=$1", [
          override.permission,
        ]);
        if (
          !op.subject.permissions.some(
            (p) => p.code === override.permission && p.effect === "ALLOW",
          ) ||
          op.subject.permissions.some((p) => p.code === override.permission && p.effect === "DENY")
        )
          throw new ForbiddenException("Cannot delegate a permission you do not hold");
        if (
          ![
            "equipment.read",
            "equipment.manage",
            "identity.profile-read",
            "identity.profile-update",
            "identity.context-activate",
            "identity.session-revoke",
            "identity.membership-manage",
          ].includes(String(permission.code))
        )
          throw new ForbiddenException("Permission cannot be delegated here");
      }
      for (const table of ["membership_roles", "user_scopes", "membership_permission_overrides"]) {
        await client.query(
          `update authz.${table} set valid_to=clock_timestamp() where membership_id=$1 and valid_to is null`,
          [id],
        );
      }
      await assign(client, id, input);
      for (const override of input.overrides)
        await client.query(
          `insert into authz.membership_permission_overrides(membership_id,permission_id,effect,reason)
        select $1,id,$3,$4 from authz.permissions where code=$2`,
          [id, override.permission, override.effect, input.reason],
        );
      const row = await one(
        client,
        "update identity.account_memberships set row_version=row_version+1,updated_at=now() where id=$1 returning *",
        [id],
      );
      await audit(
        client,
        op,
        { ...row, ...(await permissionSnapshot(client, id)) },
        "MEMBERSHIP_PERMISSIONS_CHANGED",
        input.reason,
        { ...before, ...previousPermissions },
      );
      return row;
    });
  }
}
