// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "../../components/base/button.js";
import { expectNoAxeViolations } from "../../components/base/axe.test-utils.js";
import { SystemState } from "../status/system-state.js";
import { DashboardLayout, KpiCard } from "./dashboard-layout.js";
import { DetailLayout } from "./detail-layout.js";
import { ListLayout } from "./list-layout.js";
import { MobileOperationalLayout } from "./mobile-operational-layout.js";
import { PageHeader } from "./page-header.js";
import { WizardLayout } from "./wizard-layout.js";

afterEach(cleanup);

describe("PageHeader", () => {
  it("is the page's only h1, with eyebrow, description and actions", () => {
    render(
      <PageHeader
        eyebrow="Operación"
        title="Máquinas"
        description="6 equipos"
        actions={<Button>Solicitar alta</Button>}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Máquinas",
    ]);
    expect(screen.getByText("Operación")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Solicitar alta" })).toBeTruthy();
  });
});

describe("ListLayout", () => {
  it("folds the filters behind a toggle that says how many are active", async () => {
    render(
      <ListLayout
        title="Máquinas"
        filters={
          <label>
            Sucursal <select />
          </label>
        }
        activeFilters={2}
      >
        <p>Tabla</p>
      </ListLayout>,
    );
    const toggle = screen.getByRole("button", { name: "Filtros (2)" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("group", { name: "Filtros" }).id).toBe(
      toggle.getAttribute("aria-controls"),
    );
  });

  it("replaces the list and pagination with a global state, keeping header and filters", () => {
    render(
      <ListLayout
        title="Máquinas"
        filters={<input aria-label="Buscar" />}
        status={<SystemState kind="error" />}
        pagination={<nav aria-label="Paginación" />}
      >
        <p>Tabla</p>
      </ListLayout>,
    );
    expect(screen.queryByText("Tabla")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Paginación" })).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Buscar" })).toBeTruthy();
  });
});

describe("DetailLayout", () => {
  const tabs = [{ id: "resumen", label: "Resumen", content: <p>Datos</p> }];

  it("puts the identifier above the title and history as the last tab", () => {
    render(
      <DetailLayout
        identifier="ICE24-MTY-0001"
        title="Despachadora Juárez"
        tabs={tabs}
        history={<p>Bitácora</p>}
        aside={<p>Próximos eventos</p>}
      />,
    );
    expect(screen.getByText("ICE24-MTY-0001")).toBeTruthy();
    const names = within(screen.getByRole("tablist"))
      .getAllByRole("tab")
      .map((tab) => tab.textContent);
    expect(names).toEqual(["Resumen", "Historial"]);
    expect(screen.getByRole("complementary", { name: "Datos del registro" })).toBeTruthy();
  });

  it("shows only the header and the state when forbidden", () => {
    render(
      <DetailLayout
        title="Despachadora Juárez"
        tabs={tabs}
        status={<SystemState kind="forbidden" />}
      />,
    );
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("Sin permiso");
  });
});

describe("WizardLayout", () => {
  const renderWizard = (props: Partial<Parameters<typeof WizardLayout>[0]> = {}) => {
    const finish = vi.fn();
    let valid = false;
    const view = render(
      <WizardLayout
        title="Solicitud de alta"
        steps={[
          {
            id: "datos",
            label: "Datos básicos",
            content: <p>Modelo</p>,
            validate: () => (valid ? [] : ["Elige el modelo de la máquina."]),
          },
          { id: "ubicacion", label: "Ubicación", content: <p>Sucursal</p> },
        ]}
        summary={<p>Resumen final</p>}
        onFinish={finish}
        {...props}
      />,
    );
    return { finish, view, makeValid: () => (valid = true) };
  };

  it("blocks «Siguiente» with the step's problems and focuses the step title", async () => {
    renderWizard();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("alert").textContent).toContain("Elige el modelo de la máquina.");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: "Datos básicos" }),
    );
    expect(screen.getByText("Paso 1 de 3")).toBeTruthy();
  });

  it("walks to the review, lets the person go back and finishes once", async () => {
    const { finish, makeValid } = renderWizard();
    makeValid();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { level: 2, name: "Ubicación" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("Resumen final")).toBeTruthy();
    expect(screen.getByText("Paso 3 de 3")).toBeTruthy();
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Revisión");
    await userEvent.click(screen.getByRole("button", { name: /Datos básicos.*volver/ }));
    expect(screen.getByText("Modelo")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(finish).toHaveBeenCalledOnce();
  });

  it("does not finish while blocked or already sending", async () => {
    const steps = [{ id: "uno", label: "Uno", content: null }];
    const finish = vi.fn();
    const { rerender } = render(
      <WizardLayout
        title="Alta"
        steps={steps}
        summary={null}
        onFinish={finish}
        finishDisabledReason="La cuenta está en modo lectura."
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(screen.getByText("La cuenta está en modo lectura.")).toBeTruthy();
    rerender(
      <WizardLayout title="Alta" steps={steps} summary={null} onFinish={finish} finishing />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Enviando/ }));
    expect(finish).not.toHaveBeenCalled();
  });

  it("has no axe violations", async () => {
    const { view } = renderWizard();
    await expectNoAxeViolations(view.container);
  });
});

describe("DashboardLayout and KpiCard", () => {
  it("says «Sin datos» instead of zero and flags partial data", () => {
    render(
      <DashboardLayout
        title="Inicio"
        kpis={[
          {
            label: "Producción",
            value: "1,240",
            unit: "kg",
            period: "Hoy",
            completeness: "partial",
          },
          { label: "Ventas", value: null, period: "Hoy" },
        ]}
      >
        <section aria-label="Alertas" />
      </DashboardLayout>,
    );
    const indicators = screen.getByRole("region", { name: "Indicadores" });
    const [production, sales] = within(indicators).getAllByRole("article");
    expect(production?.textContent).toContain("1,240 kg");
    expect(production?.textContent).toContain("Datos parciales");
    expect(sales?.textContent).toContain("Sin datos");
    expect(sales?.textContent).not.toContain("0");
  });

  it("renders a lone KpiCard with period and scope", () => {
    render(
      <KpiCard label="Máquinas disponibles" value={5} period="Ahora" context="2 sucursales" />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Máquinas disponibles" })).toBeTruthy();
    expect(screen.getByText("Ahora · 2 sucursales")).toBeTruthy();
  });

  it("draws the optional icon in its tone and hides it from screen readers", () => {
    const { container } = render(
      <KpiCard label="Alertas críticas" value={1} period="Ahora" icon="danger" tone="danger" />,
    );
    const icon = container.querySelector(".ids-card__icon--danger");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("heading", { level: 3, name: "Alertas críticas" })).toBeTruthy();
  });
});

describe("MobileOperationalLayout", () => {
  it("keeps the actions when a state replaces the content", () => {
    render(
      <MobileOperationalLayout
        title="OT-00241"
        subtitle="ICE24-MTY-0001 · Preventivo"
        backHref="/plantillas"
        progress={{ value: 6, max: 9, label: "Progreso 6 de 9" }}
        primaryAction={<Button>Completar</Button>}
        secondaryAction={<Button variant="secondary">Guardar en este dispositivo</Button>}
        status={<SystemState kind="offline" />}
      >
        <p>Checklist</p>
      </MobileOperationalLayout>,
    );
    expect(screen.queryByText("Checklist")).toBeNull();
    expect(screen.getByRole("link", { name: "Volver" }).getAttribute("href")).toBe("/plantillas");
    expect(screen.getByRole("progressbar", { name: "Progreso 6 de 9" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Completar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar en este dispositivo" })).toBeTruthy();
  });
});
