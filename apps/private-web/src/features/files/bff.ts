import type { ErrorCode } from "@ice24/contracts";
import { upstreamFailure as render } from "../../server/bff/responses";

export {
  UUID,
  IDEMPOTENCY_KEY,
  failure,
  guard,
  ifMatch,
  noStore,
} from "../../server/bff/responses";

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

export const upstreamFailure = (response: Response) =>
  render(response, MESSAGES, "No fue posible completar la operación con el archivo.");
