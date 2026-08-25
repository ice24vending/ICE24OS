import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns the normalized API health contract", () => {
    expect(new HealthController().getHealth()).toMatchObject({ service: "api", status: "ok" });
  });
});
