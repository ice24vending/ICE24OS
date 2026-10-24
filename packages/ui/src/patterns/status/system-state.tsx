import { useId, type ReactNode } from "react";

import { Button } from "../../components/base/button.js";
import { Icon, type IconName } from "../../components/base/icon.js";
import { cx } from "../../components/base/shared.js";

/**
 * Global screen states (F6-10, UI_UX §17–20). One component for every page and section, so a
 * failure reads the same everywhere: what happened, its impact and the next action.
 */
export type SystemStateKind =
  | "loading"
  | "empty"
  | "error"
  | "forbidden"
  | "offline"
  | "read_only"
  | "conflict"
  | "session"
  | "not_found";

export const SYSTEM_STATE_TITLES: Record<SystemStateKind, string> = {
  loading: "Cargando",
  empty: "Sin resultados",
  error: "No fue posible completar la consulta",
  forbidden: "Sin permiso",
  offline: "Sin conexión",
  read_only: "Cuenta en modo lectura",
  conflict: "La información cambió",
  session: "Sesión expirada",
  not_found: "No disponible",
};

/** Default guidance (UI_UX §18.1: what happened, impact and what to do). */
export const SYSTEM_STATE_GUIDANCE: Partial<Record<SystemStateKind, string>> = {
  error: "El servicio no respondió. No se realizó ningún cambio; puedes intentarlo de nuevo.",
  forbidden: "No tienes permiso para consultar este recurso en el contexto activo.",
  offline: "Revisa tu conexión. Ningún cambio se envió mientras no había red.",
  read_only:
    "Puedes consultar y descargar información existente, pero no crear ni modificar registros.",
  conflict:
    "Otra persona o un proceso modificó este registro. No se sobrescribió nada: actualiza para ver la versión vigente antes de volver a intentarlo.",
  session: "Inicia sesión nuevamente para continuar.",
  not_found: "No encontramos el recurso o ya no está disponible.",
};

const ICONS: Record<SystemStateKind, IconName> = {
  loading: "clock",
  empty: "empty",
  error: "danger",
  forbidden: "lock",
  offline: "offline",
  read_only: "lock",
  conflict: "conflict",
  session: "user",
  not_found: "search",
};

export type SkeletonVariant = "list" | "detail" | "cards" | "form";

export interface SkeletonProps {
  /** Shape of the structure being loaded (UI_UX §13.4: skeleton only for known structure). */
  readonly variant?: SkeletonVariant;
  readonly rows?: number;
  readonly className?: string | undefined;
}

/** Placeholder shapes; decorative, the surrounding status region says what is loading. */
export function Skeleton({ variant = "list", rows = 3, className }: SkeletonProps) {
  const items = Array.from({ length: rows }, (_, index) => index);
  return (
    <div
      className={cx("ids-skeleton-block", `ids-skeleton-block--${variant}`, className)}
      aria-hidden="true"
    >
      {variant === "detail" && <span className="ids-skeleton ids-skeleton--title" />}
      {items.map((index) => (
        <span key={index} className="ids-skeleton-block__item">
          <span className="ids-skeleton ids-skeleton--line" />
          {variant !== "form" && <span className="ids-skeleton ids-skeleton--short" />}
        </span>
      ))}
    </div>
  );
}

export interface SystemStateProps {
  readonly kind: SystemStateKind;
  readonly title?: string | undefined;
  readonly message?: ReactNode;
  /** Support reference of the failed operation (API `correlationId`), shown as «Folio». */
  readonly correlationId?: string | undefined;
  /**
   * Retry of the failed operation. The caller must make it idempotent: a read repeats the read,
   * a write resends the same idempotency key and expected version so nothing is duplicated.
   */
  readonly onRetry?: (() => void) | undefined;
  /** Disables the retry while it runs, so a double tap sends one request. */
  readonly retrying?: boolean | undefined;
  readonly retryLabel?: string | undefined;
  /** Next useful action (empty: «Solicitar alta»; conflict: «Actualizar»; session: «Iniciar sesión»). */
  readonly action?: ReactNode;
  /** Loading only: the structure the skeleton draws. */
  readonly skeleton?: SkeletonVariant | undefined;
  readonly titleAs?: "h2" | "h3" | "p";
  readonly className?: string | undefined;
}

/**
 * Loading and empty are status regions; every other state is an alert, announced when it
 * appears. Loading keeps its title for screen readers and draws the skeleton.
 */
export function SystemState({
  kind,
  title,
  message,
  correlationId,
  onRetry,
  retrying = false,
  retryLabel = "Reintentar",
  action,
  skeleton,
  titleAs: Title = "h2",
  className,
}: SystemStateProps) {
  const titleId = useId();
  const quiet = kind === "loading" || kind === "empty";
  const guidance = message ?? SYSTEM_STATE_GUIDANCE[kind];
  const loading = kind === "loading";
  return (
    <section
      className={cx("ids-system-state", `ids-system-state--${kind.replace("_", "-")}`, className)}
      role={quiet ? "status" : "alert"}
      aria-busy={loading || undefined}
      aria-labelledby={titleId}
      data-state={kind}
    >
      {!loading && <Icon name={ICONS[kind]} size={24} className="ids-system-state__icon" />}
      <Title
        id={titleId}
        className={cx("ids-system-state__title", loading && skeleton && "ids-visually-hidden")}
      >
        {title ?? SYSTEM_STATE_TITLES[kind]}
      </Title>
      {loading && skeleton && <Skeleton variant={skeleton} />}
      {guidance && <div className="ids-system-state__message">{guidance}</div>}
      {correlationId && (
        <p className="ids-system-state__reference">
          Folio para soporte: <code>{correlationId}</code>
        </p>
      )}
      {(onRetry || action) && (
        <div className="ids-system-state__actions">
          {onRetry && (
            <Button
              variant="secondary"
              onClick={onRetry}
              loading={retrying}
              loadingLabel="Reintentando…"
            >
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </section>
  );
}
