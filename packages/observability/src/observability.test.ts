import { describe, expect, it } from "vitest";

import {
  buildHealthReport,
  createLogRecord,
  pseudonymizeIdentifier,
  redactSignedUrl,
  sanitizeLogAttributes,
  startTelemetry,
} from "./index.js";

describe("structured observability", () => {
  it("creates a UTC record with correlation", () => {
    const record = createLogRecord(
      {
        level: "info",
        service: "api",
        environment: "test",
        module: "platform",
        outcome: "success",
        correlationId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
      },
      new Date("2026-08-19T12:00:00.000Z"),
    );
    expect(record.timestamp).toBe("2026-08-19T12:00:00.000Z");
  });

  it("pseudonymizes identifiers deterministically", () => {
    const first = pseudonymizeIdentifier("user-1", "test-salt");
    expect(first).toHaveLength(16);
    expect(first).toBe(pseudonymizeIdentifier("user-1", "test-salt"));
    expect(first).not.toContain("user-1");
  });

  it("removes secrets and personal fields from log attributes", () => {
    expect(
      sanitizeLogAttributes({
        authorization: "Bearer secret-token",
        email: "persona@example.test",
        nested: {
          metadata: [{ phone: "+52 5555555555", status: "ready" }],
          refreshToken: "nested-secret",
        },
        route: "/v1/health",
        safeText: "request used Bearer hidden-token",
      }),
    ).toEqual({
      nested: { metadata: [{ status: "ready" }] },
      route: "/v1/health",
      safeText: "request used [REDACTED]",
    });
  });

  it("redacts tokens of signed storage URLs in log attributes", () => {
    const url =
      "https://p.supabase.co/storage/v1/object/upload/sign/quarantine/a/b/v1/c?token=eyJhbGciOi.secret";
    expect(redactSignedUrl(url)).toBe(
      "https://p.supabase.co/storage/v1/object/upload/sign/quarantine/a/b/v1/c?token=[REDACTED]",
    );
    expect(
      sanitizeLogAttributes({ target: "https://s3.example/x?X-Amz-Signature=abc&X-Amz-Date=1" }),
    ).toEqual({ target: "https://s3.example/x?X-Amz-Signature=[REDACTED]&X-Amz-Date=1" });
  });

  it("reports degraded readiness without leaking probe errors", async () => {
    const report = await buildHealthReport("worker", [
      () => ({ name: "runtime", status: "ok" }),
      () => {
        throw new Error("connection secret");
      },
    ]);
    expect(report.status).toBe("degraded");
    expect(JSON.stringify(report)).not.toContain("connection secret");
  });

  it("keeps telemetry disabled without contacting a collector", async () => {
    const runtime = startTelemetry({
      enabled: false,
      endpoint: undefined,
      environment: "test",
      serviceName: "test-service",
    });
    expect(runtime.enabled).toBe(false);
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });
});
