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
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { EmailWebhooksService } from "../application/email-webhooks.service.js";
import { NotificationsErrorFilter } from "./notifications-error.filter.js";

/**
 * F5-12 email tracking webhook (additive to API.md section 31, same pattern as INT-001).
 * No user session: the provider signature is verified instead. Delivery and bounce only.
 */
@ApiTags("email-webhooks")
@UseFilters(NotificationsErrorFilter)
@Controller("webhooks/email")
export class EmailWebhooksController {
  constructor(@Inject(EmailWebhooksService) private readonly service: EmailWebhooksService) {}

  @Post()
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Receive signed email delivery/bounce events (technical tracking)" })
  @ApiHeader({ name: "x-ice24-email-signature", required: false })
  @ApiResponse({ status: 200, description: "Stored and applied, or an idempotent repeat" })
  @ApiResponse({ status: 400, description: "INVALID_WEBHOOK_SIGNATURE or invalid body" })
  @ApiResponse({ status: 409, description: "Provider event id reused with different content" })
  @ApiResponse({ status: 503, description: "No approved provider or storage unavailable" })
  receive(@Req() request: RawBodyRequest<SecurityRequest>) {
    const headers: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(request.headers))
      headers[name.toLowerCase()] = typeof value === "string" ? value : value?.[0];
    return this.service.receive(request.rawBody, headers, request.correlationId);
  }
}
