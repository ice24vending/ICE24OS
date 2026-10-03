import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { AuditService } from "./audit.service.js";
import { auditQuerySchema } from "@ice24/contracts";
import { auditWhere } from "../infrastructure/audit.database.js";

const account = randomUUID();
function subject(): AuthorizationSubject {
  return {
    userId: randomUUID(),
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "READ_ONLY",
    assuranceLevel: "aal2",
    permissions: [{ code: "audit.read", effect: "ALLOW", classification: "RESTRICTED" }],
    accountWide: true,
    branchIds: new Set(),
    machineIds: new Set(),
  };
}
function setup() {
  const db = {
    list: vi.fn().mockResolvedValue({ items: [], page: { hasMore: false, nextCursor: null } }),
    detail: vi.fn().mockResolvedValue(null),
  };
  return {
    db,
    service: new AuditService(db),
    request: { headers: {}, authorizationSubject: subject() },
  };
}
describe("audit authorization and query validation", () => {
  it("allows read-only accounts but never trusts a supplied account", async () => {
    const { service, db, request } = setup();
    await service.list(request, {});
    expect(db.list.mock.calls[0]?.[0].accountId).toBe(account);
    expect(() => service.list(request, { accountId: randomUUID() })).toThrow("Account outside");
    expect(db.list).toHaveBeenCalledTimes(1);
  });
  it("denies missing permission, explicit deny, revoked contexts and suspended accounts", () => {
    for (const patch of [
      { permissions: [] },
      { contextActive: false },
      { accountAccessMode: "SUSPENDED" as const },
      {
        permissions: [
          { code: "audit.read", effect: "DENY" as const, classification: "RESTRICTED" as const },
        ],
      },
    ]) {
      const { service, db, request } = setup();
      Object.assign(request.authorizationSubject, patch);
      expect(() => service.list(request, {})).toThrow();
      expect(db.list).not.toHaveBeenCalled();
    }
  });
  it("requires a separate global permission and MFA", async () => {
    const { service, db, request } = setup();
    expect(() => service.list(request, {}, true)).toThrow();
    request.authorizationSubject = {
      ...subject(),
      permissions: [{ code: "audit.global-read", effect: "ALLOW", classification: "RESTRICTED" }],
    };
    await service.list(request, {}, true);
    expect(db.list.mock.calls[0]?.[0].accountId).toBeNull();
    request.authorizationSubject = { ...request.authorizationSubject, assuranceLevel: "aal1" };
    expect(() => service.list(request, {}, true)).toThrow();
  });
  it("does not reveal missing or foreign detail records", async () => {
    const { service, db, request } = setup();
    const id = randomUUID();
    await expect(service.detail(request, id)).rejects.toThrow("Audit event not found");
    expect(db.detail.mock.calls[0]?.[0].accountId).toBe(account);
  });
  it("always intersects branch and machine scopes, including empty scope", () => {
    const branch = randomUUID();
    const query = auditWhere(
      { accountId: account, accountWide: false, branchIds: [branch], machineIds: [] },
      { limit: 25 },
    );
    expect(query.where).toContain("account_id=$1");
    expect(query.where).toContain("branch_id=any($2");
    expect(query.values).toEqual([account, [branch], []]);
  });
  it("rejects malformed cursors, unknown filters, invalid ranges and unbounded pages", () => {
    for (const input of [
      { limit: 0 },
      { limit: 101 },
      { limit: [1, 2] },
      { from: "2026-02-01T00:00:00Z", to: "2026-01-01T00:00:00Z" },
      { global: true },
      { accountId: "invalid" },
    ]) {
      expect(auditQuerySchema.safeParse(input).success).toBe(false);
    }
    expect(() =>
      auditWhere(
        { accountId: account, accountWide: true, branchIds: [], machineIds: [] },
        { limit: 25, cursor: "invalid" },
      ),
    ).toThrow("Invalid audit cursor");
    expect(() =>
      auditWhere(
        { accountId: account, accountWide: true, branchIds: [], machineIds: [] },
        {
          limit: 25,
          cursor: Buffer.from(
            JSON.stringify(["2026-02-31T00:00:00.000000Z", randomUUID()]),
          ).toString("base64url"),
        },
      ),
    ).toThrow("Invalid audit cursor");
  });
});
