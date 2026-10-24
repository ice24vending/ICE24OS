import type { ReactNode } from "react";

import { StatusTag } from "../../components/base/badge.js";
import { Button } from "../../components/base/button.js";
import { Card } from "../../components/base/card.js";
import { Checkbox } from "../../components/base/choice.js";
import { Select, TextArea, TextField } from "../../components/base/field.js";
import { Pagination } from "../../components/base/navigation.js";
import { Table, type TableColumn } from "../../components/base/table.js";
import { MachineTriad } from "../../components/domain/machine-triad.js";
import { ReadOnlyIndicator } from "../../components/domain/read-only.js";
import { SyncStatus } from "../../components/domain/sync-status.js";
import { na, StateMatrix } from "../../stories/catalog-kit.js";
import { SystemState } from "../status/system-state.js";
import { DashboardLayout } from "./dashboard-layout.js";
import { DetailLayout } from "./detail-layout.js";
import { ListLayout } from "./list-layout.js";
import { MobileOperationalLayout } from "./mobile-operational-layout.js";
import { WizardLayout } from "./wizard-layout.js";

/**
 * Story-only samples of the layouts (F6-09) with fictitious ice-machine data, and the state
 * matrix every layout is reviewed in. Excluded from the package build.
 */

export interface SampleProps {
  /** A SystemState that replaces the content. */
  readonly status?: ReactNode;
  /** Account in read-only mode: content visible, writes explained and blocked. */
  readonly readOnly?: boolean;
}

interface Machine {
  readonly code: string;
  readonly name: string;
  readonly branch: string;
  readonly operation: "available" | "maintenance" | "out_of_service";
  readonly production: number | null;
}

const MACHINES: readonly Machine[] = [
  {
    code: "ICE24-MTY-0001",
    name: "Despachadora Juárez",
    branch: "Centro Monterrey",
    operation: "available",
    production: 412,
  },
  {
    code: "ICE24-MTY-0002",
    name: "Fábrica Centro",
    branch: "Centro Monterrey",
    operation: "maintenance",
    production: 0,
  },
  {
    code: "ICE24-MTY-0003",
    name: "Despachadora Leones",
    branch: "Cumbres",
    operation: "available",
    production: 388,
  },
  {
    code: "ICE24-MTY-0004",
    name: "Purificadora Cumbres",
    branch: "Cumbres",
    operation: "out_of_service",
    production: null,
  },
];

const OPERATION = {
  available: { label: "Disponible", tone: "success" },
  maintenance: { label: "En mantenimiento", tone: "info" },
  out_of_service: { label: "Fuera de servicio", tone: "danger" },
} as const;

const COLUMNS: readonly TableColumn<Machine>[] = [
  { id: "code", header: "Código", cell: (m) => m.code, mono: true, mobile: "title" },
  { id: "name", header: "Máquina", cell: (m) => m.name },
  { id: "branch", header: "Sucursal", cell: (m) => m.branch },
  {
    id: "operation",
    header: "Operación",
    cell: (m) => (
      <StatusTag tone={OPERATION[m.operation].tone}>{OPERATION[m.operation].label}</StatusTag>
    ),
  },
  {
    id: "production",
    header: "Hielo hoy",
    numeric: true,
    cell: (m) => (m.production === null ? "Sin datos" : `${m.production} kg`),
  },
];

const BRANCHES = [
  { value: "centro", label: "Centro Monterrey" },
  { value: "cumbres", label: "Cumbres" },
];

const blocked = (readOnly?: boolean) => (readOnly ? "La cuenta está en modo lectura." : undefined);

