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
import { workOrdersOpenApi, workOrderSourceSchema, executionOpenApi } from "@ice24/contracts";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { MaintenanceErrorFilter } from "../../maintenance/scheduling/scheduling-error.filter.js";
import { WorkOrdersStore } from "../infrastructure/work-orders.store.js";
const policy = (action: "read" | "assign") =>
  RequirePermission({
    permission: `maintenance.orders-${action}`,
    classification: "CONFIDENTIAL",
    operation: action === "read" ? "READ" : "WRITE",
  });
const schema = (key: string) => workOrdersOpenApi[key] as ApiResponseSchemaHost["schema"];
@ApiTags("work-orders")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true })
@ApiResponse({ status: 400, description: "VALIDATION_FAILED" })
@ApiResponse({ status: 403, description: "FORBIDDEN or ACCOUNT_READ_ONLY" })
@ApiResponse({ status: 404, description: "NOT_FOUND within scope" })
@ApiResponse({ status: 409, description: "CONFLICT: version, state, prerequisites or idempotency" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(MaintenanceErrorFilter)
@Controller("work-orders")
export class WorkOrdersController {
  constructor(@Inject(WorkOrdersStore) private readonly store: WorkOrdersStore) {}
  @Get(":id/execution")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiResponse({ status: 200, schema: executionOpenApi.detail as ApiResponseSchemaHost["schema"] })
  execution(@Req() r: SecurityRequest, @Param("id") id: string) {
    return this.store.execution(r, id);
  }
  @Post(":id/execution")
  @Header("Cache-Control", "no-store")
  @RequirePermission({
    permission: "maintenance.orders-execute",
    classification: "CONFIDENTIAL",
    operation: "WRITE",
  })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: executionOpenApi.execution as ApiResponseSchemaHost["schema"] })
  @ApiResponse({ status: 201, schema: schema("order") })
  saveExecution(@Req() r: SecurityRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.store.saveExecution(r, id, body);
  }
  @Post(":id/reviews")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiHeader({ name: "If-Match", required: true })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: executionOpenApi.review as ApiResponseSchemaHost["schema"] })
  @ApiResponse({ status: 201, schema: schema("order") })
  review(@Req() r: SecurityRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.store.review(r, id, body);
  }
  @Get()
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiOperation({ summary: "List scoped work orders; downloaded remains empty until F7-10" })
  @ApiQuery({ name: "view", required: false, enum: ["assigned", "pending", "downloaded"] })
  @ApiQuery({ name: "state", required: false, type: String })
  @ApiQuery({ name: "machineId", required: false, type: String })
  @ApiQuery({ name: "assigneeId", required: false, type: String })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, schema: schema("page") })
  list(@Req() r: SecurityRequest, @Query() q: unknown) {
    return this.store.list(r, q);
  }
  @Get("options/:type/:id")
  @Header("Cache-Control", "no-store")
  @policy("assign")
  @ApiResponse({ status: 200, schema: schema("options") })
  options(@Req() r: SecurityRequest, @Param("type") type: string, @Param("id") id: string) {
    return this.store.options(r, workOrderSourceSchema.parse(type), id);
  }
  @Get(":id")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiResponse({ status: 200, schema: schema("detail") })
  detail(@Req() r: SecurityRequest, @Param("id") id: string) {
    return this.store.detail(r, id);
  }
  @Post()
  @Header("Cache-Control", "no-store")
  @policy("assign")
  @ApiHeader({ name: "If-Match", required: true, description: "Source row version" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: schema("create") })
  @ApiResponse({ status: 201, schema: schema("order") })
  create(@Req() r: SecurityRequest, @Body() body: unknown) {
    return this.store.create(r, body);
  }
  @Post(":id/assignment")
  @Header("Cache-Control", "no-store")
  @policy("assign")
  @ApiHeader({ name: "If-Match", required: true })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: schema("assignment") })
  @ApiResponse({ status: 201, schema: schema("order") })
  assign(@Req() r: SecurityRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.store.assign(r, id, body);
  }
  // Read gate resolves context; the transactional command checks the action-specific WRITE permission.
  @Post(":id/transitions")
  @Header("Cache-Control", "no-store")
  @policy("read")
  @ApiHeader({ name: "If-Match", required: true })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiBody({ schema: schema("transition") })
  @ApiResponse({ status: 201, schema: schema("order") })
  transition(@Req() r: SecurityRequest, @Param("id") id: string, @Body() body: unknown) {
    return this.store.transition(r, id, body);
  }
}
