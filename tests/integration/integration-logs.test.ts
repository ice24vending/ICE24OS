import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { integrationLogPageSchema, type IntegrationLog } from "@ice24/contracts";
import {
  createIntegrationTracer,
  createSqlIntegrationLogSink,
  type IntegrationLogEntry,
} from "@ice24/observability";
import { CorrelationMiddleware } from "../../apps/api/src/platform/correlation.middleware.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { IntegrationLogsController } from "../../apps/api/src/modules/integration-logs/interface/integration-logs.controller.js";
import { IntegrationLogsService } from "../../apps/api/src/modules/integration-logs/application/integration-logs.service.js";
import { IntegrationLogsDatabase } from "../../apps/api/src/modules/integration-logs/infrastructure/integration-logs.database.js";
import { StripeSubscriptionGateway } from "../../apps/api/src/modules/subscriptions/infrastructure/stripe.gateway.js";
import { createStripeClient } from "../../apps/api/src/modules/subscriptions/infrastructure/stripe.client.js";
import { SubscriptionDatabase } from "../../apps/api/src/modules/subscriptions/infrastructure/subscription.database.js";
import { WebhookDatabase } from "../../apps/api/src/modules/subscriptions/infrastructure/webhook.database.js";
import { WebhooksService } from "../../apps/api/src/modules/subscriptions/application/webhooks.service.js";
import { WebhooksController } from "../../apps/api/src/modules/subscriptions/interface/webhooks.controller.js";
import { SupabaseObjectStorage } from "../../apps/api/src/modules/files/infrastructure/supabase-storage.js";
import { EmailWebhooksController } from "../../apps/api/src/modules/notifications/interface/email-webhooks.controller.js";
import { EmailWebhooksService } from "../../apps/api/src/modules/notifications/application/email-webhooks.service.js";
import { EmailTrackingDatabase } from "../../apps/api/src/modules/notifications/infrastructure/email-tracking.database.js";
import {
  LOCAL_EMAIL_SIGNATURE_HEADER,
  LocalEmailWebhookVerifier,
  signLocalEmailWebhook,
} from "../../apps/api/src/modules/notifications/infrastructure/local-email-webhook.verifier.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { domainEventConsumers } from "../../apps/worker/src/consumers/index.js";
import { processEmailDeliveries } from "../../apps/worker/src/processors/notifications/email-deliveries.js";
import { LocalEmailProvider } from "../../apps/worker/src/processors/notifications/email/provider.js";
import { tracedEmailProvider } from "../../apps/worker/src/processors/integrations.js";
import { storageDouble } from "./support/storage-double.js";

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
];

