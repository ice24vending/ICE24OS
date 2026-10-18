import type { ReactNode } from "react";

import { StatusTag } from "../base/badge.js";
import { Banner } from "../base/banner.js";
import { ButtonLink } from "../base/button.js";
import { cx } from "../base/shared.js";

/**
 * Read-only treatment (difference D3, decided in F6-04): one look for the global bar and every
 * local indicator — warning colors + lock icon + the written consequence. Read-only is a
 * restriction the person can act on (regularize the subscription), not missing data, so it does
 * not use the neutral tone.
 */
export const READ_ONLY_CONSEQUENCE =
  "Puedes consultar y descargar información existente, pero no crear ni modificar registros.";

export interface ReadOnlyBannerProps {
  /** Mounts the banner. The live region around it is always mounted, so a change is announced. */
  readonly active: boolean;
  readonly title?: string;
  /** Why the account is read-only (payment rejected, pending activation…), from F5-03. */
  readonly reason?: ReactNode;
  /** What the person can do, by permission (owner: regularize; others: ask the owner). */
  readonly action?: ReactNode;
  /** "Ver suscripción" link; `null` hides it (e.g. inside the subscription page). */
  readonly subscriptionHref?: string | null;
  readonly subscriptionLabel?: string;
  readonly className?: string | undefined;
}

/**
 * Persistent read-only bar (UI_UX §13.7 "Barra de modo lectura", §25): visible on every page of
 * the account while the mode lasts, never dismissible, aligned with the F5-03 access mode.
 */
export function ReadOnlyBanner({
  active,
  title = "Cuenta en modo lectura",
  reason,
  action,
  subscriptionHref = "/subscription",
  subscriptionLabel = "Ver suscripción",
  className,
}: ReadOnlyBannerProps) {
  return (
    <div aria-live="polite" className="ids-readonly-region">
      {active && (
        <Banner
          tone="readonly"
          title={title}
          className={cx("ids-readonly-banner", className)}
          actions={
            subscriptionHref ? (
              <ButtonLink href={subscriptionHref} variant="secondary" size="sm">
                {subscriptionLabel}
              </ButtonLink>
            ) : undefined
          }
        >
          <p>
            {READ_ONLY_CONSEQUENCE}
            {reason && <> {reason}</>}
          </p>
          {action && <p>{action}</p>}
        </Banner>
      )}
    </div>
  );
}

export interface ReadOnlyIndicatorProps {
  /**
   * `account`: the subscription put the account in read-only (F5-03). `permission`: the role
   * can only consult this area. Both look the same; the text says which one applies.
   */
  readonly scope?: "account" | "permission";
  /** Overrides the default text. */
  readonly label?: string;
  /** Short explanation after the chip ("No puedes registrar evidencias."). */
  readonly reason?: ReactNode;
  readonly className?: string | undefined;
}

const LABELS = { account: "Modo lectura", permission: "Solo consulta" } as const;

/**
 * Local read-only marker next to a page title, form or section, so the person knows before
 * starting a flow that it cannot be saved (UI_UX §25.2).
 */
export function ReadOnlyIndicator({
  scope = "account",
  label,
  reason,
  className,
}: ReadOnlyIndicatorProps) {
  return (
    <span className={cx("ids-readonly", className)} data-scope={scope}>
      <StatusTag tone="warning" icon="lock">
        {label ?? LABELS[scope]}
      </StatusTag>
      {reason && <span className="ids-readonly__reason">{reason}</span>}
    </span>
  );
}
