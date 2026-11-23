import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { auditEventSchema } from "@ice24/contracts";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { AuditDetail } from "./detail";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";
import { demoIds } from "../../server/demo/fixtures";

describe("UXD-10 audit detail", () => {
  it("shows all fields with a resource link and a correlation list, keeping the safe return", async () => {
    const event = auditEventSchema.parse(
      await (
        await demoApiResponse(
          `audit-events/${demoIds.audit(1)}`,
          {},
          defaultDemoState(),
          Date.parse("2026-10-20T16:00:00Z"),
        )
      ).json(),
    );
    const html = renderToStaticMarkup(
      <AuditDetail event={event} failure={null} returnTo="/audit?result=SUCCESS" />,
    );
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/<main\b/);
    for (const label of [
      "Fecha local",
      "Fecha UTC",
      "Actor",
      "Entidad",
      "Antes",
      "Después",
      "Dirección IP",
      "Origen",
      "Correlación",
    ])
      expect(html).toContain(label);
    expect(html).toContain('href="/audit?result=SUCCESS"');
    expect(html).toContain(`href="/audit?correlation=${event.correlationId}&amp;origen=`);
    expect(html).toContain(`href="/machines/${event.machineId}`);
    expect(html).toContain("Cambió");
    expect(html).not.toContain("FREQUENCY_OVERRIDE_CREATED");
    expect(html).not.toContain(">USER<");
    expect(html).not.toContain(">WEB<");
    const unknown = renderToStaticMarkup(
      <AuditDetail
        event={{ ...event, operation: "UnknownCode", entityType: "UnknownEntity" }}
        failure={null}
        returnTo="https://evil.invalid"
      />,
    );
    expect(unknown).toContain("Otro evento");
    expect(unknown).not.toContain("UnknownCode");
    expect(unknown).not.toContain("evil.invalid");
  });
  it("renders an indistinguishable unavailable state without record identifiers", () => {
    const missing = renderToStaticMarkup(
      <AuditDetail event={null} failure={null} returnTo="/audit" />,
    );
    const outside = renderToStaticMarkup(
      <AuditDetail event={null} failure={{ kind: "not_found", message: "" }} returnTo="/audit" />,
    );
    expect(missing).toBe(outside);
    expect(missing).toContain("Evento no disponible");
    expect(missing).not.toContain("Correlación");
  });
});
