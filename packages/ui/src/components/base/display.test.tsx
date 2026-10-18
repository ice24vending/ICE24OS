// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Badge, StatusTag } from "./badge.js";
import { Banner, type BannerTone } from "./banner.js";
import { ButtonLink } from "./button.js";
import { Card } from "./card.js";

afterEach(cleanup);

const TONES: readonly BannerTone[] = [
  "info",
  "success",
  "warning",
  "danger",
  "readonly",
  "offline",
  "audit",
];

describe("Banner", () => {
  it("is a region named by its title, with a decorative icon", () => {
    render(
      <Banner
        tone="readonly"
        title="Cuenta en modo lectura"
        actions={<a href="/subscription">Ver suscripción</a>}
      >
        Puedes consultar y descargar información existente.
      </Banner>,
    );
    const region = screen.getByRole("region", { name: "Cuenta en modo lectura" });
    expect(region.getAttribute("data-tone")).toBe("readonly");
    expect(region.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("interrupts only when asked and can be dismissed", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Banner tone="danger" role="alert" onDismiss={onDismiss} title="No fue posible guardar">
        El servicio no respondió.
      </Banner>,
    );
    expect(screen.getByRole("alert")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("StatusTag and Badge", () => {
  it("reads the dimension before the state", () => {
    render(
      <StatusTag tone="danger" dimension="Técnico">
        Crítico
      </StatusTag>,
    );
    expect(screen.getByText("Crítico").textContent).toBe("Técnico: Crítico");
  });

  it("gives a count badge a readable label", () => {
    render(<Badge label="4 pendientes">4</Badge>);
    expect(screen.getByText("4 pendientes").className).toBe("ids-visually-hidden");
  });
});

describe("Card", () => {
  it("is a section named by its title, with actions and footer", () => {
    render(
      <Card
        title="Sucursal norte"
        description="8 máquinas"
        icon="machine"
        actions={<ButtonLink href="/branches/1">Ver sucursal</ButtonLink>}
        footer="Actualizado hace 5 min"
      >
        Contenido
      </Card>,
    );
    expect(screen.getByRole("region", { name: "Sucursal norte" })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: "Sucursal norte" })).toBeDefined();
  });
});

describe("display components accessibility", () => {
  it("has no axe violations in every tone", async () => {
    const { container } = render(
      <main>
        {TONES.map((tone) => (
          <Banner key={tone} tone={tone} title={`Aviso ${tone}`}>
            Texto del aviso.
          </Banner>
        ))}
        {(["success", "warning", "danger", "info", "nodata", "audit", "offline"] as const).map(
          (tone) => (
            <StatusTag key={tone} tone={tone} dimension="Estado">
              {tone}
            </StatusTag>
          ),
        )}
        <StatusTag tone="danger" variant="solid">
          Crítico
        </StatusTag>
        <Card title="Tarjeta" icon="document" tone="info">
          Cuerpo
        </Card>
        <Badge tone="danger" label="2 alertas críticas">
          2
        </Badge>
      </main>,
    );
    await expectNoAxeViolations(container);
  });
});
