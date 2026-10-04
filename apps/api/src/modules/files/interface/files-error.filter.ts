import { randomUUID } from "node:crypto";
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import {
  ContractValidationError,
  apiErrorSchema,
  type ApiError,
  type ErrorCode,
} from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";
import { FileApiError } from "../application/files.service.js";

const MESSAGES: Partial<Record<ErrorCode, string>> = {
  VALIDATION_FAILED: "Revisa los datos del archivo y la clave de idempotencia.",
  AUTHENTICATION_REQUIRED: "Inicia sesión nuevamente.",
  FORBIDDEN: "No tienes permiso para gestionar archivos en este contexto.",
  NOT_FOUND: "Archivo no disponible en este contexto.",
  IDEMPOTENCY_CONFLICT: "La clave de idempotencia ya se usó con otra solicitud.",
  STATE_TRANSITION_INVALID: "La carga ya no está pendiente o la sesión expiró.",
  FILE_UPLOAD_MISMATCH: "El archivo subido no coincide con lo autorizado o no se encontró.",
  FILE_NOT_AVAILABLE: "El archivo no está disponible, expiró o dejó de estar autorizado.",
  PAYLOAD_TOO_LARGE: "El archivo supera el tamaño permitido para este propósito.",
  UNSUPPORTED_MEDIA_TYPE: "El tipo de archivo no está permitido para este propósito.",
  DEPENDENCY_UNAVAILABLE: "El almacenamiento privado no está disponible. Intenta nuevamente.",
};
const BY_STATUS: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "AUTHENTICATION_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
};

@Catch(HttpException, ContractValidationError)
export class FilesErrorFilter implements ExceptionFilter {
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
      error instanceof FileApiError ? error.code : (BY_STATUS[status] ?? "INTERNAL_ERROR");
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
