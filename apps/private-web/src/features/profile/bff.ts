import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  accessContextSchema,
  contextCapabilitiesSchema,
  contextFocusOptionsSchema,
  userProfileSchema,
  sessionSummarySchema,
  myActivitySchema,
  myMfaStatusSchema,
  updateMyProfileRequestSchema,
} from "@ice24/contracts";
import { callPrivateApi } from "../../server/session/supabase-auth";
import { clearBrowserSession, type BrowserSession } from "../../server/session/session";
import { clearDemoCookie, isDemoSession } from "../../server/demo/session";
import {
  guard,
  noStore,
  failure,
  ifMatch,
  upstreamFailure,
  UUID,
} from "../../server/bff/responses";
import { readFailure, networkFailure, type Failure } from "../../components/system-state/failure";
import type { ProfileResult } from "./model";

const failed = (response: Response) =>
  upstreamFailure(
    response,
    {
      PRECONDITION_FAILED:
        "Tu perfil cambió en otra sesión. Recarga los datos antes de volver a guardar.",
      FORBIDDEN: "No tienes permiso para realizar esta acción.",
      VALIDATION_FAILED: "Revisa los datos del perfil.",
      AUTHENTICATION_REQUIRED: "Tu sesión expiró. Inicia sesión nuevamente.",
    },
    "No fue posible completar la operación. Intenta de nuevo.",
  );

export async function loadProfile(session: BrowserSession): Promise<ProfileResult> {
  const get = async <T>(path: string, schema: { parse(value: unknown): T }): Promise<T> => {
    const response = await callPrivateApi(path, session, { signal: AbortSignal.timeout(20000) });
    if (!response.ok)
      throw await readFailure(await failed(response), "No fue posible cargar tu perfil.");
    return schema.parse(await response.json());
  };
  try {
    const [profile, context, capabilities, sessions, activity, security, options] =
      await Promise.all([
        get("me", userProfileSchema),
        get("session-contexts/current", accessContextSchema),
        get("session-contexts/current/capabilities", contextCapabilitiesSchema),
        get("me/sessions", sessionSummarySchema.array()),
        get("me/activity", myActivitySchema.array()),
        get("me/mfa", myMfaStatusSchema)
          .then((mfa) => ({ mfa, mfaFailure: null }))
          .catch((cause: unknown) => ({ mfa: null, mfaFailure: loadFailure(cause) })),
        get("session-contexts/current/focus-options", contextFocusOptionsSchema).catch(() => null),
      ]);
    const scope = capabilities.accountWide
      ? ["Toda la cuenta"]
      : [
          ...context.branchIds.map(
            (id) => options?.branches.find((b) => b.id === id)?.name ?? "Sucursal asignada",
          ),
          ...context.machineIds.map(
            (id) => options?.machines.find((m) => m.id === id)?.name ?? "Máquina asignada",
          ),
        ];
    return {
      data: {
        loadedAt: Date.now(),
        profile,
        context,
        capabilities,
        sessions,
        activity,
        ...security,
        scope,
      },
      failure: null,
    };
  } catch (cause) {
    return { data: null, failure: loadFailure(cause) };
  }
}
function loadFailure(cause: unknown): Failure {
  if (cause && typeof cause === "object" && "kind" in cause) return cause as Failure;
  if (cause instanceof TypeError) return networkFailure();
  return {
    kind: "error",
    status: 503,
    message: "No fue posible cargar tu perfil. Intenta de nuevo.",
    correlationId: randomUUID(),
  };
}

export async function profileMutation(
  request: Request,
  action: "save" | "others" | "session",
  sessionId?: string,
) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure("Solicitud inválida.", 400);
  }
  const auth = await guard(request, form);
  if ("error" in auth) return auth.error;
  let path: string;
  let init: RequestInit;
  if (action === "save") {
    const version = ifMatch(form);
    const parsed = updateMyProfileRequestSchema.safeParse({
      displayName: form.get("displayName"),
      phone: form.get("phone") || null,
      jobTitle: form.get("jobTitle") || null,
      locale: form.get("locale"),
      timeZone: form.get("timeZone"),
    });
    if (!version || !parsed.success)
      return failure("Revisa los datos del perfil.", 400, "VALIDATION_FAILED");
    path = "me";
    init = {
      method: "PATCH",
      headers: { "content-type": "application/json", ...version },
      body: JSON.stringify(parsed.data),
    };
  } else if (action === "others") {
    path = "me/sessions/revoke-all";
    init = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ excludeCurrent: true }),
    };
  } else {
    if (!sessionId || !UUID.test(sessionId)) return failure("Sesión inválida.", 400);
    path = `me/sessions/${sessionId}`;
    init = { method: "DELETE" };
  }
  try {
    const upstream = await callPrivateApi(path, auth.session, {
      ...init,
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return failed(upstream);
    const response = NextResponse.json(
      action === "save"
        ? userProfileSchema.parse(await upstream.json())
        : { closedCurrent: sessionId === auth.session.contextId },
      { headers: noStore },
    );
    if (action === "session" && sessionId === auth.session.contextId) {
      clearBrowserSession(response);
      if (isDemoSession(auth.session)) clearDemoCookie(response);
      response.headers.set("Clear-Site-Data", '"cache", "storage"');
    }
    return response;
  } catch {
    return failure(
      "No se pudo confirmar el resultado. Recarga los datos antes de reintentar.",
      503,
      "DEPENDENCY_UNAVAILABLE",
      randomUUID(),
    );
  }
}
