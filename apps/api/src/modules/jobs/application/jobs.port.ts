import type { AsyncJob, JobDetail, JobPage, JobQuery, QueueOverview } from "@ice24/contracts";

/** accountId null means the global ICE24 scope (support center). */
export interface JobScope {
  accountId: string | null;
}
export interface JobRetryCommand {
  jobId: string;
  actorUserId: string;
  contextSessionId: string | null;
  reason: string;
  /** Row version the caller saw (If-Match); a replayed idempotency key skips the check. */
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
}
export class JobNotFoundError extends Error {}
export class JobStateConflictError extends Error {}
export class JobVersionConflictError extends Error {}
export abstract class JobsPort {
  abstract list(scope: JobScope, query: JobQuery): Promise<JobPage>;
  abstract detail(scope: JobScope, id: string): Promise<JobDetail | null>;
  abstract overview(): Promise<QueueOverview>;
  abstract retry(command: JobRetryCommand): Promise<AsyncJob>;
}
