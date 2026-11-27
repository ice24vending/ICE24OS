// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransfersTable, type TransferRow } from "./transfers-table";

afterEach(cleanup);

const rows: TransferRow[] = (
  [
    ["t1", "TRF-PN-0001", "pending", "m1"],
    ["t2", "TRF-PN-0002", "approved", "m2"],
    ["t3", "TRF-PN-0003", "executed", "gone"],
    ["t4", "TRF-PN-0004", "rejected", "m1"],
    ["t5", "TRF-PN-0005", "cancelled", "m2"],
  ] as const
).map(([id, folio, status, machine], index) => ({
  id,
  folio,
  status,
  machine_id: machine,
  row_version: index + 1,
  created_at: `2026-11-${String(20 - index).padStart(2, "0")}T18:00:00Z`,
  data: { reason: `Motivo ${index + 1}` },
}));
const names = new Map([
  ["m1", "Expendedora Centro · PN-001"],
  ["m2", "Expendedora Norte · PN-002"],
]);

describe("TransfersTable (UXD-08)", () => {
  it("lists every state in words, the machine and the reason", () => {
    render(<TransfersTable rows={rows} machineNames={names} canCancel hasMfa cancel={vi.fn()} />);
    const table = screen.getByRole("table", { name: "Transferencias enviadas" });
    for (const text of ["Pendiente", "Aprobada", "Ejecutada", "Rechazada", "Cancelada"])
      expect(within(table).getByText(text)).toBeTruthy();
    expect(within(table).getByText("Ya no pertenece a la cuenta")).toBeTruthy();
    expect(within(table).getAllByText("Expendedora Centro · PN-001")).toHaveLength(2);
    // «Cancelar» only on the pending transfer.
    expect(screen.getAllByRole("button", { name: /^Cancelar transferencia/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cancelar transferencia TRF-PN-0001" })).toBeTruthy();
  });

  it("keeps «Cancelar» disabled without the second factor and absent without permission", () => {
    const { unmount } = render(
      <TransfersTable rows={rows} machineNames={names} canCancel hasMfa={false} cancel={vi.fn()} />,
    );
    expect(
      (screen.getByRole("button", { name: /Cancelar transferencia/ }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    unmount();
    render(
      <TransfersTable rows={rows} machineNames={names} canCancel={false} hasMfa cancel={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: /Cancelar/ })).toBeNull();
  });

  it("asks for a reason and confirmation, then cancels with the row version", async () => {
    const cancel = vi.fn().mockResolvedValue({});
    render(<TransfersTable rows={rows} machineNames={names} canCancel hasMfa cancel={cancel} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Cancelar transferencia TRF-PN-0001" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Cancelar transferencia TRF-PN-0001" });
    await userEvent.type(within(dialog).getByLabelText(/Motivo/), "El cliente conserva la máquina");
    await userEvent.click(within(dialog).getByRole("checkbox"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar transferencia" }));
    expect(cancel).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", row_version: 1 }),
      "El cliente conserva la máquina",
      expect.any(String),
    );
  });

  it("says when there are no transfers", () => {
    render(<TransfersTable rows={[]} machineNames={names} canCancel hasMfa cancel={vi.fn()} />);
    expect(screen.getByText("Sin transferencias")).toBeTruthy();
  });
});
