import {
  Controller,
  Header,
  HttpCode,
  Inject,
  Post,
  Req,
  UseFilters,
  type RawBodyRequest,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WebhooksService } from "../application/webhooks.service.js";
import { SubscriptionsErrorFilter } from "./subscriptions-error.filter.js";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";

@ApiTags("stripe-webhooks")
@UseFilters(SubscriptionsErrorFilter)
@Controller("webhooks/stripe")
export class WebhooksController {
  constructor(@Inject(WebhooksService) private readonly service: WebhooksService) {}
  @Post()
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({
    summary: "Receive signed Stripe raw JSON; durable receipt precedes reconciliation",
  })
  @ApiHeader({ name: "Stripe-Signature", required: true })
  @ApiResponse({
    status: 200,
    schema: {
      type: "object",
      required: ["received"],
      properties: { received: { type: "boolean", enum: [true] } },
    },
  })
  @ApiResponse({ status: 400, description: "Missing/invalid signature or raw body" })
  @ApiResponse({ status: 409, description: "Event ID reused with different content" })
  @ApiResponse({ status: 503, description: "Reconciliation pending; retry the signed delivery" })
  receive(@Req() request: RawBodyRequest<SecurityRequest>) {
    return this.service.receive(
      request.rawBody,
      getHeader(request, "stripe-signature"),
      request.correlationId,
    );
  }
}
