import type { Meta, StoryObj } from "@storybook/react-vite";
import { OfflineStatus } from "./offline-status";
const meta = {
  id: "maintenance-offline-work",
  title: "Mantenimiento/Trabajo sin conexión",
  component: OfflineStatus,
  args: {
    state: "saved_locally",
    pending: 2,
    message: "Guardado en este dispositivo. Las fotos se verifican antes de aplicar el cierre.",
  },
} satisfies Meta<typeof OfflineStatus>;
export default meta;
type Story = StoryObj<typeof meta>;
export const GuardadoLocal: Story = {};
export const Disponible: Story = {
  args: {
    state: "available_offline",
    pending: 0,
    message: "Descarga verificada. Puedes salir a campo.",
  },
};
export const SinConexion: Story = { args: { state: "offline" } };
export const FotosPendientes: Story = { args: { state: "pending", pending: 3 } };
export const Error: Story = {
  args: { state: "error", message: "La subida se interrumpió. Conservamos la foto y el original." },
};
export const AlmacenamientoLleno: Story = {
  args: {
    state: "storage_full",
    message: "No se guardó el último cambio. Libera espacio antes de cerrar esta página.",
  },
};
export const MatrizDeEstados: Story = {
  render: () => (
    <>
      {[
        "available_offline",
        "saved_locally",
        "offline",
        "pending",
        "syncing",
        "error",
        "conflict",
        "storage_full",
        "storage_unavailable",
        "synced",
      ].map((state) => (
        <OfflineStatus
          key={state}
          state={state as typeof meta.args.state}
          pending={2}
          message="Estado de la copia local del técnico."
        />
      ))}
    </>
  ),
};
