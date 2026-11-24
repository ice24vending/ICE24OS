import { redirect } from "next/navigation";
import { readBrowserSession } from "../../../server/session/session";
import { guardDestination } from "../../../server/account/shell";
import { DestinationDenied } from "../../../features/navigation/destination-denied";
import { ProfileScreen } from "../../../features/profile/profile-screen";
import { loadProfile } from "../../../features/profile/bff";
import "../../../features/profile/profile.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("profile");
  if (denied) return <DestinationDenied denied={denied} />;
  return (
    <ProfileScreen
      initial={await loadProfile(session)}
      csrfToken={session.csrfToken}
      contextId={session.contextId}
    />
  );
}
