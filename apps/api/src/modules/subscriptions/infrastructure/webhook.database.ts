import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { writeLog } from "@ice24/observability";
import { WebhookPort, type WebhookTransaction } from "../application/webhook.port.js";
import {
  SubscriptionGatewayError,
  type VerifiedSubscriptionEvent,
} from "../application/subscription.gateway.js";
import { SubscriptionDatabase, type SubscriptionTransaction } from "./subscription.database.js";
import { SubscriptionRuleError } from "../domain/subscription.js";

@Injectable()
export class WebhookDatabase extends WebhookPort {
  constructor(@Inject(SubscriptionDatabase) private readonly db: SubscriptionDatabase) {
    super();
  }

  override async receive(
    event: VerifiedSubscriptionEvent,
    digest: string,
    correlationId: string,
    rawBody: Uint8Array,
  ) {
    const result = await this.db.pool.query<{
      payload_hash: string;
      correlation_id: string;
      deliveries: number;
    }>(
      `insert into subscriptions.stripe_webhooks(provider_event_id,event_type,occurred_at,correlation_id,payload_hash,event,raw_body)
       values($1,$2,$3,$4,$5,$6,$7) on conflict(provider_event_id) do update
       set deliveries=subscriptions.stripe_webhooks.deliveries+1,last_received_at=now()
       returning payload_hash,correlation_id,deliveries`,
      [
        event.providerEventId,
        event.eventType,
        event.occurredAt,
        correlationId,
        digest,
        JSON.stringify(event),
        Buffer.from(rawBody),
      ],
    );
    const receipt = result.rows[0]!;
    if (receipt.payload_hash !== digest)
      throw new ConflictException("Webhook ID reused with different content");
    return { correlationId: receipt.correlation_id, deliveries: Number(receipt.deliveries) };
  }

  override async process(
    eventId: string,
    work: (tx: WebhookTransaction) => Promise<"APPLIED" | "IGNORED">,
  ) {
    const client = await this.db.pool.connect();
    let correlationId: string | undefined;
    const started = Date.now();
    try {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='10s'");
      const row = (
        await client.query<{
          event: VerifiedSubscriptionEvent;
          status: string;
          correlation_id: string;
        }>(
          "select event,status,correlation_id from subscriptions.stripe_webhooks where provider_event_id=$1 for update",
          [eventId],
        )
      ).rows[0];
      if (!row) throw new Error("Missing durable event");
      correlationId = row.correlation_id;
      if (["APPLIED", "IGNORED"].includes(row.status)) {
        await client.query("commit");
        return;
      }
      const now = (
        await client.query<{ now: Date }>("select clock_timestamp() as now")
      ).rows[0]!.now.toISOString();
      let subscriptionTx: SubscriptionTransaction | undefined;
      const result = await work({
        event: row.event,
        now,
        correlationId,
        resolveAccount: async () => {
          const hint = row.event.accountIdHint;
          const validHint =
            hint && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(hint) ? hint : null;
          const matches = await client.query<{ account_id: string }>(
            `select account_id from subscriptions.records s where provider_customer_id=$1 or provider_subscription_id=$2
             or (account_id=$3 and provider_customer_id is null and not is_demo and
               exists(select 1 from subscriptions.checkout_intents i where i.account_id=s.account_id))`,
            [row.event.providerCustomerId, row.event.providerSubscriptionId, validHint],
          );
          if (matches.rowCount !== 1)
            throw new SubscriptionRuleError("Webhook account mapping unavailable or ambiguous");
          subscriptionTx = {
            client,
            actorId: null,
            contextId: null,
            accountId: matches.rows[0]!.account_id,
            correlationId: row.correlation_id,
            now,
            providerEventId: eventId,
          };
          // Same account-before-record ordering as interactive writes. Serialize before querying Stripe.
          const previous = await this.db.read(subscriptionTx, subscriptionTx.accountId, true);
          await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [
            `billing-target:${previous.accountId}`,
          ]);
          return previous;
        },
        save: async (next, previous) => {
          if (
            !subscriptionTx ||
            next.accountId !== subscriptionTx.accountId ||
            previous.accountId !== next.accountId
          )
            throw new SubscriptionRuleError("Reconciliation account mismatch");
          await this.db.save(
            subscriptionTx,
            next,
            previous,
            "StripeSubscriptionReconciled",
            `Reconciled signed Stripe event ${row.event.eventType}`,
          );
        },
      });
      await client.query(
        `update subscriptions.stripe_webhooks set status=$2,attempts=attempts+1,
        processed_at=now(),error_code=null,account_id=$3 where provider_event_id=$1`,
        [eventId, result, subscriptionTx?.accountId ?? null],
      );
      await client.query("commit");
      writeLog({
        service: "api",
        environment: process.env.NODE_ENV ?? "development",
        module: "stripe-webhooks",
        level: "info",
        outcome: "success",
        correlationId,
        durationMs: Date.now() - started,
        attributes: { result },
      });
    } catch (error) {
      await client.query("rollback");
      const code =
        error instanceof SubscriptionGatewayError
          ? error.code
          : error instanceof SubscriptionRuleError
            ? "RECONCILIATION_CONFLICT"
            : "PROCESSING_FAILED";
      // Preserve the receipt after rollback. A concurrently completed delivery must stay completed.
      await client.query(
        `update subscriptions.stripe_webhooks set status='FAILED',attempts=attempts+1,error_code=$2
        where provider_event_id=$1 and status not in ('APPLIED','IGNORED')`,
        [eventId, code],
      );
      writeLog({
        service: "api",
        environment: process.env.NODE_ENV ?? "development",
        module: "stripe-webhooks",
        level: "warn",
        outcome: "failure",
        ...(correlationId ? { correlationId } : {}),
        errorCode: code,
        durationMs: Date.now() - started,
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
