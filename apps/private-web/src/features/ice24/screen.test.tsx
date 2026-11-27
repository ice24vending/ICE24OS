// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { AdministrationScreen } from "./screen";
import { adminReturn, type AdminSection } from "./model";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { ROLE_PERMISSIONS } from "../../server/demo/personas";
const state = { ...defaultDemoState(), persona: "platform" as const };
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function view(
  section: AdminSection = "modelos",
  id?: string,
  permissions: readonly string[] = ROLE_PERMISSIONS.IA,
  mode: "ACTIVE" | "READ_ONLY" = "ACTIVE",
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      demoApiResponse(
        new URL(url, "https://ice24.invalid").searchParams.get("path")!,
        {},
        { ...state, mode },
      ),
    ),
  );
  return (
    <AccessProvider
      initialMode={mode}
      initialNotice={readOnlyNotice(null, false)}
      billingOwner={false}
    >
      <AdministrationScreen
        section={section}
        id={id}
        contextId="context"
        csrfToken="csrf"
        permissions={permissions}
      />
    </AccessProvider>
  );
}
it("renders full-width clickable rows after the loading contract", async () => {
  const element = view();
  expect(renderToStaticMarkup(element)).toContain('data-page-ready="false"');
  render(element);
  await screen.findByRole("table", { name: "Modelos técnicos" });
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("main").className).toContain("ids-page-width--full");
  expect(
    screen.getByRole("link", { name: "Despachadora de hielo IC-500" }).getAttribute("href"),
  ).toContain("/ice24/modelos/");
  expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true");
});
it("separates account creation permission from equipment administration", async () => {
  render(view("cuentas", undefined, ROLE_PERMISSIONS.IO));
  await screen.findByRole("table", { name: "Cuentas de ICE24" });
  expect(screen.queryByText("Crear cuenta e invitar titular")).toBeNull();
  cleanup();
  render(view("cuentas"));
  await screen.findByRole("table", { name: "Cuentas de ICE24" });
  expect(screen.getAllByText("Crear cuenta e invitar titular").length).toBeGreaterThan(0);
});
it("puts a template in its own detail and blocks all writes in read-only mode", async () => {
  render(
    view("plantillas", "51000000-0000-4000-8000-000000000001", ROLE_PERMISSIONS.IA, "READ_ONLY"),
  );
  await waitFor(() =>
    expect(screen.getByRole("main").getAttribute("data-page-ready")).toBe("true"),
  );
  expect(screen.getByRole("main").getAttribute("data-page-breadcrumbs")).toBe("true");
  expect(screen.getByText("Revisar filtro y serpentín")).toBeTruthy();
  for (const fieldset of document.querySelectorAll("fieldset"))
    expect(fieldset.disabled).toBe(true);
});
it("keeps the error reference and accepts only administration returns", async () => {
  const element = view();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: "Servicio no disponible",
            correlationId: "c0ffee00-0000-4000-8000-0000000003e7",
          }),
          { status: 503 },
        ),
    ),
  );
  render(element);
  await screen.findByText(/c0ffee00-0000-4000-8000-0000000003e7/);
  expect(adminReturn("//example.com", "cuentas")).toBe("/ice24?seccion=cuentas");
  expect(adminReturn("/account", "modelos")).toBe("/ice24?seccion=modelos");
});
