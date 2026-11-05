import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import { workOrderStateDiagram, workOrderStates } from "../packages/domain/src/work-order-state";
import { workOrderStateSchema } from "../packages/contracts/src/private/maintenance/work-orders";
it("keeps the documented diagram and HTTP states identical to domain", () => {
  const doc = readFileSync(
    new URL("../docs/modules/maintenance.md", import.meta.url),
    "utf8",
  ).replaceAll("\r\n", "\n");
  expect(doc).toContain("```mermaid\n" + workOrderStateDiagram() + "\n```");
  expect(workOrderStateSchema.options).toEqual(workOrderStates);
});
