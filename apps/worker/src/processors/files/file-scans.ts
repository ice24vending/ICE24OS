import type { Pool } from "pg";
import {
  consumerFailureCodeSchema,
  fileScanMessageSchema,
  type FileScanBatchSummary,
  type FileScanMessage,
  type FileScanVerdict,
} from "@ice24/contracts";
import { checkIntegrity } from "./integrity.js";
import { ScannerUnavailableError, type MalwareScanner } from "./scanner.js";
import { StorageFailure, type ScanStorage } from "./storage.js";

export const FILE_SCANS_QUEUE = "file_scans";
const QUARANTINE_BUCKET = "quarantine";
const ORIGINALS_BUCKET = "originals";
/** Same ceiling as the private buckets (storage.buckets.file_size_limit). */
const MAX_OBJECT_BYTES = 50 * 1_048_576;
/** Above any queue policy maximum: infra.fail_job routes the message straight to the DLQ. */
const POISON_ATTEMPT = 1_000;

export interface FileScanDependencies {
  readonly scanner: MalwareScanner;
  readonly storage: ScanStorage;
  /** Called for every rejected file (malware, hash or signature mismatch). */
  readonly onSecurityAlert?: (alert: FileSecurityAlert) => void;
}

export interface FileSecurityAlert {
  readonly fileId: string;
  readonly versionId: string;
  readonly accountId: string;
  readonly verdict: Exclude<FileScanVerdict, "CLEAN">;
  readonly signature: string | null;
  readonly correlationId: string | null;
}

export interface FileScanOptions {
  readonly batchSize?: number;
  readonly visibilitySeconds?: number;
}

/** Throw to report a diagnostic code that keeps the file in quarantine and retries the job. */
export class FileScanFailure extends Error {
  public constructor(public readonly code: string) {
    super(code);
    this.name = "FileScanFailure";
  }
}

export const scanFailureCode = (error: unknown): string => {
  const code =
    error instanceof ScannerUnavailableError ||
    error instanceof StorageFailure ||
    error instanceof FileScanFailure
      ? error.code
      : undefined;
  return code !== undefined && consumerFailureCodeSchema.safeParse(code).success
    ? code
    : "HANDLER_FAILED";
};

interface QueueMessage {
  msg_id: string;
  read_ct: number;
  message: unknown;
}

interface ScanTarget {
  action: "SCAN" | "PURGE" | "DONE" | "MISSING";
  file_id: string | null;
  account_id: string | null;
  object_key: string | null;
  media_type: string | null;
  size_bytes: string | null;
  declared_sha256: string | null;
  correlation_id: string | null;
}

type Outcome = "clean" | "rejected" | "duplicate";

/**
 * Consumes one batch of `file_scans` (F5-09). Delivery is at least once and every step is
 * idempotent:
 * - `files.scan_job_start` moves the FILE_SCAN job to RUNNING and says whether the version
 *   still needs a scan, only the purge of rejected bytes, or nothing (verdict already stored);
 * - integrity first (size, declared SHA-256, magic bytes vs media type), then the antimalware
 *   adapter on exactly the bytes that will be promoted;
 * - clean: the scanned bytes are written to `originals` before the verdict commits, so an
 *   AVAILABLE version always has its object; the quarantine copy is then removed (best effort,
 *   the bucket retention covers a failure);
 * - infected or integrity failure: verdict and security alert commit first, then the bytes are
 *   removed from quarantine and the purge is recorded; a failed purge is retried;
 * - scanner/storage unavailable or timeout: `infra.fail_job` schedules an exponential retry
 *   and `files.scan_record_failure` audits it; once attempts are exhausted the message moves
 *   to `file_scans_dlq` and the file fails closed into QUARANTINED (ADR-019);
 * - the message is acknowledged only after the outcome is stored.
 */
