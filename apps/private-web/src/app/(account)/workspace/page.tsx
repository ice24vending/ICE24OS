import { redirect } from "next/navigation";
import { readBrowserSession } from "../../../server/session/session";
import { EquipmentWorkspace } from "../../../features/equipment/workspace";
import "../../../features/equipment/equipment.css";
import { guardDestination } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";

export const dynamic = "force-dynamic";
export default async function WorkspacePage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("workspace");
  if (denied) return <DestinationDenied denied={denied} />;
  return <EquipmentWorkspace csrfToken={session.csrfToken} contextId={session.contextId} />;
}
