import { redirect } from "next/navigation";
import {
  notificationPageSchema,
  notificationSummarySchema,
  type Notification,
  type NotificationSummary,
} from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { guardDestination } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
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

  const call = (path: string) =>
    callPrivateApi(path, session, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  const [machineResponse, branchResponse, summaryResponse, pinnedResponse] = await Promise.all([
    call("machines"),
    call("branches"),
    call("notifications/summary"),
    call("notifications?pinned=true&limit=3"),
  ]);

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
      alertsAllowed={alertsAllowed}
      initialAlertSummary={alertSummary}
      initialPinned={pinned}
    />
  );
}
