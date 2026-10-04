import {
  fileObjectSchema,
  toPublicFileStatus,
  toPublicJobStatus,
  type FileObject,
  type InternalFileStatus,
  type JobStatus,
} from "@ice24/contracts";
import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import {
  FileIdempotencyError,
  FileMediaTypeError,
  FileMismatchError,
  FileNotFoundError,
  FilesPort,
  FileStateError,
  FileTooLargeError,
  FileValidationError,
  type CompletedUpload,
  type CreateUploadCommand,
  type FileScope,
  type IssuedUpload,
  type ObservedObject,
  type ReadTarget,
  type UploadTarget,
} from "../application/files.port.js";

const iso = (column: string) =>
  `to_char(${column} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/** Translates the SQLSTATEs raised by the files.* functions into domain errors. */
export function mapFileError(error: unknown): never {
  const code = (error as { code?: string } | null)?.code;
  if (code === "IC404") throw new FileNotFoundError("File not found");
  if (code === "IC409") throw new FileStateError("Invalid file state");
  if (code === "IC422") throw new FileMismatchError("Upload does not match");
  if (code === "IC412") throw new FileIdempotencyError("Idempotency key reused");
  if (code === "IC413") throw new FileTooLargeError("File too large");
  if (code === "IC415") throw new FileMediaTypeError("Media type not allowed");
  if (code === "22023" || code === "22P02") throw new FileValidationError("Invalid input");
  throw error;
}

@Injectable()
export class FilesDatabase extends FilesPort implements OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }

  override async createUploadSession(
    scope: FileScope,
    command: CreateUploadCommand,
  ): Promise<IssuedUpload> {
    const result = await this.pool
      .query<{
        file_id: string;
        object_key: string;
        expires_at: string;
        max_size_bytes: string;
        replayed: boolean;
      }>(
        `select file_id, object_key, ${iso("expires_at")} as expires_at, max_size_bytes, replayed
         from files.create_upload_session($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          scope.accountId,
          scope.actorUserId,
          scope.contextSessionId,
          command.idempotencyKey,
          command.requestHash,
          command.tokenHash,
          command.purpose,
          command.fileName,
          command.mediaType,
          command.sizeBytes,
          command.entityType,
          command.entityId,
          scope.accountWide,
          scope.branchIds,
          scope.machineIds,
          command.ttlSeconds,
          scope.correlationId,
        ],
      )
      .catch(mapFileError);
    const row = result.rows[0]!;
    return {
      fileId: row.file_id,
      objectKey: row.object_key,
      expiresAt: row.expires_at,
      maxSizeBytes: Number(row.max_size_bytes),
      replayed: row.replayed,
    };
  }

  override async uploadTarget(scope: FileScope, fileId: string): Promise<UploadTarget | null> {
    const result = await this.pool.query<{ object_key: string; status: UploadTarget["status"] }>(
      `select object_key, status from files.upload_sessions
       where file_object_id=$1 and account_id=$2 and created_by=$3`,
      [fileId, scope.accountId, scope.actorUserId],
    );
    const row = result.rows[0];
    return row ? { objectKey: row.object_key, status: row.status } : null;
  }

  override async completeUpload(
    scope: FileScope,
    fileId: string,
    tokenHash: string,
    observed: ObservedObject | null,
    declaredSha256: string | null,
  ): Promise<CompletedUpload> {
    const result = await this.pool
      .query<{ job_id: string | null; file_status: InternalFileStatus }>(
        "select job_id, file_status from files.complete_upload($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          fileId,
          scope.accountId,
          scope.actorUserId,
          scope.contextSessionId,
          tokenHash,
          observed?.sizeBytes ?? null,
          observed?.mediaType ?? null,
          declaredSha256,
          scope.correlationId,
        ],
      )
      .catch(mapFileError);
    const row = result.rows[0]!;
    if (!row.job_id) return { status: row.file_status, job: null };
    const job = await this.pool.query<{
      id: string;
      job_type: string;
      status: JobStatus;
      created_at: string;
    }>(
      `select id, job_type, status, ${iso("created_at")} as created_at from infra.async_jobs where id=$1`,
      [row.job_id],
    );
    const value = job.rows[0]!;
    return {
      status: row.file_status,
      job: {
        id: value.id,
        type: value.job_type,
        status: toPublicJobStatus(value.status),
        createdAt: value.created_at,
        links: { self: `/api/v1/jobs/${value.id}` },
      },
    };
  }

  override async abortUpload(scope: FileScope, fileId: string, reason: string | null) {
    await this.pool
      .query("select files.abort_upload($1,$2,$3,$4,$5,$6)", [
        fileId,
        scope.accountId,
        scope.actorUserId,
        scope.contextSessionId,
        reason,
        scope.correlationId,
      ])
      .catch(mapFileError);
  }

  override async getFile(scope: FileScope, fileId: string): Promise<FileObject | null> {
    const result = await this.pool.query<{ value: unknown }>(
      `select jsonb_strip_nulls(jsonb_build_object(
          'id', f.id, 'ownerAccountId', f.account_id,
          'fileName', coalesce(v.original_filename, s.original_filename),
          'mediaType', coalesce(v.media_type, s.media_type),
          'sizeBytes', coalesce(v.size_bytes, s.declared_size_bytes),
          'sha256', v.sha256, 'purpose', f.purpose,
          'relatedResource', jsonb_build_object('type', lower(b.entity_type), 'id', b.entity_id),
          'visibility', 'private', 'status', f.status,
          'audit', jsonb_build_object('createdAt', ${iso("f.created_at")}, 'createdBy', f.created_by,
            'updatedAt', ${iso("f.updated_at")}, 'rowVersion', f.row_version))) as value
       from files.file_objects f
       join lateral (select entity_type, entity_id from files.file_bindings
         where file_object_id = f.id and binding_role = 'ORIGINAL' order by created_at limit 1) b on true
       left join files.file_versions v on v.id = f.current_version_id
       left join files.upload_sessions s on s.file_object_id = f.id
       where f.id = $1 and files.file_visible($1, $2, $3, $4, $5)`,
      [fileId, scope.accountId, scope.accountWide, scope.branchIds, scope.machineIds],
    );
    const row = result.rows[0]?.value as (Record<string, unknown> & { status: string }) | undefined;
    if (!row) return null;
    return fileObjectSchema.parse({
      ...row,
      status: toPublicFileStatus(row.status as InternalFileStatus),
    });
  }

  override async authorizeRead(
    scope: FileScope,
    fileId: string,
    purpose: string,
    ttlSeconds: number,
  ): Promise<ReadTarget | null> {
    const result = await this.pool
      .query<{
        outcome: string;
        session_id: string;
        expires_at: string;
        bucket_id: string;
        object_key: string;
        file_name: string | null;
      }>(
        `select outcome, session_id, ${iso("expires_at")} as expires_at, bucket_id, object_key, file_name
         from files.prepare_download($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          fileId,
          scope.accountId,
          scope.actorUserId,
          scope.contextSessionId,
          scope.accountWide,
          scope.branchIds,
          scope.machineIds,
          purpose,
          ttlSeconds,
          scope.correlationId,
        ],
      )
      .catch(mapFileError);
    const row = result.rows[0];
    if (row?.outcome === "NOT_FOUND") throw new FileNotFoundError("File not found");
    return row?.outcome === "AUTHORIZED"
      ? {
          sessionId: row.session_id,
          expiresAt: row.expires_at,
          bucket: row.bucket_id,
          objectKey: row.object_key,
          fileName: row.file_name,
        }
      : null;
  }

  override async finishDownload(
    scope: FileScope,
    sessionId: string,
    result: "AUTHORIZED" | "ERROR" | "EXPIRED",
  ) {
    const response = await this.pool
      .query<{ result: "AUTHORIZED" | "DENIED" | "EXPIRED" | "ERROR" }>(
        "select files.finish_download($1,$2,$3,$4,$5,$6,$7) as result",
        [
          sessionId,
          scope.accountId,
          scope.actorUserId,
          scope.accountWide,
          scope.branchIds,
          scope.machineIds,
          result,
        ],
      )
      .catch(mapFileError);
    return response.rows[0]!.result;
  }
}
