import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../base/card.js";
import { MOBILE, Showcase } from "../base/stories-kit.js";
import {
  MachineTriad,
  OPERATIONAL_STATES,
  SANITARY_STATES,
  TECHNICAL_STATES,
} from "./machine-triad.js";

const meta = {
  title: "Dominio/MachineTriad",
  component: MachineTriad,
  args: {
    machine: "ICE24-000145",
    operational: "available",
    technical: "preventive_attention",
    sanitary: "corrective_action",
    display: "labeled",
    layout: "row",
    loading: false,
  },
  argTypes: {
    operational: { control: "select", options: [null, ...Object.keys(OPERATIONAL_STATES)] },
    technical: { control: "select", options: [null, ...Object.keys(TECHNICAL_STATES)] },
    sanitary: { control: "select", options: [null, ...Object.keys(SANITARY_STATES)] },
    display: {
      control: "inline-radio",
      options: ["labeled", "chips"],
      description:
        "`chips` solo muestra el estado (encabezado del expediente); la dimensión se lee igual.",
    },
    layout: { control: "inline-radio", options: ["row", "stack"] },
    machine: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Tres estados independientes de la máquina (UI_UX §6.4, §13.7): nunca se fusionan. El estado crítico dominante (sanitario primero) se dibuja sólido; los demás siguen visibles.",
      },
    },
  },
} satisfies Meta<typeof MachineTriad>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

function TriadShowcase() {
  return (
    <>
      <Showcase title="Combinaciones frecuentes" stack>
        <MachineTriad
          machine="ICE24-000145"
          operational="available"
          technical="optimal"
          sanitary="up_to_date"
        />
        <MachineTriad
          machine="ICE24-000146"
          operational="available"
          technical="preventive_attention"
          sanitary="corrective_action"
        />
        <MachineTriad
          machine="ICE24-000147"
          operational="maintenance"
          technical="critical"
          sanitary="expiring_soon"
        />
        <MachineTriad
          machine="ICE24-000148"
          operational="out_of_service"
          technical="attention_required"
          sanitary="restricted"
        />
        <MachineTriad
          machine="ICE24-000149"
          operational="retired"
          technical={null}
          sanitary={null}
        />
      </Showcase>
      <Showcase title="Encabezado del expediente (solo chips)">
        <MachineTriad
          display="chips"
          machine="ICE24-000145"
          operational="available"
          technical="preventive_attention"
          sanitary="corrective_action"
        />
      </Showcase>
      <Showcase title="Cargando">
        <MachineTriad loading operational={null} technical={null} sanitary={null} />
      </Showcase>
      <Showcase title="En una tarjeta de máquina">
        <Card
          as="article"
          title="ICE24-000145"
          titleAs="h3"
          description="ICE24 450 kg · Sucursal Centro"
          icon="machine"
        >
          <MachineTriad
            layout="stack"
            machine="ICE24-000145"
            operational="available"
            technical="preventive_attention"
            sanitary="corrective_action"
          />
        </Card>
      </Showcase>
    </>
  );
}

export const Estados: Story = { render: () => <TriadShowcase /> };

export const Movil: Story = { name: "Móvil", globals: MOBILE, render: () => <TriadShowcase /> };
