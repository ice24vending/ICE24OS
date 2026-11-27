import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination, loadAccountShell } from "../../server/account/shell";
import { DestinationDenied } from "../navigation/destination-denied";
import { AdministrationScreen } from "./screen";
import type { AdminSection } from "./model";
import "../equipment/equipment.css";
import "./ice24.css";
export async function AdministrationPage({
  section,
  id,
  returnTo,
}: {
  section: AdminSection;
  id?: string | undefined;
  returnTo?: string | undefined;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("ice24");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  return (
    <AdministrationScreen
      key={`${session.contextId}:${section}:${id ?? "list"}`}
      section={section}
      id={id}
      returnTo={returnTo}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      permissions={shell.capabilities?.permissions ?? []}
    />
  );
}
