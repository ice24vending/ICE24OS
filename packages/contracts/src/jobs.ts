import { z } from "zod";
import { createCursorPageSchema, cursorPageRequestSchema } from "./pagination.js";

const uuid = z.string().uuid();
const timestamp = z.iso.datetime({ offset: true });

/** Internal registry states (Database `async_jobs`). */
export const jobStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "RETRY_WAIT",
  "FAILED",
  "DEAD_LETTER",
]);
export const RETRYABLE_JOB_STATUSES = ["DEAD_LETTER", "FAILED"] as const;

export const jobCursorSchema = z.tuple([z.iso.datetime({ precision: 6 }), uuid]);

/** Support view of a job (JOB center). Never carries payloads or raw error messages. */
export const asyncJobSchema = z.object({
  id: uuid,
  type: z.string().min(1).max(100),
  status: jobStatusSchema,
  queue: z.string().min(1),
  accountId: uuid.nullable(),
  sourceType: z.string().min(1).max(60),
  sourceId: uuid,
  eventType: z.string().max(120).nullable(),
  attemptCount: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  manualRetryCount: z.number().int().nonnegative(),
  nextAttemptAt: timestamp.nullable(),
  startedAt: timestamp.nullable(),
  finishedAt: timestamp.nullable(),
  errorCode: z.string().max(80).nullable(),
  errorDetail: z.string().max(500).nullable(),
  correlationId: uuid.nullable(),
  rowVersion: z.number().int().positive(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const jobTransitionSchema = z.object({
  id: uuid,
  fromStatus: jobStatusSchema.nullable(),
  toStatus: jobStatusSchema,
  attempt: z.number().int().nonnegative(),
  errorCode: z.string().max(80).nullable(),
  actorType: z.enum(["SYSTEM", "USER"]),
  actorUserId: uuid.nullable(),
  reason: z.string().max(1000).nullable(),
  correlationId: uuid.nullable(),
  occurredAt: timestamp,
});

export const jobDetailSchema = asyncJobSchema.extend({
  transitions: z.array(jobTransitionSchema),
});

export const jobQuerySchema = cursorPageRequestSchema
  .extend({
    status: jobStatusSchema.optional(),
    type: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{1,99}$/u)
      .optional(),
    queue: z
      .string()
      .regex(/^[a-z0-9_]{1,63}$/u)
      .optional(),
    accountId: uuid.optional(),
    from: timestamp.optional(),
    to: timestamp.optional(),
  })
  .strict()
  .refine(
    (value) => !value.from || !value.to || Date.parse(value.from) <= Date.parse(value.to),
    "Invalid date range",
  );
export const jobPageSchema = createCursorPageSchema(asyncJobSchema);

export const queueOverviewSchema = z.object({
  queues: z.array(
    z.object({
      queue: z.string().min(1),
      deadLetterQueue: z.string().min(1),
      maxAttempts: z.number().int().positive(),
      depth: z.number().int().nonnegative(),
      oldestSeconds: z.number().int().nonnegative().nullable(),
      deadLetters: z.number().int().nonnegative(),
      oldestDeadLetterSeconds: z.number().int().nonnegative().nullable(),
    }),
  ),
  jobs: z.record(jobStatusSchema, z.number().int().nonnegative()),
  outbox: z.object({
    pending: z.number().int().nonnegative(),
    failing: z.number().int().nonnegative(),
    oldestPendingSeconds: z.number().int().nonnegative().nullable(),
  }),
});

/** INT-004: support retry of a dead-lettered or failed job. */
export const jobRetryRequestSchema = z
  .object({ reason: z.string().trim().min(10).max(1000) })
  .strict();

/** Public `Job` resource of API.md (JOB-001): coarse states for account users. */
export const publicJobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);
export const publicJobSchema = z.object({
  id: uuid,
  type: z.string().min(1),
  status: publicJobStatusSchema,
  createdAt: timestamp,
  startedAt: timestamp.optional(),
  finishedAt: timestamp.optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  links: z.object({ self: z.string() }),
});

export const toPublicJobStatus = (
  status: z.infer<typeof jobStatusSchema>,
): z.infer<typeof publicJobStatusSchema> => {
  switch (status) {
    case "QUEUED":
      return "queued";
    case "RUNNING":
    case "RETRY_WAIT":
      return "processing";
    case "SUCCEEDED":
      return "completed";
    case "FAILED":
    case "DEAD_LETTER":
      return "failed";
  }
};

export const jobsOpenApi = {
  job: z.toJSONSchema(asyncJobSchema),
  detail: z.toJSONSchema(jobDetailSchema),
  page: z.toJSONSchema(jobPageSchema),
  query: z.toJSONSchema(jobQuerySchema),
  overview: z.toJSONSchema(queueOverviewSchema),
  retry: z.toJSONSchema(jobRetryRequestSchema),
  publicJob: z.toJSONSchema(publicJobSchema),
};

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type AsyncJob = z.infer<typeof asyncJobSchema>;
export type JobTransition = z.infer<typeof jobTransitionSchema>;
export type JobDetail = z.infer<typeof jobDetailSchema>;
export type JobQuery = z.infer<typeof jobQuerySchema>;
export type JobPage = z.infer<typeof jobPageSchema>;
export type QueueOverview = z.infer<typeof queueOverviewSchema>;
export type JobRetryRequest = z.infer<typeof jobRetryRequestSchema>;
export type PublicJob = z.infer<typeof publicJobSchema>;
