import { NextResponse } from "next/server";
import { auditPageSchema, auditQuerySchema } from "@ice24/contracts";
import { readBrowserSession } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";

const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });
export async function GET(request: Request) {
  const session = await readBrowserSession();
  if (!session?.contextId) return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401);
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return failure("El contexto cambió en otra pestaña. Recarga esta página.", 409);
  try {
    const params = new URL(request.url).searchParams;
    const scope = params.get("scope") ?? "account";
    if (!["account", "global"].includes(scope)) return failure("Ámbito inválido.", 400);
    params.delete("scope");
    const query = auditQuerySchema.safeParse(Object.fromEntries(params));
    if (!query.success) return failure("Revisa las fechas, el actor y los filtros.", 400);
    const encoded = new URLSearchParams(
      Object.entries(query.data).map(([key, value]) => [key, String(value)]),
    );
    const response = await callPrivateApi(
      `${scope === "global" ? "admin/" : ""}audit-events?${encoded}`,
      session,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok)
      return failure(
        response.status === 403
          ? "No tienes permiso o falta verificar MFA para consultar esta auditoría."
          : response.status === 401
            ? "Tu sesión expiró. Inicia sesión nuevamente."
            : "No fue posible consultar la auditoría. Revisa los filtros e intenta nuevamente.",
        response.status,
      );
    return NextResponse.json(auditPageSchema.parse(await response.json()), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return failure("La auditoría no está disponible. Intenta nuevamente.", 503);
  }
}
