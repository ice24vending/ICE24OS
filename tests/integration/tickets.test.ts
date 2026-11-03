import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { TicketsStore } from "../../apps/api/src/modules/tickets/infrastructure/tickets.store.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("F7-02 tickets: tenant scope, replay, evidence and atomic audit", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let tickets: TicketsStore;
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
    ])
      await pool.query(await migration(name));
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    tickets = new TicketsStore(identity);
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
        JSON.stringify({ systems: [system], components: [component], activities: [] }),
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
    await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
  });
  it("creates once under concurrent replay and audits exactly once", async () => {
    const request = req();
    const [first, second] = await Promise.all([
      tickets.create(request, input),
      tickets.create(request, input),
    ]);
    expect(second).toEqual(first);
    expect(first.folio).toMatch(/^TKT-/);
    expect(first.state).toBe("pending_assignment");
    const events = await tickets.detail(req(), first.id);
    expect(events.events).toHaveLength(1);
    expect(
      (
        await pool.query(
          "select actor_user_id,context_session_id,correlation_id,result from audit.events where entity_id=$1",
          [first.id],
        )
      ).rows[0],
    ).toEqual({
      actor_user_id: request.localUser!.id,
      context_session_id: request.headers["x-ice24-context-id"],
      correlation_id: request.correlationId,
      result: "SUCCESS",
    });
    await expect(
      tickets.create(request, { ...input, description: "Un reporte distinto con la misma clave" }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it.each(["owner", "operator", "technician"])(
    "allows %s to report and record scoped diagnosis",
    async (name) => {
      const ticket = await tickets.create(req(name), input);
      const request = req(name);
      const data = {
        diagnosis: "Condensador obstruido; revisar ventilación.",
        reason: "Inspección de campo",
      };
      const changed = await tickets.diagnose(request, ticket.id, data);
      expect(changed.rowVersion).toBe(2);
      expect(await tickets.diagnose(request, ticket.id, data)).toEqual(changed);
      await expect(tickets.diagnose(req(name), ticket.id, data)).rejects.toMatchObject({
        status: 409,
      });
      expect((await tickets.detail(req(name), ticket.id)).events).toHaveLength(2);
    },
  );
  it.each(["reader", "ice24", "platform"])("allows read but denies %s writes", async (name) => {
    expect((await tickets.list(req(name), {})).items.length).toBeGreaterThan(0);
    await expect(tickets.create(req(name), input)).rejects.toMatchObject({ status: 403 });
    const ticket = (await tickets.list(req(name), {})).items[0]!;
    await expect(
      tickets.diagnose(req(name), ticket.id, {
        diagnosis: "Diagnóstico no autorizado",
        reason: "Prueba negativa",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("hides foreign tenants and branches for reads, options and creation", async () => {
    const ticket = await tickets.create(req(), { ...input, machineId: otherMachine });
    for (const name of ["foreign", "operator", "technician"]) {
      await expect(tickets.detail(req(name), ticket.id)).rejects.toMatchObject({ status: 404 });
      await expect(tickets.options(req(name), otherMachine)).rejects.toMatchObject({ status: 404 });
      await expect(
        tickets.create(req(name), { ...input, machineId: otherMachine }),
      ).rejects.toMatchObject({ status: 404 });
      expect((await tickets.list(req(name), { machineId: otherMachine })).items).toEqual([]);
    }
  });
  it("rejects missing/foreign evidence and mismatched system without creating or auditing", async () => {
    const count = await pool.query("select count(*) from maintenance.tickets");
    await expect(
      tickets.create(req(), { ...input, evidenceIds: [randomUUID()] }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(tickets.create(req(), { ...input, systemId: component })).rejects.toMatchObject({
      status: 400,
    });
    expect((await pool.query("select count(*) from maintenance.tickets")).rows).toEqual(count.rows);
  });
  it("links confirmed private evidence, never returns storage URLs", async () => {
    const file = randomUUID();
    await pool.query(
      "insert into files.file_objects(id,account_id,category,purpose,status,sensitivity,created_by) values($1,$2,'PHOTO','machine_photo','VERIFYING','INTERNAL',$3)",
      [file, a, actors.get("owner")!.user],
    );
    await pool.query(
      "insert into files.file_bindings(file_object_id,entity_type,entity_id) values($1,'MACHINE',$2)",
      [file, machine],
    );
    const ticket = await tickets.create(req(), { ...input, evidenceIds: [file] });
    expect(ticket.evidenceIds).toEqual([file]);
    expect(JSON.stringify(ticket)).not.toContain("http");
    await expect(
      tickets.create(req(), { ...input, machineId: otherMachine, evidenceIds: [file] }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rolls back business changes when audit insertion fails", async () => {
    const ticket = await tickets.create(req(), input);
    const request = req();
    request.correlationId = "invalid";
    await expect(
      tickets.diagnose(request, ticket.id, {
        diagnosis: "Prueba de diagnóstico con rollback",
        reason: "Fallo de auditoría",
      }),
    ).rejects.toBeDefined();
    expect((await tickets.detail(req(), ticket.id)).ticket.rowVersion).toBe(1);
  });
  it("denies disabled maintenance, read-only writes and direct browser reads", async () => {
    await pool.query(
      "update identity.accounts set disabled_modules=array['maintenance'] where id=$1",
      [a],
    );
    await expect(tickets.list(req(), {})).rejects.toMatchObject({ status: 403 });
    await expect(tickets.create(req(), input)).rejects.toMatchObject({ status: 403 });
    await pool.query("update identity.accounts set disabled_modules='{}' where id=$1", [a]);
    await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
    expect((await tickets.list(req(), {})).items.length).toBeGreaterThan(0);
    await expect(tickets.create(req(), input)).rejects.toMatchObject({ status: 403 });
    await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);
    const client = await pool.connect();
    try {
      await client.query("set role authenticated");
      await expect(client.query("select * from maintenance.tickets")).rejects.toBeDefined();
    } finally {
      await client.query("reset role");
      client.release();
    }
  });
});
