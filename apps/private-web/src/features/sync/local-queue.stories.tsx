import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState, type ComponentProps } from "react";
import { SynchronizationCenter } from "./synchronization-center";
import { offlineDb } from "./local-orders";
import { demoIds, demoUserId } from "../../server/demo/fixtures";
function QueueDemo(props: ComponentProps<typeof SynchronizationCenter>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const ids = ["local-queue-story-pending", "local-queue-story-conflict"];
    void offlineDb.pendingOperations
      .bulkPut(
        ids.map((id, index) => ({
          id,
          accountId: props.owner.accountId,
          userId: props.owner.userId,
          action: "work-order-execution",
          createdAt: "2026-10-20T16:00:00.000Z",
          state: index ? ("conflict" as const) : ("pending" as const),
          ...(index
            ? { error: "La versión del servidor cambió. Revisión pendiente al reconectar." }
            : {}),
        })),
      )
      .then(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
      void offlineDb.pendingOperations.bulkDelete(ids);
    };
  }, [props.owner.accountId, props.owner.userId]);
  return ready ? (
    <SynchronizationCenter {...props} />
  ) : (
    <p role="status">Preparando datos ficticios…</p>
  );
}
const meta = {
  title: "Mantenimiento/Cola local",
  component: SynchronizationCenter,
  args: {
    owner: { accountId: demoIds.account(1), userId: demoUserId("technician") },
    contextId: "demo",
    csrfToken: "",
    canExecute: false,
    localOnly: true,
  },
  render: (args) => <QueueDemo {...args} />,
} satisfies Meta<typeof SynchronizationCenter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SinConexion: Story = {};
export const MatrizDeEstados: Story = {};
