/**
 * Private storage operations the scan worker needs. Implementations never make objects
 * public and fail with `StorageFailure` so the job is retried instead of guessing.
 */
export interface ScanStorage {
  /** Bytes of the object; null when it does not exist. */
  download(bucket: string, objectKey: string, maxBytes: number): Promise<Uint8Array | null>;
  /** Writes exactly the scanned bytes; repeating it for the same key is harmless. */
  upload(bucket: string, objectKey: string, bytes: Uint8Array, mediaType: string): Promise<void>;
  /** Removes the object; an object that is already gone counts as removed. */
  remove(bucket: string, objectKey: string): Promise<void>;
}

export class StorageFailure extends Error {
  public constructor(public readonly code: "STORAGE_UNAVAILABLE" | "OBJECT_TOO_LARGE") {
    super(code);
    this.name = "StorageFailure";
  }
}

/** 404, or the 400 "Object not found" some Supabase Storage versions answer instead. */
const notFound = async (response: Response): Promise<boolean> => {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  const text = await response.text().catch(() => "");
  return /not[ _-]?found/iu.test(text);
};

const BUCKET = /^[a-z][a-z0-9-]{2,62}$/u;
const OBJECT_KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/v[0-9]+\/[0-9a-f-]{36}$/u;

/** Supabase Storage REST API with the service-role key (worker only, never the browser). */
export class SupabaseScanStorage implements ScanStorage {
  public constructor(
    private readonly baseUrl: string,
    private readonly serviceKey: string,
    private readonly timeoutMs = 20_000,
  ) {}

  public static fromEnvironment(env: NodeJS.ProcessEnv): SupabaseScanStorage | null {
    const url = env.SUPABASE_URL?.replace(/\/$/u, "");
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    return url && key ? new SupabaseScanStorage(url, key) : null;
  }

  private path(bucket: string, objectKey: string): string {
    if (!BUCKET.test(bucket) || !OBJECT_KEY.test(objectKey))
      throw new StorageFailure("STORAGE_UNAVAILABLE");
    return `${bucket}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  }

  private async call(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}/storage/v1/object/${path}`, {
        ...init,
        headers: {
          ...init.headers,
          apikey: this.serviceKey,
          authorization: `Bearer ${this.serviceKey}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs),
        redirect: "error",
      });
    } catch {
      throw new StorageFailure("STORAGE_UNAVAILABLE");
    }
  }

  public async download(
    bucket: string,
    objectKey: string,
    maxBytes: number,
  ): Promise<Uint8Array | null> {
    const response = await this.call(this.path(bucket, objectKey), { method: "GET" });
    if (await notFound(response)) return null;
    if (!response.ok) throw new StorageFailure("STORAGE_UNAVAILABLE");
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new StorageFailure("OBJECT_TOO_LARGE");
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch {
      throw new StorageFailure("STORAGE_UNAVAILABLE");
    }
    if (bytes.length > maxBytes) throw new StorageFailure("OBJECT_TOO_LARGE");
    return bytes;
  }

  public async upload(
    bucket: string,
    objectKey: string,
    bytes: Uint8Array,
    mediaType: string,
  ): Promise<void> {
    const response = await this.call(this.path(bucket, objectKey), {
      method: "POST",
      headers: { "content-type": mediaType, "x-upsert": "true", "cache-control": "no-store" },
      body: Buffer.from(bytes),
    });
    if (!response.ok) throw new StorageFailure("STORAGE_UNAVAILABLE");
  }

  public async remove(bucket: string, objectKey: string): Promise<void> {
    const response = await this.call(this.path(bucket, objectKey), { method: "DELETE" });
    if (response.ok || (await notFound(response))) return;
    throw new StorageFailure("STORAGE_UNAVAILABLE");
  }
}
