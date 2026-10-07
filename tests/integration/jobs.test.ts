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
  jobDetailSchema,
  jobPageSchema,
  queueOverviewSchema,
} from "@ice24/contracts";
import { JobsController } from "../../apps/api/src/modules/jobs/interface/jobs.controller.js";
import { JobsService } from "../../apps/api/src/modules/jobs/application/jobs.service.js";
import { JobsDatabase } from "../../apps/api/src/modules/jobs/infrastructure/jobs.database.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import {
  ConsumerFailure,
  processDomainEvents,
  type DomainEventConsumer,
} from "../../apps/worker/src/processors/domain-events.js";

// Plain PostgreSQL + PGMQ emulation (support/pgmq-emulation.sql); real PGMQ is covered by
// supabase/tests/database/phase5_jobs_test.sql in the supabase-migrations CI job.
describe("F5-07 job registry, job center and audited DLQ retry", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let db: JobsDatabase | undefined;
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
    supportUser = randomUUID();
  let permissions: AuthorizationSubject["permissions"] = [];
  let aal: "aal1" | "aal2" = "aal2";
  let subjectAccount = account;
  const allow = (...codes: string[]) =>
    codes.map((code) => ({
      code,
      effect: "ALLOW" as const,
      classification: "RESTRICTED" as const,
    }));
  const headers = (extra: Record<string, string> = {}) => ({
    authorization: "Bearer fixture",
    "x-ice24-context-id": randomUUID(),
    ...extra,
  });
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");

  /** Real producer → outbox → publisher → domain_events. */
  async function emit() {
    const inserted = await pool!.query<{ id: string }>(
      "insert into audit.security_events(event_type,result,correlation_id,account_id) values('LOGIN_FAILED','DENIED',$1,$2) returning id",
      [randomUUID(), account],
    );
    await pool!.query("select * from infra.publish_outbox(500)");
    return inserted.rows[0]!.id;
  }
  const jobFor = async (eventId: string) =>
    (
      await pool!.query<{ id: string; status: string }>(
        "select id, status from infra.async_jobs where source_id=$1",
        [eventId],
      )
    ).rows[0]!;
  const expireBackoff = () => pool!.query("update pgmq.q_domain_events set vt=clock_timestamp()");
  const failing: DomainEventConsumer = {
    name: "failing-recorder",
    eventTypes: ["LoginFailed"],
    handle: async () => {
      throw new ConsumerFailure("PROVIDER_TIMEOUT");
    },
  };
  const working: DomainEventConsumer = {
    name: "failing-recorder", // same consumer, now fixed: idempotency key is unchanged
    eventTypes: ["LoginFailed"],
    handle: async (event, tx) => {
      await tx.query("insert into job_effects(event_id) values($1)", [event.eventId]);
    },
  };
  async function deadLetter(eventId: string) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await processDomainEvents(pool!, [failing], { batchSize: 100 });
      await expireBackoff();
    }
    return jobFor(eventId);
  }
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/api/v1/${path}`, {
      ...init,
      headers: { ...headers(), ...((init.headers as Record<string, string>) ?? {}) },
    });
  const jobVersion = async (jobId: string) =>
    (
      await pool!.query<{ row_version: number }>(
        "select row_version from infra.async_jobs where id=$1",
        [jobId],
      )
    ).rows[0]!.row_version;
  /** INT-004 call; `expected` defaults to the current rowVersion, `null` omits If-Match. */
  const retry = async (
    jobId: string,
    key: string | undefined,
    reason: string,
    expected?: number | null,
  ) => {
    const version = expected === undefined ? await jobVersion(jobId) : expected;
    return call(`admin/jobs/${jobId}/retry`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key === undefined ? {} : { "idempotency-key": key }),
        ...(version === null ? {} : { "if-match": `W/"${version}"` }),
      },
      body: JSON.stringify({ reason }),
    });
  };

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
      "20261006000200_phase5_job_expected_version.sql",
    ])
      await pool.query(await migration(file));
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [account, otherAccount],
    );
    await pool.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,'jobs-support','jobs-support@example.test','Jobs support','ACTIVE')",
      [supportUser],
    );
    await pool.query("create table job_effects(event_id uuid not null)");
    process.env.DATABASE_URL = container.getConnectionUri();
    db = new JobsDatabase();

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    class TestModule {}
    Module({
      controllers: [JobsController],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        { provide: JobsService, useValue: new JobsService(db) },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify(token: string) {
              if (token !== "fixture") throw new Error("Invalid fixture token");
              return { sub: supportUser, aal };
            },
          },
        },
        {
          provide: IdentityStore,
          useValue: {
            synchronizeIdentity: () => ({ id: supportUser, status: "ACTIVE" }),
            // Async like the real store: AccountWriteGuard chains .catch() on write requests.
            getAuthorizationSubject: async (): Promise<AuthorizationSubject> => ({
              userId: supportUser,
              membershipId: randomUUID(),
              membershipAccountId: subjectAccount,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: "ACTIVE",
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

  it("records dispatch, backoff retries and dead-lettering with their state history", async () => {
    const eventId = await emit();
    await processDomainEvents(pool!, [failing], { batchSize: 100 });
    const waiting = await pool!.query<{ status: string; due: boolean; error_code: string }>(
      "select status, next_attempt_at > now() as due, error_code from infra.async_jobs where source_id=$1",
      [eventId],
    );
    expect(waiting.rows[0]).toEqual({
      status: "RETRY_WAIT",
      due: true,
      error_code: "PROVIDER_TIMEOUT",
    });
    await expireBackoff();
    for (let attempt = 2; attempt <= 5; attempt++) {
      await processDomainEvents(pool!, [failing], { batchSize: 100 });
      await expireBackoff();
    }
    const job = await jobFor(eventId);
    expect(job.status).toBe("DEAD_LETTER");
    const history = await pool!.query<{ to_status: string }>(
      "select to_status from infra.async_job_transitions where job_id=$1 order by occurred_at, id",
      [job.id],
    );
    expect(history.rows.map((row) => row.to_status)).toEqual([
      "QUEUED",
      "RUNNING",
      "RETRY_WAIT",
      "RUNNING",
      "RETRY_WAIT",
      "RUNNING",
      "RETRY_WAIT",
      "RUNNING",
      "RETRY_WAIT",
      "RUNNING",
      "DEAD_LETTER",
    ]);
    await expect(
      pool!.query("update infra.async_jobs set status='SUCCEEDED' where id=$1", [job.id]),
    ).rejects.toMatchObject({ code: "IC409" });
  });

  it("serves the job center with permission, MFA and account-wide scope", async () => {
    permissions = allow("jobs.admin-read");
    const overview = await call("admin/job-queues");
    expect(overview.status).toBe(200);
    expect(overview.headers.get("cache-control")).toBe("no-store");
    const parsed = queueOverviewSchema.parse(await overview.json());
    const domain = parsed.queues.find((queue) => queue.queue === "domain_events")!;
    expect(domain.deadLetters).toBeGreaterThanOrEqual(1);
    expect(parsed.jobs.DEAD_LETTER).toBeGreaterThanOrEqual(1);
    const list = jobPageSchema.parse(await (await call("admin/jobs?status=DEAD_LETTER")).json());
    expect(list.items.length).toBeGreaterThanOrEqual(1);
    expect(list.items.every((job) => job.status === "DEAD_LETTER")).toBe(true);
    const detail = jobDetailSchema.parse(
      await (await call(`admin/jobs/${list.items[0]!.id}`)).json(),
    );
    expect(detail.transitions.at(-1)?.toStatus).toBe("DEAD_LETTER");
    expect(JSON.stringify(detail)).not.toContain("payload");
    for (const [path, status] of [
      ["admin/jobs?limit=101", 400],
      ["admin/jobs?cursor=bad", 400],
      [`admin/jobs/${randomUUID()}`, 404],
    ] as const) {
      const response = await call(path);
      expect(response.status).toBe(status);
      expect(apiErrorSchema.safeParse(await response.json()).success).toBe(true);
    }
    aal = "aal1";
    expect((await call("admin/jobs")).status).toBe(403);
    aal = "aal2";
    permissions = allow("jobs.read");
    expect((await call("admin/jobs")).status).toBe(403);
    expect((await fetch(`${url}/api/v1/admin/jobs`)).status).toBe(401);
  });

  it("re-queues a dead letter with audit, idempotency and state validation, then completes", async () => {
    const eventId = await emit();
    const job = await deadLetter(eventId);
    expect(job.status).toBe("DEAD_LETTER");

    permissions = allow("jobs.admin-read");
    expect((await retry(job.id, "retry-key-0001", "Provider recovered after INC-42")).status).toBe(
      403,
    );
    permissions = allow("jobs.retry", "jobs.admin-read");
    expect((await retry(job.id, undefined, "Provider recovered after INC-42")).status).toBe(400);
    expect((await retry(job.id, "retry-key-0001", "short")).status).toBe(400);
    aal = "aal1";
    expect((await retry(job.id, "retry-key-0001", "Provider recovered after INC-42")).status).toBe(
      403,
    );
    aal = "aal2";
    // F5-15: the expected version is mandatory and a stale one is rejected before any change.
    const seen = await jobVersion(job.id);
    expect(
      (await retry(job.id, "retry-key-0001", "Provider recovered after INC-42", null)).status,
    ).toBe(400);
    const stale = await retry(
      job.id,
      "retry-key-0009",
      "Provider recovered after INC-42",
      seen + 1,
    );
    expect(stale.status).toBe(412);
    expect(apiErrorSchema.parse(await stale.json()).error.code).toBe("PRECONDITION_FAILED");
    expect(await jobVersion(job.id)).toBe(seen);

    const accepted = await retry(job.id, "retry-key-0001", "Provider recovered after INC-42", seen);
    expect(accepted.status).toBe(202);
    expect(await accepted.json()).toMatchObject({
      status: "QUEUED",
      manualRetryCount: 1,
      attemptCount: 0,
    });
    // The replay carries the version seen before the first attempt and is still accepted.
    const replay = await retry(job.id, "retry-key-0001", "Provider recovered after INC-42", seen);
    expect(replay.status).toBe(202);
    const queued = await pool!.query(
      "select 1 from pgmq.q_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    expect(queued.rowCount).toBe(1); // the idempotent replay did not send twice
    const conflict = await retry(job.id, "retry-key-0002", "Second retry while already queued");
    expect(conflict.status).toBe(409);
    expect(apiErrorSchema.parse(await conflict.json()).error.code).toBe("CONFLICT");

    const audit = await pool!.query<{
      actor_user_id: string;
      reason: string;
      origin: string;
      account_id: string;
    }>(
      "select actor_user_id, reason, origin, account_id from audit.events where entity_id=$1 and operation='JobRetryRequested'",
      [job.id],
    );
    expect(audit.rows).toEqual([
      {
        actor_user_id: supportUser,
        reason: "Provider recovered after INC-42",
        origin: "ADMIN",
        account_id: account,
      },
    ]);

    await processDomainEvents(pool!, [working], { batchSize: 100 });
    expect((await jobFor(eventId)).status).toBe("SUCCEEDED");
    expect(
      (await pool!.query("select 1 from job_effects where event_id=$1", [eventId])).rowCount,
    ).toBe(1);
    const tail = await pool!.query<{ to_status: string; actor_type: string }>(
      "select to_status, actor_type from infra.async_job_transitions where job_id=$1 order by occurred_at desc, id desc limit 3",
      [job.id],
    );
    expect(tail.rows.reverse()).toEqual([
      { to_status: "QUEUED", actor_type: "USER" },
      { to_status: "RUNNING", actor_type: "SYSTEM" },
      { to_status: "SUCCEEDED", actor_type: "SYSTEM" },
    ]);

    // JOB-001: account users see coarse states only for their own account.
    permissions = allow("jobs.read");
    const visible = await call(`jobs/${job.id}`);
    expect(visible.status).toBe(200);
    expect(await visible.json()).toMatchObject({ id: job.id, status: "completed" });
    subjectAccount = otherAccount;
    expect((await call(`jobs/${job.id}`)).status).toBe(404);
    subjectAccount = account;
  });

  it("registers invalid messages as dead-lettered jobs without calling consumers", async () => {
    await pool!.query(`select pgmq.send('domain_events','{"eventId":"not-a-uuid"}')`);
    await processDomainEvents(pool!, [working], { batchSize: 100 });
    const poison = await pool!.query<{ status: string; error_code: string; source_type: string }>(
      "select status, error_code, source_type from infra.async_jobs where source_type='QueueMessage' order by created_at desc limit 1",
    );
    expect(poison.rows[0]).toEqual({
      status: "DEAD_LETTER",
      error_code: "INVALID_MESSAGE",
      source_type: "QueueMessage",
    });
  });

  it("documents JOB-001, the job center and INT-004 in OpenAPI", async () => {
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { SwaggerModule } = apiRequire("@nestjs/swagger") as {
      SwaggerModule: {
        createDocument(app: unknown, config: unknown): { paths: Record<string, unknown> };
      };
    };
    const document = SwaggerModule.createDocument(app, { info: { title: "Jobs", version: "1" } });
    for (const path of [
      "/api/v1/jobs/{jobId}",
      "/api/v1/admin/jobs",
      "/api/v1/admin/jobs/{jobId}",
      "/api/v1/admin/job-queues",
      "/api/v1/admin/jobs/{jobId}/retry",
    ])
      expect(document.paths[path]).toBeDefined();
  });

  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "lets support inspect queues, filter dead letters, read history and retry with a reason in Chromium",
    async () => {
      const eventId = await emit();
      const dead = await deadLetter(eventId);
      expect(dead.status).toBe("DEAD_LETTER");
      permissions = allow("jobs.admin-read", "jobs.retry");
      aal = "aal2";
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const port = address.port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`,
        secret = randomBytes(32).toString("hex"),
        contextId = randomUUID(),
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
              contextId,
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
        await page.goto(`${origin}/jobs`);
        await page.getByRole("heading", { name: "Centro de trabajos", exact: true }).waitFor();
        await page.getByRole("heading", { name: "domain_events", exact: true }).waitFor();
        await page.getByLabel("Estado", { exact: true }).selectOption("DEAD_LETTER");
        await page.getByRole("button", { name: "Aplicar filtros" }).click();
        await page.getByText(/^\d+ trabajos · Página 1$/u).waitFor();
        const rows = page.locator("tbody tr");
        expect(await rows.count()).toBeGreaterThanOrEqual(1);
        expect(await rows.first().textContent()).toContain("En DLQ");
        await page
          .getByRole("button", { name: /Ver detalle de LoginFailed En DLQ/u })
          .first()
          .click();
        await page.getByRole("heading", { name: "Trabajo seleccionado", exact: true }).waitFor();
        await page.waitForFunction(
          () => document.activeElement?.textContent === "Trabajo seleccionado",
          undefined,
          { timeout: 5_000 },
        );
        expect(await page.locator(".job-timeline li").count()).toBeGreaterThanOrEqual(11);
        await mkdir("docs/qa/phase-5/evidence", { recursive: true });
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261002-f5-07-desktop.png",
          fullPage: true,
        });
        await page.getByLabel("Motivo del reintento").fill("corto");
        await page.getByRole("button", { name: "Reintentar trabajo" }).click();
        await page.getByText("Escribe un motivo de al menos 10 caracteres.").waitFor();
        await page.getByLabel("Motivo del reintento").fill("Proveedor recuperado tras INC-77");
        await page.getByRole("button", { name: "Reintentar trabajo" }).click();
        await page.getByText(/Trabajo reenviado a domain_events\. Estado: En cola\./u).waitFor();
        const audited = await pool!.query(
          "select 1 from audit.events where operation='JobRetryRequested' and reason='Proveedor recuperado tras INC-77'",
        );
        expect(audited.rowCount).toBe(1);
        expect(await page.locator(".job-timeline").textContent()).toContain(
          "Proveedor recuperado tras INC-77",
        );
        await page.setViewportSize({ width: 375, height: 812 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261002-f5-07-mobile.png",
          fullPage: true,
        });
        permissions = allow("jobs.read");
        await page.goto(`${origin}/jobs`);
        await page
          .getByText("No tienes permiso o falta verificar MFA para el centro de trabajos.")
          .waitFor();
        await client.close();
      } finally {
        await browser.close();
        web.kill();
      }
    },
    90_000,
  );
});
