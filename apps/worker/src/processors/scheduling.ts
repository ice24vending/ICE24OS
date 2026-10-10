import type { Pool, PoolClient } from "pg";
import { templateInputSchema } from "@ice24/contracts";
import type { FrequencyDuration } from "@ice24/domain";
import type { ScheduleObserver } from "@ice24/observability";
import {
  diffSchedule,
  planActivities,
  planKey,
  type PendingActivity,
  type PlanComponentActivity,
  type PlanOverride,
} from "./scheduling-plan.js";

/** Attempts before a job is left `failed` (the calendar DLQ, see docs/runbooks/equipment.md). */
export const SCHEDULE_MAX_ATTEMPTS = 5;

interface JobRow {
  id: string;
  machine_id: string;
  template_id: string;
  kind: "template" | "recalc";
  attempts: number;
  correlation_id: string | null;
}
interface MachineRow {
  account_id: string;
  template_id: string;
  operational_status: string;
}
interface OverrideRow {
  scope: "ACCOUNT" | "MACHINE";
  activity_code: string;
  component_catalog_id: string | null;
  frequency_value: number;
  frequency_unit: FrequencyDuration["unit"];
  alert_lead_value: number | null;
  alert_lead_unit: FrequencyDuration["unit"] | null;
  valid_from: Date;
}
interface ActivityRow {
  id: string;
  activity_code: string;
  component_catalog_id: string | null;
  definition: unknown;
  due_at: Date | null;
  alert_at: Date | null;
  overdue: boolean;
}

export interface ScheduleBatchOptions {
  readonly observer?: ScheduleObserver;
}

/**
 * Durable calendar jobs: F4-13 generation and F4-14 template changes (`template`) and F4-21
 * recalculations after component or frequency changes (`recalc`). Every job rebuilds the plan
 * from the machine's current state under the machine lock, so the result is the same whatever
 * the order of the jobs, and an obsolete template job never replaces a newer template.
 */
export async function processScheduleBatch(
  pool: Pool,
  options: ScheduleBatchOptions = {},
): Promise<number> {
  const candidates = await pool.query<{ id: string }>(
    "select id from equipment.schedule_jobs where status='pending' order by created_at,id limit 20",
  );
  let completed = 0;
  for (const candidate of candidates.rows) {
    const started = Date.now();
    const client = await pool.connect();
    let job: JobRow | undefined;
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      const machineId = (
        await client.query<{ machine_id: string }>(
          "select machine_id from equipment.schedule_jobs where id=$1",
          [candidate.id],
        )
      ).rows[0]?.machine_id;
      const machine = (
        await client.query<MachineRow>(
          "select account_id,template_id,operational_status from equipment.machines where id=$1 for update",
          [machineId],
        )
      ).rows[0];
      job = (
        await client.query<JobRow>(
          "select * from equipment.schedule_jobs where id=$1 and status='pending' for update skip locked",
          [candidate.id],
        )
      ).rows[0];
      if (!job) {
        await client.query("rollback");
        continue;
      }
      const applies =
        machine !== undefined &&
        machine.operational_status !== "retired" &&
        (job.kind === "recalc" || machine.template_id === job.template_id);
      const changes = applies ? await regenerate(client, job, machine) : null;
      await client.query(
        "update equipment.schedule_jobs set status='completed',attempts=attempts+1,last_error=null where id=$1",
        [job.id],
      );
      await client.query("commit");
      completed++;
      options.observer?.jobFinished({
        kind: job.kind,
        outcome:
          changes === null
            ? "skipped"
            : changes.inserted + changes.cancelled === 0
              ? "unchanged"
              : "generated",
        durationMs: Date.now() - started,
        jobId: job.id,
        machineId: job.machine_id,
        attempt: job.attempts + 1,
        inserted: changes?.inserted ?? 0,
        cancelled: changes?.cancelled ?? 0,
        ...(job.correlation_id ? { correlationId: job.correlation_id } : {}),
      });
    } catch {
      await client.query("rollback");
      const failed = await client.query<{ status: string; attempts: number }>(
        `update equipment.schedule_jobs set attempts=attempts+1,
        status=case when attempts+1>=$2 then 'failed' else 'pending' end,last_error='SCHEDULE_GENERATION_FAILED'
        where id=$1 and status='pending' returning status,attempts`,
        [candidate.id, SCHEDULE_MAX_ATTEMPTS],
      );
      const row = failed.rows[0];
      if (job && row)
        options.observer?.jobFinished({
          kind: job.kind,
          outcome: row.status === "failed" ? "dead_lettered" : "retried",
          durationMs: Date.now() - started,
          jobId: job.id,
          machineId: job.machine_id,
          attempt: row.attempts,
          errorCode: "SCHEDULE_GENERATION_FAILED",
          ...(job.correlation_id ? { correlationId: job.correlation_id } : {}),
        });
    } finally {
      client.release();
    }
  }
  return completed;
}

