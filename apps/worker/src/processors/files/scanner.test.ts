import { createServer, type AddressInfo, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  ClamAvScanner,
  EICAR_TEST_SIGNATURE,
  ScannerUnavailableError,
  SimulatedScanner,
  sanitizeSignature,
  scannerFromEnvironment,
} from "./scanner.js";

/** Minimal clamd double: parses INSTREAM chunks and answers with `reply(bytes)`. */
const clamd = async (reply: (bytes: Buffer) => string | null) => {
  const received: Buffer[] = [];
  // Half-open like clamd: our end-of-stream must not close the reply direction.
  const server: Server = createServer({ allowHalfOpen: true }, (socket: Socket) => {
    sockets.add(socket);
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!buffer.subarray(0, 10).equals(Buffer.from("zINSTREAM\0"))) return;
      let offset = 10;
      const parts: Buffer[] = [];
      while (buffer.length >= offset + 4) {
        const size = buffer.readUInt32BE(offset);
        if (size === 0) {
          const bytes = Buffer.concat(parts);
          received.push(bytes);
          const answer = reply(bytes);
          if (answer !== null) socket.end(`${answer}\0`);
          return;
        }
        if (buffer.length < offset + 4 + size) return;
        parts.push(buffer.subarray(offset + 4, offset + 4 + size));
        offset += 4 + size;
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return { port: (server.address() as AddressInfo).port, received };
};
const servers: Server[] = [];
const sockets = new Set<Socket>();
afterEach(async () => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((resolve) => s.close(() => resolve()))),
  );
});

describe("antimalware adapters", () => {
  it("simulated scanner flags only the EICAR test file", async () => {
    const scanner = new SimulatedScanner();
    await expect(scanner.scan(Buffer.from("%PDF-1.7 clean"))).resolves.toEqual({
      verdict: "CLEAN",
      signature: null,
    });
    await expect(scanner.scan(Buffer.from(`%PDF-1.7 ${EICAR_TEST_SIGNATURE}`))).resolves.toEqual({
      verdict: "INFECTED",
      signature: "Eicar-Test-Signature",
    });
  });

  it("streams the bytes to clamd in chunks and maps OK and FOUND", async () => {
    const payload = Buffer.alloc(150_000, 7);
    const clean = await clamd(() => "stream: OK");
    await expect(new ClamAvScanner("127.0.0.1", clean.port).scan(payload)).resolves.toEqual({
      verdict: "CLEAN",
      signature: null,
    });
    expect(clean.received[0]!.equals(payload)).toBe(true);
    const infected = await clamd(() => "stream: Win.Test.EICAR_HDB-1 FOUND");
    await expect(new ClamAvScanner("127.0.0.1", infected.port).scan(payload)).resolves.toEqual({
      verdict: "INFECTED",
      signature: "Win.Test.EICAR_HDB-1",
    });
  });

  it("fails closed on engine errors, refused connections and timeouts", async () => {
    const error = await clamd(() => "INSTREAM size limit exceeded. ERROR");
    await expect(
      new ClamAvScanner("127.0.0.1", error.port).scan(Buffer.from("x")),
    ).rejects.toMatchObject({ code: "SCANNER_UNAVAILABLE" });
    const silent = await clamd(() => null);
    await expect(
      new ClamAvScanner("127.0.0.1", silent.port, 200).scan(Buffer.from("x")),
    ).rejects.toMatchObject({ code: "SCANNER_TIMEOUT" });
    const closed = await clamd(() => null);
    await new Promise<void>((resolve) => servers.pop()!.close(() => resolve()));
    await expect(
      new ClamAvScanner("127.0.0.1", closed.port).scan(Buffer.from("x")),
    ).rejects.toBeInstanceOf(ScannerUnavailableError);
  });

  it("sanitizes engine signatures before they reach audit and logs", () => {
    expect(sanitizeSignature("Eicar<script>\n")).toBe("Eicar_script__");
    expect(sanitizeSignature("x".repeat(300))).toHaveLength(200);
  });

  it("selects the scanner from the environment and refuses the simulation outside dev/test", () => {
    expect(
      scannerFromEnvironment({ FILE_SCANNER: "simulated", NODE_ENV: "test" }).scanner,
    ).toBeInstanceOf(SimulatedScanner);
    expect(scannerFromEnvironment({ FILE_SCANNER: "simulated", NODE_ENV: "production" })).toEqual({
      scanner: null,
      reason: "SIMULATED_SCANNER_FORBIDDEN",
    });
    expect(
      scannerFromEnvironment({
        FILE_SCANNER: "clamav",
        CLAMAV_HOST: "clamd",
        NODE_ENV: "production",
      }).scanner,
    ).toBeInstanceOf(ClamAvScanner);
    expect(scannerFromEnvironment({ FILE_SCANNER: "clamav" })).toEqual({
      scanner: null,
      reason: "SCANNER_MISCONFIGURED",
    });
    expect(scannerFromEnvironment({ CLAMAV_HOST: "clamd" }).scanner).toBeInstanceOf(ClamAvScanner);
    expect(scannerFromEnvironment({ FILE_SCANNER: "virustotal" })).toEqual({
      scanner: null,
      reason: "SCANNER_MISCONFIGURED",
    });
    expect(scannerFromEnvironment({})).toEqual({ scanner: null, reason: "SCANNER_NOT_CONFIGURED" });
  });
});
