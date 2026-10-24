"use client";
import { useRouter } from "next/navigation";
import { Banner, Button, Card, DetailLayout, MachineTriad, ReadOnlyIndicator } from "@ice24/ui";

import { ServiceState } from "../../components/system-state/service-state";
import { CopyLinkButton } from "../navigation/copy-link";
import { ActionFeedback, useTemplateAction, useTemplateStatus, type TemplateData } from "./shared";

/** Detail template (F6-09): identity and states, actions, summary, tabs, history and aside. */
export function DetailScreen({
  data,
  machineId,
  backHref,
}: {
  data: TemplateData;
  machineId?: string | undefined;
  /** The list as the viewer left it (F6-11). */
  backHref: string;
}) {
  const router = useRouter();
  const reading = useTemplateAction(data, "reading");
  const machine =
    data.machines.find((m) => m.id === machineId) ?? (machineId ? undefined : data.machines[0]);
  const status =
    useTemplateStatus(data, {
      title: "No hay máquinas para mostrar.",
      message: "El expediente aparece cuando la cuenta tiene al menos una máquina activa.",
    }) ?? (machine ? undefined : <ServiceState kind="not_found" />);
  const refresh = () => {
    reading.reset();
    router.refresh();
  };
  return (
    <main id="main-content" className="private-shell template-screen">
      <DetailLayout
        backHref={backHref}
        identifier={machine ? `${machine.code} · Plantilla de detalle` : "Plantilla de detalle"}
        title={machine?.name ?? "Expediente de máquina"}
        description={machine ? `${machine.model} · ${machine.branch}` : undefined}
        statuses={
          machine && (
            <>
              <MachineTriad
                machine={machine.code}
                operational={machine.operation}
                technical={machine.technical}
                sanitary={machine.sanitary}
                display="chips"
              />
              {data.readOnly && <ReadOnlyIndicator />}
            </>
          )
        }
        actions={
          machine && (
            <>
              <CopyLinkButton accountId={data.accountId} />
              <Button
                onClick={() => void reading.send()}
                loading={reading.sending}
                loadingLabel="Registrando…"
                disabledReason={reading.blocked}
              >
                Registrar lectura
              </Button>
            </>
          )
        }
        banner={
          <>
            {reading.result && (
              <Banner tone="success" role="status" title="Lectura registrada" titleAs="p">
                Folio {reading.result.folio}
                {reading.result.replayed && " (ya estaba registrada; no se duplicó)"}.
              </Banner>
            )}
            <ActionFeedback
              failure={reading.failure}
              onRetry={() => void reading.send()}
              onRefresh={refresh}
            />
          </>
        }
        status={status}
        summary={
          machine && (
            <>
              <Card title="Próximas actividades" titleAs="h2">
                <p>Cambio de filtro · en 3 días</p>
                <p>Limpieza de tolva · hoy</p>
              </Card>
              <Card title="Producción de hoy" titleAs="h2">
                <p>{machine.productionKg === null ? "Sin datos" : `${machine.productionKg} kg`}</p>
              </Card>
            </>
          )
        }
        tabs={[
          {
            id: "tecnico",
            label: "Técnico",
            content: <p>8 de 9 actividades al día · último servicio {machine?.lastService}.</p>,
          },
          {
            id: "sanitario",
            label: "Sanitario",
            content: <p>Próximo análisis microbiológico: 08/11/2026.</p>,
          },
          {
            id: "documentos",
            label: "Documentos",
            content: <p>Manual del modelo (v3) · Póliza de garantía 2026.</p>,
          },
        ]}
        history={
          <ul>
            <li>Hoy 09:12 · Lectura de temperatura registrada por Ana Torres.</li>
            <li>{machine?.lastService} · Mantenimiento preventivo cerrado (OT-00238).</li>
          </ul>
        }
        aside={
          <Card title="Ubicación" titleAs="h2">
            <p>{machine?.branch}</p>
          </Card>
        }
      />
    </main>
  );
}
