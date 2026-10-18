// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Checkbox, RadioGroup, Switch } from "./choice.js";

afterEach(cleanup);

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual", description: "Recomendada por fábrica" },
  { value: "quarterly", label: "Trimestral" },
];

describe("Checkbox", () => {
  it("toggles with Space and clicking its label", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Confirmo la revisión" />);
    const box = screen.getByRole("checkbox", { name: "Confirmo la revisión" }) as HTMLInputElement;
    await user.tab();
    await user.keyboard(" ");
    expect(box.checked).toBe(true);
    await user.click(screen.getByText("Confirmo la revisión"));
    expect(box.checked).toBe(false);
  });

  it("does not change in read-only mode and says so", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Revisado" defaultChecked readOnly onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Revisado" }) as HTMLInputElement;
    expect(box.getAttribute("aria-readonly")).toBe("true");
    await user.click(box);
    await user.keyboard(" ");
    expect(box.checked).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the mixed state and errors", () => {
    render(<Checkbox label="Todas" indeterminate error="Selecciona al menos una." />);
    const box = screen.getByRole("checkbox", { name: "Todas" }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("checkbox", { description: "Selecciona al menos una." })).toBe(box);
  });
});

describe("RadioGroup", () => {
  it("is a named radio group with a description per option", () => {
    render(<RadioGroup label="Frecuencia" name="frequency" options={FREQUENCIES} required />);
    const group = screen.getByRole("radiogroup", { name: "Frecuencia" });
    expect(group.getAttribute("aria-required")).toBe("true");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(
      screen.getByRole("radio", { name: "Mensual", description: "Recomendada por fábrica" }),
    ).toBeDefined();
  });

  it("reports the chosen value when controlled", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    function Controlled() {
      const [value, setValue] = useState("weekly");
      return (
        <RadioGroup
          label="Frecuencia"
          name="frequency"
          options={FREQUENCIES}
          value={value}
          onChange={(next) => {
            seen.push(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "Trimestral" }));
    expect(seen).toEqual(["quarterly"]);
    expect((screen.getByRole("radio", { name: "Trimestral" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("ignores clicks and arrow keys when read-only", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup
        label="Frecuencia"
        name="frequency"
        options={FREQUENCIES}
        defaultValue="weekly"
        readOnly
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("radiogroup").getAttribute("aria-readonly")).toBe("true");
    await user.click(screen.getByRole("radio", { name: "Mensual" }));
    expect((screen.getByRole("radio", { name: "Semanal" }) as HTMLInputElement).checked).toBe(true);
    const arrow = fireEvent.keyDown(screen.getByRole("radio", { name: "Semanal" }), {
      key: "ArrowDown",
    });
    expect(arrow).toBe(false); // default prevented
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Switch", () => {
  it("exposes the switch role and toggles with Space", async () => {
    const user = userEvent.setup();
    render(<Switch label="Avisos por correo" />);
    const control = screen.getByRole("switch", { name: "Avisos por correo" }) as HTMLInputElement;
    await user.tab();
    await user.keyboard(" ");
    expect(control.checked).toBe(true);
  });

  it("does not toggle when read-only", async () => {
    const user = userEvent.setup();
    render(<Switch label="Modo mantenimiento" readOnly />);
    const control = screen.getByRole("switch") as HTMLInputElement;
    await user.click(control);
    expect(control.checked).toBe(false);
  });
});

describe("choice controls accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <form>
        <Checkbox label="Acepto" required />
        <Checkbox label="Revisado" readOnly defaultChecked />
        <Checkbox label="Sin acceso" disabled help="Solo el propietario puede cambiarlo." />
        <RadioGroup label="Frecuencia" name="f" options={FREQUENCIES} error="Elige una." />
        <RadioGroup
          label="Unidad"
          name="u"
          orientation="horizontal"
          options={FREQUENCIES}
          readOnly
          defaultValue="monthly"
        />
        <Switch label="Avisos" help="Se aplica de inmediato." />
        <Switch label="Bloqueado" readOnly defaultChecked />
      </form>,
    );
    await expectNoAxeViolations(container);
  });
});
