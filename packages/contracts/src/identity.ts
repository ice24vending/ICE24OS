import { z } from "zod";

export const userStatusSchema = z.enum(["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"]);
export const membershipStatusSchema = z.enum(["PENDING", "ACTIVE", "SUSPENDED", "ENDED"]);
export const accountAccessModeSchema = z.enum(["ACTIVE", "READ_ONLY", "SUSPENDED"]);
export const roleCodeSchema = z.enum(["IA", "IO", "OW", "TC", "OP", "SA", "DV", "RA", "AU"]);
export const scopeTypeSchema = z.enum(["ACCOUNT", "BRANCH", "MACHINE", "BUSINESS"]);
export const dataClassificationSchema = z.enum([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
]);
export const assuranceLevelSchema = z.enum(["aal1", "aal2"]);

export const actorSchema = z.object({
  userId: z.string().uuid(),
  identityId: z.string().min(1),
});

export const requestContextSchema = z.object({
  accountId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
  contextSessionId: z.string().uuid().optional(),
});

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  identitySubject: z.string().min(1).max(255),
  username: z.string().trim().min(3).max(100),
  email: z.email().max(320),
  displayName: z.string().trim().min(1).max(200),
  locale: z.string().min(2).max(20).default("es-MX"),
  timeZone: z.string().min(1).max(64).default("America/Mexico_City"),
  status: userStatusSchema,
  version: z.number().int().positive(),
});

export const updateMyProfileRequestSchema = userProfileSchema
  .pick({ displayName: true, locale: true, timeZone: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export const accessContextSchema = z.object({
  id: z.string().uuid().nullable(),
  accountId: z.string().uuid(),
  accountName: z.string().min(1).max(200),
  membershipId: z.string().uuid(),
  membershipStatus: membershipStatusSchema,
  accessMode: accountAccessModeSchema,
  roleCodes: z.array(roleCodeSchema).min(1),
  branchIds: z.array(z.string().uuid()),
  machineIds: z.array(z.string().uuid()),
  issuedAt: z.iso.datetime({ offset: true }).nullable(),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
});

export const createContextRequestSchema = z.object({
  accountId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  identitySessionId: z.string().min(1).max(255).optional(),
});

export const sessionSummarySchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string().min(1),
  issuedAt: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
  revokedAt: z.iso.datetime({ offset: true }).nullable(),
  current: z.boolean(),
  deviceSummary: z.string().max(160).nullable(),
});

export const permissionSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/),
  module: z.string().min(1).max(60),
  action: z.string().min(1).max(60),
  classification: dataClassificationSchema,
});

export const membershipSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  userId: z.string().uuid(),
  status: membershipStatusSchema,
  isPrimaryOwner: z.boolean(),
  roleCodes: z.array(roleCodeSchema).min(1),
  validFrom: z.iso.datetime({ offset: true }),
  validTo: z.iso.datetime({ offset: true }).nullable(),
  version: z.number().int().positive(),
});

export const createAccountWithOwnerRequestSchema = z.object({
  accountName: z.string().trim().min(2).max(200),
  accountType: z.enum(["INDIVIDUAL", "COMPANY"]),
  owner: z.object({
    email: z.email().max(320),
    username: z.string().trim().min(3).max(100),
    displayName: z.string().trim().min(1).max(200),
  }),
});

export const createMembershipRequestSchema = z.object({
  accountId: z.string().uuid(),
  userId: z.string().uuid(),
  roleCodes: z.array(roleCodeSchema).min(1),
  branchIds: z.array(z.string().uuid()).default([]),
  machineIds: z.array(z.string().uuid()).default([]),
});

export const associationTransitionRequestSchema = z.object({
  expectedVersion: z.number().int().positive(),
  reason: z.string().trim().min(10).max(2_000),
});

export const recoveryCaseStatusSchema = z.enum([
  "OPEN",
  "VERIFYING",
  "APPROVED",
  "REJECTED",
  "RESET_ISSUED",
  "CLOSED",
]);

export const createRecoveryCaseRequestSchema = z.object({
  userId: z.string().uuid(),
  requestedChannel: z.enum(["PHONE", "EMAIL", "SUPPORT_CASE", "IN_PERSON"]),
  reason: z.string().trim().min(10).max(2_000),
});

export const recoveryDecisionRequestSchema = z.object({
  verificationMethod: z.string().trim().min(3).max(80),
  evidenceReferences: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
  reason: z.string().trim().min(10).max(2_000),
  expectedVersion: z.number().int().positive(),
});

export const recoveryCaseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: recoveryCaseStatusSchema,
  requestedAt: z.iso.datetime({ offset: true }),
  approvalCount: z.number().int().min(0).max(2),
  version: z.number().int().positive(),
});

export const securityEventTypeSchema = z.enum([
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "MFA_ENROLLED",
  "MFA_CHALLENGE_FAILED",
  "RECOVERY_REQUESTED",
  "RECOVERY_APPROVED",
  "RECOVERY_REJECTED",
  "SESSION_REVOKED",
  "SESSIONS_REVOKED_GLOBAL",
  "CONTEXT_ACTIVATED",
  "CONTEXT_REVOKED",
  "ACCOUNT_CREATED",
  "MEMBERSHIP_CHANGED",
]);

export const securityAuditEventSchema = z.object({
  id: z.string().uuid(),
  occurredAt: z.iso.datetime({ offset: true }),
  actorUserId: z.string().uuid().nullable(),
  subjectUserId: z.string().uuid().nullable(),
  contextSessionId: z.string().uuid().nullable(),
  accountId: z.string().uuid().nullable(),
  eventType: securityEventTypeSchema,
  result: z.enum(["SUCCESS", "DENIED", "FAILED"]),
  reason: z.string().max(2_000).nullable(),
  correlationId: z.string().uuid(),
  metadata: z.record(z.string(), z.unknown()),
});

export const oidcIdentityClaimsSchema = z.object({
  sub: z.string().min(1),
  iss: z.url(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number().int().positive(),
  iat: z.number().int().positive().optional(),
  email: z.email().optional(),
  user_name: z.string().optional(),
  name: z.string().optional(),
  aal: assuranceLevelSchema.default("aal1"),
  session_id: z.string().optional(),
});

export type Actor = z.infer<typeof actorSchema>;
export type RequestContext = z.infer<typeof requestContextSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type AccessContext = z.infer<typeof accessContextSchema>;
export type SessionSummary = z.infer<typeof sessionSummarySchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type RecoveryCase = z.infer<typeof recoveryCaseSchema>;
export type OidcIdentityClaims = z.infer<typeof oidcIdentityClaimsSchema>;
export type SecurityEventType = z.infer<typeof securityEventTypeSchema>;
