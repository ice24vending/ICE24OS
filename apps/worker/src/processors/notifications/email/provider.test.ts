import { describe, expect, it } from "vitest";
import {
  EmailProviderError,
  LocalEmailProvider,
  emailLinkBaseFromEnvironment,
  emailProviderFromEnvironment,
} from "./provider.js";

const email = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  to: "owner@example.test",
  subject: "s",
  text: "t",
  html: "<p>t</p>",
  tags: {},
};

describe("email provider port (F5-12)", () => {
  it("local double deduplicates by idempotency key and can simulate failures", async () => {
    const provider = new LocalEmailProvider();
    const first = await provider.send(email);
    const again = await provider.send(email);
    expect(again.providerMessageId).toBe(first.providerMessageId);
    expect(provider.outbox).toHaveLength(1);
    expect(provider.calls).toBe(2);
    provider.failWith("PROVIDER_UNAVAILABLE");
    await expect(provider.send({ ...email, idempotencyKey: "other-key-1" })).rejects.toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      permanent: false,
    });
    expect(new EmailProviderError("PROVIDER_REJECTED").permanent).toBe(true);
  });

  it("never selects a provider that has not been approved", () => {
    expect(
      emailProviderFromEnvironment({ EMAIL_PROVIDER: "local", NODE_ENV: "test" }),
    ).toMatchObject({ provider: { name: "local" } });
    expect(
      emailProviderFromEnvironment({ EMAIL_PROVIDER: "local", NODE_ENV: "production" }),
    ).toEqual({ provider: null, reason: "LOCAL_EMAIL_PROVIDER_FORBIDDEN" });
    expect(
      emailProviderFromEnvironment({ EMAIL_PROVIDER: "resend", NODE_ENV: "production" }),
    ).toEqual({ provider: null, reason: "EMAIL_PROVIDER_PENDING_DECISION" });
    expect(emailProviderFromEnvironment({ NODE_ENV: "production" })).toEqual({
      provider: null,
      reason: "EMAIL_PROVIDER_NOT_CONFIGURED",
    });
  });

  it("builds links only from a clean application origin, HTTPS outside development", () => {
    expect(
      emailLinkBaseFromEnvironment({
        PRIVATE_WEB_URL: "https://app.ice24.mx/x",
        NODE_ENV: "production",
      }),
    ).toBe("https://app.ice24.mx");
    expect(
      emailLinkBaseFromEnvironment({
        PRIVATE_WEB_URL: "http://app.ice24.mx",
        NODE_ENV: "production",
      }),
    ).toBeNull();
    expect(
      emailLinkBaseFromEnvironment({ PRIVATE_WEB_URL: "http://127.0.0.1:3000", NODE_ENV: "test" }),
    ).toBe("http://127.0.0.1:3000");
    expect(
      emailLinkBaseFromEnvironment({
        PRIVATE_WEB_URL: "https://u:p@app.ice24.mx",
        NODE_ENV: "test",
      }),
    ).toBeNull();
    expect(emailLinkBaseFromEnvironment({ NODE_ENV: "test" })).toBeNull();
  });
});