/**
 * Plans the calendar from the current state and applies the difference to the future pending
 * activities. In-progress, completed, cancelled and overdue pending activities are never
 * touched (RF-TPL-007); historical definitions stay immutable.
 */
async function regenerate(
  client: PoolClient,
  job: JobRow,
  machine: MachineRow,
): Promise<{ inserted: number; cancelled: number }> {
  const templateSince = (
    await client.query<{ valid_from: Date }>(
      "select valid_from from equipment.machine_periods where machine_id=$1 and kind='template' and valid_to is null",
      [job.machine_id],
    )
  ).rows[0]?.valid_from;
  if (!templateSince) throw new Error("Machine without template period");
  const definition = (
    await client.query<{ definition: unknown }>(
      "select definition from equipment.template_versions where id=$1",
      [machine.template_id],
    )
  ).rows[0]?.definition;
  const template = templateInputSchema.parse(definition);
  // Client components active on the machine that declare an activity (F4-18, F4-19, RA-01-D3).
  const components = (
    await client.query<{ id: string; data: Record<string, unknown>; active_since: Date }>(
      `select e.id,e.data,c.valid_from as active_since from equipment.machine_component_configs c
      join equipment.catalog_entries e on e.id=c.component_catalog_id
      where c.machine_id=$1 and c.valid_to is null and c.status='active'
        and e.scope='ACCOUNT' and e.account_id=$2 and e.data ? 'maintenanceActivity'
      order by e.id`,
      [job.machine_id, machine.account_id],
    )
  ).rows.map((row): PlanComponentActivity => ({
    componentCatalogId: row.id,
    activeSince: new Date(row.active_since),
    activity: row.data.maintenanceActivity as PlanComponentActivity["activity"],
  }));
  const overrides = (
    await client.query<OverrideRow>(
      `select * from equipment.maintenance_frequency_overrides
      where account_id=$1 and valid_to is null and (scope='ACCOUNT' or machine_id=$2)`,
      [machine.account_id, job.machine_id],
    )
  ).rows.map((row): PlanOverride => ({
    scope: row.scope,
    activityCode: row.activity_code,
    componentCatalogId: row.component_catalog_id,
    frequency: { value: Number(row.frequency_value), unit: row.frequency_unit },
    alertLead:
      row.alert_lead_value === null || row.alert_lead_unit === null
        ? null
        : { value: Number(row.alert_lead_value), unit: row.alert_lead_unit },
    validFrom: new Date(row.valid_from),
    validTo: null,
  }));
  const lastDone = new Map(
    (
      await client.query<{ activity_code: string; component_catalog_id: string | null; due: Date }>(
        `select activity_code,component_catalog_id,max(due_at) as due from equipment.scheduled_activities
        where machine_id=$1 and status in ('in_progress','completed') and due_at is not null
        group by activity_code,component_catalog_id`,
        [job.machine_id],
      )
    ).rows.map((row) => [planKey(row.activity_code, row.component_catalog_id), new Date(row.due)]),
  );
  const now = (await client.query<{ now: Date }>("select clock_timestamp() as now")).rows[0]!.now;
  const pending = (
    await client.query<ActivityRow>(
      `select id,activity_code,component_catalog_id,definition,due_at,alert_at,
        (due_at is not null and due_at<=$2) as overdue
      from equipment.scheduled_activities where machine_id=$1 and status='pending' for update`,
      [job.machine_id, now],
    )
  ).rows;
  const toPending = (row: ActivityRow): PendingActivity => ({
    id: row.id,
    activityCode: row.activity_code,
    componentCatalogId: row.component_catalog_id,
    definition: row.definition,
    dueAt: row.due_at === null ? null : new Date(row.due_at),
    alertAt: row.alert_at === null ? null : new Date(row.alert_at),
  });
  // An overdue pending activity is past work still owed: it stays and blocks its key.
  const frozen = new Set(
    pending
      .filter((row) => row.overdue)
      .map((row) => planKey(row.activity_code, row.component_catalog_id)),
  );
  const planned = planActivities({
    templateSince: new Date(templateSince),
    templateActivities: template.activities,
    componentActivities: components,
    overrides,
    lastDone,
    at: new Date(now),
  });
  const { cancel, insert } = diffSchedule(
    planned,
    pending.filter((row) => !row.overdue).map(toPending),
    frozen,
  );
  if (cancel.length > 0)
    await client.query(
      "update equipment.scheduled_activities set status='cancelled' where id=any($1::uuid[]) and status='pending'",
      [cancel],
    );
  for (const activity of insert)
    await client.query(
      `insert into equipment.scheduled_activities
        (machine_id,template_id,activity_code,component_catalog_id,definition,due_at,alert_at,generation_key)
      values($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        job.machine_id,
        machine.template_id,
        activity.activityCode,
        activity.componentCatalogId,
        JSON.stringify(activity.definition),
        activity.dueAt,
        activity.alertAt,
        job.id,
      ],
    );
  return { inserted: insert.length, cancelled: cancel.length };
}
