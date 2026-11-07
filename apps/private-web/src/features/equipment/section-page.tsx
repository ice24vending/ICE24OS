import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination, loadAccountShell } from "../../server/account/shell";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { resolveMachineSelection } from "./machine-selection";
import { DestinationDenied } from "../navigation/destination-denied";
import { EquipmentWorkspace, type WorkspaceSection } from "./workspace";
import "./equipment.css";

/** Server body shared by the equipment destinations (F6-D03): one sidebar entry per section. */
export async function EquipmentSectionPage({
  section,
  machineId,
}: {
  section: WorkspaceSection;
  machineId?: string | string[] | undefined;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination(section);
  if (denied) return <DestinationDenied denied={denied} />;
  const shell =
    section === "machines" && machineId !== undefined ? await loadAccountShell(session) : null;
  const initialMachineId = await resolveMachineSelection(
    machineId,
    shell?.destinations.some((destination) => destination.key === "machines") ?? false,
    async () => {
      const response = await callPrivateApi("machines", session, {
        signal: AbortSignal.timeout(10000),
      });
      return response.ok ? response.json() : [];
    },
  );
  return (
    <EquipmentWorkspace
      key={`${section}:${session.contextId}:${initialMachineId ?? ""}`}
      initialMachineId={initialMachineId}
      csrfToken={session.csrfToken}
      contextId={session.contextId}
      section={section}
    />
  );
}
