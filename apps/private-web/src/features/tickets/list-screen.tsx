"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ticketPageSchema, type Ticket, type TicketPage } from "@ice24/contracts";
import {
  Button,
  ButtonLink,
  Card,
  ListLayout,
  PageWidth,
  Select,
  StatusTag,
  Table,
  ViewSwitcher,
  type TableColumn,
} from "@ice24/ui";
import { request, toFailure, type Failure } from "../../components/system-state/failure";
import { ServiceState } from "../../components/system-state/service-state";
import { useAccountAccess } from "../account-shell/access-provider";
import { MaintenanceNavigation } from "../maintenance/maintenance-navigation";
import { rowLinkId } from "../navigation/return-focus";
import { useViewPreference } from "../navigation/use-view-preference";
import {
  FILTER_KEYS,
  LIST_PATH,
  METRICS,
  PRIORITIES,
  TICKET_STATES,
  changeFilters,
  listHref,
  ticketAge,
  ticketQuery,
  ticketState,
  type TicketsAccess,
} from "./model";

export function TicketsListScreen({ contextId, permissions, demoOffline = false }: TicketsAccess) {
  const params = useSearchParams();
  const router = useRouter();
  const { online, canWrite } = useAccountAccess();
  const { view, changeView } = useViewPreference("tickets");
  const listParams = new URLSearchParams(params);
  // Preserve bookmarked legacy UUID pages; new web visits use the recent order explicitly.
  if (!listParams.has("sort") && !listParams.has("cursor")) listParams.set("sort", "recent");
  const query = ticketQuery(listParams).toString();
  const [result, setResult] = useState<{ query: string; data?: TicketPage; failure?: Failure }>();
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(true);
  const loading = !demoOffline && (pending || result?.query !== query);
  const data = result?.query === query ? result.data : undefined;
  const filterOptions = result?.data?.filters;
  const failure: Failure | undefined = demoOffline
    ? { kind: "offline", message: "Necesitas conexión para consultar los tickets.", status: 0 }
    : result?.query === query
      ? result.failure
      : undefined;
  const table = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (demoOffline) return;
    const controller = new AbortController();
    request(
      `/api/tickets?${query}`,
      { headers: { "x-ice24-workspace-context": contextId }, signal: controller.signal },
      "No fue posible consultar los tickets.",
    )
      .then((response) => response.json())
      .then(ticketPageSchema.parse)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ query, data });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setResult({ query, failure: toFailure(cause, "No fue posible consultar los tickets.") });
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });
    return () => controller.abort();
  }, [contextId, query, attempt, demoOffline]);
  useEffect(() => {
    if (!table.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setCompact((entry?.contentRect.width ?? 0) < 960),
    );
    observer.observe(table.current);
    return () => observer.disconnect();
  }, [loading, view, data]);
  const refresh = () => {
    setPending(true);
    setAttempt((value) => value + 1);
  };
  const change = (values: Record<string, string>) =>
    router.push(changeFilters(new URLSearchParams(params), values), { scroll: false });
  const active = FILTER_KEYS.filter((key) => params.get(key));
  const clear = () => change(Object.fromEntries(FILTER_KEYS.map((key) => [key, ""])));
  const columns: TableColumn<Ticket>[] = [
    { id: "folio", header: "Folio", mobile: "title", mono: true, cell: (row) => row.folio },
    { id: "machine", header: "Máquina", cell: (row) => row.machineCode },
    { id: "branch", header: "Sucursal", cell: (row) => row.branchName ?? "Sin registro" },
    { id: "system", header: "Sistema", cell: (row) => row.systemName },
    {
      id: "priority",
      header: "Prioridad",
      cell: (row) => (
        <StatusTag tone={PRIORITIES[row.priority].tone}>{PRIORITIES[row.priority].label}</StatusTag>
      ),
    },
    {
      id: "state",
      header: "Estado",
      cell: (row) => <StatusTag tone={ticketState(row).tone}>{ticketState(row).label}</StatusTag>,
    },
    {
      id: "reporter",
      header: "Reportado por",
      cell: (row) => row.reportedBy?.name ?? "Sin registro",
    },
    {
      id: "age",
      header: "Antigüedad",
      cell: (row) => ticketAge(row.createdAt, data?.summary?.asOf ?? row.createdAt),
    },
    { id: "assigned", header: "Asignado a", cell: (row) => row.assignedTo?.name ?? "Sin asignar" },
  ];
  const selectedMachine = params.get("machineId");
  const machineName = filterOptions?.machines.find((item) => item.id === selectedMachine)?.name;
  const metric = params.get("metric");
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Tickets de mantenimiento"
      data-page-ready={String(!loading)}
      className="uxd-tickets"
    >
      <ListLayout
        title="Tickets de mantenimiento"
        description="Consulta las fallas, su prioridad y quién las está atendiendo."
        actions={
          <>
            {permissions.includes("maintenance.tickets-create") && canWrite && online && (
              <ButtonLink icon="plus" href={`${LIST_PATH}/new`}>
                Reportar una falla
              </ButtonLink>
            )}
            <Button icon="refresh" variant="secondary" onClick={refresh} loading={loading}>
              Actualizar
            </Button>
          </>
        }
        summary={
          <div className="uxd-tickets__overview">
            <MaintenanceNavigation current="tickets" />
            <section aria-label="Resumen de tickets" className="uxd-tickets__metrics">
              {Object.entries(METRICS).map(([key, label]) => (
                <Card as="div" key={key} padding="md">
                  <Link
                    href={changeFilters(new URLSearchParams(params), {
                      metric: metric === key ? "" : key,
                      state: "",
                      priority: "",
                    })}
                    scroll={false}
                    aria-current={metric === key ? "true" : undefined}
                    className="uxd-tickets__metric"
                  >
                    <span>{label}</span>
                    <strong>
                      {loading ? "…" : (data?.summary?.[key as keyof typeof METRICS] ?? "—")}
                    </strong>
                    <span>{metric === key ? "Filtro activo" : "Ver tickets"}</span>
                  </Link>
                </Card>
              ))}
            </section>
            <p className="uxd-tickets__hint">
              Totales de todos los tickets a los que tienes acceso. Alta prioridad incluye alta y
              crítica abiertas. Hoy se calcula en la zona horaria de la cuenta.
            </p>
          </div>
        }
        filters={
          <>
            <Select
              label="Estado"
              value={params.get("state") ?? ""}
              onChange={(event) => change({ state: event.target.value, metric: "" })}
              options={[
                { value: "", label: "Todos los estados" },
                ...Object.entries(TICKET_STATES).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
            <Select
              label="Prioridad"
              value={params.get("priority") ?? ""}
              onChange={(event) => change({ priority: event.target.value, metric: "" })}
              options={[
                { value: "", label: "Todas las prioridades" },
                ...Object.entries(PRIORITIES).map(([value, item]) => ({
                  value,
                  label: item.label,
                })),
              ]}
            />
            <Select
              label="Sucursal"
              value={params.get("branchId") ?? ""}
              onChange={(event) => change({ branchId: event.target.value, machineId: "" })}
              options={[
                { value: "", label: "Todas las sucursales" },
                ...(filterOptions?.branches ?? []).map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              ]}
            />
            <Select
              label="Máquina"
              value={selectedMachine ?? ""}
              onChange={(event) => change({ machineId: event.target.value })}
              options={[
                { value: "", label: "Todas las máquinas" },
                ...(selectedMachine && !machineName
                  ? [{ value: selectedMachine, label: "Máquina seleccionada" }]
                  : []),
                ...(filterOptions?.machines ?? [])
                  .filter(
                    (item) => !params.get("branchId") || item.branchId === params.get("branchId"),
                  )
                  .map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <label className="uxd-tickets__date">
              Reportado desde
              <input
                type="date"
                value={params.get("from") ?? ""}
                onChange={(event) => change({ from: event.target.value })}
              />
            </label>
            <label className="uxd-tickets__date">
              Reportado hasta
              <input
                type="date"
                value={params.get("to") ?? ""}
                onChange={(event) => change({ to: event.target.value })}
              />
            </label>
          </>
        }
        activeFilters={active.length}
        banner={
          active.length > 0 && (
            <div className="uxd-tickets__toolbar" role="region" aria-label="Filtros activos">
              <p>
                {selectedMachine && `Máquina: ${machineName ?? "seleccionada"} · `}
                {metric && METRICS[metric as keyof typeof METRICS]
                  ? `${METRICS[metric as keyof typeof METRICS]} · `
                  : ""}
                {active.length} {active.length === 1 ? "filtro activo" : "filtros activos"}
              </p>
              <Button variant="tertiary" onClick={clear}>
                Quitar filtros
              </Button>
            </div>
          )
        }
        status={
          loading ? (
            <ServiceState kind="loading" title="Cargando tickets" skeleton="list" />
          ) : failure ? (
            <ServiceState {...failure} onRetry={refresh} />
          ) : undefined
        }
        pagination={
          data?.nextCursor && (
            <nav aria-label="Paginación de tickets">
              <ButtonLink
                variant="secondary"
                href={listHref(
                  new URLSearchParams({
                    ...Object.fromEntries(listParams),
                    cursor: data.nextCursor,
                  }),
                )}
              >
                Más tickets
              </ButtonLink>
            </nav>
          )
        }
      >
        <div className="uxd-tickets__toolbar">
          <p>
            {data?.total ?? data?.items.length ?? 0} tickets encontrados · {data?.items.length ?? 0}{" "}
            en esta página
          </p>
          <ViewSwitcher label="Vista de tickets" value={view} onChange={changeView} />
        </div>
        {data?.items.length ? (
          <div ref={table}>
            <Table
              caption="Tickets"
              columns={columns}
              rows={data.items}
              getRowId={(row) => row.id}
              getRowLabel={(row) => row.folio}
              getRowHref={(row) =>
                `${LIST_PATH}/${row.id}?volver=${encodeURIComponent(listHref(listParams))}`
              }
              getRowLinkId={(row) => rowLinkId(row.id)}
              view={view === "bloques" || compact ? "bloques" : "lista"}
            />
          </div>
        ) : (
          <ServiceState
            kind="empty"
            title="Sin tickets"
            message={
              active.length
                ? "No hay tickets que coincidan con estos filtros."
                : "Los reportes de las máquinas autorizadas aparecerán aquí."
            }
          />
        )}
      </ListLayout>
    </PageWidth>
  );
}
