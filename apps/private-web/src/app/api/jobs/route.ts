import { NextResponse } from "next/server";
import { jobPageSchema, jobQuerySchema, queueOverviewSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { upstreamMessage } from "../../../features/jobs/messages";

const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });
/** Read-only BFF: list (default) or `view=overview`. Only validated filters are forwarded. */
export async function GET(request: Request) {
  const session = await readBrowserSession();
  if (!session?.contextId) return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401);
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return failure("El contexto cambió en otra pestaña. Recarga esta página.", 409);
  try {
    const params = new URL(request.url).searchParams;
    const view = params.get("view") ?? "list";
    params.delete("view");
    if (view === "overview") {
      if ([...params.keys()].length > 0) return failure("Consulta inválida.", 400);
      const response = await callPrivateApi("admin/job-queues", session, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return failure(upstreamMessage(response.status), response.status);
      return NextResponse.json(queueOverviewSchema.parse(await response.json()), {
        headers: { "cache-control": "no-store" },
      });
    }
    if (view !== "list") return failure("Consulta inválida.", 400);
    const query = jobQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success) return failure("Revisa los filtros del centro de trabajos.", 400);
    const encoded = new URLSearchParams(
      Object.entries(query.data).map(([key, value]) => [key, String(value)]),
    );
    const response = await callPrivateApi(`admin/jobs?${encoded}`, session, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return failure(upstreamMessage(response.status), response.status);
    return NextResponse.json(jobPageSchema.parse(await response.json()), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return failure("El centro de trabajos no está disponible. Intenta nuevamente.", 503);
  }
}
