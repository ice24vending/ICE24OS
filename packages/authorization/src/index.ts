export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type AccountAccessMode = "ACTIVE" | "READ_ONLY" | "SUSPENDED";
export type MembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "ENDED";
export type AuthorizationEffect = "ALLOW" | "DENY";

export interface PermissionGrant {
  readonly code: string;
  readonly effect: AuthorizationEffect;
  readonly classification: DataClassification;
}

export interface AuthorizationSubject {
  readonly userId: string;
  readonly membershipId: string;
  readonly membershipAccountId: string;
  readonly membershipStatus: MembershipStatus;
  readonly contextActive: boolean;
  readonly accountAccessMode: AccountAccessMode;
  readonly assuranceLevel: "aal1" | "aal2";
  readonly permissions: readonly PermissionGrant[];
  readonly accountWide: boolean;
  readonly branchIds: ReadonlySet<string>;
  readonly machineIds: ReadonlySet<string>;
}

export interface AuthorizationRequest {
  readonly accountId: string;
  readonly permission: string;
  readonly classification: DataClassification;
  readonly operation: "READ" | "WRITE";
  readonly resourceAccountId?: string;
  readonly branchId?: string;
  readonly machineId?: string;
  readonly requiresMfa?: boolean;
}

export type AuthorizationDenialReason =
  | "membership_inactive"
  | "context_inactive"
  | "account_mismatch"
  | "resource_account_mismatch"
  | "account_suspended"
  | "account_read_only"
  | "explicit_deny"
  | "action_not_granted"
  | "classification_not_granted"
  | "scope_not_granted"
  | "mfa_required";

export type AuthorizationDecision =
  | { readonly allowed: true; readonly reason: "granted" }
  | { readonly allowed: false; readonly reason: AuthorizationDenialReason };

const classificationRank: Record<DataClassification, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CONFIDENTIAL: 2,
  RESTRICTED: 3,
};

export const authorize = (
  subject: AuthorizationSubject,
  request: AuthorizationRequest,
): AuthorizationDecision => {
  if (subject.membershipStatus !== "ACTIVE") {
    return { allowed: false, reason: "membership_inactive" };
  }
  if (!subject.contextActive) return { allowed: false, reason: "context_inactive" };
  if (subject.membershipAccountId !== request.accountId) {
    return { allowed: false, reason: "account_mismatch" };
  }
  if (request.resourceAccountId !== undefined && request.resourceAccountId !== request.accountId) {
    return { allowed: false, reason: "resource_account_mismatch" };
  }
  if (subject.accountAccessMode === "SUSPENDED") {
    return { allowed: false, reason: "account_suspended" };
  }
  if (subject.accountAccessMode === "READ_ONLY" && request.operation === "WRITE") {
    return { allowed: false, reason: "account_read_only" };
  }

  const matching = subject.permissions.filter((grant) => grant.code === request.permission);
  if (matching.some((grant) => grant.effect === "DENY")) {
    return { allowed: false, reason: "explicit_deny" };
  }
  const allowed = matching.filter((grant) => grant.effect === "ALLOW");
  if (allowed.length === 0) return { allowed: false, reason: "action_not_granted" };
  if (
    !allowed.some(
      (grant) =>
        classificationRank[grant.classification] >= classificationRank[request.classification],
    )
  ) {
    return { allowed: false, reason: "classification_not_granted" };
  }
  if (
    request.branchId !== undefined &&
    !subject.accountWide &&
    !subject.branchIds.has(request.branchId)
  ) {
    return { allowed: false, reason: "scope_not_granted" };
  }
  if (
    request.machineId !== undefined &&
    !subject.accountWide &&
    !subject.machineIds.has(request.machineId)
  ) {
    return { allowed: false, reason: "scope_not_granted" };
  }
  if (request.requiresMfa === true && subject.assuranceLevel !== "aal2") {
    return { allowed: false, reason: "mfa_required" };
  }
  return { allowed: true, reason: "granted" };
};
