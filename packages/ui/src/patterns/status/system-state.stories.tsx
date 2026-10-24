import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, ButtonLink } from "../../components/base/button.js";
import { MOBILE, Showcase } from "../../components/base/stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Skeleton, SystemState } from "./system-state.js";

const meta = {
  title: "Estados/Estados globales",
  component: SystemState,
  args: { kind: "error", correlationId: "c0ffee00-0000-4000-8000-000000000999" },
  argTypes: {
    kind: {
      control: "select",
      options: [
        "loading",
        "empty",
        "error",
        "forbidden",
        "offline",
        "read_only",
        "conflict",
        "session",
        "not_found",
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Un solo componente para los estados de toda pantalla (F6-10, UI_UX §17–20): carga con skeleton, vacío con siguiente acción, error con reintento y folio, sin permiso, sin conexión, modo lectura, conflicto de versión (412), sesión expirada y no encontrado.",
          use: [
            "Como `status` de cualquier layout: reemplaza el contenido y conserva encabezado y acciones de navegación.",
            "En la app, a través de `ServiceState`, que convierte un `Failure` del BFF en el estado y su folio.",
          ],
          avoid: [
            "Mensajes técnicos o el texto del servicio: el título y la guía son nuestros.",
            "Reintentar escrituras con una clave nueva: el reintento reenvía la misma clave de idempotencia.",
            "Un skeleton para algo cuya estructura no se conoce: usa el texto de carga.",
          ],
          accessibility: [
            "Carga y vacío son `status`; el resto `alert` y se anuncia al aparecer.",
            "La región toma su nombre del título; la carga lo conserva oculto detrás del skeleton.",
            "El botón de reintento se bloquea mientras corre (un doble toque envía una sola solicitud).",
          ],
          copy: [
            "«No fue posible completar la consulta» + «No se realizó ningún cambio».",
            "«Folio para soporte: …» cuando la API devuelve correlación.",
            "«La información cambió» + «Actualizar», nunca «Sobrescribir».",
          ],
        }),
      },
    },
  },
} satisfies Meta<typeof SystemState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function AllStates() {
  return (
    <Showcase stack>
      <SystemState kind="loading" title="Cargando máquinas…" skeleton="list" />
      <SystemState
        kind="empty"
        title="Aún no hay máquinas activas en esta cuenta."
        message="Cuando ICE24 valide una solicitud de alta, la máquina aparecerá aquí."
        action={<Button icon="plus">Solicitar alta de equipo</Button>}
      />
      <SystemState
        kind="error"
        correlationId="c0ffee00-0000-4000-8000-000000000999"
        onRetry={() => undefined}
      />
      <SystemState kind="forbidden" />
      <SystemState kind="offline" />
      <SystemState kind="read_only" action={<ButtonLink href="#">Ver suscripción</ButtonLink>} />
      <SystemState kind="conflict" action={<Button variant="secondary">Actualizar</Button>} />
      <SystemState kind="session" action={<ButtonLink href="#">Iniciar sesión</ButtonLink>} />
      <SystemState kind="not_found" />
    </Showcase>
  );
}

export const Estados: Story = { render: () => <AllStates /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <AllStates /> };

export const Skeletons: Story = {
  render: () => (
    <Showcase stack>
      <Skeleton variant="list" />
      <Skeleton variant="detail" />
      <Skeleton variant="cards" rows={4} />
      <Skeleton variant="form" />
    </Showcase>
  ),
};

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="SystemState"
      layout="list"
      cells={{
        normal: na("es el estado de una pantalla que no está en su estado normal."),
        loading: <SystemState kind="loading" title="Cargando máquinas…" skeleton="cards" />,
        empty: (
          <SystemState
            kind="empty"
            title="No hay eventos que coincidan con los filtros."
            action={<Button variant="secondary">Limpiar filtros</Button>}
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
        readonly: <SystemState kind="read_only" />,
        disabled: (
          <SystemState
            kind="error"
            correlationId="c0ffee00-0000-4000-8000-000000000999"
            onRetry={() => undefined}
            retrying
          />
        ),
        focus: na("el foco lo lleva su botón de acción (ver Botón)."),
      }}
    />
  ),
};
