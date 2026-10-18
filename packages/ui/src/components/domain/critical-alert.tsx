import { useId, type ReactNode } from "react";

import { StatusTag } from "../base/badge.js";
import { Button } from "../base/button.js";
import { Icon } from "../base/icon.js";
import { cx, type StatusTone } from "../base/shared.js";
import { TransitionFeedbackBanner, type TransitionFeedback } from "./feedback.js";

/** Notification priority and recipient status of F5-11 (`@ice24/contracts` notifications). */
export type AlertPriority = "critical" | "high" | "warning" | "info";
export type AlertStatus = "unread" | "read" | "acknowledged" | "in_progress" | "resolved";
export type AlertAction = "acknowledge" | "start-attention" | "resolve";

export const ALERT_PRIORITIES: Record<AlertPriority, { label: string; tone: StatusTone }> = {
  critical: { label: "Crítica", tone: "danger" },
  high: { label: "Alta", tone: "warning" },
  warning: { label: "Advertencia", tone: "warning" },
  info: { label: "Informativa", tone: "info" },
};

export const ALERT_STATUSES: Record<AlertStatus, { label: string; tone: StatusTone }> = {
  unread: { label: "No leída", tone: "info" },
  read: { label: "Leída", tone: "info" },
  acknowledged: { label: "Enterado", tone: "info" },
  in_progress: { label: "En atención", tone: "warning" },
  resolved: { label: "Resuelta", tone: "success" },
};

/** Transition callback: receives the version the person saw, sent as `If-Match`. */
export type AlertTransition = (expectedVersion: number) => void;

export interface CriticalAlertProps {
  readonly title: string;
  readonly message?: ReactNode;
  readonly priority: AlertPriority;
  readonly status: AlertStatus;
  /** Critical alerts stay pinned until "Enterado" (RF-ALT-006); reading never unpins. */
  readonly pinned: boolean;
  /** `audit.version` of the recipient row; passed back to every transition. */
  readonly version: number;
  /** Elapsed time already formatted by the screen ("hace 7 h"), with the ISO instant. */
  readonly elapsed: string;
  readonly occurredAt?: string | undefined;
  /** Machine, branch or other source ("ICE24-000145 · Sucursal Centro"). */
  readonly source?: ReactNode;
  readonly responsible?: ReactNode;
  /** Next escalation level and remaining time (UI_UX §26.4). */
  readonly escalation?: ReactNode;
  /**
   * Omit a transition the person cannot perform (no permission, no linked resource): its button
   * is not drawn. Each one is offered only from the states F5-11 allows.
   */
  readonly onAcknowledge?: AlertTransition | undefined;
  readonly onAttend?: AlertTransition | undefined;
  readonly onResolve?: AlertTransition | undefined;
  /** Why "Marcar resuelta" is not available yet (the linked condition is still open). */
  readonly resolveBlockedReason?: string | undefined;
  /** Why no transition is available right now (e.g. offline). Buttons stay focusable. */
  readonly actionsDisabledReason?: string | undefined;
  /** Transition in flight: its button shows progress and every action is locked. */
  readonly pending?: AlertAction | null | undefined;
  /** Failed transition (412 or error), shown inside the card with a way to recover. */
  readonly feedback?: TransitionFeedback | null | undefined;
  /** Reads the alert again after a conflict. */
  readonly onRefresh?: (() => void) | undefined;
  /** Repeats the last failed transition with the same version (and idempotency key). */
  readonly onRetryFeedback?: (() => void) | undefined;
  /** "Ver detalle" toggle; opening an alert marks it read, never acknowledged (UI_UX §26.2). */
  readonly detailOpen?: boolean | undefined;
  readonly onToggleDetail?: (() => void) | undefined;
  readonly detail?: ReactNode;
  /** Link to the source ("Ver suscripción"). */
  readonly action?: { readonly href: string; readonly label: string } | null | undefined;
  readonly as?: "li" | "article" | "div";
  readonly titleAs?: "h2" | "h3" | "h4";
  readonly className?: string | undefined;
}

const PENDING_LABELS: Record<AlertAction, string> = {
  acknowledge: "Registrando…",
  "start-attention": "Registrando…",
  resolve: "Resolviendo…",
};

/**
 * Critical alert card (UI_UX §13.7 "Tarjeta de alerta crítica", §26): priority, source,
 * condition, elapsed time, responsible, escalation and the actions "Marcar enterado" and
 * "Atender". It only draws: the screen performs each transition with the expected version and
 * passes back the result. "Enterado" never resolves the alert.
 */
