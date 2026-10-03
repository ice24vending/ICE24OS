import { describe, expect, it } from "vitest";
import {
  FILE_UPLOAD_PURPOSES,
  completeUploadRequestSchema,
  createUploadSessionRequestSchema,
  downloadSessionRequestSchema,
  fileNameSchema,
  fileScanMessageSchema,
  toPublicFileStatus,
  uploadSessionSchema,
} from "./files.js";

const id = "11111111-1111-4111-8111-111111111111";
const request = {
  fileName: "analisis_microbiologico_agosto_2026.pdf",
  mediaType: "application/pdf",
  sizeBytes: 1_839_204,
  purpose: "laboratory_analysis_original",
  relatedResource: { type: "machine", id },
};

describe("file upload contracts", () => {
  it("accepts the API.md upload session example", () => {
    expect(createUploadSessionRequestSchema.parse(request)).toEqual(request);
  });

  it("applies the purpose policy to type, size and related resource", () => {
    const issues = (input: object) =>
      createUploadSessionRequestSchema
        .safeParse({ ...request, ...input })
        .error?.issues.map((issue) => issue.message);
    expect(issues({ mediaType: "image/png" })).toEqual(["UNSUPPORTED_MEDIA_TYPE"]);
    expect(issues({ sizeBytes: 26_214_401 })).toEqual(["PAYLOAD_TOO_LARGE"]);
    expect(issues({ relatedResource: { type: "account", id } })).toEqual(["Invalid"]);
    expect(
      createUploadSessionRequestSchema.safeParse({ ...request, mediaType: "text/html" }).success,
    ).toBe(false);
    expect(createUploadSessionRequestSchema.safeParse({ ...request, extra: true }).success).toBe(
      false,
    );
  });

  it("rejects paths and control characters in file names", () => {
    for (const name of ["../secreto.pdf", "a\\b.pdf", "linea\nnueva.pdf", " "])
      expect(fileNameSchema.safeParse(name).success).toBe(false);
    expect(fileNameSchema.parse(" foto equipo 1.png ")).toBe("foto equipo 1.png");
  });

  it("requires a one-time token and a lowercase SHA-256 on confirmation", () => {
    const token = "A".repeat(43);
    expect(completeUploadRequestSchema.parse({ uploadToken: token })).toEqual({
      uploadToken: token,
    });
    expect(completeUploadRequestSchema.safeParse({ uploadToken: "short" }).success).toBe(false);
    expect(
      completeUploadRequestSchema.safeParse({ uploadToken: token, sha256: "F".repeat(64) }).success,
    ).toBe(false);
  });

  it("describes a single direct PUT with expiry", () => {
    const session = uploadSessionSchema.parse({
      fileId: id,
      uploadUrl: "https://project.supabase.co/storage/v1/object/upload/sign/quarantine/a?token=x",
      method: "PUT",
      requiredHeaders: { "Content-Type": "application/pdf" },
      uploadToken: "B".repeat(43),
      expiresAt: "2026-10-03T12:10:00.000Z",
      maximumSizeBytes: 26_214_400,
    });
    expect(session.method).toBe("PUT");
    expect(
      uploadSessionSchema.safeParse({ ...session, uploadUrl: "javascript:alert(1)" }).success,
    ).toBe(false);
  });

  it("maps internal states to the public FileObject states", () => {
    expect(toPublicFileStatus("PENDING_UPLOAD")).toBe("pending");
    expect(toPublicFileStatus("VERIFYING")).toBe("processing");
    expect(toPublicFileStatus("EXPIRED")).toBe("deleted_temporary");
    expect(
      downloadSessionRequestSchema.safeParse({ version: "original", purpose: "ok" }).success,
    ).toBe(false);
    expect(Object.keys(FILE_UPLOAD_PURPOSES).sort()).toEqual([
      "document_original",
      "equipment_evidence",
      "laboratory_analysis_original",
      "machine_photo",
    ]);
  });

  it("validates the file_scans message written by complete_upload", () => {
    const message = {
      messageVersion: 1,
      jobId: id,
      fileId: id,
      versionId: id,
      accountId: id,
      declaredSha256: "a".repeat(64),
      correlationId: null,
    };
    expect(fileScanMessageSchema.parse(message)).toEqual(message);
    expect(fileScanMessageSchema.safeParse({ ...message, declaredSha256: null }).success).toBe(
      true,
    );
    expect(
      fileScanMessageSchema.safeParse({ ...message, declaredSha256: "A".repeat(64) }).success,
    ).toBe(false);
    expect(fileScanMessageSchema.safeParse({ ...message, messageVersion: 2 }).success).toBe(false);
    expect(fileScanMessageSchema.safeParse({ ...message, bucket: "originals" }).success).toBe(
      false,
    );
  });
});
