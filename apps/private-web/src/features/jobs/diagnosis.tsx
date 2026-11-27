"use client";
import { useState } from "react";
import { ButtonLink, Icon, Table, StatusTag } from "@ice24/ui";
import { integrationLogPageSchema, type IntegrationLog } from "@ice24/contracts";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";

const INTEGRATIONS: Record<IntegrationLog["integration"], string> = {
  stripe: "Stripe",
  email: "Correo",
  object_storage: "Almacenamiento",
  queue: "Cola",
  antimalware: "Antimalware",
  pdf: "PDF",
};
const utc = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));

/**
 * Diagnosis of a job by its correlation (F5-14): links to the audit trail and the redacted
 * integration attempts of the same operation. Logs are loaded on demand, read-only.
 */
export function JobDiagnosis({
  correlationId,
  contextId,
  canAudit,
  canIntegrationLogs,
}: {
  correlationId: string | null;
  contextId: string;
  canAudit: boolean;
  canIntegrationLogs: boolean;
}) {
  const [logs, setLogs] = useState<IntegrationLog[] | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  if (!correlationId)
    return (
      <section aria-labelledby="job-diagnosis-title" className="job-diagnosis">
        <h3 id="job-diagnosis-title">Diagnóstico</h3>
        <p>Este trabajo no registró una correlación; revisa su historial de estados.</p>
      </section>
    );
  async function load() {
    setBusy(true);
    setFailure(null);
    try {
      const response = await request(
        `/api/integration-logs?${new URLSearchParams({ correlationId: correlationId!, limit: "50" })}`,
        { cache: "no-store", headers: { "x-ice24-workspace-context": contextId } },
        "No fue posible consultar los registros de integración.",
      );
      setLogs(integrationLogPageSchema.parse(await response.json()).items);
    } catch (cause) {
      setLogs(null);
      setFailure(toFailure(cause, "No fue posible consultar los registros de integración."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="job-diagnosis-title" className="job-diagnosis">
      <h3 id="job-diagnosis-title">Diagnóstico</h3>
      <p>
        Correlación <code>{correlationId}</code>: permite seguir la operación desde su solicitud
        hasta la respuesta del servicio.
      </p>
      <div className="job-actions">
        {canAudit && (
          <ButtonLink href={`/audit?correlationId=${correlationId}`} variant="secondary">
            Ver auditoría de esta correlación
          </ButtonLink>
        )}
        {canIntegrationLogs && (
          <button type="button" disabled={busy} onClick={() => void load()}>
            <Icon name="refresh" />
            {logs ? "Actualizar llamadas a integraciones" : "Ver llamadas a integraciones"}
          </button>
        )}
      </div>
      {busy && <ServiceState kind="loading" title="Consultando llamadas a integraciones…" />}
      {failure && (
        <ServiceState
          kind={failure.kind}
          message={failure.message}
          correlationId={failure.correlationId}
          onRetry={() => void load()}
        />
      )}
      {logs &&
        (logs.length === 0 ? (
          <ServiceState
            kind="empty"
            title="Sin llamadas a integraciones"
            message="Esta operación no llamó a Stripe, correo, almacenamiento, antimalware ni a la cola, o sus registros ya superaron la retención configurada."
          />
        ) : (
          <Table
            caption="Llamadas a integraciones de esta correlación"
            rows={logs}
            getRowId={(log) => log.id}
            columns={[
              {
                id: "time",
                header: "Hora UTC",
                cell: (log) => utc(log.occurredAt),
                mobile: "title",
              },
              {
                id: "integration",
                header: "Integración",
                cell: (log) => INTEGRATIONS[log.integration],
              },
              {
                id: "direction",
                header: "Dirección",
                cell: (log) => (log.direction === "INBOUND" ? "Entrante" : "Saliente"),
              },
              {
                id: "result",
                header: "Resultado",
                cell: (log) => (
                  <StatusTag tone={log.status === "FAILED" ? "danger" : "success"}>
                    {log.status === "FAILED" ? "Fallida" : "Correcta"}
                  </StatusTag>
                ),
              },
              {
                id: "code",
                header: "Código de respuesta",
                cell: (log) => log.errorCode ?? log.responseCode ?? "Sin error",
              },
              { id: "attempt", header: "Intento", cell: (log) => log.attempt },
              {
                id: "latency",
                header: "Tiempo de respuesta",
                cell: (log) => log.latencyMs + " ms",
              },
            ]}
          />
        ))}
    </section>
  );
}
