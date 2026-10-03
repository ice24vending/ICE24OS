import { NextResponse } from "next/server";
import { completeUploadRequestSchema, publicJobSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import { UUID, failure, guard, noStore, upstreamFailure } from "../../../../../features/files/bff";

/** FIL-002 through the BFF: confirms the direct upload; the file stays in quarantine. */
export async function POST(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const form = await request.formData();
    const checked = await guard(request, form);
    if ("error" in checked) return checked.error;
    const { fileId } = await params;
    if (!UUID.test(fileId)) return failure("Archivo inválido.", 400);
    const sha256 = form.get("sha256");
    const body = completeUploadRequestSchema.safeParse({
      uploadToken: form.get("uploadToken"),
      ...(typeof sha256 === "string" && sha256 !== "" ? { sha256 } : {}),
    });
    if (!body.success) return failure("Solicitud inválida.", 400);
    const response = await callPrivateApi(`files/${fileId}/complete-upload`, checked.session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": String(form.get("key")) },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(publicJobSchema.parse(await response.json()), {
      status: 202,
      headers: noStore,
    });
  } catch {
    return failure("No fue posible confirmar la carga. Intenta nuevamente.", 503);
  }
}
