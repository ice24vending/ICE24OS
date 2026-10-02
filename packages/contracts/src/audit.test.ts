import { describe, expect, it } from "vitest";
import { auditEventInputSchema } from "./audit.js";
const randomUUID = () => "11111111-1111-4111-8111-111111111111";

export const auditFixture = () => ({
  eventVersion: 1 as const,
  occurredAt: "2026-10-02T12:00:00.123456Z",
  timeZone: "America/Mexico_City",
  actorUserId: null,
  actorType: "SYSTEM" as const,
  contextSessionId: null,
  accountId: null,
  branchId: null,
  machineId: null,
  entityType: "SyntheticEntity",
  entityId: randomUUID(),
  operation: "SyntheticEventCreated",
  previousValues: null,
  newValues: { status: "ACTIVE" },
  reason: null,
  origin: "WORKER" as const,
  ipAddress: null,
  deviceSummary: null,
  result: "SUCCESS" as const,
  correlationId: randomUUID(),
});
describe("audit v1 contract", () => {
  it("accepts system events without fabricated identities", () => {
    expect(auditEventInputSchema.parse(auditFixture()).actorUserId).toBeNull();
  });
  it("rejects fake IPs, zones, actor combinations and nested request bodies", () => {
    for (const patch of [
      { ipAddress: "not-an-ip" },
      { timeZone: "invalid" },
      { actorType: "USER" },
      { actorUserId: randomUUID() },
      { newValues: { request: { headers: {} } } },
    ]) {
      expect(auditEventInputSchema.safeParse({ ...auditFixture(), ...patch }).success).toBe(false);
    }
  });
});
