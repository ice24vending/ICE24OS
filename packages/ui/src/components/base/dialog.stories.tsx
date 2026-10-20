import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "./button.js";
import { Checkbox } from "./choice.js";
import { Dialog } from "./dialog.js";
import { TextArea } from "./field.js";
import { MOBILE } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";
import { Banner } from "./banner.js";

interface DialogStoryArgs {
  readonly initiallyOpen: boolean;
  readonly role: "dialog" | "alertdialog";
  readonly size: "sm" | "md" | "lg";
  readonly busy: boolean;
}

function DialogStory({ initiallyOpen, role, size, busy }: DialogStoryArgs) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div style={{ padding: "var(--space-6)" }}>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Retirar máquina
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        role={role}
        size={size}
        dismissible={!busy}
        title="Retirar máquina ICE24-000145"
        description="Dejará de aparecer en la operación diaria. Su historial técnico y sanitario se conserva."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabledReason={busy ? "Espera a que termine." : undefined}
            >
              Cancelar
            </Button>
            <Button variant="danger" loading={busy}>
              Retirar máquina
            </Button>
          </>
        }
      >
        <TextArea label="Motivo del retiro" required maxLength={500} showCount />
        <Checkbox label="Confirmo que revisé los datos" required />
      </Dialog>
    </div>
  );
}

const DOCS = componentDocs({
  summary:
    "Diálogo modal (UI_UX §13.6, §13.7 «Confirmación de acción sensible»): foco atrapado, Esc cierra y el foco vuelve al botón que lo abrió. En móvil es una hoja inferior.",
  use: [
    "Confirmar una acción sensible: entidad, consecuencia, motivo y botón específico.",
    "Un formulario corto que no merece página propia.",
    '`role="alertdialog"` cuando la decisión tiene consecuencias.',
  ],
  avoid: [
    "Diálogos apilados: cierra el actual o navega a una página.",
    "Flujos largos o con varios pasos: usa una página dedicada.",
    "Avisos informativos: usa Banner o Toast.",
  ],
  accessibility: [
    "Título y descripción asociados; foco inicial en el primer control.",
    "Tab y Shift+Tab no salen del diálogo; el resto de la página queda inerte.",
    "`dismissible={false}` mientras corre la acción, para no perder el resultado.",
  ],
  copy: [
    "Título con acción y entidad: «Retirar máquina ICE24-000145».",
    "Botón con el verbo, nunca «Aceptar»: «Retirar máquina».",
    "Consecuencia: «El historial técnico y sanitario se conserva.»",
  ],
});

const meta = {
  title: "Base/Dialog",
  component: DialogStory,
  args: { initiallyOpen: true, role: "alertdialog", size: "md", busy: false },
  argTypes: {
    initiallyOpen: { control: "boolean", description: "Abierto al cargar la historia." },
    role: { control: "inline-radio", options: ["dialog", "alertdialog"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    busy: {
      control: "boolean",
      description: "Acción en curso: Esc y el botón cerrar no hacen nada.",
    },
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 640 },
      description: {
        component: DOCS,
      },
    },
  },
} satisfies Meta<typeof DialogStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Confirmacion: Story = { name: "Confirmación" };
export const Cerrado: Story = { args: { initiallyOpen: false } };
export const EnProceso: Story = { name: "Acción en curso", args: { busy: true } };
export const Movil: Story = { name: "Móvil (hoja inferior)", globals: MOBILE };

function MatrixDialog({
  trigger,
  busy = false,
  error,
}: {
  readonly trigger: string;
  readonly busy?: boolean;
  readonly error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        role="alertdialog"
        dismissible={!busy}
        title="Retirar máquina ICE24-000145"
        description="El historial técnico y sanitario se conserva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={busy} loadingLabel="Retirando…">
              Retirar máquina
            </Button>
          </>
        }
      >
        {error && (
          <Banner tone="danger" role="alert" title="No fue posible retirar la máquina" titleAs="p">
            {error}
          </Banner>
        )}
        <TextArea label="Motivo del retiro" required maxLength={500} showCount />
      </Dialog>
    </>
  );
}

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Dialog"
      cells={{
        normal: <MatrixDialog trigger="Abrir diálogo" />,
        loading: <MatrixDialog trigger="Abrir mientras se envía" busy />,
        empty: na("un diálogo siempre tiene título, consecuencia y acción."),
        error: (
          <MatrixDialog
            trigger="Abrir con error"
            error="El servicio no respondió. No se retiró la máquina."
          />
        ),
        forbidden: na("sin permiso no se ofrece el botón que abre el diálogo."),
        readonly: (
          <Button variant="danger" disabledReason="La cuenta está en modo lectura.">
            Retirar máquina
          </Button>
        ),
        disabled: na(
          "el diálogo no se deshabilita; mientras se envía no se puede cerrar (ver Carga).",
        ),
        focus: <MatrixDialog trigger="Abrir diálogo" />,
      }}
    />
  ),
};
