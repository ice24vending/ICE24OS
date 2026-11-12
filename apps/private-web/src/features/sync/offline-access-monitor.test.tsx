// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OfflineAccessMonitor } from "./offline-access-monitor";
const lifecycle = vi.hoisted(() => ({
  notify: undefined as ((count: number) => void) | undefined,
}));
vi.mock("./lifecycle", () => ({
  watchOfflineAccess: (_owner: unknown, notify: (count: number) => void) => {
    lifecycle.notify = notify;
    return () => {
      lifecycle.notify = undefined;
    };
  },
}));
afterEach(cleanup);
it("mounts before access changes and announces local removal in the same node", () => {
  render(<OfflineAccessMonitor accountId="account" userId="technician" />);
  const region = screen.getByRole("alert");
  expect(region.textContent).toBe("");
  act(() => lifecycle.notify?.(2));
  expect(screen.getByRole("alert")).toBe(region);
  expect(region.textContent).toContain("2 operaciones pendientes");
  expect(region.textContent).toContain("Las versiones del servidor se conservan");
});
