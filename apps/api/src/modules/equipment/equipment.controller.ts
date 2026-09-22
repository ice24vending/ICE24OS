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
import { FilesStore } from "./files.store.js";
import { MembersStore } from "./members.store.js";

@ApiTags("equipment")
@ApiBearerAuth()
@UseGuards(AuthenticationGuard)
@Controller()
export class EquipmentController {
  constructor(
    @Inject(AccountsStore) private readonly accounts: AccountsStore,
    @Inject(TemplatesStore) private readonly templates: TemplatesStore,
    @Inject(RequestsStore) private readonly requests: RequestsStore,
    @Inject(MachinesStore) private readonly machines: MachinesStore,
    @Inject(TransfersStore) private readonly transfers: TransfersStore,
    @Inject(FilesStore) private readonly files: FilesStore,
    @Inject(MembersStore) private readonly membership: MembersStore,
  ) {}

  @Get("equipment-workspace") workspace(@Req() r: SecurityRequest) {
    return this.accounts.workspace(r);
  }
  @Get("accounts/:id") account(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.account(r, id);
  }
  @Patch("accounts/:id") updateAccount(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.account(r, id, b);
  }
  @Get("branches") branches(@Req() r: SecurityRequest) {
    return this.accounts.branches(r);
  }
  @Post("branches") createBranch(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.accounts.branches(r, b);
  }
  @Get("branches/:id") branch(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.accounts.branch(r, id);
  }
  @Patch("branches/:id") updateBranch(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.branch(r, id, b);
  }
  @Post("branches/:id/archive") archive(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.branch(r, id, b, "archive");
  }
  @Post("branches/:id/restore") restore(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.accounts.branch(r, id, b, "restore");
  }
  @Get("account-users") members(@Req() r: SecurityRequest) {
    return this.accounts.members(r);
  }
  @Post("account-invitations") invite(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.membership.invite(r, b);
  }
  @Patch("account-users/:id/permissions") permissions(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.membership.permissions(r, id, b);
  }
  @Get("catalogs") catalog(@Req() r: SecurityRequest) {
    return this.templates.catalog(r);
  }
  @Get("technical-models") models(@Req() r: SecurityRequest) {
    return this.templates.models(r);
  }
  @Get("technical-models/:id") model(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.models(r, undefined, id);
  }
  @Get("technical-models/:id/template-versions") versions(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.versions(r, id);
  }
  @Get("template-versions/:id") template(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.template(r, id);
  }
  @Get("equipment-requests") listRequests(@Req() r: SecurityRequest) {
    return this.requests.list(r);
  }
  @Post("equipment-requests") createRequest(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.requests.save(r, b);
  }
  @Get("equipment-requests/:id") detailRequest(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.detail(r, id);
  }
  @Patch("equipment-requests/:id") updateRequest(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.save(r, b, id);
  }
  @Post("equipment-requests/:id/submit") submit(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.requests.transition(r, id, b, "submit");
  }
  @Get("machines") listMachines(@Req() r: SecurityRequest) {
    return this.machines.list(r);
  }
  @Get("machines/:id") machine(@Req() r: SecurityRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.machines.detail(r, id);
  }
  @Patch("machines/:id") metadata(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.machines.update(r, id, b, "metadata");
  }
  @Get("machines/:id/status") status(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.machines.detail(r, id, "status");
  }
  @Get("machines/:id/timeline") timeline(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.machines.detail(r, id, "timeline");
  }
  @Get("machines/:id/location-history") locations(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.machines.detail(r, id, "location-history");
  }
  @Get("machines/:id/ownership-history") owners(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.machines.detail(r, id, "ownership-history");
  }
  @Get("machines/:id/schedules") schedules(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.machines.detail(r, id, "schedules");
  }
  @Post("machines/:id/moves") move(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.machines.update(r, id, b, "moves");
  }
  @Post("machines/:id/retire") retire(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.machines.update(r, id, b, "retire");
  }
  @Post("machines/:id/operational-status") operational(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.machines.update(r, id, b, "operational-status");
  }
  @Get("machine-transfers") listTransfers(@Req() r: SecurityRequest) {
    return this.transfers.detail(r);
  }
  @Post("machine-transfers") createTransfer(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.transfers.create(r, b);
  }
  @Get("machine-transfers/:id") transfer(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.transfers.detail(r, id);
  }
  @Post("machine-transfers/:id/cancel") cancelTransfer(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.transfers.transition(r, id, b, "cancel");
  }
  @Post("equipment-files") upload(@Req() r: SecurityRequest, @Body() b: unknown) {
    return this.files.upload(r, b);
  }
  @Post("equipment-files/:id/scan") scan(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.files.rescan(r, id);
  }
  @Get("equipment-files/:id/download") download(
    @Req() r: SecurityRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.files.download(r, id);
  }
}
