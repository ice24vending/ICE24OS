import { describe, expect, it } from "vitest";
import {
  changeFilters,
  ticketAge,
  ticketReturnHref,
  ticketQuery,
  ticketEventReason,
} from "./model";
describe("ticket navigation", () => {
  it("translates automatic transition reasons and preserves written follow-up", () => {
    expect(ticketEventReason("WorkOrderTransitioned", "complete")).toBe("Trabajo concluido");
    expect(ticketEventReason("WorkOrderTransitioned", "Se cambió el filtro")).toBe(
      "Se cambió el filtro",
    );
    expect(ticketEventReason("TicketDiagnosed", "complete")).toBe("complete");
  });
  it("resets pagination when filtering and preserves the machine and view", () => {
    expect(
      changeFilters(new URLSearchParams("machineId=abc&vista=bloques&cursor=old&volverA=fila"), {
        priority: "high",
      }),
    ).toBe("/maintenance/tickets?machineId=abc&vista=bloques&priority=high");
    expect(
      ticketQuery(new URLSearchParams("vista=bloques&machineId=abc&metric=open")).toString(),
    ).toBe("machineId=abc&metric=open");
  });
  it("only permits returning to the list, with safe preserved filters", () => {
    for (const path of [
      "//evil.invalid",
      "https://evil.invalid",
      "/maintenance/tickets/new",
      "javascript:alert(1)",
    ])
      expect(ticketReturnHref(path)).toBe("/maintenance/tickets");
    expect(
      ticketReturnHref("/maintenance/tickets?machineId=abc&vista=bloques&cursor=def"),
    ).toContain("cursor=def");
  });
  it("formats age without negative durations or host time-zone dependencies", () => {
    expect(ticketAge("2026-11-22T05:30:00Z", "2026-11-23T06:00:00Z")).toBe("1 día");
    expect(ticketAge("2026-11-23T05:30:00Z", "2026-11-23T07:30:00Z")).toBe("2 horas");
    expect(ticketAge("2026-11-24T05:30:00Z", "2026-11-23T07:30:00Z")).toBe("Menos de una hora");
  });
});
