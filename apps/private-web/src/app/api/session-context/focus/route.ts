import { contextFocusSchema } from "@ice24/contracts";
import type { NextResponse } from "next/server";

import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
} from "../../../../server/session/session";
import { callPrivateApi } from "../../../../server/session/supabase-auth";
import { demoStateOf, writeDemoCookie } from "../../../../server/demo/session";
import { UUID, failure } from "../../../../server/bff/responses";
import { locationAfterSwitch } from "../../../../features/context/model";
import { switched } from "../switched";

/** Empty means "all"; anything else must be a UUID. Undefined marks an invalid value. */
const idOf = (value: FormDataEntryValue | null) =>
  value === null || value === ""
    ? null
    : typeof value === "string" && UUID.test(value)
      ? value
      : undefined;

/**
 * Working branch and machine of the context selector (F6-08). The API validates them against the
 * context's reach and audits CONTEXT_FOCUS_CHANGED; only then the BFF stores them in the sealed,
 * HttpOnly session. The shell checks them again on every load, so a lost access never sticks.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await readBrowserSession();
  if (!session?.contextId)
    return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401, "AUTHENTICATION_REQUIRED");
  const form = await request.formData();
  try {
    requireValidCsrf(request, session, form);
  } catch {
    return failure("Solicitud no autorizada. Recarga esta página.", 403);
  }
  const branchId = idOf(form.get("branchId"));
  const machineId = idOf(form.get("machineId"));
  if (branchId === undefined || machineId === undefined)
    return failure("Selección inválida.", 400, "VALIDATION_FAILED");
  const response = await callPrivateApi("session-contexts/current/focus", session, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ branchId, machineId }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (response === null)
    return failure("No hay conexión con el servicio. Tu selección no cambió.", 503);
  if (!response.ok)
    return failure(
      response.status === 404
        ? "Esa sucursal o máquina ya no está disponible para ti. Elige otra."
        : response.status === 403
          ? "Tu rol no permite elegir sucursal o máquina en esta cuenta."
          : "No pudimos cambiar la sucursal o máquina. Tu selección anterior sigue activa.",
      response.status,
    );
  const parsed = contextFocusSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success)
    return failure(
      "No pudimos cambiar la sucursal o máquina. Tu selección anterior sigue activa.",
      502,
    );
  const focus =
    parsed.data.branchId === null && parsed.data.machineId === null ? undefined : parsed.data;
  // Same account: the page the viewer was on is still valid.
  const location = locationAfterSwitch(form.get("returnTo"), [], true);
  const demo = demoStateOf(session);
  return switched(request, location, (reply) =>
    demo === undefined
      ? writeBrowserSession(reply, { ...session, focus })
      : writeDemoCookie(reply, { ...demo, focus }),
  );
}
