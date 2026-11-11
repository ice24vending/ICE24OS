import { redirect } from "next/navigation";
import {
  notificationPageSchema,
  notificationSummarySchema,
  maintenanceSummarySchema,
  type Notification,
  type NotificationSummary,
} from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { guardDestination, loadAccountShell } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
import { demoStateOf } from "../../../server/demo/session";
import { loadMaintenanceTasks } from "../../../features/summary/load-maintenance-tasks";
import { SummaryScreen } from "../../../features/summary/summary-screen";
import { toSummaryMachines, type SummaryMachine } from "../../../features/summary/machines";
import "../../../features/summary/summary.css";

export const dynamic = "force-dynamic";

/**
 * Account summary (approved reference, D-03): what exists today (machines and alerts) with the
 * shape of the final dashboard. Each section fails on its own; a missing permission hides only
 * its section, and the API still decides every read.
 */
export default async function SummaryPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("summary");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  const maintenanceAllowed = shell.capabilities?.permissions.includes("maintenance.read") ?? false;
  const maintenanceFilters = new URLSearchParams();
  if (session.focus?.branchId) maintenanceFilters.set("branchId", session.focus.branchId);
  if (session.focus?.machineId) maintenanceFilters.set("machineId", session.focus.machineId);
  const call = (path: string) =>
    callPrivateApi(path, session, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  const technician =
    shell.capabilities?.permissions.includes("maintenance.orders-execute") ?? false;
  const [
    machineResponse,
    branchResponse,
    summaryResponse,
    pinnedResponse,
    maintenanceResponse,
    tasks,
  ] = await Promise.all([
    call("machines"),
    call("branches"),
    call("notifications/summary"),
    call("notifications?pinned=true&limit=3"),
    maintenanceAllowed ? call(`maintenance/summary?${maintenanceFilters}`) : null,
    maintenanceAllowed
      ? loadMaintenanceTasks(call, {
          filters: maintenanceFilters,
          readOrders: shell.capabilities?.permissions.includes("maintenance.orders-read") ?? false,
          technicianId: technician ? (shell.userId ?? "unavailable") : undefined,
        }).catch(() => null)
      : null,
  ]);
  const maintenance = maintenanceResponse?.ok
    ? maintenanceSummarySchema.safeParse(await maintenanceResponse.json().catch(() => null))
    : null;

  let machines: SummaryMachine[] | null = null;
  if (machineResponse?.ok && branchResponse?.ok)
    machines = toSummaryMachines(
      await machineResponse.json().catch(() => null),
      await branchResponse.json().catch(() => null),
    );

  // 403 means the role has no alerts: the section is hidden, not shown as an error.
  const alertsAllowed = summaryResponse?.status !== 403;
  let alertSummary: NotificationSummary | null = null;
  let pinned: Notification[] | null = null;
  if (summaryResponse?.ok && pinnedResponse?.ok) {
    const parsedSummary = notificationSummarySchema.safeParse(await summaryResponse.json());
    const parsedPinned = notificationPageSchema.safeParse(await pinnedResponse.json());
    if (parsedSummary.success && parsedPinned.success) {
      alertSummary = parsedSummary.data;
      pinned = [...parsedPinned.data.items];
    }
  }

  return (
    <SummaryScreen
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      machines={machines}
      maintenanceTasks={tasks}
      maintenanceDisabled={demoStateOf(session)?.maintenance === "disabled"}
      tasksHref={technician ? "/maintenance/work-orders?view=assigned" : "/maintenance?view=list"}
      maintenanceAllowed={maintenanceAllowed && maintenanceResponse?.status !== 403}
      maintenanceUpcoming={maintenance?.success ? maintenance.data.upcoming : null}
      alertsAllowed={alertsAllowed}
      initialAlertSummary={alertSummary}
      initialPinned={pinned}
    />
  );
}
