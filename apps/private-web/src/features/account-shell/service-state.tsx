import type { ReactNode } from "react";
import type { FailureKind } from "./failure";

export type ServiceStateKind = FailureKind | "loading" | "empty";

const TITLES: Record<ServiceStateKind, string> = {
  loading: "Cargando",
  empty: "Sin resultados",
  session: "Sesión expirada",
  forbidden: "Sin permiso",
  read_only: "Cuenta en modo lectura",
  not_found: "No disponible",
  conflict: "La información cambió",
  offline: "Sin conexión",
  error: "No fue posible completar la consulta",
};

/** Default guidance per state (UI/UX 18.1: what happened, impact and what to do). */
const GUIDANCE: Partial<Record<ServiceStateKind, string>> = {
  forbidden: "No tienes permiso para consultar este recurso en el contexto activo.",
  conflict:
    "Otra persona o un proceso modificó este registro. No se sobrescribió nada: actualiza para ver la versión vigente antes de volver a intentarlo.",
  offline: "Revisa tu conexión. Ningún cambio se envió mientras no había red.",
  session: "Inicia sesión nuevamente para continuar.",
};

/**
 * One state panel for every account service: loading, empty, error, no permission, offline,
 * version conflict and read-only. Failures use `role="alert"`; loading and empty use status.
 */
export function ServiceState({
  kind,
  title,
  message,
  onRetry,
  retryLabel = "Reintentar",
  children,
}: {
  kind: ServiceStateKind;
  title?: string | undefined;
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
  retryLabel?: string;
  children?: ReactNode;
}) {
  const failure = kind !== "loading" && kind !== "empty";
  const guidance = message ?? GUIDANCE[kind];
  return (
    <section
      className={`service-state service-state--${kind.replace("_", "-")}`}
      role={failure ? "alert" : "status"}
      aria-busy={kind === "loading" || undefined}
      data-state={kind}
    >
      <h2>{title ?? TITLES[kind]}</h2>
      {guidance && <p>{guidance}</p>}
      {(onRetry || children || kind === "session") && (
        <div className="service-state__actions">
          {onRetry && (
            <button type="button" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
          {kind === "session" && <a href="/?error=expired">Iniciar sesión</a>}
          {children}
        </div>
      )}
    </section>
  );
}
