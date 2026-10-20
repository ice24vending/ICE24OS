import type {
  AccountAccessMode,
  AuthorizationSubject,
  DataClassification,
  PermissionGrant,
} from "@ice24/authorization";

/**
 * Permissions of the demo personas. This is a copy of the role grants seeded by the migrations
 * (`insert into authz.role_permissions` in supabase/migrations), not a separate model: the demo
 * evaluates them with the real `authorize()` of @ice24/authorization, exactly like the API.
 * `personas.test.ts` fails if a code here no longer exists in the migrations.
 */
export const PERMISSION_CLASSIFICATION = {
  "identity.profile-read": "CONFIDENTIAL",
  "identity.profile-update": "CONFIDENTIAL",
  "identity.context-activate": "CONFIDENTIAL",
  "identity.session-revoke": "RESTRICTED",
  "identity.membership-manage": "RESTRICTED",
  "identity.recovery-manage": "RESTRICTED",
  "accounts.create": "RESTRICTED",
  "audit.security-read": "RESTRICTED",
  "audit.read": "RESTRICTED",
  "audit.global-read": "RESTRICTED",
  "equipment.read": "CONFIDENTIAL",
  "equipment.manage": "CONFIDENTIAL",
  "equipment.admin": "RESTRICTED",
  "equipment.catalog-manage": "CONFIDENTIAL",
  "equipment.machine-components-manage": "CONFIDENTIAL",
  "equipment.account-frequencies-manage": "CONFIDENTIAL",
  "equipment.machine-frequencies-manage": "CONFIDENTIAL",
  "subscriptions.read": "CONFIDENTIAL",
  "subscriptions.admin": "RESTRICTED",
  "jobs.read": "CONFIDENTIAL",
  "jobs.admin-read": "RESTRICTED",
  "jobs.retry": "RESTRICTED",
  "files.upload": "CONFIDENTIAL",
  "files.read": "CONFIDENTIAL",
  "notifications.read": "CONFIDENTIAL",
  "notifications.attend": "CONFIDENTIAL",
  "notifications.billing-alerts": "CONFIDENTIAL",
  "notifications.security-alerts": "RESTRICTED",
  "integration-logs.read": "RESTRICTED",
} as const satisfies Record<string, DataClassification>;

export type PermissionCode = keyof typeof PERMISSION_CLASSIFICATION;
export type DemoRoleCode = "OW" | "OP" | "TC" | "AU" | "IO" | "IA";

const SELF_SERVICE: readonly PermissionCode[] = [
  "identity.profile-read",
  "identity.profile-update",
  "identity.context-activate",
  "identity.session-revoke",
];

export const ROLE_PERMISSIONS: Readonly<Record<DemoRoleCode, readonly PermissionCode[]>> = {
  OW: [
    ...SELF_SERVICE,
    "identity.membership-manage",
    "equipment.read",
    "equipment.manage",
    "equipment.catalog-manage",
    "equipment.machine-components-manage",
    "equipment.account-frequencies-manage",
    "equipment.machine-frequencies-manage",
    "subscriptions.read",
    "audit.read",
    "jobs.read",
    "files.upload",
    "files.read",
    "notifications.read",
    "notifications.attend",
    "notifications.billing-alerts",
    "notifications.security-alerts",
  ],
  OP: [
    ...SELF_SERVICE,
    "equipment.read",
    "equipment.machine-components-manage",
    "equipment.machine-frequencies-manage",
    "files.upload",
    "files.read",
    "notifications.read",
    "notifications.attend",
  ],
  TC: [
    ...SELF_SERVICE,
    "equipment.read",
    "files.upload",
    "files.read",
    "notifications.read",
    "notifications.attend",
  ],
  AU: [
    ...SELF_SERVICE,
    "equipment.read",
    "audit.read",
    "files.read",
    "notifications.read",
    "notifications.attend",
  ],
  IO: [
    "identity.profile-read",
    "identity.context-activate",
    "identity.session-revoke",
    "identity.membership-manage",
    "identity.recovery-manage",
    "audit.security-read",
    "equipment.read",
    "equipment.manage",
    "equipment.admin",
    "subscriptions.read",
    "notifications.read",
    "notifications.attend",
  ],
  // Every permission up to Phase 3 (`cross join`), then the ones each module grants to IA.
  IA: (Object.keys(PERMISSION_CLASSIFICATION) as PermissionCode[]).filter(
    (code) =>
      ![
        "equipment.catalog-manage",
        "equipment.machine-components-manage",
        "equipment.account-frequencies-manage",
        "equipment.machine-frequencies-manage",
      ].includes(code),
  ),
};

