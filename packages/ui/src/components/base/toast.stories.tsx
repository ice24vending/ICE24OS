import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button.js";
import { Showcase } from "./stories-kit.js";
import { Toast, ToastProvider, useToast, type ToastTone } from "./toast.js";

function ToastButtons({ tone }: { readonly tone: ToastTone }) {
  const { show } = useToast();
  return (
    <Showcase title="Toast">
      <Button
        onClick={() =>
          show({ tone, title: "Registro guardado", description: "El calendario se actualizó." })
        }
      >
        Mostrar confirmación
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          show({
            tone: "info",
            title: "Tarea archivada",
            duration: null,
            action: { label: "Deshacer", onClick: () => undefined },
          })
        }
      >
        Mostrar con acción
      </Button>
    </Showcase>
  );
}

function ToastPlayground({ tone }: { readonly tone: ToastTone }) {
  return (
    <ToastProvider>
      <ToastButtons tone={tone} />
    </ToastProvider>
  );
}

const meta = {
  title: "Base/Toast",
  component: ToastPlayground,
  args: { tone: "success" },
  argTypes: { tone: { control: "inline-radio", options: ["info", "success", "warning"] } },
  parameters: {
    docs: {
      description: {
        component:
          "Confirmaciones no críticas y reversibles (UI_UX §13.4). Región `aria-live=polite` siempre presente; no mueve el foco y el temporizador se pausa con el puntero o el foco. Los errores que requieren acción usan Banner.",
      },
    },
  },
} satisfies Meta<typeof ToastPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Static toasts, for the gallery capture (a live toast closes before the screenshot). */
export const Visibles: Story = {
  render: () => (
    <Showcase title="Tonos" stack>
      {(["success", "info", "warning"] as const).map((tone) => (
        <Toast
          key={tone}
          tone={tone}
          duration={null}
          title={
            tone === "success"
              ? "Registro guardado"
              : tone === "info"
                ? "Tarea archivada"
                : "Pendiente de sincronizar"
          }
          description={tone === "warning" ? "Se enviará al volver la conexión." : undefined}
          action={tone === "info" ? { label: "Deshacer", onClick: () => undefined } : undefined}
          onDismiss={() => undefined}
        />
      ))}
    </Showcase>
  ),
};
