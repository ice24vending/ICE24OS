export interface AuthorizationSubject {
  readonly userId: string;
  readonly membershipAccountId: string;
  readonly grantedActions: ReadonlySet<string>;
  readonly branchIds: ReadonlySet<string>;
}

export interface AuthorizationRequest {
  readonly accountId: string;
  readonly action: string;
  readonly branchId?: string;
}

export type AuthorizationDecision =
  | { readonly allowed: true; readonly reason: "granted" }
  | {
      readonly allowed: false;
      readonly reason: "account_mismatch" | "action_not_granted" | "scope_not_granted";
    };

export const authorize = (
  subject: AuthorizationSubject,
  request: AuthorizationRequest,
): AuthorizationDecision => {
  if (subject.membershipAccountId !== request.accountId) {
    return { allowed: false, reason: "account_mismatch" };
  }
  if (!subject.grantedActions.has(request.action)) {
    return { allowed: false, reason: "action_not_granted" };
  }
  if (request.branchId !== undefined && !subject.branchIds.has(request.branchId)) {
    return { allowed: false, reason: "scope_not_granted" };
  }
  return { allowed: true, reason: "granted" };
};
