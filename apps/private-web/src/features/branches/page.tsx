import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination } from "../../server/account/shell";
import { DestinationDenied } from "../navigation/destination-denied";
import { BranchesScreen } from "./list-screen";
import "./branches.css";

export async function BranchesPage({ id, create = false }: { id?: string; create?: boolean }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("branches");
  if (denied) return <DestinationDenied denied={denied} />;
  return (
    <BranchesScreen
      key={`${session.contextId}:${id ?? create}`}
      id={id}
      create={create}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
    />
  );
}
