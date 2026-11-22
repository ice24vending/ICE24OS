import { expect, it } from "vitest";
import { scheduledActivitySchema } from "./index.js";
it("keeps criticality optional and only accepts real domain priorities", () => {
  const field = scheduledActivitySchema.shape.criticality;
  expect(field.parse(undefined)).toBeUndefined();
  for (const value of ["low", "medium", "high", "critical"]) expect(field.parse(value)).toBe(value);
  expect(field.safeParse("overdue").success).toBe(false);
});
