import { auditOpenApi } from "@ice24/contracts";
import {
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
  UseFilters,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { ApiResponseSchemaHost } from "@nestjs/swagger";
import { applyDecorators } from "@nestjs/common";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { AuditService } from "../application/audit.service.js";
import { AuditErrorFilter } from "./audit-error.filter.js";

const queryJson = auditOpenApi.query;
type SchemaObject = ApiResponseSchemaHost["schema"];
function AuditQueries() {
  return applyDecorators(
    ...Object.entries(queryJson.properties ?? {}).map(([name, schema]) =>
      ApiQuery({ name, required: false, schema: schema as SchemaObject }),
    ),
  );
}

@ApiTags("audit")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid filter, identifier or cursor" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Audit permission or scope denied" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(AuditErrorFilter)
@Controller()
export class AuditController {
  constructor(@Inject(AuditService) private readonly service: AuditService) {}

  @Get("audit-events")
  @Header("Cache-Control", "no-store")
  @RequirePermission({ permission: "audit.read", classification: "RESTRICTED", operation: "READ" })
  @ApiOperation({
    summary: "List immutable audit events within the active account and resource scope",
  })
  @AuditQueries()
  @ApiResponse({ status: 200, schema: auditOpenApi.page as SchemaObject })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.service.list(request, query);
  }

  @Get("audit-events/:eventId")
  @Header("Cache-Control", "no-store")
  @RequirePermission({ permission: "audit.read", classification: "RESTRICTED", operation: "READ" })
  @ApiOperation({ summary: "Read an audit event in the active account and resource scope" })
  @ApiResponse({ status: 200, schema: auditOpenApi.event as SchemaObject })
  @ApiResponse({ status: 404, description: "Event missing or outside authorized scope" })
  detail(@Req() request: SecurityRequest, @Param("eventId", ParseUUIDPipe) id: string) {
    return this.service.detail(request, id);
  }

  @Get("admin/audit-events")
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: "audit.global-read",
    classification: "RESTRICTED",
    operation: "READ",
    requiresMfa: true,
  })
  @ApiOperation({
    summary:
      "List global ICE24 audit; explicit global permission, account-wide scope and MFA required",
  })
  @AuditQueries()
  @ApiResponse({ status: 200, schema: auditOpenApi.page as SchemaObject })
  global(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.service.list(request, query, true);
  }
}
