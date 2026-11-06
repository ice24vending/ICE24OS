import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { EvidenceLot, EvidenceReading, EvidenceSignature, PhotoCapture } from "./evidence.js";
const meta = {
  title: "Dominio/Evidencia",
  component: EvidenceReading,
  args: {
    label: "Temperatura de salida",
    unit: "°C",
    value: 2,
    minimum: 0,
    maximum: 5,
    onChange: fn(),
  },
} satisfies Meta<typeof EvidenceReading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Lectura: Story = {};
export const FueraDeRango: Story = { args: { value: 10 } };
export const MatrizDeEstados: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "2rem", maxWidth: "40rem" }}>
      <PhotoCapture label="Foto antes" onPrepared={fn()} onError={fn()} />
      <PhotoCapture label="Foto en modo lectura" disabled onPrepared={fn()} onError={fn()} />
      <EvidenceReading
        label="Temperatura"
        unit="°C"
        value=""
        onChange={fn()}
        minimum={0}
        maximum={5}
      />
      <EvidenceReading
        label="Lectura fuera de rango"
        unit="°C"
        value={10}
        onChange={fn()}
        minimum={0}
        maximum={5}
      />
      <EvidenceLot label="Lote de la pieza" value="LOT-2026-04" onChange={fn()} />
      <EvidenceSignature
        label="Nombre de quien confirma"
        value=""
        onConfirm={fn()}
        onInvalidate={fn()}
      />
      <EvidenceSignature
        label="Confirmación conservada"
        value="Ana Torres"
        disabled
        onConfirm={fn()}
        onInvalidate={fn()}
      />
    </div>
  ),
};
