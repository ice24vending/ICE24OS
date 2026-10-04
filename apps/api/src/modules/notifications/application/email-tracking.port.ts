import type { EmailProviderEvent, EmailProviderEventOutcome } from "@ice24/contracts";

/**
 * Verifies a provider tracking webhook and returns its normalized delivery/bounce events.
 * Each provider adapter owns its signature scheme; it must reject unsigned, tampered or stale
 * requests with `InvalidEmailWebhookSignature` and ignore opens, clicks and other tracking.
 */
export abstract class EmailWebhookVerifier {
  abstract readonly provider: string;
  abstract verify(
    rawBody: Uint8Array,
    headers: Readonly<Record<string, string | undefined>>,
  ): EmailProviderEvent[];
}

export class InvalidEmailWebhookSignature extends Error {
  constructor() {
    super("INVALID_WEBHOOK_SIGNATURE");
    this.name = "InvalidEmailWebhookSignature";
  }
}

/** The same provider event id was received with different content. */
export class EmailProviderEventConflict extends Error {
  constructor() {
    super("CONFLICT");
    this.name = "EmailProviderEventConflict";
  }
}

export abstract class EmailTrackingPort {
  abstract record(
    provider: string,
    event: EmailProviderEvent,
    payloadSha256: string,
    correlationId: string,
  ): Promise<EmailProviderEventOutcome>;
}

/** Injection token for the configured verifier; `null` when no provider is approved yet. */
export const EMAIL_WEBHOOK_VERIFIER = Symbol("EMAIL_WEBHOOK_VERIFIER");
