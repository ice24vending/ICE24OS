import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes, createCipheriv, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
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
import { SupabaseAdminClient } from "../../apps/api/src/modules/identity/supabase-admin.client.js";
import { EquipmentController } from "../../apps/api/src/modules/equipment/equipment.controller.js";
import { EquipmentAdminController } from "../../apps/api/src/modules/equipment/equipment-admin.controller.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { InputValidationFilter } from "../../apps/api/src/common/security/input-validation.filter.js";
import { processScheduleBatch } from "../../apps/worker/src/processors/scheduling.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("Phase 4 transactional lifecycle and isolation", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let accounts: AccountsStore;
  let templates: TemplatesStore;
  let requests: RequestsStore;
  let machines: MachinesStore;
  let transfers: TransfersStore;
  let members: MembersStore;
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
    b = randomUUID(),
    adminAccount = randomUUID();
  const actors = new Map<string, { user: string; context: string; account: string }>();
  let branchA: RecordRow,
    branchA2: RecordRow,
    branchB: RecordRow,
    model: RecordRow,
    template: RecordRow,
    draft: RecordRow,
    machine: RecordRow;
  let manufacturer: RecordRow, system: RecordRow, component: RecordRow;
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
  const activity = {
    code: "CLEAN",
    name: "Limpieza",
    category: "sanitation",
    triggerType: "time",
    frequencyDays: 7,
    triggerDescription: "",
    responsibleRole: "SA",
    checklist: [{ code: "CHECK", label: "Verificar limpieza", required: true }],
    fields: [],
    evidenceRules: { required: true, minimumFiles: 1 },
    escalationRules: { afterHours: 24, notifyRole: "OW" },
    criticality: "high",
  };
  function req(
    name: string,
    version = 1,
    aal: "aal1" | "aal2" = "aal2",
    key = randomUUID(),
  ): SecurityRequest {
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
        aal,
      },
    };
  }
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon;create role authenticated;create role service_role;");
    for (const file of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    accounts = new AccountsStore(db);
    templates = new TemplatesStore(db);
    requests = new RequestsStore(db);
    machines = new MachinesStore(db);
    transfers = new TransfersStore(db);
    members = new MembersStore(db, new SupabaseAdminClient());
    for (const [id, name] of [
      [a, "A"],
      [b, "B"],
      [adminAccount, "ICE24"],
    ])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [id, name],
      );
    for (const [name, account, role] of [
      ["ownerA", a, "OW"],
      ["ownerB", b, "OW"],
      ["admin", adminAccount, "IA"],
      ["reader", a, "AU"],
      ["scoped", a, "TC"],
    ]) {
      const user = randomUUID(),
        membership = randomUUID(),
        context = randomUUID();
      actors.set(name!, { user, context, account: account! });
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
      if (name !== "scoped")
        await pool.query(
          "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
          [membership],
        );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
        [context, user, account, membership],
      );
    }
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module: (metadata: unknown) => ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create: (module: unknown, options: unknown) => Promise<typeof httpApp> };
    };
    class TestModule {}
    Module({
      controllers: [EquipmentController, EquipmentAdminController],
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
        { provide: MachinesStore, useValue: machines },
        { provide: TransfersStore, useValue: transfers },
        { provide: MembersStore, useValue: members },
        { provide: FilesStore, useValue: new FilesStore(db) },
      ],
    })(TestModule);
    httpApp = await NestFactory.create(TestModule, { logger: false });
    httpApp.setGlobalPrefix("v1");
    httpApp.useGlobalFilters(new InputValidationFilter());
    await httpApp.listen(0, "127.0.0.1");
    baseUrl = await httpApp.getUrl();
  });
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

  it("creates tenant branches; denies cross-account reads, writes and reader mutation", async () => {
    branchA = (await accounts.branches(req("ownerA"), branchData)) as RecordRow;
    branchA2 = (await accounts.branches(req("ownerA"), {
      ...branchData,
      name: "QA second branch",
    })) as RecordRow;
    branchB = (await accounts.branches(req("ownerB"), branchData)) as RecordRow;
    expect(await accounts.branches(req("ownerA"))).toHaveLength(2);
    await expect(accounts.branch(req("ownerB"), branchA.id)).rejects.toThrow("Resource not found");
    await expect(accounts.branch(req("ownerB"), branchA.id, branchData)).rejects.toThrow();
    await expect(accounts.branches(req("reader"), branchData)).rejects.toThrow("not authorized");
    expect(await accounts.branches(req("scoped"))).toHaveLength(0);
  });
  it("requires MFA for central administration and immutable publication", async () => {
    await expect(
      templates.catalog(req("admin", 1, "aal1"), {
        code: "MFA",
        name: "Test",
        kind: "manufacturer",
      }),
    ).rejects.toThrow("not authorized");
    await expect(
      templates.catalog(req("ownerA"), { code: "ESCALATE", name: "Test", kind: "manufacturer" }),
    ).rejects.toThrow("not authorized");
    manufacturer = (await templates.catalog(req("admin"), {
      code: "MFG",
      name: "Test manufacturer",
      kind: "manufacturer",
    })) as RecordRow;
    system = (await templates.catalog(req("admin"), {
      code: "SYS",
      name: "Cooling",
      kind: "system",
    })) as RecordRow;
    component = (await templates.catalog(req("admin"), {
      code: "CMP",
      name: "Compressor",
      kind: "component",
    })) as RecordRow;
    model = (await templates.models(req("admin"), {
      code: "MODEL",
      name: "Test model",
      manufacturerId: manufacturer.id,
      equipmentType: "external_validated",
      nominalCapacity: 450,
      characteristics: {},
    })) as RecordRow;
    template = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Initial test definition",
      systems: [system.id],
      components: [component.id],
      activities: [activity],
    })) as RecordRow;
    template = await templates.template(
      req("admin", template.row_version),
      template.id,
      reason,
      "publish",
    );
    await expect(
      templates.template(req("admin", template.row_version), template.id, {
        ...template.definition,
        changeSummary: "Attempted mutation",
      }),
    ).rejects.toThrow("Invalid template transition");
    await expect(
      pool.query("update equipment.template_versions set definition='{}' where id=$1", [
        template.id,
      ]),
    ).rejects.toThrow("immutable");
  });
  it("blocks incomplete drafts and unvalidated evidence", async () => {
    draft = await requests.save(req("ownerA"), { branchId: branchA.id });
    await expect(requests.transition(req("ownerA"), draft.id, reason, "submit")).rejects.toThrow(
      "required",
    );
    await expect(requests.save(req("ownerA"), { branchId: branchB.id })).rejects.toThrow(
      "Resource not found",
    );
    await pool.query(
      "insert into equipment.files(id,account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key) values($1,$2,$3,'test.pdf','application/pdf',10,'test','test')",
      [fileId, a, actors.get("ownerA")!.user],
    );
    await expect(
      requests.save(
        req("ownerA", draft.row_version),
        { branchId: branchA.id, fileIds: [fileId] },
        draft.id,
      ),
    ).rejects.toThrow("scan");
    await pool.query(
      "update equipment.files set status='clean',scan_reference='integration fixture' where id=$1",
      [fileId],
    );
    draft = await requests.save(
      req("ownerA", draft.row_version),
      {
        branchId: branchA.id,
        manufacturerId: manufacturer.id,
        modelName: "Synthetic",
        serialNumber: "QA-001",
        capacity: 450,
        fileIds: [fileId],
      },
      draft.id,
    );
    draft = await requests.transition(req("ownerA", draft.row_version), draft.id, reason, "submit");
    await expect(
      requests.save(req("ownerA", draft.row_version), { branchId: branchA.id }, draft.id),
    ).rejects.toThrow("editable");
  });
  it("supports information-required and resubmission before atomic approval", async () => {
    draft = await requests.transition(req("admin", draft.row_version), draft.id, reason, "review");
    draft = await requests.transition(
      req("admin", draft.row_version),
      draft.id,
      reason,
      "request-information",
    );
    draft = await requests.save(req("ownerA", draft.row_version), draft.data, draft.id);
    draft = await requests.transition(req("ownerA", draft.row_version), draft.id, reason, "submit");
    const input = {
      technicalModelId: model.id,
      templateVersionId: template.id,
      validationMethod: "documents",
      validatedFileIds: [fileId],
      reviewNotes: "Evidence checked by integration test",
      initialOperationalStatus: "off",
      confirmation: true,
    };
    const key = randomUUID();
    const request = req("admin", draft.row_version, "aal2", key);
    const approved = await requests.transition(request, draft.id, input, "approve");
    machine = approved.machine!;
    const replay = await requests.transition(request, draft.id, input, "approve");
    expect(replay.machine?.id).toBe(machine.id);
    await expect(
      requests.transition(
        request,
        draft.id,
        { ...input, reviewNotes: "Different replay payload" },
        "approve",
      ),
    ).rejects.toThrow("Idempotency");
    expect(machine.machine_code).toMatch(/^ICE24-/);
    expect(machine.sanitary_status).toBe("attention_required");
    expect(
      (
        await pool.query("select * from equipment.machine_periods where machine_id=$1", [
          machine.id,
        ])
      ).rowCount,
    ).toBe(3);
    await expect(
      pool.query("update equipment.machines set machine_code='changed' where id=$1", [machine.id]),
    ).rejects.toThrow("immutable");
  });
  it("generates calendars once and preserves historical definitions on replacement", async () => {
    expect(await processScheduleBatch(pool)).toBe(1);
    expect(await processScheduleBatch(pool)).toBe(0);
    const original = (
      await pool.query("select * from equipment.scheduled_activities where machine_id=$1", [
        machine.id,
      ])
    ).rows[0];
    await pool.query("update equipment.scheduled_activities set status='completed' where id=$1", [
      original.id,
    ]);
    let next = (await templates.versions(req("admin"), model.id, {
      changeSummary: "Second calendar definition",
      systems: [system.id],
      components: [component.id],
      activities: [{ ...activity, frequencyDays: 14 }],
    })) as RecordRow;
    next = await templates.template(req("admin", next.row_version), next.id, reason, "publish");
    machine = await machines.update(
      req("admin", machine.row_version),
      machine.id,
      { ...reason, templateVersionId: next.id },
      "template",
    );
    await processScheduleBatch(pool);
    const history = await pool.query(
      "select * from equipment.scheduled_activities where machine_id=$1 order by created_at",
      [machine.id],
    );
    expect(history.rows).toHaveLength(2);
    expect(history.rows[0].definition.frequencyDays).toBe(7);
    expect(history.rows[0].status).toBe("completed");
    expect(history.rows[1].definition.frequencyDays).toBe(14);
  });
  it("rejects stale concurrent changes, cross-tenant moves and overlapping periods", async () => {
    await expect(
      machines.update(
        req("ownerA", machine.row_version),
        machine.id,
        { ...reason, toBranchId: branchB.id },
        "moves",
      ),
    ).rejects.toThrow("Resource not found");
    const version = machine.row_version;
    const results = await Promise.allSettled([
      machines.update(
        req("ownerA", version),
        machine.id,
        { ...reason, toBranchId: branchA2.id },
        "moves",
      ),
      machines.update(
        req("ownerA", version),
        machine.id,
        { internalName: "Concurrent change", commercialBrand: "" },
        "metadata",
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    machine = (await machines.detail(req("ownerA"), machine.id)) as RecordRow;
    await expect(
      pool.query(
        "insert into equipment.machine_periods(machine_id,kind,reference_id,valid_from,actor_id,reason) values($1,'ownership',$2,now(),$3,'Invalid overlap')",
        [machine.id, a, actors.get("ownerA")!.user],
      ),
    ).rejects.toThrow("conflicting");
    const occupied = machine.branch_id === branchA.id ? branchA : branchA2;
    await expect(
      accounts.branch(req("ownerA", occupied.row_version), occupied.id, reason, "archive"),
    ).rejects.toThrow();
  });
  it("honors read-only mode and hot membership suspension", async () => {
    await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
    expect((await machines.list(req("ownerA"))).length).toBe(1);
    await expect(
      machines.update(
        req("ownerA", machine.row_version),
        machine.id,
        { internalName: "Blocked", commercialBrand: "" },
        "metadata",
      ),
    ).rejects.toThrow("not authorized");
    await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);
    await pool.query(
      "update identity.account_memberships set status='SUSPENDED' where user_id=$1",
      [actors.get("reader")!.user],
    );
    await expect(machines.list(req("reader"))).rejects.toThrow("not authorized");
  });
  it("transfers atomically, removes old access and preserves technical history", async () => {
    const transfer = await transfers.create(req("ownerA", machine.row_version), {
      ...reason,
      machineId: machine.id,
      toAccountId: b,
      toBranchId: branchB.id,
      commercialDataTransfer: { sales: false, customers: false, recharges: false, orders: false },
      authorizationFileIds: [],
    });
    await expect(
      transfers.transition(req("ownerA", transfer.row_version), transfer.id, reason, "approve"),
    ).rejects.toThrow("not authorized");
    const approved = await transfers.transition(
      req("admin", transfer.row_version),
      transfer.id,
      reason,
      "approve",
    );
    await transfers.transition(req("admin", approved.row_version), transfer.id, reason, "execute");
    await expect(machines.detail(req("ownerA"), machine.id)).rejects.toThrow("Resource not found");
    const changed = (await machines.detail(req("ownerB"), machine.id)) as RecordRow;
    expect(changed.machine_code).toBe(machine.machine_code);
    expect(changed.account_id).toBe(b);
    expect(changed.publication_status).toBe("private");
    expect(await machines.detail(req("ownerB"), machine.id, "schedules")).toHaveLength(2);
    const timeline = (await machines.detail(req("ownerB"), machine.id, "timeline")) as RecordRow[];
    expect(timeline.some((event) => event.event_type === "MACHINE_ACTIVATED")).toBe(true);
    expect(
      timeline.every((event) => event.account_id === undefined && event.before_data === undefined),
    ).toBe(true);
    const owners = (await machines.detail(
      req("ownerB"),
      machine.id,
      "ownership-history",
    )) as RecordRow[];
    expect(owners[0]?.reference_id).toBeNull();
    expect(owners[1]?.reference_id).toBe(b);
    machine = changed;
  });
  it("retires without deletion, cancels pending work and enforces append-only audit", async () => {
    machine = await machines.update(
      req("ownerB", machine.row_version),
      machine.id,
      reason,
      "retire",
    );
    expect(machine.operational_status).toBe("retired");
    await expect(
      machines.update(
        req("ownerB", machine.row_version),
        machine.id,
        { ...reason, status: "available" },
        "operational-status",
      ),
    ).rejects.toThrow("Retired");
    await expect(
      pool.query("delete from equipment.machines where id=$1", [machine.id]),
    ).rejects.toThrow("cannot be deleted");
    await expect(pool.query("update equipment.events set reason='tamper'")).rejects.toThrow(
      "Append-only",
    );
    expect(
      (
        await pool.query("select count(*)::int as n from equipment.events where resource_id=$1", [
          machine.id,
        ])
      ).rows[0].n,
    ).toBeGreaterThanOrEqual(4);
    expect(
      (
        await pool.query(
          "select * from equipment.scheduled_activities where machine_id=$1 and status='pending'",
          [machine.id],
        )
      ).rowCount,
    ).toBe(0);
  });
  it("blocks browser database roles from all equipment tables", async () => {
    const privileges = await pool.query(
      "select tablename,rowsecurity from pg_tables where schemaname='equipment'",
    );
    expect(privileges.rows.every((r) => r.rowsecurity)).toBe(true);
    expect(
      (
        await pool.query(
          "select has_schema_privilege('authenticated','equipment','USAGE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
  it("updates account details with version checks and cannot patch another tenant", async () => {
    const details = {
      displayName: "QA titular",
      legalName: "QA synthetic company",
      timezone: "America/Mexico_City",
      currency: "MXN",
      contact: { email: "contact@example.test", phone: "" },
      taxProfile: { taxId: "SYNTHETIC", fiscalAddress: "QA address" },
      moduleConfiguration: {
        maintenance: true,
        sanitation: true,
        inventory: false,
        commercial: false,
      },
    };
    const account = await accounts.account(req("ownerA"), a, details);
    expect(account.details).toEqual(details);
    await expect(accounts.account(req("ownerA", 1), a, details)).rejects.toThrow(
      "Version conflict",
    );
    await expect(accounts.account(req("ownerB", account.row_version), a, details)).rejects.toThrow(
      "Resource not found",
    );
  });
  it("delegates an existing identity once and applies permission denial to an active session", async () => {
    const invited = await members.invite(req("ownerA"), {
      email: "ownerB@example.test",
      displayName: "Existing identity",
      roleCodes: ["AU"],
      branchIds: [],
      machineIds: [],
    });
    expect(invited.status).toBe("ACTIVE");
    expect(
      (
        await pool.query(
          "select count(*)::int as n from identity.users where lower(email)='ownerb@example.test'",
        )
      ).rows[0].n,
    ).toBe(1);
    const context = randomUUID();
    await pool.query(
      "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
      [context, actors.get("ownerB")!.user, a, invited.id],
    );
    const other = {
      ...req("ownerB"),
      headers: { ...req("ownerB").headers, "x-ice24-context-id": context },
    };
    expect(await accounts.branches(other)).toHaveLength(2);
    const settings = {
      roleCodes: ["AU"],
      branchIds: [branchA.id],
      machineIds: [],
      reason: "Restrict delegated access",
      overrides: [{ permission: "equipment.read", effect: "DENY" }],
    };
    await expect(members.permissions(req("ownerB", 1), invited.id, settings)).rejects.toThrow(
      "Resource not found",
    );
    await members.permissions(req("ownerA", 1), invited.id, settings);
    await expect(accounts.branches(other)).rejects.toThrow("not authorized");
    await expect(
      members.invite(req("ownerA"), {
        email: "denied@example.test",
        displayName: "Denied scope",
        roleCodes: ["AU"],
        branchIds: [branchB.id],
        machineIds: [],
      }),
    ).rejects.toThrow("Resource not found");
  });
  it("serves HTTP routes with authentication, validation and tenant isolation", async () => {
    expect((await fetch(`${baseUrl}/v1/branches`)).status).toBe(401);
    const auth = {
      authorization: "Bearer ownerA",
      "x-ice24-context-id": actors.get("ownerA")!.context,
    };
    const listed = await fetch(`${baseUrl}/v1/branches`, { headers: auth });
    expect(listed.status).toBe(200);
    expect(await listed.json()).toHaveLength(2);
    expect((await fetch(`${baseUrl}/v1/branches/${branchB.id}`, { headers: auth })).status).toBe(
      404,
    );
    expect((await fetch(`${baseUrl}/v1/admin/dashboard`, { headers: auth })).status).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/v1/branches`, {
          method: "POST",
          headers: { ...auth, "content-type": "application/json", "idempotency-key": randomUUID() },
          body: JSON.stringify({ ...branchData, latitude: 200 }),
        })
      ).status,
    ).toBe(400);
    expect((await fetch(`${baseUrl}/v1/branches/not-a-uuid`, { headers: auth })).status).toBe(400);
  });
  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "runs browser workflow, tenant separation, CSRF, context binding and responsive layout",
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
      let ready = false;
      let output = "";
      webProcess.stdout?.on("data", (chunk) => {
        output += String(chunk);
      });
      webProcess.stderr?.on("data", (chunk) => {
        output += String(chunk);
      });
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          await fetch(origin);
          ready = true;
          break;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      if (!ready) throw new Error(`Private web did not start: ${output.slice(-1500)}`);
      const browser = await chromium.launch({ headless: true });
      function cookie(name: string) {
        const actor = actors.get(name)!;
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
              contextId: actor.context,
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
      try {
        const clientA = await browser.newContext();
        const clientB = await browser.newContext();
        await clientA.addCookies([cookie("ownerA")]);
        await clientB.addCookies([cookie("ownerB")]);
        const pageA = await clientA.newPage();
        const pageB = await clientB.newPage();
        await pageA.goto(`${origin}/workspace`);
        await pageA.getByRole("heading", { name: "Máquinas", exact: true }).waitFor();
        await pageA.getByRole("button", { name: "Sucursales", exact: true }).click();
        await pageA.getByRole("heading", { name: "Sucursales", exact: true }).waitFor();
        await pageA.getByText("Nueva sucursal", { exact: true }).first().click();
        await pageA
          .getByRole("textbox", { name: "Nombre", exact: true })
          .fill("Sucursal creada desde navegador");
        await pageA
          .getByRole("textbox", { name: "Dirección", exact: true })
          .fill("Dirección sintética de QA");
        await pageA.getByRole("button", { name: "Guardar", exact: true }).click();
        await pageA.getByText("Sucursal creada desde navegador", { exact: true }).waitFor();
        await pageB.goto(`${origin}/workspace`);
        await pageB.getByRole("button", { name: "Sucursales", exact: true }).click();
        await pageB.getByRole("heading", { name: "Sucursales", exact: true }).waitFor();
        expect(
          await pageB.getByText("Sucursal creada desde navegador", { exact: true }).count(),
        ).toBe(0);
        await pageA.screenshot({ path: "tmp/phase4-ui-desktop.png", fullPage: true });
        await pageA.setViewportSize({ width: 320, height: 800 });
        expect(
          await pageA.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await pageA.screenshot({ path: "tmp/phase4-ui-mobile.png", fullPage: true });
        await pageA.keyboard.press("Tab");
        expect(await pageA.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
        const csrf = await clientA.request.post(`${origin}/api/equipment`, {
          headers: { origin, "x-ice24-workspace-context": actors.get("ownerA")!.context },
          multipart: {
            csrfToken: "wrong",
            path: "branches",
            method: "POST",
            body: JSON.stringify(branchData),
            key: randomUUID(),
          },
        });
        expect(csrf.status()).toBe(403);
        await clientA.addCookies([cookie("ownerB")]);
        const stale = await clientA.request.get(`${origin}/api/equipment?path=branches`, {
          headers: { "x-ice24-workspace-context": actors.get("ownerA")!.context },
        });
        expect(stale.status()).toBe(409);
        await clientA.addCookies([cookie("ownerA")]);
        await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
        await pageA.reload();
        await pageA.getByText("Cuenta en modo solo lectura.", { exact: true }).waitFor();
        await pageA.getByRole("button", { name: "Sucursales", exact: true }).click();
        await pageA.getByText("Nueva sucursal", { exact: true }).first().click();
        expect(await pageA.getByRole("button", { name: "Guardar", exact: true }).isDisabled()).toBe(
          true,
        );
        await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);
        const anonymous = await browser.newPage();
        await anonymous.goto(`${origin}/workspace`);
        expect(new URL(anonymous.url()).pathname).toBe("/");
      } finally {
        await browser.close();
        webProcess.kill();
        webProcess = undefined;
      }
    },
    60000,
  );
});
