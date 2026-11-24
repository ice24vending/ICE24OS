"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink, Card, DetailLayout, MachineTriad, StatusTag } from "@ice24/ui";
import { ServiceState } from "../../components/system-state/service-state";
import { toFailure, type Failure } from "../../components/system-state/failure";
import { useAccountAccess } from "../account-shell/access-provider";
import { createEquipmentClient } from "../equipment/configuration-client";
import {
  MachineComponentsPanel,
  MachineFrequenciesPanel,
} from "../equipment/machine-configuration";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { MachineAdministration } from "./machine-administration";
import { MachineActivity } from "./machine-activity";
import { OPERATION } from "./model";
import {
  machineAccessSchema,
  machineBranchSchema,
  machineDetailSchema,
  machineTransferSchema,
  machinePermissions,
  PUBLICATION,
  recordDate,
  type MachineDetail,
} from "./detail-model";

export function MachineDetailScreen({
  id,
  contextId,
  csrfToken,
  permissions,
  denied,
}: {
  id: string;
  contextId: string;
  csrfToken: string;
  permissions: readonly string[];
  denied?: { label: string; correlationId: string } | null;
}) {
  const client = useMemo(() => createEquipmentClient(contextId, csrfToken), [contextId, csrfToken]);
  const { canWrite, online, syncMode } = useAccountAccess();
  const ref = useRef<HTMLDivElement>(null);
  const initialFocus = useRef(false);
  const load = useCallback(async () => {
    const [machine, access] = await Promise.all([
      client.get(`machines/${id}/status`).then(machineDetailSchema.parse),
      client.get("equipment-workspace").then(machineAccessSchema.parse),
    ]);
    const [branches, transfers] =
      access.accountWide || access.canManage
        ? await Promise.all([
            client.get("branches").then((value) => machineBranchSchema.array().parse(value)),
            client
              .get("machine-transfers")
              .then((value) => machineTransferSchema.array().parse(value)),
          ])
        : [[], []];
    return {
      machine,
      access,
      branches,
      transfers: transfers.filter((row) => row.machine_id === id),
    };
  }, [client, id]);
  const [data, setData] = useState<Awaited<ReturnType<typeof load>>>();
  const [failure, setFailure] = useState<Failure>();
  const [loading, setLoading] = useState(!denied);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (denied) return;
    let active = true;
    load().then(
      (result) => {
        if (active) {
          setData(result);
          syncMode(result.access.accessMode);
          setFailure(undefined);
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (active) {
          setFailure(toFailure(error, "No fue posible cargar la ficha."));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt, denied, syncMode]);
  useEffect(() => {
    const main = ref.current?.closest("main");
    if (main) main.dataset.pageReady = String(!loading);
    // Full-document links from maintenance do not trigger the shell's client-navigation effect.
    // If the shell already focused the heading, or the user moved focus, leave it there.
    if (!loading && !initialFocus.current) {
      initialFocus.current = true;
      if (document.activeElement === document.body) {
        const heading = main?.querySelector("h1");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    }
  }, [loading]);
  const refresh = async () => {
    const result = await load();
    setData(result);
    syncMode(result.access.accessMode);
  };
  const machine = data?.machine;
  const name = machine?.data.internalName || machine?.machine_code || "Ficha de máquina";
  const access =
    machine && data
      ? machinePermissions(machine, data.access, permissions, canWrite && online)
      : null;
  const state = denied ? (
    <ServiceState
      kind="forbidden"
      message={`No tienes permiso para abrir «${denied.label}» en esta cuenta.`}
      correlationId={denied.correlationId}
    />
  ) : loading ? (
    <ServiceState kind="loading" title="Cargando ficha de máquina" />
  ) : failure ? (
    <ServiceState
      {...failure}
      onRetry={() => {
        setLoading(true);
        setAttempt((n) => n + 1);
      }}
    />
  ) : undefined;
  return (
    <div ref={ref} className="machine-detail__content">
      <DetailLayout
        title={name}
        identifier={machine?.machine_code}
        description={machine?.branchName ?? "Sin registro de sucursal"}
        breadcrumbs={[{ label: "Máquinas", href: "/machines" }, { label: name }]}
        backLink={<ReturnLink href="/machines" linkId={rowLinkId(id)} listName="Máquinas" />}
        statuses={
          machine && (
            <StatusTag
              tone={
                machine.operational_status ? OPERATION[machine.operational_status].tone : "nodata"
              }
              dimension="Estado operativo"
            >
              {machine.operational_status
                ? OPERATION[machine.operational_status].label
                : "Sin registro"}
            </StatusTag>
          )
        }
        actions={
          access && (
            <>
              {access.report && (
                <ButtonLink
                  href={`/maintenance/tickets/new?machineId=${id}`}
                  variant="primary"
                  icon="warning"
                >
                  Reportar una falla
                </ButtonLink>
              )}
              {access.tickets && (
                <ButtonLink
                  href={`/maintenance/tickets?machineId=${id}`}
                  variant="secondary"
                  icon="inbox"
                >
                  Ver tickets
                </ButtonLink>
              )}
            </>
          )
        }
        status={state}
        summary={machine && <Condition machine={machine} />}
        tabsLabel="Secciones de la máquina"
        tabs={
          machine && data && access
            ? [
                {
                  id: "summary",
                  label: "Resumen",
                  content: (
                    <>
                      <Card title="Datos generales">
                        <dl className="machine-detail__facts">
                          {[
                            ["Nombre", name],
                            ["Marca", machine.data.commercialBrand],
                            ["Modelo", machine.modelName],
                            ["Número de serie", machine.data.serialNumber],
                            ["Instalación", recordDate(machine.installed_at)],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>{value || "Sin registro"}</dd>
                            </div>
                          ))}
                        </dl>
                      </Card>
                      <MachineAdministration
                        machine={machine}
                        branches={data.branches}
                        transfers={data.transfers}
                        canManage={access.manage}
                        disabled={!access.write}
                        hasMfa={data.access.hasMfa}
                        client={client}
                        refresh={refresh}
                      />
                    </>
                  ),
                },
                {
                  id: "components",
                  label: "Componentes",
                  content: (
                    <MachineComponentsPanel
                      machineId={id}
                      client={client}
                      mode={access.components}
                      canCreateOwn={access.createOwn}
                    />
                  ),
                },
                {
                  id: "frequencies",
                  label: "Frecuencias y alertas",
                  content: (
                    <MachineFrequenciesPanel
                      machineId={id}
                      client={client}
                      mode={access.frequencies}
                    />
                  ),
                },
                {
                  id: "calendar",
                  label: "Calendario",
                  content: (
                    <MachineActivity machineId={id} client={client} calendar permissions={access} />
                  ),
                },
              ]
            : []
        }
        history={
          machine &&
          access && (
            <MachineActivity
              machineId={id}
              client={client}
              permissions={access}
              contextId={contextId}
            />
          )
        }
      />
    </div>
  );
}

function Condition({ machine }: { machine: MachineDetail }) {
  const dates = machine.conditionDates;
  const date = (value: string | null | undefined) => (
    <span className="machine-detail__date">{recordDate(value, machine.timezone ?? undefined)}</span>
  );
  return (
    <Card title="Condición">
      <div className="machine-detail__condition">
        <MachineTriad
          operational={machine.operational_status}
          technical={machine.technical_status ?? null}
          sanitary={machine.sanitary_status ?? null}
          emptyLabel="Sin registro"
          details={{
            operational: { date: date(dates?.operational.changedAt) },
            technical: { label: "Condición técnica", date: date(dates?.technical.changedAt) },
            sanitary: { label: "Condición sanitaria", date: date(dates?.sanitary.changedAt) },
          }}
        />
        <div>
          <StatusTag tone={machine.publication_status === "published" ? "success" : "nodata"}>
            Publicación:{" "}
            {machine.publication_status ? PUBLICATION[machine.publication_status] : "Sin registro"}
          </StatusTag>
          {date(dates?.publication.changedAt)}
        </div>
      </div>
    </Card>
  );
}
