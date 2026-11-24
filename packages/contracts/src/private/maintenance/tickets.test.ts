import { describe, expect, it } from "vitest";
import { ticketSchema, ticketPageSchema, ticketQuerySchema } from "./tickets.js";
const id = "70000000-0000-4000-8000-000000000384";
describe("additive tickets contracts", () => {
  it("keeps a persisted field-app ticket and its original page valid", () => {
    const ticket = {
      id,
      folio: "TKT-1",
      machineId: id,
      machineCode: "ICE24-1",
      systemId: id,
      systemName: "Agua",
      componentId: null,
      componentName: null,
      priority: "normal",
      description: "Fuga en la entrada de agua",
      evidenceIds: [],
      activityId: null,
      state: "pending_assignment",
      diagnosis: null,
      workOrderId: null,
      rowVersion: 1,
      createdAt: "2026-11-23T12:00:00.000Z",
    };
    expect(ticketSchema.parse(ticket)).toEqual(ticket);
    expect(ticketPageSchema.parse({ items: [ticket], nextCursor: null })).toEqual({
      items: [ticket],
      nextCursor: null,
    });
    expect(ticketQuerySchema.parse({ machineId: id })).toEqual({ machineId: id, limit: 50 });
  });
  it("validates filters, dates and bounded pagination", () => {
    expect(ticketQuerySchema.safeParse({ from: "2026-02-30" }).success).toBe(false);
    expect(ticketQuerySchema.safeParse({ from: "2026-11-24", to: "2026-11-23" }).success).toBe(
      false,
    );
    expect(ticketQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(ticketQuerySchema.safeParse({ state: "unknown" }).success).toBe(false);
    expect(
      ticketQuerySchema.parse({
        metric: "resolvedToday",
        from: "2026-11-23",
        to: "2026-11-23",
        limit: "2",
      }).limit,
    ).toBe(2);
  });
  it("requires the cursor to match the explicit sort and retains PostgreSQL precision", () => {
    const cursor = `2026-11-23T12:00:00.000501Z|${id}`;
    expect(ticketQuerySchema.parse({ sort: "recent", cursor }).cursor).toBe(cursor);
    expect(ticketPageSchema.parse({ items: [], nextCursor: cursor }).nextCursor).toBe(cursor);
    expect(ticketQuerySchema.safeParse({ cursor }).success).toBe(false);
    expect(ticketQuerySchema.safeParse({ sort: "recent", cursor: id }).success).toBe(false);
    expect(ticketQuerySchema.safeParse({ sort: "oldest" }).success).toBe(false);
    expect(
      ticketQuerySchema.safeParse({ sort: "recent", cursor: `2026-02-30T12:00:00.000501Z|${id}` })
        .success,
    ).toBe(false);
    expect(ticketQuerySchema.parse({ cursor: id }).cursor).toBe(id);
  });
});
