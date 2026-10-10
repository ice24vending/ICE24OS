import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes, createCipheriv, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createScheduleObserver } from "@ice24/observability";
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
import { MembersStore } from "../../apps/api/src/modules/equipment/members.store.js";
import { FilesStore } from "../../apps/api/src/modules/equipment/files.store.js";
import { AccountCatalogStore } from "../../apps/api/src/modules/equipment/account-catalog.store.js";
import { MachineComponentsStore } from "../../apps/api/src/modules/equipment/machine-components.store.js";
import {
  FrequencyOverridesStore,
  WarrantyWarningRequiredException,
} from "../../apps/api/src/modules/equipment/frequency-overrides.store.js";
import { EquipmentController } from "../../apps/api/src/modules/equipment/equipment.controller.js";
import { AccountCatalogController } from "../../apps/api/src/modules/equipment/account-catalog.controller.js";
import { MachineComponentsController } from "../../apps/api/src/modules/equipment/machine-components.controller.js";
import { FrequencyOverridesController } from "../../apps/api/src/modules/equipment/frequency-overrides.controller.js";
import { SupabaseAdminClient } from "../../apps/api/src/modules/identity/supabase-admin.client.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { InputValidationFilter } from "../../apps/api/src/common/security/input-validation.filter.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { processScheduleBatch } from "../../apps/worker/src/processors/scheduling.js";
import { scheduleRecalcConsumer } from "../../apps/worker/src/processors/schedule-recalc.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

const BACKFILL = "20261013000100_phase4_components_backfill.sql";
const MARKER = "F4-22 backfill: componentes por defecto de la plantilla";

