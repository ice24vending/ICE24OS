import { NextResponse } from "next/server";
import { apiErrorSchema, type ErrorCode } from "@ice24/contracts";
import {
  readBrowserSession,
  requireValidCsrf,
  type BrowserSession,
} from "../../server/session/session";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
export const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,128}$/u;

/** Safe Spanish messages per API.md error code; upstream text is never echoed. */
const MESSAGES: Partial<Record<ErrorCode, string>> = {
  FORBIDDEN: "No tienes permiso para consultar o atender avisos en este contexto.",
  NOT_FOUND: "El aviso ya no está disponible en este contexto.",
  STATE_TRANSITION_INVALID: "El aviso cambió de estado. Actualiza la vista.",
  RELATED_CONDITION_NOT_RESOLVED:
    "Todavía no se puede resolver: la causa de la alerta sigue abierta. Atiende primero la condición vinculada.",
  IDEMPOTENCY_CONFLICT: "La solicitud cambió. Actualiza la vista e intenta de nuevo.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
  VALIDATION_FAILED: "Revisa el filtro o el recurso vinculado.",
};

export const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });

export async function upstreamFailure(response: Response) {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  const code = parsed.success ? parsed.data.error.code : undefined;
  return failure(
    (code && MESSAGES[code]) ?? "No fue posible completar la operación con el aviso.",
    response.status,
  );
}

/** Session, workspace-context and (for mutations) CSRF and idempotency-key checks. */
export async function guard(
  request: Request,
  form?: FormData,
): Promise<{ session: BrowserSession } | { error: NextResponse }> {
  const session = await readBrowserSession();
  if (!session?.contextId)
    return { error: failure("Tu sesión expiró. Inicia sesión nuevamente.", 401) };
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return { error: failure("El contexto cambió en otra pestaña. Recarga esta página.", 409) };
  if (form) {
    try {
      requireValidCsrf(request, session, form);
    } catch {
      return { error: failure("Solicitud no autorizada. Recarga esta página.", 403) };
    }
    const key = form.get("key");
    if (typeof key !== "string" || !IDEMPOTENCY_KEY.test(key))
      return { error: failure("Solicitud inválida.", 400) };
  }
  return { session };
}

export const noStore = { "cache-control": "no-store" } as const;
