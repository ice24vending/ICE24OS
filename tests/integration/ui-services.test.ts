import { mkdir, readFile } from "node:fs/promises";
import {
  createCipheriv,
  createHash,
  createSign,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { createServer, type Server } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ConsumerFailure,
  processDomainEvents,
  type DomainEventConsumer,
} from "../../apps/worker/src/processors/domain-events.js";
import { domainEventConsumers } from "../../apps/worker/src/consumers/index.js";
import { processFileScans } from "../../apps/worker/src/processors/files/file-scans.js";
import { SimulatedScanner } from "../../apps/worker/src/processors/files/scanner.js";
import { SupabaseScanStorage } from "../../apps/worker/src/processors/files/storage.js";
import { storageDouble } from "./support/storage-double.js";

const BROWSER = process.env.ICE24_BROWSER_TESTS === "1";
const SERVICE_KEY = "service-role-fixture";
// Same loopback origin the CI build allows in the private web CSP (see files.test.ts).
const STORAGE_PORT = Number(process.env.ICE24_STORAGE_TEST_PORT ?? 54329);
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), randomBytes(2040)]);
const EVIDENCE = "docs/qa/phase-5/evidence";
const MIGRATIONS = [
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
  "20261005000100_phase5_scheduler.sql",
  "20261006000100_phase5_integration_logs.sql",
  "20261006000200_phase5_job_expected_version.sql",
  "20261006000300_phase5_notification_expected_version.sql",
];

interface Actor {
  readonly id: string;
  readonly name: string;
  readonly role: "OW" | "OP" | "IA";
  readonly account: string;
  readonly context: string;
  readonly aal: "aal1" | "aal2";
}

