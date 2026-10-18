import type { HTMLAttributes } from "react";

import { StatusTag } from "../base/badge.js";
import type { IconName } from "../base/icon.js";
import { cx, type StatusTone } from "../base/shared.js";

/** Machine states of API.md (Machine) and Database.md `machines`; labels of the PRD glossary. */
export type OperationalStatus =
  "available" | "off" | "maintenance" | "out_of_service" | "suspended" | "retired";
export type TechnicalStatus =
  "optimal" | "preventive_attention" | "attention_required" | "critical";
export type SanitaryStatus =
  "up_to_date" | "expiring_soon" | "attention_required" | "corrective_action" | "restricted";

export type MachineDimension = "operational" | "technical" | "sanitary";

interface StateLook {
  readonly label: string;
  readonly tone: StatusTone;
}

export const OPERATIONAL_STATES: Record<OperationalStatus, StateLook> = {
  available: { label: "Disponible", tone: "success" },
  off: { label: "Apagada", tone: "nodata" },
  maintenance: { label: "En mantenimiento", tone: "warning" },
  out_of_service: { label: "Fuera de servicio", tone: "danger" },
  suspended: { label: "Suspendida", tone: "danger" },
  retired: { label: "Retirada", tone: "nodata" },
};

export const TECHNICAL_STATES: Record<TechnicalStatus, StateLook> = {
  optimal: { label: "Óptimo", tone: "success" },
  preventive_attention: { label: "Atención preventiva", tone: "warning" },
  attention_required: { label: "Atención requerida", tone: "warning" },
  critical: { label: "Crítico", tone: "danger" },
};

export const SANITARY_STATES: Record<SanitaryStatus, StateLook> = {
  up_to_date: { label: "Al día", tone: "success" },
  expiring_soon: { label: "Próximo a vencer", tone: "warning" },
  attention_required: { label: "Atención requerida", tone: "warning" },
  corrective_action: { label: "Acción correctiva", tone: "danger" },
  restricted: { label: "Restringido", tone: "danger" },
};

/** Dimension names and icons of UI_UX §6.4: operation, tool, shield. */
export const MACHINE_DIMENSIONS: Record<MachineDimension, { label: string; icon: IconName }> = {
  operational: { label: "Operación", icon: "machine" },
  technical: { label: "Técnico", icon: "tool" },
  sanitary: { label: "Sanitario", icon: "shield" },
};

export interface MachineTriadProps extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  /** `null` when the state cannot be evaluated: shown as "Sin datos", never hidden. */
  readonly operational: OperationalStatus | null;
  readonly technical: TechnicalStatus | null;
  readonly sanitary: SanitaryStatus | null;
  /** Machine the states belong to ("ICE24-000145"); names the list for screen readers. */
  readonly machine?: string | undefined;
  /**
   * `labeled` writes "Operación: Disponible" (lists, cards, dashboards); `chips` shows only the
   * state, as in the machine file header (UI_UX §14.6). The dimension is always read aloud.
   */
  readonly display?: "labeled" | "chips";
  readonly layout?: "row" | "stack";
  readonly loading?: boolean;
}

type Entry = { dimension: MachineDimension; look: StateLook | null };

/**
 * Dimension that dominates the visual priority (UI_UX §6.4): a critical sanitary state first,
 * then a critical technical state, then an operational stop. `null` when nothing is critical.
 */
export function dominantDimension({
  operational,
  technical,
  sanitary,
}: Pick<MachineTriadProps, "operational" | "technical" | "sanitary">): MachineDimension | null {
  if (sanitary && SANITARY_STATES[sanitary].tone === "danger") return "sanitary";
  if (technical && TECHNICAL_STATES[technical].tone === "danger") return "technical";
  if (operational && OPERATIONAL_STATES[operational].tone === "danger") return "operational";
  return null;
}

/**
 * The three independent states of a machine as three separate chips (RF-EQP-012, RF-SAN-010,
 * UI_UX §6.4 and §13.7). They are never merged into one grade: the dominant critical state is
 * drawn solid and the others stay visible.
 */
export function MachineTriad({
  operational,
  technical,
  sanitary,
  machine,
  display = "labeled",
  layout = "row",
  loading = false,
  className,
  ...rest
}: MachineTriadProps) {
  const entries: Entry[] = [
    { dimension: "operational", look: operational && OPERATIONAL_STATES[operational] },
    { dimension: "technical", look: technical && TECHNICAL_STATES[technical] },
    { dimension: "sanitary", look: sanitary && SANITARY_STATES[sanitary] },
  ];
  const dominant = dominantDimension({ operational, technical, sanitary });
  return (
    <ul
      className={cx("ids-triad", `ids-triad--${layout}`, className)}
      aria-label={machine ? `Estado de ${machine}` : "Estado de la máquina"}
      aria-busy={loading || undefined}
      {...rest}
    >
      {entries.map(({ dimension, look }) => {
        const { label, icon } = MACHINE_DIMENSIONS[dimension];
        return (
          <li key={dimension} className="ids-triad__item" data-dimension={dimension}>
            {loading ? (
              <span className="ids-skeleton ids-triad__skeleton">
                <span className="ids-visually-hidden">{label}: cargando</span>
              </span>
            ) : (
              <StatusTag
                tone={look?.tone ?? "nodata"}
                icon={icon}
                variant={dominant === dimension ? "solid" : "subtle"}
                dimension={display === "chips" ? label : undefined}
                data-dominant={dominant === dimension || undefined}
              >
                {display === "labeled" && (
                  <span className="ids-triad__dimension">{`${label}: `}</span>
                )}
                {look?.label ?? "Sin datos"}
              </StatusTag>
            )}
          </li>
        );
      })}
    </ul>
  );
}
