// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSummary } from "./account-summary";
import { planLabel } from "./account-model";
import type { EquipmentClient } from "./configuration-client";

afterEach(cleanup);

const row = {
  id: "account-a",
  name: "Hielo Polar",
  row_version: 3,
  access_mode: "ACTIVE",
  created_at: "2025-09-15T18:00:00Z",
  details: {
    displayName: "Hielo Polar",
    legalName: "Hielo Polar del Norte, S.A. de C.V.",
    timezone: "America/Monterrey",
    currency: "MXN",
    contact: { email: "contacto@polar.test", phone: "+52 81 5550 1200" },
    taxProfile: { taxId: "HPN240115AB1", fiscalAddress: "Av. Juárez 1200, Monterrey" },
    moduleConfiguration: {
      maintenance: true,
      sanitation: false,
      inventory: true,
      commercial: false,
    },
  },
};
const modules = {
  accountId: "11111111-1111-4111-8111-111111111111",
  version: 1,
  modules: [
    { code: "equipment" as const, enabled: true },
    { code: "files" as const, enabled: false },
    { code: "maintenance" as const, enabled: true },
  ],
};
const client = (send = vi.fn()) => ({ get: vi.fn(), send }) as unknown as EquipmentClient;

describe("AccountSummary (UXD-08)", () => {
  it("shows the account data without expanding anything, and the real modules read-only", () => {
    render(
      <AccountSummary
        row={row}
        modules={modules}
        plan="Mensual · $399.00 MXN"
        client={client()}
        canEdit
        onSaved={vi.fn()}
      />,
    );
    const data = screen.getByRole("region", { name: "Datos de la cuenta" });
    for (const text of [
      "Activa",
      "Hielo Polar del Norte, S.A. de C.V.",
      "HPN240115AB1",
      "contacto@polar.test",
      "+52 81 5550 1200",
      "Av. Juárez 1200, Monterrey",
      "America/Monterrey",
      "15 de septiembre de 2025",
      "Mensual · $399.00 MXN",
    ])
      expect(within(data).getByText(text)).toBeTruthy();
    expect(document.querySelector("details")).toBeNull();
    const list = within(screen.getByRole("region", { name: "Módulos contratados" }));
    expect(list.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^Equipos.*Activo$/),
      expect.stringMatching(/^Archivos.*Desactivado por ICE24$/),
      expect.stringMatching(/^Mantenimiento.*Activo$/),
    ]);
    // The decorative flags of the account details are no longer shown, nor anything to toggle.
    for (const gone of ["Sanidad", "Inventario", "Comercial"])
      expect(screen.queryByText(gone)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("hides «Editar» without permission and explains a failed module read", () => {
    render(
      <AccountSummary
        row={row}
        modules={null}
        plan={null}
        client={client()}
        canEdit={false}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByText("Plan")).toBeNull();
    expect(screen.getByText(/No fue posible consultar los módulos/)).toBeTruthy();
  });

  it("saves through PATCH with If-Match, keeping the stored module flags", async () => {
    const send = vi.fn().mockResolvedValue({});
    const onSaved = vi.fn();
    render(
      <AccountSummary
        row={row}
        modules={modules}
        plan={null}
        client={client(send)}
        canEdit
        onSaved={onSaved}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const phone = screen.getByLabelText("Teléfono de contacto");
    await userEvent.clear(phone);
    await userEvent.type(phone, "+52 81 5550 9999");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(send).toHaveBeenCalledWith(
      "accounts/account-a",
      {
        displayName: "Hielo Polar",
        legalName: "Hielo Polar del Norte, S.A. de C.V.",
        timezone: "America/Monterrey",
        currency: "MXN",
        contact: { email: "contacto@polar.test", phone: "+52 81 5550 9999" },
        taxProfile: { taxId: "HPN240115AB1", fiscalAddress: "Av. Juárez 1200, Monterrey" },
        moduleConfiguration: row.details.moduleConfiguration,
      },
      expect.objectContaining({ method: "PATCH", version: 3 }),
    );
    expect(onSaved).toHaveBeenCalled();
    expect(await screen.findByText("Datos de la cuenta guardados.")).toBeTruthy();
  });

  it("names the plan without internal codes", () => {
    const price = { amountMinor: 39_900, currency: "MXN" as const };
    expect(planLabel({ planCode: "ICE24_MONTHLY", price })).toBe("Mensual · $399.00 MXN");
    expect(planLabel({ planCode: "OTRO", price })).toBe("ICE24 · $399.00 MXN");
  });
});
