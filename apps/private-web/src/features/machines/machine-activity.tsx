"use client";
import { useCallback, useState } from "react";
import { maintenancePageSchema } from "@ice24/contracts";
import { Button, Card } from "@ice24/ui";
import { MachineHistory } from "../equipment/machine-history";
import { useResource } from "../equipment/machine-configuration";
import { SectionState } from "../equipment/configuration-ui";
import type { EquipmentClient } from "../equipment/configuration-client";
import { MaintenanceCalendar } from "../maintenance/maintenance-calendar";
import type { machinePermissions } from "./detail-model";

export function MachineActivity({
  machineId,
  client,
  calendar = false,
  permissions,
  contextId = "",
}: {
  machineId: string;
  client: EquipmentClient;
  calendar?: boolean;
  contextId?: string;
  permissions: ReturnType<typeof machinePermissions>;
}) {
  const [path, setPath] = useState("timeline");
  const [cursor, setCursor] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  if (calendar)
    return permissions.maintenance ? (
      <MachineCalendar machineId={machineId} client={client} canAssign={permissions.assign} />
    ) : (
      <p>Tu rol no permite consultar el calendario de mantenimiento.</p>
    );
  const tabs = [
    ["timeline", "Movimientos"],
    ["location-history", "Ubicación"],
    ["ownership-history", "Propiedad"],
    ...(permissions.maintenance ? [["maintenance", "Mantenimientos"]] : []),
    ...(permissions.tickets ? [["tickets", "Tickets"]] : []),
    ...(permissions.audit ? [["audit", "Auditoría"]] : []),
  ];
  return (
    <Card title="Historial">
      <div role="group" aria-label="Tipo de historial" className="config-actions">
        {tabs.map(([id, label]) => (
          <Button
            key={id}
            variant="secondary"
            aria-pressed={path === id}
            onClick={() => {
              setPath(id!);
              setCursor(undefined);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      <MachineHistory
        key={`${path}:${cursor}:${attempt}`}
        machineId={machineId}
        path={path}
        client={client}
        contextId={contextId}
        cursor={cursor}
        onPage={(next) => setCursor(next ?? undefined)}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </Card>
  );
}
function MachineCalendar({
  machineId,
  client,
  canAssign,
}: {
  machineId: string;
  client: EquipmentClient;
  canAssign: boolean;
}) {
  const load = useCallback(
    async () =>
      maintenancePageSchema.parse(
        await client.get(`maintenance/activities?machineId=${machineId}&limit=100`),
      ),
    [client, machineId],
  );
  const { data, failure, reload } = useResource(load);
  if (!data) return <SectionState failure={failure} onRetry={reload} />;
  return (
    <Card title="Calendario" padding="flush" className="machine-detail__calendar">
      <MaintenanceCalendar
        items={data.items.filter((row) => row.machineId === machineId)}
        today={new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date())}
        canAssign={canAssign}
        partial={!!data.nextCursor}
      />
      {!data.items.length && <p>Sin actividades programadas para esta máquina.</p>}
    </Card>
  );
}
