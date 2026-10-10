import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import type { AccountCatalogEntry } from "@ice24/contracts";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import {
  EquipmentDatabase,
  type RecordRow,
} from "../../apps/api/src/modules/equipment/equipment.database.js";
import { TemplatesStore } from "../../apps/api/src/modules/equipment/templates.store.js";
import { AccountCatalogStore } from "../../apps/api/src/modules/equipment/account-catalog.store.js";
import { AccountCatalogController } from "../../apps/api/src/modules/equipment/account-catalog.controller.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";

describe("TASK-F4-18 account catalog scope, isolation and authorization", () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let identity: IdentityStore;
  let db: EquipmentDatabase;
  let templates: TemplatesStore;
  let catalog: AccountCatalogStore;
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
  const actors = new Map<string, { user: string; context: string }>();
  let official: RecordRow, officialSystem: RecordRow, entryA: AccountCatalogEntry;
  const activity = {
    code: "UV_CLEAN",
    name: "Limpieza de lámpara UV",
    category: "maintenance",
    defaultFrequency: { value: 3, unit: "months" },
    checklist: [{ code: "LAMP", label: "Limpiar la lámpara", required: true }],
    evidenceRules: { required: true, minimumFiles: 1 },
  };
  const component = {
    code: "UV-LAMP",
    kind: "component",
    name: "Lámpara UV propia",
    maintenanceActivity: activity,
  };
  const retire = { reason: "Componente sustituido en todas las máquinas", confirmation: true };

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
  function http(name: string, extra: Record<string, string> = {}) {
    return {
      authorization: `Bearer ${name}`,
      "x-ice24-context-id": actors.get(name)!.context,
      "content-type": "application/json",
      ...extra,
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
    // A pre-existing official entry proves the backfill to OFFICIAL.
    await pool.query(
      `insert into equipment.catalog_entries(kind,code,data) values
      ('component','CMP','{"code":"CMP","name":"Compresor","kind":"component"}'),
      ('system','SYS','{"code":"SYS","name":"Enfriamiento","kind":"system"}')`,
    );
    await pool.query(
      await readFile(
        new URL(
          "../../supabase/migrations/20261009000100_phase4_account_catalog.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    official = (
      await pool.query<RecordRow>("select * from equipment.catalog_entries where code='CMP'")
    ).rows[0]!;
    officialSystem = (
      await pool.query<RecordRow>("select * from equipment.catalog_entries where code='SYS'")
    ).rows[0]!;
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new EquipmentDatabase(identity);
    templates = new TemplatesStore(db);
    catalog = new AccountCatalogStore(db);
    for (const [id, name] of [
      [a, "A"],
      [b, "B"],
      [platform, "ICE24"],
    ])
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [id, name],
      );
    for (const [name, account, role, accountWide] of [
      ["ownerA", a, "OW", true],
      ["ownerB", b, "OW", true],
      ["admin", platform, "IA", true],
      ["readerA", a, "AU", true],
      ["sanitaryA", a, "SA", true],
      ["scopedOwnerA", a, "OW", false],
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
      if (accountWide)
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
      controllers: [AccountCatalogController],
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
        { provide: AccountCatalogStore, useValue: catalog },
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

  it("keeps existing entries OFFICIAL and enforces scope coherence in the database", async () => {
    expect(official).toMatchObject({ scope: "OFFICIAL", account_id: null });
    await expect(
      pool.query(
        "insert into equipment.catalog_entries(kind,code,data,scope) values('component','X1','{}','ACCOUNT')",
      ),
    ).rejects.toThrow("catalog_entries_scope_account");
    await expect(
      pool.query(
        "insert into equipment.catalog_entries(kind,code,data,account_id) values('component','X2','{}',$1)",
        [a],
      ),
    ).rejects.toThrow("catalog_entries_scope_account");
    await expect(
      pool.query(
        "insert into equipment.catalog_entries(kind,code,data,scope,account_id) values('manufacturer','X3','{}','ACCOUNT',$1)",
        [a],
      ),
    ).rejects.toThrow("catalog_entries_account_kind");
    await expect(
      pool.query(
        "insert into equipment.catalog_entries(kind,code,data) values('component','CMP','{}')",
      ),
    ).rejects.toThrow("catalog_entries_official_code");
  });

  it("lets the owner create audited entries with their own maintenance activity", async () => {
    entryA = await catalog.create(req("ownerA"), component);
    expect(entryA).toMatchObject({
      scope: "ACCOUNT",
      kind: "component",
      code: "UV-LAMP",
      status: "active",
      version: 1,
      maintenanceActivity: activity,
    });
    expect(entryA).not.toHaveProperty("account_id");
    const stored = (
      await pool.query("select scope,account_id,data from equipment.catalog_entries where id=$1", [
        entryA.id,
      ])
    ).rows[0];
    expect(stored).toMatchObject({ scope: "ACCOUNT", account_id: a });
    expect(stored.data.schemaVersion).toBe(1);
    const central = (
      await pool.query(
        "select account_id,actor_user_id,operation from audit.events where entity_id=$1",
        [entryA.id],
      )
    ).rows;
    expect(central).toEqual([
      {
        account_id: a,
        actor_user_id: actors.get("ownerA")!.user,
        operation: "ACCOUNT_CATALOG_CREATED",
      },
    ]);
    // Per-scope uniqueness: same code in another account, and shadowing an official code.
    expect((await catalog.create(req("ownerB"), component)).code).toBe("UV-LAMP");
    await catalog.create(req("ownerA"), { code: "CMP", kind: "component", name: "Compresor" });
    await expect(catalog.create(req("ownerA"), component)).rejects.toThrow("duplicate");
    await catalog.create(req("ownerA"), {
      code: "EXTERNAL-BRAND",
      kind: "characteristic",
      name: "Marca externa del cliente",
    });
  });

  it("isolates account A entries from account B and from official templates", async () => {
    const listedB = await catalog.list(req("ownerB"), {});
    expect(listedB.items.map((e) => e.id)).not.toContain(entryA.id);
    expect(listedB.items).toHaveLength(1);
    await expect(catalog.detail(req("ownerB"), entryA.id)).rejects.toThrow("Resource not found");
    await expect(catalog.update(req("ownerB"), entryA.id, { name: "Hijacked" })).rejects.toThrow(
      "Resource not found",
    );
    await expect(catalog.retire(req("ownerB"), entryA.id, retire)).rejects.toThrow(
      "Resource not found",
    );
    const usableB = (await templates.catalog(req("ownerB"))) as RecordRow[];
    expect(usableB.map((e) => e.id)).toContain(official.id);
    expect(usableB.map((e) => e.id)).not.toContain(entryA.id);
    expect(usableB.every((e) => !("account_id" in e))).toBe(true);
    const usableA = (await templates.catalog(req("ownerA"))) as RecordRow[];
    expect(usableA.map((e) => e.id)).toEqual(expect.arrayContaining([official.id, entryA.id]));
    const model = await pool.query<RecordRow>(
      `insert into equipment.catalog_entries(kind,code,data) values('manufacturer','MFG','{}') returning *`,
    );
    const technical = (await templates.models(req("admin"), {
      code: "MODEL",
      name: "Modelo",
      manufacturerId: model.rows[0]!.id,
      equipmentType: "external_validated",
      nominalCapacity: 450,
      characteristics: {},
    })) as RecordRow;
    await expect(
      templates.versions(req("admin"), technical.id, {
        changeSummary: "Template must not use account entries",
        systems: [officialSystem.id],
        components: [entryA.id],
        activities: [
          {
            code: "CLEAN",
            name: "Limpieza",
            category: "sanitation",
            triggerType: "time",
            frequencyDays: 7,
            triggerDescription: "",
            responsibleRole: "SA",
            checklist: [{ code: "CHECK", label: "Verificar", required: true }],
            fields: [],
            evidenceRules: { required: false, minimumFiles: 0 },
            escalationRules: { afterHours: 24, notifyRole: "OW" },
            criticality: "medium",
          },
        ],
      }),
    ).rejects.toThrow("unavailable");
  });

  it("reserves writes to the account-wide owner (RA-01-D2) with the standard 403", async () => {
    for (const name of ["readerA", "sanitaryA", "scopedOwnerA", "admin"])
      await expect(
        catalog.create(req(name), { ...component, code: `DENIED-${name.length}` }),
      ).rejects.toThrow("not authorized");
    expect((await catalog.list(req("readerA"), {})).items.length).toBeGreaterThan(0);
    const denied = await fetch(`${baseUrl}/v1/account-catalog-entries`, {
      method: "POST",
      headers: http("readerA", { "idempotency-key": randomUUID() }),
      body: JSON.stringify({ ...component, code: "DENIED-HTTP" }),
    });
    expect(denied.status).toBe(403);
    expect(denied.headers.get("cache-control")).toBe("no-store");
    const body = (await denied.json()) as { error: Record<string, unknown> };
    expect(body.error).toMatchObject({ code: "FORBIDDEN" });
    expect(body.error.correlationId).toEqual(expect.any(String));
    expect(body.error.timestamp).toEqual(expect.any(String));
    const read = await fetch(`${baseUrl}/v1/account-catalog-entries?status=active`, {
      headers: http("readerA"),
    });
    expect(read.status).toBe(200);
    const crossTenant = await fetch(`${baseUrl}/v1/account-catalog-entries/${entryA.id}`, {
      headers: http("ownerB"),
    });
    expect(crossTenant.status).toBe(404);
    expect(((await crossTenant.json()) as { error: { code: string } }).error.code).toBe(
      "NOT_FOUND",
    );
    expect((await fetch(`${baseUrl}/v1/account-catalog-entries`)).status).toBe(401);
  });

  it("never lets a customer edit or retire an official entry", async () => {
    const patched = await fetch(`${baseUrl}/v1/account-catalog-entries/${official.id}`, {
      method: "PATCH",
      headers: http("ownerA", { "idempotency-key": randomUUID(), "if-match": "1" }),
      body: JSON.stringify({ name: "Compresor del cliente" }),
    });
    expect(patched.status).toBe(403);
    expect(((await patched.json()) as { error: { code: string } }).error.code).toBe("FORBIDDEN");
    await expect(catalog.retire(req("ownerA"), official.id, retire)).rejects.toThrow("ICE24");
    await expect(
      templates.catalog(req("ownerA"), { code: "OWNER-OFFICIAL", name: "X", kind: "component" }),
    ).rejects.toThrow("not authorized");
    const unchanged = (
      await pool.query("select data,row_version from equipment.catalog_entries where id=$1", [
        official.id,
      ])
    ).rows[0];
    expect(unchanged).toMatchObject({ row_version: 1, data: { name: "Compresor" } });
  });

  it("applies optimistic concurrency, idempotent replay and audited updates", async () => {
    const key = randomUUID();
    const edit = { name: "Lámpara UV 254 nm", unit: "pieza", maintenanceActivity: activity };
    const updated = await catalog.update(req("ownerA", 1, key), entryA.id, edit);
    expect(updated).toMatchObject({ version: 2, name: "Lámpara UV 254 nm", unit: "pieza" });
    expect((await catalog.update(req("ownerA", 1, key), entryA.id, edit)).version).toBe(2);
    await expect(
      catalog.update(req("ownerA", 1, key), entryA.id, { ...edit, name: "Otro nombre" }),
    ).rejects.toThrow("Idempotency");
    await expect(catalog.update(req("ownerA", 1), entryA.id, edit)).rejects.toThrow(
      "Version conflict",
    );
    const stale = await fetch(`${baseUrl}/v1/account-catalog-entries/${entryA.id}`, {
      method: "PATCH",
      headers: http("ownerA", { "idempotency-key": randomUUID(), "if-match": "1" }),
      body: JSON.stringify(edit),
    });
    expect(stale.status).toBe(412);
    expect(((await stale.json()) as { error: { code: string } }).error.code).toBe(
      "PRECONDITION_FAILED",
    );
    const characteristic = (await catalog.list(req("ownerA"), {})).items.find(
      (e) => e.kind === "characteristic",
    )!;
    await expect(
      catalog.update(req("ownerA", characteristic.version), characteristic.id, {
        name: "Marca",
        maintenanceActivity: activity,
      }),
    ).rejects.toThrow("Only components");
    const events = (
      await pool.query(
        "select event_type,before_data->>'row_version' as before from equipment.events where resource_id=$1 order by occurred_at",
        [entryA.id],
      )
    ).rows;
    expect(events).toEqual([
      { event_type: "ACCOUNT_CATALOG_CREATED", before: null },
      { event_type: "ACCOUNT_CATALOG_UPDATED", before: "1" },
    ]);
  });

  it("retires without deletion and keeps identity immutable", async () => {
    const retired = await catalog.retire(req("ownerA", 2), entryA.id, retire);
    expect(retired).toMatchObject({ status: "retired", version: 3 });
    await expect(catalog.retire(req("ownerA", 3), entryA.id, retire)).rejects.toThrow(
      "already retired",
    );
    await expect(
      catalog.update(req("ownerA", 3), entryA.id, { name: "Reactivar" }),
    ).rejects.toThrow("Retired");
    expect((await catalog.list(req("ownerA"), { status: "retired" })).items).toEqual([
      expect.objectContaining({ id: entryA.id }),
    ]);
    const usable = (await templates.catalog(req("ownerA"))) as RecordRow[];
    expect(usable.map((e) => e.id)).not.toContain(entryA.id);
    expect(
      (
        await pool.query("select reason from audit.events where entity_id=$1 and operation=$2", [
          entryA.id,
          "ACCOUNT_CATALOG_RETIRED",
        ])
      ).rows,
    ).toEqual([{ reason: retire.reason }]);
    await expect(
      pool.query("delete from equipment.catalog_entries where id=$1", [entryA.id]),
    ).rejects.toThrow("cannot be deleted");
    await expect(
      pool.query("update equipment.catalog_entries set account_id=$2 where id=$1", [entryA.id, b]),
    ).rejects.toThrow("immutable");
    await expect(
      pool.query(
        "update equipment.catalog_entries set scope='OFFICIAL',account_id=null where id=$1",
        [entryA.id],
      ),
    ).rejects.toThrow("immutable");
  });

  it("paginates own entries with an opaque cursor", async () => {
    const first = await catalog.list(req("ownerA"), { limit: "2" });
    expect(first.items).toHaveLength(2);
    expect(first.page.hasMore).toBe(true);
    const second = await catalog.list(req("ownerA"), { limit: "2", cursor: first.page.nextCursor });
    expect(second.page.hasMore).toBe(false);
    expect([...first.items, ...second.items].map((e) => e.code)).toEqual([
      "CMP",
      "EXTERNAL-BRAND",
      "UV-LAMP",
    ]);
    await expect(catalog.list(req("ownerA"), { cursor: "!!" })).rejects.toThrow("cursor");
  });

  it("keeps ACCOUNT_READ_ONLY for account mutations", async () => {
    await pool.query("update identity.accounts set access_mode='READ_ONLY' where id=$1", [a]);
    try {
      const response = await fetch(`${baseUrl}/v1/account-catalog-entries`, {
        method: "POST",
        headers: http("ownerA", { "idempotency-key": randomUUID() }),
        body: JSON.stringify({ ...component, code: "READ-ONLY" }),
      });
      expect(response.status).toBe(403);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe(
        "ACCOUNT_READ_ONLY",
      );
    } finally {
      await pool.query("update identity.accounts set access_mode='ACTIVE' where id=$1", [a]);
    }
  });
});
