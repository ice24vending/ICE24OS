import { readFile } from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { createServer as createTcpServer, type AddressInfo, type Server } from "node:net";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import {
  apiErrorSchema,
  downloadSessionSchema,
  fileObjectSchema,
  publicJobSchema,
  uploadSessionSchema,
} from "@ice24/contracts";
import { FilesController } from "../../apps/api/src/modules/files/interface/files.controller.js";
import { FilesService } from "../../apps/api/src/modules/files/application/files.service.js";
import { FilesDatabase } from "../../apps/api/src/modules/files/infrastructure/files.database.js";
import { SupabaseObjectStorage } from "../../apps/api/src/modules/files/infrastructure/supabase-storage.js";
import {
  AuthenticationGuard,
  TOKEN_VERIFIER,
} from "../../apps/api/src/common/security/authentication.guard.js";
import { AuthorizationGuard } from "../../apps/api/src/common/authorization/authorization.guard.js";
import { IdentityStore } from "../../apps/api/src/modules/identity/identity.store.js";
import {
  processFileScans,
  type FileScanDependencies,
} from "../../apps/worker/src/processors/files/file-scans.js";
import {
  ClamAvScanner,
  EICAR_TEST_SIGNATURE,
  SimulatedScanner,
} from "../../apps/worker/src/processors/files/scanner.js";
import { SupabaseScanStorage } from "../../apps/worker/src/processors/files/storage.js";
import { storageDouble } from "./support/storage-double.js";

const SERVICE_KEY = "service-role-fixture";
const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), randomBytes(2040)]);
const PDF = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n", "latin1");
const INFECTED_PDF = Buffer.from(`%PDF-1.7\n% ${EICAR_TEST_SIGNATURE}\n%%EOF\n`, "latin1");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

