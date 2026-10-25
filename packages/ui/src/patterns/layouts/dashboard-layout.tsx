import type { ReactNode } from "react";

import { StatusTag } from "../../components/base/badge.js";
import { Icon, type IconName } from "../../components/base/icon.js";
import { cx, type StatusTone } from "../../components/base/shared.js";
import { PageHeader } from "./page-header.js";

export interface KpiCardProps {
  readonly label: string;
  /** `null` means the data does not exist: shows «Sin datos», never zero (UI_UX §13.3). */
  readonly value: ReactNode | null;
  readonly unit?: string | undefined;
  /** Period the value covers («Hoy», «Últimos 7 días»). */
  readonly period: string;
  /** Scope («2 sucursales»). */
  readonly context?: string | undefined;
  /** `partial`: some sources did not report; the card says so. */
  readonly completeness?: "complete" | "partial";
  /** Only when a valid comparison exists. */
  readonly trend?: ReactNode;
  /** Icon in a soft square beside the label, colored by `tone` (approved reference, ADR-025). */
  readonly icon?: IconName | undefined;
  readonly tone?: StatusTone | "brand";
  readonly className?: string | undefined;
}

/** One indicator: label, value, period, scope and data completeness. */
export function KpiCard({
  label,
  value,
  unit,
  period,
  context,
  completeness = "complete",
  trend,
  icon,
  tone = "brand",
  className,
}: KpiCardProps) {
  const missing = value === null;
  return (
    <article className={cx("ids-kpi", missing && "ids-kpi--missing", className)}>
      <div className="ids-kpi__header">
        <h3 className="ids-kpi__label">{label}</h3>
        {icon && (
          <span className={cx("ids-card__icon", `ids-card__icon--${tone}`)} aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
      </div>
      <p className="ids-kpi__value">
        {missing ? (
          "Sin datos"
        ) : (
          <>
            {value}
            {unit && <span className="ids-kpi__unit"> {unit}</span>}
          </>
        )}
      </p>
      <p className="ids-kpi__period">
        {period}
        {context && ` · ${context}`}
      </p>
      {completeness === "partial" && !missing && (
        <StatusTag tone="nodata" icon="nodata">
          Datos parciales
        </StatusTag>
      )}
      {trend && !missing && <p className="ids-kpi__trend">{trend}</p>}
    </article>
  );
}

export interface DashboardLayoutProps {
  readonly title: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  /** Pinned critical alerts go first, before the indicators (UI_UX §14.3). */
  readonly banner?: ReactNode;
  readonly kpis?: readonly KpiCardProps[];
  /** Cards of the dashboard; they flow in a responsive grid (1, 2 or 3 columns). */
  readonly children?: ReactNode;
  /** A global state (SystemState) that replaces indicators and cards. */
  readonly status?: ReactNode;
  readonly className?: string | undefined;
}

/** Dashboard (F6-09, UI_UX §14.3–14.4, §15.1): KPI grid and responsive cards. */
export function DashboardLayout({
  title,
  eyebrow,
  description,
  actions,
  banner,
  kpis = [],
  children,
  status,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cx("ids-layout ids-dashboard-layout", className)}>
      <PageHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
      {banner}
      {status ?? (
        <>
          {kpis.length > 0 && (
            <section aria-label="Indicadores" className="ids-dashboard-layout__kpis">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.label} {...kpi} />
              ))}
            </section>
          )}
          {children && <div className="ids-dashboard-layout__grid">{children}</div>}
        </>
      )}
    </div>
  );
}
