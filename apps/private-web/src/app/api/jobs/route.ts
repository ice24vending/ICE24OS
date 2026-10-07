import { NextResponse } from "next/server";
import { jobPageSchema, jobQuerySchema, queueOverviewSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, guard, noStore } from "../../../server/bff/responses";
import { jobsFailure } from "../../../features/jobs/messages";

/** Read-only BFF: list (default) or `view=overview`. Only validated filters are forwarded. */
export async function GET(request: Request) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  try {
    const params = new URL(request.url).searchParams;
    const view = params.get("view") ?? "list";
    params.delete("view");
    if (view === "overview") {
      if ([...params.keys()].length > 0) return failure("Consulta inválida.", 400);
      const response = await callPrivateApi("admin/job-queues", checked.session, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return jobsFailure(response);
      return NextResponse.json(queueOverviewSchema.parse(await response.json()), {
        headers: noStore,
      });
    }
    if (view !== "list") return failure("Consulta inválida.", 400);
    const query = jobQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success) return failure("Revisa los filtros del centro de trabajos.", 400);
    const encoded = new URLSearchParams(
      Object.entries(query.data).map(([key, value]) => [key, String(value)]),
    );
    const response = await callPrivateApi(`admin/jobs?${encoded}`, checked.session, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return jobsFailure(response);
    return NextResponse.json(jobPageSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure("El centro de trabajos no está disponible. Intenta nuevamente.", 503);
  }
}
