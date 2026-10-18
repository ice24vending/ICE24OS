import { useId, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from "react";

import { Icon, Spinner, type IconName } from "./icon.js";
import { cx, describedBy } from "./shared.js";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonLook {
  /** Primary: one per visual region. Danger: destructive actions (UI_UX §13.1). */
  readonly variant?: ButtonVariant | undefined;
  /** `md` and `lg` always measure 44 px or more; `sm` grows to 44 px on mobile. */
  readonly size?: ButtonSize | undefined;
  readonly icon?: IconName | undefined;
  readonly iconPosition?: "start" | "end" | undefined;
  readonly fullWidth?: boolean | undefined;
}

export interface ButtonProps extends ButtonLook, Omit<ComponentPropsWithRef<"button">, "type"> {
  readonly type?: "button" | "submit" | "reset";
  /**
   * Blocks repeated submission and shows a spinner while keeping the label (UI_UX §13.1). The
   * button stays focusable and is announced as unavailable.
   */
  readonly loading?: boolean;
  /** Replaces the label while loading, e.g. "Guardando…". */
  readonly loadingLabel?: string | undefined;
  /**
   * Why the action is not available. The button stays focusable (so keyboard and screen reader
   * users find the explanation), is announced as unavailable and shows the reason below it.
   */
  readonly disabledReason?: string | undefined;
}

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  iconOnly = false,
}: ButtonLook & { readonly iconOnly?: boolean }) =>
  cx(
    "ids-button",
    `ids-button--${variant}`,
    `ids-button--${size}`,
    fullWidth && "ids-button--full",
    iconOnly && "ids-button--icon-only",
  );

/**
 * Button of the ICE24 Design System. `disabled` is the native, unfocusable state; prefer
 * `disabledReason` whenever the user can do something about it (UI_UX §13.2 "Selector").
 */
export function Button({
  variant,
  size,
  icon,
  iconPosition = "start",
  fullWidth,
  loading = false,
  loadingLabel,
  disabledReason,
  type = "button",
  className,
  children,
  onClick,
  "aria-describedby": ariaDescribedBy,
  ...rest
}: ButtonProps) {
  const reasonId = useId();
  const blocked = loading || Boolean(disabledReason);
  const iconOnly = !children && !loadingLabel;
  const click = (event: MouseEvent<HTMLButtonElement>) => {
    // aria-disabled keeps focus but not the native blocking: stop clicks and form submission.
    if (blocked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  const glyph: ReactNode = loading ? (
    <Spinner />
  ) : icon ? (
    <Icon name={icon} className="ids-button__icon" />
  ) : null;
  const button = (
    <button
      type={type}
      className={cx(
        buttonClassName({ variant, size, fullWidth, iconOnly }),
        loading && "ids-button--loading",
        className,
      )}
      aria-disabled={blocked || undefined}
      aria-describedby={describedBy(ariaDescribedBy, disabledReason && reasonId)}
      onClick={click}
      {...rest}
    >
      {iconPosition === "start" && glyph}
      {loading && loadingLabel ? loadingLabel : children}
      {iconPosition === "end" && glyph}
      {loading && <span className="ids-visually-hidden"> (en proceso)</span>}
    </button>
  );
  if (!disabledReason) return button;
  return (
    <span className={cx("ids-button-reason", fullWidth && "ids-button-reason--full")}>
      {button}
      <span id={reasonId} className="ids-button-reason__text">
        {disabledReason}
      </span>
    </span>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "children" | "icon" | "loadingLabel"> {
  readonly icon: IconName;
  /** Accessible name. Required: an icon alone is not a label. */
  readonly label: string;
}

/** Square button with only an icon; 44 × 44 px except `sm` on desktop. */
export function IconButton({ label, variant = "tertiary", ...rest }: IconButtonProps) {
  return <Button {...rest} variant={variant} aria-label={label} />;
}

export interface ButtonLinkProps extends ButtonLook, ComponentPropsWithRef<"a"> {
  readonly href: string;
}

/** A link that looks like a button: navigation, not an action (e.g. "Ver suscripción"). */
export function ButtonLink({
  variant,
  size,
  icon,
  iconPosition = "start",
  fullWidth,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  const glyph = icon ? <Icon name={icon} className="ids-button__icon" /> : null;
  return (
    <a className={cx(buttonClassName({ variant, size, fullWidth }), className)} {...rest}>
      {iconPosition === "start" && glyph}
      {children}
      {iconPosition === "end" && glyph}
    </a>
  );
}
