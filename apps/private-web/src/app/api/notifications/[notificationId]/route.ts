import { NextResponse } from "next/server";
import { notificationSchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import {
  UUID,
  failure,
  guard,
  noStore,
  upstreamFailure,
} from "../../../../features/notifications/bff";

/** NOT-002 through the BFF: one own alert, read-only (it never marks the alert read). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const { notificationId } = await params;
  if (!UUID.test(notificationId)) return failure("Solicitud inválida.", 400);
  try {
    const response = await callPrivateApi(`notifications/${notificationId}`, checked.session, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(notificationSchema.parse(await response.json()), {
      headers: noStore,
    });
  } catch {
    return failure("El centro de alertas no está disponible. Intenta nuevamente.", 503);
  }
}
