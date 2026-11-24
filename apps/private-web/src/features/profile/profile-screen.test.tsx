// @vitest-environment jsdom
import { cleanup, render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProfileScreen } from "./profile-screen";
import type { ProfileData } from "./model";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { ROLE_PERMISSIONS, type DemoPersonaKey, DEMO_PERSONAS } from "../../server/demo/personas";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/profile",
  useSearchParams: () => new URLSearchParams(),
}));
const now = Date.parse("2026-11-23T16:00:00Z");
beforeEach(() => vi.setSystemTime(now));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function fixture(persona: DemoPersonaKey = "owner") {
  const state = { ...defaultDemoState(), persona };
  const get = async (path: string) => (await demoApiResponse(path, {}, state, now)).json();
  const data: ProfileData = {
    loadedAt: now,
    profile: await get("me"),
    context: await get("session-contexts/current"),
    capabilities: await get("session-contexts/current/capabilities"),
    sessions: await get("me/sessions"),
    activity: await get("me/activity"),
    mfa: await get("me/mfa"),
    mfaFailure: null,
    scope: ["Toda la cuenta"],
  };
  return {
    initial: { data, failure: null } as const,
    csrfToken: state.csrf,
    contextId: data.context.id!,
  };
}
it("has one main/h1, named regions, initials and immutable identity explanation", async () => {
  const props = await fixture();
  expect(renderToString(<ProfileScreen {...props} />)).toContain('data-page-ready="false"');
  render(<ProfileScreen {...props} />);
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
  expect(screen.getByRole("region", { name: "Datos de perfil" }).textContent).toContain("LM");
  expect(screen.getByText(/El correo y el usuario son de solo lectura/)).toBeTruthy();
  expect(screen.queryByRole("columnheader", { name: "Lugar" })).toBeNull();
  expect(
    within(screen.getByRole("region", { name: "Mi actividad reciente" })).getAllByRole("listitem"),
  ).toHaveLength(10);
});
it.each(["owner", "technician", "readonly", "admin"] as const)(
  "shows only actual %s grants",
  async (persona) => {
    const props = await fixture(persona);
    render(<ProfileScreen {...props} />);
    const granted = ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role];
    expect(Boolean(screen.queryByRole("button", { name: "Editar" }))).toBe(
      granted.includes("identity.profile-update"),
    );
    expect(Boolean(screen.queryByRole("button", { name: "Cerrar las demás sesiones" }))).toBe(
      granted.includes("identity.session-revoke"),
    );
    if (persona !== "owner")
      expect(screen.queryByText("Administrar integrantes de la cuenta")).toBeNull();
  },
);
it("hides actions without the corresponding grant", async () => {
  const props = await fixture();
  props.initial.data.capabilities.permissions = [];
  render(<ProfileScreen {...props} />);
  expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Cerrar esta sesión/ })).toBeNull();
});
it("requires confirmation and preserves the current session when closing others", async () => {
  const props = await fixture();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ closedCurrent: false }))
    .mockResolvedValueOnce(Response.json(props.initial));
  vi.stubGlobal("fetch", fetcher);
  render(<ProfileScreen {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Cerrar las demás sesiones" }));
  expect(fetcher).not.toHaveBeenCalled();
  const dialog = screen.getByRole("alertdialog");
  expect(dialog.textContent).toContain("Esta sesión permanecerá activa");
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar las demás sesiones" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar cierre" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(fetcher.mock.calls[0]?.[0]).toBe("/api/profile/sessions/revoke-all");
});
it("keeps a draft and explains version conflicts", async () => {
  const props = await fixture();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          message: "Tu perfil cambió en otra sesión.",
          code: "PRECONDITION_FAILED",
          correlationId: "c0ffee00-0000-4000-8000-000000000001",
        },
        { status: 412 },
      ),
    ),
  );
  render(<ProfileScreen {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Editar" }));
  const name = screen.getByRole("textbox", { name: /Nombre/ });
  expect(document.activeElement).toBe(name);
  fireEvent.change(name, { target: { value: "Nuevo nombre" } });
  fireEvent.submit(name.closest("form")!);
  await screen.findByText("Tu perfil cambió en otra sesión.");
  expect((name as HTMLInputElement).value).toBe("Nuevo nombre");
  expect(screen.getByRole("button", { name: "Recargar datos" })).toBeTruthy();
});
