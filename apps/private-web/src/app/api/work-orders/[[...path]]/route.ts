import { NextResponse } from "next/server";
import {
  workOrderCreateSchema,
  workOrderAssignmentSchema,
  workOrderTransitionSchema,
  workOrderExecutionSchema,
  workOrderReviewSchema,
} from "@ice24/contracts";
import {
  guard,
  failure,
  ifMatch,
  noStore,
  upstreamFailure,
  UUID,
} from "../../../../server/bff/responses";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { authorizeWorkOrderBff } from "../../../../features/work-orders/work-orders-authorization";
type Context = { params: Promise<{ path?: string[] }> };
const messages = {
  FORBIDDEN: "No tienes permiso para esta acción o el acceso dejó de estar vigente.",
  ACCOUNT_READ_ONLY: "La cuenta está en modo lectura.",
  CONFLICT:
    "La orden cambió, ya existe o faltan requisitos. Recarga el detalle antes de continuar.",
  NOT_FOUND: "La orden o su origen no está disponible en este contexto.",
  VALIDATION_FAILED: "Revisa el técnico, la actividad y el motivo.",
};
export async function POST(request: Request, context: Context) {
  const form = await request.formData().catch(() => null);
  if (!form) return failure("Solicitud inválida.", 400);
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  const path = (await context.params).path ?? [];
  const creating = path.length === 0;
  if (
    !creating &&
    (path.length !== 2 ||
      !UUID.test(path[0]!) ||
      !["assignment", "transitions", "execution", "reviews"].includes(path[1]!))
  )
    return failure("Ruta inválida.", 404);
  let input: unknown;
  try {
    input = JSON.parse(String(form.get("data")));
  } catch {
    return failure("Datos inválidos.", 400);
  }
  const schema = creating
    ? workOrderCreateSchema
    : path[1] === "assignment"
      ? workOrderAssignmentSchema
      : path[1] === "execution"
        ? workOrderExecutionSchema
        : path[1] === "reviews"
          ? workOrderReviewSchema
          : workOrderTransitionSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure("Revisa los campos obligatorios.", 400, "VALIDATION_FAILED");
  const transition = workOrderTransitionSchema.safeParse(parsed.data);
  const review = workOrderReviewSchema.safeParse(parsed.data);
  const operation =
    path[1] === "reviews"
      ? review.success && review.data.action === "request_correction"
        ? "execute"
        : "review"
      : creating || path[1] === "assignment"
        ? "assign"
        : transition.success && ["correct", "cancel", "reopen"].includes(transition.data.action)
          ? "review"
          : transition.success && ["notify", "expire"].includes(transition.data.action)
            ? "assign"
            : "execute";
  const denied = await authorizeWorkOrderBff(checked.session, operation);
  if (denied) return denied;
  const version = ifMatch(form);
  if (!version) return failure("Recarga para obtener la versión actual.", 400);
  const key = String(form.get("key"));
  if (key.length < 8 || key.length > 200) return failure("Clave de reintento inválida.", 400);
  try {
    const response = await callPrivateApi(
      `work-orders${creating ? "" : `/${path.join("/")}`}`,
      checked.session,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key, ...version },
        body: JSON.stringify(parsed.data),
      },
    );
    if (!response.ok)
      return upstreamFailure(
        response,
        messages,
        "No fue posible guardar la orden. Conservamos tus datos.",
      );
    return NextResponse.json(await response.json(), { status: response.status, headers: noStore });
  } catch {
    return failure(
      "La conexión se interrumpió. Reintenta con los mismos datos para evitar duplicados.",
      503,
    );
  }
}
