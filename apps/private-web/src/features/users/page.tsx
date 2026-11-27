import { redirect } from "next/navigation";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination } from "../../server/account/shell";
import { DestinationDenied } from "../navigation/destination-denied";
import { InviteScreen } from "./invite-screen";
import { MemberScreen } from "./member-screen";
import "./users.css";

/** Server body of /account/users/invite and /account/users/[id] (UXD-09). */
export async function UsersPage({ id }: { id?: string }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("account");
  if (denied) return <DestinationDenied denied={denied} />;
  return id ? (
    <MemberScreen
      key={`${session.contextId}:${id}`}
      id={id}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
    />
  ) : (
    <InviteScreen
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
    />
  );
}
