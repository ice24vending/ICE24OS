import {
  assignTemplateSchema,
  machineMetadataSchema,
  moveInputSchema,
  operationalInputSchema,
  transitionInputSchema,
  type MachineOverview,
} from "@ice24/contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import {
  EquipmentDatabase,
  audit,
  branch,
  expected,
  one,
  scope,
  versionHeader,
  type Operation,
  type RecordRow,
} from "./equipment.database.js";
import { listMachineComponents } from "./machine-components.store.js";
import { listMachineFrequencies } from "./frequency-overrides.store.js";

export async function changePeriod(
  client: PoolClient,
  op: Operation,
  machineId: string,
  kind: string,
  reference: string,
  reason: string,
  time: string,
) {
  await client.query(
    "update equipment.machine_periods set valid_to=$3 where machine_id=$1 and kind=$2 and valid_to is null",
    [machineId, kind, time],
  );
  await client.query(
    "insert into equipment.machine_periods(machine_id,kind,reference_id,valid_from,actor_id,reason) values($1,$2,$3,$4,$5,$6)",
    [machineId, kind, reference, time, op.userId, reason],
  );
}
@Injectable()
export class MachinesStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  overview(request: SecurityRequest) {
    // EquipmentDatabase enforces equipment.read; scope is identical to list(), including MACHINE grants.
    return this.db.run(request, "machines-overview", null, false, async (client, op) => {
      // shortcut: at most 200 machines, matching list(). Filters/sorting apply to this bounded set.
      // One data query: aggregates do not multiply tickets by activities or issue per-machine calls.
      return (
        await client.query<MachineOverview>(
          `
        with visible as (
          select * from equipment.machines where account_id=$1
            and ($2 or branch_id=any($3::uuid[]) or id=any($4::uuid[]))
          order by created_at desc,id limit 200
        )
        select m.id,m.machine_code,coalesce(nullif(m.data->>'internalName',''),m.machine_code) as name,
          coalesce(m.data->>'serialNumber','') as "serialNumber",m.branch_id,
          coalesce(nullif(b.data->>'name',''),'Sin nombre') as "branchName",m.operational_status,
          (select to_char(max(e.created_at) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            from maintenance.work_orders w
            join maintenance.work_order_executions e on e.order_id=w.id and e.account_id=w.account_id
            where w.account_id=m.account_id and w.machine_id=m.id
              and w.state<>'cancelled' and e.kind='closure') as "lastMaintenanceAt",
          (select to_char(min(p.due_at) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') from (
            select a.due_at from equipment.scheduled_activities a
              where a.machine_id=m.id and a.status in ('pending','in_progress')
                and coalesce(a.definition->>'category','maintenance')='maintenance'
            union all
            select w.due_at from maintenance.work_orders w
              where w.account_id=m.account_id and w.machine_id=m.id
                and w.state in ('scheduled','upcoming','overdue','in_progress')
          ) p) as "nextMaintenanceAt",
          (select count(*)::int from maintenance.tickets t
            where t.account_id=m.account_id and t.machine_id=m.id
              and t.state in ('pending_assignment','in_progress')) as "openTickets"
        from visible m join equipment.branches b on b.id=m.branch_id and b.account_id=m.account_id
        order by m.created_at desc,m.id`,
          [
            op.accountId,
            op.subject.accountWide,
            [...op.subject.branchIds],
            [...op.subject.machineIds],
          ],
        )
      ).rows;
    });
  }
  list(request: SecurityRequest) {
    return this.db.run(
      request,
      "machines",
      null,
      false,
      async (client, op) =>
        (
          await client.query(
            `select * from equipment.machines where account_id=$1
      and ($2 or branch_id=any($3::uuid[]) or id=any($4::uuid[])) order by created_at desc,id limit 200`,
            [
              op.accountId,
              op.subject.accountWide,
              [...op.subject.branchIds],
              [...op.subject.machineIds],
            ],
          )
        ).rows,
    );
  }
  detail(
    request: SecurityRequest,
    id: string,
    section?:
      | "timeline"
      | "location-history"
      | "ownership-history"
      | "schedules"
      | "status"
      | "components"
      | "frequencies",
  ) {
    return this.db.run(request, `machine:${id}`, null, false, async (client, op) => {
      const machine = await one(
        client,
        section === "status"
          ? `select m.*,
        b.data->>'name' as "branchName",b.data->>'timezone' as timezone,
        t.data->>'name' as "modelName"
        from equipment.machines m join equipment.branches b on b.id=m.branch_id
        join equipment.technical_models t on t.id=m.model_id where m.id=$1`
          : "select * from equipment.machines where id=$1",
        [id],
      );
      scope(op, machine, "machine");
      if (section === "status") {
        // Only changes to the dimension itself establish its date. A label edit does not.
        // Events from former owners never disclose their reasons to the current account.
        const stamps = (
          await client.query<{ dimension: string; changed_at: Date | null; reason: string | null }>(
            `select d.dimension,e.occurred_at as changed_at,e.reason
          from (values ('operational'),('technical'),('sanitary'),('publication')) d(dimension)
          left join lateral (
            select occurred_at,reason from equipment.events
            where resource_id=$1 and account_id=$2
              and after_data->>(d.dimension || '_status') = $3::jsonb->>(d.dimension || '_status')
              and before_data->>(d.dimension || '_status') is distinct from after_data->>(d.dimension || '_status')
            order by occurred_at desc,id desc limit 1
          ) e on true`,
            [id, op.accountId, JSON.stringify(machine)],
          )
        ).rows;
        return {
          ...machine,
          conditionDates: Object.fromEntries(
            stamps.map((stamp) => [
              stamp.dimension,
              {
                changedAt: stamp.changed_at ? new Date(stamp.changed_at).toISOString() : null,
                reason: stamp.reason,
              },
            ]),
          ),
        };
      }
      if (section === "timeline")
        return (
          await client.query(
            `select event_type,reason,occurred_at from equipment.events
        where resource_id=$1 and event_type like 'MACHINE_%' order by occurred_at,id limit 200`,
            [id],
          )
        ).rows;
      if (section === "location-history" || section === "ownership-history")
        return (
          await client.query(
            `select p.kind,p.valid_from,p.valid_to,
        case when p.kind='ownership' and p.reference_id=$3 then p.reference_id
          when p.kind='location' and exists(select 1 from equipment.branches b where b.id=p.reference_id and b.account_id=$3) then p.reference_id
          else null end as reference_id
        from equipment.machine_periods p where machine_id=$1 and kind=$2 order by valid_from`,
            [id, section === "location-history" ? "location" : "ownership", op.accountId],
          )
        ).rows;
      if (section === "components") return listMachineComponents(client, op, id);
      if (section === "frequencies") return listMachineFrequencies(client, machine);
      if (section === "schedules")
        return (
          await client.query(
            "select * from equipment.scheduled_activities where machine_id=$1 order by due_at nulls last,id limit 500",
            [id],
          )
        ).rows;
      return machine;
    });
  }
  update(
    request: SecurityRequest,
    id: string,
    body: unknown,
    action: "metadata" | "moves" | "retire" | "operational-status" | "template",
  ) {
    const input =
      action === "metadata"
        ? machineMetadataSchema.parse(body)
        : action === "moves"
          ? moveInputSchema.parse(body)
          : action === "operational-status"
            ? operationalInputSchema.parse(body)
            : action === "template"
              ? assignTemplateSchema.parse(body)
              : transitionInputSchema.parse(body);
    return this.db.run(
      request,
      `machine:${id}:${action}`,
      input,
      true,
      async (client, op) => {
        const before = await one(
          client,
          "select * from equipment.machines where id=$1 for update",
          [id],
        );
        scope(op, before, "machine", action === "template");
        expected(before, versionHeader(request));
        if (before.operational_status === "retired")
          throw new ConflictException("Retired machines cannot be changed");
        let row: RecordRow;
        const time = (
          await client.query<{ time: string }>("select clock_timestamp()::text as time")
        ).rows[0]!.time;
        if (action === "moves") {
          const moving = moveInputSchema.parse(input);
          const target = await branch(client, op, moving.toBranchId);
          if (target.account_id !== before.account_id || target.id === before.branch_id)
            throw new ConflictException("Choose another branch in this account");
          await changePeriod(client, op, id, "location", target.id, moving.reason, time);
          row = await one(
            client,
            "update equipment.machines set branch_id=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *",
            [id, target.id],
          );
        } else if (action === "template") {
          const assignment = assignTemplateSchema.parse(input);
          const template = await one(
            client,
            "select * from equipment.template_versions where id=$1 and model_id=$2 and status='published' for share",
            [assignment.templateVersionId, before.model_id],
          );
          if (template.id === before.template_id)
            throw new ConflictException("Template is already assigned");
          await changePeriod(client, op, id, "template", template.id, assignment.reason, time);
          row = await one(
            client,
            "update equipment.machines set template_id=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *",
            [id, template.id],
          );
          await client.query(
            "insert into equipment.schedule_jobs(machine_id,template_id,effective_at) values($1,$2,$3)",
            [id, template.id, time],
          );
        } else if ("internalName" in input) {
          row = await one(
            client,
            "update equipment.machines set data=data || $2::jsonb,row_version=row_version+1,updated_at=now() where id=$1 returning *",
            [id, JSON.stringify(input)],
          );
        } else {
          row = await one(
            client,
            "update equipment.machines set operational_status=$2,row_version=row_version+1,updated_at=now() where id=$1 returning *",
            [id, "status" in input ? input.status : "retired"],
          );
          if (action === "retire") {
            await client.query(
              "update equipment.scheduled_activities set status='cancelled' where machine_id=$1 and status='pending'",
              [id],
            );
            await client.query(
              "update equipment.transfers set status='cancelled',row_version=row_version+1 where machine_id=$1 and status in ('pending','approved')",
              [id],
            );
          }
        }
        await audit(
          client,
          op,
          row,
          `MACHINE_${action.toUpperCase().replaceAll("-", "_")}`,
          "reason" in input ? input.reason : "Machine labels updated",
          before,
        );
        return row;
      },
      action === "template",
    );
  }
}
