import type { ReactNode } from "react";

import { StatusTag } from "../base/badge.js";
import { Button } from "../base/button.js";
import type { IconName } from "../base/icon.js";
import { cx, type StatusTone } from "../base/shared.js";

/**
 * Synchronization states of UI_UX §13.7 ("Indicador de sincronización") and §20.1 (global
 * indicator), plus `offline` for the network itself.
 */
export type SyncState =
  | "synced"
  | "syncing"
  | "pending"
  | "saved_locally"
  | "available_offline"
  | "error"
  | "conflict"
  | "offline";

export const SYNC_STATES: Record<SyncState, { label: string; tone: StatusTone; icon: IconName }> = {
  synced: { label: "Sincronizado", tone: "success", icon: "check-circle" },
  syncing: { label: "Sincronizando…", tone: "info", icon: "sync" },
  pending: { label: "Pendiente de sincronizar", tone: "offline", icon: "clock" },
  saved_locally: { label: "Guardado en este dispositivo", tone: "offline", icon: "device" },
  available_offline: { label: "Disponible offline", tone: "offline", icon: "download" },
  error: { label: "Error al sincronizar", tone: "danger", icon: "danger" },
  conflict: { label: "Conflicto", tone: "danger", icon: "conflict" },
  offline: { label: "Sin conexión", tone: "offline", icon: "offline" },
};

const EXPLANATIONS: Partial<Record<SyncState, string>> = {
  pending: "Los cambios se enviarán en orden cuando haya conexión.",
  saved_locally:
    "Tus cambios se guardaron en este dispositivo y se sincronizarán cuando vuelva la red.",
  error: "No se perdió ningún cambio. Al reintentar solo se envían los pendientes.",
  conflict: "Ambas versiones se conservan. Elige cuál queda; nada se decide automáticamente.",
  offline: "Solo están disponibles las funciones descargadas.",
};

export interface SyncStatusProps {
  readonly state: SyncState;
  /** `chip` for the header (UI_UX §20.1); `panel` for a queue item or a record (§20.5). */
  readonly variant?: "chip" | "panel";
  /** Entity in the queue ("Bitácora SAN-102 · ICE24-000145"). */
  readonly entity?: ReactNode;
  /** Changes waiting to be sent. */
  readonly pendingCount?: number | undefined;
  /** Last successful synchronization, already formatted ("hoy 19:42"). */
  readonly lastSynced?: string | undefined;
  readonly lastSyncedAt?: string | undefined;
  /** Attempt number of the queued operation (UI_UX §20.5). */
  readonly attempt?: number | undefined;
  /**
   * Identifier of the queued operation. It is the idempotency key the screen sends again on
   * retry, so a retry never repeats what already reached the server (UI_UX §18.5).
   */
  readonly operationId?: string | undefined;
  /** Offered in `error`; receives the operation identifier. Omit it to hide the action. */
  readonly onRetry?: ((operationId: string | undefined) => void) | undefined;
  /** Offered in `conflict`; opens the comparison (Comparator). */
  readonly onResolve?: (() => void) | undefined;
  /** Retry in flight: the button shows progress and ignores further clicks. */
  readonly retrying?: boolean | undefined;
  /** Why the actions are not available (no connection, no permission to resolve). */
  readonly actionsDisabledReason?: string | undefined;
  readonly className?: string | undefined;
}

const count = (value: number) =>
  value === 1 ? "1 cambio sin sincronizar" : `${value} cambios sin sincronizar`;

/**
 * Synchronization indicator. Text + icon + color for every state; "Sincronizando…" is announced
 * politely and does not animate. Retrying is the screen's job: this component passes back the
 * operation identifier and locks the button while `retrying` is true.
 */
export function SyncStatus({
  state,
  variant = "chip",
  entity,
  pendingCount,
  lastSynced,
  lastSyncedAt,
  attempt,
  operationId,
  onRetry,
  onResolve,
  retrying = false,
  actionsDisabledReason,
  className,
}: SyncStatusProps) {
  const look = SYNC_STATES[state];
  const pending = pendingCount !== undefined && pendingCount > 0 ? count(pendingCount) : null;
  const tag = (
    <StatusTag tone={look.tone} icon={look.icon} dimension="Sincronización">
      {look.label}
      {variant === "chip" && pending && <span aria-hidden>{` · ${pendingCount}`}</span>}
      {variant === "chip" && pending && (
        <span className="ids-visually-hidden">{`, ${pending}`}</span>
      )}
    </StatusTag>
  );
  if (variant === "chip")
    return (
      <span
        className={cx("ids-sync", "ids-sync--chip", className)}
        role="status"
        data-state={state}
      >
        {tag}
      </span>
    );
  return (
    <div className={cx("ids-sync", "ids-sync--panel", className)} data-state={state}>
      <div className="ids-sync__head" role="status">
        {tag}
        {entity && <span className="ids-sync__entity">{entity}</span>}
      </div>
      {EXPLANATIONS[state] && <p className="ids-sync__text">{EXPLANATIONS[state]}</p>}
      {(pending || lastSynced || attempt !== undefined || operationId) && (
        <dl className="ids-sync__meta">
          {pending && (
            <div>
              <dt>Pendientes</dt>
              <dd>{pending}</dd>
            </div>
          )}
          {lastSynced && (
            <div>
              <dt>Última sincronización</dt>
              <dd>
                {lastSyncedAt ? <time dateTime={lastSyncedAt}>{lastSynced}</time> : lastSynced}
              </dd>
            </div>
          )}
          {attempt !== undefined && (
            <div>
              <dt>Intento</dt>
              <dd>{attempt}</dd>
            </div>
          )}
          {operationId && (
            <div>
              <dt>Operación</dt>
              <dd className="ids-sync__operation">{operationId}</dd>
            </div>
          )}
        </dl>
      )}
      {((state === "error" && onRetry) || (state === "conflict" && onResolve)) && (
        <div className="ids-sync__actions">
          {state === "error" && onRetry && (
            <Button
              size="sm"
              variant="secondary"
              icon="refresh"
              loading={retrying}
              loadingLabel="Reintentando…"
              disabledReason={retrying ? undefined : actionsDisabledReason}
              onClick={() => onRetry(operationId)}
            >
              Reintentar
            </Button>
          )}
          {state === "conflict" && onResolve && (
            <Button
              size="sm"
              icon="compare"
              disabledReason={actionsDisabledReason}
              onClick={onResolve}
            >
              Resolver
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
