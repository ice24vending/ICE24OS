import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { integrationLogQuerySchema } from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { integrationLogsWhere } from "../infrastructure/integration-logs.database.js";
import { IntegrationLogsService } from "./integration-logs.service.js";
import type { IntegrationLogsPort } from "./integration-logs.port.js";

const account = randomUUID();
function subject(codes: string[], patch: Partial<AuthorizationSubject> = {}): AuthorizationSubject {
  return {
    userId: randomUUID(),
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "ACTIVE",
    assuranceLevel: "aal2",
    permissions: codes.map((code) => ({ code, effect: "ALLOW", classification: "RESTRICTED" })),
    accountWide: true,
    branchIds: new Set(),
    machineIds: new Set(),
    ...patch,
  };
}
const request = (authorizationSubject?: AuthorizationSubject) =>
  ({ authorizationSubject }) as unknown as SecurityRequest;
const port = () => {
  const list = vi.fn<IntegrationLogsPort["list"]>(async () => ({
    items: [],
    page: { hasMore: false, nextCursor: null },
  }));
  return { list, logs: { list } as unknown as IntegrationLogsPort };
};

describe("integration log diagnosis (F5-14)", () => {
  it("requires the permission, MFA and an active context", async () => {
    const { logs, list } = port();
    const service = new IntegrationLogsService(logs);
    for (const denied of [
      undefined,
      subject([]),
      subject(["jobs.admin-read"]),
      subject(["integration-logs.read"], { assuranceLevel: "aal1" }),
      subject(["integration-logs.read"], { contextActive: false }),
    ])
      expect(() => service.list(request(denied), {}), String(denied?.assuranceLevel)).toThrow();
    expect(list).not.toHaveBeenCalled();
  });

  it("reads every account only with account-wide scope; otherwise only the active account", async () => {
    const { logs, list } = port();
    const service = new IntegrationLogsService(logs);
    await service.list(request(subject(["integration-logs.read"])), { limit: "10" });
    await service.list(request(subject(["integration-logs.read"], { accountWide: false })), {
      accountId: randomUUID(),
    });
    expect(list.mock.calls[0]?.[0]).toEqual({ accountId: null });
    expect(list.mock.calls[0]?.[1]).toMatchObject({ limit: 10 });
    expect(list.mock.calls[1]?.[0]).toEqual({ accountId: account });
  });

  it("validates filters and never lets a filter widen the scope", () => {
    expect(() => integrationLogQuerySchema.parse({ integration: "maps" })).toThrow();
    expect(() => integrationLogQuerySchema.parse({ correlationId: "abc" })).toThrow();
    expect(() => integrationLogQuerySchema.parse({ extra: "1" })).toThrow();
    const correlation = randomUUID();
    const other = randomUUID();
    const scoped = integrationLogsWhere(
      { accountId: account },
      integrationLogQuerySchema.parse({
        correlationId: correlation,
        accountId: other,
        status: "FAILED",
      }),
    );
    // Scope and filter are both applied (AND): another account's filter returns nothing.
    expect(scoped.where).toBe(
      "account_id=$1::uuid and (correlation_id=$2::uuid or request_correlation_id=$2::uuid) and status=$3 and account_id=$4::uuid",
    );
    expect(scoped.values).toEqual([account, correlation, "FAILED", other]);
    expect(() =>
      integrationLogsWhere(
        { accountId: null },
        integrationLogQuerySchema.parse({ cursor: "not-base64-json" }),
      ),
    ).toThrow();
  });
});
