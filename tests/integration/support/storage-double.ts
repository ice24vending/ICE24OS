import { randomBytes } from "node:crypto";
import { createServer as createHttpServer, type IncomingMessage, type Server } from "node:http";

/**
 * Minimal Supabase Storage double: signed upload, HEAD, signed read and the service-key
 * object API used by the scan worker (GET, POST with upsert, DELETE); never public URLs.
 */
export function storageDouble(serviceKey: string) {
  const objects = new Map<string, { bytes: Buffer; type: string }>();
  const uploadTokens = new Map<string, string>();
  const readTokens = new Map<string, { path: string; expires: number }>();
  const log: {
    method: string;
    path: string;
    origin: string | undefined;
    correlationId: string | undefined;
  }[] = [];
  /** HTTP methods answered with 503 to simulate an unavailable storage service. */
  const failing = new Set<string>();
  const body = (request: IncomingMessage) =>
    new Promise<Buffer>((resolve) => {
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => resolve(Buffer.concat(chunks)));
    });
  const server: Server = createHttpServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://storage.test");
      const path = decodeURIComponent(url.pathname.replace(/^\/storage\/v1\//u, ""));
      log.push({
        method: request.method ?? "",
        path,
        origin: request.headers.origin,
        correlationId: request.headers["x-correlation-id"] as string | undefined,
      });
      response.setHeader("access-control-allow-origin", request.headers.origin ?? "*");
      response.setHeader("access-control-allow-methods", "GET, HEAD, POST, PUT, OPTIONS");
      response.setHeader("access-control-allow-headers", "content-type, x-upsert");
      if (failing.has(request.method ?? "")) return response.writeHead(503).end();
      if (request.method === "OPTIONS") return response.writeHead(204).end();
      const service = request.headers.authorization === `Bearer ${serviceKey}`;
      const json = (status: number, value: unknown) =>
        response
          .writeHead(status, { "content-type": "application/json" })
          .end(JSON.stringify(value));
      let match = /^object\/upload\/sign\/(.+)$/u.exec(path);
      if (match && request.method === "POST") {
        if (!service) return json(403, { error: "Unauthorized" });
        const token = randomBytes(16).toString("hex");
        uploadTokens.set(token, match[1]!);
        return json(200, { url: `/object/upload/sign/${match[1]}?token=${token}` });
      }
      if (match && request.method === "PUT") {
        const token = url.searchParams.get("token") ?? "";
        if (uploadTokens.get(token) !== match[1]) return json(400, { error: "Invalid signature" });
        if (objects.has(match[1]!)) return json(409, { error: "Duplicate" });
        objects.set(match[1]!, {
          bytes: await body(request),
          type: String(request.headers["content-type"] ?? "application/octet-stream"),
        });
        return json(200, { Key: match[1] });
      }
      match = /^object\/sign\/(.+)$/u.exec(path);
      if (match && request.method === "POST") {
        if (!service) return json(403, { error: "Unauthorized" });
        if (!objects.has(match[1]!)) return json(400, { error: "Object not found" });
        const { expiresIn } = JSON.parse((await body(request)).toString()) as { expiresIn: number };
        const token = randomBytes(16).toString("hex");
        readTokens.set(token, { path: match[1]!, expires: Date.now() + expiresIn * 1000 });
        return json(200, { signedURL: `/object/sign/${match[1]}?token=${token}` });
      }
      if (match && request.method === "GET") {
        const grant = readTokens.get(url.searchParams.get("token") ?? "");
        const object = objects.get(match[1]!);
        if (!grant || grant.path !== match[1] || grant.expires < Date.now() || !object)
          return json(400, { error: "Invalid signature" });
        const download = url.searchParams.get("download");
        return response
          .writeHead(200, {
            "content-type": object.type,
            "content-length": object.bytes.length,
            ...(download ? { "content-disposition": `attachment; filename="${download}"` } : {}),
          })
          .end(object.bytes);
      }
      match = /^object\/(.+)$/u.exec(path);
      if (match && request.method === "GET") {
        const object = service ? objects.get(match[1]!) : undefined;
        if (!object) return json(400, { error: "Object not found" });
        return response
          .writeHead(200, { "content-type": object.type, "content-length": object.bytes.length })
          .end(object.bytes);
      }
      if (match && request.method === "POST") {
        if (!service) return json(403, { error: "Unauthorized" });
        if (objects.has(match[1]!) && request.headers["x-upsert"] !== "true")
          return json(409, { error: "Duplicate" });
        objects.set(match[1]!, {
          bytes: await body(request),
          type: String(request.headers["content-type"] ?? "application/octet-stream"),
        });
        return json(200, { Key: match[1] });
      }
      if (match && request.method === "DELETE") {
        if (!service) return json(403, { error: "Unauthorized" });
        if (!objects.delete(match[1]!)) return json(400, { error: "Object not found" });
        return json(200, { message: "Successfully deleted" });
      }
      if (match && request.method === "HEAD") {
        const object = service ? objects.get(match[1]!) : undefined;
        if (!object) return response.writeHead(400).end();
        return response
          .writeHead(200, { "content-type": object.type, "content-length": object.bytes.length })
          .end();
      }
      return json(404, { error: "not_found" });
    })();
  });
  return { server, objects, log, failing };
}
