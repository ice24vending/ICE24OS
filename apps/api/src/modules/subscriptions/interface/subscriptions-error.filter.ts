import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { ContractValidationError, type ApiError, type ErrorCode } from "@ice24/contracts";
import { randomUUID } from "node:crypto";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { SubscriptionGatewayError } from "../application/subscription.gateway.js";

@Catch(HttpException, ContractValidationError, SubscriptionGatewayError)
export class SubscriptionsErrorFilter implements ExceptionFilter {
  catch(
    error: HttpException | ContractValidationError | SubscriptionGatewayError,
    host: ArgumentsHost,
  ): void {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const status =
      error instanceof SubscriptionGatewayError
        ? error.code === "DEPENDENCY_UNAVAILABLE"
          ? 503
          : error.code === "INVALID_WEBHOOK_SIGNATURE"
            ? 400
            : error.code === "RESOURCE_NOT_FOUND"
              ? 404
              : 409
        : error instanceof HttpException
          ? error.getStatus()
          : 400;
    const codes: Record<number, ErrorCode> = {
      400: "VALIDATION_FAILED",
      401: "AUTHENTICATION_REQUIRED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      503: "DEPENDENCY_UNAVAILABLE",
    };
    const messages: Record<number, string> = {
      400: "Revisa los datos y encabezados de la solicitud.",
      401: "Inicia sesión nuevamente.",
      403: "No tienes permiso para esta operación.",
      404: "Suscripción no disponible en este contexto.",
      409: "El recurso cambió o la transición no está permitida. Actualiza los datos.",
    };
    const body: ApiError = {
      error: {
        code:
          error instanceof SubscriptionGatewayError && error.code === "INVALID_WEBHOOK_SIGNATURE"
            ? "INVALID_WEBHOOK_SIGNATURE"
            : (codes[status] ?? "INTERNAL_ERROR"),
        message: messages[status] ?? "El servicio no está disponible.",
        correlationId: request.correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };
    const response = http.getResponse<{
      status(code: number): { json(body: ApiError): void };
      setHeader(name: string, value: string): void;
    }>();
    response.setHeader("Cache-Control", "no-store");
    response.status(status).json(body);
  }
}
