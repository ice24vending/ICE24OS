// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DownloadedOrders } from "./downloaded-orders";
const mocks = vi.hoisted(() => ({ rows: vi.fn(async () => []), verify: vi.fn(async () => {}) }));
vi.mock("./local-orders", () => ({
  offlineDb: { orders: { where: () => ({ equals: () => ({ toArray: mocks.rows }) }) } },
  readLocalOrder: vi.fn(),
}));
vi.mock("./lifecycle", () => ({ verifyOfflineAccess: mocks.verify, PURGED_EVENT: "purged" }));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("reads the verified tab scope without asking the network while offline", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  sessionStorage.setItem(
    "ice24-offline-scope",
    JSON.stringify({
      accountId: "10000000-0000-4000-8000-000000000001",
      userId: "10000000-0000-4000-8000-000000000002",
      expiresAt: Date.now() + 60000,
    }),
  );
  render(<DownloadedOrders />);
  await screen.findByText(/Aún no has descargado órdenes/);
  expect(mocks.rows).toHaveBeenCalledOnce();
  expect(fetch).not.toHaveBeenCalled();
});
it("does not read storage without a verified tab scope", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<DownloadedOrders />);
  await screen.findByText(/Reconecta e inicia sesión/);
  expect(mocks.rows).not.toHaveBeenCalled();
});
it("asks for the current session when online and never reads on denial", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  const fetch = vi.fn(async () => ({ ok: false }));
  vi.stubGlobal("fetch", fetch);
  render(<DownloadedOrders />);
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await screen.findByText(/Inicia sesión como el técnico asignado/);
  expect(mocks.rows).not.toHaveBeenCalled();
});

it("uses a valid tab scope when the OS reports online but transport fails", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }),
  );
  sessionStorage.setItem(
    "ice24-offline-scope",
    JSON.stringify({
      accountId: "10000000-0000-4000-8000-000000000001",
      userId: "10000000-0000-4000-8000-000000000002",
      expiresAt: Date.now() + 60000,
    }),
  );
  render(<DownloadedOrders />);
  await screen.findByText(/Aún no has descargado órdenes/);
  expect(mocks.rows).toHaveBeenCalledOnce();
});

it("shows only expiry and scoped count, never availability, for an expired hint", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  sessionStorage.setItem(
    "ice24-offline-scope",
    JSON.stringify({
      accountId: "10000000-0000-4000-8000-000000000001",
      userId: "10000000-0000-4000-8000-000000000002",
      expiresAt: 1,
    }),
  );
  render(<DownloadedOrders />);
  await screen.findByRole("heading", { name: "Tu acceso sin conexión venció" });
  expect(screen.queryByText(/siguen disponibles/)).toBeNull();
  expect(screen.queryByRole("link", { name: "Trabajar sin conexión" })).toBeNull();
});

it("keeps verified local downloads on a 503 without interpreting it as revoked access", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: false, status: 503 })),
  );
  sessionStorage.setItem(
    "ice24-offline-scope",
    JSON.stringify({
      accountId: "10000000-0000-4000-8000-000000000001",
      userId: "10000000-0000-4000-8000-000000000002",
      expiresAt: Date.now() + 60000,
    }),
  );
  render(<DownloadedOrders />);
  await screen.findByText(/Aún no has descargado órdenes/);
  expect(mocks.rows).toHaveBeenCalledOnce();
  expect(screen.queryByText(/Inicia sesión como/)).toBeNull();
});

it("keeps expiry feedback after cleanup removes the encrypted rows", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const owner = {
    accountId: "10000000-0000-4000-8000-000000000001",
    userId: "10000000-0000-4000-8000-000000000002",
  };
  sessionStorage.setItem(
    "ice24-offline-scope",
    JSON.stringify({ ...owner, expiresAt: Date.now() + 60000 }),
  );
  sessionStorage.setItem(
    "ice24-offline-expiry",
    JSON.stringify({ ...owner, count: 3, at: Date.now() }),
  );
  render(<DownloadedOrders />);
  await screen.findByRole("heading", { name: "Tu acceso sin conexión venció" });
  expect(screen.getByText(/3 órdenes guardadas/)).toBeDefined();
  expect(screen.queryByText(/Aún no has descargado/)).toBeNull();
  expect(screen.queryByText(/siguen disponibles/)).toBeNull();
});
