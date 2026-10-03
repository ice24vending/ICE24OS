import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module.js";
import { FilesPort, ObjectStoragePort } from "./application/files.port.js";
import { FilesService } from "./application/files.service.js";
import { FilesDatabase } from "./infrastructure/files.database.js";
import { SupabaseObjectStorage } from "./infrastructure/supabase-storage.js";
import { FilesController } from "./interface/files.controller.js";

@Module({
  imports: [IdentityModule],
  providers: [
    FilesService,
    FilesDatabase,
    SupabaseObjectStorage,
    { provide: FilesPort, useExisting: FilesDatabase },
    { provide: ObjectStoragePort, useExisting: SupabaseObjectStorage },
  ],
  controllers: [FilesController],
})
export class FilesModule {}
