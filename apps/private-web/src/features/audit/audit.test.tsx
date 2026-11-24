import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { auditPageSchema } from "@ice24/contracts";
import {
  auditDetailHref,
  auditLocation,
  auditPagination,
  auditReturn,
  describeFilters,
  toQuery,
  validateFilters,
} from "./filters";
import { AuditViewer } from "./viewer";
import { entityLabel, operationLabel } from "./labels";
import { demoApiResponse } from "../../server/demo/api";
import { defaultDemoState } from "../../server/demo/state";

const id = "11111111-1111-4111-8111-111111111111";
describe("UXD-10 audit navigation and filters", () => {
  it("normalizes both correlation URLs without changing the API contract", () => {
    const filters = validateFilters({
      correlation: id,
      operation: "JobRetryRequested",
      entityType: "AsyncJob",
      from: "2026-10-01",
      to: "2026-10-06",
    }).filters;
    expect(filters.correlationId).toBe(id);
    expect(toQuery(filters)).toContain(`correlationId=${id}`);
    expect(toQuery(filters)).toContain("to=2026-10-06T23%3A59%3A59.999999Z");
    expect(auditLocation(filters)).toContain(`correlation=${id}`);
    expect(validateFilters({ correlationId: id }).filters).toEqual({ correlationId: id });
    expect(describeFilters(filters)).toContain("Reintento de trabajo solicitado");
    expect(describeFilters(filters)).not.toContain("JobRetryRequested");
  });
  it("preserves the filters and cursor history when returning from page two", () => {
    const pagination = { page: 1, cursors: [null, "ZXhhbXBsZQ"] };
    const location = auditLocation({ result: "SUCCESS", from: "2026-10-01" }, pagination);
    expect(auditReturn(location)).toBe(location);
    expect(
      auditPagination(Object.fromEntries(new URL(location, "https://test.invalid").searchParams)),
    ).toEqual(pagination);
    const detail = new URL(auditDetailHref(id, location, false), "https://test.invalid");
    expect(detail.pathname).toBe(`/audit/${id}`);
    expect(detail.searchParams.get("origen")).toBe(location);
  });
  it.each([
    "https://evil.invalid/audit",
    "//evil.invalid/audit",
    "/audit/../machines",
    "/auditoria",
    "/audit/123",
    "/audit\\evil",
    "/audit?origen=https://evil.invalid",
  ])("constrains return %s to the audit list", (value) => {
    expect(auditReturn(value)).toBe("/audit");
  });
  it("drops malformed pagination and validates impossible dates without exposing technical examples", () => {
    expect(auditPagination({ page: "900", cursors: "[null]" })).toEqual({
      page: 0,
      cursors: [null],
    });
    expect(auditPagination({ page: "2", cursors: '[null,"https://evil.invalid"]' }).page).toBe(0);
    const { errors } = validateFilters({
      correlation: "bad",
      operation: "drop table",
      from: "2026-02-31",
    });
    expect(Object.keys(errors)).toEqual(["correlationId", "operation", "from"]);
    expect(JSON.stringify(errors)).not.toContain("JobRetryRequested");
  });
  it("always uses readable Spanish for unmapped codes", () => {
    expect(operationLabel("FutureEventCode")).toBe("Otro evento");
    expect(entityLabel("FutureEntity")).toBe("Otro registro");
  });
});

describe("UXD-10 audit list", () => {
  it("uses grouped dropdowns, row links and local dates inside the page landmark", async () => {
    const initial = auditPageSchema.parse(
      await (
        await demoApiResponse(
          "audit-events?limit=10",
          {},
          defaultDemoState(),
          Date.parse("2026-10-20T16:00:00Z"),
        )
      ).json(),
    );
    const html = renderToStaticMarkup(
      <AuditViewer
        contextId="c"
        initial={initial}
        initialFailure={null}
        initialFilters={{}}
        initialErrors={{}}
        canGlobal={false}
      />,
    );
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/<main\b/);
    for (const group of ["Máquinas", "Mantenimiento", "Archivos", "Usuarios", "Suscripción"])
      expect(html).toContain(`<optgroup label="${group}">`);
    expect(html).toContain('name="operation"');
    expect(html).toContain('data-row-link="true"');
    expect(html).toContain(`/audit/${initial.items[0]!.id}?origen=`);
    expect(html).toContain('class="audit-date"');
    expect(html).not.toContain('placeholder="JobRetryRequested"');
    expect(html).not.toContain("Acción registrada.");
    expect(html).not.toContain("Global ICE24");
  });
  it("withholds filters and evidence when access is denied", () => {
    const html = renderToStaticMarkup(
      <AuditViewer
        contextId="c"
        initial={null}
        initialFailure={{ kind: "forbidden", message: "Sin permiso" }}
        initialFilters={{}}
        initialErrors={{}}
        canGlobal={false}
      />,
    );
    expect(html).not.toContain("Filtros de auditoría");
    expect(html).not.toContain("<table");
  });
});
