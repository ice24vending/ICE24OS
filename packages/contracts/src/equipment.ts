import { z } from "zod";
import { createCursorPageSchema, cursorPageRequestSchema } from "./pagination.js";

const name = z.string().trim().min(1).max(200);
const reason = z.string().trim().min(10).max(2000);
const id = z.uuid();
const zone = z
  .string()
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");
export const accountDetailsSchema = z.strictObject({
  displayName: name,
  legalName: name,
  timezone: zone,
  currency: z.literal("MXN"),
  contact: z.strictObject({ email: z.email(), phone: z.string().max(40) }),
  taxProfile: z.strictObject({ taxId: z.string().max(30), fiscalAddress: z.string().max(1000) }),
  moduleConfiguration: z.strictObject({
    maintenance: z.boolean(),
    sanitation: z.boolean(),
    inventory: z.boolean(),
    commercial: z.boolean(),
  }),
});
export const branchInputSchema = z.strictObject({
  name,
  address: z.string().trim().min(1).max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: zone,
  schedule: z.string().max(1000),
  publicPhone: z.string().max(40),
  ownerPhonePublic: z.boolean(),
  referenceTemperature: z.number().min(-80).max(100).nullable(),
});
export const catalogInputSchema = z.strictObject({
  code: z.string().regex(/^[A-Z0-9_-]{2,40}$/),
  name,
  kind: z.enum(["manufacturer", "system", "component", "characteristic"]),
  unit: z.string().max(40).optional(),
});
export const modelInputSchema = z.strictObject({
  code: z.string().regex(/^[A-Z0-9_-]{2,40}$/),
  name,
  manufacturerId: id,
  equipmentType: z.enum([
    "ice_450",
    "ice_water_450",
    "ice_900",
    "water_vending",
    "external_validated",
    "private_label",
  ]),
  nominalCapacity: z.number().positive(),
  characteristics: z.record(
    z.string().max(80),
    z.union([z.string().max(200), z.number(), z.boolean()]),
  ),
});
const activityCode = z.string().regex(/^[A-Z0-9_-]{2,40}$/);
const checklistSchema = z
  .array(z.strictObject({ code: name, label: name, required: z.boolean() }))
  .min(1)
  .max(100);
const evidenceRulesSchema = z.strictObject({
  required: z.boolean(),
  minimumFiles: z.number().int().min(0).max(20),
});
const requiredEvidenceHasMinimum = (v: { required: boolean; minimumFiles: number }) =>
  !v.required || v.minimumFiles > 0;
export const activityInputSchema = z
  .strictObject({
    code: activityCode,
    name,
    category: z.enum(["maintenance", "sanitation", "inspection"]),
    triggerType: z.enum(["time", "usage", "condition", "event"]),
    frequencyDays: z.number().int().min(1).max(3650).nullable(),
    triggerDescription: z.string().max(1000),
    responsibleRole: name,
    checklist: checklistSchema,
    fields: z
      .array(
        z.strictObject({
          code: name,
          label: name,
          type: z.enum(["text", "number", "boolean", "date"]),
          required: z.boolean(),
        }),
      )
      .max(100),
    evidenceRules: evidenceRulesSchema,
    escalationRules: z.strictObject({ afterHours: z.number().int().positive(), notifyRole: name }),
    criticality: z.enum(["low", "medium", "high", "critical"]),
  })
  .refine(
    (v) => v.triggerType !== "time" || v.frequencyDays !== null,
    "Time activity requires frequency",
  )
  .refine(
    (v) => v.triggerType === "time" || v.triggerDescription.trim().length > 0,
    "Describe the trigger",
  )
  .refine((v) => requiredEvidenceHasMinimum(v.evidenceRules), "Required evidence needs a minimum");
export const templateInputSchema = z
  .strictObject({
    changeSummary: reason,
    systems: z.array(id).min(1).max(100),
    components: z.array(id).min(1).max(100),
    activities: z.array(activityInputSchema).min(1).max(200),
  })
  .refine(
    (v) => new Set(v.activities.map((a) => a.code)).size === v.activities.length,
    "Duplicate activity code",
  );
