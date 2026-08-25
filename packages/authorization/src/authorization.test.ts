import { describe, expect, it } from "vitest";

import { authorize, type AuthorizationSubject } from "./index.js";

const subject: AuthorizationSubject = {
  userId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
  membershipAccountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b103",
  grantedActions: new Set(["platform:read"]),
  branchIds: new Set(["018fc248-74fb-7cc5-bf6f-4dd80ac7b104"]),
};

describe("deny-by-default authorization", () => {
  it("allows an explicitly granted action in the same account and scope", () => {
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        action: "platform:read",
        branchId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b104",
      }),
    ).toEqual({ allowed: true, reason: "granted" });
  });

  it("denies access across accounts even when the action exists", () => {
    expect(
      authorize(subject, {
        accountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b999",
        action: "platform:read",
      }),
    ).toEqual({ allowed: false, reason: "account_mismatch" });
  });

  it("denies missing actions and scopes", () => {
    expect(
      authorize(subject, { accountId: subject.membershipAccountId, action: "platform:write" }),
    ).toEqual({ allowed: false, reason: "action_not_granted" });
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        action: "platform:read",
        branchId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b998",
      }),
    ).toEqual({ allowed: false, reason: "scope_not_granted" });
  });
});
