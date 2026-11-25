import { redirect } from "next/navigation";
import { loadAccountShell } from "../../server/account/shell";
import { readBrowserSession } from "../../server/session/session";
import { demoStateOf } from "../../server/demo/session";
import { TicketsListScreen } from "./list-screen";
import { TicketDetailScreen } from "./detail-screen";
import "./tickets.css";

export async function TicketsWorkspacePage({ id }: { id?: string }) {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  const shell = await loadAccountShell(session);
  const access = {
    contextId: session.contextId,
    csrfToken: session.csrfToken,
    permissions: shell.capabilities?.permissions ?? [],
    demoOffline: demoStateOf(session)?.network === "offline",
  };
  return id ? (
    <TicketDetailScreen key={`${session.contextId}:${id}`} {...access} id={id} />
  ) : (
    <TicketsListScreen key={session.contextId} {...access} />
  );
}
