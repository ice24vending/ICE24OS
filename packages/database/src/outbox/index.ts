import {
  outboxEventInputSchema,
  outboxPublishSummarySchema,
  outboxStatusSchema,
  type OutboxEventInput,
  type OutboxPublishSummary,
  type OutboxStatus,
} from "@ice24/contracts";

/** Minimal client surface shared by `pg` Pool and PoolClient; no driver is bundled here. */
export interface SqlClient {
  query<Row = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[] }>;
}

const columns = [
  "event_type",
  "event_version",
  "aggregate_type",
  "aggregate_id",
  "aggregate_version",
  "account_id",
  "actor_type",
  "actor_user_id",
  "context_session_id",
  "payload",
  "sensitivity",
  "causation_id",
  "correlation_id",
  "occurred_at",
] as const;

/**
 * Records a domain event in infra.outbox_events using the caller's transaction client.
 * The caller owns BEGIN/COMMIT: the event exists only if the business change commits.
 */
export async function appendOutboxEvent(
  client: SqlClient,
  input: OutboxEventInput,
): Promise<string> {
  const event = outboxEventInputSchema.parse(input);
  const values: unknown[] = [
    event.type,
    event.eventVersion,
    event.aggregateType,
    event.aggregateId,
    event.aggregateVersion,
    event.accountId,
    event.actor.type,
    event.actor.userId,
    event.contextSessionId,
    JSON.stringify(event.payload),
    event.sensitivity,
    event.causationId,
    event.correlationId,
    event.occurredAt,
  ];
  const names: string[] = [...columns];
  if (event.id !== undefined) {
    names.unshift("id");
    values.unshift(event.id);
  }
  // A retried producer with the same event id is a no-op instead of a duplicate.
  const result = await client.query<{ id: string }>(
    `insert into infra.outbox_events(${names.join(",")})
     values(${names.map((_, index) => `$${index + 1}`).join(",")})
     on conflict (id) do nothing returning id`,
    values,
  );
  const id = result.rows[0]?.id ?? event.id;
  if (id === undefined) throw new Error("Outbox insert returned no event id");
  return id;
}

/** Publishes a bounded batch; sending and marking happen in one database transaction. */
export async function publishOutbox(client: SqlClient, limit = 100): Promise<OutboxPublishSummary> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw new RangeError("Outbox publish limit must be between 1 and 500");
  const result = await client.query<{ published: number; failed: number; pending: string }>(
    "select published, failed, pending from infra.publish_outbox($1)",
    [limit],
  );
  const row = result.rows[0];
  return outboxPublishSummarySchema.parse({
    published: row?.published ?? 0,
    failed: row?.failed ?? 0,
    pending: Number(row?.pending ?? 0),
  });
}

/** Snapshot for health checks and the jobs center; null ages mean nothing is pending. */
export async function readOutboxStatus(client: SqlClient): Promise<OutboxStatus> {
  const result = await client.query<{
    pending: string;
    failing: string;
    max_attempts: number | null;
    oldest_pending_seconds: string | null;
  }>("select pending, failing, max_attempts, oldest_pending_seconds from infra.outbox_status");
  const row = result.rows[0];
  return outboxStatusSchema.parse({
    pending: Number(row?.pending ?? 0),
    failing: Number(row?.failing ?? 0),
    maxAttempts: row?.max_attempts ?? null,
    oldestPendingSeconds:
      row?.oldest_pending_seconds === null || row?.oldest_pending_seconds === undefined
        ? null
        : Math.max(0, Number(row.oldest_pending_seconds)),
  });
}
