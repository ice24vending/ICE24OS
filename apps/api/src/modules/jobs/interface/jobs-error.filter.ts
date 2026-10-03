import { randomUUID } from "node:crypto";
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { ContractValidationError, type ApiError, type ErrorCode } from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";

@Catch(HttpException, ContractValidationError)
export class JobsErrorFilter implements ExceptionFilter {
  catch(error: HttpException | ContractValidationError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const status = error instanceof HttpException ? error.getStatus() : 400;
    const codes: Record<number, ErrorCode> = {
      400: "VALIDATION_FAILED",
      401: "AUTHENTICATION_REQUIRED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
    };
    const messages: Record<number, string> = {
      400: "Revisa los filtros, el motivo o la clave de idempotencia.",
      401: "Inicia sesión nuevamente.",
      403: "No tienes permiso o falta verificar MFA para el centro de trabajos.",
      404: "Trabajo no disponible en este contexto.",
      409: "El trabajo ya no está en un estado que permita reintentarlo.",
    };
    const response = http.getResponse<{
      status(code: number): { json(body: ApiError): void };
      setHeader(name: string, value: string): void;
    }>();
    response.setHeader("Cache-Control", "no-store");
    response.status(status).json({
      error: {
        code: codes[status] ?? "INTERNAL_ERROR",
        message: messages[status] ?? "Servicio no disponible.",
        correlationId: request.correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}
