import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthorizationSubject } from "@ice24/authorization";
import { uploadSessionSchema } from "@ice24/contracts";
import { FileApiError, FilesService, requestFingerprint, sha256Hex } from "./files.service.js";
import {
  FileIdempotencyError,
  FileMismatchError,
  FileNotFoundError,
  StorageUnavailableError,
  type FilesPort,
  type ObjectStoragePort,
} from "./files.port.js";
import { mapFileError } from "../infrastructure/files.database.js";

const account = randomUUID();
const branch = randomUUID();
const fileId = randomUUID();
const objectKey = `${account}/${fileId}/v1/${randomUUID()}`;
const body = {
  fileName: "evidencia.png",
  mediaType: "image/png",
  sizeBytes: 2048,
  purpose: "equipment_evidence",
  relatedResource: { type: "branch", id: branch },
};

function subject(codes: string[], patch: Partial<AuthorizationSubject> = {}): AuthorizationSubject {
  return {
    userId: randomUUID(),
    membershipId: randomUUID(),
    membershipAccountId: account,
    membershipStatus: "ACTIVE",
    contextActive: true,
    accountAccessMode: "ACTIVE",
    assuranceLevel: "aal1",
    permissions: codes.map((code) => ({ code, effect: "ALLOW", classification: "CONFIDENTIAL" })),
    accountWide: false,
    branchIds: new Set([branch]),
    machineIds: new Set(),
    ...patch,
  };
}
function setup(codes = ["files.upload", "files.read"], patch: Partial<AuthorizationSubject> = {}) {
  const port = {
    createUploadSession: vi.fn().mockResolvedValue({
      fileId,
      objectKey,
      expiresAt: "2026-10-03T12:10:00.000000Z",
      maxSizeBytes: 10_485_760,
      replayed: false,
    }),
    uploadTarget: vi.fn().mockResolvedValue({ objectKey, status: "ISSUED" }),
    completeUpload: vi.fn().mockResolvedValue({
      status: "VERIFYING",
      job: {
        id: randomUUID(),
        type: "FILE_SCAN",
        status: "queued",
        createdAt: "2026-10-03T12:00:00.000Z",
        links: { self: "/api/v1/jobs/x" },
      },
    }),
    abortUpload: vi.fn().mockResolvedValue(undefined),
    getFile: vi.fn().mockResolvedValue(null),
    authorizeRead: vi.fn().mockImplementation(async () => ({
      sessionId: fileId,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      bucket: "originals",
      objectKey,
      fileName: "a.png",
    })),
    finishDownload: vi.fn().mockResolvedValue("AUTHORIZED"),
  };
  const storage = {
    createSignedUpload: vi
      .fn()
      .mockResolvedValue(
        `https://p.supabase.co/storage/v1/object/upload/sign/quarantine/${objectKey}?token=t`,
      ),
    stat: vi.fn().mockResolvedValue({ sizeBytes: 2048, mediaType: "image/png" }),
    createSignedRead: vi
      .fn()
      .mockResolvedValue("https://p.supabase.co/storage/v1/object/sign/x?token=r"),
  };
  const context = randomUUID();
  const actor = randomUUID();
  return {
    port,
    storage,
    actor,
    context,
    service: new FilesService(
      port as unknown as FilesPort,
      storage as unknown as ObjectStoragePort,
    ),
    request: {
      headers: { "x-ice24-context-id": context },
      correlationId: randomUUID(),
      localUser: { id: actor },
      authorizationSubject: subject(codes, patch),
    } as never,
  };
}
const status = (promise: Promise<unknown>) =>
  promise.then(
    () => 0,
    (error: unknown) =>
      error instanceof FileApiError ? `${error.getStatus()} ${error.code}` : error,
  );

