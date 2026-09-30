import { readFile, mkdir } from "node:fs/promises";
import { randomUUID, randomBytes, createCipheriv, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authorize } from "../../packages/authorization/src/index.js";
import { apiErrorSchema, subscriptionSchema, subscriptionViewSchema } from "@ice24/contracts";
import { SubscriptionsController } from "../../apps/api/src/modules/subscriptions/interface/subscriptions.controller.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { SubscriptionDatabase } from "../../apps/api/src/modules/subscriptions/infrastructure/subscription.database.js";
import { SubscriptionsService } from "../../apps/api/src/modules/subscriptions/application/subscriptions.service.js";
import type { SecurityRequest } from "../../apps/api/src/common/security/security-request.js";
import type { SubscriptionCommand } from "../../apps/api/src/modules/subscriptions/domain/subscription.js";

describe("F5-01 subscriptions, transactions and isolation", () => {
  let container: StartedPostgreSqlContainer,
    pool: Pool,
    identity: IdentityStore,
    db: SubscriptionDatabase,
    service: SubscriptionsService;
  const oldUrl = process.env.DATABASE_URL;
  let app: {
    listen(port: number, host: string): Promise<void>;
    getUrl(): Promise<string>;
    close(): Promise<void>;
    setGlobalPrefix(prefix: string): void;
  };
  let url: string;
  const actors = new Map<string, { user: string; account: string; context: string }>();
  function req(
    name = "admin",
    version = 1,
    key = randomUUID(),
    aal: "aal1" | "aal2" = "aal2",
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
        iss: "https://test.invalid",
        aud: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        aal,
      },
    };
  }
  async function context(name: string, account: string, user: string, role: string) {
    const membership = randomUUID(),
      context = randomUUID();
    await pool.query(
      "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE') on conflict do nothing",
      [membership, account, user],
    );
    const member = (
      await pool.query<{ id: string }>(
        "select id from identity.account_memberships where account_id=$1 and user_id=$2",
        [account, user],
      )
    ).rows[0]!.id;
    await pool.query(
      "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2 on conflict do nothing",
      [member, role],
    );
    await pool.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [member],
    );
    await pool.query(
      "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
      [context, user, account, member],
    );
    actors.set(name, { user, account, context });
  }
  const input = (name: string) => ({
    accountName: `Synthetic ${name}`,
    accountType: "COMPANY",
    ownerUserId: actors.get("owner")!.user,
  });
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query("create role anon; create role authenticated; create role service_role;");
    for (const file of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
      "20260924000100_phase5_subscriptions.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new SubscriptionDatabase(identity);
    service = new SubscriptionsService(db);
    for (const [name, role] of [
      ["admin", "IA"],
      ["owner", "OW"],
      ["other", "OW"],
    ]) {
      const account = randomUUID(),
        user = randomUUID();
      await pool.query(
        "insert into identity.accounts(id,name,account_type) values($1,$2,'COMPANY')",
        [account, name],
      );
      await pool.query(
        "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,$2,$3,$2,'ACTIVE')",
        [user, name, `${name}@example.test`],
      );
      await context(name!, account, user, role!);
    }
  });
  afterAll(async () => {
    await app?.close();
    await db?.onModuleDestroy();
    if (!app) await identity?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
  });

  it("serves authenticated HTTP with normalized errors and published OpenAPI schemas", async () => {
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module: (metadata: unknown) => ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create: (module: unknown, options: unknown) => Promise<typeof app> };
    };
    const { SwaggerModule } = apiRequire("@nestjs/swagger") as {
      SwaggerModule: {
        createDocument: (app: unknown, config: unknown) => { paths: Record<string, unknown> };
      };
    };
    class TestModule {}
    Module({
      controllers: [SubscriptionsController],
      providers: [
        AuthenticationGuard,
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify: async (token: string) => {
              if (!actors.has(token)) throw new Error("Invalid fixture");
              return req(token).identityClaims;
            },
          },
        },
        { provide: IdentityStore, useValue: identity },
        { provide: SubscriptionsService, useValue: service },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix("v1");
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
    const demo = await service.provisionDemo(req(), input("http"));
    await context("http", demo.accountId, actors.get("owner")!.user, "OW");
    const response = await fetch(`${url}/v1/subscription`, {
      headers: { authorization: "Bearer http", "x-ice24-context-id": actors.get("http")!.context },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(subscriptionViewSchema.parse(await response.json()).accountId).toBe(demo.accountId);
    const unauthenticated = await fetch(`${url}/v1/subscription`);
    expect(unauthenticated.status).toBe(401);
    expect(apiErrorSchema.parse(await unauthenticated.json()).error.code).toBe(
      "AUTHENTICATION_REQUIRED",
    );
    const headers = {
      authorization: "Bearer admin",
      "x-ice24-context-id": actors.get("admin")!.context,
      "content-type": "application/json",
      "idempotency-key": randomUUID(),
      "if-match": "1",
    };
    const invalid = await fetch(`${url}/v1/admin/demos/${demo.id}/extend`, {
      method: "POST",
      headers,
      body: JSON.stringify({ newExpiresAt: "not-a-date", reason: "short" }),
    });
    expect(invalid.status).toBe(400);
    expect(apiErrorSchema.parse(await invalid.json()).error.code).toBe("VALIDATION_FAILED");
    const extended = await fetch(`${url}/v1/admin/demos/${demo.id}/extend`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        newExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        reason: "Approved demonstration extension",
      }),
    });
    expect(extended.status).toBe(200);
    expect(subscriptionViewSchema.parse(await extended.json()).version).toBe(2);
    const document = SwaggerModule.createDocument(app, { info: { title: "Test", version: "1" } });
    expect(document.paths["/v1/subscription"]).toBeDefined();
    expect(document.paths["/v1/admin/demos/{demoId}/extend"]).toBeDefined();
    expect(JSON.stringify(document.paths["/v1/subscription"])).toContain("providerCustomerId");
    expect(
      (
        await fetch(`${url}/v1/subscription`, {
          method: "PATCH",
          headers,
          body: '{"status":"active"}',
        })
      ).status,
    ).toBe(404);
  });

  it("provisions independent demo fixtures spanning two months, with 14-day access and idempotent replay", async () => {
    const r = req(),
      demo = await service.provisionDemo(r, input("demo"));
    expect(subscriptionSchema.safeParse(demo).success).toBe(true);
    expect(Date.parse(demo.demoExpiresAt!) - Date.parse(demo.createdAt)).toBe(14 * 86400000);
    expect(await service.provisionDemo(r, input("demo"))).toEqual(demo);
    await expect(service.provisionDemo(r, input("changed"))).rejects.toThrow("different input");
    const another = await service.provisionDemo(req(), input("second"));
    expect(another.accountId).not.toBe(demo.accountId);
    const fixtures = await pool.query<{ count: string; months: boolean }>(
      "select count(*) as count,max(created_at)-min(created_at)>=interval '59 days' as months from equipment.requests where account_id=$1",
      [demo.accountId],
    );
    expect(fixtures.rows[0]).toEqual({ count: "6", months: true });
    await context("demo", demo.accountId, actors.get("owner")!.user, "OW");
    expect(subscriptionViewSchema.parse(await service.read(req("demo"))).accessMode).toBe("ACTIVE");
    await expect(service.read(req("other"))).rejects.toThrow("not found");
    const forged = req("other");
    forged.headers["x-ice24-context-id"] = actors.get("demo")!.context;
    await expect(service.read(forged)).rejects.toThrow();
  });
  it("denies demo administration to owners, low MFA and revoked contexts", async () => {
    const demo = await service.provisionDemo(req(), input("permissions"));
    const extension = {
      newExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      reason: "Approved demonstration extension",
    };
    await expect(service.extendDemo(req("owner"), demo.id, extension)).rejects.toThrow();
    await expect(
      service.extendDemo(req("admin", 1, randomUUID(), "aal1"), demo.id, extension),
    ).rejects.toThrow();
    const old = actors.get("other")!.context;
    await pool.query(
      "update identity.context_sessions set revoked_at=now(),revocation_reason='test' where id=$1",
      [old],
    );
    await expect(service.read(req("other"))).rejects.toThrow();
  });
  it("serializes concurrent extensions, rejects stale versions and keeps audit append-only", async () => {
    const demo = await service.provisionDemo(req(), input("concurrency"));
    const extension = {
      newExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      reason: "Approved demonstration extension",
    };
    const results = await Promise.allSettled([
      service.extendDemo(req(), demo.id, extension),
      service.extendDemo(req(), demo.id, extension),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(service.extendDemo(req(), demo.id, extension)).rejects.toThrow("version");
    expect(
      (await pool.query("select * from subscriptions.events where subscription_id=$1", [demo.id]))
        .rowCount,
    ).toBe(2);
    await expect(
      pool.query("delete from subscriptions.events where subscription_id=$1", [demo.id]),
    ).rejects.toThrow("append-only");
    await expect(
      pool.query(
        "update subscriptions.events set reason='changed reason' where subscription_id=$1",
        [demo.id],
      ),
    ).rejects.toThrow("append-only");
  });
  it("creates a clean production account, preserves demo data and updates payment access atomically", async () => {
    const demo = await service.provisionDemo(req(), input("conversion"));
    const r = req(),
      production = await service.provisionProduction(r, demo.id, input("production"));
    expect(production.accountId).not.toBe(demo.accountId);
    expect(production.isDemo).toBe(false);
    expect(await service.provisionProduction(r, demo.id, input("production"))).toEqual(production);
    await expect(service.provisionProduction(req(), demo.id, input("duplicate"))).rejects.toThrow(
      "already",
    );
    expect(
      (
        await pool.query("select * from equipment.branches where account_id=$1", [
          production.accountId,
        ])
      ).rowCount,
    ).toBe(0);
    expect(
      (await pool.query("select * from equipment.requests where account_id=$1", [demo.accountId]))
        .rowCount,
    ).toBe(6);
    await context("production", production.accountId, actors.get("owner")!.user, "OW");
    const payment: SubscriptionCommand = {
      type: "payment_confirmed",
      customerId: `cus_${randomUUID()}`,
      subscriptionId: `sub_${randomUUID()}`,
      periodStart: new Date(Date.now() - 1000).toISOString(),
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    let state = await service.applyTrustedCommand(
      req(),
      production.accountId,
      payment,
      "Confirmed payment test fixture",
    );
    expect((await service.read(req("production"))).accessMode).toBe("ACTIVE");
    state = await service.applyTrustedCommand(
      req("admin", state.version),
      production.accountId,
      { type: "payment_failed" },
      "Rejected payment test fixture",
    );
    const subject = await identity.getAuthorizationSubject(
      actors.get("production")!.user,
      actors.get("production")!.context,
      "aal2",
    );
    expect(
      authorize(subject, {
        accountId: production.accountId,
        permission: "equipment.manage",
        classification: "CONFIDENTIAL",
        operation: "WRITE",
      }).allowed,
    ).toBe(false);
    expect((await service.read(req("production"))).accessMode).toBe("READ_ONLY");
    state = await service.applyTrustedCommand(
      req("admin", state.version),
      production.accountId,
      payment,
      "Confirmed payment test fixture",
    );
    expect(state.status).toBe("reactivated");
    await pool.query("update identity.accounts set access_mode='SUSPENDED' where id=$1", [
      production.accountId,
    ]);
    state = await service.applyTrustedCommand(
      req("admin", state.version),
      production.accountId,
      { type: "payment_failed" },
      "Rejected payment test fixture",
    );
    await service.applyTrustedCommand(
      req("admin", state.version),
      production.accountId,
      payment,
      "Confirmed payment test fixture",
    );
    expect(
      (
        await pool.query<{ access_mode: string }>(
          "select access_mode from identity.accounts where id=$1",
          [production.accountId],
        )
      ).rows[0]!.access_mode,
    ).toBe("SUSPENDED");
  });
  it("denies writes immediately when demo time expires, before a scheduler runs", async () => {
    const demo = await service.provisionDemo(req(), input("expiry"));
    await context("expired", demo.accountId, actors.get("owner")!.user, "OW");
    await pool.query(
      "update subscriptions.records set demo_expires_at=now()-interval '1 second',row_version=row_version+1 where id=$1",
      [demo.id],
    );
    expect((await service.read(req("expired"))).accessMode).toBe("READ_ONLY");
    const subject = await identity.getAuthorizationSubject(
      actors.get("expired")!.user,
      actors.get("expired")!.context,
      "aal2",
    );
    expect(subject.accountAccessMode).toBe("READ_ONLY");
    const result = await service.extendDemo(req("admin", 2), demo.id, {
      newExpiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
      reason: "Approved expiry extension",
    });
    expect(result.accessMode).toBe("ACTIVE");
  });
  it("rolls back provisioning when the fixture insert fails", async () => {
    const count = (await pool.query<{ n: string }>("select count(*) n from identity.accounts"))
      .rows[0]!.n;
    await pool.query(
      "create function equipment.reject_demo_test() returns trigger language plpgsql as $$ begin raise exception 'fixture failure'; end $$; create trigger reject_demo_test before insert on equipment.branches for each row execute function equipment.reject_demo_test();",
    );
    try {
      await expect(service.provisionDemo(req(), input("rollback"))).rejects.toThrow(
        "fixture failure",
      );
    } finally {
      await pool.query(
        "drop trigger reject_demo_test on equipment.branches; drop function equipment.reject_demo_test();",
      );
    }
    expect(
      (await pool.query<{ n: string }>("select count(*) n from identity.accounts")).rows[0]!.n,
    ).toBe(count);
  });
  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "renders private subscription, demo expiry, empty state and mobile layout in Chromium",
    async () => {
      const demo = await service.provisionDemo(req(), input("browser"));
      await context("browser", demo.accountId, actors.get("owner")!.user, "OW");
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("Missing test port");
      const port = address.port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`,
        secret = randomBytes(32).toString("hex");
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
            PRIVATE_API_URL: `${url}/v1`,
            BFF_SESSION_SECRET: secret,
          },
          stdio: "ignore",
          windowsHide: true,
        },
      );
      const browser = await chromium.launch({ headless: true });
      try {
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          try {
            await fetch(origin);
            ready = true;
            break;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        if (!ready) throw new Error("Private web did not start");
        const client = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        async function login(name: string) {
          const iv = randomBytes(12),
            cipher = createCipheriv(
              "aes-256-gcm",
              createHash("sha256").update(secret).digest(),
              iv,
            );
          const encrypted = Buffer.concat([
            cipher.update(
              JSON.stringify({
                accessToken: name,
                refreshToken: "synthetic-test",
                expiresAt: Date.now() + 3600000,
                csrfToken: "test-only",
                contextId: actors.get(name)!.context,
              }),
            ),
            cipher.final(),
          ]);
          await client.addCookies([
            {
              name: "__Host-ice24_session",
              value: [iv, cipher.getAuthTag(), encrypted]
                .map((v) => v.toString("base64url"))
                .join("."),
              domain: "localhost",
              path: "/",
              secure: true,
              httpOnly: true,
              sameSite: "Lax",
            },
          ]);
        }
        await login("browser");
        const page = await client.newPage();
        await page.goto(`${origin}/subscription`);
        await page.getByRole("heading", { name: "Suscripción", exact: true }).waitFor();
        await page.getByText("Datos ficticios", { exact: true }).waitFor();
        expect(await page.getByText(/14 días restantes/).count()).toBe(1);
        await mkdir("tmp", { recursive: true });
        await page.screenshot({ path: "tmp/phase5-subscription-desktop.png", fullPage: true });
        await page.setViewportSize({ width: 375, height: 812 });
        const heading = await page
          .getByRole("heading", { name: "Suscripción", exact: true })
          .boundingBox();
        expect(heading?.y).toBeGreaterThanOrEqual(0);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({ path: "tmp/phase5-subscription-mobile.png", fullPage: true });
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
        await pool.query(
          "update subscriptions.records set demo_expires_at=now()-interval '1 second',row_version=row_version+1 where id=$1",
          [demo.id],
        );
        await page.reload();
        await page.getByText(/La demo venció/).waitFor();
        await page.getByText(/La cuenta está en modo lectura/).waitFor();
        await login("owner");
        await page.reload();
        await page
          .getByText("Esta cuenta todavía no tiene una suscripción registrada.", { exact: true })
          .waitFor();
        const anonymous = await browser.newPage();
        await anonymous.goto(`${origin}/subscription`);
        await anonymous.waitForURL(`${origin}/?error=expired`);
        expect(new URL(anonymous.url()).pathname).toBe("/");
      } finally {
        await browser.close();
        web.kill();
      }
    },
    60000,
  );

  it("blocks direct browser SQL and enforces cross-account audit references", async () => {
    const demo = await service.provisionDemo(req(), input("rls"));
    const client = await pool.connect();
    try {
      await client.query("set role authenticated");
      await expect(client.query("select * from subscriptions.records")).rejects.toThrow();
    } finally {
      await client.query("reset role");
      client.release();
    }
    await expect(
      pool.query(
        "insert into subscriptions.events(subscription_id,account_id,actor_id,context_id,correlation_id,event_type,reason,new_state) values($1,$2,$3,$4,$5,'Invalid','Invalid cross-account audit','{}')",
        [
          demo.id,
          actors.get("admin")!.account,
          actors.get("admin")!.user,
          actors.get("admin")!.context,
          randomUUID(),
        ],
      ),
    ).rejects.toThrow();
    await expect(
      pool.query("delete from subscriptions.records where id=$1", [demo.id]),
    ).rejects.toThrow("preserve history");
  });
});
