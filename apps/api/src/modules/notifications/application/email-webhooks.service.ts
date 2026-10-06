import { createHash, randomUUID } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import type { IntegrationTracer } from "@ice24/observability";
import {
  INTEGRATION_TRACER,
  metricsOnlyTracer,
} from "../../../common/integrations/integration-tracer.js";
import type { EmailProviderEventOutcome } from "@ice24/contracts";
import type { EmailWebhookVerifier } from "./email-tracking.port.js";
import {
  EMAIL_WEBHOOK_VERIFIER,
  EmailProviderEventConflict,
  EmailTrackingPort,
  InvalidEmailWebhookSignature,
} from "./email-tracking.port.js";
import { NotificationApiError } from "./notifications.service.js";

/** Tracking payloads are small; anything larger is rejected before verification. */
export const MAX_EMAIL_WEBHOOK_BYTES = 256 * 1024;

/**
 * F5-12 technical tracking: verified delivery and bounce events move email messages to
 * DELIVERED or BOUNCED. The signature replaces user authentication on this endpoint only.
 * Every event is stored before it is applied (idempotent by provider + event id), so a
 * repeated delivery answers 200 without repeating the effect and an event that arrives before
 * the send is recorded is applied later. Without an approved provider the endpoint fails
 * closed with 503.
 */
@Injectable()
export class EmailWebhooksService {
  constructor(
    @Inject(EMAIL_WEBHOOK_VERIFIER) private readonly verifier: EmailWebhookVerifier | null,
    @Inject(EmailTrackingPort) private readonly tracking: EmailTrackingPort,
    @Optional()
    @Inject(INTEGRATION_TRACER)
    private readonly tracer: IntegrationTracer = metricsOnlyTracer(),
  ) {}

  /** F5-14: one inbound `email` log per tracking event, in the correlation of its message. */
  private async inbound(
    provider: string,
    event: { providerEventId: string; providerMessageId: string; type: string },
    requestCorrelationId: string,
    started: number,
    outcome: string | null,
  ): Promise<void> {
    const origin = await this.tracking.origin(event.providerMessageId).catch(() => null);
    await this.tracer.record({
      integration: "email",
      direction: "INBOUND",
      operation: "webhook.receive",
      provider,
      effectKey: `${provider}:${event.providerEventId}`,
      details: { eventType: event.type, outcome },
      context: {
        correlationId: origin?.correlationId ?? requestCorrelationId,
        requestCorrelationId,
        accountId: origin?.accountId ?? null,
      },
      status: outcome === null ? "FAILED" : "SUCCEEDED",
      latencyMs: performance.now() - started,
      responseCode: outcome === null ? 503 : 200,
      errorCode: outcome === null ? "EMAIL_TRACKING_FAILED" : null,
    });
  }

  async receive(
    rawBody: Uint8Array | undefined,
    headers: Readonly<Record<string, string | undefined>>,
    correlationId: string = randomUUID(),
  ): Promise<{ received: true; outcomes: EmailProviderEventOutcome[] }> {
    if (this.verifier === null) throw new NotificationApiError(503, "DEPENDENCY_UNAVAILABLE");
    if (!rawBody || rawBody.byteLength === 0 || rawBody.byteLength > MAX_EMAIL_WEBHOOK_BYTES)
      throw new NotificationApiError(400, "VALIDATION_FAILED");
    let events;
    try {
      events = this.verifier.verify(rawBody, headers);
    } catch (error) {
      if (error instanceof InvalidEmailWebhookSignature)
        throw new NotificationApiError(400, "INVALID_WEBHOOK_SIGNATURE");
      throw new NotificationApiError(400, "VALIDATION_FAILED");
    }
    const outcomes: EmailProviderEventOutcome[] = [];
    for (const event of events) {
      // Digest per normalized event: identical redeliveries match, altered content conflicts.
      const digest = createHash("sha256").update(JSON.stringify(event)).digest("hex");
      const started = performance.now();
      try {
        const outcome = await this.tracking.record(
          this.verifier.provider,
          event,
          digest,
          correlationId,
        );
        outcomes.push(outcome);
        await this.inbound(this.verifier.provider, event, correlationId, started, outcome);
      } catch (error) {
        if (error instanceof EmailProviderEventConflict)
          throw new NotificationApiError(409, "CONFLICT");
        await this.inbound(this.verifier.provider, event, correlationId, started, null);
        throw new NotificationApiError(503, "DEPENDENCY_UNAVAILABLE");
      }
    }
    return { received: true, outcomes };
  }
}
