import {
  createCorrelationId,
  observeHttpServerRequest,
  type TraceCarrier,
} from "@ice24/observability";
import { Injectable, type NestMiddleware } from "@nestjs/common";

const correlationIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface RequestLike {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly method?: string;
  correlationId?: string;
}

interface ResponseLike {
  readonly statusCode?: number;
  once(event: "finish", listener: () => void): void;
  setHeader(name: string, value: string): void;
}

export const resolveCorrelationId = (header: string | readonly string[] | undefined): string => {
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === "string" && correlationIdPattern.test(value)
    ? value
    : createCorrelationId();
};

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  public use(request: RequestLike, response: ResponseLike, next: () => void): void {
    const correlationId = resolveCorrelationId(request.headers["x-correlation-id"]);
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    next();
  }
}

@Injectable()
export class TelemetryMiddleware implements NestMiddleware {
  public use(request: RequestLike, response: ResponseLike, next: () => void): void {
    const carrier: TraceCarrier = {};
    for (const header of ["traceparent", "tracestate", "baggage"] as const) {
      const value = request.headers[header];
      if (typeof value === "string") carrier[header] = value;
    }

    observeHttpServerRequest(
      { carrier, method: request.method ?? "UNKNOWN", serviceName: "api" },
      (complete) => response.once("finish", () => complete(response.statusCode ?? 500)),
      next,
    );
  }
}
