import { NextResponse } from "next/server";
import { asyncJobSchema, jobRetryRequestSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import { UUID, failure, guard, ifMatch, noStore } from "../../../../../server/bff/responses";
import { jobsFailure } from "../../../../../features/jobs/messages";

/**
 * INT-004 through the BFF: CSRF, context check, idempotency key, reason and the expected job
 * version (If-Match, F5-15) are mandatory.
 */
export async function POST(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("Solicitud inválida.", 400);
  }
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  if (!UUID.test(jobId)) return failure("Trabajo inválido.", 400);
  const body = jobRetryRequestSchema.safeParse({ reason: form.get("reason") });
  if (!body.success)
    return failure("Escribe un motivo de al menos 10 caracteres (máximo 1000).", 400);
  const expected = ifMatch(form);
  if (!expected) return failure("Actualiza el detalle: falta la versión del trabajo.", 400);
  try {
    const response = await callPrivateApi(`admin/jobs/${jobId}/retry`, checked.session, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": String(form.get("key")),
        ...expected,
      },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return jobsFailure(response);
    return NextResponse.json(asyncJobSchema.parse(await response.json()), {
      status: 202,
      headers: noStore,
    });
  } catch {
    return failure("No fue posible reintentar el trabajo. Intenta nuevamente.", 503);
  }
}
