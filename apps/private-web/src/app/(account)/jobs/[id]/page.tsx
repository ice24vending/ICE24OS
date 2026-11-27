import { redirect } from "next/navigation";
import { jobDetailSchema, type JobDetail } from "@ice24/contracts";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { guardDestination, loadAccountShell } from "../../../../server/account/shell";
import { DestinationDenied } from "../../../../features/navigation/destination-denied";
import { JobDetailScreen } from "../../../../features/jobs/detail";
import { jobsReturn } from "../../../../features/jobs/model";
import { failureKind, type Failure } from "../../../../components/system-state/failure";
import { upstreamCorrelation } from "../../../../server/bff/responses";
import { demoStateOf } from "../../../../server/demo/session";
import "../../../../features/jobs/jobs.css";

export const metadata = { title: "Detalle del trabajo" };
export const dynamic = "force-dynamic";
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
  const denied = await guardDestination("jobs");
  if (denied) return <DestinationDenied denied={denied} />;
  const shell = await loadAccountShell(session);
  const permissions = shell.capabilities?.permissions ?? [];
  const { id } = await params;
  const query = await searchParams;
  let detail: JobDetail | null = null;
  let failure: Failure | null = null;
  try {
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/iu.test(id)) {
      const response = await callPrivateApi(`admin/jobs/${id}`, session, {
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) detail = jobDetailSchema.parse(await response.json());
      else
        failure = {
          kind: failureKind(response.status),
          status: response.status,
          message:
            response.status === 404
              ? "El trabajo ya no está disponible."
              : "No fue posible cargar el trabajo.",
          correlationId: await upstreamCorrelation(response),
        };
    }
  } catch {
    failure = {
      kind: demoStateOf(session)?.network === "offline" ? "offline" : "error",
      status: 503,
      message: "No fue posible consultar el trabajo. Revisa tu conexión e intenta nuevamente.",
    };
  }
  return (
    <JobDetailScreen
      key={`${session.contextId}:${id}`}
      contextId={session.contextId}
      csrfToken={session.csrfToken}
      initialDetail={detail}
      failure={failure}
      returnTo={jobsReturn(typeof query.desde === "string" ? query.desde : null)}
      canRetry={permissions.includes("jobs.retry")}
      canAudit={permissions.includes("audit.read")}
      canIntegrationLogs={permissions.includes("integration-logs.read")}
    />
  );
}
