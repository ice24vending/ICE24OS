"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  DetailLayout,
  PageWidth,
  Icon,
  JobStatus as JobStatusTag,
  TransitionFeedbackBanner,
} from "@ice24/ui";
import { asyncJobSchema, jobDetailSchema, type JobDetail, type JobStatus } from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { JobDiagnosis } from "./diagnosis";
import { jobName, queueName, jobDate, jobsReturn, statusLabels } from "./model";
const subscribe = () => () => undefined;
const retryable: readonly JobStatus[] = ["DEAD_LETTER", "FAILED"];
export function JobDetailScreen({
  contextId,
  csrfToken,
  initialDetail,
  failure,
  returnTo,
  canRetry,
  canAudit,
  canIntegrationLogs,
}: {
  contextId: string;
  csrfToken: string;
  initialDetail: JobDetail | null;
  failure: Failure | null;
  returnTo: string;
  canRetry: boolean;
  canAudit: boolean;
  canIntegrationLogs: boolean;
}) {
  const access = useAccountAccess();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [detail, setDetail] = useState(initialDetail);
  const [retryState, setRetryState] = useState<"idle" | "sending" | "done">("idle");
  const [retryMessage, setRetryMessage] = useState("");
  const [retryFailure, setRetryFailure] = useState<Failure | null>(null);
  const retryResult = useRef<HTMLParagraphElement>(null);
  const retryKeys = useRef<Record<string, string>>({});
  const headers = { "x-ice24-workspace-context": contextId };
  const retryBlocked = !access.canWrite || !access.online;
  const title = "Detalle del trabajo";
  useEffect(() => {
    document.title = "Detalle del trabajo · ICE24 OS";
  }, []);
  useEffect(() => {
    if (retryState === "done") retryResult.current?.focus();
  }, [retryState]);
  const get = async (path: string) =>
    (
      await request(path, { cache: "no-store", headers }, "No fue posible consultar el trabajo.")
    ).json();
  async function retry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || !canRetry || retryBlocked || retryState === "sending") return;
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (reason.length < 10) {
      setRetryMessage("Escribe un motivo de al menos 10 caracteres.");
      return;
    }
    setRetryState("sending");
    setRetryMessage("");
    setRetryFailure(null);
    try {
      const body = new FormData();
      body.set("csrfToken", csrfToken);
      body.set("reason", reason);
      body.set(
        "key",
        (retryKeys.current[`${detail.id}:${detail.rowVersion}:${reason}`] ??= crypto.randomUUID()),
      );
      // Expected version (If-Match): a job changed by the worker or another person is not retried.
      body.set("version", String(detail.rowVersion));
      const response = await request(
        `/api/jobs/${detail.id}/retry`,
        { method: "POST", body, headers },
        "No fue posible reintentar.",
      );
      const job = asyncJobSchema.parse(await response.json());
      setDetail((current) => (current ? { ...current, ...job } : current));
      // Confirm only once the refreshed history (with the manual retry) is on screen,
      // so the message never sits next to a stale timeline.
      await openDetailKeepMessage(job.id);
      setRetryState("done");
      setRetryMessage(
        `Trabajo reenviado. Estado: ${statusLabels[job.status]}. El reintento quedó auditado.`,
      );
    } catch (cause) {
      setRetryState("idle");
      const classified = toFailure(cause, "No fue posible reintentar.");
      if (classified.kind === "read_only") access.markReadOnly();
      setRetryFailure(classified);
      // Conflict: show the job as it is now; the person decides again with fresh data.
      if (classified.kind === "conflict") await openDetailKeepMessage(detail.id);
    }
  }
  async function openDetailKeepMessage(id: string) {
    try {
      setDetail(jobDetailSchema.parse(await get(`/api/jobs/${id}`)));
    } catch {
      /* The accepted response already replaced the job state; history can be refreshed later. */
    }
  }

  const back = jobsReturn(returnTo);
  return (
    <PageWidth
      as="main"
      variant="reading"
      id="main-content"
      className="job-layout"
      aria-label={title}
      data-page-ready={String(hydrated)}
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title={title}
        description={detail ? jobName(detail) : undefined}
        breadcrumbs={[{ label: "Centro de trabajos", href: back }, { label: title }]}
        backLink={
          <ReturnLink href={back} linkId={rowLinkId(detail?.id ?? "missing")} listName="trabajos" />
        }
        status={
          failure ? (
            <ServiceState {...failure} onRetry={() => window.location.reload()} />
          ) : !detail ? (
            <ServiceState
              kind="not_found"
              title="Trabajo no disponible"
              message="Vuelve al centro de trabajos para consultar los registros disponibles."
            />
          ) : undefined
        }
        summary={
          detail && (
            <section className="job-detail" aria-label="Datos y seguimiento del trabajo">
              <dl>
                {Object.entries({
                  ID: detail.id,
                  Tipo: jobName(detail),

                  Proceso: queueName(detail.queue),
                  Cuenta: detail.accountId ?? "Global",
                  "Referencia de origen": detail.sourceId,
                  Intentos: `${detail.attemptCount}/${detail.maxAttempts}`,
                  "Reintentos manuales": String(detail.manualRetryCount),
                  "Próximo intento": jobDate(detail.nextAttemptAt),
                  Inicio: jobDate(detail.startedAt),
                  Fin: jobDate(detail.finishedAt),
                  Error: detail.errorCode ?? "—",
                  Correlación: detail.correlationId ?? "—",
                }).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <JobStatusTag status={detail.status} />
                  </dd>
                </div>
              </dl>
              {detail.errorDetail && <p>{detail.errorDetail}</p>}
              <JobDiagnosis
                correlationId={detail.correlationId}
                contextId={contextId}
                canAudit={canAudit}
                canIntegrationLogs={canIntegrationLogs}
              />
              <h3>Historial de estados</h3>
              <ol className="job-timeline">
                {detail.transitions.map((transition) => (
                  <li key={transition.id}>
                    <strong>
                      {transition.fromStatus ? `${statusLabels[transition.fromStatus]} → ` : ""}
                      {statusLabels[transition.toStatus]}
                    </strong>{" "}
                    · intento {transition.attempt} · {jobDate(transition.occurredAt)}
                    {transition.errorCode ? ` · ${transition.errorCode}` : ""}
                    {transition.actorType === "USER" && (
                      <>
                        <br />
                        Manual por {transition.actorUserId}: “{transition.reason}”
                      </>
                    )}
                  </li>
                ))}
              </ol>
              {canRetry && retryable.includes(detail.status) && (
                <form
                  onSubmit={retry}
                  className="job-retry"
                  aria-label="Reintentar trabajo"
                  aria-describedby={retryBlocked ? "job-retry-blocked" : undefined}
                >
                  {retryBlocked && (
                    <p id="job-retry-blocked" className="write-blocked">
                      {access.online ? access.blockedText : "Necesitas conexión para reintentar."}
                    </p>
                  )}
                  <label>
                    Motivo del reintento
                    <textarea
                      name="reason"
                      aria-describedby="job-retry-hint"
                      maxLength={1000}
                      rows={3}
                      placeholder="Causa corregida y referencia del incidente"
                    />
                  </label>
                  <p id="job-retry-hint">
                    Mínimo 10 caracteres. Se reintenta solo si el trabajo no cambió desde que
                    abriste este detalle; el motivo, tu usuario y la correlación quedan en la
                    auditoría central.
                  </p>
                  <button type="submit" disabled={retryState === "sending" || retryBlocked}>
                    <Icon name="refresh" />
                    {retryState === "sending" ? "Reenviando…" : "Reintentar trabajo"}
                  </button>
                </form>
              )}
              {retryMessage && (
                <p
                  ref={retryResult}
                  tabIndex={-1}
                  // «done» gets focus (the form is gone), which reads it; a live role on top made
                  // NVDA read it twice (SR-03). A failure keeps the form and focus: the alert reads it.
                  role={retryState === "done" ? undefined : "alert"}
                  className="job-retry-message"
                >
                  {retryMessage}
                </p>
              )}
              {retryFailure &&
                (retryFailure.kind === "conflict" || retryFailure.kind === "error" ? (
                  // Recoverable next to the job: a conflict was already refreshed above; resending
                  // the form keeps the same version and key, so it is never queued twice.
                  <TransitionFeedbackBanner
                    titleAs="h3"
                    feedback={{
                      kind: retryFailure.kind,
                      message: retryFailure.message,
                      ...(retryFailure.kind === "conflict"
                        ? { title: "El trabajo cambió: revisa su estado actual" }
                        : {}),
                    }}
                    onRefresh={() => void openDetailKeepMessage(detail.id)}
                  />
                ) : (
                  <ServiceState
                    kind={retryFailure.kind}
                    message={retryFailure.message}
                    correlationId={retryFailure.correlationId}
                  />
                ))}
            </section>
          )
        }
      />
    </PageWidth>
  );
}
