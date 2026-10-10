import { NextResponse } from "next/server";
import { apiErrorSchema } from "@ice24/contracts";
import { readBrowserSession, requireValidCsrf } from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";

// F4-22 adds the RA-01 routes (own catalog, account and model frequencies, and the machine
// component transitions, which need four segments). The API authorizes every call (RA-01-D2).
const allowedPath =
  /^(?:admin\/)?(?:equipment-workspace|accounts|account-users|account-invitations|account-catalog-entries|account-frequency-overrides|branches|catalogs|technical-models|template-versions|equipment-requests|machines|machine-transfers|equipment-files|dashboard|user-associations)(?:\/[a-zA-Z0-9-]+){0,4}$/;
const writeMethods = ["POST", "PATCH", "PUT"];
async function forward(request: Request, write: boolean) {
  const session = await readBrowserSession();
  if (!session?.contextId)
    return NextResponse.json(
      { message: "Sesión expirada. Inicia sesión nuevamente." },
      { status: 401 },
    );
  const expectedContext = request.headers.get("x-ice24-workspace-context");
  if (expectedContext !== session.contextId)
    return NextResponse.json(
      { message: "El contexto cambió en otra pestaña. Recarga esta página." },
      { status: 409 },
    );
  try {
    let path = new URL(request.url).searchParams.get("path") ?? "";
    let init: RequestInit = { method: "GET" };
    if (write) {
      const form = await request.formData();
      try {
        requireValidCsrf(request, session, form);
      } catch {
        return NextResponse.json({ message: "Solicitud no autorizada." }, { status: 403 });
      }
      path = String(form.get("path") ?? "");
      const method = String(form.get("method"));
      if (!writeMethods.includes(method))
        return NextResponse.json({ message: "Método no permitido" }, { status: 400 });
      init = {
        method,
        headers: {
          "content-type": "application/json",
          "idempotency-key": String(form.get("key") ?? ""),
          "if-match": String(form.get("version") ?? ""),
        },
        body: String(form.get("body") ?? "{}"),
      };
    }
    if (!allowedPath.test(path))
      return NextResponse.json({ message: "Ruta no permitida" }, { status: 400 });
    const response = await callPrivateApi(path, session, init);
    if (!response.ok) {
      const error = apiErrorSchema.safeParse(await response.json().catch(() => null));
      if (response.status === 403 && error.success && error.data.error.code === "ACCOUNT_READ_ONLY")
        return NextResponse.json(
          {
            code: "ACCOUNT_READ_ONLY",
            message:
              "La cuenta está en modo solo lectura. Consulta Suscripción para revisar el acceso.",
          },
          { status: 403, headers: { "cache-control": "no-store" } },
        );
      const code = error.success ? error.data.error.code : undefined;
      const message =
        code === "WARRANTY_WARNING_CONFIRMATION_REQUIRED"
          ? "El valor es distinto del de fábrica de ICE24 y puede afectar la garantía. Confirma la advertencia para guardarlo."
          : response.status === 412
            ? "Otra persona cambió este registro. Actualiza los datos antes de reintentar; no se guardó nada."
            : response.status === 409
              ? "El recurso cambió o no cumple las condiciones. Actualiza los datos antes de reintentar."
              : response.status === 403
                ? "No tienes permiso o falta verificar MFA para esta acción."
                : response.status === 401
                  ? "Tu sesión expiró. Inicia sesión nuevamente."
                  : response.status === 404
                    ? "Recurso no disponible en este contexto."
                    : response.status === 400
                      ? "Revisa los campos y los documentos requeridos."
                      : "El servicio no está disponible. Intenta nuevamente.";
      // The API.md code (never the upstream text) lets the screen pick its state: version
      // conflict, permission denied or the RA-01-D1 warranty confirmation.
      return NextResponse.json(code ? { message, code } : { message }, {
        status: response.status,
        headers: { "cache-control": "no-store" },
      });
    }
    return NextResponse.json(await response.json(), { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "No fue posible procesar la solicitud." }, { status: 503 });
  }
}
export function GET(request: Request) {
  return forward(request, false);
}
export function POST(request: Request) {
  return forward(request, true);
}
