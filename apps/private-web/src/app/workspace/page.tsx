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
  const allowed = (path: string) =>
    callPrivateApi(path, session, { signal: AbortSignal.timeout(5000) })
      .then((response) => response.ok)
      .catch(() => false);
  const [canAudit, canJobs] = await Promise.all([
    allowed("audit-events?limit=1"),
    allowed("admin/jobs?limit=1"),
  ]);
  return (
    <>
      <nav aria-label="Servicios de cuenta">
        <a href="/subscription">Suscripción</a>
        {canAudit && <a href="/audit">Auditoría</a>}
        {canJobs && <a href="/jobs">Centro de trabajos</a>}
      </nav>
      <EquipmentWorkspace csrfToken={session.csrfToken} contextId={session.contextId} />
    </>
  );
}
