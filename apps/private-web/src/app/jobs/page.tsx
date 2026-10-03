import { redirect } from "next/navigation";
import {
  jobPageSchema,
  queueOverviewSchema,
  type JobPage,
  type QueueOverview,
} from "@ice24/contracts";
import { readBrowserSession } from "../../server/session/session";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { JobCenter } from "../../features/jobs/center";
import "../../features/jobs/jobs.css";

export const dynamic = "force-dynamic";
export default async function JobCenterPage() {
  const session = await readBrowserSession();
  if (!session) redirect("/?error=expired");
  if (!session.contextId) redirect("/access/context");
  let initialPage: JobPage | null = null,
    initialOverview: QueueOverview | null = null,
    message = "";
  try {
    const [list, overview] = await Promise.all([
      callPrivateApi("admin/jobs?limit=25", session, { signal: AbortSignal.timeout(10000) }),
      callPrivateApi("admin/job-queues", session, { signal: AbortSignal.timeout(10000) }),
    ]);
    if (list.ok) initialPage = jobPageSchema.parse(await list.json());
    else
      message =
        list.status === 403
          ? "No tienes permiso o falta verificar MFA para el centro de trabajos."
          : "No fue posible cargar los trabajos. Intenta nuevamente.";
    if (overview.ok) initialOverview = queueOverviewSchema.parse(await overview.json());
  } catch {
    message = "El centro de trabajos no está disponible. Intenta nuevamente.";
  }
  return (
    <JobCenter
      key={session.contextId}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      initialPage={initialPage}
      initialOverview={initialOverview}
      initialError={message}
    />
  );
}
