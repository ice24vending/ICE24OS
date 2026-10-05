import { createHash } from "node:crypto";
import type { Pool } from "pg";
import {
  consumerFailureCodeSchema,
  emailDeliveryMessageSchema,
  type EmailDeliveryBatchSummary,
  type EmailDeliveryMessage,
} from "@ice24/contracts";
import { EmailProviderError, type EmailProvider } from "./email/provider.js";
import { EmailTemplateError, renderEmail } from "./email/templates.js";

export const EMAIL_DELIVERIES_QUEUE = "email_deliveries";
/** Above any queue policy maximum: infra.fail_job routes the message straight to the DLQ. */
const POISON_ATTEMPT = 1_000;

export interface EmailDeliveryDependencies {
  readonly provider: EmailProvider;
  /** Origin of the private application used to build links (see emailLinkBaseFromEnvironment). */
  readonly baseUrl: string;
}

export interface EmailDeliveryOptions {
  readonly batchSize?: number;
  readonly visibilitySeconds?: number;
}

interface QueueMessage {
  msg_id: string;
  read_ct: number;
  message: unknown;
}

interface DeliveryTarget {
  action: "SEND" | "DONE" | "REJECTED" | "MISSING";
  account_id: string | null;
  recipient_user_id: string | null;
  recipient_address: string | null;
  locale: string | null;
  time_zone: string | null;
  template_key: string | null;
  template_version: number | null;
  variables: unknown;
  idempotency_key: string | null;
  correlation_id: string | null;
}

export const deliveryFailureCode = (error: unknown): string => {
  const code =
    error instanceof EmailProviderError || error instanceof EmailTemplateError
      ? error.code
      : undefined;
  return code !== undefined && consumerFailureCodeSchema.safeParse(code).success
    ? code
    : "HANDLER_FAILED";
};
const isPermanent = (error: unknown): boolean =>
  (error instanceof EmailProviderError && error.permanent) || error instanceof EmailTemplateError;

export const addressDigest = (address: string): string =>
  createHash("sha256").update(address.trim().toLowerCase()).digest("hex");

/**
 * Consumes one batch of `email_deliveries` (F5-12). Delivery is at least once and no step
 * duplicates the email:
 * - `email.delivery_start` moves the EMAIL job to RUNNING and says whether the message still
 *   has to be sent, was already sent (duplicate delivery: acknowledged without sending) or its
 *   recipient lost access (terminal FAILED, nothing sent); the address is read at this moment;
 * - the template version stored with the message is rendered server side with validated
 *   variables, and the provider receives the message id as idempotency key, so a retry after
 *   an accepted but unrecorded send is deduplicated by the provider;
 * - provider unavailable, timeout or rate limit: `infra.fail_job` schedules an exponential
 *   retry and `email.delivery_record_failure` records the attempt; when attempts are exhausted,
 *   or on a permanent rejection or invalid template, the message moves to the DLQ and is FAILED
 *   until support re-queues its job (INT-004);
 * - the queue message is acknowledged only after the outcome is stored.
 */
