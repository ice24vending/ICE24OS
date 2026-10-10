import { randomUUID } from "node:crypto";
import { Catch, HttpException, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common";
import {
  ContractValidationError,
  apiErrorSchema,
  type ApiError,
  type ErrorCode,
} from "@ice24/contracts";
import type { SecurityRequest } from "../../common/security/security-request.js";

const codes: Record<number, ErrorCode> = {
  400: "VALIDATION_FAILED",
  401: "AUTHENTICATION_REQUIRED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  412: "PRECONDITION_FAILED",
};

/** Normalized API errors (API.md §6); subclasses provide the user-facing messages. */
abstract class EquipmentErrorFilter implements ExceptionFilter {
  protected abstract readonly messages: Record<number, string>;
  catch(error: HttpException | ContractValidationError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<SecurityRequest>();
    const status = error instanceof HttpException ? error.getStatus() : 400;
    const response = http.getResponse<{
      status(code: number): { json(body: ApiError): void };
      setHeader(name: string, value: string): void;
    }>();
    response.setHeader("Cache-Control", "no-store");
    // Errors already normalized upstream (e.g. ACCOUNT_READ_ONLY) keep their code.
    const normalized =
      error instanceof HttpException ? apiErrorSchema.safeParse(error.getResponse()) : undefined;
    if (normalized?.success) {
      response.status(status).json(normalized.data);
      return;
    }
    response.status(status).json({
      error: {
        code: codes[status] ?? "INTERNAL_ERROR",
        message: this.messages[status] ?? "Servicio no disponible.",
        correlationId: request.correlationId ?? randomUUID(),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

@Catch(HttpException, ContractValidationError)
export class AccountCatalogErrorFilter extends EquipmentErrorFilter {
  protected readonly messages = {
    400: "Revisa los datos del componente, la versión o la clave de idempotencia.",
    401: "Inicia sesión nuevamente.",
    403: "Solo el propietario de la cuenta puede administrar componentes propios.",
    404: "Componente no disponible en esta cuenta.",
    409: "El componente ya existe o su estado no permite el cambio.",
    412: "El componente cambió desde que lo consultaste. Actualízalo antes de reintentar.",
  };
}

@Catch(HttpException, ContractValidationError)
export class MachineComponentsErrorFilter extends EquipmentErrorFilter {
  protected readonly messages = {
    400: "Revisa el componente, el motivo, la versión o la clave de idempotencia.",
    401: "Inicia sesión nuevamente.",
    403: "Solo el propietario o el operador de la sucursal de la máquina pueden cambiar sus componentes.",
    404: "Máquina o componente no disponible en esta cuenta.",
    409: "El componente ya está configurado, no está disponible o la máquina no admite cambios.",
    412: "La configuración cambió desde que la consultaste. Actualízala antes de reintentar.",
  };
}
