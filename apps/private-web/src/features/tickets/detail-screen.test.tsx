// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const access = vi.hoisted(() => ({ canWrite: true, online: true, markReadOnly: vi.fn() }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("volver=%2Fmaintenance%2Ftickets%3Fpriority%3Dhigh"),
}));
vi.mock("../account-shell/access-provider", () => ({ useAccountAccess: () => access }));
vi.mock("../context/unsaved-changes", () => ({
  useUnsavedChanges: vi.fn(),
  discardUnsavedChanges: vi.fn(),
}));
import { TicketDetailScreen } from "./detail-screen";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { DEMO_PERSONAS, ROLE_PERMISSIONS, type DemoPersonaKey } from "../../server/demo/personas";
const id = "70000000-0000-4000-8000-000000000384";
const props = { id, contextId: "context", csrfToken: "csrf", permissions: ROLE_PERMISSIONS.OW };
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      demoApiResponse(
        url.replace("/api/", ""),
        {},
        defaultDemoState(),
        Date.parse("2026-11-23T18:00:00Z"),
      ),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  access.canWrite = true;
  access.online = true;
});
const loaded = () =>
  waitFor(() => expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true"));
describe("ticket detail", () => {
  it("keeps maintenance navigation while loading and after loading", async () => {
    render(<TicketDetailScreen {...props} />);
    const expectNavigation = () => {
      const navigation = screen.getByRole("navigation", { name: "Mantenimiento" });
      expect(
        within(navigation).getByRole("link", { name: "Tickets" }).getAttribute("aria-current"),
      ).toBe("page");
      expect(within(navigation).getByRole("link", { name: "Órdenes" }).getAttribute("href")).toBe(
        "/maintenance/work-orders",
      );
    };
    expectNavigation();
    await loaded();
    expectNavigation();
  });
  it("requests an audited file session and renders only its raster blob", async () => {
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override createObjectURL = vi.fn(() => "blob:private-photo");
        static override revokeObjectURL = vi.fn();
      },
    );
    render(<TicketDetailScreen {...props} />);
    await loaded();
    const requests: { url: string; body: FormData | undefined }[] = [];
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      requests.push({ url: String(url), body: init?.body as FormData | undefined });
      return String(url).startsWith("/api/files/")
        ? Response.json({
            url: "https://storage.example.test/private-signed-token",
            expiresAt: "2026-11-23T18:10:00Z",
          })
        : new Response(new Uint8Array([137, 80, 78, 71]), {
            headers: { "content-type": "image/png" },
          });
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Ver foto 1" }));
    expect(
      (await screen.findByRole("img", { name: "Foto 1 del reporte de falla" })).getAttribute("src"),
    ).toBe("blob:private-photo");
    expect(requests[0]!.body?.get("csrfToken")).toBe("csrf");
    expect(document.body.innerHTML).not.toContain("private-signed-token");
  });
  it.each(["owner", "admin", "technician", "readonly"] as DemoPersonaKey[])(
    "shows only %s actions",
    async (persona) => {
      render(
        <TicketDetailScreen
          {...props}
          permissions={ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role]}
        />,
      );
      await loaded();
      expect(!!screen.queryByRole("button", { name: "Guardar diagnóstico" })).toBe(
        persona !== "readonly",
      );
      expect(!!screen.queryByRole("link", { name: "Asignar técnico" })).toBe(
        ["owner", "admin"].includes(persona),
      );
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByRole("link", { name: "Volver a tickets" }).getAttribute("href")).toContain(
        "priority=high",
      );
    },
  );
  it("hides writing in read-only mode and links to the current work-order route", async () => {
    access.canWrite = false;
    render(<TicketDetailScreen {...props} id="70000000-0000-4000-8000-000000000385" />);
    await loaded();
    expect(screen.queryByRole("button", { name: "Guardar diagnóstico" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Asignar técnico" })).toBeNull();
    expect(screen.getByRole("link", { name: "Ver orden de trabajo" }).getAttribute("href")).toMatch(
      /^\/maintenance\/work-orders\/[0-9a-f-]+$/,
    );
    expect(screen.getByText("Atención iniciada")).toBeTruthy();
  });
  it("sends the current version and preserves the idempotency key and input after a failure", async () => {
    render(<TicketDetailScreen {...props} />);
    await loaded();
    const calls: FormData[] = [];
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      calls.push(init!.body as FormData);
      return Response.json(
        {
          message: "Servicio no disponible",
          correlationId: "c0ffee00-0000-4000-8000-000000000099",
        },
        { status: 503 },
      );
    });
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("textbox", { name: "Motivo de la actualización" }),
      "Revisión del equipo",
    );
    for (let n = 0; n < 2; n++) {
      await user.click(screen.getByRole("button", { name: "Guardar diagnóstico" }));
      await screen.findByText("Servicio no disponible");
    }
    expect(calls).toHaveLength(2);
    expect(calls[0]!.get("version")).toBe("2");
    expect(calls[1]!.get("key")).toBe(calls[0]!.get("key"));
    expect(
      (screen.getByRole("textbox", { name: "Motivo de la actualización" }) as HTMLInputElement)
        .value,
    ).toBe("Revisión del equipo");
  });
});
