import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { StatusTag } from "./badge.js";
import { Banner } from "./banner.js";
import { Button, IconButton } from "./button.js";
import { Pagination } from "./navigation.js";
import { MOBILE } from "./stories-kit.js";
import { EmptyState, Table, type TableColumn } from "./table.js";

interface MachineRow {
  readonly code: string;
  readonly model: string;
  readonly branch: string;
  readonly operation: "Disponible" | "En mantenimiento" | "Fuera de servicio";
  readonly technical: "Óptimo" | "Atención preventiva" | "Crítico";
  readonly cycles: number;
}

/** Illustrative rows for the catalog; codes follow the UI_UX examples. */
const ROWS: readonly MachineRow[] = [
  {
    code: "ICE24-000145",
    model: "Modelo A",
    branch: "Sucursal Centro",
    operation: "Fuera de servicio",
    technical: "Crítico",
    cycles: 1250,
  },
  {
    code: "ICE24-000146",
    model: "Modelo A",
    branch: "Sucursal Centro",
    operation: "Disponible",
    technical: "Óptimo",
    cycles: 830,
  },
  {
    code: "ICE24-000201",
    model: "Modelo B",
    branch: "Sucursal Norte",
    operation: "En mantenimiento",
    technical: "Atención preventiva",
    cycles: 4410,
  },
  {
    code: "ICE24-000087",
    model: "Modelo B",
    branch: "Sucursal Sur",
    operation: "Disponible",
    technical: "Óptimo",
    cycles: 96,
  },
];

const OPERATION_TONE = {
  Disponible: "success",
  "En mantenimiento": "info",
  "Fuera de servicio": "danger",
} as const;
const TECHNICAL_TONE = {
  Óptimo: "success",
  "Atención preventiva": "warning",
  Crítico: "danger",
} as const;

const COLUMNS: readonly TableColumn<MachineRow>[] = [
  {
    id: "code",
    header: "Máquina",
    cell: (row) => row.code,
    sortValue: (row) => row.code,
    mono: true,
    mobile: "title",
  },
  { id: "model", header: "Modelo", cell: (row) => row.model, priority: "low" },
  { id: "branch", header: "Sucursal", cell: (row) => row.branch, sortValue: (row) => row.branch },
  {
    id: "operation",
    header: "Operación",
    cell: (row) => (
      <StatusTag tone={OPERATION_TONE[row.operation]} icon="activity" dimension="Operación">
        {row.operation}
      </StatusTag>
    ),
  },
  {
    id: "technical",
    header: "Técnico",
    cell: (row) => (
      <StatusTag tone={TECHNICAL_TONE[row.technical]} icon="settings" dimension="Técnico">
        {row.technical}
      </StatusTag>
    ),
  },
  {
    id: "cycles",
    header: "Ciclos",
    cell: (row) => row.cycles.toLocaleString("es-MX"),
    sortValue: (row) => row.cycles,
    numeric: true,
    mobile: "hidden",
  },
];

interface TableStoryArgs {
  readonly state: "datos" | "carga" | "vacío" | "error";
  readonly selectable: boolean;
  readonly density: "comfortable" | "compact";
  readonly withActions: boolean;
}

function TableStory({ state, selectable, density, withActions }: TableStoryArgs) {
  const [page, setPage] = useState(1);
  return (
    <Table
      caption="Máquinas de la cuenta"
      columns={COLUMNS}
      rows={state === "vacío" ? [] : ROWS}
      getRowId={(row) => row.code}
      getRowLabel={(row) => row.code}
      loading={state === "carga"}
      error={
        state === "error" ? (
          <Banner tone="danger" title="No fue posible cargar las máquinas" titleAs="p">
            El servicio no respondió. No se perdió información.
          </Banner>
        ) : undefined
      }
      empty={
        <EmptyState
          title="Todavía no hay máquinas"
          description="Registra la primera máquina de esta sucursal para empezar a programar su mantenimiento."
          action={<Button icon="plus">Registrar máquina</Button>}
        />
      }
      selectable={selectable}
      density={density}
      rowActions={
        withActions
          ? (row) => <IconButton icon="chevron-right" label={`Ver ${row.code}`} size="sm" />
          : undefined
      }
      footer={
        <Pagination
          page={page}
          pageCount={3}
          totalItems={42}
          pageSize={20}
          onPageChange={setPage}
        />
      }
    />
  );
}

const meta = {
  title: "Base/Table",
  component: TableStory,
  args: { state: "datos", selectable: false, density: "comfortable", withActions: true },
  argTypes: {
    state: { control: "inline-radio", options: ["datos", "carga", "vacío", "error"] },
    density: { control: "inline-radio", options: ["comfortable", "compact"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Tabla con orden (`aria-sort`), selección, estados de carga/vacío/error, folios en monoespaciada y tarjetas en móvil (< 768 px). Las columnas `low` se ocultan en tableta.",
      },
    },
  },
} satisfies Meta<typeof TableStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Datos: Story = {};
export const Seleccion: Story = { name: "Selección", args: { selectable: true } };
export const Compacta: Story = { args: { density: "compact" } };
export const Carga: Story = { args: { state: "carga" } };
export const Vacia: Story = { name: "Vacía", args: { state: "vacío" } };
export const ConError: Story = { name: "Error", args: { state: "error" } };
export const Movil: Story = {
  name: "Móvil (tarjetas)",
  globals: MOBILE,
  args: { selectable: true },
};
