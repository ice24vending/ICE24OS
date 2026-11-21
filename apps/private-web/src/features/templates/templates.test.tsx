// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TemplateData } from "../../server/demo/templates";
import LoadingTemplates from "../../app/(account)/plantillas/loading";
import { DetailScreen } from "./detail-screen";
import { ListScreen } from "./list-screen";

let query = new URLSearchParams("ejemplo=base&ubicacion=Centro&vista=lista");
let pathname = "/plantillas/lista";
const router = { replace: vi.fn(), refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => query,
}));

const DATA: TemplateData = {
  accountId: "cuenta-1",
  accountName: "Hielo Polar",
  contextId: "contexto-1",
  csrfToken: "demo",
  readOnly: false,
  failure: null,
  scenario: "normal",
  machines: [
    {
      id: "m1",
      code: "ICE24-001",
      name: "Despachadora Juárez",
      branch: "Centro",
      model: "IC-500",
      operation: "available",
      technical: "optimal",
      sanitary: "up_to_date",
      productionKg: 410,
      lastService: "14/10/2026",
    },
    {
      id: "m2",
      code: "ICE24-002",
      name: "Bodega",
      branch: "Centro",
      model: "IC-900",
      operation: "maintenance",
      technical: "preventive_attention",
      sanitary: "expiring_soon",
      productionKg: null,
      lastService: "02/10/2026",
    },
  ],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  query = new URLSearchParams("ejemplo=base&ubicacion=Centro&vista=lista");
  pathname = "/plantillas/lista";
});

describe("UXD-00 template examples", () => {
  it.each([
    ["/plantillas/lista", "ejemplo=base", "Máquinas"],
    ["/plantillas/detalle/m1", "", "Detalle"],
  ])("keeps one named main and h1 while %s is loading", (path, search, title) => {
    pathname = path;
    query = new URLSearchParams(search);
    render(<LoadingTemplates />);
    const main = screen.getByRole("main", { name: title });
    expect(main.getAttribute("aria-busy")).toBe("true");
    expect(main.getAttribute("data-template-ready")).toBe("false");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("preserves the original loading example when not opted in", () => {
    query = new URLSearchParams();
    render(<LoadingTemplates />);
    expect(screen.getByRole("main").className).toBe("private-shell template-screen");
    expect(screen.getByText("Cargando la plantilla…")).toBeTruthy();
  });

  it("links the first cell to a record route with the list state as its origin", () => {
    render(<ListScreen data={DATA} />);
    const link = screen.getByRole("link", { name: "ICE24-001" });
    expect(link.id).toBe("fila-m1");
    const url = new URL(link.getAttribute("href")!, "https://ice24.invalid");
    expect(url.pathname).toBe("/plantillas/detalle/m1");
    expect(url.searchParams.get("desde")).toBe(
      "/plantillas/lista?ejemplo=base&ubicacion=Centro&vista=lista",
    );
    expect(link.closest("tr")?.hasAttribute("tabindex")).toBe(false);
    expect(link.closest("tr")?.hasAttribute("role")).toBe(false);
    expect(within(link.closest("tr")!).getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByText("Solicitar alta")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("changes the view without dropping filters and does not announce the initial view", async () => {
    render(<ListScreen data={DATA} />);
    const group = screen.getByRole("radiogroup");
    expect(screen.queryByText("Vista de lista activada.")).toBeNull();
    await userEvent.click(within(group).getByRole("radio", { name: "Bloques" }));
    expect(router.replace).toHaveBeenCalledWith(
      "/plantillas/lista?ejemplo=base&ubicacion=Centro&vista=bloques",
      { scroll: false },
    );
  });

  it("keeps legacy list actions and avoids adding the new switcher without opting in", () => {
    query = new URLSearchParams();
    render(<ListScreen data={DATA} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("link", { name: "Ver ICE24-001" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Solicitar alta" })).toBeTruthy();
  });

  it("offers an explicit focused return and documentation without write actions", () => {
    render(
      <DetailScreen
        data={DATA}
        machineId="m1"
        backHref="/plantillas/lista?ejemplo=base&vista=bloques"
        baseExample
        showDocumentation
      />,
    );
    const back = screen.getByRole("link", { name: "Volver a máquinas" });
    expect(back.getAttribute("href")).toBe(
      "/plantillas/lista?ejemplo=base&vista=bloques&volverA=fila-m1",
    );
    expect(screen.queryByRole("button", { name: "Registrar lectura" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Detalle con ruta propia" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Probar lista y detalle" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("preserves the return target when the record is missing", () => {
    render(
      <DetailScreen
        data={DATA}
        machineId="removed"
        backHref="/plantillas/lista?ejemplo=base"
        baseExample
      />,
    );
    expect(screen.getByRole("link", { name: "Volver a máquinas" }).getAttribute("href")).toContain(
      "volverA=fila-removed",
    );
    expect(screen.queryByRole("button", { name: "Registrar lectura" })).toBeNull();
  });
});
