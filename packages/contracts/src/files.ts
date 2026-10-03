import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u, "SHA-256 in lowercase hex");

/** Media types accepted by the private buckets (see storage.buckets.allowed_mime_types). */
export const fileMediaTypeSchema = z.enum(["application/pdf", "image/jpeg", "image/png"]);
export const fileEntityTypeSchema = z.enum(["account", "branch", "machine"]);

interface UploadPurposePolicy {
  readonly label: string;
  readonly mediaTypes: readonly z.infer<typeof fileMediaTypeSchema>[];
  readonly maxSizeBytes: number;
  readonly entityTypes: readonly z.infer<typeof fileEntityTypeSchema>[];
  readonly sensitivity: "INTERNAL" | "SENSITIVE";
}
const MiB = 1_048_576;
/** Mirrors `files.upload_purposes` (seeded by migration, checked by pgTAP). */
export const FILE_UPLOAD_PURPOSES = {
  equipment_evidence: {
    label: "Evidencia operativa",
    mediaTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxSizeBytes: 10 * MiB,
    entityTypes: ["branch", "machine"],
    sensitivity: "INTERNAL",
  },
  machine_photo: {
    label: "Fotografía de máquina",
    mediaTypes: ["image/jpeg", "image/png"],
    maxSizeBytes: 10 * MiB,
    entityTypes: ["machine"],
    sensitivity: "INTERNAL",
  },
  laboratory_analysis_original: {
    label: "Análisis de laboratorio (original)",
    mediaTypes: ["application/pdf"],
    maxSizeBytes: 25 * MiB,
    entityTypes: ["branch", "machine"],
    sensitivity: "SENSITIVE",
  },
  document_original: {
    label: "Documento controlado (original)",
    mediaTypes: ["application/pdf", "image/jpeg", "image/png"],
    maxSizeBytes: 25 * MiB,
    entityTypes: ["account", "branch", "machine"],
    sensitivity: "SENSITIVE",
  },
} as const satisfies Record<string, UploadPurposePolicy>;
export type FileUploadPurpose = keyof typeof FILE_UPLOAD_PURPOSES;
export const fileUploadPurposeSchema = z.enum(
  Object.keys(FILE_UPLOAD_PURPOSES) as [FileUploadPurpose, ...FileUploadPurpose[]],
);

/** Upload sessions live at most 15 minutes; temporary reads default to 5 minutes. */
export const UPLOAD_SESSION_TTL_SECONDS = 600;
export const READ_URL_TTL_SECONDS = 300;
export const MAX_SIGNED_URL_TTL_SECONDS = 900;

export const fileNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  // No paths, control characters or reserved device separators in the stored display name.
  .regex(/^[^/\\\p{Cc}]+$/u, "Invalid file name");

export const relatedResourceSchema = z.object({ type: fileEntityTypeSchema, id: uuid }).strict();

/** FIL-001 body. */
export const createUploadSessionRequestSchema = z
  .object({
    fileName: fileNameSchema,
    mediaType: fileMediaTypeSchema,
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(50 * MiB),
    purpose: fileUploadPurposeSchema,
    relatedResource: relatedResourceSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const policy: UploadPurposePolicy = FILE_UPLOAD_PURPOSES[value.purpose];
    if (!policy.mediaTypes.includes(value.mediaType))
      context.addIssue({ code: "custom", path: ["mediaType"], message: "UNSUPPORTED_MEDIA_TYPE" });
    if (value.sizeBytes > policy.maxSizeBytes)
      context.addIssue({ code: "custom", path: ["sizeBytes"], message: "PAYLOAD_TOO_LARGE" });
    if (!policy.entityTypes.includes(value.relatedResource.type))
      context.addIssue({ code: "custom", path: ["relatedResource", "type"], message: "Invalid" });
  });

/** FIL-001 response: one direct PUT to private storage, no API proxying of bytes. */
export const uploadSessionSchema = z.object({
  fileId: uuid,
  uploadUrl: z.url({ protocol: /^https?$/u }),
  method: z.literal("PUT"),
  requiredHeaders: z.record(z.string(), z.string()),
  uploadToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
  expiresAt: timestamp,
  maximumSizeBytes: z.number().int().positive(),
});

/** FIL-002 body. `sha256` is the client-computed hash, verified by the antivirus job (F5-09). */
export const completeUploadRequestSchema = z
  .object({
    uploadToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    sha256: sha256.optional(),
  })
  .strict();

