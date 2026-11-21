// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { expectNoAxeViolations } from "../../components/base/axe.test-utils.js";
import { PageWidth } from "./page-width.js";

afterEach(cleanup);

describe("PageWidth", () => {
  it("preserves the page landmark and heading when changing width", async () => {
    const content = <h1>Suscripción</h1>;
    const { container, rerender } = render(
      <PageWidth as="main" aria-label="Suscripción" id="main-content">
        {content}
      </PageWidth>,
    );
    const main = screen.getByRole("main", { name: "Suscripción" });
    expect(main.id).toBe("main-content");
    expect(main.classList.contains("ids-page-width--full")).toBe(true);
    rerender(
      <PageWidth as="main" aria-label="Suscripción" variant="reading">
        {content}
      </PageWidth>,
    );
    expect(screen.getByRole("main", { name: "Suscripción" })).toBe(main);
    expect(main.classList.contains("ids-page-width--reading")).toBe(true);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    await expectNoAxeViolations(container);
  });

  it("allows a readable section without adding another main landmark", () => {
    render(
      <main>
        <PageWidth variant="reading" role="region" aria-label="Datos del plan">
          Plan vigente
        </PageWidth>
      </main>,
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Datos del plan" }).textContent).toBe("Plan vigente");
  });
});
