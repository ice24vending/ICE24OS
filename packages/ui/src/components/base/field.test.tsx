// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { DateField, Select, TextArea, TextField } from "./field.js";

afterEach(cleanup);

const BRANCHES = [
  { value: "mty", label: "Monterrey Centro" },
  { value: "gdl", label: "Guadalajara Norte" },
  { value: "cdmx", label: "CDMX Sur", disabled: true },
];

describe("TextField", () => {
  it("associates label, help and required state", async () => {
    const user = userEvent.setup();
    render(
      <TextField
        label="Correo electrónico"
        type="email"
        help="Usaremos este correo para avisos."
        required
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "Correo electrónico",
      description: "Usaremos este correo para avisos.",
    });
    expect((input as HTMLInputElement).required).toBe(true);
    await user.tab();
    expect(document.activeElement).toBe(input);
    await user.keyboard("ana@empresa.mx");
    expect((input as HTMLInputElement).value).toBe("ana@empresa.mx");
  });

  it("marks the error and announces it with the field", () => {
    render(<TextField label="Correo" error="Indica un correo válido." help="Ejemplo: a@b.mx" />);
    const input = screen.getByRole("textbox", { name: "Correo" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")?.split(" ")).toHaveLength(2);
    expect(
      screen.getByRole("textbox", { description: "Ejemplo: a@b.mx Indica un correo válido." }),
    ).toBe(input);
  });

  it("does not accept typing in read-only mode", async () => {
    const user = userEvent.setup();
    render(<TextField label="Código de máquina" defaultValue="ICE24-000145" readOnly />);
    const input = screen.getByRole("textbox", { name: "Código de máquina" }) as HTMLInputElement;
    await user.type(input, "X");
    expect(input.value).toBe("ICE24-000145");
    expect(input.readOnly).toBe(true);
  });

  it("shows a unit next to numeric values", () => {
    render(<TextField label="Capacidad" type="number" suffix="kg" />);
    expect(screen.getByRole("spinbutton", { name: "Capacidad" })).toBeDefined();
    expect(screen.getByText("kg").className).toContain("ids-input-group__affix");
  });
});

describe("TextArea", () => {
  it("counts characters against the limit", async () => {
    const user = userEvent.setup();
    render(<TextArea label="Motivo" maxLength={200} showCount />);
    const area = screen.getByRole("textbox", { name: "Motivo" });
    await user.type(area, "Ajuste");
    expect(screen.getByText("6 de 200 caracteres")).toBeDefined();
    expect(area.getAttribute("aria-describedby")).toContain("-count");
  });
});

describe("Select", () => {
  it("selects with the keyboard and keeps disabled options unavailable", async () => {
    const user = userEvent.setup();
    render(<Select label="Sucursal" options={BRANCHES} placeholder="Selecciona una sucursal" />);
    const select = screen.getByRole("combobox", { name: "Sucursal" }) as HTMLSelectElement;
    await user.selectOptions(select, "gdl");
    expect(select.value).toBe("gdl");
    expect((screen.getByRole("option", { name: "CDMX Sur" }) as HTMLOptionElement).disabled).toBe(
      true,
    );
  });

  it("shows the chosen label in read-only mode and still submits the value", () => {
    const { container } = render(
      <Select label="Sucursal" name="branch" options={BRANCHES} defaultValue="mty" readOnly />,
    );
    const shown = screen.getByRole("textbox", { name: "Sucursal" }) as HTMLInputElement;
    expect(shown.value).toBe("Monterrey Centro");
    expect(shown.readOnly).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe("mty");
  });
});

describe("DateField", () => {
  it("uses the native date picker and states the format", () => {
    const { container } = render(<DateField label="Fecha de servicio" min="2026-01-01" />);
    const input = container.querySelector("input")!;
    expect(input.type).toBe("date");
    expect(input.min).toBe("2026-01-01");
    expect(screen.getByText("Formato DD/MM/AAAA").id).toBe(input.getAttribute("aria-describedby"));
  });
});

describe("form fields accessibility", () => {
  it("has no axe violations in normal, error, read-only and disabled states", async () => {
    const { container } = render(
      <form>
        <TextField label="Nombre" required />
        <TextField label="Correo" error="Indica un correo válido." />
        <TextField label="Código" readOnly defaultValue="ICE24-000145" />
        <TextField label="Folio" disabled />
        <TextArea label="Observaciones" maxLength={500} showCount />
        <Select label="Sucursal" options={BRANCHES} placeholder="Selecciona" />
        <Select label="Sucursal actual" options={BRANCHES} defaultValue="mty" readOnly />
        <DateField label="Fecha de muestreo" required />
      </form>,
    );
    await expectNoAxeViolations(container);
  });
});
