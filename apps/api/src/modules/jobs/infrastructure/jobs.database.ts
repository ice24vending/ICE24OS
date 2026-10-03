import {
  asyncJobSchema,
  jobCursorSchema,
  jobDetailSchema,
  jobStatusSchema,
  queueOverviewSchema,
  type AsyncJob,
  type JobQuery,
  type JobStatus,
} from "@ice24/contracts";
import { BadRequestException, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import {
  JobNotFoundError,
  JobsPort,
  JobStateConflictError,
  type JobRetryCommand,
  type JobScope,
} from "../application/jobs.port.js";

const iso = (column: string) =>
  `to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
// Explicit projection: payloads and restricted error details never leave the database here.
const projection = `jsonb_build_object('id',id,'type',job_type,'status',status,'queue',queue_name,
  'accountId',account_id,'sourceType',source_type,'sourceId',source_id,'eventType',event_type,
  'attemptCount',attempt_count,'maxAttempts',max_attempts,'manualRetryCount',manual_retry_count,
  'nextAttemptAt',${iso("next_attempt_at")},'startedAt',${iso("started_at")},
  'finishedAt',${iso("finished_at")},'errorCode',error_code,'errorDetail',error_detail_user,
  'correlationId',correlation_id,'rowVersion',row_version,'createdAt',${iso("created_at")},
  'updatedAt',${iso("updated_at")})`;

export function jobsWhere(scope: JobScope, query: JobQuery) {
  const values: unknown[] = [];
  const clauses: string[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (scope.accountId !== null) clauses.push(`account_id=${bind(scope.accountId)}::uuid`);
  if (query.status) clauses.push(`status=${bind(query.status)}`);
  if (query.type) clauses.push(`job_type=${bind(query.type)}`);
  if (query.queue) clauses.push(`queue_name=${bind(query.queue)}`);
  if (query.accountId) clauses.push(`account_id=${bind(query.accountId)}::uuid`);
  if (query.from) clauses.push(`created_at>=${bind(query.from)}::timestamptz`);
  if (query.to) clauses.push(`created_at<=${bind(query.to)}::timestamptz`);
  if (query.cursor) {
    let cursor: unknown;
    try {
      cursor = JSON.parse(Buffer.from(query.cursor, "base64url").toString("utf8"));
    } catch {
      throw new BadRequestException("Invalid job cursor");
    }
    const decoded = jobCursorSchema.safeParse(cursor);
    if (!decoded.success) throw new BadRequestException("Invalid job cursor");
    clauses.push(
      `(created_at,id)<(${bind(decoded.data[0])}::timestamptz,${bind(decoded.data[1])}::uuid)`,
    );
  }
  return { values, where: clauses.length ? clauses.join(" and ") : "true" };
}

@Injectable()
export class JobsDatabase extends JobsPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }

  override async list(scope: JobScope, query: JobQuery) {
    const { values, where } = jobsWhere(scope, query);
    values.push(query.limit + 1);
    const result = await this.pool.query<{ value: unknown; cursor_time: string; id: string }>(
      `select ${projection} as value, id, ${iso("created_at")} as cursor_time
       from infra.async_jobs where ${where} order by created_at desc, id desc limit $${values.length}`,
      values,
    );
    const hasMore = result.rows.length > query.limit;
    const rows = result.rows.slice(0, query.limit);
    const last = rows.at(-1);
    return {
      items: rows.map((row) => asyncJobSchema.parse(row.value)),
      page: {
        hasMore,
        nextCursor:
          hasMore && last
            ? Buffer.from(JSON.stringify([last.cursor_time, last.id])).toString("base64url")
            : null,
      },
    };
  }

  override async detail(scope: JobScope, id: string) {
    const { values, where } = jobsWhere(scope, { limit: 1 });
    values.push(id);
    const job = await this.pool.query<{ value: unknown }>(
      `select ${projection} as value from infra.async_jobs where ${where} and id=$${values.length}::uuid`,
      values,
    );
    if (!job.rows[0]) return null;
    const transitions = await this.pool.query<{ value: unknown }>(
      `select jsonb_build_object('id',id,'fromStatus',from_status,'toStatus',to_status,'attempt',attempt,
        'errorCode',error_code,'actorType',actor_type,'actorUserId',actor_user_id,'reason',reason,
        'correlationId',correlation_id,'occurredAt',${iso("occurred_at")}) as value
       from infra.async_job_transitions where job_id=$1::uuid order by occurred_at, id`,
      [id],
    );
    return jobDetailSchema.parse({
      ...(job.rows[0].value as object),
      transitions: transitions.rows.map((row) => row.value),
    });
  }

  override async overview() {
    const [queues, counts, outbox] = await Promise.all([
      this.pool.query<{
        queue_name: string;
        dead_letter_queue: string;
        max_attempts: number;
        depth: string;
        oldest_seconds: string | null;
        dead_letters: string;
        oldest_dead_letter_seconds: string | null;
      }>("select * from infra.queue_overview()"),
      this.pool.query<{ status: JobStatus; total: string }>(
        "select status, count(*) as total from infra.async_jobs group by status",
      ),
      this.pool.query<{ pending: string; failing: string; oldest_pending_seconds: string | null }>(
        "select pending, failing, oldest_pending_seconds from infra.outbox_status",
      ),
    ]);
    const age = (value: string | null) => (value === null ? null : Math.max(0, Number(value)));
    const jobs = Object.fromEntries(jobStatusSchema.options.map((status) => [status, 0]));
    for (const row of counts.rows) jobs[row.status] = Number(row.total);
    return queueOverviewSchema.parse({
      queues: queues.rows.map((row) => ({
        queue: row.queue_name,
        deadLetterQueue: row.dead_letter_queue,
        maxAttempts: row.max_attempts,
        depth: Number(row.depth),
        oldestSeconds: age(row.oldest_seconds),
        deadLetters: Number(row.dead_letters),
        oldestDeadLetterSeconds: age(row.oldest_dead_letter_seconds),
      })),
      jobs,
      outbox: {
        pending: Number(outbox.rows[0]?.pending ?? 0),
        failing: Number(outbox.rows[0]?.failing ?? 0),
        oldestPendingSeconds: age(outbox.rows[0]?.oldest_pending_seconds ?? null),
      },
    });
  }

  override async retry(command: JobRetryCommand): Promise<AsyncJob> {
    try {
      const result = await this.pool.query<{ id: string }>(
        "select id from infra.retry_dead_letter_job($1,$2,$3,$4,$5,$6)",
        [
          command.jobId,
          command.actorUserId,
          command.contextSessionId,
          command.reason,
          command.idempotencyKey,
          command.correlationId,
        ],
      );
      const job = await this.detail({ accountId: null }, result.rows[0]!.id);
      if (!job) throw new JobNotFoundError();
      return asyncJobSchema.parse(job); // drops the transition list (non-strict schema)
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "IC404") throw new JobNotFoundError();
      if (code === "IC409") throw new JobStateConflictError();
      if (code === "22023") throw new BadRequestException("Invalid retry request");
      throw error;
    }
  }
}
