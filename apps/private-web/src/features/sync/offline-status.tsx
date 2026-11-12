import { LiveRegion } from "@ice24/ui";
import { SYNC_STATES, SyncStatus, type SyncState } from "@ice24/ui";
export function OfflineStatus({
  state,
  pending,
  message,
}: {
  state: SyncState;
  pending: number;
  message: string;
}) {
  return (
    <section aria-label="Estado del trabajo local">
      {/* The message below owns announcements; the visual tag must not repeat it. */}
      <SyncStatus
        announce={false}
        state={state}
        variant={state === "saved_locally" ? "chip" : "panel"}
      />
      <LiveRegion className="ids-visually-hidden" aria-label="Conectividad y almacenamiento local">
        {message === SYNC_STATES[state].label ? null : SYNC_STATES[state].label}
      </LiveRegion>
      <LiveRegion data-announcement="offline-save">{message}</LiveRegion>
      {state === "saved_locally" && (
        <p>Al confirmar el cierre se enviará la ejecución junto con sus fotos.</p>
      )}
      <p>{pending} operaciones pendientes · Disponibles hasta 72 horas desde la descarga.</p>
    </section>
  );
}
