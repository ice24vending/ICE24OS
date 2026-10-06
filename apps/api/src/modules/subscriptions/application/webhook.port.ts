import type { Subscription } from "@ice24/contracts";
import type { VerifiedSubscriptionEvent } from "./subscription.gateway.js";

export interface WebhookTransaction {
  readonly event: VerifiedSubscriptionEvent;
  readonly now: string;
  readonly correlationId: string;
  resolveAccount(): Promise<Subscription>;
  save(next: Subscription, previous: Subscription): Promise<void>;
}
/** Durable receipt: the first delivery's correlation is kept for every redelivery. */
export interface WebhookReceipt {
  readonly correlationId: string;
  readonly deliveries: number;
}
export abstract class WebhookPort {
  abstract receive(
    event: VerifiedSubscriptionEvent,
    digest: string,
    correlationId: string,
    rawBody: Uint8Array,
  ): Promise<WebhookReceipt>;
  abstract process(
    eventId: string,
    work: (tx: WebhookTransaction) => Promise<"APPLIED" | "IGNORED">,
  ): Promise<void>;
}
