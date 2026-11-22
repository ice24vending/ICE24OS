// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BranchForm } from "./branch-form";
import { branch } from "./test-fixture";
import { FailureError } from "../../components/system-state/failure";
import { hasUnsavedChanges } from "../context/unsaved-changes";
afterEach(cleanup);
describe("branch form", () => {
  it("reviews the current version without replacing the draft and retries only changed fields", async () => {
    const newer = { ...branch, row_version: 4, data: { ...branch.data, city: "Guadalupe" } };
    const send = vi
      .fn()
      .mockRejectedValueOnce(
        new FailureError({ kind: "conflict", status: 409, message: "La versión cambió." }),
      )
      .mockResolvedValue(newer);
    const get = vi.fn().mockResolvedValue(newer);
    render(
      <BranchForm branch={branch} client={{ get, send }} backHref="/branches" onSaved={vi.fn()} />,
    );
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Notas"));
    await user.type(screen.getByLabelText("Notas"), "Entrega por la puerta sur");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await user.click(await screen.findByRole("button", { name: "Revisar versión actual" }));
    expect(await screen.findByText("Guadalupe")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Continuar con mis cambios" }));
    expect((screen.getByLabelText("Notas") as HTMLTextAreaElement).value).toBe(
      "Entrega por la puerta sur",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(send).toHaveBeenLastCalledWith(
      `branches/${branch.id}`,
      { notes: "Entrega por la puerta sur" },
      expect.objectContaining({ version: 4 }),
    );
    expect(send.mock.calls[0]![2].key).not.toBe(send.mock.calls[1]![2].key);
  });
  it("sends only changed fields with If-Match and keeps complementary fields", async () => {
    const send = vi.fn().mockResolvedValue(branch);
    const saved = vi.fn();
    render(
      <BranchForm
        branch={branch}
        client={{ get: vi.fn(), send }}
        backHref="/branches"
        onSaved={saved}
      />,
    );
    await userEvent.setup().type(screen.getByLabelText("Nombre", { exact: false }), " editado");
    expect(hasUnsavedChanges()).toBe(true);
    await userEvent.setup().click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(send).toHaveBeenCalledWith(
      `branches/${branch.id}`,
      { name: "Centro Monterrey editado" },
      expect.objectContaining({ method: "PATCH", version: 3 }),
    );
    expect(hasUnsavedChanges()).toBe(false);
  });
  it("retains typed values and dirty state on conflicts, and confirms discard", async () => {
    const cancel = vi.fn();
    const send = vi.fn().mockRejectedValue(
      new FailureError({
        kind: "conflict",
        status: 409,
        message: "Otra persona cambió este registro.",
      }),
    );
    render(
      <BranchForm
        branch={branch}
        client={{ get: vi.fn(), send }}
        backHref="/branches"
        onSaved={vi.fn()}
        onCancel={cancel}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Notas"), " Conserva esto.");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByText("Tus cambios siguen en el formulario")).toBeTruthy();
    expect((screen.getByLabelText("Notas") as HTMLTextAreaElement).value).toContain(
      "Conserva esto.",
    );
    expect(hasUnsavedChanges()).toBe(true);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(cancel).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    expect(cancel).toHaveBeenCalledOnce();
  });
});
