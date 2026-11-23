"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  Button,
  ButtonLink,
  ListLayout,
  LiveRegion,
  StatusTag,
  Table,
  type TableColumn,
} from "@ice24/ui";
import { auditPageSchema, type AuditEvent, type AuditPage } from "@ice24/contracts";
import {
  request,
  toFailure,
  type Failure,
  type FailureKind,
} from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { useAccountAccess } from "../account-shell/access-provider";
import {
  AUDIT_PAGE_SIZE,
  FILTER_LABELS,
  auditDetailHref,
  auditLocation,
  auditReturn,
  describeFilters,
  toQuery,
  validateFilters,
  type AuditFilterName,
  type AuditFilters,
  type AuditPagination,
} from "./filters";
import {
  actorLabel,
  auditDate,
  entityLabel,
  operationLabel,
  ENTITY_GROUPS,
  EVENT_GROUPS,
  OUTCOMES,
} from "./labels";
import { AuditPageContent } from "./page-frame";

export interface InitialFailure {
  kind: FailureKind;
  message: string;
  correlationId?: string | undefined;
}
const subscribe = () => () => undefined;
export const useAuditReady = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
export function AuditResult({ result }: { result: AuditEvent["result"] }) {
  return (
    <StatusTag
      tone={result === "SUCCESS" ? "success" : "danger"}
      icon={result === "SUCCESS" ? "check" : "warning"}
    >
      {OUTCOMES[result]}
    </StatusTag>
  );
}
const columns: TableColumn<AuditEvent>[] = [
  {
    id: "event",
    header: "Tipo de evento",
    mobile: "title",
    cell: (event) => (
      <>
        <span className="ids-visually-hidden">Ver detalle de </span>
        {operationLabel(event.operation)}
      </>
    ),
  },
  {
    id: "date",
    header: "Fecha local",
    cell: (event) => (
      <time className="audit-date" dateTime={event.occurredAt} title={event.timeZone}>
        {auditDate(event.occurredAt, event.timeZone, true)}
      </time>
    ),
  },
  { id: "entity", header: "Entidad", cell: (event) => entityLabel(event.entityType) },
  { id: "actor", header: "Actor", cell: actorLabel },
  { id: "result", header: "Estado", cell: (event) => <AuditResult result={event.result} /> },
];
const ID_FIELDS: AuditFilterName[] = [
  "actorUserId",
  "entityId",
  "correlationId",
  "branchId",
  "machineId",
];

