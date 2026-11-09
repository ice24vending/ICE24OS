import { redirect } from "next/navigation";
import { accessContextSchema, userProfileSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { authorizeWorkOrderBff } from "../../../../features/work-orders/work-orders-authorization";
import { SynchronizationCenter } from "../../../../features/sync/synchronization-center";
export default async function Page() {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  if (await authorizeWorkOrderBff(session, "read"))
    return (
      <main>
        <h1>Sincronización no disponible</h1>
        <p>Revisa tu contexto y permisos de mantenimiento.</p>
      </main>
    );
  const [context, user, denied] = await Promise.all([
    callPrivateApi("session-contexts/current", session)
      .then((r) => r.json())
      .then((v) => accessContextSchema.parse(v)),
    callPrivateApi("me", session)
      .then((r) => r.json())
      .then((v) => userProfileSchema.parse(v)),
    authorizeWorkOrderBff(session, "execute"),
  ]);
  return (
    <SynchronizationCenter
      owner={{ accountId: context.accountId, userId: user.id }}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      canExecute={!denied}
    />
  );
}
