import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "./button.js";
import { Checkbox } from "./choice.js";
import { Dialog } from "./dialog.js";
import { TextArea } from "./field.js";
import { MOBILE } from "./stories-kit.js";

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
        component:
          "Foco atrapado, Esc cierra, el resto de la página queda inerte y el foco vuelve al botón que lo abrió. En móvil es una hoja inferior. No se apilan (UI_UX §13.6).",
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
