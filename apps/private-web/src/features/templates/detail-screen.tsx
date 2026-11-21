"use client";
import { LiveRegion } from "@ice24/ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  Banner,
  Button,
  Card,
  DetailLayout,
  MachineTriad,
  PageWidth,
  ReadOnlyIndicator,
} from "@ice24/ui";

import { ServiceState } from "../../components/system-state/service-state";
import { CopyLinkButton } from "../navigation/copy-link";
import { ReturnLink, rowLinkId } from "../navigation/return-focus";
import { ActionFeedback, useTemplateAction, useTemplateStatus, type TemplateData } from "./shared";

const noHydrationChanges = () => () => undefined;
const clientReady = () => true;
const serverReady = () => false;

/** Detail template (F6-09): identity and states, actions, summary, tabs, history and aside. */
export function DetailScreen({
  data,
  machineId,
  backHref,
  baseExample = false,
  showDocumentation = false,
}: {
  data: TemplateData;
  machineId?: string | undefined;
  /** The list as the viewer left it (F6-11). */
  backHref: string;
  baseExample?: boolean;
  showDocumentation?: boolean;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(noHydrationChanges, clientReady, serverReady);
  const Main = baseExample ? PageWidth : "main";
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
    <Main
      {...(baseExample ? { as: "main" as const, variant: "reading" as const } : {})}
      id="main-content"
      className={
        baseExample ? "template-screen template-screen--base" : "private-shell template-screen"
      }
      aria-label={baseExample ? (machine?.name ?? "Detalle") : undefined}
      data-template-ready={baseExample ? String(hydrated) : undefined}
    >
      <DetailLayout
        backHref={baseExample ? undefined : backHref}
        backLink={
          baseExample ? (
            <ReturnLink
              href={backHref}
              linkId={rowLinkId(machineId ?? machine?.id ?? "missing")}
              listName="máquinas"
            />
          ) : undefined
        }
        breadcrumbs={
          baseExample
            ? [
                { label: "Plantillas", href: "/plantillas" },
                { label: "Máquinas", href: backHref },
                { label: machine?.name ?? "Detalle" },
              ]
            : undefined
        }
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
              {!baseExample && (
                <Button
                  icon="plus"
                  onClick={() => void reading.send()}
                  loading={reading.sending}
                  loadingLabel="Registrando…"
                  disabledReason={reading.blocked}
                >
                  Registrar lectura
                </Button>
              )}
            </>
          )
        }
        banner={
          <>
            <LiveRegion as="div">
              {reading.result && (
                <Banner tone="success" title="Lectura registrada" titleAs="p">
                  Folio {reading.result.folio}
                  {reading.result.replayed && " (ya estaba registrada; no se duplicó)"}.
                </Banner>
              )}
            </LiveRegion>
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
      {showDocumentation && (
        <section aria-labelledby="detail-pattern-title" className="template-detail-guide">
          <h2 id="detail-pattern-title">Detalle con ruta propia</h2>
          <p>
            Abre una fila desde la lista. Cada registro tiene su propia dirección y una ruta de
            navegación. «Volver a máquinas» conserva búsqueda, sucursal, página y vista, y devuelve
            el foco al enlace de la fila. Si esa fila ya no está disponible, el foco vuelve al
            título de la lista.
          </p>
          <p>
            El ejemplo permite consultar y cambiar de vista. Los permisos de la cuenta siguen
            determinando los registros disponibles.
          </p>
          <Link href="/plantillas/lista?ejemplo=base" className="template-detail-guide__link">
            Probar lista y detalle
          </Link>
        </section>
      )}
    </Main>
  );
}
