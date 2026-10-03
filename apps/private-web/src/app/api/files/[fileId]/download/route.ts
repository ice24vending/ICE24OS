import { NextResponse } from "next/server";
import { downloadSessionRequestSchema, downloadSessionSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import { UUID, failure, guard, noStore, upstreamFailure } from "../../../../../features/files/bff";

/** FIL-004 through the BFF: a temporary signed URL, issued and audited on each request. */
export async function POST(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const form = await request.formData();
    const checked = await guard(request, form);
    if ("error" in checked) return checked.error;
    const { fileId } = await params;
    if (!UUID.test(fileId)) return failure("Archivo inválido.", 400);
    const body = downloadSessionRequestSchema.safeParse({
      version: "original",
      purpose: form.get("purpose"),
    });
    if (!body.success) return failure("Indica para qué necesitas el archivo.", 400);
    const response = await callPrivateApi(`files/${fileId}/download-sessions`, checked.session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": String(form.get("key")) },
      body: JSON.stringify(body.data),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(downloadSessionSchema.parse(await response.json()), {
      status: 201,
      headers: { ...noStore, "referrer-policy": "no-referrer" },
    });
  } catch {
    return failure("No fue posible autorizar la descarga. Intenta nuevamente.", 503);
  }
}
