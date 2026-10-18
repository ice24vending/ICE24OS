"use client";
import { useId, useState, type ReactNode } from "react";

import { Button } from "../base/button.js";
import { Icon } from "../base/icon.js";
import { cx } from "../base/shared.js";

export interface ComparatorField {
  readonly id: string;
  readonly label: string;
  /** `null` reads "Sin valor". Strings and numbers are compared to decide `changed`. */
  readonly before: ReactNode;
  readonly after: ReactNode;
  /** Required when a value is not a string or number (an image, a link to evidence). */
  readonly changed?: boolean | undefined;
  /** Text for screen readers when a value is not plain text ("foto_servidor.jpg"). */
  readonly beforeText?: string | undefined;
  readonly afterText?: string | undefined;
  /** Why the difference matters ("Fuera del rango de 100 a 200 ppm"); shown under the row. */
  readonly note?: ReactNode;
  readonly noteTone?: "warning" | "danger" | undefined;
}

export interface ComparatorSide {
  /** "Versión del servidor", "Esperado", "Valor anterior". */
  readonly label: string;
  /** Author, date and reason (UI_UX §13.7), already formatted. */
  readonly meta?: ReactNode;
}

export interface ComparatorProps {
  readonly title: string;
  readonly titleAs?: "h2" | "h3" | "h4";
  readonly before: ComparatorSide;
  readonly after: ComparatorSide;
  readonly fields: readonly ComparatorField[];
  /**
   * Starts listing the unchanged fields too. By default only changes are listed and a button
   * shows the rest, like a review diff: the decision is about what changed.
   */
  readonly showUnchanged?: boolean;
  readonly loading?: boolean;
  /** Related evidence, links or the resolution form below the comparison. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

const EMPTY = "Sin valor";
const plain = (value: ReactNode) =>
  value === null || value === undefined
    ? EMPTY
    : typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined;

export const isChanged = (field: ComparatorField) =>
  field.changed ?? plain(field.before) !== plain(field.after);

const spoken = (field: ComparatorField, side: "before" | "after") =>
  (side === "before" ? field.beforeText : field.afterText) ?? plain(field[side]) ?? "";

/**
 * Side-by-side comparison (UI_UX §13.7 "Comparador de versiones", §14.18): previous vs proposed
 * value, or expected vs actual. A table with a written "Cambió / Sin cambio" column, so the
 * difference never depends on color, plus a summary of the changed fields that screen readers
 * hear first. Below 768 px each row becomes a card. It decides nothing: resolving a conflict is
 * the screen's form (no automatic winner, UI_UX §20.6).
 */
export function Comparator({
  title,
  titleAs: Title = "h3",
  before,
  after,
  fields,
  showUnchanged = false,
  loading = false,
  children,
  className,
}: ComparatorProps) {
  const id = useId();
  const changed = fields.filter(isChanged);
  const [expanded, setExpanded] = useState(showUnchanged);
  // A new `showUnchanged` from the screen resets the toggle (derived state, no effect).
  const [initial, setInitial] = useState(showUnchanged);
  if (initial !== showUnchanged) {
    setInitial(showUnchanged);
    setExpanded(showUnchanged);
  }
  const rows = expanded ? fields : changed;
  const unchanged = fields.length - changed.length;
  const summary =
    changed.length === 0
      ? "Sin diferencias."
      : `${changed.length === 1 ? "1 diferencia" : `${changed.length} diferencias`}: ${changed
          .map((field) => field.label.toLowerCase())
          .join(", ")}.`;
  return (
    <section
      className={cx("ids-compare", className)}
      aria-labelledby={`${id}-title`}
      aria-busy={loading || undefined}
    >
      <Title id={`${id}-title`} className="ids-compare__title">
        {title}
      </Title>
      <div className="ids-compare__sides">
        {[before, after].map((side, index) => (
          <div key={index} className="ids-compare__side">
            <p className="ids-compare__side-label">{side.label}</p>
            {side.meta && <div className="ids-compare__meta">{side.meta}</div>}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="ids-compare__loading">
          <span className="ids-skeleton" />
          <span className="ids-skeleton" />
          <span className="ids-visually-hidden">Cargando comparación…</span>
        </div>
      ) : fields.length === 0 ? (
        <p className="ids-compare__empty">No hay campos que comparar.</p>
      ) : (
        <>
          <p id={`${id}-summary`} className="ids-compare__summary">
            <Icon name="compare" size={16} />
            {summary}
          </p>
          {rows.length > 0 && (
            <table className="ids-compare__table" role="table" aria-describedby={`${id}-summary`}>
              <caption className="ids-visually-hidden">{title}</caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader">
                    Campo
                  </th>
                  <th scope="col" role="columnheader">
                    {before.label}
                  </th>
                  <th scope="col" role="columnheader">
                    {after.label}
                  </th>
                  <th scope="col" role="columnheader">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {rows.map((field) => {
                  const isDiff = isChanged(field);
                  return (
                    <tr
                      key={field.id}
                      role="row"
                      className={cx("ids-compare__row", isDiff && "ids-compare__row--changed")}
                    >
                      <th scope="row" role="rowheader">
                        {field.label}
                      </th>
                      <td role="cell" data-label={before.label}>
                        {field.before ?? EMPTY}
                      </td>
                      <td role="cell" data-label={after.label}>
                        {field.after ?? EMPTY}
                      </td>
                      <td role="cell" className="ids-compare__change">
                        {isDiff ? (
                          <>
                            <span className="ids-compare__badge" aria-hidden>
                              <Icon name="warning" size={16} />
                              Cambió
                            </span>
                            <span className="ids-visually-hidden">
                              {`Cambió de ${spoken(field, "before")} a ${spoken(field, "after")}`}
                            </span>
                          </>
                        ) : (
                          <span className="ids-compare__same">Sin cambio</span>
                        )}
                        {field.note && (
                          <span
                            className={cx(
                              "ids-compare__note",
                              field.noteTone && `ids-compare__note--${field.noteTone}`,
                            )}
                          >
                            {field.note}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {unchanged > 0 && (
            <Button
              variant="tertiary"
              size="sm"
              icon={expanded ? "chevron-up" : "chevron-down"}
              aria-expanded={expanded}
              className="ids-compare__toggle"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? "Ocultar campos sin cambios"
                : unchanged === 1
                  ? "Mostrar 1 campo sin cambios"
                  : `Mostrar ${unchanged} campos sin cambios`}
            </Button>
          )}
        </>
      )}
      {children && <div className="ids-compare__footer">{children}</div>}
    </section>
  );
}
