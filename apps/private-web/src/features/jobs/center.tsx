"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  asyncJobSchema,
  jobDetailSchema,
  jobPageSchema,
  queueOverviewSchema,
  type JobDetail,
  type JobPage,
  type JobStatus,
  type QueueOverview,
} from "@ice24/contracts";
import { useAccountAccess } from "../account-shell/access-provider";
import { request, toFailure, type Failure, type FailureKind } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import { JobDiagnosis } from "./diagnosis";

export const statusLabels: Record<JobStatus, string> = {
  QUEUED: "En cola",
  RUNNING: "Procesando",
  SUCCEEDED: "Completado",
  RETRY_WAIT: "Reintento programado",
  FAILED: "Fallido",
  DEAD_LETTER: "En DLQ",
};
const retryable: readonly JobStatus[] = ["DEAD_LETTER", "FAILED"];
const date = (value: string | null) =>
  value === null
    ? "—"
    : new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date(value));
const age = (seconds: number | null) =>
  seconds === null
    ? "—"
    : seconds < 120
      ? `${seconds} s`
      : seconds < 7200
        ? `${Math.round(seconds / 60)} min`
        : `${Math.round(seconds / 3600)} h`;

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span className={`job-status job-status--${status.toLowerCase().replace("_", "-")}`}>
      {statusLabels[status]}
    </span>
  );
}

