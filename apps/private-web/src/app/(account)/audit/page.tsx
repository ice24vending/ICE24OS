import { redirect } from "next/navigation";
import { auditPageSchema, type AuditPage } from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { AuditViewer, type InitialFailure } from "../../../features/audit/viewer";
import { toQuery, validateFilters } from "../../../features/audit/filters";
import "../../../features/audit/audit.css";

export const dynamic = "force-dynamic";
export default async function AuditPageView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  // Deep links (e.g. a job's correlation) open the viewer already filtered.
  const raw = Object.fromEntries(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  const { filters, errors } = validateFilters(raw);
  let initial: AuditPage | null = null,
    canGlobal = false,
    failure: InitialFailure | null = null;
  try {
    const { scope, ...rest } = filters;
    const query = new URLSearchParams(toQuery(rest));
    query.set("limit", "25");
    const [account, global] = await Promise.all([
      callPrivateApi(`${scope === "global" ? "admin/" : ""}audit-events?${query}`, session, {
        signal: AbortSignal.timeout(10000),
      }),
      callPrivateApi("admin/audit-events?limit=1", session, { signal: AbortSignal.timeout(10000) }),
    ]);
    canGlobal = global.ok;
    if (account.ok) initial = auditPageSchema.parse(await account.json());
    else
      failure =
        account.status === 403
          ? {
              kind: "forbidden",
              message:
                "No tienes permiso para consultar la auditoría de esta cuenta. Solicítalo al propietario o a ICE24.",
            }
          : account.status === 401
            ? { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." }
            : { kind: "error", message: "No fue posible cargar la auditoría. Intenta nuevamente." };
  } catch {
    failure = { kind: "error", message: "La auditoría no está disponible. Intenta nuevamente." };
  }
  return (
    <AuditViewer
      key={session.contextId}
      contextId={session.contextId}
      initial={initial}
      initialFailure={failure}
      initialFilters={filters}
      initialErrors={errors}
      canGlobal={canGlobal}
    />
  );
}
