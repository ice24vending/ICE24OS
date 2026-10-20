import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../base/button.js";
import { TextField } from "../base/field.js";
import { MOBILE, Showcase } from "../base/stories-kit.js";
import { ReadOnlyBanner, ReadOnlyIndicator } from "./read-only.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

const DOCS = componentDocs({
  summary:
    "Barra persistente de modo lectura e indicador local (UI_UX §13.7, §25; F5-03). Un solo tratamiento: advertencia + candado + consecuencia escrita.",
  use: [
    "ReadOnlyBanner: una vez, en el shell de la cuenta, mientras dure el modo.",
    "ReadOnlyIndicator: junto a un título, sección o formulario que no se puede modificar.",
    '`scope="permission"` cuando el límite viene del rol, no de la suscripción.',
  ],
  avoid: [
    "Deshabilitar formularios sin decirlo antes: avisa desde el inicio del flujo (UI_UX §25.2).",
    "Cerrar la barra: es persistente.",
    "Bloquear descargas o consultas: siguen disponibles.",
  ],
  accessibility: [
    "La región `aria-live` siempre está montada, así que un cambio tardío se anuncia.",
    "El candado es decorativo; el texto dice el estado.",
  ],
  copy: [
    "«Cuenta en modo lectura. Puedes consultar y descargar información existente, pero no crear ni modificar registros.»",
    "«Solo consulta» para roles sin edición.",
    "Acción según permiso: «Ver suscripción» o «Pide a la persona propietaria…»",
  ],
});

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
        component: DOCS,
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

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="ReadOnlyBanner"
      layout="list"
      cells={{
        normal: (
          <ReadOnlyBanner
            active
            subscriptionHref="#suscripcion"
            reason="El último pago de la suscripción fue rechazado."
          />
        ),
        loading: na("el modo llega con la sesión; no tiene estado de carga."),
        empty: (
          <>
            <ReadOnlyBanner active={false} />
            <p>Cuenta activa: la región viva está montada, sin barra.</p>
          </>
        ),
        error: na(
          "si el modo no se pudo leer, la API sigue bloqueando la escritura y la barra aparece al primer rechazo.",
        ),
        forbidden: (
          <ReadOnlyIndicator
            scope="permission"
            reason="Tu rol solo puede consultar esta sección."
          />
        ),
        readonly: (
          <>
            <ReadOnlyIndicator reason="No puedes registrar evidencias nuevas." />
            <Button disabledReason="La cuenta está en modo lectura.">Registrar evidencia</Button>
          </>
        ),
        disabled: na("la barra no se deshabilita ni se cierra."),
        focus: <ReadOnlyBanner active subscriptionHref="#suscripcion" />,
      }}
    />
  ),
};