export function AuditViewer({
  contextId,
  initial,
  initialFailure,
  initialFilters,
  initialErrors,
  canGlobal,
  initialPagination = { page: 0, cursors: [null] },
  returnTo,
}: {
  contextId: string;
  initial: AuditPage | null;
  initialFailure: InitialFailure | null;
  initialFilters: AuditFilters;
  initialErrors: Partial<Record<AuditFilterName, string>>;
  canGlobal: boolean;
  initialPagination?: AuditPagination;
  returnTo?: string | undefined;
}) {
  const ready = useAuditReady();
  const { online } = useAccountAccess();
  const [data, setData] = useState(initial);
  const [failure, setFailure] = useState<Failure | InitialFailure | null>(initialFailure);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [errors, setErrors] = useState(initialErrors);
  const [pagination, setPagination] = useState(initialPagination);
  const active = useRef<AbortController | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const origin = auditLocation(filters, pagination);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    const pop = () => window.location.reload();
    window.addEventListener("pageshow", restore);
    window.addEventListener("popstate", pop);
    return () => {
      active.current?.abort();
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  async function load(next: AuditFilters, nextPagination: AuditPagination) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailure(null);
    setData(null);
    setFilters(next);
    setPagination(nextPagination);
    try {
      const params = new URLSearchParams(toQuery(next));
      params.set("limit", String(AUDIT_PAGE_SIZE));
      const cursor = nextPagination.cursors[nextPagination.page];
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
      setPagination(nextPagination);
      setFilters(next);
      const location = new URL(auditLocation(next, nextPagination), window.location.origin);
      if (returnTo) location.searchParams.set("origen", auditReturn(returnTo));
      window.history.replaceState(null, "", location.pathname + location.search);
    } catch (cause) {
      if (!controller.signal.aborted)
        setFailure(toFailure(cause, "No fue posible consultar la auditoría."));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function clearFilters() {
    for (const element of Array.from(form.current?.elements ?? [])) {
      if (element instanceof HTMLInputElement) element.value = "";
      else if (element instanceof HTMLSelectElement) element.selectedIndex = 0;
    }
    setErrors({});
    void load({}, { page: 0, cursors: [null] });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateFilters(
      Object.fromEntries(
        [...new FormData(event.currentTarget).entries()].map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
    );
    setErrors(checked.errors);
    const first = Object.keys(checked.errors)[0];
    if (first) {
      requestAnimationFrame(() => {
        const input = form.current?.elements.namedItem(first) as HTMLElement | null;
        input?.closest("details")?.setAttribute("open", "");
        input?.focus();
      });
    } else void load(checked.filters, { page: 0, cursors: [null] });
  }
  const field = (name: AuditFilterName, type = "text") => (
    <div key={name} className="audit-field">
      <label htmlFor={`audit-${name}`}>{FILTER_LABELS[name]}</label>
      <input
        id={`audit-${name}`}
        name={name}
        type={type}
        defaultValue={initialFilters[name] ?? ""}
        maxLength={80}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `audit-${name}-error` : undefined}
      />
      {errors[name] && <small id={`audit-${name}-error`}>{errors[name]}</small>}
    </div>
  );
  const select = (name: "operation" | "entityType", groups: typeof EVENT_GROUPS) => {
    const value = initialFilters[name];
    const unknown =
      value && !groups.some((group) => group.options.some((option) => option.value === value));
    return (
      <div className="audit-field">
        <label htmlFor={`audit-${name}`}>{FILTER_LABELS[name]}</label>
        <select id={`audit-${name}`} name={name} defaultValue={value ?? ""}>
          <option value="">
            {name === "operation" ? "Todos los eventos" : "Todas las entidades"}
          </option>
          {unknown && (
            <option value={value}>{name === "operation" ? "Otro evento" : "Otro registro"}</option>
          )}
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    );
  };
  const denied = failure?.kind === "forbidden" || failure?.kind === "session";
  const described = describeFilters(filters);
  const status = busy ? (
    <ServiceState kind="loading" title="Cargando eventos…" />
  ) : failure ? (
    <ServiceState
      {...failure}
      onRetry={
        denied
          ? undefined
          : failure.kind === "conflict"
            ? () => window.location.reload()
            : () => void load(filters, pagination)
      }
      retryLabel={failure.kind === "conflict" ? "Recargar página" : "Reintentar"}
    />
  ) : !online && !data ? (
    <ServiceState kind="offline" />
  ) : undefined;
  return (
    <AuditPageContent title="Auditoría" ready={ready}>
      <ListLayout
        title="Auditoría"
        description="Consulta quién hizo cada cambio y su resultado. Las fechas de la lista usan la zona horaria del evento."
        actions={
          returnTo ? (
            <ButtonLink href={auditReturn(returnTo)} variant="tertiary" icon="chevron-left">
              Volver a la lista
            </ButtonLink>
          ) : undefined
        }
        activeFilters={Object.keys(filters).length}
        status={status}
        filters={
          !denied && (
            <form
              ref={form}
              onSubmit={submit}
              className="audit-filters"
              aria-label="Filtros de auditoría"
              noValidate
            >
              <LiveRegion as="div" role="alert" className="audit-form-errors">
                {Object.keys(errors).length ? <p>Revisa los filtros indicados.</p> : null}
              </LiveRegion>
              {field("from", "date")}
              {field("to", "date")}
              {select("operation", EVENT_GROUPS)}
              {select("entityType", ENTITY_GROUPS)}
              <div className="audit-field">
                <label htmlFor="audit-result">Estado</label>
                <select id="audit-result" name="result" defaultValue={initialFilters.result ?? ""}>
                  <option value="">Todos los estados</option>
                  {Object.entries(OUTCOMES).map(([code, text]) => (
                    <option key={code} value={code}>
                      {text}
                    </option>
                  ))}
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
                  {field("accountId")}
                </>
              )}
              <details
                className="audit-advanced"
                open={ID_FIELDS.some((name) => initialFilters[name] || errors[name])}
              >
                <summary>Filtros avanzados por identificador</summary>
                <div className="audit-advanced__fields">{ID_FIELDS.map((name) => field(name))}</div>
              </details>
              <div className="audit-actions">
                <Button
                  icon="filter"
                  variant="secondary"
                  type="submit"
                  disabled={!ready || busy || !online}
                >
                  Aplicar filtros
                </Button>
                <Button
                  icon="close"
                  variant="tertiary"
                  type="button"
                  disabled={!ready || busy || !online}
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </Button>
              </div>
            </form>
          )
        }
        pagination={
          data &&
          !!data.items.length && (
            <nav aria-label="Paginación de auditoría" className="audit-actions">
              <Button
                icon="chevron-left"
                variant="secondary"
                disabled={busy || !online || pagination.page === 0}
                onClick={() =>
                  void load(filters, {
                    ...pagination,
                    page: pagination.page - 1,
                    cursors: pagination.cursors.slice(0, pagination.page),
                  })
                }
              >
                Anterior
              </Button>
              <span>Página {pagination.page + 1}</span>
              <Button
                icon="chevron-right"
                variant="secondary"
                disabled={busy || !online || !data.page.hasMore}
                onClick={() =>
                  void load(filters, {
                    page: pagination.page + 1,
                    cursors: [...pagination.cursors, data.page.nextCursor],
                  })
                }
              >
                Siguiente
              </Button>
            </nav>
          )
        }
      >
        {data && (
          <section aria-label="Eventos de auditoría">
            <LiveRegion as="p">{`${data.items.length} ${data.items.length === 1 ? "evento" : "eventos"} · Página ${pagination.page + 1}`}</LiveRegion>
            {described && <p className="audit-active-filters">Filtros activos: {described}</p>}
            <Table
              caption="Eventos de auditoría, más recientes primero"
              columns={columns}
              rows={data.items}
              getRowId={(event) => event.id}
              getRowHref={(event) => auditDetailHref(event.id, origin, filters.scope === "global")}
              getRowLinkId={(event) => `audit-${event.id}`}
              empty={
                <ServiceState
                  kind="empty"
                  title="No hay eventos que coincidan con los filtros."
                  message="Prueba con otras fechas o quita los filtros."
                >
                  {described && (
                    <Button icon="close" variant="tertiary" onClick={clearFilters}>
                      Quitar filtros
                    </Button>
                  )}
                </ServiceState>
              }
            />
          </section>
        )}
      </ListLayout>
    </AuditPageContent>
  );
}