export async function processEmailDeliveries(
  pool: Pool,
  dependencies: EmailDeliveryDependencies,
  options: EmailDeliveryOptions = {},
): Promise<EmailDeliveryBatchSummary> {
  const summary: EmailDeliveryBatchSummary = {
    received: 0,
    sent: 0,
    duplicates: 0,
    skipped: 0,
    retried: 0,
    deadLettered: 0,
  };
  const batch = await pool.query<QueueMessage>(
    "select msg_id, read_ct, message from infra.read_queue($1,$2,$3)",
    [EMAIL_DELIVERIES_QUEUE, options.visibilitySeconds ?? 60, options.batchSize ?? 10],
  );
  for (const delivery of batch.rows) {
    summary.received += 1;
    const parsed = emailDeliveryMessageSchema.safeParse(delivery.message);
    if (!parsed.success) {
      await poison(pool, delivery, "INVALID_MESSAGE");
      summary.deadLettered += 1;
      continue;
    }
    const message = parsed.data;
    const started = await pool.query<DeliveryTarget>(
      "select * from email.delivery_start($1,$2,$3,$4,$5)",
      [
        message.jobId,
        message.emailMessageId,
        EMAIL_DELIVERIES_QUEUE,
        delivery.msg_id,
        delivery.read_ct,
      ],
    );
    const target = started.rows[0];
    if (target === undefined || target.action === "MISSING") {
      await poison(pool, delivery, "EMAIL_JOB_NOT_FOUND");
      summary.deadLettered += 1;
      continue;
    }
    if (target.action !== "SEND") {
      await complete(pool, delivery, message);
      if (target.action === "DONE") summary.duplicates += 1;
      else summary.skipped += 1;
      continue;
    }
    try {
      await send(pool, dependencies, message, target, delivery.read_ct);
      await complete(pool, delivery, message);
      summary.sent += 1;
    } catch (error) {
      const code = deliveryFailureCode(error);
      const failed = await pool.query<{ outcome: string }>(
        "select infra.fail_job($1,$2,$3,$4,$5) as outcome",
        [
          EMAIL_DELIVERIES_QUEUE,
          delivery.msg_id,
          JSON.stringify(delivery.message),
          isPermanent(error) ? POISON_ATTEMPT : delivery.read_ct,
          code,
        ],
      );
      const result = failed.rows[0]?.outcome ?? "retry_scheduled";
      await pool.query("select email.delivery_record_failure($1,$2,$3,$4,$5)", [
        message.jobId,
        message.emailMessageId,
        code,
        delivery.read_ct,
        result === "dead_lettered",
      ]);
      await pool.query("select infra.job_finish($1,$2,$3)", [message.jobId, result, code]);
      if (result === "dead_lettered") summary.deadLettered += 1;
      else summary.retried += 1;
    }
  }
  return summary;
}

async function send(
  pool: Pool,
  { provider, baseUrl }: EmailDeliveryDependencies,
  message: EmailDeliveryMessage,
  target: DeliveryTarget,
  attempt: number,
): Promise<void> {
  const address = target.recipient_address;
  if (!address) throw new EmailTemplateError();
  const rendered = renderEmail(
    target.template_key ?? "",
    target.template_version ?? 0,
    target.variables,
    {
      baseUrl,
      timeZone: target.time_zone ?? "UTC",
    },
  );
  const accepted = await provider.send({
    idempotencyKey: message.emailMessageId,
    to: address,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    tags: {
      emailMessageId: message.emailMessageId,
      template: `${target.template_key}@${target.template_version}`,
    },
  });
  await pool.query("select email.delivery_record_sent($1,$2,$3,$4,$5,$6)", [
    message.jobId,
    message.emailMessageId,
    provider.name,
    accepted.providerMessageId,
    addressDigest(address),
    attempt,
  ]);
}

async function complete(
  pool: Pool,
  delivery: QueueMessage,
  message: EmailDeliveryMessage,
): Promise<void> {
  await pool.query("select infra.ack_message($1,$2)", [EMAIL_DELIVERIES_QUEUE, delivery.msg_id]);
  await pool.query("select infra.job_finish($1,'succeeded',null)", [message.jobId]);
}

async function poison(pool: Pool, delivery: QueueMessage, code: string): Promise<void> {
  await pool.query("select infra.fail_job($1,$2,$3,$4,$5)", [
    EMAIL_DELIVERIES_QUEUE,
    delivery.msg_id,
    JSON.stringify(delivery.message ?? null),
    POISON_ATTEMPT,
    code,
  ]);
  await pool.query("select infra.job_record_poison($1,$2,$3)", [
    EMAIL_DELIVERIES_QUEUE,
    delivery.msg_id,
    code,
  ]);
}
