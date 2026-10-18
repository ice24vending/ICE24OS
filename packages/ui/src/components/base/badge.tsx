import type { HTMLAttributes, ReactNode } from "react";

import { Icon, TONE_ICONS, type IconName } from "./icon.js";
import { cx, type StatusTone } from "./shared.js";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `brand` for counts in navigation; `danger` for pending critical alerts. */
  readonly tone?: "neutral" | "brand" | "danger";
  /** Text for screen readers when the visible content is only a number ("4 pendientes"). */
  readonly label?: string | undefined;
  readonly children: ReactNode;
}

/** Small count or label next to a navigation item, a tab or a heading. */
export function Badge({ tone = "neutral", label, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx("ids-badge", `ids-badge--${tone}`, className)} {...rest}>
      <span aria-hidden={label ? true : undefined}>{children}</span>
      {label && <span className="ids-visually-hidden">{label}</span>}
    </span>
  );
}

export interface StatusTagProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone: StatusTone;
  /** Visible state text. Color is never the only signal (UI_UX §6.5). */
  readonly children: ReactNode;
  /**
   * Dimension the state belongs to ("Operación", "Técnico", "Sanitario"), read before the state
   * by screen readers. UI_UX §13.4: no generic label without dimension.
   */
  readonly dimension?: string | undefined;
  /** Icon of the state; defaults to the tone icon. F6-04 passes the domain icons. */
  readonly icon?: IconName | undefined;
  /** `solid` uses the emphasis color with inverse text, for a single strong state. */
  readonly variant?: "subtle" | "solid";
}

/** State chip: icon + text in the tone's colors (UI_UX §13.4 "Chip de estado"). */
export function StatusTag({
  tone,
  dimension,
  icon,
  variant = "subtle",
  className,
  children,
  ...rest
}: StatusTagProps) {
  return (
    <span
      className={cx(
        "ids-tag",
        `ids-tag--${tone}`,
        variant === "solid" && "ids-tag--solid",
        className,
      )}
      data-tone={tone}
      {...rest}
    >
      <Icon name={icon ?? TONE_ICONS[tone]} size={16} />
      {dimension && <span className="ids-visually-hidden">{dimension}: </span>}
      {children}
    </span>
  );
}
