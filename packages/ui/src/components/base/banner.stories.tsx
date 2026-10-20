import type { Meta, StoryObj } from "@storybook/react-vite";

import { Banner, type BannerTone } from "./banner.js";
import { Button, ButtonLink } from "./button.js";
import { MOBILE, Showcase } from "./stories-kit.js";
import { componentDocs, na, StateMatrix } from "../../stories/catalog-kit.js";

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

const DOCS = componentDocs({
  summary:
    "Mensaje de página (UI_UX §13.4): icono + título + texto + acciones. Crítico, modo lectura y sin conexión son persistentes.",
  use: [
    "Errores que exigen acción, avisos persistentes, modo lectura y sin conexión.",
    "Confirmar algo importante que la persona debe leer antes de seguir.",
    "Dentro de una tarjeta o diálogo para el error de ese bloque.",
  ],
  avoid: [
    "Confirmaciones breves y reversibles: usa Toast.",
    "Varios banners apilados del mismo tono: agrúpalos en uno.",
    "Con botón de cerrar en avisos críticos o de modo lectura.",
  ],
  accessibility: [
    'Región nombrada por su título; `role="alert"` solo para errores que bloquean.',
    "Para anunciar un banner que aparece después, su contenedor `aria-live` debe existir antes.",
    "El icono es decorativo; el tono también se dice en el título.",
  ],
  copy: [
    "Título con el hecho: «No fue posible guardar».",
    "Texto con la consecuencia: «No se envió ningún cambio.»",
    "Acción concreta: «Reintentar», «Ver suscripción».",
  ],
});

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
        component: DOCS,
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

export const MatrizDeEstados: Story = {
  name: "Matriz de estados",
  render: () => (
    <StateMatrix
      component="Banner"
      layout="list"
      cells={{
        normal: (
          <Banner tone="info" title="Mantenimiento programado" titleAs="p">
            El próximo mantenimiento está programado para el 20/10/2026.
          </Banner>
        ),
        loading: na("la carga se muestra con esqueleto o progreso, no con banner."),
        empty: na("un banner siempre comunica algo; sin mensaje no se dibuja."),
        error: (
          <Banner
            tone="danger"
            title="No fue posible guardar"
            titleAs="p"
            actions={
              <Button size="sm" variant="secondary">
                Reintentar
              </Button>
            }
          >
            El servicio no respondió. No se envió ningún cambio.
          </Banner>
        ),
        forbidden: (
          <Banner tone="warning" title="Sin permiso" titleAs="p">
            No tienes permiso para consultar este recurso.
          </Banner>
        ),
        readonly: (
          <Banner
            tone="readonly"
            title="Cuenta en modo lectura"
            titleAs="p"
            actions={
              <ButtonLink href="#suscripcion" variant="secondary" size="sm">
                Ver suscripción
              </ButtonLink>
            }
          >
            Puedes consultar y descargar información existente, pero no crear ni modificar
            registros.
          </Banner>
        ),
        disabled: na("los banners no se deshabilitan."),
        focus: (
          <Banner
            tone="offline"
            title="Sin conexión"
            titleAs="p"
            actions={
              <Button size="sm" variant="secondary">
                Ver pendientes
              </Button>
            }
          >
            Tus cambios se guardaron en este dispositivo.
          </Banner>
        ),
      }}
    />
  ),
};
