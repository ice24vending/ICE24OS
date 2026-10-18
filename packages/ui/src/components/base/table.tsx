"use client";

import { useId, useMemo, useState, type ReactNode } from "react";

import { Checkbox } from "./choice.js";
import { Icon } from "./icon.js";
import { cx } from "./shared.js";

export type SortDirection = "ascending" | "descending";

export interface TableSort {
  readonly columnId: string;
  readonly direction: SortDirection;
}

export interface TableColumn<Row> {
  readonly id: string;
  readonly header: string;
  readonly cell: (row: Row) => ReactNode;
  /** Enables sorting by this column; used for client sorting. */
  readonly sortValue?: (row: Row) => string | number | null | undefined;
  readonly sortable?: boolean;
  /** Folios, codes and IDs in the monospace font (UI_UX §7.2). */
  readonly mono?: boolean;
  /** Tabular, right-aligned numbers. */
  readonly numeric?: boolean;
  /**
   * Place in the mobile card: `title` (identity), `field` (label + value, default) or `hidden`
   * (secondary data that only fits on wide screens).
   */
  readonly mobile?: "title" | "field" | "hidden";
  /** Hidden below the tablet breakpoint even in the table layout. */
  readonly priority?: "high" | "low";
}

export interface TableProps<Row> {
  /** Accessible name of the table; visually hidden with `captionHidden`. */
  readonly caption: string;
  readonly captionHidden?: boolean | undefined;
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowId: (row: Row) => string;
  /** Text that names a row in its checkbox and actions ("ICE24-000145"). */
  readonly getRowLabel?: ((row: Row) => string) | undefined;
  /** Controlled sort. Without it the table sorts by itself. */
  readonly sort?: TableSort | null | undefined;
  readonly defaultSort?: TableSort | undefined;
  readonly onSortChange?: ((sort: TableSort) => void) | undefined;
  /** `server`: rows arrive sorted (the API sorts); the table only shows the indicator. */
  readonly sortMode?: "client" | "server" | undefined;
  readonly selectable?: boolean | undefined;
  readonly selectedIds?: readonly string[] | undefined;
  readonly onSelectionChange?: ((ids: string[]) => void) | undefined;
  /** Actions of each row, at the end (desktop) or the bottom of the card (mobile). */
  readonly rowActions?: ((row: Row) => ReactNode) | undefined;
  readonly loading?: boolean | undefined;
  readonly loadingRows?: number | undefined;
  /** Shown instead of rows when the query failed (use Banner). */
  readonly error?: ReactNode | undefined;
  /** Shown when there are no rows (use EmptyState); the default says so in plain text. */
  readonly empty?: ReactNode | undefined;
  readonly density?: "comfortable" | "compact" | undefined;
  /** Becomes a list of cards below 768 px (UI_UX §10.3, §13.3 "Lista móvil"). */
  readonly responsive?: boolean | undefined;
  /** Pagination or totals under the table. */
  readonly footer?: ReactNode | undefined;
  readonly className?: string | undefined;
}

const compare = (a: string | number | null | undefined, b: string | number | null | undefined) => {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : String(a).localeCompare(String(b), "es-MX", { numeric: true });
};

/**
 * Data table: sorting with `aria-sort`, optional selection, loading, empty and error states, and
 * cards on mobile. Explicit ARIA table roles keep the semantics when CSS turns rows into cards.
 */
