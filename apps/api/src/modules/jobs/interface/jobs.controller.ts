import { jobsOpenApi } from "@ice24/contracts";
import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiResponseSchemaHost } from "@nestjs/swagger";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { JobsService } from "../application/jobs.service.js";
import { JobsErrorFilter } from "./jobs-error.filter.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
function JobQueries() {
  return applyDecorators(
    ...Object.entries(jobsOpenApi.query.properties ?? {}).map(([name, schema]) =>
      ApiQuery({ name, required: false, schema: schema as SchemaObject }),
    ),
  );
}
const adminRead = RequirePermission({
  permission: "jobs.admin-read",
  classification: "RESTRICTED",
  operation: "READ",
  requiresMfa: true,
});

@ApiTags("jobs")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid filter, identifier, cursor or retry request" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Job permission, MFA or scope denied" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(JobsErrorFilter)
@Controller()
export class JobsController {
  constructor(@Inject(JobsService) private readonly service: JobsService) {}

  @Get("jobs/:jobId")
  @Header("Cache-Control", "no-store")
  @RequirePermission({ permission: "jobs.read", classification: "CONFIDENTIAL", operation: "READ" })
  @ApiOperation({ summary: "JOB-001: progress of a job of the active account" })
  @ApiResponse({ status: 200, schema: jobsOpenApi.publicJob as SchemaObject })
  @ApiResponse({ status: 404, description: "Job missing or outside the active account" })
  publicJob(@Req() request: SecurityRequest, @Param("jobId", ParseUUIDPipe) id: string) {
    return this.service.publicJob(request, id);
  }

  @Get("admin/jobs")
  @Header("Cache-Control", "no-store")
  @adminRead
  @ApiOperation({ summary: "Job center: list jobs; global permission, account-wide scope and MFA" })
  @JobQueries()
  @ApiResponse({ status: 200, schema: jobsOpenApi.page as SchemaObject })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.service.list(request, query);
  }

  @Get("admin/job-queues")
  @Header("Cache-Control", "no-store")
  @adminRead
  @ApiOperation({ summary: "Job center: queue depth, dead letters, job states and outbox backlog" })
  @ApiResponse({ status: 200, schema: jobsOpenApi.overview as SchemaObject })
  overview(@Req() request: SecurityRequest) {
    return this.service.overview(request);
  }

  @Get("admin/jobs/:jobId")
  @Header("Cache-Control", "no-store")
  @adminRead
  @ApiOperation({ summary: "Job center: job detail with its state history" })
  @ApiResponse({ status: 200, schema: jobsOpenApi.detail as SchemaObject })
  @ApiResponse({ status: 404, description: "Job not found" })
  detail(@Req() request: SecurityRequest, @Param("jobId", ParseUUIDPipe) id: string) {
    return this.service.detail(request, id);
  }

  @Post("admin/jobs/:jobId/retry")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: "jobs.retry",
    classification: "RESTRICTED",
    operation: "WRITE",
    requiresMfa: true,
  })
  @ApiOperation({
    summary:
      "INT-004: re-queue a dead-lettered or failed job; audited, idempotent, reason required",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", minLength: 8, maxLength: 128 },
  })
  @ApiHeader({
    name: "If-Match",
    required: true,
    description: 'Expected job rowVersion (W/"n" or n); a replayed Idempotency-Key skips it',
  })
  @ApiBody({ schema: jobsOpenApi.retry as SchemaObject })
  @ApiResponse({ status: 202, schema: jobsOpenApi.job as SchemaObject })
  @ApiResponse({ status: 404, description: "Job not found" })
  @ApiResponse({ status: 409, description: "Job not retryable or its dead letter is gone" })
  @ApiResponse({ status: 412, description: "Job changed since it was read (If-Match mismatch)" })
  retry(
    @Req() request: SecurityRequest,
    @Param("jobId", ParseUUIDPipe) id: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.retry(request, id, idempotencyKey, body);
  }
}
