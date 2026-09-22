import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthenticationGuard } from "../../common/security/authentication.guard.js";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { AccountsStore } from "./accounts.store.js";
import { TemplatesStore } from "./templates.store.js";
import { RequestsStore } from "./requests.store.js";
import { MachinesStore } from "./machines.store.js";
import { TransfersStore } from "./transfers.store.js";

@ApiTags("equipment-admin")
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller("admin")
export class EquipmentAdminController {
  constructor(
    @Inject(AccountsStore) private readonly accounts: AccountsStore,
    @Inject(TemplatesStore) private readonly templates: TemplatesStore,
    @Inject(RequestsStore) private readonly requests: RequestsStore,
    @Inject(MachinesStore) private readonly machines: MachinesStore,
    @Inject(TransfersStore) private readonly transfers: TransfersStore,
  ) {}
  @Get("dashboard") dashboard(@Req() r: SecurityRequest) {
    return this.accounts.dashboard(r);
  }
  @Get("accounts") listAccounts(@Req() r: SecurityRequest) {
    return this.accounts.dashboard(r, true);
  }
  @Get("accounts/:id") account(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.account(r, id, undefined, true);
  }
  @Patch("accounts/:id") updateAccount(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.account(r, id, b, true);
  }
  @Post("accounts/:id/force-read-only") readOnly(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.access(r, id, b, "READ_ONLY");
  }
  @Post("accounts/:id/restore-access") restore(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.access(r, id, b, "ACTIVE");
  }
  @Post("catalogs") catalog(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.templates.catalog(r, b);
  }
  @Post("technical-models") model(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.templates.models(r, b);
  }
  @Patch("technical-models/:id") updateModel(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.templates.models(r, b, id);
  }
  @Post("technical-models/:id/template-versions") version(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.templates.versions(r, id, b);
  }
  @Patch("template-versions/:id") updateTemplate(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.templates.template(r, id, b);
  }
  @Post("template-versions/:id/publish") publish(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.templates.template(r, id, b, "publish");
  }
  @Post("template-versions/:id/supersede") supersede(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.templates.template(r, id, b, "supersede");
  }
  @Get("template-versions/:id/impact") impact(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.impact(r, id);
  }
  @Get("equipment-requests") listRequests(@Req() r: SecurityRequest) {
    return this.requests.list(r, true);
  }
  @Post("equipment-requests/:id/review") review(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.transition(r, id, b, "review");
  }
  @Post("equipment-requests/:id/request-information") information(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.transition(r, id, b, "request-information");
  }
  @Post("equipment-requests/:id/reject") reject(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.transition(r, id, b, "reject");
  }
  @Post("equipment-requests/:id/approve") approve(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.transition(r, id, b, "approve");
  }
  @Post("machines/:id/template") assign(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.machines.update(r, id, b, "template");
  }
  @Get("machine-transfers") transfersList(@Req() r: SecurityRequest) {
    return this.transfers.detail(r, undefined, true);
  }
  @Post("machine-transfers/:id/approve") approveTransfer(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.transfers.transition(r, id, b, "approve");
  }
  @Post("machine-transfers/:id/execute") execute(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.transfers.transition(r, id, b, "execute");
  }
  @Post("machine-transfers/:id/reject") rejectTransfer(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.transfers.transition(r, id, b, "reject");
  }
}
