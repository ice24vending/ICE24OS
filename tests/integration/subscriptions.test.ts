import { readFile, mkdir } from "node:fs/promises";
import { randomUUID, randomBytes, createCipheriv, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BillingController } from "../../apps/api/src/modules/subscriptions/interface/billing.controller.js";
import { BillingService } from "../../apps/api/src/modules/subscriptions/application/billing.service.js";
import { WebhooksController } from "../../apps/api/src/modules/subscriptions/interface/webhooks.controller.js";
import { WebhooksService } from "../../apps/api/src/modules/subscriptions/application/webhooks.service.js";
import { WebhookDatabase } from "../../apps/api/src/modules/subscriptions/infrastructure/webhook.database.js";
import { StripeSubscriptionGateway } from "../../apps/api/src/modules/subscriptions/infrastructure/stripe.gateway.js";
import { createStripeClient } from "../../apps/api/src/modules/subscriptions/infrastructure/stripe.client.js";
import {
  SubscriptionGatewayError,
  type SubscriptionGateway,
} from "../../apps/api/src/modules/subscriptions/application/subscription.gateway.js";
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
  const stripeEnv = {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture",
    STRIPE_PRICE_ID: "price_fixture",
    PRIVATE_WEB_URL: "http://localhost:3000",
  };
  const oldStripeEnv = Object.fromEntries(
    Object.keys(stripeEnv).map((key) => [key, process.env[key]]),
  );
  const checkout = vi.fn<SubscriptionGateway["createCheckoutSession"]>();
  const portal = vi.fn<SubscriptionGateway["createPortalSession"]>();
  const retrieve = vi.fn<SubscriptionGateway["retrieveSubscription"]>();
  const verifier = new StripeSubscriptionGateway(stripeEnv);
  const signer = createStripeClient(stripeEnv);
  const gateway = {
    retrieveSubscription: retrieve,
    verifyWebhook: (input: Parameters<SubscriptionGateway["verifyWebhook"]>[0]) =>
      verifier.verifyWebhook(input),
    createCheckoutSession: checkout,
    createPortalSession: portal,
  } as unknown as SubscriptionGateway;
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
      "20260929000100_phase5_checkout_intents.sql",
      "20260929000200_phase5_stripe_webhooks.sql",
    ])
      await pool.query(
        await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8"),
      );
    process.env.DATABASE_URL = container.getConnectionUri();
    identity = new IdentityStore();
    db = new SubscriptionDatabase(identity);
    service = new SubscriptionsService(db);
    Object.assign(process.env, stripeEnv);
    checkout.mockImplementation(async (input) => ({
      providerSessionId: `cs_${input.accountId}`,
      providerCustomerId: `cus_${input.accountId}`,
      url: "https://checkout.stripe.com/fixture",
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    }));
    portal.mockImplementation(async () => ({
      providerSessionId: "bps_fixture",
      url: "https://billing.stripe.com/fixture",
      expiresAt: null,
    }));
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
    for (const [key, value] of Object.entries(oldStripeEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
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
      controllers: [SubscriptionsController, BillingController, WebhooksController],
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
        { provide: BillingService, useValue: new BillingService(db, gateway) },
        {
          provide: WebhooksService,
          useValue: new WebhooksService(gateway, new WebhookDatabase(db)),
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false, rawBody: true });
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
    expect(document.paths["/v1/subscription/checkout"]).toBeDefined();
    expect(document.paths["/v1/subscription/portal"]).toBeDefined();
    expect(document.paths["/v1/webhooks/stripe"]).toBeDefined();
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

  const billingBody = {
    returnUrl: "http://localhost:3000/subscription",
    cancelUrl: "http://localhost:3000/subscription",
  };
  function billingPost(
    name: string,
    path = "checkout",
    body: unknown = billingBody,
    key = randomUUID(),
    contextId = actors.get(name)!.context,
  ) {
    return fetch(`${url}/v1/subscription/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${name}`,
        "x-ice24-context-id": contextId,
        "idempotency-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
  async function webhookFixture(name: string) {
    const demo = await service.provisionDemo(req(), input(name));
    await context(name, demo.accountId, actors.get("owner")!.user, "OW");
    const response = await billingPost(name);
    expect(response.status).toBe(201);
    const { accountId } = (await response.json()) as { accountId: string };
    await context(`${name}:production`, accountId, actors.get("owner")!.user, "OW");
    return {
      accountId,
      providerCustomerId: `cus_${accountId}`,
      providerSubscriptionId: `sub_${accountId}`,
      providerStatus: "active",
      providerPriceId: "price_fixture",
      amountMinor: 39900,
      currency: "mxn",
      currentPeriodStart: new Date(Date.now() - 60_000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 86400_000).toISOString(),
      cancelAtPeriodEnd: false,
      latestInvoiceId: `in_${accountId}`,
      paymentStatus: "paid" as const,
      observedAt: new Date().toISOString(),
      correlationId: randomUUID(),
    };
  }
  function webhookBody(
    snapshot: Awaited<ReturnType<typeof webhookFixture>>,
    eventId = `evt_${randomUUID()}`,
    type = "invoice.paid",
    created = Math.floor(Date.now() / 1000),
  ) {
    return JSON.stringify(
      {
        id: eventId,
        type,
        created,
        livemode: false,
        data: {
          object: type.startsWith("customer.subscription.")
            ? {
                object: "subscription",
                id: snapshot.providerSubscriptionId,
                customer: snapshot.providerCustomerId,
                metadata: { ice24AccountId: snapshot.accountId },
              }
            : {
                object: "invoice",
                id: snapshot.latestInvoiceId,
                customer: snapshot.providerCustomerId,
                parent: {
                  subscription_details: {
                    subscription: snapshot.providerSubscriptionId,
                    metadata: { ice24AccountId: snapshot.accountId },
                  },
                },
              },
        },
      },
      null,
      2,
    );
  }
  function deliver(
    payload: string,
    signature = signer.webhooks.generateTestHeaderString({
      payload,
      secret: stripeEnv.STRIPE_WEBHOOK_SECRET,
    }),
  ) {
    return fetch(`${url}/v1/webhooks/stripe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature ? { "stripe-signature": signature } : {}),
      },
      body: payload,
    });
  }
  it("rejects missing, tampered, expired and live signatures before persisting anything", async () => {
    const snapshot = await webhookFixture("signed");
    const payload = webhookBody(snapshot, "evt_invalid");
    const signature = signer.webhooks.generateTestHeaderString({
      payload,
      secret: stripeEnv.STRIPE_WEBHOOK_SECRET,
    });
    expect((await deliver(payload, "")).status).toBe(400);
    const tampered = await deliver(payload + " ", signature);
    expect(tampered.status).toBe(400);
    expect(apiErrorSchema.parse(await tampered.json()).error.code).toBe(
      "INVALID_WEBHOOK_SIGNATURE",
    );
    expect(
      (
        await deliver(
          payload,
          signer.webhooks.generateTestHeaderString({
            payload,
            secret: stripeEnv.STRIPE_WEBHOOK_SECRET,
            timestamp: Math.floor(Date.now() / 1000) - 600,
          }),
        )
      ).status,
    ).toBe(400);
    expect((await deliver(payload.replace('"livemode": false', '"livemode": true'))).status).toBe(
      400,
    );
    expect(
      (
        await pool.query(
          "select * from subscriptions.stripe_webhooks where provider_event_id='evt_invalid'",
        )
      ).rowCount,
    ).toBe(0);
  });
  it("persists exact signed bytes before Stripe lookup and deduplicates simultaneous deliveries", async () => {
    const snapshot = await webhookFixture("duplicate");
    const payload = webhookBody(snapshot, "evt_duplicate");
    const before = retrieve.mock.calls.length;
    retrieve.mockImplementation(async () => {
      const receipt = (
        await pool.query(
          "select raw_body,payload_hash from subscriptions.stripe_webhooks where provider_event_id='evt_duplicate'",
        )
      ).rows[0];
      expect(receipt.raw_body.toString()).toBe(payload);
      expect(receipt.payload_hash).toBe(createHash("sha256").update(payload).digest("hex"));
      return snapshot;
    });
    const results = await Promise.all([deliver(payload), deliver(payload)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await results[0]!.json()).toEqual({ received: true });
    expect(retrieve.mock.calls.length - before).toBe(1);
    expect(
      (
        await pool.query(
          "select status,deliveries,attempts from subscriptions.stripe_webhooks where provider_event_id='evt_duplicate'",
        )
      ).rows[0],
    ).toEqual({ status: "APPLIED", deliveries: 2, attempts: 1 });
    const state = await service.read(req("duplicate:production"));
    expect(state.status).toBe("active");
    expect(state.audit.updatedBy).toBeNull();
    const audit = await pool.query(
      "select actor_type,actor_id,context_id from subscriptions.events where provider_event_id='evt_duplicate'",
    );
    expect(audit.rows).toEqual([{ actor_type: "STRIPE", actor_id: null, context_id: null }]);
    expect(
      (await deliver(payload.replace('"invoice.paid"', '"invoice.payment_failed"'))).status,
    ).toBe(409);
    await expect(
      pool.query(
        "update subscriptions.stripe_webhooks set raw_body='changed' where provider_event_id='evt_duplicate'",
      ),
    ).rejects.toThrow("immutable");
    const client = await pool.connect();
    try {
      await client.query("set role authenticated");
      await expect(client.query("select * from subscriptions.stripe_webhooks")).rejects.toThrow();
    } finally {
      await client.query("reset role");
      client.release();
    }
  });
  it("keeps failed receipts for recovery and retries without duplicating state or audit", async () => {
    const snapshot = await webhookFixture("retry");
    const payload = webhookBody(snapshot, "evt_retry");
    retrieve.mockRejectedValueOnce(new SubscriptionGatewayError("DEPENDENCY_UNAVAILABLE", true));
    expect((await deliver(payload)).status).toBe(503);
    expect((await service.read(req("retry:production"))).status).toBe("pending_activation");
    expect(
      (
        await pool.query(
          "select status,attempts from subscriptions.stripe_webhooks where provider_event_id='evt_retry'",
        )
      ).rows[0],
    ).toEqual({ status: "FAILED", attempts: 1 });
    retrieve.mockResolvedValue(snapshot);
    expect((await deliver(payload)).status).toBe(200);
    expect((await deliver(payload)).status).toBe(200);
    expect(
      (
        await pool.query(
          "select count(*)::int as n from subscriptions.events where provider_event_id='evt_retry'",
        )
      ).rows[0].n,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select status,attempts from subscriptions.stripe_webhooks where provider_event_id='evt_retry'",
        )
      ).rows[0],
    ).toEqual({ status: "APPLIED", attempts: 2 });
  });
  it("applies payment failures, preserves security suspension and ignores obsolete payload state", async () => {
    const snapshot = await webhookFixture("suspension");
    retrieve.mockResolvedValue(snapshot);
    expect((await deliver(webhookBody(snapshot))).status).toBe(200);
    retrieve.mockResolvedValue({
      ...snapshot,
      providerStatus: "past_due",
      paymentStatus: "failed",
    });
    expect(
      (await deliver(webhookBody(snapshot, "evt_payment_failed", "invoice.payment_failed"))).status,
    ).toBe(200);
    const failed = await service.read(req("suspension:production"));
    expect(failed.status).toBe("payment_failed");
    expect(failed.accessMode).toBe("READ_ONLY");
    await pool.query("update identity.accounts set access_mode='SUSPENDED' where id=$1", [
      snapshot.accountId,
    ]);
    retrieve.mockResolvedValue(snapshot);
    expect((await deliver(webhookBody(snapshot, "evt_reactivate"))).status).toBe(200);
    expect(
      (
        await pool.query(
          "select s.status,a.access_mode from subscriptions.records s join identity.accounts a on a.id=s.account_id where s.account_id=$1",
          [snapshot.accountId],
        )
      ).rows[0],
    ).toEqual({ status: "reactivated", access_mode: "SUSPENDED" });
    const version = (
      await pool.query("select row_version from subscriptions.records where account_id=$1", [
        snapshot.accountId,
      ])
    ).rows[0].row_version;
    expect(
      (
        await deliver(
          webhookBody(
            snapshot,
            "evt_old_failure",
            "invoice.payment_failed",
            Math.floor(Date.now() / 1000) - 86400,
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await pool.query("select row_version from subscriptions.records where account_id=$1", [
          snapshot.accountId,
        ])
      ).rows[0].row_version,
    ).toBe(version);
  });
  it("reconciles scheduled cancellation, reversal and termination without ending a paid period early", async () => {
    const snapshot = await webhookFixture("cancellation");
    retrieve.mockResolvedValue({ ...snapshot, cancelAtPeriodEnd: true });
    expect(
      (await deliver(webhookBody(snapshot, "evt_schedule", "customer.subscription.updated")))
        .status,
    ).toBe(200);
    expect((await service.read(req("cancellation:production"))).status).toBe(
      "cancellation_scheduled",
    );
    retrieve.mockResolvedValue(snapshot);
    expect(
      (await deliver(webhookBody(snapshot, "evt_reverse", "customer.subscription.updated"))).status,
    ).toBe(200);
    expect((await service.read(req("cancellation:production"))).status).toBe("active");
    retrieve.mockResolvedValue({ ...snapshot, providerStatus: "canceled" });
    expect(
      (await deliver(webhookBody(snapshot, "evt_cancel_early", "customer.subscription.deleted")))
        .status,
    ).toBe(200);
    expect((await service.read(req("cancellation:production"))).accessMode).toBe("ACTIVE");
    const end = new Date(Date.now() - 1000).toISOString();
    await pool.query(
      "update subscriptions.records set current_period_end=$2,row_version=row_version+1 where account_id=$1",
      [snapshot.accountId, end],
    );
    retrieve.mockResolvedValue({ ...snapshot, currentPeriodEnd: end, providerStatus: "canceled" });
    expect(
      (await deliver(webhookBody(snapshot, "evt_cancel_end", "customer.subscription.deleted")))
        .status,
    ).toBe(200);
    const final = await service.read(req("cancellation:production"));
    expect(final.status).toBe("cancelled");
    expect(final.accessMode).toBe("READ_ONLY");
  });
  it("rolls back subscription, access and audit together while preserving the original receipt", async () => {
    const snapshot = await webhookFixture("rollback");
    retrieve.mockResolvedValue(snapshot);
    const payload = webhookBody(snapshot, "evt_rollback");
    await pool.query(`create function subscriptions.test_fail_webhook_audit() returns trigger language plpgsql as $$ begin
      if new.provider_event_id='evt_rollback' then raise exception 'Synthetic audit failure'; end if; return new; end $$;
      create trigger test_fail_webhook_audit before insert on subscriptions.events for each row execute function subscriptions.test_fail_webhook_audit();`);
    try {
      expect((await deliver(payload)).status).toBe(503);
      const state = await service.read(req("rollback:production"));
      expect(state.status).toBe("pending_activation");
      expect(state.accessMode).toBe("READ_ONLY");
      expect(
        (
          await pool.query(
            "select count(*)::int as n from subscriptions.events where provider_event_id='evt_rollback'",
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await pool.query(
        "drop trigger test_fail_webhook_audit on subscriptions.events;drop function subscriptions.test_fail_webhook_audit()",
      );
    }
    expect((await deliver(payload)).status).toBe(200);
    expect((await service.read(req("rollback:production"))).status).toBe("active");
  });
  it("recovers an unbound checkout account using verified metadata and rejects cross-account observations", async () => {
    const snapshot = await webhookFixture("binding");
    await pool.query(
      "update subscriptions.records set provider_customer_id=null,row_version=row_version+1 where account_id=$1",
      [snapshot.accountId],
    );
    retrieve.mockResolvedValue({ ...snapshot, accountId: randomUUID() });
    const payload = webhookBody(snapshot, "evt_binding");
    expect((await deliver(payload)).status).toBe(503);
    retrieve.mockResolvedValue(snapshot);
    expect((await deliver(payload)).status).toBe(200);
    expect((await service.read(req("binding:production"))).providerCustomerId).toBe(
      snapshot.providerCustomerId,
    );
  });
  it("records unsupported events as ignored without querying Stripe", async () => {
    const payload = JSON.stringify({
      id: "evt_unrelated",
      type: "customer.created",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: { object: "customer", id: "cus_unrelated" } },
    });
    const calls = retrieve.mock.calls.length;
    expect((await deliver(payload)).status).toBe(200);
    expect((await deliver(payload)).status).toBe(200);
    expect(retrieve.mock.calls.length).toBe(calls);
    expect(
      (
        await pool.query(
          "select status from subscriptions.stripe_webhooks where provider_event_id='evt_unrelated'",
        )
      ).rows[0].status,
    ).toBe("IGNORED");
  });

  it("creates a clean durable production account, deduplicates concurrent checkout and supports portal in read-only", async () => {
    const demo = await service.provisionDemo(req(), input("billing"));
    await context("billing", demo.accountId, actors.get("owner")!.user, "OW");
    const key = randomUUID();
    const before = checkout.mock.calls.length;
    const responses = await Promise.all([
      billingPost("billing", "checkout", billingBody, key),
      billingPost("billing", "checkout", billingBody, key),
    ]);
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    const first = (await responses[0]!.json()) as { accountId: string; url: string };
    expect(await responses[1]!.json()).toEqual(first);
    expect(first.accountId).not.toBe(demo.accountId);
    expect(checkout.mock.calls.length - before).toBe(1);
    expect((await billingPost("billing")).status).toBe(201);
    expect(checkout.mock.calls.length - before).toBe(1);
    expect(
      (
        await pool.query(
          "select count(*)::int as count from equipment.requests where account_id=$1",
          [first.accountId],
        )
      ).rows[0].count,
    ).toBe(0);
    expect(
      (
        await pool.query(
          "select count(*)::int as count from equipment.requests where account_id=$1",
          [demo.accountId],
        )
      ).rows[0].count,
    ).toBe(6);
    expect(
      (
        await pool.query("select status,is_demo from subscriptions.records where account_id=$1", [
          first.accountId,
        ])
      ).rows[0],
    ).toEqual({ status: "pending_activation", is_demo: false });
    const portalKey = randomUUID(),
      portalBefore = portal.mock.calls.length;
    const portalResponse = await billingPost(
      "billing",
      "portal",
      { returnUrl: billingBody.returnUrl },
      portalKey,
    );
    expect(portalResponse.status).toBe(201);
    expect(await portalResponse.json()).toEqual({
      accountId: first.accountId,
      url: "https://billing.stripe.com/fixture",
      expiresAt: null,
    });
    expect(
      (await billingPost("billing", "portal", { returnUrl: billingBody.returnUrl }, portalKey))
        .status,
    ).toBe(201);
    expect(portal.mock.calls.length - portalBefore).toBe(1);
    expect(
      (
        await billingPost(
          "billing",
          "checkout",
          { ...billingBody, cancelUrl: "http://localhost:3000/other" },
          key,
        )
      ).status,
    ).toBe(409);
    await pool.query("update identity.accounts set access_mode='SUSPENDED' where id=$1", [
      first.accountId,
    ]);
    expect((await billingPost("billing", "checkout", billingBody, key)).status).toBe(403);
    expect(
      (await billingPost("billing", "portal", { returnUrl: billingBody.returnUrl }, portalKey))
        .status,
    ).toBe(403);
  });
  it("preserves the production account and provider key across provider failure and retry", async () => {
    const demo = await service.provisionDemo(req(), input("failure"));
    await context("billingFailure", demo.accountId, actors.get("owner")!.user, "OW");
    checkout.mockRejectedValueOnce(new SubscriptionGatewayError("DEPENDENCY_UNAVAILABLE", true));
    const key = randomUUID(),
      index = checkout.mock.calls.length;
    const failure = await billingPost("billingFailure", "checkout", billingBody, key);
    expect(failure.status).toBe(503);
    expect(apiErrorSchema.parse(await failure.json()).error.code).toBe("DEPENDENCY_UNAVAILABLE");
    const target = (
      await pool.query(
        "select production_account_id from subscriptions.demo_conversions where demo_account_id=$1",
        [demo.accountId],
      )
    ).rows[0].production_account_id;
    const retry = await billingPost("billingFailure", "checkout", billingBody, key);
    expect(retry.status).toBe(201);
    expect(((await retry.json()) as { accountId: string }).accountId).toBe(target);
    expect(checkout.mock.calls[index]![0].idempotencyKey).toBe(
      checkout.mock.calls[index + 1]![0].idempotencyKey,
    );
  });
  it("rejects cross-account context, non-owner, malformed input, foreign return URL and missing idempotency", async () => {
    const before = checkout.mock.calls.length;
    expect((await billingPost("admin")).status).toBe(403);
    expect(
      (
        await billingPost(
          "other",
          "checkout",
          billingBody,
          randomUUID(),
          actors.get("billing")!.context,
        )
      ).status,
    ).toBe(403);
    expect(
      (await billingPost("billing", "checkout", { ...billingBody, accountId: randomUUID() }))
        .status,
    ).toBe(400);
    expect(
      (
        await billingPost("billing", "checkout", {
          ...billingBody,
          returnUrl: "https://evil.example",
        })
      ).status,
    ).toBe(400);
    expect((await billingPost("billing", "checkout", billingBody, "")).status).toBe(400);
    expect(
      (
        await fetch(`${url}/v1/subscription/checkout`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(billingBody),
        })
      ).status,
    ).toBe(401);
    expect(checkout.mock.calls.length).toBe(before);
  });
  it("does not create a production account just to open an unconfigured demo portal", async () => {
    const demo = await service.provisionDemo(req(), input("portalOnly"));
    await context("portalOnly", demo.accountId, actors.get("owner")!.user, "OW");
    expect(
      (await billingPost("portalOnly", "portal", { returnUrl: billingBody.returnUrl })).status,
    ).toBe(409);
    expect(
      (
        await pool.query("select * from subscriptions.demo_conversions where demo_account_id=$1", [
          demo.accountId,
        ])
      ).rowCount,
    ).toBe(0);
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
