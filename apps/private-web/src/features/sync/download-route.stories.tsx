import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DownloadedOrdersList } from "./downloaded-orders";
import { RouteDownloadPreview } from "./download-route";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
import { demoOrderDefinition } from "../../server/demo/work-order-fixtures";
const meta = {
  title: "Mantenimiento/Descarga de ruta",
  component: RouteDownloadPreview,
  decorators: [
    (Story) => (
      <main className="execution-panel offline-download">
        <h1>Confirmar mi ruta</h1>
        <Story />
      </main>
    ),
  ],
  args: {
    plan: {
      accountId: demoIds.account(1),
      userId: demoUserId("technician"),
      asOf: "2026-10-20T16:00:00.000Z",
      items: [2, 0, 1].map((index) => ({
        estimatedBytes: 4096,
        reservedElsewhere: false,
        timeZone: "America/Mexico_City",
        order: {
          id: demoIds.job(2000 + index),
          folio: `OT-00000${index + 1}`,
          machineId: demoIds.machine(1),
          machineCode: "ICE24-MTY-0001",
          branchId: demoIds.branch(1),
          sourceType: "ticket" as const,
          sourceId: demoIds.request(900),
          ticketId: demoIds.request(900),
          activityId: null,
          assigneeId: demoUserId("technician"),
          assigneeName: "Ana Torres",
          templateId: demoIds.template(1),
          templateVersion: 1,
          definition: demoOrderDefinition,
          state: index === 2 ? ("in_progress" as const) : ("scheduled" as const),
          dueAt: index === 0 ? "2026-10-19T16:00:00.000Z" : "2026-10-20T16:00:00.000Z",
          alertAt: null,
          rowVersion: 1,
          createdAt: "2026-10-19T16:00:00.000Z",
        },
      })),
    },
    capacity: { deviceBytes: 0, orderBytes: {} },
    results: [],
    onConfirm: fn(),
  },
} satisfies Meta<typeof RouteDownloadPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Confirmacion: Story = {};
export const Lista: Story = { args: { availableIds: meta.args.plan.items.map((i) => i.order.id) } };
export const Reservada: Story = {
  args: {
    plan: {
      ...meta.args.plan,
      items: meta.args.plan.items.map((item, index) => ({
        ...item,
        reservedElsewhere: index === 0,
      })),
    },
  },
};
export const NoCaben: Story = {
  args: { capacity: { deviceBytes: 250 * 1024 * 1024 - 6000, orderBytes: {} } },
};
export const SinConexion: Story = {
  args: {
    disabled: true,
    disabledReason:
      "Sin conexión: conéctate para iniciar y reservar órdenes. Tus descargas anteriores siguen disponibles.",
  },
};
export const ModoLectura: Story = {
  args: {
    disabled: true,
    disabledReason:
      "Modo lectura: no puedes iniciar ni reservar órdenes. Solicita acceso de escritura.",
  },
};
export const Parcial: Story = {
  args: {
    results: [
      { id: demoIds.job(2000), status: "downloaded", message: "Disponible sin conexión." },
      {
        id: demoIds.job(2001),
        status: "excluded",
        message: "Fuera de la descarga: no hay espacio disponible en el dispositivo.",
      },
      {
        id: demoIds.job(2002),
        status: "failed",
        message: "Orden reservada en otro dispositivo. Revisa el detalle.",
      },
    ],
  },
};
export const EnCurso: Story = {
  args: {
    disabled: true,
    results: [{ id: demoIds.job(2000), status: "downloaded", message: "Disponible sin conexión." }],
  },
};
export const MatrizDeEstados: Story = {
  render: (args) => (
    <>
      <h2>Ruta lista</h2>
      <RouteDownloadPreview {...args} {...Lista.args} />
      <h2>Confirmación</h2>
      <RouteDownloadPreview {...args} />
      <h2>Resultado parcial</h2>
      <RouteDownloadPreview {...args} {...Parcial.args} />
      <h2>Descargando</h2>
      <RouteDownloadPreview {...args} {...EnCurso.args} />
      <h2>No caben todas</h2>
      <RouteDownloadPreview {...args} {...NoCaben.args} />
      <h2>Reservada en otro dispositivo</h2>
      <RouteDownloadPreview {...args} {...Reservada.args} />
      <h2>Sin conexión</h2>
      <RouteDownloadPreview {...args} {...SinConexion.args} />
      <h2>Modo lectura</h2>
      <RouteDownloadPreview {...args} {...ModoLectura.args} />
    </>
  ),
};

export const DescargadasSinRed: Story = {
  render: (args) => (
    <>
      <h2>Sin conexión: tus órdenes descargadas siguen disponibles</h2>
      <DownloadedOrdersList
        message="3 órdenes disponibles en este dispositivo."
        items={args.plan.items.map(({ order }) => ({
          formatVersion: 1,
          policy: "F7-D03-proposal",
          accountId: args.plan.accountId,
          userId: args.plan.userId,
          order: { ...order, state: "in_progress" },
          execution: null,
          lease: {
            id: demoIds.job(5000),
            deviceId: demoIds.job(5001),
            userId: args.plan.userId,
            downloadedAt: args.plan.asOf,
            expiresAt: "2026-10-23T16:00:00.000Z",
          },
        }))}
      />
    </>
  ),
};

export const Desactualizada: Story = {
  args: {
    availableIds: meta.args.plan.items.map((i) => i.order.id),
    staleIds: [meta.args.plan.items[0]!.order.id],
  },
};
export const Vencida: Story = {
  render: () => (
    <DownloadedOrdersList
      items={[]}
      expiredCount={3}
      message="Reconecta para verificar tu acceso y preparar la ruta de nuevo."
    />
  ),
};
