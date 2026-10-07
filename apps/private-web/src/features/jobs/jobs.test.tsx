import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AsyncJob, JobPage } from "@ice24/contracts";
import { AccessProvider } from "../account-shell/access-provider";
import { readOnlyNotice } from "../account-shell/access";
import { JobCenter } from "./center";
import { JobDiagnosis } from "./diagnosis";

const id = "11111111-1111-4111-8111-111111111111";
const correlation = "22222222-2222-4222-8222-222222222222";
const job: AsyncJob = {
  id,
  type: "DOMAIN_EVENT",
  status: "DEAD_LETTER",
  queue: "domain_events",
  accountId: id,
  sourceType: "DomainEvent",
  sourceId: id,
  eventType: "PaymentFailed",
  attemptCount: 5,
  maxAttempts: 5,
  manualRetryCount: 0,
  nextAttemptAt: null,
  startedAt: null,
  finishedAt: null,
  errorCode: "PROVIDER_TIMEOUT",
  errorDetail: "El procesamiento agotó sus reintentos.",
  correlationId: correlation,
  rowVersion: 7,
  createdAt: "2026-10-06T12:00:00.000Z",
  updatedAt: "2026-10-06T12:00:00.000Z",
};
const page = (items: AsyncJob[]): JobPage => ({
  items,
  page: { hasMore: false, nextCursor: null },
});
const jobCenter = (
  initialPage: JobPage | null,
  failure: { kind: "forbidden" | "error"; message: string } | null = null,
  mode: "ACTIVE" | "READ_ONLY" = "ACTIVE",
) =>
  renderToStaticMarkup(
    <AccessProvider
      initialMode={mode}
      initialNotice={readOnlyNotice(null, false)}
      billingOwner={false}
    >
      <JobCenter
        contextId="c"
        csrfToken="t"
        initialPage={initialPage}
        initialOverview={null}
        initialFailure={failure}
        canAudit
        canIntegrationLogs
      />
    </AccessProvider>,
  );

describe("job center states (F5-07, F5-15)", () => {
  it("lists failed jobs with their attempts and error code", () => {
    const html = jobCenter(page([job]));
    expect(html).toContain("1 trabajos · Página 1");
    expect(html).toContain("En DLQ");
    expect(html).toContain("5/5");
    expect(html).toContain("PROVIDER_TIMEOUT");
  });
  it("shows an empty state, and no job data without permission", () => {
    expect(jobCenter(page([]))).toContain("No hay trabajos que coincidan con los filtros.");
    const forbidden = jobCenter(null, {
      kind: "forbidden",
      message: "No tienes permiso o falta verificar MFA para el centro de trabajos.",
    });
    expect(forbidden).toContain("Sin permiso");
    expect(forbidden).not.toContain("Filtros de trabajos");
  });
  it("keeps the error state retryable", () => {
    expect(jobCenter(null, { kind: "error", message: "No disponible." })).toContain(
      ">Reintentar consulta</button>",
    );
  });
});

describe("job diagnosis by correlation (F5-14)", () => {
  it("links the audit trail of the correlation and offers its integration calls", () => {
    const html = renderToStaticMarkup(
      <JobDiagnosis correlationId={correlation} contextId="c" canAudit canIntegrationLogs />,
    );
    expect(html).toContain(`href="/audit?correlationId=${correlation}"`);
    expect(html).toContain(">Ver llamadas a integraciones</button>");
    expect(html).toContain(correlation);
  });
  it("hides links the viewer cannot open", () => {
    const html = renderToStaticMarkup(
      <JobDiagnosis
        correlationId={correlation}
        contextId="c"
        canAudit={false}
        canIntegrationLogs={false}
      />,
    );
    expect(html).not.toContain("/audit?");
    expect(html).not.toContain("<button");
  });
  it("explains a job without correlation", () => {
    expect(
      renderToStaticMarkup(
        <JobDiagnosis correlationId={null} contextId="c" canAudit canIntegrationLogs />,
      ),
    ).toContain("no registró una correlación");
  });
});
