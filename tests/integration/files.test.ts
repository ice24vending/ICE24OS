import { mkdir, readFile } from "node:fs/promises";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
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
import { storageDouble } from "./support/storage-double.js";

const SERVICE_KEY = "service-role-fixture";
// Fixed loopback port: the private-web build allows it in CSP connect-src (ci.yml).
const STORAGE_PORT = Number(process.env.ICE24_STORAGE_TEST_PORT ?? 54329);

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), randomBytes(2040)]);

describe("F5-08 pre-authorized direct uploads, confirmation and temporary reads", () => {
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
  const storage = storageDouble(SERVICE_KEY);
  const storageOrigin = `http://127.0.0.1:${STORAGE_PORT}`;
  const oldEnv = {
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const account = randomUUID(),
    otherAccount = randomUUID(),
    branch = randomUUID(),
    otherBranch = randomUUID(),
    otherAccountBranch = randomUUID(),
    user = randomUUID();
  let permissions: AuthorizationSubject["permissions"] = [];
  let subjectAccount = account;
  let accountWide = true;
  let branchIds = new Set<string>();
  let accessMode: AuthorizationSubject["accountAccessMode"] = "ACTIVE";
  const allow = (...codes: string[]) =>
    codes.map((code) => ({
      code,
      effect: "ALLOW" as const,
      classification: "CONFIDENTIAL" as const,
    }));
  const reset = () => {
    permissions = allow("files.upload", "files.read");
    subjectAccount = account;
    accountWide = true;
    branchIds = new Set();
    accessMode = "ACTIVE";
  };
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
  const post = (path: string, body: unknown, key: string | null = randomUUID()) =>
    call(path, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(body),
    });
  const request = (overrides: Record<string, unknown> = {}) => ({
    fileName: "evidencia.png",
    mediaType: "image/png",
    sizeBytes: PNG.length,
    purpose: "equipment_evidence",
    relatedResource: { type: "branch", id: branch },
    ...overrides,
  });
  const errorCode = async (response: Response) =>
    apiErrorSchema.parse(await response.json()).error.code;
  async function issue(overrides: Record<string, unknown> = {}, key: string = randomUUID()) {
    const response = await post("files/upload-sessions", request(overrides), key);
    expect(response.status).toBe(201);
    return uploadSessionSchema.parse(await response.json());
  }
  const put = (uploadUrl: string, bytes: Buffer, type = "image/png") =>
    fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": type },
      body: new Uint8Array(bytes),
    });
  /** Simulates the F5-09 antivirus promotion: clean scan, moved to the originals bucket. */
  async function promote(fileId: string) {
    const version = await pool!.query<{ object_key: string }>(
      "select v.object_key from files.file_versions v join files.file_objects f on f.current_version_id=v.id where f.id=$1",
      [fileId],
    );
    const key = version.rows[0]!.object_key;
    storage.objects.set(`originals/${key}`, storage.objects.get(`quarantine/${key}`)!);
    await pool!.query(
      `update files.file_versions set sha256=$2, scan_status='CLEAN', storage_zone='PRIVATE_ORIGINAL',
       available_at=now() where object_key=$1`,
      [
        key,
        createHash("sha256")
          .update(storage.objects.get(`quarantine/${key}`)!.bytes)
          .digest("hex"),
      ],
    );
    await pool!.query("update files.file_objects set status='AVAILABLE' where id=$1", [fileId]);
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) => storage.server.listen(STORAGE_PORT, "127.0.0.1", resolve));
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
      "20261003000700_phase5_downloads.sql",
    ])
      await pool.query(await migration(file));
    await pool.query(
      "insert into identity.accounts(id,name,account_type) values($1,'Synthetic A','COMPANY'),($2,'Synthetic B','COMPANY')",
      [account, otherAccount],
    );
    await pool.query(
      "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1::uuid,$1::text,'files-user','files-user@example.test','Files user','ACTIVE')",
      [user],
    );
    await pool.query(
      "insert into equipment.branches(id,account_id,data) values($1,$3,'{\"name\":\"Centro\"}'),($2,$3,'{}'),($4,$5,'{}')",
      [branch, otherBranch, account, otherAccountBranch, otherAccount],
    );
    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.SUPABASE_URL = storageOrigin;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
    db = new FilesDatabase();
    reset();

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
              membershipAccountId: subjectAccount,
              membershipStatus: "ACTIVE",
              contextActive: true,
              accountAccessMode: accessMode,
              assuranceLevel: "aal1",
              permissions,
              accountWide,
              branchIds,
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

  it("uploads directly to the account prefix, confirms into quarantine and queues the scan", async () => {
    reset();
    const session = await issue();
    expect(
      session.uploadUrl.startsWith(
        `${storageOrigin}/storage/v1/object/upload/sign/quarantine/${account}/${session.fileId}/v1/`,
      ),
    ).toBe(true);
    expect(session.requiredHeaders).toEqual({ "Content-Type": "image/png" });
    expect(Date.parse(session.expiresAt) - Date.now()).toBeLessThanOrEqual(600_000);
    const stored = await pool!.query(
      "select token_hash from files.upload_sessions where file_object_id=$1",
      [session.fileId],
    );
    expect(stored.rows[0].token_hash).toBe(
      createHash("sha256").update(session.uploadToken).digest("hex"),
    );

    expect((await put(session.uploadUrl, PNG)).status).toBe(200);
    const sha256 = createHash("sha256").update(PNG).digest("hex");
    const key = randomUUID();
    const accepted = await post(
      `files/${session.fileId}/complete-upload`,
      { uploadToken: session.uploadToken, sha256 },
      key,
    );
    expect(accepted.status).toBe(202);
    const job = publicJobSchema.parse(await accepted.json());
    expect(job).toMatchObject({ type: "FILE_SCAN", status: "queued" });
    const replay = await post(
      `files/${session.fileId}/complete-upload`,
      { uploadToken: session.uploadToken, sha256 },
      key,
    );
    expect(publicJobSchema.parse(await replay.json()).id).toBe(job.id);

    const metadata = fileObjectSchema.parse(await (await call(`files/${session.fileId}`)).json());
    expect(metadata).toMatchObject({
      ownerAccountId: account,
      fileName: "evidencia.png",
      sizeBytes: PNG.length,
      status: "processing",
      visibility: "private",
      relatedResource: { type: "branch", id: branch },
    });
    expect(JSON.stringify(metadata)).not.toMatch(/quarantine|object|token/iu);
    const version = await pool!.query(
      "select storage_zone, scan_status, available_at from files.file_versions where file_object_id=$1",
      [session.fileId],
    );
    expect(version.rows[0]).toEqual({
      storage_zone: "QUARANTINE",
      scan_status: "PENDING",
      available_at: null,
    });
    const message = await pool!.query<{ message: { declaredSha256: string; accountId: string } }>(
      "select message from pgmq.q_file_scans where message->>'jobId'=$1",
      [job.id],
    );
    expect(message.rows[0]!.message).toMatchObject({ declaredSha256: sha256, accountId: account });

    // Not readable while waiting for the antivirus; readable once promoted (F5-09).
    const pending = await post(`files/${session.fileId}/download-sessions`, {
      version: "original",
      purpose: "Revisión de evidencia",
    });
    expect(pending.status).toBe(409);
    expect(await errorCode(pending)).toBe("FILE_NOT_AVAILABLE");
    await promote(session.fileId);
    const granted = await post(`files/${session.fileId}/download-sessions`, {
      version: "original",
      purpose: "Revisión de evidencia",
    });
    expect(granted.status).toBe(201);
    expect(granted.headers.get("cache-control")).toBe("no-store");
    const read = downloadSessionSchema.parse(await granted.json());
    expect(
      read.url.startsWith(`${storageOrigin}/storage/v1/object/sign/originals/${account}/`),
    ).toBe(true);
    expect(Date.parse(read.expiresAt) - Date.now()).toBeLessThanOrEqual(300_000);
    const downloaded = await fetch(read.url);
    expect(downloaded.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await downloaded.arrayBuffer()).equals(PNG)).toBe(true);
    expect(storage.log.some((entry) => entry.path.startsWith("object/public"))).toBe(false);

    const audit = await pool!.query<{ operation: string; result: string; actor_user_id: string }>(
      "select operation, result, actor_user_id from audit.events where entity_id=$1 order by occurred_at_utc, operation",
      [session.fileId],
    );
    expect(audit.rows.map((row) => `${row.operation}:${row.result}`)).toEqual([
      "FileUploadAuthorized:SUCCESS",
      "FileUploadCompleted:SUCCESS",
      "FileReadDenied:DENIED",
      "FileReadAuthorized:SUCCESS",
      "FileDownloadRecorded:SUCCESS",
    ]);
    expect(audit.rows.every((row) => row.actor_user_id === user)).toBe(true);
  });

  it("F5-10 records signing outcomes, repeated issuance, expiry and append-only history", async () => {
    reset();
    const session = await issue();
    await put(session.uploadUrl, PNG);
    await post(`files/${session.fileId}/complete-upload`, { uploadToken: session.uploadToken });
    await promote(session.fileId);
    const path = `files/${session.fileId}/download-sessions`;
    const body = { version: "original", purpose: "Auditoría de descarga" };
    const key = randomUUID();
    const first = await post(path, body, key);
    const second = await post(path, body, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await first.json()).url).not.toBe((await second.json()).url);
    storage.failing.add("POST");
    try {
      expect((await post(path, body)).status).toBe(503);
    } finally {
      storage.failing.clear();
    }
    await pool!.query(
      "update files.file_versions set expires_at=now()-interval '1 second' where file_object_id=$1",
      [session.fileId],
    );
    const before = storage.log.length;
    expect((await post(path, body)).status).toBe(409);
    expect(storage.log.length).toBe(before);
    const events = await pool!.query(
      "select e.* from files.download_events e join files.file_versions v on v.id=e.file_version_id where v.file_object_id=$1 order by e.downloaded_at",
      [session.fileId],
    );
    expect(events.rows.map((e) => e.result)).toEqual([
      "AUTHORIZED",
      "AUTHORIZED",
      "ERROR",
      "EXPIRED",
    ]);
    expect(
      events.rows.every(
        (e) =>
          e.user_id === user &&
          e.account_id === account &&
          e.access_type === "PRIVATE" &&
          e.correlation_id,
      ),
    ).toBe(true);
    expect(JSON.stringify(events.rows)).not.toContain("token=");
    await expect(
      pool!.query("update files.download_events set result='ERROR' where id=$1", [
        events.rows[0].id,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool!.query("delete from files.download_events where id=$1", [events.rows[0].id]),
    ).rejects.toMatchObject({ code: "23514" });
    const issued = await pool!.query(
      "select count(*)::int as count from audit.events where entity_id=$1 and operation='FileDownloadRecorded'",
      [session.fileId],
    );
    expect(issued.rows[0].count).toBe(3);
  });

  it("F5-10 rechecks scope after signing and completes each session only once", async () => {
    reset();
    const session = await issue();
    await put(session.uploadUrl, PNG);
    await post(`files/${session.fileId}/complete-upload`, { uploadToken: session.uploadToken });
    await promote(session.fileId);
    const scope = {
      accountId: account,
      actorUserId: user,
      contextSessionId: null,
      accountWide: false,
      branchIds: [branch],
      machineIds: [],
      correlationId: randomUUID(),
    };
    const target = await db!.authorizeRead(scope, session.fileId, "Revisión", 300);
    expect(target).not.toBeNull();
    await expect(
      db!.finishDownload({ ...scope, accountId: otherAccount }, target!.sessionId, "AUTHORIZED"),
    ).rejects.toThrow("File not found");
    expect(
      await db!.finishDownload({ ...scope, branchIds: [] }, target!.sessionId, "AUTHORIZED"),
    ).toBe("DENIED");
    expect(await db!.finishDownload(scope, target!.sessionId, "AUTHORIZED")).toBe("DENIED");
    const count = await pool!.query(
      "select count(*)::int as count from files.download_events where session_id=$1",
      [target!.sessionId],
    );
    expect(count.rows[0].count).toBe(1);
    const next = await db!.authorizeRead(scope, session.fileId, "Revisión", 300);
    await pool!.query("update files.file_objects set status='EXPIRED' where id=$1", [
      session.fileId,
    ]);
    expect(await db!.finishDownload(scope, next!.sessionId, "AUTHORIZED")).toBe("DENIED");
  });

  it("isolates files between accounts and scopes", async () => {
    reset();
    const session = await issue();
    await put(session.uploadUrl, PNG);
    await post(`files/${session.fileId}/complete-upload`, { uploadToken: session.uploadToken });
    await promote(session.fileId);

    subjectAccount = otherAccount;
    for (const response of [
      await call(`files/${session.fileId}`),
      await post(`files/${session.fileId}/download-sessions`, {
        version: "original",
        purpose: "Intento",
      }),
      await post(`files/${session.fileId}/complete-upload`, { uploadToken: session.uploadToken }),
      await post(`files/${session.fileId}/abort`, {}),
    ]) {
      expect(response.status).toBe(404);
      expect(await errorCode(response)).toBe("NOT_FOUND");
    }
    // Account B cannot attach files to account A's branch, nor A to B's.
    expect((await post("files/upload-sessions", request())).status).toBe(404);
    subjectAccount = account;
    expect(
      (
        await post(
          "files/upload-sessions",
          request({ relatedResource: { type: "branch", id: otherAccountBranch } }),
        )
      ).status,
    ).toBe(404);

    // Branch-scoped member: only its branch, never account-level files.
    accountWide = false;
    branchIds = new Set([otherBranch]);
    expect((await call(`files/${session.fileId}`)).status).toBe(404);
    expect((await post("files/upload-sessions", request())).status).toBe(404);
    expect(
      (
        await post(
          "files/upload-sessions",
          request({
            purpose: "document_original",
            mediaType: "application/pdf",
            relatedResource: { type: "account", id: account },
          }),
        )
      ).status,
    ).toBe(404);
    branchIds = new Set([branch]);
    expect((await call(`files/${session.fileId}`)).status).toBe(200);
    const denied = await pool!.query(
      "select count(*)::int as count from audit.events where entity_id=$1 and operation='FileReadAuthorized'",
      [session.fileId],
    );
    expect(denied.rows[0].count).toBe(0);
  });

  it("denies unauthenticated, unauthorized and read-only writes but keeps protected downloads", async () => {
    reset();
    expect((await fetch(`${url}/api/v1/files/${randomUUID()}`)).status).toBe(401);
    permissions = allow("files.read");
    const forbidden = await post("files/upload-sessions", request());
    expect(forbidden.status).toBe(403);
    permissions = [];
    expect((await call(`files/${randomUUID()}`)).status).toBe(403);

    reset();
    const session = await issue();
    await put(session.uploadUrl, PNG);
    await post(`files/${session.fileId}/complete-upload`, { uploadToken: session.uploadToken });
    await promote(session.fileId);
    accessMode = "READ_ONLY";
    const readOnly = await post("files/upload-sessions", request());
    expect(readOnly.status).toBe(403);
    expect(await errorCode(readOnly)).toBe("ACCOUNT_READ_ONLY");
    const download = await post(`files/${session.fileId}/download-sessions`, {
      version: "original",
      purpose: "Consulta en solo lectura",
    });
    expect(download.status).toBe(201);
    accessMode = "SUSPENDED";
    expect(
      (
        await post(`files/${session.fileId}/download-sessions`, {
          version: "original",
          purpose: "x".repeat(5),
        })
      ).status,
    ).toBe(403);
  });

  it("rejects mismatches, invalid tokens, policy violations, key reuse and closed sessions", async () => {
    reset();
    const tooLarge = await post("files/upload-sessions", request({ sizeBytes: 20_000_000 }));
    expect([tooLarge.status, await errorCode(tooLarge)]).toEqual([413, "PAYLOAD_TOO_LARGE"]);
    const badType = await post(
      "files/upload-sessions",
      request({ purpose: "laboratory_analysis_original", mediaType: "image/png" }),
    );
    expect([badType.status, await errorCode(badType)]).toEqual([415, "UNSUPPORTED_MEDIA_TYPE"]);
    expect((await post("files/upload-sessions", request(), null)).status).toBe(400);
    const key = randomUUID();
    const first = await issue({}, key);
    const replay = await issue({}, key);
    expect(replay.fileId).toBe(first.fileId);
    expect(replay.uploadToken).not.toBe(first.uploadToken);
    const reused = await post("files/upload-sessions", request({ fileName: "otra.png" }), key);
    expect([reused.status, await errorCode(reused)]).toEqual([409, "IDEMPOTENCY_CONFLICT"]);

    // Nothing uploaded yet: mismatch without closing the session.
    const missing = await post(`files/${first.fileId}/complete-upload`, {
      uploadToken: replay.uploadToken,
    });
    expect([missing.status, await errorCode(missing)]).toEqual([422, "FILE_UPLOAD_MISMATCH"]);
    // The rotated token replaces the first one.
    await put(replay.uploadUrl, PNG);
    const stale = await post(`files/${first.fileId}/complete-upload`, {
      uploadToken: first.uploadToken,
    });
    expect(stale.status).toBe(422);

    // Different bytes than authorized: rejected and kept out of use.
    const wrong = await issue();
    await put(wrong.uploadUrl, PNG.subarray(0, 100));
    const mismatch = await post(`files/${wrong.fileId}/complete-upload`, {
      uploadToken: wrong.uploadToken,
    });
    expect([mismatch.status, await errorCode(mismatch)]).toEqual([422, "FILE_UPLOAD_MISMATCH"]);
    const rejected = fileObjectSchema.parse(await (await call(`files/${wrong.fileId}`)).json());
    expect(rejected.status).toBe("rejected");

    // Abort, then confirmation is a state error.
    const aborted = await issue();
    expect(
      (await post(`files/${aborted.fileId}/abort`, { reason: "Archivo equivocado" })).status,
    ).toBe(204);
    expect((await post(`files/${aborted.fileId}/abort`, {})).status).toBe(204);
    const late = await post(`files/${aborted.fileId}/complete-upload`, {
      uploadToken: aborted.uploadToken,
    });
    expect([late.status, await errorCode(late)]).toEqual([409, "STATE_TRANSITION_INVALID"]);

    // Expired sessions are closed by the scheduled sweep.
    const expired = await issue();
    await pool!.query(
      "update files.upload_sessions set created_at=now()-interval '20 minutes', expires_at=now()-interval '10 minutes' where file_object_id=$1",
      [expired.fileId],
    );
    await pool!.query("select files.expire_upload_sessions()");
    const closed = await post(`files/${expired.fileId}/complete-upload`, {
      uploadToken: expired.uploadToken,
    });
    expect(closed.status).toBe(409);
    expect(
      fileObjectSchema.parse(await (await call(`files/${expired.fileId}`)).json()).status,
    ).toBe("deleted_temporary");
  });

  it("documents FIL-001 to FIL-005 in OpenAPI", () => {
    const apiRequire = createRequire(new URL("../../apps/api/package.json", import.meta.url));
    const { SwaggerModule } = apiRequire("@nestjs/swagger") as {
      SwaggerModule: {
        createDocument(app: unknown, config: unknown): { paths: Record<string, unknown> };
      };
    };
    const document = SwaggerModule.createDocument(app, { info: { title: "Files", version: "1" } });
    for (const path of [
      "/api/v1/files/upload-sessions",
      "/api/v1/files/{fileId}/complete-upload",
      "/api/v1/files/{fileId}",
      "/api/v1/files/{fileId}/download-sessions",
      "/api/v1/files/{fileId}/abort",
    ])
      expect(document.paths[path]).toBeDefined();
  });

  it.runIf(process.env.ICE24_BROWSER_TESTS === "1")(
    "uploads from Chromium straight to storage, shows quarantine and downloads once verified",
    async () => {
      reset();
      const listener = createServer();
      await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
      const address = listener.address();
      if (!address || typeof address === "string") throw new Error("Missing port");
      const port = address.port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const origin = `http://localhost:${port}`,
        secret = randomBytes(32).toString("hex"),
        contextId = randomUUID(),
        csrfToken = randomBytes(16).toString("hex");
      const web = spawn(
        process.execPath,
        [
          fileURLToPath(
            new URL("../../apps/private-web/node_modules/next/dist/bin/next", import.meta.url),
          ),
          "start",
          "--port",
          String(port),
          "--hostname",
          "127.0.0.1",
        ],
        {
          cwd: fileURLToPath(new URL("../../apps/private-web", import.meta.url)),
          env: {
            ...process.env,
            NODE_ENV: "production",
            PRIVATE_API_URL: `${url}/api/v1`,
            PRIVATE_WEB_URL: origin,
            BFF_SESSION_SECRET: secret,
          },
          stdio: "ignore",
          windowsHide: true,
        },
      );
      const browser = await chromium.launch({ headless: true });
      try {
        let ready = false;
        for (let i = 0; i < 100; i++) {
          try {
            await fetch(origin);
            ready = true;
            break;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        if (!ready) throw new Error("Private web did not start");
        const client = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
          acceptDownloads: true,
        });
        const iv = randomBytes(12),
          cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret).digest(), iv);
        const encrypted = Buffer.concat([
          cipher.update(
            JSON.stringify({
              accessToken: "fixture",
              refreshToken: "synthetic",
              expiresAt: Date.now() + 3600000,
              csrfToken,
              contextId,
            }),
          ),
          cipher.final(),
        ]);
        await client.addCookies([
          {
            name: "__Host-ice24_session",
            value: [iv, cipher.getAuthTag(), encrypted]
              .map((part) => part.toString("base64url"))
              .join("."),
            domain: "localhost",
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
        const page = await client.newPage();
        const violations: string[] = [];
        page.on("console", (message) => {
          if (/Content Security Policy/iu.test(message.text())) violations.push(message.text());
        });
        await page.goto(`${origin}/files?resourceType=branch&resourceId=${branch}`);
        await page.getByRole("heading", { name: "Archivos privados", exact: true }).waitFor();
        await page.getByLabel("Propósito", { exact: true }).selectOption("equipment_evidence");
        await page.getByLabel("Archivo a subir", { exact: true }).setInputFiles({
          name: "foto-equipo.png",
          mimeType: "image/png",
          buffer: PNG,
        });
        const before = storage.log.length;
        await page.getByRole("button", { name: "Subir archivo" }).click();
        await page
          .getByText(/Archivo «foto-equipo\.png» recibido\. Quedó en cuarentena/u)
          .waitFor({ timeout: 15_000 });
        expect(violations).toEqual([]);
        // The bytes went from the browser to storage, never through the BFF or API.
        const browserPut = storage.log
          .slice(before)
          .find(
            (entry) =>
              entry.method === "PUT" &&
              entry.path.startsWith(`object/upload/sign/quarantine/${account}/`),
          );
        expect(browserPut?.origin).toBe(origin);
        const row = await pool!.query<{ id: string }>(
          "select f.id from files.file_objects f join files.upload_sessions s on s.file_object_id=f.id where s.original_filename='foto-equipo.png' order by f.created_at desc limit 1",
        );
        const fileId = row.rows[0]!.id;
        expect(await page.locator(".file-list li").first().textContent()).toContain(
          "En verificación (cuarentena)",
        );
        await expect(
          page.getByRole("button", { name: "Descargar foto-equipo.png" }).isDisabled(),
        ).resolves.toBe(true);
        await mkdir("docs/qa/phase-5/evidence", { recursive: true });
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261003-f5-08-desktop.png",
          fullPage: true,
        });

        await promote(fileId);
        await page.getByRole("button", { name: "Consultar estado de foto-equipo.png" }).click();
        await page.getByText("Estado de «foto-equipo.png»: Disponible.").waitFor();
        const downloadEvent = page.waitForEvent("download");
        await page.getByRole("button", { name: "Descargar foto-equipo.png" }).click();
        const download = await downloadEvent;
        expect(download.url()).toContain(`/storage/v1/object/sign/originals/${account}/${fileId}/`);
        expect(download.suggestedFilename()).toBe("foto-equipo.png");
        await page.getByText(/Descarga temporal autorizada para «foto-equipo\.png»/u).waitFor();

        // Client-side policy check before any authorization request.
        await page
          .getByLabel("Propósito", { exact: true })
          .selectOption("laboratory_analysis_original");
        await page.getByLabel("Archivo a subir", { exact: true }).setInputFiles({
          name: "foto.png",
          mimeType: "image/png",
          buffer: PNG,
        });
        await page.getByRole("button", { name: "Subir archivo" }).click();
        await page
          .getByText("Ese tipo de archivo no está permitido para este propósito.")
          .waitFor();

        await page.setViewportSize({ width: 375, height: 812 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: "docs/qa/phase-5/evidence/20261003-f5-08-mobile.png",
          fullPage: true,
        });
        await client.close();
      } finally {
        await browser.close();
        web.kill();
      }
    },
    90_000,
  );
});
