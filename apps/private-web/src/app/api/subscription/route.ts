import { NextResponse } from "next/server";
import { billingSessionResponseSchema } from "@ice24/contracts";
import {
  readBrowserSession,
  requireValidCsrf,
  writeBrowserSession,
} from "../../../server/session/session";
import { callPrivateApi } from "../../../server/session/supabase-auth";
import { failure, upstreamCode } from "../../../server/bff/responses";

export async function POST(request: Request) {
  const session = await readBrowserSession();
  if (!session?.contextId)
    return failure("Tu sesión expiró. Inicia sesión nuevamente.", 401, "AUTHENTICATION_REQUIRED");
  if (request.headers.get("x-ice24-workspace-context") !== session.contextId)
    return failure(
      "El contexto cambió en otra pestaña. Recarga esta página.",
      409,
      "CONTEXT_CHANGED",
    );
  try {
    const form = await request.formData();
    try {
      requireValidCsrf(request, session, form);
    } catch {
      return failure("Solicitud no autorizada. Recarga esta página.", 403);
    }
    const action = form.get("action");
    const key = form.get("key");
    if (
      !["checkout", "portal"].includes(String(action)) ||
      typeof key !== "string" ||
      !/^[a-zA-Z0-9-]{8,200}$/.test(key)
    )
      return failure("Solicitud inválida.", 400);
    const origin = process.env.PRIVATE_WEB_URL;
    if (!origin) return failure("El servicio de suscripción no está configurado.", 503);
    const response = await callPrivateApi(`subscription/${action}`, session, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({
        returnUrl: new URL(
          action === "checkout" ? "/subscription?billing=returned" : "/subscription",
          origin,
        ).href,
        ...(action === "checkout"
          ? { cancelUrl: new URL("/subscription?billing=cancelled", origin).href }
          : {}),
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!response.ok) {
      const code = await upstreamCode(response);
      return failure(
        response.status === 403
          ? "Solo el propietario autorizado puede gestionar esta suscripción. Revisa también si la cuenta está suspendida."
          : response.status === 401
            ? "Tu sesión expiró. Inicia sesión nuevamente."
            : response.status === 409
              ? "La suscripción cambió. Actualiza el estado o usa Gestionar suscripción."
              : "No fue posible abrir Stripe. Intenta nuevamente.",
        response.status,
        code ?? (response.status === 409 ? "CONFLICT" : undefined),
      );
    }
    const result = billingSessionResponseSchema.parse(await response.json());
    const target = new URL(result.url);
    if (
      target.protocol !== "https:" ||
      target.username ||
      target.password ||
      target.hostname !== (action === "checkout" ? "checkout.stripe.com" : "billing.stripe.com")
    )
      throw new Error("Invalid billing redirect");
    // Use the authorized target returned by the API, never an account supplied by the browser.
    const context = await callPrivateApi("session-contexts", session, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        accountId: result.accountId,
        ...(session.identitySessionId ? { identitySessionId: session.identitySessionId } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!context.ok) throw new Error("Cannot activate billing context");
    const body = (await context.json()) as { id?: unknown };
    if (typeof body.id !== "string" || !body.id) throw new Error("Invalid context");
    const output = NextResponse.json(
      { url: result.url },
      { headers: { "cache-control": "no-store" } },
    );
    writeBrowserSession(output, { ...session, contextId: body.id });
    return output;
  } catch {
    return failure(
      "No fue posible abrir Stripe. Reintenta; si ya pagaste, consulta el estado de tu cuenta productiva.",
      503,
    );
  }
}
