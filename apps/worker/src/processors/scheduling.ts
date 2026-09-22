import type { Pool } from "pg";
import { templateInputSchema } from "@ice24/contracts";

/** Durable outbox consumer. The machine lock prevents an obsolete job replacing a newer schedule. */
export async function processScheduleBatch(pool: Pool): Promise<number> {
  const candidates = await pool.query<{ id: string; machine_id: string }>(
    "select id,machine_id from equipment.schedule_jobs where status='pending' order by created_at,id limit 20",
  );
  let completed = 0;
  for (const candidate of candidates.rows) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("set local statement_timeout='15s'");
      const machine = (
        await client.query<{ template_id: string; operational_status: string }>(
          "select template_id,operational_status from equipment.machines where id=$1 for update",
          [candidate.machine_id],
        )
      ).rows[0];
      const job = (
        await client.query<{ id: string; template_id: string; effective_at: Date }>(
          "select * from equipment.schedule_jobs where id=$1 and status='pending' for update skip locked",
          [candidate.id],
        )
      ).rows[0];
      if (!job) {
        await client.query("rollback");
        continue;
      }
      if (
        machine &&
        machine.operational_status !== "retired" &&
        machine.template_id === job.template_id
      ) {
        const row = (
          await client.query<{ definition: unknown }>(
            "select definition from equipment.template_versions where id=$1",
            [job.template_id],
          )
        ).rows[0];
        const template = templateInputSchema.parse(row?.definition);
        await client.query(
          `update equipment.scheduled_activities set status='cancelled'
          where machine_id=$1 and status='pending' and (due_at>$2 or due_at is null)`,
          [candidate.machine_id, job.effective_at],
        );
        for (const activity of template.activities) {
          const dueAt =
            activity.triggerType === "time" && activity.frequencyDays !== null
              ? new Date(job.effective_at.getTime() + activity.frequencyDays * 86_400_000)
              : null;
          await client.query(
            `insert into equipment.scheduled_activities(machine_id,template_id,activity_code,definition,due_at,generation_key)
            values($1,$2,$3,$4,$5,$6) on conflict(machine_id,generation_key,activity_code) do nothing`,
            [
              candidate.machine_id,
              job.template_id,
              activity.code,
              JSON.stringify(activity),
              dueAt,
              job.id,
            ],
          );
        }
      }
      await client.query(
        "update equipment.schedule_jobs set status='completed',attempts=attempts+1,last_error=null where id=$1",
        [candidate.id],
      );
      await client.query("commit");
      completed++;
    } catch {
      await client.query("rollback");
      await client.query(
        `update equipment.schedule_jobs set attempts=attempts+1,
        status=case when attempts>=4 then 'failed' else 'pending' end,last_error='SCHEDULE_GENERATION_FAILED'
        where id=$1 and status='pending'`,
        [candidate.id],
      );
    } finally {
      client.release();
    }
  }
  return completed;
}
