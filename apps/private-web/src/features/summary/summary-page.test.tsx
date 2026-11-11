import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../server/session/session", () => ({
  readBrowserSession: async () => ({ contextId: "context", csrfToken: "csrf" }),
}));
vi.mock("../../server/session/supabase-auth", () => ({ callPrivateApi: mocks.call }));
vi.mock("../../server/account/shell", () => ({
  guardDestination: async () => null,
  loadAccountShell: async () => ({
    capabilities: { permissions: ["maintenance.read", "maintenance.orders-read"] },
  }),
}));
vi.mock("../../server/demo/session", () => ({ demoStateOf: () => null }));
import SummaryPage from "../../app/(account)/summary/page";
it("starts tasks alongside machines, alerts and the maintenance summary before any response resolves", async () => {
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  mocks.call.mockImplementation(async () => {
    await barrier;
    return new Response(null, { status: 503 });
  });
  const page = SummaryPage();
  await vi.waitFor(() => expect(mocks.call).toHaveBeenCalledTimes(16));
  const paths = mocks.call.mock.calls.map(([path]) => String(path));
  expect(paths).toContain("machines");
  expect(paths).toContain("notifications/summary");
  expect(paths.some((path) => path.startsWith("maintenance/summary?"))).toBe(true);
  expect(paths.filter((path) => path.startsWith("work-orders?"))).toHaveLength(6);
  release();
  expect((await page).props.maintenanceTasks).toBeNull();
});