export function ListSample({ status, readOnly }: SampleProps) {
  return (
    <ListLayout
      eyebrow="Operación"
      title="Máquinas"
      description="4 equipos · 2 disponibles · 1 fuera de servicio"
      actions={
        <Button icon="plus" disabledReason={blocked(readOnly)}>
          Solicitar alta
        </Button>
      }
      filters={
        <>
          <TextField label="Buscar" placeholder="Código o nombre" />
          <Select label="Sucursal" options={BRANCHES} placeholder="Todas" />
        </>
      }
      banner={readOnly ? <ReadOnlyIndicator /> : undefined}
      status={status}
      pagination={
        <Pagination
          page={1}
          pageCount={3}
          totalItems={12}
          pageSize={4}
          onPageChange={() => undefined}
        />
      }
    >
      <Table
        caption="Máquinas de la cuenta"
        captionHidden
        columns={COLUMNS}
        rows={MACHINES}
        getRowId={(m) => m.code}
      />
    </ListLayout>
  );
}

export function DetailSample({ status, readOnly }: SampleProps) {
  return (
    <DetailLayout
      identifier="ICE24-MTY-0001 · Serie FAB-44910"
      title="Despachadora Juárez"
      description="Despachadora de hielo IC-500 · Centro Monterrey"
      statuses={
        <>
          <MachineTriad
            operational="available"
            technical="preventive_attention"
            sanitary="up_to_date"
            display="chips"
          />
          {readOnly && <ReadOnlyIndicator />}
        </>
      }
      actions={
        <>
          <Button variant="secondary" disabledReason={blocked(readOnly)}>
            Programar mantenimiento
          </Button>
          <Button disabledReason={blocked(readOnly)}>Registrar lectura</Button>
        </>
      }
      summary={
        <>
          <Card title="Próximas actividades" titleAs="h2">
            <p>Cambio de filtro · en 3 días</p>
            <p>Limpieza de tolva · hoy</p>
          </Card>
          <Card title="Producción" titleAs="h2">
            <p>412 kg hoy · 2,870 kg esta semana</p>
          </Card>
        </>
      }
      tabs={[
        { id: "tecnico", label: "Técnico", content: <p>8 de 9 actividades al día; 1 vencida.</p> },
        {
          id: "documentos",
          label: "Documentos",
          content: <p>Manual IC-500 (v3) · Garantía 2026.</p>,
        },
      ]}
      history={<p>Hoy 09:12 · Lectura de temperatura registrada por Ana Torres.</p>}
      aside={
        <Card title="Ubicación" titleAs="h2">
          <p>Av. Juárez 1200, Centro</p>
        </Card>
      }
      status={status}
    />
  );
}

export function WizardSample({ status, readOnly }: SampleProps) {
  return (
    <WizardLayout
      title="Solicitud de alta de equipo"
      description="La solicitud llega a ICE24 para validación; no activa la máquina."
      steps={[
        {
          id: "datos",
          label: "Datos básicos",
          content: (
            <>
              <Select
                label="Modelo"
                options={[{ value: "ic500", label: "Despachadora de hielo IC-500" }]}
                required
              />
              <TextField label="Número de serie" defaultValue="FAB-44910" required />
            </>
          ),
        },
        {
          id: "ubicacion",
          label: "Ubicación",
          content: <Select label="Sucursal" options={BRANCHES} />,
        },
        {
          id: "documentos",
          label: "Documentos",
          content: <p>Factura y fotografía de la placa.</p>,
        },
      ]}
      summary={<p>IC-500 · FAB-44910 · Centro Monterrey · 2 documentos.</p>}
      onFinish={() => undefined}
      finishLabel="Enviar solicitud"
      finishDisabledReason={blocked(readOnly)}
      banner={
        readOnly ? (
          <ReadOnlyIndicator reason="Puedes revisar los pasos, pero no enviar la solicitud." />
        ) : undefined
      }
      cancelHref="#"
      status={status}
    />
  );
}

