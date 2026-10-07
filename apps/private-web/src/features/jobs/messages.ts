import type { ErrorCode } from "@ice24/contracts";
import { upstreamCode } from "../../server/bff/responses";
import { failure } from "../../server/bff/responses";

/** Safe, user-facing messages for upstream job-center responses (no upstream text is echoed). */
export const upstreamMessage = (status: number, code?: ErrorCode): string =>
  code === "ACCOUNT_READ_ONLY"
    ? "La cuenta está en modo lectura: el reintento no está disponible."
    : status === 403
      ? "No tienes permiso o falta verificar MFA para el centro de trabajos."
      : status === 401
        ? "Tu sesión expiró. Inicia sesión nuevamente."
        : status === 404
          ? "El trabajo ya no está disponible."
          : status === 412
            ? "El trabajo cambió desde que abriste el detalle (otro reintento o el propio worker). Actualizamos el detalle; revisa su estado antes de reintentar."
            : status === 409
              ? "El trabajo ya no está en un estado que permita reintentarlo. Actualiza la vista."
              : "No fue posible consultar el centro de trabajos. Intenta nuevamente.";

/** Upstream failure with its API.md code preserved for the screen state. */
export async function jobsFailure(response: Response) {
  const code = await upstreamCode(response);
  return failure(upstreamMessage(response.status, code), response.status, code);
}
