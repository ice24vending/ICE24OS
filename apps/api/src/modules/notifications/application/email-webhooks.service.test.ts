import { describe, expect, it } from "vitest";
import type { EmailProviderEvent } from "@ice24/contracts";
import {
  LOCAL_EMAIL_SIGNATURE_HEADER,
  LocalEmailWebhookVerifier,
  emailWebhookVerifierFromEnvironment,
  signLocalEmailWebhook,
} from "../infrastructure/local-email-webhook.verifier.js";
import { EmailProviderEventConflict, EmailTrackingPort } from "./email-tracking.port.js";
import { EmailWebhooksService } from "./email-webhooks.service.js";

const secret = "s".repeat(40);
const now = 1_790_000_000_000;
const event: EmailProviderEvent = {
  providerEventId: "evt_1",
  type: "DELIVERED",
  providerMessageId: "local-abc",
  occurredAt: "2026-10-03T12:00:00Z",
};
const signed = (body: string, timestamp = now / 1000) => ({
  raw: new TextEncoder().encode(body),
  headers: { [LOCAL_EMAIL_SIGNATURE_HEADER]: signLocalEmailWebhook(body, secret, timestamp) },
});

class MemoryTracking extends EmailTrackingPort {
  readonly recorded: { provider: string; event: EmailProviderEvent; digest: string }[] = [];
  conflict = false;
  override async record(provider: string, value: EmailProviderEvent, digest: string) {
    if (this.conflict) throw new EmailProviderEventConflict();
    this.recorded.push({ provider, event: value, digest });
    return "APPLIED" as const;
  }
}

describe("email tracking webhook (F5-12)", () => {
  const verifier = new LocalEmailWebhookVerifier(secret, () => now);

  it("stores verified delivery events with a content digest", async () => {
    const tracking = new MemoryTracking();
    const service = new EmailWebhooksService(verifier, tracking);
    const { raw, headers } = signed(JSON.stringify({ events: [event] }));
    await expect(service.receive(raw, headers)).resolves.toEqual({
      received: true,
      outcomes: ["APPLIED"],
    });
    expect(tracking.recorded).toEqual([
      { provider: "local", event, digest: expect.stringMatching(/^[0-9a-f]{64}$/u) },
    ]);
  });

  it("rejects missing, tampered, stale or foreign-secret signatures with 400", async () => {
    const service = new EmailWebhooksService(verifier, new MemoryTracking());
    const body = JSON.stringify({ events: [event] });
    const valid = signed(body);
    const cases = [
      { raw: valid.raw, headers: {} },
      {
        raw: new TextEncoder().encode(body.replace("DELIVERED", "BOUNCED")),
        headers: valid.headers,
      },
      signed(body, now / 1000 - 301),
      {
        raw: valid.raw,
        headers: {
          [LOCAL_EMAIL_SIGNATURE_HEADER]: signLocalEmailWebhook(body, "x".repeat(40), now / 1000),
        },
      },
    ];
    for (const { raw, headers } of cases)
      await expect(service.receive(raw, headers)).rejects.toMatchObject({
        code: "INVALID_WEBHOOK_SIGNATURE",
      });
  });

  it("refuses opens/clicks, unknown fields and oversize bodies as validation errors", async () => {
    const service = new EmailWebhooksService(verifier, new MemoryTracking());
    for (const body of [
      JSON.stringify({ events: [{ ...event, type: "OPENED" }] }),
      JSON.stringify({ events: [{ ...event, recipient: "a@b.io" }] }),
      JSON.stringify({ events: [] }),
    ]) {
      const { raw, headers } = signed(body);
      await expect(service.receive(raw, headers)).rejects.toMatchObject({
        code: "VALIDATION_FAILED",
      });
    }
    await expect(
      service.receive(new Uint8Array(256 * 1024 + 1), signed("{}").headers),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("maps a reused event id with other content to 409 and fails closed without provider", async () => {
    const tracking = new MemoryTracking();
    tracking.conflict = true;
    const { raw, headers } = signed(JSON.stringify({ events: [event] }));
    await expect(
      new EmailWebhooksService(verifier, tracking).receive(raw, headers),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      new EmailWebhooksService(null, new MemoryTracking()).receive(raw, headers),
    ).rejects.toMatchObject({ code: "DEPENDENCY_UNAVAILABLE" });
  });

  it("only enables the local verifier in development or test with a strong secret", () => {
    const local = { EMAIL_WEBHOOK_PROVIDER: "local", EMAIL_WEBHOOK_SECRET: secret };
    expect(emailWebhookVerifierFromEnvironment({ ...local, NODE_ENV: "test" })).not.toBeNull();
    expect(emailWebhookVerifierFromEnvironment({ ...local, NODE_ENV: "production" })).toBeNull();
    expect(
      emailWebhookVerifierFromEnvironment({
        ...local,
        EMAIL_WEBHOOK_SECRET: "short",
        NODE_ENV: "test",
      }),
    ).toBeNull();
  });
});
