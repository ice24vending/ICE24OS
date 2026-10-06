import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { reportPeriodClosedPayloadSchema } from "@ice24/contracts";
import { JobsDatabase } from "../../apps/api/src/modules/jobs/infrastructure/jobs.database.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { domainEventConsumers } from "../../apps/worker/src/consumers/index.js";
import {
  processScheduledTasks,
  runSchedulerTick,
  type ScheduledTask,
} from "../../apps/worker/src/processors/scheduler/engine.js";
import { expirationsTask } from "../../apps/worker/src/processors/scheduler/expirations.js";
import {
  FakeSubscriptionObservationSource,
  reconciliationTask,
} from "../../apps/worker/src/processors/scheduler/reconciliation.js";
import { reportPeriodTasks } from "../../apps/worker/src/processors/scheduler/reports.js";

const MIGRATIONS = [
  "20260829000100_phase3_identity.sql",
  "20260914000100_phase3_recovery_execution.sql",
  "20260917000100_phase4_equipment.sql",
  "20260924000100_phase5_subscriptions.sql",
  "20260929000100_phase5_checkout_intents.sql",
  "20260929000200_phase5_stripe_webhooks.sql",
  "20261002000100_phase5_audit.sql",
  "20261002000200_phase5_audit_producers.sql",
  "20261003000100_phase5_outbox.sql",
  "20261003000200_phase5_outbox_publisher.sql",
  "20261003000300_phase5_consumers.sql",
  "20261003000400_phase5_jobs.sql",
  "20261003000500_phase5_files.sql",
  "20261003000600_phase5_file_scans.sql",
  "20261003000700_phase5_downloads.sql",
  "20261003000800_phase5_notifications.sql",
  "20261003000900_phase5_email.sql",
  "20261005000100_phase5_scheduler.sql",
];

