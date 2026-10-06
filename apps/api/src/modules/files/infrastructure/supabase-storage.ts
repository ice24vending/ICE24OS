import { Inject, Injectable, Optional } from "@nestjs/common";
import { correlationHeaders, type IntegrationTracer } from "@ice24/observability";
import {
  INTEGRATION_TRACER,
  metricsOnlyTracer,
} from "../../../common/integrations/integration-tracer.js";
import {
  ObjectStoragePort,
  StorageUnavailableError,
  type ObservedObject,
} from "../application/files.port.js";

const BUCKET = /^[a-z][a-z0-9-]{2,62}$/u;
const OBJECT_KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/v[0-9]+\/[0-9a-f-]{36}$/u;

/** Storage answered with an HTTP status that is not usable; the status is kept for diagnosis. */
class StorageResponseError extends StorageUnavailableError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Supabase Storage adapter. Uses the service-role key server-side only; the browser receives
 * a URL whose token is valid for exactly one object path, never the key itself.
 */
@Injectable()
export class SupabaseObjectStorage extends ObjectStoragePort {
  constructor(
    @Optional()
    @Inject(INTEGRATION_TRACER)
    private readonly tracer: IntegrationTracer = metricsOnlyTracer(),
  ) {
    super();
  }

  /**
   * F5-14: one `object_storage` log per operation with bucket and HTTP status. The object key
   * is the effect key; URLs, signed paths and tokens are never recorded (TRD 54).
   */
  private traced<T>(
    operation: string,
    bucket: string,
    objectKey: string,
    work: () => Promise<{ value: T; status: number }>,
  ): Promise<T> {
    return this.tracer
      .trace(
        {
          integration: "object_storage",
          operation,
          provider: "supabase-storage",
          effectKey: `${bucket}/${objectKey}`,
          // files.guard_object_key makes the first segment the owning account.
          context: { accountId: objectKey.split("/")[0] ?? null },
          details: { bucket },
          onSuccess: (result) => ({ responseCode: result.status }),
          onError: (error) => ({
            errorCode: "STORAGE_UNAVAILABLE",
            retryable: true,
            responseCode: error instanceof StorageResponseError ? error.status : null,
          }),
        },
        work,
      )
      .then((result) => result.value);
  }

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
        headers: {
          ...init.headers,
          ...correlationHeaders(),
          apikey: key,
          authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
    } catch {
      throw new StorageUnavailableError("Private storage unavailable");
    }
  }

  /** POST /object/upload/sign/{bucket}/{key}: one-object upload token (no upsert). */
  override createSignedUpload(bucket: string, objectKey: string): Promise<string> {
    return this.traced("upload.sign", bucket, objectKey, async () => {
      const response = await this.call(`object/upload/sign/${this.path(bucket, objectKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new StorageResponseError("Signed upload refused", response.status);
      const body = (await response.json().catch(() => ({}))) as { url?: unknown };
      if (typeof body.url !== "string" || !body.url.startsWith("/object/upload/sign/"))
        throw new StorageResponseError("Invalid storage response", response.status);
      return { value: `${this.config().url}/storage/v1${body.url}`, status: response.status };
    });
  }

  /** HEAD /object/{bucket}/{key}: size and type as stored; null when the object is absent. */
  override stat(bucket: string, objectKey: string): Promise<ObservedObject | null> {
    return this.traced("object.stat", bucket, objectKey, async () => {
      const response = await this.call(`object/${this.path(bucket, objectKey)}`, {
        method: "HEAD",
      });
      // Supabase answers 400 "Object not found" for missing objects on some versions.
      if (response.status === 404 || response.status === 400)
        return { value: null, status: response.status };
      if (!response.ok)
        throw new StorageResponseError("Storage metadata unavailable", response.status);
      const size = Number(response.headers.get("content-length"));
      if (!Number.isSafeInteger(size) || size < 0)
        throw new StorageResponseError("Storage metadata unavailable", response.status);
      return {
        value: { sizeBytes: size, mediaType: response.headers.get("content-type") ?? "" },
        status: response.status,
      };
    });
  }

  /** POST /object/sign/{bucket}/{key}: temporary read URL, forced download. */
  override createSignedRead(
    bucket: string,
    objectKey: string,
    ttlSeconds: number,
    downloadName: string | null,
  ): Promise<string> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 300)
      return Promise.reject(new StorageUnavailableError("Invalid URL lifetime"));
    return this.traced("read.sign", bucket, objectKey, async () => {
      const response = await this.call(`object/sign/${this.path(bucket, objectKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: ttlSeconds }),
      });
      if (!response.ok) throw new StorageResponseError("Signed read refused", response.status);
      const body = (await response.json().catch(() => ({}))) as { signedURL?: unknown };
      if (
        typeof body.signedURL !== "string" ||
        !body.signedURL.startsWith(`/object/sign/${this.path(bucket, objectKey)}?`)
      )
        throw new StorageResponseError("Invalid storage response", response.status);
      const download = `download=${encodeURIComponent(downloadName ?? "archivo")}`;
      return {
        value: `${this.config().url}/storage/v1${body.signedURL}${body.signedURL.includes("?") ? "&" : "?"}${download}`,
        status: response.status,
      };
    });
  }
}
