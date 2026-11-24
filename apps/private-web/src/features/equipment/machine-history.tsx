"use client";
import { useCallback } from "react";
import {
  auditPageSchema,
  maintenancePageSchema,
  ticketPageSchema,
  machineHistoryRowSchema,
} from "@ice24/contracts";
import { Table, Button, ButtonLink } from "@ice24/ui";
import { request } from "../../components/system-state/failure";
import { SectionState } from "./configuration-ui";
import { useResource } from "./machine-configuration";
import type { EquipmentClient } from "./configuration-client";
import {
  formatFrequency,
  sourceLabel,
  type FrequencySource,
  type FrequencyValue,
} from "./configuration-model";
import { recordDate } from "../machines/detail-model";
import { MAINTENANCE_LABELS } from "../maintenance/maintenance-status";

type Row = {
  id?: string;
  status?: string;
  due_at?: string | null;
  occurred_at?: string;
  valid_from?: string;
  valid_to?: string | null;
  event_type?: string;
  reason?: string;
  kind?: string;
  definition?: { name?: string; schedule?: { frequency: FrequencyValue; source: FrequencySource } };
  component_catalog_id?: string;
};
const EVENTS: Record<string, string> = {
  MACHINE_APPROVED: "Máquina aprobada",
  MACHINE_METADATA: "Nombre o marca actualizados",
  MACHINE_OPERATIONAL_STATUS: "Estado operativo actualizado",
  MACHINE_MOVES: "Traslado de sucursal",
  MACHINE_RETIRE: "Retiro definitivo",
  MACHINE_TEMPLATE: "Plantilla actualizada",
  MACHINE_COMPONENT_ADDED: "Componente agregado",
  MACHINE_COMPONENT_UPDATED: "Componente actualizado",
  MACHINE_COMPONENT_ACTIVATED: "Componente activado",
  MACHINE_COMPONENT_DEACTIVATED: "Componente desactivado",
  MACHINE_COMPONENTS_PRELOADED: "Componentes de fábrica registrados",
  FREQUENCY_OVERRIDE_CREATED: "Frecuencia ajustada",
  SCHEDULE_RECALCULATED: "Calendario actualizado",
};
const eventLabel = (value: string) => EVENTS[value] ?? "Cambio registrado";
function historyLine(row: Row): string {
  const schedule = row.definition?.schedule;
  return [
    row.definition?.name ??
      (row.event_type
        ? eventLabel(row.event_type)
        : row.kind === "location"
          ? "Ubicación"
          : row.kind === "ownership"
            ? "Propiedad"
            : "Registro"),
    row.status
      ? ({
          pending: "Pendiente",
          completed: "Completado",
          cancelled: "Cancelado",
          in_progress: "En curso",
        }[row.status] ?? "Registrado")
      : "",
    recordDate(row.due_at ?? row.occurred_at ?? row.valid_from),
    row.valid_to ? `hasta ${recordDate(row.valid_to)}` : "",
    row.reason ?? "",
    schedule
      ? `cada ${formatFrequency(schedule.frequency)} (${sourceLabel(schedule.source, !!row.component_catalog_id)})`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
type Entry = { id: string; text: string; date: string; href?: string };
export interface HistoryResult {
  rows: Entry[];
  next: string | null;
}

/** The former embedded MachineHistory, extended with the existing maintenance/ticket/audit APIs. */
export function MachineHistory({
  machineId,
  path,
  client,
  onRetry,
  contextId = "",
  cursor,
  onPage,
}: {
  machineId: string;
  path: string;
  client: EquipmentClient;
  onRetry: () => void;
  contextId?: string;
  cursor?: string | undefined;
  onPage?: (cursor: string | null) => void;
}) {
  const load = useCallback(async (): Promise<HistoryResult> => {
    const query = new URLSearchParams({ machineId, limit: "50", ...(cursor ? { cursor } : {}) });
    if (path === "audit") {
      const response = await request(
        `/api/audit?${query}`,
        { cache: "no-store", headers: { "x-ice24-workspace-context": contextId } },
        "No fue posible consultar la auditoría.",
      );
      const page = auditPageSchema.parse(await response.json());
      // shortcut: el demo de auditoría no filtra por machineId; quitar cuando se fusione #83 y se agregue el filtro al demo
      const entries = page.items.filter((entry) => entry.machineId === machineId);
      return {
        rows: entries.map((entry) => ({
          id: entry.id,
          text: `${eventLabel(entry.operation)} · ${entry.actorName ?? "Sistema"}${entry.reason ? ` · ${entry.reason}` : ""}`,
          date: recordDate(entry.occurredAt, entry.timeZone),
        })),
        next: page.page.nextCursor,
      };
    }
    if (path === "tickets") {
      const page = ticketPageSchema.parse(await client.get(`tickets?${query}`));
      return {
        rows: page.items
          .filter((row) => row.machineId === machineId)
          .map((row) => ({
            id: row.id,
            text: `${row.folio} · ${row.description} · ${{ pending_assignment: "Pendiente de asignación", in_progress: "En atención", completed: "Completado", cancelled: "Cancelado" }[row.state]}`,
            date: recordDate(row.createdAt),
            href: `/maintenance/tickets/${row.id}`,
          })),
        next: page.nextCursor,
      };
    }
    if (path === "maintenance") {
      const page = maintenancePageSchema.parse(await client.get(`maintenance/activities?${query}`));
      return {
        rows: page.items
          .filter((row) => row.machineId === machineId)
          .map((row) => ({
            id: row.id,
            text: `${row.name} · ${MAINTENANCE_LABELS[row.state]}`,
            date: recordDate(row.dueAt, row.timezone),
          })),
        next: page.nextCursor,
      };
    }
    const rows = machineHistoryRowSchema
      .array()
      .parse(await client.get(`machines/${machineId}/${path}`));
    return {
      rows: rows.map((row, index) => ({
        id: row.id ?? String(index),
        text: historyLine(row as Row),
        date: recordDate(row.due_at ?? row.occurred_at ?? row.valid_from),
      })),
      next: null,
    };
  }, [client, machineId, path, contextId, cursor]);
  const { data, failure } = useResource(load);
  if (!data) return <SectionState failure={failure} onRetry={onRetry} />;
  return (
    <>
      {data.rows.length ? (
        <Table
          caption="Registros de la máquina"
          columns={[
            {
              id: "text",
              header: "Registro",
              mobile: "title",
              cell: (row) =>
                row.href ? (
                  <ButtonLink variant="tertiary" href={row.href}>
                    {row.text}
                  </ButtonLink>
                ) : (
                  row.text
                ),
            },
            { id: "date", header: "Fecha", cell: (row) => row.date },
          ]}
          rows={data.rows}
          getRowId={(row) => row.id}
        />
      ) : (
        <p>Sin registros para esta máquina.</p>
      )}
      {onPage && (
        <div className="config-actions">
          {cursor && (
            <Button variant="secondary" type="button" onClick={() => onPage(null)}>
              Volver al inicio
            </Button>
          )}
          {data.next && (
            <Button variant="secondary" type="button" onClick={() => onPage(data.next)}>
              Más registros
            </Button>
          )}
        </div>
      )}
    </>
  );
}
