import { beforeEach, describe, expect, it, vi } from "vitest";
const fixtures = vi.hoisted(() => ({ session: vi.fn(), api: vi.fn() }));
vi.mock("../../../server/session/session", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readBrowserSession: fixtures.session,
}));
vi.mock("../../../server/session/supabase-auth", () => ({ callPrivateApi: fixtures.api }));
import { GET, POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.session.mockResolvedValue({
    contextId: "context-a",
    csrfToken: "csrf-test",
    accessToken: "server-only",
  });
  fixtures.api.mockResolvedValue(Response.json({ id: "resource" }));
});
describe("equipment BFF isolation", () => {
  it("forwards branch maintenance only as a validated read", async () => {
    const id = "b0000000-0000-4000-8000-000000000001";
    const response = await GET(
      new Request(
        `http://localhost/api/equipment?path=${encodeURIComponent(`maintenance/activities?branchId=${id}&period=next7days&limit=100`)}`,
        { headers: { "x-ice24-workspace-context": "context-a" } },
      ),
    );
    expect(response.status).toBe(200);
    expect(fixtures.api.mock.calls[0]![0]).toContain(`branchId=${id}`);
    expect(
      (
        await GET(
          new Request(
            "http://localhost/api/equipment?path=maintenance/activities?branchId=invalid",
            { headers: { "x-ice24-workspace-context": "context-a" } },
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("allows only validated machine history reads", async () => {
    fixtures.api.mockImplementation(async () => Response.json({ items: [] }));
    const id = "c0000000-0000-4000-8000-000000000001";
    for (const resource of ["tickets", "maintenance/activities"]) {
      const get = (query: string) =>
        GET(
          new Request(
            `http://localhost/api/equipment?path=${encodeURIComponent(`${resource}?${query}`)}`,
            { headers: { "x-ice24-workspace-context": "context-a" } },
          ),
        );
      expect((await get(`machineId=${id}&limit=50`)).status).toBe(200);
      expect(fixtures.api.mock.calls.at(-1)![0]).toContain(`machineId=${id}`);
      expect((await get("machineId=invalid")).status).toBe(400);
      expect((await get("limit=50")).status).toBe(400);
    }
  });
  it("explains duplicate branch codes in Spanish without leaking database errors", async () => {
    fixtures.api.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "internal index detail",
            details: { field: "code", reason: "duplicate" },
            correlationId: "c0ffee00-0000-4000-8000-000000000202",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 },
      ),
    );
    const form = new FormData();
    form.set("csrfToken", "csrf-test");
    form.set("path", "branches");
    form.set("method", "POST");
    const result = await POST(
      new Request("http://localhost/api/equipment", {
        method: "POST",
        body: form,
        headers: { origin: "http://localhost", "x-ice24-workspace-context": "context-a" },
      }),
    );
    expect((await result.json()).message).toBe(
      "Ya existe una sucursal con este código en la cuenta. Usa otro código.",
    );
  });
  it("preserves the read-only code without exposing upstream details", async () => {
    fixtures.api.mockResolvedValue(
      Response.json(
        {
          error: {
            code: "ACCOUNT_READ_ONLY",
            message: "internal detail",
            correlationId: "00000000-0000-4000-8000-000000000001",
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 },
      ),
    );
    const form = new FormData();
    form.set("csrfToken", "csrf-test");
    form.set("path", "branches");
    form.set("method", "POST");
    const response = await POST(
      new Request("http://localhost/api/equipment", {
        method: "POST",
        body: form,
        headers: { origin: "http://localhost", "x-ice24-workspace-context": "context-a" },
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: "ACCOUNT_READ_ONLY",
      message: "La cuenta está en modo solo lectura. Consulta Suscripción para revisar el acceso.",
    });
  });
  it("rejects unauthenticated access", async () => {
    fixtures.session.mockResolvedValue(undefined);
    expect((await GET(new Request("http://localhost/api/equipment?path=branches"))).status).toBe(
      401,
    );
  });
  it("rejects stale browser context before any upstream request", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/equipment?path=branches", {
            headers: { "x-ice24-workspace-context": "context-b" },
          }),
        )
      ).status,
    ).toBe(409);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("blocks paths outside the equipment allowlist", async () => {
    expect(
      (
        await GET(
          new Request("http://localhost/api/equipment?path=identity-recovery-cases", {
            headers: { "x-ice24-workspace-context": "context-a" },
          }),
        )
      ).status,
    ).toBe(400);
  });
  it("requires matching Origin and CSRF for writes", async () => {
    const form = new FormData();
    form.set("csrfToken", "wrong");
    expect(
      (
        await POST(
          new Request("http://localhost/api/equipment", {
            method: "POST",
            headers: { origin: "http://attacker.test", "x-ice24-workspace-context": "context-a" },
            body: form,
          }),
        )
      ).status,
    ).toBe(403);
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("keeps the upstream access token on the server", async () => {
    const response = await GET(
      new Request("http://localhost/api/equipment?path=branches", {
        headers: { "x-ice24-workspace-context": "context-a" },
      }),
    );
    expect(await response.json()).toEqual({ id: "resource" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("TASK-F4-22 component and frequency routes", () => {
  const write = (path: string, method: string, version?: string) => {
    const form = new FormData();
    form.set("csrfToken", "csrf-test");
    form.set("path", path);
    form.set("method", method);
    form.set("body", JSON.stringify({ reason: "Integration test evidence", confirmation: true }));
    form.set("key", "key-00000001");
    if (version) form.set("version", version);
    return POST(
      new Request("http://localhost/api/equipment", {
        method: "POST",
        body: form,
        headers: { origin: "http://localhost", "x-ice24-workspace-context": "context-a" },
      }),
    );
  };
  const apiError = (status: number, code: string) =>
    Response.json(
      {
        error: {
          code,
          message: "upstream detail that must not reach the browser",
          correlationId: "00000000-0000-4000-8000-000000000001",
          timestamp: new Date().toISOString(),
        },
      },
      { status },
    );
  const machine = "11111111-1111-4111-8111-111111111111";
  const component = "22222222-2222-4222-8222-222222222222";

  it("forwards the RA-01 routes, PUT with If-Match and the four-segment transitions", async () => {
    fixtures.api.mockImplementation(async () => Response.json({ id: "resource" }));
    for (const [path, method, version] of [
      [`machines/${machine}/frequency-overrides`, "PUT", "3"],
      [`machines/${machine}/components/${component}`, "PATCH", "4"],
      [`machines/${machine}/frequency-overrides/reset`, "POST", undefined],
      [`machines/${machine}/components/${component}/deactivate`, "POST", "2"],
      ["account-frequency-overrides/reset", "POST", undefined],
      [`technical-models/${machine}/frequency-overrides`, "POST", undefined],
      ["account-catalog-entries", "POST", undefined],
    ] as const) {
      fixtures.api.mockClear();
      expect((await write(path, method, version)).status).toBe(200);
      const [calledPath, , init] = fixtures.api.mock.calls[0] as [string, unknown, RequestInit];
      expect(calledPath).toBe(path);
      expect(init.method).toBe(method);
      expect((init.headers as Record<string, string>)["if-match"]).toBe(version ?? "");
    }
    expect((await write("machines", "DELETE")).status).toBe(400);
    expect((await write(`machines/${machine}/a/b/c/d/e`, "POST")).status).toBe(400);
    expect(fixtures.api).toHaveBeenCalledTimes(1);
  });

  it("keeps the API decision and code for denied, stale and warranty answers", async () => {
    for (const [status, code, text] of [
      [403, "FORBIDDEN", "No tienes permiso"],
      [412, "PRECONDITION_FAILED", "Otra persona cambió este registro"],
      [422, "WARRANTY_WARNING_CONFIRMATION_REQUIRED", "puede afectar la garantía"],
    ] as const) {
      fixtures.api.mockImplementation(async () => apiError(status, code));
      const response = await write("account-frequency-overrides/reset", "POST");
      expect(response.status).toBe(status);
      const body = (await response.json()) as { code: string; message: string };
      expect(body.code).toBe(code);
      expect(body.message).toContain(text);
      expect(body.message).not.toContain("upstream detail");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("equipment BFF failure reference", () => {
  it("forwards the support folio and code, keeping the upstream message private", async () => {
    const correlationId = "c0ffee00-0000-4000-8000-0000000003e7";
    fixtures.api.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "DEPENDENCY_UNAVAILABLE",
            message: "internal database detail",
            correlationId,
            timestamp: "2026-10-20T16:00:00Z",
          },
        }),
        { status: 503 },
      ),
    );
    const response = await GET(
      new Request("http://localhost/api/equipment?path=account-catalog-entries", {
        headers: { "x-ice24-workspace-context": "context-a" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "DEPENDENCY_UNAVAILABLE",
      correlationId,
      message: "El servicio no está disponible. Intenta nuevamente.",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
