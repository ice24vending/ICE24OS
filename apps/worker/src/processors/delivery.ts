import { withIntegrationContext, type IntegrationTracer } from "@ice24/observability";

/** Result of one queue delivery as seen by its processor. */
export type DeliveryOutcome =
  "succeeded" | "duplicate" | "skipped" | "busy" | "lease_lost" | "retried" | "dead_lettered";

export interface DeliveryMeta {
  readonly queue: string;
  readonly messageId: string;
  readonly attempt: number;
  readonly correlationId: string | null;
  readonly accountId: string | null;
  readonly jobId: string | null;
}

/**
 * F5-14: runs one delivery inside its correlation scope (correlation, account, attempt and job
 * of the message) so every adapter call made by the handler records them, then records the
 * delivery itself as a `queue` integration log. The effect key is queue + message id and the
 * attempt is `read_ct`: a redelivery is a new attempt, never a duplicate row.
 */
export async function observeDelivery(
  tracer: IntegrationTracer | undefined,
  meta: DeliveryMeta,
  work: () => Promise<{ outcome: DeliveryOutcome; errorCode?: string | undefined }>,
): Promise<DeliveryOutcome> {
  const started = performance.now();
  return withIntegrationContext(
    {
      ...(meta.correlationId ? { correlationId: meta.correlationId } : {}),
      accountId: meta.accountId,
      attempt: meta.attempt,
      jobId: meta.jobId,
    },
    async () => {
      const result = await work();
      const failed = result.outcome === "retried" || result.outcome === "dead_lettered";
      await tracer?.record({
        integration: "queue",
        operation: "message.consume",
        provider: "pgmq",
        effectKey: `${meta.queue}:${meta.messageId}`,
        details: { queue: meta.queue, outcome: result.outcome },
        status: failed ? "FAILED" : "SUCCEEDED",
        latencyMs: performance.now() - started,
        errorCode: failed ? (result.errorCode ?? "HANDLER_FAILED") : null,
        retryable: failed ? result.outcome === "retried" : null,
      });
      return result.outcome;
    },
  );
}
