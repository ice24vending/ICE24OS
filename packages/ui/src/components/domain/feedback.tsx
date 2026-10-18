import { Banner } from "../base/banner.js";
import { Button } from "../base/button.js";

/**
 * Result of a failed transition ("Enterado", "Reintentar"), already classified by the screen.
 * `conflict` is a 412 `PRECONDITION_FAILED` or a state conflict: the record changed since it was
 * read, nothing was written, and the person decides again with fresh data (UI_UX §18.3).
 */
export interface TransitionFeedback {
  readonly kind: "conflict" | "error";
  readonly message: string;
  readonly title?: string | undefined;
}

export const FEEDBACK_TITLES: Record<TransitionFeedback["kind"], string> = {
  conflict: "La información cambió",
  error: "No fue posible completar la acción",
};

/**
 * Recoverable failure shown next to the record. A conflict offers "Actualizar" (read again, never
 * resend); an error offers "Reintentar", which the screen sends with the same expected version and
 * idempotency key so the effect is not duplicated.
 */
export function TransitionFeedbackBanner({
  feedback,
  onRefresh,
  onRetry,
  titleAs = "p",
}: {
  readonly feedback: TransitionFeedback;
  readonly onRefresh?: (() => void) | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly titleAs?: "h3" | "h4" | "p";
}) {
  const action =
    feedback.kind === "conflict"
      ? onRefresh && { label: "Actualizar", run: onRefresh }
      : onRetry && { label: "Reintentar", run: onRetry };
  return (
    <Banner
      tone={feedback.kind === "conflict" ? "warning" : "danger"}
      role="alert"
      title={feedback.title ?? FEEDBACK_TITLES[feedback.kind]}
      titleAs={titleAs}
      className="ids-feedback"
      actions={
        action ? (
          <Button size="sm" variant="secondary" onClick={action.run}>
            {action.label}
          </Button>
        ) : undefined
      }
    >
      {feedback.message}
    </Banner>
  );
}
