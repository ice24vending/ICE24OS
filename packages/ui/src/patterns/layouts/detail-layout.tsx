import type { ReactNode } from "react";

import { Tabs, type TabItem } from "../../components/base/tabs.js";
import { cx } from "../../components/base/shared.js";
import { PageHeader } from "./page-header.js";

export interface DetailLayoutProps {
  readonly title: ReactNode;
  /** Folio or code of the record (ICE24-MTY-0001), shown above the title. */
  readonly identifier?: ReactNode;
  readonly description?: ReactNode;
  /** Status chips (machine triad, read-only indicator). */
  readonly statuses?: ReactNode;
  /** Actions the viewer may take; omit the ones the permission does not allow. */
  readonly actions?: ReactNode;
  readonly banner?: ReactNode;
  /** Main summary, always visible above the tabs. */
  readonly summary?: ReactNode;
  readonly tabs?: readonly TabItem[];
  /** History/audit of the record: always the last tab (UI_UX §11.4). */
  readonly history?: ReactNode;
  /** Side panel for metadata and next events; stacks under the content below 1024 px. */
  readonly aside?: ReactNode;
  /** A global state (SystemState) that replaces summary, tabs and aside. */
  readonly status?: ReactNode;
  readonly tabsLabel?: string;
  readonly className?: string | undefined;
}

/** Detail page (F6-09, UI_UX §11.4): identity and states, actions, summary, tabs, history. */
export function DetailLayout({
  title,
  identifier,
  description,
  statuses,
  actions,
  banner,
  summary,
  tabs = [],
  history,
  aside,
  status,
  tabsLabel = "Secciones del registro",
  className,
}: DetailLayoutProps) {
  const items: TabItem[] = history
    ? [...tabs, { id: "historial", label: "Historial", content: history }]
    : [...tabs];
  return (
    <div className={cx("ids-layout ids-detail-layout", className)}>
      <PageHeader
        eyebrow={identifier}
        title={title}
        description={description}
        meta={statuses}
        actions={actions}
      />
      {banner}
      {status ?? (
        <div
          className={cx(
            "ids-detail-layout__body",
            aside !== undefined && "ids-detail-layout__body--aside",
          )}
        >
          <div className="ids-detail-layout__main">
            {summary && (
              <section aria-label="Resumen" className="ids-detail-layout__summary">
                {summary}
              </section>
            )}
            {items.length > 0 && <Tabs label={tabsLabel} items={items} />}
          </div>
          {aside && (
            <aside aria-label="Datos del registro" className="ids-detail-layout__aside">
              {aside}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
