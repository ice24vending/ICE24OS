import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { WorkOrdersStore } from "../../apps/api/src/modules/work-orders/infrastructure/work-orders.store.js";
import { demoOrderDefinition } from "../../apps/private-web/src/server/demo/work-order-fixtures.js";
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
      "20261024000100_phase6_account_modules.sql",
      "20261009000100_phase4_account_catalog.sql",
      "20261010000100_phase4_machine_components.sql",
      "20261011000100_phase4_frequency_overrides.sql",
      "20261012000100_phase4_schedule_recalc.sql",
      "20261102000100_phase7_scheduling.sql",
      "20261102000200_phase7_tickets.sql",
      "20261103000100_phase7_work_orders.sql",
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