function Overview({ overview }: { overview: QueueOverview }) {
  return (
    <section aria-label="Estado de colas" className="job-overview">
      {overview.queues.map((queue) => (
        <article key={queue.queue} className="job-card">
          <h2>{queue.queue}</h2>
          <dl>
            <div>
              <dt>Pendientes</dt>
              <dd>{queue.depth}</dd>
            </div>
            <div>
              <dt>Más antiguo</dt>
              <dd>{age(queue.oldestSeconds)}</dd>
            </div>
            <div>
              <dt>DLQ</dt>
              <dd className={queue.deadLetters > 0 ? "job-alert" : undefined}>
                {queue.deadLetters}
              </dd>
            </div>
            <div>
              <dt>Intentos máx.</dt>
              <dd>{queue.maxAttempts}</dd>
            </div>
          </dl>
        </article>
      ))}
      <article className="job-card">
        <h2>Outbox</h2>
        <dl>
          <div>
            <dt>Por publicar</dt>
            <dd>{overview.outbox.pending}</dd>
          </div>
          <div>
            <dt>Con error</dt>
            <dd className={overview.outbox.failing > 0 ? "job-alert" : undefined}>
              {overview.outbox.failing}
            </dd>
          </div>
          <div>
            <dt>Más antiguo</dt>
            <dd>{age(overview.outbox.oldestPendingSeconds)}</dd>
          </div>
        </dl>
      </article>
      <article className="job-card">
        <h2>Trabajos</h2>
        <dl>
          {(Object.keys(statusLabels) as JobStatus[]).map((status) => (
            <div key={status}>
              <dt>{statusLabels[status]}</dt>
              <dd
                className={
                  ["DEAD_LETTER", "FAILED"].includes(status) && overview.jobs[status] > 0
                    ? "job-alert"
                    : undefined
                }
              >
                {overview.jobs[status]}
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </section>
  );
}

export function JobCenter({
  contextId,
  csrfToken,
  initialPage,
  initialOverview,
  initialFailure,
  canAudit,
  canIntegrationLogs,
}: {
  contextId: string;
  csrfToken: string;
  initialPage: JobPage | null;
  initialOverview: QueueOverview | null;
  initialFailure: { kind: FailureKind; message: string } | null;
  canAudit: boolean;
  canIntegrationLogs: boolean;
}) {
  const access = useAccountAccess();
  const [data, setData] = useState(initialPage),
    [overview, setOverview] = useState(initialOverview),
    [failure, setFailure] = useState<Failure | { kind: FailureKind; message: string } | null>(
      initialFailure,
    ),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(""),
    [cursors, setCursors] = useState<(string | null)[]>([null]),
    [page, setPage] = useState(0);
  const [detail, setDetail] = useState<JobDetail | null>(null),
    [detailFailure, setDetailFailure] = useState<Failure | null>(null),
    [retryState, setRetryState] = useState<"idle" | "sending" | "done">("idle"),
    [retryMessage, setRetryMessage] = useState(""),
    [retryFailure, setRetryFailure] = useState<Failure | null>(null);
  const active = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const retryResult = useRef<HTMLParagraphElement>(null);
  // One key per job, version and reason: an ambiguous network failure retries with the same key.
  const retryKeys = useRef<Record<string, string>>({});
  const headers = { "x-ice24-workspace-context": contextId };

  useEffect(() => {
    // A persisted tab must not keep another context's jobs after navigation.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      active.current?.abort();
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  const detailId = detail?.id;
  useEffect(() => {
    // Move focus once the detail panel is committed (no animation-frame race).
    if (detailId) heading.current?.focus();
  }, [detailId]);
  useEffect(() => {
    // The retry form disappears once the job is queued: keep focus on the confirmation.
    if (retryState === "done") retryResult.current?.focus();
  }, [retryState]);

  const get = async (path: string, signal?: AbortSignal): Promise<unknown> =>
    (
      await request(
        path,
        { cache: "no-store", headers, ...(signal ? { signal } : {}) },
        "No fue posible consultar el centro de trabajos.",
      )
    ).json();
  async function refreshOverview() {
    try {
      setOverview(queueOverviewSchema.parse(await get("/api/jobs?view=overview")));
    } catch {
      setOverview(null);
    }
  }
  async function load(
    query: string,
    cursor: string | null,
    nextPage: number,
    history: (string | null)[],
    keepDetail = false,
  ) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailure(null);
    setData(null);
    if (!keepDetail) setDetail(null);
    try {
      const params = new URLSearchParams(query);
      params.set("limit", "25");
      if (cursor) params.set("cursor", cursor);
      const result = jobPageSchema.parse(await get(`/api/jobs?${params}`, controller.signal));
      if (controller.signal.aborted) return;
      setData(result);
      setPage(nextPage);
      setCursors(history);
    } catch (cause) {
      if (!controller.signal.aborted)
        setFailure(toFailure(cause, "No fue posible consultar los trabajos."));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function openDetail(id: string) {
    setDetailFailure(null);
    setRetryState("idle");
    setRetryMessage("");
    setRetryFailure(null);
    try {
      setDetail(jobDetailSchema.parse(await get(`/api/jobs/${id}`)));
    } catch (cause) {
      setDetail(null);
      setDetailFailure(toFailure(cause, "No fue posible abrir el trabajo."));
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget),
      params = new URLSearchParams();
    for (const key of ["status", "type", "queue"]) {
      const value = String(values.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    setFilters(params.toString());
    void load(params.toString(), null, 0, [null]);
  }
  async function retry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || retryState === "sending") return;
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
      // Confirm only once the refreshed history (with the manual retry) is on screen,
      // so the message never sits next to a stale timeline.
      await openDetailKeepMessage(job.id);
      setRetryState("done");
      setRetryMessage(
        `Trabajo reenviado a ${job.queue}. Estado: ${statusLabels[job.status]}. El reintento quedó auditado.`,
      );
      void refreshOverview();
      void load(filters, cursors[page] ?? null, page, cursors, true);
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
      /* keep the confirmation; the list refresh shows the current state */
    }
  }

  if (initialFailure?.kind === "forbidden" || initialFailure?.kind === "session")
    return (
      <main id="main-content" className="job-layout">
        <header>
          <p className="eyebrow">Operación de plataforma</p>
          <h1>Centro de trabajos</h1>
        </header>
        <ServiceState kind={initialFailure.kind} message={initialFailure.message} />
      </main>
    );
  const retryBlocked = !access.canWrite || !access.online;
  return (
    <main id="main-content" className="job-layout">
      <header>
        <p className="eyebrow">Operación de plataforma</p>
        <h1>Centro de trabajos</h1>
        <p>
          Estado de colas, trabajos asíncronos y mensajes muertos (DLQ). Los reintentos manuales
          exigen motivo y quedan auditados. Fechas en UTC.
        </p>
      </header>
      {overview ? (
        <Overview overview={overview} />
      ) : (
        <p role="status">El resumen de colas no está disponible.</p>
      )}
      <div className="job-actions">
        <button type="button" disabled={busy} onClick={() => void refreshOverview()}>
          Actualizar resumen
        </button>
      </div>
      <form ref={form} onSubmit={submit} className="job-filters" aria-label="Filtros de trabajos">
        <label>
          Estado
          <select name="status" aria-label="Estado">
            <option value="">Todos los estados</option>
            {(Object.keys(statusLabels) as JobStatus[]).map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo de trabajo
          <input name="type" placeholder="DOMAIN_EVENT" maxLength={100} />
        </label>
        <label>
          Cola
          <select name="queue" aria-label="Cola">
            <option value="">Todas las colas</option>
            {overview?.queues.map((queue) => (
              <option key={queue.queue} value={queue.queue}>
                {queue.queue}
              </option>
            ))}
          </select>
        </label>
        <div className="job-actions">
          <button disabled={busy} type="submit">
            Aplicar filtros
          </button>
          <button
            disabled={busy}
            type="button"
            onClick={() => {
              form.current?.reset();
              setFilters("");
              void load("", null, 0, [null]);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </form>
      {busy && <ServiceState kind="loading" title="Cargando trabajos…" />}
      {failure && (
        <ServiceState
          kind={failure.kind}
          message={failure.message}
          onRetry={
            failure.kind === "forbidden" || failure.kind === "session"
              ? undefined
              : failure.kind === "conflict"
                ? () => window.location.reload()
                : () => void load(filters, cursors[page] ?? null, page, cursors)
          }
          retryLabel={failure.kind === "conflict" ? "Recargar página" : "Reintentar consulta"}
        />
      )}
      {data && (
        <section aria-label="Trabajos">
          {data.items.length ? (
            <p role="status">{`${data.items.length} trabajos · Página ${page + 1}`}</p>
          ) : (
            <ServiceState
              kind="empty"
              title="No hay trabajos que coincidan con los filtros."
              message={
                filters
                  ? "Limpia los filtros para ver todos los trabajos."
                  : "Todavía no se registran trabajos asíncronos."
              }
            />
          )}
          {!!data.items.length && (
            <div
              className="job-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabla de trabajos, desplazamiento horizontal"
            >
              <table>
                <caption>Trabajos, más recientes primero</caption>
                <thead>
                  <tr>
                    <th scope="col">Creado (UTC)</th>
                    <th scope="col">Trabajo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Intentos</th>
                    <th scope="col">Error</th>
                    <th scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((job) => (
                    <tr key={job.id}>
                      <td>{date(job.createdAt)}</td>
                      <td>
                        {job.eventType ?? job.type}
                        <br />
                        <small>{job.queue}</small>
                      </td>
                      <td>
                        <StatusBadge status={job.status} />
                      </td>
                      <td>
                        {job.attemptCount}/{job.maxAttempts}
                        {job.manualRetryCount > 0 ? ` · ${job.manualRetryCount} manual` : ""}
                      </td>
                      <td>{job.errorCode ?? "—"}</td>
                      <td>
                        <button
                          onClick={() => void openDetail(job.id)}
                          aria-label={`Ver detalle de ${job.eventType ?? job.type} ${statusLabels[job.status]}`}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <nav aria-label="Paginación de trabajos" className="job-actions">
            <button
              disabled={busy || page === 0}
              onClick={() => void load(filters, cursors[page - 1] ?? null, page - 1, cursors)}
            >
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button
              disabled={busy || !data.page.hasMore}
              onClick={() => {
                const history = [...cursors.slice(0, page + 1), data.page.nextCursor];
                void load(filters, data.page.nextCursor, page + 1, history);
              }}
            >
              Siguiente
            </button>
          </nav>
        </section>
      )}
      {detailFailure && <ServiceState kind={detailFailure.kind} message={detailFailure.message} />}
      {detail && (
        <section className="job-detail" aria-label="Detalle del trabajo">
          <h2 ref={heading} tabIndex={-1}>
            Trabajo seleccionado
          </h2>
          <button onClick={() => setDetail(null)}>Cerrar detalle</button>
          <dl>
            {Object.entries({
              ID: detail.id,
              Tipo: detail.type,
              Evento: detail.eventType ?? "—",
              Cola: detail.queue,
              Cuenta: detail.accountId ?? "Global",
              Origen: `${detail.sourceType} · ${detail.sourceId}`,
              Intentos: `${detail.attemptCount}/${detail.maxAttempts}`,
              "Reintentos manuales": String(detail.manualRetryCount),
              "Próximo intento UTC": date(detail.nextAttemptAt),
              "Inicio UTC": date(detail.startedAt),
              "Fin UTC": date(detail.finishedAt),
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
                <StatusBadge status={detail.status} />
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
                · intento {transition.attempt} · {date(transition.occurredAt)}
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
          {retryable.includes(detail.status) && (
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
                Mínimo 10 caracteres. Se reintenta solo si el trabajo no cambió desde que abriste
                este detalle; el motivo, tu usuario y la correlación quedan en la auditoría central.
              </p>
              <button type="submit" disabled={retryState === "sending" || retryBlocked}>
                {retryState === "sending" ? "Reenviando…" : "Reintentar trabajo"}
              </button>
            </form>
          )}
          {retryMessage && (
            <p
              ref={retryResult}
              tabIndex={-1}
              role={retryState === "done" ? "status" : "alert"}
              className="job-retry-message"
            >
              {retryMessage}
            </p>
          )}
          {retryFailure && (
            <ServiceState
              kind={retryFailure.kind}
              message={retryFailure.message}
              {...(retryFailure.kind === "conflict"
                ? { title: "El trabajo cambió: revisa su estado actual" }
                : {})}
            />
          )}
        </section>
      )}
    </main>
  );
}
