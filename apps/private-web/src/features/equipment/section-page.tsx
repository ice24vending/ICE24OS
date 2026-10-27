import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination } from "../../server/account/shell";
import { DestinationDenied } from "../navigation/destination-denied";
import { EquipmentWorkspace, type WorkspaceSection } from "./workspace";
import "./equipment.css";

/** Server body shared by the equipment destinations (F6-D03): one sidebar entry per section. */
export async function EquipmentSectionPage({ section }: { section: WorkspaceSection }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination(section);
  if (denied) return <DestinationDenied denied={denied} />;
  return (
    <EquipmentWorkspace
      csrfToken={session.csrfToken}
      contextId={session.contextId}
      section={section}
    />
  );
}
