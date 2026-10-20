import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button.js";
import { Showcase } from "./stories-kit.js";
import { Toast, ToastProvider, useToast, type ToastTone } from "./toast.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

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

const DOCS = componentDocs({
  summary:
    "Confirmaciones breves y reversibles (UI_UX §13.4). La región `aria-live` siempre está montada; no mueve el foco y el temporizador se pausa con el puntero o el foco.",
  use: [
    "Confirmar una acción que ya terminó y no es crítica: «Registro guardado».",
    "Ofrecer «Deshacer» durante unos segundos.",
  ],
  avoid: [
    "Errores que exigen acción o alertas críticas: usa Banner o CriticalAlert.",
    "Información que la persona necesita después: el toast desaparece.",
    "Más de una confirmación por acción.",
  ],
  accessibility: [
    "Se anuncia de forma educada; no roba el foco.",
    "Se pausa con el puntero y el foco (WCAG 2.2.1); `duration: null` lo deja hasta cerrarlo.",
  ],
  copy: [
    "Hecho en pasado: «Registro guardado».",
    "Detalle opcional: «El calendario se actualizó.»",
    "Acción corta: «Deshacer».",
  ],
});

const meta = {
  title: "Base/Toast",
  component: ToastPlayground,
  args: { tone: "success" },
  argTypes: { tone: { control: "inline-radio", options: ["info", "success", "warning"] } },
  parameters: {
    docs: {
      description: {
        component: DOCS,
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

const noop = () => undefined;

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Toast"
      cells={{
        normal: (
          <Toast
            tone="success"
            title="Registro guardado"
            description="El calendario se actualizó."
            duration={null}
            onDismiss={noop}
          />
        ),
        loading: na(
          "el toast confirma algo que ya terminó; el progreso se muestra en el botón o la página.",
        ),
        empty: na("un toast siempre tiene título."),
        error: na(
          "los errores que requieren acción usan Banner; el toast no tiene tono de error (UI_UX §13.4).",
        ),
        forbidden: na("no aplica a confirmaciones."),
        readonly: na("en modo lectura no hay acciones que confirmar."),
        disabled: na("los toasts no se deshabilitan."),
        focus: (
          <Toast
            tone="info"
            title="Tarea archivada"
            duration={null}
            action={{ label: "Deshacer", onClick: noop }}
            onDismiss={noop}
          />
        ),
      }}
    />
  ),
};
