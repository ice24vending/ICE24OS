import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { OutboxMessage } from "@ice24/contracts";
import { createScheduleObserver, type LogRecordInput } from "@ice24/observability";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import {
  EquipmentDatabase,
  type RecordRow,
} from "../../apps/api/src/modules/equipment/equipment.database.js";
import { AccountsStore } from "../../apps/api/src/modules/equipment/accounts.store.js";
import { TemplatesStore } from "../../apps/api/src/modules/equipment/templates.store.js";
import { RequestsStore } from "../../apps/api/src/modules/equipment/requests.store.js";
import { MachinesStore } from "../../apps/api/src/modules/equipment/machines.store.js";
import { AccountCatalogStore } from "../../apps/api/src/modules/equipment/account-catalog.store.js";
import { MachineComponentsStore } from "../../apps/api/src/modules/equipment/machine-components.store.js";
import { FrequencyOverridesStore } from "../../apps/api/src/modules/equipment/frequency-overrides.store.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { processScheduleBatch } from "../../apps/worker/src/processors/scheduling.js";
import { scheduleRecalcConsumer } from "../../apps/worker/src/processors/schedule-recalc.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

interface Pending {
  id: string;
  activity_code: string;
  component_catalog_id: string | null;
  status: string;
  due_at: Date | null;
  alert_at: Date | null;
  definition: {
    frequencyDays?: number;
    schedule: {
      frequency: { value: number; unit: string };
      source: string;
      factory: { value: number; unit: string };
      alertLead: { value: number; unit: string } | null;
      anchor: string;
    } | null;
  };
}

