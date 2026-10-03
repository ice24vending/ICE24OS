import { NextResponse } from "next/server";
import { asyncJobSchema, jobRetryRequestSchema } from "@ice24/contracts";
import { readBrowserSession, requireValidCsrf } from "../../../../../server/session/session";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import { upstreamMessage } from "../../../../../features/jobs/messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });

/** INT-004 through the BFF: CSRF, context check, idempotency key and reason are mandatory. */
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const session = await readBrowserSession();
  if (!session?.contextId) return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401);
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return failure("El contexto cambió en otra pestaña. Recarga esta página.", 409);
  const { jobId } = await params;
  if (!UUID.test(jobId)) return failure("Trabajo inválido.", 400);
  try {
    const form = await request.formData();
    try {
      requireValidCsrf(request, session, form);
    } catch {
      return failure("Solicitud no autorizada. Recarga esta página.", 403);
    }
    const key = form.get("key");
    const body = jobRetryRequestSchema.safeParse({ reason: form.get("reason") });
    if (typeof key !== "string" || !/^[A-Za-z0-9-]{8,128}$/u.test(key))
      return failure("Solicitud inválida.", 400);
    if (!body.success)
      return failure("Escribe un motivo de al menos 10 caracteres (máximo 1000).", 400);
    const response = await callPrivateApi(`admin/jobs/${jobId}/retry`, session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return failure(upstreamMessage(response.status), response.status);
    return NextResponse.json(asyncJobSchema.parse(await response.json()), {
      status: 202,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return failure("No fue posible reintentar el trabajo. Intenta nuevamente.", 503);
  }
}