export function DashboardSample({ status, readOnly }: SampleProps) {
  return (
    <DashboardLayout
      eyebrow="Hielo Polar del Norte"
      title="Inicio"
      description="Buenos días, Ana. Esto pasa hoy en tus sucursales."
      actions={
        <Button variant="secondary" disabledReason={blocked(readOnly)}>
          Registrar incidencia
        </Button>
      }
      banner={readOnly ? <ReadOnlyIndicator /> : undefined}
      kpis={[
        {
          label: "Hielo producido",
          value: "1,240",
          unit: "kg",
          period: "Hoy",
          context: "2 sucursales",
        },
        { label: "Máquinas disponibles", value: "2 de 4", period: "Ahora" },
        { label: "Actividades vencidas", value: 1, period: "Esta semana" },
        { label: "Ventas", value: null, period: "Hoy", context: "Sin importación" },
      ]}
      status={status}
    >
      <Card title="Alertas" titleAs="h2" tone="danger" icon="danger">
        <p>Purificadora Cumbres fuera de servicio desde las 07:40.</p>
      </Card>
      <Card title="Tareas de hoy" titleAs="h2">
        <p>Limpieza de área · ICE24-MTY-0001 · 09:00</p>
        <p>Lectura de proceso · ICE24-MTY-0003 · 13:00</p>
      </Card>
    </DashboardLayout>
  );
}

export function FieldSample({ status, readOnly }: SampleProps) {
  return (
    <MobileOperationalLayout
      backHref="#"
      backLabel="Mis órdenes"
      title="OT-00241 · Mantenimiento preventivo"
      subtitle="ICE24-MTY-0001 · Despachadora Juárez"
      statusBar={<SyncStatus state="available_offline" />}
      progress={{ value: 2, max: 4, label: "Progreso 2 de 4" }}
      banner={
        readOnly ? (
          <ReadOnlyIndicator reason="Puedes consultar la orden, pero no registrar avances." />
        ) : undefined
      }
      status={status}
      secondaryAction={
        <Button variant="secondary" size="lg" fullWidth disabledReason={blocked(readOnly)}>
          Guardar en este dispositivo
        </Button>
      }
      primaryAction={
        <Button size="lg" fullWidth disabledReason={blocked(readOnly)}>
          Completar orden
        </Button>
      }
    >
      <fieldset className="ids-field-layout__checklist">
        <legend>Checklist</legend>
        <Checkbox label="Desconectar alimentación" defaultChecked />
        <Checkbox label="Revisar filtro" defaultChecked />
        <Checkbox label="Limpiar tolva" />
        <Checkbox label="Prueba final de despacho" />
      </fieldset>
      <TextArea label="Diagnóstico" readOnly={readOnly} />
    </MobileOperationalLayout>
  );
}

const STATES = {
  loading: <SystemState kind="loading" title="Cargando…" skeleton="list" />,
  empty: (
    <SystemState
      kind="empty"
      title="Aún no hay máquinas activas en esta cuenta."
      message="Cuando ICE24 valide una solicitud de alta, la máquina aparecerá aquí."
      action={<Button icon="plus">Solicitar alta de equipo</Button>}
    />
  ),
  error: (
    <SystemState
      kind="error"
      correlationId="c0ffee00-0000-4000-8000-000000000999"
      onRetry={() => undefined}
    />
  ),
  forbidden: <SystemState kind="forbidden" />,
  offline: <SystemState kind="offline" />,
} as const;

/** The eight catalog states of a layout sample (F6-05 matrix). */
export function LayoutMatrix({
  component,
  Sample,
}: {
  readonly component: string;
  readonly Sample: (props: SampleProps) => ReactNode;
}) {
  return (
    <StateMatrix
      component={component}
      layout="list"
      cells={{
        normal: <Sample />,
        loading: <Sample status={STATES.loading} />,
        empty: <Sample status={STATES.empty} />,
        error: <Sample status={STATES.error} />,
        forbidden: <Sample status={STATES.forbidden} />,
        readonly: <Sample readOnly />,
        disabled: <Sample status={STATES.offline} />,
        focus: na(
          "el foco lo llevan los controles internos (botones, pestañas, campos); ver sus matrices.",
        ),
      }}
    />
  );
}