describe("FilesService pre-authorized uploads", () => {
  it("issues a one-time token whose hash is stored and a signed PUT in the account prefix", async () => {
    const f = setup();
    const session = uploadSessionSchema.parse(
      await f.service.createUploadSession(f.request, "upload-key-0001", body),
    );
    const command = f.port.createUploadSession.mock.calls[0]![1];
    expect(command.tokenHash).toBe(sha256Hex(session.uploadToken));
    expect(JSON.stringify(command)).not.toContain(session.uploadToken);
    expect(command).toMatchObject({ entityType: "BRANCH", entityId: branch, ttlSeconds: 600 });
    expect(f.port.createUploadSession.mock.calls[0]![0]).toMatchObject({
      accountId: account,
      actorUserId: f.actor,
      contextSessionId: f.context,
      accountWide: false,
      branchIds: [branch],
    });
    expect(f.storage.createSignedUpload).toHaveBeenCalledWith("quarantine", objectKey);
    expect(session).toMatchObject({ fileId, method: "PUT", maximumSizeBytes: 10_485_760 });
    expect(session.requiredHeaders).toEqual({ "Content-Type": "image/png" });
  });

  it("fingerprints requests independently of key order", () => {
    expect(requestFingerprint({ a: 1, b: { c: 2, d: 3 } })).toBe(
      requestFingerprint({ b: { d: 3, c: 2 }, a: 1 }),
    );
    expect(requestFingerprint({ a: 1 })).not.toBe(requestFingerprint({ a: 2 }));
  });

  it("maps policy, permission and idempotency failures to API.md codes", async () => {
    const f = setup();
    expect(await status(f.service.createUploadSession(f.request, "short", body))).toBe(
      "400 VALIDATION_FAILED",
    );
    expect(
      await status(
        f.service.createUploadSession(f.request, "upload-key-0002", {
          ...body,
          mediaType: "text/html",
        }),
      ),
    ).toBe("400 VALIDATION_FAILED");
    expect(
      await status(
        f.service.createUploadSession(f.request, "upload-key-0003", {
          ...body,
          purpose: "machine_photo",
          mediaType: "application/pdf",
          relatedResource: { type: "machine", id: branch },
        }),
      ),
    ).toBe("415 UNSUPPORTED_MEDIA_TYPE");
    expect(
      await status(
        f.service.createUploadSession(f.request, "upload-key-0004", {
          ...body,
          sizeBytes: 20_000_000,
        }),
      ),
    ).toBe("413 PAYLOAD_TOO_LARGE");
    f.port.createUploadSession.mockRejectedValueOnce(new FileIdempotencyError());
    expect(await status(f.service.createUploadSession(f.request, "upload-key-0005", body))).toBe(
      "409 IDEMPOTENCY_CONFLICT",
    );
    f.port.createUploadSession.mockRejectedValueOnce(new FileNotFoundError());
    expect(await status(f.service.createUploadSession(f.request, "upload-key-0006", body))).toBe(
      "404 NOT_FOUND",
    );
    const reader = setup(["files.read"]);
    expect(
      await status(reader.service.createUploadSession(reader.request, "upload-key-0007", body)),
    ).toBe("403 FORBIDDEN");
    expect(reader.port.createUploadSession).not.toHaveBeenCalled();
  });

  it("reports storage outages without leaking provider details", async () => {
    const f = setup();
    f.storage.createSignedUpload.mockRejectedValueOnce(new StorageUnavailableError("boom"));
    expect(await status(f.service.createUploadSession(f.request, "upload-key-0008", body))).toBe(
      "503 DEPENDENCY_UNAVAILABLE",
    );
  });
});

