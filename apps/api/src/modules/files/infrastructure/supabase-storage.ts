import { Injectable } from "@nestjs/common";
import {
  ObjectStoragePort,
  StorageUnavailableError,
  type ObservedObject,
} from "../application/files.port.js";

const BUCKET = /^[a-z][a-z0-9-]{2,62}$/u;
const OBJECT_KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/v[0-9]+\/[0-9a-f-]{36}$/u;

/**
 * Supabase Storage adapter. Uses the service-role key server-side only; the browser receives
 * a URL whose token is valid for exactly one object path, never the key itself.
 */
@Injectable()
export class SupabaseObjectStorage extends ObjectStoragePort {
  private config() {
    const url = process.env.SUPABASE_URL?.replace(/\/$/u, "");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new StorageUnavailableError("Private storage not configured");
    return { url, key };
  }

  private path(bucket: string, objectKey: string): string {
    if (!BUCKET.test(bucket) || !OBJECT_KEY.test(objectKey))
      throw new StorageUnavailableError("Invalid object location");
    return `${bucket}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  }

  private async call(path: string, init: RequestInit): Promise<Response> {
    const { url, key } = this.config();
    try {
      return await fetch(`${url}/storage/v1/${path}`, {
        ...init,
        headers: { ...init.headers, apikey: key, authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
    } catch {
      throw new StorageUnavailableError("Private storage unavailable");
    }
  }

  /** POST /object/upload/sign/{bucket}/{key}: one-object upload token (no upsert). */
  override async createSignedUpload(bucket: string, objectKey: string): Promise<string> {
    const response = await this.call(`object/upload/sign/${this.path(bucket, objectKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new StorageUnavailableError("Signed upload refused");
    const body = (await response.json().catch(() => ({}))) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.startsWith("/object/upload/sign/"))
      throw new StorageUnavailableError("Invalid storage response");
    return `${this.config().url}/storage/v1${body.url}`;
  }

  /** HEAD /object/{bucket}/{key}: size and type as stored; null when the object is absent. */
  override async stat(bucket: string, objectKey: string): Promise<ObservedObject | null> {
    const response = await this.call(`object/${this.path(bucket, objectKey)}`, { method: "HEAD" });
    // Supabase answers 400 "Object not found" for missing objects on some versions.
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) throw new StorageUnavailableError("Storage metadata unavailable");
    const size = Number(response.headers.get("content-length"));
    if (!Number.isSafeInteger(size) || size < 0)
      throw new StorageUnavailableError("Storage metadata unavailable");
    return { sizeBytes: size, mediaType: response.headers.get("content-type") ?? "" };
  }

  /** POST /object/sign/{bucket}/{key}: temporary read URL, forced download. */
  override async createSignedRead(
    bucket: string,
    objectKey: string,
    ttlSeconds: number,
    downloadName: string | null,
  ): Promise<string> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300)
      throw new StorageUnavailableError("Invalid URL lifetime");
    const response = await this.call(`object/sign/${this.path(bucket, objectKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expiresIn: ttlSeconds }),
    });
    if (!response.ok) throw new StorageUnavailableError("Signed read refused");
    const body = (await response.json().catch(() => ({}))) as { signedURL?: unknown };
    if (
      typeof body.signedURL !== "string" ||
      !body.signedURL.startsWith(`/object/sign/${this.path(bucket, objectKey)}?`)
    )
      throw new StorageUnavailableError("Invalid storage response");
    const download = `download=${encodeURIComponent(downloadName ?? "archivo")}`;
    return `${this.config().url}/storage/v1${body.signedURL}${body.signedURL.includes("?") ? "&" : "?"}${download}`;
  }
}
