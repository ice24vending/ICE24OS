import { expect, it } from "vitest";
import {
  maintenancePageSchema,
  notificationPageSchema,
  ticketPageSchema,
  workOrderPageSchema,
} from "@ice24/contracts";
import { DemoRequest, demoApiResponse } from "./api";
import { defaultDemoState, normalizeDemoState, DEMO_MAINTENANCE_LABELS } from "./state";
import { DEMO_PERSONAS, ROLE_PERMISSIONS } from "./personas";
import { operationActivities, operationOrders, operationTickets } from "./summary-fixtures";
import {
  loadOperationalSummary,
  operationalCounts,
} from "../../features/summary/load-operational-summary";
const now = Date.parse("2026-10-20T16:00:00Z");
it("keeps alert acknowledgement independent of the ticket list's recent reports", async () => {
  const read = async (maintenance: "alert-announcement" | "normal") =>
    ticketPageSchema.parse(
      await (
        await demoApiResponse("tickets", {}, { ...defaultDemoState(), maintenance }, now)
      ).json(),
    ).items;
  const alertTickets = await read("alert-announcement");
  expect(alertTickets).toHaveLength(8);
  expect(operationalCounts([], alertTickets, [], [], now)).toMatchObject({
    today: [],
    openToday: 0,
  });
  expect(operationalCounts([], await read("normal"), [], [], now).openToday).toBe(1);
});
it("offers the named scenario through the existing Demo panel options", () => {
  expect(DEMO_MAINTENANCE_LABELS.operation).toBe("Operación con actividad");
  expect(normalizeDemoState({ maintenance: "operation" }, defaultDemoState()).maintenance).toBe(
    "operation",
  );
});
it.each(["owner", "technician", "readonly", "admin"] as const)(
  "%s sees identical scoped records in lists and dashboard",
  async (persona) => {
    const state = { ...defaultDemoState(), persona, maintenance: "operation" as const };
    const call = (path: string) => demoApiResponse(path, {}, state, now);
    const data = await loadOperationalSummary(call, {
      permissions: ROLE_PERMISSIONS[DEMO_PERSONAS[persona].role],
    });
    const r = new DemoRequest(state, now);
    expect(data.tickets.data).toEqual(
      ticketPageSchema.parse(await (await call("tickets?limit=100")).json()).items,
    );
    expect(data.activities.data).toEqual(
      maintenancePageSchema.parse(await (await call("maintenance/activities?limit=100")).json())
        .items,
    );
    expect(data.orders.data).toEqual(
      workOrderPageSchema.parse(await (await call("work-orders?limit=100")).json()).items,
    );
    expect(data.alerts.data).toEqual(
      notificationPageSchema.parse(await (await call("notifications?limit=100")).json()).items,
    );
    expect(data.machines?.map((m) => m.id)).toEqual(r.machines.map((m) => m.id));
    for (const item of [...operationTickets(r), ...operationActivities(r), ...operationOrders(r)])
      expect(r.machines.some((m) => m.id === item.machineId)).toBe(true);
    expect(new Set(operationTickets(r).map((t) => t.priority)).size).toBeGreaterThan(1);
  },
);
it("retains empty, disabled, error with support reference and offline states", async () => {
  const state = defaultDemoState();
  expect(
    ticketPageSchema.parse(
      await (await demoApiResponse("tickets", {}, { ...state, maintenance: "empty" }, now)).json(),
    ).items,
  ).toEqual([]);
  expect(
    (
      await demoApiResponse(
        "maintenance/activities",
        {},
        { ...state, maintenance: "disabled" },
        now,
      )
    ).status,
  ).toBe(403);
  const error = await demoApiResponse("tickets", {}, { ...state, network: "error" }, now);
  expect((await error.json()).error.correlationId).toBeTruthy();
  await expect(
    demoApiResponse("tickets", {}, { ...state, network: "offline" }, now),
  ).rejects.toThrow();
});

it("notification filters and pagination use the same operational records", async () => {
  const state = { ...defaultDemoState(), maintenance: "operation" as const };
  const get = async (path: string) =>
    notificationPageSchema.parse(await (await demoApiResponse(path, {}, state, now)).json());
  const first = await get("notifications?limit=2");
  const second = await get("notifications?limit=2&cursor=" + first.page.nextCursor);
  expect(first.page.hasMore).toBe(true);
  expect(second.items.every((n) => !first.items.some((other) => other.id === n.id))).toBe(true);
  const pending = await get("notifications?unacknowledged=true");
  expect(pending.items.every((n) => n.acknowledgedAt === null && n.status !== "resolved")).toBe(
    true,
  );
  const high = await get("notifications?priority=high");
  expect(high.items.every((n) => n.priority === "high")).toBe(true);
});
