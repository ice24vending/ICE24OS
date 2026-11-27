import { redirect } from "next/navigation";
import { subscriptionViewSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { guardDestination } from "../../server/account/shell";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { DestinationDenied } from "../navigation/destination-denied";
import { planLabel } from "./account-model";
import { EquipmentWorkspace, type WorkspaceSection } from "./workspace";
import "./equipment.css";
import "../machines/machines.css";

/** «Mi cuenta» shows the plan only to roles the API lets read the subscription (UXD-08). */
async function readPlan(session: NonNullable<Awaited<ReturnType<typeof readBrowserSession>>>) {
  const response = await callPrivateApi("subscription", session, {
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const parsed = subscriptionViewSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? planLabel(parsed.data) : null;
}

/** Server body shared by the equipment destinations (F6-D03): one sidebar entry per section. */
export async function EquipmentSectionPage({ section }: { section: WorkspaceSection }) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination(section);
  if (denied) return <DestinationDenied denied={denied} />;
  return (
    <EquipmentWorkspace
      key={`${section}:${session.contextId}`}
      csrfToken={session.csrfToken}
      contextId={session.contextId}
      section={section}
      plan={section === "account" ? await readPlan(session) : null}
    />
  );
}
