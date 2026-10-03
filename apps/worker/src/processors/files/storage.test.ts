import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { StorageFailure, SupabaseScanStorage } from "./storage.js";

const KEY = `${"a".repeat(8)}-aaaa-4aaa-8aaa-${"a".repeat(12)}`;
const OBJECT = `${KEY}/${KEY}/v1/${KEY}`;
const SERVICE_KEY = "service-key";

describe("Supabase scan storage", () => {
  const objects = new Map<string, Buffer>();
  const requests: { method: string; path: string; auth: string | undefined; upsert: unknown }[] =
    [];
  let failing = false;
  let server: Server;
  let storage: SupabaseScanStorage;
  const read = (request: IncomingMessage) =>
    new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => resolve(Buffer.concat(chunks)));
    });

  beforeAll(async () => {
    server = createServer((request, response) => {
      void (async () => {
        const path = decodeURIComponent(
          (request.url ?? "").replace(/^\/storage\/v1\/object\//u, ""),
        );
        requests.push({
          method: request.method ?? "",
          path,
          auth: request.headers.authorization,
          upsert: request.headers["x-upsert"],
        });
        if (failing) return response.writeHead(503).end();
        if (request.method === "GET") {
          const bytes = objects.get(path);
          if (!bytes) return response.writeHead(400).end('{"error":"Object not found"}');
          return response.writeHead(200, { "content-length": bytes.length }).end(bytes);
        }
        if (request.method === "POST") {
          objects.set(path, await read(request));
          return response.writeHead(200).end("{}");
        }
        if (request.method === "DELETE") {
          if (!objects.delete(path)) return response.writeHead(400).end('{"error":"not_found"}');
          return response.writeHead(200).end("{}");
        }
        return response.writeHead(405).end();
      })();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    storage = new SupabaseScanStorage(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      SERVICE_KEY,
    );
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("downloads, promotes with upsert and removes with the service key", async () => {
    objects.set(`quarantine/${OBJECT}`, Buffer.from("bytes"));
    const bytes = await storage.download("quarantine", OBJECT, 100);
    expect(Buffer.from(bytes!).toString()).toBe("bytes");
    await storage.upload("originals", OBJECT, bytes!, "image/png");
    expect(objects.get(`originals/${OBJECT}`)?.toString()).toBe("bytes");
    await storage.remove("quarantine", OBJECT);
    expect(objects.has(`quarantine/${OBJECT}`)).toBe(false);
    expect(requests.every((r) => r.auth === `Bearer ${SERVICE_KEY}`)).toBe(true);
    expect(requests.find((r) => r.method === "POST")?.upsert).toBe("true");
  });

  it("treats missing objects as absent and removal as idempotent", async () => {
    await expect(storage.download("quarantine", OBJECT, 100)).resolves.toBeNull();
    await expect(storage.remove("quarantine", OBJECT)).resolves.toBeUndefined();
  });

  it("refuses oversized objects, invalid locations and unavailable storage", async () => {
    objects.set(`quarantine/${OBJECT}`, Buffer.alloc(10));
    await expect(storage.download("quarantine", OBJECT, 5)).rejects.toMatchObject({
      code: "OBJECT_TOO_LARGE",
    });
    await expect(storage.download("quarantine", "../etc/passwd", 5)).rejects.toBeInstanceOf(
      StorageFailure,
    );
    failing = true;
    await expect(storage.remove("quarantine", OBJECT)).rejects.toMatchObject({
      code: "STORAGE_UNAVAILABLE",
    });
    await expect(storage.download("quarantine", OBJECT, 100)).rejects.toMatchObject({
      code: "STORAGE_UNAVAILABLE",
    });
    failing = false;
  });
});
