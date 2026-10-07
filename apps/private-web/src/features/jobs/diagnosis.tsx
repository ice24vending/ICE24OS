"use client";
import { useState } from "react";
import { integrationLogPageSchema, type IntegrationLog } from "@ice24/contracts";
import { request, toFailure, type Failure } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";

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
        "No fue posible consultar los logs de integración.",
      );
      setLogs(integrationLogPageSchema.parse(await response.json()).items);
    } catch (cause) {
      setLogs(null);
      setFailure(toFailure(cause, "No fue posible consultar los logs de integración."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-labelledby="job-diagnosis-title" className="job-diagnosis">
      <h3 id="job-diagnosis-title">Diagnóstico</h3>
      <p>
        Correlación <code>{correlationId}</code>: identifica la operación completa (petición,
        outbox, cola, worker, proveedor y webhook).
      </p>
      <div className="job-actions">
        {canAudit && (
          <a href={`/audit?correlationId=${correlationId}`}>Ver auditoría de esta correlación</a>
        )}
        {canIntegrationLogs && (
          <button type="button" disabled={busy} onClick={() => void load()}>
            {logs ? "Actualizar llamadas a integraciones" : "Ver llamadas a integraciones"}
          </button>
        )}
      </div>
      {busy && <ServiceState kind="loading" title="Consultando llamadas a integraciones…" />}
      {failure && (
        <ServiceState kind={failure.kind} message={failure.message} onRetry={() => void load()} />
      )}
      {logs &&
        (logs.length === 0 ? (
          <ServiceState
            kind="empty"
            title="Sin llamadas a integraciones"
            message="Esta operación no llamó a Stripe, correo, almacenamiento, antimalware ni a la cola, o sus registros ya superaron la retención configurada."
          />
        ) : (
          <div
            className="job-table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Llamadas a integraciones, desplazamiento horizontal"
          >
            <table>
              <caption>Llamadas a integraciones de esta correlación (datos redactados)</caption>
              <thead>
                <tr>
                  <th scope="col">Hora UTC</th>
                  <th scope="col">Integración</th>
                  <th scope="col">Operación</th>
                  <th scope="col">Resultado</th>
                  <th scope="col">Intento</th>
                  <th scope="col">Latencia</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{utc(log.occurredAt)}</td>
                    <td>
                      {INTEGRATIONS[log.integration]}
                      <br />
                      <small>{log.direction === "INBOUND" ? "Entrante" : "Saliente"}</small>
                    </td>
                    <td>{log.operation}</td>
                    <td>
                      <span
                        className={`job-status job-status--${log.status === "FAILED" ? "failed" : "succeeded"}`}
                      >
                        {log.status === "FAILED" ? "Fallida" : "Correcta"}
                      </span>
                      {(log.errorCode ?? log.responseCode) && (
                        <>
                          <br />
                          <small>{log.errorCode ?? log.responseCode}</small>
                        </>
                      )}
                    </td>
                    <td>{log.attempt}</td>
                    <td>{log.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
