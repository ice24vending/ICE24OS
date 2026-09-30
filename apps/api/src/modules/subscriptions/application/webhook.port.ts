import type { Subscription } from "@ice24/contracts";
import type { VerifiedSubscriptionEvent } from "./subscription.gateway.js";

export interface WebhookTransaction {
  readonly event: VerifiedSubscriptionEvent;
  readonly now: string;
  readonly correlationId: string;
  resolveAccount(): Promise<Subscription>;
  save(next: Subscription, previous: Subscription): Promise<void>;
}
export abstract class WebhookPort {
  abstract receive(
    event: VerifiedSubscriptionEvent,
    digest: string,
    correlationId: string,
    rawBody: Uint8Array,
  ): Promise<void>;
  abstract process(
    eventId: string,
    work: (tx: WebhookTransaction) => Promise<"APPLIED" | "IGNORED">,
  ): Promise<void>;
}
