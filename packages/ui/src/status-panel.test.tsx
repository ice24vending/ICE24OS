// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { expectNoAxeViolations } from "./components/base/axe.test-utils.js";
import { StatusPanel } from "./status-panel.js";

afterEach(cleanup);

describe("StatusPanel (legacy)", () => {
  it("is a region named by its title, even when the title has spaces", async () => {
    const { container } = render(
      <main>
        <StatusPanel title="Sincronización pendiente" tone="info">
          Hay 2 registros esperando conexión.
        </StatusPanel>
        <StatusPanel title="No fue posible cargar" tone="danger" role="alert">
          El servicio no respondió.
        </StatusPanel>
      </main>,
    );
    expect(screen.getByRole("region", { name: "Sincronización pendiente" })).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("El servicio no respondió.");
    await expectNoAxeViolations(container);
  });
});
