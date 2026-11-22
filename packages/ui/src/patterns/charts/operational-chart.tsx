import { Card } from "../../components/base/card.js";
import type { StatusTone } from "../../components/base/shared.js";

export interface ChartDatum {
  readonly label: string;
  readonly value: number;
  readonly tone?: StatusTone;
  readonly highlighted?: boolean;
}
export interface OperationalChartProps {
  readonly title: string;
  readonly summary: string;
  readonly items: readonly ChartDatum[] | null;
  readonly variant?: "stacked" | "bars" | "columns";
  readonly emptyMessage?: string;
}

/** SVG is visual only: the same named rows and exact values are available in a native table. */
export function OperationalChart({
  title,
  summary,
  items,
  variant = "bars",
  emptyMessage = "No hay registros en este periodo.",
}: OperationalChartProps) {
  const total = items?.reduce((sum, item) => sum + item.value, 0) ?? 0;
  const scale = variant === "stacked" ? total : Math.max(1, ...(items?.map((i) => i.value) ?? []));
  return (
    <Card title={title} titleAs="h2" description={summary} className="ids-operational-chart">
      {items === null ? (
        <p>Sin datos</p>
      ) : (
        <>
          {total === 0 && <p>{emptyMessage}</p>}
          <div
            aria-hidden="true"
            className={`ids-operational-chart__plot ids-operational-chart__plot--${variant}`}
            style={
              variant === "columns"
                ? {
                    gridTemplateColumns: `repeat(${Math.max(1, items.filter((item) => !item.highlighted).length)}, minmax(0,1fr))`,
                  }
                : undefined
            }
          >
            {variant === "stacked" && total > 0 && (
              <svg viewBox="0 0 600 40" focusable="false" className="ids-operational-chart__stack">
                {items.map((item, index) => {
                  const x =
                    (items.slice(0, index).reduce((sum, previous) => sum + previous.value, 0) /
                      scale) *
                    600;
                  const width = (item.value / scale) * 600;
                  return (
                    <g key={item.label}>
                      <rect
                        x={x}
                        y="0"
                        width={width}
                        height="40"
                        className={`ids-operational-chart__mark ids-operational-chart__mark--${item.tone ?? "info"}`}
                      />
                      {width >= 30 && (
                        <text
                          x={x + width / 2}
                          y="26"
                          textAnchor="middle"
                          className="ids-operational-chart__number"
                        >
                          {item.value}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            {items.map((item) => (
              <div
                key={item.label}
                className={`ids-operational-chart__item${item.highlighted ? " ids-operational-chart__item--highlighted" : ""}`}
              >
                {variant !== "stacked" && (
                  <svg
                    viewBox={variant === "columns" ? "0 0 48 120" : "0 0 600 16"}
                    preserveAspectRatio="none"
                    focusable="false"
                  >
                    <rect
                      x="0"
                      y={variant === "columns" ? 120 - (item.value / scale) * 120 : 0}
                      width={variant === "columns" ? 48 : (item.value / scale) * 600}
                      height={variant === "columns" ? (item.value / scale) * 120 : 16}
                      className={`ids-operational-chart__mark ids-operational-chart__mark--${item.tone ?? "info"}`}
                    />
                  </svg>
                )}
                <span>
                  <strong>{item.value}</strong> {item.label}
                </span>
              </div>
            ))}
          </div>
          <div className="ids-visually-hidden">
            <table>
              <caption>{title}: datos</caption>
              <thead>
                <tr>
                  <th scope="col">Categoría</th>
                  <th scope="col">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.label}>
                    <th scope="row">{item.label}</th>
                    <td>{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
