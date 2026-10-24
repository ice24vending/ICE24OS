"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "../../components/base/button.js";
import { cx } from "../../components/base/shared.js";
import { PageHeader } from "./page-header.js";

export interface ListLayoutProps {
  readonly title: ReactNode;
  readonly eyebrow?: ReactNode;
  readonly description?: ReactNode;
  readonly actions?: ReactNode;
  /** Two to five metrics above the filters (UI_UX §11.3). */
  readonly summary?: ReactNode;
  /** Filter fields; on mobile they fold behind a «Filtros» button (UI_UX §16.3). */
  readonly filters?: ReactNode;
  /** Active filters, shown on the mobile button so a hidden filter is never forgotten. */
  readonly activeFilters?: number;
  /** Notices that keep the content visible (read-only indicator, conflict feedback). */
  readonly banner?: ReactNode;
  /** A global state (SystemState) that replaces the content; header and filters stay. */
  readonly status?: ReactNode;
  /** The list itself: a responsive Table (cards below 768 px). */
  readonly children?: ReactNode;
  /** Usually the base `Pagination` (numbers hide on mobile). */
  readonly pagination?: ReactNode;
  readonly className?: string | undefined;
}

/** List page (F6-09, UI_UX §11.3): header, actions, filters, table → cards, pagination. */
export function ListLayout({
  title,
  eyebrow,
  description,
  actions,
  summary,
  filters,
  activeFilters = 0,
  banner,
  status,
  children,
  pagination,
  className,
}: ListLayoutProps) {
  const filtersId = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <div className={cx("ids-layout ids-list-layout", className)}>
      <PageHeader title={title} eyebrow={eyebrow} description={description} actions={actions} />
      {summary && <div className="ids-list-layout__summary">{summary}</div>}
      {filters && (
        <div className="ids-list-layout__filters" data-open={filtersOpen || undefined}>
          <Button
            variant="secondary"
            icon="search"
            className="ids-list-layout__filters-toggle"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {activeFilters > 0 ? `Filtros (${activeFilters})` : "Filtros"}
          </Button>
          <div
            id={filtersId}
            role="group"
            aria-label="Filtros"
            className="ids-list-layout__filter-fields"
          >
            {filters}
          </div>
        </div>
      )}
      {banner}
      {status ?? (
        <>
          {children}
          {pagination}
        </>
      )}
    </div>
  );
}
