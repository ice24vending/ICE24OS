import { expect, it } from "vitest";
import { conflictExecution, conflictFields, conflictResolutionSchema } from "./conflicts.js";
const execution = {
  checklist: [],
  fields: { pressure: 2 },
  diagnosis: "local",
  activitiesPerformed: "service",
  parts: [],
  tests: "tested",
  recommendation: "review",
  evidence: [],
  result: "conforming" as const,
  followup: "",
};
const conflict = {
  local: { execution },
  server: { execution: { ...execution, diagnosis: "server" } },
  current: { execution: { ...execution, diagnosis: "current" } },
};
it("selects explicit field sources without mutating either original snapshot", () => {
  const original = JSON.stringify(conflict);
  const choices = Object.fromEntries(
    conflictFields.map((f) => [f, f === "diagnosis" ? "server" : "local"]),
  ) as Record<(typeof conflictFields)[number], "server" | "local">;
  expect(
    conflictExecution(conflict, {
      strategy: "combine",
      choices,
      reason: "Verified",
      confirmed: true,
    }).diagnosis,
  ).toBe("current");
  expect(JSON.stringify(conflict)).toBe(original);
});
it("requires motive and explicit confirmation; no automatic winning version", () => {
  expect(
    conflictResolutionSchema.safeParse({ strategy: "local", reason: "", confirmed: true }).success,
  ).toBe(false);
  expect(
    conflictResolutionSchema.safeParse({ strategy: "local", reason: "Verified", confirmed: false })
      .success,
  ).toBe(false);
  expect(() =>
    conflictExecution(
      { local: conflict.local, server: conflict.server },
      { strategy: "combine", reason: "Verified", confirmed: true },
    ),
  ).toThrow();
});
