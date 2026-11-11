import { PageHeader, ButtonLink, SystemState } from "@ice24/ui";
import { MaintenanceNavigation } from "../../../../features/maintenance/maintenance-navigation";
import "../../../../features/sync/synchronization-center.css";
import { redirect } from "next/navigation";
import { accessContextSchema, userProfileSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { authorizeWorkOrderBff } from "../../../../features/work-orders/work-orders-authorization";
import { SynchronizationCenter } from "../../../../features/sync/synchronization-center";
export default async function Page() {
  const session = await readBrowserSession();
  if (!session?.contextId) redirect("/?error=expired");
  const unavailable = await authorizeWorkOrderBff(session, "read");
  if (unavailable) return <Unavailable status={unavailable.status} />;
  const loaded = await Promise.all([
    callPrivateApi("session-contexts/current", session)
      .then((r) => r.json())
      .then((v) => accessContextSchema.parse(v)),
    callPrivateApi("me", session)
      .then((r) => r.json())
      .then((v) => userProfileSchema.parse(v)),
    authorizeWorkOrderBff(session, "execute"),
  ]).catch(() => null);
  if (!loaded) return <Unavailable status={503} />;
  const [context, user, denied] = loaded;
  return (
    <SynchronizationCenter
      owner={{ accountId: context.accountId, userId: user.id }}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      canExecute={!denied}
    />
  );
}

function Unavailable({ status }: { status: number }) {
  return (
    <main className="sync-center">
      <PageHeader title="Centro de sincronización" />
      <MaintenanceNavigation current="orders" />
      <SystemState
        kind={status === 403 ? "forbidden" : "error"}
        message={
          status === 403
            ? "No tienes permiso para consultar la sincronización en este contexto."
            : "El servicio de sincronización no respondió. Reintenta cuando se restablezca la conexión."
        }
      />
      <ButtonLink href="/offline-work.html?view=sync" variant="secondary" icon="sync">
        Consultar cola local
      </ButtonLink>
    </main>
  );
}
