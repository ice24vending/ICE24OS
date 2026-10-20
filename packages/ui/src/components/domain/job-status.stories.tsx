import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { TextArea } from "../base/field.js";
import { MOBILE, Showcase } from "../base/stories-kit.js";
import { JOB_STATES, JobStatus, type JobState } from "./job-status.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

const INTERNAL: JobState[] = [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "RETRY_WAIT",
  "FAILED",
  "DEAD_LETTER",
];
const PUBLIC: JobState[] = ["queued", "processing", "completed", "failed"];

const DOCS = componentDocs({
  summary:
    "Estado de trabajos asíncronos (UI_UX §13.7, §19.4; F5-07, JOB-001): estados internos del Centro de trabajos y públicos de las tareas de la cuenta. El reintento recibe la versión esperada (If-Match).",
  use: [
    "`tag` en tablas e historial de estados.",
    "`detail` en el detalle de un trabajo, con el motivo obligatorio como contenido.",
  ],
  avoid: [
    "Para la cola local offline: usa SyncStatus.",
    "Ofrecer reintento fuera de «Fallido» y «Requiere revisión».",
  ],
  accessibility: [
    'El chip lee «Trabajo: …»; el detalle es `role="status"`.',
    "El reintento sigue enfocable con su motivo cuando no está disponible.",
  ],
  copy: [
    "«En cola», «Procesando», «Reintento programado», «Fallido», «Requiere revisión».",
    "Para la cuenta: «Solicitada», «Disponible», «Error reintentable».",
    "«Agotó sus intentos automáticos y está en la cola de mensajes muertos (DLQ).»",
  ],
});

const meta = {
  title: "Dominio/JobStatus",
  component: JobStatus,
  args: {
    status: "DEAD_LETTER",
    variant: "detail",
    attemptCount: 5,
    maxAttempts: 5,
    manualRetryCount: 0,
    errorCode: "PROVIDER_TIMEOUT",
    nextAttempt: "16/10/2026 12:05 UTC",
    version: 7,
    onRetry: fn(),
    onRefresh: fn(),
    retrying: false,
  },
  argTypes: {
    status: { control: "select", options: Object.keys(JOB_STATES) },
    variant: { control: "inline-radio", options: ["tag", "detail"] },
    retrying: { control: "boolean" },
    retryDisabledReason: { control: "text" },
    feedback: {
      control: "select",
      options: ["ninguno", "conflicto", "error"],
      mapping: {
        ninguno: null,
        conflicto: {
          kind: "conflict",
          message: "El trabajo cambió desde que abriste este detalle; no se reenvió.",
          title: "El trabajo cambió: revisa su estado actual",
        },
        error: { kind: "error", message: "No fue posible reintentar. No se reenvió nada." },
      },
    },
    errorCode: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof JobStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function JobShowcase() {
  return (
    <>
      <Showcase title="Centro de trabajos (F5-07)">
        {INTERNAL.map((status) => (
          <JobStatus key={status} status={status} />
        ))}
      </Showcase>
      <Showcase title="Tareas de la cuenta (JOB-001: PDF, exportación, correo)">
        {PUBLIC.map((status) => (
          <JobStatus key={status} status={status} />
        ))}
      </Showcase>
      <Showcase title="Detalle" stack>
        <JobStatus
          variant="detail"
          status="RETRY_WAIT"
          attemptCount={2}
          maxAttempts={5}
          nextAttempt="16/10/2026 12:05 UTC"
          errorCode="PROVIDER_TIMEOUT"
        />
        <JobStatus
          variant="detail"
          status="DEAD_LETTER"
          attemptCount={5}
          maxAttempts={5}
          errorCode="PROVIDER_TIMEOUT"
          version={7}
          onRetry={fn()}
          retryDisabledReason="Escribe un motivo de al menos 10 caracteres."
        >
          <TextArea
            label="Motivo del reintento"
            required
            maxLength={1000}
            help="Mínimo 10 caracteres. Queda en la auditoría central."
          />
        </JobStatus>
        <JobStatus
          variant="detail"
          status="FAILED"
          attemptCount={3}
          maxAttempts={3}
          manualRetryCount={1}
          version={9}
          onRetry={fn()}
          feedback={{
            kind: "conflict",
            title: "El trabajo cambió: revisa su estado actual",
            message: "Otra persona lo reintentó mientras lo tenías abierto; no se reenvió.",
          }}
          onRefresh={fn()}
        />
        <JobStatus variant="detail" status="SUCCEEDED" attemptCount={1} maxAttempts={5} />
      </Showcase>
    </>
  );
}

export const Estados: Story = { render: () => <JobShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <JobShowcase /> };

const DLQ = {
  variant: "detail",
  status: "DEAD_LETTER",
  attemptCount: 5,
  maxAttempts: 5,
  errorCode: "PROVIDER_TIMEOUT",
  version: 7,
} as const;

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="JobStatus"
      cells={{
        normal: (
          <>
            <JobStatus status="QUEUED" />
            <JobStatus status="SUCCEEDED" />
            <JobStatus status="completed" />
          </>
        ),
        loading: <JobStatus {...DLQ} onRetry={fn()} retrying />,
        empty: na("sin trabajos, el Centro de trabajos muestra su estado vacío."),
        error: (
          <JobStatus
            {...DLQ}
            onRetry={fn()}
            feedback={{ kind: "error", message: "No fue posible reintentar. No se reenvió nada." }}
          />
        ),
        forbidden: <JobStatus {...DLQ} />,
        readonly: (
          <JobStatus
            {...DLQ}
            onRetry={fn()}
            retryDisabledReason="La cuenta está en modo lectura."
          />
        ),
        disabled: (
          <JobStatus
            {...DLQ}
            onRetry={fn()}
            retryDisabledReason="Escribe un motivo de al menos 10 caracteres."
          />
        ),
        focus: <JobStatus {...DLQ} onRetry={fn()} />,
      }}
    />
  ),
};
