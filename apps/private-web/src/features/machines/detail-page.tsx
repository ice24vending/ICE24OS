import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination, loadAccountShell } from "../../server/account/shell";
import { MachineDetailScreen } from "./detail-screen";

export async function MachineDetailPage({ id }: { id: string }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const [denied, shell] = await Promise.all([
    guardDestination("machines"),
    loadAccountShell(session),
  ]);
  return (
    <MachineDetailScreen
      key={`${session.contextId}:${id}`}
      id={id}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      permissions={shell.capabilities?.permissions ?? []}
      denied={denied}
    />
  );
}
