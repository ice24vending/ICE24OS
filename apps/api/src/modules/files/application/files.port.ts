import type { DownloadResult, FileObject, InternalFileStatus, PublicJob } from "@ice24/contracts";

/** Data scope derived from the authorization subject; never from client input. */
export interface FileScope {
  accountId: string;
  actorUserId: string;
  contextSessionId: string | null;
  accountWide: boolean;
  branchIds: string[];
  machineIds: string[];
  correlationId: string;
}
export interface CreateUploadCommand {
  idempotencyKey: string;
  requestHash: string;
  tokenHash: string;
  purpose: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  entityType: "ACCOUNT" | "BRANCH" | "MACHINE";
  entityId: string;
  ttlSeconds: number;
}
export interface IssuedUpload {
  fileId: string;
  objectKey: string;
  expiresAt: string;
  maxSizeBytes: number;
  replayed: boolean;
}
export interface UploadTarget {
  objectKey: string;
  status: "ISSUED" | "COMPLETED" | "ABORTED" | "EXPIRED" | "REJECTED";
}
export interface ObservedObject {
  sizeBytes: number;
  mediaType: string;
}
export interface CompletedUpload {
  status: InternalFileStatus;
  job: PublicJob | null;
}
export interface ReadTarget {
  sessionId: string;
  expiresAt: string;
  bucket: string;
  objectKey: string;
  fileName: string | null;
}

export class FileNotFoundError extends Error {}
export class FileStateError extends Error {}
export class FileMismatchError extends Error {}
export class FileIdempotencyError extends Error {}
export class FileTooLargeError extends Error {}
export class FileMediaTypeError extends Error {}
export class FileValidationError extends Error {}

export abstract class FilesPort {
  abstract finishDownload(
    scope: FileScope,
    sessionId: string,
    result: "AUTHORIZED" | "ERROR" | "EXPIRED",
  ): Promise<DownloadResult>;
  abstract createUploadSession(
    scope: FileScope,
    command: CreateUploadCommand,
  ): Promise<IssuedUpload>;
  /** Object location of the actor's own upload session in the active account. */
  abstract uploadTarget(scope: FileScope, fileId: string): Promise<UploadTarget | null>;
  abstract completeUpload(
    scope: FileScope,
    fileId: string,
    tokenHash: string,
    observed: ObservedObject | null,
    declaredSha256: string | null,
  ): Promise<CompletedUpload>;
  abstract abortUpload(scope: FileScope, fileId: string, reason: string | null): Promise<void>;
  abstract getFile(scope: FileScope, fileId: string): Promise<FileObject | null>;
  /** Audited authorization; null when the file exists in scope but is not available. */
  abstract authorizeRead(
    scope: FileScope,
    fileId: string,
    purpose: string,
    ttlSeconds: number,
  ): Promise<ReadTarget | null>;
}

export class StorageUnavailableError extends Error {}

/**
 * Private object storage (Supabase Storage today; an S3 adapter would implement the same
 * contract with presigned PUT/GET). Implementations never make objects public.
 */
export abstract class ObjectStoragePort {
  abstract createSignedUpload(bucket: string, objectKey: string): Promise<string>;
  abstract stat(bucket: string, objectKey: string): Promise<ObservedObject | null>;
  abstract createSignedRead(
    bucket: string,
    objectKey: string,
    ttlSeconds: number,
    downloadName: string | null,
  ): Promise<string>;
}
