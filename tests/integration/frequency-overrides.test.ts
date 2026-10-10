import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { MachineFrequencies } from "@ice24/contracts";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import {
  EquipmentDatabase,
  type RecordRow,
} from "../../apps/api/src/modules/equipment/equipment.database.js";
import { AccountsStore } from "../../apps/api/src/modules/equipment/accounts.store.js";
import { TemplatesStore } from "../../apps/api/src/modules/equipment/templates.store.js";
import { RequestsStore } from "../../apps/api/src/modules/equipment/requests.store.js";
import { MachinesStore } from "../../apps/api/src/modules/equipment/machines.store.js";
import { TransfersStore } from "../../apps/api/src/modules/equipment/transfers.store.js";
import { AccountCatalogStore } from "../../apps/api/src/modules/equipment/account-catalog.store.js";
import { MachineComponentsStore } from "../../apps/api/src/modules/equipment/machine-components.store.js";
import {
  FrequencyOverridesStore,
  WarrantyWarningRequiredException,
} from "../../apps/api/src/modules/equipment/frequency-overrides.store.js";
import { FrequencyOverridesController } from "../../apps/api/src/modules/equipment/frequency-overrides.controller.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("TASK-F4-20 factory and client maintenance frequencies", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let accounts: AccountsStore;
  let templates: TemplatesStore;
  let requests: RequestsStore;
  let machines: MachinesStore;
  let transfers: TransfersStore;
  let catalog: AccountCatalogStore;
  let components: MachineComponentsStore;
  let frequencies: FrequencyOverridesStore;
  let httpApp: {
    listen(port: number, host: string): Promise<void>;
    getUrl(): Promise<string>;
    close(): Promise<void>;
    setGlobalPrefix(prefix: string): void;
  };
  let baseUrl: string;
  const oldUrl = process.env.DATABASE_URL;
  const a = randomUUID(),
    b = randomUUID(),
    platform = randomUUID();
  const actors = new Map<string, { user: string; context: string; membership: string }>();
  const ids = {} as Record<"MFG" | "SYS" | "CMP1" | "CMP2" | "UV_A", string>;
  let machine: RecordRow, branchA1: RecordRow, branchA2: RecordRow, branchB: RecordRow;
  let templateId: string;
  let machineBefore: Record<string, unknown>;
  let schedulesBefore: number;
  const fileId = randomUUID();
  const reason = { reason: "Integration test evidence", confirmation: true };
  const branchData = {
    name: "QA branch",
    address: "Synthetic test address",
    latitude: 19.4,
    longitude: -99.1,
    timezone: "America/Mexico_City",
    schedule: "09:00–17:00",
    publicPhone: "",
    ownerPhonePublic: false,
    referenceTemperature: null,
  };
  const activity = (
    code: string,
    category: "maintenance" | "sanitation",
    triggerType: "time" | "usage",
    frequencyDays: number | null,
  ) => ({
    code,
    name: code,
    category,
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
  const target = (activityCode: string, componentCatalogId: string | null = null) => ({
    activityCode,
    componentCatalogId,
  });
  const days = (value: number) => ({ value, unit: "days" as const });
  const body = (
    activityCode: string,
    frequency: { value: number; unit: "days" | "weeks" | "months" },
    extra: Record<string, unknown> = {},
    componentCatalogId: string | null = null,
  ) => ({
    ...target(activityCode, componentCatalogId),
    frequency,
    alertLead: null,
    ...reason,
    ...extra,
  });
  const ack = { warrantyWarningAcknowledged: true };

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
  const effective = async (name = "ownerA") =>
    (await machines.detail(req(name), machine.id, "frequencies")) as MachineFrequencies;
  const item = (state: MachineFrequencies, code: string) =>
    state.items.find((i) => i.activityCode === code)!;
  const http = (name: string, method: string, path: string, payload: unknown, version = "1") =>
    fetch(`${baseUrl}/v1/${path}`, {
      method,
      headers: {
        authorization: `Bearer ${name}`,
        "x-ice24-context-id": actors.get(name)!.context,
        "content-type": "application/json",
        "idempotency-key": randomUUID(),
        "if-match": version,
      },
      body: JSON.stringify(payload),
    });
  const machineState = async () =>
    (
      await pool.query(
        `select sanitary_status,publication_status,technical_status,operational_status,row_version
        from equipment.machines where id=$1`,
        [machine.id],
      )
    ).rows[0] as Record<string, unknown>;
  const scheduleCount = async () =>
    (
      await pool.query<{ n: number }>(
        `select (select count(*) from equipment.schedule_jobs where machine_id=$1)
          + (select count(*) from equipment.scheduled_activities where machine_id=$1) as n`,
        [machine.id],
      )
    ).rows[0]!.n;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon;create role authenticated;create role service_role;");
    for (const migration of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
      "20260924000100_phase5_subscriptions.sql",
      "20260929000100_phase5_checkout_intents.sql",
      "20260929000200_phase5_stripe_webhooks.sql",
      "20261002000100_phase5_audit.sql",
      "20261002000200_phase5_audit_producers.sql",
      "20261003000100_phase5_outbox.sql",
      "20261009000100_phase4_account_catalog.sql",
      "20261010000100_phase4_machine_components.sql",
      "20261011000100_phase4_frequency_overrides.sql",
      "20261012000100_phase4_schedule_recalc.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    accounts = new AccountsStore(db);
    templates = new TemplatesStore(db);
    requests = new RequestsStore(db);
    machines = new MachinesStore(db);
    transfers = new TransfersStore(db);
    catalog = new AccountCatalogStore(db);
    components = new MachineComponentsStore(db);
    frequencies = new FrequencyOverridesStore(db);
    for (const [id, name] of [
      [a, "A"],
      [b, "B"],
      [platform, "ICE24"],
    ])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [id, name],
      );
    for (const [name, account, role] of [
      ["ownerA", a, "OW"],
      ["ownerB", b, "OW"],
      ["admin", platform, "IA"],
      ["readerA", a, "AU"],
      ["operatorA1", a, "OP"],
      ["operatorA2", a, "OP"],
    ] as const) {
      const user = randomUUID(),
        membership = randomUUID(),
        context = randomUUID();
      actors.set(name, { user, context, membership });
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
      if (role !== "OP")
        await pool.query(
          "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
          [membership],
        );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
        [context, user, account, membership],
      );
    }
    branchA1 = (await accounts.branches(req("ownerA"), branchData)) as RecordRow;
    branchA2 = (await accounts.branches(req("ownerA"), {
      ...branchData,
      name: "QA second branch",
    })) as RecordRow;
    branchB = (await accounts.branches(req("ownerB"), branchData)) as RecordRow;
    // Operators are branch administrators: BRANCH scope only (RA-01-D2).
    for (const [name, branchRow] of [
      ["operatorA1", branchA1],
      ["operatorA2", branchA2],
    ] as const)
      await pool.query(
        "insert into authz.user_scopes(membership_id,scope_type,branch_id) values($1,'BRANCH',$2)",
        [actors.get(name)!.membership, branchRow.id],
      );
    for (const [key, kind] of [
      ["MFG", "manufacturer"],
      ["SYS", "system"],
      ["CMP1", "component"],
      ["CMP2", "component"],
    ] as const)
      ids[key] = (
        (await templates.catalog(req("admin"), { code: key, name: key, kind })) as RecordRow
      ).id;
    // RA-01-D3: the client's own component brings its own activity and default frequency.
    ids.UV_A = (
      await catalog.create(req("ownerA"), {
        code: "UV",
        kind: "component",
        name: "UV propio A",
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
    const model = (await templates.models(req("admin"), {
      code: "MODEL",
      name: "Test model",
      manufacturerId: ids.MFG,
      equipmentType: "water_vending",
      nominalCapacity: 450,
      characteristics: {},
    })) as RecordRow;
    let template = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Initial test definition",
      systems: [ids.SYS],
      components: [ids.CMP1, ids.CMP2],
      activities: [
        activity("CLEAN", "sanitation", "time", 7),
        activity("FILTER", "maintenance", "time", 30),
        activity("METER", "maintenance", "usage", null),
      ],
    })) as RecordRow;
    template = await templates.template(
      req("admin", template.row_version),
      template.id,
      reason,
      "publish",
    );
    templateId = template.id;
    await pool.query(
      "insert into equipment.files(id,account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key,status,scan_reference) values($1,$2,$3,'test.pdf','application/pdf',10,'test','test','clean','fixture')",
      [fileId, a, actors.get("ownerA")!.user],
    );
    let draft = await requests.save(req("ownerA"), {
      branchId: branchA1.id,
      manufacturerId: ids.MFG,
      modelName: "Synthetic",
      serialNumber: "QA-020",
      capacity: 450,
      fileIds: [fileId],
    });
    draft = await requests.transition(req("ownerA", draft.row_version), draft.id, reason, "submit");
    machine = (
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
    await components.add(req("ownerA"), machine.id, { componentCatalogId: ids.UV_A, ...reason });
    machineBefore = await machineState();
    schedulesBefore = await scheduleCount();

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module: (metadata: unknown) => ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create: (module: unknown, options: unknown) => Promise<typeof httpApp> };
    };
    class TestModule {}
    Module({
      controllers: [FrequencyOverridesController],
      providers: [
        AuthenticationGuard,
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify: async (token: string) => {
              if (!actors.has(token)) throw new Error("Invalid fixture token");
              return req(token).identityClaims;
            },
          },
        },
        { provide: IdentityStore, useValue: identity },
        { provide: FrequencyOverridesStore, useValue: frequencies },
      ],
    })(TestModule);
    httpApp = await NestFactory.create(TestModule, { logger: false });
    httpApp.setGlobalPrefix("v1");
    await httpApp.listen(0, "127.0.0.1");
    baseUrl = await httpApp.getUrl();
  });
  afterAll(async () => {
    await httpApp?.close();
    await db?.onModuleDestroy();
    if (!httpApp) await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
  });

  it("uses exactly the template values when the client defines nothing", async () => {
    const state = await effective("readerA");
    expect(state.items.map((i) => i.activityCode)).toEqual(["CLEAN", "FILTER", "UV-LAMP"]);
    expect(item(state, "CLEAN")).toMatchObject({
      componentCatalogId: null,
      activityType: "SANITATION",
      frequency: days(7),
      alertLead: null,
      source: "TEMPLATE",
      factory: { frequency: days(7), alertLead: null },
      differsFromFactory: false,
      warrantyApplies: true,
      accountOverride: null,
      machineOverride: null,
    });
    expect(item(state, "FILTER")).toMatchObject({
      activityType: "MAINTENANCE",
      frequency: days(30),
    });
    // The client's own component (RA-01-D3): its default, without a warranty warning.
    expect(item(state, "UV-LAMP")).toMatchObject({
      componentCatalogId: ids.UV_A,
      frequency: { value: 6, unit: "months" },
      warrantyApplies: false,
    });
  });

  it("requires the warranty acknowledgement only when leaving the ICE24 factory value (RA-01-D1)", async () => {
    // Same interval written differently: no warning, nothing to acknowledge.
    const same = await frequencies.set(
      req("ownerA"),
      "MACHINE",
      machine.id,
      body("CLEAN", { value: 1, unit: "weeks" }),
      "create",
    );
    expect(same).toMatchObject({ version: 1, warrantyWarningAcknowledgedAt: null });
    const missing = await frequencies
      .set(req("ownerA", 1), "MACHINE", machine.id, body("CLEAN", days(10)), "update")
      .catch((error: unknown) => error);
    expect(missing).toBeInstanceOf(WarrantyWarningRequiredException);
    const response = await http(
      "ownerA",
      "PUT",
      `machines/${machine.id}/frequency-overrides`,
      body("CLEAN", days(10)),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: {
        code: "WARRANTY_WARNING_CONFIRMATION_REQUIRED",
        details: { factoryFrequencies: [days(7)] },
      },
    });
    // No minimum blocks the client: one day is valid once acknowledged.
    const changed = await frequencies.set(
      req("ownerA", 1),
      "MACHINE",
      machine.id,
      body("CLEAN", days(1), ack),
      "update",
    );
    expect(changed).toMatchObject({
      version: 2,
      frequency: days(1),
      factoryFrequencies: [days(7)],
    });
    expect(changed.warrantyWarningAcknowledgedAt).not.toBeNull();
    const audited = (
      await pool.query(
        `select reason,after_data->'overrides'->0->>'warranty_warning_acknowledged_at' as acknowledged,
          before_data->'overrides'->0->>'frequency_value' as before_value
        from equipment.events where resource_id=$1 and event_type='MACHINE_FREQUENCIES_CHANGED'
        order by occurred_at desc limit 1`,
        [machine.id],
      )
    ).rows[0];
    expect(audited).toMatchObject({ reason: reason.reason, before_value: "1" });
    expect(audited.acknowledged).not.toBeNull();
    // The client's own component has no ICE24 factory value, so no warranty warning applies.
    const own = await frequencies.set(
      req("ownerA"),
      "MACHINE",
      machine.id,
      body("UV-LAMP", { value: 3, unit: "months" }, {}, ids.UV_A),
      "create",
    );
    expect(own).toMatchObject({
      warrantyWarningAcknowledgedAt: null,
      componentCatalogId: ids.UV_A,
    });
    // Usage-based activities have no frequency to override.
    await expect(
      frequencies.set(req("ownerA"), "MACHINE", machine.id, body("METER", days(5), ack), "create"),
    ).rejects.toThrow("Resource not found");
  });

  it("resolves machine → account → template and keeps the factory value", async () => {
    await frequencies.set(
      req("ownerA"),
      "ACCOUNT",
      null,
      body("FILTER", { value: 2, unit: "weeks" }, ack),
      "create",
    );
    let filter = item(await effective(), "FILTER");
    expect(filter).toMatchObject({
      frequency: { value: 2, unit: "weeks" },
      source: "ACCOUNT",
      factory: { frequency: days(30) },
      differsFromFactory: true,
      machineOverride: null,
    });
    expect(filter.accountOverride).toMatchObject({ scope: "ACCOUNT", machineId: null, version: 1 });
    await frequencies.set(
      req("ownerA"),
      "MACHINE",
      machine.id,
      body("FILTER", days(30), { alertLead: { value: 3, unit: "days" } }),
      "create",
    );
    filter = item(await effective(), "FILTER");
    expect(filter).toMatchObject({
      frequency: days(30),
      alertLead: days(3),
      source: "MACHINE",
      alertSource: "MACHINE",
      differsFromFactory: false,
    });
    expect(item(await effective(), "CLEAN")).toMatchObject({
      frequency: days(1),
      source: "MACHINE",
    });
    // The official template is never modified.
    const definition = (
      await pool.query("select definition from equipment.template_versions where id=$1", [
        templateId,
      ])
    ).rows[0].definition as { activities: { code: string; frequencyDays: number }[] };
    expect(definition.activities.map((x) => [x.code, x.frequencyDays])).toEqual([
      ["CLEAN", 7],
      ["FILTER", 30],
      ["METER", null],
    ]);
  });

  it("applies RA-01-D2: account frequencies by the owner, machine ones also by the branch Operator", async () => {
    const operator = await frequencies.set(
      req("operatorA1", 1),
      "MACHINE",
      machine.id,
      body("FILTER", days(45), ack),
      "update",
    );
    expect(operator).toMatchObject({ version: 2, actorId: actors.get("operatorA1")!.user });
    for (const name of ["operatorA2", "readerA", "admin"])
      await expect(
        frequencies.set(
          req(name, 2),
          "MACHINE",
          machine.id,
          body("FILTER", days(50), ack),
          "update",
        ),
      ).rejects.toThrow("not authorized");
    for (const name of ["operatorA1", "readerA", "admin"])
      await expect(
        frequencies.set(req(name), "ACCOUNT", null, body("CLEAN", days(5), ack), "create"),
      ).rejects.toThrow("not authorized");
    await expect(frequencies.reset(req("operatorA1"), "ACCOUNT", null, reason)).rejects.toThrow(
      "not authorized",
    );
    const branchDenied = await http(
      "operatorA2",
      "PUT",
      `machines/${machine.id}/frequency-overrides`,
      body("FILTER", days(50), ack),
      "2",
    );
    expect(branchDenied.status).toBe(403);
    expect(((await branchDenied.json()) as { error: { code: string } }).error.code).toBe(
      "FORBIDDEN",
    );
    const accountDenied = await http(
      "operatorA1",
      "POST",
      "account-frequency-overrides",
      body("CLEAN", days(5), ack),
    );
    expect(accountDenied.status).toBe(403);
    expect(item(await effective(), "FILTER")).toMatchObject({ frequency: days(45) });
  });

  it("isolates frequencies between accounts", async () => {
    await expect(effective("ownerB")).rejects.toThrow("Resource not found");
    await expect(
      frequencies.set(req("ownerB"), "MACHINE", machine.id, body("CLEAN", days(5), ack), "create"),
    ).rejects.toThrow("Resource not found");
    // Account B has no machine using the template activity, nor A's component.
    await expect(
      frequencies.set(req("ownerB"), "ACCOUNT", null, body("CLEAN", days(5), ack), "create"),
    ).rejects.toThrow("Resource not found");
    await expect(
      frequencies.set(
        req("ownerB"),
        "ACCOUNT",
        null,
        body("UV-LAMP", days(5), {}, ids.UV_A),
        "create",
      ),
    ).rejects.toThrow("Resource not found");
    expect((await frequencies.listAccount(req("ownerB"))).current).toEqual([]);
    expect(
      (await frequencies.listAccount(req("readerA"))).current.map((o) => o.activityCode),
    ).toEqual(["FILTER"]);
  });

  it("versions every edit: one of two concurrent edits wins, replay is idempotent", async () => {
    const machineEdits = await Promise.allSettled([
      frequencies.set(
        req("ownerA", 2),
        "MACHINE",
        machine.id,
        body("CLEAN", days(2), ack),
        "update",
      ),
      frequencies.set(
        req("operatorA1", 2),
        "MACHINE",
        machine.id,
        body("CLEAN", days(3), ack),
        "update",
      ),
    ]);
    expect(machineEdits.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      String((machineEdits.find((r) => r.status === "rejected") as PromiseRejectedResult).reason),
    ).toContain("Version conflict");
    const accountEdits = await Promise.allSettled([
      frequencies.set(req("ownerA", 1), "ACCOUNT", null, body("FILTER", days(20), ack), "update"),
      frequencies.set(req("ownerA", 1), "ACCOUNT", null, body("FILTER", days(21), ack), "update"),
    ]);
    expect(accountEdits.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      String((accountEdits.find((r) => r.status === "rejected") as PromiseRejectedResult).reason),
    ).toContain("Version conflict");
    const stale = await http(
      "ownerA",
      "PUT",
      "account-frequency-overrides",
      body("FILTER", days(22), ack),
      "1",
    );
    expect(stale.status).toBe(412);
    const key = randomUUID();
    const edited = await frequencies.set(
      req("ownerA", 3, key),
      "MACHINE",
      machine.id,
      body("CLEAN", days(4), ack),
      "update",
    );
    const replay = await frequencies.set(
      req("ownerA", 3, key),
      "MACHINE",
      machine.id,
      body("CLEAN", days(4), ack),
      "update",
    );
    expect(replay).toEqual(edited);
    await expect(
      frequencies.set(req("ownerA"), "MACHINE", machine.id, body("CLEAN", days(4), ack), "create"),
    ).rejects.toThrow("already defined");
    const versions = (
      await pool.query(
        `select row_version,valid_from,valid_to from equipment.maintenance_frequency_overrides
        where machine_id=$1 and activity_code='CLEAN' order by row_version`,
        [machine.id],
      )
    ).rows;
    expect(versions.map((v) => v.row_version)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < versions.length; i++)
      expect(versions[i - 1].valid_to).toEqual(versions[i].valid_from);
    await expect(
      pool.query("delete from equipment.maintenance_frequency_overrides where machine_id=$1", [
        machine.id,
      ]),
    ).rejects.toThrow("History cannot be deleted");
    await expect(
      pool.query(
        "update equipment.maintenance_frequency_overrides set frequency_value=99 where machine_id=$1",
        [machine.id],
      ),
    ).rejects.toThrow("Only closing an open frequency override is allowed");
  });

  it("restores factory values by component, by activity, by machine and by account", async () => {
    const byComponent = await frequencies.reset(req("ownerA"), "MACHINE", machine.id, {
      ...reason,
      componentCatalogId: ids.UV_A,
    });
    expect(byComponent.closed.map((o) => o.activityCode)).toEqual(["UV-LAMP"]);
    let state = await effective();
    expect(item(state, "UV-LAMP")).toMatchObject({
      source: "TEMPLATE",
      frequency: { value: 6, unit: "months" },
    });
    expect(item(state, "CLEAN").source).toBe("MACHINE");
    const byActivity = await frequencies.reset(req("operatorA1"), "MACHINE", machine.id, {
      ...reason,
      activityCode: "CLEAN",
    });
    expect(byActivity.closed.map((o) => o.activityCode)).toEqual(["CLEAN"]);
    const byMachine = await frequencies.reset(req("ownerA"), "MACHINE", machine.id, reason);
    expect(byMachine.closed.map((o) => o.activityCode)).toEqual(["FILTER"]);
    state = await effective();
    expect(item(state, "CLEAN")).toMatchObject({ source: "TEMPLATE", frequency: days(7) });
    // The account value applies again once the machine value is restored.
    expect(item(state, "FILTER").source).toBe("ACCOUNT");
    const byAccount = await frequencies.reset(req("ownerA"), "ACCOUNT", null, reason);
    expect(byAccount.closed).toHaveLength(1);
    state = await effective();
    expect(state.items.every((i) => i.source === "TEMPLATE" && !i.differsFromFactory)).toBe(true);
    expect((await frequencies.reset(req("ownerA"), "ACCOUNT", null, reason)).closed).toEqual([]);
    // Restoring closes; the client's values and the factory snapshot stay as evidence.
    const kept = (
      await pool.query(
        `select count(*)::int as total,count(*) filter (where valid_to is null)::int as open,
          bool_and(jsonb_array_length(factory_frequencies)=1) as factory
        from equipment.maintenance_frequency_overrides where account_id=$1`,
        [a],
      )
    ).rows[0];
    expect(kept).toMatchObject({ open: 0, factory: true });
    expect(kept.total).toBeGreaterThanOrEqual(9);
  });

  it("emits frequencies-changed through the outbox and does not recalculate calendars", async () => {
    const events = (
      await pool.query(
        `select event_type,aggregate_id,payload from infra.outbox_events
        where event_type in ('MachineFrequenciesChanged','AccountFrequenciesChanged') order by occurred_at,id`,
      )
    ).rows as { event_type: string; aggregate_id: string; payload: Record<string, unknown> }[];
    const machineEvents = events.filter((e) => e.event_type === "MachineFrequenciesChanged");
    expect(machineEvents.every((e) => e.aggregate_id === machine.id)).toBe(true);
    expect(machineEvents.map((e) => e.payload.operation)).toEqual(
      expect.arrayContaining(["CREATE", "UPDATE", "RESET"]),
    );
    expect(machineEvents[0]!.payload.machineIds).toEqual([machine.id]);
    const accountEvents = events.filter((e) => e.event_type === "AccountFrequenciesChanged");
    expect(accountEvents.length).toBeGreaterThanOrEqual(3);
    expect(accountEvents.every((e) => e.aggregate_id === a)).toBe(true);
    expect(accountEvents[0]!.payload).toMatchObject({
      operation: "CREATE",
      machineIds: [machine.id],
    });
    // F4-21 consumes the event; this task leaves schedules untouched.
    expect(await scheduleCount()).toBe(schedulesBefore);
  });

  it("never changes the sanitary indicator nor the public portal (RA-01-D4)", async () => {
    await frequencies.set(
      req("ownerA"),
      "MACHINE",
      machine.id,
      body("CLEAN", { value: 6, unit: "months" }, ack),
      "create",
    );
    await frequencies.set(
      req("ownerA"),
      "ACCOUNT",
      null,
      body("CLEAN", { value: 1, unit: "months" }, ack),
      "create",
    );
    await frequencies.reset(req("ownerA"), "ACCOUNT", null, reason);
    expect(await machineState()).toEqual(machineBefore);
  });

  it("closes the former owner's machine frequencies on transfer; the new owner starts from factory", async () => {
    const before = (await machines.detail(req("ownerA"), machine.id)) as RecordRow;
    const transfer = await transfers.create(req("ownerA", before.row_version), {
      ...reason,
      machineId: machine.id,
      toAccountId: b,
      toBranchId: branchB.id,
      commercialDataTransfer: { sales: false, customers: false, recharges: false, orders: false },
      authorizationFileIds: [],
    });
    const approved = await transfers.transition(
      req("admin", transfer.row_version),
      transfer.id,
      reason,
      "approve",
    );
    await transfers.transition(req("admin", approved.row_version), transfer.id, reason, "execute");
    await expect(effective("ownerA")).rejects.toThrow("Resource not found");
    const state = await effective("ownerB");
    expect(state.items.map((i) => i.activityCode)).toEqual(["CLEAN", "FILTER"]);
    expect(state.items.every((i) => i.source === "TEMPLATE" && i.machineOverride === null)).toBe(
      true,
    );
    expect(
      (
        await pool.query(
          "select count(*)::int as n from equipment.maintenance_frequency_overrides where machine_id=$1 and valid_to is null",
          [machine.id],
        )
      ).rows[0].n,
    ).toBe(0);
    const closed = (
      await pool.query(
        "select account_id,payload from infra.outbox_events where event_type='MachineFrequenciesChanged' order by occurred_at desc,id limit 1",
      )
    ).rows[0];
    expect(closed).toMatchObject({ account_id: a, payload: { operation: "TRANSFER_CLOSED" } });
  });
});
