import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "./loading";
import { maintenanceQuerySchema, maintenancePageSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { guardDestination, loadAccountShell } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
import { ScheduledScreen } from "../../../features/maintenance/scheduled-screen";
import "../../../features/maintenance/maintenance.css";

// Resolve the request clock on the server and pass a stable value to the client calendar.
function requestToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(
    new Date(
      process.env.ICE24_DEMO_MODE === "1" ? (process.env.ICE24_DEMO_NOW ?? Date.now()) : Date.now(),
    ),
  );
}

export default function MaintenancePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <MaintenanceContent {...props} />
    </Suspense>
  );
}
async function MaintenanceContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  const denied = await guardDestination("maintenance");
  if (denied) return <DestinationDenied denied={denied} />;
  const params = await searchParams;
  const values = Object.fromEntries(
    Object.entries(params).filter(([key, value]) => key !== "view" && value !== ""),
  );
  if (session.focus?.branchId) values.branchId = session.focus.branchId;
  if (session.focus?.machineId) values.machineId = session.focus.machineId;
  const parsed = maintenanceQuerySchema.safeParse(values);
  const filters = parsed.success ? parsed.data : { limit: 50 };
  const shell = await loadAccountShell(session);
  const query = new URLSearchParams(
    Object.entries(filters).map(([key, value]) => [key, String(value)]),
  );
  const response = parsed.success
    ? await callPrivateApi(`maintenance/activities?${query}`, session, {
        signal: AbortSignal.timeout(10000),
      }).catch(() => null)
    : null;
  const page = response?.ok
    ? maintenancePageSchema.safeParse(await response.json().catch(() => null))
    : null;
  return (
    <ScheduledScreen
      today={requestToday()}
      items={page?.success ? page.data.items : []}
      nextCursor={page?.success ? page.data.nextCursor : null}
      filters={filters}
      calendar={params.view !== "list"}
      canAssign={shell.capabilities?.permissions.includes("maintenance.orders-assign") ?? false}
      canReadMachines={shell.destinations.some((destination) => destination.key === "machines")}
      failure={response?.status === 403 ? "forbidden" : page?.success ? undefined : "error"}
      readOnly={shell.mode === "READ_ONLY"}
      machineOptions={
        shell.selector.options && shell.selector.options !== "forbidden"
          ? shell.selector.options.machines.map((m) => ({
              value: m.id,
              label: `${m.code} · ${m.name}`,
            }))
          : []
      }
      branchOptions={
        shell.selector.options && shell.selector.options !== "forbidden"
          ? shell.selector.options.branches.map((b) => ({ value: b.id, label: b.name }))
          : []
      }
    />
  );
}
