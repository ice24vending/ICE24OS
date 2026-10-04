import { mkdir, readFile } from "node:fs/promises";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import {
  apiErrorSchema,
  notificationPageSchema,
  notificationSchema,
  notificationSummarySchema,
} from "@ice24/contracts";
import { NotificationsController } from "../../apps/api/src/modules/notifications/interface/notifications.controller.js";
import { NotificationsService } from "../../apps/api/src/modules/notifications/application/notifications.service.js";
import { NotificationsDatabase } from "../../apps/api/src/modules/notifications/infrastructure/notifications.database.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { domainEventConsumers } from "../../apps/worker/src/consumers/index.js";

// Full F5-11 path: subscription producer → transactional outbox → publisher → domain_events →
// worker consumer (real registry) → notifications.* → Nest API with real guards → BFF/UI.
describe("F5-11 notification center: persistent alerts and their lifecycle", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let db: NotificationsDatabase | undefined;
  let app:
    | {
        listen(port: number, host: string): Promise<void>;
        getUrl(): Promise<string>;
        close(): Promise<void>;
        setGlobalPrefix(prefix: string): void;
      }
    | undefined;
  let url = "";
  const oldUrl = process.env.DATABASE_URL;
  const account = randomUUID(),
    otherAccount = randomUUID(),
    branch = randomUUID(),
    owner = randomUUID(),
    operator = randomUUID(),
    otherOwner = randomUUID(),
    subscription = randomUUID(),
    otherSubscription = randomUUID(),
    ownerContext = randomUUID(),
    otherContext = randomUUID();
  const allow = (...codes: string[]) =>
    codes.map((code) => ({
      code,
      effect: "ALLOW" as const,
      classification: "CONFIDENTIAL" as const,
    }));
  // Mutable subject of the stubbed identity store (the API derives everything else).
  let actor = owner;
  let subjectAccount = account;
  let permissions: AuthorizationSubject["permissions"] = [];
  let accessMode: AuthorizationSubject["accountAccessMode"] = "ACTIVE";
  const as = (user: string, accountId = account, mode: typeof accessMode = "ACTIVE") => {
    actor = user;
    subjectAccount = accountId;
    accessMode = mode;
    permissions = allow("notifications.read", "notifications.attend");
  };
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/api/v1/${path}`, {
      ...init,
      headers: {
        authorization: "Bearer fixture",
        "x-ice24-context-id": actor === otherOwner ? otherContext : ownerContext,
        ...((init.headers as Record<string, string>) ?? {}),
      },
    });
  const act = (id: string, action: string, body: unknown = {}, key: string | null = randomUUID()) =>
    call(`notifications/${id}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(body),
    });
  const errorCode = async (response: Response) =>
    apiErrorSchema.parse(await response.json()).error.code;
  const inbox = async (query = "") => {
    const response = await call(`notifications${query}`);
    expect(response.status).toBe(200);
    return notificationPageSchema.parse(await response.json());
  };
  const summary = async () =>
    notificationSummarySchema.parse(await (await call("notifications/summary")).json());

  /** Real producer: a subscription event in its own transaction feeds the outbox. */
  async function produce(eventType: string, subscriptionId = subscription, accountId = account) {
    const id = randomUUID();
    await pool!.query(
      `insert into subscriptions.events(id,subscription_id,account_id,actor_id,context_id,correlation_id,
         event_type,reason,previous_state,new_state,actor_type)
       values($1,$2,$3,$4,$5,$6,$7,'Stripe reported a failed renewal charge','{"status":"active"}',
         '{"status":"payment_failed"}','USER')`,
      [
        id,
        subscriptionId,
        accountId,
        accountId === account ? owner : otherOwner,
        accountId === account ? ownerContext : otherContext,
        randomUUID(),
        eventType,
      ],
    );
    await pool!.query("select * from infra.publish_outbox(500)");
    return id;
  }
  /** Worker loop with the production consumer registry. */
  const drain = async () => {
    for (let i = 0; i < 5; i++) {
      const result = await processDomainEvents(pool!, domainEventConsumers, { batchSize: 100 });
      if (result.received === 0) return;
    }
  };
  const setSubscription = (status: string, id = subscription) =>
    pool!.query(
      "update subscriptions.records set status=$2, row_version=row_version+1 where id=$1",
      [id, status],
    );

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
      "20261003000500_phase5_files.sql",
      "20261003000600_phase5_file_scans.sql",
      "20261003000700_phase5_downloads.sql",
      "20261003000800_phase5_notifications.sql",
      "20261003000900_phase5_email.sql",
    ])
      await pool.query(await migration(file));
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [account, otherAccount],
    );
    await pool.query(
      `insert into identity.users(id,identity_subject,username,email,display_name,status) values
       ($1::uuid,$1::text,'alerts-owner','alerts-owner@example.test','María Dueña','ACTIVE'),
       ($2::uuid,$2::text,'alerts-operator','alerts-operator@example.test','Operador','ACTIVE'),
       ($3::uuid,$3::text,'alerts-owner-b','alerts-owner-b@example.test','Dueño B','ACTIVE')`,
      [owner, operator, otherOwner],
    );
    await pool.query("insert into equipment.branches(id,account_id,data) values($1,$2,'{}')", [
      branch,
      account,
    ]);
    const memberships = [
      [owner, account, "OW", "ACCOUNT"],
      [operator, account, "OP", "BRANCH"],
      [otherOwner, otherAccount, "OW", "ACCOUNT"],
    ] as const;
    for (const [user, accountId, role, scope] of memberships) {
      const membership = randomUUID();
      await pool.query(
        "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
        [membership, accountId, user],
      );
      await pool.query(
        "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
        [membership, role],
      );
      await pool.query(
        "insert into authz.user_scopes(membership_id,scope_type,branch_id) values($1,$2,$3)",
        [membership, scope, scope === "BRANCH" ? branch : null],
      );
      if (user !== operator)
        await pool.query(
          "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
          [user === owner ? ownerContext : otherContext, user, accountId, membership],
        );
    }
    for (const [id, accountId, user] of [
      [subscription, account, owner],
      [otherSubscription, otherAccount, otherOwner],
    ] as const)
      await pool.query(
        `insert into subscriptions.records(id,account_id,provider_customer_id,provider_subscription_id,status,
           current_period_start,current_period_end,is_demo,created_by,updated_by)
         values($1,$2,$4,$5,'payment_failed',now()-interval '20 days',now()+interval '10 days',false,$3,$3)`,
        [id, accountId, user, `cus_${id.slice(0, 8)}`, `sub_${id.slice(0, 8)}`],
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    db = new NotificationsDatabase();
    as(owner);

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    class TestModule {}
    Module({
      controllers: [NotificationsController],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        { provide: NotificationsService, useValue: new NotificationsService(db) },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify(token: string) {
              if (token !== "fixture") throw new Error("Invalid fixture token");
              return { sub: actor, aal: "aal1" };
            },
          },
        },
        {
          provide: IdentityStore,
          useValue: {
            synchronizeIdentity: () => ({ id: actor, status: "ACTIVE" }),
            getAuthorizationSubject: async (): Promise<AuthorizationSubject> => ({
              userId: actor,
              membershipId: randomUUID(),
              membershipAccountId: subjectAccount,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: accessMode,
              assuranceLevel: "aal1",
              permissions,
              accountWide: actor !== operator,
              branchIds: new Set(actor === operator ? [branch] : []),
              machineIds: new Set(),
            }),
          },
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });
  afterAll(async () => {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    await app?.close();
    await db?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
  });

  it("turns a payment failure into a pinned critical alert, once, through outbox and worker", async () => {
    as(owner);
    const eventId = await produce("payment_failed");
    await drain();
    const page = await inbox();
    expect(page.items).toHaveLength(1);
    const alert = page.items[0]!;
    expect(alert).toMatchObject({
      type: "subscription.payment_failed",
      priority: "critical",
      status: "unread",
      pinned: true,
      recipientUserId: owner,
      relatedResource: { type: "subscription", id: subscription },
      sentChannels: ["in_app"],
      conditionOpen: true,
      action: { href: "/subscription", label: "Ver suscripción" },
    });
    expect(await summary()).toMatchObject({ badge: 1, unread: 1, pinned: 1 });
    // Redelivery of the same domain event never duplicates the alert.
    await pool!.query(
      "select pgmq.send('domain_events', message) from pgmq.a_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    await drain();
    expect((await inbox()).items).toHaveLength(1);
    const processed = await pool!.query(
      "select count(*)::int as total from infra.processed_messages where consumer='notification-center' and event_id=$1",
      [eventId],
    );
    expect(processed.rows[0]).toEqual({ total: 1 });
    const created = await pool!.query(
      "select actor_type, origin, (new_values->>'recipients')::int as recipients from audit.events where operation='NotificationCreated'",
    );
    expect(created.rows).toEqual([{ actor_type: "SYSTEM", origin: "WORKER", recipients: 1 }]);
  });

  it("reads, acknowledges, attends and resolves only once the payment recovers", async () => {
    as(owner);
    const [alert] = (await inbox()).items;
    const id = alert!.id;
    const detail = notificationSchema.parse(await (await call(`notifications/${id}`)).json());
    expect(detail.status).toBe("unread"); // NOT-002 never marks read

    const read = notificationSchema.parse(await (await act(id, "read")).json());
    expect(read).toMatchObject({ status: "read", pinned: true }); // RF-ALT-006
    expect(await summary()).toMatchObject({ unread: 0, pinned: 1, badge: 1 });

    const early = await act(id, "resolve", {
      resolutionResource: { type: "subscription", id: subscription },
    });
    expect([early.status, await errorCode(early)]).toEqual([409, "STATE_TRANSITION_INVALID"]);

    const ackKey = randomUUID();
    const acknowledged = notificationSchema.parse(
      await (await act(id, "acknowledge", {}, ackKey)).json(),
    );
    expect(acknowledged).toMatchObject({ status: "acknowledged", pinned: false, resolvedAt: null });
    expect((await act(id, "acknowledge", {}, ackKey)).status).toBe(200); // replay
    const reused = await act(id, "read", {}, ackKey);
    expect([reused.status, await errorCode(reused)]).toEqual([409, "IDEMPOTENCY_CONFLICT"]);

    const foreign = await act(id, "start-attention", {
      relatedResource: { type: "subscription", id: otherSubscription },
    });
    expect([foreign.status, await errorCode(foreign)]).toEqual([400, "VALIDATION_FAILED"]);
    const attending = notificationSchema.parse(
      await (
        await act(id, "start-attention", {
          relatedResource: { type: "subscription", id: subscription },
        })
      ).json(),
    );
    expect(attending).toMatchObject({
      status: "in_progress",
      attentionResource: { type: "subscription", id: subscription },
    });

    const blocked = await act(id, "resolve", {
      resolutionResource: { type: "subscription", id: subscription },
    });
    expect([blocked.status, await errorCode(blocked)]).toEqual([
      409,
      "RELATED_CONDITION_NOT_RESOLVED",
    ]);
    await setSubscription("active");
    const resolved = notificationSchema.parse(
      await (
        await act(id, "resolve", { resolutionResource: { type: "subscription", id: subscription } })
      ).json(),
    );
    expect(resolved).toMatchObject({ status: "resolved", conditionOpen: false });
    expect(resolved.audit.updatedBy).toBe(owner);
    expect((await inbox("?status=resolved")).items.map((n) => n.id)).toEqual([id]);
    expect(await summary()).toMatchObject({ badge: 0, resolved: 1 });

    const history = await pool!.query(
      "select action, to_status from notifications.recipient_transitions where recipient_id=$1 order by occurred_at",
      [id],
    );
    expect(history.rows.map((row) => `${row.action}>${row.to_status}`)).toEqual([
      "READ>READ",
      "ACKNOWLEDGE>ACKNOWLEDGED",
      "START_ATTENTION>IN_PROGRESS",
      "RESOLVE>RESOLVED",
    ]);
    const audited = await pool!.query(
      "select operation, actor_user_id, context_session_id from audit.events where entity_type='Notification' and entity_id=$1 order by occurred_at_utc",
      [id],
    );
    expect(audited.rows.map((row) => row.operation)).toEqual([
      "NotificationRead",
      "NotificationAcknowledged",
      "NotificationAttentionStarted",
      "NotificationResolved",
    ]);
    expect(audited.rows.every((row) => row.actor_user_id === owner)).toBe(true);
    expect(audited.rows.every((row) => row.context_session_id === ownerContext)).toBe(true);
  });

  it("isolates alerts by recipient and account and enforces permissions", async () => {
    await setSubscription("payment_failed");
    as(owner);
    await produce("enter_read_only");
    await drain();
    const [alert] = (await inbox("?pinned=true")).items;
    expect(alert).toMatchObject({ type: "subscription.read_only", pinned: true });

    // Another account: nothing visible, nothing changeable (404, never 403).
    as(otherOwner, otherAccount);
    expect((await inbox()).items).toHaveLength(0);
    expect((await call(`notifications/${alert!.id}`)).status).toBe(404);
    const foreign = await act(alert!.id, "acknowledge");
    expect([foreign.status, await errorCode(foreign)]).toEqual([404, "NOT_FOUND"]);
    // The other account's own payment failure stays in its own inbox.
    await produce("payment_failed", otherSubscription, otherAccount);
    await drain();
    expect((await inbox()).items.map((n) => n.relatedResource?.id)).toEqual([otherSubscription]);

    // Same account, no billing audience: the operator never received it.
    as(operator);
    expect((await inbox()).items).toHaveLength(0);
    expect((await act(alert!.id, "read")).status).toBe(404);

    as(owner);
    permissions = allow("notifications.read");
    const denied = await act(alert!.id, "acknowledge");
    expect([denied.status, await errorCode(denied)]).toEqual([403, "FORBIDDEN"]);
    permissions = [];
    expect((await call("notifications")).status).toBe(403);
    const anonymous = await fetch(`${url}/api/v1/notifications`);
    expect(anonymous.status).toBe(401);

    // A read-only account can still acknowledge its own alerts (the payment alert matters most).
    as(owner, account, "READ_ONLY");
    const acknowledged = await act(alert!.id, "acknowledge");
    expect(acknowledged.status).toBe(200);
    as(owner, account, "SUSPENDED");
    expect((await act(alert!.id, "start-attention")).status).toBe(403);
  });

  it("validates filters, cursors, bodies and idempotency keys", async () => {
    as(owner);
    for (const query of ["?status=RESOLVED", "?limit=0", "?cursor=bm9wZQ", "?userId=" + owner])
      expect((await call(`notifications${query}`)).status).toBe(400);
    const [alert] = (await inbox()).items;
    expect((await act(alert!.id, "acknowledge", {}, null)).status).toBe(400);
    expect((await act(alert!.id, "acknowledge", {}, "short")).status).toBe(400);
    expect((await act(alert!.id, "start-attention", {})).status).toBe(400);
    expect(
      (await act(alert!.id, "resolve", { resolutionResource: { type: "ticket", id: alert!.id } }))
        .status,
    ).toBe(400);
    expect((await act(randomUUID(), "read")).status).toBe(404);
    expect((await call("notifications/not-a-uuid")).status).toBe(400);
    const first = await inbox("?limit=1");
    expect(first.page.hasMore).toBe(true);
    const second = await inbox(`?limit=1&cursor=${first.page.nextCursor}`);
    expect(second.items[0]!.id).not.toBe(first.items[0]!.id);
  });

  it("documents NOT-001 to NOT-006 and the summary in OpenAPI", async () => {
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { SwaggerModule } = apiRequire("@nestjs/swagger") as {
      SwaggerModule: {
        createDocument(app: unknown, config: unknown): { paths: Record<string, unknown> };
      };
    };
    const document = SwaggerModule.createDocument(app, { info: { title: "Alerts", version: "1" } });
    for (const path of [
      "/api/v1/notifications",
      "/api/v1/notifications/summary",
      "/api/v1/notifications/{notificationId}",
      "/api/v1/notifications/{notificationId}/read",
      "/api/v1/notifications/{notificationId}/acknowledge",
      "/api/v1/notifications/{notificationId}/start-attention",
      "/api/v1/notifications/{notificationId}/resolve",
    ])
      expect(document.paths[path]).toBeDefined();
  });

  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "shows pinned critical alerts and walks read → acknowledged → in attention in Chromium",
    async () => {
      await setSubscription("payment_failed");
      as(owner);
      await produce("payment_failed");
      await drain();
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const port = address.port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`,
        secret = randomBytes(32).toString("hex"),
        csrfToken = randomBytes(16).toString("hex");
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
            PRIVATE_API_URL: `${url}/api/v1`,
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
        const iv = randomBytes(12),
          cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
        const encrypted = Buffer.concat([
          cipher.update(
            JSON.stringify({
              accessToken: "fixture",
              refreshToken: "synthetic",
              expiresAt: Date.now() + 3600000,
              csrfToken,
              contextId: ownerContext,
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
        const page = await client.newPage();
        await page.goto(`${origin}/workspace`);
        const bell = page.getByRole("link", {
          name: /^Alertas: \d+ relevantes?, 1 crítica sin enterado$/u,
        });
        await bell.waitFor();
        await bell.click();
        await page.getByRole("heading", { name: "Centro de alertas", exact: true }).waitFor();
        const pinned = page.getByRole("region", { name: "Críticas sin enterado" });
        await pinned.getByRole("heading", { name: "Pago de suscripción rechazado" }).waitFor();
        await page
          .getByText(/1 crítica sin enterado · \d+ en atención · \d+ resueltas?/u)
          .waitFor();
        await mkdir("docs/qa/phase-5/evidence", { recursive: true });
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261003-f5-11-desktop.png",
          fullPage: true,
        });
        // Opening marks it read but it stays pinned until "Enterado".
        await pinned.getByRole("button", { name: "Ver detalle" }).click();
        await pinned.getByText("Leída", { exact: true }).first().waitFor();
        expect(await pinned.getByText(/Fijada hasta que marques «Enterado»/u).count()).toBe(1);
        await pinned.getByRole("button", { name: "Marcar enterado" }).click();
        await page
          .getByText(/«Pago de suscripción rechazado»: Enterado\. El cambio quedó auditado\./u)
          .waitFor();
        await page
          .getByRole("region", { name: "Críticas sin enterado" })
          .waitFor({ state: "detached" });
        const card = page
          .locator(".alert-card", { hasText: "Pago de suscripción rechazado" })
          .first();
        await card.getByRole("button", { name: "Atender" }).click();
        await page.getByText(/«Pago de suscripción rechazado»: En atención\./u).waitFor();
        const resolve = card.getByRole("button", { name: "Marcar resuelta" });
        await resolve.waitFor();
        expect(await resolve.isDisabled()).toBe(true);
        await card.getByText(/Se podrá resolver cuando la causa esté cerrada/u).waitFor();
        await page.getByRole("button", { name: "En atención", exact: true }).click();
        await page.locator(".alert-card").first().waitFor();
        expect(await page.locator(".alert-card .alert-status").allTextContents()).toContain(
          "En atención",
        );
        await page.setViewportSize({ width: 375, height: 812 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261003-f5-11-mobile.png",
          fullPage: true,
        });
        const audited = await pool!.query(
          "select count(*)::int as total from audit.events where entity_type='Notification' and operation in ('NotificationRead','NotificationAcknowledged','NotificationAttentionStarted') and actor_user_id=$1",
          [owner],
        );
        expect(audited.rows[0].total).toBeGreaterThanOrEqual(3);
        await client.close();
      } finally {
        await browser.close();
        web.kill();
      }
    },
    90_000,
  );
});
