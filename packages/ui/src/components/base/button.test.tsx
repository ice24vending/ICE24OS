// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Button, ButtonLink, IconButton } from "./button.js";

afterEach(cleanup);

describe("Button", () => {
  it("activates with the keyboard (Enter and Space)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar borrador</Button>);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Guardar borrador" }));
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("applies variant and size classes and defaults to type=button", () => {
    render(
      <Button variant="danger" size="lg">
        Eliminar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Eliminar" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("ids-button--danger");
    expect(button.className).toContain("ids-button--lg");
  });

  it("blocks repeated submission while loading and keeps the label", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClick = vi.fn();
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Button type="submit" loading onClick={onClick}>
          Enviar a validación
        </Button>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Enviar a validación (en proceso)" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("explains why it is unavailable and stays focusable", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabledReason="La cuenta está en modo lectura." onClick={onClick}>
        Publicar
      </Button>,
    );
    const button = screen.getByRole("button", {
      name: "Publicar",
      description: "La cuenta está en modo lectura.",
    });
    await user.tab();
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await user.keyboard("{Enter}");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the native disabled state out of the tab order", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Button disabled>Guardar</Button>
        <Button>Cancelar</Button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
  });

  it("names icon-only buttons and hides the icon", () => {
    render(<IconButton icon="close" label="Cerrar aviso" />);
    const button = screen.getByRole("button", { name: "Cerrar aviso" });
    expect(button.className).toContain("ids-button--icon-only");
    expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders navigation as a link styled like a button", () => {
    render(
      <ButtonLink href="/subscription" variant="secondary">
        Ver suscripción
      </ButtonLink>,
    );
    expect(screen.getByRole("link", { name: "Ver suscripción" }).className).toContain(
      "ids-button--secondary",
    );
  });

  it("has no axe violations in every variant and state", async () => {
    const { container } = render(
      <div>
        {(["primary", "secondary", "tertiary", "danger"] as const).map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button loading>Guardando</Button>
        <Button disabledReason="Sin permiso para publicar.">Publicar</Button>
        <IconButton icon="plus" label="Agregar máquina" />
        <ButtonLink href="/">Inicio</ButtonLink>
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
