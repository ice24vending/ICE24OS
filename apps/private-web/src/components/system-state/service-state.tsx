import type { ReactNode } from "react";
import { SystemState, type SkeletonVariant } from "@ice24/ui";
import type { FailureKind } from "./failure";
import { SessionLoginLink } from "./session-login-link";

export type ServiceStateKind = FailureKind | "loading" | "empty";

/**
 * The private web's state panel (F5-15, unified in F6-10): every screen renders the design
 * system's SystemState through it, so titles, guidance, roles and the support reference are the
 * same everywhere. An expired session always offers «Iniciar sesión», back to the same page.
 */
export function ServiceState({
  kind,
  title,
  message,
  correlationId,
  onRetry,
  retrying,
  retryLabel = "Reintentar",
  skeleton,
  children,
}: {
  kind: ServiceStateKind;
  title?: string | undefined;
  message?: string | undefined;
  /** Correlation of the failed call, from the BFF body; shown as «Folio para soporte». */
  correlationId?: string | undefined;
  onRetry?: (() => void) | undefined;
  retrying?: boolean | undefined;
  retryLabel?: string;
  skeleton?: SkeletonVariant | undefined;
  children?: ReactNode;
}) {
  return (
    <SystemState
      kind={kind}
      title={title}
      message={message}
      correlationId={kind === "loading" || kind === "empty" ? undefined : correlationId}
      onRetry={onRetry}
      retrying={retrying}
      retryLabel={retryLabel}
      skeleton={skeleton}
      className="service-state"
      action={
        (kind === "session" || children) && (
          <>
            {kind === "session" && <SessionLoginLink />}
            {children}
          </>
        )
      }
    />
  );
}
