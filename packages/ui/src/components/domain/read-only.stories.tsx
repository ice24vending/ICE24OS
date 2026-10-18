import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../base/button.js";
import { TextField } from "../base/field.js";
import { MOBILE, Showcase } from "../base/stories-kit.js";
import { ReadOnlyBanner, ReadOnlyIndicator } from "./read-only.js";

const meta = {
  title: "Dominio/Modo lectura",
  component: ReadOnlyBanner,
  args: {
    active: true,
    title: "Cuenta en modo lectura",
    reason: "El último pago de la suscripción fue rechazado.",
    action: "Actualiza el método de pago en Suscripción para recuperar la edición.",
    subscriptionHref: "#suscripcion",
    subscriptionLabel: "Ver suscripción",
  },
  argTypes: {
    active: { control: "boolean" },
    reason: { control: "text" },
    action: { control: "text" },
    subscriptionHref: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Barra persistente de modo lectura (UI_UX §13.7, §25; F5-03) e indicador local. D3 decidido en F6-04: un solo tratamiento — advertencia + candado + consecuencia escrita — en barra, banner e indicador.",
      },
    },
  },
} satisfies Meta<typeof ReadOnlyBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function ReadOnlyShowcase() {
  return (
    <>
      <Showcase title="Barra global, según quién la ve" stack>
        <ReadOnlyBanner
          active
          subscriptionHref="#suscripcion"
          reason="El último pago de la suscripción fue rechazado."
          action="Actualiza el método de pago en Suscripción para recuperar la edición."
        />
        <ReadOnlyBanner
          active
          subscriptionHref="#suscripcion"
          reason="La demo terminó."
          action="Pide a la persona propietaria de la cuenta que contrate el plan."
        />
      </Showcase>
      <Showcase title="Indicador local">
        <ReadOnlyIndicator />
        <ReadOnlyIndicator scope="permission" />
        <ReadOnlyIndicator reason="No puedes registrar evidencias nuevas." />
      </Showcase>
      <Showcase title="Formulario bloqueado desde el inicio (§25.2)" stack>
        <ReadOnlyIndicator reason="Puedes consultar esta bitácora, pero no modificarla." />
        <TextField label="Concentración" suffix="ppm" defaultValue="150" readOnly />
        <Button disabledReason="La cuenta está en modo lectura.">Guardar bitácora</Button>
      </Showcase>
    </>
  );
}

export const Estados: Story = { render: () => <ReadOnlyShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <ReadOnlyShowcase /> };
