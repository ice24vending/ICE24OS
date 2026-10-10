import { frequencyOverridesOpenApi } from "@ice24/contracts";
import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { FrequencyOverridesErrorFilter } from "./equipment-error.filter.js";
import { FrequencyOverridesStore } from "./frequency-overrides.store.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
const schema = (value: unknown) => value as SchemaObject;
const mutation = applyDecorators(
  Header("Cache-Control", "no-store"),
  ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", minLength: 8, maxLength: 200 },
  }),
  ApiResponse({
    status: 403,
    description: "Account: owner only. Machine: owner or Operator of its branch (RA-01-D2)",
  }),
  ApiResponse({ status: 404, description: "Machine or activity outside the active account" }),
  ApiResponse({
    status: 409,
    description: "Already defined, retired machine or idempotency conflict",
  }),
);
const set = applyDecorators(
  mutation,
  ApiBody({ schema: schema(frequencyOverridesOpenApi.set) }),
  ApiResponse({ status: 200, schema: schema(frequencyOverridesOpenApi.override) }),
  ApiResponse({
    status: 422,
    description:
      "WARRANTY_WARNING_CONFIRMATION_REQUIRED: differs from the ICE24 factory value (RA-01-D1)",
  }),
);
const edit = applyDecorators(
  set,
  ApiHeader({ name: "If-Match", required: true, description: 'Expected version (W/"n" or n)' }),
  ApiResponse({ status: 412, description: "Version conflict" }),
);
const reset = applyDecorators(
  mutation,
  ApiBody({ schema: schema(frequencyOverridesOpenApi.reset) }),
  ApiResponse({ status: 200, schema: schema(frequencyOverridesOpenApi.resetResult) }),
);

/**
 * TASK-F4-20: client maintenance and sanitation frequencies (RF-TPL-015). Effective values are
 * part of the machine file: GET /v1/machines/{id}/frequencies. Changes never touch the sanitary
 * indicator nor the public portal (RA-01-D4) and do not recalculate calendars (F4-21).
 */
@ApiTags("frequency-overrides")
@ApiAccountWriteProtection()
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid input, If-Match or Idempotency-Key" })
@ApiResponse({ status: 401, description: "Authentication required" })
@UseGuards(AuthenticationGuard)
@UseFilters(FrequencyOverridesErrorFilter)
@Controller()
export class FrequencyOverridesController {
  constructor(@Inject(FrequencyOverridesStore) private readonly store: FrequencyOverridesStore) {}

  @Get("account-frequency-overrides")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Current account-level frequencies" })
  @ApiResponse({ status: 200, schema: schema(frequencyOverridesOpenApi.overrides) })
  listAccount(@Req() r: SecurityRequest) {
    return this.store.listAccount(r);
  }

  @Post("account-frequency-overrides")
  @HttpCode(201)
  @set
  @ApiOperation({ summary: "Define the frequency of an activity for the whole account" })
  createAccount(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.store.set(r, "ACCOUNT", null, b, "create");
  }

  @Put("account-frequency-overrides")
  @HttpCode(200)
  @edit
  @ApiOperation({ summary: "Edit an account-level frequency; the previous version is kept" })
  updateAccount(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.store.set(r, "ACCOUNT", null, b, "update");
  }

  @Post("account-frequency-overrides/reset")
  @HttpCode(200)
  @reset
  @ApiOperation({ summary: "Restore factory values for the account (all or one target)" })
  resetAccount(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.store.reset(r, "ACCOUNT", null, b);
  }

  @Post("machines/:machineId/frequency-overrides")
  @HttpCode(201)
  @set
  @ApiOperation({ summary: "Define the frequency of an activity on one machine" })
  createMachine(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Body() b: unknown,
  ) {
    return this.store.set(r, "MACHINE", machineId, b, "create");
  }

  @Put("machines/:machineId/frequency-overrides")
  @HttpCode(200)
  @edit
  @ApiOperation({ summary: "Edit a machine frequency; the previous version is kept" })
  updateMachine(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Body() b: unknown,
  ) {
    return this.store.set(r, "MACHINE", machineId, b, "update");
  }

  @Post("machines/:machineId/frequency-overrides/reset")
  @HttpCode(200)
  @reset
  @ApiOperation({ summary: "Restore factory values for the machine, a component or an activity" })
  resetMachine(
    @Req() r: SecurityRequest,
    @Param("machineId", ParseUUIDPipe) machineId: string,
    @Body() b: unknown,
  ) {
    return this.store.reset(r, "MACHINE", machineId, b);
  }
}
