import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { FileScanFailure, processFileScans, scanFailureCode } from "./file-scans.js";
import { sha256Hex } from "./integrity.js";
import {
  EICAR_TEST_SIGNATURE,
  ScannerUnavailableError,
  SimulatedScanner,
  type MalwareScanner,
} from "./scanner.js";
import { StorageFailure, type ScanStorage } from "./storage.js";

const id = "11111111-1111-4111-8111-111111111111";
const KEY = `${id}/${id}/v1/${id}`;
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const message = (overrides: Record<string, unknown> = {}) => ({
  messageVersion: 1,
  jobId: id,
  fileId: id,
  versionId: id,
  accountId: id,
  declaredSha256: null,
  correlationId: id,
  ...overrides,
});

type Statement = { text: string; values?: unknown[] | undefined };
const fakePool = (
  deliveries: unknown[],
  options: {
    action?: string;
    declaredSha256?: string | null;
    size?: number;
    mediaType?: string;
    failOutcome?: string;
  } = {},
) => {
  const statements: Statement[] = [];
  const query = async (text: string, values?: unknown[]) => {
    statements.push({ text, values });
    if (text.includes("infra.read_queue"))
      return {
        rows: deliveries.map((m, i) => ({ msg_id: String(i + 1), read_ct: 3, message: m })),
      };
    if (text.includes("files.scan_job_start"))
      return {
        rows: [
          {
            action: options.action ?? "SCAN",
            file_id: id,
            account_id: id,
            object_key: KEY,
            media_type: options.mediaType ?? "image/png",
            size_bytes: String(options.size ?? PNG.length),
            declared_sha256: options.declaredSha256 ?? null,
            correlation_id: id,
          },
        ],
      };
    if (text.includes("infra.fail_job"))
      return { rows: [{ outcome: options.failOutcome ?? "retry_scheduled" }] };
    return { rows: [] };
  };
  return { pool: { query } as unknown as Pool, statements };
};
const memoryStorage = (bytes: Buffer | null = PNG): ScanStorage & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    download: async (bucket, key) => {
      calls.push(`download:${bucket}/${key}`);
      return bytes;
    },
    upload: async (bucket, key) => void calls.push(`upload:${bucket}/${key}`),
    remove: async (bucket, key) => void calls.push(`remove:${bucket}/${key}`),
  };
};
const sql = (statements: Statement[], fragment: string) =>
  statements.filter((s) => s.text.includes(fragment));
const verdictOf = (statements: Statement[]) =>
  sql(statements, "files.scan_record_result")[0]?.values?.[2];