// F5-13 path: registry tick → infra.scheduler_enqueue (window + SCHEDULED_TASK job + queue
// message) → processScheduledTasks (lease, handler, result) → subscriptions / outbox / findings,
// with failures visible and re-queueable in the F5-07 Job Center.
describe("F5-13 scheduler: idempotent, exclusive and observable windows", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let jobs: JobsDatabase | undefined;
  const oldUrl = process.env.DATABASE_URL;
  const owner = randomUUID(),
    support = randomUUID();
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const db = () => pool!;
  const releaseQueue = () => db().query("update pgmq.q_scheduled_tasks set vt=clock_timestamp()");
  const window = async (id: string) =>
    (
      await db().query<{
        status: string;
        attempt_count: number;
        recovered_count: number;
        lease_owner: string | null;
        error_code: string | null;
        result: Record<string, number> | null;
        job_id: string;
      }>("select * from infra.scheduler_windows where id=$1", [id])
    ).rows[0]!;
  const windowsOf = async (task: string) =>
    (
      await db().query<{ id: string; job_id: string; window_key: string }>(
        "select id, job_id, window_key from infra.scheduler_windows where task_name=$1 order by window_end",
        [task],
      )
    ).rows;
  const enqueue = (task: ScheduledTask, end: Date, size = 300_000) =>
    db().query("select infra.scheduler_enqueue($1,$2,$3,$4,$5) as outcome", [
      task.name,
      end.toISOString(),
      new Date(end.getTime() - size),
      end,
      task.timeZone,
    ]);
  const duplicateMessage = (windowId: string) =>
    db().query(
      `select pgmq.send('scheduled_tasks', message) from (
         select message from pgmq.q_scheduled_tasks union all select message from pgmq.a_scheduled_tasks
       ) copies where message->>'windowId'=$1 limit 1`,
      [windowId],
    );
  const subscriptionCount = 6;
  const seedSubscription = async (fields: {
    status: string;
    demo?: boolean;
    demoExpiresAt?: string;
    periodEnd?: string;
    providerId?: string;
  }) => {
    const id = randomUUID(),
      account = randomUUID();
    await db().query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic','COMPANY')",
      [account],
    );
    const provider = fields.providerId ?? (fields.demo ? null : `sub_${id.slice(0, 8)}`);
    await db().query(
      `insert into subscriptions.records(id,account_id,provider_customer_id,provider_subscription_id,status,
         current_period_start,current_period_end,cancel_at_period_end,is_demo,demo_expires_at,created_by,updated_by)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)`,
      [
        id,
        account,
        provider ? `cus_${id.slice(0, 8)}` : null,
        provider,
        fields.status,
        fields.periodEnd ? new Date(Date.parse(fields.periodEnd) - 30 * 86_400_000) : null,
        fields.periodEnd ?? null,
        fields.status === "cancellation_scheduled",
        fields.demo === true,
        fields.demoExpiresAt ?? null,
        owner,
      ],
    );
    return { id, account, provider };
  };
  const subscription = async (id: string) =>
    (
      await db().query<{ status: string; row_version: number; account_id: string }>(
        "select status,row_version,account_id from subscriptions.records where id=$1",
        [id],
      )
    ).rows[0]!;
  const eventsOf = async (id: string) =>
    (
      await db().query<{ event_type: string; actor_type: string; actor_id: string | null }>(
        "select event_type,actor_type,actor_id from subscriptions.events where subscription_id=$1",
        [id],
      )
    ).rows;
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const ahead = (ms: number) => new Date(Date.now() + ms).toISOString();

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri(), max: 8 });
    await pool.query("create role anon; create role authenticated; create role service_role;");
    await pool.query(
      await readFile(new URL("./support/pgmq-emulation.sql", import.meta.url), "utf8"),
    );
    await pool.query(
      (await migration("20260825000100_phase2_platform.sql")).replace(
        /create extension if not exists (pgmq|pg_cron);/gu,
        "",
      ),
    );
    for (const file of MIGRATIONS) await pool.query(await migration(file));
    await pool.query(
      `insert into identity.users(id,identity_subject,username,email,display_name,status,time_zone) values
       ($1::uuid,$1::text,'sched-owner','sched-owner@example.test','Dueña sintética','ACTIVE','America/Mexico_City'),
       ($2::uuid,$2::text,'sched-support','sched-support@example.test','Soporte sintético','ACTIVE','UTC')`,
      [owner, support],
    );
    process.env.DATABASE_URL = container.getConnectionUri();
    jobs = new JobsDatabase();
  });

  afterAll(async () => {
    await jobs?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    process.env.DATABASE_URL = oldUrl;
  });

  it("two workers ticking at once create a window once; two consumers run it once", async () => {
    let runs = 0;
    const slow: ScheduledTask = {
      name: "test.concurrency",
      schedule: { kind: "interval", everySeconds: 300 },
      timeZone: "UTC",
      catchUpWindows: 1,
      async handle() {
        runs += 1;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { runs };
      },
    };
    const now = new Date();
    const ticks = await Promise.all([
      runSchedulerTick(db(), [slow], { now }),
      runSchedulerTick(db(), [slow], { now }),
    ]);
    expect(ticks.map((t) => t.enqueued).sort()).toEqual([0, 1]);
    const [created] = await windowsOf(slow.name);
    expect(await windowsOf(slow.name)).toHaveLength(1);
    expect(
      (
        await db().query(
          "select 1 from infra.async_jobs where job_type='SCHEDULED_TASK' and source_id=$1",
          [created!.id],
        )
      ).rowCount,
    ).toBe(1);
    // A second copy of the message (as after a manual re-queue racing a slow worker).
    await duplicateMessage(created!.id);
    const [first, second] = await Promise.all([
      processScheduledTasks(db(), [slow], { owner: randomUUID(), batchSize: 1 }),
      processScheduledTasks(db(), [slow], { owner: randomUUID(), batchSize: 1 }),
    ]);
    expect(runs).toBe(1);
    expect(first!.succeeded + second!.succeeded).toBe(1);
    expect(first!.busy + second!.busy).toBe(1);
    // The leftover copy reappears later and is acknowledged without running again.
    await releaseQueue();
    const later = await processScheduledTasks(db(), [slow], { owner: randomUUID() });
    expect(later).toMatchObject({ received: 1, duplicates: 1, succeeded: 0 });
    expect(runs).toBe(1);
    expect((await window(created!.id)).status).toBe("SUCCEEDED");
    expect((await db().query("select 1 from pgmq.q_scheduled_tasks")).rowCount).toBe(0);
  });

  it("materializes due expirations once, validating the previous state", async () => {
    const demoExpired = await seedSubscription({
      status: "demo",
      demo: true,
      demoExpiresAt: ago(60_000),
    });
    const demoValid = await seedSubscription({
      status: "demo",
      demo: true,
      demoExpiresAt: ahead(86_400_000),
    });
    const cancelEnded = await seedSubscription({
      status: "cancellation_scheduled",
      periodEnd: ago(60_000),
    });
    const cancelOpen = await seedSubscription({
      status: "cancellation_scheduled",
      periodEnd: ahead(86_400_000),
    });
    const active = await seedSubscription({ status: "active", periodEnd: ago(60_000) });
    const failed = await seedSubscription({
      status: "payment_failed",
      periodEnd: ahead(86_400_000),
    });
    expect([demoExpired, demoValid, cancelEnded, cancelOpen, active, failed]).toHaveLength(
      subscriptionCount,
    );
    const task = expirationsTask();
    const tick = await runSchedulerTick(db(), [task]);
    expect(tick.enqueued).toBe(1);
    const summary = await processScheduledTasks(db(), [task], { owner: randomUUID() });
    expect(summary.succeeded).toBe(1);
    const [run] = await windowsOf(task.name);
    expect((await window(run!.id)).result).toEqual({ demosExpired: 1, cancellationsCompleted: 1 });

    expect((await subscription(demoExpired.id)).status).toBe("read_only");
    expect((await subscription(cancelEnded.id)).status).toBe("cancelled");
    // Not due or not eligible: untouched (an active subscription is never cancelled here).
    for (const [record, status] of [
      [demoValid, "demo"],
      [cancelOpen, "cancellation_scheduled"],
      [active, "active"],
      [failed, "payment_failed"],
    ] as const) {
      expect((await subscription(record.id)).status).toBe(status);
      expect(await eventsOf(record.id)).toEqual([]);
    }
    expect(await eventsOf(demoExpired.id)).toEqual([
      { event_type: "DEMO_EXPIRED", actor_type: "SYSTEM", actor_id: null },
    ]);
    expect(await eventsOf(cancelEnded.id)).toEqual([
      { event_type: "SUBSCRIPTION_CANCELLED", actor_type: "SYSTEM", actor_id: null },
    ]);
    const accessModes = await db().query<{ access_mode: string }>(
      "select access_mode from identity.accounts where id = any($1) order by access_mode",
      [[demoExpired.account, cancelEnded.account]],
    );
    expect(accessModes.rows.map((r) => r.access_mode)).toEqual(["READ_ONLY", "READ_ONLY"]);
    const audit = await db().query<{
      operation: string;
      actor_type: string;
      origin: string;
      correlation_id: string;
    }>(
      "select operation,actor_type,origin,correlation_id from audit.events where entity_id=any($1) order by operation",
      [[demoExpired.id, cancelEnded.id]],
    );
    expect(audit.rows.map((r) => [r.operation, r.actor_type, r.origin])).toEqual([
      ["DEMO_EXPIRED", "SYSTEM", "WORKER"],
      ["SUBSCRIPTION_CANCELLED", "SYSTEM", "WORKER"],
    ]);
    const outbox = await db().query<{
      event_type: string;
      actor_type: string;
      correlation_id: string;
    }>(
      "select event_type,actor_type,correlation_id from infra.outbox_events where aggregate_id=any($1) order by event_type",
      [[demoExpired.id, cancelEnded.id]],
    );
    expect(outbox.rows.map((r) => [r.event_type, r.actor_type])).toEqual([
      ["DemoExpired", "SYSTEM"],
      ["SubscriptionCancelled", "SYSTEM"],
    ]);
    const correlation = (
      await db().query<{ correlation_id: string }>(
        "select correlation_id from infra.scheduler_windows where id=$1",
        [run!.id],
      )
    ).rows[0]!.correlation_id;
    expect(new Set([...audit.rows, ...outbox.rows].map((r) => r.correlation_id))).toEqual(
      new Set([correlation]),
    );

    // Retry of the same window (duplicate delivery) and a later window repeat no effect.
    await duplicateMessage(run!.id);
    expect(await processScheduledTasks(db(), [task], { owner: randomUUID() })).toMatchObject({
      duplicates: 1,
    });
    await enqueue(task, new Date(Math.floor(Date.now() / 300_000) * 300_000 - 300_000));
    expect(await processScheduledTasks(db(), [task], { owner: randomUUID() })).toMatchObject({
      succeeded: 1,
    });
    const versions = await subscription(demoExpired.id);
    expect(versions.row_version).toBe(2);
    expect(await eventsOf(demoExpired.id)).toHaveLength(1);
    expect(await eventsOf(cancelEnded.id)).toHaveLength(1);
  });

  it("resumes a window after a worker crashes mid-run without repeating effects", async () => {
    const demos = await Promise.all(
      [1, 2, 3].map(() =>
        seedSubscription({ status: "demo", demo: true, demoExpiresAt: ago(120_000) }),
      ),
    );
    const task = expirationsTask({ batchSize: 1 });
    const end = new Date(Math.floor(Date.now() / 300_000) * 300_000 - 900_000);
    expect((await enqueue(task, end)).rows[0]!.outcome).toBe("ENQUEUED");
    const crashed = randomUUID();
    // Worker A reads the message, takes the lease and commits one transition, then dies.
    const delivery = (
      await db().query<{
        msg_id: string;
        read_ct: number;
        message: { jobId: string; windowId: string; correlationId: string };
      }>("select * from infra.read_queue('scheduled_tasks',300,1)")
    ).rows[0]!;
    const started = await db().query<{ action: string }>(
      "select * from infra.scheduler_run_start($1,$2,'scheduled_tasks',$3,$4,$5,300)",
      [
        delivery.message.jobId,
        delivery.message.windowId,
        delivery.msg_id,
        delivery.read_ct,
        crashed,
      ],
    );
    expect(started.rows[0]!.action).toBe("RUN");
    await db().query("select * from subscriptions.expire_due(1,$1)", [
      delivery.message.correlationId,
    ]);
    // While A's lease is valid, nobody else runs the window.
    await releaseQueue();
    expect(await processScheduledTasks(db(), [task], { owner: randomUUID() })).toMatchObject({
      busy: 1,
    });
    // Time passes: A's lease and the message visibility expire.
    await db().query(
      "update infra.scheduler_windows set lease_expires_at=now()-interval '1 second' where id=$1",
      [delivery.message.windowId],
    );
    await releaseQueue();
    const resumed = await processScheduledTasks(db(), [task], { owner: randomUUID() });
    expect(resumed).toMatchObject({ succeeded: 1 });
    const record = await window(delivery.message.windowId);
    expect(record).toMatchObject({ status: "SUCCEEDED", recovered_count: 1, lease_owner: null });
    expect(record.result).toEqual({ demosExpired: 2, cancellationsCompleted: 0 });
    for (const demo of demos) {
      expect((await subscription(demo.id)).status).toBe("read_only");
      expect(await eventsOf(demo.id)).toHaveLength(1);
    }
    const transitions = await db().query<{ to_status: string; error_code: string | null }>(
      "select to_status,error_code from infra.async_job_transitions where job_id=$1 order by occurred_at,id",
      [record.job_id],
    );
    expect(transitions.rows).toContainEqual({ to_status: "RUNNING", error_code: "LEASE_EXPIRED" });
    // The crashed worker can no longer extend or finish the window.
    const renew = await db().query<{ renewed: boolean }>(
      "select infra.scheduler_renew_lease($1,$2,300,'scheduled_tasks',$3) as renewed",
      [delivery.message.windowId, crashed, delivery.msg_id],
    );
    expect(renew.rows[0]!.renewed).toBe(false);
  });

  it("records Stripe discrepancies without correcting; failures are visible and re-queued from the Job Center", async () => {
    const consistent = await seedSubscription({
      status: "active",
      periodEnd: ahead(10 * 86_400_000),
    });
    const diverged = await seedSubscription({
      status: "payment_failed",
      periodEnd: ahead(10 * 86_400_000),
    });
    const missing = await seedSubscription({ status: "active", periodEnd: ahead(10 * 86_400_000) });
    const source = new FakeSubscriptionObservationSource();
    for (const record of [consistent, diverged])
      source.set({
        accountId: record.account,
        providerCustomerId: `cus_${record.id.slice(0, 8)}`,
        providerSubscriptionId: record.provider!,
        providerStatus: "active",
        amountMinor: 39900,
        currency: "mxn",
        currentPeriodStart: null,
        currentPeriodEnd: (
          await db().query<{ end: Date }>(
            "select current_period_end as end from subscriptions.records where id=$1",
            [record.id],
          )
        ).rows[0]!.end.toISOString(),
        cancelAtPeriodEnd: false,
      });
    const task = reconciliationTask(source, { batchSize: 2 });
    const before = await Promise.all(
      [consistent, diverged, missing].map((r) => subscription(r.id)),
    );
    source.failNext(1_000);
    const tick = await runSchedulerTick(db(), [task]);
    expect(tick.enqueued).toBe(1);
    const [run] = await windowsOf(task.name);
    for (let attempt = 1; attempt <= 5; attempt++) {
      await releaseQueue();
      const summary = await processScheduledTasks(db(), [task], { owner: randomUUID() });
      expect(summary.received).toBe(1);
    }
    expect(await window(run!.id)).toMatchObject({
      status: "FAILED",
      error_code: "STRIPE_UNAVAILABLE",
      attempt_count: 5,
    });
    expect((await db().query("select 1 from pgmq.q_scheduled_tasks_dlq")).rowCount).toBe(1);

    // Job Center (F5-07): the failure is listed with its code and can be re-queued (INT-004).
    const page = await jobs!.list(
      { accountId: null },
      { limit: 20, type: "SCHEDULED_TASK", status: "DEAD_LETTER" },
    );
    const failedJob = page.items.find((job) => job.sourceId === run!.id);
    expect(failedJob).toMatchObject({
      status: "DEAD_LETTER",
      errorCode: "STRIPE_UNAVAILABLE",
      eventType: task.name,
      queue: "scheduled_tasks",
      attemptCount: 5,
    });
    const detail = await jobs!.detail({ accountId: null }, failedJob!.id);
    expect(detail?.transitions.filter((t) => t.toStatus === "RETRY_WAIT")).toHaveLength(4);
    source.failNext(0);
    const retried = await jobs!.retry({
      jobId: failedJob!.id,
      actorUserId: support,
      contextSessionId: null,
      reason: "Stripe test sandbox restored; re-run reconciliation",
      idempotencyKey: "retry-reconciliation-0001",
      correlationId: randomUUID(),
    });
    expect(retried.status).toBe("QUEUED");
    expect(await processScheduledTasks(db(), [task], { owner: randomUUID() })).toMatchObject({
      succeeded: 1,
    });
    expect(await window(run!.id)).toMatchObject({ status: "SUCCEEDED" });
    // Paid subscriptions seeded by earlier tests are checked too (all unknown to the fake).
    const paid = Number(
      (
        await db().query<{ count: string }>(
          "select count(*) from subscriptions.records where not is_demo and provider_subscription_id is not null",
        )
      ).rows[0]!.count,
    );
    expect((await window(run!.id)).result).toMatchObject({
      checked: paid,
      consistent: 1,
      discrepant: paid - 1,
    });
    const findings = await db().query<{ subscription_id: string; kind: string; source: string }>(
      `select subscription_id,kind,source from subscriptions.reconciliation_findings
       where window_id=$1 and subscription_id=any($2) order by kind`,
      [run!.id, [consistent.id, diverged.id, missing.id]],
    );
    expect(findings.rows).toEqual([
      { subscription_id: missing.id, kind: "REMOTE_NOT_FOUND", source: "fake-stripe" },
      { subscription_id: diverged.id, kind: "STATUS_MISMATCH", source: "fake-stripe" },
    ]);
    // Nothing was corrected: same status and version, no subscription events.
    const after = await Promise.all([consistent, diverged, missing].map((r) => subscription(r.id)));
    expect(after).toEqual(before);
    for (const record of [consistent, diverged, missing])
      expect(await eventsOf(record.id)).toEqual([]);
    const audit = await db().query(
      "select 1 from audit.events where operation='JobRetryRequested' and entity_id=$1",
      [failedJob!.id],
    );
    expect(audit.rowCount).toBe(1);
  });

  it("closes report periods through the outbox once, without sending email", async () => {
    const [weekly] = reportPeriodTasks();
    const tick = await runSchedulerTick(db(), [weekly!]);
    expect(tick.enqueued).toBe(1);
    const [run] = await windowsOf(weekly!.name);
    expect(await processScheduledTasks(db(), [weekly!], { owner: randomUUID() })).toMatchObject({
      succeeded: 1,
    });
    await duplicateMessage(run!.id);
    expect(await processScheduledTasks(db(), [weekly!], { owner: randomUUID() })).toMatchObject({
      duplicates: 1,
    });
    const events = await db().query<{
      id: string;
      event_type: string;
      account_id: string | null;
      payload: unknown;
    }>(
      "select id,event_type,account_id,payload from infra.outbox_events where event_type='ReportPeriodClosed'",
    );
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]).toMatchObject({ id: run!.id, account_id: null });
    const payload = reportPeriodClosedPayloadSchema.parse(events.rows[0]!.payload);
    expect(payload).toMatchObject({
      frequency: "WEEKLY",
      timeZone: "America/Mexico_City",
      periodEnd: run!.window_key,
    });
    // Monday 00:00 in Mexico City is 06:00 UTC.
    expect(payload.periodEnd).toMatch(/T06:00:00\.000Z$/u);
    // Delivery is decoupled: the event reaches domain_events and no consumer sends email yet.
    await db().query("select * from infra.publish_outbox(500)");
    for (let i = 0; i < 5; i++) {
      const result = await processDomainEvents(db(), domainEventConsumers, { batchSize: 100 });
      if (result.received === 0) break;
    }
    expect((await db().query("select 1 from email.messages")).rowCount).toBe(0);
  });

  it("pauses and resumes a task with an auditable reason", async () => {
    const monthly = reportPeriodTasks()[1]!;
    await db().query("select infra.scheduler_set_paused($1,true,$2,$3)", [
      monthly.name,
      "Report consumers under maintenance window",
      "OPS-1234",
    ]);
    expect(await runSchedulerTick(db(), [monthly])).toMatchObject({ paused: 1, enqueued: 0 });
    expect(await windowsOf(monthly.name)).toEqual([]);
    await expect(
      db().query("select infra.scheduler_set_paused($1,false,'short','OPS-1234')", [monthly.name]),
    ).rejects.toMatchObject({ code: "22023" });
    await db().query("select infra.scheduler_set_paused($1,false,$2,$3)", [
      monthly.name,
      "Maintenance finished; resume monthly periods",
      "OPS-1234",
    ]);
    expect(await runSchedulerTick(db(), [monthly])).toMatchObject({ paused: 0, enqueued: 1 });
    const changes = await db().query<{ paused: boolean }>(
      "select paused from infra.scheduler_control_changes where task_name=$1 order by occurred_at",
      [monthly.name],
    );
    expect(changes.rows.map((r) => r.paused)).toEqual([true, false]);
    await expect(db().query("delete from infra.scheduler_control_changes")).rejects.toMatchObject({
      code: "55000",
    });
    await expect(db().query("delete from infra.scheduler_windows")).rejects.toMatchObject({
      code: "55000",
    });
  });
});
