import { machineComponentsOpenApi } from "@ice24/contracts";
import {
  applyDecorators,
  Body,
  Controller,
  Header,
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
  type ApiResponseSchemaHost,
} from "@nestjs/swagger";
import { ApiAccountWriteProtection } from "../../common/authorization/account-write.openapi.js";
import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { MachineComponentsErrorFilter } from "./equipment-error.filter.js";
import { MachineComponentsStore } from "./machine-components.store.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
const schema = (value: unknown) => value as SchemaObject;
const mutation = applyDecorators(
  Header("Cache-Control", "no-store"),
  ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", minLength: 8, maxLength: 200 },
  }),
  ApiResponse({ status: 200, schema: schema(machineComponentsOpenApi.config) }),
  ApiResponse({
    status: 403,
    description: "Not the owner nor an Operator of the machine's branch (RA-01-D2)",
  }),
  ApiResponse({ status: 404, description: "Machine or component outside the active account" }),
  ApiResponse({
    status: 409,
    description: "Already configured, retired component or machine, or idempotency conflict",
  }),
);
const transition = applyDecorators(
  mutation,
  ApiHeader({ name: "If-Match", required: true, description: 'Expected version (W/"n" or n)' }),
  ApiBody({ schema: schema(machineComponentsOpenApi.transition) }),
  ApiResponse({ status: 412, description: "Version conflict" }),
);

/** TASK-F4-19: choose the components of a machine (RF-TPL-014). Reading is part of the machine
 * file: GET /v1/machines/{id}/components. */
@ApiTags("machine-components")
@ApiAccountWriteProtection()
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid input, If-Match or Idempotency-Key" })
@ApiResponse({ status: 401, description: "Authentication required" })
@UseGuards(AuthenticationGuard)
@UseFilters(MachineComponentsErrorFilter)
@Controller("machines/:machineId/components")
export class MachineComponentsController {
  constructor(@Inject(MachineComponentsStore) private readonly store: MachineComponentsStore) {}

  @Post()
  @HttpCode(201)
  @mutation
  @ApiOperation({ summary: "Add an official or own catalog component to the machine" })
  @ApiBody({ schema: schema(machineComponentsOpenApi.add) })
  add(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Body() b: unknown,
  ) {
    return this.store.add(r, machineId, b);
  }

  @Post(":componentId/activate")
  @HttpCode(200)
  @transition
  @ApiOperation({ summary: "Activate a configured component; audited with previous value" })
  activate(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Param("componentId", ParseUUIDPipe) componentId: string,
    @Body() b: unknown,
  ) {
    return this.store.transition(r, machineId, componentId, b, "activate");
  }

  @Post(":componentId/deactivate")
  @HttpCode(200)
  @transition
  @ApiOperation({ summary: "Deactivate a component that does not apply; history is kept" })
  deactivate(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Param("componentId", ParseUUIDPipe) componentId: string,
    @Body() b: unknown,
  ) {
    return this.store.transition(r, machineId, componentId, b, "deactivate");
  }
}
