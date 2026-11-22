import { expect, it, vi } from "vitest";
import { defaultDemoState } from "../../server/demo/state";
import { demoApiResponse } from "../../server/demo/api";
import {
  loadOperationalSummary,
  operationalCounts,
  readSummaryList,
  unacknowledgedAlerts,
} from "./load-operational-summary";
import { ROLE_PERMISSIONS } from "../../server/demo/personas";
const now = Date.parse("2026-10-20T16:00:00Z");
const parse = (v: unknown) => v as { items: number[]; nextCursor: string | null };

it.each([
  "machines",
  "branches",
  "notifications",
  "tickets",
  "maintenance/activities",
  "work-orders",
])("%s discards all 500 records when the fifth page still has a cursor", async (path) => {
  let cursor = 0;
  const call = vi.fn(async (_path: string) =>
    Response.json({
      items: Array.from({ length: 100 }, (_, i) => i),
      nextCursor: `page-${++cursor}`,
    }),
  );
  expect((await readSummaryList(call, path, parse)).data).toBeNull();
  expect(call).toHaveBeenCalledTimes(5);
  expect(
    call.mock.calls.every(
      (args) =>
        new URL(String(args[0]), "https://test.invalid").searchParams.get("limit") === "100",
    ),
  ).toBe(true);
});
it("accepts exactly 500 records only when the fifth page ends the list", async () => {
  let page = 0;
  const call = vi.fn(async () =>
    Response.json({
      items: Array.from({ length: 100 }, (_, i) => i),
      nextCursor: ++page === 5 ? null : String(page),
    }),
  );
  expect((await readSummaryList(call, "tickets", parse)).data).toHaveLength(500);
  expect(call).toHaveBeenCalledTimes(5);
});
it("rejects oversized nonpaginated lists, a repeated cursor and a failed later page", async () => {
  expect(
    (
      await readSummaryList(
        async () => Response.json({ items: Array(501).fill(1), nextCursor: null }),
        "machines",
        parse,
      )
    ).data,
  ).toBeNull();
  const repeated = vi.fn(async () => Response.json({ items: [1], nextCursor: "same" }));
  expect((await readSummaryList(repeated, "tickets", parse)).data).toBeNull();
  expect(repeated).toHaveBeenCalledTimes(2);
  const failing = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ items: [1], nextCursor: "two" }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }));
  expect((await readSummaryList(failing, "tickets", parse)).data).toBeNull();
});
it("derives exact counts and a top five from the same demo lists, with independent failures", async () => {
  const state = { ...defaultDemoState(), maintenance: "operation" as const };
  const call = (path: string) => demoApiResponse(path, {}, state, now);
  const data = await loadOperationalSummary(call, { permissions: ROLE_PERMISSIONS.OW });
  const counts = operationalCounts(
    data.machines,
    data.tickets.data,
    data.activities.data,
    data.orders.data,
    now,
  );
  expect(counts.available).toBe(5);
  expect(counts.openToday).toBe(4);
  expect(counts.today).toHaveLength(7);
  expect(counts.next).toHaveLength(9);
  expect(counts.overdue).toHaveLength(2);
  expect(counts.assignees).toHaveLength(5);
  expect(unacknowledgedAlerts(data.alerts.data!)).toBe(2);
  expect(data.tasks).toHaveLength(5);
  const failed = await loadOperationalSummary(
    (path) =>
      path.startsWith("tickets")
        ? Promise.resolve(new Response(null, { status: 503 }))
        : call(path),
    { permissions: ROLE_PERMISSIONS.OW },
  );
  expect(failed.tickets.data).toBeNull();
  expect(failed.machines).toHaveLength(8);
  expect(failed.orders.data).not.toBeNull();
});
it("uses the Mexico City date boundary and excludes resolved/cancelled tickets from open today", async () => {
  const state = { ...defaultDemoState(), maintenance: "operation" as const };
  const data = await loadOperationalSummary((p) => demoApiResponse(p, {}, state, now), {
    permissions: ROLE_PERMISSIONS.OW,
  });
  const ticket = data.tickets.data![0]!;
  const tickets = [
    { ...ticket, createdAt: "2026-10-21T05:59:59Z" },
    { ...ticket, createdAt: "2026-10-21T06:00:00Z" },
    { ...ticket, state: "completed" as const },
    { ...ticket, state: "cancelled" as const },
  ];
  const result = operationalCounts([], tickets, [], [], now);
  expect(result.today).toHaveLength(3);
  expect(result.openToday).toBe(1);
});
it("unknown permissions are unavailable, never denied or zero", async () => {
  const data = await loadOperationalSummary(async () => new Response(null, { status: 503 }), {
    permissions: null,
  });
  expect(data.activities).toEqual({ data: null, denied: false });
  expect(data.tasks).toBeNull();
});
