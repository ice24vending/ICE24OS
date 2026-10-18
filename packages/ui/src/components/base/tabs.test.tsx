// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Tabs, type TabItem } from "./tabs.js";

afterEach(cleanup);

const ITEMS: readonly TabItem[] = [
  { id: "summary", label: "Resumen", content: <p>Datos generales</p> },
  { id: "maintenance", label: "Mantenimiento", content: <p>Órdenes</p> },
  { id: "documents", label: "Documentos", content: <p>Archivos</p>, disabled: true },
  { id: "history", label: "Historial", content: <p>Eventos</p> },
];

const selected = () => screen.getByRole("tab", { selected: true }).textContent;

describe("Tabs", () => {
  it("has one tab stop and moves with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Tabs label="Secciones de la máquina" items={ITEMS} onChange={onChange} />);
    expect(screen.getByRole("tablist", { name: "Secciones de la máquina" })).toBeDefined();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Resumen" }));
    await user.keyboard("{ArrowRight}");
    expect(selected()).toBe("Mantenimiento");
    await user.keyboard("{ArrowRight}");
    expect(selected()).toBe("Historial"); // the disabled tab is skipped
    await user.keyboard("{ArrowRight}");
    expect(selected()).toBe("Resumen"); // wraps
    await user.keyboard("{End}");
    expect(selected()).toBe("Historial");
    await user.keyboard("{Home}");
    expect(selected()).toBe("Resumen");
    expect(onChange).toHaveBeenLastCalledWith("summary");
    expect(screen.getByRole("tabpanel", { name: "Resumen" }).textContent).toBe("Datos generales");
  });

  it("moves into the panel with Tab", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Secciones" items={ITEMS} />);
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("tabpanel"));
  });

  it("only selects with Enter in manual activation", async () => {
    const user = userEvent.setup();
    render(<Tabs label="Secciones" items={ITEMS} activation="manual" />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Mantenimiento" }));
    expect(selected()).toBe("Resumen");
    await user.keyboard("{Enter}");
    expect(selected()).toBe("Mantenimiento");
  });

  it("has no axe violations", async () => {
    const { container } = render(<Tabs label="Secciones" items={ITEMS} defaultValue="history" />);
    await expectNoAxeViolations(container);
  });
});
