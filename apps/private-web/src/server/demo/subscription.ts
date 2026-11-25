import { subscriptionPaymentsSchema } from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoIds } from "./fixtures";

export function demoPaymentsResponse(request: DemoRequest): Response {
  const error = (status: number, code: string) =>
    Response.json(
      {
        error: {
          code,
          message: "No fue posible consultar los pagos",
          correlationId: demoIds.correlation(999),
          timestamp: new Date(request.now).toISOString(),
        },
      },
      { status },
    );
  if (request.persona.role !== "OW" || !request.can("subscriptions.read"))
    return error(403, "FORBIDDEN");
  if (request.state.scenario === "conflict") return error(503, "DEPENDENCY_UNAVAILABLE");
  const items =
    request.account.isDemo || request.state.scenario === "empty"
      ? []
      : [0, 1, 2, 3, 4, 5].map((index) => ({
          id: `in_demo_${request.account.key}_${index}`,
          number: `ICE24-${202610 - index}`,
          createdAt: new Date(request.now - (12 + index * 30) * 86400000).toISOString(),
          amountMinor: index === 5 ? 19950 : 39900,
          currency: "MXN",
          status:
            index === 0 && request.state.mode === "READ_ONLY"
              ? "open"
              : index === 3
                ? "void"
                : "paid",
        }));
  return Response.json(subscriptionPaymentsSchema.parse({ items }));
}
