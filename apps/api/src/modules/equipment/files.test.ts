import { afterEach, describe, expect, it } from "vitest";
import { scanFile, validFileSignature } from "./files.store.js";
import { createServer } from "node:net";
const previous = process.env.CLAMAV_HOST;
const previousPort = process.env.CLAMAV_PORT;
afterEach(() => {
  if (previous === undefined) delete process.env.CLAMAV_HOST;
  else process.env.CLAMAV_HOST = previous;
  if (previousPort === undefined) delete process.env.CLAMAV_PORT;
  else process.env.CLAMAV_PORT = previousPort;
});
describe("private evidence boundary", () => {
  it("rejects spoofed MIME, empty content and oversized content", () => {
    expect(validFileSignature(Buffer.from("<script>alert(1)</script>"), "image/png")).toBe(false);
    expect(validFileSignature(Buffer.alloc(0), "image/jpeg")).toBe(false);
    expect(validFileSignature(Buffer.alloc(5_242_881), "application/pdf")).toBe(false);
    expect(validFileSignature(Buffer.from("%PDF-1.7\n"), "application/pdf")).toBe(true);
  });
  it("keeps content quarantined when no scanner is configured", async () => {
    delete process.env.CLAMAV_HOST;
    expect(await scanFile(Buffer.from("%PDF-1.7\n"))).toBe("quarantine");
  });
  it.each([
    ["stream: OK\0", "clean"],
    ["stream: Test.Signature FOUND\0", "rejected"],
    ["stream: size limit exceeded ERROR\0", "quarantine"],
  ] as const)(
    "interprets scanner response %s without bypassing failures",
    async (response, expected) => {
      const server = createServer((socket) => {
        socket.once("data", () => socket.end(response));
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      process.env.CLAMAV_HOST = "127.0.0.1";
      process.env.CLAMAV_PORT = String((server.address() as { port: number }).port);
      try {
        expect(await scanFile(Buffer.from("%PDF-1.7\n"))).toBe(expected);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    },
  );
});
