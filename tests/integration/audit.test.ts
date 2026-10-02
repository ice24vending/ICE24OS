import { readFile, mkdir } from "node:fs/promises";
import { randomUUID, randomBytes, createCipheriv, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { apiErrorSchema, auditPageSchema, type AuditEventInput } from "@ice24/contracts";
import { AuditController } from "../../apps/api/src/modules/audit/interface/audit.controller.js";
import { AuditService } from "../../apps/api/src/modules/audit/application/audit.service.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import type { AuthorizationSubject } from "@ice24/authorization";
import {
  appendAuditEvent,
  AuditDatabase,
} from "../../apps/api/src/modules/audit/infrastructure/audit.database.js";
import type { AuditScope } from "../../apps/api/src/modules/audit/application/audit.port.js";

describe("F5-04 PostgreSQL audit persistence and isolation", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let db: AuditDatabase | undefined;
  let app:
    | {
        listen(port: number, host: string): Promise<void>;
        getUrl(): Promise<string>;
        close(): Promise<void>;
        setGlobalPrefix(prefix: string): void;
      }
    | undefined;
  const oldUrl = process.env.DATABASE_URL;
  const a = randomUUID(),
    b = randomUUID(),
    branch = randomUUID();
  let eventA: string, eventB: string;
  const scope = (accountId: string | null): AuditScope => ({
    accountId,
    accountWide: true,
    branchIds: [],
    machineIds: [],
  });
  const fixture = (accountId: string | null): AuditEventInput => ({
    eventVersion: 1,
    occurredAt: "2026-10-02T12:00:00.123456Z",
    timeZone: "America/Mexico_City",
    actorUserId: null,
    actorType: "SYSTEM",
    contextSessionId: null,
    accountId,
    branchId: null,
    machineId: null,
    entityType: "SyntheticEntity",
    entityId: randomUUID(),
    operation: "SyntheticEventCreated",
    previousValues: null,
    newValues: { status: "ACTIVE" },
    reason: null,
    origin: "WORKER",
    ipAddress: "192.0.2.1",
    deviceSummary: null,
    result: "SUCCESS",
    correlationId: randomUUID(),
  });
  async function insert(input: AuditEventInput) {
    const client = await pool!.connect();
    try {
      return await appendAuditEvent(client, input);
    } finally {
      client.release();
    }
  }
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
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [a, b],
    );
    await pool.query("insert into equipment.branches(id,account_id,data) values($1,$2,'{}')", [
      branch,
      a,
    ]);
    process.env.DATABASE_URL = container.getConnectionUri();
    db = new AuditDatabase();
    eventA = await insert(fixture(a));
    eventB = await insert(fixture(b));
    await insert(fixture(null));
  });
  afterAll(async () => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    await app?.close();
    await db?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
  });
  it("rejects UPDATE, DELETE and TRUNCATE even with table-owner privileges", async () => {
    for (const sql of [
      "update audit.events set reason='tampered' where id=$1",
      "delete from audit.events where id=$1",
    ]) {
      await expect(pool!.query(sql, [eventA])).rejects.toMatchObject({ code: "55000" });
    }
    await expect(pool!.query("truncate audit.events")).rejects.toMatchObject({ code: "55000" });
    expect((await db!.detail(scope(a), eventA))?.reason).toBeNull();
    expect(await db!.detail(scope(b), eventB)).not.toBeNull();
  });
  it("does not grant mutation or direct browser access", async () => {
    const result = await pool!.query<{ allowed: boolean }>(`select
      has_table_privilege('service_role','audit.events','UPDATE') or
      has_table_privilege('service_role','audit.events','DELETE') or
      has_table_privilege('service_role','audit.events','TRUNCATE') or
      has_table_privilege('authenticated','audit.events','SELECT') or
      has_table_privilege('anon','audit.events','INSERT') as allowed`);
    expect(result.rows[0]!.allowed).toBe(false);
    const client = await pool!.connect();
    try {
      await client.query("set role service_role");
      for (const sql of [
        "update audit.events set reason='tampered'",
        "delete from audit.events",
        "truncate audit.events",
      ]) {
        await expect(client.query(sql)).rejects.toMatchObject({ code: "42501" });
      }
    } finally {
      await client.query("reset role");
      client.release();
    }
  });
  it("isolates list and detail, including forged cursors and global records", async () => {
    expect((await db!.list(scope(a), { limit: 100 })).items.every((e) => e.accountId === a)).toBe(
      true,
    );
    expect(await db!.detail(scope(a), eventB)).toBeNull();
    expect((await db!.list(scope(a), { limit: 100, accountId: b })).items).toEqual([]);
    expect(
      (await db!.list(scope(null), { limit: 100 })).items.some((e) => e.accountId === null),
    ).toBe(true);
    const cursor = Buffer.from(JSON.stringify(["2027-01-01T00:00:00.000000Z", eventB])).toString(
      "base64url",
    );
    expect(
      (await db!.list(scope(a), { limit: 100, cursor })).items.every((e) => e.accountId === a),
    ).toBe(true);
  });
  it("enforces branch scope and rejects cross-account references", async () => {
    const id = await insert({ ...fixture(a), branchId: branch });
    const limited = { ...scope(a), accountWide: false, branchIds: [branch] };
    expect((await db!.list(limited, { limit: 100 })).items.map((e) => e.id)).toEqual([id]);
    expect(await db!.detail(limited, eventA)).toBeNull();
    expect((await db!.list({ ...limited, branchIds: [] }, { limit: 100 })).items).toEqual([]);
    await expect(insert({ ...fixture(b), branchId: branch })).rejects.toMatchObject({
      code: "23514",
    });
  });
  it("paginates equal microsecond timestamps without loss or duplication and filters", async () => {
    const correlationId = randomUUID();
    const ids = [];
    for (let i = 0; i < 3; i++) ids.push(await insert({ ...fixture(a), correlationId }));
    const first = await db!.list(scope(a), { limit: 2, correlationId });
    expect(first.page.hasMore).toBe(true);
    const second = await db!.list(scope(a), {
      limit: 2,
      correlationId,
      cursor: first.page.nextCursor!,
    });
    expect(second.page).toEqual({ hasMore: false, nextCursor: null });
    expect([...first.items, ...second.items].map((e) => e.id).sort()).toEqual(ids.sort());
    expect((await db!.list(scope(a), { limit: 10, result: "DENIED" })).items).toEqual([]);
    expect((await db!.list(scope(a), { limit: 10, from: "2026-10-03T00:00:00Z" })).items).toEqual(
      [],
    );
  });
  it("rolls back audit together with the caller's transaction", async () => {
    const client = await pool!.connect();
    try {
      await client.query("begin");
      await client.query("update identity.accounts set name='Rolled back' where id=$1", [a]);
      const id = await appendAuditEvent(client, fixture(a));
      await client.query("rollback");
      expect(await db!.detail(scope(a), id)).toBeNull();
      expect(
        (await pool!.query<{ name: string }>("select name from identity.accounts where id=$1", [a]))
          .rows[0]!.name,
      ).toBe("Synthetic A");
    } finally {
      client.release();
    }
  });
  it("projects identity membership and denied security events without copying arbitrary metadata", async () => {
    const user = randomUUID();
    const target = randomUUID(),
      actorMembership = randomUUID();
    await pool!.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,'audit-fixture','audit@example.test','Synthetic actor','ACTIVE')",
      [user],
    );
    await pool!.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,'audit-target','target@example.test','Synthetic target','ACTIVE')",
      [target],
    );
    await pool!.query(
      "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
      [actorMembership, a, user],
    );
    await pool!.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [actorMembership],
    );
    const identity = new IdentityStore();
    try {
      const correlationId = randomUUID();
      const membership = await identity.createMembership({
        actorUserId: user,
        accountId: a,
        userId: target,
        roleCodes: ["AU"],
        branchIds: [],
        machineIds: [],
        correlationId,
      });
      const events = await db!.list(scope(a), { limit: 25, correlationId });
      expect(events.items).toHaveLength(1);
      expect(events.items[0]!.actorUserId).toBe(user);
      expect(events.items[0]!.newValues).toMatchObject({
        membershipId: membership.id,
        roleCodes: ["AU"],
      });
      const denied = randomUUID();
      await pool!.query(
        "insert into audit.security_events(event_type,result,correlation_id,metadata) values('LOGIN_FAILED','DENIED',$1,'{\"token\":\"must-not-copy\"}')",
        [denied],
      );
      const central = await db!.list(scope(null), { limit: 25, correlationId: denied });
      expect(central.items[0]!.result).toBe("DENIED");
      expect(JSON.stringify(central.items)).not.toContain("must-not-copy");
    } finally {
      await identity.onModuleDestroy();
    }
  });
  it("serves the three documented routes with real authentication/authorization guards", async () => {
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    const { SwaggerModule } = apiRequire("@nestjs/swagger") as {
      SwaggerModule: {
        createDocument(app: unknown, config: unknown): { paths: Record<string, unknown> };
      };
    };
    const user = randomUUID(),
      context = randomUUID();
    let permissions: AuthorizationSubject["permissions"] = [
      { code: "audit.read", effect: "ALLOW", classification: "RESTRICTED" },
    ];
    let aal: "aal1" | "aal2" = "aal2";
    class TestModule {}
    Module({
      controllers: [AuditController],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        { provide: AuditService, useValue: new AuditService(db!) },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify(token: string) {
              if (token !== "fixture") throw new Error("Invalid fixture token");
              return { sub: user, aal };
            },
          },
        },
        {
          provide: IdentityStore,
          useValue: {
            synchronizeIdentity: () => ({ id: user, status: "ACTIVE" }),
            getAuthorizationSubject: (): AuthorizationSubject => ({
              userId: user,
              membershipId: randomUUID(),
              membershipAccountId: a,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: "READ_ONLY",
              assuranceLevel: aal,
              permissions,
              accountWide: true,
              branchIds: new Set(),
              machineIds: new Set(),
            }),
          },
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();
    const headers = { authorization: "Bearer fixture", "x-ice24-context-id": context };
    const list = await fetch(`${url}/api/v1/audit-events`, { headers });
    expect(list.status).toBe(200);
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect(
      auditPageSchema.parse(await list.json()).items.every((event) => event.accountId === a),
    ).toBe(true);
    expect((await fetch(`${url}/api/v1/audit-events/${eventA}`, { headers })).status).toBe(200);
    for (const [path, status] of [
      [`audit-events/${eventB}`, 404],
      ["audit-events?limit=101", 400],
      ["audit-events?cursor=bad", 400],
      ["admin/audit-events", 403],
      [`audit-events?accountId=${b}`, 403],
    ] as const) {
      const response = await fetch(`${url}/api/v1/${path}`, { headers });
      expect(response.status).toBe(status);
      expect(apiErrorSchema.safeParse(await response.json()).success).toBe(true);
    }
    expect((await fetch(`${url}/api/v1/audit-events`)).status).toBe(401);
    permissions = [{ code: "audit.global-read", effect: "ALLOW", classification: "RESTRICTED" }];
    const global = await fetch(`${url}/api/v1/admin/audit-events`, { headers });
    expect(global.status).toBe(200);
    expect(
      auditPageSchema.parse(await global.json()).items.some((event) => event.accountId === b),
    ).toBe(true);
    aal = "aal1";
    expect((await fetch(`${url}/api/v1/admin/audit-events`, { headers })).status).toBe(403);
    const document = SwaggerModule.createDocument(app, { info: { title: "Audit", version: "1" } });
    for (const path of [
      "/api/v1/audit-events",
      "/api/v1/audit-events/{eventId}",
      "/api/v1/admin/audit-events",
    ])
      expect(document.paths[path]).toBeDefined();
    aal = "aal2";
    permissions = ["audit.read", "audit.global-read"].map((code) => ({
      code,
      effect: "ALLOW",
      classification: "RESTRICTED",
    }));
  });
  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "renders audit filters, cursor pages, detail, errors and mobile layout in Chromium",
    async () => {
      for (let i = 0; i < 28; i++) await insert(fixture(a));
      await insert({ ...fixture(a), result: "FAILED", operation: "SyntheticFailure" });
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const port = address.port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`,
        secret = randomBytes(32).toString("hex"),
        contextId = randomUUID();
      const web = spawn(
        process.execPath,
        [
          fileURLToPath(
            new URL("../../apps/private-web/node_modules/next/dist/bin/next", import.meta.url),
          ),
          "start",
          "--port",
          String(port),
          "--hostname",
          "127.0.0.1",
        ],
        {
          cwd: fileURLToPath(new URL("../../apps/private-web", import.meta.url)),
          env: {
            ...process.env,
            NODE_ENV: "production",
            PRIVATE_API_URL: `${await app!.getUrl()}/api/v1`,
            PRIVATE_WEB_URL: origin,
            BFF_SESSION_SECRET: secret,
          },
          stdio: "ignore",
          windowsHide: true,
        },
      );
      const browser = await chromium.launch({ headless: true });
      try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
          try {
            await fetch(origin);
            ready = true;
            break;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        if (!ready) throw new Error("Private web did not start");
        const client = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        async function login(context: string) {
          const iv = randomBytes(12),
            cipher = createCipheriv(
              "aes-256-gcm",
              createHash("sha256").update(secret).digest(),
              iv,
            );
          const encrypted = Buffer.concat([
            cipher.update(
              JSON.stringify({
                accessToken: "fixture",
                refreshToken: "synthetic",
                expiresAt: Date.now() + 3600000,
                csrfToken: "synthetic",
                contextId: context,
              }),
            ),
            cipher.final(),
          ]);
          await client.addCookies([
            {
              name: "__Host-ice24_session",
              value: [iv, cipher.getAuthTag(), encrypted]
                .map((part) => part.toString("base64url"))
                .join("."),
              domain: "localhost",
              path: "/",
              secure: true,
              httpOnly: true,
              sameSite: "Lax",
            },
          ]);
        }
        await login(contextId);
        const page = await client.newPage();
        await page.goto(`${origin}/audit`);
        await page.getByRole("heading", { name: "Auditoría", exact: true }).waitFor();
        await page.getByRole("button", { name: "Siguiente", exact: true }).click();
        await page.getByText("Página 2", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Anterior", exact: true }).click();
        await page.getByText("Página 1", { exact: true }).waitFor();
        await page
          .getByRole("button", { name: /Ver detalle de/ })
          .first()
          .click();
        await page.getByRole("heading", { name: "Detalle del evento", exact: true }).waitFor();
        expect(await page.locator(".audit-detail").textContent()).toContain("Correlación");
        expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(
          "Evento seleccionado",
        );
        await mkdir("docs/qa/phase-5/evidence", { recursive: true });
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261002-f5-04-desktop.png",
          fullPage: true,
        });
        await page.getByRole("button", { name: "Cerrar detalle" }).click();
        await page.getByLabel("Tipo de evento", { exact: true }).fill("SyntheticFailure");
        await page.getByLabel("Estado", { exact: true }).selectOption("FAILED");
        await page.getByLabel("Desde (UTC)", { exact: true }).fill("2026-10-02");
        await page.getByLabel("Hasta (UTC)", { exact: true }).fill("2026-10-02");
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page.getByText("1 eventos · Página 1", { exact: true }).waitFor();
        expect(await page.locator("tbody tr").count()).toBe(1);
        await page.getByLabel("Actor (ID)", { exact: true }).fill(randomUUID());
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page
          .getByText("No hay eventos que coincidan con los filtros.", { exact: true })
          .waitFor();
        await page.getByRole("button", { name: "Limpiar filtros" }).click();
        await page.locator("tbody tr").first().waitFor();
        await page.setViewportSize({ width: 375, height: 812 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261002-f5-04-mobile.png",
          fullPage: true,
        });
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
        await page.getByLabel("Ámbito", { exact: true }).selectOption("global");
        await page.getByLabel("Cuenta (ID, opcional)", { exact: true }).fill(b);
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page.getByText("1 eventos · Página 1", { exact: true }).waitFor();
        await page
          .getByRole("button", { name: /Ver detalle de/ })
          .first()
          .click();
        expect(await page.locator(".audit-detail").textContent()).toContain(b);
        await page.route("**/api/audit?**", (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Servicio temporalmente no disponible." }),
          }),
        );
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page.getByRole("alert").waitFor();
        expect(await page.locator("tbody tr").count()).toBe(0);
        await page.unroute("**/api/audit?**");
        await page.getByRole("button", { name: "Reintentar" }).click();
        await page.locator("tbody tr").first().waitFor();
        await login(randomUUID());
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page
          .getByText("El contexto cambió en otra pestaña. Recarga esta página.", { exact: true })
          .waitFor();
        expect(await page.locator("tbody tr").count()).toBe(0);
        await client.close();
      } finally {
        await browser.close();
        web.kill();
      }
    },
    60000,
  );
});
