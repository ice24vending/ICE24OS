import { NextResponse } from "next/server";
import { integrationLogPageSchema, integrationLogQuerySchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, guard, noStore, upstreamFailure } from "../../../server/bff/responses";

const MESSAGES = {
  FORBIDDEN: "No tienes permiso o falta verificar MFA para consultar los logs de integración.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
  VALIDATION_FAILED: "La correlación no es válida.",
} as const;

/**
 * F5-14 diagnosis through the BFF: redacted integration attempts of one correlation, read-only.
 * Only the correlation, cursor and limit are forwarded; the API enforces permission and scope.
 */
export async function GET(request: Request) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const params = new URL(request.url).searchParams;
  const query = integrationLogQuerySchema.safeParse(Object.fromEntries(params));
  if (
    !query.success ||
    !query.data.correlationId ||
    [...params.keys()].some((key) => !["correlationId", "cursor", "limit"].includes(key))
  )
    return failure("Indica una correlación válida.", 400);
  const encoded = new URLSearchParams(
    Object.entries(query.data).map(([key, value]) => [key, String(value)]),
  );
  try {
    const response = await callPrivateApi(`admin/integration-logs?${encoded}`, checked.session, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      return upstreamFailure(
        response,
        MESSAGES,
        "No fue posible consultar los logs de integración. Intenta nuevamente.",
      );
    return NextResponse.json(integrationLogPageSchema.parse(await response.json()), {
      headers: noStore,
    });
  } catch {
    return failure("Los logs de integración no están disponibles. Intenta nuevamente.", 503);
  }
}
