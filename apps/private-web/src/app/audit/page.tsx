import { redirect } from "next/navigation";
import { auditPageSchema, type AuditPage } from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { AuditViewer } from "../../features/audit/viewer";
import "../../features/audit/audit.css";

export const dynamic = "force-dynamic";
export default async function AuditPageView() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let initial: AuditPage | null = null,
    canGlobal = false,
    message = "";
  try {
    const [account, global] = await Promise.all([
      callPrivateApi("audit-events?limit=25", session, { signal: AbortSignal.timeout(10000) }),
      callPrivateApi("admin/audit-events?limit=1", session, { signal: AbortSignal.timeout(10000) }),
    ]);
    canGlobal = global.ok;
    if (account.ok) initial = auditPageSchema.parse(await account.json());
    else
      message =
        account.status === 403
          ? "No tienes permiso para consultar la auditoría de esta cuenta."
          : "No fue posible cargar la auditoría. Intenta nuevamente.";
  } catch {
    message = "La auditoría no está disponible. Intenta nuevamente.";
  }
  return (
    <AuditViewer
      key={session.contextId}
      contextId={session.contextId}
      initial={initial}
      initialError={message}
      canGlobal={canGlobal}
    />
  );
}
