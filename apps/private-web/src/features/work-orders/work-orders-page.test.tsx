import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  permissions: ["maintenance.orders-read", "maintenance.orders-assign"],
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("redirect");
  }),
}));
vi.mock("../../server/session/session", () => ({
  readBrowserSession: async () => ({ contextId: "context", csrfToken: "csrf" }),
}));
vi.mock("../../server/session/supabase-auth", () => ({ callPrivateApi: mocks.call }));
vi.mock("../../server/account/shell", () => ({
  loadAccountShell: async () => ({
    capabilities: { permissions: mocks.permissions },
    selector: { options: null },
    mode: "ACTIVE",
    userId: "10000000-0000-4000-8000-000000000001",
  }),
}));
import { WorkOrdersPage } from "./work-orders-page";
beforeEach(() => {
  mocks.call.mockReset();
  mocks.permissions = ["maintenance.orders-read", "maintenance.orders-assign"];
});
it.each([{}, { sourceType: "ticket", sourceId: "invalid" }])(
  "guides missing/invalid origin without querying an invalid API path",
  async (query) => {
    const result = await WorkOrdersPage({ mode: "create", query });
    expect(result.props.needsSource).toBe(true);
    expect(result.props.failure).toBeUndefined();
    expect(mocks.call).not.toHaveBeenCalled();
  },
);
it("keeps forbidden creation denied even without origin", async () => {
  mocks.permissions = ["maintenance.orders-read"];
  const result = await WorkOrdersPage({ mode: "create" });
  expect(result.props.failure).toBe("forbidden");
  expect(mocks.call).not.toHaveBeenCalled();
});
it("defaults supervision to pending and technician to assigned with their own id", async () => {
  mocks.call.mockImplementation(async () => Response.json({ items: [], nextCursor: null }));
  expect((await WorkOrdersPage({ mode: "list" })).props.filters.view).toBe("pending");
  mocks.permissions = ["maintenance.orders-read", "maintenance.orders-execute"];
  const result = await WorkOrdersPage({
    mode: "list",
    query: { assigneeId: "10000000-0000-4000-8000-000000000002" },
  });
  expect(result.props.filters.view).toBe("assigned");
  expect(result.props.filters.assigneeId).toBe("10000000-0000-4000-8000-000000000001");
});
