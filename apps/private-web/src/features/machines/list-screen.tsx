"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MachineOverview } from "@ice24/contracts";
import {
  Button,
  Card,
  ListLayout,
  PageWidth,
  Select,
  StatusTag,
  Table,
  TextField,
  ViewSwitcher,
  type TableColumn,
  type TableSort,
} from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import type { Failure } from "../../components/system-state/failure";
import { useViewPreference } from "../navigation/use-view-preference";
import { rowLinkId } from "../navigation/return-focus";
import { machineRows, maintenanceDate, OPERATION } from "./model";

function MachineStatus({ row }: { row: MachineOverview }) {
  const status = OPERATION[row.operational_status];
  return (
    <StatusTag tone={status.tone} dimension="Estado operativo">
      {status.label}
    </StatusTag>
  );
}
const columns: TableColumn<MachineOverview>[] = [
  { id: "folio", header: "Folio", cell: (row) => row.machine_code, sortable: true, mono: true },
  { id: "name", header: "Nombre", cell: (row) => row.name, sortable: true, mobile: "title" },
  { id: "branch", header: "Sucursal", cell: (row) => row.branchName, sortable: true },
  {
    id: "status",
    header: "Estado operativo",
    cell: (row) => <MachineStatus row={row} />,
    sortable: true,
  },
  {
    id: "last",
    header: "Último mantenimiento",
    cell: (row) => maintenanceDate(row.lastMaintenanceAt, "Sin registro"),
    sortable: true,
  },
  {
    id: "next",
    header: "Próximo mantenimiento",
    cell: (row) => maintenanceDate(row.nextMaintenanceAt, "Sin programar"),
    sortable: true,
  },
  {
    id: "tickets",
    header: "Tickets abiertos",
    cell: (row) => row.openTickets,
    sortable: true,
    numeric: true,
  },
];
// UXD-04 owns this destination. The existing ?machineId entry remains independently available.
const href = (row: MachineOverview) => `/machines/${row.id}`;

export function MachineList({
  rows,
  loading,
  failure,
  updatedAt,
  refresh,
  navigation,
  banner,
}: {
  rows: readonly MachineOverview[];
  loading: boolean;
  failure?: Failure | undefined;
  updatedAt: string;
  refresh: () => void;
  navigation: ReactNode;
  banner?: ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const { view, changeView } = useViewPreference("machines");
  const query = params.get("q") ?? "";
  // `sucursal` belongs to the shell's context-switch deep links, not to list filtering.
  const branch = params.get("sucursalFiltro") ?? "";
  const state = params.get("estado") ?? "";
  const sort: TableSort = {
    columnId: params.get("orden") ?? "folio",
    direction: params.get("direccion") === "desc" ? "descending" : "ascending",
  };
  const visible = machineRows(rows, query, branch, state, sort);
  const branches = [...new Map(rows.map((row) => [row.branch_id, row.branchName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1], "es-MX"),
  );
  const tableContainer = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const element = tableContainer.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    // Reflow at browser zoom uses the approved Table cards and produces no view announcement.
    const observer = new ResizeObserver(([entry]) =>
      setCompact((entry?.contentRect.width ?? 0) < 1024),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [view, loading, failure, visible.length]);
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete("machineId");
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    router.replace(`/machines?${next}`, { scroll: false });
  };
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Máquinas"
      data-page-ready={String(!loading)}
      className="machines-screen"
    >
      <ListLayout
        title="Máquinas"
        description="Consulta el estado, los mantenimientos y los tickets de cada máquina."
        actions={
          <Button
            variant="secondary"
            icon="refresh"
            loading={loading}
            aria-busy={loading}
            onClick={refresh}
          >
            Actualizar datos
          </Button>
        }
        summary={navigation}
        banner={banner}
        filters={
          <>
            <TextField
              label="Buscar máquinas"
              type="search"
              value={query}
              onChange={(event) => change({ q: event.target.value })}
              placeholder="Folio, serie o nombre"
            />
            <Select
              label="Sucursal"
              value={branch}
              onChange={(event) => change({ sucursalFiltro: event.target.value })}
              options={[
                { value: "", label: "Todas las sucursales" },
                ...branches.map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              label="Estado operativo"
              value={state}
              onChange={(event) => change({ estado: event.target.value })}
              options={[
                { value: "", label: "Todos los estados" },
                ...Object.entries(OPERATION).map(([value, status]) => ({
                  value,
                  label: status.label,
                })),
              ]}
            />
          </>
        }
        activeFilters={Number(Boolean(query)) + Number(Boolean(branch)) + Number(Boolean(state))}
        status={
          loading ? (
            <ServiceState kind="loading" skeleton="list" />
          ) : failure ? (
            <ServiceState {...failure} onRetry={refresh} />
          ) : undefined
        }
      >
        <div className="machines-toolbar">
          <p>
            {visible.length} {visible.length === 1 ? "máquina" : "máquinas"}
            {updatedAt && <> · Actualizado a las {updatedAt}</>}
          </p>
          <ViewSwitcher value={view} onChange={changeView} label="Vista de máquinas" />
        </div>
        {rows.length === 200 && (
          <p>Se muestran hasta 200 máquinas. Los filtros se aplican a estas máquinas.</p>
        )}
        {!visible.length ? (
          <ServiceState
            kind="empty"
            title="Sin máquinas"
            message={
              rows.length
                ? "No hay máquinas que coincidan con estos filtros."
                : "Todavía no hay máquinas en este contexto."
            }
          />
        ) : view === "lista" ? (
          <div ref={tableContainer} className="machines-table">
            <Table
              caption="Máquinas"
              columns={columns}
              rows={visible}
              getRowId={(row) => row.id}
              getRowHref={href}
              getRowLinkId={(row) => rowLinkId(row.id)}
              view={compact ? "bloques" : "lista"}
              sort={sort}
              sortMode="server"
              onSortChange={(next) =>
                change({
                  orden: next.columnId,
                  direccion: next.direction === "descending" ? "desc" : "asc",
                })
              }
            />
          </div>
        ) : (
          <section aria-label="Máquinas en bloques" className="machines-grid">
            {visible.map((row) => (
              <Card
                as="article"
                key={row.id}
                icon="machine"
                title={
                  <a id={rowLinkId(row.id)} data-row-link href={href(row)}>
                    {row.name}
                  </a>
                }
                description={row.machine_code}
              >
                <div className="machines-stack">
                  <p>{row.branchName}</p>
                  <MachineStatus row={row} />
                  <p>
                    Próximo mantenimiento: {maintenanceDate(row.nextMaintenanceAt, "Sin programar")}
                  </p>
                  <p>Tickets abiertos: {row.openTickets}</p>
                </div>
              </Card>
            ))}
          </section>
        )}
      </ListLayout>
    </PageWidth>
  );
}
