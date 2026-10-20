import { ServiceState } from "../account-shell/service-state";
import type { DeniedDestination } from "../../server/account/shell";

/** Page opened by URL without permission (F6-07): the denial was audited with this correlation. */
export function DestinationDenied({ denied }: { denied: DeniedDestination }) {
  return (
    <main id="main-content" className="private-shell">
      <h1>{denied.label}</h1>
      <ServiceState
        kind="forbidden"
        message={`No tienes permiso para abrir «${denied.label}» en esta cuenta. Si lo necesitas, solicítalo al propietario de la cuenta o a ICE24.`}
      />
      <p className="destination-denied__reference">
        Folio para soporte: <code>{denied.correlationId}</code>
      </p>
    </main>
  );
}
