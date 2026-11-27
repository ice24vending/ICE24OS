// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TicketsScreen } from "./tickets-screen";
vi.mock("../context/unsaved-changes", () => ({
  useUnsavedChanges: () => {},
  discardUnsavedChanges: () => {},
}));
vi.mock("../../components/use-restore-focus", () => ({ useRestoreFocus: () => () => {} }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const machine = "c0000000-0000-4000-8000-000000000001";
const system = "60000000-0000-4000-8000-000000000001";
const props = {
  contextId: "context",
  csrfToken: "csrf",
  canCreate: true,
  canUpload: true,
  machines: [{ id: machine, label: "Máquina Centro" }],
};
it("explains disabled fields and changes the button as requirements are completed", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ systems: [{ id: system, name: "Refrigeración" }], components: [] }),
      ),
  );
  render(<TicketsScreen {...props} />);
  expect(screen.getByText("Elige primero la máquina", { selector: "p" })).toBeTruthy();
  expect(
    (screen.getByRole("group", { name: "Datos del reporte" }) as HTMLFieldSetElement).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Máquina" }), {
    target: { value: machine },
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Elige el sistema" })).toBeTruthy(),
  );
  expect(screen.getByRole("button", { name: "Seleccionar foto" })).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox", { name: "Sistema" }), {
    target: { value: system },
  });
  expect(
    screen.getByRole("button", { name: "Describe la falla (mínimo 10 caracteres)" }),
  ).toBeTruthy();
  fireEvent.change(screen.getByLabelText("¿Qué falla observaste?"), {
    target: { value: "No enciende el compresor desde ayer." },
  });
  expect(
    (screen.getByRole("button", { name: "Reportar falla" }) as HTMLButtonElement).disabled,
  ).toBe(false);
});
it("does not show a report form or photo upload without create permission", () => {
  render(<TicketsScreen {...props} canCreate={false} canUpload={false} />);
  expect(screen.queryByRole("combobox", { name: "Máquina" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Seleccionar foto" })).toBeNull();
});
