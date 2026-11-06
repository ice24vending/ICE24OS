import { z } from "zod";

export const evidenceRequirementSchema = z
  .strictObject({
    code: z.string().trim().min(1).max(80),
    label: z.string().trim().min(1).max(160),
    type: z.enum(["before_photo", "after_photo", "part_photo", "reading", "lot", "signature"]),
    required: z.boolean(),
    minimum: z.number().int().min(1).max(20).default(1),
    unit: z.string().trim().min(1).max(40).optional(),
    minimumValue: z.number().finite().optional(),
    maximumValue: z.number().finite().optional(),
  })
  .refine((v) => v.type !== "reading" || !!v.unit, "Las lecturas requieren unidad.")
  .refine(
    (v) =>
      v.minimumValue === undefined ||
      v.maximumValue === undefined ||
      v.minimumValue <= v.maximumValue,
    "Rango inválido.",
  )
  .refine(
    (v) => v.type.endsWith("_photo") || v.minimum === 1,
    "Las lecturas, lotes y firmas usan un requisito distinto por captura.",
  );

export const executionEvidenceSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("photo"),
    requirementCode: z.string().min(1).max(80),
    fileId: z.uuid(),
    fileVersionId: z.uuid(),
  }),
  z.strictObject({
    type: z.literal("reading"),
    requirementCode: z.string().min(1).max(80),
    value: z.number().finite(),
    unit: z.string().trim().min(1).max(40),
  }),
  z.strictObject({
    type: z.literal("lot"),
    requirementCode: z.string().min(1).max(80),
    value: z.string().trim().min(1).max(160),
  }),
  z.strictObject({
    type: z.literal("signature"),
    requirementCode: z.string().min(1).max(80),
    name: z.string().trim().min(2).max(160),
    confirmed: z.literal(true),
  }),
]);

export const workOrderExecutionSchema = z
  .strictObject({
    checklist: z.array(z.string().min(1).max(160)).max(100),
    fields: z.record(
      z.string().max(160),
      z.union([z.string().max(4000), z.number().finite(), z.boolean()]),
    ),
    diagnosis: z.string().trim().max(8000),
    activitiesPerformed: z.string().trim().max(8000),
    parts: z
      .array(
        z.strictObject({
          code: z.string().trim().min(1).max(80),
          name: z.string().trim().min(1).max(160),
          quantity: z.number().positive(),
          unit: z.string().trim().min(1).max(40),
          lot: z.string().trim().max(160),
        }),
      )
      .max(100),
    tests: z.string().trim().max(8000),
    recommendation: z.string().trim().max(8000),
    evidence: z.array(executionEvidenceSchema).max(100),
    result: z.enum(["conforming", "observations", "nonconforming"]),
    followup: z.string().trim().max(4000),
  })
  .refine((v) => new Set(v.checklist).size === v.checklist.length, "Checklist duplicado.");

export const workOrderReviewSchema = z
  .strictObject({
    action: z.enum(["review", "correct", "cancel", "reopen", "request_correction"]),
    reason: z.string().trim().min(5).max(1000),
    execution: workOrderExecutionSchema.optional(),
  })
  .refine(
    (v) => (v.action === "correct") === (v.execution !== undefined),
    "Solo la corrección incluye una ejecución nueva.",
  );

export const executionRevisionSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  kind: z.enum(["draft", "closure", "correction"]),
  actorId: z.uuid(),
  createdAt: z.iso.datetime(),
  reason: z.string(),
  execution: workOrderExecutionSchema,
});
export const workOrderExecutionDetailSchema = z.object({
  revisions: z.array(executionRevisionSchema),
  reviews: z.array(
    z.object({
      id: z.uuid(),
      action: z.string(),
      reason: z.string(),
      actorId: z.uuid(),
      createdAt: z.iso.datetime(),
      revisionId: z.uuid().nullable(),
    }),
  ),
  missing: z.array(z.object({ field: z.string(), message: z.string() })),
  outOfRange: z.array(z.string()),
  canExecute: z.boolean(),
  canReview: z.boolean(),
  canRequestCorrection: z.boolean(),
  canReopen: z.boolean(),
});
export type WorkOrderExecution = z.infer<typeof workOrderExecutionSchema>;
export type ExecutionEvidence = z.infer<typeof executionEvidenceSchema>;
export type EvidenceRequirement = z.infer<typeof evidenceRequirementSchema>;
export type WorkOrderExecutionDetail = z.infer<typeof workOrderExecutionDetailSchema>;
export const executionOpenApi = Object.fromEntries(
  Object.entries({
    execution: workOrderExecutionSchema,
    review: workOrderReviewSchema,
    detail: workOrderExecutionDetailSchema,
  }).map(([key, schema]) => [key, z.toJSONSchema(schema, { target: "openapi-3.0" })]),
);
