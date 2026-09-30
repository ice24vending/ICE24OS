import { Body, Controller, Header, Inject, Post, Req, UseFilters, UseGuards } from "@nestjs/common";
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
import { BillingService } from "../application/billing.service.js";
import { SubscriptionsErrorFilter } from "./subscriptions-error.filter.js";

@ApiTags("subscriptions")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true })
@ApiHeader({
  name: "Idempotency-Key",
  required: true,
  schema: { type: "string", minLength: 8, maxLength: 200 },
})
@ApiResponse({
  status: 201,
  schema: {
    type: "object",
    required: ["url", "expiresAt", "accountId"],
    properties: {
      url: { type: "string", format: "uri" },
      expiresAt: { type: "string", format: "date-time", nullable: true },
      accountId: { type: "string", format: "uuid" },
    },
  },
})
@ApiResponse({ status: 400, description: "Invalid body, headers or return URL" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Active account owner required" })
@ApiResponse({ status: 409, description: "State or idempotency conflict" })
@ApiResponse({ status: 503, description: "Stripe unavailable or not configured" })
@UseGuards(AuthenticationGuard)
@UseFilters(SubscriptionsErrorFilter)
@Controller("subscription")
export class BillingController {
  constructor(@Inject(BillingService) private readonly service: BillingService) {}
  @Post("checkout")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Create hosted Checkout for an owner; demo data is never converted" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["returnUrl", "cancelUrl"],
      properties: {
        returnUrl: { type: "string", format: "uri" },
        cancelUrl: { type: "string", format: "uri" },
      },
    },
  })
  checkout(@Req() request: SecurityRequest, @Body() body: unknown) {
    return this.service.checkout(request, body);
  }
  @Post("portal")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Create customer billing portal; expiration is not exposed by Stripe" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["returnUrl"],
      properties: { returnUrl: { type: "string", format: "uri" } },
    },
  })
  portal(@Req() request: SecurityRequest, @Body() body: unknown) {
    return this.service.portal(request, body);
  }
}