/** FIL-005 body. */
export const abortUploadRequestSchema = z
  .object({ reason: z.string().trim().max(500).optional() })
  .strict();

/** FIL-004 body. Only the private original exists until derivatives arrive. */
export const downloadSessionRequestSchema = z
  .object({
    version: z.enum(["original", "optimized", "public"]),
    purpose: z.string().trim().min(3).max(120),
  })
  .strict();
export const downloadSessionSchema = z.object({ url: z.url(), expiresAt: timestamp });

export const internalFileStatusSchema = z.enum([
  "PENDING_UPLOAD",
  "VERIFYING",
  "AVAILABLE",
  "REJECTED",
  "QUARANTINED",
  "EXPIRED",
]);
export const fileStatusSchema = z.enum([
  "pending",
  "uploaded",
  "processing",
  "available",
  "rejected",
  "quarantined",
  "deleted_temporary",
]);
export const toPublicFileStatus = (
  status: z.infer<typeof internalFileStatusSchema>,
): z.infer<typeof fileStatusSchema> => {
  switch (status) {
    case "PENDING_UPLOAD":
      return "pending";
    case "VERIFYING":
      return "processing";
    case "AVAILABLE":
      return "available";
    case "REJECTED":
      return "rejected";
    case "QUARANTINED":
      return "quarantined";
    case "EXPIRED":
      return "deleted_temporary";
  }
};

/** FIL-003: `FileObject` of API.md. Object keys, buckets and tokens never leave the API. */
export const fileObjectSchema = z.object({
  id: uuid,
  ownerAccountId: uuid,
  fileName: z.string().min(1).max(500),
  mediaType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive(),
  sha256: sha256.optional(),
  purpose: fileUploadPurposeSchema,
  relatedResource: relatedResourceSchema,
  visibility: z.enum(["private", "public_derivative", "temporary_export"]),
  status: fileStatusSchema,
  audit: z.object({
    createdAt: timestamp,
    createdBy: uuid,
    updatedAt: timestamp,
    rowVersion: z.number().int().positive(),
  }),
});

/** `file_scans` message written by `files.complete_upload` and consumed by the worker (F5-09). */
export const fileScanMessageSchema = z
  .object({
    messageVersion: z.literal(1),
    jobId: uuid,
    fileId: uuid,
    versionId: uuid,
    accountId: uuid,
    declaredSha256: sha256.nullable(),
    correlationId: uuid.nullable(),
  })
  .strict();

/** Verdicts recorded by `files.scan_record_result`; anything else keeps the file quarantined. */
export const fileScanVerdictSchema = z.enum([
  "CLEAN",
  "INFECTED",
  "INTEGRITY_MISMATCH",
  "SIGNATURE_MISMATCH",
]);

export const fileScanBatchSummarySchema = z.object({
  received: z.number().int().nonnegative(),
  clean: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  deadLettered: z.number().int().nonnegative(),
});

export const filesOpenApi = {
  createUploadSession: z.toJSONSchema(createUploadSessionRequestSchema, { io: "input" }),
  uploadSession: z.toJSONSchema(uploadSessionSchema),
  completeUpload: z.toJSONSchema(completeUploadRequestSchema),
  abortUpload: z.toJSONSchema(abortUploadRequestSchema),
  downloadSessionRequest: z.toJSONSchema(downloadSessionRequestSchema),
  downloadSession: z.toJSONSchema(downloadSessionSchema),
  fileObject: z.toJSONSchema(fileObjectSchema),
};

export type CreateUploadSessionRequest = z.infer<typeof createUploadSessionRequestSchema>;
export type UploadSession = z.infer<typeof uploadSessionSchema>;
export type CompleteUploadRequest = z.infer<typeof completeUploadRequestSchema>;
export type DownloadSessionRequest = z.infer<typeof downloadSessionRequestSchema>;
export type DownloadSession = z.infer<typeof downloadSessionSchema>;
export type FileObject = z.infer<typeof fileObjectSchema>;
export type FileStatus = z.infer<typeof fileStatusSchema>;
export type InternalFileStatus = z.infer<typeof internalFileStatusSchema>;
export type FileMediaType = z.infer<typeof fileMediaTypeSchema>;
export type FileScanMessage = z.infer<typeof fileScanMessageSchema>;
export type FileScanVerdict = z.infer<typeof fileScanVerdictSchema>;
export type FileScanBatchSummary = z.infer<typeof fileScanBatchSummarySchema>;
