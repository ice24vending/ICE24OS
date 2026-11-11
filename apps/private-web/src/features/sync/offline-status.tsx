import { SyncStatus, type SyncState } from "@ice24/ui";
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
      <SyncStatus state={state} variant={state === "saved_locally" ? "chip" : "panel"} />
      <p role="status">{message}</p>
      {state === "saved_locally" && (
        <p>Al confirmar el cierre se enviará la ejecución junto con sus fotos.</p>
      )}
      <p>{pending} operaciones pendientes · Disponibles hasta 72 horas desde la descarga.</p>
    </section>
  );
}
