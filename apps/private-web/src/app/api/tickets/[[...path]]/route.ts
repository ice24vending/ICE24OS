import { NextResponse } from "next/server";
import { ticketInputSchema, ticketDiagnosisSchema } from "@ice24/contracts";
import {
  guard,
  failure,
  ifMatch,
  noStore,
  upstreamFailure,
  UUID,
} from "../../../../server/bff/responses";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { authorizeTicketBff } from "../../../../features/maintenance/tickets-authorization";

type Context = { params: Promise<{ path?: string[] }> };
const messages = {
  FORBIDDEN: "No tienes permiso o el módulo de mantenimiento está deshabilitado.",
  ACCOUNT_READ_ONLY:
    "La cuenta está en modo lectura. Puedes consultar tickets, pero no modificarlos.",
  CONFLICT:
    "El ticket cambió o la solicitud ya se utilizó. Recarga el detalle antes de reintentar.",
  NOT_FOUND: "El ticket o la máquina no está disponible en este contexto.",
  VALIDATION_FAILED: "Revisa el sistema, la descripción y las evidencias de la máquina.",
};
export async function GET(request: Request, context: Context) {
  const checked = await guard(request);
  if ("error" in checked) return checked.error;
  const path = (await context.params).path ?? [];
  const denied = await authorizeTicketBff(checked.session, "read");
  if (denied) return denied;
  if (path.length !== 2 || path[0] !== "options" || !UUID.test(path[1]!))
    return failure("Ruta inválida.", 404);
  try {
    const response = await callPrivateApi(`tickets/options/${path[1]}`, checked.session);
    if (!response.ok)
      return upstreamFailure(response, messages, "No fue posible consultar los sistemas.");
    return NextResponse.json(await response.json(), { headers: noStore });
  } catch {
    return failure("No fue posible conectar con el servicio.", 503);
  }
}
export async function POST(request: Request, context: Context) {
  const form = await request.formData().catch(() => null);
  if (!form) return failure("Solicitud inválida.", 400);
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  const path = (await context.params).path ?? [];
  const creating = path.length === 0;
  const denied = await authorizeTicketBff(checked.session, creating ? "create" : "edit");
  if (denied) return denied;
  if (!creating && (path.length !== 2 || !UUID.test(path[0]!) || path[1] !== "diagnosis"))
    return failure("Ruta inválida.", 404);
  let input: unknown;
  try {
    input = JSON.parse(String(form.get("data")));
  } catch {
    return failure("Revisa los datos del ticket.", 400);
  }
  const parsed = (creating ? ticketInputSchema : ticketDiagnosisSchema).safeParse(input);
  if (!parsed.success)
    return failure("Revisa los campos obligatorios del ticket.", 400, "VALIDATION_FAILED");
  const version = creating ? {} : ifMatch(form);
  if (!version) return failure("Recarga el ticket antes de editar.", 400);
  try {
    const response = await callPrivateApi(
      `tickets${creating ? "" : `/${path.join("/")}`}`,
      checked.session,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": String(form.get("key")),
          ...version,
        },
        body: JSON.stringify(parsed.data),
      },
    );
    if (!response.ok)
      return upstreamFailure(
        response,
        messages,
        "No fue posible guardar el ticket. Conservamos tus datos.",
      );
    return NextResponse.json(await response.json(), { status: response.status, headers: noStore });
  } catch {
    return failure(
      "La conexión se interrumpió. Reintenta sin cambiar los datos para evitar duplicados.",
      503,
    );
  }
}
