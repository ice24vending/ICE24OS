import { describe, expect, it } from "vitest";

import { parseServiceConfig } from "./index.js";

describe("parseServiceConfig", () => {
  it("normalizes a valid service configuration", () => {
    expect(parseServiceConfig({ PORT: "3001", SERVICE_NAME: "api" })).toEqual({
      HOST: "127.0.0.1",
      NODE_ENV: "development",
      OTEL_ENABLED: false,
      PORT: 3001,
      SERVICE_NAME: "api",
    });
  });

  it("fails fast when required configuration is missing", () => {
    expect(() => parseServiceConfig({ PORT: "3001" })).toThrow();
  });

  it("requires telemetry and platform endpoints only when the environment needs them", () => {
    expect(() =>
      parseServiceConfig({
        NODE_ENV: "production",
        OTEL_ENABLED: "true",
        PORT: "3001",
        SERVICE_NAME: "api",
      }),
    ).toThrow();

    expect(
      parseServiceConfig({
        NODE_ENV: "staging",
        OTEL_ENABLED: "true",
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test",
        PORT: "3001",
        SERVICE_NAME: "api",
        SUPABASE_URL: "https://project.supabase.co",
      }).OTEL_ENABLED,
    ).toBe(true);
  });
});
