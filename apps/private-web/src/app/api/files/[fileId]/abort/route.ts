import { NextResponse } from "next/server";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import { UUID, failure, guard, noStore, upstreamFailure } from "../../../../../features/files/bff";

/** FIL-005 through the BFF: cancels a pending upload of the current user. */
export async function POST(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const form = await request.formData();
    const checked = await guard(request, form);
    if ("error" in checked) return checked.error;
    const { fileId } = await params;
    if (!UUID.test(fileId)) return failure("Archivo inválido.", 400);
    const response = await callPrivateApi(`files/${fileId}/abort`, checked.session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": String(form.get("key")) },
      body: JSON.stringify({ reason: "Cancelado por el usuario" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return upstreamFailure(response);
    return new NextResponse(null, { status: 204, headers: noStore });
  } catch {
    return failure("No fue posible cancelar la carga.", 503);
  }
}
