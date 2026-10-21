import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextSelector, FocusLostBanner } from "./context-selector";
import type { ContextSelectorData } from "./model";
import "./context.css";

/**
 * F6-08 context selector. Data is fictitious, shaped like the shell's server data. Choosing an
 * option posts to the BFF, which Storybook does not have: the error state then shows.
 */
const id = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const POLAR = {
  accountId: id("a0000000", 1),
  accountName: "Hielo Polar del Norte",
  roles: "Propietario de cuenta",
  readOnly: false,
};
const BAJIO = {
  accountId: id("a0000000", 2),
  accountName: "Agua y Hielo del Bajío",
  roles: "Operador",
  readOnly: true,
};
const CENTRO = { id: id("b0000000", 1), name: "Centro Monterrey" };
const CUMBRES = { id: id("b0000000", 2), name: "Cumbres" };
const JUAREZ = {
  id: id("c0000000", 1),
  name: "Despachadora Juárez",
  code: "ICE24-MTY-0001",
  branchId: CENTRO.id,
};
const LEONES = {
  id: id("c0000000", 3),
  name: "Despachadora Leones",
  code: "ICE24-MTY-0003",
  branchId: CUMBRES.id,
};
const DATA: ContextSelectorData = {
  current: POLAR,
  accounts: [POLAR, BAJIO],
  options: { branches: [CENTRO, CUMBRES], machines: [JUAREZ, LEONES] },
  branch: null,
  machine: null,
  focusLost: false,
};
const MOBILE = { viewport: { value: "mobile", isRotated: false } } as const;

const meta: Meta<typeof ContextSelector> = {
  title: "Shell/Selector de contexto",
  component: ContextSelector,
  args: { data: DATA, csrfToken: "storybook" },
  decorators: [
    (Story) => (
      <header style={{ display: "flex", padding: "var(--space-2) var(--space-4)" }}>
        <Story />
      </header>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "Siempre muestra cuenta, rol, sucursal y máquina (UI_UX §10.2). Las listas llegan del servidor ya limitadas al alcance del rol; en móvil el diálogo se abre como hoja inferior. Al cambiar, el navegador carga una página nueva y descarta los datos del contexto anterior.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const openSelector: Story["play"] = async ({ canvasElement }) => {
  canvasElement.querySelector<HTMLButtonElement>(".context-trigger")?.click();
};

export const Cerrado: Story = {};

export const ConSucursalYMaquina: Story = {
  name: "Con sucursal y máquina",
  args: { data: { ...DATA, branch: CENTRO, machine: JUAREZ } },
};

export const Abierto: Story = { play: openSelector };

export const Movil: Story = { name: "Móvil (hoja inferior)", globals: MOBILE, play: openSelector };

export const SinPermisoDeEquipos: Story = {
  name: "Rol sin elección de sucursal",
  args: { data: { ...DATA, options: "forbidden" } },
  play: openSelector,
};

export const SinSucursales: Story = {
  name: "Vacío",
  args: { data: { ...DATA, options: { branches: [], machines: [] } } },
  play: openSelector,
};

export const ErrorDeCarga: Story = {
  name: "Error de carga",
  args: { data: { ...DATA, current: null, accounts: null, options: null } },
  play: openSelector,
};

export const AccesoPerdido: Story = {
  name: "Acceso perdido",
  render: (args) => (
    <div style={{ display: "grid", gap: "var(--space-4)", width: "100%" }}>
      <ContextSelector {...args} />
      <FocusLostBanner csrfToken="storybook" />
    </div>
  ),
};
