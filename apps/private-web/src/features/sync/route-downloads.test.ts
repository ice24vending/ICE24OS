import { describe, expect, it, vi } from "vitest";
import { OFFLINE_LIMITS, OfflineStorageError } from "@ice24/offline";
import {
  downloadRoute,
  planRouteDownload,
  routeExclusion,
  type RouteItem,
} from "./route-downloads";
const item = (id: string, estimatedBytes: number) =>
  ({ order: { id }, estimatedBytes }) as RouteItem;
describe("route downloads", () => {
  it("preserves server precedence for an in-progress order with a later deadline when applying quota", () => {
    const active = {
      ...item("active", 80),
      order: {
        ...item("active", 80).order,
        state: "in_progress" as const,
        dueAt: "2026-11-10T18:00:00Z",
      },
    };
    const overdue = {
      ...item("overdue", 80),
      order: {
        ...item("overdue", 80).order,
        state: "overdue" as const,
        dueAt: "2026-11-01T18:00:00Z",
      },
    };
    const plan = planRouteDownload([active, overdue], {
      deviceBytes: OFFLINE_LIMITS.deviceBytes - 100,
      orderBytes: {},
    });
    expect(plan.selected.map((i) => i.order.id)).toEqual(["active"]);
    expect(plan.excluded.map(({ item }) => item.order.id)).toEqual(["overdue"]);
  });
  it("never allocates quota to reservations elsewhere, even with an old local copy", () => {
    const plan = planRouteDownload(
      [{ ...item("reserved", 100), reservedElsewhere: true }, item("free", 100)],
      { deviceBytes: OFFLINE_LIMITS.deviceBytes - 100, orderBytes: {} },
      ["reserved"],
    );
    expect(plan.selected.map((i) => i.order.id)).toEqual(["free"]);
    expect(plan.reserved.map((i) => i.order.id)).toEqual(["reserved"]);
    expect(plan.excluded).toEqual([]);
  });
  it("previews the exact fitting set before confirmation, excluding existing downloads", () => {
    const plan = planRouteDownload(
      [item("saved", 80), item("first", 80), item("large", 50), item("small", 20)],
      { deviceBytes: OFFLINE_LIMITS.deviceBytes - 100, orderBytes: {} },
      ["saved"],
    );
    expect(plan.selected.map((i) => i.order.id)).toEqual(["first", "small"]);
    expect(plan.excluded.map(({ item }) => item.order.id)).toEqual(["large"]);
  });
  it("counts existing evidence toward the per-order and device quotas", () => {
    expect(
      routeExclusion(item("a", 2), {
        deviceBytes: 0,
        orderBytes: { a: OFFLINE_LIMITS.orderBytes - 1 },
      }),
    ).toContain("50 MB");
    expect(
      routeExclusion(item("a", 2), { deviceBytes: OFFLINE_LIMITS.deviceBytes - 1, orderBytes: {} }),
    ).toContain("espacio");
    expect(
      routeExclusion(item("a", 2), { deviceBytes: 0, orderBytes: {}, browserFreeBytes: 5 }),
    ).toContain("espacio");
  });
  it("preserves due-date order and keeps processing smaller orders when space is insufficient", async () => {
    let used = OFFLINE_LIMITS.deviceBytes - 100;
    const calls: string[] = [];
    const results = await downloadRoute([item("first", 80), item("large", 50), item("small", 20)], {
      available: async () => false,
      capacity: async () => ({ deviceBytes: used, orderBytes: {} }),
      download: async (next) => {
        used += next.estimatedBytes;
        calls.push(next.order.id);
      },
      progress: vi.fn(),
    });
    expect(calls).toEqual(["first", "small"]);
    expect(results.map((r) => r.status)).toEqual(["downloaded", "excluded", "downloaded"]);
    expect(used).toBe(OFFLINE_LIMITS.deviceBytes);
  });
  it("does not cancel the remaining orders when a reservation fails", async () => {
    const progress = vi.fn();
    const results = await downloadRoute([item("locked", 1), item("next", 1)], {
      available: async () => false,
      capacity: async () => ({ deviceBytes: 0, orderBytes: {} }),
      download: async (next) => {
        if (next.order.id === "locked") throw new Error("Orden reservada en otro dispositivo");
      },
      progress,
    });
    expect(results.map((r) => r.status)).toEqual(["failed", "downloaded"]);
    expect(progress).toHaveBeenLastCalledWith(results[1], 2);
  });
  it("preserves downloaded work without downloading or overwriting it", async () => {
    const download = vi.fn();
    const results = await downloadRoute([item("saved", 1)], {
      available: async () => true,
      capacity: vi.fn(),
      download,
      progress: vi.fn(),
    });
    expect(results[0]?.status).toBe("available");
    expect(download).not.toHaveBeenCalled();
  });
  it("explains expired local work and continues without deleting it", async () => {
    const download = vi.fn();
    const results = await downloadRoute([item("expired", 1), item("next", 1)], {
      available: async (next) => {
        if (next.order.id === "expired") throw new OfflineStorageError("expired");
        return false;
      },
      capacity: async () => ({ deviceBytes: 0, orderBytes: {} }),
      download,
      progress: vi.fn(),
    });
    expect(results[0]?.message).toContain("sincronización");
    expect(results.map((r) => r.status)).toEqual(["failed", "downloaded"]);
    expect(download).toHaveBeenCalledTimes(1);
  });
  it("stops after a context change instead of continuing under another session", async () => {
    const controller = new AbortController();
    const download = vi.fn(async () => {
      controller.abort();
    });
    await downloadRoute([item("a", 1), item("b", 1)], {
      available: async () => false,
      capacity: async () => ({ deviceBytes: 0, orderBytes: {} }),
      download,
      progress: vi.fn(),
      signal: controller.signal,
    });
    expect(download).toHaveBeenCalledTimes(1);
  });
});
