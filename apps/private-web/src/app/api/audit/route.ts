import { NextResponse } from "next/server";
import { auditPageSchema, auditQuerySchema } from "@ice24/contracts";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, guard, noStore, upstreamFailure } from "../../../server/bff/responses";

const MESSAGES = {
  FORBIDDEN: "No tienes permiso o falta verificar MFA para consultar esta auditoría.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
  VALIDATION_FAILED: "Revisa las fechas, los identificadores y los filtros.",
} as const;

/** Read-only audit BFF: account scope or, with permission, the global ICE24 scope. */
export async function GET(request: Request) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  try {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "account";
    if (!["account", "global"].includes(scope)) return failure("Ámbito inválido.", 400);
    params.delete("scope");
    const query = auditQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success)
      return failure("Revisa las fechas, los identificadores y los filtros.", 400);
    const encoded = new URLSearchParams(
      Object.entries(query.data).map(([key, value]) => [key, String(value)]),
    );
    const response = await callPrivateApi(
      `${scope === "global" ? "admin/" : ""}audit-events?${encoded}`,
      checked.session,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok)
      return upstreamFailure(
        response,
        MESSAGES,
        "No fue posible consultar la auditoría. Revisa los filtros e intenta nuevamente.",
      );
    return NextResponse.json(auditPageSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure("La auditoría no está disponible. Intenta nuevamente.", 503);
  }
}
