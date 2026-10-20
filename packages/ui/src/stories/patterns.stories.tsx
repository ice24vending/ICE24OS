import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { Banner } from "../components/base/banner.js";
import { Button } from "../components/base/button.js";
import { Card } from "../components/base/card.js";
import { Checkbox, Radio, RadioGroup } from "../components/base/choice.js";
import { Dialog } from "../components/base/dialog.js";
import { DateField, Select, TextArea, TextField } from "../components/base/field.js";
import { MOBILE } from "../components/base/stories-kit.js";
import { EmptyState, Table, type TableColumn } from "../components/base/table.js";
import { Comparator } from "../components/domain/comparator.js";
import { JobStatus, type JobState } from "../components/domain/job-status.js";
import { ReadOnlyIndicator } from "../components/domain/read-only.js";
import { SyncStatus } from "../components/domain/sync-status.js";
import { componentDocs } from "./catalog-kit.js";

/**
 * Patterns (F6-05): recommended combinations of base and domain components. They show how the
 * pieces work together; the screens reuse them.
 */
const meta = {
  title: "Patrones",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const docs = (guide: Parameters<typeof componentDocs>[0]) => ({
  docs: { description: { story: componentDocs(guide) } },
});

export const FormularioModoLectura: Story = {
  name: "Formulario en modo lectura",
  parameters: docs({
    summary:
      "Un formulario que la persona puede consultar pero no guardar (UI_UX §25.2): se avisa desde el inicio, los campos se leen (no se deshabilitan) y la acción explica por qué no está disponible.",
    use: ["Cuenta en modo lectura (F5-03) o rol de solo consulta en esa sección."],
    avoid: [
      "Dejar llenar el formulario y fallar al guardar.",
      "Deshabilitar los campos: el valor debe poder leerse y copiarse.",
    ],
    accessibility: [
      "El indicador va antes del primer campo, así se escucha primero.",
      "El botón sigue enfocable y lee el motivo.",
    ],
    copy: ["«Puedes consultar esta bitácora, pero no modificarla.»"],
  }),
  render: () => (
    <Card
      title="Bitácora sanitaria SAN-102"
      description="ICE24-000145 · Sucursal Centro"
      icon="shield"
      actions={<ReadOnlyIndicator />}
    >
      <div className="catalog-pattern-form">
        <TextField label="Concentración de cloro" suffix="ppm" defaultValue="150" readOnly />
        <DateField label="Fecha de la medición" defaultValue="2026-10-16" readOnly />
        <Select
          label="Responsable"
          options={[{ value: "turno", label: "Operador de turno" }]}
          defaultValue="turno"
          readOnly
        />
        <Button disabledReason="La cuenta está en modo lectura.">Guardar bitácora</Button>
      </div>
    </Card>
  ),
};

interface JobRow {
  readonly id: string;
  readonly type: string;
  readonly status: JobState;
  readonly attempts: string;
}

const JOBS: readonly JobRow[] = [
  { id: "JOB-1042", type: "Reporte PDF mensual", status: "completed", attempts: "1 de 5" },
  { id: "JOB-1043", type: "Exportación de bitácoras", status: "processing", attempts: "1 de 5" },
  { id: "JOB-1044", type: "Correo de alerta", status: "failed", attempts: "5 de 5" },
];

const JOB_COLUMNS: readonly TableColumn<JobRow>[] = [
  { id: "id", header: "Folio", cell: (row) => row.id, mono: true, mobile: "title" },
  { id: "type", header: "Tarea", cell: (row) => row.type },
  { id: "status", header: "Estado", cell: (row) => <JobStatus status={row.status} /> },
  { id: "attempts", header: "Intentos", cell: (row) => row.attempts, mobile: "hidden" },
];

type ListState = "datos" | "carga" | "vacío" | "error" | "sin permiso";

function ListWithStates({ state }: { readonly state: ListState }) {
  if (state === "sin permiso")
    return (
      <Card title="Tareas de la cuenta" icon="document">
        <EmptyState
          title="No tienes permiso para consultar este recurso."
          description="Pide acceso a la persona administradora de la cuenta."
        />
      </Card>
    );
  return (
    <Card title="Tareas de la cuenta" icon="document" padding="flush">
      <Table
        caption="Tareas de la cuenta"
        captionHidden
        columns={JOB_COLUMNS}
        rows={state === "vacío" ? [] : JOBS}
        getRowId={(row) => row.id}
        loading={state === "carga"}
        error={
          state === "error" ? (
            <Banner
              tone="danger"
              title="No fue posible cargar las tareas"
              titleAs="p"
              actions={
                <Button size="sm" variant="secondary">
                  Reintentar
                </Button>
              }
            >
              El servicio no respondió. No se perdió información.
            </Banner>
          ) : undefined
        }
        empty={
          <EmptyState
            title="Sin tareas"
            description="Los reportes y exportaciones que pidas aparecerán aquí."
          />
        }
      />
    </Card>
  );
}

export const ListaConEstados: StoryObj<typeof ListWithStates> = {
  name: "Lista con estados",
  args: { state: "datos" },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["datos", "carga", "vacío", "error", "sin permiso"],
    },
  },
  parameters: docs({
    summary:
      "Una lista dentro de una tarjeta que resuelve sus cinco estados sin cambiar de lugar: datos, carga (esqueleto), vacío (explicación + acción), error (qué pasó + reintentar) y sin permiso (sin revelar contenido).",
    use: ["Toda lista de registros de una pantalla."],
    avoid: [
      "Un spinner a pantalla completa para cargar una lista.",
      "Mostrar «0 resultados» como si fuera un error.",
    ],
    accessibility: [
      "Carga con `aria-busy`; el error es un banner con título.",
      "El vacío y el error no se confunden: textos y tonos distintos.",
    ],
    copy: [
      "Vacío: «Sin tareas» + qué aparecerá ahí.",
      "Sin permiso: «No tienes permiso para consultar este recurso.»",
    ],
  }),
  render: (args) => <ListWithStates {...args} />,
};

