import { notificationsOpenApi, type NotificationAction } from "@ice24/contracts";
import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
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
} from "@nestjs/swagger";
import type { ApiResponseSchemaHost } from "@nestjs/swagger";
import { AllowReadOnlyOperation } from "../../../common/authorization/account-write.guard.js";
import {
  AuthorizationGuard,
  RequirePermission,
} from "../../../common/authorization/authorization.guard.js";
import { AuthenticationGuard } from "../../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { NotificationsService } from "../application/notifications.service.js";
import { NotificationsErrorFilter } from "./notifications-error.filter.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
const read = RequirePermission({
  permission: "notifications.read",
  classification: "CONFIDENTIAL",
  operation: "READ",
});
/**
 * NOT-003 to NOT-006 change only the caller's own alert state, never account records, so they
 * are authorized as READ on the dedicated `notifications.attend` permission and allowed while
 * the account is read-only (the "read-only account" alert itself must be acknowledgeable).
 */
function Transition(id: string, summary: string, body: object) {
  return applyDecorators(
    Post(`notifications/:notificationId/${id}`),
    HttpCode(200),
    Header("Cache-Control", "no-store"),
    RequirePermission({
      permission: "notifications.attend",
      classification: "CONFIDENTIAL",
      operation: "READ",
    }),
    AllowReadOnlyOperation("notification-attention"),
    ApiOperation({ summary }),
    ApiHeader({
      name: "Idempotency-Key",
      required: true,
      schema: { type: "string", minLength: 8, maxLength: 128 },
    }),
    ApiHeader({
      name: "If-Match",
      required: true,
      description: 'Expected notification audit.version (W/"n" or n); a replayed key skips it',
    }),
    ApiBody({ schema: body as SchemaObject }),
    ApiResponse({ status: 200, schema: notificationsOpenApi.notification as SchemaObject }),
    ApiResponse({ status: 404, description: "Notification missing or of another recipient" }),
    ApiResponse({
      status: 409,
      description:
        "STATE_TRANSITION_INVALID, RELATED_CONDITION_NOT_RESOLVED or IDEMPOTENCY_CONFLICT",
    }),
    ApiResponse({ status: 412, description: "PRECONDITION_FAILED: the notification changed" }),
  );
}

@ApiTags("notifications")
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid filter, cursor, body or idempotency key" })
@ApiResponse({ status: 401, description: "Authentication required" })
@ApiResponse({ status: 403, description: "Notification permission denied" })
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseFilters(NotificationsErrorFilter)
@Controller()
export class NotificationsController {
  constructor(@Inject(NotificationsService) private readonly service: NotificationsService) {}

  @Get("notifications")
  @Header("Cache-Control", "no-store")
  @read
  @ApiOperation({ summary: "NOT-001: own notifications of the active account, newest first" })
  @(applyDecorators(
    ...Object.entries(notificationsOpenApi.query.properties ?? {}).map(([name, schema]) =>
      ApiQuery({ name, required: false, schema: schema as SchemaObject }),
    ),
  ) as MethodDecorator)
  @ApiResponse({ status: 200, schema: notificationsOpenApi.page as SchemaObject })
  list(@Req() request: SecurityRequest, @Query() query: unknown) {
    return this.service.list(request, query);
  }

  // Declared before `notifications/:notificationId` so the literal path wins.
  @Get("notifications/summary")
  @Header("Cache-Control", "no-store")
  @read
  @ApiOperation({ summary: "Badge and group counters of own notifications (additive)" })
  @ApiResponse({ status: 200, schema: notificationsOpenApi.summary as SchemaObject })
  summary(@Req() request: SecurityRequest) {
    return this.service.summary(request);
  }

  @Get("notifications/:notificationId")
  @Header("Cache-Control", "no-store")
  @read
  @ApiOperation({ summary: "NOT-002: one own notification; does not mark it read" })
  @ApiResponse({ status: 200, schema: notificationsOpenApi.notification as SchemaObject })
  @ApiResponse({ status: 404, description: "Notification missing or of another recipient" })
  get(@Req() request: SecurityRequest, @Param("notificationId", ParseUUIDPipe) id: string) {
    return this.service.get(request, id);
  }

  @Transition("read", "NOT-003: mark read; never acknowledges", notificationsOpenApi.read)
  markRead(
    @Req() request: SecurityRequest,
    @Param("notificationId", ParseUUIDPipe) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transition(request, id, "read", key, body);
  }

  @Transition(
    "acknowledge",
    "NOT-004: mark acknowledged (unpins critical alerts); never resolves",
    notificationsOpenApi.acknowledge,
  )
  acknowledge(
    @Req() request: SecurityRequest,
    @Param("notificationId", ParseUUIDPipe) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transition(request, id, "acknowledge", key, body);
  }

  @Transition(
    "start-attention",
    "NOT-005: link the attending resource and move to in progress",
    notificationsOpenApi.startAttention,
  )
  startAttention(
    @Req() request: SecurityRequest,
    @Param("notificationId", ParseUUIDPipe) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transition(request, id, "start-attention", key, body);
  }

  @Transition(
    "resolve",
    "NOT-006: resolve only once the linked condition is closed",
    notificationsOpenApi.resolve,
  )
  resolve(
    @Req() request: SecurityRequest,
    @Param("notificationId", ParseUUIDPipe) id: string,
    @Headers("idempotency-key") key: string | undefined,
    @Body() body: unknown,
  ) {
    return this.transition(request, id, "resolve", key, body);
  }

  private transition(
    request: SecurityRequest,
    id: string,
    action: NotificationAction,
    key: string | undefined,
    body: unknown,
  ) {
    return this.service.transition(request, id, action, key, body);
  }
}
