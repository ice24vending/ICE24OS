import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { WorkOrdersStore } from "../../apps/api/src/modules/work-orders/infrastructure/work-orders.store.js";
import {
  demoOrderDefinition,
  demoExecutionDefinition,
} from "../../apps/private-web/src/server/demo/work-order-fixtures.js";
import { fieldCriterion } from "../e2e/maintenance-offline/criterion-flow.js";
import { TicketsStore } from "../../apps/api/src/modules/tickets/infrastructure/tickets.store.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("F7-03/04 work orders: snapshots, authorization, concurrency and audit", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let tickets: TicketsStore;
  let orders: WorkOrdersStore;
  const previous = process.env.DATABASE_URL;
  const a = randomUUID(),
    b = randomUUID(),
    branch = randomUUID(),
    otherBranch = randomUUID(),
    machine = randomUUID(),
    otherMachine = randomUUID(),
    system = randomUUID(),
    component = randomUUID();
  const actors = new Map<string, { user: string; context: string; membership: string }>();
  const input = {
    machineId: machine,
    systemId: system,
    componentId: component,
    priority: "high",
    description: "La máquina no produce hielo desde esta mañana.",
    evidenceIds: [],
  };
  function req(name = "owner", version = 1, key = randomUUID()): SecurityRequest {
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
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon; create role authenticated; create role service_role;");
    await pool.query(
      await readFile(new URL("./support/pgmq-emulation.sql", import.meta.url), "utf8"),
    );
    const migration = (name: string) =>
      readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), "utf8");
    await pool.query(
      (await migration("20260825000100_phase2_platform.sql")).replace(
        /create extension if not exists (pgmq|pg_cron);/gu,
        "",
      ),
    );
    for (const name of [
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
      "20261024000100_phase6_account_modules.sql",
      "20261009000100_phase4_account_catalog.sql",
      "20261010000100_phase4_machine_components.sql",
      "20261011000100_phase4_frequency_overrides.sql",
      "20261012000100_phase4_schedule_recalc.sql",
      "20261102000100_phase7_scheduling.sql",
      "20261102000200_phase7_tickets.sql",
      "20261103000100_phase7_work_orders.sql",
      "20261104000100_phase7_execution_reviews.sql",
      "20261106000100_phase7_offline_leases.sql",
      "20261108000100_phase7_sync_conflicts.sql",
    ])
      await pool.query(await migration(name));
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    tickets = new TicketsStore(identity);
    orders = new WorkOrdersStore(identity);
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [a, b],
    );
    await pool.query(
      "insert into equipment.branches(id,account_id,data) values($1,$3,'{}'),($2,$3,'{}')",
      [branch, otherBranch, a],
    );
    for (const [name, account, role, scope] of [
      ["owner", a, "OW", "ACCOUNT"],
      ["foreign", b, "OW", "ACCOUNT"],
      ["operator", a, "OP", "BRANCH"],
      ["technician", a, "TC", "MACHINE"],
      ["technician2", a, "TC", "ACCOUNT"],
      ["reader", a, "AU", "ACCOUNT"],
      ["ice24", a, "IO", "ACCOUNT"],
      ["platform", a, "IA", "ACCOUNT"],
    ] as const) {
      const user = randomUUID(),
        membership = randomUUID(),
        context = randomUUID();
      actors.set(name, { user, membership, context });
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
      if (scope !== "MACHINE")
        await pool.query(
          "insert into authz.user_scopes(membership_id,scope_type,branch_id,machine_id) values($1,$2,$3,$4)",
          [
            membership,
            scope,
            scope === "BRANCH" ? branch : null,
            scope === "MACHINE" ? machine : null,
          ],
        );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
        [context, user, account, membership],
      );
    }
    const manufacturer = randomUUID(),
      model = randomUUID(),
      template = randomUUID();
    await pool.query(
      "insert into equipment.catalog_entries(id,kind,code,data) values($1,'system','SYS','{\"name\":\"Refrigeración\"}'),($2,'component','CMP','{\"name\":\"Compresor\"}'),($3,'manufacturer','MFR','{}')",
      [system, component, manufacturer],
    );
    await pool.query(
      "insert into equipment.technical_models(id,manufacturer_id,code,data) values($1,$2,'MODEL','{}')",
      [model, manufacturer],
    );
    await pool.query(
      "insert into equipment.template_versions(id,model_id,version_number,definition,status) values($1,$2,1,$3,'published')",
      [
        template,
        model,
        JSON.stringify({
          systems: [system],
          components: [component],
          activities: [demoOrderDefinition],
        }),
      ],
    );
    for (const [id, branchId, code] of [
      [machine, branch, "M1"],
      [otherMachine, otherBranch, "M2"],
    ]) {
      const request = randomUUID();
      await pool.query(
        "insert into equipment.requests(id,account_id,branch_id,folio,data) values($1,$2,$3,$4,'{}')",
        [request, a, branchId, code],
      );
      await pool.query(
        "insert into equipment.machines(id,machine_code,request_id,account_id,branch_id,model_id,template_id,data,operational_status) values($1,$2,$3,$4,$5,$6,$7,'{}','available')",
        [id, code, request, a, branchId, model, template],
      );
    }
    await pool.query(
      "insert into authz.user_scopes(membership_id,scope_type,machine_id) values($1,'MACHINE',$2)",
      [actors.get("technician")!.membership, machine],
    );
  });
  afterAll(async () => {
    await tickets?.onModuleDestroy();
    await orders?.onModuleDestroy();
    await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });

  async function source() {
    return tickets.create(req(), input);
  }
  const createData = (id: string) => ({
    sourceType: "ticket",
    sourceId: id,
    assigneeId: actors.get("technician")!.user,
    activityCode: "MNT-1",
    reason: "Asignación de servicio",
  });
  it("plans only the current technician's route, with branch-local dates and no reservations", async () => {
    const template = (
      await pool.query("select template_id from equipment.machines where id=$1", [machine])
    ).rows[0].template_id;
    async function scheduled(dueAt: string) {
      const id = randomUUID();
      await pool.query(
        "insert into equipment.scheduled_activities(id,machine_id,template_id,activity_code,definition,due_at,generation_key) values($1::uuid,$2,$3,'MNT-1',$4,$5,$1::text)",
        [id, machine, template, JSON.stringify(demoOrderDefinition), dueAt],
      );
      return orders.create(req(), { ...createData(id), sourceType: "activity" });
    }
    await pool.query(
      "update equipment.branches set data=jsonb_set(data,'{timezone}','\"Pacific/Auckland\"') where id=$1",
      [branch],
    );
    const dates = (
      await pool.query(
        "select ((now() at time zone 'Pacific/Auckland')::date + time '23:59') at time zone 'Pacific/Auckland' as today, now()-interval '1 day' as overdue, now()+interval '2 days' as future",
      )
    ).rows[0];
    const today = await scheduled(dates.today.toISOString());
    const overdue = await scheduled(dates.overdue.toISOString());
    const future = await scheduled(dates.future.toISOString());
    const active = await scheduled(dates.future.toISOString());
    await orders.transition(req("technician", active.rowVersion), active.id, { action: "start" });
    const plan = await orders.routeDownloadPlan(req("technician"));
    const ids = plan.items.map((item) => item.order.id);
    expect(ids).toContain(today.id);
    expect(ids).toContain(overdue.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(future.id);
    expect(ids.indexOf(overdue.id)).toBeLessThan(ids.indexOf(today.id));
    expect(ids.indexOf(active.id)).toBeLessThan(ids.indexOf(overdue.id));
    expect(
      Date.parse(plan.items.find((i) => i.order.id === active.id)!.order.dueAt!),
    ).toBeGreaterThan(Date.parse(overdue.dueAt!));
    expect(
      plan.items.every(
        (item) =>
          item.order.assigneeId === actors.get("technician")!.user && item.estimatedBytes > 2048,
      ),
    ).toBe(true);
    expect((await orders.routeDownloadPlan(req("technician2"))).items).toEqual([]);
    await expect(orders.routeDownloadPlan(req("reader"))).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await pool.query(
          "select count(*)::int as count from maintenance.work_order_offline_leases where order_id=any($1::uuid[])",
          [[today.id, overdue.id, future.id, active.id]],
        )
      ).rows[0].count,
    ).toBe(0);
    await pool.query("update equipment.branches set data=data-'timezone' where id=$1", [branch]);
  });
  it("breaks equal deadlines by source-ticket priority then id", async () => {
    const created: { id: string; priority: string }[] = [];
    for (const priority of ["low", "high", "critical", "high", "normal"]) {
      const ticket = await tickets.create(req(), { ...input, priority });
      const order = await orders.create(req(), createData(ticket.id));
      await orders.transition(req("technician"), order.id, { action: "start" });
      created.push({ id: order.id, priority });
    }
    const rank = ["critical", "high", "normal", "low"];
    const expected = [...created]
      .sort(
        (a, b) => rank.indexOf(a.priority) - rank.indexOf(b.priority) || a.id.localeCompare(b.id),
      )
      .map((i) => i.id);
    const plan = await orders.routeDownloadPlan(req("technician"));
    expect(
      plan.items.filter((i) => created.some((c) => c.id === i.order.id)).map((i) => i.order.id),
    ).toEqual(expected);
  });
  it("marks only active foreign reservations without exposing their owner or device", async () => {
    const order = await orders.create(req(), createData((await source()).id));
    const deviceId = randomUUID();
    const packet = await orders.downloadOffline(req("technician"), order.id, { deviceId });
    const item = async (device = deviceId) =>
      (await orders.routeDownloadPlan(req("technician"), { deviceId: device })).items.find(
        (i) => i.order.id === order.id,
      )!;
    expect((await item()).reservedElsewhere).toBe(false);
    expect((await item(randomUUID())).reservedElsewhere).toBe(true);
    await pool.query("update maintenance.work_order_offline_leases set user_id=$2 where id=$1", [
      packet.lease.id,
      actors.get("technician2")!.user,
    ]);
    expect((await item()).reservedElsewhere).toBe(true);
    expect(Object.keys(await item()).sort()).toEqual([
      "estimatedBytes",
      "order",
      "reservedElsewhere",
      "timeZone",
    ]);
    await pool.query(
      "update maintenance.work_order_offline_leases set downloaded_at=now()-interval '2 days', expires_at=now()-interval '1 day' where id=$1",
      [packet.lease.id],
    );
    expect((await item()).reservedElsewhere).toBe(false);
    await pool.query(
      "update maintenance.work_order_offline_leases set state='released',expires_at=now()+interval '1 day' where id=$1",
      [packet.lease.id],
    );
    expect((await item()).reservedElsewhere).toBe(false);
    expect(() => orders.routeDownloadPlan(req("technician"), { deviceId: "invalid" })).toThrow();
  });
  async function executionFixture() {
    const order = await orders.create(req(), createData((await source()).id));
    const started = await orders.transition(req("technician"), order.id, { action: "start" });
    const evidence = [];
    for (let i = 0; i < 2; i++) {
      const fileId = randomUUID(),
        fileVersionId = randomUUID();
      await pool.query(
        "insert into files.file_objects(id,account_id,category,purpose,status,sensitivity,created_by) values($1,$2,'PHOTO','machine_photo','AVAILABLE','INTERNAL',$3)",
        [fileId, a, actors.get("technician")!.user],
      );
      await pool.query(
        "insert into files.file_versions(id,file_object_id,version_number,storage_zone,object_key,media_type,size_bytes,sha256,scan_status,available_at) values($1,$2,1,'PRIVATE_ORIGINAL',$3,'image/jpeg',100,$4,'CLEAN',now())",
        [fileVersionId, fileId, `${a}/${fileId}/v1/${randomUUID()}`, "a".repeat(64)],
      );
      await pool.query(
        "insert into files.file_bindings(file_object_id,entity_type,entity_id) values($1,'MACHINE',$2)",
        [fileId, machine],
      );
      evidence.push({ type: "photo", requirementCode: "legacy", fileId, fileVersionId });
    }
    return {
      order: started,
      data: {
        checklist: ["ISOLATE", "FILTER"],
        fields: {},
        diagnosis: "Filtro obstruido",
        activitiesPerformed: "Se limpió el filtro",
        parts: [],
        tests: "Flujo restablecido",
        recommendation: "Revisar en treinta días",
        evidence,
        result: "conforming",
        followup: "",
      },
    };
  }
  it("saves immutable drafts, closes with verified evidence and replays without duplicate revisions", async () => {
    const { order, data } = await executionFixture();
    const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, data);
    const request = req("technician", saved.rowVersion);
    const closed = await orders.transition(request, order.id, { action: "complete" });
    expect(closed.state).toBe("completed");
    expect(await orders.transition(request, order.id, { action: "complete" })).toEqual(closed);
    const history = await orders.execution(req(), order.id);
    expect(history.revisions.map((r) => r.kind)).toEqual(["closure", "draft"]);
    await expect(
      pool.query(
        "update maintenance.work_order_executions set reason='changed' where order_id=$1",
        [order.id],
      ),
    ).rejects.toThrow();
    await expect(orders.execution(req("foreign"), order.id)).rejects.toMatchObject({ status: 404 });
  });
  it("downloads once, locks other devices and online writes, and synchronizes a lost response ten times", async () => {
    const { order, data } = await executionFixture();
    const deviceId = randomUUID(),
      request = req("technician", order.rowVersion);
    const packet = await orders.downloadOffline(request, order.id, { deviceId });
    expect(await orders.downloadOffline(request, order.id, { deviceId })).toEqual(packet);
    await expect(
      orders.downloadOffline(req("technician", order.rowVersion), order.id, {
        deviceId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      orders.saveExecution(req("technician", order.rowVersion), order.id, data),
    ).rejects.toMatchObject({ status: 409 });
    const id = randomUUID(),
      send = req("technician", packet.order.rowVersion, id);
    const operation = {
      id,
      orderId: order.id,
      leaseId: packet.lease.id,
      deviceId,
      expectedVersion: packet.order.rowVersion,
      action: "close",
      execution: data,
    };
    const result = await orders.syncOffline(send, operation);
    expect(result).toMatchObject({ state: "completed" });
    for (let i = 0; i < 10; i++) expect(await orders.syncOffline(send, operation)).toEqual(result);
    expect((await orders.execution(req(), order.id)).revisions).toHaveLength(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from audit.events where entity_id=$1 and operation='WorkOrderOfflineSynchronized'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("enforces download scope and permissions, and releases a lease with an audited reason", async () => {
    const { order } = await executionFixture();
    for (const actor of ["owner", "operator", "reader"])
      await expect(
        orders.downloadOffline(req(actor, order.rowVersion), order.id, { deviceId: randomUUID() }),
      ).rejects.toMatchObject({ status: 403 });
    await expect(
      orders.downloadOffline(req("foreign", order.rowVersion), order.id, {
        deviceId: randomUUID(),
      }),
    ).rejects.toThrow();
    const packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, {
      deviceId: randomUUID(),
    });
    await expect(
      orders.releaseOffline(req("technician", order.rowVersion), order.id, {
        reason: "Equipo perdido",
      }),
    ).rejects.toMatchObject({ status: 403 });
    const release = req("owner", order.rowVersion);
    await orders.releaseOffline(release, order.id, {
      reason: "Equipo perdido, reasignar dispositivo",
    });
    await orders.releaseOffline(release, order.id, {
      reason: "Equipo perdido, reasignar dispositivo",
    });
    expect(
      (
        await pool.query("select state from maintenance.work_order_offline_leases where id=$1", [
          packet.lease.id,
        ])
      ).rows[0].state,
    ).toBe("released");
    expect(
      (
        await pool.query(
          "select count(*)::int as n from audit.events where entity_id=$1 and operation='WorkOrderOfflineReleased'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });
  it("rejects revoked offline permission and rolls back a closure when audit is unavailable", async () => {
    const { order, data } = await executionFixture();
    const deviceId = randomUUID();
    const packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, {
      deviceId,
    });
    const id = randomUUID();
    const operation = {
      id,
      orderId: order.id,
      leaseId: packet.lease.id,
      deviceId,
      expectedVersion: order.rowVersion,
      action: "close",
      execution: data,
    };
    const request = req("technician", order.rowVersion, id);
    await pool.query("update identity.users set status='SUSPENDED' where id=$1", [
      actors.get("technician")!.user,
    ]);
    try {
      await expect(orders.syncOffline(request, operation)).rejects.toMatchObject({ status: 403 });
    } finally {
      await pool.query("update identity.users set status='ACTIVE' where id=$1", [
        actors.get("technician")!.user,
      ]);
    }
    await pool.query(
      "create function maintenance.test_offline_audit() returns trigger language plpgsql as $$ begin if new.operation='WorkOrderOfflineSynchronized' then raise exception 'audit unavailable'; end if; return new; end $$; create trigger reject_offline_audit before insert on audit.events for each row execute function maintenance.test_offline_audit()",
    );
    try {
      await expect(orders.syncOffline(request, operation)).rejects.toThrow("audit unavailable");
      expect((await orders.execution(req(), order.id)).revisions).toHaveLength(0);
      expect((await orders.detail(req(), order.id)).order.rowVersion).toBe(order.rowVersion);
      expect(
        (
          await pool.query("select state from maintenance.work_order_offline_leases where id=$1", [
            packet.lease.id,
          ])
        ).rows[0].state,
      ).toBe("active");
      expect(
        (
          await pool.query(
            "select count(*)::int as n from maintenance.offline_requests where key=$1",
            [id],
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await pool.query(
        "drop trigger reject_offline_audit on audit.events; drop function maintenance.test_offline_audit()",
      );
    }
    expect(await orders.syncOffline(request, operation)).toMatchObject({ state: "completed" });
  });
  it("replaces an expired active lease before worker cleanup, with audit and idempotent replay", async () => {
    const { order } = await executionFixture();
    const oldRequest = req("technician", order.rowVersion);
    const oldInput = { deviceId: randomUUID() };
    const old = await orders.downloadOffline(oldRequest, order.id, oldInput);
    await pool.query(
      "update maintenance.work_order_offline_leases set downloaded_at=now()-interval '73 hours',expires_at=now()-interval '1 hour' where id=$1",
      [old.lease.id],
    );
    expect(
      (
        await pool.query("select state from maintenance.work_order_offline_leases where id=$1", [
          old.lease.id,
        ])
      ).rows[0].state,
    ).toBe("active");
    const request = req("technician", old.order.rowVersion);
    const input = { deviceId: randomUUID() };
    await pool.query(
      "create function maintenance.test_expiry_audit() returns trigger language plpgsql as $$ begin if new.operation='WorkOrderOfflineExpired' then raise exception 'expiry audit unavailable'; end if; return new; end $$; create trigger reject_expiry_audit before insert on audit.events for each row execute function maintenance.test_expiry_audit()",
    );
    try {
      await expect(orders.downloadOffline(request, order.id, input)).rejects.toThrow(
        "expiry audit unavailable",
      );
      expect(
        (
          await pool.query(
            "select id,state from maintenance.work_order_offline_leases where order_id=$1",
            [order.id],
          )
        ).rows,
      ).toEqual([{ id: old.lease.id, state: "active" }]);
    } finally {
      await pool.query(
        "drop trigger reject_expiry_audit on audit.events; drop function maintenance.test_expiry_audit()",
      );
    }
    const replacement = await orders.downloadOffline(request, order.id, input);
    expect(replacement.lease.id).not.toBe(old.lease.id);
    expect(await orders.downloadOffline(request, order.id, input)).toEqual(replacement);
    await expect(orders.downloadOffline(oldRequest, order.id, oldInput)).rejects.toMatchObject({
      status: 409,
    });
    const leases = (
      await pool.query(
        "select id,state,ended_at from maintenance.work_order_offline_leases where order_id=$1",
        [order.id],
      )
    ).rows;
    expect(leases).toHaveLength(2);
    expect(leases.find((lease) => lease.id === old.lease.id)).toMatchObject({
      state: "expired",
      ended_at: expect.any(Date),
    });
    expect(leases.filter((lease) => lease.state === "active").map((lease) => lease.id)).toEqual([
      replacement.lease.id,
    ]);
    const events = (
      await pool.query(
        "select reason,actor_user_id,context_session_id,correlation_id from audit.events where entity_id=$1 and operation='WorkOrderOfflineExpired'",
        [order.id],
      )
    ).rows;
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor_user_id: actors.get("technician")!.user,
      context_session_id: actors.get("technician")!.context,
      correlation_id: request.correlationId,
    });
    expect(events[0].reason).toContain(old.lease.id);
  });
  it("rejects wrong-device synchronization and stale or expired packages without appending execution", async () => {
    const { order, data } = await executionFixture();
    const deviceId = randomUUID();
    const packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, {
      deviceId,
    });
    const id = randomUUID();
    const operation = {
      id,
      orderId: order.id,
      leaseId: packet.lease.id,
      deviceId,
      expectedVersion: order.rowVersion,
      action: "close",
      execution: data,
    };
    await expect(
      orders.syncOffline(req("technician", order.rowVersion, id), {
        ...operation,
        deviceId: randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      orders.syncOffline(req("technician", order.rowVersion + 1, id), {
        ...operation,
        expectedVersion: order.rowVersion + 1,
      }),
    ).resolves.toHaveProperty("conflictId");
    await pool.query(
      "update maintenance.work_order_offline_leases set downloaded_at=now()-interval '73 hours',expires_at=now()-interval '1 hour' where id=$1",
      [packet.lease.id],
    );
    const expiredId = randomUUID();
    await expect(
      orders.syncOffline(req("technician", order.rowVersion, expiredId), {
        ...operation,
        id: expiredId,
      }),
    ).resolves.toHaveProperty("conflictId");
    expect(
      (await pool.query("select maintenance.expire_offline_leases(100,$1) as n", [randomUUID()]))
        .rows[0].n,
    ).toBeGreaterThan(0);
    expect(
      (await pool.query("select maintenance.expire_offline_leases(100,$1) as n", [randomUUID()]))
        .rows[0].n,
    ).toBe(0);
    expect((await orders.execution(req(), order.id)).revisions).toHaveLength(0);
  });
  it("preserves both conflict versions with files, deduplicates replay, and resolves once under concurrency", async () => {
    const { order, data } = await executionFixture();
    const packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, {
      deviceId: randomUUID(),
    });
    await orders.releaseOffline(req("owner", order.rowVersion), order.id, {
      reason: "Revisión concurrente autorizada",
    });
    const changed = await orders.saveExecution(req("technician", order.rowVersion), order.id, {
      ...data,
      diagnosis: "Diagnóstico del servidor actualizado",
    });
    const id = randomUUID(),
      operation = {
        id,
        orderId: order.id,
        leaseId: packet.lease.id,
        deviceId: packet.lease.deviceId,
        expectedVersion: packet.order.rowVersion,
        action: "close",
        execution: data,
      };
    const result = await orders.syncOffline(
      req("technician", packet.order.rowVersion, id),
      operation,
    );
    expect(result).toHaveProperty("conflictId");
    if (!("conflictId" in result)) throw Error("Missing conflict");
    expect(
      await orders.syncOffline(req("technician", packet.order.rowVersion, id), operation),
    ).toEqual(result);
    const conflict = (await orders.listConflicts(req())).items.find(
      (c) => c.id === result.conflictId,
    )!;
    expect(conflict.local.execution).toEqual(data);
    expect(conflict.server.execution?.diagnosis).toBe("Diagnóstico del servidor actualizado");
    expect(conflict.fields).toContain("diagnosis");
    expect(conflict.local.execution.evidence.length).toBeGreaterThan(0);
    expect((await orders.listConflicts(req("foreign"))).items).not.toContainEqual(
      expect.objectContaining({ id: conflict.id }),
    );
    const resolution = {
      strategy: "local",
      reason: "Se verificó evidencia del técnico",
      confirmed: true,
    };
    await expect(
      orders.resolveConflict(req("technician", changed.rowVersion), conflict.id, resolution),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      orders.resolveConflict(req("reader", changed.rowVersion), conflict.id, resolution),
    ).rejects.toMatchObject({ status: 403 });
    const request = req("operator", changed.rowVersion);
    const results = await Promise.all([
      orders.resolveConflict(request, conflict.id, resolution),
      orders.resolveConflict(request, conflict.id, resolution),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]?.state).toBe("completed");
    expect((await orders.listConflicts(req())).items.find((c) => c.id === conflict.id)?.state).toBe(
      "resolved",
    );
    expect(
      (
        await pool.query(
          "select count(*)::int n from maintenance.synchronization_conflicts where operation_id=$1",
          [id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int n from maintenance.synchronization_resolutions where conflict_id=$1",
          [conflict.id],
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int n from audit.events where entity_id=$1 and operation='WorkOrderSyncConflictResolved'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
    await expect(
      pool.query("delete from maintenance.synchronization_conflicts where id=$1", [conflict.id]),
    ).rejects.toThrow();
  });
  it("rechecks scope and expiry and audits only the caller's reported local loss", async () => {
    const { order } = await executionFixture();
    const user = actors.get("technician")!.user;
    const packet = await orders.downloadOffline(req("technician", order.rowVersion), order.id, {
      deviceId: randomUUID(),
    });
    expect((await orders.offlineAccess(req("technician"))).orderIds).toContain(order.id);
    const report = {
      id: randomUUID(),
      reason: "revoked",
      leaseIds: [packet.lease.id],
      operationIds: [randomUUID()],
    };
    await expect(
      orders.reportOfflinePurge(actors.get("foreign")!.user, report, randomUUID()),
    ).rejects.toMatchObject({ status: 403 });
    await pool.query("update identity.users set status='DEACTIVATED' where id=$1", [user]);
    try {
      expect(await orders.reportOfflinePurge(user, report, randomUUID())).toEqual({
        recorded: true,
      });
      expect(await orders.reportOfflinePurge(user, report, randomUUID())).toEqual({
        recorded: true,
      });
      await expect(orders.offlineAccess(req("technician"))).rejects.toMatchObject({ status: 403 });
    } finally {
      await pool.query("update identity.users set status='ACTIVE' where id=$1", [user]);
    }
    expect(
      (
        await pool.query(
          "select count(*)::int n from audit.events where entity_id=$1 and operation='OfflineLocalDataPurged'",
          [order.id],
        )
      ).rows[0].n,
    ).toBe(1);
  });

  it.each(["diagnosis", "activitiesPerformed", "tests", "recommendation"])(
    "blocks closure without %s and preserves the draft",
    async (field) => {
      const { order, data } = await executionFixture();
      const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, {
        ...data,
        [field]: "",
      });
      await expect(
        orders.transition(req("technician", saved.rowVersion), order.id, { action: "complete" }),
      ).rejects.toMatchObject({ status: 409 });
      expect((await orders.execution(req(), order.id)).revisions).toHaveLength(1);
    },
  );
  it("rejects foreign files, incorrect versions, missing checklist and unverified photos", async () => {
    const { order, data } = await executionFixture();
    await expect(
      orders.saveExecution(req("technician", order.rowVersion), order.id, {
        ...data,
        evidence: [{ ...data.evidence[0], fileVersionId: randomUUID() }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, {
      ...data,
      checklist: [],
    });
    await expect(
      orders.transition(req("technician", saved.rowVersion), order.id, { action: "complete" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      orders.saveExecution(req("technician2", saved.rowVersion), order.id, data),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      orders.saveExecution(req("reader", saved.rowVersion), order.id, data),
    ).rejects.toMatchObject({ status: 403 });
  });
  it.each(["owner", "operator"])(
    "reopens with %s, keeps history, enforces permissions and requires a new execution",
    async (actor) => {
      const { order, data } = await executionFixture();
      const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, data);
      const closed = await orders.transition(req("technician", saved.rowVersion), order.id, {
        action: "complete",
      });
      const input = { action: "reopen", reason: "Revisar nuevamente el equipo" };
      const original = (await orders.execution(req(), order.id)).revisions;
      for (const denied of ["technician", "reader", "ice24", "platform"])
        await expect(
          orders.review(req(denied, closed.rowVersion), order.id, input),
        ).rejects.toMatchObject({ status: 403 });
      await expect(
        orders.review(req("foreign", closed.rowVersion), order.id, input),
      ).rejects.toMatchObject({ status: 404 });
      await expect(orders.review(req(actor, 1), order.id, input)).rejects.toMatchObject({
        status: 409,
      });
      expect(() =>
        orders.review(req(actor, closed.rowVersion), order.id, { ...input, reason: "" }),
      ).toThrow();
      await expect(
        orders.transition(req(actor, closed.rowVersion), order.id, input),
      ).rejects.toMatchObject({ status: 409 });
      const request = req(actor, closed.rowVersion);
      const reopened = await orders.review(request, order.id, input);
      expect(reopened.state).toBe("in_progress");
      expect(await orders.review(request, order.id, input)).toEqual(reopened);
      const history = await orders.execution(req(), order.id);
      expect(history.revisions).toEqual(original);
      expect(history.reviews.filter((r) => r.action === "reopen")).toHaveLength(1);
      expect(history.reviews[0]).toMatchObject({
        reason: input.reason,
        actorId: actors.get(actor)!.user,
      });
      expect(history.canReopen).toBe(false);
      expect(history.missing.some((m) => m.message.includes("nuevo borrador"))).toBe(true);
      await expect(
        orders.transition(req("technician", reopened.rowVersion), order.id, { action: "complete" }),
      ).rejects.toMatchObject({ status: 409 });
      const draft = await orders.saveExecution(req("technician", reopened.rowVersion), order.id, {
        ...data,
        diagnosis: "Revisión después de reapertura",
      });
      expect(
        (
          await orders.transition(req("technician", draft.rowVersion), order.id, {
            action: "complete",
          })
        ).state,
      ).toBe("completed");
      expect((await orders.execution(req(), order.id)).revisions).toHaveLength(4);
    },
  );
  it.each(["with_observations", "nonconforming", "corrected"])(
    "reopens %s without rewriting its execution",
    async (state) => {
      const { order, data } = await executionFixture();
      const execution = {
        ...data,
        result:
          state === "with_observations"
            ? ("observations" as const)
            : state === "nonconforming"
              ? ("nonconforming" as const)
              : ("conforming" as const),
        followup: "Nueva visita de seguimiento",
      };
      const saved = await orders.saveExecution(
        req("technician", order.rowVersion),
        order.id,
        execution,
      );
      let closed = await orders.transition(req("technician", saved.rowVersion), order.id, {
        action:
          state === "with_observations"
            ? "observe"
            : state === "nonconforming"
              ? "reject"
              : "complete",
        reason: execution.followup,
      });
      if (state === "corrected")
        closed = await orders.review(req("owner", closed.rowVersion), order.id, {
          action: "correct",
          reason: "Precisar datos de captura",
          execution,
        });
      expect(closed.state).toBe(state);
      const original = (await orders.execution(req(), order.id)).revisions;
      expect(
        (
          await orders.review(req("owner", closed.rowVersion), order.id, {
            action: "reopen",
            reason: "Seguimiento de la revisión",
          })
        ).state,
      ).toBe("in_progress");
      expect((await orders.execution(req(), order.id)).revisions).toEqual(original);
    },
  );
  it("keeps original closure when an authorized reviewer corrects a value and audits the reason", async () => {
    const { order, data } = await executionFixture();
    const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, data);
    const closed = await orders.transition(req("technician", saved.rowVersion), order.id, {
      action: "complete",
    });
    await expect(
      orders.review(req("technician", closed.rowVersion), order.id, {
        action: "correct",
        reason: "Corrección solicitada",
        execution: data,
      }),
    ).rejects.toMatchObject({ status: 403 });
    const corrected = await orders.review(req("operator", closed.rowVersion), order.id, {
      action: "correct",
      reason: "Precisar el diagnóstico capturado",
      execution: { ...data, diagnosis: "Filtro parcialmente obstruido" },
    });
    expect(corrected.state).toBe("corrected");
    const history = await orders.execution(req(), order.id);
    expect(history.revisions[0]?.execution.diagnosis).toBe("Filtro parcialmente obstruido");
    expect(history.revisions[1]?.execution.diagnosis).toBe(data.diagnosis);
    expect(history.reviews[0]?.reason).toBe("Precisar el diagnóstico capturado");
    await expect(
      orders.review(req("foreign", corrected.rowVersion), order.id, {
        action: "cancel",
        reason: "Anulación inválida",
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it("preserves a draft with a pending photo but refuses closure before a clean scan", async () => {
    const { order, data } = await executionFixture();
    const fileId = randomUUID(),
      fileVersionId = randomUUID();
    await pool.query(
      "insert into files.file_objects(id,account_id,category,purpose,status,sensitivity,created_by) values($1,$2,'PHOTO','machine_photo','VERIFYING','INTERNAL',$3)",
      [fileId, a, actors.get("technician")!.user],
    );
    await pool.query(
      "insert into files.file_versions(id,file_object_id,version_number,storage_zone,object_key,media_type,size_bytes,scan_status) values($1,$2,1,'QUARANTINE',$3,'image/jpeg',100,'PENDING')",
      [fileVersionId, fileId, `${a}/${fileId}/v1/${randomUUID()}`],
    );
    await pool.query(
      "insert into files.file_bindings(file_object_id,entity_type,entity_id) values($1,'MACHINE',$2)",
      [fileId, machine],
    );
    const pending = {
      ...data,
      evidence: [
        { type: "photo", requirementCode: "legacy", fileId, fileVersionId },
        data.evidence[1],
      ],
    };
    const saved = await orders.saveExecution(
      req("technician", order.rowVersion),
      order.id,
      pending,
    );
    await expect(
      orders.transition(req("technician", saved.rowVersion), order.id, { action: "complete" }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await orders.execution(req(), order.id)).revisions).toHaveLength(1);
    expect((await orders.detail(req(), order.id)).order.state).toBe("in_progress");
  });
  it("creates one order under concurrent replay, freezes requirements and audits once", async () => {
    const ticket = await source(),
      request = req(),
      data = createData(ticket.id);
    const [a, b] = await Promise.all([orders.create(request, data), orders.create(request, data)]);
    expect(a).toEqual(b);
    expect(a.definition).toEqual(demoOrderDefinition);
    expect(a.folio).toMatch(/^OT-/);
    expect((await orders.detail(req(), a.id)).events).toHaveLength(1);
    expect((await tickets.detail(req(), ticket.id)).ticket.workOrderId).toBe(a.id);
    await expect(orders.create(req(), data)).rejects.toMatchObject({ status: 409 });
    await expect(
      orders.create(request, { ...data, reason: "Motivo diferente" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      pool.query("update maintenance.work_orders set definition='{}' where id=$1", [a.id]),
    ).rejects.toThrow("immutable");
    await expect(
      pool.query("delete from maintenance.work_orders where id=$1", [a.id]),
    ).rejects.toThrow();
  });
  it("records review and annulment once, rejects empty motives, and limits review to the current scope", async () => {
    const { order, data } = await executionFixture();
    const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, data);
    const closed = await orders.transition(req("technician", saved.rowVersion), order.id, {
      action: "complete",
    });
    expect(() =>
      orders.review(req("owner", closed.rowVersion), order.id, { action: "cancel", reason: "" }),
    ).toThrow();
    await expect(
      orders.review(req("reader", closed.rowVersion), order.id, {
        action: "cancel",
        reason: "Registro duplicado",
      }),
    ).rejects.toMatchObject({ status: 403 });
    const reviewed = await orders.review(req("operator", closed.rowVersion), order.id, {
      action: "review",
      reason: "Evidencia verificada",
    });
    const request = req("owner", reviewed.rowVersion),
      input = { action: "cancel", reason: "Orden registrada por duplicado" };
    expect((await orders.review(request, order.id, input)).state).toBe("cancelled");
    expect((await orders.review(request, order.id, input)).state).toBe("cancelled");
    const history = await orders.execution(req(), order.id);
    expect(history.reviews.filter((r) => r.action === "cancel")).toHaveLength(1);
    expect(history.revisions).toHaveLength(2);
  });
  it("rolls back reopening and its review when auditing fails", async () => {
    const { order, data } = await executionFixture();
    const saved = await orders.saveExecution(req("technician", order.rowVersion), order.id, data);
    const closed = await orders.transition(req("technician", saved.rowVersion), order.id, {
      action: "complete",
    });
    await pool.query(
      "create function maintenance.test_reopen_audit() returns trigger language plpgsql as $$ begin if new.entity_type='work_order' then raise exception 'audit unavailable'; end if; return new; end $$; create trigger reject_reopen_audit before insert on audit.events for each row execute function maintenance.test_reopen_audit()",
    );
    try {
      await expect(
        orders.review(req("owner", closed.rowVersion), order.id, {
          action: "reopen",
          reason: "Nueva visita requerida",
        }),
      ).rejects.toThrow("audit unavailable");
      expect((await orders.detail(req(), order.id)).order).toMatchObject({
        state: "completed",
        rowVersion: closed.rowVersion,
      });
      expect((await orders.execution(req(), order.id)).reviews).toHaveLength(0);
    } finally {
      await pool.query(
        "drop trigger reject_reopen_audit on audit.events; drop function maintenance.test_reopen_audit()",
      );
    }
  });
  it("rolls back the revision, evidence links and order version when auditing fails", async () => {
    const { order, data } = await executionFixture();
    await pool.query(
      "create function maintenance.test_execution_audit() returns trigger language plpgsql as $$ begin if new.entity_type='work_order' then raise exception 'audit unavailable'; end if; return new; end $$; create trigger reject_execution_audit before insert on audit.events for each row execute function maintenance.test_execution_audit()",
    );
    try {
      await expect(
        orders.saveExecution(req("technician", order.rowVersion), order.id, data),
      ).rejects.toThrow("audit unavailable");
      expect((await orders.execution(req(), order.id)).revisions).toHaveLength(0);
      expect((await orders.detail(req(), order.id)).order.rowVersion).toBe(order.rowVersion);
    } finally {
      await pool.query(
        "drop trigger reject_execution_audit on audit.events; drop function maintenance.test_execution_audit()",
      );
    }
  });
  it.each(["technician", "reader", "ice24", "platform"])(
    "does not allow %s to assign",
    async (name) => {
      const ticket = await source();
      await expect(orders.create(req(name), createData(ticket.id))).rejects.toMatchObject({
        status: 403,
      });
    },
  );
  it("allows branch administrator but rejects a technician without current scope", async () => {
    const ticket = await source();
    const order = await orders.create(req("operator"), createData(ticket.id));
    await pool.query("update authz.user_scopes set valid_to=now() where membership_id=$1", [
      actors.get("technician")!.membership,
    ]);
    try {
      const options = await orders.options(req(), "ticket", ticket.id);
      expect(options.technicians.some((t) => t.id === actors.get("technician")!.user)).toBe(false);
      await expect(
        orders.transition(req("technician"), order.id, { action: "start" }),
      ).rejects.toMatchObject({ status: 404 });
      const next = await source();
      await expect(orders.create(req(), createData(next.id))).rejects.toMatchObject({
        status: 400,
      });
    } finally {
      await pool.query("update authz.user_scopes set valid_to=null where membership_id=$1", [
        actors.get("technician")!.membership,
      ]);
    }
  });
  it("rejects cross-account reads and source assignment", async () => {
    const ticket = await source(),
      order = await orders.create(req(), createData(ticket.id));
    await expect(orders.detail(req("foreign"), order.id)).rejects.toMatchObject({ status: 404 });
    await expect(orders.create(req("foreign"), createData(ticket.id))).rejects.toMatchObject({
      status: 404,
    });
    expect((await orders.list(req("foreign"), {})).items).toEqual([]);
  });
  it("requires source version and rolls back all writes if audit fails", async () => {
    const ticket = await source();
    await expect(orders.create(req("owner", 99), createData(ticket.id))).rejects.toMatchObject({
      status: 409,
    });
    await pool.query(
      "create function maintenance.test_reject_audit() returns trigger language plpgsql as $$ begin if new.entity_type='work_order' then raise exception 'audit unavailable'; end if; return new; end $$; create trigger reject_order_audit before insert on audit.events for each row execute function maintenance.test_reject_audit()",
    );
    try {
      await expect(orders.create(req(), createData(ticket.id))).rejects.toThrow(
        "audit unavailable",
      );
      expect((await tickets.detail(req(), ticket.id)).ticket.workOrderId).toBeNull();
    } finally {
      await pool.query(
        "drop trigger reject_order_audit on audit.events; drop function maintenance.test_reject_audit()",
      );
    }
  });
  it("starts only as the assigned technician, with optimistic concurrency and replay", async () => {
    const ticket = await source(),
      order = await orders.create(req(), createData(ticket.id));
    await expect(orders.transition(req(), order.id, { action: "start" })).rejects.toMatchObject({
      status: 403,
    });
    const requests = [req("technician"), req("technician")];
    const results = await Promise.allSettled(
      requests.map((r) => orders.transition(r, order.id, { action: "start" })),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const index = results.findIndex((r) => r.status === "fulfilled");
    expect((await orders.transition(requests[index]!, order.id, { action: "start" })).state).toBe(
      "in_progress",
    );
    const detail = await orders.detail(req(), order.id);
    expect(detail.events).toHaveLength(2);
    expect((await tickets.detail(req(), ticket.id)).ticket.state).toBe("in_progress");
    await expect(
      orders.assign(req("owner", 2), order.id, {
        assigneeId: actors.get("technician")!.user,
        reason: "Cambio de turno",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      orders.transition(req("technician", 2), order.id, { action: "complete" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("reassigns before execution and rejects stale version", async () => {
    const ticket = await source(),
      order = await orders.create(req(), createData(ticket.id));
    const data = {
      assigneeId: actors.get("technician2")!.user,
      reason: "Cambio de turno autorizado",
    };
    const request = req();
    const changed = await orders.assign(request, order.id, data);
    expect(changed.rowVersion).toBe(2);
    expect(await orders.assign(request, order.id, data)).toEqual(changed);
    await expect(orders.assign(req(), order.id, data)).rejects.toMatchObject({ status: 409 });
    await expect(
      orders.transition(req("technician", 2), order.id, { action: "start" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await orders.transition(req("technician2", 2), order.id, { action: "start" })).state,
    ).toBe("in_progress");
  });
  it("blocks read-only and disabled modules, including idempotent replay", async () => {
    const ticket = await source(),
      request = req(),
      data = createData(ticket.id);
    await orders.create(request, data);
    await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
    try {
      await expect(orders.create(request, data)).rejects.toMatchObject({ status: 403 });
    } finally {
      await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);
    }
    await pool.query(
      "update identity.accounts set disabled_modules=array['maintenance'] where id=$1",
      [a],
    );
    try {
      await expect(orders.list(req(), {})).rejects.toMatchObject({ status: 403 });
    } finally {
      await pool.query("update identity.accounts set disabled_modules='{}' where id=$1", [a]);
    }
  });
  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "criterio de salida F7",
    async () => {
      const machineRow = (
        await pool.query("select template_id from equipment.machines where id=$1", [machine])
      ).rows[0];
      const activityId = randomUUID();
      await pool.query(
        "insert into equipment.scheduled_activities(id,machine_id,template_id,activity_code,definition,due_at,generation_key) values($1::uuid,$2,$3,'MNT-1',$4,now()+interval '2 days',$1::text)",
        [activityId, machine, machineRow.template_id, JSON.stringify(demoExecutionDefinition)],
      );
      const order = await orders.create(req(), {
        ...createData(activityId),
        sourceType: "activity",
      });
      await fieldCriterion({ pool, orders, order, accountId: a, req });
    },
    180_000,
  );
  it("creates from overdue activity preserving original definition and dates", async () => {
    const scheduledDefinition = {
      ...demoOrderDefinition,
      schedule: {
        source: "MACHINE",
        frequency: { value: 2, unit: "weeks" },
        anchor: "2026-10-01T00:00:00.000Z",
      },
    };
    const m = (
      await pool.query("select template_id from equipment.machines where id=$1", [machine])
    ).rows[0];
    const id = randomUUID();
    await pool.query(
      "insert into equipment.scheduled_activities(id,machine_id,template_id,activity_code,definition,due_at,generation_key) values($1::uuid,$2,$3,'MNT-1',$4,now()-interval '2 days',$1::text)",
      [id, machine, m.template_id, JSON.stringify(scheduledDefinition)],
    );
    const data = { ...createData(id), sourceType: "activity" };
    const order = await orders.create(req(), data);
    expect(order.state).toBe("overdue");
    expect(order.activityId).toBe(id);
    expect(order.definition).toEqual(scheduledDefinition);
    expect((await orders.detail(req(), order.id)).events).toHaveLength(2);
    expect(
      (
        await pool.query(
          "select status,assignee_id from equipment.scheduled_activities where id=$1",
          [id],
        )
      ).rows[0],
    ).toEqual({ status: "pending", assignee_id: actors.get("technician")!.user });
    await orders.transition(req("technician", order.rowVersion), order.id, { action: "start" });
    expect(
      (await pool.query("select status from equipment.scheduled_activities where id=$1", [id]))
        .rows[0].status,
    ).toBe("in_progress");
  });
  it("does not rewrite a frozen order when the machine moves to a new template version", async () => {
    const ticket = await source(),
      order = await orders.create(req(), createData(ticket.id));
    const original = (
      await pool.query(
        "select t.* from equipment.template_versions t join equipment.machines m on m.template_id=t.id where m.id=$1",
        [machine],
      )
    ).rows[0];
    const next = randomUUID();
    await pool.query(
      "insert into equipment.template_versions(id,model_id,version_number,definition,status) values($1,$2,2,$3,'published')",
      [
        next,
        original.model_id,
        JSON.stringify({
          ...original.definition,
          activities: [
            { ...demoOrderDefinition, procedure: "Nuevo procedimiento técnico revisado" },
          ],
        }),
      ],
    );
    await pool.query("update equipment.machines set template_id=$2 where id=$1", [machine, next]);
    try {
      expect((await orders.detail(req(), order.id)).order.definition.procedure).toBe(
        demoOrderDefinition.procedure,
      );
      const other = await source();
      expect((await orders.create(req(), createData(other.id))).definition.procedure).toBe(
        "Nuevo procedimiento técnico revisado",
      );
    } finally {
      await pool.query("update equipment.machines set template_id=$2 where id=$1", [
        machine,
        original.id,
      ]);
    }
  });
  it("denies a suspended technician even when request claims are old", async () => {
    const ticket = await source(),
      order = await orders.create(req(), createData(ticket.id));
    await pool.query("update identity.users set status='SUSPENDED' where id=$1", [
      actors.get("technician")!.user,
    ]);
    try {
      await expect(
        orders.transition(req("technician"), order.id, { action: "start" }),
      ).rejects.toMatchObject({ status: 403 });
    } finally {
      await pool.query("update identity.users set status='ACTIVE' where id=$1", [
        actors.get("technician")!.user,
      ]);
    }
  });
});
