import { describe, expect, it } from "vitest";

import { authorize, type AuthorizationSubject } from "./index.js";

const subject: AuthorizationSubject = {
  userId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b102",
  membershipId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b105",
  membershipAccountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b103",
  membershipStatus: "ACTIVE",
  contextActive: true,
  accountAccessMode: "ACTIVE",
  assuranceLevel: "aal2",
  permissions: [
    { code: "platform.read", effect: "ALLOW", classification: "CONFIDENTIAL" },
    { code: "identity.recover", effect: "ALLOW", classification: "RESTRICTED" },
  ],
  accountWide: false,
  branchIds: new Set(["018fc248-74fb-7cc5-bf6f-4dd80ac7b104"]),
  machineIds: new Set(["018fc248-74fb-7cc5-bf6f-4dd80ac7b106"]),
};

describe("hybrid deny-by-default authorization", () => {
  it("allows an explicit grant in the same account, scope and classification", () => {
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: "platform.read",
        classification: "INTERNAL",
        operation: "READ",
        branchId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b104",
      }),
    ).toEqual({ allowed: true, reason: "granted" });
  });

  it("denies cross-account resources, missing actions and unauthorized scopes", () => {
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        resourceAccountId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b999",
        permission: "platform.read",
        classification: "INTERNAL",
        operation: "READ",
      }).reason,
    ).toBe("resource_account_mismatch");
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: "platform.write",
        classification: "INTERNAL",
        operation: "WRITE",
      }).reason,
    ).toBe("action_not_granted");
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: "platform.read",
        classification: "INTERNAL",
        operation: "READ",
        machineId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b998",
      }).reason,
    ).toBe("scope_not_granted");
  });

  it("enforces explicit denies, sensitivity, read-only mode and AAL2", () => {
    const explicitlyDenied = {
      ...subject,
      permissions: [
        ...subject.permissions,
        { code: "platform.read", effect: "DENY" as const, classification: "RESTRICTED" as const },
      ],
    };
    expect(
      authorize(explicitlyDenied, {
        accountId: subject.membershipAccountId,
        permission: "platform.read",
        classification: "INTERNAL",
        operation: "READ",
      }).reason,
    ).toBe("explicit_deny");
    expect(
      authorize(subject, {
        accountId: subject.membershipAccountId,
        permission: "platform.read",
        classification: "RESTRICTED",
        operation: "READ",
      }).reason,
    ).toBe("classification_not_granted");
    expect(
      authorize(
        { ...subject, accountAccessMode: "READ_ONLY" },
        {
          accountId: subject.membershipAccountId,
          permission: "platform.read",
          classification: "INTERNAL",
          operation: "WRITE",
        },
      ).reason,
    ).toBe("account_read_only");
    expect(
      authorize(
        { ...subject, assuranceLevel: "aal1" },
        {
          accountId: subject.membershipAccountId,
          permission: "identity.recover",
          classification: "RESTRICTED",
          operation: "WRITE",
          requiresMfa: true,
        },
      ).reason,
    ).toBe("mfa_required");
  });

  it("lets an account-wide grant cover branch and machine resources in that same account", () => {
    expect(
      authorize(
        { ...subject, accountWide: true },
        {
          accountId: subject.membershipAccountId,
          permission: "platform.read",
          classification: "INTERNAL",
          operation: "READ",
          branchId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b999",
          machineId: "018fc248-74fb-7cc5-bf6f-4dd80ac7b998",
        },
      ),
    ).toEqual({ allowed: true, reason: "granted" });
  });

  it.each(["PENDING", "SUSPENDED", "ENDED"] as const)(
    "denies a %s membership before evaluating grants",
    (membershipStatus) => {
      expect(
        authorize(
          { ...subject, membershipStatus },
          {
            accountId: subject.membershipAccountId,
            permission: "platform.read",
            classification: "INTERNAL",
            operation: "READ",
          },
        ).reason,
      ).toBe("membership_inactive");
    },
  );
});