// TASK-F4-22: component and frequency UI on the real stack (Nest API, BFF, Next.js build,
// outbox → recalculation worker) plus the backfill migration of machines activated before F4-19.
describe("TASK-F4-22 components and frequencies UI and backfill", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let accounts: AccountsStore;
  let templates: TemplatesStore;
  let requests: RequestsStore;
  let frequencies: FrequencyOverridesStore;
  let httpApp: {
    listen(port: number, host: string): Promise<void>;
    getUrl(): Promise<string>;
    close(): Promise<void>;
    setGlobalPrefix(prefix: string): void;
    useGlobalFilters(filter: unknown): void;
  };
  let baseUrl: string;
  let webProcess: ChildProcess | undefined;
  const oldUrl = process.env.DATABASE_URL;
  const a = randomUUID(),
    platform = randomUUID();
  const actors = new Map<string, { user: string; context: string }>();
  const ids = {} as Record<"MFG" | "SYS" | "CMP", string>;
  let model: RecordRow, template: RecordRow, branchA: RecordRow, branchB: RecordRow;
  let m1: RecordRow, m2: RecordRow;
  const legacy = randomUUID();
  const observer = createScheduleObserver({
    service: "worker",
    environment: "test",
    log: () => undefined,
  });
  const reason = { reason: "Integration test evidence", confirmation: true };
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const activity = (code: string, name: string, frequencyDays: number) => ({
    code,
    name,
    category: code === "CLEAN" ? "sanitation" : "maintenance",
    triggerType: "time",
    frequencyDays,
    triggerDescription: "",
    responsibleRole: "SA",
    checklist: [{ code: "CHECK", label: "Verificar", required: true }],
    fields: [],
    evidenceRules: { required: false, minimumFiles: 0 },
    escalationRules: { afterHours: 24, notifyRole: "OW" },
    criticality: "high",
  });
  const branchData = (name: string) => ({
    name,
    address: "Synthetic test address",
    latitude: 19.4,
    longitude: -99.1,
    timezone: "America/Mexico_City",
    schedule: "09:00–17:00",
    publicPhone: "",
    ownerPhonePublic: false,
    referenceTemperature: null,
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
  async function actor(
    name: string,
    account: string,
    role: string,
    branch: string | null = null,
  ): Promise<void> {
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
      branch
        ? "insert into authz.user_scopes(membership_id,scope_type,branch_id) values($1,'BRANCH',$2)"
        : "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      branch ? [membership, branch] : [membership],
    );
    await pool.query(
      "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
      [context, user, account, membership],
    );
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
  async function activate(serial: string, branchId: string): Promise<RecordRow> {
    const fileId = randomUUID();
    await pool.query(
      "insert into equipment.files(id,account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key,status,scan_reference) values($1,$2,$3,'test.pdf','application/pdf',10,'test',$4,'clean','fixture')",
      [fileId, a, actors.get("ownerA")!.user, `fixture-${fileId}`],
    );
    let draft = await requests.save(req("ownerA"), {
      branchId,
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
  /** Calendar rows that a migration must never touch. */
  const calendar = async () =>
    (
      await pool.query(
        `select id,machine_id,activity_code,status,due_at,alert_at,definition
        from equipment.scheduled_activities order by id`,
      )
    ).rows;
  const pendingDue = async (machineId: string, code: string) =>
    (
      await pool.query<{ due_at: Date; definition: { schedule: { source: string } | null } }>(
        `select due_at,definition from equipment.scheduled_activities
        where machine_id=$1 and activity_code=$2 and status='pending' and component_catalog_id is null`,
        [machineId, code],
      )
    ).rows;

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
      BACKFILL,
    ])
      await pool.query(await migration(file));
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    accounts = new AccountsStore(db);
    templates = new TemplatesStore(db);
    requests = new RequestsStore(db);
    frequencies = new FrequencyOverridesStore(db);
    for (const [id, name] of [
      [a, "A"],
      [platform, "ICE24"],
    ])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [id, name],
      );
    await actor("ownerA", a, "OW");
    await actor("admin", platform, "IA");
    await actor("techA", a, "TC");
    await actor("auditorA", a, "AU");
    branchA = (await accounts.branches(req("ownerA"), branchData("Sucursal Centro"))) as RecordRow;
    branchB = (await accounts.branches(req("ownerA"), branchData("Sucursal Norte"))) as RecordRow;
    await actor("operatorA", a, "OP", branchA.id);
    for (const [key, kind] of [
      ["MFG", "manufacturer"],
      ["SYS", "system"],
      ["CMP", "component"],
    ] as const)
      ids[key] = (
        (await templates.catalog(req("admin"), {
          code: key,
          name: key === "CMP" ? "Compresor" : key,
          kind,
        })) as RecordRow
      ).id;
    model = (await templates.models(req("admin"), {
      code: "M450",
      name: "ICE24 450",
      manufacturerId: ids.MFG,
      equipmentType: "ice_450",
      nominalCapacity: 450,
      characteristics: {},
    })) as RecordRow;
    template = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Initial test definition",
      systems: [ids.SYS],
      components: [ids.CMP],
      activities: [activity("CLEAN", "Limpieza", 7), activity("FILTER", "Cambio de filtro", 30)],
    })) as RecordRow;
    template = await templates.template(
      req("admin", template.row_version),
      template.id,
      reason,
      "publish",
    );
    m1 = await activate("SERIAL-1", branchA.id);
    m2 = await activate("SERIAL-2", branchB.id);
    await pump();

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module: (metadata: unknown) => ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create: (module: unknown, options: unknown) => Promise<typeof httpApp> };
    };
    class TestModule {}
    Module({
      controllers: [
        EquipmentController,
        AccountCatalogController,
        MachineComponentsController,
        FrequencyOverridesController,
      ],
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
        { provide: AccountsStore, useValue: accounts },
        { provide: TemplatesStore, useValue: templates },
        { provide: RequestsStore, useValue: requests },
        { provide: MachinesStore, useValue: new MachinesStore(db) },
        { provide: TransfersStore, useValue: new TransfersStore(db) },
        { provide: MembersStore, useValue: new MembersStore(db, new SupabaseAdminClient()) },
        { provide: FilesStore, useValue: new FilesStore(db) },
        { provide: AccountCatalogStore, useValue: new AccountCatalogStore(db) },
        { provide: MachineComponentsStore, useValue: new MachineComponentsStore(db) },
        { provide: FrequencyOverridesStore, useValue: frequencies },
      ],
    })(TestModule);
    httpApp = await NestFactory.create(TestModule, { logger: false });
    httpApp.setGlobalPrefix("v1");
    httpApp.useGlobalFilters(new InputValidationFilter());
    await httpApp.listen(0, "127.0.0.1");
    baseUrl = await httpApp.getUrl();
  }, 180_000);
  afterAll(async () => {
    webProcess?.kill();
    await httpApp?.close();
    await db?.onModuleDestroy();
    if (!httpApp) await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
  });

  it("backfills legacy machines with their template defaults, no overrides and no date change", async () => {
    // A machine activated before F4-19: same data as m2 but without configuration rows.
    const request = randomUUID();
    await pool.query(
      `insert into equipment.requests select (jsonb_populate_record(null::equipment.requests,
        to_jsonb(r) || jsonb_build_object('id',$2::uuid,'folio',r.folio||'-LEGACY'))).*
      from equipment.requests r where r.id=$1`,
      [m2.request_id, request],
    );
    await pool.query(
      `insert into equipment.machines select (jsonb_populate_record(null::equipment.machines,
        to_jsonb(m) || jsonb_build_object('id',$2::uuid,'machine_code',m.machine_code||'-L','request_id',$3::uuid))).*
      from equipment.machines m where m.id=$1`,
      [m2.id, legacy, request],
    );
    await pool.query(
      `insert into equipment.machine_periods(machine_id,kind,reference_id,valid_from,actor_id,reason)
      select $2,kind,reference_id,valid_from,actor_id,reason from equipment.machine_periods
      where machine_id=$1 and valid_to is null`,
      [m2.id, legacy],
    );
    await pool.query(
      `insert into equipment.scheduled_activities(machine_id,template_id,activity_code,definition,due_at,status,generation_key)
      select $2,template_id,activity_code,definition - 'schedule',due_at,status,generation_key
      from equipment.scheduled_activities where machine_id=$1`,
      [m2.id, legacy],
    );
    const counts = async () =>
      (
        await pool.query<{
          configs: string;
          overrides: string;
          events: string;
          outbox: string;
          jobs: string;
        }>(
          `select (select count(*) from equipment.machine_component_configs) configs,
            (select count(*) from equipment.maintenance_frequency_overrides) overrides,
            (select count(*) from equipment.events) events,
            (select count(*) from infra.outbox_events) outbox,
            (select count(*) from equipment.schedule_jobs) jobs`,
        )
      ).rows[0]!;
    const before = await calendar();
    const beforeCounts = await counts();
    const preloaded = (
      await pool.query("select * from equipment.machine_component_configs order by id")
    ).rows;

    await pool.query(await migration(BACKFILL));

    const rows = (
      await pool.query("select * from equipment.machine_component_configs where machine_id=$1", [
        legacy,
      ])
    ).rows;
    const owner = (
      await pool.query(
        "select actor_id,valid_from from equipment.machine_periods where machine_id=$1 and kind='ownership' and valid_to is null",
        [legacy],
      )
    ).rows[0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      component_catalog_id: ids.CMP,
      origin: "TEMPLATE_DEFAULT",
      status: "active",
      valid_to: null,
      row_version: 1,
      reason: MARKER,
      actor_id: owner.actor_id,
    });
    expect(rows[0].valid_from.getTime()).toBeGreaterThanOrEqual(owner.valid_from.getTime());
    // Machines preloaded by F4-19 are untouched; nothing else is written.
    expect(
      (
        await pool.query(
          "select * from equipment.machine_component_configs where machine_id<>$1 order by id",
          [legacy],
        )
      ).rows,
    ).toEqual(preloaded);
    const afterCounts = await counts();
    expect(afterCounts).toEqual({
      ...beforeCounts,
      configs: String(Number(beforeCounts.configs) + 1),
    });
    expect(await calendar()).toEqual(before);

    // Idempotent: a second run inserts nothing; the worker has nothing to recalculate.
    await pool.query(await migration(BACKFILL));
    await pump();
    expect(await counts()).toEqual(afterCounts);
    expect(await calendar()).toEqual(before);
    // The API shows it like any preloaded machine.
    const listed = (await new MachinesStore(db).detail(req("ownerA"), legacy, "components")) as {
      current: { origin: string; component: { name: string } }[];
    };
    expect(listed.current).toMatchObject([
      { origin: "TEMPLATE_DEFAULT", component: { name: "Compresor" } },
    ]);
  });

  it("tells each role which controls it gets (RA-01-D2)", async () => {
    const config = async (name: string) =>
      ((await accounts.workspace(req(name))) as { configuration: unknown }).configuration;
    expect(await config("ownerA")).toEqual({
      accountCatalog: true,
      accountFrequencies: "edit",
      machineBranches: "ALL",
    });
    expect(await config("operatorA")).toEqual({
      accountCatalog: false,
      accountFrequencies: "hidden",
      machineBranches: [branchA.id],
    });
    for (const name of ["techA", "auditorA"])
      expect(await config(name)).toEqual({
        accountCatalog: false,
        accountFrequencies: "read",
        machineBranches: [],
      });
  });

  it("applies and resets a frequency on every machine of a model, audited per machine", async () => {
    const view = await frequencies.modelFrequencies(req("ownerA"), model.id);
    expect(view.machineCount).toBe(3);
    expect(view.items.map((i) => [i.activityCode, i.factoryFrequencies])).toEqual([
      ["CLEAN", [{ value: 7, unit: "days" }]],
      ["FILTER", [{ value: 30, unit: "days" }]],
    ]);
    expect(view.items[0]!.machines.every((m) => m.source === "TEMPLATE")).toBe(true);
    expect((await frequencies.modelFrequencies(req("techA"), model.id)).machineCount).toBe(3);
    await expect(frequencies.modelFrequencies(req("operatorA"), model.id)).rejects.toThrow(
      "not authorized",
    );
    const body = {
      activityCode: "FILTER",
      frequency: { value: 45, unit: "days" },
      alertLead: { value: 3, unit: "days" },
      ...reason,
    };
    await expect(frequencies.applyModel(req("ownerA"), model.id, body)).rejects.toBeInstanceOf(
      WarrantyWarningRequiredException,
    );
    for (const name of ["operatorA", "techA", "auditorA"])
      await expect(
        frequencies.applyModel(req(name), model.id, { ...body, warrantyWarningAcknowledged: true }),
      ).rejects.toThrow("not authorized");
    const events = async () =>
      Number(
        (
          await pool.query(
            "select count(*) from equipment.events where event_type='MACHINE_FREQUENCIES_CHANGED'",
          )
        ).rows[0].count,
      );
    const eventsBefore = await events();
    const key = randomUUID();
    const applied = await frequencies.applyModel(req("ownerA", 1, key), model.id, {
      ...body,
      warrantyWarningAcknowledged: true,
    });
    expect(applied.applied).toHaveLength(3);
    expect(applied.skippedMachineIds).toEqual([]);
    expect(applied.applied.every((o) => o.warrantyWarningAcknowledgedAt !== null)).toBe(true);
    expect(await events()).toBe(eventsBefore + 3);
    // Idempotent replay.
    expect(
      await frequencies.applyModel(req("ownerA", 1, key), model.id, {
        ...body,
        warrantyWarningAcknowledged: true,
      }),
    ).toEqual(applied);
    await pump();
    for (const machine of [m1.id, m2.id, legacy]) {
      const [row] = await pendingDue(machine, "FILTER");
      expect(row!.definition.schedule?.source).toBe("MACHINE");
    }
    const after = await frequencies.modelFrequencies(req("ownerA"), model.id);
    expect(after.items[1]!.machines.every((m) => m.source === "MACHINE")).toBe(true);

    const reset = await frequencies.resetModel(req("ownerA"), model.id, {
      activityCode: "FILTER",
      ...reason,
    });
    expect(reset.closed).toHaveLength(3);
    await pump();
    for (const machine of [m1.id, m2.id, legacy]) {
      const [row] = await pendingDue(machine, "FILTER");
      expect(row!.definition.schedule?.source).toBe("TEMPLATE");
    }
    await expect(frequencies.resetModel(req("operatorA"), model.id, reason)).rejects.toThrow(
      "not authorized",
    );
    // Over HTTP the denial is the standard API error.
    const response = await fetch(`${baseUrl}/v1/technical-models/${model.id}/frequencies`, {
      headers: {
        authorization: "Bearer operatorA",
        "x-ice24-context-id": actors.get("operatorA")!.context,
      },
    });
    expect(response.status).toBe(403);
  });

  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "owner, Operator and technician flows in the browser",
    async () => {
      const secret = randomBytes(32).toString("hex");
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const port = (listener.address() as { port: number }).port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`;
      const next = fileURLToPath(
        new URL("../../apps/private-web/node_modules/next/dist/bin/next", import.meta.url),
      );
      webProcess = spawn(
        process.execPath,
        [next, "start", "--port", String(port), "--hostname", "127.0.0.1"],
        {
          cwd: fileURLToPath(new URL("../../apps/private-web", import.meta.url)),
          env: {
            ...process.env,
            NODE_ENV: "production",
            PRIVATE_API_URL: `${baseUrl}/v1`,
            BFF_SESSION_SECRET: secret,
          },
          stdio: "pipe",
          windowsHide: true,
        },
      );
      let output = "";
      webProcess.stdout?.on("data", (chunk) => (output += String(chunk)));
      webProcess.stderr?.on("data", (chunk) => (output += String(chunk)));
      let ready = false;
      for (let attempt = 0; attempt < 150 && !ready; attempt++) {
        try {
          await fetch(origin);
          ready = true;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      if (!ready) throw new Error(`Private web did not start: ${output.slice(-1500)}`);
      function cookie(name: string) {
        const current = actors.get(name)!;
        const iv = randomBytes(12);
        const cipher = createCipheriv(
          "aes-256-gcm",
          createHash("sha256").update(secret).digest(),
          iv,
        );
        const value = Buffer.concat([
          cipher.update(
            JSON.stringify({
              accessToken: name,
              refreshToken: "synthetic-test-only",
              expiresAt: Date.now() + 3600000,
              csrfToken: "test-csrf-token",
              contextId: current.context,
            }),
          ),
          cipher.final(),
        ]);
        return {
          name: "__Host-ice24_session",
          value: [iv, cipher.getAuthTag(), value].map((v) => v.toString("base64url")).join("."),
          domain: "localhost",
          path: "/",
          secure: true,
          httpOnly: true,
          sameSite: "Lax" as const,
        };
      }
      const browser: Browser = await chromium.launch({ headless: true });
      async function login(name: string) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        await context.addCookies([cookie(name)]);
        const page = await context.newPage();
        await page.goto(`${origin}/workspace`);
        await page.getByRole("heading", { name: "Máquinas", exact: true }).waitFor();
        return { context, page };
      }
      async function openMachine(page: Page, code: string) {
        await page
          .locator("li", { hasText: code })
          .getByRole("button", { name: "Ver / editar" })
          .click();
        await page.getByRole("heading", { name: `Expediente ${code}` }).waitFor();
      }
      async function tab(page: Page, name: string) {
        await page.getByRole("tab", { name, exact: true }).click();
      }
      const form = (page: Page, summary: string) =>
        page.getByRole("group", { name: summary, exact: true });
      async function openForm(page: Page, summary: string) {
        await page.locator("summary", { hasText: summary }).first().click();
        return form(page, summary);
      }
      async function reasonAndConfirm(scope: ReturnType<typeof form>) {
        await scope
          .getByLabel("Motivo del cambio (al menos 10 caracteres)")
          .fill("Ajuste por calidad del agua en la zona");
        await scope.getByLabel("Confirmo que revisé los datos y deseo aplicar este cambio").check();
      }
      async function calendarText(page: Page) {
        await tab(page, "Calendario y trazabilidad");
        await page.getByRole("button", { name: "Calendario", exact: true }).click();
        return page.locator(".config-schedule");
      }
      const noHorizontalScroll = (page: Page) =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      const machineBody = {
        activityCode: "CLEAN",
        componentCatalogId: null,
        frequency: { value: 7, unit: "days" },
        alertLead: null,
        ...reason,
      };
      const bffWrite = (page: Page, name: string, path: string, body: unknown = machineBody) =>
        page.context().request.post(`${origin}/api/equipment`, {
          headers: { origin, "x-ice24-workspace-context": actors.get(name)!.context },
          multipart: {
            csrfToken: "test-csrf-token",
            path,
            method: "POST",
            body: JSON.stringify(body),
            key: randomUUID(),
          },
        });
      try {
        // ── Owner: own component → change frequency → warranty warning → calendar → reset.
        const owner = await login("ownerA");
        let page = owner.page;
        await openMachine(page, m1.machine_code);
        await tab(page, "Componentes");
        await page.getByText("Fábrica (plantilla del modelo)").first().waitFor();
        const create = await openForm(page, "Crear componente propio");
        await create.getByLabel("Código del componente").fill("UVX");
        await create.getByLabel("Nombre", { exact: true }).fill("Filtro UV");
        await create.getByLabel("Código de la actividad").fill("UV_LAMP");
        await create.getByLabel("Nombre de la actividad").fill("Cambio de lámpara UV");
        await create.getByLabel("Cada").fill("3");
        await create.getByLabel("Unidad").selectOption("months");
        await create
          .getByLabel("Pasos del checklist (uno por línea)")
          .fill("Apagar el equipo\nCambiar la lámpara\nRegistrar la serie");
        await reasonAndConfirm(create);
        await create.getByRole("button", { name: "Crear y agregar a la máquina" }).click();
        await page.getByText(/Componente propio creado y agregado/).waitFor();
        await page.getByRole("heading", { name: "Filtro UV", exact: true }).waitFor();
        await page.getByText("Propio de la cuenta").first().waitFor();

        await tab(page, "Frecuencias y alertas");
        await page.getByRole("heading", { name: "Componente propio: Filtro UV" }).waitFor();
        const change = await openForm(page, "Cambiar frecuencia de Limpieza");
        await change.getByLabel("Cada").first().fill("10");
        await reasonAndConfirm(change);
        await change.getByRole("button", { name: "Guardar frecuencia" }).click();
        const warning = page.getByRole("alertdialog", {
          name: "Advertencia: posible pérdida de garantía",
        });
        await warning.waitFor();
        expect(await warning.getByRole("button", { name: "Aceptar y guardar" }).isDisabled()).toBe(
          true,
        );
        expect(await warning.evaluate((node) => node.contains(document.activeElement))).toBe(true);
        await page.screenshot({ path: "tmp/f4-22-warranty-desktop.png", fullPage: true });
        await warning.getByRole("checkbox").check();
        await warning.getByRole("button", { name: "Aceptar y guardar" }).click();
        await page.getByText(/Frecuencia guardada/).waitFor();
        await page.getByText(/Advertencia aceptada el/).waitFor();
        await pump();
        const updated = await calendarText(page);
        await updated
          .getByText(/Limpieza · Pendiente · .* · cada 10 días \(Esta máquina\)/)
          .waitFor();
        await updated.getByText(/Cambio de lámpara UV · Pendiente · .* · cada 3 meses/).waitFor();

        await tab(page, "Frecuencias y alertas");
        const reset = await openForm(page, "Restablecer valores de fábrica de toda la máquina");
        await reasonAndConfirm(reset);
        await reset.getByRole("button", { name: "Restablecer máquina" }).click();
        await page.getByText(/Valores de la máquina restablecidos/).waitFor();
        await pump();
        const restored = await calendarText(page);
        await restored
          .getByText(/Limpieza · Pendiente · .* · cada 7 días \(Fábrica ICE24\)/)
          .waitFor();

        // Keyboard: the machine-file tabs move with the arrow keys.
        await page.getByRole("tab", { name: "Componentes", exact: true }).focus();
        await page.keyboard.press("ArrowRight");
        expect(
          await page
            .getByRole("tab", { name: "Frecuencias y alertas", exact: true })
            .getAttribute("aria-selected"),
        ).toBe("true");

        // Account configuration: apply to the model and restore factory values.
        await page.getByRole("button", { name: "Componentes y frecuencias", exact: true }).click();
        await page.getByRole("combobox", { name: "Modelo" }).selectOption(model.id);
        await page
          .getByText("3 máquina(s) activas de este modelo en tu cuenta.", { exact: false })
          .waitFor();
        await page.screenshot({ path: "tmp/f4-22-account-desktop.png", fullPage: true });
        for (const [width, name] of [
          [768, "tablet"],
          [375, "mobile"],
          [320, "mobile-320"],
        ] as const) {
          await page.setViewportSize({ width, height: 900 });
          expect(await noHorizontalScroll(page)).toBe(true);
          await page.screenshot({ path: `tmp/f4-22-account-${name}.png`, fullPage: true });
        }
        await page.setViewportSize({ width: 1280, height: 900 });

        // Read-only account: values visible, no controls.
        await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
        await page.reload();
        await page.getByRole("heading", { name: "Máquinas", exact: true }).waitFor();
        await openMachine(page, m1.machine_code);
        await tab(page, "Frecuencias y alertas");
        await page.getByText(/La cuenta está en modo lectura: puedes consultar/).waitFor();
        expect(await page.locator("summary", { hasText: "Cambiar frecuencia" }).count()).toBe(0);
        await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);

        // ── Operator of Sucursal Centro: edits its machine, no account configuration, no
        // other branch.
        const operator = await login("operatorA");
        page = operator.page;
        expect(
          await page
            .getByRole("button", { name: "Componentes y frecuencias", exact: true })
            .count(),
        ).toBe(0);
        expect(await page.getByText(m2.machine_code, { exact: true }).count()).toBe(0);
        await openMachine(page, m1.machine_code);
        await tab(page, "Frecuencias y alertas");
        const weekly = await openForm(page, "Cambiar frecuencia de Limpieza");
        await weekly.getByLabel("Cada").first().fill("1");
        await weekly.getByLabel("Unidad").first().selectOption("weeks");
        await reasonAndConfirm(weekly);
        await weekly.getByRole("button", { name: "Guardar frecuencia" }).click();
        // One week equals the factory seven days: no warranty warning.
        await page.getByText(/Frecuencia guardada/).waitFor();
        expect(await page.getByRole("alertdialog").count()).toBe(0);
        await tab(page, "Componentes");
        await page.locator("summary", { hasText: "Agregar componente del catálogo" }).waitFor();
        expect(await page.locator("summary", { hasText: "Crear componente propio" }).count()).toBe(
          0,
        );
        await page.setViewportSize({ width: 375, height: 900 });
        expect(await noHorizontalScroll(page)).toBe(true);
        await page.screenshot({ path: "tmp/f4-22-operator-mobile.png", fullPage: true });
        const otherBranch = await bffWrite(
          page,
          "operatorA",
          `machines/${m2.id}/frequency-overrides`,
        );
        expect(otherBranch.status()).toBe(403);
        expect(await otherBranch.json()).toMatchObject({ code: "FORBIDDEN" });
        expect(
          (await bffWrite(page, "operatorA", "account-frequency-overrides/reset", reason)).status(),
        ).toBe(403);
        expect(
          (
            await bffWrite(page, "operatorA", `technical-models/${model.id}/frequency-overrides`, {
              activityCode: "CLEAN",
              frequency: { value: 7, unit: "days" },
              alertLead: null,
              ...reason,
            })
          ).status(),
        ).toBe(403);

        // ── Technician: read-only everywhere, the BFF keeps the API decision.
        const technician = await login("techA");
        page = technician.page;
        await openMachine(page, m1.machine_code);
        await tab(page, "Componentes");
        await page.getByText(/Modo consulta: tu rol puede ver/).waitFor();
        await page.getByText("Fábrica (plantilla del modelo)").first().waitFor();
        expect(await page.locator("summary", { hasText: "Agregar componente" }).count()).toBe(0);
        await tab(page, "Frecuencias y alertas");
        await page.getByText("Valor de fábrica ICE24").first().waitFor();
        expect(await page.locator("summary", { hasText: "Cambiar frecuencia" }).count()).toBe(0);
        expect(await page.locator("summary", { hasText: "Restablecer" }).count()).toBe(0);
        await page.screenshot({ path: "tmp/f4-22-technician-desktop.png", fullPage: true });
        await page.getByRole("button", { name: "Componentes y frecuencias", exact: true }).click();
        await page
          .getByText(/Modo consulta/)
          .first()
          .waitFor();
        expect(
          (await bffWrite(page, "techA", `machines/${m1.id}/frequency-overrides`)).status(),
        ).toBe(403);
      } finally {
        await browser.close();
        webProcess.kill();
        webProcess = undefined;
      }
    },
    240_000,
  );
});
