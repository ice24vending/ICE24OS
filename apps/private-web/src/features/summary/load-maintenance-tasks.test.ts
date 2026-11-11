import { expect, it, vi } from "vitest";
import { loadMaintenanceTasks } from "./load-maintenance-tasks";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const order = (n: number, state: string) => ({
  id: id(n),
  folio: `OT-${n}`,
  machineId: id(80),
  machineCode: "ICE24",
  branchId: id(81),
  sourceType: "ticket",
  sourceId: id(82),
  ticketId: id(82),
  activityId: null,
  assigneeId: id(83),
  assigneeName: "Ana",
  templateId: id(84),
  templateVersion: 1,
  definition: demoOrderDefinition,
  state,
  dueAt: `2026-11-${String(10 + n).padStart(2, "0")}T00:00:00Z`,
  alertAt: null,
  rowVersion: 1,
  createdAt: "2026-11-01T00:00:00Z",
});
it("bounds every active stream at three pages even when cursors never end, preserving urgency", async () => {
  const counts = new Map<string, number>();
  const call = vi.fn(async (path: string) => {
    const url = new URL(path, "https://test.invalid/");
    const state = url.searchParams.get("state")!;
    const page = (counts.get(state) ?? 0) + 1;
    counts.set(state, page);
    expect(url.searchParams.get("assigneeId")).toBe(id(83));
    expect(url.searchParams.get("limit")).toBe("100");
    return Response.json({ items: [order(page, state)], nextCursor: id(page) });
  });
  const result = await loadMaintenanceTasks(call, {
    filters: new URLSearchParams(),
    readOrders: true,
    technicianId: id(83),
  });
  expect(call).toHaveBeenCalledTimes(18);
  expect([...counts.values()]).toEqual([3, 3, 3, 3, 3, 3]);
  expect(counts.has("completed")).toBe(false);
  expect(result.map((row) => row.state)).toEqual([
    "overdue",
    "overdue",
    "overdue",
    "nonconforming",
    "nonconforming",
  ]);
  expect(result.slice(0, 3).map((row) => row.dueAt)).toEqual(
    [11, 12, 13].map((day) => `2026-11-${day}T00:00:00Z`),
  );
});
it("starts orders and activities concurrently and stops empty streams after one page", async () => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const call = vi.fn(async () => {
    await ready;
    return Response.json({ items: [], nextCursor: null });
  });
  const pending = loadMaintenanceTasks(call, {
    filters: new URLSearchParams(),
    readOrders: true,
    technicianId: undefined,
  });
  expect(call).toHaveBeenCalledTimes(11);
  release();
  expect(await pending).toEqual([]);
  expect(call).toHaveBeenCalledTimes(11);
});
it("does not load orders without capability and propagates service failure", async () => {
  const call = vi.fn(async () => new Response(null, { status: 403 }));
  await expect(
    loadMaintenanceTasks(call, {
      filters: new URLSearchParams(),
      readOrders: false,
      technicianId: undefined,
    }),
  ).rejects.toThrow("tasks unavailable");
  expect(call.mock.calls).toHaveLength(5);
});
