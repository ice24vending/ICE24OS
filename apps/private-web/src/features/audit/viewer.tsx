"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { auditPageSchema, type AuditEvent, type AuditPage } from "@ice24/contracts";
import { request, toFailure, type Failure, type FailureKind } from "../account-shell/failure";
import { ServiceState } from "../account-shell/service-state";
import { useAccountAccess } from "../account-shell/access-provider";
import {
  FILTER_LABELS,
  describeFilters,
  toQuery,
  validateFilters,
  type AuditFilterName,
  type AuditFilters,
} from "./filters";

export interface InitialFailure {
  kind: FailureKind;
  message: string;
}

const outcomes: Record<string, string> = {
  SUCCESS: "Correcto",
  DENIED: "Denegado",
  FAILED: "Fallido",
};
const date = (value: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));

function Detail({ event, onCorrelation }: { event: AuditEvent; onCorrelation: () => void }) {
  return (
    <section className="audit-detail" aria-label="Detalle del evento">
      <h2>Detalle del evento</h2>
      <dl>
        {Object.entries({
          ID: event.id,
          Tipo: event.operation,
          Resultado: outcomes[event.result],
          "Fecha UTC": date(event.occurredAt),
          "Zona capturada": event.timeZone,
          "Fecha local capturada": event.occurredAtLocal,
          Actor: event.actorUserId ?? event.actorType,
          "Tipo de actor": event.actorType,
          Cuenta: event.accountId ?? "Global",
          Sucursal: event.branchId ?? "No aplica",
          Máquina: event.machineId ?? "No aplica",
          Entidad: `${event.entityType} · ${event.entityId}`,
          Contexto: event.contextSessionId ?? "No disponible",
          Correlación: event.correlationId,
          Origen: event.origin,
          IP: event.ipAddress ?? "No capturada",
          Motivo: event.reason ?? "No registrado",
          Versión: String(event.eventVersion),
          "Registrado UTC": date(event.createdAt),
        }).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <button type="button" onClick={onCorrelation}>
          Ver todos los eventos de esta correlación
        </button>
      </p>
      <div className="audit-changes">
        <section>
          <h3>Valores anteriores</h3>
          <pre>{JSON.stringify(event.previousValues, null, 2)}</pre>
        </section>
        <section>
          <h3>Valores nuevos</h3>
          <pre>{JSON.stringify(event.newValues, null, 2)}</pre>
        </section>
      </div>
      {event.deviceSummary && (
        <>
          <h3>Dispositivo</h3>
          <pre>{JSON.stringify(event.deviceSummary, null, 2)}</pre>
        </>
      )}
    </section>
  );
}

const FIELDS: { name: AuditFilterName; type?: string; placeholder?: string; hint?: string }[] = [
  { name: "from", type: "date" },
  { name: "to", type: "date" },
  { name: "operation", placeholder: "JobRetryRequested", hint: "Acción registrada." },
  { name: "actorUserId", placeholder: "UUID del usuario" },
  { name: "entityType", placeholder: "AsyncJob" },
  { name: "entityId", placeholder: "UUID de la entidad" },
  { name: "correlationId", placeholder: "UUID de la operación" },
  { name: "branchId", placeholder: "UUID de la sucursal" },
  { name: "machineId", placeholder: "UUID de la máquina" },
];

export function AuditViewer({
  contextId,
  initial,
  initialFailure,
  initialFilters,
  initialErrors,
  canGlobal,
}: {
  contextId: string;
  initial: AuditPage | null;
  initialFailure: InitialFailure | null;
  initialFilters: AuditFilters;
  initialErrors: Partial<Record<AuditFilterName, string>>;
  canGlobal: boolean;
}) {
  const { online } = useAccountAccess();
  const [data, setData] = useState(initial),
    [failure, setFailure] = useState<Failure | InitialFailure | null>(initialFailure),
    [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>(initialFilters),
    [errors, setErrors] = useState(initialErrors),
    [cursors, setCursors] = useState<(string | null)[]>([null]),
    [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const active = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const detailId = detail?.id;
  useEffect(() => {
    // Move focus once the detail panel is committed.
    if (detailId) heading.current?.focus();
  }, [detailId]);
  useEffect(() => {
    // A persisted tab must not retain a previous account's evidence after navigation.
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", restore);
    return () => {
      active.current?.abort();
      window.removeEventListener("pageshow", restore);
    };
  }, []);
  async function load(
    next: AuditFilters,
    cursor: string | null,
    nextPage: number,
    history: (string | null)[],
  ) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailure(null);
    setData(null);
    setDetail(null);
    try {
      const params = new URLSearchParams(toQuery(next));
      params.set("limit", "25");
      if (cursor) params.set("cursor", cursor);
      const response = await request(
        `/api/audit?${params}`,
        {
          cache: "no-store",
          headers: { "x-ice24-workspace-context": contextId },
          signal: controller.signal,
        },
        "No fue posible consultar la auditoría.",
      );
      const result = auditPageSchema.parse(await response.json());
      if (controller.signal.aborted) return;
      setData(result);
      setPage(nextPage);
      setCursors(history);
    } catch (cause) {
      if (!controller.signal.aborted)
        setFailure(toFailure(cause, "No fue posible consultar la auditoría."));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function apply(next: AuditFilters) {
    setFilters(next);
    void load(next, null, 0, [null]);
  }
  function clearFilters() {
    // Clear inputs explicitly: a native reset would restore deep-link defaults.
    for (const element of Array.from(form.current?.elements ?? []))
      if (element instanceof HTMLInputElement) element.value = "";
      else if (element instanceof HTMLSelectElement) element.selectedIndex = 0;
    setErrors({});
    apply({});
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(
      [...new FormData(event.currentTarget).entries()].map(([key, value]) => [key, String(value)]),
    );
    const checked = validateFilters(values);
    setErrors(checked.errors);
    if (Object.keys(checked.errors).length > 0) {
      // Focus the first invalid field; the summary lists every error (UI/UX 21.3).
      const first = Object.keys(checked.errors)[0];
      requestAnimationFrame(() =>
        (form.current?.elements.namedItem(first!) as HTMLElement | null)?.focus(),
      );
      return;
    }
    apply(checked.filters);
  }
  const errorEntries = Object.entries(errors) as [AuditFilterName, string][];
  const described = describeFilters(filters);
  if (initialFailure?.kind === "forbidden" || initialFailure?.kind === "session")
    return (
      <main id="main-content" className="audit-layout">
        <header>
          <p className="eyebrow">Trazabilidad de operaciones</p>
          <h1>Auditoría</h1>
        </header>
        <ServiceState kind={initialFailure.kind} message={initialFailure.message} />
      </main>
    );
  return (
    <main id="main-content" className="audit-layout">
      <header>
        <p className="eyebrow">Trazabilidad de operaciones</p>
        <h1>Auditoría</h1>
        <p>
          Historial inmutable de acciones sensibles: nadie puede editarlo ni eliminarlo. Las fechas
          se muestran en UTC.
        </p>
      </header>
      <form
        ref={form}
        onSubmit={submit}
        className="audit-filters"
        aria-label="Filtros de auditoría"
        noValidate
      >
        {errorEntries.length > 0 && (
          <div role="alert" className="audit-form-errors">
            <p>Revisa {errorEntries.length === 1 ? "el filtro" : "los filtros"}:</p>
            <ul>
              {errorEntries.map(([name, message]) => (
                <li key={name}>
                  <a href={`#audit-${name}`}>
                    {FILTER_LABELS[name]}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {FIELDS.map((field) => (
          // Hints and errors sit outside the label so the accessible name stays the label text.
          <div key={field.name} className="audit-field">
            <label htmlFor={`audit-${field.name}`}>{FILTER_LABELS[field.name]}</label>
            <input
              id={`audit-${field.name}`}
              name={field.name}
              type={field.type ?? "text"}
              defaultValue={initialFilters[field.name] ?? ""}
              placeholder={field.placeholder}
              maxLength={80}
              aria-invalid={errors[field.name] ? true : undefined}
              aria-describedby={
                [
                  errors[field.name] ? `audit-${field.name}-error` : "",
                  field.hint ? `audit-${field.name}-hint` : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
            />
            {field.hint && (
              <small id={`audit-${field.name}-hint`} className="audit-hint">
                {field.hint}
              </small>
            )}
            {errors[field.name] && (
              <small id={`audit-${field.name}-error`} className="audit-field-error">
                {errors[field.name]}
              </small>
            )}
          </div>
        ))}
        <div className="audit-field">
          <label htmlFor="audit-result">Estado</label>
          <select id="audit-result" name="result" defaultValue={initialFilters.result ?? ""}>
            <option value="">Todos los estados</option>
            <option value="SUCCESS">Correcto</option>
            <option value="DENIED">Denegado</option>
            <option value="FAILED">Fallido</option>
          </select>
        </div>
        {canGlobal && (
          <>
            <div className="audit-field">
              <label htmlFor="audit-scope">Ámbito</label>
              <select
                id="audit-scope"
                name="scope"
                defaultValue={initialFilters.scope ?? "account"}
              >
                <option value="account">Cuenta actual</option>
                <option value="global">Global ICE24</option>
              </select>
            </div>
            <div className="audit-field">
              <label htmlFor="audit-accountId">Cuenta (ID, opcional)</label>
              <input
                id="audit-accountId"
                name="accountId"
                defaultValue={initialFilters.accountId ?? ""}
                placeholder="Filtrar una cuenta"
                aria-invalid={errors.accountId ? true : undefined}
              />
            </div>
          </>
        )}
        <div className="audit-actions">
          <button disabled={busy || !online} type="submit">
            Aplicar filtros
          </button>
          <button disabled={busy || !online} type="button" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>
      </form>
      {busy && <ServiceState kind="loading" title="Cargando eventos…" />}
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
          retryLabel={failure.kind === "conflict" ? "Recargar página" : "Reintentar"}
        />
      )}
      {data && (
        <section aria-label="Eventos de auditoría">
          {data.items.length ? (
            <>
              <p role="status">{`${data.items.length} eventos · Página ${page + 1}`}</p>
              {described && <p className="audit-active-filters">Filtros activos: {described}</p>}
            </>
          ) : (
            <ServiceState
              kind="empty"
              title="No hay eventos que coincidan con los filtros."
              message={
                described
                  ? `Filtros activos: ${described}.`
                  : "Todavía no hay acciones sensibles registradas en esta cuenta."
              }
            >
              {described && (
                <button type="button" onClick={clearFilters}>
                  Quitar filtros
                </button>
              )}
            </ServiceState>
          )}
          {!!data.items.length && (
            <div
              className="audit-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Tabla de eventos, desplazamiento horizontal"
            >
              <table>
                <caption>Eventos de auditoría, más recientes primero</caption>
                <thead>
                  <tr>
                    <th scope="col">Fecha UTC</th>
                    <th scope="col">Tipo de evento</th>
                    <th scope="col">Entidad</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Fecha UTC">{date(event.occurredAt)}</td>
                      <td data-label="Tipo de evento">{event.operation}</td>
                      <td data-label="Entidad">{event.entityType}</td>
                      <td data-label="Actor">{event.actorUserId ?? event.actorType}</td>
                      <td data-label="Estado">
                        <span
                          className={`audit-result audit-result--${event.result.toLowerCase()}`}
                        >
                          {outcomes[event.result]}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setDetail(event)}
                          aria-label={`Ver detalle de ${event.operation}`}
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
          <nav aria-label="Paginación de auditoría" className="audit-actions">
            <button
              type="button"
              disabled={busy || page === 0}
              onClick={() => void load(filters, cursors[page - 1] ?? null, page - 1, cursors)}
            >
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button
              type="button"
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
      {detail && (
        <div>
          <h2 ref={heading} tabIndex={-1}>
            Evento seleccionado
          </h2>
          <button type="button" onClick={() => setDetail(null)}>
            Cerrar detalle
          </button>
          <Detail
            event={detail}
            onCorrelation={() => {
              const next: AuditFilters = {
                ...(filters.scope ? { scope: filters.scope } : {}),
                correlationId: detail.correlationId,
              };
              const field = form.current?.elements.namedItem("correlationId");
              if (field instanceof HTMLInputElement) field.value = detail.correlationId;
              apply(next);
            }}
          />
        </div>
      )}
    </main>
  );
}
