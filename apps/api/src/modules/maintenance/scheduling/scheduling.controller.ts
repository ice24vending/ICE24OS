import { Controller, Get, Header, Inject, Query, Req, UseGuards, UseFilters } from "@nestjs/common";
import { MaintenanceErrorFilter } from "./scheduling-error.filter.js";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  type ApiResponseSchemaHost,
} from "@nestjs/swagger";
import { maintenanceOpenApi } from "@ice24/contracts";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { MaintenanceStore } from "./scheduling.store.js";

@ApiTags("maintenance")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(MaintenanceErrorFilter)
@ApiResponse({ status: 400, description: "VALIDATION_FAILED" })
@ApiResponse({ status: 401, description: "AUTHENTICATION_REQUIRED" })
@ApiResponse({ status: 403, description: "FORBIDDEN: module disabled or no permission" })
@Controller("maintenance")
export class MaintenanceController {
  constructor(@Inject(MaintenanceStore) private readonly store: MaintenanceStore) {}
  @Get("activities")
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: "maintenance.read",
    classification: "CONFIDENTIAL",
    operation: "READ",
  })
  @ApiOperation({ summary: "Scheduled maintenance scoped by account, branch and machine" })
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["scheduled", "upcoming", "overdue", "critical", "in_progress", "completed", "cancelled"],
  })
  @ApiQuery({ name: "machineId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  @ApiQuery({ name: "assigneeId", required: false })
  @ApiQuery({ name: "period", required: false, enum: ["next7days"] })
  @ApiQuery({ name: "cursor", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, schema: maintenanceOpenApi.page as ApiResponseSchemaHost["schema"] })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.store.list(request, query);
  }

  @Get("summary")
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: "maintenance.read",
    classification: "CONFIDENTIAL",
    operation: "READ",
  })
  @ApiOperation({ summary: "Count pending maintenance due in the next seven local calendar days" })
  @ApiQuery({ name: "machineId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  @ApiResponse({
    status: 200,
    schema: maintenanceOpenApi.summary as ApiResponseSchemaHost["schema"],
  })
  summary(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.store.summary(request, query);
  }
}
