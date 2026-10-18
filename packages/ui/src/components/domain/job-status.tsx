import type { ReactNode } from "react";

import { StatusTag } from "../base/badge.js";
import { Button } from "../base/button.js";
import type { IconName } from "../base/icon.js";
import { cx, type StatusTone } from "../base/shared.js";
import { TransitionFeedbackBanner, type TransitionFeedback } from "./feedback.js";

/** States of `infra.async_jobs` (F5-07, Center of jobs: internal vocabulary). */
export type InternalJobStatus =
  "QUEUED" | "RUNNING" | "SUCCEEDED" | "RETRY_WAIT" | "FAILED" | "DEAD_LETTER";
/** Public `Job` resource of JOB-001 (PDF, export, import or email for the account). */
export type PublicJobStatus = "queued" | "processing" | "completed" | "failed";
export type JobState = InternalJobStatus | PublicJobStatus;

interface JobLook {
  readonly label: string;
  readonly tone: StatusTone;
  readonly icon: IconName;
}

export const JOB_STATES: Record<JobState, JobLook> = {
  QUEUED: { label: "En cola", tone: "info", icon: "clock" },
  RUNNING: { label: "Procesando", tone: "info", icon: "play" },
  SUCCEEDED: { label: "Completado", tone: "success", icon: "check-circle" },
  RETRY_WAIT: { label: "Reintento programado", tone: "warning", icon: "refresh" },
  FAILED: { label: "Fallido", tone: "danger", icon: "danger" },
  DEAD_LETTER: { label: "En DLQ", tone: "danger", icon: "inbox" },
  // UI_UX §13.7 "Estado de tarea asíncrona", in the words of the person who asked for it.
  queued: { label: "Solicitada", tone: "info", icon: "clock" },
  processing: { label: "Procesando", tone: "info", icon: "play" },
  completed: { label: "Disponible", tone: "success", icon: "check-circle" },
  failed: { label: "Error reintentable", tone: "danger", icon: "danger" },
};

/** Only failed and dead-lettered jobs accept a manual retry (INT-004). */
export const RETRYABLE_JOB_STATES: readonly JobState[] = ["FAILED", "DEAD_LETTER", "failed"];

export const jobStatusLabel = (status: JobState) => JOB_STATES[status].label;

export interface JobStatusProps {
  readonly status: JobState;
  /** `tag` inside tables and timelines; `detail` adds attempts, schedule, error and retry. */
  readonly variant?: "tag" | "detail";
  readonly attemptCount?: number | undefined;
  readonly maxAttempts?: number | undefined;
  readonly manualRetryCount?: number | undefined;
  /** Next automatic attempt, already formatted ("06/10/2026 12:05 UTC"). */
  readonly nextAttempt?: string | undefined;
  readonly errorCode?: string | null | undefined;
  /** `rowVersion` the person saw; passed back to `onRetry` and sent as `If-Match`. */
  readonly version?: number | undefined;
  /** Offered only in a retryable state. Omit it when the person lacks `jobs.retry`. */
  readonly onRetry?: ((expectedVersion: number) => void) | undefined;
  readonly retrying?: boolean | undefined;
  /** Why the retry is not available (read-only account, no connection, reason missing). */
  readonly retryDisabledReason?: string | undefined;
  readonly retryLabel?: string;
  /** Failed retry (412: the job changed; or an error), with a way to recover. */
  readonly feedback?: TransitionFeedback | null | undefined;
  readonly onRefresh?: (() => void) | undefined;
  /** Content between the summary and the action, such as the mandatory reason field. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Status of an asynchronous job (UI_UX §13.7, §19.4) aligned with F5-07. The tag says the state
 * with text + icon; the detail explains attempts and offers the retry, which the screen sends
 * with the expected version and a stable idempotency key so it is never queued twice.
 */
export function JobStatus({
  status,
  variant = "tag",
  attemptCount,
  maxAttempts,
  manualRetryCount,
  nextAttempt,
  errorCode,
  version,
  onRetry,
  retrying = false,
  retryDisabledReason,
  retryLabel = "Reintentar trabajo",
  feedback = null,
  onRefresh,
  children,
  className,
}: JobStatusProps) {
  const look = JOB_STATES[status];
  const tag = (
    <StatusTag tone={look.tone} icon={look.icon} dimension="Trabajo" className="ids-job__tag">
      {look.label}
    </StatusTag>
  );
  if (variant === "tag") return tag;
  const retryable = RETRYABLE_JOB_STATES.includes(status);
  return (
    <div className={cx("ids-job", className)} data-status={status}>
      <div className="ids-job__head" role="status">
        {tag}
      </div>
      <dl className="ids-job__meta">
        {attemptCount !== undefined && (
          <div>
            <dt>Intentos</dt>
            <dd>
              {maxAttempts === undefined ? attemptCount : `${attemptCount} de ${maxAttempts}`}
              {manualRetryCount ? ` · ${manualRetryCount} manual` : ""}
            </dd>
          </div>
        )}
        {status === "RETRY_WAIT" && nextAttempt && (
          <div>
            <dt>Próximo intento</dt>
            <dd>{nextAttempt}</dd>
          </div>
        )}
        {errorCode && (
          <div>
            <dt>Error</dt>
            <dd className="ids-job__error">{errorCode}</dd>
          </div>
        )}
      </dl>
      {status === "DEAD_LETTER" && (
        <p className="ids-job__text">
          Agotó sus intentos automáticos y espera revisión. Un reintento manual exige motivo y queda
          auditado.
        </p>
      )}
      {feedback && <TransitionFeedbackBanner feedback={feedback} onRefresh={onRefresh} />}
      {children}
      {retryable && onRetry && version !== undefined && (
        <div className="ids-job__actions">
          <Button
            icon="refresh"
            loading={retrying}
            loadingLabel="Reenviando…"
            disabledReason={retrying ? undefined : retryDisabledReason}
            onClick={() => onRetry(version)}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