describe("file_scans consumer", () => {
  it("promotes clean bytes to originals before recording CLEAN, then acks", async () => {
    const { pool, statements } = fakePool([message()], { declaredSha256: sha256Hex(PNG) });
    const storage = memoryStorage();
    const summary = await processFileScans(pool, { scanner: new SimulatedScanner(), storage });
    expect(summary).toMatchObject({ received: 1, clean: 1, rejected: 0, retried: 0 });
    expect(storage.calls).toEqual([
      `download:quarantine/${KEY}`,
      `upload:originals/${KEY}`,
      `remove:quarantine/${KEY}`,
    ]);
    const result = sql(statements, "files.scan_record_result")[0]!;
    expect(result.values?.slice(2, 4)).toEqual(["CLEAN", sha256Hex(PNG)]);
    expect(JSON.parse(String(result.values?.[4]))).toMatchObject({
      engine: "simulated",
      detectedMediaType: "image/png",
    });
    const order = statements.map((s) => s.text);
    expect(order.findIndex((t) => t.includes("scan_record_result"))).toBeLessThan(
      order.findIndex((t) => t.includes("ack_message")),
    );
    expect(sql(statements, "infra.job_finish")[0]?.text).toContain("'succeeded'");
  });

  it("rejects infected bytes, raises the alert and purges them from quarantine", async () => {
    const infected = Buffer.concat([PNG, Buffer.from(EICAR_TEST_SIGNATURE)]);
    const { pool, statements } = fakePool([message()], { size: infected.length });
    const storage = memoryStorage(infected);
    const alerts: unknown[] = [];
    const summary = await processFileScans(pool, {
      scanner: new SimulatedScanner(),
      storage,
      onSecurityAlert: (alert) => alerts.push(alert),
    });
    expect(summary).toMatchObject({ rejected: 1, clean: 0 });
    expect(verdictOf(statements)).toBe("INFECTED");
    expect(storage.calls).not.toContain(`upload:originals/${KEY}`);
    expect(storage.calls).toContain(`remove:quarantine/${KEY}`);
    expect(sql(statements, "files.scan_record_purge")).toHaveLength(1);
    expect(alerts).toEqual([
      expect.objectContaining({ verdict: "INFECTED", signature: "Eicar-Test-Signature" }),
    ]);
  });

  it("rejects hash and signature mismatches without calling the scanner", async () => {
    let scans = 0;
    const counting: MalwareScanner = {
      engine: "counting",
      scan: async () => {
        scans++;
        return { verdict: "CLEAN", signature: null };
      },
    };
    const hash = fakePool([message()], { declaredSha256: "0".repeat(64) });
    await processFileScans(hash.pool, { scanner: counting, storage: memoryStorage() });
    expect(verdictOf(hash.statements)).toBe("INTEGRITY_MISMATCH");
    const type = fakePool([message()], { mediaType: "application/pdf" });
    await processFileScans(type.pool, { scanner: counting, storage: memoryStorage() });
    expect(verdictOf(type.statements)).toBe("SIGNATURE_MISMATCH");
    expect(scans).toBe(0);
    expect(sql(type.statements, "files.scan_record_purge")).toHaveLength(1);
  });

  it("keeps the file in quarantine and schedules a retry when the scanner is down", async () => {
    const { pool, statements } = fakePool([message()]);
    const down: MalwareScanner = {
      engine: "down",
      scan: () => Promise.reject(new ScannerUnavailableError("SCANNER_TIMEOUT")),
    };
    const storage = memoryStorage();
    const summary = await processFileScans(pool, { scanner: down, storage });
    expect(summary).toMatchObject({ retried: 1, clean: 0 });
    expect(sql(statements, "infra.fail_job")[0]?.values?.slice(3)).toEqual([3, "SCANNER_TIMEOUT"]);
    expect(sql(statements, "files.scan_record_failure")[0]?.values).toEqual([
      id,
      id,
      "SCANNER_TIMEOUT",
      3,
      false,
    ]);
    expect(sql(statements, "infra.job_finish")[0]?.values).toEqual([
      id,
      "retry_scheduled",
      "SCANNER_TIMEOUT",
    ]);
    expect(sql(statements, "files.scan_record_result")).toHaveLength(0);
    expect(sql(statements, "infra.ack_message")).toHaveLength(0);
    expect(storage.calls).not.toContain(`upload:originals/${KEY}`);
  });

  it("fails closed into QUARANTINED once the retry policy dead-letters the message", async () => {
    const { pool, statements } = fakePool([message()], { failOutcome: "dead_lettered" });
    const summary = await processFileScans(pool, {
      scanner: new SimulatedScanner(),
      storage: memoryStorage(null),
    });
    expect(summary).toMatchObject({ deadLettered: 1 });
    expect(sql(statements, "files.scan_record_failure")[0]?.values?.slice(2)).toEqual([
      "OBJECT_MISSING",
      3,
      true,
    ]);
  });

  it("acknowledges duplicates and resumes a pending purge without scanning again", async () => {
    const done = fakePool([message()], { action: "DONE" });
    const storage = memoryStorage();
    expect(
      await processFileScans(done.pool, { scanner: new SimulatedScanner(), storage }),
    ).toMatchObject({ duplicates: 1 });
    expect(storage.calls).toEqual([]);
    expect(sql(done.statements, "infra.ack_message")).toHaveLength(1);
    const purge = fakePool([message()], { action: "PURGE" });
    await processFileScans(purge.pool, { scanner: new SimulatedScanner(), storage });
    expect(storage.calls).toEqual([`remove:quarantine/${KEY}`]);
    expect(sql(purge.statements, "files.scan_record_purge")).toHaveLength(1);
  });

  it("dead-letters invalid messages and messages without a registered job", async () => {
    const invalid = fakePool([{ jobId: "x" }, message({ bucket: "originals" })]);
    expect(
      await processFileScans(invalid.pool, {
        scanner: new SimulatedScanner(),
        storage: memoryStorage(),
      }),
    ).toMatchObject({ received: 2, deadLettered: 2 });
    expect(sql(invalid.statements, "infra.fail_job").map((s) => s.values?.[3])).toEqual([
      1000, 1000,
    ]);
    expect(sql(invalid.statements, "files.scan_job_start")).toHaveLength(0);
    const missing = fakePool([message()], { action: "MISSING" });
    await processFileScans(missing.pool, {
      scanner: new SimulatedScanner(),
      storage: memoryStorage(),
    });
    expect(sql(missing.statements, "infra.job_record_poison")[0]?.values?.[2]).toBe(
      "SCAN_JOB_NOT_FOUND",
    );
  });

  it("maps adapter errors to diagnostic codes", () => {
    expect(scanFailureCode(new ScannerUnavailableError("SCANNER_UNAVAILABLE"))).toBe(
      "SCANNER_UNAVAILABLE",
    );
    expect(scanFailureCode(new StorageFailure("STORAGE_UNAVAILABLE"))).toBe("STORAGE_UNAVAILABLE");
    expect(scanFailureCode(new FileScanFailure("bad code"))).toBe("HANDLER_FAILED");
    expect(scanFailureCode(new Error("boom"))).toBe("HANDLER_FAILED");
  });
});