export type DemoPersonaKey = "owner" | "admin" | "technician" | "readonly" | "ice24" | "platform";

export interface DemoPersona {
  readonly key: DemoPersonaKey;
  readonly label: string;
  readonly role: DemoRoleCode;
  readonly displayName: string;
  readonly username: string;
  /** How far the role reaches: the whole account, one branch, or the machines of one branch. */
  readonly scope: "ACCOUNT" | "BRANCH" | "MACHINE";
  readonly description: string;
}

export const DEMO_PERSONAS: Readonly<Record<DemoPersonaKey, DemoPersona>> = {
  owner: {
    key: "owner",
    label: "Dueño",
    role: "OW",
    displayName: "Laura Méndez",
    username: "laura.mendez",
    scope: "ACCOUNT",
    description: "Propietario de la cuenta: ve y administra todo, incluida la suscripción.",
  },
  admin: {
    key: "admin",
    label: "Administrador de sucursal",
    role: "OP",
    displayName: "Jorge Salinas",
    username: "jorge.salinas",
    scope: "BRANCH",
    description: "Operador (OP): administra componentes y frecuencias solo de su sucursal.",
  },
  technician: {
    key: "technician",
    label: "Técnico",
    role: "TC",
    displayName: "Ana Torres",
    username: "ana.torres",
    scope: "MACHINE",
    description: "Técnico (TC): consulta las máquinas asignadas y sube evidencias.",
  },
  readonly: {
    key: "readonly",
    label: "Solo lectura",
    role: "AU",
    displayName: "Carlos Ibarra",
    username: "carlos.ibarra",
    scope: "ACCOUNT",
    description: "Consulta/Auditor (AU): consulta la cuenta y su auditoría; no modifica nada.",
  },
  ice24: {
    key: "ice24",
    label: "Operador ICE24",
    role: "IO",
    displayName: "Operaciones ICE24",
    username: "operaciones.ice24",
    scope: "ACCOUNT",
    description: "ICE24 Operaciones (IO): soporte de la plataforma con acceso a la cuenta.",
  },
  platform: {
    key: "platform",
    label: "Administrador ICE24",
    role: "IA",
    displayName: "Administración ICE24",
    username: "admin.ice24",
    scope: "ACCOUNT",
    description:
      "ICE24 Admin (IA): todos los permisos, incluidos el centro de trabajos y la auditoría global.",
  },
};

export const isDemoPersonaKey = (value: unknown): value is DemoPersonaKey =>
  typeof value === "string" && Object.hasOwn(DEMO_PERSONAS, value);

export const grantsFor = (role: DemoRoleCode): PermissionGrant[] =>
  ROLE_PERMISSIONS[role].map((code) => ({
    code,
    effect: "ALLOW",
    classification: PERMISSION_CLASSIFICATION[code],
  }));

export interface DemoSubjectInput {
  readonly persona: DemoPersona;
  readonly userId: string;
  readonly membershipId: string;
  readonly accountId: string;
  readonly mode: AccountAccessMode;
  readonly branchIds: readonly string[];
  readonly machineIds: readonly string[];
}

/** The same subject shape the API builds from the database for the active context. */
export const demoSubject = (input: DemoSubjectInput): AuthorizationSubject => ({
  userId: input.userId,
  membershipId: input.membershipId,
  membershipAccountId: input.accountId,
  membershipStatus: "ACTIVE",
  contextActive: true,
  accountAccessMode: input.mode,
  assuranceLevel: "aal2",
  permissions: grantsFor(input.persona.role),
  accountWide: input.persona.scope === "ACCOUNT",
  branchIds: new Set(input.branchIds),
  machineIds: new Set(input.machineIds),
});
