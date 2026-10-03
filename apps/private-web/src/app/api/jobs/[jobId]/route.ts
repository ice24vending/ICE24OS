import { NextResponse } from "next/server";
import { jobDetailSchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { upstreamMessage } from "../../../../features/jobs/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await readBrowserSession();
  if (!session?.contextId) return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401);
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return failure("El contexto cambió en otra pestaña. Recarga esta página.", 409);
  const { jobId } = await params;
  if (!UUID.test(jobId)) return failure("Trabajo inválido.", 400);
  try {
    const response = await callPrivateApi(`admin/jobs/${jobId}`, session, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return failure(upstreamMessage(response.status), response.status);
    return NextResponse.json(jobDetailSchema.parse(await response.json()), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return failure("El centro de trabajos no está disponible. Intenta nuevamente.", 503);
  }
}