// Full F4-21 path: equipment change → outbox → publisher → domain_events → schedule-recalc
// consumer → schedule_jobs → calendar worker.
describe("TASK-F4-21 calendar recalculation", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let accounts: AccountsStore;
  let templates: TemplatesStore;
  let requests: RequestsStore;
  let machines: MachinesStore;
  let catalog: AccountCatalogStore;
  let components: MachineComponentsStore;
  let frequencies: FrequencyOverridesStore;
  const oldUrl = process.env.DATABASE_URL;
  const a = randomUUID(),
    platform = randomUUID();
  const actors = new Map<string, { user: string; context: string }>();
  const ids = {} as Record<"MFG" | "SYS" | "CMP1" | "UV", string>;
  let model: RecordRow, template: RecordRow, branchA: RecordRow;
  let m1: RecordRow, m2: RecordRow, m3: RecordRow;
  const logs: LogRecordInput[] = [];
  const observer = createScheduleObserver({
    service: "worker",
    environment: "test",
    log: (record) => logs.push(record),
  });
  const reason = { reason: "Integration test evidence", confirmation: true };
  const ack = { warrantyWarningAcknowledged: true };
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const activity = (code: string, triggerType: "time" | "usage", frequencyDays: number | null) => ({
    code,
    name: code,
    category: code === "CLEAN" ? "sanitation" : "maintenance",
    triggerType,
    frequencyDays,
    triggerDescription: triggerType === "time" ? "" : "Cada 10,000 litros",
    responsibleRole: "SA",
    checklist: [{ code: "CHECK", label: "Verificar", required: true }],
    fields: [],
    evidenceRules: { required: false, minimumFiles: 0 },
    escalationRules: { afterHours: 24, notifyRole: "OW" },
    criticality: "high",
  });
  const override = (
    activityCode: string,
    frequency: { value: number; unit: "days" | "weeks" | "months" },
    extra: Record<string, unknown> = {},
  ) => ({
    activityCode,
    componentCatalogId: null,
    frequency,
    alertLead: null,
    ...reason,
    ...ack,
    ...extra,
  });

  function req(name: string, version = 1, key = randomUUID()): SecurityRequest {
    const actor = actors.get(name)!;
    return {
      headers: {
        "x-ice24-context-id": actor.context,
        "idempotency-key": key,
        "if-match": String(version),
      },
      correlationId: randomUUID(),
      localUser: {
        id: actor.user,
        identitySubject: actor.user,
        username: name,
        email: `${name}@example.test`,
        displayName: name,
        locale: "es-MX",
        timeZone: "America/Mexico_City",
        status: "ACTIVE",
        version: 1,
      },
      identityClaims: {
        sub: actor.user,
        email: `${name}@example.test`,
        iss: "https://local.test",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aal: "aal2",
      },
    };
  }

  /** Publishes the outbox, consumes the events and runs every pending calendar job. */
  async function pump(): Promise<void> {
    await pool.query("select * from infra.publish_outbox(500)");
    for (;;) {
      const summary = await processDomainEvents(pool, [scheduleRecalcConsumer], { batchSize: 100 });
      if (summary.received === 0) break;
    }
    while ((await processScheduleBatch(pool, { observer })) > 0);
  }
  const pending = async (machineId: string) =>
    (
      await pool.query<Pending>(
        `select * from equipment.scheduled_activities where machine_id=$1 and status='pending'
        order by activity_code,component_catalog_id nulls first`,
        [machineId],
      )
    ).rows;
  const one = async (machineId: string, code: string, component: string | null = null) => {
    const rows = (await pending(machineId)).filter(
      (r) => r.activity_code === code && r.component_catalog_id === component,
    );
    expect(rows).toHaveLength(1);
    return rows[0]!;
  };
  const templateSince = async (machineId: string) =>
    (
      await pool.query<{ valid_from: Date }>(
        "select valid_from from equipment.machine_periods where machine_id=$1 and kind='template' and valid_to is null",
        [machineId],
      )
    ).rows[0]!.valid_from;
  const days = (from: Date, count: number) => new Date(from.getTime() + count * 86_400_000);
  /** Calendar of a machine without identifiers or absolute instants. */
  const shape = async (machineId: string) =>
    (await pending(machineId)).map((r) => ({
      code: r.activity_code,
      component: r.component_catalog_id,
      offset:
        r.due_at && r.definition.schedule
          ? r.due_at.getTime() - new Date(r.definition.schedule.anchor).getTime()
          : null,
      schedule: r.definition.schedule ? { ...r.definition.schedule, anchor: undefined } : null,
      frequencyDays: r.definition.frequencyDays,
    }));

  async function activate(serial: string): Promise<RecordRow> {
    const fileId = randomUUID();
    await pool.query(
      "insert into equipment.files(id,account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key,status,scan_reference) values($1,$2,$3,'test.pdf','application/pdf',10,'test',$4,'clean','fixture')",
      [fileId, a, actors.get("ownerA")!.user, `fixture-${fileId}`],
    );
    let draft = await requests.save(req("ownerA"), {
      branchId: branchA.id,
      manufacturerId: ids.MFG,
      modelName: "Synthetic",
      serialNumber: serial,
      capacity: 450,
      fileIds: [fileId],
    });
    draft = await requests.transition(req("ownerA", draft.row_version), draft.id, reason, "submit");
    return (
      await requests.transition(
        req("admin", draft.row_version),
        draft.id,
        {
          technicalModelId: model.id,
          templateVersionId: template.id,
          validationMethod: "documents",
          validatedFileIds: [fileId],
          reviewNotes: "Evidence checked by integration test",
          initialOperationalStatus: "off",
          confirmation: true,
        },
        "approve",
      )
    ).machine!;
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri(), max: 6 });
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
      "20261003000400_phase5_jobs.sql",
      "20261009000100_phase4_account_catalog.sql",
      "20261010000100_phase4_machine_components.sql",
      "20261011000100_phase4_frequency_overrides.sql",
      "20261012000100_phase4_schedule_recalc.sql",
    ])
      await pool.query(await migration(file));
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    accounts = new AccountsStore(db);
    templates = new TemplatesStore(db);
    requests = new RequestsStore(db);
    machines = new MachinesStore(db);
    catalog = new AccountCatalogStore(db);
    components = new MachineComponentsStore(db);
    frequencies = new FrequencyOverridesStore(db);
    for (const [id, name] of [
      [a, "A"],
      [platform, "ICE24"],
    ])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [id, name],
      );
    for (const [name, account, role] of [
      ["ownerA", a, "OW"],
      ["admin", platform, "IA"],
    ] as const) {
      const user = randomUUID(),
        membership = randomUUID(),
        context = randomUUID();
      actors.set(name, { user, context });
      await pool.query(
        "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,$2,$3,$2,'ACTIVE')",
        [user, name, `${name}@example.test`],
      );
      await pool.query(
        "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
        [membership, account, user],
      );
      await pool.query(
        "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
        [membership, role],
      );
      await pool.query(
        "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
        [membership],
      );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
        [context, user, account, membership],
      );
    }
    branchA = (await accounts.branches(req("ownerA"), {
      name: "QA branch",
      address: "Synthetic test address",
      latitude: 19.4,
      longitude: -99.1,
      timezone: "America/Mexico_City",
      schedule: "09:00–17:00",
      publicPhone: "",
      ownerPhonePublic: false,
      referenceTemperature: null,
    })) as RecordRow;
    for (const [key, kind] of [
      ["MFG", "manufacturer"],
      ["SYS", "system"],
      ["CMP1", "component"],
    ] as const)
      ids[key] = (
        (await templates.catalog(req("admin"), { code: key, name: key, kind })) as RecordRow
      ).id;
    ids.UV = (
      await catalog.create(req("ownerA"), {
        code: "UV",
        kind: "component",
        name: "UV propio",
        maintenanceActivity: {
          code: "UV-LAMP",
          name: "Cambio de lámpara UV",
          category: "maintenance",
          defaultFrequency: { value: 6, unit: "months" },
          checklist: [{ code: "LAMP", label: "Lámpara cambiada", required: true }],
          evidenceRules: { required: false, minimumFiles: 0 },
        },
      })
    ).id;
    model = (await templates.models(req("admin"), {
      code: "MODEL",
      name: "Test model",
      manufacturerId: ids.MFG,
      equipmentType: "water_vending",
      nominalCapacity: 450,
      characteristics: {},
    })) as RecordRow;
    template = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Initial test definition",
      systems: [ids.SYS],
      components: [ids.CMP1],
      activities: [
        activity("CLEAN", "time", 7),
        activity("FILTER", "time", 30),
        activity("METER", "usage", null),
      ],
    })) as RecordRow;
    template = await templates.template(
      req("admin", template.row_version),
      template.id,
      reason,
      "publish",
    );
    m1 = await activate("QA-021-1");
    m2 = await activate("QA-021-2");
    m3 = await activate("QA-021-3");
    await pump();
  });
  afterAll(async () => {
    await db?.onModuleDestroy();
    await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
  });

  it("generates the factory calendar with a frequency snapshot on activation", async () => {
    const since = await templateSince(m1.id);
    const rows = await pending(m1.id);
    expect(rows.map((r) => r.activity_code)).toEqual(["CLEAN", "FILTER", "METER"]);
    const clean = rows[0]!;
    expect(clean.due_at).toEqual(days(since, 7));
    expect(clean.alert_at).toBeNull();
    expect(clean.definition.schedule).toEqual({
      frequency: { value: 7, unit: "days" },
      source: "TEMPLATE",
      factory: { value: 7, unit: "days" },
      alertLead: null,
      alertSource: null,
      anchor: since.toISOString(),
    });
    expect(rows[2]).toMatchObject({ due_at: null, definition: { schedule: null } });
  });

  it("adds the activity of an activated client component only to that machine (RA-01-D3)", async () => {
    const before = (await pending(m2.id)).map((r) => r.id);
    const added = await components.add(req("ownerA"), m1.id, {
      componentCatalogId: ids.UV,
      ...reason,
    });
    await pump();
    const uv = await one(m1.id, "UV-LAMP", ids.UV);
    const activeSince = new Date(added.validFrom);
    const expected = new Date(activeSince);
    expected.setUTCMonth(expected.getUTCMonth() + 6);
    expect(uv.due_at).toEqual(expected);
    expect(uv.definition.schedule).toMatchObject({
      source: "TEMPLATE",
      factory: { value: 6, unit: "months" },
    });
    // Unchanged plan: the other activities of the machine keep their rows.
    expect((await pending(m1.id)).length).toBe(4);
    expect((await pending(m2.id)).map((r) => r.id)).toEqual(before);
  });

  it("enqueues one job per event and machine, so a repeated event never duplicates", async () => {
    const event = (
      await pool.query<{
        id: string;
        correlation_id: string;
        occurred_at: Date;
        aggregate_id: string;
      }>(
        "select * from infra.outbox_events where event_type='MachineComponentAdded' order by occurred_at desc limit 1",
      )
    ).rows[0]!;
    const message = {
      eventId: event.id,
      type: "MachineComponentAdded",
      aggregateId: event.aggregate_id,
      occurredAt: new Date(event.occurred_at).toISOString(),
      correlationId: event.correlation_id,
    } as OutboxMessage;
    for (let i = 0; i < 2; i++) {
      const tx = await pool.connect();
      try {
        await tx.query("begin");
        await scheduleRecalcConsumer.handle(message, tx);
        await tx.query("commit");
      } finally {
        tx.release();
      }
    }
    const jobs = (
      await pool.query(
        "select status,correlation_id from equipment.schedule_jobs where generation_key=$1",
        [`recalc:${event.id}:${m1.id}`],
      )
    ).rows;
    expect(jobs).toEqual([{ status: "completed", correlation_id: event.correlation_id }]);
    const ids1 = (await pending(m1.id)).map((r) => r.id);
    // A new job for the same state changes nothing.
    await pool.query(
      "insert into equipment.schedule_jobs(machine_id,template_id,kind,generation_key) values($1,$2,'recalc',$3)",
      [m1.id, template.id, `recalc:${randomUUID()}:${m1.id}`],
    );
    await pump();
    expect((await pending(m1.id)).map((r) => r.id)).toEqual(ids1);
    expect(logs.at(-1)).toMatchObject({
      module: "schedule",
      attributes: { event: "schedule_job_finished", jobOutcome: "unchanged", inserted: 0 },
    });
  });

  it("applies an account frequency and its alert lead to every machine of the account", async () => {
    const changed = await frequencies.set(
      req("ownerA"),
      "ACCOUNT",
      null,
      override("FILTER", { value: 2, unit: "weeks" }, { alertLead: { value: 3, unit: "days" } }),
      "create",
    );
    await pump();
    for (const machine of [m1, m2, m3]) {
      const since = await templateSince(machine.id);
      const filter = await one(machine.id, "FILTER");
      expect(filter.due_at).toEqual(days(since, 14));
      expect(filter.alert_at).toEqual(days(since, 11));
      expect(filter.definition.schedule).toMatchObject({
        source: "ACCOUNT",
        frequency: { value: 2, unit: "weeks" },
        factory: { value: 30, unit: "days" },
        alertLead: { value: 3, unit: "days" },
      });
      const cancelled = (
        await pool.query(
          "select count(*)::int as n from equipment.scheduled_activities where machine_id=$1 and activity_code='FILTER' and status='cancelled'",
          [machine.id],
        )
      ).rows[0].n;
      expect(cancelled).toBe(1);
    }
    const event = (
      await pool.query<{ id: string; correlation_id: string }>(
        "select id,correlation_id from infra.outbox_events where event_type='AccountFrequenciesChanged' order by occurred_at desc limit 1",
      )
    ).rows[0]!;
    expect(
      (
        await pool.query(
          "select count(*)::int as n from equipment.schedule_jobs where generation_key like $1",
          [`recalc:${event.id}:%`],
        )
      ).rows[0].n,
    ).toBe(3);
    // Logs carry the correlation of the change that caused the recalculation.
    expect(
      logs.filter(
        (l) => l.correlationId === event.correlation_id && l.attributes?.jobOutcome === "generated",
      ),
    ).toHaveLength(3);
    expect(changed.version).toBe(1);
  });

  it("never touches in-progress or completed activities and replans after the work done", async () => {
    const clean = await one(m1.id, "CLEAN");
    await pool.query("update equipment.scheduled_activities set status='in_progress' where id=$1", [
      clean.id,
    ]);
    const done = await one(m2.id, "CLEAN");
    await pool.query("update equipment.scheduled_activities set status='completed' where id=$1", [
      done.id,
    ]);
    await frequencies.set(
      req("ownerA"),
      "MACHINE",
      m1.id,
      override("CLEAN", { value: 3, unit: "days" }),
      "create",
    );
    await frequencies.set(
      req("ownerA"),
      "MACHINE",
      m2.id,
      override("CLEAN", { value: 3, unit: "days" }),
      "create",
    );
    await pump();
    for (const [machine, kept, status] of [
      [m1, clean, "in_progress"],
      [m2, done, "completed"],
    ] as const) {
      const row = (
        await pool.query<Pending>("select * from equipment.scheduled_activities where id=$1", [
          kept.id,
        ])
      ).rows[0]!;
      expect(row).toMatchObject({ status, due_at: kept.due_at, definition: kept.definition });
      const next = await one(machine.id, "CLEAN");
      expect(next.due_at).toEqual(days(kept.due_at!, 3));
      expect(next.definition.schedule).toMatchObject({
        source: "MACHINE",
        anchor: kept.due_at!.toISOString(),
      });
    }
  });

  it("cancels the future activities of a deactivated component", async () => {
    const uv = await one(m1.id, "UV-LAMP", ids.UV);
    await components.transition(req("ownerA", 1), m1.id, ids.UV, reason, "deactivate");
    await pump();
    expect((await pending(m1.id)).some((r) => r.activity_code === "UV-LAMP")).toBe(false);
    expect(
      (await pool.query("select status from equipment.scheduled_activities where id=$1", [uv.id]))
        .rows[0].status,
    ).toBe("cancelled");
  });

  it("returns to the factory calendar after restoring factory values", async () => {
    await frequencies.reset(req("ownerA"), "MACHINE", m1.id, reason);
    await frequencies.reset(req("ownerA"), "ACCOUNT", null, reason);
    await pump();
    const since = await templateSince(m3.id);
    for (const r of await pending(m3.id))
      if (r.definition.schedule) {
        expect(r.definition.schedule.source).toBe("TEMPLATE");
        expect(r.definition.schedule.frequency).toEqual(r.definition.schedule.factory);
        expect(r.alert_at).toBeNull();
      }
    expect((await one(m3.id, "FILTER")).due_at).toEqual(days(since, 30));
    expect((await one(m1.id, "FILTER")).definition.schedule?.source).toBe("TEMPLATE");
  });

  it("gives the same calendar whatever the order of a template change and a recalculation (F4-14)", async () => {
    // Same starting state on both machines: m2 still has the CLEAN frequency of a previous case.
    await frequencies.reset(req("ownerA"), "MACHINE", m2.id, reason);
    let next = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Second calendar definition",
      systems: [ids.SYS],
      components: [ids.CMP1],
      activities: [activity("CLEAN", "time", 10), activity("FILTER", "time", 30)],
    })) as RecordRow;
    next = await templates.template(req("admin", next.row_version), next.id, reason, "publish");
    for (const machine of [m2, m3]) {
      const current = (await machines.detail(req("ownerA"), machine.id)) as RecordRow;
      await machines.update(
        req("admin", current.row_version),
        machine.id,
        { ...reason, templateVersionId: next.id },
        "template",
      );
      await frequencies.set(
        req("ownerA"),
        "MACHINE",
        machine.id,
        override("FILTER", { value: 10, unit: "days" }),
        "create",
      );
    }
    await pool.query("select * from infra.publish_outbox(500)");
    while (
      (await processDomainEvents(pool, [scheduleRecalcConsumer], { batchSize: 100 })).received
    );
    // m2: template job first; m3: recalculation first.
    await pool.query(
      `update equipment.schedule_jobs set created_at=case when kind='template' then now()-interval '1 hour'
        else now() end where machine_id=$1 and status='pending'`,
      [m2.id],
    );
    await pool.query(
      `update equipment.schedule_jobs set created_at=case when kind='recalc' then now()-interval '1 hour'
        else now() end where machine_id=$1 and status='pending'`,
      [m3.id],
    );
    const order = (
      await pool.query<{ machine_id: string; kind: string }>(
        "select machine_id,kind from equipment.schedule_jobs where status='pending' and machine_id=any($1) order by created_at,id",
        [[m2.id, m3.id]],
      )
    ).rows;
    expect(order.filter((r) => r.machine_id === m2.id)[0]!.kind).toBe("template");
    expect(order.filter((r) => r.machine_id === m3.id)[0]!.kind).toBe("recalc");
    await pump();
    const left = await shape(m2.id);
    expect(left).toEqual(await shape(m3.id));
    expect(left.map((r) => [r.code, r.frequencyDays, r.schedule?.source])).toEqual([
      ["CLEAN", 10, "TEMPLATE"],
      ["FILTER", 30, "MACHINE"],
    ]);
  });

  it("retries a failing job and leaves it failed (calendar DLQ) after the last attempt", async () => {
    await pool.query(
      "update equipment.machine_periods set valid_to=clock_timestamp() where machine_id=$1 and kind='template' and valid_to is null",
      [m3.id],
    );
    const key = `recalc:${randomUUID()}:${m3.id}`;
    const correlation = randomUUID();
    await pool.query(
      "insert into equipment.schedule_jobs(machine_id,template_id,kind,generation_key,correlation_id) values($1,$2,'recalc',$3,$4)",
      [m3.id, template.id, key, correlation],
    );
    for (let i = 0; i < 5; i++) await processScheduleBatch(pool, { observer });
    expect(
      (
        await pool.query(
          "select status,attempts,last_error from equipment.schedule_jobs where generation_key=$1",
          [key],
        )
      ).rows[0],
    ).toEqual({ status: "failed", attempts: 5, last_error: "SCHEDULE_GENERATION_FAILED" });
    const failures = logs.filter((l) => l.correlationId === correlation);
    expect(failures.map((l) => l.attributes?.jobOutcome)).toEqual([
      "retried",
      "retried",
      "retried",
      "retried",
      "dead_lettered",
    ]);
    expect(failures.at(-1)).toMatchObject({
      level: "error",
      errorCode: "SCHEDULE_GENERATION_FAILED",
    });
  });
});
