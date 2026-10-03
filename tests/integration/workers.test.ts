import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ConsumerFailure,
  processDomainEvents,
  type DomainEventConsumer,
} from "../../apps/worker/src/processors/domain-events.js";

// Plain PostgreSQL + a minimal PGMQ emulation (support/pgmq-emulation.sql). Real PGMQ is
// covered by supabase/tests/database/phase5_consumers_test.sql in the supabase-migrations job.
describe("F5-06 domain event workers", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  const sql = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");

  /** Emits a real producer event: security event → outbox trigger → publisher → queue. */
  async function emit(eventType = "LOGIN_FAILED") {
    const correlationId = randomUUID();
    const inserted = await pool!.query<{ id: string }>(
      "insert into audit.security_events(event_type,result,correlation_id) values($1,'DENIED',$2) returning id",
      [eventType, correlationId],
    );
    await pool!.query("select * from infra.publish_outbox(500)");
    return inserted.rows[0]!.id;
  }
  const effects = async (eventId: string) =>
    Number(
      (
        await pool!.query<{ total: string }>(
          "select count(*) as total from test_effects where event_id=$1",
          [eventId],
        )
      ).rows[0]!.total,
    );
  /** Makes retried messages visible now instead of waiting for the real backoff. */
  const expireBackoff = () => pool!.query("update pgmq.q_domain_events set vt=clock_timestamp()");
  const recording = (name: string): DomainEventConsumer => ({
    name,
    eventTypes: ["LoginFailed"],
    handle: async (event, tx) => {
      await tx.query("insert into test_effects(event_id,consumer) values($1,$2)", [
        event.eventId,
        name,
      ]);
    },
  });
  const drain = async (consumers: DomainEventConsumer[]) => {
    for (let i = 0; i < 10; i++) {
      const summary = await processDomainEvents(pool!, consumers, { batchSize: 100 });
      if (summary.received === 0) return;
    }
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri(), max: 6 });
    await pool.query("create role anon; create role authenticated; create role service_role;");
    await pool.query(
      await readFile(new URL("./support/pgmq-emulation.sql", import.meta.url), "utf8"),
    );
    await pool.query(
      (await sql("20260825000100_phase2_platform.sql")).replace(
        /create extension if not exists (pgmq|pg_cron);/gu,
        "",
      ),
    );
    for (const file of [
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
    ])
      await pool.query(await sql(file));
    await pool.query("create table test_effects(event_id uuid not null, consumer text not null)");
  });
  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("applies each effect exactly once even when the queue redelivers the event", async () => {
    const eventId = await emit();
    const original = await pool!.query<{ message: unknown }>(
      "select message from pgmq.q_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    // At-least-once delivery: the same event arrives in a second message.
    await pool!.query("select pgmq.send('domain_events',$1)", [original.rows[0]!.message]);
    await drain([recording("effect-recorder")]);
    expect(await effects(eventId)).toBe(1);
    const queued = await pool!.query(
      "select 1 from pgmq.q_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    expect(queued.rowCount).toBe(0);
  });

  it("does not repeat an effect when two workers process duplicates concurrently", async () => {
    const eventId = await emit();
    const message = (
      await pool!.query<{ message: unknown }>(
        "select message from pgmq.q_domain_events where message->>'eventId'=$1",
        [eventId],
      )
    ).rows[0]!.message;
    for (let i = 0; i < 4; i++)
      await pool!.query("select pgmq.send('domain_events',$1)", [message]);
    const slow: DomainEventConsumer = {
      ...recording("concurrent-recorder"),
      handle: async (event, tx) => {
        await tx.query("select pg_sleep(0.05)");
        await recording("concurrent-recorder").handle(event, tx);
      },
    };
    await Promise.all([
      processDomainEvents(pool!, [slow], { batchSize: 1 }),
      processDomainEvents(pool!, [slow], { batchSize: 1 }),
      processDomainEvents(pool!, [slow], { batchSize: 1 }),
    ]);
    await drain([slow]);
    expect(await effects(eventId)).toBe(1);
  });

  it("retries with backoff, keeps no partial effect and succeeds on a later attempt", async () => {
    const eventId = await emit();
    let calls = 0;
    const flaky: DomainEventConsumer = {
      ...recording("flaky-recorder"),
      handle: async (event, tx) => {
        await recording("flaky-recorder").handle(event, tx);
        calls += 1;
        if (calls === 1) throw new ConsumerFailure("PROVIDER_TIMEOUT");
      },
    };
    const first = await processDomainEvents(pool!, [flaky], { batchSize: 100 });
    expect(first.retried).toBeGreaterThanOrEqual(1);
    expect(await effects(eventId)).toBe(0); // rolled back with the failed attempt
    const invisible = await pool!.query<{ pending: boolean }>(
      "select vt > clock_timestamp() + interval '10 seconds' as pending from pgmq.q_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    expect(invisible.rows[0]!.pending).toBe(true); // backoff applied
    await expireBackoff();
    await drain([flaky]);
    expect(await effects(eventId)).toBe(1);
    const claim = await pool!.query<{ attempt: number }>(
      "select attempt from infra.processed_messages where consumer='flaky-recorder' and event_id=$1",
      [eventId],
    );
    expect(claim.rows[0]!.attempt).toBe(2);
  });

  it("moves a message to the DLQ after five failed attempts with its payload and code", async () => {
    const eventId = await emit();
    const broken: DomainEventConsumer = {
      ...recording("broken-recorder"),
      handle: async () => {
        throw new Error("customer@example.test must not be logged");
      },
    };
    let deadLettered = 0;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const summary = await processDomainEvents(pool!, [broken], { batchSize: 100 });
      deadLettered += summary.deadLettered;
      await expireBackoff();
    }
    expect(deadLettered).toBeGreaterThanOrEqual(1);
    const dlq = await pool!.query<{ message: { failureCode: string; attempt: number } }>(
      "select message from pgmq.q_domain_events_dlq where message->'payload'->>'eventId'=$1",
      [eventId],
    );
    expect(dlq.rows[0]!.message).toMatchObject({ failureCode: "HANDLER_FAILED", attempt: 5 });
    expect(JSON.stringify(dlq.rows[0]!.message)).not.toContain("customer@example.test");
    expect(
      (
        await pool!.query("select 1 from pgmq.q_domain_events where message->>'eventId'=$1", [
          eventId,
        ])
      ).rowCount,
    ).toBe(0);
    expect(await effects(eventId)).toBe(0);
  });

  it("retries only the consumer that failed when several subscribe to the event", async () => {
    const eventId = await emit();
    let failOnce = true;
    const second: DomainEventConsumer = {
      ...recording("second-recorder"),
      handle: async (event, tx) => {
        if (failOnce) {
          failOnce = false;
          throw new ConsumerFailure("DEPENDENCY_DOWN");
        }
        await recording("second-recorder").handle(event, tx);
      },
    };
    const consumers = [recording("first-recorder"), second];
    await processDomainEvents(pool!, consumers, { batchSize: 100 });
    await expireBackoff();
    await drain(consumers);
    const rows = await pool!.query<{ consumer: string; total: string }>(
      "select consumer, count(*) as total from test_effects where event_id=$1 group by consumer order by consumer",
      [eventId],
    );
    expect(rows.rows).toEqual([
      { consumer: "first-recorder", total: "1" },
      { consumer: "second-recorder", total: "1" },
    ]);
  });

  it("dead-letters invalid messages at once and acknowledges unsubscribed events", async () => {
    await pool!.query(`select pgmq.send('domain_events','{"eventId":"not-a-uuid"}')`);
    const unrelated = await emit("CONTEXT_REVOKED");
    await drain([recording("effect-recorder")]);
    const poison = await pool!.query<{ message: { failureCode: string } }>(
      "select message from pgmq.q_domain_events_dlq where message->'payload'->>'eventId'='not-a-uuid'",
    );
    expect(poison.rows[0]!.message.failureCode).toBe("INVALID_MESSAGE");
    expect(await effects(unrelated)).toBe(0);
    expect(
      (
        await pool!.query("select 1 from pgmq.q_domain_events where message->>'eventId'=$1", [
          unrelated,
        ])
      ).rowCount,
    ).toBe(0);
  });
});
