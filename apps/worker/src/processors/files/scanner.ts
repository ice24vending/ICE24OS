import { connect } from "node:net";

/**
 * Antimalware adapter (ADR-019). The provider is still pending approval, so the worker only
 * depends on this port: it receives the quarantined bytes (never storage credentials or
 * URLs) and must answer CLEAN or INFECTED. Any other outcome, including a timeout, throws
 * `ScannerUnavailableError`, which keeps the file in quarantine and retries the job.
 */
export interface MalwareScanner {
  readonly engine: string;
  scan(bytes: Uint8Array): Promise<ScanReport>;
}

export interface ScanReport {
  readonly verdict: "CLEAN" | "INFECTED";
  /** Threat name reported by the engine, sanitized; null when clean. */
  readonly signature: string | null;
}

export class ScannerUnavailableError extends Error {
  public constructor(public readonly code: "SCANNER_UNAVAILABLE" | "SCANNER_TIMEOUT") {
    super(code);
    this.name = "ScannerUnavailableError";
  }
}

const SIGNATURE = /[^A-Za-z0-9._:/+-]/gu;
export const sanitizeSignature = (raw: string): string =>
  raw.replace(SIGNATURE, "_").slice(0, 200) || "UNKNOWN";

/** Industry-standard harmless antivirus test string (https://www.eicar.org). */
export const EICAR_TEST_SIGNATURE =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * Deterministic local/test double. Reports the EICAR test string as infected and everything
 * else as clean. It never inspects real malware, so it is refused in staging and production.
 */
export class SimulatedScanner implements MalwareScanner {
  public readonly engine = "simulated";

  public scan(bytes: Uint8Array): Promise<ScanReport> {
    const infected = Buffer.from(bytes).includes(EICAR_TEST_SIGNATURE, 0, "latin1");
    return Promise.resolve(
      infected
        ? { verdict: "INFECTED", signature: "Eicar-Test-Signature" }
        : { verdict: "CLEAN", signature: null },
    );
  }
}

/**
 * Self-hosted ClamAV (clamd) over TCP using the INSTREAM command: bytes stay inside the
 * controlled environment and samples are never shared with third parties (ADR-019 rejects
 * VirusTotal-like services). Candidate adapter until the provider is approved.
 */
export class ClamAvScanner implements MalwareScanner {
  public readonly engine = "clamav";
  private static readonly CHUNK = 64 * 1024;

  public constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly timeoutMs = 30_000,
  ) {}

  public scan(bytes: Uint8Array): Promise<ScanReport> {
    return new Promise((resolve, reject) => {
      const socket = connect({ host: this.host, port: this.port });
      const chunks: Buffer[] = [];
      let settled = false;
      const finish = (error: ScannerUnavailableError | null, report?: ScanReport) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        if (error) reject(error);
        else resolve(report!);
      };
      socket.setTimeout(this.timeoutMs, () =>
        finish(new ScannerUnavailableError("SCANNER_TIMEOUT")),
      );
      socket.on("error", () => finish(new ScannerUnavailableError("SCANNER_UNAVAILABLE")));
      socket.on("data", (chunk: Buffer) => chunks.push(chunk));
      socket.on("end", () => {
        const reply = Buffer.concat(chunks).toString("utf8").replace(/\0/gu, "").trim();
        const found = /^stream: (.+) FOUND$/u.exec(reply);
        if (found)
          return finish(null, { verdict: "INFECTED", signature: sanitizeSignature(found[1]!) });
        if (reply === "stream: OK") return finish(null, { verdict: "CLEAN", signature: null });
        // "... ERROR" (size limit, engine failure) or an unknown reply: never treated as clean.
        return finish(new ScannerUnavailableError("SCANNER_UNAVAILABLE"));
      });
      socket.on("connect", () => {
        socket.write("zINSTREAM\0");
        for (let offset = 0; offset < bytes.length; offset += ClamAvScanner.CHUNK) {
          const chunk = bytes.subarray(offset, offset + ClamAvScanner.CHUNK);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length);
          socket.write(size);
          socket.write(chunk);
        }
        socket.end(Buffer.alloc(4));
      });
    });
  }
}

export type ScannerSelection =
  { readonly scanner: MalwareScanner } | { readonly scanner: null; readonly reason: string };

/**
 * `FILE_SCANNER=clamav` (with `CLAMAV_HOST`/`CLAMAV_PORT`, the same clamd used by F4
 * evidence; a `CLAMAV_HOST` alone also selects it) or `FILE_SCANNER=simulated` (development
 * and test only). Without a usable scanner the worker does not consume `file_scans`: uploads
 * stay VERIFYING in quarantine instead of burning retries.
 */
export function scannerFromEnvironment(env: NodeJS.ProcessEnv): ScannerSelection {
  const kind = (env.FILE_SCANNER?.trim() || (env.CLAMAV_HOST ? "clamav" : "")).toLowerCase();
  const environment = env.NODE_ENV ?? "development";
  if (kind === "simulated") {
    if (environment !== "development" && environment !== "test")
      return { scanner: null, reason: "SIMULATED_SCANNER_FORBIDDEN" };
    return { scanner: new SimulatedScanner() };
  }
  if (kind === "clamav") {
    const port = Number(env.CLAMAV_PORT ?? 3310);
    const timeout = Number(env.FILE_SCAN_TIMEOUT_MS ?? 30_000);
    if (!env.CLAMAV_HOST || !Number.isInteger(port) || port < 1 || port > 65_535)
      return { scanner: null, reason: "SCANNER_MISCONFIGURED" };
    if (!Number.isInteger(timeout) || timeout < 1_000 || timeout > 120_000)
      return { scanner: null, reason: "SCANNER_MISCONFIGURED" };
    return { scanner: new ClamAvScanner(env.CLAMAV_HOST, port, timeout) };
  }
  return { scanner: null, reason: kind ? "SCANNER_MISCONFIGURED" : "SCANNER_NOT_CONFIGURED" };
}
