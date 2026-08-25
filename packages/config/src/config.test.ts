import { describe, expect, it } from "vitest";

import { parseServiceConfig } from "./index.js";

describe("parseServiceConfig", () => {
  it("normalizes a valid service configuration", () => {
    expect(parseServiceConfig({ PORT: "3001", SERVICE_NAME: "api" })).toEqual({
      NODE_ENV: "development",
      PORT: 3001,
      SERVICE_NAME: "api",
    });
  });

  it("fails fast when required configuration is missing", () => {
    expect(() => parseServiceConfig({ PORT: "3001" })).toThrow();
  });
});
