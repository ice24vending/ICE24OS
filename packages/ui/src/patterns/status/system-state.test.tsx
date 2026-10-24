// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "../../components/base/axe.test-utils.js";
import {
  Skeleton,
  SYSTEM_STATE_TITLES,
  SystemState,
  type SystemStateKind,
} from "./system-state.js";

afterEach(cleanup);

const KINDS = Object.keys(SYSTEM_STATE_TITLES) as SystemStateKind[];

describe("SystemState", () => {
  it.each(KINDS)("renders %s with its title, live role and data-state", (kind) => {
    render(<SystemState kind={kind} />);
    const quiet = kind === "loading" || kind === "empty";
    const region = screen.getByRole(quiet ? "status" : "alert");
    expect(region).toHaveProperty("dataset.state", kind);
    expect(region.getAttribute("aria-labelledby")).toBeTruthy();
    expect(region.textContent).toContain(SYSTEM_STATE_TITLES[kind]);
  });

  it("marks loading as busy and keeps the title for screen readers behind the skeleton", () => {
    render(<SystemState kind="loading" title="Cargando máquinas…" skeleton="list" />);
    const region = screen.getByRole("status", { name: "Cargando máquinas…" });
    expect(region.getAttribute("aria-busy")).toBe("true");
    expect(region.querySelector(".ids-skeleton-block")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows the support reference of a failed operation", () => {
    render(<SystemState kind="error" correlationId="c0ffee00-0000-4000-8000-000000000999" />);
    expect(screen.getByText("c0ffee00-0000-4000-8000-000000000999").tagName).toBe("CODE");
    expect(screen.getByRole("alert").textContent).toContain("Folio para soporte");
  });

  it("retries once and ignores taps while the retry is running", async () => {
    const retry = vi.fn();
    const { rerender } = render(<SystemState kind="error" onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(retry).toHaveBeenCalledOnce();
    rerender(<SystemState kind="error" onRetry={retry} retrying />);
    await userEvent.click(screen.getByRole("button", { name: /Reintentando/ }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("offers the next action of an empty state", () => {
    render(
      <SystemState
        kind="empty"
        title="Aún no hay máquinas activas en esta cuenta."
        action={<a href="/solicitar">Solicitar alta de equipo</a>}
      />,
    );
    expect(screen.getByRole("link", { name: "Solicitar alta de equipo" })).toBeTruthy();
  });

  it("explains a conflict without suggesting an overwrite", () => {
    render(<SystemState kind="conflict" />);
    expect(screen.getByRole("alert").textContent).toContain("No se sobrescribió nada");
  });

  it("has no axe violations in its failure and loading forms", async () => {
    const { container } = render(
      <>
        <SystemState kind="error" correlationId="c0ffee00" onRetry={() => undefined} />
        <SystemState kind="loading" skeleton="cards" />
        <SystemState kind="offline" />
      </>,
    );
    await expectNoAxeViolations(container);
  });
});

describe("Skeleton", () => {
  it("draws the requested number of decorative rows", () => {
    const { container } = render(<Skeleton variant="form" rows={4} />);
    const block = container.querySelector(".ids-skeleton-block--form");
    expect(block?.getAttribute("aria-hidden")).toBe("true");
    expect(block?.querySelectorAll(".ids-skeleton-block__item")).toHaveLength(4);
  });
});