export const equipmentRequestInputSchema = z.strictObject({
  branchId: id,
  manufacturerId: id.optional(),
  modelName: z.string().max(200).default(""),
  serialNumber: z.string().max(200).default(""),
  capacity: z.number().positive().optional(),
  characteristics: z
    .record(z.string().max(80), z.union([z.string().max(200), z.number(), z.boolean()]))
    .default({}),
  fileIds: z.array(id).max(20).default([]),
});
export const approvalInputSchema = z.strictObject({
  technicalModelId: id,
  templateVersionId: id,
  validationMethod: z.enum(["documents", "extra_photos", "video_call", "site_visit"]),
  validatedFileIds: z.array(id).min(1).max(20),
  reviewNotes: reason,
  initialOperationalStatus: z.enum(["available", "off", "maintenance", "out_of_service"]),
  confirmation: z.literal(true),
});
export const transitionInputSchema = z.strictObject({ reason, confirmation: z.literal(true) });
export const moveInputSchema = transitionInputSchema.extend({ toBranchId: id });
export const operationalInputSchema = transitionInputSchema.extend({
  status: z.enum(["available", "off", "maintenance", "out_of_service", "suspended"]),
});
export const machineMetadataSchema = z.strictObject({
  internalName: name,
  commercialBrand: z.string().max(200),
});
export const transferInputSchema = transitionInputSchema.extend({
  machineId: id,
  toAccountId: id,
  toBranchId: id,
  commercialDataTransfer: z.strictObject({
    sales: z.boolean(),
    customers: z.boolean(),
    recharges: z.boolean(),
    orders: z.boolean(),
  }),
  authorizationFileIds: z.array(id).max(20),
});
export const assignTemplateSchema = transitionInputSchema.extend({ templateVersionId: id });
export const uploadInputSchema = z.strictObject({
  filename: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[^/\\]+$/),
  contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
  contentBase64: z.string().min(4).max(7_000_000),
});
export type ActivityDefinition = z.infer<typeof activityInputSchema>;
export const accountInvitationSchema = z.strictObject({
  email: z.email(),
  displayName: name,
  roleCodes: z
    .array(z.enum(["OW", "TC", "OP", "SA", "AU"]))
    .min(1)
    .max(5),
  branchIds: z.array(id).max(100),
  machineIds: z.array(id).max(100),
});
export const membershipPermissionsSchema = accountInvitationSchema
  .omit({ email: true, displayName: true })
  .extend({
    reason,
    overrides: z
      .array(
        z.strictObject({
          permission: z.string().regex(/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$/),
          effect: z.enum(["ALLOW", "DENY"]),
        }),
      )
      .max(100),
  });
export type TemplateDefinition = z.infer<typeof templateInputSchema>;

// TASK-F4-18 (RA-01, RF-TPL-013): account-owned catalog entries. Additive to /v1; the
// persisted `data` carries ACCOUNT_CATALOG_DATA_VERSION so future shapes stay readable.
export const ACCOUNT_CATALOG_DATA_VERSION = 1 as const;
export const catalogScopeSchema = z.enum(["OFFICIAL", "ACCOUNT"]);
export const accountCatalogKindSchema = z.enum(["component", "characteristic"]);
export const accountCatalogStatusSchema = z.enum(["active", "retired"]);
const frequencyLimit = { days: 3650, weeks: 520, months: 120 } as const;
export const maintenanceFrequencySchema = z
  .strictObject({
    value: z.number().int().min(1),
    unit: z.enum(["days", "weeks", "months"]),
  })
  .refine((v) => v.value <= frequencyLimit[v.unit], "Frequency cannot exceed ten years");
// RA-01-D3: same checklist and evidence shape as template activities; time based only.
export const accountMaintenanceActivitySchema = z
  .strictObject({
    code: activityCode,
    name,
    category: z.enum(["maintenance", "sanitation", "inspection"]),
    defaultFrequency: maintenanceFrequencySchema,
    checklist: checklistSchema,
    evidenceRules: evidenceRulesSchema,
  })
  .refine((v) => requiredEvidenceHasMinimum(v.evidenceRules), "Required evidence needs a minimum");
const accountCatalogDefinition = {
  name,
  description: z.string().trim().min(1).max(1000).optional(),
  unit: z.string().trim().min(1).max(40).optional(),
  maintenanceActivity: accountMaintenanceActivitySchema.optional(),
};
const onlyComponentsHaveActivity = (v: { kind: string; maintenanceActivity?: unknown }) =>
  v.kind === "component" || v.maintenanceActivity === undefined;
