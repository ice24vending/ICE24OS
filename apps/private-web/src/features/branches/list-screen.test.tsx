// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/branches",
  useSearchParams: () => new URLSearchParams("q=centro"),
  useRouter: () => navigation,
}));
import { BranchList } from "./list-screen";
import { branch } from "./test-fixture";
afterEach(cleanup);
describe("branch list", () => {
  it("links each row to its detail with the filtered origin and a focus target", () => {
    render(
      <BranchList rows={[branch]} canCreate refresh={vi.fn()} loading={false} updatedAt="12:00" />,
    );
    const link = screen.getByRole("link", { name: "Centro Monterrey" });
    expect(link.getAttribute("href")).toContain("origen=%2Fbranches%3Fq%3Dcentro");
    expect(link.id).toBe(`fila-${branch.id}`);
    expect(screen.getByRole("link", { name: "Nueva sucursal" })).toBeTruthy();
  });
  it("hides creation without permission and announces a view change once", async () => {
    render(
      <BranchList
        rows={[branch]}
        canCreate={false}
        refresh={vi.fn()}
        loading={false}
        updatedAt=""
      />,
    );
    expect(screen.queryByRole("link", { name: "Nueva sucursal" })).toBeNull();
    await userEvent.setup().click(screen.getByRole("radio", { name: "Bloques" }));
    expect(screen.getAllByText("Vista de bloques.")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Sucursales en bloques" })).toBeTruthy();
  });
});
