import { redirect } from "next/navigation";
import { notificationSchema, type Notification } from "@ice24/contracts";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { guardDestination } from "../../../../server/account/shell";
import { UUID, upstreamCorrelation } from "../../../../server/bff/responses";
import { DestinationDenied } from "../../../../features/navigation/destination-denied";
import { NotificationDetailScreen } from "../../../../features/notifications/detail-screen";
import { filterHref, parseFilter } from "../../../../features/notifications/filters";
import type { FailureKind } from "../../../../components/system-state/failure";
import "../../../../features/notifications/notifications.css";

// Fixed while loading (a title must exist before the data arrives); the screen then shows
// «<título del aviso> · ICE24 OS».
export const metadata = { title: "Aviso" };
export const dynamic = "force-dynamic";

type Loaded =
  | { notification: Notification; failure: null }
  | {
      notification: null;
      failure: { kind: FailureKind; message: string; correlationId?: string | undefined };
    };
const missing: Loaded = {
  notification: null,
  failure: {
    kind: "not_found",
    message: "Este aviso ya no está disponible o no tienes acceso a él en esta cuenta.",
  },
};

/**
 * NOT-002 read. It never marks the alert read: rendering
 * (or a prefetch) has no side effect; the detail screen records the read after mounting.
 */
async function load(id: string): Promise<Loaded> {
  const session = await readBrowserSession();
  if (!session?.contextId || !UUID.test(id)) return missing;
  try {
    const response = await callPrivateApi(`notifications/${id}`, session, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok)
      return { notification: notificationSchema.parse(await response.json()), failure: null };
    if (response.status === 404) return missing;
    if (response.status === 403)
      return {
        notification: null,
        failure: { kind: "forbidden", message: "No tienes permiso para consultar este aviso." },
      };
    if (response.status === 401)
      return {
        notification: null,
        failure: { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." },
      };
    return {
      notification: null,
      failure: {
        kind: "error",
        message: "No fue posible cargar el aviso. Intenta nuevamente.",
        correlationId: await upstreamCorrelation(response),
      },
    };
  } catch {
    return {
      notification: null,
      failure: {
        kind: "offline",
        message: "No hay conexión con el centro de avisos. Revisa tu red e intenta nuevamente.",
      },
    };
  }
}

export default async function NotificationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ notificationId: string }>;
  searchParams: Promise<{ filtro?: string | string[] }>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const denied = await guardDestination("notifications");
  if (denied) return <DestinationDenied denied={denied} />;
  const { notificationId } = await params;
  const { notification, failure } = await load(notificationId);
  return (
    <NotificationDetailScreen
      key={`${session.contextId}:${notificationId}`}
      id={notificationId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      initial={notification}
      failure={failure}
      backHref={filterHref(parseFilter((await searchParams).filtro))}
    />
  );
}
