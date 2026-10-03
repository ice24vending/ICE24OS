import { filesOpenApi, jobsOpenApi } from "@ice24/contracts";
import {
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
  Req,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiResponseSchemaHost } from "@nestjs/swagger";
import { AllowReadOnlyOperation } from "../../../common/authorization/account-write.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { FilesService } from "../application/files.service.js";
import { FilesErrorFilter } from "./files-error.filter.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
const upload = RequirePermission({
  permission: "files.upload",
  classification: "CONFIDENTIAL",
  operation: "WRITE",
});
const read = RequirePermission({
  permission: "files.read",
  classification: "CONFIDENTIAL",
  operation: "READ",
});
const IdempotencyKey = () =>
  ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", minLength: 8, maxLength: 128 },
  });

@ApiTags("files")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid body, identifier or idempotency key" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "File permission denied or account read-only" })
@ApiResponse({ status: 503, description: "Private storage unavailable" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(FilesErrorFilter)
@Controller("files")
export class FilesController {
  constructor(@Inject(FilesService) private readonly service: FilesService) {}

  @Post("upload-sessions")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  @upload
  @ApiOperation({
    summary:
      "FIL-001: pre-authorize one direct PUT to private quarantine storage under the account prefix",
  })
  @IdempotencyKey()
  @ApiBody({ schema: filesOpenApi.createUploadSession as SchemaObject })
  @ApiResponse({ status: 201, schema: filesOpenApi.uploadSession as SchemaObject })
  @ApiResponse({ status: 404, description: "Related resource missing or outside scope" })
  @ApiResponse({ status: 409, description: "Idempotency key reused or session closed" })
  @ApiResponse({ status: 413, description: "PAYLOAD_TOO_LARGE" })
  @ApiResponse({ status: 415, description: "UNSUPPORTED_MEDIA_TYPE" })
  createUploadSession(
    @Req() request: SecurityRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.createUploadSession(request, idempotencyKey, body);
  }

  @Post(":fileId/complete-upload")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  @upload
  @ApiOperation({
    summary: "FIL-002: confirm the upload; the file stays in quarantine until the scan job ends",
  })
  @IdempotencyKey()
  @ApiBody({ schema: filesOpenApi.completeUpload as SchemaObject })
  @ApiResponse({ status: 202, schema: jobsOpenApi.publicJob as SchemaObject })
  @ApiResponse({ status: 404, description: "Upload session not found for this actor and account" })
  @ApiResponse({ status: 409, description: "STATE_TRANSITION_INVALID: session closed or expired" })
  @ApiResponse({ status: 422, description: "FILE_UPLOAD_MISMATCH: token, size, type or object" })
  completeUpload(
    @Req() request: SecurityRequest,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.completeUpload(request, fileId, idempotencyKey, body);
  }

  @Get(":fileId")
  @Header("Cache-Control", "no-store")
  @read
  @ApiOperation({ summary: "FIL-003: file metadata in the active account and scope" })
  @ApiResponse({ status: 200, schema: filesOpenApi.fileObject as SchemaObject })
  @ApiResponse({ status: 404, description: "File missing or outside scope" })
  getFile(@Req() request: SecurityRequest, @Param("fileId", ParseUUIDPipe) fileId: string) {
    return this.service.getFile(request, fileId);
  }

  @Post(":fileId/download-sessions")
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  @read
  @AllowReadOnlyOperation("protected-download")
  @ApiOperation({
    summary: "FIL-004: audited temporary read URL (≤15 min) of a verified file; never public",
  })
  @IdempotencyKey()
  @ApiBody({ schema: filesOpenApi.downloadSessionRequest as SchemaObject })
  @ApiResponse({ status: 201, schema: filesOpenApi.downloadSession as SchemaObject })
  @ApiResponse({ status: 404, description: "File missing or outside scope" })
  @ApiResponse({ status: 409, description: "FILE_NOT_AVAILABLE: pending, quarantined or rejected" })
  createDownloadSession(
    @Req() request: SecurityRequest,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.createDownloadSession(request, fileId, idempotencyKey, body);
  }

  @Post(":fileId/abort")
  @HttpCode(204)
  @Header("Cache-Control", "no-store")
  @upload
  @ApiOperation({ summary: "FIL-005: abort a pending upload of the actor" })
  @IdempotencyKey()
  @ApiBody({ schema: filesOpenApi.abortUpload as SchemaObject })
  @ApiResponse({ status: 204, description: "Upload aborted" })
  @ApiResponse({ status: 409, description: "STATE_TRANSITION_INVALID" })
  abort(
    @Req() request: SecurityRequest,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    return this.service.abortUpload(request, fileId, idempotencyKey, body);
  }
}