// Full F5-08 → F5-09 cycle: real Nest API and guards, real PostgreSQL with the migrations and
// a PGMQ emulation, an HTTP double of Supabase Storage and the real worker processor.
describe("F5-09 file scans: quarantine → file_scans → verdict → availability or purge", () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let db: FilesDatabase | undefined;
  let app:
    | {
        listen(port: number, host: string): Promise<void>;
        getUrl(): Promise<string>;
        close(): Promise<void>;
        setGlobalPrefix(prefix: string): void;
      }
    | undefined;
  let url = "";
  let storageOrigin = "";
  const storage = storageDouble(SERVICE_KEY);
  const oldEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const account = randomUUID(),
    branch = randomUUID(),
    user = randomUUID(),
    support = randomUUID();
  const migration = (file: string) =>
    readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), "utf8");
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/api/v1/${path}`, {
      ...init,
      headers: {
        authorization: "Bearer fixture",
        "x-ice24-context-id": randomUUID(),
        ...((init.headers as Record<string, string>) ?? {}),
      },
    });
  const post = (path: string, body: unknown) =>
    call(path, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": randomUUID() },
      body: JSON.stringify(body),
    });
  const scanStorage = () => new SupabaseScanStorage(storageOrigin, SERVICE_KEY);
  const simulated = (): FileScanDependencies => ({
    scanner: new SimulatedScanner(),
    storage: scanStorage(),
  });

  /** FIL-001 → direct PUT → FIL-002, as the browser does it. Returns the file and its job. */
  async function upload(
    bytes: Buffer,
    options: { fileName?: string; mediaType?: string; declaredSha256?: string } = {},
  ) {
    const mediaType = options.mediaType ?? "image/png";
    const issued = await post("files/upload-sessions", {
      fileName: options.fileName ?? "evidencia.png",
      mediaType,
      sizeBytes: bytes.length,
      purpose: "equipment_evidence",
      relatedResource: { type: "branch", id: branch },
    });
    expect(issued.status).toBe(201);
    const session = uploadSessionSchema.parse(await issued.json());
    const put = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: { "content-type": mediaType },
      body: new Uint8Array(bytes),
    });
    expect(put.status).toBe(200);
    const accepted = await post(`files/${session.fileId}/complete-upload`, {
      uploadToken: session.uploadToken,
      sha256: options.declaredSha256 ?? sha(bytes),
    });
    expect(accepted.status).toBe(202);
    const job = publicJobSchema.parse(await accepted.json());
    const key = (
      await pool!.query<{ object_key: string; version_id: string }>(
        "select v.object_key, v.id as version_id from files.file_versions v join files.file_objects f on f.current_version_id=v.id where f.id=$1",
        [session.fileId],
      )
    ).rows[0]!;
    return { fileId: session.fileId, jobId: job.id, ...key };
  }
  const metadata = async (fileId: string) =>
    fileObjectSchema.parse(await (await call(`files/${fileId}`)).json());
  const download = (fileId: string) =>
    post(`files/${fileId}/download-sessions`, {
      version: "original",
      purpose: "Revisión de evidencia",
    });
  const job = async (jobId: string) =>
    (
      await pool!.query<{ status: string; attempt_count: number; error_code: string | null }>(
        "select status, attempt_count, error_code from infra.async_jobs where id=$1",
        [jobId],
      )
    ).rows[0]!;
  const transitions = async (jobId: string) =>
    (
      await pool!.query<{ to_status: string }>(
        "select to_status from infra.async_job_transitions where job_id=$1 order by occurred_at, id",
        [jobId],
      )
    ).rows.map((row) => row.to_status);
  const audit = async (fileId: string) =>
    (
      await pool!.query<{
        operation: string;
        result: string;
        actor_type: string;
        origin: string;
        correlation_id: string;
      }>(
        "select operation, result, actor_type, origin, correlation_id from audit.events where entity_id=$1 order by occurred_at_utc, created_at, operation",
        [fileId],
      )
    ).rows;
  /** Makes retried messages visible now instead of waiting for the real backoff. */
  const expireBackoff = () => pool!.query("update pgmq.q_file_scans set vt=clock_timestamp()");

  beforeAll(async () => {
    await new Promise<void>((resolve) => storage.server.listen(0, "127.0.0.1", resolve));
    storageOrigin = `http://127.0.0.1:${(storage.server.address() as AddressInfo).port}`;
    container = await new PostgreSqlContainer("postgres:17-alpine").start();
    pool = new Pool({ connectionString: container.getConnectionUri(), max: 6 });
    await pool.query("create role anon; create role authenticated; create role service_role;");
    await pool.query(
      await readFile(new URL("./support/pgmq-emulation.sql", import.meta.url), "utf8"),
    );
    await pool.query(
      (await migration("20260825000100_phase2_platform.sql")).replace(
        /create extension if not exists (pgmq|pg_cron);/gu,
        "",
      ),
    );
    for (const file of [
      "20260829000100_phase3_identity.sql",
      "20260914000100_phase3_recovery_execution.sql",
      "20260917000100_phase4_equipment.sql",
      "20260924000100_phase5_subscriptions.sql",
      "20260929000100_phase5_checkout_intents.sql",
      "20260929000200_phase5_stripe_webhooks.sql",
      "20261002000100_phase5_audit.sql",
      "20261002000200_phase5_audit_producers.sql",
      "20261003000100_phase5_outbox.sql",
      "20261003000200_phase5_outbox_publisher.sql",
      "20261003000300_phase5_consumers.sql",
      "20261003000400_phase5_jobs.sql",
      "20261003000500_phase5_files.sql",
      "20261003000600_phase5_file_scans.sql",
    ])
      await pool.query(await migration(file));
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic scans','COMPANY')",
      [account],
    );
    await pool.query(
      `insert into identity.users(id,identity_subject,username,email,display_name,status) values
       ($1::uuid,$1::text,'scan-user','scan-user@example.test','Scan user','ACTIVE'),
       ($2::uuid,$2::text,'scan-support','scan-support@example.test','Support','ACTIVE')`,
      [user, support],
    );
    await pool.query("insert into equipment.branches(id,account_id,data) values($1,$2,'{}')", [
      branch,
      account,
    ]);
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_URL = storageOrigin;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    db = new FilesDatabase();

    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { Module } = apiRequire("@nestjs/common") as {
      Module(metadata: unknown): ClassDecorator;
    };
    const { NestFactory } = apiRequire("@nestjs/core") as {
      NestFactory: { create(module: unknown, options: unknown): Promise<NonNullable<typeof app>> };
    };
    class TestModule {}
    Module({
      controllers: [FilesController],
      providers: [
        AuthenticationGuard,
        AuthorizationGuard,
        { provide: FilesService, useValue: new FilesService(db, new SupabaseObjectStorage()) },
        {
          provide: TOKEN_VERIFIER,
          useValue: {
            verify(token: string) {
              if (token !== "fixture") throw new Error("Invalid fixture token");
              return { sub: user, aal: "aal1" };
            },
          },
        },
        {
          provide: IdentityStore,
          useValue: {
            synchronizeIdentity: () => ({ id: user, status: "ACTIVE" }),
            getAuthorizationSubject: async (): Promise<AuthorizationSubject> => ({
              userId: user,
              membershipId: randomUUID(),
              membershipAccountId: account,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: "ACTIVE",
              assuranceLevel: "aal1",
              permissions: ["files.upload", "files.read"].map((code) => ({
                code,
                effect: "ALLOW" as const,
                classification: "CONFIDENTIAL" as const,
              })),
              accountWide: true,
              branchIds: new Set(),
              machineIds: new Set(),
            }),
          },
        },
      ],
    })(TestModule);
    app = await NestFactory.create(TestModule, { logger: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    url = await app.getUrl();
  });
  afterAll(async () => {
    for (const [name, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await app?.close();
    await db?.onModuleDestroy();
    await pool?.end();
    await container?.stop();
    await new Promise<void>((resolve) => storage.server.close(() => resolve()));
  });

  it("promotes a clean upload: definitive hash, originals bucket, available and audited", async () => {
    const file = await upload(PNG);
    expect((await metadata(file.fileId)).status).toBe("processing");
    expect((await download(file.fileId)).status).toBe(409);

    const summary = await processFileScans(pool!, simulated());
    expect(summary).toMatchObject({ received: 1, clean: 1, rejected: 0, retried: 0 });

    const promoted = await metadata(file.fileId);
    expect(promoted).toMatchObject({ status: "available", sha256: sha(PNG) });
    const version = await pool!.query(
      "select storage_zone, scan_status, sha256, available_at is not null as available, scan_details->>'engine' as engine from files.file_versions where id=$1",
      [file.version_id],
    );
    expect(version.rows[0]).toEqual({
      storage_zone: "PRIVATE_ORIGINAL",
      scan_status: "CLEAN",
      sha256: sha(PNG),
      available: true,
      engine: "simulated",
    });
    expect(storage.objects.get(`originals/${file.object_key}`)?.bytes.equals(PNG)).toBe(true);
    expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(false);

    const granted = await download(file.fileId);
    expect(granted.status).toBe(201);
    const read = downloadSessionSchema.parse(await granted.json());
    expect(read.url).toContain("/object/sign/originals/");
    expect(Buffer.from(await (await fetch(read.url)).arrayBuffer()).equals(PNG)).toBe(true);

    expect(await job(file.jobId)).toMatchObject({ status: "SUCCEEDED", attempt_count: 1 });
    expect(await transitions(file.jobId)).toEqual(["QUEUED", "RUNNING", "SUCCEEDED"]);
    const queued = await pool!.query(
      "select (select count(*)::int from pgmq.q_file_scans) as pending, (select count(*)::int from pgmq.a_file_scans where message->>'jobId'=$1) as archived",
      [file.jobId],
    );
    expect(queued.rows[0]).toEqual({ pending: 0, archived: 1 });
    const events = await audit(file.fileId);
    expect(events.map((e) => e.operation)).toEqual([
      "FileUploadAuthorized",
      "FileUploadCompleted",
      "FileReadDenied",
      "FileScanCompleted",
      "FileReadAuthorized",
    ]);
    const completed = events.find((e) => e.operation === "FileUploadCompleted")!;
    expect(events.find((e) => e.operation === "FileScanCompleted")).toMatchObject({
      actor_type: "SYSTEM",
      origin: "WORKER",
      result: "SUCCESS",
      correlation_id: completed.correlation_id,
    });

    // Redelivery of the same message never repeats the effect.
    await pool!.query(
      "select pgmq.send('file_scans', message) from pgmq.a_file_scans where message->>'jobId'=$1",
      [file.jobId],
    );
    expect(await processFileScans(pool!, simulated())).toMatchObject({ duplicates: 1, clean: 0 });
    expect((await audit(file.fileId)).length).toBe(events.length);
  });

  it("rejects malware detected by clamd, alerts and deletes the bytes from quarantine", async () => {
    const received: Buffer[] = [];
    const clamd: Server = createTcpServer({ allowHalfOpen: true }, (socket) => {
      const chunks: Buffer[] = [];
      socket.on("data", (chunk: Buffer) => chunks.push(chunk));
      socket.on("end", () => {
        const all = Buffer.concat(chunks);
        received.push(all);
        socket.end(
          all.includes(EICAR_TEST_SIGNATURE)
            ? "stream: Eicar-Test-Signature FOUND\0"
            : "stream: OK\0",
        );
      });
    });
    await new Promise<void>((resolve) => clamd.listen(0, "127.0.0.1", resolve));
    const scanner = new ClamAvScanner("127.0.0.1", (clamd.address() as AddressInfo).port);
    try {
      const file = await upload(INFECTED_PDF, {
        fileName: "factura.pdf",
        mediaType: "application/pdf",
      });
      const alerts: unknown[] = [];
      const summary = await processFileScans(pool!, {
        scanner,
        storage: scanStorage(),
        onSecurityAlert: (alert) => alerts.push(alert),
      });
      expect(summary).toMatchObject({ received: 1, rejected: 1, clean: 0 });
      expect(received[0]!.toString("latin1").startsWith("zINSTREAM\0")).toBe(true);
      expect(alerts).toEqual([
        expect.objectContaining({ fileId: file.fileId, verdict: "INFECTED", accountId: account }),
      ]);

      expect((await metadata(file.fileId)).status).toBe("rejected");
      const denied = await download(file.fileId);
      expect(denied.status).toBe(409);
      expect(apiErrorSchema.parse(await denied.json()).error.code).toBe("FILE_NOT_AVAILABLE");
      expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(false);
      expect(storage.objects.has(`originals/${file.object_key}`)).toBe(false);
      const version = await pool!.query(
        "select scan_status, storage_zone, purged_at is not null as purged, scan_details->>'signature' as signature from files.file_versions where id=$1",
        [file.version_id],
      );
      expect(version.rows[0]).toEqual({
        scan_status: "INFECTED",
        storage_zone: "QUARANTINE",
        purged: true,
        signature: "Eicar-Test-Signature",
      });
      const closed = await pool!.query("select closed_reason from files.file_objects where id=$1", [
        file.fileId,
      ]);
      expect(closed.rows[0]).toEqual({ closed_reason: "MALWARE_DETECTED" });
      const alert = await pool!.query(
        "select event_type, payload->>'verdict' as verdict, sensitivity from infra.outbox_events where aggregate_id=$1",
        [file.fileId],
      );
      expect(alert.rows).toEqual([
        { event_type: "FileSecurityAlertRaised", verdict: "INFECTED", sensitivity: "confidential" },
      ]);
      expect((await audit(file.fileId)).map((e) => [e.operation, e.result])).toEqual(
        expect.arrayContaining([
          ["FileMalwareDetected", "FAILED"],
          ["FileObjectPurged", "SUCCESS"],
          ["FileReadDenied", "DENIED"],
        ]),
      );
      expect(await job(file.jobId)).toMatchObject({ status: "SUCCEEDED" });
    } finally {
      await new Promise<void>((resolve) => clamd.close(() => resolve()));
    }
  });

  it("rejects a declared hash mismatch and content disguised as another type", async () => {
    const tampered = await upload(PNG, { declaredSha256: sha(Buffer.from("other")) });
    const disguised = await upload(PDF, { fileName: "foto.png", mediaType: "image/png" });
    const summary = await processFileScans(pool!, simulated());
    expect(summary).toMatchObject({ received: 2, rejected: 2 });
    const reasons = await pool!.query<{ id: string; status: string; closed_reason: string }>(
      "select id, status, closed_reason from files.file_objects where id = any($1::uuid[]) order by closed_reason",
      [[tampered.fileId, disguised.fileId]],
    );
    expect(reasons.rows).toEqual([
      { id: tampered.fileId, status: "REJECTED", closed_reason: "INTEGRITY_MISMATCH" },
      { id: disguised.fileId, status: "REJECTED", closed_reason: "SIGNATURE_MISMATCH" },
    ]);
    for (const file of [tampered, disguised])
      expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(false);
    expect((await audit(disguised.fileId)).map((e) => e.operation)).toContain(
      "FileIntegrityRejected",
    );
  });

  it("retries a failed purge until the infected bytes are gone", async () => {
    const file = await upload(INFECTED_PDF, { fileName: "x.pdf", mediaType: "application/pdf" });
    storage.failing.add("DELETE");
    expect(await processFileScans(pool!, simulated())).toMatchObject({ retried: 1 });
    expect((await metadata(file.fileId)).status).toBe("rejected");
    expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(true);
    expect(await job(file.jobId)).toMatchObject({
      status: "RETRY_WAIT",
      error_code: "STORAGE_UNAVAILABLE",
    });
    storage.failing.delete("DELETE");
    await expireBackoff();
    expect(await processFileScans(pool!, simulated())).toMatchObject({ duplicates: 1 });
    expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(false);
    expect(await job(file.jobId)).toMatchObject({ status: "SUCCEEDED" });
  });

  it("keeps files quarantined while the scanner is down and recovers after a support retry", async () => {
    const file = await upload(PNG);
    // Nothing listens on this port: every attempt fails like an unavailable scanner.
    const closed = createTcpServer();
    await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    const down: FileScanDependencies = {
      scanner: new ClamAvScanner("127.0.0.1", port, 1_000),
      storage: scanStorage(),
    };
    for (let attempt = 1; attempt <= 4; attempt++) {
      expect(await processFileScans(pool!, down)).toMatchObject({ retried: 1 });
      expect((await metadata(file.fileId)).status).toBe("processing");
      await expireBackoff();
    }
    expect(await job(file.jobId)).toMatchObject({ status: "RETRY_WAIT", attempt_count: 4 });
    expect(await processFileScans(pool!, down)).toMatchObject({ deadLettered: 1 });
    expect((await metadata(file.fileId)).status).toBe("quarantined");
    expect((await download(file.fileId)).status).toBe(409);
    expect(await job(file.jobId)).toMatchObject({
      status: "DEAD_LETTER",
      error_code: "SCANNER_UNAVAILABLE",
    });
    expect(storage.objects.has(`quarantine/${file.object_key}`)).toBe(true);
    const dlq = await pool!.query(
      "select count(*)::int as total from pgmq.q_file_scans_dlq where message->'payload'->>'jobId'=$1",
      [file.jobId],
    );
    expect(dlq.rows[0]).toEqual({ total: 1 });
    const failures = (await audit(file.fileId)).filter((e) => e.origin === "WORKER");
    // The fifth attempt and the quarantine share one transaction (same timestamp).
    expect(failures.map((e) => e.operation).sort()).toEqual([
      "FileQuarantined",
      ...Array<string>(5).fill("FileScanAttemptFailed"),
    ]);

    // INT-004: support re-queues the job once the scanner is back.
    await pool!.query("select * from infra.retry_dead_letter_job($1,$2,null,$3,$4,null)", [
      file.jobId,
      support,
      "Escáner restablecido después del mantenimiento",
      randomUUID(),
    ]);
    expect(await processFileScans(pool!, simulated())).toMatchObject({ clean: 1 });
    expect(await metadata(file.fileId)).toMatchObject({ status: "available", sha256: sha(PNG) });
    expect((await audit(file.fileId)).map((e) => e.operation)).toEqual(
      expect.arrayContaining(["FileScanRequeued", "FileScanCompleted"]),
    );
    expect((await transitions(file.jobId)).slice(-3)).toEqual(["QUEUED", "RUNNING", "SUCCEEDED"]);
  });
});
