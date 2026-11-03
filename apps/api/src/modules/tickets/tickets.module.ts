import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { TicketsController } from "./interface/tickets.controller.js";
import { TicketsStore } from "./infrastructure/tickets.store.js";
@Module({ imports: [IdentityModule], controllers: [TicketsController], providers: [TicketsStore] })
export class TicketsModule {}
