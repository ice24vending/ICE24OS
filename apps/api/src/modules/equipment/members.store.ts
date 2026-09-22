import { createHash, randomUUID } from "node:crypto";
import { authorize } from "@ice24/authorization";
import { accountInvitationSchema, membershipPermissionsSchema } from "@ice24/contracts";
import { ConflictException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { SupabaseAdminClient } from "../identity/supabase-admin.client.js";
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
  async invite(request: SecurityRequest, body: unknown) {
    const input = accountInvitationSchema.parse(body);
    const result = await this.db.run(request, "members:invite", input, true, async (client, op) => {
      await validateDelegation(client, op, input);
      const user = await one(
        client,
        `insert into identity.users(identity_subject,username,email,display_name,status)
        values($1,$2,lower($3),$4,'INVITED') on conflict((lower(email))) do update set email=identity.users.email returning *`,
        [`pending:${randomUUID()}`, `invite-${randomUUID()}`, input.email, input.displayName],
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
      expected(before, versionHeader(request));
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
      await audit(client, op, row, "MEMBERSHIP_PERMISSIONS_CHANGED", input.reason, before);
      return row;
    });
  }
}
