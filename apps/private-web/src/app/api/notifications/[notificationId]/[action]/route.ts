import { NextResponse } from "next/server";
import {
  notificationActionSchema,
  notificationResourceSchema,
  notificationSchema,
} from "@ice24/contracts";
import { callPrivateApi } from "../../../../../server/session/supabase-auth";
import {
  UUID,
  failure,
  guard,
  noStore,
  upstreamFailure,
} from "../../../../../features/notifications/bff";

/** NOT-003 to NOT-006 through the BFF: CSRF, context check and idempotency key are mandatory. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ notificationId: string; action: string }> },
) {
  const { notificationId, action } = await params;
  const parsedAction = notificationActionSchema.safeParse(action);
  if (!UUID.test(notificationId) || !parsedAction.success)
    return failure("Solicitud inválida.", 400);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("Solicitud inválida.", 400);
  }
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  let body: object = {};
  if (parsedAction.data === "start-attention" || parsedAction.data === "resolve") {
    const resource = notificationResourceSchema.safeParse({
      type: form.get("resourceType"),
      id: form.get("resourceId"),
    });
    if (!resource.success) return failure("Falta el recurso vinculado a la alerta.", 400);
    body =
      parsedAction.data === "resolve"
        ? { resolutionResource: resource.data }
        : { relatedResource: resource.data };
  }
  try {
    const response = await callPrivateApi(
      `notifications/${notificationId}/${parsedAction.data}`,
      checked.session,
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": String(form.get("key")) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return upstreamFailure(response);
    return NextResponse.json(notificationSchema.parse(await response.json()), { headers: noStore });
  } catch {
    return failure("No fue posible actualizar el aviso. Intenta nuevamente.", 503);
  }
}