export const createAccountCatalogEntrySchema = z
  .strictObject({
    code: z.string().regex(/^[A-Z0-9_-]{2,40}$/),
    kind: accountCatalogKindSchema,
    ...accountCatalogDefinition,
  })
  .refine(onlyComponentsHaveActivity, "Only components define a maintenance activity");
/** Replaces the editable definition; code and kind are immutable. */
export const updateAccountCatalogEntrySchema = z.strictObject(accountCatalogDefinition);
export const retireAccountCatalogEntrySchema = z.strictObject({
  reason,
  confirmation: z.literal(true),
});
export const accountCatalogQuerySchema = cursorPageRequestSchema
  .extend({ status: accountCatalogStatusSchema.optional() })
  .strict();
export const accountCatalogEntrySchema = z.strictObject({
  id,
  scope: z.literal("ACCOUNT"),
  kind: accountCatalogKindSchema,
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  unit: z.string().nullable(),
  maintenanceActivity: accountMaintenanceActivitySchema.nullable(),
  status: accountCatalogStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export const accountCatalogPageSchema = createCursorPageSchema(accountCatalogEntrySchema);
export const accountCatalogOpenApi = {
  entry: z.toJSONSchema(accountCatalogEntrySchema),
  page: z.toJSONSchema(accountCatalogPageSchema),
  query: z.toJSONSchema(accountCatalogQuerySchema, { io: "input" }),
  create: z.toJSONSchema(createAccountCatalogEntrySchema),
  update: z.toJSONSchema(updateAccountCatalogEntrySchema),
  retire: z.toJSONSchema(retireAccountCatalogEntrySchema),
};
export type CatalogScope = z.infer<typeof catalogScopeSchema>;
export type AccountMaintenanceActivity = z.infer<typeof accountMaintenanceActivitySchema>;
export type CreateAccountCatalogEntry = z.infer<typeof createAccountCatalogEntrySchema>;
export type UpdateAccountCatalogEntry = z.infer<typeof updateAccountCatalogEntrySchema>;
export type AccountCatalogQuery = z.infer<typeof accountCatalogQuerySchema>;
export type AccountCatalogEntry = z.infer<typeof accountCatalogEntrySchema>;
export type AccountCatalogPage = z.infer<typeof accountCatalogPageSchema>;

// TASK-F4-19 (RA-01, RF-TPL-014): components configured on each machine. Origin is derived by
// the server from the template and the catalog scope; clients never send it.
export const machineComponentOriginSchema = z.enum([
  "TEMPLATE_DEFAULT",
  "TEMPLATE_OPTIONAL",
  "ACCOUNT_CUSTOM",
]);
export const machineComponentStatusSchema = z.enum(["active", "inactive"]);
export const addMachineComponentSchema = z.strictObject({
  componentCatalogId: id,
  reason,
  confirmation: z.literal(true),
});
export const machineComponentTransitionSchema = z.strictObject({
  reason,
  confirmation: z.literal(true),
});
export const machineComponentConfigSchema = z.strictObject({
  id,
  machineId: id,
  componentCatalogId: id,
  /** Null when the component belongs to another account (history kept after a transfer). */
  component: z
    .strictObject({
      code: z.string(),
      name: z.string(),
      scope: catalogScopeSchema,
      status: accountCatalogStatusSchema,
    })
    .nullable(),
  origin: machineComponentOriginSchema,
  status: machineComponentStatusSchema,
  validFrom: z.iso.datetime({ offset: true }),
  validTo: z.iso.datetime({ offset: true }).nullable(),
  /** Null for versions recorded before the active account owned the machine. */
  actorId: id.nullable(),
  reason: z.string().nullable(),
  version: z.number().int().positive(),
});
export const machineComponentsSchema = z.strictObject({
  machineId: id,
  current: z.array(machineComponentConfigSchema),
  history: z.array(machineComponentConfigSchema),
});
export const machineComponentsOpenApi = {
  config: z.toJSONSchema(machineComponentConfigSchema),
  components: z.toJSONSchema(machineComponentsSchema),
  add: z.toJSONSchema(addMachineComponentSchema),
  transition: z.toJSONSchema(machineComponentTransitionSchema),
};
export type MachineComponentOrigin = z.infer<typeof machineComponentOriginSchema>;
export type MachineComponentConfig = z.infer<typeof machineComponentConfigSchema>;
export type MachineComponents = z.infer<typeof machineComponentsSchema>;
