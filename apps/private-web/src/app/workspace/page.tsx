import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { EquipmentWorkspace } from "../../features/equipment/workspace";
import "../../features/equipment/equipment.css";

export const dynamic = "force-dynamic";
export default async function WorkspacePage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  return <EquipmentWorkspace csrfToken={session.csrfToken} contextId={session.contextId} />;
}
