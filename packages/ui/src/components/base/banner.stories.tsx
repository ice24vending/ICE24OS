import type { Meta, StoryObj } from "@storybook/react-vite";

import { Banner, type BannerTone } from "./banner.js";
import { Button, ButtonLink } from "./button.js";
import { MOBILE, Showcase } from "./stories-kit.js";

const BANNERS: readonly (readonly [BannerTone, string, string])[] = [
  [
    "info",
    "Mantenimiento programado",
    "El próximo mantenimiento está programado para el 20/10/2026.",
  ],
  ["success", "Registro guardado", "La evidencia quedó guardada y el calendario se actualizó."],
  ["warning", "Control próximo a vencer", "Un control sanitario vence en 3 días."],
  ["danger", "Atención inmediata", "La máquina reportó una falla crítica."],
  [
    "readonly",
    "Cuenta en modo lectura",
    "Puedes consultar y descargar información existente, pero no crear ni modificar registros.",
  ],
  ["offline", "Sin conexión", "Solo están disponibles las funciones descargadas."],
  ["audit", "Cambio auditado", "El cambio se registró en el historial de auditoría."],
];

const meta = {
  title: "Base/Banner",
  component: Banner,
  args: {
    tone: "readonly",
    title: "Cuenta en modo lectura",
    children:
      "Puedes consultar y descargar información existente, pero no crear ni modificar registros.",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["info", "success", "warning", "danger", "readonly", "offline", "audit"],
      description:
        "`readonly` conserva el tratamiento de advertencia de F5-15; F6-04 decide el definitivo (diferencia D3).",
    },
    role: { control: "inline-radio", options: [undefined, "status", "alert"] },
    titleAs: { control: "inline-radio", options: ["h2", "h3", "p"] },
    title: { control: "text" },
    children: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Mensajes de página (UI_UX §13.4): icono + texto + acciones. Crítico y modo lectura son persistentes (sin cerrar).",
      },
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    actions: (
      <ButtonLink href="#suscripcion" variant="secondary" size="sm">
        Ver suscripción
      </ButtonLink>
    ),
  },
};

function BannerShowcase() {
  return (
    <Showcase title="Banners" stack>
      {BANNERS.map(([tone, title, text]) => (
        <Banner key={tone} tone={tone} title={title}>
          {text}
        </Banner>
      ))}
      <Banner
        tone="danger"
        title="No fue posible guardar"
        actions={
          <Button size="sm" variant="secondary">
            Reintentar
          </Button>
        }
        onDismiss={() => undefined}
      >
        El servicio no respondió. No se envió ningún cambio.
      </Banner>
    </Showcase>
  );
}

export const Tonos: Story = { render: () => <BannerShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <BannerShowcase /> };
