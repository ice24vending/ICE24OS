import { useId, type HTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "./icon.js";
import { cx, type StatusTone } from "./shared.js";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** `section` (default) is a landmark-like region named by its title; `article` for a record. */
  readonly as?: "section" | "article" | "div";
  readonly title?: ReactNode;
  readonly titleAs?: "h2" | "h3" | "h4";
  readonly description?: ReactNode;
  /** Icon in a soft square next to the title, colored by `tone` (approved visual direction). */
  readonly icon?: IconName | undefined;
  readonly tone?: StatusTone | "brand";
  /** Actions on the right of the header (one primary at most). */
  readonly actions?: ReactNode;
  readonly footer?: ReactNode;
  /** `flush` removes the body padding, e.g. for a table inside the card. */
  readonly padding?: "md" | "lg" | "flush";
  readonly children?: ReactNode;
}

/** White surface with a defined border (UI_UX §8.3, §8.6); radius-lg, no decorative shadow. */
export function Card({
  as: Element = "section",
  title,
  titleAs: Heading = "h2",
  description,
  icon,
  tone = "brand",
  actions,
  footer,
  padding = "lg",
  className,
  children,
  ...rest
}: CardProps) {
  const titleId = useId();
  const hasHeader = Boolean(title || actions || icon);
  return (
    <Element
      className={cx("ids-card", `ids-card--${padding}`, className)}
      aria-labelledby={title && Element !== "div" ? titleId : undefined}
      {...rest}
    >
      {hasHeader && (
        <header className="ids-card__header">
          {icon && (
            <span className={cx("ids-card__icon", `ids-card__icon--${tone}`)}>
              <Icon name={icon} />
            </span>
          )}
          <div className="ids-card__heading">
            {title && (
              <Heading id={titleId} className="ids-card__title">
                {title}
              </Heading>
            )}
            {description && <p className="ids-card__description">{description}</p>}
          </div>
          {actions && <div className="ids-card__actions">{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className="ids-card__body">{children}</div>}
      {footer && <footer className="ids-card__footer">{footer}</footer>}
    </Element>
  );
}
