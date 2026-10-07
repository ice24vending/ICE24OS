import { NextResponse } from "next/server";
import { jobDetailSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { UUID, failure, guard, noStore } from "../../../../server/bff/responses";
import { jobsFailure } from "../../../../features/jobs/messages";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const { jobId } = await params;
  if (!UUID.test(jobId)) return failure("Trabajo inválido.", 400);
  try {
    const response = await callPrivateApi(`admin/jobs/${jobId}`, checked.session, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return jobsFailure(response);
    return NextResponse.json(jobDetailSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure("El centro de trabajos no está disponible. Intenta nuevamente.", 503);
  }
}
