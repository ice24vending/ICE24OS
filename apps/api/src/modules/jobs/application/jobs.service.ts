import { authorize } from "@ice24/authorization";
import {
  jobQuerySchema,
  jobRetryRequestSchema,
  toPublicJobStatus,
  type PublicJob,
} from "@ice24/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import { JobNotFoundError, JobsPort, JobStateConflictError, type JobScope } from "./jobs.port.js";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

@Injectable()
export class JobsService {
  constructor(@Inject(JobsPort) private readonly jobs: JobsPort) {}

  /** Re-checks the guard decision and derives the data scope; filters never widen it. */
  private scope(
    request: SecurityRequest,
    permission: "jobs.read" | "jobs.admin-read" | "jobs.retry",
  ): JobScope {
    const subject = request.authorizationSubject;
    const global = permission !== "jobs.read";
    if (
      !subject ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission,
        classification: global ? "RESTRICTED" : "CONFIDENTIAL",
        operation: permission === "jobs.retry" ? "WRITE" : "READ",
        requiresMfa: global,
      }).allowed
    )
      throw new ForbiddenException("Job permission required");
    if (global && !subject.accountWide) throw new ForbiddenException("Global scope required");
    return { accountId: global ? null : subject.membershipAccountId };
  }

  list(request: SecurityRequest, input: unknown) {
    return this.jobs.list(this.scope(request, "jobs.admin-read"), jobQuerySchema.parse(input));
  }

  async detail(request: SecurityRequest, id: string) {
    const job = await this.jobs.detail(this.scope(request, "jobs.admin-read"), id);
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  overview(request: SecurityRequest) {
    this.scope(request, "jobs.admin-read");
    return this.jobs.overview();
  }

  /** JOB-001: coarse public view limited to the active account. */
  async publicJob(request: SecurityRequest, id: string): Promise<PublicJob> {
    const job = await this.jobs.detail(this.scope(request, "jobs.read"), id);
    if (!job) throw new NotFoundException("Job not found");
    const status = toPublicJobStatus(job.status);
    return {
      id: job.id,
      type: job.type,
      status,
      createdAt: job.createdAt,
      ...(job.startedAt ? { startedAt: job.startedAt } : {}),
      ...(job.finishedAt ? { finishedAt: job.finishedAt } : {}),
      ...(status === "failed"
        ? {
            error: {
              code: job.errorCode ?? "JOB_FAILED",
              message: job.errorDetail ?? "El trabajo no pudo completarse.",
            },
          }
        : {}),
      links: { self: `/api/v1/jobs/${job.id}` },
    };
  }

  /** INT-004: audited re-queue of a dead-lettered or failed job. */
  async retry(request: SecurityRequest, id: string, idempotencyKey: unknown, body: unknown) {
    this.scope(request, "jobs.retry");
    if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey))
      throw new BadRequestException("Idempotency-Key header required");
    const { reason } = jobRetryRequestSchema.parse(body);
    const actorUserId = request.localUser?.id;
    if (!actorUserId) throw new ForbiddenException("Authenticated actor required");
    const context = getHeader(request, "x-ice24-context-id");
    try {
      return await this.jobs.retry({
        jobId: id,
        actorUserId,
        contextSessionId: context !== undefined && UUID.test(context) ? context : null,
        reason,
        idempotencyKey,
        correlationId: request.correlationId ?? crypto.randomUUID(),
      });
    } catch (error) {
      if (error instanceof JobNotFoundError) throw new NotFoundException("Job not found");
      if (error instanceof JobStateConflictError)
        throw new ConflictException("Job is not in a retryable state");
      throw error;
    }
  }
}
