import type { Pool, PoolClient } from "pg";
import {
  consumerFailureCodeSchema,
  consumerNameSchema,
  outboxMessageSchema,
  type DomainEventBatchSummary,
  type OutboxMessage,
} from "@ice24/contracts";

export const DOMAIN_EVENTS_QUEUE = "domain_events";
/** Above any queue policy maximum: infra.fail_job routes the message straight to the DLQ. */
const POISON_ATTEMPT = 1_000;

/**
 * A consumer applies its effect using `tx`, the same transaction that records the event as
 * processed. Effects outside PostgreSQL must use their provider's idempotency key with
 * `event.eventId`, because the transaction cannot undo them.
 */
export interface DomainEventConsumer {
  readonly name: string;
  readonly eventTypes: readonly string[] | "*";
  handle(event: OutboxMessage, tx: PoolClient): Promise<void>;
}

/** Throw to report a diagnostic code; any other error is recorded as HANDLER_FAILED. */
export class ConsumerFailure extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "ConsumerFailure";
  }
}

export interface DomainEventOptions {
  readonly queue?: string;
  readonly batchSize?: number;
  readonly visibilitySeconds?: number;
  readonly statementTimeout?: string;
}

export const failureCode = (error: unknown): string => {
  const code = error instanceof ConsumerFailure ? error.code : undefined;
  return code !== undefined && consumerFailureCodeSchema.safeParse(code).success
    ? code
    : "HANDLER_FAILED";
};

export function validateConsumers(consumers: readonly DomainEventConsumer[]): void {
  const names = new Set<string>();
  for (const consumer of consumers) {
    consumerNameSchema.parse(consumer.name);
    if (names.has(consumer.name)) throw new Error(`Duplicate consumer ${consumer.name}`);
    names.add(consumer.name);
  }
}

const subscribed = (consumer: DomainEventConsumer, type: string): boolean =>
  consumer.eventTypes === "*" || consumer.eventTypes.includes(type);

interface QueueMessage {
  msg_id: string;
  read_ct: number;
  message: unknown;
}

/**
 * Processes one batch from PGMQ. Delivery is at least once:
 * - each consumer claims (consumer, eventId) and applies its effect in one transaction,
 *   so a redelivered event never repeats an effect that already committed;
 * - the message is acknowledged only after every subscribed consumer succeeded;
 * - a failure keeps successful consumers recorded and asks infra.fail_job for an
 *   exponential retry, or moves the message to the DLQ once attempts are exhausted;
 * - invalid messages go to the DLQ immediately.
 */
export async function processDomainEvents(
  pool: Pool,
  consumers: readonly DomainEventConsumer[],
  options: DomainEventOptions = {},
): Promise<DomainEventBatchSummary> {
  validateConsumers(consumers);
  const queue = options.queue ?? DOMAIN_EVENTS_QUEUE;
  const statementTimeout = options.statementTimeout ?? "15s";
  if (!/^[1-9][0-9]{0,5}(ms|s)$/u.test(statementTimeout))
    throw new RangeError("Invalid statement timeout");
  const summary: DomainEventBatchSummary = {
    received: 0,
    processed: 0,
    skipped: 0,
    unhandled: 0,
    retried: 0,
    deadLettered: 0,
  };
  const batch = await pool.query<QueueMessage>(
    "select msg_id, read_ct, message from infra.read_queue($1,$2,$3)",
    [queue, options.visibilitySeconds ?? 60, options.batchSize ?? 20],
  );
  for (const delivery of batch.rows) {
    summary.received += 1;
    const parsed = outboxMessageSchema.safeParse(delivery.message);
    if (!parsed.success) {
      await fail(pool, queue, delivery, POISON_ATTEMPT, "INVALID_MESSAGE");
      summary.deadLettered += 1;
      continue;
    }
    const event = parsed.data;
    const interested = consumers.filter((consumer) => subscribed(consumer, event.type));
    if (interested.length === 0) {
      await pool.query("select infra.ack_message($1,$2)", [queue, delivery.msg_id]);
      summary.unhandled += 1;
      continue;
    }
    let failed: string | undefined;
    let applied = 0;
    for (const consumer of interested) {
      const tx = await pool.connect();
      try {
        await tx.query("begin");
        await tx.query(`set local statement_timeout='${statementTimeout}'`);
        const claim = await tx.query<{ claimed: boolean }>(
          "select infra.claim_message($1,$2,$3,$4,$5,$6) as claimed",
          [consumer.name, event.eventId, event.type, queue, delivery.msg_id, delivery.read_ct],
        );
        if (claim.rows[0]?.claimed === true) {
          await consumer.handle(event, tx);
          applied += 1;
        }
        await tx.query("commit");
      } catch (error) {
        await tx.query("rollback").catch(() => undefined);
        failed = failureCode(error);
        break;
      } finally {
        tx.release();
      }
    }
    if (failed !== undefined) {
      const result = await fail(pool, queue, delivery, delivery.read_ct, failed);
      if (result === "dead_lettered") summary.deadLettered += 1;
      else summary.retried += 1;
      continue;
    }
    await pool.query("select infra.ack_message($1,$2)", [queue, delivery.msg_id]);
    if (applied > 0) summary.processed += 1;
    else summary.skipped += 1;
  }
  return summary;
}

async function fail(
  pool: Pool,
  queue: string,
  delivery: QueueMessage,
  attempt: number,
  code: string,
): Promise<string> {
  const result = await pool.query<{ outcome: string }>(
    "select infra.fail_job($1,$2,$3,$4,$5) as outcome",
    [queue, delivery.msg_id, JSON.stringify(delivery.message ?? null), attempt, code],
  );
  return result.rows[0]?.outcome ?? "retry_scheduled";
}
