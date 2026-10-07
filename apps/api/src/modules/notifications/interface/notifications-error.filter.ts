import { randomUUID } from "node:crypto";
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import {
  ContractValidationError,
  apiErrorSchema,
  type ApiError,
  type ErrorCode,
} from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { NotificationApiError } from "../application/notifications.service.js";

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: "Revisa los filtros, el recurso vinculado o la clave de idempotencia.",
  AUTHENTICATION_REQUIRED: "Inicia sesión nuevamente.",
  FORBIDDEN: "No tienes permiso para consultar o atender avisos en este contexto.",
  NOT_FOUND: "Aviso no disponible en este contexto.",
  IDEMPOTENCY_CONFLICT: "La clave de idempotencia ya se usó con otra acción.",
  STATE_TRANSITION_INVALID: "El aviso ya no está en un estado que permita esa acción.",
  INVALID_WEBHOOK_SIGNATURE: "Firma de webhook inválida o vencida.",
  CONFLICT: "El recurso ya se recibió o cambió con otro contenido.",
  DEPENDENCY_UNAVAILABLE: "El servicio de correo no está disponible; reintenta la entrega.",
  PRECONDITION_FAILED: "El aviso cambió desde que lo consultaste. Actualiza la vista.",
  RELATED_CONDITION_NOT_RESOLVED:
    "La alerta no puede resolverse mientras su causa siga abierta. Atiende primero la condición vinculada.",
};
const BY_STATUS: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "AUTHENTICATION_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  412: "PRECONDITION_FAILED",
};

@Catch(HttpException, ContractValidationError)
export class NotificationsErrorFilter implements ExceptionFilter {
  catch(error: HttpException | ContractValidationError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const response = http.getResponse<{
      status(code: number): { json(body: ApiError): void };
      setHeader(name: string, value: string): void;
    }>();
    response.setHeader("Cache-Control", "no-store");
    const status = error instanceof HttpException ? error.getStatus() : 400;
    // Guards (e.g. ACCOUNT_READ_ONLY) already render a contract error: keep it.
    const prebuilt =
      error instanceof HttpException ? apiErrorSchema.safeParse(error.getResponse()) : null;
    if (prebuilt?.success) {
      response.status(status).json(prebuilt.data);
      return;
    }
    const code: ErrorCode =
      error instanceof NotificationApiError ? error.code : (BY_STATUS[status] ?? "INTERNAL_ERROR");
    response.status(status).json({
      error: {
        code,
        message: MESSAGES[code] ?? "Servicio no disponible.",
        correlationId: request.correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
