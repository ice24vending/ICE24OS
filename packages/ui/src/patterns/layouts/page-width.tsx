import type { HTMLAttributes } from "react";

import { cx } from "../../components/base/shared.js";

export interface PageWidthProps extends HTMLAttributes<HTMLElement> {
  readonly as?: "div" | "main";
  readonly variant?: "full" | "reading";
}

/** One left edge for lists and readable pages; the account layout supplies the page gutter. */
export function PageWidth({
  as: Element = "div",
  variant = "full",
  className,
  children,
  ...props
}: PageWidthProps) {
  return (
    <Element {...props} className={cx("ids-page-width", `ids-page-width--${variant}`, className)}>
      {children}
    </Element>
  );
}
