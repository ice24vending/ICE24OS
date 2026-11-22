import { redirect } from "next/navigation";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { guardDestination, loadAccountShell } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
import { demoStateOf } from "../../../server/demo/session";
import { loadOperationalSummary } from "../../../features/summary/load-operational-summary";
import { SummaryScreen } from "../../../features/summary/summary-screen";
import "../../../features/summary/summary.css";

export const metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

export default async function SummaryPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("summary");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  const permissions = shell.capabilities?.permissions ?? null;
  const technician = permissions?.includes("maintenance.orders-execute") ?? false;
  const data = await loadOperationalSummary(
    (path) =>
      callPrivateApi(path, session, { signal: AbortSignal.timeout(10000) }).catch(() => null),
    {
      permissions,
      branchId: session.focus?.branchId,
      machineId: session.focus?.machineId,
      technicianId: technician ? (shell.userId ?? "unavailable") : undefined,
    },
  );
  const now = data.now;
  return (
    <SummaryScreen
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      data={data}
      now={now}
      maintenanceDisabled={demoStateOf(session)?.maintenance === "disabled"}
      tasksHref={technician ? "/maintenance/work-orders?view=assigned" : "/maintenance?view=list"}
    />
  );
}
