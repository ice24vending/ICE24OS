import { describe, expect, it } from "vitest";
import { parseStripeConfig } from "./stripe.js";

const valid = {
  NODE_ENV: "test",
  STRIPE_SECRET_KEY: "sk_test_fixture",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  STRIPE_PRICE_ID: "price_fixture",
  STRIPE_PORTAL_CONFIGURATION_ID: "",
  PRIVATE_WEB_URL: "http://127.0.0.1:3000",
};

describe("Stripe configuration boundary", () => {
  it("accepts test settings and an optional portal configuration", () => {
    expect(parseStripeConfig(valid).STRIPE_PORTAL_CONFIGURATION_ID).toBeUndefined();
    expect(
      parseStripeConfig({ ...valid, STRIPE_SECRET_KEY: "rk_test_fixture" }).STRIPE_SECRET_KEY,
    ).toBe("rk_test_fixture");
  });

  it.each(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID", "PRIVATE_WEB_URL"])(
    "rejects missing %s",
    (field) => {
      expect(() => parseStripeConfig({ ...valid, [field]: "" })).toThrow(field);
    },
  );

  it("rejects mixed live/test environments and accepts production HTTPS", () => {
    expect(() => parseStripeConfig({ ...valid, STRIPE_SECRET_KEY: "sk_live_fixture" })).toThrow();
    expect(() =>
      parseStripeConfig({
        ...valid,
        NODE_ENV: "production",
        PRIVATE_WEB_URL: "https://app.example.test",
      }),
    ).toThrow();
    expect(
      parseStripeConfig({
        ...valid,
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "sk_live_fixture",
        PRIVATE_WEB_URL: "https://app.example.test",
      }).NODE_ENV,
    ).toBe("production");
  });

  it.each([
    "http://external.example.test",
    "https://user:password@app.example.test",
    "https://app.example.test/path",
    "https://app.example.test?redirect=evil",
    "ftp://app.example.test",
  ])("rejects unsafe return origin %s", (origin) => {
    expect(() => parseStripeConfig({ ...valid, PRIVATE_WEB_URL: origin })).toThrow(
      "PRIVATE_WEB_URL",
    );
  });

  it("requires HTTPS in staging and keeps invalid secrets out of errors", () => {
    expect(() => parseStripeConfig({ ...valid, NODE_ENV: "staging" })).toThrow("PRIVATE_WEB_URL");
    const secret = "sensitive-invalid-credential";
    try {
      parseStripeConfig({ ...valid, STRIPE_SECRET_KEY: secret });
      expect.fail("Expected validation failure");
    } catch (error) {
      expect(String(error)).toContain("STRIPE_SECRET_KEY");
      expect(String(error)).not.toContain(secret);
    }
  });
});
