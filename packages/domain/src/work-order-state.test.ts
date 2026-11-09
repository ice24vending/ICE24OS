import { describe, it, expect } from "vitest";
import {
  evaluateWorkOrderTransition,
  workOrderTransitions,
  workOrderStates,
  type WorkOrderFacts,
  type WorkOrderAction,
} from "./work-order-state.js";
const facts: WorkOrderFacts = {
  state: "scheduled",
  version: 2,
  expectedVersion: 2,
  permitted: true,
  assignedToActor: true,
  assigneeActive: true,
  now: 100,
  alertAt: 50,
  dueAt: 150,
  reason: "Inspección documentada",
  executionComplete: true,
  evidenceComplete: true,
  result: "conforming",
  followupRecorded: true,
  correctionRecorded: true,
  cancellationRecorded: true,
  reopeningRecorded: true,
};
describe("F7-04 explicit state machine", () => {
  for (const t of workOrderTransitions)
    it(`${t.from} → ${t.to} requires its guard`, () => {
      const input = {
        ...facts,
        state: t.from,
        now: t.action === "expire" ? 200 : 100,
        result:
          t.action === "observe"
            ? ("observations" as const)
            : t.action === "reject"
              ? ("nonconforming" as const)
              : ("conforming" as const),
      };
      expect(evaluateWorkOrderTransition(t.action, input)).toEqual({ allowed: true, state: t.to });
      expect(evaluateWorkOrderTransition(t.action, { ...input, expectedVersion: 1 })).toMatchObject(
        { allowed: false, code: "CONFLICT" },
      );
      expect(evaluateWorkOrderTransition(t.action, { ...input, permitted: false })).toMatchObject({
        allowed: false,
        code: "FORBIDDEN",
      });
    });
  const actions = [...new Set(workOrderTransitions.map((t) => t.action))];
  for (const state of workOrderStates)
    for (const action of actions)
      if (!workOrderTransitions.some((t) => t.from === state && t.action === action))
        it(`rejects ${state}/${action}`, () =>
          expect(evaluateWorkOrderTransition(action, { ...facts, state })).toMatchObject({
            allowed: false,
            code: "CONFLICT",
          }));
  it.each(["complete", "observe", "reject"] as WorkOrderAction[])(
    "blocks %s without execution or evidence",
    (action) => {
      expect(
        evaluateWorkOrderTransition(action, {
          ...facts,
          state: "in_progress",
          executionComplete: false,
        }),
      ).toMatchObject({ allowed: false });
      expect(
        evaluateWorkOrderTransition(action, {
          ...facts,
          state: "in_progress",
          evidenceComplete: false,
        }),
      ).toMatchObject({ allowed: false });
    },
  );
  it("rejects another technician or revoked assignee", () => {
    expect(
      evaluateWorkOrderTransition("start", { ...facts, assignedToActor: false }),
    ).toMatchObject({ allowed: false });
    expect(evaluateWorkOrderTransition("start", { ...facts, assigneeActive: false })).toMatchObject(
      { allowed: false },
    );
  });
  it("checks exact temporal boundaries and missing dates", () => {
    expect(evaluateWorkOrderTransition("notify", { ...facts, now: 49 })).toMatchObject({
      allowed: false,
    });
    expect(evaluateWorkOrderTransition("notify", { ...facts, now: 150 })).toMatchObject({
      allowed: false,
    });
    expect(evaluateWorkOrderTransition("expire", { ...facts, now: 149 })).toMatchObject({
      allowed: false,
    });
    expect(evaluateWorkOrderTransition("expire", { ...facts, now: 150 })).toMatchObject({
      allowed: true,
    });
    expect(evaluateWorkOrderTransition("expire", { ...facts, dueAt: null })).toMatchObject({
      allowed: false,
    });
  });
  it.each(["observe", "reject", "correct", "cancel", "reopen"] as WorkOrderAction[])(
    "requires a reason for %s",
    (action) =>
      expect(
        evaluateWorkOrderTransition(action, {
          ...facts,
          state: ["correct", "cancel", "reopen"].includes(action) ? "completed" : "in_progress",
          reason: "",
        }),
      ).toMatchObject({ allowed: false }),
  );
  it("requires a recorded reopening and allows the reviewer rather than the assigned technician", () => {
    expect(
      evaluateWorkOrderTransition("reopen", {
        ...facts,
        state: "completed",
        assignedToActor: false,
      }),
    ).toMatchObject({ allowed: true, state: "in_progress" });
    expect(
      evaluateWorkOrderTransition("reopen", {
        ...facts,
        state: "completed",
        reopeningRecorded: false,
      }),
    ).toMatchObject({ allowed: false });
  });
  it("allows an authorized conflict reviewer to close without impersonating the assignee", () => {
    const resolution = {
      ...facts,
      state: "in_progress" as const,
      permitted: false,
      assignedToActor: false,
      conflictResolutionAuthorized: true,
    };
    expect(evaluateWorkOrderTransition("complete", resolution)).toMatchObject({ allowed: true });
    expect(
      evaluateWorkOrderTransition("complete", {
        ...resolution,
        conflictResolutionAuthorized: false,
      }),
    ).toMatchObject({ code: "FORBIDDEN" });
    expect(
      evaluateWorkOrderTransition("complete", { ...resolution, evidenceComplete: false }),
    ).toMatchObject({ allowed: false });
  });
  it("requires followup, matching outcome and versioned review", () => {
    expect(
      evaluateWorkOrderTransition("observe", {
        ...facts,
        state: "in_progress",
        result: "observations",
        followupRecorded: false,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluateWorkOrderTransition("complete", {
        ...facts,
        state: "in_progress",
        result: "nonconforming",
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluateWorkOrderTransition("correct", {
        ...facts,
        state: "completed",
        correctionRecorded: false,
      }),
    ).toMatchObject({ allowed: false });
    expect(
      evaluateWorkOrderTransition("cancel", {
        ...facts,
        state: "completed",
        cancellationRecorded: false,
        reopeningRecorded: false,
      }),
    ).toMatchObject({ allowed: false });
  });
});
