import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Breadcrumbs, NavItem, Pagination } from "./navigation.js";
import { ICON_NAMES } from "./icon.js";
import { MOBILE, Showcase } from "./stories-kit.js";

const meta = {
  title: "Base/Navegación",
  component: NavItem,
  args: {
    href: "#maquinas",
    label: "Máquinas",
    icon: "machine",
    current: true,
    variant: "sidebar",
    collapsed: false,
  },
  argTypes: {
    variant: { control: "inline-radio", options: ["sidebar", "bottom", "inline"] },
    icon: { control: "select", options: [undefined, ...ICON_NAMES] },
    badge: { control: "number" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Destinos de navegación. La lista de destinos sale de los permisos de la API (F6-07); aquí solo se dibuja. Activo: forma + texto, no solo color.",
      },
    },
  },
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  decorators: [
    (Story, context) =>
      context.args.variant === "sidebar" ? (
        <div className="story-sidebar ids-inverse">
          <Story />
        </div>
      ) : (
        <Story />
      ),
  ],
};

function NavigationShowcase() {
  const [page, setPage] = useState(2);
  return (
    <>
      <Showcase title="Barra lateral (azul noche)">
        <nav aria-label="Principal">
          <ul className="story-sidebar ids-inverse">
            <li>
              <NavItem href="#resumen" label="Resumen" icon="home" />
            </li>
            <li>
              <NavItem href="#maquinas" label="Máquinas" icon="machine" current />
            </li>
            <li>
              <NavItem
                href="#mantenimiento"
                label="Mantenimiento"
                icon="settings"
                badge={4}
                badgeLabel="4 órdenes pendientes"
              />
            </li>
            <li>
              <NavItem href="#documentos" label="Documentos" icon="document" />
            </li>
          </ul>
        </nav>
        <nav aria-label="Principal colapsada">
          <ul className="story-sidebar ids-inverse" style={{ width: "4.5rem" }}>
            <li>
              <NavItem href="#resumen" label="Resumen" icon="home" collapsed />
            </li>
            <li>
              <NavItem href="#maquinas" label="Máquinas" icon="machine" collapsed current />
            </li>
            <li>
              <NavItem
                href="#mantenimiento"
                label="Mantenimiento"
                icon="settings"
                collapsed
                badge={4}
              />
            </li>
          </ul>
        </nav>
      </Showcase>
      <Showcase title="Navegación inferior (móvil)">
        <nav aria-label="Navegación inferior">
          <ul className="story-bottom-nav">
            <li>
              <NavItem variant="bottom" href="#inicio" label="Inicio" icon="home" current />
            </li>
            <li>
              <NavItem variant="bottom" href="#maquinas" label="Máquinas" icon="machine" />
            </li>
            <li>
              <NavItem variant="bottom" href="#tareas" label="Tareas" icon="settings" />
            </li>
            <li>
              <NavItem
                variant="bottom"
                href="#alertas"
                label="Alertas"
                icon="bell"
                badge={2}
                badgeLabel="2 alertas"
              />
            </li>
            <li>
              <NavItem variant="bottom" href="#mas" label="Más" icon="menu" />
            </li>
          </ul>
        </nav>
      </Showcase>
      <Showcase title="Migas de pan" stack>
        <Breadcrumbs
          items={[
            { label: "Máquinas", href: "#maquinas" },
            { label: "ICE24-000145", href: "#maquina" },
            { label: "Mantenimiento", href: "#mantenimiento" },
            { label: "OT-00241" },
          ]}
        />
      </Showcase>
      <Showcase title="Paginación" stack>
        <Pagination
          page={page}
          pageCount={9}
          totalItems={172}
          pageSize={20}
          onPageChange={setPage}
        />
        <Pagination
          page={1}
          hasNextPage
          onPageChange={() => undefined}
          label="Paginación por cursor"
        />
      </Showcase>
    </>
  );
}

export const Conjunto: StoryObj = {
  name: "Barra lateral, inferior y migas",
  render: () => <NavigationShowcase />,
};

export const Movil: StoryObj = {
  name: "Móvil",
  globals: MOBILE,
  render: () => <NavigationShowcase />,
};
