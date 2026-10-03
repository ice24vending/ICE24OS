import { describe, expect, it } from "vitest";
import { checkIntegrity, detectMediaType, sha256Hex } from "./integrity.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PDF = Buffer.from("%PDF-1.7\n%âãÏÓ\n", "latin1");

describe("file integrity", () => {
  it("identifies the allowed media types by their signature only", () => {
    expect(detectMediaType(PNG)).toBe("image/png");
    expect(detectMediaType(JPEG)).toBe("image/jpeg");
    expect(detectMediaType(PDF)).toBe("application/pdf");
    expect(detectMediaType(Buffer.from("MZ\x90\x00", "latin1"))).toBeNull();
    expect(detectMediaType(Buffer.from("<html>"))).toBeNull();
    expect(detectMediaType(new Uint8Array())).toBeNull();
  });

  it("accepts bytes matching the authorized size, hash and type", () => {
    expect(
      checkIntegrity(PNG, { sizeBytes: PNG.length, mediaType: "image/png", declaredSha256: null }),
    ).toEqual({ ok: true, sha256: sha256Hex(PNG), detectedMediaType: "image/png" });
    expect(
      checkIntegrity(PDF, {
        sizeBytes: PDF.length,
        mediaType: "application/pdf",
        declaredSha256: sha256Hex(PDF),
      }).ok,
    ).toBe(true);
  });

  it("rejects a declared hash or size that differs from the stored bytes", () => {
    const result = checkIntegrity(PNG, {
      sizeBytes: PNG.length,
      mediaType: "image/png",
      declaredSha256: "0".repeat(64),
    });
    expect(result).toMatchObject({ ok: false, verdict: "INTEGRITY_MISMATCH" });
    expect(result.sha256).toBe(sha256Hex(PNG));
    expect(
      checkIntegrity(PNG, { sizeBytes: 1, mediaType: "image/png", declaredSha256: null }),
    ).toMatchObject({ ok: false, verdict: "INTEGRITY_MISMATCH" });
  });

  it("rejects content disguised as another media type", () => {
    expect(
      checkIntegrity(PDF, { sizeBytes: PDF.length, mediaType: "image/png", declaredSha256: null }),
    ).toMatchObject({
      ok: false,
      verdict: "SIGNATURE_MISMATCH",
      detectedMediaType: "application/pdf",
    });
    const exe = Buffer.from("MZ\x90\x00\x03", "latin1");
    expect(
      checkIntegrity(exe, { sizeBytes: exe.length, mediaType: "image/jpeg", declaredSha256: null }),
    ).toMatchObject({ ok: false, verdict: "SIGNATURE_MISMATCH", detectedMediaType: null });
  });
});
