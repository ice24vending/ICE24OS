import { createHash, randomBytes, randomUUID } from "node:crypto";
import { authorize } from "@ice24/authorization";
import {
  READ_URL_TTL_SECONDS,
  UPLOAD_SESSION_TTL_SECONDS,
  abortUploadRequestSchema,
  completeUploadRequestSchema,
  createUploadSessionRequestSchema,
  downloadSessionRequestSchema,
  type DownloadSession,
  type ErrorCode,
  type UploadSession,
} from "@ice24/contracts";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { getHeader, type SecurityRequest } from "../../../common/security/security-request.js";
import {
  FileIdempotencyError,
  FileMediaTypeError,
  FileMismatchError,
  FileNotFoundError,
  FilesPort,
  FileStateError,
  FileTooLargeError,
  FileValidationError,
  ObjectStoragePort,
  StorageUnavailableError,
  type FileScope,
} from "./files.port.js";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const UPLOAD_BUCKET = "quarantine";

/** HTTP error carrying the API.md error code; the filter renders the safe message. */
export class FileApiError extends HttpException {
  constructor(
    status: number,
    readonly code: ErrorCode,
  ) {
    super(code, status);
  }
}
const fail = (status: number, code: ErrorCode) => new FileApiError(status, code);

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");
/** Deterministic fingerprint of a parsed request: keys sorted at every level. */
export function requestFingerprint(value: unknown): string {
  const canonical = (input: unknown): unknown =>
    Array.isArray(input)
      ? input.map(canonical)
      : input !== null && typeof input === "object"
        ? Object.fromEntries(
            Object.entries(input)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, nested]) => [key, canonical(nested)]),
          )
        : input;
  return sha256Hex(JSON.stringify(canonical(value)));
}

