import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
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
  type ApiResponseSchemaHost,
} from "@nestjs/swagger";
import { ticketsOpenApi } from "@ice24/contracts";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { MaintenanceErrorFilter } from "../../maintenance/scheduling/scheduling-error.filter.js";
import { TicketsStore } from "../infrastructure/tickets.store.js";

const policy = (action: "read" | "create" | "edit") =>
  RequirePermission({
    permission: `maintenance.tickets-${action}`,
    classification: "CONFIDENTIAL",
    operation: action === "read" ? "READ" : "WRITE",
  });
const schema = (key: string) => ticketsOpenApi[key] as ApiResponseSchemaHost["schema"];
@ApiTags("tickets")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true })
@ApiResponse({ status: 400, description: "VALIDATION_FAILED" })
@ApiResponse({ status: 401, description: "AUTHENTICATION_REQUIRED" })
@ApiResponse({ status: 403, description: "FORBIDDEN or ACCOUNT_READ_ONLY" })
@ApiResponse({ status: 404, description: "NOT_FOUND within the active scope" })
@ApiResponse({ status: 409, description: "CONFLICT: expected version, state or idempotency input" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(MaintenanceErrorFilter)
@Controller("tickets")
export class TicketsController {
  constructor(@Inject(TicketsStore) private readonly store: TicketsStore) {}
  @Get()
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiOperation({ summary: "List tickets within account and branch/machine scope" })
  @ApiQuery({ name: "machineId", required: false, type: String })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "1–100, default 50" })
  @ApiResponse({ status: 200, schema: schema("page") })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.store.list(request, query);
  }
  @Get("options/:machineId")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiResponse({ status: 200, schema: schema("options") })
  options(@Req() request: SecurityRequest, @Param("machineId") id: string) {
    return this.store.options(request, id);
  }
  @Get(":id")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiResponse({ status: 200, schema: schema("detail") })
  detail(@Req() request: SecurityRequest, @Param("id") id: string) {
    return this.store.detail(request, id);
  }
  @Post()
  @Header("Cache-Control", "no-store")
  @policy("create")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: schema("create") })
  @ApiResponse({ status: 201, schema: schema("ticket") })
  create(@Req() request: SecurityRequest, @Body() body: unknown) {
    return this.store.create(request, body);
  }
  @Post(":id/diagnosis")
  @Header("Cache-Control", "no-store")
  @policy("edit")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiBody({ schema: schema("diagnosis") })
  @ApiResponse({ status: 201, schema: schema("ticket") })
  diagnose(@Req() request: SecurityRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.store.diagnose(request, id, body);
  }
}
