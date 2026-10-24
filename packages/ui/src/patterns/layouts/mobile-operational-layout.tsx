import type { ReactNode } from "react";

import { Icon } from "../../components/base/icon.js";
import { cx } from "../../components/base/shared.js";

export interface MobileOperationalLayoutProps {
  readonly title: ReactNode;
  /** Machine and activity («ICE24-MTY-0001 · Preventivo»). */
  readonly subtitle?: ReactNode;
  readonly backHref?: string | undefined;
  readonly backLabel?: string;
  /** Connection / sync state of the task (SyncStatus chip), always under the title. */
  readonly statusBar?: ReactNode;
  readonly progress?:
    { readonly value: number; readonly max: number; readonly label: string } | undefined;
  readonly banner?: ReactNode;
  readonly children?: ReactNode;
  /** The one action that moves the task forward; full width, in the thumb zone. */
  readonly primaryAction: ReactNode;
  /** Usually the local save that stays available offline (UI_UX §14.8). */
  readonly secondaryAction?: ReactNode;
  /** A global state (SystemState) that replaces the content; the action bar stays. */
  readonly status?: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Field screen (F6-09, UI_UX §4.2 «Modo operativo», §14.4, §14.8, §16.2). Designed for one hand
 * and gloves, not a reduced desktop page: one column, 16 px+ text, 64 px targets with room
 * between them, and the actions fixed at the bottom so they are never off the first screen.
 */
export function MobileOperationalLayout({
  title,
  subtitle,
  backHref,
  backLabel = "Volver",
  statusBar,
  progress,
  banner,
  children,
  primaryAction,
  secondaryAction,
  status,
  className,
}: MobileOperationalLayoutProps) {
  return (
    <div className={cx("ids-layout ids-field-layout", className)}>
      <header className="ids-field-layout__header">
        {backHref && (
          <a href={backHref} className="ids-field-layout__back">
            <Icon name="chevron-left" />
            <span>{backLabel}</span>
          </a>
        )}
        <h1 className="ids-field-layout__title">{title}</h1>
        {subtitle && <p className="ids-field-layout__subtitle">{subtitle}</p>}
        {statusBar && <div className="ids-field-layout__status">{statusBar}</div>}
      </header>
      {progress && (
        <div className="ids-field-layout__progress">
          <p>{progress.label}</p>
          <progress value={progress.value} max={progress.max} aria-label={progress.label} />
        </div>
      )}
      {banner}
      <div className="ids-field-layout__content">{status ?? children}</div>
      <div className="ids-field-layout__actions">
        {secondaryAction}
        {primaryAction}
      </div>
    </div>
  );
}
