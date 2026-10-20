import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { MOBILE, Showcase } from "../base/stories-kit.js";
import { SYNC_STATES, SyncStatus, type SyncState } from "./sync-status.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

const STATES = Object.keys(SYNC_STATES) as SyncState[];

const DOCS = componentDocs({
  summary:
    "Indicador de sincronización (UI_UX §13.7, §20). «Reintentar» devuelve el identificador de la operación, que la pantalla reenvía como clave de idempotencia: un reintento no duplica lo que ya llegó al servidor.",
  use: [
    "`chip` en el encabezado: estado global y número de pendientes.",
    "`panel` en la cola local: entidad, intento, operación y «Reintentar» o «Resolver».",
  ],
  avoid: [
    "Para el estado de una tarea asíncrona del servidor: usa JobStatus.",
    "Animar «Sincronizando…» de forma continua.",
  ],
  accessibility: [
    'El chip es `role="status"`: los cambios se anuncian sin interrumpir.',
    "«Reintentar» bloqueado mientras corre; los motivos de bloqueo se leen.",
  ],
  copy: [
    "«Guardado en este dispositivo», «Pendiente de sincronizar», «Disponible sin conexión».",
    "«No se perdió ningún cambio. Al reintentar solo se envían los pendientes.»",
  ],
});

const meta = {
  title: "Dominio/SyncStatus",
  component: SyncStatus,
  args: {
    state: "error",
    variant: "panel",
    entity: "Bitácora SAN-102 · ICE24-000145",
    pendingCount: 3,
    lastSynced: "hoy 19:02",
    attempt: 2,
    operationId: "op-7f3a2c",
    onRetry: fn(),
    onResolve: fn(),
    retrying: false,
  },
  argTypes: {
    state: { control: "select", options: STATES },
    variant: {
      control: "inline-radio",
      options: ["chip", "panel"],
      description: "`chip` para el encabezado (§20.1); `panel` para la cola local (§20.5).",
    },
    pendingCount: { control: { type: "number", min: 0 } },
    attempt: { control: { type: "number", min: 0 } },
    retrying: { control: "boolean" },
    actionsDisabledReason: { control: "text" },
    entity: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof SyncStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A retry that takes a moment: the button ignores further clicks until it finishes. */
function RetryDemo() {
  const [state, setState] = useState<SyncState>("error");
  const [retrying, setRetrying] = useState(false);
  const [attempt, setAttempt] = useState(2);
  const [sent, setSent] = useState<string[]>([]);
  return (
    <Showcase title="Reintento sin duplicar" stack>
      <SyncStatus
        variant="panel"
        state={state}
        entity="Orden OT-00241 · 3 fotos"
        attempt={attempt}
        operationId="op-7f3a2c"
        retrying={retrying}
        onRetry={(operationId) => {
          setRetrying(true);
          setSent((current) => [...current, operationId ?? "—"]);
          window.setTimeout(() => {
            setRetrying(false);
            setAttempt((value) => value + 1);
            setState("synced");
          }, 900);
        }}
      />
      <p>Solicitudes enviadas: {sent.length === 0 ? "ninguna" : sent.join(", ")}</p>
    </Showcase>
  );
}

export const Reintento: Story = { render: () => <RetryDemo /> };

function SyncShowcase() {
  return (
    <>
      <Showcase title="Indicador del encabezado">
        {STATES.map((state) => (
          <SyncStatus
            key={state}
            state={state}
            pendingCount={state === "pending" ? 3 : undefined}
          />
        ))}
      </Showcase>
      <Showcase title="Cola local" stack>
        <SyncStatus
          variant="panel"
          state="pending"
          entity="Bitácora SAN-102 · ICE24-000145"
          pendingCount={3}
          lastSynced="hoy 18:40"
        />
        <SyncStatus
          variant="panel"
          state="error"
          entity="Orden OT-00241 · 3 fotos"
          attempt={2}
          operationId="op-7f3a2c"
          onRetry={fn()}
        />
        <SyncStatus
          variant="panel"
          state="conflict"
          entity="Bitácora SAN-102 · ICE24-000145"
          onResolve={fn()}
        />
        <SyncStatus
          variant="panel"
          state="conflict"
          entity="Bitácora SAN-103 · ICE24-000146"
          onResolve={fn()}
          actionsDisabledReason="Solo perfiles autorizados resuelven conflictos."
        />
        <SyncStatus variant="panel" state="saved_locally" entity="Checklist de limpieza" />
        <SyncStatus variant="panel" state="offline" lastSynced="hoy 17:55" />
        <SyncStatus variant="panel" state="synced" lastSynced="hoy 19:42" />
      </Showcase>
    </>
  );
}

export const Estados: Story = { render: () => <SyncShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <SyncShowcase /> };

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="SyncStatus"
      cells={{
        normal: (
          <>
            <SyncStatus state="synced" />
            <SyncStatus state="pending" pendingCount={3} />
          </>
        ),
        loading: <SyncStatus variant="panel" state="syncing" entity="Bitácora SAN-102" />,
        empty: na("sin pendientes el indicador dice «Sincronizado»."),
        error: (
          <SyncStatus
            variant="panel"
            state="error"
            entity="Orden OT-00241"
            attempt={2}
            operationId="op-7f3a2c"
            onRetry={fn()}
          />
        ),
        forbidden: (
          <SyncStatus
            variant="panel"
            state="conflict"
            entity="Bitácora SAN-102"
            onResolve={fn()}
            actionsDisabledReason="Solo perfiles autorizados resuelven conflictos."
          />
        ),
        readonly: na(
          "lo capturado antes se sigue sincronizando; las capturas nuevas se bloquean en el formulario.",
        ),
        disabled: (
          <SyncStatus
            variant="panel"
            state="error"
            entity="Orden OT-00241"
            onRetry={fn()}
            actionsDisabledReason="Necesitas conexión para reintentar."
          />
        ),
        focus: <SyncStatus variant="panel" state="error" entity="Orden OT-00241" onRetry={fn()} />,
      }}
    />
  ),
};