// F5-14 path: HTTP request → Stripe Checkout and object storage (correlation in metadata and
// headers) → signed Stripe webhook back (resumes the correlation) → Stripe query → subscription
// event → outbox → domain_events → worker → email_deliveries → email provider → signed email
// webhook back → diagnostic API, with retries, redaction, authorization and isolation.
describe("F5-14 integration logs with end-to-end correlation", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let logs: IntegrationLogsDatabase | undefined;
  let subscriptions: SubscriptionDatabase | undefined;
  let tracking: EmailTrackingDatabase | undefined;
  let app:
    | {
        listen(port: number, host: string): Promise<void>;
        getUrl(): Promise<string>;
        close(): Promise<void>;
        setGlobalPrefix(prefix: string): void;
      }
    | undefined;
  let url = "";
  const SERVICE_KEY = "integration-logs-service-key";
  const storage = storageDouble(SERVICE_KEY);
  const oldEnv = Object.fromEntries(
    ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].map((key) => [
      key,
      process.env[key],
    ]),
  );
  const stripeEnv = {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    PRIVATE_WEB_URL: "http://localhost:3000",
  };
  const webhookSecret = "integration-webhook-secret-0123456789abcdef";
  const stripe = createStripeClient(stripeEnv);
  const account = randomUUID(),
    otherAccount = randomUUID(),
    owner = randomUUID(),
    ownerContext = randomUUID(),
    subscription = randomUUID();
  const customerId = `cus_${account.slice(0, 8)}`,
    subscriptionId = `sub_${account.slice(0, 8)}`;
  // Whole seconds: Stripe periods have second precision.
  const periodStart = Math.floor(Date.now() / 1000) - 20 * 86_400;
  const periodEnd = Math.floor(Date.now() / 1000) + 10 * 86_400;
  const email = new LocalEmailProvider();
  let tracer: ReturnType<typeof createIntegrationTracer>;
  let permissions: AuthorizationSubject["permissions"] = [];
  let aal: "aal1" | "aal2" = "aal2";
  let accountWide = true;
  let subjectAccount = account;
  const allow = (...codes: string[]) =>
    codes.map((code) => ({
      code,
      effect: "ALLOW" as const,
      classification: "RESTRICTED" as const,
    }));
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const diagnose = async (query: string) => {
    const response = await fetch(`${url}/api/v1/admin/integration-logs?${query}`, {
      headers: { authorization: "Bearer fixture", "x-ice24-context-id": randomUUID() },
    });
    return { status: response.status, body: (await response.json()) as unknown };
  };
  const page = async (query: string): Promise<IntegrationLog[]> => {
    const result = await diagnose(query);
    expect(result.status).toBe(200);
    return integrationLogPageSchema.parse(result.body).items;
  };
  const rows = async (where: string, values: unknown[]) =>
    (
      await pool!.query<{
        integration: string;
        operation: string;
        status: string;
        attempt: number;
        error_code: string | null;
        retryable: boolean | null;
        job_id: string | null;
        correlation_id: string;
      }>(
        `select * from infra.integration_logs where ${where} order by attempt, occurred_at`,
        values,
      )
    ).rows;
  const drainEvents = async () => {
    await pool!.query("select * from infra.publish_outbox(500)");
    for (let i = 0; i < 5; i++) {
      const result = await processDomainEvents(pool!, domainEventConsumers, {
        batchSize: 100,
        tracer,
      });
      if (result.received === 0) return;
    }
  };
  const deliverEmails = () =>
    processEmailDeliveries(
      pool!,
      { provider: tracedEmailProvider(email, tracer), baseUrl: "http://127.0.0.1:3000", tracer },
      { batchSize: 50 },
    );
  /** The producer of F5-12 tests: a payment failure recorded with a given correlation. */
  const paymentFailed = async (correlationId: string) => {
    await pool!.query(
      `insert into subscriptions.events(subscription_id,account_id,actor_id,context_id,correlation_id,
         event_type,reason,previous_state,new_state,actor_type)
       values($1,$2,$3,$4,$5,'PAYMENT_FAILED','Stripe reported a failed renewal charge',
         '{"status":"active"}','{"status":"payment_failed"}','USER')`,
      [subscription, account, owner, ownerContext, correlationId],
    );
    await drainEvents();
  };

  beforeAll(async () => {
    await new Promise<void>((resolve) => storage.server.listen(0, "127.0.0.1", resolve));
    const storagePort = (storage.server.address() as AddressInfo).port;
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
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [account, otherAccount],
    );
    await pool.query(
      `insert into identity.users(id,identity_subject,username,email,display_name,status,time_zone)
       values($1::uuid,$1::text,'logs-owner','logs-owner@example.test','Dueña sintética','ACTIVE','UTC')`,
      [owner],
    );
    const membership = randomUUID();
    await pool.query(
      "insert into identity.account_memberships(id,account_id,user_id,status) values($1,$2,$3,'ACTIVE')",
      [membership, account, owner],
    );
    await pool.query(
      "insert into authz.membership_roles(membership_id,role_id) select $1,id from authz.roles where code='OW'",
      [membership],
    );
    await pool.query(
      "insert into authz.user_scopes(membership_id,scope_type) values($1,'ACCOUNT')",
      [membership],
    );
    await pool.query(
      "insert into identity.context_sessions(id,user_id,account_id,membership_id) values($1,$2,$3,$4)",
      [ownerContext, owner, account, membership],
    );
    await pool.query(
      `insert into subscriptions.records(id,account_id,provider_customer_id,provider_subscription_id,status,
         current_period_start,current_period_end,is_demo,created_by,updated_by)
       values($1,$2,$3,$4,'active',to_timestamp($5),to_timestamp($6),false,$7,$7)`,
      [subscription, account, customerId, subscriptionId, periodStart, periodEnd, owner],
    );
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_URL = `http://127.0.0.1:${storagePort}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    logs = new IntegrationLogsDatabase();
    subscriptions = new SubscriptionDatabase();
    tracking = new EmailTrackingDatabase();
    tracer = createIntegrationTracer({
      service: "integration-test",
      environment: "test",
      sink: createSqlIntegrationLogSink(pool),
      log: () => undefined,
    });

    // Stripe SDK with stubbed network calls (no remote Stripe), behind the real adapter.
    vi.spyOn(stripe.prices, "retrieve").mockResolvedValue({
      active: true,
      currency: "mxn",
      unit_amount: 39900,
      livemode: false,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
    } as never);
    vi.spyOn(stripe.customers, "retrieve").mockResolvedValue({
      id: customerId,
      metadata: { ice24AccountId: account },
    } as never);
    vi.spyOn(stripe.subscriptions, "list").mockResolvedValue({
      has_more: false,
      data: [],
    } as never);
    vi.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({
      id: "cs_correlated",
      url: "https://checkout.stripe.com/c/pay/cs_correlated",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    } as never);
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
      id: subscriptionId,
      customer: customerId,
      status: "past_due",
      livemode: false,
      cancel_at_period_end: false,
      metadata: { ice24AccountId: account },
      items: {
        has_more: false,
        data: [
          {
            id: "si_1",
            quantity: 1,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            price: {
              id: "price_fixture",
              unit_amount: 39900,
              currency: "mxn",
              recurring: { interval: "month", interval_count: 1 },
            },
          },
        ],
      },
      latest_invoice: { id: "in_1", status: "open", attempt_count: 1, lines: { data: [] } },
    } as never);
    const gateway = new StripeSubscriptionGateway(stripeEnv, stripe, tracer);
    const objects = new SupabaseObjectStorage(tracer);

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const common = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
      Controller(path: string): ClassDecorator;
      Post(path: string): MethodDecorator;
      Req(): ParameterDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    /** Stands in for BillingService/FilesService: a request that calls two providers. */
    class ProbeController {
      async start(request: { correlationId?: string }) {
        const session = await gateway.createCheckoutSession({
          accountId: account,
          correlationId: request.correlationId!,
          idempotencyKey: "checkout:e2e-correlation",
          providerCustomerId: customerId,
          providerPriceId: "price_fixture",
          expectedAmountMinor: 39900,
          returnUrl: "http://localhost:3000/subscription",
          cancelUrl: "http://localhost:3000/subscription",
        });
        const upload = await objects.createSignedUpload(
          "quarantine",
          `${account}/${randomUUID()}/v1/${randomUUID()}`,
        );
        return { session: session.providerSessionId, signed: upload.includes("token=") };
      }
    }
    common.Controller("probe")(ProbeController);
    common.Post("start")(
      ProbeController.prototype,
      "start",
      Object.getOwnPropertyDescriptor(ProbeController.prototype, "start")!,
    );
    common.Req()(ProbeController.prototype, "start", 0);
    class TestModule {
      configure(consumer: { apply(...middleware: unknown[]): { forRoutes(path: string): void } }) {
        consumer.apply(CorrelationMiddleware).forRoutes("{*path}");
      }
    }
    common.Module({
      controllers: [
        ProbeController,
        WebhooksController,
        EmailWebhooksController,
        IntegrationLogsController,
      ],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        {
          provide: WebhooksService,
          useValue: new WebhooksService(gateway, new WebhookDatabase(subscriptions), tracer),
        },
        {
          provide: EmailWebhooksService,
          useValue: new EmailWebhooksService(
            new LocalEmailWebhookVerifier(webhookSecret),
            tracking,
            tracer,
          ),
        },
        { provide: IntegrationLogsService, useValue: new IntegrationLogsService(logs) },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify(token: string) {
              if (token !== "fixture") throw new Error("Invalid fixture token");
              return { sub: owner, aal };
            },
          },
        },
        {
          provide: IdentityStore,
          useValue: {
            synchronizeIdentity: () => ({ id: owner, status: "ACTIVE" }),
            getAuthorizationSubject: async (): Promise<AuthorizationSubject> => ({
              userId: owner,
              membershipId: randomUUID(),
              membershipAccountId: subjectAccount,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: "ACTIVE",
              assuranceLevel: aal,
              permissions,
              accountWide,
              branchIds: new Set(),
              machineIds: new Set(),
            }),
          },
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false, rawBody: true });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });

  afterAll(async () => {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await app?.close();
    await logs?.onModuleDestroy();
    await tracking?.onModuleDestroy();
    await subscriptions?.pool.end();
    await pool?.end();
    await container?.stop();
    await new Promise<void>((resolve) => storage.server.close(() => resolve()));
  });

  it("follows one correlation from the HTTP request to the providers and back through webhooks", async () => {
    const correlation = randomUUID(),
      stripeDelivery = randomUUID(),
      emailDelivery = randomUUID();
    // 1. HTTP request: Checkout and a signed upload, both under the request correlation.
    const started = await fetch(`${url}/api/v1/probe/start`, {
      method: "POST",
      headers: { "x-correlation-id": correlation },
    });
    expect(started.status).toBe(201);
    expect(started.headers.get("x-correlation-id")).toBe(correlation);
    expect(await started.json()).toEqual({ session: "cs_correlated", signed: true });
    const params = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as {
      metadata: Record<string, string>;
    };
    expect(params.metadata.ice24CorrelationId).toBe(correlation);
    expect(
      storage.log.find((entry) => entry.path.startsWith("object/upload/sign/"))?.correlationId,
    ).toBe(correlation);

    // 2. Stripe calls back: the signed Checkout webhook resumes the request correlation.
    const payload = JSON.stringify({
      id: `evt_${correlation.slice(0, 8)}`,
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: {
        object: {
          object: "checkout.session",
          id: "cs_correlated",
          customer: customerId,
          subscription: subscriptionId,
          metadata: { ice24AccountId: account, ice24CorrelationId: correlation },
        },
      },
    });
    const webhook = await fetch(`${url}/api/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": stripeDelivery,
        "stripe-signature": stripe.webhooks.generateTestHeaderString({
          payload,
          secret: stripeEnv.STRIPE_WEBHOOK_SECRET,
        }),
      },
      body: payload,
    });
    expect(webhook.status).toBe(200);
    const reconciled = await pool!.query<{ status: string }>(
      "select status from subscriptions.records where id=$1",
      [subscription],
    );
    expect(reconciled.rows[0]?.status).toBe("payment_failed");
    const history = await pool!.query<{ correlation_id: string }>(
      "select correlation_id from infra.outbox_events where aggregate_id=$1",
      [subscription],
    );
    expect(history.rows.map((r) => r.correlation_id)).toEqual([correlation]);

    // 3. Outbox → queue → worker → email provider, still under the same correlation.
    await paymentFailed(correlation);
    expect((await deliverEmails()).sent).toBe(1);
    const sent = email.outbox.at(-1)!;
    expect(sent.tags.correlationId).toBe(correlation);

    // 4. The email provider calls back: tracking webhook joins the message correlation.
    const trackingBody = JSON.stringify({
      events: [
        {
          providerEventId: `evt_mail_${correlation.slice(0, 8)}`,
          type: "DELIVERED",
          providerMessageId: sent.providerMessageId,
          occurredAt: new Date().toISOString(),
        },
      ],
    });
    const tracked = await fetch(`${url}/api/v1/webhooks/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-correlation-id": emailDelivery,
        [LOCAL_EMAIL_SIGNATURE_HEADER]: signLocalEmailWebhook(
          trackingBody,
          webhookSecret,
          Math.floor(Date.now() / 1000),
        ),
      },
      body: trackingBody,
    });
    expect(tracked.status).toBe(200);

    // 5. Diagnosis by correlation (ICE24, account-wide, MFA).
    permissions = allow("integration-logs.read");
    const items = await page(`correlationId=${correlation}&limit=100`);
    const chain = items
      .map((item) => `${item.direction} ${item.integration} ${item.operation} ${item.status}`)
      .sort();
    expect(chain).toEqual(
      [
        "INBOUND email webhook.receive SUCCEEDED",
        "INBOUND stripe webhook.receive SUCCEEDED",
        "OUTBOUND email message.send SUCCEEDED",
        "OUTBOUND object_storage upload.sign SUCCEEDED",
        "OUTBOUND queue message.consume SUCCEEDED",
        "OUTBOUND queue message.consume SUCCEEDED",
        "OUTBOUND queue message.consume SUCCEEDED",
        "OUTBOUND stripe checkout.session.create SUCCEEDED",
        "OUTBOUND stripe subscription.retrieve SUCCEEDED",
      ].sort(),
    );
    for (const item of items) expect(item.correlationId).toBe(correlation);
    expect(new Set(items.map((item) => item.accountId))).toEqual(new Set([account]));
    const inboundStripe = items.find(
      (item) => item.integration === "stripe" && item.direction === "INBOUND",
    )!;
    expect(inboundStripe).toMatchObject({
      requestCorrelationId: stripeDelivery,
      responseCode: "200",
      attempt: 1,
    });
    const inboundEmail = items.find(
      (item) => item.integration === "email" && item.direction === "INBOUND",
    )!;
    expect(inboundEmail).toMatchObject({
      requestCorrelationId: emailDelivery,
      details: { outcome: "APPLIED" },
    });
    expect(items.find((item) => item.operation === "message.send")?.jobId).toMatch(
      /^[0-9a-f-]{36}$/u,
    );
    // The delivery correlation of a webhook also finds the chain it resumed.
    expect((await page(`correlationId=${stripeDelivery}`)).map((item) => item.operation)).toEqual([
      "webhook.receive",
    ]);
    // Files stay private: no URL, signed path, token or address was stored.
    const stored = JSON.stringify((await pool!.query("select * from infra.integration_logs")).rows);
    expect(stored).not.toMatch(/https?:\/\/|token=|\/object\/sign|logs-owner@|sk_test/u);
  });

  it("records each provider retry once per attempt and keeps failures recoverable", async () => {
    const correlation = randomUUID();
    email.failWith("PROVIDER_UNAVAILABLE");
    await paymentFailed(correlation);
    const message = (
      await pool!.query<{ id: string; job_id: string }>(
        "select m.id, m.job_id from email.messages m where m.correlation_id=$1",
        [correlation],
      )
    ).rows[0]!;
    const expire = () => pool!.query("update pgmq.q_email_deliveries set vt=clock_timestamp()");
    expect((await deliverEmails()).retried).toBe(1);
    await expire();
    expect((await deliverEmails()).retried).toBe(1);
    email.failWith(null);
    await expire();
    expect((await deliverEmails()).sent).toBe(1);

    const sends = await rows("integration='email' and operation='message.send' and effect_key=$1", [
      message.id,
    ]);
    expect(sends.map((r) => [r.attempt, r.status, r.error_code, r.retryable])).toEqual([
      [1, "FAILED", "PROVIDER_UNAVAILABLE", true],
      [2, "FAILED", "PROVIDER_UNAVAILABLE", true],
      [3, "SUCCEEDED", null, null],
    ]);
    const deliveries = await rows(
      "integration='queue' and correlation_id=$1 and details->>'queue'='email_deliveries'",
      [correlation],
    );
    expect(deliveries.map((r) => [r.attempt, r.status])).toEqual([
      [1, "FAILED"],
      [2, "FAILED"],
      [3, "SUCCEEDED"],
    ]);
    // Failures point at the job, which the Job Center can re-queue (INT-004).
    expect(new Set([...sends, ...deliveries].map((r) => r.job_id))).toEqual(
      new Set([message.job_id]),
    );

    // A repeated record of the same effect and attempt is ignored.
    const sink = createSqlIntegrationLogSink(pool!);
    const repeat: IntegrationLogEntry = {
      integration: "email",
      operation: "message.send",
      direction: "OUTBOUND",
      provider: "local",
      status: "SUCCEEDED",
      latencyMs: 1,
      responseCode: "accepted",
      errorCode: null,
      retryable: null,
      attempt: 3,
      effectKey: message.id,
      correlationId: correlation,
      requestCorrelationId: null,
      accountId: account,
      jobId: message.job_id,
      details: {},
      occurredAt: new Date(),
    };
    await sink.record(repeat);
    await sink.record(repeat);
    expect(
      await rows("integration='email' and operation='message.send' and effect_key=$1", [
        message.id,
      ]),
    ).toHaveLength(3);

    permissions = allow("integration-logs.read");
    const failed = await page(`integration=email&status=FAILED&correlationId=${correlation}`);
    expect(failed.map((item) => item.attempt)).toEqual([2, 1]);
  });

  it("redacts details before storing and the store rejects anything sensitive", async () => {
    const correlation = randomUUID();
    await tracer.record({
      integration: "pdf",
      operation: "document.render",
      provider: "pdf-worker",
      status: "FAILED",
      latencyMs: 5,
      errorCode: "RENDER_FAILED",
      context: { correlationId: correlation, accountId: account },
      details: {
        note: "retry https://proj.supabase.co/storage/v1/object/sign/originals/a?token=abc",
        reason: "card 4242 4242 4242 4242 rejected for logs-owner@example.test",
        signedUrl: "/object/sign/x?token=1",
        authorization: "Bearer abc.def.ghi",
        payload: '{"card":"4242"}',
        nested: { secret: "x" },
      },
    });
    const [stored] = await rows("correlation_id=$1", [correlation]);
    const details = (
      await pool!.query<{ details: unknown }>(
        "select details from infra.integration_logs where correlation_id=$1",
        [correlation],
      )
    ).rows[0]!.details;
    expect(stored).toMatchObject({
      integration: "pdf",
      status: "FAILED",
      error_code: "RENDER_FAILED",
    });
    expect(details).toEqual({ note: "retry [URL]", reason: "card [CARD] rejected for [EMAIL]" });

    const insert = (details: string, effectKey: string | null = null) =>
      pool!.query(
        `select infra.record_integration_log('stripe','webhook.receive','INBOUND','stripe','SUCCEEDED',1,'200',
           null,null,1,$2,gen_random_uuid(),null,null,null,$1::jsonb,now())`,
        [details, effectKey],
      );
    for (const sensitive of [
      '{"note":"https://example.test/a"}',
      '{"note":"/object/sign/originals/x"}',
      '{"note":"sk_live_abc"}',
      '{"note":"whsec_abc"}',
      '{"nested":{"a":1}}',
    ])
      await expect(insert(sensitive), sensitive).rejects.toMatchObject({ code: "23514" });
    await expect(insert("{}", "https://storage.test/object/sign/a?token=1")).rejects.toMatchObject({
      code: "23514",
    });
    await expect(
      pool!.query("update infra.integration_logs set latency_ms=0"),
    ).rejects.toMatchObject({
      code: "55000",
    });
    await expect(pool!.query("delete from infra.integration_logs")).rejects.toMatchObject({
      code: "55000",
    });
  });

  it("purges only beyond a configured retention period", async () => {
    const old = randomUUID();
    await pool!.query(
      `select infra.record_integration_log('queue','message.consume','OUTBOUND','pgmq','SUCCEEDED',1,null,
         null,null,1,null,$1,null,null,null,'{}'::jsonb,now() - interval '400 days')`,
      [old],
    );
    const before = Number(
      (await pool!.query("select count(*) from infra.integration_logs")).rows[0].count,
    );
    await expect(pool!.query("select infra.purge_integration_logs(0)")).rejects.toMatchObject({
      code: "22023",
    });
    const purged = await pool!.query<{ removed: number }>(
      "select infra.purge_integration_logs(365) as removed",
    );
    expect(purged.rows[0]?.removed).toBe(1);
    const after = Number(
      (await pool!.query("select count(*) from infra.integration_logs")).rows[0].count,
    );
    expect(after).toBe(before - 1);
    expect(await rows("correlation_id=$1", [old])).toEqual([]);
  });

  it("allows only ICE24 with permission and MFA, and isolates by account without global scope", async () => {
    const otherCorrelation = randomUUID();
    await tracer.record({
      integration: "stripe",
      operation: "subscription.retrieve",
      provider: "stripe",
      status: "SUCCEEDED",
      latencyMs: 3,
      context: { correlationId: otherCorrelation, accountId: otherAccount },
    });
    permissions = [];
    expect((await diagnose("limit=5")).status).toBe(403);
    permissions = allow("jobs.admin-read");
    expect((await diagnose("limit=5")).status).toBe(403);
    permissions = allow("integration-logs.read");
    aal = "aal1";
    expect((await diagnose("limit=5")).status).toBe(403);
    aal = "aal2";
    expect((await diagnose("integration=maps")).status).toBe(400);

    // Global ICE24 scope sees both accounts.
    const global = await page("limit=100");
    const visible = new Set(global.map((item) => item.accountId));
    expect(visible.has(account) && visible.has(otherAccount)).toBe(true);

    // Without account-wide scope only the active account is visible, whatever the filter says.
    accountWide = false;
    subjectAccount = otherAccount;
    const own = await page("limit=100");
    expect(own.map((item) => item.correlationId)).toEqual([otherCorrelation]);
    expect(await page(`accountId=${account}`)).toEqual([]);
    accountWide = true;
    subjectAccount = account;
  });
});
