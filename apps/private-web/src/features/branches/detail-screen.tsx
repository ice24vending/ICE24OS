"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { maintenancePageSchema, type BranchDetail, type ScheduledActivity } from "@ice24/contracts";
import { Button, Card, DetailLayout, PageWidth, StatusTag, Table } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import type { EquipmentClient } from "../equipment/configuration-client";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { BranchForm } from "./branch-form";
import { BranchStatus } from "./list-screen";
import { branchReturn, OPERATION } from "./model";

function Maintenance({ id, client }: { id: string; client: EquipmentClient }) {
  const [rows, setRows] = useState<ScheduledActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setFailure(undefined);
      try {
        const items: ScheduledActivity[] = [];
        let cursor: string | null = null;
        do {
          const query = new URLSearchParams({
            branchId: id,
            period: "next7days",
            limit: "100",
            ...(cursor ? { cursor } : {}),
          });
          const page = maintenancePageSchema.parse(
            await client.get(`maintenance/activities?${query}`),
          );
          items.push(...page.items);
          cursor = page.nextCursor;
        } while (cursor && active);
        if (active) setRows(items.sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? "")));
      } catch (error) {
        if (active) setFailure(toFailure(error, "No fue posible cargar los mantenimientos."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt, client, id]);
  return (
    <Card
      title="Próximos mantenimientos"
      description="Actividades previstas para los próximos siete días."
    >
      {loading ? (
        <ServiceState kind="loading" />
      ) : failure ? (
        <ServiceState {...failure} onRetry={() => setAttempt((value) => value + 1)} />
      ) : !rows.length ? (
        <ServiceState
          kind="empty"
          title="Sin mantenimientos próximos"
          message="No hay actividades programadas para los próximos siete días."
        />
      ) : (
        <Table
          caption="Próximos mantenimientos de la sucursal"
          columns={[
            { id: "name", header: "Actividad", cell: (row) => row.name, mobile: "title" },
            { id: "machine", header: "Máquina", cell: (row) => row.machineCode },
            {
              id: "date",
              header: "Fecha prevista",
              cell: (row) =>
                row.dueAt
                  ? new Intl.DateTimeFormat("es-MX", {
                      dateStyle: "medium",
                      timeZone: row.timezone,
                    }).format(new Date(row.dueAt))
                  : "Sin fecha",
            },
          ]}
          rows={rows}
          getRowId={(row) => row.id}
        />
      )}
    </Card>
  );
}
export function BranchDetailScreen({
  detail,
  create,
  canEdit,
  loading,
  failure,
  client,
  refresh,
}: {
  detail?: BranchDetail | undefined;
  create: boolean;
  canEdit: boolean;
  loading: boolean;
  failure?: Failure | undefined;
  client: EquipmentClient;
  refresh: () => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const back = branchReturn(params.get("origen"));
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState("");
  const branch = detail?.branch;
  const title = create ? "Nueva sucursal" : (branch?.data.name ?? "Detalle de sucursal");
  return (
    <PageWidth
      as="main"
      variant={create || editing ? "reading" : "full"}
      id="main-content"
      aria-label={title}
      className="branches-screen"
      data-page-ready={String(!loading)}
      data-page-breadcrumbs="true"
    >
      <DetailLayout
        title={title}
        identifier={branch?.data.code}
        breadcrumbs={[{ label: "Sucursales", href: back }, { label: title }]}
        backLink={
          !create && branch ? (
            <ReturnLink href={back} linkId={rowLinkId(branch.id)} listName="Sucursales" />
          ) : undefined
        }
        statuses={branch && <BranchStatus row={branch} />}
        actions={
          !create &&
          !editing &&
          canEdit && (
            <Button icon="edit" onClick={() => setEditing(true)}>
              Editar
            </Button>
          )
        }
        status={
          loading ? (
            <ServiceState kind="loading" />
          ) : failure ? (
            <ServiceState {...failure} onRetry={refresh} />
          ) : create && !canEdit ? (
            <ServiceState
              kind="forbidden"
              title="Alta no disponible"
              message="Tu acceso actual permite consultar las sucursales, pero no crear una nueva."
            />
          ) : undefined
        }
        summary={
          <div className="branches-stack">
            <p role="status">{saved}</p>
            {create || editing ? (
              <BranchForm
                branch={branch}
                client={client}
                backHref={back}
                onCancel={create ? undefined : () => setEditing(false)}
                onSaved={(row) => {
                  setSaved("Sucursal guardada correctamente.");
                  setEditing(false);
                  if (create)
                    router.replace(`/branches/${row.id}?origen=${encodeURIComponent(back)}`);
                  else refresh();
                }}
              />
            ) : (
              branch && (
                <>
                  <Card title="Datos de la sucursal">
                    <dl className="branches-data">
                      {Object.entries({
                        Nombre: branch.data.name,
                        Código: branch.data.code,
                        Dirección: branch.data.address,
                        Ciudad: branch.data.city,
                        "Entidad federativa": branch.data.state,
                        "Zona horaria": branch.data.timezone,
                        Responsable: branch.responsible,
                        "Teléfono público": branch.data.publicPhone,
                        "Horario de atención": branch.data.schedule,
                        Coordenadas: `${branch.data.latitude}, ${branch.data.longitude}`,
                        "Temperatura de referencia":
                          branch.data.referenceTemperature === null
                            ? "Sin capturar"
                            : `${branch.data.referenceTemperature} °C`,
                        "Publicación del teléfono del propietario": branch.data.ownerPhonePublic
                          ? "Autorizada"
                          : "No autorizada",
                        Notas: branch.data.notes,
                      }).map(([key, value]) => (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{value || "Sin capturar"}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                  <Card title="Máquinas de la sucursal">
                    <Table
                      caption="Máquinas de la sucursal"
                      rows={detail!.machines}
                      getRowId={(row) => row.id}
                      columns={[
                        {
                          id: "code",
                          header: "Código",
                          cell: (row) => row.machine_code,
                          mobile: "title",
                          sortValue: (row) => row.machine_code,
                        },
                        {
                          id: "name",
                          header: "Nombre",
                          cell: (row) => row.internal_name,
                          sortValue: (row) => row.internal_name,
                        },
                        {
                          id: "status",
                          header: "Estado operativo",
                          cell: (row) => (
                            <StatusTag tone={OPERATION[row.operational_status]?.tone ?? "nodata"}>
                              {(
                                {
                                  available: "Disponible",
                                  off: "Apagada",
                                  maintenance: "En mantenimiento",
                                  out_of_service: "Fuera de servicio",
                                  suspended: "Suspendida",
                                } as Record<string, string>
                              )[row.operational_status] ?? "Sin clasificar"}
                            </StatusTag>
                          ),
                        },
                      ]}
                      empty={
                        <ServiceState
                          kind="empty"
                          title="Sin máquinas"
                          message="Todavía no hay máquinas asignadas a esta sucursal."
                        />
                      }
                    />
                  </Card>
                  <Maintenance id={branch.id} client={client} />
                </>
              )
            )}
          </div>
        }
      />
    </PageWidth>
  );
}
