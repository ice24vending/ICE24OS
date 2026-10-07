import { redirect } from "next/navigation";
import {
  notificationPageSchema,
  notificationSummarySchema,
  type NotificationPage,
  type NotificationSummary,
} from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { NotificationCenter } from "../../../features/notifications/center";
import type { FailureKind } from "../../../features/account-shell/failure";
import "../../../features/notifications/notifications.css";

export const dynamic = "force-dynamic";
export default async function NotificationCenterPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let summary: NotificationSummary | null = null,
    pinned: NotificationPage | null = null,
    page: NotificationPage | null = null,
    failure: { kind: FailureKind; message: string } | null = null;
  try {
    const call = (path: string) =>
      callPrivateApi(path, session, { signal: AbortSignal.timeout(10000) });
    const [summaryResponse, pinnedResponse, listResponse] = await Promise.all([
      call("notifications/summary"),
      call("notifications?pinned=true&limit=20"),
      call("notifications?limit=20"),
    ]);
    if (summaryResponse.ok && pinnedResponse.ok && listResponse.ok) {
      summary = notificationSummarySchema.parse(await summaryResponse.json());
      pinned = notificationPageSchema.parse(await pinnedResponse.json());
      page = notificationPageSchema.parse(await listResponse.json());
    } else
      failure =
        listResponse.status === 403
          ? {
              kind: "forbidden",
              message: "No tienes permiso para consultar avisos en este contexto.",
            }
          : listResponse.status === 401
            ? { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." }
            : { kind: "error", message: "No fue posible cargar las alertas. Intenta nuevamente." };
  } catch {
    failure = {
      kind: "error",
      message: "El centro de alertas no está disponible. Intenta nuevamente.",
    };
  }
  return (
    <NotificationCenter
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      initialSummary={summary}
      initialPinned={pinned}
      initialPage={page}
      initialFailure={failure}
    />
  );
}