function translate(error: unknown): never {
  if (error instanceof FileNotFoundError) throw fail(404, "NOT_FOUND");
  if (error instanceof FileStateError) throw fail(409, "STATE_TRANSITION_INVALID");
  if (error instanceof FileMismatchError) throw fail(422, "FILE_UPLOAD_MISMATCH");
  if (error instanceof FileIdempotencyError) throw fail(409, "IDEMPOTENCY_CONFLICT");
  if (error instanceof FileTooLargeError) throw fail(413, "PAYLOAD_TOO_LARGE");
  if (error instanceof FileMediaTypeError) throw fail(415, "UNSUPPORTED_MEDIA_TYPE");
  if (error instanceof FileValidationError) throw fail(400, "VALIDATION_FAILED");
  if (error instanceof StorageUnavailableError) throw fail(503, "DEPENDENCY_UNAVAILABLE");
  throw error;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(FilesPort) private readonly files: FilesPort,
    @Inject(ObjectStoragePort) private readonly storage: ObjectStoragePort,
  ) {}

  /** Re-checks the guard decision and derives tenant scope from the active context only. */
  private scope(request: SecurityRequest, permission: "files.upload" | "files.read"): FileScope {
    const subject = request.authorizationSubject;
    const actorUserId = request.localUser?.id;
    if (
      !subject ||
      !actorUserId ||
      !authorize(subject, {
        accountId: subject.membershipAccountId,
        permission,
        classification: "CONFIDENTIAL",
        operation: permission === "files.upload" ? "WRITE" : "READ",
      }).allowed
    )
      throw fail(403, "FORBIDDEN");
    const context = getHeader(request, "x-ice24-context-id");
    return {
      accountId: subject.membershipAccountId,
      actorUserId,
      contextSessionId: context !== undefined && UUID.test(context) ? context : null,
      accountWide: subject.accountWide,
      branchIds: [...subject.branchIds],
      machineIds: [...subject.machineIds],
      correlationId: request.correlationId ?? randomUUID(),
    };
  }

  private static key(idempotencyKey: unknown): string {
    if (typeof idempotencyKey !== "string" || !IDEMPOTENCY_KEY.test(idempotencyKey))
      throw fail(400, "VALIDATION_FAILED");
    return idempotencyKey;
  }

  /** FIL-001: authorizes one direct PUT of the declared file into the account's prefix. */
  async createUploadSession(
    request: SecurityRequest,
    idempotencyKey: unknown,
    body: unknown,
  ): Promise<UploadSession> {
    const scope = this.scope(request, "files.upload");
    const key = FilesService.key(idempotencyKey);
    const parsed = createUploadSessionRequestSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((issue) => issue.message);
      if (messages.includes("UNSUPPORTED_MEDIA_TYPE")) throw fail(415, "UNSUPPORTED_MEDIA_TYPE");
      if (messages.includes("PAYLOAD_TOO_LARGE")) throw fail(413, "PAYLOAD_TOO_LARGE");
      throw fail(400, "VALIDATION_FAILED");
    }
    const input = parsed.data;
    // The token is returned once; only its hash is stored.
    const uploadToken = randomBytes(32).toString("base64url");
    const issued = await this.files
      .createUploadSession(scope, {
        idempotencyKey: key,
        requestHash: requestFingerprint(input),
        tokenHash: sha256Hex(uploadToken),
        purpose: input.purpose,
        fileName: input.fileName,
        mediaType: input.mediaType,
        sizeBytes: input.sizeBytes,
        entityType: input.relatedResource.type.toUpperCase() as "ACCOUNT" | "BRANCH" | "MACHINE",
        entityId: input.relatedResource.id,
        ttlSeconds: UPLOAD_SESSION_TTL_SECONDS,
      })
      .catch(translate);
    const uploadUrl = await this.storage
      .createSignedUpload(UPLOAD_BUCKET, issued.objectKey)
      .catch(translate);
    return {
      fileId: issued.fileId,
      uploadUrl,
      method: "PUT",
      requiredHeaders: { "Content-Type": input.mediaType },
      uploadToken,
      expiresAt: issued.expiresAt,
      maximumSizeBytes: issued.maxSizeBytes,
    };
  }

  /** FIL-002: compares what storage holds with what was authorized, then queues the scan. */
  async completeUpload(
    request: SecurityRequest,
    fileId: string,
    idempotencyKey: unknown,
    body: unknown,
  ) {
    const scope = this.scope(request, "files.upload");
    FilesService.key(idempotencyKey);
    const input = completeUploadRequestSchema.safeParse(body);
    if (!input.success) throw fail(400, "VALIDATION_FAILED");
    const target = await this.files.uploadTarget(scope, fileId).catch(translate);
    if (!target) throw fail(404, "NOT_FOUND");
    const observed =
      target.status === "ISSUED"
        ? await this.storage.stat(UPLOAD_BUCKET, target.objectKey).catch(translate)
        : null;
    const result = await this.files
      .completeUpload(
        scope,
        fileId,
        sha256Hex(input.data.uploadToken),
        observed,
        input.data.sha256 ?? null,
      )
      .catch(translate);
    if (result.status === "REJECTED" || !result.job) throw fail(422, "FILE_UPLOAD_MISMATCH");
    return result.job;
  }

  /** FIL-003. */
  async getFile(request: SecurityRequest, fileId: string) {
    const file = await this.files.getFile(this.scope(request, "files.read"), fileId);
    if (!file) throw fail(404, "NOT_FOUND");
    return file;
  }

  /** FIL-005. */
  async abortUpload(
    request: SecurityRequest,
    fileId: string,
    idempotencyKey: unknown,
    body: unknown,
  ): Promise<void> {
    const scope = this.scope(request, "files.upload");
    FilesService.key(idempotencyKey);
    const input = abortUploadRequestSchema.safeParse(body ?? {});
    if (!input.success) throw fail(400, "VALIDATION_FAILED");
    await this.files.abortUpload(scope, fileId, input.data.reason ?? null).catch(translate);
  }

  /**
   * FIL-004: temporary signed read of a verified file. URLs are never stored or reused, so a
   * repeated Idempotency-Key yields a new short-lived URL; every issuance is audited.
   */
  async createDownloadSession(
    request: SecurityRequest,
    fileId: string,
    idempotencyKey: unknown,
    body: unknown,
  ): Promise<DownloadSession> {
    const scope = this.scope(request, "files.read");
    FilesService.key(idempotencyKey);
    const input = downloadSessionRequestSchema.safeParse(body);
    if (!input.success) throw fail(400, "VALIDATION_FAILED");
    // Derivatives (optimized/public) do not exist before F5-09/F5-11.
    if (input.data.version !== "original") throw fail(409, "FILE_NOT_AVAILABLE");
    const target = await this.files
      .authorizeRead(scope, fileId, input.data.purpose, READ_URL_TTL_SECONDS)
      .catch(translate);
    if (!target) throw fail(409, "FILE_NOT_AVAILABLE");
    const expiresAt = new Date(Date.now() + READ_URL_TTL_SECONDS * 1000).toISOString();
    const url = await this.storage
      .createSignedRead(target.bucket, target.objectKey, READ_URL_TTL_SECONDS, target.fileName)
      .catch(translate);
    return { url, expiresAt };
  }
}
