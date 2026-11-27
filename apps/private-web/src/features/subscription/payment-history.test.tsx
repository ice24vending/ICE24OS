// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentHistory } from "./payment-history";
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const props = { contextId: "context", csrfToken: "csrf", canManage: true, canOpenPortal: true };
it("keeps the error local, exposes the support reference and retries", () => {
  render(
    <PaymentHistory
      {...props}
      failure={{
        kind: "error",
        status: 503,
        message: "No fue posible consultar el historial de pagos.",
        correlationId: "c0ffee00-0000-4000-8000-0000000003e7",
      }}
    />,
  );
  expect(screen.getByText(/c0ffee00/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(refresh).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Ver todas las facturas" })).toBeTruthy();
});
it("does not expose billing actions to a reader", () => {
  render(<PaymentHistory {...props} canManage={false} />);
  expect(screen.queryByRole("button", { name: "Ver todas las facturas" })).toBeNull();
});
it("shows an empty history independently of the plan", () => {
  render(<PaymentHistory {...props} payments={{ items: [] }} />);
  expect(screen.getByText("Sin pagos registrados")).toBeTruthy();
});
