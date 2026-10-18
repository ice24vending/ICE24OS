import type { ReactNode } from "react";

import "./catalog.css";

/**
 * Catalog helpers (F6-05): the documentation every component page carries and the state matrix
 * that shows all its states in one view. Story-only: excluded from the package build.
 */

export interface ComponentGuide {
  /** One or two sentences: what it is and the UI_UX section it implements. */
  readonly summary: string;
  readonly use: readonly string[];
  readonly avoid: readonly string[];
  readonly accessibility: readonly string[];
  /** Recommended texts, quoted as they appear on screen. */
  readonly copy: readonly string[];
}

const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

/** Markdown for `parameters.docs.description.component`, with the four catalog sections. */
export const componentDocs = ({ summary, use, avoid, accessibility, copy }: ComponentGuide) =>
  [
    summary,
    `**Cuándo usar**\n\n${list(use)}`,
    `**Cuándo no usar**\n\n${list(avoid)}`,
    `**Accesibilidad**\n\n${list(accessibility)}`,
    `**Textos recomendados**\n\n${list(copy)}`,
  ].join("\n\n");

/** States every component is reviewed in (TASK-F6-05 and the UI_UX state checklist). */
export const MATRIX_STATES = [
  "normal",
  "loading",
  "empty",
  "error",
  "forbidden",
  "readonly",
  "disabled",
  "focus",
] as const;
export type MatrixState = (typeof MATRIX_STATES)[number];

export const MATRIX_LABELS: Record<MatrixState, string> = {
  normal: "Normal",
  loading: "Carga",
  empty: "Vacío",
  error: "Error",
  forbidden: "Permiso denegado",
  readonly: "Modo lectura",
  disabled: "Deshabilitado",
  focus: "Foco",
};

/** A state that does not apply to the component, with the reason (shown, never left blank). */
export interface NotApplicable {
  readonly na: string;
}
export const na = (reason: string): NotApplicable => ({ na: reason });

const isNotApplicable = (cell: ReactNode | NotApplicable): cell is NotApplicable =>
  typeof cell === "object" && cell !== null && "na" in cell;

/**
 * Every state of a component in one view. The type requires all eight cells, so a missing
 * state is a compile error; states that do not apply say why. The focus cell draws the focus
 * ring statically for captures; Tab shows the real one.
 */
export function StateMatrix({
  component,
  cells,
  layout = "grid",
}: {
  readonly component: string;
  readonly cells: Record<MatrixState, ReactNode | NotApplicable>;
  /** `list`: one state per row, for wide components (tables, alert cards, comparisons). */
  readonly layout?: "grid" | "list";
}) {
  return (
    <section
      className={`catalog-matrix catalog-matrix--${layout}`}
      aria-label={`Matriz de estados de ${component}`}
    >
      {MATRIX_STATES.map((state) => {
        const cell = cells[state];
        return (
          <article key={state} className="catalog-matrix__cell" data-state={state}>
            <h2 className="catalog-matrix__label">{MATRIX_LABELS[state]}</h2>
            {isNotApplicable(cell) ? (
              <p className="catalog-matrix__na">No aplica: {cell.na}</p>
            ) : (
              <div
                className={
                  state === "focus" ? "catalog-matrix__body catalog-focus" : "catalog-matrix__body"
                }
              >
                {cell}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
