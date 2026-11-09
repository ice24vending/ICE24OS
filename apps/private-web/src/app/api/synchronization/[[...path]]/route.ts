import { NextResponse } from "next/server";
import {
  conflictResolutionSchema,
  offlineDownloadSchema,
  offlineReleaseSchema,
  offlineSyncOperationSchema,
  accessContextSchema,
  userProfileSchema,
} from "@ice24/contracts";
import {
  guard,
  failure,
  ifMatch,
  noStore,
  UUID,
  upstreamFailure,
} from "../../../../server/bff/responses";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { readBrowserSession } from "../../../../server/session/session";
import { authorizeWorkOrderBff } from "../../../../features/work-orders/work-orders-authorization";
type Context = { params: Promise<{ path?: string[] }> };
/** Same-origin non-cacheable bootstrap: tokens stay in memory, never in the offline package. */
export async function GET(request: Request, context: Context) {
  const route = (await context.params).path?.join("/");
  if (!["health", "conflicts"].includes(route ?? "")) return failure("Ruta inválida.", 404);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    return failure("Solicitud no autorizada.", 403);
  const session = await readBrowserSession();
  if (!session?.contextId) return failure("Tu sesión expiró. Inicia sesión para sincronizar.", 401);
  const denied = await authorizeWorkOrderBff(session, route === "conflicts" ? "read" : "execute");
  if (denied) return denied;
  if (route === "conflicts") {
    const response = await callPrivateApi("synchronization/conflicts", session);
    return NextResponse.json(await response.json(), { status: response.status, headers: noStore });
  }
  const [contextResponse, userResponse] = await Promise.all([
    callPrivateApi("session-contexts/current", session),
    callPrivateApi("me", session),
  ]);
  if (!contextResponse.ok || !userResponse.ok)
    return failure("No fue posible verificar tu contexto.", 503);
  const active = accessContextSchema.parse(await contextResponse.json()),
    user = userProfileSchema.parse(await userResponse.json());
  return NextResponse.json(
    {
      contextId: session.contextId,
      csrfToken: session.csrfToken,
      accountId: active.accountId,
      userId: user.id,
    },
    { headers: noStore },
  );
}
export async function POST(request: Request, context: Context) {
  const form = await request.formData().catch(() => null);
  if (!form) return failure("Solicitud inválida.", 400);
  const checked = await guard(request, form);
  if ("error" in checked) return checked.error;
  const path = (await context.params).path ?? [];
  const operation = path.length === 1 && path[0] === "operations";
  const resolution =
    path.length === 3 && path[0] === "conflicts" && UUID.test(path[1]!) && path[2] === "resolve";
  if (
    !resolution &&
    !operation &&
    (path.length !== 3 ||
      path[0] !== "orders" ||
      !UUID.test(path[1]!) ||
      !["download", "release"].includes(path[2]!))
  )
    return failure("Ruta inválida.", 404);
  const schema = resolution
    ? conflictResolutionSchema
    : operation
      ? offlineSyncOperationSchema
      : path[2] === "release"
        ? offlineReleaseSchema
        : offlineDownloadSchema;
  let input: unknown;
  try {
    input = JSON.parse(String(form.get("data")) || "null");
  } catch {
    return failure("Datos inválidos.", 400);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return failure("Datos inválidos.", 400);
  const denied = await authorizeWorkOrderBff(
    checked.session,
    resolution ? "review" : path[2] === "release" ? "assign" : "execute",
  );
  if (denied) return denied;
  const version = ifMatch(form);
  if (!version) return failure("Versión esperada requerida.", 400);
  try {
    const response = await callPrivateApi(`synchronization/${path.join("/")}`, checked.session, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": String(form.get("key")),
        ...version,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      return upstreamFailure(
        response,
        {
          CONFLICT: "La orden cambió, está bloqueada o la descarga venció. Conservamos tus datos.",
          FORBIDDEN: "Tu permiso ya no está vigente.",
        },
        "No fue posible sincronizar. Conservamos tus datos.",
      );
    return NextResponse.json(await response.json(), { status: response.status, headers: noStore });
  } catch {
    return failure("La conexión se interrumpió. Se reintentará con la misma operación.", 503);
  }
}
