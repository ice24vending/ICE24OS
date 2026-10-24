import type { ReactNode } from "react";

import { cx } from "../../components/base/shared.js";

export interface PageHeaderProps {
  readonly title: ReactNode;
  /** Small line above the title (module, folio). */
  readonly eyebrow?: ReactNode;
  readonly description?: ReactNode;
  /** Status chips or the read-only indicator, under the title. */
  readonly meta?: ReactNode;
  /** Page actions, primary last (UI_UX §11.1). */
  readonly actions?: ReactNode;
  readonly className?: string | undefined;
}

/** Page title block shared by every layout (F6-09): the page's only `h1`. */
export function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx("ids-page-header", className)}>
      <div className="ids-page-header__text">
        {eyebrow && <p className="ids-page-header__eyebrow">{eyebrow}</p>}
        <h1 className="ids-page-header__title">{title}</h1>
        {description && <p className="ids-page-header__description">{description}</p>}
        {meta && <div className="ids-page-header__meta">{meta}</div>}
      </div>
      {actions && <div className="ids-page-header__actions">{actions}</div>}
    </header>
  );
}
