import { createHash } from "node:crypto";
import type { FileMediaType } from "@ice24/contracts";

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Media type identified by the file signature (magic bytes), independent of the name or the
 * type the browser declared. Returns null for anything outside the private-bucket allow-list.
 */
export function detectMediaType(bytes: Uint8Array): FileMediaType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
}

export type IntegrityResult =
  | { readonly ok: true; readonly sha256: string; readonly detectedMediaType: FileMediaType }
  | {
      readonly ok: false;
      readonly sha256: string;
      readonly verdict: "INTEGRITY_MISMATCH" | "SIGNATURE_MISMATCH";
      readonly detectedMediaType: FileMediaType | null;
    };

/**
 * Integrity of the quarantined bytes against what the upload authorized: exact size, the
 * SHA-256 the client declared (when it declared one) and a signature matching the media type.
 */
export function checkIntegrity(
  bytes: Uint8Array,
  expected: { sizeBytes: number; mediaType: string; declaredSha256: string | null },
): IntegrityResult {
  const sha256 = sha256Hex(bytes);
  const detectedMediaType = detectMediaType(bytes);
  if (
    bytes.length !== expected.sizeBytes ||
    (expected.declaredSha256 !== null && expected.declaredSha256 !== sha256)
  )
    return { ok: false, sha256, verdict: "INTEGRITY_MISMATCH", detectedMediaType };
  if (detectedMediaType === null || detectedMediaType !== expected.mediaType)
    return { ok: false, sha256, verdict: "SIGNATURE_MISMATCH", detectedMediaType };
  return { ok: true, sha256, detectedMediaType };
}
