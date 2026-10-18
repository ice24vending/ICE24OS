// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Breadcrumbs, NavItem, Pagination, pageWindow } from "./navigation.js";

afterEach(cleanup);

describe("NavItem", () => {
  it("marks the current destination and names its counter", () => {
    render(
      <nav aria-label="Principal" className="ids-inverse">
        <NavItem href="/machines" label="Máquinas" icon="machine" current />
        <NavItem
          href="/maintenance"
          label="Mantenimiento"
          badge={4}
          badgeLabel="4 órdenes pendientes"
        />
      </nav>,
    );
    expect(screen.getByRole("link", { current: "page" }).textContent).toBe("Máquinas");
    expect(screen.getByRole("link", { name: "Mantenimiento 4 órdenes pendientes" })).toBeDefined();
  });

  it("keeps the label as the name when the sidebar is collapsed", () => {
    render(<NavItem href="/" label="Resumen" icon="home" collapsed />);
    expect(screen.getByRole("link", { name: "Resumen" })).toBeDefined();
  });
});

describe("Breadcrumbs", () => {
  it("is an ordered path whose last item is the current page", () => {
    render(
      <Breadcrumbs
        items={[
          { label: "Máquinas", href: "/machines" },
          { label: "Equipo 1", href: "/machines/1" },
          { label: "Mantenimiento" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Ruta de navegación" });
    expect(nav.querySelector("ol")?.children).toHaveLength(3);
    expect(screen.getByText("Mantenimiento").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Equipo 1" }).closest("li")?.className).toContain(
      "--parent",
    );
  });
});

describe("Pagination", () => {
  it("computes a compact page window", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(10, 10)).toEqual([1, null, 9, 10]);
  });

  it("moves between pages with buttons and marks the current one", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={1}
        pageCount={5}
        totalItems={42}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText("Mostrando 1–10 de 42")).toBeDefined();
    expect(
      (screen.getByRole("button", { name: "Anterior página" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe("Página 1");
    await user.click(screen.getByRole("button", { name: "Siguiente página" }));
    await user.click(screen.getByRole("button", { name: "Página 5" }));
    expect(onPageChange.mock.calls).toEqual([[2], [5]]);
  });

  it("renders links for URL state and supports cursor lists", () => {
    const { rerender } = render(
      <Pagination page={2} pageCount={3} getHref={(page) => `?page=${page}`} />,
    );
    expect(screen.getByRole("link", { name: "Página 3" }).getAttribute("href")).toBe("?page=3");
    rerender(<Pagination page={1} hasNextPage onPageChange={() => undefined} />);
    expect(screen.queryByRole("button", { name: /^Página \d/ })).toBeNull();
    expect(
      (screen.getByRole("button", { name: "Siguiente página" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});

describe("navigation accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <div>
        <nav aria-label="Principal">
          <ul>
            <li>
              <NavItem href="/" label="Resumen" icon="home" current />
            </li>
            <li>
              <NavItem href="/alerts" label="Alertas" icon="bell" badge={2} variant="bottom" />
            </li>
          </ul>
        </nav>
        <Breadcrumbs items={[{ label: "Sanidad", href: "/" }, { label: "No conformidades" }]} />
        <Pagination page={3} pageCount={9} onPageChange={() => undefined} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
