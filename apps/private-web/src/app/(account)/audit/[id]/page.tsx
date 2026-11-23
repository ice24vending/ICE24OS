import { redirect } from "next/navigation";
import { auditEventSchema, type AuditEvent } from "@ice24/contracts";
import { AuditDetail } from "../../../../features/audit/detail";
import { auditReturn } from "../../../../features/audit/filters";
import type { InitialFailure } from "../../../../features/audit/viewer";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { upstreamCorrelation } from "../../../../server/bff/responses";
import { demoStateOf } from "../../../../server/demo/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Detalle de auditoría" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  const { id } = await params;
  const query = await searchParams;
  const global = query.scope === "global";
  const returnTo = auditReturn(typeof query.origen === "string" ? query.origen : null);
  let event: AuditEvent | null = null;
  let failure: InitialFailure | null = null;
  try {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
      const response = await callPrivateApi(
        `${global ? "admin/" : ""}audit-events/${id}`,
        session,
        { signal: AbortSignal.timeout(10000) },
      );
      if (response.ok) event = auditEventSchema.parse(await response.json());
      else if (response.status !== 404)
        failure =
          response.status === 403
            ? { kind: "forbidden", message: "No tienes permiso para consultar esta auditoría." }
            : response.status === 401
              ? { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." }
              : {
                  kind: "error",
                  message: "No fue posible cargar el evento. Intenta nuevamente.",
                  correlationId: await upstreamCorrelation(response),
                };
    }
  } catch {
    failure =
      demoStateOf(session)?.network === "offline"
        ? { kind: "offline", message: "Necesitas conexión para consultar este evento." }
        : { kind: "error", message: "No fue posible cargar el evento. Intenta nuevamente." };
  }
  return <AuditDetail event={event} failure={failure} returnTo={returnTo} global={global} />;
}
