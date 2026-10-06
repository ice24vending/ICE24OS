import { describe, expect, it } from "vitest";

import { resolveCorrelationId } from "./correlation.middleware.js";

describe("resolveCorrelationId", () => {
  it("preserves a valid caller correlation ID", () => {
    const id = "018fc248-74fb-7cc5-bf6f-4dd80ac7b102";
    expect(resolveCorrelationId(id)).toBe(id);
  });

  it("replaces malformed input", () => {
    expect(resolveCorrelationId("not-an-id")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("CorrelationMiddleware (F5-14)", () => {
  it("opens the integration scope of the request so adapters send and record its correlation", async () => {
    const { CorrelationMiddleware } = await import("./correlation.middleware.js");
    const { correlationHeaders, currentIntegrationContext } = await import("@ice24/observability");
    const id = "018fc248-74fb-7cc5-bf6f-4dd80ac7b102";
    const headers: Record<string, string> = {};
    let seen: Record<string, string> = {};
    new CorrelationMiddleware().use(
      { headers: { "x-correlation-id": id } },
      { setHeader: (name, value) => void (headers[name] = value), once: () => undefined },
      () => {
        seen = correlationHeaders();
      },
    );
    expect(headers["x-correlation-id"]).toBe(id);
    expect(seen).toEqual({ "x-correlation-id": id });
    expect(currentIntegrationContext()).toEqual({});
  });
});
