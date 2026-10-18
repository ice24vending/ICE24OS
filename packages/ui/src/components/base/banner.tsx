import { useId, type HTMLAttributes, type ReactNode } from "react";

import { IconButton } from "./button.js";
import { Icon, TONE_ICONS, type IconName } from "./icon.js";
import { cx } from "./shared.js";

/**
 * Banner tones (UI_UX §13.4). `readonly` keeps the warning treatment of the F5-15 read-only bar
 * with a lock icon; the final treatment of bar and banner is decided in F6-04 (difference D3).
 */
export type BannerTone =
  "info" | "success" | "warning" | "danger" | "readonly" | "offline" | "audit";

const ICONS: Record<BannerTone, IconName> = {
  info: TONE_ICONS.info,
  success: TONE_ICONS.success,
  warning: TONE_ICONS.warning,
  danger: TONE_ICONS.danger,
  readonly: "lock",
  offline: TONE_ICONS.offline,
  audit: TONE_ICONS.audit,
};

export interface BannerProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "role"> {
  readonly tone?: BannerTone;
  readonly title?: ReactNode;
  readonly titleAs?: "h2" | "h3" | "h4" | "p";
  readonly children?: ReactNode;
  /** Links or buttons ("Ver suscripción", "Reintentar"). */
  readonly actions?: ReactNode;
  /** Shows a close button. Critical and read-only banners are persistent: do not pass it. */
  readonly onDismiss?: (() => void) | undefined;
  readonly dismissLabel?: string;
  /**
   * `alert` interrupts the screen reader (errors that block); `status` announces politely.
   * Omit it for banners present when the page loads. A live region must already be on the page
   * for later changes to be announced.
   */
  readonly role?: "alert" | "status" | undefined;
}

/** Page-level message with icon, text and optional actions; full width of its container. */
export function Banner({
  tone = "info",
  title,
  titleAs: Title = "h2",
  actions,
  onDismiss,
  dismissLabel = "Cerrar aviso",
  className,
  children,
  ...rest
}: BannerProps) {
  const titleId = useId();
  return (
    <section
      className={cx("ids-banner", `ids-banner--${tone}`, className)}
      aria-labelledby={title && Title !== "p" ? titleId : undefined}
      data-tone={tone}
      {...rest}
    >
      <Icon name={ICONS[tone]} className="ids-banner__icon" />
      <div className="ids-banner__content">
        {title && (
          <Title id={titleId} className="ids-banner__title">
            {title}
          </Title>
        )}
        {children && <div className="ids-banner__body">{children}</div>}
        {actions && <div className="ids-banner__actions">{actions}</div>}
      </div>
      {onDismiss && (
        <IconButton
          icon="close"
          label={dismissLabel}
          size="sm"
          className="ids-banner__dismiss"
          onClick={onDismiss}
        />
      )}
    </section>
  );
}
