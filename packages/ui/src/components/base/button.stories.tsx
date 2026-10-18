import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, ButtonLink, IconButton } from "./button.js";
import { ICON_NAMES } from "./icon.js";
import { MOBILE, Showcase } from "./stories-kit.js";

const meta = {
  title: "Base/Button",
  component: Button,
  args: {
    children: "Guardar borrador",
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
    fullWidth: false,
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "tertiary", "danger"],
      description: "Una sola acción primaria por región visual (UI_UX §13.1).",
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    icon: { control: "select", options: [undefined, ...ICON_NAMES] },
    iconPosition: { control: "inline-radio", options: ["start", "end"] },
    loading: { control: "boolean", description: "Evita doble envío; conserva el texto." },
    loadingLabel: { control: "text" },
    disabled: {
      control: "boolean",
      description: "Deshabilitado nativo: sale del orden de tabulación.",
    },
    disabledReason: {
      control: "text",
      description: "Motivo visible; el botón sigue enfocable y se anuncia como no disponible.",
    },
    onClick: { action: "click" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Botones del ICE24 Design System. Verbos específicos («Enviar a validación», no «Aceptar»). `md` y `lg` miden ≥ 44 px; `sm` crece a 44 px en móvil.",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variantes: Story = {
  render: (args) => (
    <>
      <Showcase title="Variantes">
        <Button {...args} variant="primary">
          Primario
        </Button>
        <Button {...args} variant="secondary">
          Secundario
        </Button>
        <Button {...args} variant="tertiary">
          Terciario
        </Button>
        <Button {...args} variant="danger">
          Peligro
        </Button>
      </Showcase>
      <Showcase title="Tamaños">
        <Button {...args} size="sm">
          Pequeño
        </Button>
        <Button {...args} size="md">
          Mediano
        </Button>
        <Button {...args} size="lg">
          Grande
        </Button>
        <IconButton icon="plus" label="Agregar máquina" variant="primary" />
        <IconButton icon="close" label="Cerrar" />
      </Showcase>
      <Showcase title="Estados">
        <Button {...args} icon="check-circle">
          Con icono
        </Button>
        <Button {...args} loading>
          Guardando
        </Button>
        <Button {...args} loading loadingLabel="Enviando…">
          Enviar a validación
        </Button>
        <Button {...args} disabled>
          Deshabilitado
        </Button>
        <Button {...args} disabledReason="La cuenta está en modo lectura.">
          Publicar
        </Button>
        <ButtonLink href="#suscripcion" variant="secondary">
          Ver suscripción (enlace)
        </ButtonLink>
      </Showcase>
    </>
  ),
};

export const Cargando: Story = { args: { loading: true, children: "Guardar" } };

export const ConMotivo: Story = {
  name: "Deshabilitado con motivo",
  args: { children: "Publicar", disabledReason: "Necesitas el permiso «Publicar documentos»." },
};

export const Movil: Story = {
  name: "Móvil (área táctil 44 px)",
  globals: MOBILE,
  render: Variantes.render!,
};
