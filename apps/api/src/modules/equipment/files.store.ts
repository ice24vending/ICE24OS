import { createHash } from "node:crypto";
import { createConnection } from "node:net";
import { uploadInputSchema } from "@ice24/contracts";
import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { EquipmentDatabase, audit, one, scope } from "./equipment.database.js";

export function validFileSignature(bytes: Buffer, type: string): boolean {
  if (bytes.length < 8 || bytes.length > 5_242_880) return false;
  if (type === "application/pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (type === "image/png")
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
}
/** ClamAV INSTREAM adapter, isolated from the domain. Missing/unavailable scan always fails closed. */
export async function scanFile(bytes: Buffer): Promise<"clean" | "rejected" | "quarantine"> {
  const host = process.env.CLAMAV_HOST;
  if (!host) return "quarantine";
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: Number(process.env.CLAMAV_PORT ?? 3310) });
    let result = "";
    const finish = (status: "clean" | "rejected" | "quarantine") => {
      socket.destroy();
      resolve(status);
    };
    socket.setTimeout(8000, () => finish("quarantine"));
    socket.on("error", () => finish("quarantine"));
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < bytes.length; offset += 65536) {
        const chunk = bytes.subarray(offset, offset + 65536);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk: Buffer) => {
      result += chunk.toString();
      if (result.length > 1024) finish("quarantine");
      else if (result.includes("\0"))
        finish(
          result.trim().replaceAll("\0", "") === "stream: OK"
            ? "clean"
            : result.includes(" FOUND")
              ? "rejected"
              : "quarantine",
        );
    });
    socket.on("end", () => finish("quarantine"));
  });
}
@Injectable()
export class FilesStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  private async storage(path: string, init: RequestInit): Promise<Response> {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new ServiceUnavailableException("Private storage not configured");
    const response = await fetch(`${url.replace(/\/$/, "")}/storage/v1/${path}`, {
      ...init,
      headers: { ...init.headers, apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new ServiceUnavailableException("Private storage unavailable");
    return response;
  }
  upload(request: SecurityRequest, body: unknown) {
    const input = uploadInputSchema.parse(body);
    const bytes = Buffer.from(input.contentBase64, "base64");
    if (
      bytes.toString("base64") !== input.contentBase64 ||
      !validFileSignature(bytes, input.contentType)
    )
      throw new BadRequestException("Invalid file signature, encoding or size");
    return this.db.run(request, "files:upload", input, true, async (client, op) => {
      if (!op.subject.accountWide)
        throw new BadRequestException("Evidence upload requires account scope");
      const objectKey = `${op.accountId}/${crypto.randomUUID()}`;
      await this.storage(`object/quarantine/${objectKey}`, {
        method: "POST",
        headers: { "content-type": input.contentType },
        body: new Uint8Array(bytes),
      });
      const row = await one(
        client,
        `insert into equipment.files(account_id,uploaded_by,filename,content_type,byte_size,sha256,object_key)
        values($1,$2,$3,$4,$5,$6,$7) returning *`,
        [
          op.accountId,
          op.userId,
          input.filename,
          input.contentType,
          bytes.length,
          createHash("sha256").update(bytes).digest("hex"),
          objectKey,
        ],
      );
      const status = await scanFile(bytes);
      const updated = await one(
        client,
        "update equipment.files set status=$2,scan_reference=$3 where id=$1 returning *",
        [row.id, status, status === "quarantine" ? null : "clamav-instream"],
      );
      await audit(client, op, updated, "EVIDENCE_UPLOADED", `Private evidence scan: ${status}`);
      return { id: updated.id, status, filename: input.filename };
    });
  }
  rescan(request: SecurityRequest, id: string) {
    return this.db.run(request, `files:${id}:scan`, {}, true, async (client, op) => {
      const row = await one(client, "select * from equipment.files where id=$1 for update", [id]);
      scope(op, row, "account");
      const response = await this.storage(`object/quarantine/${String(row.object_key)}`, {
        method: "GET",
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (createHash("sha256").update(bytes).digest("hex") !== row.sha256)
        throw new BadRequestException("File integrity mismatch");
      const status = await scanFile(bytes);
      const updated = await one(
        client,
        "update equipment.files set status=$2,scan_reference=$3 where id=$1 returning *",
        [id, status, status === "quarantine" ? null : "clamav-instream"],
      );
      await audit(client, op, updated, "EVIDENCE_SCANNED", `Scan result: ${status}`);
      return { id, status };
    });
  }
  download(request: SecurityRequest, id: string) {
    return this.db.run(request, `files:${id}`, null, false, async (client, op) => {
      const row = await one(
        client,
        "select * from equipment.files where id=$1 and status='clean'",
        [id],
      );
      scope(op, row, "account", true);
      const response = await this.storage(`object/sign/quarantine/${String(row.object_key)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: 60 }),
      });
      const result = (await response.json()) as { signedURL?: string };
      if (!result.signedURL?.startsWith("/object/sign/"))
        throw new ServiceUnavailableException("Invalid storage response");
      return { url: `${process.env.SUPABASE_URL}/storage/v1${result.signedURL}`, expiresIn: 60 };
    });
  }
}
