import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UseFilters,
  HttpCode,
  Header,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { SubscriptionsService } from "../application/subscriptions.service.js";
import { subscriptionOpenApiSchema } from "./subscriptions.openapi.js";
import { SubscriptionsErrorFilter } from "./subscriptions-error.filter.js";

@ApiTags("subscriptions")
@ApiBearerAuth()
@ApiHeader({
  name: "X-ICE24-Context-Id",
  required: true,
  description: "Active account context UUID",
})
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Account scope or permission denied" })
@ApiResponse({ status: 404, description: "Subscription unavailable in this context" })
@UseGuards(AuthenticationGuard)
@UseFilters(SubscriptionsErrorFilter)
@Controller()
export class SubscriptionsController {
  constructor(@Inject(SubscriptionsService) private readonly service: SubscriptionsService) {}
  @Get("subscription")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Read subscription and effective access for the active account" })
  @ApiResponse({ status: 200, schema: subscriptionOpenApiSchema })
  read(@Req() request: SecurityRequest) {
    return this.service.read(request);
  }

  @Post("admin/demos/:demoId/extend")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Extend demo expiry; requires ICE24 administrator, account scope and MFA",
  })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    schema: { type: "string", minLength: 8, maxLength: 200 },
  })
  @ApiHeader({
    name: "If-Match",
    required: true,
    description: "Expected positive subscription version",
  })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["newExpiresAt", "reason"],
      properties: {
        newExpiresAt: { type: "string", format: "date-time" },
        reason: { type: "string", minLength: 10, maxLength: 1000 },
      },
    },
  })
  @ApiResponse({ status: 200, schema: subscriptionOpenApiSchema })
  @ApiResponse({ status: 400, description: "Invalid input or missing headers" })
  @ApiResponse({ status: 409, description: "Version, idempotency or transition conflict" })
  extend(
    @Req() request: SecurityRequest,
    @Param("demoId", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    return this.service.extendDemo(request, id, body);
  }
}
