import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { StatusTag } from "../components/base/badge.js";
import { ButtonLink } from "../components/base/button.js";
import { Card } from "../components/base/card.js";
import { Breadcrumbs } from "../components/base/navigation.js";
import { MOBILE } from "../components/base/stories-kit.js";
import { Tabs } from "../components/base/tabs.js";
import { CriticalAlert } from "../components/domain/critical-alert.js";
import { MachineTriad } from "../components/domain/machine-triad.js";
import { componentDocs } from "./catalog-kit.js";

/**
 * Mock-up of the machine file (UI_UX §14.6) built only with catalog components, to validate
 * composition and hierarchy before Phase 7 builds the real screen. Fictitious data.
 */
function MachineFile() {
  return (
    <div className="catalog-screen">
      <Breadcrumbs items={[{ label: "Máquinas", href: "#maquinas" }, { label: "ICE24-000145" }]} />
      <header className="catalog-screen__header">
        <h1 className="catalog-screen__title">ICE24-000145</h1>
        <p className="catalog-screen__meta">ICE24 450 kg · Serie FAB-44910 · Sucursal Centro</p>
        <div className="catalog-screen__states">
          <MachineTriad
            display="chips"
            machine="ICE24-000145"
            operational="available"
            technical="preventive_attention"
            sanitary="corrective_action"
          />
          <StatusTag tone="success" icon="document" dimension="Visibilidad">
            Publicado
          </StatusTag>
        </div>
      </header>
      <Tabs
        label="Secciones del expediente"
        items={[
          {
            id: "resumen",
            label: "Resumen",
            content: (
              <div className="catalog-screen__grid">
                <Card title="Próximas actividades" icon="clock" titleAs="h2">
                  <ul className="catalog-screen__list">
                    <li>Cambio de filtro · en 3 días</li>
                    <li>Limpieza · hoy</li>
                  </ul>
                </Card>
                <CriticalAlert
                  title="Análisis no conforme"
                  message="Concentración de cloro fuera de rango."
                  priority="critical"
                  status="read"
                  pinned
                  version={3}
                  elapsed="hace 7 h"
                  responsible="Responsable sanitario"
                  onAcknowledge={fn()}
                  onAttend={fn()}
                  titleAs="h2"
                />
                <Card title="Estado técnico" icon="tool" tone="warning" titleAs="h2">
                  8 de 9 actividades al día · 1 vencida
                </Card>
                <Card
                  title="Estado sanitario"
                  icon="shield"
                  tone="danger"
                  titleAs="h2"
                  actions={
                    <ButtonLink href="#ac" variant="tertiary" size="sm">
                      Ver AC-0032
                    </ButtonLink>
                  }
                >
                  Acción correctiva AC-0032 · próximo análisis 08/11/2026
                </Card>
              </div>
            ),
          },
          { id: "tecnico", label: "Técnico", content: <p>Órdenes y componentes.</p> },
          { id: "sanidad", label: "Sanidad", content: <p>Bitácoras y análisis.</p> },
          { id: "documentos", label: "Documentos", content: <p>Archivos de la máquina.</p> },
          { id: "historial", label: "Historial", content: <p>Eventos auditados.</p> },
        ]}
      />
    </div>
  );
}

const meta = {
  title: "Pantallas/Expediente de máquina",
  component: MachineFile,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: componentDocs({
          summary:
            "Maqueta del expediente de máquina (UI_UX §14.6) armada solo con componentes del catálogo. Valida jerarquía: identidad, tres estados, alerta fijada y dominios en pestañas. La pantalla real llega en la Fase 7.",
          use: ["Revisar composición y prioridad visual antes de construir la pantalla."],
          avoid: [
            "Tomarla como pantalla terminada: no tiene datos, permisos ni navegación reales.",
          ],
          accessibility: [
            "Un solo `h1`; tarjetas con `h2`; migas de pan antes del título.",
            "Los estados se leen con su dimensión.",
          ],
          copy: ["Encabezado: código, modelo, serie y sucursal."],
        }),
      },
    },
  },
} satisfies Meta<typeof MachineFile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Escritorio: Story = {};

export const Movil: Story = { name: "Móvil", globals: MOBILE };
