import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";

import { MOBILE, Showcase } from "../base/stories-kit.js";
import { ALERT_PRIORITIES, ALERT_STATUSES, CriticalAlert } from "./critical-alert.js";

const meta = {
  title: "Dominio/CriticalAlert",
  component: CriticalAlert,
  args: {
    title: "Análisis no conforme",
    message: "La concentración de cloro quedó fuera del rango de 100 a 200 ppm.",
    priority: "critical",
    status: "read",
    pinned: true,
    version: 4,
    elapsed: "hace 7 h",
    source: "ICE24-000145 · Sucursal Centro",
    responsible: "Responsable sanitario de la sucursal",
    escalation: "Gerencia en 1 h si nadie marca «Enterado»",
    onAcknowledge: fn(),
    onAttend: fn(),
    onResolve: fn(),
    resolveBlockedReason: "Se podrá resolver cuando la acción correctiva esté cerrada.",
    action: { href: "#bitacora", label: "Ver bitácora SAN-102" },
  },
  argTypes: {
    priority: { control: "select", options: Object.keys(ALERT_PRIORITIES) },
    status: { control: "select", options: Object.keys(ALERT_STATUSES) },
    pending: {
      control: "select",
      options: [null, "acknowledge", "start-attention", "resolve"],
    },
    feedback: {
      control: "select",
      options: ["ninguno", "conflicto", "error"],
      mapping: {
        ninguno: null,
        conflicto: { kind: "conflict", message: "El aviso cambió desde que lo consultaste." },
        error: {
          kind: "error",
          message: "El servicio no respondió. No se registró ningún cambio.",
        },
      },
      description: "Resultado de una transición fallida (412 o error), recuperable en la tarjeta.",
    },
    actionsDisabledReason: { control: "text" },
    resolveBlockedReason: { control: "text" },
    message: { control: "text" },
    source: { control: "text" },
    responsible: { control: "text" },
    escalation: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Tarjeta de alerta crítica (UI_UX §13.7, §26; F5-11). Fijada hasta «Enterado»; «Enterado» no resuelve. Las transiciones son callbacks que reciben la versión esperada.",
      },
    },
  },
} satisfies Meta<typeof CriticalAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Simulates the screen: a transition takes a moment and a stale version answers 412. */
function Interactive() {
  const [status, setStatus] = useState<"read" | "acknowledged" | "in_progress">("read");
  const [version, setVersion] = useState(4);
  const [pending, setPending] = useState<"acknowledge" | "start-attention" | null>(null);
  const [conflict, setConflict] = useState(false);
  const transition =
    (name: "acknowledge" | "start-attention", next: typeof status) => (expected: number) => {
      setPending(name);
      window.setTimeout(() => {
        setPending(null);
        // In this demo another tab already started the attention: "Atender" answers 412.
        if (name === "start-attention") {
          setConflict(true);
          return;
        }
        setStatus(next);
        setVersion(expected + 1);
      }, 600);
    };
  return (
    <CriticalAlert
      title="Pago de suscripción rechazado"
      message="Stripe rechazó el cobro; la cuenta pasó a modo lectura."
      priority="critical"
      status={status}
      pinned={status === "read"}
      version={version}
      elapsed="hace 2 h"
      source="Cuenta Hielo del Norte"
      pending={pending}
      feedback={
        conflict
          ? {
              kind: "conflict",
              message: "Otra persona inició la atención. Revisa el estado actual.",
            }
          : null
      }
      onRefresh={() => {
        setConflict(false);
        setStatus("in_progress");
        setVersion(6);
      }}
      onAcknowledge={transition("acknowledge", "acknowledged")}
      onAttend={transition("start-attention", "in_progress")}
      onResolve={fn()}
      resolveBlockedReason="Se podrá resolver cuando el pago esté regularizado."
    />
  );
}

export const Interactiva: Story = { render: () => <Interactive /> };

function AlertShowcase() {
  return (
    <Showcase title="Estados" stack>
      <CriticalAlert
        title="Análisis no conforme"
        message="Concentración fuera de rango."
        priority="critical"
        status="unread"
        pinned
        version={1}
        elapsed="hace 12 min"
        source="ICE24-000145 · Sucursal Centro"
        responsible="Responsable sanitario"
        escalation="Gerencia en 48 min"
        onAcknowledge={fn()}
        onAttend={fn()}
      />
      <CriticalAlert
        title="Mantenimiento vencido"
        message="Cambio de filtro vencido hace 3 días."
        priority="high"
        status="acknowledged"
        pinned={false}
        version={3}
        elapsed="hace 3 días"
        source="ICE24-000147 · Sucursal Norte"
        onAttend={fn()}
        onResolve={fn()}
        resolveBlockedReason="Se podrá resolver cuando la orden OT-00241 esté cerrada."
      />
      <CriticalAlert
        title="Pago de suscripción rechazado"
        priority="critical"
        status="in_progress"
        pinned={false}
        version={5}
        elapsed="hace 2 h"
        onResolve={fn()}
        feedback={{ kind: "conflict", message: "El aviso cambió desde que lo consultaste." }}
        onRefresh={fn()}
      />
      <CriticalAlert
        title="Control sanitario próximo a vencer"
        priority="warning"
        status="read"
        pinned={false}
        version={2}
        elapsed="hace 1 h"
        onAcknowledge={fn()}
        actionsDisabledReason="Necesitas conexión para registrar «Enterado»."
      />
      <CriticalAlert
        title="Mantenimiento programado"
        priority="info"
        status="resolved"
        pinned={false}
        version={6}
        elapsed="hace 5 días"
      />
    </Showcase>
  );
}

export const Estados: Story = { render: () => <AlertShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <AlertShowcase /> };