export function CriticalAlert({
  title,
  message,
  priority,
  status,
  pinned,
  version,
  elapsed,
  occurredAt,
  source,
  responsible,
  escalation,
  onAcknowledge,
  onAttend,
  onResolve,
  resolveBlockedReason,
  actionsDisabledReason,
  pending = null,
  feedback = null,
  onRefresh,
  onRetryFeedback,
  detailOpen = false,
  onToggleDetail,
  detail,
  action,
  as: Element = "article",
  titleAs: Title = "h3",
  className,
}: CriticalAlertProps) {
  const id = useId();
  const priorityLook = ALERT_PRIORITIES[priority];
  const statusLook = ALERT_STATUSES[status];
  const notAcknowledged = status === "unread" || status === "read";
  const canAcknowledge = onAcknowledge && notAcknowledged;
  const canAttend = onAttend && (notAcknowledged || status === "acknowledged");
  const canResolve = onResolve && (status === "acknowledged" || status === "in_progress");
  const locked = pending !== null ? "Hay una acción en curso." : actionsDisabledReason;
  const button = (
    name: AlertAction,
    label: string,
    transition: AlertTransition,
    variant: "primary" | "secondary",
    blockedReason?: string,
  ) => (
    <Button
      variant={variant}
      loading={pending === name}
      loadingLabel={PENDING_LABELS[name]}
      disabledReason={pending === name ? undefined : (locked ?? blockedReason)}
      onClick={() => transition(version)}
    >
      {label}
    </Button>
  );
  return (
    <Element
      className={cx(
        "ids-alert",
        `ids-alert--${priority}`,
        pinned && "ids-alert--pinned",
        className,
      )}
      aria-labelledby={Element === "div" ? undefined : `${id}-title`}
      data-status={status}
    >
      <div className="ids-alert__head">
        <StatusTag
          tone={priorityLook.tone}
          dimension="Prioridad"
          variant={priority === "critical" ? "solid" : "subtle"}
        >
          {priorityLook.label}
        </StatusTag>
        <StatusTag tone={statusLook.tone} dimension="Estado" className="ids-alert__status">
          {statusLook.label}
        </StatusTag>
        {pinned && (
          <span className="ids-alert__pinned">
            <Icon name="pin" size={16} />
            Fijada
          </span>
        )}
        <span className="ids-alert__time">
          <Icon name="clock" size={16} />
          {occurredAt ? <time dateTime={occurredAt}>{elapsed}</time> : elapsed}
        </span>
      </div>
      <Title id={`${id}-title`} className="ids-alert__title">
        {title}
      </Title>
      {source && <p className="ids-alert__source">{source}</p>}
      {message && <div className="ids-alert__message">{message}</div>}
      {(responsible || escalation) && (
        <dl className="ids-alert__meta">
          {responsible && (
            <div>
              <dt>
                <Icon name="user" size={16} />
                Responsable
              </dt>
              <dd>{responsible}</dd>
            </div>
          )}
          {escalation && (
            <div>
              <dt>
                <Icon name="escalate" size={16} />
                Escalamiento
              </dt>
              <dd>{escalation}</dd>
            </div>
          )}
        </dl>
      )}
      {pinned && notAcknowledged && (
        <p className="ids-alert__note">
          Fijada hasta que marques «Enterado». Leerla no la quita de esta lista.
        </p>
      )}
      {feedback && (
        <TransitionFeedbackBanner
          // One level below the card title, so the outline stays in order.
          titleAs={Title === "h2" ? "h3" : Title === "h3" ? "h4" : "p"}
          feedback={feedback}
          onRefresh={onRefresh}
          onRetry={onRetryFeedback}
        />
      )}
      <div className="ids-alert__actions">
        {onToggleDetail && (
          <Button
            variant="tertiary"
            aria-expanded={detailOpen}
            aria-controls={detailOpen && detail ? `${id}-detail` : undefined}
            onClick={onToggleDetail}
          >
            {detailOpen ? "Ocultar detalle" : "Ver detalle"}
          </Button>
        )}
        {canAcknowledge && button("acknowledge", "Marcar enterado", onAcknowledge, "secondary")}
        {canAttend && button("start-attention", "Atender", onAttend, "primary")}
        {canResolve &&
          button("resolve", "Marcar resuelta", onResolve, "secondary", resolveBlockedReason)}
        {action && (
          <a className="ids-alert__link" href={action.href}>
            {action.label}
          </a>
        )}
      </div>
      {detailOpen && detail && (
        <div id={`${id}-detail`} className="ids-alert__detail">
          {detail}
        </div>
      )}
    </Element>
  );
}
