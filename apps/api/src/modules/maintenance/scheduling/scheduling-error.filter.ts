import { randomUUID } from "node:crypto";
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import { ContractValidationError, apiErrorSchema, type ErrorCode } from "@ice24/contracts";
import type { SecurityRequest } from "../../../common/security/security-request.js";
@Catch(HttpException, ContractValidationError)
export class MaintenanceErrorFilter implements ExceptionFilter {
  catch(error: HttpException | ContractValidationError, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const response = http.getResponse<{
      status(code: number): { json(body: unknown): void };
      setHeader(key: string, value: string): void;
    }>();
    const status = error instanceof HttpException ? error.getStatus() : 400;
    const existing =
      error instanceof HttpException ? apiErrorSchema.safeParse(error.getResponse()) : null;
    const codes: Record<number, ErrorCode> = {
      400: "VALIDATION_FAILED",
      401: "AUTHENTICATION_REQUIRED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
    };
    response.setHeader("Cache-Control", "no-store");
    response.status(status).json(
      existing?.success
        ? existing.data
        : {
            error: {
              code: codes[status] ?? "INTERNAL_ERROR",
              message:
                status === 403
                  ? "Sin permiso para consultar mantenimiento en este contexto."
                  : "No fue posible consultar mantenimiento. Revisa los filtros e intenta nuevamente.",
              correlationId: request.correlationId ?? randomUUID(),
              timestamp: new Date().toISOString(),
            },
          },
    );
  }
}