export function Table<Row>({
  caption,
  captionHidden = false,
  columns,
  rows,
  getRowId,
  getRowLabel,
  sort,
  defaultSort,
  onSortChange,
  sortMode = "client",
  selectable = false,
  selectedIds,
  onSelectionChange,
  rowActions,
  loading = false,
  loadingRows = 3,
  error,
  empty,
  density = "comfortable",
  responsive = true,
  footer,
  className,
}: TableProps<Row>) {
  const id = useId();
  const [ownSort, setOwnSort] = useState<TableSort | null>(defaultSort ?? null);
  const activeSort = sort === undefined ? ownSort : sort;
  const [ownSelection, setOwnSelection] = useState<readonly string[]>([]);
  const selection = new Set(selectedIds ?? ownSelection);

  const sorted = useMemo(() => {
    const column = columns.find((candidate) => candidate.id === activeSort?.columnId);
    if (sortMode === "server" || !activeSort || !column?.sortValue) return rows;
    const factor = activeSort.direction === "ascending" ? 1 : -1;
    const value = column.sortValue;
    return [...rows].sort((a, b) => factor * compare(value(a), value(b)));
  }, [rows, columns, activeSort, sortMode]);

  const changeSort = (columnId: string) => {
    const direction: SortDirection =
      activeSort?.columnId === columnId && activeSort.direction === "ascending"
        ? "descending"
        : "ascending";
    const next = { columnId, direction };
    if (sort === undefined) setOwnSort(next);
    onSortChange?.(next);
  };
  const changeSelection = (ids: string[]) => {
    if (selectedIds === undefined) setOwnSelection(ids);
    onSelectionChange?.(ids);
  };

  const ids = sorted.map(getRowId);
  const selectedCount = ids.filter((rowId) => selection.has(rowId)).length;
  const span = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const showRows = !loading && !error && sorted.length > 0;
  const label = (row: Row) => getRowLabel?.(row) ?? getRowId(row);

  return (
    <div
      className={cx(
        "ids-table",
        responsive && "ids-table--responsive",
        density === "compact" && "ids-table--compact",
        className,
      )}
      aria-busy={loading || undefined}
    >
      <div className="ids-table__scroll">
        <table
          role="table"
          className="ids-table__table"
          aria-describedby={loading ? `${id}-loading` : undefined}
        >
          <caption className={cx("ids-table__caption", captionHidden && "ids-visually-hidden")}>
            {caption}
          </caption>
          <thead role="rowgroup" className="ids-table__head">
            <tr role="row">
              {selectable && (
                <th role="columnheader" scope="col" className="ids-table__select">
                  <Checkbox
                    label="Seleccionar todas las filas"
                    className="ids-table__checkbox ids-table__checkbox--hidden-label"
                    checked={showRows && selectedCount === ids.length}
                    indeterminate={selectedCount > 0 && selectedCount < ids.length}
                    disabled={!showRows}
                    onChange={(event) => changeSelection(event.target.checked ? ids : [])}
                  />
                </th>
              )}
              {columns.map((column) => {
                const sortable = column.sortable ?? Boolean(column.sortValue);
                const current =
                  activeSort?.columnId === column.id ? activeSort.direction : undefined;
                return (
                  <th
                    key={column.id}
                    role="columnheader"
                    scope="col"
                    aria-sort={current}
                    className={cx(
                      column.numeric && "ids-table__cell--numeric",
                      column.priority === "low" && "ids-table__cell--low",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="ids-table__sort"
                        onClick={() => changeSort(column.id)}
                      >
                        {column.header}
                        <Icon
                          name={
                            current === "ascending"
                              ? "chevron-up"
                              : current === "descending"
                                ? "chevron-down"
                                : "sort"
                          }
                          size={16}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && (
                <th role="columnheader" scope="col" className="ids-table__actions">
                  <span className="ids-visually-hidden">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody role="rowgroup">
            {loading &&
              Array.from({ length: loadingRows }, (_, index) => (
                <tr
                  role="row"
                  key={`loading-${index}`}
                  className="ids-table__row ids-table__row--skeleton"
                  aria-hidden
                >
                  {Array.from({ length: span }, (_, cell) => (
                    <td role="cell" key={cell}>
                      <span className="ids-skeleton" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && error && (
              <tr role="row" className="ids-table__row ids-table__row--message">
                <td role="cell" colSpan={span}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && sorted.length === 0 && (
              <tr role="row" className="ids-table__row ids-table__row--message">
                <td role="cell" colSpan={span}>
                  {empty ?? <p className="ids-table__empty">No hay registros para mostrar.</p>}
                </td>
              </tr>
            )}
            {showRows &&
              sorted.map((row) => {
                const rowId = getRowId(row);
                const selected = selection.has(rowId);
                return (
                  <tr
                    role="row"
                    key={rowId}
                    className={cx("ids-table__row", selected && "ids-table__row--selected")}
                  >
                    {selectable && (
                      <td role="cell" className="ids-table__select">
                        <Checkbox
                          label={`Seleccionar ${label(row)}`}
                          className="ids-table__checkbox ids-table__checkbox--hidden-label"
                          checked={selected}
                          onChange={(event) =>
                            changeSelection(
                              event.target.checked
                                ? [...ids.filter((other) => selection.has(other)), rowId]
                                : ids.filter((other) => other !== rowId && selection.has(other)),
                            )
                          }
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        role="cell"
                        key={column.id}
                        data-label={column.mobile === "title" ? undefined : column.header}
                        className={cx(
                          column.mono && "ids-table__cell--mono",
                          column.numeric && "ids-table__cell--numeric",
                          column.priority === "low" && "ids-table__cell--low",
                          column.mobile === "title" && "ids-table__cell--title",
                          column.mobile === "hidden" && "ids-table__cell--mobile-hidden",
                        )}
                      >
                        <span className="ids-table__value">{column.cell(row)}</span>
                      </td>
                    ))}
                    {rowActions && (
                      <td role="cell" className="ids-table__actions">
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {loading && (
        <p id={`${id}-loading`} role="status" className="ids-visually-hidden">
          Cargando {caption.toLowerCase()}…
        </p>
      )}
      {selectable && (
        // Always mounted so changes in the selection are announced.
        <p className="ids-table__selection" role="status">
          {selectedCount === 0
            ? ""
            : selectedCount === 1
              ? "1 fila seleccionada"
              : `${selectedCount} filas seleccionadas`}
        </p>
      )}
      {footer && <div className="ids-table__footer">{footer}</div>}
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: ReactNode;
  /** One primary action ("Agregar documento"), hidden when the user cannot perform it. */
  readonly action?: ReactNode;
  readonly className?: string;
}

/** Empty list: brand-600 icon, title, what to do next and one action (approved direction). */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("ids-empty", className)}>
      <Icon name="empty" size={24} className="ids-empty__icon" />
      <p className="ids-empty__title">{title}</p>
      {description && <p className="ids-empty__description">{description}</p>}
      {action && <div className="ids-empty__action">{action}</div>}
    </div>
  );
}
