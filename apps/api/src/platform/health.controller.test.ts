import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("returns the normalized API health contract", () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toMatchObject({ service: "api", status: "ok" });
    expect(controller.getLiveness().checks).toEqual([{ name: "process", status: "ok" }]);
    expect(controller.getReadiness().checks).toHaveLength(2);
  });
});
