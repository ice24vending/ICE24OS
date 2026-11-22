import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  capabilities: { permissions: ["maintenance.read", "maintenance.orders-read"] } as object | null,
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("../../server/session/session", () => ({
  readBrowserSession: async () => ({ contextId: "context", csrfToken: "csrf" }),
}));
vi.mock("../../server/session/supabase-auth", () => ({ callPrivateApi: mocks.call }));
vi.mock("../../server/account/shell", () => ({
  guardDestination: async () => null,
  loadAccountShell: async () => ({ capabilities: mocks.capabilities }),
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
  await vi.waitFor(() => expect(mocks.call).toHaveBeenCalledTimes(4));
  const paths = mocks.call.mock.calls.map(([path]) => String(path));
  expect(paths).toContain("machines?limit=100");
  expect(paths.some((path) => path.startsWith("maintenance/activities?"))).toBe(true);
  expect(paths.filter((path) => path.startsWith("work-orders?"))).toHaveLength(1);
  release();
  expect((await page).props.data.tasks).toBeNull();
});

it("reports unknown capabilities as a failed task query, never as missing permission (SR-05 C5)", async () => {
  mocks.capabilities = null;
  mocks.call.mockResolvedValue(new Response(null, { status: 503 }));
  const { props } = await SummaryPage();
  mocks.capabilities = { permissions: ["maintenance.read", "maintenance.orders-read"] };
  expect(props.data.activities.denied).toBe(false);
  expect(props.data.tasks).toBeNull();
});
