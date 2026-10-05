import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import {
  EMAIL_TEMPLATES,
  apiErrorSchema,
  emailTemplateVariableNames,
  notificationPageSchema,
  type EmailTemplateKey,
} from "@ice24/contracts";
import { NotificationsController } from "../../apps/api/src/modules/notifications/interface/notifications.controller.js";
import { EmailWebhooksController } from "../../apps/api/src/modules/notifications/interface/email-webhooks.controller.js";
import { NotificationsService } from "../../apps/api/src/modules/notifications/application/notifications.service.js";
import { EmailWebhooksService } from "../../apps/api/src/modules/notifications/application/email-webhooks.service.js";
import { NotificationsDatabase } from "../../apps/api/src/modules/notifications/infrastructure/notifications.database.js";
import { EmailTrackingDatabase } from "../../apps/api/src/modules/notifications/infrastructure/email-tracking.database.js";
import {
  LOCAL_EMAIL_SIGNATURE_HEADER,
  LocalEmailWebhookVerifier,
  signLocalEmailWebhook,
} from "../../apps/api/src/modules/notifications/infrastructure/local-email-webhook.verifier.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import { processDomainEvents } from "../../apps/worker/src/processors/domain-events.js";
import { domainEventConsumers } from "../../apps/worker/src/consumers/index.js";
import {
  addressDigest,
  processEmailDeliveries,
} from "../../apps/worker/src/processors/notifications/email-deliveries.js";
import {
  LocalEmailProvider,
  type EmailProvider,
} from "../../apps/worker/src/processors/notifications/email/provider.js";

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
];

