import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";
import { FilesService } from "../../apps/api/dist/modules/files/application/files.service.js";
import { FilesDatabase } from "../../apps/api/dist/modules/files/infrastructure/files.database.js";
import { SupabaseObjectStorage } from "../../apps/api/dist/modules/files/infrastructure/supabase-storage.js";
import { SupabaseScanStorage } from "../../apps/worker/dist/processors/files/storage.js";

// Local-only smoke: real production adapters, PostgreSQL and Supabase Storage. Identity
// and a CLEAN verdict are synthetic fixtures; this does not certify a production scanner.
const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "pnpm";
const args =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "node_modules\\.bin\\supabase.CMD status -o json"]
    : ["exec", "supabase", "status", "-o", "json"];
const output = execFileSync(command, args, {
  encoding: "utf8",
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
const config = JSON.parse(output.slice(output.indexOf("{")));
for (const endpoint of [config.API_URL, config.DB_URL]) {
  assert.ok(
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(endpoint).hostname),
    "Only local Supabase is allowed",
  );
}
process.env.SUPABASE_URL = config.API_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = config.SERVICE_ROLE_KEY ?? config.SECRET_KEY;
const client = new pg.Client({ connectionString: config.DB_URL });
await client.connect();
const db = new FilesDatabase();
await db.pool.end();
// One transaction for all synthetic relational data; Storage owns its separate object rows.
Object.defineProperty(db, "pool", { value: client });
const storage = new SupabaseObjectStorage();
const objects = new SupabaseScanStorage(config.API_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const service = new FilesService(db, storage);
const account = randomUUID(),
  actor = randomUUID();
const request = {
  headers: {},
  localUser: { id: actor },
  correlationId: randomUUID(),
  authorizationSubject: {
    userId: actor,
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "ACTIVE",
    assuranceLevel: "aal1",
    accountWide: true,
    branchIds: new Set(),
    machineIds: new Set(),
    permissions: ["files.upload", "files.read"].map((code) => ({
      code,
      effect: "ALLOW",
      classification: "CONFIDENTIAL",
    })),
  },
};
const bytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=",
  "base64",
);
const digest = createHash("sha256").update(bytes).digest("hex");
let objectKey;
let cleanupFailed = false;
try {
  await client.query("begin");
  await client.query(
    "insert into identity.accounts(id,name,account_type) values($1,'F5-10 synthetic smoke','COMPANY')",
    [account],
  );
  await client.query(
    "insert into identity.users(id,identity_subject,username,email,display_name,status) values($1,$2,$2,$3,'F5-10 smoke','ACTIVE')",
    [actor, `smoke-${actor}`, `${actor}@example.test`],
  );
  const upload = await service.createUploadSession(request, randomUUID(), {
    fileName: "smoke.png",
    mediaType: "image/png",
    sizeBytes: bytes.length,
    purpose: "document_original",
    relatedResource: { type: "account", id: account },
  });
  objectKey = (
    await client.query("select object_key from files.upload_sessions where file_object_id=$1", [
      upload.fileId,
    ])
  ).rows[0].object_key;
  const put = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: upload.requiredHeaders,
    body: bytes,
  });
  assert.ok(put.ok, `Signed upload returned HTTP ${put.status}`);
  console.info("PASS signed upload to real private quarantine bucket");
  await service.completeUpload(request, upload.fileId, randomUUID(), {
    uploadToken: upload.uploadToken,
    sha256: digest,
  });
  await assert.rejects(
    service.createDownloadSession(request, upload.fileId, randomUUID(), {
      version: "original",
      purpose: "Smoke verification",
    }),
    { code: "FILE_NOT_AVAILABLE" },
  );
  const stored = await objects.download("quarantine", objectKey, 1024);
  assert.deepEqual(Buffer.from(stored), bytes);
  await objects.upload("originals", objectKey, stored, "image/png");
  await client.query(
    "update files.file_versions set sha256=$2,scan_status='CLEAN',storage_zone='PRIVATE_ORIGINAL',available_at=now() where file_object_id=$1",
    [upload.fileId, digest],
  );
  await client.query("update files.file_objects set status='AVAILABLE' where id=$1", [
    upload.fileId,
  ]);
  const key = randomUUID();
  const download = await service.createDownloadSession(request, upload.fileId, key, {
    version: "original",
    purpose: "Smoke verification",
  });
  const response = await fetch(download.url);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.ok(Date.parse(download.expiresAt) - Date.now() <= 300_000);
  assert.match(response.headers.get("content-disposition") ?? "", /attachment/i);
  console.info("PASS real signed download: exact bytes, forced attachment, bounded lifetime");
  const anonymous = await fetch(
    `${config.API_URL}/storage/v1/object/public/originals/${objectKey}`,
  );
  assert.ok(!anonymous.ok, "Private object must not have a public URL");
  await service.createDownloadSession(request, upload.fileId, key, {
    version: "original",
    purpose: "Smoke verification",
  });
  const results = await client.query(
    "select result,access_type from files.download_events e join files.file_versions v on v.id=e.file_version_id where v.file_object_id=$1 order by e.downloaded_at,e.id",
    [upload.fileId],
  );
  assert.equal(
    results.rows.filter((row) => row.result === "AUTHORIZED" && row.access_type === "PRIVATE")
      .length,
    2,
  );
  const audit = await client.query(
    "select count(*)::int as n from audit.events where entity_id=$1 and operation='FileDownloadRecorded'",
    [upload.fileId],
  );
  assert.equal(audit.rows[0].n, 2);
  console.info("PASS private access and durable issuance audit for repeated requests");
  await client.query(
    "update files.file_versions set expires_at=clock_timestamp()-interval '1 second' where file_object_id=$1",
    [upload.fileId],
  );
  await assert.rejects(
    service.createDownloadSession(request, upload.fileId, randomUUID(), {
      version: "original",
      purpose: "Smoke verification",
    }),
    { code: "FILE_NOT_AVAILABLE" },
  );
  console.info("PASS expired file rejected against real PostgreSQL");
} finally {
  if (objectKey)
    for (const bucket of ["quarantine", "originals"]) {
      try {
        await objects.remove(bucket, objectKey);
      } catch {
        cleanupFailed = true;
        console.error(`FAIL synthetic object cleanup in ${bucket}`);
      }
    }
  await client.query("rollback");
  await client.end();
  console.info("PASS synthetic objects removed; relational fixtures rolled back");
}
if (cleanupFailed) throw new Error("Synthetic object cleanup incomplete");
console.info("RESULT: PASS — local Supabase Storage smoke (synthetic identity and CLEAN verdict)");
