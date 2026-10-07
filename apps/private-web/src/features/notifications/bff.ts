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
  FORBIDDEN: "No tienes permiso para consultar o atender avisos en este contexto.",
  NOT_FOUND: "El aviso ya no está disponible en este contexto.",
  STATE_TRANSITION_INVALID: "El aviso cambió de estado. Actualiza la vista.",
  RELATED_CONDITION_NOT_RESOLVED:
    "Todavía no se puede resolver: la causa de la alerta sigue abierta. Atiende primero la condición vinculada.",
  IDEMPOTENCY_CONFLICT: "La solicitud cambió. Actualiza la vista e intenta de nuevo.",
  PRECONDITION_FAILED:
    "El aviso cambió desde que lo consultaste (otra pestaña o persona). Actualizamos la vista; revisa su estado antes de repetir la acción.",
  AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
  VALIDATION_FAILED: "Revisa el filtro o el recurso vinculado.",
};

export const upstreamFailure = (response: Response) =>
  render(response, MESSAGES, "No fue posible completar la operación con el aviso.");
