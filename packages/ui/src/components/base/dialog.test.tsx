// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Button } from "./button.js";
import { Dialog, type DialogProps } from "./dialog.js";
import { TextField } from "./field.js";

afterEach(cleanup);

function Example(props: Partial<DialogProps>) {
  const [open, setOpen] = useState(false);
  return (
    <main>
      <Button onClick={() => setOpen(true)}>Retirar máquina</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Retirar máquina"
        description="La máquina deja de aparecer en la operación. El historial se conserva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger">Retirar</Button>
          </>
        }
        {...props}
      >
        <TextField label="Motivo" required />
      </Dialog>
    </main>
  );
}

describe("Dialog", () => {
  it("opens from the keyboard, moves focus inside and is modal", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    await user.tab();
    await user.keyboard("{Enter}");
    const dialog = screen.getByRole("dialog", {
      name: "Retirar máquina",
      description: "La máquina deja de aparecer en la operación. El historial se conserva.",
    });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Motivo" }));
    // The rest of the page (the render container, a sibling of the portal) is inert.
    expect(container.inert).toBe(true);
  });

  it("keeps Tab and Shift+Tab inside", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Retirar máquina" }));
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retirar" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar" }));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retirar" }));
  });

  it("closes with Escape and returns focus to the opener", async () => {
    const user = userEvent.setup();
    const { container } = render(<Example />);
    const opener = screen.getByRole("button", { name: "Retirar máquina" });
    await user.click(opener);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(container.inert).toBe(false);
  });

  it("cannot be dismissed while an action is running", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Guardando" dismissible={false}>
        <p>Espera a que termine.</p>
      </Dialog>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  it("supports alertdialog for sensitive confirmations", async () => {
    render(
      <Dialog open onClose={() => undefined} role="alertdialog" title="¿Publicar el documento?">
        <p>El documento será visible en el portal público.</p>
      </Dialog>,
    );
    expect(screen.getByRole("alertdialog", { name: "¿Publicar el documento?" })).toBeDefined();
    await expectNoAxeViolations(document.body);
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Retirar máquina" }));
    await expectNoAxeViolations(document.body);
  });
});
