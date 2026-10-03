import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { appendOutboxEvent } from "../../packages/database/src/outbox/index.js";

// Publication needs PGMQ and is covered by supabase/tests/database/phase5_outbox_test.sql.
describe("F5-05 transactional outbox", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  const oldUrl = process.env.DATABASE_URL;
  const account = randomUUID();
  const event = (correlationId = randomUUID()) => ({
    type: "SyntheticEventRecorded",
    aggregateType: "Synthetic",
    aggregateId: randomUUID(),
    accountId: account,
    actor: { type: "SYSTEM" as const, userId: null },
    sensitivity: "internal" as const,
    correlationId,
    occurredAt: "2026-10-03T12:00:00.000000Z",
    payload: { status: "ACTIVE" },
  });
  const count = async (correlationId: string) =>
    Number(
      (
        await pool!.query<{ total: string }>(
          "select count(*) as total from infra.outbox_events where correlation_id=$1",
          [correlationId],
        )
      ).rows[0]!.total,
    );

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon; create role authenticated; create role service_role;");
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
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic','COMPANY')",
      [account],
    );
    process.env.DATABASE_URL = container.getConnectionUri();
  });
  afterAll(async () => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    await pool?.end();
    await container?.stop();
  });

  it("commits or discards the event together with the business change", async () => {
    const client = await pool!.connect();
    const committed = randomUUID(),
      discarded = randomUUID();
    try {
      await client.query("begin");
      await client.query("update identity.accounts set name='Renamed' where id=$1", [account]);
      await appendOutboxEvent(client, event(discarded));
      expect(await count(discarded)).toBe(0); // not visible before commit
      await client.query("rollback");
      await client.query("begin");
      await client.query("update identity.accounts set name='Renamed' where id=$1", [account]);
      await appendOutboxEvent(client, event(committed));
      await client.query("commit");
    } finally {
      client.release();
    }
    expect(await count(discarded)).toBe(0);
    expect(await count(committed)).toBe(1);
  });

  it("does not duplicate an event when the producer retries with the same id", async () => {
    const correlationId = randomUUID(),
      id = randomUUID();
    const client = await pool!.connect();
    try {
      await appendOutboxEvent(client, { ...event(correlationId), id });
      await expect(appendOutboxEvent(client, { ...event(correlationId), id })).resolves.toBe(id);
    } finally {
      client.release();
    }
    expect(await count(correlationId)).toBe(1);
  });

  it("captures existing domain producers in the same transaction with allow-listed payloads", async () => {
    const actor = randomUUID(),
      target = randomUUID(),
      actorMembership = randomUUID(),
      correlationId = randomUUID();
    await pool!.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,'outbox-actor','outbox-actor@example.test','Synthetic actor','ACTIVE'),($2::uuid,$2::text,'outbox-target','outbox-target@example.test','Synthetic target','ACTIVE')",
      [actor, target],
    );
    await pool!.query(
      "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
      [actorMembership, account, actor],
    );
    await pool!.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [actorMembership],
    );
    const identity = new IdentityStore();
    try {
      await identity.createMembership({
        actorUserId: actor,
        accountId: account,
        userId: target,
        roleCodes: ["AU"],
        branchIds: [],
        machineIds: [],
        correlationId,
      });
    } finally {
      await identity.onModuleDestroy();
    }
    const rows = await pool!.query<{
      id: string;
      event_type: string;
      actor_user_id: string;
      sensitivity: string;
      payload: Record<string, unknown>;
    }>(
      "select o.id,o.event_type,o.actor_user_id,o.sensitivity,o.payload from infra.outbox_events o join audit.events a on a.id=o.id where o.correlation_id=$1",
      [correlationId],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({
      event_type: "MembershipChanged",
      actor_user_id: actor,
      sensitivity: "confidential",
    });
    expect(JSON.stringify(rows.rows[0]!.payload)).not.toContain("outbox-target@example.test");
  });

  it("keeps event facts immutable while publication bookkeeping advances once", async () => {
    const correlationId = randomUUID(),
      id = randomUUID();
    const client = await pool!.connect();
    try {
      await appendOutboxEvent(client, { ...event(correlationId), id });
    } finally {
      client.release();
    }
    await expect(
      pool!.query("update infra.outbox_events set payload='{}' where id=$1", [id]),
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      pool!.query("delete from infra.outbox_events where id=$1", [id]),
    ).rejects.toMatchObject({ code: "55000" });
    await pool!.query(
      "update infra.outbox_events set published_at=now(), attempt_count=1 where id=$1",
      [id],
    );
    await expect(
      pool!.query("update infra.outbox_events set published_at=null where id=$1", [id]),
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      pool!.query("update infra.outbox_events set attempt_count=0 where id=$1", [id]),
    ).rejects.toMatchObject({ code: "55000" });
  });

  it("grants the runtime role only insert/select and denies browsers", async () => {
    const result = await pool!.query<{ allowed: boolean }>(`select
      has_table_privilege('service_role','infra.outbox_events','UPDATE') or
      has_table_privilege('service_role','infra.outbox_events','DELETE') or
      has_table_privilege('authenticated','infra.outbox_events','SELECT') or
      has_table_privilege('anon','infra.outbox_events','INSERT') as allowed`);
    expect(result.rows[0]!.allowed).toBe(false);
    expect(
      (
        await pool!.query<{ ok: boolean }>(
          "select has_table_privilege('service_role','infra.outbox_events','INSERT') as ok",
        )
      ).rows[0]!.ok,
    ).toBe(true);
  });
});