describe("FilesService confirmation and temporary reads", () => {
  const token = "T".repeat(43);

  it("confirms with what storage reports and returns the queued scan job", async () => {
    const f = setup();
    const job = await f.service.completeUpload(f.request, fileId, "complete-key-01", {
      uploadToken: token,
      sha256: "a".repeat(64),
    });
    expect(job).toMatchObject({ type: "FILE_SCAN", status: "queued" });
    expect(f.storage.stat).toHaveBeenCalledWith("quarantine", objectKey);
    expect(f.port.completeUpload).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: account }),
      fileId,
      sha256Hex(token),
      { sizeBytes: 2048, mediaType: "image/png" },
      "a".repeat(64),
    );
  });

  it("does not query storage again for closed sessions and rejects mismatches", async () => {
    const f = setup();
    f.port.uploadTarget.mockResolvedValueOnce({ objectKey, status: "COMPLETED" });
    await f.service.completeUpload(f.request, fileId, "complete-key-02", { uploadToken: token });
    expect(f.storage.stat).not.toHaveBeenCalled();
    f.port.completeUpload.mockResolvedValueOnce({ status: "REJECTED", job: null });
    expect(
      await status(
        f.service.completeUpload(f.request, fileId, "complete-key-03", { uploadToken: token }),
      ),
    ).toBe("422 FILE_UPLOAD_MISMATCH");
    f.port.completeUpload.mockRejectedValueOnce(new FileMismatchError());
    expect(
      await status(
        f.service.completeUpload(f.request, fileId, "complete-key-04", { uploadToken: token }),
      ),
    ).toBe("422 FILE_UPLOAD_MISMATCH");
    f.port.uploadTarget.mockResolvedValueOnce(null);
    expect(
      await status(
        f.service.completeUpload(f.request, fileId, "complete-key-05", { uploadToken: token }),
      ),
    ).toBe("404 NOT_FOUND");
  });

  it("signs reads only for available originals, for at most five minutes", async () => {
    const f = setup(["files.read"]);
    const session = await f.service.createDownloadSession(f.request, fileId, "download-key-01", {
      version: "original",
      purpose: "Revisión de evidencia",
    });
    expect(f.storage.createSignedRead).toHaveBeenCalledWith(
      "originals",
      objectKey,
      expect.any(Number),
      "a.png",
    );
    expect(Date.parse(session.expiresAt) - Date.now()).toBeLessThanOrEqual(300_000);
    expect(
      await status(
        f.service.createDownloadSession(f.request, fileId, "download-key-02", {
          version: "public",
          purpose: "Portal",
        }),
      ),
    ).toBe("409 FILE_NOT_AVAILABLE");
    expect(f.port.authorizeRead).toHaveBeenCalledTimes(1); // derivatives are refused before auditing
    f.port.authorizeRead.mockResolvedValueOnce(null);
    expect(
      await status(
        f.service.createDownloadSession(f.request, fileId, "download-key-03", {
          version: "original",
          purpose: "Revisión",
        }),
      ),
    ).toBe("409 FILE_NOT_AVAILABLE");
    const none = setup([]);
    expect(
      await status(
        none.service.createDownloadSession(none.request, fileId, "download-key-04", {
          version: "original",
          purpose: "Revisión",
        }),
      ),
    ).toBe("403 FORBIDDEN");
  });

  it("records successful issuance before returning a capability, without persisting its URL", async () => {
    const f = setup(["files.read"]);
    await f.service.createDownloadSession(f.request, fileId, "download-key-10", {
      version: "original",
      purpose: "Revisión",
    });
    expect(f.port.finishDownload).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: account }),
      fileId,
      "AUTHORIZED",
    );
    expect(f.storage.createSignedRead.mock.invocationCallOrder[0]).toBeLessThan(
      f.port.finishDownload.mock.invocationCallOrder[0]!,
    );
    const args = f.storage.createSignedRead.mock.calls[0]! as unknown as [
      string,
      string,
      number,
      string,
    ];
    expect(args[2]).toBeGreaterThan(280);
    expect(args[2]).toBeLessThanOrEqual(292);
  });

  it("records signing errors and does not misreport them as issued downloads", async () => {
    const f = setup(["files.read"]);
    f.storage.createSignedRead.mockRejectedValueOnce(new StorageUnavailableError());
    expect(
      await status(
        f.service.createDownloadSession(f.request, fileId, "download-key-11", {
          version: "original",
          purpose: "Revisión",
        }),
      ),
    ).toBe("503 DEPENDENCY_UNAVAILABLE");
    expect(f.port.finishDownload).toHaveBeenCalledWith(expect.anything(), fileId, "ERROR");
    expect(f.port.finishDownload).toHaveBeenCalledTimes(1);
  });

  it("withholds a signed URL when audit persistence fails or final authorization is denied", async () => {
    for (const result of ["DENIED", "EXPIRED", "ERROR"]) {
      const f = setup(["files.read"]);
      f.port.finishDownload.mockResolvedValueOnce(result);
      expect(
        await status(
          f.service.createDownloadSession(f.request, fileId, "download-key-12", {
            version: "original",
            purpose: "Revisión",
          }),
        ),
      ).toBe("409 FILE_NOT_AVAILABLE");
    }
    const f = setup(["files.read"]);
    f.port.finishDownload.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(
      f.service.createDownloadSession(f.request, fileId, "download-key-13", {
        version: "original",
        purpose: "Revisión",
      }),
    ).rejects.toThrow("Database unavailable");
  });

  it("caps the URL by file expiry and refuses an authorization too close to expiry", async () => {
    const f = setup(["files.read"]);
    f.port.authorizeRead.mockResolvedValueOnce({
      sessionId: fileId,
      expiresAt: new Date(Date.now() + 45_000).toISOString(),
      bucket: "originals",
      objectKey,
      fileName: "a.png",
    });
    await f.service.createDownloadSession(f.request, fileId, "download-key-14", {
      version: "original",
      purpose: "Revisión",
    });
    const args = f.storage.createSignedRead.mock.calls[0]! as unknown as [
      string,
      string,
      number,
      string,
    ];
    expect(args[2]).toBeLessThanOrEqual(37);
    f.port.authorizeRead.mockResolvedValueOnce({
      sessionId: fileId,
      expiresAt: new Date(Date.now() + 5_000).toISOString(),
      bucket: "originals",
      objectKey,
      fileName: "a.png",
    });
    expect(
      await status(
        f.service.createDownloadSession(f.request, fileId, "download-key-15", {
          version: "original",
          purpose: "Revisión",
        }),
      ),
    ).toBe("409 FILE_NOT_AVAILABLE");
    expect(f.storage.createSignedRead).toHaveBeenCalledTimes(1);
    expect(f.port.finishDownload).toHaveBeenLastCalledWith(expect.anything(), fileId, "EXPIRED");
  });

  it("reauthorizes and records every repeated request instead of replaying a cached URL", async () => {
    const f = setup(["files.read"]);
    for (let i = 0; i < 2; i++)
      await f.service.createDownloadSession(f.request, fileId, "download-key-16", {
        version: "original",
        purpose: "Revisión",
      });
    expect(f.port.authorizeRead).toHaveBeenCalledTimes(2);
    expect(f.port.finishDownload).toHaveBeenCalledTimes(2);
    expect(f.storage.createSignedRead).toHaveBeenCalledTimes(2);
  });

  it("translates database SQLSTATEs into domain errors", () => {
    for (const [code, name] of [
      ["IC404", "FileNotFoundError"],
      ["IC409", "FileStateError"],
      ["IC422", "FileMismatchError"],
      ["IC412", "FileIdempotencyError"],
      ["IC413", "FileTooLargeError"],
      ["IC415", "FileMediaTypeError"],
      ["22023", "FileValidationError"],
    ] as const) {
      let thrown: unknown;
      try {
        mapFileError({ code });
      } catch (error) {
        thrown = error;
      }
      expect((thrown as Error).constructor.name).toBe(name);
    }
    const other = new Error("connection lost");
    expect(() => mapFileError(other)).toThrow(other);
  });
});