function SensitiveConfirmation() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Retirar máquina
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        role="alertdialog"
        title="Retirar máquina ICE24-000145"
        description="Dejará de aparecer en la operación diaria y en el portal público."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger">Retirar máquina</Button>
          </>
        }
      >
        <p>
          Se conservan su historial técnico y sanitario, sus documentos y su auditoría. Las órdenes
          abiertas se cancelan con este mismo motivo.
        </p>
        <TextArea label="Motivo del retiro" required maxLength={500} showCount />
        <Checkbox label="Confirmo que revisé las órdenes abiertas" required />
      </Dialog>
    </>
  );
}

export const ConfirmacionSensible: Story = {
  name: "Confirmación de acción sensible",
  parameters: docs({
    summary:
      "Confirmación de UI_UX §13.7: entidad afectada, acción, consecuencias, qué se conserva, motivo obligatorio, casilla de responsabilidad cuando el PRD la exige y un botón con el verbo.",
    use: ["Retirar, transferir, anular, publicar o cualquier cambio difícil de revertir."],
    avoid: ["Confirmar acciones reversibles: usa «Deshacer» en un Toast.", "Botones «Sí»/«No»."],
    accessibility: [
      "`alertdialog`: foco atrapado, Esc cierra, el foco vuelve al botón que lo abrió.",
      "Motivo y casilla son obligatorios y se anuncian así.",
    ],
    copy: ["Título: «Retirar máquina ICE24-000145».", "Botón: «Retirar máquina», no «Aceptar»."],
  }),
  render: () => <SensitiveConfirmation />,
};

export const ConflictoDeVersion: Story = {
  name: "Conflicto de sincronización",
  parameters: docs({
    summary:
      "Resolución de un conflicto offline (UI_UX §14.18, §20.6): el indicador de la cola lleva al comparador; ninguna versión gana sola y el motivo es obligatorio.",
    use: ["Cuando una captura local y la del servidor cambiaron el mismo registro."],
    avoid: ["Elegir la versión más reciente automáticamente.", "Borrar una de las dos versiones."],
    accessibility: [
      "Las diferencias se escriben («Cambió de 150 ppm a 140 ppm»).",
      "Las opciones son un grupo con leyenda; el motivo es obligatorio.",
    ],
    copy: ["«Ninguna versión se eliminará de la auditoría.»"],
  }),
  render: () => (
    <div className="catalog-pattern-stack">
      <SyncStatus
        variant="panel"
        state="conflict"
        entity="Bitácora SAN-102 · ICE24-000145"
        onResolve={fn()}
      />
      <Comparator
        title="Conflicto de sincronización SYNC-0038"
        titleAs="h2"
        before={{ label: "Versión del servidor", meta: "Actualizada 19:14 por Luis" }}
        after={{ label: "Versión del dispositivo", meta: "Capturada 19:02 por Ana" }}
        fields={[
          { id: "ppm", label: "Concentración", before: "150 ppm", after: "140 ppm" },
          { id: "lot", label: "Lote de químico", before: "L-2201", after: "L-2201" },
        ]}
      >
        <RadioGroup label="Resolución" name="conflict-resolution" required>
          <Radio value="server" label="Conservar versión del servidor" />
          <Radio value="device" label="Usar versión del dispositivo" />
          <Radio value="merge" label="Crear corrección combinada" />
        </RadioGroup>
        <TextArea label="Motivo" required help="Ninguna versión se eliminará de la auditoría." />
        <Button>Resolver conflicto</Button>
      </Comparator>
    </div>
  ),
};

export const ListaMovil: StoryObj<typeof ListWithStates> = {
  ...ListaConEstados,
  name: "Lista con estados (móvil)",
  globals: MOBILE,
};
