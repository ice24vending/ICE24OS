import { redirect } from "next/navigation";
import {
  jobPageSchema,
  queueOverviewSchema,
  type JobPage,
  type QueueOverview,
} from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { JobCenter } from "../../../features/jobs/center";
import type { FailureKind } from "../../../features/account-shell/failure";
import "../../../features/jobs/jobs.css";

export const dynamic = "force-dynamic";
export default async function JobCenterPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let initialPage: JobPage | null = null,
    initialOverview: QueueOverview | null = null,
    failure: { kind: FailureKind; message: string } | null = null,
    canAudit = false,
    canIntegrationLogs = false;
  try {
    const call = (path: string) =>
      callPrivateApi(path, session, { signal: AbortSignal.timeout(10000) });
    // Diagnosis links are shown only to whoever can open them (UI/UX 23.1).
    const [list, overview, audit, logs] = await Promise.all([
      call("admin/jobs?limit=25"),
      call("admin/job-queues"),
      call("audit-events?limit=1").catch(() => null),
      call("admin/integration-logs?limit=1").catch(() => null),
    ]);
    canAudit = audit?.ok ?? false;
    canIntegrationLogs = logs?.ok ?? false;
    if (list.ok) initialPage = jobPageSchema.parse(await list.json());
    else
      failure =
        list.status === 403
          ? {
              kind: "forbidden",
              message: "No tienes permiso o falta verificar MFA para el centro de trabajos.",
            }
          : list.status === 401
            ? { kind: "session", message: "Tu sesión expiró. Inicia sesión nuevamente." }
            : { kind: "error", message: "No fue posible cargar los trabajos. Intenta nuevamente." };
    if (overview.ok) initialOverview = queueOverviewSchema.parse(await overview.json());
  } catch {
    failure = {
      kind: "error",
      message: "El centro de trabajos no está disponible. Intenta nuevamente.",
    };
  }
  return (
    <JobCenter
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      initialPage={initialPage}
      initialOverview={initialOverview}
      initialFailure={failure}
      canAudit={canAudit}
      canIntegrationLogs={canIntegrationLogs}
    />
  );
}
