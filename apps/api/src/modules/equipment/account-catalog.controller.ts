import { accountCatalogOpenApi } from "@ice24/contracts";
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
  Patch,
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
import { ApiAccountWriteProtection } from "../../common/authorization/account-write.openapi.js";
import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { AccountCatalogErrorFilter } from "./equipment-error.filter.js";
import { AccountCatalogStore } from "./account-catalog.store.js";

type SchemaObject = ApiResponseSchemaHost["schema"];
const schema = (value: unknown) => value as SchemaObject;
const idempotent = ApiHeader({
  name: "Idempotency-Key",
  required: true,
  schema: { type: "string", minLength: 8, maxLength: 200 },
});
const ifMatch = ApiHeader({
  name: "If-Match",
  required: true,
  description: 'Expected entry version (W/"n" or n)',
});
const ownerOnly = applyDecorators(
  ApiResponse({
    status: 403,
    description: "Not an account-wide owner (RA-01-D2) or official entry",
  }),
  ApiResponse({
    status: 409,
    description: "Duplicate code, retired entry or idempotency conflict",
  }),
);

/** TASK-F4-18: account-owned components and characteristics (RF-TPL-013). Official catalog
 * administration stays under /admin/catalogs. */
@ApiTags("account-catalog")
@ApiAccountWriteProtection()
@ApiBearerAuth()
@ApiHeader({ name: "X-ICE24-Context-Id", required: true, description: "Active authorized context" })
@ApiResponse({ status: 400, description: "Invalid input, cursor, If-Match or Idempotency-Key" })
@ApiResponse({ status: 401, description: "Authentication required" })
@UseGuards(AuthenticationGuard)
@UseFilters(AccountCatalogErrorFilter)
@Controller("account-catalog-entries")
export class AccountCatalogController {
  constructor(@Inject(AccountCatalogStore) private readonly store: AccountCatalogStore) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "List the own catalog entries of the active account" })
  @ApiQuery({ name: "status", required: false, enum: ["active", "retired"] })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100 },
  })
  @ApiQuery({ name: "cursor", required: false, schema: { type: "string" } })
  @ApiResponse({ status: 200, schema: schema(accountCatalogOpenApi.page) })
  list(@Req() r: SecurityRequest, @Query() query: unknown) {
    return this.store.list(r, query);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Read one own catalog entry of the active account" })
  @ApiResponse({ status: 200, schema: schema(accountCatalogOpenApi.entry) })
  @ApiResponse({ status: 404, description: "Missing or owned by another account" })
  detail(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.store.detail(r, id);
  }

  @Post()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Create an account component or characteristic; audited" })
  @idempotent
  @ownerOnly
  @ApiBody({ schema: schema(accountCatalogOpenApi.create) })
  @ApiResponse({ status: 201, schema: schema(accountCatalogOpenApi.entry) })
  create(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.store.create(r, b);
  }

  @Patch(":id")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Replace the editable definition (code and kind are immutable)" })
  @idempotent
  @ifMatch
  @ownerOnly
  @ApiBody({ schema: schema(accountCatalogOpenApi.update) })
  @ApiResponse({ status: 200, schema: schema(accountCatalogOpenApi.entry) })
  @ApiResponse({ status: 404, description: "Missing or owned by another account" })
  @ApiResponse({ status: 412, description: "Version conflict" })
  update(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string, @Body() b: unknown) {
    return this.store.update(r, id, b);
  }

  @Post(":id/retire")
  @HttpCode(200)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Retire an entry without deletion; reason required and audited" })
  @idempotent
  @ifMatch
  @ownerOnly
  @ApiBody({ schema: schema(accountCatalogOpenApi.retire) })
  @ApiResponse({ status: 200, schema: schema(accountCatalogOpenApi.entry) })
  @ApiResponse({ status: 404, description: "Missing or owned by another account" })
  @ApiResponse({ status: 412, description: "Version conflict" })
  retire(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string, @Body() b: unknown) {
    return this.store.retire(r, id, b);
  }
}
