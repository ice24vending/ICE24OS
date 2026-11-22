"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BranchOverview, BranchDetail } from "@ice24/contracts";
import {
  Button,
  ButtonLink,
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
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useAccountAccess } from "../account-shell/access-provider";
import { createEquipmentClient } from "../equipment/configuration-client";
import { rowLinkId } from "../navigation/return-focus";
import { useViewPreference } from "../navigation/use-view-preference";
import { BranchDetailScreen } from "./detail-screen";
import { address, branchRows, machineTotal, OPERATION } from "./model";

export function BranchStatus({ row }: { row: BranchOverview }) {
  return (
    <StatusTag tone={row.status === "active" ? "success" : "nodata"} dimension="Sucursal">
      {row.status === "active" ? "Activa" : "Archivada"}
    </StatusTag>
  );
}
const columns: TableColumn<BranchOverview>[] = [
  { id: "name", header: "Nombre", cell: (row) => row.data.name, sortable: true, mobile: "title" },
  {
    id: "code",
    header: "Código",
    cell: (row) => row.data.code || "Sin capturar",
    sortable: true,
    mono: true,
  },
  { id: "address", header: "Dirección / ciudad", cell: address, sortable: true },
  {
    id: "machines",
    header: "Máquinas",
    cell: (row) =>
      `${machineTotal(row)} en total · ${row.machineCounts.out_of_service ?? 0} fuera de servicio`,
    sortable: true,
  },
  { id: "responsible", header: "Responsable", cell: (row) => row.responsible, sortable: true },
  { id: "status", header: "Estado", cell: (row) => <BranchStatus row={row} />, sortable: true },
];
export function BranchList({
  rows,
  canCreate,
  refresh,
  loading,
  updatedAt,
  failure,
}: {
  rows: BranchOverview[];
  canCreate: boolean;
  refresh: () => void;
  loading: boolean;
  updatedAt: string;
  failure?: Failure | undefined;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const { view, changeView } = useViewPreference("branches");
  const tableContainer = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const query = params.get("q") ?? "";
  const state = params.get("estado") ?? "";
  const sort: TableSort = {
    columnId: params.get("orden") ?? "name",
    direction: params.get("direccion") === "desc" ? "descending" : "ascending",
  };
  const visible = branchRows(rows, query, state, sort);
  useEffect(() => {
    const element = tableContainer.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    // Browser zoom can reduce the content while the viewport media query stays wide.
    // Reuse Table's approved card presentation; automatic reflow makes no live announcement.
    const observer = new ResizeObserver(([entry]) =>
      setCompact((entry?.contentRect.width ?? 0) < 768),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [view, loading, failure, visible.length]);
  const back = new URLSearchParams(params);
  back.delete("volverA");
  const origin = `/branches${back.size ? `?${back}` : ""}`;
  const href = (row: BranchOverview) => `/branches/${row.id}?origen=${encodeURIComponent(origin)}`;
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.delete("volverA");
    Object.entries(values).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    router.replace(`/branches?${next}`, { scroll: false });
  };
  return (
    <PageWidth
      as="main"
      id="main-content"
      aria-label="Sucursales"
      data-page-ready={String(!loading)}
      className="branches-screen"
    >
      <ListLayout
        title="Sucursales"
        description="Consulta las ubicaciones y el estado de sus máquinas."
        actions={
          <>
            <Button variant="secondary" icon="refresh" loading={loading} onClick={refresh}>
              Actualizar datos
            </Button>
            {canCreate && (
              <ButtonLink
                variant="primary"
                icon="plus"
                href={`/branches/new?origen=${encodeURIComponent(origin)}`}
              >
                Nueva sucursal
              </ButtonLink>
            )}
          </>
        }
        filters={
          <>
            <TextField
              label="Buscar sucursales"
              type="search"
              value={query}
              onChange={(event) => change({ q: event.target.value })}
              placeholder="Nombre, código o ciudad"
            />
            <Select
              label="Estado de la sucursal"
              value={state}
              onChange={(event) => change({ estado: event.target.value })}
              options={[
                { value: "", label: "Todas" },
                { value: "active", label: "Activas" },
                { value: "archived", label: "Archivadas" },
              ]}
            />
          </>
        }
        activeFilters={Number(Boolean(query)) + Number(Boolean(state))}
        status={
          loading ? (
            <ServiceState kind="loading" skeleton="list" />
          ) : failure ? (
            <ServiceState {...failure} onRetry={refresh} />
          ) : undefined
        }
      >
        <div className="branches-toolbar">
          <p>
            {visible.length} {visible.length === 1 ? "sucursal" : "sucursales"}
            {updatedAt && <> · Actualizado a las {updatedAt}</>}
          </p>
          <ViewSwitcher value={view} onChange={changeView} label="Vista de sucursales" />
        </div>
        {!visible.length ? (
          <ServiceState
            kind="empty"
            title="Sin sucursales"
            message={
              rows.length
                ? "No hay sucursales que coincidan con estos filtros."
                : "Todavía no hay sucursales en este contexto."
            }
          />
        ) : view === "lista" ? (
          <div ref={tableContainer} className="branches-table">
            <Table
              view={compact ? "bloques" : "lista"}
              caption="Sucursales"
              columns={columns}
              rows={visible}
              getRowId={(row) => row.id}
              getRowHref={href}
              getRowLinkId={(row) => rowLinkId(row.id)}
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
          <section aria-label="Sucursales en bloques" className="branches-grid">
            {visible.map((row) => (
              <Card
                as="article"
                key={row.id}
                title={
                  <a id={rowLinkId(row.id)} data-row-link href={href(row)}>
                    {row.data.name}
                  </a>
                }
                description={address(row)}
                icon="building"
              >
                <div className="branches-stack">
                  <BranchStatus row={row} />
                  <p>Código: {row.data.code || "Sin capturar"}</p>
                  <p>Responsable: {row.responsible}</p>
                  <strong>{machineTotal(row)} máquinas</strong>
                  <ul className="branches-counts">
                    {Object.entries(row.machineCounts).map(([state, count]) => (
                      <li key={state}>
                        <StatusTag tone={OPERATION[state]?.tone ?? "nodata"}>
                          {count} {OPERATION[state]?.label.toLowerCase() ?? "sin clasificar"}
                        </StatusTag>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </section>
        )}
      </ListLayout>
    </PageWidth>
  );
}
export function BranchesScreen({
  id,
  create = false,
  contextId,
  csrfToken,
}: {
  id?: string | undefined;
  create?: boolean;
  contextId: string;
  csrfToken: string;
}) {
  const client = useMemo(() => createEquipmentClient(contextId, csrfToken), [contextId, csrfToken]);
  const { canWrite, online, syncMode } = useAccountAccess();
  const [rows, setRows] = useState<BranchOverview[]>([]);
  const [detail, setDetail] = useState<BranchDetail>();
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure>();
  const [updatedAt, setUpdatedAt] = useState("");
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setFailure(undefined);
      try {
        const [access, content] = await Promise.all([
          client.get<{ canManage: boolean; accountWide: boolean; accessMode: string }>(
            "equipment-workspace",
          ),
          create
            ? Promise.resolve(null)
            : client.get<BranchOverview[] | BranchDetail>(
                id ? `branches/${id}/overview` : "branches/overview",
              ),
        ]);
        if (!active) return;
        syncMode(access.accessMode);
        setCanManage(access.canManage && access.accountWide);
        if (Array.isArray(content)) setRows(content);
        else if (content) setDetail(content);
        setUpdatedAt(
          new Intl.DateTimeFormat("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Mexico_City",
          }).format(new Date()),
        );
      } catch (error) {
        if (active) {
          setCanManage(false);
          setFailure(toFailure(error, "No fue posible cargar las sucursales."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt, client, create, id, syncMode]);
  const canEdit = canManage && canWrite && online;
  if (id || create)
    return (
      <BranchDetailScreen
        detail={detail}
        create={create}
        canEdit={canEdit}
        loading={loading}
        failure={failure}
        client={client}
        refresh={refresh}
      />
    );
  return (
    <BranchList
      rows={rows}
      canCreate={canEdit}
      refresh={refresh}
      loading={loading}
      updatedAt={updatedAt}
      failure={failure}
    />
  );
}