// F5-15: the whole stack with real identity — OIDC tokens verified against a local JWKS, roles,
// permissions and effective access read from PostgreSQL by the production IdentityStore, the
// complete AppModule (guards, read-only guard, filters, correlation), the real worker
// consumers and file scanner, the private web (BFF) and Chromium.
describe("F5-15 account services UI end to end", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let api: { close(): Promise<void>; getUrl(): Promise<string> } | undefined;
  let oidc: Server | undefined;
  let web: ChildProcess | undefined;
  let browser: Browser | undefined;
  let apiUrl = "";
  let origin = "";
  let issuer = "";
  const storage = storageDouble(SERVICE_KEY);
  const storageOrigin = `http://127.0.0.1:${STORAGE_PORT}`;
  const oldEnv = { ...process.env };
  const secret = randomBytes(32).toString("hex");
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const customer = randomUUID(),
    ice24 = randomUUID(),
    branch = randomUUID(),
    subscription = randomUUID();
  const actor = (name: string, role: Actor["role"], account: string, aal: Actor["aal"] = "aal1") =>
    ({ id: randomUUID(), name, role, account, context: randomUUID(), aal }) as Actor;
  const owner = actor("duena", "OW", customer);
  const operator = actor("operador", "OP", customer);
  const support = actor("soporte", "IA", ice24, "aal2");
  const ACTORS = [owner, operator, support];

  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const segment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  /** RS256 access token verified by the production OidcTokenVerifier. */
  function token(user: Actor) {
    const now = Math.floor(Date.now() / 1000);
    const head = segment({ alg: "RS256", kid: "f5-15", typ: "JWT" });
    const body = segment({
      sub: `subject-${user.id}`,
      iss: issuer,
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      email: `${user.name}-${user.id.slice(0, 8)}@example.test`,
      user_name: `${user.name}-${user.id.slice(0, 8)}`,
      aal: user.aal,
    });
    const signature = createSign("RSA-SHA256").update(`${head}.${body}`).sign(privateKey);
    return `${head}.${body}.${signature.toString("base64url")}`;
  }
  const call = (user: Actor, path: string, init: RequestInit = {}) =>
    fetch(`${apiUrl}/api/v1/${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token(user)}`,
        "x-ice24-context-id": user.context,
        ...((init.headers as Record<string, string>) ?? {}),
      },
    });
  /** Sealed BFF session (same format as apps/private-web/src/server/session/session.ts). */
  function sessionCookie(user: Actor, csrfToken: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
    const sealed = Buffer.concat([
      cipher.update(
        JSON.stringify({
          accessToken: token(user),
          refreshToken: "synthetic",
          expiresAt: Date.now() + 3600000,
          csrfToken,
          contextId: user.context,
        }),
      ),
      cipher.final(),
    ]);
    return {
      name: "__Host-ice24_session",
      value: [iv, cipher.getAuthTag(), sealed].map((part) => part.toString("base64url")).join("."),
      domain: "localhost",
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "Lax" as const,
    };
  }
  async function pageAs(user: Actor, width = 1280) {
    const csrfToken = randomBytes(16).toString("hex");
    const context = await browser!.newContext({
      viewport: { width, height: 900 },
      acceptDownloads: true,
    });
    await context.addCookies([sessionCookie(user, csrfToken)]);
    return { page: await context.newPage(), context, csrfToken };
  }
  /** Automated checks without axe (not configured in the repository): names, focus, reflow. */
  async function accessibility(page: Page) {
    // Let Next finish swapping the streamed loading.tsx fallback before inspecting the DOM.
    await page.waitForLoadState("networkidle");
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href], input, select, textarea")]
        .filter((element) => {
          const html = element as HTMLElement;
          if (html.closest("[hidden]") || (element as HTMLInputElement).type === "hidden")
            return false;
          const labelled =
            html.getAttribute("aria-label") ||
            html.getAttribute("aria-labelledby") ||
            (html.id && document.querySelector(`label[for="${html.id}"]`)) ||
            html.closest("label") ||
            html.textContent?.trim();
          return !labelled;
        })
        .map((element) => element.outerHTML.slice(0, 120)),
    );
    expect(unnamed).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe("es-MX");
    expect(await page.locator("main#main-content").count()).toBe(1);
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.className)).toContain("skip-link");
  }
  async function reflows(page: Page) {
    await page.setViewportSize({ width: 375, height: 812 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  const audited = async (operation: string, actorId: string) =>
    Number(
      (
        await pool!.query<{ total: number }>(
          "select count(*)::int as total from audit.events where operation=$1 and actor_user_id=$2",
          [operation, actorId],
        )
      ).rows[0]!.total,
    );
  /** Real producer: a subscription event in its own transaction feeds the outbox. */
  async function subscriptionEvent(status: "payment_failed" | "active", eventType: string) {
    await pool!.query(
      "update subscriptions.records set status=$2, row_version=row_version+1 where id=$1",
      [subscription, status],
    );
    await pool!.query(
      `insert into subscriptions.events(subscription_id,account_id,actor_id,context_id,correlation_id,
         event_type,reason,previous_state,new_state,actor_type)
       values($1,$2,$3,$4,$5,$6,'Stripe reported the renewal result',$7,$8,'USER')`,
      [
        subscription,
        customer,
        owner.id,
        owner.context,
        randomUUID(),
        eventType,
        JSON.stringify({ status: status === "active" ? "payment_failed" : "active" }),
        JSON.stringify({ status }),
      ],
    );
    await pool!.query("select * from infra.publish_outbox(500)");
    for (let i = 0; i < 5; i++) {
      const result = await processDomainEvents(pool!, domainEventConsumers, { batchSize: 100 });
      if (result.received === 0) break;
    }
  }
  const failing: DomainEventConsumer = {
    name: "f5-15-failing-recorder",
    eventTypes: ["LoginFailed"],
    handle: async () => {
      throw new ConsumerFailure("PROVIDER_TIMEOUT");
    },
  };
  /** A domain event whose consumer keeps failing until the job lands in the DLQ. */
  async function deadLetteredJob() {
    const event = await pool!.query<{ id: string }>(
      "insert into audit.security_events(event_type,result,correlation_id,account_id) values('LOGIN_FAILED','DENIED',$1,$2) returning id",
      [randomUUID(), customer],
    );
    await pool!.query("select * from infra.publish_outbox(500)");
    for (let attempt = 1; attempt <= 5; attempt++) {
      await processDomainEvents(pool!, [failing], { batchSize: 100 });
      await pool!.query("update pgmq.q_domain_events set vt=clock_timestamp()");
    }
    return (
      await pool!.query<{ id: string; status: string; correlation_id: string }>(
        "select id, status, correlation_id from infra.async_jobs where source_id=$1",
        [event.rows[0]!.id],
      )
    ).rows[0]!;
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) => storage.server.listen(STORAGE_PORT, "127.0.0.1", resolve));
    const jwk = { ...publicKey.export({ format: "jwk" }), kid: "f5-15", alg: "RS256", use: "sig" };
    oidc = createServer((request, response) => {
      const json = (value: unknown) =>
        response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(value));
      if (request.url === "/auth/v1/.well-known/openid-configuration")
        return json({ issuer, jwks_uri: `${issuer}/jwks` });
      if (request.url === "/auth/v1/jwks") return json({ keys: [jwk] });
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => oidc!.listen(0, "127.0.0.1", resolve));
    const address = oidc.address();
    if (!address || typeof address === "string") throw new Error("OIDC server without port");
    issuer = `http://127.0.0.1:${address.port}/auth/v1`;

    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri(), max: 8 });
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
    for (const file of MIGRATIONS) await pool.query(await migration(file));

    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Hielo del Norte','COMPANY'),($2,'ICE24 Operación','COMPANY')",
      [customer, ice24],
    );
    await pool.query("insert into equipment.branches(id,account_id,data) values($1,$2,$3)", [
      branch,
      customer,
      JSON.stringify({ name: "Centro" }),
    ]);
    for (const user of ACTORS) {
      await pool.query(
        "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1,$2,$3,$4,$5,'ACTIVE')",
        [
          user.id,
          `subject-${user.id}`,
          `${user.name}-${user.id.slice(0, 8)}`,
          `${user.name}-${user.id.slice(0, 8)}@example.test`,
          user.name,
        ],
      );
      const membership = randomUUID();
      await pool.query(
        "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
        [membership, user.account, user.id],
      );
      await pool.query(
        "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code=$2",
        [membership, user.role],
      );
      await pool.query(
        "insert into authz.user_scopes(membership_id,scope_type,branch_id) values($1,$2,$3)",
        [membership, user.role === "OP" ? "BRANCH" : "ACCOUNT", user.role === "OP" ? branch : null],
      );
      await pool.query(
        "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
        [user.context, user.id, user.account, membership],
      );
    }
    await pool.query(
      `insert into subscriptions.records(id,account_id,provider_customer_id,provider_subscription_id,status,
         current_period_start,current_period_end,is_demo,created_by,updated_by)
       values($1,$2,'cus_f515','sub_f515','active',now()-interval '5 days',now()+interval '25 days',false,$3,$3)`,
      [subscription, customer, owner.id],
    );

    Object.assign(process.env, {
      DATABASE_URL: container.getConnectionUri(),
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: "authenticated",
      SUPABASE_URL: storageOrigin,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      NODE_ENV: "test",
    });
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    apiRequire("reflect-metadata");
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: {
        create(
          module: unknown,
          options: unknown,
        ): Promise<{
          setGlobalPrefix(prefix: string): void;
          listen(port: number, host: string): Promise<void>;
          getUrl(): Promise<string>;
          close(): Promise<void>;
        }>;
      };
    };
    const { AppModule } = await import("../../apps/api/src/platform/app.module.js");
    const app = await NestFactory.create(AppModule, { logger: false, rawBody: true });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    api = app;
    apiUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");

    if (!BROWSER) return;
    const listener = createTcpServer();
    await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const webAddress = listener.address();
    if (!webAddress || typeof webAddress === "string") throw new Error("Missing port");
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    origin = `http://localhost:${webAddress.port}`;
    web = spawn(
      process.execPath,
      [
        fileURLToPath(
          new URL("../../apps/private-web/node_modules/next/dist/bin/next", import.meta.url),
        ),
        "start",
        "--port",
        String(webAddress.port),
        "--hostname",
        "127.0.0.1",
      ],
      {
        cwd: fileURLToPath(new URL("../../apps/private-web", import.meta.url)),
        env: {
          ...process.env,
          NODE_ENV: "production",
          PRIVATE_API_URL: `${apiUrl}/api/v1`,
          PRIVATE_WEB_URL: origin,
          BFF_SESSION_SECRET: secret,
        },
        stdio: "ignore",
        windowsHide: true,
      },
    );
    for (let i = 0; i < 150; i++) {
      try {
        await fetch(origin);
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    browser = await chromium.launch({ headless: true });
    await mkdir(EVIDENCE, { recursive: true });
  }, 180_000);

  afterAll(async () => {
    await browser?.close();
    web?.kill();
    await api?.close();
    await pool?.end();
    await container?.stop();
    await new Promise<void>((resolve) => storage.server.close(() => resolve()));
    await new Promise<void>((resolve) => (oidc ? oidc.close(() => resolve()) : resolve()));
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  });

  it("derives roles, effective access and permissions from the real identity store", async () => {
    const context = await call(owner, "session-contexts/current");
    expect(context.status).toBe(200);
    expect(await context.json()).toMatchObject({
      accountName: "Hielo del Norte",
      accessMode: "ACTIVE",
      roleCodes: ["OW"],
    });
    // Role authorization of the services this UI exposes.
    const matrix: [Actor, string, number][] = [
      [owner, "audit-events?limit=1", 200],
      [owner, "admin/jobs?limit=1", 403],
      [owner, "subscription", 200],
      [operator, "audit-events?limit=1", 403],
      [operator, "subscription", 403],
      [operator, "notifications/summary", 200],
      [support, "admin/jobs?limit=1", 200],
      [support, "admin/integration-logs?limit=1", 200],
    ];
    for (const [user, path, status] of matrix)
      expect([user.name, path, (await call(user, path)).status]).toEqual([user.name, path, status]);
    // An invalid signature is rejected before any authorization decision.
    const forged = await fetch(`${apiUrl}/api/v1/session-contexts/current`, {
      headers: {
        authorization: `Bearer ${token(owner).slice(0, -4)}AAAA`,
        "x-ice24-context-id": owner.context,
      },
    });
    expect(forged.status).toBe(401);
  });

  it.runIf(BROWSER)(
    "shows each role only its services and explains denied screens",
    async () => {
      const ownerView = await pageAs(owner);
      await ownerView.page.goto(`${origin}/subscription`);
      const nav = ownerView.page.getByRole("navigation", { name: "Servicios de cuenta" });
      await nav.getByRole("link", { name: "Auditoría" }).waitFor();
      expect(await nav.getByRole("link", { name: "Centro de trabajos" }).count()).toBe(0);
      expect(
        await nav.getByRole("link", { name: "Suscripción" }).getAttribute("aria-current"),
      ).toBe("page");
      await ownerView.page.getByText("Hielo del Norte", { exact: true }).waitFor();
      await ownerView.page.getByRole("button", { name: "Gestionar suscripción" }).waitFor();
      await accessibility(ownerView.page);
      await ownerView.context.close();

      const operatorView = await pageAs(operator);
      await operatorView.page.goto(`${origin}/audit`);
      await operatorView.page.getByRole("heading", { name: "Sin permiso", exact: true }).waitFor();
      expect(await operatorView.page.getByLabel("Tipo de evento").count()).toBe(0);
      const operatorNav = operatorView.page.getByRole("navigation", {
        name: "Servicios de cuenta",
      });
      expect(await operatorNav.getByRole("link", { name: "Auditoría" }).count()).toBe(0);
      expect(await operatorNav.getByRole("link", { name: "Centro de trabajos" }).count()).toBe(0);
      await operatorView.page.goto(`${origin}/jobs`);
      await operatorView.page
        .getByText("No tienes permiso o falta verificar MFA para el centro de trabajos.")
        .waitFor();
      await operatorView.page.goto(`${origin}/subscription`);
      await operatorView.page
        .getByText("No tienes permiso para consultar la suscripción de esta cuenta.")
        .waitFor();
      expect(
        await operatorView.page.getByRole("button", { name: /Stripe|suscripción/u }).count(),
      ).toBe(0);
      await operatorView.context.close();
    },
    90_000,
  );

  it.runIf(BROWSER)(
    "payment rejected → read-only everywhere, critical alert → «Enterado», version conflict",
    async () => {
      await subscriptionEvent("payment_failed", "payment_failed");
      expect(
        Number(
          (
            await pool!.query<{ total: number }>(
              "select count(*)::int as total from audit.events where entity_type='Subscription' and account_id=$1",
              [customer],
            )
          ).rows[0]!.total,
        ),
      ).toBeGreaterThanOrEqual(1);
      const { page, context, csrfToken } = await pageAs(owner);
      // Global banner with cause and next step, write controls blocked before the flow starts.
      await page.goto(`${origin}/files?resourceType=branch&resourceId=${branch}`);
      const banner = page.locator(".read-only-banner");
      await banner.getByRole("heading", { name: "Cuenta en modo lectura" }).waitFor();
      expect(await banner.textContent()).toContain("Stripe rechazó el último pago");
      expect(await banner.getByRole("link", { name: "Ver suscripción" }).count()).toBe(1);
      expect(await page.getByRole("button", { name: "Subir archivo" }).isDisabled()).toBe(true);
      await page.getByText(/Las descargas de archivos aprobados siguen disponibles/u).waitFor();
      await page.screenshot({
        path: `${EVIDENCE}/20261006-f5-15-read-only-desktop.png`,
        fullPage: true,
      });
      // The backend blocks the write regardless of the UI (F5-03).
      const blocked = await page.request.post(`${origin}/api/files/upload-sessions`, {
        headers: { origin, "x-ice24-workspace-context": owner.context },
        multipart: {
          csrfToken,
          key: randomUUID(),
          fileName: "foto.png",
          mediaType: "image/png",
          sizeBytes: String(PNG.length),
          purpose: "equipment_evidence",
          resourceType: "branch",
          resourceId: branch,
        },
      });
      expect(blocked.status()).toBe(403);
      expect(await blocked.json()).toMatchObject({ code: "ACCOUNT_READ_ONLY" });
      for (const path of ["/audit", "/notifications", "/workspace"]) {
        await page.goto(`${origin}${path}`);
        await page.locator(".read-only-banner").waitFor();
      }
      await page.goto(`${origin}/subscription`);
      await page.locator(".chip", { hasText: "Pago rechazado" }).waitFor();
      await page
        .getByText(/Stripe rechazó el cobro/u)
        .first()
        .waitFor();
      await page
        .getByText("Actualiza el método de pago en Stripe para que se reintente el cobro.")
        .waitFor();
      await page.getByText(/nunca recibe ni guarda datos de tarjeta/u).waitFor();

      // Critical alert pinned until «Enterado» (F5-11), opening only marks it read.
      await page.goto(`${origin}/workspace`);
      await page.getByRole("link", { name: /1 crítica sin enterado/u }).click();
      const pinned = page.getByRole("region", { name: "Críticas sin enterado" });
      await pinned.getByRole("heading", { name: "Pago de suscripción rechazado" }).waitFor();
      await pinned.getByRole("button", { name: "Ver detalle" }).click();
      await pinned.getByText("Leída", { exact: true }).first().waitFor();
      await pinned.getByRole("button", { name: "Marcar enterado" }).click();
      await page
        .getByText(/«Pago de suscripción rechazado»: Enterado\. El cambio quedó auditado\./u)
        .waitFor();
      await page
        .getByRole("region", { name: "Críticas sin enterado" })
        .waitFor({ state: "detached" });
      expect(await audited("NotificationRead", owner.id)).toBe(1);
      expect(await audited("NotificationAcknowledged", owner.id)).toBe(1);

      // Another tab changes the alert: the stale click is rejected (412) and the view refreshes.
      const card = page
        .locator(".alert-card", { hasText: "Pago de suscripción rechazado" })
        .first();
      await card.getByRole("button", { name: "Atender" }).waitFor();
      const current = (
        await pool!.query<{ id: string; row_version: number }>(
          "select id,row_version from notifications.notification_recipients where user_id=$1",
          [owner.id],
        )
      ).rows[0]!;
      const otherTab = await call(owner, `notifications/${current.id}/start-attention`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
          "if-match": `W/"${current.row_version}"`,
        },
        body: JSON.stringify({ relatedResource: { type: "subscription", id: subscription } }),
      });
      expect(otherTab.status).toBe(200);
      await card.getByRole("button", { name: "Atender" }).click();
      await page.getByRole("heading", { name: "La información cambió" }).waitFor();
      await page.getByText(/El aviso cambió desde que lo consultaste/u).waitFor();
      await page.locator(".alert-card .alert-status", { hasText: "En atención" }).first().waitFor();
      expect(await audited("NotificationAttentionStarted", owner.id)).toBe(1); // only the other tab
      await page.screenshot({
        path: `${EVIDENCE}/20261006-f5-15-alerts-desktop.png`,
        fullPage: true,
      });
      await reflows(page);
      await page.screenshot({
        path: `${EVIDENCE}/20261006-f5-15-alerts-mobile.png`,
        fullPage: true,
      });

      // Stripe confirms the payment: access returns and the banner disappears.
      await subscriptionEvent("active", "payment_recovered");
      await page.goto(`${origin}/files?resourceType=branch&resourceId=${branch}`);
      await page.getByRole("heading", { name: "Archivos privados" }).waitFor();
      expect(await page.locator(".read-only-banner").count()).toBe(0);
      expect(await page.getByRole("button", { name: "Subir archivo" }).isEnabled()).toBe(true);
      await context.close();
    },
    120_000,
  );

  it.runIf(BROWSER)(
    "upload → quarantine → approved → temporary download, with versions and audit",
    async () => {
      const { page, context } = await pageAs(owner);
      await page.goto(`${origin}/files?resourceType=branch&resourceId=${branch}`);
      await page.getByLabel("Propósito", { exact: true }).selectOption("equipment_evidence");
      await page.getByLabel("Archivo a subir", { exact: true }).setInputFiles({
        name: "tolva.png",
        mimeType: "image/png",
        buffer: PNG,
      });
      await page.getByRole("button", { name: "Subir archivo" }).click();
      await page
        .getByText(/Archivo «tolva\.png» recibido\. Quedó en cuarentena/u)
        .waitFor({ timeout: 15_000 });
      const item = page.locator(".file-card", { hasText: "tolva.png" });
      await item.locator(".chip", { hasText: "En cuarentena" }).waitFor();
      expect(await page.getByRole("button", { name: "Descargar tolva.png" }).isDisabled()).toBe(
        true,
      );
      expect(await item.textContent()).toContain("Disponible cuando la verificación lo apruebe.");

      // Real F5-09 worker with the simulated scanner promotes the clean file.
      const scanned = await processFileScans(pool!, {
        scanner: new SimulatedScanner(),
        storage: new SupabaseScanStorage(storageOrigin, SERVICE_KEY),
      });
      expect(scanned.clean).toBe(1);
      await page.getByRole("button", { name: "Consultar estado de tolva.png" }).click();
      await page.getByText("Estado de «tolva.png»: Disponible.").waitFor();
      await item.locator(".chip", { hasText: "Aprobado" }).waitFor();
      await item.getByText("Huella SHA-256").waitFor();
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Descargar tolva.png" }).click();
      const file = await download;
      expect(file.url()).toContain("/storage/v1/object/sign/originals/");
      await page.getByText(/Descarga temporal autorizada para «tolva\.png»/u).waitFor();
      // The temporary URL is handed to the browser only; it never stays in the page.
      expect(await page.content()).not.toContain("/object/sign/");
      expect(await audited("FileReadAuthorized", owner.id)).toBe(1);

      // Deep link (e.g. from an alert): the same file with its versions.
      const fileId = (
        await pool!.query<{ id: string }>(
          "select f.id from files.file_objects f join files.upload_sessions s on s.file_object_id=f.id where s.original_filename='tolva.png'",
        )
      ).rows[0]!.id;
      await page.goto(`${origin}/files?fileId=${fileId}`);
      await page.getByRole("heading", { name: "Versiones de «tolva.png»" }).waitFor();
      expect(await page.locator(".file-versions").textContent()).toContain("Versión optimizada");
      await page.screenshot({
        path: `${EVIDENCE}/20261006-f5-15-files-desktop.png`,
        fullPage: true,
      });
      await accessibility(page);
      await reflows(page);
      await page.goto(`${origin}/files?fileId=${randomUUID()}`);
      await page
        .getByText("No encontramos el archivo o no pertenece a la cuenta activa.")
        .waitFor();
      await context.close();
    },
    120_000,
  );

  it.runIf(BROWSER)(
    "failed job → diagnosis by correlation → audited retry, and a stale retry is refused",
    async () => {
      const first = await deadLetteredJob();
      const second = await deadLetteredJob();
      expect([first.status, second.status]).toEqual(["DEAD_LETTER", "DEAD_LETTER"]);
      const { page, context } = await pageAs(support);
      await page.goto(`${origin}/jobs`);
      await page.getByRole("heading", { name: "Centro de trabajos", exact: true }).waitFor();
      await page.getByLabel("Estado", { exact: true }).selectOption("DEAD_LETTER");
      await page.getByRole("button", { name: "Aplicar filtros" }).click();
      await page.getByText("2 trabajos · Página 1", { exact: true }).waitFor();
      await page
        .getByRole("button", { name: /Ver detalle de LoginFailed En DLQ/u })
        .first()
        .click();
      await page.getByRole("heading", { name: "Trabajo seleccionado", exact: true }).waitFor();
      const opened = (await page.locator(".job-detail dl").textContent()) ?? "";
      const job = opened.includes(first.id) ? first : second;
      const other = job === first ? second : first;

      // Diagnosis (F5-14): audit and integration logs of the same correlation.
      const diagnosis = page.getByRole("region", { name: "Diagnóstico" });
      expect(
        await diagnosis
          .getByRole("link", { name: "Ver auditoría de esta correlación" })
          .getAttribute("href"),
      ).toBe(`/audit?correlationId=${job.correlation_id}`);
      await diagnosis.getByRole("button", { name: "Ver llamadas a integraciones" }).click();
      await diagnosis.locator('[data-state="empty"], table').first().waitFor();

      // Audited retry with reason and expected version.
      await page.getByLabel("Motivo del reintento").fill("Proveedor recuperado tras INC-115");
      await page.getByRole("button", { name: "Reintentar trabajo" }).click();
      await page.getByText(/Trabajo reenviado a domain_events\. Estado: En cola\./u).waitFor();
      // The form is gone (no longer retryable): focus stays on the confirmation, not on <body>.
      await page.waitForFunction(() =>
        document.activeElement?.classList.contains("job-retry-message"),
      );
      const retried = await pool!.query<{ reason: string; correlation_id: string }>(
        "select reason, correlation_id from audit.events where operation='JobRetryRequested' and entity_id=$1 and actor_user_id=$2",
        [job.id, support.id],
      );
      expect(retried.rows).toHaveLength(1);
      expect(retried.rows[0]!.reason).toBe("Proveedor recuperado tras INC-115");
      await page.screenshot({
        path: `${EVIDENCE}/20261006-f5-15-jobs-desktop.png`,
        fullPage: true,
      });

      // The other job is retried from another session while this one has it open: refused.
      await page.getByRole("button", { name: "Cerrar detalle" }).click();
      await page
        .getByRole("button", { name: /Ver detalle de LoginFailed En DLQ/u })
        .first()
        .click();
      await page.getByText(other.id).waitFor();
      const version = (
        await pool!.query<{ row_version: number }>(
          "select row_version from infra.async_jobs where id=$1",
          [other.id],
        )
      ).rows[0]!.row_version;
      const elsewhere = await call(support, `admin/jobs/${other.id}/retry`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": randomUUID(),
          "if-match": `W/"${version}"`,
        },
        body: JSON.stringify({ reason: "Reintento desde otra sesión de soporte" }),
      });
      expect(elsewhere.status).toBe(202);
      await page.getByLabel("Motivo del reintento").fill("Segundo intento sobre datos viejos");
      await page.getByRole("button", { name: "Reintentar trabajo" }).click();
      await page
        .getByRole("heading", { name: "El trabajo cambió: revisa su estado actual" })
        .waitFor();
      await page.locator(".job-detail .job-status", { hasText: "En cola" }).first().waitFor();
      expect(await page.getByRole("button", { name: "Reintentar trabajo" }).count()).toBe(0);
      expect(
        Number(
          (
            await pool!.query<{ total: number }>(
              "select count(*)::int as total from audit.events where operation='JobRetryRequested' and entity_id=$1",
              [other.id],
            )
          ).rows[0]!.total,
        ),
      ).toBe(1);

      // The diagnosis link opens the audit viewer already filtered by that correlation.
      await page.goto(`${origin}/audit?correlationId=${job.correlation_id}`);
      expect(await page.getByLabel("Correlación", { exact: true }).inputValue()).toBe(
        job.correlation_id,
      );
      await accessibility(page);
      await page.goto(`${origin}/jobs`);
      await reflows(page);
      await page.screenshot({ path: `${EVIDENCE}/20261006-f5-15-jobs-mobile.png`, fullPage: true });
      await context.close();
    },
    120_000,
  );

  it.runIf(BROWSER)(
    "keeps the offline state explicit and blocks online-only actions",
    async () => {
      const { page, context } = await pageAs(owner);
      await page.goto(`${origin}/files?resourceType=branch&resourceId=${branch}`);
      await page.getByRole("button", { name: "Subir archivo" }).waitFor();
      await context.setOffline(true);
      await page
        .getByText(/Sin conexión\./u)
        .first()
        .waitFor();
      expect(await page.getByRole("button", { name: "Subir archivo" }).isDisabled()).toBe(true);
      await page.getByText("Necesitas conexión para subir archivos.").waitFor();
      await context.setOffline(false);
      await page.locator(".offline-banner").waitFor({ state: "detached" });
      expect(await page.getByRole("button", { name: "Subir archivo" }).isEnabled()).toBe(true);
      await context.close();
    },
    60_000,
  );
});
