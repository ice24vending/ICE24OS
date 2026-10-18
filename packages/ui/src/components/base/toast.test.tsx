// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Button } from "./button.js";
import { ToastProvider, useToast, type ToastOptions } from "./toast.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Trigger(toast: ToastOptions) {
  const { show } = useToast();
  return <Button onClick={() => show(toast)}>Guardar</Button>;
}

describe("Toast", () => {
  it("renders inside an always-present polite live region", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger
          tone="success"
          title="Registro guardado"
          description="Se actualizó el calendario."
        />
      </ToastProvider>,
    );
    const live = screen.getByRole("status");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(live.textContent).toContain("Registro guardado");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Guardar" }));
  });

  it("closes by itself, but not while hovered or focused", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger title="Cambios guardados" duration={5000} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const toast = screen.getByText("Cambios guardados").closest(".ids-toast")!;
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.queryByText("Cambios guardados")).not.toBeNull();
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByText("Cambios guardados")).toBeNull();
  });

  it("closes with its button and runs its action once", async () => {
    const user = userEvent.setup();
    const undo = vi.fn();
    render(
      <ToastProvider>
        <Trigger
          title="Tarea archivada"
          duration={null}
          action={{ label: "Deshacer", onClick: undo }}
        />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Tarea archivada")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await user.click(screen.getByRole("button", { name: "Cerrar notificación" }));
    expect(screen.queryByText("Tarea archivada")).toBeNull();
  });

  it("has no axe violations with a visible toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger
          tone="warning"
          title="Sin sincronizar"
          description="Se enviará al volver la red."
        />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await expectNoAxeViolations(document.body);
  });
});