// Full F5-12 path: subscription producer → outbox → publisher → domain_events → worker
// consumers (notification-center, email-alerts) → email_deliveries → delivery processor →
// provider adapter (local double) → signed tracking webhook in the Nest API → notification API.
describe("F5-12 transactional email: critical alerts, idempotency, DLQ and tracking", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let notifications: NotificationsDatabase | undefined;
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
  const oldUrl = process.env.DATABASE_URL;
  const secret = "integration-webhook-secret-0123456789abcdef";
  const account = randomUUID(),
    otherAccount = randomUUID(),
    branch = randomUUID(),
    owner = randomUUID(),
    coOwner = randomUUID(),
    operator = randomUUID(),
    otherOwner = randomUUID(),
    subscription = randomUUID(),
    otherSubscription = randomUUID(),
    ownerContext = randomUUID(),
    otherContext = randomUUID();
  const memberships = new Map<string, string>();
  let actor = owner;
  let subjectAccount = account;
  const as = (user: string, accountId = account) => {
    actor = user;
    subjectAccount = accountId;
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
  const inbox = async () => {
    const response = await call("notifications");
    expect(response.status).toBe(200);
    return notificationPageSchema.parse(await response.json());
  };
  const webhook = (
    body: string,
    signature = signLocalEmailWebhook(body, secret, Math.floor(Date.now() / 1000)),
  ) =>
    fetch(`${url}/api/v1/webhooks/email`, {
      method: "POST",
      headers: { "content-type": "application/json", [LOCAL_EMAIL_SIGNATURE_HEADER]: signature },
      body,
    });
  const trackingEvent = (
    providerMessageId: string,
    type: "DELIVERED" | "BOUNCED",
    id = randomUUID(),
  ) =>
    JSON.stringify({
      events: [
        {
          providerEventId: `evt_${id}`,
          type,
          providerMessageId,
          occurredAt: new Date().toISOString(),
        },
      ],
    });

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
  const drain = async () => {
    for (let i = 0; i < 5; i++) {
      const result = await processDomainEvents(pool!, domainEventConsumers, { batchSize: 100 });
      if (result.received === 0) return;
    }
  };
  const deliver = (provider: EmailProvider) =>
    processEmailDeliveries(
      pool!,
      { provider, baseUrl: "http://127.0.0.1:3000" },
      { batchSize: 50 },
    );
  const expireBackoff = () =>
    pool!.query("update pgmq.q_email_deliveries set vt=clock_timestamp()");
  const messagesFor = async (originEventId: string) =>
    (
      await pool!.query<{
        id: string;
        recipient_user_id: string;
        status: string;
        attempt_count: number;
        last_error_code: string | null;
        provider_message_id: string | null;
        recipient_address_sha256: string | null;
        job_id: string;
        notification_recipient_id: string | null;
      }>(
        "select m.* from email.messages m where m.origin_event_id=$1 order by m.created_at, m.id",
        [originEventId],
      )
    ).rows;
  const operations = async (messageId: string) =>
    (
      await pool!.query<{ operation: string }>(
        "select operation from audit.events where entity_type='EmailMessage' and entity_id=$1 order by occurred_at_utc, created_at",
        [messageId],
      )
    ).rows.map((row) => row.operation);

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
    for (const file of MIGRATIONS) await pool.query(await migration(file));
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [account, otherAccount],
    );
    await pool.query(
      `insert into identity.users(id,identity_subject,username,email,display_name,status,time_zone) values
       ($1::uuid,$1::text,'mail-owner','mail-owner@example.test','Dueña A','ACTIVE','America/Mexico_City'),
       ($2::uuid,$2::text,'mail-coowner','mail-coowner@example.test','Codueño A','ACTIVE','UTC'),
       ($3::uuid,$3::text,'mail-operator','mail-operator@example.test','Operador A','ACTIVE','UTC'),
       ($4::uuid,$4::text,'mail-owner-b','mail-owner-b@example.test','Dueño B','ACTIVE','UTC')`,
      [owner, coOwner, operator, otherOwner],
    );
    await pool.query("insert into equipment.branches(id,account_id,data) values($1,$2,'{}')", [
      branch,
      account,
    ]);
    for (const [user, accountId, role, scope] of [
      [owner, account, "OW", "ACCOUNT"],
      [coOwner, account, "OW", "ACCOUNT"],
      [operator, account, "OP", "BRANCH"],
      [otherOwner, otherAccount, "OW", "ACCOUNT"],
    ] as const) {
      const membership = randomUUID();
      memberships.set(user, membership);
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
      if (user === owner || user === otherOwner)
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
    notifications = new NotificationsDatabase();
    tracking = new EmailTrackingDatabase();

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    class TestModule {}
    Module({
      controllers: [NotificationsController, EmailWebhooksController],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        { provide: NotificationsService, useValue: new NotificationsService(notifications) },
        {
          provide: EmailWebhooksService,
          useValue: new EmailWebhooksService(new LocalEmailWebhookVerifier(secret), tracking),
        },
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
              membershipId: memberships.get(actor) ?? randomUUID(),
              membershipAccountId: subjectAccount,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: "ACTIVE",
              assuranceLevel: "aal1",
              permissions: ["notifications.read", "notifications.attend"].map((code) => ({
                code,
                effect: "ALLOW" as const,
                classification: "CONFIDENTIAL" as const,
              })),
              accountWide: actor !== operator,
              branchIds: new Set(actor === operator ? [branch] : []),
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
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    await app?.close();
    await notifications?.onModuleDestroy();
    await tracking?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
  });

  it("keeps the SQL template catalog aligned with the contract", async () => {
    const rows = await pool!.query<{ template_key: string; version: number; variables: string[] }>(
      "select template_key, version, variables from email.templates order by 1, 2",
    );
    const expected = Object.entries(EMAIL_TEMPLATES).flatMap(([key, versions]) =>
      Object.keys(versions).map((version) => ({
        template_key: key,
        version: Number(version),
        variables: emailTemplateVariableNames(key as EmailTemplateKey, Number(version)),
      })),
    );
    expect(rows.rows).toEqual(expected);
  });

  it("emails a critical alert only to authorized recipients of the account, revalidated at send", async () => {
    const provider = new LocalEmailProvider();
    // The co-owner loses the billing-alert audience between the alert and the send.
    const eventId = await produce("payment_failed");
    await drain();
    const queued = await messagesFor(eventId);
    expect(queued.map((m) => [m.recipient_user_id, m.status]).sort()).toEqual(
      [
        [owner, "QUEUED"],
        [coOwner, "QUEUED"],
      ].sort(),
    );
    // The operator has no billing audience; the other account never receives anything.
    expect(queued.some((m) => [operator, otherOwner].includes(m.recipient_user_id))).toBe(false);
    await pool!.query(
      `insert into authz.membership_permission_overrides(membership_id,permission_id,effect,reason)
       select $1, id, 'DENY', 'Billing alerts withdrawn by the owner' from authz.permissions
       where code='notifications.billing-alerts'`,
      [memberships.get(coOwner)],
    );

    expect(await deliver(provider)).toMatchObject({ received: 2, sent: 1, skipped: 1 });
    expect(provider.outbox).toHaveLength(1);
    const [email] = provider.outbox;
    expect(email!.to).toBe("mail-owner@example.test");
    expect(email!.subject).toBe("[ICE24 OS] Alerta crítica: Pago de suscripción rechazado");
    expect(email!.text).toContain("Cuenta: Synthetic A");
    expect(email!.text).toContain("Ver suscripción: http://127.0.0.1:3000/subscription");
    // No source identifiers, payload or other recipients in the message.
    for (const leaked of [subscription, eventId, "cus_", "coowner", "payment_failed"])
      expect(`${email!.subject}${email!.text}${email!.html}`).not.toContain(leaked);

    const after = await messagesFor(eventId);
    const sent = after.find((m) => m.recipient_user_id === owner)!;
    const rejected = after.find((m) => m.recipient_user_id === coOwner)!;
    expect(sent).toMatchObject({
      status: "SENT",
      attempt_count: 1,
      provider_message_id: email!.providerMessageId,
      recipient_address_sha256: addressDigest("mail-owner@example.test"),
    });
    expect(rejected).toMatchObject({
      status: "FAILED",
      last_error_code: "RECIPIENT_NOT_AUTHORIZED",
    });
    expect(await operations(sent.id)).toEqual(["EmailQueued", "EmailSent"]);
    expect(await operations(rejected.id)).toEqual(["EmailQueued", "EmailRecipientRejected"]);
    const columns = await pool!.query(
      `select count(*)::int as total from information_schema.columns where table_schema='email'
         and (column_name like '%email%' or (column_name like '%address%' and column_name<>'recipient_address_sha256'))`,
    );
    expect(columns.rows[0]).toEqual({ total: 0 }); // no address column anywhere in the schema

    as(owner);
    const [alert] = (await inbox()).items;
    expect(alert).toMatchObject({
      sentChannels: expect.arrayContaining(["in_app", "email"]),
      emailDelivery: { status: "sent" },
    });
  });

  it("never duplicates: redelivered events, redelivered queue messages and lost acknowledgements", async () => {
    const eventId = await produce("enter_read_only");
    await drain();
    // Redelivery of the domain event queues nothing new.
    await pool!.query(
      "select pgmq.send('domain_events', message) from pgmq.a_domain_events where message->>'eventId'=$1",
      [eventId],
    );
    await drain();
    expect(await messagesFor(eventId)).toHaveLength(1); // co-owner is denied now

    // The provider accepts but the worker "crashes" before recording SENT.
    const local = new LocalEmailProvider();
    let crash = true;
    const flaky: EmailProvider = {
      name: "local",
      async send(email) {
        const accepted = await local.send(email);
        if (crash) {
          crash = false;
          throw new Error("acknowledgement lost");
        }
        return accepted;
      },
    };
    expect(await deliver(flaky)).toMatchObject({ retried: 1 });
    await expireBackoff();
    expect(await deliver(flaky)).toMatchObject({ sent: 1 });
    expect(local.calls).toBe(2);
    expect(local.outbox).toHaveLength(1); // the provider deduplicated by idempotency key
    const [message] = await messagesFor(eventId);
    expect(message).toMatchObject({ status: "SENT", attempt_count: 2 });

    // Redelivery of the queue message after SENT is acknowledged without sending.
    await pool!.query(
      "select pgmq.send('email_deliveries', message) from pgmq.a_email_deliveries where message->>'emailMessageId'=$1",
      [message!.id],
    );
    expect(await deliver(local)).toMatchObject({ duplicates: 1, sent: 0 });
    expect(local.calls).toBe(2);
    const job = await pool!.query("select status from infra.async_jobs where id=$1", [
      message!.job_id,
    ]);
    expect(job.rows[0]).toEqual({ status: "SUCCEEDED" });
  });

  it("retries with backoff, dead-letters after the policy and recovers through the audited retry", async () => {
    const provider = new LocalEmailProvider();
    provider.failWith("PROVIDER_UNAVAILABLE");
    const eventId = await produce("payment_failed");
    await drain();
    const [message] = await messagesFor(eventId);

    expect(await deliver(provider)).toMatchObject({ retried: 1 });
    const waiting = await pool!.query(
      "select status, error_code, next_attempt_at > now() as backoff from infra.async_jobs where id=$1",
      [message!.job_id],
    );
    expect(waiting.rows[0]).toEqual({
      status: "RETRY_WAIT",
      error_code: "PROVIDER_UNAVAILABLE",
      backoff: true,
    });
    expect(await deliver(provider)).toMatchObject({ received: 0 }); // still invisible (backoff)
    expect((await messagesFor(eventId))[0]).toMatchObject({
      status: "QUEUED",
      attempt_count: 1,
      last_error_code: "PROVIDER_UNAVAILABLE",
    });
    for (let attempt = 2; attempt <= 5; attempt++) {
      await expireBackoff();
      await deliver(provider);
    }
    expect((await messagesFor(eventId))[0]).toMatchObject({ status: "FAILED", attempt_count: 5 });
    const dead = await pool!.query(
      "select j.status, (select count(*)::int from pgmq.q_email_deliveries_dlq) as dlq from infra.async_jobs j where j.id=$1",
      [message!.job_id],
    );
    expect(dead.rows[0]).toEqual({ status: "DEAD_LETTER", dlq: 1 });
    as(owner);
    const failed = (await inbox()).items.find((n) => n.id === message!.notification_recipient_id);
    expect(failed?.emailDelivery?.status).toBe("failed");

    // INT-004: support re-queues the job with a reason; the message goes back to QUEUED.
    await pool!.query("select * from infra.retry_dead_letter_job($1,$2,null,$3,$4,null)", [
      message!.job_id,
      owner,
      "Proveedor de correo restablecido tras incidente",
      randomUUID(),
    ]);
    provider.failWith(null);
    expect(await deliver(provider)).toMatchObject({ sent: 1 });
    expect((await messagesFor(eventId))[0]).toMatchObject({ status: "SENT", attempt_count: 5 });
    expect(provider.outbox).toHaveLength(1);
    // The last attempt and EmailFailed share one transaction (same audit time): compare as a set.
    expect((await operations(message!.id)).sort()).toEqual(
      [
        "EmailQueued",
        ...Array<string>(5).fill("EmailDeliveryAttemptFailed"),
        "EmailFailed",
        "EmailRequeued",
        "EmailSent",
      ].sort(),
    );
    const history = await pool!.query<{ event_type: string }>(
      "select event_type from email.message_events where message_id=$1 order by occurred_at, id",
      [message!.id],
    );
    expect(history.rows.map((r) => r.event_type)).toEqual([
      "QUEUED",
      ...Array<string>(5).fill("ATTEMPT_FAILED"),
      "FAILED",
      "REQUEUED",
      "SENT",
    ]);
  });

  it("tracks delivery and bounce through the signed webhook, idempotently and out of order", async () => {
    const sent = await pool!.query<{ id: string; provider_message_id: string }>(
      "select id, provider_message_id from email.messages where status='SENT' and recipient_user_id=$1 order by created_at limit 2",
      [owner],
    );
    const [first, second] = sent.rows;

    const unsigned = await webhook(
      trackingEvent(first!.provider_message_id, "DELIVERED"),
      "t=1,v1=00",
    );
    expect(unsigned.status).toBe(400);
    expect(apiErrorSchema.parse(await unsigned.json()).error.code).toBe(
      "INVALID_WEBHOOK_SIGNATURE",
    );

    const body = trackingEvent(first!.provider_message_id, "DELIVERED");
    const applied = await webhook(body);
    expect(applied.status).toBe(200);
    expect(await applied.json()).toEqual({ received: true, outcomes: ["APPLIED"] });
    expect(await (await webhook(body)).json()).toEqual({ received: true, outcomes: ["DUPLICATE"] });
    const reused = JSON.parse(body) as { events: { type: string }[] };
    reused.events[0]!.type = "BOUNCED";
    expect((await webhook(JSON.stringify(reused))).status).toBe(409);

    // Bounce after delivery is applied; a late "delivered" after the bounce is ignored.
    expect(
      await (await webhook(trackingEvent(second!.provider_message_id, "BOUNCED"))).json(),
    ).toEqual({ received: true, outcomes: ["APPLIED"] });
    expect(
      await (await webhook(trackingEvent(second!.provider_message_id, "DELIVERED"))).json(),
    ).toEqual({ received: true, outcomes: ["IGNORED"] });
    const states = await pool!.query<{ id: string; status: string }>(
      "select id, status from email.messages where id = any($1::uuid[])",
      [[first!.id, second!.id]],
    );
    expect(Object.fromEntries(states.rows.map((r) => [r.id, r.status]))).toEqual({
      [first!.id]: "DELIVERED",
      [second!.id]: "BOUNCED",
    });
    expect(await operations(second!.id)).toContain("EmailBounced");

    // An event that arrives before the send is recorded waits and is applied with SENT.
    const eventId = await produce("payment_failed");
    await drain();
    const [pending] = await messagesFor(eventId);
    const provider = new LocalEmailProvider();
    const { providerMessageId } = await new LocalEmailProvider().send({
      idempotencyKey: pending!.id,
      to: "x@example.test",
      subject: "",
      text: "",
      html: "",
      tags: {},
    });
    expect(await (await webhook(trackingEvent(providerMessageId, "DELIVERED"))).json()).toEqual({
      received: true,
      outcomes: ["PENDING"],
    });
    await deliver(provider);
    expect((await messagesFor(eventId))[0]!.status).toBe("DELIVERED");

    // Only the recipient sees the delivery state, in the active account.
    as(otherOwner, otherAccount);
    expect((await inbox()).items).toHaveLength(0);
    as(owner);
    const delivered = (await inbox()).items.find((n) => n.emailDelivery?.status === "bounced");
    expect(delivered?.recipientUserId).toBe(owner);
    as(otherOwner, otherAccount);
    expect((await call(`notifications/${delivered!.id}`)).status).toBe(404);
  });

  it("isolates accounts and validates templates when a producer requests an email", async () => {
    const request = (user: string, template: string, variables: unknown, key = randomUUID()) =>
      pool!.query(
        "select email.request($1,1,$2,$3,'notifications.read',$4,$5,'Report',$6,null,null,null,null) as id",
        [template, account, user, JSON.stringify(variables), `report:${key}`, randomUUID()],
      );
    const report = {
      accountName: "Synthetic A",
      reportName: "Bitácora mensual",
      periodLabel: "Septiembre 2026",
      reportPath: "/reports/123",
    };
    // A registered user of another account is never a valid recipient (RF-RPT-004).
    await expect(request(otherOwner, "report.scheduled", report)).rejects.toMatchObject({
      code: "IC403",
    });
    await expect(
      request(owner, "report.scheduled", { ...report, attachment: "x" }),
    ).rejects.toMatchObject({ code: "22023" });
    await expect(request(owner, "report.unknown", report)).rejects.toMatchObject({ code: "22023" });
    const key = randomUUID();
    const first = await request(owner, "report.scheduled", report, key);
    const again = await request(owner, "report.scheduled", report, key);
    expect(again.rows[0]).toEqual(first.rows[0]);

    const provider = new LocalEmailProvider();
    expect(await deliver(provider)).toMatchObject({ sent: 1 });
    expect(provider.outbox[0]).toMatchObject({
      to: "mail-owner@example.test",
      subject: "[ICE24 OS] Reporte programado: Bitácora mensual",
    });

    // History is retained: no deletes, no rewritten facts.
    await expect(pool!.query("delete from email.messages")).rejects.toMatchObject({
      code: "55000",
    });
    await expect(
      pool!.query("update email.messages set variables='{}' where id=$1", [first.rows[0].id]),
    ).rejects.toMatchObject({ code: "55000" });
    await expect(
      pool!.query("update email.message_events set error_code='X'"),
    ).rejects.toMatchObject({ code: "55000" });
  });
});