export async function processFileScans(
  pool: Pool,
  dependencies: FileScanDependencies,
  options: FileScanOptions = {},
): Promise<FileScanBatchSummary> {
  const summary: FileScanBatchSummary = {
    received: 0,
    clean: 0,
    rejected: 0,
    duplicates: 0,
    retried: 0,
    deadLettered: 0,
  };
  const batch = await pool.query<QueueMessage>(
    "select msg_id, read_ct, message from infra.read_queue($1,$2,$3)",
    [FILE_SCANS_QUEUE, options.visibilitySeconds ?? 300, options.batchSize ?? 4],
  );
  for (const delivery of batch.rows) {
    summary.received += 1;
    const parsed = fileScanMessageSchema.safeParse(delivery.message);
    if (!parsed.success) {
      await poison(pool, delivery, "INVALID_MESSAGE");
      summary.deadLettered += 1;
      continue;
    }
    const message = parsed.data;
    const started = await pool.query<ScanTarget>(
      "select * from files.scan_job_start($1,$2,$3,$4,$5)",
      [message.jobId, message.versionId, FILE_SCANS_QUEUE, delivery.msg_id, delivery.read_ct],
    );
    const target = started.rows[0];
    if (target === undefined || target.action === "MISSING") {
      await poison(pool, delivery, "SCAN_JOB_NOT_FOUND");
      summary.deadLettered += 1;
      continue;
    }
    try {
      const outcome = await handle(pool, dependencies, message, target);
      await pool.query("select infra.ack_message($1,$2)", [FILE_SCANS_QUEUE, delivery.msg_id]);
      await pool.query("select infra.job_finish($1,'succeeded',null)", [message.jobId]);
      if (outcome === "clean") summary.clean += 1;
      else if (outcome === "rejected") summary.rejected += 1;
      else summary.duplicates += 1;
    } catch (error) {
      const code = scanFailureCode(error);
      const failed = await pool.query<{ outcome: string }>(
        "select infra.fail_job($1,$2,$3,$4,$5) as outcome",
        [
          FILE_SCANS_QUEUE,
          delivery.msg_id,
          JSON.stringify(delivery.message),
          delivery.read_ct,
          code,
        ],
      );
      const result = failed.rows[0]?.outcome ?? "retry_scheduled";
      await pool.query("select files.scan_record_failure($1,$2,$3,$4,$5)", [
        message.jobId,
        message.versionId,
        code,
        delivery.read_ct,
        result === "dead_lettered",
      ]);
      await pool.query("select infra.job_finish($1,$2,$3)", [message.jobId, result, code]);
      if (result === "dead_lettered") summary.deadLettered += 1;
      else summary.retried += 1;
    }
  }
  return summary;
}

async function handle(
  pool: Pool,
  { scanner, storage, onSecurityAlert }: FileScanDependencies,
  message: FileScanMessage,
  target: ScanTarget,
): Promise<Outcome> {
  const objectKey = target.object_key!;
  const purge = async () => {
    await storage.remove(QUARANTINE_BUCKET, objectKey);
    await pool.query("select files.scan_record_purge($1,$2)", [message.jobId, message.versionId]);
  };
  if (target.action === "DONE") return "duplicate";
  if (target.action === "PURGE") {
    await purge();
    return "duplicate";
  }
  const bytes = await storage.download(QUARANTINE_BUCKET, objectKey, MAX_OBJECT_BYTES);
  if (bytes === null) throw new FileScanFailure("OBJECT_MISSING");
  const integrity = checkIntegrity(bytes, {
    sizeBytes: Number(target.size_bytes),
    mediaType: target.media_type!,
    declaredSha256: target.declared_sha256,
  });
  let verdict: FileScanVerdict;
  let details: Record<string, string | null>;
  if (!integrity.ok) {
    verdict = integrity.verdict;
    details = { engine: "integrity", detectedMediaType: integrity.detectedMediaType };
  } else {
    const report = await scanner.scan(bytes);
    verdict = report.verdict;
    details = {
      engine: scanner.engine,
      signature: report.signature,
      detectedMediaType: integrity.detectedMediaType,
    };
    if (verdict === "CLEAN")
      await storage.upload(ORIGINALS_BUCKET, objectKey, bytes, target.media_type!);
  }
  await pool.query("select files.scan_record_result($1,$2,$3,$4,$5)", [
    message.jobId,
    message.versionId,
    verdict,
    integrity.sha256,
    JSON.stringify(details),
  ]);
  if (verdict === "CLEAN") {
    await storage.remove(QUARANTINE_BUCKET, objectKey).catch(() => undefined);
    return "clean";
  }
  onSecurityAlert?.({
    fileId: target.file_id!,
    versionId: message.versionId,
    accountId: target.account_id!,
    verdict,
    signature: details.signature ?? null,
    correlationId: target.correlation_id,
  });
  await purge();
  return "rejected";
}

async function poison(pool: Pool, delivery: QueueMessage, code: string): Promise<void> {
  await pool.query("select infra.fail_job($1,$2,$3,$4,$5)", [
    FILE_SCANS_QUEUE,
    delivery.msg_id,
    JSON.stringify(delivery.message ?? null),
    POISON_ATTEMPT,
    code,
  ]);
  await pool.query("select infra.job_record_poison($1,$2,$3)", [
    FILE_SCANS_QUEUE,
    delivery.msg_id,
    code,
  ]);
}
