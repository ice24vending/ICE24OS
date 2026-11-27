"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  Button,
  ButtonLink,
  Card,
  JobStatus as JobStatusTag,
  ListLayout,
  PageWidth,
  Table,
  type TableColumn,
} from "@ice24/ui";
import type { AsyncJob, JobPage, JobStatus, QueueOverview } from "@ice24/contracts";
import type { FailureKind } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { rowLinkId } from "../navigation/return-focus";
import { withOrigin } from "../navigation/deep-links";
import { jobName, jobDate, jobTypes, queueName, statusLabels } from "./model";
export { statusLabels } from "./model";
const subscribe = () => () => undefined;
const age = (seconds: number | null) =>
  seconds === null
    ? "Sin pendientes"
    : seconds < 120
      ? `${seconds} s`
      : seconds < 7200
        ? `${Math.round(seconds / 60)} min`
        : `${Math.round(seconds / 3600)} h`;
const columns: TableColumn<AsyncJob>[] = [
  { id: "job", header: "Trabajo", cell: jobName, mobile: "title" },
  { id: "created", header: "Creado", cell: (job) => jobDate(job.createdAt) },
  { id: "status", header: "Estado", cell: (job) => <JobStatusTag status={job.status} /> },
  { id: "attempts", header: "Intentos", cell: (job) => job.attemptCount + "/" + job.maxAttempts },
  {
    id: "error",
    header: "Código de error",
    cell: (job) => job.errorCode ?? "Sin error",
    priority: "low",
  },
];
export function JobCenter({
  initialPage: data,
  initialOverview: overview,
  initialFailure: failure,
  initialQuery = "limit=25",
}: {
  contextId: string;
  csrfToken: string;
  initialPage: JobPage | null;
  initialOverview: QueueOverview | null;
  initialFailure: { kind: FailureKind; message: string; correlationId?: string | undefined } | null;
  canAudit: boolean;
  canIntegrationLogs: boolean;
  initialQuery?: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const query = new URLSearchParams(initialQuery);
  const origin = "/jobs?" + query.toString();
  const next = new URLSearchParams(query);
  if (data?.page.nextCursor) next.set("cursor", data.page.nextCursor);
  useEffect(() => {
    document.title = "Centro de trabajos · ICE24 OS";
  }, []);
  const denied = failure?.kind === "forbidden" || failure?.kind === "session";
  return (
    <PageWidth
      as="main"
      id="main-content"
      className="job-layout"
      aria-label="Centro de trabajos"
      data-page-ready={String(hydrated)}
    >
      <ListLayout
        title="Centro de trabajos"
        description="Consulta los procesos automáticos y revisa los que necesitan atención. Fechas en hora del centro de México."
        actions={
          !denied && (
            <Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>
              Actualizar datos
            </Button>
          )
        }
        summary={
          !denied &&
          overview && (
            <section aria-label="Resumen de trabajos" className="job-overview">
              <Card title="Trabajos">
                <dl>
                  {(Object.keys(statusLabels) as JobStatus[]).map((status) => (
                    <div key={status}>
                      <dt>{statusLabels[status]}</dt>
                      <dd>{overview.jobs[status]}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
              {overview.queues.map((queue) => (
                <Card title={queueName(queue.queue)} key={queue.queue}>
                  <dl>
                    <div>
                      <dt>Pendientes</dt>
                      <dd>{queue.depth}</dd>
                    </div>
                    <div>
                      <dt>Requieren revisión</dt>
                      <dd>{queue.deadLetters}</dd>
                    </div>
                    <div>
                      <dt>Mayor tiempo de espera</dt>
                      <dd>{age(queue.oldestSeconds)}</dd>
                    </div>
                    <div>
                      <dt>Límite de intentos</dt>
                      <dd>{queue.maxAttempts}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
              <Card title="Publicaciones pendientes">
                <dl>
                  <div>
                    <dt>Por publicar</dt>
                    <dd>{overview.outbox.pending}</dd>
                  </div>
                  <div>
                    <dt>Con error</dt>
                    <dd>{overview.outbox.failing}</dd>
                  </div>
                  <div>
                    <dt>Mayor tiempo de espera</dt>
                    <dd>{age(overview.outbox.oldestPendingSeconds)}</dd>
                  </div>
                </dl>
              </Card>
            </section>
          )
        }
        activeFilters={["status", "type", "queue"].filter((key) => query.has(key)).length}
        filters={
          !denied && (
            <form
              action="/jobs"
              method="get"
              className="job-filters"
              aria-label="Filtros de trabajos"
            >
              <label>
                Estado
                <select name="status" defaultValue={query.get("status") ?? ""}>
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
                <select name="type" defaultValue={query.get("type") ?? ""}>
                  <option value="">Todos los tipos</option>
                  {Object.entries(jobTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Proceso
                <select name="queue" defaultValue={query.get("queue") ?? ""}>
                  <option value="">Todos los procesos</option>
                  {overview?.queues.map((queue) => (
                    <option key={queue.queue} value={queue.queue}>
                      {queueName(queue.queue)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="job-actions">
                <Button type="submit" icon="filter">
                  Aplicar filtros
                </Button>
                <ButtonLink href="/jobs" variant="tertiary">
                  Limpiar filtros
                </ButtonLink>
              </div>
            </form>
          )
        }
        status={
          failure ? (
            <ServiceState
              {...failure}
              onRetry={denied ? undefined : () => window.location.reload()}
              retryLabel="Reintentar consulta"
            />
          ) : !data?.items.length ? (
            <ServiceState
              kind="empty"
              title="No hay trabajos que coincidan con los filtros."
              message="Limpia los filtros o vuelve más tarde para consultar los procesos automáticos."
            />
          ) : undefined
        }
        pagination={
          data && (
            <nav aria-label="Paginación de trabajos" className="job-actions">
              {query.has("cursor") && (
                <ButtonLink
                  href={
                    "/jobs?" +
                    new URLSearchParams([...query].filter(([key]) => key !== "cursor")).toString()
                  }
                >
                  Primera página
                </ButtonLink>
              )}
              {data.page.hasMore && (
                <ButtonLink href={"/jobs?" + next.toString()}>Siguiente</ButtonLink>
              )}
            </nav>
          )
        }
      >
        {data && (
          <section aria-label="Trabajos">
            <p role="status">
              {data.items.length} trabajos · Página {query.has("cursor") ? "siguiente" : "1"}
            </p>
            <Table
              caption="Trabajos, más recientes primero"
              rows={data.items}
              columns={columns}
              getRowId={(job) => job.id}
              getRowHref={(job) => withOrigin("/jobs/" + job.id, origin)}
              getRowLinkId={(job) => rowLinkId(job.id)}
            />
          </section>
        )}
      </ListLayout>
    </PageWidth>
  );
}
