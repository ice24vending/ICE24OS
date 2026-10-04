import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageUnavailableError } from "../application/files.port.js";
import { SupabaseObjectStorage } from "./supabase-storage.js";

const SERVICE_KEY = "service-role-fixture";
const key = `${randomUUID()}/${randomUUID()}/v1/${randomUUID()}`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Supabase private storage adapter", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co/");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", SERVICE_KEY);
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("requests a one-object signed upload with the server key and returns an absolute URL", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ url: `/object/upload/sign/quarantine/${key}?token=abc` }),
    );
    const url = await new SupabaseObjectStorage().createSignedUpload("quarantine", key);
    expect(url).toBe(
      `https://project.supabase.co/storage/v1/object/upload/sign/quarantine/${key}?token=abc`,
    );
    const [target, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(target).toBe(
      `https://project.supabase.co/storage/v1/object/upload/sign/quarantine/${key}`,
    );
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${SERVICE_KEY}`);
    expect(url).not.toContain(SERVICE_KEY);
  });

  it("reads size and type with HEAD and treats a missing object as null", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 200,
        headers: { "content-length": "2048", "content-type": "image/png" },
      }),
    );
    const storage = new SupabaseObjectStorage();
    expect(await storage.stat("quarantine", key)).toEqual({
      sizeBytes: 2048,
      mediaType: "image/png",
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 400 }));
    expect(await storage.stat("quarantine", key)).toBeNull();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(storage.stat("quarantine", key)).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it("signs temporary reads with bounded lifetime and forced download", async () => {
    fetchMock.mockResolvedValueOnce(json({ signedURL: `/object/sign/originals/${key}?token=r` }));
    const url = await new SupabaseObjectStorage().createSignedRead(
      "originals",
      key,
      300,
      "lab 1.pdf",
    );
    expect(url).toBe(
      `https://project.supabase.co/storage/v1/object/sign/originals/${key}?token=r&download=lab%201.pdf`,
    );
    expect(JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))).toEqual({
      expiresIn: 300,
    });
    await expect(
      new SupabaseObjectStorage().createSignedRead("originals", key, 3600, null),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
  });

  it("refuses foreign paths, odd responses and missing configuration", async () => {
    const storage = new SupabaseObjectStorage();
    await expect(
      storage.createSignedUpload("quarantine", "../otra-cuenta/x"),
    ).rejects.toBeInstanceOf(StorageUnavailableError);
    fetchMock.mockResolvedValueOnce(json({ url: "https://evil.example/upload" }));
    await expect(storage.createSignedUpload("quarantine", key)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    await expect(storage.stat("quarantine", key)).rejects.toBeInstanceOf(StorageUnavailableError);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(storage.createSignedUpload("quarantine", key)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a signed response for a different object and accepts a short remaining lifetime", async () => {
    const storage = new SupabaseObjectStorage();
    fetchMock.mockResolvedValueOnce(
      json({ signedURL: "/object/sign/originals/another-object?token=r" }),
    );
    await expect(storage.createSignedRead("originals", key, 300, null)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    );
    fetchMock.mockResolvedValueOnce(json({ signedURL: `/object/sign/originals/${key}?token=r` }));
    await expect(storage.createSignedRead("originals", key, 1, null)).resolves.toContain(
      "download=archivo",
    );
    for (const ttl of [0, 301, 1.5, Number.NaN]) {
      await expect(storage.createSignedRead("originals", key, ttl, null)).rejects.toBeInstanceOf(
        StorageUnavailableError,
      );
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
