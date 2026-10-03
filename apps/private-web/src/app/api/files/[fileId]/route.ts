import { NextResponse } from "next/server";
import { fileObjectSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { UUID, failure, guard, noStore, upstreamFailure } from "../../../../features/files/bff";

/** FIL-003 through the BFF: metadata only, never storage locations. */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const { fileId } = await params;
  if (!UUID.test(fileId)) return failure("Archivo inválido.", 400);
  try {
    const response = await callPrivateApi(`files/${fileId}`, checked.session, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(fileObjectSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure("No fue posible consultar el archivo. Intenta nuevamente.", 503);
  }
}
