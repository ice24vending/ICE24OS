import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { EquipmentWorkspace } from "../../features/equipment/workspace";
import "../../features/equipment/equipment.css";
import { callPrivateApi } from "../../server/session/supabase-auth";

export const dynamic = "force-dynamic";
export default async function WorkspacePage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const canAudit = await callPrivateApi("audit-events?limit=1", session, {
    signal: AbortSignal.timeout(5000),
  })
    .then((response) => response.ok)
    .catch(() => false);
  return (
    <>
      <nav aria-label="Servicios de cuenta">
        <a href="/subscription">Suscripción</a>
        {canAudit && <a href="/audit">Auditoría</a>}
      </nav>
      <EquipmentWorkspace csrfToken={session.csrfToken} contextId={session.contextId} />
    </>
  );
}
