import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { MachineComponentConfig, MachineComponents } from "@ice24/contracts";
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
import { MachineComponentsController } from "../../apps/api/src/modules/equipment/machine-components.controller.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("TASK-F4-19 machine component configuration", () => {
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
  const ids = {} as Record<"MFG" | "SYS" | "CMP1" | "CMP2" | "CMP3" | "UV_A" | "OWN_B", string>;
  let machine: RecordRow, branchA1: RecordRow, branchA2: RecordRow, branchB: RecordRow;
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
  const file = async (name: string) =>
    (await machines.detail(req(name), machine.id, "components")) as MachineComponents;
  const current = (state: MachineComponents, componentId: string) =>
    state.current.find((c) => c.componentCatalogId === componentId);

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
      ["CMP3", "component"],
    ] as const)
      ids[key] = (
        (await templates.catalog(req("admin"), { code: key, name: key, kind })) as RecordRow
      ).id;
    ids.UV_A = (
      await catalog.create(req("ownerA"), { code: "UV", kind: "component", name: "UV propio A" })
    ).id;
    ids.OWN_B = (
      await catalog.create(req("ownerB"), { code: "OWN-B", kind: "component", name: "Propio B" })
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
        {
          code: "CLEAN",
          name: "Limpieza",
          category: "sanitation",
          triggerType: "time",
          frequencyDays: 7,
          triggerDescription: "",
          responsibleRole: "SA",
          checklist: [{ code: "CHECK", label: "Verificar limpieza", required: true }],
          fields: [],
          evidenceRules: { required: false, minimumFiles: 0 },
          escalationRules: { afterHours: 24, notifyRole: "OW" },
          criticality: "high",
        },
      ],
    })) as RecordRow;
    template = await templates.template(
      req("admin", template.row_version),
      template.id,
      reason,
      "publish",
    );
    await pool.query(
      "insert into equipment.files(id,account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key,status,scan_reference) values($1,$2,$3,'test.pdf','application/pdf',10,'test','test','clean','fixture')",
      [fileId, a, actors.get("ownerA")!.user],
    );
    let draft = await requests.save(req("ownerA"), {
      branchId: branchA1.id,
      manufacturerId: ids.MFG,
      modelName: "Synthetic",
      serialNumber: "QA-019",
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

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module: (metadata: unknown) => ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create: (module: unknown, options: unknown) => Promise<typeof httpApp> };
    };
    class TestModule {}
    Module({
      controllers: [MachineComponentsController],
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
        { provide: MachineComponentsStore, useValue: components },
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

  it("preloads the template defaults when the machine is activated, in the same transaction", async () => {
    const state = await file("ownerA");
    expect(state.current.map((c) => c.componentCatalogId).sort()).toEqual(
      [ids.CMP1, ids.CMP2].sort(),
    );
    expect(
      state.current.every((c) => c.origin === "TEMPLATE_DEFAULT" && c.status === "active"),
    ).toBe(true);
    expect(state.current[0]).toMatchObject({
      version: 1,
      validTo: null,
      actorId: actors.get("admin")!.user,
      reason: "Evidence checked by integration test",
      component: { scope: "OFFICIAL", status: "active" },
    });
    // now() is the transaction timestamp: the same instant as the ownership period proves atomicity.
    const instants = (
      await pool.query(
        `select (select valid_from from equipment.machine_periods where machine_id=$1 and kind='ownership') as owned,
          (select min(valid_from) from equipment.machine_component_configs where machine_id=$1) as preloaded`,
        [machine.id],
      )
    ).rows[0];
    expect(new Date(instants.preloaded).getTime()).toBe(new Date(instants.owned).getTime());
    expect(
      (
        await pool.query(
          "select machine_id from audit.events where entity_id=$1 and operation='MACHINE_COMPONENTS_PRELOADED'",
          [machine.id],
        )
      ).rows,
    ).toEqual([{ machine_id: machine.id }]);
    // Other sections of the machine file keep working.
    expect(((await machines.detail(req("ownerA"), machine.id)) as RecordRow).id).toBe(machine.id);
    expect(await machines.detail(req("ownerA"), machine.id, "schedules")).toEqual([]);
  });

  it("lets readers consult and isolates the configuration between accounts", async () => {
    expect((await file("readerA")).current).toHaveLength(2);
    expect((await file("operatorA1")).current).toHaveLength(2);
    await expect(file("operatorA2")).rejects.toThrow("Resource not found");
    await expect(file("ownerB")).rejects.toThrow("Resource not found");
    await expect(
      components.add(req("ownerB"), machine.id, { componentCatalogId: ids.OWN_B, ...reason }),
    ).rejects.toThrow("Resource not found");
    await expect(
      components.add(req("ownerA"), machine.id, { componentCatalogId: ids.OWN_B, ...reason }),
    ).rejects.toThrow("Resource not found");
    await expect(
      pool.query(
        `insert into equipment.machine_component_configs(machine_id,component_catalog_id,origin,status,valid_from,actor_id,reason)
        values($1,$2,'ACCOUNT_CUSTOM','active',clock_timestamp(),$3,'direct')`,
        [machine.id, ids.OWN_B, actors.get("ownerA")!.user],
      ),
    ).rejects.toThrow("another account");
    await expect(
      pool.query(
        `insert into equipment.machine_component_configs(machine_id,component_catalog_id,origin,status,valid_from,actor_id,reason)
        values($1,$2,'TEMPLATE_DEFAULT','active',clock_timestamp(),$3,'direct')`,
        [machine.id, ids.SYS, actors.get("ownerA")!.user],
      ),
    ).rejects.toThrow("Only catalog components");
  });

  it("applies RA-01-D2: owner anywhere, Operator only in its branch, others read only", async () => {
    const optional = await components.add(req("operatorA1"), machine.id, {
      componentCatalogId: ids.CMP3,
      ...reason,
    });
    expect(optional).toMatchObject({ origin: "TEMPLATE_OPTIONAL", status: "active", version: 1 });
    const custom = await components.add(req("ownerA"), machine.id, {
      componentCatalogId: ids.UV_A,
      ...reason,
    });
    expect(custom).toMatchObject({
      origin: "ACCOUNT_CUSTOM",
      component: { code: "UV", scope: "ACCOUNT" },
    });
    await expect(
      components.add(req("ownerA"), machine.id, { componentCatalogId: ids.CMP1, ...reason }),
    ).rejects.toThrow("already configured");
    for (const name of ["operatorA2", "readerA"])
      await expect(
        components.transition(req(name), machine.id, ids.CMP1, reason, "deactivate"),
      ).rejects.toThrow("not authorized");
    await expect(
      components.transition(req("admin"), machine.id, ids.CMP1, reason, "deactivate"),
    ).rejects.toThrow("not authorized");
    const denied = await fetch(
      `${baseUrl}/v1/machines/${machine.id}/components/${ids.CMP1}/deactivate`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer operatorA2",
          "x-ice24-context-id": actors.get("operatorA2")!.context,
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
          "if-match": "1",
        },
        body: JSON.stringify(reason),
      },
    );
    expect(denied.status).toBe(403);
    expect(((await denied.json()) as { error: { code: string } }).error.code).toBe("FORBIDDEN");
    expect(current(await file("ownerA"), ids.CMP1)).toMatchObject({ status: "active", version: 1 });
  });

  it("lets only one of two edits with the same version win", async () => {
    const results = await Promise.allSettled([
      components.transition(req("ownerA", 1), machine.id, ids.CMP2, reason, "deactivate"),
      components.transition(req("operatorA1", 1), machine.id, ids.CMP2, reason, "deactivate"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(failed.reason)).toContain("Version conflict");
    const stale = await fetch(
      `${baseUrl}/v1/machines/${machine.id}/components/${ids.CMP2}/activate`,
      {
        method: "POST",
        headers: {
          authorization: "Bearer ownerA",
          "x-ice24-context-id": actors.get("ownerA")!.context,
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
          "if-match": "1",
        },
        body: JSON.stringify(reason),
      },
    );
    expect(stale.status).toBe(412);
    expect(((await stale.json()) as { error: { code: string } }).error.code).toBe(
      "PRECONDITION_FAILED",
    );
  });

  it("versions every change with history, idempotent replay and audited before/after", async () => {
    const key = randomUUID();
    const activated = await components.transition(
      req("ownerA", 2, key),
      machine.id,
      ids.CMP2,
      reason,
      "activate",
    );
    expect(activated).toMatchObject({ status: "active", version: 3 });
    const replay = await components.transition(
      req("ownerA", 2, key),
      machine.id,
      ids.CMP2,
      reason,
      "activate",
    );
    expect(replay.id).toBe(activated.id);
    await expect(
      components.transition(req("ownerA", 3), machine.id, ids.CMP2, reason, "activate"),
    ).rejects.toThrow("already active");
    const versions = (await file("ownerA")).history.filter(
      (c: MachineComponentConfig) => c.componentCatalogId === ids.CMP2,
    );
    expect(versions.map((c) => [c.version, c.status, c.validTo === null])).toEqual([
      [1, "active", false],
      [2, "inactive", false],
      [3, "active", true],
    ]);
    expect(versions[0]!.validTo).toBe(versions[1]!.validFrom);
    const audited = (
      await pool.query(
        `select before_data->>'status' as before,after_data->>'status' as after,before_data->>'row_version' as version
        from equipment.events where resource_id=$1 and event_type in ('MACHINE_COMPONENT_ADDED','MACHINE_COMPONENT_ACTIVATED','MACHINE_COMPONENT_DEACTIVATED') order by occurred_at`,
        [machine.id],
      )
    ).rows;
    expect(audited).toEqual(
      expect.arrayContaining([
        { before: "active", after: "inactive", version: "1" },
        { before: "inactive", after: "active", version: "2" },
      ]),
    );
    expect(
      (
        await pool.query(
          "select count(*)::int as n from audit.events where machine_id=$1 and operation in ('MACHINE_COMPONENT_ADDED','MACHINE_COMPONENT_ACTIVATED','MACHINE_COMPONENT_DEACTIVATED')",
          [machine.id],
        )
      ).rows[0].n,
    ).toBe(4);
  });

  it("never deletes or rewrites configuration history", async () => {
    await expect(
      pool.query("delete from equipment.machine_component_configs where machine_id=$1", [
        machine.id,
      ]),
    ).rejects.toThrow("History cannot be deleted");
    await expect(
      pool.query(
        "update equipment.machine_component_configs set status='inactive' where machine_id=$1 and valid_to is null",
        [machine.id],
      ),
    ).rejects.toThrow("Only closing");
    await expect(
      pool.query(
        "update equipment.machine_component_configs set valid_to=null where machine_id=$1 and valid_to is not null",
        [machine.id],
      ),
    ).rejects.toThrow("Only closing");
    await expect(
      pool.query(
        `insert into equipment.machine_component_configs(machine_id,component_catalog_id,origin,status,valid_from,actor_id,reason)
        values($1,$2,'TEMPLATE_DEFAULT','inactive',now() - interval '1 day',$3,'overlap')`,
        [machine.id, ids.CMP1, actors.get("ownerA")!.user],
      ),
    ).rejects.toThrow(/exclu|conflicting key/);
  });

  it("transfers the configuration with the machine without exposing private components", async () => {
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
    await expect(file("ownerA")).rejects.toThrow("Resource not found");
    const state = await file("ownerB");
    expect(state.current.map((c) => c.componentCatalogId).sort()).toEqual(
      [ids.CMP1, ids.CMP2, ids.CMP3].sort(),
    );
    const foreign = state.history.find((c) => c.componentCatalogId === ids.UV_A)!;
    expect(foreign).toMatchObject({
      component: null,
      origin: "ACCOUNT_CUSTOM",
      actorId: null,
      reason: null,
    });
    expect(foreign.validTo).not.toBeNull();
    expect(state.history.every((c) => c.actorId === null && c.reason === null)).toBe(true);
    expect(
      state.history
        .filter((c) => c.component !== null)
        .every((c) => c.component!.scope === "OFFICIAL"),
    ).toBe(true);
    expect(
      (
        await pool.query(
          "select account_id from equipment.events where resource_id=$1 and event_type='MACHINE_COMPONENTS_TRANSFER_CLOSED'",
          [machine.id],
        )
      ).rows,
    ).toEqual([{ account_id: a }]);
    // The new owner manages the configuration; the former owner's private component is unusable.
    const cmp3 = current(state, ids.CMP3)!;
    const changed = await components.transition(
      req("ownerB", cmp3.version),
      machine.id,
      ids.CMP3,
      reason,
      "deactivate",
    );
    expect(changed).toMatchObject({ status: "inactive", actorId: actors.get("ownerB")!.user });
    await expect(
      components.add(req("ownerB"), machine.id, { componentCatalogId: ids.UV_A, ...reason }),
    ).rejects.toThrow("Resource not found");
    const own = await components.add(req("ownerB"), machine.id, {
      componentCatalogId: ids.OWN_B,
      ...reason,
    });
    expect(own).toMatchObject({ origin: "ACCOUNT_CUSTOM", component: { code: "OWN-B" } });
    expect(
      (await pool.query("select count(*)::int as n from equipment.machine_component_configs"))
        .rows[0].n,
    ).toBe(8);
  });
});
