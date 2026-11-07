import {
  Body,
  Controller,
  Header,
  HttpException,
  Inject,
  Param,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiResponse,
  ApiTags,
  type ApiResponseSchemaHost,
} from "@nestjs/swagger";
import { synchronizationOpenApi, type OfflineSyncResult } from "@ice24/contracts";
import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../common/authorization/authorization.guard.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { MaintenanceErrorFilter } from "../maintenance/scheduling/scheduling-error.filter.js";
import { OfflineOrders } from "../work-orders/application/offline-orders.js";
const schema = (name: string) => synchronizationOpenApi[name] as ApiResponseSchemaHost["schema"];
const policy = (action: "execute" | "assign") =>
  RequirePermission({
    permission: `maintenance.orders-${action}`,
    classification: "CONFIDENTIAL",
    operation: "WRITE",
  });
@ApiTags("synchronization")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true })
@ApiHeader({ name: "If-Match", required: true })
@ApiHeader({ name: "Idempotency-Key", required: true })
@ApiResponse({ status: 403, description: "FORBIDDEN or ACCOUNT_READ_ONLY" })
@ApiResponse({ status: 409, description: "CONFLICT: lease, state or version changed" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(MaintenanceErrorFilter)
@Controller("synchronization")
export class SynchronizationController {
  constructor(@Inject(OfflineOrders) private readonly orders: OfflineOrders) {}
  @Post("orders/:id/download")
  @Header("Cache-Control", "no-store")
  @policy("execute")
  @ApiBody({ schema: schema("download") })
  @ApiResponse({ status: 201, schema: schema("package") })
  download(@Req() request: SecurityRequest, @Param("id") id: string, @Body() input: unknown) {
    return this.orders.download(request, id, input);
  }
  @Post("orders/:id/release")
  @Header("Cache-Control", "no-store")
  @policy("assign")
  @ApiBody({ schema: schema("release") })
  release(@Req() request: SecurityRequest, @Param("id") id: string, @Body() input: unknown) {
    return this.orders.release(request, id, input);
  }
  @Post("operations")
  @Header("Cache-Control", "no-store")
  @policy("execute")
  @ApiBody({ schema: schema("operation") })
  @ApiResponse({ status: 201, schema: schema("result") })
  async synchronize(
    @Req() request: SecurityRequest,
    @Body() input: unknown,
  ): Promise<OfflineSyncResult> {
    try {
      return { status: "accepted", order: await this.orders.synchronize(request, input) };
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;
      const status = error.getStatus();
      return {
        status:
          status === 409
            ? "conflict"
            : status >= 500 || status === 429
              ? "retryable_error"
              : "permanent_error",
        message: error.message,
      };
    }
  }
}
