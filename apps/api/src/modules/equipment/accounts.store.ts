import { accountDetailsSchema, branchInputSchema, transitionInputSchema } from "@ice24/contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  audit,
  expected,
  one,
  scope,
  versionHeader,
  type RecordRow,
} from "./equipment.database.js";

@Injectable()
export class AccountsStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  workspace(request: SecurityRequest) {
    return this.db.run(request, "workspace", null, false, async (_client, op) => ({
      accountId: op.accountId,
      contextId: op.contextId,
      canAdmin: op.admin,
      canManage:
        op.subject.accountAccessMode === "ACTIVE" &&
        op.subject.permissions.some((p) => p.code === "equipment.manage" && p.effect === "ALLOW") &&
        !op.subject.permissions.some((p) => p.code === "equipment.manage" && p.effect === "DENY"),
      hasMfa: op.subject.assuranceLevel === "aal2",
      accessMode: op.subject.accountAccessMode,
      accountWide: op.subject.accountWide,
    }));
  }
  account(request: SecurityRequest, id: string, body?: unknown, admin = false) {
    const input = body === undefined ? undefined : accountDetailsSchema.parse(body);
    return this.db.run(
      request,
      `account:${id}`,
      input,
      input !== undefined,
      async (client, op) => {
        const before = await one(
          client,
          "select *,id as account_id from identity.accounts where id=$1 for update",
          [id],
        );
        scope(op, before, "account", admin);
        if (!input) return before;
        expected(before, versionHeader(request));
        const row = await one(
          client,
          "update identity.accounts set name=$2,details=$3,row_version=row_version+1,updated_at=now() where id=$1 returning *,id as account_id",
          [id, input.displayName, JSON.stringify(input)],
        );
        await audit(client, op, row, "ACCOUNT_UPDATED", "Account details updated", before);
        return row;
      },
      admin,
    );
  }
  access(request: SecurityRequest, id: string, body: unknown, mode: "ACTIVE" | "READ_ONLY") {
    const input = transitionInputSchema.parse(body);
    return this.db.run(
      request,
      `access:${id}:${mode}`,
      input,
      true,
      async (client, op) => {
        const before = await one(
          client,
          "select *,id as account_id from identity.accounts where id=$1 for update",
          [id],
        );
        expected(before, versionHeader(request));
        const row = await one(
          client,
          "update identity.accounts set access_mode=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *,id as account_id",
          [id, mode],
        );
        await audit(client, op, row, "ACCOUNT_ACCESS_CHANGED", input.reason, before);
        return row;
      },
      true,
    );
  }
  branches(request: SecurityRequest, body?: unknown) {
    const input = body === undefined ? undefined : branchInputSchema.parse(body);
    return this.db.run(request, "branches", input, !!input, async (client, op) => {
      if (!input)
        return (
          await client.query<RecordRow>(
            "select * from equipment.branches where account_id=$1 and ($2 or id=any($3::uuid[])) order by created_at,id limit 200",
            [op.accountId, op.subject.accountWide, [...op.subject.branchIds]],
          )
        ).rows;
      scope(op, { account_id: op.accountId } as RecordRow, "account");
      const row = await one(
        client,
        "insert into equipment.branches(account_id,data) values($1,$2) returning *",
        [op.accountId, JSON.stringify(input)],
      );
      await audit(client, op, row, "BRANCH_CREATED", "Branch created");
      return row;
    });
  }
  branch(request: SecurityRequest, id: string, body?: unknown, action?: "archive" | "restore") {
    const input =
      body === undefined
        ? undefined
        : action
          ? transitionInputSchema.parse(body)
          : branchInputSchema.parse(body);
    return this.db.run(
      request,
      `branch:${id}:${action ?? "update"}`,
      input,
      !!input,
      async (client, op) => {
        const before = await one(
          client,
          "select * from equipment.branches where id=$1 for update",
          [id],
        );
        scope(op, before, "branch");
        if (!input) return before;
        expected(before, versionHeader(request));
        if (action === "archive") {
          const active = await client.query(
            "select 1 from equipment.machines where branch_id=$1 and operational_status<>'retired' union all select 1 from equipment.requests where branch_id=$1 and status not in ('active','rejected')",
            [id],
          );
          if (active.rowCount)
            throw new ConflictException(
              "Move or retire machines and finish requests before archiving",
            );
        }
        const row = action
          ? await one(
              client,
              "update equipment.branches set status=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *",
              [id, action === "archive" ? "archived" : "active"],
            )
          : await one(
              client,
              "update equipment.branches set data=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *",
              [id, JSON.stringify(input)],
            );
        await audit(
          client,
          op,
          row,
          "BRANCH_UPDATED",
          "reason" in input ? input.reason : "Branch details updated",
          before,
        );
        return row;
      },
    );
  }
  members(request: SecurityRequest) {
    return this.db.run(request, "members", null, false, async (client, op) => {
      scope(op, { account_id: op.accountId } as RecordRow, "account");
      return (
        await client.query(
          `select m.id,m.status,m.row_version,u.display_name,u.email,
        coalesce(array_agg(r.code) filter(where r.code is not null),'{}') as roles
        from identity.account_memberships m join identity.users u on u.id=m.user_id
        left join authz.membership_roles mr on mr.membership_id=m.id and mr.valid_to is null
        left join authz.roles r on r.id=mr.role_id where m.account_id=$1 group by m.id,u.id order by u.display_name limit 200`,
          [op.accountId],
        )
      ).rows;
    });
  }
  dashboard(request: SecurityRequest, accounts = false) {
    return this.db.run(
      request,
      "admin-dashboard",
      null,
      false,
      async (client) => {
        if (accounts)
          return (
            await client.query(
              "select id,name,account_type,access_mode,row_version from identity.accounts order by created_at desc limit 200",
            )
          ).rows;
        return (
          await client.query(`select (select count(*) from identity.accounts) as accounts,
        (select count(*) from equipment.requests where status in ('submitted','in_review','information_required')) as pending_requests,
        (select count(*) from equipment.machines) as machines,
        (select count(*) from equipment.template_versions where status='draft') as draft_templates,
        (select count(*) from equipment.schedule_jobs where status='failed') as failed_jobs`)
        ).rows[0];
      },
      true,
    );
  }
}
