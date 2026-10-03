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
  FORBIDDEN: "No tienes permiso para gestionar archivos en este contexto.",
  ACCOUNT_READ_ONLY:
    "La cuenta está en modo solo lectura: puedes descargar archivos existentes, pero no subir nuevos.",
  NOT_FOUND: "El archivo o el recurso relacionado no está disponible en este contexto.",
  IDEMPOTENCY_CONFLICT: "La solicitud cambió. Vuelve a seleccionar el archivo.",
  STATE_TRANSITION_INVALID:
    "La carga ya no está pendiente o su autorización expiró. Súbelo de nuevo.",
  FILE_UPLOAD_MISMATCH:
    "El archivo recibido no coincide con lo autorizado (tamaño o tipo) o no llegó al almacenamiento.",
  FILE_NOT_AVAILABLE: "El archivo sigue en verificación antivirus; aún no se puede descargar.",
  PAYLOAD_TOO_LARGE: "El archivo supera el tamaño permitido para este propósito.",
  UNSUPPORTED_MEDIA_TYPE: "Ese tipo de archivo no está permitido para este propósito.",
  DEPENDENCY_UNAVAILABLE: "El almacenamiento privado no está disponible. Intenta más tarde.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
  VALIDATION_FAILED: "Revisa los datos del archivo.",
};

export const failure = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { "cache-control": "no-store" } });

export async function upstreamFailure(response: Response) {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
  const code = parsed.success ? parsed.data.error.code : undefined;
  return failure(
    (code && MESSAGES[code]) ?? "No fue posible completar la operación con el archivo.",
    response.status,
  );
}

/** Session, workspace-context and (for mutations) CSRF checks shared by the files BFF. */
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
