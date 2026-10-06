import { integrationLogsOpenApi } from "@ice24/contracts";
import {
  applyDecorators,
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Req,
  UseFilters,
  UseGuards,
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
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import {
  INTEGRATION_LOGS_PERMISSION,
  IntegrationLogsService,
} from "../application/integration-logs.service.js";
import { IntegrationLogsErrorFilter } from "./integration-logs-error.filter.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
function IntegrationLogQueries() {
  return applyDecorators(
    ...Object.entries(integrationLogsOpenApi.query.properties ?? {}).map(([name, schema]) =>
      ApiQuery({ name, required: false, schema: schema as SchemaObject }),
    ),
  );
}

@ApiTags("integration-logs")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid filter or cursor" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Integration log permission or MFA denied" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(IntegrationLogsErrorFilter)
@Controller()
export class IntegrationLogsController {
  constructor(@Inject(IntegrationLogsService) private readonly service: IntegrationLogsService) {}

  @Get("admin/integration-logs")
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: INTEGRATION_LOGS_PERMISSION,
    classification: "RESTRICTED",
    operation: "READ",
    requiresMfa: true,
  })
  @ApiOperation({
    summary:
      "RF-ADM-009: redacted integration logs by correlation, integration, status or account; " +
      "account-wide ICE24 scope reads every account, any other scope only its active account",
  })
  @IntegrationLogQueries()
  @ApiResponse({ status: 200, schema: integrationLogsOpenApi.page as SchemaObject })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.service.list(request, query);
  }
}
