// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}));
import { BranchDetailScreen } from "./detail-screen";
import { branch } from "./test-fixture";
afterEach(cleanup);
it("shows details immediately and offers no editing without permission", async () => {
  render(
    <BranchDetailScreen
      detail={{ branch, machines: [] }}
      create={false}
      canEdit={false}
      loading={false}
      client={{ get: vi.fn().mockResolvedValue({ items: [], nextCursor: null }), send: vi.fn() }}
      refresh={vi.fn()}
    />,
  );
  expect(screen.getByText("Juárez 1200")).toBeTruthy();
  expect(screen.getByText("Acceso lateral")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  expect(screen.getByRole("link", { name: "Volver a Sucursales" }).getAttribute("href")).toContain(
    "volverA=fila-",
  );
  expect(await screen.findByText("Sin mantenimientos próximos")).toBeTruthy();
});
