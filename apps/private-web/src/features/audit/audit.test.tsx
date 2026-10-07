import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AuditEvent, AuditPage } from "@ice24/contracts";
import { describeFilters, toQuery, validateFilters } from "./filters";
import { AuditViewer, type InitialFailure } from "./viewer";

const id = "11111111-1111-4111-8111-111111111111";
const correlation = "22222222-2222-4222-8222-222222222222";
const event: AuditEvent = {
  id,
  eventVersion: 1,
  occurredAt: "2026-10-06T12:00:00.000Z",
  timeZone: "America/Mexico_City",
  occurredAtLocal: "2026-10-06T06:00:00",
  actorUserId: id,
  actorType: "USER",
  contextSessionId: null,
  accountId: id,
  branchId: null,
  machineId: null,
  entityType: "AsyncJob",
  entityId: id,
  operation: "JobRetryRequested",
  previousValues: { status: "DEAD_LETTER" },
  newValues: { status: "QUEUED" },
  reason: "Proveedor recuperado",
  origin: "ADMIN",
  ipAddress: null,
  deviceSummary: null,
  result: "SUCCESS",
  correlationId: correlation,
  createdAt: "2026-10-06T12:00:00.000Z",
};
const page = (items: AuditEvent[]): AuditPage => ({
  items,
  page: { hasMore: false, nextCursor: null },
});
const viewer = (
  initial: AuditPage | null,
  failure: InitialFailure | null = null,
  filters = {},
  canGlobal = false,
) =>
  renderToStaticMarkup(
    <AuditViewer
      contextId="c"
      initial={initial}
      initialFailure={failure}
      initialFilters={filters}
      initialErrors={{}}
      canGlobal={canGlobal}
    />,
  );

describe("audit filters (actor, action, date, entity, correlation)", () => {
  it("accepts identifiers, names and whole UTC days and builds the BFF query", () => {
    const { filters, errors } = validateFilters({
      actorUserId: id.toUpperCase(),
      operation: "JobRetryRequested",
      entityType: "AsyncJob",
      entityId: id,
      correlationId: correlation,
      from: "2026-10-01",
      to: "2026-10-06",
      result: "FAILED",
      unknown: "dropped",
    });
    expect(errors).toEqual({});
    expect(toQuery(filters)).toBe(
      `actorUserId=${id}&entityId=${id}&correlationId=${correlation}&operation=JobRetryRequested&entityType=AsyncJob&result=FAILED&from=2026-10-01T00%3A00%3A00.000Z&to=2026-10-06T23%3A59%3A59.999999Z`,
    );
    expect(describeFilters(filters)).toContain(`Correlación: ${correlation}`);
  });
  it("rejects partial identifiers, free text, invalid dates and inverted ranges", () => {
    const { errors } = validateFilters({
      correlationId: "2222",
      operation: "drop table",
      from: "2026-13-40",
      entityId: id,
    });
    expect(Object.keys(errors).sort()).toEqual(["correlationId", "from", "operation"]);
    expect(validateFilters({ from: "2026-10-06", to: "2026-10-01" }).errors.to).toContain(
      "posterior",
    );
  });
});

describe("audit viewer states", () => {
  it("shows no filters or data without permission", () => {
    const html = viewer(null, {
      kind: "forbidden",
      message: "No tienes permiso para consultar la auditoría.",
    });
    expect(html).toContain("Sin permiso");
    expect(html).not.toContain("Filtros de auditoría");
    expect(html).not.toContain("<table");
  });
  it("explains an empty result and how to widen it", () => {
    const html = viewer(page([]), null, { correlationId: correlation });
    expect(html).toContain("No hay eventos que coincidan con los filtros.");
    expect(html).toContain(`Filtros activos: Correlación: ${correlation}`);
    expect(html).toContain(">Quitar filtros</button>");
  });
  it("lists action, entity, actor and result with a detail button per row", () => {
    const html = viewer(page([event]));
    expect(html).toContain("1 eventos · Página 1");
    expect(html).toContain('<td data-label="Entidad">AsyncJob</td>');
    expect(html).toContain('aria-label="Ver detalle de JobRetryRequested"');
    expect(html).toContain("Correcto");
  });
  it("opens with the filters of a deep link", () => {
    const html = viewer(page([event]), null, { correlationId: correlation });
    expect(html).toContain(`value="${correlation}"`);
    expect(html).toContain('id="audit-correlationId"');
    // The label holds only its text: hints and errors are linked through aria-describedby.
    expect(html).toContain('<label for="audit-operation">Tipo de evento</label>');
    expect(html).toContain('aria-describedby="audit-operation-hint"');
  });
  it("shows an error state with retry and the global scope only to ICE24", () => {
    const failed = viewer(null, { kind: "error", message: "La auditoría no está disponible." });
    expect(failed).toContain("La auditoría no está disponible.");
    expect(failed).toContain(">Reintentar</button>");
    expect(viewer(page([]))).not.toContain("Global ICE24");
    expect(viewer(page([]), null, {}, true)).toContain("Global ICE24");
  });
});
